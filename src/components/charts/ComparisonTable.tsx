// =============================================================
// NZM JKR TOP UP ERP — Department Comparison Table
// Multi-column comparison with visual indicators
// =============================================================

import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../common/Badge';

export interface ComparisonRow {
  label: string;
  customers: number;
  dealers: number;
  middleman: number;
  subscriptions: number;
  total: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
}

interface ComparisonTableProps {
  rows: ComparisonRow[];
  title?: string;
  onCellClick?: (department: string, metric: string) => void;
  className?: string;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  rows,
  title,
  onCellClick,
  className = ''
}) => {
  const fmt = (val: number, isCurrency?: boolean, isPercentage?: boolean) => {
    if (isPercentage) return `${val}%`;
    if (isCurrency) return formatCurrency(val);
    return val.toLocaleString('ar-EG');
  };

  const maxByRow = (row: ComparisonRow) =>
    Math.max(row.customers, row.dealers, row.middleman, row.subscriptions, 1);

  const getCellClass = (val: number, max: number) => {
    const ratio = val / max;
    if (ratio >= 0.9) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black';
    if (ratio >= 0.5) return 'text-zinc-700 dark:text-zinc-200 font-bold';
    return 'text-zinc-500 dark:text-zinc-400';
  };

  const departments = [
    { key: 'customers', label: 'الزبائن', color: 'text-orange-500', border: 'border-orange-500/20' },
    { key: 'dealers', label: 'التجار', color: 'text-amber-500', border: 'border-amber-500/20' },
    { key: 'middleman', label: 'الوساطة', color: 'text-purple-500', border: 'border-purple-500/20' },
    { key: 'subscriptions', label: 'الاشتراكات', color: 'text-pink-500', border: 'border-pink-500/20' }
  ];

  return (
    <div className={`overflow-x-auto ${className}`}>
      {title && (
        <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-3">{title}</h4>
      )}

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-zinc-800">
            <th className="text-right py-2.5 px-3 font-bold text-zinc-500 dark:text-zinc-400 w-[18%]">
              المؤشر
            </th>
            {departments.map(dept => (
              <th key={dept.key} className={`py-2.5 px-2 font-bold ${dept.color} text-center w-[16%]`}>
                {dept.label}
              </th>
            ))}
            <th className="py-2.5 px-3 font-black text-zinc-900 dark:text-zinc-100 text-center w-[18%] bg-gray-50 dark:bg-zinc-900/50 rounded-tr-lg">
              الإجمالي
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const max = maxByRow(row);
            return (
              <tr
                key={i}
                className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 transition-colors"
              >
                <td className="py-2.5 px-3 font-bold text-zinc-700 dark:text-zinc-300">
                  {row.label}
                </td>
                {['customers', 'dealers', 'middleman', 'subscriptions'].map(key => {
                  const val = row[key as keyof ComparisonRow] as number;
                  return (
                    <td
                      key={key}
                      className={`py-2.5 px-2 text-center font-mono text-[11px] ${getCellClass(val, max)} ${onCellClick ? 'cursor-pointer hover:underline' : ''}`}
                      onClick={() => onCellClick?.(key, row.label)}
                    >
                      {fmt(val, row.isCurrency, row.isPercentage)}
                    </td>
                  );
                })}
                <td className="py-2.5 px-3 text-center font-mono font-black text-zinc-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900/50 text-[11px]">
                  {fmt(row.total, row.isCurrency, row.isPercentage)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
