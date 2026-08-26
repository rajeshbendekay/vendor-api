import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExpenseType } from '../expense-types/expense-type.entity';
import { User } from '../users/user.entity';

export const PaymentMode = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  UPI: 'UPI',
  CARD: 'CARD',
  OTHER: 'OTHER',
} as const;
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

// A single operational spend (rent, electricity, stationery, ...) booked
// against an admin-configured ExpenseType. referenceNo is a user-typed
// payment reference (bank UTR, UPI ref, etc.) — distinct from the
// internally-generated sequential transactionId used by
// investments/returns, which doesn't apply here.
// attachmentPath/attachmentOriginalName are only set together, pointing at
// a file under uploads/expenses/ served back through the authenticated
// GET /expenses/:id/attachment endpoint (never through static hosting, so
// it stays behind the same JWT+role gate as everything else).
@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  expenseTypeId: number;

  @ManyToOne(() => ExpenseType, { eager: true })
  @JoinColumn({ name: 'expenseTypeId' })
  expenseType: ExpenseType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  expenseDate: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'enum', enum: PaymentMode, nullable: true })
  paymentMode: PaymentMode | null;

  @Column({ type: 'varchar', nullable: true })
  referenceNo: string | null;

  @Column({ type: 'varchar', nullable: true })
  attachmentPath: string | null;

  @Column({ type: 'varchar', nullable: true })
  attachmentOriginalName: string | null;

  @Column()
  createdById: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  updatedById: number | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
