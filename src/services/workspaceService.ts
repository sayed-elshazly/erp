import { UserWorkspaceSettings, KpiCardConfig } from '../types/kpi.types';

export const defaultKpiCards: KpiCardConfig[] = [
  { id: 'vault_balance', title: 'الرصيد داخل الخزنة', category: 'financial', isVisible: true, isPinned: true, size: '2x', order: 0, targetSection: 'finance', targetSubTab: 'vault' },
  { id: 'net_profit', title: 'صافي الأرباح', category: 'financial', isVisible: true, isPinned: true, size: '2x', order: 1, targetSection: 'finance', targetSubTab: 'overview' },
  { id: 'total_sales', title: 'إجمالي المبيعات', category: 'financial', isVisible: true, isPinned: false, size: '1x', order: 2, targetSection: 'finance', targetSubTab: 'overview' },
  { id: 'gross_profit', title: 'إجمالي الأرباح التشغيلية', category: 'financial', isVisible: true, isPinned: false, size: '1x', order: 3, targetSection: 'finance', targetSubTab: 'overview' },
  { id: 'total_expenses', title: 'إجمالي المصروفات', category: 'financial', isVisible: true, isPinned: false, size: '1x', order: 4, targetSection: 'finance', targetSubTab: 'expenses' },
  { id: 'today_transactions', title: 'عدد العمليات اليوم', category: 'operations', isVisible: true, isPinned: false, size: '1x', order: 5, targetSection: 'finance', targetSubTab: 'vault' },
  { id: 'receivables', title: 'المبالغ المستحقة (لنا)', category: 'financial', isVisible: true, isPinned: false, size: '1x', order: 6, targetSection: 'finance', targetSubTab: 'debts' },
  { id: 'payables', title: 'الالتزامات والديون (علينا)', category: 'financial', isVisible: true, isPinned: false, size: '1x', order: 7, targetSection: 'finance', targetSubTab: 'debts' },
  { id: 'total_customers', title: 'عدد العملاء الكلي', category: 'customers', isVisible: true, isPinned: false, size: '1x', order: 8, targetSection: 'customers' },
  { id: 'new_customers', title: 'العملاء الجدد هذا الشهر', category: 'customers', isVisible: true, isPinned: false, size: '1x', order: 9, targetSection: 'customers' },
  { id: 'top_customer', title: 'أفضل عميل نشاطاً', category: 'customers', isVisible: true, isPinned: false, size: '2x', order: 10, targetSection: 'customers' },
  { id: 'top_product', title: 'أعلى خدمة / بطاقة طلباً', category: 'operations', isVisible: true, isPinned: false, size: '1x', order: 11, targetSection: 'dashboard' },
  { id: 'cashback_pending', title: 'الكاش باك المستحق', category: 'financial', isVisible: true, isPinned: false, size: '1x', order: 12, targetSection: 'finance', targetSubTab: 'cashback_commissions' },
  { id: 'referral_commissions', title: 'عمولات الإحالة المكتسبة', category: 'financial', isVisible: true, isPinned: false, size: '1x', order: 13, targetSection: 'finance', targetSubTab: 'cashback_commissions' },
  { id: 'open_tickets', title: 'عدد التذاكر المفتوحة', category: 'operations', isVisible: true, isPinned: false, size: '1x', order: 14, targetSection: 'customers' },
  { id: 'closed_tickets', title: 'عدد التذاكر المغلقة والمنجزة', category: 'operations', isVisible: true, isPinned: false, size: '1x', order: 15, targetSection: 'customers' },
  { id: 'completion_rate', title: 'نسبة الإنجاز وسرعة الرد', category: 'operations', isVisible: true, isPinned: false, size: '1x', order: 16, targetSection: 'customers' },
  { id: 'attendance_today', title: 'الحضور والورديات اليوم', category: 'hr', isVisible: true, isPinned: false, size: '1x', order: 17, targetSection: 'finance', targetSubTab: 'attendance_salaries' },
  { id: 'active_staff', title: 'عدد الموظفين المتواجدين', category: 'hr', isVisible: true, isPinned: false, size: '1x', order: 18, targetSection: 'finance', targetSubTab: 'attendance_salaries' },
  { id: 'middleman_company_commission', title: 'إجمالي عمولة الشركة', category: 'financial', isVisible: true, isPinned: false, size: '1x', order: 19, targetSection: 'middleman_dashboard', targetSubTab: 'deals' },
  { id: 'middleman_third_party_commission', title: 'إجمالي عمولات الطرف الثالث', category: 'financial', isVisible: true, isPinned: false, size: '1x', order: 20, targetSection: 'middleman_dashboard', targetSubTab: 'deals' },
  { id: 'inventory_available_accounts', title: 'حسابات المخزن المتاحة', category: 'operations', isVisible: true, isPinned: false, size: '1x', order: 21, targetSection: 'middleman_dashboard', targetSubTab: 'inventory' },
  { id: 'inventory_sold_accounts', title: 'عدد الحسابات المباعة', category: 'operations', isVisible: true, isPinned: false, size: '1x', order: 22, targetSection: 'middleman_dashboard', targetSubTab: 'sold' }
];

export const getDefaultWorkspace = (userId: string): UserWorkspaceSettings => ({
  userId,
  theme: 'dark',
  sidebarCollapsed: false,
  fontSize: 'md',
  activeTabId: 'dashboard',
  openTabs: [
    {
      id: 'dashboard',
      title: 'الرئيسية',
      section: 'dashboard',
      iconType: 'dashboard',
      closable: false
    }
  ],
  kpiCards: defaultKpiCards,
  tablePreferences: {
    customersPageSize: 10,
    customersSortBy: 'createdAt',
    customersSortOrder: 'desc',
    financePageSize: 10,
    hiddenCustomerColumns: []
  },
  lastSavedAt: new Date().toISOString()
});

export const workspaceService = {
  getWorkspace: (userId: string): UserWorkspaceSettings => {
    try {
      const raw = localStorage.getItem(`nzm_jkr_ws_${userId}`);
      if (!raw) return getDefaultWorkspace(userId);
      const parsed = JSON.parse(raw);
      // Ensure any newly added KPI cards exist in saved state
      const savedCardIds = new Set((parsed.kpiCards || []).map((c: any) => c.id));
      const missingCards = defaultKpiCards.filter(c => !savedCardIds.has(c.id));
      const mergedCards = [...(parsed.kpiCards || defaultKpiCards), ...missingCards];
      return { ...getDefaultWorkspace(userId), ...parsed, kpiCards: mergedCards };
    } catch {
      return getDefaultWorkspace(userId);
    }
  },

  saveWorkspace: (settings: UserWorkspaceSettings): void => {
    try {
      const updated = { ...settings, lastSavedAt: new Date().toISOString() };
      localStorage.setItem(`nzm_jkr_ws_${settings.userId}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving workspace persistence', e);
    }
  },

  resetWorkspace: (userId: string): UserWorkspaceSettings => {
    const defaults = getDefaultWorkspace(userId);
    workspaceService.saveWorkspace(defaults);
    return defaults;
  }
};
