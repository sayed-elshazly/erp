// =============================================================
// NZM JKR TOP UP ERP — PAGE 7: Shifts & Cashier Analytics
// Requirements: September 2026 Specification
// =============================================================

import React from 'react';
import { ShiftAnalyticsSummary, ShiftAnalyticsItem } from '../../../types/analytics.types';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { AdvancedBarChart } from '../../../components/charts/AdvancedBarChart';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import {
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Award,
  DollarSign,
  TrendingUp,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

interface Page7ShiftsAnalyticsProps {
  shiftSummary: ShiftAnalyticsSummary;
}

export const Page7ShiftsAnalytics: React.FC<Page7ShiftsAnalyticsProps> = ({
  shiftSummary
}) => {
  const {
    totalShiftsCount,
    totalRevenue,
    totalProfit,
    averageShiftRevenue,
    averageTicketsPerShift,
    totalCashVariance,
    shiftsList,
    hourlyDistribution,
    topPerformingEmployees
  } = shiftSummary;

  // Chart data for Hourly Activity
  const hourlyChartData = hourlyDistribution
    .filter(h => h.ticketsCount > 0 || (h.hour >= 10 && h.hour <= 23))
    .map(h => ({
      label: h.hourLabel,
      value: h.ticketsCount,
      subValue: formatCurrency(h.revenue)
    }));

  // Top Cashiers Chart
  const topEmployeesChartData = topPerformingEmployees.slice(0, 6).map(e => ({
    label: e.name,
    value: Math.round(e.revenue),
    subValue: `${e.ticketsCount} تذكرة`,
    color: '#8b5cf6'
  }));

  const getGradeBadge = (grade: ShiftAnalyticsItem['performanceGrade']) => {
    switch (grade) {
      case 'A+':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">A+ مثالي</span>;
      case 'A':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400">A ممتاز</span>;
      case 'B':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400">B جيد</span>;
      case 'C':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-orange-500/15 text-orange-600 dark:text-orange-400">C يحتاج تحسين</span>;
      case 'Review':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400">مراجعة وفحص</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* 7.0 بطاقات المؤشرات العامة للورديات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 space-y-1 bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>إجمالي الورديات المنفذة</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">
            {totalShiftsCount} وردية
          </p>
          <span className="text-[11px] text-zinc-400">
            متوسط التذاكر / وردية: {averageTicketsPerShift}
          </span>
        </Card>

        <Card className="p-4 space-y-1 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>إجمالي مبيعات الورديات</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-500">
            {formatCurrency(totalRevenue)}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            صافي الربح: {formatCurrency(totalProfit)}
          </span>
        </Card>

        <Card className="p-4 space-y-1 bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/20">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>متوسط إيراد الوردية</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black font-mono text-purple-500">
            {formatCurrency(averageShiftRevenue)}
          </p>
          <span className="text-[11px] text-zinc-400">معدل التدفق لكل فترة عمل</span>
        </Card>

        <Card className={`p-4 space-y-1 bg-gradient-to-br to-transparent ${
          totalCashVariance === 0
            ? 'from-emerald-500/5 border-emerald-500/20'
            : totalCashVariance > 0
            ? 'from-blue-500/5 border-blue-500/20'
            : 'from-rose-500/5 border-rose-500/20'
        }`}>
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>إجمالي الفروقات النقدية</span>
            {totalCashVariance < 0 ? (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <p className={`text-xl font-black font-mono ${
            totalCashVariance === 0 ? 'text-emerald-500' : totalCashVariance > 0 ? 'text-blue-500' : 'text-rose-500'
          }`}>
            {totalCashVariance >= 0 ? `+${formatCurrency(totalCashVariance)}` : formatCurrency(totalCashVariance)}
          </p>
          <span className="text-[11px] text-zinc-400">
            {totalCashVariance === 0 ? 'مطابقة نقدية تامة 100%' : totalCashVariance < 0 ? 'عجز نقدي متراكم' : 'فائض نقدي'}
          </span>
        </Card>
      </div>

      {/* 7.1 الرسوم البيانية: ضغط العمل بالساعات وتنافسية الكاشير */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdvancedBarChart
          data={hourlyChartData}
          title="توزيع ضغط العمل وتدفق التذاكر على مدار ساعات اليوم (0 - 23)"
          xAxisLabel="ساعات العمل"
          yAxisLabel="عدد التذاكر المنفذة"
          barColor="#f97316"
          formatValue={v => `${v} تذكرة`}
        />

        <AdvancedBarChart
          data={topEmployeesChartData}
          title="ترتيب الموظفين والكاشير الأكثر تحقيقاً للإيرادات"
          xAxisLabel="أسماء الموظفين"
          yAxisLabel="إجمالي المبيعات (جنيه)"
          barColor="#8b5cf6"
          formatValue={v => `${formatCurrency(v)}`}
        />
      </div>

      {/* 7.2 جدول تسويات الورديات التفصيلي */}
      <Card className="overflow-hidden p-0 border border-gray-200 dark:border-zinc-800">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 font-black text-xs bg-gray-50/50 dark:bg-zinc-800/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span>سجل الورديات والتسويات مع تقييم الانضباط النقدي</span>
          </div>
          <span className="text-[11px] text-zinc-400">إجمالي {shiftsList.length} وردية</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-zinc-800">
              <tr>
                <th className="p-3">رقم الوردية</th>
                <th className="p-3">الموظف المسئول</th>
                <th className="p-3">القسم</th>
                <th className="p-3 text-center">التذاكر</th>
                <th className="p-3">الإيراد</th>
                <th className="p-3">المتوقع دفترياً</th>
                <th className="p-3">المسلّم فعلياً</th>
                <th className="p-3 text-center">الفارق النقدي</th>
                <th className="p-3 text-center">تقييم الانضباط</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {shiftsList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-400">
                    لا توجد ورديات أو تسويات مسجلة حتى الآن
                  </td>
                </tr>
              ) : (
                shiftsList.map((s, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {s.shiftNumber}
                    </td>
                    <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                      {s.employeeName}
                    </td>
                    <td className="p-3 text-zinc-500">
                      {s.department}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-orange-500">
                      {s.ticketsCount}
                    </td>
                    <td className="p-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(s.revenue)}
                    </td>
                    <td className="p-3 font-mono text-zinc-600 dark:text-zinc-400">
                      {formatCurrency(s.expectedCash)}
                    </td>
                    <td className="p-3 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      {formatCurrency(s.actualCash)}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                        s.difference === 0
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : s.difference > 0
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {s.difference >= 0 ? `+${formatCurrency(s.difference)}` : formatCurrency(s.difference)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {getGradeBadge(s.performanceGrade)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
