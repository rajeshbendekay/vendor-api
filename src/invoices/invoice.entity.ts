import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoiceStatus } from '../common/enums';
import { Client } from '../clients/client.entity';
import { Requirement } from '../requirements/requirement.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  invoiceNo: string;

  @Column()
  requirementId: number;

  @ManyToOne(() => Requirement, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requirementId' })
  requirement: Requirement;

  @Column({ nullable: true })
  quotationId: number;

  @Column()
  clientId: number;

  @ManyToOne(() => Client, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  // Client's purchase order reference (they raise the PO on acceptance).
  @Column({ nullable: true })
  clientPoNumber: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number; // pre-tax, the accepted client amount

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 18 })
  taxPercent: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'varchar', default: InvoiceStatus.RAISED })
  status: InvoiceStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
