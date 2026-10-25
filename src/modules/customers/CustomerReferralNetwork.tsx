import React, { useState, useMemo } from 'react';
import { Customer } from '../../types/customer.types';
import { CustomerTicket } from '../../types/customer.types';
import { UnifiedWalletTransaction } from '../../types/customer.types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Users,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  Share2,
  Copy,
  Check,
  Sparkles,
  Clock,
  ArrowDown,
  GitBranch,
  ShieldCheck,
  Award,
  Wallet,
  Receipt,
  Printer
} from 'lucide-react';

interface CustomerReferralNetworkProps {
  currentCustomer: Customer;
  allCustomers: Customer[];
  allTickets: CustomerTicket[];
  walletTransactions: UnifiedWalletTransaction[];
  onOpenCustomer: (customer: Customer) => void;
  onUnlinkReferee?: (referee: Customer) => void;
  onOpenTransferModal: () => void;
  onOpenWithdrawalModal: () => void;
  isOwner?: boolean;
}

export const CustomerReferralNetwork: React.FC<CustomerReferralNetworkProps> = ({
  currentCustomer,
  allCustomers,
  allTickets,
  walletTransactions,
  onOpenCustomer,
  onUnlinkReferee,
  onOpenTransferModal,
  onOpenWithdrawalModal,
  isOwner = false
}) => {
  const [treeSearch, setTreeSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedTier1Ids, setExpandedTier1Ids] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedTier1Ids(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 1. Parent Referrer (Who referred this customer)
  const parentReferrer = useMemo(() => {
    if (!currentCustomer.referredByCode) return null;
    const clean = currentCustomer.referredByCode.trim().toUpperCase();
    return allCustomers.find(
      c => c.referralCode && c.referralCode.trim().toUpperCase() === clean
    ) || null;
  }, [currentCustomer.referredByCode, allCustomers]);

  // 2. Direct Referees (Tier 1)
  const tier1Referees = useMemo(() => {
    if (!currentCustomer.referralCode) return [];
    const clean = currentCustomer.referralCode.trim().toUpperCase();
    return allCustomers.filter(
      c => !c.isArchived && c.referredByCode && c.referredByCode.trim().toUpperCase() === clean
    );
  }, [currentCustomer.referralCode, allCustomers]);

  // Enriched Tier 1 Data
  const enrichedTier1 = useMemo(() => {
    return tier1Referees.map(ref => {
      // Completed tickets
      const completedTickets = allTickets.filter(
        t => (t.customerId === ref.id || (ref.phone && t.customerPhone === ref.phone)) && t.status === 'completed'
      );
      const ticketsCount = completedTickets.length;
      const totalSpent = completedTickets.reduce(
        (sum, t) => sum + (t.receivedAmount || t.requiredAmount || t.totalProductsAmount || 0),
        0
      );

      // Latest order
      let lastOrderDate: string | undefined = undefined;
      let maxTime = 0;
      completedTickets.forEach(t => {
        const d = t.completedAt || t.updatedAt || t.createdAt;
        if (d) {
          const tm = new Date(d).getTime();
          if (tm > maxTime) {
            maxTime = tm;
            lastOrderDate = d;
          }
        }
      });

      // Commissions from wallet transactions
      const matchingCommissions = walletTransactions.filter(
        w =>
          w.customerId === currentCustomer.id &&
          w.walletType === 'referral' &&
          (w.type === 'commission' || w.type === 'earned') &&
          (w.operationName.includes(ref.name) ||
            (ref.phone && w.operationName.includes(ref.phone)) ||
            (ref.referralCode && w.operationName.includes(ref.referralCode)) ||
            (w.orderNumber && completedTickets.some(t => t.ticketNumber === w.orderNumber)))
      );

      let totalCommission = matchingCommissions.reduce((sum, w) => sum + w.amount, 0);

      // Fallback calculation from tickets if wallet transactions not explicitly matched
      if (totalCommission === 0 && ticketsCount > 0) {
        completedTickets.forEach(t => {
          const amt = t.receivedAmount || t.requiredAmount || 0;
          const comm = t.referralCommissionEarned || Math.round(amt * 0.01 * 100) / 100;
          totalCommission += comm;
        });
      }

      // Tier 2 Children (Customers invited by this referee)
      const tier2Children = ref.referralCode
        ? allCustomers.filter(
            c => !c.isArchived && c.referredByCode && c.referredByCode.trim().toUpperCase() === ref.referralCode.trim().toUpperCase()
          )
        : [];

      const isActive = ticketsCount > 0;

      // 30-Day Golden Promo Period calculation
      const joinDate = ref.referralLinkedAt || ref.createdAt;
      const expiryDate = ref.firstMonthExpiryDate
        ? new Date(ref.firstMonthExpiryDate)
        : (joinDate ? new Date(new Date(joinDate).getTime() + (ref.highCashbackDays || 30) * 24 * 60 * 60 * 1000) : null);
      const daysRemaining = expiryDate
        ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;
      const isGoldenPeriod = daysRemaining > 0;

      return {
        customer: ref,
        ticketsCount,
        totalSpent,
        totalCommission,
        lastOrderDate,
        isActive,
        tier2Children,
        daysRemaining,
        isGoldenPeriod
      };
    });
  }, [tier1Referees, allTickets, walletTransactions, currentCustomer.id, allCustomers]);

  // Network Cumulative Stats
  const networkStats = useMemo(() => {
    const totalTier1 = enrichedTier1.length;
    const activeTier1 = enrichedTier1.filter(r => r.isActive).length;
    const inactiveTier1 = totalTier1 - activeTier1;
    const totalTier2 = enrichedTier1.reduce((sum, r) => sum + r.tier2Children.length, 0);
    const totalNetworkSize = totalTier1 + totalTier2;

    const totalSalesVolume = enrichedTier1.reduce((sum, r) => sum + r.totalSpent, 0);
    const totalCommissionsEarned = enrichedTier1.reduce((sum, r) => sum + r.totalCommission, 0);

    // Filter wallet transactions for referrals
    const refTxs = walletTransactions.filter(w => w.customerId === currentCustomer.id && w.walletType === 'referral');
    const totalTransferred = refTxs
      .filter(w => w.type === 'redeemed' && !w.operationName.includes('سحب'))
      .reduce((sum, w) => sum + w.amount, 0);
    const totalWithdrawn = refTxs
      .filter(w => (w.type === 'redeemed' && w.operationName.includes('سحب')) || (w.type === 'adjustment' && (w.operationName.includes('سحب') || w.amount < 0)))
      .reduce((sum, w) => sum + Math.abs(w.amount), 0);

    return {
      totalTier1,
      activeTier1,
      inactiveTier1,
      totalTier2,
      totalNetworkSize,
      totalSalesVolume,
      totalCommissionsEarned,
      totalTransferred,
      totalWithdrawn,
      currentReferralBalance: currentCustomer.referralWalletBalance || 0
    };
  }, [enrichedTier1, walletTransactions, currentCustomer]);

  // Filtered Tier 1 List
  const filteredTier1 = useMemo(() => {
    return enrichedTier1.filter(item => {
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;

      if (treeSearch.trim()) {
        const q = treeSearch.toLowerCase().trim();
        const matchName = item.customer.name.toLowerCase().includes(q);
        const matchPhone = item.customer.phone.includes(q);
        const matchCode = Boolean(item.customer.referralCode && item.customer.referralCode.toLowerCase().includes(q));
        return matchName || matchPhone || matchCode;
      }
      return true;
    });
  }, [enrichedTier1, statusFilter, treeSearch]);

  return (
    <div className="space-y-6 text-xs text-right animate-fade-in" dir="rtl">
      {/* 🌟 1. Network Top Cumulative Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-bold text-[11px]">حجم شبكة الإحالة</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <strong className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-mono block">
            {networkStats.totalNetworkSize} عميل
          </strong>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500">
            <span className="text-purple-400 font-mono">1️⃣ {networkStats.totalTier1} مباشر</span>
            <span>•</span>
            <span className="text-indigo-400 font-mono">2️⃣ {networkStats.totalTier2} فرعي</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-bold text-[11px]">الإحالات النشطة</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <strong className="text-xl font-black text-emerald-500 font-mono block">
            {networkStats.activeTier1} نشط
          </strong>
          <span className="text-[10px] text-zinc-400 block">
            من أصل {networkStats.totalTier1} عميل مباشر لديهم تذاكر
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="font-bold text-[11px]">الأرباح التراكمية التاريخية</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <strong className="text-xl font-black text-emerald-500 font-mono block">
            +{formatCurrency(networkStats.totalCommissionsEarned)}
          </strong>
          <span className="text-[10px] text-zinc-400 block">
            إجمالي ما تم كسبه من عمولات الإحالة
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-purple-500/30 dark:border-purple-500/30 bg-purple-500/5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="font-bold text-[11px]">رصيد محفظة الإحالة الحالي</span>
            <Wallet className="w-4 h-4 text-purple-500" />
          </div>
          <strong className="text-xl font-black text-purple-500 font-mono block">
            {formatCurrency(networkStats.currentReferralBalance)}
          </strong>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenTransferModal}
              disabled={networkStats.currentReferralBalance <= 0}
              className="text-[10px] py-0.5 px-2 h-auto border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white"
            >
              🔄 تحويل
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onOpenWithdrawalModal}
              disabled={networkStats.currentReferralBalance <= 0}
              className="text-[10px] py-0.5 px-2 h-auto bg-purple-500/10 text-purple-400 hover:bg-purple-600 hover:text-white"
            >
              💸 صرف
            </Button>
          </div>
        </div>
      </div>

      {/* 🌲 2. Hierarchical Referral Tree Visualization */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-[#27272A]">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-500" />
            <div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                شجرة الإحالة التفاعلية والشبكة الهرمية
              </h4>
              <span className="text-[11px] text-zinc-400">
                توضح مسار الإحالة من المُحيل الأصلي وصولاً للعميل الحالي والشبكة المنبثقة عنه
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onOpenTransferModal}
              disabled={networkStats.currentReferralBalance <= 0}
              icon={<Receipt className="w-3.5 h-3.5" />}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              إصدار سند تحويل للرصيد الأساسي
            </Button>
          </div>
        </div>

        {/* 🌿 Level 0: Parent Referrer Node (المُحيل الأب) */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-md p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-dashed border-gray-300 dark:border-zinc-700 space-y-2 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>المُحيل الأب (Root Referrer)</span>
            </div>

            {parentReferrer ? (
              <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center font-bold text-xs">
                    {parentReferrer.name ? parentReferrer.name[0] : 'P'}
                  </div>
                  <div className="text-right">
                    <strong className="text-xs text-zinc-900 dark:text-zinc-100 block">
                      {parentReferrer.name}
                    </strong>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {parentReferrer.phone} • كود: <span className="text-purple-400 font-bold">{parentReferrer.referralCode}</span>
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenCustomer(parentReferrer)}
                  icon={<ExternalLink className="w-3 h-3" />}
                  className="text-[10px] py-1 px-2.5 h-auto bg-purple-500/10 text-purple-400 hover:bg-purple-600 hover:text-white"
                >
                  فتح الملف
                </Button>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] border border-gray-100 dark:border-zinc-800 text-zinc-400 text-xs font-bold">
                🌱 تسجيل مباشر بدون وسيط إحالة (نقطة بداية مستقلة)
              </div>
            )}
          </div>

          {/* Tree Stem Line */}
          <div className="w-0.5 h-6 bg-purple-500/40 my-1"></div>
          <ArrowDown className="w-4 h-4 text-purple-500/60 -mt-2" />

          {/* 🌟 Level 1: Current Customer Node (نقطة الارتكاز المركزية) */}
          <div className="w-full max-w-lg p-4 rounded-2xl bg-linear-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 border-2 border-purple-500/40 shadow-sm space-y-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  {currentCustomer.name ? currentCustomer.name[0] : 'C'}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {currentCustomer.name}
                    </h5>
                    <Badge variant="purple" size="sm">
                      البروفايل الحالي
                    </Badge>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">
                    {currentCustomer.phone}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-500/30">
                <span className="text-[11px] text-zinc-400">الكود:</span>
                <strong className="font-mono text-purple-300 font-bold text-xs">
                  {currentCustomer.referralCode || 'غير محدد'}
                </strong>
                {currentCustomer.referralCode && (
                  <button
                    type="button"
                    onClick={() => handleCopy(currentCustomer.referralCode, 'main_code')}
                    className="p-1 text-purple-400 hover:text-white transition-colors cursor-pointer"
                    title="نسخ كود الإحالة"
                  >
                    {copiedId === 'main_code' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-500/20 text-center font-mono">
              <div className="p-1.5 rounded-lg bg-white/40 dark:bg-black/20">
                <span className="text-[10px] text-zinc-400 block">إجمالي المحالين</span>
                <strong className="text-xs font-bold text-purple-400">{networkStats.totalTier1} عميل</strong>
              </div>
              <div className="p-1.5 rounded-lg bg-white/40 dark:bg-black/20">
                <span className="text-[10px] text-zinc-400 block">إجمالي العمولات</span>
                <strong className="text-xs font-bold text-emerald-500">+{formatCurrency(networkStats.totalCommissionsEarned)}</strong>
              </div>
              <div className="p-1.5 rounded-lg bg-white/40 dark:bg-black/20">
                <span className="text-[10px] text-zinc-400 block">رصيد الإحالة</span>
                <strong className="text-xs font-bold text-amber-500">{formatCurrency(networkStats.currentReferralBalance)}</strong>
              </div>
            </div>
          </div>

          {/* Tree Stem Line */}
          <div className="w-0.5 h-6 bg-purple-500/40 my-1"></div>
          <ArrowDown className="w-4 h-4 text-purple-500/60 -mt-2" />
        </div>

        {/* 🔍 3. Filter & Search Controls for Tier 1 Referees */}
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={treeSearch}
                onChange={e => setTreeSearch(e.target.value)}
                placeholder="بحث في شبكة المحالين بالاسم أو الهاتف..."
                className="w-full rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] pr-9 pl-3 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs outline-none focus:border-purple-500"
              />
              {treeSearch && (
                <button
                  type="button"
                  onClick={() => setTreeSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-[#18181B] text-zinc-500 hover:text-zinc-200 border border-gray-200 dark:border-[#27272A]'
              }`}
            >
              الكل ({enrichedTier1.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-[#18181B] text-zinc-500 hover:text-zinc-200 border border-gray-200 dark:border-[#27272A]'
              }`}
            >
              نشطون مع شحن 🟢 ({networkStats.activeTier1})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-zinc-700 text-white'
                  : 'bg-white dark:bg-[#18181B] text-zinc-500 hover:text-zinc-200 border border-gray-200 dark:border-[#27272A]'
              }`}
            >
              جدد / خاملون ⚪ ({networkStats.inactiveTier1})
            </button>
          </div>
        </div>

        {/* 👥 4. Level 2: Direct Referees Grid (Tier 1 Nodes) */}
        {filteredTier1.length === 0 ? (
          <div className="p-8 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-dashed border-gray-200 dark:border-[#27272A] text-center space-y-2">
            <Users className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
            <p className="text-zinc-500 dark:text-zinc-400 font-bold text-xs">
              {treeSearch ? 'لا توجد نتائج تطابق معايير البحث' : 'لا يوجد عملاء مرتبطون بشبكة الإحالة حالياً'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredTier1.map(item => (
              <div
                key={item.customer.id}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] hover:border-purple-500/40 transition-all space-y-3"
              >
                {/* Node Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-black text-xs">
                      {item.customer.name ? item.customer.name[0] : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h6 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                          {item.customer.name}
                        </h6>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.isActive ? 'bg-emerald-500' : 'bg-zinc-400'
                          }`}
                          title={item.isActive ? 'عميل نشط ولديه شحن' : 'لم يقم بالشحن بعد'}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                        <span>{item.customer.phone}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.customer.phone, item.customer.id)}
                          className="text-zinc-400 hover:text-purple-400"
                          title="نسخ رقم الهاتف"
                        >
                          {copiedId === item.customer.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-zinc-400">
                      انضم: {formatDate(item.customer.referralLinkedAt || item.customer.createdAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.isGoldenPeriod && (
                        <span
                          className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          title={`متبقي ${item.daysRemaining} يوم في فترة الترويج والعمولات الذهبية`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>ذهبي ({item.daysRemaining}ي)</span>
                        </span>
                      )}
                      <Badge variant={item.isActive ? 'success' : 'default'} size="sm">
                        {item.isActive ? 'نشط 🟢' : 'جديد ⚪'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Metrics 3-Col */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono pt-1 border-t border-gray-200/60 dark:border-zinc-800">
                  <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block">إجمالي الإنفاق</span>
                    <strong className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                      {formatCurrency(item.totalSpent)}
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block">عدد التذاكر</span>
                    <strong className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                      {item.ticketsCount}
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block">العمولة المتولدة</span>
                    <strong className="text-xs font-black text-emerald-500 block">
                      +{formatCurrency(item.totalCommission)}
                    </strong>
                  </div>
                </div>

                {/* Sub-network Toggle (Tier 2 Children) */}
                {item.tier2Children.length > 0 && (
                  <div className="pt-2 border-t border-gray-200/60 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.customer.id)}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-[11px] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>شبكة فرعية: دعا ({item.tier2Children.length}) عملاء إضافيين</span>
                      </div>
                      {expandedTier1Ids[item.customer.id] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {expandedTier1Ids[item.customer.id] && (
                      <div className="mt-2 space-y-1.5 pr-3 border-r-2 border-purple-500/40">
                        {item.tier2Children.map(t2 => (
                          <div
                            key={t2.id}
                            className="p-2 rounded-lg bg-white dark:bg-[#18181B] border border-gray-200/60 dark:border-zinc-800 flex items-center justify-between gap-2 text-[11px]"
                          >
                            <div>
                              <strong className="text-zinc-800 dark:text-zinc-200 block">{t2.name}</strong>
                              <span className="text-[10px] text-zinc-400 font-mono">{t2.phone}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onOpenCustomer(t2)}
                              className="text-[10px] py-0.5 px-2 h-auto text-purple-400 hover:text-white"
                            >
                              عرض
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/60 dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenCustomer(item.customer)}
                    icon={<ExternalLink className="w-3 h-3" />}
                    className="flex-1 text-xs font-bold bg-purple-500/10 text-purple-400 hover:bg-purple-600 hover:text-white"
                  >
                    فتح البروفايل
                  </Button>

                  {isOwner && onUnlinkReferee && (
                    <button
                      type="button"
                      onClick={() => onUnlinkReferee(item.customer)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="فك ارتباط العميل"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
