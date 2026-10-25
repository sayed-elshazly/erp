import React, { useState, useMemo } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { db } from '../../database/db';
import { Tag, CheckCircle2, XCircle, Gamepad2, Calculator } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface CouponCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CouponCheckerModal: React.FC<CouponCheckerModalProps> = ({ isOpen, onClose }) => {
  const [couponCode, setCouponCode] = useState('');
  const [testAmount, setTestAmount] = useState<number>(100);
  const [selectedGameId, setSelectedGameId] = useState<string>('all');

  const games = useMemo(() => db.getGameTree(), []);
  const allCoupons = useMemo(() => db.getCoupons(), []);

  // Validation Result
  const validation = useMemo(() => {
    const clean = couponCode.trim().toUpperCase();
    if (!clean) return null;

    const res = db.validateCoupon(clean, testAmount, {
      gameId: selectedGameId
    });

    if (!res.valid) {
      return {
        isValid: false,
        error: res.message,
        coupon: res.coupon || null
      };
    }

    const coupon = res.coupon!;
    const finalPrice = Math.max(0, testAmount - res.discountAmount);

    return {
      isValid: true,
      error: null,
      coupon,
      discount: res.discountAmount,
      finalPrice
    };
  }, [couponCode, testAmount, selectedGameId, allCoupons]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔍 فحص الكوبونات وقواعد الخصم (Coupon Inspector)"
      subtitle="التحقق من صلاحية الكوبون، اللعبة المرتبطة، ومطابقة الأسعار قبل وبعد الخصم"
      maxWidth="lg"
    >
      <div className="space-y-4 text-right text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="كود الكوبون المراد فحصه *"
              placeholder="مثال: JKR2026, SUMMER50..."
              value={couponCode}
              onChange={e => setCouponCode(e.target.value.toUpperCase())}
              autoFocus
              icon={<Tag className="w-4 h-4 text-orange-500" />}
            />
          </div>

          <div>
            <Input
              label="مبلغ الفحص التجريبي (ج)"
              type="number"
              value={testAmount || ''}
              onChange={e => setTestAmount(parseFloat(e.target.value) || 0)}
              icon={<Calculator className="w-4 h-4 text-emerald-500" />}
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
            <Gamepad2 className="w-3.5 h-3.5 text-orange-500" />
            <span>اللعبة المختارة للفحص (للتحقق من شروط الربط)</span>
          </label>
          <select
            value={selectedGameId}
            onChange={e => setSelectedGameId(e.target.value)}
            className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-bold outline-none"
          >
            <option value="all">كافة الألعاب (بدون تقييد)</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Validation Result Box */}
        {validation && (
          <div className="p-4 rounded-2xl border transition-all animate-fade-in space-y-3 bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A]">
            {validation.isValid ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>الكوبون صالح ونشط ومطابق للشروط ✓</span>
                  </div>
                  <Badge variant="success" size="sm">
                    {validation.coupon?.discountType === 'percentage'
                      ? `${validation.coupon.discountValue}% خصم`
                      : `${validation.coupon?.discountValue} ج خصم ثابت`}
                  </Badge>
                </div>

                {/* Price Breakdown Calculation */}
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2 font-mono">
                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span>السعر قبل الخصم:</span>
                    <span className="font-bold">{formatCurrency(testAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-500 font-bold">
                    <span>قيمة الخصم:</span>
                    <span>-{formatCurrency(validation.discount || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-[#27272A] text-sm font-black text-zinc-900 dark:text-zinc-100">
                    <span>السعر النهائي المطلوب:</span>
                    <span className="text-orange-500 font-black">{formatCurrency(validation.finalPrice || 0)}</span>
                  </div>
                </div>

                {/* Coupon Meta Details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                  <div>
                    <span>اللعبة المقيدة: </span>
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {validation.coupon?.applicableGameId && validation.coupon.applicableGameId !== 'all'
                        ? games.find(g => g.id === validation.coupon?.applicableGameId)?.name || 'لعبة محددة'
                        : 'جميع الألعاب'}
                    </strong>
                  </div>
                  <div>
                    <span>عدد مرات الاستخدام: </span>
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {validation.coupon?.currentUsageCount || 0} / {validation.coupon?.maxUsageTotal || 'غير محدود'}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 font-bold flex items-center gap-2">
                <XCircle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="block font-black text-xs">الكوبون غير صالح أو مرفوض:</span>
                  <span className="text-[11px] text-rose-400">{validation.error}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};
