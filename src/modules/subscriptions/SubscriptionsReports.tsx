// =============================================================
// NZM JKR TOP UP ERP — Subscriptions Analytics & Reports Module (Enterprise Grade)
// =============================================================

import React, { useState, useMemo, useEffect } from 'react';
import { CustomerSubscription, SubscriptionPayment, SubscriptionPlan } from '../../types/subscription.types';
import { Customer } from '../../types/customer.types';
import { db } from '../../database/db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TablePagination } from '../../components/common/TablePagination';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';
import { exportToExcel } from '../../utils/excelExport';
import { ReportEngine } from '../../services/reporting/reportEngine';
import { ReportConfig } from '../../services/reporting/reportTypes';
import {
  SubscriptionFilterCriteria,
  INITIAL_SUBSCRIPTION_FILTER_CRITERIA,
  SubscriptionSortField,
  filterSubscriptionsEngine,
  sortSubscriptionsEngine,
  countActiveSubscriptionFilters,
  getSavedSubscriptionPresets,
  SavedSubscriptionPreset
} from '../../services/subscription/subscriptionFilterEngine';
import { AdvancedSubscriptionFilterDrawer } from '../../components/subscriptions/AdvancedSubscriptionFilterDrawer';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
  Printer,
  FileText,
  PieChart,
  Layers,
  Sparkles,
  CheckCircle2,
  Filter,
  Search,
  RotateCcw,
  ArrowUpDown,
  Bookmark,
  FileSpreadsheet,
  X,
  CreditCard,
  RefreshCw,
  Eye,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

export const SubscriptionsReports: React.FC = () => {
  // 1. Raw Data State
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>(() => db.getSubscriptions());
  const [payments, setPayments] = useState<SubscriptionPayment[]>(() => db.getSubscriptionPayments());
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => db.getSubscriptionPlans());
  const [customers, setCustomers] = useState<Customer[]>(() => db.getCustomers());

  // 2. Filter & Sort State
  const [filterCriteria, setFilterCriteria] = useState<SubscriptionFilterCriteria>(() => {
    // Check if there is a default preset
    const presets = getSavedSubscriptionPresets();
    const def = presets.find(p => p.isDefault);
    return def ? def.criteria : INITIAL_SUBSCRIPTION_FILTER_CRITERIA;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SubscriptionSortField>('createdAt_desc');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [savedPresets, setSavedPresets] = useState<SavedSubscriptionPreset[]>(() => getSavedSubscriptionPresets());

  // 3. Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // 4. Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Debounced Live Search synchronization
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterCriteria(prev => ({ ...prev, search: searchQuery }));
      setCurrentPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Precomputed Maps for Quick Lookups
  const customersMap = useMemo(() => {
    const map: Record<string, Customer> = {};
    customers.forEach(c => { map[c.id] = c; });
    return map;
  }, [customers]);

  const paymentsMap = useMemo(() => {
    const map: Record<string, SubscriptionPayment[]> = {};
    payments.forEach(p => {
      if (!map[p.subscriptionId]) map[p.subscriptionId] = [];
      map[p.subscriptionId].push(p);
    });
    return map;
  }, [payments]);

  // Distinct Categories & Employees for Filters
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    plans.forEach(p => { if (p.category) set.add(p.category); });
    subscriptions.forEach(s => { if (s.planCategory) set.add(s.planCategory); });
    return Array.from(set);
  }, [plans, subscriptions]);

  const availableEmployees = useMemo(() => {
    const set = new Set<string>();
    subscriptions.forEach(s => { if (s.createdBy) set.add(s.createdBy); });
    payments.forEach(p => { if (p.employeeName) set.add(p.employeeName); });
    return Array.from(set);
  }, [subscriptions, payments]);

  // 5. Engine Filtering & Sorting
  const filteredSubscriptions = useMemo(() => {
    return filterSubscriptionsEngine(subscriptions, filterCriteria, {
      customersMap,
      paymentsMap
    });
  }, [subscriptions, filterCriteria, customersMap, paymentsMap]);

  const filteredAndSortedSubscriptions = useMemo(() => {
    return sortSubscriptionsEngine(filteredSubscriptions, sortBy);
  }, [filteredSubscriptions, sortBy]);

  // Paginated View
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedSubscriptions.slice(start, start + pageSize);
  }, [filteredAndSortedSubscriptions, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedSubscriptions.length / pageSize) || 1;
  const activeFiltersCount = useMemo(() => countActiveSubscriptionFilters(filterCriteria), [filterCriteria]);

  // 6. Dynamic Financial & Operational KPI Summary
  const summary = useMemo(() => {
    const subIds = new Set(filteredSubscriptions.map(s => s.id));
    const relatedPayments = payments.filter(p => subIds.has(p.subscriptionId) && p.status === 'completed');

    const totalRevenue = filteredSubscriptions.reduce((sum, s) => sum + (s.finalPrice || 0), 0);
    const totalCost = filteredSubscriptions.reduce((sum, s) => sum + (s.costPrice || 0), 0);
    const totalProfit = filteredSubscriptions.reduce((sum, s) => sum + (s.netProfit !== undefined ? s.netProfit : (s.finalPrice - s.costPrice)), 0);
    const totalCount = filteredSubscriptions.length;
    const activeCount = filteredSubscriptions.filter(s => s.status === 'active' || s.status === 'expiring_soon').length;
    const expiredCount = filteredSubscriptions.filter(s => s.status === 'expired').length;
    const renewalCount = filteredSubscriptions.filter(s => s.renewalCount > 0).length;
    const renewalRate = totalCount > 0 ? Math.round((renewalCount / totalCount) * 100) : 0;
    const avgRevenuePerUser = activeCount > 0 ? Math.round(totalRevenue / activeCount) : 0;
    const totalDiscounts = filteredSubscriptions.reduce((sum, s) => sum + (s.discountAmount || 0), 0);

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalCount,
      activeCount,
      expiredCount,
      renewalCount,
      renewalRate,
      avgRevenuePerUser,
      totalDiscounts
    };
  }, [filteredSubscriptions, payments]);

  // 7. Dynamic Plans Performance Breakdown based on filtered subscriptions
  const plansBreakdown = useMemo(() => {
    const map: Record<string, { name: string; category: string; count: number; revenue: number; profit: number }> = {};
    filteredSubscriptions.forEach(s => {
      const pId = s.planId || s.planName;
      if (!map[pId]) {
        map[pId] = { name: s.planName, category: s.planCategory || 'خدمات', count: 0, revenue: 0, profit: 0 };
      }
      map[pId].count += 1;
      map[pId].revenue += (s.finalPrice || 0);
      map[pId].profit += (s.netProfit !== undefined ? s.netProfit : ((s.finalPrice || 0) - (s.costPrice || 0)));
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSubscriptions]);

  // 8. Exports (Excel, CSV, Print)
  const handleExportExcel = () => {
    const exportData = filteredAndSortedSubscriptions.map(s => ({
      'رقم الاشتراك': s.subscriptionNumber,
      'العميل': s.customerName,
      'الهاتف': s.customerPhone,
      'كود العميل': s.customerCode || '—',
      'الباقة': s.planName,
      'التصنيف': s.planCategory || '—',
      'المدة': `${s.durationValue} ${s.durationUnit}`,
      'تاريخ البدء': formatDate(s.startDate),
      'تاريخ الانتهاء': formatDate(s.endDate),
      'سعر الباقة (ج)': s.originalPrice,
      'الخصم (ج)': s.discountAmount || 0,
      'المبلغ المدفوع (ج)': s.finalPrice,
      'التكلفة (ج)': s.costPrice,
      'صافي الربح (ج)': s.netProfit,
      'وسيلة الدفع': s.paymentMethod,
      'حالة الدفع': s.paymentStatus,
      'حالة الاشتراك': s.status,
      'مرات التجديد': s.renewalCount,
      'تجديد تلقائي': s.autoRenew ? 'نعم' : 'لا',
      'كود الكوبون': s.couponCode || '—',
      'الموظف': s.createdBy || '—',
      'تاريخ الحجز': formatDateTime(s.createdAt)
    }));

    exportToExcel(exportData, `subscriptions_report_filtered_${Date.now()}`);
  };

  const handleExportCSV = () => {
    let csv = '\uFEFF'; // UTF-8 BOM for Arabic compatibility
    csv += 'رقم الاشتراك,العميل,الهاتف,كود العميل,الباقة,التصنيف,المدة,تاريخ البدء,تاريخ الانتهاء,المدفوع ج,التكلفة ج,صافي الربح ج,الخصم ج,وسيلة الدفع,حالة الدفع,الحالة,مرات التجديد,الموظف\n';
    filteredAndSortedSubscriptions.forEach(s => {
      csv += `"${s.subscriptionNumber}","${s.customerName}","${s.customerPhone}","${s.customerCode || ''}","${s.planName}","${s.planCategory || ''}","${s.durationValue} ${s.durationUnit}","${formatDate(s.startDate)}","${formatDate(s.endDate)}",${s.finalPrice},${s.costPrice},${s.netProfit},${s.discountAmount || 0},"${s.paymentMethod}","${s.paymentStatus}","${s.status}",${s.renewalCount || 0},"${s.createdBy || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `subscriptions_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const config: ReportConfig = {
      startDate: filterCriteria.startDate || '',
      endDate: filterCriteria.endDate || '',
      reportType: 'detailed',
      showProfits: true,
      showCosts: true,
      showExpenses: true,
      showLogo: true,
      showUserData: true,
      showPageNumbers: true,
      showManagerSignature: true,
      orientation: 'landscape'
    };
    const doc = ReportEngine.generateReportDocument('subscriptions', config);
    ReportEngine.printReportDocument(doc, config);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">🟢 نشط</span>;
      case 'expiring_soon':
        return <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px]">⏳ سينتهي قريباً</span>;
      case 'expired':
        return <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px]">🔴 منتهي</span>;
      case 'renewed':
        return <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px]">🔄 مجدد</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-lg bg-zinc-500/10 text-zinc-500 font-bold text-[10px]">✖️ ملغي</span>;
      case 'frozen':
        return <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold text-[10px]">❄️ مجمد</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg bg-zinc-500/10 text-zinc-500 font-bold text-[10px]">{status}</span>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs" dir="rtl">
      {/* 1. Top Action & Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white dark:bg-[#121215] p-3.5 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs">
        {/* Live Search Input across all fields */}
        <div className="relative w-full lg:w-80">
          <input
            type="text"
            placeholder="بحث فوري: العميل، الهاتف، الكود، الباقة، الفاتورة..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl py-2 pr-9 pl-4 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-pink-500 transition-all font-sans"
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
                ? 'bg-pink-600 text-white border-pink-600 shadow-sm shadow-pink-600/20'
                : 'bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:border-pink-500'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>الفلاتر المتقدمة</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-pink-600 font-mono text-[10px] font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sort By Dropdown (10 dimensions) */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SubscriptionSortField)}
              className="bg-transparent text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none cursor-pointer"
            >
              <option value="createdAt_desc">الأحدث أولاً (تاريخ الإنشاء)</option>
              <option value="createdAt_asc">الأقدم أولاً</option>
              <option value="profit_desc">الأعلى ربحاً (تنازلي)</option>
              <option value="profit_asc">الأقل ربحاً</option>
              <option value="price_desc">الأعلى قيمة / سعر</option>
              <option value="price_asc">الأقل قيمة</option>
              <option value="sales_desc">الأعلى تكراراً / تجديداً</option>
              <option value="sales_asc">الأقل تجديداً</option>
              <option value="customerName_asc">حسب اسم العميل (أ - ي)</option>
              <option value="planName_asc">حسب اسم الباقة (أ - ي)</option>
            </select>
          </div>

          {/* Reset Filters Shortcut */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilterCriteria(INITIAL_SUBSCRIPTION_FILTER_CRITERIA);
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

          {/* Export to Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 hover:border-emerald-500 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Excel ({filteredAndSortedSubscriptions.length})</span>
          </button>

          {/* Export to CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-teal-500 hover:border-teal-500 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-500" />
            <span>CSV</span>
          </button>

          {/* Print / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-pink-500 hover:border-pink-500 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-pink-500" />
            <span>طباعة / PDF</span>
          </button>

          {/* Official Report Generator Modal */}
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>تقرير رسمي</span>
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
                  <Bookmark className="w-3 h-3 text-pink-500" /> الفلاتر المحفوظة:
                </span>
                {savedPresets.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setFilterCriteria(preset.criteria);
                      setSearchQuery(preset.criteria.search || '');
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-600 dark:text-pink-400 text-[10px] font-bold hover:bg-pink-500 hover:text-white transition-all cursor-pointer"
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
              <span className="px-2.5 py-0.5 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-600 dark:text-pink-400 text-[10px] font-bold flex items-center gap-1">
                <span>{activeFiltersCount} فلتر نشط ({filteredSubscriptions.length} نتيجة)</span>
                <button
                  type="button"
                  title="مسح الفلاتر"
                  onClick={() => {
                    setFilterCriteria(INITIAL_SUBSCRIPTION_FILTER_CRITERIA);
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

      {/* 3. Top Summary KPI Cards (Synchronized with Filter Results) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <span className="text-[11px] text-zinc-500 font-bold block">إجمالي إيرادات المبيعات (المفلترة)</span>
          <span className="text-xl font-black text-emerald-500 font-mono mt-0.5 block">
            {formatCurrency(summary.totalRevenue)}
          </span>
          <div className="text-[10px] text-zinc-400 mt-1">
            تكلفة التزويد: <span className="font-mono text-zinc-600 dark:text-zinc-300 font-bold">{formatCurrency(summary.totalCost)}</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <span className="text-[11px] text-zinc-500 font-bold block">صافي الأرباح المحققة</span>
          <span className={`text-xl font-black font-mono mt-0.5 block ${summary.totalProfit >= 0 ? 'text-pink-600 dark:text-pink-400' : 'text-rose-500'}`}>
            {summary.totalProfit >= 0 ? '+' : ''}{formatCurrency(summary.totalProfit)}
          </span>
          <div className="text-[10px] text-emerald-500 font-bold mt-1">
            هامش ربح: {summary.totalRevenue > 0 ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1) : 0}%
            {summary.totalDiscounts > 0 && <span className="text-zinc-400 font-normal mr-1.5">(خصومات: {formatCurrency(summary.totalDiscounts)})</span>}
          </div>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <span className="text-[11px] text-zinc-500 font-bold block">معدل التجديد (Retention)</span>
          <span className="text-xl font-black text-purple-500 font-mono mt-0.5 block">
            {summary.renewalRate}%
          </span>
          <div className="text-[10px] text-zinc-400 mt-1">
            من <span className="font-mono font-bold text-zinc-700 dark:text-zinc-200">{summary.totalCount}</span> اشتراك مطابق للفلترة
          </div>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <span className="text-[11px] text-zinc-500 font-bold block">متوسط الإيراد لكل مشترك (ARPU)</span>
          <span className="text-xl font-black text-cyan-500 font-mono mt-0.5 block">
            {formatCurrency(summary.avgRevenuePerUser)}
          </span>
          <div className="text-[10px] text-zinc-400 mt-1">
            على <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{summary.activeCount}</span> اشتراك نشط
          </div>
        </Card>
      </div>

      {/* 4. Detailed Plans Revenue & Performance Table (Synchronized) */}
      <Card className="p-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
          <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-pink-500" />
            <span>تفاصيل أداء وإيرادات الباقات (Plans Revenue Breakdown)</span>
          </h3>
          <Badge variant="pink">{plansBreakdown.length} باقة مطابقة</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <th className="py-2.5 px-3">اسم الباقة</th>
                <th className="py-2.5 px-3 text-center">التصنيف</th>
                <th className="py-2.5 px-3 text-center">عدد المشتركين</th>
                <th className="py-2.5 px-3 text-center">إجمالي الإيرادات</th>
                <th className="py-2.5 px-3 text-center">صافي الأرباح</th>
                <th className="py-2.5 px-3 text-center">نسبة المساهمة بالأرباح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {plansBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-zinc-400">
                    لا توجد باقات مطابقة لمعايير الفلترة الحالية
                  </td>
                </tr>
              ) : (
                plansBreakdown.map((item, idx) => {
                  const profitShare = summary.totalProfit > 0 ? ((item.profit / summary.totalProfit) * 100).toFixed(1) : 0;

                  return (
                    <tr key={idx} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">{item.name}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold text-[10px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">{item.count}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-500">
                        +{formatCurrency(item.profit)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-600 dark:text-purple-400">
                        {profitShare}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Main Filtered Subscriptions Audit Table */}
      <Card className="p-0 bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-200 dark:border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-pink-500" />
            <span className="font-black text-sm text-zinc-900 dark:text-zinc-100">
              سجل تفاصيل الاشتراكات والعمليات المحاسبية المفلترة
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 font-bold">
            عرض {paginatedSubscriptions.length} من أصل {filteredAndSortedSubscriptions.length} اشتراك
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <th className="py-3 px-3 text-center">رقم الاشتراك</th>
                <th className="py-3 px-3">العميل والاتصال</th>
                <th className="py-3 px-3">الباقة والتصنيف</th>
                <th className="py-3 px-3 text-center">الفترة والسريان</th>
                <th className="py-3 px-3 text-center">المبلغ المدفوع</th>
                <th className="py-3 px-3 text-center">التكلفة</th>
                <th className="py-3 px-3 text-center">صافي الربح</th>
                <th className="py-3 px-3 text-center">وسيلة وحالة الدفع</th>
                <th className="py-3 px-3 text-center">الحالة</th>
                <th className="py-3 px-3 text-center">الموظف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredAndSortedSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-400 space-y-2">
                    <AlertCircle className="w-8 h-8 text-pink-500 mx-auto" />
                    <p className="font-bold text-sm">لا توجد اشتراكات مطابقة للبحث والفلاتر المحددة</p>
                    <p className="text-[11px]">جرب إعادة تعيين الفلاتر أو تغيير نطاق البحث</p>
                  </td>
                </tr>
              ) : (
                paginatedSubscriptions.map(sub => {
                  const profit = sub.netProfit !== undefined ? sub.netProfit : ((sub.finalPrice || 0) - (sub.costPrice || 0));

                  return (
                    <tr key={sub.id} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      {/* 1. Subscription Number */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                          {sub.subscriptionNumber}
                        </span>
                      </td>

                      {/* 2. Customer Name & Phone */}
                      <td className="py-3 px-3">
                        <div className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                          {sub.customerName}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          {sub.customerPhone} {sub.customerCode ? `• كود: ${sub.customerCode}` : ''}
                        </div>
                      </td>

                      {/* 3. Plan & Category */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          {sub.planName}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-pink-500/10 text-pink-600 dark:text-pink-400 text-[10px]">
                            {sub.planCategory || 'خدمات'}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {sub.durationValue} {sub.durationUnit}
                          </span>
                        </div>
                      </td>

                      {/* 4. Duration & Dates */}
                      <td className="py-3 px-3 text-center font-mono text-[11px]">
                        <div className="text-zinc-700 dark:text-zinc-300">
                          {formatDate(sub.startDate)}
                        </div>
                        <div className="text-zinc-400 text-[10px]">
                          إلى: {formatDate(sub.endDate)}
                        </div>
                      </td>

                      {/* 5. Final Price */}
                      <td className="py-3 px-3 text-center font-mono font-black text-xs text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(sub.finalPrice)}
                        {sub.discountAmount > 0 && (
                          <div className="text-[9px] text-rose-500 font-normal">
                            خصم: {formatCurrency(sub.discountAmount)}
                          </div>
                        )}
                      </td>

                      {/* 6. Cost Price */}
                      <td className="py-3 px-3 text-center font-mono text-xs text-zinc-500">
                        {formatCurrency(sub.costPrice)}
                      </td>

                      {/* 7. Net Profit */}
                      <td className="py-3 px-3 text-center font-mono font-black text-xs">
                        <span className={profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                        </span>
                      </td>

                      {/* 8. Payment Method & Status */}
                      <td className="py-3 px-3 text-center">
                        <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                          {sub.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' :
                           sub.paymentMethod === 'instapay' ? 'إنستاباي' :
                           sub.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' :
                           sub.paymentMethod === 'customer_wallet' ? 'رصيد العميل' : 'كاش بالخزينة'}
                        </div>
                        <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          sub.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                          sub.paymentStatus === 'partial' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {sub.paymentStatus === 'paid' ? 'مدفوع بالكامل' :
                           sub.paymentStatus === 'partial' ? 'مدفوع جزئياً' : 'معلق / غير مدفوع'}
                        </span>
                      </td>

                      {/* 9. Lifecycle Status */}
                      <td className="py-3 px-3 text-center">
                        {getStatusBadge(sub.status)}
                        {sub.renewalCount > 0 && (
                          <div className="text-[9px] text-purple-400 font-mono mt-0.5">
                            تجديد: {sub.renewalCount}
                          </div>
                        )}
                      </td>

                      {/* 10. Employee */}
                      <td className="py-3 px-3 text-center text-zinc-500 text-[11px]">
                        {sub.createdBy || 'النظام'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Totals Row */}
            {filteredAndSortedSubscriptions.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50/80 dark:bg-[#18181B] font-bold border-t-2 border-gray-200 dark:border-[#27272A] text-zinc-800 dark:text-zinc-200">
                  <td colSpan={4} className="py-3 px-3 text-left">
                    <span>إجمالي السجلات المفلترة ({filteredAndSortedSubscriptions.length} اشتراك):</span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-emerald-500 text-xs">
                    {formatCurrency(summary.totalRevenue)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-zinc-500 text-xs">
                    {formatCurrency(summary.totalCost)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-pink-600 dark:text-pink-400 text-xs">
                    +{formatCurrency(summary.totalProfit)}
                  </td>
                  <td colSpan={3} className="py-3 px-3 text-center text-[11px] text-zinc-400">
                    هامش ربح إجمالي: {summary.totalRevenue > 0 ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Table Pagination Controls */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedSubscriptions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={newSize => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          labelName="اشتراك"
        />
      </Card>

      {/* 6. Advanced Filter Drawer (Slide-Over Accordion Suite) */}
      <AdvancedSubscriptionFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        criteria={filterCriteria}
        onApplyCriteria={newCrit => {
          setFilterCriteria(newCrit);
          setCurrentPage(1);
        }}
        onResetCriteria={() => {
          setFilterCriteria(INITIAL_SUBSCRIPTION_FILTER_CRITERIA);
          setSearchQuery('');
          setCurrentPage(1);
        }}
        totalMatchedCount={filteredSubscriptions.length}
        availablePlans={plans}
        availableCategories={availableCategories}
        availableEmployees={availableEmployees}
      />

      {/* 7. Official Report Generator Modal */}
      {isReportModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          defaultTemplateType="subscriptions"
          customPayload={filteredAndSortedSubscriptions}
        />
      )}
    </div>
  );
};
