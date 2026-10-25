import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  isOpen,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Viewport boundaries adjustments
  const menuWidth = 200;
  const menuHeight = items.length * 36;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-52 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-xl shadow-2xl p-1 text-xs select-none animate-fade-in divide-y divide-gray-100 dark:divide-[#2A2A2A]"
      dir="rtl"
    >
      <div className="py-1">
        {items.map(item => (
          <React.Fragment key={item.id}>
            <button
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors text-right ${
                item.variant === 'danger'
                  ? 'text-rose-500 hover:bg-rose-500/10'
                  : 'text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </div>
              {item.shortcut && (
                <kbd className="text-[10px] text-zinc-400 font-mono">{item.shortcut}</kbd>
              )}
            </button>
            {item.divider && <div className="my-1 border-t border-gray-100 dark:border-[#2A2A2A]" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
