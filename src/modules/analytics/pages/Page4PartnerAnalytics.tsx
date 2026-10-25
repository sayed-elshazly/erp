// =============================================================
// NZM JKR TOP UP ERP — PAGE 4: Partner & Influencer Analytics
// Requirements: September 2026 Specification
// =============================================================

import React, { useState } from 'react';
import { PartnerAnalyticsItem } from '../../../types/analytics.types';
import { AdvancedBarChart, AdvancedGroupedBarChart } from '../../../components/charts/AdvancedBarChart';
import { AdvancedLineChart } from '../../../components/charts/AdvancedLineChart';
import { MiniDonutChart } from '../../../components/charts/MiniDonutChart';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { formatCurrency } from '../../../utils/formatters';
import { useNotifications } from '../../../context/NotificationContext';
import {
  Handshake,
  Store,
  Sparkles,
  TrendingUp,
  Award,
  DollarSign,
  Gift,
  Sliders,
  X,
  CheckCircle2,
  Share2
} from 'lucide-react';

interface Page4PartnerAnalyticsProps {
  partnerData: {
    partnersList: PartnerAnalyticsItem[];
    typeComparison: {
      type: 'partner' | 'shop' | 'influencer';
      typeLabel: string;
      newCustomersCount: number;
      revenue: number;
      repetitionRate: number;
    }[];
    distribution: {
      type: 'partner' | 'shop' | 'influencer';
      typeLabel: string;
      count: number;
      percentage: number;
      color: string;
    }[];
  };
  canManagePartners: boolean; // Permissions check
}

export const Page4PartnerAnalytics: React.FC<Page4PartnerAnalyticsProps> = ({
  partnerData,
  canManagePartners
}) => {
  const { showToast } = useNotifications();

  const [selectedPartner, setSelectedPartner] = useState<PartnerAnalyticsItem | null>(null);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('100');
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [newCommissionRate, setNewCommissionRate] = useState('2.5');

  const { partnersList, typeComparison, distribution } = partnerData;

  // 6.1 Rankings
  // بالعدد
  const byCount = [...partnersList].sort((a, b) => b.newCustomersCount - a.newCustomersCount);
  const chartByCount = byCount.slice(0, 10).map(p => ({
    label: p.partnerName,
    value: p.newCustomersCount,
    subValue: `${formatCurrency(p.revenueFromReferred)}`,
    color: '#3b82f6'
  }));

  // بالإيراد
  const byRevenue = [...partnersList].sort((a, b) => b.revenueFromReferred - a.revenueFromReferred);
  const chartByRevenue = byRevenue.slice(0, 10).map(p => ({
    label: p.partnerName,
    value: Math.round(p.revenueFromReferred),
    subValue: `${p.newCustomersCount} عميل`,
    color: '#f97316'
  }));

  // بالربح
  const byProfit = [...partnersList].sort((a, b) => b.profitFromReferred - a.profitFromReferred);
  const chartByProfit = byProfit.slice(0, 10).map(p => ({
    label: p.partnerName,
    value: Math.round(p.profitFromReferred),
    subValue: `هامش ${p.marginPercent}%`,
    color: '#10b981'
  }));

  // 6.3 Grouped chart data
  const groupedData = typeComparison.map(t => ({
    category: t.typeLabel,
    series: [
      { label: 'عملاء جدد', value: t.newCustomersCount, color: '#3b82f6' },
      { label: 'نسبة التكرار %', value: t.repetitionRate, color: '#10b981' }
    ]
  }));

  const handleSendReward = () => {
    if (!selectedPartner) return;
    showToast('success', 'تم إرسال المكافأة', `تمت إضافة مكافأة ${rewardAmount} جنيه لمحفظة الشريك ${selectedPartner.partnerName}`);
    setIsRewardModalOpen(false);
  };

  const handleUpdateRate = () => {
    if (!selectedPartner) return;
    showToast('success', 'تم تعديل النسبة', `تم تحديث نسبة عمولة الشريك ${selectedPartner.partnerName} إلى ${newCommissionRate}%`);
    setIsRateModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* 6.1 ترتيب الشركاء */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-500">
            <Handshake className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              6.1 لوحة ترتيب وتحليل الشركاء والمحلات والمشاهير
            </h3>
            <p className="text-xs text-zinc-400">
              قياس فعالية الشركاء في جلب لاعبين جدد وتوليد الإيرادات والربحية
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* أكثر الشركاء جلباً للعملاء (عدد) */}
          <div className="space-y-3">
            <AdvancedBarChart
              data={chartByCount}
              title="أكثر الشركاء جلبًا للعملاء (عدد) — هذا الشهر"
              xAxisLabel="أسماء الشركاء (أعلى 10)"
              yAxisLabel="عدد العملاء الجدد"
              barColor="#3b82f6"
              formatValue={v => `${v} عميل`}
            />

            <Card className="overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-gray-50/50 dark:bg-zinc-800/30">
                الترتيب بعدد العملاء
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2">شريك</th>
                      <th className="p-2">جدد</th>
                      <th className="p-2">إيراد</th>
                      <th className="p-2">تكرار %</th>
                      <th className="p-2">عمولة</th>
                      <th className="p-2 text-center">عرض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {byCount.slice(0, 4).map(p => (
                      <tr key={p.partnerId} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-2 font-bold text-zinc-900 dark:text-zinc-100">{p.partnerName}</td>
                        <td className="p-2 font-mono font-bold text-blue-500">{p.newCustomersCount}</td>
                        <td className="p-2 font-mono">{formatCurrency(p.revenueFromReferred)}</td>
                        <td className="p-2 font-mono">{p.repetitionRatePercent}%</td>
                        <td className="p-2 font-mono text-orange-500">{formatCurrency(p.dueCommission)}</td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => setSelectedPartner(p)}
                            className="p-1 px-2 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white font-bold text-[11px] transition-all"
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

          {/* أكثر الشركاء جلباً للعملاء (إيراد) */}
          <div className="space-y-3">
            <AdvancedBarChart
              data={chartByRevenue}
              title="أكثر الشركاء جلبًا للعملاء (إيراد) — هذا الشهر"
              xAxisLabel="أسماء الشركاء (أعلى 10)"
              yAxisLabel="إجمالي إيراد الوافدين"
              barColor="#f97316"
              formatValue={v => `${formatCurrency(v)}`}
            />

            <Card className="overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-gray-50/50 dark:bg-zinc-800/30">
                الترتيب بإجمالي الإيرادات
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2">شريك</th>
                      <th className="p-2">إيراد</th>
                      <th className="p-2">جدد</th>
                      <th className="p-2">متوسط</th>
                      <th className="p-2">ROI</th>
                      <th className="p-2 text-center">عرض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {byRevenue.slice(0, 4).map(p => (
                      <tr key={p.partnerId} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-2 font-bold text-zinc-900 dark:text-zinc-100">{p.partnerName}</td>
                        <td className="p-2 font-mono font-bold text-orange-500">{formatCurrency(p.revenueFromReferred)}</td>
                        <td className="p-2 font-mono">{p.newCustomersCount}</td>
                        <td className="p-2 font-mono text-zinc-500">{formatCurrency(p.newCustomersCount > 0 ? p.revenueFromReferred / p.newCustomersCount : 0)}</td>
                        <td className="p-2 font-mono text-emerald-500 font-bold">{p.roi}x</td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => setSelectedPartner(p)}
                            className="p-1 px-2 rounded-lg bg-orange-500/10 hover:bg-orange-500 text-orange-600 hover:text-white font-bold text-[11px] transition-all"
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

          {/* أكثر الشركاء ربحاً */}
          <div className="space-y-3">
            <AdvancedBarChart
              data={chartByProfit}
              title="أكثر الشركاء ربحًا — هذا الشهر"
              xAxisLabel="أسماء الشركاء (أعلى 10)"
              yAxisLabel="صافي الربح الفعلي"
              barColor="#10b981"
              formatValue={v => `${formatCurrency(v)}`}
            />

            <Card className="overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-gray-50/50 dark:bg-zinc-800/30">
                الترتيب بصافي الربح
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2">شريك</th>
                      <th className="p-2">ربح</th>
                      <th className="p-2">جدد</th>
                      <th className="p-2">هامش %</th>
                      <th className="p-2 text-center">عرض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {byProfit.slice(0, 4).map(p => (
                      <tr key={p.partnerId} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-2 font-bold text-zinc-900 dark:text-zinc-100">{p.partnerName}</td>
                        <td className="p-2 font-mono font-black text-emerald-500">{formatCurrency(p.profitFromReferred)}</td>
                        <td className="p-2 font-mono">{p.newCustomersCount}</td>
                        <td className="p-2 font-mono font-bold text-purple-500">{p.marginPercent}%</td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => setSelectedPartner(p)}
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
        </div>
      </div>

      {/* 6.3 مقارنة وتوزيع الأنواع */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-[#27272A]">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-500">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              6.3 مقارنة قنوات الشراكة: (شريك vs محل تجاري vs مشهور ستريمر)
            </h3>
            <p className="text-xs text-zinc-400">
              مقارنة جماعية لقياس القناة الأفضل والأعلى جدوى في استقطاب اللاعبين
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <AdvancedGroupedBarChart
              data={groupedData}
              title="مقارنة: شريك vs محل vs مشهور (أعمدة مجمعة)"
            />

            <Card className="overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-gray-50/50 dark:bg-zinc-800/30">
                جدول مقارنة أداء القنوات
              </div>
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                  <tr>
                    <th className="p-2.5">النوع</th>
                    <th className="p-2.5">عملاء جدد</th>
                    <th className="p-2.5">إيراد المحقق</th>
                    <th className="p-2.5">نسبة التكرار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                  {typeComparison.map((t, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                      <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">{t.typeLabel}</td>
                      <td className="p-2.5 font-mono font-bold text-blue-500">{t.newCustomersCount} عميل</td>
                      <td className="p-2.5 font-mono font-bold text-orange-500">{formatCurrency(t.revenue)}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-500">{t.repetitionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="space-y-3">
            <Card className="p-4 flex flex-col items-center justify-center space-y-4">
              <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 w-full text-right border-b border-gray-100 dark:border-[#27272A] pb-2">
                توزيع العملاء الجدد حسب النوع (Pie Chart)
              </h4>

              <MiniDonutChart
                segments={distribution.map(d => ({
                  label: d.typeLabel,
                  value: d.count,
                  color: d.color
                }))}
                centerLabel="الوافدون"
                centerValue={distribution.reduce((s, d) => s + d.count, 0)}
                size={140}
              />

              <div className="w-full space-y-2 text-xs">
                {distribution.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{d.typeLabel}</span>
                    </div>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{d.percentage}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 6.2 تفاصيل كل شريك (مودال التفاصيل) */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-right">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-[#27272A] w-full max-w-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-500" />
                <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  تفاصيل الشريك: {selectedPartner.partnerName} ({selectedPartner.profileType === 'shop' ? 'محل' : selectedPartner.profileType === 'influencer' ? 'مشهور' : 'شريك'})
                </h4>
              </div>
              <button onClick={() => setSelectedPartner(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <span className="text-zinc-400 block text-[11px]">عملاء جدد:</span>
                <span className="text-base font-black font-mono text-blue-600">{selectedPartner.newCustomersCount} عميل</span>
              </div>

              <div className="p-2.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                <span className="text-zinc-400 block text-[11px]">إيراد الوافدين:</span>
                <span className="text-base font-black font-mono text-orange-600">{formatCurrency(selectedPartner.revenueFromReferred)}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                <span className="text-zinc-400 block text-[11px]">نسبة التكرار:</span>
                <span className="text-base font-black font-mono text-purple-600">{selectedPartner.repetitionRatePercent}%</span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                <span className="text-zinc-400 block text-[11px]">عمولة مستحقة:</span>
                <span className="text-base font-black font-mono text-amber-600">{formatCurrency(selectedPartner.dueCommission)}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 col-span-2 sm:col-span-2">
                <span className="text-zinc-400 block text-[11px]">معدل العائد (ROI):</span>
                <span className="text-base font-black font-mono text-emerald-600">
                  {selectedPartner.roi}x (كل 1 جنيه عمولة حقق {selectedPartner.roi} جنيه إيراد)
                </span>
              </div>
            </div>

            {/* رسم بياني خطي — عملاء جدد على مدار الشهر */}
            <div className="pt-2">
              <AdvancedLineChart
                data={selectedPartner.dailySignups?.map(d => ({
                  label: `يوم ${d.date}`,
                  value: d.count
                })) || []}
                title="رسم بياني خطي — عملاء جدد على مدار الشهر"
                xAxisLabel="أيام الشهر (1 → 30)"
                yAxisLabel="عدد المسجلين الجدد"
                height={160}
                strokeColor="#3b82f6"
                formatValue={v => `${v} عميل`}
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#27272A]">
              <div className="flex items-center gap-2">
                {canManagePartners && (
                  <>
                    <button
                      onClick={() => setIsRewardModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>إرسال مكافأة</span>
                    </button>
                    <button
                      onClick={() => setIsRateModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-black text-xs shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>تعديل نسبة</span>
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setSelectedPartner(null)}
                className="px-4 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: إرسال مكافأة */}
      {isRewardModalOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in text-right">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-[#27272A] w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-500" />
              <span>إرسال مكافأة لشريك النجاح: {selectedPartner.partnerName}</span>
            </h4>
            <div className="space-y-1 text-xs">
              <label className="font-bold text-zinc-600 dark:text-zinc-300">مبلغ المكافأة (جنيه):</label>
              <input
                type="number"
                value={rewardAmount}
                onChange={e => setRewardAmount(e.target.value)}
                className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 font-mono font-bold text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setIsRewardModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-bold">إلغاء</button>
              <button onClick={handleSendReward} className="px-4 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-black">تحويل المكافأة</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: تعديل نسبة العمولة */}
      {isRateModalOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in text-right">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-[#27272A] w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-500" />
              <span>تعديل نسبة العمولة: {selectedPartner.partnerName}</span>
            </h4>
            <div className="space-y-1 text-xs">
              <label className="font-bold text-zinc-600 dark:text-zinc-300">النسبة المئوية الجديدة (%):</label>
              <input
                type="number"
                step="0.1"
                value={newCommissionRate}
                onChange={e => setNewCommissionRate(e.target.value)}
                className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 font-mono font-bold text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setIsRateModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-bold">إلغاء</button>
              <button onClick={handleUpdateRate} className="px-4 py-1.5 rounded-xl bg-purple-500 text-white text-xs font-black">حفظ النسبة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
