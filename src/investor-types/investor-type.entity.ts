import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const SettlementMode = {
  // PFS settles only the profit and rolls the principal into a new
  // installment (e.g. Rotation).
  ROLLOVER: 'ROLLOVER',
  // PFS settles principal and profit together in one transaction and
  // closes the investment for good — no next installment (e.g. Short Term).
  FULL_SETTLEMENT: 'FULL_SETTLEMENT',
} as const;
export type SettlementMode = (typeof SettlementMode)[keyof typeof SettlementMode];

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

  @Column({
    type: 'enum',
    enum: SettlementMode,
    default: SettlementMode.ROLLOVER,
  })
  settlementMode: SettlementMode;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
