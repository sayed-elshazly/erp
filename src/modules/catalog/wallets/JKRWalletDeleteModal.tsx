import React, { useState, useMemo } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { JKRWallet } from '../../../types/jkrWallet.types';
import { JKRWalletEngine } from '../../../services/financial/jkrWalletEngine';
import { useNotifications } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { AlertTriangle, Trash2, CheckCircle2, ShieldAlert, Package, Layers, FileText, DollarSign, Coins } from 'lucide-react';

interface JKRWalletDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: JKRWallet | null;
  onDeleted: () => void;
}

export const JKRWalletDeleteModal: React.FC<JKRWalletDeleteModalProps> = ({
  isOpen,
  onClose,
  wallet,
  onDeleted
}) => {
  const { showToast } = useNotifications();
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Compute live deletion summary
  const summary = useMemo(() => {
    if (!wallet) return null;
    return JKRWalletEngine.getWalletDeletionSummary(wallet.id);
  }, [wallet, isOpen]);

  if (!wallet || !summary) return null;

  const handleDelete = () => {
    try {
      setIsDeleting(true);
      const result = JKRWalletEngine.deleteWallet(wallet.id, user, reason);
      if (result.success) {
        showToast('success', 'تم حذف المحفظة بنجاح', `تم حذف المحفظة [${wallet.name}] وكافة بياناتها المرتبطة بنجاح.`);
        onDeleted();
        onClose();
      }
    } catch (err: any) {
      showToast('error', 'فشل حذف المحفظة', err.message || 'تعذر إتمام عملية حذف المحفظة');
    } finally {
      setIsDeleting(false);
    }
  };

  const isMain = wallet.type === 'MAIN';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🗑 تأكيد حذف المحفظة نهائياً"
      maxWidth="md"
    >
      <div className="space-y-4 text-right text-xs">
        {/* Warning Banner */}
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 space-y-2">
          <div className="flex items-center gap-2 font-black text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
            <span>تحذير: سيتم حذف هذه المحفظة نهائياً!</span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">
            سيتم حذف هذه المحفظة وجميع البيانات المرتبطة بها (شحنات الـ Lots، سجلات الـ Ledger، الاستهلاكات، والتسويات) بصورة نهائية ولا يمكن التراجع عن هذه العملية.
          </p>
        </div>

        {/* Deletion Summary Details */}
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#222228] space-y-3">
          <h4 className="font-black text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 border-b border-gray-200 dark:border-[#222228] pb-2">
            <Layers className="w-4 h-4 text-orange-500" />
            ملخص البيانات المرتبطة التي سيتم حذفها:
          </h4>

          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded-xl bg-white dark:bg-[#1A1A1E] border border-gray-100 dark:border-[#26262B]">
              <span className="text-zinc-400 block text-[10px]">اسم المحفظة:</span>
              <strong className="text-zinc-900 dark:text-zinc-100">{wallet.name}</strong>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-[#1A1A1E] border border-gray-100 dark:border-[#26262B]">
              <span className="text-zinc-400 block text-[10px]">نوع المحفظة:</span>
              <strong className={isMain ? 'text-blue-500' : 'text-orange-500'}>
                {isMain ? 'رئيسية (MAIN USD/EGP)' : `فرعية (SUB - ${wallet.pointType || 'نقاط'})`}
              </strong>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-[#1A1A1E] border border-gray-100 dark:border-[#26262B]">
              <span className="text-zinc-400 block text-[10px]">الرصيد الحالي:</span>
              <strong className="text-rose-500 font-black">
                {isMain
                  ? `$${(wallet.balanceUSD || 0).toLocaleString()} USD | ${(wallet.balanceEGP || 0).toLocaleString()} ج.م`
                  : `${(wallet.pointsBalance || 0).toLocaleString()} نقطة`}
              </strong>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-[#1A1A1E] border border-gray-100 dark:border-[#26262B]">
              <span className="text-zinc-400 block text-[10px]">شحنات الـ Lots المخزنية:</span>
              <strong className="text-zinc-900 dark:text-zinc-100">{summary.lotsCount} شحنة</strong>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-[#1A1A1E] border border-gray-100 dark:border-[#26262B]">
              <span className="text-zinc-400 block text-[10px]">حركات الـ Ledger / Transactions:</span>
              <strong className="text-zinc-900 dark:text-zinc-100">{summary.transactionsCount} حركة</strong>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-[#1A1A1E] border border-gray-100 dark:border-[#26262B]">
              <span className="text-zinc-400 block text-[10px]">المنتجات المرتبطة بالمحفظة:</span>
              <strong className={summary.linkedProducts.length > 0 ? 'text-amber-500' : 'text-zinc-400'}>
                {summary.linkedProducts.length} منتج
              </strong>
            </div>
          </div>

          {/* Linked products list if any */}
          {summary.linkedProducts.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 space-y-1 text-[11px]">
              <span className="font-bold block">المنتجات التي سيتم إزالة ربطها بهذه المحفظة:</span>
              <div className="max-h-24 overflow-y-auto space-y-0.5 pr-1">
                {summary.linkedProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <Package className="w-3 h-3 shrink-0" />
                    <span>{p.gameTitle}: {p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reason for deletion (optional) */}
        <div>
          <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            سبب الحذف (اختياري - سيتم تدوينه في سجل العمليات):
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="مثال: تم إيقاف الحساب / دمج المحافظ / تصفية نهائية..."
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#26262B] bg-white dark:bg-[#141417] text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-rose-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            إلغاء
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleting}
            icon={<Trash2 className="w-4 h-4" />}
            className="font-bold bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isDeleting ? 'جاري الحذف...' : '✔ نعم، أنا متأكد من حذف المحفظة'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
