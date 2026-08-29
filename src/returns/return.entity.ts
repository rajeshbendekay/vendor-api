import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReturnParty } from '../return-parties/return-party.entity';
import { ReturnType } from '../return-types/return-type.entity';

export const ReturnStatus = {
  ACTIVE: 'ACTIVE',
  SETTLED: 'SETTLED',
} as const;
export type ReturnStatus = (typeof ReturnStatus)[keyof typeof ReturnStatus];

// A single payout arrangement for a return party. One return party can have
// many returns (1:N) — each with its own type, amount, and term.
// returnAmount is the live principal: a Credit tops it up in place, a
// Withdrawal draws it down — even down to 0, it stays ACTIVE. SETTLED is
// only ever set explicitly via PFS (settleProfit), which then locks the
// row from further edits/deletes/withdrawals/PFS.
// installment counts which tranche this row represents within its chain;
// rootReturnId links a PFS-spun-off installment back to installment #1 of
// that same chain (null on installment #1 itself — treat
// rootReturnId ?? id as "the chain's identity" when grouping).
@Entity('returns')
export class Return {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  returnPartyId: number;

  @ManyToOne(() => ReturnParty, { eager: true })
  @JoinColumn({ name: 'returnPartyId' })
  returnParty: ReturnParty;

  @Column({ nullable: true })
  returnTypeId: number;

  @ManyToOne(() => ReturnType, { nullable: true, eager: true })
  @JoinColumn({ name: 'returnTypeId' })
  returnType: ReturnType | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  returnAmount: number;

  @Column({ type: 'int', default: 1 })
  installment: number;

  @Column({ type: 'int', nullable: true })
  rootReturnId: number | null;

  // Identifies the whole return (chain), not this individual row — every
  // installment spun off via PFS inherits installment #1's transactionId
  // rather than getting its own. Only generated fresh for a brand-new
  // chain (installment #1); server-generated and never client-settable or
  // regenerated. Not unique at the DB level since every row in a chain
  // shares one value; uniqueness is enforced at generation time, scoped
  // to root (chain-starting) rows only.
  @Column({ type: 'varchar', length: 32, nullable: true })
  transactionId: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  profitPercent: number;

  // Start of the return term; endDate is derived from this + the return
  // type's numberOfDays whenever either one changes.
  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: ReturnStatus,
    default: ReturnStatus.ACTIVE,
  })
  status: ReturnStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Deleting a return is a soft delete (unlike withdrawals, which are
  // hard-deleted) — the record and its withdrawal history are kept for
  // audit purposes; find()/findOne() exclude it automatically.
  @DeleteDateColumn()
  deletedAt: Date | null;
}
