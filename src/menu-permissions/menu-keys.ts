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
  'return-parties',
  'returns',
  'return-types',
  'my-returns',
  'loans',
  'loan-types',
  'expenses',
  'expense-types',
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
  'return-parties': 'Return Parties',
  returns: 'Returns',
  'return-types': 'Return Types',
  'my-returns': 'My Returns',
  loans: 'Loans',
  'loan-types': 'Loan Types',
  expenses: 'Expenses',
  'expense-types': 'Expense Types',
  settings: 'Menu Settings',
  users: 'Users',
};

// First-boot defaults: admin sees the full admin console, investors only
// see their own investment view, return parties only see their own return
// view. Admin can change any of this afterward via the Settings screen.
export const DEFAULT_VISIBILITY: Record<MenuKey, Record<UserRole, boolean>> = {
  dashboard: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  requirements: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  clients: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  vendors: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  invoices: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  investors: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  investments: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  'investor-types': { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  'my-investments': { [UserRole.ADMIN]: false, [UserRole.INVESTOR]: true, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  'return-parties': { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  returns: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  'return-types': { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  'my-returns': { [UserRole.ADMIN]: false, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: true, [UserRole.LENDER]: false },
  loans: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  'loan-types': { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  expenses: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  'expense-types': { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  settings: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
  users: { [UserRole.ADMIN]: true, [UserRole.INVESTOR]: false, [UserRole.RETURN_PARTY]: false, [UserRole.LENDER]: false },
};
