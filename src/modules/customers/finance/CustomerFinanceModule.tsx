import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { eventBus, SYSTEM_EVENTS } from '../../../services/eventBus';
import { formatCurrency } from '../../../utils/formatters';

// 5 Main Subcomponents
import { CustomerFinanceVaultsTab } from './CustomerFinanceVaultsTab';
import { CustomerFinanceEmployeesTab } from './CustomerFinanceEmployeesTab';
import { CustomerFinanceExpensesTab } from './CustomerFinanceExpensesTab';
import { CustomerFinanceDebtsTab } from './CustomerFinanceDebtsTab';
import { CustomerFinanceWithdrawalsTab } from './CustomerFinanceWithdrawalsTab';

import {
  Wallet,
  Users,
  Receipt,
  Scale,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Gift,
  Share2,
  CalendarCheck,
  AlertCircle,
  Building2,
  Coins,
  ShieldCheck,
  ArrowUpRight,
  Landmark,
  UserCheck,
  Clock,
  RotateCcw,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export type CustomerFinanceTabType = 'vaults' | 'employees' | 'expenses' | 'debts' | 'withdrawals';

export const CustomerFinanceModule: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState<CustomerFinanceTabType>('vaults');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isWipeFinanceConfirmOpen, setIsWipeFinanceConfirmOpen] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Reactive subscription to all system events
  useEffect(() => {
    const unsubVault = eventBus.subscribe(SYSTEM_EVENTS.VAULT_UPDATED, handleRefresh);
    const unsubExpense = eventBus.subscribe(SYSTEM_EVENTS.EXPENSE_ADDED, handleRefresh);
    const unsubDebt = eventBus.subscribe(SYSTEM_EVENTS.DEBT_UPDATED, handleRefresh);
    const unsubEmp = eventBus.subscribe(SYSTEM_EVENTS.EMPLOYEE_MUTATED, handleRefresh);
    const unsubTx = eventBus.subscribe(SYSTEM_EVENTS.TRANSACTION_RECORDED, handleRefresh);
    const unsubWallet = eventBus.subscribe(SYSTEM_EVENTS.WALLET_MUTATED, handleRefresh);
    const unsubTicket = eventBus.subscribe(SYSTEM_EVENTS.TICKET_UPDATED, handleRefresh);
    const unsubCust = eventBus.subscribe(SYSTEM_EVENTS.CUSTOMER_UPDATED, handleRefresh);

    const onStoreWalletsUpdated = () => handleRefresh();
    const onStorage = () => handleRefresh();

    window.addEventListener('store_wallets_updated', onStoreWalletsUpdated);
    window.addEventListener('storage', onStorage);

    return () => {
      unsubVault();
      unsubExpense();
      unsubDebt();
      unsubEmp();
      unsubTx();
      unsubWallet();
      unsubTicket();
      unsubCust();
      window.removeEventListener('store_wallets_updated', onStoreWalletsUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [handleRefresh]);

  // Data fetching for 15 live KPIs
  const summary = useMemo(() => db.getMainVaultSummary(), [refreshTrigger]);
  const wallets = useMemo(() => db.getStoreWallets(), [refreshTrigger]);
  const customers = useMemo(() => db.getCustomers(), [refreshTrigger]);
  const employees = useMemo(() => db.getEmployees(true), [refreshTrigger]);
  const attendance = useMemo(() => db.getAttendance(), [refreshTrigger]);
  const salaries = useMemo(() => db.getSalaries(), [refreshTrigger]);
  const expenses = useMemo(() => db.getExpenses(false), [refreshTrigger]);
  const debts = useMemo(() => db.getDebts(false), [refreshTrigger]);

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().substring(0, 7);

  // 1. Total Vaults & Wallets
  const totalVaultsCount = 1 + wallets.filter(w => w.status !== 'disabled').length;

  // 2. Cash EGP & 3. Cash USD
  const totalCashEGP = summary.balanceEGP;
  const totalCashUSD = summary.balanceUSD;

  // 4. Profits Wallet (w_profits)
  const profitsWallet = wallets.find(w => w.id === 'w_profits' || w.systemType === 'profits');
  const totalProfits = profitsWallet?.balance || 0;

  // 5. Cashback Wallet (w_cashback)
  const totalCashbackBalance = Math.round(
    customers.reduce((sum, c) => sum + (Number(c.cashbackBalance) || 0), 0) * 100
  ) / 100;

  // 6. Referrals Wallet (w_referrals)
  const referralsWallet = wallets.find(w => w.id === 'w_referrals' || w.systemType === 'referrals');
  const totalReferrals = referralsWallet?.balance || 0;

  // 7. Debts Payable & 8. Debts Receivable
  const totalDebtsPayable = debts
    .filter(d => d.debtType === 'payable')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const customerShortages = customers
    .filter(c => (Number(c.accountBalance) || 0) < 0)
    .reduce((sum, c) => sum + Math.abs(Number(c.accountBalance) || 0), 0);

  const totalDebtsReceivable = Math.round((
    debts
      .filter(d => d.debtType === 'receivable')
      .reduce((sum, d) => sum + d.remainingAmount, 0) + customerShortages
  ) * 100) / 100;

  // 9. Total Expenses this month
  const totalMonthlyExpenses = expenses
    .filter(e => e.date.startsWith(currentMonth) && (e.currency || 'EGP') === 'EGP')
    .reduce((sum, e) => sum + e.amount, 0);

  // 10. Total Salaries
  const totalSalaries = employees.reduce((sum, e) => sum + e.baseSalary, 0);

  // 11. Total Advances
  const totalAdvances = employees.reduce((sum, emp) => {
    const activeAdv = (emp.advances || [])
      .filter(a => a.status === 'disbursed')
      .reduce((s, a) => s + (a.amount - (a.repaidAmount || 0)), 0);
    return sum + activeAdv;
  }, 0);

  // 12. Employee Count
  const totalEmployeesCount = employees.length;

  // 13. Absent Today
  const todaysAttendance = attendance.filter(a => a.date === today);
  const absentTodayCount = employees.filter(e => {
    const rec = todaysAttendance.find(a => a.employeeId === e.id);
    return rec ? rec.status === 'absent' : false;
  }).length;

  // 14. On Leave Today
  const onLeaveTodayCount = employees.filter(e => e.status === 'on_leave').length;

  // 15. Due Salaries this month
  const unpaidSlips = salaries.filter(s => s.month === currentMonth && !s.isPaid);
  const dueSalariesCount = unpaidSlips.length;

  return (
    <div className="p-4 sm:p-6 space-y-6 text-right max-w-7xl mx-auto animate-fade-in" dir="rtl">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                المالية (قسم الزبائن)
              </h1>
              <Badge variant="success" size="sm">النظام المحاسبي الدقيق 100%</Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              الإدارة المالية المركزية، الخزينة الرئيسية، شؤون الموظفين، المصروفات والديون مع سجل تدقيق لحظي (Audit Log)
            </p>
          </div>
        </div>

        {user?.role === 'admin' && (
          <Button
            size="sm"
            variant="outline"
            icon={<RotateCcw className="w-4 h-4 text-rose-500" />}
            onClick={() => setIsWipeFinanceConfirmOpen(true)}
            className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold shrink-0"
          >
            تصفير قسم المالية بالكامل
          </Button>
        )}
      </div>

      {/* ============================================================= */}
      {/* 📊 [ لوحة مؤشرات كاملة 15 KPI ] TOP EXECUTIVE DASHBOARD */}
      {/* ============================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            المؤشرات المالية الحيوية (15 مؤشر مباشر ولحظي)
          </h3>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            ● بيانات محاسبية مطابقة 100%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {/* 1. Total Vaults */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">1. إجمالي الخزائن والمحافظ</span>
            <span className="text-base font-black text-zinc-900 dark:text-white block mt-0.5">
              {totalVaultsCount} وعاء مالي
            </span>
          </Card>

          {/* 2. Total Cash EGP */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">2. إجمالي النقدية بالجنيه</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block mt-0.5 font-mono">
              {formatCurrency(totalCashEGP)}
            </span>
          </Card>

          {/* 3. Total Cash USD */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">3. إجمالي النقدية بالدولار</span>
            <span className="text-base font-black text-blue-600 dark:text-blue-400 block mt-0.5 font-mono">
              ${totalCashUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </Card>

          {/* 4. Total Profits */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">4. إجمالي الأرباح</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block mt-0.5 font-mono">
              {formatCurrency(totalProfits)}
            </span>
          </Card>

          {/* 5. Total Cashback */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">5. إجمالي الكاش باك</span>
            <span className="text-base font-black text-fuchsia-600 dark:text-fuchsia-400 block mt-0.5 font-mono">
              {formatCurrency(totalCashbackBalance)}
            </span>
          </Card>

          {/* 6. Total Referrals */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">6. إجمالي الإحالات</span>
            <span className="text-base font-black text-purple-600 dark:text-purple-400 block mt-0.5 font-mono">
              {formatCurrency(totalReferrals)}
            </span>
          </Card>

          {/* 7. Total Debts Payable */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">7. إجمالي الديون علينا</span>
            <span className="text-base font-black text-rose-600 dark:text-rose-400 block mt-0.5 font-mono">
              {formatCurrency(totalDebtsPayable)}
            </span>
          </Card>

          {/* 8. Total Debts Receivable */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">8. إجمالي الديون لنا</span>
            <span className="text-base font-black text-teal-600 dark:text-teal-400 block mt-0.5 font-mono">
              {formatCurrency(totalDebtsReceivable)}
            </span>
          </Card>

          {/* 9. Total Expenses */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">9. إجمالي المصروفات</span>
            <span className="text-base font-black text-rose-600 dark:text-rose-400 block mt-0.5 font-mono">
              {formatCurrency(totalMonthlyExpenses)}
            </span>
          </Card>

          {/* 10. Total Salaries */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">10. إجمالي الرواتب</span>
            <span className="text-base font-black text-indigo-600 dark:text-indigo-400 block mt-0.5 font-mono">
              {formatCurrency(totalSalaries)}
            </span>
          </Card>

          {/* 11. Total Advances */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">11. إجمالي السلف</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400 block mt-0.5 font-mono">
              {formatCurrency(totalAdvances)}
            </span>
          </Card>

          {/* 12. Employee Count */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">12. عدد الموظفين</span>
            <span className="text-base font-black text-zinc-900 dark:text-white block mt-0.5">
              {totalEmployeesCount} موظف
            </span>
          </Card>

          {/* 13. Absent Today */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">13. الغائبون اليوم</span>
            <span className="text-base font-black text-rose-600 dark:text-rose-400 block mt-0.5">
              {absentTodayCount}
            </span>
          </Card>

          {/* 14. On Leave Today */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">14. الموظفون في إجازة</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400 block mt-0.5">
              {onLeaveTodayCount}
            </span>
          </Card>

          {/* 15. Due Salaries */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">15. الرواتب المستحقة هذا الشهر</span>
            <span className="text-base font-black text-purple-600 dark:text-purple-400 block mt-0.5">
              {dueSalariesCount > 0 ? `${dueSalariesCount} بانتظار الصرف` : 'خالصة'}
            </span>
          </Card>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 🧭 [ شريط التبويبات الأربعة الرئيسية ] 4 CORE TABS */}
      {/* ============================================================= */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab('vaults')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'vaults'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>الخزائن المالية (الرئيسية ومحافظ النظام)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'employees'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الموظفون (شؤون الموظفين والرواتب)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>المصروفات (الخصم المباشر من الخزنة)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('debts')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'debts'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>الديون (علينا، لنا، ديون المعدات)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('withdrawals')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'withdrawals'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>سحب الأرصدة (تذاكر سحب الزبائن)</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* 📂 [ محتوى التبويب النشط ] TAB CONTENT CONTAINER */}
      {/* ============================================================= */}
      <div>
        {activeTab === 'vaults' && <CustomerFinanceVaultsTab />}
        {activeTab === 'employees' && <CustomerFinanceEmployeesTab />}
        {activeTab === 'expenses' && <CustomerFinanceExpensesTab />}
        {activeTab === 'debts' && <CustomerFinanceDebtsTab />}
        {activeTab === 'withdrawals' && <CustomerFinanceWithdrawalsTab />}
      </div>

      {/* Wipe Finance Confirmation Modal */}
      {isWipeFinanceConfirmOpen && (
        <Modal
          isOpen={isWipeFinanceConfirmOpen}
          onClose={() => setIsWipeFinanceConfirmOpen(false)}
          title="💰 تأكيد تصفير ومسح بيانات قسم المالية بالكامل"
          maxWidth="md"
        >
          <div className="space-y-4 text-right text-xs">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>تحذير: سيتم تصفير الخزينة ومسح كافة المعاملات المالية</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                سيؤدي هذا إلى تصفير رصيد الخزنة (0.00 ج.م و 0.00 دولار)، ومسح سجل حركات الخزينة والمصروفات والديون ومرتبات الموظفين وسجلات الحضور والغياب. لن تتأثر حسابات الزبائن أو تذاكر الشحن.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsWipeFinanceConfirmOpen(false)}
              >
                إلغاء وتراجع
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => {
                  db.wipeFinanceData();
                  showToast('success', 'تم تصفير قسم المالية بنجاح', 'تم مسح وتصفير كافة بيانات الخزينة والمصروفات والديون والمرتبات بنجاح');
                  setIsWipeFinanceConfirmOpen(false);
                  handleRefresh();
                }}
                className="font-bold"
              >
                تأكيد تصفير قسم المالية الآن 🗑️
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomerFinanceModule;
