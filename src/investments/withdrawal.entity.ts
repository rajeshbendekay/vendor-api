import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Investment } from './investment.entity';

export enum WithdrawalType {
  WITHDRAWAL = 'WITHDRAWAL',
  CREDIT = 'CREDIT',
  PROFIT_SETTLEMENT = 'PROFIT_SETTLEMENT',
  PARTIAL_SETTLEMENT = 'PARTIAL_SETTLEMENT',
}

// A single credit (principal top-up), withdrawal (principal reduction),
// profit settlement (PFS — closes out an installment's profit and
// rolls its principal into the next one), or partial settlement (a
// payout of part of the outstanding amount that leaves the installment
// ACTIVE, like a part-payment of a credit card bill) applied to an
// investment row.
// installment records which tranche the transaction was attributed to
// at the time it was made.
@Entity('investment_withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  investmentId: number;

  @ManyToOne(() => Investment)
  @JoinColumn({ name: 'investmentId' })
  investment: Investment;

  @Column({ type: 'enum', enum: WithdrawalType, default: WithdrawalType.WITHDRAWAL })
  type: WithdrawalType;

  @Column({ type: 'int' })
  installment: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
