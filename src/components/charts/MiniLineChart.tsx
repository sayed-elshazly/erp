// =============================================================
// NZM JKR TOP UP ERP — Mini Line/Area Chart (SVG-Based)
// Trend visualization with interactive data points
// =============================================================

import React, { useState, useMemo } from 'react';

export interface LineChartDataPoint {
  label: string;
  value: number;
  id?: string;
}

interface MiniLineChartProps {
  data: LineChartDataPoint[];
  title?: string;
  height?: number;
  width?: number;
  color?: string;
  fillArea?: boolean;
  showDots?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  formatValue?: (val: number) => string;
  onPointClick?: (point: LineChartDataPoint, index: number) => void;
  className?: string;
}

export const MiniLineChart: React.FC<MiniLineChartProps> = ({
  data,
  title,
  height = 160,
  color = '#f97316',
  fillArea = true,
  showDots = true,
  showGrid = true,
  showLabels = true,
  formatValue,
  onPointClick,
  className = ''
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fmt = (v: number) => formatValue ? formatValue(v) : v.toLocaleString('ar-EG');

  const chartWidth = 400;
  const chartHeight = height - 30; // leave room for labels
  const padding = { top: 15, right: 10, bottom: 5, left: 10 };

  const points = useMemo(() => {
    if (data.length === 0) return [];
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const minVal = Math.min(...data.map(d => d.value), 0);
    const range = maxVal - minVal || 1;

    return data.map((d, i) => ({
      x: padding.left + (i / Math.max(data.length - 1, 1)) * (chartWidth - padding.left - padding.right),
      y: padding.top + (1 - (d.value - minVal) / range) * (chartHeight - padding.top - padding.bottom),
      ...d
    }));
  }, [data, chartHeight]);

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-zinc-500 text-xs ${className}`} style={{ height }}>
        لا توجد بيانات
      </div>
    );
  }

  // Build SVG path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Area path (filled below the line)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${points[0].x} ${chartHeight - padding.bottom} Z`;

  // Grid lines
  const gridLines = showGrid ? [0.25, 0.5, 0.75].map(pct => ({
    y: padding.top + pct * (chartHeight - padding.top - padding.bottom)
  })) : [];

  return (
    <div className={`${className}`}>
      {title && (
        <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">{title}</h4>
      )}

      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {/* Gradient Definition */}
        <defs>
          <linearGradient id={`area-gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {gridLines.map((gl, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={gl.y}
            x2={chartWidth - padding.right}
            y2={gl.y}
            stroke="currentColor"
            strokeOpacity="0.07"
            strokeDasharray="4 4"
          />
        ))}

        {/* Area Fill */}
        {fillArea && (
          <path
            d={areaPath}
            fill={`url(#area-gradient-${color.replace('#', '')})`}
            className="transition-all duration-500"
          />
        )}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500"
        />

        {/* Interactive Dots */}
        {showDots && points.map((p, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <g key={i}>
              {/* Hover area (larger for easier interaction) */}
              <circle
                cx={p.x}
                cy={p.y}
                r={16}
                fill="transparent"
                className={onPointClick ? 'cursor-pointer' : ''}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onPointClick?.(data[i], i)}
              />

              {/* Visible dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5 : 3}
                fill={color}
                stroke="white"
                strokeWidth="2"
                className="transition-all duration-200"
                style={{
                  filter: isHovered ? `drop-shadow(0 0 6px ${color}60)` : 'none'
                }}
              />

              {/* Tooltip */}
              {isHovered && (
                <g>
                  <rect
                    x={p.x - 30}
                    y={p.y - 32}
                    width={60}
                    height={20}
                    rx={6}
                    fill={color}
                    opacity="0.95"
                  />
                  <text
                    x={p.x}
                    y={p.y - 18}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {fmt(p.value)}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Bottom Labels */}
        {showLabels && points.map((p, i) => {
          // Show every other label to avoid overcrowding
          if (data.length > 8 && i % 2 !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={`label-${i}`}
              x={p.x}
              y={height - 2}
              textAnchor="middle"
              fill="currentColor"
              fillOpacity="0.4"
              fontSize="9"
              fontWeight="bold"
            >
              {p.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
