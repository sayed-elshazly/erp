export type ReportTemplateType =
  | 'dashboard'
  | 'customers'
  | 'customer_statement'
  | 'ticket_invoice'
  | 'catalog'
  | 'wallets'
  | 'wallet_statement'
  | 'bonds'
  | 'codes'
  | 'coupons'
  | 'shift_settlement'
  | 'sales'
  | 'expenses'
  | 'payroll'
  | 'employee_statement'
  | 'merchants'
  | 'merchants_statement'
  | 'cash_register'
  | 'subscriptions'
  | 'broker';

export interface ReportConfig {
  startDate: string;
  endDate: string;
  reportType: 'summary' | 'detailed'; // ملخص | تفصيلي
  showProfits: boolean; // إظهار الأرباح
  showCosts: boolean; // إظهار التكاليف
  showExpenses: boolean; // إظهار المصروفات
  showLogo: boolean; // إظهار شعار الشركة
  showUserData: boolean; // إظهار بيانات المستخدم
  showPageNumbers: boolean; // إظهار أرقام الصفحات
  showManagerSignature: boolean; // توقيع المدير والختم
  
  // Specific Filters
  filterCustomerId?: string;
  filterEmployeeId?: string;
  filterGameId?: string;
  filterWalletId?: string;
  filterMerchantId?: string;
  filterStatus?: string;
  
  paperSize?: 'A4' | 'A5';
  orientation?: 'portrait' | 'landscape';
}

export interface ReportKPI {
  label: string;
  value: string | number;
  color?: 'orange' | 'green' | 'red' | 'blue' | 'purple' | 'gray';
  subtext?: string;
}

export interface ReportTableColumn {
  header: string;
  key: string;
  align?: 'right' | 'center' | 'left';
  width?: string;
}

export interface ReportTable {
  title?: string;
  columns: ReportTableColumn[];
  rows: Record<string, any>[];
  totals?: Record<string, string | number>;
}

export interface ReportDocumentData {
  id: string;
  templateType: ReportTemplateType;
  title: string;
  subtitle?: string;
  issueDate: string;
  periodLabel: string;
  generatedBy: string;
  branchName: string;
  metaDetails?: { label: string; value: string }[];
  kpis?: ReportKPI[];
  tables: ReportTable[];
  notes?: string[];
  signatories?: { title: string; name: string }[];
}
