// =============================================================
// NZM JKR TOP UP ERP — Advanced Bar Chart & Grouped Bar Chart
// High Visual Fidelity, Interactive Tooltips, Smooth Animations
// =============================================================

import React, { useState } from 'react';

export interface BarChartItem {
  id?: string;
  label: string;
  value: number;
  subValue?: string | number;
  color?: string;
}

export interface GroupedBarChartItem {
  category: string;
  series: {
    label: string;
    value: number;
    color: string;
  }[];
}

interface AdvancedBarChartProps {
  data: BarChartItem[];
  title?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  height?: number;
  barColor?: string;
  formatValue?: (val: number) => string;
  onBarClick?: (item: BarChartItem) => void;
  className?: string;
}

export const AdvancedBarChart: React.FC<AdvancedBarChartProps> = ({
  data,
  title,
  yAxisLabel,
  xAxisLabel,
  height = 240,
  barColor = '#f97316',
  formatValue,
  onBarClick,
  className = ''
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const displayData = data.slice(0, 10);
  const maxVal = Math.max(...displayData.map(d => d.value), 1);

  const defaultPalette = [
    '#f97316', '#3b82f6', '#10b981', '#8b5cf6',
    '#ec4899', '#f59e0b', '#06b6d4', '#ef4444',
    '#14b8a6', '#6366f1'
  ];

  const fmt = (v: number) => formatValue ? formatValue(v) : v.toLocaleString('ar-EG');

  return (
    <div className={`p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs ${className}`}>
      {/* Title & Y-Axis Label */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-[#27272A]">
        <div>
          {title && <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">{title}</h4>}
          {yAxisLabel && <p className="text-[10px] text-zinc-400 font-mono mt-0.5">محور Y: {yAxisLabel}</p>}
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-500 font-mono">
          أعلى {displayData.length}
        </span>
      </div>

      {/* Vertical Chart Area */}
      <div className="relative flex items-end justify-between gap-2 pt-6" style={{ height }}>
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
          <div className="border-b border-dashed border-zinc-500 w-full" />
          <div className="border-b border-dashed border-zinc-500 w-full" />
          <div className="border-b border-dashed border-zinc-500 w-full" />
          <div className="border-b border-zinc-500 w-full" />
        </div>

        {displayData.map((item, idx) => {
          const heightPct = Math.max(8, Math.round((item.value / maxVal) * 100));
          const color = item.color || barColor || defaultPalette[idx % defaultPalette.length];
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={item.id || idx}
              className="relative flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onBarClick?.(item)}
            >
              {/* Floating Tooltip */}
              {isHovered && (
                <div className="absolute -top-12 z-20 px-2 py-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[10px] font-bold shadow-xl whitespace-nowrap animate-fade-in pointer-events-none">
                  <div>{item.label}</div>
                  <div className="font-mono text-orange-400 dark:text-orange-600 font-black">
                    {fmt(item.value)}
                  </div>
                </div>
              )}

              {/* Bar Value on top */}
              <span className={`text-[10px] font-mono font-bold transition-all mb-1 truncate max-w-full ${
                isHovered ? 'text-orange-500 scale-110 font-black' : 'text-zinc-500 dark:text-zinc-400'
              }`}>
                {fmt(item.value)}
              </span>

              {/* Bar pillar */}
              <div className="w-full max-w-[42px] bg-gray-100 dark:bg-zinc-800/60 rounded-t-xl overflow-hidden flex items-end" style={{ height: '100%' }}>
                <div
                  className="w-full rounded-t-xl transition-all duration-500 ease-out group-hover:brightness-110 shadow-xs"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: color
                  }}
                />
              </div>

              {/* Bar Label on bottom */}
              <div className="mt-2 text-center w-full">
                <span className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate w-full" title={item.label}>
                  {item.label}
                </span>
                {item.subValue && (
                  <span className="block text-[9px] font-mono text-zinc-400 truncate">
                    {item.subValue}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {xAxisLabel && (
        <div className="text-center text-[10px] text-zinc-400 font-mono mt-3 pt-2 border-t border-gray-100 dark:border-[#27272A]">
          محور X: {xAxisLabel}
        </div>
      )}
    </div>
  );
};

// =============================================================
// Grouped Bar Chart Component (e.g. for Shrik vs Shop vs Influencer)
// =============================================================
interface AdvancedGroupedBarChartProps {
  data: GroupedBarChartItem[];
  title?: string;
  height?: number;
  formatValue?: (val: number) => string;
  className?: string;
}

export const AdvancedGroupedBarChart: React.FC<AdvancedGroupedBarChartProps> = ({
  data,
  title,
  height = 240,
  formatValue,
  className = ''
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Extract all series labels for legend
  const legendItems = data[0]?.series || [];

  // Find max value across all series
  const allValues = data.flatMap(d => d.series.map(s => s.value));
  const maxVal = Math.max(...allValues, 1);

  const fmt = (v: number) => formatValue ? formatValue(v) : v.toLocaleString('ar-EG');

  return (
    <div className={`p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs ${className}`}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-[#27272A]">
        {title && <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">{title}</h4>}
        
        {/* Legend */}
        <div className="flex items-center gap-3">
          {legendItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex items-end justify-around gap-6 pt-6" style={{ height }}>
        {data.map((cat, catIdx) => (
          <div key={catIdx} className="flex-1 flex flex-col items-center h-full justify-end">
            {/* Cluster of bars */}
            <div className="w-full flex items-end justify-center gap-1.5 h-full pb-1">
              {cat.series.map((s, sIdx) => {
                const heightPct = Math.max(10, Math.round((s.value / maxVal) * 100));
                const key = `${catIdx}_${sIdx}`;
                const isHovered = hoveredKey === key;

                return (
                  <div
                    key={sIdx}
                    className="relative flex-1 max-w-[32px] flex flex-col items-center h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredKey(key)}
                    onMouseLeave={() => setHoveredKey(null)}
                  >
                    {isHovered && (
                      <div className="absolute -top-10 z-20 px-2 py-1 rounded bg-zinc-900 text-white text-[10px] font-bold shadow-lg whitespace-nowrap">
                        {s.label}: {fmt(s.value)}
                      </div>
                    )}
                    <span className="text-[9px] font-mono text-zinc-500 mb-0.5">
                      {fmt(s.value)}
                    </span>
                    <div
                      className="w-full rounded-t-lg transition-all duration-300 group-hover:brightness-110"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: s.color
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Category Label */}
            <div className="mt-2 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {cat.category}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
