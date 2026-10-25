export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'action_required';

export type NotificationCategory = 'general' | 'middleman' | 'subscription' | 'followup' | 'system' | 'wallet_expiry';

export type NotificationBadgeType =
  | 'followup_due'
  | 'followup_overdue'
  | 'today_followups'
  | 'expiring_subscription'
  | 'new_middleman'
  | 'wallet_expired';

export interface NotificationActionTarget {
  section: string;
  modalType?: 'middleman_client_profile' | 'middleman_deal_details' | 'subscription_details' | 'subscription_renew' | 'middleman_followups' | 'expired_balance_management';
  entityId?: string;
  entityName?: string;
  payload?: any;
}

export interface NotificationMetadata {
  category?: NotificationCategory;
  badgeType?: NotificationBadgeType;
  badgeLabel?: string;
  entityId?: string;
  middlemanId?: string;
  dealId?: string;
  subscriptionId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  actionTarget?: NotificationActionTarget;
  isDismissible?: boolean;
  walletId?: string;
  [key: string]: any;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  linkSection?: string;
  isRead: boolean;
  timestamp: string;
  metadata?: NotificationMetadata;
}

export interface HistoryAction {
  id: string;
  description: string;
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
  timestamp: string;
}

export interface SystemSettings {
  companyName: string;
  currency: string;
  currencySymbol: string;
  phone: string;
  address: string;
  taxRate: number;
  cashbackPercentage: number;
  referralBonusAmount: number;
  autoArchiveDays: number;
  enableAuditLog: boolean;
  vaultInitialBalance: number;
  systemVersion: string;
}
