import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Merchant, MerchantType, MerchantStatus } from '../../types/merchant.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTabs } from '../../context/TabsContext';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import { ContextMenu, ContextMenuItem } from '../../components/common/ContextMenu';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { MerchantFormModal } from './MerchantFormModal';
import { MerchantProfileModal } from './MerchantProfileModal';
import { MerchantInvoiceModal } from './MerchantInvoiceModal';
import {
  Store,
  Building2,
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  Eye,
  Edit2,
  Archive,
  RotateCcw,
  Phone,
  MessageSquare,
  Send,
  DollarSign,
  Receipt,
  Star,
  ExternalLink,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';

interface MerchantsListProps {
  initialSelectedMerchant?: Merchant | null;
}

export const MerchantsList: React.FC<MerchantsListProps> = ({ initialSelectedMerchant }) => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useNotifications();
  const { openTab } = useTabs();

  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [archivedMerchants, setArchivedMerchants] = useState<Merchant[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedTrustTier, setSelectedTrustTier] = useState<string>('all');
  const [hasDebtOnly, setHasDebtOnly] = useState<boolean>(false);
  const [onlyRisky, setOnlyRisky] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<
    'name' | 'balance' | 'totalSales' | 'totalPurchases' | 'createdAt' | 'trustScoreDesc' | 'trustScoreAsc' | 'trustScoreImproved' | 'trustScoreDeclined'
  >('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [merchantToEdit, setMerchantToEdit] = useState<Merchant | null>(null);
  const [selectedProfileMerchant, setSelectedProfileMerchant] = useState<Merchant | null>(null);
  const [merchantToArchive, setMerchantToArchive] = useState<Merchant | null>(null);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [invoiceMerchant, setInvoiceMerchant] = useState<Merchant | null>(null);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    isOpen: boolean;
    merchant: Merchant | null;
  }>({ x: 0, y: 0, isOpen: false, merchant: null });

  const loadData = () => {
    setMerchants(db.getMerchants(false));
    setArchivedMerchants(db.getArchivedMerchants());
    setTimeout(() => setLoading(false), 150);
  };

  useEffect(() => {
    loadData();
    if (initialSelectedMerchant) {
      setSelectedProfileMerchant(initialSelectedMerchant);
    }
  }, [initialSelectedMerchant]);

  // Event bus subscription for shortcuts
  useEffect(() => {
    const unsubNew = eventBus.subscribe(SYSTEM_EVENTS.TRIGGER_NEW, () => {
      setMerchantToEdit(null);
      setIsFormOpen(true);
    });

    const unsubSearch = eventBus.subscribe(SYSTEM_EVENTS.TRIGGER_SEARCH_FOCUS, () => {
      searchInputRef.current?.focus();
    });

    return () => {
      unsubNew();
      unsubSearch();
    };
  }, []);

  // Filtered List
  const filteredMerchants = useMemo(() => {
    return merchants
      .filter(m => {
        const q = searchQuery.toLowerCase().trim();
        const matchesQ =
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.companyName.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          (m.city && m.city.toLowerCase().includes(q));

        const matchesType = selectedType === 'all' || m.type === selectedType;
        const matchesStatus = selectedStatus === 'all' || m.status === selectedStatus;
        const matchesCity = selectedCity === 'all' || m.city === selectedCity;
        const matchesDebt = !hasDebtOnly || m.balance !== 0;

        const trust = m.trustScore || db.calculateMerchantTrustScore(m);
        const matchesTrustTier = selectedTrustTier === 'all' || trust.tier === selectedTrustTier;
        const matchesRisky = !onlyRisky || trust.score < 60;

        return matchesQ && matchesType && matchesStatus && matchesCity && matchesDebt && matchesTrustTier && matchesRisky;
      })
      .sort((a, b) => {
        const trustA = a.trustScore || db.calculateMerchantTrustScore(a);
        const trustB = b.trustScore || db.calculateMerchantTrustScore(b);

        if (sortBy === 'trustScoreDesc') return trustB.score - trustA.score;
        if (sortBy === 'trustScoreAsc') return trustA.score - trustB.score;
        if (sortBy === 'trustScoreImproved') return trustB.trendPercentage - trustA.trendPercentage;
        if (sortBy === 'trustScoreDeclined') return trustA.trendPercentage - trustB.trendPercentage;

        let valA: any = a[sortBy as keyof Merchant];
        let valB: any = b[sortBy as keyof Merchant];
        if (typeof valA === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [merchants, searchQuery, selectedType, selectedStatus, selectedCity, selectedTrustTier, hasDebtOnly, onlyRisky, sortBy, sortOrder]);

  const handleSaveMerchant = (merchantData: Partial<Merchant>) => {
    const isEdit = !!merchantToEdit;
    const obj: Merchant = {
      ...(merchantToEdit || {}),
      ...merchantData
    } as Merchant;

    db.saveMerchant(obj);
    db.logAction(
      { id: user?.id || 'sys', name: user?.fullName || 'مستخدم', role: user?.role || 'user', department: 'التجار' },
      isEdit ? 'edit' : 'add',
      'تاجر / مورد',
      obj.id,
      obj.name,
      isEdit ? 'تعديل بيانات التاجر في النظام' : 'إضافة تاجر جديد معتمد'
    );

    eventBus.publish(isEdit ? SYSTEM_EVENTS.MERCHANT_UPDATED : SYSTEM_EVENTS.MERCHANT_CREATED, obj);
    showToast('success', isEdit ? 'تم التعديل' : 'تمت الإضافة', `تم حفظ بيانات ${obj.name}`);
    setIsFormOpen(false);
    setMerchantToEdit(null);
    loadData();
  };

  const handleArchiveConfirm = () => {
    if (!merchantToArchive) return;
    const m = merchantToArchive;
    db.archiveMerchant(m.id);

    db.logAction(
      { id: user?.id || 'sys', name: user?.fullName || 'مستخدم', role: user?.role || 'user', department: 'التجار' },
      'archive',
      'تاجر / مورد',
      m.id,
      m.name,
      'أرشفة التاجر (Soft Delete)'
    );

    eventBus.publish(SYSTEM_EVENTS.MERCHANT_ARCHIVED, m);
    showToast('warning', 'تمت الأرشفة', `تم نقل التاجر ${m.name} للأرشيف`);
    setMerchantToArchive(null);
    loadData();
  };

  const handleRestoreMerchant = (id: string) => {
    db.restoreMerchant(id);
    showToast('success', 'تمت الاستعادة', 'تمت استعادة التاجر إلى القائمة النشطة');
    loadData();
  };

  // Right-Click Context Menu
  const handleRowContextMenu = (e: React.MouseEvent, merchant: Merchant) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      isOpen: true,
      merchant
    });
  };

  const contextMenuItems: ContextMenuItem[] = contextMenu.merchant
    ? [
        {
          id: 'ctx_view',
          label: 'عرض البروفايل الكامل',
          icon: <Eye className="w-4 h-4 text-blue-500" />,
          onClick: () => setSelectedProfileMerchant(contextMenu.merchant)
        },
        {
          id: 'ctx_invoice',
          label: 'إصدار فاتورة تجارية جديدة',
          icon: <Receipt className="w-4 h-4 text-emerald-500" />,
          onClick: () => setInvoiceMerchant(contextMenu.merchant)
        },
        {
          id: 'ctx_edit',
          label: 'تعديل البيانات',
          icon: <Edit2 className="w-4 h-4 text-amber-500" />,
          onClick: () => {
            setMerchantToEdit(contextMenu.merchant);
            setIsFormOpen(true);
          }
        },
        {
          id: 'ctx_whatsapp',
          label: 'فتح محادثة واتساب',
          icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
          onClick: () => {
            if (contextMenu.merchant?.whatsapp) {
              window.open(`https://wa.me/${contextMenu.merchant.whatsapp.replace(/\s+/g, '')}`, '_blank');
            }
          },
          divider: true
        },
        {
          id: 'ctx_archive',
          label: 'أرشفة التاجر (Soft Delete)',
          icon: <Archive className="w-4 h-4 text-rose-500" />,
          variant: 'danger',
          onClick: () => setMerchantToArchive(contextMenu.merchant)
        }
      ]
    : [];

  const handleExportExcel = () => {
    const data = filteredMerchants.map(m => ({
      'كود التاجر': m.code,
      'الاسم': m.name,
      'الشركة / المنشأة': m.companyName,
      'النوع': m.type,
      'الهاتف': m.phone,
      'واتساب': m.whatsapp || '—',
      'المدينة': m.city,
      'الدولة': m.country,
      'الرصيد ($)': m.balance,
      'الحد الائتماني ($)': m.creditLimit,
      'إجمالي المبيعات ($)': m.totalSales,
      'إجمالي المشتريات ($)': m.totalPurchases,
      'الأرباح ($)': m.totalProfits,
      'التقييم': `${m.performance?.starRating || 5.0} ⭐`,
      'الحالة': m.status
    }));

    exportToExcel(data, 'دليل_التجار_والموردين_JKR');
    showToast('info', 'تم التصدير', 'تم تصدير ملف Excel بنجاح');
  };

  return (
    <div className="space-y-4 animate-fade-in text-right">
      {/* Top Search & Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="بحث باسم التاجر، الشركة، الكود، الهاتف، أو المدينة (Ctrl+F)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-xs pr-10 pl-4 py-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
              />
            </div>

            <Button
              variant={showFilters ? 'primary' : 'outline'}
              size="sm"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              فلاتر متقدمة
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setMerchantToEdit(null);
                setIsFormOpen(true);
              }}
            >
              إضافة تاجر (Ctrl+N)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Archive className="w-4 h-4 text-amber-500" />}
              onClick={() => setIsArchivedModalOpen(true)}
            >
              الأرشيف ({archivedMerchants.length})
            </Button>

            <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportExcel}>
              تصدير Excel
            </Button>

            <Button variant="outline" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => setIsReportModalOpen(true)}>
              🖨️ طباعة تقرير التجار
            </Button>
          </div>
        </div>

        {/* Filter Drawer */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#27272A] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs animate-fade-in">
            <div>
              <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">نوع الحساب</label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
              >
                <option value="all">جميع الأنواع</option>
                <option value="supplier">مورد رئيسي</option>
                <option value="shop">محل تجزئة</option>
                <option value="agent">وكيل معتمد</option>
                <option value="partner">شريك تجاري</option>
                <option value="wholesaler">تاجر جملة</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">مستوى درجة الثقة</label>
              <select
                value={selectedTrustTier}
                onChange={e => setSelectedTrustTier(e.target.value)}
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none font-semibold"
              >
                <option value="all">كافة مستويات الثقة</option>
                <option value="elite">🌟 شريك نخبوي (Elite 95-100)</option>
                <option value="gold">🥇 مورد ذهبي / مفضل (Gold 88-94)</option>
                <option value="trusted">🟢 شريك موثوق (Trusted 75-87)</option>
                <option value="average">🟡 متوسط (Average 60-74)</option>
                <option value="risky">🟠 عالي المخاطر (Risky 40-59)</option>
                <option value="blocked">🚨 محظور الآجل (Blocked &lt;40)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">حالة الحساب</label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
                <option value="suspended">موقوف</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">ترتيب القائمة حسب</label>
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                >
                  <option value="trustScoreDesc">الأعلى درجة ثقة (Top Trust)</option>
                  <option value="trustScoreAsc">الأقل درجة ثقة (Lowest Trust)</option>
                  <option value="trustScoreImproved">الأكثر تحسناً في الثقة</option>
                  <option value="trustScoreDeclined">الأكثر تراجعاً في الثقة</option>
                  <option value="createdAt">تاريخ التسجيل</option>
                  <option value="name">اسم التاجر</option>
                  <option value="balance">الرصيد</option>
                  <option value="totalSales">إجمالي المبيعات</option>
                  <option value="totalPurchases">إجمالي المشتريات</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-white"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="debtOnly"
                  checked={hasDebtOnly}
                  onChange={e => setHasDebtOnly(e.target.checked)}
                  className="rounded text-orange-500"
                />
                <label htmlFor="debtOnly" className="font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  حسابات ذات ديون فقط
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="riskyOnly"
                  checked={onlyRisky}
                  onChange={e => setOnlyRisky(e.target.checked)}
                  className="rounded text-rose-500"
                />
                <label htmlFor="riskyOnly" className="font-bold text-rose-500 cursor-pointer">
                  حسابات عالية المخاطر (&lt;60)
                </label>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Merchants Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={9} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-[#161616] border-b border-gray-200 dark:border-[#27272A] text-zinc-500 font-bold text-xs">
                  <th className="py-3 px-4">كود الحساب</th>
                  <th className="py-3 px-4">التاجر والمنشأة</th>
                  <th className="py-3 px-4">نوع الحساب</th>
                  <th className="py-3 px-4">المدينة / الدولة</th>
                  <th className="py-3 px-4">الرصيد الصافي</th>
                  <th className="py-3 px-4">المبيعات / التوريدات</th>
                  <th className="py-3 px-4">درجة الثقة (Trust)</th>
                  <th className="py-3 px-4">التقييم التشغيلي</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-zinc-400">
                      <Store className="w-8 h-8 mx-auto mb-2 opacity-30 text-orange-500" />
                      لا توجد بيانات مطابقة لخيارات البحث أو الفلترة
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map(m => {
                    const trust = m.trustScore || db.calculateMerchantTrustScore(m);
                    return (
                      <tr
                        key={m.id}
                        onContextMenu={e => handleRowContextMenu(e, m)}
                        className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/30 transition-colors cursor-default"
                        title="انقر بالزر الأيمن للمزيد من الإجراءات"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-orange-500">{m.code}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">{m.name}</p>
                            <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-orange-500" /> {m.companyName}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="orange" size="sm">
                            {m.type === 'supplier' ? 'مورد' : m.type === 'shop' ? 'محل' : m.type === 'agent' ? 'وكيل' : m.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">{m.city} ({m.country})</td>
                        <td className="py-3 px-4">
                          <span className={`font-mono font-bold ${m.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {formatCurrency(m.balance)}
                          </span>
                          {m.balance > m.creditLimit && (
                            <span className="block text-[9px] text-rose-500 font-bold">تجاوز الحد!</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-700 dark:text-zinc-300">
                          {formatCurrency(m.totalPurchases + m.totalSales)}
                        </td>
                        {/* Trust Score Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`px-2 py-1 rounded-lg text-xs font-black font-mono flex items-center gap-1 ${
                                trust.tier === 'elite'
                                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                                  : trust.tier === 'gold'
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                  : trust.tier === 'trusted'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : trust.tier === 'average'
                                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                  : trust.tier === 'risky'
                                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse'
                              }`}
                            >
                              <span>{trust.score}</span>
                              <span className="text-[9px] opacity-70">/100</span>
                            </div>
                            {trust.trend === 'up' ? (
                              <span title="صاعد"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /></span>
                            ) : trust.trend === 'down' ? (
                              <span title="متراجع"><TrendingDown className="w-3.5 h-3.5 text-rose-500" /></span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 font-mono font-bold text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                            <span>{m.performance?.starRating || 5.0}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={m.status === 'active' ? 'success' : 'danger'} size="sm">
                            {m.status === 'active' ? 'نشط' : 'موقوف'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedProfileMerchant(m)}
                              className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10"
                              title="عرض البروفايل الكامل"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setInvoiceMerchant(m)}
                              className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10"
                              title="إصدار فاتورة"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setMerchantToEdit(m);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10"
                              title="تعديل البيانات"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setMerchantToArchive(m)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
                              title="أرشفة التاجر"
                            >
                              <Archive className="w-4 h-4" />
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
        )}
      </Card>

      {/* Right Click Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        items={contextMenuItems}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Merchant Form Modal */}
      <MerchantFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setMerchantToEdit(null);
        }}
        onSave={handleSaveMerchant}
        merchantToEdit={merchantToEdit}
      />

      {/* Merchant Profile Modal */}
      <MerchantProfileModal
        isOpen={!!selectedProfileMerchant}
        onClose={() => setSelectedProfileMerchant(null)}
        merchant={selectedProfileMerchant}
        onMerchantUpdated={loadData}
      />

      {/* Quick Invoice Modal */}
      {invoiceMerchant && (
        <MerchantInvoiceModal
          isOpen={!!invoiceMerchant}
          onClose={() => setInvoiceMerchant(null)}
          onSave={inv => {
            db.saveMerchantInvoice(inv, user?.fullName || 'المستخدم');
            showToast('success', 'تم إصدار الفاتورة', 'تم تسجيل الفاتورة بنجاح');
            loadData();
          }}
          merchant={invoiceMerchant}
        />
      )}

      {/* Archived Merchants Modal */}
      <ConfirmDialog
        isOpen={!!merchantToArchive}
        onClose={() => setMerchantToArchive(null)}
        onConfirm={handleArchiveConfirm}
        title="تأكيد أرشفة التاجر"
        message={`هل أنت متأكد من رغبتك في نقل التاجر "${merchantToArchive?.name}" إلى الأرشيف؟ لن يتم حذف أي بيانات نهائياً.`}
        confirmText="نقل للأرشيف"
        variant="warning"
      />

      {/* 🖨️ Professional Report Generator Modal */}
      {isReportModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          defaultTemplateType="merchants"
        />
      )}
    </div>
  );
};
