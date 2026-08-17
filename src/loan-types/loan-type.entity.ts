import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Admin-configurable loan category (e.g. "OD", "Interest", "Credit Card",
// "Gold Loan") — a plain label, no behavior tied to it.
@Entity('loan_types')
export class LoanType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
