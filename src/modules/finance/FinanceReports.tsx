import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { FinanceMetrics } from '../../types/finance.types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { ReportTemplateType } from '../../services/reporting/reportTypes';
import {
  FileText,
  Printer,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Scale,
  Receipt,
  CheckCircle2,
  Calendar,
  Building,
  Sparkles,
  Layers,
  CreditCard
} from 'lucide-react';

interface FinanceReportsProps {
  metrics: FinanceMetrics | null;
  onOpenReportModalWithTemplate: (template: ReportTemplateType) => void;
}

export const FinanceReports: React.FC<FinanceReportsProps> = ({
  metrics,
  onOpenReportModalWithTemplate
}) => {
  const [statementPeriod, setStatementPeriod] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const reportCards: {
    id: ReportTemplateType;
    title: string;
    description: string;
    icon: any;
    color: string;
  }[] = [
    {
      id: 'dashboard',
      title: 'التقرير المالي العام الشامل',
      description: 'مؤشرات الأداء المالي المجمعة، الأرباح، الإيرادات، وتوزيع الأقسام',
      icon: TrendingUp,
      color: 'border-orange-500/30 text-orange-500 bg-orange-500/10'
    },
    {
      id: 'expenses',
      title: 'كشف المصروفات التشغيلية',
      description: 'بيان تفصيلي ببنود الصرف، الإيجارات، المرافق، والرواتب المعتمدة',
      icon: Receipt,
      color: 'border-rose-500/30 text-rose-500 bg-rose-500/10'
    },
    {
      id: 'sales',
      title: 'تقرير مبيعات وأرباح الشحن',
      description: 'حجم مبيعات الألعاب المباشرة وهوامش الأرباح المحققة وتذاكر العملاء',
      icon: DollarSign,
      color: 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
    },
    {
      id: 'wallets',
      title: 'كشف حركة المحافظ والبنوك',
      description: 'أرصدة فودافون كاش، إنستاباي، التحويلات، وسندات الإيداع المعتمدة',
      icon: CreditCard,
      color: 'border-cyan-500/30 text-cyan-500 bg-cyan-500/10'
    },
    {
      id: 'merchants',
      title: 'تقرير فواتير وحسابات التجار',
      description: 'فواتير البيع والشراء لعملاء الجملة والموردين وأرصدة الديون',
      icon: Building,
      color: 'border-amber-500/30 text-amber-500 bg-amber-500/10'
    },
    {
      id: 'subscriptions',
      title: 'تقرير الاشتراكات الرقمية',
      description: 'عائدات الاشتراكات، التجديدات، المستردات، والاشتراكات النشطة',
      icon: Sparkles,
      color: 'border-pink-500/30 text-pink-500 bg-pink-500/10'
    },
    {
      id: 'shift_settlement',
      title: 'تقارير الورديات وتقفيل الصندوق',
      description: 'جرد الصناديق وتسويات الورديات النقدية ومطابقة العجز والفائض',
      icon: CheckCircle2,
      color: 'border-purple-500/30 text-purple-500 bg-purple-500/10'
    },
    {
      id: 'bonds',
      title: 'سجل سندات الإيداع المالية',
      description: 'سندات إيداع رأس المال والسلع ونظام FIFO المعتمدة دفترياً',
      icon: FileText,
      color: 'border-teal-500/30 text-teal-500 bg-teal-500/10'
    }
  ];

  const directCOGS = useMemo(() => {
    if (!metrics) return 0;
    return (
      (metrics.customerCost || 0) +
      (metrics.dealerCost || 0) +
      (metrics.middlemanCost || 0) +
      (metrics.subscriptionsCost || 0)
    );
  }, [metrics]);

  const operatingDeductions = useMemo(() => {
    if (!metrics) return 0;
    return (
      (metrics.monthlyExpenses || 0) +
      (metrics.totalCashbackPaid || 0) +
      (metrics.totalReferralCommissionPaid || 0) +
      (metrics.totalExternalCommissionPaid || 0) +
      (metrics.totalRefunds || 0)
    );
  }, [metrics]);

  // Export full income statement to Excel
  const handleExportIncomeStatement = () => {
    if (!metrics) return;
    const data = [
      { 'البند المالي': 'إيرادات قسم الزبائن والشحن', 'القيمة (ج.م)': metrics.customerRevenue || 0 },
      { 'البند المالي': 'إيرادات قسم التجار والموزعين', 'القيمة (ج.م)': metrics.dealerRevenue || 0 },
      { 'البند المالي': 'إيرادات قسم الوساطة ومخزن الحسابات', 'القيمة (ج.م)': metrics.middlemanRevenue || 0 },
      { 'البند المالي': 'إيرادات قسم الاشتراكات الرقمية', 'القيمة (ج.م)': metrics.subscriptionsRevenue || 0 },
      { 'البند المالي': '--- إجمالي الإيرادات المجمعة ---', 'القيمة (ج.م)': metrics.totalRevenue },
      { 'البند المالي': 'تكاليف البضاعة والخدمات المباشرة (COGS)', 'القيمة (ج.م)': -directCOGS },
      { 'البند المالي': '--- مجمل الربح (Gross Profit) ---', 'القيمة (ج.م)': metrics.grossProfit },
      { 'البند المالي': 'المصروفات التشغيلية والإدارية', 'القيمة (ج.م)': -(metrics.monthlyExpenses || 0) },
      { 'البند المالي': 'مكافآت الكاش باك الممنوحة للعملاء', 'القيمة (ج.م)': -(metrics.totalCashbackPaid || 0) },
      { 'البند المالي': 'عمولات شركاء النجاح والإحالات', 'القيمة (ج.م)': -(metrics.totalReferralCommissionPaid || 0) },
      { 'البند المالي': 'عمولات الوسطاء الخارجيين', 'القيمة (ج.م)': -(metrics.totalExternalCommissionPaid || 0) },
      { 'البند المالي': 'المستردات والإلغاءات', 'القيمة (ج.م)': -(metrics.totalRefunds || 0) },
      { 'البند المالي': '=== صافي الأرباح التشغيلية النهائية ===', 'القيمة (ج.م)': metrics.netProfit }
    ];
    exportToExcel(data, `قائمة_الدخل_المالية_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-5 rounded-2xl border border-orange-500/20">
        <div>
          <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Printer className="w-5 h-5 text-orange-500" />
            مركز التقارير والقوائم المالية المعتمدة (Financial Reports & Statements)
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            إصدار رسمي معتمد لقوائم الدخل، الأرباح والخسائر، كشوف حركة الخزينة، والميزانيات التفصيلية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportIncomeStatement}
            icon={<Download className="w-3.5 h-3.5" />}
            className="text-xs cursor-pointer"
          >
            تصدير قائمة الدخل Excel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.print()}
            icon={<Printer className="w-3.5 h-3.5" />}
            className="text-xs bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
          >
            طباعة كشف المركز المالي
          </Button>
        </div>
      </div>

      {/* Structured Income Statement Card (قائمة الدخل والأرباح والخسائر) */}
      {metrics && (
        <Card className="p-6 space-y-4 border-gray-200 dark:border-[#27272A] print:border-black">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  قائمة الدخل والأرباح والخسائر التقديرية (Profit & Loss Statement)
                </h3>
                <span className="text-[11px] text-zinc-400">
                  كافة المعاملات المالية المعتمدة بنظام الدفاتر المحاسبي
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              تاريخ التوليد: {formatDate(new Date().toISOString())}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Section 1: Revenues */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-bold text-zinc-400 text-xs pb-1 border-b border-gray-100 dark:border-[#27272A]/40">
                <span className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-black">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  1. الإيرادات التشغيلية المجمعة (Revenues)
                </span>
                <span className="text-blue-500 font-black text-sm">
                  +{formatCurrency(metrics.totalRevenue, 'EGP')}
                </span>
              </div>
              <div className="pr-4 space-y-1.5 text-zinc-700 dark:text-zinc-300">
                <div className="flex justify-between">
                  <span>• إيرادات مبيعات وتذاكر شحن الزبائن:</span>
                  <strong className="font-mono">{formatCurrency(metrics.customerRevenue || 0, 'EGP')}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• إيرادات مبيعات الجملة والتجار:</span>
                  <strong className="font-mono">{formatCurrency(metrics.dealerRevenue || 0, 'EGP')}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• إيرادات صفقات الوساطة ومبيعات الحسابات:</span>
                  <strong className="font-mono">{formatCurrency(metrics.middlemanRevenue || 0, 'EGP')}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• إيرادات مبيعات وتجديد الاشتراكات الرقمية:</span>
                  <strong className="font-mono">{formatCurrency(metrics.subscriptionsRevenue || 0, 'EGP')}</strong>
                </div>
              </div>
            </div>

            {/* Section 2: Direct Costs & Gross Profit */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#27272A]/40">
              <div className="flex items-center justify-between font-bold text-zinc-400 text-xs pb-1 border-b border-gray-100 dark:border-[#27272A]/40">
                <span className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-black">
                  <TrendingDown className="w-4 h-4 text-amber-500" />
                  2. تكلفة المنتجات والبضاعة المباعة (COGS)
                </span>
                <span className="text-amber-500 font-black text-sm">
                  -{formatCurrency(directCOGS, 'EGP')}
                </span>
              </div>
              <div className="pr-4 space-y-1.5 text-zinc-700 dark:text-zinc-300">
                <div className="flex justify-between">
                  <span>• تكلفة بضاعة الشحن المباشر للزبائن:</span>
                  <strong className="font-mono">{formatCurrency(metrics.customerCost || 0, 'EGP')}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• تكلفة مشتريات وتوريدات التجار:</span>
                  <strong className="font-mono">{formatCurrency(metrics.dealerCost || 0, 'EGP')}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• تكلفة أصول الحسابات المباعة:</span>
                  <strong className="font-mono">{formatCurrency(metrics.middlemanCost || 0, 'EGP')}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• تكلفة الاشتراكات الرقمية:</span>
                  <strong className="font-mono">{formatCurrency(metrics.subscriptionsCost || 0, 'EGP')}</strong>
                </div>
              </div>
            </div>

            {/* Gross Profit Callout */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex justify-between items-center text-xs font-black">
              <span className="text-blue-400">إجمالي مجمل الربح (Gross Profit):</span>
              <span className="text-blue-400 text-base">{formatCurrency(metrics.grossProfit, 'EGP')}</span>
            </div>

            {/* Section 3: Operating Expenses & Marketing Deductions */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#27272A]/40">
              <div className="flex items-center justify-between font-bold text-zinc-400 text-xs pb-1 border-b border-gray-100 dark:border-[#27272A]/40">
                <span className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-black">
                  <Receipt className="w-4 h-4 text-rose-500" />
                  3. المصروفات التشغيلية والعمولات والخصومات
                </span>
                <span className="text-rose-500 font-black text-sm">
                  -{formatCurrency(operatingDeductions, 'EGP')}
                </span>
              </div>
              <div className="pr-4 space-y-1.5 text-zinc-700 dark:text-zinc-300">
                <div className="flex justify-between">
                  <span>• المصروفات التشغيلية والإدارية (إيجار، مرافق، سيرفرات، صيانة):</span>
                  <strong className="font-mono text-rose-400">-{formatCurrency(metrics.monthlyExpenses, 'EGP')}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• مكافآت الكاش باك الممنوحة للعملاء:</span>
                  <strong className="font-mono text-amber-400">-{formatCurrency(metrics.totalCashbackPaid || 0, 'EGP')}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• عمولات شركاء برنامج الإحالة:</span>
                  <strong className="font-mono text-purple-400">-{formatCurrency(metrics.totalReferralCommissionPaid || 0, 'EGP')}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• عمولات الوسطاء الخارجيين:</span>
                  <strong className="font-mono text-purple-400">-{formatCurrency(metrics.totalExternalCommissionPaid || 0, 'EGP')}</strong>
                </div>
                <div className="flex justify-between">
                  <span>• إجمالي المبالغ المستردة (Refunds):</span>
                  <strong className="font-mono text-rose-400">-{formatCurrency(metrics.totalRefunds || 0, 'EGP')}</strong>
                </div>
              </div>
            </div>

            {/* Net Profit Callout Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-2 border-emerald-500/40 flex justify-between items-center text-sm font-black">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-zinc-900 dark:text-zinc-100">
                  صافي الربح النهائي الخالص (Net Operating Profit):
                </span>
              </div>
              <span className="text-emerald-500 text-xl tracking-tight">
                {formatCurrency(metrics.netProfit, 'EGP')}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Balance Sheet & Liquidity Summary */}
      {metrics && (
        <Card className="p-6 space-y-4 border-gray-200 dark:border-[#27272A] print:border-black">
          <div className="flex items-center gap-2 border-b pb-3 border-gray-100 dark:border-[#27272A]">
            <Scale className="w-5 h-5 text-cyan-500" />
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                موجز المركز المالي والسيولة النقدية (Liquidity & Balance Summary)
              </h3>
              <span className="text-[11px] text-zinc-400">
                حصر الأصول النقدية المتاحة مقابل الالتزامات والديون
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <span className="text-[10px] text-zinc-400 block font-bold">السيولة النقدية بالخزنة:</span>
              <strong className="text-base font-black text-amber-500 block mt-1">
                {formatCurrency(metrics.vaultBalance, 'EGP')}
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <span className="text-[10px] text-zinc-400 block font-bold">أرصدة المحافظ والبنوك:</span>
              <strong className="text-base font-black text-cyan-500 block mt-1">
                {formatCurrency(metrics.totalWalletsBalance || 0, 'EGP')}
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <span className="text-[10px] text-zinc-400 block font-bold">أموال ومستحقات لنا (المدينون):</span>
              <strong className="text-base font-black text-emerald-500 block mt-1">
                {formatCurrency(metrics.totalDebtsReceivable, 'EGP')}
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <span className="text-[10px] text-zinc-400 block font-bold">ديون والتزامات علينا (الدائنون):</span>
              <strong className="text-base font-black text-rose-500 block mt-1">
                {formatCurrency(metrics.totalDebtsPayable, 'EGP')}
              </strong>
            </div>
          </div>
        </Card>
      )}

      {/* Report Generator Hub (Dedicated Templates) */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            نماذج التقارير المالية المتخصصة للطباعة والتصدير
          </h3>
          <p className="text-xs text-zinc-400">
            اختر أي نموذج أدناه لفتحه في عارض التقارير المعتمد لتخصيص التاريخ، الحقول، الشعار، والأختام الرسمية
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {reportCards.map(report => {
            const Icon = report.icon;
            return (
              <Card
                key={report.id}
                onClick={() => onOpenReportModalWithTemplate(report.id)}
                className="p-4 hover:border-orange-500/50 transition-all cursor-pointer space-y-2.5 border-gray-200 dark:border-[#27272A] group"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl border ${report.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-zinc-400 group-hover:text-orange-500 font-bold flex items-center gap-1 transition-colors">
                    إنشاء <Printer className="w-3 h-3" />
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 group-hover:text-orange-500 transition-colors">
                    {report.title}
                  </h4>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
