import { ConsumedWalletRecord } from './topup.types';

export type ProfileType = 'regular' | 'partner' | 'shop' | 'influencer';

export type LoyaltyTier = 'normal' | 'silver' | 'gold' | 'vip';

export type PurchasingPower = 'normal' | 'medium' | 'strong' | 'whale';

export type LifetimeSpendingTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type CustomerSource =
  | 'whatsapp'
  | 'tiktok'
  | 'instagram'
  | 'messenger'
  | 'telegram'
  | 'other'
  | 'facebook'
  | 'word_of_mouth'
  | 'unspecified';

export type CustomerStatus = 'active' | 'inactive' | 'suspended' | 'frozen';

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  extraPhone?: string;
  email?: string;
  address?: string;
  profileType: ProfileType;
  source: CustomerSource;
  status: CustomerStatus;
  isFrozen: boolean;
  freezeReason?: string;

  // Commercial / Extra Info for Shop/Partner/Influencer
  shopName?: string;
  shopAddress?: string;
  customCommissionRate?: number; // % Default / Legacy rate
  firstMonthCommissionRate?: number; // % عمولة أول 30 يوماً من إنشاء العميل (e.g. 3.0% or 5.0%)
  lifetimeCommissionRate?: number; // % عمولة مدى الحياة بعد مرور أول 30 يوماً (e.g. 1.0% or 1.5%)
  referralPercent?: number; // نسبة عمولة الإحالة المحددة للعميل (%)
  referralPercentage?: number; // نسبة عمولة الإحالة المحددة للعميل (%)
  contractDurationMonths?: number;
  monthlyTargetCount?: number; // شرط الاستمرار الشهري (الحد الأدنى للعملاء الجدد شهرياً)
  monthlyReferredCount: number; // عدد العملاء المسجلين في الشهر الحالي
  partnerWarningCount: number; // 0 (نشط), 1 (تحذير أول), 2 (فقد الشراكة)
  partnershipDemotedAt?: string; // تاريخ إلغاء الشراكة إن وجد
  partnershipDemoteReason?: string; // سبب إلغاء الشراكة

  // Referral & Linkage
  referralCode: string;
  referredByCode?: string;
  referrerId?: string;
  referrerName?: string;
  referredByName?: string;
  referrerType?: ProfileType;
  referralLinkedAt?: string;
  firstMonthExpiryDate?: string;
  referredAt?: string;
  referralWalletBalance: number;
  referralBalance?: number;
  totalReferralCommissionEarned: number;

  // Referral Profile & High Cashback Duration (Customizable Days)
  hasReferralProfile?: boolean;
  referralProfileCreatedAt?: string;
  highCashbackDays?: number; // مدة الكاش باك المرتفع بالأيام (افتراضي 30 يوم، قابل للتعديل يدويًا: 15, 45, 60, 90...)
  highCashbackStartDate?: string; // تاريخ بداية المدة
  highCashbackEndDate?: string; // تاريخ نهاية المدة
  highCashbackRate?: number; // نسبة الكاش باك المرتفع خلال المدة %
  normalCashbackRate?: number; // نسبة الكاش باك العادية بعد انتهاء المدة %
  referralProfileStatus?: 'active' | 'expired' | 'suspended'; // حالة البروفايل

  // Cashback & Rates
  cashbackRate?: number; // % نسبة الكاش باك الخاصة بالعميل (الافتراضي: 1%)
  cashbackBalance: number;
  totalCashbackEarned: number;

  // Financial & Metrics
  balance: number;
  accountBalance: number; // الرصيد الدائن أو المدين (+ دائن للعميل / - مدين على العميل)
  totalSpent: number; // إجمالي كل المدفوعات بالجنيه (قوة العميل الكلية)
  totalSpentUSD?: number; // إجمالي كل المدفوعات بالدولار المحسوب بالأسعار التاريخية
  totalOrders: number; // عدد التذاكر المكتملة
  maxSingleOrderAmount: number; // أكبر مبلغ تم دفعه في تذكرة مكتملة واحدة (قوة الشراء)
  loyaltyTier: LoyaltyTier; // عادي (1-9) | فضي (10-29) | ذهبي (30-99) | VIP (100+)
  purchasingPower: PurchasingPower; // عادي (0-499) | متوسط (500-1999) | قوي (2000-4500) | حوت (4501+)
  lifetimeSpendingTier?: LifetimeSpendingTier; // برونز (حتى 100$) | فضي (101-500$) | ذهبي (501-1500$) | بلاتينيوم (+1500$)
  favoriteGame?: string;
  birthDate?: string; // تاريخ الميلاد (YYYY-MM-DD)
  lastPurchaseDate?: string;
  hasUsedFirstOrderDiscount?: boolean; // هل استهلك خصم أول شحنة
  savedPlayerGameIds?: string[]; // معرفات الألعاب المرتبطة بهذا العميل حصرياً

  // Metadata
  notes?: string; // ملاحظات العميل
  isArchived: boolean;
  notesCount: number;
  ticketsCount: number;
  middlemanRole?: 'seller' | 'buyer' | 'both';
  middlemanCustomSource?: string;
  middlemanDealsCount?: number;
  middlemanTotalVolume?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  authorName: string;
  authorRole: string;
  content: string;
  type: 'general' | 'financial' | 'complaint' | 'followup';
  createdAt: string;
}

export type TicketLifecycleStatus =
  | 'new'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'problem'
  | 'fraud'
  | 'refunded'
  | 'canceled';

export type TicketShippingType = 'regular' | 'first_shipping';

export interface TicketItem {
  id: string;
  gameId: string;
  gameName: string;
  sectionId?: string;
  sectionName?: string;
  productId: string;
  productName: string;
  playerGameId: string; // ID في اللعبة
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costPrice: number;
  fixedCostEGP?: number; // مصاريف التشغيل الخاصة بالمنتج
  cashbackPercent?: number; // نسبة الكاش باك الخاصة بالمنتج
  cashbackAmountEGP?: number; // مبلغ الكاش باك الفعلي للبند
  referralPercent?: number; // نسبة الإحالة الخاصة بالمنتج
  referralAmountEGP?: number; // مبلغ الإحالة الفعلي للبند
  netProfitEGP?: number; // صافي الربح الفعلي لهذا البند
  walletTypeId?: string; // محفظة البضاعة المرتبطة للخصم التلقائي
  consumedSources?: ConsumedWalletRecord[]; // مصادر المحافظ الفعلية التي تم الخصم منها
  consumedWalletId?: string; // المحفظة التي تم الخصم منها
  consumedWalletName?: string;
  consumedPoints?: number; // عدد النقاط المستهلكة
  pointsCostPerUnit?: number; // تكلفة الوحدة بالنقاط
}

export interface TicketNoteItem {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface TicketHistoryLogItem {
  id: string;
  action: string;
  previousStatus?: TicketLifecycleStatus;
  newStatus: TicketLifecycleStatus;
  performedBy: string;
  timestamp: string;
  notes?: string;
}

export interface TicketAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'file';
  url: string;
  size?: number;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface CustomerTicket {
  id: string;
  ticketNumber: string; // JKR-YYYY-XXXX
  department?: 'customers' | 'dealers';
  customerId: string;
  customerName: string;
  customerPhone: string;
  ticketType: TicketShippingType; // أول شحنة أو شحنة عادية
  
  // Multi Products Items
  items: TicketItem[];
  consumedSources?: ConsumedWalletRecord[]; // إجمالي مصادر المحافظ المستهلكة في التذكرة

  // Game & Top-Up Details (Legacy summary compatibility)
  gameName: string;
  gameSection: string;
  gameProductName: string;
  playerGameId: string; // ID في اللعبة
  
  // Financial Amounts
  requiredAmount: number; // المبلغ المطلوب بعد كل الخصومات
  totalProductsAmount: number; // إجمالي أسعار المنتجات قبل الخصومات
  totalCostAmount: number; // إجمالي التكلفة
  totalProfitMargin: number; // هامش الربح الإجمالي
  receivedAmount: number; // المبلغ المستلم فعلياً
  overpaymentAmount: number; // الزيادة في الدفع (تضاف لرصيد العميل الدائن)
  shortageAmount?: number; // النقص في الدفع (يسجل كرصيد مدين على العميل)
  isOverpaymentApproved?: boolean; // موافقة المدير على الفائض
  paymentWallet: string; // محفظة الاستلام (Vodafone Cash, etc.)
  paymentWalletId?: string; // معرف المحفظة
  paymentWalletNumberId?: string; // معرف رقم الاستقبال المحدد
  paymentReceivedPhone?: string; // رقم الاستقبال المعتمد المحول عليه
  paymentGateway?: string; // وسيلة الدفع (Vodafone Cash / InstaPay / Bank / USDT / Cash)
  senderPhoneNumber?: string; // رقم الهاتف المحول منه (الرقم الذي تم التحويل منه فعلياً)
  transferReferenceNumber?: string; // رقم التحويل أو المرجع المالي
  referenceNumber?: string; // الرقم المرجعي المخصص للتذكرة (Unique if provided)
  
  // Cashback & Discounts
  costPrice?: number; // التكلفة المباشرة للطلب
  netProfit?: number; // صافي الربح المحقق بعد كل المصروفات
  netProfitEGP?: number; // صافي الربح المحقق (اسم بديل متوافق)
  totalAmount?: number; // إجمالي المبلغ (اسم بديل متوافق لـ requiredAmount / totalProductsAmount)
  paidAmount?: number;
  isPaid?: boolean;
  fixedCostAmount?: number; // إجمالي مصاريف التشغيل الخاصة بمنتجات الطلب
  fixedCostEGP?: number;
  referralAmountEGP?: number;
  actualCostEGP?: number; // التكلفة الفعلية المستخرجة من الـ FIFO
  actualWalletId?: string; // المحفظة الفعلية المستخدمة
  actualWalletName?: string; // اسم المحفظة الفعلية المستخدمة
  walletSnapshot?: import('./jkrWallet.types').TicketWalletSnapshot; // لقطة المحفظة الثابتة تاريخياً
  stockDeducted?: boolean; // هل تم خصم النقاط والمخزون من المحفظة المرتبطة
  profitSynced?: boolean; // هل تم ترحيل الأرباح/الخسائر لمحفظة الأرباح w_profits
  cashbackSynced?: boolean; // هل تم ترحيل الكاش باك لمحفظة الكاش باك w_cashback
  creditDeducted?: boolean; // هل تم خصم رصيد الأمانات المستخدم من الحساب ومحفظة w_trust
  balanceSettled?: boolean; // هل تم تسوية العجز أو الفائض في رصيد العميل
  overpaymentSettled?: boolean; // هل تم إضافة الفائض للمحفظة
  shortageSettled?: boolean; // هل تم تسجيل العجز بالمحفظة
  // Customer Balance Snapshots at transaction time (رصيد العميل بعد هذه المعاملة مباشرة)
  primaryBalanceSnapshot?: number; // رصيد المحفظة الأساسية بعد المعاملة
  cashbackBalanceSnapshot?: number; // رصيد الكاش باك بعد المعاملة
  referralBalanceSnapshot?: number; // رصيد محفظة الإحالة بعد المعاملة
  cashbackUsed: number; // كاش باك مستخدم في السداد
  referralBalanceUsed?: number; // رصيد إحالة مستخدم في السداد
  referralCommissionEarned?: number; // عمولة شريك النجاح المستحقة
  referralAllowance?: number; // بدل إحالة محول للأرباح لعدم ارتباط العميل بشريك إحالة
  referralAllowanceReason?: string; // وصف بدل الإحالة
  referralPercent?: number; // نسبة عمولة الإحالة المحفوظة وقت إنشاء التذكرة (%)
  referralPercentage?: number; // نسبة عمولة الإحالة المحفوظة وقت إنشاء التذكرة (%)
  referralCommissionProcessed?: boolean; // هل تم معالجة وترحيل عمولة الإحالة
  accountBalanceUsed?: number; // رصيد دائن مستخدم في السداد
  couponCode?: string; // كود الكوبون المطبق
  couponDiscountAmount?: number; // قيمة خصم الكوبون
  cashbackEarned: number; // كاش باك مكتسب (1% تلقائي)
  cashbackPercent?: number; // نسبة الكاش باك المطبقة على التذكرة (%)
  cashbackPercentage?: number; // نسبة الكاش باك المطبقة على التذكرة (%)
  isFirstOrderDiscountApplied: boolean;
  
  // Reservation & Booking Fields (نظام حجز المنتجات)
  operationMode?: 'direct' | 'reservation'; // بيع مباشر أو حجز منتج
  isReservation?: boolean;
  scheduledDeliveryDate?: string; // تاريخ الاستلام المتوقع
  scheduledDeliveryTime?: string; // وقت الاستلام (اختياري)
  reservationNotes?: string; // ملاحظات الحجز
  reservationStatus?: 'pending' | 'delivered' | 'rescheduled' | 'cancelled';
  reservationDeliveredAt?: string;
  reservationDeliveredBy?: string;
  reservationTrustHeld?: number; // قيمة المبلغ المحتجز كأمانة بمحفظة w_trust
  reservationTrustDeducted?: boolean; // هل تم إخلاء وخصم الأمانة من محفظة w_trust عند تسليم المنتج

  // Lifecycle & Status
  status: TicketLifecycleStatus;
  title: string;
  platformSource?: CustomerSource; // منصة العميل (واتساب، تيك توك، انستجرام، ماسنجر، تليجرام، أخرى)
  description?: string;
  notes?: string; // ملاحظات التذكرة
  notesList?: TicketNoteItem[]; // سجل الملاحظات التاريخية
  assignedTo?: string;
  resolutionNote?: string;
  problemDetails?: {
    reason: 'wrong_product' | 'wrong_account_or_amount' | 'other';
    reasonLabel?: string;
    description: string;
    reportedBy: string;
    reportedAt: string;
  };
  resolutionDetails?: {
    decision: 'coupon' | 'gift' | 'refund' | 'correction' | 'closed';
    costBearer: string;
    customCostBearer?: string;
    notes: string;
    resolvedBy: string;
    resolvedAt: string;
    couponCode?: string;
    giftDetails?: string;
    refundAmount?: number;
    refundWalletId?: string;
    financialImpactSummary?: string;
  };
  refundDetails?: {
    amount: number;
    refundWalletId: string;
    refundWalletName: string;
    reason: string;
    refundedBy: string;
    refundedAt: string;
    isPartial?: boolean;
    remainingAmount?: number;
    originalTotalAmount?: number;
    history?: Array<{
      id: string;
      amount: number;
      refundWalletId: string;
      refundWalletName: string;
      reason: string;
      refundedBy: string;
      refundedAt: string;
    }>;
  };
  fraudDetails?: {
    reason: string;
    costBearer: string;
    customCostBearer?: string;
    markedBy: string;
    markedAt: string;
    inventoryCostDeducted?: number;
    operatingExcluded?: boolean;
    refundedAt?: string;
    refundWalletId?: string;
  };
  excludeFromOperatingRevenue?: boolean;
  historyLog?: TicketHistoryLogItem[];
  calculatorModeUsed: boolean;
  exchangeRateSnapshot?: number; // سعر USDT المحفوظ وقت تنفيذ العملية
  executionDurationMinutes?: number; // الوقت المستغرق للتنفيذ بالدقائق
  customerRating?: number; // تقييم العميل 1 - 5 نجوم
  ratingFeedback?: string; // ملاحظة العميل
  pricingSnapshot?: any; // اللقطة المالية والتسعيرية الكاملة غير القابلة للتعديل V3.0
  attachments?: TicketAttachment[]; // مرفقات التذكرة (صور، إيصالات، فيديو، ملفات)
  updatedBy?: string; // آخر موظف قام بالتعديل
  
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  shiftSettlementId?: string; // معرف تصفية الوردية التي تم تسوية التذكرة ضمنها
  settledAt?: string; // وقت وتاريخ اعتماد تصفية الوردية
}

export interface CustomerReferral {
  id: string;
  referrerCustomerId: string;
  referrerCode: string;
  referredCustomerId: string;
  referredCustomerName: string;
  referredCustomerPhone: string;
  referredAt: string;
  linkedAt?: string;
  firstMonthExpiryDate?: string;
  status?: 'active' | 'expired' | 'canceled';
  highCashbackDays?: number; // مدة الكاش باك المرتفع المحددة بالأيام (15، 30، 45، 60، 90...)
  startDate?: string; // تاريخ بداية المدة
  endDate?: string; // تاريخ نهاية المدة
  daysRemaining: number; // عداد تنازلي بالأيام (30 يوم)
  isExpired: boolean;
  totalCommissionFromReferral: number;
  totalSpentByReferred?: number;
  ticketsCountByReferred?: number;
  hasMadeFirstOrder: boolean;
  isFrozen: boolean;
  freezeReason?: string;
  createdAt: string;
}

export interface UnifiedWalletTransaction {
  id: string;
  customerId: string;
  walletType: 'cashback' | 'referral' | 'account_balance';
  type: 'earned' | 'redeemed' | 'commission' | 'adjustment' | 'bonus' | 'credit' | 'debit' | 'settlement';
  operationName: string; // تذكرة #123 أو استخدام أو عمولة إحالة
  amount: number; // + or -
  balanceAfter: number;
  orderNumber?: string;
  notes?: string;
  createdAt: string;

  // Expiration & Breakage Management (Modification #6)
  expiresAt?: string; // Calculated default expiry (createdAt + 6 months for cashback, + 12 months for referral)
  extendedExpiryDate?: string; // If extended by owner
  isExpiredStatus?: 'valid' | 'expired' | 'extended' | 'transferred';
  expiryActionDate?: string;
  expiryActionBy?: string;
  breakageNotes?: string;
}

export interface WalletBalanceLot {
  id: string;
  txId: string;
  partyId: string;
  partyType: 'customer' | 'dealer';
  walletType: 'cashback' | 'referral';
  originalAmount: number;
  remainingAmount: number;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  daysOverdue: number;
  daysRemaining: number;
  extendedUntil?: string;
}

export interface PartyExpiredBalanceSummary {
  partyId: string;
  partyName: string;
  partyPhone: string;
  partyType: 'customer' | 'dealer';
  cashbackTotal: number;
  cashbackValid: number;
  cashbackExpired: number;
  referralTotal: number;
  referralValid: number;
  referralExpired: number;
  hasExpired: boolean;
  oldestExpiredDate?: string;
  expiredLots: WalletBalanceLot[];
}

export interface BreakageRecord {
  id: string;
  partyId: string;
  partyName: string;
  partyType: 'customer' | 'dealer';
  walletType: 'cashback' | 'referral';
  amount: number;
  fromWallet: string; // 'w_trust' (محفظة الأمانات)
  toWallet: string;   // 'w_inv_1' or main goods/inventory safe
  toWalletName: string;
  performedBy: string; // Owner name
  notes?: string;
  createdAt: string;
}

export interface ExtensionRecord {
  id: string;
  partyId: string;
  partyName: string;
  partyType: 'customer' | 'dealer';
  walletType: 'cashback' | 'referral';
  amount: number;
  extendedMonths: number;
  newExpiryDate: string;
  performedBy: string;
  notes?: string;
  createdAt: string;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'purchase'
  | 'refund'
  | 'cashback_in'
  | 'commission_in'
  | 'adjustment'
  | 'credit_overpayment'
  | 'debit_shortage';

export interface CustomerTransaction {
  id: string;
  customerId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  performedBy: string;
  createdAt: string;
}
