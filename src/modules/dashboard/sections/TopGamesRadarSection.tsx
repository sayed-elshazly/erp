// =============================================================
// NZM JKR TOP UP ERP — Admin Dashboard: Top Games & Products Radar
// Analytics, revenue share, ticket volume, and direct game filtering
// =============================================================

import React, { useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { db } from '../../../database/db';
import { formatCurrency } from '../../../utils/formatters';
import { getGameBadgeStyle } from '../../../utils/gameBadgeColors';
import { Gamepad2, TrendingUp, ChevronLeft, Ticket, Flame } from 'lucide-react';
import { useTabs } from '../../../context/TabsContext';
import { UnifiedFinanceFilter } from '../../../types/finance.types';

interface TopGamesRadarSectionProps {
  filter?: UnifiedFinanceFilter;
  onSelectGameFilter?: (gameName: string) => void;
}

export const TopGamesRadarSection: React.FC<TopGamesRadarSectionProps> = ({
  onSelectGameFilter
}) => {
  const { openTab } = useTabs();

  const gameStats = useMemo(() => {
    const tickets = db.getTickets();
    const statsMap: Record<string, { count: number; revenue: number; profit: number }> = {};
    let totalRevenue = 0;

    tickets.forEach(t => {
      if (t.status === 'completed' || t.status === 'in_progress') {
        const game = t.gameName || 'أخرى';
        const rev = t.requiredAmount || 0;
        const profit = t.totalProfitMargin ?? t.netProfit ?? Math.max(0, (t.requiredAmount || 0) - (t.totalCostAmount || 0));
        totalRevenue += rev;

        if (!statsMap[game]) {
          statsMap[game] = { count: 0, revenue: 0, profit: 0 };
        }
        statsMap[game].count++;
        statsMap[game].revenue += rev;
        statsMap[game].profit += profit;
      }
    });

    const list = Object.entries(statsMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
        profit: data.profit,
        sharePercentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return { list, totalRevenue };
  }, []);

  const handleOpenTicketsWithGame = (gameName: string) => {
    if (onSelectGameFilter) {
      onSelectGameFilter(gameName);
    } else {
      openTab({
        id: 'tickets',
        title: `تذاكر: ${gameName}`,
        section: 'tickets',
        iconType: 'tickets'
      });
    }
  };

  return (
    <Card className="p-5 bg-white dark:bg-[#18181B] border border-emerald-500/20 space-y-4 text-right transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-[#27272A] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                رادار الألعاب والخدمات الأكثر طلباً وإيراداً
              </h3>
              <Badge variant="success" size="sm">
                <Flame className="w-3 h-3 text-orange-400" />
                الأعلى طلباً
              </Badge>
            </div>
            <span className="text-[10px] text-zinc-400 block font-medium">
              توزيع الإيرادات والأرباح الصافية وحجم التذاكر حسب اللعبة
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openTab({ id: 'tickets', title: 'تذاكر الشحن', section: 'tickets', iconType: 'tickets' })}
          className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors p-1"
        >
          <span>عرض كافة التذاكر</span>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {gameStats.list.map((item, idx) => {
          const badgeStyle = getGameBadgeStyle(item.name);

          return (
            <div
              key={item.name}
              onClick={() => handleOpenTicketsWithGame(item.name)}
              className="p-3.5 rounded-2xl bg-gray-50/50 dark:bg-zinc-900/40 border border-gray-100 dark:border-[#27272A] hover:border-emerald-500/40 cursor-pointer transition-all group hover:scale-[1.01]"
              title={`انقر لتصفية التذاكر بحسب ${item.name}`}
            >
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black flex items-center justify-center font-mono">
                    #{idx + 1}
                  </span>
                  <h4 className="font-black text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-400 transition-colors">
                    {item.name}
                  </h4>
                </div>

                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${badgeStyle}`}>
                  {item.sharePercentage}% من السوق
                </span>
              </div>

              {/* Progress Bar for Revenue Share */}
              <div className="w-full bg-gray-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${item.sharePercentage}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-gray-100/60 dark:border-zinc-800/60">
                <div>
                  <span className="text-[10px] text-zinc-400 block font-medium">الطلبات:</span>
                  <strong className="font-mono text-zinc-800 dark:text-zinc-200 font-bold">{item.count}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block font-medium">الإيراد:</span>
                  <strong className="font-mono text-emerald-500 font-bold">{formatCurrency(item.revenue)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block font-medium">الربح:</span>
                  <strong className="font-mono text-amber-400 font-bold">{formatCurrency(item.profit)}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
