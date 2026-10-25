import { useState, useEffect, RefObject } from 'react';

export interface SmartPositionOptions {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  dropdownRef: RefObject<HTMLElement | null>;
  preferredAlignment?: 'auto' | 'right' | 'left';
  padding?: number;
  marginTop?: number;
}

/**
 * Custom hook to dynamically position dropdowns and popups so they NEVER
 * get cut off or clipped by the screen edges or modal boundaries,
 * taking into account RTL/LTR layout, trigger position, and responsive widths.
 */
export function useSmartDropdownPosition({
  isOpen,
  triggerRef,
  dropdownRef,
  preferredAlignment = 'auto',
  padding = 12,
  marginTop = 8
}: SmartPositionOptions): React.CSSProperties {
  const [style, setStyle] = useState<React.CSSProperties>({
    right: preferredAlignment === 'right' ? 0 : 'auto',
    left: preferredAlignment === 'left' ? 0 : 'auto',
    maxWidth: `calc(100vw - ${padding * 2}px)`
  });

  useEffect(() => {
    if (!isOpen) return;

    const calculatePosition = () => {
      const triggerEl = triggerRef.current;
      const dropdownEl = dropdownRef.current;
      if (!triggerEl) return;

      const triggerRect = triggerEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // 1. Detect Containing Scrollable Parent / Modal Boundaries
      const containerEl = triggerEl.closest<HTMLElement>(
        '[role="dialog"], .overflow-y-auto, .overflow-hidden, .overflow-x-auto, div[class*="max-w-"]'
      );
      const containerRect = containerEl ? containerEl.getBoundingClientRect() : null;

      // Horizontal boundaries (must be inside both viewport and container)
      const minLeft = Math.max(padding, containerRect ? containerRect.left + padding : padding);
      const maxRight = Math.min(viewportWidth - padding, containerRect ? containerRect.right - padding : viewportWidth - padding);
      const availableWidth = Math.max(280, maxRight - minLeft);

      // Dropdown dimensions (use real rendered size or fallback)
      const fallbackWidth = viewportWidth < 640 ? 320 : 440;
      const dropdownWidth = dropdownEl
        ? Math.max(dropdownEl.offsetWidth, dropdownEl.getBoundingClientRect().width, 300)
        : fallbackWidth;
      const dropdownHeight = dropdownEl?.offsetHeight || 380;

      // Determine effective alignment if 'auto':
      // If trigger is in the left half of the available space, opening towards right ('left') is best.
      // If trigger is in the right half, opening towards left ('right') is best.
      let alignment = preferredAlignment;
      if (alignment === 'auto') {
        const triggerCenter = triggerRect.left + triggerRect.width / 2;
        const boundaryCenter = (minLeft + maxRight) / 2;
        alignment = triggerCenter < boundaryCenter ? 'left' : 'right';
      }

      // 2. Horizontal Boundary Calculation & Clamping
      const leftIfRightAligned = triggerRect.right - dropdownWidth;
      const rightIfLeftAligned = triggerRect.left + dropdownWidth;

      let computedLeft: number | string = 'auto';
      let computedRight: number | string = 'auto';

      if (alignment === 'left') {
        // Prefer left-aligned (extends to the right)
        if (rightIfLeftAligned <= maxRight && triggerRect.left >= minLeft) {
          computedLeft = 0;
          computedRight = 'auto';
        } else if (leftIfRightAligned >= minLeft && triggerRect.right <= maxRight) {
          // Flip to right-aligned
          computedRight = 0;
          computedLeft = 'auto';
        } else {
          // Clamp exact offset to stay strictly within [minLeft, maxRight]
          const targetLeft = Math.max(minLeft, Math.min(triggerRect.left, maxRight - dropdownWidth));
          computedLeft = `${Math.round(targetLeft - triggerRect.left)}px`;
          computedRight = 'auto';
        }
      } else {
        // Prefer right-aligned (extends to the left)
        if (leftIfRightAligned >= minLeft && triggerRect.right <= maxRight) {
          computedRight = 0;
          computedLeft = 'auto';
        } else if (rightIfLeftAligned <= maxRight && triggerRect.left >= minLeft) {
          // Flip to left-aligned
          computedLeft = 0;
          computedRight = 'auto';
        } else {
          // Clamp exact offset to stay strictly within [minLeft, maxRight]
          const targetLeft = Math.max(minLeft, Math.min(leftIfRightAligned, maxRight - dropdownWidth));
          computedLeft = `${Math.round(targetLeft - triggerRect.left)}px`;
          computedRight = 'auto';
        }
      }

      // 3. Vertical Placement (Flip upward if not enough space below)
      let computedTop: number | string = `calc(100% + ${marginTop}px)`;
      let computedBottom: number | string = 'auto';

      const spaceBelowViewport = viewportHeight - triggerRect.bottom;
      const spaceBelowContainer = containerRect ? containerRect.bottom - triggerRect.bottom : spaceBelowViewport;
      const spaceBelow = Math.min(spaceBelowViewport, spaceBelowContainer);
      const spaceAbove = triggerRect.top - (containerRect ? containerRect.top : 0);

      if (spaceBelow < Math.min(dropdownHeight, 350) && spaceAbove > spaceBelow) {
        computedTop = 'auto';
        computedBottom = `calc(100% + ${marginTop}px)`;
      }

      setStyle({
        left: computedLeft,
        right: computedRight,
        top: computedTop,
        bottom: computedBottom,
        maxWidth: `${Math.min(viewportWidth - padding * 2, availableWidth)}px`
      });
    };

    calculatePosition();

    const frameId = requestAnimationFrame(calculatePosition);
    const timerId = setTimeout(calculatePosition, 50);

    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timerId);
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isOpen, triggerRef, dropdownRef, preferredAlignment, padding, marginTop]);

  return style;
}

