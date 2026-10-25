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

const STORAGE_KEY = 'nzm_jkr_ui_layout_orders_v1';

const LayoutOrderContext = createContext<LayoutOrderContextType | undefined>(undefined);

export const LayoutOrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Only Owner and Admin can modify layout order
  const canReorder = Boolean(user && user.role === 'admin');

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

  /**
   * Sort an array of items based on stored order for a given container.
   * Items not in the stored list are appended at the end in their original order.
   */
  const getOrderedItems = useCallback(
    <T,>(containerId: string, defaultItems: T[], getId?: (item: T) => string): T[] => {
      const storedOrder = orders[containerId];
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
    },
    [orders]
  );

  /**
   * Reorder items within the same container.
   * Prevents reordering across different containers (Strict rule).
   */
  const reorderItem = useCallback(
    (containerId: string, sourceIndex: number, targetIndex: number, defaultItemsOrder?: string[]) => {
      if (!canReorder) {
        showToast('error', 'غير مصرح', 'ترتيب الواجهة متاح فقط للمدير والمالك.');
        return;
      }

      if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0) {
        return;
      }

      setOrders(prev => {
        const currentOrder = prev[containerId] && prev[containerId].length > 0
          ? [...prev[containerId]]
          : (defaultItemsOrder ? [...defaultItemsOrder] : []);

        if (currentOrder.length === 0) {
          return prev;
        }

        const [removed] = currentOrder.splice(sourceIndex, 1);
        currentOrder.splice(targetIndex, 0, removed);

        return {
          ...prev,
          [containerId]: currentOrder
        };
      });
    },
    [canReorder, showToast]
  );

  /**
   * Move an item one position up in the ordered list
   */
  const moveItemUp = useCallback(
    (containerId: string, itemId: string, defaultItemsOrder?: string[]) => {
      if (!canReorder) {
        showToast('error', 'غير مصرح', 'ترتيب الواجهة متاح فقط للمدير والمالك.');
        return;
      }

      setOrders(prev => {
        const currentOrder = prev[containerId] && prev[containerId].length > 0
          ? [...prev[containerId]]
          : (defaultItemsOrder ? [...defaultItemsOrder] : []);

        const currentIndex = currentOrder.indexOf(itemId);
        if (currentIndex <= 0) return prev; // already at top or not found

        const targetIndex = currentIndex - 1;
        const [removed] = currentOrder.splice(currentIndex, 1);
        currentOrder.splice(targetIndex, 0, removed);

        return {
          ...prev,
          [containerId]: currentOrder
        };
      });
    },
    [canReorder, showToast]
  );

  /**
   * Move an item one position down in the ordered list
   */
  const moveItemDown = useCallback(
    (containerId: string, itemId: string, defaultItemsOrder?: string[]) => {
      if (!canReorder) {
        showToast('error', 'غير مصرح', 'ترتيب الواجهة متاح فقط للمدير والمالك.');
        return;
      }

      setOrders(prev => {
        const currentOrder = prev[containerId] && prev[containerId].length > 0
          ? [...prev[containerId]]
          : (defaultItemsOrder ? [...defaultItemsOrder] : []);

        const currentIndex = currentOrder.indexOf(itemId);
        if (currentIndex === -1 || currentIndex >= currentOrder.length - 1) return prev; // already at bottom or not found

        const targetIndex = currentIndex + 1;
        const [removed] = currentOrder.splice(currentIndex, 1);
        currentOrder.splice(targetIndex, 0, removed);

        return {
          ...prev,
          [containerId]: currentOrder
        };
      });
    },
    [canReorder, showToast]
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
