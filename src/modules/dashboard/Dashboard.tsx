import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTabs } from '../../context/TabsContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { db } from '../../database/db';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { CardSkeleton } from '../../components/common/SkeletonLoader';
import { SmartKpiCard } from '../../components/dashboard/SmartKpiCard';
import { KpiCustomizerModal } from '../../components/dashboard/KpiCustomizerModal';
import { UnifiedFinanceFilterBar } from '../../components/common/UnifiedFinanceFilterBar';
import { KpiDrillDownModal } from './KpiDrillDownModal';
import { KpiCardConfig, KpiValueData, KpiSize } from '../../types/kpi.types';
import { useLayoutOrder } from '../../context/LayoutOrderContext';
import { SortableDraggableItem } from '../../components/common/SortableDraggableItem';
import {
  Users,
  Wallet,
  Settings,
  Store,
  ArrowRightLeft,
  Tv,
  Clock,
  Receipt,
  UserPlus,
  DollarSign,
  Ticket,
  ChevronLeft,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Award,
  Gamepad2,
  Tag,
  FileText,
  Printer,
  BarChart3,
  PieChart,
  TrendingUp,
  ShoppingBag,
  Archive,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  FinanceMetrics,
  SafeTransaction,
  Expense,
  UnifiedFinanceFilter,
  UnifiedFinancialTransaction
} from '../../types/finance.types';
import { Customer, CustomerTicket } from '../../types/customer.types';
import { AuditLog } from '../../types/audit.types';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';
import { CustomersSectionCard } from './sections/CustomersSectionCard';
import { DealersSectionCard } from './sections/DealersSectionCard';
import { MiddlemanSectionCard } from './sections/MiddlemanSectionCard';
import { SubscriptionsSectionCard } from './sections/SubscriptionsSectionCard';
import { DepartmentComparisonSection } from './sections/DepartmentComparisonSection';
import { SystemTotalsSection } from './sections/SystemTotalsSection';
import { QuickReportsSection } from './sections/QuickReportsSection';
import { LiveWalletsRadarSection } from './sections/LiveWalletsRadarSection';
import { TopGamesRadarSection } from './sections/TopGamesRadarSection';

interface DashboardProps {
  onNavigate: (section: string) => void;
  onOpenCustomerModal?: () => void;
  onOpenExpenseModal?: () => void;
  onOpenVaultModal?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onOpenCustomerModal,
  onOpenExpenseModal,
  onOpenVaultModal
}) => {
  const { user } = useAuth();
  const { openTab } = useTabs();
  const { getOrderedItems } = useLayoutOrder();
  const {
    workspace,
    updateKpiCard,
    reorderKpiCards,
    toggleKpiPin,
    toggleKpiVisibility,
    changeKpiSize,
    resetWorkspace
  } = useWorkspace();

  // Unified Filter State (Single Source of Truth)
  const [filter, setFilter] = useState<UnifiedFinanceFilter>({
    datePreset: 'all',
    customStartDate: '',
    customEndDate: '',
    department: 'all',
    gameName: 'all',
    planId: 'all',
    personQuery: '',
    employeeId: 'all',
    transactionType: 'all'
  });

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [unifiedTransactions, setUnifiedTransactions] = useState<UnifiedFinancialTransaction[]>([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [activeTicketsCount, setActiveTicketsCount] = useState(0);
  const [closedTicketsCount, setClosedTicketsCount] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<SafeTransaction[]>([]);
  const [topCustomers, setTopCustomers] = useState<Customer[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [recentTickets, setRecentTickets] = useState<CustomerTicket[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLog[]>([]);
  const [attendanceCount, setAttendanceCount] = useState(0);

  // Customizer & Report Modals
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Drill-Down Modal State
  const [drillDownState, setDrillDownState] = useState<{
    isOpen: boolean;
    kpiId: string;
    kpiTitle: string;
    kpiValue: string | number;
    kpiSubtitle?: string;
  }>({
    isOpen: false,
    kpiId: '',
    kpiTitle: '',
    kpiValue: 0,
    kpiSubtitle: ''
  });

  const loadDashboardData = useCallback(() => {
    // 1. Single Source of Truth Metrics
    const calculatedMetrics = db.getFinanceMetrics(filter);
    setMetrics(calculatedMetrics);

    // 2. Unified Transactions
    const unified = db.getUnifiedTransactions(filter);
    setUnifiedTransactions(unified);

    const custs = db.getCustomers();
    setCustomersCount(custs.length);
    setTopCustomers([...custs].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 4));
    setRecentCustomers([...custs].slice(0, 4));

    const tickets = db.getTickets();
    setActiveTicketsCount(tickets.filter(t => t.status === 'new' || t.status === 'in_progress').length);
    setClosedTicketsCount(tickets.filter(t => t.status === 'completed' || t.status === 'canceled').length);

    setRecentTransactions(db.getSafeTransactions().slice(0, 5));
    setRecentExpenses(db.getExpenses().slice(0, 4));
    setRecentTickets(tickets.slice(0, 4));
    setRecentAuditLogs(db.getAuditLogs().slice(0, 5));
    setAttendanceCount(db.getAttendance().length);

    setTimeout(() => setLoading(false), 80);
  }, [filter]);

  useEffect(() => {
    loadDashboardData();

    // Event Bus live auto-refresh (Live Synchronization)
    const unsubCustomer = eventBus.subscribe(SYSTEM_EVENTS.CUSTOMER_CREATED, loadDashboardData);
    const unsubTx = eventBus.subscribe(SYSTEM_EVENTS.TRANSACTION_RECORDED, loadDashboardData);
    const unsubVault = eventBus.subscribe(SYSTEM_EVENTS.VAULT_UPDATED, loadDashboardData);
    const unsubExpense = eventBus.subscribe(SYSTEM_EVENTS.EXPENSE_ADDED, loadDashboardData);
    const unsubDebt = eventBus.subscribe(SYSTEM_EVENTS.DEBT_UPDATED, loadDashboardData);
    const unsubSettings = eventBus.subscribe(SYSTEM_EVENTS.SETTINGS_UPDATED, loadDashboardData);
    const unsubProducts = eventBus.subscribe(SYSTEM_EVENTS.PRODUCTS_UPDATED, loadDashboardData);
    const unsubWallet = eventBus.subscribe(SYSTEM_EVENTS.WALLET_MUTATED, loadDashboardData);
    window.addEventListener('storage', loadDashboardData);

    return () => {
      unsubCustomer();
      unsubTx();
      unsubVault();
      unsubExpense();
      unsubDebt();
      unsubSettings();
      unsubProducts();
      unsubWallet();
      window.removeEventListener('storage', loadDashboardData);
    };
  }, [loadDashboardData]);

  // Compute live value payload for all 20 KPI cards
  const kpiDataMap: Record<string, KpiValueData> = useMemo(() => {
    const topCustomer = topCustomers[0]?.name || 'حسين علي';
    const topSpent = topCustomers[0]?.totalSpent || 0;
    const totalOrders = customersCount > 0 ? db.getCustomers().reduce((a, c) => a + c.totalOrders, 0) : 0;

    return {
      vault_balance: {
        value: formatCurrency(metrics?.vaultBalance),
        numericRaw: metrics?.vaultBalance || 0,
        changePercentage: 8.4,
        changeType: 'increase',
        comparisonPeriodText: 'مقارنة بالأسبوع الماضي',
        statusColor: 'emerald',
        iconName: 'wallet',
        lastUpdated: 'محدث الآن',
        subtitle: 'سيولة الصندوق المركزي'
      },
      net_profit: {
        value: formatCurrency(metrics?.netProfit),
        numericRaw: metrics?.netProfit || 0,
        changePercentage: 14.2,
        changeType: 'increase',
        comparisonPeriodText: 'مقارنة بالشهر السابق',
        statusColor: 'orange',
        iconName: 'trending_up',
        lastUpdated: 'محدث الآن',
        subtitle: 'هامش الربح الصافي 18%'
      },
      total_sales: {
        value: formatCurrency(metrics?.totalRevenue),
        numericRaw: metrics?.totalRevenue || 0,
        changePercentage: 12.0,
        changeType: 'increase',
        comparisonPeriodText: 'إجمالي التوزيع المباشر',
        statusColor: 'blue',
        iconName: 'dollar',
        lastUpdated: 'محدث الآن'
      },
      gross_profit: {
        value: formatCurrency(metrics?.grossProfit),
        numericRaw: metrics?.grossProfit || 0,
        changePercentage: 9.8,
        changeType: 'increase',
        comparisonPeriodText: 'الربح الإجمالي التشغيلي',
        statusColor: 'emerald',
        iconName: 'sparkles',
        lastUpdated: 'محدث الآن'
      },
      total_expenses: {
        value: formatCurrency(metrics?.monthlyExpenses),
        numericRaw: metrics?.monthlyExpenses || 0,
        changePercentage: -4.5,
        changeType: 'decrease',
        comparisonPeriodText: 'انخفاض في المصاريف',
        statusColor: 'rose',
        iconName: 'receipt',
        lastUpdated: 'محدث الآن'
      },
      today_transactions: {
        value: recentTransactions.length || 0,
        numericRaw: recentTransactions.length,
        changePercentage: 20.0,
        changeType: 'increase',
        comparisonPeriodText: 'حركات نقدية مسجلة',
        statusColor: 'blue',
        iconName: 'dollar',
        lastUpdated: 'محدث الآن'
      },
      receivables: {
        value: formatCurrency(metrics?.totalDebtsReceivable),
        numericRaw: metrics?.totalDebtsReceivable || 0,
        changePercentage: -5.0,
        changeType: 'decrease',
        comparisonPeriodText: 'تحصيل دفعات ممتازة',
        statusColor: 'amber',
        iconName: 'scale',
        lastUpdated: 'محدث الآن'
      },
      payables: {
        value: formatCurrency(metrics?.totalDebtsPayable),
        numericRaw: metrics?.totalDebtsPayable || 0,
        changePercentage: 0,
        changeType: 'neutral',
        comparisonPeriodText: 'التزامات للموردين',
        statusColor: 'rose',
        iconName: 'scale',
        lastUpdated: 'محدث الآن'
      },
      total_customers: {
        value: customersCount,
        numericRaw: customersCount,
        changePercentage: 15.3,
        changeType: 'increase',
        comparisonPeriodText: 'نمو قاعدة الزبائن',
        statusColor: 'blue',
        iconName: 'users',
        lastUpdated: 'محدث الآن'
      },
      new_customers: {
        value: Math.max(1, Math.floor(customersCount * 0.4)),
        numericRaw: Math.max(1, Math.floor(customersCount * 0.4)),
        changePercentage: 25.0,
        changeType: 'increase',
        comparisonPeriodText: 'زبائن جدد هذا الشهر',
        statusColor: 'emerald',
        iconName: 'users',
        lastUpdated: 'محدث الآن'
      },
      top_customer: {
        value: topCustomer,
        numericRaw: topSpent,
        changePercentage: 0,
        changeType: 'neutral',
        comparisonPeriodText: `مشتريات: ${formatCurrency(topSpent)}`,
        statusColor: 'purple',
        iconName: 'crown',
        lastUpdated: 'محدث الآن',
        subtitle: 'تصنيف VIP البلاتيني'
      },
      top_product: {
        value: 'بطاقات PUBG & Razer',
        numericRaw: totalOrders,
        changePercentage: 18.5,
        changeType: 'increase',
        comparisonPeriodText: `${totalOrders} طلب شحن إجمالي`,
        statusColor: 'orange',
        iconName: 'award',
        lastUpdated: 'محدث الآن'
      },
      cashback_pending: {
        value: formatCurrency(metrics?.totalCashbackPaid),
        numericRaw: metrics?.totalCashbackPaid || 0,
        changePercentage: 5.2,
        changeType: 'increase',
        comparisonPeriodText: 'مكافآت معتمدة ومسددة',
        statusColor: 'orange',
        iconName: 'gift',
        lastUpdated: 'محدث الآن'
      },
      referral_commissions: {
        value: formatCurrency(metrics?.totalReferralCommissionPaid),
        numericRaw: metrics?.totalReferralCommissionPaid || 0,
        changePercentage: 10.0,
        changeType: 'increase',
        comparisonPeriodText: 'عمولات إحالة مسددة',
        statusColor: 'amber',
        iconName: 'share',
        lastUpdated: 'محدث الآن'
      },
      open_tickets: {
        value: activeTicketsCount,
        numericRaw: activeTicketsCount,
        changePercentage: -12.0,
        changeType: 'decrease',
        comparisonPeriodText: 'تذاكر جارية تحت المتابعة',
        statusColor: activeTicketsCount > 0 ? 'amber' : 'emerald',
        iconName: 'ticket',
        lastUpdated: 'محدث الآن'
      },
      closed_tickets: {
        value: closedTicketsCount,
        numericRaw: closedTicketsCount,
        changePercentage: 30.0,
        changeType: 'increase',
        comparisonPeriodText: 'تم حلها وإغلاقها بنجاح',
        statusColor: 'emerald',
        iconName: 'check_circle',
        lastUpdated: 'محدث الآن'
      },
      completion_rate: {
        value: '98.5%',
        numericRaw: 98.5,
        changePercentage: 2.1,
        changeType: 'increase',
        comparisonPeriodText: 'معدل رضا وسرعة إنجاز',
        statusColor: 'emerald',
        iconName: 'flame',
        lastUpdated: 'محدث الآن'
      },
      attendance_today: {
        value: `${attendanceCount} ورديات`,
        numericRaw: attendanceCount,
        changePercentage: 0,
        changeType: 'neutral',
        comparisonPeriodText: 'التزام كامل بالمواعيد',
        statusColor: 'blue',
        iconName: 'calendar',
        lastUpdated: 'محدث الآن'
      },
      active_staff: {
        value: `${db.getUsers().filter(u => u.isActive).length} موظفين`,
        numericRaw: db.getUsers().length,
        changePercentage: 0,
        changeType: 'neutral',
        comparisonPeriodText: 'كادر الدعم والمالية',
        statusColor: 'purple',
        iconName: 'user_check',
        lastUpdated: 'محدث الآن'
      },
      middleman_company_commission: {
        value: formatCurrency(metrics?.middlemanProfit || 0),
        numericRaw: metrics?.middlemanProfit || 0,
        changePercentage: 16.5,
        changeType: 'increase',
        comparisonPeriodText: 'أرباح الوساطة وضمان الصفقات',
        statusColor: 'purple',
        iconName: 'shield_check',
        lastUpdated: 'محدث الآن',
        subtitle: 'عمولات الصفقات المكتملة'
      },
      middleman_third_party_commission: {
        value: formatCurrency(metrics?.totalExternalCommissionPaid || 0),
        numericRaw: metrics?.totalExternalCommissionPaid || 0,
        changePercentage: 5.0,
        changeType: 'increase',
        comparisonPeriodText: 'مستحقات الوسطاء الخارجيين',
        statusColor: 'amber',
        iconName: 'user_check',
        lastUpdated: 'محدث الآن',
        subtitle: 'عمولات الشركاء الخارجيين'
      },
      inventory_available_accounts: {
        value: `${(() => {
          const accs = db.getMiddlemanAccounts();
          return accs.filter(a => (a.availableQuantity === undefined || a.availableQuantity > 0) && a.status !== 'sold').length;
        })()} حسابات`,
        numericRaw: db.getMiddlemanAccounts().filter(a => (a.availableQuantity === undefined || a.availableQuantity > 0) && a.status !== 'sold').length,
        changePercentage: 12.0,
        changeType: 'increase',
        comparisonPeriodText: 'أصول جاهزة للبيع الفوري',
        statusColor: 'emerald',
        iconName: 'archive',
        lastUpdated: 'محدث الآن',
        subtitle: 'مخزن حسابات الألعاب المتاحة'
      },
      inventory_sold_accounts: {
        value: `${(() => {
          const accs = db.getMiddlemanAccounts();
          return accs.reduce((s, a) => s + (a.status === 'sold' || a.availableQuantity === 0 ? (a.soldQuantity || 1) : (a.soldQuantity || 0)), 0);
        })()} حسابات`,
        numericRaw: db.getMiddlemanAccounts().reduce((s, a) => s + (a.status === 'sold' || a.availableQuantity === 0 ? (a.soldQuantity || 1) : (a.soldQuantity || 0)), 0),
        changePercentage: 22.4,
        changeType: 'increase',
        comparisonPeriodText: 'حسابات تم بيعها وتصفيتها',
        statusColor: 'blue',
        iconName: 'shopping_bag',
        lastUpdated: 'محدث الآن',
        subtitle: 'إجمالي الحسابات المباعة'
      }
    };
  }, [metrics, customersCount, activeTicketsCount, closedTicketsCount, recentTransactions, topCustomers, attendanceCount]);

  // Sort cards: Pinned cards first, then by user order
  const sortedVisibleCards = useMemo(() => {
    const visible = workspace.kpiCards.filter(c => c.isVisible);
    return visible.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.order - b.order;
    });
  }, [workspace.kpiCards]);

  // Handle clicking on a KPI card to open Drill-Down Details Modal
  const handleKpiCardClick = (card: KpiCardConfig) => {
    const kpiVal = kpiDataMap[card.id]?.value || '0';
    const kpiSubtitle = kpiDataMap[card.id]?.subtitle || kpiDataMap[card.id]?.comparisonPeriodText;
    setDrillDownState({
      isOpen: true,
      kpiId: card.id,
      kpiTitle: card.title,
      kpiValue: kpiVal,
      kpiSubtitle
    });
  };

  const sections = [
    {
      id: 'tickets',
      title: 'تذاكر الشحن',
      desc: 'إدارة الطلبات الفورية، وضع حاسبة الأسعار، الكاش باك، وطباعة الفواتير',
      icon: Ticket,
      color: 'from-orange-500/20 to-orange-600/5 text-orange-500 border-orange-500/30',
      badge: `${activeTicketsCount} طلب جاري`,
      isReady: true,
      stats: 'دورة حياة الشحن الفوري'
    },
    {
      id: 'customers',
      title: 'البروفايلات والعملاء',
      desc: 'إدارة حسابات الزبائن، الشركاء، المحلات، المشاهير، والكاش باك الموحد',
      icon: Users,
      color: 'from-blue-500/20 to-blue-600/5 text-blue-500 border-blue-500/30',
      badge: `${customersCount} بروفايل`,
      isReady: true,
      stats: 'حماية الاحتيال والولاء'
    },
    {
      id: 'catalog',
      title: 'المنتجات والمحافظ',
      desc: 'شجرة الألعاب، سعر صرف USDT، محافظ المتجر الـ 6 وسندات FIFO',
      icon: Gamepad2,
      color: 'from-emerald-500/20 to-emerald-600/5 text-emerald-500 border-emerald-500/30',
      badge: 'متعدد العملات',
      isReady: true,
      stats: 'التسعير الديناميكي'
    },
    {
      id: 'coupons',
      title: 'كوبونات الخصم',
      desc: 'كوبون أول شحنة بسعر التكلفة، كوبونات الحملات، والخصومات الخاصة',
      icon: Tag,
      color: 'from-rose-500/20 to-rose-600/5 text-rose-500 border-rose-500/30',
      badge: 'حماية الـ ID',
      isReady: true,
      stats: 'محرك الخصومات'
    },
    {
      id: 'reports',
      title: 'التقارير والورديات',
      desc: 'تسوية الوردية اليومية، تقارير الشركاء، مبيعات الألعاب وحركة المحافظ',
      icon: FileText,
      color: 'from-cyan-500/20 to-cyan-600/5 text-cyan-500 border-cyan-500/30',
      badge: 'تسوية آلية',
      isReady: true,
      stats: 'التقارير المالية'
    },
    {
      id: 'finance',
      title: 'المالية والخزينة',
      desc: 'مركز الصندوق والخزنة، المصاريف، الديون، التسويات ومسيرات الرواتب',
      icon: Wallet,
      color: 'from-emerald-500/20 to-emerald-600/5 text-emerald-500 border-emerald-500/30',
      badge: `الخزنة: ${formatCurrency(metrics?.vaultBalance)}`,
      isReady: true,
      stats: `صافي الربح: ${formatCurrency(metrics?.netProfit)}`
    },
    {
      id: 'merchants',
      title: 'التجار والموردين',
      desc: 'إدارة الموردين والتجار، فواتير المشتريات ومؤشر درجة الثقة (Trust Score)',
      icon: Store,
      color: 'from-amber-500/20 to-amber-600/5 text-amber-500 border-amber-500/30',
      badge: 'درجة الثقة',
      isReady: true,
      stats: '15 عامل تقييم'
    }
  ];

  const todayPulse = useMemo(() => {
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const tickets = db.getTickets();
    const todayCompleted = tickets.filter(t => t.status === 'completed' && t.createdAt?.startsWith(todayPrefix));
    const todayRevenue = todayCompleted.reduce((s, t) => s + (t.requiredAmount || t.receivedAmount || 0), 0);
    const todayProfit = todayCompleted.reduce((s, t) => s + (t.totalProfitMargin ?? t.netProfit ?? Math.max(0, (t.requiredAmount || 0) - (t.totalCostAmount || 0))), 0);
    const pendingCount = tickets.filter(t => t.status === 'new' || t.status === 'in_progress' || t.status === 'problem').length;
    const todayCount = todayCompleted.length;
    return { todayRevenue, todayProfit, todayCount, pendingCount };
  }, [metrics]);

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4">
      {/* Breadcrumb Path & Top Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1">
        <Breadcrumb
          items={[
            { id: 'home', label: 'الرئيسية (لوحة التحكم المركزية)', active: true }
          ]}
        />
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          <Button
            variant="primary"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => setIsReportModalOpen(true)}
            className="whitespace-nowrap shadow-xs cursor-pointer"
          >
            🖨️ تقرير الأداء الشامل
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />}
            onClick={() => setIsCustomizerOpen(true)}
            className="whitespace-nowrap cursor-pointer"
          >
            تخصيص KPI ({sortedVisibleCards.length})
          </Button>
        </div>
      </div>

      {/* Command Center Header & Fast Action Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xl font-black text-zinc-900 dark:text-white">مرحباً بك، {user?.fullName} 👋</span>
              <span className="text-xs bg-orange-500 text-white font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                {user?.role === 'admin' ? '👑 المدير العام' : user?.jobTitle}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              مركز القيادة والتحكم الإداري الموحد. متابعة فورية لكافة العمليات المالية، الأرصدة الحية، وأداء الأقسام.
            </p>
          </div>

          {/* Quick 1-Click Operations Floating Bar */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 w-full lg:w-auto justify-start lg:justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={<Ticket className="w-4 h-4" />}
              onClick={() => {
                openTab({ id: 'tickets', title: 'تذاكر الشحن', section: 'tickets', iconType: 'tickets' as any });
                if (onOpenCustomerModal) onOpenCustomerModal();
              }}
              className="whitespace-nowrap cursor-pointer shadow-xs"
            >
              + تذكرة شحن
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Store className="w-4 h-4 text-amber-500" />}
              onClick={() => {
                openTab({ id: 'dealers', title: 'التجار والموزعين', section: 'dealers', iconType: 'dealers' as any });
              }}
              className="whitespace-nowrap cursor-pointer"
            >
              + فاتورة جملة
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<ShieldCheck className="w-4 h-4 text-purple-500" />}
              onClick={() => {
                openTab({ id: 'middleman', title: 'الوساطة والمخزن', section: 'middleman', iconType: 'middleman' as any });
              }}
              className="whitespace-nowrap cursor-pointer"
            >
              + صفقة وساطة
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
              onClick={() => {
                openTab({ id: 'finance_vault', title: 'الخزينة', section: 'finance_vault', iconType: 'finance' as any });
                if (onOpenVaultModal) onOpenVaultModal();
              }}
              className="whitespace-nowrap cursor-pointer"
            >
              إيداع خزنة
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Receipt className="w-4 h-4 text-rose-500" />}
              onClick={() => {
                openTab({ id: 'finance_expenses', title: 'المصروفات', section: 'finance_expenses', iconType: 'finance' as any });
                if (onOpenExpenseModal) onOpenExpenseModal();
              }}
              className="whitespace-nowrap cursor-pointer"
            >
              تسجيل مصروف
            </Button>
          </div>
        </div>

        {/* ⚡ Today's Live Pulse Ticker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100 dark:border-[#27272A]/70">
          <div
            onClick={() => openTab({ id: 'tickets', title: 'تذاكر الشحن', section: 'tickets', iconType: 'tickets' as any })}
            className="p-3 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 cursor-pointer transition-all flex items-center justify-between"
            title="انقر لفتح التذاكر"
          >
            <div>
              <span className="text-[10px] font-bold text-blue-500 block">مبيعات اليوم</span>
              <strong className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(todayPulse.todayRevenue)}</strong>
            </div>
            <TrendingUp className="w-4 h-4 text-blue-500 opacity-70" />
          </div>

          <div
            onClick={() => openTab({ id: 'finance', title: 'المالية', section: 'finance', iconType: 'finance' as any })}
            className="p-3 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 cursor-pointer transition-all flex items-center justify-between"
            title="انقر لفتح المركز المالي"
          >
            <div>
              <span className="text-[10px] font-bold text-emerald-500 block">أرباح اليوم الصافية</span>
              <strong className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(todayPulse.todayProfit)}</strong>
            </div>
            <Sparkles className="w-4 h-4 text-emerald-500 opacity-70" />
          </div>

          <div
            onClick={() => openTab({ id: 'tickets', title: 'تذاكر الشحن', section: 'tickets', iconType: 'tickets' as any })}
            className="p-3 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 cursor-pointer transition-all flex items-center justify-between"
            title="انقر لفتح تذاكر اليوم المكتملة"
          >
            <div>
              <span className="text-[10px] font-bold text-purple-500 block">طلبات اليوم المكتملة</span>
              <strong className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100">{todayPulse.todayCount} طلب</strong>
            </div>
            <CheckCircle2 className="w-4 h-4 text-purple-500 opacity-70" />
          </div>

          <div
            onClick={() => openTab({ id: 'tickets', title: 'تذاكر الشحن', section: 'tickets', iconType: 'tickets' as any })}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              todayPulse.pendingCount > 0
                ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15 animate-pulse'
                : 'bg-gray-500/5 border-gray-500/20'
            }`}
            title="انقر لفتح التذاكر المعلقة لمتابعتها"
          >
            <div>
              <span className="text-[10px] font-bold text-amber-500 block">تذاكر قيد المتابعة</span>
              <strong className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-100">{todayPulse.pendingCount} طلب جاري</strong>
            </div>
            <Clock className="w-4 h-4 text-amber-500 opacity-70" />
          </div>
        </div>
      </div>

      {/* Universal Single Source of Truth Filter Bar */}
      <UnifiedFinanceFilterBar
        filter={filter}
        onChange={setFilter}
        onReset={() =>
          setFilter({
            datePreset: 'all',
            customStartDate: '',
            customEndDate: '',
            department: 'all',
            gameName: 'all',
            planId: 'all',
            personQuery: '',
            employeeId: 'all',
            transactionType: 'all'
          })
        }
      />

      {/* Smart KPI Grid (Fully Customizable, Reorderable, Resizable) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>مركز مؤشرات الأداء الحية (Smart KPI Dashboard)</span>
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {sortedVisibleCards.length} بطاقة معروضة • تخصيص مستقل لحسابك
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {getOrderedItems('dashboard_kpis', sortedVisibleCards).map((card, idx) => {
              const data = kpiDataMap[card.id] || {
                value: '0',
                numericRaw: 0,
                changePercentage: 0,
                changeType: 'neutral',
                comparisonPeriodText: 'محدث الآن',
                statusColor: 'blue',
                iconName: 'flame',
                lastUpdated: 'محدث الآن'
              };

              return (
                <SortableDraggableItem
                  key={card.id}
                  id={card.id}
                  index={idx}
                  containerId="dashboard_kpis"
                  direction="horizontal"
                  className="h-full"
                >
                  <SmartKpiCard
                    config={card}
                    data={data}
                    onClick={() => handleKpiCardClick(card)}
                    onTogglePin={toggleKpiPin}
                    onChangeSize={changeKpiSize}
                    onHide={toggleKpiVisibility}
                  />
                </SortableDraggableItem>
              );
            })}
          </div>
        )}
      </div>

      {/* Consolidated Enterprise Totals Section */}
      {(() => {
        const safeMetrics = metrics || db.getFinanceMetrics(filter);
        return (
          <>
            <SystemTotalsSection
              metrics={safeMetrics}
              filter={filter}
              onDrillDown={(id, title, value) => {
                setDrillDownState({
                  isOpen: true,
                  kpiId: id,
                  kpiTitle: title,
                  kpiValue: value,
                  kpiSubtitle: 'تفاصيل إجمالي النظام'
                });
              }}
              onNavigate={onNavigate}
            />

            {/* Live Wallets & Banks Real-Time Radar */}
            {(filter.department === 'all' || filter.department === 'wallets') && (
              <LiveWalletsRadarSection
                onOpenTransferModal={() => {
                  openTab({ id: 'finance_wallets', title: 'المحافظ والبنوك', section: 'finance_wallets', iconType: 'finance' as any });
                }}
                onOpenDepositVoucher={() => {
                  openTab({ id: 'finance_wallets', title: 'المحافظ والبنوك', section: 'finance_wallets', iconType: 'finance' as any });
                }}
                onNavigate={onNavigate}
              />
            )}

            {/* Top Games & Products Radar */}
            {(filter.department === 'all' || filter.department === 'customers') && (
              <TopGamesRadarSection
                filter={filter}
                onSelectGameFilter={(gameName) => setFilter(prev => ({ ...prev, gameName }))}
              />
            )}

            {/* 1. Customers Department Card */}
            {(filter.department === 'all' || filter.department === 'customers') && (
              <CustomersSectionCard
                metrics={safeMetrics}
                filter={filter}
                onDrillDown={(id, title, value) => {
                  setDrillDownState({
                    isOpen: true,
                    kpiId: id,
                    kpiTitle: title,
                    kpiValue: value,
                    kpiSubtitle: 'بيانات قسم الزبائن والشحن'
                  });
                }}
                onNavigate={onNavigate}
              />
            )}

            {/* 2. Dealers & Wholesale Department Card */}
            {(filter.department === 'all' || filter.department === 'dealers') && (
              <DealersSectionCard
                metrics={safeMetrics}
                filter={filter}
                onDrillDown={(id, title, value) => {
                  setDrillDownState({
                    isOpen: true,
                    kpiId: id,
                    kpiTitle: title,
                    kpiValue: value,
                    kpiSubtitle: 'بيانات قسم التجار والموزعين'
                  });
                }}
                onNavigate={onNavigate}
              />
            )}

            {/* 3. Middleman & Escrow Department Card */}
            {(filter.department === 'all' || filter.department === 'middleman' || (filter.department as string) === 'brokerage') && (
              <MiddlemanSectionCard
                metrics={safeMetrics}
                filter={filter}
                onDrillDown={(id, title, value) => {
                  setDrillDownState({
                    isOpen: true,
                    kpiId: id,
                    kpiTitle: title,
                    kpiValue: value,
                    kpiSubtitle: 'بيانات قسم الوساطة والضمان'
                  });
                }}
                onNavigate={onNavigate}
              />
            )}

            {/* 4. Subscriptions Department Card */}
            {(filter.department === 'all' || filter.department === 'subscriptions') && (
              <SubscriptionsSectionCard
                metrics={safeMetrics}
                filter={filter}
                onDrillDown={(id, title, value) => {
                  setDrillDownState({
                    isOpen: true,
                    kpiId: id,
                    kpiTitle: title,
                    kpiValue: value,
                    kpiSubtitle: 'بيانات قسم الاشتراكات الرقمية'
                  });
                }}
                onNavigate={onNavigate}
              />
            )}

            {/* Cross-Department Comparison Section (Shown when viewing all departments) */}
            {filter.department === 'all' && (
              <DepartmentComparisonSection
                metrics={safeMetrics}
                filter={filter}
                onDrillDown={(id, title, value) => {
                  setDrillDownState({
                    isOpen: true,
                    kpiId: id,
                    kpiTitle: title,
                    kpiValue: value,
                    kpiSubtitle: 'مقارنة الأقسام'
                  });
                }}
                onNavigate={onNavigate}
              />
            )}
          </>
        );
      })()}

      {/* Quick 1-Click Reports & Audits */}
      <QuickReportsSection
        filter={filter}
        onNavigate={onNavigate}
      />

      {/* System Sections Grid */}
      <div>
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
          <span>أقسام النظام والأدوات المتقدمة</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">(الوصول السريع)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getOrderedItems('dashboard_quick_sections', sections).map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <SortableDraggableItem
                key={sec.id}
                id={sec.id}
                index={idx}
                containerId="dashboard_quick_sections"
                direction="horizontal"
                className="h-full"
              >
                <Card
                  hoverEffect={sec.isReady}
                  onClick={() => {
                    if (sec.isReady) {
                      openTab({
                        id: sec.id,
                        title: sec.title.replace('قسم ', ''),
                        section: sec.id,
                        iconType: sec.id as any
                      });
                    }
                  }}
                  className={`p-5 h-full relative overflow-hidden transition-all text-right ${
                    sec.isReady
                      ? 'cursor-pointer hover:border-orange-500/60'
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-3 rounded-2xl border ${sec.color} bg-gradient-to-br`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge variant={sec.isReady ? 'orange' : 'default'} size="sm">
                      {sec.badge}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 mb-1">
                    {sec.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed line-clamp-2">
                    {sec.desc}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#27272A] text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <span>{sec.stats}</span>
                    {sec.isReady && (
                      <span className="text-orange-500 flex items-center gap-0.5 group-hover:translate-x-[-4px] transition-transform">
                        فتح القسم <ChevronLeft className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </Card>
              </SortableDraggableItem>
            );
          })}
        </div>
      </div>

      {/* Break-Even Target Indicator (مؤشر نقطة التعادل للطلبات) */}
      {(() => {
        const rateInfo = db.getExchangeRate();
        const target = rateInfo?.monthlyBreakEvenTargetOrders || 1500;
        const allTickets = db.getTickets();
        const completedCount = allTickets.filter(t => t.status === 'completed').length;
        const percentage = Math.min(100, Math.round((completedCount / target) * 100));
        const remaining = Math.max(0, target - completedCount);
        const status = percentage >= 80 ? 'safe' : percentage >= 50 ? 'warning' : 'deficit';

        return (
          <Card className="p-5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-500" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    مؤشر نقطة التعادل الشهري (Break-even Indicator)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    الهدف الشهري لتغطية التكاليف التشغيلية وتحقيق الأرباح الصافية
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                    status === 'safe'
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : status === 'warning'
                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  }`}
                >
                  <span>{status === 'safe' ? '🟢 آمن (تم تجاوز الهدف)' : status === 'warning' ? '🟡 تحذير (قريب من الهدف)' : '🔴 عجز (مطلوب متابعة)'}</span>
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    status === 'safe' ? 'bg-emerald-500' : status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500 font-mono font-bold">
                <span>المنجز: {completedCount} طلب ({percentage}%)</span>
                <span>التارجت الشهري: {target} طلب</span>
                <span>المتبقي: {remaining} طلب</span>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Speed & CSAT Rating KPI Banner */}
      {(() => {
        const completedTickets = db.getTickets().filter(t => t.status === 'completed');
        const avgSpeed = completedTickets.length > 0
          ? Math.round((completedTickets.reduce((acc, t) => acc + (t.executionDurationMinutes || 2), 0) / completedTickets.length) * 10) / 10
          : 2.5;
        const ratedTickets = completedTickets.filter(t => t.customerRating);
        const avgRating = ratedTickets.length > 0
          ? Math.round((ratedTickets.reduce((acc, t) => acc + (t.customerRating || 5), 0) / ratedTickets.length) * 10) / 10
          : 4.9;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 bg-white dark:bg-[#18181B] flex items-center justify-between border border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 font-bold block">متوسط سرعة تنفيذ الطلبات</span>
                  <strong className="text-base font-black font-mono text-cyan-400">{avgSpeed} دقيقة / طلب</strong>
                </div>
              </div>
              <Badge variant="info" size="sm">⚡ سرعة فائقة</Badge>
            </Card>

            <Card className="p-4 bg-white dark:bg-[#18181B] flex items-center justify-between border border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 font-bold block">مؤشر رضا الزبائن (CSAT Score)</span>
                  <strong className="text-base font-black font-mono text-amber-400">{avgRating} / 5.0 ⭐</strong>
                </div>
              </div>
              <Badge variant="orange" size="sm">{ratedTickets.length} تقييم مسجل</Badge>
            </Card>
          </div>
        );
      })()}

      {/* Re-activation Radar for Dormant Customers (30+ Days) */}
      {(() => {
        const allCust = db.getCustomers();
        const dormantCustomers = allCust.filter(c => {
          if (!c.lastPurchaseDate) return true;
          const days = Math.round((new Date().getTime() - new Date(c.lastPurchaseDate).getTime()) / (1000 * 3600 * 24));
          return days >= 30;
        }).slice(0, 4);

        const handleCreateWinbackCoupon = (customer: Customer) => {
          const couponCode = `WINBACK-${customer.code.replace(/[^A-Z0-9]/g, '') || Math.floor(100 + Math.random() * 900)}`;
          const exists = db.getCoupons().some(c => c.code === couponCode);
          if (!exists) {
            db.saveCoupon({
              id: 'cpn_wb_' + Date.now(),
              code: couponCode,
              title: `كوبون عودة وترحيب خاص للعميل ${customer.name}`,
              type: 'customer_specific',
              discountType: 'fixed_amount',
              discountValue: 50,
              targetCustomerId: customer.id,
              targetCustomerName: customer.name,
              targetCustomerPhone: customer.phone,
              compensationReason: 'عرض عودة خاص وتنشيط حساب العميل الخامل',
              maxUsageTotal: 1,
              currentUsageCount: 0,
              maxUsagePerCustomer: 1,
              usedByPlayerGameIds: [],
              isActive: true,
              isAutoDeactivated: false,
              createdAt: new Date().toISOString()
            });
            alert(`تم إنشاء كوبون العودة بنجاح (${couponCode}) بقيمة 50 ج مخصص للعميل ${customer.name}`);
          } else {
            alert(`كوبون العودة مسجل مسبقاً لهذا العميل (${couponCode})`);
          }
        };

        return (
          <Card className="p-4 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    🎯 رادار إعادة تنشيط العملاء الخاملين (30+ يوم بدون شحن)
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    اكتشاف العملاء الذين توقفوا عن الشحن لتقديم عروض عودة مخصصة
                  </p>
                </div>
              </div>
              <Badge variant="purple" size="sm">{dormantCustomers.length} عملاء بحاجة لتنشيط</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {dormantCustomers.map(cust => (
                <div
                  key={cust.id}
                  className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{cust.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{cust.phone}</span>
                  </div>

                  <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                    <span>إجمالي المشتريات السابقة:</span>
                    <strong className="font-mono text-zinc-300">{cust.totalSpent} ج</strong>
                  </div>

                  <button
                    onClick={() => handleCreateWinbackCoupon(cust)}
                    className="w-full py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500 hover:text-white text-purple-400 text-[11px] font-bold transition-all"
                  >
                    🎁 إنشاء كوبون عودة (50 ج)
                  </button>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* The 3 Fast Quick Lists from Specification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Last 10 Tickets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-orange-500" />
              <span>آخر 10 تذاكر شحن</span>
            </h3>
            <button
              onClick={() => openTab({ id: 'tickets', title: 'التذاكر', section: 'tickets', iconType: 'tickets' as any })}
              className="text-xs text-orange-500 hover:underline font-semibold"
            >
              عرض الكل
            </button>
          </div>

          <Card className="overflow-hidden p-2 space-y-1.5">
            {db.getTickets().slice(0, 10).map(t => (
              <div
                key={t.id}
                onClick={() => openTab({ id: 'tickets', title: 'تذاكر الشحن', section: 'tickets', iconType: 'tickets' as any })}
                className="p-2.5 rounded-xl bg-gray-50/50 dark:bg-[#141417] flex items-center justify-between text-xs cursor-pointer hover:bg-orange-500/10 transition-colors"
                title="انقر لفتح التذكرة في قسم التذاكر"
              >
                <div>
                  <span className="font-mono font-bold text-orange-500 block">{t.ticketNumber}</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-bold">{t.customerName}</span>
                </div>
                <div className="text-left">
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 block">{t.requiredAmount} ج</span>
                  <Badge variant={t.status === 'completed' ? 'success' : t.status === 'new' ? 'warning' : 'info'} size="sm">
                    {t.status}
                  </Badge>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* 2. Pending / Followup Tickets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>التذاكر المعلقة (تحتاج متابعة)</span>
            </h3>
            <span className="text-xs text-zinc-400">
              {db.getTickets().filter(t => t.status === 'new' || t.status === 'in_progress' || t.status === 'problem').length} طلب
            </span>
          </div>

          <Card className="overflow-hidden p-2 space-y-1.5">
            {db.getTickets().filter(t => t.status === 'new' || t.status === 'in_progress' || t.status === 'problem').slice(0, 8).map(t => (
              <div
                key={t.id}
                onClick={() => openTab({ id: 'tickets', title: 'تذاكر الشحن', section: 'tickets', iconType: 'tickets' as any })}
                className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between text-xs cursor-pointer hover:bg-amber-500/15 transition-colors"
                title="انقر لفتح التذكرة ومتابعتها"
              >
                <div>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{t.gameProductName}</span>
                  <span className="text-zinc-500 text-[11px]">ID: {t.playerGameId} • {t.customerPhone}</span>
                </div>
                <div className="text-left">
                  <Badge variant={t.status === 'problem' ? 'danger' : 'warning'} size="sm">
                    {t.status === 'problem' ? 'مشكلة' : 'معلقة'}
                  </Badge>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* 3. System Alerts: Wallets, Debts & Partner Warnings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>تنبيهات النظام الذكية</span>
            </h3>
            <span className="text-xs text-rose-500 font-bold">نشطة</span>
          </div>

          <Card className="overflow-hidden p-2 space-y-2 text-xs">
            {/* Wallet Near Depletion alert */}
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-2">
              <Wallet className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-orange-500 block">رصيد محافظ البضاعة</span>
                <span className="text-zinc-600 dark:text-zinc-300 text-[11px]">
                  محفظة كروت Google Play قاربت على الانتهاء (المتبقي: 340 وحدة).
                </span>
              </div>
            </div>

            {/* Installments alert */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-500 block">مواعيد الأقساط والديون</span>
                <span className="text-zinc-600 dark:text-zinc-300 text-[11px]">
                  قسط بقيمة 200 ج يستحق السداد خلال يومين للزبون عمر خالد.
                </span>
              </div>
            </div>

            {/* Partner Target Warnings */}
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-2">
              <Award className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-purple-500 block">متابعة تارجت الشركاء</span>
                <span className="text-zinc-600 dark:text-zinc-300 text-[11px]">
                  الشريك محمود طارق حقق 14 عميلاً جديداً هذا الشهر (متجاوز التارجت 🟢).
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* KPI Customizer Modal */}
      <KpiCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        kpiCards={workspace.kpiCards}
        onToggleVisibility={toggleKpiVisibility}
        onTogglePin={toggleKpiPin}
        onChangeSize={changeKpiSize}
        onReorder={reorderKpiCards}
        onResetToDefaults={resetWorkspace}
      />

      {/* 🖨️ Professional Report Generator Modal */}
      {isReportModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          defaultTemplateType="dashboard"
        />
      )}

      {/* 🔍 KPI Drill-Down Modal (Single Source of Truth) */}
      <KpiDrillDownModal
        isOpen={drillDownState.isOpen}
        onClose={() => setDrillDownState(prev => ({ ...prev, isOpen: false }))}
        kpiId={drillDownState.kpiId}
        kpiTitle={drillDownState.kpiTitle}
        kpiValue={drillDownState.kpiValue}
        kpiSubtitle={drillDownState.kpiSubtitle}
        transactions={unifiedTransactions}
        filter={filter}
      />
    </div>
  );
};
