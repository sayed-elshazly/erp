import React, { useState, useEffect, useRef } from 'react';
import { useTabs, TabItem } from '../../context/TabsContext';
import { db } from '../../database/db';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Store,
  Gamepad2,
  Tag,
  FileText,
  Wallet,
  Settings,
  User,
  X,
  XCircle,
  MoreVertical,
  Layers,
  ShieldCheck,
  Tv,
  ChevronRight,
  ChevronLeft,
  GripVertical
} from 'lucide-react';

export const TabsBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTabId, closeTab, closeOtherTabs, closeAllTabs, moveTab, reorderTabs } = useTabs();
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Context menu state for right click on tab
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    tabId: string;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId
    });
  };

  const getTabIcon = (iconType: TabItem['iconType'] | string) => {
    switch (iconType) {
      case 'dashboard':
        return <LayoutDashboard className="w-3.5 h-3.5 text-orange-500" />;
      case 'tickets':
        return <Ticket className="w-3.5 h-3.5 text-orange-400" />;
      case 'customers':
        return <Users className="w-3.5 h-3.5 text-blue-400" />;
      case 'merchants':
        return <Store className="w-3.5 h-3.5 text-amber-400" />;
      case 'catalog':
        return <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'coupons':
        return <Tag className="w-3.5 h-3.5 text-rose-400" />;
      case 'reports':
        return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
      case 'finance':
        return <Wallet className="w-3.5 h-3.5 text-emerald-400" />;
      case 'settings':
        return <Settings className="w-3.5 h-3.5 text-purple-400" />;
      case 'middleman_deals':
      case 'middleman_dashboard':
      case 'middleman_accounts':
      case 'middleman_sell':
      case 'middleman_clients':
      case 'middleman_reports':
      case 'middleman_settings':
        return <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />;
      case 'subscriptions_dashboard':
      case 'subscriptions_list':
      case 'subscriptions_clients':
      case 'subscriptions_plans':
      case 'subscriptions_payments':
      case 'subscriptions_notifications':
      case 'subscriptions_reports':
      case 'subscriptions_settings':
        return <Tv className="w-3.5 h-3.5 text-pink-500" />;
      case 'customer_profile':
      default:
        return <User className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  // Live in-progress middleman deals count for TabsBar
  const [inProgressDealsCount, setInProgressDealsCount] = useState<number>(() => {
    try {
      const deals = db.getMiddlemanDeals(true);
      return deals.filter(d => d.status !== 'completed' && d.status !== 'canceled').length;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const updateCounts = () => {
      try {
        const deals = db.getMiddlemanDeals(true);
        const count = deals.filter(d => d.status !== 'completed' && d.status !== 'canceled').length;
        setInProgressDealsCount(count);
      } catch {}
    };

    updateCounts();
    const interval = setInterval(updateCounts, 3000);
    window.addEventListener('storage', updateCounts);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateCounts);
    };
  }, []);

  const closableTabsCount = tabs.filter(t => t.closable).length;

  return (
    <div
      className="h-10 bg-gray-100 dark:bg-[#121214] border-b border-gray-200 dark:border-[#27272A] flex items-center justify-between px-2 gap-1 select-none"
      dir="rtl"
    >
      {/* Tabs List */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 h-full pt-1">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const isDragging = draggedTabIndex === index;
          const isOver = dragOverIndex === index;
          const isSubscriptionsTab = (tab.iconType as string).startsWith('subscriptions');
          const isFinanceTab = tab.iconType === 'finance';
          const isDealersTab = tab.iconType === 'merchants';
          const isDashboardTab = tab.iconType === 'dashboard';
          const isMiddlemanTab = (tab.iconType as string).startsWith('middleman');
          const isDealsTab = tab.section === 'middleman_deals' || (tab.iconType as string) === 'middleman_deals';

          const activeBorderClass =
            isSubscriptionsTab ? 'border-t-pink-500 shadow-[0_-2px_12px_rgba(236,72,153,0.3)]' :
            isMiddlemanTab ? 'border-t-purple-500 shadow-[0_-2px_12px_rgba(168,85,247,0.3)]' :
            isFinanceTab ? 'border-t-emerald-500 shadow-[0_-2px_12px_rgba(16,185,129,0.3)]' :
            isDealersTab ? 'border-t-amber-500 shadow-[0_-2px_12px_rgba(245,158,11,0.3)]' :
            isDashboardTab ? 'border-t-blue-500 shadow-[0_-2px_12px_rgba(59,130,246,0.3)]' :
            'border-t-orange-500 shadow-[0_-2px_12px_rgba(249,115,22,0.3)]';

          return (
            <div
              key={tab.id}
              draggable={true}
              onDragStart={(e) => {
                setDraggedTabIndex(index);
                e.dataTransfer.setData('text/plain', tab.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverIndex !== index) setDragOverIndex(index);
              }}
              onDragLeave={() => {
                if (dragOverIndex === index) setDragOverIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedTabIndex !== null && draggedTabIndex !== index) {
                  reorderTabs(draggedTabIndex, index);
                }
                setDraggedTabIndex(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                setDraggedTabIndex(null);
                setDragOverIndex(null);
              }}
              onClick={() => setActiveTabId(tab.id)}
              onContextMenu={e => handleContextMenu(e, tab.id)}
              className={`group h-9 px-2.5 rounded-t-xl flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all border-t-2 border-r border-l shrink-0 ${
                isDragging ? 'opacity-40 scale-95' : ''
              } ${
                isOver ? 'ring-2 ring-orange-500 bg-orange-500/10' : ''
              } ${
                isActive
                  ? `bg-white dark:bg-[#18181B] text-gray-900 dark:text-zinc-100 ${activeBorderClass} border-r-gray-200 dark:border-r-[#27272A] border-l-gray-200 dark:border-l-[#27272A] shadow-xs`
                  : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-gray-200/50 dark:hover:bg-zinc-800/40 border-t-transparent border-r-transparent border-l-transparent'
              }`}
            >
              {/* Quick Reorder Arrows on Hover */}
              <div className="hidden group-hover:flex items-center gap-0.5 opacity-60 hover:opacity-100">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveTab(tab.id, 'right');
                    }}
                    className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-zinc-700 text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer"
                    title="نقل التبويب لليمين (للأول)"
                  >
                    <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                )}
                {index < tabs.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveTab(tab.id, 'left');
                    }}
                    className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-zinc-700 text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer"
                    title="نقل التبويب لليسار (للآخر)"
                  >
                    <ChevronLeft className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {getTabIcon(tab.iconType)}
              <span className="truncate max-w-[130px]">{tab.title}</span>

              {isDealsTab && inProgressDealsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-mono text-[10px] font-black shadow-xs">
                  {inProgressDealsCount}
                </span>
              )}

              {tab.closable && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-rose-400 transition-colors opacity-60 group-hover:opacity-100"
                  title="إغلاق التبويب (Ctrl+W)"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Global Close All Tabs Action Button */}
      {closableTabsCount > 0 && (
        <div className="flex items-center gap-1 shrink-0 pl-1">
          <button
            onClick={() => {
              if (window.confirm('هل تريد إغلاق كافة التبويبات المفتوحة والعودة للداشبورد؟')) {
                closeAllTabs();
              }
            }}
            className="h-7 px-2.5 rounded-lg bg-gray-200/80 dark:bg-[#1F1F23] hover:bg-rose-500/15 hover:text-rose-400 text-zinc-400 dark:text-zinc-400 border border-gray-300 dark:border-[#27272A] flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs"
            title="إغلاق كافة التبويبات المفتوحة دفعة واحدة"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">إغلاق الكل ({closableTabsCount})</span>
          </button>
        </div>
      )}

      {/* Context Menu on Right Click */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-48 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl shadow-xl p-1 text-xs text-right space-y-0.5 animate-scale-up"
        >
          {/* Reorder in Context Menu */}
          {tabs.findIndex(t => t.id === contextMenu.tabId) > 0 && (
            <button
              onClick={() => {
                moveTab(contextMenu.tabId, 'right');
                setContextMenu(null);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-between text-right cursor-pointer"
            >
              <span>نقل التبويب لليمين</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}

          {tabs.findIndex(t => t.id === contextMenu.tabId) < tabs.length - 1 && (
            <button
              onClick={() => {
                moveTab(contextMenu.tabId, 'left');
                setContextMenu(null);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-between text-right cursor-pointer"
            >
              <span>نقل التبويب لليسار</span>
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}

          <div className="h-px bg-gray-200 dark:bg-[#27272A] my-0.5" />

          {tabs.find(t => t.id === contextMenu.tabId)?.closable && (
            <button
              onClick={() => {
                closeTab(contextMenu.tabId);
                setContextMenu(null);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-between text-right"
            >
              <span>إغلاق هذا التبويب</span>
              <X className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}

          <button
            onClick={() => {
              closeOtherTabs(contextMenu.tabId);
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-between text-right"
          >
            <span>إغلاق التبويبات الأخرى</span>
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <button
            onClick={() => {
              closeAllTabs();
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-between text-right font-bold"
          >
            <span>إغلاق كافة التبويبات</span>
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
          </button>
        </div>
      )}
    </div>
  );
};
