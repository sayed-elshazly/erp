// =============================================================
// NZM JKR TOP UP ERP — Customers Executive Dashboard
// Departmental Analytics, Segmentation, Charts & Drill-Down
// =============================================================

import React, { useState, useMemo } from 'react';
import { Customer, ProfileType, LoyaltyTier, PurchasingPower, CustomerTicket } from '../../types/customer.types';
import { db } from '../../database/db';
import { WalletExpirationService } from '../../services/wallet/walletExpirationService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { MiniBarChart } from '../../components/charts/MiniBarChart';
import { MiniDonutChart } from '../../components/charts/MiniDonutChart';
import { MiniLineChart } from '../../components/charts/MiniLineChart';
import { ProgressMetric } from '../../components/charts/ProgressMetric';
import { UnifiedFinanceFilterBar } from '../../components/common/UnifiedFinanceFilterBar';
import { KpiDrillDownModal } from '../dashboard/KpiDrillDownModal';
import { UnifiedFinanceFilter, FinanceMetrics } from '../../types/finance.types';
import {
  Users, DollarSign, TrendingUp, Award, Crown,
  Sparkles, ShoppingBag, Gift, Share2, Clock,
  CheckCircle2, AlertTriangle, ArrowUpRight, ChevronLeft,
  Plus, BarChart3, Store, Video, UserCheck,
  Zap, Flame, ArrowRight, Star, UserPlus, Filter
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

interface CustomersDashboardProps {
  onOpenNewCustomer?: () => void;
  onSelectCustomer?: (customer: Customer) => void;
  onNavigateToDirectory?: (typeFilter?: 'all' | ProfileType) => void;
  hideHeaderCard?: boolean;
}

export const CustomersDashboard: React.FC<CustomersDashboardProps> = ({
  onOpenNewCustomer,
  onSelectCustomer,
  onNavigateToDirectory,
  hideHeaderCard = false
}) => {
  const [filter, setFilter] = useState<UnifiedFinanceFilter>({
    datePreset: 'all',
    customStartDate: '',
    customEndDate: '',
    department: 'customers',
    gameName: 'all',
    planId: 'all',
    personQuery: '',
    employeeId: 'all',
    transactionType: 'all'
  });

  const [drillDownState, setDrillDownState] = useState<{
    isOpen: boolean;
    kpiId: string;
    kpiTitle: string;
    kpiValue: string | number;
    kpiSubtitle?: string;
  }>({
    isOpen: false,
    kpiId: '',
    kpiTitle: '',
    kpiValue: 0
  });

  const customers = useMemo(() => db.getCustomers(), []);
  const tickets = useMemo(() => db.getTickets ? db.getTickets() : [], []);

  // Filtered Single Source of Truth Metrics
  const metrics = useMemo(() => {
    return db.getFinanceMetrics({ ...filter, department: 'customers' });
  }, [filter]);

  const transactions = useMemo(() => {
    return db.getUnifiedTransactions({ ...filter, department: 'customers' });
  }, [filter]);

  const customerTxs = useMemo(() => db.getUnifiedWalletTransactions(), []);
  const expiredCustomers = useMemo(() => {
    return WalletExpirationService.getAllExpiredParties(customers, [], customerTxs, []);
  }, [customers, customerTxs]);

  const totalExpiredAmount = useMemo(() => {
    return Math.round(expiredCustomers.reduce((acc, p) => acc + p.cashbackExpired + p.referralExpired, 0) * 100) / 100;
  }, [expiredCustomers]);

  // Key KPI Calculations
  const stats = useMemo(() => {
    const total = customers.length;
    const regularCount = customers.filter(c => c.profileType === 'regular').length;
    const partnerCount = customers.filter(c => c.profileType === 'partner').length;
    const storeCount = customers.filter(c => c.profileType === 'shop').length;
    const influencerCount = customers.filter(c => c.profileType === 'influencer').length;

    // Active in last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activeLast30Days = customers.filter(c => {
      if (!c.lastPurchaseDate) return false;
      return new Date(c.lastPurchaseDate) >= thirtyDaysAgo;
    }).length;

    // Loyalty Tiers
    const vipCount = customers.filter(c => c.loyaltyTier === 'vip').length;
    const goldCount = customers.filter(c => c.loyaltyTier === 'gold').length;
    const silverCount = customers.filter(c => c.loyaltyTier === 'silver').length;
    const bronzeCount = customers.filter(c => !c.loyaltyTier || c.loyaltyTier === 'normal').length;

    // Purchasing Power
    const whaleCount = customers.filter(c => c.purchasingPower === 'whale').length;
    const strongCount = customers.filter(c => c.purchasingPower === 'strong').length;
    const mediumCount = customers.filter(c => c.purchasingPower === 'medium').length;
    const lowCount = customers.filter(c => !c.purchasingPower || c.purchasingPower === 'normal').length;

    // Financial Totals
    const totalLifetimeSpendingEGP = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const totalCashbackBalance = customers.reduce((sum, c) => sum + (c.cashbackBalance || 0), 0);
    const totalPendingReferrals = customers.reduce((sum, c) => sum + (c.referralWalletBalance || 0), 0);
    const totalOrdersCount = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);

    // Top 8 High Value Customers (Whales & VIPs)
    const topSpenders = [...customers]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 8);

    // Most Recent Customers
    const recentCustomers = [...customers]
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, 6);

    return {
      total,
      regularCount,
      partnerCount,
      storeCount,
      influencerCount,
      activeLast30Days,
      vipCount,
      goldCount,
      silverCount,
      bronzeCount,
      whaleCount,
      strongCount,
      mediumCount,
      lowCount,
      totalLifetimeSpendingEGP,
      totalCashbackBalance,
      totalPendingReferrals,
      totalOrdersCount,
      topSpenders,
      recentCustomers
    };
  }, [customers]);

  // Top Games Bar Chart Data
  const topGames = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.filter(t => t.status === 'completed').forEach(t => {
      const g = t.gameName || 'أخرى';
      counts[g] = (counts[g] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [tickets]);

  // Purchasing Power Donut
  const purchasingPowerSegments = [
    { label: 'حوت (+4500 ج)', value: stats.whaleCount, color: '#06b6d4' },
    { label: 'قوي (2000-4500 ج)', value: stats.strongCount, color: '#10b981' },
    { label: 'متوسط (500-1999 ج)', value: stats.mediumCount, color: '#3b82f6' },
    { label: 'عادي (أقل من 500 ج)', value: stats.lowCount, color: '#f59e0b' }
  ];

  // Loyalty Tier Donut
  const loyaltySegments = [
    { label: 'VIP ملكي', value: stats.vipCount, color: '#8b5cf6' },
    { label: 'ذهبي', value: stats.goldCount, color: '#f59e0b' },
    { label: 'فضي', value: stats.silverCount, color: '#3b82f6' },
    { label: 'برونزي', value: stats.bronzeCount, color: '#6b7280' }
  ];

  const handleDrillDown = (id: string, title: string, value: string | number) => {
    setDrillDownState({
      isOpen: true,
      kpiId: id,
      kpiTitle: title,
      kpiValue: value,
      kpiSubtitle: 'بيانات قسم الزبائن والشحن'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Header & Quick Action Bar */}
      {!hideHeaderCard && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-linear-to-r from-orange-500/10 via-amber-500/5 to-transparent p-4 rounded-3xl border border-orange-500/20 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>لوحة تحكم وتحليلات الزبائن (Customers Executive Dashboard)</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500 text-white">
                  {stats.total} مسجل
                </span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                متابعة القوة الشرائية، مستويات الولاء، مؤشرات الإنفاق، ومستحقات الكاش باك والإحالات.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenNewCustomer && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={onOpenNewCustomer}
                className="shadow-md shadow-orange-500/20 font-bold"
              >
                ➕ إضافة عميل جديد
              </Button>
            )}

            {onNavigateToDirectory && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowRight className="w-4 h-4 text-orange-500 rotate-180" />}
                onClick={() => onNavigateToDirectory('all')}
                className="border-orange-500/20 font-bold"
              >
                📋 الانتقال لقائمة وسجلات العملاء
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Expired Balances Alert Card */}
      {expiredCustomers.length > 0 && (
        <div className="p-4 rounded-3xl bg-linear-to-r from-rose-500/15 via-amber-500/10 to-transparent border border-rose-500/30 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-500/30 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                  ⚠️ تنبيه: توجد أرصدة كاش باك / إحالة تجاوزت مدة الصلاحية
                </span>
                <Badge variant="danger" size="sm" className="font-mono">
                  {expiredCustomers.length} عميل
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                إجمالي الأرصدة المستحقة للمراجعة: <strong className="text-rose-500 font-mono font-black">{formatCurrency(totalExpiredAmount)}</strong> (كاش باك تعدى 6 شهور / إحالة تعدت 12 شهر). يتطلب قرارك: تمديد الصلاحية أو التحويل لمحفظة البضاعة كإيراد Breakage.
              </p>
            </div>
          </div>

          {onNavigateToDirectory && (
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRight className="w-4 h-4 text-rose-500 rotate-180" />}
              onClick={() => onNavigateToDirectory('all')}
              className="border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white font-bold cursor-pointer"
            >
              عرض وإدارة الأرصدة المنتهية
            </Button>
          )}
        </div>
      )}

      {/* Unified Filter Bar (Restricted to Department = Customers) */}
      <UnifiedFinanceFilterBar
        filter={filter}
        onChange={f => setFilter({ ...f, department: 'customers' })}
        showDepartmentFilter={false}
        showPlanFilter={false}
        onReset={() => setFilter({
          datePreset: 'all',
          customStartDate: '',
          customEndDate: '',
          department: 'customers',
          gameName: 'all',
          planId: 'all',
          personQuery: '',
          employeeId: 'all',
          transactionType: 'all'
        })}
      />

      {/* 4 Main KPI Cards with Drill-Down */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div
          onClick={() => handleDrillDown('cust_count', 'إجمالي قاعدة الزبائن', stats.total)}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-orange-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">إجمالي قاعدة الزبائن</span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
            {stats.total} <span className="text-xs font-normal text-zinc-400">حساب</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span className="text-emerald-500 font-bold">🟢 {stats.activeLast30Days} نشط (30 يوم)</span>
            <span>•</span>
            <span>{Math.round((stats.activeLast30Days / (stats.total || 1)) * 100)}% تفاعل</span>
          </div>
        </div>

        {/* Total Lifetime Spending */}
        <div
          onClick={() => handleDrillDown('cust_revenue', 'إجمالي مبيعات الزبائن', formatCurrency(metrics.customerRevenue || stats.totalLifetimeSpendingEGP))}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">إجمالي مبيعات الزبائن</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500 font-mono">
            {formatCurrency(metrics.customerRevenue || stats.totalLifetimeSpendingEGP)}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold">🛒 {stats.totalOrdersCount} عملية شراء</span>
            <span>•</span>
            <span>أرباح: +{formatCurrency(metrics.customerProfit)}</span>
          </div>
        </div>

        {/* Total Cashback Balances */}
        <div
          onClick={() => handleDrillDown('cust_cashback', 'رصيد الكاش باك الممنوح', formatCurrency(stats.totalCashbackBalance))}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">رصيد الكاش باك الممنوح</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500 font-mono">
            {formatCurrency(stats.totalCashbackBalance)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span>متاح للاستخدام الفوري بالتذاكر</span>
            <span className="text-amber-500 font-bold font-mono">💰 Cashback</span>
          </div>
        </div>

        {/* Pending Referral Commissions */}
        <div
          onClick={() => handleDrillDown('cust_referrals', 'مستحقات عمولات الإحالة', formatCurrency(stats.totalPendingReferrals))}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-purple-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">مستحقات عمولات الإحالة</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Share2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-400 font-mono">
            {formatCurrency(stats.totalPendingReferrals)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span>{stats.partnerCount + stats.influencerCount} شريك ومسوق مسجل</span>
            <span className="text-purple-400 font-bold font-mono">🤝 Referral</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Games Chart */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <MiniBarChart
            data={topGames}
            title="🎮 أكثر الألعاب مبيعاً وشحناً"
            horizontal
            formatValue={v => `${v} تذكرة`}
            accentColor="#f97316"
          />
        </div>

        {/* Purchasing Power Donut */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <MiniDonutChart
            segments={purchasingPowerSegments}
            title="⚡ توزيع القوة الشرائية"
            size={115}
            thickness={22}
            centerValue={stats.total}
            centerLabel="عميل"
          />
        </div>

        {/* Loyalty Tiers Donut */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <MiniDonutChart
            segments={loyaltySegments}
            title="👑 مستويات الولاء والرتب"
            size={115}
            thickness={22}
            centerValue={stats.vipCount + stats.goldCount}
            centerLabel="كبار العملاء"
          />
        </div>
      </div>

      {/* Category Classification Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => onNavigateToDirectory && onNavigateToDirectory('regular')}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-blue-500 cursor-pointer transition-all space-y-1 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">عملاء عاديين</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-mono">{stats.regularCount}</div>
          <span className="text-[10px] text-zinc-400 block">{Math.round((stats.regularCount / (stats.total || 1)) * 100)}% من الإجمالي</span>
        </div>

        <div
          onClick={() => onNavigateToDirectory && onNavigateToDirectory('partner')}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-purple-500 cursor-pointer transition-all space-y-1 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">شركاء وإحالات</span>
            <Share2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-400 font-mono">{stats.partnerCount}</div>
          <span className="text-[10px] text-zinc-400 block">عمولات وروابط</span>
        </div>

        <div
          onClick={() => onNavigateToDirectory && onNavigateToDirectory('shop')}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-emerald-500 cursor-pointer transition-all space-y-1 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">محلات ونقاط بيع</span>
            <Store className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-500 font-mono">{stats.storeCount}</div>
          <span className="text-[10px] text-zinc-400 block">طلبات متكررة</span>
        </div>

        <div
          onClick={() => onNavigateToDirectory && onNavigateToDirectory('influencer')}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-amber-500 cursor-pointer transition-all space-y-1 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">مشاهير وصناع محتوى</span>
            <Video className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-500 font-mono">{stats.influencerCount}</div>
          <span className="text-[10px] text-zinc-400 block">كوبونات ترويجية</span>
        </div>
      </div>

      {/* Top 8 Spenders Bar List */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <span>كبار العملاء (أعلى إنفاق تراكمي)</span>
          </h3>
          <span className="text-xs text-zinc-400 font-mono font-bold">Top 8 Spenders</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {stats.topSpenders.map((cust, i) => (
            <div
              key={cust.id}
              onClick={() => onSelectCustomer?.(cust)}
              className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-zinc-800 hover:border-orange-500/50 cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-500 font-black font-mono text-xs flex items-center justify-center">
                  #{i + 1}
                </span>
                <div>
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 block truncate max-w-[110px]">
                    {cust.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">{cust.phone}</span>
                </div>
              </div>
              <div className="text-left font-mono">
                <span className="font-black text-xs text-orange-500 block">{formatCurrency(cust.totalSpent)}</span>
                <span className="text-[9px] text-zinc-400">{cust.totalOrders} طلب</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Department Grand Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20">
        <ProgressMetric label="إجمالي مبيعات القسم" value={formatCurrency(metrics.customerRevenue || stats.totalLifetimeSpendingEGP)} percentage={100} color="#f97316" subtitle="مبيعات الشحن" size="sm" />
        <ProgressMetric label="صافي أرباح القسم" value={formatCurrency(metrics.customerProfit)} percentage={metrics.customerRevenue ? Math.round(((metrics.customerProfit || 0) / (metrics.customerRevenue || 1)) * 100) : 18} color="#10b981" subtitle="هامش الربح" size="sm" />
        <ProgressMetric label="تكلفة البضاعة المشحونة" value={formatCurrency(metrics.customerCost)} percentage={metrics.customerRevenue ? Math.round(((metrics.customerCost || 0) / (metrics.customerRevenue || 1)) * 100) : 82} color="#3b82f6" subtitle="تكلفة المنتجات" size="sm" />
        <ProgressMetric label="المستردات والخصومات" value={formatCurrency((metrics.customerRefunds || 0) + (metrics.customerDiscounts || 0))} percentage={5} color="#ef4444" subtitle="كوبونات واسترداد" size="sm" />
      </div>

      {/* Drill Down Modal */}
      <KpiDrillDownModal
        isOpen={drillDownState.isOpen}
        onClose={() => setDrillDownState(prev => ({ ...prev, isOpen: false }))}
        kpiId={drillDownState.kpiId}
        kpiTitle={drillDownState.kpiTitle}
        kpiValue={drillDownState.kpiValue}
        kpiSubtitle={drillDownState.kpiSubtitle}
        transactions={transactions}
        filter={filter}
      />
    </div>
  );
};
