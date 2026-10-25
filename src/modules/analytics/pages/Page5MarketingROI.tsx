// =============================================================
// NZM JKR TOP UP ERP — PAGE 5: Marketing ROI & Campaign Analytics
// Requirements: September 2026 Specification
// =============================================================

import React, { useState } from 'react';
import {
  MarketingCampaign,
  MarketingKPIs,
  MarketingPlatform,
  MarketingCampaignType
} from '../../../types/analytics.types';
import { AdvancedBarChart, AdvancedGroupedBarChart } from '../../../components/charts/AdvancedBarChart';
import { AdvancedLineChart } from '../../../components/charts/AdvancedLineChart';
import { MiniDonutChart } from '../../../components/charts/MiniDonutChart';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { useNotifications } from '../../../context/NotificationContext';
import {
  TrendingUp,
  Megaphone,
  Share2,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  CheckCircle2,
  X,
  Sparkles,
  PieChart,
  Layers
} from 'lucide-react';

interface Page5MarketingROIProps {
  marketingData: {
    kpis: MarketingKPIs;
    campaignsWithMetrics: (MarketingCampaign & {
      newCustomersCount: number;
      revenueGenerated: number;
      productsCost: number;
      netProfit: number;
      roi: number;
    })[];
    platformComparison: {
      platform: string;
      platformLabel: string;
      expenses: number;
      revenue: number;
      netProfit: number;
      roi: number;
    }[];
    platformExpensesDistribution: {
      platform: string;
      platformLabel: string;
      amount: number;
      percentage: number;
      color: string;
    }[];
    typeComparison: {
      type: string;
      typeLabel: string;
      expenses: number;
      revenue: number;
      netProfit: number;
      roi: number;
    }[];
  };
  onSaveCampaign: (campaign: MarketingCampaign) => void;
  canExport: boolean;
}

export const Page5MarketingROI: React.FC<Page5MarketingROIProps> = ({
  marketingData,
  onSaveCampaign,
  canExport
}) => {
  const { showToast } = useNotifications();

  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Campaign Form State
  const [campName, setCampName] = useState('');
  const [campType, setCampType] = useState<MarketingCampaignType>('ad');
  const [campPlatform, setCampPlatform] = useState<MarketingPlatform>('facebook');
  const [campAmount, setCampAmount] = useState('1000');
  const [campDate, setCampDate] = useState(new Date().toISOString().split('T')[0]);
  const [campNotes, setCampNotes] = useState('');

  const {
    kpis,
    campaignsWithMetrics,
    platformComparison,
    platformExpensesDistribution,
    typeComparison
  } = marketingData;

  // 7.2 ترتيب الحملات
  // أفضل 5 ROI
  const bestCampaigns = [...campaignsWithMetrics].sort((a, b) => b.roi - a.roi).slice(0, 5);
  const bestChart = bestCampaigns.map(c => ({
    label: c.campaignName,
    value: c.roi,
    subValue: `${formatCurrency(c.netProfit)} ربح`,
    color: '#10b981'
  }));

  // أسوأ 5 ROI
  const worstCampaigns = [...campaignsWithMetrics].sort((a, b) => a.roi - b.roi).slice(0, 5);
  const worstChart = worstCampaigns.map(c => ({
    label: c.campaignName,
    value: c.roi,
    subValue: `${formatCurrency(c.amount)} مصاريف`,
    color: '#ef4444'
  }));

  // منصات chart
  const platformRoiChart = platformComparison.map(p => ({
    label: p.platformLabel,
    value: p.roi,
    subValue: `${formatCurrency(p.expenses)} مصاريف`,
    color: '#3b82f6'
  }));

  // أنواع chart
  const typeRoiChart = typeComparison.map(t => ({
    label: t.typeLabel,
    value: t.roi,
    subValue: `${formatCurrency(t.expenses)} مصاريف`,
    color: '#8b5cf6'
  }));

  const handleCreateCampaignSubmit = () => {
    if (!campName.trim()) {
      showToast('error', 'بيانات ناقصة', 'يرجى إدخال اسم الحملة');
      return;
    }

    const newCamp: MarketingCampaign = {
      id: `camp_${Date.now()}`,
      campaignName: campName.trim(),
      type: campType,
      platform: campPlatform,
      amount: Number(campAmount) || 0,
      date: campDate,
      note: campNotes.trim()
    };

    onSaveCampaign(newCamp);
    showToast('success', 'تم إنشاء الحملة', 'تمت إضافة الحملة التسويقية لحسابات الـ ROI بنجاح');
    setIsAddModalOpen(false);
    setCampName('');
    setCampNotes('');
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* 7.1 المؤشرات السريعة */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-500">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                7.1 مؤشرات العائد التسويقي (Marketing Performance & ROI)
              </h3>
              <p className="text-xs text-zinc-400">
                قياس الجدوى المالية لميزانيات الإعلانات والحملات والعروض المروجة
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل حملة جديدة</span>
          </button>
        </div>

        {/* كروت الـ KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
            <span className="text-[11px] text-zinc-400 block mb-1">إجمالي مصاريف التسويق:</span>
            <div className="text-lg font-black font-mono text-zinc-900 dark:text-zinc-100">
              {formatCurrency(kpis.totalExpenses)}
            </div>
            <span className="text-[10px] text-zinc-400 mt-1 block">ميزانيات الإعلانات المعتمدة</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
            <span className="text-[11px] text-zinc-400 block mb-1">إجمالي إيراد من التسويق:</span>
            <div className="text-lg font-black font-mono text-blue-600 dark:text-blue-400">
              {formatCurrency(kpis.totalRevenue)}
            </div>
            <span className="text-[10px] text-zinc-400 mt-1 block">تذاكر اللاعبين القادمين من الحملات</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
            <span className="text-[11px] text-zinc-400 block mb-1">صافي الربح المحقق:</span>
            <div className="text-lg font-black font-mono text-emerald-500">
              {formatCurrency(kpis.totalNetProfit)}
            </div>
            <span className="text-[10px] text-zinc-400 mt-1 block">بعد خصم المصاريف وتكلفة البضاعة</span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-l from-emerald-500/10 via-transparent to-orange-500/10 border border-emerald-500/30 shadow-xs">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block mb-1">العائد التسويقي الإجمالي (ROI):</span>
            <div className="text-2xl font-black font-mono text-emerald-500">
              +{kpis.overallROI}%
            </div>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              كل 1 جنيه مصاريف جاب {(kpis.overallROI / 100).toFixed(1)} جنيه ربح
            </span>
          </div>
        </div>
      </div>

      {/* 7.2 ترتيب الحملات: أفضل وأسوأ ROI */}
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* أفضل الحملات */}
          <div className="space-y-3">
            <AdvancedBarChart
              data={bestChart}
              title="أفضل الحملات ROI — هذا الشهر"
              xAxisLabel="أسماء الحملات (أعلى 5)"
              yAxisLabel="العائد على الاستثمار ROI (%)"
              barColor="#10b981"
              formatValue={v => `+${v}%`}
            />

            <Card className="overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-emerald-50/20 dark:bg-emerald-950/10">
                جدول الحملات الأكثر ربحية (Top ROI)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2">الحملة</th>
                      <th className="p-2">مصاريف</th>
                      <th className="p-2">إيراد</th>
                      <th className="p-2">ربح</th>
                      <th className="p-2">ROI %</th>
                      <th className="p-2 text-center">عرض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {bestCampaigns.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-2 font-bold text-zinc-900 dark:text-zinc-100">{c.campaignName}</td>
                        <td className="p-2 font-mono">{formatCurrency(c.amount)}</td>
                        <td className="p-2 font-mono">{formatCurrency(c.revenueGenerated)}</td>
                        <td className="p-2 font-mono font-bold text-emerald-500">{formatCurrency(c.netProfit)}</td>
                        <td className="p-2 font-mono font-black text-emerald-600">+{c.roi}%</td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => setSelectedCampaign(c)}
                            className="p-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white font-bold text-[11px] transition-all"
                          >
                            عرض
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* أسوأ الحملات */}
          <div className="space-y-3">
            <AdvancedBarChart
              data={worstChart}
              title="أسوأ الحملات ROI — هذا الشهر"
              xAxisLabel="أسماء الحملات (أقل 5)"
              yAxisLabel="العائد على الاستثمار ROI (%)"
              barColor="#ef4444"
              formatValue={v => `${v}%`}
            />

            <Card className="overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-red-50/20 dark:bg-red-950/10">
                جدول الحملات الأقل كفاءة (Low ROI)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2">الحملة</th>
                      <th className="p-2">مصاريف</th>
                      <th className="p-2">إيراد</th>
                      <th className="p-2">ربح</th>
                      <th className="p-2">ROI %</th>
                      <th className="p-2 text-center">عرض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {worstCampaigns.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-2 font-bold text-zinc-900 dark:text-zinc-100">{c.campaignName}</td>
                        <td className="p-2 font-mono">{formatCurrency(c.amount)}</td>
                        <td className="p-2 font-mono">{formatCurrency(c.revenueGenerated)}</td>
                        <td className="p-2 font-mono font-bold text-zinc-600 dark:text-zinc-400">{formatCurrency(c.netProfit)}</td>
                        <td className="p-2 font-mono font-bold text-red-500">{c.roi}%</td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => setSelectedCampaign(c)}
                            className="p-1 px-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white font-bold text-[11px] transition-all"
                          >
                            عرض
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 7.3 & 7.4 تحليل المنصات والأنواع */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-[#27272A]">
        {/* 7.3 تحليل المنصات */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-500" />
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">
              7.3 مقارنة المنصات الإعلانية وتوزيع المصاريف
            </h4>
          </div>

          <AdvancedBarChart
            data={platformRoiChart}
            title="مقارنة المنصات — نسبة الـ ROI %"
            xAxisLabel="المنصة (فيسبوك / إنستا / تيك توك)"
            yAxisLabel="العائد %"
            barColor="#3b82f6"
            formatValue={v => `${v}%`}
          />

          <Card className="p-4 space-y-4">
            <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 border-b border-gray-100 dark:border-[#27272A] pb-2">
              توزيع المصاريف حسب المنصة (Pie Chart)
            </h5>
            <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
              <MiniDonutChart
                segments={platformExpensesDistribution.map(p => ({
                  label: p.platformLabel,
                  value: p.amount,
                  color: p.color
                }))}
                centerLabel="المصاريف"
                centerValue={formatCurrency(kpis.totalExpenses)}
                size={130}
              />
              <div className="space-y-2 text-xs">
                {platformExpensesDistribution.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{p.platformLabel}:</span>
                    <span className="font-mono text-zinc-500">{p.percentage}% ({formatCurrency(p.amount)})</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* 7.4 تحليل الأنواع */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-500" />
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">
              7.4 مقارنة أنواع الحملات (إعلانات / مسابقات / عروض)
            </h4>
          </div>

          <AdvancedBarChart
            data={typeRoiChart}
            title="مقارنة الأنواع — العائد ROI %"
            xAxisLabel="نوع الحملة"
            yAxisLabel="العائد %"
            barColor="#8b5cf6"
            formatValue={v => `${v}%`}
          />

          <Card className="overflow-hidden p-0">
            <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-purple-50/20 dark:bg-purple-950/10">
              جدول أداء الأنواع التسويقية
            </div>
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                <tr>
                  <th className="p-2.5">النوع</th>
                  <th className="p-2.5">مصاريف</th>
                  <th className="p-2.5">إيراد</th>
                  <th className="p-2.5">ربح</th>
                  <th className="p-2.5">ROI %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {typeComparison.map((t, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                    <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">{t.typeLabel}</td>
                    <td className="p-2.5 font-mono">{formatCurrency(t.expenses)}</td>
                    <td className="p-2.5 font-mono text-blue-500">{formatCurrency(t.revenue)}</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-500">{formatCurrency(t.netProfit)}</td>
                    <td className="p-2.5 font-mono font-black text-purple-600">+{t.roi}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {/* 7.5 تفاصيل كل حملة (Modal) */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-right">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-[#27272A] w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-orange-500" />
                <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  تفاصيل حملة: {selectedCampaign.campaignName}
                </h4>
              </div>
              <button onClick={() => setSelectedCampaign(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400 block text-[11px]">مصاريف الحملة:</span>
                <span className="font-black font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(selectedCampaign.amount)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400 block text-[11px]">عملاء جدد:</span>
                <span className="font-black font-mono text-blue-500">{selectedCampaign.newCustomersCount} عميل</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400 block text-[11px]">إيراد الجدد:</span>
                <span className="font-black font-mono text-orange-500">{formatCurrency(selectedCampaign.revenueGenerated)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400 block text-[11px]">تكلفة المنتجات (FIFO):</span>
                <span className="font-black font-mono text-zinc-600 dark:text-zinc-400">{formatCurrency(selectedCampaign.productsCost)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <span className="text-zinc-400 block text-[11px]">صافي الربح:</span>
                <span className="font-black font-mono text-emerald-500">{formatCurrency(selectedCampaign.netProfit)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                <span className="text-zinc-400 block text-[11px]">معدل الـ ROI:</span>
                <span className="font-black font-mono text-purple-600">+{selectedCampaign.roi}%</span>
              </div>
            </div>

            {/* رسم بياني خطي — إيراد الحملة على مدار الشهر */}
            <div className="pt-2">
              <AdvancedLineChart
                data={Array.from({ length: 30 }, (_, i) => ({
                  label: `يوم ${i + 1}`,
                  value: Math.round(selectedCampaign.revenueGenerated * (Math.sin(i / 4) * 0.05 + 0.033))
                }))}
                title="رسم بياني خطي — إيراد الحملة على مدار الشهر"
                xAxisLabel="أيام الشهر (1 → 30)"
                yAxisLabel="الإيراد اليومي (جنيه)"
                height={160}
                strokeColor="#10b981"
                fillColor="rgba(16, 185, 129, 0.12)"
                formatValue={v => `${formatCurrency(v)}`}
              />
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: تسجيل حملة جديدة */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-right">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-[#27272A] w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" />
                <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  تسجيل حملة تسويقية جديدة
                </h4>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-300 mb-1">اسم الحملة:</label>
                <input
                  type="text"
                  placeholder="مثال: إعلانات موسم رمضان ببجي"
                  value={campName}
                  onChange={e => setCampName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 font-bold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-300 mb-1">نوع الحملة:</label>
                  <select
                    value={campType}
                    onChange={e => setCampType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 font-bold text-xs"
                  >
                    <option value="ad">إعلان ممول</option>
                    <option value="contest">مسابقة وسحب</option>
                    <option value="offer">عرض أو باقة خاصة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-300 mb-1">المنصة:</label>
                  <select
                    value={campPlatform}
                    onChange={e => setCampPlatform(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 font-bold text-xs"
                  >
                    <option value="facebook">فيسبوك</option>
                    <option value="instagram">إنستغرام</option>
                    <option value="tiktok">تيك توك</option>
                    <option value="snapchat">سناب شات</option>
                    <option value="google">جوجل</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-300 mb-1">مبلغ المصاريف (جنيه):</label>
                  <input
                    type="number"
                    value={campAmount}
                    onChange={e => setCampAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-300 mb-1">تاريخ الإطلاق:</label>
                  <input
                    type="date"
                    value={campDate}
                    onChange={e => setCampDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-300 mb-1">ملاحظات / الرابط المروج:</label>
                <textarea
                  value={campNotes}
                  onChange={e => setCampNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateCampaignSubmit}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-xs"
              >
                حفظ وبدء التتبع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
