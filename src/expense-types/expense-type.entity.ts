import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Admin-configurable expense category (e.g. "Office Rent", "Electricity",
// "Internet", "Stationery") — a plain label, no behavior tied to it.
// isActive lets an unused-going-forward type drop out of the Add Expense
// dropdown while past expenses booked against it keep displaying normally;
// deletion is blocked instead (see expense-types.service.ts) once any
// expense references it.
@Entity('expense_types')
export class ExpenseType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
