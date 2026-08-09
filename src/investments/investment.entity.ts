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
import { Investor } from '../investors/investor.entity';
import { InvestorType } from '../investor-types/investor-type.entity';

export const InvestmentStatus = {
  ACTIVE: 'ACTIVE',
  SETTLED: 'SETTLED',
} as const;
export type InvestmentStatus =
  (typeof InvestmentStatus)[keyof typeof InvestmentStatus];

// A single capital contribution by an investor. One investor can have
// many investments (1:N) — each with its own type, amount, and term.
// investmentAmount is the live principal: a Credit tops it up in place,
// a Withdrawal draws it down; once it hits 0 the investment is marked
// SETTLED and locked from further edits/deletes/withdrawals/PFS.
// installment counts which tranche this row represents within its
// chain; rootInvestmentId links a PFS-spun-off installment back to
// installment #1 of that same chain (null on installment #1 itself —
// treat rootInvestmentId ?? id as "the chain's identity" when grouping).
@Entity('investments')
export class Investment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  investorId: number;

  @ManyToOne(() => Investor, { eager: true })
  @JoinColumn({ name: 'investorId' })
  investor: Investor;

  @Column({ nullable: true })
  investorTypeId: number;

  @ManyToOne(() => InvestorType, { nullable: true, eager: true })
  @JoinColumn({ name: 'investorTypeId' })
  investorType: InvestorType | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  investmentAmount: number;

  @Column({ type: 'int', default: 1 })
  installment: number;

  @Column({ type: 'int', nullable: true })
  rootInvestmentId: number | null;

  // Identifies the whole investment (chain), not this individual row —
  // every installment spun off via PFS inherits installment #1's
  // transactionId rather than getting its own. Only generated fresh for
  // a brand-new chain (installment #1); server-generated and never
  // client-settable or regenerated. Not unique at the DB level since
  // every row in a chain shares one value; uniqueness is enforced at
  // generation time, scoped to root (chain-starting) rows only.
  @Column({ type: 'varchar', length: 32, nullable: true })
  transactionId: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  profitPercent: number;

  // Start of the investment term; endDate is derived from this + the
  // investor type's numberOfDays whenever either one changes.
  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: InvestmentStatus,
    default: InvestmentStatus.ACTIVE,
  })
  status: InvestmentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Deleting an investment is a soft delete (unlike withdrawals, which
  // are hard-deleted) — the record and its withdrawal history are kept
  // for audit purposes; find()/findOne() exclude it automatically.
  @DeleteDateColumn()
  deletedAt: Date | null;
}
