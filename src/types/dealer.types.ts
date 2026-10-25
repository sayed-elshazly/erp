// =============================================================
// NZM JKR TOP UP ERP — Dealers & Wholesale Types
// =============================================================

import {
  LoyaltyTier,
  PurchasingPower,
  LifetimeSpendingTier,
  CustomerSource,
  CustomerStatus,
  TicketLifecycleStatus,
  TicketShippingType,
  TicketItem,
  TicketNoteItem,
  TicketHistoryLogItem,
  UnifiedWalletTransaction
} from './customer.types';

export type DealerProfileType =
  | 'distributor' // موزع معتمد
  | 'shop'        // متجر / كشك شحن
  | 'agent'       // وكيل شحن ألعاب
  | 'vip_dealer'  // تاجر VIP
  | 'regular';    // تاجر عادي

export interface Dealer {
  id: string;
  code: string; // DLR-XXXX
  name: string;
  phone: string;
  profileType: DealerProfileType;
  source: CustomerSource;
  status: CustomerStatus;
  isFrozen: boolean;
  freezeReason?: string;

  // Commercial Info for Dealer / Distributor
  businessName?: string; // اسم النشاط / المحل التجاري
  commercialRegistrationNumber?: string; // السجل التجاري / البطاقة الضريبية
  address?: string; // عنوان المحل / المستودع
  city?: string;
  creditLimitEGP?: number; // الحد الائتماني المسموح به للدين
  customCommissionRate?: number; // % عمولة إحالة مخصصة
  firstMonthCommissionRate?: number; // % عمولة أول شهر
  lifetimeCommissionRate?: number; // % عمولة مدى الحياة
  referralPercent?: number; // نسبة عمولة الإحالة المحددة للتاجر (%)
  referralPercentage?: number; // نسبة عمولة الإحالة المحددة للتاجر (%)
  contractDurationMonths?: number;
  monthlyTargetCount?: number; // شرط الاستمرار الشهري (تارجت الشحن)
  monthlyReferredCount: number; // عدد الإحالات في الشهر الحالي
  partnerWarningCount: number; // 0, 1, 2
  partnershipDemotedAt?: string;
  partnershipDemoteReason?: string;

  // Referral & Linkage
  referralCode: string;
  referredByCode?: string;
  referrerId?: string;
  referrerName?: string;
  referredByName?: string;
  referrerType?: DealerProfileType;
  referralLinkedAt?: string;
  firstMonthExpiryDate?: string;
  referredAt?: string;
  referralWalletBalance: number;
  referralBalance?: number;
  totalReferralCommissionEarned: number;

  // Cashback & Wholesale Rebate
  cashbackRate?: number; // % نسبة الكاش باك أو حافز الكميات
  cashbackBalance: number;
  totalCashbackEarned: number;

  // Financial & Metrics
  balance: number;
  accountBalance: number; // الرصيد الدائن أو المدين (+ دائن للتاجر / - مدين على التاجر)
  totalSpent: number; // إجمالي كل المدفوعات بالجنيه
  totalSpentUSD?: number; // إجمالي المدفوعات بالدولار
  totalOrders: number; // عدد التذاكر / الطلبيات المكتملة
  maxSingleOrderAmount: number; // أكبر طلبية بالجملة
  loyaltyTier: LoyaltyTier; // عادي | فضي | ذهبي | VIP
  purchasingPower: PurchasingPower; // عادي | متوسط | قوي | حوت
  lifetimeSpendingTier?: LifetimeSpendingTier;
  favoriteGame?: string;
  birthDate?: string;
  lastPurchaseDate?: string;
  hasUsedFirstOrderDiscount?: boolean;
  wholesaleDiscountRate?: number;
  wholesaleDiscountPercent?: number;
  pricingTier?: string;
  partnerCommissionPercent?: number;
  creditLimit?: number;
  currentDebt?: number;

  // Metadata
  isArchived: boolean;
  notes?: string; // ملحوظة التاجر
  notesCount: number;
  ticketsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DealerNote {
  id: string;
  dealerId: string;
  authorName: string;
  authorRole: string;
  content: string;
  type: 'general' | 'financial' | 'complaint' | 'followup';
  createdAt: string;
}

export interface DealerReferral {
  id: string;
  referrerDealerId: string;
  referrerDealerName: string;
  referrerDealerCode: string;
  referredDealerId: string;
  referredDealerName: string;
  referredDealerPhone: string;
  referredDealerCode: string;
  referredAt: string;
  firstMonthExpiryDate?: string;
  isFirstMonthActive: boolean;
  firstMonthCommissionRate: number;
  lifetimeCommissionRate: number;
  totalFirstMonthCommissionsEarned: number;
  totalLifetimeCommissionsEarned: number;
  totalOrdersByReferred: number;
  totalSpentByReferred: number;
  lastOrderAt?: string;
  status: 'active' | 'graduated' | 'inactive';
}

export interface DealerPricingAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  settingKey: string;
  settingLabelArabic: string;
  oldValue: any;
  newValue: any;
  reason: string;
  deviceInfo?: string;
}

export interface DealerModuleSettings {
  defaultCurrencyDisplay: 'EGP' | 'USD';
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  commercialRegistrationNumber?: string;
  invoicePaperFormat: 'thermal_80mm' | 'a4' | 'thermal_58mm';
  showLogoOnInvoice: boolean;
  showPhoneOnInvoice: boolean;
  showCashbackOnInvoice: boolean;
  showEmployeeOnInvoice: boolean;
  showCommercialIdOnInvoice?: boolean;
  showDealerTierOnInvoice?: boolean;
  invoiceFooterNote: string;
  costingMethod: 'FIFO' | 'WAC';
  priceRounding: boolean;

  // Wholesale Pricing Engine Fields
  rateUSD_EGP?: number;
  fixedCostMode?: 'auto' | 'manual';
  manualFixedCostEGP?: number;
  monthlyBreakEvenTargetOrders?: number;
  defaultWholesaleProfitMarginPercent: number; // هامش ربح الجملة للتجار P%
  defaultCashbackPercent: number; // كاش باك تاجر الجملة / حوافز الكميات
  defaultPartnerCommissionPercent: number; // عمولة إحالات وتوزيع الشركاء
  reservePercent?: number; // صندوق احتياطي ومخاطر الجملة
  developmentPercent?: number; // صندوق تطوير منصة الموزعين
  offersPercent?: number; // صندوق حوافز وتخفيضات تجار VIP
  minCashbackAmountEGP: number;
}

export type {
  LoyaltyTier,
  PurchasingPower,
  LifetimeSpendingTier,
  CustomerSource,
  CustomerStatus,
  TicketLifecycleStatus,
  TicketShippingType,
  TicketItem,
  TicketNoteItem,
  TicketHistoryLogItem,
  UnifiedWalletTransaction
};

