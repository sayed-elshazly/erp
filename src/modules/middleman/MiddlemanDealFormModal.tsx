// =============================================================
// NZM JKR TOP UP ERP — Create / Edit Middleman Deal Modal
// =============================================================

import React, { useState, useMemo } from 'react';
import { MiddlemanDeal, MiddlemanDealType, CommissionType, DealCurrency } from '../../types/middleman.types';
import { Customer } from '../../types/customer.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { CustomerFormModal } from '../customers/CustomerFormModal';
import {
  ShieldCheck,
  Lock,
  User,
  UserPlus,
  DollarSign,
  Percent,
  Calculator,
  Save,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Gamepad2,
  HelpCircle,
  X
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface MiddlemanDealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deal: MiddlemanDeal) => void;
  existingDeal?: MiddlemanDeal | null;
}

export const MiddlemanDealFormModal: React.FC<MiddlemanDealFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingDeal
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const settings = db.getMiddlemanModuleSettings();
  const allCustomers = db.getMiddlemanClients();

  // Completed deal lock permissions
  const isCompleted = existingDeal?.status === 'completed';
  const isManagerOrAdmin = user?.role === 'admin';
  const isReadOnly = isCompleted && !isManagerOrAdmin;

  // Active (non-frozen, non-suspended) customers only
  const activeCustomers = useMemo(() => {
    return allCustomers.filter(c => !c.isFrozen && c.status !== 'frozen' && c.status !== 'suspended');
  }, [allCustomers]);

  // Quick Add Customer State
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickTargetField, setQuickTargetField] = useState<'seller' | 'buyer' | 'middleman'>('seller');

  // Form State
  const [title, setTitle] = useState(existingDeal?.title || '');
  const [description, setDescription] = useState(existingDeal?.description || '');
  const [dealType, setDealType] = useState<MiddlemanDealType>(existingDeal?.dealType || 'account_sale');
  const [customDealType, setCustomDealType] = useState(existingDeal?.customDealTypeLabel || '');
  // Distinct Games strictly from Middleman Accounts and Deals
  const availableMiddlemanGames = useMemo(() => {
    const raw = new Set<string>();
    db.getMiddlemanAccounts().forEach(a => { if (a.gameName?.trim()) raw.add(a.gameName.trim()); });
    db.getMiddlemanDeals(true).forEach(d => { if (d.gameName?.trim()) raw.add(d.gameName.trim()); });
    ['PUBG Mobile', 'Free Fire', 'Valorant', 'EA FC 25', 'Roblox', 'League of Legends', 'GTA V'].forEach(g => raw.add(g));
    return Array.from(raw);
  }, []);

  const [gameName, setGameName] = useState(existingDeal?.gameName || availableMiddlemanGames[0] || 'PUBG Mobile');

  // Seller State
  const [sellerSearch, setSellerSearch] = useState(existingDeal ? `${existingDeal.sellerName} (${existingDeal.sellerPhone})` : '');
  const [selectedSeller, setSelectedSeller] = useState<Customer | null>(() => {
    if (existingDeal) {
      return allCustomers.find(c => c.id === existingDeal.sellerId) || null;
    }
    return null;
  });

  // Buyer State
  const [buyerSearch, setBuyerSearch] = useState(existingDeal ? `${existingDeal.buyerName} (${existingDeal.buyerPhone})` : '');
  const [selectedBuyer, setSelectedBuyer] = useState<Customer | null>(() => {
    if (existingDeal) {
      return allCustomers.find(c => c.id === existingDeal.buyerId) || null;
    }
    return null;
  });

  // Financials State
  const [dealAmount, setDealAmount] = useState<number>(existingDeal?.dealAmount || 1000);
  const [currency, setCurrency] = useState<DealCurrency>(existingDeal?.currency || 'EGP');
  const [exchangeRate, setExchangeRate] = useState<number>(
    existingDeal?.exchangeRateToEGP || (currency === 'EGP' ? 1 : 39.25)
  );

  // Company Commission
  const [companyCommissionType, setCompanyCommissionType] = useState<CommissionType>(
    existingDeal?.companyCommissionType || settings.defaultCompanyCommissionType || 'percentage'
  );
  const [companyCommissionValue, setCompanyCommissionValue] = useState<number>(
    existingDeal?.companyCommissionValue ?? settings.defaultCompanyCommissionPercent ?? 5
  );

  // External Middleman
  const [hasExternalMiddleman, setHasExternalMiddleman] = useState<boolean>(existingDeal?.hasExternalMiddleman || false);
  const [middlemanSearch, setMiddlemanSearch] = useState(
    existingDeal?.externalMiddlemanName ? `${existingDeal.externalMiddlemanName} (${existingDeal.externalMiddlemanPhone})` : ''
  );
  const [selectedExternalMiddleman, setSelectedExternalMiddleman] = useState<Customer | null>(() => {
    if (existingDeal?.externalMiddlemanId) {
      return allCustomers.find(c => c.id === existingDeal.externalMiddlemanId) || null;
    }
    return null;
  });
  const [externalCommissionType, setExternalCommissionType] = useState<CommissionType>(
    existingDeal?.externalMiddlemanCommissionType || 'percentage'
  );
  const [externalCommissionValue, setExternalCommissionValue] = useState<number>(
    existingDeal?.externalMiddlemanCommissionValue ?? settings.defaultExternalMiddlemanCommissionPercent ?? 2
  );

  const [initialNote, setInitialNote] = useState('');

  // Auto-calculated Financials
  const financialCalculations = useMemo(() => {
    const rate = currency === 'EGP' ? 1 : exchangeRate || 39.25;
    const dealAmountEGP = dealAmount * rate;

    // Company Commission Calculation
    let companyCommissionAmountEGP = 0;
    if (companyCommissionType === 'percentage') {
      companyCommissionAmountEGP = Math.round((dealAmountEGP * (companyCommissionValue / 100)) * 100) / 100;
    } else {
      companyCommissionAmountEGP = companyCommissionValue * rate;
    }

    // External Middleman Commission Calculation
    let externalCommissionAmountEGP = 0;
    if (hasExternalMiddleman) {
      if (externalCommissionType === 'percentage') {
        externalCommissionAmountEGP = Math.round((dealAmountEGP * (externalCommissionValue / 100)) * 100) / 100;
      } else {
        externalCommissionAmountEGP = externalCommissionValue * rate;
      }
    }

    // Strict Rule: External Middleman Commission is deducted from Company Commission only
    const netCompanyProfitEGP = Math.round((companyCommissionAmountEGP - externalCommissionAmountEGP) * 100) / 100;
    const totalRequiredFromBuyerEGP = Math.round((dealAmountEGP + companyCommissionAmountEGP) * 100) / 100;
    const isExternalExceeding = hasExternalMiddleman && externalCommissionAmountEGP > companyCommissionAmountEGP;

    return {
      dealAmountEGP,
      companyCommissionAmountEGP,
      externalCommissionAmountEGP,
      netCompanyProfitEGP,
      totalRequiredFromBuyerEGP,
      isExternalExceeding
    };
  }, [
    dealAmount,
    currency,
    exchangeRate,
    companyCommissionType,
    companyCommissionValue,
    hasExternalMiddleman,
    externalCommissionType,
    externalCommissionValue
  ]);

  // Customer Autocomplete Suggestions (Only Active Customers)
  const matchingSellers = useMemo(() => {
    if (!sellerSearch || (selectedSeller && sellerSearch.includes(selectedSeller.name))) return [];
    const q = sellerSearch.toLowerCase().trim();
    return activeCustomers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 5);
  }, [activeCustomers, sellerSearch, selectedSeller]);

  const matchingBuyers = useMemo(() => {
    if (!buyerSearch || (selectedBuyer && buyerSearch.includes(selectedBuyer.name))) return [];
    const q = buyerSearch.toLowerCase().trim();
    return activeCustomers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 5);
  }, [activeCustomers, buyerSearch, selectedBuyer]);

  const matchingMiddlemen = useMemo(() => {
    if (!middlemanSearch || (selectedExternalMiddleman && middlemanSearch.includes(selectedExternalMiddleman.name))) return [];
    const q = middlemanSearch.toLowerCase().trim();
    return activeCustomers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 5);
  }, [activeCustomers, middlemanSearch, selectedExternalMiddleman]);

  // Handle Quick Add Customer Success
  const handleQuickCustomerSave = (custData: Partial<Customer>) => {
    const newCust = {
      ...custData,
      id: `brk_cust_${Date.now()}`,
      code: `BRK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Customer;
    db.saveMiddlemanClient(newCust, { id: user?.id, name: user?.fullName, role: user?.role });

    if (quickTargetField === 'seller') {
      setSelectedSeller(newCust);
      setSellerSearch(`${newCust.name} (${newCust.phone})`);
    } else if (quickTargetField === 'buyer') {
      setSelectedBuyer(newCust);
      setBuyerSearch(`${newCust.name} (${newCust.phone})`);
    } else if (quickTargetField === 'middleman') {
      setSelectedExternalMiddleman(newCust);
      setMiddlemanSearch(`${newCust.name} (${newCust.phone})`);
    }
    setIsQuickCustomerOpen(false);
    showToast('success', 'تم تسجيل العميل', `تم ربط العميل "${newCust.name}" بالوساطة بنجاح`);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      showToast('error', 'غير متاح', 'هذه الوساطة مكتملة ومغلقة ولا يمكن تعديلها من قبل الموظفين.');
      return;
    }

    if (!selectedSeller) {
      showToast('error', 'البائع مطلوب', 'يرجى تحديد البائع من قائمة العملاء أو إضافة عميل جديد');
      return;
    }
    if (!selectedBuyer) {
      showToast('error', 'المشتري مطلوب', 'يرجى تحديد المشتري من قائمة العملاء أو إضافة عميل جديد');
      return;
    }

    // Freeze check
    if (selectedSeller.isFrozen || selectedSeller.status === 'frozen' || selectedSeller.status === 'suspended') {
      showToast('error', 'حساب مجمد', `حساب البائع (${selectedSeller.name}) مجمد أو معلق في النظام ولا يمكن التعامل معه.`);
      return;
    }
    if (selectedBuyer.isFrozen || selectedBuyer.status === 'frozen' || selectedBuyer.status === 'suspended') {
      showToast('error', 'حساب مجمد', `حساب المشتري (${selectedBuyer.name}) مجمد أو معلق في النظام ولا يمكن التعامل معه.`);
      return;
    }
    if (selectedExternalMiddleman && (selectedExternalMiddleman.isFrozen || selectedExternalMiddleman.status === 'frozen' || selectedExternalMiddleman.status === 'suspended')) {
      showToast('error', 'حساب مجمد', `حساب الوسيط الخارجي (${selectedExternalMiddleman.name}) مجمد أو معلق في النظام.`);
      return;
    }
    if (selectedSeller.id === selectedBuyer.id) {
      showToast('error', 'تكرار الطرفين', 'لا يمكن أن يكون البائع والمشتري نفس الشخص');
      return;
    }
    if (!title.trim()) {
      showToast('error', 'العنوان مطلوب', 'يرجى كتابة عنوان مختصر لصفقة الوساطة');
      return;
    }
    if (dealAmount <= 0) {
      showToast('error', 'المبلغ غير صحيح', 'قيمة الصفقة يجب أن تكون أكبر من الصفر');
      return;
    }
    if (financialCalculations.isExternalExceeding) {
      showToast(
        'error',
        'خطأ في عمولة الوسيط',
        'لا يمكن أن تتجاوز عمولة الوسيط الخارجي عمولة الشركة، يرجى تعديل النسب'
      );
      return;
    }

    const dealNumber = existingDeal?.dealNumber || `MID-${Math.floor(1000 + Math.random() * 9000)}`;

    const newDeal: MiddlemanDeal = {
      id: existingDeal?.id || 'deal_' + Date.now(),
      dealNumber,
      title: title.trim(),
      description: description.trim(),
      dealType,
      customDealTypeLabel: dealType === 'other' ? customDealType.trim() : undefined,
      gameName,

      sellerId: selectedSeller.id,
      sellerName: selectedSeller.name,
      sellerPhone: selectedSeller.phone,

      buyerId: selectedBuyer.id,
      buyerName: selectedBuyer.name,
      buyerPhone: selectedBuyer.phone,

      dealAmount,
      currency,
      exchangeRateToEGP: currency === 'EGP' ? 1 : exchangeRate,
      dealAmountEGP: financialCalculations.dealAmountEGP,

      companyCommissionType,
      companyCommissionValue,
      companyCommissionAmountEGP: financialCalculations.companyCommissionAmountEGP,

      hasExternalMiddleman,
      externalMiddlemanId: hasExternalMiddleman ? selectedExternalMiddleman?.id : undefined,
      externalMiddlemanName: hasExternalMiddleman ? selectedExternalMiddleman?.name || middlemanSearch : undefined,
      externalMiddlemanPhone: hasExternalMiddleman ? selectedExternalMiddleman?.phone : undefined,
      externalMiddlemanCommissionType: hasExternalMiddleman ? externalCommissionType : undefined,
      externalMiddlemanCommissionValue: hasExternalMiddleman ? externalCommissionValue : undefined,
      externalMiddlemanCommissionAmountEGP: hasExternalMiddleman ? financialCalculations.externalCommissionAmountEGP : undefined,
      isExternalMiddlemanPaid: existingDeal?.isExternalMiddlemanPaid || false,

      totalRequiredFromBuyerEGP: financialCalculations.totalRequiredFromBuyerEGP,
      sellerPayoutAmountEGP: financialCalculations.dealAmountEGP,
      netCompanyProfitEGP: financialCalculations.netCompanyProfitEGP,

      status: existingDeal?.status || 'new',
      statusHistory: existingDeal?.statusHistory || [
        {
          id: 'msh_' + Date.now(),
          status: 'new',
          statusLabelArabic: 'جديدة',
          userName: user?.fullName || 'المدير العام',
          userRole: user?.role || 'admin',
          timestamp: new Date().toISOString(),
          notes: initialNote || 'تم إنشاء صفقة الوساطة'
        }
      ],
      attachments: existingDeal?.attachments || [],
      internalNotes: initialNote
        ? [
            ...(existingDeal?.internalNotes || []),
            {
              id: 'mnote_' + Date.now(),
              authorName: user?.fullName || 'المدير العام',
              authorRole: user?.role || 'admin',
              content: initialNote,
              createdAt: new Date().toISOString()
            }
          ]
        : existingDeal?.internalNotes || [],

      createdBy: existingDeal?.createdBy || user?.fullName || 'المدير العام',
      assignedTo: existingDeal?.assignedTo || user?.fullName,
      createdAt: existingDeal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = db.saveMiddlemanDeal(newDeal, { id: user?.id, name: user?.fullName, role: user?.role });

    showToast('success', 'تم حفظ الصفقة', `تم حفظ وساطة #${saved.dealNumber} بنجاح`);
    onSuccess(saved);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={existingDeal ? `تعديل صفقة الوساطة #${existingDeal.dealNumber}` : 'إنشاء صفقة وساطة وضمان جديدة (New Escrow Deal)'}
        maxWidth="2xl"
      >
        {isReadOnly && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 shrink-0" />
            <span>⚠️ هذه الوساطة مكتملة ومؤمنة (للقراءة فقط للموظفين). تعديل الصفقات المكتملة متاح لمدير النظام فقط (Manager / Admin).</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`space-y-4 text-right text-xs ${isReadOnly ? 'pointer-events-none opacity-85 select-none' : ''}`} dir="rtl">
          {/* 1. Basic Info Card */}
          <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#27272A] font-bold text-zinc-900 dark:text-zinc-100">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>١. بيانات العملية ونوع الوساطة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="عنوان الصفقة *"
                  placeholder="مثال: وساطة بيع حساب ببجي لفل 70 مع إمفور ثلجي"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">نوع الوساطة:</label>
                <select
                  value={dealType}
                  onChange={e => setDealType(e.target.value as any)}
                  className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#2E2E2E] rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="account_sale">بيع حساب</option>
                  <option value="account_purchase">شراء حساب</option>
                  <option value="currency_sale">بيع عملات / كوينز</option>
                  <option value="currency_purchase">شراء عملات</option>
                  <option value="script_sale">بيع سكربت برمجي</option>
                  <option value="digital_product">بيع منتج رقمي</option>
                  <option value="service">بيع خدمة</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">🎮 اللعبة / المنصة المرتبطة (مخزن الوساطة فقط):</label>
                <SearchableSelect
                  allowAll={false}
                  required
                  value={gameName}
                  placeholder="اختر أو ابحث عن لعبة الحساب..."
                  searchPlaceholder="ابحث في ألعاب مخزن الوساطة..."
                  options={[
                    ...availableMiddlemanGames.map(g => ({
                      value: g,
                      label: g,
                      icon: <Gamepad2 className="w-3.5 h-3.5 text-amber-500" />
                    })),
                    { value: 'أخرى / منصة عامة', label: 'أخرى / منصة عامة', badge: 'عام' }
                  ]}
                  onChange={setGameName}
                />
              </div>

              {dealType === 'other' && (
                <div>
                  <Input
                    label="اكتب نوع الوساطة المخصص *"
                    value={customDealType}
                    onChange={e => setCustomDealType(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="sm:col-span-3">
                <Input
                  label="شروط وتفاصيل الاتفاق (الوصف)"
                  placeholder="اكتب تفاصيل الروابط، وسائل الأمان، والاتفاق بين الطرفين..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* 2. Parties Linkage Card (Seller & Buyer) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Seller Selector */}
            <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] relative">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                  <User className="w-4 h-4 text-emerald-500" />
                  <span>طرف أول (البائع) *</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuickTargetField('seller');
                    setIsQuickCustomerOpen(true);
                  }}
                  className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3 h-3" /> عميل جديد
                </button>
              </div>

              <div className="relative">
                <Input
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  value={sellerSearch}
                  onChange={e => {
                    setSellerSearch(e.target.value);
                    if (selectedSeller) setSelectedSeller(null);
                  }}
                  icon={<Search className="w-3.5 h-3.5 text-zinc-400" />}
                />

                {matchingSellers.length > 0 && (
                  <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-gray-100 dark:divide-[#27272A]">
                    {matchingSellers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedSeller(c);
                          setSellerSearch(`${c.name} (${c.phone})`);
                        }}
                        className="p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{c.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{c.phone}</span>
                        </div>
                        <Badge variant="success" size="sm">اختيار</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedSeller && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">✓ تم تحديد البائع: {selectedSeller.name}</span>
                  <span className="font-mono text-zinc-400">{selectedSeller.phone}</span>
                </div>
              )}
            </Card>

            {/* Buyer Selector */}
            <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] relative">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                  <User className="w-4 h-4 text-blue-500" />
                  <span>طرف ثانٍ (المشتري) *</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuickTargetField('buyer');
                    setIsQuickCustomerOpen(true);
                  }}
                  className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3 h-3" /> عميل جديد
                </button>
              </div>

              <div className="relative">
                <Input
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  value={buyerSearch}
                  onChange={e => {
                    setBuyerSearch(e.target.value);
                    if (selectedBuyer) setSelectedBuyer(null);
                  }}
                  icon={<Search className="w-3.5 h-3.5 text-zinc-400" />}
                />

                {matchingBuyers.length > 0 && (
                  <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-gray-100 dark:divide-[#27272A]">
                    {matchingBuyers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedBuyer(c);
                          setBuyerSearch(`${c.name} (${c.phone})`);
                        }}
                        className="p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{c.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{c.phone}</span>
                        </div>
                        <Badge variant="info" size="sm">اختيار</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedBuyer && (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-blue-600 dark:text-blue-400">✓ تم تحديد المشتري: {selectedBuyer.name}</span>
                  <span className="font-mono text-zinc-400">{selectedBuyer.phone}</span>
                </div>
              )}
            </Card>
          </div>

          {/* 3. Financials & Commission Engine */}
          <Card className="p-4 space-y-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-500" /> ٣. القيمة المالية وعمولات الوساطة
              </span>
              <Badge variant="warning" size="sm">حساب فوري</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Input
                  label="قيمة الصفقة الأساسية *"
                  type="number"
                  step="any"
                  value={dealAmount}
                  onChange={e => setDealAmount(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">العملة:</label>
                <select
                  value={currency}
                  onChange={e => {
                    const c = e.target.value as DealCurrency;
                    setCurrency(c);
                    if (c === 'EGP') setExchangeRate(1);
                  }}
                  className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#2E2E2E] rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="EGP">🇪🇬 جنيه مصري (EGP)</option>
                  <option value="USD">🇺🇸 دولار أمريكي (USD)</option>
                  <option value="USDT">🪙 دولار رقمي (USDT)</option>
                </select>
              </div>

              {currency !== 'EGP' && (
                <div>
                  <Input
                    label="سعر الصرف للجنيه *"
                    type="number"
                    step="any"
                    value={exchangeRate}
                    onChange={e => setExchangeRate(parseFloat(e.target.value) || 1)}
                    required
                  />
                </div>
              )}
            </div>

            {/* Company Commission Config */}
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2.5">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 block">عمولة الشركة:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-4 text-xs font-bold">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="comp_comm_type"
                      checked={companyCommissionType === 'percentage'}
                      onChange={() => setCompanyCommissionType('percentage')}
                      className="text-amber-500"
                    />
                    <span>نسبة مئوية (%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="comp_comm_type"
                      checked={companyCommissionType === 'fixed'}
                      onChange={() => setCompanyCommissionType('fixed')}
                      className="text-amber-500"
                    />
                    <span>مبلغ ثابت ({currency})</span>
                  </label>
                </div>

                <div>
                  <Input
                    label={companyCommissionType === 'percentage' ? 'نسبة العمولة (%)' : `المبلغ الثابت (${currency})`}
                    type="number"
                    step="any"
                    value={companyCommissionValue}
                    onChange={e => setCompanyCommissionValue(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* External Middleman Toggle */}
            <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
              <label className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasExternalMiddleman}
                  onChange={e => setHasExternalMiddleman(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <span>يوجد وسيط خارجي مشارك في العملية (External Middleman)</span>
              </label>

              {hasExternalMiddleman && (
                <div className="space-y-3 pt-2 border-t border-amber-500/20">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-zinc-700 dark:text-zinc-300">اسم الوسيط الخارجي *</label>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickTargetField('middleman');
                            setIsQuickCustomerOpen(true);
                          }}
                          className="text-[10px] text-amber-600 font-bold hover:underline"
                        >
                          + إضافة عميل
                        </button>
                      </div>
                      <Input
                        placeholder="ابحث بالاسم أو الهاتف..."
                        value={middlemanSearch}
                        onChange={e => {
                          setMiddlemanSearch(e.target.value);
                          if (selectedExternalMiddleman) setSelectedExternalMiddleman(null);
                        }}
                      />

                      {matchingMiddlemen.length > 0 && (
                        <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-gray-100 dark:divide-[#27272A]">
                          {matchingMiddlemen.map(c => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedExternalMiddleman(c);
                                setMiddlemanSearch(`${c.name} (${c.phone})`);
                              }}
                              className="p-2 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{c.name}</span>
                                <span className="text-[10px] text-zinc-400 font-mono">{c.phone}</span>
                              </div>
                              <Badge variant="warning" size="sm">اختيار</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">طريقة عمولته:</label>
                      <div className="flex items-center gap-3 pt-2">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="ext_comm_type"
                            checked={externalCommissionType === 'percentage'}
                            onChange={() => setExternalCommissionType('percentage')}
                          />
                          <span>نسبة %</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="ext_comm_type"
                            checked={externalCommissionType === 'fixed'}
                            onChange={() => setExternalCommissionType('fixed')}
                          />
                          <span>مبلغ ثابت</span>
                        </label>
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <Input
                        label={externalCommissionType === 'percentage' ? 'نسبة عمولة الوسيط الخارجي (%)' : `المبلغ الثابت (${currency})`}
                        type="number"
                        step="any"
                        value={externalCommissionValue}
                        onChange={e => setExternalCommissionValue(parseFloat(e.target.value) || 0)}
                      />
                      <span className="text-[10px] text-zinc-400 mt-1 block">
                        تُخصم عمولة الوسيط الخارجي من عمولة الشركة فقط ولا تُضاف على المشتري.
                      </span>
                    </div>
                  </div>

                  {financialCalculations.isExternalExceeding && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>خطأ: عمولة الوسيط الخارجي أكبر من عمولة الشركة! لا يمكن حفظ الصفقة بخسارة.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Financial Summary Preview */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
              <div>
                <span className="text-[10px] text-zinc-400 block">إجمالي المطلوب من المشتري</span>
                <span className="text-sm font-black text-amber-400">
                  {formatCurrency(financialCalculations.totalRequiredFromBuyerEGP)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">المستحق للبائع</span>
                <span className="text-sm font-bold text-zinc-200">
                  {formatCurrency(financialCalculations.dealAmountEGP)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">عمولة الوسيط الخارجي</span>
                <span className="text-sm font-bold text-blue-400">
                  {formatCurrency(financialCalculations.externalCommissionAmountEGP)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 block font-bold">صافي ربح الشركة</span>
                <span className="text-sm font-black text-emerald-400">
                  +{formatCurrency(financialCalculations.netCompanyProfitEGP)}
                </span>
              </div>
            </div>
          </Card>

          {/* Initial Note */}
          <Card className="p-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <Input
              label="ملاحظة أولية لسجل الحالة"
              placeholder="اكتب أي شروط خاصة بالصفقة أو وسيلة التحويل المتفق عليها..."
              value={initialNote}
              onChange={e => setInitialNote(e.target.value)}
            />
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#27272A]">
            <Button variant="secondary" type="button" onClick={onClose}>
              {isReadOnly ? 'إغلاق' : 'إلغاء'}
            </Button>
            {!isReadOnly && (
              <Button
                variant="primary"
                type="submit"
                icon={<Save className="w-4 h-4" />}
                disabled={financialCalculations.isExternalExceeding}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
              >
                {existingDeal ? 'حفظ تعديلات الصفقة' : 'إنشاء صفقة الوساطة'}
              </Button>
            )}
          </div>
        </form>
      </Modal>

      {/* Quick Add Customer Modal */}
      {isQuickCustomerOpen && (
        <CustomerFormModal
          isOpen={isQuickCustomerOpen}
          onClose={() => setIsQuickCustomerOpen(false)}
          onSave={handleQuickCustomerSave}
          moduleContext="middleman"
        />
      )}
    </>
  );
};
