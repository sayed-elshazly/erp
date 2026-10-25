import React from 'react';
import { KpiCardConfig, KpiValueData, KpiSize } from '../../types/kpi.types';
import { Card } from '../common/Card';
import {
  TrendingUp,
  TrendingDown,
  Pin,
  Maximize2,
  Minimize2,
  EyeOff,
  Clock,
  Wallet,
  DollarSign,
  Scale,
  Receipt,
  Users,
  Award,
  Crown,
  Gift,
  Share2,
  CalendarCheck,
  UserCheck,
  Ticket,
  CheckCircle2,
  Flame
} from 'lucide-react';

interface SmartKpiCardProps {
  config: KpiCardConfig;
  data: KpiValueData;
  onClick: () => void;
  onTogglePin: (id: string) => void;
  onChangeSize: (id: string, size: KpiSize) => void;
  onHide: (id: string) => void;
}

export const SmartKpiCard: React.FC<SmartKpiCardProps> = ({
  config,
  data,
  onClick,
  onTogglePin,
  onChangeSize,
  onHide
}) => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'wallet':
        return <Wallet className="w-5 h-5" />;
      case 'trending_up':
        return <TrendingUp className="w-5 h-5" />;
      case 'dollar':
        return <DollarSign className="w-5 h-5" />;
      case 'scale':
        return <Scale className="w-5 h-5" />;
      case 'receipt':
        return <Receipt className="w-5 h-5" />;
      case 'users':
        return <Users className="w-5 h-5" />;
      case 'award':
        return <Award className="w-5 h-5" />;
      case 'crown':
        return <Crown className="w-5 h-5" />;
      case 'gift':
        return <Gift className="w-5 h-5" />;
      case 'share':
        return <Share2 className="w-5 h-5" />;
      case 'calendar':
        return <CalendarCheck className="w-5 h-5" />;
      case 'user_check':
        return <UserCheck className="w-5 h-5" />;
      case 'ticket':
        return <Ticket className="w-5 h-5" />;
      case 'check_circle':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'flame':
      default:
        return <Flame className="w-5 h-5" />;
    }
  };

  const getColorStyles = (color: string) => {
    switch (color) {
      case 'emerald':
        return {
          cardBg: 'bg-white dark:bg-[#18181B] hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 border-gray-200 dark:border-[#27272A] hover:border-emerald-500/50',
          iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
          textVal: 'text-emerald-600 dark:text-emerald-400',
          badgeTrend: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
        };
      case 'rose':
        return {
          cardBg: 'bg-white dark:bg-[#18181B] hover:bg-rose-500/5 dark:hover:bg-rose-500/10 border-gray-200 dark:border-[#27272A] hover:border-rose-500/50',
          iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
          textVal: 'text-rose-600 dark:text-rose-400',
          badgeTrend: 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
        };
      case 'amber':
        return {
          cardBg: 'bg-white dark:bg-[#18181B] hover:bg-amber-500/5 dark:hover:bg-amber-500/10 border-gray-200 dark:border-[#27272A] hover:border-amber-500/50',
          iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          textVal: 'text-amber-600 dark:text-amber-400',
          badgeTrend: 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
        };
      case 'blue':
        return {
          cardBg: 'bg-white dark:bg-[#18181B] hover:bg-blue-500/5 dark:hover:bg-blue-500/10 border-gray-200 dark:border-[#27272A] hover:border-blue-500/50',
          iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
          textVal: 'text-blue-600 dark:text-blue-400',
          badgeTrend: 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
        };
      case 'purple':
        return {
          cardBg: 'bg-white dark:bg-[#18181B] hover:bg-purple-500/5 dark:hover:bg-purple-500/10 border-gray-200 dark:border-[#27272A] hover:border-purple-500/50',
          iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
          textVal: 'text-purple-600 dark:text-purple-400',
          badgeTrend: 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
        };
      case 'orange':
      default:
        return {
          cardBg: 'bg-white dark:bg-[#18181B] hover:bg-orange-500/5 dark:hover:bg-orange-500/10 border-gray-200 dark:border-[#27272A] hover:border-orange-500/50',
          iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
          textVal: 'text-orange-600 dark:text-orange-500',
          badgeTrend: 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
        };
    }
  };

  const styles = getColorStyles(data.statusColor);

  const colSpanClass = {
    '1x': 'col-span-1',
    '2x': 'col-span-1 sm:col-span-2',
    '3x': 'col-span-1 sm:col-span-2 lg:col-span-3'
  }[config.size];

  return (
    <div
      onClick={onClick}
      className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-right flex flex-col justify-between ${styles.cardBg} ${colSpanClass} shadow-xs hover:shadow-md select-none`}
    >
      {/* Top Header: Title, Category Icon, Pin Indicator, Quick Control Menu */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl shrink-0 ${styles.iconBg}`}>
              {getIcon(data.iconName)}
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-orange-500 transition-colors flex items-center gap-1.5">
                <span>{config.title}</span>
                {config.isPinned && (
                  <Pin className="w-3 h-3 text-orange-500 fill-orange-500 transform rotate-45 shrink-0" />
                )}
              </h3>
              {data.subtitle && (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{data.subtitle}</p>
              )}
            </div>
          </div>

          {/* Card Quick Action Tools */}
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-[#18181B]/95 p-1 rounded-xl border border-gray-200 dark:border-[#27272A] shadow-sm"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => onTogglePin(config.id)}
              className={`p-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-zinc-800 ${
                config.isPinned ? 'text-orange-500' : ''
              }`}
              title={config.isPinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                const nextSize: KpiSize = config.size === '1x' ? '2x' : config.size === '2x' ? '3x' : '1x';
                onChangeSize(config.id, nextSize);
              }}
              className="p-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
              title="تغيير العرض (1x / 2x / 3x)"
            >
              {config.size === '1x' ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => onHide(config.id)}
              className="p-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-rose-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
              title="إخفاء البطاقة"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Current Metric Value */}
        <div className="my-2">
          <span className={`text-2xl lg:text-3xl font-black font-mono tracking-tight ${styles.textVal}`}>
            {data.value}
          </span>
        </div>
      </div>

      {/* Footer: Trend Percentage, Comparison Period, and Sync Status */}
      <div className="pt-2 border-t border-gray-100 dark:border-[#27272A] flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5 font-semibold">
          {data.changePercentage !== 0 && (
            <span
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono text-[10px] ${
                data.changeType === 'increase'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
              }`}
            >
              {data.changeType === 'increase' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {data.changePercentage > 0 ? `+${data.changePercentage}%` : `${data.changePercentage}%`}
            </span>
          )}
          <span className="truncate text-zinc-600 dark:text-zinc-400">{data.comparisonPeriodText}</span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
          <Clock className="w-2.5 h-2.5" />
          <span>{data.lastUpdated}</span>
        </div>
      </div>
    </div>
  );
};
