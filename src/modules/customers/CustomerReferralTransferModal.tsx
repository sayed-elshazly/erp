import React, { useState, useMemo } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Customer } from '../../types/customer.types';
import { Dealer } from '../../types/dealer.types';
import { formatCurrency } from '../../utils/formatters';
import {
  Share2,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  User,
  Wallet,
  Printer,
  Lock,
  Building2
} from 'lucide-react';

interface CustomerReferralTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  dealer?: Dealer | null;
  partyType?: 'customer' | 'dealer';
  onSuccess?: (ticketNumber: string, amount: number) => void;
}

export const CustomerReferralTransferModal: React.FC<CustomerReferralTransferModalProps> = ({
  isOpen,
  onClose,
  customer,
  dealer,
  partyType = 'customer',
  onSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const isDealer = partyType === 'dealer';
  const partyName = isDealer ? (dealer?.name || 'تاجر') : (customer?.name || 'عميل');
  const partyPhone = isDealer ? (dealer?.phone || '') : (customer?.phone || '');
  const partyCode = isDealer ? (dealer?.code || '') : (customer?.code || '');
  const referralCode = isDealer ? (dealer?.referralCode || '') : (customer?.referralCode || '');

  const availableReferral = useMemo(() => {
    if (isDealer) return Math.max(0, dealer?.referralWalletBalance || 0);
    return Math.max(0, customer?.referralWalletBalance || 0);
  }, [dealer, customer, isDealer]);

  const currentMainBalance = useMemo(() => {
    if (isDealer) return dealer?.balance || 0;
    return customer?.accountBalance || customer?.balance || 0;
  }, [dealer, customer, isDealer]);

  const [transferAmount, setTransferAmount] = useState<number | ''>(availableReferral > 0 ? availableReferral : '');
  const [transferReason, setTransferReason] = useState<string>('استبدال عمولات إحالة وتحويلها للرصيد الدائن للشحن');
  const [issuedTicket, setIssuedTicket] = useState<{
    ticketNumber: string;
    amount: number;
    newReferral: number;
    newBalance: number;
    timestamp: string;
  } | null>(null);

  const numAmount = typeof transferAmount === 'number' ? transferAmount : (parseFloat(String(transferAmount)) || 0);
  const isValidAmount = numAmount > 0 && numAmount <= availableReferral;
  const isExceeded = numAmount > availableReferral;

  const newReferralPreview = Math.max(0, Math.round((availableReferral - numAmount) * 100) / 100);
  const newMainBalancePreview = Math.round((currentMainBalance + numAmount) * 100) / 100;

  const handleSetPercent = (pct: number) => {
    const val = Math.round((availableReferral * (pct / 100)) * 100) / 100;
    setTransferAmount(val > 0 ? val : '');
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAmount) {
      showToast('error', 'مبلغ غير صالح', 'يرجى إدخال مبلغ تحويل صحيح لا يتجاوز رصيد عمولات الإحالة المتاح');
      return;
    }

    const ticketNumber = `RFT-${Date.now().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();

    if (isDealer && dealer) {
      // 1. Debit system dealer referral wallet mw_referrals
      db.debitReferralFromSystemWallet(numAmount, dealer.name, ticketNumber, true);

      // 2. Record Dealer Unified Wallet Transactions (reconciles referral balance in ledger)
      try {
        db.addDealerUnifiedWalletTransaction({
          customerId: dealer.id,
          walletType: 'referral',
          type: 'redeemed',
          amount: numAmount,
          operationName: `تحويل عمولة إحالة جملة للرصيد الأساسي (تذكرة #${ticketNumber})`,
          notes: transferReason || `بواسطة ${user?.fullName || 'المسؤول'}`,
          balanceAfter: newReferralPreview,
          orderNumber: ticketNumber
        });

        db.addDealerUnifiedWalletTransaction({
          customerId: dealer.id,
          walletType: 'account_balance',
          type: 'earned',
          amount: numAmount,
          operationName: `إيداع ناتج عن تحويل رصيد إحالة (تذكرة #${ticketNumber})`,
          notes: transferReason || `بواسطة ${user?.fullName || 'المسؤول'}`,
          balanceAfter: newMainBalancePreview,
          orderNumber: ticketNumber
        });
      } catch (_) {}

      // 3. Save dealer profile with latest timestamp
      const freshDealer = db.getDealerById(dealer.id) || dealer;
      db.saveDealer({
        ...freshDealer,
        referralWalletBalance: newReferralPreview,
        balance: newMainBalancePreview,
        updatedAt: timestamp
      });

      // 4. Log Action
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المسؤول', role: user?.role || 'admin', department: 'تجار الجملة والمالية' },
        'edit',
        'إحالة تاجر جملة',
        ticketNumber,
        `إصدار تذكرة تحويل رصيد إحالة #${ticketNumber} للتاجر ${dealer.name}`,
        `تحويل ${numAmount} ج.م من mw_referrals إلى الرصيد الأساسي للتاجر [${dealer.name}]`
      );

      // 5. Add Note
      db.addDealerNote({
        dealerId: dealer.id,
        authorName: user?.fullName || 'إدارة النظام',
        authorRole: 'المالية',
        content: `🎫 تذكرة تحويل رصيد إحالة #${ticketNumber}: تم استبدال وتحويل ${numAmount} ج من عمولات الإحالة إلى الرصيد الأساسي بنجاح`,
        type: 'financial'
      });
    } else if (customer) {
      // 1. Debit system retail referral wallet w_referrals
      db.debitReferralFromSystemWallet(numAmount, customer.name, ticketNumber, false);

      // 2. Record Unified Wallet Transactions (reconciles referral balance in ledger)
      try {
        db.addUnifiedWalletTransaction({
          customerId: customer.id,
          walletType: 'referral',
          type: 'redeemed',
          amount: numAmount,
          operationName: `تحويل عمولة إحالة للرصيد الأساسي (تذكرة #${ticketNumber})`,
          notes: transferReason || `بواسطة ${user?.fullName || 'المسؤول'}`,
          balanceAfter: newReferralPreview,
          orderNumber: ticketNumber
        });

        db.addUnifiedWalletTransaction({
          customerId: customer.id,
          walletType: 'account_balance',
          type: 'earned',
          amount: numAmount,
          operationName: `إيداع ناتج عن تحويل رصيد إحالة (تذكرة #${ticketNumber})`,
          notes: transferReason || `بواسطة ${user?.fullName || 'المسؤول'}`,
          balanceAfter: newMainBalancePreview,
          orderNumber: ticketNumber
        });
      } catch (_) {}

      // 3. Save customer profile with latest timestamp
      const freshCust = db.getCustomerById(customer.id) || customer;
      db.saveCustomer({
        ...freshCust,
        referralWalletBalance: newReferralPreview,
        accountBalance: newMainBalancePreview,
        balance: newMainBalancePreview,
        updatedAt: timestamp
      });

      // 4. Log Action
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المسؤول', role: user?.role || 'admin', department: 'العملاء والمالية' },
        'edit',
        'إحالة عملاء',
        ticketNumber,
        `إصدار تذكرة تحويل رصيد إحالة #${ticketNumber} للعميل ${customer.name}`,
        `تحويل ${numAmount} ج.م من w_referrals إلى الرصيد الأساسي للعميل [${customer.name}]`
      );

      // 5. Add Note
      db.addCustomerNote({
        customerId: customer.id,
        authorName: user?.fullName || 'إدارة النظام',
        authorRole: 'المالية',
        content: `🎫 تذكرة تحويل رصيد إحالة #${ticketNumber}: تم استبدال وتحويل ${numAmount} ج من رصيد الإحالة إلى الرصيد الأساسي بنجاح`,
        type: 'financial'
      });
    }

    setIssuedTicket({
      ticketNumber,
      amount: numAmount,
      newReferral: newReferralPreview,
      newBalance: newMainBalancePreview,
      timestamp
    });

    showToast(
      'success',
      'تم إصدار سند التحويل بنجاح',
      `تم تحويل ${formatCurrency(numAmount)} من رصيد الإحالة إلى الرصيد الدائن بموجب السند #${ticketNumber}`
    );

    if (onSuccess) {
      onSuccess(ticketNumber, numAmount);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        issuedTicket
          ? `🧾 سند تحويل رصيد إحالة رسمي #${issuedTicket.ticketNumber}`
          : `🔁 إصدار سند تحويل رصيد إحالة رسمي — ${partyName}`
      }
      maxWidth="md"
    >
      <div className="space-y-4 text-right" dir="rtl">
        {/* SUCCESS RECEIPT VIEW */}
        {issuedTicket ? (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  تم تنفيذ تحويل رصيد الإحالة وتحديث الأرصدة بنجاح
                </h4>
                <p className="text-xs text-zinc-500">
                  تم قيد الحركة في السجلات المالية الموحدة وترحيل الخصم من محفظة إحالات النظام.
                </p>
              </div>
            </div>

            {/* Official Printable Receipt Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#18181B] border-2 border-dashed border-zinc-300 dark:border-zinc-700 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b pb-2 border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-purple-500" />
                  <span className="font-black text-sm text-zinc-900 dark:text-white">سند تحويل واستبدال رصيد إحالة</span>
                </div>
                <Badge variant="default" size="sm" className="font-bold">
                  {issuedTicket.ticketNumber}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-300">
                <div>
                  <span className="text-zinc-400 block text-[11px]">المستفيد:</span>
                  <strong className="text-zinc-900 dark:text-white">{partyName}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">رقم الهاتف:</span>
                  <strong className="text-zinc-900 dark:text-white">{partyPhone}</strong>
                </div>
                {referralCode && (
                  <div>
                    <span className="text-zinc-400 block text-[11px]">كود الإحالة:</span>
                    <strong className="text-purple-400">{referralCode}</strong>
                  </div>
                )}
                <div>
                  <span className="text-zinc-400 block text-[11px]">المبلغ المحول:</span>
                  <strong className="text-emerald-500 text-base font-black">{formatCurrency(issuedTicket.amount)}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">التاريخ والوقت:</span>
                  <span>{new Date(issuedTicket.timestamp).toLocaleString('ar-EG')}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">رصيد الإحالة المتبقي:</span>
                  <strong className="text-zinc-700 dark:text-zinc-300">{formatCurrency(issuedTicket.newReferral)}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">الرصيد الدائن الجديد:</span>
                  <strong className="text-blue-500">{formatCurrency(issuedTicket.newBalance)}</strong>
                </div>
              </div>

              <div className="border-t pt-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                <span>المسؤول: {user?.fullName || 'إدارة النظام'}</span>
                <span>الحالة: معتمد رسمياً ومقيد دفترياً ✓</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" icon={<Printer className="w-4 h-4" />} onClick={handlePrintReceipt}>
                طباعة السند
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </div>
        ) : (
          /* TRANSFER FORM VIEW */
          <form onSubmit={handleConfirmTransfer} className="space-y-4">
            {/* Beneficiary Header */}
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center font-bold">
                  {isDealer ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-white">{partyName}</h4>
                  <span className="text-[11px] text-zinc-400 font-mono">{partyPhone} {partyCode ? `• ${partyCode}` : ''}</span>
                </div>
              </div>
              <Badge variant="default" size="sm">
                {isDealer ? 'تاجر جملة' : 'عميل قطاعي'}
              </Badge>
            </div>

            {/* Balances Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5" />
                  رصيد الإحالة المتاح:
                </span>
                <strong className="text-lg font-black font-mono text-purple-400 block mt-1">
                  {formatCurrency(availableReferral)}
                </strong>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  محفظة النظام ({isDealer ? 'mw_referrals' : 'w_referrals'})
                </span>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5" />
                  الرصيد الدائن الحالي:
                </span>
                <strong className="text-lg font-black font-mono text-blue-500 block mt-1">
                  {formatCurrency(currentMainBalance)}
                </strong>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  رصيد الحساب المتاح للشحن
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  مبلغ عمولة الإحالة المراد تحويله (جنيه) *
                </label>
                <div className="flex items-center gap-1">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleSetPercent(pct)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 hover:bg-purple-600 hover:text-white dark:bg-zinc-800 dark:hover:bg-purple-600 transition-colors cursor-pointer"
                    >
                      {pct === 100 ? 'الكل 100%' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={availableReferral}
                  value={transferAmount}
                  onChange={e => {
                    const val = e.target.value;
                    setTransferAmount(val === '' ? '' : parseFloat(val) || 0);
                  }}
                  placeholder="0.00"
                  className="font-mono font-bold text-sm"
                  autoFocus
                />
              </div>

              {isExceeded && (
                <div className="flex items-center gap-1 text-rose-500 text-xs font-bold pt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>المبلغ المطلوب أكبر من رصيد عمولات الإحالة المتاح ({formatCurrency(availableReferral)})</span>
                </div>
              )}
            </div>

            {/* Live Preview Strip */}
            {numAmount > 0 && !isExceeded && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#141417] border border-zinc-200 dark:border-[#27272A] space-y-2 text-xs">
                <span className="font-bold text-zinc-600 dark:text-zinc-400 block text-[11px]">
                  📊 المعاينة الحية للأرصدة بعد تنفيذ السند:
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2 rounded-lg bg-white dark:bg-[#18181B] border border-zinc-100 dark:border-[#222228]">
                    <span className="text-[10px] text-zinc-400 block">رصيد الإحالة الجديد:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 font-bold">{formatCurrency(newReferralPreview)}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#18181B] border border-zinc-100 dark:border-[#222228]">
                    <span className="text-[10px] text-zinc-400 block">الرصيد الدائن الجديد:</span>
                    <strong className="text-emerald-500 font-bold">{formatCurrency(newMainBalancePreview)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Reason / Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                ملاحظات / سبب التحويل (اختياري):
              </label>
              <Input
                value={transferReason}
                onChange={e => setTransferReason(e.target.value)}
                placeholder="أدخل سبب أو تفاصيل التحويل..."
              />
            </div>

            {/* Protection Notice */}
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-purple-500" />
              <span>
                <strong>إدارة مالية موحدة:</strong> سيتم توليد سند تحويل رسمي (RFT) وخصم المبلغ تلقائياً من محفظة إحالة النظام ({isDealer ? 'mw_referrals' : 'w_referrals'}) وقيد العملية في سجل الحركات الموحدة.
              </span>
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={<ArrowRightLeft className="w-4 h-4" />}
                disabled={!isValidAmount || availableReferral <= 0}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                تأكيد التحويل وإصدار السند الرسمي
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
