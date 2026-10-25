// =============================================================
// NZM JKR TOP UP ERP — Expired Balance Management Modal
// =============================================================
// Allows Owner/Admin to manage expired cashback/referral balances:
// 1. Extend validity (+6 months for cashback, +12 months for referral)
// 2. Transfer to Main Goods/Inventory Wallet as Breakage Revenue

import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  PartyExpiredBalanceSummary,
  WalletBalanceLot
} from '../../types/customer.types';
import {
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  CalendarCheck,
  Coins,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface ExpiredBalanceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: PartyExpiredBalanceSummary | null;
  targetWallet?: 'cashback' | 'referral';
  onSuccess?: () => void;
}

export const ExpiredBalanceManagementModal: React.FC<ExpiredBalanceManagementModalProps> = ({
  isOpen,
  onClose,
  summary,
  targetWallet = 'cashback',
  onSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Selected Wallet Type tab if summary has both
  const [selectedWallet, setSelectedWallet] = useState<'cashback' | 'referral'>(targetWallet);
  const [actionType, setActionType] = useState<'extend' | 'breakage'>('extend');
  const [extensionMonths, setExtensionMonths] = useState<number>(selectedWallet === 'cashback' ? 6 : 12);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!summary) return null;

  const isOwner = user?.role === 'admin';

  // Determine current wallet metrics
  const isCb = selectedWallet === 'cashback';
  const currentTotal = isCb ? summary.cashbackTotal : summary.referralTotal;
  const currentExpired = isCb ? summary.cashbackExpired : summary.referralExpired;
  const currentValid = isCb ? summary.cashbackValid : summary.referralValid;

  const relevantLots = summary.expiredLots.filter(l => l.walletType === selectedWallet);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      showToast('error', 'صلاحية غير كافية', 'إدارة الأرصدة المنتهية حصرية للمدير المالك فقط');
      return;
    }

    if (currentExpired <= 0) {
      showToast('error', 'لا يوجد رصيد منتهي', 'لا يوجد رصيد منتهي الصلاحية لتنفيذ هذا الإجراء');
      return;
    }

    setIsProcessing(true);
    try {
      if (actionType === 'extend') {
        const res = db.extendPartyExpiredBalance({
          partyId: summary.partyId,
          partyType: summary.partyType,
          walletType: selectedWallet,
          amount: currentExpired,
          extensionMonths: extensionMonths || (isCb ? 6 : 12),
          user,
          notes: notes.trim() || undefined
        });

        if (res.success) {
          showToast('success', 'تم تمديد الصلاحية', res.message);
          onSuccess?.();
          onClose();
        } else {
          showToast('error', 'فشلت العملية', res.message);
        }
      } else {
        const res = db.transferExpiredBalanceToBreakage({
          partyId: summary.partyId,
          partyType: summary.partyType,
          walletType: selectedWallet,
          amount: currentExpired,
          user,
          notes: notes.trim() || undefined
        });

        if (res.success) {
          showToast('success', 'تم التحويل كإيراد Breakage', res.message);
          onSuccess?.();
          onClose();
        } else {
          showToast('error', 'فشلت العملية', res.message);
        }
      }
    } catch (err: any) {
      showToast('error', 'خطأ في التنفيذ', err?.message || 'حدث خطأ أثناء معالجة الطلب');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إدارة الرصيد منتهي الصلاحية ⚠️"
      subtitle={`الطرف: ${summary.partyName} (${summary.partyType === 'customer' ? 'عميل شحن' : 'تاجر جملة'}) — هاتف: ${summary.partyPhone}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right text-xs" dir="rtl">
        {/* Wallet Selection Switch (if both have expired amounts) */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-gray-100 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
          <button
            type="button"
            onClick={() => {
              setSelectedWallet('cashback');
              setExtensionMonths(6);
            }}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedWallet === 'cashback'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <span>🎁 كاش باك</span>
            {summary.cashbackExpired > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {formatCurrency(summary.cashbackExpired)} ⚠️
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedWallet('referral');
              setExtensionMonths(12);
            }}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedWallet === 'referral'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <span>🤝 عمولات الإحالة</span>
            {summary.referralExpired > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {formatCurrency(summary.referralExpired)} ⚠️
              </span>
            )}
          </button>
        </div>

        {/* 3 Metric Cards Breakdown */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
            <span className="text-[10px] text-zinc-400 block font-bold mb-1">الرصيد الكلي بالمحفظة</span>
            <strong className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100">
              {formatCurrency(currentTotal)}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-500 block font-bold mb-1">الرصيد الصالح (ساري)</span>
            <strong className="text-sm font-black font-mono text-emerald-500">
              {formatCurrency(currentValid)}
            </strong>
            <span className="text-[9px] text-zinc-400 block mt-0.5">محمي ومتاح للاستخدام</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 animate-pulse">
            <span className="text-[10px] text-rose-500 block font-bold mb-1">الرصيد منتهي الصلاحية ⚠️</span>
            <strong className="text-sm font-black font-mono text-rose-500">
              {formatCurrency(currentExpired)}
            </strong>
            <span className="text-[9px] text-rose-400 block mt-0.5">مستحق للإدارة اليدوية</span>
          </div>
        </div>

        {/* Lots Breakdown Table */}
        <div className="rounded-xl border border-gray-200 dark:border-[#27272A] overflow-hidden">
          <div className="p-2.5 bg-gray-50 dark:bg-[#141417] border-b border-gray-200 dark:border-[#27272A] flex items-center justify-between font-bold text-xs text-zinc-700 dark:text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>تفاصيل الدفعات منتهية الصلاحية ({relevantLots.length})</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              قاعدة: {isCb ? '6 شهور للكاش باك' : '12 شهر للإحالة'}
            </span>
          </div>

          {relevantLots.length === 0 ? (
            <div className="p-4 text-center text-zinc-400">
              لا توجد دفعات منتهية في هذه المحفظة حالياً.
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-[#27272A]">
              {relevantLots.map(lot => (
                <div key={lot.id} className="p-2.5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-all">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                        +{formatCurrency(lot.remainingAmount)}
                      </span>
                      <Badge variant="danger" size="sm">
                        منتهي منذ {lot.daysOverdue} يوم
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5 font-mono">
                      <span>تاريخ الإضافة: {formatDate(lot.createdAt)}</span>
                      <span>•</span>
                      <span>تاريخ الانتهاء: {formatDate(lot.expiresAt)}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-amber-500 font-mono">
                    {lot.originalAmount !== lot.remainingAmount ? `(متبقي من ${formatCurrency(lot.originalAmount)})` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Radio Selection */}
        <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-3">
          <label className="font-bold text-zinc-900 dark:text-zinc-100 block text-xs">
            اختر الإجراء المطلوب من المالك *
          </label>

          <div className="space-y-2">
            {/* Option 1: Extend */}
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                actionType === 'extend'
                  ? 'border-emerald-500 bg-emerald-500/10 text-zinc-900 dark:text-zinc-100'
                  : 'border-gray-200 dark:border-[#27272A] opacity-75 hover:opacity-100'
              }`}
            >
              <input
                type="radio"
                name="actionType"
                value="extend"
                checked={actionType === 'extend'}
                onChange={() => setActionType('extend')}
                className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CalendarCheck className="w-4 h-4 text-emerald-500" />
                  <span>تمديد فترة الصلاحية (يبقى الرصيد أمانة للعميل)</span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  يتم تجديد الصلاحية وتختفي شارة التنبيه ⚠️ فوراً، مع إبقاء الرصيد متاحاً للشراء في المحفظة.
                </p>
                {actionType === 'extend' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300">المدة الإضافية:</span>
                    {[3, 6, 12].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setExtensionMonths(m)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                          extensionMonths === m
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-400'
                        }`}
                      >
                        +{m} أشهر
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            {/* Option 2: Transfer to Breakage */}
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                actionType === 'breakage'
                  ? 'border-purple-500 bg-purple-500/10 text-zinc-900 dark:text-zinc-100'
                  : 'border-gray-200 dark:border-[#27272A] opacity-75 hover:opacity-100'
              }`}
            >
              <input
                type="radio"
                name="actionType"
                value="breakage"
                checked={actionType === 'breakage'}
                onChange={() => setActionType('breakage')}
                className="mt-0.5 text-purple-500 focus:ring-purple-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-400">
                  <ArrowRightLeft className="w-4 h-4 text-purple-500" />
                  <span>تحويل لمحفظة البضاعة الرئيسية كإيراد Breakage</span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  يتم خصم {formatCurrency(currentExpired)} من كاش باك/إحالة الطرف، وخصمها من الأمانات المعلقة، وإيداعها في محفظة البضاعة/التشغيل كإيراد فعلي للأعمال.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Notes Field */}
        <div>
          <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 text-xs">
            ملاحظات وتوثيق القرار الإداري (اختياري)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="مثال: تم التمديد بناءً على طلب العميل / انتهاء المدة القانونية وتحويل للبضاعة..."
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none text-xs focus:border-amber-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant={actionType === 'extend' ? 'success' : 'primary'}
            disabled={isProcessing || currentExpired <= 0}
          >
            {isProcessing ? 'جاري التنفيذ...' : actionType === 'extend' ? `تأكيد التمديد (+${extensionMonths} شهر)` : `تأكيد التحويل للبضاعة (${formatCurrency(currentExpired)})`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
