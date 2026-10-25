import React from 'react';
import { TrustScoreData, TrustTier } from '../../types/merchant.types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Award,
  Crown,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
  Clock,
  DollarSign,
  Package,
  FileCheck,
  ThumbsUp,
  ThumbsDown,
  Layers
} from 'lucide-react';

interface TrustScoreCardProps {
  trustScore: TrustScoreData;
  merchantName: string;
}

export const TrustScoreCard: React.FC<TrustScoreCardProps> = ({ trustScore, merchantName }) => {
  const getTierVisuals = (tier: TrustTier) => {
    switch (tier) {
      case 'elite':
        return {
          bgBadge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
          textColor: 'text-purple-500',
          progressColor: 'bg-purple-500',
          icon: <Crown className="w-5 h-5 text-purple-500 fill-purple-500" />,
          label: 'شريك نخبوي فائق الأمان (Elite Partner 🌟)'
        };
      case 'gold':
        return {
          bgBadge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          textColor: 'text-amber-500',
          progressColor: 'bg-amber-500',
          icon: <Award className="w-5 h-5 text-amber-500 fill-amber-500" />,
          label: 'مورد ذهبي / تاجر مفضل (Gold / Preferred 🥇)'
        };
      case 'trusted':
        return {
          bgBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          textColor: 'text-emerald-500',
          progressColor: 'bg-emerald-500',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
          label: 'شريك تجاري موثوق (Trusted Partner 🟢)'
        };
      case 'average':
        return {
          bgBadge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
          textColor: 'text-blue-500',
          progressColor: 'bg-blue-500',
          icon: <ShieldCheck className="w-5 h-5 text-blue-500" />,
          label: 'متوسط / قياسي (Average 🟡)'
        };
      case 'risky':
        return {
          bgBadge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
          textColor: 'text-orange-500',
          progressColor: 'bg-orange-500',
          icon: <ShieldAlert className="w-5 h-5 text-orange-500" />,
          label: 'عالي المخاطر الائتمانية (Risky 🟠)'
        };
      case 'blocked':
      default:
        return {
          bgBadge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
          textColor: 'text-rose-500',
          progressColor: 'bg-rose-500',
          icon: <ShieldX className="w-5 h-5 text-rose-500" />,
          label: 'محظور التعامل الآجل (Blocked / Critical 🚨)'
        };
    }
  };

  const tierInfo = getTierVisuals(trustScore.tier);

  // 15 factors configuration with Arabic labels and respective weights
  const factorItems = [
    { label: 'الالتزام بمواعيد السداد', weight: '12%', score: trustScore.factors.paymentTimeliness, key: 'paymentTimeliness' },
    { label: 'الالتزام بمواعيد التسليم والتوريد', weight: '10%', score: trustScore.factors.deliveryTimeliness, key: 'deliveryTimeliness' },
    { label: 'الالتزام بالأسعار المتفق عليها', weight: '8%', score: trustScore.factors.priceConsistency, key: 'priceConsistency' },
    { label: 'نسبة العمليات الناجحة', weight: '10%', score: trustScore.factors.orderSuccessRate, key: 'orderSuccessRate' },
    { label: 'مؤشر العمليات الملغاة (عدم الإلغاء)', weight: '6%', score: trustScore.factors.cancellationsPenalty, key: 'cancellationsPenalty' },
    { label: 'مؤشر سلامة النزاعات التجارية', weight: '8%', score: trustScore.factors.disputesPenalty, key: 'disputesPenalty' },
    { label: 'مؤشر انعدام الشكاوى', weight: '6%', score: trustScore.factors.complaintsPenalty, key: 'complaintsPenalty' },
    { label: 'سرعة الاستجابة والدعم الفني', weight: '5%', score: trustScore.factors.responseSpeed, key: 'responseSpeed' },
    { label: 'مدة العلاقة والشراكة مع النظام', weight: '5%', score: trustScore.factors.relationshipAgeMonths, key: 'relationshipAgeMonths' },
    { label: 'إجمالي حجم التعاملات المالي', weight: '8%', score: trustScore.factors.transactionVolumeScore, key: 'transactionVolumeScore' },
    { label: 'استقرار جودة الخدمة عبر الوقت', weight: '6%', score: trustScore.factors.serviceQualityStability, key: 'serviceQualityStability' },
    { label: 'استقرار وثبات تسعير المنتجات', weight: '4%', score: trustScore.factors.priceStabilityScore, key: 'priceStabilityScore' },
    { label: 'مؤشر تجنب التأخير في التوريد', weight: '4%', score: trustScore.factors.delayCountScore, key: 'delayCountScore' },
    { label: 'معدل وسرعة حل المشاكل', weight: '4%', score: trustScore.factors.disputeResolutionRate, key: 'disputeResolutionRate' },
    { label: 'نسبة تنفيذ الاتفاقات والعقود بالكامل', weight: '4%', score: trustScore.factors.agreementFulfillmentRate, key: 'agreementFulfillmentRate' }
  ];

  return (
    <Card className="p-5 space-y-6 text-right border border-gray-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-[#27272A]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-orange-500" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              محرك درجة الثقة والموثوقية (Trust Score Engine)
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            يقيس مدى الاعتمادية والأمان الائتماني للتاجر في المعاملات المستقبلية بناءً على 15 عاملاً رياضياً موزوناً
          </p>
        </div>

        <div className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${tierInfo.bgBadge}`}>
          {tierInfo.icon}
          <span>{tierInfo.label}</span>
        </div>
      </div>

      {/* Main Score Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Trust Score 0 - 100 */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200/80 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">درجة الثقة الحالية</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-4xl font-black font-mono ${tierInfo.textColor}`}>
                {trustScore.score}
              </span>
              <span className="text-xs text-zinc-400 font-mono">/ 100</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-semibold block mt-0.5">
              محدث تلقائياً بعد كل حركة
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-xs">
            {tierInfo.icon}
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200/80 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">مؤشر واتجاه الثقة (Trend)</span>
            <div className="flex items-center gap-1.5 mt-1">
              {trustScore.trend === 'up' ? (
                <span className="text-emerald-500 font-bold text-sm flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> صاعد (+{trustScore.trendPercentage}%)
                </span>
              ) : trustScore.trend === 'down' ? (
                <span className="text-rose-500 font-bold text-sm flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" /> متراجع (-{trustScore.trendPercentage}%)
                </span>
              ) : (
                <span className="text-blue-500 font-bold text-sm flex items-center gap-1">
                  <Minus className="w-4 h-4" /> مستقر وثابت
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-400 block mt-0.5">مقارنة بالفترة السابقة</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-xs">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
        </div>

        {/* Auto Recommendation */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200/80 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">توصية النظام الآلية</span>
            <div className="mt-1">
              {trustScore.score >= 88 ? (
                <span className="text-xs font-black text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> معتمد للتعاملات الكبرى والآجلة
                </span>
              ) : trustScore.score >= 60 ? (
                <span className="text-xs font-bold text-blue-500 flex items-center gap-1">
                  <Info className="w-4 h-4" /> تعامل قياسي مع الالتزام بالحد
                </span>
              ) : (
                <span className="text-xs font-black text-rose-500 flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-4 h-4" /> يُنصح بوقف التعامل الآجل فوراً!
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-400 block mt-0.5">توجيه ذكي لإدارة الائتمان</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-xs">
            <Layers className="w-5 h-5 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Critical Alert Warning (If Score is Risky or Blocked) */}
      {trustScore.isAlertActive && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-500 animate-pulse">
          <span className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            تحذير أمان: درجة ثقة هذا التاجر منخفضة ({trustScore.score}/100). تم تعليق صلاحيات زيادة الائتمان التلقائية.
          </span>
          <Badge variant="danger" size="sm">تنبيه مخاطر</Badge>
        </div>
      )}

      {/* Reason for Last Change */}
      <div className="p-3.5 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 text-xs">
        <strong className="text-orange-500 ml-1">سبب آخر تغير في درجة الثقة:</strong>
        <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{trustScore.lastChangeReason}</span>
      </div>

      {/* Positive & Negative Drivers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Positive Drivers */}
        <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-2">
          <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pb-1 border-b border-emerald-500/20">
            <ThumbsUp className="w-4 h-4" />
            <span>أبرز العوامل الإيجابية الداعمة للدرجة</span>
          </h4>
          {trustScore.positiveDrivers.length === 0 ? (
            <p className="text-zinc-400 text-[11px]">لا توجد عوامل إيجابية مسجلة حالياً</p>
          ) : (
            <ul className="space-y-1.5 text-zinc-700 dark:text-zinc-300">
              {trustScore.positiveDrivers.map((driver, i) => (
                <li key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Negative Drivers */}
        <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 space-y-2">
          <h4 className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pb-1 border-b border-rose-500/20">
            <ThumbsDown className="w-4 h-4" />
            <span>العوامل السلبية المؤثرة في خفض الدرجة</span>
          </h4>
          {trustScore.negativeDrivers.length === 0 ? (
            <p className="text-emerald-500 font-semibold text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> سجل ناصع بدون أي ملاحظات أو خصومات سلبية
            </p>
          ) : (
            <ul className="space-y-1.5 text-zinc-700 dark:text-zinc-300">
              {trustScore.negativeDrivers.map((driver, i) => (
                <li key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 15-Factor Breakdown Grid */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-orange-500" />
            <span>تفاصيل حساب العوامل الـ 15 الموزونة (15-Factor Mathematical Matrix)</span>
          </h4>
          <span className="text-[10px] text-zinc-400 font-mono font-semibold">مجموع الأوزان = 100%</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {factorItems.map((factor, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200/80 dark:border-[#27272A] space-y-1.5"
            >
              <div className="flex items-center justify-between font-semibold">
                <span className="text-zinc-700 dark:text-zinc-300 text-[11px] truncate max-w-[220px]">
                  {idx + 1}. {factor.label}
                </span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-[10px] text-zinc-400 font-bold">({factor.weight})</span>
                  <span
                    className={`font-black ${
                      factor.score >= 90
                        ? 'text-emerald-500'
                        : factor.score >= 70
                        ? 'text-blue-500'
                        : factor.score >= 50
                        ? 'text-amber-500'
                        : 'text-rose-500'
                    }`}
                  >
                    {factor.score}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    factor.score >= 90
                      ? 'bg-emerald-500'
                      : factor.score >= 70
                      ? 'bg-blue-500'
                      : factor.score >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${factor.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Trust Timeline */}
      {trustScore.historicalTimeline && trustScore.historicalTimeline.length > 0 && (
        <div className="pt-3 border-t border-gray-100 dark:border-[#27272A]">
          <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span>تطور درجة الثقة عبر الفترات الزمنية السابقة (Historical Timeline)</span>
          </h4>
          <div className="grid grid-cols-4 gap-2.5 text-center font-mono">
            {trustScore.historicalTimeline.map((item, index) => (
              <div
                key={index}
                className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200/80 dark:border-[#27272A]"
              >
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-sans">{item.period}</span>
                <span className="text-base font-black text-orange-500 mt-1 block">{item.score} / 100</span>
                <Badge variant={item.score >= 88 ? 'success' : item.score >= 60 ? 'warning' : 'danger'} size="sm">
                  {item.tier}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
