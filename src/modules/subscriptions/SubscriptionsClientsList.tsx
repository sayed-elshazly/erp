// =============================================================
// NZM JKR TOP UP ERP — Subscriptions Clients & Subscribers Registry
// =============================================================

import React, { useState, useMemo, useEffect } from 'react';
import { Customer } from '../../types/customer.types';
import { CustomerSubscription, SubscriptionPlan } from '../../types/subscription.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CustomerFormModal } from '../customers/CustomerFormModal';
import { CustomerProfileModal } from '../customers/CustomerProfileModal';
import { SubscriptionsSellModal } from './SubscriptionsSellModal';
import { SubscriptionRenewModal } from './SubscriptionRenewModal';
import { SubscriptionReceiptModal } from './SubscriptionReceiptModal';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';
import { exportToExcel } from '../../utils/excelExport';
import {
  CustomerFilterCriteria,
  INITIAL_CUSTOMER_FILTER_CRITERIA,
  filterCustomersEngine,
  sortCustomersEngine,
  CustomerSortField,
  CustomerSortOrder,
  countActiveFilters,
  getSavedFilterPresets,
  SavedFilterPreset
} from '../../services/customer/customerFilterEngine';
import { AdvancedCustomerFilterDrawer } from '../../components/customers/AdvancedCustomerFilterDrawer';
import { TablePagination } from '../../components/common/TablePagination';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Tv,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  ShoppingBag,
  Printer,
  Download,
  MessageCircle,
  Send,
  Calendar,
  ExternalLink,
  ShieldCheck,
  DollarSign,
  UserCheck,
  Eye,
  Tag,
  X,
  ArrowUpDown,
  Bookmark,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

export const SubscriptionsClientsList: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Data States
  const [customers, setCustomers] = useState<Customer[]>(() => db.getSubscriptionClients(true));
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>(() => db.getSubscriptions());
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => db.getSubscriptionPlans());

  // Search & Filter Criteria
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCriteria, setFilterCriteria] = useState<CustomerFilterCriteria>(INITIAL_CUSTOMER_FILTER_CRITERIA);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<CustomerSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<CustomerSortOrder>('desc');
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>(() => getSavedFilterPresets());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Tickets & Notes Context for In-Depth Compound Queries
  const tickets = useMemo(() => db.getTickets(), []);
  const notesMap = useMemo(() => {
    try {
      const allNotes = (db as any).getItem ? (db as any).getItem('nzm_jkr_customer_notes', []) : [];
      const map: Record<string, any[]> = {};
      if (Array.isArray(allNotes)) {
        allNotes.forEach(n => {
          if (!map[n.customerId]) map[n.customerId] = [];
          map[n.customerId].push(n);
        });
      }
      return map;
    } catch {
      return {};
    }
  }, []);

  const availableProducts = useMemo(() => {
    return plans.map(p => ({ id: p.id, name: p.name }));
  }, [plans]);

  const availableGames = useMemo(() => {
    try {
      const tree = db.getGameTree ? db.getGameTree() : [];
      return tree.map(g => ({ id: g.id || g.name, name: g.name }));
    } catch {
      return [];
    }
  }, []);

  // Modals
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState<Customer | null>(null);
  const [selectedCustomerForSell, setSelectedCustomerForSell] = useState<Customer | null>(null);
  const [selectedSubForRenew, setSelectedSubForRenew] = useState<CustomerSubscription | null>(null);
  const [selectedSubForReceipt, setSelectedSubForReceipt] = useState<CustomerSubscription | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Live Debounced Instant Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilterCriteria(prev => ({ ...prev, search: searchQuery }));
      setCurrentPage(1);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const reloadData = () => {
    setCustomers(db.getSubscriptionClients(true));
    setSubscriptions(db.getSubscriptions());
    setPlans(db.getSubscriptionPlans());
    setSavedPresets(getSavedFilterPresets());
  };

  // Enriched Clients with Subscription Statistics
  const enrichedClients = useMemo(() => {
    const subsByCustomer: Record<string, CustomerSubscription[]> = {};
    subscriptions.forEach(sub => {
      if (!subsByCustomer[sub.customerId]) {
        subsByCustomer[sub.customerId] = [];
      }
      subsByCustomer[sub.customerId].push(sub);
    });

    return customers.map(cust => {
      const custSubs = subsByCustomer[cust.id] || [];
      const activeSubs = custSubs.filter(s => s.status === 'active');
      const expiringSoonSubs = custSubs.filter(s => s.status === 'expiring_soon');

      // Primary active subscription
      const primarySub = activeSubs[0] || expiringSoonSubs[0] || custSubs[0] || null;
      let subStatus: 'active' | 'expiring_soon' | 'expired' | 'no_sub' = 'no_sub';
      let remainingDays: number | null = null;

      if (primarySub) {
        if (primarySub.status === 'cancelled' || primarySub.status === 'frozen' || primarySub.status === 'expired') {
          subStatus = 'expired';
        } else if (primarySub.status === 'expiring_soon') {
          subStatus = 'expiring_soon';
        } else {
          subStatus = 'active';
        }
        const now = new Date().getTime();
        const end = new Date(primarySub.endDate).getTime();
        remainingDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      }

      const totalPaid = custSubs.reduce((sum, s) => sum + (s.finalPrice || 0), 0);
      const totalRenewals = custSubs.reduce((sum, s) => sum + (s.renewalCount || 0), 0);

      return {
        ...cust,
        subscriptionsCount: custSubs.length,
        currentSubscription: primarySub,
        subscriptionStatus: subStatus,
        remainingDays,
        totalPaid,
        totalRenewals
      };
    });
  }, [customers, subscriptions]);

  // Filtered & Sorted Clients using Compound Engine
  const filteredAndSortedClients = useMemo(() => {
    const filtered = filterCustomersEngine(enrichedClients, filterCriteria, {
      tickets,
      notes: notesMap,
      subscriptions
    });
    return sortCustomersEngine(filtered, sortBy, sortOrder);
  }, [enrichedClients, filterCriteria, tickets, notesMap, subscriptions, sortBy, sortOrder]);

  // Paginated Sliced View
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedClients.slice(start, start + pageSize);
  }, [filteredAndSortedClients, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / pageSize) || 1;
  const activeFiltersCount = useMemo(() => countActiveFilters(filterCriteria), [filterCriteria]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const total = enrichedClients.length;
    const active = enrichedClients.filter(c => c.subscriptionStatus === 'active' || c.subscriptionStatus === 'expiring_soon').length;
    const expiringSoon = enrichedClients.filter(c => c.subscriptionStatus === 'expiring_soon').length;
    const expiredOrNone = enrichedClients.filter(c => c.subscriptionStatus === 'expired' || c.subscriptionStatus === 'no_sub').length;
    const totalVolume = enrichedClients.reduce((sum, c) => sum + c.totalPaid, 0);

    return { total, active, expiringSoon, expiredOrNone, totalVolume };
  }, [enrichedClients]);

  // Save new customer from modal
  const handleSaveCustomer = (custData: Partial<Customer>) => {
    const existing = db.getSubscriptionClients(true);
    // Duplicate check
    const isDupPhone = existing.some(c => c.phone.trim() === custData.phone?.trim());
    if (isDupPhone) {
      showToast('error', 'عميل مكرر', 'يوجد مشترك مسجل بنفس رقم الهاتف مسبقاً في قسم الاشتراكات');
      return;
    }

    const newCust: Customer = {
      id: custData.id || `sub_cust_${Date.now()}`,
      code: custData.code || `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
      name: custData.name?.trim() || '',
      phone: custData.phone?.trim() || '',
      extraPhone: custData.extraPhone?.trim() || undefined,
      email: custData.email?.trim() || undefined,
      address: custData.address?.trim() || undefined,
      birthDate: custData.birthDate || undefined,
      source: custData.source || 'unspecified',
      profileType: custData.profileType || 'regular',
      status: 'active',
      isFrozen: false,
      balance: 0,
      accountBalance: 0,
      cashbackBalance: 0,
      totalCashbackEarned: 0,
      referralWalletBalance: 0,
      totalReferralCommissionEarned: 0,
      monthlyReferredCount: 0,
      partnerWarningCount: 0,
      totalSpent: 0,
      totalOrders: 0,
      maxSingleOrderAmount: 0,
      loyaltyTier: 'normal',
      purchasingPower: 'normal',
      isArchived: false,
      notesCount: 0,
      ticketsCount: 0,
      referralCode: custData.referralCode || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.saveSubscriptionClient(newCust, { id: user?.id, name: user?.fullName, role: user?.role });
    showToast('success', 'تم تسجيل المشترك بنجاح 🎉', `تم إنشاء ملف المشترك: ${newCust.name} في قاعدة بيانات الاشتراكات`);
    setIsCustomerFormOpen(false);
    reloadData();
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredAndSortedClients.map(c => ({
      'كود العميل': c.code,
      'الاسم': c.name,
      'الهاتف': c.phone,
      'البريد': c.email || '—',
      'الباقة الحالية': c.currentSubscription?.planName || 'بدون اشتراك',
      'حالة الاشتراك': c.subscriptionStatus === 'active' ? 'نشط' : c.subscriptionStatus === 'expiring_soon' ? 'قارب الانتهاء' : c.subscriptionStatus === 'expired' ? 'منتهي' : 'لا يوجد',
      'تاريخ الانتهاء': c.currentSubscription ? formatDate(c.currentSubscription.endDate) : '—',
      'الأيام المتبقية': c.remainingDays !== null ? (c.remainingDays > 0 ? `${c.remainingDays} يوم` : 'منتهي') : '—',
      'عدد الاشتراكات': c.subscriptionsCount,
      'إجمالي المدفوع': c.totalPaid,
      'تاريخ التسجيل': formatDate(c.createdAt)
    }));

    exportToExcel(exportData, `subscription_clients_${Date.now()}`);
    showToast('success', 'تم التصدير', 'تم تصدير سجل عملاء الاشتراكات بنجاح');
  };

  // WhatsApp
  const handleWhatsApp = (client: any) => {
    const phoneToUse = client.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phoneToUse.startsWith('0') ? '2' + phoneToUse : phoneToUse;
    const msg = encodeURIComponent(
      `🎉 مرحباً يا *${client.name}*\n\nتحية طيبة من فريق اشتراكات *NZM JKR*.\n${
        client.currentSubscription
          ? `📌 باقتك الحالية: *${client.currentSubscription.planName}*\n⏳ تنتهي بتاريخ: *${formatDate(client.currentSubscription.endDate)}*`
          : 'يسعدنا تواصلك معنا للاطلاع على أحدث باقاتنا الحصرية وعروض التجديد!'
      }`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const getStatusBadge = (status: 'active' | 'expiring_soon' | 'expired' | 'no_sub', remainingDays: number | null) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="success" size="sm">
            نشط ({remainingDays} يوم متبقي)
          </Badge>
        );
      case 'expiring_soon':
        return (
          <Badge variant="warning" size="sm">
            قارب الانتهاء ({remainingDays} يوم)
          </Badge>
        );
      case 'expired':
        return <Badge variant="danger" size="sm">اشتراك منتهي</Badge>;
      case 'no_sub':
      default:
        return <Badge variant="default" size="sm">بدون اشتراك</Badge>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs" dir="rtl">
      {/* 1. Header & KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">إجمالي العملاء المسجلين</span>
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
              {kpis.total}
            </span>
            <div className="text-[10px] text-pink-500 font-bold mt-0.5">مشتركون ومسجلون بالنظام</div>
          </div>
          <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">عملاء باشتراكات سارية</span>
            <span className="text-2xl font-black text-emerald-500 font-mono">
              {kpis.active}
            </span>
            <div className="text-[10px] text-zinc-400 mt-0.5">معدل النشاط: {kpis.total > 0 ? Math.round((kpis.active / kpis.total) * 100) : 0}%</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">اشتراكات قاربت على الانتهاء</span>
            <span className="text-2xl font-black text-amber-500 font-mono">
              {kpis.expiringSoon}
            </span>
            <div className="text-[10px] text-amber-500 font-bold mt-0.5">تحتاج لمتابعة فورية</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">إجمالي مبيعات المشتركين</span>
            <span className="text-2xl font-black text-purple-500 font-mono">
              {formatCurrency(kpis.totalVolume)}
            </span>
            <div className="text-[10px] text-emerald-500 font-bold mt-0.5">موردة للخزينة العامة</div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* 2. Controls, Search, and Action Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-[#121215] p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs">
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-full sm:max-w-xs md:max-w-md">
            <input
              type="text"
              placeholder="بحث شامل: الاسم، الهاتف، الواتساب، الكود، الإيميل، الإحالة، الملاحظات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl py-2 pr-9 pl-8 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 transition-all font-sans"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-zinc-400 hover:text-zinc-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters, Sorting and Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Advanced Filters Button with Counter */}
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border ${
                activeFiltersCount > 0
                  ? 'bg-pink-500 text-white border-pink-500 shadow-sm shadow-pink-500/20'
                  : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:border-pink-500'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>الفلاتر المتقدمة</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white text-pink-600">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Field Selector */}
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1">
              <span className="text-[11px] text-zinc-400 font-bold hidden sm:inline">ترتيب:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as CustomerSortField)}
                className="bg-transparent border-0 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="createdAt">تاريخ التسجيل</option>
                <option value="name">الاسم</option>
                <option value="lastActivity">آخر نشاط</option>
                <option value="totalSpent">إجمالي الإنفاق</option>
                <option value="totalOrders">عدد الطلبات</option>
                <option value="accountBalance">رصيد الحساب</option>
                <option value="cashbackBalance">رصيد الكاش باك</option>
                <option value="referralBalance">رصيد الإحالة</option>
                <option value="profits">أرباح الإحالة</option>
                <option value="maxOrder">الأعلى شراءً</option>
                <option value="referees">الأكثر إحالة</option>
              </select>

              {/* Sort Order Toggle */}
              <button
                type="button"
                onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                className="p-1 rounded-lg text-zinc-500 hover:text-pink-500 hover:bg-gray-200 dark:hover:bg-[#27272A] transition-colors cursor-pointer"
                title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
              >
                {sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-pink-500" /> : <ArrowDown className="w-3.5 h-3.5 text-pink-500" />}
              </button>
            </div>

            {/* Reset All Filters */}
            {(activeFiltersCount > 0 || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setFilterCriteria(INITIAL_CUSTOMER_FILTER_CRITERIA);
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                title="إعادة تعيين كافة الفلاتر والبحث"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">مسح الفلاتر</span>
              </button>
            )}

            <div className="h-6 w-px bg-gray-200 dark:bg-[#27272A] hidden sm:block mx-0.5" />

            {/* + New Customer Button */}
            <button
              type="button"
              onClick={() => setIsCustomerFormOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ إضافة مشترك جديد</span>
            </button>

            {/* Print Report */}
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-pink-500 hover:border-pink-500/50 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 hover:border-emerald-500/50 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Presets & Active Badges Row */}
        {(savedPresets.length > 0 || activeFiltersCount > 0) && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            {/* Saved Presets Quick Access */}
            {savedPresets.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <span className="text-[11px] text-amber-500 font-bold flex items-center gap-1">
                  <Bookmark className="w-3 h-3" />
                  الفلاتر المحفوظة:
                </span>
                {savedPresets.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setFilterCriteria(preset.criteria);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[11px] border border-amber-500/20 transition-all cursor-pointer"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            )}

            {/* Active Filter Badges */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {filterCriteria.customerType !== 'all' && (
                  <span className="px-2 py-0.5 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 text-[10px] font-bold flex items-center gap-1">
                    النوع: {filterCriteria.customerType}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-pink-700"
                      onClick={() => setFilterCriteria(p => ({ ...p, customerType: 'all' }))}
                    />
                  </span>
                )}
                {filterCriteria.accountStatus !== 'all' && (
                  <span className="px-2 py-0.5 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 text-[10px] font-bold flex items-center gap-1">
                    الحالة: {filterCriteria.accountStatus}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-pink-700"
                      onClick={() => setFilterCriteria(p => ({ ...p, accountStatus: 'all' }))}
                    />
                  </span>
                )}
                {filterCriteria.debtsStatus !== 'all' && (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold flex items-center gap-1">
                    {filterCriteria.debtsStatus === 'has_debt' ? 'لديه ديون' : 'بدون ديون'}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-rose-700"
                      onClick={() => setFilterCriteria(p => ({ ...p, debtsStatus: 'all' }))}
                    />
                  </span>
                )}
                {filterCriteria.cashbackStatus !== 'all' && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                    {filterCriteria.cashbackStatus === 'has_cashback' ? 'لديه كاش باك' : 'بدون كاش باك'}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-emerald-700"
                      onClick={() => setFilterCriteria(p => ({ ...p, cashbackStatus: 'all' }))}
                    />
                  </span>
                )}
                {filterCriteria.country !== 'all' && (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold flex items-center gap-1">
                    الدولة: {filterCriteria.country}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-blue-700"
                      onClick={() => setFilterCriteria(p => ({ ...p, country: 'all' }))}
                    />
                  </span>
                )}
                {filterCriteria.city !== 'all' && (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold flex items-center gap-1">
                    المدينة: {filterCriteria.city}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-blue-700"
                      onClick={() => setFilterCriteria(p => ({ ...p, city: 'all' }))}
                    />
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Clients Master Table */}
      <Card className="p-0 bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <th className="py-3 px-3.5">العميل والكود</th>
                <th className="py-3 px-3.5">بيانات الاتصال</th>
                <th className="py-3 px-3.5">الباقة الحالية</th>
                <th className="py-3 px-3.5 text-center">حالة الاشتراك</th>
                <th className="py-3 px-3.5 text-center">تاريخ الانتهاء</th>
                <th className="py-3 px-3.5 text-center">الاشتراكات والتجديد</th>
                <th className="py-3 px-3.5 text-center">إجمالي المدفوع</th>
                <th className="py-3 px-3.5 text-left">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredAndSortedClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 space-y-2">
                    <Users className="w-8 h-8 text-pink-500/50 mx-auto" />
                    <p className="font-bold text-sm">لا يوجد عملاء مطابقون للبحث والفلاتر</p>
                    <p className="text-[11px]">يمكنك مسح الفلاتر أو تعديل شروط البحث للوصول للنتائج المطلوبة</p>
                  </td>
                </tr>
              ) : (
                paginatedClients.map(client => {
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Name & Code */}
                      <td className="py-3 px-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerForProfile(client)}
                          className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-pink-600 dark:hover:text-pink-400 text-xs flex items-center gap-1.5 cursor-pointer text-right"
                        >
                          <span>{client.name}</span>
                          <ExternalLink className="w-3 h-3 text-zinc-400" />
                        </button>
                        <span className="font-mono text-[10px] text-zinc-400 font-bold block mt-0.5">
                          {client.code}
                        </span>
                      </td>

                      {/* Phone & Email */}
                      <td className="py-3 px-3.5 font-mono text-[11px]">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{client.phone}</div>
                        {client.email && <div className="text-[10px] text-zinc-400">{client.email}</div>}
                      </td>

                      {/* Current Plan */}
                      <td className="py-3 px-3.5">
                        {client.currentSubscription ? (
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                              {client.currentSubscription.planName}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              #{client.currentSubscription.subscriptionNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">بدون اشتراك حالي</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center">
                        {getStatusBadge(client.subscriptionStatus, client.remainingDays)}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3 px-3.5 text-center font-mono text-[11px]">
                        {client.currentSubscription ? (
                          <span className="font-bold text-rose-500">
                            {formatDate(client.currentSubscription.endDate)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Total Subs & Renewals */}
                      <td className="py-3 px-3.5 text-center font-mono">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs block">
                          {client.subscriptionsCount} اشتراك
                        </span>
                        {client.totalRenewals > 0 && (
                          <span className="text-[10px] text-purple-400 font-bold">
                            ({client.totalRenewals} تجديد)
                          </span>
                        )}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3 px-3.5 text-center font-mono font-black text-pink-600 dark:text-pink-400 text-xs">
                        {formatCurrency(client.totalPaid)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Open Profile */}
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerForProfile(client)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-pink-500 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="فتح ملف وبروفايل العميل الشامل"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>الملف</span>
                          </button>

                          {/* Quick POS Sell */}
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerForSell(client)}
                            className="p-1.5 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="بيع اشتراك جديد لهذا العميل"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>بيع</span>
                          </button>

                          {/* Quick Renew if has subscription */}
                          {client.currentSubscription && (
                            <button
                              type="button"
                              onClick={() => setSelectedSubForRenew(client.currentSubscription)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                              title="تجديد الاشتراك"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleWhatsApp(client)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title="مراسلة عبر واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedClients.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          labelName="مشترك"
        />
      </Card>

      {/* 4. Modals */}
      {/* Create / Edit Customer Modal */}
      {isCustomerFormOpen && (
        <CustomerFormModal
          isOpen={isCustomerFormOpen}
          onClose={() => setIsCustomerFormOpen(false)}
          onSave={handleSaveCustomer}
          moduleContext="subscriptions"
        />
      )}

      {/* Full Customer Profile Dashboard Modal */}
      {selectedCustomerForProfile && (
        <CustomerProfileModal
          isOpen={Boolean(selectedCustomerForProfile)}
          onClose={() => setSelectedCustomerForProfile(null)}
          customer={selectedCustomerForProfile}
          onCustomerUpdated={() => reloadData()}
        />
      )}

      {/* Sell Subscription for selected customer */}
      {selectedCustomerForSell && (
        <SubscriptionsSellModal
          isOpen={Boolean(selectedCustomerForSell)}
          onClose={() => setSelectedCustomerForSell(null)}
          onSuccess={newSub => {
            reloadData();
            setSelectedSubForReceipt(newSub);
          }}
        />
      )}

      {/* Fast Renew Modal */}
      {selectedSubForRenew && (
        <SubscriptionRenewModal
          isOpen={Boolean(selectedSubForRenew)}
          onClose={() => setSelectedSubForRenew(null)}
          subscription={selectedSubForRenew}
          onRenewSuccess={() => reloadData()}
        />
      )}

      {/* Receipt Modal */}
      {selectedSubForReceipt && (
        <SubscriptionReceiptModal
          isOpen={Boolean(selectedSubForReceipt)}
          onClose={() => setSelectedSubForReceipt(null)}
          subscription={selectedSubForReceipt}
        />
      )}

      {/* Report Generator Modal */}
      {isReportModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          defaultTemplateType="customers"
          customPayload={filteredAndSortedClients}
        />
      )}

      {/* Advanced Customer Filter Drawer */}
      <AdvancedCustomerFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        criteria={filterCriteria}
        onApplyCriteria={newCrit => {
          setFilterCriteria(newCrit);
          setCurrentPage(1);
        }}
        onResetCriteria={() => {
          setFilterCriteria(INITIAL_CUSTOMER_FILTER_CRITERIA);
          setSearchQuery('');
          setCurrentPage(1);
        }}
        availableProducts={availableProducts}
        availableGames={availableGames}
      />
    </div>
  );
};
