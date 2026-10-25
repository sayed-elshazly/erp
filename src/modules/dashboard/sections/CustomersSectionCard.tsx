// =============================================================
// NZM JKR TOP UP ERP — Admin Dashboard: Customers Section Card
// Detailed performance analytics for Customer & Top-Up department
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
  Ticket, Users, DollarSign, TrendingUp, ShoppingBag,
  Gift, Share2, AlertTriangle, CheckCircle2, Clock,
  Gamepad2, ChevronLeft, Star, UserPlus
} from 'lucide-react';
import { useTabs } from '../../../context/TabsContext';

interface CustomersSectionCardProps {
  metrics: FinanceMetrics;
  filter: UnifiedFinanceFilter;
  onDrillDown?: (kpiId: string, title: string, value: string | number) => void;
  onNavigate?: (section: string) => void;
}

export const CustomersSectionCard: React.FC<CustomersSectionCardProps> = ({
  metrics, filter, onDrillDown, onNavigate
}) => {
  const customers = useMemo(() => db.getCustomers(), []);
  const tickets = useMemo(() => db.getTickets(), []);

  // Top Games by ticket count
  const topGames = useMemo(() => {
    const counts: Record<string, { count: number; revenue: number }> = {};
    tickets.filter(t => t.status === 'completed').forEach(t => {
      const g = t.gameName || 'أخرى';
      if (!counts[g]) counts[g] = { count: 0, revenue: 0 };
      counts[g].count += 1;
      counts[g].revenue += (t.receivedAmount || t.requiredAmount || 0);
    });
    return Object.entries(counts)
      .map(([game, data]) => ({ label: game, value: data.count, revenue: data.revenue }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [tickets]);

  // Top Products
  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.filter(t => t.status === 'completed').forEach(t => {
      const p = t.gameProductName || (t.items && t.items[0]?.productName) || 'منتج غير محدد';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [tickets]);

  // Top Customers by spending
  const topCustomers = useMemo(() => {
    return [...customers]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map(c => ({ label: c.name, value: c.totalSpent }));
  }, [customers]);

  // Ticket status distribution
  const ticketStatuses = useMemo(() => {
    const completed = tickets.filter(t => t.status === 'completed').length;
    const open = tickets.filter(t => t.status === 'new' || t.status === 'in_progress').length;
    const problem = tickets.filter(t => t.status === 'problem').length;
    const refunded = tickets.filter(t => t.status === 'refunded').length;
    const canceled = tickets.filter(t => t.status === 'canceled').length;
    return [
      { label: 'مكتملة', value: completed, color: '#10b981' },
      { label: 'مفتوحة', value: open, color: '#f59e0b' },
      { label: 'مشكلة', value: problem, color: '#ef4444' },
      { label: 'مستردة', value: refunded, color: '#8b5cf6' },
      { label: 'ملغاة', value: canceled, color: '#6b7280' }
    ];
  }, [tickets]);

  const completedTickets = tickets.filter(t => t.status === 'completed');
  const avgTicketValue = completedTickets.length > 0
    ? Math.round(completedTickets.reduce((s, t) => s + (t.receivedAmount || t.requiredAmount || 0), 0) / completedTickets.length)
    : 0;

  // First-time purchases
  const firstTimePurchases = useMemo(() => {
    return tickets.filter(t => t.ticketType === 'first_shipping').length;
  }, [tickets]);

  const kpiCards = [
    { id: 'cust_count', label: 'عدد الزبائن', value: metrics.customersCount || 0, icon: <Users className="w-3.5 h-3.5" />, color: '#3b82f6' },
    { id: 'cust_tickets', label: 'عدد التذاكر', value: tickets.length, icon: <Ticket className="w-3.5 h-3.5" />, color: '#f97316' },
    { id: 'cust_completed', label: 'التذاكر المكتملة', value: completedTickets.length, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: '#10b981' },
    { id: 'cust_open', label: 'التذاكر المفتوحة', value: tickets.filter(t => t.status === 'new' || t.status === 'in_progress').length, icon: <Clock className="w-3.5 h-3.5" />, color: '#f59e0b' },
    { id: 'cust_problem', label: 'تذاكر بها مشكلة', value: tickets.filter(t => t.status === 'problem').length, icon: <AlertTriangle className="w-3.5 h-3.5" />, color: '#ef4444' },
    { id: 'cust_revenue', label: 'إجمالي المبيعات', value: formatCurrency(metrics.customerRevenue), icon: <DollarSign className="w-3.5 h-3.5" />, color: '#3b82f6' },
    { id: 'cust_profit', label: 'صافي الربح', value: formatCurrency(metrics.customerProfit), icon: <TrendingUp className="w-3.5 h-3.5" />, color: '#10b981' },
    { id: 'cust_cost', label: 'تكلفة المنتجات', value: formatCurrency(metrics.customerCost), icon: <ShoppingBag className="w-3.5 h-3.5" />, color: '#6366f1' },
    { id: 'cust_cashback', label: 'الكاش باك', value: formatCurrency(metrics.customerCashback), icon: <Gift className="w-3.5 h-3.5" />, color: '#f97316' },
    { id: 'cust_referrals', label: 'الإحالات', value: formatCurrency(metrics.customerReferrals), icon: <Share2 className="w-3.5 h-3.5" />, color: '#8b5cf6' },
    { id: 'cust_avg', label: 'متوسط قيمة التذكرة', value: formatCurrency(avgTicketValue), icon: <Star className="w-3.5 h-3.5" />, color: '#f59e0b' },
    { id: 'cust_new', label: 'العملاء الجدد (30 يوم)', value: metrics.newCustomersCount || 0, icon: <UserPlus className="w-3.5 h-3.5" />, color: '#06b6d4' },
  ];

  const { openTab } = useTabs();

  const handleKpiClick = (kpi: (typeof kpiCards)[0]) => {
    if (kpi.id === 'cust_tickets' || kpi.id === 'cust_completed' || kpi.id === 'cust_open' || kpi.id === 'cust_problem') {
      openTab({ id: 'tickets', title: 'تذاكر الشحن', section: 'tickets', iconType: 'tickets' });
    } else if (kpi.id === 'cust_count' || kpi.id === 'cust_new') {
      openTab({ id: 'customers', title: 'الزبائن', section: 'customers', iconType: 'customers' });
    } else if (onDrillDown) {
      onDrillDown(kpi.id, kpi.label, kpi.value);
    }
  };

  return (
    <Card className="p-5 bg-white dark:bg-[#18181B] border border-orange-500/20 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/30">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">أداء قسم الزبائن والشحن المباشر</h3>
            <span className="text-[10px] text-zinc-400">بيانات حصرية وتفصيلية لمبيعات التذاكر والزبائن</span>
          </div>
        </div>
        <button
          onClick={() => openTab({ id: 'customers', title: 'الزبائن', section: 'customers', iconType: 'customers' })}
          className="text-xs font-bold text-orange-500 hover:text-orange-400 cursor-pointer flex items-center gap-0.5"
        >
          فتح قسم الزبائن <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
        {kpiCards.map(kpi => (
          <div
            key={kpi.id}
            onClick={() => handleKpiClick(kpi)}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 cursor-pointer hover:border-orange-500/30 transition-all group"
            title="انقر لفتح التفاصيل أو الانتقال المباشر"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{kpi.label}</span>
            </div>
            <span className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100 group-hover:text-orange-500 transition-colors">
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Top Games */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniBarChart
            data={topGames}
            title="🎮 أكثر الألعاب مبيعاً"
            horizontal
            formatValue={v => `${v} طلب`}
            accentColor="#f97316"
          />
        </div>

        {/* Top Products */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniBarChart
            data={topProducts}
            title="📦 أكثر المنتجات مبيعاً"
            horizontal
            formatValue={v => `${v} طلب`}
            accentColor="#3b82f6"
          />
        </div>

        {/* Ticket Status Distribution */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniDonutChart
            segments={ticketStatuses}
            title="📊 توزيع حالات التذاكر"
            size={110}
            thickness={22}
            centerValue={tickets.length}
            centerLabel="تذكرة"
          />
        </div>

        {/* Top Customers */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800 md:col-span-2 lg:col-span-3">
          <MiniBarChart
            data={topCustomers}
            title="👑 أفضل العملاء (إجمالي المشتريات)"
            horizontal
            formatValue={v => formatCurrency(v)}
            accentColor="#8b5cf6"
          />
        </div>
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
        <ProgressMetric label="معدل الإنجاز" value={`${completedTickets.length}/${tickets.length}`} percentage={tickets.length > 0 ? Math.round((completedTickets.length / tickets.length) * 100) : 0} color="#10b981" subtitle="التذاكر المكتملة" size="sm" />
        <ProgressMetric label="أول شحنة" value={`${firstTimePurchases}`} percentage={tickets.length > 0 ? Math.round((firstTimePurchases / tickets.length) * 100) : 0} color="#06b6d4" subtitle="عملاء جدد أول مرة" size="sm" />
        <ProgressMetric label="نسبة الاسترداد" value={formatCurrency(metrics.customerRefunds)} percentage={metrics.customerRevenue ? Math.round(((metrics.customerRefunds || 0) / (metrics.customerRevenue || 1)) * 100) : 0} color="#ef4444" subtitle="من إجمالي المبيعات" size="sm" />
        <ProgressMetric label="هامش الربح" value={metrics.customerRevenue ? `${Math.round(((metrics.customerProfit || 0) / (metrics.customerRevenue || 1)) * 100)}%` : '0%'} percentage={metrics.customerRevenue ? Math.round(((metrics.customerProfit || 0) / (metrics.customerRevenue || 1)) * 100) : 0} color="#f97316" subtitle="صافي / إيراد" size="sm" />
      </div>
    </Card>
  );
};
