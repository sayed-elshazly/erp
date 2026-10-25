import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { formatCurrency } from '../../../utils/formatters';
import {
  Calendar,
  CalendarDays,
  Filter,
  RotateCcw,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Receipt,
  Coins,
  Scale,
  User,
  Check,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { SafeTransaction } from '../../../types/finance.types';

export type CalendarPreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export interface FinancialFilterState {
  dateFrom: string;
  dateTo: string;
  preset: CalendarPreset;
  currency: 'all' | 'EGP' | 'USD';
  txType: 'all' | 'cash_in' | 'cash_out' | 'transfer' | 'shift_settlement' | 'expense' | 'profit';
  employee: string;
  source: string;
  destination: string;
  searchQuery: string;
}

export interface FinancialPeriodMetrics {
  totalInflowsEGP: number;
  totalInflowsUSD: number;
  totalOutflowsEGP: number;
  totalOutflowsUSD: number;
  totalTransfersEGP: number;
  totalTransfersUSD: number;
  totalProfitsEGP: number;
  totalExpensesEGP: number;
  netEGP: number;
  netUSD: number;
  transactionCount: number;
}

interface FinancialCalendarFilterProps {
  filterState: FinancialFilterState;
  onFilterChange: (newState: FinancialFilterState) => void;
  metrics: FinancialPeriodMetrics;
  availableEmployees: string[];
  onReset: () => void;
  onApply: () => void;
  isApplied: boolean;
}

// Helpers for date calculations
const toDateInputString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getPresetDateRange = (preset: CalendarPreset): { from: string; to: string } => {
  const today = new Date();
  const from = new Date();
  const to = new Date();

  switch (preset) {
    case 'today':
      return { from: toDateInputString(today), to: toDateInputString(today) };
    case 'yesterday': {
      from.setDate(today.getDate() - 1);
      to.setDate(today.getDate() - 1);
      return { from: toDateInputString(from), to: toDateInputString(to) };
    }
    case 'last_7_days': {
      from.setDate(today.getDate() - 6);
      return { from: toDateInputString(from), to: toDateInputString(today) };
    }
    case 'last_30_days': {
      from.setDate(today.getDate() - 29);
      return { from: toDateInputString(from), to: toDateInputString(today) };
    }
    case 'this_week': {
      // In Arab region, week starts on Saturday (day 6)
      const day = today.getDay(); // 0: Sun, 6: Sat
      const diff = (day + 1) % 7;
      from.setDate(today.getDate() - diff);
      return { from: toDateInputString(from), to: toDateInputString(today) };
    }
    case 'last_week': {
      const day = today.getDay();
      const diff = (day + 1) % 7;
      to.setDate(today.getDate() - diff - 1);
      from.setDate(to.getDate() - 6);
      return { from: toDateInputString(from), to: toDateInputString(to) };
    }
    case 'this_month': {
      from.setDate(1);
      return { from: toDateInputString(from), to: toDateInputString(today) };
    }
    case 'last_month': {
      from.setMonth(today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toDateInputString(from), to: toDateInputString(lastDay) };
    }
    case 'this_quarter': {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      from.setMonth(quarterStartMonth, 1);
      return { from: toDateInputString(from), to: toDateInputString(today) };
    }
    case 'this_year': {
      from.setMonth(0, 1);
      return { from: toDateInputString(from), to: toDateInputString(today) };
    }
    case 'custom':
    default:
      return { from: '', to: '' };
  }
};

export const FinancialCalendarFilter: React.FC<FinancialCalendarFilterProps> = ({
  filterState,
  onFilterChange,
  metrics,
  availableEmployees,
  onReset,
  onApply,
  isApplied
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Quick Preset definitions with Arabic labels
  const presets: { id: CalendarPreset; label: string }[] = [
    { id: 'today', label: 'اليوم' },
    { id: 'yesterday', label: 'أمس' },
    { id: 'last_7_days', label: 'آخر 7 أيام' },
    { id: 'last_30_days', label: 'آخر 30 يوم' },
    { id: 'this_week', label: 'هذا الأسبوع' },
    { id: 'last_week', label: 'الأسبوع السابق' },
    { id: 'this_month', label: 'هذا الشهر' },
    { id: 'last_month', label: 'الشهر السابق' },
    { id: 'this_quarter', label: 'هذا الربع' },
    { id: 'this_year', label: 'هذا العام' },
    { id: 'custom', label: 'مخصص' }
  ];

  // Handle Preset Click
  const handleSelectPreset = (preset: CalendarPreset) => {
    if (preset === 'custom') {
      onFilterChange({
        ...filterState,
        preset: 'custom'
      });
      return;
    }

    const { from, to } = getPresetDateRange(preset);
    onFilterChange({
      ...filterState,
      preset,
      dateFrom: from,
      dateTo: to
    });
  };

  // Handle manual date changes
  const handleFromDateChange = (newFrom: string) => {
    onFilterChange({
      ...filterState,
      dateFrom: newFrom,
      preset: 'custom'
    });
  };

  const handleToDateChange = (newTo: string) => {
    onFilterChange({
      ...filterState,
      dateTo: newTo,
      preset: 'custom'
    });
  };

  return (
    <Card className="p-4 sm:p-5 border border-purple-500/20 bg-gradient-to-b from-purple-500/5 via-zinc-900/40 to-transparent shadow-lg space-y-4">
      {/* ========================================================= */}
      {/* 1. Header & Title Bar */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center font-black shadow-xs shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">
                📅 فلتر التقويم المالي الذكي للخزائن والمحافظ
              </h3>
              {isApplied && (
                <Badge variant="success" size="sm" className="font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  الفلتر نشط
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              تحديد الفترة بدقة واحتساب الإيرادات والمصروفات والتحويلات والأرباح لحظياً
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/60 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
            <span>فلاتر إضافية</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-red-500"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            إعادة ضبط
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onApply}
            className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/20"
          >
            <Check className="w-3.5 h-3.5" />
            تطبيق الفلتر
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Quick Preset Buttons Carousel / Wrap */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-bold text-zinc-400 ml-1 flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
          فترات سريعة:
        </span>
        {presets.map(p => {
          const isActive = filterState.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer border ${
                isActive
                  ? 'bg-purple-600 text-white border-purple-500 shadow-xs shadow-purple-500/30'
                  : 'bg-white/60 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 3. Range Inputs: Manual Typing + Native Calendar Picker */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white/40 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <label className="text-[11px] font-bold text-zinc-400 mb-1 flex items-center gap-1">
            <span>📅 من تاريخ:</span>
            <span className="text-[10px] text-zinc-500">(اكتب يدويًا أو اختر)</span>
          </label>
          <input
            type="date"
            value={filterState.dateFrom}
            onChange={(e) => handleFromDateChange(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
            placeholder="YYYY-MM-DD"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-zinc-400 mb-1 flex items-center gap-1">
            <span>📅 إلى تاريخ:</span>
            <span className="text-[10px] text-zinc-500">(اكتب يدويًا أو اختر)</span>
          </label>
          <input
            type="date"
            value={filterState.dateTo}
            onChange={(e) => handleToDateChange(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
            placeholder="YYYY-MM-DD"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-zinc-400 mb-1 block">
            🪙 العملة:
          </label>
          <select
            value={filterState.currency}
            onChange={(e) => onFilterChange({ ...filterState, currency: e.target.value as any })}
            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
          >
            <option value="all">كل العملات (EGP + USD)</option>
            <option value="EGP">الجنيه المصري (EGP)</option>
            <option value="USD">الدولار الرقمي (USDT / USD)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-zinc-400 mb-1 block">
            🔍 بحث برقم الإيصال / الملاحظات:
          </label>
          <div className="relative">
            <input
              type="text"
              value={filterState.searchQuery}
              onChange={(e) => onFilterChange({ ...filterState, searchQuery: e.target.value })}
              placeholder="ابحث برقم مرجعي، عملية..."
              className="w-full pr-8 pl-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. Advanced Secondary Filters (Collapsible / Expandable)  */}
      {/* ========================================================= */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 animate-in fade-in duration-200">
          <div>
            <label className="text-[11px] font-bold text-zinc-400 mb-1 block">
              🏷️ نوع الحركة:
            </label>
            <select
              value={filterState.txType}
              onChange={(e) => onFilterChange({ ...filterState, txType: e.target.value as any })}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
            >
              <option value="all">كل أنواع الحركات</option>
              <option value="cash_in">إيداع / وارد للخزينة (Cash In)</option>
              <option value="cash_out">سحب / صادر من الخزينة (Cash Out)</option>
              <option value="transfer">تحويل بين الخزائن والمحافظ (Transfer)</option>
              <option value="shift_settlement">تصفية وردية (Shift Settlement)</option>
              <option value="expense">مصروفات وتشغيل (Expenses)</option>
              <option value="profit">أرباح ومبيعات (Profits)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-400 mb-1 block">
              👤 الموظف / المسؤول:
            </label>
            <select
              value={filterState.employee}
              onChange={(e) => onFilterChange({ ...filterState, employee: e.target.value })}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
            >
              <option value="">جميع الموظفين</option>
              {availableEmployees.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-400 mb-1 block">
              📤 المصدر (Source):
            </label>
            <input
              type="text"
              value={filterState.source}
              onChange={(e) => onFilterChange({ ...filterState, source: e.target.value })}
              placeholder="مثال: محفظة فودافون، تذكرة..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-400 mb-1 block">
              📥 الوجهة (Destination):
            </label>
            <input
              type="text"
              value={filterState.destination}
              onChange={(e) => onFilterChange({ ...filterState, destination: e.target.value })}
              placeholder="مثال: الخزنة الرئيسية، تاجر..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. DYNAMIC PERIOD KPI CARDS (Real Live Calculated Data)   */}
      {/* ========================================================= */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-purple-400" />
            مؤشرات الحركة المالية للفترة المحددة:
            {filterState.dateFrom && filterState.dateTo && (
              <span className="font-mono text-purple-300 text-[11px] mr-1">
                ({filterState.dateFrom} إلى {filterState.dateTo})
              </span>
            )}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            عدد الحركات: <strong className="text-zinc-300">{metrics.transactionCount}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Inflows */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center flex flex-col justify-center">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block truncate mb-0.5 flex items-center justify-center gap-1">
              <ArrowDownLeft className="w-3 h-3" />
              الداخل في الفترة
            </span>
            <strong className="text-xs sm:text-[13px] font-bold font-mono text-emerald-500 dark:text-emerald-300 truncate">
              {formatCurrency(metrics.totalInflowsEGP, 'EGP')}
            </strong>
            {metrics.totalInflowsUSD > 0 && (
              <span className="text-[10px] font-mono text-emerald-400 mt-0.5 block">
                +${metrics.totalInflowsUSD.toFixed(2)}
              </span>
            )}
          </div>

          {/* 2. Outflows */}
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center flex flex-col justify-center">
            <span className="text-[10px] text-red-600 dark:text-red-400 font-bold block truncate mb-0.5 flex items-center justify-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              الخارج في الفترة
            </span>
            <strong className="text-xs sm:text-[13px] font-bold font-mono text-red-500 dark:text-red-300 truncate">
              {formatCurrency(metrics.totalOutflowsEGP, 'EGP')}
            </strong>
            {metrics.totalOutflowsUSD > 0 && (
              <span className="text-[10px] font-mono text-red-400 mt-0.5 block">
                +${metrics.totalOutflowsUSD.toFixed(2)}
              </span>
            )}
          </div>

          {/* 3. Transfers */}
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center flex flex-col justify-center">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block truncate mb-0.5 flex items-center justify-center gap-1">
              <ArrowLeftRight className="w-3 h-3" />
              التحويلات
            </span>
            <strong className="text-xs sm:text-[13px] font-bold font-mono text-indigo-500 dark:text-indigo-300 truncate">
              {formatCurrency(metrics.totalTransfersEGP, 'EGP')}
            </strong>
            {metrics.totalTransfersUSD > 0 && (
              <span className="text-[10px] font-mono text-indigo-400 mt-0.5 block">
                +${metrics.totalTransfersUSD.toFixed(2)}
              </span>
            )}
          </div>

          {/* 4. Profits */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center flex flex-col justify-center">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block truncate mb-0.5 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />
              أرباح الفترة
            </span>
            <strong className="text-xs sm:text-[13px] font-bold font-mono text-amber-500 dark:text-amber-300 truncate">
              {formatCurrency(metrics.totalProfitsEGP, 'EGP')}
            </strong>
          </div>

          {/* 5. Expenses */}
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center flex flex-col justify-center">
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold block truncate mb-0.5 flex items-center justify-center gap-1">
              <Receipt className="w-3 h-3" />
              مصروفات الفترة
            </span>
            <strong className="text-xs sm:text-[13px] font-bold font-mono text-orange-500 dark:text-orange-300 truncate">
              {formatCurrency(metrics.totalExpensesEGP, 'EGP')}
            </strong>
          </div>

          {/* 6. Net Period */}
          <div className={`p-3 rounded-xl border text-center flex flex-col justify-center ${
            metrics.netEGP >= 0
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-300'
          }`}>
            <span className="text-[10px] font-bold block truncate mb-0.5 flex items-center justify-center gap-1">
              <Scale className="w-3 h-3" />
              صافي حركة الفترة
            </span>
            <strong className="text-xs sm:text-[13px] font-bold font-mono truncate">
              {formatCurrency(metrics.netEGP, 'EGP')}
            </strong>
            {metrics.netUSD !== 0 && (
              <span className="text-[10px] font-mono mt-0.5 block">
                {metrics.netUSD > 0 ? '+' : ''}${metrics.netUSD.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
