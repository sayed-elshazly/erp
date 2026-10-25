import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { JKRWallet, JKRWalletLot, JKRWalletTransaction } from '../../../types/jkrWallet.types';
import { JKRWalletEngine } from '../../../services/financial/jkrWalletEngine';
import { PricingEngine } from '../../../services/pricing/pricingEngine';
import { useNotifications } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../utils/formatters';
import {
  Pencil,
  AlertTriangle,
  Coins,
  DollarSign,
  Calendar,
  Layers,
  FileText,
  TrendingDown,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';

interface JKREditDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  lot: JKRWalletLot | null;
  transaction?: JKRWalletTransaction | null;
  wallet: JKRWallet | null;
  onSuccess: () => void;
}

export const JKREditDepositModal: React.FC<JKREditDepositModalProps> = ({
  isOpen,
  onClose,
  lot,
  transaction,
  wallet,
  onSuccess
}) => {
  const { showToast } = useNotifications();
  const { user } = useAuth();

  const isSubWallet = wallet?.type === 'SUB' || lot?.currencyOrPoints === 'POINTS';

  // Form states
  const [pointsCount, setPointsCount] = useState<string>('0');
  const [amountUSD, setAmountUSD] = useState<string>('0');
  const [rateEGP, setRateEGP] = useState<string>('50');
  const [depositDate, setDepositDate] = useState<string>('');
  const [ticketNumber, setTicketNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when lot opens
  useEffect(() => {
    if (isOpen && lot) {
      setPointsCount(lot.initialQuantity ? String(lot.initialQuantity) : '0');
      setAmountUSD(lot.totalCostUSD ? String(lot.totalCostUSD) : (lot.currencyOrPoints === 'USD' ? String(lot.initialQuantity) : '0'));
      setRateEGP(lot.exchangeRateUsed ? String(lot.exchangeRateUsed) : '50');
      setNotes(lot.notes || transaction?.notes || '');
      setTicketNumber(transaction?.ticketNumber || transaction?.transactionNumber || lot.lotNumber);

      const d = lot.purchaseDate || lot.createdAt ? new Date(lot.purchaseDate || lot.createdAt) : new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      setDepositDate(`${year}-${month}-${day}T${hours}:${mins}`);
    }
  }, [isOpen, lot, transaction]);

  if (!isOpen || !lot || !wallet) return null;

  const numPoints = parseFloat(pointsCount) || 0;
  const numUSD = parseFloat(amountUSD) || 0;
  const numRate = parseFloat(rateEGP) || 0;

  // Consumption calculation
  const alreadyConsumed = Math.max(0, lot.initialQuantity - lot.remainingQuantity);
  const minPointsAllowed = alreadyConsumed;

  // Diffs
  const deltaPoints = numPoints - lot.initialQuantity;
  const oldUSD = lot.totalCostUSD || (lot.currencyOrPoints === 'USD' ? lot.initialQuantity : 0);
  const deltaUSD = numUSD - oldUSD;

  const totalCostEGP = numUSD * numRate;
  const unitCostEGP = numPoints > 0 ? (totalCostEGP / numPoints) : 0;
  const unitCostUSD = numPoints > 0 ? (numUSD / numPoints) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubWallet && numPoints <= 0) {
      showToast('error', 'بيانات غير صحيحة', 'يجب إدخال عدد نقاط أكبر من الصفر');
      return;
    }

    if (isSubWallet && numPoints < minPointsAllowed) {
      showToast('error', 'كمية غير مسموحة', `لا يمكن خفض النقاط إلى أقل من الكمية المستهلكة (${minPointsAllowed.toLocaleString()} نقطة)`);
      return;
    }

    if (numUSD < 0 || numRate <= 0) {
      showToast('error', 'بيانات غير صحيحة', 'يجب إدخال تكلفة وسعر صرف صحيح');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = JKRWalletEngine.editDepositLot({
        lotId: lot.id,
        newPoints: isSubWallet ? numPoints : undefined,
        newAmountUSD: numUSD,
        newRateEGP: numRate,
        newDate: depositDate ? new Date(depositDate).toISOString() : undefined,
        newNotes: notes.trim(),
        newTicketNumber: ticketNumber.trim() || undefined,
        user
      });

      // Recalculate catalog prices based on updated cost per point
      try {
        PricingEngine.recalculateAllCatalogProducts();
      } catch (pe) {
        console.warn('Pricing recalculation after deposit edit:', pe);
      }

      showToast('success', 'تم تعديل الإيداع بنجاح', res.message);
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('error', 'فشل التعديل', err.message || 'حدث خطأ أثناء حفظ تعديلات الإيداع');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`✏️ تعديل تذكرة وشحنة الإيداع: #${lot.lotNumber}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right text-xs" dir="rtl">
        {/* Header Metadata Banner */}
        <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-orange-500/20 text-orange-500 font-bold text-xs">
              📦 دفعة #{lot.lotNumber}
            </span>
            <span className="text-[11px] text-zinc-500 font-sans">
              المحفظة: <strong className="text-zinc-900 dark:text-zinc-100">{wallet.name}</strong> [{isSubWallet ? wallet.pointType || 'نقاط' : 'دولار'}]
            </span>
          </div>

          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/15 text-blue-500 border border-blue-500/20">
            {isSubWallet ? 'شحنة مخزون نقاط' : 'شحنة تمويل دولاري'}
          </span>
        </div>

        {/* Consumption Warning if lot was partially consumed */}
        {alreadyConsumed > 0 && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed text-[11px]">
              <strong className="text-amber-600 dark:text-amber-400 block font-bold">
                تنبيه: تم استهلاك جزء من هذه الشحنة سابقاً!
              </strong>
              <p className="text-zinc-600 dark:text-zinc-300">
                مستهلك بالفعل: <strong className="font-mono">{alreadyConsumed.toLocaleString()}</strong> نقطة عبر تذاكر شحن سابقة.
                الحد الأدنى للكمية الجديدة المسموح بها هو <strong className="font-mono">{minPointsAllowed.toLocaleString()}</strong> نقطة لحماية اتساق سجلات العملاء.
              </p>
            </div>
          </div>
        )}

        {/* Official Ticket Number and Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold block mb-1 text-zinc-600 dark:text-zinc-300">
              🎫 رقم تذكرة الإيداع / السند:
            </label>
            <input
              type="text"
              value={ticketNumber}
              onChange={e => setTicketNumber(e.target.value)}
              placeholder="DEP-XXXXX"
              className="w-full rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] px-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono text-xs outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1 text-zinc-600 dark:text-zinc-300">
              📅 تاريخ ووقت الإيداع:
            </label>
            <input
              type="datetime-local"
              value={depositDate}
              onChange={e => setDepositDate(e.target.value)}
              className="w-full rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] px-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono text-xs outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Quantities & Points */}
        {isSubWallet ? (
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-orange-500" />
                  عدد النقاط المودعة الصحيح:
                </label>
                <span className="text-[10px] text-zinc-400 font-mono">
                  السابق: {lot.initialQuantity.toLocaleString()} نقطة
                </span>
              </div>
              <input
                type="number"
                min={minPointsAllowed}
                step="any"
                value={pointsCount}
                onChange={e => setPointsCount(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-mono font-bold text-sm outline-none focus:border-orange-500"
                placeholder="1000"
                required
              />
            </div>

            {/* Difference / Impact Preview */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-[11px] font-mono">
              <span className="text-zinc-500">فارق الرصيد في المحفظة:</span>
              <div className="flex items-center gap-1">
                {deltaPoints > 0 ? (
                  <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{deltaPoints.toLocaleString()} نقطة (إضافة)
                  </span>
                ) : deltaPoints < 0 ? (
                  <span className="text-rose-500 font-bold flex items-center gap-0.5">
                    <TrendingDown className="w-3.5 h-3.5" />
                    {deltaPoints.toLocaleString()} نقطة (خصم تصحيحي)
                  </span>
                ) : (
                  <span className="text-zinc-400 font-bold">لا تغيير في عدد النقاط</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                المبلغ بالدولار ($ USD):
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                السابق: ${lot.initialQuantity.toLocaleString()}
              </span>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              value={amountUSD}
              onChange={e => setAmountUSD(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-mono font-bold text-sm outline-none focus:border-emerald-500"
              placeholder="100"
              required
            />
          </div>
        )}

        {/* Cost & Exchange Rate Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isSubWallet && (
            <div>
              <label className="text-[11px] font-bold block mb-1 text-zinc-600 dark:text-zinc-300">
                💵 التكلفة بالدولار ($ USD):
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={amountUSD}
                onChange={e => setAmountUSD(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-mono text-xs outline-none focus:border-orange-500"
              />
              {deltaUSD !== 0 && wallet.parentWalletId && (
                <span className="text-[9.5px] text-blue-500 font-mono block mt-1">
                  {deltaUSD > 0 ? `🔻 سيتم خصم $${deltaUSD.toFixed(2)} إضافية من الرئيسية` : `🔺 سيتم استرداد $${Math.abs(deltaUSD).toFixed(2)} للرئيسية`}
                </span>
              )}
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold block mb-1 text-zinc-600 dark:text-zinc-300">
              💱 سعر صرف الدولار (ج/دولار):
            </label>
            <input
              type="number"
              min="1"
              step="any"
              value={rateEGP}
              onChange={e => setRateEGP(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-mono text-xs outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Live Recalculated Summary Card */}
        <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20 font-mono text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-[11px]">إجمالي التكلفة المعاد حسابها:</span>
            <div className="flex items-center gap-1.5">
              <strong className="text-zinc-900 dark:text-zinc-100">{formatCurrency(totalCostEGP)}</strong>
              <span className="text-blue-500">(${numUSD.toFixed(2)})</span>
            </div>
          </div>

          {isSubWallet && (
            <div className="flex items-center justify-between pt-1 border-t border-blue-500/15">
              <span className="text-zinc-500 text-[11px]">تكلفة النقطة الواحدة:</span>
              <strong className="text-orange-500">
                {unitCostEGP.toFixed(4)} ج.م <span className="text-[10px] text-zinc-400">(${unitCostUSD.toFixed(6)})</span>
              </strong>
            </div>
          )}
        </div>

        {/* Notes and Justification */}
        <div>
          <label className="text-[11px] font-bold block mb-1 text-zinc-600 dark:text-zinc-300">
            📝 بيان وملاحظات التعديل:
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="مثال: تصحيح خطأ في كتابة عدد النقاط، تعديل سعر الصرف، تحديث السند..."
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-800 dark:text-zinc-200 text-xs outline-none focus:border-orange-500 resize-none font-sans"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            icon={<Pencil className="w-3.5 h-3.5" />}
          >
            {isSubmitting ? 'جاري الحفظ...' : 'تأكيد وحفظ تعديلات الإيداع'}
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
};
