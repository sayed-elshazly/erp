import React, { useState, useMemo } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { CustomerTicket } from '../../types/customer.types';
import { StoreWallet } from '../../types/topup.types';
import {
  RotateCcw,
  AlertTriangle,
  Wallet,
  ShieldCheck,
  DollarSign,
  Phone,
  CheckCircle2,
  AlertCircle,
  Building2
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface TicketRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: CustomerTicket;
  onUpdated: () => void;
}

export const TicketRefundModal: React.FC<TicketRefundModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onUpdated
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const wallets = useMemo(() => db.getStoreWallets(), []);

  // Strict filter: ONLY real operating payment wallets (exclude all system, cashback, profits, trust, and inventory wallets)
  const operatingWallets = useMemo(() => {
    return wallets.filter(w => {
      // 1. Exclude system wallets explicitly
      if (w.isSystemWallet) return false;
      if (['w_profits', 'w_cashback', 'w_referrals', 'w_trust'].includes(w.id)) return false;
      if (w.systemType) return false;
      if (w.type === 'profits' || w.type === 'trust') return false;

      // 2. Exclude inventory / digital goods wallets
      if (w.type === 'inventory') return false;

      // 3. Exclude frozen or non-withdrawable wallets
      if (w.isFrozen || w.allowWithdrawal === false) return false;

      // 4. Exclude wallets whose names indicate system reserves
      const name = (w.name || '').toLowerCase();
      if (
        name.includes('كاش باك') ||
        name.includes('cashback') ||
        name.includes('أمانات') ||
        name.includes('trust') ||
        name.includes('أرباح') ||
        name.includes('profits') ||
        name.includes('إحالات') ||
        name.includes('referral') ||
        name.includes('بضاعة') ||
        name.includes('inventory')
      ) {
        return false;
      }

      // 5. Must be an operating or liquid payment wallet
      return w.type === 'operating' || w.category === 'cash' || w.category === 'bank';
    });
  }, [wallets]);

  const originalTotalPaid = Number(ticket.receivedAmount || ticket.requiredAmount || 0);
  const alreadyRefunded = Number(ticket.refundDetails?.amount || 0);
  const maxRefundable = Math.max(0, Math.round((originalTotalPaid - alreadyRefunded) * 100) / 100);

  const [refundAmountInput, setRefundAmountInput] = useState<string>(String(maxRefundable));
  const refundAmount = Number(refundAmountInput) || 0;

  // Pre-select logic:
  // 1. Same operating wallet customer paid through (if found)
  // 2. First operating wallet with sufficient balance
  // 3. First operating wallet available
  const defaultWalletId = useMemo(() => {
    if (ticket.paymentWalletId) {
      const match = operatingWallets.find(w => w.id === ticket.paymentWalletId);
      if (match) return match.id;
    }
    if (ticket.paymentWallet) {
      const matchByName = operatingWallets.find(
        w => w.name.toLowerCase() === ticket.paymentWallet.toLowerCase() ||
             w.name.includes(ticket.paymentWallet)
      );
      if (matchByName) return matchByName.id;
    }
    const withSufficient = operatingWallets.find(w => w.balance >= refundAmount);
    return withSufficient?.id || operatingWallets[0]?.id || '';
  }, [operatingWallets, ticket, refundAmount]);

  const [selectedWalletId, setSelectedWalletId] = useState<string>(defaultWalletId);
  const [selectedNumberId, setSelectedNumberId] = useState<string>('');
  const [refundReason, setRefundReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedWallet = useMemo(() => {
    return operatingWallets.find(w => w.id === selectedWalletId);
  }, [operatingWallets, selectedWalletId]);

  const isBalanceSufficient = selectedWallet ? selectedWallet.balance >= refundAmount : false;

  const handleRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (maxRefundable <= 0) {
      showToast('error', 'التذكرة مستردة بالكامل', 'تم استرداد كامل قيمة هذه التذكرة مسبقاً.');
      return;
    }

    if (!selectedWalletId) {
      showToast('error', 'محفظة الاسترداد مطلوبة', 'يرجى اختيار محفظة تشغيلية لرد المبلغ');
      return;
    }
    if (refundAmount <= 0) {
      showToast('error', 'مبلغ الاسترداد غير صالح', 'يرجى إدخال مبلغ استرداد أكبر من الصفر');
      return;
    }
    if (refundAmount > maxRefundable) {
      showToast('error', 'تجاوز الحد الأقصى', `مبلغ الاسترداد لا يمكن أن يتجاوز ${formatCurrency(maxRefundable)}`);
      return;
    }
    if (!refundReason.trim()) {
      showToast('error', 'سبب الاسترداد مطلوب', 'يرجى كتابة سبب استرداد التذكرة بالتفصيل');
      return;
    }

    if (!isBalanceSufficient) {
      const proceed = window.confirm(
        `تنبيه: رصيد المحفظة المحددة (${formatCurrency(selectedWallet?.balance || 0)}) أقل من مبلغ الاسترداد (${formatCurrency(refundAmount)}). هل تريد المتابعة رغم عجز الرصيد؟`
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);
    try {
      const res = db.refundTicket(
        ticket.id,
        selectedWalletId,
        refundReason.trim(),
        user || undefined,
        selectedNumberId || undefined,
        refundAmount
      );
      if (res.success) {
        showToast('success', 'تم الاسترداد المالي بنجاح', res.message);
        onUpdated();
        onClose();
      } else {
        showToast('error', 'فشل الاسترداد المالي', res.message);
      }
    } catch (err: any) {
      showToast('error', 'خطأ في العملية', err?.message || 'حدث خطأ أثناء تنفيذ الاسترداد');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`💸 استرداد مالي للتذكرة #${ticket.ticketNumber} (Refund Ticket)`}
      subtitle={`العميل: ${ticket.customerName} (${ticket.customerPhone})`}
      maxWidth="lg"
    >
      <form onSubmit={handleRefund} className="space-y-4 text-right text-xs">
        {/* Warning Banner & Financial Breakdown */}
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 space-y-2 font-bold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-black">تحذير مالي: فحص رصيد الاسترداد وقواعد العكس المحاسبي</span>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-rose-950/20 p-2.5 rounded-xl border border-rose-500/20 text-center font-mono">
            <div className="p-1.5 rounded-lg bg-zinc-900/40">
              <span className="text-[10px] text-zinc-400 block font-sans">المدفوع أصلاً</span>
              <strong className="text-zinc-200 text-xs">{formatCurrency(originalTotalPaid)}</strong>
            </div>
            <div className="p-1.5 rounded-lg bg-zinc-900/40">
              <span className="text-[10px] text-amber-400 block font-sans">المسترد سابقاً</span>
              <strong className="text-amber-300 text-xs">{formatCurrency(alreadyRefunded)}</strong>
            </div>
            <div className="p-1.5 rounded-lg bg-zinc-900/40">
              <span className="text-[10px] text-emerald-400 block font-sans">الحد الأقصى المتاح</span>
              <strong className="text-emerald-300 text-xs">{formatCurrency(maxRefundable)}</strong>
            </div>
          </div>

          <ul className="text-[11px] list-disc list-inside text-rose-400 space-y-0.5 font-normal">
            <li>سيتم خصم مبلغ الاسترداد ({formatCurrency(refundAmount)}) من محفظة التشغيل المحددة أدناه حصراً.</li>
            <li>محافظ الكاش باك والأرباح والأمانات ومحافظ البضاعة مستثناة كلياً لمنع الاختلال المحاسبي.</li>
            {ticket.cashbackEarned > 0 && (
              <li>سيتم تلقائياً عكس الكاش باك المكتسب بنسبة المبلغ المسترد من رصيد العميل.</li>
            )}
            <li>توثيق العملية في سجل التدقيق المالي والـ Ledger بدون تكرار للبيانات.</li>
          </ul>
        </div>

        {maxRefundable <= 0 && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>هذه التذكرة مستردة بالكامل مسبقاً ولا يوجد رصيد متبقٍ للاسترداد.</span>
          </div>
        )}

        {/* Refund Amount Input & Quick Presets */}
        <div>
          <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>قيمة المبلغ المراد استرداده (ج.م) *</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-normal">
              (متاح كلي أو جزئي حتى {formatCurrency(maxRefundable)})
            </span>
          </label>

          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={maxRefundable}
              value={refundAmountInput}
              onChange={e => setRefundAmountInput(e.target.value)}
              disabled={maxRefundable <= 0}
              className="flex-1 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-bold outline-none focus:border-rose-500 font-mono text-sm"
              placeholder={`الحد الأقصى ${maxRefundable}`}
            />
            <button
              type="button"
              onClick={() => setRefundAmountInput(String(maxRefundable))}
              disabled={maxRefundable <= 0}
              className="px-3 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition-colors shrink-0"
            >
              كامل المتبقي
            </button>
            {maxRefundable > 1 && (
              <button
                type="button"
                onClick={() => setRefundAmountInput(String(Math.round((maxRefundable / 2) * 100) / 100))}
                disabled={maxRefundable <= 0}
                className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-bold text-xs transition-colors shrink-0"
              >
                النصف (50%)
              </button>
            )}
          </div>
        </div>

        {/* Operating Wallet Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-orange-500" />
              <span>محفظة التشغيل التي سيتم رد المبلغ منها *</span>
            </label>
            <span className="text-[10px] text-zinc-400">
              (محافظ الدفع والتشغيل الفعلية فقط)
            </span>
          </div>

          {operatingWallets.length === 0 ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>لا توجد محافظ تشغيلية نقدية متاحة حالياً لرد المبلغ!</span>
            </div>
          ) : (
            <div className="space-y-2">
              <select
                value={selectedWalletId}
                onChange={e => {
                  setSelectedWalletId(e.target.value);
                  setSelectedNumberId('');
                }}
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-bold outline-none focus:border-orange-500 transition-colors"
              >
                {operatingWallets.map(w => {
                  const hasEnough = w.balance >= refundAmount;
                  return (
                    <option key={w.id} value={w.id}>
                      {w.name} — الرصيد: {formatCurrency(w.balance)} {hasEnough ? '✅ كافٍ' : '⚠️ عجز'}
                    </option>
                  );
                })}
              </select>

              {/* Selected Wallet Details & Balance Check */}
              {selectedWallet && (
                <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
                  isBalanceSufficient
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                }`}>
                  <div className="flex items-center gap-2 font-sans font-bold">
                    {isBalanceSufficient ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span>
                      رصيد {selectedWallet.name}: {formatCurrency(selectedWallet.balance)}
                    </span>
                  </div>
                  <span className="font-bold">
                    {isBalanceSufficient
                      ? `المتبقي بعد الرد: ${formatCurrency(selectedWallet.balance - refundAmount)}`
                      : `عجز بالمحفظة: ${formatCurrency(refundAmount - selectedWallet.balance)}`}
                  </span>
                </div>
              )}

              {/* Number / Line selector if wallet has lines */}
              {selectedWallet?.numbers && selectedWallet.numbers.length > 0 && (
                <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 text-xs">
                      <Phone className="w-3.5 h-3.5 text-orange-500" />
                      <span>رقم / خط الإرسال الذي سيتم التحويل منه *</span>
                    </label>
                    <span className="text-[10px] text-zinc-400">
                      (يؤثر مباشرة على ليميت الإرسال اليومي والشهري للخط)
                    </span>
                  </div>

                  <select
                    value={selectedNumberId || selectedWallet.numbers[0]?.id || ''}
                    onChange={e => setSelectedNumberId(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold outline-none focus:border-orange-500 text-xs"
                  >
                    {selectedWallet.numbers.map(num => {
                      const dailySendLimit = num.dailySendLimit || 30000;
                      const dailySent = num.dailySent || 0;
                      const remSend = Math.max(0, dailySendLimit - dailySent);
                      return (
                        <option key={num.id} value={num.id}>
                          {num.phoneNumber} ({num.accountHolderName}) — متبقي إرسال اليوم: {formatCurrency(remSend, selectedWallet.currency)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            سبب الاسترداد المالي *
          </label>
          <textarea
            rows={3}
            placeholder="اكتب سبب استرداد التذكرة (مثال: تعذر الشحن من السيرفر، رغبة العميل في الإلغاء، خطأ في رقم الحساب...)"
            value={refundReason}
            onChange={e => setRefundReason(e.target.value)}
            className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 text-xs outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <div className="text-[11px] text-zinc-400 font-mono">
            المبلغ المطلوب استرداده: <strong className="text-zinc-100">{formatCurrency(refundAmount)}</strong>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || operatingWallets.length === 0 || maxRefundable <= 0}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              icon={<RotateCcw className="w-4 h-4" />}
            >
              {isSubmitting ? 'جاري الاسترداد...' : maxRefundable <= 0 ? 'مستردة بالكامل' : 'تأكيد الاسترداد المالي'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
