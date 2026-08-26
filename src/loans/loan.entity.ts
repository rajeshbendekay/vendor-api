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
import { User } from '../users/user.entity';

export const LoanStatus = {
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
} as const;
export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

// A loan the business has taken FROM a lender (bank, gold-loan provider,
// credit card, OD facility, etc.) — the business itself is the borrower.
// lenderId points at a User with the LENDER role (onboarded via the Users
// screen) — the same lender can be reused across multiple loans. The rest
// of the identity-ish fields (phone/PAN/Aadhaar/bankName) stay flat on the
// loan itself, independent of the lender's own User record.
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
// principalOutstanding starts equal to loanAmount and is drawn down by
// REPAYMENT transactions (see loan-transaction.entity.ts) — mirrors
// Investment.investmentAmount. interestOutstanding starts at 0 and is
// built up by automatic monthly INTEREST_ACCRUAL transactions (interest-
// only loans only — see LoansService.syncAccruals) and drawn down by
// REPAYMENT transactions the same way. Both are real running balances now,
// not admin-edited directly.
// endDate is derived from startDate + totalEmis months whenever either
// changes, mirroring how Investment.endDate is derived.
@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  lenderId: number;

  // Not eager — LoansService explicitly loads this relation and strips
  // passwordHash before returning, so a plain `find()` here can never leak
  // a login's password hash into a loan response.
  @ManyToOne(() => User)
  @JoinColumn({ name: 'lenderId' })
  lender: User;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

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

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  interestOutstanding: number;

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
