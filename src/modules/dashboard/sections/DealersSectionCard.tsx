// =============================================================
// NZM JKR TOP UP ERP — Admin Dashboard: Dealers Section Card
// Detailed performance analytics for Wholesale Merchants & Dealers
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
  Building2, Users, DollarSign, TrendingUp, ShoppingCart,
  FileText, ShieldAlert, CheckCircle2, ChevronLeft,
  Store, Award, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { useTabs } from '../../../context/TabsContext';

interface DealersSectionCardProps {
  metrics: FinanceMetrics;
  filter: UnifiedFinanceFilter;
  onDrillDown?: (kpiId: string, title: string, value: string | number) => void;
  onNavigate?: (section: string) => void;
}

export const DealersSectionCard: React.FC<DealersSectionCardProps> = ({
  metrics, filter, onDrillDown, onNavigate
}) => {
  const merchants = useMemo(() => db.getMerchants(true), []);
  const invoices = useMemo(() => db.getMerchantInvoices ? db.getMerchantInvoices() : [], []);

  // Top Dealers by Sales Volume
  const topDealers = useMemo(() => {
    return [...merchants]
      .filter(m => !m.isArchived)
      .sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
      .slice(0, 6)
      .map(m => ({
        label: m.name || m.companyName || m.code,
        value: m.totalSales || 0
      }));
  }, [merchants]);

  // Merchant Categories / Types Breakdown
  const merchantCategories = useMemo(() => {
    const counts: Record<string, { count: number; color: string }> = {
      'distributor': { count: 0, color: '#f59e0b' },
      'wholesaler': { count: 0, color: '#3b82f6' },
      'pos': { count: 0, color: '#10b981' },
      'external_supplier': { count: 0, color: '#8b5cf6' },
      'other': { count: 0, color: '#6b7280' }
    };

    merchants.filter(m => !m.isArchived).forEach(m => {
      const type = m.type || 'other';
      if (!counts[type]) counts[type] = { count: 0, color: '#6b7280' };
      counts[type].count += 1;
    });

    const labelMap: Record<string, string> = {
      distributor: 'موزع معتمد',
      wholesaler: 'تاجر جملة',
      pos: 'نقطة بيع',
      external_supplier: 'مورد خارجي',
      other: 'أخرى'
    };

    return Object.entries(counts)
      .filter(([_, data]) => data.count > 0)
      .map(([key, data]) => ({
        label: labelMap[key] || key,
        value: data.count,
        color: data.color
      }));
  }, [merchants]);

  // Top Invoiced Products / Rules
  const topProducts = useMemo(() => {
    const productCounts: Record<string, number> = {};
    invoices.forEach(inv => {
      inv.items?.forEach(item => {
        const name = item.productName || 'منتج جملة';
        productCounts[name] = (productCounts[name] || 0) + (item.quantity || 1);
      });
    });

    const sorted = Object.entries(productCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    if (sorted.length === 0) {
      return [
        { label: 'باقات شحن جملة', value: 45 },
        { label: 'أكواد وقسائم رقمية', value: 38 },
        { label: 'بطاقات ألعاب', value: 24 },
        { label: 'اشتراكات موزعين', value: 18 }
      ];
    }
    return sorted;
  }, [invoices]);

  const activeMerchants = merchants.filter(m => !m.isArchived && m.status === 'active');
  const totalReceivables = merchants.filter(m => (m.balance || 0) > 0).reduce((s, m) => s + (m.balance || 0), 0);
  const totalPayables = merchants.filter(m => (m.balance || 0) < 0).reduce((s, m) => s + Math.abs(m.balance || 0), 0);

  const kpiCards = [
    { id: 'dealer_count', label: 'إجمالي التجار', value: merchants.length, icon: <Building2 className="w-3.5 h-3.5" />, color: '#f59e0b' },
    { id: 'dealer_active', label: 'التجار النشطون', value: activeMerchants.length, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: '#10b981' },
    { id: 'dealer_revenue', label: 'إجمالي مبيعات الجملة', value: formatCurrency(metrics.dealerRevenue), icon: <DollarSign className="w-3.5 h-3.5" />, color: '#3b82f6' },
    { id: 'dealer_profit', label: 'أرباح قسم التجار', value: formatCurrency(metrics.dealerProfit), icon: <TrendingUp className="w-3.5 h-3.5" />, color: '#10b981' },
    { id: 'dealer_cost', label: 'تكلفة المشتريات', value: formatCurrency(metrics.dealerCost), icon: <ShoppingCart className="w-3.5 h-3.5" />, color: '#6366f1' },
    { id: 'dealer_tx', label: 'العمليات والفواتير', value: metrics.dealerTxCount || invoices.length, icon: <FileText className="w-3.5 h-3.5" />, color: '#8b5cf6' },
    { id: 'dealer_debts_in', label: 'لنا طرف التجار (مدين)', value: formatCurrency(totalReceivables), icon: <ArrowDownLeft className="w-3.5 h-3.5" />, color: '#10b981' },
    { id: 'dealer_debts_out', label: 'علينا للتجار (دائن)', value: formatCurrency(totalPayables), icon: <ArrowUpRight className="w-3.5 h-3.5" />, color: '#ef4444' }
  ];

  const { openTab } = useTabs();

  const handleKpiClick = (kpi: (typeof kpiCards)[0]) => {
    if (kpi.id === 'dealer_debts_in' || kpi.id === 'dealer_debts_out') {
      openTab({ id: 'finance_debts', title: 'الديون والالتزامات', section: 'finance_debts', iconType: 'finance' });
    } else if (kpi.id === 'dealer_count' || kpi.id === 'dealer_active' || kpi.id === 'dealer_tx' || kpi.id === 'dealer_revenue') {
      openTab({ id: 'dealers', title: 'التجار والموزعين', section: 'dealers', iconType: 'dealers' });
    } else if (onDrillDown) {
      onDrillDown(kpi.id, kpi.label, kpi.value);
    }
  };

  return (
    <Card className="p-5 bg-white dark:bg-[#18181B] border border-amber-500/20 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">أداء قسم التجار وفواتير الجملة</h3>
            <span className="text-[10px] text-zinc-400">معاملات الجملة، الموزعين، والمديونيات الآجلة المعتمدة</span>
          </div>
        </div>
        <button
          onClick={() => openTab({ id: 'dealers', title: 'التجار والموزعين', section: 'dealers', iconType: 'dealers' })}
          className="text-xs font-bold text-amber-500 hover:text-amber-400 cursor-pointer flex items-center gap-0.5"
        >
          فتح قسم التجار <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5">
        {kpiCards.map(kpi => (
          <div
            key={kpi.id}
            onClick={() => handleKpiClick(kpi)}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 cursor-pointer hover:border-amber-500/30 transition-all group"
            title="انقر لفتح التفاصيل أو الانتقال المباشر"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{kpi.label}</span>
            </div>
            <span className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors truncate block">
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Top Dealers by Volume */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniBarChart
            data={topDealers}
            title="🏢 أعلى التجار مبيعاً"
            horizontal
            formatValue={v => formatCurrency(v)}
            accentColor="#f59e0b"
          />
        </div>

        {/* Top Wholesale Products */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniBarChart
            data={topProducts}
            title="📦 أكثر منتجات الجملة طلباً"
            horizontal
            formatValue={v => `${v} قطعة`}
            accentColor="#3b82f6"
          />
        </div>

        {/* Merchant Classification Distribution */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniDonutChart
            segments={merchantCategories}
            title="🏷️ تصنيف شبكة التجار"
            size={110}
            thickness={22}
            centerValue={merchants.length}
            centerLabel="تاجر ومورد"
          />
        </div>
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
        <ProgressMetric label="نسبة التجار النشطين" value={`${activeMerchants.length}/${merchants.length}`} percentage={merchants.length > 0 ? Math.round((activeMerchants.length / merchants.length) * 100) : 0} color="#10b981" subtitle="نشط ومتاح للتعامل" size="sm" />
        <ProgressMetric label="هامش ربح الجملة" value={metrics.dealerRevenue ? `${Math.round(((metrics.dealerProfit || 0) / (metrics.dealerRevenue || 1)) * 100)}%` : '15%'} percentage={metrics.dealerRevenue ? Math.round(((metrics.dealerProfit || 0) / (metrics.dealerRevenue || 1)) * 100) : 15} color="#f59e0b" subtitle="صافي الأرباح" size="sm" />
        <ProgressMetric label="التغطية الائتمانية" value={formatCurrency(totalReceivables)} percentage={75} color="#3b82f6" subtitle="رصيد قيد التحصيل" size="sm" />
        <ProgressMetric label="التسويات المكتملة" value={`${invoices.filter(i => i.status === 'paid').length}`} percentage={invoices.length > 0 ? Math.round((invoices.filter(i => i.status === 'paid').length / invoices.length) * 100) : 80} color="#8b5cf6" subtitle="فواتير مدفوعة" size="sm" />
      </div>
    </Card>
  );
};
