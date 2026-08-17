import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Return party profile — the reusable KYC/bank details for a person or
// partner who receives returns. Actual payouts are tracked separately as
// one-to-many Return records (see ../returns/return.entity.ts), since the
// same party can be party to multiple returns under different terms.
@Entity('return_parties')
export class ReturnParty {
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
