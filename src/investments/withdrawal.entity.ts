import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Investment } from './investment.entity';

// A single partial (or final) payout taken against an investment's
// final amount. The running total of these is what drives an
// investment's withdrawnAmount / status.
@Entity('investment_withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  investmentId: number;

  @ManyToOne(() => Investment)
  @JoinColumn({ name: 'investmentId' })
  investment: Investment;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
