import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import { AddUserRolesDto, CreateUserDto, KycFieldsDto, UpdateUserDto } from './dto';
import { Investor } from '../investors/investor.entity';
import { ReturnParty } from '../return-parties/return-party.entity';

function omitPassword(user: User) {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

function isDuplicateKeyError(e: unknown) {
  return e instanceof QueryFailedError && (e as { code?: string }).code === 'ER_DUP_ENTRY';
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    const users = await this.repo.find({
      relations: { investor: true, returnParty: true },
      order: { createdAt: 'DESC' },
    });
    return users.map(omitPassword);
  }

  async findOne(id: number) {
    const user = await this.repo.findOne({
      where: { id },
      relations: { investor: true, returnParty: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return omitPassword(user);
  }

  // Includes passwordHash — for auth verification / the JWT guard only.
  findByIdentifier(identifier: string) {
    return this.repo.findOne({
      where: [{ phone: identifier }, { email: identifier }],
    });
  }

  findActiveById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  // roles is a simple-array column, so membership can't be queried with a
  // where clause — load and filter instead (fine at admin-bootstrap scale).
  async existsByRole(role: UserRole) {
    const users = await this.repo.find();
    return users.some((u) => u.roles.includes(role));
  }

  private hash(password: string) {
    return bcrypt.hash(password, 10);
  }

  // Creates the KYC row for a newly-granted role and links it onto `user`
  // (caller saves `user` afterward) — no-op for ADMIN, which has no KYC
  // record of its own. Identity (name/phone/email) is read off `user`, not
  // passed in, so this works the same whether `user` is brand new (create)
  // or pre-existing (addRoles).
  private async attachRoleRecord(
    manager: EntityManager,
    user: User,
    role: UserRole,
    kyc?: KycFieldsDto,
  ) {
    if (role === UserRole.INVESTOR) {
      const investor = manager.create(Investor, {
        name: user.name as string,
        phone: user.phone as string,
        email: user.email ?? undefined,
        ...kyc,
      });
      const saved = await manager.save(investor);
      user.investorId = saved.id;
    } else if (role === UserRole.RETURN_PARTY) {
      const party = manager.create(ReturnParty, {
        name: user.name as string,
        phone: user.phone as string,
        email: user.email ?? undefined,
        ...kyc,
      });
      const saved = await manager.save(party);
      user.returnPartyId = saved.id;
    }
  }

  // Onboards a login with one or more roles in one step (the Users
  // screen's "Add User"). Always creates a brand-new login — if this
  // phone/email already has one, that's a duplicate-key conflict below,
  // not something this method tries to resolve; adding a role onto an
  // existing login is addRoles()'s job instead.
  async create(dto: CreateUserDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('At least one of phone or email is required');
    }
    const needsKyc =
      dto.roles.includes(UserRole.INVESTOR) || dto.roles.includes(UserRole.RETURN_PARTY);
    if (needsKyc && (!dto.name?.trim() || !dto.phone?.trim())) {
      throw new BadRequestException(
        'Name and phone are required to onboard an Investor or Return Party role',
      );
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const user = userRepo.create({
          name: dto.name ?? null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          passwordHash: await this.hash(dto.password),
          roles: dto.roles,
          investorId: null,
          returnPartyId: null,
        });
        const saved = await userRepo.save(user);

        for (const role of dto.roles) {
          await this.attachRoleRecord(
            manager,
            saved,
            role,
            role === UserRole.INVESTOR ? dto.investor : dto.returnParty,
          );
        }
        if (needsKyc) await userRepo.save(saved);

        return omitPassword(saved);
      });
    } catch (e) {
      if (isDuplicateKeyError(e)) {
        throw new ConflictException('Phone or email already in use');
      }
      throw e;
    }
  }

  // Adds roles onto an existing login (the Users screen's "Edit" flow) —
  // add-only: any role already held, or simply omitted from dto.roles, is
  // left untouched rather than removed.
  async addRoles(id: number, dto: AddUserRolesDto) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({ where: { id } });
      if (!user) throw new NotFoundException(`User ${id} not found`);

      const rolesToAdd = dto.roles.filter((r) => !user.roles.includes(r));
      if (rolesToAdd.length === 0) return omitPassword(user);

      const needsKyc = rolesToAdd.some(
        (r) => r === UserRole.INVESTOR || r === UserRole.RETURN_PARTY,
      );
      if (needsKyc && (!user.name?.trim() || !user.phone?.trim())) {
        throw new BadRequestException(
          'This account needs a name and phone before an Investor or Return Party role can be added — edit the account first',
        );
      }

      user.roles = [...user.roles, ...rolesToAdd];
      for (const role of rolesToAdd) {
        await this.attachRoleRecord(
          manager,
          user,
          role,
          role === UserRole.INVESTOR ? dto.investor : dto.returnParty,
        );
      }

      const saved = await userRepo.save(user);
      return omitPassword(saved);
    });
  }

  // Used by the admin bootstrap seed and by InvestorsService/
  // ReturnPartiesService (within their own transactions) — can create any
  // role, including a linked investorId or returnPartyId.
  createRaw(data: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    password: string;
    roles: UserRole[];
    investorId?: number | null;
    returnPartyId?: number | null;
  }) {
    return this.hash(data.password).then((passwordHash) => {
      const user = this.repo.create({
        name: data.name ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        passwordHash,
        roles: data.roles,
        investorId: data.investorId ?? null,
        returnPartyId: data.returnPartyId ?? null,
      });
      return this.repo.save(user);
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    if (dto.isActive === false && user.roles.includes(UserRole.ADMIN)) {
      const admins = await this.repo.find({ where: { isActive: true } });
      const activeAdmins = admins.filter((u) => u.roles.includes(UserRole.ADMIN)).length;
      if (activeAdmins <= 1) {
        throw new BadRequestException('Cannot deactivate the last active admin account');
      }
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) user.passwordHash = await this.hash(dto.password);

    try {
      const saved = await this.repo.save(user);
      return omitPassword(saved);
    } catch (e) {
      if (isDuplicateKeyError(e)) {
        throw new ConflictException('Phone or email already in use');
      }
      throw e;
    }
  }
}
