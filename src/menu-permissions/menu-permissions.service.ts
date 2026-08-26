import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MenuPermission } from './menu-permission.entity';
import { UserRole } from '../users/user-role.enum';
import { DEFAULT_VISIBILITY, MENU_KEYS, MENU_LABELS } from './menu-keys';
import { MenuPermissionEntryDto } from './dto';

@Injectable()
export class MenuPermissionsService {
  constructor(
    @InjectRepository(MenuPermission)
    private readonly repo: Repository<MenuPermission>,
  ) {}

  async seedDefaults() {
    const existing = await this.repo.find();
    const existingKeys = new Set(existing.map((e) => `${e.menuKey}:${e.role}`));
    const toInsert: Partial<MenuPermission>[] = [];
    for (const menuKey of MENU_KEYS) {
      for (const role of Object.values(UserRole)) {
        if (!existingKeys.has(`${menuKey}:${role}`)) {
          toInsert.push({ menuKey, role, visible: DEFAULT_VISIBILITY[menuKey][role] });
        }
      }
    }
    if (toInsert.length > 0) await this.repo.save(toInsert);
  }

  // Grid shape for the admin settings screen: one row per menuKey with a
  // visibility boolean per role.
  async findGrid() {
    const rows = await this.repo.find();
    return MENU_KEYS.map((menuKey) => {
      const forKey = rows.filter((r) => r.menuKey === menuKey);
      const entry: Record<string, unknown> = { menuKey, label: MENU_LABELS[menuKey] };
      for (const role of Object.values(UserRole)) {
        entry[role] = forKey.find((r) => r.role === role)?.visible ?? false;
      }
      return entry;
    });
  }

  async updateGrid(entries: MenuPermissionEntryDto[]) {
    for (const entry of entries) {
      let row = await this.repo.findOne({
        where: { menuKey: entry.menuKey, role: entry.role },
      });
      if (!row) {
        row = this.repo.create({
          menuKey: entry.menuKey,
          role: entry.role,
          visible: entry.visible,
        });
      } else {
        row.visible = entry.visible;
      }
      await this.repo.save(row);
    }
    return this.findGrid();
  }

  // Unions visibility across every role the caller holds, so a user with
  // more than one role (e.g. both INVESTOR and RETURN_PARTY) sees the nav
  // items for all of them.
  async findMine(roles: UserRole[]) {
    const rows = await this.repo.find({ where: { role: In(roles), visible: true } });
    return [...new Set(rows.map((r) => r.menuKey))];
  }
}
