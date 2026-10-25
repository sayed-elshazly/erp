// =============================================================
// NZM JKR TOP UP ERP — Gamification & Rewards Types
// =============================================================

export type CompetitionStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'finished'
  | 'archived'
  | 'cancelled';

export type CompetitionType =
  | 'interactive'      // تفاعل مع منشور
  | 'speed'            // أول X أشخاص يشوفوا Story وينفذوا شرط
  | 'registration'     // سجل رقمنا وشوف الـ Story
  | 'recharge_draw'    // اشحن خلال فترة وادخل السحب العشوائي
  | 'top_spenders'     // أكثر العملاء شحنًا (ترتيب وليدربورد)
  | 'recharge_count'   // اشحن X مرات (مثال 10 مرات)
  | 'referral'         // إحالة عملاء جدد (مثال 3 عملاء)
  | 'custom';          // شروط مخصصة مرنة

export type ConditionType =
  | 'min_recharge_amount'      // الحد الأدنى للشحنة الواحدة
  | 'total_recharge_amount'    // إجمالي مبلغ الشحن
  | 'recharge_count'           // عدد الشحنات المكتملة
  | 'specific_product'         // منتج معين
  | 'specific_products'        // قائمة منتجات محددة
  | 'specific_category'        // قسم / تصنيف معين
  | 'new_customer'             // عميل جديد
  | 'referral_count'           // عدد العملاء المحالين
  | 'customer_registration'    // تسجيل رقم الشركة وبيانات العميل
  | 'social_interaction'       // التفاعل مع المنشور
  | 'story_view'               // مشاهدة الستوري
  | 'first_x_participants'     // أول X مشاركين
  | 'date_range'               // نطاق زمني محدد
  | 'time_range'               // فترة ساعات معينة
  | 'customer_type'            // تصنيف العميل
  | 'merchant_type';           // تصنيف التاجر

export interface CompetitionRuleCondition {
  id: string;
  type: ConditionType;
  operator: 'gte' | 'lte' | 'eq' | 'in' | 'between' | 'boolean';
  value: any;
  extraValue?: any;
  label: string;
}

export interface CompetitionRule {
  id: string;
  logicalOperator: 'AND' | 'OR';
  conditions: CompetitionRuleCondition[];
}

export type ParticipantEntityType = 'customer' | 'dealer' | 'merchant';

export type TargetAudienceType =
  | 'all_customers'
  | 'selected_customers'
  | 'new_customers'
  | 'existing_customers'
  | 'merchants'
  | 'selected_merchants'
  | 'both'
  | 'all'
  | 'customer_level'
  | 'custom_group';

export type PrizeType =
  | 'free_recharge'    // شحن مجاني بقيمة محددة
  | 'discount'         // كوبون / كود خصم لعملية قادمة
  | 'cashback'         // رصيد كاش باك منفصل
  | 'product_reward'   // منتج مجاني
  | 'wallet_credit'    // إضافة رصيد للمحفظة الأساسية
  | 'custom_reward';   // مكافأة مخصصة / يدوية

export interface CompetitionPrize {
  id: string;
  rankOrTier?: number; // 1st, 2nd, 3rd, or null for all
  name: string;
  type: PrizeType;
  value: number; // القيمة بالجنيه أو الدولار
  currency: 'EGP' | 'USD';
  productId?: string;
  productName?: string;
  sourceWalletId?: string; // محفظة البضاعة المصدر
  sourceWalletName?: string;
  costEGP: number; // التكلفة الفعلية كمصروف تسويقي
  quantityAvailable?: number;
  autoDelivery?: boolean;
}

export interface Competition {
  id: string;
  code: string;
  title: string;
  description: string;
  type: CompetitionType;
  status: CompetitionStatus;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  targetAudience: {
    type: TargetAudienceType;
    selectedIds?: string[];
    tierFilter?: string[];
  };
  rules: CompetitionRule;
  prizes: CompetitionPrize[];
  maxWinners?: number;
  isDrawExecuted?: boolean;
  drawDetails?: {
    drawId: string;
    executedAt: string;
    executedBy: string;
    eligibleParticipantsCount: number;
    winnerIds: string[];
  };
  totalMarketingCost: number;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdByName: string;
  isArchived?: boolean;
}

export interface CompetitionParticipant {
  id: string;
  competitionId: string;
  entityType: ParticipantEntityType;
  entityId: string;
  entityName: string;
  entityPhone: string;
  joinedAt: string;
  entriesCount: number;
  rechargeCount: number;
  totalRechargeAmount: number;
  qualifyingTransactionIds: string[];
  currentRank?: number;
  isEligible: boolean;
  isWinner: boolean;
  socialProofUrl?: string;
  socialProofNote?: string;
  socialVerificationStatus?: 'pending' | 'approved' | 'rejected';
  verificationNotes?: string;
  assignedPrizeId?: string;
  assignedPrizeName?: string;
}

export type RewardDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'cancelled';

export interface CompetitionReward {
  id: string;
  competitionId: string;
  competitionTitle: string;
  participantId: string;
  entityType: ParticipantEntityType;
  entityId: string;
  entityName: string;
  entityPhone: string;
  prizeId: string;
  prizeName: string;
  prizeType: PrizeType;
  prizeValue: number;
  currency: 'EGP' | 'USD';
  costEGP: number;
  sourceWalletId?: string;
  sourceWalletName?: string;
  productId?: string;
  productName?: string;
  status: RewardDeliveryStatus;
  idempotencyKey: string;
  snapshot: {
    competitionName: string;
    prizeName: string;
    prizeValue: number;
    currency: 'EGP' | 'USD';
    productName?: string;
    walletName?: string;
    costEGP: number;
    customerName?: string;
    entityName?: string;
    phone?: string;
    rulesSummary: string;
    deliveryDate?: string;
    adminName?: string;
  };
  deliveredAt?: string;
  deliveredBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  financialExpenseId?: string;
  walletTransactionId?: string;
  customerTransactionId?: string;
  createdAt: string;
}

export interface CompetitionDrawRecord {
  id: string;
  competitionId: string;
  competitionTitle: string;
  executedAt: string;
  executedBy: {
    id: string;
    name: string;
    role: string;
  };
  randomSeed?: string;
  totalEligibleAtDrawTime: number;
  frozenParticipantsSnapshot: {
    id: string;
    entityId: string;
    name: string;
    phone: string;
    entriesCount: number;
  }[];
  winners: {
    participantId: string;
    entityId: string;
    name: string;
    phone: string;
    prizeId: string;
    prizeName: string;
    prizeValue: number;
  }[];
  notes?: string;
}

export interface CompetitionsDashboardKPIs {
  activeCompetitionsCount: number;
  finishedCompetitionsCount: number;
  totalParticipantsCount: number;
  totalPrizesCount: number;
  deliveredRewardsValue: number;
  pendingRewardsValue: number;
  marketingCostTotal: number;
  uniqueRewardedCustomersCount: number;
  totalCampaignCost: number;
}
