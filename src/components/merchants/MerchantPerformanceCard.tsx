import React from 'react';
import { MerchantPerformance } from '../../types/merchant.types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  ShieldCheck,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Calendar,
  Sparkles
} from 'lucide-react';

interface MerchantPerformanceCardProps {
  performance: MerchantPerformance;
  merchantName: string;
}

export const MerchantPerformanceCard: React.FC<MerchantPerformanceCardProps> = ({
  performance,
  merchantName
}) => {
  const getBadgeStyle = (badge?: string) => {
    switch (badge) {
      case 'Excellent Trader':
        return {
          bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: <Flame className="w-4 h-4 text-emerald-500 fill-emerald-500" />,
          label: 'تاجر ممتاز (Excellent Trader)'
        };
      case 'Trusted Partner':
        return {
          bg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
          icon: <ShieldCheck className="w-4 h-4 text-blue-500" />,
          label: 'شريك موثوق (Trusted Partner)'
        };
      case 'Needs Attention':
        return {
          bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
          icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
          label: 'يحتاج لمتابعة (Needs Attention)'
        };
      default:
        return {
          bg: 'bg-gray-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
          icon: <Sparkles className="w-4 h-4 text-zinc-400" />,
          label: 'تقييم قياسي (Standard)'
        };
    }
  };

  const badgeInfo = getBadgeStyle(performance.badge);

  return (
    <Card className="p-5 space-y-5 text-right border border-gray-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-xs">
      {/* Top Header: Score & Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-[#27272A]">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              تقييم الأداء والالتزام الذكي (Smart Trader Rating)
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            يتم احتساب التقييم تلقائياً وبشكل دوري من سجل المعاملات وسرعة السداد والالتزام
          </p>
        </div>

        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${badgeInfo.bg}`}>
          {badgeInfo.icon}
          <span>{badgeInfo.label}</span>
        </div>
      </div>

      {/* Main Stats Gauge Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Score 0 - 100 */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200/80 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">التقييم العام المئوي</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black font-mono text-orange-500">{performance.overallScore}</span>
              <span className="text-xs text-zinc-400 font-mono">/ 100</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        {/* 5 Stars Rating */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200/80 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">التقييم النجمي</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-3xl font-black font-mono text-amber-500">{performance.starRating}</span>
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(performance.starRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-zinc-300 dark:text-zinc-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <Star className="w-6 h-6 fill-amber-500" />
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200/80 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">اتجاه تطور الأداء</span>
            <div className="flex items-center gap-1.5 mt-1">
              {performance.trend === 'up' ? (
                <span className="text-emerald-500 font-bold text-sm flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> صاعد (Trend Up)
                </span>
              ) : performance.trend === 'down' ? (
                <span className="text-rose-500 font-bold text-sm flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" /> هابط (Trend Down)
                </span>
              ) : (
                <span className="text-blue-500 font-bold text-sm flex items-center gap-1">
                  <Minus className="w-4 h-4" /> مستقر (Stable)
                </span>
              )}
            </div>
          </div>
          <div
            className={`p-3 rounded-xl ${
              performance.trend === 'up'
                ? 'bg-emerald-500/10 text-emerald-500'
                : performance.trend === 'down'
                ? 'bg-rose-500/10 text-rose-500'
                : 'bg-blue-500/10 text-blue-500'
            }`}
          >
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sub-Metrics Breakdown Bars */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">تفاصيل مؤشرات الأداء الحقيقية</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Timeliness */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 font-semibold">
              <span>الالتزام بمواعيد التسليم والشحن</span>
              <span className="font-mono text-emerald-500 font-bold">{performance.deliveryTimelinessScore}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${performance.deliveryTimelinessScore}%` }}
              />
            </div>
          </div>

          {/* Execution Speed */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 font-semibold">
              <span>سرعة تنفيذ وتجهيز الطلبات</span>
              <span className="font-mono text-blue-500 font-bold">{performance.executionSpeedScore}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${performance.executionSpeedScore}%` }}
              />
            </div>
          </div>

          {/* Repayment Speed */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 font-semibold">
              <span>سرعة السداد والالتزام المالي</span>
              <span className="font-mono text-amber-500 font-bold">{performance.repaymentSpeedScore}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${performance.repaymentSpeedScore}%` }}
              />
            </div>
          </div>

          {/* Agreement Commitment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 font-semibold">
              <span>استقرار الأسعار والالتزام بالعقود</span>
              <span className="font-mono text-purple-500 font-bold">{performance.agreementCommitmentScore}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${performance.agreementCommitmentScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Historical Trend Timeline (Last Periods) */}
      {performance.historicalScores && performance.historicalScores.length > 0 && (
        <div className="pt-3 border-t border-gray-100 dark:border-[#27272A]">
          <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span>سجل تطور التقييم خلال الفترات السابقة</span>
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            {performance.historicalScores.map((h, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200/60 dark:border-[#27272A]">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">{h.period}</span>
                <span className="text-sm font-black font-mono text-orange-500 mt-0.5 block">{h.score} نقطة</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Impact Factor & Alerts */}
      <div className="p-3.5 rounded-xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 flex items-center justify-between text-xs">
        <span className="text-zinc-700 dark:text-zinc-300">
          <strong className="text-orange-500 ml-1">العامل الأكثر تأثيراً في التقييم:</strong>
          {performance.primaryImpactingFactor}
        </span>
        <span className="text-[10px] text-zinc-400 font-mono">
          أفضل شهر: {performance.bestMonth}
        </span>
      </div>
    </Card>
  );
};
