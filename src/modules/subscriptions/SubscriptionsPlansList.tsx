// =============================================================
// NZM JKR TOP UP ERP — Subscriptions Plans Management List
// =============================================================

import React, { useState, useMemo } from 'react';
import { SubscriptionPlan } from '../../types/subscription.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { SubscriptionPlanFormModal } from './SubscriptionPlanFormModal';
import { SubscriptionsSellModal } from './SubscriptionsSellModal';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  Tv,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Clock,
  DollarSign,
  Grid,
  List,
  AlertCircle,
  RotateCcw,
  Archive,
  ArrowUpDown,
  X,
  TrendingUp,
  Tag,
  ShieldAlert
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const SubscriptionsPlansList: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => db.getSubscriptionPlans());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price_desc' | 'price_asc' | 'profit_desc' | 'subscribers_desc'>('default');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<SubscriptionPlan | null>(null);
  const [selectedPlanForSell, setSelectedPlanForSell] = useState<SubscriptionPlan | null>(null);

  const reloadData = () => {
    setPlans(db.getSubscriptionPlans());
  };

  // KPI Metrics
  const kpis = useMemo(() => {
    const total = plans.length;
    const active = plans.filter(p => p.status === 'active').length;
    const inactive = plans.filter(p => p.status === 'inactive').length;
    const avgProfitPercent = total > 0
      ? Math.round(plans.reduce((sum, p) => sum + (p.price > 0 ? ((p.price - p.costPrice) / p.price) * 100 : 0), 0) / total)
      : 0;

    return { total, active, inactive, avgProfitPercent };
  }, [plans]);

  // Categories with counts
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    plans.forEach(p => {
      if (p.category) {
        map[p.category] = (map[p.category] || 0) + 1;
      }
    });
    return map;
  }, [plans]);

  // Filtered & Sorted Plans
  const filteredPlans = useMemo(() => {
    return plans
      .filter(p => {
        // Status Tab
        if (statusTab === 'active' && p.status !== 'active') return false;
        if (statusTab === 'inactive' && p.status !== 'inactive') return false;

        // Category Filter
        if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;

        // Duration Filter
        if (durationFilter !== 'all') {
          if (durationFilter === 'days' && p.durationUnit !== 'days') return false;
          if (durationFilter === 'months' && p.durationUnit !== 'months') return false;
          if (durationFilter === 'years' && p.durationUnit !== 'years') return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          const matchDesc = p.description?.toLowerCase().includes(q);
          const matchFeat = (p.features || []).some(f => f.toLowerCase().includes(q));
          if (!matchName && !matchCat && !matchDesc && !matchFeat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'profit_desc') {
          const profitA = a.price - a.costPrice;
          const profitB = b.price - b.costPrice;
          return profitB - profitA;
        }
        if (sortBy === 'subscribers_desc') {
          return (b.totalSubscribersCount || 0) - (a.totalSubscribersCount || 0);
        }
        return 0;
      });
  }, [plans, statusTab, categoryFilter, durationFilter, searchQuery, sortBy]);

  const handleToggleStatus = (p: SubscriptionPlan) => {
    db.toggleSubscriptionPlanStatus(p.id, {
      id: user?.id,
      name: user?.fullName || 'المدير العام',
      role: user?.role
    });
    showToast('info', 'تم تحديث الحالة', `تم ${p.status === 'active' ? 'تعطيل وأرشفة' : 'تفعيل'} باقة "${p.name}"`);
    reloadData();
  };

  const handleDeletePlan = (p: SubscriptionPlan) => {
    if (!window.confirm(`هل أنت متأكد من حذف باقة "${p.name}" نهائياً من النظام؟`)) return;

    db.deleteSubscriptionPlan(p.id, {
      id: user?.id,
      name: user?.fullName || 'المدير العام',
      role: user?.role
    });
    showToast('success', 'تم الحذف', `تم حذف باقة "${p.name}" بنجاح`);
    reloadData();
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs" dir="rtl">
      {/* 1. Header & KPI Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Plans */}
        <Card
          onClick={() => setStatusTab('all')}
          className={`p-3.5 bg-white dark:bg-[#18181B] border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
            statusTab === 'all'
              ? 'border-pink-500 ring-1 ring-pink-500/30 bg-pink-50/10'
              : 'border-gray-200 dark:border-[#27272A] hover:border-gray-300'
          }`}
        >
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">إجمالي الباقات المسجلة</span>
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
              {kpis.total}
            </span>
            <div className="text-[10px] text-zinc-400 mt-0.5">شاملة كافة الأصناف</div>
          </div>
          <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20">
            <Layers className="w-5 h-5" />
          </div>
        </Card>

        {/* Active Plans */}
        <Card
          onClick={() => setStatusTab('active')}
          className={`p-3.5 bg-white dark:bg-[#18181B] border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
            statusTab === 'active'
              ? 'border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-50/10'
              : 'border-gray-200 dark:border-[#27272A] hover:border-gray-300'
          }`}
        >
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">باقات نشطة ومتاحة للبيع</span>
            <span className="text-2xl font-black text-emerald-500 font-mono">
              {kpis.active}
            </span>
            <div className="text-[10px] text-emerald-500 font-bold mt-0.5">جاهزة للبيع المباشر</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        {/* Inactive / Expired Plans */}
        <Card
          onClick={() => setStatusTab('inactive')}
          className={`p-3.5 bg-white dark:bg-[#18181B] border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
            statusTab === 'inactive'
              ? 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-50/10'
              : 'border-gray-200 dark:border-[#27272A] hover:border-gray-300'
          }`}
        >
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">باقات معطلة ومنتهية</span>
            <span className="text-2xl font-black text-amber-500 font-mono">
              {kpis.inactive}
            </span>
            <div className="text-[10px] text-amber-500 font-bold mt-0.5">متوقفة ومؤرشفة مؤقتاً</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Archive className="w-5 h-5" />
          </div>
        </Card>

        {/* Avg Profit Margin */}
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">متوسط هامش الربحية</span>
            <span className="text-2xl font-black text-purple-500 font-mono">
              %{kpis.avgProfitPercent}
            </span>
            <div className="text-[10px] text-purple-500 font-bold mt-0.5">فارق سعر البيع والتكلفة</div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* 2. Status Section Switcher & Search & Filter Bar */}
      <div className="space-y-2.5">
        {/* Top Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-[#27272A] pb-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                statusTab === 'all'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>كافة الباقات ({kpis.total})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('active')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                statusTab === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>الباقات النشطة ({kpis.active})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('inactive')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                statusTab === 'inactive'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-500'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>قسم الباقات المنتهية والمعطلة ({kpis.inactive})</span>
            </button>
          </div>

          {/* Add Plan Primary Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedPlanForEdit(null);
              setIsPlanFormOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة باقة جديدة</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-[#121215] p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-full sm:max-w-xs md:max-w-sm">
            <input
              type="text"
              placeholder="بحث باسم الباقة، التصنيف، أو المميزات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl py-2 pr-9 pl-8 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 transition-all font-sans"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-zinc-400 hover:text-zinc-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500 max-w-[150px] truncate cursor-pointer"
              >
                <option value="all">كافة التصنيفات ({Object.keys(categoryStats).length})</option>
                {Object.entries(categoryStats).map(([cat, count]) => (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                ))}
              </select>
            </div>

            {/* Duration Filter */}
            <div className="relative">
              <select
                value={durationFilter}
                onChange={e => setDurationFilter(e.target.value)}
                className="bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500 max-w-[125px] truncate cursor-pointer"
              >
                <option value="all">كافة المدد</option>
                <option value="months">اشتراك شهري</option>
                <option value="years">اشتراك سنوي</option>
                <option value="days">أيام محددة</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500 max-w-[135px] truncate cursor-pointer"
              >
                <option value="default">الترتيب: الافتراضي</option>
                <option value="price_desc">الأعلى سعراً</option>
                <option value="price_asc">الأقل سعراً</option>
                <option value="profit_desc">الأعلى ربحاً</option>
                <option value="subscribers_desc">الأكثر مشتركين</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(categoryFilter !== 'all' || durationFilter !== 'all' || sortBy !== 'default' || searchQuery || statusTab !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all');
                  setDurationFilter('all');
                  setSortBy('default');
                  setSearchQuery('');
                  setStatusTab('all');
                }}
                className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-bold text-xs transition-colors cursor-pointer"
                title="إعادة تعيين كافة الفلاتر"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="h-6 w-px bg-gray-200 dark:bg-[#27272A] hidden sm:block mx-0.5" />

            {/* Grid / Table Toggle */}
            <div className="flex items-center rounded-xl bg-gray-100 dark:bg-zinc-800 p-0.5 border border-gray-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-700 text-pink-500 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
                title="عرض كروت"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-700 text-pink-500 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
                title="عرض جدول"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Inactive/Expired Plans Alert Notice Banner if in Inactive view */}
      {statusTab === 'inactive' && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <div className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                قسم الباقات المعطلة والمنتهية (أرشيف الباقات)
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                هذه الباقات متوقفة ومؤرشفة ولا تظهر للمشتركين الجدد في نافذة البيع، ولكن يحتفظ المشتركون الحاليون بخدماتهم حتى تاريخ انتهائها. يمكنك إعادة تفعيل أي باقة بضغطة واحدة.
              </div>
            </div>
          </div>
          <Badge variant="warning" size="sm">
            {filteredPlans.length} باقة معطلة
          </Badge>
        </div>
      )}

      {/* 4. Plans Display (Grid or Table) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-400 space-y-2 bg-white dark:bg-[#18181B] rounded-2xl border border-dashed border-gray-200 dark:border-[#27272A]">
              <Layers className="w-8 h-8 text-pink-500/50 mx-auto" />
              <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                {statusTab === 'inactive' ? 'لا توجد أي باقات منتهية أو معطلة حالياً' : 'لا توجد باقات مطابقة لخيارات الفلترة الحالية'}
              </p>
              <p className="text-[11px] text-zinc-400">جرّب تغيير خيارات البحث أو إعادة تعيين الفلاتر</p>
            </div>
          ) : (
            filteredPlans.map(plan => {
              const profitMargin = plan.price > 0 ? Math.round(((plan.price - plan.costPrice) / plan.price) * 100) : 0;
              const isInactive = plan.status === 'inactive';

              return (
                <Card
                  key={plan.id}
                  className={`p-4 bg-white dark:bg-[#18181B] border transition-all hover:shadow-md flex flex-col justify-between relative overflow-hidden ${
                    !isInactive
                      ? 'border-gray-200 dark:border-[#27272A]'
                      : 'border-dashed border-amber-300 dark:border-amber-900/50 bg-amber-50/5 dark:bg-amber-950/10 opacity-80'
                  }`}
                >
                  {isInactive && (
                    <div className="absolute -left-12 top-4 -rotate-45 bg-amber-500 text-black font-black text-[9px] py-0.5 px-12 text-center shadow-xs">
                      منتهية / معطلة
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Card Header: Category & Badge & Status */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] ${
                        !isInactive
                          ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
                          : 'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {plan.category}
                      </span>

                      <div className="flex items-center gap-1">
                        {plan.badge && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
                            {plan.badge}
                          </span>
                        )}
                        <Badge variant={!isInactive ? 'success' : 'danger'} size="sm">
                          {!isInactive ? 'مفعلة ونشطة' : 'منتهية / معطلة'}
                        </Badge>
                      </div>
                    </div>

                    {/* Plan Title & Price */}
                    <div>
                      <h3 className={`font-black text-sm line-clamp-2 leading-relaxed ${
                        !isInactive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'
                      }`}>
                        {plan.name}
                      </h3>
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1">
                        {plan.description || 'باقة رقمية متكاملة تدعم كافة الأجهزة'}
                      </p>
                    </div>

                    {/* Pricing Box */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${
                      !isInactive
                        ? 'bg-gray-50 dark:bg-zinc-800/60 border-gray-100 dark:border-zinc-700/60'
                        : 'bg-zinc-100/50 dark:bg-zinc-800/20 border-zinc-200 dark:border-zinc-800'
                    }`}>
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-bold">سعر الاشتراك</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-base font-black font-mono ${
                            !isInactive ? 'text-pink-600 dark:text-pink-400' : 'text-zinc-500'
                          }`}>
                            {formatCurrency(plan.price)}
                          </span>
                          {plan.originalPrice && plan.originalPrice > plan.price && (
                            <span className="text-[11px] text-zinc-400 line-through font-mono">
                              {formatCurrency(plan.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left font-mono">
                        <span className="text-[10px] text-zinc-400 block">المدة</span>
                        <strong className="text-xs text-zinc-900 dark:text-zinc-100 font-bold">
                          {plan.durationValue} {plan.durationUnit === 'months' ? 'شهور' : plan.durationUnit === 'days' ? 'أيام' : 'سنة'}
                        </strong>
                      </div>
                    </div>

                    {/* Financial Stats Bar (Cost, Profit, Margin) */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-gray-50/70 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800">
                      <div>
                        <span className="text-zinc-400 block">التكلفة:</span>
                        <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          {formatCurrency(plan.costPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block">هامش الربح:</span>
                        <span className="font-mono font-bold text-emerald-500">
                          +{formatCurrency(plan.price - plan.costPrice)} ({profitMargin}%)
                        </span>
                      </div>
                    </div>

                    {/* Features Snippet */}
                    <div className="space-y-1 pt-1">
                      {plan.features.slice(0, 3).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${!isInactive ? 'text-emerald-500' : 'text-zinc-400'}`} />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer: Quick Actions */}
                  <div className="pt-3 mt-3 border-t border-gray-100 dark:border-[#27272A] flex items-center justify-between gap-1.5">
                    {/* Sell Button */}
                    {!isInactive ? (
                      <button
                        type="button"
                        onClick={() => setSelectedPlanForSell(plan)}
                        className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer bg-pink-600 hover:bg-pink-700 text-white shadow-xs active:scale-95"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>بيع لمشترك</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(plan)}
                        className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95"
                        title="إعادة تفعيل الباقة للبيع"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>إعادة تفعيل</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      {/* Toggle Status */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(plan)}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          !isInactive
                            ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                        }`}
                        title={!isInactive ? 'تعطيل وأرشفة الباقة' : 'إعادة تفعيل الباقة'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlanForEdit(plan);
                          setIsPlanFormOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-pink-500 transition-all cursor-pointer"
                        title="تعديل الباقة"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all cursor-pointer"
                        title="حذف الباقة نهائياً"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* Table View */
        <Card className="p-0 bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                  <th className="py-3 px-3.5">اسم الباقة والتصنيف</th>
                  <th className="py-3 px-3.5 text-center">المدة</th>
                  <th className="py-3 px-3.5 text-center">سعر البيع</th>
                  <th className="py-3 px-3.5 text-center">التكلفة والربح</th>
                  <th className="py-3 px-3.5 text-center">المشتركين</th>
                  <th className="py-3 px-3.5 text-center">الحالة</th>
                  <th className="py-3 px-3.5 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      لا توجد باقات مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map(plan => (
                    <tr
                      key={plan.id}
                      className={`transition-colors ${
                        plan.status === 'active'
                          ? 'hover:bg-gray-50/70 dark:hover:bg-zinc-800/40'
                          : 'bg-amber-50/5 hover:bg-amber-50/10 dark:hover:bg-amber-950/20 opacity-75'
                      }`}
                    >
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <span>{plan.name}</span>
                          {plan.status === 'inactive' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                              معطلة
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-pink-500 font-bold">{plan.category}</div>
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-bold">
                        {plan.durationValue} {plan.durationUnit === 'months' ? 'شهر' : plan.durationUnit === 'years' ? 'سنة' : 'يوم'}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-black text-pink-600 dark:text-pink-400 text-xs">
                        {formatCurrency(plan.price)}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono text-[11px]">
                        <span className="text-zinc-400">تكلفة: {formatCurrency(plan.costPrice)}</span>
                        <span className="text-emerald-500 font-bold block">ربح: +{formatCurrency(plan.price - plan.costPrice)}</span>
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {plan.totalSubscribersCount || 0}
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        <Badge variant={plan.status === 'active' ? 'success' : 'danger'} size="sm">
                          {plan.status === 'active' ? 'مفعلة' : 'معطلة / منتهية'}
                        </Badge>
                      </td>

                      <td className="py-3 px-3.5 text-left">
                        <div className="flex items-center justify-end gap-1">
                          {plan.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => setSelectedPlanForSell(plan)}
                              className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <ShoppingBag className="w-3 h-3" /> بيع
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(plan)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                              title="إعادة تفعيل"
                            >
                              <RotateCcw className="w-3 h-3" /> تفعيل
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlanForEdit(plan);
                              setIsPlanFormOpen(true);
                            }}
                            className="p-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-pink-500 cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlan(plan)}
                            className="p-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modals */}
      {isPlanFormOpen && (
        <SubscriptionPlanFormModal
          isOpen={isPlanFormOpen}
          onClose={() => {
            setIsPlanFormOpen(false);
            setSelectedPlanForEdit(null);
          }}
          planToEdit={selectedPlanForEdit}
          onSuccess={() => {
            reloadData();
            setIsPlanFormOpen(false);
          }}
        />
      )}

      {selectedPlanForSell && (
        <SubscriptionsSellModal
          isOpen={Boolean(selectedPlanForSell)}
          onClose={() => setSelectedPlanForSell(null)}
          initialPlan={selectedPlanForSell}
          onSuccess={() => {
            reloadData();
            setSelectedPlanForSell(null);
          }}
        />
      )}
    </div>
  );
};
