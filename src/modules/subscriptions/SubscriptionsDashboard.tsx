// =============================================================
// NZM JKR TOP UP ERP — Subscriptions Module Executive Dashboard (V2.0)
// Departmental Analytics, Segmentation, Charts & Drill-Down
// =============================================================

import React, { useState, useMemo } from 'react';
import {
  CustomerSubscription,
  SubscriptionPlan,
  SubscriptionPayment,
  SubscriptionDashboardMetrics,
  SubscriptionNotification
} from '../../types/subscription.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { MiniBarChart } from '../../components/charts/MiniBarChart';
import { MiniDonutChart } from '../../components/charts/MiniDonutChart';
import { ProgressMetric } from '../../components/charts/ProgressMetric';
import { UnifiedFinanceFilterBar } from '../../components/common/UnifiedFinanceFilterBar';
import { KpiDrillDownModal } from '../dashboard/KpiDrillDownModal';
import { UnifiedFinanceFilter, FinanceMetrics } from '../../types/finance.types';
import { SubscriptionsSellModal } from './SubscriptionsSellModal';
import { SubscriptionReceiptModal } from './SubscriptionReceiptModal';
import { SubscriptionRenewModal } from './SubscriptionRenewModal';
import { SubscriptionSchedulerModal } from './SubscriptionSchedulerModal';
import {
  Tv, Users, DollarSign, TrendingUp, Clock,
  AlertTriangle, CheckCircle2, Calendar, Layers,
  Plus, ArrowUpRight, ShieldCheck, RotateCcw,
  Sparkles, ShoppingBag, Bell, Printer, ChevronLeft,
  Flame, Activity, Zap, Crown, RefreshCw, BellRing,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';

interface SubscriptionsDashboardProps {
  onNavigateToTab?: (tabId: string) => void;
}

export const SubscriptionsDashboard: React.FC<SubscriptionsDashboardProps> = ({
  onNavigateToTab
}) => {
  const { user } = useAuth();

  const [filter, setFilter] = useState<UnifiedFinanceFilter>({
    datePreset: 'all',
    customStartDate: '',
    customEndDate: '',
    department: 'subscriptions',
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

  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>(() => db.getSubscriptions());
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => db.getSubscriptionPlans());
  const [notifications, setNotifications] = useState<SubscriptionNotification[]>(() => db.getSubscriptionNotifications());

  // Modals
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [selectedSubForReceipt, setSelectedSubForReceipt] = useState<CustomerSubscription | null>(null);
  const [selectedSubForRenew, setSelectedSubForRenew] = useState<CustomerSubscription | null>(null);

  const reloadData = () => {
    setSubscriptions(db.getSubscriptions());
    setPlans(db.getSubscriptionPlans());
    setNotifications(db.getSubscriptionNotifications());
  };

  const metrics = useMemo(() => {
    return db.getFinanceMetrics({ ...filter, department: 'subscriptions' });
  }, [filter]);

  const transactions = useMemo(() => {
    return db.getUnifiedTransactions({ ...filter, department: 'subscriptions' });
  }, [filter]);

  // Top Plans by Subscribers
  const topPlans = useMemo(() => {
    const counts: Record<string, { count: number; volume: number; name: string }> = {};
    subscriptions.forEach(s => {
      const p = s.planName || 'باقة غير محددة';
      if (!counts[p]) {
        counts[p] = { count: 0, volume: 0, name: p };
      }
      counts[p].count += 1;
      counts[p].volume += (s.finalPrice || 0);
    });

    return Object.entries(counts)
      .map(([label, data]) => ({ label, value: data.count, volume: data.volume }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [subscriptions]);

  // Subscription Lifecycle Statuses Donut Chart
  const lifecycleStatuses = useMemo(() => {
    const active = subscriptions.filter(s => s.status === 'active').length;
    const expiring = subscriptions.filter(s => {
      if (s.status !== 'active' || !s.endDate) return false;
      const days = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / (1000 * 3600 * 24));
      return days >= 0 && days <= 7;
    }).length;
    const renewed = subscriptions.filter(s => s.status === 'renewed' || (s.renewalCount && s.renewalCount > 0)).length;
    const expired = subscriptions.filter(s => s.status === 'expired').length;
    const cancelled = subscriptions.filter(s => s.status === 'cancelled').length;

    return [
      { label: 'ساري ونشط', value: active, color: '#10b981' },
      { label: 'قريب الانتهاء (7 أيام)', value: expiring, color: '#f59e0b' },
      { label: 'مجدد بنجاح', value: renewed, color: '#ec4899' },
      { label: 'منتهي الصلاحية', value: expired, color: '#6b7280' },
      { label: 'ملغي ومسترد', value: cancelled, color: '#ef4444' }
    ];
  }, [subscriptions]);

  // Urgent Expiring Subscriptions (< 7 days)
  const urgentExpiring = useMemo(() => {
    return subscriptions
      .filter(s => {
        if (s.status !== 'active' || !s.endDate) return false;
        const days = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / (1000 * 3600 * 24));
        return days >= 0 && days <= 7;
      })
      .slice(0, 6);
  }, [subscriptions]);

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const renewedSubs = subscriptions.filter(s => s.status === 'renewed' || (s.renewalCount && s.renewalCount > 0));

  const handleDrillDown = (id: string, title: string, value: string | number) => {
    setDrillDownState({
      isOpen: true,
      kpiId: id,
      kpiTitle: title,
      kpiValue: value,
      kpiSubtitle: 'بيانات قسم الاشتراكات الرقمية'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* 1. Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-linear-to-r from-pink-500/10 via-rose-500/5 to-transparent p-4 rounded-3xl border border-pink-500/20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-pink-600 text-white shadow-lg shadow-pink-500/30">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>لوحة تحكم قسم الاشتراكات الرقمية (Subscriptions Executive Dashboard)</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-600 text-white">
                {subscriptions.length} اشتراك
              </span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              متابعة الباقات النشطة، التجديدات الدورية، تنبيهات الانتهاء، وإيصالات الدفع.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsSellModalOpen(true)}
            className="shadow-md shadow-pink-500/20 font-bold bg-pink-600 hover:bg-pink-700 text-white border-none"
          >
            ➕ بيع وتفعيل اشتراك
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Calendar className="w-4 h-4 text-pink-500" />}
            onClick={() => setIsSchedulerOpen(true)}
            className="border-pink-500/20 font-bold"
          >
            📅 جدولة التجديدات
          </Button>

          {onNavigateToTab && (
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowRight className="w-4 h-4 text-pink-500 rotate-180" />}
              onClick={() => onNavigateToTab('subscriptions_list')}
              className="font-bold text-pink-500"
            >
              📋 سجل الاشتراكات
            </Button>
          )}
        </div>
      </div>

      {/* Unified Filter Bar (Restricted to Department = Subscriptions) */}
      <UnifiedFinanceFilterBar
        filter={filter}
        onChange={f => setFilter({ ...f, department: 'subscriptions' })}
        showDepartmentFilter={false}
        showGameFilter={false}
        onReset={() => setFilter({
          datePreset: 'all',
          customStartDate: '',
          customEndDate: '',
          department: 'subscriptions',
          gameName: 'all',
          planId: 'all',
          personQuery: '',
          employeeId: 'all',
          transactionType: 'all'
        })}
      />

      {/* 4 Main KPI Cards with Drill-Down */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Subscriptions Revenue */}
        <div
          onClick={() => handleDrillDown('sub_revenue', 'إجمالي إيرادات الاشتراكات', formatCurrency(metrics.subscriptionsRevenue))}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-pink-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">إيرادات الاشتراكات</span>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-pink-500 font-mono">
            {formatCurrency(metrics.subscriptionsRevenue)}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span className="text-emerald-500 font-bold">أرباح: +{formatCurrency(metrics.subscriptionsProfit)}</span>
            <span>•</span>
            <span className="text-zinc-400">صافي عائد 25%</span>
          </div>
        </div>

        {/* Active Subscriptions Count */}
        <div
          onClick={() => handleDrillDown('sub_active_count', 'الاشتراكات السارية والنشطة', activeSubs.length)}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">الاشتراكات النشطة</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500 font-mono">
            {activeSubs.length} <span className="text-xs font-normal text-zinc-400">اشتراك ساري</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span className="text-emerald-500 font-bold">🟢 {Math.round((activeSubs.length / Math.max(subscriptions.length, 1)) * 100)}% نشط</span>
            <span>•</span>
            <span className="text-zinc-400">ساري المفعول</span>
          </div>
        </div>

        {/* Expiring Soon (< 7 Days) */}
        <div
          onClick={() => handleDrillDown('sub_expiring_count', 'الاشتراكات القريبة من الانتهاء', urgentExpiring.length)}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">تنتهي خلال 7 أيام</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <BellRing className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500 font-mono">
            {urgentExpiring.length} <span className="text-xs font-normal text-zinc-400">تنبيه عاجل</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span>تحتاج تواصل وتجديد</span>
            <span className="text-amber-500 font-bold font-mono">متابعة فورية</span>
          </div>
        </div>

        {/* Renewed Subscriptions */}
        <div
          onClick={() => handleDrillDown('sub_renewed_count', 'الاشتراكات المجددة دورياً', renewedSubs.length)}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-cyan-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">الاشتراكات المجددة</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {renewedSubs.length} <span className="text-xs font-normal text-zinc-400">اشتراك</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span>معدل ولاء مرتفع</span>
            <span className="text-cyan-400 font-bold font-mono">تجديد دوري</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Plans Bar Chart */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <MiniBarChart
            data={topPlans}
            title="📦 الباقات الأكثر مبيعاً ومشتركين"
            horizontal
            formatValue={v => `${v} مشترك`}
            accentColor="#ec4899"
          />
        </div>

        {/* Lifecycle Statuses Donut */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <MiniDonutChart
            segments={lifecycleStatuses}
            title="📊 دورة حياة الاشتراكات والتجديدات"
            size={120}
            thickness={24}
            centerValue={subscriptions.length}
            centerLabel="اشتراك"
          />
        </div>
      </div>

      {/* Urgent Renewal Alerts Roster */}
      {urgentExpiring.length > 0 && (
        <div className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-amber-500/30 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-500" />
              <span>اشتراكات تستحق التجديد والتنبيه الفوري</span>
            </h3>
            <span className="text-xs text-amber-500 font-bold">{urgentExpiring.length} اشتراك مهدد بالانتهاء</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {urgentExpiring.map(sub => (
              <div
                key={sub.id}
                className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{sub.customerName}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{sub.planName} • {sub.customerPhone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedSubForRenew(sub)}
                    className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-[10px] transition-colors"
                  >
                    🔄 تجديد
                  </button>
                  <button
                    onClick={() => setSelectedSubForReceipt(sub)}
                    className="p-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    title="معاينة الإيصال"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Department Grand Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 rounded-2xl bg-pink-500/5 border border-pink-500/20">
        <ProgressMetric label="إجمالي إيراد الاشتراكات" value={formatCurrency(metrics.subscriptionsRevenue)} percentage={100} color="#ec4899" subtitle="مبيعات الباقات" size="sm" />
        <ProgressMetric label="صافي أرباح الباقات" value={formatCurrency(metrics.subscriptionsProfit)} percentage={25} color="#10b981" subtitle="هامش الربح" size="sm" />
        <ProgressMetric label="تكلفة الباقات والتفعيل" value={formatCurrency(metrics.subscriptionsCost)} percentage={75} color="#3b82f6" subtitle="تكلفة المنتجات" size="sm" />
        <ProgressMetric label="عدد العمليات والتجديدات" value={`${metrics.subscriptionsTxCount || subscriptions.length}`} percentage={85} color="#8b5cf6" subtitle="حركات مسجلة" size="sm" />
      </div>

      {/* Modals */}
      {isSellModalOpen && (
        <SubscriptionsSellModal
          isOpen={isSellModalOpen}
          onClose={() => setIsSellModalOpen(false)}
          onSuccess={() => {
            setIsSellModalOpen(false);
            reloadData();
          }}
        />
      )}

      {isSchedulerOpen && (
        <SubscriptionSchedulerModal
          isOpen={isSchedulerOpen}
          onClose={() => setIsSchedulerOpen(false)}
        />
      )}

      {selectedSubForReceipt && (
        <SubscriptionReceiptModal
          isOpen={!!selectedSubForReceipt}
          onClose={() => setSelectedSubForReceipt(null)}
          subscription={selectedSubForReceipt}
        />
      )}

      {selectedSubForRenew && (
        <SubscriptionRenewModal
          isOpen={!!selectedSubForRenew}
          onClose={() => setSelectedSubForRenew(null)}
          subscription={selectedSubForRenew}
          onRenewSuccess={() => {
            setSelectedSubForRenew(null);
            reloadData();
          }}
        />
      )}

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
