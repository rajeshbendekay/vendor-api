import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuotationStatus } from '../common/enums';
import { Requirement } from '../requirements/requirement.entity';
import { QuotationItem } from './quotation-item.entity';

// A snapshot of pricing shared with the client. Each negotiation round creates a
// new revision so we keep the full history of the back-and-forth.
@Entity('quotations')
export class Quotation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  requirementId: number;

  @ManyToOne(() => Requirement, (r) => r.quotations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requirementId' })
  requirement: Requirement;

  @Column({ default: 1 })
  revision: number;

  @Column({ type: 'varchar', default: QuotationStatus.DRAFT })
  status: QuotationStatus;

  // Internal figure: what all vendors charge us in total (never shown to client).
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalVendorCost: number;

  // Internal figure: total margin we add.
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalMarkup: number;

  // Client-facing total = totalVendorCost + totalMarkup.
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalClientAmount: number;

  // Note from the client when they request a revision (negotiation).
  @Column({ type: 'text', nullable: true })
  clientNote: string;

  // Our internal note for this revision.
  @Column({ type: 'text', nullable: true })
  internalNote: string;

  @OneToMany(() => QuotationItem, (item) => item.quotation, {
    cascade: true,
    eager: true,
  })
  items: QuotationItem[];

  @CreateDateColumn()
  createdAt: Date;
}
