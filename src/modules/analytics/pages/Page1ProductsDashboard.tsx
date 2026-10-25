// =============================================================
// NZM JKR TOP UP ERP — PAGE 1: Products & Games Dashboard
// Requirements: September 2026 Specification
// =============================================================

import React, { useState } from 'react';
import { GameAnalyticsItem, ProductAnalyticsItem } from '../../../types/analytics.types';
import { AdvancedBarChart } from '../../../components/charts/AdvancedBarChart';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { formatCurrency } from '../../../utils/formatters';
import {
  Gamepad2,
  Package,
  TrendingUp,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  X
} from 'lucide-react';

interface Page1ProductsDashboardProps {
  games: GameAnalyticsItem[];
  products: ProductAnalyticsItem[];
  onAnalyzeProduct?: (gameName: string, productName: string) => void;
}

export const Page1ProductsDashboard: React.FC<Page1ProductsDashboardProps> = ({
  games,
  products,
  onAnalyzeProduct
}) => {
  const [selectedItem, setSelectedItem] = useState<{
    type: 'game' | 'product';
    data: GameAnalyticsItem | ProductAnalyticsItem;
  } | null>(null);

  // 3.1 أكثر الألعاب مبيعاً (مرتب بتذاكر الشحن)
  const topSoldGames = [...games].sort((a, b) => b.ticketsCount - a.ticketsCount);
  const topSoldGamesChart = topSoldGames.slice(0, 10).map(g => ({
    label: g.gameName,
    value: g.ticketsCount,
    subValue: `${formatCurrency(g.revenue)}`
  }));

  // أكثر الألعاب ربحاً (مرتب بصافي الربح)
  const topProfitGames = [...games].sort((a, b) => b.profit - a.profit);
  const topProfitGamesChart = topProfitGames.slice(0, 10).map(g => ({
    label: g.gameName,
    value: Math.round(g.profit),
    subValue: `هامش ${g.marginPercent}%`,
    color: '#10b981'
  }));

  // 3.2 أكثر المنتجات مبيعاً (مرتب بعدد التذاكر)
  const topSoldProducts = [...products].sort((a, b) => b.ticketsCount - a.ticketsCount);
  const topSoldProductsChart = topSoldProducts.slice(0, 10).map(p => ({
    label: p.productName,
    value: p.ticketsCount,
    subValue: p.gameName
  }));

  // أكثر المنتجات ربحاً (مرتب بصافي الربح)
  const topProfitProducts = [...products].sort((a, b) => b.profit - a.profit);
  const topProfitProductsChart = topProfitProducts.slice(0, 10).map(p => ({
    label: p.productName,
    value: Math.round(p.profit),
    subValue: `هامش ${p.marginPercent}%`,
    color: '#10b981'
  }));

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* 3.1 القسم الأول: ترتيب الألعاب */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-500">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              3.1 لوحة ترتيب وتحليل الألعاب الأكثر نشاطاً
            </h3>
            <p className="text-xs text-zinc-400">
              تصنيف الألعاب حسب حجم الطلب وصافي العائد المالي المحقق
            </p>
          </div>
        </div>

        {/* شبكة الألعاب: مبيعاً vs ربحاً */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* أكثر الألعاب مبيعاً */}
          <div className="space-y-3">
            <AdvancedBarChart
              data={topSoldGamesChart}
              title="أكثر الألعاب مبيعًا — عدد تذاكر الشحن"
              xAxisLabel="أسماء الألعاب (أعلى 10)"
              yAxisLabel="عدد التذاكر المنفذة"
              barColor="#f97316"
              formatValue={v => `${v} تذكرة`}
            />

            <Card className="overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-gray-50/50 dark:bg-zinc-800/30">
                جدول ترتيب الألعاب الأكثر طلباً
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2.5">اللعبة</th>
                      <th className="p-2.5">تذاكر</th>
                      <th className="p-2.5">إيراد</th>
                      <th className="p-2.5">ربح</th>
                      <th className="p-2.5">نمو %</th>
                      <th className="p-2.5 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {topSoldGames.slice(0, 5).map((g, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">{g.gameName}</td>
                        <td className="p-2.5 font-mono font-bold text-orange-500">{g.ticketsCount}</td>
                        <td className="p-2.5 font-mono">{formatCurrency(g.revenue)}</td>
                        <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(g.profit)}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-bold ${g.growthPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {g.growthPercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(g.growthPercent)}%
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => setSelectedItem({ type: 'game', data: g })}
                            className="p-1 px-2 rounded-lg bg-orange-500/10 hover:bg-orange-500 text-orange-600 hover:text-white transition-all text-[11px] font-bold"
                          >
                            عرض تفاصيل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* أكثر الألعاب ربحاً */}
          <div className="space-y-3">
            <AdvancedBarChart
              data={topProfitGamesChart}
              title="أكثر الألعاب ربحًا — صافي الربح (جنيه)"
              xAxisLabel="أسماء الألعاب (أعلى 10)"
              yAxisLabel="صافي الربح الفعلي"
              barColor="#10b981"
              formatValue={v => `${formatCurrency(v)}`}
            />

            <Card className="overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-gray-50/50 dark:bg-zinc-800/30">
                جدول ترتيب الألعاب الأكثر ربحية
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2.5">اللعبة</th>
                      <th className="p-2.5">ربح</th>
                      <th className="p-2.5">تذاكر</th>
                      <th className="p-2.5">هامش %</th>
                      <th className="p-2.5">نمو %</th>
                      <th className="p-2.5 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {topProfitGames.slice(0, 5).map((g, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">{g.gameName}</td>
                        <td className="p-2.5 font-mono font-black text-emerald-500">{formatCurrency(g.profit)}</td>
                        <td className="p-2.5 font-mono text-zinc-600 dark:text-zinc-300">{g.ticketsCount}</td>
                        <td className="p-2.5 font-mono font-bold text-purple-500">{g.marginPercent}%</td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-bold ${g.growthPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {g.growthPercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(g.growthPercent)}%
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => setSelectedItem({ type: 'game', data: g })}
                            className="p-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all text-[11px] font-bold"
                          >
                            عرض تفاصيل
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

      {/* 3.2 القسم الثاني: ترتيب المنتجات */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-[#27272A]">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-500">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              3.2 لوحة ترتيب وتحليل الباقات والمنتجات
            </h3>
            <p className="text-xs text-zinc-400">
              تحليل تفصيلي لكل باقة شحن وبند داخل الألعاب
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* أكثر المنتجات مبيعاً */}
          <div className="space-y-3">
            <AdvancedBarChart
              data={topSoldProductsChart}
              title="أكثر المنتجات مبيعًا — عدد التذاكر"
              xAxisLabel="أسماء المنتجات (أعلى 10)"
              yAxisLabel="عدد الباقات المباعة"
              barColor="#8b5cf6"
              formatValue={v => `${v} باقة`}
            />

            <Card className="overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-gray-50/50 dark:bg-zinc-800/30">
                جدول أكثر المنتجات مبيعاً
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2.5">المنتج</th>
                      <th className="p-2.5">اللعبة</th>
                      <th className="p-2.5">تذاكر</th>
                      <th className="p-2.5">إيراد</th>
                      <th className="p-2.5">ربح</th>
                      <th className="p-2.5 text-center">تحليل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {topSoldProducts.slice(0, 5).map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">{p.productName}</td>
                        <td className="p-2.5 text-zinc-500">{p.gameName}</td>
                        <td className="p-2.5 font-mono font-bold text-purple-500">{p.ticketsCount}</td>
                        <td className="p-2.5 font-mono">{formatCurrency(p.revenue)}</td>
                        <td className="p-2.5 font-mono text-emerald-500 font-bold">{formatCurrency(p.profit)}</td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => {
                              if (onAnalyzeProduct) {
                                onAnalyzeProduct(p.gameName, p.productName);
                              } else {
                                setSelectedItem({ type: 'product', data: p });
                              }
                            }}
                            className="p-1 px-2 rounded-lg bg-purple-500/10 hover:bg-purple-500 text-purple-600 hover:text-white transition-all text-[11px] font-bold"
                          >
                            عرض تفاصيل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* أكثر المنتجات ربحاً */}
          <div className="space-y-3">
            <AdvancedBarChart
              data={topProfitProductsChart}
              title="أكثر المنتجات ربحًا — صافي الربح (جنيه)"
              xAxisLabel="أسماء المنتجات (أعلى 10)"
              yAxisLabel="صافي الربح الفعلي"
              barColor="#10b981"
              formatValue={v => `${formatCurrency(v)}`}
            />

            <Card className="overflow-hidden p-0">
              <div className="p-3 border-b border-gray-100 dark:border-[#27272A] font-bold text-xs bg-gray-50/50 dark:bg-zinc-800/30">
                جدول أكثر المنتجات ربحية
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2.5">المنتج</th>
                      <th className="p-2.5">اللعبة</th>
                      <th className="p-2.5">ربح</th>
                      <th className="p-2.5">تذاكر</th>
                      <th className="p-2.5">هامش %</th>
                      <th className="p-2.5 text-center">تحليل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {topProfitProducts.slice(0, 5).map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">{p.productName}</td>
                        <td className="p-2.5 text-zinc-500">{p.gameName}</td>
                        <td className="p-2.5 font-mono font-black text-emerald-500">{formatCurrency(p.profit)}</td>
                        <td className="p-2.5 font-mono text-zinc-600 dark:text-zinc-300">{p.ticketsCount}</td>
                        <td className="p-2.5 font-mono font-bold text-purple-500">{p.marginPercent}%</td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => {
                              if (onAnalyzeProduct) {
                                onAnalyzeProduct(p.gameName, p.productName);
                              } else {
                                setSelectedItem({ type: 'product', data: p });
                              }
                            }}
                            className="p-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all text-[11px] font-bold"
                          >
                            عرض تفاصيل
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

      {/* Modal: تفاصيل اللعبة / المنتج */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-right">
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-[#27272A] w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  تفاصيل: {'gameName' in selectedItem.data ? selectedItem.data.gameName : (selectedItem.data as any).productName}
                </h4>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400 block mb-1">إجمالي التذاكر المنفذة:</span>
                <span className="text-sm font-black font-mono text-orange-500">
                  {selectedItem.data.ticketsCount.toLocaleString('ar-EG')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400 block mb-1">إجمالي الإيرادات:</span>
                <span className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(selectedItem.data.revenue)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400 block mb-1">صافي الربح المحقق:</span>
                <span className="text-sm font-black font-mono text-emerald-500">
                  {formatCurrency(selectedItem.data.profit)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                <span className="text-zinc-400 block mb-1">هامش الربحية:</span>
                <span className="text-sm font-black font-mono text-purple-500">
                  {selectedItem.data.marginPercent}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
              >
                إغلاق
              </button>
              {'productName' in selectedItem.data && onAnalyzeProduct && (
                <button
                  onClick={() => {
                    const p = selectedItem.data as ProductAnalyticsItem;
                    onAnalyzeProduct(p.gameName, p.productName);
                    setSelectedItem(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-xs"
                >
                  الانتقال لتحليل السلوك الزمني
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
