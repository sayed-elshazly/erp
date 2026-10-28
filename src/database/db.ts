import { getDaysInMonth, calculateDailyRate, isStoreWalletTxPositive } from '../utils/formatters';
import { supabaseStorage } from './supabaseStorage';
import {
  initialCustomers,
  initialNotes,
  initialTickets,
  initialReferrals,
  initialUnifiedWalletTransactions,
  initialCustomerTransactions,
  initialSafeTransactions,
  initialExpenses,
  initialDebts,
  initialSettlements,
  initialAttendance,
  initialSalaries,
  initialEmployees,
  initialUsers,
  initialAuditLogs,
  initialNotifications,
  initialSettings
} from './seedData';
import {
  initialMerchantsSeed,
  initialMerchantInvoicesSeed,
  initialMerchantRemindersSeed,
  initialMerchantTransactionsSeed,
  initialMerchantProductRulesSeed,
  initialMerchantNotesSeed,
  initialMerchantFilesSeed
} from './seedMerchants';
import {
  initialExchangeRate,
  initialStoreWallets,
  initialStoreWalletTransactions,
  initialGamesTree,
  initialFirstShippingGameTree,
  initialDepositBondsFIFO,
  initialCoupons,
  initialSystemCodes,
  initialCustomerModuleSettings
} from './seedTopUp';
import {
  Customer,
  CustomerNote,
  CustomerTicket,
  CustomerReferral,
  UnifiedWalletTransaction,
  CustomerTransaction,
  TicketLifecycleStatus,
  TicketHistoryLogItem,
  TicketNoteItem,
  BreakageRecord,
  ExtensionRecord
} from '../types/customer.types';
import { ProfileStatisticsService } from '../services/customer/profileStatisticsService';
import { PartnerPerformanceService } from '../services/customer/partnerPerformanceService';
import {
  initialDealerModuleSettings,
  initialDealers,
  initialDealerNotes,
  initialDealerReferrals,
  initialDealerTransactions
} from './seedDealers';
import {
  Dealer,
  DealerNote,
  DealerReferral,
  DealerModuleSettings,
  DealerProfileType,
  DealerPricingAuditLog
} from '../types/dealer.types';
import { DealerStatisticsService } from '../services/dealer/dealerStatisticsService';
import { DealerPerformanceService } from '../services/dealer/dealerPerformanceService';
import {
  Merchant,
  MerchantInvoice,
  MerchantReminder,
  MerchantTransaction,
  MerchantProductRule,
  MerchantNote,
  MerchantFile,
  MerchantPerformance,
  TrustScoreData,
  TrustTier
} from '../types/merchant.types';
import {
  GameTreeItem,
  GameProduct,
  GameSection,
  GameGroup,
  StoreWallet,
  StoreWalletTransaction,
  StoreWalletType,
  StoreWalletTransactionSourceType,
  DepositBondFIFO,
  FIFOLotItem,
  ProductWalletSource,
  ConsumedWalletRecord,
  ProductCopyTemplate,
  WalletPriorityItem,
  Coupon,
  CouponUsageRecord,
  DailyExchangeRate,
  RateHistoryItem,
  SystemCodeItem,
  CustomerModuleSettings,
  WalletNumberItem,
  MarketingCopySettings,
  GameCopySettings
} from '../types/topup.types';
import { JKRWalletEngine } from '../services/financial/jkrWalletEngine';
import {
  SafeTransaction,
  Expense,
  Debt,
  DebtInstallment,
  ShiftSettlement,
  ShiftDeficitItem,
  AttendanceRecord,
  SalarySlip,
  Employee,
  DailyClosureReport,
  EmployeeAdvance,
  EmployeeAdvanceRepayment,
  EmployeeIncentive,
  EmployeeAttachment,
  FinanceMetrics,
  DepartmentFinancialBreakdown,
  UnifiedFinanceFilter,
  UnifiedFinancialTransaction,
  UnifiedFinanceDatePreset,
  UnifiedFinanceDepartment,
  UnifiedFinanceTxType,
  BalanceWithdrawal,
  BalanceWithdrawalItem
} from '../types/finance.types';
import { User } from '../types/auth.types';
import { AuditLog, AuditAction } from '../types/audit.types';
import { SystemSettings, NotificationItem } from '../types/common.types';
import { eventBus, SYSTEM_EVENTS } from '../services/eventBus';
import { PricingEngine } from '../services/pricing/pricingEngine';
import { normalizePhoneNumber, isSamePhoneNumber } from '../utils/phoneUtils';
import {
  initialMiddlemanDeals,
  initialMiddlemanAccounts,
  initialMiddlemanNotifications,
  initialMiddlemanModuleSettings,
  initialBrokerageClients
} from './seedMiddleman';
import {
  MiddlemanDeal,
  MiddlemanDealStatus,
  GameAccountAsset,
  MiddlemanNotificationItem,
  MiddlemanModuleSettings,
  MiddlemanDashboardMetrics,
  MiddlemanStatusHistoryItem,
  MiddlemanNote,
  MiddlemanAttachment,
  AccountSaleRecord,
  AccountAssetStatus,
  MiddlemanFollowup
} from '../types/middleman.types';
import {
  initialSubscriptionPlans,
  initialCustomerSubscriptions,
  initialSubscriptionPayments,
  initialSubscriptionSettings,
  initialSubscriptionClients
} from './seedSubscriptions';
import {
  SubscriptionPlan,
  CustomerSubscription,
  SubscriptionPayment,
  SubscriptionModuleSettings,
  SubscriptionNotification,
  SubscriptionDashboardMetrics,
  SubscriptionStatus,
  SubscriptionPaymentMethod,
  SubscriptionTimelineEvent,
  SubscriptionAttachment,
  SubscriptionNote,
  PriceHistoryItem,
  SavedFilterPreset,
  NotificationRetryItem,
  SchedulerMonitorStatus,
  ReceiptTemplateType,
  CurrencyType
} from '../types/subscription.types';
import { CompetitionService } from '../services/competitions/competitionService';
import {
  Competition,
  CompetitionParticipant,
  CompetitionReward,
  CompetitionsDashboardKPIs
} from '../types/competition.types';

export const STORAGE_KEYS = {
  SETTINGS: 'nzm_jkr_settings',
  USERS: 'nzm_jkr_users',
  CUSTOMERS: 'nzm_jkr_customers',
  CUSTOMERS_RETAIL: 'nzm_jkr_customers_retail',
  CUSTOMERS_TRADERS: 'nzm_jkr_customers_traders',
  CUSTOMERS_BROKERAGE: 'nzm_jkr_customers_brokerage',
  CUSTOMERS_SUBSCRIPTIONS: 'nzm_jkr_customers_subscriptions',
  NOTES: 'nzm_jkr_notes',
  TICKETS: 'nzm_jkr_tickets',
  DELETED_TICKETS: 'nzm_jkr_deleted_tickets',
  REFERRALS: 'nzm_jkr_referrals',
  CASHBACK: 'nzm_jkr_cashback',
  CUSTOMER_TRANSACTIONS: 'nzm_jkr_cust_tx',
  SAFE_TRANSACTIONS: 'nzm_jkr_safe_tx',
  EXPENSES: 'nzm_jkr_expenses',
  DEBTS: 'nzm_jkr_debts',
  SETTLEMENTS: 'nzm_jkr_settlements',
  SHIFT_DEFICITS: 'nzm_jkr_shift_deficits',
  ATTENDANCE: 'nzm_jkr_attendance',
  SALARIES: 'nzm_jkr_salaries',
  EMPLOYEES: 'nzm_jkr_employees',
  AUDIT_LOGS: 'nzm_jkr_audit_logs',
  NOTIFICATIONS: 'nzm_jkr_notifications',
  DAILY_CLOSURES: 'nzm_jkr_daily_closures',
  BALANCE_WITHDRAWALS: 'nzm_jkr_balance_withdrawals',

  // Phase 2 Keys: Merchants & Suppliers
  MERCHANTS: 'nzm_jkr_merchants',
  MERCHANT_INVOICES: 'nzm_jkr_merchant_invoices',
  MERCHANT_REMINDERS: 'nzm_jkr_merchant_reminders',
  MERCHANT_TRANSACTIONS: 'nzm_jkr_merchant_transactions',
  MERCHANT_PRODUCT_RULES: 'nzm_jkr_merchant_product_rules',
  MERCHANT_NOTES: 'nzm_jkr_merchant_notes',
  MERCHANT_FILES: 'nzm_jkr_merchant_files',

  // Dealers Keys
  DEALERS: 'nzm_jkr_dealers',
  DEALER_NOTES: 'nzm_jkr_dealer_notes',
  DEALER_TICKETS: 'nzm_jkr_dealer_tickets',
  DEALER_REFERRALS: 'nzm_jkr_dealer_referrals',
  DEALER_CASHBACK: 'nzm_jkr_dealer_cashback',
  DEALER_TRANSACTIONS: 'nzm_jkr_dealer_tx',
  DEALER_MODULE_SETTINGS: 'nzm_jkr_dealer_module_settings',
  DEALER_PRICING_AUDIT_LOGS: 'nzm_jkr_dealer_pricing_audit_logs',

  // Dealers / Merchants Finance Isolated Keys
  DEALER_SAFE_TRANSACTIONS: 'nzm_jkr_dealer_safe_tx',
  DEALER_WALLETS: 'nzm_jkr_dealer_wallets',
  DEALER_WALLET_TRANSACTIONS: 'nzm_jkr_dealer_wallet_tx',
  DEALER_EXPENSES: 'nzm_jkr_dealer_expenses',
  DEALER_DEBTS: 'nzm_jkr_dealer_debts',
  DEALER_SETTLEMENTS: 'nzm_jkr_dealer_settlements',
  DEALER_SHIFT_DEFICITS: 'nzm_jkr_dealer_shift_deficits',
  DEALER_ATTENDANCE: 'nzm_jkr_dealer_attendance',
  DEALER_SALARIES: 'nzm_jkr_dealer_salaries',
  DEALER_EMPLOYEES: 'nzm_jkr_dealer_employees',
  DEALER_DAILY_CLOSURES: 'nzm_jkr_dealer_daily_closures',
  DEALER_BALANCE_WITHDRAWALS: 'nzm_jkr_dealer_balance_withdrawals',

  // Top-Up Catalog & Wallets Keys
  EXCHANGE_RATE: 'nzm_jkr_exchange_rate',
  STORE_WALLETS: 'nzm_jkr_store_wallets',
  STORE_WALLET_TRANSACTIONS: 'nzm_jkr_store_wallet_transactions',
  GAMES_TREE: 'nzm_jkr_games_tree',
  FIRST_SHIPPING_GAME_TREE: 'nzm_jkr_first_shipping_game_tree',
  DEPOSIT_BONDS_FIFO: 'nzm_jkr_deposit_bonds_fifo',
  COUPONS: 'nzm_jkr_coupons',
  SYSTEM_CODES: 'nzm_jkr_system_codes',
  CUSTOMER_MODULE_SETTINGS: 'nzm_jkr_customer_module_settings',
  COPY_TEMPLATES: 'nzm_jkr_copy_templates',
  MARKETING_COPY_SETTINGS: 'nzm_jkr_marketing_copy_settings',
  GAME_COPY_SETTINGS: 'nzm_jkr_game_copy_settings',

  // Middleman System Keys (V1.0)
  MIDDLEMAN_DEALS: 'nzm_jkr_middleman_deals',
  MIDDLEMAN_ACCOUNTS: 'nzm_jkr_middleman_accounts',
  MIDDLEMAN_NOTIFICATIONS: 'nzm_jkr_middleman_notifications',
  MIDDLEMAN_FOLLOWUPS: 'nzm_jkr_middleman_followups',
  MIDDLEMAN_SETTINGS: 'nzm_jkr_middleman_settings',

  // Subscriptions System Keys (Enterprise 21 Features)
  SUBSCRIPTION_PLANS: 'nzm_jkr_subscription_plans',
  SUBSCRIPTIONS: 'nzm_jkr_subscriptions',
  SUBSCRIPTION_PAYMENTS: 'nzm_jkr_subscription_payments',
  SUBSCRIPTION_NOTIFICATIONS: 'nzm_jkr_subscription_notifications',
  SUBSCRIPTION_SETTINGS: 'nzm_jkr_subscription_settings',
  SUBSCRIPTION_SAVED_FILTERS: 'nzm_jkr_subscription_saved_filters',
  SUBSCRIPTION_RETRY_QUEUE: 'nzm_jkr_subscription_retry_queue',
  SUBSCRIPTION_SCHEDULER: 'nzm_jkr_subscription_scheduler',
  SUBSCRIPTION_FAVORITE_REPORTS: 'nzm_jkr_subscription_fav_reports',

  // Expiration & Breakage Management (Modification #6)
  BREAKAGE_RECORDS: 'nzm_jkr_breakage_records',
  EXTENSION_RECORDS: 'nzm_jkr_extension_records',

  // Competitions & Rewards Keys
  COMPETITIONS: 'nzm_jkr_competitions',
  COMPETITION_PARTICIPANTS: 'nzm_jkr_competition_participants',
  COMPETITION_REWARDS: 'nzm_jkr_competition_rewards',
  COMPETITION_DRAWS: 'nzm_jkr_competition_draws',
  COMPETITIONS_INITIALIZED: 'nzm_jkr_competitions_initialized',

  // Marketing & Campaigns Keys
  MARKETING_CAMPAIGNS: 'nzm_jkr_marketing_campaigns_v1',
  TICKET_CAMPAIGN_LINKS: 'nzm_jkr_ticket_campaign_links_v1',

  // Additional Filter Presets & Audit Keys
  CUSTOMER_FILTER_PRESETS: 'nzm_jkr_customer_filter_presets',
  SUBSCRIPTION_REPORT_PRESETS: 'nzm_jkr_subscription_report_presets',
  DEPOSIT_MESSAGE_TEMPLATES: 'nzm_jkr_deposit_message_templates',
  PRICING_AUDIT_LOGS: 'nzm_jkr_pricing_audit_logs',
  CUSTOMER_NOTES_LEGACY: 'nzm_jkr_customer_notes'
};

class LocalDatabase {
  private inFlightRefunds = new Set<string>();
  private inFlightTransfers = new Set<string>();

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      return supabaseStorage.getItem(key, defaultValue);
    } catch (e) {
      console.error(`Error reading ${key} from storage`, e);
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): boolean {
    try {
      return supabaseStorage.setItem(key, value);
    } catch (e) {
      console.error(`Error saving ${key} to storage (Storage Quota or Access Error):`, e);
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('storage_write_error', { detail: { key, error: e } }));
        }
        eventBus.publish('STORAGE_ERROR', { key, error: e });
      } catch (errPublish) {}
      return false;
    }
  }

  // Initialization
  public initialize(): void {
    if (!this.getItem<any>(STORAGE_KEYS.SETTINGS, null)) {
      this.setItem(STORAGE_KEYS.SETTINGS, initialSettings);
      this.setItem(STORAGE_KEYS.USERS, initialUsers);
      this.setItem(STORAGE_KEYS.CUSTOMERS, initialCustomers);
      this.setItem(STORAGE_KEYS.NOTES, initialNotes);
      this.setItem(STORAGE_KEYS.TICKETS, initialTickets);
      this.setItem(STORAGE_KEYS.REFERRALS, initialReferrals);
      this.setItem(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
      this.setItem(STORAGE_KEYS.CUSTOMER_TRANSACTIONS, initialCustomerTransactions);
      this.setItem(STORAGE_KEYS.SAFE_TRANSACTIONS, initialSafeTransactions);
      this.setItem(STORAGE_KEYS.EXPENSES, initialExpenses);
      this.setItem(STORAGE_KEYS.DEBTS, initialDebts);
      this.setItem(STORAGE_KEYS.SETTLEMENTS, initialSettlements);
      this.setItem(STORAGE_KEYS.ATTENDANCE, initialAttendance);
      this.setItem(STORAGE_KEYS.SALARIES, initialSalaries);
      this.setItem(STORAGE_KEYS.EMPLOYEES, initialEmployees);
      this.setItem(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
      this.setItem(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    }

    if (!this.getItem<any>(STORAGE_KEYS.USERS, null)) {
      this.setItem(STORAGE_KEYS.USERS, initialUsers);
    }

    // Initialize Phase 2 Merchants Seed if not already set
    if (!this.getItem<any>(STORAGE_KEYS.MERCHANTS, null)) {
      this.setItem(STORAGE_KEYS.MERCHANTS, initialMerchantsSeed);
      this.setItem(STORAGE_KEYS.MERCHANT_INVOICES, initialMerchantInvoicesSeed);
      this.setItem(STORAGE_KEYS.MERCHANT_REMINDERS, initialMerchantRemindersSeed);
      this.setItem(STORAGE_KEYS.MERCHANT_TRANSACTIONS, initialMerchantTransactionsSeed);
      this.setItem(STORAGE_KEYS.MERCHANT_PRODUCT_RULES, initialMerchantProductRulesSeed);
      this.setItem(STORAGE_KEYS.MERCHANT_NOTES, initialMerchantNotesSeed);
      this.setItem(STORAGE_KEYS.MERCHANT_FILES, initialMerchantFilesSeed);
    }

    // Initialize Top-Up Catalog & Wallets Seeds
    if (!this.getItem<any>(STORAGE_KEYS.EXCHANGE_RATE, null)) {
      this.setItem(STORAGE_KEYS.EXCHANGE_RATE, initialExchangeRate);
      this.setItem(STORAGE_KEYS.STORE_WALLETS, initialStoreWallets);
      this.setItem(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
      this.setItem(STORAGE_KEYS.GAMES_TREE, initialGamesTree);
      this.setItem(STORAGE_KEYS.DEPOSIT_BONDS_FIFO, initialDepositBondsFIFO);
      this.setItem(STORAGE_KEYS.COUPONS, initialCoupons);
      this.setItem(STORAGE_KEYS.SYSTEM_CODES, initialSystemCodes);
      this.setItem(STORAGE_KEYS.CUSTOMER_MODULE_SETTINGS, initialCustomerModuleSettings);
    }

    // Initialize Middleman System Seeds (V1.0)
    if (!this.getItem<any>(STORAGE_KEYS.MIDDLEMAN_DEALS, null)) {
      this.setItem(STORAGE_KEYS.MIDDLEMAN_DEALS, initialMiddlemanDeals);
      this.setItem(STORAGE_KEYS.MIDDLEMAN_ACCOUNTS, initialMiddlemanAccounts);
      this.setItem(STORAGE_KEYS.MIDDLEMAN_NOTIFICATIONS, initialMiddlemanNotifications);
      this.setItem(STORAGE_KEYS.MIDDLEMAN_SETTINGS, initialMiddlemanModuleSettings);
    }

    // Initialize Subscriptions Module Seeds (V1.0)
    if (!this.getItem<any>(STORAGE_KEYS.SUBSCRIPTION_PLANS, null)) {
      this.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, initialSubscriptionPlans);
      this.setItem(STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, initialSubscriptionPayments);
      this.setItem(STORAGE_KEYS.SUBSCRIPTION_SETTINGS, initialSubscriptionSettings);
    }

    // Initialize Wholesale Dealers Seeds
    if (!this.getItem<any>(STORAGE_KEYS.DEALERS, null)) {
      this.setItem(STORAGE_KEYS.DEALERS, initialDealers);
      this.setItem(STORAGE_KEYS.DEALER_NOTES, initialDealerNotes);
      this.setItem(STORAGE_KEYS.DEALER_REFERRALS, initialDealerReferrals);
      this.setItem(STORAGE_KEYS.DEALER_MODULE_SETTINGS, initialDealerModuleSettings);
      this.setItem(STORAGE_KEYS.DEALER_TRANSACTIONS, initialDealerTransactions);
    }

    // Initialize Dealers Finance Isolated Seeds
    if (!this.getItem<any>(STORAGE_KEYS.DEALER_SAFE_TRANSACTIONS, null)) {
      this.getDealerSafeTransactions();
      this.getDealerWallets();
      this.getDealerWalletTransactions();
      this.getDealerExpenses();
      this.getDealerDebts();
      this.getDealerEmployees();
      this.getDealerAttendance();
      this.getDealerSalaries();
    }

    // Clean up any historical duplicate wallet & profit transactions
    this.cleanupDuplicateWalletTransactions();
    this.cleanupDuplicateProfitTransactions();

    // Automatically reconcile cashback for completed first_shipping tickets
    this.reconcileFirstShippingCompletedTickets();

    // Automatically reconcile Vault Balance to eliminate duplicate initial capital
    this.reconcileVaultInitialBalance();
  }

  public reconcileVaultInitialBalance(): void {
    try {
      const migrationKey = 'erp_vault_balance_reconciled_v1';
      if (!this.getItem<boolean>(migrationKey, false)) {
        const settings = this.getSettings();
        const safeTxs = this.getSafeTransactions();
        const hasSafe1 = safeTxs.some(t => t.id === 'safe_1' && t.category === 'capital' && t.amount === 25000);
        if (hasSafe1 && settings.vaultInitialBalance === 25000) {
          settings.vaultInitialBalance = 0;
          this.setItem(STORAGE_KEYS.SETTINGS, settings);
        }
        this.setItem(migrationKey, true);
      }
    } catch (_) {}
  }

  public async syncWithSupabase(): Promise<void> {
    await supabaseStorage.hydrateFromSupabase();
  }

  public clearLegacyStorage(): void {
    supabaseStorage.clearLegacyLocalStorage();
  }

  // Audit Logging
  public logAction(
    user: { id: string; name: string; role: string; department?: string },
    actionType: AuditAction,
    entityType: string,
    entityId: string,
    entityTitle: string,
    details: string,
    previousState?: any,
    newState?: any
  ): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      userId: user.id,
      userName: (user as any).fullName || user.name || (user as any).username || 'مستخدم',
      userRole: user.role,
      department: user.department || 'الإدارة العامة',
      actionType,
      entityType,
      entityId,
      entityTitle,
      details,
      previousState,
      newState,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 1000));
  }

  public addAuditLog(
    user: any,
    actionType: AuditAction,
    entityType: string,
    entityId: string,
    details: string,
    previousState?: any,
    newState?: any
  ): void {
    const u = {
      id: user?.id || 'usr_sys',
      name: user?.fullName || user?.username || user?.name || 'النظام',
      role: user?.role || 'staff',
      department: user?.department || 'المالية'
    };
    this.logAction(u, actionType, entityType, entityId, details, details, previousState, newState);
  }

  public getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
  }

  // System Settings
  public getSettings(): SystemSettings {
    return this.getItem<SystemSettings>(STORAGE_KEYS.SETTINGS, initialSettings);
  }

  public updateSettings(newSettings: Partial<SystemSettings>): SystemSettings {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    this.setItem(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }

  // Users
  public getUsers(): User[] {
    return this.getItem<User[]>(STORAGE_KEYS.USERS, initialUsers);
  }

  public getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    return this.getUsers().find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  }

  public saveUser(user: User, actor?: any): boolean {
    // 1. Privilege Escalation Guard: Non-admin can NEVER create or promote an admin account
    if (user.role === 'admin' && actor && actor.role !== 'admin') {
      this.logAction(
        actor,
        'edit',
        'مستخدم',
        user.id,
        'محاولة تصعيد صلاحيات مرفوضة (Privilege Escalation)',
        `المستخدم [${actor.fullName || actor.username}] حاول إنشاء أو ترقية مستخدم إلى رتبة مدير عام دون امتلاك صلاحية ذلك.`
      );
      return false;
    }

    // 2. User Management RBAC Guard
    if (actor && actor.role !== 'admin' && !actor.permissions?.includes('manage_users')) {
      this.logAction(
        actor,
        'edit',
        'مستخدم',
        user.id,
        'محاولة حفظ أو تعديل مستخدم مرفوضة (غير مصرح)',
        `المستخدم [${actor.fullName || actor.username}] حاول حفظ أو تعديل بيانات المستخدم [${user.fullName}] دون امتلاك صلاحية إدارة المستخدمين.`
      );
      return false;
    }

    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    this.setItem(STORAGE_KEYS.USERS, users);
    return true;
  }

  public deleteUser(userId: string, actor?: any): boolean {
    if (actor && actor.role !== 'admin' && !actor.permissions?.includes('manage_users')) {
      this.logAction(
        actor,
        'delete',
        'مستخدم',
        userId,
        'محاولة حذف مستخدم مرفوضة (غير مصرح)',
        `المستخدم [${actor.fullName || actor.username}] حاول حذف مستخدم دون امتلاك صلاحية إدارة المستخدمين.`
      );
      return false;
    }

    const users = this.getUsers().filter(u => u.id !== userId);
    this.setItem(STORAGE_KEYS.USERS, users);
    return true;
  }

  // Customers
  public getCustomers(includeArchived = false): Customer[] {
    const all = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const allUnifiedTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
    const allTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
    const dealerTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.DEALER_TICKETS, []);

    // Set of active, valid tickets (non-canceled, non-refunded)
    const activeTicketNumbers = new Set<string>();
    allTickets.forEach(t => {
      if (t.status !== 'canceled' && t.status !== 'refunded') {
        if (t.ticketNumber) activeTicketNumbers.add(t.ticketNumber);
        if (t.id) activeTicketNumbers.add(t.id);
      }
    });
    dealerTickets.forEach(t => {
      if (t.status !== 'canceled' && t.status !== 'refunded') {
        if (t.ticketNumber) activeTicketNumbers.add(t.ticketNumber);
        if (t.id) activeTicketNumbers.add(t.id);
      }
    });

    // Auto-heal: filter out orphan transactions tied to deleted / canceled tickets
    // Invariant: Non-ticket transactions (transfers CBT-, adjustments CBA-, withdrawals WD, lots, etc.) must NEVER be purged!
    const isTopUpTicketRef = (ref: string) => ref.startsWith('JKR-') || ref.startsWith('TKT-');
    const validUnifiedTxs = allUnifiedTxs.filter(tx => {
      if (!tx.orderNumber) return true;
      if (!isTopUpTicketRef(tx.orderNumber)) return true;
      return activeTicketNumbers.has(tx.orderNumber);
    });

    if (validUnifiedTxs.length !== allUnifiedTxs.length) {
      this.setItem(STORAGE_KEYS.CASHBACK, validUnifiedTxs);
    }

    let mutated = false;
    const synced = all.map(c => {
      // Reconcile referralWalletBalance with exact sum of ledger transactions
      const custRefTxs = validUnifiedTxs.filter(t => t.customerId === c.id && t.walletType === 'referral');
      if (custRefTxs.length > 0) {
        const calculatedRefBalance = Math.max(0, Math.round(custRefTxs.reduce((sum, tx) => {
          if (tx.type === 'commission' || tx.type === 'earned' || tx.type === 'credit') {
            return sum + (Number(tx.amount) || 0);
          } else {
            return sum - (Number(tx.amount) || 0);
          }
        }, 0) * 100) / 100);

        const totalEarned = Math.round(custRefTxs
          .filter(tx => tx.type === 'commission' || tx.type === 'earned')
          .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) * 100) / 100;

        if (c.referralWalletBalance !== calculatedRefBalance || c.totalReferralCommissionEarned !== totalEarned) {
          c.referralWalletBalance = calculatedRefBalance;
          c.totalReferralCommissionEarned = totalEarned;
          mutated = true;
        }
      } else if (
        allUnifiedTxs.some(t => t.customerId === c.id && t.walletType === 'referral') &&
        ((c.referralWalletBalance || 0) !== 0 || (c.totalReferralCommissionEarned || 0) !== 0)
      ) {
        c.referralWalletBalance = 0;
        c.totalReferralCommissionEarned = 0;
        mutated = true;
      }

      // Reconcile cashbackBalance & totalCashbackEarned with exact sum of ledger transactions
      const custCbTxs = validUnifiedTxs.filter(t => t.customerId === c.id && t.walletType === 'cashback');
      if (custCbTxs.length > 0) {
        const calculatedCbBalance = Math.max(0, Math.round(custCbTxs.reduce((sum, tx) => {
          if (tx.type === 'earned' || tx.type === 'credit' || tx.type === 'bonus' || (tx.type === 'adjustment' && (tx.amount || 0) > 0)) {
            return sum + (Number(tx.amount) || 0);
          } else {
            return sum - (Number(tx.amount) || 0);
          }
        }, 0) * 100) / 100);

        const totalCbEarned = Math.round(custCbTxs
          .filter(tx => tx.type === 'earned' || tx.type === 'credit' || tx.type === 'bonus' || (tx.type === 'adjustment' && (tx.amount || 0) > 0))
          .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) * 100) / 100;

        if (c.cashbackBalance !== calculatedCbBalance || c.totalCashbackEarned !== totalCbEarned) {
          c.cashbackBalance = calculatedCbBalance;
          c.totalCashbackEarned = totalCbEarned;
          mutated = true;
        }
      } else if (
        allUnifiedTxs.some(t => t.customerId === c.id && t.walletType === 'cashback') &&
        ((c.cashbackBalance || 0) !== 0 || (c.totalCashbackEarned || 0) !== 0)
      ) {
        c.cashbackBalance = 0;
        c.totalCashbackEarned = 0;
        mutated = true;
      }
      if (c.phone) {
        const norm = normalizePhoneNumber(c.phone);
        if (norm && norm !== c.phone) {
          c.phone = norm;
          mutated = true;
        }
      }
      if (c.lifetimeSpendingTier === undefined || c.totalSpentUSD === undefined) {
        return ProfileStatisticsService.applyMetrics(c, allTickets);
      }
      return c;
    });
    if (mutated) {
      this.setItem(STORAGE_KEYS.CUSTOMERS, synced);
    }
    return includeArchived ? synced : synced.filter(c => !c.isArchived);
  }

  public getArchivedCustomers(): Customer[] {
    const all = this.getCustomers(true);
    return all.filter(c => c.isArchived);
  }

  public getCustomerById(id: string): Customer | undefined {
    if (!id) return undefined;
    return this.getCustomers(true).find(c => c.id === id || c.code === id || isSamePhoneNumber(c.phone, id));
  }

  public isCustomerPhoneTaken(phone: string, excludeCustomerId?: string): boolean {
    if (!phone) return false;
    const norm = normalizePhoneNumber(phone);
    if (!norm) return false;
    return this.getCustomers(true).some(c => c.id !== excludeCustomerId && isSamePhoneNumber(c.phone, norm));
  }

  public findCustomerByPhone(phone: string): Customer | undefined {
    if (!phone) return undefined;
    return this.getCustomers(true).find(c => isSamePhoneNumber(c.phone, phone));
  }

  public saveCustomer(customer: Customer): void {
    const customers = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    if (!customer.id) {
      customer.id = 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    }

    // Normalize phone number to E.164 standard (+201xxxxxxxxx)
    if (customer.phone) {
      customer.phone = normalizePhoneNumber(customer.phone);
    }

    // Backend Unique Phone Validation: reject duplicate account creation
    if (customer.phone) {
      const duplicate = customers.find(c => c.id !== customer.id && isSamePhoneNumber(c.phone, customer.phone));
      if (duplicate) {
        throw new Error(
          `رقم الهاتف (${customer.phone}) مسجل بالفعل بحساب عميل آخر باسم "${duplicate.name}" (كود: ${duplicate.code || duplicate.id})`
        );
      }
    }

    // Regular customer referral commission is strictly 1.0% fixed for life
    if (customer.profileType === 'regular' || !customer.profileType) {
      customer.firstMonthCommissionRate = 1.0;
      customer.lifetimeCommissionRate = 1.0;
      customer.customCommissionRate = 1.0;
      customer.highCashbackRate = 1.0;
      customer.normalCashbackRate = 1.0;
    }

    const index = customers.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      customers[index] = { ...customer, updatedAt: new Date().toISOString() };
    } else {
      customers.unshift({
        ...customer,
        createdAt: customer.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
    }
  }

  public recalculateCustomerProfile(customerIdOrPhone: string): Customer | undefined {
    if (!customerIdOrPhone) return undefined;
    const customers = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const index = customers.findIndex(c => c.id === customerIdOrPhone || c.phone === customerIdOrPhone || (c.code && c.code === customerIdOrPhone));
    if (index < 0) return undefined;

    const allTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
    const updatedCustomer = ProfileStatisticsService.applyMetrics(customers[index], allTickets);

    // Synchronize and auto-heal cashback & referral ledger balances
    try {
      let allUnifiedTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
      let healedTxs = false;

      // Find completed tickets of this customer
      const targetPhone = updatedCustomer.phone ? updatedCustomer.phone.trim() : '';
      const custCompletedTickets = allTickets.filter(t => 
        (t.customerId === updatedCustomer.id || 
         (updatedCustomer.code && t.customerId === updatedCustomer.code) ||
         (targetPhone && t.customerPhone && isSamePhoneNumber(t.customerPhone, targetPhone))) &&
        t.status === 'completed'
      );

      for (const tkt of custCompletedTickets) {
        const ticketExpectedCb = Number(tkt.cashbackEarned || 0);
        if (ticketExpectedCb <= 0) continue;

        const ticketTxs = allUnifiedTxs.filter(t => 
          (t.customerId === updatedCustomer.id || (targetPhone && t.customerId === targetPhone)) &&
          t.orderNumber === tkt.ticketNumber &&
          t.walletType === 'cashback'
        );

        const creditedCb = Math.round(ticketTxs.reduce((sum, t) => {
          if (t.type === 'earned' || t.type === 'credit') return sum + (Number(t.amount) || 0);
          if (t.type === 'debit' || t.type === 'adjustment') return sum - (Number(t.amount) || 0);
          return sum;
        }, 0) * 100) / 100;

        const deltaCb = Math.round((ticketExpectedCb - creditedCb) * 100) / 100;
        if (deltaCb !== 0) {
          allUnifiedTxs.unshift({
            id: 'wtx_heal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            customerId: updatedCustomer.id,
            walletType: 'cashback',
            type: deltaCb > 0 ? 'earned' : 'debit',
            operationName: deltaCb > 0 
              ? `تسوية وتصحيح كاش باك لتذكرة #${tkt.ticketNumber} (+${deltaCb} ج)`
              : `تسوية وتصحيح كاش باك لتذكرة #${tkt.ticketNumber} (-${Math.abs(deltaCb)} ج)`,
            amount: Math.abs(deltaCb),
            balanceAfter: Math.max(0, Math.round(((updatedCustomer.cashbackBalance || 0) + deltaCb) * 100) / 100),
            orderNumber: tkt.ticketNumber,
            createdAt: new Date().toISOString()
          });
          if (deltaCb > 0) {
            this.creditCashbackToSystemWallet(deltaCb, updatedCustomer.name, tkt.ticketNumber);
          } else {
            this.debitCashbackFromSystemWallet(Math.abs(deltaCb), updatedCustomer.name, tkt.ticketNumber);
          }
          healedTxs = true;
        }
      }

      if (healedTxs) {
        this.setItem(STORAGE_KEYS.CASHBACK, allUnifiedTxs);
      }

      // Auto-heal and filter out orphan transactions tied to canceled tickets (preserving refunded and archived deleted tickets)
      const allTicketsList = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
      const allDealerTicketsList = this.getItem<CustomerTicket[]>(STORAGE_KEYS.DEALER_TICKETS, []);
      const deletedTicketsList = this.getItem<any[]>(STORAGE_KEYS.DELETED_TICKETS, []);
      const activeTktNums = new Set<string>();
      allTicketsList.forEach(t => {
        if (t.status !== 'canceled') {
          if (t.ticketNumber) activeTktNums.add(t.ticketNumber);
          if (t.id) activeTktNums.add(t.id);
        }
      });
      allDealerTicketsList.forEach(t => {
        if (t.status !== 'canceled') {
          if (t.ticketNumber) activeTktNums.add(t.ticketNumber);
          if (t.id) activeTktNums.add(t.id);
        }
      });
      deletedTicketsList.forEach(t => {
        if (t.ticketNumber) activeTktNums.add(t.ticketNumber);
        if (t.id) activeTktNums.add(t.id);
      });

      const validTxs = allUnifiedTxs.filter(tx => !tx.orderNumber || activeTktNums.has(tx.orderNumber));
      if (validTxs.length !== allUnifiedTxs.length) {
        allUnifiedTxs = validTxs;
        this.setItem(STORAGE_KEYS.CASHBACK, allUnifiedTxs);
      }

      // Re-sum accurate cashbackBalance directly from the unified ledger
      const custCbTxs = allUnifiedTxs.filter(t => 
        (t.customerId === updatedCustomer.id || (targetPhone && t.customerId === targetPhone)) && 
        t.walletType === 'cashback'
      );
      if (custCbTxs.length > 0) {
        const calcCb = Math.max(0, Math.round(custCbTxs.reduce((sum, t) => {
          if (t.type === 'earned' || t.type === 'credit') return sum + (Number(t.amount) || 0);
          return sum - (Number(t.amount) || 0);
        }, 0) * 100) / 100);
        const totalEarned = Math.round(custCbTxs
          .filter(t => t.type === 'earned' || t.type === 'credit')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) * 100) / 100;
        updatedCustomer.cashbackBalance = calcCb;
        updatedCustomer.totalCashbackEarned = totalEarned;
      } else {
        updatedCustomer.cashbackBalance = 0;
        updatedCustomer.totalCashbackEarned = 0;
      }

      // Re-sum referral wallet balance directly from ledger
      const custRefTxs = allUnifiedTxs.filter(t => 
        (t.customerId === updatedCustomer.id || (targetPhone && t.customerId === targetPhone)) && 
        t.walletType === 'referral'
      );
      if (custRefTxs.length > 0) {
        const calcRef = Math.max(0, Math.round(custRefTxs.reduce((sum, t) => {
          if (t.type === 'commission' || t.type === 'earned' || t.type === 'credit') return sum + (Number(t.amount) || 0);
          return sum - (Number(t.amount) || 0);
        }, 0) * 100) / 100);
        const totalRefEarned = Math.round(custRefTxs
          .filter(t => t.type === 'commission' || t.type === 'earned')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) * 100) / 100;
        updatedCustomer.referralWalletBalance = calcRef;
        updatedCustomer.totalReferralCommissionEarned = totalRefEarned;
      } else {
        updatedCustomer.referralWalletBalance = 0;
        updatedCustomer.totalReferralCommissionEarned = 0;
      }
    } catch (e) {
      console.warn('Error during customer ledger cashback recalculation:', e);
    }

    customers[index] = updatedCustomer;
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, updatedCustomer);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('unified_wallets_updated', { detail: { customerId: updatedCustomer.id } }));
    }
    return updatedCustomer;
  }

  public recalculateAllCustomerProfiles(): void {
    const customers = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const allTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
    const updated = customers.map(cust => ProfileStatisticsService.applyMetrics(cust, allTickets));
    this.setItem(STORAGE_KEYS.CUSTOMERS, updated);
  }

  public getRetailCustomers(includeArchived = false): Customer[] {
    return this.getCustomers(includeArchived);
  }

  // =============================================================
  // MIDDLEMAN / BROKERAGE CLIENTS (قاعدة عملاء الوساطة المستقلة)
  // =============================================================

  public getMiddlemanClients(includeArchived = false): Customer[] {
    const all = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS_BROKERAGE, initialBrokerageClients);
    return includeArchived ? all : all.filter(c => !c.isArchived);
  }

  public getMiddlemanClientById(id: string): Customer | undefined {
    return this.getMiddlemanClients(true).find(c => c.id === id || c.phone === id);
  }

  public saveMiddlemanClient(client: Customer, actor?: { id?: string; name?: string; role?: string }): Customer {
    const clients = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS_BROKERAGE, initialBrokerageClients);
    if (!client.id) {
      client.id = 'brk_cust_' + Date.now();
    }
    if (!client.code) {
      client.code = `BRK-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const index = clients.findIndex(c => c.id === client.id);
    let saved: Customer;
    if (index >= 0) {
      saved = { ...clients[index], ...client, updatedAt: new Date().toISOString() };
      clients[index] = saved;
    } else {
      saved = {
        ...client,
        createdAt: client.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      clients.unshift(saved);
    }
    this.setItem(STORAGE_KEYS.CUSTOMERS_BROKERAGE, clients);
    if (actor) {
      this.logAction(
        { id: actor.id || 'sys', name: actor.name || 'النظام', role: actor.role || 'admin', department: 'الوساطة' },
        index >= 0 ? 'edit' : 'add',
        'middleman_client',
        saved.id,
        saved.name,
        `حفظ عميل الوساطة: ${saved.name} (${saved.phone})`
      );
    }
    return saved;
  }

  public deleteMiddlemanClient(id: string, actor?: { id?: string; name?: string; role?: string }): void {
    const clients = this.getMiddlemanClients(true);
    const target = clients.find(c => c.id === id);
    const filtered = clients.filter(c => c.id !== id);
    this.setItem(STORAGE_KEYS.CUSTOMERS_BROKERAGE, filtered);
    if (actor && target) {
      this.logAction(
        { id: actor.id || 'sys', name: actor.name || 'النظام', role: actor.role || 'admin', department: 'الوساطة' },
        'delete',
        'middleman_client',
        target.id,
        target.name,
        `حذف عميل الوساطة: ${target.name}`
      );
    }
  }

  public toggleMiddlemanClientFreeze(id: string, reason?: string, actor?: { id?: string; name?: string; role?: string }): Customer | undefined {
    const clients = this.getMiddlemanClients(true);
    const index = clients.findIndex(c => c.id === id);
    if (index < 0) return undefined;
    const current = clients[index];
    const newFrozen = !current.isFrozen;
    const updated: Customer = {
      ...current,
      isFrozen: newFrozen,
      status: newFrozen ? 'frozen' : 'active',
      freezeReason: newFrozen ? (reason || 'تجميد بواسطة مسؤول الوساطة') : undefined,
      updatedAt: new Date().toISOString()
    };
    clients[index] = updated;
    this.setItem(STORAGE_KEYS.CUSTOMERS_BROKERAGE, clients);
    if (actor) {
      this.logAction(
        { id: actor.id || 'sys', name: actor.name || 'النظام', role: actor.role || 'admin', department: 'الوساطة' },
        'edit',
        'middleman_client',
        updated.id,
        updated.name,
        `${newFrozen ? 'تجميد' : 'إلغاء تجميد'} عميل الوساطة: ${updated.name}`
      );
    }
    return updated;
  }

  // =============================================================
  // SUBSCRIPTIONS CLIENTS (قاعدة مشتركي الاشتراكات الرقمية المستقلة)
  // =============================================================

  public getSubscriptionClients(includeArchived = false): Customer[] {
    const all = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS_SUBSCRIPTIONS, initialSubscriptionClients);
    return includeArchived ? all : all.filter(c => !c.isArchived);
  }

  public getSubscriptionClientById(id: string): Customer | undefined {
    return this.getSubscriptionClients(true).find(c => c.id === id || c.phone === id);
  }

  public saveSubscriptionClient(client: Customer, actor?: { id?: string; name?: string; role?: string }): Customer {
    const clients = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS_SUBSCRIPTIONS, initialSubscriptionClients);
    if (!client.id) {
      client.id = 'sub_cust_' + Date.now();
    }
    if (!client.code) {
      client.code = `SUB-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const index = clients.findIndex(c => c.id === client.id);
    let saved: Customer;
    if (index >= 0) {
      saved = { ...clients[index], ...client, updatedAt: new Date().toISOString() };
      clients[index] = saved;
    } else {
      saved = {
        ...client,
        createdAt: client.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      clients.unshift(saved);
    }
    this.setItem(STORAGE_KEYS.CUSTOMERS_SUBSCRIPTIONS, clients);
    if (actor) {
      this.logAction(
        { id: actor.id || 'sys', name: actor.name || 'النظام', role: actor.role || 'admin', department: 'الاشتراكات' },
        index >= 0 ? 'edit' : 'add',
        'subscription_client',
        saved.id,
        saved.name,
        `حفظ مشترك: ${saved.name} (${saved.phone})`
      );
    }
    return saved;
  }

  public deleteSubscriptionClient(id: string, actor?: { id?: string; name?: string; role?: string }): void {
    const clients = this.getSubscriptionClients(true);
    const target = clients.find(c => c.id === id);
    const filtered = clients.filter(c => c.id !== id);
    this.setItem(STORAGE_KEYS.CUSTOMERS_SUBSCRIPTIONS, filtered);
    if (actor && target) {
      this.logAction(
        { id: actor.id || 'sys', name: actor.name || 'النظام', role: actor.role || 'admin', department: 'الاشتراكات' },
        'delete',
        'subscription_client',
        target.id,
        target.name,
        `حذف مشترك: ${target.name}`
      );
    }
  }

  public toggleSubscriptionClientFreeze(id: string, reason?: string, actor?: { id?: string; name?: string; role?: string }): Customer | undefined {
    const clients = this.getSubscriptionClients(true);
    const index = clients.findIndex(c => c.id === id);
    if (index < 0) return undefined;
    const current = clients[index];
    const newFrozen = !current.isFrozen;
    const updated: Customer = {
      ...current,
      isFrozen: newFrozen,
      status: newFrozen ? 'frozen' : 'active',
      freezeReason: newFrozen ? (reason || 'تجميد بواسطة مسؤول الاشتراكات') : undefined,
      updatedAt: new Date().toISOString()
    };
    clients[index] = updated;
    this.setItem(STORAGE_KEYS.CUSTOMERS_SUBSCRIPTIONS, clients);
    if (actor) {
      this.logAction(
        { id: actor.id || 'sys', name: actor.name || 'النظام', role: actor.role || 'admin', department: 'الاشتراكات' },
        'edit',
        'subscription_client',
        updated.id,
        updated.name,
        `${newFrozen ? 'تجميد' : 'إلغاء تجميد'} مشترك: ${updated.name}`
      );
    }
    return updated;
  }

  public updateCustomerBalance(customerId: string, amount: number, type: 'credit' | 'debit', notes?: string): Customer {
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw new Error('قيمة تعديل الرصيد غير صالحة، يجب أن تكون أكبر من الصفر');
    }
    const customers = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const index = customers.findIndex(c => c.id === customerId);
    if (index < 0) {
      throw new Error(`العميل غير موجود: ${customerId}`);
    }
    const cust = customers[index];
    const delta = type === 'credit' ? amount : -amount;
    cust.accountBalance = Math.round(((cust.accountBalance || 0) + delta) * 100) / 100;
    cust.balance = cust.accountBalance;
    cust.updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);

    this.addUnifiedWalletTransaction({
      customerId: cust.id,
      walletType: 'account_balance',
      type: type === 'credit' ? 'credit' : 'debit',
      amount: delta,
      balanceAfter: cust.accountBalance,
      operationName: notes || (type === 'credit' ? 'إيداع رصيد يدوي' : 'خصم رصيد يدوي')
    });

    return cust;
  }

  public archiveCustomer(id: string, reason?: string): void {
    const customers = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const index = customers.findIndex(c => c.id === id);
    if (index >= 0) {
      customers[index].isArchived = true;
      customers[index].updatedAt = new Date().toISOString();
      if (reason && customers[index].notes !== undefined) {
        customers[index].notes = customers[index].notes ? `${customers[index].notes} | ${reason}` : reason;
      }
      this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    }
  }

  public restoreCustomer(id: string): void {
    const customers = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const index = customers.findIndex(c => c.id === id);
    if (index >= 0) {
      customers[index].isArchived = false;
      customers[index].updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    }
  }

  public deleteCustomer(id: string): boolean {
    const customers = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    const target = customers.find(c => c.id === id);
    if (!target) return false;
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers.filter(c => c.id !== id));
    return true;
  }

  // Customer Notes
  public getCustomerNotes(customerId: string): CustomerNote[] {
    const allNotes = this.getItem<CustomerNote[]>(STORAGE_KEYS.NOTES, initialNotes);
    return allNotes.filter(n => n.customerId === customerId);
  }

  public addCustomerNote(note: Omit<CustomerNote, 'id' | 'createdAt'>): CustomerNote {
    const allNotes = this.getItem<CustomerNote[]>(STORAGE_KEYS.NOTES, initialNotes);
    const newNote: CustomerNote = {
      ...note,
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString()
    };
    allNotes.unshift(newNote);
    this.setItem(STORAGE_KEYS.NOTES, allNotes);

    const customer = this.getCustomerById(note.customerId);
    if (customer) {
      customer.notesCount = (customer.notesCount || 0) + 1;
      this.saveCustomer(customer);
    }
    return newNote;
  }

  public deleteCustomerNote(noteId: string): void {
    const allNotes = this.getItem<CustomerNote[]>(STORAGE_KEYS.NOTES, initialNotes);
    const filtered = allNotes.filter(n => n.id !== noteId);
    this.setItem(STORAGE_KEYS.NOTES, filtered);
  }

  // Customer Tickets
  public getTickets(customerId?: string): CustomerTicket[] {
    const allTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
    let mutated = false;
    for (const t of allTickets) {
      if (t.referralCommissionEarned && t.referralCommissionEarned > 0) {
        const hasRef = this.hasValidReferrer(t.customerId || t.customerPhone, 'retail');
        if (!hasRef) {
          const amt = t.referralCommissionEarned;
          t.referralAllowance = amt;
          t.referralAllowanceReason = 'بدل إحالة (عميل غير مرتبط بإحالة)';
          t.referralCommissionEarned = 0;
          t.netProfit = Math.round(((t.netProfit !== undefined ? t.netProfit : (t.totalProfitMargin || 0)) + amt) * 100) / 100;
          t.totalProfitMargin = t.netProfit;
          if (t.pricingSnapshot) {
            t.pricingSnapshot.netProfitEGP = t.netProfit;
            t.pricingSnapshot.referralAmountEGP = 0;
          }
          mutated = true;
        }
      }
    }
    if (mutated) {
      this.setItem(STORAGE_KEYS.TICKETS, allTickets);
    }

    if (customerId) {
      return allTickets.filter(t => t.customerId === customerId || t.customerPhone === customerId);
    }
    return allTickets;
  }

  public getTicketById(ticketId: string): CustomerTicket | undefined {
    if (!ticketId) return undefined;
    const cleanId = String(ticketId).trim();
    return this.getTickets().find(t => t.id === cleanId || t.ticketNumber === cleanId);
  }

  public saveTicket(ticket: CustomerTicket): void {
    const tickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
    const index = tickets.findIndex(t => t.id === ticket.id);
    if (index >= 0) {
      tickets[index] = { ...ticket, updatedAt: new Date().toISOString() };
    } else {
      tickets.unshift({ ...ticket, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.setItem(STORAGE_KEYS.TICKETS, tickets);

    // Automatically recalculate customer metrics whenever a ticket is saved
    if (ticket.customerId || ticket.customerPhone) {
      if (ticket.ticketType === 'first_shipping' || ticket.isFirstOrderDiscountApplied) {
        const custPhone = (ticket.customerPhone || '').trim().toLowerCase();
        const customers = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
        const cIdx = customers.findIndex(c => (c.phone && c.phone.trim().toLowerCase() === custPhone) || c.id === ticket.customerId);
        if (cIdx >= 0) {
          customers[cIdx].hasUsedFirstOrderDiscount = true;
          this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
        }
      }

      this.recalculateCustomerProfile(ticket.customerId || ticket.customerPhone);

      // Automatically register Player Game IDs to customer profile
      const custTarget = ticket.customerId || ticket.customerPhone;
      if (ticket.playerGameId) {
        this.registerPlayerGameIdToCustomer(custTarget, ticket.playerGameId);
      }
      if (ticket.items && ticket.items.length > 0) {
        ticket.items.forEach(it => {
          if (it.playerGameId) {
            this.registerPlayerGameIdToCustomer(custTarget, it.playerGameId);
          }
        });
      }
    }

    // Keep all 5 system wallets in 100% real-time mathematical sync
    try {
      this.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets in saveTicket:', e);
    }

    // Automatically synchronize all active competitions with new/updated ticket
    try {
      CompetitionService.syncAllActiveCompetitions();
    } catch (e) {
      console.warn('Error syncing competitions in saveTicket:', e);
    }

    eventBus.publish(SYSTEM_EVENTS.TICKET_UPDATED, ticket);
    try {
      this.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets in refundTicket:', e);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      window.dispatchEvent(new CustomEvent('tickets_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  }

  public deleteTicket(ticketId: string, user?: any, reason: string = 'حذف التذكرة من النظام'): boolean {
    if (user && user.role === 'employee' && !user.permissions?.includes('delete')) {
      this.logAction(
        user,
        'delete',
        'تذكرة',
        ticketId,
        'محاولة حذف تذكرة مرفوضة (غير مصرح)',
        `الموظف [${user.fullName || user.username || user.name || user.id}] حاول حذف التذكرة #${ticketId} دون امتلاك صلاحية الحذف.`
      );
      return false;
    }

    const tickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
    const target = tickets.find(t => t.id === ticketId || t.ticketNumber === ticketId);
    if (!target) {
      const dealerTicket = this.getDealerTicketById(ticketId);
      if (dealerTicket) {
        return this.deleteDealerTicket(dealerTicket.id, user, reason);
      }
      return false;
    }

    // Archive to DELETED_TICKETS for recovery and auditing
    try {
      const deletedRecord: any = {
        ...target,
        deletedAt: new Date().toISOString(),
        deletedBy: user?.fullName || user?.name || 'المدير العام (Owner)',
        deletionReason: reason,
        isDeleted: true
      };
      const deletedTickets = this.getItem<any[]>(STORAGE_KEYS.DELETED_TICKETS, []);
      this.setItem(STORAGE_KEYS.DELETED_TICKETS, [deletedRecord, ...deletedTickets.filter(t => t.id !== target.id)].slice(0, 500));
    } catch (err) {
      console.warn('Error archiving deleted ticket:', err);
    }

    // 1. Remove from active tickets storage first so recalculations see it as removed
    const filtered = tickets.filter(t => t.id !== target.id && t.ticketNumber !== target.ticketNumber);
    this.setItem(STORAGE_KEYS.TICKETS, filtered);

    // Also ensure removed from dealer tickets if cross-referenced
    try {
      const dealerTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.DEALER_TICKETS, []);
      if (dealerTickets.some(t => t.id === target.id || t.ticketNumber === target.ticketNumber)) {
        this.setItem(STORAGE_KEYS.DEALER_TICKETS, dealerTickets.filter(t => t.id !== target.id && t.ticketNumber !== target.ticketNumber));
      }
    } catch (eCleanDealer) {
      console.warn('Error cleaning dealer ticket cross-reference:', eCleanDealer);
    }

    // 2. Full Financial, Inventory & Profile Rollback
    this.rollbackTicketFinancials(target, user, reason);

    if (target.customerId || target.customerPhone) {
      this.recalculateCustomerProfile(target.customerId || target.customerPhone);
    }

    // 3. Immediately recalculate all system wallets to exact live state
    try {
      this.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets in deleteTicket:', e);
    }

    eventBus.publish(SYSTEM_EVENTS.TICKET_UPDATED, target);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      window.dispatchEvent(new CustomEvent('tickets_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    // System Audit Log
    this.logAction(
      {
        id: user?.id || 'admin',
        name: user?.fullName || user?.name || 'المدير العام',
        role: user?.role || 'admin',
        department: 'قسم الشحن والتذاكر'
      },
      'delete',
      'ticket',
      target.id,
      target.ticketNumber,
      `حذف التذكرة #${target.ticketNumber} وعكس كافة المعاملات المالية والمخزونية (رصيد البضاعة FIFO، وارد الخزينة، الأرباح، الكاش باك، الإحالة، الأمانات)`
    );

    return true;
  }

  // =============================================================
  // TICKET FINANCIAL & INVENTORY ROLLBACK (استرداد كامل للنقاط والكاش)
  // =============================================================
  public rollbackTicketFinancials(
    ticket: CustomerTicket,
    user?: any,
    reason: string = 'حذف التذكرة من النظام'
  ): { pointsRestored: number; cashReverted: number; success: boolean } {
    let pointsRestored = 0;
    let cashReverted = 0;

    const isAlreadyRefunded = ticket.status === 'refunded';
    const isCompleted = ticket.status === 'completed';
    const totalPaid = Number(ticket.receivedAmount || ticket.requiredAmount || 0);
    const previouslyRefundedAmount = Number(ticket.refundDetails?.amount || 0);
    const unrefundedCash = Math.max(0, Math.round((totalPaid - previouslyRefundedAmount) * 100) / 100);

    // 1. Reverse Merchandise / Inventory Points & Lots in JKRWalletEngine
    // Only if points were actually deducted and NOT already restored/refunded!
    if (ticket.stockDeducted !== false && !isAlreadyRefunded) {
      try {
        const revRes = JKRWalletEngine.reverseTicketWalletConsumption(
          ticket.ticketNumber || ticket.id,
          user,
          reason
        );
        if (revRes && revRes.totalPointsRestored) {
          pointsRestored = revRes.totalPointsRestored;
        }
      } catch (err) {
        console.warn('Error reversing JKR Wallet consumption:', err);
      }

      // 1b. Fallback: Only if stock was actually deducted and points were not restored yet
      if (ticket.items && ticket.items.length > 0 && pointsRestored === 0) {
        for (const item of ticket.items) {
          const targetWId = item.consumedWalletId || item.walletTypeId || ticket.actualWalletId;
          const pts = item.consumedPoints || 0;
          if (targetWId && pts > 0) {
            try {
              const restored = JKRWalletEngine.restoreSubWalletPoints(
                targetWId,
                pts,
                ticket.ticketNumber || ticket.id,
                reason,
                user
              );
              if (restored) {
                pointsRestored += pts;
              } else {
                // Fallback to StoreWallet if candidate was a legacy StoreWallet
                const storeWallets = this.getStoreWallets();
                const stW = storeWallets.find(w => w.id === targetWId);
                if (stW && stW.pointsBalance !== undefined) {
                  stW.pointsBalance = (stW.pointsBalance || 0) + pts;
                  stW.updatedAt = new Date().toISOString();
                  this.saveStoreWallet(stW);
                  pointsRestored += pts;
                }
              }
            } catch (e) {
              console.warn('Error restoring sub-wallet points fallback:', e);
            }
          }
        }
      }

      // 1c. Restore product availableQuantity in catalog if tracked
      if (ticket.items && ticket.items.length > 0) {
        try {
          const games = this.getGameTree();
          let gamesModified = false;
          ticket.items.forEach(item => {
            const requiredQty = item.quantity || 1;
            for (const g of games) {
              const p = (g.products || []).find(prod => prod.id === item.productId || prod.name === item.productName);
              if (p && p.availableQuantity !== undefined && p.availableQuantity !== null) {
                p.availableQuantity += requiredQty;
                if (!p.isActive && p.availableQuantity > 0 && p.disabledReason?.includes('Auto-Deactivated')) {
                  p.isActive = true;
                  p.disabledReason = undefined;
                }
                gamesModified = true;
                break;
              }
            }
          });
          if (gamesModified) {
            this.setItem(STORAGE_KEYS.GAMES_TREE, games);
          }
        } catch (err) {
          console.warn('Error restoring catalog stock quantity:', err);
        }
      }
    }

    ticket.stockDeducted = false;

    // 2. Reverse Received Cash from Store Wallet (Safe / Cash Receiving Wallet)
    // Only reverse UN-REFUNDED cash! If the ticket was already refunded for 100 EGP, unrefundedCash is 0, so NO cash is deducted again!
    const effectiveCash = unrefundedCash;
    const targetWalletIdOrName = ticket.paymentWalletId || ticket.paymentWallet;

    if (effectiveCash > 0 && targetWalletIdOrName) {
      try {
        const wallets = this.getStoreWallets();
        const isSystem = (x: any) =>
          x.isSystemWallet ||
          ['w_profits', 'w_cashback', 'w_referrals', 'w_trust', 'w_operating_expenses'].includes(x.id) ||
          !!x.systemType;

        let w = wallets.find(x => !isSystem(x) && (x.id === targetWalletIdOrName || x.name === targetWalletIdOrName));
        if (!w) {
          // Fuzzy match by name/payment gateway
          const q = targetWalletIdOrName.trim().toLowerCase();
          w = wallets.find(x => !isSystem(x) && (
            (x.name && x.name.toLowerCase().includes(q)) ||
            (x.category && x.category.toLowerCase().includes(q))
          ));
        }
        if (!w) {
          w = wallets.find(x => x.type === 'operating' && !isSystem(x));
        }

        if (w) {
          const before = w.balance;
          w.balance = Math.max(0, Math.round((w.balance - effectiveCash) * 100) / 100);
          w.dailyIncome = Math.max(0, Math.round(((w.dailyIncome || 0) - effectiveCash) * 100) / 100);
          w.monthlyIncome = Math.max(0, Math.round(((w.monthlyIncome || 0) - effectiveCash) * 100) / 100);
          w.totalReceived = Math.max(0, Math.round(((w.totalReceived || 0) - effectiveCash) * 100) / 100);
          w.updatedAt = new Date().toISOString();

          // If line was used, adjust line balance as well
          const lineId = ticket.paymentWalletNumberId || ticket.paymentReceivedPhone;
          let num = lineId && w.numbers ? w.numbers.find(n => n.id === lineId || n.phoneNumber === lineId) : undefined;
          if (!num && w.numbers && w.numbers.length > 0) {
            num = w.numbers.find(n => n.isPrimary) || w.numbers[0];
          }
          if (num) {
            num.currentBalance = Math.max(0, Math.round(((num.currentBalance || 0) - effectiveCash) * 100) / 100);
            num.dailyReceived = Math.max(0, Math.round(((num.dailyReceived || 0) - effectiveCash) * 100) / 100);
            num.monthlyReceived = Math.max(0, Math.round(((num.monthlyReceived || 0) - effectiveCash) * 100) / 100);
            num.totalReceived = Math.max(0, Math.round(((num.totalReceived || 0) - effectiveCash) * 100) / 100);
          }

          this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);
          cashReverted = effectiveCash;

          // Record withdrawal transaction in Store Wallet Ledger
          this.addStoreWalletTransaction({
            walletId: w.id,
            walletName: w.name,
            type: 'withdrawal',
            amount: effectiveCash,
            currency: w.currency || 'EGP',
            balanceBefore: before,
            balanceAfter: w.balance,
            description: `إلغاء واسترداد تحصيل تذكرة محذوفة #${ticket.ticketNumber} — عميل: ${ticket.customerName || ''}`,
            referenceNumber: ticket.ticketNumber,
            sourceType: 'ticket',
            sourceTicketId: ticket.id,
            sourceTicketNumber: ticket.ticketNumber,
            customerName: ticket.customerName,
            customerPhone: ticket.customerPhone,
            gameName: ticket.gameName,
            performedBy: user ? { id: user.id || 'sys', name: user.fullName || user.name || 'المسؤول', role: user.role || 'user' } : undefined
          });
        }
      } catch (err) {
        console.warn('Error rolling back store wallet payment:', err);
      }
    }

    // 3. Reverse Profits from System Profit Wallet (w_profits / mw_profits)
    const profitToReverse = ticket.netProfit !== undefined ? ticket.netProfit : (ticket.totalProfitMargin || 0);
    if (profitToReverse !== 0 && ticket.profitSynced !== false && !isAlreadyRefunded) {
      try {
        this.debitProfitFromSystemWallet(profitToReverse, ticket.ticketNumber, {
          customerName: ticket.customerName,
          gameName: ticket.gameName,
          performedBy: user,
          reason: `عكس أرباح تذكرة محذوفة #${ticket.ticketNumber}`,
          isDealer: ticket.department === 'dealers'
        });
        ticket.profitSynced = false;
      } catch (err) {
        console.warn('Error rolling back profit wallet:', err);
      }
    }

    // 4. Reverse Operating Expenses from System Wallet (w_operating_expenses)
    if (ticket.fixedCostAmount && ticket.fixedCostAmount > 0 && !isAlreadyRefunded) {
      try {
        this.debitOperatingExpenseFromSystemWallet(
          ticket.fixedCostAmount,
          ticket.ticketNumber,
          `عكس مصاريف تشغيل تذكرة محذوفة #${ticket.ticketNumber}`,
          { customerName: ticket.customerName, gameName: ticket.gameName, performedBy: user }
        );
      } catch (err) {
        console.warn('Error rolling back operating expenses:', err);
      }
    }

    // 4b. Reverse Referral Allowance Profit from System Profit Wallet if present
    if (ticket.referralAllowance && ticket.referralAllowance > 0 && !isAlreadyRefunded) {
      try {
        this.debitProfitFromSystemWallet(ticket.referralAllowance, ticket.ticketNumber, {
          customerName: ticket.customerName,
          gameName: ticket.gameName,
          performedBy: user,
          reason: `عكس أرباح بدل إحالة لتذكرة محذوفة #${ticket.ticketNumber}`,
          isDealer: ticket.department === 'dealers'
        });
      } catch (err) {
        console.warn('Error rolling back referral allowance profit:', err);
      }
    }

    // 4c. Release Held Trust Escrow if Ticket is an Uncompleted Reservation
    if ((ticket.isReservation || ticket.operationMode === 'reservation') && !ticket.reservationTrustDeducted) {
      const holdingAmount = ticket.reservationTrustHeld !== undefined
        ? ticket.reservationTrustHeld
        : (ticket.receivedAmount || ticket.requiredAmount || 0);
      if (holdingAmount > 0) {
        try {
          this.debitTrustFromSystemWallet(
            holdingAmount,
            ticket.customerName || 'العميل',
            `إخلاء أمانة محتجزة لتذكرة حجز محذوفة #${ticket.ticketNumber}`,
            ticket.ticketNumber
          );
          ticket.reservationTrustDeducted = true;
        } catch (err) {
          console.warn('Error releasing reservation trust escrow on delete:', err);
        }
      }
    }

    // 5. Reverse customer / dealer metrics, cashback, referral and trust
    try {
      const earnedCashback = ticket.cashbackEarned || ticket.pricingSnapshot?.cashbackAmountEGP || 0;
      const tktNum = ticket.ticketNumber;
      const tktId = ticket.id;

      // 5a. Purge and reverse Customer Unified Wallet Transactions (STORAGE_KEYS.CASHBACK)
      let custReferralReversedFromTx = false;
      const refCustIdsToRecalc = new Set<string>();
      try {
        const allCustTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
        const matchedCustTxs = allCustTxs.filter(t => (tktNum && t.orderNumber === tktNum) || (tktId && t.orderNumber === tktId));
        for (const tx of matchedCustTxs) {
          if (tx.walletType === 'referral') {
            custReferralReversedFromTx = true;
            const refCust = this.getCustomerById(tx.customerId) || this.findCustomerByPhone(tx.customerId);
            if (refCust) {
              refCust.referralWalletBalance = Math.max(0, Math.round(((refCust.referralWalletBalance || 0) - Number(tx.amount || 0)) * 100) / 100);
              refCust.totalReferralCommissionEarned = Math.max(0, Math.round(((refCust.totalReferralCommissionEarned || 0) - Number(tx.amount || 0)) * 100) / 100);
              this.saveCustomer(refCust);
              this.debitReferralFromSystemWallet(Number(tx.amount || 0), refCust.name, `عكس عمولة إحالة لتذكرة محذوفة #${tktNum}`, false);
              refCustIdsToRecalc.add(refCust.id);
            }
          }
        }
        if (matchedCustTxs.length > 0) {
          const remainingCustTxs = allCustTxs.filter(t => !((tktNum && t.orderNumber === tktNum) || (tktId && t.orderNumber === tktId)));
          this.setItem(STORAGE_KEYS.CASHBACK, remainingCustTxs);
        }
        refCustIdsToRecalc.forEach(id => this.recalculateCustomerProfile(id));
      } catch (errCustTx) {
        console.warn('Error purging customer unified wallet transactions:', errCustTx);
      }

      // 5b. Purge and reverse Dealer Unified Wallet Transactions (STORAGE_KEYS.DEALER_TRANSACTIONS)
      let dealerReferralReversedFromTx = false;
      const refDealerIdsToRecalc = new Set<string>();
      try {
        const allDealerTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, []);
        const matchedDealerTxs = allDealerTxs.filter(t => (tktNum && t.orderNumber === tktNum) || (tktId && t.orderNumber === tktId));
        for (const tx of matchedDealerTxs) {
          if (tx.walletType === 'referral') {
            dealerReferralReversedFromTx = true;
            const refDealer = this.getDealerById(tx.customerId) || this.findDealerByPhone(tx.customerId);
            if (refDealer) {
              refDealer.referralWalletBalance = Math.max(0, Math.round(((refDealer.referralWalletBalance || 0) - Number(tx.amount || 0)) * 100) / 100);
              refDealer.totalReferralCommissionEarned = Math.max(0, Math.round(((refDealer.totalReferralCommissionEarned || 0) - Number(tx.amount || 0)) * 100) / 100);
              this.saveDealer(refDealer);
              this.debitReferralFromSystemWallet(Number(tx.amount || 0), refDealer.name, `عكس عمولة إحالة لتذكرة تاجر محذوفة #${tktNum}`, true);
              refDealerIdsToRecalc.add(refDealer.id);
            }
          }
        }
        if (matchedDealerTxs.length > 0) {
          const remainingDealerTxs = allDealerTxs.filter(t => !((tktNum && t.orderNumber === tktNum) || (tktId && t.orderNumber === tktId)));
          this.setItem(STORAGE_KEYS.DEALER_TRANSACTIONS, remainingDealerTxs);
        }
        refDealerIdsToRecalc.forEach(id => this.recalculateDealerProfile(id));
      } catch (errDealerTx) {
        console.warn('Error purging dealer unified wallet transactions:', errDealerTx);
      }

      const isDealerTicket = ticket.department === 'dealers' || !!this.getDealerTicketById(ticket.id) || !!this.getDealerById(ticket.customerId);

      if (isDealerTicket) {
        const dealer = this.getDealerById(ticket.customerId) || (ticket.customerPhone ? this.findDealerByPhone(ticket.customerPhone) : undefined);
        if (dealer) {
          if (!isAlreadyRefunded) {
            dealer.totalSpent = Math.max(0, (dealer.totalSpent || 0) - (ticket.requiredAmount || 0));
            dealer.totalOrders = Math.max(0, (dealer.totalOrders || 0) - 1);

            if (earnedCashback > 0) {
              dealer.cashbackBalance = Math.max(0, Math.round(((dealer.cashbackBalance || 0) - earnedCashback) * 100) / 100);
              dealer.totalCashbackEarned = Math.max(0, Math.round(((dealer.totalCashbackEarned || 0) - earnedCashback) * 100) / 100);
              this.debitCashbackFromSystemWallet(earnedCashback, dealer.name, ticket.ticketNumber, true);
            }
            if (ticket.cashbackUsed && ticket.cashbackUsed > 0) {
              dealer.cashbackBalance = Math.round(((dealer.cashbackBalance || 0) + ticket.cashbackUsed) * 100) / 100;
              this.creditCashbackToSystemWallet(ticket.cashbackUsed, dealer.name, ticket.ticketNumber, true);
            }
            if (!dealerReferralReversedFromTx && ticket.referralCommissionEarned && ticket.referralCommissionEarned > 0) {
              if (dealer.referredByCode) {
                const refD = this.getDealers(true).find(d => d.referralCode?.trim().toUpperCase() === dealer!.referredByCode?.trim().toUpperCase());
                if (refD) {
                  refD.referralWalletBalance = Math.max(0, Math.round(((refD.referralWalletBalance || 0) - ticket.referralCommissionEarned!) * 100) / 100);
                  refD.totalReferralCommissionEarned = Math.max(0, Math.round(((refD.totalReferralCommissionEarned || 0) - ticket.referralCommissionEarned!) * 100) / 100);
                  this.saveDealer(refD);
                }
              }
              this.debitReferralFromSystemWallet(
                ticket.referralCommissionEarned,
                dealer.name,
                `عكس عمولة إحالة لتذكرة تاجر محذوفة #${ticket.ticketNumber}`,
                true
              );
            }
            if (ticket.referralBalanceUsed && ticket.referralBalanceUsed > 0) {
              dealer.referralWalletBalance = Math.round(((dealer.referralWalletBalance || 0) + ticket.referralBalanceUsed) * 100) / 100;
              this.creditReferralToSystemWallet(ticket.referralBalanceUsed, dealer.name, ticket.ticketNumber, true);
            }
            if (ticket.overpaymentAmount && ticket.overpaymentAmount > 0) {
              dealer.accountBalance = Math.max(0, Math.round(((dealer.accountBalance || 0) - ticket.overpaymentAmount) * 100) / 100);
              this.debitTrustFromSystemWallet(ticket.overpaymentAmount, dealer.name, 'عكس زيادة مدفوعات تذكرة تاجر محذوفة', ticket.ticketNumber, true);
            }
            // Reverse shortage / forgive dealer debt on cancellation
            if (ticket.shortageAmount && ticket.shortageAmount > 0) {
              dealer.accountBalance = Math.round(((dealer.accountBalance || 0) + ticket.shortageAmount) * 100) / 100;
              this.addDealerUnifiedWalletTransaction({
                customerId: dealer.id,
                walletType: 'account_balance',
                type: 'credit',
                operationName: `إلغاء وتسوية عجز تذكرة تاجر ملغاة #${ticket.ticketNumber} (+${ticket.shortageAmount} ج)`,
                amount: ticket.shortageAmount,
                balanceAfter: dealer.accountBalance,
                orderNumber: ticket.ticketNumber
              });
            }
            if (ticket.accountBalanceUsed && ticket.accountBalanceUsed > 0) {
              dealer.accountBalance = Math.round(((dealer.accountBalance || 0) + ticket.accountBalanceUsed) * 100) / 100;
              this.creditTrustToSystemWallet(ticket.accountBalanceUsed, dealer.name, 'استعادة رصيد مستخدم لتذكرة تاجر محذوفة', ticket.ticketNumber, true);
            }
            dealer.balance = dealer.accountBalance;
            this.saveDealer(dealer);
          }
        }
      } else {
        let cust = this.getCustomerById(ticket.customerId);
        if (!cust && ticket.customerPhone) {
          cust = this.findCustomerByPhone(ticket.customerPhone);
        }
        if (cust) {
          if (!isAlreadyRefunded) {
            cust.totalSpent = Math.max(0, (cust.totalSpent || 0) - (ticket.requiredAmount || 0));
            cust.totalOrders = Math.max(0, (cust.totalOrders || 0) - 1);

            // Reverse earned cashback
            if (earnedCashback > 0) {
              cust.cashbackBalance = Math.max(0, Math.round(((cust.cashbackBalance || 0) - earnedCashback) * 100) / 100);
              cust.totalCashbackEarned = Math.max(0, Math.round(((cust.totalCashbackEarned || 0) - earnedCashback) * 100) / 100);
              this.debitCashbackFromSystemWallet(earnedCashback, cust.name, ticket.ticketNumber, false);
            }
            // Restore cashback used
            if (ticket.cashbackUsed && ticket.cashbackUsed > 0) {
              cust.cashbackBalance = Math.round(((cust.cashbackBalance || 0) + ticket.cashbackUsed) * 100) / 100;
              this.creditCashbackToSystemWallet(ticket.cashbackUsed, cust.name, ticket.ticketNumber, false);
            }
            // Reverse earned referral commission fallback (only if referrer wasn't already caught by transactions)
            if (!custReferralReversedFromTx && ticket.referralCommissionEarned && ticket.referralCommissionEarned > 0) {
              if (cust.referredByCode) {
                const refCust = this.getCustomers(true).find(c => c.referralCode?.trim().toUpperCase() === cust!.referredByCode?.trim().toUpperCase());
                if (refCust) {
                  refCust.referralWalletBalance = Math.max(0, Math.round(((refCust.referralWalletBalance || 0) - ticket.referralCommissionEarned!) * 100) / 100);
                  refCust.totalReferralCommissionEarned = Math.max(0, Math.round(((refCust.totalReferralCommissionEarned || 0) - ticket.referralCommissionEarned!) * 100) / 100);
                  this.saveCustomer(refCust);
                }
              }
              this.debitReferralFromSystemWallet(
                ticket.referralCommissionEarned,
                cust.name,
                `عكس عمولة إحالة لتذكرة محذوفة #${ticket.ticketNumber}`,
                false
              );
            }
            // Restore referral balance used
            if (ticket.referralBalanceUsed && ticket.referralBalanceUsed > 0) {
              cust.referralWalletBalance = Math.round(((cust.referralWalletBalance || 0) + ticket.referralBalanceUsed) * 100) / 100;
              this.creditReferralToSystemWallet(ticket.referralBalanceUsed, cust.name, ticket.ticketNumber, false);
            }
            // Reverse overpayment / customer credit
            if (ticket.overpaymentAmount && ticket.overpaymentAmount > 0) {
              cust.accountBalance = Math.max(0, Math.round(((cust.accountBalance || 0) - ticket.overpaymentAmount) * 100) / 100);
              this.debitTrustFromSystemWallet(ticket.overpaymentAmount, cust.name, 'عكس زيادة مدفوعات تذكرة محذوفة', ticket.ticketNumber, false);
            }
            // Reverse shortage / forgive customer debt on cancellation
            if (ticket.shortageAmount && ticket.shortageAmount > 0) {
              cust.accountBalance = Math.round(((cust.accountBalance || 0) + ticket.shortageAmount) * 100) / 100;
              this.addUnifiedWalletTransaction({
                customerId: cust.id,
                walletType: 'account_balance',
                type: 'credit',
                operationName: `إلغاء وتسوية عجز تذكرة ملغاة #${ticket.ticketNumber} (+${ticket.shortageAmount} ج)`,
                amount: ticket.shortageAmount,
                balanceAfter: cust.accountBalance,
                orderNumber: ticket.ticketNumber
              });
            }
            // Restore account balance used
            if (ticket.accountBalanceUsed && ticket.accountBalanceUsed > 0) {
              cust.accountBalance = Math.round(((cust.accountBalance || 0) + ticket.accountBalanceUsed) * 100) / 100;
              this.creditTrustToSystemWallet(ticket.accountBalanceUsed, cust.name, 'استعادة رصيد مستخدم لتذكرة محذوفة', ticket.ticketNumber, false);
            }
            cust.balance = cust.accountBalance;
            this.saveCustomer(cust);
          }
        }
      }
    } catch (e) {
      console.warn('Error updating customer/dealer profile on ticket delete:', e);
    }

    // 6. Real-time UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jkr_wallets_updated'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return { pointsRestored, cashReverted, success: true };
  }

  // =============================================================
  // RECONCILE TICKET FULL EDIT (مزامنة شاملة لتعديل التذكرة مالياً ومخزنياً)
  // =============================================================
  public reconcileTicketEdit(
    oldTicket: CustomerTicket,
    updatedTicket: CustomerTicket,
    user?: any
  ): { success: boolean; adjustments: string[]; updatedTicket?: CustomerTicket } {
    const adjustments: string[] = [];
    const isDealer = updatedTicket.department === 'dealers' ||
      oldTicket.department === 'dealers' ||
      !!this.getDealerTicketById(oldTicket.id) ||
      !!this.getDealerById(updatedTicket.customerId) ||
      !!this.findDealerByPhone(updatedTicket.customerPhone);

    const clientName = updatedTicket.customerName || oldTicket.customerName || (isDealer ? 'تاجر' : 'عميل');
    const ticketNum = updatedTicket.ticketNumber || oldTicket.ticketNumber;

    const wasCanceled = oldTicket.status === 'canceled';
    const isNowCanceled = updatedTicket.status === 'canceled';
    const wasCompleted = oldTicket.status === 'completed';
    const isNowCompleted = updatedTicket.status === 'completed';

    // 1. RECONCILE CASH PAYMENT IN RECEIVING STORE WALLETS (فارق النقدية بمحفظة الاستلام والخط)
    const oldW = oldTicket.paymentWalletId || oldTicket.paymentWallet;
    const newW = updatedTicket.paymentWalletId || updatedTicket.paymentWallet;
    const oldAmt = wasCanceled ? 0 : Number(oldTicket.receivedAmount || 0);
    const newAmt = isNowCanceled ? 0 : Number(updatedTicket.receivedAmount || 0);

    try {
      const wallets = this.getStoreWallets();
      const isSystem = (x: any) =>
        x.isSystemWallet ||
        ['w_profits', 'w_cashback', 'w_referrals', 'w_trust'].includes(x.id) ||
        !!x.systemType;

      if (isNowCanceled && !wasCanceled) {
        // Revert all received cash from receiving store wallet on cancellation
        const cashToRevert = oldAmt;
        if (cashToRevert > 0 && oldW) {
          let wOld = wallets.find(x => !isSystem(x) && (x.id === oldW || x.name === oldW));
          if (!wOld) {
            wOld = wallets.find(x => x.type === 'operating' && !isSystem(x));
          }
          if (wOld) {
            const before = wOld.balance;
            wOld.balance = Math.max(0, Math.round((wOld.balance - cashToRevert) * 100) / 100);
            wOld.dailyIncome = Math.max(0, Math.round(((wOld.dailyIncome || 0) - cashToRevert) * 100) / 100);
            wOld.monthlyIncome = Math.max(0, Math.round(((wOld.monthlyIncome || 0) - cashToRevert) * 100) / 100);
            wOld.totalReceived = Math.max(0, Math.round(((wOld.totalReceived || 0) - cashToRevert) * 100) / 100);
            wOld.updatedAt = new Date().toISOString();

            const lineId = oldTicket.paymentWalletNumberId || oldTicket.paymentReceivedPhone;
            let num = lineId && wOld.numbers ? wOld.numbers.find(n => n.id === lineId || n.phoneNumber === lineId) : undefined;
            if (!num && wOld.numbers && wOld.numbers.length > 0) {
              num = wOld.numbers.find(n => n.isPrimary) || wOld.numbers[0];
            }
            if (num) {
              num.currentBalance = Math.max(0, Math.round(((num.currentBalance || 0) - cashToRevert) * 100) / 100);
              num.dailyReceived = Math.max(0, Math.round(((num.dailyReceived || 0) - cashToRevert) * 100) / 100);
              num.monthlyReceived = Math.max(0, Math.round(((num.monthlyReceived || 0) - cashToRevert) * 100) / 100);
              num.totalReceived = Math.max(0, Math.round(((num.totalReceived || 0) - cashToRevert) * 100) / 100);
            }

            this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);
            this.addStoreWalletTransaction({
              walletId: wOld.id,
              walletName: wOld.name,
              type: 'withdrawal',
              amount: cashToRevert,
              currency: wOld.currency || 'EGP',
              balanceBefore: before,
              balanceAfter: wOld.balance,
              description: `إلغاء تحصيل تذكرة ملغاة #${ticketNum}`,
              referenceNumber: ticketNum,
              sourceType: 'ticket',
              sourceTicketId: updatedTicket.id,
              performedBy: user ? { id: String(user.id || ''), name: String(user.fullName || user.name || ''), role: String(user.role || 'staff') } : undefined
            });
            adjustments.push(`إلغاء تحصيل النقدية من محفظة [${wOld.name}]: -${cashToRevert} ج`);
          }
        }
      } else if (oldW === newW && oldW) {
        const cashDiff = Math.round((newAmt - oldAmt) * 100) / 100;
        if (cashDiff !== 0) {
          let w = wallets.find(x => !isSystem(x) && (x.id === oldW || x.name === oldW));
          if (!w) {
            w = wallets.find(x => x.type === 'operating' && !isSystem(x));
          }
          if (w) {
            const before = w.balance;
            w.balance = Math.max(0, Math.round((w.balance + cashDiff) * 100) / 100);
            w.dailyIncome = Math.max(0, Math.round(((w.dailyIncome || 0) + cashDiff) * 100) / 100);
            w.monthlyIncome = Math.max(0, Math.round(((w.monthlyIncome || 0) + cashDiff) * 100) / 100);
            w.totalReceived = Math.max(0, Math.round(((w.totalReceived || 0) + cashDiff) * 100) / 100);
            w.updatedAt = new Date().toISOString();

            // Adjust line / phone number balance if selected
            const lineId = updatedTicket.paymentWalletNumberId || updatedTicket.paymentReceivedPhone || oldTicket.paymentWalletNumberId || oldTicket.paymentReceivedPhone;
            let num = lineId && w.numbers ? w.numbers.find(n => n.id === lineId || n.phoneNumber === lineId) : undefined;
            if (!num && w.numbers && w.numbers.length > 0) {
              num = w.numbers.find(n => n.isPrimary) || w.numbers[0];
            }
            if (num) {
              num.currentBalance = Math.max(0, Math.round(((num.currentBalance || 0) + cashDiff) * 100) / 100);
              num.dailyReceived = Math.max(0, Math.round(((num.dailyReceived || 0) + cashDiff) * 100) / 100);
              num.monthlyReceived = Math.max(0, Math.round(((num.monthlyReceived || 0) + cashDiff) * 100) / 100);
              num.totalReceived = Math.max(0, Math.round(((num.totalReceived || 0) + cashDiff) * 100) / 100);
            }

            this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);
            this.addStoreWalletTransaction({
              walletId: w.id,
              walletName: w.name,
              type: cashDiff > 0 ? 'deposit' : 'withdrawal',
              amount: Math.abs(cashDiff),
              currency: w.currency || 'EGP',
              balanceBefore: before,
              balanceAfter: w.balance,
              description: `تعديل المبلغ المستلم لتذكرة #${ticketNum}: من ${oldAmt} ج إلى ${newAmt} ج (فارق: ${cashDiff > 0 ? '+' : ''}${cashDiff} ج)`,
              referenceNumber: ticketNum,
              sourceType: 'ticket',
              sourceTicketId: updatedTicket.id,
              sourceTicketNumber: ticketNum,
              customerName: clientName,
              performedBy: user ? { id: String(user.id || ''), name: String(user.fullName || user.name || ''), role: String(user.role || 'staff') } : undefined
            });
            adjustments.push(`تعديل رصيد محفظة الاستلام [${w.name}]: ${cashDiff > 0 ? '+' : ''}${cashDiff} ج`);
          }
        }
      } else if (oldW !== newW) {
        // Receiving wallet changed! Deduct old from old wallet, add new to new wallet
        if (oldW && oldAmt > 0) {
          let wOld = wallets.find(x => !isSystem(x) && (x.id === oldW || x.name === oldW));
          if (!wOld) wOld = wallets.find(x => x.type === 'operating' && !isSystem(x));
          if (wOld) {
            const before = wOld.balance;
            wOld.balance = Math.max(0, Math.round((wOld.balance - oldAmt) * 100) / 100);
            wOld.dailyIncome = Math.max(0, Math.round(((wOld.dailyIncome || 0) - oldAmt) * 100) / 100);
            wOld.monthlyIncome = Math.max(0, Math.round(((wOld.monthlyIncome || 0) - oldAmt) * 100) / 100);
            wOld.totalReceived = Math.max(0, Math.round(((wOld.totalReceived || 0) - oldAmt) * 100) / 100);
            wOld.updatedAt = new Date().toISOString();

            const lineId = oldTicket.paymentWalletNumberId || oldTicket.paymentReceivedPhone;
            let num = lineId && wOld.numbers ? wOld.numbers.find(n => n.id === lineId || n.phoneNumber === lineId) : undefined;
            if (!num && wOld.numbers && wOld.numbers.length > 0) num = wOld.numbers.find(n => n.isPrimary) || wOld.numbers[0];
            if (num) {
              num.currentBalance = Math.max(0, Math.round(((num.currentBalance || 0) - oldAmt) * 100) / 100);
            }

            this.addStoreWalletTransaction({
              walletId: wOld.id,
              walletName: wOld.name,
              type: 'withdrawal',
              amount: oldAmt,
              currency: wOld.currency || 'EGP',
              balanceBefore: before,
              balanceAfter: wOld.balance,
              description: `إلغاء تحصيل تذكرة #${ticketNum} بسبب تغيير محفظة الاستلام`,
              referenceNumber: ticketNum,
              sourceType: 'ticket',
              sourceTicketId: updatedTicket.id,
              performedBy: user ? { id: String(user.id || ''), name: String(user.fullName || user.name || ''), role: String(user.role || 'staff') } : undefined
            });
          }
        }
        if (newW && newAmt > 0) {
          let wNew = wallets.find(x => !isSystem(x) && (x.id === newW || x.name === newW));
          if (!wNew) wNew = wallets.find(x => x.type === 'operating' && !isSystem(x));
          if (wNew) {
            const before = wNew.balance;
            wNew.balance = Math.max(0, Math.round((wNew.balance + newAmt) * 100) / 100);
            wNew.dailyIncome = Math.max(0, Math.round(((wNew.dailyIncome || 0) + newAmt) * 100) / 100);
            wNew.monthlyIncome = Math.max(0, Math.round(((wNew.monthlyIncome || 0) + newAmt) * 100) / 100);
            wNew.totalReceived = Math.max(0, Math.round(((wNew.totalReceived || 0) + newAmt) * 100) / 100);
            wNew.updatedAt = new Date().toISOString();

            const lineId = updatedTicket.paymentWalletNumberId || updatedTicket.paymentReceivedPhone;
            let num = lineId && wNew.numbers ? wNew.numbers.find(n => n.id === lineId || n.phoneNumber === lineId) : undefined;
            if (!num && wNew.numbers && wNew.numbers.length > 0) num = wNew.numbers.find(n => n.isPrimary) || wNew.numbers[0];
            if (num) {
              num.currentBalance = Math.max(0, Math.round(((num.currentBalance || 0) + newAmt) * 100) / 100);
            }

            this.addStoreWalletTransaction({
              walletId: wNew.id,
              walletName: wNew.name,
              type: 'deposit',
              amount: newAmt,
              currency: wNew.currency || 'EGP',
              balanceBefore: before,
              balanceAfter: wNew.balance,
              description: `استلام دفعة تذكرة #${ticketNum} بعد تعديل محفظة الاستلام — عميل: ${clientName}`,
              referenceNumber: ticketNum,
              sourceType: 'ticket',
              sourceTicketId: updatedTicket.id,
              performedBy: user ? { id: String(user.id || ''), name: String(user.fullName || user.name || ''), role: String(user.role || 'staff') } : undefined
            });
          }
        }
        this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);
        adjustments.push(`تغيير محفظة الاستلام من [${oldW || 'غير محدد'}] إلى [${newW}]`);
      }
    } catch (err) {
      console.warn('Error reconciling receiving store wallet:', err);
    }

    // 2. RECONCILE CUSTOMER / DEALER FINANCIAL BALANCE (الديون / الأمانات وفائض وعجز الدفع)
    const oldRequired = Number(oldTicket.requiredAmount || 0);
    const newRequired = isNowCanceled ? 0 : Number(updatedTicket.requiredAmount || 0);

    const oldOver = (!wasCanceled && (oldTicket.overpaymentSettled || (oldTicket.overpaymentAmount && oldTicket.overpaymentAmount > 0)))
      ? Number(oldTicket.overpaymentAmount || 0)
      : 0;
    const oldShort = (!wasCanceled && (oldTicket.shortageSettled || (oldTicket.shortageAmount && oldTicket.shortageAmount > 0)))
      ? Number(oldTicket.shortageAmount || 0)
      : 0;
    const oldNetBalance = oldOver - oldShort;

    const newOver = isNowCanceled ? 0 : Math.max(0, Math.round((newAmt - newRequired) * 100) / 100);
    const newShort = isNowCanceled ? 0 : ((newAmt < newRequired) ? Math.max(0, Math.round((newRequired - newAmt) * 100) / 100) : 0);
    const newNetBalance = newOver - newShort;

    const balanceDelta = Math.round((newNetBalance - oldNetBalance) * 100) / 100;

    updatedTicket.overpaymentAmount = newOver;
    updatedTicket.shortageAmount = newShort;
    updatedTicket.overpaymentSettled = newOver > 0;
    updatedTicket.shortageSettled = newShort > 0;
    updatedTicket.balanceSettled = true;

    if (balanceDelta !== 0) {
      if (isDealer) {
        const dealer = this.getDealerById(updatedTicket.customerId) || (updatedTicket.customerPhone ? this.findDealerByPhone(updatedTicket.customerPhone) : undefined);
        if (dealer) {
          dealer.accountBalance = Math.round(((dealer.accountBalance || 0) + balanceDelta) * 100) / 100;
          dealer.balance = dealer.accountBalance;
          this.saveDealer(dealer);
          this.addDealerUnifiedWalletTransaction({
            customerId: dealer.id,
            walletType: 'account_balance',
            type: balanceDelta > 0 ? 'credit' : 'debit',
            operationName: `تسوية رصيد حساب بعد تعديل التذكرة #${ticketNum} (${balanceDelta > 0 ? '+' : ''}${balanceDelta} ج)`,
            amount: Math.abs(balanceDelta),
            balanceAfter: dealer.accountBalance,
            orderNumber: ticketNum
          });
          if (balanceDelta > 0) this.creditTrustToSystemWallet(balanceDelta, dealer.name, 'فائض دفع بعد تعديل تذكرة تاجر', ticketNum, true);
          else this.debitTrustFromSystemWallet(Math.abs(balanceDelta), dealer.name, 'عجز دفع بعد تعديل تذكرة تاجر', ticketNum, true);
          adjustments.push(`تسوية رصيد التاجر الأساسي: ${balanceDelta > 0 ? '+' : ''}${balanceDelta} ج`);
        }
      } else {
        const cust = this.getCustomerById(updatedTicket.customerId) || (updatedTicket.customerPhone ? this.findCustomerByPhone(updatedTicket.customerPhone) : undefined);
        if (cust) {
          cust.accountBalance = Math.round(((cust.accountBalance || 0) + balanceDelta) * 100) / 100;
          cust.balance = cust.accountBalance;
          this.saveCustomer(cust);
          this.addUnifiedWalletTransaction({
            customerId: cust.id,
            walletType: 'account_balance',
            type: balanceDelta > 0 ? 'credit' : 'debit',
            operationName: `تسوية رصيد حساب بعد تعديل التذكرة #${ticketNum} (${balanceDelta > 0 ? '+' : ''}${balanceDelta} ج)`,
            amount: Math.abs(balanceDelta),
            balanceAfter: cust.accountBalance,
            orderNumber: ticketNum
          });
          if (balanceDelta > 0) this.creditTrustToSystemWallet(balanceDelta, cust.name, 'فائض دفع بعد تعديل التذكرة', ticketNum, false);
          else this.debitTrustFromSystemWallet(Math.abs(balanceDelta), cust.name, 'عجز دفع بعد تعديل التذكرة', ticketNum, false);
          adjustments.push(`تسوية رصيد العميل الأساسي: ${balanceDelta > 0 ? '+' : ''}${balanceDelta} ج`);
        }
      }
    }

    // 2b. Reconcile Customer / Dealer totalSpent and totalOrders
    if (isNowCanceled && wasCompleted) {
      if (isDealer) {
        const dealer = this.getDealerById(updatedTicket.customerId) || (updatedTicket.customerPhone ? this.findDealerByPhone(updatedTicket.customerPhone) : undefined);
        if (dealer) {
          dealer.totalSpent = Math.max(0, Math.round(((dealer.totalSpent || 0) - (oldTicket.requiredAmount || 0)) * 100) / 100);
          dealer.totalOrders = Math.max(0, (dealer.totalOrders || 0) - 1);
          this.saveDealer(dealer);
        }
      } else {
        const cust = this.getCustomerById(updatedTicket.customerId) || (updatedTicket.customerPhone ? this.findCustomerByPhone(updatedTicket.customerPhone) : undefined);
        if (cust) {
          cust.totalSpent = Math.max(0, Math.round(((cust.totalSpent || 0) - (oldTicket.requiredAmount || 0)) * 100) / 100);
          cust.totalOrders = Math.max(0, (cust.totalOrders || 0) - 1);
          this.saveCustomer(cust);
        }
      }
    } else if (isNowCompleted && !wasCompleted) {
      if (isDealer) {
        const dealer = this.getDealerById(updatedTicket.customerId) || (updatedTicket.customerPhone ? this.findDealerByPhone(updatedTicket.customerPhone) : undefined);
        if (dealer) {
          dealer.totalSpent = Math.round(((dealer.totalSpent || 0) + Number(updatedTicket.requiredAmount || 0)) * 100) / 100;
          dealer.totalOrders = (dealer.totalOrders || 0) + 1;
          this.saveDealer(dealer);
        }
      } else {
        const cust = this.getCustomerById(updatedTicket.customerId) || (updatedTicket.customerPhone ? this.findCustomerByPhone(updatedTicket.customerPhone) : undefined);
        if (cust) {
          cust.totalSpent = Math.round(((cust.totalSpent || 0) + Number(updatedTicket.requiredAmount || 0)) * 100) / 100;
          cust.totalOrders = (cust.totalOrders || 0) + 1;
          this.saveCustomer(cust);
        }
      }
    } else if (isNowCompleted && wasCompleted && newRequired !== oldRequired) {
      const diffReq = Math.round((newRequired - oldRequired) * 100) / 100;
      if (isDealer) {
        const dealer = this.getDealerById(updatedTicket.customerId) || (updatedTicket.customerPhone ? this.findDealerByPhone(updatedTicket.customerPhone) : undefined);
        if (dealer) {
          dealer.totalSpent = Math.max(0, Math.round(((dealer.totalSpent || 0) + diffReq) * 100) / 100);
          this.saveDealer(dealer);
        }
      } else {
        const cust = this.getCustomerById(updatedTicket.customerId) || (updatedTicket.customerPhone ? this.findCustomerByPhone(updatedTicket.customerPhone) : undefined);
        if (cust) {
          cust.totalSpent = Math.max(0, Math.round(((cust.totalSpent || 0) + diffReq) * 100) / 100);
          this.saveCustomer(cust);
        }
      }
    }

    // 3. RECONCILE CASHBACK (عكس وإعادة حساب الكاش باك بدقة تامة وبلا تكرار)
    const isCompleted = updatedTicket.status === 'completed';
    const isCanceledOrRefunded = updatedTicket.status === 'canceled' || updatedTicket.status === 'refunded';
    const targetCashback = isCanceledOrRefunded ? 0 : ((isCompleted || oldTicket.cashbackSynced) ? Number(updatedTicket.cashbackEarned || 0) : 0);

    if (isDealer) {
      const allDealerTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, []);
      const dealer = this.getDealerById(updatedTicket.customerId) || (updatedTicket.customerPhone ? this.findDealerByPhone(updatedTicket.customerPhone) : undefined);
      if (dealer) {
        const ticketCbTxs = allDealerTxs.filter(t => t.customerId === dealer.id && t.orderNumber === ticketNum && t.walletType === 'cashback');
        const existingCreditedCb = Math.round(ticketCbTxs.reduce((sum, t) => {
          if (t.type === 'earned' || t.type === 'credit') return sum + (Number(t.amount) || 0);
          if (t.type === 'debit' || t.type === 'adjustment') return sum - (Number(t.amount) || 0);
          return sum;
        }, 0) * 100) / 100;

        const diffCb = Math.round((targetCashback - existingCreditedCb) * 100) / 100;
        if (diffCb !== 0) {
          dealer.cashbackBalance = Math.max(0, Math.round(((dealer.cashbackBalance || 0) + diffCb) * 100) / 100);
          if (diffCb > 0) {
            dealer.totalCashbackEarned = Math.round(((dealer.totalCashbackEarned || 0) + diffCb) * 100) / 100;
          }
          this.saveDealer(dealer);

          if (diffCb > 0) {
            this.addDealerUnifiedWalletTransaction({
              customerId: dealer.id,
              walletType: 'cashback',
              type: 'earned',
              operationName: `تسوية كاش باك بعد تعديل تذكرة تاجر #${ticketNum} (+${diffCb} ج)`,
              amount: diffCb,
              balanceAfter: dealer.cashbackBalance,
              orderNumber: ticketNum
            });
            this.creditCashbackToSystemWallet(diffCb, dealer.name, ticketNum, true);
            adjustments.push(`إضافة فارق كاش باك للتاجر: +${diffCb} ج`);
          } else {
            this.addDealerUnifiedWalletTransaction({
              customerId: dealer.id,
              walletType: 'cashback',
              type: 'debit',
              operationName: `خصم فارق كاش باك بعد تعديل تذكرة تاجر #${ticketNum} (-${Math.abs(diffCb)} ج)`,
              amount: Math.abs(diffCb),
              balanceAfter: dealer.cashbackBalance,
              orderNumber: ticketNum
            });
            this.debitCashbackFromSystemWallet(Math.abs(diffCb), dealer.name, ticketNum, true);
            adjustments.push(`استرداد فارق كاش باك من التاجر: -${Math.abs(diffCb)} ج`);
          }
          updatedTicket.cashbackBalanceSnapshot = dealer.cashbackBalance;
        }
      }
    } else {
      const allCustTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
      const cust = this.getCustomerById(updatedTicket.customerId) || (updatedTicket.customerPhone ? this.findCustomerByPhone(updatedTicket.customerPhone) : undefined);
      if (cust) {
        const ticketCbTxs = allCustTxs.filter(t => t.customerId === cust.id && t.orderNumber === ticketNum && t.walletType === 'cashback');
        const existingCreditedCb = Math.round(ticketCbTxs.reduce((sum, t) => {
          if (t.type === 'earned' || t.type === 'credit') return sum + (Number(t.amount) || 0);
          if (t.type === 'debit' || t.type === 'adjustment') return sum - (Number(t.amount) || 0);
          return sum;
        }, 0) * 100) / 100;

        const diffCb = Math.round((targetCashback - existingCreditedCb) * 100) / 100;
        if (diffCb !== 0) {
          cust.cashbackBalance = Math.max(0, Math.round(((cust.cashbackBalance || 0) + diffCb) * 100) / 100);
          if (diffCb > 0) {
            cust.totalCashbackEarned = Math.round(((cust.totalCashbackEarned || 0) + diffCb) * 100) / 100;
          }
          this.saveCustomer(cust);

          if (diffCb > 0) {
            this.addUnifiedWalletTransaction({
              customerId: cust.id,
              walletType: 'cashback',
              type: 'earned',
              operationName: `تسوية كاش باك بعد تعديل التذكرة #${ticketNum} (+${diffCb} ج)`,
              amount: diffCb,
              balanceAfter: cust.cashbackBalance,
              orderNumber: ticketNum
            });
            this.creditCashbackToSystemWallet(diffCb, cust.name, ticketNum, false);
            adjustments.push(`إضافة فارق كاش باك للعميل: +${diffCb} ج`);
          } else {
            this.addUnifiedWalletTransaction({
              customerId: cust.id,
              walletType: 'cashback',
              type: 'debit',
              operationName: `خصم فارق كاش باك بعد تعديل التذكرة #${ticketNum} (-${Math.abs(diffCb)} ج)`,
              amount: Math.abs(diffCb),
              balanceAfter: cust.cashbackBalance,
              orderNumber: ticketNum
            });
            this.debitCashbackFromSystemWallet(Math.abs(diffCb), cust.name, ticketNum, false);
            adjustments.push(`استرداد فارق كاش باك من العميل: -${Math.abs(diffCb)} ج`);
          }
          updatedTicket.cashbackBalanceSnapshot = cust.cashbackBalance;
        }
      }
    }

    // 3b. RECONCILE REFERRAL COMMISSION (عكس وإعادة حساب عمولة الإحالة لشركاء النجاح بدقة وبلا تكرار)
    const targetReferral = isCanceledOrRefunded ? 0 : ((isCompleted || oldTicket.referralCommissionProcessed) ? Number(updatedTicket.referralCommissionEarned || 0) : 0);

    if (isDealer) {
      const allDealerTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, []);
      const ticketRefTxs = allDealerTxs.filter(t => t.orderNumber === ticketNum && t.walletType === 'referral');
      const existingCreditedRef = Math.round(ticketRefTxs.reduce((sum, t) => {
        if (t.type === 'commission' || t.type === 'earned' || t.type === 'credit') return sum + (Number(t.amount) || 0);
        if (t.type === 'debit' || t.type === 'adjustment') return sum - (Number(t.amount) || 0);
        return sum;
      }, 0) * 100) / 100;

      const diffRef = Math.round((targetReferral - existingCreditedRef) * 100) / 100;
      if (diffRef !== 0) {
        let referrerDealerId = ticketRefTxs[0]?.customerId;
        let referrerDealer = referrerDealerId ? this.getDealerById(referrerDealerId) : undefined;
        if (!referrerDealer) {
          const currentDealer = this.getDealerById(updatedTicket.customerId) || (updatedTicket.customerPhone ? this.findDealerByPhone(updatedTicket.customerPhone) : undefined);
          if (currentDealer?.referredByCode) {
            referrerDealer = this.getDealers(true).find(d => d.referralCode?.trim().toUpperCase() === currentDealer.referredByCode?.trim().toUpperCase());
          }
        }

        if (referrerDealer) {
          referrerDealer.referralWalletBalance = Math.max(0, Math.round(((referrerDealer.referralWalletBalance || 0) + diffRef) * 100) / 100);
          referrerDealer.totalReferralCommissionEarned = Math.max(0, Math.round(((referrerDealer.totalReferralCommissionEarned || 0) + diffRef) * 100) / 100);
          this.saveDealer(referrerDealer);

          if (diffRef > 0) {
            this.addDealerUnifiedWalletTransaction({
              customerId: referrerDealer.id,
              walletType: 'referral',
              type: 'commission',
              operationName: `تسوية عمولة إحالة بعد تعديل تذكرة تاجر #${ticketNum} (+${diffRef} ج)`,
              amount: diffRef,
              balanceAfter: referrerDealer.referralWalletBalance,
              orderNumber: ticketNum
            });
            this.creditReferralToSystemWallet(diffRef, referrerDealer.name, ticketNum, true);
            adjustments.push(`إضافة فارق عمولة إحالة للتاجر الشريك: +${diffRef} ج`);
          } else {
            this.addDealerUnifiedWalletTransaction({
              customerId: referrerDealer.id,
              walletType: 'referral',
              type: 'debit',
              operationName: `خصم فارق عمولة إحالة بعد تعديل تذكرة تاجر #${ticketNum} (-${Math.abs(diffRef)} ج)`,
              amount: Math.abs(diffRef),
              balanceAfter: referrerDealer.referralWalletBalance,
              orderNumber: ticketNum
            });
            this.debitReferralFromSystemWallet(Math.abs(diffRef), referrerDealer.name, `خصم فارق عمولة إحالة بعد تعديل تذكرة تاجر #${ticketNum}`, true);
            adjustments.push(`استرداد فارق عمولة إحالة من التاجر الشريك: -${Math.abs(diffRef)} ج`);
          }
          this.recalculateDealerProfile(referrerDealer.id);
        }
      }
    } else {
      const allCustTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
      const ticketRefTxs = allCustTxs.filter(t => t.orderNumber === ticketNum && t.walletType === 'referral');
      const existingCreditedRef = Math.round(ticketRefTxs.reduce((sum, t) => {
        if (t.type === 'commission' || t.type === 'earned' || t.type === 'credit') return sum + (Number(t.amount) || 0);
        if (t.type === 'debit' || t.type === 'adjustment') return sum - (Number(t.amount) || 0);
        return sum;
      }, 0) * 100) / 100;

      const diffRef = Math.round((targetReferral - existingCreditedRef) * 100) / 100;
      if (diffRef !== 0) {
        let referrerCustId = ticketRefTxs[0]?.customerId;
        let referrerCust = referrerCustId ? this.getCustomerById(referrerCustId) : undefined;
        if (!referrerCust) {
          const currentCust = this.getCustomerById(updatedTicket.customerId) || (updatedTicket.customerPhone ? this.findCustomerByPhone(updatedTicket.customerPhone) : undefined);
          if (currentCust?.referredByCode) {
            referrerCust = this.getCustomers(true).find(c => c.referralCode?.trim().toUpperCase() === currentCust.referredByCode?.trim().toUpperCase());
          }
        }

        if (referrerCust) {
          referrerCust.referralWalletBalance = Math.max(0, Math.round(((referrerCust.referralWalletBalance || 0) + diffRef) * 100) / 100);
          referrerCust.totalReferralCommissionEarned = Math.max(0, Math.round(((referrerCust.totalReferralCommissionEarned || 0) + diffRef) * 100) / 100);
          this.saveCustomer(referrerCust);

          if (diffRef > 0) {
            this.addUnifiedWalletTransaction({
              customerId: referrerCust.id,
              walletType: 'referral',
              type: 'commission',
              operationName: `تسوية عمولة إحالة بعد تعديل التذكرة #${ticketNum} (+${diffRef} ج)`,
              amount: diffRef,
              balanceAfter: referrerCust.referralWalletBalance,
              orderNumber: ticketNum
            });
            this.creditReferralToSystemWallet(diffRef, referrerCust.name, ticketNum, false);
            adjustments.push(`إضافة فارق عمولة إحالة لشريك النجاح: +${diffRef} ج`);
          } else {
            this.addUnifiedWalletTransaction({
              customerId: referrerCust.id,
              walletType: 'referral',
              type: 'debit',
              operationName: `خصم فارق عمولة إحالة بعد تعديل التذكرة #${ticketNum} (-${Math.abs(diffRef)} ج)`,
              amount: Math.abs(diffRef),
              balanceAfter: referrerCust.referralWalletBalance,
              orderNumber: ticketNum
            });
            this.debitReferralFromSystemWallet(Math.abs(diffRef), referrerCust.name, `خصم فارق عمولة إحالة بعد تعديل التذكرة #${ticketNum}`, false);
            adjustments.push(`استرداد فارق عمولة إحالة من شريك النجاح: -${Math.abs(diffRef)} ج`);
          }
          this.recalculateCustomerProfile(referrerCust.id);
        }
      }
    }
    updatedTicket.referralCommissionEarned = targetReferral;
    updatedTicket.referralCommissionProcessed = targetReferral > 0;

    // 4. RECONCILE INVENTORY POINTS, FIFO LOTS & MERCHANDISE WALLETS (تعديل ومزامنة شاملة لمحافظ البضاعة والـ FIFO)
    const prevItems = oldTicket.items || [];
    const newItems = updatedTicket.items || [];
    const prevTotalPoints = prevItems.reduce((sum, it) => sum + (it.consumedPoints || ((it.pointsCostPerUnit || 0) * (it.quantity || 1))), 0);
    const newTotalPoints = newItems.reduce((sum, it) => sum + (it.consumedPoints || ((it.pointsCostPerUnit || 0) * (it.quantity || 1))), 0);

    const itemsInventoryChanged = prevItems.length !== newItems.length ||
      prevItems.some((prev, idx) => {
        const next = newItems[idx];
        if (!next) return true;
        return prev.productId !== next.productId ||
          (prev.quantity || 1) !== (next.quantity || 1) ||
          (prev.consumedPoints || 0) !== (next.consumedPoints || 0) ||
          (prev.consumedWalletId || prev.walletTypeId) !== (next.consumedWalletId || next.walletTypeId);
      });

    const inventoryAffected = Boolean(oldTicket.stockDeducted) ||
      Boolean(updatedTicket.stockDeducted) ||
      prevTotalPoints !== newTotalPoints ||
      itemsInventoryChanged;

    if (inventoryAffected) {
      // Step A: Fully reverse previous inventory consumption for this ticket
      try {
        JKRWalletEngine.reverseTicketWalletConsumption(
          oldTicket.ticketNumber || oldTicket.id,
          user,
          `إعادة ضبط المخزون لتعديل التذكرة #${ticketNum}`
        );
      } catch (e) {
        console.warn('Error reversing previous wallet consumption on edit:', e);
      }

      // Step B: Reset deduction flags & snapshots so fresh FIFO deduction can take place
      updatedTicket.stockDeducted = false;
      updatedTicket.consumedSources = undefined;
      updatedTicket.walletSnapshot = undefined;

      // Step C: Re-consume inventory with true FIFO lots if ticket is active/completed
      if (updatedTicket.status !== 'canceled' && updatedTicket.status !== 'refunded') {
        try {
          this.consumeTicketProductStock(updatedTicket, user);
          adjustments.push(`تحديث وتعديل سحب مخزون البضاعة بنظام FIFO الفعلي`);
        } catch (e) {
          console.error('Error re-consuming stock on ticket edit:', e);
        }
      }
    }

    // 5. RECONCILE SYSTEM PROFITS AND EXPENSES (أرباح ومصاريف تشغيل النظام)
    const oldProfit = oldTicket.netProfit !== undefined ? oldTicket.netProfit : (oldTicket.totalProfitMargin || 0);
    const newProfit = updatedTicket.netProfit !== undefined ? updatedTicket.netProfit : (updatedTicket.totalProfitMargin || 0);
    const diffProfit = Math.round((newProfit - oldProfit) * 100) / 100;
    if (diffProfit !== 0 && (oldTicket.profitSynced || isCompleted)) {
      if (diffProfit > 0) {
        this.recordProfitOrLossToSystemWallet(diffProfit, ticketNum, {
          customerName: clientName,
          gameName: updatedTicket.gameName,
          referralAllowance: updatedTicket.referralAllowance,
          isDealer
        });
      } else {
        this.debitProfitFromSystemWallet(Math.abs(diffProfit), ticketNum, {
          customerName: clientName,
          gameName: updatedTicket.gameName,
          performedBy: user,
          reason: `تسوية أرباح بعد تعديل التذكرة #${ticketNum}`,
          isDealer
        });
      }
      updatedTicket.profitSynced = true;
      adjustments.push(`تسوية أرباح النظام: ${diffProfit > 0 ? '+' : ''}${diffProfit} ج`);
    }

    const oldExpenses = oldTicket.fixedCostAmount || 0;
    const newExpenses = updatedTicket.fixedCostAmount || 0;
    const diffExpenses = Math.round((newExpenses - oldExpenses) * 100) / 100;
    if (diffExpenses !== 0) {
      if (diffExpenses > 0) {
        this.recordOperatingExpenseToSystemWallet(
          diffExpenses,
          ticketNum,
          `تسوية مصاريف تشغيل بعد تعديل تذكرة #${ticketNum}`,
          { customerName: clientName, gameName: updatedTicket.gameName, performedBy: user }
        );
      } else {
        this.debitOperatingExpenseFromSystemWallet(
          Math.abs(diffExpenses),
          ticketNum,
          `عكس فارق مصاريف تشغيل بعد تعديل تذكرة #${ticketNum}`,
          { customerName: clientName, gameName: updatedTicket.gameName, performedBy: user }
        );
      }
      adjustments.push(`تسوية مصاريف التشغيل: ${diffExpenses > 0 ? '+' : ''}${diffExpenses} ج`);
    }

    // 6. SAVE UPDATED TICKET & RECALCULATE CUSTOMER / DEALER METRICS AND PROFILES
    if (isDealer) {
      this.saveDealerTicket(updatedTicket);
      this.recalculateDealerProfile(updatedTicket.customerId || updatedTicket.customerPhone);
    } else {
      this.saveTicket(updatedTicket);
      this.recalculateCustomerProfile(updatedTicket.customerId || updatedTicket.customerPhone);
    }

    // 7. BROADCAST EVENTS & RECALCULATE SYSTEM WALLETS
    try {
      this.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets in reconcileTicketEdit:', e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('jkr_wallets_updated'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      window.dispatchEvent(new CustomEvent('unified_wallets_updated'));
    }

    return { success: true, adjustments, updatedTicket };
  }

  public reconcileTicketPaymentEdit(
    oldTicket: CustomerTicket,
    updatedTicket: CustomerTicket,
    user?: any
  ): void {
    this.reconcileTicketEdit(oldTicket, updatedTicket, user);
  }

  // Check if customer or dealer has a valid active referrer
  public hasValidReferrer(customerIdOrPhone?: string, department?: 'retail' | 'dealers' | 'customers'): boolean {
    if (!customerIdOrPhone) return false;
    const cleanId = customerIdOrPhone.trim();
    if (department === 'dealers') {
      const dealer = this.getDealerById(cleanId) || this.findDealerByPhone(cleanId);
      if (!dealer || !dealer.referredByCode) return false;
      const cleanCode = dealer.referredByCode.trim().toUpperCase();
      const refDealer = this.getDealers(true).find(
        d => d.referralCode?.trim().toUpperCase() === cleanCode
      );
      return Boolean(refDealer && !refDealer.isFrozen && refDealer.status !== 'suspended');
    } else {
      const customer = this.getCustomerById(cleanId) || this.findCustomerByPhone(cleanId);
      if (!customer || !customer.referredByCode) return false;
      const cleanCode = customer.referredByCode.trim().toUpperCase();
      const referrer = this.getCustomers(true).find(
        c => c.referralCode?.trim().toUpperCase() === cleanCode
      );
      return Boolean(referrer && !referrer.isFrozen && referrer.status !== 'suspended');
    }
  }

  // Check if phone number has ever benefited from first shipping offer
  public hasPhoneNumberUsedFirstShipping(phone: string): boolean {
    if (!phone) return false;
    const cleanPhone = phone.trim().toLowerCase();

    // 1. Check all customer records with this phone
    const customers = this.getCustomers(true);
    const matchedCustomer = customers.find(c => c.phone && c.phone.trim().toLowerCase() === cleanPhone);
    if (matchedCustomer?.hasUsedFirstOrderDiscount) {
      return true;
    }

    // 2. Check all tickets (retail and dealer) where this phone is customerPhone
    const allTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
    const dealerTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.DEALER_TICKETS, []);
    const combinedTickets = [...allTickets, ...dealerTickets];

    const usedTicket = combinedTickets.find(t => {
      const tPhone = (t.customerPhone || '').trim().toLowerCase();
      if (tPhone !== cleanPhone) return false;
      if (t.status === 'canceled' || t.status === 'fraud') return false;
      return t.ticketType === 'first_shipping' || t.isFirstOrderDiscountApplied === true;
    });

    return !!usedTicket;
  }

  // =============================================================
  // DEALER TICKETS (تذاكر جملة التجار المستقلة بالكامل)
  // =============================================================

  public getDealerTickets(dealerId?: string): CustomerTicket[] {
    const allTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.DEALER_TICKETS, []);
    let mutated = false;
    for (const t of allTickets) {
      if (t.referralCommissionEarned && t.referralCommissionEarned > 0) {
        const hasRef = this.hasValidReferrer(t.customerId || t.customerPhone, 'dealers');
        if (!hasRef) {
          const amt = t.referralCommissionEarned;
          t.referralAllowance = amt;
          t.referralAllowanceReason = 'بدل إحالة (تاجر غير مرتبط بإحالة)';
          t.referralCommissionEarned = 0;
          t.netProfit = Math.round(((t.netProfit !== undefined ? t.netProfit : (t.totalProfitMargin || 0)) + amt) * 100) / 100;
          t.totalProfitMargin = t.netProfit;
          if (t.pricingSnapshot) {
            t.pricingSnapshot.netProfitEGP = t.netProfit;
            t.pricingSnapshot.referralAmountEGP = 0;
          }
          mutated = true;
        }
      }
    }
    if (mutated) {
      this.setItem(STORAGE_KEYS.DEALER_TICKETS, allTickets);
    }

    if (dealerId) {
      return allTickets.filter(t => t.customerId === dealerId || t.customerPhone === dealerId);
    }
    return allTickets;
  }

  public getDealerTicketById(ticketId: string): CustomerTicket | undefined {
    if (!ticketId) return undefined;
    const cleanId = String(ticketId).trim();
    return this.getDealerTickets().find(t => t.id === cleanId || t.ticketNumber === cleanId);
  }

  public saveDealerTicket(ticket: CustomerTicket): void {
    const tickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.DEALER_TICKETS, []);
    const index = tickets.findIndex(t => t.id === ticket.id);
    if (index >= 0) {
      tickets[index] = { ...ticket, updatedAt: new Date().toISOString() };
    } else {
      tickets.unshift({ ...ticket, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.setItem(STORAGE_KEYS.DEALER_TICKETS, tickets);

    if (ticket.customerId || ticket.customerPhone) {
      this.recalculateDealerProfile(ticket.customerId || ticket.customerPhone);
    }

    try {
      this.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets in saveDealerTicket:', e);
    }

    // Automatically synchronize all active competitions with new/updated dealer ticket
    try {
      CompetitionService.syncAllActiveCompetitions();
    } catch (e) {
      console.warn('Error syncing competitions in saveDealerTicket:', e);
    }

    eventBus.publish(SYSTEM_EVENTS.TICKET_UPDATED, ticket);
    try {
      this.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets in refundTicket:', e);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      window.dispatchEvent(new CustomEvent('dealer_tickets_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  }

  public getDeletedTickets(): any[] {
    return this.getItem<any[]>(STORAGE_KEYS.DELETED_TICKETS, []);
  }

  public deleteDealerTicket(ticketId: string, user?: any, reason: string = 'حذف تذكرة تاجر من النظام'): boolean {
    if (user && user.role === 'employee' && !user.permissions?.includes('delete')) {
      this.logAction(
        user,
        'delete',
        'تذكرة تاجر',
        ticketId,
        'محاولة حذف تذكرة تاجر مرفوضة (غير مصرح)',
        `الموظف [${user.fullName || user.username || user.name || user.id}] حاول حذف تذكرة تاجر #${ticketId} دون امتلاك صلاحية الحذف.`
      );
      return false;
    }

    const tickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.DEALER_TICKETS, []);
    const target = tickets.find(t => t.id === ticketId || t.ticketNumber === ticketId);
    if (!target) {
      const custTicket = this.getTicketById(ticketId);
      if (custTicket) {
        return this.deleteTicket(custTicket.id, user, reason);
      }
      return false;
    }

    // Archive to DELETED_TICKETS for recovery and auditing
    try {
      const deletedRecord: any = {
        ...target,
        department: 'dealers',
        deletedAt: new Date().toISOString(),
        deletedBy: user?.fullName || user?.name || 'المدير العام (Owner)',
        deletionReason: reason,
        isDeleted: true
      };
      const deletedTickets = this.getItem<any[]>(STORAGE_KEYS.DELETED_TICKETS, []);
      this.setItem(STORAGE_KEYS.DELETED_TICKETS, [deletedRecord, ...deletedTickets.filter(t => t.id !== target.id)].slice(0, 500));
    } catch (err) {
      console.warn('Error archiving deleted dealer ticket:', err);
    }

    // 1. Remove from active dealer tickets storage first
    const filtered = tickets.filter(t => t.id !== target.id && t.ticketNumber !== target.ticketNumber);
    this.setItem(STORAGE_KEYS.DEALER_TICKETS, filtered);

    // Also ensure removed from retail tickets if cross-referenced
    try {
      const retailTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
      if (retailTickets.some(t => t.id === target.id || t.ticketNumber === target.ticketNumber)) {
        this.setItem(STORAGE_KEYS.TICKETS, retailTickets.filter(t => t.id !== target.id && t.ticketNumber !== target.ticketNumber));
      }
    } catch (eCleanRetail) {
      console.warn('Error cleaning retail ticket cross-reference:', eCleanRetail);
    }

    // 2. Full Financial, Inventory & Profile Rollback for Dealer Ticket
    this.rollbackTicketFinancials(target, user, reason);

    if (target.customerId || target.customerPhone) {
      this.recalculateDealerProfile(target.customerId || target.customerPhone);
    }

    // 3. Immediately recalculate system wallets
    try {
      this.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets in deleteDealerTicket:', e);
    }

    eventBus.publish(SYSTEM_EVENTS.TICKET_UPDATED, target);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      window.dispatchEvent(new CustomEvent('dealer_tickets_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    // System Audit Log
    this.logAction(
      {
        id: user?.id || 'admin',
        name: user?.fullName || user?.name || 'المدير العام',
        role: user?.role || 'admin',
        department: 'قسم التجار والموزعين'
      },
      'delete',
      'dealer_ticket',
      target.id,
      target.ticketNumber,
      `حذف تذكرة تاجر #${target.ticketNumber} وعكس كافة العمليات (المخزون FIFO، وارد الخزينة، الأرباح، الكاش باك، الإحالة، الأمانات)`
    );

    return true;
  }

  public restoreTicket(ticketId: string, user?: any): { success: boolean; message: string; ticket?: CustomerTicket } {
    const deletedTickets = this.getItem<any[]>(STORAGE_KEYS.DELETED_TICKETS, []);
    const target = deletedTickets.find(t => t.id === ticketId || t.ticketNumber === ticketId);
    if (!target) {
      return { success: false, message: 'التذكرة المحذوفة غير موجودة في سجل الاستعادة' };
    }

    const isDealer = target.department === 'dealers' || !!this.getDealerById(target.customerId);
    const cleanedTicket: CustomerTicket = { ...target };
    delete (cleanedTicket as any).deletedAt;
    delete (cleanedTicket as any).deletedBy;
    delete (cleanedTicket as any).deletionReason;
    delete (cleanedTicket as any).isDeleted;

    // 1. Restore to active tickets list
    if (isDealer) {
      const dealerTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.DEALER_TICKETS, []);
      if (!dealerTickets.some(t => t.id === cleanedTicket.id)) {
        dealerTickets.unshift(cleanedTicket);
        this.setItem(STORAGE_KEYS.DEALER_TICKETS, dealerTickets);
      }
    } else {
      const tickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
      if (!tickets.some(t => t.id === cleanedTicket.id)) {
        tickets.unshift(cleanedTicket);
        this.setItem(STORAGE_KEYS.TICKETS, tickets);
      }
    }

    // 2. Remove from DELETED_TICKETS
    const remainingDeleted = deletedTickets.filter(t => t.id !== target.id && t.ticketNumber !== target.ticketNumber);
    this.setItem(STORAGE_KEYS.DELETED_TICKETS, remainingDeleted);

    // 3. Re-consume Merchandise / Goods Stock (FIFO Lots)
    cleanedTicket.stockDeducted = false;
    cleanedTicket.consumedSources = undefined;
    cleanedTicket.walletSnapshot = undefined;
    try {
      this.consumeTicketProductStock(cleanedTicket, user);
    } catch (e) {
      console.warn('Error re-consuming stock on restore:', e);
    }

    // 4. Re-deposit Received Cash to Store Wallet
    const effectiveCash = Number(cleanedTicket.receivedAmount || cleanedTicket.requiredAmount || 0);
    const targetWalletIdOrName = cleanedTicket.paymentWalletId || cleanedTicket.paymentWallet;
    if (effectiveCash > 0 && targetWalletIdOrName) {
      try {
        const wallets = this.getStoreWallets();
        const isSystem = (x: any) =>
          x.isSystemWallet ||
          ['w_profits', 'w_cashback', 'w_referrals', 'w_trust', 'w_operating_expenses'].includes(x.id) ||
          !!x.systemType;

        let w = wallets.find(x => !isSystem(x) && (x.id === targetWalletIdOrName || x.name === targetWalletIdOrName));
        if (!w) {
          const q = targetWalletIdOrName.trim().toLowerCase();
          w = wallets.find(x => !isSystem(x) && ((x.name && x.name.toLowerCase().includes(q)) || (x.category && x.category.toLowerCase().includes(q))));
        }

        if (w) {
          const before = w.balance;
          w.balance = Math.round((w.balance + effectiveCash) * 100) / 100;
          w.dailyIncome = Math.round(((w.dailyIncome || 0) + effectiveCash) * 100) / 100;
          w.monthlyIncome = Math.round(((w.monthlyIncome || 0) + effectiveCash) * 100) / 100;
          w.totalReceived = Math.round(((w.totalReceived || 0) + effectiveCash) * 100) / 100;
          w.updatedAt = new Date().toISOString();

          const lineId = cleanedTicket.paymentWalletNumberId || cleanedTicket.paymentReceivedPhone;
          if (w.numbers && w.numbers.length > 0) {
            let num = lineId ? w.numbers.find(n => n.id === lineId || n.phoneNumber === lineId) : undefined;
            if (!num) num = w.numbers.find(n => n.isPrimary) || w.numbers[0];
            if (num) {
              num.currentBalance = Math.round(((num.currentBalance || 0) + effectiveCash) * 100) / 100;
              num.dailyReceived = Math.round(((num.dailyReceived || 0) + effectiveCash) * 100) / 100;
              num.monthlyReceived = Math.round(((num.monthlyReceived || 0) + effectiveCash) * 100) / 100;
              num.totalReceived = Math.round(((num.totalReceived || 0) + effectiveCash) * 100) / 100;
            }
          }

          this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

          this.addStoreWalletTransaction({
            walletId: w.id,
            walletName: w.name,
            type: 'deposit',
            amount: effectiveCash,
            currency: w.currency || 'EGP',
            balanceBefore: before,
            balanceAfter: w.balance,
            description: `استعادة تحصيل تذكرة مسترجعة #${cleanedTicket.ticketNumber} — عميل: ${cleanedTicket.customerName || ''}`,
            referenceNumber: cleanedTicket.ticketNumber,
            sourceType: 'ticket',
            sourceTicketId: cleanedTicket.id,
            sourceTicketNumber: cleanedTicket.ticketNumber,
            customerName: cleanedTicket.customerName,
            customerPhone: cleanedTicket.customerPhone,
            gameName: cleanedTicket.gameName,
            performedBy: user ? { id: user.id || 'sys', name: user.fullName || user.name || 'المسؤول', role: user.role || 'user' } : undefined
          });
        }
      } catch (err) {
        console.warn('Error re-depositing cash on restore:', err);
      }
    }

    // 5. Re-credit Net Profits (routed properly for retail vs dealer)
    const profitToCredit = cleanedTicket.netProfit !== undefined ? cleanedTicket.netProfit : (cleanedTicket.totalProfitMargin || 0);
    if (profitToCredit !== 0) {
      this.recordProfitOrLossToSystemWallet(profitToCredit, cleanedTicket.ticketNumber, {
        customerName: cleanedTicket.customerName,
        gameName: cleanedTicket.gameName,
        isDealer
      });
      cleanedTicket.profitSynced = true;
    }

    // 6. Re-credit Operating Expenses
    if (cleanedTicket.fixedCostAmount && cleanedTicket.fixedCostAmount > 0) {
      this.recordOperatingExpenseToSystemWallet(cleanedTicket.fixedCostAmount, cleanedTicket.ticketNumber, undefined, {
        customerName: cleanedTicket.customerName,
        gameName: cleanedTicket.gameName,
        performedBy: user
      });
    }

    // 7. Re-apply Customer / Dealer Cashback
    const earnedCashback = cleanedTicket.cashbackEarned || cleanedTicket.pricingSnapshot?.cashbackAmountEGP || 0;
    if (isDealer) {
      const dealer = this.getDealerById(cleanedTicket.customerId) || (cleanedTicket.customerPhone ? this.getDealerById(cleanedTicket.customerPhone) : undefined);
      if (dealer) {
        dealer.totalSpent = (dealer.totalSpent || 0) + (cleanedTicket.requiredAmount || 0);
        dealer.totalOrders = (dealer.totalOrders || 0) + 1;
        if (earnedCashback > 0) {
          dealer.cashbackBalance = Math.round(((dealer.cashbackBalance || 0) + earnedCashback) * 100) / 100;
          dealer.totalCashbackEarned = Math.round(((dealer.totalCashbackEarned || 0) + earnedCashback) * 100) / 100;
          this.creditCashbackToSystemWallet(earnedCashback, dealer.name, cleanedTicket.ticketNumber, true);
        }
        if (cleanedTicket.cashbackUsed && cleanedTicket.cashbackUsed > 0) {
          dealer.cashbackBalance = Math.max(0, Math.round(((dealer.cashbackBalance || 0) - cleanedTicket.cashbackUsed) * 100) / 100);
          this.debitCashbackFromSystemWallet(cleanedTicket.cashbackUsed, dealer.name, cleanedTicket.ticketNumber, true);
        }
        this.saveDealer(dealer);
      }
    } else {
      let cust = this.getCustomerById(cleanedTicket.customerId);
      if (!cust && cleanedTicket.customerPhone) {
        cust = this.getCustomers(true).find(c => c.phone === cleanedTicket.customerPhone);
      }
      if (cust) {
        cust.totalSpent = (cust.totalSpent || 0) + (cleanedTicket.requiredAmount || 0);
        cust.totalOrders = (cust.totalOrders || 0) + 1;
        if (earnedCashback > 0) {
          cust.cashbackBalance = Math.round(((cust.cashbackBalance || 0) + earnedCashback) * 100) / 100;
          cust.totalCashbackEarned = Math.round(((cust.totalCashbackEarned || 0) + earnedCashback) * 100) / 100;
          this.creditCashbackToSystemWallet(earnedCashback, cust.name, cleanedTicket.ticketNumber, false);
        }
        if (cleanedTicket.cashbackUsed && cleanedTicket.cashbackUsed > 0) {
          cust.cashbackBalance = Math.max(0, Math.round(((cust.cashbackBalance || 0) - cleanedTicket.cashbackUsed) * 100) / 100);
          this.debitCashbackFromSystemWallet(cleanedTicket.cashbackUsed, cust.name, cleanedTicket.ticketNumber, false);
        }
        this.saveCustomer(cust);
      }
    }

    // 7b. Re-credit Referral Commission to Referrer
    const referralAmtToCredit = cleanedTicket.referralCommissionEarned || cleanedTicket.pricingSnapshot?.referralAmountEGP || 0;
    if (referralAmtToCredit > 0) {
      if (isDealer) {
        const dealer = this.getDealerById(cleanedTicket.customerId) || (cleanedTicket.customerPhone ? this.getDealerById(cleanedTicket.customerPhone) : undefined);
        if (dealer && dealer.referredByCode) {
          const dealerReferrer = this.getDealers(true).find(
            d => d.referralCode?.trim().toUpperCase() === dealer.referredByCode?.trim().toUpperCase()
          );
          if (dealerReferrer) {
            dealerReferrer.referralWalletBalance = Math.round(((dealerReferrer.referralWalletBalance || 0) + referralAmtToCredit) * 100) / 100;
            dealerReferrer.totalReferralCommissionEarned = Math.round(((dealerReferrer.totalReferralCommissionEarned || 0) + referralAmtToCredit) * 100) / 100;
            this.saveDealer(dealerReferrer);

            this.addDealerUnifiedWalletTransaction({
              customerId: dealerReferrer.id,
              walletType: 'referral',
              type: 'commission',
              operationName: `استعادة عمولة إحالة لتذكرة تاجر مسترجعة #${cleanedTicket.ticketNumber} (+${referralAmtToCredit} ج)`,
              amount: referralAmtToCredit,
              balanceAfter: dealerReferrer.referralWalletBalance,
              orderNumber: cleanedTicket.ticketNumber
            });
            this.creditReferralToSystemWallet(referralAmtToCredit, dealerReferrer.name, cleanedTicket.ticketNumber, true);
          }
        }
      } else {
        const cust = this.getCustomerById(cleanedTicket.customerId) || (cleanedTicket.customerPhone ? this.getCustomers(true).find(c => c.phone === cleanedTicket.customerPhone) : undefined);
        if (cust) {
          const allCustomers = this.getCustomers(true);
          let referrer = cust.referrerId ? allCustomers.find(c => c.id === cust.referrerId) : null;
          if (!referrer && cust.referredByCode) {
            referrer = allCustomers.find(c => c.referralCode?.trim().toUpperCase() === cust.referredByCode?.trim().toUpperCase()) || null;
          }
          if (referrer) {
            referrer.referralWalletBalance = Math.round(((referrer.referralWalletBalance || 0) + referralAmtToCredit) * 100) / 100;
            referrer.totalReferralCommissionEarned = Math.round(((referrer.totalReferralCommissionEarned || 0) + referralAmtToCredit) * 100) / 100;
            this.saveCustomer(referrer);

            this.addUnifiedWalletTransaction({
              customerId: referrer.id,
              walletType: 'referral',
              type: 'commission',
              operationName: `استعادة عمولة إحالة لتذكرة مسترجعة #${cleanedTicket.ticketNumber} (+${referralAmtToCredit} ج)`,
              amount: referralAmtToCredit,
              balanceAfter: referrer.referralWalletBalance,
              orderNumber: cleanedTicket.ticketNumber
            });
            this.creditReferralToSystemWallet(referralAmtToCredit, referrer.name, cleanedTicket.ticketNumber, false);
          }
        }
      }
    }

    // 8. Re-apply Customer / Dealer Shortage Debt or Trust / Overpayment
    if (cleanedTicket.shortageAmount && cleanedTicket.shortageAmount > 0) {
      if (isDealer) {
        const dealer = this.getDealerById(cleanedTicket.customerId) || (cleanedTicket.customerPhone ? this.getDealerById(cleanedTicket.customerPhone) : undefined);
        if (dealer) {
          dealer.accountBalance = Math.round(((dealer.accountBalance || 0) - cleanedTicket.shortageAmount) * 100) / 100;
          dealer.balance = dealer.accountBalance;
          this.saveDealer(dealer);

          this.addDealerUnifiedWalletTransaction({
            customerId: dealer.id,
            walletType: 'account_balance',
            type: 'debit',
            operationName: `استعادة عجز تذكرة تاجر مسترجعة #${cleanedTicket.ticketNumber} (-${cleanedTicket.shortageAmount} ج)`,
            amount: cleanedTicket.shortageAmount,
            balanceAfter: dealer.accountBalance,
            orderNumber: cleanedTicket.ticketNumber
          });
          this.debitTrustFromSystemWallet(cleanedTicket.shortageAmount, dealer.name, 'استعادة عجز تذكرة تاجر مسترجعة', cleanedTicket.ticketNumber, true);
        }
      } else {
        const cust = this.getCustomerById(cleanedTicket.customerId) || (cleanedTicket.customerPhone ? this.getCustomers(true).find(c => c.phone === cleanedTicket.customerPhone) : undefined);
        if (cust) {
          cust.accountBalance = Math.round(((cust.accountBalance || 0) - cleanedTicket.shortageAmount) * 100) / 100;
          cust.balance = cust.accountBalance;
          this.saveCustomer(cust);

          this.addUnifiedWalletTransaction({
            customerId: cust.id,
            walletType: 'account_balance',
            type: 'debit',
            operationName: `استعادة عجز تذكرة مسترجعة #${cleanedTicket.ticketNumber} (-${cleanedTicket.shortageAmount} ج)`,
            amount: cleanedTicket.shortageAmount,
            balanceAfter: cust.accountBalance,
            orderNumber: cleanedTicket.ticketNumber
          });
          this.debitTrustFromSystemWallet(cleanedTicket.shortageAmount, cust.name, 'استعادة عجز تذكرة مسترجعة', cleanedTicket.ticketNumber, false);
        }
      }
    }

    if (cleanedTicket.overpaymentAmount && cleanedTicket.overpaymentAmount > 0) {
      if (isDealer) {
        const dealer = this.getDealerById(cleanedTicket.customerId) || (cleanedTicket.customerPhone ? this.getDealerById(cleanedTicket.customerPhone) : undefined);
        if (dealer) {
          dealer.accountBalance = Math.round(((dealer.accountBalance || 0) + cleanedTicket.overpaymentAmount) * 100) / 100;
          dealer.balance = dealer.accountBalance;
          this.saveDealer(dealer);
          this.creditTrustToSystemWallet(cleanedTicket.overpaymentAmount, dealer.name, 'استعادة فائض تذكرة تاجر مسترجعة', cleanedTicket.ticketNumber, true);
        }
      } else {
        const cust = this.getCustomerById(cleanedTicket.customerId) || (cleanedTicket.customerPhone ? this.getCustomers(true).find(c => c.phone === cleanedTicket.customerPhone) : undefined);
        if (cust) {
          cust.accountBalance = Math.round(((cust.accountBalance || 0) + cleanedTicket.overpaymentAmount) * 100) / 100;
          cust.balance = cust.accountBalance;
          this.saveCustomer(cust);
          this.creditTrustToSystemWallet(cleanedTicket.overpaymentAmount, cust.name, 'استعادة فائض تذكرة مسترجعة', cleanedTicket.ticketNumber, false);
        }
      }
    }

    // 9. Recalculate Profiles & Save cleanedTicket
    if (isDealer) {
      this.saveDealerTicket(cleanedTicket);
      this.recalculateDealerProfile(cleanedTicket.customerId || cleanedTicket.customerPhone);
    } else {
      this.saveTicket(cleanedTicket);
      this.recalculateCustomerProfile(cleanedTicket.customerId || cleanedTicket.customerPhone);
    }

    try {
      this.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets in restoreTicket:', e);
    }

    // 10. Audit Log
    this.logAction(
      {
        id: user?.id || 'admin',
        name: user?.fullName || user?.name || 'المدير العام',
        role: user?.role || 'admin',
        department: isDealer ? 'قسم التجار والموزعين' : 'قسم الشحن والتذاكر'
      },
      'restore',
      'ticket',
      cleanedTicket.id,
      cleanedTicket.ticketNumber,
      `استعادة التذكرة المحذوفة #${cleanedTicket.ticketNumber} وإعادة مزامنة كافة المحافظ وقواعد البيانات (FIFO، وارد، أرباح، كاش باك)`
    );

    // 11. Dispatch Events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jkr_wallets_updated'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return { success: true, message: `تمت استعادة التذكرة #${cleanedTicket.ticketNumber} بنجاح وإعادة تشغيل كافة الحركات المالية والمخزونية`, ticket: cleanedTicket };
  }

  // =============================================================
  // GAME ID / PLAYER ID OWNERSHIP VERIFICATION (حماية تكرار المعرف)
  // =============================================================

  public checkPlayerGameIdOwnership(
    playerGameId: string,
    currentCustomerPhone: string,
    currentCustomerId?: string,
    excludeTicketId?: string
  ): {
    isAllowed: boolean;
    conflictCustomerName?: string;
    conflictCustomerPhone?: string;
    conflictTicketNumber?: string;
  } {
    const pId = (playerGameId || '').trim().toLowerCase();
    if (!pId) return { isAllowed: true };

    const cleanCurrentPhone = (currentCustomerPhone || '').replace(/\D/g, '');
    const tickets = this.getTickets();

    // 1. Check in all tickets (Regular & First Shipping)
    for (const t of tickets) {
      if (excludeTicketId && t.id === excludeTicketId) continue;
      if (t.status === 'canceled' || t.status === 'fraud') continue;

      const tPhone = (t.customerPhone || '').replace(/\D/g, '');
      const hasMatch =
        (t.playerGameId && t.playerGameId.trim().toLowerCase() === pId) ||
        (t.items && t.items.some(it => it.playerGameId && it.playerGameId.trim().toLowerCase() === pId));

      if (hasMatch) {
        const isSameCustomer =
          (cleanCurrentPhone && tPhone && cleanCurrentPhone === tPhone) ||
          (currentCustomerId && t.customerId && currentCustomerId === t.customerId);

        if (!isSameCustomer) {
          return {
            isAllowed: false,
            conflictCustomerName: t.customerName,
            conflictCustomerPhone: t.customerPhone,
            conflictTicketNumber: t.ticketNumber
          };
        }
      }
    }

    // 2. Check in savedPlayerGameIds on all registered customers
    const customers = this.getCustomers(true);
    for (const c of customers) {
      if (currentCustomerId && c.id === currentCustomerId) continue;
      const cPhone = (c.phone || '').replace(/\D/g, '');
      if (cleanCurrentPhone && cPhone && cleanCurrentPhone === cPhone) continue;

      if (c.savedPlayerGameIds && c.savedPlayerGameIds.some(id => id.trim().toLowerCase() === pId)) {
        return {
          isAllowed: false,
          conflictCustomerName: c.name,
          conflictCustomerPhone: c.phone
        };
      }
    }

    return { isAllowed: true };
  }

  public registerPlayerGameIdToCustomer(customerIdOrPhone: string, playerGameId: string): void {
    const pId = (playerGameId || '').trim();
    if (!pId) return;

    const customers = this.getCustomers(true);
    const cleanPhone = customerIdOrPhone.replace(/\D/g, '');
    const target = customers.find(
      c => c.id === customerIdOrPhone || (cleanPhone && c.phone.replace(/\D/g, '') === cleanPhone)
    );

    if (target) {
      if (!target.savedPlayerGameIds) target.savedPlayerGameIds = [];
      if (!target.savedPlayerGameIds.includes(pId)) {
        target.savedPlayerGameIds.push(pId);
        this.saveCustomer(target);
      }
    }
  }

  public getCustomerCompletedGames(customerId: string): string[] {
    const tickets = this.getTickets().filter(t => (t.customerId === customerId || t.customerPhone === customerId) && t.status === 'completed');
    const games = new Set<string>();
    tickets.forEach(t => {
      if (t.gameName) games.add(t.gameName);
      if (t.items && t.items.length > 0) {
        t.items.forEach(item => {
          if (item.gameName) games.add(item.gameName);
          if (item.gameId) games.add(item.gameId);
        });
      }
    });
    return Array.from(games);
  }

  public getCustomerLastCompletedPurchaseDate(customerId: string): string | undefined {
    const tickets = this.getTickets().filter(t => (t.customerId === customerId || t.customerPhone === customerId) && t.status === 'completed');
    if (tickets.length === 0) return undefined;
    let latestDate: string | undefined = undefined;
    let maxTime = 0;
    tickets.forEach(t => {
      const d = t.completedAt || t.updatedAt || t.createdAt;
      if (d) {
        const time = new Date(d).getTime();
        if (time > maxTime) {
          maxTime = time;
          latestDate = d;
        }
      }
    });
    return latestDate;
  }

  // Customer Referrals
  public getReferrals(referrerCustomerId?: string): CustomerReferral[] {
    const all = this.getItem<CustomerReferral[]>(STORAGE_KEYS.REFERRALS, initialReferrals);
    if (referrerCustomerId) {
      return all.filter(r => r.referrerCustomerId === referrerCustomerId);
    }
    return all;
  }

  public addReferral(referral: Omit<CustomerReferral, 'id' | 'createdAt'>): CustomerReferral {
    const all = this.getItem<CustomerReferral[]>(STORAGE_KEYS.REFERRALS, initialReferrals);
    const newRef: CustomerReferral = {
      ...referral,
      id: 'ref_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    all.unshift(newRef);
    this.setItem(STORAGE_KEYS.REFERRALS, all);
    return newRef;
  }

  public unlinkCustomerReferral(referredCustomerId: string): boolean {
    const all = this.getItem<CustomerReferral[]>(STORAGE_KEYS.REFERRALS, initialReferrals);
    const index = all.findIndex(r => r.referredCustomerId === referredCustomerId);
    if (index >= 0) {
      all[index].status = 'canceled';
      all[index].isExpired = true;
      this.setItem(STORAGE_KEYS.REFERRALS, all);
      return true;
    }
    return false;
  }

  // Formal Referral Linking Engine with full database relationships & validations
  public linkCustomerReferral(
    referredCustomerId: string,
    referrerCodeInput: string,
    customPromoDays?: number
  ): { success: boolean; message: string; referrer?: Customer } {
    const cleanCode = (referrerCodeInput || '').trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'كود الإحالة غير محدد' };
    }

    const referred = this.getCustomerById(referredCustomerId);
    if (!referred) {
      return { success: false, message: 'العميل المراد ربطه غير موجود في النظام' };
    }

    const allCustomers = this.getCustomers(true);
    const referrer = allCustomers.find(c => c.referralCode?.trim().toUpperCase() === cleanCode);

    if (!referrer) {
      return { success: false, message: `كود الإحالة [${cleanCode}] غير مسجل في النظام` };
    }

    if (referrer.id === referred.id || referrer.referralCode?.toUpperCase() === referred.referralCode?.toUpperCase() || referrer.phone === referred.phone) {
      return { success: false, message: 'لا يمكن للعميل استخدام كود الإحالة الشخصي الخاص به' };
    }

    // Circular Referral Protection: Ensure referrer is not already a descendant of referred customer
    let currentAncestor: Customer | undefined = referrer;
    const visitedAncestors = new Set<string>([referred.id]);
    while (currentAncestor && currentAncestor.referredByCode) {
      const ancCode = currentAncestor.referredByCode.trim().toUpperCase();
      if (visitedAncestors.has(currentAncestor.id) || ancCode === (referred.referralCode || '').trim().toUpperCase()) {
        return { success: false, message: 'لا يمكن إنشاء حلقة إحالة دائرية بين العملاء' };
      }
      visitedAncestors.add(currentAncestor.id);
      currentAncestor = allCustomers.find(c => c.referralCode && c.referralCode.trim().toUpperCase() === ancCode);
      if (currentAncestor && visitedAncestors.has(currentAncestor.id)) {
        break;
      }
    }

    if (referrer.isFrozen || referrer.status === 'suspended') {
      return { success: false, message: 'كود الإحالة يخص حساب شريك أو عميل مجمد أو غير نشط' };
    }

    // Dynamic High Cashback / First Month Duration from param, referee, or referrer (default 30 days)
    const promoDays = customPromoDays || referred.highCashbackDays || referrer.highCashbackDays || 30;

    // Update Referred Customer Record
    const now = new Date();
    const nowISO = now.toISOString();
    const expiryDate = new Date(now.getTime() + promoDays * 24 * 60 * 60 * 1000);
    const expiryDateISO = expiryDate.toISOString();

    referred.referrerId = referrer.id;
    referred.referrerName = referrer.name;
    referred.referrerType = referrer.profileType;
    referred.referredByCode = referrer.referralCode;
    referred.referralLinkedAt = referred.referralLinkedAt || nowISO;
    referred.firstMonthExpiryDate = expiryDateISO;
    referred.highCashbackDays = promoDays;
    referred.highCashbackStartDate = referred.highCashbackStartDate || nowISO.split('T')[0];
    referred.highCashbackEndDate = expiryDateISO.split('T')[0];
    referred.referralProfileStatus = 'active';
    referred.referredAt = referred.referredAt || nowISO;
    this.saveCustomer(referred);

    // Create / Update CustomerReferral Relationship Record
    const allReferrals = this.getItem<CustomerReferral[]>(STORAGE_KEYS.REFERRALS, initialReferrals);
    const existingIdx = allReferrals.findIndex(
      r => r.referredCustomerId === referred.id || (r.referrerCustomerId === referrer.id && r.referredCustomerPhone === referred.phone)
    );

    if (existingIdx >= 0) {
      allReferrals[existingIdx].referrerCustomerId = referrer.id;
      allReferrals[existingIdx].referrerCode = referrer.referralCode;
      allReferrals[existingIdx].referredCustomerName = referred.name;
      allReferrals[existingIdx].referredCustomerPhone = referred.phone;
      allReferrals[existingIdx].linkedAt = allReferrals[existingIdx].linkedAt || nowISO;
      allReferrals[existingIdx].firstMonthExpiryDate = expiryDateISO;
      allReferrals[existingIdx].highCashbackDays = promoDays;
      allReferrals[existingIdx].startDate = referred.highCashbackStartDate;
      allReferrals[existingIdx].endDate = expiryDateISO.split('T')[0];
      allReferrals[existingIdx].daysRemaining = promoDays;
      allReferrals[existingIdx].status = 'active';
    } else {
      allReferrals.unshift({
        id: 'ref_' + Date.now(),
        referrerCustomerId: referrer.id,
        referrerCode: referrer.referralCode,
        referredCustomerId: referred.id,
        referredCustomerName: referred.name,
        referredCustomerPhone: referred.phone,
        referredAt: nowISO,
        linkedAt: nowISO,
        firstMonthExpiryDate: expiryDateISO,
        highCashbackDays: promoDays,
        startDate: nowISO.split('T')[0],
        endDate: expiryDateISO.split('T')[0],
        status: 'active',
        daysRemaining: promoDays,
        isExpired: false,
        totalCommissionFromReferral: 0,
        totalSpentByReferred: 0,
        ticketsCountByReferred: 0,
        hasMadeFirstOrder: false,
        isFrozen: false,
        createdAt: nowISO
      });
    }
    this.setItem(STORAGE_KEYS.REFERRALS, allReferrals);

    // Increment Referrer Monthly Counter
    referrer.monthlyReferredCount = (referrer.monthlyReferredCount || 0) + 1;
    this.saveCustomer(referrer);

    return {
      success: true,
      message: `تم ربط العميل ${referred.name} بنجاح تحت المُحيل [${referrer.name}] لمدة ${promoDays} يوم`,
      referrer
    };
  }

  // Create or Update Customer Referral Profile with customizable duration & rates
  public createOrUpdateCustomerReferralProfile(
    customerId: string,
    options?: {
      highCashbackDays?: number;
      startDate?: string;
      endDate?: string;
      highCashbackRate?: number;
      normalCashbackRate?: number;
      status?: 'active' | 'expired';
    }
  ): { success: boolean; customer: Customer; message: string } {
    const customer = this.getCustomerById(customerId);
    if (!customer) {
      throw new Error(`العميل برقم ${customerId} غير موجود`);
    }

    const now = new Date();
    const startDateStr = options?.startDate || customer.highCashbackStartDate || now.toISOString().split('T')[0];
    const durationDays = options?.highCashbackDays ?? customer.highCashbackDays ?? 30;

    // Calculate End Date
    let endDateStr = options?.endDate;
    if (!endDateStr) {
      const startD = new Date(startDateStr);
      if (!isNaN(startD.getTime())) {
        const endD = new Date(startD.getTime() + durationDays * 24 * 60 * 60 * 1000);
        endDateStr = endD.toISOString().split('T')[0];
      } else {
        const endD = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        endDateStr = endD.toISOString().split('T')[0];
      }
    }

    // Determine status based on current date vs endDateStr
    const endDateTime = new Date(endDateStr).getTime();
    const isPast = !isNaN(endDateTime) && now.getTime() > endDateTime;
    const computedStatus: 'active' | 'expired' = options?.status || (isPast ? 'expired' : 'active');

    // Ensure referral code exists
    if (!customer.referralCode || customer.referralCode.trim() === '') {
      const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
      const suffix = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();
      customer.referralCode = `REF-${suffix}`;
    }

    customer.hasReferralProfile = true;
    customer.referralProfileCreatedAt = customer.referralProfileCreatedAt || now.toISOString();
    customer.highCashbackDays = durationDays;
    customer.highCashbackStartDate = startDateStr;
    customer.highCashbackEndDate = endDateStr;
    customer.referralProfileStatus = computedStatus;

    if (customer.profileType === 'regular' || !customer.profileType) {
      customer.highCashbackRate = 1.0;
      customer.normalCashbackRate = 1.0;
      customer.firstMonthCommissionRate = 1.0;
      customer.lifetimeCommissionRate = 1.0;
      customer.customCommissionRate = 1.0;
    } else {
      if (options?.highCashbackRate !== undefined) {
        customer.highCashbackRate = options.highCashbackRate;
      } else if (customer.highCashbackRate === undefined) {
        customer.highCashbackRate = customer.firstMonthCommissionRate ?? 3.0;
      }

      if (options?.normalCashbackRate !== undefined) {
        customer.normalCashbackRate = options.normalCashbackRate;
      } else if (customer.normalCashbackRate === undefined) {
        customer.normalCashbackRate = customer.lifetimeCommissionRate ?? 1.0;
      }
    }

    this.saveCustomer(customer);
    eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, customer);

    return {
      success: true,
      customer,
      message: `تم ضبط وتحديث بروفايل الإحالة للعميل (${customer.name}) بنجاح لمدة ${durationDays} يوم.`
    };
  }

  // Customer Cashback & Unified Wallet
  public getUnifiedWalletTransactions(customerId?: string): UnifiedWalletTransaction[] {
    const all = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
    if (customerId) {
      return all.filter(c => c.customerId === customerId);
    }
    return all;
  }

  public addUnifiedWalletTransaction(tx: Omit<UnifiedWalletTransaction, 'id' | 'createdAt'>): UnifiedWalletTransaction {
    const all = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
    const newTx: UnifiedWalletTransaction = {
      ...tx,
      id: 'wtx_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    all.unshift(newTx);
    this.setItem(STORAGE_KEYS.CASHBACK, all);

    const customer = this.getCustomerById(tx.customerId);
    if (customer) {
      if (tx.walletType === 'cashback') {
        // Cashback balance is strictly derived from sum of cashback transactions
        const allTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
        const custCbTxs = allTxs.filter(t => t.customerId === customer.id && t.walletType === 'cashback');
        const calculatedCbBalance = Math.max(0, Math.round(custCbTxs.reduce((sum, t) => {
          if (t.type === 'earned' || t.type === 'credit') {
            return sum + (Number(t.amount) || 0);
          } else {
            return sum - (Number(t.amount) || 0);
          }
        }, 0) * 100) / 100);

        const totalEarned = Math.round(custCbTxs
          .filter(t => t.type === 'earned' || t.type === 'credit')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) * 100) / 100;

        customer.cashbackBalance = calculatedCbBalance;
        customer.totalCashbackEarned = totalEarned;
        newTx.balanceAfter = customer.cashbackBalance;
        if (all.length > 0 && all[0].id === newTx.id) {
          all[0].balanceAfter = customer.cashbackBalance;
          this.setItem(STORAGE_KEYS.CASHBACK, all);
        }
      } else if (tx.walletType === 'referral') {
        // Referral wallet balance is strictly derived from sum of referral transactions
        const allTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
        const custRefTxs = allTxs.filter(t => t.customerId === customer.id && t.walletType === 'referral');
        const calculatedRefBalance = Math.max(0, Math.round(custRefTxs.reduce((sum, t) => {
          if (t.type === 'commission' || t.type === 'earned' || t.type === 'credit') {
            return sum + (Number(t.amount) || 0);
          } else {
            return sum - (Number(t.amount) || 0);
          }
        }, 0) * 100) / 100);

        const totalEarned = Math.round(custRefTxs
          .filter(t => t.type === 'commission' || t.type === 'earned')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) * 100) / 100;

        customer.referralWalletBalance = calculatedRefBalance;
        customer.totalReferralCommissionEarned = totalEarned;
        newTx.balanceAfter = customer.referralWalletBalance;
        if (all.length > 0 && all[0].id === newTx.id) {
          all[0].balanceAfter = customer.referralWalletBalance;
          this.setItem(STORAGE_KEYS.CASHBACK, all);
        }
      } else if (tx.walletType === 'account_balance') {
        if (tx.balanceAfter !== undefined) {
          customer.accountBalance = tx.balanceAfter;
          customer.balance = tx.balanceAfter;
        }
      }
      this.saveCustomer(customer);
    }
    return newTx;
  }

  // Manual Primary Debt Clearance (Owner Exclusive - قرار استثنائي للمالك)
  public clearCustomerPrimaryDebt(customerId: string, clearedBy: string): { success: boolean; message: string; clearedAmount: number } {
    const customer = this.getCustomerById(customerId);
    if (!customer) {
      return { success: false, message: 'العميل غير موجود', clearedAmount: 0 };
    }
    const currentDebt = Number(customer.accountBalance ?? customer.balance ?? 0);
    if (currentDebt >= 0) {
      return { success: false, message: 'المحفظة الأساسية لا تحتوي على عجز أو رصيد مدين لتصفيته', clearedAmount: 0 };
    }
    const debtAmount = Math.abs(currentDebt);
    customer.accountBalance = 0;
    customer.balance = 0;
    this.saveCustomer(customer);

    this.addUnifiedWalletTransaction({
      customerId: customer.id,
      walletType: 'account_balance',
      type: 'settlement',
      operationName: `تصفية محفظة بأمر المالك — المبلغ: ${debtAmount} جنيه`,
      amount: debtAmount,
      balanceAfter: 0,
      notes: `تم شطب العجز والتصفية بقرار إداري بواسطة ${clearedBy}`
    });

    this.addCustomerNote({
      customerId: customer.id,
      content: `قام المالك (${clearedBy}) بتصفية المحفظة الأساسية وشطب عجز سداد قدره ${debtAmount} جنيه بالكامل وتحويل الرصيد إلى 0 جنيه.`,
      authorName: clearedBy,
      authorRole: 'إدارة النظام',
      type: 'financial'
    });

    this.logAction(
      { id: 'admin', name: clearedBy, role: 'admin', department: 'الإدارة العامة' },
      'edit',
      'customer',
      customer.id,
      customer.name,
      `تم شطب عجز سداد العميل بقيمة ${debtAmount} ج بأمر المالك (${clearedBy}) وتحويل رصيد المحفظة الأساسية إلى 0 ج`,
      { accountBalance: currentDebt },
      { accountBalance: 0 }
    );

    eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, customer);
    return { success: true, message: `تمت تصفية المحفظة وشطب عجز ${debtAmount} ج بنجاح`, clearedAmount: debtAmount };
  }

  public clearDealerPrimaryDebt(dealerId: string, clearedBy: string): { success: boolean; message: string; clearedAmount: number } {
    const dealer = this.getDealerById(dealerId);
    if (!dealer) {
      return { success: false, message: 'التاجر غير موجود', clearedAmount: 0 };
    }
    const currentDebt = Number(dealer.accountBalance ?? dealer.balance ?? 0);
    if (currentDebt >= 0) {
      return { success: false, message: 'المحفظة الأساسية لا تحتوي على مديونية أو عجز لتصفيته', clearedAmount: 0 };
    }
    const debtAmount = Math.abs(currentDebt);
    dealer.accountBalance = 0;
    dealer.balance = 0;
    this.saveDealer(dealer);

    this.addDealerUnifiedWalletTransaction({
      customerId: dealer.id,
      walletType: 'account_balance',
      type: 'settlement',
      operationName: `تصفية محفظة بأمر المالك — المبلغ: ${debtAmount} جنيه`,
      amount: debtAmount,
      balanceAfter: 0,
      notes: `تم شطب العجز والتصفية بقرار إداري بواسطة ${clearedBy}`
    });

    this.addDealerNote({
      dealerId: dealer.id,
      content: `قام المالك (${clearedBy}) بتصفية المحفظة الأساسية وشطب عجز قدره ${debtAmount} جنيه بالكامل.`,
      authorName: clearedBy,
      authorRole: 'إدارة النظام',
      type: 'financial'
    });

    this.logAction(
      { id: 'admin', name: clearedBy, role: 'admin', department: 'الإدارة العامة' },
      'edit',
      'dealer',
      dealer.id,
      dealer.name,
      `تم شطب عجز ومديونية التاجر بقيمة ${debtAmount} ج بأمر المالك (${clearedBy}) وتحويل رصيد المحفظة الأساسية إلى 0 ج`,
      { accountBalance: currentDebt },
      { accountBalance: 0 }
    );

    eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, dealer);
    eventBus.publish('DEALER_UPDATED', dealer);
    return { success: true, message: `تمت تصفية المحفظة وشطب عجز ${debtAmount} ج بنجاح`, clearedAmount: debtAmount };
  }

  // =============================================================
  // Expiration & Breakage Management Methods (Modification #6)
  // =============================================================
  public getBreakageRecords(): BreakageRecord[] {
    return this.getItem<BreakageRecord[]>(STORAGE_KEYS.BREAKAGE_RECORDS, []);
  }

  public getExtensionRecords(): ExtensionRecord[] {
    return this.getItem<ExtensionRecord[]>(STORAGE_KEYS.EXTENSION_RECORDS, []);
  }

  public extendPartyExpiredBalance(params: {
    partyId: string;
    partyType: 'customer' | 'dealer';
    walletType: 'cashback' | 'referral';
    amount: number;
    extensionMonths: number;
    user?: any;
    notes?: string;
  }): { success: boolean; message: string } {
    const { partyId, partyType, walletType, amount, extensionMonths, user, notes } = params;
    const authorName = user?.name || 'المالك الإداري';
    const now = new Date();
    const newExpiry = new Date(now);
    newExpiry.setMonth(newExpiry.getMonth() + extensionMonths);
    const newExpiryIso = newExpiry.toISOString();

    if (partyType === 'customer') {
      const customer = this.getCustomerById(partyId);
      if (!customer) return { success: false, message: 'العميل غير موجود' };

      const allTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
      let updatedCount = 0;
      const updatedTxs = allTxs.map(tx => {
        if (tx.customerId === partyId && tx.walletType === walletType && (tx.type === 'earned' || tx.type === 'commission' || tx.type === 'credit')) {
          const currentExpiry = new Date(tx.extendedExpiryDate || tx.expiresAt || now.toISOString()).getTime();
          if (currentExpiry <= now.getTime() && tx.isExpiredStatus !== 'transferred') {
            updatedCount++;
            return {
              ...tx,
              extendedExpiryDate: newExpiryIso,
              isExpiredStatus: 'extended' as const,
              expiryActionDate: now.toISOString(),
              expiryActionBy: authorName,
              breakageNotes: notes
            };
          }
        }
        return tx;
      });

      this.setItem(STORAGE_KEYS.CASHBACK, updatedTxs);

      const extRecord: ExtensionRecord = {
        id: 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        partyId,
        partyName: customer.name,
        partyType: 'customer',
        walletType,
        amount,
        extendedMonths: extensionMonths,
        newExpiryDate: newExpiryIso,
        performedBy: authorName,
        notes,
        createdAt: now.toISOString()
      };
      const allExt = this.getExtensionRecords();
      allExt.unshift(extRecord);
      this.setItem(STORAGE_KEYS.EXTENSION_RECORDS, allExt);

      this.addCustomerNote({
        customerId: customer.id,
        content: `تم تمديد صلاحية رصيد ${walletType === 'cashback' ? 'الكاش باك' : 'الإحالة'} المنتهي بمبلغ ${amount} ج لمدة ${extensionMonths} شهر إضافية (تنتهي في ${newExpiryIso.split('T')[0]}). الملاحظة: ${notes || 'قرار المالك'}`,
        authorName,
        authorRole: 'إدارة النظام',
        type: 'financial'
      });

      this.logAction(
        { id: user?.id || 'admin', name: authorName, role: 'admin', department: 'الإدارة العامة' },
        'edit',
        'customer',
        customer.id,
        customer.name,
        `تمديد صلاحية رصيد ${walletType === 'cashback' ? 'كاش باك' : 'إحالة'} (${amount} ج) لمدة ${extensionMonths} شهور إضافية`
      );

      eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, customer);
      return { success: true, message: `تم تمديد صلاحية الرصيد بمبلغ ${amount} ج لمدة ${extensionMonths} شهور بنجاح` };
    } else {
      const dealer = this.getDealerById(partyId);
      if (!dealer) return { success: false, message: 'التاجر غير موجود' };

      const allTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, []);
      let updatedCount = 0;
      const updatedTxs = allTxs.map(tx => {
        if (tx.customerId === partyId && tx.walletType === walletType && (tx.type === 'earned' || tx.type === 'commission' || tx.type === 'credit')) {
          const currentExpiry = new Date(tx.extendedExpiryDate || tx.expiresAt || now.toISOString()).getTime();
          if (currentExpiry <= now.getTime() && tx.isExpiredStatus !== 'transferred') {
            updatedCount++;
            return {
              ...tx,
              extendedExpiryDate: newExpiryIso,
              isExpiredStatus: 'extended' as const,
              expiryActionDate: now.toISOString(),
              expiryActionBy: authorName,
              breakageNotes: notes
            };
          }
        }
        return tx;
      });

      this.setItem(STORAGE_KEYS.DEALER_TRANSACTIONS, updatedTxs);

      const extRecord: ExtensionRecord = {
        id: 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        partyId,
        partyName: dealer.name,
        partyType: 'dealer',
        walletType,
        amount,
        extendedMonths: extensionMonths,
        newExpiryDate: newExpiryIso,
        performedBy: authorName,
        notes,
        createdAt: now.toISOString()
      };
      const allExt = this.getExtensionRecords();
      allExt.unshift(extRecord);
      this.setItem(STORAGE_KEYS.EXTENSION_RECORDS, allExt);

      this.addDealerNote({
        dealerId: dealer.id,
        content: `تم تمديد صلاحية رصيد ${walletType === 'cashback' ? 'كاش باك الجملة' : 'عمولات الإحالة'} المنتهي بمبلغ ${amount} ج لمدة ${extensionMonths} شهر إضافية.`,
        authorName,
        authorRole: 'إدارة النظام',
        type: 'financial'
      });

      this.logAction(
        { id: user?.id || 'admin', name: authorName, role: 'admin', department: 'الإدارة العامة' },
        'edit',
        'dealer',
        dealer.id,
        dealer.name,
        `تمديد صلاحية رصيد تاجر (${walletType}) بمبلغ ${amount} ج لمدة ${extensionMonths} شهور إضافية`
      );

      eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, dealer);
      eventBus.publish('DEALER_UPDATED', dealer);
      return { success: true, message: `تم تمديد صلاحية رصيد التاجر بمبلغ ${amount} ج لمدة ${extensionMonths} شهور بنجاح` };
    }
  }

  public transferExpiredBalanceToBreakage(params: {
    partyId: string;
    partyType: 'customer' | 'dealer';
    walletType: 'cashback' | 'referral';
    amount: number;
    user?: any;
    notes?: string;
  }): { success: boolean; message: string } {
    const { partyId, partyType, walletType, amount, user, notes } = params;
    const authorName = user?.name || 'المالك الإداري';
    const now = new Date();
    const roundedAmount = Math.round(amount * 100) / 100;

    let partyName = '';

    if (partyType === 'customer') {
      const customer = this.getCustomerById(partyId);
      if (!customer) return { success: false, message: 'العميل غير موجود' };
      partyName = customer.name;

      // 1. Deduct from customer wallet
      this.addUnifiedWalletTransaction({
        customerId: customer.id,
        walletType,
        type: 'debit',
        operationName: `تحويل رصيد منتهي الصلاحية كإيراد Breakage (${walletType === 'cashback' ? 'كاش باك' : 'إحالة'})`,
        amount: -roundedAmount,
        balanceAfter: walletType === 'cashback' ? Math.max(0, (customer.cashbackBalance || 0) - roundedAmount) : Math.max(0, (customer.referralWalletBalance || 0) - roundedAmount),
        notes: `تحويل لمحفظة البضاعة الرئيسية بواسطة ${authorName}. ${notes || ''}`
      });

      // Mark affected expired transactions as transferred
      const allTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
      let remainingToMark = roundedAmount;
      const updatedTxs = allTxs.map(tx => {
        if (tx.customerId === partyId && tx.walletType === walletType && (tx.type === 'earned' || tx.type === 'commission' || tx.type === 'credit') && tx.isExpiredStatus !== 'transferred') {
          const expTime = new Date(tx.extendedExpiryDate || tx.expiresAt || now.toISOString()).getTime();
          if (expTime <= now.getTime() && remainingToMark > 0) {
            remainingToMark -= Math.abs(tx.amount);
            return {
              ...tx,
              isExpiredStatus: 'transferred' as const,
              expiryActionDate: now.toISOString(),
              expiryActionBy: authorName,
              breakageNotes: notes
            };
          }
        }
        return tx;
      });
      this.setItem(STORAGE_KEYS.CASHBACK, updatedTxs);

      this.addCustomerNote({
        customerId: customer.id,
        content: `قام المالك (${authorName}) بتحويل رصيد منتهي الصلاحية (${walletType === 'cashback' ? 'كاش باك' : 'إحالة'}) قدره ${roundedAmount} جنيه من محفظة الأمانات إلى محفظة البضاعة الرئيسية كإيراد Breakage. الملاحظة: ${notes || 'انتهاء مدة الصلاحية القانونية'}`,
        authorName,
        authorRole: 'إدارة النظام',
        type: 'financial'
      });
    } else {
      const dealer = this.getDealerById(partyId);
      if (!dealer) return { success: false, message: 'التاجر غير موجود' };
      partyName = dealer.name;

      // 1. Deduct from dealer wallet
      this.addDealerUnifiedWalletTransaction({
        customerId: dealer.id,
        walletType,
        type: 'debit',
        operationName: `تحويل رصيد منتهي الصلاحية كإيراد Breakage (${walletType === 'cashback' ? 'كاش باك' : 'إحالة'})`,
        amount: -roundedAmount,
        balanceAfter: walletType === 'cashback' ? Math.max(0, (dealer.cashbackBalance || 0) - roundedAmount) : Math.max(0, (dealer.referralWalletBalance || 0) - roundedAmount),
        notes: `تحويل لمحفظة البضاعة الرئيسية بواسطة ${authorName}. ${notes || ''}`
      });

      const allTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, []);
      let remainingToMark = roundedAmount;
      const updatedTxs = allTxs.map(tx => {
        if (tx.customerId === partyId && tx.walletType === walletType && (tx.type === 'earned' || tx.type === 'commission' || tx.type === 'credit') && tx.isExpiredStatus !== 'transferred') {
          const expTime = new Date(tx.extendedExpiryDate || tx.expiresAt || now.toISOString()).getTime();
          if (expTime <= now.getTime() && remainingToMark > 0) {
            remainingToMark -= Math.abs(tx.amount);
            return {
              ...tx,
              isExpiredStatus: 'transferred' as const,
              expiryActionDate: now.toISOString(),
              expiryActionBy: authorName,
              breakageNotes: notes
            };
          }
        }
        return tx;
      });
      this.setItem(STORAGE_KEYS.DEALER_TRANSACTIONS, updatedTxs);

      this.addDealerNote({
        dealerId: dealer.id,
        content: `قام المالك (${authorName}) بتحويل رصيد منتهي الصلاحية (${walletType === 'cashback' ? 'كاش باك جملة' : 'إحالة'}) قدره ${roundedAmount} جنيه كإيراد Breakage إلى محفظة البضاعة.`,
        authorName,
        authorRole: 'إدارة النظام',
        type: 'financial'
      });
    }

    // 2. Transfer between Treasury & Store Wallets (Escrow -> Goods/Inventory)
    const storeWallets = this.getStoreWallets();
    const escrowWallet = storeWallets.find(w => w.id === 'w_trust' || w.accountNumber === 'TRUST-ESCROW') || storeWallets[0];
    const goodsWallet = storeWallets.find(w => w.id === 'w_inv_1' || w.type === 'inventory' || w.id === 'w_op_1') || storeWallets[0];

    if (escrowWallet) {
      escrowWallet.balance = Math.round(((escrowWallet.balance || 0) - roundedAmount) * 100) / 100;
    }
    if (goodsWallet) {
      goodsWallet.balance = Math.round(((goodsWallet.balance || 0) + roundedAmount) * 100) / 100;
    }
    this.setItem(STORAGE_KEYS.STORE_WALLETS, storeWallets);

    // 3. Record Safe Transaction as Breakage Revenue
    try {
      this.addSafeTransaction(
        'cash_in',
        roundedAmount,
        'other',
        `إيراد Breakage — تحويل رصيد منتهي الصلاحية (${partyName} - ${walletType === 'cashback' ? 'كاش باك' : 'إحالة'}) من الأمانات إلى محفظة البضاعة`,
        authorName,
        `BRK-${Date.now().toString().slice(-6)}`,
        {
          notes: notes || `تحويل أمانات منتهية كـ Breakage لحساب ${goodsWallet?.name || 'محفظة البضاعة'}`,
          currency: 'EGP'
        }
      );
    } catch (e) {
      console.warn('Could not record safe transaction for breakage:', e);
    }

    // 4. Record Breakage Audit Record
    const breakageRecord: BreakageRecord = {
      id: 'brk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      partyId,
      partyName,
      partyType,
      walletType,
      amount: roundedAmount,
      fromWallet: escrowWallet ? escrowWallet.name : 'محفظة الأمانات',
      toWallet: goodsWallet ? goodsWallet.id : 'w_inv_1',
      toWalletName: goodsWallet ? goodsWallet.name : 'محفظة البضاعة الرئيسية',
      performedBy: authorName,
      notes,
      createdAt: now.toISOString()
    };
    const allBreakage = this.getBreakageRecords();
    allBreakage.unshift(breakageRecord);
    this.setItem(STORAGE_KEYS.BREAKAGE_RECORDS, allBreakage);

    // 5. Audit Log & Notifications
    this.logAction(
      { id: user?.id || 'admin', name: authorName, role: 'admin', department: 'الإدارة العامة' },
      'edit',
      partyType,
      partyId,
      partyName,
      `تحويل رصيد منتهي الصلاحية (${roundedAmount} ج) من الأمانات إلى محفظة البضاعة كإيراد Breakage`
    );

    if (partyType === 'customer') {
      const cust = this.getCustomerById(partyId);
      if (cust) eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, cust);
    } else {
      const dlr = this.getDealerById(partyId);
      if (dlr) {
        eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, dlr);
        eventBus.publish('DEALER_UPDATED', dlr);
      }
    }
    window.dispatchEvent(new CustomEvent('store_wallets_updated'));

    return {
      success: true,
      message: `تم تحويل ${roundedAmount} ج كإيراد Breakage من الأمانات إلى محفظة البضاعة بنجاح`
    };
  }

  // Customer Transactions
  public getCustomerTransactions(customerId?: string): CustomerTransaction[] {
    const all = this.getItem<CustomerTransaction[]>(STORAGE_KEYS.CUSTOMER_TRANSACTIONS, initialCustomerTransactions);
    if (customerId) {
      return all.filter(t => t.customerId === customerId);
    }
    return all;
  }

  public addCustomerTransaction(
    customerId: string,
    type: CustomerTransaction['type'],
    amount: number,
    description: string,
    performedBy: string,
    referenceId?: string
  ): CustomerTransaction {
    const customer = this.getCustomerById(customerId);
    if (!customer) throw new Error('Customer not found');

    const balanceBefore = customer.balance;
    let balanceAfter = balanceBefore;

    if (type === 'deposit' || type === 'refund' || type === 'cashback_in' || type === 'commission_in') {
      balanceAfter += amount;
    } else if (type === 'withdrawal' || type === 'purchase') {
      balanceAfter -= amount;
    } else if (type === 'adjustment') {
      balanceAfter = amount;
    }

    customer.balance = balanceAfter;
    if (type === 'purchase') {
      customer.totalSpent += amount;
      customer.totalOrders += 1;
      customer.maxSingleOrderAmount = Math.max(customer.maxSingleOrderAmount || 0, amount);
      customer.lastPurchaseDate = new Date().toISOString();

      // Loyalty Tiers: عادي (1-9) | فضي (10-29) | ذهبي (30-99) | VIP (100+)
      if (customer.totalOrders >= 100) customer.loyaltyTier = 'vip';
      else if (customer.totalOrders >= 30) customer.loyaltyTier = 'gold';
      else if (customer.totalOrders >= 10) customer.loyaltyTier = 'silver';
      else customer.loyaltyTier = 'normal';

      // Purchasing Power: عادي (0-499) | متوسط (500-1999) | قوي (2000-4500) | حوت (4501+)
      if (customer.maxSingleOrderAmount >= 4501) customer.purchasingPower = 'whale';
      else if (customer.maxSingleOrderAmount >= 2000) customer.purchasingPower = 'strong';
      else if (customer.maxSingleOrderAmount >= 500) customer.purchasingPower = 'medium';
      else customer.purchasingPower = 'normal';
    }

    this.saveCustomer(customer);

    const allTx = this.getItem<CustomerTransaction[]>(STORAGE_KEYS.CUSTOMER_TRANSACTIONS, initialCustomerTransactions);
    const newTx: CustomerTransaction = {
      id: 'tx_' + Date.now(),
      customerId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      description,
      performedBy,
      referenceId,
      createdAt: new Date().toISOString()
    };
    allTx.unshift(newTx);
    this.setItem(STORAGE_KEYS.CUSTOMER_TRANSACTIONS, allTx);

    if (type === 'deposit') {
      this.addSafeTransaction(
        'cash_in',
        amount,
        'customer_deposit',
        `إيداع نقدي مباشر من الزبون ${customer.name} (${customer.code})`,
        performedBy,
        newTx.id
      );
    }

    return newTx;
  }

  // =============================================================
  // DEALERS & WHOLESALE ENGINE METHODS
  // =============================================================

  public getDealers(includeArchived = false): Dealer[] {
    const all = this.getItem<Dealer[]>(STORAGE_KEYS.DEALERS, initialDealers);
    const allDealerTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, initialDealerTransactions);
    const allTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
    const dealerTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.DEALER_TICKETS, []);

    // Set of active, valid tickets (non-canceled, non-refunded)
    const activeTicketNumbers = new Set<string>();
    allTickets.forEach(t => {
      if (t.status !== 'canceled' && t.status !== 'refunded') {
        if (t.ticketNumber) activeTicketNumbers.add(t.ticketNumber);
        if (t.id) activeTicketNumbers.add(t.id);
      }
    });
    dealerTickets.forEach(t => {
      if (t.status !== 'canceled' && t.status !== 'refunded') {
        if (t.ticketNumber) activeTicketNumbers.add(t.ticketNumber);
        if (t.id) activeTicketNumbers.add(t.id);
      }
    });

    // Auto-heal: filter out orphan transactions tied to deleted / canceled tickets
    // Invariant: Non-ticket transactions (transfers CBT-, adjustments CBA-, withdrawals WD, lots, etc.) must NEVER be purged!
    const isTopUpTicketRef = (ref: string) => ref.startsWith('JKR-') || ref.startsWith('TKT-');
    const validDealerTxs = allDealerTxs.filter(tx => {
      if (!tx.orderNumber) return true;
      if (!isTopUpTicketRef(tx.orderNumber)) return true;
      return activeTicketNumbers.has(tx.orderNumber);
    });

    if (validDealerTxs.length !== allDealerTxs.length) {
      this.setItem(STORAGE_KEYS.DEALER_TRANSACTIONS, validDealerTxs);
    }

    let mutated = false;
    const synced = all.map(d => {
      const dealerRefTxs = validDealerTxs.filter(t => t.customerId === d.id && t.walletType === 'referral');
      if (dealerRefTxs.length > 0) {
        const calculatedRefBalance = Math.max(0, Math.round(dealerRefTxs.reduce((sum, tx) => {
          if (tx.type === 'commission' || tx.type === 'earned' || tx.type === 'credit') {
            return sum + (Number(tx.amount) || 0);
          } else {
            return sum - (Number(tx.amount) || 0);
          }
        }, 0) * 100) / 100);

        const totalEarned = Math.round(dealerRefTxs
          .filter(tx => tx.type === 'commission' || tx.type === 'earned')
          .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) * 100) / 100;

        if (d.referralWalletBalance !== calculatedRefBalance || d.totalReferralCommissionEarned !== totalEarned) {
          d.referralWalletBalance = calculatedRefBalance;
          d.totalReferralCommissionEarned = totalEarned;
          mutated = true;
        }
      } else if (
        allDealerTxs.some(t => t.customerId === d.id && t.walletType === 'referral') &&
        ((d.referralWalletBalance || 0) !== 0 || (d.totalReferralCommissionEarned || 0) !== 0)
      ) {
        d.referralWalletBalance = 0;
        d.totalReferralCommissionEarned = 0;
        mutated = true;
      }

      // Reconcile dealer cashbackBalance & totalCashbackEarned with exact sum of ledger transactions
      const dealerCbTxs = validDealerTxs.filter(t => t.customerId === d.id && t.walletType === 'cashback');
      if (dealerCbTxs.length > 0) {
        const calculatedCbBalance = Math.max(0, Math.round(dealerCbTxs.reduce((sum, tx) => {
          if (tx.type === 'earned' || tx.type === 'credit' || tx.type === 'bonus' || (tx.type === 'adjustment' && (tx.amount || 0) > 0)) {
            return sum + (Number(tx.amount) || 0);
          } else {
            return sum - (Number(tx.amount) || 0);
          }
        }, 0) * 100) / 100);

        const totalCbEarned = Math.round(dealerCbTxs
          .filter(tx => tx.type === 'earned' || tx.type === 'credit' || tx.type === 'bonus' || (tx.type === 'adjustment' && (tx.amount || 0) > 0))
          .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) * 100) / 100;

        if (d.cashbackBalance !== calculatedCbBalance || d.totalCashbackEarned !== totalCbEarned) {
          d.cashbackBalance = calculatedCbBalance;
          d.totalCashbackEarned = totalCbEarned;
          mutated = true;
        }
      } else if (
        allDealerTxs.some(t => t.customerId === d.id && t.walletType === 'cashback') &&
        ((d.cashbackBalance || 0) !== 0 || (d.totalCashbackEarned || 0) !== 0)
      ) {
        d.cashbackBalance = 0;
        d.totalCashbackEarned = 0;
        mutated = true;
      }
      if (d.phone) {
        const norm = normalizePhoneNumber(d.phone);
        if (norm && norm !== d.phone) {
          d.phone = norm;
          mutated = true;
        }
      }
      if (d.lifetimeSpendingTier === undefined || d.totalSpentUSD === undefined) {
        return DealerStatisticsService.applyMetrics(d, allTickets);
      }
      return d;
    });
    if (mutated) {
      this.setItem(STORAGE_KEYS.DEALERS, synced);
    }
    return includeArchived ? synced : synced.filter(d => !d.isArchived);
  }

  public getArchivedDealers(): Dealer[] {
    const all = this.getDealers(true);
    return all.filter(d => d.isArchived);
  }

  public getDealerById(id: string): Dealer | undefined {
    if (!id) return undefined;
    return this.getDealers(true).find(d => d.id === id || d.code === id || isSamePhoneNumber(d.phone, id));
  }

  public isDealerPhoneTaken(phone: string, excludeDealerId?: string): boolean {
    if (!phone) return false;
    const norm = normalizePhoneNumber(phone);
    if (!norm) return false;
    return this.getDealers(true).some(d => d.id !== excludeDealerId && isSamePhoneNumber(d.phone, norm));
  }

  public findDealerByPhone(phone: string): Dealer | undefined {
    if (!phone) return undefined;
    return this.getDealers(true).find(d => isSamePhoneNumber(d.phone, phone));
  }

  public isPhoneTaken(
    phone: string,
    excludeId?: string
  ): { taken: boolean; entityType?: 'customer' | 'dealer' | 'subscription_client' | 'middleman_client'; name?: string; phone: string; code?: string } {
    if (!phone) return { taken: false, phone: '' };
    const norm = normalizePhoneNumber(phone);
    if (!norm) return { taken: false, phone: '' };

    const customer = this.getCustomers(true).find(c => c.id !== excludeId && isSamePhoneNumber(c.phone, norm));
    if (customer) {
      return { taken: true, entityType: 'customer', name: customer.name, phone: customer.phone, code: customer.code };
    }

    const dealer = this.getDealers(true).find(d => d.id !== excludeId && isSamePhoneNumber(d.phone, norm));
    if (dealer) {
      return { taken: true, entityType: 'dealer', name: dealer.name, phone: dealer.phone, code: dealer.code };
    }

    const subClient = this.getSubscriptionClients(true).find(s => s.id !== excludeId && isSamePhoneNumber(s.phone, norm));
    if (subClient) {
      return { taken: true, entityType: 'subscription_client', name: subClient.name, phone: subClient.phone, code: subClient.code };
    }

    const mmClient = this.getMiddlemanClients(true).find(m => m.id !== excludeId && isSamePhoneNumber(m.phone, norm));
    if (mmClient) {
      return { taken: true, entityType: 'middleman_client', name: mmClient.name, phone: mmClient.phone, code: mmClient.code };
    }

    return { taken: false, phone: norm };
  }

  public saveDealer(dealer: Dealer): void {
    const dealers = this.getItem<Dealer[]>(STORAGE_KEYS.DEALERS, initialDealers);
    if (!dealer.id) {
      dealer.id = 'dealer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    }

    // Normalize phone number to E.164 standard (+201xxxxxxxxx)
    if (dealer.phone) {
      dealer.phone = normalizePhoneNumber(dealer.phone);
    }

    // Backend Unique Phone Validation: reject duplicate account creation
    if (dealer.phone) {
      const duplicate = dealers.find(d => d.id !== dealer.id && isSamePhoneNumber(d.phone, dealer.phone));
      if (duplicate) {
        throw new Error(
          `رقم الهاتف (${dealer.phone}) مسجل بالفعل بحساب تاجر آخر باسم "${duplicate.name}" (كود: ${duplicate.code || duplicate.id})`
        );
      }
    }

    const index = dealers.findIndex(d => d.id === dealer.id);
    if (index >= 0) {
      dealers[index] = { ...dealer, updatedAt: new Date().toISOString() };
    } else {
      dealers.unshift({
        ...dealer,
        createdAt: dealer.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.setItem(STORAGE_KEYS.DEALERS, dealers);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
    }
  }

  public deleteDealer(dealerId: string): boolean {
    const dealers = this.getItem<Dealer[]>(STORAGE_KEYS.DEALERS, initialDealers);
    const filtered = dealers.filter(d => d.id !== dealerId);
    if (filtered.length !== dealers.length) {
      this.setItem(STORAGE_KEYS.DEALERS, filtered);
      return true;
    }
    return false;
  }

  public archiveDealer(id: string): void {
    const dealers = this.getItem<Dealer[]>(STORAGE_KEYS.DEALERS, initialDealers);
    const index = dealers.findIndex(d => d.id === id);
    if (index >= 0) {
      dealers[index].isArchived = true;
      dealers[index].updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.DEALERS, dealers);
    }
  }

  public restoreDealer(id: string): void {
    const dealers = this.getItem<Dealer[]>(STORAGE_KEYS.DEALERS, initialDealers);
    const index = dealers.findIndex(d => d.id === id);
    if (index >= 0) {
      dealers[index].isArchived = false;
      dealers[index].updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.DEALERS, dealers);
    }
  }

  public recalculateDealerProfile(dealerIdOrPhone: string): Dealer | undefined {
    if (!dealerIdOrPhone) return undefined;
    const dealers = this.getItem<Dealer[]>(STORAGE_KEYS.DEALERS, initialDealers);
    const index = dealers.findIndex(d => d.id === dealerIdOrPhone || d.phone === dealerIdOrPhone || (d.code && d.code === dealerIdOrPhone));
    if (index < 0) return undefined;

    const allTickets = [...this.getTickets(), ...this.getDealerTickets()];
    const updatedDealer = DealerStatisticsService.applyMetrics(dealers[index], allTickets);

    // Synchronize and auto-heal dealer cashback & referral ledger balances
    try {
      let allDealerTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, []);
      let healedTxs = false;

      const targetPhone = updatedDealer.phone ? updatedDealer.phone.trim() : '';
      const dealerCompletedTickets = allTickets.filter(t => 
        (t.customerId === updatedDealer.id || 
         (updatedDealer.code && t.customerId === updatedDealer.code) ||
         (targetPhone && t.customerPhone && isSamePhoneNumber(t.customerPhone, targetPhone))) &&
        t.status === 'completed'
      );

      for (const tkt of dealerCompletedTickets) {
        const ticketExpectedCb = Number(tkt.cashbackEarned || 0);
        if (ticketExpectedCb <= 0) continue;

        const ticketTxs = allDealerTxs.filter(t => 
          (t.customerId === updatedDealer.id || (targetPhone && t.customerId === targetPhone)) &&
          t.orderNumber === tkt.ticketNumber &&
          t.walletType === 'cashback'
        );

        const creditedCb = Math.round(ticketTxs.reduce((sum, t) => {
          if (t.type === 'earned' || t.type === 'credit') return sum + (Number(t.amount) || 0);
          if (t.type === 'debit' || t.type === 'adjustment') return sum - (Number(t.amount) || 0);
          return sum;
        }, 0) * 100) / 100;

        const deltaCb = Math.round((ticketExpectedCb - creditedCb) * 100) / 100;
        if (deltaCb !== 0) {
          allDealerTxs.unshift({
            id: 'dtx_heal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            customerId: updatedDealer.id,
            walletType: 'cashback',
            type: deltaCb > 0 ? 'earned' : 'debit',
            operationName: deltaCb > 0 
              ? `تسوية وتصحيح كاش باك لتذكرة تاجر #${tkt.ticketNumber} (+${deltaCb} ج)`
              : `تسوية وتصحيح كاش باك لتذكرة تاجر #${tkt.ticketNumber} (-${Math.abs(deltaCb)} ج)`,
            amount: Math.abs(deltaCb),
            balanceAfter: Math.max(0, Math.round(((updatedDealer.cashbackBalance || 0) + deltaCb) * 100) / 100),
            orderNumber: tkt.ticketNumber,
            createdAt: new Date().toISOString()
          });
          if (deltaCb > 0) {
            this.creditCashbackToSystemWallet(deltaCb, updatedDealer.name, tkt.ticketNumber, true);
          } else {
            this.debitCashbackFromSystemWallet(Math.abs(deltaCb), updatedDealer.name, tkt.ticketNumber, true);
          }
          healedTxs = true;
        }
      }

      if (healedTxs) {
        this.setItem(STORAGE_KEYS.DEALER_TRANSACTIONS, allDealerTxs);
      }

      // Auto-heal and filter out orphan transactions tied to canceled tickets (preserving refunded and archived tickets)
      const deletedTicketsList = this.getItem<any[]>(STORAGE_KEYS.DELETED_TICKETS, []);
      const activeTktNums = new Set<string>();
      allTickets.forEach(t => {
        if (t.status !== 'canceled') {
          if (t.ticketNumber) activeTktNums.add(t.ticketNumber);
          if (t.id) activeTktNums.add(t.id);
        }
      });
      deletedTicketsList.forEach(t => {
        if (t.ticketNumber) activeTktNums.add(t.ticketNumber);
        if (t.id) activeTktNums.add(t.id);
      });

      const validTxs = allDealerTxs.filter(tx => !tx.orderNumber || activeTktNums.has(tx.orderNumber));
      if (validTxs.length !== allDealerTxs.length) {
        allDealerTxs = validTxs;
        this.setItem(STORAGE_KEYS.DEALER_TRANSACTIONS, allDealerTxs);
      }

      // Re-sum accurate cashbackBalance directly from the unified ledger
      const dealerCbTxs = allDealerTxs.filter(t => 
        (t.customerId === updatedDealer.id || (targetPhone && t.customerId === targetPhone)) && 
        t.walletType === 'cashback'
      );
      if (dealerCbTxs.length > 0) {
        const calcCb = Math.max(0, Math.round(dealerCbTxs.reduce((sum, t) => {
          if (t.type === 'earned' || t.type === 'credit') return sum + (Number(t.amount) || 0);
          return sum - (Number(t.amount) || 0);
        }, 0) * 100) / 100);
        const totalEarned = Math.round(dealerCbTxs
          .filter(t => t.type === 'earned' || t.type === 'credit')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) * 100) / 100;
        updatedDealer.cashbackBalance = calcCb;
        updatedDealer.totalCashbackEarned = totalEarned;
      } else {
        updatedDealer.cashbackBalance = 0;
        updatedDealer.totalCashbackEarned = 0;
      }

      // Re-sum referral wallet balance directly from ledger
      const dealerRefTxs = allDealerTxs.filter(t => 
        (t.customerId === updatedDealer.id || (targetPhone && t.customerId === targetPhone)) && 
        t.walletType === 'referral'
      );
      if (dealerRefTxs.length > 0) {
        const calcRef = Math.max(0, Math.round(dealerRefTxs.reduce((sum, t) => {
          if (t.type === 'commission' || t.type === 'earned' || t.type === 'credit') return sum + (Number(t.amount) || 0);
          return sum - (Number(t.amount) || 0);
        }, 0) * 100) / 100);
        const totalRefEarned = Math.round(dealerRefTxs
          .filter(t => t.type === 'commission' || t.type === 'earned')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) * 100) / 100;
        updatedDealer.referralWalletBalance = calcRef;
        updatedDealer.totalReferralCommissionEarned = totalRefEarned;
      } else {
        updatedDealer.referralWalletBalance = 0;
        updatedDealer.totalReferralCommissionEarned = 0;
      }
    } catch (e) {
      console.warn('Error during dealer ledger cashback recalculation:', e);
    }

    dealers[index] = updatedDealer;
    this.setItem(STORAGE_KEYS.DEALERS, dealers);
    eventBus.publish(SYSTEM_EVENTS.DEALER_UPDATED, updatedDealer);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('dealer_wallets_updated', { detail: { dealerId: updatedDealer.id } }));
    }
    return updatedDealer;
  }

  public recalculateAllDealerProfiles(): void {
    const dealers = this.getItem<Dealer[]>(STORAGE_KEYS.DEALERS, initialDealers);
    const allTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
    const updated = dealers.map(d => DealerStatisticsService.applyMetrics(d, allTickets));
    this.setItem(STORAGE_KEYS.DEALERS, updated);
  }

  // Dealer Notes
  public getDealerNotes(dealerId: string): DealerNote[] {
    const allNotes = this.getItem<DealerNote[]>(STORAGE_KEYS.DEALER_NOTES, initialDealerNotes);
    return allNotes.filter(n => n.dealerId === dealerId);
  }

  public addDealerNote(note: Omit<DealerNote, 'id' | 'createdAt'>): DealerNote {
    const allNotes = this.getItem<DealerNote[]>(STORAGE_KEYS.DEALER_NOTES, initialDealerNotes);
    const newNote: DealerNote = {
      ...note,
      id: 'dnote_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    allNotes.unshift(newNote);
    this.setItem(STORAGE_KEYS.DEALER_NOTES, allNotes);

    const dealer = this.getDealerById(note.dealerId);
    if (dealer) {
      dealer.notesCount = (dealer.notesCount || 0) + 1;
      this.saveDealer(dealer);
    }
    return newNote;
  }

  public deleteDealerNote(noteId: string): void {
    const allNotes = this.getItem<DealerNote[]>(STORAGE_KEYS.DEALER_NOTES, initialDealerNotes);
    const filtered = allNotes.filter(n => n.id !== noteId);
    this.setItem(STORAGE_KEYS.DEALER_NOTES, filtered);
  }

  // Dealer Referrals
  public getDealerReferrals(referrerDealerId?: string): DealerReferral[] {
    const all = this.getItem<DealerReferral[]>(STORAGE_KEYS.DEALER_REFERRALS, initialDealerReferrals);
    if (referrerDealerId) {
      return all.filter(r => r.referrerDealerId === referrerDealerId);
    }
    return all;
  }

  public addDealerReferral(referral: Omit<DealerReferral, 'id'>): DealerReferral {
    const all = this.getItem<DealerReferral[]>(STORAGE_KEYS.DEALER_REFERRALS, initialDealerReferrals);
    const newRef: DealerReferral = {
      ...referral,
      id: 'dref_' + Date.now()
    };
    all.unshift(newRef);
    this.setItem(STORAGE_KEYS.DEALER_REFERRALS, all);
    return newRef;
  }

  public linkDealerReferral(
    referredDealerId: string,
    referralCodeEntered: string
  ): { success: boolean; message: string } {
    const cleanCode = referralCodeEntered.trim().toUpperCase();
    const referred = this.getDealerById(referredDealerId);
    if (!referred) {
      return { success: false, message: 'التاجر المراد ربطه غير موجود في النظام' };
    }

    const allDealers = this.getDealers(true);
    const referrer = allDealers.find(d => d.referralCode?.trim().toUpperCase() === cleanCode);

    if (!referrer) {
      return { success: false, message: `كود الإحالة [${cleanCode}] غير مسجل لأي تاجر في النظام` };
    }

    if (referrer.id === referred.id || referrer.referralCode?.toUpperCase() === referred.referralCode?.toUpperCase() || referrer.phone === referred.phone) {
      return { success: false, message: 'لا يمكن للتاجر استخدام كود الإحالة الشخصي الخاص به' };
    }

    if (referrer.isFrozen || referrer.status === 'suspended') {
      return { success: false, message: 'كود الإحالة يخص حساب تاجر مجمد أو غير نشط' };
    }

    const now = new Date();
    const nowISO = now.toISOString();
    const expiryDateISO = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    referred.referrerId = referrer.id;
    referred.referrerName = referrer.name;
    referred.referrerType = referrer.profileType;
    referred.referredByCode = referrer.referralCode;
    referred.referralLinkedAt = referred.referralLinkedAt || nowISO;
    referred.firstMonthExpiryDate = referred.firstMonthExpiryDate || expiryDateISO;
    referred.referredAt = referred.referredAt || nowISO;
    this.saveDealer(referred);

    const allReferrals = this.getItem<DealerReferral[]>(STORAGE_KEYS.DEALER_REFERRALS, initialDealerReferrals);
    const existingIdx = allReferrals.findIndex(
      r => r.referredDealerId === referred.id || (r.referrerDealerId === referrer.id && r.referredDealerPhone === referred.phone)
    );

    if (existingIdx >= 0) {
      allReferrals[existingIdx].referrerDealerId = referrer.id;
      allReferrals[existingIdx].referrerDealerCode = referrer.referralCode;
      allReferrals[existingIdx].referrerDealerName = referrer.name;
      allReferrals[existingIdx].referredDealerName = referred.name;
      allReferrals[existingIdx].referredDealerPhone = referred.phone;
      allReferrals[existingIdx].status = 'active';
    } else {
      allReferrals.unshift({
        id: 'dref_' + Date.now(),
        referrerDealerId: referrer.id,
        referrerDealerName: referrer.name,
        referrerDealerCode: referrer.referralCode,
        referredDealerId: referred.id,
        referredDealerName: referred.name,
        referredDealerPhone: referred.phone,
        referredDealerCode: referred.code,
        referredAt: nowISO,
        firstMonthExpiryDate: expiryDateISO,
        isFirstMonthActive: true,
        firstMonthCommissionRate: referrer.firstMonthCommissionRate || 3.0,
        lifetimeCommissionRate: referrer.lifetimeCommissionRate || 1.0,
        totalFirstMonthCommissionsEarned: 0,
        totalLifetimeCommissionsEarned: 0,
        totalOrdersByReferred: 0,
        totalSpentByReferred: 0,
        status: 'active'
      });
    }
    this.setItem(STORAGE_KEYS.DEALER_REFERRALS, allReferrals);
    return { success: true, message: `تم ربط التاجر "${referred.name}" بكود التاجر "${referrer.name}" بنجاح` };
  }

  // Dealer Unified Wallet Transactions
  public getDealerUnifiedWalletTransactions(dealerId?: string): UnifiedWalletTransaction[] {
    const all = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, []);
    if (dealerId) {
      return all.filter(t => t.customerId === dealerId);
    }
    return all;
  }

  public addDealerUnifiedWalletTransaction(
    tx: Omit<UnifiedWalletTransaction, 'id' | 'createdAt'>
  ): UnifiedWalletTransaction {
    const all = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, []);
    const newTx: UnifiedWalletTransaction = {
      ...tx,
      id: 'dtx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    all.unshift(newTx);
    this.setItem(STORAGE_KEYS.DEALER_TRANSACTIONS, all);

    const dealer = this.getDealerById(tx.customerId);
    if (dealer) {
      if (tx.walletType === 'cashback') {
        const allTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, []);
        const dealerCbTxs = allTxs.filter(t => t.customerId === dealer.id && t.walletType === 'cashback');
        const calculatedCbBalance = Math.max(0, Math.round(dealerCbTxs.reduce((sum, t) => {
          if (t.type === 'earned' || t.type === 'credit') {
            return sum + (Number(t.amount) || 0);
          } else {
            return sum - (Number(t.amount) || 0);
          }
        }, 0) * 100) / 100);

        const totalEarned = Math.round(dealerCbTxs
          .filter(t => t.type === 'earned' || t.type === 'credit')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) * 100) / 100;

        dealer.cashbackBalance = calculatedCbBalance;
        dealer.totalCashbackEarned = totalEarned;
        newTx.balanceAfter = dealer.cashbackBalance;
        if (all.length > 0 && all[0].id === newTx.id) {
          all[0].balanceAfter = dealer.cashbackBalance;
          this.setItem(STORAGE_KEYS.DEALER_TRANSACTIONS, all);
        }
      } else if (tx.walletType === 'referral') {
        const allTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, []);
        const dealerRefTxs = allTxs.filter(t => t.customerId === dealer.id && t.walletType === 'referral');
        const calculatedRefBalance = Math.max(0, Math.round(dealerRefTxs.reduce((sum, t) => {
          if (t.type === 'commission' || t.type === 'earned' || t.type === 'credit') {
            return sum + (Number(t.amount) || 0);
          } else {
            return sum - (Number(t.amount) || 0);
          }
        }, 0) * 100) / 100);

        const totalEarned = Math.round(dealerRefTxs
          .filter(t => t.type === 'commission' || t.type === 'earned')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) * 100) / 100;

        dealer.referralWalletBalance = calculatedRefBalance;
        dealer.totalReferralCommissionEarned = totalEarned;
        newTx.balanceAfter = dealer.referralWalletBalance;
        if (all.length > 0 && all[0].id === newTx.id) {
          all[0].balanceAfter = dealer.referralWalletBalance;
          this.setItem(STORAGE_KEYS.DEALER_TRANSACTIONS, all);
        }
      } else if (tx.walletType === 'account_balance') {
        if (tx.balanceAfter !== undefined) {
          dealer.accountBalance = tx.balanceAfter;
          dealer.balance = tx.balanceAfter;
        }
      }
      this.saveDealer(dealer);
    }
    return newTx;
  }

  // Dealer Module Settings
  public getDealerModuleSettings(): DealerModuleSettings {
    return this.getItem<DealerModuleSettings>(STORAGE_KEYS.DEALER_MODULE_SETTINGS, initialDealerModuleSettings);
  }

  public saveDealerModuleSettings(settings: DealerModuleSettings): void {
    this.setItem(STORAGE_KEYS.DEALER_MODULE_SETTINGS, settings);
  }

  public updateDealerModuleSettings(newSettings: Partial<DealerModuleSettings>): DealerModuleSettings {
    const current = this.getDealerModuleSettings();
    const updated = { ...current, ...newSettings };
    this.setItem(STORAGE_KEYS.DEALER_MODULE_SETTINGS, updated);
    return updated;
  }

  // Dealer Pricing Audit Logs
  public getDealerPricingAuditLogs(): DealerPricingAuditLog[] {
    return this.getItem<DealerPricingAuditLog[]>(STORAGE_KEYS.DEALER_PRICING_AUDIT_LOGS, []);
  }

  public saveDealerPricingAuditLogs(logs: DealerPricingAuditLog[]): void {
    this.setItem(STORAGE_KEYS.DEALER_PRICING_AUDIT_LOGS, logs);
  }

  public addDealerPricingAuditLog(log: Omit<DealerPricingAuditLog, 'id' | 'timestamp'>): DealerPricingAuditLog {
    const all = this.getDealerPricingAuditLogs();
    const newLog: DealerPricingAuditLog = {
      ...log,
      id: 'aud_dlr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString()
    };
    all.unshift(newLog);
    this.saveDealerPricingAuditLogs(all.slice(0, 200));
    return newLog;
  }

  // Safe / Vault
  public getSafeTransactions(): SafeTransaction[] {
    return this.getItem<SafeTransaction[]>(STORAGE_KEYS.SAFE_TRANSACTIONS, initialSafeTransactions);
  }

  public getVaultBalance(): number {
    return this.getMainVaultSummary().balanceEGP;
  }

  public getMainVaultSummary() {
    const txs = this.getSafeTransactions();
    let balanceEGP = this.getSettings().vaultInitialBalance || 0;
    let balanceUSD = 0;
    let totalUsdPurchased = 0;
    let totalUsdCostEGP = 0;
    let totalRevenueEGP = 0;
    let totalExpensesEGP = 0;
    const lastUpdated = txs.length > 0 ? txs[0].createdAt : new Date().toISOString();

    // Loop through transactions in chronological order to compute running balances and weighted average
    const chronological = [...txs].reverse();
    for (const tx of chronological) {
      if (tx.type === 'exchange') {
        const uAmt = tx.usdAmount || (tx.usdExchangeRate ? tx.amount / tx.usdExchangeRate : 0);
        const egpAmt = tx.egpAmount || tx.amount;
        const uRate = tx.usdExchangeRate || (uAmt > 0 ? egpAmt / uAmt : 50);

        if (tx.exchangeType === 'buy_usd') {
          balanceEGP -= egpAmt;
          balanceUSD += uAmt;
          totalUsdPurchased += uAmt;
          totalUsdCostEGP += egpAmt;
        } else if (tx.exchangeType === 'sell_usd') {
          balanceUSD = Math.max(0, balanceUSD - uAmt);
          balanceEGP += egpAmt;
          const currentAvg = totalUsdPurchased > 0 ? totalUsdCostEGP / totalUsdPurchased : uRate;
          totalUsdPurchased = Math.max(0, totalUsdPurchased - uAmt);
          totalUsdCostEGP = Math.max(0, totalUsdCostEGP - (uAmt * currentAvg));
        }
      } else if (tx.currency === 'USD') {
        const uAmt = tx.usdAmount ?? (tx.usdExchangeRate ? tx.amount / tx.usdExchangeRate : tx.amount);
        const uRate = tx.usdExchangeRate || 50;
        const isInternalUSD = tx.category === 'capital' || tx.category === 'shift_settlement' || tx.category === 'wallet_transfer' || tx.category === 'currency_exchange';
        if (tx.type === 'cash_in') {
          balanceUSD += uAmt;
          totalUsdPurchased += uAmt;
          totalUsdCostEGP += uAmt * uRate;
          if (!isInternalUSD) {
            totalRevenueEGP += uAmt * uRate;
          }
        } else if (tx.type === 'cash_out') {
          balanceUSD = Math.max(0, balanceUSD - uAmt);
          if (!isInternalUSD) {
            totalExpensesEGP += uAmt * uRate;
          }
        }
      } else {
        // EGP
        const isInternalEGP = tx.category === 'capital' || tx.category === 'shift_settlement' || tx.category === 'wallet_transfer' || tx.category === 'currency_exchange';
        if (tx.type === 'cash_in' || (tx.type === 'settlement' && tx.amount >= 0)) {
          balanceEGP += tx.amount;
          if (!isInternalEGP) {
            totalRevenueEGP += tx.amount;
          }
        } else if (tx.type === 'cash_out' || (tx.type === 'settlement' && tx.amount < 0)) {
          balanceEGP -= Math.abs(tx.amount);
          if (!isInternalEGP) {
            totalExpensesEGP += Math.abs(tx.amount);
          }
        }
      }
    }

    const avgUsdPurchaseRate = totalUsdPurchased > 0 ? totalUsdCostEGP / totalUsdPurchased : 50;
    const netBalanceEGP = balanceEGP + balanceUSD * avgUsdPurchaseRate;

    return {
      balanceEGP: Math.round(balanceEGP * 100) / 100,
      balanceUSD: Math.round(balanceUSD * 100) / 100,
      totalUsdPurchased: Math.round(totalUsdPurchased * 100) / 100,
      totalUsdCostEGP: Math.round(totalUsdCostEGP * 100) / 100,
      avgUsdPurchaseRate: Math.round(avgUsdPurchaseRate * 100) / 100,
      totalRevenueEGP: Math.round(totalRevenueEGP * 100) / 100,
      totalExpensesEGP: Math.round(totalExpensesEGP * 100) / 100,
      netBalanceEGP: Math.round(netBalanceEGP * 100) / 100,
      lastUpdated
    };
  }

  public addSafeTransaction(
    type: SafeTransaction['type'],
    amount: number,
    category: SafeTransaction['category'],
    description: string,
    performedBy: string,
    referenceId?: string,
    options?: {
      currency?: 'EGP' | 'USD';
      usdAmount?: number;
      usdExchangeRate?: number;
      operationNumber?: string;
      notes?: string;
      vaultId?: string;
      user?: any;
    }
  ): SafeTransaction {
    const txs = this.getSafeTransactions();
    const isUSD = options?.currency === 'USD';
    const vaultSummary = this.getMainVaultSummary();

    const currentBalanceEGP = vaultSummary.balanceEGP;
    const currentBalanceUSD = vaultSummary.balanceUSD;

    let newBalanceEGP = currentBalanceEGP;
    let newBalanceUSD = currentBalanceUSD;

    const opNum = options?.operationNumber || `TX-${Date.now().toString().slice(-6)}`;

    // Idempotency Protection: If an explicit operationNumber or referenceId was provided, check for existing transaction
    if (options?.operationNumber || referenceId) {
      const existingTx = txs.find(t => 
        (options?.operationNumber && t.operationNumber === options.operationNumber) ||
        (referenceId && t.referenceId === referenceId && t.type === type && t.category === category && Math.abs(t.amount - amount) < 0.001)
      );
      if (existingTx) {
        return existingTx;
      }
    }

    if (isUSD) {
      const uAmt = options?.usdAmount ?? (options?.usdExchangeRate ? amount / options.usdExchangeRate : amount);
      if (type === 'cash_in') {
        newBalanceUSD += uAmt;
      } else if (type === 'cash_out') {
        newBalanceUSD = Math.max(0, newBalanceUSD - uAmt);
      }
    } else {
      if (type === 'cash_in' || (type === 'settlement' && amount >= 0)) {
        newBalanceEGP += amount;
      } else if (type === 'cash_out' || (type === 'settlement' && amount < 0)) {
        newBalanceEGP -= Math.abs(amount);
      }
    }

    const newTx: SafeTransaction = {
      id: 'st_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type,
      amount,
      balanceAfter: isUSD ? newBalanceUSD : newBalanceEGP,
      category,
      description,
      performedBy,
      referenceId,
      createdAt: new Date().toISOString(),
      currency: options?.currency || 'EGP',
      usdAmount: options?.usdAmount,
      usdExchangeRate: options?.usdExchangeRate,
      balanceAfterUSD: newBalanceUSD,
      balanceBefore: isUSD ? currentBalanceUSD : currentBalanceEGP,
      balanceBeforeUSD: currentBalanceUSD,
      operationNumber: opNum,
      notes: options?.notes,
      vaultId: options?.vaultId || 'main_vault'
    };

    txs.unshift(newTx);
    this.setItem(STORAGE_KEYS.SAFE_TRANSACTIONS, txs);

    // Audit Log recording
    const userObj = options?.user || {
      id: 'usr_' + performedBy,
      name: performedBy,
      role: 'staff',
      department: 'المالية'
    };
    try {
      this.addAuditLog(
        userObj,
        'vault_transaction',
        'safe_transaction',
        newTx.id,
        `${type === 'cash_in' ? 'إيداع' : 'صرف'}: ${amount} ${newTx.currency} - ${description}`,
        { balanceBefore: newTx.balanceBefore },
        { balanceAfter: newTx.balanceAfter, balanceAfterUSD: newTx.balanceAfterUSD }
      );
    } catch (e) {
      console.warn('Could not add audit log for safe transaction:', e);
    }

    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, newTx);
    return newTx;
  }

  public deleteSafeTransaction(id: string, user?: any, reason?: string): boolean {
    const txs = this.getSafeTransactions();
    const target = txs.find(t => t.id === id);
    if (!target) return false;

    this.setItem(STORAGE_KEYS.SAFE_TRANSACTIONS, txs.filter(t => t.id !== id));

    const userObj = user || { id: 'usr_' + (target.performedBy || 'admin'), name: target.performedBy || 'المسؤول', role: 'admin', department: 'المالية' };
    try {
      this.addAuditLog(
        userObj,
        'delete',
        'safe_transaction',
        id,
        `حذف حركة خزنة (${target.type === 'cash_in' ? 'إيداع' : 'صرف'}): ${target.amount} ${target.currency || 'EGP'}${reason ? ` — السبب: ${reason}` : ''}`,
        target,
        null
      );
    } catch (e) {}

    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, { type: 'delete', id });
    return true;
  }

  public updateSafeTransaction(id: string, updates: Partial<SafeTransaction>, user?: any): SafeTransaction | null {
    const txs = this.getSafeTransactions();
    const idx = txs.findIndex(t => t.id === id);
    if (idx < 0) return null;

    const oldTx = { ...txs[idx] };
    txs[idx] = { ...txs[idx], ...updates, updatedAt: new Date().toISOString() };
    this.setItem(STORAGE_KEYS.SAFE_TRANSACTIONS, txs);

    const userObj = user || { id: 'usr_' + (txs[idx].performedBy || 'admin'), name: txs[idx].performedBy || 'المسؤول', role: 'admin', department: 'المالية' };
    try {
      this.addAuditLog(
        userObj,
        'edit',
        'safe_transaction',
        id,
        `تعديل حركة خزنة: ${txs[idx].operationNumber || id}`,
        oldTx,
        txs[idx]
      );
    } catch (e) {}

    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, txs[idx]);
    return txs[idx];
  }

  public exchangeSafeCurrency(
    exchangeType: 'buy_usd' | 'sell_usd',
    usdAmount: number,
    usdExchangeRate: number,
    description: string,
    performedBy: string,
    notes?: string,
    user?: any
  ): SafeTransaction {
    const txs = this.getSafeTransactions();
    const vaultSummary = this.getMainVaultSummary();

    const currentBalanceEGP = vaultSummary.balanceEGP;
    const currentBalanceUSD = vaultSummary.balanceUSD;

    const egpAmount = Math.round(usdAmount * usdExchangeRate * 100) / 100;

    let newBalanceEGP = currentBalanceEGP;
    let newBalanceUSD = currentBalanceUSD;

    if (exchangeType === 'buy_usd') {
      if (egpAmount > currentBalanceEGP) {
        throw new Error(`رصيد الجنيه في الخزنة (${currentBalanceEGP.toLocaleString()} ج.م) لا يكفي لشراء $${usdAmount} بتكلفة ${egpAmount.toLocaleString()} ج.م`);
      }
      newBalanceEGP -= egpAmount;
      newBalanceUSD += usdAmount;
    } else {
      if (usdAmount > currentBalanceUSD) {
        throw new Error(`رصيد الدولار في الخزنة ($${currentBalanceUSD.toLocaleString()}) لا يكفي لبيع $${usdAmount}`);
      }
      newBalanceUSD = Math.max(0, newBalanceUSD - usdAmount);
      newBalanceEGP += egpAmount;
    }

    const opNum = `EX-${Date.now().toString().slice(-6)}`;

    const newTx: SafeTransaction = {
      id: 'st_ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: 'exchange',
      exchangeType,
      amount: egpAmount,
      balanceAfter: Math.round(newBalanceEGP * 100) / 100,
      balanceBefore: Math.round(currentBalanceEGP * 100) / 100,
      category: 'currency_exchange',
      description: description || (exchangeType === 'buy_usd' ? `شراء دولار: $${usdAmount} بسعر ${usdExchangeRate} ج.م` : `بيع دولار: $${usdAmount} بسعر ${usdExchangeRate} ج.م`),
      performedBy,
      createdAt: new Date().toISOString(),
      currency: exchangeType === 'buy_usd' ? 'USD' : 'EGP',
      usdAmount,
      usdExchangeRate,
      egpAmount,
      balanceBeforeUSD: Math.round(currentBalanceUSD * 100) / 100,
      balanceAfterUSD: Math.round(newBalanceUSD * 100) / 100,
      operationNumber: opNum,
      notes,
      vaultId: 'main_vault'
    };

    txs.unshift(newTx);
    this.setItem(STORAGE_KEYS.SAFE_TRANSACTIONS, txs);

    const userObj = user || {
      id: 'usr_' + performedBy,
      name: performedBy,
      role: 'staff',
      department: 'المالية'
    };
    try {
      this.addAuditLog(
        userObj,
        'vault_exchange',
        'safe_transaction',
        newTx.id,
        `${exchangeType === 'buy_usd' ? 'شراء دولار' : 'بيع دولار'}: $${usdAmount} بسعر ${usdExchangeRate} ج.م (الإجمالي: ${egpAmount} ج.م)`,
        { balanceBeforeEGP: currentBalanceEGP, balanceBeforeUSD: currentBalanceUSD },
        { balanceAfterEGP: newTx.balanceAfter, balanceAfterUSD: newTx.balanceAfterUSD }
      );
    } catch (e) {
      console.warn('Could not add audit log for safe currency exchange:', e);
    }

    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, newTx);
    return newTx;
  }

  // Daily Closures & 24h Settlement
  public getDailyClosures(): DailyClosureReport[] {
    return this.getItem<DailyClosureReport[]>(STORAGE_KEYS.DAILY_CLOSURES, []);
  }

  public saveDailyClosure(report: DailyClosureReport, user?: any): void {
    const list = this.getDailyClosures();
    list.unshift(report);
    this.setItem(STORAGE_KEYS.DAILY_CLOSURES, list);
    if (user) {
      try {
        this.addAuditLog(
          user,
          'settlement_close',
          'settlement',
          report.id,
          `تقرير إغلاق وتسوية يومية لتاريخ ${report.date}`,
          null,
          report
        );
      } catch (e) {}
    }
    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, report);
  }

  // Expenses
  public getExpenses(includeArchived = false): Expense[] {
    const all = this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
    return includeArchived ? all : all.filter(e => !e.isArchived);
  }

  public addExpense(
    expense: Omit<Expense, 'id' | 'createdAt' | 'isArchived'>,
    performedBy: string,
    user?: any
  ): Expense {
    const all = this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
    const newExpense: Expense = {
      ...expense,
      id: 'exp_' + Date.now(),
      createdAt: new Date().toISOString(),
      isArchived: false
    };
    all.unshift(newExpense);
    this.setItem(STORAGE_KEYS.EXPENSES, all);

    if (expense.paidFromVault) {
      this.addSafeTransaction(
        'cash_out',
        expense.amount,
        'expense',
        `دفع مصروف: ${expense.title} (${expense.paymentMethod || 'نقدية'})`,
        performedBy,
        newExpense.id,
        {
          currency: expense.currency || 'EGP',
          usdAmount: expense.currency === 'USD' ? expense.amount : undefined,
          usdExchangeRate: expense.usdExchangeRate,
          notes: expense.notes,
          vaultId: expense.vaultId || 'main_vault',
          user
        }
      );
    }

    const userObj = user || { id: 'usr_' + performedBy, name: performedBy, role: 'staff', department: 'المالية' };
    try {
      this.addAuditLog(
        userObj,
        'add',
        'expense',
        newExpense.id,
        `تسجيل مصروف: ${newExpense.title} بقيمة ${newExpense.amount} ${newExpense.currency || 'EGP'} (${newExpense.category})`,
        null,
        newExpense
      );
    } catch (e) {}

    eventBus.publish(SYSTEM_EVENTS.EXPENSE_ADDED, newExpense);
    return newExpense;
  }

  public archiveExpense(id: string, user?: any): void {
    const all = this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
    const item = all.find(e => e.id === id);
    if (item) {
      item.isArchived = true;
      this.setItem(STORAGE_KEYS.EXPENSES, all);
      if (user) {
        try {
          this.addAuditLog(user, 'archive', 'expense', id, `أرشفة المصروف: ${item.title}`);
        } catch (e) {}
      }
      eventBus.publish(SYSTEM_EVENTS.EXPENSE_ADDED, item);
    }
  }

  public deleteExpense(id: string, user?: any): void {
    const all = this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
    const item = all.find(e => e.id === id);
    this.setItem(STORAGE_KEYS.EXPENSES, all.filter(e => e.id !== id));
    if (user && item) {
      try {
        this.addAuditLog(user, 'delete', 'expense', id, `حذف المصروف: ${item.title}`);
      } catch (e) {}
    }
    eventBus.publish(SYSTEM_EVENTS.EXPENSE_ADDED, { id });
  }

  public saveExpense(expense: Expense, user?: any): void {
    const all = this.getItem<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
    const idx = all.findIndex(e => e.id === expense.id);
    if (idx >= 0) all[idx] = expense;
    else all.unshift(expense);
    this.setItem(STORAGE_KEYS.EXPENSES, all);
    if (user) {
      try {
        this.addAuditLog(user, 'edit', 'expense', expense.id, `تعديل المصروف: ${expense.title}`);
      } catch (e) {}
    }
    eventBus.publish(SYSTEM_EVENTS.EXPENSE_ADDED, expense);
  }

  // Debts
  public getDebts(includeArchived = false): Debt[] {
    const all = this.getItem<Debt[]>(STORAGE_KEYS.DEBTS, initialDebts);
    return includeArchived ? all : all.filter(d => !d.isArchived);
  }

  public getDebtById(id: string): Debt | undefined {
    return this.getDebts(true).find(d => d.id === id);
  }

  public saveDebt(debt: Debt, user?: any, options?: { depositToVault?: boolean; depositNotes?: string }): Debt {
    const debts = this.getItem<Debt[]>(STORAGE_KEYS.DEBTS, initialDebts);
    const index = debts.findIndex(d => d.id === debt.id);
    const isNew = index < 0;
    const shouldDeposit = options?.depositToVault !== undefined ? options.depositToVault : Boolean(debt.depositToVault);

    // 1. If this is a new payable debt and deposit to vault is requested, record Cash-In in the main safe
    if (isNew && shouldDeposit && debt.totalAmount > 0) {
      const isUSD = debt.currency === 'USD';
      // Guard against duplicate safe transaction
      const existingTxs = this.getSafeTransactions();
      const duplicate = existingTxs.find(
        t => t.referenceId === debt.id && t.type === 'cash_in'
      );
      if (!duplicate) {
        const safeTx = this.addSafeTransaction(
          'cash_in',
          debt.totalAmount,
          'capital',
          `إيداع نقدية دين علينا / قرض من: ${debt.partyName}`,
          user?.fullName || user?.username || 'المسؤول المالي',
          debt.id,
          {
            currency: debt.currency || 'EGP',
            usdAmount: isUSD ? debt.totalAmount : undefined,
            notes: debt.notes || options?.depositNotes || `توريد نقدية دين علينا إلى الخزنة الرئيسية (${debt.partyName})`,
            user
          }
        );
        debt.vaultTransactionId = safeTx.id;
        debt.depositToVault = true;
        debt.depositDate = new Date().toISOString();
      }
    }

    if (!isNew) {
      debts[index] = debt;
    } else {
      debts.unshift({ ...debt, createdAt: debt.createdAt || new Date().toISOString() });
    }
    this.setItem(STORAGE_KEYS.DEBTS, debts);

    if (user) {
      try {
        this.addAuditLog(
          user,
          isNew ? 'add' : 'edit',
          'debt',
          debt.id,
          `${isNew ? 'إنشاء سجل دين' : 'تحديث دين'}: ${debt.partyName} بقيمة ${debt.totalAmount} ${debt.currency || 'EGP'} (${debt.debtType === 'receivable' ? 'لنا' : 'علينا'})${debt.depositToVault ? ' [تم الإيداع بالخزنة]' : ''}`
        );
      } catch (e) {}
    }

    eventBus.publish(SYSTEM_EVENTS.DEBT_UPDATED, debt);
    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, {});
    return debt;
  }

  public addDebtDeposit(
    debtId: string,
    amount: number,
    paidBy: string,
    receiptNumber?: string,
    notes?: string,
    user?: any,
    depositDate?: string,
    paymentMethod = 'كاش (الخزنة الرئيسية)'
  ): { success: boolean; message?: string; debt?: Debt } {
    if (amount <= 0) {
      return { success: false, message: 'مبلغ الوديعة يجب أن يكون أكبر من الصفر' };
    }

    const debts = this.getItem<Debt[]>(STORAGE_KEYS.DEBTS, initialDebts);
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return { success: false, message: 'سجل الدين غير موجود' };

    const isUSD = debt.currency === 'USD';
    const nowIso = new Date().toISOString();
    const dateStr = depositDate || nowIso.split('T')[0];

    // Prevent duplicate deposit submission within same minute with identical receipt/amount
    const isDuplicate = (debt.installments || []).some(
      i => {
        if (i.type !== 'deposit' || i.amount !== amount) return false;
        if (receiptNumber && i.receiptNumber === receiptNumber) return true;
        if (!receiptNumber && !i.receiptNumber && i.createdAt) {
          const diffMs = Math.abs(new Date(nowIso).getTime() - new Date(i.createdAt).getTime());
          return diffMs < 60000;
        }
        return false;
      }
    );
    if (isDuplicate) {
      return { success: false, message: 'تم تسجيل هذه الوديعة مسبقاً لمنع التكرار المالي' };
    }

    // 1. Record safe cash-in
    const safeTx = this.addSafeTransaction(
      'cash_in',
      amount,
      'customer_deposit',
      `إيداع وديعة نقدية مرتبطة بالدين (${debt.partyName}) - إيصال: ${receiptNumber || 'بدون'}`,
      paidBy || user?.fullName || 'المسؤول المالي',
      debt.id,
      {
        currency: debt.currency || 'EGP',
        usdAmount: isUSD ? amount : undefined,
        notes: notes || `وديعة نقدية للدين من: ${debt.partyName}`,
        user
      }
    );

    // 2. Record installment/deposit in debt
    const installment: DebtInstallment = {
      id: 'dep_' + Date.now(),
      debtId,
      amount,
      currency: debt.currency || 'EGP',
      paymentDate: dateStr,
      paidBy: paidBy || user?.fullName || 'المسؤول المالي',
      receiptNumber,
      notes: notes || 'إيداع وديعة نقدية بالخزنة',
      balanceAfter: debt.remainingAmount,
      paymentMethod,
      type: 'deposit',
      vaultTransactionId: safeTx.id,
      createdAt: nowIso
    };

    debt.installments = debt.installments || [];
    debt.installments.unshift(installment);
    this.setItem(STORAGE_KEYS.DEBTS, debts);

    const userObj = user || { id: 'usr_' + paidBy, name: paidBy, role: 'staff', department: 'المالية' };
    try {
      this.addAuditLog(
        userObj,
        'edit',
        'debt',
        debt.id,
        `إيداع وديعة نقدية بالخزنة الرئيسية بقيمة ${amount} ${debt.currency || 'EGP'} مرتبطة بالدين: ${debt.partyName}`
      );
    } catch (e) {}

    eventBus.publish(SYSTEM_EVENTS.DEBT_UPDATED, debt);
    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, {});
    return { success: true, debt };
  }

  public addDebtInstallment(
    debtId: string,
    amount: number,
    paidBy: string,
    receiptNumber?: string,
    notes?: string,
    user?: any,
    paymentDate?: string,
    paymentMethod = 'كاش (الخزنة الرئيسية)'
  ): { success: boolean; message?: string; debt?: Debt } {
    if (amount <= 0) {
      throw new Error('مبلغ السداد يجب أن يكون أكبر من الصفر');
    }

    const debts = this.getItem<Debt[]>(STORAGE_KEYS.DEBTS, initialDebts);
    const debt = debts.find(d => d.id === debtId);
    if (!debt) throw new Error('Debt not found');

    if (debt.remainingAmount <= 0) {
      throw new Error('هذا الدين مسدد بالكامل بالفعل ولا يمكن تسجيل دفعات إضافية عليه');
    }

    // Cap payment to remaining balance
    const actualPayAmount = Math.min(amount, debt.remainingAmount);
    const nowIso = new Date().toISOString();
    const dateStr = paymentDate || nowIso.split('T')[0];

    debt.paidAmount = Math.round((debt.paidAmount + actualPayAmount) * 100) / 100;
    debt.remainingAmount = Math.max(0, Math.round((debt.totalAmount - debt.paidAmount) * 100) / 100);

    if (debt.remainingAmount === 0) {
      debt.status = 'paid';
    } else {
      debt.status = 'partially_paid';
    }

    const isUSD = debt.currency === 'USD';
    let safeTxId: string | undefined;

    if (debt.debtType === 'receivable') {
      const tx = this.addSafeTransaction(
        'cash_in',
        actualPayAmount,
        'debt_payment',
        `تحصيل دفعة دين من ${debt.partyName} (إيصال: ${receiptNumber || 'بدون'})`,
        paidBy,
        debt.id,
        {
          currency: debt.currency || 'EGP',
          usdAmount: isUSD ? actualPayAmount : undefined,
          notes: `طريقة الدفع: ${paymentMethod}${notes ? ` | ${notes}` : ''}`,
          user
        }
      );
      safeTxId = tx.id;
    } else {
      const tx = this.addSafeTransaction(
        'cash_out',
        actualPayAmount,
        'debt_payment',
        `سداد دفعة دين للجهة ${debt.partyName} (إيصال: ${receiptNumber || 'بدون'})`,
        paidBy,
        debt.id,
        {
          currency: debt.currency || 'EGP',
          usdAmount: isUSD ? actualPayAmount : undefined,
          notes: `طريقة الدفع: ${paymentMethod}${notes ? ` | ${notes}` : ''}`,
          user
        }
      );
      safeTxId = tx.id;
    }

    const installment: DebtInstallment = {
      id: 'inst_' + Date.now(),
      debtId,
      amount: actualPayAmount,
      currency: debt.currency || 'EGP',
      paymentDate: dateStr,
      paidBy,
      receiptNumber,
      notes,
      balanceAfter: debt.remainingAmount,
      paymentMethod,
      type: 'installment',
      vaultTransactionId: safeTxId,
      createdAt: nowIso
    };

    debt.installments = debt.installments || [];
    debt.installments.unshift(installment);

    this.setItem(STORAGE_KEYS.DEBTS, debts);

    const userObj = user || { id: 'usr_' + paidBy, name: paidBy, role: 'staff', department: 'المالية' };
    try {
      this.addAuditLog(
        userObj,
        'edit',
        'debt',
        debt.id,
        `سداد/تحصيل قسط دين بقيمة ${actualPayAmount} ${debt.currency || 'EGP'} من/إلى ${debt.partyName} [المتبقي: ${debt.remainingAmount}]`
      );
    } catch (e) {}

    eventBus.publish(SYSTEM_EVENTS.DEBT_UPDATED, debt);
    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, {});
    return { success: true, debt };
  }



  // Settlements & Shifts
  public getSettlements(): ShiftSettlement[] {
    return this.getItem<ShiftSettlement[]>(STORAGE_KEYS.SETTLEMENTS, initialSettlements);
  }

  public saveSettlement(settlement: ShiftSettlement): void {
    const all = this.getItem<ShiftSettlement[]>(STORAGE_KEYS.SETTLEMENTS, initialSettlements);
    const index = all.findIndex(s => s.id === settlement.id);
    if (index >= 0) {
      all[index] = settlement;
    } else {
      all.unshift({ ...settlement, createdAt: new Date().toISOString() });
    }
    this.setItem(STORAGE_KEYS.SETTLEMENTS, all);
  }

  public deleteSettlement(id: string): void {
    const all = this.getItem<ShiftSettlement[]>(STORAGE_KEYS.SETTLEMENTS, initialSettlements);
    const filtered = all.filter(s => s.id !== id);
    this.setItem(STORAGE_KEYS.SETTLEMENTS, filtered);
  }

  // Shift Deficits Management
  public getShiftDeficits(): ShiftDeficitItem[] {
    return this.getItem<ShiftDeficitItem[]>(STORAGE_KEYS.SHIFT_DEFICITS, []);
  }

  public saveShiftDeficit(deficit: ShiftDeficitItem): void {
    const all = this.getShiftDeficits();
    const index = all.findIndex(d => d.id === deficit.id);
    if (index >= 0) {
      all[index] = deficit;
    } else {
      all.unshift(deficit);
    }
    this.setItem(STORAGE_KEYS.SHIFT_DEFICITS, all);
  }

  public resolveShiftDeficit(
    id: string,
    resolution: 'resolved_deducted' | 'resolved_store_loss' | 'resolved_adjusted',
    notes: string,
    user: string
  ): void {
    const all = this.getShiftDeficits();
    const index = all.findIndex(d => d.id === id);
    if (index >= 0) {
      all[index].status = resolution;
      all[index].resolutionNotes = notes;
      all[index].resolvedAt = new Date().toISOString();
      all[index].resolvedBy = user;
      this.setItem(STORAGE_KEYS.SHIFT_DEFICITS, all);
    }
  }

  // ==========================================
  // EMPLOYEES & HR MANAGEMENT
  // ==========================================
  public getEmployees(includeInactive = true): Employee[] {
    const all = this.getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, initialEmployees);
    return includeInactive ? all : all.filter(e => e.status === 'active');
  }

  public getEmployeeById(id: string): Employee | undefined {
    return this.getEmployees().find(e => e.id === id);
  }

  public saveEmployee(employee: Employee, user?: any): void {
    const all = this.getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, initialEmployees);
    const index = all.findIndex(e => e.id === employee.id);
    const isNew = index < 0;

    const dailyRate = calculateDailyRate(employee.baseSalary);
    const normalizedEmp: Employee = {
      ...employee,
      dailyRate: dailyRate > 0 ? dailyRate : employee.dailyRate || 166.67,
      workStartTime: employee.workStartTime || '09:00',
      workEndTime: employee.workEndTime || '17:00'
    };

    if (!isNew) {
      all[index] = { ...normalizedEmp, updatedAt: new Date().toISOString() };
    } else {
      all.unshift({
        ...normalizedEmp,
        id: normalizedEmp.id || `emp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        createdAt: normalizedEmp.createdAt || new Date().toISOString()
      });
    }
    this.setItem(STORAGE_KEYS.EMPLOYEES, all);

    if (user) {
      try {
        this.addAuditLog(
          user,
          isNew ? 'add' : 'edit',
          'employee',
          normalizedEmp.id,
          `${isNew ? 'إضافة موظف جديد' : 'تعديل بيانات موظف'}: ${normalizedEmp.fullName} (${normalizedEmp.jobTitle})`
        );
      } catch (e) {}
    }

    eventBus.publish(SYSTEM_EVENTS.EMPLOYEE_MUTATED, normalizedEmp);
  }

  public deleteEmployee(id: string, user?: any): void {
    const all = this.getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, initialEmployees);
    const emp = all.find(e => e.id === id);
    const filtered = all.filter(e => e.id !== id);
    this.setItem(STORAGE_KEYS.EMPLOYEES, filtered);

    if (user && emp) {
      try {
        this.addAuditLog(
          user,
          'delete',
          'employee',
          id,
          `حذف الموظف: ${emp.fullName} (${emp.employeeCode})`
        );
      } catch (e) {}
    }

    eventBus.publish(SYSTEM_EVENTS.EMPLOYEE_MUTATED, { id });
  }

  // Employee Advances (سلف الموظفين)
  public addEmployeeAdvance(
    employeeId: string,
    amount: number,
    reason: string,
    disbursedFromVault: boolean,
    user?: any,
    requestDate?: string,
    requestTime?: string,
    disbursedDate?: string,
    disbursedTime?: string
  ): EmployeeAdvance {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) throw new Error('Employee not found');

    const now = new Date();
    const reqD = requestDate || now.toISOString().split('T')[0];
    const reqT = requestTime || now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const disD = disbursedDate || (disbursedFromVault ? reqD : undefined);
    const disT = disbursedTime || (disbursedFromVault ? reqT : undefined);

    const advance: EmployeeAdvance = {
      id: `adv_${Date.now()}`,
      employeeId,
      amount,
      requestDate: reqD,
      requestTime: reqT,
      disbursedDate: disD,
      disbursedTime: disT,
      status: disbursedFromVault ? 'disbursed' : 'pending',
      repaidAmount: 0,
      reason,
      disbursedFromVault,
      createdAt: now.toISOString()
    };

    if (disbursedFromVault) {
      const tx = this.addSafeTransaction(
        'cash_out',
        amount,
        'salary',
        `صرف سلفة للموظف: ${emp.fullName} (${reason}) - بتاريخ ${reqD} الساعة ${reqT}`,
        user?.name || 'الإدارة',
        advance.id,
        { user }
      );
      advance.vaultTxId = tx.id;
    }

    emp.advances = emp.advances || [];
    emp.advances.unshift(advance);
    this.saveEmployee(emp, user);
    return advance;
  }

  // Repay Employee Advance (سداد قسط سلفة/دين للموظف)
  public addEmployeeAdvanceRepayment(
    employeeId: string,
    advanceId: string,
    amount: number,
    date?: string,
    notes?: string,
    user?: any,
    timeStr?: string
  ): EmployeeAdvance {
    const isCustomerEmp = !!this.getEmployeeById(employeeId);
    const emp = this.getEmployeeById(employeeId) || this.getDealerEmployeeById(employeeId);
    if (!emp) throw new Error('Employee not found');
    emp.advances = emp.advances || [];
    const adv = emp.advances.find(a => a.id === advanceId);
    if (!adv) throw new Error('Advance not found');

    const now = new Date();
    const repaymentDate = date || now.toISOString().split('T')[0];
    const repaymentTime = timeStr || now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const repayment: EmployeeAdvanceRepayment = {
      id: `adv_rep_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      advanceId,
      amount,
      date: repaymentDate,
      time: repaymentTime,
      notes,
      recordedBy: user?.fullName || user?.name || user?.username || 'الإدارة',
      recordedAt: now.toISOString()
    };

    adv.repayments = adv.repayments || [];
    adv.repayments.unshift(repayment);
    adv.repaidAmount = (adv.repaidAmount || 0) + amount;
    if (adv.repaidAmount >= adv.amount) {
      adv.status = 'repaid';
    }

    if (isCustomerEmp) {
      this.saveEmployee(emp, user);
    } else {
      this.saveDealerEmployee(emp, user);
    }

    if (user) {
      try {
        this.addAuditLog(
          user,
          'edit',
          'employee',
          employeeId,
          `سداد قسط سلفة للموظف ${emp.fullName}: بمبلغ ${amount} ج.م - بتاريخ ${repaymentDate} الساعة ${repaymentTime}`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.EMPLOYEE_MUTATED, emp);
    return adv;
  }

  // Employee Incentives & Rewards (المكافآت والحوافز)
  public addEmployeeIncentive(
    employeeId: string,
    amount: number,
    type: 'reward' | 'incentive' | 'overtime' | 'bonus',
    reason: string,
    month?: string,
    user?: any,
    calculationType: 'days' | 'amount' = 'amount',
    daysCount?: number,
    date?: string,
    timeStr?: string
  ): EmployeeIncentive {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) throw new Error('Employee not found');

    const now = new Date();
    const incDate = date || now.toISOString().split('T')[0];
    const incTime = timeStr || now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const incMonth = month || incDate.substring(0, 7);

    const inc: EmployeeIncentive = {
      id: `inc_${Date.now()}`,
      employeeId,
      amount,
      calculationType,
      daysCount,
      type,
      reason,
      date: incDate,
      time: incTime,
      month: incMonth,
      createdAt: now.toISOString()
    };

    emp.incentives = emp.incentives || [];
    emp.incentives.unshift(inc);
    this.saveEmployee(emp, user);

    // Apply to current salary slip
    this.applyEmployeeDeductionOrBonus(
      employeeId,
      'bonus',
      amount,
      `${type === 'reward' ? 'مكافأة' : 'حافز'}: ${reason}`,
      inc.month,
      calculationType,
      daysCount,
      inc.date,
      inc.time
    );
    return inc;
  }

  // Employee Attachments (المرفقات)
  public addEmployeeAttachment(
    employeeId: string,
    name: string,
    url: string,
    type: string,
    user?: any
  ): EmployeeAttachment {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) throw new Error('Employee not found');

    const att: EmployeeAttachment = {
      id: `att_${Date.now()}`,
      name,
      url,
      type,
      uploadedAt: new Date().toISOString()
    };

    emp.attachments = emp.attachments || [];
    emp.attachments.unshift(att);
    this.saveEmployee(emp, user);
    return att;
  }

  public deleteEmployeeAttachment(employeeId: string, attachmentId: string, user?: any): void {
    const emp = this.getEmployeeById(employeeId);
    if (!emp || !emp.attachments) return;
    emp.attachments = emp.attachments.filter(a => a.id !== attachmentId);
    this.saveEmployee(emp, user);
  }

  // Attendance Check-In / Check-Out Helpers
  public recordAttendanceCheckIn(
    employeeId: string,
    timeStr?: string,
    notes?: string
  ): AttendanceRecord {
    const emp = this.getEmployeeById(employeeId);
    const today = new Date().toISOString().split('T')[0];
    const nowTime = timeStr || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

    const all = this.getAttendance();
    const existingIndex = all.findIndex(a => a.employeeId === employeeId && a.date === today);

    const record: AttendanceRecord = {
      id: existingIndex >= 0 ? all[existingIndex].id : `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      employeeId,
      employeeName: emp?.fullName || 'موظف',
      department: emp?.department || 'عام',
      date: today,
      checkIn: nowTime,
      workHours: existingIndex >= 0 ? all[existingIndex].workHours : 8,
      status: 'present',
      notes: notes || (existingIndex >= 0 ? all[existingIndex].notes : '')
    };

    if (existingIndex >= 0) {
      all[existingIndex] = record;
    } else {
      all.unshift(record);
    }
    this.setItem(STORAGE_KEYS.ATTENDANCE, all);
    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, record);
    return record;
  }

  public recordAttendanceCheckOut(
    employeeId: string,
    timeStr?: string,
    workHours?: number,
    notes?: string
  ): AttendanceRecord | null {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = timeStr || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const all = this.getAttendance();

    const index = all.findIndex(a => a.employeeId === employeeId && a.date === today);
    if (index >= 0) {
      all[index].checkOut = nowTime;
      if (workHours !== undefined && workHours > 0) {
        all[index].workHours = workHours;
      }
      if (notes) {
        all[index].notes = (all[index].notes ? all[index].notes + ' | ' : '') + notes;
      }
      this.setItem(STORAGE_KEYS.ATTENDANCE, all);
      eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, all[index]);
      return all[index];
    } else {
      const emp = this.getEmployeeById(employeeId);
      const newRec: AttendanceRecord = {
        id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        employeeId,
        employeeName: emp?.fullName || 'موظف',
        department: emp?.department || 'عام',
        date: today,
        checkIn: '09:00 ص',
        checkOut: nowTime,
        workHours: workHours || 8,
        status: 'present',
        notes: notes || 'تسجيل انصراف'
      };
      all.unshift(newRec);
      this.setItem(STORAGE_KEYS.ATTENDANCE, all);
      eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, newRec);
      return newRec;
    }
  }

  public recordAttendanceAbsence(
    employeeId: string,
    dateStr?: string,
    reason?: string,
    penaltyDays: number = 1,
    customDeductionAmount?: number,
    user?: any,
    timeStr?: string
  ): AttendanceRecord {
    const emp = this.getEmployeeById(employeeId);
    const now = new Date();
    const date = dateStr || now.toISOString().split('T')[0];
    const absenceTime = timeStr || now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const all = this.getAttendance();

    const dailyRate = emp?.dailyRate || (emp?.baseSalary ? calculateDailyRate(emp.baseSalary, date) : 166.67);
    const calculatedDeduction = customDeductionAmount !== undefined && customDeductionAmount > 0
      ? customDeductionAmount
      : Math.round(penaltyDays * dailyRate * 100) / 100;

    const existingIndex = all.findIndex(a => a.employeeId === employeeId && a.date === date);
    const record: AttendanceRecord = {
      id: existingIndex >= 0 ? all[existingIndex].id : `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      employeeId,
      employeeName: emp?.fullName || 'موظف',
      department: emp?.department || 'عام',
      date,
      checkIn: '-',
      checkOut: '-',
      workHours: 0,
      status: 'absent',
      penaltyDays,
      deductionAmount: calculatedDeduction,
      absenceTime,
      recordedAt: now.toISOString(),
      notes: reason || `غياب (خصم ${penaltyDays} يوم)`
    };

    if (existingIndex >= 0) {
      all[existingIndex] = record;
    } else {
      all.unshift(record);
    }
    this.setItem(STORAGE_KEYS.ATTENDANCE, all);

    // If deduction is requested for absence, apply it directly to the salary slip
    if (calculatedDeduction > 0) {
      const targetMonth = date.substring(0, 7);
      this.applyEmployeeDeductionOrBonus(
        employeeId,
        'deduction',
        calculatedDeduction,
        `خصم غياب يوم ${date} (${penaltyDays} يوم - ${reason || 'غياب'})`,
        targetMonth,
        'days',
        penaltyDays,
        date,
        absenceTime
      );
    }

    if (user) {
      try {
        this.addAuditLog(
          user,
          'edit',
          'employee',
          employeeId,
          `تسجيل غياب للموظف ${emp?.fullName || employeeId} بتاريخ ${date} الساعة ${absenceTime} - خصم ${penaltyDays} يوم (${calculatedDeduction} ج.م) - السبب: ${reason || 'بدون إذن'}`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, record);
    return record;
  }

  public recordAttendanceLeave(
    employeeId: string,
    startDate: string,
    endDate: string,
    daysCount: number,
    leaveType: string,
    reason: string,
    user?: any,
    timeStr?: string
  ): AttendanceRecord[] {
    const emp = this.getEmployeeById(employeeId);
    const now = new Date();
    const leaveTime = timeStr || now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const all = this.getAttendance();
    const createdRecords: AttendanceRecord[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
    const actualDays = Math.max(daysCount, diffDays);

    for (let i = 0; i < actualDays; i++) {
      const currentDay = new Date(start);
      currentDay.setDate(start.getDate() + i);
      const dayStr = currentDay.toISOString().split('T')[0];

      const existingIndex = all.findIndex(a => a.employeeId === employeeId && a.date === dayStr);
      const rec: AttendanceRecord = {
        id: existingIndex >= 0 ? all[existingIndex].id : `att_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
        employeeId,
        employeeName: emp?.fullName || 'موظف',
        department: emp?.department || 'عام',
        date: dayStr,
        checkIn: '-',
        checkOut: '-',
        workHours: 0,
        status: 'leave',
        notes: `إجازة ${leaveType}: ${reason || 'إجازة معتمدة'} (${i + 1}/${actualDays})`,
        leaveTime,
        recordedAt: now.toISOString(),
        leaveStartDate: startDate,
        leaveEndDate: endDate,
        leaveDays: actualDays,
        leaveType
      };

      if (existingIndex >= 0) {
        all[existingIndex] = rec;
      } else {
        all.unshift(rec);
      }
      createdRecords.push(rec);
    }

    this.setItem(STORAGE_KEYS.ATTENDANCE, all);

    // Update employee status to on_leave if leave includes today
    const today = new Date().toISOString().split('T')[0];
    if (today >= startDate && today <= endDate) {
      const allEmployees = this.getEmployees();
      const empIndex = allEmployees.findIndex(e => e.id === employeeId);
      if (empIndex >= 0) {
        allEmployees[empIndex].status = 'on_leave';
        this.setItem(STORAGE_KEYS.EMPLOYEES, allEmployees);
      }
    }

    if (user) {
      try {
        this.addAuditLog(
          user,
          'edit',
          'employee',
          employeeId,
          `تسجيل إجازة ${leaveType} للموظف ${emp?.fullName || employeeId} من ${startDate} إلى ${endDate} (${actualDays} يوم) - تم التسجيل الساعة ${leaveTime}`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, createdRecords);
    return createdRecords;
  }

  // Deduction & Bonus Direct Engine
  public applyEmployeeDeductionOrBonus(
    employeeId: string,
    type: 'deduction' | 'bonus',
    amount: number,
    reason: string,
    month?: string,
    calculationType: 'days' | 'amount' = 'amount',
    daysCount?: number,
    date?: string,
    timeStr?: string
  ): SalarySlip {
    const emp = this.getEmployeeById(employeeId);
    const now = new Date();
    const targetDate = date || now.toISOString().split('T')[0];
    const targetTime = timeStr || now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const targetMonth = month || targetDate.substring(0, 7);
    const all = this.getSalaries();

    const slipIndex = all.findIndex(s => s.employeeId === employeeId && s.month === targetMonth);
    let slip: SalarySlip;

    if (slipIndex >= 0) {
      slip = { ...all[slipIndex] };
      if (type === 'deduction') {
        slip.deductions = (slip.deductions || 0) + amount;
      } else {
        slip.bonuses = (slip.bonuses || 0) + amount;
      }
      slip.totalSalary = Math.max(0, slip.baseSalary + slip.bonuses - slip.deductions);
      slip.notes = (slip.notes ? slip.notes + ' | ' : '') + `${type === 'deduction' ? 'خصم' : 'مكافأة'}: ${amount} ج (${reason}) - ${targetDate} ${targetTime}`;
      all[slipIndex] = slip;
    } else {
      const baseSalary = emp?.baseSalary || 5000;
      const bonuses = type === 'bonus' ? amount : 0;
      const deductions = type === 'deduction' ? amount : 0;
      slip = {
        id: `slip_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        employeeId,
        employeeName: emp?.fullName || 'موظف',
        department: emp?.department || 'عام',
        month: targetMonth,
        baseSalary,
        bonuses,
        deductions,
        totalSalary: Math.max(0, baseSalary + bonuses - deductions),
        isPaid: false,
        notes: `${type === 'deduction' ? 'خصم' : 'مكافأة'}: ${amount} ج (${reason})`
      };
      all.unshift(slip);
    }

    this.setItem(STORAGE_KEYS.SALARIES, all);

    // If deduction, store in employee deductions array for daily transactions view
    if (emp && type === 'deduction') {
      emp.deductions = emp.deductions || [];
      emp.deductions.unshift({
        id: `ded_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        employeeId,
        amount,
        calculationType,
        daysCount,
        reason,
        date: targetDate,
        time: targetTime,
        month: targetMonth,
        createdAt: now.toISOString()
      });
      this.saveEmployee(emp);
    }

    // Reflect in Customer Account & Profile (في أكونت العميل)
    const allCustomers = this.getCustomers(true);
    const cust = allCustomers.find(c =>
      (emp?.phone && (c.phone === emp.phone || isSamePhoneNumber(c.phone, emp.phone))) ||
      (emp?.fullName && c.name.trim().toLowerCase() === emp.fullName.trim().toLowerCase())
    );

    if (cust) {
      this.addCustomerTransaction(
        cust.id,
        type === 'deduction' ? 'withdrawal' : 'deposit',
        amount,
        `${type === 'deduction' ? 'خصم وجزاء مالي' : 'مكافأة وحافز إضافي'}: ${reason} (مسير شهر ${targetMonth})`,
        'الإدارة المالية',
        slip.id
      );

      this.addCustomerNote({
        customerId: cust.id,
        authorName: 'الإدارة المالية',
        authorRole: 'مالية ومراجعة',
        type: 'financial',
        content: `⚖️ تم تسجيل ${type === 'deduction' ? 'خصم وجزاء مالي' : 'مكافأة وحافز إضافي'} بمبلغ (${amount} ج.م) لشهر ${targetMonth} - البيان والسبب: ${reason}. صافي الراتب المستحق: (${slip.totalSalary} ج.م).`
      });
    }

    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, slip);
    return slip;
  }

  // Attendance
  public getAttendance(): AttendanceRecord[] {
    return this.getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, initialAttendance);
  }

  public saveAttendance(record: AttendanceRecord): void {
    const all = this.getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, initialAttendance);
    const index = all.findIndex(a => a.id === record.id || (a.employeeId === record.employeeId && a.date === record.date));
    if (index >= 0) {
      all[index] = { ...all[index], ...record };
    } else {
      all.unshift(record);
    }
    this.setItem(STORAGE_KEYS.ATTENDANCE, all);
    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, record);
  }

  // Salaries
  public getSalaries(): SalarySlip[] {
    return this.getItem<SalarySlip[]>(STORAGE_KEYS.SALARIES, initialSalaries);
  }

  public saveSalary(salary: SalarySlip): void {
    const all = this.getItem<SalarySlip[]>(STORAGE_KEYS.SALARIES, initialSalaries);
    const index = all.findIndex(s => s.id === salary.id);
    if (index >= 0) {
      all[index] = salary;
    } else {
      all.unshift(salary);
    }
    this.setItem(STORAGE_KEYS.SALARIES, all);
    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, salary);
  }

  public paySalarySlip(id: string, method?: string, user?: string): void {
    const all = this.getSalaries();
    const index = all.findIndex(s => s.id === id);
    if (index >= 0) {
      const paymentMethod = method || 'نقدية من الخزنة';
      all[index].isPaid = true;
      all[index].paidAt = new Date().toISOString();
      all[index].paymentMethod = paymentMethod;
      if (user) {
        all[index].notes = (all[index].notes ? all[index].notes + ' | ' : '') + `تم الصرف بواسطة: ${user}`;
      }
      this.setItem(STORAGE_KEYS.SALARIES, all);

      const slip = all[index];
      const emp = this.getEmployeeById(slip.employeeId);

      // 1. Finance Vault & Unified Ledger:
      // Always record safe transaction so Finance Overview, Vault, and Reports reflect the salary expense
      this.addSafeTransaction(
        'cash_out',
        slip.totalSalary,
        'salary',
        `صرف راتب شهر ${slip.month} للموظف: ${slip.employeeName} (${slip.department}) [طريقة الدفع: ${paymentMethod}]`,
        user || 'المسؤول المالي',
        slip.id
      );

      // 2. Customer Account (في أكونت العميل):
      const allCustomers = this.getCustomers(true);
      const cust = allCustomers.find(c =>
        (emp?.phone && (c.phone === emp.phone || isSamePhoneNumber(c.phone, emp.phone))) ||
        (emp?.fullName && c.name.trim().toLowerCase() === emp.fullName.trim().toLowerCase())
      );

      if (cust) {
        this.addCustomerTransaction(
          cust.id,
          'deposit',
          slip.totalSalary,
          `استلام مسير راتب شهر ${slip.month} (صافي المستحق: ${slip.totalSalary} ج.م) [طريقة الصرف: ${paymentMethod}]`,
          user || 'المسؤول المالي',
          slip.id
        );

        this.addCustomerNote({
          customerId: cust.id,
          authorName: user || 'الإدارة المالية',
          authorRole: 'مالية وحسابات',
          type: 'financial',
          content: `💵 تم اعتماد وصرف راتب شهر ${slip.month} بمبلغ (${slip.totalSalary} ج.م) [الأساسي: ${slip.baseSalary} + حوافز: ${slip.bonuses} - خصومات: ${slip.deductions}] بطريقة: ${paymentMethod}.`
        });
      }

      eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, all[index]);
    }
  }

  public verifyShiftSettlement(id: string, user?: string): void {
    const all = this.getSettlements();
    const index = all.findIndex(s => s.id === id);
    if (index >= 0) {
      all[index].status = 'verified';
      if (user) {
        all[index].notes = (all[index].notes ? all[index].notes + ' | ' : '') + `تم الاعتماد بواسطة: ${user}`;
      }
      this.setItem(STORAGE_KEYS.SETTLEMENTS, all);
    }
  }

  public getShiftSettlements(): ShiftSettlement[] {
    return this.getSettlements();
  }

  public getAttendanceRecords(): AttendanceRecord[] {
    return this.getAttendance();
  }

  public getSalarySlips(): SalarySlip[] {
    return this.getSalaries();
  }

  public calculateEmployeeMonthlySalary(employeeId: string, month: string): SalarySlip {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) {
      throw new Error(`Employee ${employeeId} not found`);
    }

    const existingSlips = this.getSalaries();
    const existing = existingSlips.find(s => s.employeeId === employeeId && s.month === month);
    // If already paid, return the paid historical slip to keep it immutable
    if (existing && existing.isPaid) {
      return existing;
    }

    const baseSalary = Number(emp.baseSalary) || 0;
    const totalMonthDays = getDaysInMonth(month); // Dynamically determined actual month days (28, 29, 30, 31)
    const dailyRate = calculateDailyRate(baseSalary, month);

    // Attendance records for this employee in this month
    const allAttendance = this.getAttendance().filter(
      a => a.employeeId === employeeId && a.date.startsWith(month)
    );

    // Classification of days based on actual attendance
    const presentDays = allAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const absentDays = allAttendance.filter(a => a.status === 'absent').length;

    // Leaves classification: paid vs unpaid
    const leaveRecords = allAttendance.filter(a => a.status === 'leave');
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    for (const l of leaveRecords) {
      const type = (l.leaveType || '').trim().toLowerCase();
      if (type === 'unpaid' || type.includes('غير مدفوعة') || type.includes('بدون راتب') || type.includes('بدون أجر')) {
        unpaidLeaveDays += (l.leaveDays || 1);
      } else {
        paidLeaveDays += (l.leaveDays || 1);
      }
    }
    const leaveDays = paidLeaveDays + unpaidLeaveDays;

    // Eligible days = present days + paid leave days (capped at totalMonthDays)
    const eligibleDays = Math.min(totalMonthDays, presentDays + paidLeaveDays);
    const earnedBaseSalary = Math.round(eligibleDays * dailyRate * 100) / 100;

    // Actual incentives/bonuses recorded for this month (Requirement 3: Never auto-invent bonuses, must be explicitly recorded)
    const employeeIncentives = (emp.incentives || []).filter(
      i => (i.month && i.month === month) || (i.date && i.date.startsWith(month))
    );
    const totalBonuses = employeeIncentives.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    // Actual deductions recorded for this month (Requirement 8 & 11: prevent double deduction of absence)
    const employeeDeductions = (emp.deductions || []).filter(
      d => (d.month && d.month === month) || (d.date && d.date.startsWith(month))
    );
    const totalDeductions = employeeDeductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    // Advances
    const unpaidAdvances = (emp.advances || []).filter(
      a => a.status === 'disbursed' && (a.amount - (a.repaidAmount || 0)) > 0
    );

    // Net Salary = earnedBaseSalary + bonuses - deductions
    const netSalary = Math.max(0, Math.round((earnedBaseSalary + totalBonuses - totalDeductions) * 100) / 100);

    const slip: SalarySlip = {
      id: existing?.id || `slip_${employeeId}_${month}`,
      employeeId,
      employeeName: emp.fullName,
      department: emp.department,
      month,
      baseSalary,
      bonuses: totalBonuses,
      deductions: totalDeductions,
      totalSalary: netSalary,
      isPaid: false,
      status: 'ready',
      eligibleDays,
      presentDays,
      absentDays,
      leaveDays,
      paidLeaveDays,
      unpaidLeaveDays,
      totalMonthDays,
      dailyRate,
      earnedBaseSalary,
      breakdown: {
        dailyRate,
        eligibleDays,
        earnedBaseSalary,
        bonusesList: employeeIncentives.map(i => ({
          reason: i.reason,
          amount: i.amount,
          date: i.date,
          recordedBy: 'المدير'
        })),
        deductionsList: employeeDeductions.map(d => ({
          reason: d.reason,
          amount: d.amount,
          date: d.date,
          recordedBy: 'المدير'
        })),
        advancesDeducted: 0
      }
    };

    return slip;
  }

  public generateSalarySlip(employeeId: string, month: string): SalarySlip {
    return this.calculateEmployeeMonthlySalary(employeeId, month);
  }

  public disburseEmployeeSalary(
    slip: SalarySlip,
    currentUser?: any
  ): { success: boolean; message?: string; txId?: string; slip: SalarySlip } {
    const all = this.getSalaries();
    const existing = all.find(
      s => (s.id === slip.id || (s.employeeId === slip.employeeId && s.month === slip.month)) && s.isPaid
    );

    // 1. Prevent duplicate disbursement (Requirement 15)
    if (existing && existing.isPaid) {
      return {
        success: false,
        message: `⚠️ تم صرف راتب هذا الموظف عن شهر ${slip.month} بالفعل بتاريخ ${existing.paidAt ? new Date(existing.paidAt).toLocaleDateString('ar-EG') : ''} بمبلغ ${existing.totalSalary} ج.م بواسطة ${existing.paidBy || 'المسؤول المالي'}.`,
        slip: existing
      };
    }

    const userName = currentUser?.fullName || currentUser?.username || 'المسؤول المالي';

    // 2. Safe Transaction from Customer Finance Vault
    const tx = this.addSafeTransaction(
      'cash_out',
      slip.totalSalary,
      'salary',
      `صرف راتب شهر ${slip.month} للموظف: ${slip.employeeName} (${slip.department || 'خدمة العملاء'}) [أيام عمل: ${slip.eligibleDays || 0}/${slip.totalMonthDays || getDaysInMonth(slip.month)} - صافي: ${slip.totalSalary} ج.م]`,
      userName,
      slip.id,
      {
        operationNumber: slip.id,
        notes: `صرف راتب شهر ${slip.month}: أيام الحضور المحتسبة ${slip.eligibleDays || 0} يوم (أجر: ${slip.earnedBaseSalary || slip.baseSalary}) + حوافز: ${slip.bonuses} - خصومات: ${slip.deductions}`,
        user: currentUser
      }
    );

    // 3. Update slip state
    const finalizedSlip: SalarySlip = {
      ...slip,
      isPaid: true,
      status: 'paid',
      paidAt: new Date().toISOString(),
      paidBy: userName,
      paymentMethod: 'نقدية من الخزنة الرئيسية',
      vaultTxId: tx.id
    };

    const idx = all.findIndex(s => s.id === finalizedSlip.id || (s.employeeId === finalizedSlip.employeeId && s.month === finalizedSlip.month));
    if (idx >= 0) all[idx] = finalizedSlip;
    else all.unshift(finalizedSlip);
    this.setItem(STORAGE_KEYS.SALARIES, all);

    // 4. Record customer account note if linked
    try {
      const allCustomers = this.getCustomers(true);
      const emp = this.getEmployeeById(finalizedSlip.employeeId);
      const cust = allCustomers.find(c =>
        (emp?.phone && (c.phone === emp.phone || isSamePhoneNumber(c.phone, emp.phone))) ||
        (emp?.fullName && c.name.trim().toLowerCase() === emp.fullName.trim().toLowerCase())
      );
      if (cust) {
        this.addCustomerTransaction(
          cust.id,
          'deposit',
          finalizedSlip.totalSalary,
          `استلام مسير راتب شهر ${finalizedSlip.month} (صافي المستحق: ${finalizedSlip.totalSalary} ج.م) [أيام عمل: ${finalizedSlip.eligibleDays || 0}]`,
          userName,
          finalizedSlip.id
        );
        this.addCustomerNote({
          customerId: cust.id,
          authorName: userName,
          authorRole: 'مالية وحسابات',
          type: 'financial',
          content: `💵 تم اعتماد وصرف راتب شهر ${finalizedSlip.month} بمبلغ (${finalizedSlip.totalSalary} ج.م) [أيام الحضور: ${finalizedSlip.presentDays || 0} + إجازات: ${finalizedSlip.leaveDays || 0} + حوافز: ${finalizedSlip.bonuses} - خصومات: ${finalizedSlip.deductions}].`
        });
      }
    } catch (_) {}

    // 5. Audit Log
    if (currentUser) {
      try {
        this.addAuditLog(
          currentUser,
          'add',
          'employee_salary',
          finalizedSlip.id,
          `صرف راتب شهر ${finalizedSlip.month} للموظف ${finalizedSlip.employeeName} بقيمة ${finalizedSlip.totalSalary} ج.م من الخزنة`
        );
      } catch (_) {}
    }

    // 6. Broadcast Events
    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, finalizedSlip);
    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, {});

    return {
      success: true,
      txId: tx.id,
      slip: finalizedSlip
    };
  }

  public saveSalarySlip(slip: SalarySlip): void {
    const all = this.getSalaries();
    const idx = all.findIndex(s => s.id === slip.id);
    if (idx >= 0) all[idx] = slip;
    else all.unshift(slip);
    this.setItem(STORAGE_KEYS.SALARIES, all);
  }

  // Notifications
  public getNotifications(): NotificationItem[] {
    return this.getItem<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
  }

  public markNotificationAsRead(id: string): void {
    const all = this.getNotifications();
    const item = all.find(n => n.id === id);
    if (item) {
      item.isRead = true;
      this.setItem(STORAGE_KEYS.NOTIFICATIONS, all);
    }
  }

  public addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>): void {
    const all = this.getNotifications();
    const item: NotificationItem = {
      ...notification,
      id: 'ntf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      isRead: false,
      timestamp: new Date().toISOString()
    };
    all.unshift(item);
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, all);
  }

  public removeNotification(id: string): void {
    const all = this.getNotifications();
    const filtered = all.filter(n => n.id !== id);
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, filtered);
  }

  public removeNotificationsByEntity(entityId: string): void {
    const all = this.getNotifications();
    const filtered = all.filter(n => n.metadata?.entityId !== entityId && n.metadata?.middlemanId !== entityId && n.metadata?.subscriptionId !== entityId);
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, filtered);
  }

  public setNotifications(items: NotificationItem[]): void {
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, items);
  }

  // ==========================================
  // DEALERS & MERCHANTS INDEPENDENT FINANCE ENGINE (100% ISOLATED)
  // ==========================================

  // 1. Dealer Safe & Vault Ledger
  public getDealerSafeTransactions(): SafeTransaction[] {
    return this.getItem<SafeTransaction[]>(STORAGE_KEYS.DEALER_SAFE_TRANSACTIONS, [
      {
        id: 'dst_init_001',
        type: 'cash_in',
        amount: 50000,
        balanceAfter: 50000,
        category: 'capital',
        description: 'رصيد افتتاحي - الخزنة الرئيسية لقطاع التجار',
        performedBy: 'الإدارة العليا',
        createdAt: '2026-09-01T09:00:00.000Z',
        currency: 'EGP',
        balanceBefore: 0,
        operationNumber: 'TX-DLR-INIT',
        vaultId: 'dealer_main_vault'
      },
      {
        id: 'dst_init_002',
        type: 'cash_in',
        amount: 50000,
        balanceAfter: 1000,
        category: 'capital',
        description: 'رصيد دولاري افتتاحي - خزنة التجار (1,000 $)',
        performedBy: 'الإدارة العليا',
        createdAt: '2026-09-01T09:30:00.000Z',
        currency: 'USD',
        usdAmount: 1000,
        usdExchangeRate: 50,
        balanceBefore: 0,
        balanceAfterUSD: 1000,
        operationNumber: 'TX-DLR-USD-01',
        vaultId: 'dealer_main_vault'
      }
    ]);
  }

  public getDealerMainVaultSummary() {
    const txs = this.getDealerSafeTransactions();
    let balanceEGP = 0;
    let balanceUSD = 0;
    let totalUsdPurchased = 0;
    let totalUsdCostEGP = 0;
    let totalRevenueEGP = 0;
    let totalExpensesEGP = 0;
    const lastUpdated = txs.length > 0 ? txs[0].createdAt : new Date().toISOString();

    const chronological = [...txs].reverse();
    for (const tx of chronological) {
      if (tx.type === 'exchange') {
        const uAmt = tx.usdAmount || (tx.usdExchangeRate ? tx.amount / tx.usdExchangeRate : 0);
        const egpAmt = tx.egpAmount || tx.amount;
        const uRate = tx.usdExchangeRate || (uAmt > 0 ? egpAmt / uAmt : 50);

        if (tx.exchangeType === 'buy_usd') {
          balanceEGP -= egpAmt;
          balanceUSD += uAmt;
          totalUsdPurchased += uAmt;
          totalUsdCostEGP += egpAmt;
        } else if (tx.exchangeType === 'sell_usd') {
          balanceUSD = Math.max(0, balanceUSD - uAmt);
          balanceEGP += egpAmt;
          const currentAvg = totalUsdPurchased > 0 ? totalUsdCostEGP / totalUsdPurchased : uRate;
          totalUsdPurchased = Math.max(0, totalUsdPurchased - uAmt);
          totalUsdCostEGP = Math.max(0, totalUsdCostEGP - (uAmt * currentAvg));
        }
      } else if (tx.currency === 'USD') {
        const uAmt = tx.usdAmount ?? (tx.usdExchangeRate ? tx.amount / tx.usdExchangeRate : tx.amount);
        const uRate = tx.usdExchangeRate || 50;
        if (tx.type === 'cash_in') {
          balanceUSD += uAmt;
          totalUsdPurchased += uAmt;
          totalUsdCostEGP += uAmt * uRate;
          totalRevenueEGP += uAmt * uRate;
        } else if (tx.type === 'cash_out') {
          balanceUSD = Math.max(0, balanceUSD - uAmt);
          totalExpensesEGP += uAmt * uRate;
        }
      } else {
        if (tx.type === 'cash_in' || (tx.type === 'settlement' && tx.amount >= 0)) {
          balanceEGP += tx.amount;
          totalRevenueEGP += tx.amount;
        } else if (tx.type === 'cash_out' || (tx.type === 'settlement' && tx.amount < 0)) {
          balanceEGP -= Math.abs(tx.amount);
          totalExpensesEGP += Math.abs(tx.amount);
        }
      }
    }

    const avgUsdPurchaseRate = totalUsdPurchased > 0 ? totalUsdCostEGP / totalUsdPurchased : 50;
    const netBalanceEGP = balanceEGP + balanceUSD * avgUsdPurchaseRate;

    return {
      balanceEGP: Math.round(balanceEGP * 100) / 100,
      balanceUSD: Math.round(balanceUSD * 100) / 100,
      totalUsdPurchased: Math.round(totalUsdPurchased * 100) / 100,
      totalUsdCostEGP: Math.round(totalUsdCostEGP * 100) / 100,
      avgUsdPurchaseRate: Math.round(avgUsdPurchaseRate * 100) / 100,
      totalRevenueEGP: Math.round(totalRevenueEGP * 100) / 100,
      totalExpensesEGP: Math.round(totalExpensesEGP * 100) / 100,
      netBalanceEGP: Math.round(netBalanceEGP * 100) / 100,
      lastUpdated
    };
  }

  public addDealerSafeTransaction(
    type: SafeTransaction['type'],
    amount: number,
    category: SafeTransaction['category'],
    description: string,
    performedBy: string,
    referenceId?: string,
    options?: {
      currency?: 'EGP' | 'USD';
      usdAmount?: number;
      usdExchangeRate?: number;
      operationNumber?: string;
      notes?: string;
      vaultId?: string;
      user?: any;
    }
  ): SafeTransaction {
    const txs = this.getDealerSafeTransactions();
    const isUSD = options?.currency === 'USD';
    const vaultSummary = this.getDealerMainVaultSummary();

    const currentBalanceEGP = vaultSummary.balanceEGP;
    const currentBalanceUSD = vaultSummary.balanceUSD;

    let newBalanceEGP = currentBalanceEGP;
    let newBalanceUSD = currentBalanceUSD;

    const opNum = options?.operationNumber || `DLR-TX-${Date.now().toString().slice(-6)}`;

    if (isUSD) {
      const uAmt = options?.usdAmount ?? (options?.usdExchangeRate ? amount / options.usdExchangeRate : amount);
      if (type === 'cash_in') {
        newBalanceUSD += uAmt;
      } else if (type === 'cash_out') {
        newBalanceUSD = Math.max(0, newBalanceUSD - uAmt);
      }
    } else {
      if (type === 'cash_in' || (type === 'settlement' && amount >= 0)) {
        newBalanceEGP += amount;
      } else if (type === 'cash_out' || (type === 'settlement' && amount < 0)) {
        newBalanceEGP -= Math.abs(amount);
      }
    }

    const newTx: SafeTransaction = {
      id: 'dst_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type,
      amount,
      balanceAfter: isUSD ? newBalanceUSD : newBalanceEGP,
      category,
      description,
      performedBy,
      referenceId,
      createdAt: new Date().toISOString(),
      currency: options?.currency || 'EGP',
      usdAmount: options?.usdAmount,
      usdExchangeRate: options?.usdExchangeRate,
      balanceAfterUSD: newBalanceUSD,
      balanceBefore: isUSD ? currentBalanceUSD : currentBalanceEGP,
      balanceBeforeUSD: currentBalanceUSD,
      operationNumber: opNum,
      notes: options?.notes,
      vaultId: options?.vaultId || 'dealer_main_vault'
    };

    txs.unshift(newTx);
    this.setItem(STORAGE_KEYS.DEALER_SAFE_TRANSACTIONS, txs);

    if (options?.user) {
      try {
        this.addAuditLog(
          options.user,
          'add',
          'dealer_safe_transaction',
          newTx.id,
          `حركة خزنة تجار (${type === 'cash_in' ? 'إيداع' : 'صرف'}): ${description} بقيمة ${amount} ${newTx.currency}`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, newTx);
    return newTx;
  }

  public deleteDealerSafeTransaction(id: string, user?: any, reason?: string): boolean {
    const txs = this.getDealerSafeTransactions();
    const target = txs.find(t => t.id === id);
    if (!target) return false;

    this.setItem(STORAGE_KEYS.DEALER_SAFE_TRANSACTIONS, txs.filter(t => t.id !== id));

    const userObj = user || { id: 'usr_' + (target.performedBy || 'admin'), name: target.performedBy || 'المسؤول', role: 'admin', department: 'التجار' };
    try {
      this.addAuditLog(
        userObj,
        'delete',
        'dealer_safe_transaction',
        id,
        `حذف حركة خزنة التجار (${target.type === 'cash_in' ? 'إيداع' : 'صرف'}): ${target.amount} ${target.currency || 'EGP'}${reason ? ` — السبب: ${reason}` : ''}`,
        target,
        null
      );
    } catch (e) {}

    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, { type: 'delete_dealer', id });
    return true;
  }

  public updateDealerSafeTransaction(id: string, updates: Partial<SafeTransaction>, user?: any): SafeTransaction | null {
    const txs = this.getDealerSafeTransactions();
    const idx = txs.findIndex(t => t.id === id);
    if (idx < 0) return null;

    const oldTx = { ...txs[idx] };
    txs[idx] = { ...txs[idx], ...updates, updatedAt: new Date().toISOString() };
    this.setItem(STORAGE_KEYS.DEALER_SAFE_TRANSACTIONS, txs);

    const userObj = user || { id: 'usr_' + (txs[idx].performedBy || 'admin'), name: txs[idx].performedBy || 'المسؤول', role: 'admin', department: 'التجار' };
    try {
      this.addAuditLog(
        userObj,
        'edit',
        'dealer_safe_transaction',
        id,
        `تعديل حركة خزنة التجار: ${txs[idx].operationNumber || id}`,
        oldTx,
        txs[idx]
      );
    } catch (e) {}

    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, txs[idx]);
    return txs[idx];
  }

  public exchangeDealerSafeCurrency(
    exchangeType: 'buy_usd' | 'sell_usd',
    usdAmount: number,
    usdExchangeRate: number,
    description: string,
    performedBy: string,
    notes?: string,
    user?: any
  ): SafeTransaction {
    const txs = this.getDealerSafeTransactions();
    const vaultSummary = this.getDealerMainVaultSummary();

    const currentBalanceEGP = vaultSummary.balanceEGP;
    const currentBalanceUSD = vaultSummary.balanceUSD;

    const egpAmount = Math.round(usdAmount * usdExchangeRate * 100) / 100;

    let newBalanceEGP = currentBalanceEGP;
    let newBalanceUSD = currentBalanceUSD;

    if (exchangeType === 'buy_usd') {
      if (egpAmount > currentBalanceEGP) {
        throw new Error(`رصيد الجنيه في خزنة التجار (${currentBalanceEGP.toLocaleString()} ج.م) لا يكفي لشراء $${usdAmount} بتكلفة ${egpAmount.toLocaleString()} ج.م`);
      }
      newBalanceEGP -= egpAmount;
      newBalanceUSD += usdAmount;
    } else {
      if (usdAmount > currentBalanceUSD) {
        throw new Error(`رصيد الدولار في خزنة التجار ($${currentBalanceUSD.toLocaleString()}) لا يكفي لبيع $${usdAmount}`);
      }
      newBalanceUSD = Math.max(0, newBalanceUSD - usdAmount);
      newBalanceEGP += egpAmount;
    }

    const opNum = `DEX-${Date.now().toString().slice(-6)}`;

    const newTx: SafeTransaction = {
      id: 'dst_ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: 'exchange',
      exchangeType,
      amount: egpAmount,
      balanceAfter: Math.round(newBalanceEGP * 100) / 100,
      balanceBefore: Math.round(currentBalanceEGP * 100) / 100,
      category: 'currency_exchange',
      description: description || (exchangeType === 'buy_usd' ? `شراء دولار (خزنة التجار): $${usdAmount} بسعر ${usdExchangeRate} ج.م` : `بيع دولار (خزنة التجار): $${usdAmount} بسعر ${usdExchangeRate} ج.م`),
      performedBy,
      createdAt: new Date().toISOString(),
      currency: exchangeType === 'buy_usd' ? 'USD' : 'EGP',
      usdAmount,
      usdExchangeRate,
      egpAmount,
      balanceBeforeUSD: Math.round(currentBalanceUSD * 100) / 100,
      balanceAfterUSD: Math.round(newBalanceUSD * 100) / 100,
      operationNumber: opNum,
      notes,
      vaultId: 'dealer_main_vault'
    };

    txs.unshift(newTx);
    this.setItem(STORAGE_KEYS.DEALER_SAFE_TRANSACTIONS, txs);

    if (user) {
      try {
        this.addAuditLog(
          user,
          'vault_exchange',
          'dealer_safe_transaction',
          newTx.id,
          `${exchangeType === 'buy_usd' ? 'شراء دولار' : 'بيع دولار'}: $${usdAmount} بسعر ${usdExchangeRate} ج.م (الإجمالي: ${egpAmount} ج.م)`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, newTx);
    return newTx;
  }

  public getDealerWallets(): StoreWallet[] {
    const defaultDealerWallets: StoreWallet[] = [
      {
        id: 'mw_profits',
        name: 'محفظة أرباح التجار',
        type: 'profits',
        systemType: 'profits',
        isSystemWallet: true,
        currency: 'EGP',
        balance: 0,
        controlledBy: 'owner',
        allowWithdrawal: true,
        status: 'active',
        warningThreshold: 1000,
        notes: 'خزنة تجميع وتوثيق أرباح مبيعات الجملة وتذاكر التجار',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'mw_cashback',
        name: 'محفظة كاش باك التجار',
        type: 'trust',
        systemType: 'cashback',
        isSystemWallet: true,
        currency: 'EGP',
        balance: 1895,
        totalReceived: 4430,
        totalWithdrawn: 2535,
        controlledBy: 'owner',
        allowWithdrawal: true,
        status: 'active',
        warningThreshold: 500,
        notes: 'خزنة كاش باك ومكافآت كبار التجار والموزعين المستحقة',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'mw_referrals',
        name: 'محفظة إحالات وعمولات التجار',
        type: 'trust',
        systemType: 'referrals',
        isSystemWallet: true,
        currency: 'EGP',
        balance: 4660,
        totalReceived: 10670,
        totalWithdrawn: 6010,
        controlledBy: 'owner',
        allowWithdrawal: true,
        status: 'active',
        warningThreshold: 500,
        notes: 'خزنة عمولات تسويق وإحالة التجار الجدد',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'mw_debts',
        name: 'محفظة ديون وأمانات التجار',
        type: 'trust',
        systemType: 'trust',
        isSystemWallet: true,
        currency: 'EGP',
        balance: 4570,
        totalReceived: 4570,
        controlledBy: 'owner',
        allowWithdrawal: true,
        status: 'active',
        warningThreshold: 1000,
        notes: 'خزنة الأمانات والديون والودائع الخاصة بقطاع التجار',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ];

    const wallets = this.getItem<StoreWallet[]>(STORAGE_KEYS.DEALER_WALLETS, defaultDealerWallets);

    let modified = false;
    for (const sysW of defaultDealerWallets) {
      const exists = wallets.some(w => w.id === sysW.id || (w.isSystemWallet && w.systemType === sysW.systemType));
      if (!exists) {
        wallets.push(sysW);
        modified = true;
      }
    }
    if (modified) {
      this.setItem(STORAGE_KEYS.DEALER_WALLETS, wallets);
    }
    return wallets;
  }

  public getDealerWalletTransactions(): StoreWalletTransaction[] {
    return this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.DEALER_WALLET_TRANSACTIONS, [
      {
        id: 'dwt_01',
        walletId: 'mw_profits',
        walletName: 'محفظة أرباح التجار',
        type: 'deposit',
        amount: 14500,
        currency: 'EGP',
        balanceBefore: 0,
        balanceAfter: 14500,
        description: 'رصيد افتتاحي لمحفظة أرباح قطاع التجار',
        createdAt: '2026-09-01T09:00:00.000Z'
      },
      {
        id: 'dwt_02',
        walletId: 'mw_cashback',
        walletName: 'محفظة كاش باك التجار',
        type: 'deposit',
        amount: 3200,
        currency: 'EGP',
        balanceBefore: 0,
        balanceAfter: 3200,
        description: 'رصيد كاش باك مستحق لتجار الجملة',
        createdAt: '2026-09-01T09:10:00.000Z'
      },
      {
        id: 'dwt_03',
        walletId: 'mw_referrals',
        walletName: 'محفظة إحالات وعمولات التجار',
        type: 'deposit',
        amount: 1800,
        currency: 'EGP',
        balanceBefore: 0,
        balanceAfter: 1800,
        description: 'عمولات إحالة مسوقي التجار',
        createdAt: '2026-09-01T09:20:00.000Z'
      },
      {
        id: 'dwt_04',
        walletId: 'mw_debts',
        walletName: 'محفظة ديون وأمانات التجار',
        type: 'deposit',
        amount: 9500,
        currency: 'EGP',
        balanceBefore: 0,
        balanceAfter: 9500,
        description: 'تأمين وودائع شحنات تجار',
        createdAt: '2026-09-01T09:30:00.000Z'
      }
    ]);
  }

  public depositToDealerWallet(
    walletId: string,
    amount: number,
    description: string,
    user?: any
  ): StoreWalletTransaction {
    const wallets = this.getDealerWallets();
    const wIndex = wallets.findIndex(w => w.id === walletId);
    if (wIndex < 0) throw new Error('محفظة التجار غير موجودة');

    const target = wallets[wIndex];
    const prevBalance = target.balance;
    const newBalance = prevBalance + amount;
    target.balance = newBalance;
    target.updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.DEALER_WALLETS, wallets);

    const txs = this.getDealerWalletTransactions();
    const tx: StoreWalletTransaction = {
      id: `dwt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      walletId,
      walletName: target.name,
      type: 'deposit',
      amount,
      currency: target.currency || 'EGP',
      balanceBefore: prevBalance,
      balanceAfter: newBalance,
      description: description || 'إيداع رصيد بمحفظة التجار',
      createdAt: new Date().toISOString()
    };
    txs.unshift(tx);
    this.setItem(STORAGE_KEYS.DEALER_WALLET_TRANSACTIONS, txs);

    if (user) {
      try {
        this.addAuditLog(
          user,
          'add',
          'dealer_wallet',
          walletId,
          `إيداع ${amount} ج.م في محفظة التجار (${target.name}) - ${description}`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.WALLET_MUTATED, target);
    return tx;
  }

  // 3. Dealer Daily Settlements & Closures
  public getDealerDailySettlements(): ShiftSettlement[] {
    return this.getItem<ShiftSettlement[]>(STORAGE_KEYS.DEALER_SETTLEMENTS, []);
  }

  public saveDealerDailySettlement(settlement: ShiftSettlement, user?: any): void {
    const all = this.getDealerDailySettlements();
    const index = all.findIndex(s => s.id === settlement.id);
    if (index >= 0) {
      all[index] = settlement;
    } else {
      all.unshift({ ...settlement, createdAt: new Date().toISOString() });
    }
    this.setItem(STORAGE_KEYS.DEALER_SETTLEMENTS, all);

    if (user) {
      try {
        this.addAuditLog(
          user,
          'add',
          'dealer_settlement',
          settlement.id,
          `إجراء تسوية وإغلاق وردية تجار (${settlement.shiftNumber}) - الفارق: ${settlement.difference || 0} ج.م`
        );
      } catch (_) {}
    }
  }

  public getDealerDailyClosures(): DailyClosureReport[] {
    return this.getItem<DailyClosureReport[]>(STORAGE_KEYS.DEALER_DAILY_CLOSURES, []);
  }

  public saveDealerDailyClosure(report: DailyClosureReport, user?: any): void {
    const all = this.getDealerDailyClosures();
    const index = all.findIndex(r => r.id === report.id);
    if (index >= 0) {
      all[index] = report;
    } else {
      all.unshift(report);
    }
    this.setItem(STORAGE_KEYS.DEALER_DAILY_CLOSURES, all);

    if (user) {
      try {
        this.addAuditLog(
          user,
          'add',
          'dealer_daily_closure',
          report.id,
          `اعتماد تقرير الإغلاق المالي اليومي لخزنة التجار (${report.date})`
        );
      } catch (_) {}
    }
  }

  // 4. Dealer Employees & HR Management (100% Isolated)
  public getDealerEmployees(includeInactive = true): Employee[] {
    const all = this.getItem<Employee[]>(STORAGE_KEYS.DEALER_EMPLOYEES, [
      {
        id: 'd_emp_001',
        employeeCode: 'EMP-DLR-01',
        fullName: 'محمود عبد الفتاح',
        job: 'مسؤول حسابات تجار الجملة',
        jobTitle: 'مشرف مبيعات كبار التجار والوكلاء',
        department: 'قسم التجار',
        phone: '01099887766',
        baseSalary: 8000,
        salaryPayoutDay: 1,
        hireDate: '2026-01-01',
        status: 'active',
        notes: 'مسؤول متابعة حسابات التجار والمطابقات الدورية',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'd_emp_002',
        employeeCode: 'EMP-DLR-02',
        fullName: 'كريم الشناوي',
        job: 'مسؤول دعم فني وشحن الجملة',
        jobTitle: 'أخصائي تذاكر وأكواد الجملة',
        department: 'قسم التجار',
        phone: '01122334455',
        baseSalary: 7000,
        salaryPayoutDay: 1,
        hireDate: '2026-02-15',
        status: 'active',
        notes: 'متابعة تنفيذ طلبيات شحن الألعاب للتجار',
        createdAt: '2026-02-15T00:00:00.000Z'
      }
    ]);
    return includeInactive ? all : all.filter(e => e.status === 'active');
  }

  public getDealerEmployeeById(id: string): Employee | undefined {
    return this.getDealerEmployees().find(e => e.id === id);
  }

  public saveDealerEmployee(employee: Employee, user?: any): void {
    const all = this.getDealerEmployees(true);
    const index = all.findIndex(e => e.id === employee.id);
    const isNew = index < 0;
    if (!isNew) {
      all[index] = { ...employee, updatedAt: new Date().toISOString() };
    } else {
      all.unshift({
        ...employee,
        id: employee.id || `d_emp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        createdAt: employee.createdAt || new Date().toISOString()
      });
    }
    this.setItem(STORAGE_KEYS.DEALER_EMPLOYEES, all);

    if (user) {
      try {
        this.addAuditLog(
          user,
          isNew ? 'add' : 'edit',
          'dealer_employee',
          employee.id,
          `${isNew ? 'إضافة موظف بقسم التجار' : 'تعديل موظف بقسم التجار'}: ${employee.fullName} (${employee.jobTitle})`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.EMPLOYEE_MUTATED, employee);
  }

  public deleteDealerEmployee(id: string, user?: any): void {
    const all = this.getDealerEmployees(true);
    const emp = all.find(e => e.id === id);
    const filtered = all.filter(e => e.id !== id);
    this.setItem(STORAGE_KEYS.DEALER_EMPLOYEES, filtered);

    if (user && emp) {
      try {
        this.addAuditLog(
          user,
          'delete',
          'dealer_employee',
          id,
          `حذف موظف قسم التجار: ${emp.fullName} (${emp.employeeCode})`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.EMPLOYEE_MUTATED, { id });
  }

  public getDealerAttendance(employeeId?: string): AttendanceRecord[] {
    const all = this.getItem<AttendanceRecord[]>(STORAGE_KEYS.DEALER_ATTENDANCE, [
      {
        id: 'd_att_01',
        employeeId: 'd_emp_001',
        employeeName: 'محمود عبد الفتاح',
        department: 'قسم التجار',
        date: new Date().toISOString().split('T')[0],
        checkIn: '09:00 ص',
        checkOut: '05:00 م',
        workHours: 8,
        status: 'present',
        notes: 'دوام منتظم'
      }
    ]);
    return employeeId ? all.filter(a => a.employeeId === employeeId) : all;
  }

  public recordDealerAttendanceCheckIn(
    employeeId: string,
    timeStr?: string,
    notes?: string,
    dateStr?: string
  ): AttendanceRecord {
    const emp = this.getDealerEmployeeById(employeeId);
    const today = dateStr || new Date().toISOString().split('T')[0];
    const nowTime = timeStr || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

    const all = this.getDealerAttendance();
    const existingIndex = all.findIndex(a => a.employeeId === employeeId && a.date === today);

    const record: AttendanceRecord = {
      id: existingIndex >= 0 ? all[existingIndex].id : `d_att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      employeeId,
      employeeName: emp?.fullName || 'موظف تجار',
      department: emp?.department || 'قسم التجار',
      date: today,
      checkIn: nowTime,
      workHours: existingIndex >= 0 ? all[existingIndex].workHours : 8,
      status: 'present',
      notes: notes || (existingIndex >= 0 ? all[existingIndex].notes : '')
    };

    if (existingIndex >= 0) {
      all[existingIndex] = record;
    } else {
      all.unshift(record);
    }
    this.setItem(STORAGE_KEYS.DEALER_ATTENDANCE, all);
    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, record);
    return record;
  }

  public recordDealerAttendanceCheckOut(
    employeeId: string,
    timeStr?: string,
    workHours?: number,
    notes?: string,
    dateStr?: string
  ): AttendanceRecord | null {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const nowTime = timeStr || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const all = this.getDealerAttendance();

    const index = all.findIndex(a => a.employeeId === employeeId && a.date === today);
    if (index >= 0) {
      all[index].checkOut = nowTime;
      if (workHours !== undefined && workHours > 0) {
        all[index].workHours = workHours;
      }
      if (notes) {
        all[index].notes = (all[index].notes ? all[index].notes + ' | ' : '') + notes;
      }
      this.setItem(STORAGE_KEYS.DEALER_ATTENDANCE, all);
      eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, all[index]);
      return all[index];
    } else {
      const emp = this.getDealerEmployeeById(employeeId);
      const newRec: AttendanceRecord = {
        id: `d_att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        employeeId,
        employeeName: emp?.fullName || 'موظف تجار',
        department: emp?.department || 'قسم التجار',
        date: today,
        checkIn: '09:00 ص',
        checkOut: nowTime,
        workHours: workHours || 8,
        status: 'present',
        notes: notes || 'تسجيل انصراف موظف تجار'
      };
      all.unshift(newRec);
      this.setItem(STORAGE_KEYS.DEALER_ATTENDANCE, all);
      eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, newRec);
      return newRec;
    }
  }

  public recordDealerAttendanceAbsence(
    employeeId: string,
    dateStr?: string,
    reason?: string,
    deductionAmount?: number,
    user?: any,
    timeStr?: string
  ): AttendanceRecord {
    const emp = this.getDealerEmployeeById(employeeId);
    const date = dateStr || new Date().toISOString().split('T')[0];
    const nowTime = timeStr || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const all = this.getDealerAttendance();

    const existingIndex = all.findIndex(a => a.employeeId === employeeId && a.date === date);
    const record: AttendanceRecord = {
      id: existingIndex >= 0 ? all[existingIndex].id : `d_att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      employeeId,
      employeeName: emp?.fullName || 'موظف تجار',
      department: emp?.department || 'قسم التجار',
      date,
      checkIn: '-',
      checkOut: '-',
      workHours: 0,
      status: 'absent',
      absenceTime: nowTime,
      recordedAt: new Date().toISOString(),
      notes: reason || 'غياب موظف تجار'
    };

    if (existingIndex >= 0) {
      all[existingIndex] = record;
    } else {
      all.unshift(record);
    }
    this.setItem(STORAGE_KEYS.DEALER_ATTENDANCE, all);

    if (deductionAmount && deductionAmount > 0) {
      const targetMonth = date.substring(0, 7);
      this.applyDealerEmployeeDeductionOrBonus(
        employeeId,
        'deduction',
        deductionAmount,
        `خصم غياب يوم ${date} (${reason || 'غياب'})`,
        targetMonth,
        date,
        nowTime
      );
    }

    if (user) {
      try {
        this.addAuditLog(
          user,
          'edit',
          'dealer_employee',
          employeeId,
          `تسجيل غياب لموظف التجار ${emp?.fullName || employeeId} بتاريخ ${date} الساعة ${nowTime} - السبب: ${reason || 'بدون إذن'}`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, record);
    return record;
  }

  public recordDealerAttendanceLeave(
    employeeId: string,
    startDate: string,
    endDate: string,
    daysCount: number,
    leaveType: string,
    reason: string,
    user?: any,
    timeStr?: string
  ): AttendanceRecord[] {
    const emp = this.getDealerEmployeeById(employeeId);
    const all = this.getDealerAttendance();
    const createdRecords: AttendanceRecord[] = [];
    const nowTime = timeStr || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
    const actualDays = Math.max(daysCount, diffDays);

    for (let i = 0; i < actualDays; i++) {
      const currentDay = new Date(start);
      currentDay.setDate(start.getDate() + i);
      const dayStr = currentDay.toISOString().split('T')[0];

      const existingIndex = all.findIndex(a => a.employeeId === employeeId && a.date === dayStr);
      const rec: AttendanceRecord = {
        id: existingIndex >= 0 ? all[existingIndex].id : `d_att_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
        employeeId,
        employeeName: emp?.fullName || 'موظف تجار',
        department: emp?.department || 'قسم التجار',
        date: dayStr,
        checkIn: '-',
        checkOut: '-',
        workHours: 0,
        status: 'leave',
        absenceTime: undefined,
        leaveTime: nowTime,
        recordedAt: new Date().toISOString(),
        notes: `إجازة ${leaveType}: ${reason || 'إجازة معتمدة'} (${i + 1}/${actualDays})`,
        leaveStartDate: startDate,
        leaveEndDate: endDate,
        leaveDays: actualDays,
        leaveType
      };

      if (existingIndex >= 0) {
        all[existingIndex] = rec;
      } else {
        all.unshift(rec);
      }
      createdRecords.push(rec);
    }

    this.setItem(STORAGE_KEYS.DEALER_ATTENDANCE, all);

    const today = new Date().toISOString().split('T')[0];
    if (today >= startDate && today <= endDate) {
      const allEmployees = this.getDealerEmployees();
      const empIndex = allEmployees.findIndex(e => e.id === employeeId);
      if (empIndex >= 0) {
        allEmployees[empIndex].status = 'on_leave';
        this.setItem(STORAGE_KEYS.DEALER_EMPLOYEES, allEmployees);
      }
    }

    if (user) {
      try {
        this.addAuditLog(
          user,
          'edit',
          'dealer_employee',
          employeeId,
          `تسجيل إجازة (${leaveType}) لموظف التجار ${emp?.fullName || employeeId} لمدة ${actualDays} أيام (من ${startDate} إلى ${endDate})`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, createdRecords);
    return createdRecords;
  }

  public getDealerSalaries(): SalarySlip[] {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return this.getItem<SalarySlip[]>(STORAGE_KEYS.DEALER_SALARIES, [
      {
        id: 'd_slip_01',
        employeeId: 'd_emp_001',
        employeeName: 'محمود عبد الفتاح',
        department: 'قسم التجار',
        month: currentMonth,
        baseSalary: 8000,
        bonuses: 500,
        deductions: 0,
        totalSalary: 8500,
        isPaid: false
      },
      {
        id: 'd_slip_02',
        employeeId: 'd_emp_002',
        employeeName: 'كريم الشناوي',
        department: 'قسم التجار',
        month: currentMonth,
        baseSalary: 7000,
        bonuses: 0,
        deductions: 0,
        totalSalary: 7000,
        isPaid: false
      }
    ]);
  }

  public saveDealerSalarySlip(slip: SalarySlip): void {
    const all = this.getDealerSalaries();
    const index = all.findIndex(s => s.id === slip.id);
    if (index >= 0) {
      all[index] = slip;
    } else {
      all.unshift(slip);
    }
    this.setItem(STORAGE_KEYS.DEALER_SALARIES, all);
    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, slip);
  }

  public payDealerSalarySlip(id: string, method?: string, user?: string): void {
    const all = this.getDealerSalaries();
    const index = all.findIndex(s => s.id === id);
    if (index >= 0) {
      const paymentMethod = method || 'نقدية من خزنة التجار';
      all[index].isPaid = true;
      all[index].paidAt = new Date().toISOString();
      all[index].paymentMethod = paymentMethod;
      if (user) {
        all[index].notes = (all[index].notes ? all[index].notes + ' | ' : '') + `تم الصرف بواسطة: ${user}`;
      }
      this.setItem(STORAGE_KEYS.DEALER_SALARIES, all);

      const slip = all[index];
      // Deduct from Dealer Main Safe
      this.addDealerSafeTransaction(
        'cash_out',
        slip.totalSalary,
        'salary',
        `صرف راتب شهر ${slip.month} لموظف قسم التجار: ${slip.employeeName} [${paymentMethod}]`,
        user || 'مسؤول مالية التجار',
        slip.id
      );

      eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, all[index]);
    }
  }

  public applyDealerEmployeeDeductionOrBonus(
    employeeId: string,
    type: 'deduction' | 'bonus',
    amount: number,
    reason: string,
    month?: string,
    date?: string,
    timeStr?: string
  ): SalarySlip {
    const emp = this.getDealerEmployeeById(employeeId);
    const now = new Date();
    const targetDate = date || now.toISOString().split('T')[0];
    const targetTime = timeStr || now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const targetMonth = month || targetDate.substring(0, 7);
    const all = this.getDealerSalaries();

    const slipIndex = all.findIndex(s => s.employeeId === employeeId && s.month === targetMonth);
    let slip: SalarySlip;

    if (slipIndex >= 0) {
      slip = all[slipIndex];
      if (type === 'bonus') {
        slip.bonuses = (slip.bonuses || 0) + amount;
      } else {
        slip.deductions = (slip.deductions || 0) + amount;
      }
      slip.totalSalary = Math.max(0, slip.baseSalary + (slip.bonuses || 0) - (slip.deductions || 0));
      slip.notes = (slip.notes ? slip.notes + ' | ' : '') + `${type === 'bonus' ? '+' : '-'}${amount} (${reason}) - ${targetDate} ${targetTime}`;
      all[slipIndex] = slip;
    } else {
      slip = {
        id: `d_slip_${Date.now()}`,
        employeeId,
        employeeName: emp?.fullName || 'موظف تجار',
        department: emp?.department || 'قسم التجار',
        month: targetMonth,
        baseSalary: emp?.baseSalary || 5000,
        bonuses: type === 'bonus' ? amount : 0,
        deductions: type === 'deduction' ? amount : 0,
        totalSalary: Math.max(0, (emp?.baseSalary || 5000) + (type === 'bonus' ? amount : -amount)),
        isPaid: false,
        notes: `${type === 'bonus' ? '+' : '-'}${amount} (${reason}) - ${targetDate} ${targetTime}`
      };
      all.unshift(slip);
    }

    this.setItem(STORAGE_KEYS.DEALER_SALARIES, all);

    // If deduction, also record inside emp.deductions
    if (emp && type === 'deduction') {
      emp.deductions = emp.deductions || [];
      emp.deductions.unshift({
        id: `d_ded_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        employeeId,
        amount,
        calculationType: 'amount',
        reason,
        date: targetDate,
        time: targetTime,
        month: targetMonth,
        createdAt: now.toISOString()
      });
      this.saveDealerEmployee(emp);
    }

    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, slip);
    return slip;
  }

  public addDealerEmployeeAdvance(
    employeeId: string,
    amount: number,
    reason: string,
    disbursedFromVault: boolean,
    user?: any,
    requestDate?: string,
    requestTime?: string,
    disbursedDate?: string,
    disbursedTime?: string
  ): EmployeeAdvance {
    const emp = this.getDealerEmployeeById(employeeId);
    if (!emp) throw new Error('Employee not found');

    const now = new Date();
    const reqD = requestDate || now.toISOString().split('T')[0];
    const reqT = requestTime || now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const disD = disbursedDate || (disbursedFromVault ? reqD : undefined);
    const disT = disbursedTime || (disbursedFromVault ? reqT : undefined);

    const advance: EmployeeAdvance = {
      id: `d_adv_${Date.now()}`,
      employeeId,
      amount,
      requestDate: reqD,
      requestTime: reqT,
      disbursedDate: disD,
      disbursedTime: disT,
      status: disbursedFromVault ? 'disbursed' : 'pending',
      repaidAmount: 0,
      reason,
      disbursedFromVault,
      createdAt: now.toISOString()
    };

    if (disbursedFromVault) {
      const tx = this.addDealerSafeTransaction(
        'cash_out',
        amount,
        'salary',
        `صرف سلفة لموظف قسم التجار: ${emp.fullName} (${reason}) - بتاريخ ${reqD} الساعة ${reqT}`,
        user?.name || 'إدارة التجار',
        advance.id,
        { user }
      );
      advance.vaultTxId = tx.id;
    }

    emp.advances = emp.advances || [];
    emp.advances.unshift(advance);
    this.saveDealerEmployee(emp, user);
    return advance;
  }

  public addDealerEmployeeIncentive(
    employeeId: string,
    amount: number,
    type: 'reward' | 'incentive' | 'overtime' | 'bonus',
    reason: string,
    month?: string,
    user?: any,
    date?: string,
    timeStr?: string
  ): EmployeeIncentive {
    const emp = this.getDealerEmployeeById(employeeId);
    if (!emp) throw new Error('Employee not found');

    const now = new Date();
    const incDate = date || now.toISOString().split('T')[0];
    const incTime = timeStr || now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const incMonth = month || incDate.substring(0, 7);

    const inc: EmployeeIncentive = {
      id: `d_inc_${Date.now()}`,
      employeeId,
      amount,
      type,
      reason,
      date: incDate,
      time: incTime,
      month: incMonth,
      createdAt: now.toISOString()
    };

    emp.incentives = emp.incentives || [];
    emp.incentives.unshift(inc);
    this.saveDealerEmployee(emp, user);

    this.applyDealerEmployeeDeductionOrBonus(
      employeeId,
      'bonus',
      amount,
      `${type === 'reward' ? 'مكافأة' : 'حافز'}: ${reason}`,
      inc.month,
      inc.date,
      inc.time
    );
    return inc;
  }

  public addDealerEmployeeAttachment(
    employeeId: string,
    name: string,
    url: string,
    type: string,
    user?: any
  ): EmployeeAttachment {
    const emp = this.getDealerEmployeeById(employeeId);
    if (!emp) throw new Error('Employee not found');

    const att: EmployeeAttachment = {
      id: `d_att_f_${Date.now()}`,
      name,
      url,
      type,
      uploadedAt: new Date().toISOString()
    };

    emp.attachments = emp.attachments || [];
    emp.attachments.unshift(att);
    this.saveDealerEmployee(emp, user);
    return att;
  }

  public deleteDealerEmployeeAttachment(employeeId: string, attachmentId: string, user?: any): void {
    const emp = this.getDealerEmployeeById(employeeId);
    if (!emp || !emp.attachments) return;
    emp.attachments = emp.attachments.filter(a => a.id !== attachmentId);
    this.saveDealerEmployee(emp, user);
  }

  // 5. Dealer Expenses Management (100% Isolated)
  public getDealerExpenses(includeArchived = false): Expense[] {
    const all = this.getItem<Expense[]>(STORAGE_KEYS.DEALER_EXPENSES, [
      {
        id: 'd_exp_001',
        title: 'خوادم وربط API لتذاكر التجار',
        amount: 1200,
        date: '2026-09-02',
        category: 'operations',
        paymentMethod: 'cash',
        paidFromVault: true,
        approvedBy: 'كريم الشناوي',
        isArchived: false,
        notes: 'اشتراك خادم سريع لضمان تسليم فوري لطلبات الجملة',
        createdAt: '2026-09-02T10:00:00.000Z'
      }
    ]);
    return includeArchived ? all : all.filter(e => !e.isArchived);
  }

  public saveDealerExpense(expense: Expense, user?: any): void {
    const expenses = this.getDealerExpenses(true);
    const index = expenses.findIndex(e => e.id === expense.id);
    if (index >= 0) {
      expenses[index] = expense;
    } else {
      expenses.unshift(expense);
    }
    this.setItem(STORAGE_KEYS.DEALER_EXPENSES, expenses);
    if (user) {
      try {
        this.addAuditLog(user, 'edit', 'dealer_expense', expense.id, `تعديل مصروف تجار: ${expense.title}`);
      } catch (_) {}
    }
    eventBus.publish(SYSTEM_EVENTS.EXPENSE_ADDED, expense);
  }

  public addDealerExpense(
    expense: Omit<Expense, 'id' | 'createdAt' | 'isArchived'> & { deductFromSafe?: boolean },
    user?: any
  ): Expense {
    const expenses = this.getDealerExpenses(true);
    const newExpense: Expense = {
      ...expense,
      id: 'd_exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      isArchived: false
    };
    expenses.unshift(newExpense);
    this.setItem(STORAGE_KEYS.DEALER_EXPENSES, expenses);

    if (expense.deductFromSafe) {
      this.addDealerSafeTransaction(
        'cash_out',
        expense.amount,
        'expense',
        `صرف مصروف تجار: ${expense.title} (${expense.category})`,
        expense.approvedBy || user?.name || 'مسؤول المصروفات',
        newExpense.id,
        {
          notes: expense.notes,
          user
        }
      );
    }

    if (user) {
      try {
        this.addAuditLog(
          user,
          'add',
          'dealer_expense',
          newExpense.id,
          `تسجيل مصروف تجار بقيمة ${expense.amount} ج.م - ${expense.title}`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.EXPENSE_ADDED, newExpense);
    return newExpense;
  }

  public deleteDealerExpense(id: string, user?: any): void {
    const expenses = this.getDealerExpenses(true);
    const exp = expenses.find(e => e.id === id);
    const filtered = expenses.filter(e => e.id !== id);
    this.setItem(STORAGE_KEYS.DEALER_EXPENSES, filtered);

    if (user && exp) {
      try {
        this.addAuditLog(user, 'delete', 'dealer_expense', id, `حذف مصروف تجار: ${exp.title}`);
      } catch (_) {}
    }
  }

  public archiveDealerExpense(id: string, user?: any): void {
    const expenses = this.getDealerExpenses(true);
    const item = expenses.find(e => e.id === id);
    if (item) {
      item.isArchived = true;
      this.setItem(STORAGE_KEYS.DEALER_EXPENSES, expenses);
      if (user) {
        try {
          this.addAuditLog(user, 'archive', 'dealer_expense', id, `أرشفة مصروف تجار: ${item.title}`);
        } catch (_) {}
      }
    }
  }

  // 6. Dealer Debts Management (100% Isolated)
  public getDealerDebts(includeArchived = false): Debt[] {
    const all = this.getItem<Debt[]>(STORAGE_KEYS.DEALER_DEBTS, [
      {
        id: 'd_debt_001',
        partyType: 'customer',
        debtType: 'receivable',
        category: 'general',
        partyName: 'متجر الصقر للخدمات الرقمية',
        totalAmount: 15000,
        paidAmount: 5000,
        remainingAmount: 10000,
        dueDate: '2026-09-25',
        status: 'partially_paid',
        isArchived: false,
        notes: 'مديونية مستحقة عن شحنة بطاقات جملة برصيد آجل',
        installments: [
          {
            id: 'd_inst_01',
            debtId: 'd_debt_001',
            amount: 5000,
            paymentDate: '2026-08-30',
            paidBy: 'متجر الصقر',
            notes: 'سداد دفعة أولى نقداً وتم توريدها لخزنة التجار'
          }
        ],
        createdAt: '2026-08-15T00:00:00.000Z'
      },
      {
        id: 'd_debt_002',
        partyType: 'supplier',
        debtType: 'payable',
        category: 'equipment',
        partyName: 'شركة النيل للحلول التقنية والعتاد',
        totalAmount: 18000,
        paidAmount: 6000,
        remainingAmount: 12000,
        dueDate: '2026-10-01',
        status: 'partially_paid',
        isArchived: false,
        notes: 'شراء أجهزة ومعدات حاسوب وطابعات فواتير لقسم التجار',
        equipmentName: 'أجهزة كمبيوتر وطابعات فواتير تجار',
        installments: [
          {
            id: 'd_inst_eq_01',
            debtId: 'd_debt_002',
            amount: 6000,
            paymentDate: '2026-08-01',
            paidBy: 'الإدارة',
            notes: 'سداد القسط الأول من الخزنة'
          }
        ],
        createdAt: '2026-07-01T00:00:00.000Z'
      }
    ]);
    return includeArchived ? all : all.filter(d => !d.isArchived);
  }

  public saveDealerDebt(debt: Debt, user?: any): Debt {
    const debts = this.getDealerDebts(true);
    const index = debts.findIndex(d => d.id === debt.id);
    if (index >= 0) {
      return this.updateDealerDebt(debt, user);
    } else {
      return this.addDealerDebt(debt, user);
    }
  }

  public addDealerDebt(debt: Omit<Debt, 'id' | 'createdAt' | 'isArchived'>, user?: any): Debt {
    const debts = this.getDealerDebts(true);
    const newDebt: Debt = {
      ...debt,
      id: 'd_debt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      remainingAmount: debt.remainingAmount !== undefined ? debt.remainingAmount : debt.totalAmount,
      paidAmount: debt.paidAmount || 0,
      installments: debt.installments || [],
      isArchived: false,
      createdAt: new Date().toISOString()
    };
    debts.unshift(newDebt);
    this.setItem(STORAGE_KEYS.DEALER_DEBTS, debts);

    if (user) {
      try {
        this.addAuditLog(
          user,
          'add',
          'dealer_debt',
          newDebt.id,
          `تسجيل دين تجار جديد (${debt.debtType === 'payable' ? 'علينا' : 'لنا'}): ${debt.totalAmount} ج.م - الطرف: ${debt.partyName}`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.DEBT_UPDATED, newDebt);
    return newDebt;
  }

  public updateDealerDebt(debt: Debt, user?: any): Debt {
    const debts = this.getDealerDebts(true);
    const index = debts.findIndex(d => d.id === debt.id);
    if (index >= 0) {
      debts[index] = debt;
      this.setItem(STORAGE_KEYS.DEALER_DEBTS, debts);
      if (user) {
        try {
          this.addAuditLog(user, 'edit', 'dealer_debt', debt.id, `تعديل بيانات دين تجار: ${debt.id}`);
        } catch (_) {}
      }
      eventBus.publish(SYSTEM_EVENTS.DEBT_UPDATED, debts[index]);
      return debts[index];
    }
    return debt;
  }

  public deleteDealerDebt(id: string, user?: any): void {
    const debts = this.getDealerDebts(true);
    const debt = debts.find(d => d.id === id);
    const filtered = debts.filter(d => d.id !== id);
    this.setItem(STORAGE_KEYS.DEALER_DEBTS, filtered);

    if (user && debt) {
      try {
        this.addAuditLog(user, 'delete', 'dealer_debt', id, `حذف دين تجار: ${debt.id}`);
      } catch (_) {}
    }
  }

  public addDealerDebtInstallment(
    debtId: string,
    amount: number,
    paidBy: string,
    receiptNumber?: string,
    notes?: string,
    affectSafe = true,
    user?: any,
    paymentDate?: string
  ): void {
    const debts = this.getDealerDebts();
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const installment: DebtInstallment = {
      id: 'd_inst_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      debtId,
      amount,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paidBy,
      receiptNumber,
      notes
    };

    debt.installments = debt.installments || [];
    debt.installments.unshift(installment);
    debt.paidAmount = (debt.paidAmount || 0) + amount;
    debt.remainingAmount = Math.max(0, debt.remainingAmount - amount);
    if (debt.remainingAmount === 0) {
      debt.status = 'paid';
    } else {
      debt.status = 'partially_paid';
    }

    this.setItem(STORAGE_KEYS.DEALER_DEBTS, debts);

    if (affectSafe) {
      const isReceivable = debt.debtType === 'receivable';
      this.addDealerSafeTransaction(
        isReceivable ? 'cash_in' : 'cash_out',
        amount,
        isReceivable ? 'customer_deposit' : 'debt_payment',
        `${isReceivable ? 'تحصيل دفعة دين تجار' : 'سداد دفعة دين تجار'} من/إلى ${debt.partyName} (إيصال: ${receiptNumber || 'بدون'})`,
        paidBy,
        debt.id,
        {
          currency: debt.currency || 'EGP',
          notes,
          user
        }
      );
    }

    if (user) {
      try {
        this.addAuditLog(
          user,
          'edit',
          'dealer_debt',
          debt.id,
          `سداد/تحصيل قسط دين تجار بقيمة ${amount} ج.م - الطرف: ${debt.partyName}`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.DEBT_UPDATED, debt);
  }

  // ==========================================
  // PHASE 2: MERCHANTS & SUPPLIERS ENGINE
  // ==========================================

  public getMerchants(includeArchived = false): Merchant[] {
    const all = this.getItem<Merchant[]>(STORAGE_KEYS.MERCHANTS, initialMerchantsSeed);
    return includeArchived ? all : all.filter(m => !m.isArchived);
  }

  public getArchivedMerchants(): Merchant[] {
    const all = this.getItem<Merchant[]>(STORAGE_KEYS.MERCHANTS, initialMerchantsSeed);
    return all.filter(m => m.isArchived);
  }

  public getMerchantById(id: string): Merchant | undefined {
    return this.getItem<Merchant[]>(STORAGE_KEYS.MERCHANTS, initialMerchantsSeed).find(m => m.id === id);
  }

  public saveMerchant(merchant: Merchant): void {
    const merchants = this.getItem<Merchant[]>(STORAGE_KEYS.MERCHANTS, initialMerchantsSeed);
    const index = merchants.findIndex(m => m.id === merchant.id);

    // Auto calculate initial or updated performance score & 15-factor trust score
    const computedPerformance = this.calculateMerchantPerformance(merchant);
    const computedTrustScore = this.calculateMerchantTrustScore(merchant);

    const withMetrics: Merchant = {
      ...merchant,
      performance: computedPerformance,
      trustScore: computedTrustScore,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      merchants[index] = withMetrics;
    } else {
      merchants.unshift({
        ...withMetrics,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.setItem(STORAGE_KEYS.MERCHANTS, merchants);
  }

  // 15-Factor Automated Trust Score Engine
  public calculateMerchantTrustScore(merchant: Merchant): TrustScoreData {
    const currentTrust = merchant.trustScore || {
      score: 90,
      tier: 'gold' as const,
      tierLabel: 'مورد ذهبي موثوق (Gold Supplier)',
      badge: 'Gold Supplier' as const,
      trend: 'stable' as const,
      trendPercentage: 0.0,
      lastChangeReason: 'حساب جديد',
      positiveDrivers: [],
      negativeDrivers: [],
      factors: {
        paymentTimeliness: 95,
        deliveryTimeliness: 95,
        priceConsistency: 95,
        orderSuccessRate: 98,
        cancellationsPenalty: 98,
        disputesPenalty: 100,
        complaintsPenalty: 100,
        responseSpeed: 95,
        relationshipAgeMonths: 90,
        transactionVolumeScore: 90,
        serviceQualityStability: 95,
        priceStabilityScore: 95,
        delayCountScore: 95,
        disputeResolutionRate: 100,
        agreementFulfillmentRate: 95
      },
      historicalTimeline: [],
      isAlertActive: false,
      lastCalculatedAt: new Date().toISOString()
    };

    const perf = merchant.performance || {
      deliveryTimelinessScore: 90,
      executionSpeedScore: 90,
      orderSuccessRate: 98,
      canceledOrdersCount: 0,
      complaintsCount: 0,
      delayCount: 0,
      priceStabilityScore: 90,
      repaymentSpeedScore: 90,
      agreementCommitmentScore: 90
    };

    // Factor 1: Payment Timeliness (12%)
    const isDebtExceeded = merchant.balance > merchant.creditLimit;
    const paymentTimeliness = isDebtExceeded ? 25 : Math.min(100, Math.max(30, perf.repaymentSpeedScore || 90));

    // Factor 2: Delivery Timeliness (10%)
    const deliveryTimeliness = Math.min(100, Math.max(20, perf.deliveryTimelinessScore || 90));

    // Factor 3: Price Consistency (8%)
    const priceConsistency = Math.min(100, Math.max(20, perf.priceStabilityScore || 92));

    // Factor 4: Order Success Rate (10%)
    const orderSuccessRate = Math.min(100, Math.max(20, Math.round(perf.orderSuccessRate || 98)));

    // Factor 5: Cancellations Penalty (6%)
    const cancellationsPenalty = Math.max(20, 100 - (perf.canceledOrdersCount || 0) * 8);

    // Factor 6: Disputes Penalty (8%)
    const disputesPenalty = isDebtExceeded ? 40 : (perf.complaintsCount || 0) > 0 ? 60 : 100;

    // Factor 7: Complaints Penalty (6%)
    const complaintsPenalty = Math.max(20, 100 - (perf.complaintsCount || 0) * 15);

    // Factor 8: Response Speed (5%)
    const responseSpeed = Math.min(100, Math.max(40, perf.executionSpeedScore || 90));

    // Factor 9: Relationship Age / Seniority (5%)
    const relationshipAgeMonths = 90; // Standard mature account bonus

    // Factor 10: Transaction Volume Score (8%)
    const totalVol = (merchant.totalPurchases || 0) + (merchant.totalSales || 0);
    const transactionVolumeScore = Math.min(100, Math.max(40, Math.round(50 + (totalVol / 10000) * 5)));

    // Factor 11: Service Quality Stability (6%)
    const serviceQualityStability = Math.min(100, Math.max(30, Math.round((deliveryTimeliness + orderSuccessRate) / 2)));

    // Factor 12: Price Stability Score (4%)
    const priceStabilityScore = priceConsistency;

    // Factor 13: Delay Count Score (4%)
    const delayCountScore = Math.max(20, 100 - (perf.delayCount || 0) * 10);

    // Factor 14: Dispute Resolution Rate (4%)
    const disputeResolutionRate = (perf.complaintsCount || 0) === 0 ? 100 : 75;

    // Factor 15: Agreement Fulfillment Rate (4%)
    const agreementFulfillmentRate = isDebtExceeded ? 35 : Math.min(100, Math.max(30, perf.agreementCommitmentScore || 95));

    // Calculate Weighted Total (0 - 100)
    const weightedSum =
      paymentTimeliness * 0.12 +
      deliveryTimeliness * 0.10 +
      priceConsistency * 0.08 +
      orderSuccessRate * 0.10 +
      cancellationsPenalty * 0.06 +
      disputesPenalty * 0.08 +
      complaintsPenalty * 0.06 +
      responseSpeed * 0.05 +
      relationshipAgeMonths * 0.05 +
      transactionVolumeScore * 0.08 +
      serviceQualityStability * 0.06 +
      priceStabilityScore * 0.04 +
      delayCountScore * 0.04 +
      disputeResolutionRate * 0.04 +
      agreementFulfillmentRate * 0.04;

    const finalScore = Math.max(10, Math.min(99, Math.round(weightedSum)));

    // Determine Tier & Badge
    let tier: TrustTier = 'average';
    let tierLabel = 'متوسط / قياسي (Average)';
    let badge: TrustScoreData['badge'] = 'Standard';

    if (finalScore >= 95) {
      tier = 'elite';
      tierLabel = 'شريك نخبوي فائق الأمان (Elite Partner)';
      badge = 'Elite Partner';
    } else if (finalScore >= 88) {
      tier = 'gold';
      tierLabel = merchant.type === 'supplier' ? 'مورد ذهبي موثوق (Gold Supplier)' : 'تاجر مفضل معتمد (Preferred Trader)';
      badge = merchant.type === 'supplier' ? 'Gold Supplier' : 'Preferred Trader';
    } else if (finalScore >= 75) {
      tier = 'trusted';
      tierLabel = 'شريك تجاري موثوق (Trusted Partner)';
      badge = 'Trusted Partner';
    } else if (finalScore >= 60) {
      tier = 'average';
      tierLabel = 'متوسط / قياسي (Average)';
      badge = 'Standard';
    } else if (finalScore >= 40) {
      tier = 'risky';
      tierLabel = 'عالي المخاطر الائتمانية (Risky)';
      badge = 'Risky';
    } else {
      tier = 'blocked';
      tierLabel = 'محظور التعامل الآجل (Blocked / Critical)';
      badge = 'Blocked';
    }

    // Trend calculation
    const prevScore = currentTrust.score || finalScore;
    const diff = finalScore - prevScore;
    const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
    const trendPercentage = parseFloat(Math.abs(diff).toFixed(1));

    // Positive & Negative Drivers
    const positiveDrivers: string[] = [];
    const negativeDrivers: string[] = [];

    if (orderSuccessRate >= 98) positiveDrivers.push(`نسبة نجاح العمليات ممتازة (${orderSuccessRate}%)`);
    if (paymentTimeliness >= 90) positiveDrivers.push('التزام دوري فائق بمواعيد السداد والتسويات');
    if (totalVol >= 30000) positiveDrivers.push(`حجم تعاملات مالي كبير ومرتفع ($${totalVol.toLocaleString()})`);
    if (perf.complaintsCount === 0) positiveDrivers.push('سجل نظيف خالٍ تماماً من الشكاوى والنزاعات');

    if (isDebtExceeded) negativeDrivers.push(`تجاوز الحد الائتماني بمقدار $${(merchant.balance - merchant.creditLimit).toLocaleString()}`);
    if (perf.delayCount > 0) negativeDrivers.push(`تسجيل ${perf.delayCount} حالات تأخير في التوريد أو الاستلام`);
    if (perf.canceledOrdersCount > 2) negativeDrivers.push(`تسجيل ${perf.canceledOrdersCount} عمليات ملغاة`);
    if (perf.complaintsCount > 0) negativeDrivers.push(`تسجيل ${perf.complaintsCount} شكاوى قيد المتابعة`);

    const lastChangeReason =
      isDebtExceeded
        ? 'انخفاض بسبب تجاوز الحد الائتماني وتأخر سداد الفواتير المستحقة'
        : finalScore >= 90
        ? 'ارتفاع بسبب استقرار الأسعار والتسليم التام ومعدل العمليات الناجحة'
        : 'أداء مستقر وسداد دوري ضمن الحدود المسموح بها';

    const isAlertActive = finalScore < 60;

    return {
      score: finalScore,
      tier,
      tierLabel,
      badge,
      trend,
      trendPercentage,
      lastChangeReason,
      positiveDrivers: positiveDrivers.length > 0 ? positiveDrivers : ['أداء مستقر ضمن الحدود الطبيعية'],
      negativeDrivers,
      factors: {
        paymentTimeliness,
        deliveryTimeliness,
        priceConsistency,
        orderSuccessRate,
        cancellationsPenalty,
        disputesPenalty,
        complaintsPenalty,
        responseSpeed,
        relationshipAgeMonths,
        transactionVolumeScore,
        serviceQualityStability,
        priceStabilityScore,
        delayCountScore,
        disputeResolutionRate,
        agreementFulfillmentRate
      },
      historicalTimeline: currentTrust.historicalTimeline && currentTrust.historicalTimeline.length > 0
        ? currentTrust.historicalTimeline
        : [
            { period: 'الشهر الماضي', score: Math.max(20, finalScore - 2), tier },
            { period: 'قبل 3 أشهر', score: Math.max(20, finalScore - 5), tier },
            { period: 'قبل 6 أشهر', score: Math.max(20, finalScore - 8), tier: 'trusted' },
            { period: 'قبل سنة', score: Math.max(20, finalScore - 12), tier: 'average' }
          ],
      isAlertActive,
      lastCalculatedAt: new Date().toISOString()
    };
  }

  public archiveMerchant(id: string): void {
    const merchants = this.getItem<Merchant[]>(STORAGE_KEYS.MERCHANTS, initialMerchantsSeed);
    const index = merchants.findIndex(m => m.id === id);
    if (index >= 0) {
      merchants[index].isArchived = true;
      merchants[index].updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.MERCHANTS, merchants);
    }
  }

  public restoreMerchant(id: string): void {
    const merchants = this.getItem<Merchant[]>(STORAGE_KEYS.MERCHANTS, initialMerchantsSeed);
    const index = merchants.findIndex(m => m.id === id);
    if (index >= 0) {
      merchants[index].isArchived = false;
      merchants[index].updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.MERCHANTS, merchants);
    }
  }

  // Smart Automatic Performance Calculation Engine
  public calculateMerchantPerformance(merchant: Merchant): MerchantPerformance {
    const currentPerf = merchant.performance || {
      deliveryTimelinessScore: 90,
      executionSpeedScore: 90,
      orderSuccessRate: 98,
      canceledOrdersCount: 0,
      complaintsCount: 0,
      delayCount: 0,
      totalTransactionsVolume: merchant.totalPurchases + merchant.totalSales,
      priceStabilityScore: 90,
      repaymentSpeedScore: 90,
      agreementCommitmentScore: 90,
      historicalScores: []
    };

    // Calculate dynamic score components
    const volumeBonus = Math.min(15, ((merchant.totalPurchases + merchant.totalSales) / 10000) * 2);
    const debtPenalty = merchant.balance > merchant.creditLimit ? 20 : 0;
    const complaintsPenalty = (currentPerf.complaintsCount || 0) * 5;
    const cancellationsPenalty = (currentPerf.canceledOrdersCount || 0) * 3;

    let base = 85 + volumeBonus - debtPenalty - complaintsPenalty - cancellationsPenalty;
    base = Math.max(20, Math.min(99, Math.round(base)));

    const starRating = parseFloat(((base / 100) * 5).toFixed(1));
    const trend = base >= 90 ? 'up' : base >= 75 ? 'stable' : 'down';
    const badge = base >= 95 ? 'Excellent Trader' : base >= 85 ? 'Trusted Partner' : base >= 70 ? 'Standard' : 'Needs Attention';

    return {
      overallScore: base,
      starRating,
      deliveryTimelinessScore: currentPerf.deliveryTimelinessScore || 90,
      executionSpeedScore: currentPerf.executionSpeedScore || 90,
      orderSuccessRate: currentPerf.orderSuccessRate || 98.0,
      canceledOrdersCount: currentPerf.canceledOrdersCount || 0,
      complaintsCount: currentPerf.complaintsCount || 0,
      delayCount: currentPerf.delayCount || 0,
      totalTransactionsVolume: merchant.totalPurchases + merchant.totalSales,
      priceStabilityScore: currentPerf.priceStabilityScore || 90,
      repaymentSpeedScore: debtPenalty > 0 ? 40 : 92,
      agreementCommitmentScore: debtPenalty > 0 ? 60 : 95,
      trend,
      badge,
      bestMonth: currentPerf.bestMonth || 'تموز / يوليو 2026',
      worstMonth: currentPerf.worstMonth || 'شباط / فبراير 2026',
      primaryImpactingFactor:
        debtPenalty > 0
          ? 'تجاوز الحد الائتماني وتأخر سداد الفواتير'
          : volumeBonus > 8
          ? 'حجم تعاملات مرتفع واستقرار في الأسعار والتسليم'
          : 'أداء مستقر وسداد دوري منتظم',
      historicalScores: currentPerf.historicalScores || [
        { period: 'أيار', score: base - 4 },
        { period: 'حزيران', score: base - 2 },
        { period: 'تموز', score: base },
        { period: 'آب', score: base }
      ],
      lastCalculatedAt: new Date().toISOString()
    };
  }

  // Merchant Invoices
  public getMerchantInvoices(merchantId?: string): MerchantInvoice[] {
    const all = this.getItem<MerchantInvoice[]>(STORAGE_KEYS.MERCHANT_INVOICES, initialMerchantInvoicesSeed);
    if (merchantId) {
      return all.filter(inv => inv.merchantId === merchantId && !inv.isArchived);
    }
    return all.filter(inv => !inv.isArchived);
  }

  public saveMerchantInvoice(invoice: MerchantInvoice, performedBy: string): MerchantInvoice {
    const all = this.getItem<MerchantInvoice[]>(STORAGE_KEYS.MERCHANT_INVOICES, initialMerchantInvoicesSeed);
    const index = all.findIndex(inv => inv.id === invoice.id);
    const isNew = index < 0;

    const qrData = `NZM_JKR_INV_${invoice.invoiceNumber}|${invoice.merchantId}|${invoice.totalAmount}|${invoice.status}`;
    const invoiceToSave = { ...invoice, qrCodeData: qrData, updatedAt: new Date().toISOString() };

    if (isNew) {
      all.unshift({ ...invoiceToSave, createdAt: new Date().toISOString() });
    } else {
      all[index] = invoiceToSave;
    }
    this.setItem(STORAGE_KEYS.MERCHANT_INVOICES, all);

    // Update merchant financial totals, vault cash, and ledger ONLY for new invoices (Idempotent Save)
    if (isNew) {
      const merchant = this.getMerchantById(invoice.merchantId);
      if (merchant) {
        if (invoice.type === 'purchase') {
          merchant.totalPurchases += invoice.totalAmount;
          if (invoice.remainingAmount && invoice.remainingAmount > 0) {
            merchant.balance = Math.round(((merchant.balance || 0) - invoice.remainingAmount) * 100) / 100; // Increase payable
          }
        } else if (invoice.type === 'sale') {
          merchant.totalSales += invoice.totalAmount;
          merchant.totalProfits += invoice.totalAmount * 0.15; // 15% estimated margin
          if (invoice.remainingAmount && invoice.remainingAmount > 0) {
            merchant.balance = Math.round(((merchant.balance || 0) + invoice.remainingAmount) * 100) / 100; // Increase receivable
          }
        }
        merchant.totalInvoicesCount = (merchant.totalInvoicesCount || 0) + 1;
        this.saveMerchant(merchant);
      }

      // Direct posting to Finance Safe if cash involved
      if (invoice.paidAmount > 0 && invoice.paymentMethod === 'vault_cash') {
        if (invoice.type === 'purchase') {
          this.addSafeTransaction(
            'cash_out',
            invoice.paidAmount,
            'merchant_settlement',
            `سداد فاتورة شراء ${invoice.invoiceNumber} للتاجر ${invoice.merchantName}`,
            performedBy,
            invoice.id
          );
        } else if (invoice.type === 'sale') {
          this.addSafeTransaction(
            'cash_in',
            invoice.paidAmount,
            'merchant_settlement',
            `تحصيل فاتورة بيع ${invoice.invoiceNumber} من التاجر ${invoice.merchantName}`,
            performedBy,
            invoice.id
          );
        }
      }

      // Record Statement Transaction
      this.addMerchantTransaction({
        merchantId: invoice.merchantId,
        type: invoice.type === 'purchase' ? 'purchase' : 'sale',
        amount: invoice.totalAmount,
        balanceBefore: merchant ? merchant.balance - (invoice.type === 'sale' ? invoice.totalAmount : -invoice.totalAmount) : 0,
        balanceAfter: merchant ? merchant.balance : 0,
        direction: invoice.type === 'purchase' ? 'out' : 'in',
        description: `فاتورة ${invoice.type === 'purchase' ? 'شراء' : 'بيع'} رقم ${invoice.invoiceNumber}`,
        referenceInvoiceId: invoice.id,
        paymentMethod: invoice.paymentMethod,
        performedBy,
        createdAt: new Date().toISOString()
      });
    }

    return invoiceToSave;
  }

  public archiveMerchantInvoice(id: string): void {
    const all = this.getItem<MerchantInvoice[]>(STORAGE_KEYS.MERCHANT_INVOICES, initialMerchantInvoicesSeed);
    const item = all.find(i => i.id === id);
    if (item) {
      item.isArchived = true;
      item.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.MERCHANT_INVOICES, all);
    }
  }

  // Merchant Reminders
  public getMerchantReminders(merchantId?: string): MerchantReminder[] {
    const all = this.getItem<MerchantReminder[]>(STORAGE_KEYS.MERCHANT_REMINDERS, initialMerchantRemindersSeed);
    const todayStr = new Date().toISOString().slice(0, 10);

    // Auto update status based on date
    const updated = all.map(r => {
      if (r.status !== 'completed' && r.status !== 'canceled') {
        if (r.dueDate < todayStr) return { ...r, status: 'overdue' as const };
        if (r.dueDate === todayStr) return { ...r, status: 'today' as const };
        return { ...r, status: 'upcoming' as const };
      }
      return r;
    });

    if (merchantId) {
      return updated.filter(r => r.merchantId === merchantId);
    }
    return updated;
  }

  public saveMerchantReminder(reminder: MerchantReminder): MerchantReminder {
    const all = this.getItem<MerchantReminder[]>(STORAGE_KEYS.MERCHANT_REMINDERS, initialMerchantRemindersSeed);
    const index = all.findIndex(r => r.id === reminder.id);
    if (index >= 0) {
      all[index] = reminder;
    } else {
      all.unshift({ ...reminder, createdAt: new Date().toISOString() });
    }
    this.setItem(STORAGE_KEYS.MERCHANT_REMINDERS, all);
    return reminder;
  }

  public completeMerchantReminder(id: string): void {
    const all = this.getItem<MerchantReminder[]>(STORAGE_KEYS.MERCHANT_REMINDERS, initialMerchantRemindersSeed);
    const item = all.find(r => r.id === id);
    if (item) {
      item.status = 'completed';
      item.completedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.MERCHANT_REMINDERS, all);
    }
  }

  public deleteMerchantReminder(id: string): void {
    const all = this.getItem<MerchantReminder[]>(STORAGE_KEYS.MERCHANT_REMINDERS, initialMerchantRemindersSeed);
    const filtered = all.filter(r => r.id !== id);
    this.setItem(STORAGE_KEYS.MERCHANT_REMINDERS, filtered);
  }

  // Merchant Transactions / Statements
  public getMerchantTransactions(merchantId?: string): MerchantTransaction[] {
    const all = this.getItem<MerchantTransaction[]>(STORAGE_KEYS.MERCHANT_TRANSACTIONS, initialMerchantTransactionsSeed);
    if (merchantId) {
      return all.filter(t => t.merchantId === merchantId);
    }
    return all;
  }

  public addMerchantTransaction(tx: Omit<MerchantTransaction, 'id'>): MerchantTransaction {
    const all = this.getItem<MerchantTransaction[]>(STORAGE_KEYS.MERCHANT_TRANSACTIONS, initialMerchantTransactionsSeed);
    const newTx: MerchantTransaction = {
      ...tx,
      id: 'tx_m_' + Date.now()
    };
    all.unshift(newTx);
    this.setItem(STORAGE_KEYS.MERCHANT_TRANSACTIONS, all);
    return newTx;
  }

  // Merchant Product Rules
  public getMerchantProductRules(merchantId: string): MerchantProductRule[] {
    const all = this.getItem<MerchantProductRule[]>(STORAGE_KEYS.MERCHANT_PRODUCT_RULES, initialMerchantProductRulesSeed);
    return all.filter(r => r.merchantId === merchantId);
  }

  public saveMerchantProductRule(rule: MerchantProductRule): void {
    const all = this.getItem<MerchantProductRule[]>(STORAGE_KEYS.MERCHANT_PRODUCT_RULES, initialMerchantProductRulesSeed);
    const index = all.findIndex(r => r.id === rule.id);
    if (index >= 0) {
      all[index] = rule;
    } else {
      all.unshift(rule);
    }
    this.setItem(STORAGE_KEYS.MERCHANT_PRODUCT_RULES, all);
  }

  public deleteMerchantProductRule(id: string): void {
    const all = this.getItem<MerchantProductRule[]>(STORAGE_KEYS.MERCHANT_PRODUCT_RULES, initialMerchantProductRulesSeed);
    const filtered = all.filter(r => r.id !== id);
    this.setItem(STORAGE_KEYS.MERCHANT_PRODUCT_RULES, filtered);
  }

  // Merchant Notes
  public getMerchantNotes(merchantId: string): MerchantNote[] {
    const all = this.getItem<MerchantNote[]>(STORAGE_KEYS.MERCHANT_NOTES, initialMerchantNotesSeed);
    return all.filter(n => n.merchantId === merchantId);
  }

  public addMerchantNote(note: Omit<MerchantNote, 'id' | 'createdAt'>): MerchantNote {
    const all = this.getItem<MerchantNote[]>(STORAGE_KEYS.MERCHANT_NOTES, initialMerchantNotesSeed);
    const newNote: MerchantNote = {
      ...note,
      id: 'note_m_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    all.unshift(newNote);
    this.setItem(STORAGE_KEYS.MERCHANT_NOTES, all);

    const merchant = this.getMerchantById(note.merchantId);
    if (merchant) {
      merchant.notesCount = (merchant.notesCount || 0) + 1;
      this.saveMerchant(merchant);
    }
    return newNote;
  }

  public deleteMerchantNote(id: string): void {
    const all = this.getItem<MerchantNote[]>(STORAGE_KEYS.MERCHANT_NOTES, initialMerchantNotesSeed);
    const filtered = all.filter(n => n.id !== id);
    this.setItem(STORAGE_KEYS.MERCHANT_NOTES, filtered);
  }

  // Merchant Files
  public getMerchantFiles(merchantId: string): MerchantFile[] {
    const all = this.getItem<MerchantFile[]>(STORAGE_KEYS.MERCHANT_FILES, initialMerchantFilesSeed);
    return all.filter(f => f.merchantId === merchantId);
  }

  public addMerchantFile(file: Omit<MerchantFile, 'id' | 'uploadedAt'>): MerchantFile {
    const all = this.getItem<MerchantFile[]>(STORAGE_KEYS.MERCHANT_FILES, initialMerchantFilesSeed);
    const newFile: MerchantFile = {
      ...file,
      id: 'file_m_' + Date.now(),
      uploadedAt: new Date().toISOString()
    };
    all.unshift(newFile);
    this.setItem(STORAGE_KEYS.MERCHANT_FILES, all);

    const merchant = this.getMerchantById(file.merchantId);
    if (merchant) {
      merchant.filesCount = (merchant.filesCount || 0) + 1;
      this.saveMerchant(merchant);
    }
    return newFile;
  }

  public deleteMerchantFile(id: string): void {
    const all = this.getItem<MerchantFile[]>(STORAGE_KEYS.MERCHANT_FILES, initialMerchantFilesSeed);
    const filtered = all.filter(f => f.id !== id);
    this.setItem(STORAGE_KEYS.MERCHANT_FILES, filtered);
  }

  // Universal Date Filter Matcher
  public isDateMatchingFilter(
    dateStr?: string,
    preset: UnifiedFinanceDatePreset = 'all',
    customStart?: string,
    customEnd?: string
  ): boolean {
    if (!dateStr || preset === 'all') return true;
    const itemTime = new Date(dateStr).getTime();
    if (isNaN(itemTime)) return true;

    const now = new Date();
    if (preset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return itemTime >= start && itemTime <= end;
    }
    if (preset === 'yesterday') {
      const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate()).getTime();
      const end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999).getTime();
      return itemTime >= start && itemTime <= end;
    }
    if (preset === 'this_week') {
      const day = now.getDay();
      const dayDiff = (day + 1) % 7; // Starts on Saturday
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayDiff);
      const start = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate()).getTime();
      return itemTime >= start;
    }
    if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return itemTime >= start;
    }
    if (preset === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1).getTime();
      return itemTime >= start;
    }
    if (preset === 'custom') {
      if (customStart && customEnd) {
        const start = new Date(customStart).setHours(0, 0, 0, 0);
        const end = new Date(customEnd).setHours(23, 59, 59, 999);
        return itemTime >= start && itemTime <= end;
      } else if (customStart) {
        const start = new Date(customStart).setHours(0, 0, 0, 0);
        return itemTime >= start;
      } else if (customEnd) {
        const end = new Date(customEnd).setHours(23, 59, 59, 999);
        return itemTime <= end;
      }
    }
    return true;
  }

  // =============================================================
  // SINGLE SOURCE OF TRUTH: Central Financial Metrics Engine
  // =============================================================
  public getFinanceMetrics(filter?: Partial<UnifiedFinanceFilter>): FinanceMetrics {
    const preset = filter?.datePreset || 'all';
    const customStart = filter?.customStartDate;
    const customEnd = filter?.customEndDate;
    const dept = filter?.department || 'all';
    const game = filter?.gameName && filter.gameName !== 'all' ? filter.gameName : undefined;
    const plan = filter?.planId && filter.planId !== 'all' ? filter.planId : undefined;
    const person = (filter?.personQuery || '').trim().toLowerCase();
    const employee = filter?.employeeId && filter.employeeId !== 'all' ? filter.employeeId : undefined;
    const txType = filter?.transactionType || 'all';

    const customers = this.getCustomers(true);
    const merchants = this.getMerchants(true);
    const tickets = this.getTickets();
    const expenses = this.getExpenses(false);
    const debts = this.getDebts(false);
    const deals = this.getMiddlemanDeals(true);
    const accounts = this.getMiddlemanAccounts();
    const subscriptions = this.getSubscriptions();
    const subPayments = this.getSubscriptionPayments();
    const safeTxs = this.getSafeTransactions();
    const storeWallets = this.getStoreWallets();
    const storeWalletTxs = this.getStoreWalletTransactions();

    const matchesPerson = (name?: string, phone?: string, id?: string, code?: string) => {
      if (!person) return true;
      return (
        (name && name.toLowerCase().includes(person)) ||
        (phone && phone.includes(person)) ||
        (id && id.toLowerCase().includes(person)) ||
        (code && code.toLowerCase().includes(person))
      );
    };

    const matchesEmployee = (empId?: string, empName?: string) => {
      if (!employee) return true;
      return empId === employee || (empName && empName.toLowerCase().includes(employee.toLowerCase()));
    };

    // 1. CUSTOMERS & DIRECT TOP-UP TICKETS
    const filteredTickets = tickets.filter(t => {
      if (!this.isDateMatchingFilter(t.createdAt, preset, customStart, customEnd)) return false;
      if (game && t.gameName !== game) return false;
      if (!matchesPerson(t.customerName, t.customerPhone, t.customerId)) return false;
      if (!matchesEmployee(t.assignedTo, t.assignedTo)) return false;
      if (txType === 'refund' && t.status !== 'refunded') return false;
      if (txType === 'sale' && t.status !== 'completed') return false;
      return true;
    });

    const completedTickets = filteredTickets.filter(t => t.status === 'completed');
    const refundedTickets = filteredTickets.filter(t => t.status === 'refunded');

    let customerRevenue = 0;
    let customerProfit = 0;
    let customerCost = 0;
    let customerTxCount = 0;

    if (dept === 'all' || dept === 'customers') {
      completedTickets.forEach(t => {
        const amt = t.receivedAmount || t.requiredAmount || t.totalProductsAmount || 0;
        customerRevenue += amt;
        const p = t.netProfit !== undefined ? t.netProfit : Math.round(amt * 0.18);
        const c = t.costPrice !== undefined ? t.costPrice : Math.max(0, amt - p);
        customerProfit += p;
        customerCost += c;
      });
      customerTxCount = completedTickets.length;
    }

    const customerRefunds = (dept === 'all' || dept === 'customers')
      ? refundedTickets.reduce((acc, t) => acc + (t.refundDetails?.amount || t.receivedAmount || t.requiredAmount || 0), 0)
      : 0;
    const customerDiscounts = (dept === 'all' || dept === 'customers')
      ? completedTickets.reduce((acc, t) => acc + (t.couponDiscountAmount || 0) + (t.cashbackUsed || 0) + (t.referralBalanceUsed || 0) + (t.accountBalanceUsed || 0), 0)
      : 0;
    const customerCashback = (dept === 'all' || dept === 'customers')
      ? completedTickets.reduce((acc, t) => acc + (t.cashbackEarned || 0), 0)
      : 0;

    // 2. DEALERS & WHOLESALE MERCHANTS (Dealer Tickets & Invoices)
    const dealerTickets = this.getDealerTickets();
    const filteredDealerTickets = dealerTickets.filter(t => {
      if (!this.isDateMatchingFilter(t.createdAt, preset, customStart, customEnd)) return false;
      if (game && t.gameName !== game) return false;
      if (!matchesPerson(t.customerName, t.customerPhone, t.customerId, t.ticketNumber)) return false;
      if (!matchesEmployee(t.assignedTo, t.assignedTo)) return false;
      if (txType === 'refund' && t.status !== 'refunded') return false;
      if (txType === 'sale' && t.status !== 'completed') return false;
      return true;
    });

    const completedDealerTickets = filteredDealerTickets.filter(t => t.status === 'completed');
    const refundedDealerTickets = filteredDealerTickets.filter(t => t.status === 'refunded');

    const merchantInvoices = this.getItem<MerchantInvoice[]>(STORAGE_KEYS.MERCHANT_INVOICES, initialMerchantInvoicesSeed).filter(inv => {
      if (inv.isArchived) return false;
      if (!this.isDateMatchingFilter(inv.createdAt || inv.issueDate, preset, customStart, customEnd)) return false;
      if (!matchesPerson(inv.merchantName, undefined, inv.merchantId, inv.invoiceNumber)) return false;
      if (!matchesEmployee(undefined, inv.createdBy)) return false;
      if (txType === 'sale' && inv.type !== 'sale') return false;
      if (txType === 'purchase' && inv.type !== 'purchase') return false;
      return true;
    });

    const dealerSaleInvoices = merchantInvoices.filter(i => i.type === 'sale');
    const dealerPurchaseInvoices = merchantInvoices.filter(i => i.type === 'purchase');

    let dealerRevenue = 0;
    let dealerCost = 0;
    let dealerProfit = 0;
    let dealerTxCount = 0;

    if (dept === 'all' || dept === 'dealers') {
      completedDealerTickets.forEach(t => {
        const amt = t.receivedAmount || t.requiredAmount || t.totalProductsAmount || 0;
        dealerRevenue += amt;
        const p = t.netProfit !== undefined ? t.netProfit : Math.round(amt * 0.15);
        const c = t.costPrice !== undefined ? t.costPrice : Math.max(0, amt - p);
        dealerProfit += p;
        dealerCost += c;
      });
      dealerTxCount += completedDealerTickets.length;

      if (dealerSaleInvoices.length > 0 || dealerPurchaseInvoices.length > 0) {
        const invRev = dealerSaleInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
        const explicitPurchases = dealerPurchaseInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
        const invProfit = Math.round(invRev * 0.15);
        const invCost = explicitPurchases > 0 ? explicitPurchases : Math.max(0, invRev - invProfit);
        dealerRevenue += invRev;
        dealerProfit += invProfit;
        dealerCost += invCost;
        dealerTxCount += dealerSaleInvoices.length;
      } else if (completedDealerTickets.length === 0 && preset === 'all' && !game && !person && !employee) {
        const merchRev = merchants.reduce((acc, m) => acc + (m.totalSales || 0), 0);
        const merchProfit = Math.round(merchRev * 0.15);
        dealerRevenue += merchRev;
        dealerProfit += merchProfit;
        dealerCost += Math.max(0, merchRev - merchProfit);
        dealerTxCount += merchants.length;
      }
    }

    const dealerRefunds = (dept === 'all' || dept === 'dealers')
      ? refundedDealerTickets.reduce((acc, t) => acc + (t.refundDetails?.amount || t.receivedAmount || t.requiredAmount || 0), 0)
      : 0;
    const dealerDiscounts = (dept === 'all' || dept === 'dealers')
      ? completedDealerTickets.reduce((acc, t) => acc + (t.couponDiscountAmount || 0) + (t.cashbackUsed || 0) + (t.referralBalanceUsed || 0) + (t.accountBalanceUsed || 0), 0)
      : 0;
    const dealerCashback = (dept === 'all' || dept === 'dealers')
      ? completedDealerTickets.reduce((acc, t) => acc + (t.cashbackEarned || 0), 0)
      : 0;

    // 3. MIDDLEMAN & ESCROW DEALS + ACCOUNTS STORE
    const filteredDeals = deals.filter(d => {
      if (!this.isDateMatchingFilter(d.createdAt, preset, customStart, customEnd)) return false;
      if (game && d.gameName !== game) return false;
      if (!matchesPerson(`${d.sellerName} ${d.buyerName} ${d.title}`, `${d.sellerPhone} ${d.buyerPhone}`, d.id, d.dealNumber)) return false;
      if (txType === 'sale' && d.status !== 'completed') return false;
      return true;
    });

    const completedDeals = filteredDeals.filter(d => d.status === 'completed');
    const dealsVolume = completedDeals.reduce((acc, d) => acc + (d.dealAmountEGP || d.dealAmount || 0), 0);
    const dealsCommission = completedDeals.reduce((acc, d) => acc + (d.netCompanyProfitEGP || d.companyCommissionAmountEGP || 0), 0);
    const dealsExternalCommission = completedDeals.reduce(
      (acc, d) => acc + (d.hasExternalMiddleman && d.externalMiddlemanCommissionAmountEGP ? d.externalMiddlemanCommissionAmountEGP : 0),
      0
    );

    const filteredAccounts = accounts.filter(a => {
      const soldDate = a.saleRecord?.soldAt || a.lastSoldAt || a.updatedAt || a.createdAt;
      if (!this.isDateMatchingFilter(soldDate, preset, customStart, customEnd)) return false;
      if (game && a.gameName !== game) return false;
      if (!matchesPerson(`${a.title} ${a.sellerName} ${a.lastBuyerName || ''}`, `${a.sellerPhone} ${a.lastBuyerPhone || ''}`, a.id, a.accountCode)) return false;
      if (txType === 'sale' && a.status !== 'sold' && (a.soldQuantity || 0) <= 0) return false;
      return true;
    });

    const soldAccounts = filteredAccounts.filter(a => a.status === 'sold' || (a.soldQuantity && a.soldQuantity > 0));
    const accountsSalesRevenue = soldAccounts.reduce(
      (acc, a) => acc + (a.saleRecord?.salePriceEGP || a.actualSalePriceEGP || a.expectedSellingPriceEGP || 0) * (a.soldQuantity || 1),
      0
    );
    const accountsCost = soldAccounts.reduce(
      (acc, a) => acc + (a.saleRecord?.purchaseCostEGP || a.purchaseCostEGP || 0) * (a.soldQuantity || 1),
      0
    );
    const accountsProfit = Math.max(0, accountsSalesRevenue - accountsCost);

    let middlemanRevenue = 0;
    let middlemanProfit = 0;
    let middlemanCost = 0;
    let middlemanTxCount = 0;

    if (dept === 'all' || dept === 'middleman') {
      middlemanRevenue = dealsCommission + accountsSalesRevenue;
      middlemanProfit = dealsCommission + accountsProfit;
      middlemanCost = accountsCost;
      middlemanTxCount = completedDeals.length + soldAccounts.length;
    }

    // 4. SUBSCRIPTIONS MODULE
    const filteredSubs = subscriptions.filter(s => {
      if (!this.isDateMatchingFilter(s.createdAt, preset, customStart, customEnd)) return false;
      if (plan && s.planId !== plan && s.planName !== plan) return false;
      if (!matchesPerson(s.customerName, s.customerPhone, s.customerId, s.subscriptionNumber)) return false;
      if (txType === 'refund' && s.paymentStatus !== 'refunded' && s.status !== 'cancelled') return false;
      return true;
    });

    const activeOrPaidSubs = filteredSubs.filter(s => s.paymentStatus === 'paid' || s.status === 'active' || s.status === 'renewed');
    const refundedSubs = filteredSubs.filter(s => s.paymentStatus === 'refunded' || s.status === 'cancelled');

    let subsRevenue = 0;
    let subsCost = 0;
    let subsProfit = 0;
    let subsTxCount = 0;
    let subsRefunds = 0;

    if (dept === 'all' || dept === 'subscriptions') {
      activeOrPaidSubs.forEach(s => {
        const rev = s.finalPrice || 0;
        const p = s.netProfit !== undefined ? s.netProfit : (s.costPrice !== undefined ? Math.max(0, rev - s.costPrice) : Math.round(rev * 0.25));
        const c = s.costPrice !== undefined ? s.costPrice : Math.max(0, rev - p);
        subsRevenue += rev;
        subsProfit += p;
        subsCost += c;
      });
      subsTxCount = activeOrPaidSubs.length;
      subsRefunds = refundedSubs.reduce((acc, s) => acc + (s.finalPrice || 0), 0);
    }

    // 5. EXPENSES & DEBTS (TREASURY)
    const filteredExpenses = expenses.filter(e => {
      if (e.isArchived) return false;
      if (!this.isDateMatchingFilter(e.date || e.createdAt, preset, customStart, customEnd)) return false;
      if (!matchesEmployee(undefined, e.approvedBy)) return false;
      if (person && !e.title.toLowerCase().includes(person)) return false;
      return true;
    });
    const monthlyExpenses = (dept === 'all' || dept === 'treasury') ? filteredExpenses.reduce((acc, e) => acc + e.amount, 0) : 0;

    const totalCashbackPaid = (dept === 'all' || dept === 'customers' || dept === 'dealers') ? (customerCashback + dealerCashback) : 0;
    const totalReferralCommissionPaid = (dept === 'all' || dept === 'customers' || dept === 'dealers')
      ? this.getReferrals().reduce((acc, r) => acc + (r.totalCommissionFromReferral || 0), 0)
      : 0;
    const totalExternalCommissionPaid = (dept === 'all' || dept === 'middleman') ? dealsExternalCommission : 0;
    const totalRefunds = customerRefunds + dealerRefunds + subsRefunds;
    const totalDiscounts = customerDiscounts + dealerDiscounts;

    // Vault & Total Debts
    const vaultBalance = this.getVaultBalance();
    const totalWalletsBalance = storeWallets.filter(w => !w.isSystemWallet).reduce((acc, w) => acc + (w.balance || 0), 0);
    const totalDebtsReceivable =
      debts.filter(d => d.debtType === 'receivable' && !d.isArchived).reduce((acc, d) => acc + d.remainingAmount, 0) +
      merchants.filter(m => m.balance > 0).reduce((acc, m) => acc + m.balance, 0);
    const totalDebtsPayable =
      debts.filter(d => d.debtType === 'payable' && !d.isArchived).reduce((acc, d) => acc + d.remainingAmount, 0) +
      merchants.filter(m => m.balance < 0).reduce((acc, m) => acc + Math.abs(m.balance), 0);

    // Wallets & Bonds Liquidity
    const filteredWalletTxs = storeWalletTxs.filter(tx => {
      if (!this.isDateMatchingFilter(tx.createdAt, preset, customStart, customEnd)) return false;
      if (person && !matchesPerson(tx.walletName, tx.senderPhoneNumber || tx.receivingPhoneNumber, tx.id, tx.referenceNumber)) return false;
      if (!matchesEmployee(tx.performedBy?.id, tx.performedBy?.name)) return false;
      return true;
    });
    const depositBonds = this.getDepositBondsFIFO().filter(b => {
      const bDate = b.date || b.createdAt;
      if (!this.isDateMatchingFilter(bDate, preset, customStart, customEnd)) return false;
      if (person && !matchesPerson(b.walletName, undefined, b.id, b.bondNumber)) return false;
      return true;
    });

    const walletsDepositsVolume = filteredWalletTxs
      .filter(tx => tx.type === 'deposit' || tx.type === 'transfer_in')
      .reduce((acc, tx) => acc + (tx.amount || 0), 0) +
      depositBonds.reduce((acc, b) => acc + (b.totalCostEGP || 0), 0);

    const walletsWithdrawalsVolume = filteredWalletTxs
      .filter(tx => tx.type === 'withdrawal' || tx.type === 'transfer_out')
      .reduce((acc, tx) => acc + (tx.amount || 0), 0);

    const bondBondNumbers = new Set(depositBonds.map(b => b.bondNumber).filter(Boolean));
    const uniqueWalletTxs = filteredWalletTxs.filter(tx => !(tx.type === 'bond_deposit' && tx.referenceNumber && bondBondNumbers.has(tx.referenceNumber)));
    const walletsTxCount = uniqueWalletTxs.length + depositBonds.length;

    // Safe Vault Movements
    const vaultCashIn = safeTxs
      .filter(t => (t.type === 'cash_in' || (t.type === 'settlement' && t.amount >= 0)) && this.isDateMatchingFilter(t.createdAt, preset, customStart, customEnd))
      .reduce((acc, t) => acc + t.amount, 0);
    const vaultCashOut = safeTxs
      .filter(t => (t.type === 'cash_out' || (t.type === 'settlement' && t.amount < 0)) && this.isDateMatchingFilter(t.createdAt, preset, customStart, customEnd))
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    // Wallet Transfers Volume (Count transfer_out only to avoid 2x doubling of internal transfers)
    const totalTransfersVolume = storeWalletTxs
      .filter(tx => tx.type === 'transfer_out' && this.isDateMatchingFilter(tx.createdAt, preset, customStart, customEnd))
      .reduce((acc, tx) => acc + (tx.amount || 0), 0);

    // Unified Totals (Single Source of Truth - grossProfit already accounts only for completed sales net of refunds)
    let totalRevenue = customerRevenue + dealerRevenue + middlemanRevenue + subsRevenue;
    let grossProfit = customerProfit + dealerProfit + middlemanProfit + subsProfit;
    let totalCosts = (customerCost + dealerCost + middlemanCost + subsCost) + monthlyExpenses + totalCashbackPaid + totalReferralCommissionPaid + totalExternalCommissionPaid;
    let netProfit = Math.max(0, grossProfit - monthlyExpenses - totalCashbackPaid - totalReferralCommissionPaid - totalExternalCommissionPaid);
    let totalOperationsCount = customerTxCount + dealerTxCount + middlemanTxCount + subsTxCount;

    // Handle department specific filter overrides
    if (dept === 'wallets') {
      totalRevenue = walletsDepositsVolume;
      totalCosts = walletsWithdrawalsVolume;
      grossProfit = Math.max(0, walletsDepositsVolume - walletsWithdrawalsVolume);
      netProfit = grossProfit;
      totalOperationsCount = walletsTxCount;
    } else if (dept === 'treasury') {
      totalRevenue = vaultCashIn;
      totalCosts = vaultCashOut + monthlyExpenses;
      grossProfit = Math.max(0, vaultCashIn - vaultCashOut);
      netProfit = Math.max(0, grossProfit - monthlyExpenses);
      totalOperationsCount = safeTxs.length;
    }

    // Departmental Financial Breakdown
    const departmentBreakdowns: DepartmentFinancialBreakdown[] = [
      {
        departmentId: 'customers',
        departmentName: 'قسم الزبائن والشحن',
        revenue: customerRevenue,
        cost: customerCost,
        netProfit: customerProfit,
        transactionsCount: customerTxCount,
        percentageOfTotalRevenue: totalRevenue > 0 ? Math.round((customerRevenue / totalRevenue) * 100) : 0,
        percentageOfTotalProfit: grossProfit > 0 ? Math.round((customerProfit / grossProfit) * 100) : 0,
        color: 'from-orange-500 to-amber-600',
        badge: 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
      },
      {
        departmentId: 'dealers',
        departmentName: 'قسم التجار والموزعين',
        revenue: dealerRevenue,
        cost: dealerCost,
        netProfit: dealerProfit,
        transactionsCount: dealerTxCount,
        percentageOfTotalRevenue: totalRevenue > 0 ? Math.round((dealerRevenue / totalRevenue) * 100) : 0,
        percentageOfTotalProfit: grossProfit > 0 ? Math.round((dealerProfit / grossProfit) * 100) : 0,
        color: 'from-amber-500 to-yellow-600',
        badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
      },
      {
        departmentId: 'middleman',
        departmentName: 'قسم الوساطة والضمان',
        revenue: middlemanRevenue,
        cost: middlemanCost,
        netProfit: middlemanProfit,
        transactionsCount: middlemanTxCount,
        percentageOfTotalRevenue: totalRevenue > 0 ? Math.round((middlemanRevenue / totalRevenue) * 100) : 0,
        percentageOfTotalProfit: grossProfit > 0 ? Math.round((middlemanProfit / grossProfit) * 100) : 0,
        color: 'from-purple-600 to-indigo-600',
        badge: 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
      },
      {
        departmentId: 'subscriptions',
        departmentName: 'قسم الاشتراكات الرقمية',
        revenue: subsRevenue,
        cost: subsCost,
        netProfit: subsProfit,
        transactionsCount: subsTxCount,
        percentageOfTotalRevenue: totalRevenue > 0 ? Math.round((subsRevenue / totalRevenue) * 100) : 0,
        percentageOfTotalProfit: grossProfit > 0 ? Math.round((subsProfit / grossProfit) * 100) : 0,
        color: 'from-pink-500 to-rose-600',
        badge: 'bg-pink-500/15 text-pink-400 border border-pink-500/30'
      },
      {
        departmentId: 'wallets',
        departmentName: 'المحافظ وحسابات البنوك',
        revenue: walletsDepositsVolume,
        cost: walletsWithdrawalsVolume,
        netProfit: Math.max(0, walletsDepositsVolume - walletsWithdrawalsVolume),
        transactionsCount: walletsTxCount,
        percentageOfTotalRevenue: totalRevenue > 0 ? Math.round((walletsDepositsVolume / totalRevenue) * 100) : 0,
        percentageOfTotalProfit: grossProfit > 0 ? Math.round((Math.max(0, walletsDepositsVolume - walletsWithdrawalsVolume) / grossProfit) * 100) : 0,
        color: 'from-cyan-500 to-blue-600',
        badge: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
      },
      {
        departmentId: 'treasury',
        departmentName: 'الخزينة النقدية والسيولة',
        revenue: vaultCashIn,
        cost: vaultCashOut + monthlyExpenses,
        netProfit: Math.max(0, vaultCashIn - vaultCashOut),
        transactionsCount: safeTxs.length,
        percentageOfTotalRevenue: totalRevenue > 0 ? Math.round((vaultCashIn / totalRevenue) * 100) : 0,
        percentageOfTotalProfit: grossProfit > 0 ? Math.round((Math.max(0, vaultCashIn - vaultCashOut) / grossProfit) * 100) : 0,
        color: 'from-emerald-600 to-teal-700',
        badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
      }
    ];

    return {
      totalRevenue,
      totalCosts,
      grossProfit,
      netProfit,
      vaultBalance,
      totalWalletsBalance,
      totalDebtsReceivable,
      totalDebtsPayable,
      totalCashbackPaid,
      totalReferralCommissionPaid,
      totalExternalCommissionPaid,
      totalDiscounts,
      totalRefunds,
      totalTransfersVolume,
      monthlyExpenses,

      totalOperationsCount,
      completedOrdersCount: totalOperationsCount,
      pendingOperationsCount: filteredTickets.filter(t => t.status === 'new' || t.status === 'in_progress').length
        + filteredDeals.filter(d => d.status === 'in_progress' || d.status === 'awaiting_transfer' || d.status === 'awaiting_seller' || d.status === 'awaiting_buyer').length
        + filteredSubs.filter(s => s.paymentStatus === 'pending').length,
      problemOperationsCount: filteredTickets.filter(t => t.status === 'problem').length
        + filteredDeals.filter(d => d.status === 'dispute' || d.status === 'canceled').length,
      refundedOperationsCount: refundedTickets.length + refundedSubs.length,
      customersCount: customers.length,
      dealersCount: merchants.length,
      subscriptionsCount: subscriptions.length,
      dealsCount: deals.length,
      soldAccountsCount: accounts.filter(a => a.status === 'sold' || (a.soldQuantity && a.soldQuantity > 0)).length,
      newCustomersCount: customers.filter(c => {
        if (!c.createdAt) return false;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return new Date(c.createdAt) >= thirtyDaysAgo;
      }).length,

      // Subscription lifecycle
      activeSubscriptionsCount: subscriptions.filter(s => s.status === 'active').length,
      expiredSubscriptionsCount: subscriptions.filter(s => s.status === 'expired').length,
      expiringSubscriptionsCount: subscriptions.filter(s => {
        if (s.status !== 'active' || !s.endDate) return false;
        const daysLeft = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / (1000 * 3600 * 24));
        return daysLeft >= 0 && daysLeft <= 7;
      }).length,
      renewedSubscriptionsCount: subscriptions.filter(s => s.status === 'renewed' || (s.renewalCount && s.renewalCount > 0)).length,
      cancelledSubscriptionsCount: subscriptions.filter(s => s.status === 'cancelled').length,

      // Middleman specifics
      completedDealsCount: completedDeals.length,
      pendingDealsCount: filteredDeals.filter(d => d.status === 'in_progress' || d.status === 'awaiting_transfer' || d.status === 'awaiting_seller' || d.status === 'awaiting_buyer').length,
      cancelledDealsCount: filteredDeals.filter(d => d.status === 'canceled').length,
      availableAccountsCount: accounts.filter(a => (a.availableQuantity === undefined || a.availableQuantity > 0) && a.status !== 'sold').length,
      totalAccountsPurchaseCost: accountsCost,
      totalAccountsSalesRevenue: accountsSalesRevenue,
      totalAccountsProfit: accountsProfit,

      customerRevenue,
      customerCost,
      customerProfit,
      customerTxCount,
      customerCashback,
      customerReferrals: totalReferralCommissionPaid,
      customerRefunds,
      customerDiscounts,

      dealerRevenue,
      dealerCost,
      dealerProfit,
      dealerTxCount,

      middlemanRevenue,
      middlemanCost,
      middlemanProfit,
      middlemanTxCount,
      middlemanCompanyCommission: dealsCommission,
      middlemanExternalCommission: dealsExternalCommission,

      subscriptionsRevenue: subsRevenue,
      subscriptionsCost: subsCost,
      subscriptionsProfit: subsProfit,
      subscriptionsTxCount: subsTxCount,
      subscriptionsRefunds: subsRefunds,
      subscriptionsDiscounts: activeOrPaidSubs.reduce((acc, s) => acc + (s.discountAmount || 0), 0),

      departmentBreakdowns
    };
  }

  // =============================================================
  // UNIFIED FINANCIAL TRANSACTIONS LEDGER (Single Source of Truth)
  // =============================================================
  public getUnifiedTransactions(filter?: Partial<UnifiedFinanceFilter>): UnifiedFinancialTransaction[] {
    const preset = filter?.datePreset || 'all';
    const customStart = filter?.customStartDate;
    const customEnd = filter?.customEndDate;
    const dept = filter?.department || 'all';
    const game = filter?.gameName && filter.gameName !== 'all' ? filter.gameName : undefined;
    const plan = filter?.planId && filter.planId !== 'all' ? filter.planId : undefined;
    const search = (filter?.searchQuery || filter?.personQuery || '').trim().toLowerCase();
    const employee = filter?.employeeId && filter.employeeId !== 'all' ? filter.employeeId : undefined;
    const txType = filter?.transactionType || 'all';
    const targetWalletId = filter?.walletId && filter.walletId !== 'all' ? filter.walletId : undefined;
    const targetStatus = filter?.status && filter.status !== 'all' ? filter.status : undefined;
    const minAmount = filter?.minAmount !== undefined && filter.minAmount !== ('' as any) ? Number(filter.minAmount) : undefined;
    const maxAmount = filter?.maxAmount !== undefined && filter.maxAmount !== ('' as any) ? Number(filter.maxAmount) : undefined;

    const unifiedList: UnifiedFinancialTransaction[] = [];

    // Helper: text search matcher
    const matchesSearch = (...fields: (string | number | undefined | null)[]) => {
      if (!search) return true;
      return fields.some(f => f !== undefined && f !== null && String(f).toLowerCase().includes(search));
    };

    // Helper: employee matcher
    const matchesEmployee = (empId?: string, empName?: string) => {
      if (!employee) return true;
      return empId === employee || (empName && empName.toLowerCase().includes(employee.toLowerCase()));
    };

    // Helper: amount matcher
    const matchesAmount = (amt: number) => {
      if (minAmount !== undefined && !isNaN(minAmount) && amt < minAmount) return false;
      if (maxAmount !== undefined && !isNaN(maxAmount) && amt > maxAmount) return false;
      return true;
    };

    // Helper: status matcher
    const matchesStatus = (st: string) => {
      if (!targetStatus) return true;
      return st === targetStatus;
    };

    // Helper: wallet matcher
    const matchesWallet = (wId?: string, wName?: string) => {
      if (!targetWalletId) return true;
      return wId === targetWalletId || (wName && wName.toLowerCase().includes(targetWalletId.toLowerCase()));
    };

    // 1. Tickets (Customers & Direct Top-ups)
    if (dept === 'all' || dept === 'customers') {
      const tickets = this.getTickets();
      tickets.forEach(t => {
        if (!this.isDateMatchingFilter(t.createdAt, preset, customStart, customEnd)) return;
        if (game && t.gameName !== game) return;
        if (!matchesSearch(t.customerName, t.customerPhone, t.customerId, t.ticketNumber, t.notes, t.gameName)) return;
        if (!matchesEmployee(t.assignedTo, t.assignedTo)) return;

        const isRefund = t.status === 'refunded';
        if (txType === 'refund' && !isRefund) return;
        if (txType === 'sale' && t.status !== 'completed') return;
        if (txType !== 'all' && txType !== 'sale' && txType !== 'refund') return;

        const amount = t.receivedAmount || t.requiredAmount || t.totalProductsAmount || 0;
        if (!matchesAmount(amount)) return;
        if (!matchesWallet(t.paymentWalletId, t.paymentWallet)) return;

        const currentStatus = isRefund ? 'refunded' : t.status === 'completed' ? 'completed' : t.status === 'canceled' ? 'canceled' : 'pending';
        if (!matchesStatus(currentStatus)) return;

        const profit = t.netProfit !== undefined ? t.netProfit : Math.round(amount * 0.18);
        const cost = t.costPrice !== undefined ? t.costPrice : Math.max(0, amount - profit);

        unifiedList.push({
          id: `tx_tkt_${t.id}`,
          createdAt: t.createdAt,
          department: 'customers',
          departmentNameArabic: 'الزبائن والشحن',
          type: isRefund ? 'refund' : 'sale',
          typeLabelArabic: isRefund ? 'استرداد تذكرة' : 'بيع وشحن فوري',
          category: isRefund ? 'refund' : 'sales',
          amount: isRefund ? (t.refundDetails?.amount || amount) : amount,
          costAmount: cost,
          netProfit: isRefund ? -profit : profit,
          currency: 'EGP',
          referenceId: t.id,
          referenceNumber: t.ticketNumber,
          gameName: t.gameName,
          partyId: t.customerId,
          partyName: t.customerName,
          partyPhone: t.customerPhone,
          partyType: 'customer',
          performedBy: { id: t.assignedTo, name: t.assignedTo || 'موظف الشحن', role: 'employee' },
          walletId: t.paymentWalletId,
          walletName: t.paymentWallet,
          status: currentStatus as any,
          notes: t.refundDetails?.reason || t.notes,
          description: `تذكرة شحن #${t.ticketNumber} للعبة ${t.gameName || 'عام'} للعميل ${t.customerName}`
        });
      });
    }

    // 2. Dealer Tickets & Merchant Invoices (Dealers & Wholesale)
    if (dept === 'all' || dept === 'dealers') {
      const dealerTickets = this.getDealerTickets();
      dealerTickets.forEach(t => {
        if (!this.isDateMatchingFilter(t.createdAt, preset, customStart, customEnd)) return;
        if (game && t.gameName !== game) return;
        if (!matchesSearch(t.customerName, t.customerPhone, t.customerId, t.ticketNumber, t.notes, t.gameName)) return;
        if (!matchesEmployee(t.assignedTo, t.assignedTo)) return;

        const isRefund = t.status === 'refunded';
        if (txType === 'refund' && !isRefund) return;
        if (txType === 'sale' && t.status !== 'completed') return;
        if (txType !== 'all' && txType !== 'sale' && txType !== 'refund') return;

        const amount = t.receivedAmount || t.requiredAmount || t.totalProductsAmount || 0;
        if (!matchesAmount(amount)) return;
        if (!matchesWallet(t.paymentWalletId, t.paymentWallet)) return;

        const currentStatus = isRefund ? 'refunded' : t.status === 'completed' ? 'completed' : t.status === 'canceled' ? 'canceled' : 'pending';
        if (!matchesStatus(currentStatus)) return;

        const profit = t.netProfit !== undefined ? t.netProfit : Math.round(amount * 0.15);
        const cost = t.costPrice !== undefined ? t.costPrice : Math.max(0, amount - profit);

        unifiedList.push({
          id: `tx_dlr_tkt_${t.id}`,
          createdAt: t.createdAt,
          department: 'dealers',
          departmentNameArabic: 'التجار والموزعين',
          type: isRefund ? 'refund' : 'sale',
          typeLabelArabic: isRefund ? 'استرداد تذكرة تاجر' : 'مبيعات جملة تاجر',
          category: isRefund ? 'refund' : 'sales',
          amount: isRefund ? (t.refundDetails?.amount || amount) : amount,
          costAmount: cost,
          netProfit: isRefund ? -profit : profit,
          currency: 'EGP',
          referenceId: t.id,
          referenceNumber: t.ticketNumber,
          gameName: t.gameName,
          partyId: t.customerId,
          partyName: t.customerName,
          partyPhone: t.customerPhone,
          partyType: 'dealer',
          performedBy: { id: t.assignedTo, name: t.assignedTo || 'مسؤول التجار', role: 'employee' },
          walletId: t.paymentWalletId,
          walletName: t.paymentWallet,
          status: currentStatus as any,
          notes: t.refundDetails?.reason || t.notes,
          description: `تذكرة تاجر #${t.ticketNumber} للعبة ${t.gameName || 'عام'} للتاجر ${t.customerName}`
        });
      });

      const merchantInvoices = this.getItem<MerchantInvoice[]>(STORAGE_KEYS.MERCHANT_INVOICES, initialMerchantInvoicesSeed);
      merchantInvoices.forEach(inv => {
        if (inv.isArchived) return;
        const invDate = inv.createdAt || inv.issueDate;
        if (!this.isDateMatchingFilter(invDate, preset, customStart, customEnd)) return;
        if (!matchesSearch(inv.merchantName, inv.merchantId, inv.invoiceNumber, inv.notes)) return;
        if (!matchesEmployee(undefined, inv.createdBy)) return;
        if (txType === 'sale' && inv.type !== 'sale') return;
        if (txType === 'purchase' && inv.type !== 'purchase') return;
        if (txType !== 'all' && txType !== 'sale' && txType !== 'purchase') return;
        if (!matchesAmount(inv.totalAmount)) return;
        if (!matchesStatus('completed')) return;

        const isSale = inv.type === 'sale';
        unifiedList.push({
          id: `tx_inv_${inv.id}`,
          createdAt: invDate,
          department: 'dealers',
          departmentNameArabic: 'التجار والموزعين',
          type: isSale ? 'sale' : 'purchase',
          typeLabelArabic: isSale ? 'مبيعات جملة تاجر' : 'مشتريات بضاعة مورد',
          category: isSale ? 'sales' : 'merchant_settlement',
          amount: inv.totalAmount,
          costAmount: isSale ? Math.round(inv.totalAmount * 0.85) : inv.totalAmount,
          netProfit: isSale ? Math.round(inv.totalAmount * 0.15) : 0,
          currency: 'EGP',
          referenceId: inv.id,
          referenceNumber: inv.invoiceNumber,
          partyId: inv.merchantId,
          partyName: inv.merchantName,
          partyType: isSale ? 'dealer' : 'supplier',
          performedBy: { name: inv.createdBy || 'المسؤول' },
          status: 'completed',
          notes: inv.notes,
          description: `فاتورة ${isSale ? 'بيع' : 'شراء'} #${inv.invoiceNumber} للتاجر ${inv.merchantName}`
        });
      });
    }

    // 3. Middleman Deals & Sold Accounts (Middleman)
    if (dept === 'all' || dept === 'middleman') {
      const deals = this.getMiddlemanDeals(true);
      deals.forEach(d => {
        if (!this.isDateMatchingFilter(d.createdAt, preset, customStart, customEnd)) return;
        if (game && d.gameName !== game) return;
        if (!matchesSearch(d.sellerName, d.buyerName, d.sellerPhone, d.buyerPhone, d.id, d.dealNumber, d.title)) return;
        if (txType === 'sale' && d.status !== 'completed') return;
        if (txType !== 'all' && txType !== 'middleman' && txType !== 'sale') return;

        const dealAmt = d.dealAmountEGP || d.dealAmount || 0;
        if (!matchesAmount(dealAmt)) return;
        const currentStatus = d.status === 'completed' ? 'completed' : d.status === 'canceled' ? 'canceled' : 'pending';
        if (!matchesStatus(currentStatus)) return;

        unifiedList.push({
          id: `tx_deal_${d.id}`,
          createdAt: d.createdAt,
          department: 'middleman',
          departmentNameArabic: 'الوساطة والضمان',
          type: 'middleman',
          typeLabelArabic: 'صفقة وساطة وضمان',
          category: 'middleman_commission',
          amount: dealAmt,
          costAmount: d.externalMiddlemanCommissionAmountEGP || 0,
          netProfit: d.netCompanyProfitEGP || d.companyCommissionAmountEGP || 0,
          currency: (d.currency as any) || 'EGP',
          referenceId: d.id,
          referenceNumber: d.dealNumber,
          gameName: d.gameName,
          partyName: `بائع: ${d.sellerName} / مشترٍ: ${d.buyerName}`,
          partyPhone: d.buyerPhone || d.sellerPhone,
          partyType: 'middleman',
          status: currentStatus as any,
          notes: d.title,
          description: `صفقة وساطة #${d.dealNumber} (${d.title}) للعبة ${d.gameName}`
        });
      });

      const accounts = this.getMiddlemanAccounts();
      accounts.forEach(a => {
        if (a.status !== 'sold' && (!a.soldQuantity || a.soldQuantity <= 0)) return;
        const soldDate = a.saleRecord?.soldAt || a.lastSoldAt || a.updatedAt || a.createdAt;
        if (!this.isDateMatchingFilter(soldDate, preset, customStart, customEnd)) return;
        if (game && a.gameName !== game) return;
        if (!matchesSearch(a.title, a.sellerName, a.lastBuyerName, a.sellerPhone, a.lastBuyerPhone, a.id, a.accountCode)) return;
        if (txType !== 'all' && txType !== 'sale') return;

        const salePrice = (a.saleRecord?.salePriceEGP || a.actualSalePriceEGP || a.expectedSellingPriceEGP || 0) * (a.soldQuantity || 1);
        const costPrice = (a.saleRecord?.purchaseCostEGP || a.purchaseCostEGP || 0) * (a.soldQuantity || 1);
        const profit = a.netRealizedProfitEGP || Math.max(0, salePrice - costPrice);

        if (!matchesAmount(salePrice)) return;
        if (!matchesStatus('completed')) return;

        unifiedList.push({
          id: `tx_acc_${a.id}`,
          createdAt: soldDate,
          department: 'middleman',
          departmentNameArabic: 'مخزن الحسابات',
          type: 'sale',
          typeLabelArabic: 'بيع حساب ألعاب',
          category: 'account_sale',
          amount: salePrice,
          costAmount: costPrice,
          netProfit: profit,
          currency: 'EGP',
          referenceId: a.id,
          referenceNumber: a.accountCode,
          gameName: a.gameName,
          partyName: a.lastBuyerName || a.sellerName,
          partyPhone: a.lastBuyerPhone || a.sellerPhone,
          partyType: 'customer',
          status: 'completed',
          notes: a.title,
          description: `بيع حساب ألعاب #${a.accountCode} (${a.title}) للعبة ${a.gameName}`
        });
      });
    }

    // 4. Subscriptions Module
    if (dept === 'all' || dept === 'subscriptions') {
      const subs = this.getSubscriptions();
      subs.forEach(s => {
        if (!this.isDateMatchingFilter(s.createdAt, preset, customStart, customEnd)) return;
        if (plan && s.planId !== plan && s.planName !== plan) return;
        if (!matchesSearch(s.customerName, s.customerPhone, s.customerId, s.subscriptionNumber, s.planName, s.notes)) return;

        const isRefund = s.paymentStatus === 'refunded' || s.status === 'cancelled';
        if (txType === 'refund' && !isRefund) return;
        if (txType === 'sale' && isRefund) return;
        if (txType !== 'all' && txType !== 'sale' && txType !== 'subscription' && txType !== 'renewal' && txType !== 'refund') return;
        if (!matchesAmount(s.finalPrice)) return;

        const currentStatus = isRefund ? 'refunded' : 'completed';
        if (!matchesStatus(currentStatus)) return;

        unifiedList.push({
          id: `tx_sub_${s.id}`,
          createdAt: s.createdAt,
          department: 'subscriptions',
          departmentNameArabic: 'الاشتراكات الرقمية',
          type: isRefund ? 'refund' : s.renewalCount && s.renewalCount > 0 ? 'renewal' : 'subscription',
          typeLabelArabic: isRefund ? 'استرداد اشتراك' : s.renewalCount && s.renewalCount > 0 ? 'تجديد اشتراك' : 'بيع اشتراك جديد',
          category: isRefund ? 'subscription_refund' : s.renewalCount && s.renewalCount > 0 ? 'subscription_renewal' : 'subscription_sale',
          amount: s.finalPrice,
          costAmount: s.costPrice,
          netProfit: isRefund ? -(s.netProfit || 0) : s.netProfit,
          currency: (s.currency as any) || 'EGP',
          referenceId: s.id,
          referenceNumber: s.subscriptionNumber,
          planName: s.planName,
          partyId: s.customerId,
          partyName: s.customerName,
          partyPhone: s.customerPhone,
          partyType: 'customer',
          status: currentStatus as any,
          notes: s.notes,
          description: `اشتراك رقمي #${s.subscriptionNumber} (${s.planName}) للعميل ${s.customerName}`
        });
      });
    }

    // 5. Safe & Treasury Expenses / Transactions
    if (dept === 'all' || dept === 'treasury') {
      const expenses = this.getExpenses(false);
      expenses.forEach(e => {
        if (e.isArchived) return;
        const expDate = e.date || e.createdAt;
        if (!this.isDateMatchingFilter(expDate, preset, customStart, customEnd)) return;
        if (!matchesEmployee(undefined, e.approvedBy)) return;
        if (!matchesSearch(e.title, e.approvedBy, e.receiptNumber, e.notes, e.category)) return;
        if (txType !== 'all' && txType !== 'expense') return;
        if (!matchesAmount(e.amount)) return;
        if (!matchesStatus('completed')) return;

        unifiedList.push({
          id: `tx_exp_${e.id}`,
          createdAt: expDate,
          department: 'treasury',
          departmentNameArabic: 'الخزينة والمصروفات',
          type: 'expense',
          typeLabelArabic: 'مصروف تشغيلي',
          category: 'expense',
          amount: e.amount,
          costAmount: e.amount,
          netProfit: -e.amount,
          currency: 'EGP',
          referenceId: e.id,
          referenceNumber: e.receiptNumber,
          partyName: e.approvedBy,
          partyType: 'employee',
          performedBy: { name: e.approvedBy },
          status: 'completed',
          notes: e.notes,
          description: `مصروف: ${e.title} (تصنيف: ${e.category})`
        });
      });

      const safeTxs = this.getSafeTransactions();
      safeTxs.forEach(st => {
        if (!this.isDateMatchingFilter(st.createdAt, preset, customStart, customEnd)) return;
        if (!matchesEmployee(undefined, st.performedBy)) return;
        if (!matchesSearch(st.description, st.performedBy, st.referenceId, st.category)) return;
        if (!matchesAmount(st.amount)) return;
        if (!matchesStatus('completed')) return;

        // Skip duplicated sales already counted
        if (st.category === 'sales' || st.category === 'account_sale' || st.category === 'middleman_commission' || st.category === 'subscription_sale') {
          return;
        }

        const safeType = st.type === 'cash_in' ? 'topup' : st.type === 'transfer' ? 'transfer' : 'expense';
        if (txType !== 'all' && txType !== safeType && txType !== 'topup') return;

        unifiedList.push({
          id: `tx_safe_${st.id}`,
          createdAt: st.createdAt,
          department: 'treasury',
          departmentNameArabic: 'الخزينة المركزية',
          type: safeType as any,
          typeLabelArabic: st.type === 'cash_in' ? 'إيداع بالخزنة' : st.type === 'transfer' ? 'تحويل خزنة' : 'سحب من الخزنة',
          category: st.category,
          amount: st.amount,
          currency: 'EGP',
          referenceId: st.referenceId || st.id,
          performedBy: { name: st.performedBy },
          balanceAfter: st.balanceAfter,
          status: 'completed',
          description: st.description
        });
      });
    }

    // 6. Wallets & Banking Transactions (Vodafone Cash, InstaPay, Banks, JKR Wallets)
    if (dept === 'all' || dept === 'wallets' || dept === 'treasury') {
      const storeWalletTxs = this.getStoreWalletTransactions();
      const bonds = this.getDepositBondsFIFO();
      const bondNumbers = new Set(bonds.map(b => b.bondNumber).filter(Boolean));

      storeWalletTxs.forEach(wtx => {
        if (!this.isDateMatchingFilter(wtx.createdAt, preset, customStart, customEnd)) return;
        if (!matchesSearch(wtx.walletName, wtx.customerName, wtx.description, wtx.referenceNumber, wtx.notes, wtx.sourceName)) return;
        if (!matchesWallet(wtx.walletId, wtx.walletName) && !matchesWallet(wtx.relatedWalletId, wtx.relatedWalletName)) return;
        if (!matchesAmount(wtx.amount)) return;

        // When viewing all departments together, prevent duplicate entries for ticket sales and refunds already listed in customer/dealer sections
        if (dept === 'all' && (wtx.sourceType === 'ticket' || wtx.sourceType === 'refund' || wtx.sourceTicketId)) {
          return;
        }

        // Avoid doubling FIFO bond deposits already rendered in Deposit Bonds section
        if (wtx.type === 'bond_deposit' && wtx.referenceNumber && bondNumbers.has(wtx.referenceNumber)) {
          return;
        }

        const isRefund = wtx.type === 'refund';
        const isTransferOut = wtx.type === 'transfer_out';
        const isTransferIn = wtx.type === 'transfer_in';
        const isWithdrawal = wtx.type === 'withdrawal' || isTransferOut || wtx.type === 'purchase' || wtx.type === 'loss' || wtx.type === 'fee';

        let mappedType: UnifiedFinanceTxType;
        let typeLabelArabic: string;
        let category: any;

        if (isRefund) {
          mappedType = 'refund';
          typeLabelArabic = 'استرداد مالي من محفظة';
          category = 'refund';
        } else if (isTransferOut) {
          mappedType = 'wallet_withdrawal';
          typeLabelArabic = 'تحويل محفظة صادر';
          category = 'transfer';
        } else if (isTransferIn) {
          mappedType = 'wallet_deposit';
          typeLabelArabic = 'تحويل محفظة وارد';
          category = 'transfer';
        } else if (isWithdrawal) {
          mappedType = 'wallet_withdrawal';
          typeLabelArabic = wtx.type === 'purchase' ? 'شراء واستهلاك بضاعة' : wtx.type === 'loss' ? 'خسارة محفظة' : wtx.type === 'fee' ? 'رسوم تحويل محفظة' : 'سحب من محفظة';
          category = 'expense';
        } else if (wtx.type === 'adjustment') {
          const isPos = wtx.balanceAfter !== undefined && wtx.balanceBefore !== undefined ? wtx.balanceAfter >= wtx.balanceBefore : (wtx.amount || 0) >= 0;
          mappedType = isPos ? 'wallet_deposit' : 'wallet_withdrawal';
          typeLabelArabic = isPos ? 'تسوية محفظة إضافة' : 'تسوية محفظة خصم';
          category = isPos ? 'customer_deposit' : 'expense';
        } else {
          mappedType = 'wallet_deposit';
          typeLabelArabic = wtx.type === 'bond_deposit' ? 'سند إيداع بضاعة' : wtx.type === 'compensation' ? 'تعويض مسترد' : wtx.type === 'cashback' ? 'إيداع كاش باك' : 'إيداع بمحفظة';
          category = 'customer_deposit';
        }

        if (txType !== 'all' && txType !== mappedType && txType !== 'transfer' && txType !== 'topup' && !(txType === 'refund' && isRefund)) return;
        if (!matchesStatus('completed')) return;

        unifiedList.push({
          id: `tx_wlt_${wtx.id}`,
          createdAt: wtx.createdAt,
          department: 'wallets',
          departmentNameArabic: 'المحافظ والبنوك',
          type: mappedType,
          typeLabelArabic,
          category,
          amount: Math.abs(wtx.amount),
          currency: (wtx.currency as any) || 'EGP',
          referenceId: wtx.id,
          referenceNumber: wtx.referenceNumber,
          walletId: wtx.walletId,
          walletName: wtx.walletName,
          partyName: wtx.customerName || wtx.sourceName || wtx.relatedWalletName,
          partyType: 'wallet',
          performedBy: { name: wtx.performedBy?.name || 'المسؤول' },
          balanceBefore: wtx.balanceBefore,
          balanceAfter: wtx.balanceAfter,
          status: 'completed',
          notes: wtx.notes,
          description: wtx.description || `حركة محفظة: ${wtx.walletName}`
        });
      });

      // Deposit Bonds (FIFO Official Vouchers)
      bonds.forEach(b => {
        const bDate = b.date || b.createdAt;
        if (!this.isDateMatchingFilter(bDate, preset, customStart, customEnd)) return;
        if (!matchesSearch(b.walletName, b.bondNumber)) return;
        if (!matchesWallet(b.walletId, b.walletName)) return;
        if (!matchesAmount(b.totalCostEGP)) return;
        if (txType !== 'all' && txType !== 'bond_deposit' && txType !== 'wallet_deposit' && txType !== 'topup') return;
        if (!matchesStatus('completed')) return;

        unifiedList.push({
          id: `tx_bnd_${b.id}`,
          createdAt: bDate,
          department: 'wallets',
          departmentNameArabic: 'سندات إيداع المحافظ',
          type: 'bond_deposit',
          typeLabelArabic: 'سند إيداع مالي معتمد',
          category: 'capital',
          amount: b.totalCostEGP,
          costAmount: b.totalCostEGP,
          currency: 'EGP',
          referenceId: b.id,
          referenceNumber: b.bondNumber,
          walletId: b.walletId,
          walletName: b.walletName,
          partyType: 'wallet',
          performedBy: { name: 'المسؤول' },
          status: 'completed',
          description: `سند إيداع رسمي #${b.bondNumber} في محفظة ${b.walletName} (${b.unitsDeposited} وحدة - $${b.costUSDT})`
        });
      });
    }

    // Sort by latest timestamp descending
    return unifiedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Backup and Restore
  public createBackup(): string {
    // 1. Gather all explicit modules data from STORAGE_KEYS
    const explicitData: Record<string, any> = {};
    for (const [keyName, storageKey] of Object.entries(STORAGE_KEYS)) {
      try {
        const raw = localStorage.getItem(storageKey);
        explicitData[keyName] = raw ? JSON.parse(raw) : null;
      } catch {
        explicitData[keyName] = null;
      }
    }

    // 2. Dump all localStorage keys to guarantee 100% full snapshot coverage
    const rawStorageDump: Record<string, string> = {};
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          const val = window.localStorage.getItem(key);
          if (val !== null) {
            rawStorageDump[key] = val;
          }
        }
      }
    }

    const data = {
      version: '3.0',
      systemName: 'NZM JKR ERP',
      exportedAt: new Date().toISOString(),

      // Core System & Finance
      settings: this.getSettings(),
      users: this.getUsers(),
      customers: this.getItem(STORAGE_KEYS.CUSTOMERS, []),
      customersRetail: this.getItem(STORAGE_KEYS.CUSTOMERS_RETAIL, []),
      customersTraders: this.getItem(STORAGE_KEYS.CUSTOMERS_TRADERS, []),
      customersBrokerage: this.getItem(STORAGE_KEYS.CUSTOMERS_BROKERAGE, []),
      customersSubscriptions: this.getItem(STORAGE_KEYS.CUSTOMERS_SUBSCRIPTIONS, []),
      notes: this.getItem(STORAGE_KEYS.NOTES, []),
      tickets: this.getItem(STORAGE_KEYS.TICKETS, []),
      referrals: this.getItem(STORAGE_KEYS.REFERRALS, []),
      cashback: this.getItem(STORAGE_KEYS.CASHBACK, []),
      customerTransactions: this.getItem(STORAGE_KEYS.CUSTOMER_TRANSACTIONS, []),
      safeTransactions: this.getItem(STORAGE_KEYS.SAFE_TRANSACTIONS, []),
      expenses: this.getItem(STORAGE_KEYS.EXPENSES, []),
      debts: this.getItem(STORAGE_KEYS.DEBTS, []),
      settlements: this.getItem(STORAGE_KEYS.SETTLEMENTS, []),
      attendance: this.getItem(STORAGE_KEYS.ATTENDANCE, []),
      salaries: this.getItem(STORAGE_KEYS.SALARIES, []),
      auditLogs: this.getItem(STORAGE_KEYS.AUDIT_LOGS, []),
      notifications: this.getItem(STORAGE_KEYS.NOTIFICATIONS, []),

      // Top-Up Catalog, Games, Sections, Products & Store Wallets
      gamesTree: this.getItem(STORAGE_KEYS.GAMES_TREE, []),
      firstShippingGameTree: this.getItem(STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE, []),
      exchangeRate: this.getItem(STORAGE_KEYS.EXCHANGE_RATE, null),
      storeWallets: this.getItem(STORAGE_KEYS.STORE_WALLETS, []),
      storeWalletTransactions: this.getItem(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, []),
      depositBondsFIFO: this.getItem(STORAGE_KEYS.DEPOSIT_BONDS_FIFO, []),
      coupons: this.getItem(STORAGE_KEYS.COUPONS, []),
      systemCodes: this.getItem(STORAGE_KEYS.SYSTEM_CODES, []),
      customerModuleSettings: this.getItem(STORAGE_KEYS.CUSTOMER_MODULE_SETTINGS, null),
      copyTemplates: this.getItem(STORAGE_KEYS.COPY_TEMPLATES, []),
      marketingCopySettings: this.getItem(STORAGE_KEYS.MARKETING_COPY_SETTINGS, null),

      // Wholesale Dealers
      dealers: this.getItem(STORAGE_KEYS.DEALERS, []),
      dealerNotes: this.getItem(STORAGE_KEYS.DEALER_NOTES, []),
      dealerTickets: this.getItem(STORAGE_KEYS.DEALER_TICKETS, []),
      dealerReferrals: this.getItem(STORAGE_KEYS.DEALER_REFERRALS, []),
      dealerCashback: this.getItem(STORAGE_KEYS.DEALER_CASHBACK, []),
      dealerTransactions: this.getItem(STORAGE_KEYS.DEALER_TRANSACTIONS, []),
      dealerModuleSettings: this.getItem(STORAGE_KEYS.DEALER_MODULE_SETTINGS, null),
      dealerPricingAuditLogs: this.getItem(STORAGE_KEYS.DEALER_PRICING_AUDIT_LOGS, []),

      // Dealer Finance (Isolated)
      dealerSafeTransactions: this.getItem(STORAGE_KEYS.DEALER_SAFE_TRANSACTIONS, []),
      dealerWallets: this.getItem(STORAGE_KEYS.DEALER_WALLETS, []),
      dealerWalletTransactions: this.getItem(STORAGE_KEYS.DEALER_WALLET_TRANSACTIONS, []),
      dealerExpenses: this.getItem(STORAGE_KEYS.DEALER_EXPENSES, []),
      dealerDebts: this.getItem(STORAGE_KEYS.DEALER_DEBTS, []),
      dealerSettlements: this.getItem(STORAGE_KEYS.DEALER_SETTLEMENTS, []),
      dealerShiftDeficits: this.getItem(STORAGE_KEYS.DEALER_SHIFT_DEFICITS, []),
      dealerAttendance: this.getItem(STORAGE_KEYS.DEALER_ATTENDANCE, []),
      dealerSalaries: this.getItem(STORAGE_KEYS.DEALER_SALARIES, []),
      dealerEmployees: this.getItem(STORAGE_KEYS.DEALER_EMPLOYEES, []),
      dealerDailyClosures: this.getItem(STORAGE_KEYS.DEALER_DAILY_CLOSURES, []),

      // Merchants & Suppliers
      merchants: this.getItem(STORAGE_KEYS.MERCHANTS, []),
      merchantInvoices: this.getItem(STORAGE_KEYS.MERCHANT_INVOICES, []),
      merchantReminders: this.getItem(STORAGE_KEYS.MERCHANT_REMINDERS, []),
      merchantTransactions: this.getItem(STORAGE_KEYS.MERCHANT_TRANSACTIONS, []),
      merchantProductRules: this.getItem(STORAGE_KEYS.MERCHANT_PRODUCT_RULES, []),
      merchantNotes: this.getItem(STORAGE_KEYS.MERCHANT_NOTES, []),
      merchantFiles: this.getItem(STORAGE_KEYS.MERCHANT_FILES, []),

      // Middleman (Brokerage)
      middlemanDeals: this.getItem(STORAGE_KEYS.MIDDLEMAN_DEALS, []),
      middlemanAccounts: this.getItem(STORAGE_KEYS.MIDDLEMAN_ACCOUNTS, []),
      middlemanNotifications: this.getItem(STORAGE_KEYS.MIDDLEMAN_NOTIFICATIONS, []),
      middlemanFollowups: this.getItem(STORAGE_KEYS.MIDDLEMAN_FOLLOWUPS, []),
      middlemanSettings: this.getItem(STORAGE_KEYS.MIDDLEMAN_SETTINGS, null),

      // Subscriptions
      subscriptionPlans: this.getItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, []),
      subscriptions: this.getItem(STORAGE_KEYS.SUBSCRIPTIONS, []),
      subscriptionPayments: this.getItem(STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, []),
      subscriptionNotifications: this.getItem(STORAGE_KEYS.SUBSCRIPTION_NOTIFICATIONS, []),
      subscriptionSettings: this.getItem(STORAGE_KEYS.SUBSCRIPTION_SETTINGS, null),
      subscriptionSavedFilters: this.getItem(STORAGE_KEYS.SUBSCRIPTION_SAVED_FILTERS, []),
      subscriptionRetryQueue: this.getItem(STORAGE_KEYS.SUBSCRIPTION_RETRY_QUEUE, []),
      subscriptionScheduler: this.getItem(STORAGE_KEYS.SUBSCRIPTION_SCHEDULER, null),
      subscriptionFavReports: this.getItem(STORAGE_KEYS.SUBSCRIPTION_FAVORITE_REPORTS, []),

      // Explicit dictionary of all STORAGE_KEYS
      explicitModules: explicitData,
      // Full raw localStorage dump covering everything including wallet FIFO lots and custom keys
      rawStorageDump
    };
    return JSON.stringify(data, null, 2);
  }

  public restoreBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid backup file format');
      }

      // 1. If full raw storage dump is present, restore all raw keys directly into localStorage
      if (data.rawStorageDump && typeof data.rawStorageDump === 'object') {
        for (const [key, val] of Object.entries(data.rawStorageDump)) {
          if (key && val !== undefined && val !== null) {
            localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
          }
        }
      }

      // 2. If explicitModules map is present, restore each STORAGE_KEY
      if (data.explicitModules && typeof data.explicitModules === 'object') {
        for (const [keyName, val] of Object.entries(data.explicitModules)) {
          const storageKey = (STORAGE_KEYS as any)[keyName];
          if (storageKey && val !== null && val !== undefined) {
            this.setItem(storageKey, val);
          }
        }
      }

      // 3. Restore all structured modules directly
      if (data.settings) this.setItem(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.users) this.setItem(STORAGE_KEYS.USERS, data.users);
      if (data.customers) this.setItem(STORAGE_KEYS.CUSTOMERS, data.customers);
      if (data.customersRetail) this.setItem(STORAGE_KEYS.CUSTOMERS_RETAIL, data.customersRetail);
      if (data.customersTraders) this.setItem(STORAGE_KEYS.CUSTOMERS_TRADERS, data.customersTraders);
      if (data.customersBrokerage) this.setItem(STORAGE_KEYS.CUSTOMERS_BROKERAGE, data.customersBrokerage);
      if (data.customersSubscriptions) this.setItem(STORAGE_KEYS.CUSTOMERS_SUBSCRIPTIONS, data.customersSubscriptions);
      if (data.merchants) this.setItem(STORAGE_KEYS.MERCHANTS, data.merchants);
      if (data.merchantInvoices) this.setItem(STORAGE_KEYS.MERCHANT_INVOICES, data.merchantInvoices);
      if (data.merchantReminders) this.setItem(STORAGE_KEYS.MERCHANT_REMINDERS, data.merchantReminders);
      if (data.merchantTransactions) this.setItem(STORAGE_KEYS.MERCHANT_TRANSACTIONS, data.merchantTransactions);
      if (data.merchantProductRules) this.setItem(STORAGE_KEYS.MERCHANT_PRODUCT_RULES, data.merchantProductRules);
      if (data.merchantNotes) this.setItem(STORAGE_KEYS.MERCHANT_NOTES, data.merchantNotes);
      if (data.merchantFiles) this.setItem(STORAGE_KEYS.MERCHANT_FILES, data.merchantFiles);
      if (data.notes) this.setItem(STORAGE_KEYS.NOTES, data.notes);
      if (data.tickets) this.setItem(STORAGE_KEYS.TICKETS, data.tickets);
      if (data.referrals) this.setItem(STORAGE_KEYS.REFERRALS, data.referrals);
      if (data.cashback) this.setItem(STORAGE_KEYS.CASHBACK, data.cashback);
      if (data.customerTransactions) this.setItem(STORAGE_KEYS.CUSTOMER_TRANSACTIONS, data.customerTransactions);
      if (data.safeTransactions) this.setItem(STORAGE_KEYS.SAFE_TRANSACTIONS, data.safeTransactions);
      if (data.expenses) this.setItem(STORAGE_KEYS.EXPENSES, data.expenses);
      if (data.debts) this.setItem(STORAGE_KEYS.DEBTS, data.debts);
      if (data.settlements) this.setItem(STORAGE_KEYS.SETTLEMENTS, data.settlements);
      if (data.attendance) this.setItem(STORAGE_KEYS.ATTENDANCE, data.attendance);
      if (data.salaries) this.setItem(STORAGE_KEYS.SALARIES, data.salaries);
      if (data.auditLogs) this.setItem(STORAGE_KEYS.AUDIT_LOGS, data.auditLogs);
      if (data.notifications) this.setItem(STORAGE_KEYS.NOTIFICATIONS, data.notifications);

      // Top-Up Catalog & Products & Store Wallets
      if (data.gamesTree) this.setItem(STORAGE_KEYS.GAMES_TREE, data.gamesTree);
      if (data.firstShippingGameTree) this.setItem(STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE, data.firstShippingGameTree);
      if (data.exchangeRate) this.setItem(STORAGE_KEYS.EXCHANGE_RATE, data.exchangeRate);
      if (data.storeWallets) this.setItem(STORAGE_KEYS.STORE_WALLETS, data.storeWallets);
      if (data.storeWalletTransactions) this.setItem(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, data.storeWalletTransactions);
      if (data.depositBondsFIFO) this.setItem(STORAGE_KEYS.DEPOSIT_BONDS_FIFO, data.depositBondsFIFO);
      if (data.coupons) this.setItem(STORAGE_KEYS.COUPONS, data.coupons);
      if (data.systemCodes) this.setItem(STORAGE_KEYS.SYSTEM_CODES, data.systemCodes);
      if (data.customerModuleSettings) this.setItem(STORAGE_KEYS.CUSTOMER_MODULE_SETTINGS, data.customerModuleSettings);
      if (data.copyTemplates) this.setItem(STORAGE_KEYS.COPY_TEMPLATES, data.copyTemplates);
      if (data.marketingCopySettings) this.setItem(STORAGE_KEYS.MARKETING_COPY_SETTINGS, data.marketingCopySettings);

      // Wholesale Dealers
      if (data.dealers) this.setItem(STORAGE_KEYS.DEALERS, data.dealers);
      if (data.dealerNotes) this.setItem(STORAGE_KEYS.DEALER_NOTES, data.dealerNotes);
      if (data.dealerTickets) this.setItem(STORAGE_KEYS.DEALER_TICKETS, data.dealerTickets);
      if (data.dealerReferrals) this.setItem(STORAGE_KEYS.DEALER_REFERRALS, data.dealerReferrals);
      if (data.dealerCashback) this.setItem(STORAGE_KEYS.DEALER_CASHBACK, data.dealerCashback);
      if (data.dealerTransactions) this.setItem(STORAGE_KEYS.DEALER_TRANSACTIONS, data.dealerTransactions);
      if (data.dealerModuleSettings) this.setItem(STORAGE_KEYS.DEALER_MODULE_SETTINGS, data.dealerModuleSettings);
      if (data.dealerPricingAuditLogs) this.setItem(STORAGE_KEYS.DEALER_PRICING_AUDIT_LOGS, data.dealerPricingAuditLogs);

      // Dealer Finance (Isolated)
      if (data.dealerSafeTransactions) this.setItem(STORAGE_KEYS.DEALER_SAFE_TRANSACTIONS, data.dealerSafeTransactions);
      if (data.dealerWallets) this.setItem(STORAGE_KEYS.DEALER_WALLETS, data.dealerWallets);
      if (data.dealerWalletTransactions) this.setItem(STORAGE_KEYS.DEALER_WALLET_TRANSACTIONS, data.dealerWalletTransactions);
      if (data.dealerExpenses) this.setItem(STORAGE_KEYS.DEALER_EXPENSES, data.dealerExpenses);
      if (data.dealerDebts) this.setItem(STORAGE_KEYS.DEALER_DEBTS, data.dealerDebts);
      if (data.dealerSettlements) this.setItem(STORAGE_KEYS.DEALER_SETTLEMENTS, data.dealerSettlements);
      if (data.dealerShiftDeficits) this.setItem(STORAGE_KEYS.DEALER_SHIFT_DEFICITS, data.dealerShiftDeficits);
      if (data.dealerAttendance) this.setItem(STORAGE_KEYS.DEALER_ATTENDANCE, data.dealerAttendance);
      if (data.dealerSalaries) this.setItem(STORAGE_KEYS.DEALER_SALARIES, data.dealerSalaries);
      if (data.dealerEmployees) this.setItem(STORAGE_KEYS.DEALER_EMPLOYEES, data.dealerEmployees);
      if (data.dealerDailyClosures) this.setItem(STORAGE_KEYS.DEALER_DAILY_CLOSURES, data.dealerDailyClosures);

      // Middleman (Brokerage)
      if (data.middlemanDeals) this.setItem(STORAGE_KEYS.MIDDLEMAN_DEALS, data.middlemanDeals);
      if (data.middlemanAccounts) this.setItem(STORAGE_KEYS.MIDDLEMAN_ACCOUNTS, data.middlemanAccounts);
      if (data.middlemanNotifications) this.setItem(STORAGE_KEYS.MIDDLEMAN_NOTIFICATIONS, data.middlemanNotifications);
      if (data.middlemanFollowups) this.setItem(STORAGE_KEYS.MIDDLEMAN_FOLLOWUPS, data.middlemanFollowups);
      if (data.middlemanSettings) this.setItem(STORAGE_KEYS.MIDDLEMAN_SETTINGS, data.middlemanSettings);

      // Subscriptions
      if (data.subscriptionPlans) this.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, data.subscriptionPlans);
      if (data.subscriptions) this.setItem(STORAGE_KEYS.SUBSCRIPTIONS, data.subscriptions);
      if (data.subscriptionPayments) this.setItem(STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, data.subscriptionPayments);
      if (data.subscriptionNotifications) this.setItem(STORAGE_KEYS.SUBSCRIPTION_NOTIFICATIONS, data.subscriptionNotifications);
      if (data.subscriptionSettings) this.setItem(STORAGE_KEYS.SUBSCRIPTION_SETTINGS, data.subscriptionSettings);
      if (data.subscriptionSavedFilters) this.setItem(STORAGE_KEYS.SUBSCRIPTION_SAVED_FILTERS, data.subscriptionSavedFilters);
      if (data.subscriptionRetryQueue) this.setItem(STORAGE_KEYS.SUBSCRIPTION_RETRY_QUEUE, data.subscriptionRetryQueue);
      if (data.subscriptionScheduler) this.setItem(STORAGE_KEYS.SUBSCRIPTION_SCHEDULER, data.subscriptionScheduler);
      if (data.subscriptionFavReports) this.setItem(STORAGE_KEYS.SUBSCRIPTION_FAVORITE_REPORTS, data.subscriptionFavReports);

      eventBus.publish(SYSTEM_EVENTS.BACKUP_RESTORED, { restoredAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.error('Failed to restore backup', e);
      return false;
    }
  }

  // =========================================
  // Top-Up Catalog & Wallets Methods
  // =========================================

  public getExchangeRate(): DailyExchangeRate {
    return this.getItem<DailyExchangeRate>(STORAGE_KEYS.EXCHANGE_RATE, initialExchangeRate);
  }

  public getDailyExchangeRate(): DailyExchangeRate {
    return this.getExchangeRate();
  }

  public updateExchangeRate(
    newRate: number,
    fixedCostPerOrder?: number,
    breakEvenTarget?: number,
    updatedBy?: string,
    notes?: string
  ): DailyExchangeRate {
    const current = this.getExchangeRate();
    const history = current.rateHistory || [];
    
    // Log history entry
    const newHistoryEntry: RateHistoryItem = {
      rate: newRate,
      oldRate: current.rateUSD_EGP,
      timestamp: new Date().toISOString(),
      changedBy: updatedBy || 'المدير العام (Owner)',
      notes: notes || 'تحديث يدوي لسعر الصرف اليومي'
    };

    const updated: DailyExchangeRate = {
      rateUSD_EGP: newRate,
      fixedCostPerOrderEGP: fixedCostPerOrder !== undefined ? fixedCostPerOrder : current.fixedCostPerOrderEGP,
      monthlyBreakEvenTargetOrders: breakEvenTarget !== undefined ? breakEvenTarget : current.monthlyBreakEvenTargetOrders,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'المدير العام (Owner)',
      rateHistory: [newHistoryEntry, ...history]
    };
    this.setItem(STORAGE_KEYS.EXCHANGE_RATE, updated);
    return updated;
  }

  public getGameTree(): GameTreeItem[] {
    return this.getItem<GameTreeItem[]>(STORAGE_KEYS.GAMES_TREE, initialGamesTree);
  }

  public setGamesTree(games: GameTreeItem[]): void {
    this.setItem(STORAGE_KEYS.GAMES_TREE, games);
    eventBus.publish(SYSTEM_EVENTS.PRODUCTS_UPDATED, games);
  }

  public saveGameTreeItem(game: GameTreeItem): GameTreeItem {
    const games = this.getGameTree();
    const index = games.findIndex(g => g.id === game.id);
    if (index >= 0) {
      games[index] = { ...game, products: game.products || games[index].products || [] };
    } else {
      games.push({
        ...game,
        sections: game.sections || [],
        groups: game.groups || [],
        products: game.products || []
      });
    }
    this.setItem(STORAGE_KEYS.GAMES_TREE, games);
    return game;
  }

  public deleteGameTreeItem(gameId: string): boolean {
    const games = this.getGameTree();
    const filtered = games.filter(g => g.id !== gameId);
    this.setItem(STORAGE_KEYS.GAMES_TREE, filtered);
    return true;
  }

  public saveGameSection(gameId: string, section: GameSection): GameSection {
    const games = this.getGameTree();
    const gIndex = games.findIndex(g => g.id === gameId);
    if (gIndex >= 0) {
      if (!games[gIndex].sections) games[gIndex].sections = [];
      const sIndex = games[gIndex].sections.findIndex(s => s.id === section.id);
      if (sIndex >= 0) {
        games[gIndex].sections[sIndex] = section;
      } else {
        games[gIndex].sections.push(section);
      }
      this.setItem(STORAGE_KEYS.GAMES_TREE, games);
    }
    return section;
  }

  public deleteGameSection(gameId: string, sectionId: string): boolean {
    const games = this.getGameTree();
    const gIndex = games.findIndex(g => g.id === gameId);
    if (gIndex >= 0) {
      games[gIndex].sections = (games[gIndex].sections || []).filter(s => s.id !== sectionId && s.parentId !== sectionId);
      games[gIndex].products = (games[gIndex].products || []).filter(p => p.sectionId !== sectionId);
      games[gIndex].groups = (games[gIndex].groups || []).filter(g => g.sectionId !== sectionId);
      this.setItem(STORAGE_KEYS.GAMES_TREE, games);
      return true;
    }
    return false;
  }

  public saveGameGroup(gameId: string, group: GameGroup): GameGroup {
    const games = this.getGameTree();
    const gIndex = games.findIndex(g => g.id === gameId);
    if (gIndex >= 0) {
      if (!games[gIndex].groups) games[gIndex].groups = [];
      const grpIndex = games[gIndex].groups.findIndex(gr => gr.id === group.id);
      if (grpIndex >= 0) {
        games[gIndex].groups[grpIndex] = group;
      } else {
        games[gIndex].groups.push(group);
      }
      this.setItem(STORAGE_KEYS.GAMES_TREE, games);
    }
    return group;
  }

  public deleteGameGroup(gameId: string, groupId: string): boolean {
    const games = this.getGameTree();
    const gIndex = games.findIndex(g => g.id === gameId);
    if (gIndex >= 0) {
      games[gIndex].groups = (games[gIndex].groups || []).filter(gr => gr.id !== groupId);
      // Clean up groupId from products in this group
      games[gIndex].products = (games[gIndex].products || []).map(p =>
        p.groupId === groupId ? { ...p, groupId: undefined, groupName: undefined } : p
      );
      this.setItem(STORAGE_KEYS.GAMES_TREE, games);
      return true;
    }
    return false;
  }

  public saveGameProduct(product: GameProduct): void {
    const games = this.getGameTree();
    const gIndex = games.findIndex(g => g.id === product.gameId);
    if (gIndex >= 0) {
      if (!games[gIndex].products) games[gIndex].products = [];
      const pIndex = games[gIndex].products.findIndex(p => p.id === product.id);
      if (pIndex >= 0) {
        games[gIndex].products[pIndex] = { ...product, updatedAt: new Date().toISOString() };
      } else {
        games[gIndex].products.push({ ...product, createdAt: new Date().toISOString() });
      }
      this.setItem(STORAGE_KEYS.GAMES_TREE, games);
    }
  }

  public deleteGameProduct(gameId: string, productId: string): void {
    const games = this.getGameTree();
    const gIndex = games.findIndex(g => g.id === gameId);
    if (gIndex >= 0) {
      games[gIndex].products = games[gIndex].products.filter(p => p.id !== productId);
      this.setItem(STORAGE_KEYS.GAMES_TREE, games);
    }
  }

  public getFirstShippingGameTree(): GameTreeItem[] {
    return this.getItem<GameTreeItem[]>(STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE, initialFirstShippingGameTree);
  }

  public setFirstShippingGamesTree(tree: GameTreeItem[]): void {
    this.setItem(STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE, tree);
    eventBus.publish(SYSTEM_EVENTS.PRODUCTS_UPDATED, tree);
  }

  public saveFirstShippingGameTreeItem(item: GameTreeItem): GameTreeItem {
    const tree = this.getFirstShippingGameTree();
    const index = tree.findIndex(t => t.id === item.id);
    if (index >= 0) {
      tree[index] = { ...item, products: item.products || tree[index].products || [] };
    } else {
      tree.push({
        ...item,
        sections: item.sections || [],
        groups: item.groups || [],
        products: item.products || []
      });
    }
    this.setItem(STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE, tree);
    eventBus.publish(SYSTEM_EVENTS.PRODUCTS_UPDATED, tree);
    return item;
  }

  public deleteFirstShippingGameTreeItem(id: string): boolean {
    const tree = this.getFirstShippingGameTree().filter(t => t.id !== id);
    this.setItem(STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE, tree);
    eventBus.publish(SYSTEM_EVENTS.PRODUCTS_UPDATED, tree);
    return true;
  }

  public saveFirstShippingSection(gameId: string, section: GameSection): GameSection {
    const tree = this.getFirstShippingGameTree();
    const gIndex = tree.findIndex(t => t.id === gameId);
    if (gIndex >= 0) {
      if (!tree[gIndex].sections) tree[gIndex].sections = [];
      const sIndex = tree[gIndex].sections!.findIndex(s => s.id === section.id);
      if (sIndex >= 0) {
        tree[gIndex].sections![sIndex] = section;
      } else {
        tree[gIndex].sections!.push(section);
      }
      this.setItem(STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE, tree);
      eventBus.publish(SYSTEM_EVENTS.PRODUCTS_UPDATED, tree);
    }
    return section;
  }

  public deleteFirstShippingSection(gameId: string, sectionId: string): boolean {
    const tree = this.getFirstShippingGameTree();
    const gIndex = tree.findIndex(t => t.id === gameId);
    if (gIndex >= 0) {
      tree[gIndex].sections = (tree[gIndex].sections || []).filter(s => s.id !== sectionId && s.parentId !== sectionId);
      tree[gIndex].products = (tree[gIndex].products || []).filter(p => p.sectionId !== sectionId);
      tree[gIndex].groups = (tree[gIndex].groups || []).filter(g => g.sectionId !== sectionId);
      this.setItem(STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE, tree);
      eventBus.publish(SYSTEM_EVENTS.PRODUCTS_UPDATED, tree);
      return true;
    }
    return false;
  }

  public saveFirstShippingGroup(gameId: string, group: GameGroup): GameGroup {
    const tree = this.getFirstShippingGameTree();
    const gIndex = tree.findIndex(t => t.id === gameId);
    if (gIndex >= 0) {
      if (!tree[gIndex].groups) tree[gIndex].groups = [];
      const grpIndex = tree[gIndex].groups!.findIndex(g => g.id === group.id);
      if (grpIndex >= 0) {
        tree[gIndex].groups![grpIndex] = group;
      } else {
        tree[gIndex].groups!.push(group);
      }
      this.setItem(STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE, tree);
      eventBus.publish(SYSTEM_EVENTS.PRODUCTS_UPDATED, tree);
    }
    return group;
  }

  public deleteFirstShippingGroup(gameId: string, groupId: string): boolean {
    const tree = this.getFirstShippingGameTree();
    const gIndex = tree.findIndex(t => t.id === gameId);
    if (gIndex >= 0) {
      tree[gIndex].groups = (tree[gIndex].groups || []).filter(g => g.id !== groupId);
      tree[gIndex].products = (tree[gIndex].products || []).filter(p => p.groupId !== groupId);
      this.setItem(STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE, tree);
      eventBus.publish(SYSTEM_EVENTS.PRODUCTS_UPDATED, tree);
      return true;
    }
    return false;
  }

  public saveFirstShippingProduct(product: GameProduct): GameProduct {
    const tree = this.getFirstShippingGameTree();
    const gIndex = tree.findIndex(t => t.id === product.gameId);
    if (gIndex >= 0) {
      if (!tree[gIndex].products) tree[gIndex].products = [];
      const pIndex = tree[gIndex].products!.findIndex(p => p.id === product.id);
      if (pIndex >= 0) {
        tree[gIndex].products![pIndex] = product;
      } else {
        tree[gIndex].products!.push(product);
      }
      this.setItem(STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE, tree);
      eventBus.publish(SYSTEM_EVENTS.PRODUCTS_UPDATED, tree);
    }
    return product;
  }

  public deleteFirstShippingProduct(gameId: string, productId: string): boolean {
    const tree = this.getFirstShippingGameTree();
    const gIndex = tree.findIndex(t => t.id === gameId);
    if (gIndex >= 0) {
      tree[gIndex].products = (tree[gIndex].products || []).filter(p => p.id !== productId);
      this.setItem(STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE, tree);
      eventBus.publish(SYSTEM_EVENTS.PRODUCTS_UPDATED, tree);
      return true;
    }
    return false;
  }

  public validateWalletNumberLimits(
    walletIdOrName: string,
    numberIdOrPhone: string,
    amount: number,
    operationType: 'receive' | 'send' = 'receive'
  ): {
    allowed: boolean;
    remainingDaily: number;
    remainingMonthly: number;
    isLimitExceeded?: boolean;
    isLimitWarning?: boolean;
    reason?: string;
    numberItem?: WalletNumberItem;
  } {
    const wallet = this.getStoreWallets().find(w => w.id === walletIdOrName || w.name === walletIdOrName);
    if (!wallet || !wallet.numbers || wallet.numbers.length === 0) {
      return { allowed: true, remainingDaily: 999999, remainingMonthly: 999999 };
    }
    const num = wallet.numbers.find(n => n.id === numberIdOrPhone || n.phoneNumber === numberIdOrPhone);
    if (!num) {
      return { allowed: true, remainingDaily: 999999, remainingMonthly: 999999 };
    }
    if (num.status === 'frozen') {
      return {
        allowed: false,
        reason: `🔒 الرقم (${num.phoneNumber}) مجمد إدارياً وموقوف عن أي عمليات.`,
        isLimitExceeded: false,
        remainingDaily: 0,
        remainingMonthly: 0,
        numberItem: num
      };
    }
    if (operationType === 'receive') {
      const dailyLimit = num.dailyLimit || 30000;
      const monthlyLimit = num.monthlyLimit || 200000;
      const dailyReceived = num.dailyReceived || 0;
      const monthlyReceived = num.monthlyReceived || 0;
      const remDaily = Math.max(0, dailyLimit - dailyReceived);
      const remMonthly = Math.max(0, monthlyLimit - monthlyReceived);

      if (amount > 0 && dailyReceived + amount > dailyLimit) {
        return {
          allowed: false,
          isLimitExceeded: true,
          reason: `⛔ تم تجاوز حد الاستقبال اليومي للرقم (${num.phoneNumber})! المتبقي المسموح به اليوم: ${remDaily} ج (المطلوب: ${amount} ج).`,
          remainingDaily: remDaily,
          remainingMonthly: remMonthly,
          numberItem: num
        };
      }
      if (amount > 0 && monthlyReceived + amount > monthlyLimit) {
        return {
          allowed: false,
          isLimitExceeded: true,
          reason: `⛔ تم تجاوز حد الاستقبال الشهري للرقم (${num.phoneNumber})! المتبقي المسموح به هذا الشهر: ${remMonthly} ج (المطلوب: ${amount} ج).`,
          remainingDaily: remDaily,
          remainingMonthly: remMonthly,
          numberItem: num
        };
      }
      return {
        allowed: true,
        isLimitWarning: (monthlyReceived + amount) / monthlyLimit >= 0.8 || (dailyReceived + amount) / dailyLimit >= 0.8,
        remainingDaily: Math.max(0, remDaily - amount),
        remainingMonthly: Math.max(0, remMonthly - amount),
        numberItem: num
      };
    } else {
      const dailySendLimit = num.dailySendLimit || 30000;
      const monthlySendLimit = num.monthlySendLimit || 200000;
      const dailySent = num.dailySent || 0;
      const monthlySent = num.monthlySent || 0;
      const remDaily = Math.max(0, dailySendLimit - dailySent);
      const remMonthly = Math.max(0, monthlySendLimit - monthlySent);

      if (amount > 0 && dailySent + amount > dailySendLimit) {
        return {
          allowed: false,
          isLimitExceeded: true,
          reason: `⛔ تم تجاوز حد الإرسال اليومي للرقم (${num.phoneNumber})! المتبقي المسموح بإرساله اليوم: ${remDaily} ج.`,
          remainingDaily: remDaily,
          remainingMonthly: remMonthly,
          numberItem: num
        };
      }
      if (amount > 0 && monthlySent + amount > monthlySendLimit) {
        return {
          allowed: false,
          isLimitExceeded: true,
          reason: `⛔ تم تجاوز حد الإرسال الشهري للرقم (${num.phoneNumber})! المتبقي المسموح بإرساله هذا الشهر: ${remMonthly} ج.`,
          remainingDaily: remDaily,
          remainingMonthly: remMonthly,
          numberItem: num
        };
      }
      return {
        allowed: true,
        remainingDaily: Math.max(0, remDaily - amount),
        remainingMonthly: Math.max(0, remMonthly - amount),
        numberItem: num
      };
    }
  }

  public checkProductAvailability(product: GameProduct, requestedUnits: number = 1): {
    isAvailable: boolean;
    availableUnits: number;
    message: string;
    reason?: string;
  } {
    if (product.isActive === false) {
      return {
        isAvailable: false,
        availableUnits: 0,
        message: product.disabledReason || 'المنتج غير متاح حالياً',
        reason: product.disabledReason || 'المنتج غير متاح حالياً'
      };
    }
    if (product.availableQuantity !== undefined && product.availableQuantity !== null && product.availableQuantity < requestedUnits) {
      return {
        isAvailable: false,
        availableUnits: product.availableQuantity,
        message: 'الكمية المطلوبة غير متوفرة بالمخزون',
        reason: 'نفاد المخزون'
      };
    }
    const evalResult = JKRWalletEngine.evaluateProductWalletAvailability(product, requestedUnits);
    if (evalResult.isAvailable) {
      return {
        isAvailable: true,
        availableUnits: product.availableQuantity ?? 999999,
        message: 'المنتج متاح'
      };
    } else {
      return {
        isAvailable: false,
        availableUnits: 0,
        message: evalResult.reason || 'المحافظ المرتبطة بالمنتج غير متاحة',
        reason: evalResult.reason || 'المحافظ المرتبطة بالمنتج غير متاحة'
      };
    }
  }

  public getStoreWallets(): StoreWallet[] {
    const wallets = this.getItem<StoreWallet[]>(STORAGE_KEYS.STORE_WALLETS, initialStoreWallets);

    // Guaranteed System Wallets (محافظ الأرباح والنظام الأساسية)
    const systemWalletTemplates: StoreWallet[] = [
      {
        id: 'w_cashback',
        name: 'محفظة الكاش باك المجمعة (Cashback System)',
        type: 'trust',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'CASHBACK-SYSTEM',
        isSystemWallet: true,
        systemType: 'cashback',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية مخصصة لمزامنة أرصدة وحركات الكاش باك المكتسبة والمستردة للعملاء',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-08-29T12:00:00Z'
      },
      {
        id: 'w_referrals',
        name: 'محفظة الإحالات والعمولات (Referral System)',
        type: 'trust',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'REFERRALS-SYSTEM',
        isSystemWallet: true,
        systemType: 'referrals',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية مخصصة لاحتساب وتخزين عمولات شركاء النجاح والإحالات',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-08-29T12:00:00Z'
      },
      {
        id: 'w_trust',
        name: 'محفظة الديون والأمانات (الأرصدة المعلقة)',
        type: 'trust',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'TRUST-ESCROW',
        isSystemWallet: true,
        systemType: 'trust',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية للأمانات والديون والفوائض المعلقة وحجوزات العملاء',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-08-29T12:00:00Z'
      },
      {
        id: 'w_profits',
        name: 'محفظة الأرباح الصافية (تصفية شهرية)',
        type: 'profits',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'NET-PROFITS-SAFE',
        isSystemWallet: true,
        systemType: 'profits',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية لتسجيل وتجميع صافي الأرباح المحققة من كل تذكرة بيع وشحن تلقائياً',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-08-29T12:00:00Z'
      },
      {
        id: 'w_operating_expenses',
        name: 'محفظة مصاريف التشغيل والسيرفرات',
        type: 'trust',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'OPERATING-EXPENSES',
        isSystemWallet: true,
        systemType: 'operating_expenses',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية لاحتساب وتجميع مصاريف التشغيل والسيرفرات والرسوم المقتطعة من التذاكر والعمليات',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-08-29T12:00:00Z'
      }
    ];

    let modified = false;
    for (const sysW of systemWalletTemplates) {
      const exists = wallets.some(w => w.id === sysW.id || (w.isSystemWallet && w.systemType === sysW.systemType));
      if (!exists) {
        wallets.push(sysW);
        modified = true;
      }
    }

    // Dynamic Live Sync: Retail Customer System Wallets (w_cashback, w_referrals, w_profits, w_trust)
    try {
      const allCust = this.getCustomers();
      const allTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);

      // 1. w_cashback (Retail Only - strictly isolated from dealers per GEMINI.md)
      const cbWallet = wallets.find(w => w.id === 'w_cashback' || w.systemType === 'cashback');
      if (cbWallet) {
        const totalCustBalance = allCust.reduce((sum, c) => sum + (Number(c.cashbackBalance) || 0), 0);
        const totalCbBalance = Math.round(totalCustBalance * 100) / 100;

        const totalCustEarned = allCust.reduce((sum, c) => {
          const earned = Number(c.totalCashbackEarned) || 0;
          const current = Number(c.cashbackBalance) || 0;
          return sum + Math.max(earned, current);
        }, 0);
        const totalGranted = Math.round(totalCustEarned * 100) / 100;
        const totalRedeemed = Math.max(0, Math.round((totalGranted - totalCbBalance) * 100) / 100);

        if (
          cbWallet.balance !== totalCbBalance ||
          cbWallet.totalReceived !== totalGranted ||
          cbWallet.totalWithdrawn !== totalRedeemed
        ) {
          cbWallet.balance = totalCbBalance;
          cbWallet.totalReceived = totalGranted;
          cbWallet.monthlyIncome = totalGranted;
          cbWallet.totalWithdrawn = totalRedeemed;
          cbWallet.monthlyWithdrawn = totalRedeemed;
          modified = true;
        }
      }

      // 2. w_referrals (Retail Only)
      const refWallet = wallets.find(w => w.id === 'w_referrals' || w.systemType === 'referrals');
      if (refWallet) {
        const totalCustRef = Math.round(allCust.reduce((sum, c) => sum + (Number(c.referralWalletBalance) || 0), 0) * 100) / 100;
        const totalCustRefEarned = Math.round(allCust.reduce((sum, c) => {
          const earned = Number(c.totalReferralCommissionEarned) || 0;
          const current = Number(c.referralWalletBalance) || 0;
          return sum + Math.max(earned, current);
        }, 0) * 100) / 100;
        const totalRefRedeemed = Math.max(0, Math.round((totalCustRefEarned - totalCustRef) * 100) / 100);

        if (
          refWallet.balance !== totalCustRef ||
          refWallet.totalReceived !== totalCustRefEarned ||
          refWallet.totalWithdrawn !== totalRefRedeemed
        ) {
          refWallet.balance = totalCustRef;
          refWallet.totalReceived = totalCustRefEarned;
          refWallet.monthlyIncome = totalCustRefEarned;
          refWallet.totalWithdrawn = totalRefRedeemed;
          refWallet.monthlyWithdrawn = totalRefRedeemed;
          modified = true;
        }
      }

      // 3. w_profits (Retail Completed Tickets Only)
      const profitsWallet = wallets.find(w => w.id === 'w_profits' || w.systemType === 'profits' || w.type === 'profits');
      if (profitsWallet) {
        const retailCompletedTickets = allTickets.filter(t => t.status === 'completed');
        const totalRetailProfit = Math.max(0, Math.round(
          retailCompletedTickets.reduce((sum, t) => sum + (Number(t.netProfit !== undefined ? t.netProfit : t.totalProfitMargin) || 0), 0) * 100
        ) / 100);
        if (profitsWallet.balance !== totalRetailProfit || profitsWallet.totalReceived !== totalRetailProfit) {
          profitsWallet.balance = totalRetailProfit;
          profitsWallet.totalReceived = totalRetailProfit;
          profitsWallet.monthlyIncome = totalRetailProfit;
          modified = true;
        }
      }

      // 4. w_trust (Retail Customer Net Account Balances + Pending Reservations)
      const trustWallet = wallets.find(w => w.id === 'w_trust' || w.systemType === 'trust');
      if (trustWallet) {
        const totalCustNetBalance = allCust.reduce((sum, c) => sum + (Number(c.accountBalance) || 0), 0);
        const retailPendingReservations = allTickets.filter(t => (t.isReservation || t.operationMode === 'reservation') && t.status !== 'completed' && t.status !== 'canceled' && t.status !== 'refunded');
        const totalRetailReservationHeld = retailPendingReservations.reduce((sum, t) => sum + (Number(t.reservationTrustHeld !== undefined ? t.reservationTrustHeld : t.receivedAmount || t.requiredAmount || 0)), 0);
        const totalRetailTrust = Math.max(0, Math.round((totalCustNetBalance + totalRetailReservationHeld) * 100) / 100);
        if (trustWallet.balance !== totalRetailTrust || trustWallet.totalReceived !== totalRetailTrust) {
          trustWallet.balance = totalRetailTrust;
          trustWallet.totalReceived = totalRetailTrust;
          modified = true;
        }
      }
    } catch (err) {
      console.warn('Error syncing retail system wallets with customer accounts:', err);
    }

    // Dynamic Live Sync: Sync Operating Expenses System Wallet (w_operating_expenses) with total tickets fixed costs
    try {
      const expWallet = wallets.find(w => w.id === 'w_operating_expenses' || w.systemType === 'operating_expenses');
      if (expWallet) {
        const allTickets = [...this.getTickets(), ...this.getDealerTickets()];
        const totalExpenses = allTickets.reduce((sum, t) => {
          const exp = t.fixedCostAmount !== undefined
            ? Number(t.fixedCostAmount)
            : Number(t.pricingSnapshot?.fixedCostEGP || 0);
          return sum + (exp || 0);
        }, 0);
        const roundedExpenses = Math.round(totalExpenses * 100) / 100;

        if (roundedExpenses > 0) {
          if ((expWallet.totalReceived || 0) < roundedExpenses || (expWallet.balance || 0) < roundedExpenses) {
            expWallet.balance = Math.max(expWallet.balance || 0, roundedExpenses);
            expWallet.totalReceived = Math.max(expWallet.totalReceived || 0, roundedExpenses);
            modified = true;
          }
        }
      }
    } catch (e) {
      console.warn('Error syncing operating expenses system wallet:', e);
    }

    // Auto reset limits based on Egypt Cairo Time (Daily after 12:00 AM midnight, Monthly on 1st of month)
    try {
      const egyptFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const egyptDateStr = egyptFormatter.format(new Date()); // "YYYY-MM-DD"
      const egyptMonthStr = egyptDateStr.slice(0, 7); // "YYYY-MM"

      for (const w of wallets) {
        if (w.type === 'operating') {
          let walletReset = false;
          // 1. Daily Limit Reset (Midnight Cairo time)
          if (w.lastDailyResetDate && w.lastDailyResetDate !== egyptDateStr) {
            w.dailyIncome = 0;
            w.dailySent = 0;
            if (w.numbers && w.numbers.length > 0) {
              for (const n of w.numbers) {
                n.dailyReceived = 0;
                n.dailySent = 0;
                if (n.status === 'limit_reached' && (!n.monthlyLimit || (n.monthlyReceived || 0) < n.monthlyLimit)) {
                  n.status = 'active';
                }
              }
            }
            w.lastDailyResetDate = egyptDateStr;
            walletReset = true;
          } else if (!w.lastDailyResetDate) {
            w.lastDailyResetDate = egyptDateStr;
            walletReset = true;
          }

          // 2. Monthly Limit Reset (1st day of new month)
          if (w.lastMonthlyResetMonth && w.lastMonthlyResetMonth !== egyptMonthStr) {
            w.monthlyIncome = 0;
            w.monthlySent = 0;
            w.monthlyWithdrawn = 0;
            if (w.numbers && w.numbers.length > 0) {
              for (const n of w.numbers) {
                n.monthlyReceived = 0;
                n.monthlySent = 0;
                n.monthlyWithdrawn = 0;
                if (n.status === 'limit_reached') {
                  n.status = 'active';
                }
              }
            }
            w.lastMonthlyResetMonth = egyptMonthStr;
            walletReset = true;
          } else if (!w.lastMonthlyResetMonth) {
            w.lastMonthlyResetMonth = egyptMonthStr;
            walletReset = true;
          }

          if (walletReset) {
            modified = true;
          }
        }
      }
    } catch (e) {
      console.error('Error checking wallet limit resets:', e);
    }

    if (modified) {
      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);
    }

    // Ensure non-system operating wallets reflect the data of their preferred number
    wallets.forEach(w => {
      if (w.numbers && w.numbers.length > 0) {
        w.numbers.forEach(n => {
          if (n.accountHolderName && n.accountHolderName.includes('الرئيسي')) {
            n.accountHolderName = n.accountHolderName
              .replace(/\(?\s*الرقم الرئيسي\s*\)?/gi, '')
              .replace(/\(?\s*الرئيسي\s*\)?/gi, '')
              .replace(/[-–—]\s*الرئيسي/gi, '')
              .trim();
          }
        });
      }
      if (!w.isSystemWallet && w.numbers && w.numbers.length > 0) {
        const pref = w.numbers.find(n => n.isPrimary) || w.numbers[0];
        if (pref) {
          w.accountNumber = pref.phoneNumber;
          (w as any).primaryNumberId = pref.id;
          if (pref.dailyLimit !== undefined) w.dailyLimit = pref.dailyLimit;
          if (pref.monthlyLimit !== undefined) w.monthlyLimit = pref.monthlyLimit;
        }
        // Operating wallet balance MUST reflect the aggregate balance of all its active sub-numbers/lines
        const totalNumBalance = w.numbers.reduce((sum, n) => sum + (n.currentBalance || 0), 0);
        w.balance = Math.round(totalNumBalance * 100) / 100;
        w.dailyIncome = Math.round(w.numbers.reduce((sum, n) => sum + (n.dailyReceived || 0), 0) * 100) / 100;
        w.monthlyIncome = Math.round(w.numbers.reduce((sum, n) => sum + (n.monthlyReceived || 0), 0) * 100) / 100;
        w.totalReceived = Math.round(w.numbers.reduce((sum, n) => sum + (n.totalReceived || 0), 0) * 100) / 100;
        w.totalWithdrawn = Math.round(w.numbers.reduce((sum, n) => sum + (n.totalSent || n.monthlyWithdrawn || 0), 0) * 100) / 100;
      }
    });

    return wallets;
  }

  public saveStoreWallet(
    wallet: StoreWallet,
    user?: { id?: string; name?: string; fullName?: string; role?: string },
    reason?: string
  ): void {
    const wallets = this.getStoreWallets();
    const index = wallets.findIndex(w => w.id === wallet.id);

    if (!wallet.isSystemWallet && wallet.numbers && wallet.numbers.length > 0) {
      const pref = wallet.numbers.find(n => n.isPrimary) || wallet.numbers[0];
      if (pref) {
        wallet.accountNumber = pref.phoneNumber;
        (wallet as any).primaryNumberId = pref.id;
        if (pref.dailyLimit !== undefined) wallet.dailyLimit = pref.dailyLimit;
        if (pref.monthlyLimit !== undefined) wallet.monthlyLimit = pref.monthlyLimit;
      }
      const totalNumBalance = wallet.numbers.reduce((sum, n) => sum + (n.currentBalance || 0), 0);
      wallet.balance = Math.round(totalNumBalance * 100) / 100;
      wallet.dailyIncome = Math.round(wallet.numbers.reduce((sum, n) => sum + (n.dailyReceived || 0), 0) * 100) / 100;
      wallet.monthlyIncome = Math.round(wallet.numbers.reduce((sum, n) => sum + (n.monthlyReceived || 0), 0) * 100) / 100;
      wallet.totalReceived = Math.round(wallet.numbers.reduce((sum, n) => sum + (n.totalReceived || 0), 0) * 100) / 100;
      wallet.totalWithdrawn = Math.round(wallet.numbers.reduce((sum, n) => sum + (n.totalSent || n.monthlyWithdrawn || 0), 0) * 100) / 100;
    }

    const newBalance = Number(wallet.balance) || 0;
    const isNew = index < 0;
    let oldBalance = 0;

    if (isNew) {
      if (newBalance > 0) {
        wallet.totalReceived = (wallet.totalReceived || 0) + newBalance;
        wallet.monthlyIncome = (wallet.monthlyIncome || 0) + newBalance;
        wallet.dailyIncome = (wallet.dailyIncome || 0) + newBalance;
      }
      wallets.push({ ...wallet, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    } else {
      oldBalance = Number(wallets[index].balance) || 0;
      const diff = newBalance - oldBalance;
      if (diff > 0) {
        wallet.totalReceived = (wallets[index].totalReceived || 0) + diff;
        wallet.monthlyIncome = (wallets[index].monthlyIncome || 0) + diff;
        wallet.dailyIncome = (wallets[index].dailyIncome || 0) + diff;
      } else if (diff < 0) {
        const absDiff = Math.abs(diff);
        wallet.totalWithdrawn = (wallets[index].totalWithdrawn || 0) + absDiff;
        wallet.monthlyWithdrawn = (wallets[index].monthlyWithdrawn || 0) + absDiff;
        wallet.dailySent = (wallets[index].dailySent || 0) + absDiff;
      }
      wallets[index] = { ...wallet, updatedAt: new Date().toISOString() };
    }
    this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

    // Ledger reconciliation for balance changes
    if (isNew && newBalance > 0 && !wallet.isSystemWallet) {
      this.addStoreWalletTransaction({
        walletId: wallet.id,
        walletName: wallet.name,
        type: 'deposit',
        amount: newBalance,
        currency: wallet.currency || 'EGP',
        balanceBefore: 0,
        balanceAfter: newBalance,
        description: `رصيد افتتاحي عند إنشاء المحفظة [${wallet.name}]`,
        referenceNumber: `INIT-${Date.now().toString().slice(-4)}`,
        performedBy: user ? { id: user.id || 'usr', name: user.fullName || user.name || 'المسؤول', role: user.role || 'admin' } : undefined,
        sourceType: 'opening_balance',
        notes: reason || 'رصيد افتتاحي معتمد'
      });
    } else if (!isNew && newBalance !== oldBalance && !wallet.isSystemWallet) {
      const diff = newBalance - oldBalance;
      const absDiff = Math.abs(diff);
      const isIncrease = diff > 0;
      this.addStoreWalletTransaction({
        walletId: wallet.id,
        walletName: wallet.name,
        type: isIncrease ? 'deposit' : 'withdrawal',
        amount: absDiff,
        currency: wallet.currency || 'EGP',
        balanceBefore: oldBalance,
        balanceAfter: newBalance,
        description: `تسوية رصيد (${isIncrease ? 'إضافة' : 'خصم'}) للمحفظة [${wallet.name}]: ${reason || 'تعديل يدوي للرصيد'}`,
        referenceNumber: `ADJ-${Date.now().toString().slice(-4)}`,
        performedBy: user ? { id: user.id || 'usr', name: user.fullName || user.name || 'المسؤول', role: user.role || 'admin' } : undefined,
        sourceType: 'adjustment',
        notes: reason || 'تعديل بيانات المحفظة ورصيدها'
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated', { detail: { walletId: wallet.id } }));
    }
  }

  public deleteStoreWallet(
    walletId: string,
    user?: { id?: string; name?: string; fullName?: string; role?: string },
    reason?: string
  ): boolean {
    const wallets = this.getStoreWallets();
    const target = wallets.find(w => w.id === walletId);
    if (!target) return false;
    if (
      target.isSystemWallet ||
      ['w_cashback', 'w_referrals', 'w_trust', 'w_profits', 'w_operating_expenses'].includes(target.id) ||
      target.type === 'profits' ||
      target.type === 'trust' ||
      (target as any).systemType
    ) {
      return false;
    }

    if (target.balance > 0) {
      this.addStoreWalletTransaction({
        walletId: target.id,
        walletName: target.name,
        type: 'withdrawal',
        amount: target.balance,
        currency: target.currency || 'EGP',
        balanceBefore: target.balance,
        balanceAfter: 0,
        description: `تصفية رصيد المحفظة بالكامل عند حذفها [${target.name}]`,
        referenceNumber: `DEL-${Date.now().toString().slice(-4)}`,
        performedBy: user ? { id: user.id || 'usr', name: user.fullName || user.name || 'المسؤول', role: user.role || 'admin' } : undefined,
        sourceType: 'adjustment',
        notes: reason || 'حذف المحفظة من إدارة المحافظ وتصفية رصيدها'
      });
    }

    const filtered = wallets.filter(w => w.id !== walletId);
    this.setItem(STORAGE_KEYS.STORE_WALLETS, filtered);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated', { detail: { walletId } }));
    }
    return true;
  }

  public transferWalletFunds(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    transferFees: number,
    notes?: string,
    user?: { id: string; name: string; role: string },
    exchangeRateUsed?: number,
    targetCurrency?: 'EGP' | 'USD'
  ): boolean {
    const transferKey = `${fromWalletId}_${toWalletId}`;
    if (this.inFlightTransfers.has(transferKey)) {
      return false;
    }
    this.inFlightTransfers.add(transferKey);

    try {
      const wallets = this.getStoreWallets();
      const fromW = wallets.find(x => x.id === fromWalletId);
      const toW = wallets.find(x => x.id === toWalletId);

      if (!fromW || !toW || amount <= 0) return false;

      const totalDeducted = amount + (transferFees || 0);
      if (fromW.balance < totalDeducted) return false;

      const fromBefore = fromW.balance;
      const toBefore = toW.balance;

      fromW.balance -= totalDeducted;
      fromW.monthlyWithdrawn = (fromW.monthlyWithdrawn || 0) + totalDeducted;
      fromW.totalWithdrawn = (fromW.totalWithdrawn || 0) + totalDeducted;
      fromW.updatedAt = new Date().toISOString();

      const rate = exchangeRateUsed || 1;
      let addedAmount = amount;
      if (fromW.currency === 'EGP' && toW.currency === 'USD') {
        addedAmount = amount / rate;
      } else if (fromW.currency === 'USD' && toW.currency === 'EGP') {
        addedAmount = amount * rate;
      }

      toW.balance += addedAmount;
      toW.dailyIncome = (toW.dailyIncome || 0) + addedAmount;
      toW.monthlyIncome = (toW.monthlyIncome || 0) + addedAmount;
      toW.totalReceived = (toW.totalReceived || 0) + addedAmount;
      toW.updatedAt = new Date().toISOString();

      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

      const txIdOut = `TRF-OUT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const txIdIn = `TRF-IN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      this.addStoreWalletTransaction({
        walletId: fromW.id,
        walletName: fromW.name,
        type: 'transfer_out',
        amount: totalDeducted,
        currency: fromW.currency,
        balanceBefore: fromBefore,
        balanceAfter: fromW.balance,
        description: `تحويل صادر إلى محفظة [${toW.name}] بمبلغ ${amount} ${fromW.currency}${transferFees ? ` (رسوم: ${transferFees})` : ''}`,
        referenceNumber: txIdOut,
        relatedWalletId: toW.id,
        relatedWalletName: toW.name,
        performedBy: user,
        notes,
        sourceType: 'transfer'
      });

      this.addStoreWalletTransaction({
        walletId: toW.id,
        walletName: toW.name,
        type: 'transfer_in',
        amount: addedAmount,
        currency: toW.currency,
        balanceBefore: toBefore,
        balanceAfter: toW.balance,
        description: `تحويل وارد من محفظة [${fromW.name}] بمبلغ ${addedAmount} ${toW.currency}`,
        referenceNumber: txIdIn,
        relatedWalletId: fromW.id,
        relatedWalletName: fromW.name,
        performedBy: user,
        notes,
        sourceType: 'transfer'
      });

      return true;
    } finally {
      this.inFlightTransfers.delete(transferKey);
    }
  }

  // Store Wallet Ledger & Transactions Engine
  public getStoreWalletTransactions(walletId?: string): StoreWalletTransaction[] {
    const all = this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
    if (walletId && walletId !== 'all') {
      const explicit = all.filter(t => t.walletId === walletId);
      if (walletId === 'w_cashback') {
        const allCbUnifiedTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions)
          .filter(t => t.walletType === 'cashback');
        const allCust = this.getCustomers();
        const mappedUnifiedTxs: StoreWalletTransaction[] = [];
        for (const u of allCbUnifiedTxs) {
          // De-duplicate: If an explicit transaction already represents this order or ID, skip
          const alreadyInExplicit = explicit.some(
            e => e.id === u.id || (u.orderNumber && (e.referenceNumber === u.orderNumber || e.sourceTicketNumber === u.orderNumber))
          );
          if (alreadyInExplicit) continue;

          const cust = allCust.find(c => c.id === u.customerId);
          const isDeduction = u.type === 'redeemed' || u.type === 'debit';
          mappedUnifiedTxs.push({
            id: u.id,
            walletId: 'w_cashback',
            walletName: 'محفظة الكاش باك المجمعة (Cashback System)',
            type: (isDeduction ? 'withdrawal' : 'cashback') as any,
            amount: Math.abs(u.amount),
            currency: 'EGP',
            balanceBefore: isDeduction ? u.balanceAfter + Math.abs(u.amount) : Math.max(0, u.balanceAfter - Math.abs(u.amount)),
            balanceAfter: u.balanceAfter,
            description: u.operationName || (isDeduction ? `استبدال واستخدام كاش باك في تذكرة #${u.orderNumber || ''}` : `إيداع كاش باك للعميل ${cust?.name || ''}`),
            referenceNumber: u.orderNumber,
            sourceTicketNumber: u.orderNumber,
            customerName: cust?.name,
            sourceType: 'cashback',
            sourceName: 'كاش باك نظامي',
            notes: u.notes,
            createdAt: u.createdAt
          });
        }

        // Add initial or current balance entries for customers who hold cashback
        for (const cust of allCust) {
          if (
            cust.cashbackBalance &&
            cust.cashbackBalance > 0 &&
            !allCbUnifiedTxs.some(t => t.customerId === cust.id) &&
            !explicit.some(e => e.customerName === cust.name && e.sourceType === 'cashback')
          ) {
            mappedUnifiedTxs.push({
              id: `cb_init_${cust.id}`,
              walletId: 'w_cashback',
              walletName: 'محفظة الكاش باك المجمعة (Cashback System)',
              type: 'cashback' as any,
              amount: Math.abs(cust.cashbackBalance),
              currency: 'EGP',
              balanceBefore: 0,
              balanceAfter: cust.cashbackBalance,
              description: `رصيد كاش باك مرحل بحساب العميل: ${cust.name}`,
              customerName: cust.name,
              sourceType: 'cashback',
              sourceName: 'رصيد مرحل',
              createdAt: cust.createdAt || new Date().toISOString()
            });
          }
        }

        const combined = [...explicit, ...mappedUnifiedTxs];
        const seen = new Set<string>();
        const seenRefs = new Set<string>();
        return combined.filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          const ref = t.referenceNumber || t.sourceTicketNumber;
          if (ref && (t.type === 'cashback' || t.type === 'deposit')) {
            const key = `${t.walletId}_${ref}_${t.type}`;
            if (seenRefs.has(key)) return false;
            seenRefs.add(key);
          }
          return true;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return explicit;
    }
    return all;
  }

  public addStoreWalletTransaction(tx: Omit<StoreWalletTransaction, 'id' | 'createdAt'>): StoreWalletTransaction {
    const all = this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
    const newTx: StoreWalletTransaction = {
      ...tx,
      id: 'wtx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString()
    };
    all.unshift(newTx);
    this.setItem(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, all);
    return newTx;
  }

  public depositStoreWalletFunds(
    walletId: string,
    amount: number,
    description: string,
    referenceNumber?: string,
    user?: { id: string; name: string; role: string },
    notes?: string,
    sourceType: StoreWalletTransactionSourceType = 'manual_deposit',
    sourceName?: string,
    numberIdOrPhone?: string
  ): boolean {
    const wallets = this.getStoreWallets();
    const w = wallets.find(x => x.id === walletId);
    if (!w || amount <= 0) return false;

    const balanceBefore = w.balance;
    w.balance += amount;
    w.dailyIncome = (w.dailyIncome || 0) + amount;
    w.monthlyIncome = (w.monthlyIncome || 0) + amount;
    w.totalReceived = (w.totalReceived || 0) + amount;
    w.updatedAt = new Date().toISOString();

    let targetNum: any = null;
    if (w.numbers && w.numbers.length > 0) {
      targetNum = numberIdOrPhone 
        ? w.numbers.find(n => n.id === numberIdOrPhone || n.phoneNumber === numberIdOrPhone)
        : (w.numbers.find(n => n.isPrimary) || w.numbers[0]);
      if (targetNum) {
        targetNum.currentBalance = (targetNum.currentBalance || 0) + amount;
        targetNum.dailyReceived = (targetNum.dailyReceived || 0) + amount;
        targetNum.monthlyReceived = (targetNum.monthlyReceived || 0) + amount;
        targetNum.totalReceived = (targetNum.totalReceived || 0) + amount;
        targetNum.operationsCount = (targetNum.operationsCount || 0) + 1;
        targetNum.lastUsedAt = new Date().toISOString();
      }
      w.balance = Math.round(w.numbers.reduce((sum, n) => sum + (n.currentBalance || 0), 0) * 100) / 100;
    }

    this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

    this.addStoreWalletTransaction({
      walletId: w.id,
      walletName: w.name,
      walletNumberId: targetNum?.id,
      walletPhoneNumber: targetNum?.phoneNumber,
      type: 'deposit',
      amount,
      currency: w.currency,
      balanceBefore,
      balanceAfter: w.balance,
      description: description || 'إيداع نقدي مباشر بالمحفظة',
      referenceNumber: referenceNumber || `DEP-${Date.now().toString().slice(-4)}`,
      performedBy: user,
      notes,
      sourceType,
      sourceName,
      receivingPhoneNumber: targetNum?.phoneNumber || numberIdOrPhone || w.accountNumber
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated', { detail: { walletId: w.id } }));
    }

    return true;
  }

  public withdrawStoreWalletFunds(
    walletId: string,
    amount: number,
    description: string,
    referenceNumber?: string,
    user?: { id: string; name: string; role: string },
    notes?: string,
    sourceType: StoreWalletTransactionSourceType = 'manual_withdrawal',
    numberIdOrPhone?: string
  ): boolean {
    const wallets = this.getStoreWallets();
    const w = wallets.find(x => x.id === walletId);
    if (!w || amount <= 0 || w.balance < amount) return false;

    let targetNum: any = null;
    if (w.numbers && w.numbers.length > 0) {
      if (numberIdOrPhone) {
        // Targeted withdrawal from specific line/number
        targetNum = w.numbers.find(n => n.id === numberIdOrPhone || n.phoneNumber === numberIdOrPhone);
        if (targetNum) {
          const take = Math.min(amount, targetNum.currentBalance || 0);
          targetNum.currentBalance = Math.max(0, (targetNum.currentBalance || 0) - take);
          targetNum.dailySent = (targetNum.dailySent || 0) + take;
          targetNum.monthlySent = (targetNum.monthlySent || 0) + take;
          targetNum.totalSent = (targetNum.totalSent || 0) + take;
          targetNum.monthlyWithdrawn = (targetNum.monthlyWithdrawn || 0) + take;
          targetNum.operationsCount = (targetNum.operationsCount || 0) + 1;
          targetNum.lastUsedAt = new Date().toISOString();

          let remainder = amount - take;
          if (remainder > 0) {
            for (const n of w.numbers) {
              if (n.id === targetNum.id || (n.currentBalance || 0) <= 0) continue;
              const nTake = Math.min(remainder, n.currentBalance || 0);
              n.currentBalance = Math.max(0, (n.currentBalance || 0) - nTake);
              n.dailySent = (n.dailySent || 0) + nTake;
              n.monthlySent = (n.monthlySent || 0) + nTake;
              n.totalSent = (n.totalSent || 0) + nTake;
              n.monthlyWithdrawn = (n.monthlyWithdrawn || 0) + nTake;
              n.operationsCount = (n.operationsCount || 0) + 1;
              n.lastUsedAt = new Date().toISOString();
              remainder -= nTake;
              if (remainder <= 0) break;
            }
          }
        }
      } else {
        // General withdrawal or Shift Settlement Sweep:
        // Distribute deduction across all sub-numbers/lines so that zero residual/phantom balance remains!
        targetNum = w.numbers.find(n => n.isPrimary) || w.numbers[0];

        if (amount >= w.balance) {
          // Full sweep / zeroing out the wallet completely
          for (const n of w.numbers) {
            const lineBal = n.currentBalance || 0;
            n.currentBalance = 0;
            n.dailySent = (n.dailySent || 0) + lineBal;
            n.monthlySent = (n.monthlySent || 0) + lineBal;
            n.totalSent = (n.totalSent || 0) + lineBal;
            n.monthlyWithdrawn = (n.monthlyWithdrawn || 0) + lineBal;
            if (lineBal > 0) {
              n.operationsCount = (n.operationsCount || 0) + 1;
              n.lastUsedAt = new Date().toISOString();
            }
          }
        } else {
          // Partial withdrawal: deduct starting from primary number, then cascade through remaining numbers
          let remainder = amount;
          if (targetNum && (targetNum.currentBalance || 0) > 0) {
            const take = Math.min(remainder, targetNum.currentBalance);
            targetNum.currentBalance -= take;
            targetNum.dailySent = (targetNum.dailySent || 0) + take;
            targetNum.monthlySent = (targetNum.monthlySent || 0) + take;
            targetNum.totalSent = (targetNum.totalSent || 0) + take;
            targetNum.monthlyWithdrawn = (targetNum.monthlyWithdrawn || 0) + take;
            targetNum.operationsCount = (targetNum.operationsCount || 0) + 1;
            targetNum.lastUsedAt = new Date().toISOString();
            remainder -= take;
          }
          if (remainder > 0) {
            for (const n of w.numbers) {
              if (n.id === targetNum?.id || (n.currentBalance || 0) <= 0) continue;
              const take = Math.min(remainder, n.currentBalance);
              n.currentBalance -= take;
              n.dailySent = (n.dailySent || 0) + take;
              n.monthlySent = (n.monthlySent || 0) + take;
              n.totalSent = (n.totalSent || 0) + take;
              n.monthlyWithdrawn = (n.monthlyWithdrawn || 0) + take;
              n.operationsCount = (n.operationsCount || 0) + 1;
              n.lastUsedAt = new Date().toISOString();
              remainder -= take;
              if (remainder <= 0) break;
            }
          }
        }
      }

      if (
        targetNum && (
          (targetNum.dailySendLimit && targetNum.dailySent >= targetNum.dailySendLimit) ||
          (targetNum.monthlySendLimit && targetNum.monthlySent >= targetNum.monthlySendLimit)
        )
      ) {
        targetNum.status = 'limit_reached';
      }
    }

    const balanceBefore = w.balance;
    if (w.numbers && w.numbers.length > 0) {
      w.balance = Math.round(w.numbers.reduce((sum, n) => sum + (n.currentBalance || 0), 0) * 100) / 100;
    } else {
      w.balance = Math.max(0, Math.round((w.balance - amount) * 100) / 100);
    }
    w.monthlyWithdrawn = (w.monthlyWithdrawn || 0) + amount;
    w.totalWithdrawn = (w.totalWithdrawn || 0) + amount;
    w.dailySent = (w.dailySent || 0) + amount;
    w.monthlySent = (w.monthlySent || 0) + amount;
    w.updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

    this.addStoreWalletTransaction({
      walletId: w.id,
      walletName: w.name,
      walletNumberId: targetNum?.id,
      walletPhoneNumber: targetNum?.phoneNumber,
      type: 'withdrawal',
      amount,
      currency: w.currency,
      balanceBefore,
      balanceAfter: w.balance,
      description: description || 'سحب نقدي من المحفظة',
      referenceNumber: referenceNumber || `WTH-${Date.now().toString().slice(-4)}`,
      performedBy: user,
      notes,
      sourceType,
      senderPhoneNumber: targetNum?.phoneNumber || numberIdOrPhone || w.accountNumber
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated', { detail: { walletId: w.id } }));
    }

    return true;
  }

  public recordWalletReceivingPayment(
    walletIdOrName: string,
    numberIdOrPhone: string | undefined,
    amount: number,
    ticketNumber: string,
    customerName: string,
    user?: { id: string; name: string; role: string },
    extraDetails?: {
      ticketId?: string;
      customerPhone?: string;
      gameName?: string;
      senderPhoneNumber?: string;
      receivingPhoneNumber?: string;
    }
  ): { success: boolean; isLimitExceeded?: boolean; isLimitWarning?: boolean; message?: string } {
    if (!walletIdOrName || amount <= 0) return { success: false };

    // Idempotency guard: prevent duplicate wallet deposit for the same ticket
    if (ticketNumber) {
      const allTx = this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
      const alreadyLogged = allTx.some(
        tx => (tx.referenceNumber === ticketNumber || tx.sourceTicketNumber === ticketNumber) &&
              tx.type === 'deposit' &&
              (tx.sourceType === 'ticket' || tx.description?.includes(ticketNumber))
      );
      if (alreadyLogged) {
        return { success: true, message: 'تم استلام دفعة التذكرة مسبقاً' };
      }
    }

    const wallets = this.getStoreWallets();
    const isSystem = (x: any) =>
      x.isSystemWallet ||
      ['w_profits', 'w_cashback', 'w_referrals', 'w_trust'].includes(x.id) ||
      !!x.systemType ||
      x.type === 'profits' ||
      x.type === 'trust' ||
      x.type === 'inventory';

    // 1. Exact ID or Name match
    let w = wallets.find(x => !isSystem(x) && (x.id === walletIdOrName || x.name === walletIdOrName));

    // 2. Fuzzy match by name, category, or payment gateway (e.g. Vodafone Cash / فودافون كاش / InstaPay)
    if (!w && walletIdOrName) {
      const q = walletIdOrName.trim().toLowerCase();
      w = wallets.find(x => !isSystem(x) && (
        (x.name && x.name.toLowerCase().includes(q)) ||
        (x.category && x.category.toLowerCase().includes(q)) ||
        (q.includes('vodafone') && (x.name.includes('فودافون') || x.category?.includes('فودافون'))) ||
        (q.includes('فودافون') && (x.name.toLowerCase().includes('vodafone') || x.category?.toLowerCase().includes('vodafone'))) ||
        (q.includes('instapay') && (x.name.includes('إنستاباي') || x.category?.includes('إنستاباي'))) ||
        (q.includes('إنستاباي') && (x.name.toLowerCase().includes('instapay') || x.category?.toLowerCase().includes('instapay')))
      ));
    }

    // 3. Fallback to first available active operating wallet
    if (!w) {
      w = wallets.find(x => x.type === 'operating' && !isSystem(x));
    }

    if (!w) return { success: false };

    const balanceBefore = w.balance;
    w.balance += amount;
    w.dailyIncome = (w.dailyIncome || 0) + amount;
    w.monthlyIncome = (w.monthlyIncome || 0) + amount;
    w.totalReceived = (w.totalReceived || 0) + amount;
    w.updatedAt = new Date().toISOString();

    let isLimitExceeded = false;
    let isLimitWarning = false;

    // Check Wallet Monthly & Daily Limit
    if (w.monthlyLimit && (w.monthlyIncome || 0) >= w.monthlyLimit) {
      isLimitExceeded = true;
    } else if (w.monthlyLimit && ((w.monthlyIncome || 0) / w.monthlyLimit) >= 0.8) {
      isLimitWarning = true;
    }
    if (w.dailyLimit && (w.dailyIncome || 0) >= w.dailyLimit) {
      isLimitExceeded = true;
    }

    // If specific number selected
    let targetNumPhone = extraDetails?.receivingPhoneNumber || w.accountNumber || '';
    let autoSwitchedLine = false;
    let newSwitchedLinePhone = '';
    let allLinesExhausted = false;

    if (w.numbers && w.numbers.length > 0) {
      let num = w.numbers.find(n => n.id === numberIdOrPhone || n.phoneNumber === numberIdOrPhone);
      if (!num) {
        num = w.numbers.find(n => n.isPrimary) || w.numbers[0];
      }
      if (num) {
        targetNumPhone = num.phoneNumber;
        num.currentBalance = (num.currentBalance || 0) + amount;
        num.dailyReceived = (num.dailyReceived || 0) + amount;
        num.monthlyReceived = (num.monthlyReceived || 0) + amount;
        num.totalReceived = (num.totalReceived || 0) + amount;
        num.operationsCount = (num.operationsCount || 0) + 1;
        num.lastUsedAt = new Date().toISOString();

        const isDailyExceeded = Boolean(num.dailyLimit && num.dailyReceived >= num.dailyLimit);
        const isMonthlyExceeded = Boolean(num.monthlyLimit && num.monthlyReceived >= num.monthlyLimit);

        if (isDailyExceeded || isMonthlyExceeded) {
          num.status = 'limit_reached';
          isLimitExceeded = true;

          // Auto-switch to next available line during shift
          const nextAvailable = w.numbers.find(
            n => n.id !== num!.id &&
            n.status !== 'frozen' &&
            n.status !== 'disabled' &&
            n.status !== 'limit_reached' &&
            (!n.monthlyLimit || (n.monthlyReceived || 0) < n.monthlyLimit) &&
            (!n.dailyLimit || (n.dailyReceived || 0) < n.dailyLimit)
          );

          if (nextAvailable) {
            w.numbers.forEach(n => { n.isPrimary = (n.id === nextAvailable.id); });
            w.accountNumber = nextAvailable.phoneNumber;
            (w as any).primaryNumberId = nextAvailable.id;
            autoSwitchedLine = true;
            newSwitchedLinePhone = nextAvailable.phoneNumber;

            this.addNotification({
              type: 'warning',
              title: '🔄 تحويل تلقائي لخط الاستقبال',
              message: `استنفد الخط (${num.phoneNumber}) حده أثناء العمل، وقام النظام تلقائياً بالتحويل إلى الخط التالي المتاح: (${nextAvailable.phoneNumber})`,
              metadata: { walletId: w.id, fromPhone: num.phoneNumber, toPhone: nextAvailable.phoneNumber }
            });
          } else {
            allLinesExhausted = true;
            this.addNotification({
              type: 'error',
              title: '🚨 تنبيه أحمر للمالك: نفاد حدود كافة خطوط المحفظة',
              message: `تنبيه عاجل: جميع خطوط استقبال محفظة (${w.name}) وصلت للحد الأقصى بالكامل! يرجى إضافة خط جديد فوراً لتجنب توقف التذاكر.`,
              metadata: { walletId: w.id, targetRole: 'admin', isUrgentOwnerAlert: true }
            });
          }
        } else if (num.monthlyLimit && (num.monthlyReceived / num.monthlyLimit) >= 0.8) {
          isLimitWarning = true;
        }
      }
    }

    this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

    // Record Rich Transaction in Store Wallet Ledger with complete source details
    this.addStoreWalletTransaction({
      walletId: w.id,
      walletName: w.name,
      type: 'deposit',
      amount,
      currency: w.currency,
      balanceBefore,
      balanceAfter: w.balance,
      description: `استلام دفعة تذكرة شحن #${ticketNumber} — عميل: ${customerName}${extraDetails?.gameName ? ` (${extraDetails.gameName})` : ''}${targetNumPhone ? ` • على خط: ${targetNumPhone}` : ''}${extraDetails?.senderPhoneNumber ? ` • من: ${extraDetails.senderPhoneNumber}` : ''}`,
      referenceNumber: ticketNumber,
      sourceType: 'ticket',
      sourceTicketId: extraDetails?.ticketId,
      sourceTicketNumber: ticketNumber,
      customerName,
      customerPhone: extraDetails?.customerPhone,
      gameName: extraDetails?.gameName,
      senderPhoneNumber: extraDetails?.senderPhoneNumber,
      receivingPhoneNumber: targetNumPhone,
      performedBy: user
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated', { detail: { walletId: w.id } }));
    }

    return {
      success: true,
      isLimitExceeded,
      isLimitWarning,
      message: isLimitExceeded
        ? `⚠️ تنبيه: تم استهلاك الحد الأقصى (الـ Limit) للرقم/المحفظة (${w.name})!`
        : undefined
    };
  }

  // Toggle individual phone number freeze state within a wallet
  public toggleWalletNumberFreeze(walletId: string, numberId: string): { success: boolean; isFrozen: boolean } {
    const wallets = this.getStoreWallets();
    const w = wallets.find(x => x.id === walletId);
    if (!w || !w.numbers) return { success: false, isFrozen: false };

    const num = w.numbers.find(n => n.id === numberId || n.phoneNumber === numberId);
    if (!num) return { success: false, isFrozen: false };

    const newFrozen = num.status !== 'frozen';
    num.status = newFrozen ? 'frozen' : 'active';
    w.updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

    return { success: true, isFrozen: newFrozen };
  }

  // -------------------------------------------------------------
  // SYSTEM WALLETS AUTOMATED INTEGRATION (Cashback, Referrals, Profits, Trust)
  // Supports both Retail Customers (w_*) and Wholesale Dealers (mw_*)
  // -------------------------------------------------------------
  public creditCashbackToSystemWallet(amount: number, customerName: string, ticketNumber?: string, isDealer?: boolean): void {
    if (amount <= 0) return;
    if (isDealer) {
      const wallets = this.getDealerWallets();
      const cbWallet = wallets.find(w => w.id === 'mw_cashback' || w.systemType === 'cashback');
      if (cbWallet) {
        if (ticketNumber) {
          const allTx = this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
          const alreadyLogged = allTx.some(
            tx => tx.walletId === cbWallet.id &&
                  (tx.referenceNumber === ticketNumber || tx.sourceTicketNumber === ticketNumber) &&
                  tx.type === 'cashback' &&
                  tx.description?.includes('إيداع')
          );
          if (alreadyLogged) return;
        }

        const before = cbWallet.balance;
        cbWallet.balance = Math.round((cbWallet.balance + amount) * 100) / 100;
        cbWallet.totalReceived = Math.round(((cbWallet.totalReceived || 0) + amount) * 100) / 100;
        cbWallet.updatedAt = new Date().toISOString();
        this.setItem(STORAGE_KEYS.DEALER_WALLETS, wallets);

        this.addStoreWalletTransaction({
          walletId: cbWallet.id,
          walletName: cbWallet.name,
          type: 'cashback',
          amount,
          currency: 'EGP',
          balanceBefore: before,
          balanceAfter: cbWallet.balance,
          description: `إيداع كاش باك تاجر تلقائي [${customerName}]${ticketNumber ? ` عن تذكرة #${ticketNumber}` : ''}`,
          referenceNumber: ticketNumber,
          sourceType: 'cashback',
          sourceName: 'كاش باك تجار نظامي',
          customerName
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dealer_wallets_updated'));
        }
      }
      return;
    }

    const wallets = this.getStoreWallets();
    const cbWallet = wallets.find(w => w.id === 'w_cashback' || w.systemType === 'cashback');
    if (cbWallet) {
      if (ticketNumber) {
        const allTx = this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
        const alreadyLogged = allTx.some(
          tx => tx.walletId === cbWallet.id &&
                (tx.referenceNumber === ticketNumber || tx.sourceTicketNumber === ticketNumber) &&
                tx.type === 'cashback' &&
                tx.description?.includes('إيداع')
        );
        if (alreadyLogged) return;
      }

      const before = cbWallet.balance;
      cbWallet.balance = Math.round((cbWallet.balance + amount) * 100) / 100;
      cbWallet.totalReceived = Math.round(((cbWallet.totalReceived || 0) + amount) * 100) / 100;
      cbWallet.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

      this.addStoreWalletTransaction({
        walletId: cbWallet.id,
        walletName: cbWallet.name,
        type: 'cashback',
        amount,
        currency: 'EGP',
        balanceBefore: before,
        balanceAfter: cbWallet.balance,
        description: `إيداع كاش باك تلقائي للعميل ${customerName}${ticketNumber ? ` عن تذكرة #${ticketNumber}` : ''}`,
        referenceNumber: ticketNumber,
        sourceType: 'cashback',
        sourceName: 'كاش باك نظامي',
        customerName
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      }
    }
  }

  public debitCashbackFromSystemWallet(amount: number, customerName: string, ticketNumber?: string, isDealer?: boolean): void {
    if (amount <= 0) return;
    if (isDealer) {
      const wallets = this.getDealerWallets();
      const cbWallet = wallets.find(w => w.id === 'mw_cashback' || w.systemType === 'cashback');
      if (cbWallet) {
        if (ticketNumber) {
          const allTx = this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
          const alreadyLogged = allTx.some(
            tx => tx.walletId === cbWallet.id &&
                  (tx.referenceNumber === ticketNumber || tx.sourceTicketNumber === ticketNumber) &&
                  (tx.description?.includes('خصم') || tx.description?.includes('استبدال'))
          );
          if (alreadyLogged) return;
        }

        const before = cbWallet.balance;
        cbWallet.balance = Math.max(0, Math.round((cbWallet.balance - amount) * 100) / 100);
        cbWallet.totalWithdrawn = Math.round(((cbWallet.totalWithdrawn || 0) + amount) * 100) / 100;
        cbWallet.updatedAt = new Date().toISOString();
        this.setItem(STORAGE_KEYS.DEALER_WALLETS, wallets);

        this.addStoreWalletTransaction({
          walletId: cbWallet.id,
          walletName: cbWallet.name,
          type: 'withdrawal',
          amount,
          currency: 'EGP',
          balanceBefore: before,
          balanceAfter: cbWallet.balance,
          description: `خصم واستبدال كاش باك تاجر [${customerName}]${ticketNumber ? ` في تذكرة #${ticketNumber}` : ''}`,
          referenceNumber: ticketNumber,
          sourceType: 'cashback',
          sourceName: 'استبدال كاش باك تجار',
          customerName
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dealer_wallets_updated'));
        }
      }
      return;
    }

    const wallets = this.getStoreWallets();
    const cbWallet = wallets.find(w => w.id === 'w_cashback' || w.systemType === 'cashback');
    if (cbWallet) {
      if (ticketNumber) {
        const allTx = this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
        const alreadyLogged = allTx.some(
          tx => tx.walletId === cbWallet.id &&
                (tx.referenceNumber === ticketNumber || tx.sourceTicketNumber === ticketNumber) &&
                (tx.description?.includes('خصم') || tx.description?.includes('استبدال'))
        );
        if (alreadyLogged) return;
      }

      const before = cbWallet.balance;
      cbWallet.balance = Math.max(0, Math.round((cbWallet.balance - amount) * 100) / 100);
      cbWallet.totalWithdrawn = Math.round(((cbWallet.totalWithdrawn || 0) + amount) * 100) / 100;
      cbWallet.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

      this.addStoreWalletTransaction({
        walletId: cbWallet.id,
        walletName: cbWallet.name,
        type: 'withdrawal',
        amount,
        currency: 'EGP',
        balanceBefore: before,
        balanceAfter: cbWallet.balance,
        description: `خصم واستبدال كاش باك للعميل ${customerName}${ticketNumber ? ` في تذكرة #${ticketNumber}` : ''}`,
        referenceNumber: ticketNumber,
        sourceType: 'cashback',
        sourceName: 'استبدال كاش باك',
        customerName
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      }
    }
  }

  public creditReferralToSystemWallet(amount: number, referrerName: string, ticketNumber?: string, isDealer?: boolean): void {
    if (amount <= 0) return;
    if (isDealer) {
      const wallets = this.getDealerWallets();
      const refWallet = wallets.find(w => w.id === 'mw_referrals' || w.systemType === 'referrals');
      if (refWallet) {
        const before = refWallet.balance;
        refWallet.balance = Math.round((refWallet.balance + amount) * 100) / 100;
        refWallet.totalReceived = Math.round(((refWallet.totalReceived || 0) + amount) * 100) / 100;
        refWallet.updatedAt = new Date().toISOString();
        this.setItem(STORAGE_KEYS.DEALER_WALLETS, wallets);

        this.addStoreWalletTransaction({
          walletId: refWallet.id,
          walletName: refWallet.name,
          type: 'adjustment',
          amount,
          currency: 'EGP',
          balanceBefore: before,
          balanceAfter: refWallet.balance,
          description: `إيداع عمولة إحالة تاجر للشريك [${referrerName}]${ticketNumber ? ` عن تذكرة #${ticketNumber}` : ''}`,
          referenceNumber: ticketNumber,
          sourceType: 'referral',
          sourceName: 'عمولة إحالة تجار'
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dealer_wallets_updated'));
        }
      }
      return;
    }

    const wallets = this.getStoreWallets();
    const refWallet = wallets.find(w => w.id === 'w_referrals' || w.systemType === 'referrals');
    if (refWallet) {
      const before = refWallet.balance;
      refWallet.balance = Math.round((refWallet.balance + amount) * 100) / 100;
      refWallet.totalReceived = Math.round(((refWallet.totalReceived || 0) + amount) * 100) / 100;
      refWallet.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

      this.addStoreWalletTransaction({
        walletId: refWallet.id,
        walletName: refWallet.name,
        type: 'adjustment',
        amount,
        currency: 'EGP',
        balanceBefore: before,
        balanceAfter: refWallet.balance,
        description: `إيداع عمولة إحالة تلقائية للشريك ${referrerName}${ticketNumber ? ` عن تذكرة #${ticketNumber}` : ''}`,
        referenceNumber: ticketNumber,
        sourceType: 'referral',
        sourceName: 'عمولة إحالة نظامية'
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      }
    }
  }

  public debitReferralFromSystemWallet(amount: number, referrerName: string, description?: string, isDealer?: boolean): void {
    if (amount <= 0) return;
    if (isDealer) {
      const wallets = this.getDealerWallets();
      const refWallet = wallets.find(w => w.id === 'mw_referrals' || w.systemType === 'referrals');
      if (refWallet) {
        const before = refWallet.balance;
        refWallet.balance = Math.max(0, Math.round((refWallet.balance - amount) * 100) / 100);
        refWallet.totalWithdrawn = Math.round(((refWallet.totalWithdrawn || 0) + amount) * 100) / 100;
        refWallet.updatedAt = new Date().toISOString();
        this.setItem(STORAGE_KEYS.DEALER_WALLETS, wallets);

        this.addStoreWalletTransaction({
          walletId: refWallet.id,
          walletName: refWallet.name,
          type: 'withdrawal',
          amount,
          currency: 'EGP',
          balanceBefore: before,
          balanceAfter: refWallet.balance,
          description: description || `صرف/عكس عمولة إحالة تاجر للشريك ${referrerName}`,
          sourceType: 'referral',
          sourceName: 'صرف عمولة إحالة تجار'
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dealer_wallets_updated'));
        }
      }
      return;
    }

    const wallets = this.getStoreWallets();
    const refWallet = wallets.find(w => w.id === 'w_referrals' || w.systemType === 'referrals');
    if (refWallet) {
      const before = refWallet.balance;
      refWallet.balance = Math.max(0, Math.round((refWallet.balance - amount) * 100) / 100);
      refWallet.totalWithdrawn = Math.round(((refWallet.totalWithdrawn || 0) + amount) * 100) / 100;
      refWallet.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

      this.addStoreWalletTransaction({
        walletId: refWallet.id,
        walletName: refWallet.name,
        type: 'withdrawal',
        amount,
        currency: 'EGP',
        balanceBefore: before,
        balanceAfter: refWallet.balance,
        description: description || `صرف عمولة إحالة للشريك ${referrerName}`,
        sourceType: 'referral',
        sourceName: 'صرف عمولة إحالة'
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      }
    }
  }

  public creditTrustToSystemWallet(amount: number, customerName: string, reason: string, ticketNumber?: string, isDealer?: boolean): void {
    if (amount <= 0) return;
    if (isDealer) {
      const wallets = this.getDealerWallets();
      const trustWallet = wallets.find(w => w.id === 'mw_debts' || w.systemType === 'trust');
      if (trustWallet) {
        const before = trustWallet.balance;
        trustWallet.balance = Math.round((trustWallet.balance + amount) * 100) / 100;
        trustWallet.totalReceived = Math.round(((trustWallet.totalReceived || 0) + amount) * 100) / 100;
        trustWallet.updatedAt = new Date().toISOString();
        this.setItem(STORAGE_KEYS.DEALER_WALLETS, wallets);

        this.addStoreWalletTransaction({
          walletId: trustWallet.id,
          walletName: trustWallet.name,
          type: 'deposit',
          amount,
          currency: 'EGP',
          balanceBefore: before,
          balanceAfter: trustWallet.balance,
          description: `${reason} للتاجر [${customerName}]${ticketNumber ? ` عن تذكرة #${ticketNumber}` : ''}`,
          referenceNumber: ticketNumber,
          sourceType: 'trust',
          sourceName: 'أمانات وأرصدة تجار معلقة',
          customerName
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dealer_wallets_updated'));
        }
      }
      return;
    }

    const wallets = this.getStoreWallets();
    const trustWallet = wallets.find(w => w.id === 'w_trust' || w.systemType === 'trust');
    if (trustWallet) {
      const before = trustWallet.balance;
      trustWallet.balance = Math.round((trustWallet.balance + amount) * 100) / 100;
      trustWallet.totalReceived = Math.round(((trustWallet.totalReceived || 0) + amount) * 100) / 100;
      trustWallet.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

      this.addStoreWalletTransaction({
        walletId: trustWallet.id,
        walletName: trustWallet.name,
        type: 'deposit',
        amount,
        currency: 'EGP',
        balanceBefore: before,
        balanceAfter: trustWallet.balance,
        description: `${reason} للعميل ${customerName}${ticketNumber ? ` عن تذكرة #${ticketNumber}` : ''}`,
        referenceNumber: ticketNumber,
        sourceType: 'trust',
        sourceName: 'أمانات وأرصدة معلقة',
        customerName
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      }
    }
  }

  public debitTrustFromSystemWallet(amount: number, customerName: string, reason: string, ticketNumber?: string, isDealer?: boolean): void {
    if (amount <= 0) return;
    if (isDealer) {
      const wallets = this.getDealerWallets();
      const trustWallet = wallets.find(w => w.id === 'mw_debts' || w.systemType === 'trust');
      if (trustWallet) {
        const before = trustWallet.balance;
        trustWallet.balance = Math.max(0, Math.round((trustWallet.balance - amount) * 100) / 100);
        trustWallet.totalWithdrawn = Math.round(((trustWallet.totalWithdrawn || 0) + amount) * 100) / 100;
        trustWallet.updatedAt = new Date().toISOString();
        this.setItem(STORAGE_KEYS.DEALER_WALLETS, wallets);

        this.addStoreWalletTransaction({
          walletId: trustWallet.id,
          walletName: trustWallet.name,
          type: 'withdrawal',
          amount,
          currency: 'EGP',
          balanceBefore: before,
          balanceAfter: trustWallet.balance,
          description: `${reason} للتاجر [${customerName}]${ticketNumber ? ` عن تذكرة #${ticketNumber}` : ''}`,
          referenceNumber: ticketNumber,
          sourceType: 'trust',
          sourceName: 'صرف أمانات تجار ورصيد معلق',
          customerName
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dealer_wallets_updated'));
        }
      }
      return;
    }

    const wallets = this.getStoreWallets();
    const trustWallet = wallets.find(w => w.id === 'w_trust' || w.systemType === 'trust');
    if (trustWallet) {
      const before = trustWallet.balance;
      trustWallet.balance = Math.max(0, Math.round((trustWallet.balance - amount) * 100) / 100);
      trustWallet.totalWithdrawn = Math.round(((trustWallet.totalWithdrawn || 0) + amount) * 100) / 100;
      trustWallet.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

      this.addStoreWalletTransaction({
        walletId: trustWallet.id,
        walletName: trustWallet.name,
        type: 'withdrawal',
        amount,
        currency: 'EGP',
        balanceBefore: before,
        balanceAfter: trustWallet.balance,
        description: `${reason} للعميل ${customerName}${ticketNumber ? ` عن تذكرة #${ticketNumber}` : ''}`,
        referenceNumber: ticketNumber,
        sourceType: 'trust',
        sourceName: 'صرف أمانات ورصيد معلق',
        customerName
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      }
    }
  }

  public recordProfitOrLossToSystemWallet(
    netProfit: number,
    ticketNumber: string,
    details?: { customerName?: string; gameName?: string; isAdjustment?: boolean; allowMultiple?: boolean; referralAllowance?: number; isDealer?: boolean }
  ): void {
    if (!ticketNumber || netProfit === 0) return;

    if (details?.isDealer) {
      const dealerWallets = this.getDealerWallets();
      const profitWallet = dealerWallets.find(w => w.id === 'mw_profits' || w.systemType === 'profits');
      if (!profitWallet) return;

      if (!details?.isAdjustment && !details?.allowMultiple) {
        const allTx = this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
        const alreadyExists = allTx.some(
          tx => tx.walletId === profitWallet.id && (tx.referenceNumber === ticketNumber || tx.sourceTicketNumber === ticketNumber)
        );
        if (alreadyExists) return;
      }

      const before = profitWallet.balance;
      if (netProfit > 0) {
        profitWallet.balance = Math.round((profitWallet.balance + netProfit) * 100) / 100;
        profitWallet.totalReceived = Math.round(((profitWallet.totalReceived || 0) + netProfit) * 100) / 100;
        profitWallet.updatedAt = new Date().toISOString();
        this.setItem(STORAGE_KEYS.DEALER_WALLETS, dealerWallets);

        this.addStoreWalletTransaction({
          walletId: profitWallet.id,
          walletName: profitWallet.name,
          type: details?.isAdjustment ? 'adjustment' : 'deposit',
          amount: netProfit,
          currency: 'EGP',
          balanceBefore: before,
          balanceAfter: profitWallet.balance,
          description: `ترحيل أرباح تذكرة تاجر #${ticketNumber}${details?.customerName ? ` — تاجر: ${details.customerName}` : ''}${details?.gameName ? ` (${details.gameName})` : ''}`,
          referenceNumber: ticketNumber,
          sourceType: 'ticket',
          sourceName: 'أرباح تذكرة تاجر',
          sourceTicketNumber: ticketNumber,
          customerName: details?.customerName,
          gameName: details?.gameName
        });
      } else {
        const lossAmount = Math.abs(netProfit);
        profitWallet.balance = Math.round((profitWallet.balance - lossAmount) * 100) / 100;
        profitWallet.totalWithdrawn = Math.round(((profitWallet.totalWithdrawn || 0) + lossAmount) * 100) / 100;
        profitWallet.updatedAt = new Date().toISOString();
        this.setItem(STORAGE_KEYS.DEALER_WALLETS, dealerWallets);

        this.addStoreWalletTransaction({
          walletId: profitWallet.id,
          walletName: profitWallet.name,
          type: 'withdrawal',
          amount: lossAmount,
          currency: 'EGP',
          balanceBefore: before,
          balanceAfter: profitWallet.balance,
          description: `تسجيل خسارة تذكرة تاجر #${ticketNumber}${details?.customerName ? ` — تاجر: ${details.customerName}` : ''}`,
          referenceNumber: ticketNumber,
          sourceType: 'ticket',
          sourceName: 'خسارة تذكرة تاجر',
          sourceTicketNumber: ticketNumber,
          customerName: details?.customerName
        });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dealer_wallets_updated'));
      }
      return;
    }

    const wallets = this.getStoreWallets();
    const profitWallet = wallets.find(w => w.id === 'w_profits' || w.systemType === 'profits' || w.type === 'profits');
    if (!profitWallet) return;

    // Strict Idempotency Check: Prevent duplicate logging for the same ticket unless it is an adjustment or explicit multiple
    if (!details?.isAdjustment && !details?.allowMultiple) {
      const allTx = this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
      const alreadyExists = allTx.some(
        tx => tx.walletId === profitWallet.id && (tx.referenceNumber === ticketNumber || tx.sourceTicketNumber === ticketNumber)
      );
      if (alreadyExists) return;
    }

    const before = profitWallet.balance;

    if (netProfit > 0) {
      // 📈 Case: Net Profit
      profitWallet.balance = Math.round((profitWallet.balance + netProfit) * 100) / 100;
      profitWallet.totalReceived = Math.round(((profitWallet.totalReceived || 0) + netProfit) * 100) / 100;
      profitWallet.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

      const refAllowanceTag = (details?.referralAllowance && details.referralAllowance > 0)
        ? ` [بدل إحالة: +${details.referralAllowance} ج.م]`
        : '';

      this.addStoreWalletTransaction({
        walletId: profitWallet.id,
        walletName: profitWallet.name,
        type: details?.isAdjustment ? 'adjustment' : 'deposit',
        amount: netProfit,
        currency: 'EGP',
        balanceBefore: before,
        balanceAfter: profitWallet.balance,
        description: `ترحيل أرباح صافية لتذكرة شحن #${ticketNumber}${details?.customerName ? ` — عميل: ${details.customerName}` : ''}${details?.gameName ? ` (${details.gameName})` : ''}${refAllowanceTag}`,
        referenceNumber: ticketNumber,
        sourceType: 'ticket',
        sourceName: details?.referralAllowance ? 'أرباح تذكرة بيع + بدل إحالة' : 'أرباح تذكرة بيع',
        sourceTicketNumber: ticketNumber,
        customerName: details?.customerName,
        gameName: details?.gameName
      });
    } else {
      // 📉 Case: Net Loss (البيع بخسارة — تقييد الخسارة وخصمها من رصيد الأرباح)
      const lossAmount = Math.abs(netProfit);
      profitWallet.balance = Math.round((profitWallet.balance - lossAmount) * 100) / 100;
      profitWallet.totalWithdrawn = Math.round(((profitWallet.totalWithdrawn || 0) + lossAmount) * 100) / 100;
      profitWallet.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

      this.addStoreWalletTransaction({
        walletId: profitWallet.id,
        walletName: profitWallet.name,
        type: 'withdrawal',
        amount: lossAmount,
        currency: 'EGP',
        balanceBefore: before,
        balanceAfter: profitWallet.balance,
        description: `تسجيل وقيد خسارة بيع لتذكرة شحن #${ticketNumber}${details?.customerName ? ` — عميل: ${details.customerName}` : ''}${details?.gameName ? ` (${details.gameName})` : ''}`,
        referenceNumber: ticketNumber,
        sourceType: 'ticket',
        sourceName: 'خسارة تذكرة بيع',
        sourceTicketNumber: ticketNumber,
        customerName: details?.customerName,
        gameName: details?.gameName
      });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
    }
  }

  public creditProfitToSystemWallet(
    netProfit: number,
    ticketNumber: string,
    details?: { customerName?: string; gameName?: string; isAdjustment?: boolean; allowMultiple?: boolean; isDealer?: boolean }
  ): void {
    this.recordProfitOrLossToSystemWallet(netProfit, ticketNumber, details);
  }

  public recordOperatingExpenseToSystemWallet(
    amount: number,
    ticketNumber?: string,
    reason?: string,
    details?: { customerName?: string; gameName?: string; performedBy?: any; isAdjustment?: boolean; allowMultiple?: boolean }
  ): void {
    if (amount <= 0) return;
    const wallets = this.getStoreWallets();
    const expWallet = wallets.find(
      w => w.id === 'w_operating_expenses' || w.systemType === 'operating_expenses'
    );
    if (!expWallet) return;

    if (ticketNumber && !details?.isAdjustment && !details?.allowMultiple) {
      const allTx = this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
      const alreadyLogged = allTx.some(
        tx => tx.walletId === expWallet.id && (tx.referenceNumber === ticketNumber || tx.sourceTicketNumber === ticketNumber)
      );
      if (alreadyLogged) return;
    }

    const before = expWallet.balance;
    expWallet.balance = Math.round((expWallet.balance + amount) * 100) / 100;
    expWallet.totalReceived = Math.round(((expWallet.totalReceived || 0) + amount) * 100) / 100;
    expWallet.updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

    this.addStoreWalletTransaction({
      walletId: expWallet.id,
      walletName: expWallet.name,
      type: details?.isAdjustment ? 'adjustment' : 'deposit',
      amount,
      currency: 'EGP',
      balanceBefore: before,
      balanceAfter: expWallet.balance,
      description: reason || `مصاريف تشغيل مستقطعة${ticketNumber ? ` عن تذكرة #${ticketNumber}` : ''}${details?.gameName ? ` (${details.gameName})` : ''}`,
      referenceNumber: ticketNumber,
      sourceType: 'operating',
      sourceName: 'مصاريف التشغيل والسيرفرات',
      customerName: details?.customerName,
      performedBy: details?.performedBy
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated', { detail: { walletId: expWallet.id } }));
    }
  }

  public creditOperatingExpensesToSystemWallet(
    amount: number,
    ticketNumber?: string,
    reason?: string,
    details?: { customerName?: string; gameName?: string; performedBy?: any; isAdjustment?: boolean; allowMultiple?: boolean }
  ): void {
    this.recordOperatingExpenseToSystemWallet(amount, ticketNumber, reason, details);
  }

  public debitProfitFromSystemWallet(
    netProfit: number,
    ticketNumber: string,
    details?: { customerName?: string; gameName?: string; performedBy?: any; reason?: string; isDealer?: boolean }
  ): void {
    if (!ticketNumber || netProfit === 0) return;

    if (details?.isDealer) {
      const dealerWallets = this.getDealerWallets();
      const profitWallet = dealerWallets.find(w => w.id === 'mw_profits' || w.systemType === 'profits');
      if (profitWallet) {
        const before = profitWallet.balance;
        if (netProfit > 0) {
          profitWallet.balance = Math.max(0, Math.round((profitWallet.balance - netProfit) * 100) / 100);
          profitWallet.totalReceived = Math.max(0, Math.round(((profitWallet.totalReceived || 0) - netProfit) * 100) / 100);
          profitWallet.totalWithdrawn = Math.round(((profitWallet.totalWithdrawn || 0) + netProfit) * 100) / 100;
          profitWallet.updatedAt = new Date().toISOString();
          this.setItem(STORAGE_KEYS.DEALER_WALLETS, dealerWallets);

          this.addStoreWalletTransaction({
            walletId: profitWallet.id,
            walletName: profitWallet.name,
            type: 'adjustment',
            amount: netProfit,
            currency: 'EGP',
            balanceBefore: before,
            balanceAfter: profitWallet.balance,
            description: details?.reason || `عكس أرباح تذكرة تاجر محذوفة #${ticketNumber}${details?.customerName ? ` — تاجر: ${details.customerName}` : ''}`,
            referenceNumber: ticketNumber,
            sourceType: 'ticket',
            sourceName: 'عكس أرباح تذكرة تاجر',
            sourceTicketNumber: ticketNumber,
            customerName: details?.customerName,
            gameName: details?.gameName,
            performedBy: details?.performedBy
          });
        } else {
          const lossAmount = Math.abs(netProfit);
          profitWallet.balance = Math.round((profitWallet.balance + lossAmount) * 100) / 100;
          profitWallet.totalReceived = Math.round(((profitWallet.totalReceived || 0) + lossAmount) * 100) / 100;
          profitWallet.updatedAt = new Date().toISOString();
          this.setItem(STORAGE_KEYS.DEALER_WALLETS, dealerWallets);

          this.addStoreWalletTransaction({
            walletId: profitWallet.id,
            walletName: profitWallet.name,
            type: 'deposit',
            amount: lossAmount,
            currency: 'EGP',
            balanceBefore: before,
            balanceAfter: profitWallet.balance,
            description: details?.reason || `إلغاء خسارة تذكرة تاجر محذوفة #${ticketNumber}`,
            referenceNumber: ticketNumber,
            sourceType: 'ticket',
            sourceName: 'إلغاء خسارة تذكرة تاجر',
            sourceTicketNumber: ticketNumber,
            customerName: details?.customerName
          });
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dealer_wallets_updated'));
        }
        return;
      }
    }

    const wallets = this.getStoreWallets();
    let profitWallet = wallets.find(w => w.id === 'w_profits' || w.systemType === 'profits' || w.type === 'profits');
    if (!profitWallet) return;

    const before = profitWallet.balance;
    if (netProfit > 0) {
      // Revert profit: withdraw from profit wallet
      profitWallet.balance = Math.max(0, Math.round((profitWallet.balance - netProfit) * 100) / 100);
      profitWallet.totalReceived = Math.max(0, Math.round(((profitWallet.totalReceived || 0) - netProfit) * 100) / 100);
      profitWallet.totalWithdrawn = Math.round(((profitWallet.totalWithdrawn || 0) + netProfit) * 100) / 100;
      profitWallet.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

      this.addStoreWalletTransaction({
        walletId: profitWallet.id,
        walletName: profitWallet.name,
        type: 'adjustment',
        amount: netProfit,
        currency: 'EGP',
        balanceBefore: before,
        balanceAfter: profitWallet.balance,
        description: details?.reason || `عكس وإلغاء أرباح تذكرة محذوفة #${ticketNumber}${details?.customerName ? ` — عميل: ${details.customerName}` : ''}`,
        referenceNumber: ticketNumber,
        sourceType: 'ticket',
        sourceName: 'عكس أرباح تذكرة',
        sourceTicketNumber: ticketNumber,
        customerName: details?.customerName,
        gameName: details?.gameName,
        performedBy: details?.performedBy
      });
    } else {
      // Revert loss: credit back the loss amount
      const lossAmount = Math.abs(netProfit);
      profitWallet.balance = Math.round((profitWallet.balance + lossAmount) * 100) / 100;
      profitWallet.totalReceived = Math.round(((profitWallet.totalReceived || 0) + lossAmount) * 100) / 100;
      profitWallet.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

      this.addStoreWalletTransaction({
        walletId: profitWallet.id,
        walletName: profitWallet.name,
        type: 'deposit',
        amount: lossAmount,
        currency: 'EGP',
        balanceBefore: before,
        balanceAfter: profitWallet.balance,
        description: details?.reason || `إلغاء خسارة تذكرة محذوفة #${ticketNumber}${details?.customerName ? ` — عميل: ${details.customerName}` : ''}`,
        referenceNumber: ticketNumber,
        sourceType: 'ticket',
        sourceName: 'إلغاء خسارة تذكرة',
        sourceTicketNumber: ticketNumber,
        customerName: details?.customerName,
        gameName: details?.gameName,
        performedBy: details?.performedBy
      });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
    }
  }

  public debitOperatingExpenseFromSystemWallet(
    amount: number,
    ticketNumber?: string,
    reason?: string,
    details?: { customerName?: string; gameName?: string; performedBy?: any }
  ): void {
    if (amount <= 0) return;
    const wallets = this.getStoreWallets();
    const expWallet = wallets.find(
      w => w.id === 'w_operating_expenses' || w.systemType === 'operating_expenses'
    );
    if (!expWallet) return;

    const before = expWallet.balance;
    expWallet.balance = Math.max(0, Math.round((expWallet.balance - amount) * 100) / 100);
    expWallet.totalReceived = Math.max(0, Math.round(((expWallet.totalReceived || 0) - amount) * 100) / 100);
    expWallet.totalWithdrawn = Math.round(((expWallet.totalWithdrawn || 0) + amount) * 100) / 100;
    expWallet.updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

    this.addStoreWalletTransaction({
      walletId: expWallet.id,
      walletName: expWallet.name,
      type: 'withdrawal',
      amount,
      currency: 'EGP',
      balanceBefore: before,
      balanceAfter: expWallet.balance,
      description: reason || `عكس مصاريف تشغيل لتذكرة محذوفة #${ticketNumber || ''}`,
      referenceNumber: ticketNumber,
      sourceType: 'operating',
      sourceName: 'عكس مصاريف التشغيل',
      customerName: details?.customerName,
      performedBy: details?.performedBy
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated', { detail: { walletId: expWallet.id } }));
    }
  }

  public cleanupDuplicateProfitTransactions(): void {
    try {
      const allTx = this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
      const wallets = this.getItem<StoreWallet[]>(STORAGE_KEYS.STORE_WALLETS, initialStoreWallets);
      const profitWallet = wallets.find(w => w.id === 'w_profits' || w.systemType === 'profits' || w.type === 'profits');
      if (!profitWallet) return;

      const seenTickets = new Set<string>();
      const cleanedTx: StoreWalletTransaction[] = [];
      let removedAmount = 0;
      let hasDuplicates = false;

      for (const tx of allTx) {
        if (tx.walletId === profitWallet.id && (tx.referenceNumber?.startsWith('JKR-') || tx.sourceTicketNumber?.startsWith('JKR-'))) {
          const ticketKey = tx.referenceNumber || tx.sourceTicketNumber || '';
          if (seenTickets.has(ticketKey)) {
            hasDuplicates = true;
            removedAmount += (tx.type === 'deposit' ? tx.amount : -tx.amount);
            continue;
          }
          seenTickets.add(ticketKey);
        }
        cleanedTx.push(tx);
      }

      if (hasDuplicates) {
        profitWallet.balance = Math.max(0, Math.round((profitWallet.balance - removedAmount) * 100) / 100);
        profitWallet.totalReceived = Math.max(0, Math.round(((profitWallet.totalReceived || 0) - removedAmount) * 100) / 100);
        profitWallet.updatedAt = new Date().toISOString();
        this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);
        this.setItem(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, cleanedTx);
      }
    } catch (e) {
      console.error('Error cleaning duplicate profit transactions:', e);
    }
  }

  public cleanupDuplicateWalletTransactions(): void {
    try {
      const allTx = this.getItem<StoreWalletTransaction[]>(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, initialStoreWalletTransactions);
      const wallets = this.getItem<StoreWallet[]>(STORAGE_KEYS.STORE_WALLETS, initialStoreWallets);
      const dealerWallets = this.getDealerWallets();

      const seenKeys = new Set<string>();
      const seenTxIds = new Set<string>();
      const cleanedTx: StoreWalletTransaction[] = [];
      const walletDeltas: Record<string, { balanceDelta: number; receivedDelta: number; withdrawnDelta: number }> = {};
      let hasDuplicates = false;

      for (const tx of allTx) {
        if (seenTxIds.has(tx.id)) {
          hasDuplicates = true;
          continue;
        }
        seenTxIds.add(tx.id);

        const refKey = tx.referenceNumber || tx.sourceTicketNumber;
        if (refKey) {
          const compKey = `${tx.walletId}__${refKey}__${tx.type}`;
          if (seenKeys.has(compKey)) {
            hasDuplicates = true;
            if (!walletDeltas[tx.walletId]) {
              walletDeltas[tx.walletId] = { balanceDelta: 0, receivedDelta: 0, withdrawnDelta: 0 };
            }
            const isPos = isStoreWalletTxPositive(tx);
            const absAmt = Math.abs(tx.amount || 0);
            if (isPos) {
              walletDeltas[tx.walletId].balanceDelta -= absAmt;
              walletDeltas[tx.walletId].receivedDelta -= absAmt;
            } else {
              walletDeltas[tx.walletId].balanceDelta += absAmt;
              walletDeltas[tx.walletId].withdrawnDelta -= absAmt;
            }
            continue;
          }
          seenKeys.add(compKey);
        }
        cleanedTx.push(tx);
      }

      if (hasDuplicates) {
        let walletsModified = false;
        for (const w of wallets) {
          if (walletDeltas[w.id]) {
            const delta = walletDeltas[w.id];
            w.balance = Math.max(0, Math.round((w.balance + delta.balanceDelta) * 100) / 100);
            w.totalReceived = Math.max(0, Math.round(((w.totalReceived || 0) + delta.receivedDelta) * 100) / 100);
            w.totalWithdrawn = Math.max(0, Math.round(((w.totalWithdrawn || 0) + delta.withdrawnDelta) * 100) / 100);
            w.updatedAt = new Date().toISOString();
            walletsModified = true;
          }
        }
        if (walletsModified) {
          this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);
        }

        let dealerWalletsModified = false;
        for (const dw of dealerWallets) {
          if (walletDeltas[dw.id]) {
            const delta = walletDeltas[dw.id];
            dw.balance = Math.max(0, Math.round((dw.balance + delta.balanceDelta) * 100) / 100);
            dw.totalReceived = Math.max(0, Math.round(((dw.totalReceived || 0) + delta.receivedDelta) * 100) / 100);
            dw.totalWithdrawn = Math.max(0, Math.round(((dw.totalWithdrawn || 0) + delta.withdrawnDelta) * 100) / 100);
            dw.updatedAt = new Date().toISOString();
            dealerWalletsModified = true;
          }
        }
        if (dealerWalletsModified) {
          this.setItem(STORAGE_KEYS.DEALER_WALLETS, dealerWallets);
        }

        this.setItem(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, cleanedTx);
      }
    } catch (e) {
      console.error('Error cleaning duplicate wallet transactions:', e);
    }
  }

  public recalculateSystemWallets(): {
    profits: number;
    expenses: number;
    cashback: number;
    referrals: number;
    trust: number;
  } {
    const wallets = this.getStoreWallets();
    const tickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
    const dealerTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.DEALER_TICKETS, []);
    const customers = this.getCustomers(true);
    const dealers = this.getDealers(true);

    // 1. System Profits (w_profits & mw_profits) - Only completed tickets realize profit
    const retailCompletedTickets = tickets.filter(t => t.status === 'completed');
    const totalRetailProfit = Math.max(0, Math.round(
      retailCompletedTickets.reduce((sum, t) => sum + (Number(t.netProfit !== undefined ? t.netProfit : t.totalProfitMargin) || 0), 0) * 100
    ) / 100);

    const dealerCompletedTickets = dealerTickets.filter(t => t.status === 'completed');
    const totalDealerProfit = Math.max(0, Math.round(
      dealerCompletedTickets.reduce((sum, t) => sum + (Number(t.netProfit !== undefined ? t.netProfit : t.totalProfitMargin) || 0), 0) * 100
    ) / 100);

    // 2. System Operating Expenses (w_operating_expenses)
    const allCompletedTickets = [...retailCompletedTickets, ...dealerCompletedTickets];
    const totalOperatingExpenses = Math.max(0, Math.round(
      allCompletedTickets.reduce((sum, t) => sum + (Number(t.fixedCostAmount) || 0), 0) * 100
    ) / 100);

    // 3. Customer & Dealer Cashback (w_cashback)
    const totalCustCashback = customers.reduce((sum, c) => sum + (Number(c.cashbackBalance) || 0), 0);
    const totalDealerCashback = dealers.reduce((sum, d) => sum + (Number(d.cashbackBalance) || 0), 0);
    const totalCashbackBalance = Math.max(0, Math.round((totalCustCashback + totalDealerCashback) * 100) / 100);

    const totalCustEarned = customers.reduce((sum, c) => sum + (Number(c.totalCashbackEarned) || 0), 0);
    const totalDealerEarned = dealers.reduce((sum, d) => sum + (Number(d.totalCashbackEarned) || 0), 0);
    const totalCashbackEarned = Math.max(0, Math.round((totalCustEarned + totalDealerEarned) * 100) / 100);

    // 4. Referrals (w_referrals)
    const totalCustRef = customers.reduce((sum, c) => sum + (Number(c.referralWalletBalance) || 0), 0);
    const totalDealerRef = dealers.reduce((sum, d) => sum + (Number(d.referralWalletBalance) || 0), 0);
    const totalReferralsBalance = Math.max(0, Math.round((totalCustRef + totalDealerRef) * 100) / 100);

    // 5. Trust & Overpayments & Reservation Escrow (w_trust & mw_debts)
    const totalCustNetBalance = customers.reduce((sum, c) => sum + (Number(c.accountBalance) || 0), 0);
    const retailPendingReservations = tickets.filter(t => (t.isReservation || t.operationMode === 'reservation') && t.status !== 'completed' && t.status !== 'canceled' && t.status !== 'refunded');
    const totalRetailReservationHeld = retailPendingReservations.reduce((sum, t) => sum + (Number(t.reservationTrustHeld !== undefined ? t.reservationTrustHeld : t.receivedAmount || t.requiredAmount || 0)), 0);
    const totalRetailTrust = Math.max(0, Math.round((totalCustNetBalance + totalRetailReservationHeld) * 100) / 100);

    const totalDealerNetBalance = dealers.reduce((sum, d) => sum + (Number(d.accountBalance) || 0), 0);
    const dealerPendingReservations = dealerTickets.filter(t => (t.isReservation || t.operationMode === 'reservation') && t.status !== 'completed' && t.status !== 'canceled' && t.status !== 'refunded');
    const totalDealerReservationHeld = dealerPendingReservations.reduce((sum, t) => sum + (Number(t.reservationTrustHeld !== undefined ? t.reservationTrustHeld : t.receivedAmount || t.requiredAmount || 0)), 0);
    const totalDealerTrust = Math.max(0, Math.round((totalDealerNetBalance + totalDealerReservationHeld) * 100) / 100);

    const totalTrustBalance = Math.max(0, Math.round((totalRetailTrust + totalDealerTrust) * 100) / 100);

    // Apply to Store Wallets (Retail Customer System Wallets)
    let modified = false;

    // w_profits
    const pW = wallets.find(w => w.id === 'w_profits' || w.systemType === 'profits' || w.type === 'profits');
    if (pW) {
      pW.balance = totalRetailProfit;
      pW.totalReceived = totalRetailProfit;
      pW.updatedAt = new Date().toISOString();
      modified = true;
    }

    // w_operating_expenses
    const expW = wallets.find(w => w.id === 'w_operating_expenses' || w.systemType === 'operating_expenses');
    if (expW) {
      expW.balance = totalOperatingExpenses;
      expW.totalReceived = totalOperatingExpenses;
      expW.updatedAt = new Date().toISOString();
      modified = true;
    }

    // w_cashback
    const cbW = wallets.find(w => w.id === 'w_cashback' || w.systemType === 'cashback');
    if (cbW) {
      cbW.balance = Math.max(0, Math.round(totalCustCashback * 100) / 100);
      cbW.totalReceived = Math.max(0, Math.round((totalCustEarned || totalCustCashback) * 100) / 100);
      cbW.updatedAt = new Date().toISOString();
      modified = true;
    }

    // w_referrals
    const refW = wallets.find(w => w.id === 'w_referrals' || w.systemType === 'referrals');
    if (refW) {
      refW.balance = Math.max(0, Math.round(totalCustRef * 100) / 100);
      refW.totalReceived = Math.max(0, Math.round(totalCustRef * 100) / 100);
      refW.updatedAt = new Date().toISOString();
      modified = true;
    }

    // w_trust
    const trustW = wallets.find(w => w.id === 'w_trust' || w.systemType === 'trust');
    if (trustW) {
      trustW.balance = totalRetailTrust;
      trustW.totalReceived = totalRetailTrust;
      trustW.updatedAt = new Date().toISOString();
      modified = true;
    }

    if (modified) {
      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      }
    }

    // Apply to Dealer Wallets (STORAGE_KEYS.DEALER_WALLETS)
    try {
      const dealerWallets = this.getDealerWallets();
      let dealerModified = false;

      // mw_profits
      const dProfitW = dealerWallets.find(w => w.id === 'mw_profits' || w.systemType === 'profits');
      if (dProfitW) {
        dProfitW.balance = totalDealerProfit;
        dProfitW.totalReceived = totalDealerProfit;
        dProfitW.updatedAt = new Date().toISOString();
        dealerModified = true;
      }

      // mw_cashback
      const dCbW = dealerWallets.find(w => w.id === 'mw_cashback' || w.systemType === 'cashback');
      if (dCbW) {
        dCbW.balance = Math.max(0, Math.round(totalDealerCashback * 100) / 100);
        dCbW.totalReceived = Math.max(0, Math.round((totalDealerEarned || totalDealerCashback) * 100) / 100);
        dCbW.updatedAt = new Date().toISOString();
        dealerModified = true;
      }

      // mw_referrals
      const dRefW = dealerWallets.find(w => w.id === 'mw_referrals' || w.systemType === 'referrals');
      if (dRefW) {
        dRefW.balance = Math.max(0, Math.round(totalDealerRef * 100) / 100);
        dRefW.totalReceived = Math.max(0, Math.round(totalDealerRef * 100) / 100);
        dRefW.updatedAt = new Date().toISOString();
        dealerModified = true;
      }

      // mw_debts
      const dDebtsW = dealerWallets.find(w => w.id === 'mw_debts' || w.systemType === 'trust');
      if (dDebtsW) {
        dDebtsW.balance = totalDealerTrust;
        dDebtsW.totalReceived = totalDealerTrust;
        dDebtsW.updatedAt = new Date().toISOString();
        dealerModified = true;
      }

      if (dealerModified) {
        this.setItem(STORAGE_KEYS.DEALER_WALLETS, dealerWallets);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('dealer_wallets_updated'));
        }
      }
    } catch (eDealerWallets) {
      console.warn('Error recalculating dealer wallets in recalculateSystemWallets:', eDealerWallets);
    }

    return {
      profits: totalRetailProfit,
      expenses: totalOperatingExpenses,
      cashback: totalCashbackBalance,
      referrals: totalReferralsBalance,
      trust: totalTrustBalance
    };
  }

  public reconcileFirstShippingCompletedTickets(): void {
    try {
      const allTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.TICKETS, initialTickets);
      const dealerTickets = this.getItem<CustomerTicket[]>(STORAGE_KEYS.DEALER_TICKETS, []);
      const allUnifiedTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
      const allDealerTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, []);
      const allGames = [...this.getFirstShippingGameTree(), ...this.getGameTree()];

      let customerTicketsChanged = false;
      let dealerTicketsChanged = false;

      // 1. Retail Customer Tickets
      for (const t of allTickets) {
        if (t.ticketType === 'first_shipping' && t.status === 'completed' && (!t.cashbackEarned || t.cashbackEarned === 0)) {
          let pFound: GameProduct | undefined;
          let gFound: GameTreeItem | undefined;
          if (t.items && t.items.length > 0) {
            const item = t.items[0];
            for (const g of allGames) {
              const p = (g.products || []).find(prod => prod.id === item.productId || prod.name === item.productName);
              if (p) { pFound = p; gFound = g; break; }
            }
          }
          const cbEnabled = gFound ? (gFound.cashbackEnabled !== false && pFound?.isCashbackEnabled !== false) : true;
          if (cbEnabled) {
            const cust = this.getCustomerById(t.customerId) || this.findCustomerByPhone(t.customerPhone);
            const rate = cust?.cashbackRate ?? 1.0;
            const sale = t.totalProductsAmount || t.requiredAmount || t.receivedAmount || 0;
            const cbAmount = Math.round(((sale * rate) / 100) * 100) / 100;
            if (cbAmount > 0) {
              t.cashbackEarned = cbAmount;
              t.cashbackPercent = rate;
              t.cashbackPercentage = rate;
              if (t.items && t.items.length > 0) {
                t.items[0].cashbackAmountEGP = cbAmount;
                t.items[0].cashbackPercent = rate;
              }
              if (t.pricingSnapshot) {
                t.pricingSnapshot.cashbackAmountEGP = cbAmount;
                t.pricingSnapshot.cashbackPercent = rate;
              }
              customerTicketsChanged = true;

              const alreadyHasTx = allUnifiedTxs.some(tx => tx.customerId === t.customerId && tx.orderNumber === t.ticketNumber && tx.walletType === 'cashback' && tx.type === 'earned');
              if (!alreadyHasTx && cust) {
                this.addUnifiedWalletTransaction({
                  customerId: cust.id,
                  walletType: 'cashback',
                  type: 'earned',
                  operationName: `كاش باك ${rate}% لتذكرة أول شحنة #${t.ticketNumber}`,
                  amount: cbAmount,
                  balanceAfter: Math.round(((cust.cashbackBalance || 0) + cbAmount) * 100) / 100,
                  orderNumber: t.ticketNumber
                });
                if (!t.cashbackSynced) {
                  this.creditCashbackToSystemWallet(cbAmount, cust.name, t.ticketNumber);
                  t.cashbackSynced = true;
                }
              }
            }
          }
        }
      }

      // 2. Dealer Tickets
      for (const t of dealerTickets) {
        if (t.ticketType === 'first_shipping' && t.status === 'completed' && (!t.cashbackEarned || t.cashbackEarned === 0)) {
          let pFound: GameProduct | undefined;
          let gFound: GameTreeItem | undefined;
          if (t.items && t.items.length > 0) {
            const item = t.items[0];
            for (const g of allGames) {
              const p = (g.products || []).find(prod => prod.id === item.productId || prod.name === item.productName);
              if (p) { pFound = p; gFound = g; break; }
            }
          }
          const cbEnabled = gFound ? (gFound.cashbackEnabled !== false && pFound?.isCashbackEnabled !== false) : true;
          if (cbEnabled) {
            const dealer = this.getDealerById(t.customerId) || this.findDealerByPhone(t.customerPhone);
            const rate = dealer?.cashbackRate ?? 0.5;
            const sale = t.totalProductsAmount || t.requiredAmount || t.receivedAmount || 0;
            const cbAmount = Math.round(((sale * rate) / 100) * 100) / 100;
            if (cbAmount > 0) {
              t.cashbackEarned = cbAmount;
              t.cashbackPercent = rate;
              t.cashbackPercentage = rate;
              if (t.items && t.items.length > 0) {
                t.items[0].cashbackAmountEGP = cbAmount;
                t.items[0].cashbackPercent = rate;
              }
              if (t.pricingSnapshot) {
                t.pricingSnapshot.cashbackAmountEGP = cbAmount;
                t.pricingSnapshot.cashbackPercent = rate;
              }
              dealerTicketsChanged = true;

              const alreadyHasTx = allDealerTxs.some(tx => tx.customerId === t.customerId && tx.orderNumber === t.ticketNumber && tx.walletType === 'cashback' && tx.type === 'earned');
              if (!alreadyHasTx && dealer) {
                this.addDealerUnifiedWalletTransaction({
                  customerId: dealer.id,
                  walletType: 'cashback',
                  type: 'earned',
                  operationName: `كاش باك حافز جملة ${rate}% لتذكرة أول شحنة #${t.ticketNumber}`,
                  amount: cbAmount,
                  balanceAfter: Math.round(((dealer.cashbackBalance || 0) + cbAmount) * 100) / 100,
                  orderNumber: t.ticketNumber
                });
                if (!t.cashbackSynced) {
                  this.creditCashbackToSystemWallet(cbAmount, dealer.name, t.ticketNumber, true);
                  t.cashbackSynced = true;
                }
              }
            }
          }
        }
      }

      if (customerTicketsChanged) {
        this.setItem(STORAGE_KEYS.TICKETS, allTickets);
      }
      if (dealerTicketsChanged) {
        this.setItem(STORAGE_KEYS.DEALER_TICKETS, dealerTickets);
      }
    } catch (err) {
      console.error('Error reconciling first shipping tickets cashback:', err);
    }
  }

  public getDepositBondsFIFO(): DepositBondFIFO[] {
    return this.getItem<DepositBondFIFO[]>(STORAGE_KEYS.DEPOSIT_BONDS_FIFO, initialDepositBondsFIFO);
  }

  public saveDepositBondFIFO(bond: DepositBondFIFO): void {
    const bonds = this.getDepositBondsFIFO();
    const index = bonds.findIndex(b => b.id === bond.id);
    if (index >= 0) {
      bonds[index] = bond;
    } else {
      bonds.unshift(bond);
    }
    this.setItem(STORAGE_KEYS.DEPOSIT_BONDS_FIFO, bonds);
  }

  public addDepositBondFIFO(bond: Omit<DepositBondFIFO, 'id' | 'createdAt'>): DepositBondFIFO {
    const bonds = this.getDepositBondsFIFO();
    const newBond: DepositBondFIFO = {
      ...bond,
      id: 'bnd_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    bonds.unshift(newBond);
    this.setItem(STORAGE_KEYS.DEPOSIT_BONDS_FIFO, bonds);

    // Also record transaction in Store Wallet Ledger
    const targetWallet = this.getStoreWallets().find(w => w.id === bond.walletId);
    if (targetWallet) {
      this.addStoreWalletTransaction({
        walletId: targetWallet.id,
        walletName: targetWallet.name,
        type: 'bond_deposit',
        amount: bond.unitsDeposited,
        currency: targetWallet.currency,
        balanceBefore: targetWallet.balance,
        balanceAfter: targetWallet.balance + bond.unitsDeposited,
        description: `سند إيداع بضاعة FIFO #${newBond.bondNumber} (${bond.unitsDeposited} وحدة/كارت)`,
        referenceNumber: newBond.bondNumber
      });
    }

    return newBond;
  }

  // Sub-Wallet FIFO Points Deposit
  public depositSubWalletPoints(
    subWalletId: string,
    mainWalletId: string,
    pointsAmount: number,
    paidUSD: number,
    usdRate: number,
    notes?: string,
    user?: { id: string; name: string; role: string }
  ): boolean {
    const wallets = this.getStoreWallets();
    const subW = wallets.find(w => w.id === subWalletId);
    const mainW = wallets.find(w => w.id === mainWalletId);
    if (!subW || pointsAmount <= 0) return false;

    // 1. If main wallet specified, deduct paidUSD
    if (mainW) {
      const deductionEGP = paidUSD * usdRate;
      mainW.balance -= (mainW.currency === 'USD' ? paidUSD : deductionEGP);
      mainW.updatedAt = new Date().toISOString();
      this.addStoreWalletTransaction({
        walletId: mainW.id,
        walletName: mainW.name,
        type: 'withdrawal',
        amount: mainW.currency === 'USD' ? paidUSD : deductionEGP,
        amountUSD: paidUSD,
        currency: mainW.currency,
        balanceBefore: mainW.balance + (mainW.currency === 'USD' ? paidUSD : deductionEGP),
        balanceAfter: mainW.balance,
        description: `تمويل وشراء نقاط للمحفظة الفرعية (${subW.name}) - ${pointsAmount} نقطة`,
        performedBy: user,
        notes
      });
    }

    // 2. Create FIFO Lot in Sub-Wallet
    const costPerUnitUSD = paidUSD / pointsAmount;
    const costPerUnitEGP = (paidUSD * usdRate) / pointsAmount;
    const newLot: FIFOLotItem = {
      id: 'lot_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      lotNumber: `LOT-PT-${Date.now().toString().slice(-6)}`,
      walletId: subW.id,
      unitsDeposited: pointsAmount,
      remainingUnits: pointsAmount,
      costPerUnitUSD: Math.round(costPerUnitUSD * 10000) / 10000,
      costPerUnitEGP: Math.round(costPerUnitEGP * 10000) / 10000,
      exchangeRateUsed: usdRate,
      totalPaidUSD: paidUSD,
      date: new Date().toISOString(),
      notes,
      createdAt: new Date().toISOString()
    };

    if (!subW.fifoLots) subW.fifoLots = [];
    subW.fifoLots.unshift(newLot);
    subW.pointsBalance = (subW.pointsBalance || 0) + pointsAmount;
    subW.lastDepositAt = new Date().toISOString();
    subW.updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

    // 3. Log transaction in Sub-Wallet
    this.addStoreWalletTransaction({
      walletId: subW.id,
      walletName: subW.name,
      type: 'deposit',
      amount: paidUSD * usdRate,
      amountUSD: paidUSD,
      pointsAmount,
      currency: subW.currency,
      balanceBefore: (subW.pointsBalance || 0) - pointsAmount,
      balanceAfter: subW.pointsBalance || 0,
      description: `إيداع شحنة نقاط FIFO #${newLot.lotNumber} (+${pointsAmount} نقطة) ممولة من [${mainW?.name || 'خزينة خارجية'}]`,
      referenceNumber: newLot.lotNumber,
      performedBy: user,
      notes
    });

    return true;
  }

  // Freeze & Unfreeze Store Wallet
  public freezeStoreWallet(
    walletId: string,
    reason: string,
    user?: { id: string; name: string; role: string }
  ): boolean {
    const wallets = this.getStoreWallets();
    const w = wallets.find(x => x.id === walletId);
    if (!w) return false;

    w.isFrozen = true;
    w.status = 'frozen';
    w.freezeReason = reason;
    w.frozenAt = new Date().toISOString();
    w.frozenBy = user?.name || 'المدير';

    const exchangeRate = this.getExchangeRate()?.rateUSD_EGP || 50;
    const isPoints = w.pointsBalance !== undefined && w.pointsBalance !== null;
    let potentialVal = 0;
    if (isPoints) {
      // Calculate potential value from remaining FIFO lots
      const ptsRemaining = w.pointsBalance || 0;
      let totalPtsCost = 0;
      if (w.fifoLots && w.fifoLots.length > 0) {
        totalPtsCost = w.fifoLots.reduce((acc, lot) => acc + (lot.remainingUnits * (lot.costPerUnitEGP || 0.5)), 0);
      }
      potentialVal = totalPtsCost > 0 ? totalPtsCost : ptsRemaining * 0.5;
    } else {
      potentialVal = w.currency === 'USD' ? w.balance * exchangeRate : w.balance;
    }

    w.potentialLossAmount = Math.max(0, Math.round(potentialVal * 100) / 100);
    w.updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

    this.addStoreWalletTransaction({
      walletId: w.id,
      walletName: w.name,
      type: 'freeze',
      amount: w.potentialLossAmount,
      currency: w.currency,
      balanceBefore: w.balance,
      balanceAfter: w.balance,
      description: `⚠️ تجميد المحفظة وتسجيل خسارة محتملة: ${reason}`,
      performedBy: user,
      notes: reason
    });

    this.addNotification({
      type: 'warning',
      title: '⚠️ تجميد محفظة وتسجيل خسارة محتملة',
      message: `تم تجميد محفظة [${w.name}] وتسجيل خسارة محتملة بقيمة (${w.potentialLossAmount} ج). السبب: ${reason}`
    });

    this.logAction(
      user || { id: 'admin', name: 'المدير العام', role: 'admin', department: 'المحافظ' },
      'edit',
      'تجميد محفظة',
      w.id,
      w.name,
      `تجميد المحفظة وتسجيل خسارة محتملة بقيمة (${w.potentialLossAmount} ${w.currency})، السبب: ${reason}`
    );

    return true;
  }

  public unfreezeStoreWallet(
    walletId: string,
    user?: { id: string; name: string; role: string }
  ): boolean {
    const wallets = this.getStoreWallets();
    const w = wallets.find(x => x.id === walletId);
    if (!w) return false;

    w.isFrozen = false;
    w.status = 'active';
    w.freezeReason = undefined;
    w.potentialLossAmount = 0;
    w.updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

    this.addNotification({
      type: 'success',
      title: '🟢 إلغاء تجميد محفظة',
      message: `تم إلغاء تجميد محفظة [${w.name}] وإعادتها فوراً لمنظومة الأولويات النشطة.`
    });

    this.logAction(
      user || { id: 'admin', name: 'المدير العام', role: 'admin', department: 'المحافظ' },
      'edit',
      'إلغاء تجميد محفظة',
      w.id,
      w.name,
      `تم إلغاء تجميد المحفظة وإعادتها للعمل الطبيعي`
    );

    return true;
  }

  // Record Losses & Compensation
  public recordWalletLoss(
    walletId: string,
    amount: number,
    reason: string,
    notes?: string,
    user?: { id: string; name: string; role: string }
  ): boolean {
    const wallets = this.getStoreWallets();
    const w = wallets.find(x => x.id === walletId);
    if (!w || amount <= 0) return false;

    w.confirmedLossAmount = (w.confirmedLossAmount || 0) + amount;
    w.lossReason = reason;
    w.netLossAmount = Math.max(0, (w.confirmedLossAmount || 0) - (w.recoveredCompensationAmount || 0));
    w.balance = Math.max(0, w.balance - amount);
    w.updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

    this.addStoreWalletTransaction({
      walletId: w.id,
      walletName: w.name,
      type: 'loss',
      amount,
      currency: w.currency,
      balanceBefore: w.balance + amount,
      balanceAfter: w.balance,
      description: `تأكيد خسارة مالية بالمحفظة: ${reason}`,
      performedBy: user,
      notes
    });

    this.logAction(
      user || { id: 'admin', name: 'المدير العام', role: 'admin', department: 'المالية' },
      'edit',
      'تسجيل خسارة محفظة',
      w.id,
      w.name,
      `تأكيد خسارة بقيمة (${amount} ${w.currency}) بالمحفظة، السبب: ${reason}`
    );

    return true;
  }

  public recordWalletCompensation(
    walletId: string,
    amount: number,
    notes?: string,
    user?: { id: string; name: string; role: string }
  ): boolean {
    const wallets = this.getStoreWallets();
    const w = wallets.find(x => x.id === walletId);
    if (!w || amount <= 0) return false;

    w.recoveredCompensationAmount = (w.recoveredCompensationAmount || 0) + amount;
    w.netLossAmount = Math.max(0, (w.confirmedLossAmount || 0) - (w.recoveredCompensationAmount || 0));
    w.balance += amount;
    w.updatedAt = new Date().toISOString();
    this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

    this.addStoreWalletTransaction({
      walletId: w.id,
      walletName: w.name,
      type: 'compensation',
      amount,
      currency: w.currency,
      balanceBefore: w.balance - amount,
      balanceAfter: w.balance,
      description: `استرداد وتعويض مالي مسجل للمحفظة (+${amount} ${w.currency})`,
      performedBy: user,
      notes
    });

    this.logAction(
      user || { id: 'admin', name: 'المدير العام', role: 'admin', department: 'المالية' },
      'edit',
      'تسجيل تعويض محفظة',
      w.id,
      w.name,
      `تسجيل تعويض مسترد بقيمة (${amount} ${w.currency}) للمحفظة، صافي الخسارة بعد التعويض: (${w.netLossAmount} ${w.currency})`
    );

    return true;
  }

  // First Shipment Anti-Fraud Security Check
  public checkFirstShipmentEligibility(
    gamePlayerId?: string,
    customerPhone?: string,
    customerEmail?: string
  ): { eligible: boolean; rejectionReason?: string; matchedField?: string } {
    const tickets = this.getTickets();
    const cleanPlayerId = (gamePlayerId || '').trim();
    const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
    const cleanEmail = (customerEmail || '').trim().toLowerCase();

    for (const t of tickets) {
      if (t.status === 'canceled') continue;

      // 1. Check Player Game ID
      if (cleanPlayerId && t.playerGameId && t.playerGameId.trim() === cleanPlayerId) {
        return {
          eligible: false,
          rejectionReason: 'العميل سبق وتعامل معنا بنفس معرف اللاعب (Game ID)',
          matchedField: `معرف اللاعب (Game ID): ${cleanPlayerId}`
        };
      }

      // Check items for playerGameId
      if (cleanPlayerId && t.items && t.items.some(it => it.playerGameId && it.playerGameId.trim() === cleanPlayerId)) {
        return {
          eligible: false,
          rejectionReason: 'العميل سبق وتعامل معنا بنفس معرف اللاعب (Game ID)',
          matchedField: `معرف اللاعب (Game ID): ${cleanPlayerId}`
        };
      }

      // 2. Check Customer Phone
      if (cleanPhone && t.customerPhone) {
        const tPhone = t.customerPhone.replace(/[^0-9]/g, '');
        if (tPhone === cleanPhone) {
          return {
            eligible: false,
            rejectionReason: 'العميل سبق وتعامل معنا بنفس رقم الهاتف',
            matchedField: `رقم الهاتف: ${customerPhone}`
          };
        }
      }

      // 3. Check Customer Email
      if (cleanEmail && t.notes && t.notes.toLowerCase().includes(cleanEmail)) {
        return {
          eligible: false,
          rejectionReason: 'العميل سبق وتعامل معنا بنفس البريد الإلكتروني',
          matchedField: `البريد الإلكتروني: ${customerEmail}`
        };
      }
    }

    return { eligible: true };
  }

  // Product Copy Templates
  public getProductCopyTemplates(): ProductCopyTemplate[] {
    const initialTemplates: ProductCopyTemplate[] = [
      {
        id: 'tpl_game',
        level: 'game',
        name: 'قالب اللعبة القياسي',
        templateText: '🎮 لعبة: {{اسم_اللعبة}}\n⭐ الأسعار والعروض متاحة بالكامل!',
        createdAt: '2026-01-01T00:00:00Z'
      },
      {
        id: 'tpl_prod',
        level: 'product',
        name: 'قالب عرض المنتج',
        templateText: '🔥 {{اسم_المنتج}} بـ {{سعر_البيع}} ج فقط!\n⚡ شحن فوري وآمن 100%',
        createdAt: '2026-01-01T00:00:00Z'
      }
    ];
    return this.getItem<ProductCopyTemplate[]>(STORAGE_KEYS.COPY_TEMPLATES, initialTemplates);
  }

  public saveProductCopyTemplate(tpl: ProductCopyTemplate): ProductCopyTemplate {
    const all = this.getProductCopyTemplates();
    const index = all.findIndex(t => t.id === tpl.id);
    if (index >= 0) {
      all[index] = tpl;
    } else {
      all.unshift(tpl);
    }
    this.setItem(STORAGE_KEYS.COPY_TEMPLATES, all);
    return tpl;
  }

  public deleteProductCopyTemplate(id: string): void {
    const all = this.getProductCopyTemplates().filter(t => t.id !== id);
    this.setItem(STORAGE_KEYS.COPY_TEMPLATES, all);
  }

  // Marketing Copy Formatted Messages Settings
  public getDefaultMarketingCopySettings(): MarketingCopySettings {
    return {
      headerText: `🛡️ ضمان مدى الحياة على شحنتك مع JKR TOP-UP\n\n⏱️ غرامة تأخير 50 جنيه!\nلو اتأخرنا أكثر من 30 دقيقة على شحنتك بالحساب 💙`,
      footerText: `📞 التواصل بيكون هنا تشرفنا ❤️\n\n1️⃣ الفرع الأول:\nhttps://wa.me/201080060177\n\n2️⃣ الفرع الثاني:\nhttps://wa.me/201080060188\n\n🛠️ الدعم (للشكاوي والبلاغات):\nhttps://wa.me/201080060199\n\n📢 قناتنا على الواتساب:\nhttps://whatsapp.com/channel/0029VbC20PqElagy86p69N0K`,
      companyName: 'JKR TOP-UP'
    };
  }

  public getMarketingCopySettings(): MarketingCopySettings {
    const defaults = this.getDefaultMarketingCopySettings();
    const settings = this.getItem<MarketingCopySettings>(STORAGE_KEYS.MARKETING_COPY_SETTINGS, defaults);
    if (!settings || typeof settings !== 'object') {
      this.setItem(STORAGE_KEYS.MARKETING_COPY_SETTINGS, defaults);
      return defaults;
    }
    return {
      headerText: typeof settings.headerText === 'string' ? settings.headerText : defaults.headerText,
      footerText: typeof settings.footerText === 'string' ? settings.footerText : defaults.footerText,
      companyName: typeof settings.companyName === 'string' && settings.companyName.trim() ? settings.companyName : defaults.companyName,
      updatedAt: settings.updatedAt
    };
  }

  public saveMarketingCopySettings(settings: MarketingCopySettings): MarketingCopySettings {
    const updated: MarketingCopySettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    this.setItem(STORAGE_KEYS.MARKETING_COPY_SETTINGS, updated);
    return updated;
  }

  public getGameMarketingCopySettings(gameId: string): GameCopySettings | undefined {
    if (!gameId) return undefined;
    const map = this.getItem<Record<string, GameCopySettings>>(STORAGE_KEYS.GAME_COPY_SETTINGS, {});
    return map[gameId];
  }

  public getAllGameMarketingCopySettings(): Record<string, GameCopySettings> {
    return this.getItem<Record<string, GameCopySettings>>(STORAGE_KEYS.GAME_COPY_SETTINGS, {});
  }

  public saveGameMarketingCopySettings(gameId: string, settings: GameCopySettings): void {
    if (!gameId) return;
    const map = this.getItem<Record<string, GameCopySettings>>(STORAGE_KEYS.GAME_COPY_SETTINGS, {});
    map[gameId] = {
      ...settings,
      gameId,
      updatedAt: new Date().toISOString()
    };
    this.setItem(STORAGE_KEYS.GAME_COPY_SETTINGS, map);

    // Also persist directly into the game tree entity for seamless export/sync
    const regularGames = this.getGameTree();
    const gIndex = regularGames.findIndex((item: GameTreeItem) => item.id === gameId);
    if (gIndex >= 0) {
      regularGames[gIndex].copySettings = map[gameId];
      this.setGamesTree(regularGames);
    }
  }

  public deleteGameMarketingCopySettings(gameId: string): void {
    if (!gameId) return;
    const map = this.getItem<Record<string, GameCopySettings>>(STORAGE_KEYS.GAME_COPY_SETTINGS, {});
    delete map[gameId];
    this.setItem(STORAGE_KEYS.GAME_COPY_SETTINGS, map);

    const regularGames = this.getGameTree();
    const gIndex = regularGames.findIndex((item: GameTreeItem) => item.id === gameId);
    if (gIndex >= 0) {
      delete regularGames[gIndex].copySettings;
      this.setGamesTree(regularGames);
    }
  }

  public getCoupons(): Coupon[] {
    const raw = this.getItem<Coupon[]>(STORAGE_KEYS.COUPONS, initialCoupons);
    return raw.map(c => {
      let status = c.status;
      if (!status) {
        if (c.expiryDate && new Date(c.expiryDate) < new Date()) {
          status = 'expired';
        } else if (!c.isActive || c.isAutoDeactivated) {
          status = 'cancelled';
        } else if (c.type === 'single_use' && (c.currentUsageCount || 0) >= 1) {
          status = 'used';
        } else {
          status = 'active';
        }
      }
      return {
        ...c,
        status,
        usageLog: c.usageLog || []
      };
    });
  }

  public saveCoupon(coupon: Coupon, user?: any): void {
    const coupons = this.getCoupons();
    const index = coupons.findIndex(c => c.id === coupon.id);
    const isNew = index < 0;
    if (!isNew) {
      coupons[index] = coupon;
    } else {
      coupons.unshift(coupon);
    }
    this.setItem(STORAGE_KEYS.COUPONS, coupons);

    if (user) {
      try {
        this.addAuditLog(
          user,
          isNew ? 'add' : 'edit',
          'coupon',
          coupon.id,
          `${isNew ? 'إنشاء كوبون جديد' : 'تحديث بيانات الكوبون'}: ${coupon.code} (${coupon.title})`
        );
      } catch (e) {}
    }

    eventBus.publish(SYSTEM_EVENTS.COUPON_MUTATED, coupon);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('coupons_updated'));
    }
  }

  public deleteCoupon(id: string, user?: any): void {
    const coupons = this.getCoupons();
    const item = coupons.find(c => c.id === id);
    const filtered = coupons.filter(c => c.id !== id);
    this.setItem(STORAGE_KEYS.COUPONS, filtered);

    if (user && item) {
      try {
        this.addAuditLog(user, 'delete', 'coupon', id, `حذف الكوبون: ${item.code} (${item.title})`);
      } catch (e) {}
    }

    eventBus.publish(SYSTEM_EVENTS.COUPON_MUTATED, { id });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('coupons_updated'));
    }
  }

  public reactivateCoupon(couponId: string, user?: any): boolean {
    const coupons = this.getCoupons();
    const coupon = coupons.find(c => c.id === couponId);
    if (!coupon) return false;

    coupon.status = 'active';
    coupon.isActive = true;
    coupon.isAutoDeactivated = false;
    if (coupon.type === 'single_use') {
      coupon.currentUsageCount = 0;
    }
    this.saveCoupon(coupon, user);

    if (user) {
      try {
        this.addAuditLog(
          user,
          'edit',
          'coupon',
          coupon.id,
          `إعادة تفعيل الكوبون يدويًا: ${coupon.code} (${coupon.title}) بواسطة الإدارة`
        );
      } catch (e) {}
    }
    return true;
  }

  public validateCoupon(
    codeStr: string,
    orderAmount: number,
    options?: {
      customerId?: string;
      customerPhone?: string;
      customerCode?: string;
      gameId?: string;
    }
  ): {
    valid: boolean;
    discountAmount: number;
    coupon?: Coupon;
    message: string;
  } {
    const clean = (codeStr || '').trim().toUpperCase();
    if (!clean) return { valid: false, discountAmount: 0, message: 'يرجى إدخال كود الكوبون' };

    const coupons = this.getCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === clean);

    if (!coupon) {
      // Check system codes fallback
      const sysCodes = this.getSystemCodes();
      const sysCode = sysCodes.find(c => c.code.toUpperCase() === clean);
      if (!sysCode) {
        return { valid: false, discountAmount: 0, message: 'كود الكوبون غير موجود في النظام' };
      }
      if (sysCode.status === 'used' || (sysCode.remainingUsageCount !== undefined && sysCode.remainingUsageCount <= 0)) {
        return { valid: false, discountAmount: 0, message: `كود القسيمة "${sysCode.code}" مستهلك بالكامل ومنتهي الصلاحية` };
      }
      if (sysCode.status !== 'active') {
        return { valid: false, discountAmount: 0, message: `كود القسيمة "${sysCode.code}" غير نشط (${sysCode.status})` };
      }
      const discount = Math.min(orderAmount, sysCode.valueEGP || 50);
      return { valid: true, discountAmount: discount, message: `قسيمة مقبولة بقيمة خصم ${discount} ج` };
    }

    // 1. Check if used (Single Use check)
    if (coupon.status === 'used' || (coupon.type === 'single_use' && (coupon.currentUsageCount || 0) >= 1)) {
      return {
        valid: false,
        discountAmount: 0,
        coupon,
        message: 'هذا الكوبون ذو استخدام لمرة واحدة وقد تم استخدامه بالفعل مسبقاً وغير صالح للاستخدام.'
      };
    }

    // 2. Check if cancelled or inactive
    if (coupon.status === 'cancelled' || !coupon.isActive || coupon.isAutoDeactivated) {
      return {
        valid: false,
        discountAmount: 0,
        coupon,
        message: 'الكوبون ملغي أو غير نشط حالياً وغير صالح للاستخدام.'
      };
    }

    // 3. Check expiration
    if (coupon.status === 'expired' || (coupon.expiryDate && new Date(coupon.expiryDate) < new Date())) {
      return {
        valid: false,
        discountAmount: 0,
        coupon,
        message: `الكوبون منتهي الصلاحية بتاريخ (${coupon.expiryDate || 'سابق'}).`
      };
    }

    // 4. Single-Use Specific Customer Check
    if (coupon.type === 'single_use') {
      if (coupon.singleUseType === 'customer_specific') {
        const cId = options?.customerId;
        const cPhone = (options?.customerPhone || '').trim();
        const cCode = (options?.customerCode || '').trim().toLowerCase();

        const matchId = Boolean(coupon.targetCustomerId && cId && coupon.targetCustomerId === cId);
        const matchPhone = Boolean(coupon.targetCustomerPhone && cPhone && coupon.targetCustomerPhone.trim() === cPhone);
        const matchCode = Boolean(coupon.targetCustomerCode && cCode && coupon.targetCustomerCode.trim().toLowerCase() === cCode);

        if (!matchId && !matchPhone && !matchCode) {
          return {
            valid: false,
            discountAmount: 0,
            coupon,
            message: `عفواً! هذا الكوبون مخصص وحصري للعميل (${coupon.targetCustomerName || coupon.targetCustomerCode || 'المحدد'}) فقط، ولا يمكن استخدامه بواسطة حساب آخر.`
          };
        }
      }
    }

    // 5. General Customer Specific (Legacy/Compensation) Check
    if (coupon.type === 'customer_specific') {
      const cId = options?.customerId;
      const cPhone = (options?.customerPhone || '').trim();
      const matchId = Boolean(coupon.targetCustomerId && cId && coupon.targetCustomerId === cId);
      const matchPhone = Boolean(coupon.targetCustomerPhone && cPhone && coupon.targetCustomerPhone.trim() === cPhone);
      if (!matchId && !matchPhone) {
        return {
          valid: false,
          discountAmount: 0,
          coupon,
          message: `عفواً! هذا الكوبون مخصص وحصري للعميل (${coupon.targetCustomerName || 'المحدد'}) فقط، وغير صالح للاستخدام مع أي حساب آخر.`
        };
      }
    }

    // 6. Seasonal limits check
    if (coupon.type === 'seasonal') {
      if (coupon.maxUsageTotal && (coupon.currentUsageCount || 0) >= coupon.maxUsageTotal) {
        return { valid: false, discountAmount: 0, coupon, message: 'انتهت عدد مرات الاستخدام المحددة لهذا الكوبون الموسمي' };
      }
      if (coupon.allocatedQuantityBudgetEGP && (coupon.usedQuantityBudgetEGP || 0) >= coupon.allocatedQuantityBudgetEGP) {
        return { valid: false, discountAmount: 0, coupon, message: 'انتهت الكمية والميزانية المخصصة لهذا الكوبون الموسمي' };
      }
    }

    // 7. Purchase Limits (Min & Max)
    if (coupon.minPurchaseAmount && orderAmount < coupon.minPurchaseAmount) {
      return {
        valid: false,
        discountAmount: 0,
        coupon,
        message: `قيمة المشتريات (${orderAmount} ج) أقل من الحد الأدنى لتفعيل هذا الكوبون (${coupon.minPurchaseAmount} ج).`
      };
    }
    if (coupon.maxPurchaseAmount && orderAmount > coupon.maxPurchaseAmount) {
      return {
        valid: false,
        discountAmount: 0,
        coupon,
        message: `قيمة المشتريات (${orderAmount} ج) تتجاوز الحد الأقصى المسموح به لتطبيق الكوبون (${coupon.maxPurchaseAmount} ج).`
      };
    }

    // 8. Game Lock Check
    if (coupon.applicableGameId && coupon.applicableGameId !== 'all') {
      if (options?.gameId && options.gameId !== 'all' && options.gameId !== coupon.applicableGameId) {
        return {
          valid: false,
          discountAmount: 0,
          coupon,
          message: `هذا الكوبون مخصص لـ [${coupon.applicableGameName || 'لعبة محددة'}] فقط ولا يعمل مع لعبة أخرى.`
        };
      }
    }

    // Calculate discount amount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.round((orderAmount * (coupon.discountValue / 100)) * 100) / 100;
      if (coupon.maxDiscountLimitEGP && discount > coupon.maxDiscountLimitEGP) {
        discount = coupon.maxDiscountLimitEGP;
      }
    } else {
      discount = Math.min(orderAmount, coupon.discountValue);
    }

    return {
      valid: true,
      discountAmount: discount,
      coupon,
      message: `تم التحقق بنجاح: خصم ${discount} ج (${coupon.title})`
    };
  }

  public validateAndApplyCoupon(
    codeStr: string,
    orderAmount: number,
    customerId?: string,
    playerGameId?: string,
    customerPhone?: string,
    customerCode?: string
  ): {
    valid: boolean;
    discountAmount: number;
    coupon?: Coupon;
    message: string;
  } {
    return this.validateCoupon(codeStr, orderAmount, {
      customerId,
      customerPhone,
      customerCode
    });
  }

  public redeemCouponAtomically(
    codeStr: string,
    details: {
      customerName?: string;
      customerPhone?: string;
      customerCode?: string;
      customerId?: string;
      ticketNumber?: string;
      ticketId?: string;
      staffName?: string;
      discountAmount?: number;
      orderAmount?: number;
      user?: any;
    }
  ): {
    success: boolean;
    coupon?: Coupon;
    record?: CouponUsageRecord;
    message: string;
  } {
    const clean = (codeStr || '').trim().toUpperCase();
    if (!clean) return { success: false, message: 'كود الكوبون فارغ' };

    // Direct, fresh fetch from storage for strict concurrency safety
    const coupons = this.getCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === clean);

    if (!coupon) {
      return { success: false, message: 'الكوبون غير موجود في النظام' };
    }

    // Atomic concurrency lock check
    if (coupon.type === 'single_use') {
      if (coupon.status === 'used' || (coupon.currentUsageCount || 0) >= 1) {
        return {
          success: false,
          message: 'عفواً! لقد تم استخدام هذا الكوبون ذو الاستخدام لمرة واحدة مسبقاً، والعملية ملغاة لمنع الاستخدام المزدوج.'
        };
      }

      if (coupon.singleUseType === 'customer_specific') {
        const cId = details.customerId;
        const cPhone = (details.customerPhone || '').trim();
        const cCode = (details.customerCode || '').trim().toLowerCase();

        const matchId = Boolean(coupon.targetCustomerId && cId && coupon.targetCustomerId === cId);
        const matchPhone = Boolean(coupon.targetCustomerPhone && cPhone && coupon.targetCustomerPhone.trim() === cPhone);
        const matchCode = Boolean(coupon.targetCustomerCode && cCode && coupon.targetCustomerCode.trim().toLowerCase() === cCode);

        if (!matchId && !matchPhone && !matchCode) {
          return {
            success: false,
            message: `عفواً! هذا الكوبون مخصص وحصري للعميل (${coupon.targetCustomerName || coupon.targetCustomerCode || 'المحدد'}) فقط.`
          };
        }
      }
    }

    const statusBefore = coupon.status || 'active';
    const statusAfter = coupon.type === 'single_use' ? 'used' : statusBefore;

    // Mutate state atomically
    coupon.currentUsageCount = (coupon.currentUsageCount || 0) + 1;
    if (coupon.type === 'single_use') {
      coupon.status = 'used';
      coupon.isActive = false;
      coupon.isAutoDeactivated = true;
      coupon.usedAt = new Date().toISOString();
      coupon.usedByCustomerName = details.customerName;
      coupon.usedInTicketNumber = details.ticketNumber;
    } else if (coupon.type === 'seasonal') {
      if (details.discountAmount && coupon.allocatedQuantityBudgetEGP) {
        coupon.usedQuantityBudgetEGP = (coupon.usedQuantityBudgetEGP || 0) + details.discountAmount;
      }
      if (
        (coupon.allocatedQuantityBudgetEGP && (coupon.usedQuantityBudgetEGP || 0) >= coupon.allocatedQuantityBudgetEGP) ||
        (coupon.maxUsageTotal && coupon.currentUsageCount >= coupon.maxUsageTotal)
      ) {
        coupon.status = 'expired';
        coupon.isActive = false;
        coupon.isAutoDeactivated = true;
      }
    }

    // Detailed usage record
    const usageRecord: CouponUsageRecord = {
      id: `use_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      couponId: coupon.id,
      couponCode: coupon.code,
      customerName: details.customerName || coupon.targetCustomerName || 'عميل',
      customerPhone: details.customerPhone || coupon.targetCustomerPhone || '',
      customerCode: details.customerCode || coupon.targetCustomerCode || '',
      customerId: details.customerId || coupon.targetCustomerId,
      ticketNumber: details.ticketNumber || `T-${Date.now().toString().slice(-5)}`,
      ticketId: details.ticketId,
      usageDate: new Date().toISOString().split('T')[0],
      usageTime: new Date().toLocaleTimeString('ar-EG', { hour12: false }),
      performedBy: details.staffName || 'النظام',
      staffName: details.staffName || 'النظام',
      discountAmount: details.discountAmount || 0,
      discountAmountApplied: details.discountAmount || 0,
      statusBefore,
      statusBeforeUse: statusBefore,
      statusAfter,
      statusAfterUse: statusAfter,
      appliedAt: new Date().toISOString(),
      notes: `تم تطبيق الخصم بنجاح على التذكرة ${details.ticketNumber || ''}`
    };

    coupon.usageLog = [usageRecord, ...(coupon.usageLog || [])];

    // Save atomically back to storage
    this.saveCoupon(coupon, details.user);

    // Audit log
    const userObj = details.user || { id: 'sys', name: details.staffName || 'النظام', role: 'staff', department: 'الزبائن' };
    try {
      this.addAuditLog(
        userObj,
        'edit',
        'coupon',
        coupon.id,
        `استخدام كوبون ${coupon.code} (${coupon.type === 'single_use' ? 'استخدام مرة واحدة' : coupon.type}) بخصم ${details.discountAmount} ج بالتذكرة ${details.ticketNumber}`
      );
    } catch (e) {}

    return {
      success: true,
      coupon,
      record: usageRecord,
      message: `تم اعتماد استخدام الكوبون بنجاح وتسجيل الخصم`
    };
  }

  public incrementCouponUsage(
    codeStr: string,
    ticketNumber?: string,
    customerPhone?: string,
    discountEGP?: number,
    additionalDetails?: {
      customerName?: string;
      customerCode?: string;
      customerId?: string;
      staffName?: string;
      user?: any;
    }
  ): void {
    const clean = (codeStr || '').trim().toUpperCase();
    if (!clean) return;

    this.redeemCouponAtomically(clean, {
      ticketNumber,
      customerPhone,
      discountAmount: discountEGP,
      customerName: additionalDetails?.customerName,
      customerCode: additionalDetails?.customerCode,
      customerId: additionalDetails?.customerId,
      staffName: additionalDetails?.staffName,
      user: additionalDetails?.user
    });
  }

  // --------------------------------------------------------------------------
  // 🎯 Consume Product Points & Stock from Linked JKR SubWallets or StoreWallets
  // --------------------------------------------------------------------------
  public consumeTicketProductStock(ticket: CustomerTicket, user?: any): boolean {
    if (ticket.stockDeducted) return true;
    if (!ticket.items || ticket.items.length === 0) return true;

    const games = this.getGameTree();
    const firstShippingGames = this.getFirstShippingGameTree();
    const allGames = [...games, ...firstShippingGames];
    let gamesTreeModified = false;

    const allConsumedLots: any[] = [];
    let totalFIFOCostEGP = 0;
    let totalFIFOCostUSD = 0;
    let totalConsumedPoints = 0;
    let primaryWalletName = '';
    let selectedWalletName = '';
    let hasConsumptionFailure = false;

    ticket.items.forEach(item => {
      let matchedProduct: GameProduct | undefined;

      for (const g of allGames) {
        const p = (g.products || []).find(prod => prod.id === item.productId || prod.name === item.productName);
        if (p) {
          matchedProduct = p;
          break;
        }
      }

      const itemPts = (item as any).pointsCostPerUnit ?? (item.consumedPoints && item.quantity ? item.consumedPoints / item.quantity : 0);

      const prodToUse: GameProduct = matchedProduct || {
        id: item.productId,
        name: item.productName,
        gameId: item.gameId,
        gameName: item.gameName,
        primaryWalletId: item.walletTypeId,
        walletTypeId: item.walletTypeId,
        pointsCostPerUnit: itemPts || 0
      } as any;

      if (!prodToUse.primaryWalletId && (prodToUse as any).walletSources?.length) {
        prodToUse.primaryWalletId = (prodToUse as any).walletSources.find((s: any) => s.priority === 1)?.walletId;
      }
      if (!prodToUse.pointsCostPerUnit && itemPts > 0) {
        prodToUse.pointsCostPerUnit = itemPts;
      }

      const requiredQty = item.quantity || 1;
      const pointsPerUnit = prodToUse.pointsCostPerUnit || 0;
      const pointsNeeded = pointsPerUnit * requiredQty;

      // 1. Try JKRWalletEngine (SubWallet Points - e.g. "جوجل تركي")
      if (pointsNeeded > 0) {
        const evalResult = JKRWalletEngine.evaluateProductWalletAvailability(prodToUse, requiredQty);
        if (evalResult.selectedWallet) {
          const jkrWallet = JKRWalletEngine.getWalletById(evalResult.selectedWallet.id);
          if (jkrWallet) {
            try {
              const consumeRes = JKRWalletEngine.consumeSubWalletPoints(
                ticket.ticketNumber || ticket.id,
                evalResult.selectedWallet.id,
                evalResult.pointsNeeded,
                user,
                {
                  ticketNumber: ticket.ticketNumber || ticket.id,
                  customerName: ticket.customerName,
                  customerId: ticket.customerId,
                  productName: item.productName || prodToUse.name
                }
              );
              item.consumedWalletId = evalResult.selectedWallet.id;
              item.consumedWalletName = evalResult.selectedWallet.name;
              item.consumedPoints = evalResult.pointsNeeded;
              item.pointsCostPerUnit = pointsPerUnit;
              selectedWalletName = evalResult.selectedWallet.name;
              if (prodToUse.primaryWalletId) {
                const pWallet = JKRWalletEngine.getWalletById(prodToUse.primaryWalletId);
                if (pWallet) primaryWalletName = pWallet.name;
              }

              if (consumeRes && Array.isArray(consumeRes.consumedLots)) {
                allConsumedLots.push(...consumeRes.consumedLots);
                totalFIFOCostEGP += (consumeRes.totalCostEGP || 0);
                totalFIFOCostUSD += (consumeRes.totalCostUSD || 0);
                totalConsumedPoints += evalResult.pointsNeeded;
              }
            } catch (err) {
              console.error('Failed to consume points from JKR SubWallet:', err);
              hasConsumptionFailure = true;
            }
          } else {
            // Evaluated wallet is a StoreWallet
            const storeWallets = this.getStoreWallets();
            const chosenWallet = storeWallets.find(w => w.id === evalResult.selectedWallet!.id);
            if (chosenWallet) {
              chosenWallet.pointsBalance = Math.max(-99999, (chosenWallet.pointsBalance || 0) - evalResult.pointsNeeded);
              chosenWallet.updatedAt = new Date().toISOString();
              this.saveStoreWallet(chosenWallet);
              item.consumedWalletId = chosenWallet.id;
              item.consumedWalletName = chosenWallet.name;
              item.consumedPoints = evalResult.pointsNeeded;
              item.pointsCostPerUnit = pointsPerUnit;
              selectedWalletName = chosenWallet.name;
              totalConsumedPoints += evalResult.pointsNeeded;
            } else {
              hasConsumptionFailure = true;
            }
          }
        } else {
          hasConsumptionFailure = true;
        }
      }

      // 2. Fallback to StoreWallet if candidate was a legacy StoreWallet
      if (!item.consumedWalletId) {
        const wallets = this.getStoreWallets();
        const candidateWalletIds: string[] = [];
        if (prodToUse.primaryWalletId) candidateWalletIds.push(prodToUse.primaryWalletId);
        if (Array.isArray(prodToUse.walletSources) && prodToUse.walletSources.length > 0) {
          const sorted = [...prodToUse.walletSources].sort((a, b) => a.priority - b.priority);
          sorted.forEach(s => {
            if (s.walletId && !candidateWalletIds.includes(s.walletId)) candidateWalletIds.push(s.walletId);
          });
        }
        if (prodToUse.alternativeWalletIds && prodToUse.alternativeWalletIds.length > 0) {
          candidateWalletIds.push(...prodToUse.alternativeWalletIds.filter(id => id && !candidateWalletIds.includes(id)));
        }
        if (prodToUse.walletTypeId && prodToUse.walletTypeId !== 'default' && !candidateWalletIds.includes(prodToUse.walletTypeId)) {
          candidateWalletIds.push(prodToUse.walletTypeId);
        }
        if (item.walletTypeId && item.walletTypeId !== 'default' && !candidateWalletIds.includes(item.walletTypeId)) {
          candidateWalletIds.push(item.walletTypeId);
        }

        const requiredPoints = (prodToUse.pointsCostPerUnit || 0) * requiredQty;
        const requiredCost = (item.costPrice || 0) * requiredQty;
        let chosenWallet: any = undefined;

        // Pass 1: Find candidate wallet in priority order with sufficient points / balance
        for (const cId of candidateWalletIds) {
          const w = wallets.find(wallet => wallet.id === cId);
          if (!w || (w as any).isActive === false) continue;
          if (requiredPoints > 0 && w.pointsBalance !== undefined) {
            if (w.pointsBalance >= requiredPoints) {
              chosenWallet = w;
              break;
            }
          } else if (requiredCost > 0) {
            if ((w.balance || 0) >= requiredCost) {
              chosenWallet = w;
              break;
            }
          } else {
            chosenWallet = w;
            break;
          }
        }

        // Pass 2: Fallback to first active candidate wallet if none has full balance
        if (!chosenWallet) {
          for (const cId of candidateWalletIds) {
            const w = wallets.find(wallet => wallet.id === cId);
            if (w && (w as any).isActive !== false) {
              chosenWallet = w;
              break;
            }
          }
        }

        if (chosenWallet) {
          if (chosenWallet.pointsBalance !== undefined && requiredPoints > 0) {
            chosenWallet.pointsBalance = Math.max(-99999, (chosenWallet.pointsBalance || 0) - requiredPoints);
            item.consumedPoints = requiredPoints;
            item.pointsCostPerUnit = prodToUse.pointsCostPerUnit || 0;
          } else if (requiredCost > 0) {
            chosenWallet.balance = chosenWallet.balance - requiredCost;
          }
          chosenWallet.updatedAt = new Date().toISOString();
          this.saveStoreWallet(chosenWallet);
          item.consumedWalletId = chosenWallet.id;
          item.consumedWalletName = chosenWallet.name;
        }
      }

      // 3. Decrement available product quantity if tracked
      if (matchedProduct && matchedProduct.availableQuantity !== undefined && matchedProduct.availableQuantity !== null) {
        matchedProduct.availableQuantity = Math.max(0, matchedProduct.availableQuantity - requiredQty);
        if (matchedProduct.availableQuantity === 0) {
          matchedProduct.isActive = false;
          matchedProduct.disabledReason = 'نفدت الكمية المتاحة بالكامل (Auto-Deactivated)';
        }
        gamesTreeModified = true;
      }
    });

    if (gamesTreeModified) {
      this.setItem(STORAGE_KEYS.GAMES_TREE, games);
    }

    if (allConsumedLots.length > 0) {
      const avgExchangeRate = totalFIFOCostUSD > 0
        ? Math.round((totalFIFOCostEGP / totalFIFOCostUSD) * 1000) / 1000
        : (allConsumedLots[0]?.exchangeRateUsed || 50);

      if (!ticket.walletSnapshot) {
        ticket.walletSnapshot = {} as any;
      }
      const wSnap = ticket.walletSnapshot!;
      wSnap.primaryWalletName = primaryWalletName || wSnap.primaryWalletName || selectedWalletName;
      wSnap.selectedWalletName = selectedWalletName || wSnap.selectedWalletName;
      wSnap.consumedLots = allConsumedLots;
      wSnap.actualCostEGP = totalFIFOCostEGP;
      wSnap.actualCostUSD = totalFIFOCostUSD;
      wSnap.exchangeRateUsed = avgExchangeRate;
      wSnap.totalPointsConsumed = totalConsumedPoints;

      if (!ticket.pricingSnapshot) {
        ticket.pricingSnapshot = {} as any;
      }
      const pSnap = ticket.pricingSnapshot!;
      pSnap.actualFIFOCostUSD = totalFIFOCostUSD;
      pSnap.actualFIFOCostEGP = totalFIFOCostEGP;
      pSnap.exchangeRateUsed = avgExchangeRate;
      pSnap.usdExchangeRateAtPurchase = avgExchangeRate;
      pSnap.consumedLots = allConsumedLots;

      ticket.consumedSources = allConsumedLots;
      ticket.totalCostAmount = totalFIFOCostEGP;

      // Net profit calculation: Golden Rule:
      // Profit = Effective Revenue - FIFO Cost - Cashback - Referral - Operational Expenses
      // If received < required: profit is calculated based on received amount.
      // If received >= required: profit is calculated based on required amount.
      const reqAmount = ticket.requiredAmount ?? pSnap.grossSellingPriceEGP ?? 0;
      const recAmount = ticket.receivedAmount ?? 0;
      const revenueForProfit = (recAmount > 0 && recAmount < reqAmount) ? recAmount : reqAmount;
      const cashbackEGP = ticket.cashbackEarned ?? pSnap.cashbackAmountEGP ?? 0;
      const referralEGP = ticket.referralCommissionEarned ?? pSnap.referralCommissionAmountEGP ?? 0;
      const fixedCostEGP = ticket.fixedCostAmount ?? pSnap.fixedCostEGP ?? pSnap.operationalExpensesEGP ?? 0;
      const calculatedNetProfit = Math.round((revenueForProfit - totalFIFOCostEGP - cashbackEGP - referralEGP - fixedCostEGP) * 100) / 100;

      ticket.netProfit = calculatedNetProfit;
      pSnap.netCompanyProfitEGP = calculatedNetProfit;
      wSnap.netProfitEGP = calculatedNetProfit;
    }
    if (hasConsumptionFailure) {
      ticket.stockDeducted = false;
      return false;
    }

    ticket.stockDeducted = true;
    if (ticket.department === 'dealers') {
      this.saveDealerTicket(ticket);
    } else {
      this.saveTicket(ticket);
    }
    // Note: FIFO consumes lots for accounting (Actual Cost & Net Profit) without changing catalog selling price

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }

    return true;
  }

  // Automatic 100% Top-Up Ticket Completion & Reward Engine
  public completeTopUpTicket(ticketId: string, completedBy: string, allowEarlyDelivery = false): { success: boolean; message: string } {
    const tickets = this.getTickets();
    let ticket = tickets.find(t => t.id === ticketId);
    let isDealerTicket = false;
    if (!ticket) {
      ticket = this.getDealerTickets().find(t => t.id === ticketId);
      if (ticket) isDealerTicket = true;
    }
    if (!ticket) return { success: false, message: 'التذكرة غير موجودة' };
    if (ticket.status === 'completed') return { success: false, message: 'التذكرة مكتملة مسبقاً' };

    // Prevent premature completion of reservations before their scheduled date and time (unless explicitly delivered early)
    const isReservation = ticket.isReservation || ticket.operationMode === 'reservation';
    if (!allowEarlyDelivery && isReservation && ticket.scheduledDeliveryDate) {
      const now = new Date();
      const timePart = ticket.scheduledDeliveryTime || '00:00';
      const scheduledDateTime = new Date(`${ticket.scheduledDeliveryDate}T${timePart}:00`);
      const hasArrived = isNaN(scheduledDateTime.getTime())
        ? (ticket.scheduledDeliveryDate <= now.toISOString().split('T')[0])
        : (now.getTime() >= scheduledDateTime.getTime());

      if (!hasArrived) {
        return {
          success: false,
          message: `لا يمكن إكمال تذكرة الحجز قبل حلول موعد التسليم المحدد (${ticket.scheduledDeliveryDate} ${ticket.scheduledDeliveryTime ? `الساعة ${ticket.scheduledDeliveryTime}` : ''})`
        };
      }
    }

    // 1. Mark Ticket as Completed & Calculate Duration in minutes
    ticket.status = 'completed';
    ticket.completedAt = new Date().toISOString();
    ticket.assignedTo = completedBy;
    if (ticket.isReservation || ticket.operationMode === 'reservation') {
      ticket.reservationStatus = 'delivered';
      ticket.reservationDeliveredAt = new Date().toISOString();
      ticket.reservationDeliveredBy = completedBy;
    }
    const durationMinutes = Math.max(
      1,
      Math.round((new Date().getTime() - new Date(ticket.createdAt).getTime()) / 60000)
    );
    ticket.executionDurationMinutes = durationMinutes;

    // 2. Exact Proportional Cashback (Using customer's custom or default 1% rate, NO 2 EGP minimum floor, keeping exact decimals)
    // Product-level isCashbackEnabled & isReferralEnabled respect
    const cust = this.getCustomerById(ticket.customerId) || this.findCustomerByPhone(ticket.customerPhone);
    const dealerTarget = isDealerTicket ? (this.getDealerById(ticket.customerId) || this.findDealerByPhone(ticket.customerPhone)) : undefined;
    const customerCashbackRate = cust?.cashbackRate ?? (dealerTarget?.cashbackRate ?? (isDealerTicket ? 0.5 : 1.0));
    const allGames = [...this.getFirstShippingGameTree(), ...this.getGameTree()];

    let eligibleCashbackSaleAmount = 0;
    let eligibleReferralSaleAmount = 0;

    if (ticket.items && ticket.items.length > 0) {
      for (const item of ticket.items) {
        let pFound: GameProduct | undefined;
        let gFound: GameTreeItem | undefined;
        for (const g of allGames) {
          const p = (g.products || []).find(prod => prod.id === item.productId || prod.name === item.productName);
          if (p) { pFound = p; gFound = g; break; }
        }
        const itemAmount = item.totalPrice || ((item.unitPrice || 0) * (item.quantity || 1)) || 0;
        const cbEnabled = gFound?.cashbackEnabled !== false && pFound?.isCashbackEnabled !== false;
        const refEnabled = gFound?.referralEnabled !== false && pFound?.isReferralEnabled !== false;

        if (cbEnabled) eligibleCashbackSaleAmount += itemAmount;
        if (refEnabled) eligibleReferralSaleAmount += itemAmount;
      }
    } else {
      const baseSale = ticket.totalProductsAmount || ticket.requiredAmount || ticket.receivedAmount || 0;
      eligibleCashbackSaleAmount = baseSale;
      eligibleReferralSaleAmount = baseSale;
    }

    const saleAmount = ticket.totalProductsAmount || ticket.requiredAmount || ticket.receivedAmount || 0;

    // Strict Exact Product Cashback Resolution
    // Priority: Product (المنتج) -> Ticket (التذكرة) -> Fallback
    let cashbackAmount = 0;
    let appliedCbRate = 0;

    if (ticket.cashbackEarned !== undefined && ticket.cashbackEarned !== null && ticket.cashbackEarned > 0) {
      // 1. Ticket already holds the exact calculated cashback from items at creation
      cashbackAmount = ticket.cashbackEarned;
      appliedCbRate = ticket.cashbackPercent !== undefined
        ? ticket.cashbackPercent
        : (saleAmount > 0 ? Math.round((cashbackAmount / saleAmount) * 10000) / 100 : 0);
    } else if (ticket.items && ticket.items.length > 0) {
      // 2. Sum directly from items' exact product cashback
      const itemsCashbackSum = ticket.items.reduce((s, itm) => s + (itm.cashbackAmountEGP !== undefined ? itm.cashbackAmountEGP : 0), 0);
      if (itemsCashbackSum > 0) {
        cashbackAmount = Math.round(itemsCashbackSum * 100) / 100;
        appliedCbRate = ticket.items[0]?.cashbackPercent !== undefined
          ? ticket.items[0].cashbackPercent
          : (saleAmount > 0 ? Math.round((cashbackAmount / saleAmount) * 10000) / 100 : 0);
      } else if (eligibleCashbackSaleAmount > 0) {
        const effectiveRate = ticket.cashbackPercent !== undefined && ticket.cashbackPercent > 0
          ? ticket.cashbackPercent
          : customerCashbackRate;
        cashbackAmount = Math.round((eligibleCashbackSaleAmount * (effectiveRate / 100)) * 100) / 100;
        appliedCbRate = effectiveRate;
      }
    } else {
      // 3. Fallback only if no items
      const effectiveRate = ticket.cashbackPercent !== undefined && ticket.cashbackPercent > 0
        ? ticket.cashbackPercent
        : customerCashbackRate;
      cashbackAmount = Math.round((eligibleCashbackSaleAmount * (effectiveRate / 100)) * 100) / 100;
      appliedCbRate = effectiveRate;
    }

    ticket.cashbackEarned = cashbackAmount;
    ticket.cashbackPercent = appliedCbRate;
    ticket.cashbackPercentage = appliedCbRate;

    if (cust) {
      const allUnifiedTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.CASHBACK, initialUnifiedWalletTransactions);
      // 3. Deduct Split Referral Balance if used (guarded against duplicate redemption)
      const alreadyRedeemedRef = allUnifiedTxs.some(t => t.customerId === ticket.customerId && t.orderNumber === ticket.ticketNumber && t.walletType === 'referral' && t.type === 'redeemed');
      if (!alreadyRedeemedRef && ticket.referralBalanceUsed && ticket.referralBalanceUsed > 0) {
        this.addUnifiedWalletTransaction({
          customerId: ticket.customerId,
          walletType: 'referral',
          type: 'redeemed',
          operationName: `سداد جزئي لتذكرة ${ticket.ticketNumber}`,
          amount: ticket.referralBalanceUsed,
          balanceAfter: cust.referralWalletBalance,
          orderNumber: ticket.ticketNumber
        });
      }

      // 4. Deduct Account Credit if used (guarded against duplicate redemption)
      const alreadyRedeemedAcc = allUnifiedTxs.some(t => t.customerId === ticket.customerId && t.orderNumber === ticket.ticketNumber && t.walletType === 'account_balance' && t.type === 'redeemed');
      if (!alreadyRedeemedAcc && ticket.accountBalanceUsed && ticket.accountBalanceUsed > 0 && !ticket.creditDeducted) {
        cust.accountBalance = (cust.accountBalance || 0) - ticket.accountBalanceUsed;
        this.addUnifiedWalletTransaction({
          customerId: ticket.customerId,
          walletType: 'account_balance',
          type: 'redeemed',
          operationName: `استخدام رصيد دائن لسداد تذكرة ${ticket.ticketNumber}`,
          amount: ticket.accountBalanceUsed,
          balanceAfter: cust.accountBalance,
          orderNumber: ticket.ticketNumber
        });
        this.debitTrustFromSystemWallet(ticket.accountBalanceUsed, cust.name, 'سداد تذكرة من رصيد الأمانات والديون عند التسليم', ticket.ticketNumber);
        ticket.creditDeducted = true;
      }

      // 5. Handle Overpayment (Credit) vs Underpayment (Debit)
      if (!ticket.overpaymentSettled && ticket.overpaymentAmount && ticket.overpaymentAmount > 0) {
        cust.accountBalance = Math.round(((cust.accountBalance || 0) + ticket.overpaymentAmount) * 100) / 100;
        cust.balance = cust.accountBalance;
        this.addUnifiedWalletTransaction({
          customerId: ticket.customerId,
          walletType: 'account_balance',
          type: 'credit',
          operationName: `فائض دفع لتذكرة ${ticket.ticketNumber} (+${ticket.overpaymentAmount} ج)`,
          amount: ticket.overpaymentAmount,
          balanceAfter: cust.accountBalance,
          orderNumber: ticket.ticketNumber
        });
        ticket.overpaymentSettled = true;
        ticket.balanceSettled = true;
      } else if (!ticket.shortageSettled && ticket.shortageAmount && ticket.shortageAmount > 0) {
        cust.accountBalance = Math.round(((cust.accountBalance || 0) - ticket.shortageAmount) * 100) / 100;
        cust.balance = cust.accountBalance;
        this.addUnifiedWalletTransaction({
          customerId: ticket.customerId,
          walletType: 'account_balance',
          type: 'debit',
          operationName: `عجز دفع لتذكرة ${ticket.ticketNumber} (-${ticket.shortageAmount} ج)`,
          amount: ticket.shortageAmount,
          balanceAfter: cust.accountBalance,
          orderNumber: ticket.ticketNumber
        });
        ticket.shortageSettled = true;
        ticket.balanceSettled = true;
      }

      // 6. Update First Order Flag
      if (ticket.ticketType === 'first_shipping') {
        cust.hasUsedFirstOrderDiscount = true;
      }

      // 7. Update Customer Total Spent & Orders
      cust.totalSpent = (cust.totalSpent || 0) + (ticket.receivedAmount || ticket.requiredAmount || 0);
      cust.totalOrders = (cust.totalOrders || 0) + 1;
      cust.lastPurchaseDate = new Date().toISOString();
      this.saveCustomer(cust);
    }

    // 7.1 Handle Dealer Account & Balances (if ticket belongs to a Dealer)
    const dealer = this.getDealerById(ticket.customerId) || this.findDealerByPhone(ticket.customerPhone) || this.getDealerById(ticket.customerPhone);
    if (dealer) {
      const allDealerTxs = this.getItem<UnifiedWalletTransaction[]>(STORAGE_KEYS.DEALER_TRANSACTIONS, []);
      const alreadyRedeemedCb = allDealerTxs.some(t => t.customerId === dealer.id && t.orderNumber === ticket.ticketNumber && t.walletType === 'cashback' && t.type === 'redeemed');
      if (!alreadyRedeemedCb && ticket.cashbackUsed && ticket.cashbackUsed > 0) {
        this.addDealerUnifiedWalletTransaction({
          customerId: dealer.id,
          walletType: 'cashback',
          type: 'redeemed',
          operationName: `استخدام كاش باك لسداد تذكرة تاجر #${ticket.ticketNumber}`,
          amount: ticket.cashbackUsed,
          balanceAfter: dealer.cashbackBalance,
          orderNumber: ticket.ticketNumber
        });
      }
      const alreadyRedeemedRef = allDealerTxs.some(t => t.customerId === dealer.id && t.orderNumber === ticket.ticketNumber && t.walletType === 'referral' && t.type === 'redeemed');
      if (!alreadyRedeemedRef && ticket.referralBalanceUsed && ticket.referralBalanceUsed > 0) {
        this.addDealerUnifiedWalletTransaction({
          customerId: dealer.id,
          walletType: 'referral',
          type: 'redeemed',
          operationName: `سداد جزئي لتذكرة تاجر #${ticket.ticketNumber}`,
          amount: ticket.referralBalanceUsed,
          balanceAfter: dealer.referralWalletBalance,
          orderNumber: ticket.ticketNumber
        });
      }
      const alreadyRedeemedAcc = allDealerTxs.some(t => t.customerId === dealer.id && t.orderNumber === ticket.ticketNumber && t.walletType === 'account_balance' && t.type === 'redeemed');
      if (!alreadyRedeemedAcc && ticket.accountBalanceUsed && ticket.accountBalanceUsed > 0 && !ticket.creditDeducted) {
        dealer.accountBalance = Math.round(((dealer.accountBalance || 0) - ticket.accountBalanceUsed) * 100) / 100;
        dealer.balance = dealer.accountBalance;
        this.addDealerUnifiedWalletTransaction({
          customerId: dealer.id,
          walletType: 'account_balance',
          type: 'redeemed',
          operationName: `استخدام رصيد دائن لسداد تذكرة تاجر #${ticket.ticketNumber}`,
          amount: ticket.accountBalanceUsed,
          balanceAfter: dealer.accountBalance,
          orderNumber: ticket.ticketNumber
        });
        this.debitTrustFromSystemWallet(ticket.accountBalanceUsed, dealer.name, 'سداد تذكرة تاجر من رصيد الأمانات والديون عند التسليم', ticket.ticketNumber, true);
        ticket.creditDeducted = true;
      }
      if (!ticket.overpaymentSettled && ticket.overpaymentAmount && ticket.overpaymentAmount > 0) {
        dealer.accountBalance = Math.round(((dealer.accountBalance || 0) + ticket.overpaymentAmount) * 100) / 100;
        dealer.balance = dealer.accountBalance;
        this.addDealerUnifiedWalletTransaction({
          customerId: dealer.id,
          walletType: 'account_balance',
          type: 'credit',
          operationName: `فائض دفع لتذكرة تاجر #${ticket.ticketNumber} (+${ticket.overpaymentAmount} ج)`,
          amount: ticket.overpaymentAmount,
          balanceAfter: dealer.accountBalance,
          orderNumber: ticket.ticketNumber
        });
        ticket.overpaymentSettled = true;
        ticket.balanceSettled = true;
      } else if (!ticket.shortageSettled && ticket.shortageAmount && ticket.shortageAmount > 0) {
        dealer.accountBalance = Math.round(((dealer.accountBalance || 0) - ticket.shortageAmount) * 100) / 100;
        dealer.balance = dealer.accountBalance;
        this.addDealerUnifiedWalletTransaction({
          customerId: dealer.id,
          walletType: 'account_balance',
          type: 'debit',
          operationName: `عجز دفع لتذكرة تاجر #${ticket.ticketNumber} (-${ticket.shortageAmount} ج)`,
          amount: ticket.shortageAmount,
          balanceAfter: dealer.accountBalance,
          orderNumber: ticket.ticketNumber
        });
        ticket.shortageSettled = true;
        ticket.balanceSettled = true;
      }

      dealer.totalSpent = (dealer.totalSpent || 0) + (ticket.receivedAmount || ticket.requiredAmount || 0);
      dealer.totalOrders = (dealer.totalOrders || 0) + 1;
      dealer.lastPurchaseDate = new Date().toISOString();
      this.saveDealer(dealer);

      if (cashbackAmount > 0) {
        this.addDealerUnifiedWalletTransaction({
          customerId: dealer.id,
          walletType: 'cashback',
          type: 'earned',
          operationName: `كاش باك حافز جملة ${customerCashbackRate}% لتذكرة #${ticket.ticketNumber}`,
          amount: cashbackAmount,
          balanceAfter: dealer.cashbackBalance,
          orderNumber: ticket.ticketNumber
        });
        if (!ticket.cashbackSynced) {
          this.creditCashbackToSystemWallet(cashbackAmount, dealer.name, ticket.ticketNumber, true);
          ticket.cashbackSynced = true;
        }
        const updatedDealer = this.getDealerById(dealer.id);
        if (updatedDealer) {
          ticket.cashbackBalanceSnapshot = updatedDealer.cashbackBalance;
          ticket.primaryBalanceSnapshot = updatedDealer.balance;
          ticket.referralBalanceSnapshot = updatedDealer.referralWalletBalance;
        }
      }

      // Check Dealer Referral Commission
      let dealerReferralAwarded = false;
      if (dealer.referredByCode) {
        const dealerReferrer = this.getDealers(true).find(
          d => d.referralCode?.trim().toUpperCase() === dealer.referredByCode?.trim().toUpperCase()
        );
        if (dealerReferrer && !dealerReferrer.isFrozen && dealerReferrer.status !== 'suspended') {
          const { rate, commissionTypeLabel } = DealerPerformanceService.getEffectiveCommissionRate(
            dealerReferrer,
            dealer.referralLinkedAt || dealer.createdAt || ticket.createdAt
          );
          const effectiveRate = ticket.referralPercent !== undefined
            ? ticket.referralPercent
            : ticket.referralPercentage !== undefined
              ? ticket.referralPercentage
              : rate;
          const commAmount = (ticket.referralCommissionEarned !== undefined && ticket.referralCommissionEarned >= 0 && ticket.referralPercent !== undefined)
            ? ticket.referralCommissionEarned
            : Math.round((eligibleReferralSaleAmount * (effectiveRate / 100)) * 100) / 100;
          if (commAmount > 0 && !ticket.referralCommissionProcessed) {
            dealerReferrer.referralWalletBalance = Math.round(((dealerReferrer.referralWalletBalance || 0) + commAmount) * 100) / 100;
            dealerReferrer.totalReferralCommissionEarned = Math.round(((dealerReferrer.totalReferralCommissionEarned || 0) + commAmount) * 100) / 100;
            this.saveDealer(dealerReferrer);
            this.addDealerUnifiedWalletTransaction({
              customerId: dealerReferrer.id,
              walletType: 'referral',
              type: 'commission',
              operationName: `${commissionTypeLabel} (${effectiveRate}%) من تذكرة تاجر ${dealer.name} #${ticket.ticketNumber}`,
              amount: commAmount,
              balanceAfter: dealerReferrer.referralWalletBalance,
              orderNumber: ticket.ticketNumber
            });
            this.creditReferralToSystemWallet(commAmount, dealerReferrer.name, ticket.ticketNumber, true);
            ticket.referralCommissionProcessed = true;
            ticket.referralCommissionEarned = commAmount;
            ticket.referralPercent = effectiveRate;
            ticket.referralPercentage = effectiveRate;
            dealerReferralAwarded = true;
          }
        }
      }

      // If dealer has NO valid referral partner, convert referral amount to profit allowance (بدل إحالة)
      if (!dealerReferralAwarded) {
        const unlinkedComm = ticket.referralCommissionEarned || ticket.referralAllowance || 0;
        if (unlinkedComm > 0) {
          ticket.referralAllowance = unlinkedComm;
          ticket.referralAllowanceReason = 'بدل إحالة (تاجر غير مرتبط بإحالة)';
          if (ticket.referralCommissionEarned && ticket.referralCommissionEarned > 0) {
            ticket.netProfit = Math.round(((ticket.netProfit || 0) + ticket.referralCommissionEarned) * 100) / 100;
            ticket.totalProfitMargin = ticket.netProfit;
            ticket.referralCommissionEarned = 0;
          }
          ticket.referralCommissionProcessed = true;
        }
      }
    }

    // 8. Add to Customer Cashback Ledger (Retaining exact decimals, e.g. 0.35 EGP)
    if (cashbackAmount > 0 && cust) {
      this.addUnifiedWalletTransaction({
        customerId: ticket.customerId,
        walletType: 'cashback',
        type: 'earned',
        operationName: `كاش باك ${ticket.cashbackPercent ?? appliedCbRate}% لتذكرة ${ticket.ticketNumber}`,
        amount: cashbackAmount,
        balanceAfter: cust.cashbackBalance,
        orderNumber: ticket.ticketNumber
      });
      if (!ticket.cashbackSynced) {
        this.creditCashbackToSystemWallet(cashbackAmount, cust.name, ticket.ticketNumber);
        ticket.cashbackSynced = true;
      }
      const updatedCust = this.getCustomerById(cust.id);
      if (updatedCust) {
        ticket.cashbackBalanceSnapshot = updatedCust.cashbackBalance;
        ticket.primaryBalanceSnapshot = updatedCust.accountBalance !== undefined ? updatedCust.accountBalance : updatedCust.balance;
        ticket.referralBalanceSnapshot = updatedCust.referralWalletBalance;
        eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, updatedCust);
      }
    }

    // 9. Check Referral Commission for Referrer (First Month vs Lifetime logic & Update Relationships)
    let customerReferralAwarded = false;
    const customer = this.getCustomerById(ticket.customerId);
    if (customer && customer.referredByCode) {
      const referrer = this.getCustomers(true).find(
        c => c.referralCode?.trim().toUpperCase() === customer.referredByCode?.trim().toUpperCase()
      );
      if (referrer && !referrer.isFrozen && referrer.status !== 'suspended') {
        const { rate, commissionTypeLabel } =
          PartnerPerformanceService.getEffectiveCommissionRate(
            referrer,
            customer.referralLinkedAt || customer.createdAt || ticket.createdAt,
            customer
          );

        const effectiveRate = ticket.referralPercent !== undefined
          ? ticket.referralPercent
          : ticket.referralPercentage !== undefined
            ? ticket.referralPercentage
            : rate;

        const commissionAmount = (ticket.referralCommissionEarned !== undefined && ticket.referralCommissionEarned >= 0 && ticket.referralPercent !== undefined)
          ? ticket.referralCommissionEarned
          : Math.round((eligibleReferralSaleAmount * (effectiveRate / 100)) * 100) / 100;

        if (commissionAmount > 0 && !ticket.referralCommissionProcessed) {
          referrer.referralWalletBalance = Math.round(((referrer.referralWalletBalance || 0) + commissionAmount) * 100) / 100;
          referrer.totalReferralCommissionEarned = Math.round(((referrer.totalReferralCommissionEarned || 0) + commissionAmount) * 100) / 100;
          this.saveCustomer(referrer);
          this.addUnifiedWalletTransaction({
            customerId: referrer.id,
            walletType: 'referral',
            type: 'commission',
            operationName: `${commissionTypeLabel} (${effectiveRate}%) من تذكرة ${customer.name} #${ticket.ticketNumber}`,
            amount: commissionAmount,
            balanceAfter: referrer.referralWalletBalance,
            orderNumber: ticket.ticketNumber
          });
          this.creditReferralToSystemWallet(commissionAmount, referrer.name, ticket.ticketNumber);
          ticket.referralCommissionProcessed = true;
          ticket.referralCommissionEarned = commissionAmount;
          ticket.referralPercent = effectiveRate;
          ticket.referralPercentage = effectiveRate;
          customerReferralAwarded = true;
          eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, referrer);

          // Update CustomerReferral database record
          const allReferrals = this.getItem<CustomerReferral[]>(STORAGE_KEYS.REFERRALS, initialReferrals);
          const refRecord = allReferrals.find(
            r =>
              r.referredCustomerId === customer.id ||
              (r.referrerCustomerId === referrer.id && r.referredCustomerPhone === customer.phone)
          );
          if (refRecord) {
            refRecord.totalCommissionFromReferral =
              Math.round(((refRecord.totalCommissionFromReferral || 0) + commissionAmount) * 100) / 100;
            refRecord.totalSpentByReferred =
              Math.round(((refRecord.totalSpentByReferred || 0) + saleAmount) * 100) / 100;
            refRecord.ticketsCountByReferred = (refRecord.ticketsCountByReferred || 0) + 1;
            refRecord.hasMadeFirstOrder = true;
            this.setItem(STORAGE_KEYS.REFERRALS, allReferrals);
          }
        }
      }
    }

    // If customer has NO valid referral partner, convert referral amount to profit allowance (بدل إحالة)
    if (!isDealerTicket && !customerReferralAwarded) {
      const unlinkedComm = ticket.referralCommissionEarned || ticket.referralAllowance || 0;
      if (unlinkedComm > 0) {
        ticket.referralAllowance = unlinkedComm;
        ticket.referralAllowanceReason = 'بدل إحالة (عميل غير مرتبط بإحالة)';
        if (ticket.referralCommissionEarned && ticket.referralCommissionEarned > 0) {
          ticket.netProfit = Math.round(((ticket.netProfit || 0) + ticket.referralCommissionEarned) * 100) / 100;
          ticket.totalProfitMargin = ticket.netProfit;
          ticket.referralCommissionEarned = 0;
        }
        ticket.referralCommissionProcessed = true;
      }
    }

    // 10. Automatic Stock & Priority Wallet Cascade Deductions for each item
    if (!ticket.stockDeducted) {
      this.consumeTicketProductStock(ticket, {
        id: completedBy,
        name: completedBy,
        role: 'user'
      });
    }

    // 11. Deduct holding reservation funds from w_trust upon product delivery
    if (isReservation && !ticket.reservationTrustDeducted) {
      const holdingAmount = ticket.reservationTrustHeld !== undefined
        ? ticket.reservationTrustHeld
        : (ticket.receivedAmount || ticket.requiredAmount || 0);

      if (holdingAmount > 0) {
        const clientName = cust?.name || dealer?.name || ticket.customerName || 'العميل';
        this.debitTrustFromSystemWallet(
          holdingAmount,
          clientName,
          'تسليم منتج حجز وإخلاء مبلغ الأمانة المحتجزة بمحفظة الأمانات',
          ticket.ticketNumber
        );
        ticket.reservationTrustDeducted = true;
      }
    }

    // 12. Update FIFO Inventory Bond if active
    const bonds = this.getDepositBondsFIFO();
    for (const b of bonds) {
      if (b.remainingUnits > 0) {
        b.remainingUnits = Math.max(0, b.remainingUnits - 1);
        break;
      }
    }
    this.setItem(STORAGE_KEYS.DEPOSIT_BONDS_FIFO, bonds);

    // Record profit or loss to system wallets (mw_profits for dealer, w_profits for retail)
    if (!ticket.profitSynced) {
      const net = ticket.netProfit !== undefined ? ticket.netProfit : (ticket.totalProfitMargin || 0);
      this.recordProfitOrLossToSystemWallet(net, ticket.ticketNumber, {
        customerName: ticket.customerName,
        gameName: ticket.items?.[0]?.gameName,
        referralAllowance: ticket.referralAllowance,
        isDealer: isDealerTicket
      });
      ticket.profitSynced = true;
    }

    // Record operating expenses to w_operating_expenses System Wallet
    const ticketExpenses = ticket.fixedCostAmount !== undefined
      ? ticket.fixedCostAmount
      : (ticket.pricingSnapshot?.fixedCostEGP || 0);
    if (ticketExpenses > 0) {
      this.recordOperatingExpenseToSystemWallet(
        ticketExpenses,
        ticket.ticketNumber,
        `مصاريف تشغيل وسيرفرات لتذكرة مكتملة #${ticket.ticketNumber}`,
        {
          customerName: ticket.customerName,
          gameName: ticket.items?.[0]?.gameName
        }
      );
    }

    if (isDealerTicket) {
      this.saveDealerTicket(ticket);
    } else {
      this.saveTicket(ticket);
    }
    return { success: true, message: 'تم إكمال التذكرة، تسليم المنتج، خصم الأمانة ومحفظة البضاعة وتحديث الأرصدة بنجاح' };
  }

  // 13. Update Ticket Lifecycle Status with Audit History
  public updateTicketStatus(
    ticketId: string,
    newStatus: TicketLifecycleStatus,
    user?: { fullName?: string; role?: string; id?: string; name?: string },
    notes?: string,
    allowEarlyDelivery = false
  ): { success: boolean; message: string } {
    let ticket = this.getTicketById(ticketId);
    let isDealer = false;
    if (!ticket) {
      ticket = this.getDealerTicketById(ticketId);
      if (ticket) isDealer = true;
    }
    if (!ticket) return { success: false, message: 'التذكرة غير موجودة' };

    // Prevent premature completion of reservations before scheduled date and time (unless early delivery allowed)
    if (!allowEarlyDelivery && newStatus === 'completed') {
      const isReservation = ticket.isReservation || ticket.operationMode === 'reservation';
      if (isReservation && ticket.scheduledDeliveryDate) {
        const now = new Date();
        const timePart = ticket.scheduledDeliveryTime || '00:00';
        const scheduledDateTime = new Date(`${ticket.scheduledDeliveryDate}T${timePart}:00`);
        const hasArrived = isNaN(scheduledDateTime.getTime())
          ? (ticket.scheduledDeliveryDate <= now.toISOString().split('T')[0])
          : (now.getTime() >= scheduledDateTime.getTime());

        if (!hasArrived) {
          return {
            success: false,
            message: `لا يمكن إكمال تذكرة الحجز قبل حلول موعد التسليم المحدد (${ticket.scheduledDeliveryDate} ${ticket.scheduledDeliveryTime ? `الساعة ${ticket.scheduledDeliveryTime}` : ''})`
          };
        }
      }
    }

    if (newStatus === 'completed') {
      return this.completeTopUpTicket(ticketId, user?.fullName || user?.name || 'المسؤول', allowEarlyDelivery);
    }

    const prevStatus = ticket.status;
    ticket.status = newStatus;
    ticket.updatedAt = new Date().toISOString();

    if (newStatus === 'refunded' && prevStatus !== 'refunded') {
      return this.refundTicket(ticketId, ticket.paymentWalletId || 'w_voda', notes || 'استرداد التذكرة', user);
    }

    if (newStatus === 'canceled' && prevStatus !== 'canceled') {
      try {
        this.rollbackTicketFinancials(
          ticket,
          user ? { id: user.id || 'usr', name: user.fullName || user.name || 'المسؤول', role: user.role || 'admin' } : undefined,
          notes || 'إلغاء التذكرة'
        );
      } catch (err) {
        console.warn('Error rolling back financials on ticket cancel:', err);
      }
    }

    if (newStatus === 'canceled' && (ticket.isReservation || ticket.operationMode === 'reservation')) {
      ticket.reservationStatus = 'cancelled';
      if (!ticket.reservationTrustDeducted) {
        const holdingAmount = ticket.reservationTrustHeld !== undefined
          ? ticket.reservationTrustHeld
          : (ticket.receivedAmount || ticket.requiredAmount || 0);
        if (holdingAmount > 0) {
          const clientName = ticket.customerName || 'العميل';
          this.debitTrustFromSystemWallet(
            holdingAmount,
            clientName,
            'إلغاء حجز وإخلاء مبلغ الأمانة المحتجزة بمحفظة الأمانات',
            ticket.ticketNumber
          );
          ticket.reservationTrustDeducted = true;
        }
      }
    }

    const logEntry: TicketHistoryLogItem = {
      id: 'log_' + Date.now(),
      action: `تغيير الحالة من [${prevStatus}] إلى [${newStatus}]`,
      previousStatus: prevStatus,
      newStatus,
      performedBy: user?.fullName || user?.name || 'النظام',
      timestamp: new Date().toISOString(),
      notes
    };

    ticket.historyLog = [...(ticket.historyLog || []), logEntry];
    if (isDealer) {
      this.saveDealerTicket(ticket);
    } else {
      this.saveTicket(ticket);
    }

    this.logAction(
      { id: user?.id || 'usr', name: user?.fullName || user?.name || 'مستخدم', role: user?.role || 'user', department: 'التذاكر' },
      'edit',
      'تحديث حالة التذكرة',
      ticket.id,
      ticket.ticketNumber,
      `تم تغيير حالة التذكرة #${ticket.ticketNumber} من ${prevStatus} إلى ${newStatus}`
    );

    return { success: true, message: `تم تحديث حالة التذكرة إلى ${newStatus}` };
  }

  // 14. Add Note to Ticket History
  public addTicketNote(
    ticketId: string,
    content: string,
    authorName: string
  ): { success: boolean; message: string } {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return { success: false, message: 'التذكرة غير موجودة' };

    const newNote: TicketNoteItem = {
      id: 'note_' + Date.now(),
      content: content.trim(),
      authorName: authorName || 'المستخدم',
      createdAt: new Date().toISOString()
    };

    ticket.notesList = [...(ticket.notesList || []), newNote];
    ticket.notes = content.trim();
    ticket.updatedAt = new Date().toISOString();
    this.saveTicket(ticket);

    return { success: true, message: 'تمت إضافة الملاحظة للتذكرة' };
  }

  // 15. Resolve Problem Ticket with Automatic Financial Impact & Multi-Department Support
  public resolveTicketProblem(
    ticketId: string,
    resolution: {
      problemReason?: 'wrong_product' | 'wrong_account_or_amount' | 'other';
      decision: 'coupon' | 'gift' | 'refund' | 'correction' | 'closed';
      costBearer: string;
      customCostBearer?: string;
      notes: string;
      couponCode?: string;
      giftDetails?: string;
      refundAmount?: number;
      refundWalletId?: string;
    },
    user?: { fullName?: string; role?: string; id?: string; name?: string }
  ): { success: boolean; message: string } {
    let ticket = this.getTicketById(ticketId);
    let isDealer = false;
    if (!ticket) {
      ticket = this.getDealerTicketById(ticketId);
      if (ticket) isDealer = true;
    }
    if (!ticket) return { success: false, message: 'التذكرة غير موجودة' };

    const prevStatus = ticket.status;
    const effectiveBearer = (resolution.costBearer === 'نص حر' || resolution.costBearer === 'custom')
      ? (resolution.customCostBearer?.trim() || 'جهة مخصصة')
      : resolution.costBearer;

    const problemReasonKey = resolution.problemReason || ticket.problemDetails?.reason || 'wrong_product';
    const reasonLabel = problemReasonKey === 'wrong_product'
      ? 'وصل منتج مختلف بنفس السعر'
      : problemReasonKey === 'wrong_account_or_amount'
        ? 'شحن لحساب غلط / مبلغ غلط'
        : 'مشكلة تنفيذية';

    // 1. Update Problem & Resolution Details
    if (ticket.problemDetails) {
      ticket.problemDetails.reason = problemReasonKey;
      ticket.problemDetails.reasonLabel = reasonLabel;
    } else {
      ticket.problemDetails = {
        reason: problemReasonKey,
        reasonLabel,
        description: resolution.notes,
        reportedBy: user?.fullName || user?.name || 'المسؤول',
        reportedAt: new Date().toISOString()
      };
    }

    ticket.status = resolution.decision === 'refund' ? 'refunded' : 'completed';
    ticket.resolutionDetails = {
      decision: resolution.decision,
      costBearer: effectiveBearer,
      customCostBearer: resolution.customCostBearer,
      notes: resolution.notes,
      couponCode: resolution.couponCode,
      giftDetails: resolution.giftDetails,
      refundAmount: resolution.refundAmount,
      refundWalletId: resolution.refundWalletId,
      resolvedBy: user?.fullName || user?.name || 'المدير المسؤول',
      resolvedAt: new Date().toISOString()
    };
    ticket.resolutionNote = resolution.notes;
    ticket.updatedAt = new Date().toISOString();

    // 2. Automatic Financial Impact on Goods & Operating Wallets (الأثر المالي التلقائي)
    const allWallets = this.getStoreWallets();
    const goodsCost = ticket.totalCostAmount || ticket.costPrice || ticket.actualCostEGP || 0;
    const targetWId = ticket.items?.[0]?.walletTypeId || ticket.actualWalletId;
    const goodsWallet = allWallets.find(w => w.id === targetWId) || allWallets.find(w => w.type === 'inventory');

    // Financial effect for Case 2: Wrong Account or Wrong Amount
    if (problemReasonKey === 'wrong_account_or_amount') {
      if (goodsWallet && goodsCost > 0) {
        this.addStoreWalletTransaction({
          walletId: goodsWallet.id,
          walletName: goodsWallet.name,
          type: 'loss',
          amount: goodsCost,
          currency: goodsWallet.currency || 'EGP',
          balanceBefore: goodsWallet.balance,
          balanceAfter: goodsWallet.balance,
          description: `معالجة مشكلة [شحن لحساب غلط / مبلغ غلط] - تسجيل عجز بضاعة (المتحمل: ${effectiveBearer}) - تذكرة #${ticket.ticketNumber}`,
          referenceNumber: ticket.ticketNumber,
          performedBy: user ? { id: user.id || 'usr', name: user.fullName || user.name || 'المدير', role: user.role || 'admin' } : undefined,
          sourceType: 'problem_resolution',
          sourceName: 'معالجة مشكلة تذكرة'
        });
      }

      if (resolution.decision === 'correction') {
        // When correcting shipment, record correction dispatch note
        if (!ticket.stockDeducted) {
          this.consumeTicketProductStock(ticket, {
            id: user?.id || 'admin',
            name: user?.fullName || 'المدير',
            role: 'admin'
          });
        }
      }
    } else if (problemReasonKey === 'wrong_product') {
      // Financial effect for Case 1: Wrong Product with Same Price
      if (goodsWallet) {
        this.addStoreWalletTransaction({
          walletId: goodsWallet.id,
          walletName: goodsWallet.name,
          type: 'adjustment',
          amount: 0,
          currency: goodsWallet.currency || 'EGP',
          balanceBefore: goodsWallet.balance,
          balanceAfter: goodsWallet.balance,
          description: `معالجة مشكلة [وصل منتج مختلف بنفس السعر] - تسوية المخزون والتسليم (المتحمل: ${effectiveBearer}) - تذكرة #${ticket.ticketNumber}`,
          referenceNumber: ticket.ticketNumber,
          performedBy: user ? { id: user.id || 'usr', name: user.fullName || user.name || 'المدير', role: user.role || 'admin' } : undefined,
          sourceType: 'problem_resolution',
          sourceName: 'معالجة مشكلة تذكرة'
        });
      }
    }

    // Operating Wallet Impact if Decision is Refund
    if (resolution.decision === 'refund') {
      const refundAmt = resolution.refundAmount || ticket.receivedAmount || ticket.requiredAmount || 0;
      let opWallet = allWallets.find(w => w.id === resolution.refundWalletId && w.type === 'operating');
      if (!opWallet) {
        opWallet = allWallets.find(w => w.type === 'operating' && !w.isSystemWallet) || allWallets[0];
      }

      if (opWallet && refundAmt > 0) {
        const before = opWallet.balance;
        opWallet.balance -= refundAmt;
        opWallet.monthlyWithdrawn = (opWallet.monthlyWithdrawn || 0) + refundAmt;
        opWallet.totalWithdrawn = (opWallet.totalWithdrawn || 0) + refundAmt;
        opWallet.updatedAt = new Date().toISOString();
        this.setItem(STORAGE_KEYS.STORE_WALLETS, allWallets);

        this.addStoreWalletTransaction({
          walletId: opWallet.id,
          walletName: opWallet.name,
          type: 'withdrawal',
          amount: refundAmt,
          currency: opWallet.currency || 'EGP',
          balanceBefore: before,
          balanceAfter: opWallet.balance,
          description: `معالجة مشكلة: استرداد مالي للعميل [${reasonLabel}] (المتحمل: ${effectiveBearer}) - تذكرة #${ticket.ticketNumber}`,
          referenceNumber: ticket.ticketNumber,
          performedBy: user ? { id: user.id || 'usr', name: user.fullName || user.name || 'المدير', role: user.role || 'admin' } : undefined,
          sourceType: 'refund',
          sourceName: 'استرداد مشكلة'
        });
      }
    }

    const logEntry: TicketHistoryLogItem = {
      id: 'log_' + Date.now(),
      action: `إغلاق ومعالجة المشكلة: [${reasonLabel}] - قرار [${resolution.decision}] (المتحمل: ${effectiveBearer})`,
      previousStatus: prevStatus,
      newStatus: ticket.status,
      performedBy: user?.fullName || user?.name || 'المدير المسؤول',
      timestamp: new Date().toISOString(),
      notes: resolution.notes
    };

    ticket.historyLog = [...(ticket.historyLog || []), logEntry];
    if (isDealer) {
      this.saveDealerTicket(ticket);
    } else {
      this.saveTicket(ticket);
    }
    eventBus.publish(SYSTEM_EVENTS.TICKET_UPDATED, ticket);
    try {
      this.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets in refundTicket:', e);
    }

    this.logAction(
      { id: user?.id || 'usr', name: user?.fullName || user?.name || 'المدير', role: 'admin', department: isDealer ? 'تذاكر التجار' : 'تذاكر الزبائن' },
      'edit',
      'إغلاق ومعالجة مشكلة تذكرة',
      ticket.id,
      ticket.ticketNumber,
      `تم إغلاق مشكلة التذكرة #${ticket.ticketNumber}: [${reasonLabel}] - قرار [${resolution.decision}] (المتحمل: ${effectiveBearer})`
    );

    return { success: true, message: `تم إغلاق المشكلة وتطبيق القرار الإداري والأثر المالي بنجاح` };
  }

  // 16. Refund Ticket with Full Financial & Reversal Mechanics (Single & Partial Refunds)
  public refundTicket(
    ticketId: string,
    refundWalletId: string,
    refundReason: string,
    user?: { fullName?: string; role?: string; id?: string; name?: string },
    refundNumberId?: string,
    customAmount?: number
  ): { success: boolean; message: string } {
    if (this.inFlightRefunds.has(ticketId)) {
      return { success: false, message: 'عملية استرداد هذه التذكرة قيد التنفيذ بالفعل، يرجى الانتظار.' };
    }
    this.inFlightRefunds.add(ticketId);

    try {
      let ticket = this.getTicketById(ticketId);
    let isDealer = false;
    if (!ticket) {
      ticket = this.getDealerTicketById(ticketId);
      if (ticket) isDealer = true;
    }
    if (!ticket) return { success: false, message: 'التذكرة غير موجودة' };

    const originalTotalPaid = Number(ticket.receivedAmount || ticket.requiredAmount || (ticket as any).paidAmount || (ticket as any).totalAmount || 0);
    const alreadyRefunded = Number(ticket.refundDetails?.amount || 0);
    const maxRefundable = Math.max(0, Math.round((originalTotalPaid - alreadyRefunded) * 100) / 100);

    // Prevent duplicate full refunds (Idempotency Guard)
    if (ticket.status === 'refunded' && (maxRefundable <= 0 || alreadyRefunded > 0)) {
      return {
        success: false,
        message: `التذكرة #${ticket.ticketNumber} مستردة بالكامل مسبقاً (إجمالي المسترد: ${alreadyRefunded} ج). لا يوجد رصيد متبقٍ للاسترداد.`
      };
    }

    let refundAmount = maxRefundable;
    if (customAmount !== undefined && customAmount !== null) {
      const parsedCustom = Math.round(Number(customAmount) * 100) / 100;
      if (isNaN(parsedCustom) || parsedCustom <= 0) {
        return { success: false, message: 'مبلغ الاسترداد المحدد غير صالح.' };
      }
      if (parsedCustom > maxRefundable) {
        return {
          success: false,
          message: `مبلغ الاسترداد المطلوب (${parsedCustom} ج) يتجاوز الحد الأقصى المتبقي المتاح للاسترداد (${maxRefundable} ج).`
        };
      }
      refundAmount = parsedCustom;
    }

    const newTotalRefunded = Math.round((alreadyRefunded + refundAmount) * 100) / 100;
    const remainingAmount = Math.max(0, Math.round((originalTotalPaid - newTotalRefunded) * 100) / 100);
    const isPartial = remainingAmount > 0;
    const refundRatio = originalTotalPaid > 0 ? (refundAmount / originalTotalPaid) : 1;

    const wallets = this.getStoreWallets();
    const isSystem = (w: any) =>
      w.isSystemWallet ||
      ['w_profits', 'w_cashback', 'w_referrals', 'w_trust'].includes(w.id) ||
      !!w.systemType ||
      w.type === 'profits' ||
      w.type === 'trust' ||
      w.type === 'inventory';

    let refundWallet = wallets.find(w => w.id === refundWalletId && !isSystem(w));
    if (!refundWallet) {
      refundWallet = wallets.find(w => w.type === 'operating' && !isSystem(w));
    }

    if (!refundWallet) {
      return {
        success: false,
        message: 'لا توجد محفظة تشغيلية صالحة لإجراء الاسترداد. محافظ النظام والأرباح والأمانات ومحافظ البضاعة لا يُصرف منها استرداد مالي.'
      };
    }

    const prevStatus = ticket.status;
    ticket.status = 'refunded';
    ticket.updatedAt = new Date().toISOString();

    const refundHistoryItem = {
      id: 'ref_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      amount: refundAmount,
      refundWalletId: refundWallet.id,
      refundWalletName: refundWallet.name,
      reason: refundReason,
      refundedBy: user?.fullName || user?.name || 'المدير',
      refundedAt: new Date().toISOString()
    };

    const existingHistory = Array.isArray(ticket.refundDetails?.history) ? ticket.refundDetails!.history : [];
    ticket.refundDetails = {
      amount: newTotalRefunded,
      originalTotalAmount: originalTotalPaid,
      remainingAmount,
      isPartial,
      refundWalletId: refundWallet.id,
      refundWalletName: refundWallet.name,
      reason: refundReason,
      refundedBy: user?.fullName || user?.name || 'المدير',
      refundedAt: new Date().toISOString(),
      history: [...existingHistory, refundHistoryItem]
    };

    // 1. Proportional reverse of customer or dealer cashback earned
    let cust = this.getCustomerById(ticket.customerId);
    if (!cust && ticket.customerPhone) {
      cust = this.getCustomers(true).find(c => c.phone === ticket.customerPhone) || undefined;
    }
    const dealer = this.getDealerById(ticket.customerId) || (ticket.customerPhone ? this.getDealerById(ticket.customerPhone) : undefined);

    const fullEarnedCashback = ticket.cashbackEarned || ticket.pricingSnapshot?.cashbackAmountEGP || 0;
    const earnedCashbackPortion = Math.round((fullEarnedCashback * refundRatio) * 100) / 100;

    if (cust && earnedCashbackPortion > 0) {
      cust.cashbackBalance = Math.max(0, Math.round(((cust.cashbackBalance || 0) - earnedCashbackPortion) * 100) / 100);
      cust.totalCashbackEarned = Math.max(0, Math.round(((cust.totalCashbackEarned || 0) - earnedCashbackPortion) * 100) / 100);
      this.saveCustomer(cust);

      this.addUnifiedWalletTransaction({
        customerId: cust.id,
        walletType: 'cashback',
        type: 'redeemed',
        operationName: `إلغاء واسترداد كاش باك لتذكرة مستردة #${ticket.ticketNumber} (${refundAmount} ج)`,
        amount: earnedCashbackPortion,
        balanceAfter: cust.cashbackBalance,
        orderNumber: ticket.ticketNumber
      });

      this.debitCashbackFromSystemWallet(earnedCashbackPortion, ticket.customerName, ticket.ticketNumber, false);
    } else if (dealer && earnedCashbackPortion > 0) {
      dealer.cashbackBalance = Math.max(0, Math.round(((dealer.cashbackBalance || 0) - earnedCashbackPortion) * 100) / 100);
      dealer.totalCashbackEarned = Math.max(0, Math.round(((dealer.totalCashbackEarned || 0) - earnedCashbackPortion) * 100) / 100);
      this.saveDealer(dealer);

      this.addDealerUnifiedWalletTransaction({
        customerId: dealer.id,
        walletType: 'cashback',
        type: 'redeemed',
        operationName: `إلغاء واسترداد كاش باك لتذكرة تاجر مستردة #${ticket.ticketNumber} (${refundAmount} ج)`,
        amount: earnedCashbackPortion,
        balanceAfter: dealer.cashbackBalance,
        orderNumber: ticket.ticketNumber
      });

      this.debitCashbackFromSystemWallet(earnedCashbackPortion, ticket.customerName, ticket.ticketNumber, true);
    }

    // 2. Restore cashback used in payment (if customer/dealer paid with cashback) on final/proportional refund
    const fullCashbackUsed = ticket.cashbackUsed || 0;
    const cashbackUsedPortion = Math.round((fullCashbackUsed * refundRatio) * 100) / 100;

    if (cust && cashbackUsedPortion > 0) {
      cust.cashbackBalance = Math.round(((cust.cashbackBalance || 0) + cashbackUsedPortion) * 100) / 100;
      this.saveCustomer(cust);

      this.addUnifiedWalletTransaction({
        customerId: cust.id,
        walletType: 'cashback',
        type: 'earned',
        operationName: `إعادة كاش باك مستخدم في سداد تذكرة مستردة #${ticket.ticketNumber}`,
        amount: cashbackUsedPortion,
        balanceAfter: cust.cashbackBalance,
        orderNumber: ticket.ticketNumber
      });
    } else if (dealer && cashbackUsedPortion > 0) {
      dealer.cashbackBalance = Math.round(((dealer.cashbackBalance || 0) + cashbackUsedPortion) * 100) / 100;
      this.saveDealer(dealer);

      this.addDealerUnifiedWalletTransaction({
        customerId: dealer.id,
        walletType: 'cashback',
        type: 'earned',
        operationName: `إعادة كاش باك مستخدم في سداد تذكرة تاجر مستردة #${ticket.ticketNumber}`,
        amount: cashbackUsedPortion,
        balanceAfter: dealer.cashbackBalance,
        orderNumber: ticket.ticketNumber
      });
    }

    // 3. Proportional reverse Referral Commission to Referrer
    const fullReferralAmt = ticket.pricingSnapshot?.referralAmountEGP || ticket.referralCommissionEarned || 0;
    const referralAmtPortion = Math.round((fullReferralAmt * refundRatio) * 100) / 100;

    if (referralAmtPortion > 0) {
      if (cust) {
        const allCustomers = this.getCustomers(true);
        let referrer = cust.referrerId ? allCustomers.find(c => c.id === cust.referrerId) : null;
        if (!referrer && cust.referredByCode) {
          referrer = allCustomers.find(c => c.referralCode?.trim().toUpperCase() === cust?.referredByCode?.trim().toUpperCase()) || null;
        }

        if (referrer) {
          referrer.referralWalletBalance = Math.max(0, Math.round(((referrer.referralWalletBalance || 0) - referralAmtPortion) * 100) / 100);
          referrer.totalReferralCommissionEarned = Math.max(0, Math.round(((referrer.totalReferralCommissionEarned || 0) - referralAmtPortion) * 100) / 100);
          this.saveCustomer(referrer);

          this.addUnifiedWalletTransaction({
            customerId: referrer.id,
            walletType: 'referral',
            type: 'redeemed',
            operationName: `إلغاء وعكس عمولة إحالة لتذكرة مستردة #${ticket.ticketNumber}`,
            amount: referralAmtPortion,
            balanceAfter: referrer.referralWalletBalance,
            orderNumber: ticket.ticketNumber
          });

          this.debitReferralFromSystemWallet(referralAmtPortion, referrer.name, ticket.ticketNumber, false);
          eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, referrer);
        }
      }

      if (dealer && dealer.referredByCode) {
        const dealerReferrer = this.getDealers(true).find(
          d => d.referralCode?.trim().toUpperCase() === dealer.referredByCode?.trim().toUpperCase()
        );
        if (dealerReferrer) {
          dealerReferrer.referralWalletBalance = Math.max(0, Math.round(((dealerReferrer.referralWalletBalance || 0) - referralAmtPortion) * 100) / 100);
          dealerReferrer.totalReferralCommissionEarned = Math.max(0, Math.round(((dealerReferrer.totalReferralCommissionEarned || 0) - referralAmtPortion) * 100) / 100);
          this.saveDealer(dealerReferrer);

          this.addDealerUnifiedWalletTransaction({
            customerId: dealerReferrer.id,
            walletType: 'referral',
            type: 'redeemed',
            operationName: `إلغاء وعكس عمولة إحالة لتذكرة تاجر مستردة #${ticket.ticketNumber}`,
            amount: referralAmtPortion,
            balanceAfter: dealerReferrer.referralWalletBalance,
            orderNumber: ticket.ticketNumber
          });

          this.debitReferralFromSystemWallet(referralAmtPortion, dealerReferrer.name, ticket.ticketNumber, true);
          eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, dealerReferrer);
          eventBus.publish('DEALER_UPDATED', dealerReferrer);
        }
      }
    }

    // 4. Restore Referral Balance used in payment
    const fullRefUsed = ticket.referralBalanceUsed || 0;
    const refUsedPortion = Math.round((fullRefUsed * refundRatio) * 100) / 100;
    if (cust && refUsedPortion > 0) {
      cust.referralWalletBalance = Math.round(((cust.referralWalletBalance || 0) + refUsedPortion) * 100) / 100;
      this.saveCustomer(cust);

      this.addUnifiedWalletTransaction({
        customerId: cust.id,
        walletType: 'referral',
        type: 'earned',
        operationName: `إعادة رصيد إحالة مستخدم في سداد تذكرة مستردة #${ticket.ticketNumber}`,
        amount: refUsedPortion,
        balanceAfter: cust.referralWalletBalance,
        orderNumber: ticket.ticketNumber
      });
    } else if (dealer && refUsedPortion > 0) {
      dealer.referralWalletBalance = Math.round(((dealer.referralWalletBalance || 0) + refUsedPortion) * 100) / 100;
      this.saveDealer(dealer);

      this.addDealerUnifiedWalletTransaction({
        customerId: dealer.id,
        walletType: 'referral',
        type: 'earned',
        operationName: `إعادة رصيد إحالة مستخدم في سداد تذكرة تاجر مستردة #${ticket.ticketNumber}`,
        amount: refUsedPortion,
        balanceAfter: dealer.referralWalletBalance,
        orderNumber: ticket.ticketNumber
      });
    }

    // Customer & Dealer order metrics update
    const spentPortion = Math.round(((ticket.requiredAmount || originalTotalPaid) * refundRatio) * 100) / 100;
    if (cust) {
      if (prevStatus === 'completed') {
        cust.totalSpent = Math.max(0, Math.round(((cust.totalSpent || 0) - spentPortion) * 100) / 100);
        if (remainingAmount === 0) {
          cust.totalOrders = Math.max(0, (cust.totalOrders || 0) - 1);
        }
        this.saveCustomer(cust);
      }
      eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, cust);
    }

    if (dealer) {
      if (prevStatus === 'completed') {
        dealer.totalSpent = Math.max(0, Math.round(((dealer.totalSpent || 0) - spentPortion) * 100) / 100);
        if (remainingAmount === 0) {
          dealer.totalOrders = Math.max(0, (dealer.totalOrders || 0) - 1);
        }
        this.saveDealer(dealer);
      }
      eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, dealer);
      eventBus.publish('DEALER_UPDATED', dealer);
    }

    // 5. Reverse consumed sub-wallet points and FIFO lots (only if not already refunded and full refund)
    if (ticket.stockDeducted && remainingAmount === 0) {
      try {
        JKRWalletEngine.reverseTicketWalletConsumption(
          ticket.ticketNumber || ticket.id,
          user,
          `استرداد تذكرة #${ticket.ticketNumber}`
        );
      } catch (err) {
        console.warn('Error in reverseTicketWalletConsumption on refund:', err);
      }
      if (ticket.items && ticket.items.length > 0) {
        for (const item of ticket.items) {
          const targetWId = item.consumedWalletId || item.walletTypeId || ticket.actualWalletId;
          const pts = item.consumedPoints || 0;
          if (targetWId && pts > 0) {
            try {
              JKRWalletEngine.restoreSubWalletPoints(
                targetWId,
                pts,
                ticket.ticketNumber,
                'استرداد تذكرة'
              );
            } catch (e) {
              console.warn('Error restoring sub-wallet points fallback on refund:', e);
            }
          }
        }
      }
      ticket.stockDeducted = false;
    }

    // Reverse Profit in System Wallet w_profits proportionally
    const fullProfit = ticket.netProfit !== undefined ? ticket.netProfit : (ticket.totalProfitMargin || 0);
    const profitToReverse = Math.round((fullProfit * refundRatio) * 100) / 100;
    if (profitToReverse > 0) {
      this.debitProfitFromSystemWallet(profitToReverse, ticket.ticketNumber, {
        customerName: ticket.customerName,
        gameName: ticket.gameName,
        performedBy: user,
        reason: `تسوية وعكس أرباح تذكرة مستردة #${ticket.ticketNumber}`,
        isDealer
      });
    }

    // Reverse Referral Allowance Profit from System Profit Wallet if present
    if (prevStatus === 'completed' && ticket.referralAllowance && ticket.referralAllowance > 0) {
      const refAllowancePortion = Math.round((ticket.referralAllowance * refundRatio) * 100) / 100;
      if (refAllowancePortion > 0) {
        try {
          this.debitProfitFromSystemWallet(refAllowancePortion, ticket.ticketNumber, {
            customerName: ticket.customerName,
            gameName: ticket.gameName,
            performedBy: user,
            reason: `عكس أرباح بدل إحالة لتذكرة مستردة #${ticket.ticketNumber}`,
            isDealer
          });
        } catch (err) {
          console.warn('Error rolling back referral allowance profit on refund:', err);
        }
      }
    }

    // Release Held Trust Escrow if Ticket is an Uncompleted Reservation
    if ((ticket.isReservation || ticket.operationMode === 'reservation') && !ticket.reservationTrustDeducted) {
      const holdingAmount = ticket.reservationTrustHeld !== undefined
        ? ticket.reservationTrustHeld
        : (ticket.receivedAmount || ticket.requiredAmount || 0);
      const trustPortion = Math.round((holdingAmount * refundRatio) * 100) / 100;
      if (trustPortion > 0) {
        try {
          this.debitTrustFromSystemWallet(
            trustPortion,
            ticket.customerName || 'العميل',
            `إخلاء أمانة محتجزة لتذكرة حجز مستردة #${ticket.ticketNumber}`,
            ticket.ticketNumber
          );
          if (remainingAmount === 0) {
            ticket.reservationTrustDeducted = true;
          }
        } catch (err) {
          console.warn('Error releasing reservation trust escrow on refund:', err);
        }
      }
    }

    // Reverse Operating Expenses in System Wallet w_operating_expenses
    if (ticket.fixedCostAmount && ticket.fixedCostAmount > 0) {
      const expensePortion = Math.round((ticket.fixedCostAmount * refundRatio) * 100) / 100;
      if (expensePortion > 0) {
        this.debitOperatingExpenseFromSystemWallet(
          expensePortion,
          ticket.ticketNumber,
          `عكس مصاريف تشغيل تذكرة مستردة #${ticket.ticketNumber}`,
          { customerName: ticket.customerName, gameName: ticket.gameName, performedBy: user }
        );
      }
    }

    // Revert overpayment/shortage if any (only on complete refund)
    if (remainingAmount === 0) {
      if (cust && ticket.overpaymentAmount && ticket.overpaymentAmount > 0) {
        cust.accountBalance = Math.max(0, Math.round(((cust.accountBalance || 0) - ticket.overpaymentAmount) * 100) / 100);
        cust.balance = cust.accountBalance;
        this.saveCustomer(cust);
        this.debitTrustFromSystemWallet(ticket.overpaymentAmount, cust.name, 'عكس زيادة مدفوعات تذكرة مستردة', ticket.ticketNumber, false);
      }
      if (cust && ticket.shortageAmount && ticket.shortageAmount > 0) {
        cust.accountBalance = Math.round(((cust.accountBalance || 0) + ticket.shortageAmount) * 100) / 100;
        cust.balance = cust.accountBalance;
        this.saveCustomer(cust);
        this.addUnifiedWalletTransaction({
          customerId: cust.id,
          walletType: 'account_balance',
          type: 'credit',
          operationName: `إلغاء وتسوية عجز تذكرة مستردة بالكامل #${ticket.ticketNumber} (+${ticket.shortageAmount} ج)`,
          amount: ticket.shortageAmount,
          balanceAfter: cust.accountBalance,
          orderNumber: ticket.ticketNumber
        });
        this.creditTrustToSystemWallet(ticket.shortageAmount, cust.name, 'تسوية عجز تذكرة مستردة', ticket.ticketNumber, false);
      }

      if (dealer && ticket.overpaymentAmount && ticket.overpaymentAmount > 0) {
        dealer.accountBalance = Math.max(0, Math.round(((dealer.accountBalance || 0) - ticket.overpaymentAmount) * 100) / 100);
        dealer.balance = dealer.accountBalance;
        this.saveDealer(dealer);
        this.debitTrustFromSystemWallet(ticket.overpaymentAmount, dealer.name, 'عكس زيادة مدفوعات تذكرة تاجر مستردة', ticket.ticketNumber, true);
      }
      if (dealer && ticket.shortageAmount && ticket.shortageAmount > 0) {
        dealer.accountBalance = Math.round(((dealer.accountBalance || 0) + ticket.shortageAmount) * 100) / 100;
        dealer.balance = dealer.accountBalance;
        this.saveDealer(dealer);
        this.addDealerUnifiedWalletTransaction({
          customerId: dealer.id,
          walletType: 'account_balance',
          type: 'credit',
          operationName: `إلغاء وتسوية عجز تذكرة تاجر مستردة بالكامل #${ticket.ticketNumber} (+${ticket.shortageAmount} ج)`,
          amount: ticket.shortageAmount,
          balanceAfter: dealer.accountBalance,
          orderNumber: ticket.ticketNumber
        });
        this.creditTrustToSystemWallet(ticket.shortageAmount, dealer.name, 'تسوية عجز تذكرة تاجر مستردة', ticket.ticketNumber, true);
      }
    }

    // Deduct refunded amount from operating wallet & specific line/sub-number
    if (refundWallet) {
      const before = refundWallet.balance;
      refundWallet.balance = Math.round((refundWallet.balance - refundAmount) * 100) / 100;
      refundWallet.monthlyWithdrawn = Math.round(((refundWallet.monthlyWithdrawn || 0) + refundAmount) * 100) / 100;
      refundWallet.totalWithdrawn = Math.round(((refundWallet.totalWithdrawn || 0) + refundAmount) * 100) / 100;
      refundWallet.updatedAt = new Date().toISOString();

      // Find the specific sending line/phone
      let targetNum: any;
      if (refundWallet.numbers && refundWallet.numbers.length > 0) {
        if (refundNumberId) {
          targetNum = refundWallet.numbers.find(n => n.id === refundNumberId || n.phoneNumber === refundNumberId);
        }
        if (!targetNum && ticket.paymentWalletNumberId) {
          targetNum = refundWallet.numbers.find(n => n.id === ticket.paymentWalletNumberId || n.phoneNumber === ticket.paymentWalletNumberId);
        }
        if (!targetNum && ticket.paymentReceivedPhone) {
          targetNum = refundWallet.numbers.find(n => n.phoneNumber === ticket.paymentReceivedPhone);
        }
        if (!targetNum && ticket.customerPhone) {
          targetNum = refundWallet.numbers.find(n => n.phoneNumber === ticket.customerPhone);
        }
        if (!targetNum) {
          targetNum = refundWallet.numbers[0];
        }

        if (targetNum) {
          targetNum.currentBalance = Math.max(0, Math.round(((targetNum.currentBalance || 0) - refundAmount) * 100) / 100);
          // Consume send limits (daily & monthly)
          targetNum.dailySent = Math.round(((targetNum.dailySent || 0) + refundAmount) * 100) / 100;
          targetNum.monthlySent = Math.round(((targetNum.monthlySent || 0) + refundAmount) * 100) / 100;
          targetNum.totalSent = Math.round(((targetNum.totalSent || 0) + refundAmount) * 100) / 100;
          targetNum.monthlyWithdrawn = Math.round(((targetNum.monthlyWithdrawn || 0) + refundAmount) * 100) / 100;
          targetNum.operationsCount = (targetNum.operationsCount || 0) + 1;

          if (
            (targetNum.dailySendLimit && targetNum.dailySent >= targetNum.dailySendLimit) ||
            (targetNum.monthlySendLimit && targetNum.monthlySent >= targetNum.monthlySendLimit)
          ) {
            targetNum.status = 'limit_reached';
          }
        }
      }

      this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);

      this.addStoreWalletTransaction({
        walletId: refundWallet.id,
        walletName: refundWallet.name,
        type: 'refund',
        amount: refundAmount,
        currency: refundWallet.currency,
        balanceBefore: before,
        balanceAfter: refundWallet.balance,
        description: `استرداد مالي (${isPartial ? 'جزئي' : 'كلي'}) للعميل ${ticket.customerName} عن تذكرة #${ticket.ticketNumber} (${refundReason})`,
        referenceNumber: ticket.ticketNumber,
        sourceType: 'refund',
        sourceTicketId: ticket.id,
        sourceTicketNumber: ticket.ticketNumber,
        customerName: ticket.customerName,
        customerPhone: ticket.customerPhone,
        receivingPhoneNumber: targetNum?.phoneNumber || ticket.paymentReceivedPhone,
        senderPhoneNumber: targetNum?.phoneNumber || refundWallet.accountNumber,
        performedBy: { id: user?.id || 'usr', name: user?.fullName || user?.name || 'المدير', role: 'admin' }
      });
    }

    // Special rule for Fraud ticket in refund: رصيد البضاعة يرجع + المبلغ الفعلي يُخصم من التشغيل
    if (prevStatus === 'fraud') {
      const invWallets = this.getStoreWallets();
      const targetWId = ticket.items?.[0]?.walletTypeId || ticket.actualWalletId;
      const invW = invWallets.find(w => w.id === targetWId) || invWallets.find(w => w.type === 'inventory');
      if (invW) {
        this.addStoreWalletTransaction({
          walletId: invW.id,
          walletName: invW.name,
          type: 'adjustment',
          amount: ticket.totalCostAmount || ticket.costPrice || 0,
          currency: invW.currency || 'EGP',
          balanceBefore: invW.balance,
          balanceAfter: invW.balance,
          description: `استرداد تذكرة احتيال - إرجاع رصيد البضاعة للمحفظة - تذكرة #${ticket.ticketNumber}`,
          referenceNumber: ticket.ticketNumber,
          sourceType: 'refund',
          sourceName: 'استرداد احتيال'
        });
      }
      if (ticket.fraudDetails) {
        ticket.fraudDetails.refundedAt = new Date().toISOString();
        ticket.fraudDetails.refundWalletId = refundWallet?.id;
      }
    }

    const logEntry: TicketHistoryLogItem = {
      id: 'log_' + Date.now(),
      action: prevStatus === 'fraud'
        ? `استرداد تذكرة احتيال: إرجاع رصيد البضاعة وخصم ${refundAmount} ج من محفظة التشغيل`
        : `استرداد مالي ${isPartial ? 'جزئي' : 'كلي'} للتذكرة بمبلغ ${refundAmount} ج (إجمالي المسترد: ${newTotalRefunded} ج، المتبقي: ${remainingAmount} ج)`,
      previousStatus: prevStatus,
      newStatus: 'refunded',
      performedBy: user?.fullName || user?.name || 'المدير',
      timestamp: new Date().toISOString(),
      notes: refundReason
    };

    ticket.historyLog = [...(ticket.historyLog || []), logEntry];
    if (isDealer) {
      this.saveDealerTicket(ticket);
    } else {
      this.saveTicket(ticket);
    }
    eventBus.publish(SYSTEM_EVENTS.TICKET_UPDATED, ticket);
    try {
      this.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets in refundTicket:', e);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(isDealer ? 'dealer_tickets_updated' : 'tickets_updated'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
      window.dispatchEvent(new CustomEvent('jkr_wallets_updated'));
    }

    this.logAction(
      { id: user?.id || 'usr', name: user?.fullName || user?.name || 'المدير', role: 'admin', department: isDealer ? 'تذاكر التجار' : 'المالية' },
      'delete',
      'استرداد تذكرة',
      ticket.id,
      ticket.ticketNumber,
      `تم استرداد التذكرة #${ticket.ticketNumber} وإعادة ${refundAmount} ج من محفظة ${refundWallet?.name} (متبقي: ${remainingAmount} ج)`
    );

      return {
        success: true,
        message: isPartial
          ? `تم استرداد جزء من التذكرة #${ticket.ticketNumber} بمبلغ ${refundAmount} ج بنجاح (المتبقي القابل للاسترداد: ${remainingAmount} ج)`
          : `تم استرداد التذكرة #${ticket.ticketNumber} بالكامل بنجاح بمبلغ ${refundAmount} ج وعكس التأثير المالي`
      };
    } finally {
      this.inFlightRefunds.delete(ticketId);
    }
  }

  // 17. Mark Ticket as Fraud (قواعد تفعيل الاحتيال المعتمدة للمسؤول والمالك)
  public markTicketFraud(
    ticketId: string,
    fraudReason: string,
    costBearer: string,
    customCostBearer?: string,
    user?: { fullName?: string; role?: string; id?: string; name?: string }
  ): { success: boolean; message: string } {
    // Rule: من يفعّلها: المسؤول أو المالك فقط
    if (user && user.role !== 'admin') {
      return { success: false, message: 'عذراً، تفعيل حالة الاحتيال صلاحية حصرية للمسؤول أو المالك فقط' };
    }

    let ticket = this.getTicketById(ticketId);
    let isDealer = false;
    if (!ticket) {
      ticket = this.getDealerTicketById(ticketId);
      if (ticket) isDealer = true;
    }
    if (!ticket) return { success: false, message: 'التذكرة غير موجودة' };

    const prevStatus = ticket.status;
    const effectiveBearer = (costBearer === 'نص حر' || costBearer === 'custom')
      ? (customCostBearer?.trim() || 'جهة مخصصة')
      : costBearer;

    ticket.status = 'fraud';
    ticket.excludeFromOperatingRevenue = true;
    ticket.fraudDetails = {
      reason: fraudReason,
      costBearer: effectiveBearer,
      customCostBearer,
      markedBy: user?.fullName || user?.name || 'المدير',
      markedAt: new Date().toISOString()
    };
    ticket.updatedAt = new Date().toISOString();

    // Rule: الأثر على البضاعة: تُخصم تكلفة المنتج
    if (!ticket.stockDeducted) {
      this.consumeTicketProductStock(ticket, {
        id: user?.id || 'admin',
        name: user?.fullName || 'المدير',
        role: 'admin'
      });
    }

    const costAmount = ticket.totalCostAmount || ticket.costPrice || ticket.actualCostEGP || 0;
    const allWallets = this.getStoreWallets();
    const targetWId = ticket.items?.[0]?.walletTypeId || ticket.actualWalletId;
    const invW = allWallets.find(w => w.id === targetWId) || allWallets.find(w => w.type === 'inventory');

    if (invW && costAmount > 0) {
      this.addStoreWalletTransaction({
        walletId: invW.id,
        walletName: invW.name,
        type: 'loss',
        amount: costAmount,
        currency: invW.currency || 'EGP',
        balanceBefore: invW.balance,
        balanceAfter: invW.balance,
        description: `تسجيل حالة احتيال - خصم تكلفة المنتج (المتحمل: ${effectiveBearer}) - تذكرة #${ticket.ticketNumber}`,
        referenceNumber: ticket.ticketNumber,
        performedBy: user ? { id: user.id || 'usr', name: user.fullName || user.name || 'المدير', role: 'admin' } : undefined,
        sourceType: 'fraud',
        sourceName: 'حالة احتيال'
      });
    }
    ticket.fraudDetails.inventoryCostDeducted = costAmount;

    // Rule: الأثر على التشغيل: لا تُضاف (عكس الأرباح من محفظة الأرباح إن كانت مسجلة)
    if (ticket.profitSynced) {
      const profitToReverse = ticket.netProfit !== undefined ? ticket.netProfit : (ticket.totalProfitMargin || 0);
      if (profitToReverse > 0) {
        const pW = allWallets.find(w => w.id === 'w_profits' || w.systemType === 'profits' || w.type === 'profits');
        if (pW) {
          const before = pW.balance;
          pW.balance = Math.max(0, pW.balance - profitToReverse);
          pW.updatedAt = new Date().toISOString();
          this.setItem(STORAGE_KEYS.STORE_WALLETS, allWallets);

          this.addStoreWalletTransaction({
            walletId: pW.id,
            walletName: pW.name,
            type: 'adjustment',
            amount: profitToReverse,
            currency: 'EGP',
            balanceBefore: before,
            balanceAfter: pW.balance,
            description: `إلغاء واستبعاد أرباح التشغيل لتذكرة احتيال #${ticket.ticketNumber}`,
            referenceNumber: ticket.ticketNumber,
            sourceType: 'fraud',
            sourceName: 'استبعاد أرباح احتيال'
          });
        }
      }
      ticket.profitSynced = false;
    }
    ticket.fraudDetails.operatingExcluded = true;

    const logEntry: TicketHistoryLogItem = {
      id: 'log_' + Date.now(),
      action: `تسجيل حالة احتيال: ${fraudReason} (المتحمل: ${effectiveBearer}) - خصم تكلفة البضاعة (${costAmount} ج) واستبعاد التشغيل`,
      previousStatus: prevStatus,
      newStatus: 'fraud',
      performedBy: user?.fullName || user?.name || 'المدير',
      timestamp: new Date().toISOString(),
      notes: fraudReason
    };

    ticket.historyLog = [...(ticket.historyLog || []), logEntry];
    if (isDealer) {
      this.saveDealerTicket(ticket);
    } else {
      this.saveTicket(ticket);
    }
    eventBus.publish(SYSTEM_EVENTS.TICKET_UPDATED, ticket);
    try {
      this.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets in refundTicket:', e);
    }

    this.logAction(
      { id: user?.id || 'usr', name: user?.fullName || user?.name || 'المدير', role: 'admin', department: isDealer ? 'تذاكر التجار' : 'الأمان والرقابة' },
      'edit',
      'تسجيل احتيال لتذكرة',
      ticket.id,
      ticket.ticketNumber,
      `تم تسجيل التذكرة #${ticket.ticketNumber} كحالة احتيال (المتحمل: ${effectiveBearer}) - خصم تكلفة البضاعة: ${costAmount} ج.م`
    );

    return { success: true, message: `تم تسجيل التذكرة #${ticket.ticketNumber} كحالة احتيال وخصم تكلفة البضاعة بنجاح` };
  }

  // Partner Monthly Performance Evaluation & Warning/Demotion Engine
  public evaluatePartnerPerformance(
    partnerId: string,
    user?: { id: string; name: string; role: string }
  ): {
    success: boolean;
    actionTaken: 'passed' | 'warned' | 'demoted' | 'none';
    message: string;
    unlinkedCount: number;
    partner?: Customer;
  } {
    const partner = this.getCustomerById(partnerId);
    if (!partner) return { success: false, actionTaken: 'none', message: 'البروفايل غير موجود', unlinkedCount: 0 };

    const allCustomers = this.getCustomers(true);
    const result = PartnerPerformanceService.evaluatePartner(partner, allCustomers);

    if (result.actionTaken === 'none') {
      return { success: false, actionTaken: 'none', message: result.message, unlinkedCount: 0 };
    }

    // Save updated partner
    this.saveCustomer(result.updatedPartner);

    // If demoted: unlink all referees
    if (result.actionTaken === 'demoted' && result.unlinkedCustomerIds.length > 0) {
      const customers = this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
      customers.forEach(c => {
        if (result.unlinkedCustomerIds.includes(c.id)) {
          c.referredByCode = undefined;
          c.referredByName = undefined;
          c.updatedAt = new Date().toISOString();
        }
      });
      this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    }

    // Log action in AuditLog
    this.logAction(
      {
        id: user?.id || 'sys',
        name: user?.name || 'مدير النظام',
        role: user?.role || 'admin',
        department: 'إدارة الشركاء'
      },
      result.actionTaken === 'demoted' ? 'demote' : result.actionTaken === 'warned' ? 'warning' : 'edit',
      'تقييم أداء الشراكة',
      partner.id,
      partner.name,
      result.message,
      { warningCount: partner.partnerWarningCount, profileType: partner.profileType },
      { warningCount: result.updatedPartner.partnerWarningCount, profileType: result.updatedPartner.profileType }
    );

    // Add note to customer profile
    this.addCustomerNote({
      customerId: partner.id,
      authorName: user?.name || 'إدارة النظام',
      authorRole: 'مراقبة الشراكات',
      content: `📊 تقييم الأداء الشهري: ${result.message}`,
      type: result.actionTaken === 'demoted' ? 'complaint' : result.actionTaken === 'warned' ? 'general' : 'financial'
    });

    return {
      success: true,
      actionTaken: result.actionTaken,
      message: result.message,
      unlinkedCount: result.unlinkedCustomerIds.length,
      partner: result.updatedPartner
    };
  }

  public evaluateAllPartnersPerformance(user?: { id: string; name: string; role: string }): {
    evaluatedCount: number;
    warnedCount: number;
    demotedCount: number;
    passedCount: number;
  } {
    const all = this.getCustomers(false);
    const partners = all.filter(c => ['partner', 'shop', 'influencer'].includes(c.profileType));
    let warnedCount = 0;
    let demotedCount = 0;
    let passedCount = 0;

    partners.forEach(p => {
      const res = this.evaluatePartnerPerformance(p.id, user);
      if (res.actionTaken === 'warned') warnedCount++;
      else if (res.actionTaken === 'demoted') demotedCount++;
      else if (res.actionTaken === 'passed') passedCount++;
    });

    return {
      evaluatedCount: partners.length,
      warnedCount,
      demotedCount,
      passedCount
    };
  }

  public rateTicket(ticketId: string, rating: number, feedback?: string): void {
    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.customerRating = rating;
      ticket.ratingFeedback = feedback;
      this.saveTicket(ticket);
    }
  }

  // System Codes Management
  public getSystemCodes(): SystemCodeItem[] {
    return this.getItem<SystemCodeItem[]>(STORAGE_KEYS.SYSTEM_CODES, initialSystemCodes);
  }

  public saveSystemCode(item: SystemCodeItem): void {
    const codes = this.getSystemCodes();
    const index = codes.findIndex(c => c.id === item.id);
    if (index >= 0) {
      codes[index] = item;
    } else {
      codes.unshift(item);
    }
    this.setItem(STORAGE_KEYS.SYSTEM_CODES, codes);
  }

  public saveBulkSystemCodes(items: SystemCodeItem[]): void {
    const codes = this.getSystemCodes();
    this.setItem(STORAGE_KEYS.SYSTEM_CODES, [...items, ...codes]);
  }

  public deleteSystemCode(id: string): void {
    const codes = this.getSystemCodes().filter(c => c.id !== id);
    this.setItem(STORAGE_KEYS.SYSTEM_CODES, codes);
  }

  // Customer Module Specific Settings
  public getCustomerModuleSettings(): CustomerModuleSettings {
    return this.getItem<CustomerModuleSettings>(STORAGE_KEYS.CUSTOMER_MODULE_SETTINGS, initialCustomerModuleSettings);
  }

  public updateCustomerModuleSettings(newSettings: Partial<CustomerModuleSettings>): CustomerModuleSettings {
    const current = this.getCustomerModuleSettings();
    const updated = { ...current, ...newSettings };
    this.setItem(STORAGE_KEYS.CUSTOMER_MODULE_SETTINGS, updated);
    return updated;
  }

  // =============================================================
  // MIDDLEMAN SYSTEM (V1.0) DATABASE METHODS
  // =============================================================

  // 1. Middleman Deals CRUD
  public getMiddlemanDeals(includeCanceled = true): MiddlemanDeal[] {
    const all = this.getItem<MiddlemanDeal[]>(STORAGE_KEYS.MIDDLEMAN_DEALS, initialMiddlemanDeals);
    return includeCanceled ? all : all.filter(d => d.status !== 'canceled');
  }

  public getMiddlemanDealById(id: string): MiddlemanDeal | undefined {
    const all = this.getMiddlemanDeals(true);
    return all.find(d => d.id === id || d.dealNumber === id);
  }

  public saveMiddlemanDeal(deal: MiddlemanDeal, user?: { name?: string; role?: string; id?: string }): MiddlemanDeal {
    const all = this.getMiddlemanDeals(true);
    const index = all.findIndex(d => d.id === deal.id);
    const isNew = index < 0;

    const dealToSave: MiddlemanDeal = {
      ...deal,
      updatedAt: new Date().toISOString()
    };

    if (isNew) {
      all.unshift({
        ...dealToSave,
        createdAt: deal.createdAt || new Date().toISOString()
      });
    } else {
      all[index] = dealToSave;
    }

    this.setItem(STORAGE_KEYS.MIDDLEMAN_DEALS, all);

    // Update customer middleman statistics
    this.updateCustomerMiddlemanStats(deal.sellerId);
    this.updateCustomerMiddlemanStats(deal.buyerId);

    // Log action
    this.logAction(
      { id: user?.id || 'admin', name: user?.name || 'المدير', role: user?.role || 'admin', department: 'الوساطة' },
      isNew ? 'add' : 'edit',
      'وساطة',
      deal.id,
      deal.dealNumber,
      `${isNew ? 'إنشاء' : 'تحديث'} صفقة وساطة #${deal.dealNumber} بقيمة ${deal.dealAmount} ${deal.currency}`
    );

    return dealToSave;
  }

  public updateDealStatus(
    dealId: string,
    newStatus: MiddlemanDealStatus,
    notes?: string,
    user?: { name?: string; role?: string; id?: string }
  ): { success: boolean; message: string; deal?: MiddlemanDeal } {
    const deal = this.getMiddlemanDealById(dealId);
    if (!deal) return { success: false, message: 'الصفقة غير موجودة' };

    const prevStatus = deal.status;
    deal.status = newStatus;
    deal.updatedAt = new Date().toISOString();

    const statusMap: Record<MiddlemanDealStatus, string> = {
      new: 'جديدة',
      awaiting_transfer: 'بانتظار التحويل',
      awaiting_seller: 'بانتظار البائع',
      awaiting_buyer: 'بانتظار المشتري',
      in_progress: 'قيد التنفيذ',
      completed: 'مكتملة',
      canceled: 'ملغاة',
      dispute: 'نزاع'
    };

    const historyItem: MiddlemanStatusHistoryItem = {
      id: 'msh_' + Date.now(),
      status: newStatus,
      statusLabelArabic: statusMap[newStatus] || newStatus,
      previousStatus: prevStatus,
      userName: user?.name || 'المدير العام',
      userRole: user?.role || 'admin',
      timestamp: new Date().toISOString(),
      notes
    };

    deal.statusHistory = [...(deal.statusHistory || []), historyItem];

    // If marked as completed: post financial transactions to Treasury/Safe
    if (newStatus === 'completed' && prevStatus !== 'completed') {
      deal.completedAt = new Date().toISOString();

      // Record Company Commission Revenue in Safe
      if (deal.netCompanyProfitEGP > 0) {
        this.addSafeTransaction(
          'cash_in',
          deal.netCompanyProfitEGP,
          'middleman_commission',
          `إيراد عمولة وساطة صفقة #${deal.dealNumber} (${deal.title})`,
          user?.name || 'مسؤول الوساطة',
          deal.id
        );
      }

      // If external middleman was not marked as paid, record external middleman commission liability
      if (deal.hasExternalMiddleman && deal.externalMiddlemanCommissionAmountEGP && !deal.isExternalMiddlemanPaid) {
        deal.isExternalMiddlemanPaid = true;
        deal.externalMiddlemanPaidAt = new Date().toISOString();
      }
    }

    this.saveMiddlemanDeal(deal, user);

    return {
      success: true,
      message: `تم تحديث حالة الصفقة #${deal.dealNumber} إلى (${statusMap[newStatus]}) بنجاح`,
      deal
    };
  }

  public deleteMiddlemanDeal(id: string): boolean {
    const all = this.getMiddlemanDeals(true);
    const filtered = all.filter(d => d.id !== id);
    this.setItem(STORAGE_KEYS.MIDDLEMAN_DEALS, filtered);
    return true;
  }

  public addDealNote(dealId: string, note: Omit<MiddlemanNote, 'id' | 'createdAt'>): MiddlemanNote {
    const deal = this.getMiddlemanDealById(dealId);
    const newNote: MiddlemanNote = {
      ...note,
      id: 'mnote_' + Date.now(),
      createdAt: new Date().toISOString()
    };
    if (deal) {
      deal.internalNotes = [...(deal.internalNotes || []), newNote];
      this.saveMiddlemanDeal(deal);
    }
    return newNote;
  }

  public addDealAttachment(dealId: string, att: Omit<MiddlemanAttachment, 'id' | 'uploadedAt'>): MiddlemanAttachment {
    const deal = this.getMiddlemanDealById(dealId);
    const newAtt: MiddlemanAttachment = {
      ...att,
      id: 'matt_' + Date.now(),
      uploadedAt: new Date().toISOString()
    };
    if (deal) {
      deal.attachments = [...(deal.attachments || []), newAtt];
      this.saveMiddlemanDeal(deal);
    }
    return newAtt;
  }

  public payExternalMiddleman(dealId: string, user?: { name?: string; role?: string; id?: string }): boolean {
    const deal = this.getMiddlemanDealById(dealId);
    if (!deal || !deal.hasExternalMiddleman || !deal.externalMiddlemanCommissionAmountEGP) return false;

    deal.isExternalMiddlemanPaid = true;
    deal.externalMiddlemanPaidAt = new Date().toISOString();

    // Post payout expense from Safe
    this.addSafeTransaction(
      'cash_out',
      deal.externalMiddlemanCommissionAmountEGP,
      'middleman_payout',
      `صرف عمولة وسيط خارجي (${deal.externalMiddlemanName}) لصفقة #${deal.dealNumber}`,
      user?.name || 'المدير العام',
      deal.id
    );

    this.saveMiddlemanDeal(deal, user);
    return true;
  }

  // 2. Game Account Assets Warehouse
  public getMiddlemanAccounts(filterStatus?: string): GameAccountAsset[] {
    const raw = this.getItem<GameAccountAsset[]>(STORAGE_KEYS.MIDDLEMAN_ACCOUNTS, initialMiddlemanAccounts);
    const all: GameAccountAsset[] = raw.map(a => {
      const availableQty = a.availableQuantity !== undefined ? a.availableQuantity : (a.status === 'sold' ? 0 : 1);
      const soldQty = a.soldQuantity !== undefined ? a.soldQuantity : (a.status === 'sold' ? 1 : 0);
      return {
        ...a,
        initialQuantity: a.initialQuantity || (availableQty + soldQty) || 1,
        availableQuantity: availableQty,
        soldQuantity: soldQty,
        salesHistory: a.salesHistory || (a.saleRecord ? [a.saleRecord] : [])
      };
    });

    if (filterStatus && filterStatus !== 'all') {
      if (filterStatus === 'available') {
        return all.filter(a => a.status === 'available' && a.availableQuantity > 0);
      }
      if (filterStatus === 'sold') {
        return all.filter(a => a.status === 'sold' || a.availableQuantity === 0);
      }
      return all.filter(a => a.status === filterStatus);
    }
    return all;
  }

  public getMiddlemanAccountById(id: string): GameAccountAsset | undefined {
    const all = this.getMiddlemanAccounts();
    return all.find(a => a.id === id || a.accountCode === id);
  }

  public saveMiddlemanAccount(account: GameAccountAsset, user?: { name?: string; role?: string; id?: string }): GameAccountAsset {
    const all = this.getMiddlemanAccounts();
    const index = all.findIndex(a => a.id === account.id);
    const isNew = index < 0;

    const availableQty = account.availableQuantity !== undefined ? account.availableQuantity : 1;
    const soldQty = account.soldQuantity || 0;
    const initialQty = account.initialQuantity || availableQty + soldQty || 1;
    const status: AccountAssetStatus = availableQty <= 0 ? 'sold' : (account.status || 'available');

    const accToSave: GameAccountAsset = {
      ...account,
      initialQuantity: initialQty,
      availableQuantity: availableQty,
      soldQuantity: soldQty,
      status,
      updatedAt: new Date().toISOString()
    };

    if (isNew) {
      all.unshift({
        ...accToSave,
        createdAt: account.createdAt || new Date().toISOString()
      });

      // If purchased as new asset: register purchase expense in Safe/Finance
      if (account.purchaseCostEGP > 0) {
        this.addSafeTransaction(
          'cash_out',
          account.purchaseCostEGP,
          'account_purchase',
          `تكلفة شراء حساب أصل (${account.title} - ${account.gameName}) من ${account.sellerName}`,
          user?.name || account.purchasedBy || 'مسؤول الحسابات',
          account.id
        );
      }
    } else {
      all[index] = accToSave;
    }

    this.setItem(STORAGE_KEYS.MIDDLEMAN_ACCOUNTS, all);
    this.updateCustomerMiddlemanStats(account.sellerId);

    return accToSave;
  }

  public sellMiddlemanAccount(
    accountId: string,
    saleRecord: AccountSaleRecord,
    user?: { name?: string; role?: string; id?: string }
  ): { success: boolean; message: string; account?: GameAccountAsset } {
    const account = this.getMiddlemanAccountById(accountId);
    if (!account) return { success: false, message: 'الحساب غير موجود في المخزن' };
    
    const availableQty = account.availableQuantity !== undefined ? account.availableQuantity : 1;
    if (availableQty <= 0 || account.status === 'sold') {
      return { success: false, message: 'هذا الحساب غير متاح للبيع (نفدت الكمية المتوفرة).' };
    }

    const newAvailableQty = Math.max(0, availableQty - 1);
    const newSoldQty = (account.soldQuantity || 0) + 1;
    const updatedSalesHistory = [...(account.salesHistory || []), saleRecord];

    account.availableQuantity = newAvailableQty;
    account.soldQuantity = newSoldQty;
    account.salesHistory = updatedSalesHistory;
    account.saleRecord = saleRecord;
    account.lastSoldAt = saleRecord.soldAt;
    account.lastBuyerName = saleRecord.buyerName;
    account.lastBuyerPhone = saleRecord.buyerPhone;
    account.actualSalePriceEGP = saleRecord.salePriceEGP;
    account.netRealizedProfitEGP = (account.netRealizedProfitEGP || 0) + saleRecord.netProfitEGP;
    
    if (newAvailableQty <= 0) {
      account.status = 'sold';
    }
    account.updatedAt = new Date().toISOString();

    // Post Sale Revenue to Safe
    this.addSafeTransaction(
      'cash_in',
      saleRecord.salePriceEGP,
      'account_sale',
      `تحصيل قيمة بيع حساب (${account.title} - ${account.gameName}) للمشتري ${saleRecord.buyerName} (فاتورة: ${saleRecord.invoiceNumber}) [المتبقي بالمخزن: ${newAvailableQty}]`,
      user?.name || saleRecord.soldBy || 'مسؤول المبيعات',
      account.id
    );

    this.saveMiddlemanAccount(account, user);
    this.updateCustomerMiddlemanStats(saleRecord.buyerId);

    return {
      success: true,
      message: `تم بيع نسخة من الحساب "${account.title}" بنجاح وتحصيل ${saleRecord.salePriceEGP} ج في الخزينة. (المتبقي: ${newAvailableQty})`,
      account
    };
  }

  public deleteMiddlemanAccount(id: string): boolean {
    const all = this.getMiddlemanAccounts();
    const filtered = all.filter(a => a.id !== id);
    this.setItem(STORAGE_KEYS.MIDDLEMAN_ACCOUNTS, filtered);
    return true;
  }

  // 3. Customer Middleman Stats Helper
  private updateCustomerMiddlemanStats(customerId?: string): void {
    if (!customerId) return;
    const cust = this.getCustomerById(customerId);
    if (!cust) return;

    const deals = this.getMiddlemanDeals(true);
    const sellerDeals = deals.filter(d => (d.sellerId === customerId || d.sellerPhone === cust.phone) && d.status === 'completed');
    const buyerDeals = deals.filter(d => (d.buyerId === customerId || d.buyerPhone === cust.phone) && d.status === 'completed');
    const totalCount = sellerDeals.length + buyerDeals.length;

    const totalVolume =
      sellerDeals.reduce((sum, d) => sum + d.dealAmountEGP, 0) +
      buyerDeals.reduce((sum, d) => sum + d.dealAmountEGP, 0);

    let role: 'seller' | 'buyer' | 'both' | undefined = undefined;
    if (sellerDeals.length > 0 && buyerDeals.length > 0) {
      role = 'both';
    } else if (sellerDeals.length > 0) {
      role = 'seller';
    } else if (buyerDeals.length > 0) {
      role = 'buyer';
    }

    cust.middlemanRole = role || cust.middlemanRole || 'buyer';
    cust.middlemanDealsCount = totalCount;
    cust.middlemanTotalVolume = totalVolume;
    this.saveCustomer(cust);
  }

  // 4. Middleman Notifications Engine
  public getMiddlemanNotifications(): MiddlemanNotificationItem[] {
    return this.getItem<MiddlemanNotificationItem[]>(STORAGE_KEYS.MIDDLEMAN_NOTIFICATIONS, initialMiddlemanNotifications);
  }

  public markMiddlemanNotificationRead(id: string): void {
    const all = this.getMiddlemanNotifications();
    const target = all.find(n => n.id === id);
    if (target) {
      target.isRead = true;
      this.setItem(STORAGE_KEYS.MIDDLEMAN_NOTIFICATIONS, all);
    }
  }

  public dismissMiddlemanNotification(id: string): void {
    const all = this.getMiddlemanNotifications();
    const filtered = all.filter(n => n.id !== id);
    this.setItem(STORAGE_KEYS.MIDDLEMAN_NOTIFICATIONS, filtered);
  }

  public generateSmartMiddlemanNotifications(): MiddlemanNotificationItem[] {
    const existing = this.getMiddlemanNotifications();
    const deals = this.getMiddlemanDeals(true);
    const accounts = this.getMiddlemanAccounts('available');
    const now = new Date().getTime();
    const generated: MiddlemanNotificationItem[] = [...existing];

    // 1. Check Stalled Deals (> 48h active)
    deals.forEach(d => {
      if (['awaiting_transfer', 'awaiting_seller', 'awaiting_buyer', 'in_progress', 'dispute'].includes(d.status)) {
        const createdMs = new Date(d.createdAt).getTime();
        const diffHours = (now - createdMs) / (1000 * 60 * 60);
        if (diffHours >= 48) {
          const alreadyExists = generated.some(n => n.targetId === d.id && n.type === (d.status === 'dispute' ? 'dispute_alert' : 'stalled_deal'));
          if (!alreadyExists) {
            generated.unshift({
              id: 'ntf_gen_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3),
              type: d.status === 'dispute' ? 'dispute_alert' : 'stalled_deal',
              title: d.status === 'dispute' ? `نزاع في وساطة #${d.dealNumber}` : `وساطة #${d.dealNumber} معلقة منذ ${Math.round(diffHours / 24)} أيام`,
              message: `وساطة "${d.title}" لم تُغلق بعد وتتطلب متابعة سريعة مع الطرفين.`,
              targetId: d.id,
              targetType: 'deal',
              isRead: false,
              createdAt: new Date().toISOString(),
              urgency: d.status === 'dispute' ? 'high' : 'medium'
            });
          }
        }
      }
    });

    // 2. Check Unsold Accounts (> 20 days in inventory)
    accounts.forEach(acc => {
      const createdMs = new Date(acc.createdAt).getTime();
      const diffDays = Math.round((now - createdMs) / (1000 * 60 * 60 * 24));
      if (diffDays >= 20) {
        const alreadyExists = generated.some(n => n.targetId === acc.id && n.type === 'unsold_account');
        if (!alreadyExists) {
          generated.unshift({
            id: 'ntf_gen_acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3),
            type: 'unsold_account',
            title: `حساب ${acc.gameName} بالمخزن منذ ${diffDays} يوماً`,
            message: `الحساب (${acc.title}) تجاوز المدة الموصى بها في المخزن (${diffDays} يوم). يُفضل تخفيض السعر أو عمل عرض ترويجي.`,
            targetId: acc.id,
            targetType: 'account',
            isRead: false,
            createdAt: new Date().toISOString(),
            urgency: 'medium'
          });
        }
      }
    });

    this.setItem(STORAGE_KEYS.MIDDLEMAN_NOTIFICATIONS, generated.slice(0, 50));
    return generated;
  }

  // 5. Middleman Followups & Appointments Engine
  public getMiddlemanFollowups(): MiddlemanFollowup[] {
    return this.getItem<MiddlemanFollowup[]>(STORAGE_KEYS.MIDDLEMAN_FOLLOWUPS, []);
  }

  public saveMiddlemanFollowup(followup: MiddlemanFollowup): void {
    const all = this.getMiddlemanFollowups();
    const idx = all.findIndex(f => f.id === followup.id);
    if (idx >= 0) {
      all[idx] = followup;
    } else {
      all.unshift(followup);
    }
    this.setItem(STORAGE_KEYS.MIDDLEMAN_FOLLOWUPS, all);
  }

  public completeMiddlemanFollowup(id: string, completedBy?: string): void {
    const all = this.getMiddlemanFollowups();
    const item = all.find(f => f.id === id);
    if (item) {
      item.status = 'completed';
      item.completedAt = new Date().toISOString();
      if (completedBy) item.completedBy = completedBy;
      this.setItem(STORAGE_KEYS.MIDDLEMAN_FOLLOWUPS, all);
    }
  }

  public deleteMiddlemanFollowup(id: string): void {
    const all = this.getMiddlemanFollowups();
    const filtered = all.filter(f => f.id !== id);
    this.setItem(STORAGE_KEYS.MIDDLEMAN_FOLLOWUPS, filtered);
  }

  // 6. Middleman Settings
  public getMiddlemanModuleSettings(): MiddlemanModuleSettings {
    return this.getItem<MiddlemanModuleSettings>(STORAGE_KEYS.MIDDLEMAN_SETTINGS, initialMiddlemanModuleSettings);
  }

  public updateMiddlemanModuleSettings(newSettings: Partial<MiddlemanModuleSettings>): MiddlemanModuleSettings {
    const current = this.getMiddlemanModuleSettings();
    const updated = { ...current, ...newSettings };
    this.setItem(STORAGE_KEYS.MIDDLEMAN_SETTINGS, updated);
    return updated;
  }

  // 6. Middleman Dashboard Metrics Engine
  public getMiddlemanDashboardMetrics(): MiddlemanDashboardMetrics {
    const deals = this.getMiddlemanDeals(true);
    const accounts = this.getMiddlemanAccounts();
    const todayStr = new Date().toISOString().slice(0, 10);

    const todayNewDeals = deals.filter(d => d.createdAt.startsWith(todayStr)).length;
    const todayCompletedDeals = deals.filter(d => d.completedAt && d.completedAt.startsWith(todayStr)).length;
    const activeInProgressDeals = deals.filter(d =>
      ['new', 'awaiting_transfer', 'awaiting_seller', 'awaiting_buyer', 'in_progress', 'dispute'].includes(d.status)
    ).length;
    const stalledDealsCount = deals.filter(d => {
      if (['new', 'awaiting_transfer', 'awaiting_seller', 'awaiting_buyer', 'in_progress', 'dispute'].includes(d.status)) {
        const diff = (new Date().getTime() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 2;
      }
      return false;
    }).length;

    const completedDeals = deals.filter(d => d.status === 'completed');
    const totalDealsVolumeEGP = completedDeals.reduce((sum, d) => sum + (d.dealAmountEGP || 0), 0);
    const totalCompanyCommissionsEGP = completedDeals.reduce((sum, d) => sum + (d.companyCommissionAmountEGP || 0), 0);
    const totalExternalMiddlemanCommissionsEGP = completedDeals.reduce(
      (sum, d) => sum + (d.externalMiddlemanCommissionAmountEGP || 0),
      0
    );
    const netCompanyProfitsEGP = completedDeals.reduce((sum, d) => sum + (d.netCompanyProfitEGP || 0), 0);

    const dealAmounts = completedDeals.map(d => d.dealAmountEGP || 0);
    const averageDealValueEGP = dealAmounts.length > 0 ? Math.round(totalDealsVolumeEGP / dealAmounts.length) : 0;
    const highestDealValueEGP = dealAmounts.length > 0 ? Math.max(...dealAmounts) : 0;
    const lowestDealValueEGP = dealAmounts.length > 0 ? Math.min(...dealAmounts) : 0;

    const totalFinished = deals.filter(d => d.status === 'completed' || d.status === 'canceled').length;
    const successRatePercent = totalFinished > 0 ? Math.round((completedDeals.length / totalFinished) * 100) : 100;
    const canceledDealsCount = deals.filter(d => d.status === 'canceled').length;
    const cancellationRatePercent = totalFinished > 0 ? Math.round((canceledDealsCount / totalFinished) * 100) : 0;

    const availableAccounts = accounts.filter(a => a.status === 'available');
    const soldAccounts = accounts.filter(a => a.status === 'sold');
    const totalAccountInventoryValueEGP = availableAccounts.reduce((sum, a) => sum + (a.purchaseCostEGP || 0), 0);
    const totalAccountSalesProfitsEGP = soldAccounts.reduce(
      (sum, a) => sum + (a.netRealizedProfitEGP || (a.actualSalePriceEGP ? a.actualSalePriceEGP - a.purchaseCostEGP : 0)),
      0
    );

    return {
      todayNewDeals,
      todayCompletedDeals,
      activeInProgressDeals,
      stalledDealsCount,
      totalDealsVolumeEGP,
      totalCompanyCommissionsEGP,
      totalExternalMiddlemanCommissionsEGP,
      netCompanyProfitsEGP,
      averageDealValueEGP,
      highestDealValueEGP,
      lowestDealValueEGP,
      successRatePercent,
      cancellationRatePercent,
      availableAccountsCount: availableAccounts.length,
      soldAccountsCount: soldAccounts.length,
      totalAccountInventoryValueEGP,
      totalAccountSalesProfitsEGP
    };
  }

  // =============================================================
  // SUBSCRIPTIONS MODULE METHODS (V1.0)
  // =============================================================

  // 1. Subscription Plans Management
  public getSubscriptionPlans(filterStatus?: 'active' | 'inactive' | 'all'): SubscriptionPlan[] {
    const all = this.getItem<SubscriptionPlan[]>(STORAGE_KEYS.SUBSCRIPTION_PLANS, initialSubscriptionPlans);
    if (filterStatus && filterStatus !== 'all') {
      return all.filter(p => p.status === filterStatus);
    }
    return all.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  public getSubscriptionPlanById(id: string): SubscriptionPlan | undefined {
    const all = this.getSubscriptionPlans();
    return all.find(p => p.id === id);
  }

  public saveSubscriptionPlan(plan: SubscriptionPlan, user?: { id?: string; name?: string; role?: string }): SubscriptionPlan {
    const all = this.getSubscriptionPlans();
    const index = all.findIndex(p => p.id === plan.id);
    const isNew = index < 0;

    const planToSave: SubscriptionPlan = {
      ...plan,
      updatedAt: new Date().toISOString()
    };

    if (isNew) {
      all.push({
        ...planToSave,
        createdAt: plan.createdAt || new Date().toISOString()
      });
    } else {
      all[index] = planToSave;
    }

    this.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, all);

    this.logAction(
      { id: user?.id || 'admin', name: user?.name || 'المدير', role: user?.role || 'admin', department: 'الاشتراكات' },
      isNew ? 'add' : 'edit',
      'باقة اشتراك',
      plan.id,
      plan.name,
      `${isNew ? 'إنشاء' : 'تعديل'} باقة اشتراك: ${plan.name} بسعر ${plan.price} ج.م`
    );

    return planToSave;
  }

  public deleteSubscriptionPlan(id: string, user?: { id?: string; name?: string; role?: string }): boolean {
    const all = this.getSubscriptionPlans();
    const target = all.find(p => p.id === id);
    const filtered = all.filter(p => p.id !== id);
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, filtered);

    if (target) {
      this.logAction(
        { id: user?.id || 'admin', name: user?.name || 'المدير', role: user?.role || 'admin', department: 'الاشتراكات' },
        'delete',
        'باقة اشتراك',
        id,
        target.name,
        `حذف باقة اشتراك: ${target.name}`
      );
    }
    return true;
  }

  public toggleSubscriptionPlanStatus(id: string, user?: { id?: string; name?: string; role?: string }): SubscriptionPlan | undefined {
    const plan = this.getSubscriptionPlanById(id);
    if (!plan) return undefined;
    plan.status = plan.status === 'active' ? 'inactive' : 'active';
    return this.saveSubscriptionPlan(plan, user);
  }

  // 2. Subscriptions Registry & POS Sell Workflow
  public getSubscriptions(filterStatus?: SubscriptionStatus | 'all'): CustomerSubscription[] {
    const all = this.getItem<CustomerSubscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, initialCustomerSubscriptions);
    const now = new Date().toISOString();

    // Auto-update expired/expiring_soon status based on current date
    const updated = all.map(sub => {
      if (sub.status === 'cancelled' || sub.status === 'renewed' || sub.status === 'frozen') return sub;
      const end = new Date(sub.endDate).getTime();
      const today = new Date(now).getTime();
      const diffDays = (end - today) / (1000 * 60 * 60 * 24);

      if (diffDays <= 0) {
        return { ...sub, status: 'expired' as SubscriptionStatus };
      } else if (diffDays <= 7) {
        return { ...sub, status: 'expiring_soon' as SubscriptionStatus };
      } else {
        return { ...sub, status: 'active' as SubscriptionStatus };
      }
    });

    if (filterStatus && filterStatus !== 'all') {
      return updated.filter(s => s.status === filterStatus);
    }
    return updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getSubscriptionById(id: string): CustomerSubscription | undefined {
    const all = this.getSubscriptions();
    return all.find(s => s.id === id || s.subscriptionNumber === id);
  }

  public getCustomerSubscriptions(customerId: string): CustomerSubscription[] {
    const all = this.getSubscriptions();
    return all.filter(s => s.customerId === customerId);
  }

  public saveSubscription(subscription: CustomerSubscription, _user?: { id?: string; name?: string; role?: string }): CustomerSubscription {
    const all = this.getSubscriptions();
    const index = all.findIndex(s => s.id === subscription.id);
    const isNew = index < 0;

    const subToSave: CustomerSubscription = {
      ...subscription,
      updatedAt: new Date().toISOString()
    };

    if (isNew) {
      all.unshift({
        ...subToSave,
        createdAt: subscription.createdAt || new Date().toISOString()
      });
    } else {
      all[index] = subToSave;
    }

    this.setItem(STORAGE_KEYS.SUBSCRIPTIONS, all);
    return subToSave;
  }

  public sellSubscription(
    payload: {
      customerId: string;
      customerName: string;
      customerPhone: string;
      customerCode?: string;
      planId: string;
      currency?: CurrencyType;
      startDate: string;
      endDate: string;
      originalPrice: number;
      discountAmount?: number;
      couponCode?: string;
      finalPrice: number;
      paymentMethod: SubscriptionPaymentMethod;
      autoRenew?: boolean;
      notes?: string;
      serviceAccountUser?: string;
      serviceAccountPassword?: string;
      serviceServerUrl?: string;
    },
    user?: { id?: string; name?: string; role?: string }
  ): { success: boolean; message: string; subscription?: CustomerSubscription; payment?: SubscriptionPayment } {
    const plan = this.getSubscriptionPlanById(payload.planId);
    if (!plan) return { success: false, message: 'باقة الاشتراك غير موجودة' };

    const subId = `sub_${Date.now()}`;
    const subNumber = `SUB-${Math.floor(1000 + Math.random() * 9000)}`;
    const costPrice = plan.costPrice || Math.round(plan.price * 0.6);
    const netProfit = Math.max(0, payload.finalPrice - costPrice);

    // Calculate Grace End Date
    const graceDays = plan.gracePeriodDays || 3;
    const endDateObj = new Date(payload.endDate);
    endDateObj.setDate(endDateObj.getDate() + graceDays);
    const graceEndDate = endDateObj.toISOString();

    const newSub: CustomerSubscription = {
      id: subId,
      subscriptionNumber: subNumber,
      customerId: payload.customerId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerCode: payload.customerCode,
      planId: plan.id,
      planName: plan.name,
      planCategory: plan.category,
      durationValue: plan.durationValue,
      durationUnit: plan.durationUnit,
      currency: payload.currency || 'EGP',
      startDate: payload.startDate,
      endDate: payload.endDate,
      graceEndDate,
      originalPrice: payload.originalPrice,
      discountAmount: payload.discountAmount || 0,
      couponCode: payload.couponCode,
      finalPrice: payload.finalPrice,
      costPrice,
      netProfit,
      paymentStatus: 'paid',
      paymentMethod: payload.paymentMethod,
      status: 'active',
      autoRenew: payload.autoRenew ?? true,
      renewalCount: 0,
      serviceAccountUser: payload.serviceAccountUser,
      serviceAccountPassword: payload.serviceAccountPassword,
      serviceServerUrl: payload.serviceServerUrl,
      notes: payload.notes,
      createdBy: user?.name || 'المدير العام',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save Subscription
    this.saveSubscription(newSub, user);

    // Increment Plan Total Subscribers
    plan.totalSubscribersCount = (plan.totalSubscribersCount || 0) + 1;
    this.saveSubscriptionPlan(plan, user);

    // Record Payment
    const paymentId = `pay_${Date.now()}`;
    const paymentNumber = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPayment: SubscriptionPayment = {
      id: paymentId,
      paymentNumber,
      subscriptionId: subId,
      subscriptionNumber: subNumber,
      customerId: payload.customerId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      amount: payload.originalPrice,
      discount: payload.discountAmount || 0,
      netPaid: payload.finalPrice,
      paymentMethod: payload.paymentMethod,
      status: 'completed',
      receiptNumber: `REC-${subNumber}`,
      employeeName: user?.name || 'مسؤول الاشتراكات',
      notes: payload.notes,
      createdAt: new Date().toISOString()
    };

    const allPayments = this.getSubscriptionPayments();
    allPayments.unshift(newPayment);
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, allPayments);

    // Post Revenue to Safe/Treasury (Financial Integration)
    if (payload.finalPrice > 0) {
      this.addSafeTransaction(
        'cash_in',
        payload.finalPrice,
        'subscription_sale',
        `تحصيل قيمة اشتراك #${subNumber} (${plan.name}) للعميل ${payload.customerName}`,
        user?.name || 'مسؤول الاشتراكات',
        subId
      );
    }

    // Log Action
    this.logAction(
      { id: user?.id || 'admin', name: user?.name || 'المدير', role: user?.role || 'admin', department: 'الاشتراكات' },
      'add',
      'اشتراك عميل',
      subId,
      subNumber,
      `بيع اشتراك جديد #${subNumber} (${plan.name}) بقيمة ${payload.finalPrice} ج.م للعميل ${payload.customerName}`
    );

    return {
      success: true,
      message: `تم بيع وتفعيل اشتراك #${subNumber} بنجاح`,
      subscription: newSub,
      payment: newPayment
    };
  }

  // 3. Subscription Renewal & Upgrade & Cancellation
  public renewSubscription(
    subscriptionId: string,
    durationMonths: number,
    finalPrice: number,
    paymentMethod: SubscriptionPaymentMethod,
    user?: { id?: string; name?: string; role?: string }
  ): { success: boolean; message: string; subscription?: CustomerSubscription; payment?: SubscriptionPayment } {
    const sub = this.getSubscriptionById(subscriptionId);
    if (!sub) return { success: false, message: 'الاشتراك غير موجود' };

    // Calculate new start & end dates
    const currentEnd = new Date(sub.endDate);
    const baseDate = currentEnd.getTime() > Date.now() ? currentEnd : new Date();
    const newEnd = new Date(baseDate);
    newEnd.setMonth(newEnd.getMonth() + durationMonths);

    sub.startDate = baseDate.toISOString();
    sub.endDate = newEnd.toISOString();
    sub.status = 'active';
    sub.renewalCount = (sub.renewalCount || 0) + 1;
    sub.lastRenewedAt = new Date().toISOString();
    sub.updatedAt = new Date().toISOString();
    sub.finalPrice = finalPrice;

    this.saveSubscription(sub, user);

    // Record Payment
    const paymentId = `pay_${Date.now()}`;
    const paymentNumber = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPayment: SubscriptionPayment = {
      id: paymentId,
      paymentNumber,
      subscriptionId: sub.id,
      subscriptionNumber: sub.subscriptionNumber,
      customerId: sub.customerId,
      customerName: sub.customerName,
      customerPhone: sub.customerPhone,
      amount: finalPrice,
      discount: 0,
      netPaid: finalPrice,
      paymentMethod,
      status: 'completed',
      receiptNumber: `REC-REN-${sub.subscriptionNumber}-${sub.renewalCount}`,
      employeeName: user?.name || 'مسؤول الاشتراكات',
      notes: `تجديد الاشتراك لمدة ${durationMonths} شهر حتى ${newEnd.toISOString().split('T')[0]}`,
      createdAt: new Date().toISOString()
    };

    const allPayments = this.getSubscriptionPayments();
    allPayments.unshift(newPayment);
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, allPayments);

    // Post to Safe (Financial Integration)
    if (finalPrice > 0) {
      this.addSafeTransaction(
        'cash_in',
        finalPrice,
        'subscription_renewal',
        `تجديد اشتراك #${sub.subscriptionNumber} (${sub.planName}) للعميل ${sub.customerName}`,
        user?.name || 'مسؤول الاشتراكات',
        sub.id
      );
    }

    // Log Action
    this.logAction(
      { id: user?.id || 'admin', name: user?.name || 'المدير', role: user?.role || 'admin', department: 'الاشتراكات' },
      'edit',
      'تجديد اشتراك',
      sub.id,
      sub.subscriptionNumber,
      `تجديد اشتراك #${sub.subscriptionNumber} بقيمة ${finalPrice} ج.م للعميل ${sub.customerName}`
    );

    return {
      success: true,
      message: `تم تجديد الاشتراك #${sub.subscriptionNumber} بنجاح حتى ${newEnd.toISOString().split('T')[0]}`,
      subscription: sub,
      payment: newPayment
    };
  }

  public upgradeSubscription(
    subscriptionId: string,
    newPlanId: string,
    priceDifference: number,
    paymentMethod: SubscriptionPaymentMethod,
    user?: { id?: string; name?: string; role?: string }
  ): { success: boolean; message: string; subscription?: CustomerSubscription; payment?: SubscriptionPayment } {
    const sub = this.getSubscriptionById(subscriptionId);
    if (!sub) return { success: false, message: 'الاشتراك غير موجود' };
    const newPlan = this.getSubscriptionPlanById(newPlanId);
    if (!newPlan) return { success: false, message: 'الباقة الجديدة غير موجودة' };

    const prevPlanName = sub.planName;
    sub.previousPlanId = sub.planId;
    sub.planId = newPlan.id;
    sub.planName = newPlan.name;
    sub.planCategory = newPlan.category;
    sub.updatedAt = new Date().toISOString();

    this.saveSubscription(sub, user);

    let newPayment: SubscriptionPayment | undefined;
    if (priceDifference > 0) {
      const paymentId = `pay_${Date.now()}`;
      newPayment = {
        id: paymentId,
        paymentNumber: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscriptionNumber,
        customerId: sub.customerId,
        customerName: sub.customerName,
        customerPhone: sub.customerPhone,
        amount: priceDifference,
        discount: 0,
        netPaid: priceDifference,
        paymentMethod,
        status: 'completed',
        receiptNumber: `REC-UPG-${sub.subscriptionNumber}`,
        employeeName: user?.name || 'مسؤول الاشتراكات',
        notes: `ترقية الباقة من (${prevPlanName}) إلى (${newPlan.name})`,
        createdAt: new Date().toISOString()
      };

      const allPayments = this.getSubscriptionPayments();
      allPayments.unshift(newPayment);
      this.setItem(STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, allPayments);

      this.addSafeTransaction(
        'cash_in',
        priceDifference,
        'subscription_sale',
        `فرق ترقية باقة اشتراك #${sub.subscriptionNumber} إلى (${newPlan.name}) للعميل ${sub.customerName}`,
        user?.name || 'مسؤول الاشتراكات',
        sub.id
      );
    }

    this.logAction(
      { id: user?.id || 'admin', name: user?.name || 'المدير', role: user?.role || 'admin', department: 'الاشتراكات' },
      'edit',
      'ترقية اشتراك',
      sub.id,
      sub.subscriptionNumber,
      `ترقية اشتراك #${sub.subscriptionNumber} من (${prevPlanName}) إلى (${newPlan.name})`
    );

    return {
      success: true,
      message: `تمت ترقية الاشتراك #${sub.subscriptionNumber} إلى (${newPlan.name}) بنجاح`,
      subscription: sub,
      payment: newPayment
    };
  }

  public cancelSubscription(
    subscriptionId: string,
    reason?: string,
    user?: { id?: string; name?: string; role?: string }
  ): { success: boolean; message: string; subscription?: CustomerSubscription } {
    const sub = this.getSubscriptionById(subscriptionId);
    if (!sub) return { success: false, message: 'الاشتراك غير موجود' };

    sub.status = 'cancelled';
    sub.cancelledAt = new Date().toISOString();
    sub.cancelReason = reason || 'إلغاء بناءً على طلب العميل';
    sub.updatedAt = new Date().toISOString();

    this.saveSubscription(sub, user);

    this.logAction(
      { id: user?.id || 'admin', name: user?.name || 'المدير', role: user?.role || 'admin', department: 'الاشتراكات' },
      'edit',
      'إلغاء اشتراك',
      sub.id,
      sub.subscriptionNumber,
      `إلغاء اشتراك #${sub.subscriptionNumber} (${sub.planName}) — السبب: ${sub.cancelReason}`
    );

    return {
      success: true,
      message: `تم إلغاء الاشتراك #${sub.subscriptionNumber} بنجاح`,
      subscription: sub
    };
  }

  // 4. Payments & Refunds Management
  public getSubscriptionPayments(): SubscriptionPayment[] {
    return this.getItem<SubscriptionPayment[]>(STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, initialSubscriptionPayments);
  }

  public getSubscriptionPaymentById(id: string): SubscriptionPayment | undefined {
    const all = this.getSubscriptionPayments();
    return all.find(p => p.id === id || p.paymentNumber === id);
  }

  public refundSubscriptionPayment(
    paymentId: string,
    refundAmount: number,
    reason: string,
    user?: { id?: string; name?: string; role?: string }
  ): { success: boolean; message: string; payment?: SubscriptionPayment } {
    const payments = this.getSubscriptionPayments();
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return { success: false, message: 'عملية الدفع غير موجودة' };
    if (payment.status === 'refunded') return { success: false, message: 'تم استرداد هذا المبلغ مسبقاً' };

    payment.status = 'refunded';
    payment.refundAmount = refundAmount;
    payment.refundedAt = new Date().toISOString();
    payment.refundReason = reason;
    payment.refundedBy = user?.name || 'المدير العام';

    this.setItem(STORAGE_KEYS.SUBSCRIPTION_PAYMENTS, payments);

    // Record Cash Out from Safe (Financial Integration)
    if (refundAmount > 0) {
      this.addSafeTransaction(
        'cash_out',
        refundAmount,
        'subscription_refund',
        `استرداد مالي لاشتراك #${payment.subscriptionNumber} للعميل ${payment.customerName} (السبب: ${reason})`,
        user?.name || 'المدير العام',
        payment.subscriptionId
      );
    }

    this.logAction(
      { id: user?.id || 'admin', name: user?.name || 'المدير', role: user?.role || 'admin', department: 'الاشتراكات' },
      'edit',
      'استرداد اشتراك',
      payment.id,
      payment.paymentNumber,
      `استرداد مالي بقيمة ${refundAmount} ج.م لعملية #${payment.paymentNumber}`
    );

    return {
      success: true,
      message: `تم استرداد مبلغ ${refundAmount} ج.م وقيد العملية في الخزينة بنجاح`,
      payment
    };
  }

  // 5. Settings & Smart Notifications Engine
  public getSubscriptionSettings(): SubscriptionModuleSettings {
    return this.getItem<SubscriptionModuleSettings>(STORAGE_KEYS.SUBSCRIPTION_SETTINGS, initialSubscriptionSettings);
  }

  public saveSubscriptionSettings(settings: SubscriptionModuleSettings, user?: { id?: string; name?: string; role?: string }): SubscriptionModuleSettings {
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_SETTINGS, settings);

    this.logAction(
      { id: user?.id || 'admin', name: user?.name || 'المدير', role: user?.role || 'admin', department: 'الاشتراكات' },
      'setting_change',
      'إعدادات الاشتراكات',
      'subscriptions_config',
      'تحديث الإعدادات العامة',
      'تحديث إعدادات وفترات سماح وقوالب قسم الاشتراكات'
    );

    return settings;
  }

  public getSubscriptionNotifications(): SubscriptionNotification[] {
    return this.generateSubscriptionNotifications();
  }

  public generateSubscriptionNotifications(): SubscriptionNotification[] {
    const subscriptions = this.getSubscriptions();
    const notifications: SubscriptionNotification[] = [];
    const now = new Date();

    subscriptions.forEach(sub => {
      if (sub.status === 'cancelled' || sub.status === 'renewed') return;

      const endDate = new Date(sub.endDate);
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const cName = sub.customerName || sub.clientName || 'عميل';
      const cPhone = sub.customerPhone || sub.clientPhone || '';

      if (diffDays <= 7 && diffDays > 3) {
        notifications.push({
          id: `notif_7d_${sub.id}`,
          subscriptionId: sub.id,
          subscriptionNumber: sub.subscriptionNumber,
          customerId: sub.customerId,
          customerName: cName,
          clientName: cName,
          customerPhone: cPhone,
          clientPhone: cPhone,
          planName: sub.planName,
          expiryDate: sub.endDate,
          type: 'expiring_7d',
          title: `اشتراك #${sub.subscriptionNumber} ينتهي خلال ${diffDays} أيام`,
          message: `اشتراك العميل ${cName} في باقة (${sub.planName}) أوشك على الانتهاء بتاريخ ${sub.endDate.split('T')[0]}.`,
          sentVia: 'whatsapp',
          isSent: false,
          createdAt: new Date().toISOString()
        });
      } else if (diffDays <= 3 && diffDays > 0) {
        notifications.push({
          id: `notif_3d_${sub.id}`,
          subscriptionId: sub.id,
          subscriptionNumber: sub.subscriptionNumber,
          customerId: sub.customerId,
          customerName: cName,
          clientName: cName,
          customerPhone: cPhone,
          clientPhone: cPhone,
          planName: sub.planName,
          expiryDate: sub.endDate,
          type: 'expiring_3d',
          title: `تنبيه عاجل: اشتراك #${sub.subscriptionNumber} ينتهي خلال ${diffDays} أيام`,
          message: `تنبيه مهم للعميل ${cName}: باقة (${sub.planName}) ستتوقف بعد ${diffDays} أيام.`,
          sentVia: 'whatsapp',
          isSent: false,
          createdAt: new Date().toISOString()
        });
      } else if (diffDays === 0) {
        notifications.push({
          id: `notif_today_${sub.id}`,
          subscriptionId: sub.id,
          subscriptionNumber: sub.subscriptionNumber,
          customerId: sub.customerId,
          customerName: cName,
          clientName: cName,
          customerPhone: cPhone,
          clientPhone: cPhone,
          planName: sub.planName,
          expiryDate: sub.endDate,
          type: 'expired_today',
          title: `اشتراك #${sub.subscriptionNumber} ينتهي اليوم!`,
          message: `اشتراك العميل ${cName} ينتهي اليوم (${sub.endDate.split('T')[0]}). يرجى التواصل للتجديد.`,
          sentVia: 'whatsapp',
          isSent: false,
          createdAt: new Date().toISOString()
        });
      }
    });

    return notifications;
  }

  // 6. Subscriptions Dashboard Metrics & KPIs
  public getSubscriptionDashboardMetrics(): SubscriptionDashboardMetrics {
    const subscriptions = this.getSubscriptions();
    const payments = this.getSubscriptionPayments();
    const customers = this.getCustomers();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthStr = now.toISOString().substring(0, 7);

    const totalCustomers = customers.length;
    const uniqueSubscribers = new Set(subscriptions.map(s => s.customerId)).size;

    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active' || s.status === 'expiring_soon').length;
    const expiredSubscriptions = subscriptions.filter(s => s.status === 'expired').length;

    let expiringIn7Days = 0;
    let expiringIn3Days = 0;
    let expiringToday = 0;

    subscriptions.forEach(s => {
      if (s.status === 'active' || s.status === 'expiring_soon') {
        const end = new Date(s.endDate);
        const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) expiringToday++;
        if (diffDays <= 3 && diffDays > 0) expiringIn3Days++;
        if (diffDays <= 7 && diffDays > 3) expiringIn7Days++;
      }
    });

    const todayPayments = payments.filter(p => p.createdAt.startsWith(todayStr) && p.status === 'completed');
    const todaySalesVolume = todayPayments.reduce((sum, p) => sum + (p.netPaid || 0), 0);

    const monthPayments = payments.filter(p => p.createdAt.startsWith(thisMonthStr) && p.status === 'completed');
    const monthlySalesVolume = monthPayments.reduce((sum, p) => sum + (p.netPaid || 0), 0);

    const totalRevenueEGP = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.netPaid || 0), 0);
    const totalNetProfitEGP = subscriptions.reduce((sum, s) => sum + (s.netProfit || 0), 0);
    const failedPaymentsCount = payments.filter(p => p.status === 'failed').length;

    const totalRenewable = subscriptions.filter(s => s.renewalCount > 0 || s.status === 'renewed').length;
    const renewalRate = totalSubscriptions > 0 ? Math.round((totalRenewable / totalSubscriptions) * 100) : 0;

    return {
      totalCustomers,
      activeSubscribers: uniqueSubscribers,
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      expiringIn7Days,
      expiringIn3Days,
      expiringToday,
      todaySalesVolume,
      monthlySalesVolume,
      totalRevenueEGP,
      totalNetProfitEGP,
      failedPaymentsCount,
      renewalRate
    };
  }

  // 7. Timeline & Lifecycle Events
  public addSubscriptionTimelineEvent(
    subscriptionId: string,
    event: Omit<SubscriptionTimelineEvent, 'id' | 'createdAt'>
  ): SubscriptionTimelineEvent {
    const sub = this.getSubscriptionById(subscriptionId);
    const newEvent: SubscriptionTimelineEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      subscriptionId,
      createdAt: new Date().toISOString()
    };
    if (sub) {
      if (!sub.timelineEvents) sub.timelineEvents = [];
      sub.timelineEvents.unshift(newEvent);
      this.saveSubscription(sub);
    }
    return newEvent;
  }

  // 8. Attachments System
  public addSubscriptionAttachment(
    subscriptionId: string,
    attachment: Omit<SubscriptionAttachment, 'id' | 'uploadedAt'>
  ): SubscriptionAttachment {
    const sub = this.getSubscriptionById(subscriptionId);
    const newAttachment: SubscriptionAttachment = {
      ...attachment,
      id: `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      subscriptionId,
      uploadedAt: new Date().toISOString()
    };
    if (sub) {
      if (!sub.attachments) sub.attachments = [];
      sub.attachments.unshift(newAttachment);
      this.saveSubscription(sub);
    }
    return newAttachment;
  }

  public deleteSubscriptionAttachment(subscriptionId: string, attachmentId: string): boolean {
    const sub = this.getSubscriptionById(subscriptionId);
    if (!sub || !sub.attachments) return false;
    sub.attachments = sub.attachments.filter(a => a.id !== attachmentId);
    this.saveSubscription(sub);
    return true;
  }

  // 9. Notes System
  public addSubscriptionNote(
    targetId: string,
    targetType: 'subscription' | 'customer' | 'payment',
    text: string,
    authorName: string,
    authorRole?: string
  ): SubscriptionNote {
    const newNote: SubscriptionNote = {
      id: `snote_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      targetId,
      targetType,
      text,
      authorName,
      authorRole,
      createdAt: new Date().toISOString()
    };
    if (targetType === 'subscription') {
      const sub = this.getSubscriptionById(targetId);
      if (sub) {
        if (!sub.notesList) sub.notesList = [];
        sub.notesList.unshift(newNote);
        this.saveSubscription(sub);
      }
    }
    return newNote;
  }

  public deleteSubscriptionNote(subscriptionId: string, noteId: string): boolean {
    const sub = this.getSubscriptionById(subscriptionId);
    if (!sub || !sub.notesList) return false;
    sub.notesList = sub.notesList.filter(n => n.id !== noteId);
    this.saveSubscription(sub);
    return true;
  }

  // 10. Saved Filters Presets
  public getSubscriptionSavedFilters(): SavedFilterPreset[] {
    return this.getItem<SavedFilterPreset[]>(STORAGE_KEYS.SUBSCRIPTION_SAVED_FILTERS, [
      {
        id: 'filter_expiring_week',
        name: 'تنتهي هذا الأسبوع (عاجل)',
        criteria: { daysRange: 7, statusFilter: 'expiring_soon' },
        createdAt: new Date().toISOString()
      },
      {
        id: 'filter_iptv_active',
        name: 'مشتركو سيرفرات IPTV',
        criteria: { searchQuery: 'IPTV', statusFilter: 'active' },
        createdAt: new Date().toISOString()
      }
    ]);
  }

  public saveSubscriptionSavedFilter(preset: SavedFilterPreset): SavedFilterPreset {
    const all = this.getSubscriptionSavedFilters();
    const idx = all.findIndex(f => f.id === preset.id);
    if (idx >= 0) all[idx] = preset;
    else all.push(preset);
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_SAVED_FILTERS, all);
    return preset;
  }

  public deleteSubscriptionSavedFilter(presetId: string): boolean {
    const all = this.getSubscriptionSavedFilters();
    const filtered = all.filter(f => f.id !== presetId);
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_SAVED_FILTERS, filtered);
    return true;
  }

  // 11. Scheduler & Auto-Check Monitor
  public getSubscriptionSchedulerStatus(): SchedulerMonitorStatus {
    return this.getItem<SchedulerMonitorStatus>(STORAGE_KEYS.SUBSCRIPTION_SCHEDULER, {
      lastRunAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      totalChecksCount: 42,
      messagesSentCount: 28,
      messagesFailedCount: 0,
      subscriptionsUpdatedCount: 14
    });
  }

  public recordSchedulerRun(status: Partial<SchedulerMonitorStatus>): SchedulerMonitorStatus {
    const current = this.getSubscriptionSchedulerStatus();
    const updated: SchedulerMonitorStatus = {
      ...current,
      ...status,
      lastRunAt: new Date().toISOString(),
      totalChecksCount: (current.totalChecksCount || 0) + 1
    };
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_SCHEDULER, updated);
    return updated;
  }

  // 12. Notification Retry Queue
  public getNotificationRetryQueue(): NotificationRetryItem[] {
    return this.getItem<NotificationRetryItem[]>(STORAGE_KEYS.SUBSCRIPTION_RETRY_QUEUE, []);
  }

  public addNotificationToRetryQueue(item: Omit<NotificationRetryItem, 'id' | 'createdAt'>): NotificationRetryItem {
    const all = this.getNotificationRetryQueue();
    const newItem: NotificationRetryItem = {
      ...item,
      id: `retry_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    all.unshift(newItem);
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_RETRY_QUEUE, all);
    return newItem;
  }

  public retryNotificationItem(itemId: string): { success: boolean; message: string } {
    const all = this.getNotificationRetryQueue();
    const item = all.find(i => i.id === itemId);
    if (!item) return { success: false, message: 'العنصر غير موجود' };

    item.attempts += 1;
    item.lastAttemptAt = new Date().toISOString();
    if (item.attempts >= item.maxAttempts) {
      item.status = 'failed';
    } else {
      item.status = 'resolved';
    }
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_RETRY_QUEUE, all);
    return { success: true, message: 'تمت إعادة الإرسال بنجاح' };
  }

  public deleteNotificationRetryItem(itemId: string): boolean {
    const all = this.getNotificationRetryQueue();
    const filtered = all.filter(i => i.id !== itemId);
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_RETRY_QUEUE, filtered);
    return true;
  }

  // 13. Favorite Reports
  public getSubscriptionFavoriteReports(): string[] {
    return this.getItem<string[]>(STORAGE_KEYS.SUBSCRIPTION_FAVORITE_REPORTS, ['revenue_summary', 'retention_rate']);
  }

  public toggleSubscriptionFavoriteReport(reportKey: string): string[] {
    const all = this.getSubscriptionFavoriteReports();
    const exists = all.includes(reportKey);
    const updated = exists ? all.filter(k => k !== reportKey) : [...all, reportKey];
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_FAVORITE_REPORTS, updated);
    return updated;
  }

  public resetToDefaults(): void {
    localStorage.clear();
    this.initialize();
  }

  public zeroMainVault(newInitialBalance = 0): void {
    const settings = this.getSettings();
    settings.vaultInitialBalance = newInitialBalance;
    this.updateSettings(settings);
    this.setItem(STORAGE_KEYS.SAFE_TRANSACTIONS, []);
    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, { type: 'zero_vault', balanceAfter: newInitialBalance });
    eventBus.publish(SYSTEM_EVENTS.SETTINGS_UPDATED, settings);
  }

  public wipeFinanceData(): void {
    // 1. Zero out Vault initial balance in settings
    const settings = this.getSettings();
    settings.vaultInitialBalance = 0;
    this.updateSettings(settings);

    // 2. Clear all Customer & Main & Dealer Finance collections
    const financeKeys = [
      STORAGE_KEYS.SAFE_TRANSACTIONS,
      STORAGE_KEYS.EXPENSES,
      STORAGE_KEYS.DEBTS,
      STORAGE_KEYS.SETTLEMENTS,
      STORAGE_KEYS.SHIFT_DEFICITS,
      STORAGE_KEYS.ATTENDANCE,
      STORAGE_KEYS.SALARIES,
      STORAGE_KEYS.EMPLOYEES,
      STORAGE_KEYS.DAILY_CLOSURES,
      STORAGE_KEYS.BALANCE_WITHDRAWALS,
      STORAGE_KEYS.STORE_WALLET_TRANSACTIONS,
      STORAGE_KEYS.DEPOSIT_BONDS_FIFO,
      STORAGE_KEYS.DEPOSIT_MESSAGE_TEMPLATES,
      STORAGE_KEYS.PRICING_AUDIT_LOGS,
      // Dealer Finance collections
      STORAGE_KEYS.DEALER_SAFE_TRANSACTIONS,
      STORAGE_KEYS.DEALER_WALLET_TRANSACTIONS,
      STORAGE_KEYS.DEALER_EXPENSES,
      STORAGE_KEYS.DEALER_DEBTS,
      STORAGE_KEYS.DEALER_SETTLEMENTS,
      STORAGE_KEYS.DEALER_SHIFT_DEFICITS,
      STORAGE_KEYS.DEALER_ATTENDANCE,
      STORAGE_KEYS.DEALER_SALARIES,
      STORAGE_KEYS.DEALER_EMPLOYEES,
      STORAGE_KEYS.DEALER_DAILY_CLOSURES,
      STORAGE_KEYS.DEALER_BALANCE_WITHDRAWALS,
      STORAGE_KEYS.DEALER_PRICING_AUDIT_LOGS
    ];

    for (const key of financeKeys) {
      this.setItem(key, []);
    }

    // 3. Reset Store Wallets to system wallets only with 0 balance
    const cleanStoreSystemWallets: StoreWallet[] = [
      {
        id: 'w_cashback',
        name: 'محفظة الكاش باك المجمعة (Cashback System)',
        type: 'trust',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'CASHBACK-SYSTEM',
        isSystemWallet: true,
        systemType: 'cashback',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية مخصصة لمزامنة أرصدة وحركات الكاش باك المكتسبة والمستردة للعملاء',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'w_referrals',
        name: 'محفظة الإحالات والعمولات (Referral System)',
        type: 'trust',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'REFERRALS-SYSTEM',
        isSystemWallet: true,
        systemType: 'referrals',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية مخصصة لاحتساب وتخزين عمولات شركاء النجاح والإحالات',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'w_trust',
        name: 'محفظة الديون والأمانات (الأرصدة المعلقة)',
        type: 'trust',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'TRUST-ESCROW',
        isSystemWallet: true,
        systemType: 'trust',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية للأمانات والديون والفوائض المعلقة وحجوزات العملاء',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'w_profits',
        name: 'محفظة الأرباح الصافية (تصفية شهرية)',
        type: 'profits',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'NET-PROFITS-SAFE',
        isSystemWallet: true,
        systemType: 'profits',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية لتسجيل وتجميع صافي الأرباح المحققة من كل تذكرة بيع وشحن تلقائياً',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    this.setItem(STORAGE_KEYS.STORE_WALLETS, cleanStoreSystemWallets);

    // 4. Reset Dealer Wallets to system wallets only with 0 balance
    const cleanDealerSystemWallets: StoreWallet[] = [
      {
        id: 'mw_profits',
        name: 'محفظة أرباح التجار',
        type: 'profits',
        systemType: 'profits',
        isSystemWallet: true,
        currency: 'EGP',
        balance: 0,
        controlledBy: 'owner',
        allowWithdrawal: true,
        status: 'active',
        warningThreshold: 1000,
        notes: 'خزنة تجميع وتوثيق أرباح مبيعات الجملة وتذاكر التجار',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mw_cashback',
        name: 'محفظة كاش باك التجار',
        type: 'trust',
        systemType: 'cashback',
        isSystemWallet: true,
        currency: 'EGP',
        balance: 0,
        controlledBy: 'owner',
        allowWithdrawal: true,
        status: 'active',
        warningThreshold: 500,
        notes: 'خزنة كاش باك ومكافآت كبار التجار والموزعين المستحقة',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mw_referrals',
        name: 'محفظة إحالات وعمولات التجار',
        type: 'trust',
        systemType: 'referrals',
        isSystemWallet: true,
        currency: 'EGP',
        balance: 0,
        controlledBy: 'owner',
        allowWithdrawal: true,
        status: 'active',
        warningThreshold: 500,
        notes: 'خزنة عمولات تسويق وإحالة التجار الجدد',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mw_debts',
        name: 'محفظة ديون وأمانات التجار',
        type: 'trust',
        systemType: 'trust',
        isSystemWallet: true,
        currency: 'EGP',
        balance: 0,
        controlledBy: 'owner',
        allowWithdrawal: true,
        status: 'active',
        warningThreshold: 1000,
        notes: 'خزنة الأمانات والديون والودائع الخاصة بقطاع التجار',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    this.setItem(STORAGE_KEYS.DEALER_WALLETS, cleanDealerSystemWallets);

    // 5. Reset JKR Wallets Engine v2
    this.setItem('jkr_wallets_v2', []);
    this.setItem('jkr_wallet_lots_v2', []);
    this.setItem('jkr_wallet_transactions_v2', []);
    this.setItem('jkr_wallet_consumptions_v2', []);
    this.setItem('jkr_wallet_adjustments_v2', []);
    this.setItem('jkr_wallet_losses_v2', []);

    // 6. Publish reactive events
    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, { type: 'zero_vault', balanceAfter: 0 });
    eventBus.publish(SYSTEM_EVENTS.WALLET_MUTATED, null);
    eventBus.publish(SYSTEM_EVENTS.TRANSACTION_RECORDED, null);
    eventBus.publish(SYSTEM_EVENTS.EXPENSE_ADDED, null);
    eventBus.publish(SYSTEM_EVENTS.DEBT_UPDATED, null);
    eventBus.publish(SYSTEM_EVENTS.EMPLOYEE_MUTATED, null);
    eventBus.publish(SYSTEM_EVENTS.PAYROLL_UPDATED, null);
    eventBus.publish(SYSTEM_EVENTS.SETTINGS_UPDATED, settings);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
    }
  }

  public wipeAllData(newAdminPassword?: string, actor?: any): boolean {
    const currentAdmin = this.getUsers().find(u => u.role === 'admin');

    // 1. Authorization Guard: Actor must be admin if provided
    if (actor && actor.role !== 'admin') {
      this.logAction(
        actor,
        'delete',
        'نظام',
        'all_data',
        'محاولة تصفير بيانات النظام مرفوضة (غير مصرح)',
        `المستخدم [${actor.fullName || actor.username}] حاول تصفير بيانات النظام بالكامل دون امتلاك رتبة مدير عام.`
      );
      return false;
    }

    // 2. Password Verification Guard: Check password against existing admin if configured
    if (currentAdmin?.password && newAdminPassword && currentAdmin.password !== newAdminPassword) {
      if (actor) {
        this.logAction(
          actor,
          'delete',
          'نظام',
          'all_data',
          'محاولة تصفير بيانات بكلمة مرور خاطئة',
          'فشلت محاولة تصفير البيانات بسبب إدخال كلمة مرور غير صحيحة للمدير العام.'
        );
      }
      return false;
    }

    const adminPass = newAdminPassword || currentAdmin?.password || 'admin123';
    const adminName = currentAdmin?.fullName || 'المدير العام';
    const adminUser = currentAdmin?.username || 'admin';
    const currentSettings = this.getSettings();
    const companyName = currentSettings?.companyName || 'JKR TOPUP';

    // 2. Clear all localStorage items completely
    localStorage.clear();

    // 3. Force wipe every single data collection across ALL modules to empty arrays []
    const emptyKeys = [
      // Customers & CRM
      STORAGE_KEYS.CUSTOMERS,
      STORAGE_KEYS.CUSTOMERS_RETAIL,
      STORAGE_KEYS.CUSTOMERS_TRADERS,
      STORAGE_KEYS.CUSTOMERS_BROKERAGE,
      STORAGE_KEYS.CUSTOMERS_SUBSCRIPTIONS,
      STORAGE_KEYS.NOTES,
      STORAGE_KEYS.CUSTOMER_NOTES_LEGACY,
      STORAGE_KEYS.TICKETS,
      STORAGE_KEYS.REFERRALS,
      STORAGE_KEYS.CASHBACK,
      STORAGE_KEYS.CUSTOMER_TRANSACTIONS,
      STORAGE_KEYS.BALANCE_WITHDRAWALS,
      STORAGE_KEYS.BREAKAGE_RECORDS,
      STORAGE_KEYS.EXTENSION_RECORDS,
      STORAGE_KEYS.CUSTOMER_FILTER_PRESETS,

      // Finance & Vaults
      STORAGE_KEYS.SAFE_TRANSACTIONS,
      STORAGE_KEYS.EXPENSES,
      STORAGE_KEYS.DEBTS,
      STORAGE_KEYS.SETTLEMENTS,
      STORAGE_KEYS.SHIFT_DEFICITS,
      STORAGE_KEYS.ATTENDANCE,
      STORAGE_KEYS.SALARIES,
      STORAGE_KEYS.EMPLOYEES,
      STORAGE_KEYS.DAILY_CLOSURES,
      STORAGE_KEYS.STORE_WALLET_TRANSACTIONS,
      STORAGE_KEYS.DEPOSIT_BONDS_FIFO,
      STORAGE_KEYS.DEPOSIT_MESSAGE_TEMPLATES,
      STORAGE_KEYS.PRICING_AUDIT_LOGS,

      // Wholesale Dealers
      STORAGE_KEYS.DEALERS,
      STORAGE_KEYS.DEALER_NOTES,
      STORAGE_KEYS.DEALER_TICKETS,
      STORAGE_KEYS.DEALER_REFERRALS,
      STORAGE_KEYS.DEALER_CASHBACK,
      STORAGE_KEYS.DEALER_TRANSACTIONS,
      STORAGE_KEYS.DEALER_PRICING_AUDIT_LOGS,
      STORAGE_KEYS.DEALER_SAFE_TRANSACTIONS,
      STORAGE_KEYS.DEALER_WALLET_TRANSACTIONS,
      STORAGE_KEYS.DEALER_EXPENSES,
      STORAGE_KEYS.DEALER_DEBTS,
      STORAGE_KEYS.DEALER_SETTLEMENTS,
      STORAGE_KEYS.DEALER_SHIFT_DEFICITS,
      STORAGE_KEYS.DEALER_ATTENDANCE,
      STORAGE_KEYS.DEALER_SALARIES,
      STORAGE_KEYS.DEALER_EMPLOYEES,
      STORAGE_KEYS.DEALER_DAILY_CLOSURES,
      STORAGE_KEYS.DEALER_BALANCE_WITHDRAWALS,

      // Competitions & Rewards (الجوائز والمسابقات)
      STORAGE_KEYS.COMPETITIONS,
      STORAGE_KEYS.COMPETITION_PARTICIPANTS,
      STORAGE_KEYS.COMPETITION_REWARDS,
      STORAGE_KEYS.COMPETITION_DRAWS,

      // Merchants & Suppliers
      STORAGE_KEYS.MERCHANTS,
      STORAGE_KEYS.MERCHANT_INVOICES,
      STORAGE_KEYS.MERCHANT_REMINDERS,
      STORAGE_KEYS.MERCHANT_TRANSACTIONS,
      STORAGE_KEYS.MERCHANT_PRODUCT_RULES,
      STORAGE_KEYS.MERCHANT_NOTES,
      STORAGE_KEYS.MERCHANT_FILES,

      // Middleman System
      STORAGE_KEYS.MIDDLEMAN_DEALS,
      STORAGE_KEYS.MIDDLEMAN_ACCOUNTS,
      STORAGE_KEYS.MIDDLEMAN_NOTIFICATIONS,
      STORAGE_KEYS.MIDDLEMAN_FOLLOWUPS,

      // Subscriptions System
      STORAGE_KEYS.SUBSCRIPTIONS,
      STORAGE_KEYS.SUBSCRIPTION_PLANS,
      STORAGE_KEYS.SUBSCRIPTION_PAYMENTS,
      STORAGE_KEYS.SUBSCRIPTION_NOTIFICATIONS,
      STORAGE_KEYS.SUBSCRIPTION_SAVED_FILTERS,
      STORAGE_KEYS.SUBSCRIPTION_RETRY_QUEUE,
      STORAGE_KEYS.SUBSCRIPTION_SCHEDULER,
      STORAGE_KEYS.SUBSCRIPTION_FAVORITE_REPORTS,
      STORAGE_KEYS.SUBSCRIPTION_REPORT_PRESETS,

      // Marketing & Campaigns
      STORAGE_KEYS.MARKETING_CAMPAIGNS,
      STORAGE_KEYS.TICKET_CAMPAIGN_LINKS,

      // Catalog, Coupons, Codes
      STORAGE_KEYS.GAMES_TREE,
      STORAGE_KEYS.FIRST_SHIPPING_GAME_TREE,
      STORAGE_KEYS.COUPONS,
      STORAGE_KEYS.SYSTEM_CODES,
      STORAGE_KEYS.COPY_TEMPLATES,
      STORAGE_KEYS.GAME_COPY_SETTINGS,

      // System Logs & Notifications
      STORAGE_KEYS.AUDIT_LOGS,
      STORAGE_KEYS.NOTIFICATIONS
    ];

    for (const key of emptyKeys) {
      this.setItem(key, []);
    }

    // 4. Reset Competitions Service explicitly
    CompetitionService.wipeAllCompetitionsData();

    // 5. Clean Store Wallets with zero balances
    const cleanStoreWallets: StoreWallet[] = [
      {
        id: 'w_cashback',
        name: 'محفظة الكاش باك المجمعة (Cashback System)',
        type: 'trust',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'CASHBACK-SYSTEM',
        isSystemWallet: true,
        systemType: 'cashback',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية مخصصة لمزامنة أرصدة وحركات الكاش باك المكتسبة والمستردة للعملاء',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'w_referrals',
        name: 'محفظة الإحالات والعمولات (Referral System)',
        type: 'trust',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'REFERRALS-SYSTEM',
        isSystemWallet: true,
        systemType: 'referrals',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية مخصصة لاحتساب وتخزين عمولات شركاء النجاح والإحالات',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'w_trust',
        name: 'محفظة الديون والأمانات (الأرصدة المعلقة)',
        type: 'trust',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'TRUST-ESCROW',
        isSystemWallet: true,
        systemType: 'trust',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية للأمانات والديون والفوائض المعلقة وحجوزات العملاء',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'w_profits',
        name: 'محفظة الأرباح الصافية (تصفية شهرية)',
        type: 'profits',
        currency: 'EGP',
        balance: 0,
        accountNumber: 'NET-PROFITS-SAFE',
        isSystemWallet: true,
        systemType: 'profits',
        controlledBy: 'owner',
        allowWithdrawal: false,
        notes: 'محفظة نظام آلية لتسجيل وتجميع صافي الأرباح المحققة من كل تذكرة بيع وشحن تلقائياً',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    this.setItem(STORAGE_KEYS.STORE_WALLETS, cleanStoreWallets);

    // 6. Clean Dealer Wallets with zero balances
    const cleanDealerWallets: StoreWallet[] = [
      {
        id: 'mw_profits',
        name: 'محفظة أرباح التجار',
        type: 'profits',
        systemType: 'profits',
        isSystemWallet: true,
        currency: 'EGP',
        balance: 0,
        controlledBy: 'owner',
        allowWithdrawal: true,
        status: 'active',
        warningThreshold: 1000,
        notes: 'خزنة تجميع وتوثيق أرباح مبيعات الجملة وتذاكر التجار',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mw_cashback',
        name: 'محفظة كاش باك التجار',
        type: 'trust',
        systemType: 'cashback',
        isSystemWallet: true,
        currency: 'EGP',
        balance: 0,
        controlledBy: 'owner',
        allowWithdrawal: true,
        status: 'active',
        warningThreshold: 500,
        notes: 'خزنة كاش باك ومكافآت كبار التجار والموزعين المستحقة',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mw_referrals',
        name: 'محفظة إحالات وعمولات التجار',
        type: 'trust',
        systemType: 'referrals',
        isSystemWallet: true,
        currency: 'EGP',
        balance: 0,
        controlledBy: 'owner',
        allowWithdrawal: true,
        status: 'active',
        warningThreshold: 500,
        notes: 'خزنة عمولات تسويق وإحالة التجار الجدد',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mw_debts',
        name: 'محفظة ديون وأمانات التجار',
        type: 'trust',
        systemType: 'trust',
        isSystemWallet: true,
        currency: 'EGP',
        balance: 0,
        controlledBy: 'owner',
        allowWithdrawal: true,
        status: 'active',
        warningThreshold: 1000,
        notes: 'خزنة الأمانات والديون والودائع الخاصة بقطاع التجار',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    this.setItem(STORAGE_KEYS.DEALER_WALLETS, cleanDealerWallets);

    // 7. Clear JKR Wallets Engine v2
    this.setItem('jkr_wallets_v2', []);
    this.setItem('jkr_wallet_lots_v2', []);
    this.setItem('jkr_wallet_transactions_v2', []);
    this.setItem('jkr_wallet_consumptions_v2', []);
    this.setItem('jkr_wallet_adjustments_v2', []);
    this.setItem('jkr_wallet_losses_v2', []);

    // 8. Clean Settings with vaultInitialBalance set to 0.0 (Zero initial balance)
    const cleanSettings: SystemSettings = {
      ...initialSettings,
      vaultInitialBalance: 0,
      companyName: companyName
    };
    this.setItem(STORAGE_KEYS.SETTINGS, cleanSettings);

    // 9. Base configurations
    this.setItem(STORAGE_KEYS.EXCHANGE_RATE, initialExchangeRate);
    this.setItem(STORAGE_KEYS.CUSTOMER_MODULE_SETTINGS, initialCustomerModuleSettings);
    this.setItem(STORAGE_KEYS.DEALER_MODULE_SETTINGS, initialDealerModuleSettings);
    this.setItem(STORAGE_KEYS.MIDDLEMAN_SETTINGS, initialMiddlemanModuleSettings);
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_SETTINGS, initialSubscriptionSettings);

    // 10. Recreate clean Admin User (ONLY user in the system)
    const cleanAdmin: User = {
      id: currentAdmin?.id || 'usr_admin',
      username: adminUser,
      fullName: adminName,
      role: 'admin',
      jobTitle: 'المدير العام',
      password: adminPass,
      isActive: true,
      permissions: [
        'view', 'add', 'edit', 'delete', 'print', 'export',
        'manage_users', 'manage_finance', 'close_shift', 'manage_settings'
      ],
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    this.setItem(STORAGE_KEYS.USERS, [cleanAdmin]);

    // 11. Restore active session for admin and mark initialization flags
    localStorage.setItem('nzm_jkr_current_user', JSON.stringify(cleanAdmin));
    localStorage.setItem('nzm_jkr_current_dept', 'all');
    localStorage.setItem('nzm_jkr_competitions_initialized', 'true');
    localStorage.removeItem('nzm_jkr_auth_user');

    // 12. Publish reactive events
    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, { type: 'zero_vault', balanceAfter: 0 });
    eventBus.publish(SYSTEM_EVENTS.WALLET_MUTATED, null);
    eventBus.publish(SYSTEM_EVENTS.SETTINGS_UPDATED, cleanSettings);
    eventBus.publish(SYSTEM_EVENTS.COMPETITIONS_UPDATED, null);
    eventBus.publish(SYSTEM_EVENTS.CUSTOMER_CREATED, null);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('store_wallets_updated'));
    }
    return true;
  }

  // ==========================================
  // BALANCE WITHDRAWALS ENGINE (سحب أرصدة الزبائن والتجار)
  // ==========================================

  public getBalanceWithdrawals(customerId?: string): BalanceWithdrawal[] {
    const list = this.getItem<BalanceWithdrawal[]>(STORAGE_KEYS.BALANCE_WITHDRAWALS, []);
    if (customerId) {
      return list.filter(w => w.partyId === customerId || w.partyPhone === customerId);
    }
    return list;
  }

  public getDealerBalanceWithdrawals(dealerId?: string): BalanceWithdrawal[] {
    const list = this.getItem<BalanceWithdrawal[]>(STORAGE_KEYS.DEALER_BALANCE_WITHDRAWALS, []);
    if (dealerId) {
      return list.filter(w => w.partyId === dealerId || w.partyPhone === dealerId);
    }
    return list;
  }

  public recordBalanceWithdrawal(withdrawal: BalanceWithdrawal, currentUser?: any): void {
    const all = this.getItem<BalanceWithdrawal[]>(STORAGE_KEYS.BALANCE_WITHDRAWALS, []);
    all.unshift(withdrawal);
    this.setItem(STORAGE_KEYS.BALANCE_WITHDRAWALS, all);

    // 1. Update customer wallets and synchronize ledger transactions
    const customer = this.getCustomerById(withdrawal.partyId) || this.getCustomers().find(c => c.phone === withdrawal.partyPhone);
    if (customer) {
      for (const item of withdrawal.items) {
        if (item.walletType === 'main') {
          customer.accountBalance = Math.max(0, (customer.accountBalance || 0) - item.amount);
          customer.balance = Math.max(0, (customer.balance || 0) - item.amount);
          // Add to Customer Transactions ledger
          try {
            this.addCustomerTransaction(
              customer.id,
              'withdrawal',
              item.amount,
              `سحب نقدي من المحفظة الأساسية (تذكرة #${withdrawal.id})`,
              withdrawal.recordedBy || currentUser?.fullName || 'موظف الحسابات',
              withdrawal.id
            );
          } catch (_) {}
        } else if (item.walletType === 'referral') {
          // Record in Unified Wallet Transactions (reconciles referralWalletBalance)
          try {
            this.addUnifiedWalletTransaction({
              customerId: customer.id,
              walletType: 'referral',
              type: 'redeemed',
              amount: item.amount,
              operationName: `سحب رصيد إحالة نقدي (تذكرة #${withdrawal.id})`,
              notes: withdrawal.notes || `بواسطة ${withdrawal.recordedBy || currentUser?.fullName || 'موظف الحسابات'}`,
              balanceAfter: Math.max(0, (customer.referralWalletBalance || 0) - item.amount),
              orderNumber: withdrawal.id
            });
            // Debit from system referrals pool wallet (w_referrals)
            this.debitReferralFromSystemWallet(
              item.amount,
              customer.name,
              `سحب رصيد إحالة تذكرة #${withdrawal.id}`
            );
          } catch (_) {}
        } else if (item.walletType === 'cashback') {
          // Record in Unified Wallet Transactions (reconciles cashbackBalance)
          try {
            this.addUnifiedWalletTransaction({
              customerId: customer.id,
              walletType: 'cashback',
              type: 'redeemed',
              amount: item.amount,
              operationName: `سحب رصيد كاش باك نقدي (تذكرة #${withdrawal.id})`,
              notes: withdrawal.notes || `بواسطة ${withdrawal.recordedBy || currentUser?.fullName || 'موظف الحسابات'}`,
              balanceAfter: Math.max(0, (customer.cashbackBalance || 0) - item.amount),
              orderNumber: withdrawal.id
            });
            // Debit from system cashback pool wallet (w_cashback)
            this.debitCashbackFromSystemWallet(
              item.amount,
              customer.name,
              withdrawal.id
            );
          } catch (_) {}
        }
      }
      this.saveCustomer(customer);
      const updatedCustomer = this.getCustomerById(customer.id);
      if (updatedCustomer) {
        eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, updatedCustomer);
      }
    }

    // 2. Safe transaction: cash out from main vault
    try {
      this.addSafeTransaction(
        'cash_out',
        withdrawal.totalAmount,
        'expense',
        `سحب رصيد عميل (تذكرة ${withdrawal.id}) - العميل: ${withdrawal.partyName} (رقم: ${withdrawal.partyPhone})`,
        withdrawal.recordedBy || currentUser?.fullName || 'موظف الحسابات',
        withdrawal.id,
        {
          operationNumber: withdrawal.id,
          notes: withdrawal.notes || `سحب من المحافظ: ${withdrawal.items.map(i => `${i.walletName}: ${i.amount} ج.م`).join(' + ')}`,
          user: currentUser
        }
      );
    } catch (e) {
      console.error('Error recording safe tx for withdrawal:', e);
    }

    // 3. Audit log
    if (currentUser) {
      try {
        this.addAuditLog(
          currentUser,
          'add',
          'customer_withdrawal',
          withdrawal.id,
          `سحب رصيد عميل بقيمة ${withdrawal.totalAmount} ج.م - العميل: ${withdrawal.partyName} (${withdrawal.partyPhone})`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, {});
    eventBus.publish(SYSTEM_EVENTS.WALLET_WITHDRAW, withdrawal);
    eventBus.publish(SYSTEM_EVENTS.WALLET_MUTATED, {});
  }

  public recordDealerBalanceWithdrawal(withdrawal: BalanceWithdrawal, currentUser?: any): void {
    const all = this.getItem<BalanceWithdrawal[]>(STORAGE_KEYS.DEALER_BALANCE_WITHDRAWALS, []);
    all.unshift(withdrawal);
    this.setItem(STORAGE_KEYS.DEALER_BALANCE_WITHDRAWALS, all);

    // 1. Update dealer wallets and synchronize ledger transactions
    const dealer = this.getDealerById(withdrawal.partyId) || this.getDealers().find(d => d.phone === withdrawal.partyPhone);
    if (dealer) {
      const dealerWallets = this.getDealerWallets();
      for (const item of withdrawal.items) {
        if (item.walletType === 'main') {
          dealer.accountBalance = Math.max(0, (dealer.accountBalance || 0) - item.amount);
          dealer.balance = Math.max(0, (dealer.balance || 0) - item.amount);
          try {
            this.addDealerNote({
              dealerId: dealer.id,
              authorName: withdrawal.recordedBy || currentUser?.fullName || 'الإدارة المالية',
              authorRole: 'financial',
              content: `💸 تم سحب رصيد نقدي من المحفظة الأساسية بقيمة ${item.amount} ج.م (تذكرة #${withdrawal.id})`,
              type: 'financial'
            });
          } catch (_) {}
        } else if (item.walletType === 'referral') {
          try {
            this.addDealerUnifiedWalletTransaction({
              customerId: dealer.id,
              walletType: 'referral',
              type: 'redeemed',
              amount: item.amount,
              operationName: `سحب رصيد إحالة نقدي للتاجر (تذكرة #${withdrawal.id})`,
              notes: withdrawal.notes || `بواسطة ${withdrawal.recordedBy || currentUser?.fullName || 'موظف الحسابات'}`,
              balanceAfter: Math.max(0, (dealer.referralWalletBalance || 0) - item.amount),
              orderNumber: withdrawal.id
            });
            const dRefW = dealerWallets.find(w => w.id === 'mw_referrals' || w.systemType === 'referrals');
            if (dRefW) {
              dRefW.balance = Math.max(0, dRefW.balance - item.amount);
              dRefW.totalWithdrawn = (dRefW.totalWithdrawn || 0) + item.amount;
              dRefW.updatedAt = new Date().toISOString();
            }
          } catch (_) {}
        } else if (item.walletType === 'cashback') {
          try {
            this.addDealerUnifiedWalletTransaction({
              customerId: dealer.id,
              walletType: 'cashback',
              type: 'redeemed',
              amount: item.amount,
              operationName: `سحب رصيد كاش باك نقدي للتاجر (تذكرة #${withdrawal.id})`,
              notes: withdrawal.notes || `بواسطة ${withdrawal.recordedBy || currentUser?.fullName || 'موظف الحسابات'}`,
              balanceAfter: Math.max(0, (dealer.cashbackBalance || 0) - item.amount),
              orderNumber: withdrawal.id
            });
            const dCbW = dealerWallets.find(w => w.id === 'mw_cashback' || w.systemType === 'cashback');
            if (dCbW) {
              dCbW.balance = Math.max(0, dCbW.balance - item.amount);
              dCbW.totalWithdrawn = (dCbW.totalWithdrawn || 0) + item.amount;
              dCbW.updatedAt = new Date().toISOString();
            }
          } catch (_) {}
        }
      }
      this.setItem(STORAGE_KEYS.DEALER_WALLETS, dealerWallets);
      this.saveDealer(dealer);
      const updatedDealer = this.getDealerById(dealer.id);
      if (updatedDealer) {
        eventBus.publish(SYSTEM_EVENTS.MERCHANT_UPDATED, updatedDealer);
      }
    }

    // 2. Safe transaction: cash out from dealer safe
    try {
      this.addDealerSafeTransaction(
        'cash_out',
        withdrawal.totalAmount,
        'expense',
        `سحب رصيد تاجر (تذكرة ${withdrawal.id}) - التاجر: ${withdrawal.partyName} (${withdrawal.partyPhone})`,
        withdrawal.recordedBy || currentUser?.fullName || 'موظف الحسابات',
        withdrawal.id,
        {
          notes: withdrawal.notes || `سحب من المحافظ: ${withdrawal.items.map(i => `${i.walletName}: ${i.amount} ج.م`).join(' + ')}`,
          user: currentUser
        }
      );
    } catch (e) {
      console.error('Error recording dealer safe tx for withdrawal:', e);
    }

    // 3. Audit log
    if (currentUser) {
      try {
        this.addAuditLog(
          currentUser,
          'add',
          'dealer_withdrawal',
          withdrawal.id,
          `سحب رصيد تاجر بقيمة ${withdrawal.totalAmount} ج.م - التاجر: ${withdrawal.partyName} (${withdrawal.partyPhone})`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, {});
    eventBus.publish(SYSTEM_EVENTS.WALLET_WITHDRAW, withdrawal);
    eventBus.publish(SYSTEM_EVENTS.WALLET_MUTATED, {});
  }

  public cancelBalanceWithdrawal(id: string, reason: string, isDealer = false, currentUser?: any): void {
    const key = isDealer ? STORAGE_KEYS.DEALER_BALANCE_WITHDRAWALS : STORAGE_KEYS.BALANCE_WITHDRAWALS;
    const all = this.getItem<BalanceWithdrawal[]>(key, []);
    const withdrawal = all.find(w => w.id === id);
    if (!withdrawal || withdrawal.status === 'cancelled') return;

    withdrawal.status = 'cancelled';
    withdrawal.cancellationReason = reason;
    withdrawal.cancelledAt = new Date().toISOString();
    withdrawal.cancelledBy = currentUser?.fullName || 'مسؤول النظام';
    this.setItem(key, all);

    // Restore customer/dealer wallets with ledger reversal transactions
    if (isDealer) {
      const dealer = this.getDealerById(withdrawal.partyId) || this.getDealers().find(d => d.phone === withdrawal.partyPhone);
      if (dealer) {
        const dealerWallets = this.getDealerWallets();
        for (const item of withdrawal.items) {
          if (item.walletType === 'main') {
            dealer.accountBalance = (dealer.accountBalance || 0) + item.amount;
            dealer.balance = (dealer.balance || 0) + item.amount;
          } else if (item.walletType === 'referral') {
            try {
              this.addDealerUnifiedWalletTransaction({
                customerId: dealer.id,
                walletType: 'referral',
                type: 'credit',
                amount: item.amount,
                operationName: `إلغاء تذكرة سحب #${withdrawal.id} واسترجاع رصيد الإحالة للتاجر`,
                notes: `السبب: ${reason}`,
                balanceAfter: (dealer.referralWalletBalance || 0) + item.amount,
                orderNumber: withdrawal.id
              });
              const dRefW = dealerWallets.find(w => w.id === 'mw_referrals' || w.systemType === 'referrals');
              if (dRefW) {
                dRefW.balance += item.amount;
                dRefW.updatedAt = new Date().toISOString();
              }
            } catch (_) {}
          } else if (item.walletType === 'cashback') {
            try {
              this.addDealerUnifiedWalletTransaction({
                customerId: dealer.id,
                walletType: 'cashback',
                type: 'credit',
                amount: item.amount,
                operationName: `إلغاء تذكرة سحب #${withdrawal.id} واسترجاع رصيد الكاش باك للتاجر`,
                notes: `السبب: ${reason}`,
                balanceAfter: (dealer.cashbackBalance || 0) + item.amount,
                orderNumber: withdrawal.id
              });
              const dCbW = dealerWallets.find(w => w.id === 'mw_cashback' || w.systemType === 'cashback');
              if (dCbW) {
                dCbW.balance += item.amount;
                dCbW.updatedAt = new Date().toISOString();
              }
            } catch (_) {}
          }
        }
        this.setItem(STORAGE_KEYS.DEALER_WALLETS, dealerWallets);
        this.saveDealer(dealer);
        eventBus.publish(SYSTEM_EVENTS.MERCHANT_UPDATED, dealer);
      }
      this.addDealerSafeTransaction(
        'cash_in',
        withdrawal.totalAmount,
        'customer_deposit',
        `إلغاء تذكرة سحب رصيد تاجر ${withdrawal.id} واسترجاع المبلغ للخزنة - السبب: ${reason}`,
        currentUser?.fullName || 'مسؤول النظام',
        withdrawal.id
      );
    } else {
      const customer = this.getCustomerById(withdrawal.partyId) || this.getCustomers().find(c => c.phone === withdrawal.partyPhone);
      if (customer) {
        for (const item of withdrawal.items) {
          if (item.walletType === 'main') {
            customer.accountBalance = (customer.accountBalance || 0) + item.amount;
            customer.balance = (customer.balance || 0) + item.amount;
            try {
              this.addCustomerTransaction(
                customer.id,
                'deposit',
                item.amount,
                `إلغاء تذكرة سحب #${withdrawal.id} واسترجاع الرصيد للمحفظة الأساسية - السبب: ${reason}`,
                currentUser?.fullName || 'مسؤول النظام',
                withdrawal.id
              );
            } catch (_) {}
          } else if (item.walletType === 'referral') {
            try {
              this.addUnifiedWalletTransaction({
                customerId: customer.id,
                walletType: 'referral',
                type: 'credit',
                amount: item.amount,
                operationName: `إلغاء تذكرة سحب #${withdrawal.id} واسترجاع رصيد الإحالة`,
                notes: `السبب: ${reason}`,
                balanceAfter: (customer.referralWalletBalance || 0) + item.amount,
                orderNumber: withdrawal.id
              });
              this.creditReferralToSystemWallet(item.amount, customer.name, withdrawal.id);
            } catch (_) {}
          } else if (item.walletType === 'cashback') {
            try {
              this.addUnifiedWalletTransaction({
                customerId: customer.id,
                walletType: 'cashback',
                type: 'credit',
                amount: item.amount,
                operationName: `إلغاء تذكرة سحب #${withdrawal.id} واسترجاع رصيد الكاش باك`,
                notes: `السبب: ${reason}`,
                balanceAfter: (customer.cashbackBalance || 0) + item.amount,
                orderNumber: withdrawal.id
              });
              const wallets = this.getStoreWallets();
              const cbW = wallets.find(w => w.id === 'w_cashback' || w.systemType === 'cashback');
              if (cbW) {
                cbW.balance += item.amount;
                this.setItem(STORAGE_KEYS.STORE_WALLETS, wallets);
              }
            } catch (_) {}
          }
        }
        this.saveCustomer(customer);
        eventBus.publish(SYSTEM_EVENTS.CUSTOMER_UPDATED, customer);
      }
      this.addSafeTransaction(
        'cash_in',
        withdrawal.totalAmount,
        'customer_deposit',
        `إلغاء تذكرة سحب رصيد عميل ${withdrawal.id} واسترجاع المبلغ للخزنة - السبب: ${reason}`,
        currentUser?.fullName || 'مسؤول النظام',
        withdrawal.id
      );
    }

    if (currentUser) {
      try {
        this.addAuditLog(
          currentUser,
          'cancel',
          isDealer ? 'dealer_withdrawal' : 'customer_withdrawal',
          withdrawal.id,
          `إلغاء سحب رصيد ${withdrawal.id} بقيمة ${withdrawal.totalAmount} ج.م - السبب: ${reason}`
        );
      } catch (_) {}
    }

    eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, {});
    eventBus.publish(SYSTEM_EVENTS.WALLET_MUTATED, {});
  }

  // =============================================================
  // GAMIFICATION & COMPETITIONS SYSTEM (🎯 المسابقات والمكافآت)
  // =============================================================
  public getCompetitions(includeArchived = false): Competition[] {
    return CompetitionService.getCompetitions(includeArchived);
  }

  public getCompetitionById(id: string): Competition | undefined {
    return CompetitionService.getCompetitionById(id);
  }

  public saveCompetition(competition: Competition, user?: any): Competition {
    return CompetitionService.saveCompetition(competition, user);
  }

  public deleteCompetition(id: string, user: any): { success: boolean; message?: string } {
    return CompetitionService.deleteCompetition(id, user);
  }

  public getCompetitionParticipants(competitionId?: string): CompetitionParticipant[] {
    return CompetitionService.getParticipants(competitionId);
  }

  public saveCompetitionParticipant(participant: CompetitionParticipant): void {
    CompetitionService.saveParticipant(participant);
  }

  public syncCompetitionParticipants(competitionId: string): void {
    CompetitionService.syncCompetitionParticipants(competitionId);
  }

  public verifyCompetitionSocialProof(participantId: string, status: 'approved' | 'rejected', notes: string, user: any): CompetitionParticipant {
    return CompetitionService.verifySocialProof(participantId, status, notes, user);
  }

  public getCompetitionRewards(): CompetitionReward[] {
    return CompetitionService.getRewards();
  }

  public getCompetitionRewardById(id: string): CompetitionReward | undefined {
    return CompetitionService.getRewardById(id);
  }

  public saveCompetitionReward(reward: CompetitionReward): void {
    CompetitionService.saveReward(reward);
  }

  public deliverCompetitionReward(rewardId: string, user: any) {
    if (user && user.role !== 'admin' && !user.permissions?.includes('deliver_rewards')) {
      this.logAction(
        user,
        'edit',
        'مكافأة مسابقة',
        rewardId,
        'محاولة تسليم مكافأة مرفوضة (غير مصرح)',
        `المستخدم [${user.fullName || user.username}] حاول تسليم المكافأة [${rewardId}] دون امتلاك صلاحية تسليم المكافآت.`
      );
      return { success: false, message: 'ليس لديك صلاحية تسليم واعتماد مكافآت المسابقات.' };
    }
    return CompetitionService.deliverReward(rewardId, user);
  }

  public cancelCompetitionReward(rewardId: string, user: any, reason: string): CompetitionReward {
    return CompetitionService.cancelReward(rewardId, user, reason);
  }

  public runCompetitionDraw(competitionId: string, user: any) {
    return CompetitionService.runRandomDraw(competitionId, user);
  }

  public getCompetitionDashboardKPIs(): CompetitionsDashboardKPIs {
    return CompetitionService.calculateDashboardKPIs();
  }

  public syncAllActiveCompetitions(): void {
    CompetitionService.syncAllActiveCompetitions();
  }
}

export const db = new LocalDatabase();
db.initialize();


