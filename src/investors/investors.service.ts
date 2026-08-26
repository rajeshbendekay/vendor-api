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
import { Investor } from './investor.entity';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { CreateInvestorDto, UpdateInvestorDto } from './dto';

function isDuplicateKeyError(e: unknown) {
  return e instanceof QueryFailedError && (e as { code?: string }).code === 'ER_DUP_ENTRY';
}

@Injectable()
export class InvestorsService {
  constructor(
    @InjectRepository(Investor)
    private readonly repo: Repository<Investor>,
    private readonly dataSource: DataSource,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  // Investor-role callers only ever see their own record.
  async findAllForInvestor(investorId: number) {
    const investor = await this.repo.findOne({ where: { id: investorId } });
    return investor ? [investor] : [];
  }

  async findOne(id: number) {
    const investor = await this.repo.findOne({ where: { id } });
    if (!investor) throw new NotFoundException(`Investor ${id} not found`);
    return investor;
  }

  async findOneForInvestor(id: number, investorId: number) {
    if (id !== investorId) {
      throw new ForbiddenException('You do not have access to this investor');
    }
    return this.findOne(id);
  }

  // Creates the Investor row and links it to a login (User, role INVESTOR)
  // in one transaction, so a form submit can't leave a KYC record with no
  // way to log in, or vice versa. If a login already exists for this phone
  // (e.g. the same person is already a return party), the INVESTOR role is
  // added onto that existing login instead of inserting a second one —
  // phone/email are globally unique on User, so one person can only ever
  // have a single login shared across their roles.
  async create(dto: CreateInvestorDto) {
    const { password, ...investorFields } = dto;
    try {
      return await this.dataSource.transaction(async (manager) => {
        const investor = manager.create(Investor, investorFields);
        const savedInvestor = await manager.save(investor);

        const userRepo = manager.getRepository(User);
        const existingUser = await userRepo.findOne({
          where: { phone: savedInvestor.phone },
        });

        if (existingUser) {
          if (existingUser.investorId) {
            throw new ConflictException(
              'This phone number is already linked to an investor account',
            );
          }
          existingUser.investorId = savedInvestor.id;
          if (!existingUser.roles.includes(UserRole.INVESTOR)) {
            existingUser.roles = [...existingUser.roles, UserRole.INVESTOR];
          }
          if (savedInvestor.email) existingUser.email = savedInvestor.email;
          if (password) existingUser.passwordHash = await bcrypt.hash(password, 10);
          await userRepo.save(existingUser);
        } else {
          if (!password) {
            throw new BadRequestException(
              'Password is required to create a new login',
            );
          }
          const user = userRepo.create({
            name: savedInvestor.name,
            phone: savedInvestor.phone,
            email: savedInvestor.email ?? null,
            passwordHash: await bcrypt.hash(password, 10),
            roles: [UserRole.INVESTOR],
            investorId: savedInvestor.id,
          });
          await userRepo.save(user);
        }

        return savedInvestor;
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

  async update(id: number, dto: UpdateInvestorDto) {
    const { password, ...investorFields } = dto;
    try {
      return await this.dataSource.transaction(async (manager) => {
        const investorRepo = manager.getRepository(Investor);
        const investor = await investorRepo.findOne({ where: { id } });
        if (!investor) throw new NotFoundException(`Investor ${id} not found`);
        Object.assign(investor, investorFields);
        await investorRepo.save(investor);

        const userRepo = manager.getRepository(User);
        const linkedUser = await userRepo.findOne({ where: { investorId: id } });
        if (linkedUser) {
          if (investorFields.phone !== undefined) linkedUser.phone = investor.phone;
          if (investorFields.email !== undefined) linkedUser.email = investor.email ?? null;
          if (password) linkedUser.passwordHash = await bcrypt.hash(password, 10);
          await userRepo.save(linkedUser);
        } else if (password) {
          // No linked login yet (e.g. an investor created before this
          // feature existed). If this phone already has a login (say, as a
          // return party), add the INVESTOR role onto it instead of
          // inserting a second login — otherwise create one from scratch
          // instead of silently dropping the password the admin just
          // typed in.
          const existingUser = await userRepo.findOne({ where: { phone: investor.phone } });
          if (existingUser) {
            if (existingUser.investorId) {
              throw new ConflictException(
                'This phone number is already linked to an investor account',
              );
            }
            existingUser.investorId = investor.id;
            if (!existingUser.roles.includes(UserRole.INVESTOR)) {
              existingUser.roles = [...existingUser.roles, UserRole.INVESTOR];
            }
            existingUser.passwordHash = await bcrypt.hash(password, 10);
            await userRepo.save(existingUser);
          } else {
            const newUser = userRepo.create({
              name: investor.name,
              phone: investor.phone,
              email: investor.email ?? null,
              passwordHash: await bcrypt.hash(password, 10),
              roles: [UserRole.INVESTOR],
              investorId: investor.id,
            });
            await userRepo.save(newUser);
          }
        }

        return investor;
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
    const investor = await this.findOne(id);
    try {
      await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const linkedUser = await userRepo.findOne({ where: { investorId: id } });
        if (linkedUser) await userRepo.remove(linkedUser);
        await manager.getRepository(Investor).remove(investor);
      });
    } catch (e) {
      // Investments are soft-deleted, so their rows (and the FK to this
      // investor) always persist — surface that as a clear conflict
      // instead of a raw DB error.
      if (
        e instanceof QueryFailedError &&
        (e as { code?: string }).code === 'ER_ROW_IS_REFERENCED_2'
      ) {
        throw new ConflictException(
          'This investor has investment records and cannot be deleted',
        );
      }
      throw e;
    }
    return { deleted: true, id };
  }
}
