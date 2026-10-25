import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { eventBus, SYSTEM_EVENTS } from '../../../services/eventBus';
import { SafeTransaction, SafeCategory, DailyClosureReport } from '../../../types/finance.types';
import { StoreWallet } from '../../../types/topup.types';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import { exportToExcel } from '../../../utils/excelExport';
import { DailySettlementModal } from './DailySettlementModal';
import { WalletProfileModal } from '../../tickets/WalletProfileModal';
import { DepositVoucherModal } from '../../finance/DepositVoucherModal';
import { CurrencyExchangeModal } from '../../../components/finance/CurrencyExchangeModal';
import {
  FinancialCalendarFilter,
  FinancialFilterState,
  FinancialPeriodMetrics,
  getPresetDateRange
} from './FinancialCalendarFilter';
import {
  Wallet,
  Landmark,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Printer,
  Download,
  Search,
  CheckCircle2,
  ShieldCheck,
  Receipt,
  FileText,
  CalendarCheck,
  Plus,
  RefreshCw,
  Coins,
  History,
  Layers,
  Award,
  Gift,
  Share2,
  DollarSign,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Pencil,
  Cpu
} from 'lucide-react';

export const CustomerFinanceVaultsTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Live data hooks
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Reactive subscription to tickets, storage, and wallet events
  useEffect(() => {
    // Initial recalculation on mount to guarantee 100% accurate live figures
    try {
      db.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets on mount:', e);
    }

    const onStoreWalletsUpdated = () => handleRefresh();
    const onJkrWalletsUpdated = () => handleRefresh();
    const onUnifiedWalletsUpdated = () => handleRefresh();
    const onStorage = () => handleRefresh();
    const onTicketsUpdated = () => {
      try {
        db.recalculateSystemWallets();
      } catch (err) {
        console.warn(err);
      }
      handleRefresh();
    };

    window.addEventListener('store_wallets_updated', onStoreWalletsUpdated);
    window.addEventListener('jkr_wallets_updated', onJkrWalletsUpdated);
    window.addEventListener('unified_wallets_updated', onUnifiedWalletsUpdated);
    window.addEventListener('tickets_updated', onTicketsUpdated);
    window.addEventListener('dealer_tickets_updated', onTicketsUpdated);
    window.addEventListener('storage', onStorage);

    const unsubTicket = eventBus.subscribe(SYSTEM_EVENTS.TICKET_UPDATED, () => {
      try {
        db.recalculateSystemWallets();
      } catch (err) {
        console.warn(err);
      }
      handleRefresh();
    });

    const unsubTicketCreated = eventBus.subscribe(SYSTEM_EVENTS.TICKET_CREATED, () => {
      try {
        db.recalculateSystemWallets();
      } catch (err) {
        console.warn(err);
      }
      handleRefresh();
    });

    const unsubCust = eventBus.subscribe(SYSTEM_EVENTS.CUSTOMER_UPDATED, () => {
      try {
        db.recalculateSystemWallets();
      } catch (err) {
        console.warn(err);
      }
      handleRefresh();
    });

    const unsubDealer = eventBus.subscribe('DEALER_UPDATED' as any, () => {
      try {
        db.recalculateSystemWallets();
      } catch (err) {
        console.warn(err);
      }
      handleRefresh();
    });

    return () => {
      window.removeEventListener('store_wallets_updated', onStoreWalletsUpdated);
      window.removeEventListener('jkr_wallets_updated', onJkrWalletsUpdated);
      window.removeEventListener('unified_wallets_updated', onUnifiedWalletsUpdated);
      window.removeEventListener('tickets_updated', onTicketsUpdated);
      window.removeEventListener('dealer_tickets_updated', onTicketsUpdated);
      window.removeEventListener('storage', onStorage);
      unsubTicket();
      unsubTicketCreated();
      unsubCust();
      unsubDealer();
    };
  }, []);

  const summary = useMemo(() => db.getMainVaultSummary(), [refreshTrigger]);
  const safeTransactions = useMemo(() => db.getSafeTransactions(), [refreshTrigger]);
  const allWallets = useMemo(() => db.getStoreWallets(), [refreshTrigger]);
  const allTickets = useMemo(() => db.getTickets(), [refreshTrigger]);
  const allCustomers = useMemo(() => db.getCustomers(), [refreshTrigger]);
  const dailyClosures = useMemo(() => db.getDailyClosures(), [refreshTrigger]);

  // System Wallets transferred from Tickets
  const systemWallets = useMemo(() => {
    return allWallets.filter(
      w =>
        w.isSystemWallet ||
        ['w_profits', 'w_cashback', 'w_trust', 'w_referrals', 'w_operating_expenses'].includes(w.id) ||
        w.type === 'profits' ||
        w.systemType === 'profits' ||
        w.systemType === 'cashback' ||
        w.systemType === 'referrals' ||
        w.systemType === 'trust' ||
        w.systemType === 'operating_expenses'
    );
  }, [allWallets]);

  // Customer Cashback live metrics for sync
  const customerCashbackMetrics = useMemo(() => {
    const totalBalance = Math.round(allCustomers.reduce((sum, c) => sum + (Number(c.cashbackBalance) || 0), 0) * 100) / 100;
    const totalEarned = Math.round(
      allCustomers.reduce((sum, c) => {
        const earned = Number(c.totalCashbackEarned) || 0;
        const current = Number(c.cashbackBalance) || 0;
        return sum + Math.max(earned, current);
      }, 0) * 100
    ) / 100;
    const totalRedeemed = Math.max(0, Math.round((totalEarned - totalBalance) * 100) / 100);
    return { balance: totalBalance, earned: totalEarned, redeemed: totalRedeemed };
  }, [allCustomers, refreshTrigger]);

  // Modals state
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [txType, setTxType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');
  const [amount, setAmount] = useState<number>(0);
  const [usdRate, setUsdRate] = useState<number>(49.83);
  const [category, setCategory] = useState<SafeCategory>('sales');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [opNumber, setOpNumber] = useState('');

  // Daily Settlement Modal State
  const [isDailySettlementOpen, setIsDailySettlementOpen] = useState(false);
  const [isDailyClosuresHistoryOpen, setIsDailyClosuresHistoryOpen] = useState(false);

  // System Wallet Profile & Deposit Voucher modals
  const [selectedWalletForProfile, setSelectedWalletForProfile] = useState<StoreWallet | null>(null);
  const [isWalletProfileOpen, setIsWalletProfileOpen] = useState(false);
  const [isDepositVoucherOpen, setIsDepositVoucherOpen] = useState(false);

  // Zero Vault Modal State
  const [isZeroVaultModalOpen, setIsZeroVaultModalOpen] = useState(false);
  const [newInitialBalanceInput, setNewInitialBalanceInput] = useState<number>(0);

  // Safe Transaction Edit & Delete states
  const [editingTx, setEditingTx] = useState<SafeTransaction | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editCategory, setEditCategory] = useState<SafeCategory>('other');
  const [editNotes, setEditNotes] = useState<string>('');
  const [deletingTx, setDeletingTx] = useState<SafeTransaction | null>(null);

  const handleOpenEditTx = (tx: SafeTransaction) => {
    setEditingTx(tx);
    setEditAmount(String(tx.currency === 'USD' ? (tx.usdAmount || tx.amount) : tx.amount));
    setEditDescription(tx.description || '');
    setEditCategory(tx.category || 'other');
    setEditNotes(tx.notes || '');
  };

  const handleSaveEditTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const numAmt = parseFloat(editAmount) || 0;
    if (numAmt <= 0) {
      showToast('error', 'مبلغ غير صحيح', 'يرجى إدخال مبلغ أكبر من الصفر');
      return;
    }
    const isUSD = editingTx.currency === 'USD';
    const rate = editingTx.usdExchangeRate || 50;
    const finalAmount = isUSD ? numAmt * rate : numAmt;
    const finalUsdAmount = isUSD ? numAmt : undefined;

    db.updateSafeTransaction(editingTx.id, {
      amount: finalAmount,
      usdAmount: finalUsdAmount,
      description: editDescription.trim(),
      category: editCategory,
      notes: editNotes.trim()
    }, user);

    showToast('success', 'تم تعديل الحركة بنجاح', `تم تحديث بيانات الحركة #${editingTx.operationNumber || editingTx.id}`);
    setEditingTx(null);
    handleRefresh();
  };

  const handleConfirmDeleteTx = () => {
    if (!deletingTx) return;
    db.deleteSafeTransaction(deletingTx.id, user, 'حذف يدوي بواسطة المستخدم');
    showToast('success', 'تم حذف الحركة بنجاح', `تم حذف حركة الخزنة #${deletingTx.operationNumber || deletingTx.id} وتعديل الرصيد تلقائياً.`);
    setDeletingTx(null);
    handleRefresh();
  };

  // Smart Financial Calendar Filter State
  const [calendarFilter, setCalendarFilter] = useState<FinancialFilterState>({
    dateFrom: '',
    dateTo: '',
    preset: 'custom',
    currency: 'all',
    txType: 'all',
    employee: '',
    source: '',
    destination: '',
    searchQuery: ''
  });
  const [isFilterActive, setIsFilterActive] = useState<boolean>(false);

  const availableEmployees = useMemo(() => {
    const list = safeTransactions.map(t => t.performedBy).filter(Boolean);
    return Array.from(new Set(list));
  }, [safeTransactions]);

  const handleResetFilter = () => {
    setCalendarFilter({
      dateFrom: '',
      dateTo: '',
      preset: 'custom',
      currency: 'all',
      txType: 'all',
      employee: '',
      source: '',
      destination: '',
      searchQuery: ''
    });
    setIsFilterActive(false);
  };

  const handleApplyFilter = () => {
    setIsFilterActive(true);
    showToast('success', 'تم تطبيق الفلتر', 'تم تحديث كافة المؤشرات وحركات الخزينة والمحافظ للفترة المحددة.');
  };

  // Filtered Ledger Transactions based on Calendar & Advanced Filters
  const filteredTransactions = useMemo(() => {
    return safeTransactions.filter(tx => {
      // Type
      if (calendarFilter.txType !== 'all') {
        if (calendarFilter.txType === 'cash_in' && tx.type !== 'cash_in') return false;
        if (calendarFilter.txType === 'cash_out' && tx.type !== 'cash_out') return false;
        if (calendarFilter.txType === 'transfer' && tx.type !== 'transfer' && tx.category !== 'wallet_transfer') return false;
        if (calendarFilter.txType === 'shift_settlement' && tx.category !== 'shift_settlement' && !tx.description?.includes('تصفية وردية')) return false;
        if (calendarFilter.txType === 'expense' && tx.category !== 'expense') return false;
        if (calendarFilter.txType === 'profit' && tx.category !== 'sales') return false;
      }

      // Currency
      if (calendarFilter.currency !== 'all' && (tx.currency || 'EGP') !== calendarFilter.currency) {
        return false;
      }

      // Date Range
      if (calendarFilter.dateFrom && tx.createdAt < calendarFilter.dateFrom + 'T00:00:00') {
        return false;
      }
      if (calendarFilter.dateTo && tx.createdAt > calendarFilter.dateTo + 'T23:59:59') {
        return false;
      }

      // Employee
      if (calendarFilter.employee && tx.performedBy !== calendarFilter.employee) {
        return false;
      }

      // Source / Destination
      if (calendarFilter.source && !tx.description?.toLowerCase().includes(calendarFilter.source.toLowerCase()) && !tx.notes?.toLowerCase().includes(calendarFilter.source.toLowerCase())) {
        return false;
      }
      if (calendarFilter.destination && !tx.description?.toLowerCase().includes(calendarFilter.destination.toLowerCase()) && !tx.notes?.toLowerCase().includes(calendarFilter.destination.toLowerCase())) {
        return false;
      }

      // Search Query
      if (calendarFilter.searchQuery.trim()) {
        const q = calendarFilter.searchQuery.toLowerCase();
        const matchesDesc = tx.description?.toLowerCase().includes(q);
        const matchesUser = tx.performedBy?.toLowerCase().includes(q);
        const matchesOp = tx.operationNumber?.toLowerCase().includes(q);
        const matchesRef = tx.referenceId?.toLowerCase().includes(q);
        const matchesNotes = tx.notes?.toLowerCase().includes(q);
        const matchesAmount = tx.amount.toString().includes(q);
        if (!matchesDesc && !matchesUser && !matchesOp && !matchesRef && !matchesNotes && !matchesAmount) return false;
      }

      return true;
    });
  }, [safeTransactions, calendarFilter]);

  // Dynamic Period Metrics Calculation
  const periodMetrics = useMemo<FinancialPeriodMetrics>(() => {
    let totalInflowsEGP = 0;
    let totalInflowsUSD = 0;
    let totalOutflowsEGP = 0;
    let totalOutflowsUSD = 0;
    let totalTransfersEGP = 0;
    let totalTransfersUSD = 0;
    let totalProfitsEGP = 0;
    let totalExpensesEGP = 0;

    const from = calendarFilter.dateFrom ? calendarFilter.dateFrom + 'T00:00:00' : '';
    const to = calendarFilter.dateTo ? calendarFilter.dateTo + 'T23:59:59' : '';

    for (const tx of safeTransactions) {
      if (from && tx.createdAt < from) continue;
      if (to && tx.createdAt > to) continue;

      const isUSD = tx.currency === 'USD';
      const uAmt = tx.usdAmount || (isUSD ? tx.amount : 0);
      const egpAmt = isUSD ? 0 : tx.amount;

      const isTransfer =
        tx.type === 'transfer' ||
        tx.category === 'wallet_transfer' ||
        tx.category === 'shift_settlement' ||
        tx.description?.includes('تحويل') ||
        tx.description?.includes('تصفية');

      if (isTransfer) {
        if (isUSD) totalTransfersUSD += uAmt;
        else totalTransfersEGP += egpAmt;
      }

      if (tx.type === 'cash_in' || (tx.type === 'settlement' && tx.amount >= 0)) {
        if (isUSD) totalInflowsUSD += uAmt;
        else totalInflowsEGP += egpAmt;
      } else if (tx.type === 'cash_out' || (tx.type === 'settlement' && tx.amount < 0)) {
        if (isUSD) totalOutflowsUSD += uAmt;
        else totalOutflowsEGP += Math.abs(egpAmt);
      }

      if (tx.category === 'expense' || (tx.type === 'cash_out' && !isTransfer)) {
        totalExpensesEGP += egpAmt;
      }
    }

    // Accurate period profits calculation from active tickets (retail)
    const activeRetailTickets = allTickets.filter(t => {
      if (t.status === 'canceled' || t.status === 'refunded') return false;
      const tDate = t.createdAt || t.updatedAt || '';
      if (from && tDate < from) return false;
      if (to && tDate > to) return false;
      return true;
    });

    const ticketsProfit = activeRetailTickets.reduce((sum, t) => {
      const p = t.netProfit !== undefined ? t.netProfit : (t.totalProfitMargin || 0);
      return sum + (Number(p) || 0);
    }, 0);

    // Any manual non-ticket deposits/withdrawals/adjustments on w_profits
    const profitTx = db.getStoreWalletTransactions('w_profits');
    let manualProfits = 0;
    for (const ptx of profitTx) {
      if (
        ptx.sourceType === 'ticket' ||
        ptx.sourceTicketNumber ||
        ptx.referenceNumber?.startsWith('TKT-') ||
        ptx.referenceNumber?.startsWith('DTKT-') ||
        ptx.description?.includes('تذكرة')
      ) {
        continue;
      }
      if (from && ptx.createdAt < from) continue;
      if (to && ptx.createdAt > to) continue;
      if (ptx.type === 'deposit') {
        manualProfits += ptx.amount;
      } else if (ptx.type === 'withdrawal' || ptx.type === 'adjustment') {
        manualProfits -= ptx.amount;
      }
    }

    if (!from && !to) {
      const pW = allWallets.find(w => w.id === 'w_profits' || w.systemType === 'profits' || w.type === 'profits');
      totalProfitsEGP = pW ? pW.balance : Math.max(0, ticketsProfit + manualProfits);
    } else {
      totalProfitsEGP = Math.max(0, ticketsProfit + manualProfits);
    }

    const netEGP = totalInflowsEGP - totalOutflowsEGP;
    const netUSD = totalInflowsUSD - totalOutflowsUSD;

    return {
      totalInflowsEGP: Math.round(totalInflowsEGP * 100) / 100,
      totalInflowsUSD: Math.round(totalInflowsUSD * 100) / 100,
      totalOutflowsEGP: Math.round(totalOutflowsEGP * 100) / 100,
      totalOutflowsUSD: Math.round(totalOutflowsUSD * 100) / 100,
      totalTransfersEGP: Math.round(totalTransfersEGP * 100) / 100,
      totalTransfersUSD: Math.round(totalTransfersUSD * 100) / 100,
      totalProfitsEGP: Math.round(totalProfitsEGP * 100) / 100,
      totalExpensesEGP: Math.round(totalExpensesEGP * 100) / 100,
      netEGP: Math.round(netEGP * 100) / 100,
      netUSD: Math.round(netUSD * 100) / 100,
      transactionCount: filteredTransactions.length
    };
  }, [safeTransactions, allWallets, allTickets, refreshTrigger, calendarFilter.dateFrom, calendarFilter.dateTo, filteredTransactions.length]);

  // Handle Add Transaction submit
  const handleAddTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast('error', 'قيمة غير صحيحة', 'يرجى إدخال مبلغ أكبر من الصفر');
      return;
    }

    const usdVal = currency === 'USD' ? amount : undefined;
    const usdRateVal = currency === 'USD' ? usdRate : undefined;
    const finalAmount = currency === 'USD' ? amount * usdRate : amount;

    if (txType === 'cash_out') {
      const avail = currency === 'USD' ? summary.balanceUSD : summary.balanceEGP;
      const needed = currency === 'USD' ? amount : finalAmount;
      if (needed > avail) {
        showToast(
          'error',
          'رصيد الخزينة غير كافٍ',
          `الرصيد المتاح حالياً بالخزينة (${currency === 'USD' ? `$${avail.toFixed(2)}` : formatCurrency(avail, 'EGP')}) لا يكفي لسحب ${currency === 'USD' ? `$${needed.toFixed(2)}` : formatCurrency(needed, 'EGP')}`
        );
        return;
      }
    }

    const newTx = db.addSafeTransaction(
      txType,
      finalAmount,
      category,
      description || (txType === 'cash_in' ? 'إيداع نقدي بالخزنة' : 'سحب نقدي من الخزنة'),
      user?.fullName || user?.username || 'مسؤول الحسابات',
      undefined,
      {
        currency,
        usdAmount: usdVal,
        usdExchangeRate: usdRateVal,
        operationNumber: opNumber.trim() || `TX-${Date.now().toString().slice(-6)}`,
        notes,
        user
      }
    );

    showToast('success', 'تم تسجيل العملية', `تم حفظ الحركة برقم ${newTx.operationNumber} وتحديث الرصيد`);
    setIsAddTxModalOpen(false);
    setAmount(0);
    setDescription('');
    setNotes('');
    setOpNumber('');
    handleRefresh();
  };

  // Handle Currency Exchange submit
  const handleExecuteExchange = (data: {
    exchangeType: 'buy_usd' | 'sell_usd';
    usdAmount: number;
    usdExchangeRate: number;
    description: string;
    notes?: string;
  }) => {
    try {
      const newTx = db.exchangeSafeCurrency(
        data.exchangeType,
        data.usdAmount,
        data.usdExchangeRate,
        data.description,
        user?.fullName || user?.username || 'مسؤول الحسابات',
        data.notes,
        user
      );
      showToast(
        'success',
        'تم تبديل العملة بنجاح 💱',
        data.exchangeType === 'buy_usd'
          ? `تم شراء $${data.usdAmount.toFixed(2)} وتغذية رصيد الدولار وخصم ${formatCurrency(newTx.amount)} من رصيد الجنيه`
          : `تم بيع $${data.usdAmount.toFixed(2)} وإيداع ${formatCurrency(newTx.amount)} في رصيد الجنيه بالخزنة`
      );
      setIsExchangeModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      showToast('error', 'تعذر تنفيذ التبديل', err.message || 'حدث خطأ أثناء تبديل العملة');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredTransactions.map(tx => ({
      'رقم العملية': tx.operationNumber || tx.id,
      'التاريخ والوقت': formatDateTime(tx.createdAt),
      'نوع الحركة':
        tx.type === 'exchange'
          ? tx.exchangeType === 'buy_usd'
            ? 'تبديل: شراء دولار'
            : 'تبديل: بيع دولار'
          : tx.type === 'cash_in'
          ? 'إيداع'
          : tx.type === 'cash_out'
          ? 'صرف'
          : 'تسوية',
      'المبلغ': tx.amount,
      'العملة': tx.currency || 'EGP',
      'سعر الصرف (ج.م)': tx.usdExchangeRate || '-',
      'الرصيد بعد الحركة': tx.currency === 'USD' ? `$${tx.balanceAfterUSD}` : `${tx.balanceAfter} ج.م`,
      'البيان': tx.description,
      'المسؤول': tx.performedBy,
      'الملاحظات': tx.notes || '-'
    }));
    exportToExcel(data, `حركات_الخزينة_${new Date().toISOString().split('T')[0]}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-right">
      {/* Top Main Vault Showcase Card */}
      <Card className="p-6 relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white">
                  الخزنة الرئيسية (Main System Safe)
                </h2>
                <Badge variant="success" size="sm">الخزنة المركزية 100%</Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                تحديث تلقائي لحظي لكافة الإيرادات، مبيعات التذاكر، والمصروفات، مع تسوية وإغلاق كل 24 ساعة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              icon={<History className="w-4 h-4 text-blue-500" />}
              onClick={() => setIsDailyClosuresHistoryOpen(true)}
            >
              سجل الإغلاقات اليومية ({dailyClosures.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<CalendarCheck className="w-4 h-4 text-emerald-500" />}
              onClick={() => setIsDailySettlementOpen(true)}
              className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              التسوية والإغلاق اليومي (24 ساعة)
            </Button>
            {user?.role === 'admin' && (
              <Button
                size="sm"
                variant="outline"
                icon={<RotateCcw className="w-4 h-4 text-rose-500" />}
                onClick={() => {
                  setNewInitialBalanceInput(0);
                  setIsZeroVaultModalOpen(true);
                }}
                className="border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              >
                تصفير الخزنة
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              icon={<ArrowLeftRight className="w-4 h-4 text-amber-500" />}
              onClick={() => setIsExchangeModalOpen(true)}
              className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold"
            >
              تبديل عملات (شراء / بيع دولار) 💱
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setTxType('cash_in');
                setIsAddTxModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              إضافة عملية للخزنة
            </Button>
          </div>
        </div>

        {/* 9 Required Main Vault Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
          {/* 1. EGP Balance */}
          <div className="p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-500 block">الرصيد بالجنيه المصري</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block mt-1">
              {formatCurrency(summary.balanceEGP)}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">النقدية الحالية بالجنيه</span>
          </div>

          {/* 2. USD Balance */}
          <div className="p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-500 block">الرصيد بالدولار</span>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400 block mt-1">
              ${summary.balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">النقدية الحالية بالدولار</span>
          </div>

          {/* 3. Average USD Buy Rate */}
          <div className="p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-500 block">متوسط سعر شراء الدولار</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400 block mt-1">
              {summary.avgUsdPurchaseRate.toFixed(2)} ج.م
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">متوسط التكلفة المرجح</span>
          </div>

          {/* 4. Total USD Present */}
          <div className="p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-500 block">إجمالي الدولار المشترى</span>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 block mt-1">
              ${summary.totalUsdPurchased.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">
              بتكلفة: {formatCurrency(summary.totalUsdCostEGP)}
            </span>
          </div>

          {/* 5. Total EGP Present */}
          <div className="p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-500 block">إجمالي الجنيه الموجود</span>
            <span className="text-lg font-black text-teal-600 dark:text-teal-400 block mt-1">
              {formatCurrency(summary.balanceEGP)}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">داخل قاصة الخزنة</span>
          </div>

          {/* 6. Total Revenue */}
          <div className="p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-500 block">إجمالي الإيرادات</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block mt-1">
              +{formatCurrency(summary.totalRevenueEGP)}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">المبيعات والتوريدات</span>
          </div>

          {/* 7. Total Expenses */}
          <div className="p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-500 block">إجمالي المصروفات</span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400 block mt-1">
              -{formatCurrency(summary.totalExpensesEGP)}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">المسحوبات والمصاريف</span>
          </div>

          {/* 8. Net Balance */}
          <div className="p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-500 block">صافي الرصيد الشامل</span>
            <span className="text-lg font-black text-purple-600 dark:text-purple-400 block mt-1">
              {formatCurrency(summary.netBalanceEGP)}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">جنيه + مقوم الدولار</span>
          </div>

          {/* 9. Last Updated */}
          <div className="p-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 sm:col-span-2">
            <span className="text-[11px] font-bold text-zinc-500 block">آخر تحديث مباشر</span>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {formatDateTime(summary.lastUpdated)}
            </span>
            <span className="text-[10px] text-emerald-500 block mt-0.5 font-semibold">
              ● متزامن لحظياً ولا يحتاج Refresh
            </span>
          </div>
        </div>
      </Card>

      {/* ============================================================= */}
      {/* 📅 [ فلتر التقويم المالي الذكي ] SMART FINANCIAL CALENDAR FILTER */}
      {/* ============================================================= */}
      <FinancialCalendarFilter
        filterState={calendarFilter}
        onFilterChange={setCalendarFilter}
        metrics={periodMetrics}
        availableEmployees={availableEmployees}
        onReset={handleResetFilter}
        onApply={handleApplyFilter}
        isApplied={isFilterActive}
      />

      {/* ============================================================= */}
      {/* 2️⃣ [ محافظ النظام المنقولة من قسم التذاكر ] SYSTEM WALLETS */}
      {/* ============================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-500" />
            <h3 className="text-base font-black text-zinc-900 dark:text-white">
              محافظ النظام التراكمية (نُقلت من قسم التذاكر)
            </h3>
            <Badge variant="info" size="sm">{systemWallets.length} محافظ رسمية</Badge>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                try {
                  db.recalculateSystemWallets();
                  handleRefresh();
                  showToast('success', 'تمت المزامنة الفورية', 'تمت إعادة مطابقة محافظ النظام التراكمية مع حركة التذاكر الحالية بنجاح.');
                } catch (e) {
                  console.error(e);
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20 transition-all cursor-pointer shadow-sm active:scale-95"
              title="إعادة احتساب ومزامنة فورية للمحافظ التراكمية مع التذاكر النشطة"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>مزامنة المحافظ</span>
            </button>
            <span className="text-xs text-zinc-500 hidden sm:inline">
              نفس منطق الحسابات وقاعدة البيانات 100%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {systemWallets.map(w => {
            const isProfits = w.id === 'w_profits' || w.systemType === 'profits' || w.type === 'profits';
            const isCashback = w.id === 'w_cashback' || w.systemType === 'cashback';
            const isTrust = w.id === 'w_trust' || w.systemType === 'trust';
            const isReferrals = w.id === 'w_referrals' || w.systemType === 'referrals';
            const isExpenses = w.id === 'w_operating_expenses' || w.systemType === 'operating_expenses';

            const displayBalance = isCashback ? customerCashbackMetrics.balance : w.balance;

            // Calculate period-specific activity when date filter is active
            const hasDateFilter = Boolean(calendarFilter.dateFrom || calendarFilter.dateTo);
            let periodIn = 0;
            let periodOut = 0;
            if (hasDateFilter) {
              const from = calendarFilter.dateFrom ? calendarFilter.dateFrom + 'T00:00:00' : '';
              const to = calendarFilter.dateTo ? calendarFilter.dateTo + 'T23:59:59' : '';
              if (isProfits) {
                const activeT = allTickets.filter(t => {
                  if (t.status === 'canceled' || t.status === 'refunded') return false;
                  const tDate = t.createdAt || t.updatedAt || '';
                  if (from && tDate < from) return false;
                  if (to && tDate > to) return false;
                  return true;
                });
                periodIn = Math.max(0, Math.round(activeT.reduce((sum, t) => sum + (Number(t.netProfit !== undefined ? t.netProfit : t.totalProfitMargin) || 0), 0) * 100) / 100);
                const wTxs = db.getStoreWalletTransactions(w.id);
                for (const tx of wTxs) {
                  if (tx.sourceType === 'ticket' || tx.sourceTicketNumber || tx.referenceNumber?.startsWith('TKT-') || tx.description?.includes('تذكرة')) continue;
                  if (from && tx.createdAt < from) continue;
                  if (to && tx.createdAt > to) continue;
                  if (tx.type === 'deposit') periodIn += tx.amount;
                  else if (tx.type === 'withdrawal' || tx.type === 'adjustment') periodOut += tx.amount;
                }
              } else {
                const wTxs = db.getStoreWalletTransactions(w.id);
                for (const tx of wTxs) {
                  if (from && tx.createdAt < from) continue;
                  if (to && tx.createdAt > to) continue;
                  if (tx.type === 'deposit') periodIn += tx.amount;
                  else if (tx.type === 'withdrawal' || tx.type === 'adjustment') periodOut += tx.amount;
                }
              }
            }

            return (
              <div
                key={w.id}
                onClick={() => {
                  const walletToOpen = isCashback
                    ? {
                        ...w,
                        balance: customerCashbackMetrics.balance,
                        totalReceived: customerCashbackMetrics.earned,
                        totalWithdrawn: customerCashbackMetrics.redeemed
                      }
                    : w;
                  setSelectedWalletForProfile(walletToOpen);
                  setIsWalletProfileOpen(true);
                }}
                className={`p-4 rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden backdrop-blur-sm ${
                  isProfits
                    ? 'bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 hover:border-emerald-500/60'
                    : isCashback
                    ? 'bg-gradient-to-b from-fuchsia-500/10 via-fuchsia-500/5 to-transparent border-fuchsia-500/30 hover:border-fuchsia-500/60'
                    : isTrust
                    ? 'bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 hover:border-amber-500/60'
                    : isExpenses
                    ? 'bg-gradient-to-b from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/30 hover:border-rose-500/60'
                    : 'bg-gradient-to-b from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/30 hover:border-purple-500/60'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 shadow-xs ${
                        isProfits
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : isCashback
                          ? 'bg-fuchsia-500/15 text-fuchsia-500'
                          : isTrust
                          ? 'bg-amber-500/15 text-amber-500'
                          : isExpenses
                          ? 'bg-rose-500/15 text-rose-500'
                          : 'bg-purple-500/15 text-purple-500'
                      }`}
                    >
                      {isProfits ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : isCashback ? (
                        <Gift className="w-5 h-5" />
                      ) : isTrust ? (
                        <Coins className="w-5 h-5" />
                      ) : isExpenses ? (
                        <Cpu className="w-5 h-5" />
                      ) : (
                        <Share2 className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {w.name}
                      </h4>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {isProfits
                          ? 'أرباح العمليات والتذاكر'
                          : isCashback
                          ? 'كاش باك العملاء المتاح'
                          : isTrust
                          ? 'ديون وأمانات المتجر'
                          : isExpenses
                          ? 'مصاريف التشغيل والسيرفرات'
                          : 'عمولات شركاء النجاح'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" size="sm">نظام</Badge>
                </div>

                {/* Balance */}
                <div className="py-3">
                  <span className="text-[11px] text-zinc-500 block">الرصيد التراكمي</span>
                  <span
                    className={`text-2xl font-black block mt-1 tracking-tight ${
                      isProfits
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isCashback
                        ? 'text-fuchsia-600 dark:text-fuchsia-400'
                        : isTrust
                        ? 'text-amber-600 dark:text-amber-400'
                        : isExpenses
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {formatCurrency(displayBalance)}
                  </span>

                  {/* Period Specific Movement Badge */}
                  {hasDateFilter && (
                    <div className="mt-2.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono space-y-1">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>حركة الفترة:</span>
                        <span className={periodIn - periodOut >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {periodIn - periodOut >= 0 ? '+' : ''}{formatCurrency(periodIn - periodOut)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9.5px]">
                        <span className="text-emerald-500">وارد: +{formatCurrency(periodIn)}</span>
                        <span className="text-rose-400">صادر: -{formatCurrency(periodOut)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer details */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>إجمالي الإيداعات: {formatCurrency(isCashback ? customerCashbackMetrics.earned : w.totalReceived || 0)}</span>
                  <span className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    عرض السجل ➔
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================= */}
      {/* 3️⃣ [ دفتر حركة الخزينة ] VAULT MOVEMENT LEDGER TABLE */}
      {/* ============================================================= */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              دفتر حركة الخزينة (Vault Movement Ledger)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              سجل تفصيلي موثق لكل مليم داخل أو خارج من الخزينة بالجنيه والدولار مع الرصيد قبل وبعد
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportExcel}
            >
              تصدير Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              طباعة
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="بحث بالبيان، المستخدم، رقم العملية، المرجع..."
              value={calendarFilter.searchQuery}
              onChange={e => setCalendarFilter(prev => ({ ...prev, searchQuery: e.target.value }))}
              icon={<Search className="w-4 h-4 text-zinc-400" />}
            />
          </div>

          <div>
            <select
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white focus:outline-hidden"
              value={calendarFilter.txType}
              onChange={e => setCalendarFilter(prev => ({ ...prev, txType: e.target.value as any }))}
            >
              <option value="all">كل الحركات</option>
              <option value="cash_in">إيداع (+)</option>
              <option value="cash_out">سحب / مصروف (-)</option>
              <option value="transfer">تحويل محافظ وخزائن 🔁</option>
              <option value="shift_settlement">تصفية وردية 🏦</option>
            </select>
          </div>

          <div>
            <select
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white focus:outline-hidden"
              value={calendarFilter.currency}
              onChange={e => setCalendarFilter(prev => ({ ...prev, currency: e.target.value as any }))}
            >
              <option value="all">كل العملات</option>
              <option value="EGP">جنيه مصري (EGP)</option>
              <option value="USD">دولار أمريكي (USD)</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white focus:outline-hidden"
              value={calendarFilter.dateFrom}
              onChange={e => setCalendarFilter(prev => ({ ...prev, dateFrom: e.target.value, preset: 'custom' }))}
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-3">رقم العملية</th>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3">نوع العملية</th>
                <th className="p-3">القيمة</th>
                <th className="p-3">العملة / الصرف</th>
                <th className="p-3">الرصيد قبل</th>
                <th className="p-3">الرصيد بعد</th>
                <th className="p-3">البيان والسبب</th>
                <th className="p-3">المستخدم</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-500">
                    لا توجد حركات مسجلة تطابق خيارات الفلترة
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const isExchange = tx.type === 'exchange';
                  const isBuyUsd = tx.exchangeType === 'buy_usd';
                  const isCashIn = tx.type === 'cash_in';
                  const isUSD = tx.currency === 'USD';

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-500/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {tx.operationNumber || tx.id.slice(-8)}
                      </td>
                      <td className="p-3 text-zinc-500">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="p-3">
                        {isExchange ? (
                          <Badge variant={isBuyUsd ? 'success' : 'info'} size="sm">
                            {isBuyUsd ? '💱 شراء دولار (EGP➔USD)' : '💱 بيع دولار (USD➔EGP)'}
                          </Badge>
                        ) : (
                          <Badge variant={isCashIn ? 'success' : 'danger'} size="sm">
                            {isCashIn ? 'إيداع نقدية' : 'سحب / مصروف'}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        {isExchange ? (
                          isBuyUsd ? (
                            <div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 block font-mono">
                                +${(tx.usdAmount || 0).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-rose-500 block font-mono">
                                (-{formatCurrency(tx.amount)})
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 block font-mono">
                                +{formatCurrency(tx.amount)}
                              </span>
                              <span className="text-[10px] text-rose-500 block font-mono">
                                (-${(tx.usdAmount || 0).toFixed(2)})
                              </span>
                            </div>
                          )
                        ) : (
                          <span
                            className={`font-bold font-mono ${
                              isCashIn
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isCashIn ? '+' : '-'}
                            {isUSD ? `$${(tx.usdAmount || tx.amount).toFixed(2)}` : formatCurrency(tx.amount)}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {isExchange ? (
                          <div>
                            <span className="font-bold text-amber-600 dark:text-amber-400 block">
                              صرافة عملات
                            </span>
                            <span className="text-[10px] text-zinc-400 block font-mono">
                              الصرف: {tx.usdExchangeRate || '-'} ج.م
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">
                              {tx.currency || 'EGP'}
                            </span>
                            {isUSD && tx.usdExchangeRate && (
                              <span className="block text-[10px] text-zinc-400 font-mono">
                                سعر الصرف: {tx.usdExchangeRate} ج
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-zinc-500 font-mono">
                        {isExchange ? (
                          <div>
                            <span className="text-[11px] block text-zinc-600 dark:text-zinc-300">
                              {formatCurrency(tx.balanceBefore || 0)}
                            </span>
                            <span className="text-[10px] text-blue-500 block">
                              ${(tx.balanceBeforeUSD || 0).toFixed(2)}
                            </span>
                          </div>
                        ) : tx.balanceBefore !== undefined ? (
                          isUSD ? (
                            `$${tx.balanceBefore.toFixed(2)}`
                          ) : (
                            formatCurrency(tx.balanceBefore)
                          )
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3 font-bold font-mono text-zinc-900 dark:text-white">
                        {isExchange ? (
                          <div>
                            <span className="text-[11px] block text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(tx.balanceAfter || 0)}
                            </span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 block">
                              ${(tx.balanceAfterUSD || 0).toFixed(2)}
                            </span>
                          </div>
                        ) : isUSD && tx.balanceAfterUSD !== undefined ? (
                          `$${tx.balanceAfterUSD.toFixed(2)}`
                        ) : (
                          formatCurrency(tx.balanceAfter)
                        )}
                      </td>
                      <td className="p-3 max-w-xs truncate text-zinc-700 dark:text-zinc-300" title={tx.description}>
                        {tx.description}
                        {tx.notes && <span className="block text-[10px] text-zinc-400 truncate">{tx.notes}</span>}
                      </td>
                      <td className="p-3 text-zinc-500">
                        {tx.performedBy}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTx(tx)}
                            className="p-1 rounded-lg hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors"
                            title="تعديل بيانات الحركة"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTx(tx)}
                            className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors"
                            title="حذف الحركة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ============================================================= */}
      {/* 4️⃣ MODALS */}
      {/* ============================================================= */}

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isAddTxModalOpen}
        onClose={() => setIsAddTxModalOpen(false)}
        title={txType === 'cash_in' ? '💵 إيداع نقدية بالخزنة الرئيسية' : '💸 سحب نقدية من الخزنة الرئيسية'}
        maxWidth="lg"
      >
        <form onSubmit={handleAddTransactionSubmit} className="space-y-4 text-right">
          {/* Currency Exchange Quick Switch Banner */}
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <ArrowLeftRight className="w-4 h-4 shrink-0" />
              <span>هل تريد تبديل العملة وشراء أو بيع دولار بالجنيه؟</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddTxModalOpen(false);
                setIsExchangeModalOpen(true);
              }}
              className="font-bold underline text-amber-600 dark:text-amber-400 hover:text-amber-500 cursor-pointer"
            >
              فتح نافذة الصرافة 💱
            </button>
          </div>

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            <button
              type="button"
              onClick={() => setTxType('cash_in')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                txType === 'cash_in'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              إيداع للخزنة (+)
            </button>
            <button
              type="button"
              onClick={() => setTxType('cash_out')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                txType === 'cash_out'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              سحب من الخزنة (-)
            </button>
          </div>

          {/* Currency Selection */}
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              العملة:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCurrency('EGP')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                  currency === 'EGP'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                }`}
              >
                🇪🇬 جنيه مصري (EGP)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                  currency === 'USD'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                }`}
              >
                🇺🇸 دولار أمريكي (USD)
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              {currency === 'USD' ? 'عدد الدولارات (يشمل السنتات والكسور):' : 'المبلغ بالجنيه المصري:'}
            </label>
            <Input
              type="number"
              step="0.01"
              required
              min="0.01"
              placeholder={currency === 'USD' ? '100.50' : '5000'}
              value={amount || ''}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* If USD: Exchange rate and total EGP preview */}
          {currency === 'USD' && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
              <div>
                <label className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block mb-1">
                  سعر شراء الدولار بالجنيه وقت العملية:
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={usdRate}
                  onChange={e => setUsdRate(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-500/20 text-blue-900 dark:text-blue-200">
                <span>المعادل الإجمالي بالجنيه:</span>
                <span className="font-bold font-mono">
                  {formatCurrency(amount * usdRate)}
                </span>
              </div>
            </div>
          )}

          {/* Reason / Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                سبب الإضافة / التصنيف:
              </label>
              <select
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                value={category}
                onChange={e => setCategory(e.target.value as any)}
              >
                <option value="sales">مبيعات تذاكر</option>
                <option value="customer_deposit">إيداع مباشر</option>
                <option value="capital">رأس مال / تمويل</option>
                <option value="debt_payment">سداد / تحصيل دين</option>
                <option value="expense">مصروفات</option>
                <option value="salary">رواتب</option>
                <option value="settlement">تسوية</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                رقم العملية (اختياري):
              </label>
              <Input
                placeholder={`TX-${Date.now().toString().slice(-6)}`}
                value={opNumber}
                onChange={e => setOpNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              البيان التوضيحي:
            </label>
            <Input
              required
              placeholder="مثال: توريد مبيعات وردية شحن ألعاب، شراء دفعة 100 دولار..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              ملاحظات إضافية:
            </label>
            <textarea
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
              rows={2}
              placeholder="ملاحظات توثيقية للحركة..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddTxModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className={txType === 'cash_in' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}
            >
              {txType === 'cash_in' ? 'تأكيد الإيداع' : 'تأكيد السحب'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Currency Exchange Modal */}
      <CurrencyExchangeModal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        vaultName="الخزنة الرئيسية (Main System Safe)"
        balanceEGP={summary.balanceEGP}
        balanceUSD={summary.balanceUSD}
        avgUsdPurchaseRate={summary.avgUsdPurchaseRate}
        onConfirmExchange={handleExecuteExchange}
      />

      {/* Daily Settlement Modal */}
      <DailySettlementModal
        isOpen={isDailySettlementOpen}
        onClose={() => setIsDailySettlementOpen(false)}
        onSettlementSaved={handleRefresh}
      />

      {/* Daily Closures History Modal */}
      <Modal
        isOpen={isDailyClosuresHistoryOpen}
        onClose={() => setIsDailyClosuresHistoryOpen(false)}
        title="📑 سجل تقارير الإغلاق والتسويات اليومية"
        maxWidth="4xl"
      >
        <div className="space-y-4 text-right">
          {dailyClosures.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              لم يتم حفظ أي إغلاق يومي بعد. يمكنك إجراء تسوية الآن من زر "التسوية والإغلاق اليومي".
            </div>
          ) : (
            <div className="space-y-3">
              {dailyClosures.map(c => (
                <div key={c.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-900 dark:text-white">
                        إغلاق يوم: {c.date}
                      </span>
                      <Badge variant="success" size="sm">معتمد</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      أغلق بواسطة: {c.closedBy} في {formatDateTime(c.closedAt)} | {c.totalTransactionsCount} حركة
                    </p>
                    {c.notes && <p className="text-xs text-zinc-400 mt-0.5">{c.notes}</p>}
                  </div>

                  <div className="text-left font-mono">
                    <span className="text-xs text-zinc-500 block">رصيد الإغلاق (ج.م)</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(c.closingBalanceEGP)}
                    </span>
                    <span className="text-[11px] text-blue-500 block">
                      ${c.closingBalanceUSD.toFixed(2)} (متوسط: {c.avgUsdPurchaseRate.toFixed(2)} ج)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* System Wallet Profile Modal */}
      {selectedWalletForProfile && (
        <WalletProfileModal
          isOpen={isWalletProfileOpen}
          onClose={() => setIsWalletProfileOpen(false)}
          walletId={selectedWalletForProfile.id}
          onWalletUpdated={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {/* Zero Vault Confirmation Modal */}
      {isZeroVaultModalOpen && (
        <Modal
          isOpen={isZeroVaultModalOpen}
          onClose={() => setIsZeroVaultModalOpen(false)}
          title="🔄 تأكيد تصفير الخزنة الرئيسية (Zero Main Vault)"
          maxWidth="md"
        >
          <div className="space-y-4 text-right text-xs">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>تنبيه: سيتم مسح سجل حركات الخزنة وتصفير الرصيد</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                هذا الإجراء سيقوم بمسح كافة حركات الإيداع والسحب المقيدة بالخزنة، وتصفير الرصيد بالدولار ($0.00)، وإعادة تعيين الرصيد بالجنيه للقيمة التي تحددها بالأسفل.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                الرصيد الافتتاحي الجديد للخزنة بالجنيه المصري (اتركه 0 لتصفير تام):
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                value={newInitialBalanceInput}
                onChange={e => setNewInitialBalanceInput(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsZeroVaultModalOpen(false)}
              >
                إلغاء وتراجع
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => {
                  db.zeroMainVault(newInitialBalanceInput || 0);
                  showToast('success', 'تم تصفير الخزنة بنجاح', `تم تصفير رصيد وحركات الخزنة الرئيسية ورصيدها الحالي الآن: ${newInitialBalanceInput || 0} ج.م`);
                  setIsZeroVaultModalOpen(false);
                  handleRefresh();
                }}
                className="font-bold"
              >
                تأكيد تصفير الخزنة الآن 🔄
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Safe Transaction Modal */}
      {editingTx && (
        <Modal
          isOpen={Boolean(editingTx)}
          onClose={() => setEditingTx(null)}
          title={`✏️ تعديل حركة الخزنة: #${editingTx.operationNumber || editingTx.id}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEditTx} className="space-y-4 text-right text-xs" dir="rtl">
            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                المبلغ ({editingTx.currency || 'EGP'}):
              </label>
              <Input
                type="number"
                step="any"
                min="0.01"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                placeholder="المبلغ"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                البيان / الوصف:
              </label>
              <Input
                type="text"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="وصف الحركة"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                التصنيف:
              </label>
              <select
                value={editCategory}
                onChange={e => setEditCategory(e.target.value as SafeCategory)}
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-800 dark:text-zinc-200 text-xs outline-none"
              >
                <option value="customer_deposit">إيداع عميل مباشر</option>
                <option value="capital">رأس مال وتمويل</option>
                <option value="expense">مصروف تشغيلي</option>
                <option value="debt_collection">تحصيل ديون</option>
                <option value="other">أخرى / تسوية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                ملاحظات إضافية:
              </label>
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={2}
                placeholder="ملاحظات..."
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-800 dark:text-zinc-200 text-xs outline-none resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingTx(null)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" icon={<Pencil className="w-3.5 h-3.5" />}>
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Safe Transaction Confirmation Modal */}
      {deletingTx && (
        <Modal
          isOpen={Boolean(deletingTx)}
          onClose={() => setDeletingTx(null)}
          title={`🗑️ حذف حركة الخزنة: #${deletingTx.operationNumber || deletingTx.id}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-right text-xs" dir="rtl">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 space-y-1">
              <strong className="font-bold text-sm block">هل أنت متأكد من حذف هذه الحركة؟</strong>
              <p className="text-zinc-600 dark:text-zinc-300 text-xs">
                سيتم حذف الحركة وتعديل رصيد الخزنة فورياً لاستبعاد تأثير هذه العملية.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-zinc-800 font-mono text-[11px] space-y-1">
              <div>النوع: <strong>{deletingTx.type === 'cash_in' ? 'إيداع (+)' : 'صرف (-)'}</strong></div>
              <div>المبلغ: <strong>{deletingTx.currency === 'USD' ? `$${(deletingTx.usdAmount || deletingTx.amount).toFixed(2)}` : formatCurrency(deletingTx.amount)}</strong></div>
              <div>البيان: <span className="font-sans">{deletingTx.description}</span></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setDeletingTx(null)}>
                تراجع
              </Button>
              <Button type="button" variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={handleConfirmDeleteTx}>
                تأكيد الحذف
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
