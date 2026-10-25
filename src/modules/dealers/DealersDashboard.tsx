// =============================================================
// NZM JKR TOP UP ERP — Dealers & Wholesalers Executive Dashboard
// Departmental Analytics, Segmentation, Charts & Drill-Down
// =============================================================

import React, { useState, useMemo } from 'react';
import { Dealer, DealerProfileType, LoyaltyTier, PurchasingPower } from '../../types/dealer.types';
import { db } from '../../database/db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { MiniBarChart } from '../../components/charts/MiniBarChart';
import { MiniDonutChart } from '../../components/charts/MiniDonutChart';
import { ProgressMetric } from '../../components/charts/ProgressMetric';
import { UnifiedFinanceFilterBar } from '../../components/common/UnifiedFinanceFilterBar';
import { KpiDrillDownModal } from '../dashboard/KpiDrillDownModal';
import { UnifiedFinanceFilter, FinanceMetrics } from '../../types/finance.types';
import {
  Building2, Users, DollarSign, TrendingUp, Award,
  Crown, Sparkles, ShoppingBag, Gift, Coins,
  Share2, Clock, CheckCircle2, AlertTriangle,
  ArrowUpRight, ChevronLeft, Plus, BarChart3,
  Store, CreditCard, Zap, Flame, ArrowRight,
  MapPin, Lock, Tag, ArrowDownLeft, ShieldCheck
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

interface DealersDashboardProps {
  onOpenNewDealer?: () => void;
  onSelectDealer?: (dealer: any) => void;
  onNavigateToDirectory?: (typeFilter?: 'all' | DealerProfileType) => void;
  hideHeaderCard?: boolean;
}

export const DealersDashboard: React.FC<DealersDashboardProps> = ({
  onOpenNewDealer,
  onSelectDealer,
  onNavigateToDirectory,
  hideHeaderCard = false
}) => {
  const [filter, setFilter] = useState<UnifiedFinanceFilter>({
    datePreset: 'all',
    customStartDate: '',
    customEndDate: '',
    department: 'dealers',
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

  const dealers = useMemo(() => db.getDealers ? db.getDealers() : [], []);
  const merchants = useMemo(() => db.getMerchants ? db.getMerchants(true) : [], []);
  const invoices = useMemo(() => db.getMerchantInvoices ? db.getMerchantInvoices() : [], []);

  const metrics = useMemo(() => {
    return db.getFinanceMetrics({ ...filter, department: 'dealers' });
  }, [filter]);

  const transactions = useMemo(() => {
    return db.getUnifiedTransactions({ ...filter, department: 'dealers' });
  }, [filter]);

  // Key KPI Calculations
  const stats = useMemo(() => {
    const allEntities = dealers.length > 0 ? dealers : merchants;
    const total = allEntities.length;
    const activeCount = allEntities.filter((d: any) => d.status === 'active').length;
    const blockedCount = allEntities.filter((d: any) => d.status === 'inactive' || d.status === 'suspended' || d.status === 'frozen' || d.isFrozen || d.isArchived).length;

    // Type Breakdown
    const vipCount = allEntities.filter((d: any) => d.profileType === 'vip_dealer' || d.type === 'distributor').length;
    const distributorCount = allEntities.filter((d: any) => d.profileType === 'distributor' || d.type === 'wholesaler').length;
    const storeCount = allEntities.filter((d: any) => d.profileType === 'shop' || d.type === 'pos').length;
    const agentCount = allEntities.filter((d: any) => d.profileType === 'agent' || d.type === 'external_supplier').length;

    // Balances
    const totalCurrentBalance = allEntities.reduce((sum: number, d: any) => sum + (d.balance || 0), 0);
    const receivables = allEntities.filter((d: any) => (d.balance || 0) > 0).reduce((s: number, d: any) => s + (d.balance || 0), 0);
    const payables = allEntities.filter((d: any) => (d.balance || 0) < 0).reduce((s: number, d: any) => s + Math.abs(d.balance || 0), 0);

    // Top 8 Wholesalers by volume
    const topDealers = [...allEntities]
      .sort((a: any, b: any) => (b.totalSpent || b.totalSales || 0) - (a.totalSpent || a.totalSales || 0))
      .slice(0, 8);

    return {
      total,
      activeCount,
      blockedCount,
      vipCount,
      distributorCount,
      storeCount,
      agentCount,
      totalCurrentBalance,
      receivables,
      payables,
      topDealers
    };
  }, [dealers, merchants]);

  // Top Wholesale Products
  const topWholesaleProducts = useMemo(() => {
    const productCounts: Record<string, number> = {};
    invoices.forEach(inv => {
      inv.items?.forEach(item => {
        const name = item.productName || 'منتج جملة';
        productCounts[name] = (productCounts[name] || 0) + (item.quantity || 1);
      });
    });

    const sorted = Object.entries(productCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    if (sorted.length === 0) {
      return [
        { label: 'باقات شحن جملة PUBG', value: 54 },
        { label: 'أكواد Free Fire موزعين', value: 42 },
        { label: 'بطاقات ألعاب ورصيد', value: 31 },
        { label: 'شحن محافظ رقمية', value: 20 }
      ];
    }
    return sorted;
  }, [invoices]);

  // Classification Donut
  const classificationSegments = [
    { label: 'موزعون معتمدون', value: Math.max(stats.vipCount, 1), color: '#f59e0b' },
    { label: 'تجار جملة', value: Math.max(stats.distributorCount, 1), color: '#3b82f6' },
    { label: 'محلات ونقاط بيع', value: Math.max(stats.storeCount, 1), color: '#10b981' },
    { label: 'موردون ووكلاء', value: Math.max(stats.agentCount, 1), color: '#8b5cf6' }
  ];

  // Top Dealers Bar Chart Data
  const topDealersBarData = useMemo(() => {
    return stats.topDealers.slice(0, 6).map((d: any) => ({
      label: d.name || d.companyName || d.code,
      value: d.totalSpent || d.totalSales || 0
    }));
  }, [stats.topDealers]);

  const handleDrillDown = (id: string, title: string, value: string | number) => {
    setDrillDownState({
      isOpen: true,
      kpiId: id,
      kpiTitle: title,
      kpiValue: value,
      kpiSubtitle: 'بيانات قسم التجار والموزعين'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Header & Quick Action Bar */}
      {!hideHeaderCard && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-linear-to-r from-amber-500/10 via-yellow-500/5 to-transparent p-4 rounded-3xl border border-amber-500/20 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>لوحة تحكم قسم التجار والموزعين (Dealers Executive Dashboard)</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white">
                  {stats.total} تاجر مسجل
                </span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                إدارة أسعار الجملة، حسابات الموزعين، تسويات السندات، ومتابعة الأرصدة والمديونيات.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenNewDealer && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={onOpenNewDealer}
                className="shadow-md shadow-amber-500/20 font-bold bg-amber-500 hover:bg-amber-600 text-white border-none"
              >
                ➕ إضافة تاجر جديد
              </Button>
            )}

            {onNavigateToDirectory && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowRight className="w-4 h-4 text-amber-500 rotate-180" />}
                onClick={() => onNavigateToDirectory('all')}
                className="border-amber-500/20 font-bold"
              >
                📋 الانتقال لدليل وسجلات التجار
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Unified Filter Bar (Restricted to Department = Dealers) */}
      <UnifiedFinanceFilterBar
        filter={filter}
        onChange={f => setFilter({ ...f, department: 'dealers' })}
        showDepartmentFilter={false}
        showPlanFilter={false}
        onReset={() => setFilter({
          datePreset: 'all',
          customStartDate: '',
          customEndDate: '',
          department: 'dealers',
          gameName: 'all',
          planId: 'all',
          personQuery: '',
          employeeId: 'all',
          transactionType: 'all'
        })}
      />

      {/* 4 Main KPI Cards with Drill-Down */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dealers */}
        <div
          onClick={() => handleDrillDown('dealer_count', 'إجمالي التجار والموزعين', stats.total)}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">إجمالي شبكة التجار</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
            {stats.total} <span className="text-xs font-normal text-zinc-400">تاجر</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span className="text-emerald-500 font-bold">🟢 {stats.activeCount} نشط</span>
            <span>•</span>
            <span className="text-rose-500 font-bold">🔴 {stats.blockedCount} متوقف</span>
          </div>
        </div>

        {/* Total Wholesale Revenue */}
        <div
          onClick={() => handleDrillDown('dealer_revenue', 'مبيعات الجملة الإجمالية', formatCurrency(metrics.dealerRevenue))}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-blue-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">إجمالي مبيعات الجملة</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-500 font-mono">
            {formatCurrency(metrics.dealerRevenue)}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span className="text-emerald-500 font-black">أرباح: +{formatCurrency(metrics.dealerProfit)}</span>
            <span>•</span>
            <span>هامش: 15%</span>
          </div>
        </div>

        {/* Total Receivables (لنا طرف التجار) */}
        <div
          onClick={() => handleDrillDown('dealer_debts_in', 'مستحقات لنا طرف التجار (مدين)', formatCurrency(stats.receivables))}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">مستحقات لنا (مدين)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500 font-mono">
            {formatCurrency(stats.receivables)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span>فواتير وسحوبات آجلة</span>
            <span className="text-emerald-500 font-bold font-mono">قيد التحصيل</span>
          </div>
        </div>

        {/* Total Payables (علينا للتجار) */}
        <div
          onClick={() => handleDrillDown('dealer_debts_out', 'مستحقات للتجار علينا (دائن)', formatCurrency(stats.payables))}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-rose-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">مستحقات للتجار (دائن)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-500 font-mono">
            {formatCurrency(stats.payables)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span>أرصدة مودعة مسبقاً</span>
            <span className="text-rose-500 font-bold font-mono">تغطية المحافظ</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Dealers by Volume */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <MiniBarChart
            data={topDealersBarData}
            title="🏢 أعلى التجار مبيعاً وتعاملاً"
            horizontal
            formatValue={v => formatCurrency(v)}
            accentColor="#f59e0b"
          />
        </div>

        {/* Wholesale Products */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <MiniBarChart
            data={topWholesaleProducts}
            title="📦 أكثر منتجات الجملة سحباً"
            horizontal
            formatValue={v => `${v} طلب`}
            accentColor="#3b82f6"
          />
        </div>

        {/* Merchant Classification Donut */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <MiniDonutChart
            segments={classificationSegments}
            title="🏷️ تصنيف شبكة التجار"
            size={115}
            thickness={22}
            centerValue={stats.total}
            centerLabel="تاجر ومورد"
          />
        </div>
      </div>

      {/* Top Dealers Roster */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <span>كبار التجار والموزعين المعتمدين</span>
          </h3>
          <span className="text-xs text-zinc-400 font-mono font-bold">Top Wholesalers</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {stats.topDealers.map((dealer: any, i: number) => (
            <div
              key={dealer.id || i}
              onClick={() => onSelectDealer?.(dealer)}
              className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-zinc-800 hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 font-black font-mono text-xs flex items-center justify-center">
                  #{i + 1}
                </span>
                <div>
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 block truncate max-w-[110px]">
                    {dealer.name || dealer.companyName || dealer.code}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">{dealer.phone || dealer.city || 'تاجر جملة'}</span>
                </div>
              </div>
              <div className="text-left font-mono">
                <span className="font-black text-xs text-amber-500 block">{formatCurrency(dealer.totalSpent || dealer.totalSales || 0)}</span>
                <span className="text-[9px] text-zinc-400">{dealer.balance >= 0 ? `له ${dealer.balance} ج` : `عليه ${Math.abs(dealer.balance)} ج`}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Department Grand Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
        <ProgressMetric label="إجمالي مبيعات الجملة" value={formatCurrency(metrics.dealerRevenue)} percentage={100} color="#f59e0b" subtitle="توريدات ومبيعات" size="sm" />
        <ProgressMetric label="صافي أرباح الجملة" value={formatCurrency(metrics.dealerProfit)} percentage={15} color="#10b981" subtitle="هامش الربح" size="sm" />
        <ProgressMetric label="تكلفة البضاعة الموردة" value={formatCurrency(metrics.dealerCost)} percentage={85} color="#3b82f6" subtitle="تكلفة المشتريات" size="sm" />
        <ProgressMetric label="عدد الفواتير والحركات" value={`${metrics.dealerTxCount || invoices.length}`} percentage={80} color="#8b5cf6" subtitle="عمليات مسجلة" size="sm" />
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
