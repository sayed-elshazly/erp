import React, { useState, useMemo } from 'react';
import { GameAccountAsset, AccountAssetStatus } from '../../types/middleman.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { SearchableSelect, SearchableSelectOption } from '../../components/common/SearchableSelect';
import { MiddlemanAccountFormModal } from './MiddlemanAccountFormModal';
import { MiddlemanAccountSellModal } from './MiddlemanAccountSellModal';
import { MiddlemanInvoiceModal } from './MiddlemanInvoiceModal';
import { Modal } from '../../components/common/Modal';
import { getGameBadgeStyle } from '../../utils/gameBadgeColors';
import {
  Gamepad2,
  Plus,
  Search,
  Filter,
  ShoppingBag,
  DollarSign,
  Lock,
  Eye,
  Edit2,
  Trash2,
  Printer,
  Sparkles,
  Layers,
  LayoutGrid,
  List,
  CheckCircle2,
  TrendingUp,
  Archive,
  Star,
  Calendar,
  User,
  PackageCheck,
  PackageX,
  Boxes,
  RotateCcw,
  Film,
  Image as ImageIcon,
  Play,
  ChevronRight,
  ChevronLeft,
  X,
  Maximize2
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const MiddlemanAccountsInventory: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [accounts, setAccounts] = useState<GameAccountAsset[]>(() => db.getMiddlemanAccounts());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'available' | 'sold' | 'all'>('available');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Modals State
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<GameAccountAsset | null>(null);
  const [selectedAccountForSell, setSelectedAccountForSell] = useState<GameAccountAsset | null>(null);
  const [selectedAccountForInvoice, setSelectedAccountForInvoice] = useState<GameAccountAsset | null>(null);
  const [selectedAccountForMedia, setSelectedAccountForMedia] = useState<GameAccountAsset | null>(null);

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

  // Tab counts
  const counts = useMemo(() => {
    const available = accounts.filter(a => (a.availableQuantity === undefined || a.availableQuantity > 0) && a.status !== 'sold');
    const sold = accounts.filter(a => a.status === 'sold' || a.availableQuantity === 0);
    return {
      available: available.length,
      sold: sold.length,
      all: accounts.length
    };
  }, [accounts]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => {
      const isAvailable = (a.availableQuantity === undefined || a.availableQuantity > 0) && a.status !== 'sold';
      const isSold = a.status === 'sold' || a.availableQuantity === 0;

      // 1. Primary Section Tab
      if (activeTab === 'available' && !isAvailable) return false;
      if (activeTab === 'sold' && !isSold) return false;

      // 2. Game Filter
      if (selectedGameFilter !== 'all' && a.gameName !== selectedGameFilter) return false;

      // 3. Rating Filter
      if (selectedRatingFilter !== 'all' && a.rating !== selectedRatingFilter) return false;

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = a.accountCode.toLowerCase().includes(q);
        const matchTitle = a.title.toLowerCase().includes(q);
        const matchGame = a.gameName.toLowerCase().includes(q);
        const matchEmail = Boolean(a.email && a.email.toLowerCase().includes(q));
        const matchId = Boolean(a.accountIdentifier && a.accountIdentifier.toLowerCase().includes(q));
        const matchSeller = a.sellerName.toLowerCase().includes(q) || a.sellerPhone.includes(q);
        const matchBuyer = Boolean(
          (a.lastBuyerName && a.lastBuyerName.toLowerCase().includes(q)) ||
          (a.lastBuyerPhone && a.lastBuyerPhone.includes(q)) ||
          (a.saleRecord?.buyerName && a.saleRecord.buyerName.toLowerCase().includes(q)) ||
          (a.saleRecord?.buyerPhone && a.saleRecord.buyerPhone.includes(q))
        );
        if (!matchCode && !matchTitle && !matchGame && !matchEmail && !matchId && !matchSeller && !matchBuyer) return false;
      }

      return true;
    });
  }, [accounts, activeTab, selectedGameFilter, selectedRatingFilter, searchQuery]);

  // Warehouse Financial KPI Totals
  const warehouseKPIs = useMemo(() => {
    const available = accounts.filter(a => (a.availableQuantity === undefined || a.availableQuantity > 0) && a.status !== 'sold');
    const sold = accounts.filter(a => a.status === 'sold' || a.availableQuantity === 0);
    const totalInventoryCost = available.reduce((s, a) => s + ((a.purchaseCostEGP || 0) * (a.availableQuantity || 1)), 0);
    const expectedInventoryProfits = available.reduce((s, a) => s + ((a.expectedProfitEGP || 0) * (a.availableQuantity || 1)), 0);
    const realizedSoldProfits = accounts.reduce(
      (s, a) => s + (a.netRealizedProfitEGP || (a.actualSalePriceEGP ? a.actualSalePriceEGP - a.purchaseCostEGP : 0)),
      0
    );

    return {
      totalAvailable: available.length,
      totalSold: sold.length,
      totalInventoryCost,
      expectedInventoryProfits,
      realizedSoldProfits
    };
  }, [accounts]);

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الحساب من المخزن؟')) {
      db.deleteMiddlemanAccount(id);
      loadData();
      showToast('success', 'تم الحذف', 'تم حذف الحساب من المخزن');
    }
  };

  const getStatusBadge = (a: GameAccountAsset) => {
    const qty = a.availableQuantity !== undefined ? a.availableQuantity : (a.status === 'sold' ? 0 : 1);
    if (qty <= 0 || a.status === 'sold') {
      return <Badge variant="danger">مباع بالكامل (نفد)</Badge>;
    }
    if (qty <= 2) {
      return <Badge variant="warning">كمية منخفضة ({qty} متبقي)</Badge>;
    }
    return <Badge variant="success">متاح ({qty} نسخ)</Badge>;
  };

  const getRatingBadge = (r: string) => {
    switch (r) {
      case 'very_strong':
        return <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-black text-[10px]">قوي جداً ★</span>;
      case 'strong':
        return <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-bold text-[10px]">قوي</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-bold text-[10px]">متوسط</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-gray-500/10 text-zinc-400 font-bold text-[10px]">ضعيف</span>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs" dir="rtl">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-500/10 via-amber-500/5 to-transparent border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/20">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100">
                مخزن حسابات الألعاب (Game Accounts Assets)
              </h1>
              <Badge variant="purple" size="sm">{accounts.length} حسابات</Badge>
            </div>
            <p className="text-zinc-500 text-xs mt-0.5">
              مستودع الأصول الرقمية للحسابات المشتراة، تتبع تكلفة الأصل وسعر البيع المستهدف وصافي الأرباح المحققة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            icon={<ShoppingBag className="w-4 h-4" />}
            onClick={() => setSelectedAccountForSell(accounts.find(a => a.status === 'available') || null)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
          >
            بيع حساب الآن
          </Button>
          <Button
            variant="secondary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewAccountOpen(true)}
            className="cursor-pointer"
          >
            إضافة حساب للمخزن
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-bold block">قيمة بضاعة المخزن المتاحة (التكلفة)</span>
            <span className="text-base font-black text-zinc-900 dark:text-zinc-100 font-mono">
              {formatCurrency(warehouseKPIs.totalInventoryCost)}
            </span>
          </div>
          <Badge variant="warning" size="sm">{warehouseKPIs.totalAvailable} متاح</Badge>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-bold block">الأرباح المتوقعة عند تصريف المخزن</span>
            <span className="text-base font-black text-amber-500 font-mono">
              +{formatCurrency(warehouseKPIs.expectedInventoryProfits)}
            </span>
          </div>
          <TrendingUp className="w-5 h-5 text-amber-500" />
        </Card>

        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-bold block">صافي الأرباح المحققة من الحسابات المباعة</span>
            <span className="text-base font-black text-emerald-500 font-mono">
              +{formatCurrency(warehouseKPIs.realizedSoldProfits)}
            </span>
          </div>
          <Badge variant="success" size="sm">{warehouseKPIs.totalSold} مباع</Badge>
        </Card>
      </div>

      {/* Primary Section Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-gray-100 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] overflow-x-auto font-bold shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'available'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/5'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>الحسابات المتاحة للبيع</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">{counts.available}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sold')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'sold'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/5'
          }`}
        >
          <PackageX className="w-4 h-4" />
          <span>الحسابات المباعة (Sold Accounts)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">{counts.sold}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-zinc-400 hover:text-purple-400 hover:bg-purple-500/5'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>جميع الأصول بالمخزن</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">{counts.all}</span>
        </button>
      </div>

      {/* Search & Game Filter Bar */}
      <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="w-full md:w-80">
            <Input
              placeholder="ابحث بالحساب، الكود، اللعبة، الإيميل، البائع أو المشتري..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-zinc-400" />}
            />
          </div>

          <div className="w-full md:w-64">
            <SearchableSelect
              options={gameOptions}
              value={selectedGameFilter}
              onChange={setSelectedGameFilter}
              placeholder="اختر اللعبة..."
              allOptionLabel="كل الألعاب"
            />
          </div>

          {(searchQuery || selectedGameFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGameFilter('all');
              }}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-1 transition-all cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>

        <div className="flex items-center rounded-xl border border-gray-200 dark:border-[#27272A] overflow-hidden bg-gray-50 dark:bg-[#141417] p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
              viewMode === 'table' ? 'bg-white dark:bg-zinc-800 text-amber-500 shadow-xs' : 'text-zinc-400'
            }`}
            title="عرض كجدول"
          >
            <List className="w-3.5 h-3.5" />
            <span>جدول</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
              viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 text-amber-500 shadow-xs' : 'text-zinc-400'
            }`}
            title="عرض كبطاقات"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>بطاقات</span>
          </button>
        </div>
      </Card>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.length === 0 ? (
            <div className="col-span-full p-12 text-center text-zinc-400 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-2xl">
              <Archive className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <p className="font-bold text-sm">لا توجد حسابات مطابقة لمعايير البحث في هذا القسم</p>
            </div>
          ) : (
            filteredAccounts.map(account => {
              const qty = account.availableQuantity !== undefined ? account.availableQuantity : (account.status === 'sold' ? 0 : 1);
              const isAvailable = qty > 0 && account.status !== 'sold';
              const hasImages = account.images && account.images.length > 0;
              const hasVideo = Boolean(account.videoUrl);

              return (
                <Card
                  key={account.id}
                  className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-xs"
                >
                  <div className="space-y-2.5">
                    {/* Media Thumbnail Banner (If images exist) */}
                    {hasImages && (
                      <div
                        onClick={() => setSelectedAccountForMedia(account)}
                        className="relative aspect-video rounded-xl overflow-hidden bg-black/60 cursor-pointer group border border-gray-100 dark:border-zinc-800"
                      >
                        <img
                          src={account.images[0]}
                          alt={account.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-2">
                          <span className="px-2 py-0.5 rounded-md bg-black/70 text-white font-mono text-[10px] font-bold flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-amber-400" />
                            {account.images.length} صور
                          </span>
                          {hasVideo && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px] flex items-center gap-1">
                              <Film className="w-3 h-3" /> فيديو
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Top Badge & Rating */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-amber-500 text-xs">#{account.accountCode}</span>
                      <div className="flex items-center gap-1.5">
                        {getRatingBadge(account.rating)}
                        {getStatusBadge(account)}
                      </div>
                    </div>

                    {/* Title & Game */}
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-relaxed">
                        {account.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] mt-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-lg font-bold border text-[10px] ${getGameBadgeStyle(account.gameName)}`}>
                          🎮 {account.gameName}
                        </span>
                        {account.accountLevel && <span className="text-zinc-400">• {account.accountLevel}</span>}
                        {account.availableQuantity !== undefined && (
                          <span className="text-zinc-400 font-mono text-[10px]">
                            • الكمية: {account.availableQuantity} متوفر / {account.soldQuantity || 0} مباع
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Credentials / Security Info Box */}
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#27272A] space-y-1 text-[11px]">
                      {account.accountIdentifier && (
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">معرف اللاعب:</span>
                          <span className="font-mono font-bold text-zinc-200">{account.accountIdentifier}</span>
                        </div>
                      )}
                      {account.securityDetails && (
                        <div className="text-zinc-500 text-[10px] line-clamp-1">
                          🔒 {account.securityDetails}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                        <span>تم الشراء من:</span>
                        <span className="font-bold text-zinc-300">{account.sellerName}</span>
                      </div>
                      {account.lastBuyerName && (
                        <div className="flex items-center justify-between text-blue-400 text-[10px] pt-1 border-t border-gray-200 dark:border-zinc-800">
                          <span>آخر مشتري:</span>
                          <span className="font-bold">{account.lastBuyerName} ({formatDateTime(account.lastSoldAt || '')})</span>
                        </div>
                      )}
                    </div>

                    {/* Pricing Box */}
                    <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 grid grid-cols-2 gap-2 text-center font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">تكلفة الشراء</span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                          {formatCurrency(account.purchaseCostEGP)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block">
                          {!isAvailable ? 'سعر البيع الفعلي' : 'سعر البيع المتوقع'}
                        </span>
                        <span className="font-black text-amber-500 text-xs">
                          {formatCurrency(!isAvailable ? account.actualSalePriceEGP || 0 : account.expectedSellingPriceEGP)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-2 border-t border-gray-100 dark:border-[#27272A] flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {(hasImages || hasVideo) && (
                        <button
                          type="button"
                          onClick={() => setSelectedAccountForMedia(account)}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-colors"
                          title="استعراض وسائط الحساب (معرض الصور والفيديو)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedAccountForEdit(account)}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-colors"
                        title="تعديل الحساب"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(account.id)}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-rose-500 transition-colors"
                        title="حذف الحساب"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {(account.status === 'sold' || (account.soldQuantity && account.soldQuantity > 0)) && (
                        <button
                          type="button"
                          onClick={() => setSelectedAccountForInvoice(account)}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-blue-500 transition-colors"
                          title="عرض فاتورة البيع"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {isAvailable ? (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<ShoppingBag className="w-3 h-3" />}
                        onClick={() => setSelectedAccountForSell(account)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        بيع الحساب
                      </Button>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-emerald-500">
                        صافي الربح: +{formatCurrency(account.netRealizedProfitEGP || (account.actualSalePriceEGP ? account.actualSalePriceEGP - account.purchaseCostEGP : 0))}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card className="p-0 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            {activeTab === 'sold' ? (
              /* Specialized Sold Accounts Table */
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                    <th className="py-3 px-4">كود واسم الحساب</th>
                    <th className="py-3 px-4">اللعبة</th>
                    <th className="py-3 px-4">تاريخ البيع الأخير</th>
                    <th className="py-3 px-4">آخر مشترٍ</th>
                    <th className="py-3 px-4 text-center">مرات البيع</th>
                    <th className="py-3 px-4 text-center">سعر البيع</th>
                    <th className="py-3 px-4 text-center">صافي الربح</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-zinc-400 space-y-2">
                        <PackageX className="w-8 h-8 text-zinc-500 mx-auto" />
                        <p className="font-bold text-sm">لا توجد حسابات مباعة مطابقة للبحث</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map(account => (
                      <tr key={account.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-amber-500 block">#{account.accountCode}</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{account.title}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-lg font-bold border text-[10px] ${getGameBadgeStyle(account.gameName)}`}>
                            🎮 {account.gameName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                          {formatDateTime(account.lastSoldAt || account.saleRecord?.soldAt || account.updatedAt)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-blue-500 block">{account.lastBuyerName || account.saleRecord?.buyerName || 'عميل نقدي'}</span>
                          <span className="font-mono text-[10px] text-zinc-400">{account.lastBuyerPhone || account.saleRecord?.buyerPhone || '—'}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-zinc-300">
                          {account.soldQuantity || 1}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-zinc-200 font-bold">
                          {formatCurrency(account.actualSalePriceEGP || account.saleRecord?.salePriceEGP || account.expectedSellingPriceEGP)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-500 font-bold">
                          +{formatCurrency(account.netRealizedProfitEGP || (account.actualSalePriceEGP ? account.actualSalePriceEGP - account.purchaseCostEGP : 0))}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="danger">مباع بالكامل</Badge>
                        </td>
                        <td className="py-3 px-4 text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedAccountForInvoice(account)}
                              className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-blue-500 transition-colors"
                              title="عرض وطباعة فاتورة البيع"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedAccountForEdit(account)}
                              className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-500"
                              title="تعديل الحساب"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              /* Available & All Accounts Table */
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                    <th className="py-3 px-4">كود الحساب</th>
                    <th className="py-3 px-4">تفاصيل الحساب</th>
                    <th className="py-3 px-4">اللعبة</th>
                    <th className="py-3 px-4">البائع (المصدر)</th>
                    <th className="py-3 px-4 text-center">الكمية المتوفرة</th>
                    <th className="py-3 px-4 text-center">تكلفة الشراء</th>
                    <th className="py-3 px-4 text-center">سعر البيع المتوقع</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-zinc-400 space-y-2">
                        <PackageCheck className="w-8 h-8 text-zinc-500 mx-auto" />
                        <p className="font-bold text-sm">لا توجد حسابات مطابقة للبحث</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map(account => {
                      const qty = account.availableQuantity !== undefined ? account.availableQuantity : (account.status === 'sold' ? 0 : 1);
                      const isAvailable = qty > 0 && account.status !== 'sold';

                      return (
                        <tr key={account.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-amber-500">#{account.accountCode}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{account.title}</div>
                            {account.accountIdentifier && (
                              <div className="text-[10px] text-zinc-400 font-mono">ID: {account.accountIdentifier}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-lg font-bold border text-[10px] ${getGameBadgeStyle(account.gameName)}`}>
                              🎮 {account.gameName}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-zinc-800 dark:text-zinc-200">{account.sellerName}</div>
                            <div className="font-mono text-[10px] text-zinc-400">{account.sellerPhone}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            <span className={`px-2.5 py-1 rounded-xl text-xs ${qty > 0 ? 'bg-emerald-500/10 text-emerald-500 font-black' : 'bg-rose-500/10 text-rose-500'}`}>
                              {qty} نسخ
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-rose-500 font-bold">
                            {formatCurrency(account.purchaseCostEGP)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-emerald-500 font-bold">
                            {formatCurrency(isAvailable ? account.expectedSellingPriceEGP : account.actualSalePriceEGP || 0)}
                          </td>
                          <td className="py-3 px-4 text-center">{getStatusBadge(account)}</td>
                          <td className="py-3 px-4 text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              {(account.images?.length > 0 || account.videoUrl) && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedAccountForMedia(account)}
                                  className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-500"
                                  title="استعراض وسائط الحساب (معرض الصور والفيديو)"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {isAvailable && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  icon={<ShoppingBag className="w-3 h-3" />}
                                  onClick={() => setSelectedAccountForSell(account)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                >
                                  بيع
                                </Button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedAccountForEdit(account)}
                                className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-amber-500"
                                title="تعديل الحساب"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* Add / Edit Account Modal */}
      {isNewAccountOpen && (
        <MiddlemanAccountFormModal
          isOpen={isNewAccountOpen}
          onClose={() => setIsNewAccountOpen(false)}
          onSuccess={() => loadData()}
        />
      )}

      {selectedAccountForEdit && (
        <MiddlemanAccountFormModal
          isOpen={Boolean(selectedAccountForEdit)}
          onClose={() => setSelectedAccountForEdit(null)}
          onSuccess={() => {
            loadData();
            setSelectedAccountForEdit(null);
          }}
          existingAccount={selectedAccountForEdit}
        />
      )}

      {/* Sell Account Modal */}
      {selectedAccountForSell && (
        <MiddlemanAccountSellModal
          isOpen={Boolean(selectedAccountForSell)}
          onClose={() => setSelectedAccountForSell(null)}
          account={selectedAccountForSell}
          onSoldSuccess={() => loadData()}
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

      {/* Media Gallery & Video Player Modal */}
      {selectedAccountForMedia && (
        <AccountMediaGalleryModal
          account={selectedAccountForMedia}
          onClose={() => setSelectedAccountForMedia(null)}
        />
      )}
    </div>
  );
};

// =============================================================
// SUB-COMPONENT: ACCOUNT MEDIA GALLERY MODAL
// =============================================================

interface AccountMediaGalleryModalProps {
  account: GameAccountAsset;
  onClose: () => void;
}

const AccountMediaGalleryModal: React.FC<AccountMediaGalleryModalProps> = ({ account, onClose }) => {
  const [activeTab, setActiveTab] = useState<'images' | 'video'>(
    account.images && account.images.length > 0 ? 'images' : 'video'
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const images = account.images || [];
  const hasImages = images.length > 0;
  const hasVideo = Boolean(account.videoUrl);

  const handleNext = () => {
    if (images.length === 0) return;
    setActiveImageIndex(prev => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    if (images.length === 0) return;
    setActiveImageIndex(prev => (prev - 1 + images.length) % images.length);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`معرض وسائط الحساب: ${account.title} (#${account.accountCode})`}
      subtitle={`اللعبة: ${account.gameName} • التكلفة: ${formatCurrency(account.purchaseCostEGP)} • المتوقع: ${formatCurrency(account.expectedSellingPriceEGP)}`}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-right" dir="rtl">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#27272A] pb-2">
          <div className="flex items-center gap-2">
            {hasImages && (
              <button
                type="button"
                onClick={() => setActiveTab('images')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'images'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-gray-100 dark:bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>معرض الصور ({images.length})</span>
              </button>
            )}
            {hasVideo && (
              <button
                type="button"
                onClick={() => setActiveTab('video')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'video'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>فيديو الاستعراض 🎥</span>
              </button>
            )}
          </div>
          <Badge variant="purple" size="sm">{account.accountCode}</Badge>
        </div>

        {/* Tab 1: Images Gallery */}
        {activeTab === 'images' && hasImages && (
          <div className="space-y-3">
            {/* Main Image Display */}
            <div className="relative aspect-video max-h-[440px] w-full bg-black/90 rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 flex items-center justify-center group shadow-lg">
              <img
                src={images[activeImageIndex]}
                alt={`Account media ${activeImageIndex + 1}`}
                className="w-full h-full object-contain"
              />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all cursor-pointer shadow-lg hover:scale-110"
                    title="الصورة السابقة"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all cursor-pointer shadow-lg hover:scale-110"
                    title="الصورة التالية"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </>
              )}

              <div className="absolute bottom-3 left-3 bg-black/70 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-white">
                {activeImageIndex + 1} / {images.length}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-amber-500 scale-105 shadow-md shadow-amber-500/20'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Video Player */}
        {activeTab === 'video' && hasVideo && (
          <div className="space-y-2">
            <div className="rounded-2xl overflow-hidden bg-black border border-purple-500/30 shadow-xl">
              <video
                src={account.videoUrl}
                controls
                autoPlay
                className="w-full max-h-[460px] object-contain"
              />
            </div>
            <p className="text-[11px] text-zinc-400 text-center">
              مشغل فيديو الحساب المباشر بدقة كاملة وبدون روابط خارجية
            </p>
          </div>
        )}

        {/* Empty State */}
        {!hasImages && !hasVideo && (
          <div className="p-8 text-center text-zinc-500">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-bold text-xs">لا توجد وسائط (صور أو فيديو) محفوظة لهذا الحساب</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
