import React, { useState, useEffect } from 'react';
import { Dealer, DealerProfileType, CustomerSource } from '../../types/dealer.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useNotifications } from '../../context/NotificationContext';
import {
  User,
  Phone,
  Building2,
  Share2,
  Sparkles,
  Calendar,
  Gift,
  MapPin,
  ShieldCheck,
  Percent,
  TrendingUp,
  CreditCard,
  Wallet
} from 'lucide-react';
import { normalizePhoneNumber, isValidPhoneNumber, cleanPhoneInput } from '../../utils/phoneUtils';

interface DealerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dealerData: Partial<Dealer>) => void;
  dealerToEdit?: Dealer | null;
}

export const DealerFormModal: React.FC<DealerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  dealerToEdit
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isOwner = user?.role === 'admin';

  const [formData, setFormData] = useState<Partial<Dealer>>({
    name: '',
    phone: '',
    birthDate: '',
    source: 'whatsapp',
    profileType: 'distributor',
    status: 'active',
    isFrozen: false,
    businessName: '',
    commercialRegistrationNumber: '',
    address: '',
    city: 'المنصورة',
    creditLimitEGP: 10000,
    customCommissionRate: 1.5,
    firstMonthCommissionRate: 3.0,
    lifetimeCommissionRate: 1.0,
    monthlyTargetCount: 10,
    contractDurationMonths: 12,
    favoriteGame: 'Free Fire',
    balance: 0,
    accountBalance: 0,
    cashbackBalance: 0,
    cashbackRate: 0.5,
    referralWalletBalance: 0,
    referralCode: '',
    notes: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [gameSearch, setGameSearch] = useState('');
  const [referralStatus, setReferralStatus] = useState<{ valid: boolean; message: string } | null>(null);

  // Dynamic Games strictly from Products Tree
  const availableProductGames = React.useMemo(() => {
    const tree = db.getGameTree();
    const map = new Map<string, string>();
    tree.forEach(g => {
      const trimmed = g.name?.trim();
      if (trimmed) {
        const cleanKey = trimmed.toLowerCase();
        if (!map.has(cleanKey)) {
          map.set(cleanKey, trimmed);
        }
      }
    });
    return Array.from(map.values());
  }, []);

  const [referredByStatus, setReferredByStatus] = useState<{
    valid: boolean;
    message: string;
    referrer?: Dealer;
  } | null>(null);

  const checkReferredByCode = (code: string, ownCode?: string) => {
    const clean = (code || '').trim().toUpperCase();
    if (!clean) {
      return { valid: true, message: 'اختياري: لم يتم استخدام كود إحالة' };
    }
    if (ownCode && clean === ownCode.trim().toUpperCase()) {
      return { valid: false, message: '❌ لا يمكن استخدام كود الإحالة الشخصي للتاجر نفسه' };
    }
    const allDealers = db.getDealers(true);
    const referrer = allDealers.find(d => d.referralCode?.trim().toUpperCase() === clean);
    if (!referrer) {
      return { valid: false, message: '❌ كود الإحالة غير مسجل لأي تاجر في النظام' };
    }
    if (dealerToEdit && referrer.id === dealerToEdit.id) {
      return { valid: false, message: '❌ لا يمكن استخدام كود الإحالة لنفس الحساب' };
    }
    if (referrer.isFrozen || referrer.status === 'suspended') {
      return { valid: false, message: '⚠️ كود الإحالة يخص حساب تاجر مجمد أو موقوف' };
    }
    const typeLabel =
      referrer.profileType === 'distributor'
        ? 'موزع معتمد'
        : referrer.profileType === 'shop'
        ? 'متجر/كشك'
        : referrer.profileType === 'agent'
        ? 'وكيل'
        : referrer.profileType === 'vip_dealer'
        ? 'VIP'
        : 'تاجر';
    return {
      valid: true,
      message: `✓ المُحيل المعتمد: ${referrer.name} (${typeLabel})`,
      referrer
    };
  };

  useEffect(() => {
    if (dealerToEdit) {
      setFormData({
        ...dealerToEdit,
        customCommissionRate: dealerToEdit.customCommissionRate || 1.5,
        firstMonthCommissionRate: dealerToEdit.firstMonthCommissionRate || 3.0,
        lifetimeCommissionRate: dealerToEdit.lifetimeCommissionRate || 1.0,
        monthlyTargetCount: dealerToEdit.monthlyTargetCount || 10,
        contractDurationMonths: dealerToEdit.contractDurationMonths || 12,
        creditLimitEGP: dealerToEdit.creditLimitEGP || 10000,
        cashbackRate: dealerToEdit.cashbackRate || 0.5,
        notes: dealerToEdit.notes || ''
      });
      if (dealerToEdit.referredByCode) {
        setReferredByStatus(checkReferredByCode(dealerToEdit.referredByCode, dealerToEdit.referralCode));
      } else {
        setReferredByStatus(null);
      }
    } else {
      const generatedCode = 'DLR-' + Math.floor(1000 + Math.random() * 9000);
      const generatedRefCode = 'DLR-REF-' + Math.floor(1000 + Math.random() * 9000);
      setFormData({
        name: '',
        phone: '',
        birthDate: '',
        source: 'whatsapp',
        profileType: 'distributor',
        status: 'active',
        isFrozen: false,
        businessName: '',
        commercialRegistrationNumber: '',
        address: '',
        city: 'المنصورة',
        creditLimitEGP: 10000,
        customCommissionRate: 1.5,
        firstMonthCommissionRate: 3.0,
        lifetimeCommissionRate: 1.0,
        monthlyTargetCount: 10,
        contractDurationMonths: 12,
        favoriteGame: 'Free Fire',
        balance: 0,
        accountBalance: 0,
        cashbackBalance: 0,
        cashbackRate: 0.5,
        referralWalletBalance: 0,
        referralCode: generatedRefCode,
        notes: ''
      });
      setReferredByStatus(null);
    }
    setErrors({});
  }, [dealerToEdit, isOpen]);

  const handleChange = (field: keyof Dealer, value: any) => {
    const finalVal = field === 'phone' ? cleanPhoneInput(value) : value;
    setFormData(prev => ({ ...prev, [field]: finalVal }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    if (field === 'profileType') {
      if (value === 'distributor') {
        setFormData(prev => ({
          ...prev,
          profileType: value,
          firstMonthCommissionRate: prev.firstMonthCommissionRate || 4.0,
          lifetimeCommissionRate: prev.lifetimeCommissionRate || 1.5,
          monthlyTargetCount: prev.monthlyTargetCount || 15,
          creditLimitEGP: prev.creditLimitEGP || 25000,
          cashbackRate: prev.cashbackRate || 1.0
        }));
      } else if (value === 'vip_dealer') {
        setFormData(prev => ({
          ...prev,
          profileType: value,
          firstMonthCommissionRate: prev.firstMonthCommissionRate || 3.5,
          lifetimeCommissionRate: prev.lifetimeCommissionRate || 1.5,
          monthlyTargetCount: prev.monthlyTargetCount || 12,
          creditLimitEGP: prev.creditLimitEGP || 30000,
          cashbackRate: prev.cashbackRate || 1.0
        }));
      } else if (value === 'shop' || value === 'agent') {
        setFormData(prev => ({
          ...prev,
          profileType: value,
          firstMonthCommissionRate: prev.firstMonthCommissionRate || 3.0,
          lifetimeCommissionRate: prev.lifetimeCommissionRate || 1.0,
          monthlyTargetCount: prev.monthlyTargetCount || 10,
          creditLimitEGP: prev.creditLimitEGP || 10000,
          cashbackRate: prev.cashbackRate || 0.5
        }));
      }
    }

    if (field === 'referralCode') {
      const clean = (value as string).trim().toUpperCase();
      if (clean) {
        const all = db.getDealers(true);
        const exists = all.some(d => d.id !== dealerToEdit?.id && d.referralCode?.toUpperCase() === clean);
        if (exists) {
          setReferralStatus({ valid: false, message: '❌ كود الإحالة هذا مستخدم بالفعل لتاجر آخر' });
        } else {
          setReferralStatus({ valid: true, message: '✓ كود إحالة متاح وفريد' });
        }
      } else {
        setReferralStatus(null);
      }
    }

    if (field === 'referredByCode') {
      setReferredByStatus(checkReferredByCode(value as string, formData.referralCode));
    }
  };

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!formData.name?.trim()) {
      errs.name = 'اسم التاجر أو المؤسسة مطلوب';
    }

    if (!formData.phone?.trim()) {
      errs.phone = 'رقم الهاتف مطلوب';
    } else if (!isValidPhoneNumber(formData.phone)) {
      errs.phone = 'صيغة رقم الهاتف غير صالحة (يرجى إدخال رقم صحيح)';
    } else {
      const phoneCheck = db.isPhoneTaken(formData.phone, dealerToEdit?.id);
      if (phoneCheck.taken) {
        const typeLabel = phoneCheck.entityType === 'dealer' ? 'تاجر' : 'عميل';
        errs.phone = `رقم الهاتف (${phoneCheck.phone}) مسجل بالفعل لحساب ${typeLabel} باسم "${phoneCheck.name}" (يمنع إنشاء حساب مكرر)`;
      }
    }

    if (formData.referralCode) {
      const clean = formData.referralCode.trim().toUpperCase();
      const allDealers = db.getDealers(true);
      const exists = allDealers.some(d => d.id !== dealerToEdit?.id && d.referralCode?.toUpperCase() === clean);
      if (exists) {
        errs.referralCode = 'كود الإحالة مكرر، يرجى تغييره';
      }
    }

    if (formData.referredByCode) {
      const status = checkReferredByCode(formData.referredByCode, formData.referralCode);
      if (!status.valid) {
        errs.referredByCode = status.message;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('error', 'بيانات غير مكتملة', 'يرجى مراجعة الحقول المطلوبة وتصحيح الأخطاء');
      return;
    }

    const payload: Partial<Dealer> = {
      ...formData,
      name: formData.name?.trim(),
      phone: normalizePhoneNumber(formData.phone),
      businessName: formData.businessName?.trim() || undefined,
      commercialRegistrationNumber: formData.commercialRegistrationNumber?.trim() || undefined,
      address: formData.address?.trim() || undefined,
      city: formData.city?.trim() || undefined,
      referralCode: formData.referralCode?.trim().toUpperCase() || 'DLR-REF-' + Math.floor(1000 + Math.random() * 9000),
      referredByCode: formData.referredByCode?.trim().toUpperCase() || undefined,
      firstMonthCommissionRate: Number(formData.firstMonthCommissionRate) || 3.0,
      lifetimeCommissionRate: Number(formData.lifetimeCommissionRate) || 1.0,
      monthlyTargetCount: Number(formData.monthlyTargetCount) || 10,
      creditLimitEGP: Number(formData.creditLimitEGP) || 10000,
      cashbackRate: Number(formData.cashbackRate) || 0.5,
      balance: Number(formData.balance) || 0,
      accountBalance: Number(formData.accountBalance) || 0
    };

    onSave(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={dealerToEdit ? 'تعديل بيانات التاجر / الموزع' : 'إضافة تاجر أو موزع جديد'}
      subtitle={dealerToEdit ? `كود التاجر: ${dealerToEdit.code}` : 'تسجيل تاجر جديد بقائمة أسعار الجملة المعتمدة'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-[#232328] pb-2 text-sm font-bold text-gray-900 dark:text-zinc-100">
            <User className="w-4 h-4 text-amber-500" />
            <span>البيانات الأساسية ونوع التاجر</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="اسم التاجر / المؤسسة *"
              placeholder="مثال: مؤسسة الأندلس لشحن الألعاب"
              value={formData.name || ''}
              onChange={e => handleChange('name', e.target.value)}
              error={errors.name}
              required
            />

            <Input
              label="رقم الهاتف *"
              placeholder="01012345678 أو +2012... أو رقم دولي"
              value={formData.phone || ''}
              onChange={e => handleChange('phone', e.target.value)}
              error={errors.phone}
              required
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                تصنيف التاجر (Profile Type) *
              </label>
              <select
                className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#2E2E2E] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={formData.profileType || 'distributor'}
                onChange={e => handleChange('profileType', e.target.value as DealerProfileType)}
              >
                <option value="distributor">موزع معتمد (Distributor - أعلى خصم جملة)</option>
                <option value="vip_dealer">تاجر VIP (تعاملات ضخمة)</option>
                <option value="shop">متجر / كشك شحن (Shop / POS)</option>
                <option value="agent">وكيل شحن ألعاب (Agent)</option>
                <option value="regular">تاجر عادي (Regular Dealer)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                مصدر المعرفة / القناة
              </label>
              <select
                className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#2E2E2E] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={formData.source || 'whatsapp'}
                onChange={e => handleChange('source', e.target.value as CustomerSource)}
              >
                <option value="whatsapp">واتساب تجاري (WhatsApp Business)</option>
                <option value="telegram">قناة تليجرام الموزعين (Telegram)</option>
                <option value="facebook">فيسبوك (Facebook Page)</option>
                <option value="word_of_mouth">تزكية من تاجر آخر (Word of Mouth)</option>
                <option value="unspecified">غير محدد</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Commercial & Business Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-[#232328] pb-2 text-sm font-bold text-gray-900 dark:text-zinc-100">
            <Building2 className="w-4 h-4 text-amber-500" />
            <span>بيانات النشاط التجاري والحد الائتماني</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="اسم المحل / العلامة التجارية"
              placeholder="مثال: بلاي زون ستور"
              value={formData.businessName || ''}
              onChange={e => handleChange('businessName', e.target.value)}
            />

            <Input
              label="السجل التجاري / البطاقة الضريبية"
              placeholder="CR-98442-EG"
              value={formData.commercialRegistrationNumber || ''}
              onChange={e => handleChange('commercialRegistrationNumber', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="المدينة / المحافظة"
              placeholder="المنصورة / طنطا / القاهرة"
              value={formData.city || ''}
              onChange={e => handleChange('city', e.target.value)}
            />

            <Input
              label="عنوان المحل أو المستودع"
              placeholder="شارع الجمهورية - برج السلام"
              value={formData.address || ''}
              onChange={e => handleChange('address', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="الحد الائتماني المسموح به للدين (ج.م)"
              type="number"
              value={formData.creditLimitEGP ?? 10000}
              onChange={e => handleChange('creditLimitEGP', Number(e.target.value))}
              icon={<CreditCard className="w-4 h-4 text-zinc-400" />}
            />

            <Input
              label="نسبة الكاش باك / حافز الكميات (%)"
              type="number"
              step="any"
              value={formData.cashbackRate ?? 0.5}
              onChange={e => handleChange('cashbackRate', Number(e.target.value))}
              icon={<Percent className="w-4 h-4 text-zinc-400" />}
            />
          </div>
        </div>

        {/* Section 3: Referral & Partnership Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-[#232328] pb-2 text-sm font-bold text-gray-900 dark:text-zinc-100">
            <Share2 className="w-4 h-4 text-amber-500" />
            <span>نظام إحالات التجار والشراكة</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="كود إحالة التاجر الشخصي"
                placeholder="DLR-REF-1001"
                value={formData.referralCode || ''}
                onChange={e => handleChange('referralCode', e.target.value)}
                error={errors.referralCode}
                dir="ltr"
              />
              {referralStatus && (
                <p className={`text-xs mt-1 ${referralStatus.valid ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {referralStatus.message}
                </p>
              )}
            </div>

            <div>
              <Input
                label="كود التاجر المُحيل (Referred By)"
                placeholder="DLR-REF-XXXX"
                value={formData.referredByCode || ''}
                onChange={e => handleChange('referredByCode', e.target.value)}
                error={errors.referredByCode}
                dir="ltr"
              />
              {referredByStatus && (
                <p className={`text-xs mt-1 ${referredByStatus.valid ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {referredByStatus.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                🎮 اللعبة المفضلة / الرئيسية
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="🔍 ابحث في قائمة الألعاب..."
                  value={gameSearch}
                  onChange={e => setGameSearch(e.target.value)}
                  className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#2E2E2E] rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500"
                />
                <select
                  className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#2E2E2E] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  value={formData.favoriteGame || 'Free Fire'}
                  onChange={e => handleChange('favoriteGame', e.target.value)}
                >
                  {availableProductGames
                    .filter(g => !gameSearch.trim() || g.toLowerCase().includes(gameSearch.toLowerCase().trim()))
                    .map(g => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  <option value="أخرى / عام">أخرى / عام (بدون لعبة محددة)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                مدة العقد (بالشهور — 0 = عقد دائم)
              </label>
              <input
                type="number"
                min="0"
                value={formData.contractDurationMonths !== undefined ? formData.contractDurationMonths : 12}
                onChange={e => handleChange('contractDurationMonths', Number(e.target.value))}
                className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#2E2E2E] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className={`text-[10px] mt-0.5 block font-bold ${formData.contractDurationMonths === 0 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                {formData.contractDurationMonths === 0 ? '🌟 عقد دائم ومستمر (بدون تاريخ انتهاء أو قيود)' : 'فترة سريان اتفاقية التاجر (0 = عقد دائم)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="عمولة أول شهر (%)"
              type="number"
              step="any"
              value={formData.firstMonthCommissionRate ?? 3.0}
              onChange={e => handleChange('firstMonthCommissionRate', Number(e.target.value))}
            />

            <Input
              label="عمولة مدى الحياة (%)"
              type="number"
              step="any"
              value={formData.lifetimeCommissionRate ?? 1.0}
              onChange={e => handleChange('lifetimeCommissionRate', Number(e.target.value))}
            />

            <Input
              label="التارجت الشهري (عدد التجار)"
              type="number"
              value={formData.monthlyTargetCount ?? 10}
              onChange={e => handleChange('monthlyTargetCount', Number(e.target.value))}
            />
          </div>

          {/* Dealer Wallets Balance Management (Primary, Cashback, Referral) */}
          {isOwner && (
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3 text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  <span>إدارة المحافظ الثلاث لتاجر الجملة (صلاحية الإدارة للمدير المالك)</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">الرصيد الابتدائي والمحافظ</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Primary Wallet (المحفظة الأساسية) */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-blue-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-blue-500">المحفظة الأساسية (ج.م)</label>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      (formData.accountBalance || 0) < 0
                        ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                        : (formData.accountBalance || 0) > 0
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-zinc-700/30 text-zinc-400'
                    }`}>
                      {(formData.accountBalance || 0) < 0 ? 'عجز مدين ⚠️' : (formData.accountBalance || 0) > 0 ? 'فائض دائن ✨' : 'متزن'}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.accountBalance ?? 0}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      handleChange('accountBalance', val);
                      handleChange('balance', val);
                    }}
                    placeholder="0.00 (يقبل سالب أو موجب)"
                    className="w-full rounded-lg bg-gray-50 dark:bg-[#141417] border border-blue-500/30 p-2 font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    قيمة سالبة = مديونية مطلوب سدادها، موجبة = إيداع مسبق دائن.
                  </p>
                </div>

                {/* 2. Cashback Wallet */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-emerald-500/30 space-y-1.5">
                  <label className="text-[11px] font-bold text-emerald-500 block">كاش باك تاجر الجملة (ج.م)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cashbackBalance ?? 0}
                    onChange={e => handleChange('cashbackBalance', Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                    className="w-full rounded-lg bg-gray-50 dark:bg-[#141417] border border-emerald-500/30 p-2 font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    رصيد كاش باك وحوافز التاجر المكتسب.
                  </p>
                </div>

                {/* 3. Referral Wallet */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-purple-500/30 space-y-1.5">
                  <label className="text-[11px] font-bold text-purple-400 block">محفظة الإحالة (ج.م)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.referralWalletBalance ?? 0}
                    onChange={e => handleChange('referralWalletBalance', Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                    className="w-full rounded-lg bg-gray-50 dark:bg-[#141417] border border-purple-500/30 p-2 font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-500"
                  />
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    عمولات إحالة وتوزيع الشركاء المتاحة.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dealer Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
              ملحوظة التاجر (اختياري)
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="اكتب أي ملحوظة خاصة بالتاجر (مثال: تاجر VIP، يُفضّل التواصل مساءً)..."
              className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#2E2E2E] rounded-xl p-2.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-[#232328]">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary">
            {dealerToEdit ? 'حفظ التعديلات' : 'تسجيل التاجر'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
