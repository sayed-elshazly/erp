// =============================================================
// NZM JKR TOP UP ERP — Subscription Plan Form Modal
// =============================================================

import React, { useState } from 'react';
import { SubscriptionPlan, SubscriptionDurationUnit } from '../../types/subscription.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import {
  Tv,
  DollarSign,
  Layers,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface SubscriptionPlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  planToEdit?: SubscriptionPlan | null;
  onSuccess: (savedPlan: SubscriptionPlan) => void;
}

export const SubscriptionPlanFormModal: React.FC<SubscriptionPlanFormModalProps> = ({
  isOpen,
  onClose,
  planToEdit,
  onSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [name, setName] = useState(planToEdit?.name || '');
  const [category, setCategory] = useState(planToEdit?.category || 'بث وترفيه');
  const [description, setDescription] = useState(planToEdit?.description || '');
  const [price, setPrice] = useState<number>(planToEdit?.price || 150);
  const [originalPrice, setOriginalPrice] = useState<number>(planToEdit?.originalPrice || 200);
  const [costPrice, setCostPrice] = useState<number>(planToEdit?.costPrice || 90);
  const [durationValue, setDurationValue] = useState<number>(planToEdit?.durationValue || 1);
  const [durationUnit, setDurationUnit] = useState<SubscriptionDurationUnit>(planToEdit?.durationUnit || 'months');
  const [badge, setBadge] = useState(planToEdit?.badge || '');
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(planToEdit?.gracePeriodDays || 3);
  const [sortOrder, setSortOrder] = useState<number>(planToEdit?.sortOrder || 1);
  const [status, setStatus] = useState<'active' | 'inactive'>(planToEdit?.status || 'active');

  // Features list
  const [features, setFeatures] = useState<string[]>(
    planToEdit?.features && planToEdit.features.length > 0
      ? planToEdit.features
      : ['جودة فائقة Full HD / 4K', 'ضمان استبدال فوري طوال المدة', 'دعم فني وتفعيل سريع']
  );
  const [newFeatureText, setNewFeatureText] = useState('');

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFeatures(prev => [...prev, newFeatureText.trim()]);
    setNewFeatureText('');
  };

  const handleRemoveFeature = (idx: number) => {
    setFeatures(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'اسم الباقة مطلوب', 'يرجى إدخال اسم الباقة');
      return;
    }

    const priceHistory = planToEdit?.priceHistory ? [...planToEdit.priceHistory] : [];
    if (planToEdit && (planToEdit.price !== price || planToEdit.costPrice !== costPrice)) {
      priceHistory.unshift({
        price: planToEdit.price,
        costPrice: planToEdit.costPrice,
        changedAt: new Date().toISOString(),
        changedBy: user?.fullName || 'المدير العام',
        reason: 'تحديث سعر الباقة'
      });
    }

    const planData: SubscriptionPlan = {
      id: planToEdit?.id || `plan_${Date.now()}`,
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      price,
      originalPrice,
      costPrice,
      durationValue,
      durationUnit,
      features,
      status,
      badge: badge.trim() || undefined,
      sortOrder,
      autoRenewalAllowed: true,
      gracePeriodDays,
      priceHistory,
      totalSubscribersCount: planToEdit?.totalSubscribersCount || 0,
      createdAt: planToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = db.saveSubscriptionPlan(planData, {
      id: user?.id,
      name: user?.fullName || 'المدير العام',
      role: user?.role
    });

    showToast('success', 'تم الحفظ بنجاح 🎉', `تم حفظ باقة "${saved.name}" بنجاح`);
    onSuccess(saved);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={planToEdit ? `تعديل باقة: ${planToEdit.name}` : 'إضافة باقة اشتراك جديدة (New Plan)'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right text-xs" dir="rtl">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="اسم الباقة والخدمة *"
            placeholder="مثال: نتفليكس 4K بريميوم شهري"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
              تصنيف الخدمة / القسم *
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
            >
              <option value="بث وترفيه">بث وترفيه (Streaming & Entertainment)</option>
              <option value="سيرفرات IPTV">سيرفرات IPTV & قنوات رياضية</option>
              <option value="ألعاب">ألعاب (PlayStation, Xbox, Steam)</option>
              <option value="ذكاء اصطناعي">ذكاء اصطناعي (AI & Tech)</option>
              <option value="برامج وإنتاجية">برامج وإنتاجية (Productivity & Music)</option>
              <option value="أخرى">خدمات أخرى</option>
            </select>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="سعر البيع للعميل (ج.م) *"
            type="number"
            min={0}
            value={price}
            onChange={e => setPrice(Math.max(0, Number(e.target.value)))}
            required
          />

          <Input
            label="السعر الأصلي قبل الخصم (ج.م)"
            type="number"
            min={0}
            value={originalPrice}
            onChange={e => setOriginalPrice(Math.max(0, Number(e.target.value)))}
          />

          <Input
            label="تكلفة التزويد الأصلية (ج.م) *"
            type="number"
            min={0}
            value={costPrice}
            onChange={e => setCostPrice(Math.max(0, Number(e.target.value)))}
            required
          />
        </div>

        {/* Duration & Grace Period */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="قيمة مدة الاشتراك *"
            type="number"
            min={1}
            value={durationValue}
            onChange={e => setDurationValue(Math.max(1, Number(e.target.value)))}
            required
          />

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
              وحدة المدة *
            </label>
            <select
              value={durationUnit}
              onChange={e => setDurationUnit(e.target.value as SubscriptionDurationUnit)}
              className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
            >
              <option value="months">شهور (Months)</option>
              <option value="days">أيام (Days)</option>
              <option value="years">سنوات (Years)</option>
            </select>
          </div>

          <Input
            label="أيام فترة السماح بعد الانتهاء"
            type="number"
            min={0}
            value={gracePeriodDays}
            onChange={e => setGracePeriodDays(Math.max(0, Number(e.target.value)))}
          />
        </div>

        {/* Description & Badge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="شارة الباقة (Badge)"
            placeholder="مثال: الأكثر مبيعاً 🔥 أو حصري"
            value={badge}
            onChange={e => setBadge(e.target.value)}
          />

          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
              حالة الباقة *
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
            >
              <option value="active">نشطة ومتاحة للبيع</option>
              <option value="inactive">معطلة ومخفية</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
            وصف تفصيلي للباقة
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="اكتب وصفاً جذاباً يشرح تفاصيل الباقة وشروطها..."
            className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500"
          />
        </div>

        {/* Features Management */}
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <label className="block text-zinc-700 dark:text-zinc-300 font-bold">
            مميزات وبنود الباقة (Features)
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="أدخل ميزة جديدة ثم اضغط إضافة..."
              value={newFeatureText}
              onChange={e => setNewFeatureText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddFeature();
                }
              }}
              className="flex-1 bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500"
            />
            <button
              type="button"
              onClick={handleAddFeature}
              className="px-3 py-2 rounded-xl bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> إضافة
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {features.map((feat, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold flex items-center gap-1.5"
              >
                <span>✓ {feat}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(idx)}
                  className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
          <Button variant="secondary" type="button" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={<CheckCircle2 className="w-4 h-4" />}
            className="bg-pink-600 hover:bg-pink-700 text-white font-bold cursor-pointer"
          >
            {planToEdit ? 'حفظ تعديلات الباقة' : 'إنشاء الباقة'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
