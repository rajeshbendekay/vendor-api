import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Return } from './return.entity';

export enum ReturnWithdrawalType {
  WITHDRAWAL = 'WITHDRAWAL',
  CREDIT = 'CREDIT',
  PROFIT_SETTLEMENT = 'PROFIT_SETTLEMENT',
}

// A single credit (principal top-up), withdrawal (principal reduction), or
// profit settlement (PFS — closes out an installment's profit and rolls
// its principal into the next one) applied to a return row. installment
// records which tranche the transaction was attributed to at the time it
// was made.
@Entity('return_withdrawals')
export class ReturnWithdrawal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  returnId: number;

  @ManyToOne(() => Return)
  @JoinColumn({ name: 'returnId' })
  return: Return;

  @Column({
    type: 'enum',
    enum: ReturnWithdrawalType,
    default: ReturnWithdrawalType.WITHDRAWAL,
  })
  type: ReturnWithdrawalType;

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
