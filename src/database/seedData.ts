import { User } from '../types/auth.types';
import {
  Customer,
  CustomerNote,
  CustomerTicket,
  CustomerReferral,
  UnifiedWalletTransaction,
  CustomerTransaction
} from '../types/customer.types';
import { SafeTransaction, Expense, Debt, ShiftSettlement, AttendanceRecord, SalarySlip, Employee } from '../types/finance.types';
import { AuditLog } from '../types/audit.types';
import { NotificationItem, SystemSettings } from '../types/common.types';

export const initialSettings: SystemSettings = {
  companyName: 'JKR Top Up - مركز شحن الألعاب والبطاقات',
  currency: 'EGP',
  currencySymbol: 'ج.م',
  phone: '+20 100 123 4567',
  address: 'القاهرة - مصر الجديدة',
  taxRate: 0,
  cashbackPercentage: 1.0, // 1%
  referralBonusAmount: 10.0,
  autoArchiveDays: 365,
  enableAuditLog: true,
  vaultInitialBalance: 0.0, // Initial capital is formally established via safe_1 transaction (25,000 EGP)
  systemVersion: 'v2.5 Pro Top-Up'
};

export const initialUsers: User[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    fullName: 'المدير العام (Owner)',
    role: 'admin',
    jobTitle: 'المالك والمدير التنفيذي',
    isActive: true,
    permissions: [
      'view',
      'add',
      'edit',
      'delete',
      'print',
      'export',
      'manage_users',
      'manage_finance',
      'close_shift',
      'manage_settings'
    ],
    lastLogin: new Date().toISOString(),
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'usr_cust_1',
    username: 'ahmed_cust',
    fullName: 'أحمد السعدي',
    role: 'employee',
    department: 'customers',
    jobTitle: 'مسؤول قسم الشحن وخدمة الزبائن',
    isActive: true,
    permissions: ['view', 'add', 'edit', 'print', 'export'],
    lastLogin: '2026-08-28T14:30:00.000Z',
    createdAt: '2026-01-15T09:00:00.000Z'
  },
  {
    id: 'usr_fin_1',
    username: 'mustafa_fin',
    fullName: 'مصطفى الكرخي',
    role: 'employee',
    department: 'finance',
    jobTitle: 'مسؤول الخزنة والحسابات',
    isActive: true,
    permissions: ['view', 'add', 'edit', 'print', 'export', 'manage_finance', 'close_shift'],
    lastLogin: '2026-08-29T10:15:00.000Z',
    createdAt: '2026-01-10T09:00:00.000Z'
  },
  {
    id: 'usr_dealer_1',
    username: 'tamer_dealer',
    fullName: 'تامر إبراهيم',
    role: 'employee',
    department: 'dealers',
    jobTitle: 'مسؤول مبيعات وشحن الجملة والتجار',
    isActive: true,
    permissions: ['view', 'add', 'edit', 'print', 'export'],
    lastLogin: '2026-08-30T11:00:00.000Z',
    createdAt: '2026-01-18T09:00:00.000Z'
  },
  {
    id: 'usr_broker_1',
    username: 'hassan_broker',
    fullName: 'حسن الوسيط',
    role: 'employee',
    department: 'brokerage',
    jobTitle: 'مسؤول صفقات الوساطة والضمان',
    isActive: true,
    permissions: ['view', 'add', 'edit', 'print', 'export'],
    lastLogin: '2026-08-31T12:00:00.000Z',
    createdAt: '2026-01-20T09:00:00.000Z'
  },
  {
    id: 'usr_subs_1',
    username: 'sara_subs',
    fullName: 'سارة أحمد',
    role: 'employee',
    department: 'subscriptions',
    jobTitle: 'مسؤولة قسم الاشتراكات وخدمات البث',
    isActive: true,
    permissions: ['view', 'add', 'edit', 'print', 'export'],
    lastLogin: '2026-08-31T14:00:00.000Z',
    createdAt: '2026-01-22T09:00:00.000Z'
  },
  {
    id: 'usr_subs_2',
    username: 'subscriptions',
    fullName: 'مسؤول الاشتراكات',
    role: 'employee',
    department: 'subscriptions',
    jobTitle: 'مسؤول إدارة الاشتراكات',
    isActive: true,
    permissions: ['view', 'add', 'edit', 'print', 'export'],
    lastLogin: '2026-08-31T14:00:00.000Z',
    createdAt: '2026-01-22T09:00:00.000Z'
  }
];

export const initialCustomers: Customer[] = [
  {
    id: 'cust_1',
    code: 'JKR-1001',
    name: 'حسين علي الركابي',
    phone: '01012345678',
    profileType: 'regular', // عميل عادي
    source: 'facebook',
    status: 'active',
    isFrozen: false,
    monthlyReferredCount: 4,
    partnerWarningCount: 0,
    referralCode: 'REF-JKR-1001',
    referralWalletBalance: 45.0,
    totalReferralCommissionEarned: 120.0,
    balance: 450.0,
    accountBalance: 50.0, // رصيد دائن
    cashbackBalance: 25.0,
    totalCashbackEarned: 78.0,
    totalSpent: 3850.0,
    totalOrders: 42,
    maxSingleOrderAmount: 850.0,
    loyaltyTier: 'gold', // 30 - 99 تذاكر
    purchasingPower: 'medium', // 500 - 1999 ج
    favoriteGame: 'Free Fire',
    lastPurchaseDate: '2026-08-28T11:05:00Z',
    hasUsedFirstOrderDiscount: true,
    isArchived: false,
    notesCount: 2,
    ticketsCount: 42,
    createdAt: '2026-01-10T10:00:00.000Z',
    updatedAt: '2026-08-28T11:05:00.000Z'
  },
  {
    id: 'cust_2',
    code: 'JKR-1002',
    name: 'أحمد ممدوح الشريف',
    phone: '01122334455',
    profileType: 'partner', // شريك عمل
    source: 'word_of_mouth',
    status: 'active',
    isFrozen: false,
    customCommissionRate: 2.0, // 2% عمولة خاصة
    contractDurationMonths: 6,
    monthlyReferredCount: 14, // محقق التارجت (> 10)
    partnerWarningCount: 0,
    referralCode: 'REF-JKR-AHMED',
    referralWalletBalance: 130.0,
    totalReferralCommissionEarned: 540.0,
    balance: 1200.0,
    accountBalance: 0.0,
    cashbackBalance: 60.0,
    totalCashbackEarned: 190.0,
    totalSpent: 8500.0,
    totalOrders: 115,
    maxSingleOrderAmount: 2200.0,
    loyaltyTier: 'vip', // 100+ تذاكر
    purchasingPower: 'strong', // 2000 - 4500 ج
    favoriteGame: 'PUBG Mobile',
    lastPurchaseDate: '2026-08-29T09:20:00Z',
    hasUsedFirstOrderDiscount: true,
    isArchived: false,
    notesCount: 1,
    ticketsCount: 115,
    createdAt: '2026-02-01T11:30:00.000Z',
    updatedAt: '2026-08-29T09:20:00.000Z'
  },
  {
    id: 'cust_3',
    code: 'JKR-1003',
    name: 'متجر دريم للاتصالات (محمد عادل)',
    phone: '01233445566',
    profileType: 'shop', // محل تجاري
    shopName: 'دريم ستور للألعاب والإلكترونيات',
    shopAddress: 'شارع الجمهورية - المنصورة',
    source: 'whatsapp',
    status: 'active',
    isFrozen: false,
    monthlyReferredCount: 8,
    partnerWarningCount: 1, // إنذار أول لعدم بلوغ 10 إحالات
    referralCode: 'REF-JKR-DREAM',
    referralWalletBalance: 85.0,
    totalReferralCommissionEarned: 310.0,
    balance: 3400.0,
    accountBalance: -20.0, // رصيد مدين
    cashbackBalance: 110.0,
    totalCashbackEarned: 450.0,
    totalSpent: 18200.0,
    totalOrders: 64,
    maxSingleOrderAmount: 4800.0,
    loyaltyTier: 'gold',
    purchasingPower: 'whale', // 4501+ ج (حوت)
    favoriteGame: 'Free Fire',
    lastPurchaseDate: '2026-08-28T14:10:00Z',
    hasUsedFirstOrderDiscount: true,
    isArchived: false,
    notesCount: 3,
    ticketsCount: 64,
    createdAt: '2026-03-15T14:00:00.000Z',
    updatedAt: '2026-08-28T14:10:00.000Z'
  },
  {
    id: 'cust_4',
    code: 'JKR-1004',
    name: 'سالي اليوتيوبر (Gaming Queen)',
    phone: '01099887766',
    profileType: 'influencer', // مشهور
    source: 'tiktok',
    status: 'active',
    isFrozen: false,
    customCommissionRate: 2.5,
    monthlyReferredCount: 45,
    partnerWarningCount: 0,
    referralCode: 'REF-SALLY-PRO',
    referralWalletBalance: 650.0,
    totalReferralCommissionEarned: 2400.0,
    balance: 800.0,
    accountBalance: 0.0,
    cashbackBalance: 40.0,
    totalCashbackEarned: 120.0,
    totalSpent: 5100.0,
    totalOrders: 8,
    maxSingleOrderAmount: 2500.0,
    loyaltyTier: 'normal',
    purchasingPower: 'strong',
    favoriteGame: 'Free Fire',
    lastPurchaseDate: '2026-08-27T18:40:00Z',
    hasUsedFirstOrderDiscount: true,
    isArchived: false,
    notesCount: 1,
    ticketsCount: 8,
    createdAt: '2026-04-01T09:15:00.000Z',
    updatedAt: '2026-08-27T18:40:00.000Z'
  },
  {
    id: 'cust_5',
    code: 'JKR-1005',
    name: 'كريم وائل المنصوري',
    phone: '01555443322',
    profileType: 'regular',
    source: 'facebook',
    status: 'active',
    isFrozen: false,
    referredByCode: 'REF-JKR-1001',
    referredByName: 'حسين علي الركابي',
    referredAt: '2026-08-15T10:00:00Z',
    monthlyReferredCount: 0,
    partnerWarningCount: 0,
    referralCode: 'REF-JKR-1005',
    referralWalletBalance: 0.0,
    totalReferralCommissionEarned: 0.0,
    balance: 85.0,
    accountBalance: 0.0,
    cashbackBalance: 5.0,
    totalCashbackEarned: 5.0,
    totalSpent: 450.0,
    totalOrders: 3,
    maxSingleOrderAmount: 250.0,
    loyaltyTier: 'normal', // 1 - 9 تذاكر
    purchasingPower: 'normal', // 0 - 499 ج
    favoriteGame: 'Brawl Stars',
    lastPurchaseDate: '2026-08-25T15:00:00Z',
    hasUsedFirstOrderDiscount: false,
    isArchived: false,
    notesCount: 0,
    ticketsCount: 3,
    createdAt: '2026-08-15T10:00:00.000Z',
    updatedAt: '2026-08-25T15:00:00.000Z'
  }
];

export const initialNotes: CustomerNote[] = [
  {
    id: 'note_1',
    customerId: 'cust_1',
    authorName: 'أحمد السعدي',
    authorRole: 'مسؤول الشحن',
    content: 'العميل يفضل شحن جواهر فري فاير على الـ ID المباشر 5599881122 في المساء.',
    type: 'general',
    createdAt: '2026-08-10T12:00:00.000Z'
  },
  {
    id: 'note_2',
    customerId: 'cust_2',
    authorName: 'المدير العام',
    authorRole: 'المالك',
    content: 'شريك معتمد وممتاز، حقق تارجت 14 عميل جديد هذا الشهر وتمت ترقية عمولته إلى 2%.',
    type: 'financial',
    createdAt: '2026-08-25T15:30:00.000Z'
  },
  {
    id: 'note_3',
    customerId: 'cust_3',
    authorName: 'أحمد السعدي',
    authorRole: 'مسؤول الشحن',
    content: 'محل تجاري معتمد، يطلب سندات شحن مجمعة لكروت بلايستيشن وببجي.',
    type: 'followup',
    createdAt: '2026-08-28T09:30:00.000Z'
  }
];

export const initialTickets: CustomerTicket[] = [
  {
    id: 'tkt_101',
    ticketNumber: 'JKR-2026-0001',
    customerId: 'cust_1',
    customerName: 'حسين علي الركابي',
    customerPhone: '01012345678',
    ticketType: 'regular',
    items: [
      {
        id: 'item_1',
        gameId: 'game_ff',
        gameName: 'Free Fire',
        sectionId: 'sec_ff_1',
        sectionName: 'جواهر الشحن الفوري',
        productId: 'prod_ff_3',
        productName: 'شحن 1080 جوهرة فري فاير',
        playerGameId: '5599881122',
        quantity: 1,
        unitPrice: 350.0,
        totalPrice: 350.0,
        costPrice: 310.0,
        walletTypeId: 'w_inv_1'
      }
    ],
    gameName: 'Free Fire',
    gameSection: 'جواهر الشحن الفوري',
    gameProductName: 'شحن 1080 جوهرة فري فاير',
    playerGameId: '5599881122',
    requiredAmount: 350.0,
    totalProductsAmount: 350.0,
    totalCostAmount: 310.0,
    totalProfitMargin: 40.0,
    receivedAmount: 350.0,
    overpaymentAmount: 0.0,
    isOverpaymentApproved: false,
    paymentWallet: 'فودافون كاش - تشغيل 1',
    paymentGateway: 'Vodafone Cash',
    transferReferenceNumber: 'VF-99881122',
    cashbackUsed: 10.0,
    cashbackEarned: 3.5, // 1%
    isFirstOrderDiscountApplied: false,
    status: 'completed',
    title: 'شحن 1080 جوهرة فري فاير فوري',
    notes: 'تم التسليم والتحقق من حساب اللاعب بنجاح',
    calculatorModeUsed: true,
    assignedTo: 'أحمد السعدي',
    createdAt: '2026-08-28T11:00:00.000Z',
    updatedAt: '2026-08-28T11:05:00.000Z',
    completedAt: '2026-08-28T11:05:00.000Z'
  },
  {
    id: 'tkt_102',
    ticketNumber: 'JKR-2026-0002',
    customerId: 'cust_5',
    customerName: 'كريم وائل المنصوري',
    customerPhone: '01555443322',
    ticketType: 'first_shipping',
    items: [
      {
        id: 'item_2',
        gameId: 'game_pubg',
        gameName: 'PUBG Mobile',
        sectionId: 'sec_pubg_1',
        sectionName: 'شدات ببجي العالمية',
        productId: 'prod_pubg_2',
        productName: 'شحن 660 شدة PUBG UC',
        playerGameId: '5123456789',
        quantity: 1,
        unitPrice: 220.0,
        totalPrice: 220.0,
        costPrice: 200.0,
        walletTypeId: 'w_inv_2'
      }
    ],
    gameName: 'PUBG Mobile',
    gameSection: 'شدات ببجي العالمية',
    gameProductName: 'شحن 660 شدة PUBG UC',
    playerGameId: '5123456789',
    requiredAmount: 220.0,
    totalProductsAmount: 220.0,
    totalCostAmount: 200.0,
    totalProfitMargin: 20.0,
    receivedAmount: 250.0,
    overpaymentAmount: 30.0, // زيادة في الدفع
    isOverpaymentApproved: false,
    paymentWallet: 'إنستاباي / فودافون كاش',
    paymentGateway: 'InstaPay',
    transferReferenceNumber: 'IP-55443322',
    cashbackUsed: 0.0,
    cashbackEarned: 2.2,
    isFirstOrderDiscountApplied: true, // كوبون أول شحنة بسعر التكلفة
    status: 'new',
    title: 'شحن 660 شدة ببجي - أول شحنة للمُحال',
    notes: 'العميل قام بدفع 250 ج بدلاً من 220 ج وتم تحويل 30 ج لرصيده الدائن',
    calculatorModeUsed: true,
    assignedTo: 'أحمد السعدي',
    createdAt: '2026-08-29T08:45:00.000Z',
    updatedAt: '2026-08-29T08:45:00.000Z'
  }
];

export const initialReferrals: CustomerReferral[] = [
  {
    id: 'ref_1',
    referrerCustomerId: 'cust_1',
    referrerCode: 'REF-JKR-1001',
    referredCustomerId: 'cust_5',
    referredCustomerName: 'كريم وائل المنصوري',
    referredCustomerPhone: '01555443322',
    referredAt: '2026-08-15T10:00:00Z',
    daysRemaining: 16, // 30 - 14 days
    isExpired: false,
    totalCommissionFromReferral: 4.5,
    hasMadeFirstOrder: true,
    isFrozen: false,
    createdAt: '2026-08-15T10:00:00.000Z'
  }
];

export const initialUnifiedWalletTransactions: UnifiedWalletTransaction[] = [
  {
    id: 'wtx_1',
    customerId: 'cust_1',
    walletType: 'cashback',
    type: 'earned',
    operationName: 'تذكرة شحن #JKR-2026-0001',
    amount: 3.5,
    balanceAfter: 25.0,
    orderNumber: 'JKR-2026-0001',
    createdAt: '2026-08-28T11:05:00.000Z'
  },
  {
    id: 'wtx_2',
    customerId: 'cust_1',
    walletType: 'referral',
    type: 'commission',
    operationName: 'عمولة إحالة من تذكرة #JKR-2026-0002',
    amount: 4.5,
    balanceAfter: 45.0,
    orderNumber: 'JKR-2026-0002',
    createdAt: '2026-08-29T08:45:00.000Z'
  },
  {
    id: 'wtx_3',
    customerId: 'cust_1',
    walletType: 'account_balance',
    type: 'credit',
    operationName: 'رصيد دائن مرحل من دفعات سابقة',
    amount: 50.0,
    balanceAfter: 50.0,
    createdAt: '2026-08-27T10:00:00.000Z'
  }
];

export const initialCustomerTransactions: CustomerTransaction[] = [
  {
    id: 'ctx_1',
    customerId: 'cust_1',
    type: 'purchase',
    amount: 350.0,
    balanceBefore: 800.0,
    balanceAfter: 450.0,
    description: 'شحن 1080 جوهرة فري فاير (تذكرة #JKR-2026-0001)',
    referenceId: 'tkt_101',
    performedBy: 'أحمد السعدي',
    createdAt: '2026-08-28T11:05:00.000Z'
  }
];

export const initialSafeTransactions: SafeTransaction[] = [
  {
    id: 'safe_1',
    type: 'cash_in',
    amount: 25000.0,
    category: 'capital',
    description: 'رأس مال الخزنة الافتتاحي للتشغيل',
    balanceAfter: 25000.0,
    performedBy: 'المدير العام (Owner)',
    createdAt: '2026-01-01T08:00:00.000Z'
  }
];

export const initialExpenses: Expense[] = [
  {
    id: 'exp_1',
    title: 'فاتورة إنترنت فايبر فائق السرعة',
    category: 'utilities',
    amount: 850.0,
    paymentMethod: 'vodafone_cash',
    paidFromVault: true,
    approvedBy: 'مصطفى الكرخي',
    receiptNumber: 'REC-NET-2026-01',
    notes: 'خط الفايبر المخصص لسيرفرات الشحن',
    date: '2026-08-01',
    isArchived: false,
    createdAt: '2026-08-01T10:00:00.000Z'
  }
];

export const initialDebts: Debt[] = [
  {
    id: 'debt_1',
    partyType: 'supplier',
    partyName: 'موزع كروت الشحن الدولي (Razer Gold Partner)',
    debtType: 'payable',
    totalAmount: 15000.0,
    paidAmount: 12000.0,
    remainingAmount: 3000.0,
    dueDate: '2026-09-15',
    status: 'partially_paid',
    installments: [
      {
        id: 'inst_1',
        debtId: 'debt_1',
        amount: 12000.0,
        paymentDate: '2026-08-10T14:00:00Z',
        paidBy: 'المدير العام',
        receiptNumber: 'RC-RAZER-01',
        notes: 'دفعة سداد حساب الشحنات السابقة'
      }
    ],
    notes: 'شحنة كروت شحن دولية مجمعة',
    isArchived: false,
    createdAt: '2026-07-01T08:00:00.000Z'
  }
];

export const initialSettlements: ShiftSettlement[] = [];
export const initialAttendance: AttendanceRecord[] = [];
export const initialSalaries: SalarySlip[] = [];

export const initialEmployees: Employee[] = [
  {
    id: 'emp_1',
    employeeCode: 'EMP-001',
    fullName: 'أحمد محمود',
    phone: '01012345678',
    department: 'قسم الزبائن (المفرق)',
    jobTitle: 'مسؤول مبيعات وتنفيذ تذاكر',
    baseSalary: 6500,
    hireDate: '2026-01-15',
    status: 'active',
    createdAt: '2026-01-15T09:00:00.000Z'
  },
  {
    id: 'emp_2',
    employeeCode: 'EMP-002',
    fullName: 'سارة إبراهيم',
    phone: '01123456789',
    department: 'قسم التجار',
    jobTitle: 'مشرف حسابات التجار والموزعين',
    baseSalary: 7500,
    hireDate: '2026-02-01',
    status: 'active',
    createdAt: '2026-02-01T09:00:00.000Z'
  },
  {
    id: 'emp_3',
    employeeCode: 'EMP-003',
    fullName: 'محمد حسن',
    phone: '01234567890',
    department: 'قسم المالية',
    jobTitle: 'محاسب مالي ومسؤول الخزينة',
    baseSalary: 8500,
    hireDate: '2026-01-01',
    status: 'active',
    createdAt: '2026-01-01T09:00:00.000Z'
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'audit_1',
    userId: 'usr_admin',
    userName: 'المدير العام (Owner)',
    userRole: 'admin',
    department: 'general',
    actionType: 'setting_change',
    entityType: 'settings',
    entityId: 'sys_settings',
    entityTitle: 'إعدادات النظام',
    details: 'تهيئة إعدادات منظومة NZM JKR Top Up ERP الاحترافية',
    timestamp: '2026-01-01T08:00:00.000Z'
  }
];

export const initialNotifications: NotificationItem[] = [
  {
    id: 'notif_1',
    title: 'جاهزية النظام للمرحلة الثانية',
    message: 'تم تفعيل التحديثات المتقدمة لقسم الزبائن والتذاكر متعددة المنتجات.',
    type: 'success',
    isRead: false,
    timestamp: new Date().toISOString()
  }
];
