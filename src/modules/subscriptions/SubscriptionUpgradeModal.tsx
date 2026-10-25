// =============================================================
// NZM JKR TOP UP ERP — Subscription Upgrade / Downgrade Modal
// =============================================================

import React, { useState, useMemo } from 'react';
import { CustomerSubscription, SubscriptionPaymentMethod, SubscriptionPlan } from '../../types/subscription.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import {
  TrendingUp,
  ArrowUpRight,
  Tv,
  CheckCircle2,
  AlertTriangle,
  CreditCard
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface SubscriptionUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: CustomerSubscription;
  onUpgradeSuccess: (updatedSub: CustomerSubscription) => void;
}

export const SubscriptionUpgradeModal: React.FC<SubscriptionUpgradeModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onUpgradeSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const allPlans = db.getSubscriptionPlans('active').filter(p => p.id !== subscription.planId);

  const [selectedPlanId, setSelectedPlanId] = useState<string>(allPlans[0]?.id || '');
  const selectedPlan = useMemo(() => allPlans.find(p => p.id === selectedPlanId), [allPlans, selectedPlanId]);

  // Calculate Price Difference & Proration
  const priceDifference = useMemo(() => {
    if (!selectedPlan) return 0;
    const diff = selectedPlan.price - subscription.finalPrice;
    return Math.max(0, diff);
  }, [selectedPlan, subscription.finalPrice]);

  const [customDiffAmount, setCustomDiffAmount] = useState<number>(priceDifference);
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>('safe_cash');

  const handleUpgradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    const res = db.upgradeSubscription(
      subscription.id,
      selectedPlan.id,
      customDiffAmount,
      paymentMethod,
      {
        id: user?.id,
        name: user?.fullName || 'المدير العام',
        role: user?.role
      }
    );

    if (res.success && res.subscription) {
      showToast('success', 'تمت ترقية الاشتراك بنجاح 🎉', res.message);
      onUpgradeSuccess(res.subscription);
      onClose();
    } else {
      showToast('error', 'فشلت الترقية', res.message || 'حدث خطأ غير متوقع');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ترقية / تغيير باقة الاشتراك #${subscription.subscriptionNumber}`}
      maxWidth="lg"
    >
      <form onSubmit={handleUpgradeSubmit} className="space-y-4 text-right text-xs" dir="rtl">
        {/* Current Plan Card */}
        <Card className="p-3 bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-1">
          <span className="text-[10px] text-zinc-400 font-bold block">الباقة الحالية المفعلة:</span>
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{subscription.planName}</span>
            <span className="font-mono text-zinc-500 font-bold">{formatCurrency(subscription.finalPrice)}</span>
          </div>
        </Card>

        {/* Target Plan Selection */}
        <div>
          <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
            اختر الباقة الجديدة المراد الترقية إليها *
          </label>
          <select
            value={selectedPlanId}
            onChange={e => {
              setSelectedPlanId(e.target.value);
              const p = allPlans.find(item => item.id === e.target.value);
              if (p) setCustomDiffAmount(Math.max(0, p.price - subscription.finalPrice));
            }}
            className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
          >
            {allPlans.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatCurrency(p.price)} ({p.category})
              </option>
            ))}
          </select>
        </div>

        {/* Price Difference & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="فارق الترقية المطلوب سداده (ج.م)"
            type="number"
            min={0}
            value={customDiffAmount}
            onChange={e => setCustomDiffAmount(Math.max(0, Number(e.target.value)))}
            required
          />

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
              طريقة سداد فرق الترقية *
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as SubscriptionPaymentMethod)}
              className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
            >
              <option value="safe_cash">نقدًا بالخزينة</option>
              <option value="vodafone_cash">فودافون كاش</option>
              <option value="instapay">إنستاباي</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="customer_wallet">خصم من المحفظة</option>
            </select>
          </div>
        </div>

        {/* Upgrade Summary */}
        <Card className="p-3.5 bg-pink-500/10 border border-pink-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-500" />
            <div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 block">إجمالي المبلغ المحصل للخزينة</span>
              <span className="text-[10px] text-zinc-500">سيتم تحديث باقة الحساب فوراً</span>
            </div>
          </div>
          <span className="text-base font-black font-mono text-pink-600 dark:text-pink-400">
            {formatCurrency(customDiffAmount)}
          </span>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button variant="secondary" type="button" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={<ArrowUpRight className="w-4 h-4" />}
            className="bg-pink-600 hover:bg-pink-700 text-white font-bold cursor-pointer"
          >
            تأكيد الترقية
          </Button>
        </div>
      </form>
    </Modal>
  );
};
