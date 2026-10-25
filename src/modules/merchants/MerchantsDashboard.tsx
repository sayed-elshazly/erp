import React, { useState, useEffect, useMemo } from 'react';
import { Merchant, MerchantInvoice } from '../../types/merchant.types';
import { db } from '../../database/db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CardSkeleton } from '../../components/common/SkeletonLoader';
import {
  Store,
  Building2,
  TrendingUp,
  Wallet,
  DollarSign,
  Receipt,
  Award,
  Crown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Flame,
  Package,
  Plus,
  Users,
  ShieldCheck
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

interface MerchantsDashboardProps {
  onOpenNewMerchant: () => void;
  onOpenNewInvoice: () => void;
  onSelectMerchant: (merchant: Merchant) => void;
  onNavigateTab: (tab: string) => void;
}

export const MerchantsDashboard: React.FC<MerchantsDashboardProps> = ({
  onOpenNewMerchant,
  onOpenNewInvoice,
  onSelectMerchant,
  onNavigateTab
}) => {
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [invoices, setInvoices] = useState<MerchantInvoice[]>([]);

  const loadData = () => {
    setMerchants(db.getMerchants(false));
    setInvoices(db.getMerchantInvoices());
    setTimeout(() => setLoading(false), 150);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Aggregates
  const totalSuppliers = merchants.filter(m => m.type === 'supplier').length;
  const totalShops = merchants.filter(m => m.type === 'shop').length;
  const totalAgents = merchants.filter(m => m.type === 'agent' || m.type === 'partner').length;

  const totalPurchasesSum = merchants.reduce((sum, m) => sum + (m.totalPurchases || 0), 0);
  const totalSalesSum = merchants.reduce((sum, m) => sum + (m.totalSales || 0), 0);
  const totalProfitsSum = merchants.reduce((sum, m) => sum + (m.totalProfits || 0), 0);

  const totalReceivables = merchants.filter(m => m.balance > 0).reduce((sum, m) => sum + m.balance, 0);
  const totalPayables = merchants.filter(m => m.balance < 0).reduce((sum, m) => sum + Math.abs(m.balance), 0);

  const topTrader = useMemo(() => {
    return [...merchants].sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))[0];
  }, [merchants]);

  const topSupplier = useMemo(() => {
    return [...merchants.filter(m => m.type === 'supplier' || m.type === 'wholesaler')].sort(
      (a, b) => (b.totalPurchases || 0) - (a.totalPurchases || 0)
    )[0];
  }, [merchants]);

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-6 shadow-xs">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-blue-500" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-black text-zinc-900 dark:text-white">
                لوحة إدارة التجار والموردين والوكلاء
              </span>
              <span className="text-xs bg-orange-500 text-white font-bold px-2.5 py-0.5 rounded-full">
                {merchants.length} جهة تجارية معتمدة
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              متابعة مباشرة للمشتريات، المبيعات، الفواتير، ديون الموردين، والتحصيلات المتأخرة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onOpenNewMerchant}>
              تاجر / مورد جديد
            </Button>
            <Button variant="secondary" size="sm" icon={<Receipt className="w-4 h-4 text-orange-500" />} onClick={onOpenNewInvoice}>
              فاتورة تجارية
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Merchants */}
          <Card className="p-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">إجمالي الحسابات التجارية</span>
              <Store className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-blue-500">{merchants.length}</p>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              {totalSuppliers} موردين • {totalShops} محلات • {totalAgents} وكلاء
            </span>
          </Card>

          {/* Total Sales */}
          <Card className="p-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">إجمالي المبيعات للتجار</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-500 font-mono">{formatCurrency(totalSalesSum)}</p>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              صافي الأرباح: <strong className="text-orange-500">{formatCurrency(totalProfitsSum)}</strong>
            </span>
          </Card>

          {/* Total Purchases */}
          <Card className="p-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">إجمالي المشتريات من الموردين</span>
              <Package className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-purple-500 font-mono">{formatCurrency(totalPurchasesSum)}</p>
            <span className="text-[10px] text-zinc-400 mt-1 block">توريدات بطاقات وسيرفرات</span>
          </Card>

          {/* Receivables & Payables */}
          <Card className="p-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">الديون والمستحقات</span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-500 font-mono">{formatCurrency(totalReceivables)}</p>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              لنا: {formatCurrency(totalReceivables)} • علينا للموردين: <strong className="text-rose-500">{formatCurrency(totalPayables)}</strong>
            </span>
          </Card>
        </div>
      )}

      {/* High-Risk Merchants Alert Banner */}
      {merchants.some(m => (m.trustScore?.score || 100) < 60) && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-500 animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-bold block">
                تنبيه أمان ائتماني: تم رصد {merchants.filter(m => (m.trustScore?.score || 100) < 60).length} حسابات تجارية ذات درجة ثقة حرجة (Risky / Blocked)!
              </span>
              <span className="text-[11px] text-rose-400">
                يرجى مراجعة التراخيص، الديون المتأخرة، والحدود الائتمانية قبل إصدار أي فواتير آجلة جديدة.
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('list')}
            className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors shrink-0 text-[11px]"
          >
            عرض الحسابات الحرجة
          </button>
        </div>
      )}

      {/* Trust Score Distribution Overview Bar */}
      <Card className="p-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              توزيع مستويات الثقة والموثوقية للشبكة التجارية (Trust Distribution)
            </h4>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">15-Factor Automated Model</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block">Elite (95-100)</span>
            <span className="text-lg font-black font-mono text-purple-600 dark:text-purple-400">
              {merchants.filter(m => (m.trustScore?.score || 90) >= 95).length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">Gold (88-94)</span>
            <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              {merchants.filter(m => {
                const s = m.trustScore?.score || 90;
                return s >= 88 && s < 95;
              }).length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Trusted (75-87)</span>
            <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              {merchants.filter(m => {
                const s = m.trustScore?.score || 90;
                return s >= 75 && s < 88;
              }).length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block">Average (60-74)</span>
            <span className="text-lg font-black font-mono text-blue-600 dark:text-blue-400">
              {merchants.filter(m => {
                const s = m.trustScore?.score || 90;
                return s >= 60 && s < 75;
              }).length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold block">Risky (40-59)</span>
            <span className="text-lg font-black font-mono text-orange-600 dark:text-orange-400">
              {merchants.filter(m => {
                const s = m.trustScore?.score || 90;
                return s >= 40 && s < 60;
              }).length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">Blocked (&lt;40)</span>
            <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
              {merchants.filter(m => (m.trustScore?.score || 90) < 40).length}
            </span>
          </div>
        </div>
      </Card>

      {/* Top Performers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Trader */}
        {topTrader && (
          <Card
            onClick={() => onSelectMerchant(topTrader)}
            className="p-5 border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 cursor-pointer transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 font-bold text-xl">
                  👑
                </div>
                <div>
                  <Badge variant="orange" size="sm">أعلى تاجر نشاطاً ومبيعات (Top Trader)</Badge>
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mt-1">{topTrader.name}</h3>
                  <p className="text-xs text-zinc-500">{topTrader.companyName} • {topTrader.city}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-orange-500/20 text-center font-mono">
              <div>
                <span className="text-[10px] text-zinc-400 block">المبيعات:</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(topTrader.totalSales)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">الأرباح:</span>
                <span className="text-xs font-bold text-emerald-500">{formatCurrency(topTrader.totalProfits)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">التقييم:</span>
                <span className="text-xs font-bold text-amber-500">{topTrader.performance?.starRating} ⭐</span>
              </div>
            </div>
          </Card>
        )}

        {/* Top Supplier */}
        {topSupplier && (
          <Card
            onClick={() => onSelectMerchant(topSupplier)}
            className="p-5 border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 cursor-pointer transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500 font-bold text-xl">
                  💎
                </div>
                <div>
                  <Badge variant="info" size="sm">أكبر مورد رئيسي معتمد (Top Supplier)</Badge>
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 mt-1">{topSupplier.name}</h3>
                  <p className="text-xs text-zinc-500">{topSupplier.companyName} • {topSupplier.country}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-purple-500/20 text-center font-mono">
              <div>
                <span className="text-[10px] text-zinc-400 block">التوريدات:</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(topSupplier.totalPurchases)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">الرصيد/الالتزام:</span>
                <span className="text-xs font-bold text-rose-500">{formatCurrency(topSupplier.balance)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">السرعة:</span>
                <span className="text-xs font-bold text-emerald-500">{topSupplier.performance?.executionSpeedScore}%</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Recent Invoices Table */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-orange-500" />
            <span>آخر الفواتير التجارية الصادرة والواردة</span>
          </h3>
          <button
            onClick={() => onNavigateTab('invoices')}
            className="text-xs text-orange-500 hover:underline font-semibold"
          >
            عرض كافة الفواتير
          </button>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-[#27272A]">
          {recentInvoices.map(inv => (
            <div key={inv.id} className="p-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    inv.type === 'purchase'
                      ? 'bg-purple-500/10 text-purple-500'
                      : 'bg-emerald-500/10 text-emerald-500'
                  }`}
                >
                  {inv.type === 'purchase' ? 'شراء' : 'بيع'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono">{inv.invoiceNumber}</h4>
                  <p className="text-[11px] text-zinc-500">{inv.merchantName} • {formatDate(inv.issueDate)}</p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-xs font-black font-mono text-orange-500 block">{formatCurrency(inv.totalAmount)}</span>
                <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'warning'} size="sm">
                  {inv.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
