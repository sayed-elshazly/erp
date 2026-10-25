// =============================================================
// NZM JKR TOP UP ERP — Advanced Customer Filter Drawer Component
// =============================================================

import React, { useState, useEffect } from 'react';
import {
  CustomerFilterCriteria,
  INITIAL_CUSTOMER_FILTER_CRITERIA,
  SavedFilterPreset,
  getSavedFilterPresets,
  saveFilterPreset,
  deleteFilterPreset,
  countActiveFilters
} from '../../services/customer/customerFilterEngine';
import {
  Filter,
  X,
  RotateCcw,
  Save,
  Bookmark,
  Trash2,
  CheckCircle2,
  DollarSign,
  User,
  ShoppingBag,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building,
  Gamepad2,
  AlertCircle
} from 'lucide-react';

interface AdvancedCustomerFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: CustomerFilterCriteria;
  onApplyCriteria: (newCriteria: CustomerFilterCriteria) => void;
  onResetCriteria: () => void;
  availableProducts?: { id: string; name: string }[];
  availableGames?: { id: string; name: string }[];
}

export const AdvancedCustomerFilterDrawer: React.FC<AdvancedCustomerFilterDrawerProps> = ({
  isOpen,
  onClose,
  criteria,
  onApplyCriteria,
  onResetCriteria,
  availableProducts = [],
  availableGames = []
}) => {
  const [localCriteria, setLocalCriteria] = useState<CustomerFilterCriteria>(criteria);
  const [activeTab, setActiveTab] = useState<'profile' | 'financial' | 'orders' | 'dates' | 'referrals' | 'presets'>('profile');
  const [presets, setPresets] = useState<SavedFilterPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  useEffect(() => {
    setLocalCriteria(criteria);
  }, [criteria]);

  useEffect(() => {
    if (isOpen) {
      setPresets(getSavedFilterPresets());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeCount = countActiveFilters(localCriteria);

  const handleUpdate = <K extends keyof CustomerFilterCriteria>(key: K, value: CustomerFilterCriteria[K]) => {
    setLocalCriteria(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApplyCriteria(localCriteria);
    onClose();
  };

  const handleReset = () => {
    setLocalCriteria(INITIAL_CUSTOMER_FILTER_CRITERIA);
    onResetCriteria();
  };

  const handleSaveCurrentPreset = () => {
    if (!newPresetName.trim()) return;
    const created = saveFilterPreset(newPresetName.trim(), localCriteria);
    setPresets(getSavedFilterPresets());
    setNewPresetName('');
    setIsSavingPreset(false);
  };

  const handleApplyPreset = (preset: SavedFilterPreset) => {
    setLocalCriteria(preset.criteria);
    onApplyCriteria(preset.criteria);
    onClose();
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteFilterPreset(id);
    setPresets(getSavedFilterPresets());
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in" dir="rtl">
      {/* Click outside backdrop */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#121215] border-r border-gray-200 dark:border-[#27272A] shadow-2xl flex flex-col h-full overflow-hidden text-right text-xs">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-[#27272A] flex items-center justify-between bg-gray-50/50 dark:bg-[#18181B]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500 dark:text-pink-400">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">فلاتر بروفايلات العملاء المتقدمة</h2>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-500 text-white">
                    {activeCount} مفعل
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">بحث مركب وشامل مع إمكانية دمج كافة المعايير وحفظ الفلاتر</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-[#27272A] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center border-b border-gray-200 dark:border-[#27272A] bg-gray-50 dark:bg-[#141417] overflow-x-auto px-2 py-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-[#1E1E22] text-pink-500 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>الحساب والبيانات</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'financial'
                ? 'bg-white dark:bg-[#1E1E22] text-pink-500 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>الأرصدة والماليات</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-[#1E1E22] text-pink-500 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>الطلبات والمشتريات</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dates')}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'dates'
                ? 'bg-white dark:bg-[#1E1E22] text-pink-500 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>التواريخ والنشاط</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'referrals'
                ? 'bg-white dark:bg-[#1E1E22] text-pink-500 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>الإحالات والشبكة</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-white dark:bg-[#1E1E22] text-amber-500 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>الفلاتر المحفوظة ({presets.length})</span>
          </button>
        </div>

        {/* Drawer Body — Form Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: Profile & Status */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Customer Type */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block">نوع العميل:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { val: 'all', label: 'جميع العملاء' },
                    { val: 'regular', label: 'عميل عادي' },
                    { val: 'dealer', label: 'تاجر' },
                    { val: 'reseller', label: 'موزع' },
                    { val: 'vip', label: 'عميل VIP' },
                    { val: 'banned', label: 'محظور' },
                    { val: 'suspended', label: 'موقوف' }
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => handleUpdate('customerType', item.val as any)}
                      className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        localCriteria.customerType === item.val
                          ? 'bg-pink-500/10 border-pink-500 text-pink-600 dark:text-pink-400 shadow-xs'
                          : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Status */}
              <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-[#27272A]">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block">حالة الحساب:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { val: 'all', label: 'كافة الحالات' },
                    { val: 'active', label: 'نشط' },
                    { val: 'inactive', label: 'غير نشط' },
                    { val: 'banned', label: 'محظور' },
                    { val: 'suspended', label: 'معلق' },
                    { val: 'deleted', label: 'محذوف / مؤرشف' }
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => handleUpdate('accountStatus', item.val as any)}
                      className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        localCriteria.accountStatus === item.val
                          ? 'bg-pink-500/10 border-pink-500 text-pink-600 dark:text-pink-400 shadow-xs'
                          : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verification Status */}
              <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-[#27272A]">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block">حالة التحقق والتوثيق:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'all', label: 'الكل' },
                    { val: 'verified', label: 'موثق 🛡️' },
                    { val: 'unverified', label: 'غير موثق' }
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => handleUpdate('verificationStatus', item.val as any)}
                      className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        localCriteria.verificationStatus === item.val
                          ? 'bg-pink-500/10 border-pink-500 text-pink-600 dark:text-pink-400 shadow-xs'
                          : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Geography: Country & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-[#27272A]">
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block">الدولة:</label>
                  <input
                    type="text"
                    placeholder="مثال: مصر، السعودية..."
                    value={localCriteria.country === 'all' ? '' : localCriteria.country}
                    onChange={e => handleUpdate('country', e.target.value.trim() ? e.target.value : 'all')}
                    className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block">المدينة / المحافظة:</label>
                  <input
                    type="text"
                    placeholder="مثال: القاهرة، الجيزة، الإسكندرية..."
                    value={localCriteria.city === 'all' ? '' : localCriteria.city}
                    onChange={e => handleUpdate('city', e.target.value.trim() ? e.target.value : 'all')}
                    className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-[#27272A]">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block">وسيلة الدفع المفضلة / المستخدمة:</label>
                <select
                  value={localCriteria.paymentMethod}
                  onChange={e => handleUpdate('paymentMethod', e.target.value as any)}
                  className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  <option value="all">كافة وسائل الدفع</option>
                  <option value="vodafone_cash">Vodafone Cash (فودافون كاش)</option>
                  <option value="instapay">InstaPay (إنستاباي)</option>
                  <option value="etisalat_cash">Etisalat Cash (اتصالات كاش)</option>
                  <option value="orange_cash">Orange Cash (أورانج كاش)</option>
                  <option value="we_pay">WE Pay (وي باي)</option>
                  <option value="bank_transfer">Bank Transfer (تحويل بنكي)</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 2: Financial & Balances */}
          {activeTab === 'financial' && (
            <div className="space-y-4">
              {/* Account Balance (رصيد الحساب) */}
              <div className="p-3 bg-gray-50 dark:bg-[#18181B] rounded-xl border border-gray-200 dark:border-[#27272A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">💰 رصيد الحساب (Account Balance):</span>
                  <select
                    value={localCriteria.accountBalanceCondition}
                    onChange={e => handleUpdate('accountBalanceCondition', e.target.value as any)}
                    className="bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-2 py-1 text-[11px] font-bold"
                  >
                    <option value="all">الكل</option>
                    <option value="gt">أكبر من</option>
                    <option value="lt">أقل من</option>
                    <option value="between">بين رقمين</option>
                  </select>
                </div>
                {localCriteria.accountBalanceCondition === 'gt' && (
                  <input
                    type="number"
                    placeholder="القيمة الدنيا..."
                    value={localCriteria.accountBalanceMin ?? ''}
                    onChange={e => handleUpdate('accountBalanceMin', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                  />
                )}
                {localCriteria.accountBalanceCondition === 'lt' && (
                  <input
                    type="number"
                    placeholder="القيمة القصوى..."
                    value={localCriteria.accountBalanceMax ?? ''}
                    onChange={e => handleUpdate('accountBalanceMax', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                  />
                )}
                {localCriteria.accountBalanceCondition === 'between' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="من..."
                      value={localCriteria.accountBalanceMin ?? ''}
                      onChange={e => handleUpdate('accountBalanceMin', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-1/2 bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                    />
                    <span className="text-zinc-400 font-bold">إلى</span>
                    <input
                      type="number"
                      placeholder="إلى..."
                      value={localCriteria.accountBalanceMax ?? ''}
                      onChange={e => handleUpdate('accountBalanceMax', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-1/2 bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Cashback Balance (رصيد الكاش باك) */}
              <div className="p-3 bg-gray-50 dark:bg-[#18181B] rounded-xl border border-gray-200 dark:border-[#27272A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">🎁 رصيد الكاش باك (Cashback Balance):</span>
                  <select
                    value={localCriteria.cashbackBalanceCondition}
                    onChange={e => handleUpdate('cashbackBalanceCondition', e.target.value as any)}
                    className="bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-2 py-1 text-[11px] font-bold"
                  >
                    <option value="all">الكل</option>
                    <option value="gt">أكبر من</option>
                    <option value="lt">أقل من</option>
                    <option value="between">بين رقمين</option>
                  </select>
                </div>
                {localCriteria.cashbackBalanceCondition === 'gt' && (
                  <input
                    type="number"
                    placeholder="القيمة الدنيا..."
                    value={localCriteria.cashbackBalanceMin ?? ''}
                    onChange={e => handleUpdate('cashbackBalanceMin', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                  />
                )}
                {localCriteria.cashbackBalanceCondition === 'lt' && (
                  <input
                    type="number"
                    placeholder="القيمة القصوى..."
                    value={localCriteria.cashbackBalanceMax ?? ''}
                    onChange={e => handleUpdate('cashbackBalanceMax', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                  />
                )}
                {localCriteria.cashbackBalanceCondition === 'between' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="من..."
                      value={localCriteria.cashbackBalanceMin ?? ''}
                      onChange={e => handleUpdate('cashbackBalanceMin', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-1/2 bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                    />
                    <span className="text-zinc-400 font-bold">إلى</span>
                    <input
                      type="number"
                      placeholder="إلى..."
                      value={localCriteria.cashbackBalanceMax ?? ''}
                      onChange={e => handleUpdate('cashbackBalanceMax', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-1/2 bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Referral Balance (رصيد الإحالة) */}
              <div className="p-3 bg-gray-50 dark:bg-[#18181B] rounded-xl border border-gray-200 dark:border-[#27272A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">👥 رصيد محفظة الإحالة (Referral Balance):</span>
                  <select
                    value={localCriteria.referralBalanceCondition}
                    onChange={e => handleUpdate('referralBalanceCondition', e.target.value as any)}
                    className="bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-2 py-1 text-[11px] font-bold"
                  >
                    <option value="all">الكل</option>
                    <option value="gt">أكبر من</option>
                    <option value="lt">أقل من</option>
                    <option value="between">بين رقمين</option>
                  </select>
                </div>
                {localCriteria.referralBalanceCondition === 'gt' && (
                  <input
                    type="number"
                    placeholder="القيمة الدنيا..."
                    value={localCriteria.referralBalanceMin ?? ''}
                    onChange={e => handleUpdate('referralBalanceMin', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                  />
                )}
                {localCriteria.referralBalanceCondition === 'lt' && (
                  <input
                    type="number"
                    placeholder="القيمة القصوى..."
                    value={localCriteria.referralBalanceMax ?? ''}
                    onChange={e => handleUpdate('referralBalanceMax', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                  />
                )}
                {localCriteria.referralBalanceCondition === 'between' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="من..."
                      value={localCriteria.referralBalanceMin ?? ''}
                      onChange={e => handleUpdate('referralBalanceMin', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-1/2 bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                    />
                    <span className="text-zinc-400 font-bold">إلى</span>
                    <input
                      type="number"
                      placeholder="إلى..."
                      value={localCriteria.referralBalanceMax ?? ''}
                      onChange={e => handleUpdate('referralBalanceMax', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-1/2 bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Total Spent (إجمالي الإنفاق) */}
              <div className="p-3 bg-gray-50 dark:bg-[#18181B] rounded-xl border border-gray-200 dark:border-[#27272A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">💳 إجمالي الإنفاق (Total Spending):</span>
                  <select
                    value={localCriteria.totalSpentCondition}
                    onChange={e => handleUpdate('totalSpentCondition', e.target.value as any)}
                    className="bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-2 py-1 text-[11px] font-bold"
                  >
                    <option value="all">الكل</option>
                    <option value="gt">أكبر من</option>
                    <option value="lt">أقل من</option>
                    <option value="between">بين رقمين</option>
                  </select>
                </div>
                {localCriteria.totalSpentCondition === 'gt' && (
                  <input
                    type="number"
                    placeholder="الحد الأدنى..."
                    value={localCriteria.totalSpentMin ?? ''}
                    onChange={e => handleUpdate('totalSpentMin', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                  />
                )}
                {localCriteria.totalSpentCondition === 'lt' && (
                  <input
                    type="number"
                    placeholder="الحد الأقصى..."
                    value={localCriteria.totalSpentMax ?? ''}
                    onChange={e => handleUpdate('totalSpentMax', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                  />
                )}
                {localCriteria.totalSpentCondition === 'between' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="من..."
                      value={localCriteria.totalSpentMin ?? ''}
                      onChange={e => handleUpdate('totalSpentMin', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-1/2 bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                    />
                    <span className="text-zinc-400 font-bold">إلى</span>
                    <input
                      type="number"
                      placeholder="إلى..."
                      value={localCriteria.totalSpentMax ?? ''}
                      onChange={e => handleUpdate('totalSpentMax', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-1/2 bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Status Toggles: Debts, Cashback, Profits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                {/* Debts */}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block">الديون:</label>
                  <select
                    value={localCriteria.debtsStatus}
                    onChange={e => handleUpdate('debtsStatus', e.target.value as any)}
                    className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs font-bold focus:border-pink-500"
                  >
                    <option value="all">الكل</option>
                    <option value="has_debt">لديه ديون ⚠️</option>
                    <option value="no_debt">ليس لديه ديون ✅</option>
                  </select>
                </div>

                {/* Cashback Existence */}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block">الكاش باك:</label>
                  <select
                    value={localCriteria.cashbackStatus}
                    onChange={e => handleUpdate('cashbackStatus', e.target.value as any)}
                    className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs font-bold focus:border-pink-500"
                  >
                    <option value="all">الكل</option>
                    <option value="has_cashback">لديهم كاش باك</option>
                    <option value="no_cashback">ليس لديهم</option>
                  </select>
                </div>

                {/* Profit Existence */}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block">أرباح الإحالة:</label>
                  <select
                    value={localCriteria.profitStatus}
                    onChange={e => handleUpdate('profitStatus', e.target.value as any)}
                    className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs font-bold focus:border-pink-500"
                  >
                    <option value="all">الكل</option>
                    <option value="has_profit">حققوا أرباح إحالة</option>
                    <option value="no_profit">بدون أرباح</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Orders & Purchases */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Orders Count */}
              <div className="p-3 bg-gray-50 dark:bg-[#18181B] rounded-xl border border-gray-200 dark:border-[#27272A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">📦 فلترة حسب عدد الطلبات:</span>
                  <select
                    value={localCriteria.ordersCountCondition}
                    onChange={e => handleUpdate('ordersCountCondition', e.target.value as any)}
                    className="bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-2 py-1 text-[11px] font-bold"
                  >
                    <option value="all">الكل</option>
                    <option value="zero">بدون طلبات (0)</option>
                    <option value="gt">أكبر من</option>
                    <option value="lt">أقل من</option>
                    <option value="between">من X إلى Y</option>
                  </select>
                </div>
                {localCriteria.ordersCountCondition === 'gt' && (
                  <input
                    type="number"
                    placeholder="أكبر من..."
                    value={localCriteria.ordersCountMin ?? ''}
                    onChange={e => handleUpdate('ordersCountMin', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                  />
                )}
                {localCriteria.ordersCountCondition === 'lt' && (
                  <input
                    type="number"
                    placeholder="أقل من..."
                    value={localCriteria.ordersCountMax ?? ''}
                    onChange={e => handleUpdate('ordersCountMax', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                  />
                )}
                {localCriteria.ordersCountCondition === 'between' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="من..."
                      value={localCriteria.ordersCountMin ?? ''}
                      onChange={e => handleUpdate('ordersCountMin', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-1/2 bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                    />
                    <span className="text-zinc-400 font-bold">إلى</span>
                    <input
                      type="number"
                      placeholder="إلى..."
                      value={localCriteria.ordersCountMax ?? ''}
                      onChange={e => handleUpdate('ordersCountMax', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-1/2 bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Purchase Frequency */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block">فلترة حسب عدد مرات الشراء (Frequency):</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 'all', label: 'الكل' },
                    { val: 'once', label: 'مرة واحدة' },
                    { val: 'multiple', label: 'أكثر من مرة' },
                    { val: 'more_than_10', label: 'أكثر من 10 مرات' },
                    { val: 'more_than_50', label: 'أكثر من 50 مرة' }
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => handleUpdate('purchaseFrequency', item.val as any)}
                      className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        localCriteria.purchaseFrequency === item.val
                          ? 'bg-pink-500/10 border-pink-500 text-pink-600 dark:text-pink-400'
                          : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products & Games Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-[#27272A]">
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block">فلترة حسب المنتجات المشتراة:</label>
                  <select
                    value={localCriteria.purchasedProductId}
                    onChange={e => handleUpdate('purchasedProductId', e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs font-bold focus:border-pink-500 cursor-pointer"
                  >
                    <option value="all">كافة المنتجات</option>
                    {availableProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block">فلترة حسب الألعاب:</label>
                  <select
                    value={localCriteria.purchasedGameId}
                    onChange={e => handleUpdate('purchasedGameId', e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs font-bold focus:border-pink-500 cursor-pointer"
                  >
                    <option value="all">كافة الألعاب</option>
                    {availableGames.map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* First Shipping & Reservations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-[#27272A]">
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block">عرض أول شحنة:</label>
                  <select
                    value={localCriteria.firstShippingStatus}
                    onChange={e => handleUpdate('firstShippingStatus', e.target.value as any)}
                    className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs font-bold focus:border-pink-500"
                  >
                    <option value="all">الكل</option>
                    <option value="used">استفاد من العرض</option>
                    <option value="not_used">لم يستفد من العرض</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block">الحجوزات والأمانات:</label>
                  <select
                    value={localCriteria.reservationsStatus}
                    onChange={e => handleUpdate('reservationsStatus', e.target.value as any)}
                    className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs font-bold focus:border-pink-500"
                  >
                    <option value="all">الكل</option>
                    <option value="has_reservations">لديه حجوزات معلقة</option>
                    <option value="no_reservations">لا يوجد</option>
                  </select>
                </div>
              </div>

              {/* Last Purchase Value */}
              <div className="p-3 bg-gray-50 dark:bg-[#18181B] rounded-xl border border-gray-200 dark:border-[#27272A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">قيمة آخر عملية شراء:</span>
                  <select
                    value={localCriteria.lastOrderValueCondition}
                    onChange={e => handleUpdate('lastOrderValueCondition', e.target.value as any)}
                    className="bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-2 py-1 text-[11px] font-bold"
                  >
                    <option value="all">الكل</option>
                    <option value="gt">أكبر من</option>
                    <option value="lt">أقل من</option>
                    <option value="between">بين رقمين</option>
                  </select>
                </div>
                {localCriteria.lastOrderValueCondition === 'gt' && (
                  <input
                    type="number"
                    placeholder="أكبر من..."
                    value={localCriteria.lastOrderValueMin ?? ''}
                    onChange={e => handleUpdate('lastOrderValueMin', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                  />
                )}
                {localCriteria.lastOrderValueCondition === 'lt' && (
                  <input
                    type="number"
                    placeholder="أقل من..."
                    value={localCriteria.lastOrderValueMax ?? ''}
                    onChange={e => handleUpdate('lastOrderValueMax', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                  />
                )}
                {localCriteria.lastOrderValueCondition === 'between' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="من..."
                      value={localCriteria.lastOrderValueMin ?? ''}
                      onChange={e => handleUpdate('lastOrderValueMin', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-1/2 bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                    />
                    <span className="text-zinc-400 font-bold">إلى</span>
                    <input
                      type="number"
                      placeholder="إلى..."
                      value={localCriteria.lastOrderValueMax ?? ''}
                      onChange={e => handleUpdate('lastOrderValueMax', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-1/2 bg-white dark:bg-[#222227] border border-gray-300 dark:border-[#33333A] rounded-lg px-3 py-1.5 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Dates & Activity */}
          {activeTab === 'dates' && (
            <div className="space-y-5">
              {/* Account Creation Date */}
              <div className="space-y-2">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block">فلترة حسب تاريخ إنشاء الحساب:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 'all', label: 'الكل' },
                    { val: 'today', label: 'اليوم' },
                    { val: 'yesterday', label: 'أمس' },
                    { val: 'last_7_days', label: 'آخر 7 أيام' },
                    { val: 'last_30_days', label: 'آخر 30 يوم' },
                    { val: 'this_month', label: 'هذا الشهر' },
                    { val: 'last_month', label: 'الشهر الماضي' },
                    { val: 'custom', label: 'مدة مخصصة...' }
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => handleUpdate('createdAtPreset', item.val as any)}
                      className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        localCriteria.createdAtPreset === item.val
                          ? 'bg-pink-500/10 border-pink-500 text-pink-600 dark:text-pink-400'
                          : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {localCriteria.createdAtPreset === 'custom' && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="date"
                      value={localCriteria.createdAtStart ?? ''}
                      onChange={e => handleUpdate('createdAtStart', e.target.value)}
                      className="w-1/2 bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-1.5 text-xs"
                    />
                    <span className="text-zinc-400 font-bold">إلى</span>
                    <input
                      type="date"
                      value={localCriteria.createdAtEnd ?? ''}
                      onChange={e => handleUpdate('createdAtEnd', e.target.value)}
                      className="w-1/2 bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-1.5 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Last Activity */}
              <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-[#27272A]">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block">فلترة حسب آخر نشاط / آخر شراء:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { val: 'all', label: 'الكل' },
                    { val: 'online_now', label: 'نشط اليوم / متصل' },
                    { val: 'inactive_week', label: 'لم يدخل منذ أسبوع' },
                    { val: 'inactive_month', label: 'لم يدخل منذ شهر' },
                    { val: 'custom', label: 'مدة مخصصة...' }
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => handleUpdate('lastActivityPreset', item.val as any)}
                      className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        localCriteria.lastActivityPreset === item.val
                          ? 'bg-pink-500/10 border-pink-500 text-pink-600 dark:text-pink-400'
                          : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {localCriteria.lastActivityPreset === 'custom' && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="date"
                      value={localCriteria.lastActivityStart ?? ''}
                      onChange={e => handleUpdate('lastActivityStart', e.target.value)}
                      className="w-1/2 bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-1.5 text-xs"
                    />
                    <span className="text-zinc-400 font-bold">إلى</span>
                    <input
                      type="date"
                      value={localCriteria.lastActivityEnd ?? ''}
                      onChange={e => handleUpdate('lastActivityEnd', e.target.value)}
                      className="w-1/2 bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-1.5 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Referrals */}
          {activeTab === 'referrals' && (
            <div className="space-y-4">
              <label className="font-bold text-zinc-700 dark:text-zinc-300 block">فلترة حسب حالة الإحالة (Referral Network):</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { val: 'all', label: 'كافة الحالات' },
                  { val: 'has_referrer', label: 'لديه مُحيل (مسجل عن طريق شخص)' },
                  { val: 'no_referrer', label: 'لا يوجد مُحيل (سجل مباشرة)' },
                  { val: 'has_referees', label: 'لديه عملاء قام بإحالتهم (ناشر)' },
                  { val: 'no_referees', label: 'بدون أي إحالات (لم يدعُ أحداً)' }
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handleUpdate('referralStatus', item.val as any)}
                    className={`p-3 rounded-xl border text-right font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                      localCriteria.referralStatus === item.val
                        ? 'bg-pink-500/10 border-pink-500 text-pink-600 dark:text-pink-400 shadow-xs'
                        : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                    }`}
                  >
                    <span>{item.label}</span>
                    {localCriteria.referralStatus === item.val && <CheckCircle2 className="w-4 h-4 text-pink-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: Saved Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              {/* Save current config */}
              <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                <span className="font-bold text-amber-600 dark:text-amber-400 block">حفظ معايير الفلتر الحالية باسم:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="مثال: كبار العملاء، عملاء VIP، غير نشطين..."
                    value={newPresetName}
                    onChange={e => setNewPresetName(e.target.value)}
                    className="flex-1 bg-white dark:bg-[#1E1E22] border border-gray-300 dark:border-[#33333A] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCurrentPreset}
                    disabled={!newPresetName.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ الفلتر</span>
                  </button>
                </div>
              </div>

              {/* Presets List */}
              <div className="space-y-2 pt-2">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 block">الفلاتر المحفوظة مسبقاً ({presets.length}):</span>
                {presets.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 border border-dashed border-gray-200 dark:border-[#27272A] rounded-xl">
                    <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>لا توجد فلاتر محفوظة حتى الآن</p>
                    <p className="text-[11px] text-zinc-500 mt-1">يمكنك حفظ أي توليفة فلاتر لتطبيقها مستقبلاً بضغطة زر</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {presets.map(preset => (
                      <div
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        className="p-3 bg-gray-50 dark:bg-[#18181B] hover:bg-gray-100 dark:hover:bg-[#202025] border border-gray-200 dark:border-[#27272A] rounded-xl flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                            <Bookmark className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors">
                              {preset.name}
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              {new Date(preset.createdAt).toLocaleDateString('ar-EG')} • {countActiveFilters(preset.criteria)} معايير
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleDeletePreset(preset.id, e)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="حذف الفلتر المحفوظ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-[#27272A] bg-gray-50/80 dark:bg-[#18181B]/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-[#222227] font-bold text-xs transition-colors cursor-pointer"
          >
            مسح كافة الفلاتر
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#27272A] text-zinc-500 font-bold text-xs hover:bg-gray-100 dark:hover:bg-[#222227] transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-pink-500/20 active:scale-95 transition-all cursor-pointer"
            >
              تطبيق الفلاتر ({activeCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
