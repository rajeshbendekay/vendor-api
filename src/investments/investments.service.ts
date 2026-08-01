import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Investment, InvestmentStatus } from './investment.entity';
import { Withdrawal } from './withdrawal.entity';
import {
  CreateInvestmentDto,
  CreateWithdrawalDto,
  UpdateInvestmentDto,
} from './dto';
import { InvestorsService } from '../investors/investors.service';
import { InvestorTypesService } from '../investor-types/investor-types.service';

function num(value: unknown): number {
  return Number(value) || 0;
}

@Injectable()
export class InvestmentsService {
  constructor(
    @InjectRepository(Investment)
    private readonly repo: Repository<Investment>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalsRepo: Repository<Withdrawal>,
    private readonly investorsService: InvestorsService,
    private readonly investorTypesService: InvestorTypesService,
  ) {}

  // finalAmount is principal + profit; remainingAmount is what's still
  // owed after withdrawals. Both are computed, not stored.
  private withComputed(investment: Investment) {
    const finalAmount =
      num(investment.investmentAmount) +
      (num(investment.investmentAmount) * num(investment.profitPercent)) / 100;
    const remainingAmount = Math.max(0, finalAmount - num(investment.withdrawnAmount));
    return { ...investment, finalAmount, remainingAmount };
  }

  async findAll() {
    const investments = await this.repo.find({ order: { createdAt: 'DESC' } });
    return investments.map((i) => this.withComputed(i));
  }

  async findForInvestor(investorId: number) {
    const investments = await this.repo.find({
      where: { investorId },
      order: { createdAt: 'DESC' },
    });
    return investments.map((i) => this.withComputed(i));
  }

  async findOne(id: number) {
    const investment = await this.repo.findOne({ where: { id } });
    if (!investment) throw new NotFoundException(`Investment ${id} not found`);
    return investment;
  }

  async findOneWithComputed(id: number) {
    return this.withComputed(await this.findOne(id));
  }

  // endDate is always derived from startDate + the investor type's
  // numberOfDays — never accepted from the client.
  private async computeEndDate(
    startDate?: string | null,
    investorTypeId?: number | null,
  ): Promise<string | null> {
    if (!startDate || !investorTypeId) return null;
    const type = await this.investorTypesService.findOne(investorTypeId);
    const end = new Date(startDate);
    end.setDate(end.getDate() + type.numberOfDays);
    return end.toISOString().slice(0, 10);
  }

  async create(dto: CreateInvestmentDto) {
    await this.investorsService.findOne(dto.investorId);
    const investment = this.repo.create(dto);
    investment.endDate = await this.computeEndDate(
      investment.startDate,
      investment.investorTypeId,
    );
    const saved = await this.repo.save(investment);
    return this.findOneWithComputed(saved.id);
  }

  async update(id: number, dto: UpdateInvestmentDto) {
    const investment = await this.findOne(id);
    if (investment.status === InvestmentStatus.SETTLED) {
      throw new BadRequestException('Settled investments cannot be edited');
    }
    if (dto.investorId != null) await this.investorsService.findOne(dto.investorId);
    Object.assign(investment, dto);
    investment.endDate = await this.computeEndDate(
      investment.startDate,
      investment.investorTypeId,
    );
    await this.repo.save(investment);
    return this.findOneWithComputed(id);
  }

  async remove(id: number) {
    const investment = await this.findOne(id);
    if (investment.status === InvestmentStatus.SETTLED) {
      throw new BadRequestException('Settled investments cannot be deleted');
    }
    // Soft delete: keeps the record and its withdrawal history for
    // audit purposes. find()/findOne() exclude it automatically.
    await this.repo.softRemove(investment);
    return { deleted: true, id };
  }

  async withdraw(investmentId: number, dto: CreateWithdrawalDto) {
    const investment = await this.findOne(investmentId);
    if (investment.status === InvestmentStatus.SETTLED) {
      throw new BadRequestException('This investment is already settled');
    }
    const finalAmount =
      num(investment.investmentAmount) +
      (num(investment.investmentAmount) * num(investment.profitPercent)) / 100;
    const remainingAmount = finalAmount - num(investment.withdrawnAmount);
    if (dto.amount > remainingAmount + 0.01) {
      throw new BadRequestException(
        `Withdrawal amount exceeds remaining balance of ${remainingAmount.toFixed(2)}`,
      );
    }

    const withdrawal = this.withdrawalsRepo.create({
      investmentId,
      amount: dto.amount,
      date: dto.date || new Date().toISOString().slice(0, 10),
      notes: dto.notes,
    });
    await this.withdrawalsRepo.save(withdrawal);

    investment.withdrawnAmount = num(investment.withdrawnAmount) + dto.amount;
    if (investment.withdrawnAmount >= finalAmount - 0.01) {
      investment.status = InvestmentStatus.SETTLED;
    }
    await this.repo.save(investment);

    return this.findOneWithComputed(investmentId);
  }

  async findWithdrawals(investmentId: number) {
    await this.findOne(investmentId);
    return this.withdrawalsRepo.find({
      where: { investmentId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  // Reverses a withdrawal: gives the amount back to the investment's
  // balance and re-opens it (ACTIVE) if it had been auto-settled.
  async removeWithdrawal(investmentId: number, withdrawalId: number) {
    const investment = await this.findOne(investmentId);
    const withdrawal = await this.withdrawalsRepo.findOne({
      where: { id: withdrawalId, investmentId },
    });
    if (!withdrawal) {
      throw new NotFoundException(
        `Withdrawal ${withdrawalId} not found for investment ${investmentId}`,
      );
    }

    await this.withdrawalsRepo.remove(withdrawal);

    investment.withdrawnAmount = Math.max(
      0,
      num(investment.withdrawnAmount) - num(withdrawal.amount),
    );
    investment.status = InvestmentStatus.ACTIVE;
    await this.repo.save(investment);

    return this.findOneWithComputed(investmentId);
  }
}
