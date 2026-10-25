export type AuditAction =
  | 'add'
  | 'edit'
  | 'delete'
  | 'archive'
  | 'restore'
  | 'login'
  | 'logout'
  | 'price_change'
  | 'setting_change'
  | 'ticket_open'
  | 'ticket_close'
  | 'export'
  | 'print'
  | 'backup'
  | 'restore_backup'
  | 'vault_transaction'
  | 'vault_exchange'
  | 'settlement_close'
  | 'warning'
  | 'cancel'
  | 'demote';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  department: string;
  actionType: AuditAction;
  entityType: string;
  entityId: string;
  entityTitle: string;
  details: string;
  previousState?: any;
  newState?: any;
  timestamp: string;
}
