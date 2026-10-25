// =============================================================
// NZM JKR TOP UP ERP — Progress Metric Component
// Advanced progress bar with title, value, and percentage
// =============================================================

import React from 'react';

interface ProgressMetricProps {
  label: string;
  value: string | number;
  percentage: number;
  color?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const ProgressMetric: React.FC<ProgressMetricProps> = ({
  label,
  value,
  percentage,
  color = '#f97316',
  icon,
  subtitle,
  onClick,
  className = '',
  size = 'md'
}) => {
  const pct = Math.min(100, Math.max(0, percentage));

  return (
    <div
      className={`p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/40 space-y-2 transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-opacity-60 hover:shadow-sm' : ''} ${className}`}
      onClick={onClick}
      style={onClick ? { borderColor: `${color}30` } : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon && <span style={{ color }}>{icon}</span>}
          <span className={`font-bold text-zinc-700 dark:text-zinc-300 ${size === 'sm' ? 'text-[10px]' : 'text-[11px]'}`}>
            {label}
          </span>
        </div>
        <span className={`font-mono font-black text-zinc-900 dark:text-zinc-100 ${size === 'sm' ? 'text-[11px]' : 'text-xs'}`}>
          {value}
        </span>
      </div>

      {/* Progress Bar */}
      <div className={`rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2'}`}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {subtitle && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">{subtitle}</span>
          <span className="text-[10px] font-mono font-bold" style={{ color }}>
            {pct}%
          </span>
        </div>
      )}
    </div>
  );
};
