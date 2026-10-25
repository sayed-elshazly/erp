import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { useSmartDropdownPosition } from '../../hooks/useSmartDropdownPosition';

export interface SearchableSelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeClassName?: string;
  colorClassName?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allOptionLabel?: string;
  allowAll?: boolean;
  required?: boolean;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'اختر...',
  allOptionLabel = 'الكل',
  allowAll = true,
  required = false,
  searchPlaceholder,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dropdownStyle = useSmartDropdownPosition({
    isOpen,
    triggerRef: containerRef,
    dropdownRef,
    preferredAlignment: 'right',
    padding: 10,
    marginTop: 6
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(-1);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    !search.trim() ||
    opt.label.toLowerCase().includes(search.toLowerCase().trim()) ||
    opt.value.toLowerCase().includes(search.toLowerCase().trim())
  );

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption
    ? selectedOption.label
    : (allowAll && (value === 'all' || !value))
    ? allOptionLabel
    : placeholder;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        const opt = filteredOptions[focusedIndex];
        if (!opt.disabled) {
          onChange(opt.value);
          setIsOpen(false);
        }
      } else if (filteredOptions.length > 0) {
        const firstActive = filteredOptions.find(o => !o.disabled);
        if (firstActive) {
          onChange(firstActive.value);
          setIsOpen(false);
        }
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative text-xs ${className}`} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-[#18181B] border p-2 text-right transition-all cursor-pointer select-none font-bold ${
          isOpen
            ? 'border-orange-500 ring-2 ring-orange-500/20 text-orange-500'
            : value && value !== 'all'
            ? 'border-orange-500/40 text-zinc-900 dark:text-zinc-100 hover:border-orange-500/70'
            : 'border-gray-200 dark:border-[#27272A] text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {selectedOption?.icon}
          <span className={`truncate ${selectedOption?.colorClassName || ''}`}>{displayLabel}</span>
          {selectedOption?.badge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
              selectedOption.badgeClassName || 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
            }`}>
              {selectedOption.badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-zinc-400">
          {allowAll && !required && value && value !== 'all' && (
            <span
              onClick={e => {
                e.stopPropagation();
                onChange('all');
              }}
              className="p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
              title="إلغاء التحديد"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-500' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="absolute z-50 w-full min-w-[240px] rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-2xl p-2 space-y-1.5 animate-fade-in backdrop-blur-md"
        >
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder || `بحث سريع داخل الخيارات...`}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setFocusedIndex(0);
              }}
              className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] pr-8 pl-7 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFocusedIndex(-1);
                }}
                className="absolute left-2.5 top-2 text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-1 no-scrollbar py-0.5">
            {/* All Option (if allowed) */}
            {allowAll && (
              <button
                type="button"
                onClick={() => {
                  onChange('all');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-right font-bold transition-all cursor-pointer ${
                  value === 'all' || !value
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>{allOptionLabel}</span>
                {(value === 'all' || !value) && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-zinc-400 text-[11px]">
                لا توجد نتائج مطابقة لـ "{search}"
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isKeyboardFocused = idx === focusedIndex;
                const isOptDisabled = opt.disabled;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isOptDisabled}
                    onClick={() => {
                      if (!isOptDisabled) {
                        onChange(opt.value);
                        setIsOpen(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-right transition-all cursor-pointer ${
                      isOptDisabled
                        ? 'opacity-40 cursor-not-allowed bg-gray-100/50 dark:bg-zinc-900/50'
                        : isSelected
                        ? 'bg-orange-500 text-white font-bold shadow-xs'
                        : isKeyboardFocused
                        ? 'bg-orange-500/10 text-orange-500 font-bold border border-orange-500/30'
                        : `${opt.colorClassName || 'text-zinc-700 dark:text-zinc-300'} hover:bg-gray-100 dark:hover:bg-zinc-800`
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon}
                      <span className="truncate font-semibold">{opt.label}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {opt.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : opt.badgeClassName || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        }`}>
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
