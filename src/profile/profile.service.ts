import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { Investor } from '../investors/investor.entity';
import { ReturnParty } from '../return-parties/return-party.entity';
import type { AuthUser } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto';

function omitPassword(user: User) {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

function isDuplicateKeyError(e: unknown) {
  return e instanceof QueryFailedError && (e as { code?: string }).code === 'ER_DUP_ENTRY';
}

// Self-service "my profile" — any logged-in user (ADMIN or INVESTOR)
// viewing/updating their own basic details and login password. Distinct
// from UsersService/InvestorsService, which are admin-only management of
// *other* accounts and carry admin-specific rules (e.g. last-admin
// protection, full KYC fields) that don't apply to editing yourself.
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async me(authUser: AuthUser) {
    const user = await this.users.findOne({ where: { id: authUser.id } });
    if (!user) throw new NotFoundException('User not found');
    return omitPassword(user);
  }

  async update(authUser: AuthUser, dto: UpdateProfileDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const user = await userRepo.findOne({ where: { id: authUser.id } });
        if (!user) throw new NotFoundException('User not found');

        if (dto.name !== undefined) user.name = dto.name;
        if (dto.phone !== undefined) user.phone = dto.phone;
        if (dto.email !== undefined) user.email = dto.email;
        if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, 10);
        const savedUser = await userRepo.save(user);

        // Investors/return parties also keep a KYC record with its own copy
        // of name/phone/email — mirror the change there so the two don't
        // drift apart (same dual-write pattern as
        // InvestorsService.update/ReturnPartiesService.update).
        if (user.roles.includes(UserRole.INVESTOR) && user.investorId) {
          const investorRepo = manager.getRepository(Investor);
          const investor = await investorRepo.findOne({ where: { id: user.investorId } });
          if (investor) {
            if (dto.name !== undefined) investor.name = dto.name;
            if (dto.phone !== undefined) investor.phone = dto.phone;
            if (dto.email !== undefined) investor.email = dto.email;
            await investorRepo.save(investor);
          }
        }
        if (user.roles.includes(UserRole.RETURN_PARTY) && user.returnPartyId) {
          const returnPartyRepo = manager.getRepository(ReturnParty);
          const party = await returnPartyRepo.findOne({ where: { id: user.returnPartyId } });
          if (party) {
            if (dto.name !== undefined) party.name = dto.name;
            if (dto.phone !== undefined) party.phone = dto.phone;
            if (dto.email !== undefined) party.email = dto.email;
            await returnPartyRepo.save(party);
          }
        }

        return omitPassword(savedUser);
      });
    } catch (e) {
      if (isDuplicateKeyError(e)) {
        throw new ConflictException('Phone or email already in use');
      }
      throw e;
    }
  }
}
