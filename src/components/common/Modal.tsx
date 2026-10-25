import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl';
  closeOnBackdropClick?: boolean;
  hasUnsavedChanges?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  closeOnBackdropClick = false,
  hasUnsavedChanges = false
}) => {
  const [mounted, setMounted] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const scrollPositionRef = useRef<number>(0);
  const modalBoxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  // Background Scroll Locking, Scroll Position Restoration, and Auto-focus
  useEffect(() => {
    if (!isOpen) return;

    // 1. Record current scroll position before locking
    scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop || 0;

    // 2. Lock body scroll and compensate for scrollbar width to prevent layout shift
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // 3. Reset internal modal scroll position to top
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }

    // 4. Auto-focus first input / select / textarea in the form
    const focusTimer = setTimeout(() => {
      if (modalBoxRef.current) {
        const firstInput = modalBoxRef.current.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
        );
        if (firstInput) {
          firstInput.focus({ preventScroll: true });
        }
      }
    }, 60);

    // 5. Escape key handling
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);

      // Restore scroll lock
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.paddingRight = originalPaddingRight;

      // Restore previous scroll position
      window.scrollTo({
        top: scrollPositionRef.current,
        behavior: 'instant' as ScrollBehavior
      });
    };
  }, [isOpen, hasUnsavedChanges]);

  if (!isOpen || !mounted) return null;

  const maxWidthMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl'
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 select-none overflow-hidden"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      {/* Darkened Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => {
          if (closeOnBackdropClick) {
            handleRequestClose();
          }
        }}
      />

      {/* Centered Modal Box (Fully isolated from parent container transforms) */}
      <div
        ref={modalBoxRef}
        className={`relative w-full ${maxWidthMap[maxWidth]} bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-2xl shadow-2xl overflow-hidden z-10 animate-scale-up my-auto max-h-[90vh] sm:max-h-[88vh] flex flex-col select-text`}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-[#27272A] bg-gray-50/80 dark:bg-[#141417] shrink-0">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">{title}</h3>
            {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div ref={contentRef} className="p-5 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>

        {/* Unsaved Changes Confirmation Overlay inside Modal */}
        {showConfirmClose && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-30 flex items-center justify-center p-4 animate-fade-in text-right">
            <div className="bg-white dark:bg-[#1C1C20] border border-gray-200 dark:border-[#2E2E33] p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center gap-2.5 text-amber-500 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>هل تريد إلغاء وإغلاق النافذة؟</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                توجد بيانات قد تكون أدخلتها، إغلاق النافذة سيؤدي إلى فقدان التغييرات غير المحفوظة.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setShowConfirmClose(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200 text-xs font-bold transition-all cursor-pointer"
                >
                  متابعة الإدخال
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmClose(false);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  نعم، إغلاق وإلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};

