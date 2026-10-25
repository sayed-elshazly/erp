// =============================================================
// NZM JKR TOP UP ERP — Middleman & Escrow System Types (V1.0)
// =============================================================

export type MiddlemanDealType =
  | 'account_sale'       // بيع حساب
  | 'account_purchase'   // شراء حساب
  | 'currency_sale'      // بيع عملات
  | 'currency_purchase'  // شراء عملات
  | 'script_sale'        // بيع سكربت
  | 'digital_product'    // بيع منتج رقمي
  | 'service'            // بيع خدمة
  | 'other';             // أخرى

export type MiddlemanDealStatus =
  | 'new'                // جديدة
  | 'awaiting_transfer'  // بانتظار التحويل
  | 'awaiting_seller'    // بانتظار البائع
  | 'awaiting_buyer'     // بانتظار المشتري
  | 'in_progress'        // قيد التنفيذ
  | 'completed'          // مكتملة
  | 'canceled'           // ملغاة
  | 'dispute';           // نزاع

export type CommissionType = 'percentage' | 'fixed';

export type DealCurrency = 'EGP' | 'USD' | 'USDT';

export interface MiddlemanStatusHistoryItem {
  id: string;
  status: MiddlemanDealStatus;
  statusLabelArabic: string;
  previousStatus?: MiddlemanDealStatus;
  userName: string;
  userRole: string;
  timestamp: string;
  notes?: string;
}

export interface MiddlemanAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'file' | 'transfer_proof' | 'chat_log';
  sizeBytes?: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface MiddlemanNote {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface MiddlemanDeal {
  id: string;
  dealNumber: string; // MID-1001
  title: string;
  description?: string;
  dealType: MiddlemanDealType;
  customDealTypeLabel?: string;

  // Seller Details
  sellerId: string;
  sellerName: string;
  sellerPhone: string;

  // Buyer Details
  buyerId: string;
  buyerName: string;
  buyerPhone: string;

  // Deal Value & Currency
  dealAmount: number;
  currency: DealCurrency;
  exchangeRateToEGP: number; // 1 for EGP, e.g. 39.25 for USD/USDT
  dealAmountEGP: number;

  // Company Commission
  companyCommissionType: CommissionType;
  companyCommissionValue: number; // e.g. 5% or 100 EGP
  companyCommissionAmountEGP: number; // calculated in EGP

  // Optional External Middleman
  hasExternalMiddleman: boolean;
  externalMiddlemanId?: string;
  externalMiddlemanName?: string;
  externalMiddlemanPhone?: string;
  externalMiddlemanCommissionType?: CommissionType;
  externalMiddlemanCommissionValue?: number;
  externalMiddlemanCommissionAmountEGP?: number;
  isExternalMiddlemanPaid?: boolean;
  externalMiddlemanPaidAt?: string;

  // Financial Breakdown
  totalRequiredFromBuyerEGP: number; // Deal Amount + Company Commission
  sellerPayoutAmountEGP: number;     // Deal Amount
  netCompanyProfitEGP: number;       // Company Commission - External Middleman Commission
  feeAmount?: number;                // Alias for companyCommissionAmountEGP
  totalCollected?: number;           // Alias for totalRequiredFromBuyerEGP
  netAmountToSeller?: number;        // Alias for sellerPayoutAmountEGP
  feePayer?: 'buyer' | 'seller' | 'split';
  warrantyDays?: number;

  // Status & Timeline
  status: MiddlemanDealStatus;
  statusHistory: MiddlemanStatusHistoryItem[];
  attachments: MiddlemanAttachment[];
  internalNotes: MiddlemanNote[];

  // Related Game / Category (Optional)
  gameName?: string;
  gameId?: string;

  // Metadata
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// =============================================================
// GAME ACCOUNTS WAREHOUSE (مخزن الحسابات كأصول)
// =============================================================

export type AccountRating = 'weak' | 'medium' | 'strong' | 'very_strong';

export type AccountAssetStatus = 'available' | 'reserved' | 'sold';

export interface AccountSaleRecord {
  soldAt: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  salePriceEGP: number;
  purchaseCostEGP: number;
  netProfitEGP: number;
  soldBy: string;
  invoiceNumber: string;
  paymentMethod?: string;
  notes?: string;
}

export interface GameAccountAsset {
  id: string;
  accountCode: string; // ACC-2001
  title: string;
  gameName: string;
  gameId?: string;

  // Account Identification & Credentials
  accountIdentifier?: string; // Player ID / In-Game ID
  email?: string;
  phone?: string;
  password?: string;
  securityDetails?: string; // 2FA, Backup codes, Linked methods
  accountLevel?: string | number;
  rating: AccountRating;

  // Media & Notes
  images: string[];
  videoUrl?: string;
  notes?: string;

  // Financial Valuation
  purchaseCostEGP: number;
  expectedSellingPriceEGP: number;
  expectedProfitEGP: number;
  actualSalePriceEGP?: number;
  netRealizedProfitEGP?: number;

  // Quantity Tracking (الكميات والمخزون)
  initialQuantity?: number;
  availableQuantity: number; // الكمية المتوفرة للبيع (الافتراضي 1)
  soldQuantity: number;      // عدد مرات البيع

  // Status & Linkage
  status: AccountAssetStatus;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  purchasedFromPhone: string;
  purchasedAt: string;
  purchasedBy: string;

  // Sale Record & History
  saleRecord?: AccountSaleRecord;
  salesHistory?: AccountSaleRecord[];
  lastSoldAt?: string;
  lastBuyerName?: string;
  lastBuyerPhone?: string;

  createdAt: string;
  updatedAt: string;
}

// =============================================================
// CLIENTS ROLE & SOURCE EXTENSIONS
// =============================================================

export type MiddlemanClientRole = 'seller' | 'buyer' | 'both';

export type MiddlemanClientSource =
  | 'our_groups'
  | 'telegram'
  | 'facebook'
  | 'whatsapp'
  | 'discord'
  | 'friend'
  | 'ad'
  | 'other_place'
  | 'custom';

// =============================================================
// MIDDLEMAN NOTIFICATIONS & ALERTS
// =============================================================

export type MiddlemanNotificationType =
  | 'stalled_deal'       // وساطة متأخرة لم تغلق
  | 'unsold_account'     // حساب تم شراؤه ولم يُبع منذ مدة
  | 'unpaid_middleman'   // وسيط خارجي لم يتم صرف عمولته
  | 'unsent_invoice'     // فاتورة لم تُرسل
  | 'dispute_alert';     // نزاع في وساطة

export interface MiddlemanNotificationItem {
  id: string;
  type: MiddlemanNotificationType;
  title: string;
  message: string;
  targetId: string;
  targetType: 'deal' | 'account' | 'client';
  isRead: boolean;
  createdAt: string;
  urgency: 'low' | 'medium' | 'high';
}

// =============================================================
// MODULE SETTINGS
// =============================================================

export interface MiddlemanModuleSettings {
  defaultCurrency: DealCurrency;
  defaultCompanyCommissionType: CommissionType;
  defaultCompanyCommissionPercent: number; // e.g. 5%
  defaultCompanyCommissionFixedEGP: number; // e.g. 100 EGP
  defaultExternalMiddlemanCommissionPercent: number; // e.g. 2%
  maxStalledDealDaysAlert: number; // e.g. 2 days
  maxUnsoldAccountDaysAlert: number; // e.g. 20 days

  // Supported Deal Types
  customDealTypes: string[];

  // Supported Sources
  clientSourcesList: string[];

  // Invoice & Branding
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  invoiceFooterNote: string;
  invoicePaperFormat: 'thermal_80mm' | 'a4' | 'thermal_58mm';
  showLogoOnInvoice: boolean;
  showPhoneOnInvoice: boolean;
  showEmployeeOnInvoice: boolean;
  showExternalMiddlemanOnInvoice: boolean;

  // WhatsApp & Telegram Message Templates
  whatsappDealTemplate: string;
  whatsappAccountSaleTemplate: string;
  telegramDealTemplate: string;
}

// =============================================================
// DASHBOARD KPI METRICS
// =============================================================

export interface MiddlemanDashboardMetrics {
  todayNewDeals: number;
  todayCompletedDeals: number;
  activeInProgressDeals: number;
  stalledDealsCount: number;
  totalDealsVolumeEGP: number;
  totalCompanyCommissionsEGP: number;
  totalExternalMiddlemanCommissionsEGP: number;
  netCompanyProfitsEGP: number;
  averageDealValueEGP: number;
  highestDealValueEGP: number;
  lowestDealValueEGP: number;
  successRatePercent: number;
  cancellationRatePercent: number;
  availableAccountsCount: number;
  soldAccountsCount: number;
  totalAccountInventoryValueEGP: number;
  totalAccountSalesProfitsEGP: number;
}

// =============================================================
// MIDDLEMAN FOLLOWUPS & REMINDERS
// =============================================================

export interface MiddlemanFollowup {
  id: string;
  middlemanId: string; // client ID
  middlemanName: string;
  middlemanPhone: string;
  dealId?: string;
  dealNumber?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  title: string;
  notes?: string;
  status: 'pending' | 'completed' | 'canceled';
  assignedTo?: string;
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
  lastReminderSentAt?: string;
}
