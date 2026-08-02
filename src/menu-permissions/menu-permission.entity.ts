import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../users/user-role.enum';

// Which menu items are visible to which role — admin-editable via the
// Settings screen (GET/PATCH /menu-permissions); every logged-in user's
// frontend nav reads its own visibility via GET /menu-permissions/mine.
@Entity('menu_permissions')
@Unique(['menuKey', 'role'])
export class MenuPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  menuKey: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ default: true })
  visible: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
