export type KpiSize = '1x' | '2x' | '3x'; // 1x = 1 Col, 2x = 2 Col Wide, 3x = 3 Col Full

export interface KpiCardConfig {
  id: string;
  title: string;
  category: 'financial' | 'customers' | 'operations' | 'hr';
  isVisible: boolean;
  isPinned: boolean;
  size: KpiSize;
  order: number;
  targetSection: string;
  targetSubTab?: string;
}

export interface KpiValueData {
  value: string | number;
  numericRaw: number;
  changePercentage: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  comparisonPeriodText: string;
  statusColor: 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' | 'orange';
  iconName: string;
  lastUpdated: string;
  subtitle?: string;
}

export interface UserWorkspaceSettings {
  userId: string;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  activeTabId: string;
  openTabs: Array<{
    id: string;
    title: string;
    section: string;
    iconType: string;
    payload?: any;
    closable: boolean;
  }>;
  kpiCards: KpiCardConfig[];
  tablePreferences: {
    customersPageSize: number;
    customersSortBy: string;
    customersSortOrder: 'asc' | 'desc';
    financePageSize: number;
    hiddenCustomerColumns: string[];
  };
  lastSavedAt: string;
}
