import React, { useState, useEffect } from 'react';
import { CustomerSource } from '../../types/customer.types';
import { GripVertical, RotateCcw } from 'lucide-react';

export interface PlatformConfig {
  id: CustomerSource;
  name: string;
  nameEn: string;
  icon: (className?: string) => React.ReactNode;
  activeClass: string;
  inactiveClass: string;
  badgeClass: string;
  dotColor: string;
  glowColor: string;
}

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    id: 'whatsapp',
    name: 'واتساب',
    nameEn: 'WhatsApp',
    dotColor: '#25D366',
    glowColor: 'rgba(37, 211, 102, 0.4)',
    activeClass:
      'bg-[#25D366] text-white border-[#25D366] ring-2 ring-[#25D366]/40 shadow-lg shadow-[#25D366]/25 scale-[1.02]',
    inactiveClass:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50',
    badgeClass: 'bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30',
    icon: (className = 'w-4 h-4') => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.544 1.83.82 2.79.82 3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.767-5.766zm3.385 8.163c-.145.411-.75.762-1.042.809-.272.043-.625.076-1.921-.462-1.57-.652-2.584-2.247-2.663-2.351-.077-.105-.637-.848-.637-1.618 0-.77.399-1.15.541-1.306.143-.156.312-.195.417-.195.104 0 .209.002.299.006.096.004.225-.036.35.267.13.313.443 1.08.482 1.16.039.08.065.174.013.279-.052.104-.078.17-.156.26-.078.092-.164.205-.235.275-.078.077-.16.162-.069.318.091.156.405.669.87 1.082.598.532 1.102.697 1.258.775.156.078.247.065.338-.039.091-.104.391-.455.495-.611.104-.156.208-.13.351-.078.143.052.909.428 1.065.506.156.078.26.117.299.182.039.065.039.377-.106.788zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.435 5.176L2 22l4.957-1.39A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.617 0-3.12-.464-4.394-1.267l-.315-.198-2.927.819.825-2.85-.205-.327A8.136 8.136 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z" />
      </svg>
    )
  },
  {
    id: 'tiktok',
    name: 'تيك توك',
    nameEn: 'TikTok',
    dotColor: '#00F2FE',
    glowColor: 'rgba(0, 242, 254, 0.4)',
    activeClass:
      'bg-black text-white border-zinc-700 ring-2 ring-cyan-400/50 shadow-lg shadow-rose-500/25 scale-[1.02]',
    inactiveClass:
      'bg-zinc-900/80 text-zinc-300 border-zinc-700/80 hover:bg-black hover:border-zinc-500 hover:text-white',
    badgeClass: 'bg-black/80 text-zinc-100 border-zinc-700',
    icon: (className = 'w-4 h-4') => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    )
  },
  {
    id: 'instagram',
    name: 'انستجرام',
    nameEn: 'Instagram',
    dotColor: '#E1306C',
    glowColor: 'rgba(225, 48, 108, 0.4)',
    activeClass:
      'bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#C13584] text-white border-rose-400 ring-2 ring-rose-500/40 shadow-lg shadow-rose-500/25 scale-[1.02]',
    inactiveClass:
      'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50',
    badgeClass: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
    icon: (className = 'w-4 h-4') => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    )
  },
  {
    id: 'messenger',
    name: 'ماسنجر',
    nameEn: 'Messenger',
    dotColor: '#0084FF',
    glowColor: 'rgba(0, 132, 255, 0.4)',
    activeClass:
      'bg-[#0084FF] text-white border-[#0084FF] ring-2 ring-[#0084FF]/40 shadow-lg shadow-[#0084FF]/25 scale-[1.02]',
    inactiveClass:
      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50',
    badgeClass: 'bg-[#0084FF]/15 text-[#0084FF] border-[#0084FF]/30',
    icon: (className = 'w-4 h-4') => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.082.3 2.23.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26 6.559-6.963 3.13 3.259 5.889-3.259-6.56 6.963z" />
      </svg>
    )
  },
  {
    id: 'telegram',
    name: 'تليجرام',
    nameEn: 'Telegram',
    dotColor: '#229ED9',
    glowColor: 'rgba(34, 158, 217, 0.4)',
    activeClass:
      'bg-[#229ED9] text-white border-[#229ED9] ring-2 ring-[#229ED9]/40 shadow-lg shadow-[#229ED9]/25 scale-[1.02]',
    inactiveClass:
      'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/20 hover:border-sky-500/50',
    badgeClass: 'bg-[#229ED9]/15 text-[#229ED9] border-[#229ED9]/30',
    icon: (className = 'w-4 h-4') => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    )
  },
  {
    id: 'other',
    name: 'أخرى',
    nameEn: 'Other',
    dotColor: '#71717A',
    glowColor: 'rgba(113, 113, 122, 0.3)',
    activeClass:
      'bg-zinc-700 text-white border-zinc-500 ring-2 ring-zinc-500/40 shadow-lg shadow-zinc-600/25 scale-[1.02]',
    inactiveClass:
      'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/20 hover:border-zinc-500/50',
    badgeClass: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    icon: (className = 'w-4 h-4') => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
      </svg>
    )
  }
];

export const PLATFORMS_ORDER_STORAGE_KEY = 'nzm_platform_sources_order';

export const getSavedPlatformOrder = (): CustomerSource[] => {
  try {
    const saved = localStorage.getItem(PLATFORMS_ORDER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as CustomerSource[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const allIds = PLATFORM_CONFIGS.map(p => p.id);
        const validSaved = parsed.filter(id => allIds.includes(id));
        const missing = allIds.filter(id => !validSaved.includes(id));
        return [...validSaved, ...missing];
      }
    }
  } catch (e) {
    console.error('Failed to load platform sources order', e);
  }
  return PLATFORM_CONFIGS.map(p => p.id);
};

export function getPlatformConfig(source?: CustomerSource | string | null): PlatformConfig {
  if (!source) return PLATFORM_CONFIGS[0]; // WhatsApp default
  const found = PLATFORM_CONFIGS.find(p => p.id === source);
  if (found) return found;
  if (source === 'facebook') return PLATFORM_CONFIGS.find(p => p.id === 'messenger') || PLATFORM_CONFIGS[0];
  return PLATFORM_CONFIGS.find(p => p.id === 'other') || PLATFORM_CONFIGS[0];
}

interface PlatformSourceSelectorProps {
  value: CustomerSource;
  onChange: (val: CustomerSource) => void;
  label?: string;
  className?: string;
}

export const PlatformSourceSelector: React.FC<PlatformSourceSelectorProps> = ({
  value = 'whatsapp',
  onChange,
  label = 'منصة التواصل *',
  className = ''
}) => {
  const [platformOrder, setPlatformOrder] = useState<CustomerSource[]>(getSavedPlatformOrder);
  const [draggedId, setDraggedId] = useState<CustomerSource | null>(null);
  const [dragOverId, setDragOverId] = useState<CustomerSource | null>(null);

  // Sync state with storage if updated elsewhere
  useEffect(() => {
    const loaded = getSavedPlatformOrder();
    setPlatformOrder(loaded);
  }, []);

  const handleDragStart = (e: React.DragEvent, id: CustomerSource) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: CustomerSource) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: CustomerSource) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newOrder = [...platformOrder];
    const fromIndex = newOrder.indexOf(draggedId);
    const toIndex = newOrder.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, draggedId);
      setPlatformOrder(newOrder);
      try {
        localStorage.setItem(PLATFORMS_ORDER_STORAGE_KEY, JSON.stringify(newOrder));
      } catch (err) {
        console.error(err);
      }
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleResetOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultOrder = PLATFORM_CONFIGS.map(p => p.id);
    setPlatformOrder(defaultOrder);
    localStorage.removeItem(PLATFORMS_ORDER_STORAGE_KEY);
  };

  // Map order IDs to config objects
  const orderedConfigs = platformOrder.map(id => getPlatformConfig(id));

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{label}</span>
            <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">
              (يمكنك سحب وإفلات أي منصة لتغيير ترتيبها ⇄)
            </span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetOrder}
              className="text-[10px] text-zinc-400 hover:text-orange-500 flex items-center gap-0.5 transition-colors cursor-pointer"
              title="استعادة الترتيب الافتراضي للمنصات"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>إعادة الضبط</span>
            </button>
            <span className="text-[10px] text-zinc-400 font-mono">
              المحدد حالياً: <strong className="text-zinc-800 dark:text-zinc-200">{getPlatformConfig(value).name}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Grid of Draggable Platform Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 select-none">
        {orderedConfigs.map(platform => {
          const isSelected = value === platform.id;
          const isDragging = draggedId === platform.id;
          const isDragTarget = dragOverId === platform.id;

          return (
            <div
              key={platform.id}
              draggable
              onDragStart={e => handleDragStart(e, platform.id)}
              onDragOver={e => handleDragOver(e, platform.id)}
              onDrop={e => handleDrop(e, platform.id)}
              onDragEnd={handleDragEnd}
              onClick={() => onChange(platform.id)}
              title="انقر للاختيار، أو اسحب لتغيير الترتيب"
              className={`relative flex items-center justify-between px-2.5 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
                isSelected ? platform.activeClass : platform.inactiveClass
              } ${isDragging ? 'opacity-40 scale-95 border-dashed' : ''} ${
                isDragTarget && !isDragging ? 'ring-2 ring-orange-500 border-orange-500 scale-105 shadow-md z-10' : ''
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="shrink-0">{platform.icon('w-4 h-4')}</span>
                <span className="truncate">{platform.name}</span>
              </div>

              {/* Drag Handle Icon */}
              <div className="flex items-center gap-1 shrink-0 text-zinc-400/70 hover:text-zinc-200">
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs animate-ping" />
                )}
                <GripVertical className="w-3.5 h-3.5 cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface PlatformSourceBadgeProps {
  source?: CustomerSource | string | null;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const PlatformSourceBadge: React.FC<PlatformSourceBadgeProps> = ({
  source,
  size = 'sm',
  showLabel = true,
  className = ''
}) => {
  const config = getPlatformConfig(source);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-2'
  }[size];

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4'
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-bold font-sans transition-all ${config.badgeClass} ${sizeClasses} ${className}`}
      title={`مصدر التواصل: ${config.name}`}
    >
      <span className="shrink-0">{config.icon(iconSizes)}</span>
      {showLabel && <span>{config.name}</span>}
    </span>
  );
};
