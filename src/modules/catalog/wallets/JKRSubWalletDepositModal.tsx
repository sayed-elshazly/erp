import React, { useState, useMemo } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { JKRWallet } from '../../../types/jkrWallet.types';
import { JKRWalletEngine } from '../../../services/financial/jkrWalletEngine';
import { PricingEngine } from '../../../services/pricing/pricingEngine';
import { useNotifications } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../utils/formatters';
import { Coins, ArrowDownRight, Layers, AlertTriangle, ShieldCheck } from 'lucide-react';

interface JKRSubWalletDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: JKRWallet;
  mainWallets: JKRWallet[];
  onSuccess: () => void;
}

export const JKRSubWalletDepositModal: React.FC<JKRSubWalletDepositModalProps> = ({
  isOpen,
  onClose,
  wallet,
  mainWallets,
  onSuccess
}) => {
  const { showToast } = useNotifications();
  const { user } = useAuth();
  const isOwner = user?.role === 'admin';

  const [amountUSD, setAmountUSD] = useState<string>('100');
  const [pointsCount, setPointsCount] = useState<string>('10000');
  const [ticketNumber, setTicketNumber] = useState<string>(() => `DEP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`);
  const [allowManualRate, setAllowManualRate] = useState(false);
  const [manualRate, setManualRate] = useState<string>('50');
  const [overrideReason, setOverrideReason] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numAmountUSD = parseFloat(amountUSD) || 0;
  const numPointsCount = parseFloat(pointsCount) || 0;
  const numManualRate = parseFloat(manualRate) || 0;

  // Find Parent Main Wallet
  const parentMain = useMemo(() => {
    return mainWallets.find(w => w.id === wallet.parentWalletId) || mainWallets[0];
  }, [mainWallets, wallet.parentWalletId]);

  // Preview Main Wallet FIFO Cost
  const fifoPreview = useMemo(() => {
    if (!parentMain) return { effectiveRate: 50, totalEGP: numAmountUSD * 50, availableUSD: 0, isSufficient: false };

    const lots = JKRWalletEngine.getLotsByWallet(parentMain.id)
      .filter(l => l.remainingQuantity > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const totalAvail = lots.reduce((sum, l) => sum + l.remainingQuantity, 0);
    const isSuff = totalAvail >= numAmountUSD;

    let rem = numAmountUSD;
    let sumEGP = 0;
    for (const l of lots) {
      if (rem <= 0) break;
      const take = Math.min(l.remainingQuantity, rem);
      sumEGP += take * l.unitCostEGP;
      rem -= take;
    }

    if (rem > 0 && lots.length > 0) {
      // If shortage, calculate remaining with last lot rate
      sumEGP += rem * (lots[lots.length - 1]?.unitCostEGP || 50);
    }

    const effRate = numAmountUSD > 0 ? (sumEGP / numAmountUSD) : 50;
    return {
      effectiveRate: Number(effRate.toFixed(4)),
      totalEGP: sumEGP,
      availableUSD: totalAvail,
      isSufficient: isSuff
    };
  }, [parentMain, numAmountUSD]);

  // Final Calculations
  const effectiveRateUsed = allowManualRate && numManualRate > 0 ? numManualRate : fifoPreview.effectiveRate;
  const finalTotalCostEGP = numAmountUSD * effectiveRateUsed;
  const costPerPointEGP = numPointsCount > 0 ? (finalTotalCostEGP / numPointsCount) : 0;
  const costPerPointUSD = numPointsCount > 0 ? (numAmountUSD / numPointsCount) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (numAmountUSD <= 0) {
      showToast('error', 'مبلغ غير صالح', 'يرجى إدخال مبلغ بالدولار أكبر من الصفر');
      return;
    }
    if (numPointsCount <= 0) {
      showToast('error', 'عدد نقاط غير صالح', 'يرجى إدخال عدد نقاط أكبر من الصفر');
      return;
    }
    if (!fifoPreview.isSufficient) {
      showToast(
        'error',
        'رصيد المحفظة الرئيسية غير كافٍ',
        `المتاح بالدولار في [${parentMain?.name}]: $${fifoPreview.availableUSD}، والمطلوب: $${numAmountUSD}`
      );
      return;
    }
    if (allowManualRate && (!numManualRate || numManualRate <= 0 || !overrideReason.trim())) {
      showToast('error', 'سبب التعديل مطلوب', 'يرجى إدخال سبب تعديل سعر الدولار اليدوي لسجل التدقيق');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = JKRWalletEngine.depositSubWalletPoints({
        subWalletId: wallet.id,
        amountUSD: numAmountUSD,
        pointsCount: numPointsCount,
        manualUSDRate: allowManualRate ? numManualRate : undefined,
        overrideReason: allowManualRate ? overrideReason.trim() : undefined,
        purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
        ticketNumber: ticketNumber.trim() || undefined,
        notes: notes.trim() || undefined
      }, user);

      showToast(
        'success',
        'تم إصدار تذكرة الإيداع بنجاح',
        `تمت إضافة ${res.subLot.initialQuantity.toLocaleString()} نقطة برقم تذكرة #${res.subTransaction.ticketNumber || ticketNumber} بتكلفة ${res.subLot.unitCostEGP.toFixed(4)} ج/نقطة.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('error', 'فشل الإيداع', err.message || 'حدث خطأ أثناء شراء النقاط');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`💎 فتح تذكرة إيداع وشراء نقاط: [${wallet.name}]`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right text-xs">
        {/* Ticket Header & Executor Guaranteed Banner */}
        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 font-bold text-xs">
              🎫 تذكرة إيداع
            </span>
            <input
              type="text"
              value={ticketNumber}
              onChange={e => setTicketNumber(e.target.value)}
              placeholder="DEP-2026-XXXXX"
              className="bg-transparent border-b border-purple-500/40 text-purple-600 dark:text-purple-300 font-bold font-mono text-xs outline-none px-1 py-0.5 focus:border-purple-400"
              title="رقم تذكرة الإيداع الرسمية"
            />
          </div>
          <div className="text-left text-[11px] font-sans">
            <span className="text-zinc-400 block text-[9.5px]">الموظف المنفذ:</span>
            <strong className="text-zinc-900 dark:text-zinc-100 font-bold">
              👤 {user?.fullName || (user as any)?.name || 'المدير العام (Owner)'}
            </strong>
          </div>
        </div>

        {/* Info Banner: Parent Main Wallet */}
        <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between font-mono">
          <div>
            <span className="text-[10px] text-zinc-400 block">المحفظة الرئيسية الممولة:</span>
            <strong className="text-sm font-black text-orange-500">
              {parentMain?.name || 'غير محددة'}
            </strong>
          </div>
          <div className="text-left">
            <span className="text-[10px] text-zinc-400 block">الرصيد الدولاري المتاح:</span>
            <strong className={`text-sm font-black ${fifoPreview.isSufficient ? 'text-emerald-500' : 'text-rose-500'}`}>
              ${fifoPreview.availableUSD.toLocaleString()} USD
            </strong>
          </div>
        </div>

        {/* Inputs: Amount USD & Points Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              المبلغ المدفوع بالدولار (USD) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                required
                value={amountUSD}
                onChange={e => setAmountUSD(e.target.value)}
                placeholder="100"
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/40 p-2.5 pl-8 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-black text-sm"
              />
              <span className="absolute left-2.5 top-2.5 text-orange-500 font-bold">$</span>
            </div>
            <span className="text-[10px] text-zinc-400">يخصم تلقائياً من FIFO المحفظة الرئيسية</span>
          </div>

          <div>
            <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              عدد النقاط المستلمة (Points) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                required
                value={pointsCount}
                onChange={e => setPointsCount(e.target.value)}
                placeholder="10000"
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 pl-12 text-zinc-900 dark:text-zinc-100 outline-none font-mono font-black text-sm text-purple-400"
              />
              <span className="absolute left-2.5 top-2.5 text-zinc-400 font-bold text-[10px]">نقطة</span>
            </div>
            <span className="text-[10px] text-zinc-400">الرصيد الذي سيضاف كـ Lot جديد مستقل</span>
          </div>
        </div>

        {/* Real FIFO Calculation Breakdown Box (Requirements 13 & 14) */}
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2 font-mono">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-500 font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              سعر الدولار الفعلي من FIFO الرئيسية:
            </span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {fifoPreview.effectiveRate} ج/دولار
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-500 font-bold">إجمالي تكلفة الشحنة بالجنيه:</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(finalTotalCostEGP)}
            </span>
          </div>

          <div className="pt-1.5 border-t border-gray-200 dark:border-[#27272A] flex items-center justify-between">
            <span className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-orange-500" />
              تكلفة النقطة المحسوبة (Cost Per Point):
            </span>
            <div className="text-left">
              <strong className="text-sm font-black text-emerald-500 block">
                {costPerPointEGP.toFixed(4)} ج / نقطة
              </strong>
              <span className="text-[10px] text-zinc-400 block font-mono">
                (${costPerPointUSD.toFixed(6)} USD)
              </span>
            </div>
          </div>
        </div>

        {/* Owner Manual USD Rate Override (Rule #15) */}
        {isOwner && (
          <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2">
            <label className="flex items-center justify-between cursor-pointer select-none font-bold text-purple-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                تعديل سعر الدولار يدوياً (خاص بالمالك)
              </span>
              <input
                type="checkbox"
                checked={allowManualRate}
                onChange={e => {
                  setAllowManualRate(e.target.checked);
                  if (e.target.checked) setManualRate(String(fifoPreview.effectiveRate));
                }}
                className="w-4 h-4 text-purple-500 rounded"
              />
            </label>

            {allowManualRate && (
              <div className="space-y-2 pt-2 border-t border-purple-500/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      سعر الدولار المعدل (جنيه) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={manualRate}
                      onChange={e => setManualRate(e.target.value)}
                      className="w-full rounded-lg bg-white dark:bg-[#18181B] border border-purple-500/40 p-2 text-purple-400 font-mono font-black outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      سبب التعديل (إلزامي لسجل التدقيق) *
                    </label>
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                      placeholder="مثال: خصم إضافي من المورد أو عمولة تحويل خاصة"
                      className="w-full rounded-lg bg-white dark:bg-[#18181B] border border-purple-500/40 p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                      required
                    />
                  </div>
                </div>
                <span className="text-[10px] text-zinc-400 block">
                  💡 سيتم الاحتفاظ بسعر الـ FIFO الأصلي ({fifoPreview.effectiveRate.toFixed(2)} ج) في سجلات التدقيق والمقارنة.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Purchase Date & Time (Editable as per Section 18) */}
        <div>
          <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
            تاريخ ووقت الشراء * (تلقائي وقابل للتعديل اليدوي)
          </label>
          <input
            type="datetime-local"
            value={purchaseDate}
            onChange={e => setPurchaseDate(e.target.value)}
            required
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-mono outline-none text-xs"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
            ملاحظات الشحنة (اختياري)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="رقم العملية، اسم الحساب المشحون..."
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting || !fifoPreview.isSufficient}
            icon={<ArrowDownRight className="w-4 h-4" />}
          >
            تأكيد الشراء وإيداع الـ Lot
          </Button>
        </div>
      </form>
    </Modal>
  );
};
