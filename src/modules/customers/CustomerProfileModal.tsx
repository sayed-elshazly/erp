import React, { useState, useEffect, useMemo } from 'react';
import {
  Customer,
  CustomerNote,
  CustomerTicket,
  CustomerReferral,
  UnifiedWalletTransaction,
  ProfileType,
  LoyaltyTier,
  PurchasingPower,
  LifetimeSpendingTier
} from '../../types/customer.types';
import { db } from '../../database/db';
import { ProfileStatisticsService } from '../../services/customer/profileStatisticsService';
import { PartnerPerformanceService } from '../../services/customer/partnerPerformanceService';
import { WalletExpirationService } from '../../services/wallet/walletExpirationService';
import { ExpiredBalanceManagementModal } from '../../components/common/ExpiredBalanceManagementModal';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import {
  User,
  Phone,
  Calendar,
  Wallet,
  Share2,
  FileText,
  Ticket,
  Clock,
  Plus,
  Trash2,
  DollarSign,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Video,
  Award,
  Lock,
  Unlock,
  Flame,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Gamepad2,
  Star,
  Printer,
  Receipt,
  MessageSquare,
  Gift,
  Zap,
  Tag,
  Activity,
  Layers,
  Settings,
  Users,
  Search,
  Filter,
  ArrowUpDown,
  UserMinus,
  UserCheck,
  ExternalLink,
  Copy,
  Check,
  GitBranch,
  CalendarDays,
  RotateCcw,
  ShoppingBag,
  Percent,
  CheckCircle,
  Tv,
  Globe,
  Edit2,
  Eye,
  Trophy
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { PrintInvoiceModal } from '../../components/common/PrintInvoiceModal';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';
import { Coupon } from '../../types/topup.types';
import { CustomerFormModal } from './CustomerFormModal';
import { copyToClipboard } from '../../utils/clipboard';
import { TicketDetailsModal } from '../tickets/TicketDetailsModal';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import { useLayoutOrder } from '../../context/LayoutOrderContext';
import { SortableDraggableItem } from '../../components/common/SortableDraggableItem';
import { BalanceWithdrawal } from '../../types/finance.types';
import { NewWithdrawalTicketModal } from '../../components/finance/NewWithdrawalTicketModal';
import { WithdrawalInvoiceModal } from '../../components/finance/WithdrawalInvoiceModal';
import { CustomerCashbackTransferModal } from './CustomerCashbackTransferModal';
import { CustomerReferralTransferModal } from './CustomerReferralTransferModal';
import { CustomerReferralNetwork } from './CustomerReferralNetwork';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onCustomerUpdated: () => void;
}

interface CustomerProfileModalContentProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onCustomerUpdated: () => void;
}

const CustomerProfileModalContent: React.FC<CustomerProfileModalContentProps> = ({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const { getOrderedItems } = useLayoutOrder();

  // Active Tab: dashboard | tickets | coupons | wallet | referrals | notes | withdrawals | competitions
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets' | 'coupons' | 'wallet' | 'referrals' | 'notes' | 'settings' | 'withdrawals' | 'competitions'>('dashboard');
  const [isStatementReportOpen, setIsStatementReportOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isCashbackTransferModalOpen, setIsCashbackTransferModalOpen] = useState(false);
  const [isReferralTransferModalOpen, setIsReferralTransferModalOpen] = useState(false);
  const [referralSubView, setReferralSubView] = useState<'cards' | 'tree' | 'vouchers'>('cards');
  const [selectedWithdrawalForInvoice, setSelectedWithdrawalForInvoice] = useState<BalanceWithdrawal | null>(null);

  // Unified Wallet Filter & Date States (Requirement #5)
  const [walletFilter, setWalletFilter] = useState<'all' | 'account_balance' | 'cashback' | 'referral'>('all');
  const [walletStartDate, setWalletStartDate] = useState('');
  const [walletEndDate, setWalletEndDate] = useState('');
  const [walletDatePreset, setWalletDatePreset] = useState<string>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Sub-data
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [referrals, setReferrals] = useState<CustomerReferral[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<UnifiedWalletTransaction[]>([]);
  const [customerCoupons, setCustomerCoupons] = useState<Coupon[]>([]);

  // Owner Primary Wallet Debt Clearance State
  const [isClearDebtModalOpen, setIsClearDebtModalOpen] = useState(false);
  const [isClearingDebt, setIsClearingDebt] = useState(false);

  // Manager Balance / Cashback / Referral Adjustment Modal (Owner Only)
  const [isBalanceAdjustModalOpen, setIsBalanceAdjustModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<'account' | 'cashback' | 'referral'>('cashback');
  const [adjustMode, setAdjustMode] = useState<'add' | 'subtract' | 'set'>('add');
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Print Invoice Modal
  const [printingTicket, setPrintingTicket] = useState<CustomerTicket | null>(null);
  const [selectedTicketForDetails, setSelectedTicketForDetails] = useState<CustomerTicket | null>(null);

  // Ticket Search & Filters
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');

  // New Note
  const [noteContent, setNoteContent] = useState('');

  // Compensation Coupon Modal
  const [isCompCouponModalOpen, setIsCompCouponModalOpen] = useState(false);
  const [compAmount, setCompAmount] = useState(50);
  const [compReason, setCompReason] = useState('تعويض عن تأخير شحن تذكرة سابقة ورضا العميل');
  const [compGameId, setCompGameId] = useState<string>('all');
  const games = useMemo(() => db.getGameTree().filter(g => g.isActive !== false), []);

  // Partner Rates & Target Edit Modal
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [editFirstMonthRate, setEditFirstMonthRate] = useState(3.0);
  const [editLifetimeRate, setEditLifetimeRate] = useState(1.0);
  const [editMonthlyTarget, setEditMonthlyTarget] = useState(10);

  // Manager Cashback Rate Customization Modal
  const [isCashbackRateModalOpen, setIsCashbackRateModalOpen] = useState(false);
  const [editCashbackRate, setEditCashbackRate] = useState(1.0);

  // Expired Balance Management Modal (Modification #6)
  const [isExpiredBalanceModalOpen, setIsExpiredBalanceModalOpen] = useState(false);
  const [expiredModalWalletType, setExpiredModalWalletType] = useState<'cashback' | 'referral'>('cashback');

  // Referral Profile Modal & Custom Duration States
  const [isReferralProfileModalOpen, setIsReferralProfileModalOpen] = useState(false);
  const [refHighCashbackDays, setRefHighCashbackDays] = useState<number>(30);
  const [refCustomDaysInput, setRefCustomDaysInput] = useState<string>('');
  const [refStartDate, setRefStartDate] = useState<string>('');
  const [refEndDate, setRefEndDate] = useState<string>('');
  const [refProfileStatus, setRefProfileStatus] = useState<'active' | 'expired'>('active');
  const [refHighCashbackRate, setRefHighCashbackRate] = useState<number>(3.0);
  const [refNormalCashbackRate, setRefNormalCashbackRate] = useState<number>(1.0);

  // Full Customer Edit Modal (Admin Only)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Ticket Date Filter States & Presets
  const [ticketDateMode, setTicketDateMode] = useState<'all' | 'single' | 'range'>('all');
  const [ticketSingleDate, setTicketSingleDate] = useState('');
  const [ticketStartDate, setTicketStartDate] = useState('');
  const [ticketEndDate, setTicketEndDate] = useState('');
  const [ticketDatePreset, setTicketDatePreset] = useState<string>('all');

  // Active Customer Navigation Stack (Supports jumping directly into referee profile and returning back)
  const [activeCustomerId, setActiveCustomerId] = useState<string>(customer.id);
  const [customerNavStack, setCustomerNavStack] = useState<Customer[]>([]);

  useEffect(() => {
    setActiveCustomerId(customer.id);
    setCustomerNavStack([]);
  }, [customer.id]);

  // Referral Tab Specific Search & Filter States
  const [refereeSearch, setRefereeSearch] = useState('');
  const [refereeSortBy, setRefereeSortBy] = useState<
    'highestCommission' | 'highestSpending' | 'mostTickets' | 'leastDaysRemaining' | 'newestRegistration'
  >('highestCommission');
  const [refereeStatusFilter, setRefereeStatusFilter] = useState<'all' | 'with_orders' | 'no_orders'>('all');
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);

  // Unlink Modal State
  const [refereeToUnlink, setRefereeToUnlink] = useState<Customer | null>(null);
  const [unlinkReason, setUnlinkReason] = useState('');

  // Owner Controls State
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');

  const isOwner = user?.role === 'admin';

  const loadCustomerDetails = () => {
    db.recalculateCustomerProfile(activeCustomerId);
    setNotes(db.getCustomerNotes(activeCustomerId));
    setTickets(db.getTickets(activeCustomerId));
    setReferrals(db.getReferrals(activeCustomerId));
    setWalletTransactions(db.getUnifiedWalletTransactions(activeCustomerId));
    
    // Load Customer Exclusive & General Coupons
    const cust = db.getCustomerById(activeCustomerId) || customer;
    const allCoupons = db.getCoupons();
    const matchedCoupons = allCoupons.filter(
      c => c.targetCustomerId === cust.id || (cust.phone && c.targetCustomerPhone === cust.phone)
    );
    setCustomerCoupons(matchedCoupons);
  };

  useEffect(() => {
    if (isOpen) {
      loadCustomerDetails();
      const handleSync = () => {
        loadCustomerDetails();
        setRefreshTrigger(prev => prev + 1);
      };
      const unsub1 = eventBus.subscribe(SYSTEM_EVENTS.CUSTOMER_UPDATED, handleSync);
      const unsub2 = eventBus.subscribe(SYSTEM_EVENTS.TICKET_UPDATED, handleSync);
      const unsub3 = eventBus.subscribe(SYSTEM_EVENTS.COUPON_MUTATED, handleSync);
      window.addEventListener('storage', handleSync);
      window.addEventListener('tickets_updated', handleSync);
      window.addEventListener('unified_wallets_updated', handleSync);
      window.addEventListener('coupons_updated', handleSync);
      return () => {
        unsub1();
        unsub2();
        unsub3();
        window.removeEventListener('storage', handleSync);
        window.removeEventListener('tickets_updated', handleSync);
        window.removeEventListener('unified_wallets_updated', handleSync);
        window.removeEventListener('coupons_updated', handleSync);
      };
    }
  }, [activeCustomerId, isOpen]);

  // All Customers, Tickets & Wallets from DB
  const allDbCustomers = useMemo(() => (isOpen ? db.getCustomers(true) : []), [isOpen, activeCustomerId, refreshTrigger]);
  const allDbTickets = useMemo(() => (isOpen ? db.getTickets() : []), [isOpen, activeCustomerId, refreshTrigger]);
  const allDbWallets = useMemo(() => (isOpen ? db.getUnifiedWalletTransactions() : []), [isOpen, activeCustomerId, refreshTrigger]);

  const currentCust = useMemo(() => {
    return db.getCustomerById(activeCustomerId) || customer;
  }, [activeCustomerId, allDbCustomers, customer, refreshTrigger]);

  const customerWithdrawals = useMemo(() => {
    return db.getBalanceWithdrawals(currentCust.id);
  }, [currentCust.id, refreshTrigger, isOpen]);

  // Expiration & Breakage Summary (Modification #6)
  const customerExpirySummary = useMemo(() => {
    return WalletExpirationService.getCustomerExpirySummary(currentCust, walletTransactions);
  }, [currentCust, walletTransactions]);

  // Quick Preset Helper for Ticket Date Filtering
  const handleSetTicketPreset = (preset: string) => {
    setTicketDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setTicketDateMode('all');
      setTicketSingleDate('');
      setTicketStartDate('');
      setTicketEndDate('');
      return;
    }

    if (preset === 'today') {
      setTicketDateMode('single');
      setTicketSingleDate(todayStr);
      setTicketStartDate('');
      setTicketEndDate('');
      return;
    }

    if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setTicketDateMode('single');
      setTicketSingleDate(yStr);
      setTicketStartDate('');
      setTicketEndDate('');
      return;
    }

    if (preset === 'last7') {
      const d = new Date(now);
      d.setDate(now.getDate() - 7);
      setTicketDateMode('range');
      setTicketStartDate(d.toISOString().split('T')[0]);
      setTicketEndDate(todayStr);
      setTicketSingleDate('');
      return;
    }

    if (preset === 'last30') {
      const d = new Date(now);
      d.setDate(now.getDate() - 30);
      setTicketDateMode('range');
      setTicketStartDate(d.toISOString().split('T')[0]);
      setTicketEndDate(todayStr);
      setTicketSingleDate('');
      return;
    }

    if (preset === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setTicketDateMode('range');
      setTicketStartDate(startOfMonth.toISOString().split('T')[0]);
      setTicketEndDate(todayStr);
      setTicketSingleDate('');
      return;
    }

    if (preset === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setTicketDateMode('range');
      setTicketStartDate(startOfLastMonth.toISOString().split('T')[0]);
      setTicketEndDate(endOfLastMonth.toISOString().split('T')[0]);
      setTicketSingleDate('');
      return;
    }

    if (preset === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      setTicketDateMode('range');
      setTicketStartDate(startOfYear.toISOString().split('T')[0]);
      setTicketEndDate(todayStr);
      setTicketSingleDate('');
      return;
    }
  };

  const handleResetTicketDateFilter = () => {
    setTicketDatePreset('all');
    setTicketDateMode('all');
    setTicketSingleDate('');
    setTicketStartDate('');
    setTicketEndDate('');
    setTicketSearch('');
    setTicketStatusFilter('all');
  };

  const handleSetWalletPreset = (preset: string) => {
    setWalletDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setWalletStartDate('');
      setWalletEndDate('');
      return;
    }

    if (preset === 'today') {
      setWalletStartDate(todayStr);
      setWalletEndDate(todayStr);
      return;
    }

    if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setWalletStartDate(yStr);
      setWalletEndDate(yStr);
      return;
    }

    if (preset === 'this_week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = (day + 1) % 7;
      d.setDate(d.getDate() - diff);
      setWalletStartDate(d.toISOString().split('T')[0]);
      setWalletEndDate(todayStr);
      return;
    }

    if (preset === 'last7') {
      const d = new Date(now);
      d.setDate(now.getDate() - 7);
      setWalletStartDate(d.toISOString().split('T')[0]);
      setWalletEndDate(todayStr);
      return;
    }

    if (preset === 'last30') {
      const d = new Date(now);
      d.setDate(now.getDate() - 30);
      setWalletStartDate(d.toISOString().split('T')[0]);
      setWalletEndDate(todayStr);
      return;
    }

    if (preset === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setWalletStartDate(startOfMonth.toISOString().split('T')[0]);
      setWalletEndDate(todayStr);
      return;
    }

    if (preset === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setWalletStartDate(startOfLastMonth.toISOString().split('T')[0]);
      setWalletEndDate(endOfLastMonth.toISOString().split('T')[0]);
      return;
    }

    if (preset === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      setWalletStartDate(startOfYear.toISOString().split('T')[0]);
      setWalletEndDate(todayStr);
      return;
    }
  };

  const handleResetWalletDateFilter = () => {
    setWalletDatePreset('all');
    setWalletStartDate('');
    setWalletEndDate('');
    setWalletFilter('all');
  };

  // Partner Performance Summary
  const partnerSummary = PartnerPerformanceService.getPartnerSummary(currentCust, allDbCustomers);

  const isPartnerType =
    ['partner', 'shop', 'influencer'].includes(currentCust.profileType) || (currentCust.partnerWarningCount || 0) > 0;

  const linkedRefereesList = PartnerPerformanceService.getLinkedReferees(currentCust.referralCode, allDbCustomers);

  // 🌟 Enriched Referees List with Live Dynamic Calculations (Countdown, Progress Bar, Tickets, Spent, Commissions)
  interface EnrichedRefereeItem {
    customer: Customer;
    regDate: Date;
    regDateStr: string;
    diffDays: number;
    daysLeft: number;
    promoDays: number;
    progressPercent: number;
    isFirstMonth: boolean;
    ticketsCount: number;
    totalSpent: number;
    totalCommission: number;
    firstMonthCommission: number;
    lifetimeCommission: number;
    lastOrderDate?: string;
  }

  const enrichedReferees = useMemo<EnrichedRefereeItem[]>(() => {
    if (!currentCust.referralCode) return [];
    const referees = PartnerPerformanceService.getLinkedReferees(currentCust.referralCode, allDbCustomers);
    const now = new Date();

    return referees.map(ref => {
      const regDateStr = ref.referralLinkedAt || ref.createdAt || ref.referredAt || '';
      const regDate = new Date(regDateStr);
      const isValidDate = !isNaN(regDate.getTime());
      const promoDays = ref.highCashbackDays ?? currentCust.highCashbackDays ?? 30;
      const diffDays = isValidDate
        ? Math.max(0, Math.floor((now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      const daysLeft = Math.max(0, promoDays - diffDays);
      const isFirstMonth = diffDays <= promoDays;
      const progressPercent = Math.min(100, Math.max(0, Math.round((Math.min(promoDays, diffDays) / promoDays) * 100)));

      // Completed tickets for this referee
      const refCompletedTickets = allDbTickets.filter(
        t => (t.customerId === ref.id || (ref.phone && t.customerPhone === ref.phone)) && t.status === 'completed'
      );
      const ticketsCount = refCompletedTickets.length;
      const totalSpent = refCompletedTickets.reduce(
        (sum, t) => sum + (t.receivedAmount || t.requiredAmount || t.totalProductsAmount || 0),
        0
      );

      // Latest order date
      let lastOrderDate: string | undefined = undefined;
      let maxTime = 0;
      refCompletedTickets.forEach(t => {
        const d = t.completedAt || t.updatedAt || t.createdAt;
        if (d) {
          const tm = new Date(d).getTime();
          if (tm > maxTime) {
            maxTime = tm;
            lastOrderDate = d;
          }
        }
      });

      // Commissions from wallet transactions for current referrer mentioning this referee
      const matchingCommissions = allDbWallets.filter(
        w =>
          w.customerId === currentCust.id &&
          w.walletType === 'referral' &&
          w.type === 'commission' &&
          (w.operationName.includes(ref.name) ||
            (ref.phone && w.operationName.includes(ref.phone)) ||
            (ref.referralCode && w.operationName.includes(ref.referralCode)))
      );

      let totalCommission = matchingCommissions.reduce((sum, w) => sum + w.amount, 0);
      let firstMonthCommission = matchingCommissions
        .filter(w => w.operationName.includes('الشهر الأول') || w.operationName.includes('أول 30'))
        .reduce((sum, w) => sum + w.amount, 0);
      let lifetimeCommission = matchingCommissions
        .filter(w => w.operationName.includes('مدى الحياة') || w.operationName.includes('طوال عمر'))
        .reduce((sum, w) => sum + w.amount, 0);

      // If transactions were logged generally or empty, calculate directly from tickets
      if (totalCommission === 0 && ticketsCount > 0) {
        refCompletedTickets.forEach(t => {
          const tDate = new Date(t.createdAt || t.completedAt || '');
          const tDiffDays = isValidDate
            ? Math.max(0, Math.floor((tDate.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          const isTktFirstMonth = tDiffDays <= 30;
          const rate = isTktFirstMonth ? partnerSummary.firstMonthRate : partnerSummary.lifetimeRate;
          const amt = t.receivedAmount || t.requiredAmount || 0;
          const comm = Math.round(amt * (rate / 100) * 100) / 100;
          totalCommission += comm;
          if (isTktFirstMonth) {
            firstMonthCommission += comm;
          } else {
            lifetimeCommission += comm;
          }
        });
      }

      return {
        customer: ref,
        regDate,
        regDateStr,
        diffDays,
        daysLeft,
        promoDays,
        progressPercent,
        isFirstMonth,
        ticketsCount,
        totalSpent,
        totalCommission: Math.round(totalCommission * 100) / 100,
        firstMonthCommission: Math.round(firstMonthCommission * 100) / 100,
        lifetimeCommission: Math.round(lifetimeCommission * 100) / 100,
        lastOrderDate
      };
    });
  }, [currentCust, allDbCustomers, allDbTickets, allDbWallets, partnerSummary]);

  interface ReferralKPIs {
    totalNewCount: number;
    totalLifetimeCount: number;
    totalRefereesCount: number;
    totalFirstMonthCommission: number;
    totalLifetimeCommission: number;
    totalCommissionEarned: number;
    currentReferralBalance: number;
    totalSalesVolume: number;
    avgCommissionPerReferee: number;
    topReferee?: EnrichedRefereeItem;
  }

  // Referral Tab Top KPI Summary Data
  const referralTabKPIs = useMemo<ReferralKPIs>(() => {
    const newReferees = enrichedReferees.filter(r => r.isFirstMonth);
    const lifetimeReferees = enrichedReferees.filter(r => !r.isFirstMonth);

    const totalNewCount = newReferees.length;
    const totalLifetimeCount = lifetimeReferees.length;
    const totalRefereesCount = enrichedReferees.length;

    const totalFirstMonthCommission = enrichedReferees.reduce((sum, r) => sum + r.firstMonthCommission, 0);
    const totalLifetimeCommission = enrichedReferees.reduce((sum, r) => sum + r.lifetimeCommission, 0);
    const totalCommissionEarned = enrichedReferees.reduce((sum, r) => sum + r.totalCommission, 0);
    const currentReferralBalance = currentCust.referralWalletBalance || 0;

    const totalSalesVolume = enrichedReferees.reduce((sum, r) => sum + r.totalSpent, 0);
    const avgCommissionPerReferee =
      totalRefereesCount > 0 ? Math.round((totalCommissionEarned / totalRefereesCount) * 100) / 100 : 0;

    // Top referee
    let topReferee: EnrichedRefereeItem | undefined = undefined;
    enrichedReferees.forEach(r => {
      if (!topReferee || r.totalCommission > topReferee.totalCommission || (r.totalCommission === topReferee.totalCommission && r.totalSpent > topReferee.totalSpent)) {
        topReferee = r;
      }
    });

    return {
      totalNewCount,
      totalLifetimeCount,
      totalRefereesCount,
      totalFirstMonthCommission,
      totalLifetimeCommission,
      totalCommissionEarned,
      currentReferralBalance,
      totalSalesVolume,
      avgCommissionPerReferee,
      topReferee
    };
  }, [enrichedReferees, currentCust]);

  // Filtered New Referees (< 30 Days)
  const filteredNewReferees = useMemo(() => {
    return enrichedReferees
      .filter(r => r.isFirstMonth)
      .filter(r => {
        const q = refereeSearch.toLowerCase().trim();
        if (q) {
          const matchName = Boolean(r.customer.name && r.customer.name.toLowerCase().includes(q));
          const matchPhone = Boolean(r.customer.phone && r.customer.phone.includes(q));
          const matchCode = Boolean(r.customer.code && r.customer.code.toLowerCase().includes(q));
          if (!matchName && !matchPhone && !matchCode) return false;
        }
        if (refereeStatusFilter === 'with_orders' && r.ticketsCount === 0) return false;
        if (refereeStatusFilter === 'no_orders' && r.ticketsCount > 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (refereeSortBy === 'highestCommission') return b.totalCommission - a.totalCommission;
        if (refereeSortBy === 'highestSpending') return b.totalSpent - a.totalSpent;
        if (refereeSortBy === 'mostTickets') return b.ticketsCount - a.ticketsCount;
        if (refereeSortBy === 'leastDaysRemaining') return a.daysLeft - b.daysLeft;
        if (refereeSortBy === 'newestRegistration') return b.regDate.getTime() - a.regDate.getTime();
        return b.totalCommission - a.totalCommission;
      });
  }, [enrichedReferees, refereeSearch, refereeStatusFilter, refereeSortBy]);

  // Filtered Lifetime Referees (> 30 Days)
  const filteredLifetimeReferees = useMemo(() => {
    return enrichedReferees
      .filter(r => !r.isFirstMonth)
      .filter(r => {
        const q = refereeSearch.toLowerCase().trim();
        if (q) {
          const matchName = Boolean(r.customer.name && r.customer.name.toLowerCase().includes(q));
          const matchPhone = Boolean(r.customer.phone && r.customer.phone.includes(q));
          const matchCode = Boolean(r.customer.code && r.customer.code.toLowerCase().includes(q));
          if (!matchName && !matchPhone && !matchCode) return false;
        }
        if (refereeStatusFilter === 'with_orders' && r.ticketsCount === 0) return false;
        if (refereeStatusFilter === 'no_orders' && r.ticketsCount > 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (refereeSortBy === 'highestCommission') return b.totalCommission - a.totalCommission;
        if (refereeSortBy === 'highestSpending') return b.totalSpent - a.totalSpent;
        if (refereeSortBy === 'mostTickets') return b.ticketsCount - a.ticketsCount;
        if (refereeSortBy === 'newestRegistration') return b.regDate.getTime() - a.regDate.getTime();
        return b.totalCommission - a.totalCommission;
      });
  }, [enrichedReferees, refereeSearch, refereeStatusFilter, refereeSortBy]);

  // Navigation handlers
  const handleOpenRefereeProfile = (refCust: Customer) => {
    setCustomerNavStack(prev => [...prev, currentCust]);
    setActiveCustomerId(refCust.id);
    setActiveTab('dashboard');
  };

  const handleBackToReferrer = () => {
    if (customerNavStack.length === 0) return;
    const previous = customerNavStack[customerNavStack.length - 1];
    setCustomerNavStack(prev => prev.slice(0, prev.length - 1));
    setActiveCustomerId(previous.id);
    setActiveTab('referrals');
  };

  const handleCopyText = async (text: string, id: string, label?: string) => {
    const success = await copyToClipboard(text, label || text, showToast);
    if (success) {
      setCopiedRefId(id);
      setTimeout(() => setCopiedRefId(null), 2000);
    }
  };

  // Unlinking Handler
  const handleConfirmUnlink = () => {
    if (!refereeToUnlink) return;
    const ref = refereeToUnlink;
    const oldCode = ref.referredByCode || currentCust.referralCode;

    ref.referredByCode = undefined;
    ref.referrerId = undefined;
    ref.referrerName = undefined;
    ref.referrerType = undefined;
    db.saveCustomer(ref);

    // Update CustomerReferral database record
    db.unlinkCustomerReferral(ref.id);

    // Add note to referee profile
    db.addCustomerNote({
      customerId: ref.id,
      authorName: user?.fullName || 'المدير المالك',
      authorRole: 'إدارة النظام',
      content: `⚠️ تم فك الارتباط من المُحيل (${currentCust.name})، السبب: ${unlinkReason || 'إلغاء إداري'}`,
      type: 'general'
    });

    // Audit Logging
    db.logAction(
      { id: user?.id || 'sys', name: user?.fullName || 'المدير المالك', role: user?.role || 'admin', department: 'الزبائن والإحالات' },
      'edit',
      'فك ارتباط إحالة',
      ref.id,
      ref.name,
      `تم إلغاء وفك ارتباط العميل [${ref.name}] من كود المُحيل [${currentCust.name} - ${oldCode}]. السبب: ${unlinkReason || 'إلغاء إداري'}`
    );

    showToast('info', 'تم فك الارتباط', `تم إلغاء ربط العميل ${ref.name} بنجاح مع الاحتفاظ بكافة العمولات التاريخية`);
    setRefereeToUnlink(null);
    setUnlinkReason('');
    loadCustomerDetails();
    onCustomerUpdated();
  };

  // Analytical Metrics for Dashboard Tab calculated via centralized ProfileStatisticsService
  const calculatedMetrics = ProfileStatisticsService.calculateMetrics(currentCust, tickets);

  const completedTickets = tickets.filter(t => t.status === 'completed');
  const totalSpentCalculated = calculatedMetrics.totalSpent;
  const totalSpentUSDCalculated = calculatedMetrics.totalSpentUSD;
  const avgOrderValue = calculatedMetrics.totalOrders > 0 ? Math.round(totalSpentCalculated / calculatedMetrics.totalOrders) : 0;
  const maxOrderValue = calculatedMetrics.maxSingleOrderAmount;

  // Game Breakdown
  const gameMap: { [key: string]: { count: number; totalSpent: number } } = {};
  completedTickets.forEach(t => {
    const g = t.gameName || 'أخرى';
    if (!gameMap[g]) gameMap[g] = { count: 0, totalSpent: 0 };
    gameMap[g].count += 1;
    gameMap[g].totalSpent += (t.receivedAmount || t.requiredAmount || 0);
  });
  const gameBreakdown = Object.entries(gameMap).map(([game, data]) => ({
    game,
    count: data.count,
    totalSpent: data.totalSpent,
    percentage: totalSpentCalculated > 0 ? Math.round((data.totalSpent / totalSpentCalculated) * 100) : 0
  })).sort((a, b) => b.totalSpent - a.totalSpent);

  // Average Execution Speed & CSAT
  const avgSpeedMinutes = completedTickets.length > 0
    ? Math.round((completedTickets.reduce((acc, t) => acc + (t.executionDurationMinutes || 2), 0) / completedTickets.length) * 10) / 10
    : 2.1;

  const ratedTickets = completedTickets.filter(t => t.customerRating);
  const avgCustomerRating = ratedTickets.length > 0
    ? Math.round((ratedTickets.reduce((acc, t) => acc + (t.customerRating || 5), 0) / ratedTickets.length) * 10) / 10
    : 5.0;

  // Add Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    db.addCustomerNote({
      customerId: currentCust.id,
      authorName: user?.fullName || 'الموظف',
      authorRole: user?.jobTitle || 'موظف قسم الشحن',
      content: noteContent.trim(),
      type: 'general'
    });

    setNoteContent('');
    showToast('success', 'تمت الإضافة', 'تمت إضافة الملاحظة للبروفايل');
    loadCustomerDetails();
    onCustomerUpdated();
  };

  // Delete Note (Owner only)
  const handleDeleteNote = (noteId: string) => {
    if (!isOwner) {
      showToast('error', 'غير مصرح', 'صلاحية حذف الملاحظات للمدير المالك فقط');
      return;
    }
    db.deleteCustomerNote(noteId);
    showToast('info', 'تم الحذف', 'تم حذف الملاحظة بنجاح');
    loadCustomerDetails();
    onCustomerUpdated();
  };

  // Create Quick Compensation Coupon
  const handleCreateCompCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = `COMP-${(currentCust.code || 'VIP').replace(/[^A-Z0-9]/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const selectedGame = games.find(g => g.id === compGameId);

    db.saveCoupon({
      id: 'cpn_comp_' + Date.now(),
      code,
      title: compGameId !== 'all' && selectedGame
        ? `كوبون تعويض خاص للعميل ${currentCust.name} (لعبة ${selectedGame.name})`
        : `كوبون تعويض خاص للعميل ${currentCust.name}`,
      type: 'customer_specific',
      discountType: 'fixed_amount',
      discountValue: compAmount,
      targetCustomerId: currentCust.id,
      targetCustomerName: currentCust.name,
      targetCustomerPhone: currentCust.phone,
      targetAudience: 'customers',
      applicableGameId: compGameId !== 'all' ? compGameId : undefined,
      applicableGameName: compGameId !== 'all' && selectedGame ? selectedGame.name : undefined,
      compensationReason: compReason.trim(),
      maxUsageTotal: 1,
      currentUsageCount: 0,
      maxUsagePerCustomer: 1,
      usedByPlayerGameIds: [],
      isActive: true,
      isAutoDeactivated: false,
      createdAt: new Date().toISOString()
    });

    const gameNotePart = compGameId !== 'all' && selectedGame ? ` مخصص حصرياً للعبة [${selectedGame.name}]` : ' متاح لكافة الألعاب';
    db.addCustomerNote({
      customerId: currentCust.id,
      authorName: user?.fullName || 'المدير المالك',
      authorRole: 'إدارة النظام',
      content: `🎁 تم إصدار كوبون تعويض حصري بقيمة (${compAmount} ج)${gameNotePart}. الكود: [${code}]. السبب: ${compReason.trim()}`,
      type: 'financial'
    });

    showToast('success', 'تم إنشاء كوبون التعويض', `كود الكوبون: ${code} بقيمة ${compAmount} ج${gameNotePart}`);
    setIsCompCouponModalOpen(false);
    setCompGameId('all');
    loadCustomerDetails();
    onCustomerUpdated();
  };

  // Copy Coupon with WhatsApp Message Template
  const handleCopyCouponWhatsApp = async (cpn: Coupon) => {
    const settings = db.getCustomerModuleSettings();
    const gameRestrictionText = cpn.applicableGameName
      ? `🎮 مخصص حصرياً لشحن لعبة: ${cpn.applicableGameName} فقط!`
      : `🌟 صالح للاستخدام في شحن جميع ألعابك مباشرة لدينا!`;

    const tpl =
      settings.couponWhatsAppMessageTemplate ||
      `🎮 مرحباً بك يا {{اسم_العميل}}! ✨
يسعدنا تقديم كوبون تعويض حصري لك:
🎁 كود الكوبون: {{كود_الكوبون}}
💰 قيمة الخصم: {{قيمة_الخصم}} ج
{{نطاق_الاستخدام}}
━━━━━━━━━━━━━━━
NZM JKR Top Up 🌟`;

    const formattedMsg = tpl
      .replace(/{{اسم_العميل}}/g, currentCust.name)
      .replace(/{{كود_الكوبون}}/g, cpn.code)
      .replace(/{{قيمة_الخصم}}/g, String(cpn.discountValue))
      .replace(/{{سبب_التعويض}}/g, cpn.compensationReason || 'هدية خاصة')
      .replace(/{{نطاق_الاستخدام}}/g, gameRestrictionText)
      .replace(/🌟 صالح للاستخدام في شحن جميع ألعابك مباشرة لدينا!/g, gameRestrictionText);

    await copyToClipboard(formattedMsg, 'رسالة الكوبون للعميل', showToast);
  };

  // Copy Referral Code with WhatsApp / Full Message Template
  const handleCopyReferralWhatsApp = async (referralCode: string) => {
    const settings = db.getCustomerModuleSettings();
    const tpl =
      settings.referralCodeMessageTemplate ||
      `مرحبًا،

استخدم كود الإحالة التالي للحصول على المزايا والخصومات الحصرية:

{code}

شكرًا لاستخدام خدماتنا.`;

    const formattedMsg = tpl
      .replace(/{code}/g, referralCode)
      .replace(/{{كود_الإحالة}}/g, referralCode)
      .replace(/{name}/g, currentCust.name)
      .replace(/{{اسم_العميل}}/g, currentCust.name);

    await copyToClipboard(formattedMsg, 'رسالة كود الإحالة للمشاركة', showToast);
  };

  // Execute Balance / Cashback / Referral Adjustment (Admin Only)
  const handleExecuteBalanceAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      showToast('error', 'غير مصرح', 'تعديل الأرصدة مخصص للمدير المالك فقط');
      return;
    }
    if (adjustAmount < 0) {
      showToast('error', 'مبلغ غير صالح', 'يرجى إدخال مبلغ صحيح');
      return;
    }

    const updated: Customer = { ...currentCust };
    let fieldName = '';
    let oldVal = 0;
    let newVal = 0;

    let adjTicketNum: string | undefined = undefined;
    if (adjustTarget === 'account') {
      fieldName = 'الرصيد الدائن';
      oldVal = updated.accountBalance || 0;
      if (adjustMode === 'add') newVal = oldVal + adjustAmount;
      else if (adjustMode === 'subtract') newVal = Math.max(0, oldVal - adjustAmount);
      else newVal = adjustAmount;
      updated.accountBalance = newVal;
      updated.balance = newVal;
    } else if (adjustTarget === 'cashback') {
      fieldName = 'رصيد الكاش باك';
      oldVal = updated.cashbackBalance || 0;
      if (adjustMode === 'add') newVal = oldVal + adjustAmount;
      else if (adjustMode === 'subtract') newVal = Math.max(0, oldVal - adjustAmount);
      else newVal = adjustAmount;
      updated.cashbackBalance = newVal;

      // Formal System Isolation: Sync with Store Wallet w_cashback & issue CBA ticket
      adjTicketNum = `CBA-${Date.now().toString().slice(-6)}`;
      const deltaCb = newVal - oldVal;
      if (deltaCb > 0) {
        db.creditCashbackToSystemWallet(deltaCb, updated.name, adjTicketNum);
      } else if (deltaCb < 0) {
        db.debitCashbackFromSystemWallet(Math.abs(deltaCb), updated.name, adjTicketNum, false);
      }

      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المدير المالك', role: user?.role || 'admin', department: 'العملاء والمالية' },
        'edit',
        'كاش باك عملاء',
        adjTicketNum,
        `تسوية إدارية رسمية لكاش باك العميل [${updated.name}] (تذكرة #${adjTicketNum})`,
        `تعديل رصيد الكاش باك من [${oldVal} ج] إلى [${newVal} ج]. السبب: ${adjustReason || 'تسوية إدارية'}`
      );
    } else {
      fieldName = 'محفظة الإحالة والعمولات';
      oldVal = updated.referralWalletBalance || 0;
      if (adjustMode === 'add') newVal = oldVal + adjustAmount;
      else if (adjustMode === 'subtract') newVal = Math.max(0, oldVal - adjustAmount);
      else newVal = adjustAmount;
      updated.referralWalletBalance = newVal;
    }

    updated.updatedAt = new Date().toISOString();
    db.saveCustomer(updated);

    // Record Unified Wallet Transaction
    db.addUnifiedWalletTransaction({
      customerId: currentCust.id,
      walletType: adjustTarget === 'account' ? 'account_balance' : adjustTarget === 'cashback' ? 'cashback' : 'referral',
      type: 'adjustment',
      operationName: `تعديل إداري (${fieldName})${adjTicketNum ? ` (تذكرة #${adjTicketNum})` : ''}: ${adjustReason || 'تسوية رصيد بواسطة المدير'}`,
      amount: Math.abs(newVal - oldVal),
      direction: newVal >= oldVal ? 'in' : 'out',
      balanceAfter: newVal,
      notes: `بواسطة ${user?.fullName || 'المدير المالك'}`,
      orderNumber: adjTicketNum
    });

    db.addCustomerNote({
      customerId: currentCust.id,
      authorName: user?.fullName || 'المدير المالك',
      authorRole: 'إدارة النظام',
      content: `💰 تم تعديل ${fieldName}${adjTicketNum ? ` (تذكرة #${adjTicketNum})` : ''} من [${oldVal} ج] إلى [${newVal} ج]. السبب: ${adjustReason || 'تسوية يدوية'}`,
      type: 'financial'
    });

    showToast('success', 'تم تعديل الرصيد', `تم تحديث ${fieldName} بنجاح إلى ${newVal} ج`);
    setIsBalanceAdjustModalOpen(false);
    setAdjustAmount(0);
    setAdjustReason('');
    loadCustomerDetails();
    onCustomerUpdated();
  };

  // Owner Primary Wallet Debt Clearance (شطب العجز وتصفية المحفظة بأمر المالك)
  const handleConfirmClearDebt = () => {
    if (!isOwner || (currentCust.accountBalance || 0) >= 0) return;
    setIsClearingDebt(true);
    try {
      const res = db.clearCustomerPrimaryDebt(currentCust.id, user?.fullName || 'المالك');
      if (res.success) {
        showToast('success', 'تم شطب العجز', res.message);
        setIsClearDebtModalOpen(false);
        loadCustomerDetails();
        onCustomerUpdated();
        setRefreshTrigger(prev => prev + 1);
      } else {
        showToast('error', 'فشلت التصفية', res.message);
      }
    } catch (err: any) {
      showToast('error', 'خطأ أثناء التصفية', err.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsClearingDebt(false);
    }
  };

  // Freeze / Unfreeze Account (Owner only)
  const handleToggleFreeze = () => {
    if (!isOwner) {
      showToast('error', 'غير مصرح', 'صلاحية التجميد للمدير المالك فقط');
      return;
    }

    if (!currentCust.isFrozen && !freezeReason.trim()) {
      showToast('error', 'سبب التجميد مطلوب', 'يرجى كتابة سبب تجميد الحساب');
      return;
    }

    const updated: Customer = {
      ...currentCust,
      isFrozen: !currentCust.isFrozen,
      freezeReason: !currentCust.isFrozen ? freezeReason.trim() : undefined,
      status: !currentCust.isFrozen ? 'suspended' : 'active'
    };

    db.saveCustomer(updated);
    showToast('warning', updated.isFrozen ? 'تم تجميد الحساب' : 'تم تفعيل الحساب', `الحساب أصبح ${updated.isFrozen ? 'مجمداً' : 'نشطاً'}`);
    setShowFreezeModal(false);
    setFreezeReason('');
    loadCustomerDetails();
    onCustomerUpdated();
  };

  // Save Partner Settings (Owner only)
  const handleSavePartnerSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    const updated: Customer = {
      ...currentCust,
      firstMonthCommissionRate: editFirstMonthRate,
      lifetimeCommissionRate: editLifetimeRate,
      monthlyTargetCount: editMonthlyTarget,
      updatedAt: new Date().toISOString()
    };

    db.saveCustomer(updated);
    db.logAction(
      {
        id: user?.id || 'sys',
        name: user?.fullName || 'المدير المالك',
        role: user?.role || 'admin',
        department: 'إدارة الشركاء'
      },
      'edit',
      'إعدادات الشراكة والعمولات',
      currentCust.id,
      currentCust.name,
      `تحديث العمولات: أول شهر (${editFirstMonthRate}%)، مدى الحياة (${editLifetimeRate}%)، هدف شهري (${editMonthlyTarget} عميل)`
    );

    showToast('success', 'تم حفظ الإعدادات', 'تم تحديث نسب العمولات وشروط الشراكة بنجاح');
    setIsRatesModalOpen(false);
    loadCustomerDetails();
    onCustomerUpdated();
  };

  // Manual Partner Performance Evaluation Trigger (Owner only)
  const handleEvaluatePartnerPerformance = () => {
    if (!isOwner) return;

    const confirmEval = window.confirm(
      `هل تريد تشغيل فحص تقييم الأداء الشهري للبروفايل (${currentCust.name})؟\n\n- إذا لم يحقق الهدف لأول مرة: سيتم توجيه تحذير أول.\n- إذا فشل للمرة الثانية: سيتم إلغاء الشراكة تلقائياً وتحرير جميع العملاء المرتبطين.`
    );
    if (!confirmEval) return;

    const res = db.evaluatePartnerPerformance(currentCust.id, {
      id: user?.id || 'sys',
      name: user?.fullName || 'المدير المالك',
      role: user?.role || 'admin'
    });

    if (res.actionTaken === 'passed') {
      showToast('success', 'نتيجة التقييم: ناجح', res.message);
    } else if (res.actionTaken === 'warned') {
      showToast('warning', 'نتيجة التقييم: تحذير أول', res.message);
    } else if (res.actionTaken === 'demoted') {
      showToast('error', 'نتيجة التقييم: إلغاء الشراكة', res.message);
    } else {
      showToast('info', 'معلومات التقييم', res.message);
    }

    loadCustomerDetails();
    onCustomerUpdated();
  };

  // Update Customer Cashback Rate (Manager Only)
  const handleUpdateCashbackRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    const oldRate = currentCust.cashbackRate ?? 1.0;
    const newRate = editCashbackRate;
    const updated: Customer = {
      ...currentCust,
      cashbackRate: newRate,
      updatedAt: new Date().toISOString()
    };
    db.saveCustomer(updated);

    db.logAction(
      { id: user?.id || 'sys', name: user?.fullName || 'المدير المالك', role: user?.role || 'admin', department: 'إدارة النظام' },
      'edit',
      'نسبة الكاش باك (Cashback Rate)',
      currentCust.id,
      currentCust.name,
      `تعديل نسبة الكاش باك الخاصة بالعميل من [${oldRate}%] إلى [${newRate}%]`,
      { cashbackRate: oldRate },
      { cashbackRate: newRate }
    );

    db.addCustomerNote({
      customerId: currentCust.id,
      authorName: user?.fullName || 'المدير المالك',
      authorRole: 'إدارة النظام',
      content: `🎁 تم تعديل نسبة الكاش باك الخاصة بالعميل من (${oldRate}%) إلى (${newRate}%) لتطبق على العمليات المستقبلية`,
      type: 'financial'
    });

    setIsCashbackRateModalOpen(false);
    showToast('success', 'تم تعديل النسبة', `تم ضبط نسبة الكاش باك إلى ${newRate}% بنجاح`);
    loadCustomerDetails();
    onCustomerUpdated();
  };

  // Customer Referral Profile Status & Countdown Calculations
  const referralProfileSummary = useMemo(() => {
    const hasProfile = Boolean(currentCust.hasReferralProfile || currentCust.referralCode);
    const startDateStr = currentCust.highCashbackStartDate || currentCust.referralProfileCreatedAt?.split('T')[0] || currentCust.createdAt?.split('T')[0] || '';
    const totalDays = currentCust.highCashbackDays || 30;

    let endDateStr = currentCust.highCashbackEndDate;
    if (!endDateStr && startDateStr) {
      const sDate = new Date(startDateStr);
      if (!isNaN(sDate.getTime())) {
        const eDate = new Date(sDate.getTime() + totalDays * 86400000);
        endDateStr = eDate.toISOString().split('T')[0];
      }
    }

    const now = new Date();
    let daysRemaining = 0;
    let isExpired = false;

    if (endDateStr) {
      const eDate = new Date(endDateStr + 'T23:59:59');
      if (!isNaN(eDate.getTime())) {
        const diffMs = eDate.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        isExpired = diffMs <= 0;
      }
    } else if (startDateStr) {
      const sDate = new Date(startDateStr);
      if (!isNaN(sDate.getTime())) {
        const diffDays = Math.floor((now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, totalDays - diffDays);
        isExpired = diffDays >= totalDays;
      }
    }

    const isPartner = ['partner', 'shop', 'influencer'].includes(currentCust.profileType);
    if (!isPartner) {
      return {
        hasProfile: true,
        startDate: currentCust.createdAt || '',
        endDate: '',
        totalDays: 0,
        daysRemaining: 0,
        isExpired: false,
        status: 'active' as const,
        effectiveRate: 1.0,
        highRate: 1.0,
        normalRate: 1.0
      };
    }

    const status: 'active' | 'expired' = (currentCust.referralProfileStatus === 'expired' || isExpired) ? 'expired' : 'active';
    const effectiveRate = status === 'active'
      ? (currentCust.highCashbackRate ?? currentCust.firstMonthCommissionRate ?? 3.0)
      : (currentCust.normalCashbackRate ?? currentCust.lifetimeCommissionRate ?? 1.0);

    return {
      hasProfile,
      startDate: startDateStr,
      endDate: endDateStr,
      totalDays,
      daysRemaining,
      isExpired: status === 'expired',
      status,
      effectiveRate,
      highRate: currentCust.highCashbackRate ?? currentCust.firstMonthCommissionRate ?? 3.0,
      normalRate: currentCust.normalCashbackRate ?? currentCust.lifetimeCommissionRate ?? 1.0
    };
  }, [currentCust]);

  const handleOpenReferralProfile = () => {
    const days = currentCust.highCashbackDays || 30;
    const sDate = currentCust.highCashbackStartDate || new Date().toISOString().split('T')[0];
    let eDate = currentCust.highCashbackEndDate;
    if (!eDate) {
      const startD = new Date(sDate);
      const endD = new Date(startD.getTime() + days * 86400000);
      eDate = endD.toISOString().split('T')[0];
    }

    setRefHighCashbackDays(days);
    setRefCustomDaysInput([15, 30, 45, 60, 90].includes(days) ? '' : String(days));
    setRefStartDate(sDate);
    setRefEndDate(eDate);
    setRefProfileStatus(currentCust.referralProfileStatus === 'expired' || referralProfileSummary.isExpired ? 'expired' : 'active');
    setRefHighCashbackRate(currentCust.highCashbackRate ?? currentCust.firstMonthCommissionRate ?? 3.0);
    setRefNormalCashbackRate(currentCust.normalCashbackRate ?? currentCust.lifetimeCommissionRate ?? 1.0);
    setIsReferralProfileModalOpen(true);
  };

  const handleSelectDaysPreset = (days: number) => {
    setRefHighCashbackDays(days);
    setRefCustomDaysInput('');
    const baseDate = refStartDate ? new Date(refStartDate) : new Date();
    if (!isNaN(baseDate.getTime())) {
      const endD = new Date(baseDate.getTime() + days * 86400000);
      setRefEndDate(endD.toISOString().split('T')[0]);
    }
  };

  const handleCustomDaysChange = (val: string) => {
    setRefCustomDaysInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setRefHighCashbackDays(parsed);
      const baseDate = refStartDate ? new Date(refStartDate) : new Date();
      if (!isNaN(baseDate.getTime())) {
        const endD = new Date(baseDate.getTime() + parsed * 86400000);
        setRefEndDate(endD.toISOString().split('T')[0]);
      }
    }
  };

  const handleStartDateChange = (dateVal: string) => {
    setRefStartDate(dateVal);
    const days = Number(refCustomDaysInput) > 0 ? Number(refCustomDaysInput) : refHighCashbackDays;
    const baseDate = new Date(dateVal);
    if (!isNaN(baseDate.getTime()) && days > 0) {
      const endD = new Date(baseDate.getTime() + days * 86400000);
      setRefEndDate(endD.toISOString().split('T')[0]);
    }
  };

  const handleSaveReferralProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const days = Number(refCustomDaysInput) > 0 ? Number(refCustomDaysInput) : (refHighCashbackDays || 30);
      const res = db.createOrUpdateCustomerReferralProfile(currentCust.id, {
        highCashbackDays: days,
        startDate: refStartDate,
        endDate: refEndDate,
        status: refProfileStatus,
        highCashbackRate: refHighCashbackRate,
        normalCashbackRate: refNormalCashbackRate
      });
      showToast('success', 'تم حفظ بروفايل الإحالة', res.message);
      setIsReferralProfileModalOpen(false);
      loadCustomerDetails();
      onCustomerUpdated();
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast('error', 'فشل الحفظ', err.message || 'حدث خطأ أثناء حفظ بروفايل الإحالة');
    }
  };

  // Filtered Tickets (Status + Search + Date Filters)
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // 1. Status Filter
      if (ticketStatusFilter !== 'all' && t.status !== ticketStatusFilter) return false;

      // 2. Text Search
      if (ticketSearch && ticketSearch.trim()) {
        const q = ticketSearch.toLowerCase().trim();
        const matchNum = Boolean(t.ticketNumber && t.ticketNumber.toLowerCase().includes(q));
        const matchGame = Boolean(t.gameName && t.gameName.toLowerCase().includes(q));
        const matchProd = Boolean(t.gameProductName && t.gameProductName.toLowerCase().includes(q));
        const matchPlayer = Boolean(t.playerGameId && t.playerGameId.includes(q));
        const matchNotes = Boolean(t.notes && t.notes.toLowerCase().includes(q));
        const matchItems = Boolean(
          t.items &&
          t.items.some(
            it =>
              (it.gameName && it.gameName.toLowerCase().includes(q)) ||
              (it.productName && it.productName.toLowerCase().includes(q)) ||
              (it.playerGameId && it.playerGameId.includes(q))
          )
        );
        if (!matchNum && !matchGame && !matchProd && !matchPlayer && !matchNotes && !matchItems) {
          return false;
        }
      }

      // 3. Date Filter (Single Day vs Range)
      const ticketDate = (t.createdAt || '').split('T')[0];
      if (ticketStartDate && ticketDate < ticketStartDate) return false;
      if (ticketEndDate && ticketDate > ticketEndDate) return false;

      return true;
    });
  }, [tickets, ticketStatusFilter, ticketSearch, ticketStartDate, ticketEndDate]);

  // Real-Time Filtered Statistics for Tickets Tab
  const filteredTicketStats = useMemo(() => {
    const completed = filteredTickets.filter(t => t.status === 'completed');
    const count = filteredTickets.length;
    const completedCount = completed.length;

    let totalSpent = 0;
    let totalSpentUSD = 0;
    let totalProfit = 0;
    let cashbackEarned = 0;
    let referralEarned = 0;

    completed.forEach(t => {
      const amtEGP = t.receivedAmount || t.requiredAmount || 0;
      totalSpent += amtEGP;

      const rate = t.pricingSnapshot?.usdExchangeRateAtPurchase || 50.0;
      const amtUSD =
        t.pricingSnapshot?.grossSellingPriceUSD && t.pricingSnapshot.grossSellingPriceUSD > 0
          ? t.pricingSnapshot.grossSellingPriceUSD
          : amtEGP / rate;
      totalSpentUSD += amtUSD;

      if (t.pricingSnapshot) {
        totalProfit += t.pricingSnapshot.netProfitEGP || 0;
        cashbackEarned += t.pricingSnapshot.cashbackAmountEGP || 0;
        referralEarned += t.pricingSnapshot.referralAmountEGP || 0;
      } else {
        totalProfit += amtEGP * 0.15;
        cashbackEarned += t.cashbackEarned || amtEGP * 0.01;
      }
    });

    const avgOrder = completedCount > 0 ? Math.round(totalSpent / completedCount) : 0;

    return {
      count,
      completedCount,
      totalSpent,
      totalSpentUSD,
      totalProfit: Math.round(totalProfit),
      cashbackEarned: Math.round(cashbackEarned * 10) / 10,
      referralEarned: Math.round(referralEarned * 10) / 10,
      avgOrder
    };
  }, [filteredTickets]);

  // Filtered Wallet Transactions (Requirement #5)
  const filteredWalletTx = walletTransactions.filter(w => {
    if (walletFilter !== 'all' && w.walletType !== walletFilter) return false;
    if (walletStartDate || walletEndDate) {
      const txDate = (w.createdAt || '').split('T')[0];
      if (walletStartDate && txDate < walletStartDate) return false;
      if (walletEndDate && txDate > walletEndDate) return false;
    }
    return true;
  });

  const getProfileTypeBadge = (type: ProfileType) => {
    switch (type) {
      case 'partner':
        return <Badge variant="warning" size="sm">🤝 شريك (Partner)</Badge>;
      case 'shop':
        return <Badge variant="info" size="sm">🏪 محل (Shop)</Badge>;
      case 'influencer':
        return <Badge variant="purple" size="sm">⭐ مشهور (Influencer)</Badge>;
      default:
        return <Badge variant="default" size="sm">👤 عميل عادي</Badge>;
    }
  };

  const getLoyaltyBadge = (tier: LoyaltyTier) => {
    switch (tier) {
      case 'vip':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 whitespace-nowrap shadow-2xs">👑 VIP (100+ تذكرة)</span>;
      case 'gold':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap shadow-2xs">🥇 ذهبي (30-99)</span>;
      case 'silver':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border border-zinc-500/30 whitespace-nowrap shadow-2xs">🥈 فضي (10-29)</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-500/10 text-gray-600 dark:text-zinc-400 border border-gray-500/20 whitespace-nowrap shadow-2xs">🌱 عادي (1-9)</span>;
    }
  };

  const getPurchasingPowerBadge = (power: PurchasingPower) => {
    switch (power) {
      case 'whale':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 whitespace-nowrap shadow-2xs">🐋 حوت (+4501 ج)</span>;
      case 'strong':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow-2xs">💪 قوي (2000-4500 ج)</span>;
      case 'medium':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 whitespace-nowrap shadow-2xs">⚡ متوسط (500-1999 ج)</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-500/10 text-zinc-400 border border-gray-500/20 whitespace-nowrap shadow-2xs">🌱 عادي (0-499 ج)</span>;
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

  if (!isOpen || !currentCust) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`داشبورد العميل المتكاملة: ${currentCust.name}`}
      subtitle={`كود: ${currentCust.code} • كود الإحالة: ${currentCust.referralCode} • عضو منذ: ${formatDate(currentCust.createdAt)}`}
      maxWidth="4xl"
    >
      <div className="space-y-5 text-right text-xs">
        {/* Navigation Breadcrumb Stack when browsing referees */}
        {customerNavStack.length > 0 && (
          <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between gap-3 text-xs animate-fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-500" />
              <span className="text-zinc-800 dark:text-zinc-200">
                أنت الآن تتصفح بروفايل العميل المُحال: <strong className="text-orange-500 font-bold">{currentCust.name}</strong>
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBackToReferrer}
              icon={<ArrowUpRight className="w-3.5 h-3.5" />}
              className="font-bold border-orange-500/30 text-orange-500 hover:bg-orange-500 hover:text-white"
            >
              العودة للمُحيل ({customerNavStack[customerNavStack.length - 1].name})
            </Button>
          </div>
        )}

        {/* 🔒 Frozen Account Warning Banner */}
        {currentCust.isFrozen && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between text-xs font-bold text-rose-400 animate-pulse">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <span>
                  ⚠️ هذا الحساب مجمد إدارياً بقرار من المدير العام. كافة عمليات الشراء والاستبدال من المحفظة والكاش باك معطلة لحين فك التجميد.
                </span>
                {currentCust.freezeReason && (
                  <span className="text-zinc-300 block font-normal text-[11px] mt-0.5">
                    سبب التجميد: {currentCust.freezeReason}
                  </span>
                )}
              </div>
            </div>
            {isOwner && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleFreeze}
                className="border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-white shrink-0"
              >
                إلغاء التجميد 🔓
              </Button>
            )}
          </div>
        )}

        {/* Profile Master Header */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 font-black text-xl shadow-xs">
              {currentCust.name ? currentCust.name[0] : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">{currentCust.name}</h3>
                {getProfileTypeBadge(currentCust.profileType)}
                {getLoyaltyBadge(calculatedMetrics.loyaltyTier)}
                {getPurchasingPowerBadge(calculatedMetrics.purchasingPower)}
                {getLifetimeSpendingTierBadge(calculatedMetrics.lifetimeSpendingTier)}
                
                {/* Account Credit/Debit Balance Badge (Clickable for Admin) */}
                <button
                  type="button"
                  disabled={!isOwner}
                  onClick={() => {
                    setAdjustTarget('account');
                    setAdjustAmount(0);
                    setIsBalanceAdjustModalOpen(true);
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                    (currentCust.accountBalance || 0) > 0
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      : (currentCust.accountBalance || 0) < 0
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  } ${isOwner ? 'hover:scale-105 cursor-pointer' : ''}`}
                  title={isOwner ? 'اضغط لتعديل ��صيد حساب العميل' : ''}
                >
                  {(currentCust.accountBalance || 0) > 0
                    ? `دائن: +${currentCust.accountBalance} ج ⚙️`
                    : (currentCust.accountBalance || 0) < 0
                    ? `عجز مدين: ${currentCust.accountBalance} ج ⚙️`
                    : 'المحفظة الأساسية: 0 ج ⚙️'}
                </button>

                {/* Owner Clear Debt Action Button */}
                {isOwner && (currentCust.accountBalance || 0) < 0 && (
                  <button
                    type="button"
                    onClick={() => setIsClearDebtModalOpen(true)}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer animate-pulse"
                    title="تصفية المحفظة الأساسية وشطب العجز المالي بقرار المالك"
                  >
                    <span>⚠️ تصفية المحفظة ({currentCust.accountBalance} ج)</span>
                  </button>
                )}

                {currentCust.isFrozen && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-500 border border-rose-500/30">
                    🔒 مجمد
                  </span>
                )}

                {/* Referral Profile Badge & Countdown */}
                {currentCust.hasReferralProfile && (
                  <button
                    type="button"
                    onClick={handleOpenReferralProfile}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border cursor-pointer transition-all flex items-center gap-1 ${
                      referralProfileSummary.status === 'active'
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25'
                        : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/25'
                    }`}
                    title="انقر لتعديل إعدادات بروفايل الإحالة"
                  >
                    <Share2 className="w-3 h-3" />
                    {referralProfileSummary.status === 'active'
                      ? `🔥 إحالة نشطة (${referralProfileSummary.daysRemaining} يوم متبقٍ)`
                      : '⌛ إحالة منتهية'}
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500 flex items-center gap-3 mt-1.5 font-mono flex-wrap">
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-orange-500" /> {currentCust.phone}</span>
                <span>• المصدر: {currentCust.source === 'facebook' ? 'فيسبوك' : currentCust.source === 'telegram' ? 'تيليجرام' : currentCust.source === 'tiktok' ? 'تيك توك' : 'مباشر'}</span>
                <span>• اللعبة المفضلة: {calculatedMetrics.favoriteGame || currentCust.favoriteGame || 'Free Fire'}</span>
                <span className="flex items-center gap-1 text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>تاريخ إنشاء الملف: {formatDateTime(currentCust.createdAt)}</span>
                </span>
                {currentCust.birthDate && (
                  <span className="flex items-center gap-1 text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded-lg border border-pink-500/20">
                    <Gift className="w-3.5 h-3.5 text-pink-400" />
                    <span>تاريخ الميلاد: {formatDate(currentCust.birthDate)}</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
            {/* WhatsApp Quick Button */}
            <button
              type="button"
              onClick={() => {
                const clean = currentCust.phone.replace(/[^0-9]/g, '');
                const phone = clean.startsWith('0') ? '2' + clean : clean;
                window.open(`https://wa.me/${phone}`, '_blank');
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" /> واتساب 💬
            </button>

            {/* Quick Statement Report */}
            <button
              type="button"
              onClick={() => setIsStatementReportOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500 hover:text-white text-orange-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> 🖨️ كشف حساب رسمي
            </button>

            {/* Quick Compensation Coupon */}
            <button
              type="button"
              onClick={() => setIsCompCouponModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500 hover:text-white text-purple-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" /> إنشاء كوبون تعويض
            </button>

            {/* Admin Full Edit Profile Button */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 hover:text-white text-amber-500 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="تعديل بيانات العميل بالكامل (Admin Only)"
              >
                <Edit2 className="w-3.5 h-3.5" /> ✏️ تعديل البيانات
              </button>
            )}

            {/* + إضافة بروفايل إحالة / بروفايل الإحالة Button */}
            <button
              type="button"
              onClick={handleOpenReferralProfile}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                currentCust.hasReferralProfile
                  ? 'bg-purple-600/20 hover:bg-purple-600 hover:text-white text-purple-400 border border-purple-500/30'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/30'
              }`}
              title={currentCust.hasReferralProfile ? 'فتح وتعديل بروفايل الإحالة المربوط' : 'إنشاء وربط بر��فايل إحالة جديد لهذا العميل'}
            >
              <Share2 className="w-3.5 h-3.5" />
              {currentCust.hasReferralProfile ? 'بروفايل الإحالة ⚙️' : '+ إضافة بروفايل إحالة'}
            </button>

            {/* Freeze Button */}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  if (currentCust.isFrozen) {
                    handleToggleFreeze();
                  } else {
                    setShowFreezeModal(true);
                  }
                }}
                className={`p-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                  currentCust.isFrozen
                    ? 'border-emerald-500 text-emerald-500 hover:bg-emerald-500/10'
                    : 'border-rose-500/40 text-rose-400 hover:bg-rose-500/10'
                }`}
                title={currentCust.isFrozen ? 'إلغاء التجميد' : 'تجميد الحساب'}
              >
                {currentCust.isFrozen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Referrer Details Banner if Registered with a Referral Code */}
        {currentCust.referredByCode && (
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-purple-400 block font-bold">تمت الإحالة والتسجيل بواسطة:</span>
                <strong className="text-zinc-900 dark:text-zinc-100 font-bold text-xs">
                  {currentCust.referrerName || currentCust.referredByCode}
                  <span className="text-purple-400 font-normal mr-1.5">
                    ({currentCust.referrerType === 'partner' ? '🤝 شريك' : currentCust.referrerType === 'shop' ? '🏪 محل' : currentCust.referrerType === 'influencer' ? '⭐ مشهور' : '👤 عميل'})
                  </span>
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2.5 font-mono text-[11px] text-zinc-400 flex-wrap">
              <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-purple-500/30 text-purple-400 font-bold">
                كود المُحيل: {currentCust.referredByCode}
              </span>
              <span>تاريخ الربط: {formatDate(currentCust.referralLinkedAt || currentCust.createdAt)}</span>
              {currentCust.firstMonthExpiryDate && (
                <span className="text-amber-500 font-bold">
                  • انتهاء أول شهر: {formatDate(currentCust.firstMonthExpiryDate)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 7 High-Impact KPI Dashboard Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* 1. Lifetime Spending (EGP & USD) */}
          <Card className="p-3 bg-white dark:bg-[#18181B] text-center border border-gray-200 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block">إجمالي الإنفاق (USD / EGP)</span>
            <strong className="text-sm font-black font-mono text-emerald-500 block">{formatCurrency(totalSpentCalculated)}</strong>
            <span className="text-[10px] font-mono text-cyan-400 font-bold block">${totalSpentUSDCalculated.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
          </Card>

          {/* 2. Completed Orders & Loyalty Tier */}
          <Card className="p-3 bg-white dark:bg-[#18181B] text-center border border-gray-200 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block">الطلبات المكتملة</span>
            <strong className="text-sm font-black font-mono text-orange-500">{calculatedMetrics.totalOrders} طلب</strong>
            <span className="text-[9px] font-bold block text-purple-400">{getLoyaltyBadge(calculatedMetrics.loyaltyTier)}</span>
          </Card>

          {/* 3. Highest Single Order & Purchasing Power */}
          <Card className="p-3 bg-white dark:bg-[#18181B] text-center border border-gray-200 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block">أعلى شحنة فردية</span>
            <strong className="text-sm font-black font-mono text-amber-400">{formatCurrency(maxOrderValue)}</strong>
            <span className="text-[9px] text-zinc-500 block">متوسط: {avgOrderValue} ج</span>
          </Card>

          {/* 4. Primary Wallet (المحفظة الأساسية - عجز السداد المدين أو الفائض الدائن) */}
          <Card className={`p-3 bg-white dark:bg-[#18181B] text-center border space-y-1 transition-all ${
            (currentCust.accountBalance || 0) < 0
              ? 'border-rose-500/40 bg-rose-500/5'
              : (currentCust.accountBalance || 0) > 0
              ? 'border-blue-500/40 bg-blue-500/5'
              : 'border-gray-200 dark:border-[#27272A]'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-bold block">المحفظة الأساسية</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                (currentCust.accountBalance || 0) < 0
                  ? 'bg-rose-500/20 text-rose-400 font-mono animate-pulse'
                  : (currentCust.accountBalance || 0) > 0
                  ? 'bg-blue-500/20 text-blue-400 font-mono'
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                {(currentCust.accountBalance || 0) < 0
                  ? 'عجز مدين ⚠️'
                  : (currentCust.accountBalance || 0) > 0
                  ? 'فائض دائن ✨'
                  : 'متزن'}
              </span>
            </div>
            <strong className={`text-sm font-black font-mono block ${
              (currentCust.accountBalance || 0) < 0
                ? 'text-rose-500'
                : (currentCust.accountBalance || 0) > 0
                ? 'text-blue-400'
                : 'text-zinc-300'
            }`}>
              {(currentCust.accountBalance || 0) > 0 ? `+${formatCurrency(currentCust.accountBalance || 0)}` : formatCurrency(currentCust.accountBalance || 0)}
            </strong>
            <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-0.5">
              <span>{(currentCust.accountBalance || 0) < 0 ? 'عجز سداد' : 'رصيد متاح'}</span>
              {isOwner && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustTarget('account');
                      setAdjustAmount(0);
                      setIsBalanceAdjustModalOpen(true);
                    }}
                    className="text-blue-400 hover:text-blue-300 font-bold cursor-pointer underline"
                    title="تعديل أو إيداع أو خصم من المحفظة الأساسية"
                  >
                    تعديل ⚙️
                  </button>
                  {(currentCust.accountBalance || 0) < 0 && (
                    <button
                      type="button"
                      onClick={() => setIsClearDebtModalOpen(true)}
                      className="text-rose-500 hover:text-rose-400 font-black cursor-pointer underline animate-pulse"
                      title="تصفية وشطب العجز"
                    >
                      تصفية ⚠️
                    </button>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* 5. Cashback Wallet & Custom Rate */}
          <Card className={`p-3 bg-white dark:bg-[#18181B] text-center border space-y-1 transition-all ${
            customerExpirySummary.cashbackExpired > 0 ? 'border-amber-500/50 bg-amber-500/5' : 'border-gray-200 dark:border-[#27272A]'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-bold block">رصيد الكاش باك</span>
              <div className="flex items-center gap-1">
                {customerExpirySummary.cashbackExpired > 0 && (
                  <span className="text-[9px] bg-rose-500/20 text-rose-400 font-bold font-mono px-1 rounded animate-pulse" title="يوجد رصيد منتهي الصلاحية">
                    ⚠️ {formatCurrency(customerExpirySummary.cashbackExpired)}
                  </span>
                )}
                <span className="text-[10px] text-emerald-400 font-bold font-mono">
                  ({currentCust.cashbackRate ?? 1.0}%)
                </span>
              </div>
            </div>
            <strong className="text-sm font-black font-mono text-emerald-500 block">{formatCurrency(currentCust.cashbackBalance || 0)}</strong>
            <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-0.5">
              <span>{customerExpirySummary.cashbackExpired > 0 ? `صالح: ${formatCurrency(customerExpirySummary.cashbackValid)}` : 'متاح للاستبدال'}</span>
              {isOwner && (
                <div className="flex items-center gap-1">
                  {customerExpirySummary.cashbackExpired > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpiredModalWalletType('cashback');
                        setIsExpiredBalanceModalOpen(true);
                      }}
                      className="text-amber-500 hover:text-amber-400 font-black cursor-pointer underline text-[9px] animate-pulse"
                      title="إدارة الكاش باك منتهي الصلاحية (تمديد أو تحويل كـ Breakage)"
                    >
                      منتهي ⚠️
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCashbackTransferModalOpen(true)}
                    className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500 hover:text-white transition-all text-[9px] flex items-center gap-0.5 cursor-pointer"
                    title="إصدار تذكرة تحويل واستبدال كاش باك رسمي"
                  >
                    تحويل ⇄
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustTarget('cashback');
                      setAdjustAmount(0);
                      setIsBalanceAdjustModalOpen(true);
                    }}
                    className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-bold cursor-pointer text-[9px]"
                    title="تسوية إدارية رسمية لكاش باك العميل"
                  >
                    تسوية ⚖️
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditCashbackRate(currentCust.cashbackRate ?? 1.0);
                      setIsCashbackRateModalOpen(true);
                    }}
                    className="text-orange-500 hover:text-orange-400 font-bold cursor-pointer underline"
                    title="تخصيص نسبة الكاش باك الخاصة بهذا العميل"
                  >
                    نسبة ⚙️
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* 6. Referral Wallet */}
          <Card className={`p-3 bg-white dark:bg-[#18181B] text-center border space-y-1 transition-all ${
            customerExpirySummary.referralExpired > 0 ? 'border-amber-500/50 bg-amber-500/5' : 'border-gray-200 dark:border-[#27272A]'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-bold block">محفظة الإحالة</span>
              {customerExpirySummary.referralExpired > 0 && (
                <span className="text-[9px] bg-rose-500/20 text-rose-400 font-bold font-mono px-1 rounded animate-pulse" title="يوجد رصيد منتهي الصلاحية">
                  ⚠️ {formatCurrency(customerExpirySummary.referralExpired)}
                </span>
              )}
            </div>
            <strong className="text-sm font-black font-mono text-purple-400">{formatCurrency(currentCust.referralWalletBalance || 0)}</strong>
            <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-0.5">
              <span>{customerExpirySummary.referralExpired > 0 ? `صالح: ${formatCurrency(customerExpirySummary.referralValid)}` : `${referrals.length} عميل محال`}</span>
              {isOwner && (
                <div className="flex items-center gap-1">
                  {customerExpirySummary.referralExpired > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpiredModalWalletType('referral');
                        setIsExpiredBalanceModalOpen(true);
                      }}
                      className="text-amber-500 hover:text-amber-400 font-black cursor-pointer underline text-[9px] animate-pulse"
                      title="إدارة رصيد الإحالة منتهي الصلاحية (تمديد أو تحويل كـ Breakage)"
                    >
                      منتهي ⚠️
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustTarget('referral');
                      setAdjustAmount(0);
                      setIsBalanceAdjustModalOpen(true);
                    }}
                    className="text-purple-400 hover:text-purple-300 font-bold cursor-pointer underline"
                    title="تعديل رصيد محفظة الإحالة مباشرة"
                  >
                    تعديل 💰
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* 7. Execution Speed & Rating */}
          <Card className="p-3 bg-white dark:bg-[#18181B] text-center border border-gray-200 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 font-bold block">سرعة الشحن والرضا</span>
            <strong className="text-sm font-black font-mono text-cyan-400">{avgSpeedMinutes} دقيقة</strong>
            <span className="text-[9px] text-amber-400 font-bold block">{avgCustomerRating} / 5.0 ⭐</span>
          </Card>
        </div>

        {/* 6 Sub-Tabs Navigation (Drag & Drop Reorderable) */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] overflow-x-auto text-xs font-bold no-scrollbar">
          {getOrderedItems('customer_profile_tabs', [
            { id: 'dashboard', label: '1. الداشبورد والتحليلات', icon: Activity, activeClass: 'bg-orange-500 text-white shadow-xs' },
            { id: 'tickets', label: `2. تذاكر الشحن (${tickets.length})`, icon: Ticket, activeClass: 'bg-orange-500 text-white shadow-xs' },
            { id: 'coupons', label: `3. الكوبونات والتعويضات (${customerCoupons.length})`, icon: Gift, activeClass: 'bg-purple-600 text-white shadow-xs' },
            { id: 'wallet', label: `4. دفتر المحافظ (${walletTransactions.length})`, icon: Wallet, activeClass: 'bg-orange-500 text-white shadow-xs' },
            { id: 'referrals', label: `5. شبكة الإحالات (${referrals.length})`, icon: Share2, activeClass: 'bg-orange-500 text-white shadow-xs' },
            { id: 'notes', label: `6. الملاحظات والتعويض (${notes.length})`, icon: FileText, activeClass: 'bg-orange-500 text-white shadow-xs' },
            { id: 'withdrawals', label: `7. السحوبات (${customerWithdrawals.length})`, icon: Receipt, activeClass: 'bg-amber-600 text-white shadow-xs' },
            { id: 'competitions', label: '8. المسابقات والجوائز 🎯', icon: Trophy, activeClass: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs' }
          ]).map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <SortableDraggableItem
                key={tab.id}
                id={tab.id}
                index={idx}
                containerId="customer_profile_tabs"
                direction="horizontal"
                className="shrink-0"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isActive ? tab.activeClass : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              </SortableDraggableItem>
            );
          })}
        </div>

        {/* Tab 1: Dashboard & Analytics */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Game Preferences Breakdown */}
              <Card className="p-4 bg-white dark:bg-[#18181B] space-y-3 border border-gray-200 dark:border-[#27272A]">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                    <Gamepad2 className="w-4 h-4 text-orange-500" /> توزيع شحنات الألعاب (Games Breakdown)
                  </h4>
                  <span className="text-[11px] text-zinc-400">{gameBreakdown.length} ألعاب مسجلة</span>
                </div>

                <div className="space-y-2.5">
                  {gameBreakdown.length === 0 ? (
                    <p className="py-6 text-center text-zinc-400 text-xs">لا توجد شحنات مكتملة بعد لتحليل الألعاب</p>
                  ) : (
                    gameBreakdown.map((g, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-zinc-800 dark:text-zinc-200">{g.game}</span>
                          <span className="font-mono text-orange-500">{g.totalSpent} ج ({g.percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-orange-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${g.percentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-400">{g.count} تذاكر شحن</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Behavior & Loyalty Profile */}
              <Card className="p-4 bg-white dark:bg-[#18181B] space-y-3 border border-gray-200 dark:border-[#27272A]">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-500" /> تحليل سلوك الشراء والإنفاق التراكمي
                  </h4>
                  <span className="text-[11px] text-emerald-500 font-bold">عميل مستمر 🟢</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">مستوى الولاء (عدد التذاكر المكتملة):</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">({calculatedMetrics.totalOrders} تذكرة)</span>
                      {getLoyaltyBadge(calculatedMetrics.loyaltyTier)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">قوة الشراء (أعلى عملية منفردة):</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">({formatCurrency(maxOrderValue)})</span>
                      {getPurchasingPowerBadge(calculatedMetrics.purchasingPower)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">تصنيف إجمالي الإنفاق (USD Tiers):</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-400">(${totalSpentUSDCalculated.toFixed(2)})</span>
                      {getLifetimeSpendingTierBadge(calculatedMetrics.lifetimeSpendingTier)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">إجمالي الإنفاق التراكمي (EGP):</span>
                    <strong className="font-mono text-emerald-500">{formatCurrency(totalSpentCalculated)}</strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">تاريخ آخر عملية شحن:</span>
                    <strong className="font-mono text-zinc-900 dark:text-zinc-100">
                      {calculatedMetrics.lastPurchaseDate ? formatDate(calculatedMetrics.lastPurchaseDate) : 'لا يوجد شحنات سابقة'}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">متوسط قيمة العملية (AOV):</span>
                    <strong className="font-mono text-orange-500">{avgOrderValue} ج.م</strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">العميل مسجل عبر كود إحالة:</span>
                    <strong className="font-mono text-blue-400">{currentCust.referredByCode || 'تسجيل مباشر بدون وسيط'}</strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">نسبة عمولة الشريك المخصصة:</span>
                    <strong className="font-mono text-purple-400">{currentCust.customCommissionRate || 1.0}%</strong>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Top-Up Tickets History & Advanced Date Filters */}
        {activeTab === 'tickets' && (
          <div className="space-y-4 animate-fade-in">
            {/* 1. Quick Presets Bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap p-2.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-zinc-500 ml-1">📅 اختصارات الفترات:</span>
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'today', label: 'اليوم' },
                  { id: 'yesterday', label: 'أمس' },
                  { id: 'last7', label: 'آخر 7 أيام' },
                  { id: 'last30', label: 'آخر 30 يوماً' },
                  { id: 'this_month', label: 'هذا الشهر' },
                  { id: 'last_month', label: 'الشهر الماضي' },
                  { id: 'this_year', label: 'السنة الحالية' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSetTicketPreset(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      ticketDatePreset === p.id
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-white dark:bg-[#18181B] text-zinc-600 dark:text-zinc-300 hover:bg-orange-500/10 hover:text-orange-500 border border-gray-200 dark:border-[#27272A]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="بحث برقم التذكرة أو اللعبة..."
                  value={ticketSearch}
                  onChange={e => setTicketSearch(e.target.value)}
                  className="p-1.5 px-3 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-xs text-zinc-900 dark:text-zinc-100 outline-none w-52 focus:border-orange-500"
                />
              </div>
            </div>

            {/* 2. Professional Date Range Filter & Status Filters (Requirement #5) */}
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <DateRangeFilter
                  startDate={ticketStartDate}
                  endDate={ticketEndDate}
                  onStartDateChange={setTicketStartDate}
                  onEndDateChange={setTicketEndDate}
                  onReset={handleResetTicketDateFilter}
                />

                <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
                  {['all', 'completed', 'in_progress', 'problem'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTicketStatusFilter(st)}
                      className={`px-3 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer text-center ${
                        ticketStatusFilter === st ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {st === 'all' ? 'الكل' : st === 'completed' ? 'مكتملة' : st === 'in_progress' ? 'قيد التنفيذ' : 'مشاكل'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleResetTicketDateFilter}
                  className="py-1.5 px-3 rounded-xl bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 font-bold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer text-center flex items-center gap-1"
                  title="إعادة تعيين كافة فلاتر التاريخ والبحث"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة ضبط</span>
                </button>
              </div>
            </div>

            {/* 3. Real-Time Filtered Statistics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center shadow-2xs">
                <span className="text-[10px] text-zinc-400 font-bold block">التذاكر المفلترة</span>
                <strong className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100">
                  {filteredTicketStats.count} <span className="text-[10px] text-zinc-400 font-normal">({filteredTicketStats.completedCount} مكتمل)</span>
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center shadow-2xs">
                <span className="text-[10px] text-zinc-400 font-bold block">إجمالي المدفوع</span>
                <strong className="text-sm font-black font-mono text-emerald-500">
                  {formatCurrency(filteredTicketStats.totalSpent)}
                </strong>
                <span className="text-[9px] text-cyan-400 font-mono block">${filteredTicketStats.totalSpentUSD.toFixed(1)} USD</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center shadow-2xs">
                <span className="text-[10px] text-zinc-400 font-bold block">إجمالي الأرباح</span>
                <strong className="text-sm font-black font-mono text-blue-400">
                  {formatCurrency(filteredTicketStats.totalProfit)}
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center shadow-2xs">
                <span className="text-[10px] text-zinc-400 font-bold block">الكاش باك المكتسب</span>
                <strong className="text-sm font-black font-mono text-purple-400">
                  +{filteredTicketStats.cashbackEarned} ج
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center shadow-2xs">
                <span className="text-[10px] text-zinc-400 font-bold block">عمولات الإحالة</span>
                <strong className="text-sm font-black font-mono text-indigo-400">
                  +{filteredTicketStats.referralEarned} ج
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center shadow-2xs">
                <span className="text-[10px] text-zinc-400 font-bold block">متوسط قيمة التذكرة</span>
                <strong className="text-sm font-black font-mono text-orange-500">
                  {filteredTicketStats.avgOrder} ج
                </strong>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 dark:border-[#27272A] rounded-2xl">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                    <th className="py-2.5 px-3">رقم التذكرة</th>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">اللعبة والباقة</th>
                    <th className="py-2.5 px-3">الـ Player ID</th>
                    <th className="py-2.5 px-3">المبلغ</th>
                    <th className="py-2.5 px-3">كاش باك</th>
                    <th className="py-2.5 px-3">الحالة</th>
                    <th className="py-2.5 px-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-400">لا توجد تذاكر مسجلة</td>
                    </tr>
                  ) : (
                    filteredTickets.map(t => (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTicketForDetails(t)}
                        className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 cursor-pointer group/ticket-row"
                        title="انقر لعرض تفاصيل التذكرة بالكامل"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-orange-500 underline decoration-dotted underline-offset-2">{t.ticketNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">{formatDate(t.createdAt)}</td>
                        <td className="py-2.5 px-3">
                          <strong className="text-zinc-800 dark:text-zinc-200 block">{t.gameName} — {t.gameProductName}</strong>
                          {t.notes && (
                            <div className="mt-1 p-0.5 px-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 text-[10px] flex items-center gap-1 max-w-xs">
                              <span className="font-bold">ملاحظة:</span>
                              <span className="truncate" title={t.notes}>{t.notes}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-500 font-bold">{t.playerGameId}</td>
                        <td className="py-2.5 px-3 font-mono font-bold">{t.receivedAmount || t.requiredAmount} ج</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-500 font-bold">+{t.cashbackEarned || 0} ج</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={t.status === 'completed' ? 'success' : t.status === 'problem' ? 'danger' : 'warning'} size="sm">
                            {t.status === 'completed' ? 'مكتملة' : t.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicketForDetails(t);
                              }}
                              className="px-2 py-1 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1 cursor-pointer font-bold text-[10px] shadow-xs"
                              title="عرض تفاصيل التذكرة بالكامل"
                            >
                              <Eye className="w-3 h-3 text-blue-500 group-hover:text-white" />
                              <span>تفاصيل</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrintingTicket(t);
                              }}
                              className="px-2 py-1 rounded-lg border border-gray-200 dark:border-[#27272A] bg-gray-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:border-orange-500 hover:text-orange-500 transition-all flex items-center gap-1 cursor-pointer font-bold text-[10px] shadow-xs"
                              title="عرض ومعاينة الفاتورة وطباعتها"
                            >
                              <Receipt className="w-3 h-3 text-orange-500" />
                              <span>عرض الفاتورة</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const clean = currentCust.phone.replace(/[^0-9]/g, '');
                                const phone = clean.startsWith('0') ? '2' + clean : clean;
                                const msg = `🎮 مرحباً بك ${currentCust.name}! ✨\n━━━━━━━━━━━━━━━\n📦 تفاصيل تذكرتك #${t.ticketNumber}:\n💎 اللعبة: ${t.gameName} — ${t.gameProductName}\n🎯 الـ ID: ${t.playerGameId}\n💰 المبلغ: ${t.receivedAmount || t.requiredAmount} ج\n🎁 كاش باك: +${t.cashbackEarned || 0} ج\n━━━━━━━━━━━━━━━\nNZM JKR Top Up 🌟`;
                                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                              className="p-1 rounded text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                              title="إرسال عبر واتساب"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: CUSTOMER EXCLUSIVE COUPONS & COMPENSATION CODES */}
        {/* ============================================================= */}
        {activeTab === 'coupons' && (
          <div className="space-y-4 animate-fade-in text-xs">
            {/* Top Bar: Action & Stats */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent border border-purple-500/30">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>كوبونات التعويض والخصومات الحصرية للعميل</span>
                    <Badge variant="purple" size="sm">{customerCoupons.length} كوبون</Badge>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    كوبونات مخصصة حصرياً للعميل ({currentCust.name}) ومحمية برقم الهاتف والـ ID لضمان عدم استخدامها من أي حساب آخر.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCompCouponModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ إنشاء كوبون تعويض جديد</span>
              </button>
            </div>

            {/* Coupons List Grid & Table */}
            {customerCoupons.length === 0 ? (
              <div className="p-10 rounded-2xl bg-white dark:bg-[#18181B] border border-dashed border-gray-200 dark:border-[#27272A] text-center space-y-3">
                <Gift className="w-10 h-10 text-purple-400/40 mx-auto" />
                <h5 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">لا توجد كوبونات تعويض مسجلة لهذا العميل حالياً</h5>
                <p className="text-zinc-400 text-xs">اضغط على زر "+ إنشاء كوبون تعويض جديد" لإصدار كوبون خصم مالي فوري للعميل مع رسالة واتساب منسقة.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 dark:border-[#27272A] rounded-2xl">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                      <th className="py-2.5 px-3">كود الكوبون</th>
                      <th className="py-2.5 px-3">قيمة الخصم</th>
                      <th className="py-2.5 px-3">النوع والتخصيص</th>
                      <th className="py-2.5 px-3">سبب التعويض والبيان</th>
                      <th className="py-2.5 px-3">مرات الاستخدام</th>
                      <th className="py-2.5 px-3">الحالة</th>
                      <th className="py-2.5 px-3">تاريخ الإنشاء</th>
                      <th className="py-2.5 px-3 text-center">إرسال ومشاركة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {customerCoupons.map(cpn => {
                      const isUsed = (cpn.currentUsageCount || 0) >= (cpn.maxUsageTotal || 1);
                      const isActive = cpn.isActive && !cpn.isAutoDeactivated && !isUsed;

                      return (
                        <tr key={cpn.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                          <td className="py-2.5 px-3 font-mono font-black text-purple-400 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span>{cpn.code}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(cpn.code, `كود الكوبون (${cpn.code})`, showToast)}
                                className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
                                title="نسخ الكود فقط"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-500 text-sm">
                            {cpn.discountType === 'percentage' ? `${cpn.discountValue}%` : `${cpn.discountValue} ج`}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 block w-fit">
                                🔒 حصري للعميل فقط
                              </span>
                              {cpn.applicableGameId && cpn.applicableGameId !== 'all' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1 w-fit">
                                  <Gamepad2 className="w-3 h-3 text-indigo-400" />
                                  <span>{cpn.applicableGameName || 'لعبة محددة'}</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-zinc-800 text-zinc-400 border border-gray-200 dark:border-zinc-700 flex items-center gap-1 w-fit">
                                  <Globe className="w-3 h-3" />
                                  <span>كل الألعاب</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-zinc-700 dark:text-zinc-300">
                            {cpn.compensationReason || cpn.title || 'تعويض ورضا عميل'}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {cpn.currentUsageCount || 0} / {cpn.maxUsageTotal || 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant={isActive ? 'success' : isUsed ? 'default' : 'danger'} size="sm">
                              {isActive ? 'صالح ونشط' : isUsed ? 'تم الاستخدام' : 'منتهي / معطل'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400">
                            {formatDate(cpn.createdAt)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyCouponWhatsApp(cpn)}
                                className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-600 hover:text-white text-purple-400 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                title="نسخ الكوبون مع الرسالة المخصصة من الإعدادات"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>نسخ الرسالة 💬</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Unified Wallet Ledger */}
        {activeTab === 'wallet' && (
          <div className="space-y-4 animate-fade-in">
            {/* 3 Isolated Customer Wallets Cards (Requirement #2 & #8) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. Primary Wallet (المحفظة الأساسية) */}
              <div className={`p-4 rounded-2xl border transition-all ${
                (currentCust.accountBalance || 0) < 0
                  ? 'bg-rose-500/10 border-rose-500/30 dark:bg-rose-950/20 shadow-xs'
                  : (currentCust.accountBalance || 0) > 0
                  ? 'bg-blue-500/10 border-blue-500/30 dark:bg-blue-950/20 shadow-xs'
                  : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A]'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                    <Wallet className="w-4 h-4 text-blue-500" />
                    <span>المحفظة الأساسية</span>
                  </span>
                  <Badge
                    variant={(currentCust.accountBalance || 0) < 0 ? 'danger' : (currentCust.accountBalance || 0) > 0 ? 'info' : 'default'}
                    size="sm"
                  >
                    {(currentCust.accountBalance || 0) < 0
                      ? '⚠️ عجز سداد مدين'
                      : (currentCust.accountBalance || 0) > 0
                      ? 'رصيد دائن متاح'
                      : 'رصيد متزن 0 ج'}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between mt-2 flex-wrap gap-2">
                  <span className={`text-2xl font-black font-mono ${
                    (currentCust.accountBalance || 0) < 0
                      ? 'text-rose-500'
                      : (currentCust.accountBalance || 0) > 0
                      ? 'text-blue-500'
                      : 'text-zinc-400'
                  }`}>
                    {formatCurrency(currentCust.accountBalance || 0)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isOwner && (currentCust.accountBalance || 0) < 0 && (
                      <button
                        type="button"
                        onClick={() => setIsClearDebtModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs cursor-pointer transition-all flex items-center gap-1 animate-pulse"
                        title="شطب العجز وتصفية المحفظة بأمر المالك"
                      >
                        <span>تصفية المحفظة ⚠️</span>
                      </button>
                    )}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustTarget('account');
                          setAdjustAmount(0);
                          setIsBalanceAdjustModalOpen(true);
                        }}
                        className="text-xs text-blue-500 hover:underline cursor-pointer font-bold px-1"
                      >
                        تعديل ⚙️
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                  تستقبل إيداعات العميل وعجز السداد السالب أو الفائض. تسوية العجز تتم تلقائياً مع أي زيادة لاحقة.
                </p>
              </div>

              {/* 2. Cashback Wallet (محفظة الكاش باك) */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 dark:bg-emerald-950/10 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                    <Gift className="w-4 h-4 text-emerald-500" />
                    <span>محفظة الكاش باك</span>
                  </span>
                  <Badge variant="success" size="sm">
                    {currentCust.cashbackRate ?? 1.0}% كاش باك
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between mt-2 flex-wrap gap-2">
                  <span className="text-2xl font-black font-mono text-emerald-500">
                    {formatCurrency(currentCust.cashbackBalance || 0)}
                  </span>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustTarget('cashback');
                        setAdjustAmount(0);
                        setIsBalanceAdjustModalOpen(true);
                      }}
                      className="text-xs text-emerald-500 hover:underline cursor-pointer font-bold px-1"
                    >
                      تعديل ⚙️
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-mono">
                  <span>منفصلة تماماً (كاش باك فقط)</span>
                  <span>المكتسب: {formatCurrency(currentCust.totalCashbackEarned || 0)}</span>
                </div>
                {customerExpirySummary.cashbackExpired > 0 && (
                  <div className="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[10px] animate-fade-in">
                    <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                      <span>⚠️ رصيد منتهي (6 شهور):</span>
                      <span className="font-mono text-rose-400 font-black">{formatCurrency(customerExpirySummary.cashbackExpired)}</span>
                      <span className="text-zinc-400 font-normal">(صالح: {formatCurrency(customerExpirySummary.cashbackValid)})</span>
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setExpiredModalWalletType('cashback');
                          setIsExpiredBalanceModalOpen(true);
                        }}
                        className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-zinc-900 font-black cursor-pointer shadow-xs transition-all"
                      >
                        إدارة الرصيد ⚙️
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Referral Wallet (محفظة الإحالة) */}
              <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 dark:bg-purple-950/10 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                    <Share2 className="w-4 h-4 text-purple-400" />
                    <span>محفظة الإحالة</span>
                  </span>
                  <Badge variant="purple" size="sm">
                    {referrals.length} عميل مُحال
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between mt-2 flex-wrap gap-2">
                  <span className="text-2xl font-black font-mono text-purple-400">
                    {formatCurrency(currentCust.referralWalletBalance || 0)}
                  </span>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustTarget('referral');
                        setAdjustAmount(0);
                        setIsBalanceAdjustModalOpen(true);
                      }}
                      className="text-xs text-purple-400 hover:underline cursor-pointer font-bold px-1"
                    >
                      تعديل ⚙️
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-mono">
                  <span>منفصلة تماماً (عمولات فقط)</span>
                  <span>المكتسب: {formatCurrency(currentCust.totalReferralCommissionEarned || 0)}</span>
                </div>
                {customerExpirySummary.referralExpired > 0 && (
                  <div className="mt-2.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-[10px] animate-fade-in">
                    <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                      <span>⚠️ رصيد منتهي (12 شهر):</span>
                      <span className="font-mono text-rose-400 font-black">{formatCurrency(customerExpirySummary.referralExpired)}</span>
                      <span className="text-zinc-400 font-normal">(صالح: {formatCurrency(customerExpirySummary.referralValid)})</span>
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setExpiredModalWalletType('referral');
                          setIsExpiredBalanceModalOpen(true);
                        }}
                        className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-black cursor-pointer shadow-xs transition-all"
                      >
                        إدارة الرصيد ⚙️
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Presets Bar for Wallet Ledger */}
            <div className="flex items-center justify-between gap-2 flex-wrap p-2.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-zinc-500 ml-1">📅 اختصارات الفترات:</span>
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'today', label: 'اليوم' },
                  { id: 'yesterday', label: 'أمس' },
                  { id: 'this_week', label: 'أسبوعي' },
                  { id: 'last7', label: 'آخر 7 أيام' },
                  { id: 'this_month', label: 'شهري' },
                  { id: 'last30', label: 'آخر 30 يوماً' },
                  { id: 'last_month', label: 'الشهر الماضي' },
                  { id: 'this_year', label: 'السنة الحالية' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSetWalletPreset(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      walletDatePreset === p.id
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-white dark:bg-[#18181B] text-zinc-600 dark:text-zinc-300 hover:bg-orange-500/10 hover:text-orange-500 border border-gray-200 dark:border-[#27272A]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-zinc-400">إجمالي الحركات: {filteredWalletTx.length}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-xs flex-wrap">
                  {[
                    { id: 'all', label: 'كافة المعاملات' },
                    { id: 'account_balance', label: '💼 المحفظة الأساسية (عجز / فائض / تسوية)' },
                    { id: 'cashback', label: '🎁 محفظة الكاش باك' },
                    { id: 'referral', label: '🤝 محفظة الإحالة' }
                  ].map(wf => (
                    <button
                      key={wf.id}
                      type="button"
                      onClick={() => setWalletFilter(wf.id as any)}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        walletFilter === wf.id ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {wf.label}
                    </button>
                  ))}
                </div>

                {/* Calendar Picker & Date Range (Requirement #1) */}
                <DateRangeFilter
                  startDate={walletStartDate}
                  endDate={walletEndDate}
                  onStartDateChange={(dt) => {
                    setWalletStartDate(dt);
                    setWalletDatePreset('custom');
                  }}
                  onEndDateChange={(dt) => {
                    setWalletEndDate(dt);
                    setWalletDatePreset('custom');
                  }}
                  onReset={handleResetWalletDateFilter}
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 dark:border-[#27272A] rounded-2xl">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                    <th className="py-2.5 px-3">التاريخ والوقت</th>
                    <th className="py-2.5 px-3">المحفظة</th>
                    <th className="py-2.5 px-3">بيان العملية</th>
                    <th className="py-2.5 px-3">المبلغ</th>
                    <th className="py-2.5 px-3">الرصيد بعد الحركة</th>
                    <th className="py-2.5 px-3">رقم الطلب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                  {filteredWalletTx.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400">لا توجد حركات في هذا السجل</td>
                    </tr>
                  ) : (
                    filteredWalletTx.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400">{formatDateTime(tx.createdAt)}</td>
                        <td className="py-2.5 px-3">
                          {tx.walletType === 'account_balance' ? (
                            <Badge
                              variant={tx.type === 'debit' ? 'danger' : tx.type === 'settlement' ? 'warning' : 'info'}
                              size="sm"
                            >
                              {tx.type === 'debit' ? '⚠️ عجز سداد' : tx.type === 'settlement' ? '⚖️ تصفية وشطب' : '💼 رصيد أساسي'}
                            </Badge>
                          ) : tx.walletType === 'cashback' ? (
                            <Badge variant="success" size="sm">
                              🎁 كاش باك
                            </Badge>
                          ) : (
                            <Badge variant="purple" size="sm">
                              🤝 عمولة إحالة
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-zinc-800 dark:text-zinc-200">{tx.operationName}</td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {tx.type === 'settlement' ? (
                            <span className="text-amber-500">
                              تصفية: {tx.amount} ج
                            </span>
                          ) : tx.type === 'debit' ? (
                            <span className="text-rose-500">
                              -{tx.amount} ج
                            </span>
                          ) : tx.type === 'credit' ? (
                            <span className="text-emerald-500">
                              +{tx.amount} ج
                            </span>
                          ) : tx.type === 'redeemed' ? (
                            <span className="text-rose-500">
                              -{tx.amount} ج
                            </span>
                          ) : (
                            <span className="text-emerald-500">
                              +{tx.amount} ج
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-orange-500">{tx.balanceAfter} ج</td>
                        {/* Orange Clickable Order Number (Requirement #4) */}
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {tx.orderNumber ? (
                            <button
                              type="button"
                              onClick={() => {
                                const tkt = allDbTickets.find(t => t.ticketNumber === tx.orderNumber || t.id === tx.orderNumber) || db.getTickets().find(t => t.ticketNumber === tx.orderNumber || t.id === tx.orderNumber);
                                if (tkt) {
                                  setSelectedTicketForDetails(tkt);
                                } else {
                                  showToast('info', 'رقم الطلب', `طلب رقم: ${tx.orderNumber}`);
                                }
                              }}
                              className="text-orange-500 hover:text-orange-400 hover:underline cursor-pointer inline-flex items-center gap-1 font-bold"
                              title="عرض تفاصيل التذكرة"
                            >
                              <span>{tx.orderNumber}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Referral Network & Partner Performance Dashboard */}
        {activeTab === 'referrals' && (
          <div className="space-y-6 animate-fade-in text-xs">
            {/* Header info bar */}
            <div className="p-4 rounded-2xl bg-linear-to-r from-purple-500/10 via-indigo-500/10 to-orange-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-xs">كود الإحالة الخاص بالعميل:</span>
                  <div className="flex items-center gap-1.5 bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-500/30">
                    <strong className="font-mono text-base text-purple-300 font-black tracking-wider">
                      {currentCust.referralCode || 'غير محدد'}
                    </strong>
                    {currentCust.referralCode && (
                      <button
                        type="button"
                        onClick={() => handleCopyReferralWhatsApp(currentCust.referralCode)}
                        className="p-1 text-purple-400 hover:text-white transition-colors cursor-pointer"
                        title="نسخ كود ورسالة الإحالة بالكامل"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  يُستخدم هذا الكود عند تسجيل العملاء الجدد لربطهم بالشبكة واحتساب العمولات تلقائياً.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="text-left font-mono">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">رصيد عمولات الإحالة الحالي:</span>
                    <strong className="text-base text-purple-400 font-black font-mono">
                      {formatCurrency(currentCust.referralWalletBalance || 0)}
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsReferralTransferModalOpen(true)}
                      disabled={(currentCust.referralWalletBalance || 0) <= 0}
                      className="text-xs border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white"
                      title="تحويل رصيد الإحالة إلى الرصيد الأساسي للشحن"
                    >
                      🔄 تحويل للرصيد
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsWithdrawalModalOpen(true)}
                      disabled={(currentCust.referralWalletBalance || 0) <= 0}
                      className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white"
                      title="طلب صرف نقدية من رصيد الإحالة"
                    >
                      💸 صرف نقدية
                    </Button>
                  </div>
                </div>

                {isOwner && isPartnerType && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditFirstMonthRate(
                          currentCust.firstMonthCommissionRate ??
                            (currentCust.profileType === 'influencer' ? 5.0 : currentCust.profileType === 'partner' ? 3.0 : 2.0)
                        );
                        setEditLifetimeRate(
                          currentCust.lifetimeCommissionRate ?? (currentCust.profileType === 'influencer' ? 1.5 : 1.0)
                        );
                        setEditMonthlyTarget(
                          currentCust.monthlyTargetCount ?? (currentCust.profileType === 'partner' ? 10 : currentCust.profileType === 'shop' ? 15 : 20)
                        );
                        setIsRatesModalOpen(true);
                      }}
                      className="text-xs border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white"
                    >
                      ⚙️ إعدادات العمولات
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleEvaluatePartnerPerformance}
                      className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      ⚡ تقييم الأداء الشهري
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setReferralSubView('cards')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    referralSubView === 'cards'
                      ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>بطاقات الإحالة (الجدد والقدامى)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReferralSubView('tree')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    referralSubView === 'tree'
                      ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>شجرة الإحالة التفاعلية والشبكة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReferralSubView('vouchers')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    referralSubView === 'vouchers'
                      ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>سندات التحويل وسجل الحركات</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsReferralTransferModalOpen(true)}
                  disabled={(currentCust.referralWalletBalance || 0) <= 0}
                  icon={<Receipt className="w-3.5 h-3.5" />}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  إصدار سند تحويل رسمي
                </Button>
              </div>
            </div>

            {/* Sub-view: Tree */}
            {referralSubView === 'tree' && (
              <CustomerReferralNetwork
                currentCustomer={currentCust}
                allCustomers={allDbCustomers}
                allTickets={allDbTickets}
                walletTransactions={walletTransactions}
                onOpenCustomer={handleOpenRefereeProfile}
                onUnlinkReferee={setRefereeToUnlink}
                onOpenTransferModal={() => setIsReferralTransferModalOpen(true)}
                onOpenWithdrawalModal={() => setIsWithdrawalModalOpen(true)}
                isOwner={isOwner}
              />
            )}

            {/* Sub-view: Vouchers & Ledger */}
            {referralSubView === 'vouchers' && (
              <div className="space-y-4">
                {/* Vouchers Summary Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-1">
                    <span className="text-[11px] text-zinc-400 font-bold block">إجمالي العمولات المكتسبة</span>
                    <strong className="text-lg font-black text-emerald-500 font-mono block">
                      +{formatCurrency(currentCust.totalReferralCommissionEarned || referralTabKPIs.totalCommissionEarned)}
                    </strong>
                    <span className="text-[10px] text-zinc-500 block">من كافة التذاكر والطلبات</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-1">
                    <span className="text-[11px] text-zinc-400 font-bold block">إجمالي المحول للرصيد الدائن</span>
                    <strong className="text-lg font-black text-purple-400 font-mono block">
                      {formatCurrency(
                        walletTransactions
                          .filter(w => w.customerId === currentCust.id && w.walletType === 'referral' && w.type === 'redeemed' && !w.operationName.includes('سحب'))
                          .reduce((sum, w) => sum + w.amount, 0)
                      )}
                    </strong>
                    <span className="text-[10px] text-zinc-500 block">سندات استبدال وتحويل CBT/RFT</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-1">
                    <span className="text-[11px] text-zinc-400 font-bold block">إجمالي المسحوب نقدياً</span>
                    <strong className="text-lg font-black text-amber-500 font-mono block">
                      {formatCurrency(
                        walletTransactions
                          .filter(w => w.customerId === currentCust.id && w.walletType === 'referral' && ((w.type === 'redeemed' && w.operationName.includes('سحب')) || (w.type === 'adjustment' && (w.operationName.includes('سحب') || w.amount < 0))))
                          .reduce((sum, w) => sum + Math.abs(w.amount), 0)
                      )}
                    </strong>
                    <span className="text-[10px] text-zinc-500 block">سندات صرف كاش / محافظ نقدية</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-purple-500/30 bg-purple-500/5 space-y-1">
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold block">الرصيد المتاح حالياً</span>
                    <strong className="text-lg font-black text-purple-500 font-mono block">
                      {formatCurrency(currentCust.referralWalletBalance || 0)}
                    </strong>
                    <span className="text-[10px] text-zinc-500 block">جاهز للتحويل أو الصرف الفوري</span>
                  </div>
                </div>

                {/* Vouchers & Transactions Table */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-purple-500" />
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        سجل سندات وحركات محفظة الإحالة
                      </h4>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {walletTransactions.filter(w => w.customerId === currentCust.id && w.walletType === 'referral').length} حركة مسجلة
                    </span>
                  </div>

                  {walletTransactions.filter(w => w.customerId === currentCust.id && w.walletType === 'referral').length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 space-y-2">
                      <Receipt className="w-8 h-8 mx-auto opacity-40" />
                      <p className="font-bold text-xs">لا توجد حركات أو سندات مسجلة لمحفظة الإحالة حتى الآن</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-[#27272A] text-zinc-400 text-[11px]">
                            <th className="py-2 px-3 font-semibold">التاريخ والوقت</th>
                            <th className="py-2 px-3 font-semibold">نوع السند / الحركة</th>
                            <th className="py-2 px-3 font-semibold">البيان والتفاصيل</th>
                            <th className="py-2 px-3 font-semibold">المبلغ</th>
                            <th className="py-2 px-3 font-semibold">الرصيد بعدها</th>
                            <th className="py-2 px-3 font-semibold text-center">إجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                          {walletTransactions
                            .filter(w => w.customerId === currentCust.id && w.walletType === 'referral')
                            .map(tx => (
                              <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-[#141417] transition-colors">
                                <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500">
                                  {formatDate(tx.createdAt)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <Badge
                                    variant={
                                      tx.type === 'commission'
                                        ? 'success'
                                        : tx.operationName.includes('سحب') || tx.type === 'adjustment'
                                        ? 'warning'
                                        : 'info'
                                    }
                                    size="sm"
                                  >
                                    {tx.type === 'commission'
                                      ? 'عمولة إحالة 💰'
                                      : tx.operationName.includes('سحب') || tx.type === 'adjustment'
                                      ? 'سند صرف نقدية 💸'
                                      : 'سند تحويل رصيد 🔁'}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{tx.operationName}</span>
                                  {tx.notes && <span className="text-[10px] text-zinc-400 block">{tx.notes}</span>}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold">
                                  <span className={tx.type === 'commission' ? 'text-emerald-500' : 'text-purple-400'}>
                                    {tx.type === 'commission' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                                  {formatCurrency(tx.balanceAfter)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="p-1 rounded text-zinc-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                                    title="طباعة السند"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-view: Cards View */}
            {referralSubView === 'cards' && (
              <>

            {/* 🌟 Referral Profile Card (Regular Customer vs Partners) */}
            {!isPartnerType ? (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-[#27272A]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black bg-orange-500/15 text-orange-400">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                          بروفايل الإحالة للعميل العادي
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black border bg-orange-500/15 text-orange-400 border-orange-500/30">
                          ● 1.0% ثابتة مدى الحياة
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        عمولة الإحالة للعميل العادي معتمدة بنسبة 1.0% دائمة ولا تتغير بعد أول شهر أو انقضاء أي مدة.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-center">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200/60 dark:border-zinc-800/80 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block">نسبة عمولة الإحالة المعتمدة</span>
                    <strong className="text-xs font-black font-mono text-orange-400 block">
                      1.0%
                    </strong>
                    <span className="text-[9px] text-zinc-500 block">ثابتة مدى الحياة</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200/60 dark:border-zinc-800/80 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block">حالة وسريان النسبة</span>
                    <strong className="text-xs font-black font-mono text-emerald-400 block">
                      دائم ومستمر
                    </strong>
                    <span className="text-[9px] text-zinc-500 block">بدون تاريخ انتهاء أو تغير بعد أول شهر</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-[#27272A]">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                      referralProfileSummary.status === 'active' ? 'bg-purple-500/15 text-purple-400' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                          بروفايل الإحالة والكاش باك المرتفع
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          referralProfileSummary.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}>
                          {referralProfileSummary.status === 'active' ? '● نشط (Active)' : '○ منتهي (Expired)'}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {referralProfileSummary.status === 'active'
                          ? `ساري حاليًا بنسبة عمولة مرتفعة ${referralProfileSummary.highRate}%`
                          : `انتهت المدة — تطبق النسبة العادية ${referralProfileSummary.normalRate}% تلقائيًا`}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenReferralProfile}
                    className="text-xs border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1" />
                    {currentCust.hasReferralProfile ? 'تعديل بروفايل الإحالة ⚙️' : '+ إضافة بروفايل إحالة'}
                  </Button>
                </div>

                {/* 4 KPI Grid for Referral Profile */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200/60 dark:border-zinc-800/80 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block">مدة الكاش باك المرتفع</span>
                    <strong className="text-xs font-black font-mono text-purple-400 block">
                      {referralProfileSummary.totalDays} يوم
                    </strong>
                    <span className="text-[9px] text-zinc-500 block">قابلة للتعديل يدويًا</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200/60 dark:border-zinc-800/80 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block">المدة المتبقية (Countdown)</span>
                    <strong className={`text-xs font-black font-mono block ${
                      referralProfileSummary.daysRemaining > 5 ? 'text-emerald-400' : referralProfileSummary.daysRemaining > 0 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {referralProfileSummary.daysRemaining > 0 ? `${referralProfileSummary.daysRemaining} يوم متبقٍ` : 'منتهية ⌛'}
                    </strong>
                    <span className="text-[9px] text-zinc-500 block">
                      {referralProfileSummary.endDate ? `حتى ${formatDate(referralProfileSummary.endDate)}` : 'غير محدد'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200/60 dark:border-zinc-800/80 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block">نسبة الكاش باك المرتفع</span>
                    <strong className="text-xs font-black font-mono text-emerald-400 block">
                      {referralProfileSummary.highRate}%
                    </strong>
                    <span className="text-[9px] text-zinc-500 block">خلال الـ {referralProfileSummary.totalDays} يوم</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200/60 dark:border-zinc-800/80 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block">النسبة بعد انتهاء المدة</span>
                    <strong className="text-xs font-black font-mono text-cyan-400 block">
                      {referralProfileSummary.normalRate}%
                    </strong>
                    <span className="text-[9px] text-zinc-500 block">تحول تلقائي</span>
                  </div>
                </div>
              </div>
            )}

            {/* Partnership Performance KPI Cards (For Partners, Shops, Influencers) */}
            {isPartnerType && (
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-orange-500" />
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      لوحة قياس أداء الشراكة وشرط الاستمرار الشهري
                    </h4>
                  </div>

                  <Badge
                    variant={
                      partnerSummary.status === 'active'
                        ? 'success'
                        : partnerSummary.status === 'first_warning'
                        ? 'warning'
                        : 'danger'
                    }
                    size="md"
                  >
                    {partnerSummary.statusText}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-gray-100 dark:border-[#27272A] space-y-1">
                    <span className="text-zinc-400 block text-[10px]">العملاء المرتبطون حالياً</span>
                    <strong className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      {partnerSummary.totalLinkedReferees} عميل
                    </strong>
                    <span className="text-[10px] text-zinc-500 block">إجمالي الشبكة النشطة</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-gray-100 dark:border-[#27272A] space-y-1">
                    <span className="text-zinc-400 block text-[10px]">المحالون الجدد لهذا الشهر</span>
                    <div className="flex items-baseline gap-1 font-mono">
                      <strong className="text-base font-bold text-purple-400">
                        {partnerSummary.monthlyNewReferredCount}
                      </strong>
                      <span className="text-zinc-400">/ {partnerSummary.monthlyTarget}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block">الهدف الأدنى للاستمرار</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-gray-100 dark:border-[#27272A] space-y-1">
                    <span className="text-zinc-400 block text-[10px]">نسبة الإنجاز الشهري</span>
                    <strong className={`text-base font-bold font-mono ${
                      partnerSummary.achievementPercentage >= 100
                        ? 'text-emerald-500'
                        : partnerSummary.achievementPercentage >= 50
                        ? 'text-amber-500'
                        : 'text-rose-500'
                    }`}>
                      {partnerSummary.achievementPercentage}%
                    </strong>
                    <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          partnerSummary.achievementPercentage >= 100
                            ? 'bg-emerald-500'
                            : partnerSummary.achievementPercentage >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, partnerSummary.achievementPercentage)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-gray-100 dark:border-[#27272A] space-y-1">
                    <span className="text-zinc-400 block text-[10px]">الأيام المتبقية في الشهر</span>
                    <strong className="text-base font-bold text-orange-500 font-mono">
                      {partnerSummary.daysRemainingInMonth} يوم
                    </strong>
                    <span className="text-[10px] text-zinc-500 block">حتى موعد التقييم الآلي</span>
                  </div>
                </div>

                {/* Commission Rates Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-[#27272A] text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <div>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 block">عمولة أول 30 يوماً</span>
                        <span className="text-[10px] text-zinc-400">تطبق من تاريخ إنشاء بروفايل العميل</span>
                      </div>
                    </div>
                    <strong className="font-mono text-emerald-500 text-sm font-black">
                      {partnerSummary.firstMonthRate}%
                    </strong>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <div>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 block">عمولة مدى الحياة</span>
                        <span className="text-[10px] text-zinc-400">تطبق تلقائياً بعد مرور أول شهر</span>
                      </div>
                    </div>
                    <strong className="font-mono text-purple-500 text-sm font-black">
                      {partnerSummary.lifetimeRate}%
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* 🌟 1. Master Top Referral Statistics Quick Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span className="font-bold text-[11px]">إجمالي العملاء المُحالين</span>
                  <Users className="w-4 h-4 text-orange-500" />
                </div>
                <strong className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-mono block">
                  {referralTabKPIs.totalRefereesCount} عميل
                </strong>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500">
                  <span className="text-emerald-500 font-mono">🌱 {referralTabKPIs.totalNewCount} جدد</span>
                  <span>•</span>
                  <span className="text-purple-400 font-mono">♾️ {referralTabKPIs.totalLifetimeCount} قدامى</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span className="font-bold text-[11px]">إجمالي عمولات أول شهر</span>
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>
                <strong className="text-xl font-black text-emerald-500 font-mono block">
                  +{formatCurrency(referralTabKPIs.totalFirstMonthCommission)}
                </strong>
                <span className="text-[10px] text-zinc-400 block">خلال أول 30 يوماً من تسجيل العميل</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span className="font-bold text-[11px]">إجمالي عمولات مدى الحياة</span>
                  <Clock className="w-4 h-4 text-purple-400" />
                </div>
                <strong className="text-xl font-black text-purple-400 font-mono block">
                  +{formatCurrency(referralTabKPIs.totalLifetimeCommission)}
                </strong>
                <span className="text-[10px] text-zinc-400 block">بعد انقضاء اليوم الثلاثين</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span className="font-bold text-[11px]">رصيد عمولات الإحالة الحالي</span>
                  <Wallet className="w-4 h-4 text-amber-500" />
                </div>
                <strong className="text-xl font-black text-amber-500 font-mono block">
                  {formatCurrency(referralTabKPIs.currentReferralBalance)}
                </strong>
                <span className="text-[10px] text-zinc-400 block">متاح للاستخدام الفوري أو السحب</span>
              </div>
            </div>

            {/* Extended Stats Banner */}
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-zinc-400">📊 متوسط العمولة:</span>
                  <span className="text-emerald-500 font-mono font-bold">
                    {formatCurrency(referralTabKPIs.avgCommissionPerReferee)} / عميل
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-zinc-400">💳 إجمالي مبيعات الإحالات:</span>
                  <span className="text-blue-500 font-mono font-bold">
                    {formatCurrency(referralTabKPIs.totalSalesVolume)}
                  </span>
                </div>
              </div>

              {referralTabKPIs.topReferee && (
                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                  <span className="text-amber-400">⭐ أفضل عميل مُحال:</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{referralTabKPIs.topReferee.customer.name}</span>
                  <span className="text-emerald-500 font-mono font-black">(+{formatCurrency(referralTabKPIs.topReferee.totalCommission)})</span>
                </div>
              )}
            </div>

            {/* 🔍 2. Search & Filters Bar */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={refereeSearch}
                    onChange={e => setRefereeSearch(e.target.value)}
                    placeholder="بحث في الإحالات بالاسم أو رقم الهاتف..."
                    className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] pr-9 pl-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs outline-none focus:border-orange-500"
                  />
                  {refereeSearch && (
                    <button
                      type="button"
                      onClick={() => setRefereeSearch('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Sort dropdown */}
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                  <select
                    value={refereeSortBy}
                    onChange={e => setRefereeSortBy(e.target.value as any)}
                    className="rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs outline-none focus:border-orange-500 font-semibold cursor-pointer"
                  >
                    <option value="highestCommission">الأعلى عمولة أولاً (الافتراضي 💰)</option>
                    <option value="highestSpending">الأعلى شحناً وإنفاقاً 💳</option>
                    <option value="mostTickets">الأكثر تذاكر وطلبات 🎫</option>
                    <option value="leastDaysRemaining">الأقرب لانتهاء أول شهر ⏳</option>
                    <option value="newestRegistration">الأحدث تسجيلاً 🗓️</option>
                  </select>
                </div>

                {/* Filter status dropdown */}
                <select
                  value={refereeStatusFilter}
                  onChange={e => setRefereeStatusFilter(e.target.value as any)}
                  className="rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="all">كافة الحالات</option>
                  <option value="with_orders">لديهم طلبات شحن (نشطون 🟢)</option>
                  <option value="no_orders">لم يقوموا بالشحن بعد (جدد ⚪)</option>
                </select>
              </div>
            </div>

            {/* 🟢 3. القسم الأول: العملاء الجدد (أقل من 30 يوم) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-gray-200 dark:border-[#27272A]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>القسم الأول: العملاء الجدد</span>
                    <span className="text-emerald-500 font-mono text-xs">(أقل من 30 يوم)</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {filteredNewReferees.length} عميل
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 hidden sm:inline-block">
                  تطبق عليهم عمولة الشهر الأول ({partnerSummary.firstMonthRate}%)
                </span>
              </div>

              {filteredNewReferees.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-[#18181B] border border-dashed border-gray-200 dark:border-[#27272A] text-center space-y-2">
                  <Sparkles className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
                  <p className="text-zinc-500 dark:text-zinc-400 font-bold text-xs">
                    لا يوجد عملاء جدد داخل فترة أول 30 يوماً حالياً
                  </p>
                  <span className="text-[11px] text-zinc-400 block">
                    عند تسجيل أي عميل جديد باستخدام كود الإحالة، سيظهر هنا مباشرة مع العداد التنازلي التفاعلي.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredNewReferees.map(r => (
                    <div
                      key={r.customer.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-emerald-500/25 dark:border-emerald-500/20 hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all space-y-3.5 relative overflow-hidden group"
                    >
                      {/* Top glowing bar */}
                      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>

                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-black text-sm shadow-xs">
                            {r.customer.name ? r.customer.name[0] : 'U'}
                          </div>
                          <div>
                            <h5 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors">
                              {r.customer.name}
                            </h5>
                            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-mono">
                              <span>{r.customer.phone}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(r.customer.phone, r.customer.id)}
                                className="text-zinc-400 hover:text-emerald-500 transition-colors"
                                title="نسخ رقم الهاتف"
                              >
                                {copiedRefId === r.customer.id ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                          {formatDate(r.regDateStr)}
                        </span>
                      </div>

                      {/* ⏳ Dynamic Real Countdown & Visual Progress Bar */}
                      <div className="p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-500" />
                            <span>
                              {r.daysLeft === 0
                                ? 'اليوم الأخير لعمولة الكاش باك المرتفع 🔥'
                                : `تبقى : ${r.daysLeft} يوم (اليوم ${Math.min(r.promoDays, r.diffDays)} من ${r.promoDays})`}
                            </span>
                          </span>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-[10px]">
                            عمولة {partnerSummary.firstMonthRate}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              r.daysLeft <= 5
                                ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, r.progressPercent))}%` }}
                          />
                        </div>
                      </div>

                      {/* 3-Column Metrics Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-gray-100 dark:border-[#27272A]">
                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417] space-y-0.5">
                          <span className="text-[10px] text-zinc-400 block">العمولة المكتسبة</span>
                          <strong className="text-xs font-black text-emerald-500 font-mono block">
                            +{formatCurrency(r.totalCommission)}
                          </strong>
                        </div>
                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417] space-y-0.5">
                          <span className="text-[10px] text-zinc-400 block">عدد التذاكر</span>
                          <strong className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono block">
                            {r.ticketsCount} تذكرة
                          </strong>
                        </div>
                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417] space-y-0.5">
                          <span className="text-[10px] text-zinc-400 block">إجمالي الشحن</span>
                          <strong className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono block">
                            {formatCurrency(r.totalSpent)}
                          </strong>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenRefereeProfile(r.customer)}
                          icon={<ExternalLink className="w-3.5 h-3.5" />}
                          className="flex-1 font-bold text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white border-emerald-500/20"
                        >
                          فتح الملف
                        </Button>

                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => setRefereeToUnlink(r.customer)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="فك ارتباط العميل"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🟣 4. القسم الثاني: العملاء القدامى (أكثر من 30 يوم) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-gray-200 dark:border-[#27272A]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>القسم الثاني: العملاء القدامى</span>
                    <span className="text-purple-400 font-mono text-xs">(أكثر من 30 يوم)</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    {filteredLifetimeReferees.length} عميل
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 hidden sm:inline-block">
                  تطبق عليهم عمولة مدى الحياة الدائمة ({partnerSummary.lifetimeRate}%)
                </span>
              </div>

              {filteredLifetimeReferees.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-[#18181B] border border-dashed border-gray-200 dark:border-[#27272A] text-center space-y-2">
                  <Clock className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
                  <p className="text-zinc-500 dark:text-zinc-400 font-bold text-xs">
                    لا يوجد عملاء أتموا فترة أول شهر حتى الآن
                  </p>
                  <span className="text-[11px] text-zinc-400 block">
                    بمجرد انتهاء اليوم الثلاثين لأي عميل جديد، سينتقل آلياً وبدون أي تدخل يدوي إلى هذه القائمة.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredLifetimeReferees.map(r => (
                    <div
                      key={r.customer.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-purple-500/25 dark:border-purple-500/20 hover:border-purple-500/50 shadow-xs hover:shadow-md transition-all space-y-3.5 relative overflow-hidden group"
                    >
                      {/* Top glowing bar */}
                      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-400 to-purple-600"></div>

                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black text-sm shadow-xs">
                            {r.customer.name ? r.customer.name[0] : 'U'}
                          </div>
                          <div>
                            <h5 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-purple-400 transition-colors">
                              {r.customer.name}
                            </h5>
                            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-mono">
                              <span>{r.customer.phone}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(r.customer.phone, r.customer.id)}
                                className="text-zinc-400 hover:text-purple-400 transition-colors"
                                title="نسخ رقم الهاتف"
                              >
                                {copiedRefId === r.customer.id ? (
                                  <Check className="w-3 h-3 text-purple-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">
                          بدء الإحالة: {formatDate(r.regDateStr)}
                        </span>
                      </div>

                      {/* Lifetime Commission Tag */}
                      <div className="p-2.5 rounded-xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-purple-500" />
                          <span>عمولة مدى الحياة الدائمة</span>
                        </span>
                        <span className="font-mono font-black text-purple-400 text-xs">
                          {partnerSummary.lifetimeRate}%
                        </span>
                      </div>

                      {/* 3-Column Metrics Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-gray-100 dark:border-[#27272A]">
                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417] space-y-0.5">
                          <span className="text-[10px] text-zinc-400 block">إجمالي العمولة</span>
                          <strong className="text-xs font-black text-purple-400 font-mono block">
                            +{formatCurrency(r.totalCommission)}
                          </strong>
                        </div>
                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417] space-y-0.5">
                          <span className="text-[10px] text-zinc-400 block">عدد التذاكر</span>
                          <strong className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono block">
                            {r.ticketsCount} تذكرة
                          </strong>
                        </div>
                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417] space-y-0.5">
                          <span className="text-[10px] text-zinc-400 block">إجمالي المدفوع</span>
                          <strong className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono block">
                            {formatCurrency(r.totalSpent)}
                          </strong>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenRefereeProfile(r.customer)}
                          icon={<ExternalLink className="w-3.5 h-3.5" />}
                          className="flex-1 font-bold text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white border-purple-500/20"
                        >
                          فتح الملف
                        </Button>

                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => setRefereeToUnlink(r.customer)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="فك ارتباط العميل"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
          )}
          </div>
        )}

        {/* Tab 5: Notes & Compensation History */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <form onSubmit={handleAddNote} className="space-y-2">
              <Input
                label="إضافة ملاحظة إدارية جديدة في البروفايل"
                placeholder="اكتب ملاحظة تخص العميل أو مواعيد الدفع أو طلبات خاصة..."
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
              />
              <div className="flex justify-end">
                <Button type="submit" variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                  حفظ الملاحظة
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="py-6 text-center text-zinc-400 text-xs">لا توجد ملاحظات مسجلة على هذا البروفايل</p>
              ) : (
                notes.map(n => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <p className="text-zinc-800 dark:text-zinc-200 font-bold">{n.content}</p>
                      <span className="text-[10px] text-zinc-400 block font-mono">
                        كتبها: {n.authorName} ({n.authorRole}) • {formatDateTime(n.createdAt)}
                      </span>
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(n.id)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="حذف الملاحظة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Balance Withdrawals */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            {/* Quick Balances & Action Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Card className="p-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block">إجمالي المسحوبات</span>
                  <span className="text-base font-black font-mono text-rose-500">
                    {formatCurrency(
                      customerWithdrawals
                        .filter(w => w.status !== 'cancelled')
                        .reduce((sum, w) => sum + w.totalAmount, 0)
                    )}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                  <Receipt className="w-5 h-5" />
                </div>
              </Card>

              <Card className="p-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block">المحفظة الأساسية</span>
                  <span className="text-base font-black font-mono text-cyan-500">
                    {formatCurrency(currentCust.balance || 0)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                  <Wallet className="w-5 h-5" />
                </div>
              </Card>

              <Card className="p-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block">محفظة الإحالة</span>
                  <span className="text-base font-black font-mono text-amber-500">
                    {formatCurrency(currentCust.referralBalance || 0)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Share2 className="w-5 h-5" />
                </div>
              </Card>

              <Card className="p-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block">محفظة الكاش باك</span>
                  <span className="text-base font-black font-mono text-emerald-500">
                    {formatCurrency(currentCust.cashbackBalance || 0)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Zap className="w-5 h-5" />
                </div>
              </Card>
            </div>

            {/* Action Header */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  <span>سجل سحوبات أرصدة العميل المكتملة والفواتير</span>
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  سحب الرصيد الفائض من المحفظة الأساسية، الإحالة، أو الكاش باك مع إنشاء فاتورة رسمية فورية
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                onClick={() => setIsWithdrawalModalOpen(true)}
              >
                + سحب رصيد للعميل
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                    <th className="p-3">رقم العملية</th>
                    <th className="p-3">التاريخ والوقت</th>
                    <th className="p-3">المحافظ المسحوبة</th>
                    <th className="p-3">إجمالي المسحوب</th>
                    <th className="p-3">الرقم المستلم</th>
                    <th className="p-3">الموظف المنفذ</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">الفاتورة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#27272A]">
                  {customerWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-zinc-400">
                        <Receipt className="w-8 h-8 mx-auto mb-2 text-zinc-500 opacity-40" />
                        <p className="font-bold text-xs">لا توجد عمليات سحب مسجلة لهذا العميل حتى الآن</p>
                        <p className="text-[11px] text-zinc-500 mt-1">اضغط على زر "سحب رصيد للعميل" لإنشاء طلب سحب جديد وفاتورة فورية</p>
                      </td>
                    </tr>
                  ) : (
                    customerWithdrawals.map(w => (
                      <tr key={w.id} className="hover:bg-gray-50/50 dark:hover:bg-[#18181B]/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-500">#{w.id}</td>
                        <td className="p-3 font-mono text-zinc-400 text-[11px]">{formatDateTime(w.createdAt)}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {w.items.map((item, idx) => (
                              <Badge
                                key={idx}
                                variant={
                                  item.walletType === 'main'
                                    ? 'info'
                                    : item.walletType === 'referral'
                                    ? 'warning'
                                    : 'success'
                                }
                                size="sm"
                              >
                                {item.walletLabel || item.walletName}: {formatCurrency(item.amount)}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-rose-500">{formatCurrency(w.totalAmount)}</td>
                        <td className="p-3 font-mono text-zinc-300">{w.recipientPhone || currentCust.phone}</td>
                        <td className="p-3 text-zinc-400 text-[11px]">{w.employeeName || w.recordedBy || '—'}</td>
                        <td className="p-3">
                          {w.status === 'cancelled' ? (
                            <Badge variant="danger" size="sm">ملغي</Badge>
                          ) : (
                            <Badge variant="success" size="sm">مكتمل</Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedWithdrawalForInvoice(w)}
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all cursor-pointer"
                            title="طباعة / استعراض الفاتورة"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 8: Competitions & Rewards (Task 24) */}
        {activeTab === 'competitions' && (() => {
          const custParticipations = db.getCompetitionParticipants().filter(p => p.entityId === currentCust.id);
          const custRewards = db.getCompetitionRewards().filter(r => r.entityId === currentCust.id);
          const wonCount = custParticipations.filter(p => p.isWinner).length;
          const pendingRewards = custRewards.filter(r => r.status === 'pending');
          const deliveredRewards = custRewards.filter(r => r.status === 'delivered');
          const totalRewardsVal = custRewards.reduce((s, r) => s + (r.prizeValue || 0), 0);
          const totalMarketingExpense = deliveredRewards.reduce((s, r) => s + (r.costEGP || 0), 0);

          return (
            <div className="space-y-4 animate-fade-in text-xs">
              {/* Stats Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
                  <span className="text-[10px] text-zinc-400 block font-bold">المسابقات المشارك بها</span>
                  <strong className="text-base font-black text-zinc-900 dark:text-zinc-100 mt-1 block">
                    {custParticipations.length}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] text-amber-500 block font-bold">المسابقات الفائز بها</span>
                  <strong className="text-base font-black text-amber-500 mt-1 block">
                    {wonCount} 🏆
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] text-amber-500 block font-bold">جوائز قيد التسليم</span>
                  <strong className="text-base font-black text-amber-500 mt-1 block">
                    {pendingRewards.length}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-500 block font-bold">جوائز تم تسليمها</span>
                  <strong className="text-base font-black text-emerald-500 mt-1 block">
                    {deliveredRewards.length}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <span className="text-[10px] text-orange-500 block font-bold">إجمالي قيمة الجوائز</span>
                  <strong className="text-base font-black text-orange-500 mt-1 block">
                    {totalRewardsVal}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] text-rose-500 block font-bold">التكلفة التسويقية</span>
                  <strong className="text-base font-black text-rose-500 mt-1 block">
                    {formatCurrency(totalMarketingExpense)}
                  </strong>
                </div>
              </div>

              {/* Rewards List */}
              <div className="rounded-xl border border-gray-200 dark:border-[#27272A] bg-white dark:bg-[#18181B] overflow-hidden">
                <div className="p-3 bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-[#27272A] font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                  <span>سجل الجوائز والمكافآت الخاصة بالعميل ({custRewards.length})</span>
                  <Gift className="w-4 h-4 text-orange-500" />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-gray-50 dark:bg-zinc-900/50 text-zinc-500 border-b border-gray-200 dark:border-[#27272A]">
                      <tr>
                        <th className="p-3">الجائزة</th>
                        <th className="p-3">المسابقة</th>
                        <th className="p-3 text-center">القيمة</th>
                        <th className="p-3 text-center">المحفظة المصدر</th>
                        <th className="p-3 text-center">التكلفة التسويقية</th>
                        <th className="p-3 text-center">الحالة</th>
                        <th className="p-3 text-center">تاريخ التسليم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-[#27272A]">
                      {custRewards.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-zinc-400">
                            لا توجد جوائز مسجلة لهذا العميل حتى الآن
                          </td>
                        </tr>
                      ) : (
                        custRewards.map(r => (
                          <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-[#18181B]/50">
                            <td className="p-3">
                              <div className="font-bold text-orange-500">{r.prizeName}</div>
                              <span className="text-[10px] text-zinc-400">{r.prizeType}</span>
                            </td>
                            <td className="p-3 text-zinc-700 dark:text-zinc-300">
                              {r.competitionTitle}
                            </td>
                            <td className="p-3 text-center font-bold text-zinc-800 dark:text-zinc-200">
                              {r.prizeValue} {r.currency}
                            </td>
                            <td className="p-3 text-center text-zinc-500">
                              {r.sourceWalletName || 'محفظة النظام'}
                            </td>
                            <td className="p-3 text-center font-bold text-rose-500">
                              {formatCurrency(r.costEGP)}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant={r.status === 'delivered' ? 'success' : r.status === 'pending' ? 'warning' : 'danger'}>
                                {r.status === 'delivered' ? 'تم التسليم' : r.status === 'pending' ? 'مستحقة (Pending)' : 'ملغاة'}
                              </Badge>
                            </td>
                            <td className="p-3 text-center text-zinc-400 text-[11px] font-mono">
                              {r.deliveredAt ? formatDateTime(r.deliveredAt) : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إغلاق الداشبورد
          </Button>
        </div>
      </div>

      {/* Compensation Coupon Creator Modal */}
      {isCompCouponModalOpen && (
        <Modal
          isOpen={isCompCouponModalOpen}
          onClose={() => setIsCompCouponModalOpen(false)}
          title={`إنشاء كوبون تعويض خاص — ${currentCust.name}`}
          subtitle="كوبون حصري لا يمكن لأي عميل آخر استخدامه"
          maxWidth="md"
        >
          <form onSubmit={handleCreateCompCoupon} className="space-y-4 text-right text-xs">
            <Input
              label="قيمة الخصم / التعويض (جنيه) *"
              type="number"
              value={compAmount}
              onChange={e => setCompAmount(parseFloat(e.target.value) || 0)}
              autoFocus
            />

            <div>
              <label className="block font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                ربط وتخصيص الكوبون بلعبة محددة (اختياري)
              </label>
              <select
                value={compGameId}
                onChange={e => setCompGameId(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none font-bold text-xs"
              >
                <option value="all">🌐 متاح لجميع الألعاب والخدمات (عام - غير مقيد)</option>
                {games.map(g => (
                  <option key={g.id} value={g.id}>
                    🎮 {g.name}
                  </option>
                ))}
              </select>
              {compGameId !== 'all' && (
                <p className="text-[11px] text-purple-400 font-bold mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    سيكون هذا الكوبون محصوراً ومشفراً حصرياً للعبة [{games.find(g => g.id === compGameId)?.name}] فقط ولا يقبل غيرها.
                  </span>
                </p>
              )}
            </div>

            <Input
              label="سبب التعويض أو منح الخصم *"
              value={compReason}
              onChange={e => setCompReason(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setIsCompCouponModalOpen(false)}>إلغاء</Button>
              <Button type="submit" variant="primary">توليد الكوبون وحفظه</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Freeze Account Confirmation Modal */}
      {showFreezeModal && (
        <Modal
          isOpen={showFreezeModal}
          onClose={() => setShowFreezeModal(false)}
          title="تجميد حساب العميل"
          subtitle="تجميد الحساب يمنع العميل من استخدام كود الإحالة وسحب العمولات"
          maxWidth="sm"
        >
          <div className="space-y-4 text-right text-xs">
            <Input
              label="سبب التجميد *"
              placeholder="مثال: اشتباه في استخدام وهمي لكود الإحالة"
              value={freezeReason}
              onChange={e => setFreezeReason(e.target.value)}
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setShowFreezeModal(false)}>إلغاء</Button>
              <Button type="button" variant="danger" onClick={handleToggleFreeze}>تأكيد التجميد</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable Invoice Modal */}
      {printingTicket && (
        <PrintInvoiceModal
          isOpen={!!printingTicket}
          onClose={() => setPrintingTicket(null)}
          ticket={printingTicket}
        />
      )}

      {/* 🖨️ Professional Customer Statement Report Modal */}
      {isStatementReportOpen && (
        <ReportGeneratorModal
          isOpen={isStatementReportOpen}
          onClose={() => setIsStatementReportOpen(false)}
          defaultTemplateType="customer_statement"
          customPayload={currentCust}
        />
      )}

      {/* ⚙️ Partner Rates & Monthly Target Settings Modal (Owner Only) */}
      {isRatesModalOpen && (
        <Modal
          isOpen={isRatesModalOpen}
          onClose={() => setIsRatesModalOpen(false)}
          title={`إعدادات نسب العمولات وشروط الشراكة — ${currentCust.name}`}
          subtitle="تعديل نسب العمولات وشرط الاستمرار الشهري للشريك"
          maxWidth="md"
        >
          <form onSubmit={handleSavePartnerSettings} className="space-y-4 text-right text-xs">
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-zinc-700 dark:text-zinc-300">
              💡 <strong>ملاحظة هامة:</strong> التعديلات الجديدة تسري على التذاكر والعمولات المستقبلية فقط ولا تؤثر على الأرباح المحتسبة سابقاً.
            </div>

            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                نسبة عمولة الشهر الأول (أول 30 يوماً من تسجيل العميل) % *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={editFirstMonthRate}
                onChange={e => setEditFirstMonthRate(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/30 p-2.5 text-zinc-900 dark:text-zinc-100 font-mono font-bold outline-none focus:border-orange-500"
                required
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">تطبق طوال أول 30 يوماً من تاريخ إنشاء بروفايل العميل المُحال</span>
            </div>

            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                نسبة عمولة مدى الحياة (بعد أول 30 يوماً) % *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={editLifetimeRate}
                onChange={e => setEditLifetimeRate(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/30 p-2.5 text-zinc-900 dark:text-zinc-100 font-mono font-bold outline-none focus:border-orange-500"
                required
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">تطبق تلقائياً على كافة التذاكر المستقبلية بعد انقضاء أول شهر</span>
            </div>

            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                شرط الاستمرار الشهري (الحد الأدنى للعملاء الجدد شهرياً) *
              </label>
              <input
                type="number"
                min="1"
                value={editMonthlyTarget}
                onChange={e => setEditMonthlyTarget(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/30 p-2.5 text-zinc-900 dark:text-zinc-100 font-mono font-bold outline-none focus:border-orange-500"
                required
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">عدد العملاء الجدد المطلوب تسجيلهم شهرياً للحفاظ على الشراكة</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setIsRatesModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary">
                حفظ الإعدادات
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 🚀 Referral Profile & High Cashback Duration Modal */}
      {isReferralProfileModalOpen && (
        <Modal
          isOpen={isReferralProfileModalOpen}
          onClose={() => setIsReferralProfileModalOpen(false)}
          title={`بروفايل الإحالة ومدة الكاش باك المرتفع — ${currentCust.name}`}
          subtitle="إنشاء وربط بروفايل إحالة وتحديد مدة الكاش باك المرتفع والنسب المطبقة"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveReferralProfile} className="space-y-4 text-right text-xs">
            {/* Live Status & Countdown Banner */}
            <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              refProfileStatus === 'active'
                ? 'bg-purple-500/10 border-purple-500/25 text-purple-300'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                  refProfileStatus === 'active' ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-700 text-zinc-400'
                }`}>
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">حالة بروفايل الإحالة:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      refProfileStatus === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {refProfileStatus === 'active' ? '● نشط (Active)' : '○ منتهي (Expired)'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    كود الإحالة: <strong className="font-mono text-purple-400 font-bold">{currentCust.referralCode || 'REF-AUTO'}</strong>
                  </span>
                </div>
              </div>

              {/* Countdown Preview */}
              <div className="text-left font-mono">
                <span className="text-[10px] text-zinc-400 block">الأيام المتبقية الحالية:</span>
                <span className={`text-base font-black ${
                  referralProfileSummary.daysRemaining > 5 ? 'text-emerald-400' : referralProfileSummary.daysRemaining > 0 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {referralProfileSummary.daysRemaining > 0 ? `${referralProfileSummary.daysRemaining} يوم` : 'منقضية'}
                </span>
              </div>
            </div>

            {/* High Cashback Duration Presets & Custom Input */}
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 space-y-3">
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                مدة الكاش باك المرتفع (High Cashback Duration):
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[15, 30, 45, 60, 90].map(days => {
                  const isSelected = refHighCashbackDays === days && !refCustomDaysInput;
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => handleSelectDaysPreset(days)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/30 scale-102'
                          : 'bg-white dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700 hover:border-purple-500/50'
                      }`}
                    >
                      {days} يوم
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    if (!refCustomDaysInput) setRefCustomDaysInput('20');
                  }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                    Boolean(refCustomDaysInput)
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/30 scale-102'
                      : 'bg-white dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700 hover:border-purple-500/50'
                  }`}
                >
                  مخصص ✍️
                </button>
              </div>

              {/* Custom Number Input */}
              <div className="pt-2">
                <label className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                  أو كتابة عدد الأيام يدويًا:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="مثال: 20، 50، 120 يوم..."
                    value={refCustomDaysInput}
                    onChange={e => handleCustomDaysChange(e.target.value)}
                    className="w-40 rounded-xl bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 p-2 text-zinc-900 dark:text-zinc-100 font-mono font-bold outline-none focus:border-purple-500 text-xs"
                  />
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs">يوم كاش باك مرتفع</span>
                  {refCustomDaysInput && (
                    <span className="text-[10px] text-emerald-500 font-bold mr-2">
                      ✓ محدد يدويًا: {refCustomDaysInput} يوم
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dates: Start Date & End Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800">
              <div>
                <label className="block font-bold text-zinc-900 dark:text-zinc-200 mb-1">
                  تاريخ البداية (Start Date) *
                </label>
                <input
                  type="date"
                  value={refStartDate}
                  onChange={e => handleStartDateChange(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 p-2 text-zinc-900 dark:text-zinc-100 font-mono font-bold outline-none focus:border-purple-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-900 dark:text-zinc-200 mb-1">
                  تاريخ الانتهاء (End Date) *
                </label>
                <input
                  type="date"
                  value={refEndDate}
                  onChange={e => setRefEndDate(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 p-2 text-zinc-900 dark:text-zinc-100 font-mono font-bold outline-none focus:border-purple-500 text-xs"
                  required
                />
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                  محسوب تلقائيًا بناءً على عدد الأيام ({Number(refCustomDaysInput) > 0 ? refCustomDaysInput : refHighCashbackDays} يوم)
                </span>
              </div>
            </div>

            {/* Rates Configuration: High vs Normal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800">
              <div>
                <label className="block font-bold text-zinc-900 dark:text-zinc-200 mb-1">
                  نسبة الكاش باك / العمولة المرتفعة (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={refHighCashbackRate}
                  onChange={e => setRefHighCashbackRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl bg-white dark:bg-zinc-800 border border-purple-500/30 p-2 text-purple-600 dark:text-purple-300 font-mono font-bold outline-none focus:border-purple-500 text-xs"
                  required
                />
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">تطبق طوال مدة الـ {Number(refCustomDaysInput) > 0 ? refCustomDaysInput : refHighCashbackDays} يوم المحددة</span>
              </div>

              <div>
                <label className="block font-bold text-zinc-900 dark:text-zinc-200 mb-1">
                  نسبة الإحالة العادية بعد الانتهاء (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={refNormalCashbackRate}
                  onChange={e => setRefNormalCashbackRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 p-2 text-zinc-900 dark:text-zinc-100 font-mono font-bold outline-none focus:border-purple-500 text-xs"
                  required
                />
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">يتحول النظام إليها تلقائيًا بعد انقضاء المدة المحددة</span>
              </div>
            </div>

            {/* Profile Status Switcher */}
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-200 block text-xs">تفعيل / تعطيل البروفايل يدويًا:</span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">يمكنك إنهاء المدة يدويًا الآن للانتقال الفوري للنسبة العادية</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 p-1 rounded-xl border border-gray-300 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setRefProfileStatus('active')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    refProfileStatus === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  نشط
                </button>
                <button
                  type="button"
                  onClick={() => setRefProfileStatus('expired')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    refProfileStatus === 'expired' ? 'bg-rose-600 text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  منتهي
                </button>
              </div>
            </div>

            {/* Automated Transition Notice */}
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] leading-relaxed">
              ⚡ <strong>الانتقال التلقائي:</strong> عند انتهاء مدة الـ ({Number(refCustomDaysInput) > 0 ? refCustomDaysInput : refHighCashbackDays} يوم)، يتحول احتساب الإحالة تلقائيًا إلى نسبة الإحالة العادية ({refNormalCashbackRate}%) دون أي تدخل يدوي.
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={() => setIsReferralProfileModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-white">
                <Check className="w-4 h-4 mr-1.5" />
                حفظ وتفعيل بروفايل الإحالة
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manager Cashback Rate Customization Modal */}
      {isCashbackRateModalOpen && (
        <Modal
          isOpen={isCashbackRateModalOpen}
          onClose={() => setIsCashbackRateModalOpen(false)}
          title={`تخصيص نسبة الكاش باك: ${currentCust.name}`}
          subtitle="تعديل نسبة الكاش باك الخاصة بالعميل (الافتراضي العام: 1.0%)"
          maxWidth="md"
        >
          <form onSubmit={handleUpdateCashbackRate} className="space-y-4 text-right text-xs">
            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                نسبة الكاش باك (%) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={editCashbackRate}
                onChange={e => setEditCashbackRate(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-emerald-500/40 p-2.5 text-zinc-900 dark:text-zinc-100 font-mono font-bold text-base outline-none focus:border-emerald-500"
                required
              />
              <span className="text-[10px] text-zinc-400 mt-1 block">
                تطبق هذه النسبة تلقائياً على كافة التذاكر المستقبلية لهذا العميل دون المساس بالعمليات التاريخية القديمة.
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-zinc-500">خيارات سريعة:</span>
              {[0.5, 1.0, 1.5, 2.0, 3.0, 5.0].map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setEditCashbackRate(rate)}
                  className={`px-2.5 py-1 rounded-lg font-bold font-mono text-xs cursor-pointer transition-all ${
                    editCashbackRate === rate
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-500'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setIsCashbackRateModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-700">
                حفظ النسبة
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Unlink Referee Confirmation Modal (Owner Only) */}
      {refereeToUnlink && (
        <Modal
          isOpen={!!refereeToUnlink}
          onClose={() => {
            setRefereeToUnlink(null);
            setUnlinkReason('');
          }}
          title={`تأكيد فك ارتباط إحالة — ${refereeToUnlink.name}`}
          subtitle={`إلغاء ربط العميل من كود إحالة (${currentCust.name} - ${currentCust.referralCode})`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-right text-xs">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>تنبيه هام حول فك الارتباط:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                عند تأكيد فك الارتباط، سيتم إلغاء ربط العميل من قائمة المُحالين ولن تُحتسب أي عمولات مستقبلية لهذا المُحيل من مشترياته.
              </p>
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                ✓ كافة العمولات السابقة المحققة تظل محفوظة ومسجلة في السجل المالي ولن تتأثر.
              </p>
            </div>

            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                سبب فك الارتباط (يُسجل في سجل المراقبة)
              </label>
              <Input
                placeholder="مثال: بناء على طلب العميل، انتهاء مدة التسويق، إلغاء إداري..."
                value={unlinkReason}
                onChange={e => setUnlinkReason(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRefereeToUnlink(null);
                  setUnlinkReason('');
                }}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmUnlink}
                icon={<UserMinus className="w-4 h-4" />}
              >
                تأكيد فك الارتباط
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 💰 Owner Direct Balance / Cashback / Referral Adjustment Modal */}
      {isBalanceAdjustModalOpen && (
        <Modal
          isOpen={isBalanceAdjustModalOpen}
          onClose={() => {
            setIsBalanceAdjustModalOpen(false);
            setAdjustAmount(0);
            setAdjustReason('');
          }}
          title={`تعديل الأرصدة المالية — ${currentCust.name}`}
          subtitle="تعديل مباشر على رصيد الحساب أو الكاش باك أو محفظة الإحالة مع توثيق الحركة"
          maxWidth="md"
        >
          <form onSubmit={handleExecuteBalanceAdjustment} className="space-y-4 text-right text-xs">
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-zinc-700 dark:text-zinc-300">
              🔒 <strong>صلاحية حصرية للمدير المالك:</strong> أي تعديل مالي يتم تسجيله تلقائياً في دفتر حركات المحفظة الموحدة وسجل ملاحظات العميل للرقابة والمراجعة.
            </div>

            {/* Target Select */}
            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                المحفظة / الرصيد المراد تعديله *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustTarget('cashback')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    adjustTarget === 'cashback'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  🎁 الكاش باك ({currentCust.cashbackBalance || 0} ج)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustTarget('referral')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    adjustTarget === 'referral'
                      ? 'border-purple-500 bg-purple-500/15 text-purple-400'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  🤝 محفظة الإحالة ({currentCust.referralWalletBalance || 0} ج)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustTarget('account')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    adjustTarget === 'account'
                      ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  💳 رصيد الحساب ({currentCust.accountBalance || 0} ج)
                </button>
              </div>
            </div>

            {/* Mode Select */}
            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                نوع العملية *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustMode('add')}
                  className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    adjustMode === 'add'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  ➕ إضافة (إيداع)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('subtract')}
                  className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    adjustMode === 'subtract'
                      ? 'border-rose-500 bg-rose-500/15 text-rose-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  ➖ خصم (سحب)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('set')}
                  className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    adjustMode === 'set'
                      ? 'border-orange-500 bg-orange-500/15 text-orange-500'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400'
                  }`}
                >
                  🎯 تعيين القيمة
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                {adjustMode === 'set' ? 'الرصيد الجديد المطلوب تعيينه (ج) *' : 'مبلغ الإضافة / الخصم (ج) *'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={adjustAmount || ''}
                onChange={e => setAdjustAmount(parseFloat(e.target.value) || 0)}
                placeholder="أدخل المبلغ..."
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-orange-500/40 p-2.5 text-zinc-900 dark:text-zinc-100 font-mono font-black text-base outline-none focus:border-orange-500"
                required
                autoFocus
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                سبب التعديل والبيان الإداري *
              </label>
              <Input
                placeholder="مثال: تسوية رصيد شحن، تعويض نقدي، تصحيح خطأ إيداع سابق..."
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsBalanceAdjustModalOpen(false);
                  setAdjustAmount(0);
                  setAdjustReason('');
                }}
              >
                إلغاء
              </Button>
              <Button type="submit" variant="primary">
                تأكيد وتنفيذ التعديل
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Full Customer Edit Modal (Admin Only) */}
      {isEditModalOpen && (
        <CustomerFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={customerData => {
            const updated: Customer = {
              ...currentCust,
              ...customerData,
              updatedAt: new Date().toISOString()
            };
            db.saveCustomer(updated);

            // Audit Logging with Old vs New Values
            db.logAction(
              { id: user?.id || 'sys', name: user?.fullName || 'المدير المالك', role: user?.role || 'admin', department: 'الزبائن' },
              'edit',
              'تعديل بيانات العميل',
              updated.id,
              updated.name,
              `تعديل شامل لبيانات العميل (${updated.name}) بواسطة ${user?.fullName || 'المدير المالك'}`,
              {
                name: currentCust.name,
                phone: currentCust.phone,
                email: currentCust.email,
                profileType: currentCust.profileType,
                favoriteGame: currentCust.favoriteGame,
                birthDate: currentCust.birthDate,
                cashbackRate: currentCust.cashbackRate
              },
              {
                name: updated.name,
                phone: updated.phone,
                email: updated.email,
                profileType: updated.profileType,
                favoriteGame: updated.favoriteGame,
                birthDate: updated.birthDate,
                cashbackRate: updated.cashbackRate
              }
            );

            showToast('success', 'تم حفظ التعديلات', `تم تحديث بيانات العميل "${updated.name}" بنجاح`);
            setIsEditModalOpen(false);
            loadCustomerDetails();
            onCustomerUpdated();
          }}
          customerToEdit={currentCust}
        />
      )}

      {/* Comprehensive Ticket Details Modal */}
      {selectedTicketForDetails && (
        <TicketDetailsModal
          isOpen={!!selectedTicketForDetails}
          onClose={() => setSelectedTicketForDetails(null)}
          ticket={selectedTicketForDetails}
          department="customers"
          onUpdateTicket={(up) => {
            setSelectedTicketForDetails(up);
            loadCustomerDetails();
            onCustomerUpdated();
          }}
          onPrintTicket={(t) => {
            setSelectedTicketForDetails(null);
            setPrintingTicket(t);
          }}
        />
      )}

      {/* Balance Withdrawal Modal */}
      {isWithdrawalModalOpen && (
        <NewWithdrawalTicketModal
          isOpen={isWithdrawalModalOpen}
          onClose={() => setIsWithdrawalModalOpen(false)}
          mode="customer"
          preselectedPhone={currentCust.phone}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
            onCustomerUpdated();
          }}
        />
      )}

      {/* Official Cashback Transfer Modal */}
      {isCashbackTransferModalOpen && (
        <CustomerCashbackTransferModal
          isOpen={isCashbackTransferModalOpen}
          onClose={() => setIsCashbackTransferModalOpen(false)}
          customer={currentCust}
          partyType="customer"
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
            loadCustomerDetails();
            onCustomerUpdated();
          }}
        />
      )}

      {/* Official Referral Transfer Modal */}
      {isReferralTransferModalOpen && (
        <CustomerReferralTransferModal
          isOpen={isReferralTransferModalOpen}
          onClose={() => setIsReferralTransferModalOpen(false)}
          customer={currentCust}
          partyType="customer"
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
            loadCustomerDetails();
            onCustomerUpdated();
          }}
        />
      )}

      {/* Withdrawal Invoice Modal */}
      {selectedWithdrawalForInvoice && (
        <WithdrawalInvoiceModal
          isOpen={!!selectedWithdrawalForInvoice}
          onClose={() => setSelectedWithdrawalForInvoice(null)}
          withdrawal={selectedWithdrawalForInvoice}
        />
      )}

      {/* Owner Primary Wallet Debt Clearance Modal (Requirement #7) */}
      {isClearDebtModalOpen && (
        <Modal
          isOpen={isClearDebtModalOpen}
          onClose={() => !isClearingDebt && setIsClearDebtModalOpen(false)}
          title="تصفية المحفظة الأساسية وشطب العجز المالي (قرار المالك)"
          maxWidth="md"
        >
          <div className="space-y-4 text-right text-xs">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
                <span>تأكيد شطب العجز وتصفية المحفظة</span>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                أنت على وشك تصفية المحفظة الأساسية للعميل <strong>{currentCust.name}</strong> وشطب العجز المتراكم بقرار استثنائي من المالك.
              </p>
              <div className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-rose-500/20 flex items-center justify-between">
                <span className="text-zinc-500 font-bold">عجز السداد الحالي المطلوب شطبه:</span>
                <span className="text-lg font-black font-mono text-rose-500">
                  {formatCurrency(Math.abs(currentCust.accountBalance || currentCust.balance || 0))}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 space-y-1">
              <strong className="block font-bold">📌 أثر هذا القرار الإداري:</strong>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                <li>سيتحول رصيد المحفظة الأساسية للعميل فوراً إلى <strong>0 جنيه</strong>.</li>
                <li>يتم تسجيل العملية في سجل الحركات كـ "تصفية محفظة بأمر المالك".</li>
                <li><strong>لا يؤثر على أي تقارير أرباح سابقة</strong> لأن العجز لم يدخل في الأرباح أصلاً من البداية.</li>
                <li>��حفظة الكاش باك ومحفظة الإحالة تظلان مستقلتين تماماً دون أي مساس بهما.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsClearDebtModalOpen(false)}
                disabled={isClearingDebt}
              >
                إلغاء التراجع
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmClearDebt}
                disabled={isClearingDebt}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                {isClearingDebt ? 'جارٍ الشطب والتصفية...' : 'تأكيد الشطب والتصفية نهائياً ⚠️'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Expired Balance Management Modal (Modification #6) */}
      {isExpiredBalanceModalOpen && (
        <ExpiredBalanceManagementModal
          isOpen={isExpiredBalanceModalOpen}
          onClose={() => setIsExpiredBalanceModalOpen(false)}
          summary={customerExpirySummary}
          targetWallet={expiredModalWalletType}
          onSuccess={() => {
            loadCustomerDetails();
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </Modal>
  );
};

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated
}) => {
  if (!isOpen || !customer) return null;

  return (
    <CustomerProfileModalContent
      isOpen={isOpen}
      onClose={onClose}
      customer={customer}
      onCustomerUpdated={onCustomerUpdated}
    />
  );
};
