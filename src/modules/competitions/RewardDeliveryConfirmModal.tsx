import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CompetitionReward } from '../../types/competition.types';
import { CompetitionDeliveryService } from '../../services/competitions/competitionDeliveryService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  Gift,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  User,
  Package,
  ShieldCheck,
  ArrowRight,
  TrendingDown,
  Sparkles
} from 'lucide-react';

interface RewardDeliveryConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward: CompetitionReward | null;
  onConfirmDelivery: (rewardId: string) => Promise<void> | void;
}

export const RewardDeliveryConfirmModal: React.FC<RewardDeliveryConfirmModalProps> = ({
  isOpen,
  onClose,
  reward,
  onConfirmDelivery
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !reward) return null;

  const preview = CompetitionDeliveryService.previewDelivery(reward);

  const handleConfirm = async () => {
    if (isSubmitting) return; // In-flight lock
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onConfirmDelivery(reward.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تسليم المكافأة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تأكيد تسليم المكافأة واعتماد المصروف التسويقي"
      maxWidth="lg"
    >
      <div className="space-y-5 text-right" dir="rtl">
        {/* Header Alert */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/15 border border-amber-500/30 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-500 dark:text-amber-400">
              تسليم الجائزة وتوثيق الحركة المالية (Atomic Delivery Pipeline)
            </p>
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
              سيتم خصم تكلفة الجائزة الفعلية من محفظة البضاعة وتسجيلها كمصروف تسويقي مستقل
              دون التأثير على أرباح المبيعات الطبيعية (Zero Negative Profit).
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Beneficiary Info */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium">
              <User className="w-3.5 h-3.5" />
              <span>المستفيد</span>
            </div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              {reward.entityName}
            </div>
            <div className="text-zinc-500 font-mono text-[11px]">
              {reward.entityPhone} • ({reward.entityType === 'customer' ? 'عميل' : 'تاجر جملة'})
            </div>
          </div>

          {/* Prize Info */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium">
              <Gift className="w-3.5 h-3.5 text-orange-500" />
              <span>الجائزة المستحقة</span>
            </div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              {reward.prizeName}
            </div>
            <div className="text-orange-500 font-bold">
              القيمة: {reward.prizeValue} {reward.currency}
            </div>
          </div>

          {/* Source Wallet Info */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium">
              <Wallet className="w-3.5 h-3.5 text-blue-500" />
              <span>محفظة البضاعة (المصدر)</span>
            </div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              {reward.sourceWalletName || preview.wallet?.name || 'محفظة النظام'}
            </div>
            <div className="text-zinc-500 text-[11px]">
              الرصيد الحالي: <span className="font-bold text-zinc-800 dark:text-zinc-200">{formatCurrency(preview.currentWalletBalance)}</span>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium">
              <Package className="w-3.5 h-3.5 text-purple-500" />
              <span>المنتج المرتبط</span>
            </div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              {reward.productName || 'مكافأة مباشرة'}
            </div>
            <div className="text-zinc-500 text-[11px]">
              المسابقة: {reward.competitionTitle}
            </div>
          </div>
        </div>

        {/* Financial Impact Comparison Box */}
        <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="text-xs font-black text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
            <span>التأثير المالي بعد التسليم (Financial Projection)</span>
            <Receipt className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
              <div className="text-[10px] text-zinc-400">رصيد المحفظة الحالي</div>
              <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {formatCurrency(preview.currentWalletBalance)}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <div className="text-[10px] text-rose-500 font-bold">المصروف التسويقي</div>
              <div className="font-black text-rose-500 mt-0.5">
                -{formatCurrency(reward.costEGP)}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[10px] text-emerald-500 font-bold">الرصيد بعد الخصم</div>
              <div className="font-black text-emerald-500 mt-0.5">
                {formatCurrency(preview.balanceAfterDelivery)}
              </div>
            </div>
          </div>

          {!preview.hasSufficientBalance && (
            <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>تحذير: رصيد المحفظة غير كافٍ لإتمام الخصم. يرجى تغذية المحفظة أولاً.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isSubmitting || !preview.hasSufficientBalance}
            className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold"
          >
            {isSubmitting ? (
              <span>جاري التسليم الآمن...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد واعتماد التسليم الفوري</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
