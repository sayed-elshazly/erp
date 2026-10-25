import React, { useState, useMemo } from 'react';
import { GameAccountAsset } from '../../types/middleman.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { SearchableSelect, SearchableSelectOption } from '../../components/common/SearchableSelect';
import { MiddlemanAccountSellModal } from './MiddlemanAccountSellModal';
import { MiddlemanInvoiceModal } from './MiddlemanInvoiceModal';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';
import { exportToExcel } from '../../utils/excelExport';
import { getGameBadgeStyle } from '../../utils/gameBadgeColors';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Award,
  CheckCircle2,
  Printer,
  Download,
  Eye,
  FileText,
  Gamepad2,
  MessageCircle,
  Copy,
  Calendar,
  CalendarDays,
  Layers,
  Sparkles,
  ArrowUpRight,
  Store,
  RotateCcw,
  PackageCheck,
  PackageX,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';

export const MiddlemanSalesList: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Load all accounts
  const [accounts, setAccounts] = useState<GameAccountAsset[]>(() => db.getMiddlemanAccounts());

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'available' | 'low_stock' | 'out_of_stock'>('all');
  
  // Date Filter State
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedAccountForInvoice, setSelectedAccountForInvoice] = useState<GameAccountAsset | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const loadData = () => {
    setAccounts(db.getMiddlemanAccounts());
  };

  // Distinct Games for SearchableSelect
  const gameOptions = useMemo<SearchableSelectOption[]>(() => {
    const rawGames = Array.from(new Set(accounts.map(a => a.gameName?.trim()).filter(Boolean))) as string[];
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
  }, [accounts]);

  // Extract all sales records across accounts
  const allSales = useMemo(() => {
    const records: { account: GameAccountAsset; sale: NonNullable<GameAccountAsset['saleRecord']> }[] = [];
    accounts.forEach(acc => {
      if (acc.salesHistory && acc.salesHistory.length > 0) {
        acc.salesHistory.forEach(s => records.push({ account: acc, sale: s }));
      } else if (acc.saleRecord) {
        records.push({ account: acc, sale: acc.saleRecord });
      }
    });
    return records.sort((a, b) => new Date(b.sale.soldAt).getTime() - new Date(a.sale.soldAt).getTime());
  }, [accounts]);

  const availableAccountsCount = useMemo(() => {
    return accounts.filter(a => (a.availableQuantity === undefined || a.availableQuantity > 0) && a.status !== 'sold').length;
  }, [accounts]);

  // Filtered Sales Records
  const filteredSales = useMemo(() => {
    return allSales.filter(({ account: item, sale }) => {
      const qty = item.availableQuantity !== undefined ? item.availableQuantity : (item.status === 'sold' ? 0 : 1);

      // 1. Status Filter
      if (selectedStatusFilter === 'available' && qty <= 0) return false;
      if (selectedStatusFilter === 'low_stock' && (qty <= 0 || qty > 2)) return false;
      if (selectedStatusFilter === 'out_of_stock' && qty > 0) return false;

      // 2. Game Filter
      if (selectedGameFilter !== 'all' && item.gameName !== selectedGameFilter) return false;

      // 3. Date Filter
      if (dateFilterMode === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (!sale.soldAt.startsWith(todayStr)) return false;
      } else if (dateFilterMode === 'yesterday') {
        const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (!sale.soldAt.startsWith(yesterdayStr)) return false;
      } else if (dateFilterMode === 'this_week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime();
        if (new Date(sale.soldAt).getTime() < weekAgo) return false;
      } else if (dateFilterMode === 'this_month') {
        const thisMonthStr = new Date().toISOString().substring(0, 7);
        if (!sale.soldAt.startsWith(thisMonthStr)) return false;
      } else if (dateFilterMode === 'custom') {
        const saleDateStr = sale.soldAt.split('T')[0];
        if (customStartDate && saleDateStr < customStartDate) return false;
        if (customEndDate && saleDateStr > customEndDate) return false;
      }

      // 4. Search Query (Title, Code, Email, Game, Buyer, Seller)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchInv = sale.invoiceNumber.toLowerCase().includes(q);
        const matchAccCode = item.accountCode.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchEmail = Boolean(item.email && item.email.toLowerCase().includes(q));
        const matchGame = Boolean(item.gameName && item.gameName.toLowerCase().includes(q));
        const matchId = Boolean(item.accountIdentifier && item.accountIdentifier.toLowerCase().includes(q));
        const matchBuyer = sale.buyerName.toLowerCase().includes(q) || sale.buyerPhone.includes(q);
        const matchSeller = item.sellerName.toLowerCase().includes(q) || item.sellerPhone.includes(q);
        if (!matchInv && !matchAccCode && !matchTitle && !matchEmail && !matchGame && !matchId && !matchBuyer && !matchSeller) return false;
      }

      return true;
    });
  }, [
    allSales,
    selectedStatusFilter,
    selectedGameFilter,
    dateFilterMode,
    customStartDate,
    customEndDate,
    searchQuery
  ]);

  // KPIs Metrics
  const metrics = useMemo(() => {
    const totalSalesVolume = filteredSales.reduce((sum, item) => sum + (item.sale.salePriceEGP || 0), 0);
    const totalNetProfit = filteredSales.reduce((sum, item) => sum + (item.sale.netProfitEGP || 0), 0);
    const totalCost = filteredSales.reduce((sum, item) => sum + (item.sale.purchaseCostEGP || 0), 0);
    const count = filteredSales.length;
    const avgProfit = count > 0 ? totalNetProfit / count : 0;
    const profitMargin = totalSalesVolume > 0 ? (totalNetProfit / totalSalesVolume) * 100 : 0;

    return {
      totalSalesVolume,
      totalNetProfit,
      totalCost,
      count,
      avgProfit,
      profitMargin
    };
  }, [filteredSales]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredSales.map(({ account: item, sale: s }) => {
      return {
        'رقم الفاتورة': s.invoiceNumber,
        'تاريخ البيع': formatDateTime(s.soldAt),
        'كود الحساب': item.accountCode,
        'عنوان الحساب': item.title,
        'البريد الإلكتروني': item.email || '—',
        'معرف اللاعب': item.accountIdentifier || '—',
        'اللعبة': item.gameName,
        'المشتري': s.buyerName,
        'هاتف المشتري': s.buyerPhone,
        'تكلفة الشراء (ج)': s.purchaseCostEGP,
        'سعر البيع (ج)': s.salePriceEGP,
        'صافي الربح (ج)': s.netProfitEGP,
        'الموظف البائع': s.soldBy,
        'ملاحظات': s.notes || '—'
      };
    });

    exportToExcel(exportData, `account_sales_${Date.now()}`);
    showToast('success', 'تم التصدير', 'تم تصدير سجل مبيعات الحسابات إلى Excel بنجاح');
  };

  // Quick WhatsApp Share
  const handleWhatsAppShare = (account: GameAccountAsset) => {
    const sale = account.saleRecord;
    if (!sale) return;
    const phoneToUse = sale.buyerPhone.replace(/[^0-9]/g, '');
    const cleanPhone = phoneToUse.startsWith('0') ? '2' + phoneToUse : phoneToUse;
    const msg = encodeURIComponent(
      `🎉 تحية طيبة من *NZM JKR*\n\nتم تأكيد وإصدار فاتورة شراء الحساب رقم: *${sale.invoiceNumber}*\n🎮 اللعبة: ${account.gameName}\n📌 تفاصيل: ${account.title}\n💰 السعر المسدد: ${formatCurrency(sale.salePriceEGP)}\n\nمبروك الحساب الجديد ونتمنى لك تجربة لعب ممتعة! ★`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs" dir="rtl">
      {/* 1. Header & Quick KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Sales Volume */}
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">إجمالي مبيعات الحسابات</span>
            <span className="text-lg font-black text-emerald-500 font-mono">
              {formatCurrency(metrics.totalSalesVolume)}
            </span>
            <div className="text-[10px] text-zinc-400 mt-0.5">من {metrics.count} عملية بيع ناجحة</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        {/* Net Realized Profit */}
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">صافي الأرباح المحققة</span>
            <span className="text-lg font-black text-amber-500 font-mono">
              +{formatCurrency(metrics.totalNetProfit)}
            </span>
            <div className="text-[10px] text-emerald-500 font-bold mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> هامش الربح: {metrics.profitMargin.toFixed(1)}%
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        {/* Sold Accounts Count */}
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">عدد الحسابات المباعة</span>
            <span className="text-lg font-black text-purple-500 font-mono">{metrics.count} حساب</span>
            <div className="text-[10px] text-zinc-400 mt-0.5">عمليات بيع مكتملة وموثقة</div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </Card>

        {/* Average Profit per Sale */}
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">متوسط ربح العملية</span>
            <span className="text-lg font-black text-cyan-500 font-mono">
              +{formatCurrency(metrics.avgProfit)}
            </span>
            <div className="text-[10px] text-zinc-400 mt-0.5">لكل حساب مباع</div>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
        </Card>

        {/* Ready to Sell Assets in Warehouse */}
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">حسابات جاهزة للبيع</span>
            <span className="text-lg font-black text-blue-500 font-mono">{availableAccountsCount} حساب</span>
            <div className="text-[10px] text-zinc-400 mt-0.5">متاحة في المخزن حالياً</div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Store className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* 2. Top Actions & Comprehensive Filters Bar */}
      <Card className="p-4 bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] space-y-3 shadow-xs">
        {/* Top Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Main Search Input */}
          <div className="md:col-span-4">
            <Input
              placeholder="ابحث بالحساب، الكود، الإيميل، اللعبة، أو المشتري..."
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
              placeholder="اختر اللعبة..."
              allOptionLabel="كل الألعاب والمنصات"
            />
          </div>

          {/* Stock / Status Filter */}
          <div className="md:col-span-4 flex items-center gap-2">
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value as any)}
              className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-amber-500"
            >
              <option value="all">كل حالات المخزون</option>
              <option value="available">متاح للبيع (Available)</option>
              <option value="low_stock">كمية منخفضة (Low Stock ≤ 2)</option>
              <option value="out_of_stock">نفد / مباع بالكامل (Out of Stock)</option>
            </select>

            {/* Sell Account Primary Action */}
            <button
              type="button"
              onClick={() => setIsSellModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>بيع حساب</span>
            </button>
          </div>
        </div>

        {/* Date Filter Presets & Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
          {/* Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1 pl-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>الفلتر الزمني:</span>
            </span>

            <button
              type="button"
              onClick={() => setDateFilterMode('all')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                dateFilterMode === 'all'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:text-white'
              }`}
            >
              الكل
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('today')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                dateFilterMode === 'today'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:text-white'
              }`}
            >
              اليوم
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('yesterday')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                dateFilterMode === 'yesterday'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:text-white'
              }`}
            >
              أمس
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('this_week')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                dateFilterMode === 'this_week'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:text-white'
              }`}
            >
              هذا الأسبوع
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('this_month')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                dateFilterMode === 'this_month'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:text-white'
              }`}
            >
              هذا الشهر
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('custom')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                dateFilterMode === 'custom'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3 h-3" />
              <span>مخصص (تاريخين)</span>
            </button>
          </div>

          {/* Custom Date Inputs & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {dateFilterMode === 'custom' && (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <span className="text-[10px] text-zinc-400">من:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1 text-[11px] font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400">إلى:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1 text-[11px] font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
            )}

            {(searchQuery || selectedGameFilter !== 'all' || selectedStatusFilter !== 'all' || dateFilterMode !== 'all' || customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGameFilter('all');
                  setSelectedStatusFilter('all');
                  setDateFilterMode('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="px-2 py-1 rounded-xl text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة ضبط</span>
              </button>
            )}

            {/* Print Report */}
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-amber-500 hover:border-amber-500 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>تقرير المبيعات</span>
            </button>

            {/* Export to Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 hover:border-emerald-500 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>تصدير Excel ({filteredSales.length})</span>
            </button>
          </div>
        </div>
      </Card>

      {/* 3. Completed Sales Table */}
      <Card className="p-0 bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <th className="py-3 px-3.5">رقم الفاتورة والتاريخ</th>
                <th className="py-3 px-3.5">الحساب واللعبة</th>
                <th className="py-3 px-3.5">المشتري (العميل)</th>
                <th className="py-3 px-3.5 text-center">تكلفة الشراء</th>
                <th className="py-3 px-3.5 text-center">سعر البيع النهائي</th>
                <th className="py-3 px-3.5 text-center">صافي الربح</th>
                <th className="py-3 px-3.5 text-center">حالة المخزون</th>
                <th className="py-3 px-3.5 text-center">الموظف البائع</th>
                <th className="py-3 px-3.5 text-left">إجراءات الفاتورة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400 space-y-2">
                    <Store className="w-8 h-8 text-amber-500/50 mx-auto" />
                    <p className="font-bold text-sm">لا توجد عمليات بيع مسجلة مطابقة لمعايير الفلترة</p>
                    <p className="text-[11px]">اضغط على زر "بيع حساب" لبيع نسخة من المخزن وإصدار فاتورتها فورياً</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map(({ account, sale }) => {
                  const profitMargin = sale.salePriceEGP > 0 ? (sale.netProfitEGP / sale.salePriceEGP) * 100 : 0;
                  const qty = account.availableQuantity !== undefined ? account.availableQuantity : (account.status === 'sold' ? 0 : 1);

                  return (
                    <tr
                      key={`${account.id}_${sale.invoiceNumber}`}
                      className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Invoice Number & Date */}
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-black text-amber-500 text-xs">
                          #{sale.invoiceNumber}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          {formatDateTime(sale.soldAt)}
                        </div>
                      </td>

                      {/* Sold Account Details & Game Badge */}
                      <td className="py-3 px-3.5">
                        <div className="font-black text-zinc-900 dark:text-zinc-100 line-clamp-1">
                          {account.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] mt-1 flex-wrap font-mono">
                          <span className={`px-2 py-0.5 rounded-lg font-bold border text-[10px] ${getGameBadgeStyle(account.gameName)}`}>
                            🎮 {account.gameName}
                          </span>
                          <span className="text-zinc-500">#{account.accountCode}</span>
                          {account.accountIdentifier && (
                            <span className="text-zinc-400">ID: {account.accountIdentifier}</span>
                          )}
                        </div>
                      </td>

                      {/* Buyer */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-blue-600 dark:text-blue-400">
                          {sale.buyerName}
                        </div>
                        <div className="font-mono text-[10px] text-zinc-400">
                          {sale.buyerPhone}
                        </div>
                      </td>

                      {/* Purchase Cost */}
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-zinc-500">
                        {formatCurrency(sale.purchaseCostEGP)}
                      </td>

                      {/* Sale Price */}
                      <td className="py-3 px-3.5 text-center font-mono font-black text-zinc-900 dark:text-white text-xs">
                        {formatCurrency(sale.salePriceEGP)}
                      </td>

                      {/* Net Profit */}
                      <td className="py-3 px-3.5 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-xs inline-flex items-center gap-1">
                          +{formatCurrency(sale.netProfitEGP)}
                        </span>
                        <div className="text-[10px] text-emerald-500 font-bold mt-0.5">
                          ربح: {profitMargin.toFixed(0)}%
                        </div>
                      </td>

                      {/* Stock Status Badge */}
                      <td className="py-3 px-3.5 text-center font-mono">
                        {qty <= 0 ? (
                          <Badge variant="danger">نفد (0 متبقي)</Badge>
                        ) : qty <= 2 ? (
                          <Badge variant="warning">منخفض ({qty} متبقي)</Badge>
                        ) : (
                          <Badge variant="success">متوفر ({qty} متبقي)</Badge>
                        )}
                      </td>

                      {/* Sold By Employee */}
                      <td className="py-3 px-3.5 text-center font-bold text-zinc-600 dark:text-zinc-300">
                        {sale.soldBy || 'المدير العام'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Share */}
                          <button
                            type="button"
                            onClick={() => handleWhatsAppShare(account)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="إرسال إشعار الفاتورة عبر واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* View / Print Invoice Modal */}
                          <button
                            type="button"
                            onClick={() => setSelectedAccountForInvoice(account)}
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="عرض / طباعة / نسخ صورة الفاتورة"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>الفاتورة</span>
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

      {/* Sell Modal */}
      {isSellModalOpen && (
        <MiddlemanAccountSellModal
          isOpen={isSellModalOpen}
          onClose={() => setIsSellModalOpen(false)}
          onSoldSuccess={soldAcc => {
            loadData();
            setIsSellModalOpen(false);
            setSelectedAccountForInvoice(soldAcc);
          }}
        />
      )}

      {/* Invoice Modal */}
      {selectedAccountForInvoice && (
        <MiddlemanInvoiceModal
          isOpen={Boolean(selectedAccountForInvoice)}
          onClose={() => setSelectedAccountForInvoice(null)}
          account={selectedAccountForInvoice}
        />
      )}

      {/* Report Generator Modal */}
      {isReportModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          defaultTemplateType="sales"
          customPayload={filteredSales}
        />
      )}
    </div>
  );
};
