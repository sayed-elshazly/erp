// =============================================================
// NZM JKR TOP UP ERP — Advanced SVG Line / Area Chart
// Beautiful Curved Trajectories, Gradient Fill, Tooltips
// =============================================================

import React, { useState } from 'react';

export interface LineChartPoint {
  label: string; // e.g. "1", "2", "3" or "السبت", "الأحد" or "12 ص"
  value: number;
  subValue?: string | number;
}

interface AdvancedLineChartProps {
  data: LineChartPoint[];
  title?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  strokeColor?: string;
  fillColor?: string;
  height?: number;
  formatValue?: (val: number) => string;
  className?: string;
}

export const AdvancedLineChart: React.FC<AdvancedLineChartProps> = ({
  data,
  title,
  yAxisLabel,
  xAxisLabel,
  strokeColor = '#f97316',
  fillColor = 'rgba(249, 115, 22, 0.12)',
  height = 220,
  formatValue,
  className = ''
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className={`p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center text-xs text-zinc-400 ${className}`}>
        لا توجد بيانات متاحة للعرض
      </div>
    );
  }

  const values = data.map(d => d.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1);
  const range = maxVal - minVal || 1;

  const svgWidth = 700;
  const svgHeight = 200;
  const paddingX = 30;
  const paddingY = 25;

  const innerWidth = svgWidth - paddingX * 2;
  const innerHeight = svgHeight - paddingY * 2;

  // Calculate coordinates
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * innerWidth;
    const y = svgHeight - paddingY - ((d.value - minVal) / range) * innerHeight;
    return { x, y, data: d, index: i };
  });

  // Construct SVG Path (smooth curve)
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    linePath += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Closed area path for gradient
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;

  const fmt = (v: number) => formatValue ? formatValue(v) : v.toLocaleString('ar-EG');

  return (
    <div className={`p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs ${className}`}>
      {/* Title & Y-Axis Label */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 dark:border-[#27272A]">
        <div>
          {title && <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100">{title}</h4>}
          {yAxisLabel && <p className="text-[10px] text-zinc-400 font-mono mt-0.5">محور Y: {yAxisLabel}</p>}
        </div>
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div className="text-left font-mono">
            <span className="text-[10px] text-zinc-400 ml-2">{points[hoveredIndex].data.label}:</span>
            <span className="text-xs font-black text-orange-500">
              {fmt(points[hoveredIndex].data.value)}
            </span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full" style={{ height }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`gradient_${strokeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeDasharray="3 3" />
          <line x1={paddingX} y1={paddingY + innerHeight / 2} x2={svgWidth - paddingX} y2={paddingY + innerHeight / 2} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeDasharray="3 3" />
          <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="currentColor" className="text-zinc-300 dark:text-zinc-700" />

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#gradient_${strokeColor.replace('#', '')})`} />

          {/* Line Stroke */}
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Points */}
          {points.map((p, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g key={idx}>
                {/* Invisible larger hover area */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {/* Visible dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 3.5}
                  fill={isHovered ? '#ffffff' : strokeColor}
                  stroke={strokeColor}
                  strokeWidth={isHovered ? 3 : 1.5}
                  className="transition-all duration-200 pointer-events-none"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* X-Axis Labels row */}
      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 mt-1 px-2 border-t border-gray-100 dark:border-[#27272A] pt-1">
        {data.filter((_, i) => data.length <= 12 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1).map((d, idx) => (
          <span key={idx}>{d.label}</span>
        ))}
      </div>

      {xAxisLabel && (
        <div className="text-center text-[10px] text-zinc-400 font-mono mt-1">
          محور X: {xAxisLabel}
        </div>
      )}
    </div>
  );
};
