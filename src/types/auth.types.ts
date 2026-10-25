export type Role = 'admin' | 'employee';

export type Department = 'customers' | 'dealers' | 'merchants' | 'brokerage' | 'subscriptions' | 'finance';

export type Permission =
  | 'view'
  | 'add'
  | 'edit'
  | 'delete'
  | 'print'
  | 'export'
  | 'manage_users'
  | 'manage_finance'
  | 'close_shift'
  | 'manage_settings'
  | 'view_competitions'
  | 'create_competition'
  | 'edit_competition'
  | 'delete_competition'
  | 'manage_participants'
  | 'verify_participants'
  | 'run_draw'
  | 'select_winners'
  | 'view_rewards'
  | 'deliver_rewards'
  | 'cancel_rewards'
  | 'view_competition_finance'
  | 'export_competition_reports';

export interface User {
  id: string;
  username: string;
  fullName: string;
  password?: string;
  role: Role;
  department?: Department;
  jobTitle: string;
  isActive: boolean;
  permissions: Permission[];
  lastLogin?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  activeDepartment: Department | 'all' | null;
}
