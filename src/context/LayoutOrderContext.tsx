import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

export interface DragItemInfo {
  containerId: string;
  id: string;
  index: number;
}

export interface DragOverInfo {
  containerId: string;
  id: string;
  index: number;
  placement: 'before' | 'after';
}

interface LayoutOrderContextType {
  orders: Record<string, string[]>;
  canReorder: boolean;
  activeDragItem: DragItemInfo | null;
  dragOverInfo: DragOverInfo | null;
  setActiveDragItem: (item: DragItemInfo | null) => void;
  setDragOverInfo: (info: DragOverInfo | null) => void;
  getOrderedItems: <T>(containerId: string, defaultItems: T[], getId?: (item: T) => string) => T[];
  reorderItem: (containerId: string, sourceIndex: number, targetIndex: number, defaultItemsOrder?: string[]) => void;
  moveItemUp: (containerId: string, itemId: string, defaultItemsOrder?: string[]) => void;
  moveItemDown: (containerId: string, itemId: string, defaultItemsOrder?: string[]) => void;
  resetContainerOrder: (containerId: string) => void;
  resetAllOrders: () => void;
  isContainerReordered: (containerId: string) => boolean;
  hasAnyCustomOrder: boolean;
}

export const LAYOUT_ORDER_STORAGE_KEY = 'nzm_jkr_ui_layout_orders_v1';
const STORAGE_KEY = LAYOUT_ORDER_STORAGE_KEY;

/**
 * Sort an array of items based on stored order for a given container.
 * Items not in the stored list are appended at the end in their original order.
 */
export function calculateOrderedItems<T>(
  storedOrder: string[] | undefined,
  defaultItems: T[],
  getId?: (item: T) => string
): T[] {
  const resolveId = getId || ((item: any) => item?.id ?? item?.key ?? String(item));

  if (!storedOrder || !Array.isArray(storedOrder) || storedOrder.length === 0) {
    return defaultItems;
  }

  const itemMap = new Map<string, T>();
  defaultItems.forEach(item => {
    itemMap.set(resolveId(item), item);
  });

  const result: T[] = [];
  const seenIds = new Set<string>();

  // 1. Add ordered items present in map
  storedOrder.forEach(id => {
    if (itemMap.has(id)) {
      result.push(itemMap.get(id)!);
      seenIds.add(id);
    }
  });

  // 2. Append any newly added / missing items
  defaultItems.forEach(item => {
    const id = resolveId(item);
    if (!seenIds.has(id)) {
      result.push(item);
    }
  });

  return result;
}

/**
 * Reorder items within the same container.
 * Handles visible items subset when defaultItemsOrder is provided.
 */
export function calculateReorder(
  existingOrder: string[] | undefined,
  sourceIndex: number,
  targetIndex: number,
  defaultItemsOrder?: string[]
): string[] {
  if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0) {
    return existingOrder ? [...existingOrder] : (defaultItemsOrder ? [...defaultItemsOrder] : []);
  }

  let currentOrder: string[];
  if (existingOrder && existingOrder.length > 0) {
    currentOrder = [...existingOrder];
    if (defaultItemsOrder) {
      defaultItemsOrder.forEach(id => {
        if (!currentOrder.includes(id)) currentOrder.push(id);
      });
    }
  } else {
    currentOrder = defaultItemsOrder ? [...defaultItemsOrder] : [];
  }

  if (currentOrder.length === 0) {
    return currentOrder;
  }

  if (defaultItemsOrder && defaultItemsOrder[sourceIndex] && defaultItemsOrder[targetIndex]) {
    const sourceId = defaultItemsOrder[sourceIndex];
    const targetId = defaultItemsOrder[targetIndex];

    const srcIdx = currentOrder.indexOf(sourceId);
    if (srcIdx === -1) return currentOrder;
    currentOrder.splice(srcIdx, 1);

    const tgtIdx = currentOrder.indexOf(targetId);
    if (tgtIdx === -1) {
      currentOrder.push(sourceId);
    } else {
      const insertIdx = sourceIndex < targetIndex ? tgtIdx + 1 : tgtIdx;
      currentOrder.splice(insertIdx, 0, sourceId);
    }
  } else {
    if (sourceIndex >= currentOrder.length || targetIndex >= currentOrder.length) return currentOrder;
    const [removed] = currentOrder.splice(sourceIndex, 1);
    currentOrder.splice(targetIndex, 0, removed);
  }

  return currentOrder;
}

/**
 * Move an item one position up in the ordered list (relative to visible items if defaultItemsOrder is passed)
 */
export function calculateMoveUp(
  existingOrder: string[] | undefined,
  itemId: string,
  defaultItemsOrder?: string[]
): string[] {
  let currentOrder: string[];
  if (existingOrder && existingOrder.length > 0) {
    currentOrder = [...existingOrder];
    if (defaultItemsOrder) {
      defaultItemsOrder.forEach(id => {
        if (!currentOrder.includes(id)) currentOrder.push(id);
      });
    }
  } else {
    currentOrder = defaultItemsOrder ? [...defaultItemsOrder] : [];
  }

  if (defaultItemsOrder && defaultItemsOrder.includes(itemId)) {
    const visibleIdx = defaultItemsOrder.indexOf(itemId);
    if (visibleIdx <= 0) return currentOrder;
    const prevVisibleId = defaultItemsOrder[visibleIdx - 1];

    const currIdx = currentOrder.indexOf(itemId);
    if (currIdx === -1) return currentOrder;
    currentOrder.splice(currIdx, 1);

    const targetIdx = currentOrder.indexOf(prevVisibleId);
    if (targetIdx === -1) {
      currentOrder.unshift(itemId);
    } else {
      currentOrder.splice(targetIdx, 0, itemId);
    }
  } else {
    const currentIndex = currentOrder.indexOf(itemId);
    if (currentIndex <= 0) return currentOrder;
    const targetIndex = currentIndex - 1;
    const [removed] = currentOrder.splice(currentIndex, 1);
    currentOrder.splice(targetIndex, 0, removed);
  }

  return currentOrder;
}

/**
 * Move an item one position down in the ordered list (relative to visible items if defaultItemsOrder is passed)
 */
export function calculateMoveDown(
  existingOrder: string[] | undefined,
  itemId: string,
  defaultItemsOrder?: string[]
): string[] {
  let currentOrder: string[];
  if (existingOrder && existingOrder.length > 0) {
    currentOrder = [...existingOrder];
    if (defaultItemsOrder) {
      defaultItemsOrder.forEach(id => {
        if (!currentOrder.includes(id)) currentOrder.push(id);
      });
    }
  } else {
    currentOrder = defaultItemsOrder ? [...defaultItemsOrder] : [];
  }

  if (defaultItemsOrder && defaultItemsOrder.includes(itemId)) {
    const visibleIdx = defaultItemsOrder.indexOf(itemId);
    if (visibleIdx === -1 || visibleIdx >= defaultItemsOrder.length - 1) return currentOrder;
    const nextVisibleId = defaultItemsOrder[visibleIdx + 1];

    const currIdx = currentOrder.indexOf(itemId);
    if (currIdx === -1) return currentOrder;
    currentOrder.splice(currIdx, 1);

    const targetIdx = currentOrder.indexOf(nextVisibleId);
    if (targetIdx === -1) {
      currentOrder.push(itemId);
    } else {
      currentOrder.splice(targetIdx + 1, 0, itemId);
    }
  } else {
    const currentIndex = currentOrder.indexOf(itemId);
    if (currentIndex === -1 || currentIndex >= currentOrder.length - 1) return currentOrder;
    const targetIndex = currentIndex + 1;
    const [removed] = currentOrder.splice(currentIndex, 1);
    currentOrder.splice(targetIndex, 0, removed);
  }

  return currentOrder;
}

const LayoutOrderContext = createContext<LayoutOrderContextType | undefined>(undefined);

export const LayoutOrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Owner, Admin, and active staff can modify layout order for their workspace
  const canReorder = Boolean(user || typeof window !== 'undefined');

  const [orders, setOrders] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.warn('Failed to load saved layout orders from localStorage', err);
    }
    return {};
  });

  const [activeDragItem, setActiveDragItem] = useState<DragItemInfo | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<DragOverInfo | null>(null);

  // Sync orders to localStorage on change
  useEffect(() => {
    try {
      if (Object.keys(orders).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Failed to persist layout orders', err);
    }
  }, [orders]);

  // Synchronize layout orders across browser tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          setOrders(e.newValue ? JSON.parse(e.newValue) : {});
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const getOrderedItems = useCallback(
    <T,>(containerId: string, defaultItems: T[], getId?: (item: T) => string): T[] => {
      return calculateOrderedItems(orders[containerId], defaultItems, getId);
    },
    [orders]
  );

  const reorderItem = useCallback(
    (containerId: string, sourceIndex: number, targetIndex: number, defaultItemsOrder?: string[]) => {
      if (!canReorder) return;
      setOrders(prev => ({
        ...prev,
        [containerId]: calculateReorder(prev[containerId], sourceIndex, targetIndex, defaultItemsOrder)
      }));
    },
    [canReorder]
  );

  const moveItemUp = useCallback(
    (containerId: string, itemId: string, defaultItemsOrder?: string[]) => {
      if (!canReorder) return;
      setOrders(prev => ({
        ...prev,
        [containerId]: calculateMoveUp(prev[containerId], itemId, defaultItemsOrder)
      }));
    },
    [canReorder]
  );

  const moveItemDown = useCallback(
    (containerId: string, itemId: string, defaultItemsOrder?: string[]) => {
      if (!canReorder) return;
      setOrders(prev => ({
        ...prev,
        [containerId]: calculateMoveDown(prev[containerId], itemId, defaultItemsOrder)
      }));
    },
    [canReorder]
  );

  /**
   * Reset order for a specific container to default
   */
  const resetContainerOrder = useCallback(
    (containerId: string) => {
      if (!canReorder) return;
      setOrders(prev => {
        const next = { ...prev };
        delete next[containerId];
        return next;
      });
    },
    [canReorder]
  );

  /**
   * Reset all customized orders across the whole system to default
   */
  const resetAllOrders = useCallback(() => {
    if (!canReorder) return;
    setOrders({});
    localStorage.removeItem(STORAGE_KEY);
    showToast('success', 'تمت استعادة الترتيب الافتراضي', 'تمت إعادة جميع الأقسام والتبويبات إلى الترتيب الأصلي للنظام');
  }, [canReorder, showToast]);

  const isContainerReordered = useCallback(
    (containerId: string): boolean => {
      return Boolean(orders[containerId] && orders[containerId].length > 0);
    },
    [orders]
  );

  const hasAnyCustomOrder = useMemo(() => {
    return Object.keys(orders).length > 0;
  }, [orders]);

  return (
    <LayoutOrderContext.Provider
      value={{
        orders,
        canReorder,
        activeDragItem,
        dragOverInfo,
        setActiveDragItem,
        setDragOverInfo,
        getOrderedItems,
        reorderItem,
        moveItemUp,
        moveItemDown,
        resetContainerOrder,
        resetAllOrders,
        isContainerReordered,
        hasAnyCustomOrder
      }}
    >
      {children}
    </LayoutOrderContext.Provider>
  );
};

export const useLayoutOrder = (): LayoutOrderContextType => {
  const context = useContext(LayoutOrderContext);
  if (!context) {
    throw new Error('useLayoutOrder must be used within a LayoutOrderProvider');
  }
  return context;
};
