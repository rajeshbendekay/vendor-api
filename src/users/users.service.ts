import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import { CreateUserDto, UpdateUserDto } from './dto';

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

  async existsByRole(role: UserRole) {
    const count = await this.repo.count({ where: { role } });
    return count > 0;
  }

  private hash(password: string) {
    return bcrypt.hash(password, 10);
  }

  // Admin-account creation via the Users screen — always role ADMIN.
  async create(dto: CreateUserDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('At least one of phone or email is required');
    }
    const user = this.repo.create({
      name: dto.name ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      passwordHash: await this.hash(dto.password),
      role: UserRole.ADMIN,
      investorId: null,
      returnPartyId: null,
    });
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

  // Used by the admin bootstrap seed and by InvestorsService/
  // ReturnPartiesService (within their own transactions) — can create any
  // role, including a linked investorId or returnPartyId.
  createRaw(data: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    password: string;
    role: UserRole;
    investorId?: number | null;
    returnPartyId?: number | null;
  }) {
    return this.hash(data.password).then((passwordHash) => {
      const user = this.repo.create({
        name: data.name ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        passwordHash,
        role: data.role,
        investorId: data.investorId ?? null,
        returnPartyId: data.returnPartyId ?? null,
      });
      return this.repo.save(user);
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    if (dto.isActive === false && user.role === UserRole.ADMIN) {
      const activeAdmins = await this.repo.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });
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
