// =============================================================
// NZM JKR TOP UP ERP — Unified Analytics Filter Bar
// Visible across all 5 pages with synchronized state
// Requirements: September 2026 Specification
// =============================================================

import React, { useState } from 'react';
import {
  UnifiedAnalyticsFilterState,
  DatePreset
} from '../../types/analytics.types';
import {
  Filter,
  Calendar,
  Users,
  Award,
  Zap,
  Gamepad2,
  Share2,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface UnifiedAnalyticsFilterBarProps {
  filters: UnifiedAnalyticsFilterState;
  gamesList: { id: string; name: string }[];
  onApplyFilters: (newFilters: UnifiedAnalyticsFilterState) => void;
  onResetFilters: () => void;
  filteredCount?: number;
  totalCount?: number;
}

export const UnifiedAnalyticsFilterBar: React.FC<UnifiedAnalyticsFilterBarProps> = ({
  filters,
  gamesList,
  onApplyFilters,
  onResetFilters,
  filteredCount,
  totalCount
}) => {
  const [localFilters, setLocalFilters] = useState<UnifiedAnalyticsFilterState>(filters);
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(filters.datePreset === 'custom');

  // Compute preset dates
  const handleDatePresetChange = (preset: DatePreset) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let start = '';
    let end = todayStr;

    if (preset === 'today') {
      start = todayStr;
      end = todayStr;
      setIsCustomDateOpen(false);
    } else if (preset === 'this_week') {
      const day = today.getDay(); // 0 Sun ... 6 Sat
      const diff = today.getDate() - (day === 6 ? 0 : day + 1); // Egypt week starts Saturday
      const sat = new Date(today.setDate(diff));
      start = sat.toISOString().split('T')[0];
      end = todayStr;
      setIsCustomDateOpen(false);
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = firstDay.toISOString().split('T')[0];
      end = todayStr;
      setIsCustomDateOpen(false);
    } else if (preset === 'last_30_days') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      start = thirtyDaysAgo.toISOString().split('T')[0];
      end = todayStr;
      setIsCustomDateOpen(false);
    } else if (preset === 'custom') {
      setIsCustomDateOpen(true);
      start = localFilters.startDate || todayStr;
      end = localFilters.endDate || todayStr;
    }

    setLocalFilters(prev => ({
      ...prev,
      datePreset: preset,
      startDate: start,
      endDate: end
    }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
  };

  const handleReset = () => {
    onResetFilters();
    setIsCustomDateOpen(false);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-3 text-right">
      {/* Top Header info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-100 dark:border-[#27272A]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 font-bold flex items-center gap-1.5">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-black">الفلتر الموحد للتحليلات (Unified Filter)</span>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            يتحكم في جميع الرسوم البيانية والجداول دفعة واحدة
          </span>
        </div>

        {filteredCount !== undefined && totalCount !== undefined && (
          <div className="flex items-center gap-2 text-xs font-mono font-bold bg-gray-50 dark:bg-zinc-800/60 px-2.5 py-1 rounded-xl">
            <span className="text-zinc-400">البيانات المطابقة:</span>
            <span className="text-orange-500">{filteredCount.toLocaleString('ar-EG')}</span>
            <span className="text-zinc-400">من {totalCount.toLocaleString('ar-EG')}</span>
          </div>
        )}
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 text-xs">
        {/* 1. فلتر التاريخ */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span>نطاق التاريخ</span>
          </label>
          <select
            value={localFilters.datePreset}
            onChange={e => handleDatePresetChange(e.target.value as DatePreset)}
            className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-orange-500 text-xs"
          >
            <option value="this_month">هذا الشهر (افتراضي)</option>
            <option value="today">هذا اليوم</option>
            <option value="this_week">هذا الأسبوع</option>
            <option value="last_30_days">آخر 30 يوم</option>
            <option value="custom">مخصص (من → إلى)</option>
          </select>
        </div>

        {/* 2. فلتر نوع العميل */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>نوع العميل / الشريك</span>
          </label>
          <select
            value={localFilters.customerType}
            onChange={e => setLocalFilters(prev => ({ ...prev, customerType: e.target.value as any }))}
            className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-orange-500 text-xs"
          >
            <option value="all">الكل (الجميع)</option>
            <option value="regular">عميل عادي</option>
            <option value="partner">شريك نجاح</option>
            <option value="shop">محل تجاري</option>
            <option value="influencer">مشهور ستريمر</option>
          </select>
        </div>

        {/* 3. فلتر مستوى الولاء */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>مستوى الولاء</span>
          </label>
          <select
            value={localFilters.loyaltyTier}
            onChange={e => setLocalFilters(prev => ({ ...prev, loyaltyTier: e.target.value as any }))}
            className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-orange-500 text-xs"
          >
            <option value="all">الكل</option>
            <option value="normal">عادي</option>
            <option value="silver">فضي</option>
            <option value="gold">ذهبي</option>
            <option value="vip">VIP</option>
          </select>
        </div>

        {/* 4. فلتر قوة الشراء */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-purple-500" />
            <span>قوة الشراء</span>
          </label>
          <select
            value={localFilters.purchasingPower}
            onChange={e => setLocalFilters(prev => ({ ...prev, purchasingPower: e.target.value as any }))}
            className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-orange-500 text-xs"
          >
            <option value="all">الكل</option>
            <option value="normal">عادي</option>
            <option value="medium">متوسط</option>
            <option value="strong">قوي</option>
            <option value="whale">حوت (Whale)</option>
          </select>
        </div>

        {/* 5. فلتر اللعبة */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
            <Gamepad2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>اللعبة</span>
          </label>
          <select
            value={localFilters.gameId}
            onChange={e => setLocalFilters(prev => ({ ...prev, gameId: e.target.value }))}
            className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-orange-500 text-xs"
          >
            <option value="all">كل الألعاب</option>
            {gamesList.map(g => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* 6. فلتر المنصة الإعلانية */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
            <Share2 className="w-3.5 h-3.5 text-pink-500" />
            <span>المنصة الإعلانية</span>
          </label>
          <select
            value={localFilters.adPlatform}
            onChange={e => setLocalFilters(prev => ({ ...prev, adPlatform: e.target.value as any }))}
            className="w-full p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-orange-500 text-xs"
          >
            <option value="all">كل المنصات</option>
            <option value="facebook">فيسبوك (Facebook)</option>
            <option value="instagram">إنستغرام (Instagram)</option>
            <option value="tiktok">تيك توك (TikTok)</option>
            <option value="whatsapp">واتساب (WhatsApp)</option>
            <option value="telegram">تيليجرام (Telegram)</option>
            <option value="snapchat">سناب شات (Snapchat)</option>
            <option value="google">إعلانات جوجل</option>
            <option value="word_of_mouth">ترشيح مباشر / أصدقاء</option>
            <option value="other">أخرى</option>
          </select>
        </div>
      </div>

      {/* Custom Date Pickers Drawer (when custom is selected) */}
      {isCustomDateOpen && (
        <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/20 flex flex-wrap items-center gap-3 animate-fade-in text-xs">
          <span className="font-bold text-orange-600 dark:text-orange-400">نطاق مخصص:</span>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">من:</span>
            <input
              type="date"
              value={localFilters.startDate}
              onChange={e => setLocalFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono font-bold"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">إلى:</span>
            <input
              type="date"
              value={localFilters.endDate}
              onChange={e => setLocalFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono font-bold"
            />
          </div>
        </div>
      )}

      {/* Actions & Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#27272A]">
        {/* Active badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {localFilters.customerType !== 'all' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
              نوع: {localFilters.customerType}
            </span>
          )}
          {localFilters.loyaltyTier !== 'all' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
              ولاء: {localFilters.loyaltyTier}
            </span>
          )}
          {localFilters.purchasingPower !== 'all' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
              شراء: {localFilters.purchasingPower}
            </span>
          )}
          {localFilters.gameId !== 'all' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              لعبة: {localFilters.gameId}
            </span>
          )}
          {localFilters.adPlatform !== 'all' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold">
              منصة: {localFilters.adPlatform}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة تعيين</span>
          </button>

          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-sm transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تطبيق الفلتر</span>
          </button>
        </div>
      </div>
    </div>
  );
};
