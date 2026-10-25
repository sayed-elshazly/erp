// =============================================================
// NZM JKR TOP UP ERP — PAGE 3: Customer Segments & Offer Analytics
// Requirements: September 2026 Specification
// =============================================================

import React, { useState } from 'react';
import { CustomerSegmentItem } from '../../../types/analytics.types';
import { AdvancedBarChart } from '../../../components/charts/AdvancedBarChart';
import { MiniDonutChart } from '../../../components/charts/MiniDonutChart';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { useNotifications } from '../../../context/NotificationContext';
import {
  Users,
  Award,
  Zap,
  Clock,
  Gift,
  Send,
  Eye,
  Percent,
  CheckCircle2,
  X,
  Sparkles,
  TrendingUp,
  UserCheck
} from 'lucide-react';

interface Page3CustomerAnalyticsProps {
  customerSegments: {
    frequentBuyers: CustomerSegmentItem[];
    bigSpenders: CustomerSegmentItem[];
    dormantCustomers: CustomerSegmentItem[];
    firstShipmentChurn: {
      totalFirstShipment: number;
      returnedCount: number;
      churnedCount: number;
      returnRatePercent: number;
      churnRatePercent: number;
      churnedCustomers: CustomerSegmentItem[];
    };
    firstShipmentOfferROI: {
      totalBeneficiaries: number;
      returnedCount: number;
      returnRatePercent: number;
      totalRevenueFromReturned: number;
      offerCost: number;
      roiPercent: number;
    };
  };
  canSendOffers: boolean; // Permissions check (Admin / Manager only)
}

export const Page3CustomerAnalytics: React.FC<Page3CustomerAnalyticsProps> = ({
  customerSegments,
  canSendOffers
}) => {
  const { showToast } = useNotifications();

  // Modals state
  const [viewingCustomer, setViewingCustomer] = useState<CustomerSegmentItem | null>(null);
  const [offerTargetCustomer, setOfferTargetCustomer] = useState<CustomerSegmentItem | null>(null);
  const [offerType, setOfferType] = useState<'discount_coupon' | 'bonus_cashback' | 'free_diamonds'>('discount_coupon');
  const [offerMessage, setOfferMessage] = useState('عرض خاص لعودتك: كود خصم 20% على شحنتك القادمة!');

  const {
    frequentBuyers,
    bigSpenders,
    dormantCustomers,
    firstShipmentChurn,
    firstShipmentOfferROI
  } = customerSegments;

  // Chart data
  const frequentChart = frequentBuyers.slice(0, 10).map(c => ({
    label: c.customerName,
    value: c.ticketsCount,
    subValue: `${formatCurrency(c.totalSpent)}`,
    color: '#3b82f6'
  }));

  const spendersChart = bigSpenders.slice(0, 10).map(c => ({
    label: c.customerName,
    value: Math.round(c.totalSpent),
    subValue: `${c.ticketsCount} تذكرة`,
    color: '#10b981'
  }));

  const dormantChart = dormantCustomers.slice(0, 10).map(c => ({
    label: c.customerName,
    value: Math.round(c.totalSpent),
    subValue: formatDate(c.lastPurchaseDate),
    color: '#ef4444'
  }));

  const handleSendOfferSubmit = () => {
    if (!offerTargetCustomer) return;
    showToast('success', 'تم إرسال العرض بنجاح', `تم توجيه العرض للعميل ${offerTargetCustomer.customerName} عبر الرسائل وقسائم الحساب`);
    setOfferTargetCustomer(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* 5.1 شرائح العملاء */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              5.1 شرائح وسلوكيات العملاء (Customer Segmentation)
            </h3>
            <p className="text-xs text-zinc-400">
              تصنيف العملاء حسب وتيرة الشحن، إجمالي الإنفاق، والعملاء الخاملين المنقطعين
            </p>
          </div>
        </div>

        {/* كروت الرسوم البيانية والجداول */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* عملاء كثيرو الشحن */}
          <div className="space-y-3">
            <AdvancedBarChart
              data={frequentChart}
              title="عملاء كثيرو الشحن — هذا الشهر"
              xAxisLabel="أسماء العملاء (أعلى 10)"
              yAxisLabel="عدد التذاكر"
              barColor="#3b82f6"
              formatValue={v => `${v} تذكرة`}
            />

            <Card className="overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-gray-50/50 dark:bg-zinc-800/30">
                جدول عملاء كثيري الشحن
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2.5">العميل</th>
                      <th className="p-2.5">تذاكر</th>
                      <th className="p-2.5">إيراد</th>
                      <th className="p-2.5">متوسط تذكرة</th>
                      <th className="p-2.5">ولاء</th>
                      <th className="p-2.5 text-center">عرض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {frequentBuyers.slice(0, 5).map(c => (
                      <tr key={c.customerId} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">{c.customerName}</td>
                        <td className="p-2.5 font-mono font-bold text-blue-500">{c.ticketsCount}</td>
                        <td className="p-2.5 font-mono">{formatCurrency(c.totalSpent)}</td>
                        <td className="p-2.5 font-mono text-zinc-500">{formatCurrency(c.averageTicketValue)}</td>
                        <td className="p-2.5">
                          <Badge variant="info" size="sm">{c.loyaltyTier}</Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => setViewingCustomer(c)}
                            className="p-1 px-2 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white transition-all text-[11px] font-bold"
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

          {/* عملاء كبار الإنفاق */}
          <div className="space-y-3">
            <AdvancedBarChart
              data={spendersChart}
              title="عملاء كبار الإنفاق (Whales & VIP) — هذا الشهر"
              xAxisLabel="أسماء العملاء (أعلى 10)"
              yAxisLabel="إجمالي مدفوع (جنيه)"
              barColor="#10b981"
              formatValue={v => `${formatCurrency(v)}`}
            />

            <Card className="overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-gray-50/50 dark:bg-zinc-800/30">
                جدول كبار المنفقين
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2.5">العميل</th>
                      <th className="p-2.5">مدفوع</th>
                      <th className="p-2.5">تذاكر</th>
                      <th className="p-2.5">متوسط تذكرة</th>
                      <th className="p-2.5">ولاء</th>
                      <th className="p-2.5 text-center">عرض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {bigSpenders.slice(0, 5).map(c => (
                      <tr key={c.customerId} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">{c.customerName}</td>
                        <td className="p-2.5 font-mono font-black text-emerald-500">{formatCurrency(c.totalSpent)}</td>
                        <td className="p-2.5 font-mono text-zinc-600 dark:text-zinc-300">{c.ticketsCount}</td>
                        <td className="p-2.5 font-mono text-zinc-500">{formatCurrency(c.averageTicketValue)}</td>
                        <td className="p-2.5">
                          <Badge variant="warning" size="sm">{c.loyaltyTier}</Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => setViewingCustomer(c)}
                            className="p-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all text-[11px] font-bold"
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

        {/* عملاء خاملون — آخر شراء من 30+ يوم */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-red-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>عملاء خاملون — لم يقوموا بأي عملية شحن منذ 30+ يوم ({dormantCustomers.length} عميل)</span>
            </h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <AdvancedBarChart
                data={dormantChart}
                title="أعلى العملاء الخاملين قيمة سابقة"
                xAxisLabel="العميل"
                yAxisLabel="إنفاق سابق (جنيه)"
                barColor="#ef4444"
                formatValue={v => `${formatCurrency(v)}`}
              />
            </div>

            <Card className="lg:col-span-2 overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-red-50/30 dark:bg-red-950/10 flex items-center justify-between">
                <span>سجل العملاء الخاملين وفرص إعادة التنشيط</span>
                <span className="text-[10px] text-zinc-400">ينصح بإرسال كوبونات حصرية</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2.5">العميل</th>
                      <th className="p-2.5">الهاتف</th>
                      <th className="p-2.5">تاريخ آخر شراء</th>
                      <th className="p-2.5">إجمالي سابق</th>
                      <th className="p-2.5 text-center">إجراء الاسترداد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {dormantCustomers.slice(0, 6).map(c => (
                      <tr key={c.customerId} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">{c.customerName}</td>
                        <td className="p-2.5 font-mono text-zinc-500">{c.customerPhone}</td>
                        <td className="p-2.5 font-mono text-red-500 font-bold">{formatDate(c.lastPurchaseDate)}</td>
                        <td className="p-2.5 font-mono font-bold text-zinc-700 dark:text-zinc-300">{formatCurrency(c.totalSpent)}</td>
                        <td className="p-2.5 text-center">
                          {canSendOffers ? (
                            <button
                              onClick={() => setOfferTargetCustomer(c)}
                              className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-black text-[11px] shadow-xs flex items-center gap-1 mx-auto transition-all"
                            >
                              <Send className="w-3 h-3" />
                              <span>إرسال عرض</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-400">صلاحية مسؤول</span>
                          )}
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

      {/* 5.2 فعالية العروض وعملاء أول شحنة */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-[#27272A]">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-500">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              5.2 فعالية العروض الترويجية والاحتفاظ بالعملاء (Offer Retention & ROI)
            </h3>
            <p className="text-xs text-zinc-400">
              قياس نسبة العملاء الذين عادوا للشحن بعد العروض مقابل من اختفوا بعد أول شحنة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* عملاء أول شحنة فقط (اختفوا بعد العرض) */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-2">
              <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                عملاء أول شحنة فقط — سلوك ما بعد العرض
              </h4>
              <span className="text-xs font-mono font-black text-orange-500">
                إجمالي: {firstShipmentChurn.totalFirstShipment} عميل
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
              <MiniDonutChart
                segments={[
                  { label: 'رجعوا شحنوا تاني', value: firstShipmentChurn.returnedCount, color: '#10b981' },
                  { label: 'اختفوا بعد العرض', value: firstShipmentChurn.churnedCount, color: '#ef4444' }
                ]}
                centerLabel="نسبة العودة"
                centerValue={`${firstShipmentChurn.returnRatePercent}%`}
                size={130}
              />

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-zinc-600 dark:text-zinc-300">رجعوا شحنوا تاني:</span>
                  <span className="font-mono font-bold text-emerald-500">{firstShipmentChurn.returnedCount} عميل ({firstShipmentChurn.returnRatePercent}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-zinc-600 dark:text-zinc-300">اختفوا بعد العرض:</span>
                  <span className="font-mono font-bold text-red-500">{firstShipmentChurn.churnedCount} عميل ({firstShipmentChurn.churnRatePercent}%)</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <div className="text-[11px] font-bold text-zinc-500 mb-2">قائمة العملاء الذين اختفوا:</div>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {firstShipmentChurn.churnedCustomers.map(c => (
                  <div key={c.customerId} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-zinc-800/50 text-xs">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{c.customerName}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">أول شحنة: {formatDate(c.firstShipmentDate || c.lastPurchaseDate)}</span>
                    </div>
                    {canSendOffers && (
                      <button
                        onClick={() => setOfferTargetCustomer(c)}
                        className="px-2 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500 text-orange-600 hover:text-white font-bold text-[10px] transition-all"
                      >
                        إرسال عرض
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* فعالية العرض: أول شحنة مجانية وحساب الـ ROI */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-2">
              <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                فعالية العرض: أول شحنة مجانية (Campaign ROI)
              </h4>
              <Badge variant="success" size="sm">عائد استثماري إيجابي</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <span className="text-zinc-500 block mb-1 text-[11px]">إجمالي من استفادوا:</span>
                <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400">
                  {firstShipmentOfferROI.totalBeneficiaries} عميل
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <span className="text-zinc-500 block mb-1 text-[11px]">رجعوا شحنوا تاني:</span>
                <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {firstShipmentOfferROI.returnedCount} عميل ({firstShipmentOfferROI.returnRatePercent}%)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                <span className="text-zinc-500 block mb-1 text-[11px]">إجمالي إيراد من اللي رجعوا:</span>
                <span className="text-base font-black font-mono text-purple-600 dark:text-purple-400">
                  {formatCurrency(firstShipmentOfferROI.totalRevenueFromReturned)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                <span className="text-zinc-500 block mb-1 text-[11px]">تكلفة العرض المباشرة:</span>
                <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                  {formatCurrency(firstShipmentOfferROI.offerCost)}
                </span>
              </div>
            </div>

            {/* معادلة الـ ROI الرياضية */}
            <div className="p-3.5 rounded-xl bg-gradient-to-l from-emerald-500/10 via-transparent to-orange-500/10 border border-emerald-500/30 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">معدل العائد على تكلفة العرض (ROI):</span>
                <span className="text-lg font-black font-mono text-emerald-500">
                  +{firstShipmentOfferROI.roiPercent}%
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-400">
                المعادلة: (إيراد العائدين {formatCurrency(firstShipmentOfferROI.totalRevenueFromReturned)} − التكلفة {formatCurrency(firstShipmentOfferROI.offerCost)}) ÷ التكلفة = {firstShipmentOfferROI.roiPercent}%
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: عرض بروفايل العميل */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-right">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-[#27272A] w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-500" />
                <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  بيانات العميل: {viewingCustomer.customerName}
                </h4>
              </div>
              <button onClick={() => setViewingCustomer(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400 block mb-1">رقم الهاتف:</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{viewingCustomer.customerPhone || 'غير مسجل'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400 block mb-1">مستوى الولاء:</span>
                <span className="font-bold text-orange-500">{viewingCustomer.loyaltyTier}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400 block mb-1">إجمالي تذاكر الشحن:</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{viewingCustomer.ticketsCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400 block mb-1">إجمالي ما تم دفعه:</span>
                <span className="font-mono font-black text-emerald-500">{formatCurrency(viewingCustomer.totalSpent)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 col-span-2">
                <span className="text-zinc-400 block mb-1">تاريخ آخر عملية شحن:</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatDate(viewingCustomer.lastPurchaseDate)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <button
                onClick={() => setViewingCustomer(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: إرسال عرض مخصص */}
      {offerTargetCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-right">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-[#27272A] w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-orange-500" />
                <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  إرسال عرض ترويجي: {offerTargetCustomer.customerName}
                </h4>
              </div>
              <button onClick={() => setOfferTargetCustomer(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-300 mb-1">نوع العرض:</label>
                <select
                  value={offerType}
                  onChange={e => setOfferType(e.target.value as any)}
                  className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 font-bold"
                >
                  <option value="discount_coupon">كوبون خصم فوري (20%)</option>
                  <option value="bonus_cashback">كاش باك مضاعف على الشحنة القادمة</option>
                  <option value="free_diamonds">باقة نقاط مجانية إضافية</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-300 mb-1">نص الرسالة الترويجية:</label>
                <textarea
                  value={offerMessage}
                  onChange={e => setOfferMessage(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 font-bold text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <button
                onClick={() => setOfferTargetCustomer(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleSendOfferSubmit}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال العرض الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
