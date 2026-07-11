import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceType } from '../common/enums';
import { Quotation } from './quotation.entity';

// Frozen line in a quotation revision. We store the vendor breakdown internally
// but only `clientPrice` is ever exposed to the client.
@Entity('quotation_items')
export class QuotationItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  quotationId: number;

  @ManyToOne(() => Quotation, (q) => q.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotationId' })
  quotation: Quotation;

  @Column({ type: 'varchar', default: ServiceType.OTHER })
  serviceType: ServiceType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 1 })
  quantity: number;

  // Internal only.
  @Column({ nullable: true })
  vendorName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  vendorCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  markup: number;

  // Client-facing price for this line = vendorCost + markup.
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  clientPrice: number;
}
