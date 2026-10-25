export type SafeCategory =
  | 'sales'
  | 'customer_deposit'
  | 'merchant_settlement'
  | 'capital'
  | 'expense'
  | 'refund'
  | 'salary'
  | 'commission'
  | 'cashback'
  | 'debt_payment'
  | 'middleman_commission'
  | 'middleman_payout'
  | 'account_purchase'
  | 'account_sale'
  | 'subscription_sale'
  | 'subscription_renewal'
  | 'subscription_refund'
  | 'currency_exchange'
  | 'shift_settlement'
  | 'wallet_transfer'
  | 'other';

export interface SafeTransaction {
  id: string;
  type: 'cash_in' | 'cash_out' | 'transfer' | 'settlement' | 'exchange';
  exchangeType?: 'buy_usd' | 'sell_usd';
  amount: number;
  balanceAfter: number;
  category: SafeCategory;
  description: string;
  referenceId?: string;
  performedBy: string;
  createdAt: string;
  currency?: 'EGP' | 'USD';
  usdAmount?: number;
  usdExchangeRate?: number;
  egpAmount?: number;
  balanceAfterUSD?: number;
  balanceBefore?: number;
  balanceBeforeUSD?: number;
  operationNumber?: string;
  notes?: string;
  vaultId?: string;
  receiptUrl?: string;
  updatedAt?: string;
}

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'salaries'
  | 'marketing'
  | 'operations'
  | 'maintenance'
  | 'supplies'
  | 'other';

export interface Expense {
  id: string;
  expenseNumber?: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency?: 'EGP' | 'USD';
  usdExchangeRate?: number;
  paidFromVault: boolean;
  vaultId?: string;
  paymentMethod: string;
  department?: string;
  recordedBy?: string;
  notes?: string;
  receiptNumber?: string;
  invoiceNumber?: string;
  attachments?: string[];
  approvedBy: string;
  date: string;
  createdAt: string;
  isArchived: boolean;
}

export type DebtPartyType = 'customer' | 'supplier' | 'external';
export type DebtType = 'receivable' | 'payable'; // receivable: لنا | payable: علينا
export type DebtStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface DebtInstallment {
  id: string;
  debtId: string;
  amount: number;
  currency?: 'EGP' | 'USD';
  paymentDate: string;
  paidBy: string;
  receiptNumber?: string;
  notes?: string;
  balanceAfter?: number;
  paymentMethod?: string;
  type?: 'installment' | 'deposit';
  vaultTransactionId?: string;
  createdAt?: string;
}

export interface Debt {
  id: string;
  partyType: DebtPartyType;
  partyName: string;
  partyPhone?: string;
  partyId?: string;
  debtType: DebtType;
  category?: 'general' | 'equipment';
  equipmentName?: string;
  assetValue?: number;
  currency?: 'EGP' | 'USD';
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: DebtStatus;
  notes?: string;
  installments: DebtInstallment[];
  createdAt: string;
  isArchived: boolean;
  depositToVault?: boolean;
  vaultTransactionId?: string;
  depositDate?: string;
}

export interface ShiftDeficitItem {
  id: string;
  shiftId?: string;
  walletId: string;
  walletName: string;
  phoneNumberId?: string;
  phoneNumber?: string;
  deficitAmount: number; // قيمة العجز بالجنيه
  expectedBalance?: number;
  actualBalance?: number;
  employeeId?: string;
  employeeName?: string;
  reason?: string;
  reportedAt: string;
  status: 'pending_review' | 'resolved_deducted' | 'resolved_store_loss' | 'resolved_adjusted';
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ShiftProfitDistribution {
  ownerSharePercent: number;
  ownerShareAmount: number;
  partnerSharePercent: number;
  partnerShareAmount: number;
  reserveSharePercent: number;
  reserveShareAmount: number;
}

export interface ShiftWalletBreakdownItem {
  walletId: string;
  walletName: string;
  accountNumber?: string;
  totalReceivedInShift: number;
  currentBalance: number;
  numbersBreakdown: {
    numberId: string;
    phoneNumber: string;
    accountHolderName?: string;
    receivedInShift: number;
    currentBalance: number;
    monthlyLimit: number;
    monthlyReceived: number;
  }[];
}

export interface ShiftWalletTransferRecord {
  id: string;
  sourceWalletId: string;
  sourceWalletName: string;
  destination: string;
  destinationVaultId?: string;
  amount: number;
  currency: 'EGP' | 'USD';
  safeTransactionId?: string;
  walletTransactionId?: string;
  transferredAt: string;
  notes?: string;
}

export interface ShiftSettlement {
  id: string;
  shiftNumber: string;
  employeeId: string;
  employeeName: string;
  department: string;
  startTime: string;
  endTime: string;
  expectedCash: number;
  actualCash: number;
  difference: number;
  variance?: number; // Alias for difference
  shiftType?: string;
  systemExpectedCash?: number;
  actualCashHandover?: number;
  notes?: string;
  status: 'open' | 'closed' | 'verified' | 'shortage' | 'surplus';
  createdAt: string;
  // Extended Shift Settlement fields
  totalRevenue?: number;
  totalCost?: number;
  totalProfit?: number;
  usdtRate?: number;
  profitInUSDT?: number;
  deficits?: ShiftDeficitItem[];
  profitDistribution?: ShiftProfitDistribution;
  walletsSnapshot?: ShiftWalletBreakdownItem[];
  closedBy?: string;
  closedAt?: string;
  // Destination and Financial Vault integration
  destination?: string;
  destinationVaultId?: string;
  totalTransferredEGP?: number;
  totalTransferredUSDT?: number;
  transfers?: ShiftWalletTransferRecord[];
  safeTransactionIds?: string[];
  ticketIds?: string[]; // قائمة معرفات التذاكر المسواة في هذه الوردية
}

export interface EmployeeAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

export interface EmployeeAdvanceRepayment {
  id: string;
  advanceId: string;
  amount: number;
  date: string;
  time?: string;
  notes?: string;
  recordedBy?: string;
  recordedAt?: string;
}

export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  amount: number;
  requestDate: string;
  requestTime?: string;
  disbursedDate?: string;
  disbursedTime?: string;
  status: 'pending' | 'disbursed' | 'repaid';
  repaidAmount: number;
  reason: string;
  notes?: string;
  disbursedFromVault: boolean;
  vaultTxId?: string;
  createdAt?: string;
  repayments?: EmployeeAdvanceRepayment[];
}

export interface EmployeeDeduction {
  id: string;
  employeeId: string;
  amount: number;
  calculationType?: 'days' | 'amount';
  daysCount?: number;
  reason: string;
  date: string;
  time?: string;
  month: string; // YYYY-MM
  createdAt?: string;
}

export interface EmployeeIncentive {
  id: string;
  employeeId: string;
  amount: number;
  calculationType?: 'days' | 'amount';
  daysCount?: number;
  type: 'reward' | 'incentive' | 'overtime' | 'bonus';
  date: string;
  time?: string;
  reason: string;
  month: string; // YYYY-MM
  createdAt?: string;
}

export interface DailyClosureReport {
  id: string;
  date: string; // YYYY-MM-DD
  closedAt: string;
  closedBy: string;
  openingBalanceEGP: number;
  closingBalanceEGP: number;
  totalIncomeEGP: number;
  totalExpensesEGP: number;
  netEGP: number;
  openingBalanceUSD: number;
  closingBalanceUSD: number;
  avgUsdPurchaseRate: number;
  totalTransactionsCount: number;
  notes?: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  phone: string;
  nationalId?: string;
  address?: string;
  department: string;
  job?: string;
  jobTitle: string;
  baseSalary: number;
  dailyRate?: number;
  salaryPayoutDay?: number; // 1-31
  hireDate: string;
  status: 'active' | 'on_leave' | 'inactive';
  workStartTime?: string; // e.g. "09:00"
  workEndTime?: string;   // e.g. "17:00"

  notes?: string;
  advances?: EmployeeAdvance[];
  incentives?: EmployeeIncentive[];
  deductions?: EmployeeDeduction[];
  attachments?: EmployeeAttachment[];
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  workHours: number;
  status: 'present' | 'late' | 'absent' | 'leave';
  penaltyHours?: number;
  penaltyDays?: number;
  deductionAmount?: number;
  bonusHours?: number;
  isCheckInLate?: boolean;
  isCheckOutEarly?: boolean;
  notes?: string;
  absenceTime?: string;
  leaveTime?: string;
  recordedAt?: string;
  leaveStartDate?: string;
  leaveEndDate?: string;
  leaveDays?: number;
  leaveType?: string;
}

export interface SalarySlip {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  month: string; // YYYY-MM
  baseSalary: number;
  bonuses: number;
  incentives?: number;
  advances?: number;
  deductions: number;
  totalSalary: number;
  isPaid: boolean;
  status?: 'pending' | 'ready' | 'paid' | 'partially_paid' | 'adjusted';
  paidAt?: string;
  paidBy?: string;
  paymentMethod?: string;
  vaultTxId?: string;
  notes?: string;
  eligibleDays?: number;
  presentDays?: number;
  absentDays?: number;
  leaveDays?: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  totalMonthDays?: number;
  dailyRate?: number;
  earnedBaseSalary?: number;
  breakdown?: {
    dailyRate: number;
    eligibleDays: number;
    earnedBaseSalary: number;
    bonusesList?: Array<{ reason: string; amount: number; date?: string; recordedBy?: string }>;
    deductionsList?: Array<{ reason: string; amount: number; date?: string; recordedBy?: string }>;
    advancesDeducted?: number;
  };
}

export interface DepartmentFinancialBreakdown {
  departmentId: string;
  departmentName: string;
  revenue: number;
  cost: number;
  netProfit: number;
  transactionsCount: number;
  percentageOfTotalRevenue: number;
  percentageOfTotalProfit: number;
  color: string;
  badge: string;
}

export type UnifiedFinanceDatePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'custom';
export type UnifiedFinanceDepartment = 'all' | 'customers' | 'dealers' | 'middleman' | 'subscriptions' | 'treasury' | 'wallets';
export type UnifiedFinanceTxType =
  | 'all'
  | 'sale'
  | 'purchase'
  | 'topup'
  | 'refund'
  | 'transfer'
  | 'cashback'
  | 'referral'
  | 'middleman'
  | 'subscription'
  | 'renewal'
  | 'commission'
  | 'expense'
  | 'debt_payment'
  | 'settlement'
  | 'wallet_deposit'
  | 'wallet_withdrawal'
  | 'wallet_transfer'
  | 'merchant_settlement'
  | 'bond_deposit'
  | 'other';

export interface UnifiedFinanceFilter {
  datePreset: UnifiedFinanceDatePreset;
  customStartDate?: string;
  customEndDate?: string;
  department: UnifiedFinanceDepartment;
  gameName?: string;
  planId?: string;
  personQuery?: string;
  searchQuery?: string;
  employeeId?: string;
  transactionType: UnifiedFinanceTxType;
  walletId?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface UnifiedFinancialTransaction {
  id: string;
  createdAt: string;
  department: 'customers' | 'dealers' | 'middleman' | 'subscriptions' | 'treasury' | 'wallets' | 'system';
  departmentNameArabic: string;
  type: UnifiedFinanceTxType;
  typeLabelArabic: string;
  category: SafeCategory | string;
  amount: number;
  costAmount?: number;
  netProfit?: number;
  currency: 'EGP' | 'USD';
  referenceId?: string;
  referenceNumber?: string;
  gameName?: string;
  planName?: string;
  partyId?: string;
  partyName?: string;
  partyPhone?: string;
  partyType?: 'customer' | 'dealer' | 'middleman' | 'supplier' | 'employee' | 'wallet' | 'other';
  performedBy?: {
    id?: string;
    name?: string;
    role?: string;
  };
  walletId?: string;
  walletName?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  status: 'completed' | 'refunded' | 'canceled' | 'pending';
  notes?: string;
  description: string;
}

export interface FinanceMetrics {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  vaultBalance: number;
  totalDebtsReceivable: number;
  totalDebtsPayable: number;
  totalCashbackPaid: number;
  totalReferralCommissionPaid: number;
  totalExternalCommissionPaid?: number;
  totalDiscounts?: number;
  totalRefunds?: number;
  totalTransfersVolume?: number;
  totalWalletsBalance?: number;
  monthlyExpenses: number;

  // Counts & Volume Metrics
  totalOperationsCount?: number;
  completedOrdersCount?: number;
  pendingOperationsCount?: number;
  problemOperationsCount?: number;
  refundedOperationsCount?: number;
  customersCount?: number;
  dealersCount?: number;
  subscriptionsCount?: number;
  dealsCount?: number;
  soldAccountsCount?: number;
  newCustomersCount?: number;

  // Subscription lifecycle
  activeSubscriptionsCount?: number;
  expiredSubscriptionsCount?: number;
  expiringSubscriptionsCount?: number;
  renewedSubscriptionsCount?: number;
  cancelledSubscriptionsCount?: number;

  // Middleman specifics
  completedDealsCount?: number;
  pendingDealsCount?: number;
  cancelledDealsCount?: number;
  availableAccountsCount?: number;
  totalAccountsPurchaseCost?: number;
  totalAccountsSalesRevenue?: number;
  totalAccountsProfit?: number;

  // Real Multi-Department Integrations
  customerRevenue?: number;
  customerCost?: number;
  customerProfit?: number;
  customerTxCount?: number;
  customerCashback?: number;
  customerReferrals?: number;
  customerRefunds?: number;
  customerDiscounts?: number;

  dealerRevenue?: number;
  dealerCost?: number;
  dealerProfit?: number;
  dealerTxCount?: number;

  middlemanRevenue?: number;
  middlemanCost?: number;
  middlemanProfit?: number;
  middlemanTxCount?: number;
  middlemanCompanyCommission?: number;
  middlemanExternalCommission?: number;

  subscriptionsRevenue?: number;
  subscriptionsCost?: number;
  subscriptionsProfit?: number;
  subscriptionsTxCount?: number;
  subscriptionsRefunds?: number;
  subscriptionsDiscounts?: number;

  departmentBreakdowns?: DepartmentFinancialBreakdown[];
}

export type WalletType = 'main' | 'referral' | 'cashback';

export interface BalanceWithdrawalItem {
  id: string;
  walletType: WalletType;
  walletName: string; // المحفظة الأساسية / محفظة الإحالة / محفظة الكاش باك
  walletLabel?: string; // alias
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
}

export interface BalanceWithdrawal {
  id: string; // e.g. WD-12345
  partyType: 'customer' | 'dealer';
  partyId: string;
  partyCode: string;
  partyName: string;
  partyPhone: string;
  recipientPhone?: string; // الرقم المستقبل (اختياري - في حال التحويل لرقم آخر)
  paymentMethod?: string; // كاش / فودافون كاش / انستاباي / تحويل بنكي
  totalAmount: number;
  notes?: string;
  recordedBy: string; // اسم الموظف الذي سلّم / نفّذ السحب
  employeeName?: string; // alias for recordedBy
  createdAt: string; // ISO datetime
  status: 'completed' | 'cancelled';
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  items: BalanceWithdrawalItem[];
}

