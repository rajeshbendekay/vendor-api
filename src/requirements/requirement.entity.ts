import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RequirementStatus } from '../common/enums';
import { Client } from '../clients/client.entity';
import { RequirementItem } from './requirement-item.entity';
import { Quotation } from '../quotations/quotation.entity';

@Entity('requirements')
export class Requirement {
  @PrimaryGeneratedColumn()
  id: number;

  // Human-friendly reference, e.g. REQ-2026-0001
  @Column({ nullable: true })
  referenceNo: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  clientId: number;

  @ManyToOne(() => Client, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({
    type: 'varchar',
    default: RequirementStatus.NEW,
  })
  status: RequirementStatus;

  @OneToMany(() => RequirementItem, (item) => item.requirement, {
    cascade: true,
    eager: true,
  })
  items: RequirementItem[];

  @OneToMany(() => Quotation, (q) => q.requirement)
  quotations: Quotation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
