import React, { useState, useMemo } from 'react';
import { JKRWallet, JKRWalletTransaction, JKRTransactionType } from '../../../types/jkrWallet.types';
import { JKRWalletEngine } from '../../../services/financial/jkrWalletEngine';
import { JKRTransactionDetailsModal } from './JKRTransactionDetailsModal';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../utils/formatters';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  AlertTriangle,
  Coins,
  Wallet,
  DollarSign,
  Ticket,
  User,
  Eye,
  CheckCircle2
} from 'lucide-react';

interface JKRWalletTransactionsTabProps {
  wallets: JKRWallet[];
}

export const JKRWalletTransactionsTab: React.FC<JKRWalletTransactionsTabProps> = ({
  wallets
}) => {
  const { user } = useAuth();
  const isOwnerOrAdmin = (user?.role as string) === 'admin' || (user?.role as string) === 'manager';

  // Date Filter State
  const [datePreset, setDatePreset] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Section 20 Filter States: In / Out / All & Sorting
  const [flowFilter, setFlowFilter] = useState<'all' | 'in' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Dropdown Filter States
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [walletTypeFilter, setWalletTypeFilter] = useState<string>('all');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('all');
  const [walletSearchText, setWalletSearchText] = useState<string>('');

  // Quick Toggle Flags
  const [lossesOnly, setLossesOnly] = useState<boolean>(false);
  const [reversalsOnly, setReversalsOnly] = useState<boolean>(false);

  // Quick Universal Search Query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Transaction for Details Modal
  const [selectedTx, setSelectedTx] = useState<JKRWalletTransaction | null>(null);

  // Fetch all transactions from immutable ledger, scoped strictly to the current department's wallets
  const allTransactions = useMemo(() => {
    const txs = JKRWalletEngine.getTransactions();
    if (!wallets || wallets.length === 0) return [];
    const walletIdSet = new Set(wallets.map(w => w.id));
    return txs.filter(tx => walletIdSet.has(tx.walletId));
  }, [wallets]);

  // Compute date range boundary based on date preset
  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    if (datePreset === 'today') {
      return { start: startOfDay, end: endOfDay };
    }
    if (datePreset === 'yesterday') {
      const yStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      const yEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999).toISOString();
      return { start: yStart, end: yEnd };
    }
    if (datePreset === '7days') {
      const s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { start: s, end: endOfDay };
    }
    if (datePreset === '30days') {
      const s = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return { start: s, end: endOfDay };
    }
    if (datePreset === 'thisMonth') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      return { start: s, end: endOfDay };
    }
    if (datePreset === 'lastMonth') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();
      return { start: s, end: e };
    }
    if (datePreset === 'thisYear') {
      const s = new Date(now.getFullYear(), 0, 1).toISOString();
      return { start: s, end: endOfDay };
    }
    if (datePreset === 'custom') {
      return {
        start: customStartDate ? new Date(customStartDate).toISOString() : undefined,
        end: customEndDate ? new Date(customEndDate + 'T23:59:59.999Z').toISOString() : undefined
      };
    }
    return { start: undefined, end: undefined };
  }, [datePreset, customStartDate, customEndDate]);

  // Filtered Wallets for Dropdown with Inline Search
  const filteredWalletOptions = useMemo(() => {
    return wallets.filter(w => {
      if (!walletSearchText.trim()) return true;
      return w.name.toLowerCase().includes(walletSearchText.toLowerCase());
    });
  }, [wallets, walletSearchText]);

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      // 1. RBAC Permissions
      if (!isOwnerOrAdmin) {
        if (tx.performedBy?.id && user?.id && tx.performedBy.id !== user.id) {
          return false;
        }
      }

      // 2. Date Filter
      if (dateRange.start && tx.createdAt < dateRange.start) return false;
      if (dateRange.end && tx.createdAt > dateRange.end) return false;

      // 3. Flow Filter (Section 20: وارد / صادر / الكل)
      if (flowFilter === 'in') {
        const isIn = (tx.quantityIn !== undefined && tx.quantityIn !== null && tx.quantityIn > 0) ||
          tx.transactionType === 'DEPOSIT' || tx.transactionType === 'FUNDING' || tx.transactionType === 'RECOVERY';
        if (!isIn) return false;
      } else if (flowFilter === 'out') {
        const isOut = (tx.quantityOut !== undefined && tx.quantityOut !== null && tx.quantityOut > 0) ||
          tx.transactionType === 'CONSUMPTION' || tx.transactionType === 'PURCHASE' || tx.transactionType === 'WITHDRAWAL' || tx.transactionType === 'LOSS';
        if (!isOut) return false;
      }

      // 4. Operation Type
      if (typeFilter !== 'all' && tx.transactionType !== typeFilter) return false;

      // 5. Wallet Type (MAIN or SUB)
      if (walletTypeFilter !== 'all' && tx.walletType !== walletTypeFilter) return false;

      // 6. Specific Wallet (Section 20: اسم المحفظة)
      if (selectedWalletId !== 'all' && tx.walletId !== selectedWalletId) return false;

      // 7. Quick Toggles: Losses Only
      if (lossesOnly && tx.transactionType !== 'LOSS' && tx.transactionType !== 'FREEZE') return false;

      // 8. Quick Toggles: Reversals Only
      if (reversalsOnly && tx.transactionType !== 'REVERSAL') return false;

      // 9. Universal Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTxNumber = tx.transactionNumber?.toLowerCase().includes(q) || tx.id?.toLowerCase().includes(q);
        const matchTicket = tx.ticketNumber?.toLowerCase().includes(q) || tx.ticketId?.toLowerCase().includes(q);
        const matchCustomer = tx.customerName?.toLowerCase().includes(q);
        const matchWallet = tx.walletName?.toLowerCase().includes(q);
        const matchProduct = tx.productName?.toLowerCase().includes(q);
        const matchGame = tx.gameOrPointType?.toLowerCase().includes(q);
        const matchLot = tx.lotNumber?.toLowerCase().includes(q) || tx.lotId?.toLowerCase().includes(q);
        const matchUser = tx.performedBy?.name?.toLowerCase().includes(q);
        const matchNotes = tx.notes?.toLowerCase().includes(q);

        if (!matchTxNumber && !matchTicket && !matchCustomer && !matchWallet && !matchProduct && !matchGame && !matchLot && !matchUser && !matchNotes) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sorting (Section 20: أحدث / أقدم / أكبر / أصغر)
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'highest') {
        const valA = Math.max(a.quantityIn || 0, a.quantityOut || 0, a.amountEGP || 0);
        const valB = Math.max(b.quantityIn || 0, b.quantityOut || 0, b.amountEGP || 0);
        return valB - valA;
      }
      if (sortBy === 'lowest') {
        const valA = Math.max(a.quantityIn || 0, a.quantityOut || 0, a.amountEGP || 0);
        const valB = Math.max(b.quantityIn || 0, b.quantityOut || 0, b.amountEGP || 0);
        return valA - valB;
      }
      // default: newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    allTransactions,
    isOwnerOrAdmin,
    user?.id,
    dateRange,
    flowFilter,
    sortBy,
    typeFilter,
    walletTypeFilter,
    selectedWalletId,
    lossesOnly,
    reversalsOnly,
    searchQuery
  ]);

  // Real-time Aggregate Statistics
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalEGP = 0;
    let totalUSD = 0;

    for (const tx of filteredTransactions) {
      if (tx.quantityIn) totalIn += tx.quantityIn;
      if (tx.quantityOut) totalOut += tx.quantityOut;
      totalEGP += tx.amountEGP || 0;
      totalUSD += tx.amountUSD || 0;
    }

    return {
      count: filteredTransactions.length,
      totalIn,
      totalOut,
      totalEGP,
      totalUSD
    };
  }, [filteredTransactions]);

  const getTypeBadge = (type: JKRTransactionType) => {
    switch (type) {
      case 'DEPOSIT':
      case 'FUNDING':
      case 'RECOVERY':
        return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      case 'CONSUMPTION':
      case 'PURCHASE':
      case 'WITHDRAWAL':
      case 'LOSS':
        return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
      case 'REVERSAL':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'FREEZE':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'UNFREEZE':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    }
  };

  return (
    <div className="space-y-4 my-4 text-right text-xs">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-orange-500" />
              حركات المحافظ (Wallet Transactions) — سجل العمليات المحاسبي
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Audit Trail
            </span>
          </div>
          <span className="text-zinc-500 text-xs mt-0.5 block">
            شاشة التدقيق والمراجعة الشاملة لجميع العمليات المالية وحركات النقاط. السجل تراكمي وغير قابل للمسح.
          </span>
        </div>

        <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-mono">
          <span>إجمالي السجلات: {allTransactions.length} حركة</span>
        </div>
      </div>

      {/* Date Presets Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] font-bold text-[11px]">
        <span className="text-zinc-400 ml-1 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-orange-500" />
          الفترة:
        </span>
        {[
          { id: 'all', label: 'كل الفترات' },
          { id: 'today', label: 'اليوم' },
          { id: 'yesterday', label: 'أمس' },
          { id: '7days', label: 'آخر 7 أيام' },
          { id: '30days', label: 'آخر 30 يوم' },
          { id: 'thisMonth', label: 'هذا الشهر' },
          { id: 'lastMonth', label: 'الشهر الماضي' },
          { id: 'thisYear', label: 'هذا العام' },
          { id: 'custom', label: 'نطاق مخصص 📅' }
        ].map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setDatePreset(p.id)}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              datePreset === p.id
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-200/60 dark:hover:bg-zinc-800'
            }`}
          >
            {p.label}
          </button>
        ))}

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 mr-2 bg-white dark:bg-[#18181B] p-1.5 rounded-lg border border-orange-500/30 font-mono">
            <span className="text-[10px] text-zinc-400">من:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="bg-transparent text-zinc-900 dark:text-zinc-100 text-xs outline-none"
            />
            <span className="text-[10px] text-zinc-400">إلى:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="bg-transparent text-zinc-900 dark:text-zinc-100 text-xs outline-none"
            />
          </div>
        )}
      </div>

      {/* Section 20 Filter Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
        {/* Universal Fast Search */}
        <div className="relative sm:col-span-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث سريع: TX#، تذكرة#، عميل، محفظة، منتج، Lot، موظف..."
            className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] pr-8 pl-3 py-2 text-zinc-900 dark:text-zinc-100 outline-none text-xs font-bold focus:border-orange-500/40"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute right-2.5 top-2.5" />
        </div>

        {/* 1. Operation Flow (وارد / صادر / الكل - Section 20) */}
        <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#141417] p-1 rounded-xl border border-gray-200 dark:border-[#27272A]">
          <button
            type="button"
            onClick={() => setFlowFilter('all')}
            className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              flowFilter === 'all'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => setFlowFilter('in')}
            className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              flowFilter === 'in'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-emerald-500'
            }`}
          >
            وارد (+)
          </button>
          <button
            type="button"
            onClick={() => setFlowFilter('out')}
            className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
              flowFilter === 'out'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-rose-500'
            }`}
          >
            صادر (-)
          </button>
        </div>

        {/* 2. Sorting Dropdown (Section 20: أحدث / أقدم / أكبر / أصغر) */}
        <div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-800 dark:text-zinc-200 font-bold outline-none text-xs"
          >
            <option value="newest">⏱️ الأحدث أولاً</option>
            <option value="oldest">⏱️ الأقدم أولاً</option>
            <option value="highest">💰 الأكبر قيمة</option>
            <option value="lowest">💰 الأصغر قيمة</option>
          </select>
        </div>

        {/* 3. Operation Detailed Type */}
        <div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-800 dark:text-zinc-200 font-bold outline-none text-xs"
          >
            <option value="all">كل تفاصيل العمليات</option>
            <option value="DEPOSIT">DEPOSIT (إيداع نقاط)</option>
            <option value="FUNDING">FUNDING (تمويل دولاري)</option>
            <option value="PURCHASE">PURCHASE (شراء رصيد)</option>
            <option value="CONSUMPTION">CONSUMPTION (استهلاك تذكرة)</option>
            <option value="REVERSAL">REVERSAL (عكس استهلاك)</option>
            <option value="ADJUSTMENT">ADJUSTMENT (تعديل محاسبي)</option>
            <option value="LOSS">LOSS (خسارة مؤكدة)</option>
            <option value="RECOVERY">RECOVERY (تعويض)</option>
            <option value="FREEZE">FREEZE (تجميد)</option>
            <option value="UNFREEZE">UNFREEZE (فك تجميد)</option>
            <option value="WITHDRAWAL">WITHDRAWAL (سحب)</option>
            <option value="TRANSFER">TRANSFER (تحويل)</option>
          </select>
        </div>

        {/* 4. Specific Wallet (Section 20: اسم المحفظة) */}
        <div>
          <select
            value={selectedWalletId}
            onChange={e => setSelectedWalletId(e.target.value)}
            className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-800 dark:text-zinc-200 font-bold outline-none text-xs truncate"
          >
            <option value="all">كل المحافظ ({wallets.length})</option>
            {filteredWalletOptions.map(w => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.type === 'MAIN' ? 'رئيسية' : 'فرعية'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Toggle Flags Bar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setLossesOnly(!lossesOnly)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            lossesOnly
              ? 'bg-rose-500/15 border-rose-500 text-rose-500 shadow-xs'
              : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-500 hover:border-rose-500/40'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>العمليات التي تحتوي على خسائر وتجميد فقط</span>
        </button>

        <button
          type="button"
          onClick={() => setReversalsOnly(!reversalsOnly)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            reversalsOnly
              ? 'bg-purple-500/15 border-purple-500 text-purple-400 shadow-xs'
              : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-500 hover:border-purple-500/40'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>عمليات الإلغاء والاسترداد (Reversals Only)</span>
        </button>
      </div>

      {/* Aggregate Statistics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
        <div className="p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <span className="text-[10px] text-zinc-400 block font-bold">الحركات المعروضة:</span>
          <strong className="text-base font-black text-zinc-900 dark:text-zinc-100 block mt-0.5">
            {stats.count.toLocaleString()} حركة
          </strong>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <span className="text-[10px] text-zinc-400 block font-bold">إجمالي الوارد (+):</span>
          <strong className="text-base font-black text-emerald-500 block mt-0.5">
            +{stats.totalIn.toLocaleString()}
          </strong>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <span className="text-[10px] text-zinc-400 block font-bold">إجمالي الصادر (-):</span>
          <strong className="text-base font-black text-rose-500 block mt-0.5">
            -{stats.totalOut.toLocaleString()}
          </strong>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <span className="text-[10px] text-zinc-400 block font-bold">إجمالي القيمة (EGP):</span>
          <strong className="text-base font-black text-zinc-900 dark:text-zinc-100 block mt-0.5">
            {formatCurrency(stats.totalEGP)}
          </strong>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <span className="text-[10px] text-zinc-400 block font-bold">إجمالي القيمة (USD):</span>
          <strong className="text-base font-black text-blue-500 block mt-0.5">
            ${stats.totalUSD.toLocaleString()}
          </strong>
        </div>
      </div>

      {/* 20-Column Responsive Audit Table */}
      {filteredTransactions.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-3">
          <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
          <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
            لا توجد حركات مسجلة تطابق محددات البحث والفلاتر
          </h4>
          <p className="text-xs text-zinc-400">
            جرب اختيار فترة زمنية أوسع أو إزالة بعض الفلاتر المعينة.
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-[#27272A] rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-[#18181B]">
          <div className="overflow-x-auto max-h-[560px]">
            <table className="w-full text-right text-[11px] font-mono border-collapse whitespace-nowrap">
              <thead className="bg-gray-100/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-bold sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">#</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">رقم الحركة</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">التاريخ / الوقت</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">نوع العملية</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">نوع المحفظة</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">اسم المحفظة</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A] bg-orange-500/10 text-orange-500 font-black">المصدر / الوجهة (جاية منين / طالعة لمين)</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">اللعبة / الرصيد</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">الوارد (+)</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">الصادر (-)</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">الرصيد بعد</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">القيمة (EGP)</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">القيمة (USD)</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">سعر الدولار</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">تكلفة النقطة</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">رقم التذكرة</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">المنتج المرتبط</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">الـ Lot</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">العميل</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">المنفذ</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">الحالة</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A]">الملاحظات</th>
                  <th className="p-2.5 border-b border-gray-200 dark:border-[#27272A] text-center">عرض</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                {filteredTransactions.map((tx, idx) => {
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-gray-50/70 dark:hover:bg-[#1f1f23] transition-colors cursor-pointer group"
                    >
                      {/* # Index */}
                      <td className="p-2.5 text-zinc-400 font-sans text-[10px]">
                        {idx + 1}
                      </td>

                      {/* 1. Transaction Number */}
                      <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-orange-500 transition-colors">
                        {tx.transactionNumber || tx.id}
                      </td>

                      {/* 2. Date & Time */}
                      <td className="p-2.5 text-zinc-400 text-[10px]">
                        {new Date(tx.createdAt).toLocaleString('ar-EG')}
                      </td>

                      {/* 3. Operation Type Badge */}
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTypeBadge(tx.transactionType)}`}>
                          {tx.transactionType}
                        </span>
                      </td>

                      {/* 4. Wallet Type */}
                      <td className="p-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          tx.walletType === 'MAIN'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-orange-500/10 text-orange-500'
                        }`}>
                          {tx.walletType === 'MAIN' ? 'رئيسية 💵' : 'فرعية 💎'}
                        </span>
                      </td>

                      {/* 5. Wallet Name */}
                      <td className="p-2.5 font-bold text-zinc-800 dark:text-zinc-200">
                        {tx.walletName}
                      </td>

                      {/* Source / Destination Flow Details (Section 20: جاية منين / طالعة لمين) */}
                      <td className="p-2.5">
                        {tx.transactionType === 'CONSUMPTION' ? (
                          <div className="space-y-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-bold font-mono text-[10px]">
                              تذكرة #{tx.ticketNumber || tx.ticketId}
                            </span>
                            {tx.productName && (
                              <span className="block text-zinc-900 dark:text-zinc-100 font-bold text-[10px] truncate max-w-[170px]" title={tx.productName}>
                                📦 {tx.productName}
                              </span>
                            )}
                            {tx.customerName && (
                              <span className="block text-zinc-400 text-[9px] truncate max-w-[170px]">
                                👤 {tx.customerName}
                              </span>
                            )}
                          </div>
                        ) : tx.transactionType === 'DEPOSIT' ? (
                          <span className="text-emerald-500 font-bold text-[10px] block">
                            وارد من: المحفظة الرئيسية الممولة
                          </span>
                        ) : tx.transactionType === 'PURCHASE' ? (
                          <span className="text-orange-500 font-bold text-[10px] block">
                            طالعة للمحفظة الفرعية {tx.referenceId ? `[${tx.referenceId}]` : ''}
                          </span>
                        ) : tx.transactionType === 'FUNDING' ? (
                          <span className="text-blue-500 font-bold text-[10px] block">
                            تمويل وارد للمحفظة
                          </span>
                        ) : tx.transactionType === 'WITHDRAWAL' ? (
                          <span className="text-rose-500 font-bold text-[10px] block">
                            سحب وتوجيه إلى: {tx.referenceId || 'جهة خارجية'}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[10px]">{tx.referenceType || '-'}</span>
                        )}
                      </td>

                      {/* 6. Game / Point Type */}
                      <td className="p-2.5 text-zinc-500">
                        {tx.gameOrPointType || '-'}
                      </td>

                      {/* 7. Quantity In (+) */}
                      <td className="p-2.5 font-bold text-emerald-500">
                        {tx.quantityIn !== undefined && tx.quantityIn !== null && tx.quantityIn > 0 ? `+${tx.quantityIn.toLocaleString('en-US', { maximumFractionDigits: 4 })}` : '-'}
                      </td>

                      {/* 8. Quantity Out (-) */}
                      <td className="p-2.5 font-bold text-rose-500">
                        {tx.quantityOut !== undefined && tx.quantityOut !== null && tx.quantityOut > 0 ? `-${tx.quantityOut.toLocaleString('en-US', { maximumFractionDigits: 4 })}` : '-'}
                      </td>

                      {/* 9. Balance After */}
                      <td className="p-2.5 font-bold text-blue-500">
                        {(tx.balanceAfter || 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </td>

                      {/* 10. Amount EGP */}
                      <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(tx.amountEGP || 0)}
                      </td>

                      {/* 11. Amount USD */}
                      <td className="p-2.5 text-zinc-500">
                        {tx.amountUSD ? `$${tx.amountUSD.toLocaleString('en-US', { maximumFractionDigits: 4 })}` : '-'}
                      </td>

                      {/* 12. Exchange Rate Used */}
                      <td className="p-2.5 text-zinc-500">
                        {tx.exchangeRateUsed ? `${tx.exchangeRateUsed.toLocaleString('en-US', { maximumFractionDigits: 4 })} ج` : '-'}
                      </td>

                      {/* 13. Cost Per Point */}
                      <td className="p-2.5 text-orange-500 font-bold">
                        {tx.costPerPoint ? `${tx.costPerPoint.toFixed(4)} ج` : '-'}
                      </td>

                      {/* 14. Ticket ID */}
                      <td className="p-2.5 text-purple-400 font-bold">
                        {tx.ticketNumber || tx.ticketId ? `#${tx.ticketNumber || tx.ticketId}` : '-'}
                      </td>

                      {/* 15. Product Name */}
                      <td className="p-2.5 text-zinc-600 dark:text-zinc-300 max-w-[140px] truncate" title={tx.productName}>
                        {tx.productName || '-'}
                      </td>

                      {/* 16. Lot Number */}
                      <td className="p-2.5 text-zinc-500 font-mono text-[10px]">
                        {tx.lotNumber || tx.lotId || '-'}
                      </td>

                      {/* 17. Customer Name */}
                      <td className="p-2.5 text-zinc-800 dark:text-zinc-200">
                        {tx.customerName || '-'}
                      </td>

                      {/* 18. Performed By */}
                      <td className="p-2.5 text-zinc-500 text-[10px]">
                        {(tx.performedBy?.name && tx.performedBy.name !== 'النظام') ? tx.performedBy.name : (tx.transactionType === 'DEPOSIT' || tx.transactionType === 'FUNDING' ? 'المدير العام (Owner)' : (tx.performedBy?.name || 'المدير العام (Owner)'))}
                      </td>

                      {/* 19. Status */}
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-zinc-400 text-[9px] font-bold">
                          {tx.status || 'COMPLETED'}
                        </span>
                      </td>

                      {/* 20. Notes */}
                      <td className="p-2.5 text-zinc-400 max-w-[160px] truncate" title={tx.notes}>
                        {tx.notes || '-'}
                      </td>

                      {/* View Action */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          className="p-1 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-all cursor-pointer"
                          title="عرض كافة تفاصيل الحركة"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTx && (
        <JKRTransactionDetailsModal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          transaction={selectedTx}
        />
      )}
    </div>
  );
};
