import React, { useState } from 'react';
import { JKRWallet } from '../../../types/jkrWallet.types';
import { JKRWalletEngine } from '../../../services/financial/jkrWalletEngine';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { ArrowUpRight, DollarSign, Wallet, FileText } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';

interface JKRMainWalletWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: JKRWallet;
  onSuccess: () => void;
}

export const JKRMainWalletWithdrawModal: React.FC<JKRMainWalletWithdrawModalProps> = ({
  isOpen,
  onClose,
  wallet,
  onSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [amountUSD, setAmountUSD] = useState<string>('50');
  const [destinationWalletName, setDestinationWalletName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numAmountUSD = parseFloat(amountUSD) || 0;
  const availableUSD = wallet.balanceUSD || 0;
  const isSufficient = numAmountUSD > 0 && numAmountUSD <= availableUSD;

  // Approximate FIFO valuation
  const lots = JKRWalletEngine.getLotsByWallet(wallet.id)
    .filter(l => l.remainingQuantity > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let remUSD = numAmountUSD;
  let estimatedEGP = 0;
  for (const l of lots) {
    if (remUSD <= 0) break;
    const take = Math.min(l.remainingQuantity, remUSD);
    estimatedEGP += take * l.unitCostEGP;
    remUSD -= take;
  }
  if (remUSD > 0 && lots.length > 0) {
    estimatedEGP += remUSD * (lots[lots.length - 1]?.unitCostEGP || 50);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (numAmountUSD <= 0) {
      showToast('error', 'مبلغ غير صالح', 'يرجى إدخال مبلغ أكبر من الصفر');
      return;
    }
    if (!destinationWalletName.trim()) {
      showToast('error', 'الوجهة مطلوبة', 'يرجى تحديد وجهة السحب أو اسم المحفظة المستهدفة');
      return;
    }
    if (numAmountUSD > availableUSD) {
      showToast('error', 'الرصيد غير كافٍ', `الرصيد المتاح: $${availableUSD.toFixed(2)}، والمطلوب: $${numAmountUSD}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = JKRWalletEngine.withdrawFromMainWallet({
        walletId: wallet.id,
        amountUSD: numAmountUSD,
        destinationWalletName: destinationWalletName.trim(),
        notes: notes.trim() || undefined
      }, user);

      showToast(
        'success',
        'تم السحب والتوجيه بنجاح',
        `تم سحب $${numAmountUSD} (${formatCurrency(res.transaction.amountEGP || 0)}) وتوجيهها إلى: [${destinationWalletName.trim()}].`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('error', 'فشل السحب', err.message || 'حدث خطأ أثناء تنفيذ السحب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`سحب وتوجيه من المحفظة الرئيسية [${wallet.name}]`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {/* Info Box */}
        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              الرصيد المتاح حالياً بالدولار:
            </span>
            <strong className="font-mono text-sm font-black">${availableUSD.toLocaleString()} USD</strong>
          </div>
          <span className="text-[10px] text-zinc-500 block">
            يتم سحب وتوجيه الرصيد لأي محفظة أخرى أو جهة مع تسجيل اسم الوجهة بدقة في دفتر الأستاذ.
          </span>
        </div>

        {/* Amount USD */}
        <div>
          <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
            المبلغ المراد سحبه بالدولار ($) *
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0.01"
              max={availableUSD}
              value={amountUSD}
              onChange={e => setAmountUSD(e.target.value)}
              required
              className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 font-mono text-zinc-900 dark:text-zinc-100 outline-none focus:border-rose-500/40 text-sm font-bold"
            />
            <DollarSign className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          </div>
          {!isSufficient && numAmountUSD > availableUSD && (
            <span className="text-[10px] text-rose-500 block mt-1">
              ⚠️ المبلغ المطلوب يتجاوز الرصيد المتاح بالمحفظة (${availableUSD.toFixed(2)})
            </span>
          )}
        </div>

        {/* Destination Wallet / Account */}
        <div>
          <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
            وجهة السحب / اسم المحفظة المستهدفة * (إلزامي للتوثيق والتدقيق)
          </label>
          <input
            type="text"
            value={destinationWalletName}
            onChange={e => setDestinationWalletName(e.target.value)}
            required
            placeholder="مثال: محفظة باينانس، محفظة كاش التشغيل، مورد خارجي..."
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500/40 font-bold"
          />
        </div>

        {/* Valuation Preview */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex items-center justify-between font-mono">
          <span className="text-zinc-500">القيمة المعادلة بالجنيه (FIFO):</span>
          <strong className="text-sm font-black text-zinc-900 dark:text-zinc-100">
            {formatCurrency(estimatedEGP)}
          </strong>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
            البيان والملاحظات (اختياري)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="رقم الحوالة، سبب التحويل أو التوجيه..."
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            disabled={isSubmitting || !isSufficient || !destinationWalletName.trim()}
            icon={<ArrowUpRight className="w-4 h-4" />}
          >
            تأكيد السحب والتوجيه
          </Button>
        </div>
      </form>
    </Modal>
  );
};
