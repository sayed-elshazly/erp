import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/formatters';
import {
  ArrowLeftRight,
  AlertTriangle,
  Coins,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface CurrencyExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultName: string;
  balanceEGP: number;
  balanceUSD: number;
  avgUsdPurchaseRate?: number;
  onConfirmExchange: (data: {
    exchangeType: 'buy_usd' | 'sell_usd';
    usdAmount: number;
    usdExchangeRate: number;
    description: string;
    notes?: string;
  }) => void;
}

export const CurrencyExchangeModal: React.FC<CurrencyExchangeModalProps> = ({
  isOpen,
  onClose,
  vaultName,
  balanceEGP,
  balanceUSD,
  avgUsdPurchaseRate = 50,
  onConfirmExchange
}) => {
  const [exchangeType, setExchangeType] = useState<'buy_usd' | 'sell_usd'>('buy_usd');
  const [usdAmountInput, setUsdAmountInput] = useState<string>('50');
  const [usdRateInput, setUsdRateInput] = useState<string>(
    avgUsdPurchaseRate > 0 ? avgUsdPurchaseRate.toFixed(2) : '50.00'
  );
  const [customDescription, setCustomDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Update default rate if avgUsdPurchaseRate changes
  useEffect(() => {
    if (avgUsdPurchaseRate > 0 && !usdRateInput) {
      setUsdRateInput(avgUsdPurchaseRate.toFixed(2));
    }
  }, [avgUsdPurchaseRate]);

  const usdAmount = parseFloat(usdAmountInput) || 0;
  const usdRate = parseFloat(usdRateInput) || 0;
  const totalEGP = Math.round(usdAmount * usdRate * 100) / 100;

  // Validation
  const isEgpInsufficient = exchangeType === 'buy_usd' && totalEGP > balanceEGP;
  const isUsdInsufficient = exchangeType === 'sell_usd' && usdAmount > balanceUSD;
  const hasInvalidAmount = usdAmount <= 0 || usdRate <= 0;
  const canSubmit = !hasInvalidAmount && !isEgpInsufficient && !isUsdInsufficient;

  // Impact Preview
  const newBalanceEGP =
    exchangeType === 'buy_usd' ? balanceEGP - totalEGP : balanceEGP + totalEGP;
  const newBalanceUSD =
    exchangeType === 'buy_usd' ? balanceUSD + usdAmount : Math.max(0, balanceUSD - usdAmount);

  // Auto-suggested description
  const defaultDescription =
    exchangeType === 'buy_usd'
      ? `شراء $${usdAmount.toLocaleString('en-US')} بسعر صرف ${usdRate} ج.م خصماً من رصيد الجنيه`
      : `بيع $${usdAmount.toLocaleString('en-US')} بسعر صرف ${usdRate} ج.م وإيداع المقابل بالجنيه`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onConfirmExchange({
      exchangeType,
      usdAmount,
      usdExchangeRate: usdRate,
      description: customDescription.trim() || defaultDescription,
      notes: notes.trim() || undefined
    });
  };

  const handleQuickAmount = (val: number) => {
    setUsdAmountInput(val.toString());
  };

  const handleMaxAmount = () => {
    if (exchangeType === 'sell_usd') {
      setUsdAmountInput(balanceUSD.toString());
    } else {
      if (usdRate > 0) {
        const maxUsd = Math.floor((balanceEGP / usdRate) * 100) / 100;
        setUsdAmountInput(Math.max(0, maxUsd).toString());
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="💱 صرافة وتبديل العملات (شراء / بيع دولار)"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right" dir="rtl">
        {/* Top Vault & Mode Header */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                {vaultName}
              </span>
              <span className="text-[11px] text-zinc-500">
                تسجيل حركة تبديل عملة موحدة ومترابطة بين رصيد الجنيه والدولار
              </span>
            </div>
          </div>
          <Badge variant="warning" size="sm">ربط رصيد مزدوج</Badge>
        </div>

        {/* Direction Switcher */}
        <div>
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
            نوع عملية التبديل:
          </label>
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/50">
            {/* Option 1: Buy USD with EGP */}
            <button
              type="button"
              onClick={() => setExchangeType('buy_usd')}
              className={`p-3 rounded-xl text-right transition-all cursor-pointer flex flex-col justify-between ${
                exchangeType === 'buy_usd'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black">شراء دولار بالجنيه</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    exchangeType === 'buy_usd'
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  EGP ➔ USD
                </span>
              </div>
              <p
                className={`text-[10px] mt-1 line-clamp-1 ${
                  exchangeType === 'buy_usd' ? 'text-emerald-100' : 'text-zinc-400'
                }`}
              >
                خصم جنيه من الخزنة + إضافة دولار
              </p>
            </button>

            {/* Option 2: Sell USD for EGP */}
            <button
              type="button"
              onClick={() => setExchangeType('sell_usd')}
              className={`p-3 rounded-xl text-right transition-all cursor-pointer flex flex-col justify-between ${
                exchangeType === 'sell_usd'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black">بيع دولار واستلام جنيه</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    exchangeType === 'sell_usd'
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  USD ➔ EGP
                </span>
              </div>
              <p
                className={`text-[10px] mt-1 line-clamp-1 ${
                  exchangeType === 'sell_usd' ? 'text-blue-100' : 'text-zinc-400'
                }`}
              >
                خصم دولار من الخزنة + إضافة جنيه
              </p>
            </button>
          </div>
        </div>

        {/* Current Vault Balances Bar */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-center text-xs">
          <div>
            <span className="text-[10px] text-zinc-400 block">رصيد الجنيه المتاح</span>
            <span className="font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(balanceEGP)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 block">رصيد الدولار المتاح</span>
            <span className="font-black font-mono text-blue-600 dark:text-blue-400">
              ${balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 block">متوسط شراء الدولار</span>
            <span className="font-black font-mono text-amber-600 dark:text-amber-400">
              {avgUsdPurchaseRate.toFixed(2)} ج.م
            </span>
          </div>
        </div>

        {/* Inputs: Amount & Exchange Rate */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {exchangeType === 'buy_usd'
                  ? 'عدد الدولارات المراد شراؤها ($):'
                  : 'عدد الدولارات المراد بيعها ($):'}
              </label>
              <div className="flex items-center gap-1">
                {[10, 25, 50, 100, 500].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleQuickAmount(v)}
                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-mono transition-colors"
                  >
                    +${v}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleMaxAmount}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-bold transition-colors"
                >
                  الكل
                </button>
              </div>
            </div>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={usdAmountInput}
                onChange={e => setUsdAmountInput(e.target.value)}
                placeholder="50.00"
                className="font-mono text-base font-bold pr-8"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-black text-zinc-400 font-mono">
                $
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                سعر صرف الدولار بالجنيه:
              </label>
              <Input
                type="number"
                step="0.01"
                min="1"
                required
                value={usdRateInput}
                onChange={e => setUsdRateInput(e.target.value)}
                placeholder="50.00"
                className="font-mono"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                ج.م لكل 1 دولار أمريكي
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                {exchangeType === 'buy_usd'
                  ? 'إجمالي التكلفة بالجنيه المصري (خصم):'
                  : 'إجمالي المستلم بالجنيه المصري (إيداع):'}
              </label>
              <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 flex items-center justify-between">
                <span className="text-xs text-zinc-500">القيمة بالجنيه:</span>
                <span
                  className={`text-sm font-black font-mono ${
                    exchangeType === 'buy_usd'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {exchangeType === 'buy_usd' ? '-' : '+'}
                  {formatCurrency(totalEGP)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Warning Banners */}
        {isEgpInsufficient && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-start gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">رصيد الجنيه في الخزنة غير كافٍ!</span>
              <span>
                تكلفة الشراء ({formatCurrency(totalEGP)}) تتجاوز رصيد الجنيه الحالي (
                {formatCurrency(balanceEGP)}). يرجى خفض عدد الدولارات أو إيداع نقدية أولاً.
              </span>
            </div>
          </div>
        )}

        {isUsdInsufficient && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-start gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">رصيد الدولار في الخزنة غير كافٍ!</span>
              <span>
                عدد الدولارات المطلوب بيعها (${usdAmount.toFixed(2)}) يتجاوز رصيد الدولار
                المتاح حالياً (${balanceUSD.toFixed(2)}).
              </span>
            </div>
          </div>
        )}

        {/* Live Simulator: Before & After */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100/70 dark:from-zinc-900/80 dark:to-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
            <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              محاكاة الأرصدة بعد تنفيذ العملية:
            </span>
            <span className="text-[10px] text-emerald-500 font-semibold">تأثير فوري مباشر</span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="p-2 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/40">
              <span className="text-[10px] text-zinc-400 block font-sans">
                الرصيد الجديد بالجنيه (EGP):
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-zinc-400 text-[11px] line-through">
                  {formatCurrency(balanceEGP)}
                </span>
                <ArrowRight className="w-3 h-3 text-zinc-400 rotate-180" />
                <span
                  className={`font-black ${
                    exchangeType === 'buy_usd'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatCurrency(newBalanceEGP)}
                </span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/40">
              <span className="text-[10px] text-zinc-400 block font-sans">
                الرصيد الجديد بالدولار (USD):
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-zinc-400 text-[11px] line-through">
                  ${balanceUSD.toFixed(2)}
                </span>
                <ArrowRight className="w-3 h-3 text-zinc-400 rotate-180" />
                <span
                  className={`font-black ${
                    exchangeType === 'buy_usd'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  ${newBalanceUSD.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description & Notes */}
        <div className="space-y-2">
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              البيان التوضيحي (اختياري، يترك فارغاً للصيغة التلقائية):
            </label>
            <Input
              placeholder={defaultDescription}
              value={customDescription}
              onChange={e => setCustomDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              ملاحظات أو مرجع العملية (اختياري):
            </label>
            <textarea
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden"
              rows={2}
              placeholder="مثال: تم التبديل عبر صرافة البنك الأهلي، إيصال رقم..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!canSubmit}
            className={`font-bold ${
              exchangeType === 'buy_usd'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {exchangeType === 'buy_usd'
              ? `تأكيد شراء $${usdAmount.toFixed(2)} (خصم ${formatCurrency(totalEGP)}) 💱`
              : `تأكيد بيع $${usdAmount.toFixed(2)} (إيداع ${formatCurrency(totalEGP)}) 💱`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
