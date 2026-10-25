import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  Clock
} from 'lucide-react';
import { useSmartDropdownPosition } from '../../hooks/useSmartDropdownPosition';

export type DatePresetKey =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'custom';

export interface DateRangeFilterProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onReset?: () => void;
  label?: string;
  className?: string;
  dropdownAlignment?: 'auto' | 'left' | 'right';
}

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر'
];

const WEEK_DAYS_AR = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const formatYMD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset,
  label = 'تصفية بالتاريخ',
  className = '',
  dropdownAlignment = 'auto'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<DatePresetKey>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dropdownStyle = useSmartDropdownPosition({
    isOpen,
    triggerRef: containerRef,
    dropdownRef,
    preferredAlignment: dropdownAlignment,
    padding: 12,
    marginTop: 8
  });

  // Calendar view state (year and month for the interactive picker)
  const initialDate = startDate ? new Date(startDate) : new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear() || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth() || new Date().getMonth());

  // In-progress range selection in calendar
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [pickingStep, setPickingStep] = useState<'start' | 'end'>('start');

  // Sync temp dates when props change
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
    if (!startDate && !endDate) {
      setActivePreset('all');
    }
  }, [startDate, endDate]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Presets
  const presets = useMemo(() => {
    const now = new Date();
    const todayStr = formatYMD(now);

    // Yesterday
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yesterdayStr = formatYMD(yest);

    // Last 7 days
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    const last7Str = formatYMD(d7);

    // Last 30 days
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 29);
    const last30Str = formatYMD(d30);

    // This Week (Saturday to now)
    const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
    const diffToSat = (dayOfWeek + 1) % 7;
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - diffToSat);

    // Last Week
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekStart.getDate() - 6);

    // This Month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Last Month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // This Year
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const thisYearEnd = new Date(now.getFullYear(), 11, 31);

    // Last Year
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

    return [
      { key: 'today' as DatePresetKey, label: 'اليوم', start: todayStr, end: todayStr },
      { key: 'yesterday' as DatePresetKey, label: 'أمس', start: yesterdayStr, end: yesterdayStr },
      { key: 'last_7_days' as DatePresetKey, label: 'آخر 7 أيام', start: last7Str, end: todayStr },
      { key: 'last_30_days' as DatePresetKey, label: 'آخر 30 يوم', start: last30Str, end: todayStr },
      { key: 'this_week' as DatePresetKey, label: 'هذا الأسبوع', start: formatYMD(thisWeekStart), end: todayStr },
      { key: 'last_week' as DatePresetKey, label: 'الأسبوع الماضي', start: formatYMD(lastWeekStart), end: formatYMD(lastWeekEnd) },
      { key: 'this_month' as DatePresetKey, label: 'هذا الشهر', start: formatYMD(thisMonthStart), end: formatYMD(thisMonthEnd) },
      { key: 'last_month' as DatePresetKey, label: 'الشهر الماضي', start: formatYMD(lastMonthStart), end: formatYMD(lastMonthEnd) },
      { key: 'this_year' as DatePresetKey, label: 'هذه السنة', start: formatYMD(thisYearStart), end: formatYMD(thisYearEnd) },
      { key: 'last_year' as DatePresetKey, label: 'السنة الماضية', start: formatYMD(lastYearStart), end: formatYMD(lastYearEnd) }
    ];
  }, []);

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setActivePreset(preset.key);
    setTempStart(preset.start);
    setTempEnd(preset.end);
    onStartDateChange(preset.start);
    onEndDateChange(preset.end);
    setIsOpen(false);
  };

  const handleSelectCustom = () => {
    setActivePreset('custom');
    setPickingStep('start');
  };

  const handleClear = () => {
    setActivePreset('all');
    setTempStart('');
    setTempEnd('');
    onStartDateChange('');
    onEndDateChange('');
    if (onReset) onReset();
    setIsOpen(false);
  };

  // Calendar Month Matrix Generation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    // Day of week: 0 = Sun, 1 = Mon ... 6 = Sat
    // In our week (starts on Saturday): Sat = 0, Sun = 1, Mon = 2 ... Fri = 6
    const firstDayIndex = (firstDayOfMonth.getDay() + 1) % 7;
    const totalDays = lastDayOfMonth.getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(viewYear, viewMonth - 1, d);
      days.push({
        dateStr: formatYMD(prevDate),
        dayNumber: d,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const curDate = new Date(viewYear, viewMonth, d);
      days.push({
        dateStr: formatYMD(curDate),
        dayNumber: d,
        isCurrentMonth: true
      });
    }

    // Next month padding days to complete grid (42 cells: 6 rows)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(viewYear, viewMonth + 1, d);
      days.push({
        dateStr: formatYMD(nextDate),
        dayNumber: d,
        isCurrentMonth: false
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const handleDayClick = (dateStr: string) => {
    if (pickingStep === 'start' || !tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd('');
      setPickingStep('end');
    } else {
      // If clicked date is before start date, swap them
      if (dateStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
      setPickingStep('start');
    }
  };

  const handleApplyCustomRange = () => {
    if (!tempStart) return;
    const finalEnd = tempEnd || tempStart;
    onStartDateChange(tempStart);
    onEndDateChange(finalEnd);
    setActivePreset('custom');
    setIsOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Generate Year Options
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear - 6; y <= currentYear + 3; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Display Label for trigger button
  const displayLabel = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) {
        const found = presets.find(p => p.start === startDate && p.end === endDate);
        return found ? found.label : startDate;
      }
      const found = presets.find(p => p.start === startDate && p.end === endDate);
      return found ? found.label : `${startDate} ➜ ${endDate}`;
    }
    if (startDate) return `من ${startDate}`;
    if (endDate) return `إلى ${endDate}`;
    return 'كل التواريخ';
  }, [startDate, endDate, presets]);

  const isFiltered = !!startDate || !!endDate;

  return (
    <div ref={containerRef} className={`relative text-xs ${className}`} dir="rtl">
      {/* Trigger Button */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs hover:border-orange-500/50 transition-all">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-right font-bold cursor-pointer select-none text-zinc-800 dark:text-zinc-200 hover:text-orange-500 transition-colors"
        >
          <CalendarIcon className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="text-[11px] text-zinc-500 font-bold hidden sm:inline">{label}:</span>
          <span className={`text-xs font-mono font-bold ${isFiltered ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
            {displayLabel}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180 text-orange-500' : ''}`} />
        </button>

        {isFiltered && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="إلغاء تصفية التاريخ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown / Calendar Popup */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="absolute z-50 w-[320px] sm:w-[420px] rounded-3xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-2xl p-3.5 sm:p-4 space-y-3.5 animate-fade-in backdrop-blur-md"
        >
          {/* Quick Presets Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-500" /> الفترات الجاهزة (Quick Presets)
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-rose-500 hover:underline cursor-pointer font-bold"
              >
                إلغاء التصفية
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {presets.map(p => {
                const isSelected = activePreset === p.key || (startDate === p.start && endDate === p.end);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center truncate ${
                      isSelected
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleSelectCustom}
                className={`col-span-2 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  activePreset === 'custom'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                }`}
              >
                📅 تاريخ مخصص (Custom Range)
              </button>
            </div>
          </div>

          {/* Interactive Modern Calendar Section */}
          <div className="pt-3 border-t border-gray-100 dark:border-[#27272A] space-y-3">
            {/* Calendar Controls (Month & Year Jump) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {/* Month Dropdown */}
                <select
                  value={viewMonth}
                  onChange={e => setViewMonth(parseInt(e.target.value, 10))}
                  className="rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer"
                >
                  {ARABIC_MONTHS.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>

                {/* Year Dropdown */}
                <select
                  value={viewYear}
                  onChange={e => setViewYear(parseInt(e.target.value, 10))}
                  className="rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none font-mono cursor-pointer"
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prev / Next Arrows */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                  title="الشهر السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                  title="الشهر القادم"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] sm:text-[11px] text-zinc-400">
              {WEEK_DAYS_AR.map(d => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono">
              {calendarDays.map((item, idx) => {
                const isStart = tempStart === item.dateStr;
                const isEnd = tempEnd === item.dateStr;
                const isInRange = tempStart && tempEnd && item.dateStr > tempStart && item.dateStr < tempEnd;
                const isToday = item.dateStr === formatYMD(new Date());

                return (
                  <button
                    key={`${item.dateStr}_${idx}`}
                    type="button"
                    onClick={() => handleDayClick(item.dateStr)}
                    className={`h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center relative ${
                      !item.isCurrentMonth
                        ? 'text-zinc-300 dark:text-zinc-600 opacity-40'
                        : isStart || isEnd
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 z-10'
                        : isInRange
                        ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 rounded-none'
                        : isToday
                        ? 'border border-orange-500/50 text-orange-500 font-black'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {item.dayNumber}
                  </button>
                );
              })}
            </div>

            {/* Selected Range Display & Apply Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <div className="text-[11px] text-zinc-500 font-mono">
                <span>النطاق: </span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {tempStart || '---'}
                </strong>
                <span> ➜ </span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {tempEnd || tempStart || '---'}
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-gray-200 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustomRange}
                  disabled={!tempStart}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> تطبيق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
