import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { db } from '../../../database/db';
import { eventBus, SYSTEM_EVENTS } from '../../../services/eventBus';
import { formatCurrency } from '../../../utils/formatters';

// 5 Main Subcomponents
import { DealerFinanceVaultsTab } from './DealerFinanceVaultsTab';
import { DealerFinanceEmployeesTab } from './DealerFinanceEmployeesTab';
import { DealerFinanceExpensesTab } from './DealerFinanceExpensesTab';
import { DealerFinanceDebtsTab } from './DealerFinanceDebtsTab';
import { DealerFinanceWithdrawalsTab } from './DealerFinanceWithdrawalsTab';

import {
  Wallet,
  Users,
  Receipt,
  Scale,
  DollarSign,
  TrendingUp,
  Gift,
  Share2,
  CalendarCheck,
  Building2,
  Coins,
  ShieldCheck,
  Landmark,
  Store
} from 'lucide-react';

export type DealerFinanceTabType = 'vaults' | 'employees' | 'expenses' | 'debts' | 'withdrawals';

export const DealerFinanceModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DealerFinanceTabType>('vaults');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
    const unsubTicketCreated = eventBus.subscribe(SYSTEM_EVENTS.TICKET_CREATED, handleRefresh);

    const onStoreWalletsUpdated = () => handleRefresh();
    window.addEventListener('store_wallets_updated', onStoreWalletsUpdated);
    window.addEventListener('dealer_tickets_updated', onStoreWalletsUpdated);
    window.addEventListener('tickets_updated', onStoreWalletsUpdated);
    window.addEventListener('storage', onStoreWalletsUpdated);

    return () => {
      unsubVault();
      unsubExpense();
      unsubDebt();
      unsubEmp();
      unsubTx();
      unsubWallet();
      unsubTicket();
      unsubTicketCreated();
      window.removeEventListener('store_wallets_updated', onStoreWalletsUpdated);
      window.removeEventListener('dealer_tickets_updated', onStoreWalletsUpdated);
      window.removeEventListener('tickets_updated', onStoreWalletsUpdated);
      window.removeEventListener('storage', onStoreWalletsUpdated);
    };
  }, [handleRefresh]);

  // Data fetching for 15 live KPIs isolated to dealers
  const summary = useMemo(() => db.getDealerMainVaultSummary(), [refreshTrigger]);
  const wallets = useMemo(() => db.getDealerWallets(), [refreshTrigger]);
  const dealers = useMemo(() => db.getDealers(), [refreshTrigger]);
  const employees = useMemo(() => db.getDealerEmployees(true), [refreshTrigger]);
  const attendance = useMemo(() => db.getDealerAttendance(), [refreshTrigger]);
  const salaries = useMemo(() => db.getDealerSalaries(), [refreshTrigger]);
  const expenses = useMemo(() => db.getDealerExpenses(false), [refreshTrigger]);
  const debts = useMemo(() => db.getDealerDebts(false), [refreshTrigger]);

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().substring(0, 7);

  // 1. Total Vaults & Wallets
  const totalVaultsCount = 1 + wallets.length;

  // 2. Cash EGP & 3. Cash USD
  const totalCashEGP = summary.balanceEGP;
  const totalCashUSD = summary.balanceUSD;

  // 4. Profits Wallet (mw_profits)
  const profitsWallet = wallets.find(w => w.id === 'mw_profits' || w.systemType === 'profits');
  const totalProfits = profitsWallet?.balance || 0;

  // 5. Cashback Wallet (mw_cashback)
  const cashbackWallet = wallets.find(w => w.id === 'mw_cashback' || w.systemType === 'cashback');
  const totalCashbackBalance = cashbackWallet ? cashbackWallet.balance : Math.round(
    dealers.reduce((sum, d) => sum + (Number(d.cashbackBalance) || 0), 0) * 100
  ) / 100;

  // 6. Referrals Wallet (mw_referrals)
  const referralsWallet = wallets.find(w => w.id === 'mw_referrals' || w.systemType === 'referrals');
  const totalReferrals = referralsWallet?.balance || 0;

  // 7. Debts Payable & 8. Debts Receivable
  const totalDebtsPayable = debts
    .filter(d => d.debtType === 'payable')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

  const totalDebtsReceivable = debts
    .filter(d => d.debtType === 'receivable')
    .reduce((sum, d) => sum + d.remainingAmount, 0);

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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                المالية (قسم التجار والموزعين)
              </h1>
              <Badge variant="warning" size="sm">نظام مالي معزول ومستقل 100%</Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              الإدارة المالية المركزية لقطاع التجار، الخزنة الرئيسية، محافظ الجملة، شؤون موظفي التجار، المصروفات والديون
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 📊 [ لوحة مؤشرات كاملة 15 KPI ] TOP EXECUTIVE DASHBOARD */}
      {/* ============================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            المؤشرات المالية الحيوية لقطاع التجار (15 مؤشر لحظي)
          </h3>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
            ● بيانات محاسبية خاصة بالتجار 100%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {/* 1. Total Vaults */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">1. إجمالي الخزائن والمحافظ</span>
            <span className="text-base font-black text-zinc-900 dark:text-white block mt-0.5">
              {totalVaultsCount} أوعية مالية
            </span>
          </Card>

          {/* 2. Total Cash EGP */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">2. إجمالي النقدية بالجنيه</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400 block mt-0.5 font-mono">
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
            <span className="text-[10px] text-zinc-500 font-bold block">4. إجمالي أرباح التجار</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block mt-0.5 font-mono">
              {formatCurrency(totalProfits)}
            </span>
          </Card>

          {/* 5. Total Cashback */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">5. إجمالي كاش باك التجار</span>
            <span className="text-base font-black text-fuchsia-600 dark:text-fuchsia-400 block mt-0.5 font-mono">
              {formatCurrency(totalCashbackBalance)}
            </span>
          </Card>

          {/* 6. Total Referrals */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">6. إجمالي إحالات التجار</span>
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
            <span className="text-[10px] text-zinc-500 font-bold block">9. مصروفات تجار الشهر</span>
            <span className="text-base font-black text-rose-600 dark:text-rose-400 block mt-0.5 font-mono">
              {formatCurrency(totalMonthlyExpenses)}
            </span>
          </Card>

          {/* 10. Total Salaries */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">10. إجمالي الرواتب الأساسية</span>
            <span className="text-base font-black text-indigo-600 dark:text-indigo-400 block mt-0.5 font-mono">
              {formatCurrency(totalSalaries)}
            </span>
          </Card>

          {/* 11. Total Advances */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">11. إجمالي السلف المعلقة</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400 block mt-0.5 font-mono">
              {formatCurrency(totalAdvances)}
            </span>
          </Card>

          {/* 12. Employee Count */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">12. كادر موظفي التجار</span>
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
            <span className="text-[10px] text-zinc-500 font-bold block">14. إجازات اليوم</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400 block mt-0.5">
              {onLeaveTodayCount}
            </span>
          </Card>

          {/* 15. Due Salaries */}
          <Card className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-bold block">15. رواتب الشهر المستحقة</span>
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
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>الخزائن المالية (خزنة التجار ومحافظ النظام)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'employees'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الموظفون (شؤون كادر التجار والرواتب)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
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
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>الديون (ديون مالية وديون معدات)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('withdrawals')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'withdrawals'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>سحب الأرصدة (تذاكر سحب التجار)</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* 📂 [ محتوى التبويب النشط ] TAB CONTENT CONTAINER */}
      {/* ============================================================= */}
      <div>
        {activeTab === 'vaults' && <DealerFinanceVaultsTab />}
        {activeTab === 'employees' && <DealerFinanceEmployeesTab />}
        {activeTab === 'expenses' && <DealerFinanceExpensesTab />}
        {activeTab === 'debts' && <DealerFinanceDebtsTab />}
        {activeTab === 'withdrawals' && <DealerFinanceWithdrawalsTab />}
      </div>
    </div>
  );
};

export default DealerFinanceModule;
