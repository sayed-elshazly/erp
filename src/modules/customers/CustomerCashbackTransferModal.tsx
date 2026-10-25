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
  Gift,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  User,
  Wallet,
  Printer,
  Sparkles,
  Lock,
  Building2
} from 'lucide-react';

interface CustomerCashbackTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  dealer?: Dealer | null;
  partyType?: 'customer' | 'dealer';
  onSuccess?: (ticketNumber: string, amount: number) => void;
}

export const CustomerCashbackTransferModal: React.FC<CustomerCashbackTransferModalProps> = ({
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

  const availableCashback = useMemo(() => {
    if (isDealer) return Math.max(0, dealer?.cashbackBalance || 0);
    return Math.max(0, customer?.cashbackBalance || 0);
  }, [dealer, customer, isDealer]);

  const currentMainBalance = useMemo(() => {
    if (isDealer) return dealer?.balance || 0;
    return customer?.accountBalance || customer?.balance || 0;
  }, [dealer, customer, isDealer]);

  const [transferAmount, setTransferAmount] = useState<number | ''>(availableCashback > 0 ? availableCashback : '');
  const [transferReason, setTransferReason] = useState<string>('استبدال كاش باك وتحويله للرصيد الدائن للشحن');
  const [issuedTicket, setIssuedTicket] = useState<{
    ticketNumber: string;
    amount: number;
    newCashback: number;
    newBalance: number;
    timestamp: string;
  } | null>(null);

  const numAmount = typeof transferAmount === 'number' ? transferAmount : (parseFloat(String(transferAmount)) || 0);
  const isValidAmount = numAmount > 0 && numAmount <= availableCashback;
  const isExceeded = numAmount > availableCashback;

  const newCashbackPreview = Math.max(0, Math.round((availableCashback - numAmount) * 100) / 100);
  const newMainBalancePreview = Math.round((currentMainBalance + numAmount) * 100) / 100;

  const handleSetPercent = (pct: number) => {
    const val = Math.round((availableCashback * (pct / 100)) * 100) / 100;
    setTransferAmount(val > 0 ? val : '');
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAmount) {
      showToast('error', 'مبلغ غير صالح', 'يرجى إدخال مبلغ تحويل صحيح لا يتجاوز رصيد الكاش باك المتاح');
      return;
    }

    const ticketNumber = `CBT-${Date.now().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();

    if (isDealer && dealer) {
      // 1. Update dealer balances
      const updatedDealer = {
        ...dealer,
        cashbackBalance: newCashbackPreview,
        balance: newMainBalancePreview,
        updatedAt: timestamp
      };
      db.saveDealer(updatedDealer);

      // 2. Debit system dealer cashback wallet mw_cashback
      db.debitCashbackFromSystemWallet(numAmount, dealer.name, ticketNumber, true);

      // 3. Record Dealer Unified Wallet Transactions
      try {
        db.addDealerUnifiedWalletTransaction({
          customerId: dealer.id,
          walletType: 'cashback',
          type: 'redeemed',
          amount: numAmount,
          operationName: `تحويل كاش باك جملة للرصيد الأساسي (تذكرة #${ticketNumber})`,
          notes: transferReason || `بواسطة ${user?.fullName || 'المسؤول'}`,
          balanceAfter: newCashbackPreview,
          orderNumber: ticketNumber
        });

        db.addDealerUnifiedWalletTransaction({
          customerId: dealer.id,
          walletType: 'account_balance',
          type: 'earned',
          amount: numAmount,
          operationName: `إيداع ناتج عن تحويل كاش باك (تذكرة #${ticketNumber})`,
          notes: transferReason || `بواسطة ${user?.fullName || 'المسؤول'}`,
          balanceAfter: newMainBalancePreview,
          orderNumber: ticketNumber
        });
      } catch (_) {}

      // 4. Log Action
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المسؤول', role: user?.role || 'admin', department: 'تجار الجملة والمالية' },
        'edit',
        'كاش باك تاجر جملة',
        ticketNumber,
        `إصدار تذكرة تحويل كاش باك #${ticketNumber} للتاجر ${dealer.name}`,
        `تحويل ${numAmount} ج.م من mw_cashback إلى الرصيد الأساسي للتاجر [${dealer.name}]`
      );

      // 5. Add Note
      db.addDealerNote({
        dealerId: dealer.id,
        authorName: user?.fullName || 'إدارة النظام',
        authorRole: 'المالية',
        content: `🎫 تذكرة تحويل كاش باك #${ticketNumber}: تم استبدال وتحويل ${numAmount} ج من الكاش باك إلى الرصيد الأساسي بنجاح`,
        type: 'financial'
      });
    } else if (customer) {
      // 1. Update customer balances
      const updatedCustomer = {
        ...customer,
        cashbackBalance: newCashbackPreview,
        accountBalance: newMainBalancePreview,
        balance: newMainBalancePreview,
        updatedAt: timestamp
      };
      db.saveCustomer(updatedCustomer);

      // 2. Debit system retail cashback wallet w_cashback
      db.debitCashbackFromSystemWallet(numAmount, customer.name, ticketNumber, false);

      // 3. Record Unified Wallet Transactions
      try {
        db.addUnifiedWalletTransaction({
          customerId: customer.id,
          walletType: 'cashback',
          type: 'redeemed',
          amount: numAmount,
          operationName: `تحويل كاش باك للرصيد الأساسي (تذكرة #${ticketNumber})`,
          notes: transferReason || `بواسطة ${user?.fullName || 'المسؤول'}`,
          balanceAfter: newCashbackPreview,
          orderNumber: ticketNumber
        });

        db.addUnifiedWalletTransaction({
          customerId: customer.id,
          walletType: 'account_balance',
          type: 'earned',
          amount: numAmount,
          operationName: `إيداع ناتج عن تحويل كاش باك (تذكرة #${ticketNumber})`,
          notes: transferReason || `بواسطة ${user?.fullName || 'المسؤول'}`,
          balanceAfter: newMainBalancePreview,
          orderNumber: ticketNumber
        });
      } catch (_) {}

      // 4. Log Action
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المسؤول', role: user?.role || 'admin', department: 'العملاء والمالية' },
        'edit',
        'كاش باك عملاء',
        ticketNumber,
        `إصدار تذكرة تحويل كاش باك #${ticketNumber} للعميل ${customer.name}`,
        `تحويل ${numAmount} ج.م من w_cashback إلى الرصيد الأساسي للعميل [${customer.name}]`
      );

      // 5. Add Note
      db.addCustomerNote({
        customerId: customer.id,
        authorName: user?.fullName || 'إدارة النظام',
        authorRole: 'المالية',
        content: `🎫 تذكرة تحويل كاش باك #${ticketNumber}: تم استبدال وتحويل ${numAmount} ج من الكاش باك إلى الرصيد الأساسي بنجاح`,
        type: 'financial'
      });
    }

    setIssuedTicket({
      ticketNumber,
      amount: numAmount,
      newCashback: newCashbackPreview,
      newBalance: newMainBalancePreview,
      timestamp
    });

    showToast(
      'success',
      'تم إصدار تذكرة التحويل بنجاح',
      `تم تحويل ${formatCurrency(numAmount)} من الكاش باك إلى الرصيد الدائن بموجب التذكرة #${ticketNumber}`
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
          ? `🧾 سند تحويل كاش باك رسمي #${issuedTicket.ticketNumber}`
          : `🔁 إصدار تذكرة تحويل كاش باك رسمي — ${partyName}`
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
                  تم تنفيذ التحويل وتحديث الأرصدة بنجاح
                </h4>
                <p className="text-xs text-zinc-500">
                  تم قيد الحركة في السجلات المالية الموحدة وترحيل الخصم من محفظة النظام.
                </p>
              </div>
            </div>

            {/* Official Printable Receipt Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#18181B] border-2 border-dashed border-zinc-300 dark:border-zinc-700 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b pb-2 border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-emerald-500" />
                  <span className="font-black text-sm text-zinc-900 dark:text-white">سند تحويل واستبدال كاش باك</span>
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
                <div>
                  <span className="text-zinc-400 block text-[11px]">المبلغ المحول:</span>
                  <strong className="text-emerald-500 text-base font-black">{formatCurrency(issuedTicket.amount)}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">التاريخ والوقت:</span>
                  <span>{new Date(issuedTicket.timestamp).toLocaleString('ar-EG')}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">رصيد الكاش باك المتبقي:</span>
                  <strong className="text-zinc-700 dark:text-zinc-300">{formatCurrency(issuedTicket.newCashback)}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">الرصيد الدائن الجديد:</span>
                  <strong className="text-blue-500">{formatCurrency(issuedTicket.newBalance)}</strong>
                </div>
              </div>

              <div className="border-t pt-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                <span>المسؤول: {user?.fullName || 'إدارة النظام'}</span>
                <span>الحالة: مكتمل ومعتمد آلياً ✓</span>
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
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold">
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
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" />
                  رصيد الكاش باك المتاح:
                </span>
                <strong className="text-lg font-black font-mono text-emerald-500 block mt-1">
                  {formatCurrency(availableCashback)}
                </strong>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  محفظة النظام ({isDealer ? 'mw_cashback' : 'w_cashback'})
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
                  رصيد الحساب المتاح للطلبات
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  مبلغ الكاش باك المراد تحويله (جنيه) *
                </label>
                <div className="flex items-center gap-1">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleSetPercent(pct)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 hover:bg-emerald-500 hover:text-white dark:bg-zinc-800 dark:hover:bg-emerald-500 transition-colors cursor-pointer"
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
                  max={availableCashback}
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
                  <span>المبلغ المطلوب أكبر من رصيد الكاش باك المتاح ({formatCurrency(availableCashback)})</span>
                </div>
              )}
            </div>

            {/* Live Preview Strip */}
            {numAmount > 0 && !isExceeded && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#141417] border border-zinc-200 dark:border-[#27272A] space-y-2 text-xs">
                <span className="font-bold text-zinc-600 dark:text-zinc-400 block text-[11px]">
                  📊 المعاينة الحية للأرصدة بعد تنفيذ التذكرة:
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2 rounded-lg bg-white dark:bg-[#18181B] border border-zinc-100 dark:border-[#222228]">
                    <span className="text-[10px] text-zinc-400 block">رصيد الكاش باك الجديد:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 font-bold">{formatCurrency(newCashbackPreview)}</strong>
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
                placeholder="أدخل سبب أو ملاحظات التحويل..."
              />
            </div>

            {/* Protection Notice */}
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-[11px] flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-orange-500" />
              <span>
                <strong>أمان مالي ونظام رقابي:</strong> سيتم توليد تذكرة رسمية (CBT) وخصم المبلغ تلقائياً من محفظة كاش باك النظام وتسجيل العملية في سجل الحركات المالية الموحدة وسجل المراقبة.
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
                disabled={!isValidAmount || availableCashback <= 0}
              >
                تأكيد التحويل وإصدار التذكرة الرسمية
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
