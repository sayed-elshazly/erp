import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { JKRWallet, JKRWalletLot, JKRWalletTransaction, JKRTransactionType } from '../../../types/jkrWallet.types';
import { JKRWalletEngine } from '../../../services/financial/jkrWalletEngine';
import { useNotifications } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../utils/formatters';
import {
  Wallet,
  Coins,
  Layers,
  FileText,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  Plus,
  Minus,
  CheckCircle2,
  Calendar,
  Filter,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Ticket,
  ExternalLink,
  CreditCard,
  Search,
  X,
  RefreshCw,
  Eye,
  Package,
  Gamepad2,
  Copy,
  Check,
  Pencil
} from 'lucide-react';
import { TicketDetailsModal } from '../../tickets/TicketDetailsModal';
import { JKRDepositTicketModal } from './JKRDepositTicketModal';
import { JKRTransactionDetailsModal } from './JKRTransactionDetailsModal';
import { JKREditDepositModal } from './JKREditDepositModal';
import { JKRDeleteDepositModal } from './JKRDeleteDepositModal';
import { CustomerTicket } from '../../../types/customer.types';
import { db } from '../../../database/db';

interface JKRWalletDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: JKRWallet;
  onUpdated: () => void;
  onOpenDepositModal?: () => void;
  onOpenFundingModal?: () => void;
  onOpenDeleteModal?: () => void;
}

export const JKRWalletDetailsModal: React.FC<JKRWalletDetailsModalProps> = ({
  isOpen,
  onClose,
  wallet,
  onUpdated,
  onOpenDepositModal,
  onOpenFundingModal,
  onOpenDeleteModal
}) => {
  const { showToast } = useNotifications();
  const { user } = useAuth();
  const isOwner = user?.role === 'admin';

  // Reactive Internal Wallet State to guarantee instant UI reflections
  const [walletData, setWalletData] = useState<JKRWallet>(wallet);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const latest = JKRWalletEngine.getWalletById(wallet.id) || wallet;
    setWalletData({ ...latest });
  }, [wallet, isOpen]);

  const refreshWallet = () => {
    const latest = JKRWalletEngine.getWalletById(wallet.id);
    if (latest) {
      setWalletData({ ...latest });
    }
    setDataVersion(v => v + 1);
    onUpdated();
  };

  // Sub-tabs: 'lots' | 'ledger' | 'products' | 'losses' | 'adjust'
  const [activeTab, setActiveTab] = useState<'lots' | 'ledger' | 'products' | 'losses' | 'adjust'>('lots');

  // Interactive Ticket Details Modal State
  const [openedTicket, setOpenedTicket] = useState<CustomerTicket | null>(null);

  // Interactive Deposit Ticket Modal State
  const [openedDepositTx, setOpenedDepositTx] = useState<JKRWalletTransaction | null>(null);
  const [openedDepositLot, setOpenedDepositLot] = useState<JKRWalletLot | null>(null);

  // Interactive Universal Transaction Details Modal State
  const [openedTxDetails, setOpenedTxDetails] = useState<JKRWalletTransaction | null>(null);

  const handleOpenDepositTicket = (t: JKRWalletTransaction) => {
    setOpenedDepositTx(t);
    setOpenedDepositLot(null);
  };

  const handleOpenLotDepositTicket = (lot: JKRWalletLot) => {
    setOpenedDepositLot(lot);
    const matchedTx = rawTransactions.find(
      t => t.lotId === lot.id || t.lotNumber === lot.lotNumber || (lot.sourceTransactionId && t.id === lot.sourceTransactionId)
    );
    setOpenedDepositTx(matchedTx || null);
  };

  // Deposit Lot Edit & Delete States
  const [selectedLotForEdit, setSelectedLotForEdit] = useState<JKRWalletLot | null>(null);
  const [selectedLotForDelete, setSelectedLotForDelete] = useState<JKRWalletLot | null>(null);
  const [matchedTxForLot, setMatchedTxForLot] = useState<JKRWalletTransaction | null>(null);

  const handleEditLot = (lot: JKRWalletLot, tx?: JKRWalletTransaction | null) => {
    setSelectedLotForEdit(lot);
    const matched = tx || rawTransactions.find(
      t => t.lotId === lot.id || t.lotNumber === lot.lotNumber || (lot.sourceTransactionId && t.id === lot.sourceTransactionId)
    );
    setMatchedTxForLot(matched || null);
  };

  const handleDeleteLot = (lot: JKRWalletLot, tx?: JKRWalletTransaction | null) => {
    setSelectedLotForDelete(lot);
    const matched = tx || rawTransactions.find(
      t => t.lotId === lot.id || t.lotNumber === lot.lotNumber || (lot.sourceTransactionId && t.id === lot.sourceTransactionId)
    );
    setMatchedTxForLot(matched || null);
  };

  // Ledger Filters
  const [txFlowFilter, setTxFlowFilter] = useState<'all' | 'in' | 'out'>('all');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [searchFilter, setSearchFilter] = useState('');

  // Linked Products States
  const [productSearch, setProductSearch] = useState('');
  const [productFilterType, setProductFilterType] = useState<'all' | 'primary' | 'alternative' | 'first_shipping'>('all');
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Loss & Freeze Dialog States
  const [freezeReason, setFreezeReason] = useState('');
  const [lossAmount, setLossAmount] = useState<number>(0);
  const [lossReason, setLossReason] = useState('');
  const [recoveryAmount, setRecoveryAmount] = useState<number>(0);
  const [recoveryReason, setRecoveryReason] = useState('');

  // Live Cost Estimation for Confirmed Loss
  const lossCostInfo = useMemo(() => {
    if (!lossAmount || lossAmount <= 0) return null;
    if (walletData.type === 'MAIN') {
      const usd = lossAmount;
      const rate = 50;
      return {
        totalCostUSD: usd,
        totalCostEGP: usd * rate,
        effectiveRate: rate,
        costPerPointUSD: 1,
        costPerPointEGP: rate
      };
    }
    const cost = JKRWalletEngine.getWalletEffectivePointCost(walletData.id, lossAmount);
    return {
      totalCostUSD: cost.totalCostUSD,
      totalCostEGP: cost.totalCostEGP,
      effectiveRate: cost.effectiveExchangeRate || (cost.totalCostUSD > 0 ? cost.totalCostEGP / cost.totalCostUSD : 50),
      costPerPointUSD: cost.costPerPointUSD,
      costPerPointEGP: cost.costPerPointEGP
    };
  }, [walletData.id, walletData.type, lossAmount]);

  // Live Cost Estimation for Loss Recovery
  const recoveryCostInfo = useMemo(() => {
    if (!recoveryAmount || recoveryAmount <= 0) return null;
    if (walletData.type === 'MAIN') {
      const usd = recoveryAmount;
      const rate = 50;
      return {
        totalCostUSD: usd,
        totalCostEGP: usd * rate,
        effectiveRate: rate,
        costPerPointUSD: 1,
        costPerPointEGP: rate
      };
    }
    const cost = JKRWalletEngine.getWalletEffectivePointCost(walletData.id, recoveryAmount);
    return {
      totalCostUSD: cost.totalCostUSD,
      totalCostEGP: cost.totalCostEGP,
      effectiveRate: cost.effectiveExchangeRate || (cost.totalCostUSD > 0 ? cost.totalCostEGP / cost.totalCostUSD : 50),
      costPerPointUSD: cost.costPerPointUSD,
      costPerPointEGP: cost.costPerPointEGP
    };
  }, [walletData.id, walletData.type, recoveryAmount]);

  // Adjustment Dialog State
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjReason, setAdjReason] = useState('');

  // Cache all tickets into a lookup map for instant metadata retrieval
  const ticketsMap = useMemo(() => {
    const map = new Map<string, CustomerTicket>();
    const all = [...db.getTickets(), ...db.getDealerTickets()];
    all.forEach(t => {
      if (t.id) map.set(t.id, t);
      if (t.ticketNumber) {
        map.set(t.ticketNumber, t);
        const parts = t.ticketNumber.split('-');
        const lastPart = parts[parts.length - 1];
        if (lastPart) map.set(lastPart, t);
      }
    });
    return map;
  }, [isOpen]);

  // Open Ticket Details handler
  const handleOpenTicketDetails = (t: JKRWalletTransaction) => {
    const queryNum = (t.ticketNumber || t.ticketId || t.referenceId || '').trim();
    let found = queryNum ? ticketsMap.get(queryNum) : undefined;
    if (!found && t.ticketId) found = ticketsMap.get(t.ticketId);

    if (!found) {
      const allTickets = [...db.getTickets(), ...db.getDealerTickets()];
      found = allTickets.find(
        item => item.id === t.ticketId ||
                item.id === queryNum ||
                (item.ticketNumber && (item.ticketNumber === queryNum || item.ticketNumber.endsWith(queryNum) || queryNum.includes(item.ticketNumber)))
      );
    }

    if (found) {
      setOpenedTicket(found);
    } else {
      showToast('error', 'التذكرة غير موجودة', `لم يتم العثور على بيانات التذكرة (${queryNum}) في قاعدة البيانات`);
    }
  };

  // Helper for Arabic translation of transaction types with modern styling
  const getTransactionTypeArabicInfo = (type: string) => {
    switch (type) {
      case 'CONSUMPTION':
        return { label: '🛒 استهلاك تذكرة', className: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold' };
      case 'DEPOSIT':
        return { label: '📥 إيداع شحنة نقاط', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold' };
      case 'FUNDING':
        return { label: '💵 تمويل دولاري (USDT)', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold' };
      case 'PURCHASE':
        return { label: '💳 شراء نقاط لمحفظة', className: 'bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold' };
      case 'LOSS':
        return { label: '⚠️ خسارة مسجلة', className: 'bg-red-500/15 text-red-400 border border-red-500/30 font-bold' };
      case 'FREEZE':
        return { label: '🧊 تجميد رصيد', className: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold' };
      case 'RECOVERY':
        return { label: '🛡️ استرداد/تعويض', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold' };
      case 'WITHDRAWAL':
        return { label: '📤 سحب رصيد', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold' };
      case 'ADJUSTMENT':
        return { label: '⚖️ تسوية يدوية', className: 'bg-purple-500/15 text-purple-400 border border-purple-500/30 font-bold' };
      case 'REVERSAL':
        return { label: '↩️ استرجاع وإلغاء', className: 'bg-purple-500/15 text-purple-400 border border-purple-500/30 font-bold' };
      default:
        return { label: type, className: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 font-bold' };
    }
  };

  // Fetch Lots & Raw Transactions
  const lots = useMemo(() => {
    return JKRWalletEngine.getLotsByWallet(walletData.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [walletData.id, isOpen, dataVersion]);

  const rawTransactions = useMemo(() => {
    return JKRWalletEngine.getTransactions({ walletId: walletData.id });
  }, [walletData.id, isOpen, dataVersion]);

  // Real Points Lost / Recovered (Accurately computed from transactions if legacy numbers are in EGP)
  const realConfirmedLossPoints = useMemo(() => {
    const lossTxs = rawTransactions.filter(t => t.walletId === walletData.id && t.transactionType === 'LOSS');
    const sum = lossTxs.reduce((acc, t) => acc + (t.quantityOut || 0), 0);
    return sum > 0 ? sum : (walletData.confirmedLossAmount || 0);
  }, [rawTransactions, walletData.id, walletData.confirmedLossAmount]);

  const realRecoveredPoints = useMemo(() => {
    const recTxs = rawTransactions.filter(t => t.walletId === walletData.id && t.transactionType === 'RECOVERY');
    const sum = recTxs.reduce((acc, t) => acc + (t.quantityIn || 0), 0);
    return sum > 0 ? sum : (walletData.recoveredLossAmount || 0);
  }, [rawTransactions, walletData.id, walletData.recoveredLossAmount]);

  // Linked products
  const linkedProducts = useMemo(() => {
    return JKRWalletEngine.getLinkedProducts(walletData.id);
  }, [walletData.id, isOpen, dataVersion]);

  // Filtered linked products
  const filteredProducts = useMemo(() => {
    let list = [...linkedProducts];

    if (productFilterType === 'primary') {
      list = list.filter(p => p.isPrimary);
    } else if (productFilterType === 'alternative') {
      list = list.filter(p => !p.isPrimary);
    } else if (productFilterType === 'first_shipping') {
      list = list.filter(p => p.catalogType === 'first_shipping');
    }

    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.gameTitle.toLowerCase().includes(q) ||
        (p.sectionName && p.sectionName.toLowerCase().includes(q)) ||
        (p.groupName && p.groupName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [linkedProducts, productFilterType, productSearch]);

  // Robust, fully-functional reactive transactions list
  const transactions = useMemo(() => {
    let list = [...rawTransactions];

    // 1. Flow Filter: Inbound / Outbound / All
    if (txFlowFilter === 'in') {
      list = list.filter(t => (t.quantityIn && t.quantityIn > 0) || t.transactionType === 'DEPOSIT' || t.transactionType === 'FUNDING' || t.transactionType === 'RECOVERY');
    } else if (txFlowFilter === 'out') {
      list = list.filter(t => (t.quantityOut && t.quantityOut > 0) || t.transactionType === 'CONSUMPTION' || t.transactionType === 'PURCHASE' || t.transactionType === 'LOSS' || t.transactionType === 'WITHDRAWAL');
    }

    // 2. Specific Operation Type Filter
    if (txTypeFilter !== 'all') {
      list = list.filter(t => t.transactionType === txTypeFilter);
    }

    // 3. Date Range Filter
    if (dateFilter === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      list = list.filter(t => t.createdAt && t.createdAt.startsWith(todayStr));
    } else if (dateFilter === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yesterdayStr = d.toISOString().split('T')[0];
      list = list.filter(t => t.createdAt && t.createdAt.startsWith(yesterdayStr));
    } else if (dateFilter === '7days') {
      const cut = Date.now() - 7 * 24 * 3600 * 1000;
      list = list.filter(t => new Date(t.createdAt).getTime() >= cut);
    } else if (dateFilter === '30days') {
      const cut = Date.now() - 30 * 24 * 3600 * 1000;
      list = list.filter(t => new Date(t.createdAt).getTime() >= cut);
    }

    // 4. Smart Search Filter (stripping '#' and searching all relevant metadata)
    if (searchFilter.trim()) {
      const cleanQ = searchFilter.trim().replace(/^#+/, '').toLowerCase();
      list = list.filter(t => {
        const ticketNum = (t.ticketNumber || '').toLowerCase();
        const ticketId = (t.ticketId || '').toLowerCase();
        const refId = (t.referenceId || '').toLowerCase();
        const prod = (t.productName || '').toLowerCase();
        const cust = (t.customerName || '').toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        const lot = (t.lotNumber || '').toLowerCase();
        const user = (t.performedBy?.name || '').toLowerCase();
        const txNum = (t.transactionNumber || '').toLowerCase();

        return (
          ticketNum.includes(cleanQ) ||
          ticketId.includes(cleanQ) ||
          refId.includes(cleanQ) ||
          prod.includes(cleanQ) ||
          cust.includes(cleanQ) ||
          notes.includes(cleanQ) ||
          lot.includes(cleanQ) ||
          user.includes(cleanQ) ||
          txNum.includes(cleanQ)
        );
      });
    }

    // 5. Sorting Filter
    list.sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'highest') {
        const qtyA = Math.max(a.quantityIn || 0, a.quantityOut || 0, a.amountEGP || 0);
        const qtyB = Math.max(b.quantityIn || 0, b.quantityOut || 0, b.amountEGP || 0);
        return qtyB - qtyA;
      }
      if (sortBy === 'lowest') {
        const qtyA = Math.max(a.quantityIn || 0, a.quantityOut || 0, a.amountEGP || 0);
        const qtyB = Math.max(b.quantityIn || 0, b.quantityOut || 0, b.amountEGP || 0);
        return qtyA - qtyB;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [rawTransactions, txFlowFilter, txTypeFilter, dateFilter, sortBy, searchFilter]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setTxFlowFilter('all');
    setTxTypeFilter('all');
    setDateFilter('all');
    setSortBy('newest');
    setSearchFilter('');
  };

  const isFiltered = txFlowFilter !== 'all' || txTypeFilter !== 'all' || dateFilter !== 'all' || searchFilter.trim() !== '' || sortBy !== 'newest';

  // Detect Orphaned Consumptions (tickets deleted from system whose consumption remains)
  const orphanedConsumptions = useMemo(() => {
    return rawTransactions.filter(t => {
      if (t.transactionType !== 'CONSUMPTION' || t.status === 'CANCELLED' || t.status === 'REVERSED') return false;
      const matched = (t.ticketId ? ticketsMap.get(t.ticketId) : undefined) ||
                      (t.ticketNumber ? ticketsMap.get(t.ticketNumber) : undefined) ||
                      (t.referenceId ? ticketsMap.get(t.referenceId) : undefined);
      return !matched;
    });
  }, [rawTransactions, ticketsMap]);

  const handleRollbackSingleOrphan = (t: JKRWalletTransaction) => {
    const pts = t.quantityOut || 0;
    const cash = t.amountEGP || 0;
    const ref = t.ticketNumber || t.ticketId || t.referenceId || '';
    if (!window.confirm(`هل أنت متأكد من استرجاع ${pts} نقطة إلى رصيد المحفظة وعكس المبلغ (${cash} ج) وحذف حركة هذه التذكرة المحذوفة #${ref}؟`)) {
      return;
    }
    const res = JKRWalletEngine.rollbackOrphanedConsumptionTransaction(t.id, user);
    if (res.success) {
      showToast('success', 'تم الاسترجاع بنجاح', res.message);
      refreshWallet();
    } else {
      showToast('error', 'فشل الاسترجاع', res.message);
    }
  };

  const handleRollbackAllOrphans = () => {
    const totalPts = orphanedConsumptions.reduce((s, x) => s + (x.quantityOut || 0), 0);
    if (!window.confirm(`هل تريد استرداد كافة حركات التذاكر المحذوفة (${orphanedConsumptions.length} حركة بإجمالي ${totalPts} نقطة) دفعة واحدة إلى رصيد المحفظة وخصم مبالغها من الكاش؟`)) {
      return;
    }
    const res = JKRWalletEngine.rollbackAllOrphanedConsumptions(user);
    if (res.success) {
      showToast('success', 'تمت التسوية بنجاح', res.message);
      refreshWallet();
    } else {
      showToast('error', 'فشل الاسترداد', res.message);
    }
  };

  // Handle Freeze / Unfreeze
  const handleToggleFreeze = () => {
    if (walletData.status === 'FROZEN') {
      try {
        JKRWalletEngine.unfreezeWallet(walletData.id, user);
        showToast('success', 'تم فك التجميد', `تمت إعادة المحفظة [${walletData.name}] إلى الخدمة النشطة.`);
        refreshWallet();
      } catch (err: any) {
        showToast('error', 'خطأ', err.message);
      }
    } else {
      if (!freezeReason.trim()) {
        showToast('error', 'سبب التجميد مطلوب', 'يرجى توضيح سبب تجميد المحفظة');
        return;
      }
      try {
        JKRWalletEngine.freezeWallet(walletData.id, freezeReason.trim(), user);
        showToast('warning', 'تم تجميد المحفظة', `تم تجميد المحفظة [${walletData.name}] وتوقيف استهلاكها.`);
        setFreezeReason('');
        refreshWallet();
      } catch (err: any) {
        showToast('error', 'خطأ', err.message);
      }
    }
  };

  // Handle Confirmed Loss
  const handleRecordLoss = (e: React.FormEvent) => {
    e.preventDefault();
    if (lossAmount <= 0 || !lossReason.trim()) {
      showToast('error', 'بيانات غير كاملة', 'يرجى إدخال كمية الخسارة والسبب');
      return;
    }
    try {
      JKRWalletEngine.recordConfirmedLoss(walletData.id, lossAmount, lossReason.trim(), user);
      showToast('success', 'تم اعتماد الخسارة', `تم تسجيل وخصم خسارة قدرها ${lossAmount.toLocaleString()} ${isPoints ? 'نقطة' : '$'} من رصيد المحفظة.`);
      setLossAmount(0);
      setLossReason('');
      refreshWallet();
    } catch (err: any) {
      showToast('error', 'خطأ', err.message);
    }
  };

  // Handle Loss Recovery
  const handleRecordRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryAmount <= 0 || !recoveryReason.trim()) {
      showToast('error', 'بيانات غير كاملة', 'يرجى إدخال مبلغ أو نقاط التعويض والسبب');
      return;
    }
    try {
      JKRWalletEngine.recordLossRecovery(walletData.id, recoveryAmount, recoveryReason.trim(), user);
      showToast('success', 'تم تسجيل التعويض', `تم تعويض وإضافة ${recoveryAmount.toLocaleString()} ${isPoints ? 'نقطة' : '$'} إلى رصيد المحفظة بنجاح.`);
      setRecoveryAmount(0);
      setRecoveryReason('');
      refreshWallet();
    } catch (err: any) {
      showToast('error', 'خطأ', err.message);
    }
  };

  // Handle Balance Adjustment
  const handleRecordAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjAmount === 0 || !adjReason.trim()) {
      showToast('error', 'بيانات غير كاملة', 'يرجى إدخال قيمة التعديل وسبب التدقيق الإلزامي');
      return;
    }
    try {
      JKRWalletEngine.recordBalanceAdjustment(walletData.id, adjAmount, adjReason.trim(), user);
      showToast('success', 'تم تعديل الرصيد', 'تم تسجيل التعديل اليدوي في دفتر الأستاذ وسجل التدقيق وتحديث الرصيد.');
      setAdjAmount(0);
      setAdjReason('');
      refreshWallet();
    } catch (err: any) {
      showToast('error', 'خطأ', err.message);
    }
  };

  const isPoints = walletData.type === 'SUB';
  const totalValuationEGP = isPoints
    ? lots.reduce((sum, l) => sum + (l.remainingQuantity * l.unitCostEGP), 0)
    : (walletData.balanceEGP || 0);

  const totalValuationUSD = isPoints
    ? lots.reduce((sum, l) => {
        const unitUSD = l.unitCostUSD && l.unitCostUSD > 0
          ? l.unitCostUSD
          : (l.exchangeRateUsed && l.exchangeRateUsed > 0 ? l.unitCostEGP / l.exchangeRateUsed : l.unitCostEGP / 50);
        return sum + (l.remainingQuantity * unitUSD);
      }, 0)
    : (walletData.balanceUSD || 0);

  const totalLotsCostEGP = useMemo(() => {
    return lots.reduce((sum, l) => sum + (l.totalCostEGP || 0), 0);
  }, [lots]);

  const totalLotsCostUSD = useMemo(() => {
    return lots.reduce((sum, l) => {
      const usd = l.totalCostUSD && l.totalCostUSD > 0
        ? l.totalCostUSD
        : (l.currencyOrPoints === 'USD'
            ? l.initialQuantity
            : (l.unitCostUSD && l.unitCostUSD > 0 && l.initialQuantity > 0
                ? l.initialQuantity * l.unitCostUSD
                : (l.exchangeRateUsed && l.exchangeRateUsed > 0 ? l.totalCostEGP / l.exchangeRateUsed : l.totalCostEGP / 50)));
      return sum + usd;
    }, 0);
  }, [lots]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`💼 بروفايل المحفظة: ${walletData.name}`}
      maxWidth="6xl"
    >
      <div className="space-y-4 text-right text-xs">
        {/* Top Header Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${isPoints ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                {isPoints ? <Coins className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    {walletData.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    walletData.type === 'MAIN'
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                  }`}>
                    {walletData.type === 'MAIN' ? 'محفظة رئيسية 💵' : `محفظة فرعية [${walletData.pointType || 'نقاط'}] 💎`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                  <span>تاريخ الإنشاء: {new Date(walletData.createdAt).toLocaleDateString('ar-EG')}</span>
                  <span>•</span>
                  <span>المسؤول: {walletData.createdBy || 'النظام'}</span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1 ${
                walletData.status === 'FROZEN'
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  : walletData.status === 'LOW_BALANCE'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  : walletData.status === 'SAFETY_LIMIT_REACHED'
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : walletData.status === 'DISABLED'
                  ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              }`}>
                {walletData.status === 'FROZEN' ? '🔒 مجمدة' : walletData.status === 'LOW_BALANCE' ? '⚠️ رصيد منخفض' : walletData.status === 'SAFETY_LIMIT_REACHED' ? '⛔ بلغت حد الأمان السالب' : walletData.status === 'DISABLED' ? 'معطلة' : '🟢 نشطة'}
              </span>

              {/* Quick Actions */}
              {isPoints && onOpenDepositModal && (
                <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={onOpenDepositModal}>
                  + تذكرة إيداع نقاط
                </Button>
              )}
              {!isPoints && onOpenFundingModal && (
                <Button variant="primary" size="sm" icon={<DollarSign className="w-3.5 h-3.5" />} onClick={onOpenFundingModal}>
                  + تذكرة تمويل دولاري
                </Button>
              )}
              {onOpenDeleteModal && (
                <Button variant="outline" size="sm" icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />} onClick={onOpenDeleteModal} className="text-rose-500 hover:bg-rose-500/10 border-rose-500/20">
                  حذف المحفظة
                </Button>
              )}
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-[#27272A] font-mono">
            {isPoints ? (
              <>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417]">
                  <span className="text-[10px] text-zinc-400 block font-sans">رصيد النقاط الحالي:</span>
                  <strong className="text-sm font-black text-orange-500">
                    {(walletData.pointsBalance || 0).toLocaleString()} نقطة
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417]">
                  <span className="text-[10px] text-zinc-400 block font-sans">القيمة بالجنيه والدولار (FIFO):</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <strong className="text-sm font-black text-emerald-500 font-mono">
                      {formatCurrency(totalValuationEGP)}
                    </strong>
                    {totalValuationUSD > 0 && (
                      <span className="text-[11px] font-bold text-blue-500 dark:text-blue-400 font-mono">
                        (${totalValuationUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417]">
                  <span className="text-[10px] text-zinc-400 block font-sans">حد التنبيه:</span>
                  <span className="text-xs font-bold text-amber-500">
                    {walletData.alertThreshold !== undefined ? `${walletData.alertThreshold} نقطة` : 'غير محدد'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417]">
                  <span className="text-[10px] text-zinc-400 block font-sans">حد الأمان السالب:</span>
                  <span className="text-xs font-bold text-purple-400">
                    {walletData.safetyLimit !== undefined ? `${walletData.safetyLimit} نقطة` : '-500 نقطة'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417]">
                  <span className="text-[10px] text-zinc-400 block font-sans">الرصيد بالدولار (USD):</span>
                  <strong className="text-sm font-black text-blue-500">
                    ${(walletData.balanceUSD || 0).toLocaleString()} USD
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417]">
                  <span className="text-[10px] text-zinc-400 block font-sans">الرصيد الإجمالي بالجنيه:</span>
                  <strong className="text-sm font-black text-emerald-500">
                    {formatCurrency(walletData.balanceEGP || 0)}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417]">
                  <span className="text-[10px] text-zinc-400 block font-sans">إجمالي الـ Lots المفتوحة:</span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {lots.filter(l => l.remainingQuantity > 0).length} شحنة
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417]">
                  <span className="text-[10px] text-zinc-400 block font-sans">حد التنبيه المالي:</span>
                  <span className="text-xs font-bold text-amber-500">
                    {walletData.alertThreshold ? formatCurrency(walletData.alertThreshold) : 'غير محدد'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-[#27272A] pb-2 font-bold flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('lots')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'lots'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>شحنات FIFO ({lots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>دفتر الأستاذ (Ledger Audit)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'products'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>المنتجات المرتبطة ({linkedProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('losses')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'losses'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>التجميد والخسائر</span>
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab('adjust')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'adjust'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تعديل يدوي (Audit)</span>
            </button>
          )}
        </div>

        {/* TAB 1: FIFO LOTS VIEW */}
        {activeTab === 'lots' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-500 gap-1 pb-0.5">
              <span>قائمة شحنات الـ FIFO مرتبة حسب الأقدم استهلاكاً:</span>
              <div className="flex items-center gap-2 font-mono flex-wrap">
                <span>شحنات نشطة: <strong className="text-emerald-500">{lots.filter(l => l.remainingQuantity > 0).length}</strong> / إجمالي: {lots.length}</span>
                <span>•</span>
                <span>إجمالي التكلفة: <strong className="text-zinc-900 dark:text-zinc-100">{formatCurrency(totalLotsCostEGP)}</strong> <strong className="text-blue-500 dark:text-blue-400">(${totalLotsCostUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</strong></span>
              </div>
            </div>

            {lots.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-gray-50 dark:bg-[#141417] text-zinc-400 space-y-2">
                <Layers className="w-8 h-8 mx-auto text-zinc-300" />
                <p>لا توجد شحنات FIFO مسجلة لهذه المحفظة بعد.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {lots.map((lot, idx) => {
                  const isDepleted = lot.remainingQuantity <= 0;
                  const usagePct = lot.initialQuantity > 0 ? Math.round(((lot.initialQuantity - lot.remainingQuantity) / lot.initialQuantity) * 100) : 0;

                  return (
                    <div
                      key={lot.id}
                      className={`p-3 rounded-2xl border transition-all space-y-2 ${
                        isDepleted
                          ? 'bg-gray-50 dark:bg-[#141417] border-gray-200 dark:border-[#222228] opacity-60'
                          : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] hover:border-orange-500/40 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-orange-500/10 text-orange-500 font-mono font-bold text-[10px]">
                            #{idx + 1} {lot.lotNumber}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {new Date(lot.createdAt).toLocaleString('ar-EG')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenLotDepositTicket(lot)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20 transition-all cursor-pointer shadow-xs"
                            title="فتح تذكرة وسند إيداع هذه الشحنة"
                          >
                            <FileText className="w-3 h-3" />
                            <span>تذكرة الإيداع</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditLot(lot)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/20 transition-all cursor-pointer shadow-xs"
                            title="تعديل كمية أو سعر أو بيانات شحنة الإيداع"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>تعديل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLot(lot)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-500/20 transition-all cursor-pointer shadow-xs"
                            title="حذف وإلغاء شحنة الإيداع واسترداد الرصيد"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>حذف</span>
                          </button>

                          {lot.usdRateOverridden && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold text-[10px] border border-purple-500/20" title={`تم التعديل بواسطة ${lot.overrideUser}: ${lot.overrideReason} (الأصلي: ${lot.usdRateOriginal} ج)`}>
                              🛡️ سعر معدل ({lot.exchangeRateUsed} ج)
                            </span>
                          )}

                          {isDepleted ? (
                            <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-zinc-800 text-zinc-400 font-bold text-[10px]">
                              مستهلكة بالكامل
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold text-[10px]">
                              نشطة ومتاحة
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantities and Cost Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1">
                        <div>
                          <span className="text-zinc-400 block text-[10px]">الكمية الأولية:</span>
                          <strong className="text-zinc-900 dark:text-zinc-100">
                            {lot.initialQuantity.toLocaleString()} {lot.currencyOrPoints === 'USD' ? '$' : 'نقطة'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[10px]">المتبقي:</span>
                          <strong className={lot.remainingQuantity > 0 ? 'text-emerald-500' : 'text-zinc-400'}>
                            {lot.remainingQuantity.toLocaleString()} {lot.currencyOrPoints === 'USD' ? '$' : 'نقطة'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[10px]">تكلفة الوحدة:</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">
                            {lot.unitCostEGP.toFixed(4)} ج {lot.unitCostUSD ? `($${lot.unitCostUSD.toFixed(6)})` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[10px]">إجمالي التكلفة:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className="text-zinc-800 dark:text-zinc-200">
                              {formatCurrency(lot.totalCostEGP)}
                            </strong>
                            <span className="text-blue-500 dark:text-blue-400 font-bold text-[10.5px]">
                              (${(() => {
                                const usd = lot.totalCostUSD && lot.totalCostUSD > 0
                                  ? lot.totalCostUSD
                                  : (lot.currencyOrPoints === 'USD'
                                      ? lot.initialQuantity
                                      : (lot.unitCostUSD && lot.unitCostUSD > 0 && lot.initialQuantity > 0
                                          ? lot.initialQuantity * lot.unitCostUSD
                                          : (lot.exchangeRateUsed && lot.exchangeRateUsed > 0 ? lot.totalCostEGP / lot.exchangeRateUsed : lot.totalCostEGP / 50)));
                                return usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                              })()})
                            </span>
                          </div>
                          {lot.remainingQuantity > 0 && lot.remainingQuantity < lot.initialQuantity && (
                            <span className="text-[9.5px] text-zinc-400 block mt-0.5 font-mono">
                              متبقي: {formatCurrency(lot.remainingQuantity * lot.unitCostEGP)} (${(() => {
                                const unitUSD = lot.unitCostUSD || (lot.exchangeRateUsed && lot.exchangeRateUsed > 0 ? lot.unitCostEGP / lot.exchangeRateUsed : lot.unitCostEGP / 50);
                                return (lot.remainingQuantity * unitUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                              })()})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isDepleted ? 'bg-zinc-400' : usagePct > 80 ? 'bg-amber-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${Math.min(100, usagePct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LEDGER AUDIT TRAIL VIEW */}
        {activeTab === 'ledger' && (
          <div className="space-y-3">
            {/* Ledger Filters Bar */}
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                {/* 1. In / Out / All Flow Selector */}
                <div className="flex items-center gap-1 bg-white dark:bg-[#18181B] p-1 rounded-xl border border-gray-200 dark:border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => {
                      setTxFlowFilter('all');
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      txFlowFilter === 'all'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxFlowFilter('in');
                      if (txTypeFilter === 'CONSUMPTION' || txTypeFilter === 'WITHDRAWAL' || txTypeFilter === 'LOSS') {
                        setTxTypeFilter('all');
                      }
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      txFlowFilter === 'in'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-zinc-500 hover:text-emerald-500'
                    }`}
                  >
                    وارد (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxFlowFilter('out');
                      if (txTypeFilter === 'DEPOSIT' || txTypeFilter === 'FUNDING' || txTypeFilter === 'RECOVERY') {
                        setTxTypeFilter('all');
                      }
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      txFlowFilter === 'out'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-zinc-500 hover:text-rose-500'
                    }`}
                  >
                    صادر (-)
                  </button>
                </div>

                {/* 2. Operation Type Filter */}
                <div>
                  <select
                    value={txTypeFilter}
                    onChange={e => setTxTypeFilter(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-800 dark:text-zinc-200 font-bold outline-none text-xs focus:border-orange-500"
                  >
                    <option value="all">🌐 كافة العمليات</option>
                    <option value="CONSUMPTION">🛒 استهلاك تذكرة (صادر)</option>
                    <option value="DEPOSIT">📥 إيداع شحنة نقاط (وارد)</option>
                    <option value="FUNDING">💵 تمويل دولاري USDT (وارد)</option>
                    <option value="PURCHASE">💳 شراء نقاط لمحفظة</option>
                    <option value="ADJUSTMENT">⚖️ تسوية دفتري يدوي</option>
                    <option value="REVERSAL">↩️ استرجاع وإلغاء</option>
                    <option value="WITHDRAWAL">📤 سحب رصيد</option>
                    <option value="LOSS">⚠️ خسارة مسجلة</option>
                    <option value="FREEZE">🧊 تجميد رصيد</option>
                    <option value="RECOVERY">🛡️ استرداد وتعويض</option>
                  </select>
                </div>

                {/* 3. Date Range Filter */}
                <div>
                  <select
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-800 dark:text-zinc-200 font-bold outline-none text-xs focus:border-orange-500"
                  >
                    <option value="all">📅 كل الفترات الزمنية</option>
                    <option value="today">اليوم</option>
                    <option value="yesterday">أمس</option>
                    <option value="7days">آخر 7 أيام</option>
                    <option value="30days">آخر 30 يوم</option>
                  </select>
                </div>

                {/* 4. Sorting Filter */}
                <div>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-800 dark:text-zinc-200 font-bold outline-none text-xs focus:border-orange-500"
                  >
                    <option value="newest">⏱️ الأحدث أولاً</option>
                    <option value="oldest">⏱️ الأقدم أولاً</option>
                    <option value="highest">📈 الأكبر كمية</option>
                    <option value="lowest">📉 الأصغر كمية</option>
                  </select>
                </div>
              </div>

              {/* Search Bar & Action Reset Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-200/60 dark:border-[#27272A]/60">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="بحث سريع: رقم التذكرة #، العميل، المنتج، رقم الدفعة..."
                    className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] pr-9 pl-8 py-1.5 text-zinc-800 dark:text-zinc-200 outline-none text-xs focus:border-orange-500"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-500">
                    عرض <strong>{transactions.length}</strong> من إجمالي <strong>{rawTransactions.length}</strong> حركة
                  </span>

                  {isFiltered && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-2 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 font-bold text-[11px] flex items-center gap-1 border border-orange-500/20 cursor-pointer transition-colors"
                      title="إعادة ضبط كافة الفلاتر"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>تصفير الفلاتر</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Orphaned Consumptions Banner (for deleted tickets) */}
            {orphanedConsumptions.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-black text-xs text-amber-600 dark:text-amber-400">
                      تنبيه: تم رصد {orphanedConsumptions.length} حركات استهلاك لتذاكر تم حذفها من النظام!
                    </h5>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                      إجمالي النقاط المعلقة: <strong className="text-amber-500 font-mono font-black">{orphanedConsumptions.reduce((s, x) => s + (x.quantityOut || 0), 0).toLocaleString()} نقطة</strong> لم يتم استردادها بعد حذف التذاكر.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRollbackAllOrphans}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استرداد كافة التذاكر المحذوفة ({orphanedConsumptions.reduce((s, x) => s + (x.quantityOut || 0), 0)} نقطة)</span>
                </button>
              </div>
            )}

            {/* Transactions Table */}
            {transactions.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-gray-50 dark:bg-[#141417] text-zinc-400 border border-dashed border-gray-200 dark:border-[#27272A] space-y-2">
                <p className="font-bold text-sm">لا توجد حركات مسجلة تطابق خيارات الفلتر والبحث المحددة.</p>
                {isFiltered && (
                  <Button type="button" variant="outline" size="sm" onClick={handleResetFilters} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                    تصفير الفلاتر وإظهار كل الحركات
                  </Button>
                )}
              </div>
            ) : (
              <div className="max-h-[460px] overflow-y-auto border border-gray-200 dark:border-[#27272A] rounded-2xl shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-100 dark:bg-[#18181B] font-black text-zinc-700 dark:text-zinc-200 sticky top-0 z-10 border-b border-gray-200 dark:border-[#27272A] backdrop-blur-md">
                    <tr>
                      <th className="p-3">التاريخ / الوقت</th>
                      <th className="p-3">نوع العملية</th>
                      <th className="p-3">الوارد / الصادر</th>
                      <th className="p-3">نوع ومصدر التمويل</th>
                      <th className="p-3">المصدر / التذكرة</th>
                      <th className="p-3">القيمة المحسوبة</th>
                      <th className="p-3">الرصيد بعد</th>
                      <th className="p-3">المنفذ والملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 font-sans">
                    {transactions.map(t => {
                      const isOutbound = (t.quantityOut && t.quantityOut > 0) || t.transactionType === 'CONSUMPTION' || t.transactionType === 'PURCHASE' || t.transactionType === 'LOSS' || t.transactionType === 'WITHDRAWAL';
                      const isInbound = (t.quantityIn && t.quantityIn > 0) || t.transactionType === 'DEPOSIT' || t.transactionType === 'FUNDING' || t.transactionType === 'RECOVERY';

                      const typeInfo = getTransactionTypeArabicInfo(t.transactionType);

                      // Lookup matched ticket if available
                      const matchedTicket = (t.ticketId ? ticketsMap.get(t.ticketId) : undefined) ||
                                           (t.ticketNumber ? ticketsMap.get(t.ticketNumber) : undefined) ||
                                           (t.referenceId ? ticketsMap.get(t.referenceId) : undefined);

                      // Source / Ticket Link Display
                      let flowInfo: React.ReactNode = null;
                      if (t.transactionType === 'CONSUMPTION') {
                        const ticketDisplayNum = t.ticketNumber || matchedTicket?.ticketNumber || t.ticketId || t.referenceId;
                        const isOrphan = !matchedTicket;

                        flowInfo = (
                          <div className="space-y-1.5">
                            {isOrphan ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-500 font-bold text-[10.5px] border border-rose-500/20">
                                  <Trash2 className="w-2.5 h-2.5 shrink-0" />
                                  <span>تذكرة محذوفة #{ticketDisplayNum}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRollbackSingleOrphan(t)}
                                  className="w-full text-right px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-[10px] border border-rose-500/30 transition-all cursor-pointer flex items-center justify-between gap-1 group/btn shadow-2xs"
                                  title="استرجاع النقاط إلى المحفظة وعكس المبلغ من الكاش وحذف هذه الحركة"
                                >
                                  <span className="flex items-center gap-1">
                                    <RotateCcw className="w-2.5 h-2.5 group-hover/btn:rotate-180 transition-transform" />
                                    <span>استرجاع النقاط وعكس الحركة</span>
                                  </span>
                                  <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                                    +{t.quantityOut} نقطة
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenTicketDetails(t)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-600 dark:text-purple-300 font-bold border border-purple-500/30 hover:border-purple-400 transition-all cursor-pointer shadow-xs group"
                                title="انقر لفتح وعرض تفاصيل التذكرة كاملة"
                              >
                                <Ticket className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
                                <span className="font-mono font-bold text-xs underline decoration-purple-400/50 underline-offset-2">
                                  #{ticketDisplayNum}
                                </span>
                                <ExternalLink className="w-3 h-3 text-purple-400 opacity-70 group-hover:opacity-100 shrink-0" />
                              </button>
                            )}

                            {(t.productName || matchedTicket?.gameProductName) && (
                              <span className="block text-zinc-900 dark:text-zinc-100 font-bold text-[11px] truncate max-w-[180px]" title={t.productName || matchedTicket?.gameProductName}>
                                📦 {t.productName || matchedTicket?.gameProductName}
                              </span>
                            )}
                            {(t.customerName || matchedTicket?.customerName) && (
                              <span className="block text-zinc-500 dark:text-zinc-400 text-[10px] truncate max-w-[180px]">
                                👤 {t.customerName || matchedTicket?.customerName}
                              </span>
                            )}
                          </div>
                        );
                      } else if (t.transactionType === 'DEPOSIT') {
                        const depTicketNum = t.ticketNumber || t.lotNumber || `DEP-${t.id.replace('tx_dep_', '').slice(-6)}`;
                        flowInfo = (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDepositTicket(t)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-500/30 hover:border-emerald-400 transition-all cursor-pointer shadow-xs group"
                              title="انقر لفتح واستعراض تذكرة الإيداع كاملة"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                              <span className="font-mono font-bold text-xs underline decoration-emerald-400/50 underline-offset-2">
                                #{depTicketNum}
                              </span>
                              <ExternalLink className="w-3 h-3 text-emerald-400 opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                            <span className="text-emerald-500 font-bold text-[10.5px] block">
                              شحنة نقاط واردة للمخزون
                            </span>
                            {t.lotNumber && (
                              <span className="font-mono text-[9.5px] text-zinc-400 block">
                                دفعة #{t.lotNumber}
                              </span>
                            )}
                          </div>
                        );
                      } else if (t.transactionType === 'PURCHASE') {
                        flowInfo = (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setOpenedTxDetails(t)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-500/15 hover:bg-orange-500/30 text-orange-600 dark:text-orange-300 font-bold border border-orange-500/30 hover:border-orange-400 transition-all cursor-pointer shadow-xs group"
                              title="انقر لفتح واستعراض تفاصيل حركة الشراء والملاحظات"
                            >
                              <FileText className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform shrink-0" />
                              <span className="font-mono font-bold text-xs underline decoration-orange-400/50 underline-offset-2">
                                #{t.transactionNumber || t.id.slice(-8)}
                              </span>
                              <ExternalLink className="w-3 h-3 text-orange-400 opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                            <span className="text-orange-500 font-bold text-[10.5px] block">
                              صادر للمحفظة الفرعية
                            </span>
                          </div>
                        );
                      } else if (t.transactionType === 'FUNDING') {
                        const fundTicketNum = t.ticketNumber || t.lotNumber || `FUND-${t.id.replace('tx_fund_', '').slice(-6)}`;
                        flowInfo = (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDepositTicket(t)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/15 hover:bg-blue-500/30 text-blue-600 dark:text-blue-300 font-bold border border-blue-500/30 hover:border-blue-400 transition-all cursor-pointer shadow-xs group"
                              title="انقر لفتح واستعراض تذكرة التمويل كاملة"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                              <span className="font-mono font-bold text-xs underline decoration-blue-400/50 underline-offset-2">
                                #{fundTicketNum}
                              </span>
                              <ExternalLink className="w-3 h-3 text-blue-400 opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                            <span className="text-blue-500 font-bold text-[10.5px] block">
                              إيداع تمويل للمحفظة
                            </span>
                          </div>
                        );
                      } else if (t.transactionType === 'WITHDRAWAL') {
                        flowInfo = (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setOpenedTxDetails(t)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-600 dark:text-rose-300 font-bold border border-rose-500/30 hover:border-rose-400 transition-all cursor-pointer shadow-xs group"
                              title="انقر لفتح واستعراض تفاصيل حركة السحب والملاحظات"
                            >
                              <FileText className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform shrink-0" />
                              <span className="font-mono font-bold text-xs underline decoration-rose-400/50 underline-offset-2">
                                #{t.transactionNumber || t.id.slice(-8)}
                              </span>
                              <ExternalLink className="w-3 h-3 text-rose-400 opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                            <span className="text-rose-500 font-bold text-[10.5px] block">
                              سحب إلى: {t.referenceId || 'جهة خارجية'}
                            </span>
                          </div>
                        );
                      } else if (t.transactionType === 'RECOVERY') {
                        flowInfo = (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setOpenedTxDetails(t)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-bold border border-cyan-500/30 hover:border-cyan-400 transition-all cursor-pointer shadow-xs group"
                              title="انقر لفتح واستعراض تفاصيل حركة الاسترداد والتعويض كاملة مع الملاحظات"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
                              <span className="font-mono font-bold text-xs underline decoration-cyan-400/50 underline-offset-2">
                                #{t.transactionNumber || t.id.slice(-8)}
                              </span>
                              <ExternalLink className="w-3 h-3 text-cyan-400 opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                            <span className="text-cyan-600 dark:text-cyan-400 font-bold text-[10.5px] block">
                              استرداد / تعويض رصيد
                            </span>
                          </div>
                        );
                      } else if (t.transactionType === 'LOSS') {
                        flowInfo = (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setOpenedTxDetails(t)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-600 dark:text-rose-300 font-bold border border-rose-500/30 hover:border-rose-400 transition-all cursor-pointer shadow-xs group"
                              title="انقر لفتح واستعراض تفاصيل حركة الخسارة المسجلة كاملة مع الملاحظات"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
                              <span className="font-mono font-bold text-xs underline decoration-rose-400/50 underline-offset-2">
                                #{t.transactionNumber || t.id.slice(-8)}
                              </span>
                              <ExternalLink className="w-3 h-3 text-rose-400 opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                            <span className="text-rose-600 dark:text-rose-400 font-bold text-[10.5px] block">
                              خسارة مسجلة (عجز)
                            </span>
                          </div>
                        );
                      } else if (t.transactionType === 'ADJUSTMENT') {
                        flowInfo = (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setOpenedTxDetails(t)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-600 dark:text-amber-300 font-bold border border-amber-500/30 hover:border-amber-400 transition-all cursor-pointer shadow-xs group"
                              title="انقر لفتح واستعراض تفاصيل حركة التسوية الدفترية كاملة مع الملاحظات"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                              <span className="font-mono font-bold text-xs underline decoration-amber-400/50 underline-offset-2">
                                #{t.transactionNumber || t.id.slice(-8)}
                              </span>
                              <ExternalLink className="w-3 h-3 text-amber-400 opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                            <span className="text-amber-600 dark:text-amber-400 font-bold text-[10.5px] block">
                              تسوية جرد دفتري
                            </span>
                          </div>
                        );
                      } else if (t.transactionType === 'REVERSAL') {
                        flowInfo = (
                          <div className="space-y-1">
                            {matchedTicket ? (
                              <button
                                type="button"
                                onClick={() => handleOpenTicketDetails(t)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-600 dark:text-purple-300 font-bold border border-purple-500/30 hover:border-purple-400 transition-all cursor-pointer shadow-xs group"
                                title="انقر لفتح واستعراض التذكرة المسترجعة"
                              >
                                <Ticket className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform shrink-0" />
                                <span className="font-mono font-bold text-xs underline decoration-purple-400/50 underline-offset-2">
                                  #{t.ticketNumber || matchedTicket.ticketNumber || t.ticketId}
                                </span>
                                <ExternalLink className="w-3 h-3 text-purple-400 opacity-70 group-hover:opacity-100 shrink-0" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setOpenedTxDetails(t)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-600 dark:text-purple-300 font-bold border border-purple-500/30 hover:border-purple-400 transition-all cursor-pointer shadow-xs group"
                                title="انقر لفتح تفاصيل حركة الاسترجاع والملاحظات"
                              >
                                <FileText className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform shrink-0" />
                                <span className="font-mono font-bold text-xs underline decoration-purple-400/50 underline-offset-2">
                                  #{t.transactionNumber || t.id.slice(-8)}
                                </span>
                                <ExternalLink className="w-3 h-3 text-purple-400 opacity-70 group-hover:opacity-100 shrink-0" />
                              </button>
                            )}
                            <span className="text-purple-600 dark:text-purple-400 font-bold text-[10.5px] block">
                              استرجاع / إلغاء تذكرة
                            </span>
                          </div>
                        );
                      } else {
                        flowInfo = (
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setOpenedTxDetails(t)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold border border-gray-200 dark:border-zinc-700 transition-all cursor-pointer shadow-xs group"
                              title="انقر لفتح تفاصيل الحركة والملاحظات"
                            >
                              <FileText className="w-3.5 h-3.5 text-zinc-400 group-hover:scale-110 transition-transform shrink-0" />
                              <span className="font-mono font-bold text-xs underline decoration-zinc-400/50 underline-offset-2">
                                #{t.transactionNumber || t.id.slice(-8)}
                              </span>
                              <ExternalLink className="w-3 h-3 text-zinc-400 opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                            <span className="text-zinc-400 text-[10px] block font-mono">
                              {t.referenceType === 'MANUAL' ? 'عملية يدوية معتمدة' : (t.referenceType || 'حركة نظام')}
                            </span>
                          </div>
                        );
                      }

                      // Funding Type Display
                      let fundingDisplay: React.ReactNode = null;
                      if (t.transactionType === 'CONSUMPTION') {
                        const payMethod = matchedTicket?.paymentGateway || matchedTicket?.paymentWallet || 'سداد إلكتروني';
                        fundingDisplay = (
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] inline-flex items-center gap-1 border border-emerald-500/20">
                              <CreditCard className="w-3 h-3 shrink-0" />
                              <span>{payMethod}</span>
                            </span>
                            {matchedTicket?.paymentReceivedPhone && (
                              <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                                خط: {matchedTicket.paymentReceivedPhone}
                              </span>
                            )}
                            {t.lotNumber && (
                              <span className="block text-[9px] text-zinc-400 font-mono">
                                شحنة المخزون: {t.lotNumber}
                              </span>
                            )}
                          </div>
                        );
                      } else if (t.transactionType === 'DEPOSIT') {
                        fundingDisplay = (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 font-bold text-[11px] inline-flex items-center gap-1 border border-blue-500/20">
                              <Wallet className="w-3 h-3 shrink-0" />
                              <span>تمويل محفظة رئيسية</span>
                            </span>
                            {t.lotNumber && (
                              <span className="block text-[10px] text-zinc-400 font-mono">
                                دفعة FIFO: {t.lotNumber}
                              </span>
                            )}
                          </div>
                        );
                      } else if (t.transactionType === 'FUNDING') {
                        fundingDisplay = (
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-[11px] inline-flex items-center gap-1 border border-indigo-500/20">
                            <DollarSign className="w-3 h-3 shrink-0" />
                            <span>إيداع دولاري (USDT)</span>
                          </span>
                        );
                      } else if (t.transactionType === 'ADJUSTMENT') {
                        fundingDisplay = (
                          <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 font-bold text-[11px] border border-purple-500/20">
                            تسوية جرد دفتري
                          </span>
                        );
                      } else if (t.transactionType === 'REVERSAL') {
                        fundingDisplay = (
                          <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 font-bold text-[11px] border border-purple-500/20">
                            إلغاء واسترداد رصيد
                          </span>
                        );
                      } else {
                        fundingDisplay = <span className="text-zinc-400 text-xs font-mono">—</span>;
                      }

                      return (
                        <tr key={t.id} className="hover:bg-orange-500/5 dark:hover:bg-zinc-800/40 transition-colors">
                          {/* 1. Date & Time */}
                          <td className="p-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300 font-mono text-xs">
                            <span className="block font-bold text-zinc-900 dark:text-zinc-100">
                              {new Date(t.createdAt).toLocaleDateString('ar-EG')}
                            </span>
                            <span className="block text-[10px] text-zinc-400">
                              {new Date(t.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                            </span>
                          </td>

                          {/* 2. Operation Type (Arabic) */}
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-xl text-xs inline-block shadow-2xs ${typeInfo.className}`}>
                              {typeInfo.label}
                            </span>
                          </td>

                          {/* 3. In / Out Quantity */}
                          <td className="p-3 font-mono font-black whitespace-nowrap text-xs">
                            {isInbound && t.quantityIn ? (
                              <span className="text-emerald-500 block">
                                +{t.quantityIn.toLocaleString()} {isPoints ? 'نقطة' : '$'}
                              </span>
                            ) : null}
                            {isOutbound && t.quantityOut ? (
                              <span className="text-rose-500 block">
                                -{t.quantityOut.toLocaleString()} {isPoints ? 'نقطة' : '$'}
                              </span>
                            ) : null}
                            {!t.quantityIn && !t.quantityOut && <span className="text-zinc-400">—</span>}
                          </td>

                          {/* 4. Funding Source / Type */}
                          <td className="p-3 whitespace-nowrap">
                            {fundingDisplay}
                          </td>

                          {/* 5. Destination / Ticket */}
                          <td className="p-3">
                            {flowInfo}
                          </td>

                          {/* 6. Valuation */}
                          <td className="p-3 whitespace-nowrap font-mono">
                            <span className="text-zinc-900 dark:text-zinc-100 font-black text-xs block">
                              {formatCurrency(t.amountEGP)}
                            </span>
                            {t.amountUSD ? (
                              <span className="text-[10px] text-zinc-400 block">
                                (${t.amountUSD.toLocaleString()})
                              </span>
                            ) : null}
                          </td>

                          {/* 7. Balance After */}
                          <td className="p-3 text-blue-500 font-mono font-black text-xs whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 inline-block">
                              {t.balanceAfter?.toLocaleString() || 0} {isPoints ? 'نقطة' : '$'}
                            </span>
                          </td>

                          {/* 8. Executor & Notes */}
                          <td className="p-3 text-xs max-w-xs">
                            <span className="block font-bold text-zinc-700 dark:text-zinc-300 truncate">
                              👤 {(() => {
                                const rawP = t.performedBy?.name;
                                if (rawP && rawP !== 'النظام' && rawP !== 'system') return rawP;
                                if (matchedTicket?.assignedTo && matchedTicket.assignedTo !== 'النظام' && matchedTicket.assignedTo !== 'system') return matchedTicket.assignedTo;
                                if (matchedTicket?.resolutionDetails?.resolvedBy) return matchedTicket.resolutionDetails.resolvedBy;
                                return 'المدير العام (Owner)';
                              })()}
                            </span>
                            {t.notes && (
                              <button
                                type="button"
                                onClick={() => setOpenedTxDetails(t)}
                                className="w-full text-right text-zinc-700 dark:text-zinc-300 hover:text-orange-500 dark:hover:text-orange-400 text-[11px] leading-relaxed mt-1.5 font-sans bg-gray-50 dark:bg-zinc-800/70 hover:bg-orange-500/10 dark:hover:bg-orange-500/10 p-2 rounded-xl border border-gray-200/80 dark:border-zinc-700/60 transition-all cursor-pointer group/note shadow-2xs block"
                                title="انقر لفتح كامل تفاصيل الحركة وملاحظاتها في نافذة مستقلة"
                              >
                                <div className="flex items-start gap-1.5">
                                  <span className="shrink-0 text-amber-500 font-bold">📝</span>
                                  <span className="line-clamp-2 break-words font-medium">{t.notes}</span>
                                </div>
                                <span className="text-[9.5px] text-orange-500 font-bold block mt-1 group-hover/note:underline">
                                  عرض بيان الحركة كاملاً ←
                                </span>
                              </button>
                            )}
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

        {/* TAB: LINKED PRODUCTS (المنتجات المرتبطة بالمحفظة) */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Summary Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
                <span className="text-[10px] text-zinc-400 block font-sans">إجمالي المنتجات المرتبطة:</span>
                <strong className="text-base font-black text-orange-500">
                  {linkedProducts.length} منتج
                </strong>
                <span className="text-[9px] text-zinc-400 block mt-0.5 font-sans">عبر شجرة كتالوج الألعاب</span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-sans font-bold">
                  محفظة أساسية (أولوية #1):
                </span>
                <strong className="text-base font-black text-emerald-500">
                  {linkedProducts.filter(p => p.isPrimary).length} منتج
                </strong>
                <span className="text-[9px] text-zinc-400 block mt-0.5 font-sans">تستهلك مباشرة أولاً</span>
              </div>

              <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-sans font-bold">
                  محفظة بديلة (احتياطية):
                </span>
                <strong className="text-base font-black text-blue-500">
                  {linkedProducts.filter(p => !p.isPrimary).length} منتج
                </strong>
                <span className="text-[9px] text-zinc-400 block mt-0.5 font-sans">تستهلك عند نفاد الأساسية</span>
              </div>

              <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-sans font-bold">
                  {isPoints ? 'متوسط تكلفة النقاط:' : 'الرصيد المالي المتاح:'}
                </span>
                <strong className="text-base font-black text-purple-400">
                  {isPoints
                    ? linkedProducts.length > 0
                      ? `${Math.round(linkedProducts.reduce((acc, p) => acc + (p.pointsCostPerUnit || 0), 0) / linkedProducts.length).toLocaleString()} نقطة`
                      : '0'
                    : `${(walletData.balanceUSD || 0).toLocaleString()} $`
                  }
                </strong>
                <span className="text-[9px] text-zinc-400 block mt-0.5 font-sans">
                  {isPoints ? 'متوسط السحب لكل طلب' : 'الرصيد الدولاري للمحفظة'}
                </span>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="بحث باسم المنتج، اللعبة، أو كود SKU..."
                  className="w-full pr-8 pl-8 py-1.5 text-xs rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-orange-500 transition-colors"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setProductFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    productFilterType === 'all'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-white dark:bg-[#18181B] text-zinc-500 hover:text-zinc-200 border border-gray-200 dark:border-[#27272A]'
                  }`}
                >
                  الكل ({linkedProducts.length})
                </button>

                <button
                  type="button"
                  onClick={() => setProductFilterType('primary')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    productFilterType === 'primary'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-white dark:bg-[#18181B] text-zinc-500 hover:text-zinc-200 border border-gray-200 dark:border-[#27272A]'
                  }`}
                >
                  أساسية فقط ({linkedProducts.filter(p => p.isPrimary).length})
                </button>

                <button
                  type="button"
                  onClick={() => setProductFilterType('alternative')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    productFilterType === 'alternative'
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'bg-white dark:bg-[#18181B] text-zinc-500 hover:text-zinc-200 border border-gray-200 dark:border-[#27272A]'
                  }`}
                >
                  بديلة فقط ({linkedProducts.filter(p => !p.isPrimary).length})
                </button>

                <button
                  type="button"
                  onClick={() => setProductFilterType('first_shipping')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    productFilterType === 'first_shipping'
                      ? 'bg-purple-500 text-white shadow-xs'
                      : 'bg-white dark:bg-[#18181B] text-zinc-500 hover:text-zinc-200 border border-gray-200 dark:border-[#27272A]'
                  }`}
                >
                  شحن أول مرة ({linkedProducts.filter(p => p.catalogType === 'first_shipping').length})
                </button>
              </div>
            </div>

            {/* Products List / Cards */}
            {filteredProducts.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-zinc-400 space-y-2">
                <Package className="w-10 h-10 mx-auto text-zinc-400 opacity-60" />
                <h4 className="text-sm font-bold text-zinc-300">
                  {linkedProducts.length === 0 ? 'لا توجد منتجات مرتبطة بهذه المحفظة حالياً' : 'لا توجد نتائج مطابقة لبحثك'}
                </h4>
                <p className="text-xs text-zinc-500 max-w-md mx-auto font-sans">
                  {linkedProducts.length === 0
                    ? 'يمكنك ربط المنتجات بهذه المحفظة إما كمحفظة أساسية أو محفظة بديلة من خلال إعدادات المنتجات في قسم كتالوج الألعاب.'
                    : 'جرّب تغيير عبارة البحث أو التصفية لعرض المنتجات المطلوبة.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {filteredProducts.map(product => {
                  // Calculate stock fulfillment capacity
                  const canFulfillUnits = isPoints && product.pointsCostPerUnit > 0
                    ? Math.floor((walletData.pointsBalance || 0) / product.pointsCostPerUnit)
                    : null;

                  return (
                    <div
                      key={`${product.catalogType}_${product.id}`}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-orange-500/40 transition-all shadow-xs space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Game & Product info */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#222228] border border-gray-200 dark:border-[#2b2b32] flex items-center justify-center overflow-hidden shrink-0">
                            {product.gameIcon || product.gameImage ? (
                              <img
                                src={product.gameIcon || product.gameImage}
                                alt={product.gameTitle}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Gamepad2 className="w-5 h-5 text-zinc-400" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-zinc-900 dark:text-zinc-100 font-sans">
                                {product.name}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-bold font-sans">
                                [{product.gameTitle}]
                              </span>
                              {product.sectionName && (
                                <span className="text-[10px] text-zinc-500 font-sans">
                                  • {product.sectionName}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400 font-mono">
                              <span>SKU: {product.sku}</span>
                              <button
                                type="button"
                                onClick={() => handleCopySku(product.sku)}
                                className="p-0.5 rounded hover:text-orange-400 transition-colors cursor-pointer"
                                title="نسخ كود الـ SKU"
                              >
                                {copiedSku === product.sku ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3 text-zinc-500" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Priority & Catalog Badges */}
                        <div className="flex items-center gap-2 flex-wrap font-sans">
                          {product.catalogType === 'first_shipping' ? (
                            <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold text-[10px]">
                              🚀 شحن أول مرة
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-[10px]">
                              🎮 كتالوج عادي
                            </span>
                          )}

                          {product.isPrimary ? (
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] flex items-center gap-1">
                              ⭐ محفظة أساسية (أولوية #1)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold text-[10px] flex items-center gap-1">
                              🔄 محفظة بديلة (أولوية #{product.priority})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing & Stock Coverage Row */}
                      <div className="pt-2 border-t border-gray-100 dark:border-[#27272A] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417]">
                          <span className="text-[10px] text-zinc-400 block font-sans">تكلفة النقاط للطلب:</span>
                          <strong className="text-orange-500 font-bold">
                            {product.pointsCostPerUnit > 0 ? `${product.pointsCostPerUnit.toLocaleString()} نقطة` : 'غير محدد'}
                          </strong>
                        </div>

                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417]">
                          <span className="text-[10px] text-zinc-400 block font-sans">سعر البيع للعميل:</span>
                          <strong className="text-zinc-900 dark:text-zinc-100 font-bold">
                            {formatCurrency(product.calculatedPriceEGP)}
                          </strong>
                        </div>

                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417]">
                          <span className="text-[10px] text-zinc-400 block font-sans">سعر بيع التاجر:</span>
                          <strong className="text-zinc-700 dark:text-zinc-300 font-bold">
                            {formatCurrency(product.dealerPriceEGP || product.calculatedPriceEGP)}
                          </strong>
                        </div>

                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417]">
                          <span className="text-[10px] text-zinc-400 block font-sans">تغطية الرصيد الحالي:</span>
                          {canFulfillUnits !== null ? (
                            canFulfillUnits > 20 ? (
                              <span className="font-bold text-emerald-400">
                                🟢 يكفي {canFulfillUnits.toLocaleString()} طلب
                              </span>
                            ) : canFulfillUnits > 0 ? (
                              <span className="font-bold text-amber-400">
                                🟡 يكفي {canFulfillUnits.toLocaleString()} طلب (منخفض)
                              </span>
                            ) : (
                              <span className="font-bold text-rose-500">
                                🔴 غير كافٍ (0 طلب)
                              </span>
                            )
                          ) : (
                            <span className="text-zinc-400 font-sans text-[10px]">
                              {isPoints ? 'لم تحدد نقاط' : 'محفظة مالية'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LOSSES & FREEZES (Section 21: الخسائر والتجميد) */}
        {activeTab === 'losses' && (
          <div className="space-y-4">
            {/* Section 21 Summary Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold font-sans">
                  خسارة محتملة (تجميد):
                </span>
                <strong className="text-sm font-black text-amber-500 block mt-0.5">
                  {walletData.status === 'FROZEN' ? (isPoints ? `${(walletData.pointsBalance || 0).toLocaleString()} نقطة` : formatCurrency(walletData.potentialLossAmount || 0)) : '0'}
                </strong>
                <span className="text-[9px] text-zinc-400 block font-sans">
                  {walletData.status === 'FROZEN' ? '⚠️ المحفظة مجمدة حالياً' : '🟢 المحفظة نشطة'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold font-sans">
                  إجمالي الخسارة المؤكدة:
                </span>
                <strong className="text-sm font-black text-rose-500 block mt-0.5">
                  {isPoints ? `${realConfirmedLossPoints.toLocaleString()} نقطة` : formatCurrency(walletData.confirmedLossAmount || 0)}
                </strong>
                <span className="text-[9px] text-zinc-400 block font-sans">مسجلة ومعتمدة</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold font-sans">
                  التعويض المسترد:
                </span>
                <strong className="text-sm font-black text-emerald-500 block mt-0.5">
                  {isPoints ? `${realRecoveredPoints.toLocaleString()} نقطة` : formatCurrency(walletData.recoveredLossAmount || 0)}
                </strong>
                <span className="text-[9px] text-zinc-400 block font-sans">استرداد جزئي/كلي</span>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-bold font-sans">
                  صافي الخسارة الفعلي:
                </span>
                <strong className="text-sm font-black text-purple-400 block mt-0.5">
                  {isPoints
                    ? `${Math.max(0, realConfirmedLossPoints - realRecoveredPoints).toLocaleString()} نقطة`
                    : formatCurrency(Math.max(0, (walletData.confirmedLossAmount || 0) - (walletData.recoveredLossAmount || 0)))}
                </strong>
                <span className="text-[9px] text-zinc-400 block font-sans">الخسارة - المسترد</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs flex items-center justify-between gap-2">
              <span className="font-bold">
                📢 نظام المراقبة: يتم إرسال تنبيه رقابي فوري للمالك عند كل عملية تجميد، تسجيل خسارة مؤكدة، أو تسجيل تعويض.
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-[10px] font-bold">
                تنبيه فوري للمالك ✓
              </span>
            </div>

            {/* Freeze Management */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="block text-zinc-900 dark:text-zinc-100">
                    {walletData.status === 'FROZEN' ? '🔓 فك تجميد المحفظة' : '🔒 تجميد المحفظة (Potential Loss)'}
                  </strong>
                  <span className="text-[10px] text-zinc-400">
                    عند التجميد، يتم توقيف المحفظة فوراً عن استهلاك أي نقاط في التذاكر، وتسجيل قيمتها كخسارة محتملة.
                  </span>
                </div>
                <Button
                  variant={walletData.status === 'FROZEN' ? 'primary' : 'danger'}
                  size="sm"
                  onClick={handleToggleFreeze}
                >
                  {walletData.status === 'FROZEN' ? 'فك التجميد الآن' : 'تجميد المحفظة'}
                </Button>
              </div>

              {walletData.status !== 'FROZEN' && (
                <input
                  type="text"
                  value={freezeReason}
                  onChange={e => setFreezeReason(e.target.value)}
                  placeholder="سبب التجميد (مطلوب)..."
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
                />
              )}
            </div>

            {/* Confirmed Loss Form */}
            <form onSubmit={handleRecordLoss} className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
              <strong className="block text-rose-500 font-bold">
                ⚠️ تسجيل خسارة مؤكدة (Confirmed Loss)
              </strong>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
                    {isPoints ? 'عدد النقاط المفقودة نهائياً (تخصم من الرصيد) *' : 'المبلغ المفقود نهائياً *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={lossAmount || ''}
                    onChange={e => setLossAmount(parseFloat(e.target.value) || 0)}
                    placeholder={isPoints ? 'مثال: 1000' : '50'}
                    className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-rose-500/40 p-2 font-mono outline-none"
                  />

                  {/* Live Cost Calculation Preview */}
                  {lossCostInfo && lossAmount > 0 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs font-mono space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400 font-sans text-[11px]">
                          💰 تكلفة النقاط المفقودة:
                        </span>
                        <strong className="text-rose-500 font-black text-xs">
                          ${lossCostInfo.totalCostUSD.toFixed(2)} USD
                          <span className="text-zinc-400 mx-1">|</span>
                          {formatCurrency(lossCostInfo.totalCostEGP)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-rose-500/20 font-sans">
                        <span>💱 معادلة الصرف:</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          1$ = {lossCostInfo.effectiveRate.toFixed(2)} ج.م
                          {isPoints && ` (النقطة = ${lossCostInfo.costPerPointEGP.toFixed(4)} ج)`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
                    السبب والبيان *
                  </label>
                  <input
                    type="text"
                    required
                    value={lossReason}
                    onChange={e => setLossReason(e.target.value)}
                    placeholder="مثال: إغلاق الحساب من الشركة المزودة"
                    className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-rose-500/40 p-2 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="danger" size="sm">
                  اعتماد الخسارة في السجل
                </Button>
              </div>
            </form>

            {/* Recovery Form */}
            <form onSubmit={handleRecordRecovery} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <strong className="block text-emerald-500 font-bold">
                💰 تسجيل تعويض عن خسارة (Loss Recovery)
              </strong>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
                    {isPoints ? 'عدد النقاط المستردة / المعوّضة (تضاف للرصيد) *' : 'مبلغ التعويض المسترد (جنيه) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={recoveryAmount || ''}
                    onChange={e => setRecoveryAmount(parseFloat(e.target.value) || 0)}
                    placeholder={isPoints ? 'مثال: 1000' : '3000'}
                    className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-emerald-500/40 p-2 font-mono outline-none"
                  />

                  {/* Live Cost Calculation Preview */}
                  {recoveryCostInfo && recoveryAmount > 0 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400 font-sans text-[11px]">
                          💰 تكلفة وقيمة النقاط المستردة:
                        </span>
                        <strong className="text-emerald-500 font-black text-xs">
                          ${recoveryCostInfo.totalCostUSD.toFixed(2)} USD
                          <span className="text-zinc-400 mx-1">|</span>
                          {formatCurrency(recoveryCostInfo.totalCostEGP)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-emerald-500/20 font-sans">
                        <span>💱 معادلة الصرف:</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          1$ = {recoveryCostInfo.effectiveRate.toFixed(2)} ج.م
                          {isPoints && ` (النقطة = ${recoveryCostInfo.costPerPointEGP.toFixed(4)} ج)`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
                    البيان والمصدر *
                  </label>
                  <input
                    type="text"
                    required
                    value={recoveryReason}
                    onChange={e => setRecoveryReason(e.target.value)}
                    placeholder="مثال: تعويض جزئي من المورد"
                    className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-emerald-500/40 p-2 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="sm">
                  تسجيل التعويض
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: MANUAL ADJUSTMENT */}
        {activeTab === 'adjust' && (
          <form onSubmit={handleRecordAdjustment} className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3">
            <div>
              <strong className="block text-zinc-900 dark:text-zinc-100">
                ⚖️ تعديل محاسبي مباشر على الرصيد (Adjustment Transaction)
              </strong>
              <span className="text-[10px] text-zinc-400">
                قاعدة محاسبية صارمة (Rule #40): لا يتم تغيير الرصيد بدون حركة تعديل موثقة في دفتر الأستاذ.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
                  قيمة التعديل (أدخل قيمة موجبة للإضافة أو سالبة للخصم) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjAmount}
                  onChange={e => setAdjAmount(parseFloat(e.target.value) || 0)}
                  placeholder="+500 أو -200"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">
                  سبب التعديل والبيان (إلزامي لسجل التدقيق) *
                </label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  placeholder="مثال: تصحيح تسوية جرد أو خطأ إدخال سابق"
                  className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="sm">
                تأكيد وحفظ التعديل المحاسبي
              </Button>
            </div>
          </form>
        )}

        {/* Footer Close */}
        <div className="flex items-center justify-end pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {openedTicket && (
        <TicketDetailsModal
          isOpen={Boolean(openedTicket)}
          onClose={() => setOpenedTicket(null)}
          ticket={openedTicket}
        />
      )}

      {/* Deposit Ticket Modal */}
      {(openedDepositTx || openedDepositLot) && (
        <JKRDepositTicketModal
          isOpen={Boolean(openedDepositTx || openedDepositLot)}
          onClose={() => {
            setOpenedDepositTx(null);
            setOpenedDepositLot(null);
          }}
          transaction={openedDepositTx}
          lot={openedDepositLot}
          wallet={walletData}
          onEdit={(lot, tx) => handleEditLot(lot, tx)}
          onDelete={(lot, tx) => handleDeleteLot(lot, tx)}
        />
      )}

      {/* Edit Deposit Modal */}
      {selectedLotForEdit && (
        <JKREditDepositModal
          isOpen={Boolean(selectedLotForEdit)}
          onClose={() => {
            setSelectedLotForEdit(null);
            setMatchedTxForLot(null);
          }}
          lot={selectedLotForEdit}
          transaction={matchedTxForLot}
          wallet={walletData}
          onSuccess={refreshWallet}
        />
      )}

      {/* Delete Deposit Modal */}
      {selectedLotForDelete && (
        <JKRDeleteDepositModal
          isOpen={Boolean(selectedLotForDelete)}
          onClose={() => {
            setSelectedLotForDelete(null);
            setMatchedTxForLot(null);
          }}
          lot={selectedLotForDelete}
          transaction={matchedTxForLot}
          wallet={walletData}
          onSuccess={refreshWallet}
        />
      )}

      {/* General Transaction Details Modal */}
      {openedTxDetails && (
        <JKRTransactionDetailsModal
          isOpen={Boolean(openedTxDetails)}
          onClose={() => setOpenedTxDetails(null)}
          transaction={openedTxDetails}
        />
      )}
    </Modal>
  );
};
