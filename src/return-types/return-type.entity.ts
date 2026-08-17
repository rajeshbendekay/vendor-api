import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const ReturnSettlementMode = {
  // PFS settles only the profit and rolls the principal into a new
  // installment (e.g. Rotation).
  ROLLOVER: 'ROLLOVER',
  // PFS settles principal and profit together in one transaction and
  // closes the return for good — no next installment (e.g. Short Term).
  FULL_SETTLEMENT: 'FULL_SETTLEMENT',
} as const;
export type ReturnSettlementMode =
  (typeof ReturnSettlementMode)[keyof typeof ReturnSettlementMode];

// Admin-configurable return category (e.g. "Rotation", "Short Term").
// numberOfDays drives the auto-computed end date on a return party's return.
@Entity('return_types')
export class ReturnType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'int' })
  numberOfDays: number;

  @Column({
    type: 'enum',
    enum: ReturnSettlementMode,
    default: ReturnSettlementMode.ROLLOVER,
  })
  settlementMode: ReturnSettlementMode;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
