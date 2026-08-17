import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LoanType } from '../loan-types/loan-type.entity';

export const LoanStatus = {
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
} as const;
export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

// A loan the business has taken FROM a lender (bank, gold-loan provider,
// credit card, OD facility, etc.) — the business itself is the borrower;
// name/phone/PAN/Aadhaar/bankName here identify the lender. Lender details
// are kept flat on the loan itself (not a separate reusable entity) — if
// the same lender extends another loan, it's a new row.
//
// isInterestOnly decides which repayment fields apply — the two modes
// are mutually exclusive, not just a display toggle:
//  - true ("Monthly Interest"): interestPercent and interestAmount apply
//    — the rate and the actual monthly interest amount as agreed with
//    the lender (interestAmount is entered directly, not calculated from
//    principalOutstanding × interestPercent). Principal stays put until
//    manually reduced/closed. totalEmis/installmentAmount are irrelevant
//    and left null.
//  - false ("Installment"): totalEmis (how many installments) and
//    installmentAmount (the fixed amount per installment) apply instead
//    — both entered directly. interestPercent/interestAmount are
//    irrelevant and left null.
//
// principalOutstanding starts equal to loanAmount and is edited directly
// as repayments are made — there's no separate payment ledger.
// endDate is derived from startDate + totalEmis months whenever either
// changes, mirroring how Investment.endDate is derived.
@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  pan: string;

  @Column({ nullable: true })
  aadhaar: string;

  @Column({ nullable: true })
  loanTypeId: number;

  @ManyToOne(() => LoanType, { nullable: true, eager: true })
  @JoinColumn({ name: 'loanTypeId' })
  loanType: LoanType | null;

  @Column({ nullable: true })
  bankName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  loanAmount: number;

  // Only set when isInterestOnly is true.
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  interestPercent: number | null;

  // Only set when isInterestOnly is true — the actual monthly interest
  // amount as agreed with the lender (not calculated from
  // principalOutstanding/interestPercent).
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  interestAmount: number | null;

  @Column({ default: false })
  isInterestOnly: boolean;

  // Only set when isInterestOnly is false. Tenure in months — also
  // drives endDate.
  @Column({ type: 'int', nullable: true })
  totalEmis: number | null;

  // Only set when isInterestOnly is false — the fixed amount paid per
  // installment, as agreed with the lender (not calculated from
  // loanAmount/interestPercent).
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  installmentAmount: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  principalOutstanding: number;

  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({
    type: 'enum',
    enum: LoanStatus,
    default: LoanStatus.ACTIVE,
  })
  status: LoanStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
