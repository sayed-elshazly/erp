import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Input } from '../common/Input';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Customer } from '../../types/customer.types';
import { Dealer } from '../../types/dealer.types';
import { BalanceWithdrawal, BalanceWithdrawalItem } from '../../types/finance.types';
import { formatCurrency } from '../../utils/formatters';
import { isSamePhoneNumber } from '../../utils/phoneUtils';
import {
  Wallet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Search,
  User,
  Phone,
  Coins,
  Receipt,
  Sparkles,
  CreditCard,
  Building2
} from 'lucide-react';

interface NewWithdrawalTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyType?: 'customer' | 'dealer';
  mode?: 'customer' | 'dealer';
  defaultPartyId?: string;
  preselectedPhone?: string;
  onSuccess?: (withdrawal: BalanceWithdrawal) => void;
}

export const NewWithdrawalTicketModal: React.FC<NewWithdrawalTicketModalProps> = ({
  isOpen,
  onClose,
  partyType: explicitPartyType,
  mode,
  defaultPartyId,
  preselectedPhone,
  onSuccess
}) => {
  const partyType = explicitPartyType || mode || 'customer';
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [step, setStep] = useState<1 | 2>(1);

  // Lists from DB
  const allCustomers = useMemo(() => db.getCustomers(), [isOpen]);
  const allDealers = useMemo(() => db.getDealers(), [isOpen]);

  // Step 1: Party selection & basic info
  const [searchPhoneQuery, setSearchPhoneQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('كاش (نقدي من الخزنة)');

  // Step 2: Wallets & Amounts
  const [mainAmount, setMainAmount] = useState<number>(0);
  const [referralAmount, setReferralAmount] = useState<number>(0);
  const [cashbackAmount, setCashbackAmount] = useState<number>(0);
  const [withdrawalNotes, setWithdrawalNotes] = useState('');

  // Auto-initialize if defaultPartyId or preselectedPhone is provided
  useEffect(() => {
    if (defaultPartyId || preselectedPhone) {
      if (partyType === 'dealer') {
        const found = allDealers.find(d => 
          (defaultPartyId && (d.id === defaultPartyId || d.code === defaultPartyId)) ||
          (preselectedPhone && (d.phone === preselectedPhone || isSamePhoneNumber(d.phone, preselectedPhone)))
        );
        if (found) {
          setSelectedDealer(found);
          setSearchPhoneQuery(found.phone);
          setRecipientPhone(found.phone);
        }
      } else {
        const found = allCustomers.find(c => 
          (defaultPartyId && (c.id === defaultPartyId || c.code === defaultPartyId)) ||
          (preselectedPhone && (c.phone === preselectedPhone || isSamePhoneNumber(c.phone, preselectedPhone)))
        );
        if (found) {
          setSelectedCustomer(found);
          setSearchPhoneQuery(found.phone);
          setRecipientPhone(found.phone);
        }
      }
    }
  }, [defaultPartyId, preselectedPhone, partyType, allCustomers, allDealers, isOpen]);

  // Selected party object
  const activeParty = partyType === 'dealer' ? selectedDealer : selectedCustomer;

  // Auto-complete suggestions for phone/name search
  const suggestions = useMemo(() => {
    const q = searchPhoneQuery.trim().toLowerCase();
    if (!q || activeParty) return [];

    if (partyType === 'dealer') {
      return allDealers
        .filter(d => d.phone.includes(q) || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q))
        .slice(0, 5);
    } else {
      return allCustomers
        .filter(c => c.phone.includes(q) || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
        .slice(0, 5);
    }
  }, [searchPhoneQuery, partyType, allCustomers, allDealers, activeParty]);

  const handleSelectSuggestion = (party: Customer | Dealer) => {
    if (partyType === 'dealer') {
      setSelectedDealer(party as Dealer);
    } else {
      setSelectedCustomer(party as Customer);
    }
    setSearchPhoneQuery(party.phone);
    if (!recipientPhone) setRecipientPhone(party.phone);
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setSelectedDealer(null);
    setSearchPhoneQuery('');
    setRecipientPhone('');
  };

  // Balances of active party
  const mainWalletBalance = useMemo(() => {
    if (!activeParty) return 0;
    return Math.max(0, activeParty.accountBalance || activeParty.balance || 0);
  }, [activeParty]);

  const referralWalletBalance = useMemo(() => {
    if (!activeParty) return 0;
    return Math.max(0, activeParty.referralWalletBalance || 0);
  }, [activeParty]);

  const cashbackWalletBalance = useMemo(() => {
    if (!activeParty) return 0;
    return Math.max(0, activeParty.cashbackBalance || 0);
  }, [activeParty]);

  const totalAvailableBalance = mainWalletBalance + referralWalletBalance + cashbackWalletBalance;

  // Validation
  const isMainExceeded = mainAmount > mainWalletBalance;
  const isReferralExceeded = referralAmount > referralWalletBalance;
  const isCashbackExceeded = cashbackAmount > cashbackWalletBalance;
  const hasExceededAny = isMainExceeded || isReferralExceeded || isCashbackExceeded;

  const totalWithdrawalAmount = (Number(mainAmount) || 0) + (Number(referralAmount) || 0) + (Number(cashbackAmount) || 0);

  const canProceedToStep2 = Boolean(activeParty);
  const canConfirmWithdrawal = canProceedToStep2 && totalWithdrawalAmount > 0 && !hasExceededAny;

  // Handle final submission
  const handleSubmitWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirmWithdrawal || !activeParty) return;

    const withdrawalId = `WD${Date.now().toString().slice(-6)}`;
    const items: BalanceWithdrawalItem[] = [];

    if (mainAmount > 0) {
      items.push({
        id: `item_${Date.now()}_main`,
        walletType: 'main',
        walletName: 'المحفظة الأساسية (الرصيد الدائن)',
        amount: mainAmount,
        balanceBefore: mainWalletBalance,
        balanceAfter: mainWalletBalance - mainAmount
      });
    }

    if (referralAmount > 0) {
      items.push({
        id: `item_${Date.now()}_ref`,
        walletType: 'referral',
        walletName: 'محفظة الإحالة والعمولات',
        amount: referralAmount,
        balanceBefore: referralWalletBalance,
        balanceAfter: referralWalletBalance - referralAmount
      });
    }

    if (cashbackAmount > 0) {
      items.push({
        id: `item_${Date.now()}_cb`,
        walletType: 'cashback',
        walletName: 'محفظة الكاش باك',
        amount: cashbackAmount,
        balanceBefore: cashbackWalletBalance,
        balanceAfter: cashbackWalletBalance - cashbackAmount
      });
    }

    const withdrawalRecord: BalanceWithdrawal = {
      id: withdrawalId,
      partyType,
      partyId: activeParty.id,
      partyCode: activeParty.code,
      partyName: activeParty.name,
      partyPhone: activeParty.phone,
      recipientPhone: recipientPhone.trim() || activeParty.phone,
      paymentMethod,
      totalAmount: totalWithdrawalAmount,
      notes: withdrawalNotes.trim() || undefined,
      recordedBy: user?.fullName || user?.username || 'موظف الحسابات',
      createdAt: new Date().toISOString(),
      status: 'completed',
      items
    };

    if (partyType === 'dealer') {
      db.recordDealerBalanceWithdrawal(withdrawalRecord, user);
    } else {
      db.recordBalanceWithdrawal(withdrawalRecord, user);
    }

    showToast(
      'success',
      'تم السحب بنجاح',
      `تم سحب ${formatCurrency(totalWithdrawalAmount)} من محافظ ${activeParty.name} وخصمها من الخزينة`
    );

    if (onSuccess) {
      onSuccess(withdrawalRecord);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 1
          ? `💸 تذكرة سحب رصيد جديدة — الخطوة 1 من 2 (بيانات ${partyType === 'dealer' ? 'التاجر' : 'العميل'})`
          : `💰 تذكرة سحب رصيد — الخطوة 2 من 2 (اختيار المحافظ وتحديد المبالغ)`
      }
      maxWidth="lg"
    >
      <div className="space-y-4 text-right" dir="rtl">
        {/* Step 1: Client / Dealer Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-200">
              <span className="font-bold block mb-1">
                سحب فوري لأرصدة {partyType === 'dealer' ? 'التاجر' : 'العميل'} الفائضة:
              </span>
              تتيح لك هذه التذكرة سحب أي مبالغ نقدية من المحفظة الأساسية، محفظة الإحالات، ومحفظة الكاش باك معاً في عملية واحدة وإصدار فاتورة سحب رسمية.
            </div>

            {/* Search Input with Auto-complete */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                رقم هاتف أو اسم أو كود {partyType === 'dealer' ? 'التاجر' : 'العميل'}:
              </label>
              <div className="relative">
                <Input
                  placeholder="ابحث برقم الهاتف أو الاسم..."
                  value={searchPhoneQuery}
                  onChange={e => {
                    setSearchPhoneQuery(e.target.value);
                    if (activeParty) {
                      setSelectedCustomer(null);
                      setSelectedDealer(null);
                    }
                  }}
                  autoFocus
                />
                {activeParty && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-lg"
                  >
                    تغيير
                  </button>
                )}
              </div>

              {/* Suggestions dropdown */}
              {suggestions.length > 0 && !activeParty && (
                <div className="mt-1 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl shadow-lg overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-700 z-10">
                  {suggestions.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectSuggestion(p)}
                      className="p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-bold text-zinc-900 dark:text-white block">{p.name}</span>
                        <span className="text-[11px] text-zinc-500 font-mono">{p.phone} • {p.code}</span>
                      </div>
                      <Badge variant="default" size="sm">
                        {p.profileType === 'shop' ? 'محل' : p.profileType === 'partner' ? 'شريك' : 'عميل'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Party Summary Card */}
            {activeParty && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-zinc-900 dark:text-white block">
                        {activeParty.name}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">
                        {activeParty.code} • {activeParty.phone}
                      </span>
                    </div>
                  </div>

                  <div className="text-left font-mono">
                    <span className="text-[10px] text-zinc-400 block font-sans">إجمالي الأرصدة المتاحة بالسحب</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalAvailableBalance)}
                    </span>
                  </div>
                </div>

                {/* Wallets Preview Chips */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-500/20 text-center">
                  <div className="p-2 rounded-lg bg-white/60 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                    <span className="text-[10px] text-zinc-500 block">المحفظة الأساسية</span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono">
                      {formatCurrency(mainWalletBalance)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white/60 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                    <span className="text-[10px] text-zinc-500 block">محفظة الإحالة</span>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 font-mono">
                      {formatCurrency(referralWalletBalance)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white/60 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                    <span className="text-[10px] text-zinc-500 block">محفظة الكاش باك</span>
                    <span className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 font-mono">
                      {formatCurrency(cashbackWalletBalance)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recipient Phone (الرقم المستقبل) */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                الرقم المستقبل للمبلغ (اختياري - في حال التحويل لمحفظة إلكترونية أخرى):
              </label>
              <Input
                placeholder="مثال: 010xxxxxxxx أو رقم الحساب"
                value={recipientPhone}
                onChange={e => setRecipientPhone(e.target.value)}
              />
              <span className="text-[11px] text-zinc-400 block mt-1">
                لو تركته فارغاً سيتم اعتبار رقم هاتف الحساب هو الرقم المستقبل.
              </span>
            </div>

            {/* Payment / Transfer Method */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                طريقة التسليم أو قناة التحويل:
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
              >
                <option value="كاش (نقدي من الخزنة)">كاش (تسليم نقدي مباشر من الخزنة)</option>
                <option value="فودافون كاش (Vodafone Cash)">فودافون كاش (Vodafone Cash)</option>
                <option value="انستاباي (InstaPay)">انستاباي (InstaPay)</option>
                <option value="أورنج كاش (Orange Cash)">أورنج كاش (Orange Cash)</option>
                <option value="اتصالات كاش (Etisalat Cash)">اتصالات كاش (Etisalat Cash)</option>
                <option value="تحويل بنكي مباشر">تحويل بنكي مباشر (Bank Transfer)</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            {/* Step 1 Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                إلغاء
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!canProceedToStep2}
                onClick={() => setStep(2)}
                icon={<ArrowLeft className="w-4 h-4" />}
                className="bg-amber-600 hover:bg-amber-500 font-bold"
              >
                التالي: اختيار المحافظ والمبالغ
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Wallet Selection & Amount Input */}
        {step === 2 && activeParty && (
          <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px]">الطرف المحدد:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{activeParty.name} ({activeParty.phone})</span>
              </div>
              <div className="text-left font-mono">
                <span className="text-zinc-400 block text-[10px]">الرقم المستقبل:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{recipientPhone || activeParty.phone}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              حدد المبالغ المراد سحبها من كل محفظة (يمكنك السحب من محفظة واحدة أو توزيع المبلغ على أكثر من محفظة):
            </p>

            {/* Wallet 1: Main Wallet */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              isMainExceeded
                ? 'border-rose-500 bg-rose-500/5'
                : mainAmount > 0
                ? 'border-amber-500 bg-amber-500/5'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="font-bold text-xs text-zinc-900 dark:text-white">1. المحفظة الأساسية (الرصيد الدائن)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-mono">المتاح: {formatCurrency(mainWalletBalance)}</span>
                  {mainWalletBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setMainAmount(mainWalletBalance)}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      سحب الكل
                    </button>
                  )}
                </div>
              </div>

              <Input
                type="number"
                step="0.01"
                min="0"
                max={mainWalletBalance}
                placeholder="0.00 ج.م"
                value={mainAmount || ''}
                onChange={e => setMainAmount(parseFloat(e.target.value) || 0)}
              />
              {isMainExceeded && (
                <span className="text-[11px] text-rose-500 font-bold block mt-1">
                  ⚠️ المبلغ المطلوب ({mainAmount}) يتجاوز الرصيد المتاح في المحفظة الأساسية ({mainWalletBalance})
                </span>
              )}
            </div>

            {/* Wallet 2: Referral Wallet */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              isReferralExceeded
                ? 'border-rose-500 bg-rose-500/5'
                : referralAmount > 0
                ? 'border-purple-500 bg-purple-500/5'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="font-bold text-xs text-zinc-900 dark:text-white">2. محفظة الإحالة والعمولات</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-mono">المتاح: {formatCurrency(referralWalletBalance)}</span>
                  {referralWalletBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setReferralAmount(referralWalletBalance)}
                      className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                    >
                      سحب الكل
                    </button>
                  )}
                </div>
              </div>

              <Input
                type="number"
                step="0.01"
                min="0"
                max={referralWalletBalance}
                placeholder="0.00 ج.م"
                value={referralAmount || ''}
                onChange={e => setReferralAmount(parseFloat(e.target.value) || 0)}
              />
              {isReferralExceeded && (
                <span className="text-[11px] text-rose-500 font-bold block mt-1">
                  ⚠️ المبلغ المطلوب ({referralAmount}) يتجاوز رصيد محفظة الإحالة ({referralWalletBalance})
                </span>
              )}
            </div>

            {/* Wallet 3: Cashback Wallet */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              isCashbackExceeded
                ? 'border-rose-500 bg-rose-500/5'
                : cashbackAmount > 0
                ? 'border-fuchsia-500 bg-fuchsia-500/5'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" />
                  <span className="font-bold text-xs text-zinc-900 dark:text-white">3. محفظة الكاش باك</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-mono">المتاح: {formatCurrency(cashbackWalletBalance)}</span>
                  {cashbackWalletBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setCashbackAmount(cashbackWalletBalance)}
                      className="text-[10px] font-bold text-fuchsia-600 dark:text-fuchsia-400 hover:underline cursor-pointer"
                    >
                      سحب الكل
                    </button>
                  )}
                </div>
              </div>

              <Input
                type="number"
                step="0.01"
                min="0"
                max={cashbackWalletBalance}
                placeholder="0.00 ج.م"
                value={cashbackAmount || ''}
                onChange={e => setCashbackAmount(parseFloat(e.target.value) || 0)}
              />
              {isCashbackExceeded && (
                <span className="text-[11px] text-rose-500 font-bold block mt-1">
                  ⚠️ المبلغ المطلوب ({cashbackAmount}) يتجاوز رصيد محفظة الكاش باك ({cashbackWalletBalance})
                </span>
              )}
            </div>

            {/* Total Calculation & Validation Banner */}
            <div className="p-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 block">الإجمالي المطلوب سحبه:</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  {formatCurrency(totalWithdrawalAmount)}
                </span>
              </div>
              <div className="text-left text-xs">
                <span className="text-zinc-400 block text-[11px]">طريقة التنفيذ:</span>
                <span className="font-bold text-zinc-200">{paymentMethod}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                ملاحظات العملية (اختياري):
              </label>
              <Input
                placeholder="مثال: سحب رصيد فائض كاش، تحويل فودافون كاش..."
                value={withdrawalNotes}
                onChange={e => setWithdrawalNotes(e.target.value)}
              />
            </div>

            {/* Step 2 Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => setStep(1)}
              >
                رجوع للخطوة 1
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!canConfirmWithdrawal}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-md shadow-emerald-600/20"
              >
                تأكيد وتنفيذ السحب فورياً
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
