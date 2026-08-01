import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Investor profile — the reusable KYC/bank details for a person or
// partner. Actual capital put in is tracked separately as one-to-many
// Investment records (see ../investments/investment.entity.ts), since
// the same investor can invest multiple times under different terms.
@Entity('investors')
export class Investor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  pan: string;

  @Column({ nullable: true })
  aadhaar: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  accountNumber: string;

  @Column({ nullable: true })
  ifscCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
