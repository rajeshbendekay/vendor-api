import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Return, ReturnStatus } from './return.entity';
import { ReturnWithdrawal, ReturnWithdrawalType } from './return-withdrawal.entity';
import {
  CreateReturnDto,
  CreateReturnWithdrawalDto,
  UpdateReturnDto,
  UpdateReturnWithdrawalDto,
} from './dto';
import { ReturnPartiesService } from '../return-parties/return-parties.service';
import { ReturnTypesService } from '../return-types/return-types.service';
import { ReturnSettlementMode } from '../return-types/return-type.entity';

function num(value: unknown): number {
  return Number(value) || 0;
}

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(Return)
    private readonly repo: Repository<Return>,
    @InjectRepository(ReturnWithdrawal)
    private readonly withdrawalsRepo: Repository<ReturnWithdrawal>,
    private readonly returnPartiesService: ReturnPartiesService,
    private readonly returnTypesService: ReturnTypesService,
  ) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // profitAmount is computed off a basis that only grows (credits) and
  // is never reduced by a Withdrawal: a Withdrawal draws down
  // returnAmount as the balance still owed to the return party, but the
  // profit earned over the term must stay intact regardless of how much
  // (or when) principal is drawn down — only PFS (settleProfit) actually
  // finalizes/closes it out. Adding back every WITHDRAWAL amount ever
  // taken from this row to the live principal reconstructs that basis
  // (openingPrincipal + credits) without needing a stored snapshot.
  // finalAmount is always live principal + that profit; neither is
  // stored, since returnAmount itself moves as credits/withdrawals land.
  private withComputed(ret: Return, withdrawnTotal = 0, initialAmount = 0) {
    const principal = num(ret.returnAmount);
    const profitBase = principal + withdrawnTotal;
    const profitAmount = (profitBase * num(ret.profitPercent)) / 100;
    const finalAmount = principal + profitAmount;
    return { ...ret, finalAmount, initialAmount };
  }

  private async withdrawnTotal(returnId: number): Promise<number> {
    const withdrawals = await this.withdrawalsRepo.find({
      where: { returnId, type: ReturnWithdrawalType.WITHDRAWAL },
    });
    return withdrawals.reduce((sum, w) => sum + num(w.amount), 0);
  }

  // Batches the withdrawal totals and initial amounts for a set of
  // returns into a fixed number of queries instead of one per row, so
  // findAll()/findForReturnParty() stay O(1)
  // round trips regardless of list size.
  // initialAmount is the chain's original principal — installment #1's
  // opening balance before any credit/withdrawal, derived the same way
  // as findWithdrawals' openingPrincipal (unwinding every CREDIT/
  // WITHDRAWAL delta from its live returnAmount) rather than stored.
  private async withComputedMany(returns: Return[]) {
    const ids = returns.map((r) => r.id);
    const rootIds = [...new Set(returns.map((r) => r.rootReturnId ?? r.id))];
    const known = new Map(returns.map((r) => [r.id, r]));
    const missingRootIds = rootIds.filter((id) => !known.has(id));
    const fetchedRoots = missingRootIds.length
      ? await this.repo.find({ where: { id: In(missingRootIds) }, withDeleted: true })
      : [];
    for (const r of fetchedRoots) known.set(r.id, r);

    const txnIds = [...new Set([...ids, ...rootIds])];
    const txns = txnIds.length
      ? await this.withdrawalsRepo.find({
          where: {
            returnId: In(txnIds),
            type: In([ReturnWithdrawalType.WITHDRAWAL, ReturnWithdrawalType.CREDIT]),
          },
        })
      : [];
    const withdrawn = new Map<number, number>();
    const netDelta = new Map<number, number>();
    for (const w of txns) {
      const amount = num(w.amount);
      if (w.type === ReturnWithdrawalType.WITHDRAWAL) {
        withdrawn.set(w.returnId, (withdrawn.get(w.returnId) ?? 0) + amount);
      }
      const delta = w.type === ReturnWithdrawalType.CREDIT ? amount : -amount;
      netDelta.set(w.returnId, (netDelta.get(w.returnId) ?? 0) + delta);
    }
    const initialFor = (rootId: number) => {
      const root = known.get(rootId);
      return root ? num(root.returnAmount) - (netDelta.get(rootId) ?? 0) : 0;
    };
    return returns.map((r) =>
      this.withComputed(r, withdrawn.get(r.id) ?? 0, initialFor(r.rootReturnId ?? r.id)),
    );
  }

  async findAll() {
    const returns = await this.repo.find({ order: { createdAt: 'DESC' } });
    return this.withComputedMany(returns);
  }

  async findForReturnParty(returnPartyId: number) {
    const returns = await this.repo.find({
      where: { returnPartyId },
      order: { createdAt: 'DESC' },
    });
    return this.withComputedMany(returns);
  }

  async findOne(id: number) {
    const ret = await this.repo.findOne({ where: { id } });
    if (!ret) throw new NotFoundException(`Return ${id} not found`);
    return ret;
  }

  // ownerReturnPartyId is set for RETURN_PARTY-role callers — any return
  // not belonging to them is a 403, not just a 404, since these are
  // internal IDs and this is honest about "you can't see this" vs
  // "doesn't exist".
  private assertOwnership(ret: Return, ownerReturnPartyId: number | null) {
    if (ownerReturnPartyId !== null && ret.returnPartyId !== ownerReturnPartyId) {
      throw new ForbiddenException('You do not have access to this return');
    }
  }

  async findOneWithComputed(id: number, ownerReturnPartyId: number | null = null) {
    const ret = await this.findOne(id);
    this.assertOwnership(ret, ownerReturnPartyId);
    const [computed] = await this.withComputedMany([ret]);
    return computed;
  }

  // endDate is always derived from startDate + the return type's
  // numberOfDays — never accepted from the client.
  private async computeEndDate(
    startDate?: string | null,
    returnTypeId?: number | null,
  ): Promise<string | null> {
    if (!startDate || !returnTypeId) return null;
    const type = await this.returnTypesService.findOne(returnTypeId);
    const end = new Date(startDate);
    end.setDate(end.getDate() + type.numberOfDays);
    return end.toISOString().slice(0, 10);
  }

  // Transaction IDs are "{first letter of the return type name}-{seq}",
  // e.g. R-001 for "Rotation". The sequence is scoped to that letter (not
  // the type id) so the visible ID stays globally unique even if two
  // types ever share an initial; it's derived from the highest number
  // seen so far — including soft-deleted rows — so a delete never frees
  // up its number for reuse.
  private async prefixFor(returnTypeId?: number | null): Promise<string> {
    if (!returnTypeId) return 'X';
    const type = await this.returnTypesService.findOne(returnTypeId);
    const letter = type.name.trim().charAt(0).toUpperCase();
    return /^[A-Z]$/.test(letter) ? letter : 'X';
  }

  private async nextSequence(prefix: string): Promise<number> {
    const rows: { transactionId: string }[] = await this.repo
      .createQueryBuilder('return')
      .withDeleted()
      .select('return.transactionId', 'transactionId')
      .where('return.transactionId LIKE :pattern', { pattern: `${prefix}-%` })
      .getRawMany();
    let max = 0;
    for (const row of rows) {
      const n = parseInt(row.transactionId.slice(prefix.length + 1), 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return max + 1;
  }

  private async generateTransactionId(returnTypeId?: number | null): Promise<string> {
    const prefix = await this.prefixFor(returnTypeId);
    const seq = await this.nextSequence(prefix);
    return `${prefix}-${String(seq).padStart(3, '0')}`;
  }

  // Assigns a freshly generated transaction ID to a brand-new chain
  // (installment #1 only — PFS inherits instead, see settleProfit) and
  // saves. Since transactionId isn't DB-unique any more (a chain shares
  // one across all its installments), a duplicate can't be caught by a
  // constraint — so this re-checks existence and retries on the rare
  // race where two creates generate the same next number concurrently.
  private async saveWithTransactionId<T extends Return>(entity: T): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = await this.generateTransactionId(entity.returnTypeId);
      const taken = await this.repo.exists({ where: { transactionId: candidate }, withDeleted: true });
      if (!taken) {
        entity.transactionId = candidate;
        return await this.repo.save(entity);
      }
    }
    throw new Error('Could not generate a unique transaction ID');
  }

  async create(dto: CreateReturnDto) {
    await this.returnPartiesService.findOne(dto.returnPartyId);
    const ret = this.repo.create(dto);
    ret.endDate = await this.computeEndDate(ret.startDate, ret.returnTypeId);
    const saved = await this.saveWithTransactionId(ret);
    return this.findOneWithComputed(saved.id);
  }

  async update(id: number, dto: UpdateReturnDto) {
    const ret = await this.findOne(id);
    if (ret.status === ReturnStatus.SETTLED) {
      throw new BadRequestException('Settled returns cannot be edited');
    }
    if (dto.returnPartyId != null) await this.returnPartiesService.findOne(dto.returnPartyId);
    Object.assign(ret, dto);
    ret.endDate = await this.computeEndDate(ret.startDate, ret.returnTypeId);
    await this.repo.save(ret);
    return this.findOneWithComputed(id);
  }

  async remove(id: number) {
    const ret = await this.findOne(id);
    if (ret.status === ReturnStatus.SETTLED) {
      throw new BadRequestException('Settled returns cannot be deleted');
    }
    // Soft delete: keeps the record and its withdrawal history for
    // audit purposes. find()/findOne() exclude it automatically.
    await this.repo.softRemove(ret);
    return { deleted: true, id };
  }

  // A Credit tops up this row's principal in place; a Withdrawal draws
  // it down. Both always apply to the current installment — spinning
  // off a new installment is PFS's job alone (see settleProfit below).
  // Neither is allowed once settled: a settled installment is closed
  // for good — its balance moves forward only via a new installment.
  // For ROLLOVER (e.g. Rotation) return types specifically, neither is
  // allowed either once the installment's term has ended — the correct
  // next step there is PFS (roll principal into a new installment), not
  // an ad-hoc credit/withdrawal against a matured row. FULL_SETTLEMENT
  // (e.g. Short Term) has no such restriction: a withdrawal there is a
  // legitimate partial payout of the matured funds pending PFS closeout.
  async withdraw(returnId: number, dto: CreateReturnWithdrawalDto) {
    const ret = await this.findOne(returnId);
    const type = dto.type ?? ReturnWithdrawalType.WITHDRAWAL;
    const date = dto.date || this.today();

    if (ret.status === ReturnStatus.SETTLED) {
      throw new BadRequestException('This return is already settled');
    }
    if (
      ret.returnType?.settlementMode === ReturnSettlementMode.ROLLOVER &&
      ret.endDate &&
      ret.endDate <= this.today()
    ) {
      throw new BadRequestException(
        'This installment has passed its end date — settle profit (PFS) to roll it into a new installment before crediting or withdrawing',
      );
    }

    if (type === ReturnWithdrawalType.WITHDRAWAL) {
      const principal = num(ret.returnAmount);
      if (dto.amount > principal + 0.01) {
        throw new BadRequestException(
          `Withdrawal amount exceeds current return of ${principal.toFixed(2)}`,
        );
      }
      // A zero balance does NOT settle the return — settlement is only
      // ever triggered explicitly via PFS (see settleProfit below).
      // Profit stays intact and available while ACTIVE even at ₹0
      // principal, since withComputed's profit basis doesn't depend on
      // the live balance.
      ret.returnAmount = Math.max(0, principal - dto.amount);
    } else {
      ret.returnAmount = num(ret.returnAmount) + dto.amount;
    }
    await this.repo.save(ret);

    await this.withdrawalsRepo.save(
      this.withdrawalsRepo.create({
        returnId: ret.id,
        type,
        installment: ret.installment,
        amount: dto.amount,
        date,
        notes: dto.notes,
      }),
    );
    return this.findOneWithComputed(ret.id);
  }

  // PFS (Profit Settlement) behaves differently per return type:
  // ROLLOVER (e.g. Rotation) settles only the profit and carries the
  // principal — unchanged — into a new installment starting on this
  // one's endDate and running a fixed 45 days, regardless of the return
  // type's normal term length. FULL_SETTLEMENT (e.g. Short Term) settles
  // principal and profit together in one transaction and closes the
  // return for good — no next installment.
  async settleProfit(returnId: number) {
    const ret = await this.findOne(returnId);
    if (ret.status === ReturnStatus.SETTLED) {
      throw new BadRequestException('This return is already settled');
    }
    if (!ret.endDate) {
      throw new BadRequestException(
        'This return has no end date to roll the next installment forward from',
      );
    }

    const principal = num(ret.returnAmount);
    // Profit is finalized on the same basis as the live display (see
    // withComputed): principal plus everything ever withdrawn from this
    // row, so a withdrawal made at any point during the term doesn't
    // shrink the profit it earned. Applies the same way to
    // FULL_SETTLEMENT (Short Term) and ROLLOVER (Rotation) return types.
    const profitBase = principal + (await this.withdrawnTotal(ret.id));
    const profitAmount = (profitBase * num(ret.profitPercent)) / 100;
    const fullSettlement = ret.returnType?.settlementMode === ReturnSettlementMode.FULL_SETTLEMENT;

    ret.status = ReturnStatus.SETTLED;
    await this.repo.save(ret);

    await this.withdrawalsRepo.save(
      this.withdrawalsRepo.create({
        returnId: ret.id,
        type: ReturnWithdrawalType.PROFIT_SETTLEMENT,
        installment: ret.installment,
        amount: fullSettlement ? principal + profitAmount : profitAmount,
        date: ret.endDate,
        notes: fullSettlement
          ? 'Principal and profit fully settled; return closed'
          : 'Profit settled; principal carried forward to next installment',
      }),
    );

    if (fullSettlement) {
      return this.findOneWithComputed(ret.id);
    }

    const startDate = ret.endDate;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 45);

    const nextInstallment = this.repo.create({
      returnPartyId: ret.returnPartyId,
      returnTypeId: ret.returnTypeId,
      returnAmount: principal,
      profitPercent: ret.profitPercent,
      installment: ret.installment + 1,
      rootReturnId: ret.rootReturnId ?? ret.id,
      // Inherit — a PFS installment is still the same return, not a new
      // one, so it keeps the chain's transaction ID.
      transactionId: ret.transactionId,
      startDate,
      endDate: endDate.toISOString().slice(0, 10),
      notes: ret.notes,
    });
    const saved = await this.repo.save(nextInstallment);
    return this.findOneWithComputed(saved.id);
  }

  // principal per entry is a running balance, not a stored snapshot: we
  // derive the opening balance by unwinding every CREDIT/WITHDRAWAL delta
  // from the row's current (authoritative) returnAmount, then walk
  // forward chronologically re-applying each delta. This stays correct
  // even after a past transaction's amount is edited, since it's always
  // recomputed from current state rather than trusted from a stored value.
  async findWithdrawals(returnId: number, ownerReturnPartyId: number | null = null) {
    const ret = await this.findOne(returnId);
    this.assertOwnership(ret, ownerReturnPartyId);
    const chronological = await this.withdrawalsRepo.find({
      where: { returnId },
      order: { date: 'ASC', createdAt: 'ASC' },
    });

    const netDelta = chronological.reduce((sum, w) => {
      if (w.type === ReturnWithdrawalType.CREDIT) return sum + num(w.amount);
      if (w.type === ReturnWithdrawalType.WITHDRAWAL) return sum - num(w.amount);
      return sum;
    }, 0);
    const openingPrincipal = num(ret.returnAmount) - netDelta;

    let running = openingPrincipal;
    const transactions = chronological.map((w) => {
      if (w.type === ReturnWithdrawalType.CREDIT) running += num(w.amount);
      else if (w.type === ReturnWithdrawalType.WITHDRAWAL) running -= num(w.amount);
      return { ...w, principal: running };
    });

    return { openingPrincipal, transactions };
  }

  // Corrects a credit or withdrawal entry's amount/date/notes in place.
  // Changing the amount reverses the old amount's effect on principal
  // and reapplies the new one, rather than touching type or installment.
  async updateWithdrawal(
    returnId: number,
    withdrawalId: number,
    dto: UpdateReturnWithdrawalDto,
  ) {
    const ret = await this.findOne(returnId);
    const withdrawal = await this.withdrawalsRepo.findOne({
      where: { id: withdrawalId, returnId },
    });
    if (!withdrawal) {
      throw new NotFoundException(
        `Withdrawal ${withdrawalId} not found for return ${returnId}`,
      );
    }
    if (withdrawal.type === ReturnWithdrawalType.PROFIT_SETTLEMENT) {
      throw new BadRequestException('Profit settlements cannot be edited');
    }

    if (dto.amount != null && dto.amount !== num(withdrawal.amount)) {
      const principalBeforeThis =
        num(ret.returnAmount) +
        num(withdrawal.amount) * (withdrawal.type === ReturnWithdrawalType.CREDIT ? -1 : 1);

      let principal: number;
      if (withdrawal.type === ReturnWithdrawalType.WITHDRAWAL) {
        if (dto.amount > principalBeforeThis + 0.01) {
          throw new BadRequestException(
            `Withdrawal amount exceeds current return of ${principalBeforeThis.toFixed(2)}`,
          );
        }
        principal = Math.max(0, principalBeforeThis - dto.amount);
      } else {
        principal = principalBeforeThis + dto.amount;
      }

      // A zero (or edited-down) balance does NOT settle the return —
      // settlement is only ever triggered explicitly via PFS.
      ret.returnAmount = principal;
      await this.repo.save(ret);
      withdrawal.amount = dto.amount;
    }

    if (dto.date) withdrawal.date = dto.date;
    if (dto.notes !== undefined) withdrawal.notes = dto.notes;
    await this.withdrawalsRepo.save(withdrawal);

    return this.findOneWithComputed(returnId);
  }
}
