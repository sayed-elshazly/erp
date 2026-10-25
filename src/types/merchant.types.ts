export type MerchantType =
  | 'supplier' // مورد
  | 'shop' // محل
  | 'agent' // وكيل
  | 'partner' // شريك تجاري
  | 'wholesaler' // تاجر جملة
  | 'retailer' // تاجر تجزئة
  | 'distributor'; // موزع

export type MerchantStatus = 'active' | 'inactive' | 'suspended' | 'blocked';

export type ReminderType =
  | 'payment_due' // موعد سداد
  | 'collection_due' // موعد تحصيل
  | 'follow_up' // موعد متابعة
  | 'call' // موعد اتصال
  | 'meeting' // موعد اجتماع
  | 'visit' // موعد زيارة
  | 'contract_renewal' // تجديد اتفاق
  | 'contract_expiry' // انتهاء عقد
  | 'custom'; // تذكير مخصص

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ReminderStatus = 'upcoming' | 'today' | 'completed' | 'overdue' | 'canceled';

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface MerchantReminder {
  id: string;
  merchantId: string;
  merchantName: string;
  title: string;
  description: string;
  type: ReminderType;
  priority: ReminderPriority;
  dueDate: string; // ISO date string (YYYY-MM-DD)
  dueTime: string; // HH:mm
  assignedTo: string;
  status: ReminderStatus;
  notes?: string;
  recurrence: ReminderRecurrence;
  createdAt: string;
  completedAt?: string;
}

// Operational Performance Rating
export interface MerchantPerformance {
  overallScore: number; // 0 to 100
  starRating: number; // 1 to 5
  deliveryTimelinessScore: number; // 0-100
  executionSpeedScore: number; // 0-100
  orderSuccessRate: number; // 0-100%
  canceledOrdersCount: number;
  complaintsCount: number;
  delayCount: number;
  totalTransactionsVolume: number;
  priceStabilityScore: number; // 0-100
  repaymentSpeedScore: number; // 0-100
  agreementCommitmentScore: number; // 0-100
  trend: 'up' | 'down' | 'stable';
  badge?: 'Excellent Trader' | 'Trusted Partner' | 'Standard' | 'Needs Attention';
  bestMonth: string;
  worstMonth: string;
  primaryImpactingFactor: string;
  historicalScores: {
    period: string;
    score: number;
  }[];
  lastCalculatedAt: string;
}

// ==========================================
// TRUST SCORE ENGINE TYPES (15 Factors)
// ==========================================
export type TrustTier =
  | 'elite' // 95 - 100: Elite Partner 🌟
  | 'gold' // 88 - 94: Gold Supplier / Preferred Trader 🥇
  | 'trusted' // 75 - 87: Trusted Partner 🟢
  | 'average' // 60 - 74: Average 🟡
  | 'risky' // 40 - 59: Risky 🟠
  | 'blocked'; // < 40: Blocked / Critical 🚨

export interface TrustFactorItem {
  id: string;
  name: string;
  score: number; // 0 to 100
  weightPercentage: number; // Weight in final formula
  weightedScore: number;
  status: 'positive' | 'warning' | 'danger';
  impactDescription: string;
}

export interface TrustScoreData {
  score: number; // 0 to 100 points
  tier: TrustTier;
  tierLabel: string;
  badge: 'Elite Partner' | 'Gold Supplier' | 'Preferred Trader' | 'Trusted Partner' | 'Standard' | 'Risky' | 'Blocked';
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  lastChangeReason: string;
  positiveDrivers: string[];
  negativeDrivers: string[];
  factors: {
    paymentTimeliness: number; // 12%
    deliveryTimeliness: number; // 10%
    priceConsistency: number; // 8%
    orderSuccessRate: number; // 10%
    cancellationsPenalty: number; // 6%
    disputesPenalty: number; // 8%
    complaintsPenalty: number; // 6%
    responseSpeed: number; // 5%
    relationshipAgeMonths: number; // 5%
    transactionVolumeScore: number; // 8%
    serviceQualityStability: number; // 6%
    priceStabilityScore: number; // 4%
    delayCountScore: number; // 4%
    disputeResolutionRate: number; // 4%
    agreementFulfillmentRate: number; // 4%
  };
  historicalTimeline: {
    period: string; // e.g. 'الشهر الماضي', 'قبل 3 أشهر', 'قبل 6 أشهر', 'قبل سنة'
    score: number;
    tier: TrustTier;
  }[];
  isAlertActive: boolean; // True if score < 60
  lastCalculatedAt: string;
}

export type InvoiceType = 'purchase' | 'sale' | 'return';
export type InvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'overdue' | 'canceled';
export type PaymentMethod = 'vault_cash' | 'bank_transfer' | 'credit' | 'electronic_wallet';

export interface InvoiceItem {
  id: string;
  productId?: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountPercentage?: number;
  notes?: string;
}

export interface MerchantInvoice {
  id: string;
  invoiceNumber: string;
  merchantId: string;
  merchantName: string;
  type: InvoiceType;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  qrCodeData?: string;
  notes?: string;
  createdBy: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StatementTransactionType =
  | 'deposit' // إيداع
  | 'withdrawal' // سحب
  | 'purchase' // شراء
  | 'sale' // بيع
  | 'discount' // خصم
  | 'commission' // عمولة
  | 'refund' // استرداد
  | 'transfer' // تحويل
  | 'settlement' // سداد
  | 'advance_payment'; // دفعة مقدمة

export interface MerchantTransaction {
  id: string;
  merchantId: string;
  type: StatementTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  direction: 'in' | 'out';
  description: string;
  referenceInvoiceId?: string;
  paymentMethod: string;
  performedBy: string;
  createdAt: string;
  notes?: string;
}

export interface MerchantProductRule {
  id: string;
  merchantId: string;
  productId: string;
  productName: string;
  category: string;
  standardPrice: number;
  specialPrice: number;
  specialDiscountPercent: number;
  customCommission: number;
  minOrderQuantity: number;
  maxOrderQuantity: number;
  isFavorite: boolean;
  notes?: string;
}

export interface MerchantNote {
  id: string;
  merchantId: string;
  content: string;
  color: 'zinc' | 'orange' | 'amber' | 'emerald' | 'blue' | 'rose' | 'purple';
  isPinned: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MerchantFile {
  id: string;
  merchantId: string;
  fileName: string;
  fileType: 'image' | 'pdf' | 'excel' | 'word' | 'contract' | 'invoice_doc' | 'other';
  fileSize: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Merchant {
  id: string;
  code: string;
  name: string;
  companyName: string;
  type: MerchantType;
  categoryTag: string;
  status: MerchantStatus;
  avatarUrl?: string;

  // Contact Info
  phone: string;
  whatsapp?: string;
  telegram?: string;
  email?: string;
  website?: string;
  address?: string;
  city: string;
  country: string;
  preferredContactMethod: 'phone' | 'whatsapp' | 'telegram' | 'email';

  // Legal & Registration
  commercialRegister?: string;
  taxNumber?: string;

  // Financial Balances & Limits
  balance: number;
  creditLimit: number;
  totalPurchases: number;
  totalSales: number;
  totalProfits: number;
  totalInvoicesCount: number;
  totalOrdersCount: number;

  // Performance Rating
  performance: MerchantPerformance;

  // Trust Score (Calculated Automatically from 15 Weighted Factors)
  trustScore: TrustScoreData;

  // Meta & Status
  isArchived: boolean;
  notesCount: number;
  filesCount: number;
  activeRemindersCount: number;
  lastActivityDate: string;
  createdAt: string;
  updatedAt: string;
}
