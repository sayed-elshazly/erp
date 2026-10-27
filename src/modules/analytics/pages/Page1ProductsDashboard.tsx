import React, { useState, useMemo } from 'react';
import { GameAnalyticsItem, ProductAnalyticsItem, ClassifiedProductItem, SmartProductCategory } from '../../../types/analytics.types';
import { AnalyticsService } from '../../../services/analytics/analyticsService';
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
  Flame,
  AlertTriangle,
  Megaphone,
  CheckCircle2,
  X
} from 'lucide-react';

interface Page1ProductsDashboardProps {
  games: GameAnalyticsItem[];
  products: ProductAnalyticsItem[];
  classifiedProducts?: ClassifiedProductItem[];
  onAnalyzeProduct?: (gameName: string, productName: string) => void;
}

export const Page1ProductsDashboard: React.FC<Page1ProductsDashboardProps> = ({
  games,
  products,
  classifiedProducts,
  onAnalyzeProduct
}) => {
  const [selectedItem, setSelectedItem] = useState<{
    type: 'game' | 'product';
    data: GameAnalyticsItem | ProductAnalyticsItem;
  } | null>(null);

  // الفلتر المختار لتصنيف المنتجات بالذكاء المالي
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | SmartProductCategory>('all');

  // حساب التصنيف المالي الذكي
  const allClassified = useMemo(() => {
    return classifiedProducts || AnalyticsService.getClassifiedProducts(products);
  }, [classifiedProducts, products]);

  const winningCount = useMemo(() => allClassified.filter(c => c.category === 'winning').length, [allClassified]);
  const adWorthyCount = useMemo(() => allClassified.filter(c => c.category === 'ad_worthy').length, [allClassified]);
  const losingCount = useMemo(() => allClassified.filter(c => c.category === 'losing').length, [allClassified]);

  const displayedClassified = useMemo(() => {
    if (selectedCategoryFilter === 'all') return allClassified;
    return allClassified.filter(c => c.category === selectedCategoryFilter);
  }, [allClassified, selectedCategoryFilter]);

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
      {/* 3.0 القسم الذكي: التصنيف المالي وتوصيات الذكاء الاصطناعي للمنتجات */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>3.0 محرك الذكاء المالي وتصنيف المنتجات</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300">
                  خوارزمية ذكية
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                فرز تلقائي للباقات والخدمات: المنتجات الرابحة، فرص الإعلانات والميزانية، والمنتجات الخاسرة المرشحة للإلغاء
              </p>
            </div>
          </div>

          {/* فلتر الفئات */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedCategoryFilter === 'all'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-gray-200'
              }`}
            >
              الكل ({allClassified.length})
            </button>
            <button
              onClick={() => setSelectedCategoryFilter('winning')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                selectedCategoryFilter === 'winning'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>الرابحة ({winningCount})</span>
            </button>
            <button
              onClick={() => setSelectedCategoryFilter('ad_worthy')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                selectedCategoryFilter === 'ad_worthy'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>فرص الإعلانات ({adWorthyCount})</span>
            </button>
            <button
              onClick={() => setSelectedCategoryFilter('losing')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 ${
                selectedCategoryFilter === 'losing'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>خاسرة للإلغاء ({losingCount})</span>
            </button>
          </div>
        </div>

        {/* شبكة البطاقات المصنفة */}
        {displayedClassified.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 bg-gray-50/50 dark:bg-zinc-800/20 rounded-2xl border border-gray-100 dark:border-zinc-800">
            لا توجد منتجات مطابقة لهذا التصنيف في الفترة المحددة
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedClassified.slice(0, 6).map((item, idx) => (
              <Card
                key={idx}
                className={`p-4 space-y-3 transition-all border ${
                  item.category === 'winning'
                    ? 'border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-950/10'
                    : item.category === 'ad_worthy'
                    ? 'border-purple-500/30 bg-purple-500/[0.02] dark:bg-purple-950/10'
                    : item.category === 'losing'
                    ? 'border-rose-500/30 bg-rose-500/[0.02] dark:bg-rose-950/10'
                    : 'border-blue-500/20 bg-blue-500/[0.01]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 line-clamp-1">
                      {item.productName}
                    </h4>
                    <span className="text-[11px] text-zinc-400">{item.gameName}</span>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-black shrink-0"
                    style={{
                      backgroundColor: `${item.actionBadgeColor}20`,
                      color: item.actionBadgeColor
                    }}
                  >
                    {item.categoryLabel.split('(')[0].trim()}
                  </span>
                </div>

                {/* أرقام الباقة السريعة */}
                <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-gray-50 dark:bg-zinc-800/50 text-[11px] font-mono text-center">
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-sans">تذاكر</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.ticketsCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-sans">هامش %</span>
                    <span className="font-bold text-purple-500">{item.marginPercent}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-sans">صافي الربح</span>
                    <span className="font-bold text-emerald-500">{formatCurrency(item.profit)}</span>
                  </div>
                </div>

                {/* سبب الذكاء الاصطناعي والتوصية */}
                <div className="text-[11px] space-y-1.5 border-t border-gray-100 dark:border-zinc-800 pt-2">
                  <p className="text-zinc-600 dark:text-zinc-300 font-medium">
                    {item.categoryReason}
                  </p>
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200/60 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-200 font-bold flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                    <span>{item.recommendation}</span>
                  </div>
                </div>

                {/* زر التحليل المباشر */}
                {onAnalyzeProduct && (
                  <button
                    onClick={() => onAnalyzeProduct(item.gameName, item.productName)}
                    className="w-full py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>تحليل السلوك الزمني للباقة</span>
                  </button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 3.1 القسم الأول: ترتيب الألعاب */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-[#27272A]">
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
