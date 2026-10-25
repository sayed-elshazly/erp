// =============================================================
// NZM JKR TOP UP ERP — Financial & Smart Pricing Engine V3.0
// Core Type Definitions for Enterprise Pricing & Distribution
// =============================================================

export interface PricingBenefitsConfig {
  cashbackPercent: number;        // e.g. 1%
  referralPercent: number;        // e.g. 2%
  reservePercent: number;         // e.g. 1% (احتياطي المخاطر والطوارئ)
  developmentPercent: number;     // e.g. 0.5% (صندوق التطوير)
  offersPercent: number;          // e.g. 0.5% (صندوق العروض والجوائز)
  safetyMarginPercent?: number;   // e.g. 0% (هامش أمان اختياري)
}

export interface PricingConfig extends PricingBenefitsConfig {
  id: string;
  version: number;
  rateUSD_EGP: number;                     // Current USDT rate (سعر صرف الدولار)
  defaultProfitMarginPercent: number;      // Default P% (هامش الربح الافتراضي)
  fixedCostMode: 'auto' | 'manual';        // وضع حساب التكلفة الثابتة F
  manualFixedCostEGP: number;              // القيمة اليدوية للتكلفة الثابتة F
  monthlyBreakEvenTargetOrders: number;    // التارجت الشهري للطلبات
  currencyDisplay: 'EGP' | 'USD';          // العملة المعروضة
  minCashbackAmountEGP: number;            // الحد الأدنى للكاش باك
  updatedAt: string;
  updatedBy: string;
}

export interface PricingCalculationInput {
  costUSD?: number;                        // Cost in USD (if known)
  costEGP?: number;                        // Override Cost in EGP
  walletId?: string;                       // Inventory wallet to lookup FIFO cost
  gameId?: string;                         // Game ID for hierarchical margin
  sectionId?: string;                      // Section ID for hierarchical margin
  productId?: string;                      // Product ID for specific margin
  customProfitMarginPercent?: number;      // Specific P% override
  quantity?: number;                       // Order quantity (defaults to 1)
  isFirstOrderPromo?: boolean;             // First order promo cost (سعر أول شحنة)
  isDealer?: boolean;                      // Dealer wholesale calculation flag
  dealerProfitMarginPercent?: number;      // Wholesale dealer profit margin %
  isCashbackEnabled?: boolean;             // تفعيل الكاش باك لهذا المنتج (true / false)
  isReferralEnabled?: boolean;             // تفعيل الإحالة لهذا المنتج (true / false)
  customFixedCostEGP?: number;             // المصروف التشغيلي الثابت المخصص للباقة F بالجنيه
  customReservePercent?: number;           // نسبة الاحتياطي المخصصة للباقة %
  customDevelopmentPercent?: number;       // نسبة صندوق التطوير المخصصة للباقة %
  customCashbackPercent?: number;          // نسبة الكاش باك المخصصة للباقة %
  customReferralPercent?: number;          // نسبة عمولة الإحالة المخصصة للباقة %
  customOffersPercent?: number;            // نسبة العروض الترويجية المخصصة للباقة %
}

export interface PricingBreakdown {
  // Input Core Metrics
  costUSD: number;                         // C in USD
  costEGP: number;                         // C in EGP (Real FIFO Cost)
  usdRateUsed: number;                     // Actual USDT rate used for costing
  fifoBondNumberUsed?: string;             // Bond Number if resolved via FIFO

  // Margins & Operating Costs
  profitMarginPercent: number;             // P%
  targetMarkupEGP: number;                 // C * P%
  fixedCostPerOrderEGP: number;            // F in EGP

  // Benefits & Deductions Breakdown (B%)
  benefitsPercentTotal: number;            // B% = Cashback% + Referral% + Reserve% + Dev% + Offers%
  cashbackPercent: number;
  cashbackAmountEGP: number;               // S * Cashback%
  referralPercent: number;
  referralAmountEGP: number;               // S * Referral%
  reservePercent: number;
  reserveAmountEGP: number;                // S * Reserve%
  developmentPercent: number;
  developmentAmountEGP: number;            // S * Development%
  offersPercent: number;
  offersAmountEGP: number;                 // S * Offers%
  totalDeductionsEGP: number;              // S * B%

  // Final Results
  finalSellingPriceEGP: number;            // S in EGP = [C * (1 + P) + F] / (1 - B)
  dealerPriceEGP?: number;                 // Wholesale Dealer price in EGP
  finalSellingPriceUSD: number;            // S in USD
  firstOrderCostPriceEGP: number;          // Promo price = C only

  // Net Profit Realization
  netRealizedCompanyProfitEGP: number;     // S - C - F - TotalDeductions
  netProfitMarginPercent: number;          // (NetRealizedCompanyProfit / S) * 100

  // Verification Equality: C + F + TotalDeductions + NetProfit === S
  isBalancedZeroLeakage: boolean;
}

export interface TicketPricingSnapshot {
  snapshotId: string;
  configVersion: number;
  calculatedAt: string;
  calculatedBy: string;

  // Real Cost Snapshot
  costUSD: number;
  costEGP: number;
  actualFIFOCostUSD?: number;
  actualFIFOCostEGP?: number;
  exchangeRateUsed?: number;
  usdExchangeRateAtPurchase: number;
  fifoBondReference?: string;
  consumedLots?: any[];

  // Formula Components
  profitMarginPercent: number;
  targetMarkupEGP: number;
  fixedCostEGP: number;

  // Deductions Snapshot
  cashbackPercent: number;
  cashbackAmountEGP: number;
  referralPercent: number;
  referralAmountEGP: number;
  reservePercent: number;
  reserveAmountEGP: number;
  developmentPercent: number;
  developmentAmountEGP: number;
  offersPercent: number;
  offersAmountEGP: number;
  totalDeductionsEGP: number;

  // Final Financial Values
  grossSellingPriceEGP: number;
  grossSellingPriceUSD: number;
  appliedDiscountEGP: number;
  netCollectedFromCustomerEGP: number;
  netCompanyProfitEGP: number;
  netProfitEGP?: number;
  netMarginPercent: number;

  // Money Distribution Record
  distributionSummary: {
    inventoryCost: number;
    operatingExpenses: number;
    cashbackLiability: number;
    referralLiability: number;
    reserveFund: number;
    developmentFund: number;
    offersFund: number;
    netRetainedProfit: number;
  };
}

export interface PricingAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  settingKey: string;
  settingLabelArabic: string;
  oldValue: any;
  newValue: any;
  reason?: string;
  deviceInfo?: string;
  ipAddress?: string;
}

export interface PricingSimulationInput {
  costEGP: number;
  costUSD?: number;
  usdRate: number;
  profitMarginPercent: number;
  fixedCostEGP: number;
  cashbackPercent: number;
  referralPercent: number;
  reservePercent: number;
  developmentPercent: number;
  offersPercent: number;
}