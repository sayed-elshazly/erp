import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTabs } from '../../context/TabsContext';
import { Dashboard } from '../dashboard/Dashboard';
import { CustomersList } from './CustomersList';
import { CatalogModule } from '../catalog/CatalogModule';
import { CouponsModule } from '../coupons/CouponsModule';
import { TicketsModule } from '../tickets/TicketsModule';
import { ReportsModule } from '../reports/ReportsModule';
import { DataAnalyticsModule } from '../analytics/DataAnalyticsModule';
import { FinanceModule } from '../finance/FinanceModule';
import { CustomerSettingsSubModule } from '../customerSettings/CustomerSettingsSubModule';
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  Tag,
  Ticket,
  FileText,
  Wallet,
  Settings,
  Sparkles,
  ShoppingBag,
  BarChart3
} from 'lucide-react';

interface CustomerShippingModuleProps {
  initialSubTab?: string;
  initialCustomerPayload?: any;
}

export type CustomerSubSection =
  | 'dashboard'
  | 'profiles'
  | 'catalog'
  | 'coupons'
  | 'tickets'
  | 'reports'
  | 'finance'
  | 'settings';

export const CustomerShippingModule: React.FC<CustomerShippingModuleProps> = ({
  initialSubTab = 'dashboard',
  initialCustomerPayload = null
}) => {
  const { user } = useAuth();
  const [activeSubSection, setActiveSubSection] = useState<CustomerSubSection>(
    (initialSubTab as CustomerSubSection) || (initialCustomerPayload ? 'profiles' : 'dashboard')
  );

  useEffect(() => {
    if (initialCustomerPayload) {
      setActiveSubSection('profiles');
    }
  }, [initialCustomerPayload]);

  const navTabs = [
    { id: 'dashboard', label: '1. الداشبورد', icon: LayoutDashboard },
    { id: 'profiles', label: '2. البروفايلات', icon: Users },
    { id: 'catalog', label: '3. المنتجات والمحافظ', icon: Gamepad2 },
    { id: 'coupons', label: '4. كوبونات الخصم', icon: Tag },
    { id: 'tickets', label: '5. تذاكر الشحن', icon: Ticket },
    { id: 'reports', label: '6. تحليل البيانات', icon: BarChart3 },
    { id: 'finance', label: '7. المالية والخزينة', icon: Wallet },
    { id: 'settings', label: '8. الإعدادات', icon: Settings }
  ];

  return (
    <div className="space-y-4 animate-fade-in text-right">
      {/* Top Header Breadcrumb & Sub-Navigation Bar */}
      <div className="p-2.5 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
        <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-gray-100 dark:border-[#27272A]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-500 font-black text-xs flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              <span>قسم الزبائن وشحن الألعاب (Customer Shipping Module)</span>
            </div>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            نظام متكامل 100% Offline • متعدد العملات
          </span>
        </div>

        {/* Sub-tabs list */}
        <div className="flex items-center gap-1 overflow-x-auto select-none no-scrollbar py-1">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubSection(tab.id as CustomerSubSection)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Module Active Content */}
      <div className="animate-fade-in">
        {activeSubSection === 'dashboard' && (
          <Dashboard onNavigate={sec => setActiveSubSection(sec as any)} />
        )}

        {activeSubSection === 'profiles' && (
          <CustomersList initialSelectedCustomer={initialCustomerPayload} />
        )}

        {activeSubSection === 'catalog' && <CatalogModule department="customers" />}

        {activeSubSection === 'coupons' && <CouponsModule department="customers" />}

        {activeSubSection === 'tickets' && <TicketsModule department="customers" />}

        {activeSubSection === 'reports' && <DataAnalyticsModule department="customers" />}

        {activeSubSection === 'finance' && <FinanceModule />}

        {activeSubSection === 'settings' && <CustomerSettingsSubModule />}
      </div>
    </div>
  );
};
