import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Loan, LoanStatus } from './loan.entity';
import { LoanTransaction, LoanTransactionType } from './loan-transaction.entity';
import { CreateLoanDto, RepayLoanDto, UpdateLoanDto } from './dto';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';

function omitPassword(loan: Loan): Loan {
  if (!loan.lender) return loan;
  const { passwordHash: _passwordHash, ...safeLender } = loan.lender;
  return { ...loan, lender: safeLender as User };
}

// Decimal columns come back as strings from MySQL — coerce defensively
// everywhere they're used in arithmetic.
function num(value: unknown): number {
  return Number(value) || 0;
}

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly repo: Repository<Loan>,
    @InjectRepository(LoanTransaction)
    private readonly transactionsRepo: Repository<LoanTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // endDate is always derived from startDate + totalEmis months — never
  // accepted from the client.
  private computeEndDate(
    startDate?: string | null,
    totalEmis?: number | null,
  ): string | null {
    if (!startDate || !totalEmis) return null;
    const end = new Date(startDate);
    end.setMonth(end.getMonth() + totalEmis);
    return end.toISOString().slice(0, 10);
  }

  // Loaded without the `lender` relation — for update/remove, which only
  // need to mutate columns and would otherwise be left holding a stale
  // `lender` object alongside a freshly-assigned lenderId.
  private async findRaw(id: number) {
    const loan = await this.repo.findOne({ where: { id } });
    if (!loan) throw new NotFoundException(`Loan ${id} not found`);
    return loan;
  }

  private async assertLender(lenderId: number) {
    const lender = await this.dataSource.getRepository(User).findOne({ where: { id: lenderId } });
    if (!lender || !lender.roles.includes(UserRole.LENDER)) {
      throw new BadRequestException('Selected lender must be a user with the Lender role');
    }
  }

  // Lazy catch-up: this app has no cron/scheduler, so instead of a
  // background job, every load of a loan checks how many calendar months
  // have passed since the last accrual and posts one INTEREST_ACCRUAL
  // transaction per missed month (each dated at its real month boundary)
  // before returning. Only applies to interest-only loans while ACTIVE —
  // installment loans have their interest baked into installmentAmount,
  // not a separate rate to accrue from. Uses the loan's *current*
  // principalOutstanding for every caught-up month rather than
  // reconstructing historical balances, since no daily snapshots are
  // kept — acceptable as long as the app is checked reasonably often.
  private async syncAccruals(loan: Loan): Promise<Loan> {
    if (
      !loan.isInterestOnly ||
      loan.status !== LoanStatus.ACTIVE ||
      !loan.interestPercent ||
      !loan.startDate
    ) {
      return loan;
    }

    const latest = await this.transactionsRepo.findOne({
      where: { loanId: loan.id, type: LoanTransactionType.INTEREST_ACCRUAL },
      order: { date: 'DESC' },
    });
    const anchor = new Date(latest?.date ?? loan.startDate);
    const today = new Date(this.today());
    const principal = num(loan.principalOutstanding);
    const rate = num(loan.interestPercent);
    // Same ₹-per-hundred-per-month convention as the frontend's Loan
    // Interest Amount suggestion: the entered rate is per-hundred-per-
    // year, applied monthly at 1/12th of it.
    const monthlyAmount = Math.round(((principal * rate) / 12 / 100) * 100) / 100;

    const newRows: LoanTransaction[] = [];
    let interestOutstanding = num(loan.interestOutstanding);
    const next = new Date(anchor);
    next.setMonth(next.getMonth() + 1);
    while (next <= today) {
      interestOutstanding += monthlyAmount;
      newRows.push(
        this.transactionsRepo.create({
          loanId: loan.id,
          type: LoanTransactionType.INTEREST_ACCRUAL,
          principalAmount: 0,
          interestAmount: monthlyAmount,
          date: next.toISOString().slice(0, 10),
          notes: 'Automatic monthly interest accrual',
        }),
      );
      next.setMonth(next.getMonth() + 1);
    }

    if (newRows.length === 0) return loan;
    await this.transactionsRepo.save(newRows);
    loan.interestOutstanding = interestOutstanding;
    return this.repo.save(loan);
  }

  async findAll() {
    const loans = await this.repo.find({
      order: { createdAt: 'DESC' },
      relations: { lender: true },
    });
    const synced = await Promise.all(loans.map((loan) => this.syncAccruals(loan)));
    return synced.map(omitPassword);
  }

  async findOne(id: number) {
    const loan = await this.repo.findOne({ where: { id }, relations: { lender: true } });
    if (!loan) throw new NotFoundException(`Loan ${id} not found`);
    return omitPassword(await this.syncAccruals(loan));
  }

  async create(dto: CreateLoanDto) {
    await this.assertLender(dto.lenderId);
    const loan = this.repo.create({
      ...dto,
      principalOutstanding: dto.principalOutstanding ?? dto.loanAmount,
    });
    loan.endDate = this.computeEndDate(loan.startDate, loan.totalEmis);
    const saved = await this.repo.save(loan);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateLoanDto) {
    if (dto.lenderId !== undefined) await this.assertLender(dto.lenderId);
    const loan = await this.findRaw(id);
    Object.assign(loan, dto);
    loan.endDate = this.computeEndDate(loan.startDate, loan.totalEmis);
    await this.repo.save(loan);
    return this.findOne(id);
  }

  async remove(id: number) {
    const loan = await this.findRaw(id);
    await this.repo.remove(loan);
    return { deleted: true, id };
  }

  // Pays down principal and/or interest — the admin picks which via the
  // amounts sent (Interest Only / Principal Only / Both, driven by the
  // frontend's repayment-type selector). Doesn't auto-close the loan at
  // zero balance, same as Investments/Returns — status stays an explicit
  // admin action.
  async repay(id: number, dto: RepayLoanDto) {
    const principalAmount = num(dto.principalAmount);
    const interestAmount = num(dto.interestAmount);
    if (principalAmount <= 0 && interestAmount <= 0) {
      throw new BadRequestException(
        'A repayment must include a positive principal and/or interest amount',
      );
    }

    let loan = await this.findRaw(id);
    loan = await this.syncAccruals(loan);

    const principalDue = num(loan.principalOutstanding);
    const interestDue = num(loan.interestOutstanding);
    if (principalAmount > principalDue + 0.01) {
      throw new BadRequestException(
        `Principal repayment exceeds outstanding principal of ${principalDue.toFixed(2)}`,
      );
    }
    if (interestAmount > interestDue + 0.01) {
      throw new BadRequestException(
        `Interest repayment exceeds outstanding interest of ${interestDue.toFixed(2)}`,
      );
    }

    loan.principalOutstanding = Math.max(0, principalDue - principalAmount);
    loan.interestOutstanding = Math.max(0, interestDue - interestAmount);
    await this.repo.save(loan);

    await this.transactionsRepo.save(
      this.transactionsRepo.create({
        loanId: loan.id,
        type: LoanTransactionType.REPAYMENT,
        principalAmount,
        interestAmount,
        date: dto.date || this.today(),
        notes: dto.notes,
      }),
    );
    return this.findOne(id);
  }

  // principalAfter/interestAfter per entry are running balances, not
  // stored snapshots — derived the same way InvestmentsService.
  // findWithdrawals derives its running `principal`: unwind every
  // REPAYMENT/INTEREST_ACCRUAL delta from the loan's current (post-sync)
  // authoritative balances to get the opening balances, then walk forward
  // chronologically re-applying each delta.
  async findTransactions(id: number) {
    let loan = await this.findRaw(id);
    loan = await this.syncAccruals(loan);

    const chronological = await this.transactionsRepo.find({
      where: { loanId: id },
      order: { date: 'ASC', createdAt: 'ASC' },
    });

    let netPrincipalDelta = 0;
    let netInterestDelta = 0;
    for (const t of chronological) {
      if (t.type === LoanTransactionType.REPAYMENT) {
        netPrincipalDelta -= num(t.principalAmount);
        netInterestDelta -= num(t.interestAmount);
      } else {
        netInterestDelta += num(t.interestAmount);
      }
    }
    const openingPrincipal = num(loan.principalOutstanding) - netPrincipalDelta;
    const openingInterest = num(loan.interestOutstanding) - netInterestDelta;

    let principal = openingPrincipal;
    let interest = openingInterest;
    const transactions = chronological.map((t) => {
      if (t.type === LoanTransactionType.REPAYMENT) {
        principal -= num(t.principalAmount);
        interest -= num(t.interestAmount);
      } else {
        interest += num(t.interestAmount);
      }
      return { ...t, principalAfter: principal, interestAfter: interest };
    });

    return { openingPrincipal, openingInterest, transactions };
  }
}
