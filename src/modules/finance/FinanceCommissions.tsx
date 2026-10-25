import React, { useState, useMemo } from 'react';
import { db } from '../../database/db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { WalletExpirationService } from '../../services/wallet/walletExpirationService';
import { ExpiredBalanceManagementModal } from '../../components/common/ExpiredBalanceManagementModal';
import {
  PartyExpiredBalanceSummary,
  BreakageRecord,
  ExtensionRecord
} from '../../types/customer.types';
import {
  Gift,
  Share2,
  ShieldCheck,
  Download,
  Search,
  CheckCircle2,
  Users,
  Coins,
  Clock,
  ArrowRightLeft,
  CalendarCheck,
  AlertTriangle,
  History,
  ShieldAlert
} from 'lucide-react';

export const FinanceCommissions: React.FC = () => {
  const [subTab, setSubTab] = useState<'cashback' | 'referrals' | 'middleman' | 'expired_breakage'>('cashback');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Expired & Breakage Tab Sub-view
  const [expiredSubView, setExpiredSubView] = useState<'current_expired' | 'breakage_history' | 'extension_history'>('current_expired');
  const [expiredTypeFilter, setExpiredTypeFilter] = useState<'all' | 'cashback' | 'referral'>('all');
  const [selectedPartyForModal, setSelectedPartyForModal] = useState<PartyExpiredBalanceSummary | null>(null);
  const [modalWalletType, setModalWalletType] = useState<'cashback' | 'referral'>('cashback');

  // 1. Data Sources
  const customers = useMemo(() => db.getCustomers(), [refreshTrigger]);
  const dealers = useMemo(() => db.getDealers(), [refreshTrigger]);
  const allCustomerTxs = useMemo(() => db.getUnifiedWalletTransactions(), [refreshTrigger]);
  const allDealerTxs = useMemo(() => db.getDealerUnifiedWalletTransactions(), [refreshTrigger]);
  const breakageRecords = useMemo(() => db.getBreakageRecords(), [refreshTrigger]);
  const extensionRecords = useMemo(() => db.getExtensionRecords(), [refreshTrigger]);

  // Expiration Service Calculations
  const allExpiredParties = useMemo(() => {
    return WalletExpirationService.getAllExpiredParties(customers, dealers, allCustomerTxs, allDealerTxs);
  }, [customers, dealers, allCustomerTxs, allDealerTxs, refreshTrigger]);

  const filteredExpiredParties = useMemo(() => {
    return allExpiredParties.filter(party => {
      // Type Filter
      if (expiredTypeFilter === 'cashback' && party.cashbackExpired <= 0) return false;
      if (expiredTypeFilter === 'referral' && party.referralExpired <= 0) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return party.partyName.toLowerCase().includes(q) || party.partyPhone.includes(q);
      }
      return true;
    });
  }, [allExpiredParties, expiredTypeFilter, searchQuery]);

  const totalExpiredBalance = useMemo(() => {
    return allExpiredParties.reduce((sum, p) => sum + p.cashbackExpired + p.referralExpired, 0);
  }, [allExpiredParties]);

  const totalBreakageRevenue = useMemo(() => {
    return breakageRecords.reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [breakageRecords]);

  const totalExtendedAmount = useMemo(() => {
    return extensionRecords.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [extensionRecords]);

  // 2. Cashback Metrics
  const totalCashbackBalance = useMemo(() => {
    const custBal = customers.reduce((sum, c) => sum + (Number(c.cashbackBalance) || 0), 0);
    const dealerBal = dealers.reduce((sum, d) => sum + (Number(d.cashbackBalance) || 0), 0);
    return Math.round((custBal + dealerBal) * 100) / 100;
  }, [customers, dealers]);

  const totalCashbackGranted = useMemo(() => {
    const custEarned = customers.reduce((sum, c) => sum + (Number(c.totalCashbackEarned) || 0), 0);
    const dealerEarned = dealers.reduce((sum, d) => sum + (Number(d.totalCashbackEarned) || 0), 0);
    return Math.round((custEarned + dealerEarned) * 100) / 100;
  }, [customers, dealers]);

  // 3. Referrals Metrics
  const referrals = useMemo(() => db.getReferrals(), []);
  const totalReferralsPaid = useMemo(() => {
    return referrals.reduce((sum, r) => sum + (r.totalCommissionFromReferral || 0), 0);
  }, [referrals]);

  // 4. Middleman Metrics
  const deals = useMemo(() => db.getMiddlemanDeals(true).filter(d => d.status === 'completed'), []);
  const totalMiddlemanCompanyCommission = useMemo(() => {
    return deals.reduce((sum, d) => sum + (d.netCompanyProfitEGP || d.companyCommissionAmountEGP || 0), 0);
  }, [deals]);

  const totalMiddlemanExternalCommission = useMemo(() => {
    return deals.reduce((sum, d) => sum + (d.externalMiddlemanCommissionAmountEGP || 0), 0);
  }, [deals]);

  // Cashback Holders List
  const cashbackHolders = useMemo(() => {
    const list = [
      ...customers
        .filter(c => (Number(c.cashbackBalance) || 0) > 0 || (Number(c.totalCashbackEarned) || 0) > 0)
        .map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          type: 'عميل شحن',
          balance: Number(c.cashbackBalance) || 0,
          earned: Number(c.totalCashbackEarned) || 0
        })),
      ...dealers
        .filter(d => (Number(d.cashbackBalance) || 0) > 0 || (Number(d.totalCashbackEarned) || 0) > 0)
        .map(d => ({
          id: d.id,
          name: d.name,
          phone: d.phone,
          type: 'تاجر جملة',
          balance: Number(d.cashbackBalance) || 0,
          earned: Number(d.totalCashbackEarned) || 0
        }))
    ];

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(item => item.name.toLowerCase().includes(q) || item.phone.includes(q));
  }, [customers, dealers, searchQuery]);

  // Helper to get referrer and referee details
  const getReferrerDetails = (ref: any) => {
    const cust = customers.find(c => c.id === ref.referrerCustomerId);
    return {
      referrerName: cust?.name || `شريك (${ref.referrerCode || 'بدون كود'})`,
      referrerPhone: cust?.phone || '-',
      refereeName: ref.referredCustomerName || 'عميل محال',
      refereePhone: ref.referredCustomerPhone || '-'
    };
  };

  const handleExport = () => {
    if (subTab === 'cashback') {
      const data = cashbackHolders.map(item => ({
        'الاسم': item.name,
        'الهاتف': item.phone,
        'الفئة': item.type,
        'الرصيد الحالي (ج.م)': item.balance,
        'إجمالي المكتسب (ج.م)': item.earned
      }));
      exportToExcel(data, `أرصدة_الكاش_باك_${new Date().toISOString().split('T')[0]}`);
    } else if (subTab === 'referrals') {
      const data = referrals.map(r => {
        const details = getReferrerDetails(r);
        return {
          'المُحيل': details.referrerName,
          'هاتف المُحيل': details.referrerPhone,
          'كود الإحالة': r.referrerCode || '-',
          'العميل المُحال': details.refereeName,
          'هاتف العميل المُحال': details.refereePhone,
          'العمولة المكتسبة (ج.م)': r.totalCommissionFromReferral || 0,
          'الحالة': r.status || 'نشط',
          'التاريخ': formatDateTime(r.createdAt)
        };
      });
      exportToExcel(data, `سجل_عمولات_الإحالات_${new Date().toISOString().split('T')[0]}`);
    } else if (subTab === 'expired_breakage') {
      const data = filteredExpiredParties.map(p => ({
        'الطرف': p.partyName,
        'الهاتف': p.partyPhone,
        'الفئة': p.partyType === 'customer' ? 'عميل شحن' : 'تاجر جملة',
        'كاش باك منتهي (ج.م)': p.cashbackExpired,
        'إحالة منتهية (ج.م)': p.referralExpired,
        'إجمالي المنتهي (ج.م)': p.cashbackExpired + p.referralExpired,
        'أقدم دفعة منتهية': p.oldestExpiredDate ? formatDate(p.oldestExpiredDate) : '-'
      }));
      exportToExcel(data, `أرصدة_منتهية_الصلاحية_${new Date().toISOString().split('T')[0]}`);
    } else {
      const data = deals.map(d => ({
        'رقم الصفقة': d.dealNumber,
        'عنوان الصفقة': d.title,
        'قيمة الصفقة': d.dealAmountEGP || d.dealAmount,
        'عمولة الشركة': d.netCompanyProfitEGP || d.companyCommissionAmountEGP,
        'عمولة الوسيط الخارجي': d.externalMiddlemanCommissionAmountEGP || 0,
        'التاريخ': formatDateTime(d.createdAt)
      }));
      exportToExcel(data, `سجل_عمولات_الوساطة_${new Date().toISOString().split('T')[0]}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-right" dir="rtl">
      {/* Top Banner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cashback Balance */}
        <Card className="p-4 bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent border-amber-500/30">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-bold">رصيد الكاش باك المعلق بالذمم:</span>
            <Gift className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {formatCurrency(totalCashbackBalance, 'EGP')}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            المكتسب تاريخياً: {formatCurrency(totalCashbackGranted, 'EGP')}
          </span>
        </Card>

        {/* Referral Commissions */}
        <Card className="p-4 bg-gradient-to-br from-purple-500/15 via-indigo-500/5 to-transparent border-purple-500/30">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-bold">عمولات نظام الإحالة المصروفة:</span>
            <Share2 className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-400 mt-1">
            {formatCurrency(totalReferralsPaid, 'EGP')}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            إجمالي الشركاء: {referrals.length} إحالة مسجلة
          </span>
        </Card>

        {/* Middleman Commissions */}
        <Card className="p-4 bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent border-emerald-500/30">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-bold">عمولات صفقات الوساطة الصافية:</span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(totalMiddlemanCompanyCommission, 'EGP')}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            عمولات وسطاء: {formatCurrency(totalMiddlemanExternalCommission, 'EGP')}
          </span>
        </Card>

        {/* Expired & Breakage Total Card (Modification #6) */}
        <Card className={`p-4 transition-all ${
          totalExpiredBalance > 0
            ? 'bg-gradient-to-br from-rose-500/20 via-amber-500/10 to-transparent border-rose-500/40 shadow-xs'
            : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A]'
        }`}>
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-bold">أرصدة منتهية الصلاحية ⚠️:</span>
            <Clock className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-500 mt-1">
            {formatCurrency(totalExpiredBalance, 'EGP')}
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
            <span>{allExpiredParties.length} حساب منتهي</span>
            <span className="text-emerald-400 font-bold">Breakage: {formatCurrency(totalBreakageRevenue)}</span>
          </div>
        </Card>
      </div>

      {/* Sub Navigation Bar */}
      <Card className="p-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSubTab('cashback')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'cashback'
                ? 'bg-amber-500 text-black font-black shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            أرصدة الكاش باك ({cashbackHolders.length})
          </button>

          <button
            type="button"
            onClick={() => setSubTab('referrals')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'referrals'
                ? 'bg-purple-500 text-white font-black shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            عمولات الإحالات ({referrals.length})
          </button>

          <button
            type="button"
            onClick={() => setSubTab('middleman')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'middleman'
                ? 'bg-emerald-500 text-white font-black shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            عمولات الوساطة ({deals.length})
          </button>

          {/* New Sub-tab: Expired & Breakage */}
          <button
            type="button"
            onClick={() => setSubTab('expired_breakage')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'expired_breakage'
                ? 'bg-rose-600 text-white font-black shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>أرصدة منتهية الصلاحية (Breakage)</span>
            {allExpiredParties.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono animate-pulse">
                {allExpiredParties.length} ⚠️
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الهاتف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl pr-9 pl-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none w-48 sm:w-60 focus:border-amber-500"
            />
          </div>

          <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>
            تصدير Excel
          </Button>
        </div>
      </Card>

      {/* Tab 1: Cashback */}
      {subTab === 'cashback' && (
        <Card className="p-4 space-y-4">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <tr>
                  <th className="p-3">الاسم والبيانات</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3">نوع الحساب</th>
                  <th className="p-3">رصيد الكاش باك المتاح</th>
                  <th className="p-3">إجمالي الكاش باك المكتسب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {cashbackHolders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-400">
                      لا توجد حسابات كاش باك مطابقة
                    </td>
                  </tr>
                ) : (
                  cashbackHolders.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{c.name}</td>
                      <td className="p-3 font-mono text-zinc-400">{c.phone || '-'}</td>
                      <td className="p-3">
                        <Badge variant={c.type === 'عميل شحن' ? 'default' : 'warning'} size="sm">
                          {c.type}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono font-black text-amber-500">{formatCurrency(c.balance, 'EGP')}</td>
                      <td className="p-3 font-mono font-bold text-emerald-500">{formatCurrency(c.earned, 'EGP')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Referrals */}
      {subTab === 'referrals' && (
        <Card className="p-4 space-y-4">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <tr>
                  <th className="p-3">المُحيل (الشريك)</th>
                  <th className="p-3">كود الإحالة</th>
                  <th className="p-3">العميل المُحال</th>
                  <th className="p-3">إجمالي العمولة المصروفة</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">تاريخ الربط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {referrals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-400">
                      لا توجد إحالات مسجلة
                    </td>
                  </tr>
                ) : (
                  referrals.map(r => {
                    const details = getReferrerDetails(r);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">{details.referrerName}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">{details.referrerPhone}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-purple-400">{r.referrerCode || '-'}</td>
                        <td className="p-3">
                          <div className="text-zinc-900 dark:text-zinc-100">{details.refereeName}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">{details.refereePhone}</div>
                        </td>
                        <td className="p-3 font-mono font-black text-purple-400">
                          {formatCurrency(r.totalCommissionFromReferral || 0, 'EGP')}
                        </td>
                        <td className="p-3">
                          <Badge variant={r.status === 'active' ? 'success' : 'default'} size="sm">
                            {r.status === 'active' ? 'نشط' : 'منتهي'}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-zinc-400">{formatDateTime(r.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Middleman */}
      {subTab === 'middleman' && (
        <Card className="p-4 space-y-4">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <tr>
                  <th className="p-3">رقم الصفقة</th>
                  <th className="p-3">عنوان الصفقة واللعبة</th>
                  <th className="p-3">مبلغ الصفقة</th>
                  <th className="p-3">عمولة الشركة الصافية</th>
                  <th className="p-3">عمولة وسيط خارجي</th>
                  <th className="p-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {deals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-400">
                      لا توجد صفقات وساطة مكتملة
                    </td>
                  </tr>
                ) : (
                  deals.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-orange-500">#{d.dealNumber}</td>
                      <td className="p-3 text-zinc-900 dark:text-zinc-100">{d.title} ({d.gameName})</td>
                      <td className="p-3 font-bold">{formatCurrency(d.dealAmountEGP || d.dealAmount, 'EGP')}</td>
                      <td className="p-3 font-black text-emerald-500">
                        {formatCurrency(d.netCompanyProfitEGP || d.companyCommissionAmountEGP || 0, 'EGP')}
                      </td>
                      <td className="p-3 font-bold text-rose-400">
                        {formatCurrency(d.externalMiddlemanCommissionAmountEGP || 0, 'EGP')}
                      </td>
                      <td className="p-3 font-mono text-zinc-400">{formatDateTime(d.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4: Expired Balances & Breakage Management (Modification #6) */}
      {subTab === 'expired_breakage' && (
        <div className="space-y-4">
          {/* Sub-view Navigation Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpiredSubView('current_expired')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  expiredSubView === 'current_expired'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                الأرصدة المنتهية حالياً ({allExpiredParties.length})
              </button>

              <button
                type="button"
                onClick={() => setExpiredSubView('breakage_history')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  expiredSubView === 'breakage_history'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                سجل إيرادات Breakage ({breakageRecords.length})
              </button>

              <button
                type="button"
                onClick={() => setExpiredSubView('extension_history')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  expiredSubView === 'extension_history'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                سجل تمديد الصلاحية ({extensionRecords.length})
              </button>
            </div>

            {expiredSubView === 'current_expired' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-400 font-bold">فلتر النوع:</span>
                {(['all', 'cashback', 'referral'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setExpiredTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      expiredTypeFilter === t
                        ? 'bg-amber-500 text-black shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t === 'all' ? 'الكل' : t === 'cashback' ? 'كاش باك فقط' : 'إحالة فقط'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sub-view 1: Current Expired Balances Table */}
          {expiredSubView === 'current_expired' && (
            <Card className="p-4 space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-zinc-700 dark:text-zinc-300">
                🔒 <strong>قاعدة إدارة الأمانات وBreakage:</strong> الأرصدة المنتهية (كاش باك &gt; 6 شهور، إحالة &gt; 12 شهر) لا تُصادر تلقائياً. المالك يتخذ قراراً يدوياً: إما <strong>التمديد كأمانة</strong> للعميل، أو <strong>التحويل لمحفظة البضاعة كإيراد Breakage</strong> للأعمال.
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-3">الطرف والبيانات</th>
                      <th className="p-3">الفئة</th>
                      <th className="p-3">كاش باك منتهي ⚠️</th>
                      <th className="p-3">إحالة منتهية ⚠️</th>
                      <th className="p-3">إجمالي الرصيد المنتهي</th>
                      <th className="p-3">أقدم دفعة منتهية</th>
                      <th className="p-3 text-center">الإجراء المالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {filteredExpiredParties.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-400">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                          ممتاز! لا توجد أرصدة منتهية الصلاحية تتطلب إجراء حالياً.
                        </td>
                      </tr>
                    ) : (
                      filteredExpiredParties.map(party => {
                        const totalExpired = party.cashbackExpired + party.referralExpired;
                        return (
                          <tr key={party.partyId} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-zinc-900 dark:text-zinc-100">{party.partyName}</div>
                              <div className="text-[10px] text-zinc-400 font-mono">{party.partyPhone || '-'}</div>
                            </td>
                            <td className="p-3">
                              <Badge variant={party.partyType === 'customer' ? 'default' : 'warning'} size="sm">
                                {party.partyType === 'customer' ? 'عميل شحن' : 'تاجر جملة'}
                              </Badge>
                            </td>
                            <td className="p-3 font-mono font-bold">
                              {party.cashbackExpired > 0 ? (
                                <span className="text-rose-500 font-black">
                                  {formatCurrency(party.cashbackExpired)} ⚠️
                                </span>
                              ) : (
                                <span className="text-zinc-400">-</span>
                              )}
                            </td>
                            <td className="p-3 font-mono font-bold">
                              {party.referralExpired > 0 ? (
                                <span className="text-rose-500 font-black">
                                  {formatCurrency(party.referralExpired)} ⚠️
                                </span>
                              ) : (
                                <span className="text-zinc-400">-</span>
                              )}
                            </td>
                            <td className="p-3 font-mono font-black text-rose-500 text-sm">
                              {formatCurrency(totalExpired)}
                            </td>
                            <td className="p-3 font-mono text-zinc-400">
                              {party.oldestExpiredDate ? formatDate(party.oldestExpiredDate) : '-'}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setSelectedPartyForModal(party);
                                  setModalWalletType(party.cashbackExpired > 0 ? 'cashback' : 'referral');
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                              >
                                إدارة الرصيد ⚙️
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Sub-view 2: Breakage History Log Table */}
          {expiredSubView === 'breakage_history' && (
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                  سجل إيرادات Breakage المحولة من الأمانات إلى محفظة البضاعة
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  الإجمالي: {formatCurrency(totalBreakageRevenue)}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-3">الطرف</th>
                      <th className="p-3">الفئة</th>
                      <th className="p-3">نوع المحفظة</th>
                      <th className="p-3">المبلغ المحول</th>
                      <th className="p-3">محفظة الوجهة</th>
                      <th className="p-3">المنفذ</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {breakageRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-zinc-400">
                          لا توجد عمليات تحويل Breakage سابقة
                        </td>
                      </tr>
                    ) : (
                      breakageRecords.map(brk => (
                        <tr key={brk.id} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                          <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{brk.partyName}</td>
                          <td className="p-3">
                            <Badge variant={brk.partyType === 'customer' ? 'default' : 'warning'} size="sm">
                              {brk.partyType === 'customer' ? 'عميل' : 'تاجر'}
                            </Badge>
                          </td>
                          <td className="p-3 font-bold text-amber-500">
                            {brk.walletType === 'cashback' ? 'كاش باك' : 'إحالة'}
                          </td>
                          <td className="p-3 font-mono font-black text-emerald-500">
                            +{formatCurrency(brk.amount)}
                          </td>
                          <td className="p-3 text-zinc-400">{brk.toWalletName}</td>
                          <td className="p-3 text-zinc-400">{brk.performedBy}</td>
                          <td className="p-3 font-mono text-zinc-400">{formatDateTime(brk.createdAt)}</td>
                          <td className="p-3 text-zinc-400">{brk.notes || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Sub-view 3: Extension History Log Table */}
          {expiredSubView === 'extension_history' && (
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                  سجل عمليات تمديد الصلاحية كأمانات
                </span>
                <span className="font-mono font-bold text-purple-400 text-sm">
                  إجمالي الممدد: {formatCurrency(totalExtendedAmount)}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                    <tr>
                      <th className="p-3">الطرف</th>
                      <th className="p-3">الفئة</th>
                      <th className="p-3">نوع المحفظة</th>
                      <th className="p-3">المبلغ الممدد</th>
                      <th className="p-3">المدة المضافة</th>
                      <th className="p-3">تاريخ الانتهاء الجديد</th>
                      <th className="p-3">المنفذ</th>
                      <th className="p-3">تاريخ التمديد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                    {extensionRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-zinc-400">
                          لا توجد عمليات تمديد سابقة
                        </td>
                      </tr>
                    ) : (
                      extensionRecords.map(ext => (
                        <tr key={ext.id} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                          <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{ext.partyName}</td>
                          <td className="p-3">
                            <Badge variant={ext.partyType === 'customer' ? 'default' : 'warning'} size="sm">
                              {ext.partyType === 'customer' ? 'عميل' : 'تاجر'}
                            </Badge>
                          </td>
                          <td className="p-3 font-bold text-purple-400">
                            {ext.walletType === 'cashback' ? 'كاش باك' : 'إحالة'}
                          </td>
                          <td className="p-3 font-mono font-black text-amber-500">
                            {formatCurrency(ext.amount)}
                          </td>
                          <td className="p-3 font-bold">+{ext.extendedMonths} أشهر</td>
                          <td className="p-3 font-mono text-emerald-400">{formatDate(ext.newExpiryDate)}</td>
                          <td className="p-3 text-zinc-400">{ext.performedBy}</td>
                          <td className="p-3 font-mono text-zinc-400">{formatDateTime(ext.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Expired Balance Management Modal Triggered from Finance Module */}
      {selectedPartyForModal && (
        <ExpiredBalanceManagementModal
          isOpen={!!selectedPartyForModal}
          onClose={() => setSelectedPartyForModal(null)}
          summary={selectedPartyForModal}
          targetWallet={modalWalletType}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
};
