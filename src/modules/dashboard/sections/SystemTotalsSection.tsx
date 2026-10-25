// =============================================================
// NZM JKR TOP UP ERP — Admin Dashboard: System Grand Totals Section
// Consolidated enterprise financials, vault health, and net final summary
// =============================================================

import React from 'react';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { MiniBarChart } from '../../../components/charts/MiniBarChart';
import { MiniDonutChart } from '../../../components/charts/MiniDonutChart';
import { ProgressMetric } from '../../../components/charts/ProgressMetric';
import { FinanceMetrics, UnifiedFinanceFilter } from '../../../types/finance.types';
import { formatCurrency } from '../../../utils/formatters';
import { db } from '../../../database/db';
import {
  Landmark, DollarSign, TrendingUp, ShieldAlert,
  Wallet, ArrowDownLeft, ArrowUpRight, Scale,
  CheckCircle2, Sparkles, Building2, Flame
} from 'lucide-react';

interface SystemTotalsSectionProps {
  metrics: FinanceMetrics;
  filter: UnifiedFinanceFilter;
  onDrillDown?: (kpiId: string, title: string, value: string | number) => void;
  onNavigate?: (section: string) => void;
}

export const SystemTotalsSection: React.FC<SystemTotalsSectionProps> = ({
  metrics, filter, onDrillDown, onNavigate
}) => {
  const totalRev = metrics.totalRevenue || 0;
  const totalCost = metrics.totalCosts || 0;
  const grossProfit = metrics.grossProfit || 0;
  const netProfit = metrics.netProfit || 0;
  const expenses = metrics.monthlyExpenses || 0;
  const vault = metrics.vaultBalance || 0;
  const wallets = db.getStoreWallets();
  const walletsBalance = wallets.reduce((acc: number, w: any) => acc + (w.balance || 0), 0);
  const totalLiquidity = vault + walletsBalance;
  const receivables = metrics.totalDebtsReceivable || 0;
  const payables = metrics.totalDebtsPayable || 0;
  const cashback = metrics.totalCashbackPaid || 0;
  const referrals = metrics.totalReferralCommissionPaid || 0;
  const refunds = metrics.totalRefunds || 0;
  const netWorkingCapital = totalLiquidity + receivables - payables;

  // Financial Waterfall Flow
  const waterfallData = [
    { label: 'إجمالي الإيرادات', value: totalRev, color: '#3b82f6' },
    { label: 'تكلفة البضاعة', value: totalCost, color: '#6366f1' },
    { label: 'إجمالي الأرباح', value: grossProfit, color: '#10b981' },
    { label: 'مصاريف التشغيل', value: expenses, color: '#ef4444' },
    { label: 'صافي الربح النهائي', value: netProfit, color: '#f59e0b' }
  ];

  // Capital Distribution
  const capitalSegments = [
    { label: 'رصيد الخزينة النقدية', value: Math.max(vault, 0), color: '#10b981' },
    { label: 'أرصدة المحافظ والبنوك', value: Math.max(walletsBalance, 0), color: '#06b6d4' },
    { label: 'مستحقات خارجية (لنا)', value: Math.max(receivables, 0), color: '#3b82f6' },
    { label: 'التزامات ومستحقات (علينا)', value: Math.max(payables, 0), color: '#ef4444' }
  ];

  const grandKpis = [
    { id: 'grand_rev', label: 'إجمالي إيراد النظام الموحد', value: formatCurrency(totalRev), icon: <DollarSign className="w-4 h-4" />, color: '#3b82f6', bg: 'bg-blue-500/10', nav: 'finance_overview' },
    { id: 'grand_gross', label: 'مجمل الأرباح التشغيلية', value: formatCurrency(grossProfit), icon: <TrendingUp className="w-4 h-4" />, color: '#10b981', bg: 'bg-emerald-500/10', nav: 'finance_reports' },
    { id: 'grand_net', label: 'صافي الربح الحقيقي التشغيلي', value: formatCurrency(netProfit), icon: <Sparkles className="w-4 h-4" />, color: '#f59e0b', bg: 'bg-amber-500/10', nav: 'finance_overview' },
    { id: 'grand_liquidity', label: 'إجمالي السيولة الحية (خزينة + محافظ)', value: formatCurrency(totalLiquidity), icon: <Wallet className="w-4 h-4" />, color: '#06b6d4', bg: 'bg-cyan-500/10', nav: 'finance_wallets' },
    { id: 'grand_vault', label: 'السيولة المتاحة بالخزينة', value: formatCurrency(vault), icon: <Landmark className="w-4 h-4" />, color: '#8b5cf6', bg: 'bg-purple-500/10', nav: 'finance_vault' },
    { id: 'grand_exp', label: 'المصروفات التشغيلية المعتمدة', value: formatCurrency(expenses), icon: <Building2 className="w-4 h-4" />, color: '#ef4444', bg: 'bg-rose-500/10', nav: 'finance_expenses' },
    { id: 'grand_rec', label: 'ديون ومستحقات لنا (مدين)', value: formatCurrency(receivables), icon: <ArrowDownLeft className="w-4 h-4" />, color: '#10b981', bg: 'bg-emerald-500/10', nav: 'finance_debts' },
    { id: 'grand_pay', label: 'ديون والتزامات علينا (دائن)', value: formatCurrency(payables), icon: <ArrowUpRight className="w-4 h-4" />, color: '#f97316', bg: 'bg-orange-500/10', nav: 'finance_debts' }
  ];

  return (
    <Card className="p-5 bg-white dark:bg-[#18181B] border border-emerald-500/20 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">الإجمالي النهائي والموقف المالي الشامل</h3>
            <span className="text-[10px] text-zinc-400">تجميع محاسبي نهائي وموحد لكافة الأقسام والمصروفات دون أي ازدواجية في الحسابات</span>
          </div>
        </div>
        <button
          onClick={() => onNavigate?.('finance')}
          className="text-xs font-bold text-emerald-500 hover:text-emerald-400 cursor-pointer flex items-center gap-0.5"
        >
          فتح الإدارة المالية <ArrowDownLeft className="w-3 h-3" />
        </button>
      </div>

      {/* Big KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {grandKpis.map(kpi => (
          <div
            key={kpi.id}
            onClick={() => onDrillDown?.(kpi.id, kpi.label, kpi.value)}
            className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 cursor-pointer hover:border-emerald-500/30 transition-all group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded-lg ${kpi.bg}`} style={{ color: kpi.color }}>
                {kpi.icon}
              </div>
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 truncate">{kpi.label}</span>
            </div>
            <span className="text-base font-black font-mono text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors truncate block">
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* Financial Health Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Waterfall Flow */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniBarChart
            data={waterfallData}
            title="📊 مسار التدفق المالي (Waterfall Summary)"
            horizontal
            formatValue={v => formatCurrency(v)}
          />
        </div>

        {/* Capital Breakdown Donut */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniDonutChart
            segments={capitalSegments}
            title="🏦 هيكل السيولة والالتزامات"
            size={120}
            thickness={24}
            centerValue={formatCurrency(netWorkingCapital)}
            centerLabel="صافي رأس المال"
            formatValue={v => formatCurrency(v)}
          />
        </div>
      </div>

      {/* Summary Footer Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
        <ProgressMetric label="صافي هامش الربح النهائي" value={totalRev > 0 ? `${Math.round((netProfit / totalRev) * 100)}%` : '0%'} percentage={totalRev > 0 ? Math.round((netProfit / totalRev) * 100) : 0} color="#10b981" subtitle="بعد خصم المصاريف" size="sm" />
        <ProgressMetric label="معدل السيولة النقدية" value={formatCurrency(vault)} percentage={85} color="#3b82f6" subtitle="رصيد الخزينة الحالي" size="sm" />
        <ProgressMetric label="التزامات ومستحقات" value={formatCurrency(payables)} percentage={payables > 0 ? Math.min(100, Math.round((payables / Math.max(vault, 1)) * 100)) : 0} color="#f59e0b" subtitle="نسبة من الخزينة" size="sm" />
        <ProgressMetric label="حوافز ومكافآت مدفوعة" value={formatCurrency(cashback + referrals)} percentage={totalRev > 0 ? Math.round(((cashback + referrals) / totalRev) * 100) : 0} color="#ec4899" subtitle="كاش باك + إحالات" size="sm" />
      </div>
    </Card>
  );
};
