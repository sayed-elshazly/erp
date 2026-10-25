import React from 'react';
import { ChevronLeft, Home } from 'lucide-react';

export interface BreadcrumbItem {
  id: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-zinc-400 py-1 select-none" dir="rtl">
      <button
        onClick={items[0]?.onClick}
        className="hover:text-orange-500 flex items-center gap-1 transition-colors font-medium"
      >
        <Home className="w-3.5 h-3.5 text-orange-500" />
      </button>

      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <ChevronLeft className="w-3 h-3 text-zinc-500 shrink-0" />
          {item.active || !item.onClick ? (
            <span className="font-bold text-gray-900 dark:text-zinc-100 truncate max-w-xs">
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className="hover:text-orange-500 transition-colors truncate max-w-xs font-medium"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
