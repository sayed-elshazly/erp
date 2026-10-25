// =============================================================
// NZM JKR TOP UP ERP — Google-Style Table Pagination Component
// =============================================================

import React from 'react';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  labelName?: string;
  themeColor?: 'orange' | 'pink' | 'emerald' | 'purple' | 'blue' | 'amber' | 'indigo';
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  labelName = 'عنصر',
  themeColor = 'orange'
}) => {
  if (totalItems <= 0) return null;

  const start = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const end = Math.min(currentPage * pageSize, totalItems);

  // Dynamic Theme Colors
  const colorStyles = {
    orange: {
      active: 'bg-orange-500 text-white shadow-md shadow-orange-500/25 border-orange-500',
      hover: 'hover:border-orange-500/50 hover:text-orange-500 hover:bg-orange-500/5',
      accent: 'text-orange-500',
      focus: 'focus:border-orange-500'
    },
    amber: {
      active: 'bg-amber-500 text-white shadow-md shadow-amber-500/25 border-amber-500',
      hover: 'hover:border-amber-500/50 hover:text-amber-500 hover:bg-amber-500/5',
      accent: 'text-amber-500',
      focus: 'focus:border-amber-500'
    },
    pink: {
      active: 'bg-pink-500 text-white shadow-md shadow-pink-500/25 border-pink-500',
      hover: 'hover:border-pink-500/50 hover:text-pink-500 hover:bg-pink-500/5',
      accent: 'text-pink-500',
      focus: 'focus:border-pink-500'
    },
    emerald: {
      active: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 border-emerald-500',
      hover: 'hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/5',
      accent: 'text-emerald-500',
      focus: 'focus:border-emerald-500'
    },
    purple: {
      active: 'bg-purple-600 text-white shadow-md shadow-purple-600/25 border-purple-600',
      hover: 'hover:border-purple-500/50 hover:text-purple-500 hover:bg-purple-500/5',
      accent: 'text-purple-500',
      focus: 'focus:border-purple-500'
    },
    blue: {
      active: 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border-blue-600',
      hover: 'hover:border-blue-500/50 hover:text-blue-500 hover:bg-blue-500/5',
      accent: 'text-blue-500',
      focus: 'focus:border-blue-500'
    },
    indigo: {
      active: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600',
      hover: 'hover:border-indigo-500/50 hover:text-indigo-500 hover:bg-indigo-500/5',
      accent: 'text-indigo-500',
      focus: 'focus:border-indigo-500'
    }
  }[themeColor] || {
    active: 'bg-orange-500 text-white shadow-md shadow-orange-500/25 border-orange-500',
    hover: 'hover:border-orange-500/50 hover:text-orange-500 hover:bg-orange-500/5',
    accent: 'text-orange-500',
    focus: 'focus:border-orange-500'
  };

  // Google-Style Window of Pages (1 2 3 4 5 6 7 8 9 10...)
  const getGooglePageNumbers = () => {
    const maxVisible = 10;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Centered sliding window of up to 10 pages
    let startPage = Math.max(1, currentPage - 5);
    let endPage = startPage + maxVisible - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getGooglePageNumbers();

  return (
    <div
      className="p-3.5 border-t border-gray-200 dark:border-[#27272A] bg-white/50 dark:bg-[#18181B]/50 rounded-b-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs select-none"
      dir="rtl"
    >
      {/* Right / Info Count & Page Size Selector */}
      <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 flex-wrap justify-center sm:justify-start">
        <span className="font-mono">
          عرض <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{start}</strong> إلى{' '}
          <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{end}</strong> من إجمالي{' '}
          <strong className={`${colorStyles.accent} font-black`}>{totalItems}</strong> {labelName}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-[11px] font-medium text-zinc-400">في الصفحة:</span>
            <select
              value={pageSize}
              onChange={e => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className={`bg-white dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] rounded-lg px-2 py-1 text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer focus:outline-none ${colorStyles.focus}`}
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Google-Style Numbered Navigation Bar: [السابقة] [1] [2] [3] ... [10] [التالية] */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {/* First Page button if far away */}
          {pageNumbers[0] > 1 && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-white dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-zinc-600 dark:text-zinc-300 font-bold text-xs cursor-pointer transition-all ${colorStyles.hover}`}
              title="الصفحة الأولى"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          )}

          {/* Previous Page Button (السابقة) */}
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className={`px-3 h-8 rounded-xl bg-white dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none disabled:hover:border-gray-200 ${colorStyles.hover}`}
            title="الانتقال إلى الصفحة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
            <span>السابقة</span>
          </button>

          {/* Direct Google Numbered Buttons (1 2 3 4 5 6 7 8 9 10) */}
          <div className="flex items-center gap-1">
            {pageNumbers.map(pageNum => {
              const isActive = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`min-w-8 h-8 px-2 rounded-xl text-xs font-black font-mono transition-all duration-150 cursor-pointer flex items-center justify-center ${
                    isActive
                      ? `${colorStyles.active} scale-105`
                      : `bg-white dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-zinc-600 dark:text-zinc-300 ${colorStyles.hover}`
                  }`}
                  title={`صفحة ${pageNum}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page Button (التالية) */}
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className={`px-3 h-8 rounded-xl bg-white dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none disabled:hover:border-gray-200 ${colorStyles.hover}`}
            title="الانتقال إلى الصفحة التالية"
          >
            <span>التالية</span>
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Last Page button if far away */}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-white dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-zinc-600 dark:text-zinc-300 font-bold text-xs cursor-pointer transition-all ${colorStyles.hover}`}
              title="الصفحة الأخيرة"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
