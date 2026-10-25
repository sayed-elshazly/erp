import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { SafeTransaction, SafeCategory } from '../../../types/finance.types';
import { StoreWallet } from '../../../types/topup.types';
import { formatCurrency, formatDateTime, isStoreWalletTxPositive } from '../../../utils/formatters';
import { exportToExcel } from '../../../utils/excelExport';
import { DealerDailySettlementModal } from './DealerDailySettlementModal';
import { CurrencyExchangeModal } from '../../../components/finance/CurrencyExchangeModal';
import {
  FinancialCalendarFilter,
  FinancialFilterState,
  FinancialPeriodMetrics
} from '../../customers/finance/FinancialCalendarFilter';
import { eventBus, SYSTEM_EVENTS } from '../../../services/eventBus';
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
  Scale,
  DollarSign,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export const DealerFinanceVaultsTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Live data hooks
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Real-time synchronization listeners for Dealer Finance
  useEffect(() => {
    try {
      db.recalculateSystemWallets();
    } catch (e) {
      console.warn('Error recalculating system wallets on mount:', e);
    }

    const onStoreWalletsUpdated = () => handleRefresh();
    const onDealerTicketsUpdated = () => {
      try {
        db.recalculateSystemWallets();
      } catch (err) {
        console.warn(err);
      }
      handleRefresh();
    };
    const onStorage = () => handleRefresh();

    window.addEventListener('store_wallets_updated', onStoreWalletsUpdated);
    window.addEventListener('dealer_wallets_updated', onStoreWalletsUpdated);
    window.addEventListener('dealer_tickets_updated', onDealerTicketsUpdated);
    window.addEventListener('tickets_updated', onDealerTicketsUpdated);
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

    const unsubDealer = eventBus.subscribe('DEALER_UPDATED' as any, () => {
      try {
        db.recalculateSystemWallets();
      } catch (err) {
        console.warn(err);
      }
      handleRefresh();
    });

    const unsubVault = eventBus.subscribe(SYSTEM_EVENTS.VAULT_UPDATED, handleRefresh);

    return () => {
      window.removeEventListener('store_wallets_updated', onStoreWalletsUpdated);
      window.removeEventListener('dealer_wallets_updated', onStoreWalletsUpdated);
      window.removeEventListener('dealer_tickets_updated', onDealerTicketsUpdated);
      window.removeEventListener('tickets_updated', onDealerTicketsUpdated);
      window.removeEventListener('storage', onStorage);
      unsubTicket();
      unsubTicketCreated();
      unsubDealer();
      unsubVault();
    };
  }, []);

  // Dealer Safe Transaction Edit & Delete states
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

    db.updateDealerSafeTransaction(editingTx.id, {
      amount: finalAmount,
      usdAmount: finalUsdAmount,
      description: editDescription.trim(),
      category: editCategory,
      notes: editNotes.trim()
    }, user);

    showToast('success', 'تم تعديل الحركة بنجاح', `تم تحديث بيانات حركة الخزنة #${editingTx.operationNumber || editingTx.id}`);
    setEditingTx(null);
    handleRefresh();
  };

  const handleConfirmDeleteTx = () => {
    if (!deletingTx) return;
    db.deleteDealerSafeTransaction(deletingTx.id, user, 'حذف يدوي بواسطة المستخدم');
    showToast('success', 'تم حذف الحركة بنجاح', `تم حذف حركة خزنة التجار #${deletingTx.operationNumber || deletingTx.id} وتعديل الرصيد تلقائياً.`);
    setDeletingTx(null);
    handleRefresh();
  };

  const summary = useMemo(() => db.getDealerMainVaultSummary(), [refreshTrigger]);
  const safeTransactions = useMemo(() => db.getDealerSafeTransactions(), [refreshTrigger]);
  const dealerWallets = useMemo(() => db.getDealerWallets(), [refreshTrigger]);
  const dealerTickets = useMemo(() => db.getDealerTickets(), [refreshTrigger]);
  const dailyClosures = useMemo(() => db.getDealerDailyClosures(), [refreshTrigger]);

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
        if (calendarFilter.txType === 'shift_settlement' && tx.category !== 'shift_settlement' && !tx.description?.includes('تصفية')) return false;
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
        const matchDesc = tx.description?.toLowerCase().includes(q);
        const matchOp = tx.operationNumber?.toLowerCase().includes(q);
        const matchUser = tx.performedBy?.toLowerCase().includes(q);
        const matchNotes = tx.notes?.toLowerCase().includes(q);
        const matchAmount = tx.amount.toString().includes(q);
        if (!matchDesc && !matchOp && !matchUser && !matchNotes && !matchAmount) return false;
      }

      return true;
    });
  }, [safeTransactions, calendarFilter]);

  // Dynamic Period Metrics Calculation for Dealers
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

    // Accurate calculation of period profits directly from active dealer tickets - realized on completed tickets only
    const activeDealerTickets = dealerTickets.filter(t => {
      if (t.status !== 'completed') return false;
      const tDate = t.createdAt || t.updatedAt || '';
      if (from && tDate < from) return false;
      if (to && tDate > to) return false;
      return true;
    });

    const ticketsProfit = activeDealerTickets.reduce((sum, t) => {
      const p = t.netProfit !== undefined ? t.netProfit : (t.totalProfitMargin || 0);
      return sum + (Number(p) || 0);
    }, 0);

    // Any manual non-ticket deposits/withdrawals/adjustments on mw_profits
    const profitTx = db.getStoreWalletTransactions('mw_profits');
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
      const isPos = isStoreWalletTxPositive(ptx);
      const absAmt = Math.abs(ptx.amount || 0);
      if (isPos) {
        manualProfits += absAmt;
      } else {
        manualProfits -= absAmt;
      }
    }

    if (!from && !to) {
      const mwP = dealerWallets.find(w => w.id === 'mw_profits' || w.systemType === 'profits');
      totalProfitsEGP = mwP ? mwP.balance : Math.max(0, ticketsProfit + manualProfits);
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
  }, [safeTransactions, dealerWallets, dealerTickets, refreshTrigger, calendarFilter.dateFrom, calendarFilter.dateTo, filteredTransactions.length]);

  // Modals state
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [txType, setTxType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');
  const [amount, setAmount] = useState<number>(0);
  const [usdRate, setUsdRate] = useState<number>(50.0);
  const [category, setCategory] = useState<SafeCategory>('sales');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [opNumber, setOpNumber] = useState('');

  // Daily Settlement Modal State
  const [isDailySettlementOpen, setIsDailySettlementOpen] = useState(false);
  const [isDailyClosuresHistoryOpen, setIsDailyClosuresHistoryOpen] = useState(false);

  // Wallet Deposit Modal
  const [selectedWalletForDeposit, setSelectedWalletForDeposit] = useState<StoreWallet | null>(null);
  const [isWalletDepositOpen, setIsWalletDepositOpen] = useState(false);
  const [walletDepositAmount, setWalletDepositAmount] = useState<number>(0);
  const [walletDepositNotes, setWalletDepositNotes] = useState('');


  // Open Deposit / Withdrawal modal
  const handleOpenTxModal = (type: 'cash_in' | 'cash_out') => {
    setTxType(type);
    setAmount(0);
    setCurrency('EGP');
    setUsdRate(50.0);
    setCategory(type === 'cash_in' ? 'sales' : 'expense');
    setDescription(type === 'cash_in' ? 'إيداع نقدي في خزنة التجار' : 'سحب نقدي من خزنة التجار');
    setNotes('');
    setOpNumber(`DTX-${Date.now().toString().slice(-6)}`);
    setIsAddTxModalOpen(true);
  };

  // Submit Safe Transaction
  const handleSaveSafeTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast('error', 'خطأ في المبلغ', 'يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    const isUSD = currency === 'USD';
    const effectiveAmount = isUSD ? amount * usdRate : amount;

    // Check safe balance for withdrawals
    if (txType === 'cash_out') {
      if (isUSD && amount > summary.balanceUSD) {
        showToast('error', 'رصيد غير كافٍ', 'الرصيد الدولاري في خزنة التجار لا يكفي لإتمام هذا السحب');
        return;
      }
      if (!isUSD && effectiveAmount > summary.balanceEGP) {
        showToast('error', 'رصيد غير كافٍ', 'الرصيد بالجنيه في خزنة التجار لا يكفي لإتمام هذا السحب');
        return;
      }
    }

    db.addDealerSafeTransaction(
      txType,
      effectiveAmount,
      category,
      description,
      user?.fullName || user?.username || 'مسؤول الحسابات',
      undefined,
      {
        currency,
        usdAmount: isUSD ? amount : undefined,
        usdExchangeRate: isUSD ? usdRate : undefined,
        operationNumber: opNumber,
        notes,
        vaultId: 'dealer_main_vault',
        user
      }
    );

    showToast(
      'success',
      txType === 'cash_in' ? 'تم الإيداع بنجاح' : 'تم السحب بنجاح',
      `تم تسجيل حركة ${txType === 'cash_in' ? 'وارد' : 'صادر'} بمبلغ ${amount} ${currency} في خزنة التجار`
    );

    setIsAddTxModalOpen(false);
    handleRefresh();
  };

  // Submit Wallet Deposit
  const handleSaveWalletDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletForDeposit || walletDepositAmount <= 0) return;

    db.depositToDealerWallet(
      selectedWalletForDeposit.id,
      walletDepositAmount,
      walletDepositNotes || 'إيداع رصيد بمحفظة التجار',
      user
    );

    showToast(
      'success',
      'تم الإيداع في المحفظة',
      `تم شحن ${formatCurrency(walletDepositAmount)} إلى ${selectedWalletForDeposit.name}`
    );

    setIsWalletDepositOpen(false);
    setSelectedWalletForDeposit(null);
    setWalletDepositAmount(0);
    setWalletDepositNotes('');
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
      const newTx = db.exchangeDealerSafeCurrency(
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
          ? `تم شراء $${data.usdAmount.toFixed(2)} وتغذية رصيد الدولار وخصم ${formatCurrency(newTx.amount)} من رصيد الجنيه بخزنة التجار`
          : `تم بيع $${data.usdAmount.toFixed(2)} وإيداع ${formatCurrency(newTx.amount)} في رصيد الجنيه بخزنة التجار`
      );
      setIsExchangeModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      showToast('error', 'تعذر تنفيذ التبديل', err.message || 'حدث خطأ أثناء تبديل العملة');
    }
  };

  // Export Safe Ledger to Excel
  const handleExportLedgerExcel = () => {
    const data = filteredTransactions.map(tx => ({
      'رقم العملية': tx.operationNumber || tx.id,
      'التاريخ': formatDateTime(tx.createdAt),
      'النوع':
        tx.type === 'exchange'
          ? tx.exchangeType === 'buy_usd'
            ? 'تبديل: شراء دولار'
            : 'تبديل: بيع دولار'
          : tx.type === 'cash_in'
          ? 'وارد (+)'
          : 'صادر (-)',
      'البيان': tx.description,
      'المبلغ': tx.amount,
      'العملة': tx.currency || 'EGP',
      'سعر الصرف': tx.usdExchangeRate || '-',
      'الرصيد بعد الحركة': tx.balanceAfter,
      'المسؤول': tx.performedBy,
      'ملاحظات': tx.notes || ''
    }));
    exportToExcel(data, `حركات_خزنة_التجار_${new Date().toISOString().split('T')[0]}`);
  };

  const getWalletIcon = (w: StoreWallet) => {
    if (w.id === 'mw_profits' || w.systemType === 'profits') return <TrendingUp className="w-5 h-5 text-emerald-500" />;
    if (w.id === 'mw_cashback' || w.systemType === 'cashback') return <Gift className="w-5 h-5 text-fuchsia-500" />;
    if (w.id === 'mw_referrals' || w.systemType === 'referrals') return <Share2 className="w-5 h-5 text-purple-500" />;
    return <Scale className="w-5 h-5 text-rose-500" />;
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* ========================================================================= */}
      {/* 🏛️ [ القسم الأول: الخزنة الرئيسية لقطاع التجار ] DEALER MAIN VAULT */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-500" />
                الخزنة الرئيسية لقطاع التجار والموزعين
              </h2>
              <Badge variant="warning" size="sm">معزولة 100%</Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              إدارة السيولة النقدية للتجار بالجنيه والدولار، إثبات المقبوضات والمسحوبات مع دفتر أستاذ غير قابل للتعديل
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<History className="w-4 h-4" />}
              onClick={() => setIsDailyClosuresHistoryOpen(true)}
            >
              سجل الإقفالات اليومية ({dailyClosures.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<CalendarCheck className="w-4 h-4" />}
              onClick={() => setIsDailySettlementOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              تسوية يومية (إغلاق 24h)
            </Button>
          </div>
        </div>

        {/* 4 Primary Vault KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: EGP Cash Balance */}
          <Card className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">رصيد النقدية بالجنيه (EGP)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                ج.م
              </div>
            </div>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block mt-2 font-mono">
              {formatCurrency(summary.balanceEGP)}
            </span>
            <div className="mt-2 text-[11px] text-zinc-500 flex items-center justify-between">
              <span>صافي السيولة النقدية</span>
              <span className="text-emerald-600 font-bold">جاهز للصرف</span>
            </div>
          </Card>

          {/* Card 2: USD Cash Balance & Rate */}
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">رصيد النقدية بالدولار (USD)</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                $
              </div>
            </div>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block mt-2 font-mono">
              ${summary.balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <div className="mt-2 text-[11px] text-zinc-500 flex items-center justify-between">
              <span>متوسط شراء الدولار:</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                {summary.avgUsdPurchaseRate.toFixed(2)} ج.م
              </span>
            </div>
          </Card>

          {/* Card 3: Total Cash In */}
          <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500">إجمالي المقبوضات (الوارد)</span>
              <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-2 font-mono">
              +{formatCurrency(summary.totalRevenueEGP)}
            </span>
            <span className="text-[11px] text-zinc-500 block mt-2">
              إجمالي التدفقات النقدية الداخلة
            </span>
          </Card>

          {/* Card 4: Total Cash Out */}
          <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500">إجمالي المدفوعات (المنصرف)</span>
              <ArrowUpRight className="w-5 h-5 text-rose-500" />
            </div>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 block mt-2 font-mono">
              -{formatCurrency(summary.totalExpensesEGP)}
            </span>
            <span className="text-[11px] text-zinc-500 block mt-2">
              إجمالي المصروفات والمسحوبات
            </span>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-100/80 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 ml-2">
            عمليات الخزنة السريعة:
          </span>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => handleOpenTxModal('cash_in')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            إيداع في خزنة التجار
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<ArrowUpRight className="w-4 h-4 text-rose-500" />}
            onClick={() => handleOpenTxModal('cash_out')}
            className="border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold"
          >
            سحب من خزنة التجار
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeftRight className="w-4 h-4 text-amber-500" />}
            onClick={() => setIsExchangeModalOpen(true)}
            className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-bold"
          >
            تبديل عملات (شراء / بيع دولار) 💱
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefresh}
          >
            تحديث لحظي
          </Button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 📅 [ فلتر التقويم المالي الذكي لخزائن ومحافظ التجار ] SMART CALENDAR FILTER */}
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

      {/* ========================================================================= */}
      {/* 💼 [ القسم الثاني: محافظ النظام الأربعة لقطاع التجار ] 4 SYSTEM WALLETS */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-500" />
              محافظ النظام المنقولة لقطاع التجار (4 محافظ مركزية)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              محفظة الأرباح، الكاش باك، الإحالات، ومحفظة الديون والأمانات - تم نقلها بالكامل تحت قسم مالية التجار
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                try {
                  db.recalculateSystemWallets();
                  handleRefresh();
                  showToast('success', 'تمت المزامنة الفورية', 'تمت إعادة مطابقة محافظ النظام التراكمية مع حركة تذاكر التجار الحالية بنجاح.');
                } catch (e) {
                  console.error(e);
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/20 transition-all cursor-pointer shadow-sm active:scale-95"
              title="إعادة احتساب ومزامنة فورية لمحافظ التجار مع التذاكر النشطة"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>مزامنة المحافظ</span>
            </button>
            <Badge variant="info" size="sm">تحديث رصيد لحظي</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dealerWallets.map(w => {
            const isProfits = w.id === 'mw_profits' || w.systemType === 'profits';
            const hasDateFilter = Boolean(calendarFilter.dateFrom || calendarFilter.dateTo);
            let periodIn = 0;
            let periodOut = 0;
            if (hasDateFilter) {
              const from = calendarFilter.dateFrom ? calendarFilter.dateFrom + 'T00:00:00' : '';
              const to = calendarFilter.dateTo ? calendarFilter.dateTo + 'T23:59:59' : '';
              if (isProfits) {
                const activeT = dealerTickets.filter(t => {
                  if (t.status !== 'completed') return false;
                  const tDate = t.createdAt || t.updatedAt || '';
                  if (from && tDate < from) return false;
                  if (to && tDate > to) return false;
                  return true;
                });
                periodIn = Math.max(0, Math.round(activeT.reduce((sum, t) => sum + (Number(t.netProfit !== undefined ? t.netProfit : t.totalProfitMargin) || 0), 0) * 100) / 100);
                const wTxs = db.getStoreWalletTransactions(w.id);
                for (const tx of wTxs) {
                  if (tx.sourceType === 'ticket' || tx.sourceTicketNumber || tx.referenceNumber?.startsWith('TKT-') || tx.referenceNumber?.startsWith('DTKT-') || tx.description?.includes('تذكرة')) continue;
                  if (from && tx.createdAt < from) continue;
                  if (to && tx.createdAt > to) continue;
                  const isPos = isStoreWalletTxPositive(tx);
                  const absAmt = Math.abs(tx.amount || 0);
                  if (isPos) periodIn += absAmt;
                  else periodOut += absAmt;
                }
              } else {
                const wTxs = db.getStoreWalletTransactions(w.id);
                for (const tx of wTxs) {
                  if (from && tx.createdAt < from) continue;
                  if (to && tx.createdAt > to) continue;
                  const isPos = isStoreWalletTxPositive(tx);
                  const absAmt = Math.abs(tx.amount || 0);
                  if (isPos) periodIn += absAmt;
                  else periodOut += absAmt;
                }
              }
            }

            return (
              <Card
                key={w.id}
                className="p-4 bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getWalletIcon(w)}
                      <span className="font-bold text-xs text-zinc-900 dark:text-white">{w.name}</span>
                    </div>
                    <Badge variant="default" size="sm">نظامي</Badge>
                  </div>

                  <span className="text-xl font-black text-zinc-900 dark:text-white block mt-3 font-mono">
                    {formatCurrency(w.balance)}
                  </span>
                  
                  {hasDateFilter && (
                    <div className="mt-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-600 font-bold">وارد الفترة: +{formatCurrency(periodIn)}</span>
                      <span className="text-rose-500 font-bold">منصرف: -{formatCurrency(periodOut)}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {w.notes || 'محفظة مالية تابعة لمنظومة التجار'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-mono">ID: {w.id}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setSelectedWalletForDeposit(w);
                      setWalletDepositAmount(0);
                      setWalletDepositNotes('');
                      setIsWalletDepositOpen(true);
                    }}
                    className="font-bold border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                  >
                    إيداع رصيد
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📜 [ القسم الثالث: دفتر أستاذ حركات خزنة التجار ] SAFE LEDGER (IMMUTABLE) */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              دفتر أستاذ حركات خزنة التجار (سجل محاسبي غير قابل للتعديل)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              سجل تدقيق كامل لكافة عمليات الإيداع، السحب، والتحويل مع توثيق اسم المسؤول ورصيد ما بعد العملية
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportLedgerExcel}
            >
              تصدير Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
            >
              طباعة الدفتر
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
          <div>
            <Input
              type="text"
              placeholder="بحث برقم الحركة، البيان، المسؤول..."
              value={calendarFilter.searchQuery}
              onChange={e => setCalendarFilter(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="text-xs"
            />
          </div>

          <div>
            <select
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              value={calendarFilter.txType}
              onChange={e => setCalendarFilter(prev => ({ ...prev, txType: e.target.value as any }))}
            >
              <option value="all">كل أنواع الحركات (وارد وصادر)</option>
              <option value="cash_in">وارد فقط (+)</option>
              <option value="cash_out">صادر فقط (-)</option>
              <option value="exchange">تبديل عملات (صرافة) 💱</option>
            </select>
          </div>

          <div>
            <select
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              value={calendarFilter.currency}
              onChange={e => setCalendarFilter(prev => ({ ...prev, currency: e.target.value as any }))}
            >
              <option value="all">كل العملات</option>
              <option value="EGP">جنيه مصري (EGP)</option>
              <option value="USD">دولار أمريكي (USD)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              value={calendarFilter.dateFrom}
              onChange={e => setCalendarFilter(prev => ({ ...prev, dateFrom: e.target.value, preset: 'custom' }))}
            />
            <span className="text-zinc-400 text-xs">إلى</span>
            <input
              type="date"
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              value={calendarFilter.dateTo}
              onChange={e => setCalendarFilter(prev => ({ ...prev, dateTo: e.target.value, preset: 'custom' }))}
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-right">
            <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-3">رقم الحركة</th>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3">النوع</th>
                <th className="p-3">البيان والتفاصيل</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">العملة</th>
                <th className="p-3">الرصيد بعد الحركة</th>
                <th className="p-3">المسؤول</th>
                <th className="p-3">ملاحظات</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-500">
                    لا توجد حركات مطابقة في دفتر أستاذ خزنة التجار
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const isExchange = tx.type === 'exchange';
                  const isBuyUsd = tx.exchangeType === 'buy_usd';

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="p-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {tx.operationNumber || tx.id}
                      </td>
                      <td className="p-3 text-zinc-500 font-mono">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="p-3">
                        {isExchange ? (
                          <Badge variant={isBuyUsd ? 'success' : 'info'} size="sm">
                            {isBuyUsd ? '💱 شراء دولار (EGP➔USD)' : '💱 بيع دولار (USD➔EGP)'}
                          </Badge>
                        ) : (
                          <Badge
                            variant={tx.type === 'cash_in' ? 'success' : 'danger'}
                            size="sm"
                          >
                            {tx.type === 'cash_in' ? 'إيداع / وارد' : 'سحب / صادر'}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 font-bold text-zinc-900 dark:text-white max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="p-3 font-mono font-bold">
                        {isExchange ? (
                          isBuyUsd ? (
                            <div>
                              <span className="text-emerald-600 dark:text-emerald-400 block font-mono">
                                +${(tx.usdAmount || 0).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-rose-500 block font-mono">
                                (-{formatCurrency(tx.amount)})
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-emerald-600 dark:text-emerald-400 block font-mono">
                                +{formatCurrency(tx.amount)}
                              </span>
                              <span className="text-[10px] text-rose-500 block font-mono">
                                (-${(tx.usdAmount || 0).toFixed(2)})
                              </span>
                            </div>
                          )
                        ) : (
                          <span className={tx.type === 'cash_in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {tx.type === 'cash_in' ? '+' : '-'}{tx.currency === 'USD' ? `$${(tx.usdAmount || tx.amount).toLocaleString()}` : formatCurrency(tx.amount)}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-zinc-600 dark:text-zinc-400">
                        {isExchange ? (
                          <div>
                            <span className="text-amber-600 dark:text-amber-400 block font-bold">
                              صرافة
                            </span>
                            <span className="text-[10px] text-zinc-400 block font-mono">
                              الصرف: {tx.usdExchangeRate || '-'} ج
                            </span>
                          </div>
                        ) : (
                          tx.currency || 'EGP'
                        )}
                      </td>
                      <td className="p-3 font-mono font-black text-amber-600 dark:text-amber-400">
                        {isExchange ? (
                          <div>
                            <span className="text-[11px] block text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(tx.balanceAfter || 0)}
                            </span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 block">
                              ${(tx.balanceAfterUSD || 0).toFixed(2)}
                            </span>
                          </div>
                        ) : tx.currency === 'USD' ? (
                          `$${(tx.balanceAfterUSD || tx.balanceAfter).toLocaleString()}`
                        ) : (
                          formatCurrency(tx.balanceAfter)
                        )}
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400">
                        {tx.performedBy || 'الإدارة'}
                      </td>
                      <td className="p-3 text-zinc-500 text-[11px] max-w-xs truncate">
                        {tx.notes || '-'}
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
      </div>

      {/* ========================================================================= */}
      {/* 🚀 MODALS: Deposit / Withdraw Modal */}
      {/* ========================================================================= */}
      {isAddTxModalOpen && (
        <Modal
          isOpen={isAddTxModalOpen}
          onClose={() => setIsAddTxModalOpen(false)}
          title={txType === 'cash_in' ? '💵 إيداع نقدي في خزنة التجار' : '💸 سحب نقدي من خزنة التجار'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveSafeTransaction} className="space-y-3 text-right" dir="rtl">
            {/* Quick Switch Banner for Currency Exchange */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <ArrowLeftRight className="w-4 h-4 shrink-0" />
                <span>تبديل وشراء/بيع دولار بالجنيه؟</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddTxModalOpen(false);
                  setIsExchangeModalOpen(true);
                }}
                className="font-bold underline text-amber-600 dark:text-amber-400 hover:text-amber-500 cursor-pointer"
              >
                صرافة العملات 💱
              </button>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">العملة:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrency('EGP')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currency === 'EGP'
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  جنيه مصري (EGP)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currency === 'USD'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  دولار أمريكي (USD)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">المبلغ المطلوب ({currency}):</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                placeholder={`أدخل المبلغ بـ ${currency}...`}
              />
            </div>

            {currency === 'USD' && (
              <div>
                <label className="text-xs font-bold block mb-1">سعر الصرف (ج.م لكل دولار):</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  value={usdRate}
                  onChange={e => setUsdRate(Number(e.target.value))}
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  القيمة الإجمالية المعادلة بالجنيه: {formatCurrency(amount * usdRate)}
                </span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold block mb-1">البيان والسبب:</label>
              <Input
                type="text"
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="بيان العملية..."
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">ملاحظات إضافية (اختياري):</label>
              <textarea
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="أي تفاصيل أخرى..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddTxModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className={txType === 'cash_in' ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold' : 'bg-rose-600 hover:bg-rose-500 text-white font-bold'}
              >
                تأكيد العملية
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Deposit to Wallet Modal */}
      {isWalletDepositOpen && selectedWalletForDeposit && (
        <Modal
          isOpen={isWalletDepositOpen}
          onClose={() => setIsWalletDepositOpen(false)}
          title={`📥 إيداع رصيد في ${selectedWalletForDeposit.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveWalletDeposit} className="space-y-3 text-right" dir="rtl">
            <div>
              <label className="text-xs font-bold block mb-1">المبلغ (ج.م):</label>
              <Input
                type="number"
                step="0.01"
                min="1"
                required
                value={walletDepositAmount || ''}
                onChange={e => setWalletDepositAmount(Number(e.target.value))}
                placeholder="أدخل مبلغ الإيداع..."
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">البيان والملاحظات:</label>
              <Input
                type="text"
                value={walletDepositNotes}
                onChange={e => setWalletDepositNotes(e.target.value)}
                placeholder="سبب الإيداع أو رقم الحوالة..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsWalletDepositOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                تأكيد الإيداع في المحفظة
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Daily Closures History Modal */}
      {isDailyClosuresHistoryOpen && (
        <Modal
          isOpen={isDailyClosuresHistoryOpen}
          onClose={() => setIsDailyClosuresHistoryOpen(false)}
          title="📚 أرشيف إقفالات وتسويات خزنة التجار"
          maxWidth="4xl"
        >
          <div className="space-y-3 text-right" dir="rtl">
            {dailyClosures.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">لا توجد تقارير إقفال محفوظة حتى الآن</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {dailyClosures.map(c => (
                  <Card key={c.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-900 dark:text-white font-mono">{c.date}</span>
                        <Badge variant="success" size="sm">معتمد</Badge>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        بواسطة: {c.closedBy} • حركات: {c.totalTransactionsCount} • صافي اليوم: {formatCurrency(c.netEGP)}
                      </p>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-[10px] text-zinc-400 block">رصيد الإغلاق</span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        {formatCurrency(c.closingBalanceEGP)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Daily Settlement Modal */}
      {isDailySettlementOpen && (
        <DealerDailySettlementModal
          isOpen={isDailySettlementOpen}
          onClose={() => setIsDailySettlementOpen(false)}
          onSettlementSaved={handleRefresh}
        />
      )}

      {/* Currency Exchange Modal */}
      <CurrencyExchangeModal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        vaultName="خزنة قطاع التجار والموزعين"
        balanceEGP={summary.balanceEGP}
        balanceUSD={summary.balanceUSD}
        avgUsdPurchaseRate={summary.avgUsdPurchaseRate}
        onConfirmExchange={handleExecuteExchange}
      />

      {/* Edit Safe Transaction Modal */}
      {editingTx && (
        <Modal
          isOpen={Boolean(editingTx)}
          onClose={() => setEditingTx(null)}
          title={`✏️ تعديل حركة خزنة التجار: #${editingTx.operationNumber || editingTx.id}`}
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
                <option value="customer_deposit">إيداع تاجر مباشر</option>
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
          title={`🗑️ حذف حركة خزنة التجار: #${deletingTx.operationNumber || deletingTx.id}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-right text-xs" dir="rtl">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 space-y-1">
              <strong className="font-bold text-sm block">هل أنت متأكد من حذف هذه الحركة؟</strong>
              <p className="text-zinc-600 dark:text-zinc-300 text-xs">
                سيتم حذف الحركة وتعديل رصيد خزنة التجار فورياً لاستبعاد تأثير هذه العملية.
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

export default DealerFinanceVaultsTab;
