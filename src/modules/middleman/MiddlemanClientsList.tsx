// =============================================================
// NZM JKR TOP UP ERP — Middleman Clients Directory (Full Drawer & Filters)
// =============================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Customer,
  ProfileType,
  LoyaltyTier,
  PurchasingPower,
  LifetimeSpendingTier,
  CustomerSource,
  CustomerTicket
} from '../../types/customer.types';
import { db } from '../../database/db';
import { ProfileStatisticsService } from '../../services/customer/profileStatisticsService';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTabs } from '../../context/TabsContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import { CustomerFormModal } from '../customers/CustomerFormModal';
import { CustomerProfileModal } from '../customers/CustomerProfileModal';
import { ArchivedCustomersModal } from '../customers/ArchivedCustomersModal';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';
import { MiddlemanFollowupModal } from './MiddlemanFollowupModal';
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
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  Eye,
  Edit2,
  Archive,
  Phone,
  Copy,
  Calendar,
  Gamepad2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Building2,
  Award,
  RotateCcw,
  X,
  Clock,
  CheckCircle2,
  ShoppingBag,
  MessageCircle,
  ShieldCheck,
  Tag,
  ArrowUpDown,
  Bookmark,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';

interface MiddlemanClientsListProps {
  initialSelectedCustomer?: Customer | null;
  initialFilterToday?: boolean;
}

export const MiddlemanClientsList: React.FC<MiddlemanClientsListProps> = ({
  initialSelectedCustomer,
  initialFilterToday
}) => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useNotifications();
  const { openTab } = useTabs();

  // Loading state
  const [loading, setLoading] = useState(true);

  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [archivedCustomers, setArchivedCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [availableGames, setAvailableGames] = useState<{ id: string; name: string }[]>([]);

  // Middleman Deals for Volume Computation
  const deals = useMemo(() => db.getMiddlemanDeals(true), []);

  // Filter Criteria, Sorting & Presets
  const [filterCriteria, setFilterCriteria] = useState<CustomerFilterCriteria>(INITIAL_CUSTOMER_FILTER_CRITERIA);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<CustomerSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<CustomerSortOrder>('desc');
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>(() => getSavedFilterPresets());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Search by Name, Phone, or Referral Code
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Profile Drawer
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState<Customer | null>(initialSelectedCustomer || null);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Follow-up Appointment Modal State
  const [followupCustomer, setFollowupCustomer] = useState<Customer | null>(null);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [followupDefaultTab, setFollowupDefaultTab] = useState<'all' | 'today' | 'overdue' | 'completed'>('all');

  // React to initialSelectedCustomer changes (e.g. from notification clicks)
  useEffect(() => {
    if (initialSelectedCustomer) {
      setSelectedCustomerForProfile(initialSelectedCustomer);
    }
  }, [initialSelectedCustomer]);

  // React to initialFilterToday from "مواعيد اليوم" notification click
  useEffect(() => {
    if (initialFilterToday) {
      setFollowupDefaultTab('today');
      setFollowupCustomer(null);
      setIsFollowupModalOpen(true);
    }
  }, [initialFilterToday]);

  // Live Debounced Instant Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilterCriteria(prev => ({ ...prev, search: searchQuery }));
      setCurrentPage(1);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Data
  const loadData = () => {
    setLoading(true);
    try {
      const allCust = db.getMiddlemanClients(true);
      const active = allCust.filter(c => !c.isArchived);
      const archived = allCust.filter(c => c.isArchived);
      
      // Games strictly from Middleman Accounts and Deals
      const mmAccounts = db.getMiddlemanAccounts();
      const mmDeals = db.getMiddlemanDeals(true);
      const gameSet = new Set<string>();
      mmAccounts.forEach(a => { if (a.gameName?.trim()) gameSet.add(a.gameName.trim()); });
      mmDeals.forEach(d => { if (d.gameName?.trim()) gameSet.add(d.gameName.trim()); });
      ['PUBG Mobile', 'Free Fire', 'Valorant', 'EA FC 25', 'Roblox', 'League of Legends', 'GTA V'].forEach(g => gameSet.add(g));
      const games = Array.from(gameSet).map(name => ({ id: name, name }));

      setCustomers(active);
      setArchivedCustomers(archived);
      setTickets(db.getTickets());
      setAvailableGames(games);
      setSavedPresets(getSavedFilterPresets());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Middleman Role & Volume Map
  const customerStatsMap = useMemo(() => {
    const map: Record<string, { asSeller: number; asBuyer: number; totalVolume: number; role: 'seller' | 'buyer' | 'both' }> = {};

    customers.forEach(c => {
      const sellerDeals = deals.filter(d => (d.sellerId === c.id || d.sellerPhone === c.phone) && d.status === 'completed');
      const buyerDeals = deals.filter(d => (d.buyerId === c.id || d.buyerPhone === c.phone) && d.status === 'completed');

      const totalVol =
        sellerDeals.reduce((sum, d) => sum + d.dealAmountEGP, 0) +
        buyerDeals.reduce((sum, d) => sum + d.dealAmountEGP, 0);

      let role: 'seller' | 'buyer' | 'both' = 'buyer';
      if (sellerDeals.length > 0 && buyerDeals.length > 0) {
        role = 'both';
      } else if (sellerDeals.length > 0) {
        role = 'seller';
      } else if (buyerDeals.length > 0) {
        role = 'buyer';
      } else if (c.middlemanRole) {
        role = c.middlemanRole;
      }

      map[c.id] = {
        asSeller: sellerDeals.length,
        asBuyer: buyerDeals.length,
        totalVolume: totalVol,
        role
      };
    });

    return map;
  }, [customers, deals]);

  // Notes Map
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
    const prods: { id: string; name: string }[] = [];
    deals.forEach(d => {
      if (d.title && !prods.some(p => p.name === d.title)) {
        prods.push({ id: d.title, name: d.title });
      }
    });
    return prods;
  }, [deals]);

  // Enriched Customers with Middleman specific data
  const enrichedCustomers = useMemo(() => {
    return customers.map(c => {
      const stats = customerStatsMap[c.id] || { asSeller: 0, asBuyer: 0, totalVolume: 0, role: 'buyer' };
      return {
        ...c,
        middlemanRole: stats.role,
        middlemanDealsCount: stats.asSeller + stats.asBuyer,
        middlemanTotalVolume: stats.totalVolume
      };
    });
  }, [customers, customerStatsMap]);

  // Filtered & Sorted Customers
  const filteredAndSortedCustomers = useMemo(() => {
    const filtered = filterCustomersEngine(enrichedCustomers, filterCriteria, {
      tickets,
      notes: notesMap
    });
    return sortCustomersEngine(filtered, sortBy, sortOrder);
  }, [enrichedCustomers, filterCriteria, tickets, notesMap, sortBy, sortOrder]);

  // Paginated Sliced View
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedCustomers.slice(start, start + pageSize);
  }, [filteredAndSortedCustomers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedCustomers.length / pageSize) || 1;
  const activeFiltersCount = useMemo(() => countActiveFilters(filterCriteria), [filterCriteria]);

  // Export Filtered to Excel
  const handleExportExcel = () => {
    const rate = db.getExchangeRate().rateUSD_EGP || 39.25;
    const exportData = filteredAndSortedCustomers.map(c => {
      const stats = customerStatsMap[c.id] || { asSeller: 0, asBuyer: 0, totalVolume: 0, role: 'buyer' };
      const roleLabel = stats.role === 'seller' ? 'بائع' : stats.role === 'buyer' ? 'مشتري' : 'بائع ومشتري';
      return {
        'كود العميل': c.code,
        'الاسم الكامل': c.name,
        'رقم الهاتف': c.phone,
        'طبيعة العميل (الوساطة)': roleLabel,
        'مصدر العميل': c.source,
        'الرصيد الدائن (ج)': c.balance || 0,
        'رصيد الكاش باك (ج)': c.cashbackBalance || 0,
        'حجم تداول الوساطة (ج)': stats.totalVolume,
        'عمليات كبائع': stats.asSeller,
        'عمليات كمشتري': stats.asBuyer,
        'إجمالي المشتريات ($)': Math.round(((c.totalSpent || 0) / rate) * 100) / 100,
        'تاريخ الإنشاء': formatDate(c.createdAt)
      };
    });

    exportToExcel(exportData, `middleman_clients_${Date.now()}`);
    showToast('success', 'تم التصدير', 'تم تصدير قائمة عملاء الوساطة بنجاح');
  };

  const getRoleBadge = (role: 'seller' | 'buyer' | 'both') => {
    switch (role) {
      case 'seller':
        return (
          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1">
            🟢 بائع
          </span>
        );
      case 'buyer':
        return (
          <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px] inline-flex items-center gap-1">
            🔵 مشتري
          </span>
        );
      case 'both':
        return (
          <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px] inline-flex items-center gap-1">
            🟣 كلاهما
          </span>
        );
    }
  };

  return (
    <div className="space-y-3.5 animate-fade-in text-right text-xs" dir="rtl">
      {/* 1. Top Action & Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-2.5 bg-white dark:bg-[#121215] p-3 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs">
        {/* Search Input (Live Search across all fields) */}
        <div className="relative w-full lg:w-80">
          <input
            type="text"
            placeholder="بحث فوري: الاسم، الهاتف، الكود، المعرفات، الملاحظات..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl py-2 pr-9 pl-4 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition-all font-sans"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto flex-wrap sm:flex-nowrap">
          {/* Advanced Filter Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`px-3.5 py-2 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeFiltersCount > 0
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:border-amber-500'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>الفلاتر المتقدمة</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-amber-600 font-mono text-[10px] font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as CustomerSortField)}
              className="bg-transparent text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none cursor-pointer"
            >
              <option value="createdAt">تاريخ التسجيل</option>
              <option value="lastActivity">آخر نشاط</option>
              <option value="name">الاسم</option>
              <option value="totalSpent">إجمالي الإنفاق</option>
              <option value="ordersCount">عدد العمليات / التذاكر</option>
              <option value="accountBalance">الرصيد المالي</option>
              <option value="cashbackBalance">رصيد الكاش باك</option>
              <option value="referralBalance">رصيد الإحالة</option>
              <option value="profits">أرباح الإحالة</option>
              <option value="highestPurchase">أعلى عملية شراء</option>
              <option value="referralsCount">الأكثر إحالات</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
              className="text-zinc-400 hover:text-amber-500 font-mono text-xs px-1 cursor-pointer"
            >
              {sortOrder === 'asc' ? '▲' : '▼'}
            </button>
          </div>

          {/* Reset Filters Shortcut */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilterCriteria(INITIAL_CUSTOMER_FILTER_CRITERIA);
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-1 transition-all cursor-pointer"
              title="إعادة تعيين كافة الفلاتر"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إعادة ضبط</span>
            </button>
          )}

          {/* Add Customer (Ctrl+N) */}
          <button
            type="button"
            onClick={() => setIsNewCustomerModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة عميل جديد</span>
          </button>

          {/* Follow-up Appointments Schedule */}
          <button
            type="button"
            onClick={() => {
              setFollowupCustomer(null);
              setFollowupDefaultTab('all');
              setIsFollowupModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>مواعيد المتابعة</span>
          </button>

          {/* Print Report */}
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-amber-500 hover:border-amber-500 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة تقرير</span>
          </button>

          {/* Export Filtered to Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 hover:border-emerald-500 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>تصدير ({filteredAndSortedCustomers.length})</span>
          </button>

          {/* Archive */}
          <button
            type="button"
            onClick={() => setIsArchivedModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-amber-500 hover:border-amber-500 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Archive className="w-3.5 h-3.5 text-amber-500" />
            <span>الأرشيف ({archivedCustomers.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Presets Bar & Active Badges */}
      {(savedPresets.length > 0 || activeFiltersCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50/50 dark:bg-[#141417]/50 px-3 py-2 rounded-xl border border-gray-100 dark:border-[#27272A]">
          {/* Saved Presets Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {savedPresets.length > 0 && (
              <>
                <span className="text-[11px] text-zinc-400 font-bold flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-amber-500" /> الفلاتر المحفوظة:
                </span>
                {savedPresets.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setFilterCriteria(preset.criteria);
                      setSearchQuery(preset.criteria.search || '');
                      setCurrentPage(1);
                      showToast('info', 'تم تطبيق الفلتر', `تم تطبيق "${preset.name}"`);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold hover:bg-amber-500 hover:text-white transition-all cursor-pointer"
                  >
                    {preset.name}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Active Filters Pill */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1">
                <span>{activeFiltersCount} فلتر نشط</span>
                <button
                  type="button"
                  title="مسح الفلاتر"
                  onClick={() => {
                    setFilterCriteria(INITIAL_CUSTOMER_FILTER_CRITERIA);
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="hover:text-rose-500 transition-colors cursor-pointer inline-flex items-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Main Customers Table */}
      <Card className="p-0 bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] overflow-hidden shadow-xs">
        {loading ? (
          <TableSkeleton rows={8} cols={10} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                  <th className="py-3 px-3 text-center">طبيعة الوساطة</th>
                  <th className="py-3 px-3">الاسم والنشاط</th>
                  <th className="py-3 px-3">رقم الهاتف</th>
                  <th className="py-3 px-3 text-center">رصيد دائن / مدين</th>
                  <th className="py-3 px-3 text-center">مستوى الولاء</th>
                  <th className="py-3 px-3 text-center">قوة الشراء</th>
                  <th className="py-3 px-3 text-center">تصنيف الإنفاق</th>
                  <th className="py-3 px-3 text-center">إجمالي المدفوع (USD)</th>
                  <th className="py-3 px-3 text-center">المتابعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {filteredAndSortedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-400 space-y-2">
                      <Users className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="font-bold text-sm">لا يوجد عملاء مطابقين للبحث والفلاتر</p>
                      <p className="text-[11px]">جرب إعادة تعيين الفلاتر أو تغيير معايير البحث</p>
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map(customer => {
                    const stats = customerStatsMap[customer.id] || { asSeller: 0, asBuyer: 0, totalVolume: 0, role: 'buyer' };
                    const rate = db.getExchangeRate().rateUSD_EGP || 39.25;
                    const totalSpentUSD = (customer.totalSpent || 0) / rate;
                    const tier = ProfileStatisticsService.calculateLoyaltyTier(customer.ticketsCount || 0);
                    const power = ProfileStatisticsService.calculatePurchasingPower(customer.maxSingleOrderAmount || 0);
                    const lifetime = ProfileStatisticsService.calculateLifetimeTier(totalSpentUSD);

                    return (
                      <tr
                        key={customer.id}
                        onClick={() => setSelectedCustomerForProfile(customer)}
                        className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                      >
                        {/* 1. Middleman Role Tag */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                              عميل عادي
                            </span>
                            {getRoleBadge(stats.role)}
                          </div>
                        </td>

                        {/* 2. Name & Activity */}
                        <td className="py-3 px-3">
                          <div className="font-black text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors">
                            {customer.name}
                          </div>
                          {customer.favoriteGame && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono mt-0.5">
                              <span>{customer.favoriteGame}</span>
                              {customer.lastPurchaseDate && (
                                <span>• آخر شراء: {formatDate(customer.lastPurchaseDate)}</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 3. Phone */}
                        <td className="py-3 px-3 font-mono font-bold text-zinc-600 dark:text-zinc-400">
                          {customer.phone}
                        </td>

                        {/* 4. Balance (Credit/Debit) */}
                        <td className="py-3 px-3 text-center font-mono font-black text-xs">
                          {customer.balance && customer.balance > 0 ? (
                            <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400">
                              +{customer.balance} ج (دائن)
                            </span>
                          ) : customer.balance && customer.balance < 0 ? (
                            <span className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400">
                              {customer.balance} ج (مدين)
                            </span>
                          ) : (
                            <span className="text-zinc-500">0.00 ج</span>
                          )}
                        </td>

                        {/* 5. Loyalty Tier */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-[10px] flex items-center gap-1">
                              <span>🌱 عادي</span>
                              <span className="text-zinc-400">({customer.ticketsCount || 0})</span>
                            </span>
                          </div>
                        </td>

                        {/* 6. Purchasing Power */}
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 font-bold text-[10px] inline-flex items-center gap-1">
                            ⚡ {power === 'strong' ? 'قوي (2000-4500 ج)' : power === 'whale' ? 'حوت (4500+ ج)' : 'متوسط (500-1999 ج)'}
                          </span>
                        </td>

                        {/* 7. Lifetime Spending Tier */}
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 font-black text-[10px] inline-flex items-center gap-1">
                            🥇 {lifetime === 'bronze' ? 'برونز (حتى 100$)' : lifetime === 'silver' ? 'فضي (100$-300$)' : 'ذهبي (300$+)'}
                          </span>
                        </td>

                        {/* 8. Total Spent USD & Middleman Volume */}
                        <td className="py-3 px-3 text-center font-mono">
                          <div className="font-black text-emerald-400 text-xs">
                            ${totalSpentUSD.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            USD ${totalSpentUSD.toFixed(2)}
                          </div>
                          {stats.totalVolume > 0 && (
                            <div className="text-[10px] text-amber-500 font-bold mt-0.5">
                              وساطة: {formatCurrency(stats.totalVolume)}
                            </div>
                          )}
                        </td>

                        {/* 9. Followup Action */}
                        <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setFollowupCustomer(customer);
                              setFollowupDefaultTab('all');
                              setIsFollowupModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 border border-amber-500/25 transition-all inline-flex items-center gap-1 cursor-pointer font-bold text-[10px]"
                            title="جدولة أو عرض مواعيد المتابعة لهذا الوسيط"
                          >
                            <Clock className="w-3 h-3" />
                            <span>متابعة</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={newSize => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          labelName="عميل وساطة"
        />
      </Card>

      {/* Advanced Filter Drawer (Slide-Over) */}
      <AdvancedCustomerFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        criteria={filterCriteria}
        onApplyCriteria={newCriteria => {
          setFilterCriteria(newCriteria);
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

      {/* Profile Slide-Over Drawer / Modal */}
      {selectedCustomerForProfile && (
        <CustomerProfileModal
          isOpen={Boolean(selectedCustomerForProfile)}
          onClose={() => setSelectedCustomerForProfile(null)}
          customer={selectedCustomerForProfile}
          onCustomerUpdated={() => loadData()}
        />
      )}

      {/* New Customer Modal */}
      {isNewCustomerModalOpen && (
        <CustomerFormModal
          isOpen={isNewCustomerModalOpen}
          onClose={() => setIsNewCustomerModalOpen(false)}
          moduleContext="middleman"
          onSave={custData => {
            db.saveMiddlemanClient(custData as Customer, { id: user?.id, name: user?.fullName, role: user?.role });
            loadData();
            setIsNewCustomerModalOpen(false);
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {selectedCustomerForEdit && (
        <CustomerFormModal
          isOpen={Boolean(selectedCustomerForEdit)}
          onClose={() => setSelectedCustomerForEdit(null)}
          customerToEdit={selectedCustomerForEdit}
          moduleContext="middleman"
          onSave={custData => {
            db.saveMiddlemanClient({ ...selectedCustomerForEdit, ...custData } as Customer, { id: user?.id, name: user?.fullName, role: user?.role });
            loadData();
            setSelectedCustomerForEdit(null);
          }}
        />
      )}

      {/* Archived Customers Modal */}
      {isArchivedModalOpen && (
        <ArchivedCustomersModal
          isOpen={isArchivedModalOpen}
          onClose={() => setIsArchivedModalOpen(false)}
          archivedCustomers={db.getArchivedCustomers ? db.getArchivedCustomers() : []}
          onRestore={id => {
            db.restoreCustomer(id);
            loadData();
          }}
        />
      )}

      {/* Print Report Modal */}
      {isReportModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          defaultTemplateType="customers"
          customPayload={filteredAndSortedCustomers}
        />
      )}

      {/* Follow-up Appointments Modal */}
      <MiddlemanFollowupModal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        customer={followupCustomer}
        defaultFilterTab={followupDefaultTab}
        onFollowupUpdated={() => loadData()}
      />
    </div>
  );
};
