import React from 'react';
import { JKRWallet } from '../../../types/jkrWallet.types';
import { Button } from '../../../components/common/Button';
import { ShieldAlert, Plus, Trash2, ArrowUp, ArrowDown, Star, Coins } from 'lucide-react';
import { JKRWalletEngine } from '../../../services/financial/jkrWalletEngine';

interface JKRProductWalletPrioritySelectProps {
  subWallets: JKRWallet[];
  primaryWalletId: string;
  onPrimaryWalletChange: (id: string) => void;
  alternativeWalletIds: string[];
  onAlternativeWalletsChange: (ids: string[]) => void;
  pointsCostPerUnit: number | string;
  onPointsCostChange: (points: number | string) => void;
  onApplyCalculatedCostUSD?: (usd: number) => void;
}

export const JKRProductWalletPrioritySelect: React.FC<JKRProductWalletPrioritySelectProps> = ({
  subWallets,
  primaryWalletId,
  onPrimaryWalletChange,
  alternativeWalletIds,
  onAlternativeWalletsChange,
  pointsCostPerUnit,
  onPointsCostChange,
  onApplyCalculatedCostUSD
}) => {
  // Local string state to handle natural decimal typing (e.g. "2.", "2.2")
  // and backspacing without stubborn zero reverting.
  const [pointsText, setPointsText] = React.useState<string>(() => {
    if (pointsCostPerUnit === 0 || pointsCostPerUnit === '0' || pointsCostPerUnit === '') return '';
    return String(pointsCostPerUnit);
  });

  React.useEffect(() => {
    const propStr = pointsCostPerUnit === 0 || pointsCostPerUnit === '0' || pointsCostPerUnit === '' ? '' : String(pointsCostPerUnit);
    const propNum = parseFloat(propStr);
    const currentNum = parseFloat(pointsText);

    if (pointsText === '' && (propStr === '' || propNum === 0 || isNaN(propNum))) {
      return;
    }

    if (!isNaN(propNum)) {
      if (isNaN(currentNum) || currentNum !== propNum) {
        setPointsText(propStr);
      }
    } else if (propStr === '' && pointsText !== '') {
      setPointsText('');
    }
  }, [pointsCostPerUnit]);

  const pointUSD = React.useMemo(() => {
    return primaryWalletId ? JKRWalletEngine.getWalletLatestPointCostUSD(primaryWalletId) : 0;
  }, [primaryWalletId]);

  const parsedPts = parseFloat(pointsText) || 0;

  const effectiveCost = React.useMemo(() => {
    if (!primaryWalletId || parsedPts <= 0) return null;
    return JKRWalletEngine.getWalletEffectivePointCost(primaryWalletId, parsedPts);
  }, [primaryWalletId, parsedPts]);

  const calculatedUSD = effectiveCost && effectiveCost.totalCostUSD > 0
    ? effectiveCost.totalCostUSD
    : (parsedPts > 0 && pointUSD > 0 ? Math.round(parsedPts * pointUSD * 10000) / 10000 : 0);
  const calculatedEGP = effectiveCost && effectiveCost.totalCostEGP > 0
    ? effectiveCost.totalCostEGP
    : 0;

  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/,/g, '.');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setPointsText(raw);
      onPointsCostChange(raw);
    }
  };

  const handlePointsFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '0' || e.target.value === '0.00') {
      e.target.select();
    }
  };

  // Available alternatives (exclude primary and already added alternatives)
  const availableToAdd = subWallets.filter(
    w => w.id !== primaryWalletId && !alternativeWalletIds.includes(w.id)
  );

  const handleAddAlternative = (walletId: string) => {
    if (!walletId) return;
    onAlternativeWalletsChange([...alternativeWalletIds, walletId]);
  };

  const handleRemoveAlternative = (idx: number) => {
    const updated = [...alternativeWalletIds];
    updated.splice(idx, 1);
    onAlternativeWalletsChange(updated);
  };

  const handleMoveUp = (idx: number) => {
    if (idx <= 0) return;
    const updated = [...alternativeWalletIds];
    const temp = updated[idx - 1];
    updated[idx - 1] = updated[idx];
    updated[idx] = temp;
    onAlternativeWalletsChange(updated);
  };

  const handleMoveDown = (idx: number) => {
    if (idx >= alternativeWalletIds.length - 1) return;
    const updated = [...alternativeWalletIds];
    const temp = updated[idx + 1];
    updated[idx + 1] = updated[idx];
    updated[idx] = temp;
    onAlternativeWalletsChange(updated);
  };
  return (
    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3.5 text-right text-xs">
      <div className="flex items-center justify-between">
        <span className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-sm">
          <Coins className="w-4 h-4 text-orange-500" />
          ربط المحافظ وأولويات الاستهلاك (Product Wallets Priority)
        </span>
        <span className="text-[10px] text-zinc-400 font-mono">
          ترتيب أسبقية الصرف التلقائي
        </span>
      </div>

      {/* Points Per Unit Input */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block font-bold text-zinc-800 dark:text-zinc-200">
            تكلفة النقاط للباقة / الوحدة (Points Required Per Unit) *
          </label>
          {pointUSD > 0 && (
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              سعر النقطة بالمحفظة: ${pointUSD.toFixed(4)}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={pointsText}
            onChange={handlePointsChange}
            onFocus={handlePointsFocus}
            placeholder="0.00 (مثال: 0.5 أو 86.5)"
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/40 p-2.5 pl-14 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-black text-sm text-orange-500 focus:border-orange-500"
          />
          <span className="absolute left-3 top-2.5 text-zinc-400 font-bold text-xs">نقطة</span>
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-400">
          <span>عدد النقاط التي سيتم خصمها من المحفظة الفعلية المختارة وفق الـ FIFO عند إتمام التذكرة.</span>
          {parsedPts > 0 && calculatedUSD > 0 && (
            <div className="flex items-center gap-1.5 font-mono font-bold text-orange-500">
              <span>= ${calculatedUSD} USD {calculatedEGP > 0 ? `(${calculatedEGP.toFixed(2)} ج)` : ''}</span>
              {onApplyCalculatedCostUSD && (
                <button
                  type="button"
                  onClick={() => onApplyCalculatedCostUSD(calculatedUSD)}
                  className="px-2 py-0.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-sans font-bold transition-colors cursor-pointer border border-orange-500/20"
                  title="تطبيق هذه القيمة كتكلفة بالدولار للمنتج"
                >
                  اعتماد كـ تكلفة USD
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Primary Wallet Selection (Priority 1) */}
      <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/30 space-y-1.5 shadow-xs">
        <div className="flex items-center justify-between">
          <label className="font-black text-orange-500 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
            المحفظة الأساسية الأولى (Primary Wallet - Priority 1) *
          </label>
          <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 font-bold text-[10px]">
            الأولوية القصوى
          </span>
        </div>

        <select
          value={primaryWalletId}
          onChange={e => onPrimaryWalletChange(e.target.value)}
          className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
        >
          <option value="">-- اختر المحفظة الأساسية --</option>
          {subWallets.map(w => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.pointsBalance.toLocaleString()} نقطة | حد الأمان: {w.safetyLimit || -500})
            </option>
          ))}
        </select>
        <span className="text-[10px] text-zinc-400">
          يبدأ النظام باستهلاك النقاط منها أولاً ما دامت نشطة ولم تتجاوز حد الأمان.
        </span>
      </div>

      {/* Alternative Wallets List (Priority 2, 3...) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <label className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
            المحافظ البديلة المرتبة (Alternative Wallets)
          </label>
          <span className="text-[10px] text-zinc-400">
            {alternativeWalletIds.length} محافظ بديلة
          </span>
        </div>

        {alternativeWalletIds.length === 0 ? (
          <div className="p-3 text-center rounded-xl bg-white dark:bg-[#18181B] border border-dashed border-gray-300 dark:border-[#27272A] text-zinc-400 text-[11px]">
            لا توجد محافظ بديلة مضافة. في حال تعطل المحفظة الأساسية أو نفاد رصيدها سيتعطل المنتج.
          </div>
        ) : (
          <div className="space-y-1.5">
            {alternativeWalletIds.map((altId, idx) => {
              const altWallet = subWallets.find(w => w.id === altId);
              return (
                <div
                  key={altId}
                  className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between shadow-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold text-[10px] border border-purple-500/20">
                      أولوية #{idx + 2}
                    </span>
                    <strong className="text-zinc-900 dark:text-zinc-100 text-xs">
                      {altWallet?.name || 'محفظة غير معروفة'}
                    </strong>
                    <span className="text-[10px] text-zinc-400">
                      ({altWallet?.pointsBalance?.toLocaleString() || 0} نقطة)
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveUp(idx)}
                      className="p-1 rounded bg-gray-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 cursor-pointer"
                      title="رفع الأولوية"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === alternativeWalletIds.length - 1}
                      onClick={() => handleMoveDown(idx)}
                      className="p-1 rounded bg-gray-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 cursor-pointer"
                      title="خفض الأولوية"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveAlternative(idx)}
                      className="p-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer ml-1"
                      title="حذف من البدائل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Alternative Dropdown */}
        {availableToAdd.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <select
              id="select-add-alt-wallet"
              defaultValue=""
              onChange={e => {
                if (e.target.value) {
                  handleAddAlternative(e.target.value);
                  e.target.value = '';
                }
              }}
              className="flex-1 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-700 dark:text-zinc-300 outline-none text-[11px]"
            >
              <option value="">➕ إضافة محفظة بديلة...</option>
              {availableToAdd.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.pointsBalance.toLocaleString()} نقطة)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Explanatory Note (Rule #22 & #23) */}
      <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] space-y-1">
        <strong className="block font-bold">💡 كيف يتم اختيار المحفظة تلقائياً عند تنفيذ التذكرة؟</strong>
        <p>
          يتم فحص المحفظة الأساسية أولاً؛ إذا كانت معطلة، مجمدة، أو تجاوز استهلاكها حد الأمان السالب، ينتقل النظام تلقائياً وبترتيب الأولويات للبديل الأول ثم الثاني. إذا تعذرت كافة المحافظ، يصبح المنتج غير متاح فوراً.
        </p>
      </div>
    </div>
  );
};
