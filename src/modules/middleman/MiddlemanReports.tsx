// =============================================================
// NZM JKR TOP UP ERP — Middleman Reports & Analytics Module (V1.0)
// =============================================================

import React, { useState, useMemo } from 'react';
import { MiddlemanDeal, GameAccountAsset } from '../../types/middleman.types';
import { db } from '../../database/db';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import {
  BarChart3,
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Archive,
  Users,
  Gamepad2,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ReportEngine } from '../../services/reporting/reportEngine';
import { ReportConfig, ReportDocumentData } from '../../services/reporting/reportTypes';

type ReportCategory =
  | 'deals'
  | 'profits'
  | 'middlemen'
  | 'sold_accounts'
  | 'available_accounts'
  | 'top_games'
  | 'clients'
  | 'disputes';

export const MiddlemanReports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportCategory>('deals');

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGame, setSelectedGame] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  const allDeals = db.getMiddlemanDeals(true);
  const allAccounts = db.getMiddlemanAccounts();
  const allCustomers = db.getMiddlemanClients();

  // Distinct Games & Employees
  const distinctGames = useMemo(() => {
    const fromDeals = allDeals.map(d => d.gameName).filter(Boolean);
    const fromAccounts = allAccounts.map(a => a.gameName).filter(Boolean);
    return Array.from(new Set([...fromDeals, ...fromAccounts])) as string[];
  }, [allDeals, allAccounts]);

  const distinctEmployees = useMemo(() => {
    const fromDeals = allDeals.map(d => d.assignedTo || d.createdBy).filter(Boolean);
    const fromAccounts = allAccounts.map(a => a.saleRecord?.soldBy || a.purchasedBy).filter(Boolean);
    return Array.from(new Set([...fromDeals, ...fromAccounts])) as string[];
  }, [allDeals, allAccounts]);

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return allDeals.filter(d => {
      if (startDate && new Date(d.createdAt) < new Date(startDate)) return false;
      if (endDate && new Date(d.createdAt) > new Date(endDate + 'T23:59:59')) return false;
      if (selectedGame !== 'all' && d.gameName !== selectedGame) return false;
      if (selectedStatus !== 'all' && d.status !== selectedStatus) return false;
      if (selectedEmployee !== 'all' && d.assignedTo !== selectedEmployee && d.createdBy !== selectedEmployee) return false;
      return true;
    });
  }, [allDeals, startDate, endDate, selectedGame, selectedStatus, selectedEmployee]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return allAccounts.filter(a => {
      if (startDate && new Date(a.createdAt) < new Date(startDate)) return false;
      if (endDate && new Date(a.createdAt) > new Date(endDate + 'T23:59:59')) return false;
      if (selectedGame !== 'all' && a.gameName !== selectedGame) return false;
      return true;
    });
  }, [allAccounts, startDate, endDate, selectedGame]);

  // Summary Totals
  const reportTotals = useMemo(() => {
    const completedDeals = filteredDeals.filter(d => d.status === 'completed');
    const totalDealsVolume = completedDeals.reduce((s, d) => s + d.dealAmountEGP, 0);
    const totalCompanyCommissions = completedDeals.reduce((s, d) => s + d.companyCommissionAmountEGP, 0);
    const totalExtCommissions = completedDeals.reduce((s, d) => s + (d.externalMiddlemanCommissionAmountEGP || 0), 0);
    const netDealProfits = completedDeals.reduce((s, d) => s + d.netCompanyProfitEGP, 0);

    const soldAccs = filteredAccounts.filter(a => a.status === 'sold');
    const totalAccountSalesVolume = soldAccs.reduce((s, a) => s + (a.actualSalePriceEGP || a.expectedSellingPriceEGP), 0);
    const totalAccountSalesProfit = soldAccs.reduce(
      (s, a) => s + (a.netRealizedProfitEGP || (a.actualSalePriceEGP ? a.actualSalePriceEGP - a.purchaseCostEGP : 0)),
      0
    );

    return {
      totalDealsCount: filteredDeals.length,
      completedDealsCount: completedDeals.length,
      totalDealsVolume,
      totalCompanyCommissions,
      totalExtCommissions,
      netDealProfits,
      soldAccountsCount: soldAccs.length,
      totalAccountSalesVolume,
      totalAccountSalesProfit,
      grandNetProfits: netDealProfits + totalAccountSalesProfit
    };
  }, [filteredDeals, filteredAccounts]);

  const handlePrint = () => {
    const periodText = startDate && endDate ? `من ${startDate} إلى ${endDate}` : 'كافة السجلات المسجلة';

    const doc: ReportDocumentData = {
      id: `MID-${Date.now().toString().slice(-6)}`,
      templateType: 'broker',
      title: activeReport === 'deals' ? 'تقرير صفقات الوساطة المالية وتداول الحسابات' : 'تقرير أرباح وعمولات الوساطة',
      subtitle: `منظومة الوساطة والتأمين الرقمي — فترة: ${periodText}`,
      issueDate: formatDateTime(new Date().toISOString()),
      periodLabel: periodText,
      generatedBy: 'مدير قسم الوساطة',
      branchName: 'NZM JKR TOP UP ERP — المقر الرئيسي',
      kpis: [
        { label: 'إجمالي صفقات الوساطة', value: `${reportTotals.totalDealsCount} صفقة`, color: 'blue' },
        { label: 'إجمالي مبالغ الصفقات', value: `${reportTotals.totalDealsVolume.toLocaleString()} ج.م`, color: 'orange' },
        { label: 'صافي أرباح وعمولات الشركة', value: `${reportTotals.grandNetProfits.toLocaleString()} ج.م`, color: 'green' }
      ],
      tables: [
        {
          title: '📋 تفاصيل صفقات الوساطة المنفذة',
          columns: [
            { header: 'رقم الصفقة', key: 'num', align: 'center' },
            { header: 'عنوان العملية', key: 'title', align: 'right' },
            { header: 'البائع', key: 'seller', align: 'right' },
            { header: 'المشتري', key: 'buyer', align: 'right' },
            { header: 'قيمة الصفقة', key: 'amount', align: 'left' },
            { header: 'عمولة الشركة', key: 'comm', align: 'left' },
            { header: 'صافي الربح', key: 'profit', align: 'left' },
            { header: 'الحالة', key: 'status', align: 'center' }
          ],
          rows: filteredDeals.map(d => ({
            num: `#${d.dealNumber}`,
            title: d.title,
            seller: d.sellerName,
            buyer: d.buyerName,
            amount: `${(d.dealAmountEGP || 0).toLocaleString()} ج`,
            comm: `${(d.companyCommissionAmountEGP || 0).toLocaleString()} ج`,
            profit: `${(d.netCompanyProfitEGP || 0).toLocaleString()} ج`,
            status: d.status === 'completed' ? 'مكتملة ✓' : d.status === 'in_progress' ? 'جارية ⏳' : d.status === 'canceled' ? 'ملغية ✕' : 'نزاع ⚠️'
          })),
          totals: {
            title: `إجمالي ${filteredDeals.length} صفقات`,
            amount: `${reportTotals.totalDealsVolume.toLocaleString()} ج`,
            profit: `${reportTotals.grandNetProfits.toLocaleString()} ج`
          }
        }
      ],
      signatories: [
        { title: 'مسؤول قسم الوساطة', name: 'مدير الصفقات' },
        { title: 'اعتماد مدير النظام (Owner)', name: 'الختم والتوقيع الرسمي' }
      ]
    };

    const config: ReportConfig = {
      startDate: startDate || '',
      endDate: endDate || '',
      reportType: 'detailed',
      showProfits: true,
      showCosts: true,
      showExpenses: true,
      showLogo: true,
      showUserData: true,
      showPageNumbers: true,
      showManagerSignature: true,
      orientation: 'landscape'
    };

    ReportEngine.printReportDocument(doc, config);
  };

  const handleExportCSV = () => {
    let csv = '\uFEFF'; // UTF-8 BOM
    if (activeReport === 'deals' || activeReport === 'profits') {
      csv += 'رقم الوساطة,العنوان,النوع,البائع,المشتري,القيمة ج,عمولة الشركة,عمولة الوسيط,صافي الربح,الحالة,التاريخ\n';
      filteredDeals.forEach(d => {
        csv += `"${d.dealNumber}","${d.title}","${d.dealType}","${d.sellerName}","${d.buyerName}",${d.dealAmountEGP},${d.companyCommissionAmountEGP},${d.externalMiddlemanCommissionAmountEGP || 0},${d.netCompanyProfitEGP},"${d.status}","${d.createdAt}"\n`;
      });
    } else {
      csv += 'كود الحساب,العنوان,اللعبة,البائع,سعر الشراء,سعر البيع,صافي الربح,الحالة\n';
      filteredAccounts.forEach(a => {
        csv += `"${a.accountCode}","${a.title}","${a.gameName}","${a.sellerName}",${a.purchaseCostEGP},${a.actualSalePriceEGP || a.expectedSellingPriceEGP},${a.netRealizedProfitEGP || 0},"${a.status}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `middleman_report_${activeReport}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs" dir="rtl">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-amber-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100">
                تقارير وإحصائيات الوساطة والمبيعات (Reports & Analytics)
              </h1>
              <Badge variant="success" size="sm">إصدار 1.0</Badge>
            </div>
            <p className="text-zinc-500 text-xs mt-0.5">
              توليد تقارير مالية تفصيلية، تحليلات أرباح العمولات، حسابات الوسطاء الخارجيين، ومعدلات النزاع والنجاح.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
            onClick={handleExportCSV}
          >
            تصدير Excel (CSV)
          </Button>
          <Button
            variant="primary"
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            طباعة التقرير PDF
          </Button>
        </div>
      </div>

      {/* Reports Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { id: 'deals', label: 'تقرير الوساطات', icon: ShieldCheck },
          { id: 'profits', label: 'تقرير الأرباح', icon: TrendingUp },
          { id: 'middlemen', label: 'الوسطاء الخارجيين', icon: Users },
          { id: 'sold_accounts', label: 'الحسابات المباعة', icon: Archive },
          { id: 'available_accounts', label: 'بضاعة المخزن', icon: Layers },
          { id: 'top_games', label: 'أكثر الألعاب', icon: Gamepad2 },
          { id: 'clients', label: 'العملاء الأكثر نشاطاً', icon: Users },
          { id: 'disputes', label: 'تقرير النزاعات', icon: AlertTriangle }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveReport(tab.id as ReportCategory)}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                isActive
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-[#27272A] text-zinc-600 dark:text-zinc-400 hover:border-amber-500/30'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-amber-500'}`} />
              <span className="text-[11px]">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-zinc-500 font-bold mb-1">من تاريخ:</label>
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-zinc-500 font-bold mb-1">إلى تاريخ:</label>
          <Input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-zinc-500 font-bold mb-1">اللعبة:</label>
          <select
            value={selectedGame}
            onChange={e => setSelectedGame(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-2 text-xs font-bold text-gray-900 dark:text-zinc-100 focus:outline-none"
          >
            <option value="all">كل الألعاب</option>
            {distinctGames.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-zinc-500 font-bold mb-1">الموظف المسؤول:</label>
          <select
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-2 text-xs font-bold text-gray-900 dark:text-zinc-100 focus:outline-none"
          >
            <option value="all">كل الموظفين</option>
            {distinctEmployees.map(emp => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
        </div>
        <div>
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setSelectedGame('all');
              setSelectedStatus('all');
              setSelectedEmployee('all');
            }}
          >
            إعادة تعيين الفلاتر
          </Button>
        </div>
      </Card>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center font-mono">
          <span className="text-[10px] text-zinc-400 block font-bold">إجمالي حجم صفقات الوساطة</span>
          <span className="text-base font-black text-amber-500">{formatCurrency(reportTotals.totalDealsVolume)}</span>
        </Card>
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center font-mono">
          <span className="text-[10px] text-zinc-400 block font-bold">صافي أرباح عمولات الوساطة</span>
          <span className="text-base font-black text-emerald-500">+{formatCurrency(reportTotals.netDealProfits)}</span>
        </Card>
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center font-mono">
          <span className="text-[10px] text-zinc-400 block font-bold">صافي أرباح مبيعات الحسابات</span>
          <span className="text-base font-black text-blue-500">+{formatCurrency(reportTotals.totalAccountSalesProfit)}</span>
        </Card>
        <Card className="p-3.5 bg-gradient-to-br from-emerald-500/10 to-amber-500/10 border border-emerald-500/30 text-center font-mono">
          <span className="text-[10px] text-emerald-600 font-bold block">إجمالي صافي أرباح القسم الشاملة</span>
          <span className="text-lg font-black text-emerald-500">+{formatCurrency(reportTotals.grandNetProfits)}</span>
        </Card>
      </div>

      {/* Dynamic Report Content Table */}
      <Card className="p-0 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {activeReport === 'deals' || activeReport === 'profits' ? (
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                  <th className="py-3 px-4">رقم الوساطة</th>
                  <th className="py-3 px-4">عنوان العملية</th>
                  <th className="py-3 px-4">البائع</th>
                  <th className="py-3 px-4">المشتري</th>
                  <th className="py-3 px-4 text-center">قيمة الصفقة</th>
                  <th className="py-3 px-4 text-center">عمولة الشركة</th>
                  <th className="py-3 px-4 text-center">الوسيط الخارجي</th>
                  <th className="py-3 px-4 text-center">صافي ربحنا</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {filteredDeals.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 font-mono">
                    <td className="py-3 px-4 font-bold text-amber-500">#{d.dealNumber}</td>
                    <td className="py-3 px-4 font-sans font-bold text-zinc-900 dark:text-zinc-100">{d.title}</td>
                    <td className="py-3 px-4 font-sans">{d.sellerName}</td>
                    <td className="py-3 px-4 font-sans">{d.buyerName}</td>
                    <td className="py-3 px-4 text-center font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(d.dealAmountEGP)}
                    </td>
                    <td className="py-3 px-4 text-center">{formatCurrency(d.companyCommissionAmountEGP)}</td>
                    <td className="py-3 px-4 text-center text-purple-400">
                      {formatCurrency(d.externalMiddlemanCommissionAmountEGP || 0)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-500">
                      +{formatCurrency(d.netCompanyProfitEGP)}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <Badge variant={d.status === 'completed' ? 'success' : d.status === 'dispute' ? 'danger' : 'warning'} size="sm">
                        {d.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeReport === 'sold_accounts' || activeReport === 'available_accounts' ? (
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                  <th className="py-3 px-4">كود الحساب</th>
                  <th className="py-3 px-4">تفاصيل الحساب</th>
                  <th className="py-3 px-4">اللعبة</th>
                  <th className="py-3 px-4">البائع</th>
                  <th className="py-3 px-4 text-center">تكلفة الشراء</th>
                  <th className="py-3 px-4 text-center">سعر البيع</th>
                  <th className="py-3 px-4 text-center">صافي الربح</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {filteredAccounts
                  .filter(a => activeReport === 'sold_accounts' ? a.status === 'sold' : a.status === 'available')
                  .map(a => (
                    <tr key={a.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 font-mono">
                      <td className="py-3 px-4 font-bold text-amber-500">#{a.accountCode}</td>
                      <td className="py-3 px-4 font-sans font-bold text-zinc-900 dark:text-zinc-100">{a.title}</td>
                      <td className="py-3 px-4 font-sans">{a.gameName}</td>
                      <td className="py-3 px-4 font-sans">{a.sellerName}</td>
                      <td className="py-3 px-4 text-center text-rose-500 font-bold">{formatCurrency(a.purchaseCostEGP)}</td>
                      <td className="py-3 px-4 text-center font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(a.actualSalePriceEGP || a.expectedSellingPriceEGP)}
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-500 font-bold">
                        +{formatCurrency(a.netRealizedProfitEGP || (a.actualSalePriceEGP ? a.actualSalePriceEGP - a.purchaseCostEGP : 0))}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <Badge variant={a.status === 'sold' ? 'default' : 'success'} size="sm">
                          {a.status === 'sold' ? 'تم البيع' : 'متاح'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-zinc-400 space-y-2">
              <FileText className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="font-bold text-sm">تم توليد بيانات تقرير ({activeReport}) بنجاح</p>
              <p className="text-[11px]">انقر على زر "طباعة التقرير PDF" أو "تصدير Excel" لاستخراج البيانات كاملة</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
