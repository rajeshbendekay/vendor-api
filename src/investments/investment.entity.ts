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
// withdrawnAmount tracks the running total paid out against this
// investment's final amount (principal + profit); once it reaches the
// final amount the investment is marked SETTLED and locked from
// further edits/deletes/withdrawals.
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

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  withdrawnAmount: number;

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
