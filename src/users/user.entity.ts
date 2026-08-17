import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Investor } from '../investors/investor.entity';
import { ReturnParty } from '../return-parties/return-party.entity';
import { UserRole } from './user-role.enum';

// Login account for the app. Kept separate from Investor/ReturnParty (pure
// KYC/business data with no login concept of its own) so admins — who have
// no Investor/ReturnParty record — and investors/return parties share one
// login table. When role is INVESTOR, investorId links to the investor's
// own data; when role is RETURN_PARTY, returnPartyId links to the return
// party's own data; both stay null for ADMIN.
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  email: string | null;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'int', nullable: true, unique: true })
  investorId: number | null;

  @ManyToOne(() => Investor, { nullable: true })
  @JoinColumn({ name: 'investorId' })
  investor: Investor | null;

  @Column({ type: 'int', nullable: true, unique: true })
  returnPartyId: number | null;

  @ManyToOne(() => ReturnParty, { nullable: true })
  @JoinColumn({ name: 'returnPartyId' })
  returnParty: ReturnParty | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
