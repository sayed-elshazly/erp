import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dealer,
  DealerProfileType,
  LoyaltyTier,
  PurchasingPower,
  LifetimeSpendingTier,
  CustomerSource
} from '../../types/dealer.types';
import { CustomerTicket, PartyExpiredBalanceSummary, UnifiedWalletTransaction } from '../../types/customer.types';
import { db } from '../../database/db';
import { DealerStatisticsService } from '../../services/dealer/dealerStatisticsService';
import { WalletExpirationService } from '../../services/wallet/walletExpirationService';
import { ExpiredBalanceManagementModal } from '../../components/common/ExpiredBalanceManagementModal';
import { useAuth } from '../../context/AuthContext';
import { useHistory } from '../../context/HistoryContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTabs } from '../../context/TabsContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import { ContextMenu, ContextMenuItem } from '../../components/common/ContextMenu';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DealerFormModal } from './DealerFormModal';
import { DealerProfileModal } from './DealerProfileModal';
import { ArchivedDealersModal } from './ArchivedDealersModal';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { TablePagination } from '../../components/common/TablePagination';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
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
  ArrowUpDown,
  Phone,
  Copy,
  Calendar,
  CalendarDays,
  Gamepad2,
  Sparkles,
  Flame,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Building2,
  Award,
  RotateCcw,
  X,
  Clock,
  CheckCircle2,
  ShoppingBag,
  Store,
  CreditCard,
  Ticket,
  MapPin,
  Lock,
  Unlock,
  Receipt,
  BarChart3,
  FileText
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { exportToExcel } from '../../utils/excelExport';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';
import { normalizeArabicText } from '../customers/CustomersList';

interface DealersListProps {
  initialSelectedDealer?: Dealer | null;
}

export const DealersList: React.FC<DealersListProps> = ({ initialSelectedDealer }) => {
  const { user, hasPermission } = useAuth();
  const { pushAction } = useHistory();
  const { showToast } = useNotifications();
  const { openTab } = useTabs();

  // Loading state
  const [loading, setLoading] = useState(true);

  // Data state
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [archivedDealers, setArchivedDealers] = useState<Dealer[]>([]);
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [availableGames, setAvailableGames] = useState<{ id: string; name: string }[]>([]);


  // Type Tab: الكل | موزعين | محلات | وكلاء | VIP | عادي
  const [selectedTypeTab, setSelectedTypeTab] = useState<'all' | DealerProfileType>('all');

  // Unified Wallet Transactions & Expiration Management
  const [dealerTransactions, setDealerTransactions] = useState<UnifiedWalletTransaction[]>([]);
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [selectedExpiredDealerSummary, setSelectedExpiredDealerSummary] = useState<PartyExpiredBalanceSummary | null>(null);
  const [expiredModalTargetWallet, setExpiredModalTargetWallet] = useState<'cashback' | 'referral'>('cashback');

  // Search by Name, Phone, Code, or Business Name
  const [searchQuery, setSearchQuery] = useState('');

  // Note Filter State
  const [noteFilterQuery, setNoteFilterQuery] = useState('');
  const [isNoteFilterOpen, setIsNoteFilterOpen] = useState(false);
  const noteFilterPopoverRef = useRef<HTMLDivElement>(null);

  // Close note filter popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        noteFilterPopoverRef.current &&
        !noteFilterPopoverRef.current.contains(event.target as Node)
      ) {
        setIsNoteFilterOpen(false);
      }
    };
    if (isNoteFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNoteFilterOpen]);

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [selectedLoyalty, setSelectedLoyalty] = useState<string>('all');
  const [selectedPurchasingPower, setSelectedPurchasingPower] = useState<string>('all');
  const [selectedLifetimeTier, setSelectedLifetimeTier] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');

  // 1️⃣ Last Purchase Date Filter State
  const [lastPurchaseDateMode, setLastPurchaseDateMode] = useState<'all' | 'single' | 'range'>('all');
  const [lastPurchaseSingleDate, setLastPurchaseSingleDate] = useState<string>('');
  const [lastPurchaseStartDate, setLastPurchaseStartDate] = useState<string>('');
  const [lastPurchaseEndDate, setLastPurchaseEndDate] = useState<string>('');

  // 2️⃣ Account Creation Date Filter State
  const [createdDateMode, setCreatedDateMode] = useState<'all' | 'single' | 'range'>('all');
  const [createdSingleDate, setCreatedSingleDate] = useState<string>('');
  const [createdStartDate, setCreatedStartDate] = useState<string>('');
  const [createdEndDate, setCreatedEndDate] = useState<string>('');

  // Sorting
  const [sortBy, setSortBy] = useState<
    'alphabetical' | 'createdAtNewest' | 'createdAtOldest' | 'mostReferrals' | 'highestLoyalty' | 'highestSpending'
  >('createdAtNewest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [dealerToEdit, setDealerToEdit] = useState<Dealer | null>(null);
  const [selectedProfileDealer, setSelectedProfileDealer] = useState<Dealer | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Context Menu & Confirmation
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; dealer: Dealer } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Load Data
  const loadData = () => {
    try {
      const allDealers = db.getDealers();
      const allArchived = db.getArchivedDealers();
      const allTickets = db.getDealerTickets();
      const allDealerTxs = db.getDealerUnifiedWalletTransactions();
      const gamesTree = db.getGameTree();

      setDealers(allDealers);
      setArchivedDealers(allArchived);
      setTickets(allTickets);
      setDealerTransactions(allDealerTxs);

      // Collect games dynamically from Game Tree without duplicates
      const gameNamesSet = new Set<string>();
      gamesTree.forEach(g => {
        if (g.name?.trim()) gameNamesSet.add(g.name.trim());
      });
      setAvailableGames(Array.from(gameNamesSet).map(name => ({ id: name, name })));
    } catch (e) {
      console.error('Error loading dealers data', e);
    } finally {
      setLoading(false);
    }
  };

  // Expiry Calculations for all dealers
  const dealerExpiryMap = useMemo(() => {
    const map = new Map<string, PartyExpiredBalanceSummary>();
    dealers.forEach(d => {
      const summary = WalletExpirationService.getDealerExpirySummary(d, dealerTransactions);
      map.set(d.id, summary);
    });
    return map;
  }, [dealers, dealerTransactions]);

  const expiredDealersCount = useMemo(() => {
    let count = 0;
    dealerExpiryMap.forEach(sum => {
      if (sum.hasExpired) count++;
    });
    return count;
  }, [dealerExpiryMap]);

  const handleCopyReferralMessage = async (referralCode: string, dealerName?: string) => {
    const settings = db.getCustomerModuleSettings();
    const template =
      settings.referralCodeMessageTemplate ||
      `مرحبًا،

استخدم كود الإحالة التالي للحصول على المزايا والخصومات الحصرية:

{code}

شكرًا لاستخدام خدماتنا.`;

    const message = template
      .replace(/{code}/g, referralCode)
      .replace(/{{كود_الإحالة}}/g, referralCode)
      .replace(/{name}/g, dealerName || 'التاجر')
      .replace(/{{اسم_العميل}}/g, dealerName || 'التاجر');

    await copyToClipboard(message, `رسالة كود الإحالة (${referralCode})`, showToast);
  };

  useEffect(() => {
    loadData();
    if (initialSelectedDealer) {
      setSelectedProfileDealer(initialSelectedDealer);
    }

    const unsubProducts = eventBus.subscribe(SYSTEM_EVENTS.PRODUCTS_UPDATED, () => {
      loadData();
    });

    return () => {
      unsubProducts();
    };
  }, [initialSelectedDealer]);

  // Filtered Dealers
  const filteredDealers = useMemo(() => {
    return dealers.filter(dealer => {
      // 1. Profile Type Filter
      if (selectedTypeTab !== 'all' && dealer.profileType !== selectedTypeTab) {
        return false;
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = dealer.name.toLowerCase().includes(query);
        const matchPhone = dealer.phone.includes(query);
        const matchCode = dealer.code.toLowerCase().includes(query);
        const matchBusiness = dealer.businessName?.toLowerCase().includes(query);
        const matchReferral = dealer.referralCode.toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchCode && !matchBusiness && !matchReferral) {
          return false;
        }
      }

      // Expired Balance Filter
      if (expiredOnly) {
        const sum = dealerExpiryMap.get(dealer.id);
        if (!sum?.hasExpired) return false;
      }

      // Note Filter (Exclusive to Dealer Notes - Partial & Normalized)
      if (noteFilterQuery.trim()) {
        const normQuery = normalizeArabicText(noteFilterQuery);
        const additionalNotes = (db.getDealerNotes(dealer.id) || []).map(n => n.content).filter(Boolean);
        const rawNotes = [dealer.notes, ...additionalNotes].filter(Boolean).join(' ');

        if (!rawNotes.trim()) {
          return false;
        }

        const normNotes = normalizeArabicText(rawNotes);
        const queryWords = normQuery.split(' ').filter(Boolean);
        const matchesAll = queryWords.every(word => normNotes.includes(word));
        if (!matchesAll) return false;
      }

      // 3. Game Filter
      if (selectedGame !== 'all' && dealer.favoriteGame !== selectedGame) {
        return false;
      }

      // 4. Loyalty Tier Filter
      if (selectedLoyalty !== 'all' && dealer.loyaltyTier !== selectedLoyalty) {
        return false;
      }

      // 5. Purchasing Power Filter
      if (selectedPurchasingPower !== 'all' && dealer.purchasingPower !== selectedPurchasingPower) {
        return false;
      }

      // 6. Source Filter
      if (selectedSource !== 'all' && dealer.source !== selectedSource) {
        return false;
      }

      // 7. Last Purchase Date Filter
      if (lastPurchaseDateMode === 'single' && lastPurchaseSingleDate) {
        if (!dealer.lastPurchaseDate) return false;
        const purchaseDay = dealer.lastPurchaseDate.slice(0, 10);
        if (purchaseDay !== lastPurchaseSingleDate) return false;
      } else if (lastPurchaseDateMode === 'range' && (lastPurchaseStartDate || lastPurchaseEndDate)) {
        if (!dealer.lastPurchaseDate) return false;
        const purchaseDay = dealer.lastPurchaseDate.slice(0, 10);
        if (lastPurchaseStartDate && purchaseDay < lastPurchaseStartDate) return false;
        if (lastPurchaseEndDate && purchaseDay > lastPurchaseEndDate) return false;
      }

      // 8. Account Creation Date Filter
      if (createdDateMode === 'single' && createdSingleDate) {
        const createDay = (dealer.createdAt || '').slice(0, 10);
        if (createDay !== createdSingleDate) return false;
      } else if (createdDateMode === 'range' && (createdStartDate || createdEndDate)) {
        const createDay = (dealer.createdAt || '').slice(0, 10);
        if (createdStartDate && createDay < createdStartDate) return false;
        if (createdEndDate && createDay > createdEndDate) return false;
      }

      return true;
    });
  }, [
    dealers,
    selectedTypeTab,
    searchQuery,
    selectedGame,
    selectedLoyalty,
    selectedPurchasingPower,
    selectedSource,
    lastPurchaseDateMode,
    lastPurchaseSingleDate,
    lastPurchaseStartDate,
    lastPurchaseEndDate,
    createdDateMode,
    createdSingleDate,
    createdStartDate,
    createdEndDate,
    noteFilterQuery,
    expiredOnly,
    dealerExpiryMap
  ]);

  // Sorted Dealers
  const sortedDealers = useMemo(() => {
    const list = [...filteredDealers];
    list.sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name, 'ar');
        case 'createdAtOldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'mostReferrals':
          return (b.monthlyReferredCount || 0) - (a.monthlyReferredCount || 0);
        case 'highestLoyalty': {
          const tierWeight: Record<LoyaltyTier, number> = { vip: 4, gold: 3, silver: 2, normal: 1 };
          return (tierWeight[b.loyaltyTier] || 1) - (tierWeight[a.loyaltyTier] || 1);
        }
        case 'highestSpending':
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        case 'createdAtNewest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return list;
  }, [filteredDealers, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedDealers.length / pageSize) || 1;
  const paginatedDealers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDealers.slice(start, start + pageSize);
  }, [sortedDealers, currentPage, pageSize]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalCount = dealers.length;
    const activeCount = dealers.filter(d => !d.isFrozen && d.status === 'active').length;
    const totalWholesaleSpent = dealers.reduce((sum, d) => sum + (d.totalSpent || 0), 0);
    const totalCreditBalance = dealers.reduce((sum, d) => sum + (d.accountBalance || 0), 0);
    const totalCashback = dealers.reduce((sum, d) => sum + (d.cashbackBalance || 0), 0);
    const totalOrdersCount = dealers.reduce((sum, d) => sum + (d.totalOrders || 0), 0);

    return {
      totalCount,
      activeCount,
      totalWholesaleSpent,
      totalCreditBalance,
      totalCashback,
      totalOrdersCount
    };
  }, [dealers]);

  // Handlers
  const handleSaveDealer = (dealerData: Partial<Dealer>) => {
    if (dealerToEdit) {
      const updated: Dealer = {
        ...dealerToEdit,
        ...dealerData,
        updatedAt: new Date().toISOString()
      };
      db.saveDealer(updated);
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المدير المالك', role: user?.role || 'admin', department: 'التجار والموزعين' },
        'edit',
        'بروفايل تاجر',
        updated.id,
        updated.name,
        `تم تحديث بيانات التاجر بالكامل بواسطة ${user?.fullName || 'المدير'}`
      );
      showToast('success', 'تم التحديث', `تم تحديث بيانات التاجر "${updated.name}" بنجاح`);
      const prevDealerSnapshot = { ...dealerToEdit };
      const newDealerSnapshot = { ...updated };
      pushAction(
        `تعديل التاجر (${updated.name})`,
        () => {
          db.saveDealer(prevDealerSnapshot);
          loadData();
        },
        () => {
          db.saveDealer(newDealerSnapshot);
          loadData();
        }
      );
    } else {
      const newDealer: Dealer = {
        id: 'dlr_' + Date.now(),
        code: 'DLR-' + Math.floor(1000 + Math.random() * 9000),
        name: dealerData.name || '',
        phone: dealerData.phone || '',
        profileType: dealerData.profileType || 'distributor',
        source: dealerData.source || 'whatsapp',
        status: 'active',
        isFrozen: false,
        businessName: dealerData.businessName,
        commercialRegistrationNumber: dealerData.commercialRegistrationNumber,
        address: dealerData.address,
        city: dealerData.city,
        creditLimitEGP: dealerData.creditLimitEGP || 10000,
        monthlyReferredCount: 0,
        partnerWarningCount: 0,
        referralCode: dealerData.referralCode || 'DLR-REF-' + Math.floor(1000 + Math.random() * 9000),
        referredByCode: dealerData.referredByCode,
        birthDate: dealerData.birthDate,
        referralWalletBalance: Number(dealerData.referralWalletBalance) || 0,
        totalReferralCommissionEarned: Number(dealerData.referralWalletBalance) || 0,
        balance: Number(dealerData.accountBalance ?? dealerData.balance) || 0,
        accountBalance: Number(dealerData.accountBalance ?? dealerData.balance) || 0,
        cashbackBalance: Number(dealerData.cashbackBalance) || 0,
        cashbackRate: dealerData.cashbackRate || 0.5,
        totalCashbackEarned: Number(dealerData.cashbackBalance) || 0,
        totalSpent: 0,
        totalOrders: 0,
        maxSingleOrderAmount: 0,
        loyaltyTier: 'normal',
        purchasingPower: 'normal',
        isArchived: false,
        notes: dealerData.notes || '',
        notesCount: 0,
        ticketsCount: 0,
        hasUsedFirstOrderDiscount: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.saveDealer(newDealer);

      // Record initial wallet ledger entries if owner initialized balances
      if (Number(newDealer.accountBalance) !== 0) {
        db.addDealerUnifiedWalletTransaction({
          customerId: newDealer.id,
          walletType: 'account_balance',
          type: (Number(newDealer.accountBalance) > 0 ? 'deposit' : 'debit') as any,
          operationName: 'رصيد افتتاحي للمحفظة الأساسية',
          amount: Number(newDealer.accountBalance),
          balanceAfter: Number(newDealer.accountBalance),
          notes: 'رصيد افتتاحي عند إنشاء ملف التاجر'
        });
      }
      if (Number(newDealer.cashbackBalance) > 0) {
        db.addDealerUnifiedWalletTransaction({
          customerId: newDealer.id,
          walletType: 'cashback',
          type: 'earned',
          operationName: 'رصيد كاش باك افتتاحي',
          amount: Number(newDealer.cashbackBalance),
          balanceAfter: Number(newDealer.cashbackBalance),
          notes: 'رصيد كاش باك افتتاحي عند إنشاء ملف التاجر'
        });
      }
      if (Number(newDealer.referralWalletBalance) > 0) {
        db.addDealerUnifiedWalletTransaction({
          customerId: newDealer.id,
          walletType: 'referral',
          type: 'commission',
          operationName: 'رصيد إحالة افتتاحي',
          amount: Number(newDealer.referralWalletBalance),
          balanceAfter: Number(newDealer.referralWalletBalance),
          notes: 'رصيد إحالة افتتاحي عند إنشاء ملف التاجر'
        });
      }
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المدير المالك', role: user?.role || 'admin', department: 'التجار والموزعين' },
        'add',
        'بروفايل تاجر جديد',
        newDealer.id,
        newDealer.name,
        `تسجيل تاجر جديد بكود [${newDealer.code}] وكود إحالة [${newDealer.referralCode}]`
      );
      showToast('success', 'تم التسجيل', `تمت إضافة التاجر "${newDealer.name}" بنجاح`);
      const newDealerSnapshot = { ...newDealer };
      pushAction(
        `إضافة تاجر جديد (${newDealer.name})`,
        () => {
          db.deleteDealer(newDealerSnapshot.id);
          loadData();
        },
        () => {
          db.saveDealer(newDealerSnapshot);
          loadData();
        }
      );
    }
    setIsFormOpen(false);
    setDealerToEdit(null);
    loadData();
  };

  const handleArchiveDealer = (dealer: Dealer) => {
    setConfirmDialog({
      isOpen: true,
      title: 'أرشفة حساب التاجر',
      message: `هل أنت متأكد من أرشفة التاجر "${dealer.name}"؟ يمكنك استعادته لاحقاً من الأرشيف.`,
      onConfirm: () => {
        db.archiveDealer(dealer.id);
        showToast('info', 'تمت الأرشفة', `تم نقل التاجر "${dealer.name}" للأرشيف`);
        loadData();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleRestoreDealer = (dealerId: string) => {
    db.restoreDealer(dealerId);
    showToast('success', 'تمت الاستعادة', 'تمت استعادة التاجر من الأرشيف للحسابات النشطة');
    loadData();
  };

  const handleExportExcel = () => {
    const exportData = sortedDealers.map(d => ({
      'كود التاجر': d.code,
      'الاسم': d.name,
      'النشاط التجاري': d.businessName || '-',
      'رقم الهاتف': d.phone,
      'نوع التاجر': d.profileType,
      'المدينة': d.city || '-',
      'الرصيد الدائن/المدين': d.accountBalance || 0,
      'إجمالي المشتريات (ج.م)': d.totalSpent,
      'عدد الطلبيات': d.totalOrders,
      'الحد الائتماني': d.creditLimitEGP || 10000,
      'رصيد الكاش باك': d.cashbackBalance || 0,
      'رصيد الإحالة': d.referralWalletBalance || 0,
      'كود الإحالة': d.referralCode,
      'حالة الحساب': d.isFrozen ? 'مجمد' : 'نشط',
      'تاريخ التسجيل': formatDate(d.createdAt)
    }));
    exportToExcel(exportData, `سجل_تجار_الجملة_JKR_${new Date().toISOString().slice(0, 10)}`);
    showToast('success', 'تم التصدير', 'تم تصدير سجل التجار إلى ملف Excel بنجاح');
  };

  const hasAnyFilterActive = useMemo(() => {
    return Boolean(
      searchQuery.trim() ||
      selectedTypeTab !== 'all' ||
      selectedGame !== 'all' ||
      selectedLoyalty !== 'all' ||
      selectedPurchasingPower !== 'all' ||
      selectedSource !== 'all' ||
      lastPurchaseDateMode !== 'all' ||
      createdDateMode !== 'all' ||
      noteFilterQuery.trim()
    );
  }, [
    searchQuery,
    selectedTypeTab,
    selectedGame,
    selectedLoyalty,
    selectedPurchasingPower,
    selectedSource,
    lastPurchaseDateMode,
    createdDateMode,
    noteFilterQuery
  ]);

  const clearAllFilters = () => {
    setSelectedTypeTab('all');
    setSearchQuery('');
    setSelectedGame('all');
    setSelectedLoyalty('all');
    setSelectedPurchasingPower('all');
    setSelectedSource('all');
    setLastPurchaseDateMode('all');
    setLastPurchaseSingleDate('');
    setLastPurchaseStartDate('');
    setLastPurchaseEndDate('');
    setCreatedDateMode('all');
    setCreatedSingleDate('');
    setCreatedStartDate('');
    setCreatedEndDate('');
    setNoteFilterQuery('');
    setCurrentPage(1);
    showToast('info', 'تم تصفير الفلاتر', 'تم إلغاء كافة الفلاتر واسترجاع قائمة التجار الكاملة');
  };

  return (
    <div className="space-y-6 animate-fade-in text-right" dir="rtl">
      <div className="space-y-6">
          {/* Top Banner & Module Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                <Store className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>قسم التجار والموزعين (Dealers Module)</span>
                  <Badge variant="warning" size="sm">Wholesale Core</Badge>
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  إدارة بروفايلات تجار الجملة، الموزعين، أسعار الجملة المعتمدة، كشوف الحسابات، وتذاكر الشحن
                </p>
              </div>
            </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Archive className="w-4 h-4 text-zinc-400" />}
            onClick={() => setIsArchiveModalOpen(true)}
          >
            الأرشيف ({archivedDealers.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4 text-amber-500" />}
            onClick={handleExportExcel}
          >
            تصدير Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4 text-zinc-400" />}
            onClick={() => setIsReportModalOpen(true)}
          >
            تقارير PDF
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setDealerToEdit(null);
              setIsFormOpen(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            إضافة تاجر جديد
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5">
          <span className="text-[11px] text-zinc-500 block mb-1">إجمالي التجار</span>
          <span className="text-lg font-black text-gray-900 dark:text-zinc-100">{stats.totalCount}</span>
          <span className="text-[10px] text-emerald-500 block mt-0.5">النشطين: {stats.activeCount}</span>
        </Card>

        <Card className="p-3.5 bg-amber-500/5 border-amber-500/20">
          <span className="text-[11px] text-zinc-500 block mb-1">مبيعات الجملة الكلية</span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
            {formatCurrency(stats.totalWholesaleSpent)}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">طلبيات: {stats.totalOrdersCount}</span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[11px] text-zinc-500 block mb-1">صافي الحسابات الدائنة</span>
          <span className={`text-lg font-black font-mono ${stats.totalCreditBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatCurrency(stats.totalCreditBalance)}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">أرصدة التجار المتاحة</span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[11px] text-zinc-500 block mb-1">كاش باك وحوافز الجملة</span>
          <span className="text-lg font-black text-cyan-500 font-mono">
            {formatCurrency(stats.totalCashback)}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">رصيد متاح للسحب/السداد</span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[11px] text-zinc-500 block mb-1">متوسط قيمة الطلبية</span>
          <span className="text-lg font-black text-purple-500 font-mono">
            {stats.totalOrdersCount > 0
              ? formatCurrency(Math.round(stats.totalWholesaleSpent / stats.totalOrdersCount))
              : '0 ج'}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">لكل طلبية جملة</span>
        </Card>

        <Card className="p-3.5">
          <span className="text-[11px] text-zinc-500 block mb-1">التجار المؤرشفين</span>
          <span className="text-lg font-black text-zinc-400">{archivedDealers.length}</span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">محفوظة سجلاتهم</span>
        </Card>
      </div>

      {/* Tabs by Profile Type */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-200 dark:border-[#232328] pb-1 no-scrollbar">
        {[
          { id: 'all', label: `جميع التجار (${dealers.length})` },
          { id: 'distributor', label: `الموزعين المعتمدين (${dealers.filter(d => d.profileType === 'distributor').length})` },
          { id: 'vip_dealer', label: `تجار VIP (${dealers.filter(d => d.profileType === 'vip_dealer').length})` },
          { id: 'shop', label: `المحلات والأكشاك (${dealers.filter(d => d.profileType === 'shop').length})` },
          { id: 'agent', label: `وكلاء الشحن (${dealers.filter(d => d.profileType === 'agent').length})` },
          { id: 'regular', label: `التجار العاديين (${dealers.filter(d => d.profileType === 'regular').length})` }
        ].map(tab => {
          const isActive = selectedTypeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedTypeTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}

        {/* Quick Expiry Filter Button */}
        <button
          onClick={() => {
            setExpiredOnly(!expiredOnly);
            setCurrentPage(1);
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            expiredOnly
              ? 'bg-rose-600 text-white shadow-xs'
              : expiredDealersCount > 0
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
          title="تصفية التجار الذين لديهم كاش باك (تعدى 6 شهور) أو رصيد إحالة (تعدى 12 شهر)"
        >
          <Clock className="w-3.5 h-3.5 text-rose-500" />
          <span>⚠️ أرصدة منتهية ({expiredDealersCount})</span>
        </button>
      </div>

      {/* Search & Advanced Filters Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3 top-3 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="بحث باسم التاجر، رقم الهاتف، اسم المحل، كود التاجر (DLR-XXXX)، أو كود الإحالة..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white dark:bg-[#151519] border border-gray-200 dark:border-[#27272A] rounded-2xl pr-9 pl-3 py-2.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-3 text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant={showAdvancedFilters ? 'primary' : 'outline'}
              size="sm"
              icon={<Filter className="w-3.5 h-3.5" />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              فلاتر متقدمة
            </Button>

            {hasAnyFilterActive && (
              <Button
                variant="outline"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5 text-rose-500" />}
                onClick={clearAllFilters}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/30 font-bold"
              >
                تصفير الفلاتر
              </Button>
            )}

            {/* Note Filter Popover */}
            <div className="relative" ref={noteFilterPopoverRef}>
              <button
                type="button"
                onClick={() => setIsNoteFilterOpen(prev => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer select-none ${
                  noteFilterQuery.trim()
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs'
                    : isNoteFilterOpen
                    ? 'bg-gray-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-gray-300 dark:border-zinc-700'
                    : 'bg-white dark:bg-[#151519] text-zinc-600 dark:text-zinc-400 border-gray-200 dark:border-[#27272A] hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="البحث بالملحوظة الخاصة بالتاجر"
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>الملحوظة</span>
                {noteFilterQuery.trim() && (
                  <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>

              {/* Popover Card */}
              {isNoteFilterOpen && (
                <div className="absolute top-11 right-0 z-50 w-72 sm:w-80 p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xl shadow-black/10 space-y-2.5 animate-fade-in text-right">
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-[#27272A]">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" /> فلتر الملحوظة
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNoteFilterOpen(false)}
                      className="text-zinc-400 hover:text-zinc-100 text-xs p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      autoFocus
                      type="text"
                      value={noteFilterQuery}
                      onChange={e => {
                        setNoteFilterQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="ابحث بالملحوظة..."
                      className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] pr-9 pl-8 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-amber-500"
                    />
                    {noteFilterQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setNoteFilterQuery('');
                          setCurrentPage(1);
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-rose-500 text-xs cursor-pointer"
                        title="مسح"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    * يبحث حصرياً داخل ملحوظة التاجر، ولا يبحث في الاسم أو الهاتف أو المنتجات.
                  </p>

                  {noteFilterQuery && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-[#27272A]">
                      <span className="text-[11px] text-zinc-400">
                        النتائج: <strong className="text-amber-500">{filteredDealers.length}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNoteFilterQuery('');
                          setCurrentPage(1);
                        }}
                        className="text-[11px] text-rose-500 hover:underline font-bold cursor-pointer"
                      >
                        مسح الفلتر
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-white dark:bg-[#151519] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none font-semibold cursor-pointer"
            >
              <option value="createdAtNewest">الأحدث تسجيلاً</option>
              <option value="createdAtOldest">الأقدم تسجيلاً</option>
              <option value="highestSpending">الأعلى مشتريات (جملة)</option>
              <option value="highestLoyalty">أعلى ولاء</option>
              <option value="mostReferrals">الأكثر إحالات</option>
              <option value="alphabetical">أبجدياً (أ - ي)</option>
            </select>
          </div>
        </div>

        {/* Active Note Filter Chip */}
        {Boolean(noteFilterQuery.trim()) && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-bold text-zinc-500">فلتر مفعل:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold animate-fade-in">
              <FileText className="w-3.5 h-3.5" />
              <span>الملحوظة: {noteFilterQuery}</span>
              <button
                type="button"
                onClick={() => setNoteFilterQuery('')}
                className="hover:text-rose-500 transition-colors cursor-pointer mr-0.5"
                title="مسح فلتر الملحوظة"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <Card className="p-4 bg-gray-50 dark:bg-[#151519]/80 border-gray-200 dark:border-[#27272A] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#27272A] pb-2 text-xs font-bold text-gray-900 dark:text-zinc-100">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                خيارات التصفية المتطورة
              </span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-amber-600 hover:text-amber-500 text-xs font-semibold cursor-pointer"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1 font-bold">اللعبة الأكثر طلباً (من قسم المنتجات):</label>
                <SearchableSelect
                  options={availableGames.map(g => ({
                    value: g.name,
                    label: g.name,
                    icon: <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  }))}
                  value={selectedGame}
                  onChange={val => setSelectedGame(val)}
                  allOptionLabel={`جميع الألعاب (${availableGames.length})`}
                  placeholder="ابحث عن لعبة..."
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">مستوى الولاء:</label>
                <select
                  value={selectedLoyalty}
                  onChange={e => setSelectedLoyalty(e.target.value)}
                  className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-gray-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="all">جميع المستويات</option>
                  <option value="vip">VIP (+100)</option>
                  <option value="gold">ذهبي (30-99)</option>
                  <option value="silver">فضي (10-29)</option>
                  <option value="normal">عادي (1-9)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">القوة الشرائية بالجملة:</label>
                <select
                  value={selectedPurchasingPower}
                  onChange={e => setSelectedPurchasingPower(e.target.value)}
                  className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-gray-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="all">جميع الفئات</option>
                  <option value="whale">حوت (+10,000 ج)</option>
                  <option value="strong">قوي (5,000-9,999 ج)</option>
                  <option value="medium">متوسط (2,000-4,999 ج)</option>
                  <option value="normal">عادي</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">مصدر التسجيل:</label>
                <select
                  value={selectedSource}
                  onChange={e => setSelectedSource(e.target.value)}
                  className="w-full bg-white dark:bg-[#121215] border border-gray-300 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-gray-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="all">جميع المصادر</option>
                  <option value="whatsapp">واتساب تجاري</option>
                  <option value="telegram">تليجرام الموزعين</option>
                  <option value="facebook">فيسبوك</option>
                  <option value="word_of_mouth">تزكية</option>
                </select>
              </div>
            </div>
          </Card>
        )}

        {/* Active Filters Bar (Quick Chips & Fast Reset) */}
        {hasAnyFilterActive && (
          <div className="pt-2 border-t border-gray-100 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-2 text-xs animate-fade-in">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-zinc-500">الفلاتر المطبقة:</span>

              {selectedTypeTab !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                  <span>النوع: {selectedTypeTab}</span>
                  <button type="button" onClick={() => setSelectedTypeTab('all')} className="hover:text-rose-500 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedGame !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                  <Gamepad2 className="w-3 h-3" />
                  <span>اللعبة: {selectedGame}</span>
                  <button type="button" onClick={() => setSelectedGame('all')} className="hover:text-rose-500 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedLoyalty !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                  <span>الولاء: {selectedLoyalty}</span>
                  <button type="button" onClick={() => setSelectedLoyalty('all')} className="hover:text-rose-500 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedPurchasingPower !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                  <span>القوة: {selectedPurchasingPower}</span>
                  <button type="button" onClick={() => setSelectedPurchasingPower('all')} className="hover:text-rose-500 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedSource !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                  <span>المصدر: {selectedSource}</span>
                  <button type="button" onClick={() => setSelectedSource('all')} className="hover:text-rose-500 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 font-bold">
                  <span>البحث: "{searchQuery}"</span>
                  <button type="button" onClick={() => setSearchQuery('')} className="hover:text-rose-500 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {expiredOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold font-mono">
                  <Clock className="w-3 h-3 text-rose-500" />
                  <span>أرصدة منتهية الصلاحية ⚠️</span>
                  <button type="button" onClick={() => setExpiredOnly(false)} className="hover:text-rose-800 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-zinc-500 font-medium">
                تم العثور على <strong>{filteredDealers.length}</strong> من أصل <strong>{dealers.length}</strong> تاجر
              </span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30 font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إلغاء كافة الفلاتر</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Dealers Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : sortedDealers.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#232328] rounded-3xl">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
          <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">لا يوجد تجار مطابقين للبحث أو الفلتر</h3>
          <p className="text-xs text-zinc-500 mt-1">جرب تغيير كلمات البحث أو إعادة ضبط خيارات التصفية.</p>
          <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">
            إلغاء جميع الفلاتر
          </Button>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-[#232328] rounded-3xl overflow-hidden bg-white dark:bg-[#121215] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50/80 dark:bg-[#151519] text-zinc-500 border-b border-gray-200 dark:border-[#232328]">
                <tr>
                  <th className="p-3.5">التاجر / النشاط التجاري</th>
                  <th className="p-3.5">الهاتف والكود</th>
                  <th className="p-3.5">التصنيف والنوع</th>
                  <th className="p-3.5">الرصيد الدائن/المدين</th>
                  <th className="p-3.5">إجمالي المشتريات</th>
                  <th className="p-3.5">الطلبيات</th>
                  <th className="p-3.5">كاش باك وإحالات</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#202025]">
                {paginatedDealers.map(dealer => {
                  const expirySummary = dealerExpiryMap.get(dealer.id);

                  return (
                    <tr
                      key={dealer.id}
                      onContextMenu={e => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, dealer });
                      }}
                      className="hover:bg-gray-50/80 dark:hover:bg-[#18181D] transition-colors group"
                    >
                      {/* Name & Business */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-sm shrink-0">
                            {dealer.name[0]}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedProfileDealer(dealer)}
                              className="font-bold text-gray-900 dark:text-zinc-100 hover:text-amber-500 transition-colors text-right cursor-pointer flex items-center gap-1.5"
                            >
                              <span>{dealer.name}</span>
                              {expirySummary && expirySummary.hasExpired && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedExpiredDealerSummary(expirySummary);
                                    setExpiredModalTargetWallet(expirySummary.cashbackExpired > 0 ? 'cashback' : 'referral');
                                    setIsExpiredModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-500/30 cursor-pointer hover:bg-rose-500 hover:text-white transition-all font-mono"
                                  title={`رصيد منتهي الصلاحية (${formatCurrency(expirySummary.cashbackExpired + expirySummary.referralExpired)}) — اضغط للإدارة`}
                                >
                                  ⚠️ منتهي: {formatCurrency(expirySummary.cashbackExpired + expirySummary.referralExpired)}
                                </span>
                              )}
                              {dealer.isFrozen && <span title="مجمد">❄️</span>}
                            </button>
                            {dealer.businessName && (
                              <span className="text-[11px] text-zinc-400 block font-normal">
                                {dealer.businessName} {dealer.city ? `• ${dealer.city}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone & Code */}
                      <td className="p-3.5">
                        <div className="font-mono text-zinc-600 dark:text-zinc-300" dir="ltr">{dealer.phone}</div>
                        <span className="text-[10px] text-amber-500 font-mono font-bold block">{dealer.code}</span>
                      </td>

                      {/* Profile Type */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={
                              dealer.profileType === 'distributor'
                                ? 'orange'
                                : dealer.profileType === 'vip_dealer'
                                ? 'warning'
                                : dealer.profileType === 'shop'
                                ? 'info'
                                : 'default'
                            }
                            size="sm"
                          >
                            {dealer.profileType === 'distributor'
                              ? 'موزع'
                              : dealer.profileType === 'vip_dealer'
                              ? 'VIP'
                              : dealer.profileType === 'shop'
                              ? 'محل'
                              : dealer.profileType === 'agent'
                              ? 'وكيل'
                              : 'تاجر'}
                          </Badge>
                          <Badge variant={dealer.loyaltyTier === 'vip' ? 'warning' : 'default'} size="sm">
                            {dealer.loyaltyTier}
                          </Badge>
                        </div>
                      </td>

                      {/* Account Balance */}
                      <td className="p-3.5">
                        <span className={`font-mono font-bold ${(dealer.accountBalance || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {formatCurrency(dealer.accountBalance || 0)}
                        </span>
                        <span className="text-[10px] text-zinc-400 block">حد: {formatCurrency(dealer.creditLimitEGP || 10000)}</span>
                      </td>

                      {/* Total Spent */}
                      <td className="p-3.5 font-bold font-mono text-gray-900 dark:text-zinc-100">
                        {formatCurrency(dealer.totalSpent)}
                      </td>

                      {/* Orders */}
                      <td className="p-3.5 font-mono text-zinc-600 dark:text-zinc-300">
                        {dealer.totalOrders} طلبية
                      </td>

                      {/* Cashback & Referrals */}
                      <td className="p-3.5">
                        <span className="text-cyan-500 font-mono font-bold block text-[11px]">
                          CB: {formatCurrency(dealer.cashbackBalance || 0)}
                        </span>
                        {expirySummary && expirySummary.cashbackExpired > 0 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExpiredDealerSummary(expirySummary);
                              setExpiredModalTargetWallet('cashback');
                              setIsExpiredModalOpen(true);
                            }}
                            className="text-[10px] text-rose-500 font-black block hover:underline cursor-pointer font-mono"
                            title="كاش باك جملة تعدى 6 شهور — اضغط للإدارة"
                          >
                            ⚠️ منتهي: {formatCurrency(expirySummary.cashbackExpired)}
                          </span>
                        )}
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-purple-500 font-mono font-bold text-[11px]">
                            Ref: {formatCurrency(dealer.referralWalletBalance || 0)}
                          </span>
                          {dealer.referralCode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyReferralMessage(dealer.referralCode, dealer.name);
                              }}
                              className="p-0.5 rounded text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 cursor-pointer"
                              title="نسخ كود ورسالة الإحالة بالكامل"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {expirySummary && expirySummary.referralExpired > 0 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExpiredDealerSummary(expirySummary);
                              setExpiredModalTargetWallet('referral');
                              setIsExpiredModalOpen(true);
                            }}
                            className="text-[10px] text-rose-500 font-black block hover:underline cursor-pointer font-mono"
                            title="عمولات إحالة تعدت 12 شهر — اضغط للإدارة"
                          >
                            ⚠️ إحالة منتهية: {formatCurrency(expirySummary.referralExpired)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="w-3.5 h-3.5 text-amber-500" />}
                            onClick={() => setSelectedProfileDealer(dealer)}
                            title="عرض البروفايل الكامل"
                          />

                          {expirySummary && expirySummary.hasExpired && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Clock className="w-3.5 h-3.5 text-rose-500" />}
                              onClick={() => {
                                setSelectedExpiredDealerSummary(expirySummary);
                                setExpiredModalTargetWallet(expirySummary.cashbackExpired > 0 ? 'cashback' : 'referral');
                                setIsExpiredModalOpen(true);
                              }}
                              title="إدارة الرصيد منتهي الصلاحية ⚠️"
                            />
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit2 className="w-3.5 h-3.5 text-zinc-400" />}
                            onClick={() => {
                              setDealerToEdit(dealer);
                              setIsFormOpen(true);
                            }}
                            title="تعديل البيانات"
                          />

                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Archive className="w-3.5 h-3.5 text-zinc-400" />}
                            onClick={() => handleArchiveDealer(dealer)}
                            title="أرشفة الحساب"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedDealers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            labelName="تاجر"
            themeColor="amber"
          />
        </div>
      )}
      </div>

      {/* Modals */}
      {isFormOpen && (
        <DealerFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setDealerToEdit(null);
          }}
          onSave={handleSaveDealer}
          dealerToEdit={dealerToEdit}
        />
      )}

      {selectedProfileDealer && (
        <DealerProfileModal
          isOpen={Boolean(selectedProfileDealer)}
          onClose={() => setSelectedProfileDealer(null)}
          dealer={selectedProfileDealer}
          onDealerUpdated={() => {
            loadData();
            const refreshed = db.getDealerById(selectedProfileDealer.id);
            if (refreshed) setSelectedProfileDealer(refreshed);
          }}
          onOpenNewTicket={d => {
            openTab({
              id: 'tickets',
              title: 'تذاكر الشحن',
              section: 'tickets',
              iconType: 'tickets'
            });
          }}
        />
      )}

      {isArchiveModalOpen && (
        <ArchivedDealersModal
          isOpen={isArchiveModalOpen}
          onClose={() => setIsArchiveModalOpen(false)}
          archivedDealers={archivedDealers}
          onRestore={handleRestoreDealer}
        />
      )}

      {isReportModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          defaultTemplateType="customers"
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isOpen={Boolean(contextMenu)}
          items={[
            {
              id: 'ctx_open',
              label: 'عرض البروفايل الكامل',
              icon: <Eye className="w-4 h-4 text-amber-500" />,
              onClick: () => setSelectedProfileDealer(contextMenu.dealer)
            },
            ...(dealerExpiryMap.get(contextMenu.dealer.id)?.hasExpired ? [{
              id: 'ctx_manage_expiry',
              label: 'إدارة الرصيد منتهي الصلاحية ⚠️',
              icon: <Clock className="w-4 h-4 text-rose-500" />,
              onClick: () => {
                const sum = dealerExpiryMap.get(contextMenu.dealer.id);
                if (sum) {
                  setSelectedExpiredDealerSummary(sum);
                  setExpiredModalTargetWallet(sum.cashbackExpired > 0 ? 'cashback' : 'referral');
                  setIsExpiredModalOpen(true);
                }
              }
            }] : []),
            {
              id: 'ctx_edit',
              label: 'تعديل البيانات',
              icon: <Edit2 className="w-4 h-4 text-zinc-400" />,
              onClick: () => {
                setDealerToEdit(contextMenu.dealer);
                setIsFormOpen(true);
              }
            },
            {
              id: 'ctx_copy_phone',
              label: 'نسخ رقم الهاتف',
              icon: <Copy className="w-4 h-4 text-zinc-400" />,
              onClick: () => copyToClipboard(contextMenu.dealer.phone, 'رقم الهاتف', showToast)
            },
            {
              id: 'ctx_archive',
              label: 'أرشفة التاجر',
              icon: <Archive className="w-4 h-4 text-rose-500" />,
              variant: 'danger',
              onClick: () => handleArchiveDealer(contextMenu.dealer)
            }
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Expired Balance Management Modal */}
      {isExpiredModalOpen && selectedExpiredDealerSummary && (
        <ExpiredBalanceManagementModal
          isOpen={isExpiredModalOpen}
          onClose={() => {
            setIsExpiredModalOpen(false);
            setSelectedExpiredDealerSummary(null);
          }}
          summary={selectedExpiredDealerSummary}
          targetWallet={expiredModalTargetWallet}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
