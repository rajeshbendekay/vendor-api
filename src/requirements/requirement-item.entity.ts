import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RequirementItemStatus, ServiceType } from '../common/enums';
import { Requirement } from './requirement.entity';
import { Vendor } from '../vendors/vendor.entity';

// A single physical activity within a requirement. Each item can be handed to a
// different vendor (e.g. design -> Vendor A, printing -> Vendor B) or all to one.
@Entity('requirement_items')
export class RequirementItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  requirementId: number;

  @ManyToOne(() => Requirement, (r) => r.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requirementId' })
  requirement: Requirement;

  @Column({ type: 'varchar', default: ServiceType.OTHER })
  serviceType: ServiceType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 1 })
  quantity: number;

  @Column({ nullable: true })
  unit: string; // e.g. sqft, piece

  @Column({ nullable: true })
  assignedVendorId: number;

  @ManyToOne(() => Vendor, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedVendorId' })
  assignedVendor: Vendor;

  // What the vendor charges us (per the assignment).
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  vendorCost: number;

  // Our extra margin added on top of the vendor cost for this item.
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  markup: number;

  @Column({ type: 'varchar', default: RequirementItemStatus.PENDING })
  status: RequirementItemStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
