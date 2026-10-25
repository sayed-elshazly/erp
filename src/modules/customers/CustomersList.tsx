import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Customer,
  ProfileType,
  LoyaltyTier,
  PurchasingPower,
  LifetimeSpendingTier,
  CustomerSource,
  CustomerTicket,
  PartyExpiredBalanceSummary,
  UnifiedWalletTransaction
} from '../../types/customer.types';
import { db } from '../../database/db';
import { ProfileStatisticsService } from '../../services/customer/profileStatisticsService';
import { WalletExpirationService } from '../../services/wallet/walletExpirationService';
import { ExpiredBalanceManagementModal } from '../../components/common/ExpiredBalanceManagementModal';
import { useAuth } from '../../context/AuthContext';
import { useHistory } from '../../context/HistoryContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTabs } from '../../context/TabsContext';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import { ContextMenu, ContextMenuItem } from '../../components/common/ContextMenu';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerProfileModal } from './CustomerProfileModal';
import { ArchivedCustomersModal } from './ArchivedCustomersModal';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
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
  UserCheck,
  Building2,
  Video,
  Award,
  RotateCcw,
  X,
  Clock,
  CheckCircle2,
  ShoppingBag,
  BarChart3,
  FileText
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { exportToExcel } from '../../utils/excelExport';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';

/**
 * تطبيع النصوص العربية للبحث الذكي والجزئي
 * - إزالة التشكيل والتنوين والشدة
 * - توحيد الألف (أ، إ، آ، ٱ -> ا)
 * - توحيد الياء والألف المقصورة والهمزة على نبرة (ى، ئ -> ي)
 * - توحيد التاء المربوطة والهاء (ة -> ه)
 * - إزالة المسافات المتعددة والرموز
 */
export function normalizeArabicText(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');
}

interface CustomersListProps {
  initialSelectedCustomer?: Customer | null;
}

export const CustomersList: React.FC<CustomersListProps> = ({ initialSelectedCustomer }) => {
  const { user } = useAuth();
  const isOwner = user?.role === 'admin';
  const { pushAction } = useHistory();
  const { showToast } = useNotifications();
  const { openTab } = useTabs();

  // Loading state
  const [loading, setLoading] = useState(true);

  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [archivedCustomers, setArchivedCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [availableGames, setAvailableGames] = useState<{ id: string; name: string }[]>([]);

  // Type Tab: الكل | عملاء | شركاء | محلات | مشاهير
  const [selectedTypeTab, setSelectedTypeTab] = useState<'all' | ProfileType>('all');

  // Unified Wallet Transactions & Expiration Management
  const [customerTransactions, setCustomerTransactions] = useState<UnifiedWalletTransaction[]>([]);
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [selectedExpiredCustomerSummary, setSelectedExpiredCustomerSummary] = useState<PartyExpiredBalanceSummary | null>(null);
  const [expiredModalTargetWallet, setExpiredModalTargetWallet] = useState<'cashback' | 'referral'>('cashback');

  // Search by Name, Phone, or Referral Code
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
  const [gameFilterSearch, setGameFilterSearch] = useState<string>('');
  const [selectedLoyalty, setSelectedLoyalty] = useState<string>('all');
  const [selectedPurchasingPower, setSelectedPurchasingPower] = useState<string>('all');
  const [selectedLifetimeTier, setSelectedLifetimeTier] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');

  // 1️⃣ Last Purchase Date Filter State (Calendar / Date Picker)
  const [lastPurchaseDateMode, setLastPurchaseDateMode] = useState<'all' | 'single' | 'range'>('all');
  const [lastPurchaseSingleDate, setLastPurchaseSingleDate] = useState<string>('');
  const [lastPurchaseStartDate, setLastPurchaseStartDate] = useState<string>('');
  const [lastPurchaseEndDate, setLastPurchaseEndDate] = useState<string>('');

  // 2️⃣ Account Creation Date Filter State (Calendar / Date Picker)
  const [createdDateMode, setCreatedDateMode] = useState<'all' | 'single' | 'range'>('all');
  const [createdSingleDate, setCreatedSingleDate] = useState<string>('');
  const [createdStartDate, setCreatedStartDate] = useState<string>('');
  const [createdEndDate, setCreatedEndDate] = useState<string>('');

  // 3️⃣ Birth Date Filter State (Calendar / Date Picker)
  const [birthDateMode, setBirthDateMode] = useState<'all' | 'single' | 'range'>('all');
  const [birthSingleDate, setBirthSingleDate] = useState<string>('');
  const [birthStartDate, setBirthStartDate] = useState<string>('');
  const [birthEndDate, setBirthEndDate] = useState<string>('');

  // Sorting
  const [sortBy, setSortBy] = useState<
    'alphabetical' | 'createdAtNewest' | 'createdAtOldest' | 'mostReferrals' | 'highestLoyalty' | 'highestSpending'
  >('createdAtNewest');

  // Pagination (10 per page default)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [selectedProfileCustomer, setSelectedProfileCustomer] = useState<Customer | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [customerToArchive, setCustomerToArchive] = useState<Customer | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    isOpen: boolean;
    customer: Customer | null;
  }>({ x: 0, y: 0, isOpen: false, customer: null });

  const loadData = () => {
    setCustomers(db.getCustomers(false));
    setArchivedCustomers(db.getArchivedCustomers());
    const allTickets = db.getTickets();
    setTickets(allTickets);
    const allCustomerTxs = db.getUnifiedWalletTransactions();
    setCustomerTransactions(allCustomerTxs);

    // Collect games dynamically from Game Tree without duplicates
    const gameTree = db.getGameTree();
    const gameNamesSet = new Set<string>();
    gameTree.forEach(g => {
      if (g.name?.trim()) gameNamesSet.add(g.name.trim());
    });
    const uniqueGames = Array.from(gameNamesSet).map(name => ({ id: name, name }));
    setAvailableGames(uniqueGames);
    setTimeout(() => setLoading(false), 150);
  };

  // Expiry Calculations for all customers
  const customerExpiryMap = useMemo(() => {
    const map = new Map<string, PartyExpiredBalanceSummary>();
    customers.forEach(c => {
      const summary = WalletExpirationService.getCustomerExpirySummary(c, customerTransactions);
      map.set(c.id, summary);
    });
    return map;
  }, [customers, customerTransactions]);

  const expiredCustomersCount = useMemo(() => {
    let count = 0;
    customerExpiryMap.forEach(sum => {
      if (sum.hasExpired) count++;
    });
    return count;
  }, [customerExpiryMap]);

  const handleCopyReferralMessage = async (referralCode: string, customerName?: string) => {
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
      .replace(/{name}/g, customerName || 'العميل')
      .replace(/{{اسم_العميل}}/g, customerName || 'العميل');
    await copyToClipboard(message, `رسالة كود الإحالة (${referralCode})`, showToast);
  };

  useEffect(() => {
    loadData();
    if (initialSelectedCustomer) {
      setSelectedProfileCustomer(initialSelectedCustomer);
    }
  }, [initialSelectedCustomer]);

  // Event Bus subscriptions for shortcuts
  useEffect(() => {
    const unsubNew = eventBus.subscribe(SYSTEM_EVENTS.TRIGGER_NEW, () => {
      setCustomerToEdit(null);
      setIsFormOpen(true);
    });

    const unsubSearch = eventBus.subscribe(SYSTEM_EVENTS.TRIGGER_SEARCH_FOCUS, () => {
      searchInputRef.current?.focus();
    });

    const unsubProducts = eventBus.subscribe(SYSTEM_EVENTS.PRODUCTS_UPDATED, () => {
      loadData();
    });

    return () => {
      unsubNew();
      unsubSearch();
      unsubProducts();
    };
  }, []);

  // -------------------------------------------------------------
  // Performance Optimization: Pre-Index Customer Completed Tickets & Games
  // -------------------------------------------------------------
  // 1. Map of Customer ID / Phone -> Set of game names from COMPLETED tickets only
  const customerCompletedGamesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();

    const addGame = (key: string, game: string) => {
      if (!key || !game) return;
      const cleanKey = key.trim();
      if (!map.has(cleanKey)) {
        map.set(cleanKey, new Set<string>());
      }
      const set = map.get(cleanKey)!;
      const normGame = game.toLowerCase().trim();
      set.add(game);
      set.add(normGame);
      const baseName = game.split('(')[0].trim().toLowerCase();
      if (baseName) set.add(baseName);
    };

    tickets.forEach(t => {
      // ONLY Completed tickets count towards games & last purchase!
      if (t.status !== 'completed') return;

      const keys = [t.customerId, t.customerPhone].filter(Boolean) as string[];

      // Ticket level game
      if (t.gameName) {
        keys.forEach(k => addGame(k, t.gameName));
      }

      // Multi-product item level games (credit all games inside multi-product tickets)
      if (t.items && Array.isArray(t.items)) {
        t.items.forEach(item => {
          if (item.gameName) {
            keys.forEach(k => addGame(k, item.gameName));
          }
          if (item.gameId) {
            keys.forEach(k => addGame(k, item.gameId));
          }
        });
      }
    });

    return map;
  }, [tickets]);

  // 2. Map of Customer ID / Phone -> Last COMPLETED purchase date (ISO string and YYYY-MM-DD)
  const customerLastCompletedPurchaseMap = useMemo(() => {
    const map = new Map<string, { isoDate: string; dateOnly: string }>();

    tickets.forEach(t => {
      // Completed tickets ONLY
      if (t.status !== 'completed') return;

      const dateStr = t.completedAt || t.updatedAt || t.createdAt;
      if (!dateStr) return;

      const time = new Date(dateStr).getTime();
      if (isNaN(time)) return;

      const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.slice(0, 10);
      const keys = [t.customerId, t.customerPhone].filter(Boolean) as string[];

      keys.forEach(k => {
        const cleanK = k.trim();
        const existing = map.get(cleanK);
        if (!existing || new Date(existing.isoDate).getTime() < time) {
          map.set(cleanK, { isoDate: dateStr, dateOnly });
        }
      });
    });

    return map;
  }, [tickets]);

  // 3. Centralized live metrics map for all customers
  const customerMetricsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof ProfileStatisticsService.calculateMetrics>>();
    customers.forEach(c => {
      map.set(c.id, ProfileStatisticsService.calculateMetrics(c, tickets));
    });
    return map;
  }, [customers, tickets]);

  // Helper to reset only last purchase date filter
  const handleResetDateFilter = () => {
    setLastPurchaseDateMode('all');
    setLastPurchaseSingleDate('');
    setLastPurchaseStartDate('');
    setLastPurchaseEndDate('');
  };

  const handleResetCreatedDateFilter = () => {
    setCreatedDateMode('all');
    setCreatedSingleDate('');
    setCreatedStartDate('');
    setCreatedEndDate('');
  };

  const handleResetBirthDateFilter = () => {
    setBirthDateMode('all');
    setBirthSingleDate('');
    setBirthStartDate('');
    setBirthEndDate('');
  };

  // Helper to reset all advanced filters
  const handleResetAllFilters = () => {
    setSelectedGame('all');
    setSelectedLoyalty('all');
    setSelectedPurchasingPower('all');
    setSelectedLifetimeTier('all');
    setSelectedSource('all');
    setNoteFilterQuery('');
    handleResetDateFilter();
    handleResetCreatedDateFilter();
    handleResetBirthDateFilter();
  };

  const isDateFilterActive = useMemo(() => {
    return Boolean(lastPurchaseStartDate || lastPurchaseEndDate);
  }, [lastPurchaseStartDate, lastPurchaseEndDate]);

  const isCreatedDateFilterActive = useMemo(() => {
    return Boolean(createdStartDate || createdEndDate);
  }, [createdStartDate, createdEndDate]);

  const isBirthDateFilterActive = useMemo(() => {
    if (birthDateMode === 'single') return Boolean(birthSingleDate);
    if (birthDateMode === 'range') return Boolean(birthStartDate || birthEndDate);
    return false;
  }, [birthDateMode, birthSingleDate, birthStartDate, birthEndDate]);

  const hasAnyFilterActive = useMemo(() => {
    return (
      selectedGame !== 'all' ||
      selectedLoyalty !== 'all' ||
      selectedPurchasingPower !== 'all' ||
      selectedLifetimeTier !== 'all' ||
      selectedSource !== 'all' ||
      Boolean(noteFilterQuery.trim()) ||
      isDateFilterActive ||
      isCreatedDateFilterActive ||
      isBirthDateFilterActive ||
      Boolean(searchQuery) ||
      selectedTypeTab !== 'all'
    );
  }, [
    selectedGame,
    selectedLoyalty,
    selectedPurchasingPower,
    selectedLifetimeTier,
    selectedSource,
    noteFilterQuery,
    isDateFilterActive,
    isCreatedDateFilterActive,
    isBirthDateFilterActive,
    searchQuery,
    selectedTypeTab
  ]);

  // Filtering & Sorting
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => {
        // Tab Filter
        if (selectedTypeTab !== 'all' && c.profileType !== selectedTypeTab) {
          return false;
        }

        // Expired Balance Filter
        if (expiredOnly) {
          const sum = customerExpiryMap.get(c.id);
          if (!sum?.hasExpired) return false;
        }

        // Search Filter (Name, Phone, Referral Code, Shop Name, Birth Date)
        const q = (searchQuery || '').toLowerCase().trim();
        if (q) {
          const matchesQuery =
            Boolean(c.name && c.name.toLowerCase().includes(q)) ||
            Boolean(c.phone && c.phone.includes(q)) ||
            Boolean(c.code && c.code.toLowerCase().includes(q)) ||
            Boolean(c.referralCode && c.referralCode.toLowerCase().includes(q)) ||
            Boolean(c.shopName && c.shopName.toLowerCase().includes(q)) ||
            Boolean(c.birthDate && c.birthDate.includes(q));
          if (!matchesQuery) return false;
        }

        // Note Filter (Exclusive to Customer Notes - Partial & Normalized)
        if (noteFilterQuery.trim()) {
          const normQuery = normalizeArabicText(noteFilterQuery);
          const additionalNotes = (db.getCustomerNotes(c.id) || []).map(n => n.content).filter(Boolean);
          const phoneNotes = c.phone ? (db.getCustomerNotes(c.phone) || []).map(n => n.content).filter(Boolean) : [];
          const rawCustomerNotes = typeof c.notes === 'string' ? c.notes : '';
          const rawNotes = [rawCustomerNotes, ...additionalNotes, ...phoneNotes].filter(Boolean).join(' ');

          if (!rawNotes.trim()) {
            return false;
          }

          const normNotes = normalizeArabicText(rawNotes);
          const queryWords = normQuery.split(' ').filter(Boolean);
          const matchesAll = queryWords.every(word => normNotes.includes(word));
          if (!matchesAll) return false;
        }

        const metrics = customerMetricsMap.get(c.id) || ProfileStatisticsService.calculateMetrics(c, tickets);

        // 2️⃣ Game Filter (Based on customer's completed tickets history)
        if (selectedGame !== 'all') {
          const gamesSet =
            customerCompletedGamesMap.get(c.id) ||
            (c.phone ? customerCompletedGamesMap.get(c.phone) : undefined);

          if (!gamesSet || gamesSet.size === 0) {
            return false;
          }

          const selectedNorm = selectedGame.toLowerCase().trim();
          const selectedBase = selectedGame.split('(')[0].trim().toLowerCase();

          const hasMatch =
            gamesSet.has(selectedGame) ||
            gamesSet.has(selectedNorm) ||
            (selectedBase ? gamesSet.has(selectedBase) : false) ||
            Array.from(gamesSet).some(
              g => g.toLowerCase().includes(selectedBase) || selectedNorm.includes(g.toLowerCase())
            );

          if (!hasMatch) return false;
        }

        // Loyalty Tier Filter (Dynamic based on completed tickets count)
        if (selectedLoyalty !== 'all' && metrics.loyaltyTier !== selectedLoyalty) {
          return false;
        }

        // Purchasing Power Filter (Dynamic based on highest single completed ticket)
        if (selectedPurchasingPower !== 'all' && metrics.purchasingPower !== selectedPurchasingPower) {
          return false;
        }

        // Lifetime Spending Tier Filter (USD based on historical rates per ticket)
        if (selectedLifetimeTier !== 'all' && metrics.lifetimeSpendingTier !== selectedLifetimeTier) {
          return false;
        }

        // Source / Ad Platform Filter
        if (selectedSource !== 'all' && c.source !== selectedSource) {
          return false;
        }

        // 1️⃣ Last Purchase Date Filter (Calendar / Date Picker on Completed Tickets Only)
        if (isDateFilterActive) {
          const custPurchase =
            customerLastCompletedPurchaseMap.get(c.id) ||
            (c.phone ? customerLastCompletedPurchaseMap.get(c.phone) : undefined);

          // If no completed tickets found in tickets index, check metrics.lastPurchaseDate as fallback
          const custDateOnly = custPurchase
            ? custPurchase.dateOnly
            : metrics.lastPurchaseDate
            ? metrics.lastPurchaseDate.includes('T')
              ? metrics.lastPurchaseDate.split('T')[0]
              : metrics.lastPurchaseDate.slice(0, 10)
            : null;

          // Customer without any completed purchases fails any active date filter
          if (!custDateOnly) {
            return false;
          }

          if (lastPurchaseStartDate && custDateOnly < lastPurchaseStartDate) {
            return false;
          }
          if (lastPurchaseEndDate && custDateOnly > lastPurchaseEndDate) {
            return false;
          }
        }

        // 2️⃣ Account Creation Date Filter
        if (isCreatedDateFilterActive) {
          const createdDateOnly = (c.createdAt || '').split('T')[0];
          if (!createdDateOnly) return false;

          if (createdStartDate && createdDateOnly < createdStartDate) return false;
          if (createdEndDate && createdDateOnly > createdEndDate) return false;
        }

        // 3️⃣ Birth Date Filter
        if (isBirthDateFilterActive) {
          const birthDateOnly = (c.birthDate || '').split('T')[0];
          if (!birthDateOnly) return false;

          if (birthDateMode === 'single' && birthSingleDate) {
            if (birthDateOnly !== birthSingleDate) return false;
          } else if (birthDateMode === 'range') {
            if (birthStartDate && birthDateOnly < birthStartDate) return false;
            if (birthEndDate && birthDateOnly > birthEndDate) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const metricsA = customerMetricsMap.get(a.id);
        const metricsB = customerMetricsMap.get(b.id);
        if (sortBy === 'alphabetical') {
          return a.name.localeCompare(b.name, 'ar');
        }
        if (sortBy === 'createdAtNewest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'createdAtOldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'mostReferrals') {
          return (b.monthlyReferredCount || 0) - (a.monthlyReferredCount || 0);
        }
        if (sortBy === 'highestLoyalty') {
          return (metricsB?.totalOrders ?? b.totalOrders ?? 0) - (metricsA?.totalOrders ?? a.totalOrders ?? 0);
        }
        if (sortBy === 'highestSpending') {
          return (metricsB?.totalSpent ?? b.totalSpent ?? 0) - (metricsA?.totalSpent ?? a.totalSpent ?? 0);
        }
        return 0;
      });
  }, [
    customers,
    selectedTypeTab,
    searchQuery,
    selectedGame,
    selectedLoyalty,
    selectedPurchasingPower,
    selectedLifetimeTier,
    selectedSource,
    lastPurchaseDateMode,
    lastPurchaseSingleDate,
    lastPurchaseStartDate,
    lastPurchaseEndDate,
    isDateFilterActive,
    createdDateMode,
    createdSingleDate,
    createdStartDate,
    createdEndDate,
    isCreatedDateFilterActive,
    birthDateMode,
    birthSingleDate,
    birthStartDate,
    birthEndDate,
    isBirthDateFilterActive,
    customerCompletedGamesMap,
    customerLastCompletedPurchaseMap,
    customerMetricsMap,
    sortBy,
    tickets,
    noteFilterQuery,
    expiredOnly,
    customerExpiryMap
  ]);

  // Paginated List
  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedTypeTab,
    searchQuery,
    selectedGame,
    selectedLoyalty,
    selectedPurchasingPower,
    selectedLifetimeTier,
    selectedSource,
    lastPurchaseDateMode,
    lastPurchaseSingleDate,
    lastPurchaseStartDate,
    lastPurchaseEndDate,
    sortBy
  ]);

  // Save (Create or Update)
  const handleSaveCustomer = (customerData: Partial<Customer>) => {
    const isEdit = !!customerToEdit;
    const oldReferralCode = customerToEdit?.referralCode;
    const newReferralCode = customerData.referralCode;

    const effectiveBal = customerData.accountBalance !== undefined 
      ? Number(customerData.accountBalance) 
      : (customerData.balance !== undefined ? Number(customerData.balance) : (isEdit && customerToEdit ? (customerToEdit.accountBalance ?? customerToEdit.balance ?? 0) : 0));

    let customerObj: Customer;
    if (isEdit && customerToEdit) {
      const oldBal = customerToEdit.accountBalance !== undefined ? Number(customerToEdit.accountBalance) : (customerToEdit.balance ?? 0);
      customerObj = {
        ...customerToEdit,
        ...customerData,
        balance: effectiveBal,
        accountBalance: effectiveBal,
        updatedAt: new Date().toISOString()
      };

      if (effectiveBal !== oldBal) {
        const diff = effectiveBal - oldBal;
        db.addUnifiedWalletTransaction({
          customerId: customerObj.id,
          walletType: 'account_balance',
          type: (diff > 0 ? 'deposit' : 'debit') as any,
          operationName: diff > 0 ? 'إيداع/تعديل يدوي دائن للمحفظة' : 'عجز/تعديل يدوي مدين للمحفظة',
          amount: Math.abs(diff),
          balanceAfter: effectiveBal,
          notes: `تعديل يدوي للرصيد من ${oldBal} ج إلى ${effectiveBal} ج`
        });
      }
    } else {
      customerObj = {
        ...customerData,
        id: customerData.id || 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        balance: effectiveBal,
        accountBalance: effectiveBal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Customer;
    }

    db.saveCustomer(customerObj);

    // If newly created customer with initial balances, record ledger transactions
    if (!isEdit) {
      if (Number(customerObj.accountBalance) !== 0) {
        db.addUnifiedWalletTransaction({
          customerId: customerObj.id,
          walletType: 'account_balance',
          type: (Number(customerObj.accountBalance) > 0 ? 'deposit' : 'debit') as any,
          operationName: 'رصيد افتتاحي للمحفظة الأساسية',
          amount: Math.abs(Number(customerObj.accountBalance)),
          balanceAfter: Number(customerObj.accountBalance),
          notes: 'رصيد افتتاحي عند إنشاء ملف العميل'
        });
      }
      if (Number(customerObj.cashbackBalance) > 0) {
        db.addUnifiedWalletTransaction({
          customerId: customerObj.id,
          walletType: 'cashback',
          type: 'earned',
          operationName: 'رصيد كاش باك افتتاحي',
          amount: Number(customerObj.cashbackBalance),
          balanceAfter: Number(customerObj.cashbackBalance),
          notes: 'رصيد كاش باك افتتاحي عند إنشاء ملف العميل'
        });
      }
      if (Number(customerObj.referralWalletBalance) > 0) {
        db.addUnifiedWalletTransaction({
          customerId: customerObj.id,
          walletType: 'referral',
          type: 'commission',
          operationName: 'رصيد إحالة افتتاحي',
          amount: Number(customerObj.referralWalletBalance),
          balanceAfter: Number(customerObj.referralWalletBalance),
          notes: 'رصيد إحالة افتتاحي عند إنشاء ملف العميل'
        });
      }
    }

    // If referredByCode was supplied or modified, create/update full database referral relationship
    if (customerData.referredByCode && customerData.referredByCode.trim()) {
      const linkResult = db.linkCustomerReferral(customerObj.id, customerData.referredByCode);
      if (linkResult.success) {
        showToast('info', 'ربط الإحالة', linkResult.message);
      }
    }

    // Comprehensive Audit Logging with Old vs New Values
    if (isEdit && customerToEdit) {
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المدير المالك', role: user?.role || 'admin', department: 'الزبائن' },
        'edit',
        'تعديل بيانات العميل',
        customerObj.id,
        customerObj.name,
        `تعديل شامل لبيانات العميل (${customerObj.name}) بواسطة ${user?.fullName || 'المدير المالك'}`,
        {
          name: customerToEdit.name,
          phone: customerToEdit.phone,
          email: customerToEdit.email,
          profileType: customerToEdit.profileType,
          favoriteGame: customerToEdit.favoriteGame,
          birthDate: customerToEdit.birthDate,
          cashbackRate: customerToEdit.cashbackRate
        },
        {
          name: customerObj.name,
          phone: customerObj.phone,
          email: customerObj.email,
          profileType: customerObj.profileType,
          favoriteGame: customerObj.favoriteGame,
          birthDate: customerObj.birthDate,
          cashbackRate: customerObj.cashbackRate
        }
      );
    } else {
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المسؤول', role: user?.role || 'user', department: 'الزبائن' },
        'add',
        'بروفايل عميل جديد',
        customerObj.id,
        customerObj.name,
        `تم إنشاء بروفايل جديد بكود [${customerObj.code}] وكود إحالة [${customerObj.referralCode}]`
      );
    }

    // Audit Logging for Cashback Rate changes by Manager
    if (isEdit && customerToEdit && customerToEdit.cashbackRate !== customerObj.cashbackRate) {
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المدير المالك', role: user?.role || 'admin', department: 'إدارة النظام' },
        'edit',
        'نسبة الكاش باك (Cashback Rate)',
        customerObj.id,
        customerObj.name,
        `تعديل نسبة الكاش باك من [${customerToEdit.cashbackRate ?? 1}%] إلى [${customerObj.cashbackRate}%]`,
        { cashbackRate: customerToEdit.cashbackRate ?? 1 },
        { cashbackRate: customerObj.cashbackRate }
      );
    }

    // If referral code was modified by Manager: Log in Audit Log and maintain linkage integrity
    if (isEdit && oldReferralCode && newReferralCode && oldReferralCode !== newReferralCode) {
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المدير المالك', role: user?.role || 'admin', department: 'إدارة النظام' },
        'edit',
        'كود الإحالة (Referral Code)',
        customerObj.id,
        customerObj.name,
        `تعديل كود الإحالة من [${oldReferralCode}] إلى [${newReferralCode}]`,
        { referralCode: oldReferralCode },
        { referralCode: newReferralCode }
      );

      // Add audit note to customer profile
      db.addCustomerNote({
        customerId: customerObj.id,
        authorName: user?.fullName || 'المدير المالك',
        authorRole: 'إدارة النظام',
        content: `🔄 تم تعديل كود الإحالة الخاص بالعميل من (${oldReferralCode}) إلى (${newReferralCode})`,
        type: 'general'
      });

      // Update referees who registered with the old code to preserve referral network linkage
      const allCustomers = db.getCustomers(true);
      allCustomers.forEach(referee => {
        if (referee.referredByCode === oldReferralCode) {
          referee.referredByCode = newReferralCode;
          db.saveCustomer(referee);
        }
      });
    }

    // Audit Logging for Profile Type changes
    if (isEdit && customerToEdit && customerToEdit.profileType !== customerObj.profileType) {
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المدير المالك', role: user?.role || 'admin', department: 'إدارة النظام' },
        'edit',
        'نوع البروفايل (Profile Type)',
        customerObj.id,
        customerObj.name,
        `تعديل نوع البروفايل من [${customerToEdit.profileType}] إلى [${customerObj.profileType}]`
      );
    }

    // Audit Logging for Partner Commissions & Target changes
    if (
      isEdit &&
      customerToEdit &&
      (customerToEdit.firstMonthCommissionRate !== customerObj.firstMonthCommissionRate ||
        customerToEdit.lifetimeCommissionRate !== customerObj.lifetimeCommissionRate ||
        customerToEdit.monthlyTargetCount !== customerObj.monthlyTargetCount)
    ) {
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المدير المالك', role: user?.role || 'admin', department: 'إدارة النظام' },
        'edit',
        'عمولات وشرط استمرار الشريك',
        customerObj.id,
        customerObj.name,
        `تحديث نسب العمولات (الشهر الأول: ${customerObj.firstMonthCommissionRate}%، مدى الحياة: ${customerObj.lifetimeCommissionRate}%) والهدف الشهري: ${customerObj.monthlyTargetCount} عميل`
      );
    }

    eventBus.publish(isEdit ? SYSTEM_EVENTS.CUSTOMER_UPDATED : SYSTEM_EVENTS.CUSTOMER_CREATED, customerObj);
    showToast('success', isEdit ? 'تم التعديل' : 'تمت الإضافة', `تم حفظ بروفايل ${customerObj.name}`);

    // Register Undo / Redo for Customer creation / modification
    if (isEdit && customerToEdit) {
      const prevCustomerSnapshot = { ...customerToEdit };
      const newCustomerSnapshot = { ...customerObj };
      pushAction(
        `تعديل العميل (${customerObj.name})`,
        () => {
          db.saveCustomer(prevCustomerSnapshot);
          loadData();
        },
        () => {
          db.saveCustomer(newCustomerSnapshot);
          loadData();
        }
      );
    } else {
      const newCustomerSnapshot = { ...customerObj };
      pushAction(
        `إضافة عميل جديد (${customerObj.name})`,
        () => {
          db.deleteCustomer(newCustomerSnapshot.id);
          loadData();
        },
        () => {
          db.saveCustomer(newCustomerSnapshot);
          loadData();
        }
      );
    }

    setIsFormOpen(false);
    setCustomerToEdit(null);
    loadData();
  };

  // Soft Delete / Archive
  const handleArchiveConfirm = () => {
    if (!customerToArchive) return;
    const cust = customerToArchive;
    db.archiveCustomer(cust.id);

    db.logAction(
      { id: user?.id || 'sys', name: user?.fullName || 'مستخدم', role: user?.role || 'user', department: 'الزبائن' },
      'archive',
      'بروفايل عميل',
      cust.id,
      cust.name,
      'تم نقل البروفايل إلى الأرشيف (Soft Delete)'
    );

    eventBus.publish(SYSTEM_EVENTS.CUSTOMER_ARCHIVED, cust);
    showToast('warning', 'تمت الأرشفة', `تم نقل البروفايل ${cust.name} إلى الأرشيف`);
    setCustomerToArchive(null);
    loadData();
  };

  // Context Menu
  const handleRowContextMenu = (e: React.MouseEvent, customer: Customer) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      isOpen: true,
      customer
    });
  };

  const contextMenuItems: ContextMenuItem[] = contextMenu.customer
    ? [
        {
          id: 'ctx_open',
          label: 'فتح البروفايل الكامل',
          icon: <Eye className="w-4 h-4 text-blue-500" />,
          onClick: () => setSelectedProfileCustomer(contextMenu.customer)
        },
        {
          id: 'ctx_manage_expiry',
          label: 'إدارة الرصيد منتهي الصلاحية ⚠️',
          icon: <Clock className="w-4 h-4 text-rose-500" />,
          onClick: () => {
            if (contextMenu.customer) {
              const sum = customerExpiryMap.get(contextMenu.customer.id) || WalletExpirationService.getCustomerExpirySummary(contextMenu.customer, customerTransactions);
              setSelectedExpiredCustomerSummary(sum);
              setExpiredModalTargetWallet(sum.cashbackExpired > 0 ? 'cashback' : 'referral');
              setIsExpiredModalOpen(true);
            }
          }
        },
        {
          id: 'ctx_edit',
          label: 'تعديل البيانات',
          icon: <Edit2 className="w-4 h-4 text-amber-500" />,
          onClick: () => {
            setCustomerToEdit(contextMenu.customer);
            setIsFormOpen(true);
          }
        },
        {
          id: 'ctx_copy_phone',
          label: 'نسخ رقم الهاتف',
          icon: <Copy className="w-4 h-4 text-zinc-400" />,
          onClick: () => {
            if (contextMenu.customer?.phone) {
              copyToClipboard(contextMenu.customer.phone, `رقم الهاتف (${contextMenu.customer.phone})`, showToast);
            }
          }
        },
        {
          id: 'ctx_copy_ref',
          label: 'نسخ كود ورسالة الإحالة',
          icon: <Award className="w-4 h-4 text-orange-500" />,
          onClick: () => {
            if (contextMenu.customer?.referralCode) {
              handleCopyReferralMessage(contextMenu.customer.referralCode, contextMenu.customer.name);
            }
          },
          divider: true
        },
        {
          id: 'ctx_archive',
          label: 'أرشفة البروفايل (Soft Delete)',
          icon: <Archive className="w-4 h-4 text-rose-500" />,
          variant: 'danger',
          onClick: () => setCustomerToArchive(contextMenu.customer)
        }
      ]
    : [];

  // Export filtered Names and Phones
  const handleExportFiltered = () => {
    const exportData = filteredCustomers.map(c => {
      const metrics = customerMetricsMap.get(c.id) || ProfileStatisticsService.calculateMetrics(c, tickets);
      return {
        'الاسم': c.name,
        'رقم الهاتف': c.phone,
        'تاريخ الميلاد': c.birthDate ? formatDate(c.birthDate) : '—',
        'تاريخ إنشاء الملف': c.createdAt ? formatDateTime(c.createdAt) : '—',
        'النوع': c.profileType === 'regular' ? 'عميل' : c.profileType === 'partner' ? 'شريك' : c.profileType === 'shop' ? 'محل' : 'مشهور',
        'كود الإحالة': c.referralCode,
        'مستوى الولاء': metrics.loyaltyTier,
        'عدد التذاكر المكتملة': metrics.totalOrders,
        'قوة الشراء': metrics.purchasingPower,
        'أعلى معاملة منفردة (EGP)': metrics.maxSingleOrderAmount,
        'تصنيف إجمالي الإنفاق': metrics.lifetimeSpendingTier,
        'إجمالي المدفوع (EGP)': metrics.totalSpent,
        'إجمالي المدفوع (USD)': metrics.totalSpentUSD,
        'رصيد الكاش باك': c.cashbackBalance,
        'المنصة': c.source
      };
    });

    exportToExcel(exportData, 'دليل_البروفايلات_المفلترة_JKR');
    showToast('info', 'تم التصدير', `تم تصدير ${filteredCustomers.length} بروفايل بنجاح`);
  };

  const getProfileTypeBadge = (type: ProfileType) => {
    switch (type) {
      case 'partner':
        return <Badge variant="warning" size="sm">شريك (Partner)</Badge>;
      case 'shop':
        return <Badge variant="info" size="sm">محل (Shop)</Badge>;
      case 'influencer':
        return <Badge variant="purple" size="sm">مشهور (Influencer)</Badge>;
      default:
        return <Badge variant="default" size="sm">عميل عادي</Badge>;
    }
  };

  const getLoyaltyBadge = (tier: LoyaltyTier) => {
    switch (tier) {
      case 'vip':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 whitespace-nowrap shadow-2xs">👑 VIP</span>;
      case 'gold':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap shadow-2xs">🥇 ذهبي</span>;
      case 'silver':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border border-zinc-500/30 whitespace-nowrap shadow-2xs">🥈 فضي</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-500/10 text-gray-600 dark:text-zinc-400 border border-gray-500/20 whitespace-nowrap shadow-2xs">🌱 عادي</span>;
    }
  };

  const getPurchasingPowerBadge = (power: PurchasingPower) => {
    switch (power) {
      case 'whale':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 whitespace-nowrap shadow-2xs">
            <span>🐋</span>
            <span>حوت (+4501 ج)</span>
          </span>
        );
      case 'strong':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow-2xs">
            <span>💪</span>
            <span>قوي (2000-4500 ج)</span>
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 whitespace-nowrap shadow-2xs">
            <span>⚡</span>
            <span>متوسط (500-1999 ج)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-500/10 text-zinc-400 border border-gray-500/20 whitespace-nowrap shadow-2xs">
            <span>🌱</span>
            <span>عادي (0-499 ج)</span>
          </span>
        );
    }
  };

  const getLifetimeSpendingTierBadge = (tier?: LifetimeSpendingTier) => {
    switch (tier) {
      case 'platinum':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 whitespace-nowrap shadow-2xs">
            <span>💎</span>
            <span>بلاتينيوم (+1500$)</span>
          </span>
        );
      case 'gold':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap shadow-2xs">
            <span>🥇</span>
            <span>ذهبي (501-1500$)</span>
          </span>
        );
      case 'silver':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-zinc-400/15 text-zinc-300 border border-zinc-400/30 whitespace-nowrap shadow-2xs">
            <span>🥈</span>
            <span>فضي (101-500$)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-700/15 text-amber-600 dark:text-amber-500 border border-amber-700/30 whitespace-nowrap shadow-2xs">
            <span>🥉</span>
            <span>برونز (حتى 100$)</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-right">
      <div className="space-y-4">
          {/* Top Type Tab Bar: الكل | عملاء | شركاء | محلات | مشاهير */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] overflow-x-auto shadow-xs">
            <button
              onClick={() => setSelectedTypeTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                selectedTypeTab === 'all'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>الكل ({customers.length})</span>
            </button>

        <button
          onClick={() => setSelectedTypeTab('regular')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            selectedTypeTab === 'regular'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>عملاء ({customers.filter(c => c.profileType === 'regular').length})</span>
        </button>

        <button
          onClick={() => setSelectedTypeTab('partner')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            selectedTypeTab === 'partner'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>شركاء ({customers.filter(c => c.profileType === 'partner').length})</span>
        </button>

        <button
          onClick={() => setSelectedTypeTab('shop')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            selectedTypeTab === 'shop'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-blue-400" />
          <span>محلات ({customers.filter(c => c.profileType === 'shop').length})</span>
        </button>

        <button
          onClick={() => setSelectedTypeTab('influencer')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            selectedTypeTab === 'influencer'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Video className="w-3.5 h-3.5 text-purple-400" />
          <span>مشاهير ({customers.filter(c => c.profileType === 'influencer').length})</span>
        </button>

        {/* Quick Expiry Filter Button */}
        <button
          onClick={() => {
            setExpiredOnly(!expiredOnly);
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            expiredOnly
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : expiredCustomersCount > 0
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
          title="تصفية العملاء الذين لديهم كاش باك (تعدى 6 شهور) أو رصيد إحالة (تعدى 12 شهر)"
        >
          <Clock className="w-3.5 h-3.5 text-rose-500" />
          <span>⚠️ أرصدة منتهية ({expiredCustomersCount})</span>
        </button>
      </div>

      {/* Search & Action Bar */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Quick Search Input */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="بحث بالاسم، برقم الهاتف، أو بكود الإحالة (Ctrl+F)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-xs sm:text-sm pr-10 pl-4 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-orange-500"
              />
            </div>

            <Button
              variant={showAdvancedFilters ? 'primary' : 'outline'}
              size="sm"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              فلاتر متاحة
            </Button>

            {/* Note Filter Popover */}
            <div className="relative" ref={noteFilterPopoverRef}>
              <button
                type="button"
                onClick={() => setIsNoteFilterOpen(prev => !prev)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer select-none ${
                  noteFilterQuery.trim()
                    ? 'bg-orange-500/15 text-orange-500 border-orange-500/40 shadow-xs'
                    : isNoteFilterOpen
                    ? 'bg-gray-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-gray-300 dark:border-zinc-700'
                    : 'bg-white dark:bg-[#141417] text-zinc-600 dark:text-zinc-400 border-gray-200 dark:border-[#27272A] hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="البحث بالملحوظة الخاصة بالعميل"
              >
                <FileText className="w-4 h-4 text-orange-500" />
                <span>الملحوظة</span>
                {noteFilterQuery.trim() && (
                  <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                )}
              </button>

              {/* Popover Card */}
              {isNoteFilterOpen && (
                <div className="absolute top-12 right-0 z-50 w-72 sm:w-80 p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xl shadow-black/10 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-[#27272A]">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-orange-500" /> فلتر الملحوظة
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
                      className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] pr-9 pl-8 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-orange-500"
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
                    * يبحث حصرياً داخل ملحوظة العميل، ولا يبحث في الاسم أو الهاتف أو المنتجات.
                  </p>

                  {noteFilterQuery && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-[#27272A]">
                      <span className="text-[11px] text-zinc-400">
                        النتائج: <strong className="text-orange-500">{filteredCustomers.length}</strong>
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
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setCustomerToEdit(null);
                setIsFormOpen(true);
              }}
            >
              إضافة عميل جديد (Ctrl+N)
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4 text-orange-500" />}
              onClick={() => setIsReportModalOpen(true)}
            >
              🖨️ طباعة تقرير العملاء
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4 text-emerald-500" />}
              onClick={handleExportFiltered}
            >
              تصدير المفلتر ({filteredCustomers.length})
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Archive className="w-4 h-4 text-amber-500" />}
              onClick={() => setIsArchiveModalOpen(true)}
            >
              الأرشيف ({archivedCustomers.length})
            </Button>
          </div>
        </div>

        {/* 6 Advanced Integrated Filters working simultaneously */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#27272A] space-y-3 text-xs animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* 1. Game Filter (Linked strictly to Products Catalog) */}
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Gamepad2 className="w-3.5 h-3.5 text-orange-500" />
                    <span>فلتر الألعاب (من قسم المنتجات)</span>
                  </span>
                </label>
                <SearchableSelect
                  options={availableGames.map(g => ({
                    value: g.name,
                    label: g.name,
                    icon: <Gamepad2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  }))}
                  value={selectedGame}
                  onChange={val => setSelectedGame(val)}
                  allOptionLabel={`كافة الألعاب (${availableGames.length})`}
                  placeholder="ابحث عن لعبة..."
                />
              </div>

              {/* 2. Loyalty Tier */}
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>مستوى الولاء (التذاكر)</span>
                </label>
                <select
                  value={selectedLoyalty}
                  onChange={e => setSelectedLoyalty(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="all">كافة المستويات</option>
                  <option value="normal">عادي (1-9 تذاكر)</option>
                  <option value="silver">فضي (10-29 تذكرة)</option>
                  <option value="gold">ذهبي (30-99 تذكرة)</option>
                  <option value="vip">VIP ملكي (100+ تذكرة)</option>
                </select>
              </div>

              {/* 3. Purchasing Power */}
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                  <span>قوة الدفع (مرة واحدة)</span>
                </label>
                <select
                  value={selectedPurchasingPower}
                  onChange={e => setSelectedPurchasingPower(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="all">كافة الفئات</option>
                  <option value="normal">عادي (0 - 499 ج)</option>
                  <option value="medium">متوسط (500 - 1999 ج)</option>
                  <option value="strong">قوي (2000 - 4500 ج)</option>
                  <option value="whale">حوت (4501+ ج)</option>
                </select>
              </div>

              {/* 4. Lifetime Spending Tier (USD Historical Rates) */}
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-500" />
                  <span>تصنيف إجمالي الإنفاق (USD)</span>
                </label>
                <select
                  value={selectedLifetimeTier}
                  onChange={e => setSelectedLifetimeTier(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="all">كافة التصنيفات</option>
                  <option value="bronze">🥉 برونز (حتى $100)</option>
                  <option value="silver">🥈 فضي ($101 - $500)</option>
                  <option value="gold">🥇 ذهبي ($501 - $1500)</option>
                  <option value="platinum">💎 بلاتينيوم (أكثر من $1500)</option>
                </select>
              </div>

              {/* 5. Last Purchase Date Filter (Date Picker Engine) */}
              {/* 5. Last Purchase Date Filter */}
              <div className="sm:col-span-2 lg:col-span-1">
                <DateRangeFilter
                  startDate={lastPurchaseStartDate}
                  endDate={lastPurchaseEndDate}
                  onStartDateChange={setLastPurchaseStartDate}
                  onEndDateChange={setLastPurchaseEndDate}
                  onReset={() => {
                    setLastPurchaseStartDate('');
                    setLastPurchaseEndDate('');
                  }}
                  label="آخر عملية شراء"
                />
              </div>

              {/* 6. Account Creation Date Filter */}
              <div className="sm:col-span-2 lg:col-span-1">
                <DateRangeFilter
                  startDate={createdStartDate}
                  endDate={createdEndDate}
                  onStartDateChange={setCreatedStartDate}
                  onEndDateChange={setCreatedEndDate}
                  onReset={() => {
                    setCreatedStartDate('');
                    setCreatedEndDate('');
                  }}
                  label="تاريخ إنشاء الملف"
                />
              </div>

              {/* 7. Birth Date Filter */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-pink-500" />
                    <span>تاريخ الميلاد</span>
                  </span>
                  {isBirthDateFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetBirthDateFilter}
                      className="text-[10px] text-rose-500 hover:underline flex items-center gap-0.5"
                      title="إعادة تعيين فلتر تاريخ الميلاد"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>إعادة تعيين</span>
                    </button>
                  )}
                </label>
                <select
                  value={birthDateMode}
                  onChange={e => setBirthDateMode(e.target.value as any)}
                  className={`w-full rounded-xl bg-gray-50 dark:bg-[#141417] border p-2 text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer transition-colors ${
                    isBirthDateFilterActive
                      ? 'border-pink-500 ring-1 ring-pink-500/20 font-bold'
                      : 'border-gray-200 dark:border-[#27272A]'
                  }`}
                >
                  <option value="all">الكل (بدون تحديد)</option>
                  <option value="single">يوم محدد (📅)</option>
                  <option value="range">فترة زمنية (من - إلى 🗓️)</option>
                </select>
              </div>

              {/* 8. Ad Platform / Source */}
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span>منصة الإعلان / المصدر</span>
                </label>
                <select
                  value={selectedSource}
                  onChange={e => setSelectedSource(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="all">كافة المنصات</option>
                  <option value="facebook">فيسبوك (Facebook)</option>
                  <option value="instagram">إنستغرام (Instagram)</option>
                  <option value="tiktok">تيك توك (TikTok)</option>
                  <option value="telegram">تيليجرام (Telegram)</option>
                  <option value="whatsapp">واتساب (WhatsApp)</option>
                  <option value="word_of_mouth">سمع عنا (توصية)</option>
                  <option value="unspecified">غير محدد</option>
                </select>
              </div>

              {/* 9. Sorting Selection */}
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-purple-500" />
                  <span>ترتيب القائمة</span>
                </label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none font-semibold cursor-pointer"
                >
                  <option value="createdAtNewest">تاريخ الإضافة (الأحدث)</option>
                  <option value="createdAtOldest">تاريخ الإضافة (الأقدم)</option>
                  <option value="alphabetical">أبجدي (أ → ي)</option>
                  <option value="mostReferrals">أكثر إحالات مرتبطة</option>
                  <option value="highestLoyalty">أعلى ولاء (عدد التذاكر)</option>
                  <option value="highestSpending">أعلى قوة شرائية (إجمالي مدفوع)</option>
                </select>
              </div>
            </div>



            {/* Birth Date Controls */}
            {birthDateMode !== 'all' && (
              <div className="p-3 rounded-xl bg-pink-500/5 dark:bg-pink-500/10 border border-pink-500/20 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                {birthDateMode === 'single' ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>تحديد يوم تاريخ الميلاد:</span>
                    </span>
                    <input
                      type="date"
                      value={birthSingleDate}
                      onChange={e => setBirthSingleDate(e.target.value)}
                      className="rounded-lg bg-white dark:bg-[#18181B] border border-pink-500/30 px-3 py-1.5 text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-pink-500 text-xs"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>فترة تاريخ الميلاد:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-bold">من:</span>
                      <input
                        type="date"
                        value={birthStartDate}
                        onChange={e => setBirthStartDate(e.target.value)}
                        className="rounded-lg bg-white dark:bg-[#18181B] border border-pink-500/30 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-pink-500 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-bold">إلى:</span>
                      <input
                        type="date"
                        value={birthEndDate}
                        onChange={e => setBirthEndDate(e.target.value)}
                        className="rounded-lg bg-white dark:bg-[#18181B] border border-pink-500/30 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 font-mono outline-none focus:border-pink-500 text-xs"
                      />
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleResetBirthDateFilter}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            )}


          </div>
        )}

        {/* Active Filters Bar (Quick Chips & Fast Reset) */}
        {hasAnyFilterActive && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-zinc-500">الفلاتر المطبقة:</span>

              {selectedTypeTab !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold">
                  <span>النوع: {selectedTypeTab}</span>
                  <button onClick={() => setSelectedTypeTab('all')} className="hover:text-orange-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {expiredOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold font-mono">
                  <Clock className="w-3 h-3 text-rose-500" />
                  <span>أرصدة منتهية الصلاحية ⚠️</span>
                  <button onClick={() => setExpiredOnly(false)} className="hover:text-rose-800">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedGame !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold">
                  <Gamepad2 className="w-3 h-3" />
                  <span>اللعبة: {selectedGame}</span>
                  <button onClick={() => setSelectedGame('all')} className="hover:text-orange-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {isDateFilterActive && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
                  <Calendar className="w-3 h-3" />
                  <span>
                    آخر شراء:{' '}
                    {lastPurchaseDateMode === 'single'
                      ? lastPurchaseSingleDate || 'غير محدد'
                      : `${lastPurchaseStartDate || 'البداية'} ← ${lastPurchaseEndDate || 'اليوم'}`}
                  </span>
                  <button onClick={handleResetDateFilter} className="hover:text-emerald-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedLoyalty !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                  <span>الولاء: {selectedLoyalty}</span>
                  <button onClick={() => setSelectedLoyalty('all')} className="hover:text-amber-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedPurchasingPower !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 font-bold">
                  <span>قوة الشراء: {selectedPurchasingPower}</span>
                  <button onClick={() => setSelectedPurchasingPower('all')} className="hover:text-cyan-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedLifetimeTier !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
                  <span>تصنيف الإنفاق: {selectedLifetimeTier === 'platinum' ? '💎 بلاتينيوم' : selectedLifetimeTier === 'gold' ? '🥇 ذهبي' : selectedLifetimeTier === 'silver' ? '🥈 فضي' : '🥉 برونز'}</span>
                  <button onClick={() => setSelectedLifetimeTier('all')} className="hover:text-emerald-700">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {Boolean(noteFilterQuery.trim()) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold">
                  <FileText className="w-3 h-3" />
                  <span>الملحوظة: {noteFilterQuery}</span>
                  <button onClick={() => setNoteFilterQuery('')} className="hover:text-orange-700 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 font-bold">
                  <span>البحث: "{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-zinc-200">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-zinc-500 font-medium">
                تم العثور على <strong>{filteredCustomers.length}</strong> من أصل <strong>{customers.length}</strong> بروفايل
              </span>
              <button
                onClick={handleResetAllFilters}
                className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold flex items-center gap-1 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إلغاء كافة الفلاتر</span>
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Profiles Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={11} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-[#161616] border-b border-gray-200 dark:border-[#27272A] text-zinc-500 font-bold text-xs whitespace-nowrap">
                  <th className="py-3 px-4">نوع العميل</th>
                  <th className="py-3 px-4">الاسم والنشاط</th>
                  <th className="py-3 px-4">رقم الهاتف</th>
                  <th className="py-3 px-4">رصيد دائن / مدين</th>
                  <th className="py-3 px-4">كاش باك</th>
                  <th className="py-3 px-4">مستوى الولاء</th>
                  <th className="py-3 px-4">قوة الشراء</th>
                  <th className="py-3 px-4">تصنيف الإنفاق</th>
                  <th className="py-3 px-4">كود الإحالة</th>
                  <th className="py-3 px-4">إجمالي المدفوع (EGP / USD)</th>
                  <th className="py-3 px-4 text-center">فتح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-zinc-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-orange-500" />
                      لا توجد بروفايلات مطابقة لخيارات الفلترة الحالية
                      {hasAnyFilterActive && (
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={handleResetAllFilters} icon={<RotateCcw className="w-3.5 h-3.5" />}>
                            إلغاء الفلاتر وعرض كافة العملاء
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map(cust => {
                    const metrics = customerMetricsMap.get(cust.id) || ProfileStatisticsService.calculateMetrics(cust, tickets);
                    const expirySummary = customerExpiryMap.get(cust.id);
                    const lastPurchase =
                      customerLastCompletedPurchaseMap.get(cust.id) ||
                      (cust.phone ? customerLastCompletedPurchaseMap.get(cust.phone) : undefined);
                    const lastPurchaseDateDisplay = lastPurchase ? lastPurchase.isoDate : metrics.lastPurchaseDate;
                    const gamesSet =
                      customerCompletedGamesMap.get(cust.id) ||
                      (cust.phone ? customerCompletedGamesMap.get(cust.phone) : undefined);
                    const gamesList = gamesSet ? Array.from(gamesSet).filter(g => !g.includes('(') && g.length > 2).slice(0, 3) : [];

                    return (
                      <tr
                        key={cust.id}
                        onClick={() => setSelectedProfileCustomer(cust)}
                        onContextMenu={e => handleRowContextMenu(e, cust)}
                        className={`hover:bg-orange-500/5 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer whitespace-nowrap ${
                          cust.isFrozen ? 'opacity-60 bg-rose-500/5' : ''
                        }`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getProfileTypeBadge(cust.profileType)}
                          {cust.isFrozen && (
                            <span className="block text-[9px] text-rose-500 font-bold mt-0.5">مجمد</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-orange-500 transition-colors flex items-center gap-1.5">
                            <span>{cust.name}</span>
                            {expirySummary && expirySummary.hasExpired && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedExpiredCustomerSummary(expirySummary);
                                  setExpiredModalTargetWallet(expirySummary.cashbackExpired > 0 ? 'cashback' : 'referral');
                                  setIsExpiredModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-500/30 cursor-pointer hover:bg-rose-500 hover:text-white transition-all font-mono"
                                title={`رصيد منتهي الصلاحية (${formatCurrency(expirySummary.cashbackExpired + expirySummary.referralExpired)}) — اضغط للإدارة`}
                              >
                                ⚠️ منتهي: {formatCurrency(expirySummary.cashbackExpired + expirySummary.referralExpired)}
                              </span>
                            )}
                            {cust.shopName && (
                              <span className="block text-[11px] text-zinc-400 font-normal">{cust.shopName}</span>
                            )}
                          </div>
                          {gamesList.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-zinc-400">
                              <Gamepad2 className="w-2.5 h-2.5 text-orange-400 shrink-0" />
                              <span>{gamesList.join(' • ')}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                          {cust.phone}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-lg text-xs whitespace-nowrap ${
                            (cust.accountBalance || 0) > 0
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                              : (cust.accountBalance || 0) < 0
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                              : 'text-zinc-400'
                          }`}>
                            {(cust.accountBalance || 0) > 0 ? `+${cust.accountBalance} ج (دائن)` : (cust.accountBalance || 0) < 0 ? `${cust.accountBalance} ج (مدين)` : '0.00 ج'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                          <div className="text-orange-500">{formatCurrency(cust.cashbackBalance)}</div>
                          {expirySummary && expirySummary.cashbackExpired > 0 && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExpiredCustomerSummary(expirySummary);
                                setExpiredModalTargetWallet('cashback');
                                setIsExpiredModalOpen(true);
                              }}
                              className="text-[10px] text-rose-500 font-black block mt-0.5 hover:underline cursor-pointer font-mono"
                              title="كاش باك تعدى 6 شهور — اضغط للإدارة"
                            >
                              ⚠️ منتهي: {formatCurrency(expirySummary.cashbackExpired)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {getLoyaltyBadge(metrics.loyaltyTier)}
                            <span className="text-[11px] font-mono text-zinc-400 font-bold">({metrics.totalOrders})</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1 font-mono">
                            <Clock className="w-2.5 h-2.5 text-zinc-500" />
                            <span>آخر شراء: {lastPurchaseDateDisplay ? formatDate(lastPurchaseDateDisplay) : 'لا يوجد'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getPurchasingPowerBadge(metrics.purchasingPower)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getLifetimeSpendingTierBadge(metrics.lifetimeSpendingTier)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-[11px] whitespace-nowrap">
                              {cust.referralCode}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyReferralMessage(cust.referralCode, cust.name);
                              }}
                              className="p-1 rounded-lg hover:bg-orange-500/10 text-zinc-400 hover:text-orange-500 transition-colors"
                              title="نسخ كود ورسالة الإحالة بالكامل"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {expirySummary && expirySummary.referralExpired > 0 && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExpiredCustomerSummary(expirySummary);
                                setExpiredModalTargetWallet('referral');
                                setIsExpiredModalOpen(true);
                              }}
                              className="text-[10px] text-rose-500 font-black block mt-0.5 hover:underline cursor-pointer font-mono"
                              title="رصيد إحالة تعدى 12 شهر — اضغط للإدارة"
                            >
                              ⚠️ إحالة منتهية: {formatCurrency(expirySummary.referralExpired)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                          <div className="text-emerald-500 font-black">{formatCurrency(metrics.totalSpent)}</div>
                          <div className="text-[10px] text-cyan-400 font-mono font-bold">${metrics.totalSpentUSD.toFixed(2)} USD</div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5 mx-auto">
                            <button
                              onClick={() => setSelectedProfileCustomer(cust)}
                              className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title="فتح البروفايل الكامل"
                            >
                              <span>فتح</span>
                              <span>▶</span>
                            </button>

                            {expirySummary && expirySummary.hasExpired && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedExpiredCustomerSummary(expirySummary);
                                  setExpiredModalTargetWallet(expirySummary.cashbackExpired > 0 ? 'cashback' : 'referral');
                                  setIsExpiredModalOpen(true);
                                }}
                                className="p-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                                title="إدارة الرصيد منتهي الصلاحية ⚠️"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isOwner && (
                              <button
                                onClick={() => {
                                  setCustomerToEdit(cust);
                                  setIsFormOpen(true);
                                }}
                                className="p-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                                title="تعديل بيانات العميل بالكامل (Admin Only)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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

        {/* Pagination Controls */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          labelName="عميل"
          themeColor="orange"
        />
      </Card>
      </div>

      {/* Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        items={contextMenuItems}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Add / Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setCustomerToEdit(null);
        }}
        onSave={handleSaveCustomer}
        customerToEdit={customerToEdit}
      />

      {/* Full Customer Profile Modal with 5 Sub-sections */}
      <CustomerProfileModal
        isOpen={!!selectedProfileCustomer}
        onClose={() => setSelectedProfileCustomer(null)}
        customer={selectedProfileCustomer}
        onCustomerUpdated={loadData}
      />

      {/* Archived Modal */}
      <ArchivedCustomersModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        archivedCustomers={archivedCustomers}
        onRestore={id => {
          db.restoreCustomer(id);
          showToast('success', 'تمت الاستعادة', 'تمت استعادة البروفايل بنجاح');
          loadData();
        }}
      />

      {/* Confirm Soft Delete */}
      <ConfirmDialog
        isOpen={!!customerToArchive}
        onClose={() => setCustomerToArchive(null)}
        onConfirm={handleArchiveConfirm}
        title="تأكيد أرشفة البروفايل"
        message={`هل أنت متأكد من نقل البروفايل "${customerToArchive?.name}" إلى الأرشيف؟`}
        confirmText="نقل للأرشيف"
        variant="warning"
      />

      {/* 🖨️ Professional Report Generator Modal */}
      {isReportModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          defaultTemplateType="customers"
        />
      )}

      {/* Expired Balance Management Modal */}
      {isExpiredModalOpen && selectedExpiredCustomerSummary && (
        <ExpiredBalanceManagementModal
          isOpen={isExpiredModalOpen}
          onClose={() => {
            setIsExpiredModalOpen(false);
            setSelectedExpiredCustomerSummary(null);
          }}
          summary={selectedExpiredCustomerSummary}
          targetWallet={expiredModalTargetWallet}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
