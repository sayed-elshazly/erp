import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { JKRWallet, JKRWalletLot, JKRWalletTransaction } from '../../../types/jkrWallet.types';
import { JKRWalletEngine } from '../../../services/financial/jkrWalletEngine';
import { PricingEngine } from '../../../services/pricing/pricingEngine';
import { useNotifications } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../utils/formatters';
import {
  Trash2,
  AlertTriangle,
  RotateCcw,
  Coins,
  DollarSign,
  ShieldAlert,
  ArrowRightLeft
} from 'lucide-react';

interface JKRDeleteDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  lot: JKRWalletLot | null;
  transaction?: JKRWalletTransaction | null;
  wallet: JKRWallet | null;
  onSuccess: () => void;
}

export const JKRDeleteDepositModal: React.FC<JKRDeleteDepositModalProps> = ({
  isOpen,
  onClose,
  lot,
  transaction,
  wallet,
  onSuccess
}) => {
  const { showToast } = useNotifications();
  const { user } = useAuth();

  const [reason, setReason] = useState('إيداع نقاط بالخطأ - نقاط وهمية');
  const [restoreToParent, setRestoreToParent] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !lot || !wallet) return null;

  const isSubWallet = wallet.type === 'SUB' || lot.currencyOrPoints === 'POINTS';
  const pointsToRemove = lot.remainingQuantity;
  const alreadyConsumed = Math.max(0, lot.initialQuantity - lot.remainingQuantity);

  const ratio = lot.initialQuantity > 0 ? (lot.remainingQuantity / lot.initialQuantity) : 1;
  const usdToRestore = (lot.totalCostUSD || 0) * ratio;
  const egpToRestore = (lot.totalCostEGP || 0) * ratio;

  const handleDelete = () => {
    try {
      setIsDeleting(true);
      const res = JKRWalletEngine.deleteDepositLot({
        lotId: lot.id,
        reason: reason.trim(),
        restoreToParentWallet: restoreToParent,
        user
      });

      // Recalculate catalog prices based on updated inventory
      try {
        PricingEngine.recalculateAllCatalogProducts();
      } catch (pe) {
        console.warn('Pricing recalculation after deposit delete:', pe);
      }

      showToast('success', 'تم حذف الإيداع وإلغاؤه بنجاح', res.message);
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('error', 'فشل الحذف', err.message || 'حدث خطأ أثناء حذف وإلغاء شحنة الإيداع');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🗑️ حذف وإلغاء شحنة الإيداع: #${lot.lotNumber}`}
      maxWidth="md"
    >
      <div className="space-y-4 text-right text-xs" dir="rtl">
        {/* Warning Banner */}
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <strong className="text-rose-600 dark:text-rose-400 font-bold text-sm block">
              هل أنت متأكد من حذف وإلغاء شحنة الإيداع هذه نهائياً؟
            </strong>
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11.5px]">
              هذا الإجراء سيقوم بإلغاء الشحنة، خصم النقاط غير المستهلكة من رصيد المحفظة، واسترداد القيمة المالية المقابلة إلى المحفظة الرئيسية فورياً مع توثيق القيد بدفتر الأستاذ (Ledger Audit).
            </p>
          </div>
        </div>

        {/* Lot Details Card */}
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2.5 font-mono text-[11px]">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-[#27272A]/60">
            <span className="text-zinc-500 font-sans">رقم دفعة الشحنة:</span>
            <strong className="text-zinc-900 dark:text-zinc-100 font-black">#{lot.lotNumber}</strong>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-sans">المحفظة المستهدفة:</span>
            <strong className="text-orange-500 font-sans">{wallet.name} [{wallet.pointType || 'رصيد'}]</strong>
          </div>

          {isSubWallet ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-sans">الكمية الأولية المودعة:</span>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">{lot.initialQuantity.toLocaleString()} نقطة</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-sans">المستهلك سابقاً:</span>
                <span className={alreadyConsumed > 0 ? 'text-amber-500 font-bold' : 'text-zinc-400'}>
                  {alreadyConsumed.toLocaleString()} نقطة {alreadyConsumed > 0 ? '(عبر تذاكر شحن)' : '(لم يستهلك شيء)'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-dashed border-gray-200 dark:border-[#27272A]">
                <span className="text-rose-500 font-sans font-bold">النقاط التي سيتم حذفها وخصمها:</span>
                <strong className="text-rose-600 dark:text-rose-400 font-black text-xs">
                  -{pointsToRemove.toLocaleString()} نقطة
                </strong>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between pt-1 border-t border-dashed border-gray-200 dark:border-[#27272A]">
              <span className="text-rose-500 font-sans font-bold">الرصيد الدولاري الذي سيتم خصمه:</span>
              <strong className="text-rose-600 dark:text-rose-400 font-black text-xs">
                -${lot.remainingQuantity.toFixed(2)} USD
              </strong>
            </div>
          )}

          {/* Refund Breakdown */}
          {isSubWallet && wallet.parentWalletId && usdToRestore > 0 && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold font-sans flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                استرداد تمويل للمحفظة الرئيسية:
              </span>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-sans text-[10px]">سيتم إعادة:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                  +${usdToRestore.toFixed(2)} USD ({formatCurrency(egpToRestore)})
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Restore to Main Wallet Checkbox */}
        {isSubWallet && wallet.parentWalletId && (
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] cursor-pointer hover:border-emerald-500/40 transition-colors">
            <input
              type="checkbox"
              checked={restoreToParent}
              onChange={e => setRestoreToParent(e.target.checked)}
              className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
              استرداد القيمة المقابلة (${usdToRestore.toFixed(2)}) إلى رصيد المحفظة الرئيسية فوراً
            </span>
          </label>
        )}

        {/* Reason for Deletion */}
        <div>
          <label className="text-[11px] font-bold block mb-1 text-zinc-600 dark:text-zinc-300">
            📝 سبب الحذف والإلغاء (اختياري للتوثيق المحاسبي):
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="مثال: إيداع نقاط بالخطأ، نقاط وهمية، إلغاء توريد..."
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] px-3 py-2 text-zinc-800 dark:text-zinc-200 text-xs outline-none focus:border-rose-500 font-sans"
          />
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={isDeleting}
            onClick={handleDelete}
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            {isDeleting ? 'جاري الحذف والإلغاء...' : 'تأكيد الحذف واسترداد الأرصدة'}
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            تراجع وإلغاء
          </Button>
        </div>
      </div>
    </Modal>
  );
};
