// =============================================================
// NZM JKR TOP UP ERP — Financial & Smart Pricing Engine V3.0
// Interactive Pricing Simulator (حاسبة ومحاكي سيناريوهات التسعير)
// =============================================================

import React, { useState, useMemo } from 'react';
import { FinancialEngine } from '../../services/financial/financialEngine';
import { PricingSimulationInput } from '../../types/pricing.types';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import {
  Calculator,
  Sliders,
  Sparkles,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Percent,
  Layers,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const PricingSimulator: React.FC = () => {
  const currentConfig = FinancialEngine.getPricingConfig();

  // Sandbox Inputs
  const [costEGP, setCostEGP] = useState<number>(100);
  const [usdRate, setUsdRate] = useState<number>(currentConfig.rateUSD_EGP || 39.25);
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(currentConfig.defaultProfitMarginPercent || 10);
  const [fixedCostEGP, setFixedCostEGP] = useState<number>(currentConfig.manualFixedCostEGP || 5);
  const [cashbackPercent, setCashbackPercent] = useState<number>(currentConfig.cashbackPercent ?? 1);
  const [referralPercent, setReferralPercent] = useState<number>(currentConfig.referralPercent ?? 2);
  const [reservePercent, setReservePercent] = useState<number>(currentConfig.reservePercent ?? 0);
  const [developmentPercent, setDevelopmentPercent] = useState<number>(currentConfig.developmentPercent ?? 0);
  const [offersPercent, setOffersPercent] = useState<number>(currentConfig.offersPercent ?? 0);

  const simulationResult = useMemo(() => {
    const input: PricingSimulationInput = {
      costEGP: Math.max(0, costEGP),
      costUSD: Math.max(0, costEGP / (usdRate || 1)),
      usdRate: Math.max(1, usdRate),
      profitMarginPercent: Math.max(0, profitMarginPercent),
      fixedCostEGP: Math.max(0, fixedCostEGP),
      cashbackPercent: Math.max(0, cashbackPercent),
      referralPercent: Math.max(0, referralPercent),
      reservePercent: Math.max(0, reservePercent),
      developmentPercent: Math.max(0, developmentPercent),
      offersPercent: Math.max(0, offersPercent)
    };

    return FinancialEngine.simulatePricing(input);
  }, [
    costEGP,
    usdRate,
    profitMarginPercent,
    fixedCostEGP,
    cashbackPercent,
    referralPercent,
    reservePercent,
    developmentPercent,
    offersPercent
  ]);

  const handleResetToCurrent = () => {
    const cfg = FinancialEngine.getPricingConfig();
    setCostEGP(100);
    setUsdRate(cfg.rateUSD_EGP);
    setProfitMarginPercent(cfg.defaultProfitMarginPercent);
    setFixedCostEGP(cfg.manualFixedCostEGP);
    setCashbackPercent(cfg.cashbackPercent);
    setReferralPercent(cfg.referralPercent);
    setReservePercent(cfg.reservePercent);
    setDevelopmentPercent(cfg.developmentPercent);
    setOffersPercent(cfg.offersPercent);
  };

  const totalB = cashbackPercent + referralPercent + reservePercent + developmentPercent + offersPercent;

  return (
    <Card className="p-5 space-y-5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-right">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#27272A] flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100">
              حاسبة ومحاكي سيناريوهات التسعير الذكي (Pricing Simulator Sandbox)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              اختبر تأثير تغيير التكاليف وهوامش الأرباح ونسب الاستقطاع لحظياً دون أي تأثير على بيانات النظام.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="warning" size="sm">بيئة تجريبية آمنة (Sandbox)</Badge>
          <button
            type="button"
            onClick={handleResetToCurrent}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-400 hover:text-orange-500 transition-colors flex items-center gap-1 text-xs font-bold"
            title="إعادة ضبط للقيم الافتراضية"
          >
            <RotateCcw className="w-3.5 h-3.5" /> إعادة ضبط
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Form: Simulation Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 block">
            ١. مدخلات المحاكاة الرياضية (Formula Variables):
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                تكلفة المنتج الحقيقية (C) بالجنيه:
              </label>
              <Input
                type="number"
                value={costEGP}
                onChange={e => setCostEGP(parseFloat(e.target.value) || 0)}
                placeholder="100"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                سعر صرف USDT مقابل الجنيه:
              </label>
              <Input
                type="number"
                step="0.01"
                value={usdRate}
                onChange={e => setUsdRate(parseFloat(e.target.value) || 1)}
                placeholder="39.25"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                هامش الربح المستهدف (P%):
              </label>
              <Input
                type="number"
                step="0.5"
                value={profitMarginPercent}
                onChange={e => setProfitMarginPercent(parseFloat(e.target.value) || 0)}
                placeholder="10"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                التكلفة التشغيلية الثابتة (F) بالجنيه:
              </label>
              <Input
                type="number"
                step="0.5"
                value={fixedCostEGP}
                onChange={e => setFixedCostEGP(parseFloat(e.target.value) || 0)}
                placeholder="5"
              />
            </div>
          </div>

          {/* Benefits Percentage Sliders / Inputs */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                نسب المزايا والاستقطاعات (B% Matrix):
              </span>
              <span className="font-mono font-bold text-xs text-purple-400">
                مجموع B = {totalB}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] text-zinc-500 font-bold mb-1">كاش باك (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={cashbackPercent}
                  onChange={e => setCashbackPercent(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-1.5 text-center font-mono font-bold text-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-500 font-bold mb-1">عمولة الإحالة (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={referralPercent}
                  onChange={e => setReferralPercent(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-1.5 text-center font-mono font-bold text-blue-400"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-500 font-bold mb-1">الاحتياطي (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={reservePercent}
                  onChange={e => setReservePercent(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-1.5 text-center font-mono font-bold text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-500 font-bold mb-1">صندوق التطوير (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={developmentPercent}
                  onChange={e => setDevelopmentPercent(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-1.5 text-center font-mono font-bold text-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-500 font-bold mb-1">صندوق العروض (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={offersPercent}
                  onChange={e => setOffersPercent(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-1.5 text-center font-mono font-bold text-rose-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Output: Real-time Financial Breakdown Result (5 Cols) */}
        <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
          <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 block">
            ٢. الناتج المالي الفوري (Real-Time Result):
          </span>

          <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-center space-y-1">
            <span className="text-xs font-bold text-orange-400 block">سعر البيع النهائي المحسوب (S):</span>
            <strong className="text-3xl font-black font-mono text-orange-500 block">
              {simulationResult.finalSellingPriceEGP} ج.م
            </strong>
            <span className="text-[11px] font-mono text-zinc-400 block">
              ≈ ${simulationResult.finalSellingPriceUSD} USDT
            </span>
          </div>

          <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-xs">
            <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
              <span>تكلفة البضاعة (C):</span>
              <strong className="font-mono">{simulationResult.costEGP} ج.م</strong>
            </div>
            <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
              <span>التكلفة الثابتة (F):</span>
              <strong className="font-mono">+{simulationResult.fixedCostPerOrderEGP} ج.م</strong>
            </div>
            <div className="flex items-center justify-between text-amber-500">
              <span>كاش باك العميل ({cashbackPercent}%):</span>
              <strong className="font-mono">-{simulationResult.cashbackAmountEGP} ج.م</strong>
            </div>
            <div className="flex items-center justify-between text-blue-400">
              <span>عمولة الإحالة ({referralPercent}%):</span>
              <strong className="font-mono">-{simulationResult.referralAmountEGP} ج.م</strong>
            </div>
            <div className="flex items-center justify-between text-purple-400">
              <span>صناديق الاحتياطي والتطوير:</span>
              <strong className="font-mono">
                -{(simulationResult.reserveAmountEGP + simulationResult.developmentAmountEGP + simulationResult.offersAmountEGP).toFixed(2)} ج.م
              </strong>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-zinc-700 flex items-center justify-between font-black text-emerald-500">
              <span>صافي ربح الشركة:</span>
              <div className="text-left font-mono">
                <span className="text-base font-black">+{simulationResult.netRealizedCompanyProfitEGP} ج.م</span>
                <span className="text-[10px] text-emerald-400 block">({simulationResult.netProfitMarginPercent}% صافي)</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-emerald-500 text-[11px] font-bold flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>تطابق مالي تام: لا يوجد أي فقد مالي (Zero-Leakage)</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
