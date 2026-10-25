import { Competition, CompetitionParticipant, CompetitionReward } from '../../types/competition.types';

export const initialCompetitionsSeed: Competition[] = [
  {
    id: 'comp_recharge_10',
    code: 'CMP-10X',
    title: 'تحدي شحن 10 مرات — مكافأة 1$ مجانًا',
    description: 'اشحن 10 مرات بأي قيمة خلال فترة المسابقة واحصل تلقائيًا على شحنة 1$ مجانية في لعبة Free Fire!',
    type: 'recharge_count',
    status: 'active',
    startDate: '2026-09-01',
    startTime: '00:00',
    endDate: '2026-12-31',
    endTime: '23:59',
    targetAudience: {
      type: 'all_customers'
    },
    rules: {
      id: 'rule_10x',
      logicalOperator: 'AND',
      conditions: [
        {
          id: 'c_recharge_count_10',
          type: 'recharge_count',
          operator: 'gte',
          value: 10,
          label: 'إتمام 10 شحنات مكتملة'
        }
      ]
    },
    prizes: [
      {
        id: 'prz_10x_1',
        name: 'شحن 1$ مجانًا (100 جوهرة)',
        type: 'free_recharge',
        value: 1,
        currency: 'USD',
        productId: 'prod_ff_100',
        productName: '100 جوهرة فري فاير',
        sourceWalletId: 'w_gplay_us',
        sourceWalletName: 'محفظة بضاعة Google Play US',
        costEGP: 50,
        quantityAvailable: 100,
        autoDelivery: false
      }
    ],
    maxWinners: 50,
    totalMarketingCost: 250,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
    createdById: 'usr_admin',
    createdByName: 'المدير العام'
  },
  {
    id: 'comp_top_spenders',
    code: 'CMP-TOP',
    title: 'سباق المتصدرين الأسبوعي (Top Spenders)',
    description: 'أكثر العملاء شحنًا خلال هذا الأسبوع يحصلون على مكافآت نقدية ورصيد مجاني في المحفظة!',
    type: 'top_spenders',
    status: 'active',
    startDate: '2026-09-14',
    startTime: '00:00',
    endDate: '2026-12-31',
    endTime: '23:59',
    targetAudience: {
      type: 'all_customers'
    },
    rules: {
      id: 'rule_top_spenders',
      logicalOperator: 'AND',
      conditions: [
        {
          id: 'c_min_total',
          type: 'total_recharge_amount',
          operator: 'gte',
          value: 1000,
          label: 'الحد الأدنى للمنافسة 1000 ج.م'
        }
      ]
    },
    prizes: [
      {
        id: 'prz_top_1',
        rankOrTier: 1,
        name: 'المركز الأول: 500 ج.م رصيد محفظة',
        type: 'wallet_credit',
        value: 500,
        currency: 'EGP',
        sourceWalletId: 'w_operating_vodafone',
        sourceWalletName: 'فودافون كاش التشغيلية',
        costEGP: 500
      },
      {
        id: 'prz_top_2',
        rankOrTier: 2,
        name: 'المركز الثاني: 250 ج.م كاش باك إضافي',
        type: 'cashback',
        value: 250,
        currency: 'EGP',
        sourceWalletId: 'w_cashback',
        sourceWalletName: 'محفظة الكاش باك المجمعة',
        costEGP: 250
      },
      {
        id: 'prz_top_3',
        rankOrTier: 3,
        name: 'المركز الثالث: كود خصم 100 ج.م',
        type: 'discount',
        value: 100,
        currency: 'EGP',
        costEGP: 100
      }
    ],
    maxWinners: 3,
    totalMarketingCost: 850,
    createdAt: '2026-09-14T08:00:00Z',
    updatedAt: '2026-09-18T12:00:00Z',
    createdById: 'usr_admin',
    createdByName: 'المدير العام'
  },
  {
    id: 'comp_recharge_draw',
    code: 'CMP-DRAW',
    title: 'سحب الشاحنين المحظوظين (Lucky Draw)',
    description: 'اشحن بأكثر من 300 ج.م اليوم وادخل السحب الإلكتروني العشوائي على 3 جوائز قيمة!',
    type: 'recharge_draw',
    status: 'active',
    startDate: '2026-09-15',
    startTime: '00:00',
    endDate: '2026-09-25',
    endTime: '23:59',
    targetAudience: {
      type: 'all_customers'
    },
    rules: {
      id: 'rule_draw',
      logicalOperator: 'AND',
      conditions: [
        {
          id: 'c_draw_min_charge',
          type: 'min_recharge_amount',
          operator: 'gte',
          value: 300,
          label: 'شحنة بقيمة 300 ج.م أو أكثر'
        }
      ]
    },
    prizes: [
      {
        id: 'prz_draw_1',
        rankOrTier: 1,
        name: 'شحن 5$ مجانًا ببجي موبايل',
        type: 'free_recharge',
        value: 5,
        currency: 'USD',
        productName: '300 + 25 UC ببجي',
        sourceWalletId: 'w_gplay_us',
        sourceWalletName: 'محفظة بضاعة Google Play US',
        costEGP: 250
      },
      {
        id: 'prz_draw_2',
        rankOrTier: 2,
        name: 'شحن 3$ مجانًا فري فاير',
        type: 'free_recharge',
        value: 3,
        currency: 'USD',
        productName: '310 جوهرة فري فاير',
        sourceWalletId: 'w_gplay_us',
        sourceWalletName: 'محفظة بضاعة Google Play US',
        costEGP: 150
      },
      {
        id: 'prz_draw_3',
        rankOrTier: 3,
        name: '100 ج.م رصيد محفظة',
        type: 'wallet_credit',
        value: 100,
        currency: 'EGP',
        sourceWalletId: 'w_operating_vodafone',
        sourceWalletName: 'فودافون كاش التشغيلية',
        costEGP: 100
      }
    ],
    maxWinners: 3,
    totalMarketingCost: 500,
    createdAt: '2026-09-15T09:00:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
    createdById: 'usr_admin',
    createdByName: 'المدير العام'
  },
  {
    id: 'comp_referral_3',
    code: 'CMP-REF3',
    title: 'حملة دعوة الأصدقاء (Refer 3 Friends)',
    description: 'قم بدعوة 3 أصدقاء جدد للشحن في الموقع واحصل على مكافأة نقدية 100 ج.م فور إتمام أول شحنة لكل منهم!',
    type: 'referral',
    status: 'active',
    startDate: '2026-09-01',
    startTime: '00:00',
    endDate: '2026-09-30',
    endTime: '23:59',
    targetAudience: {
      type: 'all_customers'
    },
    rules: {
      id: 'rule_ref3',
      logicalOperator: 'AND',
      conditions: [
        {
          id: 'c_ref_count',
          type: 'referral_count',
          operator: 'gte',
          value: 3,
          label: 'إحالة 3 عملاء جدد بشحنة مكتملة'
        }
      ]
    },
    prizes: [
      {
        id: 'prz_ref_100',
        name: 'مكافأة إحالة 100 ج.م كاش',
        type: 'wallet_credit',
        value: 100,
        currency: 'EGP',
        sourceWalletId: 'w_referrals',
        sourceWalletName: 'محفظة الإحالات والعمولات',
        costEGP: 100
      }
    ],
    maxWinners: 20,
    totalMarketingCost: 200,
    createdAt: '2026-09-01T11:00:00Z',
    updatedAt: '2026-09-18T11:00:00Z',
    createdById: 'usr_admin',
    createdByName: 'المدير العام'
  },
  {
    id: 'comp_social_story',
    code: 'CMP-SOC',
    title: 'مسابقة ستوري إنستغرام وسرعة التفاعل',
    description: 'شاهد ستوري حسابنا الرسمي، احفظ رقم خدمة العملاء، وارفع سكرين شوت لتأكيد المشاركة والحصول على 50 ج.م خصم فوري!',
    type: 'speed',
    status: 'active',
    startDate: '2026-09-10',
    startTime: '12:00',
    endDate: '2026-09-22',
    endTime: '23:59',
    targetAudience: {
      type: 'all_customers'
    },
    rules: {
      id: 'rule_story_speed',
      logicalOperator: 'AND',
      conditions: [
        {
          id: 'c_story_first_20',
          type: 'first_x_participants',
          operator: 'lte',
          value: 20,
          label: 'أول 20 مشارك فقط'
        },
        {
          id: 'c_story_verify',
          type: 'story_view',
          operator: 'boolean',
          value: true,
          label: 'مشاهدة الستوري وتوثيق السكرين شوت'
        }
      ]
    },
    prizes: [
      {
        id: 'prz_story_discount',
        name: 'قسيمة خصم 50 ج.م',
        type: 'discount',
        value: 50,
        currency: 'EGP',
        costEGP: 50
      }
    ],
    maxWinners: 20,
    totalMarketingCost: 350,
    createdAt: '2026-09-10T12:00:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
    createdById: 'usr_admin',
    createdByName: 'المدير العام'
  }
];

export const initialParticipantsSeed: CompetitionParticipant[] = [
  {
    id: 'part_1',
    competitionId: 'comp_recharge_10',
    entityType: 'customer',
    entityId: 'cust_1',
    entityName: 'أحمد محمود القاضي',
    entityPhone: '01012345678',
    joinedAt: '2026-09-02T14:30:00Z',
    entriesCount: 8,
    rechargeCount: 8,
    totalRechargeAmount: 1850,
    qualifyingTransactionIds: ['tkt_seed_1', 'tkt_seed_2'],
    isEligible: false,
    isWinner: false
  },
  {
    id: 'part_2',
    competitionId: 'comp_recharge_10',
    entityType: 'customer',
    entityId: 'cust_2',
    entityName: 'محمود عبد الرازق شريف',
    entityPhone: '01198765432',
    joinedAt: '2026-09-03T11:00:00Z',
    entriesCount: 10,
    rechargeCount: 10,
    totalRechargeAmount: 3400,
    qualifyingTransactionIds: ['tkt_seed_3'],
    isEligible: true,
    isWinner: true,
    assignedPrizeId: 'prz_10x_1',
    assignedPrizeName: 'شحن 1$ مجانًا (100 جوهرة)'
  },
  {
    id: 'part_3',
    competitionId: 'comp_top_spenders',
    entityType: 'customer',
    entityId: 'cust_1',
    entityName: 'أحمد محمود القاضي',
    entityPhone: '01012345678',
    joinedAt: '2026-09-14T10:00:00Z',
    entriesCount: 1,
    rechargeCount: 5,
    totalRechargeAmount: 4200,
    qualifyingTransactionIds: [],
    currentRank: 1,
    isEligible: true,
    isWinner: true,
    assignedPrizeId: 'prz_top_1',
    assignedPrizeName: 'المركز الأول: 500 ج.م رصيد محفظة'
  },
  {
    id: 'part_4',
    competitionId: 'comp_top_spenders',
    entityType: 'customer',
    entityId: 'cust_3',
    entityName: 'إبراهيم حسن النجار',
    entityPhone: '01234567890',
    joinedAt: '2026-09-14T11:00:00Z',
    entriesCount: 1,
    rechargeCount: 3,
    totalRechargeAmount: 2950,
    qualifyingTransactionIds: [],
    currentRank: 2,
    isEligible: true,
    isWinner: false
  },
  {
    id: 'part_5',
    competitionId: 'comp_social_story',
    entityType: 'customer',
    entityId: 'cust_4',
    entityName: 'طارق صلاح الدين',
    entityPhone: '01511223344',
    joinedAt: '2026-09-12T16:00:00Z',
    entriesCount: 1,
    rechargeCount: 1,
    totalRechargeAmount: 150,
    qualifyingTransactionIds: [],
    socialProofUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500',
    socialProofNote: 'تم متابعة الحساب وحفظ رقم الواتساب ورقم الهاتف المسجل 01511223344',
    socialVerificationStatus: 'pending',
    isEligible: false,
    isWinner: false
  }
];

export const initialRewardsSeed: CompetitionReward[] = [
  {
    id: 'rew_delivered_1',
    competitionId: 'comp_recharge_10',
    competitionTitle: 'تحدي شحن 10 مرات — مكافأة 1$ مجانًا',
    participantId: 'part_2',
    entityType: 'customer',
    entityId: 'cust_2',
    entityName: 'محمود عبد الرازق شريف',
    entityPhone: '01198765432',
    prizeId: 'prz_10x_1',
    prizeName: 'شحن 1$ مجانًا (100 جوهرة)',
    prizeType: 'free_recharge',
    prizeValue: 1,
    currency: 'USD',
    costEGP: 50,
    sourceWalletId: 'w_gplay_us',
    sourceWalletName: 'محفظة بضاعة Google Play US',
    productId: 'prod_ff_100',
    productName: '100 جوهرة فري فاير',
    status: 'delivered',
    idempotencyKey: 'comp_deliv_rew_delivered_1',
    snapshot: {
      competitionName: 'تحدي شحن 10 مرات — مكافأة 1$ مجانًا',
      prizeName: 'شحن 1$ مجانًا (100 جوهرة)',
      prizeValue: 1,
      currency: 'USD',
      productName: '100 جوهرة فري فاير',
      walletName: 'محفظة بضاعة Google Play US',
      costEGP: 50,
      customerName: 'محمود عبد الرازق شريف',
      rulesSummary: 'إتمام 10 شحنات مكتملة',
      deliveryDate: '2026-09-16T15:20:00Z',
      adminName: 'المدير العام'
    },
    deliveredAt: '2026-09-16T15:20:00Z',
    deliveredBy: 'المدير العام',
    financialExpenseId: 'exp_rew_1',
    walletTransactionId: 'wtx_rew_1',
    createdAt: '2026-09-16T15:00:00Z'
  },
  {
    id: 'rew_pending_1',
    competitionId: 'comp_top_spenders',
    competitionTitle: 'سباق المتصدرين الأسبوعي (Top Spenders)',
    participantId: 'part_3',
    entityType: 'customer',
    entityId: 'cust_1',
    entityName: 'أحمد محمود القاضي',
    entityPhone: '01012345678',
    prizeId: 'prz_top_1',
    prizeName: 'المركز الأول: 500 ج.م رصيد محفظة',
    prizeType: 'wallet_credit',
    prizeValue: 500,
    currency: 'EGP',
    costEGP: 500,
    sourceWalletId: 'w_operating_vodafone',
    sourceWalletName: 'فودافون كاش التشغيلية',
    status: 'pending',
    idempotencyKey: 'comp_deliv_rew_pending_1',
    snapshot: {
      competitionName: 'سباق المتصدرين الأسبوعي (Top Spenders)',
      prizeName: 'المركز الأول: 500 ج.م رصيد محفظة',
      prizeValue: 500,
      currency: 'EGP',
      walletName: 'فودافون كاش التشغيلية',
      costEGP: 500,
      customerName: 'أحمد محمود القاضي',
      rulesSummary: 'المركز الأول في إجمالي الشحن الأسبوعي'
    },
    createdAt: '2026-09-17T18:00:00Z'
  }
];
