// =============================================================
// NZM JKR TOP UP ERP — Subscription Fast Renewal Modal
// =============================================================

import React, { useState, useMemo } from 'react';
import { CustomerSubscription, SubscriptionPaymentMethod } from '../../types/subscription.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import {
  RotateCcw,
  Calendar,
  DollarSign,
  Tv,
  CheckCircle2,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface SubscriptionRenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: CustomerSubscription;
  onRenewSuccess: (updatedSub: CustomerSubscription) => void;
}

export const SubscriptionRenewModal: React.FC<SubscriptionRenewModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onRenewSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Find plan details
  const plan = db.getSubscriptionPlanById(subscription.planId);
  const defaultDuration = plan?.durationValue || subscription.durationValue || 1;

  const [durationMonths, setDurationMonths] = useState<number>(defaultDuration);
  const [renewalPrice, setRenewalPrice] = useState<number>(plan?.price || subscription.finalPrice || 100);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>(subscription.paymentMethod || 'safe_cash');

  const finalPayable = Math.max(0, renewalPrice - discountAmount);

  // Calculate new end date dynamically
  const calculatedNewEndDate = useMemo(() => {
    const currentEnd = new Date(subscription.endDate);
    const baseDate = currentEnd.getTime() > Date.now() ? currentEnd : new Date();
    const newEnd = new Date(baseDate);
    newEnd.setMonth(newEnd.getMonth() + Number(durationMonths));
    return newEnd.toISOString();
  }, [subscription.endDate, durationMonths]);

  const handleRenewSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const res = db.renewSubscription(
      subscription.id,
      Number(durationMonths),
      finalPayable,
      paymentMethod,
      {
        id: user?.id,
        name: user?.fullName || 'المدير العام',
        role: user?.role
      }
    );

    if (res.success && res.subscription) {
      showToast('success', 'تم تجديد الاشتراك بنجاح 🎉', res.message);
      onRenewSuccess(res.subscription);
      onClose();
    } else {
      showToast('error', 'فشل التجديد', res.message || 'حدث خطأ غير متوقع');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تجديد اشتراك #${subscription.subscriptionNumber}`}
      maxWidth="lg"
    >
      <form onSubmit={handleRenewSubmit} className="space-y-4 text-right text-xs" dir="rtl">
        {/* Current Subscription Status */}
        <Card className="p-3 bg-pink-500/10 border border-pink-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-pink-500" />
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{subscription.planName}</span>
            </div>
            <Badge variant="pink">{subscription.subscriptionNumber}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-pink-500/10">
            <div>
              <span className="text-zinc-500 block">العميل:</span>
              <strong className="text-zinc-900 dark:text-zinc-100">{subscription.customerName} ({subscription.customerPhone})</strong>
            </div>
            <div>
              <span className="text-zinc-500 block">تاريخ الانتهاء الحالي:</span>
              <strong className="text-rose-500">{formatDate(subscription.endDate)}</strong>
            </div>
          </div>
        </Card>

        {/* Renewal Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="مدة التجديد (بالشهور)"
            type="number"
            min={1}
            max={36}
            value={durationMonths}
            onChange={e => setDurationMonths(Math.max(1, Number(e.target.value)))}
            required
          />

          <Input
            label="سعر التجديد (ج.م)"
            type="number"
            min={0}
            value={renewalPrice}
            onChange={e => setRenewalPrice(Math.max(0, Number(e.target.value)))}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="خصم إضافي (ج.م)"
            type="number"
            min={0}
            value={discountAmount}
            onChange={e => setDiscountAmount(Math.max(0, Number(e.target.value)))}
          />

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
              طريقة سداد التجديد *
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as SubscriptionPaymentMethod)}
              className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
            >
              <option value="safe_cash">نقدًا بالخزينة (Cash in Safe)</option>
              <option value="vodafone_cash">فودافون كاش (Vodafone Cash)</option>
              <option value="instapay">إنستاباي (InstaPay)</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="customer_wallet">خصم من رصيد محفظة العميل</option>
            </select>
          </div>
        </div>

        {/* Real-time Calculation Card */}
        <Card className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-700 dark:text-zinc-300">تاريخ الانتهاء الجديد المحتسب:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
              {formatDate(calculatedNewEndDate)}
            </strong>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-emerald-500/15">
            <span className="font-bold text-zinc-700 dark:text-zinc-300">المبلغ المطلوب تحصيله وتوريده للخزينة:</span>
            <strong className="text-pink-600 dark:text-pink-400 font-black font-mono text-base">
              {formatCurrency(finalPayable)}
            </strong>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button variant="secondary" type="button" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={<RotateCcw className="w-4 h-4" />}
            className="bg-pink-600 hover:bg-pink-700 text-white font-bold cursor-pointer"
          >
            تأكيد التجديد وتوليد الإيصال
          </Button>
        </div>
      </form>
    </Modal>
  );
};
