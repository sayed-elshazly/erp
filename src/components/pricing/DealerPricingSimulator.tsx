// =============================================================
// NZM JKR TOP UP ERP — Dealers & Wholesale Pricing Engine V3.0
// Interactive Dealer Pricing Simulator (حاسبة ومحاكي صفقات الجملة والتجار)
// =============================================================

import React, { useState, useMemo } from 'react';
import { db } from '../../database/db';
import { FinancialEngine } from '../../services/financial/financialEngine';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import {
  Calculator,
  TrendingUp,
  Percent,
  Layers,
  RotateCcw,
  Store,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const DealerPricingSimulator: React.FC = () => {
  const dealerSettings = db.getDealerModuleSettings();
  const centralPricingConfig = FinancialEngine.getPricingConfig();

  // Sandbox State for Wholesale
  const [costEGP, setCostEGP] = useState<number>(100);
  const [usdRate, setUsdRate] = useState<number>(dealerSettings.rateUSD_EGP || centralPricingConfig.rateUSD_EGP || 39.25);
  const [wholesaleProfitMarginPercent, setWholesaleProfitMarginPercent] = useState<number>(
    dealerSettings.defaultWholesaleProfitMarginPercent ?? 3.5
  );
  const [fixedCostEGP, setFixedCostEGP] = useState<number>(dealerSettings.manualFixedCostEGP ?? 2.5);
  const [cashbackPercent, setCashbackPercent] = useState<number>(dealerSettings.defaultCashbackPercent ?? 0.5);
  const [partnerCommissionPercent, setPartnerCommissionPercent] = useState<number>(
    dealerSettings.defaultPartnerCommissionPercent ?? 1.5
  );
  const [reservePercent, setReservePercent] = useState<number>(dealerSettings.reservePercent ?? 0.5);
  const [developmentPercent, setDevelopmentPercent] = useState<number>(dealerSettings.developmentPercent ?? 0.5);
  const [offersPercent, setOffersPercent] = useState<number>(dealerSettings.offersPercent ?? 0.5);

  // Preset scenarios
  const applyPreset = (type: 'distributor' | 'vip' | 'shop') => {
    if (type === 'vip') {
      setWholesaleProfitMarginPercent(2.5);
      setFixedCostEGP(1.5);
      setCashbackPercent(0.75);
      setPartnerCommissionPercent(1.0);
    } else if (type === 'distributor') {
      setWholesaleProfitMarginPercent(3.5);
      setFixedCostEGP(2.5);
      setCashbackPercent(0.5);
      setPartnerCommissionPercent(1.5);
    } else if (type === 'shop') {
      setWholesaleProfitMarginPercent(4.5);
      setFixedCostEGP(3.0);
      setCashbackPercent(0.5);
      setPartnerCommissionPercent(2.0);
    }
  };

  const totalWholesaleB =
    cashbackPercent + partnerCommissionPercent + reservePercent + developmentPercent + offersPercent;

  // Live Calculations
  const calculation = useMemo(() => {
    const cEGP = Math.max(0, costEGP);
    const cUSD = Math.max(0, cEGP / (usdRate || 1));
    const pDecimal = wholesaleProfitMarginPercent / 100;
    const fEGP = Math.max(0, fixedCostEGP);

    const cbP = cashbackPercent / 100;
    const refP = partnerCommissionPercent / 100;
    const resP = reservePercent / 100;
    const devP = developmentPercent / 100;
    const offP = offersPercent / 100;
    const totalBP = cbP + refP + resP + devP + offP;

    // Wholesale Price Formula: S_wholesale = [C * (1 + P) + F] / (1 - B)
    const numerator = cEGP * (1 + pDecimal) + fEGP;
    const denominator = Math.max(0.01, 1 - totalBP);
    const rawWholesalePrice = numerator / denominator;
    const finalWholesalePriceEGP = Math.round(rawWholesalePrice);
    const finalWholesalePriceUSD = Math.round((finalWholesalePriceEGP / (usdRate || 1)) * 100) / 100;

    // Retail Customer comparison (from standard pricing engine)
    const retailPDecimal = (centralPricingConfig.defaultProfitMarginPercent || 7) / 100;
    const retailF = centralPricingConfig.manualFixedCostEGP || 5;
    const retailTotalB =
      ((centralPricingConfig.cashbackPercent ?? 1) +
        (centralPricingConfig.referralPercent ?? 2) +
        (centralPricingConfig.reservePercent ?? 0) +
        (centralPricingConfig.developmentPercent ?? 0) +
        (centralPricingConfig.offersPercent ?? 0)) /
      100;
    const retailNumerator = cEGP * (1 + retailPDecimal) + retailF;
    const retailDenominator = Math.max(0.01, 1 - retailTotalB);
    const finalRetailPriceEGP = Math.round(retailNumerator / retailDenominator);

    // Wholesale savings for dealer
    const dealerSavingsEGP = Math.max(0, finalRetailPriceEGP - finalWholesalePriceEGP);
    const dealerSavingsPercent =
      finalRetailPriceEGP > 0 ? Math.round((dealerSavingsEGP / finalRetailPriceEGP) * 1000) / 10 : 0;

    // Partition of S_wholesale
    const targetMarkupEGP = Math.round(cEGP * pDecimal * 100) / 100;
    const cashbackAmountEGP = Math.round(finalWholesalePriceEGP * cbP * 100) / 100;
    const referralAmountEGP = Math.round(finalWholesalePriceEGP * refP * 100) / 100;
    const reserveAmountEGP = Math.round(finalWholesalePriceEGP * resP * 100) / 100;
    const devAmountEGP = Math.round(finalWholesalePriceEGP * devP * 100) / 100;
    const offersAmountEGP = Math.round(finalWholesalePriceEGP * offP * 100) / 100;
    const totalDeductionsEGP = Math.round(
      (cashbackAmountEGP + referralAmountEGP + reserveAmountEGP + devAmountEGP + offersAmountEGP) * 100
    ) / 100;

    // Net Realized Company Profit
    const netRealizedProfitEGP = Math.round(
      (finalWholesalePriceEGP - cEGP - fEGP - totalDeductionsEGP) * 100
    ) / 100;
    const netProfitMarginPercent =
      finalWholesalePriceEGP > 0
        ? Math.round((netRealizedProfitEGP / finalWholesalePriceEGP) * 1000) / 10
        : 0;

    // Zero-Leakage check
    const distributedSum = cEGP + fEGP + totalDeductionsEGP + netRealizedProfitEGP;
    const isZeroLeakage = Math.abs(distributedSum - finalWholesalePriceEGP) < 1.0;

    return {
      costEGP: cEGP,
      costUSD: Math.round(cUSD * 100) / 100,
      targetMarkupEGP,
      finalWholesalePriceEGP,
      finalWholesalePriceUSD,
      finalRetailPriceEGP,
      dealerSavingsEGP,
      dealerSavingsPercent,
      cashbackAmountEGP,
      referralAmountEGP,
      reserveAmountEGP,
      devAmountEGP,
      offersAmountEGP,
      totalDeductionsEGP,
      netRealizedProfitEGP,
      netProfitMarginPercent,
      isZeroLeakage
    };
  }, [
    costEGP,
    usdRate,
    wholesaleProfitMarginPercent,
    fixedCostEGP,
    cashbackPercent,
    partnerCommissionPercent,
    reservePercent,
    developmentPercent,
    offersPercent,
    centralPricingConfig
  ]);

  const handleResetToDefault = () => {
    const s = db.getDealerModuleSettings();
    setCostEGP(100);
    setUsdRate(s.rateUSD_EGP || 39.25);
    setWholesaleProfitMarginPercent(s.defaultWholesaleProfitMarginPercent ?? 3.5);
    setFixedCostEGP(s.manualFixedCostEGP ?? 2.5);
    setCashbackPercent(s.defaultCashbackPercent ?? 0.5);
    setPartnerCommissionPercent(s.defaultPartnerCommissionPercent ?? 1.5);
    setReservePercent(s.reservePercent ?? 0.5);
    setDevelopmentPercent(s.developmentPercent ?? 0.5);
    setOffersPercent(s.offersPercent ?? 0.5);
  };

  return (
    <Card className="p-5 space-y-5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-right">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#27272A] flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>حاسبة ومحاكي صفقات الجملة وهوامش الموزعين (Wholesale Simulator Sandbox)</span>
              <Badge variant="warning" size="sm">Wholesale Sandbox</Badge>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              محاكاة حية لتكاليف صفقات الجملة وهوامش الموزعين ومقارنة سعر الجملة بسعر البيع للزبائن بدقة فورية.
            </p>
          </div>
        </div>

        {/* Quick Presets & Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-zinc-400 font-bold">سيناريوهات سريعة:</span>
          <button
            type="button"
            onClick={() => applyPreset('distributor')}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            موزع معتمد (3.5%)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('vip')}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all cursor-pointer"
          >
            تاجر VIP حوت (2.5%)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('shop')}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all cursor-pointer"
          >
            محل / كشك شحن (4.5%)
          </button>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-400 hover:text-amber-500 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
            title="إعادة ضبط للقيم الافتراضية"
          >
            <RotateCcw className="w-3.5 h-3.5" /> إعادة ضبط
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Form: Wholesale Simulation Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 block">
            ١. معاملات محاكاة سعر الجملة (Wholesale Formula Variables):
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                تكلفة الشحنة / الباقة بالجنيه (Cost C) *
              </label>
              <Input
                type="number"
                step="1"
                value={costEGP}
                onChange={e => setCostEGP(parseFloat(e.target.value) || 0)}
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                تساوي تقريباً: ${(costEGP / (usdRate || 1)).toFixed(2)} USDT
              </span>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                سعر صرف USDT المعتمد *
              </label>
              <Input
                type="number"
                step="0.05"
                value={usdRate}
                onChange={e => setUsdRate(parseFloat(e.target.value) || 1)}
              />
            </div>

            <div>
              <label className="block font-bold text-amber-600 dark:text-amber-400 mb-1">
                هامش ربح الجملة المستهدف (P% Wholesale) *
              </label>
              <Input
                type="number"
                step="0.1"
                value={wholesaleProfitMarginPercent}
                onChange={e => setWholesaleProfitMarginPercent(parseFloat(e.target.value) || 0)}
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                هامش قطاع الجملة (أقل من تجزئة الأفراد)
              </span>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                التكلفة التشغيلية الثابتة للجملة (F) بالجنيه *
              </label>
              <Input
                type="number"
                step="0.5"
                value={fixedCostEGP}
                onChange={e => setFixedCostEGP(parseFloat(e.target.value) || 0)}
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                حصة تشغيل طلبية الجملة (الافتراضي 2.5 ج)
              </span>
            </div>
          </div>

          {/* Deductions Matrix */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-purple-400" /> مصفوفة استقطاعات ومزايا التوزيع (Wholesale B%):
              </span>
              <Badge variant="purple" size="sm">إجمالي B% = {totalWholesaleB.toFixed(1)}%</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block font-semibold text-amber-500 text-[11px] mb-1">
                  كاش باك الجملة (%):
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={cashbackPercent}
                  onChange={e => setCashbackPercent(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block font-semibold text-blue-400 text-[11px] mb-1">
                  عمولة إحالة التاجر (%):
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={partnerCommissionPercent}
                  onChange={e => setPartnerCommissionPercent(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block font-semibold text-emerald-400 text-[11px] mb-1">
                  احتياطي طوارئ الجملة (%):
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={reservePercent}
                  onChange={e => setReservePercent(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block font-semibold text-cyan-400 text-[11px] mb-1">
                  تطوير منصة الموزعين (%):
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={developmentPercent}
                  onChange={e => setDevelopmentPercent(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="col-span-2 sm:col-span-2">
                <label className="block font-semibold text-rose-400 text-[11px] mb-1">
                  حوافز وتخفيضات تجار VIP (%):
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={offersPercent}
                  onChange={e => setOffersPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Output: Realtime Wholesale Breakdown (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 block">
            ٢. مخرجات التسعير والتوزيع المالي الفوري (Live Output):
          </span>

          {/* Final Wholesale Price Hero Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 text-center space-y-2">
            <span className="text-xs font-bold text-amber-500 flex items-center justify-center gap-1.5">
              <Store className="w-4 h-4" /> سعر البيع بالجملة للتاجر (S_wholesale):
            </span>
            <div className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
              {formatCurrency(calculation.finalWholesalePriceEGP)}
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-zinc-400">
              <span>يعادل تقريباً: ${calculation.finalWholesalePriceUSD} USDT</span>
              <span className="text-emerald-500 font-bold">
                صافي ربح الشركة: +{formatCurrency(calculation.netRealizedProfitEGP)} ({calculation.netProfitMarginPercent}%)
              </span>
            </div>
          </div>

          {/* Wholesale vs Retail Comparison Card */}
          <Card className="p-3.5 space-y-2.5 bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-[#27272A]">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> مقارنة الجملة بسعر تجزئة الأفراد:
              </span>
              <Badge variant="info" size="sm">ميزة التاجر</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
                <span className="text-[10px] text-zinc-400 block">سعر التجزئة للزبون (Retail)</span>
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                  {formatCurrency(calculation.finalRetailPriceEGP)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-500 block">وفر التاجر لكل عملية</span>
                <span className="text-sm font-black text-emerald-500 font-mono">
                  -{formatCurrency(calculation.dealerSavingsEGP)} ({calculation.dealerSavingsPercent}%)
                </span>
              </div>
            </div>
          </Card>

          {/* Financial Partition Breakdown */}
          <Card className="p-3.5 space-y-2 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-[#27272A]">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" /> توزيع كل جنيه من سعر الجملة:
              </span>
              <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                <CheckCircle2 className="w-3 h-3" />
                <span>توازن دقيق 100%</span>
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-zinc-400">
                <span>• تكلفة البضاعة الأصلية (Cost C):</span>
                <span className="text-zinc-200 font-bold">{formatCurrency(calculation.costEGP)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>• التكلفة التشغيلية الثابتة (Fixed F):</span>
                <span className="text-zinc-200 font-bold">{formatCurrency(fixedCostEGP)}</span>
              </div>
              <div className="flex items-center justify-between text-amber-500">
                <span>• كاش باك وحافز التاجر ({cashbackPercent}%):</span>
                <span className="font-bold">{formatCurrency(calculation.cashbackAmountEGP)}</span>
              </div>
              <div className="flex items-center justify-between text-blue-400">
                <span>• عمولة إحالة وتوزيع الشركاء ({partnerCommissionPercent}%):</span>
                <span className="font-bold">{formatCurrency(calculation.referralAmountEGP)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>• احتياطي طوارئ الجملة ({reservePercent}%):</span>
                <span className="font-bold">{formatCurrency(calculation.reserveAmountEGP)}</span>
              </div>
              <div className="flex items-center justify-between text-cyan-400">
                <span>• صندوق تطوير منصة الموزعين ({developmentPercent}%):</span>
                <span className="font-bold">{formatCurrency(calculation.devAmountEGP)}</span>
              </div>
              <div className="flex items-center justify-between text-rose-400">
                <span>• حوافز وتخفيضات تجار VIP ({offersPercent}%):</span>
                <span className="font-bold">{formatCurrency(calculation.offersAmountEGP)}</span>
              </div>
              <div className="pt-1.5 border-t border-gray-200 dark:border-[#27272A] flex items-center justify-between text-emerald-500 font-bold text-xs">
                <span>صافي ربح الشركة النهائي المحقق:</span>
                <span>+{formatCurrency(calculation.netRealizedProfitEGP)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Card>
  );
};
