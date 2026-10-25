// =============================================================
// NZM JKR TOP UP ERP — Advanced Subscriptions Accordion Filter Drawer
// =============================================================

import React, { useState, useEffect } from 'react';
import {
  SubscriptionFilterCriteria,
  INITIAL_SUBSCRIPTION_FILTER_CRITERIA,
  getSavedSubscriptionPresets,
  saveSubscriptionPreset,
  deleteSubscriptionPreset,
  setDefaultSubscriptionPreset,
  SavedSubscriptionPreset,
  countActiveSubscriptionFilters
} from '../../services/subscription/subscriptionFilterEngine';
import { SubscriptionPlan } from '../../types/subscription.types';
import {
  X,
  RotateCcw,
  Check,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Filter,
  User,
  Tv,
  Calendar,
  DollarSign,
  CreditCard,
  UserCheck,
  RefreshCw,
  TrendingUp,
  Tag,
  ShieldCheck,
  Percent,
  Layers,
  Sparkles,
  Trash2,
  Star
} from 'lucide-react';

interface AdvancedSubscriptionFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: SubscriptionFilterCriteria;
  onApplyCriteria: (newCriteria: SubscriptionFilterCriteria) => void;
  onResetCriteria: () => void;
  totalMatchedCount: number;
  availablePlans: SubscriptionPlan[];
  availableCategories: string[];
  availableEmployees: string[];
}

export const AdvancedSubscriptionFilterDrawer: React.FC<AdvancedSubscriptionFilterDrawerProps> = ({
  isOpen,
  onClose,
  criteria,
  onApplyCriteria,
  onResetCriteria,
  totalMatchedCount,
  availablePlans,
  availableCategories,
  availableEmployees
}) => {
  const [localCriteria, setLocalCriteria] = useState<SubscriptionFilterCriteria>(criteria);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    customer: true,
    plan: true,
    status: true,
    dates: false,
    finance: false,
    payment: false,
    employees: false,
    renewal: false,
    profits: false,
    discounts: false,
    presets: false
  });

  const [savedPresets, setSavedPresets] = useState<SavedSubscriptionPreset[]>([]);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [isDefaultPreset, setIsDefaultPreset] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalCriteria(criteria);
      setSavedPresets(getSavedSubscriptionPresets());
    }
  }, [isOpen, criteria]);

  if (!isOpen) return null;

  const toggleSection = (sec: string) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleApply = () => {
    onApplyCriteria(localCriteria);
    onClose();
  };

  const handleReset = () => {
    setLocalCriteria(INITIAL_SUBSCRIPTION_FILTER_CRITERIA);
    onResetCriteria();
  };

  const handleSavePreset = () => {
    if (!presetNameInput.trim()) return;
    saveSubscriptionPreset(presetNameInput.trim(), localCriteria, isDefaultPreset);
    setPresetNameInput('');
    setIsDefaultPreset(false);
    setSavedPresets(getSavedSubscriptionPresets());
  };

  const handleDeletePreset = (id: string) => {
    deleteSubscriptionPreset(id);
    setSavedPresets(getSavedSubscriptionPresets());
  };

  const handleSetDefaultPreset = (id: string) => {
    setDefaultSubscriptionPreset(id);
    setSavedPresets(getSavedSubscriptionPresets());
  };

  const toggleMultiSelect = (key: keyof SubscriptionFilterCriteria, value: string) => {
    const currentList = ((localCriteria[key] as string[]) || []) as string[];
    const exists = currentList.includes(value);
    const updated = exists ? currentList.filter(item => item !== value) : [...currentList, value];
    setLocalCriteria(prev => ({ ...prev, [key]: updated }));
  };

  const activeCount = countActiveSubscriptionFilters(localCriteria);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in" dir="rtl">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-[#121215] border-r border-gray-200 dark:border-[#27272A] shadow-2xl flex flex-col h-full text-right text-xs">
        {/* 1. Header */}
        <div className="p-4 border-b border-gray-200 dark:border-[#27272A] flex items-center justify-between bg-gray-50/50 dark:bg-[#16161A]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                  لوحة الفلاتر والتقارير المتقدمة (Accounting Filter Suite)
                </h3>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-pink-500 text-white font-mono text-[10px] font-black">
                    {activeCount} نشط
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                تصفية شاملة لبيانات الاشتراكات، العملاء، المدفوعات، والأرباح المحاسبية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة تعيين</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-gray-100 dark:bg-[#202024] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time Match Banner */}
        <div className="bg-pink-500/10 dark:bg-pink-500/15 border-b border-pink-500/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-pink-700 dark:text-pink-300 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-pink-500 shrink-0" />
            <span>النتائج المطابقة للمحددات:</span>
            <span className="font-mono font-black text-sm text-pink-600 dark:text-pink-400">
              {totalMatchedCount}
            </span>
            <span>اشتراك</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">تحديث لحظي بدون Refresh</span>
        </div>

        {/* 2. Scrollable Accordion Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Section 1: Basic Customer Data */}
          <div className="rounded-2xl border border-gray-200 dark:border-[#27272A] bg-gray-50/30 dark:bg-[#16161A]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('customer')}
              className="w-full p-3.5 flex items-center justify-between text-right font-black text-zinc-900 dark:text-zinc-100 bg-gray-50/80 dark:bg-[#18181C] hover:bg-gray-100 dark:hover:bg-[#202024] transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                <span>1. فلتر البيانات الأساسية للعميل</span>
              </div>
              {openSections.customer ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.customer && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-[#121215] border-t border-gray-100 dark:border-[#27272A]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">اسم العميل</label>
                    <input
                      type="text"
                      placeholder="اسم العميل..."
                      value={localCriteria.customerName || ''}
                      onChange={e => setLocalCriteria(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">رقم الهاتف</label>
                    <input
                      type="text"
                      placeholder="رقم الهاتف..."
                      value={localCriteria.customerPhone || ''}
                      onChange={e => setLocalCriteria(prev => ({ ...prev, customerPhone: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">كود العميل</label>
                    <input
                      type="text"
                      placeholder="كود العميل..."
                      value={localCriteria.customerCode || ''}
                      onChange={e => setLocalCriteria(prev => ({ ...prev, customerCode: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">البريد الإلكتروني</label>
                    <input
                      type="text"
                      placeholder="البريد..."
                      value={localCriteria.customerEmail || ''}
                      onChange={e => setLocalCriteria(prev => ({ ...prev, customerEmail: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">الدولة</label>
                    <input
                      type="text"
                      placeholder="الدولة..."
                      value={localCriteria.country || ''}
                      onChange={e => setLocalCriteria(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">المدينة / المحافظة</label>
                    <input
                      type="text"
                      placeholder="المدينة أو المحافظة..."
                      value={localCriteria.city || ''}
                      onChange={e => setLocalCriteria(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                {/* Multi Select: Customer Types */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1.5">نوع العميل (Multi-select)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'regular', label: 'عادي' },
                      { id: 'dealer', label: 'تاجر' },
                      { id: 'reseller', label: 'موزع' },
                      { id: 'vip', label: 'VIP' }
                    ].map(t => {
                      const isSel = (localCriteria.customerTypes || []).includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleMultiSelect('customerTypes', t.id)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Multi Select: Customer Status */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1.5">حالة حساب العميل</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'active', label: 'نشط' },
                      { id: 'inactive', label: 'غير نشط' },
                      { id: 'banned', label: 'محظور' },
                      { id: 'suspended', label: 'معلق' }
                    ].map(st => {
                      const isSel = (localCriteria.customerStatuses || []).includes(st.id);
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => toggleMultiSelect('customerStatuses', st.id)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Subscriptions & Plans Specs */}
          <div className="rounded-2xl border border-gray-200 dark:border-[#27272A] bg-gray-50/30 dark:bg-[#16161A]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('plan')}
              className="w-full p-3.5 flex items-center justify-between text-right font-black text-zinc-900 dark:text-zinc-100 bg-gray-50/80 dark:bg-[#18181C] hover:bg-gray-100 dark:hover:bg-[#202024] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-pink-500" />
                <span>2. فلتر الاشتراكات والباقات ومدة الاشتراك</span>
              </div>
              {openSections.plan ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.plan && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-[#121215] border-t border-gray-100 dark:border-[#27272A]">
                {/* Duration Tiers */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1.5">مدة الاشتراك (Multi-select)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'monthly', label: 'اشتراك شهري' },
                      { id: 'quarterly', label: 'ربع سنوي (3 شهور)' },
                      { id: 'semi_annual', label: 'نصف سنوي (6 شهور)' },
                      { id: 'annual', label: 'سنوي (12 شهر)' },
                      { id: 'lifetime', label: 'مدى الحياة' },
                      { id: 'other', label: 'أخرى / مخصصة' }
                    ].map(d => {
                      const isSel = (localCriteria.durationTiers || []).includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleMultiSelect('durationTiers', d.id)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                              : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Categories */}
                {availableCategories.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1.5">فئة الباقة (Multi-select)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableCategories.map(cat => {
                        const isSel = (localCriteria.planCategories || []).includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleMultiSelect('planCategories', cat)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              isSel
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Specific Plans Multi-select */}
                {availablePlans.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1.5">اسم الباقة المحددة (Multi-select)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl border border-gray-100 dark:border-[#27272A]">
                      {availablePlans.map(plan => {
                        const isSel = (localCriteria.planIds || []).includes(plan.id);
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => toggleMultiSelect('planIds', plan.id)}
                            className={`p-2 rounded-lg border text-right text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                              isSel
                                ? 'bg-pink-500/15 border-pink-500 text-pink-600 dark:text-pink-400'
                                : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <span className="truncate">{plan.name}</span>
                            {isSel && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Subscription Status */}
          <div className="rounded-2xl border border-gray-200 dark:border-[#27272A] bg-gray-50/30 dark:bg-[#16161A]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('status')}
              className="w-full p-3.5 flex items-center justify-between text-right font-black text-zinc-900 dark:text-zinc-100 bg-gray-50/80 dark:bg-[#18181C] hover:bg-gray-100 dark:hover:bg-[#202024] transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>3. فلتر حالة الاشتراك والتجديد (Multi-select)</span>
              </div>
              {openSections.status ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.status && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-[#121215] border-t border-gray-100 dark:border-[#27272A]">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'active', label: '🟢 نشط', color: 'emerald' },
                    { id: 'expiring_soon', label: '⏳ سينتهي قريبًا (أقل من 7 أيام)', color: 'amber' },
                    { id: 'expired', label: '🔴 منتهي', color: 'rose' },
                    { id: 'renewed', label: '🔄 تم التجديد', color: 'purple' },
                    { id: 'cancelled', label: '✖️ ملغي', color: 'zinc' },
                    { id: 'frozen', label: '❄️ مجمد مؤقتًا', color: 'cyan' },
                    { id: 'new', label: '✨ اشتراك جديد', color: 'blue' }
                  ].map(st => {
                    const isSel = (localCriteria.statuses || []).includes(st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleMultiSelect('statuses', st.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSel
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Date Period & Range */}
          <div className="rounded-2xl border border-gray-200 dark:border-[#27272A] bg-gray-50/30 dark:bg-[#16161A]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('dates')}
              className="w-full p-3.5 flex items-center justify-between text-right font-black text-zinc-900 dark:text-zinc-100 bg-gray-50/80 dark:bg-[#18181C] hover:bg-gray-100 dark:hover:bg-[#202024] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-500" />
                <span>4. فلتر المدة الزمنية والتواريخ المحاسبية</span>
              </div>
              {openSections.dates ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.dates && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-[#121215] border-t border-gray-100 dark:border-[#27272A]">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1">نوع التاريخ المطبق عليه الفلتر</label>
                  <select
                    value={localCriteria.dateField || 'createdAt'}
                    onChange={e => setLocalCriteria(prev => ({ ...prev, dateField: e.target.value as any }))}
                    className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
                  >
                    <option value="createdAt">تاريخ إنشاء وحجز الاشتراك</option>
                    <option value="startDate">تاريخ بدء سريان الاشتراك</option>
                    <option value="endDate">تاريخ انتهاء الاشتراك</option>
                    <option value="lastRenewedAt">تاريخ آخر تجديد</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1.5">الفترات المسبقة</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: 'كافة الفترات' },
                      { id: 'today', label: 'اليوم' },
                      { id: 'yesterday', label: 'أمس' },
                      { id: 'last_7_days', label: 'آخر 7 أيام' },
                      { id: 'last_30_days', label: 'آخر 30 يوم' },
                      { id: 'this_month', label: 'هذا الشهر' },
                      { id: 'last_month', label: 'الشهر السابق' },
                      { id: 'this_year', label: 'هذا العام' },
                      { id: 'last_year', label: 'السنة السابقة' },
                      { id: 'custom', label: 'فترة مخصصة' }
                    ].map(p => {
                      const isSel = (localCriteria.datePeriod || 'all') === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setLocalCriteria(prev => ({ ...prev, datePeriod: p.id as any }))}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                              : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {localCriteria.datePeriod === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1">من تاريخ</label>
                      <input
                        type="date"
                        value={localCriteria.startDate || ''}
                        onChange={e => setLocalCriteria(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1">إلى تاريخ</label>
                      <input
                        type="date"
                        value={localCriteria.endDate || ''}
                        onChange={e => setLocalCriteria(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 5: Financial Operations & Profits */}
          <div className="rounded-2xl border border-gray-200 dark:border-[#27272A] bg-gray-50/30 dark:bg-[#16161A]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('finance')}
              className="w-full p-3.5 flex items-center justify-between text-right font-black text-zinc-900 dark:text-zinc-100 bg-gray-50/80 dark:bg-[#18181C] hover:bg-gray-100 dark:hover:bg-[#202024] transition-colors"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>5. فلتر العمليات المالية والأرباح المحاسبية</span>
              </div>
              {openSections.finance ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.finance && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-[#121215] border-t border-gray-100 dark:border-[#27272A]">
                {/* Profit Mode */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1.5">فلتر الأرباح</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: 'كافة الاشتراكات' },
                      { id: 'no_profit', label: 'بدون ربح (0 ج)' },
                      { id: 'loss', label: 'بخسارة (سالب)' }
                    ].map(pm => {
                      const isSel = (localCriteria.profitMode || 'all') === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setLocalCriteria(prev => ({ ...prev, profitMode: pm.id as any }))}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {pm.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Final Price Range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">المدفوع من (ج)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={localCriteria.finalPriceMin ?? ''}
                      onChange={e => setLocalCriteria(prev => ({ ...prev, finalPriceMin: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">المدفوع إلى (ج)</label>
                    <input
                      type="number"
                      placeholder="99999"
                      value={localCriteria.finalPriceMax ?? ''}
                      onChange={e => setLocalCriteria(prev => ({ ...prev, finalPriceMax: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Net Profit Range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">صافي الربح من (ج)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={localCriteria.profitMin ?? ''}
                      onChange={e => setLocalCriteria(prev => ({ ...prev, profitMin: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">صافي الربح إلى (ج)</label>
                    <input
                      type="number"
                      placeholder="99999"
                      value={localCriteria.profitMax ?? ''}
                      onChange={e => setLocalCriteria(prev => ({ ...prev, profitMax: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Cost Range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">تكلفة الخدمة من (ج)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={localCriteria.costMin ?? ''}
                      onChange={e => setLocalCriteria(prev => ({ ...prev, costMin: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">تكلفة الخدمة إلى (ج)</label>
                    <input
                      type="number"
                      placeholder="99999"
                      value={localCriteria.costMax ?? ''}
                      onChange={e => setLocalCriteria(prev => ({ ...prev, costMax: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Payment Methods & Status */}
          <div className="rounded-2xl border border-gray-200 dark:border-[#27272A] bg-gray-50/30 dark:bg-[#16161A]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('payment')}
              className="w-full p-3.5 flex items-center justify-between text-right font-black text-zinc-900 dark:text-zinc-100 bg-gray-50/80 dark:bg-[#18181C] hover:bg-gray-100 dark:hover:bg-[#202024] transition-colors"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-500" />
                <span>6. فلتر وسائل الدفع وحالة الدفع (Multi-select)</span>
              </div>
              {openSections.payment ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.payment && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-[#121215] border-t border-gray-100 dark:border-[#27272A]">
                {/* Payment Methods */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1.5">وسيلة الدفع (Multi-select)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'safe_cash', label: 'كاش بالخزينة' },
                      { id: 'vodafone_cash', label: 'فودافون كاش' },
                      { id: 'instapay', label: 'إنستاباي' },
                      { id: 'bank_transfer', label: 'تحويل بنكي' },
                      { id: 'customer_wallet', label: 'رصيد العميل / محفظة' }
                    ].map(pm => {
                      const isSel = (localCriteria.paymentMethods || []).includes(pm.id);
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => toggleMultiSelect('paymentMethods', pm.id)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {pm.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Statuses */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1.5">حالة الدفع (Multi-select)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'paid', label: 'مدفوع بالكامل' },
                      { id: 'partial', label: 'مدفوع جزئياً' },
                      { id: 'pending', label: 'غير مدفوع / معلق' },
                      { id: 'refunded', label: 'مسترد' }
                    ].map(ps => {
                      const isSel = (localCriteria.paymentStatuses || []).includes(ps.id);
                      return (
                        <button
                          key={ps.id}
                          type="button"
                          onClick={() => toggleMultiSelect('paymentStatuses', ps.id)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {ps.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 7: Employees */}
          <div className="rounded-2xl border border-gray-200 dark:border-[#27272A] bg-gray-50/30 dark:bg-[#16161A]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('employees')}
              className="w-full p-3.5 flex items-center justify-between text-right font-black text-zinc-900 dark:text-zinc-100 bg-gray-50/80 dark:bg-[#18181C] hover:bg-gray-100 dark:hover:bg-[#202024] transition-colors"
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-orange-500" />
                <span>7. فلتر الموظفين ومسؤولي التجديد والدعم</span>
              </div>
              {openSections.employees ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.employees && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-[#121215] border-t border-gray-100 dark:border-[#27272A]">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1">منشئ الاشتراك / الموظف</label>
                  <select
                    value={localCriteria.createdBy || ''}
                    onChange={e => setLocalCriteria(prev => ({ ...prev, createdBy: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
                  >
                    <option value="">كافة الموظفين</option>
                    {availableEmployees.map(emp => (
                      <option key={emp} value={emp}>{emp}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 8: Renewal State */}
          <div className="rounded-2xl border border-gray-200 dark:border-[#27272A] bg-gray-50/30 dark:bg-[#16161A]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('renewal')}
              className="w-full p-3.5 flex items-center justify-between text-right font-black text-zinc-900 dark:text-zinc-100 bg-gray-50/80 dark:bg-[#18181C] hover:bg-gray-100 dark:hover:bg-[#202024] transition-colors"
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-500" />
                <span>8. فلتر التجديد (سجل التجديدات)</span>
              </div>
              {openSections.renewal ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.renewal && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-[#121215] border-t border-gray-100 dark:border-[#27272A]">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'renewed', label: 'تم التجديد (مرة أو أكثر)' },
                    { id: 'not_renewed', label: 'لم يتم التجديد (جديد)' },
                    { id: 'needs_renewal', label: 'يحتاج تجديد فوري' },
                    { id: 'auto', label: 'تجديد تلقائي مفعّل' },
                    { id: 'manual', label: 'تجديد يدوي' }
                  ].map(r => {
                    const isSel = (localCriteria.renewalMode || 'all') === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setLocalCriteria(prev => ({ ...prev, renewalMode: r.id as any }))}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSel
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 9: Discounts & Coupons */}
          <div className="rounded-2xl border border-gray-200 dark:border-[#27272A] bg-gray-50/30 dark:bg-[#16161A]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('discounts')}
              className="w-full p-3.5 flex items-center justify-between text-right font-black text-zinc-900 dark:text-zinc-100 bg-gray-50/80 dark:bg-[#18181C] hover:bg-gray-100 dark:hover:bg-[#202024] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-500" />
                <span>9. فلتر الخصومات والكوبونات والعروض</span>
              </div>
              {openSections.discounts ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.discounts && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-[#121215] border-t border-gray-100 dark:border-[#27272A]">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'has_discount', label: 'يوجد خصم مالي' },
                    { id: 'no_discount', label: 'بدون خصم' },
                    { id: 'coupon', label: 'تم باستخدام كود كوبون' },
                    { id: 'gift', label: 'اشتراك مجاني / هدية' }
                  ].map(dc => {
                    const isSel = (localCriteria.discountMode || 'all') === dc.id;
                    return (
                      <button
                        key={dc.id}
                        type="button"
                        onClick={() => setLocalCriteria(prev => ({ ...prev, discountMode: dc.id as any }))}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSel
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {dc.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 10: Saved Presets */}
          <div className="rounded-2xl border border-gray-200 dark:border-[#27272A] bg-gray-50/30 dark:bg-[#16161A]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('presets')}
              className="w-full p-3.5 flex items-center justify-between text-right font-black text-zinc-900 dark:text-zinc-100 bg-gray-50/80 dark:bg-[#18181C] hover:bg-gray-100 dark:hover:bg-[#202024] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-500" />
                <span>10. الفلاتر المحفوظة وتعيين الافتراضي</span>
              </div>
              {openSections.presets ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {openSections.presets && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-[#121215] border-t border-gray-100 dark:border-[#27272A]">
                {/* Save Current Preset */}
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                  <span className="font-bold text-xs text-amber-600 dark:text-amber-400 block">حفظ الفلتر الحالي كقالب</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="اسم القالب (مثال: اشتراكات VIP السنوية)..."
                      value={presetNameInput}
                      onChange={e => setPresetNameInput(e.target.value)}
                      className="flex-1 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleSavePreset}
                      disabled={!presetNameInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer"
                    >
                      حفظ
                    </button>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-500">
                    <input
                      type="checkbox"
                      checked={isDefaultPreset}
                      onChange={e => setIsDefaultPreset(e.target.checked)}
                      className="rounded text-amber-500"
                    />
                    <span>تعيين كفلتر افتراضي عند فتح التقارير</span>
                  </label>
                </div>

                {/* List of Presets */}
                <div className="space-y-1.5">
                  {savedPresets.length === 0 ? (
                    <p className="text-center text-zinc-400 py-2">لا توجد فلاتر محفوظة بعد</p>
                  ) : (
                    savedPresets.map(preset => (
                      <div
                        key={preset.id}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLocalCriteria(preset.criteria);
                            }}
                            className="font-bold text-xs text-zinc-800 dark:text-zinc-200 hover:text-pink-500 text-right cursor-pointer"
                          >
                            {preset.name}
                          </button>
                          {preset.isDefault && (
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-500 text-[9px] font-black">
                              افتراضي
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetDefaultPreset(preset.id)}
                            title="تعيين كافتراضي"
                            className={`p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors ${
                              preset.isDefault ? 'text-amber-500' : 'text-zinc-400'
                            }`}
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePreset(preset.id)}
                            title="حذف القالب"
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-[#27272A] bg-gray-50/50 dark:bg-[#16161A] flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-500 font-bold">
            <span>تم تحديد </span>
            <span className="text-pink-600 dark:text-pink-400 font-mono font-black">{activeCount}</span>
            <span> معيار فلترة</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-[#27272A] text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-gray-300 dark:hover:bg-[#323238] transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-pink-600/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>تطبيق الفلاتر ({totalMatchedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
