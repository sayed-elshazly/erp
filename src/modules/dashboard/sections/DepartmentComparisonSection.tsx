// =============================================================
// NZM JKR TOP UP ERP — Admin Dashboard: Department Comparison Section
// Comparative analysis across all 4 departments with interactive tables & charts
// =============================================================

import React, { useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { ComparisonTable, ComparisonRow } from '../../../components/charts/ComparisonTable';
import { MiniBarChart } from '../../../components/charts/MiniBarChart';
import { MiniDonutChart } from '../../../components/charts/MiniDonutChart';
import { FinanceMetrics, UnifiedFinanceFilter } from '../../../types/finance.types';
import { formatCurrency } from '../../../utils/formatters';
import { Layers, ArrowLeftRight, TrendingUp, PieChart, BarChart3 } from 'lucide-react';

interface DepartmentComparisonSectionProps {
  metrics: FinanceMetrics;
  filter: UnifiedFinanceFilter;
  onDrillDown?: (kpiId: string, title: string, value: string | number) => void;
  onNavigate?: (section: string) => void;
}

export const DepartmentComparisonSection: React.FC<DepartmentComparisonSectionProps> = ({
  metrics, filter, onDrillDown, onNavigate
}) => {
  const custRev = metrics.customerRevenue || 0;
  const dealRev = metrics.dealerRevenue || 0;
  const midRev = metrics.middlemanRevenue || 0;
  const subRev = metrics.subscriptionsRevenue || 0;
  const totalRev = metrics.totalRevenue || (custRev + dealRev + midRev + subRev);

  const custProfit = metrics.customerProfit || 0;
  const dealProfit = metrics.dealerProfit || 0;
  const midProfit = metrics.middlemanProfit || 0;
  const subProfit = metrics.subscriptionsProfit || 0;
  const totalProfit = metrics.grossProfit || (custProfit + dealProfit + midProfit + subProfit);

  const custTx = metrics.customerTxCount || 0;
  const dealTx = metrics.dealerTxCount || 0;
  const midTx = metrics.middlemanTxCount || 0;
  const subTx = metrics.subscriptionsTxCount || 0;
  const totalTx = metrics.totalOperationsCount || (custTx + dealTx + midTx + subTx);

  const custCost = metrics.customerCost || 0;
  const dealCost = metrics.dealerCost || 0;
  const midCost = metrics.middlemanCost || 0;
  const subCost = metrics.subscriptionsCost || 0;
  const totalCost = custCost + dealCost + midCost + subCost;

  // Comparison Table Rows
  const comparisonRows: ComparisonRow[] = [
    {
      label: 'إجمالي الإيرادات والمبيعات',
      customers: custRev,
      dealers: dealRev,
      middleman: midRev,
      subscriptions: subRev,
      total: totalRev,
      isCurrency: true
    },
    {
      label: 'تكلفة العمليات والمنتجات',
      customers: custCost,
      dealers: dealCost,
      middleman: midCost,
      subscriptions: subCost,
      total: totalCost,
      isCurrency: true
    },
    {
      label: 'صافي الربح المباشر',
      customers: custProfit,
      dealers: dealProfit,
      middleman: midProfit,
      subscriptions: subProfit,
      total: totalProfit,
      isCurrency: true
    },
    {
      label: 'عدد العمليات والطلبات',
      customers: custTx,
      dealers: dealTx,
      middleman: midTx,
      subscriptions: subTx,
      total: totalTx
    },
    {
      label: 'هامش الربح التشغيلي',
      customers: custRev > 0 ? Math.round((custProfit / custRev) * 100) : 0,
      dealers: dealRev > 0 ? Math.round((dealProfit / dealRev) * 100) : 0,
      middleman: midRev > 0 ? Math.round((midProfit / midRev) * 100) : 0,
      subscriptions: subRev > 0 ? Math.round((subProfit / subRev) * 100) : 0,
      total: totalRev > 0 ? Math.round((totalProfit / totalRev) * 100) : 0,
      isPercentage: true
    },
    {
      label: 'الحصة من إجمالي الإيراد',
      customers: totalRev > 0 ? Math.round((custRev / totalRev) * 100) : 0,
      dealers: totalRev > 0 ? Math.round((dealRev / totalRev) * 100) : 0,
      middleman: totalRev > 0 ? Math.round((midRev / totalRev) * 100) : 0,
      subscriptions: totalRev > 0 ? Math.round((subRev / totalRev) * 100) : 0,
      total: 100,
      isPercentage: true
    }
  ];

  // Revenue by Department for Donut Chart
  const revenueSegments = [
    { label: 'الزبائن والشحن', value: custRev, color: '#f97316' },
    { label: 'التجار والموزعين', value: dealRev, color: '#f59e0b' },
    { label: 'الوساطة والحسابات', value: midRev, color: '#8b5cf6' },
    { label: 'الاشتراكات الرقمية', value: subRev, color: '#ec4899' }
  ];

  // Profit by Department for Bar Chart
  const profitBars = [
    { label: 'الزبائن', value: custProfit, color: '#f97316' },
    { label: 'التجار', value: dealProfit, color: '#f59e0b' },
    { label: 'الوساطة', value: midProfit, color: '#8b5cf6' },
    { label: 'الاشتراكات', value: subProfit, color: '#ec4899' }
  ];

  // Operations by Department for Bar Chart
  const opsBars = [
    { label: 'الزبائن', value: custTx, color: '#f97316' },
    { label: 'التجار', value: dealTx, color: '#f59e0b' },
    { label: 'الوساطة', value: midTx, color: '#8b5cf6' },
    { label: 'الاشتراكات', value: subTx, color: '#ec4899' }
  ];

  const handleCellClick = (dept: string, metric: string) => {
    const navMap: Record<string, string> = {
      customers: 'customer_dashboard',
      dealers: 'dealer_dashboard',
      middleman: 'middleman_dashboard',
      subscriptions: 'subscriptions_dashboard'
    };
    if (navMap[dept]) {
      onNavigate?.(navMap[dept]);
    }
  };

  return (
    <Card className="p-5 bg-white dark:bg-[#18181B] border border-blue-500/20 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/30">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">مقارنة أداء الأقسام الأربعة</h3>
            <span className="text-[10px] text-zinc-400">تحليل مقارن دقيق للإيرادات، التكاليف، الأرباح، وحجم العمليات مع ضمان استقلالية السجلات</span>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="p-3 rounded-2xl bg-gray-50/50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
        <ComparisonTable
          rows={comparisonRows}
          title="📋 جدول المقارنة التفصيلي بين الأقسام"
          onCellClick={handleCellClick}
        />
      </div>

      {/* Comparative Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue Share Donut */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniDonutChart
            segments={revenueSegments}
            title="💰 حصة الإيرادات حسب القسم"
            size={120}
            thickness={24}
            centerValue={formatCurrency(totalRev)}
            centerLabel="إجمالي الإيراد"
            formatValue={v => formatCurrency(v)}
          />
        </div>

        {/* Profit by Department Bar Chart */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniBarChart
            data={profitBars}
            title="📈 الأرباح الصافية لكل قسم"
            horizontal
            formatValue={v => formatCurrency(v)}
          />
        </div>

        {/* Operations Count Bar Chart */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800">
          <MiniBarChart
            data={opsBars}
            title="⚡ عدد العمليات والطلبات"
            horizontal
            formatValue={v => `${v.toLocaleString('ar-EG')} عملية`}
          />
        </div>
      </div>
    </Card>
  );
};
