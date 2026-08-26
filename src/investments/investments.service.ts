import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Investment, InvestmentStatus } from './investment.entity';
import { Withdrawal, WithdrawalType } from './withdrawal.entity';
import {
  CreateInvestmentDto,
  CreateWithdrawalDto,
  UpdateInvestmentDto,
  UpdateWithdrawalDto,
} from './dto';
import { InvestorsService } from '../investors/investors.service';
import { InvestorTypesService } from '../investor-types/investor-types.service';
import { SettlementMode } from '../investor-types/investor-type.entity';

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

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // profitAmount is computed off a basis that only grows (credits) and
  // is never reduced by a Withdrawal: a Withdrawal draws down
  // investmentAmount as the balance still owed to the investor, but the
  // profit earned over the term must stay intact regardless of how much
  // (or when) principal is drawn down — only PFS (settleProfit) actually
  // finalizes/closes it out. Adding back every WITHDRAWAL amount ever
  // taken from this row to the live principal reconstructs that basis
  // (openingPrincipal + credits) without needing a stored snapshot.
  // finalAmount is always live principal + that profit; neither is
  // stored, since investmentAmount itself moves as credits/withdrawals
  // land.
  private withComputed(investment: Investment, withdrawnTotal = 0) {
    const principal = num(investment.investmentAmount);
    const profitBase = principal + withdrawnTotal;
    const profitAmount = (profitBase * num(investment.profitPercent)) / 100;
    const finalAmount = principal + profitAmount;
    return { ...investment, finalAmount };
  }

  private async withdrawnTotal(investmentId: number): Promise<number> {
    const withdrawals = await this.withdrawalsRepo.find({
      where: { investmentId, type: WithdrawalType.WITHDRAWAL },
    });
    return withdrawals.reduce((sum, w) => sum + num(w.amount), 0);
  }

  // Batches the withdrawal totals for a set of investments into one
  // query instead of one per row, so findAll()/findForInvestor() stay
  // O(1) round trips regardless of list size.
  private async withComputedMany(investments: Investment[]) {
    const ids = investments.map((i) => i.id);
    const withdrawals = ids.length
      ? await this.withdrawalsRepo.find({
          where: { investmentId: In(ids), type: WithdrawalType.WITHDRAWAL },
        })
      : [];
    const totals = new Map<number, number>();
    for (const w of withdrawals) {
      totals.set(w.investmentId, (totals.get(w.investmentId) ?? 0) + num(w.amount));
    }
    return investments.map((i) => this.withComputed(i, totals.get(i.id) ?? 0));
  }

  async findAll() {
    const investments = await this.repo.find({ order: { createdAt: 'DESC' } });
    return this.withComputedMany(investments);
  }

  async findForInvestor(investorId: number) {
    const investments = await this.repo.find({
      where: { investorId },
      order: { createdAt: 'DESC' },
    });
    return this.withComputedMany(investments);
  }

  async findOne(id: number) {
    const investment = await this.repo.findOne({ where: { id } });
    if (!investment) throw new NotFoundException(`Investment ${id} not found`);
    return investment;
  }

  // ownerInvestorId is set for INVESTOR-role callers — any investment not
  // belonging to them is a 403, not just a 404, since these are internal
  // IDs and this is honest about "you can't see this" vs "doesn't exist".
  private assertOwnership(investment: Investment, ownerInvestorId: number | null) {
    if (ownerInvestorId !== null && investment.investorId !== ownerInvestorId) {
      throw new ForbiddenException('You do not have access to this investment');
    }
  }

  async findOneWithComputed(id: number, ownerInvestorId: number | null = null) {
    const investment = await this.findOne(id);
    this.assertOwnership(investment, ownerInvestorId);
    return this.withComputed(investment, await this.withdrawnTotal(id));
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

  // Transaction IDs are "{first letter of the investor type name}-{seq}",
  // e.g. R-001 for "Rotation". The sequence is scoped to that letter (not
  // the type id) so the visible ID stays globally unique even if two
  // types ever share an initial; it's derived from the highest number
  // seen so far — including soft-deleted rows — so a delete never frees
  // up its number for reuse.
  private async prefixFor(investorTypeId?: number | null): Promise<string> {
    if (!investorTypeId) return 'X';
    const type = await this.investorTypesService.findOne(investorTypeId);
    const letter = type.name.trim().charAt(0).toUpperCase();
    return /^[A-Z]$/.test(letter) ? letter : 'X';
  }

  private async nextSequence(prefix: string): Promise<number> {
    const rows: { transactionId: string }[] = await this.repo
      .createQueryBuilder('investment')
      .withDeleted()
      .select('investment.transactionId', 'transactionId')
      .where('investment.transactionId LIKE :pattern', { pattern: `${prefix}-%` })
      .getRawMany();
    let max = 0;
    for (const row of rows) {
      const n = parseInt(row.transactionId.slice(prefix.length + 1), 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return max + 1;
  }

  private async generateTransactionId(investorTypeId?: number | null): Promise<string> {
    const prefix = await this.prefixFor(investorTypeId);
    const seq = await this.nextSequence(prefix);
    return `${prefix}-${String(seq).padStart(3, '0')}`;
  }

  // Assigns a freshly generated transaction ID to a brand-new chain
  // (installment #1 only — PFS inherits instead, see settleProfit) and
  // saves. Since transactionId isn't DB-unique any more (a chain shares
  // one across all its installments), a duplicate can't be caught by a
  // constraint — so this re-checks existence and retries on the rare
  // race where two creates generate the same next number concurrently.
  private async saveWithTransactionId<T extends Investment>(entity: T): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = await this.generateTransactionId(entity.investorTypeId);
      const taken = await this.repo.exists({ where: { transactionId: candidate }, withDeleted: true });
      if (!taken) {
        entity.transactionId = candidate;
        return await this.repo.save(entity);
      }
    }
    throw new Error('Could not generate a unique transaction ID');
  }

  async create(dto: CreateInvestmentDto) {
    await this.investorsService.findOne(dto.investorId);
    const investment = this.repo.create(dto);
    investment.endDate = await this.computeEndDate(
      investment.startDate,
      investment.investorTypeId,
    );
    const saved = await this.saveWithTransactionId(investment);
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

  // A Credit tops up this row's principal in place; a Withdrawal draws
  // it down. Both always apply to the current installment — spinning
  // off a new installment is PFS's job alone (see settleProfit below).
  // Neither is allowed once settled: a settled installment is closed
  // for good — its balance moves forward only via a new installment.
  // For ROLLOVER (e.g. Rotation) investor types specifically, neither is
  // allowed either once the installment's term has ended — the correct
  // next step there is PFS (roll principal into a new installment), not
  // an ad-hoc credit/withdrawal against a matured row. FULL_SETTLEMENT
  // (e.g. Short Term) has no such restriction: a withdrawal there is a
  // legitimate partial payout of the matured funds pending PFS closeout.
  async withdraw(investmentId: number, dto: CreateWithdrawalDto) {
    const investment = await this.findOne(investmentId);
    const type = dto.type ?? WithdrawalType.WITHDRAWAL;
    const date = dto.date || this.today();

    if (investment.status === InvestmentStatus.SETTLED) {
      throw new BadRequestException('This investment is already settled');
    }
    if (
      investment.investorType?.settlementMode === SettlementMode.ROLLOVER &&
      investment.endDate &&
      investment.endDate <= this.today()
    ) {
      throw new BadRequestException(
        'This installment has passed its end date — settle profit (PFS) to roll it into a new installment before crediting or withdrawing',
      );
    }

    if (type === WithdrawalType.WITHDRAWAL) {
      const principal = num(investment.investmentAmount);
      if (dto.amount > principal + 0.01) {
        throw new BadRequestException(
          `Withdrawal amount exceeds current investment of ${principal.toFixed(2)}`,
        );
      }
      // A zero balance does NOT settle the investment — settlement is
      // only ever triggered explicitly via PFS (see settleProfit below).
      // Profit stays intact and available while ACTIVE even at ₹0
      // principal, since withComputed's profit basis doesn't depend on
      // the live balance.
      investment.investmentAmount = Math.max(0, principal - dto.amount);
    } else {
      investment.investmentAmount = num(investment.investmentAmount) + dto.amount;
    }
    await this.repo.save(investment);

    await this.withdrawalsRepo.save(
      this.withdrawalsRepo.create({
        investmentId: investment.id,
        type,
        installment: investment.installment,
        amount: dto.amount,
        date,
        notes: dto.notes,
      }),
    );
    return this.findOneWithComputed(investment.id);
  }

  // PFS (Profit Settlement) behaves differently per investor type:
  // ROLLOVER (e.g. Rotation) settles only the profit and carries the
  // principal — unchanged — into a new installment starting on this
  // one's endDate and running a fixed 45 days, regardless of the
  // investor type's normal term length. FULL_SETTLEMENT (e.g. Short
  // Term) settles principal and profit together in one transaction and
  // closes the investment for good — no next installment.
  async settleProfit(investmentId: number) {
    const investment = await this.findOne(investmentId);
    if (investment.status === InvestmentStatus.SETTLED) {
      throw new BadRequestException('This investment is already settled');
    }
    if (!investment.endDate) {
      throw new BadRequestException(
        'This investment has no end date to roll the next installment forward from',
      );
    }

    const principal = num(investment.investmentAmount);
    // Profit is finalized on the same basis as the live display (see
    // withComputed): principal plus everything ever withdrawn from this
    // row, so a withdrawal made at any point during the term doesn't
    // shrink the profit it earned. Applies the same way to
    // FULL_SETTLEMENT (Short Term) and ROLLOVER (Rotation) investor
    // types.
    const profitBase = principal + (await this.withdrawnTotal(investment.id));
    const profitAmount = (profitBase * num(investment.profitPercent)) / 100;
    const fullSettlement = investment.investorType?.settlementMode === SettlementMode.FULL_SETTLEMENT;

    investment.status = InvestmentStatus.SETTLED;
    await this.repo.save(investment);

    await this.withdrawalsRepo.save(
      this.withdrawalsRepo.create({
        investmentId: investment.id,
        type: WithdrawalType.PROFIT_SETTLEMENT,
        installment: investment.installment,
        amount: fullSettlement ? principal + profitAmount : profitAmount,
        date: investment.endDate,
        notes: fullSettlement
          ? 'Principal and profit fully settled; investment closed'
          : 'Profit settled; principal carried forward to next installment',
      }),
    );

    if (fullSettlement) {
      return this.findOneWithComputed(investment.id);
    }

    const startDate = investment.endDate;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 45);

    const nextInstallment = this.repo.create({
      investorId: investment.investorId,
      investorTypeId: investment.investorTypeId,
      investmentAmount: principal,
      profitPercent: investment.profitPercent,
      installment: investment.installment + 1,
      rootInvestmentId: investment.rootInvestmentId ?? investment.id,
      // Inherit — a PFS installment is still the same investment, not a
      // new one, so it keeps the chain's transaction ID.
      transactionId: investment.transactionId,
      startDate,
      endDate: endDate.toISOString().slice(0, 10),
      notes: investment.notes,
    });
    const saved = await this.repo.save(nextInstallment);
    return this.findOneWithComputed(saved.id);
  }

  // principal per entry is a running balance, not a stored snapshot: we
  // derive the opening balance by unwinding every CREDIT/WITHDRAWAL delta
  // from the row's current (authoritative) investmentAmount, then walk
  // forward chronologically re-applying each delta. This stays correct
  // even after a past transaction's amount is edited, since it's always
  // recomputed from current state rather than trusted from a stored value.
  async findWithdrawals(investmentId: number, ownerInvestorId: number | null = null) {
    const investment = await this.findOne(investmentId);
    this.assertOwnership(investment, ownerInvestorId);
    const chronological = await this.withdrawalsRepo.find({
      where: { investmentId },
      order: { date: 'ASC', createdAt: 'ASC' },
    });

    const netDelta = chronological.reduce((sum, w) => {
      if (w.type === WithdrawalType.CREDIT) return sum + num(w.amount);
      if (w.type === WithdrawalType.WITHDRAWAL) return sum - num(w.amount);
      return sum;
    }, 0);
    const openingPrincipal = num(investment.investmentAmount) - netDelta;

    let running = openingPrincipal;
    const transactions = chronological.map((w) => {
      if (w.type === WithdrawalType.CREDIT) running += num(w.amount);
      else if (w.type === WithdrawalType.WITHDRAWAL) running -= num(w.amount);
      return { ...w, principal: running };
    });

    return { openingPrincipal, transactions };
  }

  // Corrects a credit or withdrawal entry's amount/date/notes in place.
  // Changing the amount reverses the old amount's effect on principal
  // and reapplies the new one, rather than touching type or installment.
  async updateWithdrawal(
    investmentId: number,
    withdrawalId: number,
    dto: UpdateWithdrawalDto,
  ) {
    const investment = await this.findOne(investmentId);
    const withdrawal = await this.withdrawalsRepo.findOne({
      where: { id: withdrawalId, investmentId },
    });
    if (!withdrawal) {
      throw new NotFoundException(
        `Withdrawal ${withdrawalId} not found for investment ${investmentId}`,
      );
    }
    if (withdrawal.type === WithdrawalType.PROFIT_SETTLEMENT) {
      throw new BadRequestException('Profit settlements cannot be edited');
    }

    if (dto.amount != null && dto.amount !== num(withdrawal.amount)) {
      const principalBeforeThis =
        num(investment.investmentAmount) +
        num(withdrawal.amount) * (withdrawal.type === WithdrawalType.CREDIT ? -1 : 1);

      let principal: number;
      if (withdrawal.type === WithdrawalType.WITHDRAWAL) {
        if (dto.amount > principalBeforeThis + 0.01) {
          throw new BadRequestException(
            `Withdrawal amount exceeds current investment of ${principalBeforeThis.toFixed(2)}`,
          );
        }
        principal = Math.max(0, principalBeforeThis - dto.amount);
      } else {
        principal = principalBeforeThis + dto.amount;
      }

      // A zero (or edited-down) balance does NOT settle the investment
      // — settlement is only ever triggered explicitly via PFS.
      investment.investmentAmount = principal;
      await this.repo.save(investment);
      withdrawal.amount = dto.amount;
    }

    if (dto.date) withdrawal.date = dto.date;
    if (dto.notes !== undefined) withdrawal.notes = dto.notes;
    await this.withdrawalsRepo.save(withdrawal);

    return this.findOneWithComputed(investmentId);
  }
}
