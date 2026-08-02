import { UserRole } from '../users/user-role.enum';

// Fixed set of menu/feature keys the frontend nav can show. New menu items
// are code (a new route/feature), not admin-created data — admin only
// toggles visibility of this fixed list per role.
export const MENU_KEYS = [
  'dashboard',
  'requirements',
  'clients',
  'vendors',
  'invoices',
  'investors',
  'investments',
  'investor-types',
  'my-investments',
  'settings',
  'users',
] as const;

export type MenuKey = (typeof MENU_KEYS)[number];

export const MENU_LABELS: Record<MenuKey, string> = {
  dashboard: 'Dashboard',
  requirements: 'Requirements',
  clients: 'Clients',
  vendors: 'Vendors',
  invoices: 'Invoices',
  investors: 'Investors',
  investments: 'Investments',
  'investor-types': 'Investor Types',
  'my-investments': 'My Investments',
  settings: 'Menu Settings',
  users: 'Users',
};

// First-boot defaults: admin sees the full admin console, investors only
// see their own investment view. Admin can change any of this afterward
// via the Settings screen.
export const DEFAULT_VISIBILITY: Record<MenuKey, Record<UserRole, boolean>> = {
  dashboard: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false },
  requirements: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false },
  clients: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false },
  vendors: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false },
  invoices: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false },
  investors: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false },
  investments: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false },
  'investor-types': { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false },
  'my-investments': { [UserRole.ADMIN]: false, [UserRole.INVESTOR]: true },
  settings: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false },
  users: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false },
};
