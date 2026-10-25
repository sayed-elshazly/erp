// =============================================================
// NZM JKR TOP UP ERP — Middleman Executive Dashboard (V2.0 Enhanced)
// Departmental Analytics, Segmentation, Charts & Drill-Down
// =============================================================

import React, { useState, useMemo } from 'react';
import { db } from '../../database/db';
import { MiddlemanDeal, GameAccountAsset, MiddlemanNotificationItem } from '../../types/middleman.types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { MiniBarChart } from '../../components/charts/MiniBarChart';
import { MiniDonutChart } from '../../components/charts/MiniDonutChart';
import { ProgressMetric } from '../../components/charts/ProgressMetric';
import { UnifiedFinanceFilterBar } from '../../components/common/UnifiedFinanceFilterBar';
import { KpiDrillDownModal } from '../dashboard/KpiDrillDownModal';
import { UnifiedFinanceFilter, FinanceMetrics } from '../../types/finance.types';
import { MiddlemanDealFormModal } from './MiddlemanDealFormModal';
import { MiddlemanAccountSellModal } from './MiddlemanAccountSellModal';
import { MiddlemanNotificationsModal } from './MiddlemanNotificationsModal';
import { MiddlemanDealDetailsModal } from './MiddlemanDealDetailsModal';
import { MiddlemanAccountFormModal } from './MiddlemanAccountFormModal';
import {
  ShieldCheck, Plus, ShoppingBag, Bell, TrendingUp,
  AlertTriangle, Clock, CheckCircle2, DollarSign,
  Users, Gamepad2, Layers, ArrowUpRight, ShieldAlert,
  Archive, ChevronLeft, Percent, Sparkles, Users2,
  Handshake, ArrowRight
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface MiddlemanDashboardProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const MiddlemanDashboard: React.FC<MiddlemanDashboardProps> = ({ onNavigateTab }) => {
  const [filter, setFilter] = useState<UnifiedFinanceFilter>({
    datePreset: 'all',
    customStartDate: '',
    customEndDate: '',
    department: 'brokerage' as any,
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

  const [deals, setDeals] = useState<MiddlemanDeal[]>(() => db.getMiddlemanDeals(true));
  const [accounts, setAccounts] = useState<GameAccountAsset[]>(() => db.getMiddlemanAccounts());
  const [notifications, setNotifications] = useState<MiddlemanNotificationItem[]>(() =>
    db.generateSmartMiddlemanNotifications()
  );

  // Modals
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [isSellAccountOpen, setIsSellAccountOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedDealForDetails, setSelectedDealForDetails] = useState<MiddlemanDeal | null>(null);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<GameAccountAsset | null>(null);

  const reloadData = () => {
    setDeals(db.getMiddlemanDeals(true));
    setAccounts(db.getMiddlemanAccounts());
    setNotifications(db.generateSmartMiddlemanNotifications());
  };

  const metrics = useMemo(() => {
    return db.getFinanceMetrics({ ...filter, department: 'brokerage' as any });
  }, [filter]);

  const transactions = useMemo(() => {
    return db.getUnifiedTransactions({ ...filter, department: 'brokerage' as any });
  }, [filter]);

  // Top Games Distribution
  const topGames = useMemo(() => {
    const counts: Record<string, { count: number; volume: number }> = {};
    deals.forEach(d => {
      const g = d.gameName || 'ألعاب أخرى';
      if (!counts[g]) counts[g] = { count: 0, volume: 0 };
      counts[g].count += 1;
      counts[g].volume += (d.dealAmountEGP || d.dealAmount || 0);
    });
    return Object.entries(counts)
      .map(([game, data]) => ({ label: game, value: data.count, volume: data.volume }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [deals]);

  // Deal Statuses Donut Chart
  const dealStatuses = useMemo(() => {
    const completed = deals.filter(d => d.status === 'completed').length;
    const inProgress = deals.filter(d => d.status === 'in_progress' || d.status === 'awaiting_transfer' || d.status === 'awaiting_seller' || d.status === 'awaiting_buyer').length;
    const disputed = deals.filter(d => d.status === 'dispute').length;
    const cancelled = deals.filter(d => d.status === 'canceled').length;

    return [
      { label: 'مكتملة ومسلمة', value: completed, color: '#10b981' },
      { label: 'قيد التنفيذ والضمان', value: inProgress, color: '#8b5cf6' },
      { label: 'نزاع وتدقيق', value: disputed, color: '#ef4444' },
      { label: 'ملغاة ومستردة', value: cancelled, color: '#6b7280' }
    ];
  }, [deals]);

  // Accounts Store Inventory
  const accountsInventory = useMemo(() => {
    const counts: Record<string, number> = {};
    accounts.forEach(a => {
      const g = a.gameName || 'حسابات عامة';
      counts[g] = (counts[g] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [accounts]);

  const completedDeals = deals.filter(d => d.status === 'completed');
  const inProgressDeals = deals.filter(d => d.status === 'in_progress' || d.status === 'awaiting_transfer' || d.status === 'awaiting_seller' || d.status === 'awaiting_buyer');
  const disputedDeals = deals.filter(d => d.status === 'dispute');
  const totalVolume = deals.reduce((s, d) => s + (d.dealAmountEGP || d.dealAmount || 0), 0);
  const soldAccounts = accounts.filter(a => a.status === 'sold' || (a.soldQuantity && a.soldQuantity > 0));
  const availableAccounts = accounts.filter(a => (a.availableQuantity === undefined || a.availableQuantity > 0) && a.status !== 'sold');

  const handleDrillDown = (id: string, title: string, value: string | number) => {
    setDrillDownState({
      isOpen: true,
      kpiId: id,
      kpiTitle: title,
      kpiValue: value,
      kpiSubtitle: 'بيانات قسم الوساطة والضمان'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-linear-to-r from-purple-500/10 via-indigo-500/5 to-transparent p-4 rounded-3xl border border-purple-500/20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500 text-white shadow-lg shadow-purple-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>لوحة تحكم قسم الوساطة والضمان ومخزن الحسابات</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500 text-white">
                {deals.length} صفقة
              </span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              ضمان العمليات، إدارة الحسابات الرقمية، فصل عمولة الشركة عن عمولة الوسطاء الخارجيين.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewDealOpen(true)}
            className="shadow-md shadow-purple-500/20 font-bold bg-purple-600 hover:bg-purple-700 text-white border-none"
          >
            ➕ إنشاء صفقة وساطة
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<ShoppingBag className="w-4 h-4 text-purple-400" />}
            onClick={() => setIsSellAccountOpen(true)}
            className="border-purple-500/20 font-bold"
          >
            🛒 بيع حساب من المخزن
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={<Bell className="w-4 h-4 text-amber-400" />}
            onClick={() => setIsNotificationsOpen(true)}
            className="relative font-bold"
          >
            التنبيهات
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Unified Filter Bar (Restricted to Department = Brokerage/Middleman) */}
      <UnifiedFinanceFilterBar
        filter={filter}
        onChange={f => setFilter({ ...f, department: 'brokerage' as any })}
        showDepartmentFilter={false}
        showPlanFilter={false}
        onReset={() => setFilter({
          datePreset: 'all',
          customStartDate: '',
          customEndDate: '',
          department: 'brokerage' as any,
          gameName: 'all',
          planId: 'all',
          personQuery: '',
          employeeId: 'all',
          transactionType: 'all'
        })}
      />

      {/* 4 Main KPI Cards with Drill-Down */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deals Volume */}
        <div
          onClick={() => handleDrillDown('mid_deals_volume', 'إجمالي حجم تداول الوساطة', formatCurrency(totalVolume))}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-purple-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">حجم تداول الوساطة</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-400 font-mono">
            {formatCurrency(totalVolume)}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span className="text-emerald-500 font-bold">🟢 {completedDeals.length} مكتملة</span>
            <span>•</span>
            <span className="text-purple-400 font-bold">⚡ {inProgressDeals.length} قيد التنفيذ</span>
          </div>
        </div>

        {/* Company Net Commission */}
        <div
          onClick={() => handleDrillDown('mid_company_comm', 'عمولة الشركة الصافية', formatCurrency(metrics.middlemanCompanyCommission || metrics.middlemanProfit))}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">عمولة الشركة الصافية</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500 font-mono">
            +{formatCurrency(metrics.middlemanCompanyCommission || metrics.middlemanProfit)}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span className="text-emerald-500 font-bold">أرباح محققة بالكامل</span>
            <span>•</span>
            <span className="text-zinc-400">صندوق الوساطة</span>
          </div>
        </div>

        {/* External Middleman Commissions (Separated) */}
        <div
          onClick={() => handleDrillDown('mid_ext_comm', 'عمولات الوسطاء الخارجيين', formatCurrency(metrics.middlemanExternalCommission || 0))}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">عمولات الوسطاء الخارجيين</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Users2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500 font-mono">
            {formatCurrency(metrics.middlemanExternalCommission || 0)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span>مستقلة ومفصولة عن أرباح الشركة</span>
            <span className="text-amber-500 font-bold font-mono">طرف ثالث</span>
          </div>
        </div>

        {/* Account Store Inventory Status */}
        <div
          onClick={() => onNavigateTab?.('middleman_accounts')}
          className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs relative overflow-hidden group hover:border-cyan-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500">مخزون الحسابات والأصول</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Archive className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {availableAccounts.length} <span className="text-xs font-normal text-zinc-400">حساب متاح</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#222228] text-[11px] text-zinc-500">
            <span>{soldAccounts.length} تم بيعه</span>
            <span className="text-cyan-400 font-bold font-mono">أرباح: +{formatCurrency(metrics.totalAccountsProfit || 0)}</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Deals by Game Bar Chart */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <MiniBarChart
            data={topGames}
            title="🎮 صفقات الوساطة حسب اللعبة"
            horizontal
            formatValue={v => `${v} صفقة`}
            accentColor="#8b5cf6"
          />
        </div>

        {/* Account Assets by Game */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <MiniBarChart
            data={accountsInventory}
            title="🏷️ مخزون الحسابات حسب اللعبة"
            horizontal
            formatValue={v => `${v} حساب`}
            accentColor="#06b6d4"
          />
        </div>

        {/* Deal Status Breakdown Donut */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
          <MiniDonutChart
            segments={dealStatuses}
            title="⚖️ حالات صفقات الضمان"
            size={115}
            thickness={22}
            centerValue={deals.length}
            centerLabel="صفقة"
          />
        </div>
      </div>

      {/* Quick Nav Sub-tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => onNavigateTab?.('middleman_deals')}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-purple-500 cursor-pointer transition-all space-y-1 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">سجل الصفقات</span>
            <Handshake className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-400 font-mono">{deals.length}</div>
          <span className="text-[10px] text-zinc-400 block">{completedDeals.length} مكتملة</span>
        </div>

        <div
          onClick={() => onNavigateTab?.('middleman_accounts')}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-cyan-500 cursor-pointer transition-all space-y-1 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">مخزن الحسابات</span>
            <Archive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-400 font-mono">{accounts.length}</div>
          <span className="text-[10px] text-zinc-400 block">{availableAccounts.length} متاح للبيع</span>
        </div>

        <div
          onClick={() => onNavigateTab?.('middleman_clients')}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-emerald-500 cursor-pointer transition-all space-y-1 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">عملاء الوساطة</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-500 font-mono">{new Set(deals.flatMap(d => [d.sellerPhone, d.buyerPhone].filter(Boolean))).size}</div>
          <span className="text-[10px] text-zinc-400 block">بائعون ومشترون</span>
        </div>

        <div
          onClick={() => onNavigateTab?.('middleman_reports')}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-amber-500 cursor-pointer transition-all space-y-1 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">تقارير الوساطة</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-500 font-mono">100%</div>
          <span className="text-[10px] text-zinc-400 block">مطابقة الحسابات</span>
        </div>
      </div>

      {/* Department Grand Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20">
        <ProgressMetric label="إجمالي حجم التداول" value={formatCurrency(totalVolume)} percentage={100} color="#8b5cf6" subtitle="صفقات الوساطة" size="sm" />
        <ProgressMetric label="عمولة الشركة الصافية" value={formatCurrency(metrics.middlemanCompanyCommission || metrics.middlemanProfit)} percentage={100} color="#10b981" subtitle="دخل الوساطة" size="sm" />
        <ProgressMetric label="عمولات الوسطاء الخارجيين" value={formatCurrency(metrics.middlemanExternalCommission || 0)} percentage={20} color="#f59e0b" subtitle="طرف ثالث مستقل" size="sm" />
        <ProgressMetric label="أرباح بيع الحسابات" value={formatCurrency(metrics.totalAccountsProfit || 0)} percentage={100} color="#06b6d4" subtitle="مخزن الأصول" size="sm" />
      </div>

      {/* Modals */}
      {isNewDealOpen && (
        <MiddlemanDealFormModal
          isOpen={isNewDealOpen}
          onClose={() => setIsNewDealOpen(false)}
          onSuccess={() => {
            setIsNewDealOpen(false);
            reloadData();
          }}
        />
      )}

      {isSellAccountOpen && (
        <MiddlemanAccountSellModal
          isOpen={isSellAccountOpen}
          onClose={() => setIsSellAccountOpen(false)}
          onSoldSuccess={() => {
            setIsSellAccountOpen(false);
            reloadData();
          }}
        />
      )}

      {isNotificationsOpen && (
        <MiddlemanNotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          onSelectTarget={(type, id) => {
            setIsNotificationsOpen(false);
            onNavigateTab?.(type === 'deal' ? 'middleman_deals' : type === 'account' ? 'middleman_accounts' : 'middleman_clients');
          }}
        />
      )}

      {selectedDealForDetails && (
        <MiddlemanDealDetailsModal
          isOpen={!!selectedDealForDetails}
          onClose={() => setSelectedDealForDetails(null)}
          deal={selectedDealForDetails}
          onDealUpdated={() => {
            setSelectedDealForDetails(null);
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
