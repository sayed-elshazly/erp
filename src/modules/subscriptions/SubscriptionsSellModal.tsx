// =============================================================
// NZM JKR TOP UP ERP — Subscriptions Fast POS Sell Modal
// =============================================================

import React, { useState, useMemo } from 'react';
import { CustomerSubscription, SubscriptionPlan, SubscriptionPaymentMethod } from '../../types/subscription.types';
import { Customer } from '../../types/customer.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { CustomerFormModal } from '../customers/CustomerFormModal';
import {
  ShoppingBag,
  User,
  UserPlus,
  Search,
  CheckCircle2,
  Tv,
  Calendar,
  DollarSign,
  Tag,
  KeyRound,
  ShieldCheck,
  CreditCard,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface SubscriptionsSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: SubscriptionPlan | null;
  onSuccess: (newSub: CustomerSubscription) => void;
}

export const SubscriptionsSellModal: React.FC<SubscriptionsSellModalProps> = ({
  isOpen,
  onClose,
  initialPlan,
  onSuccess
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const allPlans = db.getSubscriptionPlans('active');
  const allCustomers = db.getSubscriptionClients();

  // 1. Customer State
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);

  // 2. Plan State
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlan?.id || allPlans[0]?.id || '');
  const selectedPlan = useMemo(() => allPlans.find(p => p.id === selectedPlanId), [allPlans, selectedPlanId]);

  // 3. Period & Dates
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Calculate default end date based on plan
  const calculatedEndDate = useMemo(() => {
    if (!selectedPlan) return new Date().toISOString().split('T')[0];
    const s = new Date(startDate);
    if (selectedPlan.durationUnit === 'months') {
      s.setMonth(s.getMonth() + selectedPlan.durationValue);
    } else if (selectedPlan.durationUnit === 'days') {
      s.setDate(s.getDate() + selectedPlan.durationValue);
    } else if (selectedPlan.durationUnit === 'years') {
      s.setFullYear(s.getFullYear() + selectedPlan.durationValue);
    }
    return s.toISOString().split('T')[0];
  }, [startDate, selectedPlan]);

  const [endDate, setEndDate] = useState<string>(calculatedEndDate);

  // Keep endDate in sync when plan or startDate changes
  React.useEffect(() => {
    setEndDate(calculatedEndDate);
  }, [calculatedEndDate]);

  // 4. Pricing & Coupon & Currency
  const [currency, setCurrency] = useState<'EGP' | 'USD' | 'SAR' | 'AED'>('EGP');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>('safe_cash');
  const [autoRenew, setAutoRenew] = useState<boolean>(true);

  // 5. Service Delivery Details
  const [serviceAccountUser, setServiceAccountUser] = useState<string>('');
  const [serviceAccountPassword, setServiceAccountPassword] = useState<string>('');
  const [serviceServerUrl, setServiceServerUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Duplicate active subscription check
  const duplicateActiveSub = useMemo(() => {
    if (!selectedCustomer || !selectedPlanId) return null;
    const existing = db.getSubscriptions();
    return existing.find(
      s => s.customerId === selectedCustomer.id &&
           s.planId === selectedPlanId &&
           (s.status === 'active' || s.status === 'expiring_soon')
    );
  }, [selectedCustomer, selectedPlanId]);

  // Autocomplete matching customers
  const matchingCustomers = customerSearch && (!selectedCustomer || !customerSearch.includes(selectedCustomer.name))
    ? allCustomers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).slice(0, 5)
    : [];

  const handleQuickCustomerSave = (custData: Partial<Customer>) => {
    const newCust = {
      ...custData,
      id: `sub_cust_${Date.now()}`,
      code: `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Customer;
    db.saveSubscriptionClient(newCust, { id: user?.id, name: user?.fullName, role: user?.role });
    setSelectedCustomer(newCust);
    setCustomerSearch(`${newCust.name} (${newCust.phone})`);
    setIsQuickCustomerOpen(false);
    showToast('success', 'تم تسجيل المشترك', `تم تحديد المشترك: ${newCust.name}`);
  };

  const finalPayable = Math.max(0, (selectedPlan?.price || 0) - discountAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      showToast('error', 'العميل مطلوب', 'يرجى اختيار العميل من القائمة أو إضافة عميل جديد');
      return;
    }
    if (!selectedPlan) {
      showToast('error', 'الباقة مطلوبة', 'يرجى اختيار باقة الاشتراك');
      return;
    }

    const res = db.sellSubscription(
      {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerCode: selectedCustomer.code,
        planId: selectedPlan.id,
        currency,
        startDate: `${startDate}T00:00:00Z`,
        endDate: `${endDate}T23:59:59Z`,
        originalPrice: selectedPlan.price,
        discountAmount,
        couponCode: couponCode.trim() || undefined,
        finalPrice: finalPayable,
        paymentMethod,
        autoRenew,
        notes: notes.trim() || undefined,
        serviceAccountUser: serviceAccountUser.trim() || undefined,
        serviceAccountPassword: serviceAccountPassword.trim() || undefined,
        serviceServerUrl: serviceServerUrl.trim() || undefined
      },
      {
        id: user?.id,
        name: user?.fullName || 'المدير العام',
        role: user?.role
      }
    );

    if (res.success && res.subscription) {
      // Add initial timeline event
      db.addSubscriptionTimelineEvent(res.subscription.id, {
        type: 'created',
        title: 'إنشاء وتفعيل الاشتراك',
        description: `تم بيع باقة (${selectedPlan.name}) بقيمة ${formatCurrency(finalPayable)} ${currency} للعميل ${selectedCustomer.name}`,
        userName: user?.fullName || 'المدير العام'
      });

      showToast('success', 'تم بيع وتفعيل الاشتراك بنجاح 🎉', res.message);
      onSuccess(res.subscription);
      onClose();
    } else {
      showToast('error', 'فشلت العملية', res.message || 'حدث خطأ غير متوقع');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="بيع وتفعيل اشتراك جديد (Sell Subscription POS)"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-right text-xs" dir="rtl">
          {/* 1. Customer Selection Card */}
          <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] relative">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <User className="w-4 h-4 text-pink-500" /> ١. اختيار العميل المستفيد *
              </span>
              <button
                type="button"
                onClick={() => setIsQuickCustomerOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" /> عميل جديد
              </button>
            </div>

            <div className="relative">
              <Input
                label="البحث باسم العميل أو رقم الهاتف"
                placeholder="اكتب اسم العميل أو الهاتف للاختيار السريع..."
                value={customerSearch}
                onChange={e => {
                  setCustomerSearch(e.target.value);
                  if (selectedCustomer && !e.target.value.includes(selectedCustomer.name)) {
                    setSelectedCustomer(null);
                  }
                }}
                required
              />

              {matchingCustomers.length > 0 && (
                <div className="absolute z-30 top-full right-0 left-0 mt-1 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl shadow-xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
                  {matchingCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch(`${c.name} (${c.phone})`);
                      }}
                      className="w-full p-2.5 text-right hover:bg-pink-50 dark:hover:bg-pink-950/30 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{c.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{c.phone}</span>
                      </div>
                      <Badge variant="pink">{c.code}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* 2. Plan Selection Card */}
          <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-pink-500" /> ٢. اختيار باقة الاشتراك المطلوبة *
              </span>
              <Badge variant="pink">{allPlans.length} باقة مفعلة</Badge>
            </div>

            <div>
              <select
                value={selectedPlanId}
                onChange={e => setSelectedPlanId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
              >
                {allPlans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.price)} ({p.durationValue} {p.durationUnit === 'months' ? 'شهور' : p.durationUnit === 'days' ? 'أيام' : 'سنة'})
                  </option>
                ))}
              </select>
            </div>

            {selectedPlan && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/60 flex items-center justify-between text-[11px]">
                <div className="space-y-0.5">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{selectedPlan.name}</span>
                  <span className="text-zinc-500">{selectedPlan.category} • {selectedPlan.features.slice(0, 2).join(' • ')}</span>
                </div>
                <div className="text-left font-mono font-black text-pink-600 dark:text-pink-400 text-sm">
                  {formatCurrency(selectedPlan.price)}
                </div>
              </div>
            )}
          </Card>

          {/* 3. Dates & Pricing Details */}
          <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100">
              <Calendar className="w-4 h-4 text-pink-500" />
              <span>٣. فترة الاشتراك والأسعار وطريقة السداد</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="تاريخ بدء الاشتراك *"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
              />

              <Input
                label="تاريخ نهاية الاشتراك *"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
              />
            </div>

            {/* Duplicate Active Subscription Alert */}
            {duplicateActiveSub && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
                <span className="text-[11px] font-bold">
                  ⚠️ تنبيه: العميل لديه اشتراك ساري بالفعل في هذه الباقة (#{duplicateActiveSub.subscriptionNumber}) ينتهي في {formatDate(duplicateActiveSub.endDate)}.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                  العملة المستخدمة
                </label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as any)}
                  className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
                >
                  <option value="EGP">EGP — جنيه مصري</option>
                  <option value="USD">USD — دولار أمريكي</option>
                  <option value="SAR">SAR — ريال سعودي</option>
                  <option value="AED">AED — درهم إماراتي</option>
                </select>
              </div>

              <Input
                label="خصم إضافي"
                type="number"
                min={0}
                value={discountAmount}
                onChange={e => setDiscountAmount(Math.max(0, Number(e.target.value)))}
              />

              <Input
                label="كود الكوبون (اختياري)"
                placeholder="PROMO2026"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
              />

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                  طريقة السداد وتوريد الخزينة *
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as SubscriptionPaymentMethod)}
                  className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
                >
                  <option value="safe_cash">نقدًا بالخزينة (Cash)</option>
                  <option value="vodafone_cash">فودافون كاش</option>
                  <option value="instapay">إنستاباي (InstaPay)</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="customer_wallet">خصم من المحفظة</option>
                </select>
              </div>
            </div>
          </Card>

          {/* 4. Credentials & Delivery (Optional) */}
          <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100">
              <KeyRound className="w-4 h-4 text-purple-500" />
              <span>٤. بيانات تفعيل وتسليم الحساب (اختياري للحسابات الرقمية و IPTV)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="اسم المستخدم / البريد"
                placeholder="user@service.com"
                value={serviceAccountUser}
                onChange={e => setServiceAccountUser(e.target.value)}
              />

              <Input
                label="كلمة المرور / الرمز"
                placeholder="Pass@1234"
                value={serviceAccountPassword}
                onChange={e => setServiceAccountPassword(e.target.value)}
              />

              <Input
                label="رابط السيرفر / الـ Host"
                placeholder="http://iptv.server.net"
                value={serviceServerUrl}
                onChange={e => setServiceServerUrl(e.target.value)}
              />
            </div>
          </Card>

          {/* Summary & Cash Inflow Preview */}
          <Card className="p-3.5 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs block">
                المبلغ النهائي المحصل من العميل والمورد للخزينة
              </span>
              <span className="text-[10px] text-zinc-500">
                شامل الخصومات • يتم تسجيل العملية فورا في الخزينة وسجل النشاط
              </span>
            </div>
            <span className="text-lg font-black font-mono text-pink-600 dark:text-pink-400">
              {formatCurrency(finalPayable)}
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
              icon={<ShoppingBag className="w-4 h-4" />}
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold cursor-pointer"
            >
              تأكيد البيع وإصدار الفاتورة
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Customer */}
      {isQuickCustomerOpen && (
        <CustomerFormModal
          isOpen={isQuickCustomerOpen}
          onClose={() => setIsQuickCustomerOpen(false)}
          onSave={handleQuickCustomerSave}
          moduleContext="subscriptions"
        />
      )}
    </>
  );
};
