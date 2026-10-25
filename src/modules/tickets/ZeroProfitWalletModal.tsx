import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatCurrency } from '../../utils/formatters';
import { Landmark, ArrowRightLeft, TrendingUp, Check, AlertCircle } from 'lucide-react';
import { StoreWallet } from '../../types/topup.types';

interface ZeroProfitWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentBalance: number;
}

export const ZeroProfitWalletModal: React.FC<ZeroProfitWalletModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentBalance
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [selectedDestination, setSelectedDestination] = useState<string>('vault_main');
  const [transferAmount, setTransferAmount] = useState<number>(currentBalance);
  const [notes, setNotes] = useState<string>('تصفير وتفريغ رصيد محفظة الأرباح وتحويلها للخزنة الرئيسية');
  const [wallets, setWallets] = useState<StoreWallet[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTransferAmount(currentBalance);
      setWallets(db.getStoreWallets());
    }
  }, [isOpen, currentBalance]);

  const bankWallets = wallets.filter(
    w =>
      !w.isSystemWallet &&
      !['w_profits', 'w_cashback', 'w_referrals', 'w_trust'].includes(w.id) &&
      (w.category === 'bank' || w.id.includes('bank') || w.name.includes('بنك') || w.category === 'cash')
  );

  const getDestinationLabel = () => {
    if (selectedDestination === 'vault_main') {
      return '🏦 الخزنة الرئيسية (Main Financial Vault)';
    }
    const found = wallets.find(w => w.id === selectedDestination);
    return found ? found.name : selectedDestination;
  };

  const handleConfirmZeroing = (e: React.FormEvent) => {
    e.preventDefault();

    if (transferAmount <= 0) {
      showToast('error', 'مبلغ غير صحيح', 'يرجى إدخال مبلغ أكبر من 0 للتحويل.');
      return;
    }

    if (transferAmount > currentBalance) {
      showToast('error', 'الرصيد غير كافٍ', 'المبلغ المطلوب تحويله أكبر من رصيد محفظة الأرباح الحالي.');
      return;
    }

    if (!selectedDestination) {
      showToast('error', 'وجهة الرصيد مطلوبة', 'يرجى تحديد وجهة الرصيد قبل إتمام العملية.');
      return;
    }

    const refNumber = `PRF-TR-${Date.now().toString().slice(-6)}`;
    const opNumber = `TX-PRF-${Date.now().toString().slice(-6)}`;
    const destLabel = getDestinationLabel();

    // 1. Withdraw from profit wallet (adds withdrawal to w_profits ledger, keeping full history)
    const success = db.withdrawStoreWalletFunds(
      'w_profits',
      transferAmount,
      `تحويل وتصفير رصيد محفظة الأرباح إلى ${destLabel} (${notes})`,
      refNumber,
      { id: user?.id || 'owner', name: user?.fullName || 'المالك', role: user?.role || 'admin' },
      notes || 'تصفير يدوي لمحفظة الأرباح وتحويلها للخزنة',
      'manual_withdrawal'
    );

    if (success) {
      // 2. Deposit into destination
      if (selectedDestination === 'vault_main') {
        db.addSafeTransaction(
          'cash_in',
          transferAmount,
          'wallet_transfer',
          `تحويل أرباح من محفظة الأرباح إلى الخزنة الرئيسية (${notes || 'تصفير يدوي'})`,
          user?.fullName || 'المالك',
          refNumber,
          {
            currency: 'EGP',
            operationNumber: opNumber,
            notes: `تصفير يدوي لمحفظة الأرباح - الموظف: ${user?.fullName || 'المالك'}`
          }
        );
      } else {
        db.depositStoreWalletFunds(
          selectedDestination,
          transferAmount,
          `استلام تحويل من محفظة الأرباح (${refNumber})`,
          refNumber,
          { id: user?.id || 'owner', name: user?.fullName || 'المالك', role: user?.role || 'admin' },
          notes
        );
      }

      // 3. Log audit action
      db.logAction(
        { id: user?.id || 'owner', name: user?.fullName || 'المالك', role: user?.role || 'admin', department: 'المالية' },
        'vault_transaction',
        'تصفير وتحويل رصيد محفظة الأرباح',
        'w_profits',
        refNumber,
        `تم تصفير وتحويل ${transferAmount} ج من محفظة الأرباح إلى ${destLabel} مع بقاء كامل السجل التاريخي دون حذف.`
      );

      showToast(
        'success',
        '🎉 تم تصفير وتحويل الأرباح بنجاح',
        `تم تحويل ${formatCurrency(transferAmount)} إلى ${destLabel} وتوثيق القيد في الخزنة الرئيسية.`
      );

      onSuccess?.();
      onClose();
    } else {
      showToast('error', 'فشلت العملية', 'تعذر سحب المبلغ من محفظة الأرباح.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="💰 تصفير وتحويل محفظة الأرباح"
      subtitle="تحويل رصيد محفظة الأرباح إلى الخزنة الرئيسية أو أي وجهة مالية معتمدة مع الحفاظ الكامل على دفتر الأستاذ"
      maxWidth="md"
    >
      <form onSubmit={handleConfirmZeroing} className="space-y-4 text-right text-xs">
        {/* Current Balance Box */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block font-medium">الرصيد الحالي بمحفظة الأرباح</span>
              <strong className="text-base text-emerald-500 font-mono font-black">
                {formatCurrency(currentBalance)}
              </strong>
            </div>
          </div>

          <Badge variant="success" size="sm" className="font-bold">
            جاهز للتحويل
          </Badge>
        </div>

        {/* Destination Selection */}
        <div>
          <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 text-xs">
            اختر وجهة الرصيد *
          </label>
          <div className="relative">
            <select
              value={selectedDestination}
              onChange={e => setSelectedDestination(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-bold outline-none text-xs focus:ring-2 focus:ring-emerald-500"
            >
              <option value="vault_main">
                🏦 الخزنة الرئيسية (Main Financial Vault) — الخزنة المعتمدة
              </option>
              {bankWallets.map(w => (
                <option key={w.id} value={w.id}>
                  🏛️ {w.name} ({formatCurrency(w.balance, w.currency)})
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] text-zinc-400 block mt-1">
            سيتم إنشاء قيد إيداع فعلي في الوجهة المختارة فور التأكيد.
          </span>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">
              المبلغ المراد تحويله (جنيه) *
            </label>
            <button
              type="button"
              onClick={() => setTransferAmount(currentBalance)}
              className="text-[10px] font-bold text-emerald-500 hover:underline cursor-pointer"
            >
              تصفير كامل الرصيد ({formatCurrency(currentBalance)})
            </button>
          </div>
          <Input
            type="number"
            step="0.01"
            min={0}
            max={currentBalance}
            value={transferAmount || ''}
            onChange={e => setTransferAmount(parseFloat(e.target.value) || 0)}
            placeholder="أدخل المبلغ..."
          />
        </div>

        {/* Notes Input */}
        <div>
          <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 text-xs">
            ملاحظات العملية
          </label>
          <Input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="ملاحظات حول سبب تصفية وتحويل الأرباح..."
          />
        </div>

        {/* Audit Safety Warning Box */}
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>حماية دفتر الأستاذ والسجل التاريخي:</span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-[10.5px]">
            لن يتم حذف أي حركات قديمة من دفتر الأستاذ. التصفير يتم بتسجيل حركة تحويل مالية جديدة موثقة بمرجع ورقم عملية رسمي يظهر في قسم المالية.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={<Check className="w-4 h-4" />}
            className="bg-emerald-600 hover:bg-emerald-700 font-bold"
          >
            تأكيد التصفير والتحويل للخزنة
          </Button>
        </div>
      </form>
    </Modal>
  );
};
