// =============================================================
// NZM JKR TOP UP ERP — Middleman Deals List Module (V1.0)
// =============================================================

import React, { useState, useMemo, useEffect } from 'react';
import { MiddlemanDeal, MiddlemanDealStatus } from '../../types/middleman.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { SearchableSelect, SearchableSelectOption } from '../../components/common/SearchableSelect';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { MiddlemanDealFormModal } from './MiddlemanDealFormModal';
import { MiddlemanDealDetailsModal } from './MiddlemanDealDetailsModal';
import { MiddlemanInvoiceModal } from './MiddlemanInvoiceModal';
import { getGameBadgeStyle, getDealTypeBadgeStyle } from '../../utils/gameBadgeColors';
import {
  ShieldCheck,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Printer,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  User,
  ArrowUpDown,
  Coins,
  ShieldAlert,
  HelpCircle,
  FileText,
  Calendar,
  CalendarDays,
  Lock,
  RotateCcw,
  Sparkles,
  Gamepad2,
  Tag
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface MiddlemanDealsListProps {
  initialSelectedDealId?: string;
}

export const MiddlemanDealsList: React.FC<MiddlemanDealsListProps> = ({ initialSelectedDealId }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const isManagerOrAdmin = user?.role === 'admin';
  const [deals, setDeals] = useState<MiddlemanDeal[]>(() => db.getMiddlemanDeals(true));

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'all' | MiddlemanDealStatus>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');

  // Advanced Date Filter State (Unified DateRangeFilter)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals State
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [selectedDealForDetails, setSelectedDealForDetails] = useState<MiddlemanDeal | null>(null);
  const [selectedDealForEdit, setSelectedDealForEdit] = useState<MiddlemanDeal | null>(null);
  const [selectedDealForInvoice, setSelectedDealForInvoice] = useState<MiddlemanDeal | null>(null);

  // Auto-open deal details if navigated from notification
  useEffect(() => {
    if (initialSelectedDealId) {
      const found = deals.find(d => d.id === initialSelectedDealId);
      if (found) {
        setSelectedDealForDetails(found);
      }
    }
  }, [initialSelectedDealId, deals]);

  const loadData = () => {
    setDeals(db.getMiddlemanDeals(true));
  };

  const handleQuickStatusChange = (dealId: string, newStatus: MiddlemanDealStatus) => {
    const statusLabels: Record<MiddlemanDealStatus, string> = {
      new: 'جديدة',
      awaiting_transfer: 'بانتظار التحويل',
      awaiting_seller: 'بانتظار البائع',
      awaiting_buyer: 'بانتظار المشتري',
      in_progress: 'قيد التنفيذ',
      completed: 'مكتملة ومؤمنة',
      canceled: 'ملغاة',
      dispute: 'نزاع'
    };

    const targetDeal = deals.find(d => d.id === dealId);
    if (targetDeal?.status === 'completed' && !isManagerOrAdmin) {
      showToast('error', 'غير مصرح', 'لا يمكن إعادة فتح أو تغيير حالة الوساطة المكتملة إلا بواسطة المدير.');
      return;
    }

    const res = db.updateDealStatus(
      dealId,
      newStatus,
      `تغيير الحالة السريع إلى (${statusLabels[newStatus]})`,
      { id: user?.id, name: user?.fullName, role: user?.role }
    );

    if (res.success) {
      showToast('success', 'تم تحديث حالة الوساطة', `تم تغيير حالة الصفقة إلى "${statusLabels[newStatus]}" بنجاح.`);
      loadData();
      window.dispatchEvent(new Event('storage'));
    } else {
      showToast('error', 'فشل التحديث', res.message || 'حدث خطأ أثناء تعديل الحالة');
    }
  };

  // Distinct Games Collected Dynamically
  const gameOptions = useMemo<SearchableSelectOption[]>(() => {
    const rawGames = Array.from(new Set(deals.map(d => d.gameName?.trim()).filter(Boolean))) as string[];
    // Add default popular games if not already in list
    const defaults = ['PUBG Mobile', 'Free Fire', 'Valorant', 'EA FC 25', 'Roblox', 'League of Legends', 'GTA V'];
    defaults.forEach(def => {
      if (!rawGames.includes(def)) rawGames.push(def);
    });

    return [
      { value: 'all', label: 'كل الألعاب والمنصات' },
      ...rawGames.map(g => ({
        value: g,
        label: g,
        badge: '🎮',
        badgeClassName: getGameBadgeStyle(g)
      }))
    ];
  }, [deals]);

  // Deal Type Options
  const dealTypeOptions: SearchableSelectOption[] = [
    { value: 'all', label: 'كل أنواع الوساطات' },
    { value: 'account_sale', label: '🏷️ بيع حساب', badgeClassName: getDealTypeBadgeStyle('account_sale').badgeClass },
    { value: 'account_purchase', label: '🛒 شراء حساب', badgeClassName: getDealTypeBadgeStyle('account_purchase').badgeClass },
    { value: 'currency_sale', label: '💰 بيع عملات', badgeClassName: getDealTypeBadgeStyle('currency_sale').badgeClass },
    { value: 'currency_purchase', label: '💎 شراء عملات', badgeClassName: getDealTypeBadgeStyle('currency_purchase').badgeClass },
    { value: 'script_sale', label: '📜 بيع سكربت', badgeClassName: getDealTypeBadgeStyle('script_sale').badgeClass },
    { value: 'digital_product', label: '📦 منتج رقمي', badgeClassName: getDealTypeBadgeStyle('digital_product').badgeClass },
    { value: 'service', label: '⚡ خدمة شحن/دعم', badgeClassName: getDealTypeBadgeStyle('service').badgeClass },
    { value: 'other', label: '🛡️ وساطة أخرى', badgeClassName: getDealTypeBadgeStyle('other').badgeClass }
  ];

  // Filtered Deals with all criteria running harmoniously
  const filteredDeals = useMemo(() => {
    return deals.filter(d => {
      // 1. Status Tab
      if (selectedStatusTab !== 'all' && d.status !== selectedStatusTab) return false;

      // 2. Type Filter
      if (selectedTypeFilter !== 'all' && d.dealType !== selectedTypeFilter) return false;

      // 3. Game Filter
      if (selectedGameFilter !== 'all' && d.gameName !== selectedGameFilter) return false;

      // 4. Unified Date Filter
      const dealDateStr = d.createdAt.split('T')[0];
      if (startDate && dealDateStr < startDate) return false;
      if (endDate && dealDateStr > endDate) return false;

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = d.dealNumber.toLowerCase().includes(q);
        const matchTitle = d.title.toLowerCase().includes(q);
        const matchSeller = d.sellerName.toLowerCase().includes(q) || d.sellerPhone.includes(q);
        const matchBuyer = d.buyerName.toLowerCase().includes(q) || d.buyerPhone.includes(q);
        const matchExt = Boolean(d.externalMiddlemanName && d.externalMiddlemanName.toLowerCase().includes(q));
        const matchGame = Boolean(d.gameName && d.gameName.toLowerCase().includes(q));
        if (!matchNum && !matchTitle && !matchSeller && !matchBuyer && !matchExt && !matchGame) return false;
      }

      return true;
    });
  }, [
    deals,
    selectedStatusTab,
    selectedTypeFilter,
    selectedGameFilter,
    startDate,
    endDate,
    searchQuery
  ]);

  // Counts by status
  const statusCounts = useMemo(() => {
    return {
      all: deals.length,
      new: deals.filter(d => d.status === 'new').length,
      in_progress: deals.filter(d => ['awaiting_transfer', 'awaiting_seller', 'awaiting_buyer', 'in_progress'].includes(d.status)).length,
      completed: deals.filter(d => d.status === 'completed').length,
      dispute: deals.filter(d => d.status === 'dispute').length,
      canceled: deals.filter(d => d.status === 'canceled').length
    };
  }, [deals]);

  const getStatusBadge = (st: MiddlemanDealStatus) => {
    switch (st) {
      case 'new':
        return <Badge variant="warning">جديدة</Badge>;
      case 'awaiting_transfer':
        return <Badge variant="info">بانتظار التحويل</Badge>;
      case 'awaiting_seller':
        return <Badge variant="warning">بانتظار البائع</Badge>;
      case 'awaiting_buyer':
        return <Badge variant="info">بانتظار المشتري</Badge>;
      case 'in_progress':
        return <Badge variant="purple">قيد التنفيذ</Badge>;
      case 'completed':
        return <Badge variant="success">مكتملة ومؤمنة</Badge>;
      case 'canceled':
        return <Badge variant="danger">ملغاة</Badge>;
      case 'dispute':
        return <Badge variant="danger">نزاع قائم</Badge>;
      default:
        return <Badge variant="default">{st}</Badge>;
    }
  };

  const getDealTypeLabel = (dt: string) => {
    const map: Record<string, string> = {
      account_sale: 'بيع حساب',
      account_purchase: 'شراء حساب',
      currency_sale: 'بيع عملات',
      currency_purchase: 'شراء عملات',
      script_sale: 'بيع سكربت',
      digital_product: 'منتج رقمي',
      service: 'خدمة',
      other: 'أخرى'
    };
    return map[dt] || dt;
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs" dir="rtl">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100">
                صفقات وعمليات الوساطة والضمان (Escrow Deals)
              </h1>
              <Badge variant="warning" size="sm">{deals.length} عملية</Badge>
            </div>
            <p className="text-zinc-500 text-xs mt-0.5">
              إدارة غرف الوساطة، التحقق من الحسابات، تأمين التحويلات البنكية، وحساب عمولات الوسطاء الخارجيين والشركة.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewDealOpen(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
        >
          إنشاء وساطة جديدة (Ctrl+M)
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] overflow-x-auto font-bold shadow-xs">
        <button
          type="button"
          onClick={() => setSelectedStatusTab('all')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedStatusTab === 'all'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <span>الكل</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">{statusCounts.all}</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatusTab('new')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedStatusTab === 'new'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <span>جديدة</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">{statusCounts.new}</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatusTab('in_progress')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedStatusTab === 'in_progress'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <span>قيد التنفيذ</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">{statusCounts.in_progress}</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatusTab('completed')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedStatusTab === 'completed'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <span>مكتملة ومؤمنة</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">{statusCounts.completed}</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatusTab('dispute')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedStatusTab === 'dispute'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>نزاعات</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">{statusCounts.dispute}</span>
        </button>
      </div>

      {/* Search & Comprehensive Filters Bar */}
      <Card className="p-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3 shadow-xs">
        {/* Top Search & Dropdowns Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Main Search Input */}
          <div className="md:col-span-4">
            <Input
              placeholder="ابحث برقم الوساطة، العنوان، اللعبة، البائع، أو المشتري..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-zinc-400" />}
            />
          </div>

          {/* Searchable Game Filter */}
          <div className="md:col-span-4">
            <SearchableSelect
              options={gameOptions}
              value={selectedGameFilter}
              onChange={setSelectedGameFilter}
              placeholder="اختر اللعبة / المنصة..."
              allOptionLabel="كل الألعاب والمنصات"
            />
          </div>

          {/* Searchable Deal Type Filter */}
          <div className="md:col-span-4">
            <SearchableSelect
              options={dealTypeOptions}
              value={selectedTypeFilter}
              onChange={setSelectedTypeFilter}
              placeholder="نوع الوساطة..."
              allOptionLabel="كل أنواع الوساطات"
            />
          </div>
        </div>

        {/* Date Filter Bar Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onReset={() => { setStartDate(''); setEndDate(''); }}
            label="الفترة الزمنية للصفقات"
          />

          {(searchQuery || selectedGameFilter !== 'all' || selectedTypeFilter !== 'all' || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGameFilter('all');
                setSelectedTypeFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة تعيين الفلاتر</span>
            </button>
          )}
        </div>
      </Card>

      {/* Deals Table */}
      <Card className="p-0 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <th className="py-3 px-4">رقم الصفقة</th>
                <th className="py-3 px-4">تفاصيل العملية واللعبة</th>
                <th className="py-3 px-4">البائع (طرف أول)</th>
                <th className="py-3 px-4">المشتري (طرف ثانٍ)</th>
                <th className="py-3 px-4 text-center">قيمة الصفقة</th>
                <th className="py-3 px-4 text-center">عمولة الشركة</th>
                <th className="py-3 px-4 text-center">الوسيط الخارجي</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400 space-y-2">
                    <ShieldCheck className="w-8 h-8 text-amber-500/50 mx-auto" />
                    <p className="font-bold text-sm">لا توجد عمليات وساطة مطابقة لمعايير الفلترة</p>
                    <p className="text-[11px]">يمكنك إعادة ضبط الفلاتر أو إنشاء وساطة جديدة</p>
                  </td>
                </tr>
              ) : (
                filteredDeals.map(deal => {
                  const isCompleted = deal.status === 'completed';
                  const canEdit = isManagerOrAdmin || !isCompleted;

                  return (
                    <tr
                      key={deal.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Deal Number & Date */}
                      <td className="py-3 px-4 font-mono font-black text-amber-600 dark:text-amber-400">
                        <div>#{deal.dealNumber}</div>
                        <div className="text-[10px] text-zinc-400 font-normal">{formatDateTime(deal.createdAt)}</div>
                      </td>

                      {/* Title & Game Badge & Type Badge */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{deal.title}</div>
                        <div className="flex items-center gap-1.5 text-[10px] mt-1 flex-wrap">
                          {/* Deal Type Badge */}
                          <span className={`px-2 py-0.5 rounded-lg font-bold border ${getDealTypeBadgeStyle(deal.dealType, deal.customDealTypeLabel).badgeClass}`}>
                            {getDealTypeBadgeStyle(deal.dealType, deal.customDealTypeLabel).label}
                          </span>

                          {/* Game Badge */}
                          {deal.gameName && (
                            <span className={`px-2 py-0.5 rounded-lg font-bold border ${getGameBadgeStyle(deal.gameName)}`}>
                              🎮 {deal.gameName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Seller */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">{deal.sellerName}</div>
                        <div className="font-mono text-[10px] text-zinc-400">{deal.sellerPhone}</div>
                      </td>

                      {/* Buyer */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-blue-600 dark:text-blue-400">{deal.buyerName}</div>
                        <div className="font-mono text-[10px] text-zinc-400">{deal.buyerPhone}</div>
                      </td>

                      {/* Deal Value */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {deal.dealAmount} {deal.currency}
                        {deal.currency !== 'EGP' && (
                          <div className="text-[10px] text-zinc-400">({formatCurrency(deal.dealAmountEGP)})</div>
                        )}
                      </td>

                      {/* Company Commission */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-500">
                        +{formatCurrency(deal.netCompanyProfitEGP)}
                        <div className="text-[10px] text-zinc-400">
                          ({deal.companyCommissionValue}{deal.companyCommissionType === 'percentage' ? '%' : ' ج'})
                        </div>
                      </td>

                      {/* External Middleman */}
                      <td className="py-3 px-4 text-center">
                        {deal.hasExternalMiddleman ? (
                          <div>
                            <span className="font-bold text-purple-400 block">{deal.externalMiddlemanName}</span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {formatCurrency(deal.externalMiddlemanCommissionAmountEGP || 0)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Status with Quick Inline Changer */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          <select
                            value={deal.status}
                            disabled={isCompleted && !isManagerOrAdmin}
                            onChange={e => handleQuickStatusChange(deal.id, e.target.value as MiddlemanDealStatus)}
                            className={`px-2 py-1 rounded-xl text-xs font-bold border transition-all shadow-xs focus:outline-none ${
                              isCompleted && !isManagerOrAdmin ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'
                            } ${
                              deal.status === 'completed'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:border-emerald-500'
                                : deal.status === 'in_progress'
                                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40 hover:border-purple-500'
                                : deal.status === 'awaiting_transfer'
                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40 hover:border-blue-500'
                                : deal.status === 'awaiting_seller'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:border-amber-500'
                                : deal.status === 'awaiting_buyer'
                                ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/40 hover:border-cyan-500'
                                : deal.status === 'dispute'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 hover:border-rose-500'
                                : deal.status === 'canceled'
                                ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40 hover:border-red-500'
                                : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/40 hover:border-zinc-500'
                            }`}
                            title={isCompleted && !isManagerOrAdmin ? '🔒 لا يمكن تغيير الحالة للوساطة المكتملة إلا بواسطة المدير' : 'تغيير حالة الوساطة مباشرة'}
                          >
                            <option value="new" className="bg-white dark:bg-[#18181B] text-zinc-900 dark:text-white">🟡 جديدة</option>
                            <option value="awaiting_transfer" className="bg-white dark:bg-[#18181B] text-zinc-900 dark:text-white">🔵 بانتظار التحويل</option>
                            <option value="awaiting_seller" className="bg-white dark:bg-[#18181B] text-zinc-900 dark:text-white">🟠 بانتظار البائع</option>
                            <option value="awaiting_buyer" className="bg-white dark:bg-[#18181B] text-zinc-900 dark:text-white">🔷 بانتظار المشتري</option>
                            <option value="in_progress" className="bg-white dark:bg-[#18181B] text-zinc-900 dark:text-white">🟣 قيد التنفيذ</option>
                            <option value="completed" className="bg-white dark:bg-[#18181B] text-zinc-900 dark:text-white">🟢 مكتملة ومؤمنة</option>
                            <option value="dispute" className="bg-white dark:bg-[#18181B] text-zinc-900 dark:text-white">🔴 نزاع معلق</option>
                            <option value="canceled" className="bg-white dark:bg-[#18181B] text-zinc-900 dark:text-white">❌ ملغاة</option>
                          </select>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details Modal */}
                          <button
                            type="button"
                            onClick={() => setSelectedDealForDetails(deal)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-colors"
                            title="عرض تفاصيل وغرفة الوساطة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Invoice Modal */}
                          <button
                            type="button"
                            onClick={() => setSelectedDealForInvoice(deal)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-blue-500 transition-colors"
                            title="طباعة / تصدير فاتورة الوساطة"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Deal Modal */}
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => {
                              if (!canEdit) {
                                showToast('error', 'مغلقة', 'هذه الوساطة مكتملة ومؤمنة ولا يمكن تعديلها إلا بواسطة المدير.');
                                return;
                              }
                              setSelectedDealForEdit(deal);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              canEdit
                                ? 'bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 cursor-pointer'
                                : 'bg-gray-100/50 dark:bg-zinc-800/30 text-zinc-400 opacity-40 cursor-not-allowed'
                            }`}
                            title={canEdit ? 'تعديل بيانات الوساطة' : '🔒 مكتملة ومغلقة (تعديل المدير فقط)'}
                          >
                            {isCompleted && !isManagerOrAdmin ? (
                              <Lock className="w-3.5 h-3.5 text-zinc-400" />
                            ) : (
                              <Edit2 className="w-3.5 h-3.5" />
                            )}
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
      </Card>

      {/* New Deal Modal */}
      {isNewDealOpen && (
        <MiddlemanDealFormModal
          isOpen={isNewDealOpen}
          onClose={() => setIsNewDealOpen(false)}
          onSuccess={() => loadData()}
        />
      )}

      {/* Edit Deal Modal */}
      {selectedDealForEdit && (
        <MiddlemanDealFormModal
          isOpen={Boolean(selectedDealForEdit)}
          onClose={() => setSelectedDealForEdit(null)}
          onSuccess={() => {
            loadData();
            setSelectedDealForEdit(null);
          }}
          existingDeal={selectedDealForEdit}
        />
      )}

      {/* Details Timeline Modal */}
      {selectedDealForDetails && (
        <MiddlemanDealDetailsModal
          isOpen={Boolean(selectedDealForDetails)}
          onClose={() => setSelectedDealForDetails(null)}
          deal={selectedDealForDetails}
          onDealUpdated={() => loadData()}
        />
      )}

      {/* Invoice Modal */}
      {selectedDealForInvoice && (
        <MiddlemanInvoiceModal
          isOpen={Boolean(selectedDealForInvoice)}
          onClose={() => setSelectedDealForInvoice(null)}
          deal={selectedDealForInvoice}
        />
      )}
    </div>
  );
};
