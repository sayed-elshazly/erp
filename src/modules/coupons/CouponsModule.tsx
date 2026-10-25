import React, { useState, useEffect, useMemo } from 'react';
import { Coupon, CouponType, GameTreeItem, CouponStatus, SingleUseType, CouponUsageRecord } from '../../types/topup.types';
import { Customer } from '../../types/customer.types';
import { Dealer } from '../../types/dealer.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  Tag,
  Plus,
  Search,
  Sparkles,
  ShieldCheck,
  Percent,
  DollarSign,
  Calendar,
  Copy,
  CheckCircle2,
  Trash2,
  Users,
  Award,
  AlertCircle,
  Gift,
  Flame,
  UserCheck,
  HeartHandshake,
  Printer,
  Edit2,
  Power,
  ToggleLeft,
  ToggleRight,
  ArrowUpDown,
  Filter,
  Gamepad2,
  Globe,
  Zap,
  RotateCcw,
  History,
  Lock,
  Clock,
  Check,
  X
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';

export interface CouponsModuleProps {
  department?: 'all' | 'customers' | 'dealers';
}

export const CouponsModule: React.FC<CouponsModuleProps> = ({ department = 'all' }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isOwner = user?.role === 'admin';

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [games, setGames] = useState<GameTreeItem[]>([]);
  const [selectedTypeTab, setSelectedTypeTab] = useState<'all' | CouponType>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'used' | 'expired' | 'cancelled'>('all');
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<'all' | 'customer_specific' | 'general'>('all');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [selectedAudienceFilter, setSelectedAudienceFilter] = useState<'all' | 'customers' | 'dealers'>(department);
  const [searchQuery, setSearchQuery] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Modal State for New / Edit Coupon
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<CouponType>('seasonal');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [maxDiscountLimit, setMaxDiscountLimit] = useState<number>(50);

  // Single Use Specific
  const [singleUseType, setSingleUseType] = useState<SingleUseType>('customer_specific');
  const [singleUseCustomerSearch, setSingleUseCustomerSearch] = useState('');
  const [targetCustomerCode, setTargetCustomerCode] = useState('');

  // Usage Log Modal
  const [isUsageLogModalOpen, setIsUsageLogModalOpen] = useState(false);
  const [selectedCouponForLog, setSelectedCouponForLog] = useState<Coupon | null>(null);

  // Universal Minimum and Maximum Purchase Limits
  const [minPurchaseAmount, setMinPurchaseAmount] = useState<string>('');
  const [maxPurchaseAmount, setMaxPurchaseAmount] = useState<string>('');

  // Game & Audience Restriction
  const [applicableGameId, setApplicableGameId] = useState<string>('all');
  const [targetAudience, setTargetAudience] = useState<'all' | 'customers' | 'dealers'>('all');

  // Seasonal specific
  const [allocatedQuantityBudget, setAllocatedQuantityBudget] = useState<number>(5000);
  const [maxUsageTotal, setMaxUsageTotal] = useState<number>(100);
  const [maxUsagePerCustomer, setMaxUsagePerCustomer] = useState<number>(1);
  const [expiryDate, setExpiryDate] = useState('2026-09-30');

  // Influencer specific
  const [influencerCustomerId, setInfluencerCustomerId] = useState('');
  const [influencerCommissionRate, setInfluencerCommissionRate] = useState<number>(2.5);

  // Customer specific
  const [targetCustomerId, setTargetCustomerId] = useState('');
  const [compensationReason, setCompensationReason] = useState('تعويض عن تأخير شحن تذكرة سابقة ورضا العميل');

  const loadData = () => {
    setCoupons(db.getCoupons());
    setCustomers(db.getCustomers());
    setDealers(db.getDealers());
    setGames(db.getGameTree().filter(g => g.isActive !== false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const influencersList = useMemo(() => {
    return customers.filter(c => c.profileType === 'influencer' || c.profileType === 'partner');
  }, [customers]);

  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      // Type Filter
      if (selectedTypeTab !== 'all' && c.type !== selectedTypeTab) return false;

      // Status Filter
      if (selectedStatusFilter !== 'all') {
        const isUsed = c.status === 'used' || (c.type === 'single_use' && (c.currentUsageCount || 0) >= 1);
        const isExpired = c.status === 'expired' || (c.expiryDate && new Date(c.expiryDate) < new Date());
        const isCancelled = c.status === 'cancelled' || (!c.isActive && !c.isAutoDeactivated && !isUsed);
        const isActive = (c.status === 'active' || (!c.status && c.isActive && !c.isAutoDeactivated)) && !isUsed && !isExpired && !isCancelled;

        if (selectedStatusFilter === 'active' && !isActive) return false;
        if (selectedStatusFilter === 'used' && !isUsed) return false;
        if (selectedStatusFilter === 'expired' && !isExpired) return false;
        if (selectedStatusFilter === 'cancelled' && !isCancelled) return false;
      }

      // Scope Filter (خاص بعميل / عام)
      if (selectedScopeFilter !== 'all') {
        const isCustomerSpecific =
          c.singleUseType === 'customer_specific' ||
          c.type === 'customer_specific' ||
          Boolean(c.targetCustomerId) ||
          Boolean(c.targetCustomerCode);
        if (selectedScopeFilter === 'customer_specific' && !isCustomerSpecific) return false;
        if (selectedScopeFilter === 'general' && isCustomerSpecific) return false;
      }

      // Audience Filter
      if (selectedAudienceFilter !== 'all' && c.targetAudience && c.targetAudience !== 'all' && c.targetAudience !== selectedAudienceFilter) {
        return false;
      }

      // Game Filter
      if (selectedGameFilter !== 'all') {
        if (c.applicableGameId !== selectedGameFilter) return false;
      }

      // Search Query (Code, Title, Customer Name, Phone, Code, Influencer)
      const q = (searchQuery || '').toLowerCase().trim();
      if (q) {
        const matchesCode = Boolean(c.code && c.code.toLowerCase().includes(q));
        const matchesTitle = Boolean(c.title && c.title.toLowerCase().includes(q));
        const matchesGame = Boolean(c.applicableGameName && c.applicableGameName.toLowerCase().includes(q));
        const matchesInfluencer = Boolean(c.influencerName && c.influencerName.toLowerCase().includes(q));
        const matchesCustomerName = Boolean(c.targetCustomerName && c.targetCustomerName.toLowerCase().includes(q));
        const matchesCustomerPhone = Boolean(c.targetCustomerPhone && c.targetCustomerPhone.includes(q));
        const matchesCustomerCode = Boolean(c.targetCustomerCode && c.targetCustomerCode.toLowerCase().includes(q));
        const matchesLog = Boolean(
          c.usageLog &&
            c.usageLog.some(
              u =>
                (u.customerName && u.customerName.toLowerCase().includes(q)) ||
                (u.customerPhone && u.customerPhone.includes(q)) ||
                (u.customerCode && u.customerCode.toLowerCase().includes(q)) ||
                (u.ticketNumber && u.ticketNumber.toLowerCase().includes(q))
            )
        );

        return (
          matchesCode ||
          matchesTitle ||
          matchesGame ||
          matchesInfluencer ||
          matchesCustomerName ||
          matchesCustomerPhone ||
          matchesCustomerCode ||
          matchesLog
        );
      }
      return true;
    });
  }, [coupons, selectedTypeTab, selectedStatusFilter, selectedScopeFilter, selectedAudienceFilter, selectedGameFilter, searchQuery]);

  const handleOpenAddCoupon = (defaultType: CouponType = 'single_use') => {
    setEditingCouponId(null);
    setType(defaultType);
    setTitle('');
    setCode('');
    setDiscountType('percentage');
    setDiscountValue(defaultType === 'influencer' ? 5 : 10);
    setMaxDiscountLimit(30);
    setMinPurchaseAmount('');
    setMaxPurchaseAmount('');
    setApplicableGameId('all');
    setTargetAudience(department === 'dealers' ? 'dealers' : department === 'customers' ? 'customers' : 'all');
    setSingleUseType('customer_specific');
    setSingleUseCustomerSearch('');
    setTargetCustomerCode('');
    setAllocatedQuantityBudget(5000);
    setMaxUsageTotal(defaultType === 'single_use' ? 1 : 100);
    setMaxUsagePerCustomer(1);
    setExpiryDate('2026-09-30');
    setInfluencerCustomerId(influencersList[0]?.id || '');
    setInfluencerCommissionRate(2.5);
    setTargetCustomerId(customers[0]?.id || '');
    setCompensationReason('تعويض عن تأخير شحن تذكرة سابقة ورضا العميل');
    setIsModalOpen(true);
  };

  const handleOpenEditCoupon = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setType(coupon.type);
    setTitle(coupon.title);
    setCode(coupon.code);
    setDiscountType(coupon.discountType || 'percentage');
    setDiscountValue(coupon.discountValue || 10);
    setMaxDiscountLimit(coupon.maxDiscountLimitEGP || 50);
    setMinPurchaseAmount(coupon.minPurchaseAmount !== undefined ? coupon.minPurchaseAmount.toString() : '');
    setMaxPurchaseAmount(coupon.maxPurchaseAmount !== undefined ? coupon.maxPurchaseAmount.toString() : '');
    setApplicableGameId(coupon.applicableGameId || 'all');
    setTargetAudience(coupon.targetAudience || 'all');
    setSingleUseType(coupon.singleUseType || 'customer_specific');
    setSingleUseCustomerSearch('');
    setTargetCustomerCode(coupon.targetCustomerCode || '');
    setAllocatedQuantityBudget(coupon.allocatedQuantityBudgetEGP || 5000);
    setMaxUsageTotal(coupon.maxUsageTotal || 100);
    setMaxUsagePerCustomer(coupon.maxUsagePerCustomer || 1);
    setExpiryDate(coupon.expiryDate || '2026-09-30');
    setInfluencerCustomerId(coupon.influencerCustomerId || influencersList[0]?.id || '');
    setInfluencerCommissionRate(coupon.influencerCommissionRatePercent || 2.5);
    setTargetCustomerId(coupon.targetCustomerId || customers[0]?.id || '');
    setCompensationReason(coupon.compensationReason || 'تعويض عن تأخير شحن تذكرة سابقة ورضا العميل');
    setIsModalOpen(true);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !title.trim()) {
      showToast('error', 'بيانات ناقصة', 'يرجى إدخال اسم الكوبون وكود الخصم');
      return;
    }

    // Check duplicate code
    const isDuplicate = coupons.some(c => c.id !== editingCouponId && c.code.toUpperCase() === cleanCode);
    if (isDuplicate) {
      showToast('error', 'كود مكرر', 'كود الكوبون مستخدم مسبقاً في النظام. يرجى اختيار كود فريد.');
      return;
    }

    let influencerName: string | undefined;
    let influencerPhone: string | undefined;
    if (type === 'influencer' && influencerCustomerId) {
      const inf = customers.find(c => c.id === influencerCustomerId);
      influencerName = inf?.name;
      influencerPhone = inf?.phone;
    }

    let targetCustomerName: string | undefined;
    let targetCustomerPhone: string | undefined;
    let resolvedCustomerCode = targetCustomerCode;

    if (type === 'customer_specific' || (type === 'single_use' && singleUseType === 'customer_specific')) {
      if (!targetCustomerId) {
        showToast('error', 'عميل غير محدد', 'يرجى اختيار العميل المخصص له الكوبون');
        return;
      }
      const cust = customers.find(c => c.id === targetCustomerId);
      targetCustomerName = cust?.name;
      targetCustomerPhone = cust?.phone;
      resolvedCustomerCode = cust?.code || targetCustomerCode;
    }

    const minNum = minPurchaseAmount.trim() !== '' ? parseFloat(minPurchaseAmount.trim()) : undefined;
    const maxNum = maxPurchaseAmount.trim() !== '' ? parseFloat(maxPurchaseAmount.trim()) : undefined;

    const existingCoupon = editingCouponId ? coupons.find(c => c.id === editingCouponId) : null;
    const selectedGame = games.find(g => g.id === applicableGameId);

    const payload: Coupon = {
      id: editingCouponId || 'cpn_' + Date.now(),
      code: cleanCode,
      title: title.trim(),
      type,
      discountType,
      discountValue,
      maxDiscountLimitEGP: discountType === 'percentage' ? maxDiscountLimit : undefined,
      minPurchaseAmount: minNum,
      maxPurchaseAmount: maxNum,

      // Status & Single Use
      status: existingCoupon ? existingCoupon.status || 'active' : 'active',
      singleUseType: type === 'single_use' ? singleUseType : undefined,
      targetCustomerCode: resolvedCustomerCode || undefined,
      usageLog: existingCoupon ? existingCoupon.usageLog || [] : [],
      usedAt: existingCoupon ? existingCoupon.usedAt : undefined,
      usedByCustomerName: existingCoupon ? existingCoupon.usedByCustomerName : undefined,
      usedInTicketNumber: existingCoupon ? existingCoupon.usedInTicketNumber : undefined,

      // Game & Audience Restriction
      applicableGameId: applicableGameId !== 'all' ? applicableGameId : undefined,
      applicableGameName: applicableGameId !== 'all' && selectedGame ? selectedGame.name : undefined,
      targetAudience,

      // Seasonal & Usage Limits
      allocatedQuantityBudgetEGP: type === 'seasonal' ? allocatedQuantityBudget : undefined,
      usedQuantityBudgetEGP: existingCoupon ? existingCoupon.usedQuantityBudgetEGP || 0 : 0,
      maxUsageTotal: type === 'single_use' ? 1 : type === 'seasonal' ? maxUsageTotal : type === 'customer_specific' ? 1 : 10000,
      currentUsageCount: existingCoupon ? existingCoupon.currentUsageCount || 0 : 0,
      maxUsagePerCustomer: 1,
      expiryDate: type === 'seasonal' && expiryDate ? expiryDate : undefined,

      // Influencer
      influencerCustomerId: type === 'influencer' ? influencerCustomerId : undefined,
      influencerName,
      influencerPhone,
      influencerCommissionRatePercent: type === 'influencer' ? influencerCommissionRate : undefined,
      totalReferralsGenerated: existingCoupon ? existingCoupon.totalReferralsGenerated || 0 : 0,
      influencerDiscountType: type === 'influencer' ? discountType : undefined,
      influencerDiscountValue: type === 'influencer' ? discountValue : undefined,

      // Customer specific
      targetCustomerId: (type === 'customer_specific' || (type === 'single_use' && singleUseType === 'customer_specific')) ? targetCustomerId : undefined,
      targetCustomerName,
      targetCustomerPhone,
      compensationReason: type === 'customer_specific' ? compensationReason.trim() : undefined,

      usedByPlayerGameIds: existingCoupon ? existingCoupon.usedByPlayerGameIds || [] : [],
      isActive: existingCoupon ? existingCoupon.isActive : true,
      isAutoDeactivated: false,
      createdAt: existingCoupon ? existingCoupon.createdAt : new Date().toISOString()
    };

    db.saveCoupon(payload, user);
    showToast('success', editingCouponId ? 'تم تعديل الكوبون' : 'تم حفظ الكوبون', `تم تسجيل ${payload.title} بنجاح`);
    setIsModalOpen(false);
    loadData();
  };

  const handleToggleCouponStatus = (coupon: Coupon) => {
    const updatedStatus = !coupon.isActive;
    db.saveCoupon({
      ...coupon,
      isActive: updatedStatus,
      status: updatedStatus ? 'active' : 'cancelled',
      isAutoDeactivated: false
    }, user);
    showToast('info', 'تم التحديث', `أصبح الكوبون ${coupon.code} ${updatedStatus ? 'نشطاً ومتاحاً' : 'معطلاً ومتوقفاً'}`);
    loadData();
  };

  const handleReactivateCoupon = (coupon: Coupon) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في إعادة تفعيل الكوبون (${coupon.code}) يدوياً؟`)) {
      db.reactivateCoupon(coupon.id, user);
      showToast('success', 'تمت إعادة التفعيل', `تمت إعادة تفعيل الكوبون ${coupon.code} بنجاح وأصبح نشطاً`);
      loadData();
    }
  };

  const handleDeleteCoupon = (id: string, codeStr: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الكوبون ${codeStr} نهائياً؟`)) {
      db.deleteCoupon(id, user);
      showToast('success', 'تم الحذف', 'تم حذف الكوبون بنجاح');
      loadData();
    }
  };

  const openUsageLog = (coupon: Coupon) => {
    setSelectedCouponForLog(coupon);
    setIsUsageLogModalOpen(true);
  };

  const selectedTargetCustomerObj = useMemo(() => {
    return customers.find(c => c.id === targetCustomerId);
  }, [customers, targetCustomerId]);

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs">
      {/* Top Header & Add Button */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
              محرك كوبونات الخصم (Coupons & Referral Engine)
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500 text-white font-bold">
              {coupons.length} كوبون
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            إدارة كوبونات المواسم، كوبونات المشاهير، كوبونات التعويضات، حدود الشراء الدنيا والقصوى، والتشغيل والإيقاف.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4 text-zinc-400" />}
            onClick={() => setIsReportModalOpen(true)}
          >
            تقرير الكوبونات
          </Button>

          {isOwner && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenAddCoupon('seasonal')}
            >
              إنشاء كوبون جديد
            </Button>
          )}
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3 shadow-xs">
        {/* Row 1: Types & Status Quick Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-[#27272A] pb-3">
          {/* Types Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedTypeTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer text-xs ${
                selectedTypeTab === 'all'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 bg-gray-100 dark:bg-[#141417]'
              }`}
            >
              الكل ({coupons.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeTab('single_use')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer text-xs flex items-center gap-1.5 ${
                selectedTypeTab === 'single_use'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 bg-gray-100 dark:bg-[#141417]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              استخدام مرة واحدة ({coupons.filter(c => c.type === 'single_use').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeTab('seasonal')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer text-xs flex items-center gap-1.5 ${
                selectedTypeTab === 'seasonal'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 bg-gray-100 dark:bg-[#141417]'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              المواسم ({coupons.filter(c => c.type === 'seasonal').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeTab('influencer')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer text-xs flex items-center gap-1.5 ${
                selectedTypeTab === 'influencer'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 bg-gray-100 dark:bg-[#141417]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              المشاهير ({coupons.filter(c => c.type === 'influencer').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeTab('customer_specific')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer text-xs flex items-center gap-1.5 ${
                selectedTypeTab === 'customer_specific'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 bg-gray-100 dark:bg-[#141417]'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              التعويضات ({coupons.filter(c => c.type === 'customer_specific').length})
            </button>
          </div>

          {/* Status Quick Pills */}
          <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
            <span className="text-zinc-400 font-bold ml-1">الحالة:</span>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('all')}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                selectedStatusFilter === 'all'
                  ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                  : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('active')}
              className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                selectedStatusFilter === 'active'
                  ? 'bg-emerald-500 text-white'
                  : 'text-emerald-500 hover:bg-emerald-500/10'
              }`}
            >
              🟢 غير مستخدمة (نشطة)
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('used')}
              className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                selectedStatusFilter === 'used'
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-400 hover:bg-blue-500/10'
              }`}
            >
              <Lock className="w-3 h-3" /> مستخدمة (Used)
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('expired')}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                selectedStatusFilter === 'expired'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              ⛔ منتهية
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('cancelled')}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                selectedStatusFilter === 'cancelled'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-500 hover:bg-amber-500/10'
              }`}
            >
              🚫 ملغاة
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns & Search Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Filter (خاص بعميل / عام) */}
            <select
              value={selectedScopeFilter}
              onChange={e => setSelectedScopeFilter(e.target.value as any)}
              className="rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-2.5 py-2 text-zinc-700 dark:text-zinc-300 text-xs font-bold outline-none"
            >
              <option value="all">🌐 كل النطاقات (عام وخاص)</option>
              <option value="customer_specific">👤 الكوبونات الخاصة بعميل</option>
              <option value="general">🌐 الكوبونات العامة</option>
            </select>

            {/* Game Filter */}
            <select
              value={selectedGameFilter}
              onChange={e => setSelectedGameFilter(e.target.value)}
              className="rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-2.5 py-2 text-zinc-700 dark:text-zinc-300 text-xs font-bold outline-none"
            >
              <option value="all">🎮 كل الألعاب</option>
              {games.map(g => (
                <option key={g.id} value={g.id}>🎮 {g.name}</option>
              ))}
            </select>

            {/* Audience Filter */}
            <select
              value={selectedAudienceFilter}
              onChange={e => setSelectedAudienceFilter(e.target.value as any)}
              className="rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-2.5 py-2 text-zinc-700 dark:text-zinc-300 text-xs font-bold outline-none"
            >
              <option value="all">👥 كل الأقسام</option>
              <option value="customers">👤 قسم الزبائن</option>
              <option value="dealers">🏪 قسم التجار</option>
            </select>
          </div>

          <div className="w-full sm:w-80">
            <Input
              placeholder="بحث بكود الكوبون، الاسم، العميل، الهاتف، كود العميل..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-zinc-400" />}
            />
          </div>
        </div>
      </div>

      {/* Coupons Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCoupons.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-400 bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-[#27272A]">
            لا توجد كوبونات مسجلة مطابقة لمعايير الفلترة المحددة
          </div>
        ) : (
          filteredCoupons.map(c => {
            const isUsed = c.status === 'used' || (c.type === 'single_use' && (c.currentUsageCount || 0) >= 1);
            const isExpired = c.status === 'expired' || (c.expiryDate && new Date(c.expiryDate) < new Date());
            const isCancelled = c.status === 'cancelled' || (!c.isActive && !c.isAutoDeactivated && !isUsed);
            const isInactive = !c.isActive || c.isAutoDeactivated || isUsed || isExpired || isCancelled;

            return (
              <Card
                key={c.id}
                className={`p-4 space-y-3 relative overflow-hidden transition-all ${
                  isUsed
                    ? 'border-blue-500/30 bg-blue-500/[0.03] dark:bg-blue-950/10'
                    : isExpired
                    ? 'border-rose-500/30 bg-rose-500/[0.03] dark:bg-rose-950/10'
                    : isCancelled
                    ? 'border-amber-500/30 bg-amber-500/[0.03] dark:bg-amber-950/10'
                    : 'bg-white dark:bg-[#18181B] hover:border-orange-500/40'
                }`}
              >
                {/* Header Type Badge & Status */}
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant={
                        c.type === 'single_use'
                          ? 'orange'
                          : c.type === 'seasonal'
                          ? 'orange'
                          : c.type === 'influencer'
                          ? 'info'
                          : 'purple'
                      }
                      size="sm"
                    >
                      {c.type === 'single_use' ? (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>استخدام مرة واحدة ({c.singleUseType === 'customer_specific' ? 'خاص' : 'عام'})</span>
                        </span>
                      ) : c.type === 'seasonal' ? (
                        '🔥 كوبون مواسم'
                      ) : c.type === 'influencer' ? (
                        '⭐ كوبون مشاهير'
                      ) : (
                        '🎁 كوبون خاص بعميل'
                      )}
                    </Badge>

                    {/* Status Badge */}
                    {isUsed ? (
                      <Badge variant="default" size="sm" className="bg-blue-500/15 text-blue-500 border border-blue-500/30 font-bold">
                        <Lock className="w-3 h-3 inline ml-1" /> مستخدم
                      </Badge>
                    ) : isExpired ? (
                      <Badge variant="danger" size="sm">
                        ⛔ منتهي
                      </Badge>
                    ) : isCancelled ? (
                      <Badge variant="warning" size="sm">
                        🚫 ملغي
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        🟢 نشط
                      </Badge>
                    )}
                  </div>

                  {/* Enable / Disable Toggle Badge */}
                  {!isUsed && !isExpired && (
                    <button
                      type="button"
                      onClick={() => handleToggleCouponStatus(c)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        c.isActive && !c.isAutoDeactivated
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-500'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-emerald-500/10 hover:text-emerald-500'
                      }`}
                      title="انقر لتشغيل / إيقاف الكوبون"
                    >
                      <Power className="w-3 h-3" />
                      <span>{c.isActive ? 'مفعّل' : 'معطّل'}</span>
                    </button>
                  )}
                </div>

                {/* Coupon Code Box */}
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block">كود الخصم:</span>
                    <strong className={`font-mono text-sm tracking-wider font-black ${isUsed ? 'line-through text-zinc-400' : 'text-orange-500'}`}>
                      {c.code}
                    </strong>
                  </div>
                  <button
                    onClick={() => copyToClipboard(c.code, `كود الكوبون (${c.code})`, showToast)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors cursor-pointer"
                    title="نسخ الكود"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                {/* Title & Discount Details */}
                <div>
                  <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{c.title}</h3>
                  <p className="text-[11px] text-emerald-500 font-bold mt-0.5">
                    الخصم: {c.discountType === 'percentage' ? `${c.discountValue}% (حد أقصى ${c.maxDiscountLimitEGP || 50} ج)` : `${c.discountValue} ج.م مباشر`}
                  </p>
                </div>

                {/* Game Lock & Audience Badges */}
                <div className="space-y-1.5">
                  {c.applicableGameId && c.applicableGameId !== 'all' ? (
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400">
                        <Gamepad2 className="w-4 h-4 text-purple-500" />
                        <span>خاص بلعبة: {c.applicableGameName || games.find(g => g.id === c.applicableGameId)?.name || 'لعبة محددة'}</span>
                      </span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-md font-mono font-bold">
                        🔒 حصري
                      </span>
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-gray-100/70 dark:bg-zinc-800/40 text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-zinc-400" />
                        <span>صالح لجميع الألعاب والخدمات</span>
                      </span>
                    </div>
                  )}

                  {c.targetAudience && c.targetAudience !== 'all' && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <span>{c.targetAudience === 'dealers' ? '🏪 مخصص لقطاع التجار فقط' : '👤 مخصص لزبائن التجزئة فقط'}</span>
                    </div>
                  )}
                </div>

                {/* Min & Max Purchase Conditions Banner */}
                {(c.minPurchaseAmount || c.maxPurchaseAmount) && (
                  <div className="p-2 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between text-[10px] font-mono text-blue-400 font-bold">
                    {c.minPurchaseAmount ? (
                      <span>الحد الأدنى: {formatCurrency(c.minPurchaseAmount)}</span>
                    ) : (
                      <span>بدون حد أدنى</span>
                    )}
                    {c.maxPurchaseAmount ? (
                      <span>الحد الأقصى: {formatCurrency(c.maxPurchaseAmount)}</span>
                    ) : (
                      <span>بدون سقف</span>
                    )}
                  </div>
                )}

                {/* Type: Single Use Details */}
                {c.type === 'single_use' && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>نوع الكوبون:</span>
                      </span>
                      <span>{c.singleUseType === 'customer_specific' ? '👤 خاص بعميل محدد' : '🌐 عام (أول شخص)'}</span>
                    </div>

                    {c.singleUseType === 'customer_specific' && (
                      <div className="bg-white/60 dark:bg-zinc-900/60 p-2 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-[10px]">العميل المستهدف:</span>
                          <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{c.targetCustomerName || 'محدد'}</strong>
                        </div>
                        {c.targetCustomerCode && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 text-[10px]">كود العميل:</span>
                            <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{c.targetCustomerCode}</span>
                          </div>
                        )}
                        {c.targetCustomerPhone && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 text-[10px]">رقم الهاتف:</span>
                            <span className="font-mono text-zinc-600 dark:text-zinc-300">{c.targetCustomerPhone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* If Used - Show Usage Snapshot */}
                    {isUsed && (
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-300 space-y-1 text-[10px]">
                        <div className="flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>تم الاستخدام بالتذكرة: {c.usedInTicketNumber || c.usageLog?.[0]?.ticketNumber || 'مسجلة'}</span>
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400">
                          المستفيد: {c.usedByCustomerName || c.usageLog?.[0]?.customerName || 'العميل'} | في {c.usageLog?.[0]?.usageDate || ''} {c.usageLog?.[0]?.usageTime || ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Type 1: Seasonal Details */}
                {c.type === 'seasonal' && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between text-amber-500 font-bold">
                      <span>الاستخدامات:</span>
                      <span>{c.currentUsageCount || 0} / {c.maxUsageTotal} مرة</span>
                    </div>

                    {c.allocatedQuantityBudgetEGP && (
                      <div className="flex items-center justify-between text-amber-500 font-bold">
                        <span>الميزانية المستهلكة:</span>
                        <span>{c.usedQuantityBudgetEGP || 0} / {c.allocatedQuantityBudgetEGP} ج</span>
                      </div>
                    )}

                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-orange-500 h-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round(((c.currentUsageCount || 0) / (c.maxUsageTotal || 1)) * 100))}%`
                        }}
                      />
                    </div>

                    {c.expiryDate && (
                      <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                        <span>تاريخ الانتهاء:</span>
                        <span>{formatDate(c.expiryDate)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Type 2: Influencer Details */}
                {c.type === 'influencer' && (
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-blue-400 font-bold">
                      <span>المشهور المعتمد:</span>
                      <strong className="text-zinc-200">{c.influencerName || 'مشهور معتمد'}</strong>
                    </div>
                    {c.influencerPhone && (
                      <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                        <span>هاتف المشهور:</span>
                        <span className="font-mono">{c.influencerPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-blue-400 font-bold">
                      <span>عمولة المشهور:</span>
                      <span>{c.influencerCommissionRatePercent || 2.5}% لكل عملية</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-400 font-bold pt-1 border-t border-blue-500/20">
                      <span>👥 عملاء مسجلين من طرفه:</span>
                      <span className="font-mono text-xs">{c.totalReferralsGenerated || 0} عميل</span>
                    </div>
                  </div>
                )}

                {/* Type 3: Customer Specific Details */}
                {c.type === 'customer_specific' && (
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-purple-400 font-bold">
                      <span>خاص حصرياً بالعميل:</span>
                      <strong className="text-zinc-200">{c.targetCustomerName || 'العميل المحدد'}</strong>
                    </div>
                    {c.targetCustomerPhone && (
                      <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                        <span>هاتف العميل:</span>
                        <span className="font-mono">{c.targetCustomerPhone}</span>
                      </div>
                    )}
                    {c.compensationReason && (
                      <div className="text-zinc-400 text-[10px] pt-1 border-t border-purple-500/20">
                        <strong className="text-purple-300">سبب التعويض:</strong> {c.compensationReason}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#27272A] text-xs">
                  {/* Usage Log Button */}
                  <button
                    type="button"
                    onClick={() => openUsageLog(c)}
                    className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-500/15 hover:text-orange-500 text-zinc-500 dark:text-zinc-400 transition-colors flex items-center gap-1.5 text-[11px] font-bold cursor-pointer"
                    title="عرض سجل استخدامات وتذاكر هذا الكوبون"
                  >
                    <History className="w-3.5 h-3.5 text-zinc-400" />
                    <span>سجل الاستخدام ({c.usageLog?.length || c.currentUsageCount || 0})</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Reactivate Button for Admin when used */}
                    {isOwner && isUsed && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<RotateCcw className="w-3.5 h-3.5 text-emerald-500" />}
                        onClick={() => handleReactivateCoupon(c)}
                        title="إعادة تفعيل الكوبون يدوياً"
                        className="text-[10px] py-1 px-2 text-emerald-600 dark:text-emerald-400"
                      >
                        إعادة تفعيل
                      </Button>
                    )}

                    {isOwner && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit2 className="w-3.5 h-3.5 text-zinc-400" />}
                          onClick={() => handleOpenEditCoupon(c)}
                          title="تعديل الكوبون"
                        />
                        <button
                          onClick={() => handleDeleteCoupon(c.id, c.code)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="حذف الكوبون"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create / Edit Coupon Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCouponId ? `✏️ تعديل الكوبون (${code})` : 'إنشاء كوبون خصم جديد (Coupons Engine)'}
        subtitle="حدد نوع الكوبون، الشروط والحدود، ونسب أو مبالغ الخصم المعتمدة"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCoupon} className="space-y-4 text-right text-xs">
          {/* 4 Main Types Selector */}
          <div>
            <label className="block font-black text-zinc-900 dark:text-zinc-100 mb-1.5">
              نوع الكوبون *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setType('single_use')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                  type === 'single_use'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold ring-1 ring-amber-500'
                    : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> 1. استخدام مرة واحدة
                </div>
                <span className="text-[10px] text-zinc-500 font-normal">
                  يحترق وينتهي فور استخدامه أول مرة (خاص بعميل أو عام)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('seasonal')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                  type === 'seasonal'
                    ? 'border-orange-500 bg-orange-500/10 text-orange-500 font-bold ring-1 ring-orange-500'
                    : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Flame className="w-3.5 h-3.5" /> 2. كوبون خصم المواسم
                </div>
                <span className="text-[10px] text-zinc-500 font-normal">
                  كمية واستخدامات محددة يتوقف تلقائياً عند انتهائها
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('influencer')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                  type === 'influencer'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-bold ring-1 ring-blue-500'
                    : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Users className="w-3.5 h-3.5" /> 3. كوبون المشاهير
                </div>
                <span className="text-[10px] text-zinc-500 font-normal">
                  خصم للزبون + ربط إحالة وعمولة للمشهور
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('customer_specific')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                  type === 'customer_specific'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400 font-bold ring-1 ring-purple-500'
                    : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <HeartHandshake className="w-3.5 h-3.5" /> 4. تعويض عميل محدد
                </div>
                <span className="text-[10px] text-zinc-500 font-normal">
                  حصري لعميل بالاسم للتعويض عن مشاكل سابقة
                </span>
              </button>
            </div>
          </div>

          {/* Basic Info & Code Generation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">طريقة تعيين كود الكوبون:</span>
              <button
                type="button"
                onClick={() => {
                  const generated = `JKR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                  setCode(generated);
                }}
                className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-500 font-bold text-xs hover:bg-orange-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> توليد كود عشوائي
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="اسم ووصف الكوبون *"
                placeholder="مثال: خصم موسم الصيف 10%"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />

              <Input
                label="كود الكوبون (Code) *"
                placeholder="مثال: EID2026 أو JKR-Q8A92X"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          {/* Discount Value and Type (Supports Percentage & Fixed for all, including Influencers) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">نوع الخصم *</label>
              <select
                value={discountType}
                onChange={e => setDiscountType(e.target.value as any)}
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
              >
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed_amount">مبلغ ثابت (جنيه)</option>
              </select>
            </div>

            <Input
              label={discountType === 'percentage' ? 'قيمة الخصم (%) *' : 'قيمة الخصم (جنيه) *'}
              type="number"
              value={discountValue}
              onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
            />

            {discountType === 'percentage' && (
              <Input
                label="الحد الأقصى للخصم (جنيه)"
                type="number"
                value={maxDiscountLimit}
                onChange={e => setMaxDiscountLimit(parseFloat(e.target.value) || 0)}
              />
            )}
          </div>

          {/* Game Lock & Audience Restriction Section */}
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-purple-400 text-xs flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4" /> ربط وتخصيص الكوبون بلعبة محددة (Game Lock)
              </h4>
              {applicableGameId !== 'all' && (
                <span className="text-[10px] bg-purple-500 text-white font-bold px-2 py-0.5 rounded-md shadow-2xs">
                  🔒 مقيد بلعبة معينة
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  اختر اللعبة المرتبطة *
                </label>
                <select
                  value={applicableGameId}
                  onChange={e => setApplicableGameId(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold text-xs"
                >
                  <option value="all">🌐 صالح لجميع الألعاب والخدمات (عام - غير مقيد)</option>
                  {games.map(g => (
                    <option key={g.id} value={g.id}>
                      🎮 {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  الجهة المستهدفة بالكوبون
                </label>
                <select
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value as any)}
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold text-xs"
                >
                  <option value="all">👥 متاح للجميع (تجزئة وجملة)</option>
                  <option value="customers">👤 قسم الزبائن فقط (تجزئة)</option>
                  <option value="dealers">🏪 قسم التجار فقط (جملة)</option>
                </select>
              </div>
            </div>

            {applicableGameId !== 'all' ? (
              <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-purple-400 mt-0.5" />
                <div>
                  <strong>تنبيه الإلزام والتشفير:</strong> هذا الكوبون سيكون مشفراً ومحصوراً فقط على شحنات لعبة{' '}
                  <span className="text-white underline font-black">{games.find(g => g.id === applicableGameId)?.name}</span>،
                  ولن يقبل النظام تفعيله أو استخدامه لأي لعبة أو منتج آخر نهائياً، كما سيتم تطبيق الخصم فقط على منتجات هذه اللعبة في الفاتورة.
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-zinc-400">
                💡 هذا الكوبون عام ويعمل مع كافة الألعاب والخدمات المتوفرة في الكتالوج.
              </p>
            )}
          </div>

          {/* Minimum and Maximum Purchase Limits (الحد الأدنى والأقصى للشراء) */}
          <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
            <h4 className="font-bold text-blue-400 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> شروط وحدود سلة الشراء (Purchase Limits)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  الحد الأدنى للشراء (جنيه - اختياري)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={minPurchaseAmount}
                  onChange={e => setMinPurchaseAmount(e.target.value)}
                  placeholder="مثال: 200 (لا يعمل الكوبون إذا كان الإجمالي أقل)"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  الحد الأقصى للشراء (جنيه - اختياري)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={maxPurchaseAmount}
                  onChange={e => setMaxPurchaseAmount(e.target.value)}
                  placeholder="مثال: 1000 (لا يعمل الكوبون إذا تجاوز الإجمالي)"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Type: Single Use Specific Settings */}
          {type === 'single_use' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
              <h4 className="font-bold text-amber-500 text-xs flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> إعدادات كوبون الاستخدام لمرة واحدة (Single-Use Engine)
              </h4>

              {/* Single Use Sub-type Choice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSingleUseType('customer_specific')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center gap-2.5 ${
                    singleUseType === 'customer_specific'
                      ? 'border-purple-500 bg-purple-500/15 text-purple-400 font-bold ring-1 ring-purple-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs">👤 كوبون خاص بعميل محدد</div>
                    <div className="text-[10px] text-zinc-500 font-normal">حصري لعميل واحد بالاسم والكود والهاتف فقط</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSingleUseType('general')}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center gap-2.5 ${
                    singleUseType === 'general'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold ring-1 ring-emerald-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs">🌐 كوبون عام (أي شخص - أسبقية أول استخدام)</div>
                    <div className="text-[10px] text-zinc-500 font-normal">متاح للجميع، ويحترق فور إتمام أول طلب بنجاح</div>
                  </div>
                </button>
              </div>

              {/* Sub-option 1: Customer-Specific Selection */}
              {singleUseType === 'customer_specific' && (
                <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-purple-500/30 space-y-2.5">
                  <label className="block font-bold text-zinc-700 dark:text-zinc-200 text-xs">
                    اختيار العميل المستهدف (البحث بالاسم أو الهاتف أو كود العميل) *
                  </label>

                  {/* Selected Customer Card or Search Box */}
                  {targetCustomerId ? (
                    (() => {
                      const selectedCust = customers.find(c => c.id === targetCustomerId);
                      return (
                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-zinc-900 dark:text-zinc-100">{selectedCust?.name || 'العميل المحدد'}</span>
                              <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 font-mono text-[10px] font-bold">
                                {selectedCust?.code || targetCustomerCode || 'كود غير مسجل'}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono">
                              هاتف: {selectedCust?.phone || 'بدون هاتف'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetCustomerId('');
                              setTargetCustomerCode('');
                            }}
                            className="text-[11px] text-rose-500 hover:text-rose-400 underline font-bold cursor-pointer"
                          >
                            تغيير العميل
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="ابحث باسم العميل أو رقم هاتفه أو كوده (مثال: CUST-001)..."
                        value={singleUseCustomerSearch}
                        onChange={e => setSingleUseCustomerSearch(e.target.value)}
                        icon={<Search className="w-4 h-4 text-purple-400" />}
                      />
                      {/* Quick dropdown list */}
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 dark:border-[#27272A] divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-[#141417]">
                        {customers
                          .filter(c => {
                            if (!singleUseCustomerSearch.trim()) return true;
                            const q = singleUseCustomerSearch.toLowerCase().trim();
                            return (
                              (c.name || '').toLowerCase().includes(q) ||
                              (c.phone || '').toLowerCase().includes(q) ||
                              (c.code || '').toLowerCase().includes(q)
                            );
                          })
                          .slice(0, 8)
                          .map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setTargetCustomerId(c.id);
                                setTargetCustomerCode(c.code || '');
                                setSingleUseCustomerSearch('');
                              }}
                              className="w-full p-2 text-right hover:bg-purple-500/10 flex items-center justify-between cursor-pointer transition-colors text-xs"
                            >
                              <div>
                                <strong className="text-zinc-900 dark:text-zinc-100 block">{c.name}</strong>
                                <span className="text-[10px] text-zinc-400 font-mono">{c.phone}</span>
                              </div>
                              <span className="font-mono text-[10px] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-md font-bold">
                                {c.code || 'بدون كود'}
                              </span>
                            </button>
                          ))}
                        {customers.filter(c => {
                          if (!singleUseCustomerSearch.trim()) return true;
                          const q = singleUseCustomerSearch.toLowerCase().trim();
                          return (
                            (c.name || '').toLowerCase().includes(q) ||
                            (c.phone || '').toLowerCase().includes(q) ||
                            (c.code || '').toLowerCase().includes(q)
                          );
                        }).length === 0 && (
                          <div className="p-3 text-center text-zinc-400 text-xs">
                            لا يوجد عميل مطابق لمعايير البحث
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-zinc-400">
                    🔒 لن يتمكن أي شخص آخر من استخدام هذا الكوبون نهائياً. وبمجرد استخدامه لأول مرة يتم إغلاقه واحتسابه مستخدماً ومنتهياً.
                  </p>
                </div>
              )}

              {/* Sub-option 2: General Notice */}
              {singleUseType === 'general' && (
                <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-emerald-500/30 text-[11px] text-emerald-600 dark:text-emerald-400 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>نظام الحرق الفوري عند أول استخدام:</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[10px] leading-relaxed">
                    يمكن لأي زبون تطبيق الكوبون على سلة مشترياته، ولكن فور إتمام وحفظ التذكرة من قبل أول عميل بنجاح، يحترق الكوبون ويتحول مباشرة إلى حالة <strong>"مستخدم"</strong> و<strong>"منتهي"</strong>، وتُرفض أي محاولة تالية لأي شخص برسالة: "تم استخدام هذا الكوبون مسبقاً".
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Type 2: Seasonal Specific Settings */}
          {type === 'seasonal' && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <h4 className="font-bold text-amber-500 text-xs flex items-center gap-1.5">
                <Flame className="w-4 h-4" /> محددات كوبون الموسم (إيقاف تلقائي)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="ميزانية / كمية الخصم الكلية (جنيه) *"
                  type="number"
                  value={allocatedQuantityBudget}
                  onChange={e => setAllocatedQuantityBudget(parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="عدد مرات الاستخدام الأقصى *"
                  type="number"
                  value={maxUsageTotal}
                  onChange={e => setMaxUsageTotal(parseInt(e.target.value) || 0)}
                />
                <Input
                  label="تاريخ انتهاء الكوبون"
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Type 3: Influencer Specific Settings */}
          {type === 'influencer' && (
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3">
              <h4 className="font-bold text-blue-400 text-xs flex items-center gap-1.5">
                <Users className="w-4 h-4" /> ربط المشهور ونظام الإحالة الآلي
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    المشهور / الشريك المعتمد المسجل *
                  </label>
                  <select
                    value={influencerCustomerId}
                    onChange={e => setInfluencerCustomerId(e.target.value)}
                    className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
                  >
                    <option value="">اختر المشهور / الشريك</option>
                    {customers.map(inf => (
                      <option key={inf.id} value={inf.id}>
                        {inf.name} ({inf.phone}) - {inf.profileType === 'influencer' ? 'مشهور' : 'عميل'}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="عمولة المشهور عن كل شحنة (%) *"
                  type="number"
                  step="0.1"
                  value={influencerCommissionRate}
                  onChange={e => setInfluencerCommissionRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          )}

          {/* Type 4: Customer Specific Settings */}
          {type === 'customer_specific' && (
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-3">
              <h4 className="font-bold text-purple-400 text-xs flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4" /> تحديد العميل المستهدف حصرياً وسبب التعويض
              </h4>

              <div>
                <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  العميل المستهدف (لا يمكن لأي عميل آخر استخدام الكوبون) *
                </label>
                <select
                  value={targetCustomerId}
                  onChange={e => setTargetCustomerId(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold"
                >
                  <option value="">اختر العميل</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - {c.code}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="سبب التعويض أو منح الخصم الخاص *"
                placeholder="مثال: تعويض عن مشكلة شحن سابقة أو هدية ولاء"
                value={compensationReason}
                onChange={e => setCompensationReason(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button type="submit" variant="primary">
              {editingCouponId ? 'حفظ التعديلات' : 'حفظ وتفعيل الكوبون'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 📜 Usage Log Modal */}
      {isUsageLogModalOpen && selectedCouponForLog && (
        <Modal
          isOpen={isUsageLogModalOpen}
          onClose={() => setIsUsageLogModalOpen(false)}
          title={`📜 سجل استخدام الكوبون (${selectedCouponForLog.code})`}
          subtitle={`عرض تاريخ وحركات استخدام الكوبون "${selectedCouponForLog.title}"`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-right">
            {/* Header summary info */}
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px]">كود ونوع الكوبون:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-black text-orange-500 text-sm">{selectedCouponForLog.code}</span>
                  <Badge variant="orange" size="sm">
                    {selectedCouponForLog.type === 'single_use'
                      ? `استخدام مرة واحدة (${selectedCouponForLog.singleUseType === 'customer_specific' ? 'خاص' : 'عام'})`
                      : selectedCouponForLog.type === 'seasonal'
                      ? 'كوبون مواسم'
                      : selectedCouponForLog.type === 'influencer'
                      ? 'كوبون مشاهير'
                      : 'خاص بعميل'}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 block text-[10px]">الحالة الحالية:</span>
                <span className="font-bold text-xs">
                  {selectedCouponForLog.status === 'used'
                    ? '🔒 مستخدم (مغلق)'
                    : selectedCouponForLog.status === 'expired'
                    ? '⛔ منتهي'
                    : selectedCouponForLog.status === 'cancelled'
                    ? '🚫 ملغي'
                    : '🟢 نشط'}
                </span>
              </div>

              <div>
                <span className="text-zinc-400 block text-[10px]">إجمالي مرات الاستخدام:</span>
                <span className="font-mono font-black text-sm text-emerald-500">
                  {selectedCouponForLog.usageLog?.length || selectedCouponForLog.currentUsageCount || 0} عملية
                </span>
              </div>
            </div>

            {/* Records Table */}
            {(!selectedCouponForLog.usageLog || selectedCouponForLog.usageLog.length === 0) ? (
              <div className="p-8 text-center text-zinc-400 rounded-xl bg-gray-50/50 dark:bg-zinc-900/40 border border-gray-200 dark:border-[#27272A] space-y-2">
                <Clock className="w-8 h-8 text-zinc-400 mx-auto" />
                <p className="font-bold text-xs">لا توجد حركات استخدام مسجلة لهذا الكوبون حتى الآن.</p>
                <p className="text-[11px] text-zinc-500">سيتم تسجيل كل عملية خصم مع كافة التفاصيل والموظف المسؤول تلقائياً هنا.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">العميل المستفيد</th>
                      <th className="p-2.5">كود العميل</th>
                      <th className="p-2.5">رقم الهاتف</th>
                      <th className="p-2.5">رقم التذكرة</th>
                      <th className="p-2.5">تاريخ الاستخدام</th>
                      <th className="p-2.5">الوقت</th>
                      <th className="p-2.5">الموظف المسؤول</th>
                      <th className="p-2.5">مبلغ الخصم</th>
                      <th className="p-2.5">الحالة (قبل / بعد)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {selectedCouponForLog.usageLog.map((rec, idx) => (
                      <tr key={rec.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                        <td className="p-2.5 font-mono text-zinc-400 font-bold">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">{rec.customerName}</td>
                        <td className="p-2.5 font-mono text-purple-500 font-bold">{rec.customerCode || '—'}</td>
                        <td className="p-2.5 font-mono text-zinc-500">{rec.customerPhone || '—'}</td>
                        <td className="p-2.5 font-mono font-bold text-blue-500">{rec.ticketNumber}</td>
                        <td className="p-2.5 font-mono text-zinc-600 dark:text-zinc-400">{rec.usageDate}</td>
                        <td className="p-2.5 font-mono text-zinc-500">{rec.usageTime}</td>
                        <td className="p-2.5 text-zinc-700 dark:text-zinc-300 font-medium">{rec.staffName || 'النظام'}</td>
                        <td className="p-2.5 font-mono font-black text-emerald-500">{formatCurrency(rec.discountAmountApplied)}</td>
                        <td className="p-2.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                            {rec.statusBeforeUse || 'نشط'}
                          </span>
                          <span className="mx-1 text-zinc-400">←</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500">
                            {rec.statusAfterUse || 'مستخدم'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsUsageLogModalOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 🖨️ Professional Report Generator Modal */}
      {isReportModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          defaultTemplateType="coupons"
        />
      )}
    </div>
  );
};
