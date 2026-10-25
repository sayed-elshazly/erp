export interface WalletPriorityItem {
  walletId: string;
  walletName?: string;
  priority: number; // 1 = Primary, 2 = Alternative 1, 3 = Alternative 2...
  customUnitCost?: number;
  notes?: string;
}

export interface ProductWalletSource {
  walletId: string;
  walletName?: string;
  priority: number; // 1 = Primary, 2 = Alternative 1, 3 = Alternative 2...
  customUnitCost?: number; // تكلفة الوحدة المخصصة
  notes?: string;
}

export interface ConsumedWalletRecord {
  walletId: string;
  walletName: string;
  unitsConsumed: number;
  unitCostEGP: number;
  unitCostUSD?: number;
  totalCostEGP: number;
  fifoLotNumber?: string;
}

export interface GameProduct {
  id: string;
  gameId: string;
  gameName: string;
  sectionId: string;
  sectionName: string;
  sectionPath?: string; // e.g. "Diamonds > Offers"
  groupId?: string; // معرف المجموعة
  groupName?: string; // اسم المجموعة
  name: string; // e.g. "شحن 1080 جوهرة فري فاير"
  sku: string;
  costUSD: number; // تكلفة المنتج بالدولار
  pointsCostPerUnit?: number; // تكلفة الوحدة بالنقاط
  fixedCostPerOrder: number; // التكلفة الثابتة للتشغيل F
  reservePercent?: number; // نسبة الاحتياطي المخصصة للباقة % (تتجاوز النظام إن وُجدت)
  developmentPercent?: number; // نسبة صندوق التطوير المخصصة للباقة % (تتجاوز النظام إن وُجدت)
  profitMarginPercent: number; // هامش الربح % (P%)
  partnerCommissionPercent: number; // أقصى عمولة إحالة Referral R%
  cashbackPercent: number; // حصة الكاش باك Cashback CB%
  companyNetMarginPercent?: number; // صافي ربح الشركة
  minProfitMarginEGP?: number; // الحد الأدنى للربح بالجنيه
  calculatedPriceEGP: number; // السعر المحسوب بالجنيه S (سعر العميل)
  dealerPriceEGP?: number; // سعر الجملة للتاجر بالجنيه (Dealer Wholesale Price)
  dealerProfitMarginPercent?: number; // هامش ربح الجملة للتجار %
  dealerCustomSellingPriceEGP?: number; // سعر الجملة اليدوي المخصص للتجار
  firstOrderCostPriceEGP: number; // سعر أول شحنة
  costPriceEGP?: number; // التكلفة بالجنيه
  walletTypeId: string; // المحفظة الأساسية
  primaryWalletId?: string; // المحفظة الأساسية (Priority 1)
  alternativeWalletIds?: string[]; // المحافظ البديلة المرتبة (Priority 2, 3...)
  walletSources?: ProductWalletSource[]; // مصادر المحافظ مع الأولويات المحدثة
  alternativeWallets?: WalletPriorityItem[]; // المحافظ البديلة مع الأولويات (توافقية)
  useCustomPricing?: boolean; // استخدام سعر يدوي مخصص
  customSellingPriceEGP?: number; // سعر البيع اليدوي بالجنيه
  autoPricingEnabled?: boolean; // إعادة التسعير التلقائي عند تغير سعر الصرف (الافتراضي: true)
  availableQuantity?: number | null; // الكمية المتاحة (فارغ = مفتوح بلا حد)
  description?: string; // شرح وتعليمات وتفاصيل الخدمة (ℹ️)
  image?: string; // صورة اختيارية للمنتج
  disabledReason?: string; // سبب التعطيل في حال إيقافه (⚠️)
  orderIndex?: number; // الترتيب اليدوي
  isCashbackEnabled?: boolean; // تفعيل الكاش باك لهذا المنتج (الافتراضي: true)
  isReferralEnabled?: boolean; // تفعيل الإحالة لهذا المنتج (الافتراضي: true)
  isActive: boolean; // حالة المنتج ON/OFF
  createdAt: string;
  updatedAt?: string;
  lastPricingRecalculationAt?: string;
}

export interface GameGroup {
  id: string;
  gameId?: string;
  sectionId: string;
  name: string; // e.g. "باقات أسبوعية", "شحن مباشر"
  description?: string; // وصف اختياري
  image?: string; // صورة اختيارية
  order?: number;
  orderIndex?: number;
  isActive: boolean;
  disabledReason?: string; // سبب التعطيل (⚠️)
  productsCount?: number;
  createdAt?: string;
}

export interface GameSection {
  id: string;
  gameId: string;
  parentId?: string; // معرف القسم الأب في حال كان تصنيفاً فرعياً
  name: string; // e.g. "Diamonds", "العروض اليومية"
  description?: string; // وصف اختياري
  image?: string; // صورة اختيارية
  order?: number;
  level?: number; // 0 for root category, 1 for sub-category
  isActive?: boolean;
  disabledReason?: string; // سبب التعطيل (⚠️)
  groups?: GameGroup[]; // المجموعات التابعة لهذا القسم
  productsCount: number;
}

export interface GameTreeItem {
  id: string;
  name: string;
  code: string;
  icon: string;
  image?: string; // صورة أو لوجو اللعبة المرفوعة
  description?: string; // وصف اختياري للعبة
  publisher: string;
  cashbackEnabled?: boolean; // احتساب الكاش باك ON/OFF (الافتراضي: true)
  referralEnabled?: boolean; // احتساب عمولة الإحالة ON/OFF (الافتراضي: true)
  disabledReason?: string; // سبب التعطيل (⚠️)
  orderIndex?: number;
  sections: GameSection[];
  groups?: GameGroup[];
  products: GameProduct[];
  isActive: boolean; // حالة اللعبة ON/OFF
  copySettings?: GameCopySettings; // إعدادات رسالة النسخ المخصصة لهذه اللعبة
}

export type StoreWalletType =
  | 'operating' // محافظ التشغيل (فودافون/إنستاباي)
  | 'inventory' // محافظ البضاعة (Google Play / iTunes / Huawei / كروت)
  | 'supplier' // محافظ الموردين
  | 'usdt' // الخزينة الدولارية / المحفظة الرئيسية
  | 'trust' // محفظة الأمانات (كاش باك + عمولات معلقة)
  | 'profits'; // محفظة الأرباح الصافية

export interface FIFOLotItem {
  id: string;
  lotNumber: string;
  walletId: string;
  unitsDeposited: number; // إجمالي النقاط أو الوحدات المودعة
  remainingUnits: number; // النقاط أو الوحدات المتبقية
  costPerUnitUSD: number; // تكلفة النقطة بالدولار
  costPerUnitEGP: number; // تكلفة النقطة بالجنيه
  exchangeRateUsed: number; // سعر صرف الدولار المستخدم وقت الشراء
  totalPaidUSD: number; // المبلغ المدفوع بالدولار
  date: string;
  notes?: string;
  createdAt: string;
}

export interface WalletNumberItem {
  id: string;
  walletId: string;
  phoneNumber: string;
  accountHolderName: string;
  
  // حدود الاستقبال (Receive Limits)
  dailyLimit?: number; // حد الاستقبال اليومي
  dailyReceived?: number; // المستلم اليوم
  monthlyLimit: number; // حد الاستقبال الشهري
  monthlyReceived: number; // المستلم هذا الشهر
  
  // حدود الإرسال (Send Limits)
  dailySendLimit?: number; // حد الإرسال اليومي
  dailySent?: number; // المُرسل اليوم
  monthlySendLimit?: number; // حد الإرسال الشهري
  monthlySent?: number; // المُرسل هذا الشهر

  // إحصائيات الخط التراكمية
  totalReceived?: number; // إجمالي الاستقبال
  totalSent?: number; // إجمالي الإرسال
  operationsCount?: number; // إجمالي عدد العمليات المنفذة على الخط
  monthlyWithdrawn: number; // المسحوب
  currentBalance: number; // الرصيد الحالي للخط
  previouslyUsedReceived?: number; // المستخدم مسبقاً من الاستقبال قبل الإضافة للنظام
  previouslyUsedSent?: number; // المستخدم مسبقاً من الإرسال قبل الإضافة للنظام
  status: 'active' | 'limit_reached' | 'paused' | 'disabled' | 'frozen';
  isPrimary?: boolean;
  notes?: string;
  lastUsedAt?: string; // تاريخ ووقت آخر عملية تمت على الخط
  createdAt: string;
}

export interface StoreWallet {
  id: string;
  name: string;
  type: StoreWalletType;
  currency: 'EGP' | 'USD';
  balance: number; // الرصيد المالي
  pointsBalance?: number; // الرصيد بالنقاط للمحافظ الفرعية
  accountNumber?: string;
  category?: string;
  dailyLimit?: number;
  dailyIncome?: number;
  monthlyLimit?: number;
  monthlyIncome?: number;
  monthlyWithdrawn?: number;
  totalReceived?: number;
  totalWithdrawn?: number;
  dailySent?: number;
  monthlySent?: number;
  numbers?: WalletNumberItem[]; // قائمة أرقام وخطوط الاستقبال التابعة للمحفظة
  controlledBy: 'owner' | 'employee_manager';
  allowWithdrawal: boolean; // محافظ البضاعة لا يُسحب منها
  isSystemWallet?: boolean; // محفظة نظام آلية (كاش باك، أرباح، إحالات، أمانات، مصاريف تشغيل)
  systemType?: 'profits' | 'cashback' | 'referrals' | 'trust' | 'operating_expenses'; // تصنيف المحفظة النظامية
  status?: 'active' | 'frozen' | 'disabled'; // حالة المحفظة
  warningThreshold?: number; // حد التنبيه الأصفر
  negativeSafetyLimit?: number; // حد الأمان السالب للتعطيل الآلي (أقصى رصيد سالب مسموح)
  isFrozen?: boolean; // هل المحفظة مجمدة
  freezeReason?: string; // سبب التجميد
  frozenAt?: string; // تاريخ التجميد
  frozenBy?: string; // منفذ التجميد
  potentialLossAmount?: number; // خسارة محتملة مسجلة
  confirmedLossAmount?: number; // خسارة مؤكدة
  lossReason?: string; // سبب الخسارة
  recoveredCompensationAmount?: number; // مبلغ التعويض المسترد
  netLossAmount?: number; // صافي الخسارة
  fifoLots?: FIFOLotItem[]; // شحنات الـ FIFO المرتبطة بالمحفظة
  lastDepositAt?: string; // تاريخ آخر إيداع
  lastConsumedAt?: string; // تاريخ آخر استهلاك
  lastDailyResetDate?: string; // تاريخ آخر تجديد ليمت يومي (بتوقيت مصر)
  lastMonthlyResetMonth?: string; // شهر آخر تجديد ليمت شهري (بتوقيت مصر)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type StoreWalletTransactionType =
  | 'deposit' // إيداع نقدي / بنكي
  | 'withdrawal' // سحب نقدي
  | 'transfer_in' // تحويل وارد من محفظة
  | 'transfer_out' // تحويل صادر لمحفظة
  | 'purchase' // استهلاك وشراء بضاعة / تنفيذ تذكرة
  | 'bond_deposit' // سند إيداع بضاعة FIFO
  | 'refund' // استرداد تذكرة
  | 'loss' // تسجيل خسارة
  | 'freeze' // تجميد
  | 'compensation' // تعويض مسترد
  | 'fee' // رسوم تحويل أو عمولة تشغيل
  | 'cashback' // حركة كاش باك
  | 'adjustment'; // تسوية أو تصحيح دفتري

export type StoreWalletTransactionSourceType =
  | 'ticket' // تذكرة بيع
  | 'manual_deposit' // إيداع يدوي
  | 'manual_withdrawal' // سحب يدوي
  | 'transfer' // تحويل من محفظة أخرى
  | 'refund' // استرداد
  | 'adjustment' // تعديل إداري
  | 'cashback' // كاش باك
  | 'referral' // عمولة إحالة
  | 'trust' // أمانات ورصيد معلق
  | 'problem_resolution' // معالجة مشكلة
  | 'opening_balance' // رصيد افتتاحي
  | 'operating' // مصاريف تشغيل وسيرفرات
  | 'fraud' // احتيال
  | 'other'; // مصدر آخر

export interface StoreWalletTransaction {
  id: string;
  walletId: string;
  walletName: string;
  type: StoreWalletTransactionType;
  amount: number; // قيمة المبلغ بالجنيه
  amountUSD?: number; // قيمة المبلغ بالدولار
  pointsAmount?: number; // عدد النقاط المستهلكة أو المودعة
  currency: 'EGP' | 'USD';
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceNumber?: string; // رقم التذكرة أو رقم السند أو كود الحوالة
  relatedWalletId?: string;
  relatedWalletName?: string;
  targetWalletId?: string;
  targetWalletName?: string;
  exchangeRateUsed?: number;
  transferFees?: number;
  // Detailed Source Tracking (مصدر العملية)
  sourceType?: StoreWalletTransactionSourceType;
  sourceName?: string; // اسم وبيان المصدر بالعربي
  sourceTicketId?: string;
  sourceTicketNumber?: string;
  customerName?: string;
  customerPhone?: string;
  gameName?: string;
  senderPhoneNumber?: string; // رقم هاتف الراسل المحول منه
  receivingPhoneNumber?: string; // رقم خط الاستقبال المستلم عليه بالمحفظة
  walletNumberId?: string; // معرف الخط الداخلي
  walletPhoneNumber?: string; // رقم الخط الداخلي
  performedBy?: {
    id: string;
    name: string;
    role: string;
  };
  notes?: string;
  createdAt: string;
}

export interface DepositBondFIFO {
  id: string;
  bondNumber: string;
  walletId: string;
  walletName: string;
  unitsDeposited: number;
  remainingUnits: number;
  costUSDT: number;
  exchangeRateAtDeposit: number;
  transferFeesEGP: number;
  totalCostEGP: number;
  date: string;
  createdAt: string;
}

export interface MarketingCopySettings {
  headerText: string;
  footerText: string;
  companyName: string;
  updatedAt?: string;
}

export interface GameCopySettings {
  gameId: string;
  useCustomMessage?: boolean; // استخدام رسالة مخصصة بالكامل بدلاً من التوليد الآلي
  customFullMessage?: string; // الرسالة الكاملة المخصصة للعبة (يمكن تعديل كل حرف فيها)
  customTitle?: string; // عنوان مخصص للعبة (مثال: أسعار شحن فري فاير بالحساب)
  headerText?: string; // ترويسة خاصة بهذه اللعبة
  footerText?: string; // تذييل خاص بهذه اللعبة
  useGlobalHeader?: boolean; // استخدام الترويسة العامة (الافتراضي: true)
  useGlobalFooter?: boolean; // استخدام التذييل العام (الافتراضي: true)
  updatedAt?: string;
}

export interface ProductCopyTemplate {
  id: string;
  level: 'game' | 'section' | 'group' | 'product';
  name: string;
  templateText: string; // e.g. "{{اسم_اللعبة}} - {{اسم_القسم}} - {{اسم_المجموعة}} - {{اسم_المنتج}}: {{سعر_البيع}} ج"
  createdAt: string;
}

export type CouponType = 'seasonal' | 'influencer' | 'customer_specific' | 'single_use';

export type SingleUseType = 'customer_specific' | 'general';

export type CouponStatus = 'active' | 'used' | 'expired' | 'cancelled';

export interface CouponUsageRecord {
  id: string;
  couponId: string;
  couponCode: string;
  customerName: string;
  customerPhone: string;
  customerCode?: string;
  customerId?: string;
  ticketNumber: string;
  ticketId?: string;
  usageDate: string; // YYYY-MM-DD
  usageTime: string; // HH:mm:ss
  performedBy: string; // اسم الموظف المنفذ
  staffName?: string;
  discountAmount: number;
  discountAmountApplied?: number;
  statusBefore: CouponStatus;
  statusBeforeUse?: CouponStatus;
  statusAfter: CouponStatus;
  statusAfterUse?: CouponStatus;
  appliedAt: string; // ISO
  notes?: string;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  type: CouponType;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number; // e.g. 10% or 50 EGP
  maxDiscountLimitEGP?: number; // الحد الأقصى للخصم بالجنيه
  minPurchaseAmount?: number; // الحد الأدنى للشراء بالجنيه لتطبيق الكوبون
  maxPurchaseAmount?: number; // الحد الأقصى للشراء بالجنيه لتطبيق الكوبون

  // Status & Single-Use extensions
  status?: CouponStatus; // نشط، مستخدم، منتهي، ملغي
  singleUseType?: SingleUseType; // خاص بعميل أو عام
  targetCustomerCode?: string; // كود العميل المستهدف
  usageLog?: CouponUsageRecord[]; // سجل استخدام الكوبون
  usedAt?: string;
  usedByCustomerName?: string;
  usedInTicketNumber?: string;

  // 1. Seasonal Fields (كوبون خصم المواسم)
  allocatedQuantityBudgetEGP?: number; // كمية أو ميزانية الخصم المحددة (جنيه)
  usedQuantityBudgetEGP?: number; // ما تم استهلاكه من الكمية/الميزانية
  maxUsageTotal: number; // عدد مرات الاستخدام المحدد
  currentUsageCount: number; // عدد مرات الاستخدام الحالي
  maxUsagePerCustomer: number; // حد الاستخدام لكل عميل

  // 2. Influencer Fields (كوبون خصم المشاهير والإحالة)
  influencerCustomerId?: string; // حساب المشهور / العميل المرتبط
  influencerName?: string; // اسم المشهور
  influencerPhone?: string; // هاتف المشهور
  influencerCommissionRatePercent?: number; // نسبة عمولة المشهور من الشحن
  totalReferralsGenerated?: number; // عدد الإحالات المحسوبة
  influencerDiscountType?: 'percentage' | 'fixed_amount'; // نوع الخصم لمتابعي المشهور (نسبة أو مبلغ ثابت)
  influencerDiscountValue?: number; // قيمة الخصم لمتابعي المشهور

  // 3. Customer Specific Fields (كوبون خصم خاص بعميل / تعويض)
  targetCustomerId?: string; // العميل المخصص له الكوبون فقط
  targetCustomerName?: string; // اسم العميل
  targetCustomerPhone?: string; // هاتف العميل
  targetDealerId?: string; // التاجر المخصص له الكوبون
  targetDealerName?: string; // اسم التاجر
  targetDealerPhone?: string; // هاتف التاجر
  compensationReason?: string; // سبب التعويض / الخصم الخاص

  // Target Department / Audience
  targetAudience?: 'all' | 'customers' | 'dealers'; // الفئة المستهدفة

  // Common Anti-Fraud & Meta
  usedByPlayerGameIds: string[]; // فحص عدم تكرار الـ ID في اللعبة
  applicableGameId?: string; // معرف اللعبة المحددة أو 'all'
  applicableGameName?: string; // اسم اللعبة المخصصة
  validUntil?: string;
  expiryDate?: string;
  maxUsageCount?: number;
  isActive: boolean;
  isAutoDeactivated?: boolean;
  createdAt: string;
}

export interface RateHistoryItem {
  rate: number;
  oldRate?: number;
  timestamp: string;
  changedBy: string;
  notes?: string;
}

export interface DailyExchangeRate {
  rateUSD_EGP: number; // سعر صرف الدولار مقابل الجنيه
  fixedCostPerOrderEGP: number; // التكلفة الثابتة للطلب
  monthlyBreakEvenTargetOrders: number; // تارجت نقطة التعادل للطلبات شهرياً
  updatedAt: string;
  updatedBy: string;
  rateHistory?: RateHistoryItem[];
}

export type SystemCodeType = 'product_code' | 'referral' | 'coupon' | 'internal_voucher';

export interface SystemCodeItem {
  id: string;
  code: string;
  title: string;
  type: SystemCodeType;
  gameName?: string;
  productName?: string;
  valueEGP?: number;
  valueUSD?: number;
  maxUsageCount?: number; // إجمالي الكمية / عدد مرات الاستخدام المتاحة
  currentUsageCount?: number; // عدد مرات الاستخدام الفعلي
  remainingUsageCount?: number; // الكمية المتبقية
  status: 'active' | 'used' | 'expired' | 'canceled';
  assignedToCustomerName?: string;
  assignedToCustomerPhone?: string;
  usedAt?: string;
  usedInTicketNumber?: string;
  createdAt: string;
  createdBy: string;
  notes?: string;
}

export interface CustomerModuleSettings {
  defaultCurrencyDisplay: 'EGP' | 'USD';
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  invoicePaperFormat: 'thermal_80mm' | 'a4';
  showLogoOnInvoice: boolean;
  showPhoneOnInvoice: boolean;
  showCashbackOnInvoice: boolean;
  showEmployeeOnInvoice: boolean;
  invoiceFooterNote: string;
  costingMethod: 'FIFO' | 'weighted_average';
  priceRounding: boolean;
  minCashbackAmountEGP: number;
  defaultCashbackPercent: number;
  defaultPartnerCommissionPercent: number;
  defaultProfitMarginPercent: number;
  couponWhatsAppMessageTemplate?: string; // قالب رسالة الواتساب عند إرسال الكوبون للعميل
  referralCodeMessageTemplate?: string; // قالب رسالة الواتساب المستقل عند نسخ كود الإحالة
}

export * from './jkrWallet.types';
