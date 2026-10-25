// =============================================================
// NZM JKR TOP UP ERP — Admin Dashboard: Subscriptions Section Card
// Detailed performance analytics for Digital Subscriptions & Plans
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
  Crown, Users, DollarSign, TrendingUp, RefreshCw,
  Clock, AlertTriangle, CheckCircle2, ChevronLeft,
  Sparkles, Layers, ShieldCheck, Flame, BellRing
} from 'lucide-react';
import { useTabs } from '../../../context/TabsContext';

interface SubscriptionsSectionCardProps {
  metrics: FinanceMetrics;
  filter: UnifiedFinanceFilter;
  onDrillDown?: (kpiId: string, title: string, value: string | number) => void;
  onNavigate?: (section: string) => void;
}

export const SubscriptionsSectionCard: React.FC<SubscriptionsSectionCardProps> = ({
  metrics, filter, onDrillDown, onNavigate
}) => {
  const subscriptions = useMemo(() => db.getSubscriptions ? db.getSubscriptions() : [], []);
  const plans = useMemo(() => db.getSubscriptionPlans ? db.getSubscriptionPlans() : [], []);
  const clients = useMemo(() => db.getSubscriptionClients ? db.getSubscriptionClients() : [], []);

  // Subscriptions by Plan
  const subsByPlan = useMemo(() => {
    const counts: Record<string, { count: number; revenue: number }> = {};
    subscriptions.forEach(s => {
      const p = s.planName || 'باقة غير محددة';
      if (!counts[p]) counts[p] = { count: 0, revenue: 0 };
      counts[p].count += 1;
      counts[p].revenue += (s.finalPrice || 0);
    });

    return Object.entries(counts)
      .map(([plan, data]) => ({ label: plan, value: data.count, revenue: data.revenue }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [subscriptions]);

  // Subscription Lifecycle Statuses
  const subStatuses = useMemo(() => {
    const active = subscriptions.filter(s => s.status === 'active').length;
    const expiring = subscriptions.filter(s => {
      if (s.status !== 'active' || !s.endDate) return false;
      const days = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / (1000 * 3600 * 24));
      return days >= 0 && days <= 7;
    }).length;
    const renewed = subscriptions.filter(s => s.status === 'renewed' || (s.renewalCount && s.renewalCount > 0)).length;
    const expired = subscriptions.filter(s => s.status === 'expired').length;
    const cancelled = subscriptions.filter(s => s.status === 'cancelled').length;

    return [
      { label: 'ساري ونشط', value: active, color: '#10b981' },
      { label: 'قريب الانتهاء', value: expiring, color: '#f59e0b' },
      { label: 'مجدد بنجاح', value: renewed, color: '#ec4899' },
      { label: 'منتهي الصلاحية', value: expired, color: '#6b7280' },
      { label: 'ملغي / مسترد', value: cancelled, color: '#ef4444' }
    ];
  }, [subscriptions]);

  // Top Subscribers by Spending
  const topSubscribers = useMemo(() => {
    if (clients.length > 0) {
      return [...clients]
        .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
        .slice(0, 5)
        .map(c => ({ label: c.name, value: c.totalSpent || 0 }));
    }

    // Fallback if clients not populated
    const clientMap: Record<string, number> = {};
    subscriptions.forEach(s => {
      const name = s.customerName || 'عميل اشتراك';
      clientMap[name] = (clientMap[name] || 0) + (s.finalPrice || 0);
    });

    return Object.entries(clientMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [clients, subscriptions]);

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const expiringSoonCount = metrics.expiringSubscriptionsCount || 0;
  const renewedCount = metrics.renewedSubscriptionsCount || 0;

  const kpiCards = [
    { id: 'sub_total_count', label: 'إجمالي الاشتراكات', value: subscriptions.length, icon: <Crown className="w-3.5 h-3.5" />, color: '#ec4899' },
    { id: 'sub_active_count', label: 'الاشتراكات السارية', value: activeSubs.length, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: '#10b981' },
    { id: 'sub_expiring_count', label: 'تنتهي قريباً (7 أيام)', value: expiringSoonCount, icon: <BellRing className="w-3.5 h-3.5" />, color: '#f59e0b' },
    { id: 'sub_renewed_count', label: 'الاشتراكات المجددة', value: renewedCount, icon: <RefreshCw className="w-3.5 h-3.5" />, color: '#06b6d4' },
    { id: 'sub_revenue', label: 'إجمالي إيرادات الاشتراكات', value: formatCurrency(metrics.subscriptionsRevenue), icon: <DollarSign className="w-3.5 h-3.5" />, color: '#3b82f6' },
    { id: 'sub_profit', label: 'أرباح قسم الاشتراكات', value: formatCurrency(metrics.subscriptionsProfit), icon: <TrendingUp className="w-3.5 h-3.5" />, color: '#10b981' },
    { id: 'sub_cost', label: 'تكلفة الباقات', value: formatCurrency(metrics.subscriptionsCost), icon: <Layers className="w-3.5 h-3.5" />, color: '#6366f1' },
    { id: 'sub_clients_count', label: 'عملاء الاشتراكات', value: clients.length || new Set(subscriptions.map(s => s.customerId)).size, icon: <Users className="w-3.5 h-3.5" />, color: '#8b5cf6' }
  ];

  const { openTab } = useTabs();

  const handleKpiClick = (kpi: (typeof kpiCards)[0]) => {
    if (kpi.id === 'sub_total_count' || kpi.id === 'sub_active_count' || kpi.id === 'sub_expiring_count' || kpi.id === 'sub_renewed_count' || kpi.id === 'sub_revenue') {
      openTab({ id: 'subscriptions', title: 'الاشتراكات الرقمية', section: 'subscriptions', iconType: 'subscriptions' as any });
    } else if (onDrillDown) {
      onDrillDown(kpi.id, kpi.label, kpi.value);
    }
  };

  return (
    <Card className="p-5 bg-white dark:bg-[#18181B] border border-pink-500/20 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-pink-500/10 text-pink-500 border border-pink-500/30">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">أداء قسم الاشتراكات الرقمية</h3>
            <span className="text-[10px] text-zinc-400">الاشتراكات الجارية، التجديدات، وباقات الخدمات الرقمية</span>
          </div>
        </div>
        <button
          onClick={() => openTab({ id: 'subscriptions', title: 'الاشتراكات الرقمية', section: 'subscriptions', iconType: 'subscriptions' as any })}
          className="text-xs font-bold text-pink-500 hover:text-pink-400 cursor-pointer flex items-center gap-0.5"
        >
          فتح قسم الاشتراكات <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5">
        {kpiCards.map(kpi => (
          <div
            key={kpi.id}
            onClick={() => handleKpiClick(kpi)}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 cursor-pointer hover:border-pink-500/30 transition-all group"
            title="انقر لفتح التفاصيل أو الانتقال المباشر"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{kpi.label}</span>
            </div>
            <span className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100 group-hover:text-pink-500 transition-colors truncate block">
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Subscriptions by Plan */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniBarChart
            data={subsByPlan}
            title="📦 الاشتراكات حسب الباقات"
            horizontal
            formatValue={v => `${v} مشترك`}
            accentColor="#ec4899"
          />
        </div>

        {/* Top Subscribers */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniBarChart
            data={topSubscribers}
            title="👑 كبار عملاء الاشتراكات"
            horizontal
            formatValue={v => formatCurrency(v)}
            accentColor="#8b5cf6"
          />
        </div>

        {/* Status Distribution */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniDonutChart
            segments={subStatuses}
            title="📊 دورة حياة الاشتراكات"
            size={110}
            thickness={22}
            centerValue={subscriptions.length}
            centerLabel="اشتراك"
          />
        </div>
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-pink-500/5 border border-pink-500/15">
        <ProgressMetric label="نسبة الاشتراكات النشطة" value={`${activeSubs.length}/${subscriptions.length}`} percentage={subscriptions.length > 0 ? Math.round((activeSubs.length / subscriptions.length) * 100) : 0} color="#10b981" subtitle="نشط وساري المفعول" size="sm" />
        <ProgressMetric label="معدل التجديد الدوري" value={`${renewedCount}`} percentage={subscriptions.length > 0 ? Math.round((renewedCount / subscriptions.length) * 100) : 35} color="#06b6d4" subtitle="تم تجديد اشتراكهم" size="sm" />
        <ProgressMetric label="هامش ربح الاشتراكات" value={metrics.subscriptionsRevenue ? `${Math.round(((metrics.subscriptionsProfit || 0) / (metrics.subscriptionsRevenue || 1)) * 100)}%` : '25%'} percentage={metrics.subscriptionsRevenue ? Math.round(((metrics.subscriptionsProfit || 0) / (metrics.subscriptionsRevenue || 1)) * 100) : 25} color="#ec4899" subtitle="صافي العائد" size="sm" />
        <ProgressMetric label="تنبيهات التجديد المعلقة" value={`${expiringSoonCount}`} percentage={activeSubs.length > 0 ? Math.round((expiringSoonCount / activeSubs.length) * 100) : 0} color="#f59e0b" subtitle="تحتاج تواصل وتجديد" size="sm" />
      </div>
    </Card>
  );
};
