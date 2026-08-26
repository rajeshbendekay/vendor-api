import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ReturnParty } from './return-party.entity';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { CreateReturnPartyDto, UpdateReturnPartyDto } from './dto';

function isDuplicateKeyError(e: unknown) {
  return e instanceof QueryFailedError && (e as { code?: string }).code === 'ER_DUP_ENTRY';
}

@Injectable()
export class ReturnPartiesService {
  constructor(
    @InjectRepository(ReturnParty)
    private readonly repo: Repository<ReturnParty>,
    private readonly dataSource: DataSource,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  // ReturnParty-role callers only ever see their own record.
  async findAllForReturnParty(returnPartyId: number) {
    const party = await this.repo.findOne({ where: { id: returnPartyId } });
    return party ? [party] : [];
  }

  async findOne(id: number) {
    const party = await this.repo.findOne({ where: { id } });
    if (!party) throw new NotFoundException(`Return party ${id} not found`);
    return party;
  }

  async findOneForReturnParty(id: number, returnPartyId: number) {
    if (id !== returnPartyId) {
      throw new ForbiddenException('You do not have access to this return party');
    }
    return this.findOne(id);
  }

  // Creates the ReturnParty row and links it to a login (User, role
  // RETURN_PARTY) in one transaction, so a form submit can't leave a KYC
  // record with no way to log in, or vice versa. If a login already exists
  // for this phone (e.g. the same person is already an investor), the
  // RETURN_PARTY role is added onto that existing login instead of
  // inserting a second one — phone/email are globally unique on User, so
  // one person can only ever have a single login shared across their roles.
  async create(dto: CreateReturnPartyDto) {
    const { password, ...partyFields } = dto;
    try {
      return await this.dataSource.transaction(async (manager) => {
        const party = manager.create(ReturnParty, partyFields);
        const savedParty = await manager.save(party);

        const userRepo = manager.getRepository(User);
        const existingUser = await userRepo.findOne({
          where: { phone: savedParty.phone },
        });

        if (existingUser) {
          if (existingUser.returnPartyId) {
            throw new ConflictException(
              'This phone number is already linked to a return party account',
            );
          }
          existingUser.returnPartyId = savedParty.id;
          if (!existingUser.roles.includes(UserRole.RETURN_PARTY)) {
            existingUser.roles = [...existingUser.roles, UserRole.RETURN_PARTY];
          }
          if (savedParty.email) existingUser.email = savedParty.email;
          if (password) existingUser.passwordHash = await bcrypt.hash(password, 10);
          await userRepo.save(existingUser);
        } else {
          if (!password) {
            throw new BadRequestException(
              'Password is required to create a new login',
            );
          }
          const user = userRepo.create({
            name: savedParty.name,
            phone: savedParty.phone,
            email: savedParty.email ?? null,
            passwordHash: await bcrypt.hash(password, 10),
            roles: [UserRole.RETURN_PARTY],
            returnPartyId: savedParty.id,
          });
          await userRepo.save(user);
        }

        return savedParty;
      });
    } catch (e) {
      if (isDuplicateKeyError(e)) {
        throw new ConflictException(
          'That phone or email is already used by another login account',
        );
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateReturnPartyDto) {
    const { password, ...partyFields } = dto;
    try {
      return await this.dataSource.transaction(async (manager) => {
        const partyRepo = manager.getRepository(ReturnParty);
        const party = await partyRepo.findOne({ where: { id } });
        if (!party) throw new NotFoundException(`Return party ${id} not found`);
        Object.assign(party, partyFields);
        await partyRepo.save(party);

        const userRepo = manager.getRepository(User);
        const linkedUser = await userRepo.findOne({ where: { returnPartyId: id } });
        if (linkedUser) {
          if (partyFields.phone !== undefined) linkedUser.phone = party.phone;
          if (partyFields.email !== undefined) linkedUser.email = party.email ?? null;
          if (password) linkedUser.passwordHash = await bcrypt.hash(password, 10);
          await userRepo.save(linkedUser);
        } else if (password) {
          // No linked login yet (e.g. a return party created before this
          // feature existed). If this phone already has a login (say, as
          // an investor), add the RETURN_PARTY role onto it instead of
          // inserting a second login — otherwise create one from scratch
          // instead of silently dropping the password the admin just
          // typed in.
          const existingUser = await userRepo.findOne({ where: { phone: party.phone } });
          if (existingUser) {
            if (existingUser.returnPartyId) {
              throw new ConflictException(
                'This phone number is already linked to a return party account',
              );
            }
            existingUser.returnPartyId = party.id;
            if (!existingUser.roles.includes(UserRole.RETURN_PARTY)) {
              existingUser.roles = [...existingUser.roles, UserRole.RETURN_PARTY];
            }
            existingUser.passwordHash = await bcrypt.hash(password, 10);
            await userRepo.save(existingUser);
          } else {
            const newUser = userRepo.create({
              name: party.name,
              phone: party.phone,
              email: party.email ?? null,
              passwordHash: await bcrypt.hash(password, 10),
              roles: [UserRole.RETURN_PARTY],
              returnPartyId: party.id,
            });
            await userRepo.save(newUser);
          }
        }

        return party;
      });
    } catch (e) {
      if (isDuplicateKeyError(e)) {
        throw new ConflictException(
          'That phone or email is already used by another login account',
        );
      }
      throw e;
    }
  }

  async remove(id: number) {
    const party = await this.findOne(id);
    try {
      await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const linkedUser = await userRepo.findOne({ where: { returnPartyId: id } });
        if (linkedUser) await userRepo.remove(linkedUser);
        await manager.getRepository(ReturnParty).remove(party);
      });
    } catch (e) {
      // Returns are soft-deleted, so their rows (and the FK to this return
      // party) always persist — surface that as a clear conflict instead
      // of a raw DB error.
      if (
        e instanceof QueryFailedError &&
        (e as { code?: string }).code === 'ER_ROW_IS_REFERENCED_2'
      ) {
        throw new ConflictException(
          'This return party has return records and cannot be deleted',
        );
      }
      throw e;
    }
    return { deleted: true, id };
  }
}
