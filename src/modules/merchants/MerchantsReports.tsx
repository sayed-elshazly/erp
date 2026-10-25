import React, { useState } from 'react';
import { db } from '../../database/db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  Package,
  DollarSign,
  Award,
  Receipt,
  Calendar,
  Filter
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';

export const MerchantsReports: React.FC = () => {
  const [reportType, setReportType] = useState<'sales_profits' | 'purchases' | 'debts' | 'performance' | 'invoices'>('sales_profits');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const merchants = db.getMerchants(false);
  const invoices = db.getMerchantInvoices();

  const handleExport = () => {
    let exportData: any[] = [];
    let fileName = 'تقرير_التجار';

    if (reportType === 'sales_profits') {
      fileName = 'تقرير_مبيعات_وارباح_التجار';
      exportData = merchants.map(m => ({
        'كود التاجر': m.code,
        'الاسم': m.name,
        'الشركة': m.companyName,
        'النوع': m.type,
        'إجمالي المبيعات ($)': m.totalSales,
        'إجمالي الأرباح ($)': m.totalProfits,
        'الرصيد ($)': m.balance
      }));
    } else if (reportType === 'purchases') {
      fileName = 'تقرير_مشتريات_وتوريدات_الموردين';
      exportData = merchants
        .filter(m => m.type === 'supplier' || m.type === 'wholesaler')
        .map(m => ({
          'كود المورد': m.code,
          'الاسم': m.name,
          'الشركة': m.companyName,
          'إجمالي المشتريات ($)': m.totalPurchases,
          'الرصيد / الالتزام ($)': m.balance,
          'الحد الائتماني ($)': m.creditLimit
        }));
    } else if (reportType === 'debts') {
      fileName = 'تقرير_ديون_ومستحقات_التجار';
      exportData = merchants
        .filter(m => m.balance !== 0)
        .map(m => ({
          'كود التاجر': m.code,
          'الاسم': m.name,
          'الشركة': m.companyName,
          'الرصيد ($)': m.balance,
          'الحالة': m.balance > 0 ? 'مستحق لنا' : 'التزام علينا',
          'الحد الائتماني ($)': m.creditLimit,
          'تجاوز الحد': m.balance > m.creditLimit ? 'نعم (متجاوز!)' : 'ضمن الحد'
        }));
    } else if (reportType === 'performance') {
      fileName = 'تقرير_تقييم_واداء_التجار';
      exportData = merchants.map(m => ({
        'كود التاجر': m.code,
        'الاسم': m.name,
        'التقييم العام (100)': m.performance?.overallScore || 90,
        'التقييم النجمي (5)': m.performance?.starRating || 4.5,
        'الشارة': m.performance?.badge || 'Standard',
        'سرعة التنفيذ': `${m.performance?.executionSpeedScore}%`,
        'الالتزام بالتسليم': `${m.performance?.deliveryTimelinessScore}%`,
        'الاتجاه': m.performance?.trend
      }));
    } else {
      fileName = 'تقرير_الفواتير_التجارية';
      exportData = invoices.map(i => ({
        'رقم الفاتورة': i.invoiceNumber,
        'التاجر': i.merchantName,
        'النوع': i.type,
        'الإجمالي ($)': i.totalAmount,
        'المدفوع ($)': i.paidAmount,
        'المتبقي ($)': i.remainingAmount,
        'الحالة': i.status,
        'التاريخ': formatDate(i.issueDate)
      }));
    }

    exportToExcel(exportData, fileName);
  };

  return (
    <div className="space-y-4 animate-fade-in text-right">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setReportType('sales_profits')}
              className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
                reportType === 'sales_profits' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-zinc-400'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> الأرباح والمبيعات
            </button>

            <button
              onClick={() => setReportType('purchases')}
              className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
                reportType === 'purchases' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-zinc-400'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> المشتريات والتوريدات
            </button>

            <button
              onClick={() => setReportType('debts')}
              className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
                reportType === 'debts' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-zinc-400'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" /> الديون والمستحقات
            </button>

            <button
              onClick={() => setReportType('performance')}
              className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
                reportType === 'performance' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-zinc-400'
              }`}
            >
              <Award className="w-3.5 h-3.5" /> تقييم الأداء والالتزام
            </button>

            <button
              onClick={() => setReportType('invoices')}
              className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 ${
                reportType === 'invoices' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-zinc-400'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> تقرير الفواتير
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
              تصدير Excel
            </Button>
            <Button variant="outline" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => setIsReportModalOpen(true)}>
              🖨️ إنشاء وطباعة التقرير
            </Button>
          </div>
        </div>
      </Card>

      {/* Report View Table */}
      <Card className="overflow-hidden p-1">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gray-50 dark:bg-[#141417] text-zinc-500 border-b border-gray-200 dark:border-[#27272A] font-bold">
              <tr>
                <th className="p-3">كود التاجر</th>
                <th className="p-3">التاجر / المنشأة</th>
                <th className="p-3">النوع</th>
                <th className="p-3">المبيعات</th>
                <th className="p-3">المشتريات</th>
                <th className="p-3">الأرباح الصافية</th>
                <th className="p-3">الرصيد الحالي</th>
                <th className="p-3">التقييم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {merchants.map(m => (
                <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                  <td className="p-3 font-mono font-bold text-orange-500">{m.code}</td>
                  <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{m.name} ({m.companyName})</td>
                  <td className="p-3"><Badge variant="default" size="sm">{m.type}</Badge></td>
                  <td className="p-3 font-mono text-zinc-700 dark:text-zinc-300">{formatCurrency(m.totalSales)}</td>
                  <td className="p-3 font-mono text-zinc-700 dark:text-zinc-300">{formatCurrency(m.totalPurchases)}</td>
                  <td className="p-3 font-mono font-bold text-emerald-500">{formatCurrency(m.totalProfits)}</td>
                  <td className={`p-3 font-mono font-bold ${m.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(m.balance)}
                  </td>
                  <td className="p-3 font-mono text-amber-500">{m.performance?.starRating} ⭐</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 🖨️ Professional Report Generator Modal */}
      {isReportModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          defaultTemplateType="merchants"
        />
      )}
    </div>
  );
};
