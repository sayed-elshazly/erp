// =============================================================
// NZM JKR TOP UP ERP — Subscriptions Module Types
// =============================================================

export type SubscriptionDurationUnit = 'days' | 'months' | 'years';

export type SubscriptionStatus =
  | 'active'          // ساري ونشط
  | 'expiring_soon'    // أوشك على الانتهاء (أقل من 7 أيام)
  | 'expired'          // منتهي
  | 'renewed'          // تم تجديده
  | 'cancelled'        // ملغي
  | 'frozen';          // مجمّد مؤقتاً

export type SubscriptionPaymentStatus = 'paid' | 'partial' | 'pending' | 'refunded';

export type SubscriptionPaymentMethod =
  | 'safe_cash'         // نقدًا بالخزينة
  | 'vodafone_cash'      // فودافون كاش
  | 'instapay'           // إنستاباي
  | 'bank_transfer'      // تحويل بنكي
  | 'customer_wallet';   // خصم من محفظة العميل

export interface PriceHistoryItem {
  id?: string;
  oldPrice?: number;
  newPrice?: number;
  price?: number;
  costPrice?: number;
  modifiedAt?: string;
  changedAt?: string;
  modifiedBy?: string;
  changedBy?: string;
  reason?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  category: string; // e.g. 'ألعاب', 'بث وترفيه', 'ذكاء اصطناعي', 'برامج وإنتاجية', 'سيرفرات IPTV'
  description: string;
  price: number;
  originalPrice?: number;
  costPrice: number;
  durationValue: number; // e.g. 1, 3, 6, 12, 30
  durationUnit: SubscriptionDurationUnit;
  features: string[];
  status: 'active' | 'inactive';
  icon?: string;
  badge?: string;
  color?: string;
  sortOrder: number;
  image?: string;
  autoRenewalAllowed: boolean;
  gracePeriodDays: number;
  totalSubscribersCount?: number;
  priceHistory?: PriceHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export type CurrencyType = 'EGP' | 'USD' | 'SAR' | 'AED';

export type SubscriptionTimelineEventType =
  | 'created'
  | 'paid'
  | 'renewed'
  | 'upgraded'
  | 'downgraded'
  | 'refunded'
  | 'suspended'
  | 'reactivated'
  | 'cancelled'
  | 'notification_sent'
  | 'edited';

export interface SubscriptionTimelineEvent {
  id: string;
  subscriptionId?: string;
  type: SubscriptionTimelineEventType;
  title: string;
  description: string;
  userName: string;
  userId?: string;
  createdAt: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
}

export interface SubscriptionAttachment {
  id: string;
  subscriptionId?: string;
  fileName: string;
  fileType: 'image' | 'pdf' | 'document';
  fileUrl: string; // base64 or object URL
  fileSize?: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface SubscriptionNote {
  id: string;
  targetId: string;
  targetType: 'subscription' | 'customer' | 'payment';
  text: string;
  authorName: string;
  authorRole?: string;
  createdAt: string;
}

export interface CustomerSubscription {
  id: string;
  subscriptionNumber: string; // e.g. SUB-1001
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerCode?: string;
  clientName?: string; // Alias for customerName
  clientPhone?: string; // Alias for customerPhone

  // Plan Details
  planId: string;
  planName: string;
  planCategory?: string;
  durationValue: number;
  durationUnit: SubscriptionDurationUnit;

  // Period
  startDate: string;
  endDate: string;
  graceEndDate?: string;

  // Multi-Currency & Pricing
  currency?: CurrencyType;
  exchangeRateToEGP?: number;
  originalPrice: number;
  discountAmount: number;
  couponCode?: string;
  finalPrice: number;
  amount?: number; // Alias for finalPrice / originalPrice
  costPrice: number;
  netProfit: number;
  paymentStatus: SubscriptionPaymentStatus;
  paymentMethod: SubscriptionPaymentMethod;

  // Lifecycle Status
  status: SubscriptionStatus;
  autoRenew: boolean;
  renewalCount: number;
  lastRenewedAt?: string;
  previousPlanId?: string;
  upgradedFromId?: string;

  // Credentials / Delivery Data (Optional for digital accounts/IPTV)
  serviceAccountUser?: string;
  serviceAccountPassword?: string;
  serviceServerUrl?: string;
  serviceNotes?: string;

  // Timeline, Attachments & Notes
  timelineEvents?: SubscriptionTimelineEvent[];
  attachments?: SubscriptionAttachment[];
  notesList?: SubscriptionNote[];

  // Internal Notes & Audit
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface SubscriptionPayment {
  id: string;
  paymentNumber: string; // e.g. PAY-1001
  subscriptionId: string;
  subscriptionNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;

  amount: number;
  currency?: CurrencyType;
  discount: number;
  netPaid: number;
  paymentMethod: SubscriptionPaymentMethod;
  status: 'completed' | 'refunded' | 'failed';

  // Refund Tracking
  refundAmount?: number;
  refundedAt?: string;
  refundReason?: string;
  refundedBy?: string;

  // Receipt & QR
  receiptNumber: string;
  qrValidationCode?: string;
  employeeName: string;
  notes?: string;
  createdAt: string;
}

export type SubscriptionNotificationType =
  | 'expiring_7d'
  | 'expiring_3d'
  | 'expiring_1d'
  | 'expired_today'
  | 'expired_past'
  | 'renewed'
  | 'welcome';

export interface SubscriptionNotification {
  id: string;
  subscriptionId: string;
  subscriptionNumber: string;
  customerId: string;
  customerName: string;
  clientName?: string; // Alias for customerName
  customerPhone: string;
  clientPhone?: string; // Alias for customerPhone
  planName: string;
  expiryDate: string;

  type: SubscriptionNotificationType;
  title: string;
  message: string;
  sentVia: 'whatsapp' | 'telegram' | 'sms' | 'in_app';
  isSent: boolean;
  sentAt?: string;
  error?: string;
  retryCount?: number;
  createdAt: string;
}

export interface NotificationRetryItem {
  id: string;
  notificationId: string;
  subscriptionNumber: string;
  customerName: string;
  targetPhone?: string;
  channel: 'whatsapp' | 'telegram' | 'sms' | 'email';
  message: string;
  attempts: number;
  maxAttempts: number;
  status: 'queued' | 'retrying' | 'failed' | 'resolved';
  lastAttemptAt?: string;
  lastError?: string;
  createdAt: string;
}

export interface SavedFilterPreset {
  id: string;
  name: string;
  criteria: {
    statusFilter?: string;
    planFilter?: string;
    employeeFilter?: string;
    daysRange?: number;
    searchQuery?: string;
  };
  isDefault?: boolean;
  createdAt: string;
}

export type ReceiptTemplateType = 'thermal_80mm' | 'a4' | 'compact_card' | 'luxury_gold';

export interface SchedulerMonitorStatus {
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
  totalChecksCount: number;
  messagesSentCount: number;
  messagesFailedCount: number;
  subscriptionsUpdatedCount: number;
}

export interface SubscriptionNotificationTemplate {
  id: string;
  type: SubscriptionNotificationType;
  title: string;
  messageTemplate: string;
  enabled: boolean;
  daysBeforeExpiry?: number;
}

export interface SubscriptionModuleSettings {
  autoExpiryCheck: boolean;
  gracePeriodDays: number;
  enableProration: boolean;
  allowCustomerSelfRenewal: boolean;
  defaultPaymentMethod: SubscriptionPaymentMethod;
  defaultPaperFormat: 'thermal_80mm' | 'a4';
  defaultReceiptTemplate: ReceiptTemplateType;
  defaultCurrency: CurrencyType;

  // Currency Exchange Rates (Base: EGP)
  currencyRates: {
    EGP: number;
    USD: number;
    SAR: number;
    AED: number;
  };

  // Business Meta
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  invoiceFooterNote: string;
  termsAndConditions: string;

  // Templates
  templates: SubscriptionNotificationTemplate[];
}

export interface SubscriptionDashboardMetrics {
  totalCustomers: number;
  activeSubscribers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  expiringIn7Days: number;
  expiringIn3Days: number;
  expiringToday: number;

  todaySalesVolume: number;
  monthlySalesVolume: number;
  totalRevenueEGP: number;
  totalNetProfitEGP: number;
  failedPaymentsCount: number;
  renewalRate: number; // e.g. 85.5%
}
