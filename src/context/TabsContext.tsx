import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface TabItem {
  id: string;
  title: string;
  section: string;
  iconType:
    | 'dashboard'
    | 'tickets'
    | 'customers'
    | 'dealers'
    | 'dealer_tickets'
    | 'dealer_catalog'
    | 'dealer_coupons'
    | 'dealer_reports'
    | 'merchants'
    | 'catalog'
    | 'coupons'
    | 'reports'
    | 'finance'
    | 'settings'
    | 'customer_profile'
    | 'dealer_profile'
    | 'dealer_settings'
    | 'merchant_profile'
    | 'competitions';
  payload?: any;
  closable: boolean;
}

interface TabsContextType {
  tabs: TabItem[];
  activeTabId: string;
  openTab: (tab: Omit<TabItem, 'closable'> & { closable?: boolean }) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  moveTab: (tabId: string, direction: 'left' | 'right') => void;
  reorderTabs: (sourceIndex: number, destinationIndex: number) => void;
  setActiveTabId: (tabId: string) => void;
  activeTab: TabItem | undefined;
}

const defaultTabs: TabItem[] = [
  {
    id: 'dashboard',
    title: 'الداشبورد',
    section: 'dashboard',
    iconType: 'dashboard',
    closable: false
  }
];

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export const TabsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    try {
      const saved = localStorage.getItem('nzm_jkr_active_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out deprecated tabs like brokerage / subscriptions / codes / dealer_codes
          const valid = parsed.filter(
            t =>
              t.section !== 'brokerage' &&
              t.section !== 'subscriptions' &&
              t.section !== 'codes' &&
              t.section !== 'dealer_codes' &&
              t.id !== 'codes' &&
              t.id !== 'dealer_codes'
          );
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return defaultTabs;
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedActive = localStorage.getItem('nzm_jkr_active_tab_id');
    if (savedActive === 'codes' || savedActive === 'dealer_codes') return 'dashboard';
    return savedActive || 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('nzm_jkr_active_tabs', JSON.stringify(tabs));
      localStorage.setItem('nzm_jkr_active_tab_id', activeTabId);
    } catch {}
  }, [tabs, activeTabId]);

  const openTab = useCallback((tab: Omit<TabItem, 'closable'> & { closable?: boolean }) => {
    setTabs(prevTabs => {
      const exists = prevTabs.find(t => t.id === tab.id);
      if (exists) {
        return prevTabs.map(t => (t.id === tab.id ? { ...t, ...tab, closable: tab.closable ?? t.closable } : t));
      }
      return [...prevTabs, { ...tab, closable: tab.closable ?? (tab.id !== 'dashboard') }];
    });
    setActiveTabId(tab.id);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const tabToClose = prevTabs.find(t => t.id === tabId);
      if (!tabToClose || !tabToClose.closable) return prevTabs;

      const newTabs = prevTabs.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        const lastTab = newTabs[newTabs.length - 1];
        if (lastTab) {
          setActiveTabId(lastTab.id);
        } else {
          setActiveTabId('dashboard');
        }
      }
      return newTabs;
    });
  }, [activeTabId]);

  const closeOtherTabs = useCallback((tabId: string) => {
    setTabs(prevTabs => prevTabs.filter(t => t.id === tabId || !t.closable));
    setActiveTabId(tabId);
  }, []);

  const closeAllTabs = useCallback(() => {
    setTabs(defaultTabs);
    setActiveTabId('dashboard');
  }, []);

  const moveTab = useCallback((tabId: string, direction: 'left' | 'right') => {
    setTabs(prevTabs => {
      const idx = prevTabs.findIndex(t => t.id === tabId);
      if (idx === -1) return prevTabs;

      // In RTL display:
      // 'right' moves towards start of list (index - 1)
      // 'left' moves towards end of list (index + 1)
      const targetIdx = direction === 'right' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prevTabs.length) return prevTabs;

      const updated = [...prevTabs];
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
  }, []);

  const reorderTabs = useCallback((sourceIndex: number, destinationIndex: number) => {
    setTabs(prevTabs => {
      if (
        sourceIndex < 0 ||
        sourceIndex >= prevTabs.length ||
        destinationIndex < 0 ||
        destinationIndex >= prevTabs.length ||
        sourceIndex === destinationIndex
      ) {
        return prevTabs;
      }
      const updated = [...prevTabs];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(destinationIndex, 0, moved);
      return updated;
    });
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  return (
    <TabsContext.Provider
      value={{
        tabs,
        activeTabId,
        openTab,
        closeTab,
        closeOtherTabs,
        closeAllTabs,
        moveTab,
        reorderTabs,
        setActiveTabId,
        activeTab
      }}
    >
      {children}
    </TabsContext.Provider>
  );
};

export const useTabs = (): TabsContextType => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return context;
};
