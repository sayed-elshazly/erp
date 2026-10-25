// =============================================================
// NZM JKR TOP UP ERP — Admin Dashboard: Middleman Section Card
// Detailed performance analytics for Escrow, Brokerage & Account Store
// =============================================================

import React, { useMemo } from 'react';
import { db } from '../../../database/db';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { MiniBarChart } from '../../../components/charts/MiniBarChart';
import { MiniDonutChart } from '../../../components/charts/MiniDonutChart';
import { ProgressMetric } from '../../../components/charts/ProgressMetric';
import { FinanceMetrics, UnifiedFinanceFilter } from '../../../types/finance.types';
import { formatCurrency } from '../../../utils/formatters';
import {
  ShieldCheck, Users, DollarSign, TrendingUp, Handshake,
  Package, ShoppingCart, CheckCircle2, ChevronLeft,
  Store, Award, ArrowDownLeft, Sparkles, Users2
} from 'lucide-react';
import { useTabs } from '../../../context/TabsContext';

interface MiddlemanSectionCardProps {
  metrics: FinanceMetrics;
  filter: UnifiedFinanceFilter;
  onDrillDown?: (kpiId: string, title: string, value: string | number) => void;
  onNavigate?: (section: string) => void;
}

export const MiddlemanSectionCard: React.FC<MiddlemanSectionCardProps> = ({
  metrics, filter, onDrillDown, onNavigate
}) => {
  const deals = useMemo(() => db.getMiddlemanDeals ? db.getMiddlemanDeals(true) : [], []);
  const accounts = useMemo(() => db.getMiddlemanAccounts ? db.getMiddlemanAccounts() : [], []);

  // Top Games in Middleman Deals
  const dealsByGame = useMemo(() => {
    const counts: Record<string, { count: number; volume: number }> = {};
    deals.forEach(d => {
      const g = d.gameName || 'ألعاب أخرى';
      if (!counts[g]) counts[g] = { count: 0, volume: 0 };
      counts[g].count += 1;
      counts[g].volume += (d.dealAmountEGP || d.dealAmount || 0);
    });

    return Object.entries(counts)
      .map(([game, data]) => ({ label: game, value: data.count, volume: data.volume }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [deals]);

  // Deal Statuses Donut Chart
  const dealStatuses = useMemo(() => {
    const completed = deals.filter(d => d.status === 'completed').length;
    const inProgress = deals.filter(d => d.status === 'in_progress' || d.status === 'awaiting_transfer' || d.status === 'awaiting_seller' || d.status === 'awaiting_buyer').length;
    const disputed = deals.filter(d => d.status === 'dispute').length;
    const cancelled = deals.filter(d => d.status === 'canceled').length;

    return [
      { label: 'مكتملة ومسلمة', value: completed, color: '#10b981' },
      { label: 'قيد التنفيذ والضمان', value: inProgress, color: '#8b5cf6' },
      { label: 'نزاع وتدقيق', value: disputed, color: '#ef4444' },
      { label: 'ملغاة ومستردة', value: cancelled, color: '#6b7280' }
    ];
  }, [deals]);

  // Accounts Store Inventory by Game
  const accountsByGame = useMemo(() => {
    const counts: Record<string, number> = {};
    accounts.forEach(a => {
      const g = a.gameName || 'حسابات منوعة';
      counts[g] = (counts[g] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [accounts]);

  const completedDeals = deals.filter(d => d.status === 'completed');
  const totalDealsVolume = deals.reduce((s, d) => s + (d.dealAmountEGP || d.dealAmount || 0), 0);
  const soldAccounts = accounts.filter(a => a.status === 'sold' || (a.soldQuantity && a.soldQuantity > 0));
  const availableAccounts = accounts.filter(a => (a.availableQuantity === undefined || a.availableQuantity > 0) && a.status !== 'sold');

  const kpiCards = [
    { id: 'mid_deals_count', label: 'إجمالي الصفقات', value: deals.length, icon: <Handshake className="w-3.5 h-3.5" />, color: '#8b5cf6' },
    { id: 'mid_deals_completed', label: 'الصفقات المكتملة', value: completedDeals.length, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: '#10b981' },
    { id: 'mid_deals_volume', label: 'حجم تداول الوساطة', value: formatCurrency(totalDealsVolume), icon: <DollarSign className="w-3.5 h-3.5" />, color: '#3b82f6' },
    { id: 'mid_company_comm', label: 'عمولة الشركة الصافية', value: formatCurrency(metrics.middlemanCompanyCommission || metrics.middlemanProfit), icon: <TrendingUp className="w-3.5 h-3.5" />, color: '#10b981' },
    { id: 'mid_ext_comm', label: 'عمولات الوسطاء الخارجيين', value: formatCurrency(metrics.middlemanExternalCommission || 0), icon: <Users2 className="w-3.5 h-3.5" />, color: '#f59e0b' },
    { id: 'mid_accounts_sold', label: 'حسابات مباعة', value: soldAccounts.length, icon: <ShoppingCart className="w-3.5 h-3.5" />, color: '#06b6d4' },
    { id: 'mid_accounts_avail', label: 'حسابات متاحة بالمخزن', value: availableAccounts.length, icon: <Package className="w-3.5 h-3.5" />, color: '#ec4899' },
    { id: 'mid_accounts_profit', label: 'أرباح بيع الحسابات', value: formatCurrency(metrics.totalAccountsProfit || 0), icon: <Sparkles className="w-3.5 h-3.5" />, color: '#10b981' }
  ];

  const { openTab } = useTabs();

  const handleKpiClick = (kpi: (typeof kpiCards)[0]) => {
    if (kpi.id === 'mid_deals_count' || kpi.id === 'mid_deals_comp' || kpi.id === 'mid_escrow_bal' || kpi.id === 'mid_our_comm') {
      openTab({ id: 'middleman', title: 'صفقات الوساطة', section: 'middleman', iconType: 'middleman' as any });
    } else if (kpi.id === 'mid_accounts_sold' || kpi.id === 'mid_accounts_avail' || kpi.id === 'mid_accounts_profit') {
      openTab({ id: 'middleman_accounts', title: 'مخزن الحسابات', section: 'middleman', iconType: 'middleman' as any });
    } else if (onDrillDown) {
      onDrillDown(kpi.id, kpi.label, kpi.value);
    }
  };

  return (
    <Card className="p-5 bg-white dark:bg-[#18181B] border border-purple-500/20 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">أداء قسم الوساطة ومخزن الحسابات</h3>
            <span className="text-[10px] text-zinc-400">بيانات منفصلة لضمان الصفقات، العمولات المستقلة، ومخزون الحسابات الرقمية</span>
          </div>
        </div>
        <button
          onClick={() => openTab({ id: 'middleman', title: 'الوساطة والمخزن', section: 'middleman', iconType: 'middleman' as any })}
          className="text-xs font-bold text-purple-500 hover:text-purple-400 cursor-pointer flex items-center gap-0.5"
        >
          فتح قسم الوساطة <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5">
        {kpiCards.map(kpi => (
          <div
            key={kpi.id}
            onClick={() => handleKpiClick(kpi)}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 cursor-pointer hover:border-purple-500/30 transition-all group"
            title="انقر لفتح التفاصيل أو الانتقال المباشر"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{kpi.label}</span>
            </div>
            <span className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100 group-hover:text-purple-500 transition-colors truncate block">
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Deals by Game */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniBarChart
            data={dealsByGame}
            title="🎮 صفقات الوساطة حسب اللعبة"
            horizontal
            formatValue={v => `${v} صفقة`}
            accentColor="#8b5cf6"
          />
        </div>

        {/* Account Assets Inventory by Game */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniBarChart
            data={accountsByGame}
            title="🏷️ مخزون الحسابات حسب اللعبة"
            horizontal
            formatValue={v => `${v} حساب`}
            accentColor="#06b6d4"
          />
        </div>

        {/* Deal Status Breakdown */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniDonutChart
            segments={dealStatuses}
            title="⚖️ حالات صفقات الضمان"
            size={110}
            thickness={22}
            centerValue={deals.length}
            centerLabel="صفقة إجمالية"
          />
        </div>
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
        <ProgressMetric label="نسبة نجاح الصفقات" value={`${completedDeals.length}/${deals.length}`} percentage={deals.length > 0 ? Math.round((completedDeals.length / deals.length) * 100) : 0} color="#10b981" subtitle="صفقات ناجحة ومسلمة" size="sm" />
        <ProgressMetric label="متوسط عمولة الشركة" value={completedDeals.length > 0 ? formatCurrency(Math.round((metrics.middlemanCompanyCommission || metrics.middlemanProfit || 0) / completedDeals.length)) : '0'} percentage={100} color="#8b5cf6" subtitle="لكل صفقة مكتملة" size="sm" />
        <ProgressMetric label="معدل دوران الحسابات" value={`${soldAccounts.length}/${accounts.length}`} percentage={accounts.length > 0 ? Math.round((soldAccounts.length / accounts.length) * 100) : 0} color="#06b6d4" subtitle="تم بيعها وتسليمها" size="sm" />
        <ProgressMetric label="استقلالية الوسيط الخارجي" value={formatCurrency(metrics.middlemanExternalCommission || 0)} percentage={20} color="#f59e0b" subtitle="عمولات منفصلة للوسطاء" size="sm" />
      </div>
    </Card>
  );
};
