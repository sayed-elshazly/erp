// =============================================================
// NZM JKR TOP UP ERP — Mini Donut Chart Component (CSS-Based)
// conic-gradient Donut/Pie with animated segments
// =============================================================

import React, { useState } from 'react';

export interface DonutChartSegment {
  label: string;
  value: number;
  color: string;
  id?: string;
}

interface MiniDonutChartProps {
  segments: DonutChartSegment[];
  size?: number;
  thickness?: number;
  title?: string;
  centerLabel?: string;
  centerValue?: string | number;
  showLegend?: boolean;
  formatValue?: (val: number) => string;
  onSegmentClick?: (segment: DonutChartSegment) => void;
  className?: string;
}

export const MiniDonutChart: React.FC<MiniDonutChartProps> = ({
  segments,
  size = 140,
  thickness = 28,
  title,
  centerLabel,
  centerValue,
  showLegend = true,
  formatValue,
  onSegmentClick,
  className = ''
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const fmt = (v: number) => formatValue ? formatValue(v) : v.toLocaleString('ar-EG');

  // Build conic-gradient stops
  let accumulated = 0;
  const gradientStops = segments.map(seg => {
    const start = accumulated;
    const pct = (seg.value / total) * 100;
    accumulated += pct;
    return `${seg.color} ${start}% ${accumulated}%`;
  });

  // Fill remaining with transparent if needed
  if (accumulated < 100) {
    gradientStops.push(`transparent ${accumulated}% 100%`);
  }

  const gradient = `conic-gradient(${gradientStops.join(', ')})`;
  const innerSize = size - thickness * 2;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {title && (
        <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{title}</h4>
      )}

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div
          className="relative rounded-full transition-transform duration-300 shrink-0"
          style={{
            width: size,
            height: size,
            background: gradient,
          }}
        >
          {/* Inner hole */}
          <div
            className="absolute rounded-full bg-white dark:bg-[#18181B] flex items-center justify-center"
            style={{
              width: innerSize,
              height: innerSize,
              top: thickness,
              left: thickness,
            }}
          >
            <div className="text-center">
              {centerValue !== undefined && (
                <span className="block text-base font-black font-mono text-zinc-900 dark:text-zinc-100">
                  {typeof centerValue === 'number' ? fmt(centerValue) : centerValue}
                </span>
              )}
              {centerLabel && (
                <span className="block text-[9px] text-zinc-500 font-bold">{centerLabel}</span>
              )}
            </div>
          </div>

          {/* Hover segments (invisible overlay) */}
          {segments.map((seg, i) => {
            const startAngle = segments.slice(0, i).reduce((sum, s) => sum + (s.value / total) * 360, 0);
            const segAngle = (seg.value / total) * 360;
            const midAngle = ((startAngle + segAngle / 2) * Math.PI) / 180;
            const tooltipX = Math.cos(midAngle) * (size / 2 - thickness / 2);
            const tooltipY = Math.sin(midAngle) * (size / 2 - thickness / 2);

            return (
              <div
                key={seg.id || i}
                className={`absolute inset-0 rounded-full ${onSegmentClick ? 'cursor-pointer' : ''}`}
                style={{
                  clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle * Math.PI) / 180)}% ${50 + 50 * Math.sin((startAngle * Math.PI) / 180)}%, ${50 + 50 * Math.cos(((startAngle + segAngle) * Math.PI) / 180)}% ${50 + 50 * Math.sin(((startAngle + segAngle) * Math.PI) / 180)}%)`,
                  opacity: 0,
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSegmentClick?.(seg)}
                title={`${seg.label}: ${fmt(seg.value)} (${Math.round((seg.value / total) * 100)}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="space-y-1.5 text-[11px] min-w-0">
            {segments.map((seg, i) => {
              const pct = Math.round((seg.value / total) * 100);
              const isHovered = hoveredIndex === i;
              return (
                <div
                  key={seg.id || i}
                  className={`flex items-center gap-1.5 transition-all duration-150 ${onSegmentClick ? 'cursor-pointer hover:opacity-100' : ''} ${isHovered ? 'opacity-100 scale-105' : 'opacity-80'}`}
                  onClick={() => onSegmentClick?.(seg)}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-zinc-600 dark:text-zinc-400 truncate font-bold">{seg.label}</span>
                  <span className="font-mono font-bold text-zinc-500 dark:text-zinc-300 mr-auto">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
