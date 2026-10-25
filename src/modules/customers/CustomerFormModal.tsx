import React, { useState, useEffect } from 'react';
import { Customer, ProfileType, CustomerSource } from '../../types/customer.types';
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
  Users,
  Gift,
  Gamepad2,
  Wallet,
  Lock
} from 'lucide-react';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { normalizePhoneNumber, isValidPhoneNumber, cleanPhoneInput } from '../../utils/phoneUtils';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: Partial<Customer>) => void;
  customerToEdit?: Customer | null;
  moduleContext?: 'customers' | 'merchants' | 'subscriptions' | 'middleman';
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customerToEdit,
  moduleContext = 'customers'
}) => {
  const isSimplified = moduleContext === 'subscriptions' || moduleContext === 'middleman';
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isOwner = user?.role === 'admin';

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    birthDate: '',
    source: 'facebook',
    profileType: 'regular',
    status: 'active',
    isFrozen: false,
    shopName: '',
    shopAddress: '',
    customCommissionRate: 1.0,
    firstMonthCommissionRate: 1.0,
    lifetimeCommissionRate: 1.0,
    monthlyTargetCount: 10,
    contractDurationMonths: 6,
    favoriteGame: 'Free Fire',
    balance: 0,
    accountBalance: 0,
    cashbackBalance: 0,
    referralWalletBalance: 0,
    referralCode: '',
    notes: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [referralStatus, setReferralStatus] = useState<{ valid: boolean; message: string } | null>(null);

  // 1. Dynamic Active Games strictly for Customers/Retail Tree
  const availableCustomerGames = React.useMemo(() => {
    const games = db.getGameTree();
    const map = new Map<string, string>();
    games
      .filter(g => g.isActive !== false)
      .forEach(g => {
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

  // 2. Distinct Games strictly for Middleman Accounts & Deals
  const middlemanGames = React.useMemo(() => {
    const raw = new Set<string>();
    db.getMiddlemanAccounts().forEach(a => {
      if (a.gameName?.trim()) raw.add(a.gameName.trim());
    });
    db.getMiddlemanDeals(true).forEach(d => {
      if (d.gameName?.trim()) raw.add(d.gameName.trim());
    });
    ['PUBG Mobile', 'Free Fire', 'Valorant', 'EA FC 25', 'Roblox', 'League of Legends', 'GTA V'].forEach(g => raw.add(g));
    return Array.from(raw);
  }, []);

  // 3. Subscription Plans strictly for Subscriptions module
  const subscriptionPlans = React.useMemo(() => {
    return db.getSubscriptionPlans().filter(p => p.status === 'active');
  }, []);
  const [referredByStatus, setReferredByStatus] = useState<{
    valid: boolean;
    message: string;
    referrer?: Customer;
  } | null>(null);

  /**
   * Helper to validate referred-by referral code in real-time
   */
  const checkReferredByCode = (code: string, ownCode?: string) => {
    const clean = (code || '').trim().toUpperCase();
    if (!clean) {
      return { valid: true, message: 'اختياري: لم يتم استخدام كود إحالة' };
    }
    if (ownCode && clean === ownCode.trim().toUpperCase()) {
      return { valid: false, message: '❌ لا يمكن استخدام كود الإحالة الشخصي للعميل نفسه' };
    }
    const allCustomers = db.getCustomers(true);
    const referrer = allCustomers.find(c => c.referralCode?.trim().toUpperCase() === clean);
    if (!referrer) {
      return { valid: false, message: '❌ كود الإحالة غير مسجل في النظام' };
    }
    if (customerToEdit && referrer.id === customerToEdit.id) {
      return { valid: false, message: '❌ لا يمكن استخدام كود الإحالة الشخصي لنفس الحساب' };
    }
    if (customerToEdit) {
      let curr: any = referrer;
      const visited = new Set<string>([customerToEdit.id]);
      while (curr && curr.referredByCode) {
        const ancCode = curr.referredByCode.trim().toUpperCase();
        if (visited.has(curr.id) || ancCode === (customerToEdit.referralCode || '').trim().toUpperCase()) {
          return { valid: false, message: '❌ لا يمكن إنشاء حلقة إحالة دائرية بين العملاء' };
        }
        visited.add(curr.id);
        curr = allCustomers.find(c => c.referralCode && c.referralCode.trim().toUpperCase() === ancCode);
        if (curr && visited.has(curr.id)) break;
      }
    }
    if (referrer.isFrozen || referrer.status === 'suspended') {
      return { valid: false, message: '⚠️ كود الإحالة يخص حساب شريك/عميل مجمد أو موقوف' };
    }
    const typeLabel =
      referrer.profileType === 'partner'
        ? 'شريك'
        : referrer.profileType === 'shop'
        ? 'محل'
        : referrer.profileType === 'influencer'
        ? 'مشهور'
        : 'عميل';
    return {
      valid: true,
      message: `✓ المُحيل المعتمد: ${referrer.name} (${typeLabel})`,
      referrer
    };
  };

  /**
   * Helper to generate a clean, random and strictly unique referral code
   * Formats: JKR + 4 alphanumeric (e.g. JKR8F2Q) or 6 alphanumeric (e.g. A9X72P)
   */
  const generateUniqueReferralCode = (): string => {
    const existingCustomers = db.getCustomers(true);
    const existingCodes = new Set(
      existingCustomers.map(c => c.referralCode?.toUpperCase().trim()).filter(Boolean)
    );
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let attempt = 0; attempt < 300; attempt++) {
      let suffix = '';
      for (let i = 0; i < 4; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const code = `JKR${suffix}`;
      if (!existingCodes.has(code)) {
        return code;
      }
    }

    for (let attempt = 0; attempt < 300; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!existingCodes.has(code)) {
        return code;
      }
    }

    return 'JKR' + Math.floor(1000 + Math.random() * 9000);
  };

  /**
   * Real-time validation for referral code uniqueness and character set
   */
  const checkReferralCodeUniqueness = (code: string) => {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) {
      return { valid: false, message: 'كود الإحالة مطلوب' };
    }
    if (!/^[A-Z0-9]+$/.test(trimmed)) {
      return { valid: false, message: 'يسمح فقط بالأحرف الإنجليزية والأرقام دون مسافات أو رموز' };
    }
    const existingCustomers = db.getCustomers(true);
    const isDuplicate = existingCustomers.some(
      c => c.referralCode?.toUpperCase().trim() === trimmed && c.id !== customerToEdit?.id
    );
    if (isDuplicate) {
      return { valid: false, message: '❌ كود الإحالة مستخدم بالفعل، يرجى اختيار كود آخر.' };
    }
    return { valid: true, message: '✓ كود الإحالة فريد ومتاح للاستخدام' };
  };

  useEffect(() => {
    if (isOpen) {
      if (customerToEdit) {
        const initialBal = customerToEdit.accountBalance !== undefined ? customerToEdit.accountBalance : (customerToEdit.balance ?? 0);
        setFormData({
          ...customerToEdit,
          balance: initialBal,
          accountBalance: initialBal,
          cashbackRate: customerToEdit.cashbackRate ?? 1.0
        });
        setReferralStatus({ valid: true, message: '✓ كود الإحالة الحالي' });
        if (customerToEdit.referredByCode) {
          setReferredByStatus(checkReferredByCode(customerToEdit.referredByCode, customerToEdit.referralCode));
        } else {
          setReferredByStatus(null);
        }
      } else {
        const newCustId = 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const randomCode = 'CUST-' + Math.floor(1000 + Math.random() * 9000);
        const uniqueRef = generateUniqueReferralCode();
        setFormData({
          id: newCustId,
          code: randomCode,
          name: '',
          phone: '',
          birthDate: '',
          source: 'facebook',
          profileType: 'regular',
          status: 'active',
          isFrozen: false,
          shopName: '',
          shopAddress: '',
          customCommissionRate: 1.0,
          firstMonthCommissionRate: 1.0,
          lifetimeCommissionRate: 1.0,
          monthlyTargetCount: 10,
          contractDurationMonths: 6,
          monthlyReferredCount: 0,
          partnerWarningCount: 0,
          referralCode: uniqueRef,
          referredByCode: '',
          notes: '',
          cashbackRate: 1.0,
          referralWalletBalance: 0,
          totalReferralCommissionEarned: 0,
          balance: 0,
          accountBalance: 0,
          cashbackBalance: 0,
          totalCashbackEarned: 0,
          totalSpent: 0,
          totalSpentUSD: 0,
          totalOrders: 0,
          maxSingleOrderAmount: 0,
          loyaltyTier: 'normal',
          purchasingPower: 'normal',
          lifetimeSpendingTier: 'bronze',
          favoriteGame: 'Free Fire',
          isArchived: false,
          notesCount: 0,
          ticketsCount: 0
        });
        setReferralStatus({ valid: true, message: '✓ تم توليد كود إحالة فريد تلقائياً' });
        setReferredByStatus(null);
      }
      setErrors({});
    }
  }, [customerToEdit, isOpen]);

  const handleFieldChange = (key: keyof Customer, value: any) => {
    const finalVal = key === 'phone' ? cleanPhoneInput(value) : value;
    if (key === 'profileType') {
      if (value === 'regular') {
        setFormData(prev => ({
          ...prev,
          profileType: 'regular',
          firstMonthCommissionRate: 1.0,
          lifetimeCommissionRate: 1.0,
          customCommissionRate: 1.0
        }));
      } else if (value === 'influencer') {
        setFormData(prev => ({
          ...prev,
          profileType: 'influencer',
          firstMonthCommissionRate: prev.firstMonthCommissionRate && prev.firstMonthCommissionRate !== 1.0 ? prev.firstMonthCommissionRate : 5.0,
          lifetimeCommissionRate: prev.lifetimeCommissionRate && prev.lifetimeCommissionRate !== 1.0 ? prev.lifetimeCommissionRate : 1.5,
          monthlyTargetCount: prev.monthlyTargetCount || 20
        }));
      } else if (value === 'partner') {
        setFormData(prev => ({
          ...prev,
          profileType: 'partner',
          firstMonthCommissionRate: prev.firstMonthCommissionRate && prev.firstMonthCommissionRate !== 1.0 ? prev.firstMonthCommissionRate : 3.0,
          lifetimeCommissionRate: prev.lifetimeCommissionRate && prev.lifetimeCommissionRate !== 1.0 ? prev.lifetimeCommissionRate : 1.0,
          monthlyTargetCount: prev.monthlyTargetCount || 10
        }));
      } else if (value === 'shop') {
        setFormData(prev => ({
          ...prev,
          profileType: 'shop',
          firstMonthCommissionRate: prev.firstMonthCommissionRate && prev.firstMonthCommissionRate !== 1.0 ? prev.firstMonthCommissionRate : 2.0,
          lifetimeCommissionRate: prev.lifetimeCommissionRate && prev.lifetimeCommissionRate !== 1.0 ? prev.lifetimeCommissionRate : 1.0,
          monthlyTargetCount: prev.monthlyTargetCount || 15
        }));
      } else {
        setFormData(prev => ({ ...prev, [key]: finalVal }));
      }
    } else if (key === 'accountBalance' || key === 'balance') {
      const numVal = parseFloat(finalVal) || 0;
      setFormData(prev => ({ ...prev, accountBalance: numVal, balance: numVal }));
    } else {
      setFormData(prev => ({ ...prev, [key]: finalVal }));
    }
    if (errors[key]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!formData.name?.trim()) errs.name = 'اسم العميل مطلوب';
    if (!formData.phone?.trim()) {
      errs.phone = 'رقم الهاتف مطلوب';
    } else if (!isValidPhoneNumber(formData.phone)) {
      errs.phone = 'صيغة رقم الهاتف غير صالحة (يرجى إدخال رقم صحيح)';
    } else {
      const phoneCheck = db.isPhoneTaken(formData.phone, customerToEdit?.id);
      if (phoneCheck.taken) {
        const typeLabel = phoneCheck.entityType === 'dealer' ? 'تاجر' : 'عميل';
        errs.phone = `رقم الهاتف (${phoneCheck.phone}) مسجل مسبقاً لحساب ${typeLabel} باسم "${phoneCheck.name}" (يمنع إنشاء حساب مكرر)`;
      }
    }

    if (!isSimplified) {
      if (formData.profileType === 'shop' && !formData.shopName?.trim()) {
        errs.shopName = 'اسم المحل التجاري مطلوب';
      }

      // Strict referral code check (only in full customers/merchants mode)
      const refCode = (formData.referralCode || '').trim().toUpperCase();
      if (!refCode) {
        errs.referralCode = 'كود الإحالة مطلوب';
      } else {
        const refCheck = checkReferralCodeUniqueness(refCode);
        if (!refCheck.valid) {
          errs.referralCode = refCheck.message;
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('error', 'بيانات غير مكتملة', 'يرجى تصحيح الأخطاء الموضحة قبل الحفظ');
      return;
    }

    // Ensure phone, referral code and profile type are normalized
    const isRegular = isSimplified || (!formData.profileType || formData.profileType === 'regular');
    const effectiveBal = Number(formData.accountBalance !== undefined ? formData.accountBalance : (formData.balance ?? 0));
    const cleanCustomerData: Partial<Customer> = {
      ...formData,
      balance: effectiveBal,
      accountBalance: effectiveBal,
      phone: normalizePhoneNumber(formData.phone),
      notes: formData.notes?.trim() || undefined,
      profileType: isSimplified ? 'regular' : (formData.profileType || 'regular'),
      firstMonthCommissionRate: isRegular ? 1.0 : formData.firstMonthCommissionRate,
      lifetimeCommissionRate: isRegular ? 1.0 : formData.lifetimeCommissionRate,
      customCommissionRate: isRegular ? 1.0 : formData.customCommissionRate,
      referralCode: isSimplified
        ? (formData.referralCode || `CLIENT_${Date.now().toString().slice(-6)}`)
        : (formData.referralCode || generateUniqueReferralCode()).trim().toUpperCase()
    };

    onSave(cleanCustomerData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customerToEdit ? `تعديل بروفايل: ${customerToEdit.name}` : 'إضافة عميل / شريك جديد'}
      subtitle="منظومة إدارة البروفايلات وحسابات الشحن المعتمدة"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <Input
            label="اسم العميل *"
            placeholder="مثال: حسين علي الركابي"
            value={formData.name || ''}
            onChange={e => handleFieldChange('name', e.target.value)}
            error={errors.name}
            icon={<User className="w-4 h-4" />}
            autoFocus
          />

          <Input
            label="رقم الهاتف (شرط: لا يتكرر) *"
            placeholder="مثال: 01012345678 أو +2012... أو رقم دولي"
            value={formData.phone || ''}
            onChange={e => handleFieldChange('phone', e.target.value)}
            error={errors.phone}
            icon={<Phone className="w-4 h-4" />}
          />

          <div>
            <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">مصدر العميل (منصة الإعلان)</label>
            <select
              value={formData.source || 'facebook'}
              onChange={e => handleFieldChange('source', e.target.value as CustomerSource)}
              className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
            >
              <option value="facebook">فيسبوك (Facebook)</option>
              <option value="instagram">إنستغرام (Instagram)</option>
              <option value="tiktok">تيك توك (TikTok)</option>
              <option value="telegram">تيليجرام (Telegram)</option>
              <option value="whatsapp">واتساب (WhatsApp)</option>
              <option value="word_of_mouth">سمع عنا (توصية شخصية)</option>
              <option value="unspecified">غير محدد</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">نوع العميل</label>
            {isSimplified ? (
              <div className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 font-bold text-zinc-800 dark:text-zinc-200">
                عميل عادي
              </div>
            ) : (
              <>
                <select
                  value={formData.profileType || 'regular'}
                  disabled={!isOwner && !!customerToEdit}
                  onChange={e => handleFieldChange('profileType', e.target.value as ProfileType)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500 font-bold text-orange-500"
                >
                  <option value="regular">عميل عادي</option>
                  <option value="partner">شريك (Partner) — Owner فقط</option>
                  <option value="shop">محل (Shop) — Owner فقط</option>
                  <option value="influencer">مشهور (Influencer) — Owner فقط</option>
                </select>
                {!isOwner && (
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">تغيير النوع مخصص للمدير المالك فقط</span>
                )}
              </>
            )}
          </div>

          {/* Subscriptions Module: Show Plan Selection ONLY (NO Games) */}
          {moduleContext === 'subscriptions' ? (
            <div>
              <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                📺 الباقة المطلوبة / المختارة (باقات الاشتراكات فقط)
              </label>
              <SearchableSelect
                allowAll={false}
                required
                value={formData.favoriteGame || (subscriptionPlans[0]?.name || '')}
                placeholder="اختر الباقة..."
                searchPlaceholder="ابحث في باقات الاشتراكات الرقمية..."
                options={subscriptionPlans.map(p => ({
                  value: p.name,
                  label: p.name,
                  badge: `${p.price} ج`
                }))}
                onChange={val => handleFieldChange('favoriteGame', val)}
              />
            </div>
          ) : moduleContext === 'middleman' ? (
            /* Middleman Module: Show Middleman Accounts / Deals Games ONLY */
            <div>
              <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                🛡️ اللعبة / المنصة المرتبطة (حسابات وصفقات الوساطة فقط)
              </label>
              <SearchableSelect
                allowAll={false}
                required
                value={formData.favoriteGame || (middlemanGames[0] || 'PUBG Mobile')}
                placeholder="اختر أو ابحث عن لعبة الحساب..."
                searchPlaceholder="ابحث في ألعاب منصات الوساطة..."
                options={[
                  ...middlemanGames.map(game => ({
                    value: game,
                    label: game,
                    icon: <Gamepad2 className="w-3.5 h-3.5 text-amber-500" />
                  })),
                  {
                    value: 'أخرى / منصة عامة',
                    label: 'أخرى / منصة عامة',
                    badge: 'عام'
                  }
                ]}
                onChange={val => handleFieldChange('favoriteGame', val)}
              />
            </div>
          ) : (
            /* Customers / Retail Module: Show Customer Games ONLY */
            <div>
              <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                🎮 اللعبة المفضلة (ألعاب شحن الزبائن فقط)
              </label>
              <SearchableSelect
                allowAll={false}
                required
                value={formData.favoriteGame || (availableCustomerGames[0] || 'Free Fire')}
                placeholder="اختر أو ابحث عن اللعبة..."
                searchPlaceholder="ابحث باسم اللعبة (مثال: Free Fire, PUBG)..."
                options={[
                  ...availableCustomerGames.map(game => ({
                    value: game,
                    label: game,
                    icon: <Gamepad2 className="w-3.5 h-3.5 text-orange-500" />
                  })),
                  {
                    value: 'أخرى / عام',
                    label: 'أخرى / عام (بدون لعبة محددة)',
                    badge: 'عام'
                  }
                ]}
                onChange={val => handleFieldChange('favoriteGame', val)}
              />
            </div>
          )}

          <Input
            type="date"
            label="تاريخ الميلاد (اختياري — للحملات وأعياد الميلاد)"
            value={formData.birthDate || ''}
            onChange={e => handleFieldChange('birthDate', e.target.value)}
            icon={<Calendar className="w-4 h-4 text-orange-500" />}
          />
        </div>

        {/* Extra Fields for Shop */}
        {!isSimplified && formData.profileType === 'shop' && (
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-fade-in">
            <Input
              label="اسم المحل التجاري *"
              placeholder="مثال: متجر جيمرز بلانيت"
              value={formData.shopName || ''}
              onChange={e => handleFieldChange('shopName', e.target.value)}
              error={errors.shopName}
              icon={<Building2 className="w-4 h-4 text-blue-500" />}
            />
            <Input
              label="عنوان المحل"
              placeholder="مثال: القاهرة - ش عباس العقاد"
              value={formData.shopAddress || ''}
              onChange={e => handleFieldChange('shopAddress', e.target.value)}
            />
          </div>
        )}

        {/* Regular Customer Referral Rate Indicator (1% Lifetime Fixed) */}
        {!isSimplified && (!formData.profileType || formData.profileType === 'regular') && (
          <div className="p-3.5 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 flex items-center justify-between text-xs animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-500 shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                  عمولة الإحالة للعميل العادي: <span className="text-orange-500 font-mono font-black">1% ثابتة مدى الحياة</span>
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  نسبة الإحالة للعميل العادي معتمدة بنسبة 1% دائمة ولا تتغير بعد أول شهر أو انقضاء أي مدة.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 text-orange-500 font-mono font-black text-xs shrink-0">
              1.0% دائم
            </span>
          </div>
        )}

        {/* Extra Fields for Partner / Influencer / Shop */}
        {!isSimplified && (formData.profileType === 'partner' || formData.profileType === 'influencer' || formData.profileType === 'shop') && (
          <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-fade-in">
            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                عمولة أول شهر / 30 يوماً (%) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={
                  formData.firstMonthCommissionRate !== undefined
                    ? formData.firstMonthCommissionRate
                    : formData.profileType === 'influencer'
                    ? 5.0
                    : formData.profileType === 'partner'
                    ? 3.0
                    : 2.0
                }
                onChange={e => handleFieldChange('firstMonthCommissionRate', parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/30 p-2 text-zinc-900 dark:text-zinc-100 font-mono font-bold outline-none focus:border-orange-500"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">تطبق طوال أول 30 يوماً من تسجيل العميل</span>
            </div>

            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                عمولة مدى الحياة (%) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={
                  formData.lifetimeCommissionRate !== undefined
                    ? formData.lifetimeCommissionRate
                    : formData.profileType === 'influencer'
                    ? 1.5
                    : 1.0
                }
                onChange={e => handleFieldChange('lifetimeCommissionRate', parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/30 p-2 text-zinc-900 dark:text-zinc-100 font-mono font-bold outline-none focus:border-orange-500"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">تطبق تلقائياً بعد انقضاء أول 30 يوماً</span>
            </div>

            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                شرط الاستمرار الشهري (عملاء جدد) *
              </label>
              <input
                type="number"
                min="1"
                value={
                  formData.monthlyTargetCount !== undefined
                    ? formData.monthlyTargetCount
                    : formData.profileType === 'partner'
                    ? 10
                    : formData.profileType === 'shop'
                    ? 15
                    : 20
                }
                onChange={e => handleFieldChange('monthlyTargetCount', parseInt(e.target.value) || 10)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/30 p-2 text-zinc-900 dark:text-zinc-100 font-mono font-bold outline-none focus:border-orange-500"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">الحد الأدنى للعملاء الجدد المطلوب شهرياً</span>
            </div>

            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                مدة العقد (بالشهور — 0 = عقد دائم)
              </label>
              <input
                type="number"
                min="0"
                value={formData.contractDurationMonths !== undefined ? formData.contractDurationMonths : 6}
                onChange={e => handleFieldChange('contractDurationMonths', parseInt(e.target.value) || 0)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
              />
              <span className={`text-[10px] mt-0.5 block font-bold ${formData.contractDurationMonths === 0 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                {formData.contractDurationMonths === 0 ? '🌟 عقد دائم ومستمر (بدون تاريخ انتهاء أو قيود)' : 'فترة سريان اتفاقية الشراكة (0 = عقد دائم)'}
              </span>
            </div>
          </div>
        )}

        {/* Referred By Code Linkage Block */}
        {!isSimplified && (
          <div className="p-3.5 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 space-y-2 text-xs animate-fade-in">
            <div className="flex items-center justify-between">
              <label className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-500" />
                <span>كود الإحالة للمُحيل (Referred By Code)</span>
                <span className="text-[10px] text-zinc-400 font-normal">(اختياري — إذا سجل العميل عبر شريك أو مشهور)</span>
              </label>
            </div>

            <input
              type="text"
              value={formData.referredByCode || ''}
              onChange={e => {
                const clean = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                handleFieldChange('referredByCode', clean);
                const status = checkReferredByCode(clean, formData.referralCode);
                setReferredByStatus(status);
              }}
              placeholder="مثال: JKR7742 أو VIP2026"
              className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] px-3 py-2.5 font-mono font-bold text-sm tracking-wider uppercase outline-none focus:border-purple-500 text-zinc-900 dark:text-zinc-100"
            />

            {referredByStatus && (
              <p
                className={`text-[11px] font-bold flex items-center gap-1 animate-fade-in ${
                  referredByStatus.valid && referredByStatus.referrer
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : referredByStatus.valid
                    ? 'text-zinc-400'
                    : 'text-rose-500'
                }`}
              >
                {referredByStatus.message}
              </p>
            )}
          </div>
        )}

        {/* Custom Cashback Rate Block (Default 1.0%, Owner can customize with no restrictions) */}
        {!isSimplified && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs animate-fade-in">
            <div className="flex items-center justify-between">
              <label className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-emerald-500" />
                <span>نسبة الكاش باك الخاصة بالعميل (Cashback Rate %)</span>
                <span className="text-[10px] text-zinc-400 font-normal">
                  {isOwner ? '(صلاحية المدير — الافتراضي 1.0%)' : '(الافتراضي 1.0%)'}
                </span>
              </label>
              <span className="font-mono text-emerald-500 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-md">
                {formData.cashbackRate ?? 1.0}%
              </span>
            </div>

            {isOwner ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.cashbackRate !== undefined ? formData.cashbackRate : 1.0}
                  onChange={e => handleFieldChange('cashbackRate', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-emerald-500/40 p-2 text-zinc-900 dark:text-zinc-100 font-mono font-bold text-sm outline-none focus:border-emerald-500"
                />
                <div className="flex items-center gap-1 shrink-0">
                  {[0.5, 1.0, 2.0, 3.0, 5.0].map(rate => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleFieldChange('cashbackRate', rate)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                        (formData.cashbackRate ?? 1.0) === rate
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-500'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] font-mono text-zinc-400">
                النسبة الافتراضية المعتمدة للعميل: <strong>1.0%</strong> (تعديل النسبة متاح للمدير العام فقط)
              </div>
            )}
            <span className="text-[10px] text-zinc-400 block">
              يتم احتساب الكاش باك تلقائياً بناءً على النسبة الفعلية دون أي حد أدنى إجباري (حتى لو كانت أقل من جنيه).
            </span>
          </div>
        )}

        {/* Referral Code Block (Manager-only, hidden in simplified mode) */}
        {!isSimplified && (isOwner ? (
          <div className="p-3.5 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 space-y-2 text-xs animate-fade-in">
            <div className="flex items-center justify-between">
              <label className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-orange-500" />
                <span>كود الإحالة (Referral Code)</span>
                <span className="text-[10px] text-zinc-400 font-normal">(يدوي أو تلقائي — صلاحية المدير)</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={formData.referralCode || ''}
                  onChange={e => {
                    const clean = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                    handleFieldChange('referralCode', clean);
                    const validation = checkReferralCodeUniqueness(clean);
                    setReferralStatus(validation);
                    if (!validation.valid) {
                      setErrors(prev => ({ ...prev, referralCode: validation.message }));
                    } else {
                      setErrors(prev => {
                        const copy = { ...prev };
                        delete copy.referralCode;
                        return copy;
                      });
                    }
                  }}
                  placeholder="مثال: AHMED50 أو JKR8F2Q"
                  className={`w-full rounded-xl bg-white dark:bg-[#18181B] border px-3 py-2.5 font-mono font-bold text-sm tracking-wider uppercase outline-none transition-all ${
                    errors.referralCode
                      ? 'border-rose-500 text-rose-500 focus:ring-1 focus:ring-rose-500'
                      : referralStatus?.valid
                      ? 'border-emerald-500 text-emerald-500 dark:text-emerald-400 focus:ring-1 focus:ring-emerald-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-900 dark:text-zinc-100 focus:border-orange-500'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const newUniqueCode = generateUniqueReferralCode();
                  handleFieldChange('referralCode', newUniqueCode);
                  setReferralStatus({ valid: true, message: '✓ تم توليد كود إحالة عشوائي وفريد' });
                  setErrors(prev => {
                    const copy = { ...prev };
                    delete copy.referralCode;
                    return copy;
                  });
                  showToast('info', 'تم التوليد', `كود الإحالة الجديد: ${newUniqueCode}`);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>🎲 إنشاء تلقائي</span>
              </button>
            </div>

            {errors.referralCode ? (
              <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1 animate-fade-in">
                {errors.referralCode}
              </p>
            ) : referralStatus?.valid ? (
              <p className="text-[11px] font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-1 animate-fade-in">
                {referralStatus.message}
              </p>
            ) : (
              <p className="text-[10px] text-zinc-400">
                يسمح بالأحرف الإنجليزية والأرقام فقط (بدون مسافات). يجب أن يكون فريداً وغير مكرر.
              </p>
            )}
          </div>
        ) : (
          /* For employees, the field and generator are completely hidden and auto-managed in background */
          <input type="hidden" name="referralCode" value={formData.referralCode || ''} />
        ))}

        {/* Customer Wallets Balance Management (Primary, Cashback, Referral) */}
        {isOwner && (
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3 text-xs animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-blue-500" />
                <span>إدارة المحافظ الثلاث للعميل (صلاحية الإدارة للمدير المالك)</span>
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
                  onChange={e => handleFieldChange('accountBalance', parseFloat(e.target.value) || 0)}
                  placeholder="0.00 (يقبل سالب أو موجب)"
                  className="w-full rounded-lg bg-gray-50 dark:bg-[#141417] border border-blue-500/30 p-2 font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-zinc-400 leading-tight">
                  قيمة سالبة = عجز مطلوب سداده، موجبة = إيداع مسبق دائن.
                </p>
              </div>

              {/* 2. Cashback Wallet - Isolated & System Protected */}
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-emerald-500/20 space-y-1.5 opacity-90">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-500" />
                    محفظة الكاش باك (محمية آلياً)
                  </label>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-500 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
                    نظام آلي
                  </span>
                </div>
                <input
                  type="number"
                  readOnly
                  disabled
                  value={formData.cashbackBalance ?? 0}
                  className="w-full rounded-lg bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-[#2a2a30] p-2 font-mono font-bold text-xs text-zinc-500 cursor-not-allowed outline-none"
                />
                <p className="text-[10px] text-zinc-400 leading-tight">
                  🔒 محفظة نظام آلية محمية — تُحتسب تلقائياً من التذاكر وتُدار عبر تذاكر التحويل الرسمية لمنع التلاعب المالي.
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
                  onChange={e => handleFieldChange('referralWalletBalance', Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-full rounded-lg bg-gray-50 dark:bg-[#141417] border border-purple-500/30 p-2 font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-zinc-400 leading-tight">
                  عمولات الإحالة التراكمية المتاحة للاستبدال أو السحب.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Customer Notes (Requirement #6) */}
        <div>
          <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1 text-xs">
            ملاحظات العميل (اختياري)
          </label>
          <textarea
            rows={2}
            value={formData.notes || ''}
            onChange={e => handleFieldChange('notes', e.target.value)}
            placeholder="اكتب أي ملاحظات خاصة بالعميل (مثال: VIP، شركة، لا يرد، عميل مميز)..."
            className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="primary">
            {customerToEdit ? 'حفظ التعديلات' : 'إنشاء البروفايل'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

