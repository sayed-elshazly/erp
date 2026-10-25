import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { db } from '../../database/db';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { TablePagination } from '../../components/common/TablePagination';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { recordUndoableAction } from '../../context/HistoryContext';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import { StoreWallet, StoreWalletTransaction, WalletNumberItem } from '../../types/topup.types';
import { CustomerTicket } from '../../types/customer.types';
import {
  Wallet,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  DollarSign,
  Calendar,
  Layers,
  FileText,
  Settings,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Copy,
  Ticket,
  Clock,
  Sparkles,
  Zap,
  Download,
  Share2,
  RotateCcw,
  Receipt,
  Star,
  Eye,
  Send,
  ExternalLink,
  Landmark
} from 'lucide-react';
import { formatCurrency, formatDateTime, isStoreWalletTxPositive } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { copyToClipboard } from '../../utils/clipboard';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { DepositVoucherModal } from '../finance/DepositVoucherModal';
import { TransactionDetailsModal } from './TransactionDetailsModal';
import { TicketDetailsModal } from './TicketDetailsModal';
import { ZeroProfitWalletModal } from './ZeroProfitWalletModal';

interface WalletProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string | null;
  department?: 'customers' | 'dealers';
  onWalletUpdated: () => void;
  onOpenEditModal?: (wallet: StoreWallet) => void;
}

export const WalletProfileModal: React.FC<WalletProfileModalProps> = ({
  isOpen,
  onClose,
  walletId,
  department = 'customers',
  onWalletUpdated,
  onOpenEditModal
}) => {
  const { showToast } = useNotifications();
  const { user } = useAuth();
  const isOwner = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'overview' | 'numbers' | 'transactions' | 'tickets' | 'settings'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [metricsMode, setMetricsMode] = useState<'preferred' | 'total'>('preferred');
  const [limitsViewMode, setLimitsViewMode] = useState<'all' | 'receive' | 'send'>('all');

  // Sub-Modals
  const [isDepositVoucherOpen, setIsDepositVoucherOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositDesc, setDepositDesc] = useState('');
  const [depositSourceType, setDepositSourceType] = useState<string>('ticket');
  const [depositSourceName, setDepositSourceName] = useState('');
  const [depositTicketNumber, setDepositTicketNumber] = useState('');
  const [depositNumberId, setDepositNumberId] = useState('');

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawDesc, setWithdrawDesc] = useState('');
  const [withdrawNumberId, setWithdrawNumberId] = useState('');

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isZeroProfitModalOpen, setIsZeroProfitModalOpen] = useState(false);
  const [transferTargetWalletId, setTransferTargetWalletId] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferFees, setTransferFees] = useState<number>(0);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferCurrency, setTransferCurrency] = useState<'EGP' | 'USD'>('EGP');
  const [transferCustomRate, setTransferCustomRate] = useState<number>(db.getDailyExchangeRate()?.rateUSD_EGP || 50);

  const [isAddNumberModalOpen, setIsAddNumberModalOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<WalletNumberItem | null>(null);
  const [numPhone, setNumPhone] = useState('');
  const [numHolder, setNumHolder] = useState('');
  const [numDailyLimit, setNumDailyLimit] = useState<number>(30000);
  const [numLimit, setNumLimit] = useState<number>(200000);
  const [numDailySendLimit, setNumDailySendLimit] = useState<number>(30000);
  const [numMonthlySendLimit, setNumMonthlySendLimit] = useState<number>(200000);
  const [numUsedReceived, setNumUsedReceived] = useState<number>(0);
  const [numUsedSent, setNumUsedSent] = useState<number>(0);
  const [numInitialBalance, setNumInitialBalance] = useState<number>(0);

  // Advanced Filters for Numbers
  const [numPeriodFilter, setNumPeriodFilter] = useState<'all' | 'month' | 'today' | 'week' | 'last_month' | 'custom_day' | 'range'>('month');
  const [numCustomDate, setNumCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [numStartDate, setNumStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [numEndDate, setNumEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Ledger Filter (Requirement 14: نوع العملية: وارد/صادر/الكل, الرقم, النطاق الزمني, الترتيب)
  const [txDirectionFilter, setTxDirectionFilter] = useState<'all' | 'in' | 'out'>('all');
  const [txNumberFilter, setTxNumberFilter] = useState<string>('all');
  const [txSort, setTxSort] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low'>('newest');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');
  const [txDatePreset, setTxDatePreset] = useState<string>('all');

  // Linked Tickets Filter & Date States (Requirement #8)
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [ticketStartDate, setTicketStartDate] = useState('');
  const [ticketEndDate, setTicketEndDate] = useState('');

  // Pagination States for Ledger & Linked Tickets (10 per page default)
  const [txCurrentPage, setTxCurrentPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(10);
  const [ticketCurrentPage, setTicketCurrentPage] = useState(1);
  const [ticketPageSize, setTicketPageSize] = useState(10);

  // Selected for Details Modals (Transactions & Linked Tickets)
  const [selectedTransaction, setSelectedTransaction] = useState<StoreWalletTransaction | null>(null);
  const [selectedTicketForDetails, setSelectedTicketForDetails] = useState<CustomerTicket | null>(null);

  // Auto-refresh when wallets mutate or funding occurs
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRefreshKey(prev => prev + 1);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('store_wallets_updated', handleUpdate);
    const unsub = eventBus.subscribe(SYSTEM_EVENTS.WALLET_MUTATED, handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('store_wallets_updated', handleUpdate);
      unsub();
    };
  }, []);

  // Load All Tickets (Customers + Dealers)
  const allTickets = useMemo(() => {
    const custTickets = db.getTickets();
    const dlrTickets = db.getDealerTickets();
    return [...custTickets, ...dlrTickets];
  }, [refreshKey]);

  const isDealerTicket = useCallback((t: CustomerTicket) => {
    return db.getDealerTickets().some(dt => dt.id === t.id);
  }, [refreshKey]);

  // Helper to resolve linked ticket for any transaction
  const findLinkedTicket = useCallback((tx: StoreWalletTransaction): CustomerTicket | null => {
    if (tx.sourceTicketId) {
      const byId = allTickets.find(t => t.id === tx.sourceTicketId);
      if (byId) return byId;
    }
    if (tx.sourceTicketNumber) {
      const num = tx.sourceTicketNumber.trim().toUpperCase();
      const byNum = allTickets.find(t => t.ticketNumber?.trim().toUpperCase() === num);
      if (byNum) return byNum;
    }
    if (tx.referenceNumber) {
      const ref = tx.referenceNumber.trim().toUpperCase();
      const byRef = allTickets.find(t => t.ticketNumber?.trim().toUpperCase() === ref);
      if (byRef) return byRef;
    }
    const combined = `${tx.description || ''} ${tx.referenceNumber || ''} ${tx.sourceTicketNumber || ''}`;
    const match = combined.match(/JKR-\d{4}-\d{4}/i);
    if (match) {
      const m = match[0].toUpperCase();
      const byRegex = allTickets.find(t => t.ticketNumber?.trim().toUpperCase() === m);
      if (byRegex) return byRegex;
    }
    return null;
  }, [allTickets]);

  // Load Wallet Data
  const wallets = useMemo(() => db.getStoreWallets(), [refreshKey]);
  const wallet = useMemo(() => {
    if (!walletId) return null;
    return wallets.find(w => w.id === walletId) || null;
  }, [walletId, wallets, refreshKey]);

  // Load Transactions
  const transactions = useMemo(() => {
    if (!walletId) return [];
    return db.getStoreWalletTransactions(walletId);
  }, [walletId, wallets, refreshKey]);

  // Load Linked Tickets (Both Customers & Dealers)
  const linkedTickets = useMemo(() => {
    if (!wallet) return [];
    if (wallet.id === 'w_cashback' || wallet.systemType === 'cashback') {
      return allTickets.filter(t => (t.cashbackEarned && t.cashbackEarned > 0) || (t.cashbackUsed && t.cashbackUsed > 0));
    }
    return allTickets.filter(t => t.paymentWalletId === wallet.id || t.paymentWallet === wallet.name);
  }, [wallet, allTickets]);

  // Filtered Linked Tickets (Requirement #8)
  const filteredLinkedTickets = useMemo(() => {
    return linkedTickets.filter(tkt => {
      if (ticketSearchQuery) {
        const q = ticketSearchQuery.toLowerCase();
        const matchNum = tkt.ticketNumber.toLowerCase().includes(q);
        const matchCust = tkt.customerName.toLowerCase().includes(q) || tkt.customerPhone.includes(q);
        const matchGame = tkt.gameName.toLowerCase().includes(q);
        const matchRef = Boolean(tkt.referenceNumber && tkt.referenceNumber.toLowerCase().includes(q));
        if (!matchNum && !matchCust && !matchGame && !matchRef) return false;
      }
      if (ticketStartDate || ticketEndDate) {
        const tktDate = (tkt.createdAt || '').split('T')[0];
        if (ticketStartDate && tktDate < ticketStartDate) return false;
        if (ticketEndDate && tktDate > ticketEndDate) return false;
      }
      return true;
    });
  }, [linkedTickets, ticketSearchQuery, ticketStartDate, ticketEndDate]);

  const paginatedLinkedTickets = useMemo(() => {
    const start = (ticketCurrentPage - 1) * ticketPageSize;
    return filteredLinkedTickets.slice(start, start + ticketPageSize);
  }, [filteredLinkedTickets, ticketCurrentPage, ticketPageSize]);

  const ticketTotalPages = Math.ceil(filteredLinkedTickets.length / ticketPageSize) || 1;

  const isSystemWallet = wallet ? (wallet.isSystemWallet || ['w_profits', 'w_cashback', 'w_referrals', 'w_trust', 'w_operating_expenses'].includes(wallet.id) || wallet.type === 'profits') : false;

  const numbersList = wallet?.numbers || [];
  const activeNumbers = numbersList.filter(n => n.status !== 'frozen');
  const hasNumbers = numbersList.length > 0;
  const preferredNumber = numbersList.find(n => n.isPrimary) || numbersList[0];

  const isPreferredMode = metricsMode === 'preferred' && Boolean(preferredNumber);

  // Monthly Limit Metrics: Parent wallet capacity is the aggregate of its active lines
  const monthlyReceived = wallet?.monthlyIncome || wallet?.totalReceived || 0;
  const monthlyWithdrawn = wallet?.monthlyWithdrawn || wallet?.totalWithdrawn || 0;

  const totalNumbersMonthlyLimit = hasNumbers
    ? activeNumbers.reduce((sum, n) => sum + (n.monthlyLimit || 200000), 0)
    : (wallet?.monthlyLimit || 0);

  const totalNumbersRemainingLimit = hasNumbers
    ? activeNumbers.reduce((sum, n) => sum + Math.max(0, (n.monthlyLimit || 200000) - (n.monthlyReceived || 0)), 0)
    : (totalNumbersMonthlyLimit > 0 ? Math.max(0, totalNumbersMonthlyLimit - monthlyReceived) : 0);

  const limitUsagePercentage = totalNumbersMonthlyLimit > 0
    ? Math.min(100, Math.round(((totalNumbersMonthlyLimit - totalNumbersRemainingLimit) / totalNumbersMonthlyLimit) * 100))
    : 0;

  // Daily Limit Metrics (Requirement #14)
  const totalNumbersDailyLimit = hasNumbers
    ? activeNumbers.reduce((sum, n) => sum + (n.dailyLimit || 30000), 0)
    : (wallet?.dailyLimit || 30000);

  const dailyReceived = hasNumbers
    ? activeNumbers.reduce((sum, n) => sum + (n.dailyReceived || 0), 0)
    : (wallet?.dailyIncome || 0);

  const totalNumbersRemainingDailyLimit = Math.max(0, totalNumbersDailyLimit - dailyReceived);

  const dailyUsagePercentage = totalNumbersDailyLimit > 0
    ? Math.min(100, Math.round((dailyReceived / totalNumbersDailyLimit) * 100))
    : 0;

  // Wallet Lifetime Inflows and Outflows
  const totalInflows = useMemo(() => {
    return transactions
      .filter(t => t.type === 'deposit' || t.type === 'transfer_in' || t.type === 'cashback' || t.type === 'bond_deposit' || t.type === 'compensation' || (t.type === 'adjustment' && (t.balanceAfter !== undefined && t.balanceBefore !== undefined ? t.balanceAfter >= t.balanceBefore : (t.amount || 0) > 0)))
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
  }, [transactions]);

  const totalOutflows = useMemo(() => {
    return transactions
      .filter(t => t.type === 'withdrawal' || t.type === 'transfer_out' || t.type === 'purchase' || t.type === 'loss' || t.type === 'fee' || t.type === 'refund' || (t.type === 'adjustment' && (t.balanceAfter !== undefined && t.balanceBefore !== undefined ? t.balanceAfter < t.balanceBefore : false)))
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
  }, [transactions]);

  // Displayed Metrics values depending on metricsMode
  const displayedCurrentBalance = isPreferredMode && preferredNumber
    ? (preferredNumber.currentBalance ?? wallet?.balance ?? 0)
    : (wallet?.balance ?? 0);

  const displayedInflows = isPreferredMode && preferredNumber
    ? (preferredNumber.totalReceived ?? preferredNumber.monthlyReceived ?? 0)
    : (wallet?.totalReceived || monthlyReceived || totalInflows);

  const displayedOutflows = isPreferredMode && preferredNumber
    ? (preferredNumber.totalSent ?? preferredNumber.monthlySent ?? preferredNumber.monthlyWithdrawn ?? 0)
    : (wallet?.totalWithdrawn || monthlyWithdrawn || totalOutflows);

  // 1. حدود الاستقبال (Receive Limits - Daily & Monthly)
  const displayedDailyReceiveLimit = isPreferredMode && preferredNumber
    ? (preferredNumber.dailyLimit || 30000)
    : totalNumbersDailyLimit;

  const displayedDailyReceived = isPreferredMode && preferredNumber
    ? (preferredNumber.dailyReceived || 0)
    : dailyReceived;

  const displayedDailyReceiveRemaining = Math.max(0, displayedDailyReceiveLimit - displayedDailyReceived);
  const displayedDailyReceiveUsagePercentage = displayedDailyReceiveLimit > 0
    ? Math.min(100, Math.round((displayedDailyReceived / displayedDailyReceiveLimit) * 100))
    : 0;

  const displayedMonthlyReceiveLimit = isPreferredMode && preferredNumber
    ? (preferredNumber.monthlyLimit || 200000)
    : totalNumbersMonthlyLimit;

  const displayedMonthlyReceived = isPreferredMode && preferredNumber
    ? (preferredNumber.monthlyReceived || 0)
    : monthlyReceived;

  const displayedMonthlyReceiveRemaining = Math.max(0, displayedMonthlyReceiveLimit - displayedMonthlyReceived);
  const displayedMonthlyReceiveUsagePercentage = displayedMonthlyReceiveLimit > 0
    ? Math.min(100, Math.round((displayedMonthlyReceived / displayedMonthlyReceiveLimit) * 100))
    : 0;

  // 2. حدود الإرسال (Send Limits - Daily & Monthly)
  const nowForLimits = new Date();
  const todayStrForLimits = nowForLimits.toISOString().split('T')[0];

  const getLineSentMetrics = (num: WalletNumberItem) => {
    const numTxs = transactions.filter(t => 
      (t as any).walletNumberId === num.id ||
      (t as any).walletPhoneNumber === num.phoneNumber ||
      t.senderPhoneNumber === num.phoneNumber ||
      (t.description && t.description.includes(num.phoneNumber))
    );
    const todaySent = numTxs.filter(t => 
      t.createdAt.split('T')[0] === todayStrForLimits &&
      (t.type === 'withdrawal' || t.type === 'transfer_out' || t.type === 'purchase' || t.type === 'refund')
    ).reduce((sum, t) => sum + (t.amount || 0), 0);

    const monthSent = numTxs.filter(t => {
      const d = new Date(t.createdAt);
      return d.getMonth() === nowForLimits.getMonth() && d.getFullYear() === nowForLimits.getFullYear() &&
        (t.type === 'withdrawal' || t.type === 'transfer_out' || t.type === 'purchase' || t.type === 'refund');
    }).reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      dailySent: Math.max(num.dailySent || 0, todaySent),
      monthlySent: Math.max(num.monthlySent || num.monthlyWithdrawn || 0, monthSent)
    };
  };

  const totalNumbersDailySendLimit = hasNumbers
    ? activeNumbers.reduce((sum, n) => sum + (n.dailySendLimit || 30000), 0)
    : 30000;

  const totalNumbersDailySent = hasNumbers
    ? activeNumbers.reduce((sum, n) => sum + getLineSentMetrics(n).dailySent, 0)
    : 0;

  const totalNumbersMonthlySendLimit = hasNumbers
    ? activeNumbers.reduce((sum, n) => sum + (n.monthlySendLimit || 200000), 0)
    : 200000;

  const totalNumbersMonthlySent = hasNumbers
    ? activeNumbers.reduce((sum, n) => sum + getLineSentMetrics(n).monthlySent, 0)
    : (wallet?.monthlyWithdrawn || 0);

  const displayedDailySendLimit = isPreferredMode && preferredNumber
    ? (preferredNumber.dailySendLimit || 30000)
    : totalNumbersDailySendLimit;

  const displayedDailySent = isPreferredMode && preferredNumber
    ? getLineSentMetrics(preferredNumber).dailySent
    : totalNumbersDailySent;

  const displayedDailySendRemaining = Math.max(0, displayedDailySendLimit - displayedDailySent);
  const displayedDailySendUsagePercentage = displayedDailySendLimit > 0
    ? Math.min(100, Math.round((displayedDailySent / displayedDailySendLimit) * 100))
    : 0;

  const displayedMonthlySendLimit = isPreferredMode && preferredNumber
    ? (preferredNumber.monthlySendLimit || 200000)
    : totalNumbersMonthlySendLimit;

  const displayedMonthlySent = isPreferredMode && preferredNumber
    ? getLineSentMetrics(preferredNumber).monthlySent
    : totalNumbersMonthlySent;

  const displayedMonthlySendRemaining = Math.max(0, displayedMonthlySendLimit - displayedMonthlySent);
  const displayedMonthlySendUsagePercentage = displayedMonthlySendLimit > 0
    ? Math.min(100, Math.round((displayedMonthlySent / displayedMonthlySendLimit) * 100))
    : 0;

  // Compatibility aliases
  const displayedDailyLimit = displayedDailyReceiveLimit;
  const displayedDailyRemaining = displayedDailyReceiveRemaining;
  const displayedDailyUsagePercentage = displayedDailyReceiveUsagePercentage;
  const displayedMonthlyLimit = displayedMonthlyReceiveLimit;
  const displayedMonthlyRemaining = displayedMonthlyReceiveRemaining;
  const displayedMonthlyUsagePercentage = displayedMonthlyReceiveUsagePercentage;

  // Available lines with room to receive
  const availableLinesCount = hasNumbers
    ? activeNumbers.filter(n => (n.monthlyReceived || 0) < (n.monthlyLimit || 200000) && (n.dailyReceived || 0) < (n.dailyLimit || 30000)).length
    : 1;

  // The parent wallet is ONLY locked if ALL its lines are full
  const isAllLinesExceeded = hasNumbers
    ? (availableLinesCount === 0 && activeNumbers.length > 0)
    : (totalNumbersMonthlyLimit > 0 && monthlyReceived >= totalNumbersMonthlyLimit);
  const isLimitWarning = hasNumbers ? (availableLinesCount === 1 && activeNumbers.length > 1) : (limitUsagePercentage >= 80 && !isAllLinesExceeded);

  // Specialized System Accounting Metrics (Cashback, Profits, Referrals, Trust)
  const systemMetrics = useMemo(() => {
    if (!wallet || !isSystemWallet) return null;

    const totalInflow = transactions
      .filter(t => t.type === 'deposit' || t.type === 'transfer_in' || (t.amount > 0 && !t.description.includes('خصم') && !t.description.includes('استبدال') && !t.description.includes('إلغاء')))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalOutflow = transactions
      .filter(t => t.type === 'withdrawal' || t.type === 'refund' || t.type === 'transfer_out' || t.description.includes('خصم') || t.description.includes('استبدال') || t.description.includes('إلغاء'))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    let systemTitle = 'محفظة نظام آلية';
    let systemRole = 'تسجيل وتدقيق القيود المحاسبية التلقائية';
    let earnedLabel = 'إجمالي الوارد المحقق';
    let spentLabel = 'إجمالي المستهلك / المنصرف';

    if (wallet.id === 'w_cashback' || wallet.systemType === 'cashback') {
      systemTitle = 'منظومة الكاش باك التراكمية (Cashback System)';
      systemRole = 'إدارة ومزامنة نقاط ومبالغ الكاش باك المكتسبة والمستبدلة للعملاء آلياً مع كل تذكرة بيع أو استرداد';
      earnedLabel = 'كاش باك مكتسب للعملاء';
      spentLabel = 'كاش باك مستبدل وملغي';
    } else if (wallet.id === 'w_profits' || wallet.systemType === 'profits' || wallet.type === 'profits') {
      systemTitle = 'خزينة الأرباح الصافية المجمعة (Net Profits)';
      systemRole = 'تجميع وتأكيد صافي الأرباح المحققة بعد خصم التكاليف والمصاريف لجميع أقسام النظام تلقائياً';
      earnedLabel = 'صافي الأرباح المضافة';
      spentLabel = 'تسويات ومسحوبات الأرباح';
    } else if (wallet.id === 'w_referrals' || wallet.systemType === 'referrals') {
      systemTitle = 'منظومة الإحالات وعمولات الشركاء (Referrals)';
      systemRole = 'احتساب وتخزين عمولات شركاء النجاح المسجلة عبر أكواد الإحالة وتتبع سدادها';
      earnedLabel = 'عمولات إحالة مستحقة';
      spentLabel = 'عمولات مصروفة / مستبدلة';
    } else if (wallet.id === 'w_trust' || wallet.systemType === 'trust') {
      systemTitle = 'محفظة الأمانات وحساب الضمان (Escrow Trust)';
      systemRole = 'حجز وتأمين مبالغ صفقات الوساطة وحجوزات المنتجات حتى إتمام التسليم للطرفين';
      earnedLabel = 'أمانات محتجزة';
      spentLabel = 'أمانات مفرج عنها ومستردة';
    } else if (wallet.id === 'w_operating_expenses' || wallet.systemType === 'operating_expenses') {
      systemTitle = 'محفظة مصاريف التشغيل والسيرفرات (Operating Expenses)';
      systemRole = 'تجميع وتأكيد مصاريف التشغيل والسيرفرات والرسوم المقتطعة من التذاكر والعمليات تلقائياً';
      earnedLabel = 'مصاريف تشغيل محصلة';
      spentLabel = 'مصاريف مسددة / مصروفات تشغيلية';
    }

    return {
      totalInflow,
      totalOutflow,
      systemTitle,
      systemRole,
      earnedLabel,
      spentLabel
    };
  }, [isSystemWallet, wallet, transactions]);

  const handleCopy = async (text: string, key: string, label: string) => {
    const success = await copyToClipboard(text, label, showToast);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Helper to compute number stats in selected period
  const getNumberFilteredStats = (num: WalletNumberItem) => {
    const numTxs = transactions.filter(t => 
      (t as any).walletNumberId === num.id ||
      (t as any).walletPhoneNumber === num.phoneNumber ||
      t.senderPhoneNumber === num.phoneNumber ||
      t.receivingPhoneNumber === num.phoneNumber || 
      t.customerPhone === num.phoneNumber ||
      (t.description && t.description.includes(num.phoneNumber)) ||
      (t.sourceTicketNumber && linkedTickets.some(tk => (tk.paymentWalletNumberId === num.id || tk.paymentReceivedPhone === num.phoneNumber) && tk.ticketNumber === t.referenceNumber))
    );

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Filter by period
    const filteredTxs = numTxs.filter(t => {
      if (numPeriodFilter === 'all') return true;
      const txDate = new Date(t.createdAt);
      const txDateStr = t.createdAt.split('T')[0];

      if (numStartDate && txDateStr < numStartDate) return false;
      if (numEndDate && txDateStr > numEndDate) return false;
      return true;
    });

    const periodReceived = filteredTxs
      .filter(t => t.type === 'deposit' || t.type === 'transfer_in')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Crucial: include refunds as outgoing sent money
    const periodSent = filteredTxs
      .filter(t => t.type === 'withdrawal' || t.type === 'transfer_out' || t.type === 'purchase' || t.type === 'refund')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const periodOpsCount = filteredTxs.length;

    // Remaining limits (daily & monthly)
    const dailyReceiveLimit = num.dailyLimit || 30000;
    const monthlyReceiveLimit = num.monthlyLimit || 200000;
    const dailySendLimit = num.dailySendLimit || 30000;
    const monthlySendLimit = num.monthlySendLimit || 200000;

    // Real-time daily/monthly sent calculation from transactions (includes refunds)
    const todaySentTxs = numTxs.filter(t => 
      t.createdAt.split('T')[0] === todayStr &&
      (t.type === 'withdrawal' || t.type === 'transfer_out' || t.type === 'purchase' || t.type === 'refund')
    ).reduce((sum, t) => sum + (t.amount || 0), 0);
    const effectiveDailySent = Math.max(num.dailySent || 0, todaySentTxs);

    const monthSentTxs = numTxs.filter(t => {
      const d = new Date(t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() &&
        (t.type === 'withdrawal' || t.type === 'transfer_out' || t.type === 'purchase' || t.type === 'refund');
    }).reduce((sum, t) => sum + (t.amount || 0), 0);
    const effectiveMonthlySent = Math.max(num.monthlySent || 0, monthSentTxs);

    const remainingDailyReceive = Math.max(0, dailyReceiveLimit - (num.dailyReceived || 0));
    const remainingMonthlyReceive = Math.max(0, monthlyReceiveLimit - (num.monthlyReceived || 0));
    const remainingDailySend = Math.max(0, dailySendLimit - effectiveDailySent);
    const remainingMonthlySend = Math.max(0, monthlySendLimit - effectiveMonthlySent);

    // Lifetime line balance from transactions
    const totalLineInflow = numTxs
      .filter(t => t.type === 'deposit' || t.type === 'transfer_in')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalLineOutflow = numTxs
      .filter(t => t.type === 'withdrawal' || t.type === 'transfer_out' || t.type === 'purchase' || t.type === 'refund')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const ledgerLineBalance = totalLineInflow - totalLineOutflow;
    const currentLineBalance = (num.currentBalance !== undefined && num.currentBalance !== 0)
      ? num.currentBalance
      : (numTxs.length > 0 ? ledgerLineBalance : (num.currentBalance || 0));

    return {
      currentLineBalance,
      totalLineInflow,
      totalLineOutflow,
      periodReceived: periodReceived || (numPeriodFilter === 'today' ? (num.dailyReceived || 0) : numPeriodFilter === 'all' ? (num.totalReceived || num.monthlyReceived || 0) : (num.monthlyReceived || 0)),
      periodSent: periodSent || (numPeriodFilter === 'today' ? effectiveDailySent : numPeriodFilter === 'all' ? (num.totalSent || effectiveMonthlySent) : effectiveMonthlySent),
      periodOpsCount: periodOpsCount || num.operationsCount || (filteredTxs.length > 0 ? filteredTxs.length : 1),
      remainingDailyReceive,
      remainingMonthlyReceive,
      remainingDailySend,
      remainingMonthlySend,
      dailyReceiveLimit,
      monthlyReceiveLimit,
      dailySendLimit,
      monthlySendLimit
    };
  };

  // 1. Manual Deposit with Mandatory Source Tracking
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    if (depositAmount <= 0) {
      showToast('error', 'المبلغ غير صالح', 'يرجى إدخال مبلغ إيداع صحيح');
      return;
    }
    if (!depositSourceType) {
      showToast('error', 'مصدر العملية مطلوب', 'يرجى تحديد مصدر عملية الاستلام');
      return;
    }

    const sourceMap: Record<string, string> = {
      ticket: 'تذكرة بيع وشحن',
      manual_deposit: 'إيداع يدوي',
      transfer: 'تحويل من محفظة أخرى',
      refund: 'استرداد',
      adjustment: 'تعديل إداري',
      other: depositSourceName.trim() || 'مصدر آخر'
    };

    const finalSourceName = sourceMap[depositSourceType] || 'إيداع نقدي';

    db.depositStoreWalletFunds(
      wallet.id,
      depositAmount,
      depositDesc.trim() || `استلام وإيداع (${finalSourceName})`,
      depositTicketNumber.trim() || `DEP-${Date.now().toString().slice(-6)}`,
      { id: user?.id || 'sys', name: user?.fullName || 'المسؤول', role: user?.role || 'user' },
      undefined,
      depositSourceType as any,
      finalSourceName,
      depositNumberId || undefined
    );

    showToast('success', 'تم تسجيل الاستلام والإيداع', `تم إيداع ${formatCurrency(depositAmount, wallet.currency)} بنجاح مع توثيق المصدر (${finalSourceName})`);
    setIsDepositModalOpen(false);
    setDepositAmount(0);
    setDepositDesc('');
    setDepositTicketNumber('');
    setDepositSourceName('');
    setDepositNumberId('');
    onWalletUpdated();
  };

  // 2. Manual Withdrawal with Mandatory Line & Slip Tracking
  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    if (withdrawAmount <= 0) {
      showToast('error', 'المبلغ غير صالح', 'يرجى إدخال مبلغ سحب صحيح');
      return;
    }
    if (withdrawAmount > wallet.balance) {
      showToast('error', 'رصيد غير كافٍ', `الرصيد المتاح حالياً هو ${formatCurrency(wallet.balance, wallet.currency)} فقط`);
      return;
    }

    db.withdrawStoreWalletFunds(
      wallet.id,
      withdrawAmount,
      withdrawDesc.trim() || 'سحب نقدي من المحفظة',
      `WTH-${Date.now().toString().slice(-6)}`,
      { id: user?.id || 'sys', name: user?.fullName || 'المسؤول', role: user?.role || 'user' },
      undefined,
      'manual_withdrawal',
      withdrawNumberId || undefined
    );

    showToast('success', 'تم السحب', `تم سحب ${formatCurrency(withdrawAmount, wallet.currency)} بنجاح`);
    setIsWithdrawModalOpen(false);
    setWithdrawAmount(0);
    setWithdrawDesc('');
    setWithdrawNumberId('');
    onWalletUpdated();
  };

  // 3. Transfer Funds to another wallet
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    if (!transferTargetWalletId) {
      showToast('error', 'اختر المحفظة', 'يرجى اختيار المحفظة المستلمة');
      return;
    }
    if (transferAmount <= 0) {
      showToast('error', 'المبلغ غير صالح', 'يرجى إدخال مبلغ تحويل صحيح');
      return;
    }

    const success = db.transferWalletFunds(
      wallet.id,
      transferTargetWalletId,
      transferAmount,
      transferFees,
      transferNotes || undefined,
      { id: user?.id || 'sys', name: user?.fullName || 'المسؤول', role: user?.role || 'user' },
      transferCustomRate,
      transferCurrency
    );

    if (success) {
      showToast('success', 'تم التحويل بنجاح', `تم تحويل ${formatCurrency(transferAmount, transferCurrency)} بنجاح`);
      setIsTransferModalOpen(false);
      setTransferAmount(0);
      setTransferFees(0);
      setTransferNotes('');
      onWalletUpdated();
    } else {
      showToast('error', 'فشل التحويل', 'تأكد من وجود رصيد كافٍ بالمحفظة شامل الرسوم وفروق العملة');
    }
  };

  // 4. Save/Add Number with Send & Receive Limits
  const handleSaveNumber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    if (!numPhone.trim()) {
      showToast('error', 'رقم الهاتف مطلوب', 'يرجى كتابة رقم الهاتف أو المعرف');
      return;
    }

    const currentNumbers = wallet.numbers || [];
    let updatedNumbers: WalletNumberItem[];

    if (editingNumber) {
      updatedNumbers = currentNumbers.map(n =>
        n.id === editingNumber.id
          ? {
              ...n,
              phoneNumber: numPhone.trim(),
              accountHolderName: numHolder.trim() || n.accountHolderName,
              dailyLimit: numDailyLimit > 0 ? numDailyLimit : 30000,
              monthlyLimit: numLimit > 0 ? numLimit : n.monthlyLimit,
              dailySendLimit: numDailySendLimit > 0 ? numDailySendLimit : 30000,
              monthlySendLimit: numMonthlySendLimit > 0 ? numMonthlySendLimit : 200000
            }
          : n
      );
    } else {
      const newNum: WalletNumberItem = {
        id: 'wnum_' + Date.now(),
        walletId: wallet.id,
        phoneNumber: numPhone.trim(),
        accountHolderName: numHolder.trim() || `خط ${currentNumbers.length + 1}`,
        dailyLimit: numDailyLimit > 0 ? numDailyLimit : 30000,
        dailyReceived: 0,
        monthlyLimit: numLimit > 0 ? numLimit : 200000,
        monthlyReceived: numUsedReceived > 0 ? numUsedReceived : 0,
        previouslyUsedReceived: numUsedReceived > 0 ? numUsedReceived : 0,
        dailySendLimit: numDailySendLimit > 0 ? numDailySendLimit : 30000,
        dailySent: 0,
        monthlySendLimit: numMonthlySendLimit > 0 ? numMonthlySendLimit : 200000,
        monthlySent: numUsedSent > 0 ? numUsedSent : 0,
        previouslyUsedSent: numUsedSent > 0 ? numUsedSent : 0,
        totalReceived: numUsedReceived > 0 ? numUsedReceived : 0,
        totalSent: numUsedSent > 0 ? numUsedSent : 0,
        operationsCount: 0,
        monthlyWithdrawn: 0,
        currentBalance: numInitialBalance || 0,
        status: (numUsedReceived >= numLimit && numLimit > 0) ? 'limit_reached' : 'active',
        isPrimary: currentNumbers.length === 0,
        createdAt: new Date().toISOString()
      };
      updatedNumbers = [...currentNumbers, newNum];
    }

    wallet.numbers = updatedNumbers;
    wallet.updatedAt = new Date().toISOString();
    db.saveStoreWallet(wallet);

    showToast('success', editingNumber ? 'تم تعديل الرقم' : 'تمت إضافة الرقم', 'تم حفظ بيانات خط الاستقبال والإرسال بنجاح');
    setIsAddNumberModalOpen(false);
    setEditingNumber(null);
    setNumPhone('');
    setNumHolder('');
    setNumDailyLimit(30000);
    setNumLimit(200000);
    setNumDailySendLimit(30000);
    setNumMonthlySendLimit(200000);
    setNumUsedReceived(0);
    setNumUsedSent(0);
    setNumInitialBalance(0);
    onWalletUpdated();
  };

  const handleSetPrimaryNumber = (numId: string) => {
    if (!wallet || !wallet.numbers) return;
    const targetNum = wallet.numbers.find(n => n.id === numId);
    if (!targetNum) return;

    const prevWalletSnapshot = JSON.parse(JSON.stringify(wallet));

    wallet.numbers = wallet.numbers.map(n => ({
      ...n,
      isPrimary: n.id === numId
    }));
    wallet.accountNumber = targetNum.phoneNumber;
    (wallet as any).primaryNumberId = targetNum.id;
    if (targetNum.currentBalance !== undefined) wallet.balance = targetNum.currentBalance;
    if (targetNum.dailyLimit !== undefined) wallet.dailyLimit = targetNum.dailyLimit;
    if (targetNum.monthlyLimit !== undefined) wallet.monthlyLimit = targetNum.monthlyLimit;
    if (targetNum.dailyReceived !== undefined) wallet.dailyIncome = targetNum.dailyReceived;
    if (targetNum.monthlyReceived !== undefined) wallet.monthlyIncome = targetNum.monthlyReceived;
    if (targetNum.totalReceived !== undefined) wallet.totalReceived = targetNum.totalReceived;
    if (targetNum.totalSent !== undefined) wallet.totalWithdrawn = targetNum.totalSent;
    wallet.updatedAt = new Date().toISOString();

    db.saveStoreWallet(wallet);

    showToast(
      'success',
      'تم تعيين الرقم المفضل ⭐',
      `تم تحديد (${targetNum.phoneNumber} — ${targetNum.accountHolderName}) كرقم التشغيل المفضل للمحفظة وقراءة كافة بياناته`
    );

    recordUndoableAction(
      `تعيين الرقم المفضل (${targetNum.phoneNumber})`,
      () => {
        db.saveStoreWallet(prevWalletSnapshot);
        onWalletUpdated();
      },
      () => {
        handleSetPrimaryNumber(numId);
      }
    );

    onWalletUpdated();
  };

  const handleToggleFreezeNumber = (numId: string) => {
    if (!wallet) return;
    const res = db.toggleWalletNumberFreeze(wallet.id, numId);
    if (res.success) {
      showToast('info', res.isFrozen ? 'تم تجميد الخط 🔒' : 'تم تفعيل الخط 🟢', 'تم تحديث حالة الخط بنجاح');
      onWalletUpdated();
    }
  };

  const handleDeleteNumber = (numId: string) => {
    if (!wallet) return;
    const targetNum = (wallet.numbers || []).find(n => n.id === numId);
    if (!window.confirm('هل أنت متأكد من حذف هذا الخط من المحفظة؟')) return;

    const prevWalletSnapshot = JSON.parse(JSON.stringify(wallet));
    wallet.numbers = (wallet.numbers || []).filter(n => n.id !== numId);
    wallet.updatedAt = new Date().toISOString();
    db.saveStoreWallet(wallet);
    showToast('info', 'تم الحذف', 'تم حذف الخط بنجاح');

    recordUndoableAction(
      `حذف خط (${targetNum?.phoneNumber || numId})`,
      () => {
        db.saveStoreWallet(prevWalletSnapshot);
        onWalletUpdated();
      },
      () => {
        handleDeleteNumber(numId);
      }
    );

    onWalletUpdated();
  };

  const handleDeleteWallet = () => {
    if (!wallet) return;
    if (isSystemWallet || ['w_cashback', 'w_referrals', 'w_trust', 'w_profits', 'w_operating_expenses'].includes(wallet.id) || wallet.type === 'profits') {
      showToast('error', 'محفظة نظام محمية', 'لا يمكن حذف محافظ النظام الآلية لضمان سلامة السجلات المالية');
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف محفظة "${wallet.name}" نهائياً؟\n\nتنبيه: سيتم إزالة المحفظة وجميع أرقامها المسجلة من النظام. هذه العملية لا يمكن التراجع عنها.`
    );
    if (!confirmed) return;

    const walletSnapshot = JSON.parse(JSON.stringify(wallet));
    const success = db.deleteStoreWallet(
      wallet.id,
      user ? { id: user.id, name: user.fullName || user.username, role: user.role } : undefined,
      `حذف المحفظة [${wallet.name}] من بروفايل المحفظة`
    );
    if (success) {
      db.logAction(
        { id: user?.id || 'sys', name: user?.fullName || 'المستخدم', role: user?.role || 'user', department: 'التذاكر والمحافظ' },
        'delete',
        'محفظة تشغيل',
        wallet.id,
        `حذف محفظة: ${wallet.name}`,
        `تم حذف المحفظة نهائياً من قبل ${user?.fullName || 'المستخدم'}`
      );
      showToast('success', 'تم حذف المحفظة بنجاح', `تم حذف محفظة "${wallet.name}" من النظام`);

      recordUndoableAction(
        `حذف محفظة "${walletSnapshot.name}"`,
        () => {
          db.saveStoreWallet(
            walletSnapshot,
            user ? { id: user.id, name: user.fullName || user.username, role: user.role } : undefined,
            `استرجاع المحفظة المحذوفة [${walletSnapshot.name}]`
          );
          onWalletUpdated();
        },
        () => {
          db.deleteStoreWallet(
            walletSnapshot.id,
            user ? { id: user.id, name: user.fullName || user.username, role: user.role } : undefined,
            `إعادة حذف المحفظة [${walletSnapshot.name}]`
          );
          onWalletUpdated();
        }
      );

      onWalletUpdated();
      onClose();
    } else {
      showToast('error', 'فشل الحذف', 'تعذر حذف المحفظة، يرجى المحاولة مرة أخرى');
    }
  };

  const handleToggleFreeze = () => {
    if (!wallet) return;
    wallet.isFrozen = !wallet.isFrozen;
    wallet.freezeReason = wallet.isFrozen ? 'تجميد يدوي بواسطة الإدارة' : undefined;
    wallet.updatedAt = new Date().toISOString();
    db.saveStoreWallet(wallet);
    showToast(wallet.isFrozen ? 'warning' : 'success', wallet.isFrozen ? 'تم تجميد المحفظة' : 'تم تنشيط المحفظة', '');
    onWalletUpdated();
  };

  const handleSetTxPreset = (preset: string) => {
    setTxDatePreset(preset);
    setTxCurrentPage(1);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setTxStartDate('');
      setTxEndDate('');
      return;
    }

    if (preset === 'today') {
      setTxStartDate(todayStr);
      setTxEndDate(todayStr);
      return;
    }

    if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setTxStartDate(yStr);
      setTxEndDate(yStr);
      return;
    }

    if (preset === 'this_week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = (day + 1) % 7;
      d.setDate(d.getDate() - diff);
      setTxStartDate(d.toISOString().split('T')[0]);
      setTxEndDate(todayStr);
      return;
    }

    if (preset === 'last7') {
      const d = new Date(now);
      d.setDate(now.getDate() - 7);
      setTxStartDate(d.toISOString().split('T')[0]);
      setTxEndDate(todayStr);
      return;
    }

    if (preset === 'last30') {
      const d = new Date(now);
      d.setDate(now.getDate() - 30);
      setTxStartDate(d.toISOString().split('T')[0]);
      setTxEndDate(todayStr);
      return;
    }

    if (preset === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setTxStartDate(startOfMonth.toISOString().split('T')[0]);
      setTxEndDate(todayStr);
      return;
    }

    if (preset === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setTxStartDate(startOfLastMonth.toISOString().split('T')[0]);
      setTxEndDate(endOfLastMonth.toISOString().split('T')[0]);
      return;
    }

    if (preset === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      setTxStartDate(startOfYear.toISOString().split('T')[0]);
      setTxEndDate(todayStr);
      return;
    }
  };

  const handleResetTxDateFilter = () => {
    setTxDatePreset('all');
    setTxStartDate('');
    setTxEndDate('');
    setTxTypeFilter('all');
    setTxSearchQuery('');
    setTxCurrentPage(1);
  };

  useEffect(() => {
    setTxCurrentPage(1);
  }, [txDirectionFilter, txNumberFilter, txSort, txTypeFilter, txSearchQuery, txStartDate, txEndDate, txDatePreset]);

  useEffect(() => {
    setTicketCurrentPage(1);
  }, [ticketSearchQuery, ticketStartDate, ticketEndDate]);

  // Colored Transaction Type Filter Options
  const txTypeOptions = useMemo(() => [
    {
      value: 'deposit',
      label: 'إيداعات نقدية (+)',
      badge: '+ إيداع',
      colorClassName: 'text-emerald-500 font-bold',
      badgeClassName: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      icon: <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
    },
    {
      value: 'withdrawal',
      label: 'سحوبات ومصروفات (-)',
      badge: '- سحب',
      colorClassName: 'text-rose-500 font-bold',
      badgeClassName: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      icon: <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
    },
    {
      value: 'transfer_in',
      label: 'تحويلات واردة (+)',
      badge: 'وارد',
      colorClassName: 'text-cyan-400 font-bold',
      badgeClassName: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
      icon: <ArrowDownLeft className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
    },
    {
      value: 'transfer_out',
      label: 'تحويلات صادرة (-)',
      badge: 'صادر',
      colorClassName: 'text-orange-400 font-bold',
      badgeClassName: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
      icon: <ArrowUpRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
    },
    {
      value: 'purchase',
      label: 'شحن واستلام تذاكر',
      badge: 'تذكرة',
      colorClassName: 'text-purple-400 font-bold',
      badgeClassName: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
      icon: <Ticket className="w-3.5 h-3.5 text-purple-400 shrink-0" />
    },
    {
      value: 'refund',
      label: 'استرداد تذاكر ملغاة',
      badge: 'استرداد',
      colorClassName: 'text-amber-400 font-bold',
      badgeClassName: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      icon: <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
    },
    {
      value: 'cashback',
      label: 'حركات كاش باك',
      badge: 'كاش باك',
      colorClassName: 'text-fuchsia-400 font-bold',
      badgeClassName: 'bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30',
      icon: <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
    },
    {
      value: 'adjustment',
      label: 'تسويات وتصحيحات',
      badge: 'تسوية',
      colorClassName: 'text-blue-400 font-bold',
      badgeClassName: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      icon: <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
    }
  ], []);

  // Filtered Ledger (Requirement #14: نوع العملية: وارد/صادر/الكل, الرقم: رقم معين أو كل الأرقام, النطاق الزمني, الترتيب)
  const filteredLedger = useMemo(() => {
    return transactions.filter(tx => {
      // 1. Direction Filter: وارد / صادر / الكل
      if (txDirectionFilter === 'in') {
        const isInflow = tx.type === 'deposit' || tx.type === 'transfer_in' || (tx.amount > 0 && !['withdrawal', 'transfer_out', 'purchase', 'loss'].includes(tx.type));
        if (!isInflow) return false;
      } else if (txDirectionFilter === 'out') {
        const isOutflow = tx.type === 'withdrawal' || tx.type === 'transfer_out' || tx.type === 'purchase' || tx.type === 'loss' || tx.type === 'fee';
        if (!isOutflow) return false;
      }

      // 2. Specific type filter
      if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;

      // 3. Number / Line Filter
      if (txNumberFilter !== 'all') {
        const matchNum =
          tx.walletNumberId === txNumberFilter ||
          tx.walletPhoneNumber === txNumberFilter ||
          tx.receivingPhoneNumber === txNumberFilter ||
          tx.senderPhoneNumber === txNumberFilter ||
          (tx.description && tx.description.includes(txNumberFilter));
        if (!matchNum) return false;
      }

      // 4. Text Search
      if (txSearchQuery) {
        const q = txSearchQuery.toLowerCase();
        const matchDesc = tx.description?.toLowerCase().includes(q);
        const matchRef = tx.referenceNumber?.toLowerCase().includes(q);
        const matchUser = tx.performedBy?.name?.toLowerCase().includes(q);
        const matchPhone = (tx.receivingPhoneNumber && tx.receivingPhoneNumber.includes(q)) || (tx.senderPhoneNumber && tx.senderPhoneNumber.includes(q));
        if (!matchDesc && !matchRef && !matchUser && !matchPhone) return false;
      }

      // 5. Date Range
      if (txStartDate || txEndDate) {
        const txDate = (tx.createdAt || '').split('T')[0];
        if (txStartDate && txDate < txStartDate) return false;
        if (txEndDate && txDate > txEndDate) return false;
      }

      return true;
    }).sort((a, b) => {
      if (txSort === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (txSort === 'amount_high') {
        return (b.amount || 0) - (a.amount || 0);
      } else if (txSort === 'amount_low') {
        return (a.amount || 0) - (b.amount || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest first
    });
  }, [transactions, txDirectionFilter, txTypeFilter, txNumberFilter, txSearchQuery, txStartDate, txEndDate, txSort]);

  const paginatedLedger = useMemo(() => {
    const start = (txCurrentPage - 1) * txPageSize;
    return filteredLedger.slice(start, start + txPageSize);
  }, [filteredLedger, txCurrentPage, txPageSize]);

  const txTotalPages = Math.ceil(filteredLedger.length / txPageSize) || 1;

  const handleExportLedger = () => {
    if (!wallet) return;
    const data = filteredLedger.map(tx => ({
      'رقم الحركة': tx.id,
      'نوع المعاملة': tx.type,
      'المبلغ': tx.amount,
      'العملة': tx.currency,
      'الرصيد قبل': tx.balanceBefore,
      'الرصيد بعد': tx.balanceAfter,
      'البيان': tx.description,
      'رقم المرجع/التذكرة': tx.referenceNumber || '—',
      'المنفذ': tx.performedBy?.name || 'النظام',
      'التاريخ والوقت': formatDateTime(tx.createdAt)
    }));
    exportToExcel(data, `كشف_حساب_محفظة_${wallet.name}`);
  };

  if (!wallet) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="4xl"
    >
      <div className="space-y-5 text-right -mt-4 text-xs">
        {/* Profile Header Banner */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border border-orange-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black shadow-lg shadow-orange-500/25">
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {isSystemWallet && (
                  <Badge variant="purple" size="sm" className="font-bold">
                    🔒 محفظة نظام آلية (System Wallet)
                  </Badge>
                )}
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{wallet.name}</h2>
                <Badge
                  variant={wallet.isFrozen ? 'danger' : isAllLinesExceeded ? 'danger' : isLimitWarning ? 'warning' : 'success'}
                  size="sm"
                >
                  {wallet.isFrozen ? '🔒 مجمدة' : isAllLinesExceeded ? '⚠️ كافة الخطوط ممتلئة' : isLimitWarning ? '⚡ خط متاح فقط' : '🟢 نشطة وجاهزة'}
                </Badge>
                <span className="px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono font-bold text-[11px]">
                  {wallet.currency}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                {isSystemWallet ? (
                  <>
                    <span className="text-purple-400 font-bold">حساب نظام محاسبي آلي</span>
                    <span>•</span>
                    <span>سجل تراكمي بدون خطوط</span>
                    <span>•</span>
                    <span className="font-mono text-zinc-300 font-bold">{wallet.accountNumber}</span>
                  </>
                ) : (
                  <>
                    <span>{wallet.category || 'محفظة تشغيل كاش'}</span>
                    <span>•</span>
                    <span>{numbersList.length} خطوط مسجلة</span>
                    <span>•</span>
                    {numbersList.find(n => n.isPrimary) ? (
                      <span className="font-mono text-amber-400 font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" />
                        الرقم المفضل: {numbersList.find(n => n.isPrimary)?.phoneNumber} ({numbersList.find(n => n.isPrimary)?.accountHolderName})
                      </span>
                    ) : (
                      <span className="font-mono text-zinc-300 font-bold">{wallet.accountNumber || 'لا يوجد رقم رئيسي'}</span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
            {!isSystemWallet && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Receipt className="w-4 h-4 text-emerald-500" />}
                  onClick={() => setIsDepositVoucherOpen(true)}
                >
                  📝 سند إيداع
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<ArrowDownLeft className="w-4 h-4 text-emerald-500" />}
                  onClick={() => setIsDepositModalOpen(true)}
                >
                  + إيداع / استلام
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<ArrowUpRight className="w-4 h-4 text-rose-500" />}
                  onClick={() => setIsWithdrawModalOpen(true)}
                >
                  - سحب
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<ArrowRightLeft className="w-4 h-4 text-purple-400" />}
                  onClick={() => setIsTransferModalOpen(true)}
                >
                  ⇄ تحويل
                </Button>
                {onOpenEditModal && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Edit2 className="w-4 h-4 text-orange-500" />}
                    onClick={() => {
                      onClose();
                      onOpenEditModal(wallet);
                    }}
                  >
                    تعديل
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={handleDeleteWallet}
                  title="حذف المحفظة نهائياً من النظام"
                >
                  حذف المحفظة
                </Button>
              </>
            )}

            {isSystemWallet && (wallet.id === 'w_profits' || wallet.systemType === 'profits' || wallet.type === 'profits') && (
              <Button
                size="sm"
                variant="primary"
                icon={<Landmark className="w-4 h-4 text-white" />}
                onClick={() => setIsZeroProfitModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-sm"
              >
                تصفير وتحويل الأرباح للخزنة
              </Button>
            )}
          </div>
        </div>

        {/* System Wallet Info Banner */}
        {isSystemWallet && (
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <strong className="block text-purple-100 font-bold">🔒 هذه محفظة نظام آلية محمية (System Wallet)</strong>
              <p className="text-[11px] text-purple-300/90 mt-0.5 leading-relaxed">
                تتم إدارة وحركات هذه المحفظة آلياً بواسطة النظام فقط (تسجيل أرباح التذاكر المكتملة، الكاش باك، عمولات الإحالات، والأمانات). لا يُسمح بالتعديل أو الحذف أو الإيداع اليدوي لضمان سلامة السجلات المالية.
              </p>
            </div>
          </div>
        )}

        {/* KPI Metric Cards */}
        {isSystemWallet ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Actual Ledger Balance */}
            <Card className="p-3.5 bg-purple-500/5 border-purple-500/20">
              <span className="text-[11px] text-zinc-400 font-bold block mb-1">الرصيد الفعلي التراكمي</span>
              <strong className="text-lg font-black text-purple-400 font-mono block">
                {formatCurrency(wallet.balance, wallet.currency)}
              </strong>
              <span className="text-[10px] text-zinc-400 mt-1 block">رصيد دائن محاسبي في النظام</span>
            </Card>

            {/* 2. Inflows / Earned */}
            <Card className="p-3.5 bg-emerald-500/5 border-emerald-500/20">
              <span className="text-[11px] text-zinc-400 font-bold block mb-1">{systemMetrics?.earnedLabel}</span>
              <strong className="text-lg font-black text-emerald-500 font-mono block">
                {formatCurrency(systemMetrics?.totalInflow || wallet.totalReceived || 0, wallet.currency)}
              </strong>
              <span className="text-[10px] text-zinc-400 mt-1 block">إجمالي الوارد المحتسب آلياً</span>
            </Card>

            {/* 3. Outflows / Redeemed */}
            <Card className="p-3.5 bg-amber-500/5 border-amber-500/20">
              <span className="text-[11px] text-zinc-400 font-bold block mb-1">{systemMetrics?.spentLabel}</span>
              <strong className="text-lg font-black text-amber-500 font-mono block">
                {formatCurrency(systemMetrics?.totalOutflow || wallet.totalWithdrawn || 0, wallet.currency)}
              </strong>
              <span className="text-[10px] text-zinc-400 mt-1 block">تسويات وخصومات منفذة</span>
            </Card>

            {/* 4. Total Entries */}
            <Card className="p-3.5 bg-blue-500/5 border-blue-500/20">
              <span className="text-[11px] text-zinc-400 font-bold block mb-1">إجمالي القيود المسجلة</span>
              <strong className="text-lg font-black text-blue-500 font-mono block">
                {transactions.length} حركة
              </strong>
              <span className="text-[10px] text-zinc-400 mt-1 block">موثقة بدفتر الأستاذ</span>
            </Card>

            {/* 5. System Nature */}
            <Card className="p-3.5 bg-purple-500/10 border-purple-500/30 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-purple-300 font-bold">طبيعة الحساب</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-200 font-bold">آلي 100%</span>
              </div>
              <strong className="text-sm font-black text-purple-200 block">
                سجل نظامي غير مقيد ♾️
              </strong>
              <span className="text-[10px] text-purple-300/80 mt-1.5 block">
                سعة غير محدودة (بدون ليميت)
              </span>
            </Card>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Preferred vs Total Metrics Switcher */}
            {hasNumbers && (
              <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 font-bold">عرض المؤشرات بحسب:</span>
                  <div className="inline-flex p-0.5 rounded-xl bg-gray-100 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setMetricsMode('preferred')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        metricsMode === 'preferred'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>الرقم المفضل {preferredNumber?.phoneNumber ? `(${preferredNumber.phoneNumber})` : ''}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetricsMode('total')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        metricsMode === 'total'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>إجمالي كافة الخطوط ({numbersList.length})</span>
                    </button>
                  </div>
                </div>
                {metricsMode === 'preferred' && preferredNumber && (
                  <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    المحفظة تقرأ بيانات الرقم المفضل: {preferredNumber.phoneNumber} ({preferredNumber.accountHolderName})
                  </span>
                )}
              </div>
            )}

            {/* 1. Top 3 Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. الرصيد الحالي */}
              <Card className="p-3.5 bg-emerald-500/5 border-emerald-500/20 shadow-xs">
                <span className="text-[11px] text-zinc-400 font-bold block mb-1">
                  الرصيد الحالي {isPreferredMode && <span className="text-amber-400 font-mono font-bold">(المفضل ⭐)</span>}
                </span>
                <strong className="text-xl font-black text-emerald-500 font-mono block">
                  {formatCurrency(displayedCurrentBalance, wallet.currency)}
                </strong>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {isPreferredMode && preferredNumber
                    ? `رصيد خط: ${preferredNumber.phoneNumber}`
                    : 'جاهز للتحويل والسحب'}
                </span>
              </Card>

              {/* 2. إجمالي الوارد */}
              <Card className="p-3.5 bg-cyan-500/5 border-cyan-500/20 shadow-xs">
                <span className="text-[11px] text-zinc-400 font-bold block mb-1">
                  إجمالي الوارد {isPreferredMode && <span className="text-amber-400 font-mono font-bold">(المفضل ⭐)</span>}
                </span>
                <strong className="text-xl font-black text-cyan-400 font-mono block">
                  +{formatCurrency(displayedInflows, wallet.currency)}
                </strong>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {isPreferredMode && preferredNumber
                    ? `وارد خط: ${preferredNumber.phoneNumber}`
                    : 'إجمالي دفعات التذاكر والإيداع'}
                </span>
              </Card>

              {/* 3. إجمالي الصادر */}
              <Card className="p-3.5 bg-rose-500/5 border-rose-500/20 shadow-xs">
                <span className="text-[11px] text-zinc-400 font-bold block mb-1">
                  إجمالي الصادر {isPreferredMode && <span className="text-amber-400 font-mono font-bold">(المفضل ⭐)</span>}
                </span>
                <strong className="text-xl font-black text-rose-500 font-mono block">
                  -{formatCurrency(displayedOutflows, wallet.currency)}
                </strong>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {isPreferredMode && preferredNumber
                    ? `صادر خط: ${preferredNumber.phoneNumber}`
                    : 'سحوبات ومصروفات المحفظة'}
                </span>
              </Card>
            </div>

            {/* 2. Detailed Limits Breakdown (Receive vs Send Limits) */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-zinc-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>تفصيل حدود التشغيل (Limits)</span>
                    {isPreferredMode && preferredNumber && (
                      <span className="text-amber-400 font-mono text-[10px] font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        للرقم المفضل: {preferredNumber.phoneNumber}
                      </span>
                    )}
                  </span>
                </div>

                {/* Switcher: All vs Receive Only vs Send Only */}
                <div className="inline-flex p-0.5 rounded-xl bg-black/40 border border-zinc-700/60 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setLimitsViewMode('all')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      limitsViewMode === 'all'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    <span>الكل (استقبال وإرسال)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLimitsViewMode('receive')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      limitsViewMode === 'receive'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>📥 ليمت الاستقبال فقط</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLimitsViewMode('send')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      limitsViewMode === 'send'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>📤 ليمت الإرسال فقط</span>
                  </button>
                </div>
              </div>

              {/* Limits Cards Grid */}
              <div className={`grid gap-3 ${
                limitsViewMode === 'all' 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' 
                  : 'grid-cols-1 sm:grid-cols-2'
              }`}>
                {/* 1. ليمت الاستقبال اليومي */}
                {(limitsViewMode === 'all' || limitsViewMode === 'receive') && (
                  <Card className={`p-3 border transition-all ${
                    displayedDailyReceiveUsagePercentage >= 100
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : displayedDailyReceiveUsagePercentage >= 80
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-emerald-500/5 border-emerald-500/20'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        ليمت الاستقبال اليومي
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                        {displayedDailyReceiveUsagePercentage}%
                      </span>
                    </div>
                    <strong className={`text-base sm:text-lg font-black font-mono block ${
                      displayedDailyReceiveUsagePercentage >= 100 ? 'text-rose-500' : displayedDailyReceiveUsagePercentage >= 80 ? 'text-amber-500' : 'text-emerald-400'
                    }`}>
                      {displayedDailyReceiveLimit > 0 ? formatCurrency(displayedDailyReceiveRemaining, wallet.currency) : 'مفتوح'}
                    </strong>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700/60 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          displayedDailyReceiveUsagePercentage >= 100 ? 'bg-rose-500' : displayedDailyReceiveUsagePercentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${displayedDailyReceiveUsagePercentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1.5 font-mono">
                      <span>مستلم: {formatCurrency(displayedDailyReceived, wallet.currency)}</span>
                      <span>سقف: {formatCurrency(displayedDailyReceiveLimit, wallet.currency)}</span>
                    </div>
                  </Card>
                )}

                {/* 2. ليمت الاستقبال الشهري */}
                {(limitsViewMode === 'all' || limitsViewMode === 'receive') && (
                  <Card className={`p-3 border transition-all ${
                    displayedMonthlyReceiveUsagePercentage >= 100
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : displayedMonthlyReceiveUsagePercentage >= 80
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-cyan-500/5 border-cyan-500/20'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-cyan-400 font-bold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        ليمت الاستقبال الشهري
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                        {displayedMonthlyReceiveUsagePercentage}%
                      </span>
                    </div>
                    <strong className={`text-base sm:text-lg font-black font-mono block ${
                      displayedMonthlyReceiveUsagePercentage >= 100 ? 'text-rose-500' : displayedMonthlyReceiveUsagePercentage >= 80 ? 'text-amber-500' : 'text-cyan-400'
                    }`}>
                      {displayedMonthlyReceiveLimit > 0 ? formatCurrency(displayedMonthlyReceiveRemaining, wallet.currency) : 'سعة مفتوحة'}
                    </strong>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700/60 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          displayedMonthlyReceiveUsagePercentage >= 100 ? 'bg-rose-500' : displayedMonthlyReceiveUsagePercentage >= 80 ? 'bg-amber-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${displayedMonthlyReceiveUsagePercentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1.5 font-mono">
                      <span>مستلم: {formatCurrency(displayedMonthlyReceived, wallet.currency)}</span>
                      <span>سقف: {formatCurrency(displayedMonthlyReceiveLimit, wallet.currency)}</span>
                    </div>
                  </Card>
                )}

                {/* 3. ليمت الإرسال اليومي */}
                {(limitsViewMode === 'all' || limitsViewMode === 'send') && (
                  <Card className={`p-3 border transition-all ${
                    displayedDailySendUsagePercentage >= 100
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : displayedDailySendUsagePercentage >= 80
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-blue-500/5 border-blue-500/20'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-blue-400 font-bold flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        ليمت الإرسال اليومي
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">
                        {displayedDailySendUsagePercentage}%
                      </span>
                    </div>
                    <strong className={`text-base sm:text-lg font-black font-mono block ${
                      displayedDailySendUsagePercentage >= 100 ? 'text-rose-500' : displayedDailySendUsagePercentage >= 80 ? 'text-amber-500' : 'text-blue-400'
                    }`}>
                      {displayedDailySendLimit > 0 ? formatCurrency(displayedDailySendRemaining, wallet.currency) : 'مفتوح'}
                    </strong>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700/60 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          displayedDailySendUsagePercentage >= 100 ? 'bg-rose-500' : displayedDailySendUsagePercentage >= 80 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${displayedDailySendUsagePercentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1.5 font-mono">
                      <span>مُرسل: {formatCurrency(displayedDailySent, wallet.currency)}</span>
                      <span>سقف: {formatCurrency(displayedDailySendLimit, wallet.currency)}</span>
                    </div>
                  </Card>
                )}

                {/* 4. ليمت الإرسال الشهري */}
                {(limitsViewMode === 'all' || limitsViewMode === 'send') && (
                  <Card className={`p-3 border transition-all ${
                    displayedMonthlySendUsagePercentage >= 100
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : displayedMonthlySendUsagePercentage >= 80
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-purple-500/5 border-purple-500/20'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-purple-400 font-bold flex items-center gap-1">
                        <Send className="w-3.5 h-3.5" />
                        ليمت الإرسال الشهري
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300">
                        {displayedMonthlySendUsagePercentage}%
                      </span>
                    </div>
                    <strong className={`text-base sm:text-lg font-black font-mono block ${
                      displayedMonthlySendUsagePercentage >= 100 ? 'text-rose-500' : displayedMonthlySendUsagePercentage >= 80 ? 'text-amber-500' : 'text-purple-400'
                    }`}>
                      {displayedMonthlySendLimit > 0 ? formatCurrency(displayedMonthlySendRemaining, wallet.currency) : 'سعة مفتوحة'}
                    </strong>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700/60 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          displayedMonthlySendUsagePercentage >= 100 ? 'bg-rose-500' : displayedMonthlySendUsagePercentage >= 80 ? 'bg-amber-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${displayedMonthlySendUsagePercentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1.5 font-mono">
                      <span>مُرسل: {formatCurrency(displayedMonthlySent, wallet.currency)}</span>
                      <span>سقف: {formatCurrency(displayedMonthlySendLimit, wallet.currency)}</span>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-[#27272A] pb-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            نظرة عامة {isSystemWallet ? 'والتحليلات' : ''}
          </button>
          {!isSystemWallet && (
            <button
              onClick={() => setActiveTab('numbers')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'numbers'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Phone className="w-4 h-4" />
              إدارة أرقام وخطوط المحفظة ({numbersList.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <FileText className="w-4 h-4" />
            دفتر الأستاذ والحركات ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tickets'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <Ticket className="w-4 h-4" />
            التذاكر المرتبطة ({linkedTickets.length})
          </button>
          {!isSystemWallet && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Settings className="w-4 h-4" />
              الإعدادات والأمان
            </button>
          )}
        </div>

        {/* ============================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ============================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-fade-in">
            {isSystemWallet ? (
              <div className="space-y-4">
                {/* System Accounting Architecture Banner */}
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-purple-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>{systemMetrics?.systemTitle}</span>
                    </h3>
                    <Badge variant="purple" size="sm">محمي ومراقب آلياً 🔒</Badge>
                  </div>
                  <p className="text-xs text-purple-300/90 leading-relaxed">
                    {systemMetrics?.systemRole}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-purple-400 pt-2 border-t border-purple-500/20 font-mono">
                    <span>• السجل: دفتر الأستاذ العام (General Ledger)</span>
                    <span>• العملة: {wallet.currency}</span>
                    <span>• سقف العمليات: سعة مفتوحة كلياً (بدون قيود أو ليميت خطوط)</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Quick Numbers Overview Cards */
              <div className="space-y-3">
                {hasNumbers && (
                  <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-blue-500/10 text-blue-400">🔄</span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        <strong>نظام التبديل الآلي:</strong> المحفظة الأم وعاء مالي موحد لا يتعطل بامتلاء خط معين، بل يستمر بالتحويل بين الأرقام النشطة المتاحة.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className="text-emerald-500 font-bold">{availableLinesCount} خطوط جاهزة</span>
                      <span className="text-zinc-400">من أصل {activeNumbers.length}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-orange-500" />
                    <span>أرقام وخطوط الاستقبال والإرسال ({numbersList.length})</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('numbers')}
                    className="text-orange-500 hover:underline font-bold text-xs"
                  >
                    إدارة وفلترة الأرقام والـ Limits ←
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {numbersList.map(num => {
                    const stats = getNumberFilteredStats(num);
                    const isFrozen = num.status === 'frozen';
                    return (
                      <Card
                        key={num.id}
                        className={`p-3.5 space-y-2.5 transition-all border ${
                          isFrozen
                            ? 'bg-rose-500/5 border-rose-500/30'
                            : 'hover:border-orange-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <strong className={`font-mono text-sm font-bold ${isFrozen ? 'text-rose-400 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                              {num.phoneNumber}
                            </strong>
                            {num.isPrimary && (
                              <span className="px-1.5 py-0.2 rounded bg-orange-500/15 text-orange-500 text-[10px] font-bold">
                                رئيسي
                              </span>
                            )}
                            {isFrozen && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                                🔒 مجمد
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400 font-sans">{num.accountHolderName}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                          <div className="p-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            <span className="text-emerald-500 font-bold block">متبقي استقبال اليوم:</span>
                            <strong className="text-zinc-900 dark:text-zinc-100 block">
                              {formatCurrency(stats.remainingDailyReceive, wallet.currency)}
                            </strong>
                          </div>
                          <div className="p-1.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
                            <span className="text-blue-500 font-bold block">متبقي إرسال اليوم:</span>
                            <strong className="text-zinc-900 dark:text-zinc-100 block">
                              {formatCurrency(stats.remainingDailySend, wallet.currency)}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-gray-100 dark:border-zinc-800">
                          <span>عمليات: {stats.periodOpsCount}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(num.phoneNumber, num.id, 'رقم الخط')}
                            className="text-orange-500 hover:underline font-bold flex items-center gap-0.5"
                          >
                            <Copy className="w-3 h-3" /> نسخ الرقم
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>آخر الحركات والمعاملات المسجلة</span>
                </h3>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-orange-500 hover:underline font-bold text-xs"
                >
                  عرض كافة المعاملات ({transactions.length}) ←
                </button>
              </div>

              <div className="space-y-2">
                {transactions.slice(0, 5).map(tx => {
                  const isPos = isStoreWalletTxPositive(tx);
                  const displayAmount = Math.abs(tx.amount || 0);
                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                            isPos
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {isPos ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <strong className="text-zinc-900 dark:text-zinc-100 font-bold block">
                            {tx.description}
                          </strong>
                          <span className="text-[10px] text-zinc-400">
                            {formatDateTime(tx.createdAt)} • بواسطة {tx.performedBy?.name || 'النظام'} • مصدر: {tx.sourceName || tx.sourceType || 'مباشر'}
                          </span>
                        </div>
                      </div>

                      <div className="text-left font-mono">
                        <strong
                          className={`text-sm font-black block ${
                            isPos ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {isPos ? '+' : '-'}
                          {formatCurrency(displayAmount, tx.currency)}
                        </strong>
                        <span className="text-[10px] text-zinc-400">
                          الرصيد بعد: {formatCurrency(tx.balanceAfter, tx.currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: NUMBERS MANAGEMENT & ADVANCED FILTERS */}
        {/* ============================================================= */}
        {activeTab === 'numbers' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    إدارة أرقام وخطوط المحفظة ({numbersList.length})
                  </h3>
                  <p className="text-zinc-400 text-[11px]">
                    عرض تحليلات الإرسال والاستقبال المباشرة، المتبقي من حدود كل خط، والتحكم الفوري في تجميد الخطوط لمنع ظهورها في التذاكر.
                  </p>
                </div>

                {!isSystemWallet && (
                  isOwner ? (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Plus className="w-4 h-4" />}
                      onClick={() => {
                        setEditingNumber(null);
                        setNumPhone('');
                        setNumHolder('');
                        setNumDailyLimit(30000);
                        setNumLimit(200000);
                        setNumDailySendLimit(30000);
                        setNumMonthlySendLimit(200000);
                        setNumUsedReceived(0);
                        setNumUsedSent(0);
                        setNumInitialBalance(0);
                        setIsAddNumberModalOpen(true);
                      }}
                    >
                      + إضافة خط جديد
                    </Button>
                  ) : (
                    <span className="text-[11px] text-zinc-400 bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-700">
                      🔒 إضافة الأرقام متاحة للمالك فقط
                    </span>
                  )
                )}
              </div>

              {/* Red Urgent Alert for Owner if All Numbers Exhausted (Requirement #14) */}
              {isAllLinesExceeded && isOwner && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border-2 border-rose-500 text-rose-300 text-xs flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                    <div>
                      <strong className="block text-rose-100 font-bold text-sm">
                        🚨 تنبيه أحمر للمالك: جميع أرقام وخطوط المحفظة وصلت للحد الأقصى (Limit)!
                      </strong>
                      <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">
                        استنفدت كافة خطوط المحفظة حدود الاستقبال الشهرية أو اليومية. لا يمكن استقبال أي دفعات جديدة حتى تقوم بإضافة خط جديد.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      setEditingNumber(null);
                      setNumPhone('');
                      setNumHolder('');
                      setNumDailyLimit(30000);
                      setNumLimit(200000);
                      setNumDailySendLimit(30000);
                      setNumMonthlySendLimit(200000);
                      setNumUsedReceived(0);
                      setNumUsedSent(0);
                      setNumInitialBalance(0);
                      setIsAddNumberModalOpen(true);
                    }}
                  >
                    + إضافة خط فوراً
                  </Button>
                </div>
              )}

              {/* Advanced Period Filter Toolbar */}
              <div className="flex items-center gap-2 flex-wrap bg-gray-50 dark:bg-zinc-900/60 p-2 rounded-2xl border border-gray-200 dark:border-zinc-800 text-xs">
                <span className="text-zinc-400 font-bold text-[11px] ml-1">تصفية الفترة:</span>
                <DateRangeFilter
                  startDate={numStartDate}
                  endDate={numEndDate}
                  onStartDateChange={setNumStartDate}
                  onEndDateChange={setNumEndDate}
                  onReset={() => {
                    setNumStartDate('');
                    setNumEndDate('');
                  }}
                  label="فلتر الفترة الزمنية للأرقام"
                />
              </div>
            </div>

            {/* Comprehensive Numbers Metrics Table */}
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-[#27272A]">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 dark:bg-zinc-900/80 border-b border-gray-200 dark:border-[#27272A] text-zinc-400 font-bold">
                  <tr>
                    <th className="p-3">رقم الهاتف / المعرف</th>
                    <th className="p-3">اسم صاحب الخط</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">متبقي الاستقبال (يومي / شهري)</th>
                    <th className="p-3">متبقي الإرسال (يومي / شهري)</th>
                    <th className="p-3">الرصيد الحالي للخط</th>
                    <th className="p-3">إجمالي الاستقبال (الفترة)</th>
                    <th className="p-3">إجمالي الإرسال (الفترة)</th>
                    <th className="p-3 text-center">العمليات</th>
                    <th className="p-3 text-center">إجراءات وتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 font-mono">
                  {numbersList.map((num, idx) => {
                    const isFrozen = num.status === 'frozen';
                    const stats = getNumberFilteredStats(num);

                    // Exact 4 status values: آمن / قرب الليمت / وصل الليمت / معطّل يدوي
                    const isManualDisabled = num.status === 'disabled' || isFrozen;
                    const isDailyFull = stats.remainingDailyReceive <= 0;
                    const isMonthlyFull = stats.remainingMonthlyReceive <= 0;
                    const isReachedLimit = num.status === 'limit_reached' || isDailyFull || isMonthlyFull;
                    const isNearLimit = !isReachedLimit && !isManualDisabled && (
                      ((num.dailyReceived || 0) / (num.dailyLimit || 30000) >= 0.8) ||
                      ((num.monthlyReceived || 0) / (num.monthlyLimit || 200000) >= 0.8)
                    );

                    const statusLabel = isManualDisabled
                      ? 'معطّل يدوي'
                      : isReachedLimit
                      ? 'وصل الليمت'
                      : isNearLimit
                      ? 'قرب الليمت'
                      : 'آمن';

                    const statusBadgeStyle = isManualDisabled
                      ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      : isReachedLimit
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : isNearLimit
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';

                    return (
                      <tr
                        key={num.id}
                        className={`transition-colors ${
                          isFrozen
                            ? 'bg-rose-500/5 hover:bg-rose-500/10'
                            : isReachedLimit
                            ? 'bg-rose-500/5 hover:bg-rose-500/10'
                            : 'hover:bg-gray-50/50 dark:hover:bg-zinc-900/40'
                        }`}
                      >
                        <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className={isFrozen ? 'line-through text-rose-400' : ''}>{num.phoneNumber}</span>
                          {num.isPrimary && (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-bold flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-amber-400" /> مفضل
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-sans text-zinc-700 dark:text-zinc-300">{num.accountHolderName}</td>
                        <td className="p-3 font-sans">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] w-fit flex items-center gap-1 ${statusBadgeStyle}`}>
                            {isFrozen && <Lock className="w-2.5 h-2.5" />}
                            {statusLabel}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-[11px]">
                          <div className="space-y-0.5">
                            <span className="text-zinc-400 block font-mono">
                              يومي: <strong className={stats.remainingDailyReceive > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{formatCurrency(stats.remainingDailyReceive, wallet.currency)}</strong>
                            </span>
                            <span className="text-zinc-500 block font-mono text-[10px]">
                              شهري: {formatCurrency(stats.remainingMonthlyReceive, wallet.currency)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 font-sans text-[11px]">
                          <div className="space-y-0.5">
                            <span className="text-zinc-400 block font-mono">
                              يومي: <strong className="text-blue-400 font-bold">{formatCurrency(stats.remainingDailySend, wallet.currency)}</strong>
                            </span>
                            <span className="text-zinc-500 block font-mono text-[10px]">
                              شهري: {formatCurrency(stats.remainingMonthlySend, wallet.currency)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 font-bold font-mono">
                          <span className={stats.currentLineBalance > 0 ? 'text-emerald-400' : stats.currentLineBalance < 0 ? 'text-rose-400' : 'text-zinc-400'}>
                            {formatCurrency(stats.currentLineBalance, wallet.currency)}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-500">
                          +{formatCurrency(stats.periodReceived, wallet.currency)}
                        </td>
                        <td className="p-3 font-bold text-blue-500">
                          -{formatCurrency(stats.periodSent, wallet.currency)}
                        </td>
                        <td className="p-3 text-center font-bold text-zinc-700 dark:text-zinc-300">
                          {stats.periodOpsCount}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryNumber(num.id)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                num.isPrimary
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs'
                                  : 'bg-zinc-800 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10'
                              }`}
                              title={num.isPrimary ? 'هذا هو الرقم التشغيلي المفضل حالياً' : 'تعيين كرقم مفضل ورئيسي للمحفظة'}
                            >
                              <Star className={`w-3.5 h-3.5 ${num.isPrimary ? 'fill-amber-400 text-amber-400' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleFreezeNumber(num.id)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isFrozen
                                  ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                                  : 'bg-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
                              }`}
                              title={isFrozen ? 'فك تجميد الخط وتنشيطه' : 'تجميد الخط لمنع ظهوره في التذاكر'}
                            >
                              {isFrozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                            {!isSystemWallet && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNumber(num);
                                    setNumPhone(num.phoneNumber);
                                    setNumHolder(num.accountHolderName);
                                    setNumDailyLimit(num.dailyLimit || 30000);
                                    setNumLimit(num.monthlyLimit || 200000);
                                    setNumDailySendLimit(num.dailySendLimit || 30000);
                                    setNumMonthlySendLimit(num.monthlySendLimit || 200000);
                                    setIsAddNumberModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors cursor-pointer"
                                  title="تعديل الحدود"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNumber(num.id)}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: TRANSACTIONS LEDGER */}
        {/* ============================================================= */}
        {activeTab === 'transactions' && (
          <div className="space-y-3 animate-fade-in">
            {/* Quick Presets Bar for Ledger (Requirement #1) */}
            <div className="flex items-center justify-between gap-2 flex-wrap p-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-[#27272A]">
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
                    onClick={() => handleSetTxPreset(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      txDatePreset === p.id
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-white dark:bg-[#18181B] text-zinc-600 dark:text-zinc-300 hover:bg-orange-500/10 hover:text-orange-500 border border-gray-200 dark:border-[#27272A]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-zinc-400">إجمالي الحركات: {filteredLedger.length}</span>
              </div>
            </div>

              {/* Requirement #14: Filter Toolbar (نوع العملية: وارد/صادر/الكل, الرقم: رقم معين أو كل الأرقام, النطاق الزمني, الترتيب) */}
              <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* 1. Direction Filter: وارد / صادر / الكل */}
                  <div className="flex items-center gap-1 bg-white dark:bg-black/30 p-1 rounded-xl border border-gray-200 dark:border-zinc-800 text-xs font-bold">
                    <span className="text-zinc-400 px-1.5 text-[11px]">النوع:</span>
                    <button
                      type="button"
                      onClick={() => setTxDirectionFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        txDirectionFilter === 'all'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxDirectionFilter('in')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        txDirectionFilter === 'in'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'text-emerald-500 hover:bg-emerald-500/10'
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" /> وارد (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxDirectionFilter('out')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        txDirectionFilter === 'out'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'text-rose-500 hover:bg-rose-500/10'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> صادر (-)
                    </button>
                  </div>

                  {/* 2. Number / Line Filter */}
                  {numbersList.length > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-zinc-400 text-[11px] font-bold">الرقم:</span>
                      <select
                        value={txNumberFilter}
                        onChange={e => setTxNumberFilter(e.target.value)}
                        className="rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-3 py-1.5 text-zinc-900 dark:text-zinc-100 font-bold text-xs"
                      >
                        <option value="all">📱 كل الأرقام ({numbersList.length})</option>
                        {numbersList.map(n => (
                          <option key={n.id} value={n.phoneNumber}>
                            {n.phoneNumber} ({n.accountHolderName})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 3. Sorting Filter */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-zinc-400 text-[11px] font-bold">الترتيب:</span>
                    <select
                      value={txSort}
                      onChange={e => setTxSort(e.target.value as any)}
                      className="rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-3 py-1.5 text-zinc-900 dark:text-zinc-100 font-bold text-xs"
                    >
                      <option value="newest">🕒 الأحدث أولاً</option>
                      <option value="oldest">🕰️ الأقدم أولاً</option>
                      <option value="amount_high">💰 الأعلى مبلغاً</option>
                      <option value="amount_low">🪙 الأقل مبلغاً</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pt-2 border-t border-gray-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <Input
                      value={txSearchQuery}
                      onChange={e => setTxSearchQuery(e.target.value)}
                      placeholder="بحث برقم التذكرة، العميل، أو البيان..."
                      className="flex-1 min-w-[200px]"
                    />
                    <div className="w-full sm:w-44 shrink-0">
                      <SearchableSelect
                        options={txTypeOptions}
                        value={txTypeFilter}
                        onChange={val => setTxTypeFilter(val)}
                        allOptionLabel="كافة المعاملات"
                        placeholder="نوع المعاملة..."
                      />
                    </div>
                    <DateRangeFilter
                      startDate={txStartDate}
                      endDate={txEndDate}
                      onStartDateChange={(dt) => {
                        setTxStartDate(dt);
                        setTxDatePreset('custom');
                      }}
                      onEndDateChange={(dt) => {
                        setTxEndDate(dt);
                        setTxDatePreset('custom');
                      }}
                      onReset={handleResetTxDateFilter}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Download className="w-4 h-4" />}
                    onClick={handleExportLedger}
                  >
                    تصدير Excel
                  </Button>
                </div>
              </div>

              {/* Requirement #14 Table Structure: التاريخ والوقت | نوع العملية | الرقم | المبلغ | الرصيد بعد | من نفذ | رقم التذكرة | ملاحظة والبيان | الإجراءات */}
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-[#27272A]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 dark:bg-zinc-900/80 border-b border-gray-200 dark:border-[#27272A] text-zinc-400 font-bold">
                    <tr>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">نوع العملية</th>
                      <th className="p-3">الرقم</th>
                      <th className="p-3">المبلغ</th>
                      <th className="p-3">الرصيد بعد</th>
                      <th className="p-3">من نفذ</th>
                      <th className="p-3">رقم التذكرة</th>
                      <th className="p-3">ملاحظة والبيان</th>
                      <th className="p-3 text-center">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 font-mono">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-zinc-400 font-sans">
                          لا توجد معاملات مطابقة للفلاتر المحددة
                        </td>
                      </tr>
                    ) : (
                      paginatedLedger.map(tx => {
                        const linePhone = tx.walletPhoneNumber || tx.receivingPhoneNumber || tx.senderPhoneNumber;
                        const linkedTicket = findLinkedTicket(tx);
                        return (
                          <tr
                            key={tx.id}
                            onClick={() => setSelectedTransaction(tx)}
                            className="hover:bg-orange-500/5 dark:hover:bg-orange-500/10 transition-colors cursor-pointer group"
                            title="انقر لعرض تفاصيل المعاملة كاملة"
                          >
                            {/* 1. التاريخ والوقت */}
                            <td className="p-3 text-zinc-400 whitespace-nowrap">
                              {formatDateTime(tx.createdAt)}
                            </td>

                            {/* 2. نوع العملية */}
                            <td className="p-3 font-sans whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                  tx.type === 'deposit'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : tx.type === 'withdrawal'
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    : tx.type === 'transfer_in'
                                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                    : tx.type === 'transfer_out'
                                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                                    : tx.type === 'refund'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : tx.type === 'cashback'
                                    ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30'
                                    : tx.type === 'bond_deposit' || tx.type === 'compensation'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : tx.type === 'adjustment'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                }`}
                              >
                                {(tx.type === 'deposit' || tx.type === 'bond_deposit' || tx.type === 'compensation') && <ArrowDownLeft className="w-3 h-3 text-emerald-400" />}
                                {tx.type === 'withdrawal' && <ArrowUpRight className="w-3 h-3 text-rose-400" />}
                                {tx.type === 'transfer_in' && <ArrowDownLeft className="w-3 h-3 text-cyan-400" />}
                                {tx.type === 'transfer_out' && <ArrowUpRight className="w-3 h-3 text-orange-400" />}
                                {tx.type === 'refund' && <RotateCcw className="w-3 h-3 text-amber-400" />}
                                {tx.type === 'cashback' && <Sparkles className="w-3 h-3 text-fuchsia-400" />}
                                {tx.type === 'adjustment' && <Layers className="w-3 h-3 text-blue-400" />}
                                {tx.type === 'purchase' && <Ticket className="w-3 h-3 text-purple-400" />}
                                <span>
                                  {tx.type === 'deposit'
                                    ? 'إيداع'
                                    : tx.type === 'bond_deposit'
                                    ? 'سند إيداع بضاعة'
                                    : tx.type === 'compensation'
                                    ? 'تعويض مسترد'
                                    : tx.type === 'withdrawal'
                                    ? 'سحب'
                                    : tx.type === 'transfer_in'
                                    ? 'تحويل وارد'
                                    : tx.type === 'transfer_out'
                                    ? 'تحويل صادر'
                                    : tx.type === 'refund'
                                    ? 'استرداد'
                                    : tx.type === 'cashback'
                                    ? 'كاش باك'
                                    : tx.type === 'adjustment'
                                    ? ((tx.balanceAfter !== undefined && tx.balanceBefore !== undefined ? tx.balanceAfter >= tx.balanceBefore : (tx.amount || 0) >= 0) ? 'تسوية إضافة' : 'تسوية خصم')
                                    : 'شحن تذكرة'}
                                </span>
                              </span>
                            </td>

                            {/* 3. الرقم */}
                            <td className="p-3 text-zinc-300 font-bold whitespace-nowrap">
                              {linePhone ? (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-orange-400" />
                                  <span>{linePhone}</span>
                                </span>
                              ) : (
                                <span className="text-zinc-500">—</span>
                              )}
                            </td>

                            {/* 4. المبلغ */}
                            {(() => {
                              const isPos = isStoreWalletTxPositive(tx);
                              const absVal = Math.abs(tx.amount || 0);
                              return (
                                <td
                                  className={`p-3 font-bold whitespace-nowrap ${
                                    isPos ? 'text-emerald-500' : 'text-rose-500'
                                  }`}
                                >
                                  {isPos ? '+' : '-'}
                                  {formatCurrency(absVal, tx.currency)}
                                </td>
                              );
                            })()}

                            {/* 5. الرصيد بعد */}
                            <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                              {formatCurrency(tx.balanceAfter, tx.currency)}
                            </td>

                            {/* 6. من نفذ */}
                            <td className="p-3 font-sans text-zinc-400 whitespace-nowrap">
                              {tx.performedBy?.name || 'النظام'}
                            </td>

                            {/* 7. رقم التذكرة */}
                            <td className="p-3 font-mono font-bold whitespace-nowrap">
                              {linkedTicket ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTicketForDetails(linkedTicket);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/30 transition-all font-mono font-bold cursor-pointer hover:scale-105 shadow-xs"
                                  title="فتح تذكرة الشحن كاملة 🎫"
                                >
                                  <Ticket className="w-3.5 h-3.5" />
                                  <span>{linkedTicket.ticketNumber}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                </button>
                              ) : (tx.sourceTicketNumber || tx.referenceNumber) ? (
                                <span className="text-orange-400/80">{tx.sourceTicketNumber || tx.referenceNumber}</span>
                              ) : (
                                <span className="text-zinc-500">—</span>
                              )}
                            </td>

                            {/* 8. ملاحظة والبيان */}
                            <td className="p-3 font-sans text-zinc-300 max-w-sm">
                              <div className="space-y-0.5">
                                <p className="truncate font-medium">{tx.description}</p>
                                {tx.customerName && (
                                  <span className="text-[10px] text-zinc-400 block">
                                    👤 {tx.customerName} {tx.sourceName ? `• مصدر: ${tx.sourceName}` : ''}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 9. الإجراءات والتفاصيل */}
                            <td className="p-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTransaction(tx)}
                                  className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-orange-500/15 hover:text-orange-500 text-zinc-400 transition-all cursor-pointer"
                                  title="عرض تفاصيل المعاملة كاملة"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {linkedTicket && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedTicketForDetails(linkedTicket)}
                                    className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/25 text-orange-500 transition-all cursor-pointer"
                                    title="فتح تذكرة الشحن كاملة 🎫"
                                  >
                                    <Ticket className="w-3.5 h-3.5" />
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
                <TablePagination
                  currentPage={txCurrentPage}
                  totalPages={txTotalPages}
                  totalItems={filteredLedger.length}
                  pageSize={txPageSize}
                  onPageChange={setTxCurrentPage}
                  onPageSizeChange={setTxPageSize}
                  pageSizeOptions={[10, 20, 50, 100]}
                  labelName="حركة ومعاملة"
                  themeColor="orange"
                />
              </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 4: LINKED TICKETS */}
        {/* ============================================================= */}
        {activeTab === 'tickets' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                التذاكر التي تم استقبال دفعاتها عبر هذه المحفظة ({filteredLinkedTickets.length})
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  value={ticketSearchQuery}
                  onChange={e => setTicketSearchQuery(e.target.value)}
                  placeholder="بحث برقم التذكرة أو العميل..."
                  className="w-48"
                />
                {/* Date Range Filter for Linked Tickets (Requirement #8) */}
                <DateRangeFilter
                  startDate={ticketStartDate}
                  endDate={ticketEndDate}
                  onStartDateChange={setTicketStartDate}
                  onEndDateChange={setTicketEndDate}
                  onReset={() => {
                    setTicketStartDate('');
                    setTicketEndDate('');
                    setTicketSearchQuery('');
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredLinkedTickets.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 border border-dashed border-gray-200 dark:border-[#27272A] rounded-2xl">
                  لا توجد تذاكر مطابقة للفترة المحددة
                </div>
              ) : (
                paginatedLinkedTickets.map(tkt => (
                  <div
                    key={tkt.id}
                    onClick={() => setSelectedTicketForDetails(tkt)}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-orange-500/50 hover:bg-orange-500/5 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs group"
                    title="انقر لفتح تفاصيل التذكرة كاملة"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                        <Ticket className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-orange-500 font-mono font-bold">{tkt.ticketNumber}</strong>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold">{tkt.customerName}</span>
                          <span className="text-zinc-400 font-mono">({tkt.customerPhone})</span>
                          {tkt.referenceNumber && (
                            <span className="font-mono text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                              {tkt.referenceNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {tkt.gameName} • {tkt.gameProductName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-left font-mono">
                        <strong className="text-emerald-500 text-sm font-black block">
                          +{formatCurrency(tkt.receivedAmount || tkt.requiredAmount)}
                        </strong>
                        <span className="text-[10px] text-zinc-400">{formatDateTime(tkt.createdAt)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicketForDetails(tkt);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض التذكرة</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <TablePagination
              currentPage={ticketCurrentPage}
              totalPages={ticketTotalPages}
              totalItems={filteredLinkedTickets.length}
              pageSize={ticketPageSize}
              onPageChange={setTicketCurrentPage}
              onPageSizeChange={setTicketPageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              labelName="تذكرة شحن"
              themeColor="orange"
            />
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 5: SETTINGS & LIMITS */}
        {/* ============================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-orange-500" />
                <span>إعدادات وحدود الأمان للمحفظة</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800">
                  <div>
                    <strong className="text-zinc-900 dark:text-zinc-100 block">حالة تجميد المحفظة</strong>
                    <span className="text-zinc-400 text-[11px]">عند التجميد يمنع استقبال أي دفعات جديدة من التذاكر</span>
                  </div>
                  <Button
                    size="sm"
                    variant={wallet.isFrozen ? 'primary' : 'outline'}
                    icon={wallet.isFrozen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4 text-rose-500" />}
                    onClick={handleToggleFreeze}
                    disabled={isSystemWallet}
                  >
                    {wallet.isFrozen ? 'إلغاء التجميد وتنشيط' : 'تجميد المحفظة'}
                  </Button>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 space-y-1 text-xs">
                  <strong className="text-zinc-900 dark:text-zinc-100 block">ملاحظات المحفظة</strong>
                  <p className="text-zinc-400 leading-relaxed">{wallet.notes || 'لا توجد ملاحظات مسجلة لهذه المحفظة.'}</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* SUB-MODAL 1: MANUAL DEPOSIT WITH MANDATORY SOURCE */}
      {/* ============================================================= */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title={`💰 استلام وإيداع نقدي في محفظة: ${wallet.name}`}
        subtitle="تسجيل واستلام مبلغ مع الإلزام بتحديد مصدر العملية للتوثيق المالي"
        maxWidth="md"
      >
        <form onSubmit={handleDepositSubmit} className="space-y-4 text-right text-xs">
          <div>
            <label className="block text-zinc-400 font-bold mb-1">مبلغ الإيداع / الاستلام ({wallet.currency}) *</label>
            <Input
              type="number"
              value={depositAmount}
              onChange={e => setDepositAmount(Number(e.target.value))}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-bold mb-1">مصدر عملية الاستلام *</label>
            <select
              value={depositSourceType}
              onChange={e => setDepositSourceType(e.target.value)}
              className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 font-bold"
              required
            >
              <option value="ticket">🎟️ تذكرة بيع وشحن (Ticket)</option>
              <option value="manual_deposit">💵 إيداع يدوي مباشر (Manual Deposit)</option>
              <option value="transfer">⇄ تحويل من محفظة أخرى (Transfer)</option>
              <option value="refund">↩️ استرداد رصيد تذكرة (Refund)</option>
              <option value="adjustment">⚖️ تعديل وتسوية إدارية (Adjustment)</option>
              <option value="other">📌 مصدر آخر (حدد يدوياً)</option>
            </select>
          </div>

          {depositSourceType === 'other' && (
            <div>
              <label className="block text-zinc-400 font-bold mb-1">اسم / وصف المصدر الآخر *</label>
              <Input
                value={depositSourceName}
                onChange={e => setDepositSourceName(e.target.value)}
                placeholder="اكتب مصدر الدفعة بدقة..."
                required
              />
            </div>
          )}

          {depositSourceType === 'ticket' && (
            <div>
              <label className="block text-zinc-400 font-bold mb-1">رقم التذكرة المرجعية (اختياري)</label>
              <Input
                value={depositTicketNumber}
                onChange={e => setDepositTicketNumber(e.target.value)}
                placeholder="مثال: TKT-1001"
              />
            </div>
          )}

          {numbersList.length > 0 && (
            <div>
              <label className="block text-zinc-400 font-bold mb-1">الخط المستلم للدفعة (اختياري)</label>
              <select
                value={depositNumberId}
                onChange={e => setDepositNumberId(e.target.value)}
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-mono"
              >
                <option value="">-- بدون تحديد خط محدد --</option>
                {numbersList.map(num => (
                  <option key={num.id} value={num.id}>
                    {num.phoneNumber} ({num.accountHolderName})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-zinc-400 font-bold mb-1">البيان والملاحظات</label>
            <Input
              value={depositDesc}
              onChange={e => setDepositDesc(e.target.value)}
              placeholder="مثال: استلام دفعة من العميل / تغذية حساب"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
            <Button type="button" variant="outline" onClick={() => setIsDepositModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" icon={<CheckCircle2 className="w-4 h-4" />}>
              تأكيد الاستلام والإيداع
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* SUB-MODAL 2: MANUAL WITHDRAW */}
      {/* ============================================================= */}
      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        title={`📤 سحب نقدي من محفظة: ${wallet.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-right text-xs">
          <div>
            <label className="block text-zinc-400 font-bold mb-1">مبلغ السحب ({wallet.currency}) *</label>
            <Input
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(Number(e.target.value))}
              placeholder="0.00"
              required
            />
            <span className="text-[10px] text-zinc-400 mt-1 block">
              الرصيد المتاح: {formatCurrency(wallet.balance, wallet.currency)}
            </span>
          </div>

          {numbersList.length > 0 && (
            <div>
              <label className="block text-zinc-400 font-bold mb-1">الخط المرسل / المسحوب منه (اختياري)</label>
              <select
                value={withdrawNumberId}
                onChange={e => setWithdrawNumberId(e.target.value)}
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-mono"
              >
                <option value="">-- بدون تحديد خط --</option>
                {numbersList.map(num => (
                  <option key={num.id} value={num.id}>
                    {num.phoneNumber} ({num.accountHolderName})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-zinc-400 font-bold mb-1">بيان وسبب السحب</label>
            <Input
              value={withdrawDesc}
              onChange={e => setWithdrawDesc(e.target.value)}
              placeholder="مثال: سحب أرباح / مصروفات تشغيلية"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
            <Button type="button" variant="outline" onClick={() => setIsWithdrawModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" icon={<CheckCircle2 className="w-4 h-4" />}>
              تأكيد السحب
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* SUB-MODAL 3: TRANSFER TO ANOTHER WALLET */}
      {/* ============================================================= */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title={`⇄ تحويل أموال بين المحافظ (${wallet.name})`}
        subtitle="تحويل مباشر بين المحافظ مع دعم التحويل الآلي للعملات (جنيه / دولار) وتسجيل اللوجز وسعر الصرف"
        maxWidth="md"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4 text-right text-xs">
          <div>
            <label className="block text-zinc-400 font-bold mb-1">المحفظة المستلمة *</label>
            <select
              value={transferTargetWalletId}
              onChange={e => {
                setTransferTargetWalletId(e.target.value);
                const target = wallets.find(w => w.id === e.target.value);
                if (target && !transferCurrency) {
                  setTransferCurrency(wallet.currency);
                }
              }}
              className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 font-bold"
              required
            >
              <option value="">-- اختر المحفظة المستلمة --</option>
              {wallets
                .filter(w => w.id !== wallet.id && !w.isSystemWallet)
                .map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.currency}) — الرصيد: {formatCurrency(w.balance, w.currency)}
                  </option>
                ))}
            </select>
          </div>

          {/* Currency Selector (جنيه / دولار) */}
          <div>
            <label className="block text-zinc-400 font-bold mb-1">عملة التحويل المحددة *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransferCurrency('EGP')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                  transferCurrency === 'EGP'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                    : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🇪🇬 جنيه مصري (EGP)
              </button>
              <button
                type="button"
                onClick={() => setTransferCurrency('USD')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                  transferCurrency === 'USD'
                    ? 'bg-blue-500 text-white border-blue-500 shadow-xs'
                    : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                💵 دولار أمريكي (USD)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-bold mb-1">
                المبلغ المراد تحويله ({transferCurrency}) *
              </label>
              <Input
                type="number"
                value={transferAmount}
                onChange={e => setTransferAmount(Number(e.target.value))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-zinc-400 font-bold mb-1">
                رسوم التحويل ({wallet.currency})
              </label>
              <Input
                type="number"
                value={transferFees}
                onChange={e => setTransferFees(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Exchange Rate & Live Multi-Currency Conversion Preview */}
          {(() => {
            const targetW = wallets.find(w => w.id === transferTargetWalletId);
            const isCross = targetW && (wallet.currency !== targetW.currency || transferCurrency !== wallet.currency || transferCurrency !== targetW.currency);
            if (!targetW || transferAmount <= 0) return null;

            let sourceDeduction = transferAmount;
            if (transferCurrency !== wallet.currency) {
              sourceDeduction = wallet.currency === 'EGP' ? transferAmount * transferCustomRate : transferAmount / transferCustomRate;
            }
            let targetAddition = transferAmount;
            if (transferCurrency !== targetW.currency) {
              targetAddition = targetW.currency === 'EGP' ? transferAmount * transferCustomRate : transferAmount / transferCustomRate;
            }

            sourceDeduction = Math.round(sourceDeduction * 100) / 100;
            targetAddition = Math.round(targetAddition * 100) / 100;

            return (
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-blue-400">
                  <span>💱 التحويل التلقائي للعملات:</span>
                  <span>سعر الصرف: 1$ = {transferCustomRate} ج</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 font-mono text-zinc-200">
                  <span>سيتم خصم: <strong className="text-rose-400">{sourceDeduction} {wallet.currency}</strong></span>
                  <span>➔</span>
                  <span>سيصل للمستلم: <strong className="text-emerald-400">{targetAddition} {targetW.currency}</strong></span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400">
                  <span>تعديل سعر الصرف لهذه العملية:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={transferCustomRate}
                    onChange={e => setTransferCustomRate(parseFloat(e.target.value) || 50)}
                    className="w-20 rounded-lg bg-black/40 border border-blue-500/30 p-1 text-center font-mono text-blue-300 font-bold"
                  />
                </div>
              </div>
            );
          })()}

          <div>
            <label className="block text-zinc-400 font-bold mb-1">ملاحظات التحويل</label>
            <Input
              value={transferNotes}
              onChange={e => setTransferNotes(e.target.value)}
              placeholder="مثال: تغذية محفظة إنستاباي / سداد مورد"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
            <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" icon={<CheckCircle2 className="w-4 h-4" />}>
              تنفيذ التحويل المالي
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* SUB-MODAL 4: ADD/EDIT NUMBER WITH 4 INDEPENDENT LIMITS */}
      {/* ============================================================= */}
      <Modal
        isOpen={isAddNumberModalOpen}
        onClose={() => setIsAddNumberModalOpen(false)}
        title={editingNumber ? '✏️ تعديل بيانات وحدود الخط' : '➕ إضافة خط استقبال وإرسال جديد'}
        subtitle="تحديد حدود الاستقبال والإرسال اليومية والشهرية لحماية الخط من الحظر والتجميد"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveNumber} className="space-y-4 text-right text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-bold mb-1">رقم الهاتف / المعرف *</label>
              <Input
                value={numPhone}
                onChange={e => setNumPhone(e.target.value)}
                placeholder="مثال: 01012345678 أو username@instapay"
                required
              />
            </div>
            <div>
              <label className="block text-zinc-400 font-bold mb-1">اسم صاحب الخط *</label>
              <Input
                value={numHolder}
                onChange={e => setNumHolder(e.target.value)}
                placeholder="مثال: أحمد محمد (فودافون كاش)"
                required
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3">
            <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
              🛡️ حدود الاستقبال والإرسال للخط (Limits)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-emerald-500 font-bold text-[10px] mb-1">حد استقبال يومي *</label>
                <Input
                  type="number"
                  value={numDailyLimit}
                  onChange={e => setNumDailyLimit(Number(e.target.value))}
                  placeholder="30000"
                  required
                />
              </div>
              <div>
                <label className="block text-emerald-500 font-bold text-[10px] mb-1">حد استقبال شهري *</label>
                <Input
                  type="number"
                  value={numLimit}
                  onChange={e => setNumLimit(Number(e.target.value))}
                  placeholder="200000"
                  required
                />
              </div>
              <div>
                <label className="block text-blue-500 font-bold text-[10px] mb-1">حد إرسال يومي *</label>
                <Input
                  type="number"
                  value={numDailySendLimit}
                  onChange={e => setNumDailySendLimit(Number(e.target.value))}
                  placeholder="30000"
                  required
                />
              </div>
              <div>
                <label className="block text-blue-500 font-bold text-[10px] mb-1">حد إرسال شهري *</label>
                <Input
                  type="number"
                  value={numMonthlySendLimit}
                  onChange={e => setNumMonthlySendLimit(Number(e.target.value))}
                  placeholder="200000"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section: الاستخدام المسبق والرصيد الفعلي (Requirement #14) */}
          <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-orange-400 block text-xs">
                📊 الاستخدام المسبق والرصيد الفعلي (إذا كان الخط شغال مسبقاً قبل إضافته)
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">تحديد المتاح والمستخدم</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-zinc-400 font-bold text-[10px] mb-1">
                  المستلم مسبقاً هذا الشهر ({wallet.currency})
                </label>
                <Input
                  type="number"
                  value={numUsedReceived}
                  onChange={e => setNumUsedReceived(Math.max(0, Number(e.target.value)))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold text-[10px] mb-1">
                  المرسل مسبقاً هذا الشهر ({wallet.currency})
                </label>
                <Input
                  type="number"
                  value={numUsedSent}
                  onChange={e => setNumUsedSent(Math.max(0, Number(e.target.value)))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-emerald-400 font-bold text-[10px] mb-1">
                  الرصيد المالي المتواجد بالخط ({wallet.currency})
                </label>
                <Input
                  type="number"
                  value={numInitialBalance}
                  onChange={e => setNumInitialBalance(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Live Preview Bar */}
            <div className="p-2 rounded-lg bg-black/20 border border-white/5 grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div>
                <span className="text-zinc-400 block">المتبقي المتاح للاستقبال فوراً:</span>
                <strong className={Math.max(0, numLimit - numUsedReceived) > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {formatCurrency(Math.max(0, numLimit - numUsedReceived), wallet.currency)}
                </strong>
              </div>
              <div>
                <span className="text-zinc-400 block">المتبقي المتاح للإرسال فوراً:</span>
                <strong className={Math.max(0, numMonthlySendLimit - numUsedSent) > 0 ? 'text-blue-400 font-bold' : 'text-rose-400 font-bold'}>
                  {formatCurrency(Math.max(0, numMonthlySendLimit - numUsedSent), wallet.currency)}
                </strong>
              </div>
            </div>
          </div>

          <span className="text-[10px] text-zinc-400 block leading-relaxed">
            💡 سيقوم النظام بمنع اختيار الخط وتجميده في شاشات التذاكر والتحويلات تلقائياً عند تجاوزه لأي من هذه الحدود، والتحويل التلقائي للخط التالي المتاح.
          </span>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
            <Button type="button" variant="outline" onClick={() => setIsAddNumberModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" icon={<CheckCircle2 className="w-4 h-4" />}>
              {editingNumber ? 'حفظ التعديلات' : 'إضافة الخط'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Official Deposit Voucher Modal */}
      {isDepositVoucherOpen && (
        <DepositVoucherModal
          isOpen={isDepositVoucherOpen}
          onClose={() => setIsDepositVoucherOpen(false)}
          preselectedWalletId={wallet.id}
          onSuccess={() => {
            onWalletUpdated();
          }}
        />
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          transaction={selectedTransaction}
          linkedTicket={findLinkedTicket(selectedTransaction)}
          onOpenTicket={(tkt) => {
            setSelectedTicketForDetails(tkt);
          }}
        />
      )}

      {/* Linked Ticket Details Modal */}
      {selectedTicketForDetails && (
        <TicketDetailsModal
          isOpen={!!selectedTicketForDetails}
          onClose={() => setSelectedTicketForDetails(null)}
          ticket={selectedTicketForDetails}
          department={isDealerTicket(selectedTicketForDetails) ? 'dealers' : (department || 'customers')}
          onUpdateTicket={(updated) => {
            setSelectedTicketForDetails(updated);
            setRefreshKey(prev => prev + 1);
            onWalletUpdated();
          }}
        />
      )}

      {/* Zero Profit Wallet Modal */}
      <ZeroProfitWalletModal
        isOpen={isZeroProfitModalOpen}
        onClose={() => setIsZeroProfitModalOpen(false)}
        currentBalance={wallet?.balance || 0}
        onSuccess={() => {
          onWalletUpdated();
          setRefreshKey(prev => prev + 1);
        }}
      />
    </Modal>
  );
};
