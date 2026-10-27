// =============================================================
// NZM JKR TOP UP ERP — PAGE 6: Platforms & Acquisition Analytics
// Requirements: September 2026 Specification
// =============================================================

import React, { useState } from 'react';
import { PlatformAnalyticsItem } from '../../../types/analytics.types';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { AdvancedBarChart } from '../../../components/charts/AdvancedBarChart';
import { formatCurrency } from '../../../utils/formatters';
import {
  Share2,
  TrendingUp,
  Globe,
  MessageCircle,
  Video,
  Store,
  UserCheck,
  Search,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';

interface Page6PlatformsAnalyticsProps {
  platforms: PlatformAnalyticsItem[];
}

export const Page6PlatformsAnalytics: React.FC<Page6PlatformsAnalyticsProps> = ({
  platforms
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformAnalyticsItem | null>(null);

  const totalRevenue = platforms.reduce((sum, p) => sum + p.revenue, 0);
  const totalProfit = platforms.reduce((sum, p) => sum + p.profit, 0);
  const totalTickets = platforms.reduce((sum, p) => sum + p.ticketsCount, 0);
  const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;

  // Chart data
  const revenueChartData = platforms.slice(0, 8).map(p => ({
    label: p.platformLabel.split('(')[0].trim(),
    value: p.revenue,
    subValue: `${formatCurrency(p.revenue)}`
  }));

  const profitChartData = platforms.slice(0, 8).map(p => ({
    label: p.platformLabel.split('(')[0].trim(),
    value: Math.round(p.profit),
    subValue: `هامش ${p.marginPercent}%`,
    color: '#10b981'
  }));

  const getPlatformIcon = (key: string) => {
    switch (key.toLowerCase()) {
      case 'facebook':
        return <Globe className="w-4 h-4 text-blue-600" />;
      case 'instagram':
        return <Share2 className="w-4 h-4 text-pink-600" />;
      case 'tiktok':
        return <Video className="w-4 h-4 text-purple-600" />;
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      case 'in_store':
        return <Store className="w-4 h-4 text-orange-600" />;
      case 'google':
        return <Search className="w-4 h-4 text-blue-500" />;
      default:
        return <UserCheck className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* 6.0 ملخص المؤشرات الرئيسية للمنصات والقنوات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 space-y-1 bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>إجمالي الإيرادات عبر القنوات</span>
            <Globe className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">
            {formatCurrency(totalRevenue)}
          </p>
          <span className="text-[11px] text-zinc-400">حصة شاملة لكافة المنصات</span>
        </Card>

        <Card className="p-4 space-y-1 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>صافي الأرباح المحققة</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-500">
            {formatCurrency(totalProfit)}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            متوسط الهامش: {avgMargin}%
          </span>
        </Card>

        <Card className="p-4 space-y-1 bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/20">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>إجمالي التذاكر والعمليات</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black font-mono text-purple-500">
            {totalTickets.toLocaleString('ar-EG')}
          </p>
          <span className="text-[11px] text-zinc-400">عملية شحن معتمدة</span>
        </Card>

        <Card className="p-4 space-y-1 bg-gradient-to-br from-orange-500/5 to-transparent border-orange-500/20">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>القناة الأكثر تحقيقاً للإيراد</span>
            <Sparkles className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 line-clamp-1">
            {platforms[0]?.platformLabel || 'غير محدد'}
          </p>
          <span className="text-[11px] text-orange-500 font-bold font-mono">
            {platforms[0] ? `${formatCurrency(platforms[0].revenue)} (${platforms[0].marketSharePercent}%)` : '-'}
          </span>
        </Card>
      </div>

      {/* 6.1 مقارنة الإيرادات والأرباح بين المنصات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdvancedBarChart
          data={revenueChartData}
          title="توزيع الإيرادات حسب قناة الاستقطاب والمنصة"
          xAxisLabel="المنصات والقنوات"
          yAxisLabel="إجمالي الإيرادات (جنيه)"
          barColor="#3b82f6"
          formatValue={v => `${formatCurrency(v)}`}
        />

        <AdvancedBarChart
          data={profitChartData}
          title="صافي الأرباح المحققة من كل منصة"
          xAxisLabel="المنصات والقنوات"
          yAxisLabel="صافي الربح الفعلي (جنيه)"
          barColor="#10b981"
          formatValue={v => `${formatCurrency(v)}`}
        />
      </div>

      {/* 6.2 جدول تفصيلي للمنصات وتوصيات الذكاء الاصطناعي */}
      <Card className="overflow-hidden p-0 border border-gray-200 dark:border-zinc-800">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 font-black text-xs bg-gray-50/50 dark:bg-zinc-800/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-orange-500" />
            <span>جدول أداء المنصات وقنوات الاستقطاب مع التوصيات الذكية</span>
          </div>
          <span className="text-[11px] text-zinc-400">مرتب تنازلياً حسب الإيراد</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-zinc-800">
              <tr>
                <th className="p-3">المنصة / القناة</th>
                <th className="p-3 text-center">العمليات</th>
                <th className="p-3">إجمالي الإيراد</th>
                <th className="p-3">صافي الربح</th>
                <th className="p-3 text-center">الهامش %</th>
                <th className="p-3">متوسط الطلب</th>
                <th className="p-3 text-center">الحصة %</th>
                <th className="p-3">توصية الذكاء الاصطناعي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {platforms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-400">
                    لا توجد بيانات قنوات مسجلة في الفترة المحددة
                  </td>
                </tr>
              ) : (
                platforms.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-gray-100 dark:bg-zinc-800">
                        {getPlatformIcon(p.platformId)}
                      </div>
                      <span>{p.platformLabel}</span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      {p.ticketsCount}
                    </td>
                    <td className="p-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(p.revenue)}
                    </td>
                    <td className="p-3 font-mono font-black text-emerald-500">
                      {formatCurrency(p.profit)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        {p.marginPercent}%
                      </span>
                    </td>
                    <td className="p-3 font-mono text-zinc-600 dark:text-zinc-400">
                      {formatCurrency(p.averageOrderValue)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {p.marketSharePercent}%
                      </span>
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-zinc-800/80 border border-gray-100 dark:border-zinc-700/60 text-[11px] text-zinc-700 dark:text-zinc-300 flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                        <span>{p.aiRecommendation}</span>
                      </div>
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
