import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Admin-configurable investor category (e.g. "Fixed Deposit", "Short Term").
// numberOfDays drives the auto-computed end date on an investor's investment.
@Entity('investor_types')
export class InvestorType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'int' })
  numberOfDays: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
