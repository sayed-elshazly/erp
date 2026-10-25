import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { JkrLogo } from '../common/JkrLogo';
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  Tag,
  KeyRound,
  Ticket,
  FileText,
  Wallet,
  Landmark,
  Store,
  Building2,
  Settings,
  Sliders,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Layers,
  ShieldCheck,
  Circle,
  Tv,
  Bell,
  CreditCard,
  RotateCcw,
  TrendingUp,
  Receipt,
  Scale,
  Gift,
  CalendarCheck,
  CheckCircle2,
  BarChart3,
  Trophy
} from 'lucide-react';

import { db } from '../../database/db';
import { useLayoutOrder } from '../../context/LayoutOrderContext';
import { SortableDraggableItem } from '../common/SortableDraggableItem';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  allowed: boolean;
  badge?: string | number;
  badgeColor?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  allowed: boolean;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  isCollapsed,
  onToggleCollapse
}) => {
  const { user, canAccessDepartment } = useAuth();
  const isOwner = user?.role === 'admin';
  const { getOrderedItems, resetAllOrders, canReorder, moveItemUp, moveItemDown } = useLayoutOrder();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Live in-progress middleman deals count
  const [inProgressDealsCount, setInProgressDealsCount] = useState<number>(() => {
    try {
      const deals = db.getMiddlemanDeals(true);
      return deals.filter(d => d.status !== 'completed' && d.status !== 'canceled').length;
    } catch {
      return 0;
    }
  });

  // Live expiring subscriptions count
  const [expiringSubscriptionsCount, setExpiringSubscriptionsCount] = useState<number>(() => {
    try {
      const notifs = db.getSubscriptionNotifications();
      return notifs.length;
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

        const notifs = db.getSubscriptionNotifications();
        setExpiringSubscriptionsCount(notifs.length);
      } catch {}
    };

    updateCounts();
    const interval = setInterval(updateCounts, 3000);
    window.addEventListener('storage', updateCounts);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateCounts);
    };
  }, [activeSection]);

  // Persistent Collapsible Groups State
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('nzm_jkr_sidebar_groups');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      customers_group: true,
      dealers_group: true,
      merchants_group: true,
      middleman_group: true,
      subscriptions_group: true,
      finance_group: true
    };
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem('nzm_jkr_sidebar_groups', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Auto-expand group containing active section
  useEffect(() => {
    if (['customer_dashboard', 'tickets', 'customers', 'catalog', 'coupons', 'competitions', 'customer_finance', 'reports', 'customer_settings'].includes(activeSection)) {
      setExpandedGroups(prev => ({ ...prev, customers_group: true }));
    } else if (['dealer_dashboard', 'dealer_tickets', 'dealers', 'dealer_competitions', 'dealer_catalog', 'dealer_coupons', 'dealer_finance', 'dealer_reports', 'dealer_settings'].includes(activeSection)) {
      setExpandedGroups(prev => ({ ...prev, dealers_group: true }));
    } else if (activeSection === 'merchants') {
      setExpandedGroups(prev => ({ ...prev, merchants_group: true }));
    } else if (activeSection === 'finance' || activeSection.startsWith('finance_')) {
      setExpandedGroups(prev => ({ ...prev, finance_group: true }));
    } else if (['middleman_dashboard', 'middleman_deals', 'middleman_accounts', 'middleman_sell', 'middleman_clients', 'middleman_reports', 'middleman_settings'].includes(activeSection)) {
      setExpandedGroups(prev => ({ ...prev, middleman_group: true }));
    } else if (['subscriptions_dashboard', 'subscriptions_list', 'subscriptions_plans', 'subscriptions_payments', 'subscriptions_notifications', 'subscriptions_reports', 'subscriptions_settings'].includes(activeSection)) {
      setExpandedGroups(prev => ({ ...prev, subscriptions_group: true }));
    }
  }, [activeSection]);

  const navGroups: (NavItem | NavGroup)[] = [
    // 1. Standalone Dashboard (Admin or Customer/Dealer staff)
    {
      id: 'dashboard',
      label: 'الداشبورد الرئيسي',
      icon: LayoutDashboard,
      allowed: user?.role === 'admin' || user?.department === 'customers' || user?.department === 'dealers' || user?.department === 'finance'
    },

    // 2. Customers & Top-Up Master Collapsible Group
    {
      id: 'customers_group',
      label: 'قسم الزبائن والشحن',
      icon: Users,
      badge: '9 أقسام',
      badgeColor: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30',
      allowed: user?.role === 'admin' || canAccessDepartment('customers') || canAccessDepartment('dealers'),
      items: [
        { id: 'customer_dashboard', label: 'لوحة تحكم الزبائن', icon: LayoutDashboard, allowed: user?.role === 'admin' || canAccessDepartment('customers') },
        { id: 'tickets', label: 'تذاكر الشحن', icon: Ticket, allowed: user?.role === 'admin' || canAccessDepartment('customers') },
        { id: 'customers', label: 'البروفايلات والعملاء', icon: Users, allowed: user?.role === 'admin' || canAccessDepartment('customers') },
        { id: 'competitions', label: 'المسابقات والمكافآت', icon: Trophy, allowed: user?.role === 'admin' || canAccessDepartment('customers') || canAccessDepartment('dealers') },
        { id: 'catalog', label: 'المنتجات والمحافظ', icon: Gamepad2, allowed: user?.role === 'admin' || canAccessDepartment('customers') },
        { id: 'coupons', label: 'كوبونات الخصم', icon: Tag, allowed: user?.role === 'admin' || canAccessDepartment('customers') },
        { id: 'customer_finance', label: 'المالية', icon: Landmark, allowed: user?.role === 'admin' || canAccessDepartment('customers') },
        { id: 'reports', label: 'تحليل البيانات والذكاء', icon: BarChart3, allowed: user?.role === 'admin' || canAccessDepartment('customers') },
        { id: 'customer_settings', label: 'إعدادات قسم الزبائن', icon: Sliders, allowed: user?.role === 'admin' || canAccessDepartment('customers') }
      ]
    },

    // 3. Dealers & Wholesale Collapsible Group (Full 9 Sub-tabs)
    {
      id: 'dealers_group',
      label: 'قسم التجار والموزعين',
      icon: Store,
      badge: '9 أقسام',
      badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
      allowed: user?.role === 'admin' || canAccessDepartment('dealers'),
      items: [
        {
          id: 'dealer_dashboard',
          label: 'لوحة تحكم التجار',
          icon: LayoutDashboard,
          allowed: user?.role === 'admin' || canAccessDepartment('dealers')
        },
        {
          id: 'dealer_tickets',
          label: 'تذاكر شحن الجملة',
          icon: Ticket,
          allowed: user?.role === 'admin' || canAccessDepartment('dealers')
        },
        {
          id: 'dealers',
          label: 'البروفايلات والتجار',
          icon: Store,
          allowed: user?.role === 'admin' || canAccessDepartment('dealers')
        },
        {
          id: 'dealer_competitions',
          label: 'المسابقات والمكافآت',
          icon: Trophy,
          allowed: user?.role === 'admin' || canAccessDepartment('dealers')
        },
        {
          id: 'dealer_catalog',
          label: 'المنتجات وأسعار الجملة',
          icon: Gamepad2,
          allowed: user?.role === 'admin' || canAccessDepartment('dealers')
        },
        {
          id: 'dealer_coupons',
          label: 'كوبونات خصم الجملة',
          icon: Tag,
          allowed: user?.role === 'admin' || canAccessDepartment('dealers')
        },
        {
          id: 'dealer_finance',
          label: 'المالية',
          icon: Landmark,
          allowed: user?.role === 'admin' || canAccessDepartment('dealers')
        },
        {
          id: 'dealer_reports',
          label: 'تحليل البيانات والذكاء',
          icon: BarChart3,
          allowed: user?.role === 'admin' || canAccessDepartment('dealers')
        },
        {
          id: 'dealer_settings',
          label: 'إعدادات قسم التجار',
          icon: Sliders,
          allowed: user?.role === 'admin' || canAccessDepartment('dealers')
        }
      ]
    },

    // 4. Middleman & Escrow System Collapsible Group (Full 7 Sub-tabs)
    {
      id: 'middleman_group',
      label: 'قسم الوساطة والضمان',
      icon: ShieldCheck,
      badge: inProgressDealsCount > 0 ? `${inProgressDealsCount} جارية` : '7 أقسام',
      badgeColor: inProgressDealsCount > 0 ? 'bg-amber-500 text-black font-black' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30',
      allowed: user?.role === 'admin' || canAccessDepartment('brokerage'),
      items: [
        {
          id: 'middleman_dashboard',
          label: 'لوحة تحكم الوساطة',
          icon: LayoutDashboard,
          allowed: user?.role === 'admin' || canAccessDepartment('brokerage')
        },
        {
          id: 'middleman_deals',
          label: 'الوساطات والصفقات',
          icon: ShieldCheck,
          badge: inProgressDealsCount > 0 ? inProgressDealsCount : undefined,
          badgeColor: 'bg-amber-500 text-black font-black',
          allowed: user?.role === 'admin' || canAccessDepartment('brokerage')
        },
        {
          id: 'middleman_accounts',
          label: 'مخزن الحسابات (الأصول)',
          icon: Layers,
          allowed: user?.role === 'admin' || canAccessDepartment('brokerage')
        },
        {
          id: 'middleman_sell',
          label: 'بيع الحسابات والمطبوعات',
          icon: Store,
          allowed: user?.role === 'admin' || canAccessDepartment('brokerage')
        },
        {
          id: 'middleman_clients',
          label: 'عملاء الوساطة',
          icon: Users,
          allowed: user?.role === 'admin' || canAccessDepartment('brokerage')
        },
        {
          id: 'middleman_reports',
          label: 'التقارير والإحصائيات',
          icon: FileText,
          allowed: user?.role === 'admin' || canAccessDepartment('brokerage')
        },
        {
          id: 'middleman_settings',
          label: 'إعدادات الوساطة',
          icon: Sliders,
          allowed: user?.role === 'admin' || canAccessDepartment('brokerage')
        }
      ]
    },

    // 5. Subscriptions Module Collapsible Group (Full 7 Sub-tabs)
    {
      id: 'subscriptions_group',
      label: 'قسم الاشتراكات',
      icon: Tv,
      badge: expiringSubscriptionsCount > 0 ? `${expiringSubscriptionsCount} تنبيه` : '7 أقسام',
      badgeColor: expiringSubscriptionsCount > 0 ? 'bg-pink-500 text-white font-black' : 'bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30',
      allowed: user?.role === 'admin' || canAccessDepartment('subscriptions'),
      items: [
        {
          id: 'subscriptions_dashboard',
          label: 'لوحة تحكم الاشتراكات',
          icon: LayoutDashboard,
          allowed: user?.role === 'admin' || canAccessDepartment('subscriptions')
        },
        {
          id: 'subscriptions_list',
          label: 'سجل وإدارة الاشتراكات',
          icon: Tv,
          allowed: user?.role === 'admin' || canAccessDepartment('subscriptions')
        },
        {
          id: 'subscriptions_clients',
          label: 'عملاء الاشتراكات',
          icon: Users,
          allowed: user?.role === 'admin' || canAccessDepartment('subscriptions')
        },
        {
          id: 'subscriptions_plans',
          label: 'الباقات والأسعار',
          icon: Layers,
          allowed: user?.role === 'admin' || canAccessDepartment('subscriptions')
        },
        {
          id: 'subscriptions_payments',
          label: 'المدفوعات والإيصالات',
          icon: CreditCard,
          allowed: user?.role === 'admin' || canAccessDepartment('subscriptions')
        },
        {
          id: 'subscriptions_notifications',
          label: 'مركز التنبيهات والواتساب',
          icon: Bell,
          badge: expiringSubscriptionsCount > 0 ? expiringSubscriptionsCount : undefined,
          badgeColor: 'bg-pink-500 text-white font-black',
          allowed: user?.role === 'admin' || canAccessDepartment('subscriptions')
        },
        {
          id: 'subscriptions_reports',
          label: 'التقارير والإحصائيات',
          icon: FileText,
          allowed: user?.role === 'admin' || canAccessDepartment('subscriptions')
        },
        {
          id: 'subscriptions_settings',
          label: 'إعدادات قسم الاشتراكات',
          icon: Sliders,
          allowed: user?.role === 'admin' || canAccessDepartment('subscriptions')
        }
      ]
    },

    // 6. Treasury & Financial System
    {
      id: 'finance_group',
      label: 'المالية والخزينة',
      icon: Wallet,
      badge: '9 أقسام',
      badgeColor: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
      allowed: user?.role === 'admin' || canAccessDepartment('finance'),
      items: [
        {
          id: 'finance_overview',
          label: 'المركز المالي الشامل',
          icon: TrendingUp,
          allowed: user?.role === 'admin' || canAccessDepartment('finance')
        },
        {
          id: 'finance_vault',
          label: 'الخزينة والسيولة النقدية',
          icon: Wallet,
          allowed: user?.role === 'admin' || canAccessDepartment('finance')
        },
        {
          id: 'finance_wallets',
          label: 'المحافظ وحسابات البنوك',
          icon: CreditCard,
          allowed: user?.role === 'admin' || canAccessDepartment('finance')
        },
        {
          id: 'finance_expenses',
          label: 'المصروفات والبنود',
          icon: Receipt,
          allowed: user?.role === 'admin' || canAccessDepartment('finance')
        },
        {
          id: 'finance_debts',
          label: 'الديون والمستحقات',
          icon: Scale,
          allowed: user?.role === 'admin' || canAccessDepartment('finance')
        },
        {
          id: 'finance_commissions',
          label: 'الكاش باك والعمولات',
          icon: Gift,
          allowed: user?.role === 'admin' || canAccessDepartment('finance')
        },
        {
          id: 'finance_payroll',
          label: 'الرواتب والحضور',
          icon: CalendarCheck,
          allowed: user?.role === 'admin' || canAccessDepartment('finance')
        },
        {
          id: 'finance_settlements',
          label: 'التسويات والورديات',
          icon: CheckCircle2,
          allowed: user?.role === 'admin' || canAccessDepartment('finance')
        },
        {
          id: 'finance_reports',
          label: 'التقارير والقوائم المالية',
          icon: FileText,
          allowed: user?.role === 'admin' || canAccessDepartment('finance')
        }
      ]
    },

    // 7. System Administration & Control
    {
      id: 'settings',
      label: 'الإعدادات العامة والرقابة',
      icon: Settings,
      allowed: user?.role === 'admin' || Boolean(user?.permissions?.includes('manage_settings'))
    }
  ];

  // Helper for department visual styling
  const getGroupTheme = (groupId: string) => {
    switch (groupId) {
      case 'dashboard':
        return {
          activeGradient: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500',
          activeGlow: 'shadow-[0_0_24px_rgba(59,130,246,0.45)] border-blue-500/70 text-white',
          hoverText: 'hover:text-cyan-400',
          iconActiveBg: 'bg-white/25 text-white shadow-xs',
          iconDefaultBg: 'bg-blue-500/15 text-blue-500 dark:text-cyan-400 group-hover:bg-blue-500/25 group-hover:text-cyan-300',
          borderAccent: 'border-blue-500/30',
          dotColor: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
        };
      case 'customers_group':
        return {
          activeGradient: 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600',
          activeGlow: 'shadow-[0_0_24px_rgba(249,115,22,0.45)] border-orange-500/70 text-white',
          hoverText: 'hover:text-orange-400',
          iconActiveBg: 'bg-white/25 text-white shadow-xs',
          iconDefaultBg: 'bg-orange-500/15 text-orange-500 dark:text-orange-400 group-hover:bg-orange-500/25 group-hover:text-orange-300',
          borderAccent: 'border-orange-500/30',
          dotColor: 'bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
        };
      case 'dealers_group':
        return {
          activeGradient: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600',
          activeGlow: 'shadow-[0_0_24px_rgba(245,158,11,0.45)] border-amber-500/70 text-white',
          hoverText: 'hover:text-amber-400',
          iconActiveBg: 'bg-white/25 text-white shadow-xs',
          iconDefaultBg: 'bg-amber-500/15 text-amber-500 dark:text-amber-400 group-hover:bg-amber-500/25 group-hover:text-amber-300',
          borderAccent: 'border-amber-500/30',
          dotColor: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
        };
      case 'middleman_group':
        return {
          activeGradient: 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600',
          activeGlow: 'shadow-[0_0_24px_rgba(168,85,247,0.45)] border-purple-500/70 text-white',
          hoverText: 'hover:text-purple-400',
          iconActiveBg: 'bg-white/25 text-white shadow-xs',
          iconDefaultBg: 'bg-purple-500/15 text-purple-500 dark:text-purple-400 group-hover:bg-purple-500/25 group-hover:text-purple-300',
          borderAccent: 'border-purple-500/30',
          dotColor: 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
        };
      case 'subscriptions_group':
        return {
          activeGradient: 'bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600',
          activeGlow: 'shadow-[0_0_25px_rgba(236,72,153,0.5)] border-pink-500/70 text-white',
          hoverText: 'hover:text-pink-400',
          iconActiveBg: 'bg-white/25 text-white shadow-xs',
          iconDefaultBg: 'bg-pink-500/15 text-pink-500 dark:text-pink-400 group-hover:bg-pink-500/25 group-hover:text-pink-300',
          borderAccent: 'border-pink-500/30',
          dotColor: 'bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.8)]'
        };
      case 'finance_group':
        return {
          activeGradient: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600',
          activeGlow: 'shadow-[0_0_24px_rgba(16,185,129,0.45)] border-emerald-500/70 text-white',
          hoverText: 'hover:text-emerald-400',
          iconActiveBg: 'bg-white/25 text-white shadow-xs',
          iconDefaultBg: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300',
          borderAccent: 'border-emerald-500/30',
          dotColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
        };
      case 'settings':
        return {
          activeGradient: 'bg-gradient-to-r from-indigo-600 via-sky-600 to-blue-600',
          activeGlow: 'shadow-[0_0_24px_rgba(99,102,241,0.45)] border-indigo-500/70 text-white',
          hoverText: 'hover:text-indigo-400',
          iconActiveBg: 'bg-white/25 text-white shadow-xs',
          iconDefaultBg: 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-500/25 group-hover:text-indigo-300',
          borderAccent: 'border-indigo-500/30',
          dotColor: 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]'
        };
      default:
        return {
          activeGradient: 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600',
          activeGlow: 'shadow-[0_0_20px_rgba(249,115,22,0.4)] border-orange-500/60 text-white',
          hoverText: 'hover:text-orange-400',
          iconActiveBg: 'bg-white/20 text-white shadow-xs',
          iconDefaultBg: 'bg-gray-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-orange-400',
          borderAccent: 'border-orange-500/20',
          dotColor: 'bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
        };
    }
  };

  return (
    <aside
      className={`bg-white/95 dark:bg-[#0E0E12]/95 backdrop-blur-xl border-l border-gray-200/90 dark:border-[#23232C] transition-all duration-300 flex flex-col shrink-0 z-20 select-none relative overflow-hidden ${
        isCollapsed ? 'w-20' : 'w-80'
      }`}
    >
      {/* Dynamic Ambient Background Aura & Wave Lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Top-Right Glowing Orb */}
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-gradient-to-br from-blue-500/12 via-indigo-500/8 to-transparent rounded-full blur-3xl animate-floating-orb" />
        
        {/* Middle Ethereal Color Aura */}
        <div className="absolute top-1/3 -left-20 w-64 h-64 bg-gradient-to-tr from-pink-500/10 via-purple-500/8 to-transparent rounded-full blur-3xl animate-floating-orb" style={{ animationDelay: '3.5s' }} />

        {/* Bottom Ambient Glow */}
        <div className="absolute -bottom-20 right-0 w-56 h-56 bg-gradient-to-tl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl animate-floating-orb" style={{ animationDelay: '1.8s' }} />

        {/* Subtle Animated Mesh Wave Lines */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] bg-[radial-gradient(#F97316_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200/90 dark:border-[#23232C] bg-gray-50/70 dark:bg-[#131317]/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2 overflow-hidden">
          {isCollapsed ? (
            <div className="p-1 rounded-xl bg-black border border-zinc-800 shadow-md shadow-orange-500/10 flex items-center justify-center">
              <img src="/jkr-logo.png" alt="JKR" className="w-6 h-6 object-contain rounded-md" />
            </div>
          ) : (
            <div className="p-1.5 px-3 rounded-xl bg-black border border-zinc-800/90 shadow-md shadow-orange-500/15 flex items-center justify-center">
              <JkrLogo size="sm" showSubtitle={true} />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-all cursor-pointer hover:shadow-xs"
          title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
        >
          {isCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto scrollbar-thin text-right relative z-10">
        {getOrderedItems(
          'sidebar_main',
          navGroups.filter(groupOrItem => groupOrItem.allowed),
          g => g.id
        ).map((entry, groupIndex, arr) => {
          // Case 1: Standalone Single Item (Dashboard, General Settings)
          if (!('items' in entry)) {
            const Icon = entry.icon;
            const isActive = activeSection === entry.id;
            const isDashboard = entry.id === 'dashboard';
            const isSettings = entry.id === 'settings';

            const itemTheme = isDashboard
              ? getGroupTheme('dashboard')
              : isSettings
              ? getGroupTheme('settings')
              : getGroupTheme(entry.id);

            return (
              <SortableDraggableItem
                key={entry.id}
                containerId="sidebar_main"
                itemId={entry.id}
                index={groupIndex}
                defaultIds={arr.map(g => g.id)}
                direction="vertical"
              >
                <button
                  type="button"
                  onClick={() => onNavigate(entry.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl font-bold text-sm transition-all duration-200 group cursor-pointer relative overflow-hidden border ${
                    isActive
                      ? `${itemTheme.activeGradient} ${itemTheme.activeGlow} font-black text-white shine-effect`
                      : `text-zinc-700 dark:text-zinc-300 ${itemTheme.hoverText} hover:bg-white/80 dark:hover:bg-zinc-800/60 border-transparent hover:border-gray-200/60 dark:hover:border-zinc-700/40 hover:shadow-xs`
                  }`}
                  title={isCollapsed ? entry.label : undefined}
                >
                  <div className={`p-1.5 rounded-xl transition-all duration-200 shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-xs scale-105'
                      : itemTheme.iconDefaultBg
                  }`}>
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                  </div>

                  {!isCollapsed && (
                    <span className="truncate flex-1 text-right font-bold text-[14px]">
                      {entry.label}
                    </span>
                  )}

                  {!isCollapsed && canReorder && (
                    <div
                      className="flex items-center gap-0.5 mr-auto shrink-0 bg-black/20 dark:bg-white/10 rounded-lg p-0.5"
                      onClick={e => e.stopPropagation()}
                    >
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItemUp('sidebar_main', entry.id, arr.map(g => g.id));
                        }}
                        className={`p-1 rounded hover:bg-white/30 transition-all ${
                          groupIndex === 0 ? 'opacity-25 pointer-events-none' : 'text-zinc-300 hover:text-white cursor-pointer hover:scale-115 active:scale-95'
                        }`}
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItemDown('sidebar_main', entry.id, arr.map(g => g.id));
                        }}
                        className={`p-1 rounded hover:bg-white/30 transition-all ${
                          groupIndex === arr.length - 1 ? 'opacity-25 pointer-events-none' : 'text-zinc-300 hover:text-white cursor-pointer hover:scale-115 active:scale-95'
                        }`}
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  )}

                  {!isCollapsed && isActive && (
                    <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] shrink-0 animate-pulse" />
                  )}
                </button>
              </SortableDraggableItem>
            );
          }

          // Case 2: Collapsible Group Accordion
          const GroupIcon = entry.icon;
          const isGroupExpanded = !!expandedGroups[entry.id];
          const hasActiveChild = entry.items.some(it => it.id === activeSection);
          const theme = getGroupTheme(entry.id);

          const orderedChildren = getOrderedItems(
            `sidebar_${entry.id}`,
            entry.items.filter(child => child.allowed),
            c => c.id
          );

          return (
            <SortableDraggableItem
              key={entry.id}
              containerId="sidebar_main"
              itemId={entry.id}
              index={groupIndex}
              defaultIds={arr.map(g => g.id)}
              direction="vertical"
            >
              <div
                className={`rounded-2xl transition-all duration-300 relative ${
                  !isCollapsed && (isGroupExpanded || hasActiveChild)
                    ? 'bg-gray-50/80 dark:bg-[#16161B]/90 border border-gray-200/90 dark:border-[#282832] p-1.5 shadow-md shadow-black/5 dark:shadow-black/20'
                    : 'p-0.5'
                }`}
              >
                {/* Group Header Trigger Button */}
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-black transition-all duration-200 cursor-pointer select-none group border ${
                    hasActiveChild
                      ? `${theme.activeGlow} ${theme.activeGradient} shine-effect text-white font-black`
                      : isGroupExpanded
                      ? `text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800/60 border-gray-200 dark:border-zinc-700/50 shadow-xs ${theme.hoverText}`
                      : `text-zinc-700 dark:text-zinc-300 ${theme.hoverText} hover:bg-white/80 dark:hover:bg-zinc-800/50 border-transparent`
                  }`}
                  title={isCollapsed ? entry.label : undefined}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-xl shrink-0 transition-all duration-200 ${
                      hasActiveChild
                        ? 'bg-white/25 text-white shadow-xs scale-105'
                        : theme.iconDefaultBg
                    }`}>
                      <GroupIcon className="w-4.5 h-4.5 shrink-0" />
                    </div>

                    {!isCollapsed && (
                      <span className="font-black text-[14px] truncate text-right">
                        {entry.label}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5 shrink-0 mr-2">
                      {canReorder && (
                        <div
                          className="flex items-center gap-0.5 bg-black/30 dark:bg-white/10 rounded-lg p-0.5 shadow-xs"
                          onClick={e => e.stopPropagation()}
                        >
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveItemUp('sidebar_main', entry.id, arr.map(g => g.id));
                            }}
                            className={`p-1 rounded hover:bg-white/30 transition-all ${
                              groupIndex === 0 ? 'opacity-25 pointer-events-none' : 'text-white cursor-pointer hover:scale-115 active:scale-95'
                            }`}
                            title="تحريك القسم لأعلى"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveItemDown('sidebar_main', entry.id, arr.map(g => g.id));
                            }}
                            className={`p-1 rounded hover:bg-white/30 transition-all ${
                              groupIndex === arr.length - 1 ? 'opacity-25 pointer-events-none' : 'text-white cursor-pointer hover:scale-115 active:scale-95'
                            }`}
                            title="تحريك القسم لأسفل"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      )}

                      {entry.badge && (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-black font-mono shadow-xs transition-all ${
                          hasActiveChild
                            ? 'bg-white/25 text-white border border-white/30'
                            : entry.badgeColor || 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                        }`}>
                          {entry.badge}
                        </span>
                      )}
                      <div className={`p-1 rounded-md transition-transform duration-200 ${
                        hasActiveChild ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                      } ${isGroupExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </button>

                {/* Sub-Items List (Reorderable strictly within same group) */}
                {(!isCollapsed ? isGroupExpanded : true) && (
                  <div className={`space-y-1 ${!isCollapsed ? `mt-1.5 pr-2 mr-1 border-r ${theme.borderAccent}` : ''}`}>
                    {orderedChildren.map((child, childIndex) => {
                      const ChildIcon = child.icon;
                      const isChildActive = activeSection === child.id;

                      return (
                        <SortableDraggableItem
                          key={child.id}
                          containerId={`sidebar_${entry.id}`}
                          itemId={child.id}
                          index={childIndex}
                          defaultIds={orderedChildren.map(c => c.id)}
                          direction="vertical"
                        >
                          <button
                            type="button"
                            onClick={() => onNavigate(child.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 group cursor-pointer relative border ${
                              isChildActive
                                ? `${theme.activeGradient} ${theme.activeGlow} font-black shine-effect`
                                : `text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/90 dark:hover:bg-zinc-800/70 border-transparent hover:border-gray-200/50 dark:hover:border-zinc-700/30`
                            }`}
                            title={isCollapsed ? child.label : undefined}
                          >
                            <ChildIcon
                              className={`w-4 h-4 shrink-0 transition-all duration-200 ${
                                isChildActive
                                  ? 'text-white scale-110'
                                  : `text-zinc-400 dark:text-zinc-500 ${theme.hoverText} group-hover:scale-110`
                              }`}
                            />

                            {!isCollapsed && (
                              <span className="truncate flex-1 text-right text-[13px]">
                                {child.label}
                              </span>
                            )}

                            {!isCollapsed && canReorder && (
                              <div
                                className="flex items-center gap-0.5 mr-auto shrink-0 bg-black/25 dark:bg-white/10 rounded-md p-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
                                onClick={e => e.stopPropagation()}
                              >
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveItemUp(`sidebar_${entry.id}`, child.id, orderedChildren.map(c => c.id));
                                  }}
                                  className={`p-0.5 rounded hover:bg-white/30 transition-all ${
                                    childIndex === 0 ? 'opacity-20 pointer-events-none' : 'text-zinc-300 hover:text-white cursor-pointer hover:scale-120 active:scale-90'
                                  }`}
                                  title="تحريك التبويب لأعلى"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </span>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveItemDown(`sidebar_${entry.id}`, child.id, orderedChildren.map(c => c.id));
                                  }}
                                  className={`p-0.5 rounded hover:bg-white/30 transition-all ${
                                    childIndex === orderedChildren.length - 1 ? 'opacity-20 pointer-events-none' : 'text-zinc-300 hover:text-white cursor-pointer hover:scale-120 active:scale-90'
                                  }`}
                                  title="تحريك التبويب لأسفل"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            )}

                            {!isCollapsed && child.badge !== undefined && (
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black font-mono shadow-xs ${
                                isChildActive
                                  ? 'bg-white text-zinc-900 font-black'
                                  : child.badgeColor || 'bg-amber-500 text-black'
                              }`}>
                                {child.badge}
                              </span>
                            )}

                            {!isCollapsed && isChildActive && child.badge === undefined && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse" />
                            )}
                          </button>
                        </SortableDraggableItem>
                      );
                    })}
                  </div>
                )}
              </div>
            </SortableDraggableItem>
          );
        })}
      </nav>

      {/* Reset Layout Order Button (Owner / Admin Only) */}
      {canReorder && (
        <div className="p-2 border-t border-gray-200/90 dark:border-[#23232C] bg-gray-50/70 dark:bg-[#131317]/80 relative z-10 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="w-full py-1.5 px-2.5 rounded-xl text-[11px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-transparent hover:border-rose-500/20"
            title="إعادة ترتيب الأقسام والتبويبات إلى الوضع الافتراضي الأصلي للنظام"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            {!isCollapsed && <span>إعادة الترتيب الافتراضي</span>}
          </button>
        </div>
      )}

      {/* Footer / System Status */}
      <div className="p-3 border-t border-gray-200/90 dark:border-[#23232C] bg-gray-50/70 dark:bg-[#131317]/80 relative z-10 backdrop-blur-md">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-2 text-emerald-500 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
              <span>{isOwner ? 'المدير العام (Owner)' : 'حساب موظف'}</span>
            </span>
            <span className="font-mono text-[11px] bg-zinc-200/80 dark:bg-zinc-800/90 px-2.5 py-0.5 rounded-lg text-zinc-700 dark:text-zinc-300 font-black border border-zinc-300/40 dark:border-zinc-700/40 shadow-2xs">
              V3.0 Core
            </span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]" title="متصل" />
          </div>
        )}
      </div>
      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          resetAllOrders();
          setIsResetConfirmOpen(false);
        }}
        title="إعادة الترتيب الافتراضي للواجهة"
        message="هل أنت متأكد من رغبتك في إعادة ترتيب جميع الأقسام والتبويبات إلى الترتيب الأصلي للنظام؟ سيتم مسح أي تخصيص يدوي واستعادة ترتيب النظام الافتراضي."
        confirmText="نعم، إعادة الترتيب الأصلي"
        cancelText="إلغاء"
        variant="warning"
      />
    </aside>
  );
};
