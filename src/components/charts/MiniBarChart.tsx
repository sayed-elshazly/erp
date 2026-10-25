// =============================================================
// NZM JKR TOP UP ERP — Mini Bar Chart Component (CSS-Based)
// Interactive, Animated, Clickable Bar Charts
// =============================================================

import React, { useState } from 'react';

export interface BarChartDataItem {
  label: string;
  value: number;
  color?: string;
  id?: string;
}

interface MiniBarChartProps {
  data: BarChartDataItem[];
  title?: string;
  height?: number;
  showValues?: boolean;
  showLabels?: boolean;
  horizontal?: boolean;
  maxBars?: number;
  formatValue?: (val: number) => string;
  onBarClick?: (item: BarChartDataItem) => void;
  className?: string;
  accentColor?: string;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({
  data,
  title,
  height = 180,
  showValues = true,
  showLabels = true,
  horizontal = false,
  maxBars = 8,
  formatValue,
  onBarClick,
  className = '',
  accentColor
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const displayData = data.slice(0, maxBars);
  const maxVal = Math.max(...displayData.map(d => d.value), 1);

  const defaultColors = [
    '#f97316', '#3b82f6', '#8b5cf6', '#ec4899',
    '#10b981', '#f59e0b', '#06b6d4', '#ef4444'
  ];

  const fmt = (v: number) => formatValue ? formatValue(v) : v.toLocaleString('ar-EG');

  if (horizontal) {
    return (
      <div className={`space-y-2 ${className}`}>
        {title && (
          <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{title}</h4>
        )}
        {displayData.map((item, i) => {
          const pct = Math.round((item.value / maxVal) * 100);
          const barColor = item.color || accentColor || defaultColors[i % defaultColors.length];
          const isHovered = hoveredIndex === i;

          return (
            <div
              key={item.id || i}
              className={`group transition-all duration-200 ${onBarClick ? 'cursor-pointer' : ''} ${isHovered ? 'scale-[1.01]' : ''}`}
              onClick={() => onBarClick?.(item)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                {showLabels && (
                  <span className="font-bold text-zinc-600 dark:text-zinc-300 truncate max-w-[55%]">
                    {item.label}
                  </span>
                )}
                {showValues && (
                  <span className="font-mono font-bold text-zinc-500 dark:text-zinc-400">
                    {fmt(item.value)}
                  </span>
                )}
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor,
                    opacity: isHovered ? 1 : 0.85,
                    boxShadow: isHovered ? `0 0 8px ${barColor}40` : 'none'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical Bar Chart
  return (
    <div className={`${className}`}>
      {title && (
        <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">{title}</h4>
      )}
      <div className="flex items-end justify-between gap-1.5" style={{ height }}>
        {displayData.map((item, i) => {
          const pct = Math.max(4, Math.round((item.value / maxVal) * 100));
          const barColor = item.color || accentColor || defaultColors[i % defaultColors.length];
          const isHovered = hoveredIndex === i;

          return (
            <div
              key={item.id || i}
              className={`flex-1 flex flex-col items-center justify-end h-full transition-all duration-200 ${onBarClick ? 'cursor-pointer' : ''}`}
              onClick={() => onBarClick?.(item)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && showValues && (
                <div
                  className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold text-white mb-1 whitespace-nowrap animate-fade-in"
                  style={{ backgroundColor: barColor }}
                >
                  {fmt(item.value)}
                </div>
              )}

              {/* Bar */}
              <div
                className="w-full rounded-t-lg transition-all duration-700 ease-out min-w-[14px]"
                style={{
                  height: `${pct}%`,
                  backgroundColor: barColor,
                  opacity: isHovered ? 1 : 0.8,
                  transform: isHovered ? 'scaleY(1.04)' : 'scaleY(1)',
                  transformOrigin: 'bottom',
                  boxShadow: isHovered ? `0 -4px 12px ${barColor}30` : 'none'
                }}
              />

              {/* Label */}
              {showLabels && (
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-1 truncate w-full text-center font-bold leading-tight">
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
