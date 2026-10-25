// =============================================================
// NZM JKR TOP UP ERP — Financial & Smart Pricing Engine V3.0
// Pricing Breakdown Modal (🧮 تفاصيل التسعير والتوزيع المالي)
// =============================================================

import React from 'react';
import { PricingBreakdown, TicketPricingSnapshot } from '../../types/pricing.types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Calculator,
  ShieldCheck,
  Percent,
  DollarSign,
  TrendingUp,
  Sparkles,
  Layers,
  ArrowRight,
  Gift,
  Users,
  Award,
  Lock
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface PricingBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown?: PricingBreakdown | null;
  snapshot?: TicketPricingSnapshot | null;
  title?: string;
  subtitle?: string;
}

export const PricingBreakdownModal: React.FC<PricingBreakdownModalProps> = ({
  isOpen,
  onClose,
  breakdown,
  snapshot,
  title = 'تفاصيل التسعير والتوزيع المالي (Financial Engine V3.0)',
  subtitle = 'التفكيك المحاسبي الدقيق لتكلفة المنتج، هامش الربح، الاستقطاعات، وسعر البيع النهائي'
}) => {
  if (!isOpen) return null;

  // Normalize data from either live breakdown or saved historical snapshot
  const costEGP = snapshot ? snapshot.costEGP : (breakdown?.costEGP || 0);
  const costUSD = snapshot ? snapshot.costUSD : (breakdown?.costUSD || 0);
  const profitMarginPercent = snapshot ? snapshot.profitMarginPercent : (breakdown?.profitMarginPercent || 0);
  const targetMarkupEGP = snapshot ? snapshot.targetMarkupEGP : (breakdown?.targetMarkupEGP || 0);
  const fixedCostEGP = snapshot ? snapshot.fixedCostEGP : (breakdown?.fixedCostPerOrderEGP || 0);

  const cashbackP = snapshot ? snapshot.cashbackPercent : (breakdown?.cashbackPercent || 0);
  const cashbackAmt = snapshot ? snapshot.cashbackAmountEGP : (breakdown?.cashbackAmountEGP || 0);

  const referralP = snapshot ? snapshot.referralPercent : (breakdown?.referralPercent || 0);
  const referralAmt = snapshot ? snapshot.referralAmountEGP : (breakdown?.referralAmountEGP || 0);

  const reserveP = snapshot ? snapshot.reservePercent : (breakdown?.reservePercent || 0);
  const reserveAmt = snapshot ? snapshot.reserveAmountEGP : (breakdown?.reserveAmountEGP || 0);

  const devP = snapshot ? snapshot.developmentPercent : (breakdown?.developmentPercent || 0);
  const devAmt = snapshot ? snapshot.developmentAmountEGP : (breakdown?.developmentAmountEGP || 0);

  const offersP = snapshot ? snapshot.offersPercent : (breakdown?.offersPercent || 0);
  const offersAmt = snapshot ? snapshot.offersAmountEGP : (breakdown?.offersAmountEGP || 0);

  const totalDeductionsEGP = snapshot ? snapshot.totalDeductionsEGP : (breakdown?.totalDeductionsEGP || 0);
  const finalPriceEGP = snapshot ? snapshot.grossSellingPriceEGP : (breakdown?.finalSellingPriceEGP || 0);
  const netCompanyProfitEGP = snapshot ? snapshot.netCompanyProfitEGP : (breakdown?.netRealizedCompanyProfitEGP || 0);
  const netMarginPercent = snapshot ? snapshot.netMarginPercent : (breakdown?.netProfitMarginPercent || 0);
  const isSnapshot = !!snapshot;

  const totalBenefitsPercent = cashbackP + referralP + reserveP + devP + offersP;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth="xl"
    >
      <div className="space-y-4 text-right text-xs">
        {/* Historical Snapshot Badge if viewing past ticket */}
        {isSnapshot && (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between text-blue-400">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span className="font-bold">لقطة مالية معتمدة وتاريخية (Historical Snapshot):</span>
            </div>
            <span className="font-mono text-[11px] text-zinc-300">
              سعر الدولار وقت العملية: {snapshot.usdExchangeRateAtPurchase} ج | محسوب بواسطة: {snapshot.calculatedBy}
            </span>
          </div>
        )}

        {/* 1. Mathematical Equation Visual Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-500 font-bold">
              <Calculator className="w-4 h-4" />
              <span className="text-sm font-black">المعادلة المركزية المطبقة (Pricing Formula):</span>
            </div>
            <Badge variant="orange" size="sm">Single Source of Truth</Badge>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 text-center font-mono text-xs sm:text-sm text-zinc-200 dir-ltr flex items-center justify-center gap-2">
            <span>S = </span>
            <div className="inline-flex flex-col items-center">
              <span className="border-b border-zinc-600 px-2 pb-0.5">
                C ({costEGP} ج) × (1 + {profitMarginPercent}%) + F ({fixedCostEGP} ج)
              </span>
              <span className="pt-0.5">1 - B ({totalBenefitsPercent}%)</span>
            </div>
            <span className="text-orange-400 font-black text-base">= {finalPriceEGP} ج.م</span>
          </div>
        </div>

        {/* 2. Primary Cost & Margin Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Card 1: Cost C */}
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block">1. تكلفة البضاعة (C)</span>
            <strong className="text-sm sm:text-base font-black font-mono text-zinc-900 dark:text-zinc-100 block">
              {costEGP} ج.م
            </strong>
            <span className="text-[10px] font-mono text-zinc-500 block">(${costUSD} USDT FIFO)</span>
          </div>

          {/* Card 2: Markup */}
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block">2. هامش الربح (P%)</span>
            <strong className="text-sm sm:text-base font-black font-mono text-emerald-500 block">
              +{targetMarkupEGP} ج.م
            </strong>
            <span className="text-[10px] font-mono text-emerald-400 block">({profitMarginPercent}% من التكلفة)</span>
          </div>

          {/* Card 3: Fixed Cost F */}
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block">3. التكلفة الثابتة (F)</span>
            <strong className="text-sm sm:text-base font-black font-mono text-amber-500 block">
              +{fixedCostEGP} ج.م
            </strong>
            <span className="text-[10px] text-zinc-500 block">نصيب تشغيل الطلب</span>
          </div>

          {/* Card 4: Deductions B */}
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block">4. إجمالي الاستقطاعات (B%)</span>
            <strong className="text-sm sm:text-base font-black font-mono text-purple-400 block">
              {totalDeductionsEGP} ج.م
            </strong>
            <span className="text-[10px] font-mono text-purple-300 block">({totalBenefitsPercent}% من البيع)</span>
          </div>
        </div>

        {/* 3. Deductions Detailed Allocation Table (B% Matrix) */}
        <div className="rounded-2xl border border-gray-200 dark:border-[#27272A] overflow-hidden">
          <div className="p-2.5 bg-gray-100 dark:bg-[#141417] border-b border-gray-200 dark:border-[#27272A] flex items-center justify-between">
            <span className="font-black text-zinc-800 dark:text-zinc-200 text-xs">
              توزيع استقطاعات المزايا والصناديق (Benefits & Liability Accounts)
            </span>
            <Badge variant="purple" size="sm">إجمالي B = {totalBenefitsPercent}%</Badge>
          </div>

          <table className="w-full text-right text-xs">
            <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
              <tr>
                <th className="p-2.5">المصرف المالي / المحفظة</th>
                <th className="p-2.5 text-center">النسبة (%)</th>
                <th className="p-2.5 text-center">المبلغ المقتطع</th>
                <th className="p-2.5">الطبيعة المحاسبية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A] text-zinc-700 dark:text-zinc-300">
              <tr>
                <td className="p-2.5 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> كاش باك العميل (Cashback)
                </td>
                <td className="p-2.5 text-center font-mono font-bold text-amber-500">{cashbackP}%</td>
                <td className="p-2.5 text-center font-mono font-bold">{cashbackAmt} ج.م</td>
                <td className="p-2.5 text-zinc-400 text-[11px]">التزام مالي لصالح العميل</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" /> عمولة الإحالة والشريك (Referral)
                </td>
                <td className="p-2.5 text-center font-mono font-bold text-blue-400">{referralP}%</td>
                <td className="p-2.5 text-center font-mono font-bold">{referralAmt} ج.م</td>
                <td className="p-2.5 text-zinc-400 text-[11px]">التزام مالي لصالح المسوق</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> صندوق الاحتياطي والطوارئ (Reserve)
                </td>
                <td className="p-2.5 text-center font-mono font-bold text-emerald-400">{reserveP}%</td>
                <td className="p-2.5 text-center font-mono font-bold">{reserveAmt} ج.م</td>
                <td className="p-2.5 text-zinc-400 text-[11px]">مخصص مخاطر وتقلبات الصرف</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> صندوق التطوير والتقنية (Dev Fund)
                </td>
                <td className="p-2.5 text-center font-mono font-bold text-cyan-400">{devP}%</td>
                <td className="p-2.5 text-center font-mono font-bold">{devAmt} ج.م</td>
                <td className="p-2.5 text-zinc-400 text-[11px]">مخصص صيانة وتطوير السيرفرات</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-rose-400" /> صندوق العروض والجوائز (Offers)
                </td>
                <td className="p-2.5 text-center font-mono font-bold text-rose-400">{offersP}%</td>
                <td className="p-2.5 text-center font-mono font-bold">{offersAmt} ج.م</td>
                <td className="p-2.5 text-zinc-400 text-[11px]">مخصص الحملات الترويجية</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Final Bottom Results Summary */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[11px] text-zinc-400 font-bold block">سعر البيع النهائي (S):</span>
              <strong className="text-2xl font-black font-mono text-orange-500">
                {finalPriceEGP} ج.م
              </strong>
            </div>
            <div className="border-r border-gray-200 dark:border-zinc-700 pr-4">
              <span className="text-[11px] text-zinc-400 font-bold block">صافي ربح الشركة:</span>
              <strong className="text-xl font-black font-mono text-emerald-500">
                +{netCompanyProfitEGP} ج.م
              </strong>
              <span className="text-[10px] text-emerald-400 font-mono block">({netMarginPercent}% هامش صافي)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>تطابق مالي 100% (Zero-Leakage)</span>
            </span>
            <Button variant="outline" size="sm" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
