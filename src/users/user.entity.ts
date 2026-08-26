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
// login table. One login can hold more than one role (e.g. the same person
// is both an investor and a return party): roles is INVESTOR and/or
// RETURN_PARTY and/or ADMIN. investorId links to the investor's own data
// when INVESTOR is one of the roles; returnPartyId links to the return
// party's own data when RETURN_PARTY is one of the roles; both stay null
// for a pure ADMIN.
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

  @Column({ name: 'role', type: 'simple-array' })
  roles: UserRole[];

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
