// =============================================================
// NZM JKR TOP UP ERP — PAGE 2: Product Behavior & AI Insights
// 5 Time-Levels Charts + Automated Recommendations
// Requirements: September 2026 Specification
// =============================================================

import React, { useState, useEffect } from 'react';
import { CustomerTicket } from '../../../types/customer.types';
import { AnalyticsService } from '../../../services/analytics/analyticsService';
import { AdvancedLineChart } from '../../../components/charts/AdvancedLineChart';
import { AdvancedBarChart } from '../../../components/charts/AdvancedBarChart';
import { Card } from '../../../components/common/Card';
import { formatCurrency } from '../../../utils/formatters';
import {
  LineChart,
  Calendar,
  Clock,
  TrendingUp,
  Sparkles,
  Zap,
  ShieldAlert,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

interface Page2ProductBehaviorProps {
  tickets: CustomerTicket[];
  gamesList: { id: string; name: string }[];
  initialGameName?: string;
  initialProductName?: string;
}

export const Page2ProductBehavior: React.FC<Page2ProductBehaviorProps> = ({
  tickets,
  gamesList,
  initialGameName,
  initialProductName
}) => {
  // Available games and products dropdowns
  const [selectedGame, setSelectedGame] = useState<string>(initialGameName || (gamesList[0]?.name || 'ببجي موبايل (PUBG Mobile)'));
  const [selectedProduct, setSelectedProduct] = useState<string>(initialProductName || '660 UC');

  // Trigger state for [تحليل] button
  const [activeAnalysisProduct, setActiveAnalysisProduct] = useState<{
    game: string;
    product: string;
  }>({
    game: selectedGame,
    product: selectedProduct
  });

  // When props change, update
  useEffect(() => {
    if (initialGameName) setSelectedGame(initialGameName);
    if (initialProductName) {
      setSelectedProduct(initialProductName);
      setActiveAnalysisProduct({ game: initialGameName || selectedGame, product: initialProductName });
    }
  }, [initialGameName, initialProductName]);

  // Extract products belonging to current game from tickets
  const availableProducts = React.useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => {
      const matchGame = !selectedGame || t.gameName?.toLowerCase().includes(selectedGame.toLowerCase()) ||
        t.items?.some(it => it.gameName?.toLowerCase().includes(selectedGame.toLowerCase()));
      if (matchGame) {
        if (t.gameProductName) set.add(t.gameProductName);
        t.items?.forEach(it => {
          if (it.productName) set.add(it.productName);
        });
      }
    });

    const list = Array.from(set);
    if (list.length === 0) {
      return ['660 UC', '325 UC', '1800 UC', '3850 UC', '8100 UC'];
    }
    return list;
  }, [tickets, selectedGame]);

  // Make sure selectedProduct is valid
  useEffect(() => {
    if (availableProducts.length > 0 && !availableProducts.includes(selectedProduct)) {
      setSelectedProduct(availableProducts[0]);
    }
  }, [availableProducts, selectedProduct]);

  // Compute 5 time levels
  const timeDist = React.useMemo(() => {
    return AnalyticsService.getProductTimeDistribution(activeAnalysisProduct.product, tickets);
  }, [activeAnalysisProduct, tickets]);

  // Compute recommendations
  const totalMonthTickets = timeDist.monthlyTickets.reduce((s, m) => s + m.count, 0);
  const totalMonthRevenue = timeDist.monthlyTickets.reduce((s, m) => s + m.revenue, 0);
  const totalMonthProfit = timeDist.monthlyTickets.reduce((s, m) => s + m.profit, 0);
  const marginPercent = totalMonthRevenue > 0 ? Math.round((totalMonthProfit / totalMonthRevenue) * 100) : 22;

  const recommendations = React.useMemo(() => {
    return AnalyticsService.generateProductRecommendations({
      productName: activeAnalysisProduct.product,
      ticketsCount: totalMonthTickets,
      marginPercent,
      hourlyPeakHour: timeDist.peakHour,
      hourlyDipHour: timeDist.dipHour,
      growthPercent: 15,
      availableStock: 18
    });
  }, [activeAnalysisProduct, totalMonthTickets, marginPercent, timeDist]);

  const handleRunAnalysis = () => {
    setActiveAnalysisProduct({
      game: selectedGame,
      product: selectedProduct
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* 4.1 اختيار منتج للتحليل */}
      <Card className="p-4 bg-gradient-to-l from-orange-500/5 via-transparent to-purple-500/5 border border-orange-500/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>4.1 محدد دراسة وسلوك المنتج (Product Behavior Analyzer)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              اختر اللعبة والباقة لمشاهدة التوزيع الزمني الدقيق (شهري، أسبوعي، وساعي) والتوصيات الذكية
            </p>
          </div>

          {/* Form controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-zinc-500">اللعبة:</span>
              <select
                value={selectedGame}
                onChange={e => setSelectedGame(e.target.value)}
                className="p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold"
              >
                {gamesList.map(g => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-zinc-500">المنتج:</span>
              <select
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                className="p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold min-w-[140px]"
              >
                {availableProducts.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunAnalysis}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تحليل</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Product Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-[#27272A]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-400">تحليل منتج:</span>
          <span className="text-sm font-black text-orange-500 font-mono">
            {activeAnalysisProduct.product} ({activeAnalysisProduct.game})
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold">
            هذا الشهر
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-zinc-400 ml-1">إجمالي التذاكر:</span>
            <span className="font-black text-zinc-900 dark:text-zinc-100">{totalMonthTickets} تذكرة</span>
          </div>
          <div>
            <span className="text-zinc-400 ml-1">الإيراد:</span>
            <span className="font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(totalMonthRevenue)}</span>
          </div>
          <div>
            <span className="text-zinc-400 ml-1">صافي الربح:</span>
            <span className="font-black text-emerald-500">{formatCurrency(totalMonthProfit)}</span>
          </div>
        </div>
      </div>

      {/* 4.2 الرسوم البيانية الخمسة */}
      <div className="space-y-4">
        {/* 1. المبيعات الشهرية — عدد تذاكر */}
        <AdvancedLineChart
          data={timeDist.monthlyTickets.map(m => ({
            label: `يوم ${m.day}`,
            value: m.count
          }))}
          title="1. [ المبيعات الشهرية — عدد تذاكر ]"
          xAxisLabel="الأيام (1 → 30)"
          yAxisLabel="عدد التذاكر"
          strokeColor="#f97316"
          formatValue={v => `${v} تذكرة`}
        />

        {/* 2 & 3: الأسبوعية والساعية في عمودين */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 2. المبيعات الأسبوعية — عدد تذاكر */}
          <AdvancedBarChart
            data={timeDist.weeklyTickets.map(w => ({
              label: w.dayName,
              value: w.count
            }))}
            title="2. [ المبيعات الأسبوعية — عدد تذاكر ]"
            xAxisLabel="أيام الأسبوع (السبت → الجمعة)"
            yAxisLabel="عدد التذاكر"
            barColor="#3b82f6"
            formatValue={v => `${v} تذكرة`}
          />

          {/* 3. المبيعات اليومية بالساعة — عدد تذاكر */}
          <AdvancedBarChart
            data={timeDist.hourlyTickets.map(h => ({
              label: h.hourLabel,
              value: h.count,
              color: h.hour === timeDist.peakHour ? '#10b981' : h.hour === timeDist.dipHour ? '#f59e0b' : '#8b5cf6'
            }))}
            title="3. [ المبيعات اليومية بالساعة — عدد تذاكر ]"
            xAxisLabel="الساعات (12 ص → 11 م)"
            yAxisLabel="عدد التذاكر"
            formatValue={v => `${v} تذكرة`}
          />
        </div>

        {/* 4 & 5: الإيراد والربح الشهري */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 4. المبيعات الشهرية — إيراد */}
          <AdvancedLineChart
            data={timeDist.monthlyTickets.map(m => ({
              label: `يوم ${m.day}`,
              value: m.revenue
            }))}
            title="4. [ المبيعات الشهرية — إيراد (جنيه) ]"
            xAxisLabel="الأيام (1 → 30)"
            yAxisLabel="الإيراد (جنيه)"
            strokeColor="#3b82f6"
            fillColor="rgba(59, 130, 246, 0.12)"
            formatValue={v => `${formatCurrency(v)}`}
          />

          {/* 5. المبيعات الشهرية — ربح */}
          <AdvancedLineChart
            data={timeDist.monthlyTickets.map(m => ({
              label: `يوم ${m.day}`,
              value: m.profit
            }))}
            title="5. [ المبيعات الشهرية — ربح (جنيه) ]"
            xAxisLabel="الأيام (1 → 30)"
            yAxisLabel="الربح (جنيه)"
            strokeColor="#10b981"
            fillColor="rgba(16, 185, 129, 0.12)"
            formatValue={v => `${formatCurrency(v)}`}
          />
        </div>
      </div>

      {/* التوصيات التلقائية الذكية */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">
            توصيات خوارزمية الذكاء والتشغيل التلقائية (Automated Smart Insights)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recommendations.map((rec, idx) => (
            <Card
              key={idx}
              className="p-4 border-r-4 transition-all hover:scale-[1.01]"
              style={{ borderRightColor: rec.color || '#f97316' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black" style={{ color: rec.color || '#f97316' }}>
                  {rec.title}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 font-bold">
                  {rec.type === 'peak' ? 'ذروة نشاط' : rec.type === 'dip' ? 'فترة هبوط' : 'حركة السعر'}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-2">
                {rec.description}
              </p>
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-zinc-800/80 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 border border-gray-100 dark:border-zinc-700">
                💡 {rec.advice}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
