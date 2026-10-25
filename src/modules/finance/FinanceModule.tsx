import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useHistory } from '../../context/HistoryContext';
import { useNotifications } from '../../context/NotificationContext';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import {
  SafeTransaction,
  Expense,
  Debt,
  ShiftSettlement,
  AttendanceRecord,
  SalarySlip,
  FinanceMetrics,
  ExpenseCategory,
  SafeCategory,
  DebtType,
  UnifiedFinanceFilter,
  UnifiedFinancialTransaction
} from '../../types/finance.types';
import {
  Wallet,
  TrendingUp,
  Receipt,
  Scale,
  Gift,
  CalendarCheck,
  CheckCircle2,
  FileText,
  CreditCard,
  Building
} from 'lucide-react';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';
import { ReportTemplateType } from '../../services/reporting/reportTypes';
import { DepositVoucherModal } from './DepositVoucherModal';
import { useLayoutOrder } from '../../context/LayoutOrderContext';
import { SortableDraggableItem } from '../../components/common/SortableDraggableItem';
import { formatCurrency } from '../../utils/formatters';

// Dedicated Subcomponents
import { FinanceOverview } from './FinanceOverview';
import { FinanceVault } from './FinanceVault';
import { FinanceWallets } from './FinanceWallets';
import { FinanceExpenses } from './FinanceExpenses';
import { FinanceDebts } from './FinanceDebts';
import { FinanceCommissions } from './FinanceCommissions';
import { FinancePayroll } from './FinancePayroll';
import { FinanceSettlements } from './FinanceSettlements';
import { FinanceReports } from './FinanceReports';

export type FinanceTabType =
  | 'overview'
  | 'vault'
  | 'wallets'
  | 'expenses'
  | 'debts'
  | 'cashback_commissions'
  | 'attendance_salaries'
  | 'settlements'
  | 'reports';

interface FinanceModuleProps {
  initialTab?: FinanceTabType;
  subSection?: string;
}

export const FinanceModule: React.FC<FinanceModuleProps> = ({
  initialTab,
  subSection
}) => {
  const { user } = useAuth();
  const { pushAction } = useHistory();
  const { showToast } = useNotifications();
  const { getOrderedItems } = useLayoutOrder();

  // Determine active tab from prop or subSection
  const resolveTab = (sub?: string, init?: FinanceTabType): FinanceTabType => {
    if (init) return init;
    if (sub) {
      if (sub === 'finance_vault') return 'vault';
      if (sub === 'finance_wallets') return 'wallets';
      if (sub === 'finance_expenses') return 'expenses';
      if (sub === 'finance_debts') return 'debts';
      if (sub === 'finance_commissions') return 'cashback_commissions';
      if (sub === 'finance_payroll') return 'attendance_salaries';
      if (sub === 'finance_settlements') return 'settlements';
      if (sub === 'finance_reports') return 'reports';
    }
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<FinanceTabType>(() => resolveTab(subSection, initialTab));

  useEffect(() => {
    const resolved = resolveTab(subSection, initialTab);
    setActiveTab(resolved);
  }, [subSection, initialTab]);

  // Unified Filter State (Single Source of Truth)
  const [filter, setFilter] = useState<UnifiedFinanceFilter>({
    datePreset: 'all',
    customStartDate: '',
    customEndDate: '',
    department: 'all',
    gameName: 'all',
    planId: 'all',
    personQuery: '',
    searchQuery: '',
    employeeId: 'all',
    transactionType: 'all',
    walletId: 'all',
    status: 'all'
  });

  // Core data states
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [unifiedTransactions, setUnifiedTransactions] = useState<UnifiedFinancialTransaction[]>([]);
  const [vaultTransactions, setVaultTransactions] = useState<SafeTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settlements, setSettlements] = useState<ShiftSettlement[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [salaries, setSalaries] = useState<SalarySlip[]>([]);

  // Modals state
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultTxType, setVaultTxType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [vaultAmount, setVaultAmount] = useState<number>(0);
  const [vaultCategory, setVaultCategory] = useState<SafeCategory>('sales');
  const [vaultDesc, setVaultDesc] = useState('');

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('operations');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState('نقدية من الخزنة');
  const [expensePaidFromVault, setExpensePaidFromVault] = useState(true);
  const [expenseReceiptNo, setExpenseReceiptNo] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtPartyName, setDebtPartyName] = useState('');
  const [debtPartyPhone, setDebtPartyPhone] = useState('');
  const [debtType, setDebtType] = useState<DebtType>('receivable');
  const [debtTotalAmount, setDebtTotalAmount] = useState<number>(0);
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtNotes, setDebtNotes] = useState('');

  const [isDepositVoucherOpen, setIsDepositVoucherOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTemplateType, setReportTemplateType] = useState<ReportTemplateType>('dashboard');

  // Load and refresh all finance data
  const loadAllFinanceData = useCallback(() => {
    setMetrics(db.getFinanceMetrics(filter));
    setUnifiedTransactions(db.getUnifiedTransactions(filter));
    setVaultTransactions(db.getSafeTransactions());
    setExpenses(db.getExpenses(false));
    setDebts(db.getDebts(false));
    setSettlements(db.getShiftSettlements());
    setAttendance(db.getAttendanceRecords());
    setSalaries(db.getSalarySlips());
  }, [filter]);

  useEffect(() => {
    loadAllFinanceData();

    // Event Bus live auto-refresh
    const unsubTx = eventBus.subscribe(SYSTEM_EVENTS.TRANSACTION_RECORDED, loadAllFinanceData);
    const unsubVault = eventBus.subscribe(SYSTEM_EVENTS.VAULT_UPDATED, loadAllFinanceData);
    const unsubExpense = eventBus.subscribe(SYSTEM_EVENTS.EXPENSE_ADDED, loadAllFinanceData);
    const unsubDebt = eventBus.subscribe(SYSTEM_EVENTS.DEBT_UPDATED, loadAllFinanceData);
    const unsubCustomer = eventBus.subscribe(SYSTEM_EVENTS.CUSTOMER_CREATED, loadAllFinanceData);
    const unsubWallet = eventBus.subscribe(SYSTEM_EVENTS.WALLET_MUTATED, loadAllFinanceData);

    return () => {
      unsubTx();
      unsubVault();
      unsubExpense();
      unsubDebt();
      unsubCustomer();
      unsubWallet();
    };
  }, [loadAllFinanceData]);

  // Safe / Vault Transaction Execution
  const handleVaultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vaultAmount <= 0) {
      showToast('error', 'خطأ', 'يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    if (vaultTxType === 'cash_out') {
      const currentVaultBalance = metrics?.vaultBalance || db.getVaultBalance();
      if (vaultAmount > currentVaultBalance) {
        showToast('error', 'رصيد الخزينة غير كافٍ', `الرصيد المتاح حالياً بالخزينة (${formatCurrency(currentVaultBalance, 'EGP')}) لا يكفي لسحب ${formatCurrency(vaultAmount, 'EGP')}`);
        return;
      }
    }

    const tx = db.addSafeTransaction(
      vaultTxType,
      vaultAmount,
      vaultCategory,
      vaultDesc || (vaultTxType === 'cash_in' ? 'إيداع يدوي في الخزنة' : 'سحب يدوي من الخزنة'),
      user?.fullName || 'المسؤول'
    );

    db.logAction(
      { id: user?.id || 'sys', name: user?.fullName || 'مستخدم', role: user?.role || 'user', department: 'المالية' },
      'vault_transaction',
      'الخزنة',
      tx.id,
      `${vaultTxType === 'cash_in' ? 'إيداع' : 'سحب'} بمبلغ ${vaultAmount} ج.م`,
      vaultDesc
    );

    showToast('success', 'تمت العملية', `تم تسجيل عملية ${vaultTxType === 'cash_in' ? 'الإيداع' : 'السحب'} بنجاح`);
    setIsVaultModalOpen(false);
    setVaultAmount(0);
    setVaultDesc('');
    loadAllFinanceData();
  };

  // Expense Execution
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || expenseAmount <= 0) {
      showToast('error', 'خطأ', 'يرجى إدخال عنوان ومبلغ المصروف بشكل صحيح');
      return;
    }

    const exp = db.addExpense(
      {
        title: expenseTitle.trim(),
        category: expenseCategory,
        amount: expenseAmount,
        paidFromVault: expensePaidFromVault,
        paymentMethod: expensePaymentMethod,
        receiptNumber: expenseReceiptNo || undefined,
        notes: expenseNotes || undefined,
        approvedBy: user?.fullName || 'المدير العام',
        date: new Date().toISOString().split('T')[0]
      },
      user?.fullName || 'المسؤول'
    );

    db.logAction(
      { id: user?.id || 'sys', name: user?.fullName || 'مستخدم', role: user?.role || 'user', department: 'المالية' },
      'add',
      'مصروف',
      exp.id,
      `مصروف: ${expenseTitle}`,
      `المبلغ: ${expenseAmount} (${expensePaymentMethod})`
    );

    showToast('success', 'تم تسجيل المصروف', `تم قيد المصروف بقيمة ${expenseAmount} ج.م`);

    const savedExp = { ...exp };
    pushAction(
      `تسجيل مصروف (${expenseTitle} - ${expenseAmount} ج)`,
      () => {
        db.deleteExpense(savedExp.id);
        loadAllFinanceData();
      },
      () => {
        db.saveExpense(savedExp);
        loadAllFinanceData();
      }
    );

    setIsExpenseModalOpen(false);
    setExpenseTitle('');
    setExpenseAmount(0);
    setExpenseReceiptNo('');
    setExpenseNotes('');
    loadAllFinanceData();
  };

  // Create Debt
  const handleDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtPartyName.trim() || debtTotalAmount <= 0) {
      showToast('error', 'خطأ', 'يرجى إدخال اسم الجهة ومبلغ الدين');
      return;
    }

    const newDebt: Debt = {
      id: 'debt_' + Date.now(),
      partyType: 'external',
      partyName: debtPartyName.trim(),
      partyPhone: debtPartyPhone || undefined,
      debtType,
      totalAmount: debtTotalAmount,
      paidAmount: 0,
      remainingAmount: debtTotalAmount,
      dueDate: debtDueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'unpaid',
      notes: debtNotes || undefined,
      installments: [],
      createdAt: new Date().toISOString(),
      isArchived: false
    };

    db.saveDebt(newDebt);

    db.logAction(
      { id: user?.id || 'sys', name: user?.fullName || 'مستخدم', role: user?.role || 'user', department: 'المالية' },
      'add',
      'دين',
      newDebt.id,
      `تسجيل دين جديد: ${debtPartyName}`,
      `النوع: ${debtType === 'receivable' ? 'مستحق لنا' : 'التزام علينا'} بمبلغ ${debtTotalAmount} ج.م`
    );

    showToast('success', 'تم تسجيل الدين', `تم إنشاء قيد الدين للجهة ${debtPartyName}`);
    setIsDebtModalOpen(false);
    setDebtPartyName('');
    setDebtPartyPhone('');
    setDebtTotalAmount(0);
    setDebtNotes('');
    loadAllFinanceData();
  };

  // Record Debt Payment
  const handleDebtPayment = (debtId: string, amount: number, notes?: string) => {
    db.addDebtInstallment(debtId, amount, user?.fullName || 'المسؤول', notes);
    showToast('success', 'تم تسجيل السداد', `تم سداد دفعة بقيمة ${amount} ج.م بنجاح`);
    loadAllFinanceData();
  };

  // Pay Salary
  const handlePaySalary = (slipId: string) => {
    db.paySalarySlip(slipId, 'نقدية من الخزنة', user?.fullName || 'المسؤول');
    showToast('success', 'تم صرف الراتب', 'تم اعتماد وصرف الراتب وخصمه من الحسابات');
    loadAllFinanceData();
  };

  // Verify Shift Settlement
  const handleVerifySettlement = (id: string) => {
    db.verifyShiftSettlement(id, user?.fullName || 'المراجع المالي');
    showToast('success', 'تم اعتماد الوردية', 'تمت مطابقة الوردية وتوثيقها رسمياً');
    loadAllFinanceData();
  };

  // Delete Expense
  const handleDeleteExpense = (id: string) => {
    db.deleteExpense(id);
    showToast('info', 'تم حذف المصروف', 'تم حذف قيد المصروف من السجلات');
    loadAllFinanceData();
  };

  // Tab definitions with counts
  const tabsList = useMemo(() => {
    return [
      { id: 'overview' as const, label: 'المركز المالي الشامل', icon: TrendingUp, badge: undefined },
      { id: 'vault' as const, label: 'الخزينة والسيولة النقدية', icon: Wallet, badge: `${vaultTransactions.length}` },
      { id: 'wallets' as const, label: 'المحافظ وحسابات البنوك', icon: CreditCard, badge: undefined },
      { id: 'expenses' as const, label: 'المصروفات والبنود', icon: Receipt, badge: `${expenses.length}` },
      { id: 'debts' as const, label: 'الديون والمستحقات', icon: Scale, badge: `${debts.length}` },
      { id: 'cashback_commissions' as const, label: 'الكاش باك والعمولات', icon: Gift, badge: undefined },
      { id: 'attendance_salaries' as const, label: 'الرواتب والحضور', icon: CalendarCheck, badge: undefined },
      { id: 'settlements' as const, label: 'التسويات والورديات', icon: CheckCircle2, badge: `${settlements.length}` },
      { id: 'reports' as const, label: 'التقارير والقوائم المالية', icon: FileText, badge: 'معتمد' }
    ];
  }, [vaultTransactions.length, expenses.length, debts.length, settlements.length]);

  return (
    <div className="space-y-6 pb-12">
      {/* Dynamic Sub-Navigation Bar */}
      <Card className="p-2 border-gray-200 dark:border-[#27272A] sticky top-0 z-20 backdrop-blur-md bg-white/90 dark:bg-[#141416]/90 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
          {getOrderedItems('finance_tabs', tabsList).map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <SortableDraggableItem
                key={tab.id}
                id={tab.id}
                index={idx}
                containerId="finance_tabs"
                direction="horizontal"
                className="shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id as FinanceTabType)}
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-xs font-black'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-[#202024]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              </SortableDraggableItem>
            );
          })}
        </div>
      </Card>

      {/* Tab 1: Financial Overview & Unified Ledger */}
      {activeTab === 'overview' && (
        <FinanceOverview
          metrics={metrics}
          transactions={unifiedTransactions}
          filter={filter}
          onFilterChange={setFilter}
          onOpenVaultModal={type => {
            setVaultTxType(type);
            setIsVaultModalOpen(true);
          }}
          onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
          onOpenDebtModal={() => setIsDebtModalOpen(true)}
          onOpenDepositVoucher={() => setIsDepositVoucherOpen(true)}
          onOpenReportModal={() => {
            setReportTemplateType('dashboard');
            setIsReportModalOpen(true);
          }}
        />
      )}

      {/* Tab 2: Vault & Cash Desk */}
      {activeTab === 'vault' && (
        <FinanceVault
          vaultBalance={metrics?.vaultBalance || 0}
          transactions={vaultTransactions}
          onOpenVaultModal={type => {
            setVaultTxType(type);
            setIsVaultModalOpen(true);
          }}
          onRefresh={loadAllFinanceData}
        />
      )}

      {/* Tab 3: Wallets & Banking */}
      {activeTab === 'wallets' && (
        <FinanceWallets
          onOpenDepositVoucher={() => setIsDepositVoucherOpen(true)}
        />
      )}

      {/* Tab 4: Operational Expenses */}
      {activeTab === 'expenses' && (
        <FinanceExpenses
          expenses={expenses}
          onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
          onDeleteExpense={handleDeleteExpense}
        />
      )}

      {/* Tab 5: Debts & Receivables */}
      {activeTab === 'debts' && (
        <FinanceDebts
          debts={debts}
          onOpenAddDebtModal={() => setIsDebtModalOpen(true)}
          onRecordPayment={handleDebtPayment}
        />
      )}

      {/* Tab 6: Cashback & Commissions */}
      {activeTab === 'cashback_commissions' && <FinanceCommissions />}

      {/* Tab 7: Payroll & Attendance */}
      {activeTab === 'attendance_salaries' && (
        <FinancePayroll
          attendance={attendance}
          salaries={salaries}
          onPaySalary={handlePaySalary}
          onRefresh={loadAllFinanceData}
        />
      )}

      {/* Tab 8: Settlements & Shift Closures */}
      {activeTab === 'settlements' && (
        <FinanceSettlements
          settlements={settlements}
          onVerifySettlement={handleVerifySettlement}
        />
      )}

      {/* Tab 9: Financial Reports */}
      {activeTab === 'reports' && (
        <FinanceReports
          metrics={metrics}
          onOpenReportModalWithTemplate={template => {
            setReportTemplateType(template);
            setIsReportModalOpen(true);
          }}
        />
      )}

      {/* Modal: Vault Cash Transaction */}
      <Modal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        title={vaultTxType === 'cash_in' ? 'إيداع نقدية في الخزنة' : 'سحب نقدية من الخزنة'}
        subtitle="حركة نقدية فورية تؤثر مباشرة على رصيد الصندوق"
        maxWidth="md"
      >
        <form onSubmit={handleVaultSubmit} className="space-y-4 text-xs text-right">
          <div>
            <label className="block font-bold text-zinc-400 mb-1">المبلغ المطلوب (ج.م) *</label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={vaultAmount || ''}
              onChange={e => setVaultAmount(parseFloat(e.target.value) || 0)}
              required
              autoFocus
              className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-400 mb-1">التصنيف المحاسبي</label>
            <select
              value={vaultCategory}
              onChange={e => setVaultCategory(e.target.value as SafeCategory)}
              className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
            >
              <option value="sales">مبيعات نقدية</option>
              <option value="customer_deposit">إيداع زبون</option>
              <option value="capital">رأس مال / تمويل</option>
              <option value="expense">مصاريف</option>
              <option value="debt_payment">سداد دين</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-zinc-400 mb-1">البيان / سبب الحركة</label>
            <input
              type="text"
              placeholder="مثال: تغذية نقدية للخزنة للعمليات اليومية"
              value={vaultDesc}
              onChange={e => setVaultDesc(e.target.value)}
              className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#27272A]">
            <Button type="button" variant="outline" onClick={() => setIsVaultModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant={vaultTxType === 'cash_in' ? 'success' : 'danger'}>
              تأكيد {vaultTxType === 'cash_in' ? 'الإيداع' : 'السحب'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Expense */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="تسجيل مصروف جديد"
        subtitle="قيد مصروف في الحسابات وخصمه من الخزنة أو المحافظ"
        maxWidth="md"
      >
        <form onSubmit={handleExpenseSubmit} className="space-y-4 text-xs text-right">
          <div>
            <label className="block font-bold text-zinc-400 mb-1">عنوان / بند المصروف *</label>
            <input
              type="text"
              placeholder="مثال: فاتورة الكهرباء والإنترنت لشهر آب"
              value={expenseTitle}
              onChange={e => setExpenseTitle(e.target.value)}
              required
              autoFocus
              className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-400 mb-1">المبلغ (ج.م) *</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={expenseAmount || ''}
                onChange={e => setExpenseAmount(parseFloat(e.target.value) || 0)}
                required
                className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-400 mb-1">التصنيف</label>
              <select
                value={expenseCategory}
                onChange={e => setExpenseCategory(e.target.value as ExpenseCategory)}
                className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
              >
                <option value="operations">تشغيل وسيرفرات</option>
                <option value="utilities">فواتير ومرافق</option>
                <option value="rent">إيجارات</option>
                <option value="marketing">تسويق وإعلانات</option>
                <option value="salaries">رواتب ومكافآت</option>
                <option value="maintenance">صيانة وتطوير</option>
                <option value="supplies">نثريات ومستلزمات</option>
                <option value="other">أخرى</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-400 mb-1">طريقة السداد</label>
              <input
                type="text"
                placeholder="مثال: نقداً من الخزنة"
                value={expensePaymentMethod}
                onChange={e => setExpensePaymentMethod(e.target.value)}
                className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-400 mb-1">رقم الفاتورة / الإيصال</label>
              <input
                type="text"
                placeholder="REC-1024"
                value={expenseReceiptNo}
                onChange={e => setExpenseReceiptNo(e.target.value)}
                className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="deductVault"
              checked={expensePaidFromVault}
              onChange={e => setExpensePaidFromVault(e.target.checked)}
              className="rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
            <label htmlFor="deductVault" className="text-xs font-semibold text-zinc-300 cursor-pointer">
              خصم المبلغ مباشرة من رصيد الخزنة النقدية (Cash Out)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#27272A]">
            <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="danger">
              تسجيل وحفظ المصروف
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Debt */}
      <Modal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        title="تسجيل دين / مستحق جديد"
        subtitle="تسجيل ديون الزبائن أو التزامات الموردين"
        maxWidth="md"
      >
        <form onSubmit={handleDebtSubmit} className="space-y-4 text-xs text-right">
          <div>
            <label className="block font-bold text-zinc-400 mb-1">اسم الجهة أو الشخص المدين *</label>
            <input
              type="text"
              placeholder="مثال: أحمد عبد الله / مورد كروت"
              value={debtPartyName}
              onChange={e => setDebtPartyName(e.target.value)}
              required
              autoFocus
              className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-400 mb-1">رقم الهاتف</label>
              <input
                type="text"
                placeholder="010..."
                value={debtPartyPhone}
                onChange={e => setDebtPartyPhone(e.target.value)}
                className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-400 mb-1">نوع الدين *</label>
              <select
                value={debtType}
                onChange={e => setDebtType(e.target.value as DebtType)}
                className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
              >
                <option value="receivable">🟢 لنا (مستحق على العميل / التاجر)</option>
                <option value="payable">🔴 علينا (التزام للمورد / جهة خارجية)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-400 mb-1">إجمالي المبلغ (ج.م) *</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={debtTotalAmount || ''}
                onChange={e => setDebtTotalAmount(parseFloat(e.target.value) || 0)}
                required
                className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-400 mb-1">تاريخ الاستحقاق المتفق عليه</label>
              <input
                type="date"
                value={debtDueDate}
                onChange={e => setDebtDueDate(e.target.value)}
                className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-zinc-400 mb-1">ملاحظات إضافية</label>
            <input
              type="text"
              placeholder="مثال: دين بضاعة شحن ألعاب، سداد على دفعتين..."
              value={debtNotes}
              onChange={e => setDebtNotes(e.target.value)}
              className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#27272A]">
            <Button type="button" variant="outline" onClick={() => setIsDebtModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
              تسجيل وحفظ الدين
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deposit Voucher Modal */}
      <DepositVoucherModal
        isOpen={isDepositVoucherOpen}
        onClose={() => setIsDepositVoucherOpen(false)}
        onSuccess={loadAllFinanceData}
      />

      {/* Report Generator Modal */}
      <ReportGeneratorModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultTemplateType={reportTemplateType}
      />
    </div>
  );
};
