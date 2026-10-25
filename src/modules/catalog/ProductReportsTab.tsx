import React, { useState, useMemo, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { GameTreeItem, GameProduct } from '../../types/topup.types';
import { CustomerTicket } from '../../types/customer.types';
import { db } from '../../database/db';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { useNotifications } from '../../context/NotificationContext';
import { ReportEngine } from '../../services/reporting/reportEngine';
import { ReportConfig, ReportDocumentData } from '../../services/reporting/reportTypes';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Package,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Filter,
  Users,
  Award,
  Gamepad2,
  CheckCircle2,
  RefreshCw,
  X
} from 'lucide-react';

interface ProductReportsTabProps {
  games: GameTreeItem[];
}

export const ProductReportsTab: React.FC<ProductReportsTabProps> = ({ games }) => {
  const { showToast } = useNotifications();

  // Date filters: Day vs Range
  const [dateFilterMode, setDateFilterMode] = useState<'range' | 'single'>('range');
  const [singleDate, setSingleDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Cascading Filters
  const [selectedGameId, setSelectedGameId] = useState('all');
  const [selectedSectionId, setSelectedSectionId] = useState('all');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [selectedProductId, setSelectedProductId] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState<'sales' | 'revenue' | 'profit' | 'name' | 'avgPrice'>('sales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const tickets = useMemo(() => db.getTickets(), []);

  // Available sections based on selected game
  const availableSections = useMemo(() => {
    if (selectedGameId === 'all') return [];
    const g = games.find(game => game.id === selectedGameId);
    return g?.sections || [];
  }, [games, selectedGameId]);

  // Available groups based on selected section
  const availableGroups = useMemo(() => {
    if (selectedGameId === 'all' || selectedSectionId === 'all') return [];
    const g = games.find(game => game.id === selectedGameId);
    return (g?.groups || []).filter(grp => grp.sectionId === selectedSectionId);
  }, [games, selectedGameId, selectedSectionId]);

  // Available products based on selected hierarchy
  const availableProducts = useMemo(() => {
    let prods: GameProduct[] = [];
    if (selectedGameId === 'all') {
      games.forEach(g => {
        prods.push(...(g.products || []));
      });
    } else {
      const g = games.find(game => game.id === selectedGameId);
      prods = g?.products || [];
      if (selectedSectionId !== 'all') {
        prods = prods.filter(p => p.sectionId === selectedSectionId);
      }
      if (selectedGroupId !== 'all') {
        prods = prods.filter(p => p.groupId === selectedGroupId);
      }
    }
    return prods;
  }, [games, selectedGameId, selectedSectionId, selectedGroupId]);

  // Reset child filters on parent change
  const handleGameChange = (gId: string) => {
    setSelectedGameId(gId);
    setSelectedSectionId('all');
    setSelectedGroupId('all');
    setSelectedProductId('all');
  };

  const handleSectionChange = (sId: string) => {
    setSelectedSectionId(sId);
    setSelectedGroupId('all');
    setSelectedProductId('all');
  };

  const handleGroupChange = (grpId: string) => {
    setSelectedGroupId(grpId);
    setSelectedProductId('all');
  };

  // Filter tickets by date
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (t.status === 'canceled') return false;
      const tDate = t.createdAt ? t.createdAt.slice(0, 10) : '';
      if (dateFilterMode === 'single') {
        if (singleDate && tDate !== singleDate) return false;
      } else {
        if (startDate && tDate < startDate) return false;
        if (endDate && tDate > endDate) return false;
      }
      return true;
    });
  }, [tickets, dateFilterMode, singleDate, startDate, endDate]);

  // Aggregate stats per product with top employee
  const productStats = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        productName: string;
        gameName: string;
        gameId: string;
        sectionId?: string;
        sectionName?: string;
        groupId?: string;
        groupName?: string;
        ordersCount: number;
        timesSold: number;
        totalRevenue: number;
        totalCost: number;
        totalCashback: number;
        totalReferral: number;
        totalReserve: number;
        totalFixedCost: number;
        totalNetProfit: number;
        lastSellingPrice: number;
        sellingPrices: number[];
        employeeSales: { [empName: string]: { count: number; revenue: number } };
      }
    >();

    // Initialize map with all products matching filter
    availableProducts.forEach(p => {
      map.set(p.id, {
        id: p.id,
        productName: p.name,
        gameName: p.gameName || '',
        gameId: p.gameId,
        sectionId: p.sectionId,
        sectionName: p.sectionName,
        groupId: p.groupId,
        groupName: p.groupName,
        ordersCount: 0,
        timesSold: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalCashback: 0,
        totalReferral: 0,
        totalReserve: 0,
        totalFixedCost: 0,
        totalNetProfit: 0,
        lastSellingPrice: p.calculatedPriceEGP || 0,
        sellingPrices: [],
        employeeSales: {}
      });
    });

    // Populate with ticket data
    filteredTickets.forEach(t => {
      const empName = t.assignedTo || (t as any).performedBy?.name || 'المسؤول';
      if (t.items && t.items.length > 0) {
        t.items.forEach(it => {
          let stat = it.productId ? map.get(it.productId) : null;
          if (!stat) {
            // Find by matching name
            for (const s of map.values()) {
              if (s.productName === it.productName) {
                stat = s;
                break;
              }
            }
          }

          if (stat) {
            const qty = it.quantity || 1;
            const rev = (it.unitPrice || 0) * qty;
            const cost = (it.costPrice || 0) * qty;
            const cb = (t.cashbackEarned || 0) / (t.items.length || 1);
            const ref =
              ((t.referralBalanceUsed || 0) + (t.pricingSnapshot?.totalReferralCommissionEGP || 0)) /
              (t.items.length || 1);
            const res = (t.pricingSnapshot?.totalReserveFundEGP || 0) / (t.items.length || 1);
            const fix = (t.pricingSnapshot?.totalFixedCostEGP || 0) / (t.items.length || 1);
            const profit = Math.max(0, rev - cost - cb - ref);

            stat.ordersCount += 1;
            stat.timesSold += qty;
            stat.totalRevenue += rev;
            stat.totalCost += cost;
            stat.totalCashback += cb;
            stat.totalReferral += ref;
            stat.totalReserve += res;
            stat.totalFixedCost += fix;
            stat.totalNetProfit += profit;
            stat.lastSellingPrice = it.unitPrice || stat.lastSellingPrice;
            stat.sellingPrices.push(it.unitPrice || 0);

            // Employee aggregation
            if (!stat.employeeSales[empName]) {
              stat.employeeSales[empName] = { count: 0, revenue: 0 };
            }
            stat.employeeSales[empName].count += qty;
            stat.employeeSales[empName].revenue += rev;
          }
        });
      }
    });

    let list = Array.from(map.values());

    // Filter by specific product
    if (selectedProductId !== 'all') {
      list = list.filter(item => item.id === selectedProductId);
    }

    // Filter by keyword search
    if (searchKeyword.trim()) {
      const q = searchKeyword.trim().toLowerCase();
      list = list.filter(
        item =>
          item.productName.toLowerCase().includes(q) ||
          item.gameName.toLowerCase().includes(q) ||
          (item.sectionName && item.sectionName.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'sales') {
        comparison = b.timesSold - a.timesSold;
      } else if (sortBy === 'revenue') {
        comparison = b.totalRevenue - a.totalRevenue;
      } else if (sortBy === 'profit') {
        comparison = b.totalNetProfit - a.totalNetProfit;
      } else if (sortBy === 'name') {
        comparison = a.productName.localeCompare(b.productName, 'ar');
      } else if (sortBy === 'avgPrice') {
        const avgA = a.sellingPrices.length > 0 ? a.totalRevenue / a.timesSold : a.lastSellingPrice;
        const avgB = b.sellingPrices.length > 0 ? b.totalRevenue / b.timesSold : b.lastSellingPrice;
        comparison = avgB - avgA;
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return list;
  }, [availableProducts, filteredTickets, selectedProductId, searchKeyword, sortBy, sortOrder]);

  // Overall Totals KPI
  const overallTotals = useMemo(() => {
    return productStats.reduce(
      (acc, curr) => ({
        totalOrdersCount: acc.totalOrdersCount + curr.ordersCount,
        totalSalesQty: acc.totalSalesQty + curr.timesSold,
        totalRevenue: acc.totalRevenue + curr.totalRevenue,
        totalCost: acc.totalCost + curr.totalCost,
        totalCashback: acc.totalCashback + curr.totalCashback,
        totalReferral: acc.totalReferral + curr.totalReferral,
        totalReserve: acc.totalReserve + curr.totalReserve,
        totalFixedCost: acc.totalFixedCost + curr.totalFixedCost,
        totalNetProfit: acc.totalNetProfit + curr.totalNetProfit
      }),
      {
        totalOrdersCount: 0,
        totalSalesQty: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalCashback: 0,
        totalReferral: 0,
        totalReserve: 0,
        totalFixedCost: 0,
        totalNetProfit: 0
      }
    );
  }, [productStats]);

  // Find Top Performing Employee overall in selected slice
  const topOverallEmployee = useMemo(() => {
    const empMap: { [name: string]: { count: number; revenue: number } } = {};
    productStats.forEach(item => {
      Object.entries(item.employeeSales).forEach(([name, data]) => {
        if (!empMap[name]) empMap[name] = { count: 0, revenue: 0 };
        empMap[name].count += data.count;
        empMap[name].revenue += data.revenue;
      });
    });

    let topName = 'لا يوجد';
    let maxCount = 0;
    let maxRev = 0;
    Object.entries(empMap).forEach(([name, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        topName = name;
        maxRev = data.revenue;
      }
    });

    return { name: topName, count: maxCount, revenue: maxRev };
  }, [productStats]);

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = productStats.map((item, idx) => {
      const avgPrice = item.timesSold > 0 ? Math.round(item.totalRevenue / item.timesSold) : item.lastSellingPrice;
      let topEmpStr = '—';
      const empEntries = Object.entries(item.employeeSales).sort((a, b) => b[1].count - a[1].count);
      if (empEntries.length > 0) {
        topEmpStr = `${empEntries[0][0]} (${empEntries[0][1].count} وحدة)`;
      }

      return {
        '#': idx + 1,
        'اسم المنتج': item.productName,
        'اللعبة': item.gameName,
        'القسم': item.sectionName || 'عام',
        'عدد الطلبات': item.ordersCount,
        'إجمالي الكمية المباعة': item.timesSold,
        'إجمالي الإيرادات (ج.م)': item.totalRevenue,
        'إجمالي التكلفة (ج.م)': item.totalCost,
        'الكاش باك والإحالة (ج.م)': item.totalCashback + item.totalReferral,
        'صافي الأرباح (ج.م)': item.totalNetProfit,
        'متوسط سعر البيع (ج.م)': avgPrice,
        'آخر سعر بيع (ج.م)': item.lastSellingPrice,
        'أكثر الموظفين بيعاً': topEmpStr
      };
    });

    exportToExcel(dataToExport, `تقرير_مبيعات_المنتجات_${new Date().toISOString().slice(0, 10)}`);
    showToast('success', 'تم التصدير', 'تم تصدير تقرير المنتجات إلى ملف Excel بنجاح.');
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      '#',
      'اسم المنتج',
      'اللعبة',
      'القسم',
      'الكمية المباعة',
      'الإيرادات (ج.م)',
      'التكلفة (ج.م)',
      'صافي الربح (ج.م)',
      'متوسط السعر (ج.م)',
      'أكثر موظف مبيعاً'
    ];

    const rows = productStats.map((item, idx) => {
      const avgPrice = item.timesSold > 0 ? Math.round(item.totalRevenue / item.timesSold) : item.lastSellingPrice;
      const empEntries = Object.entries(item.employeeSales).sort((a, b) => b[1].count - a[1].count);
      const topEmp = empEntries.length > 0 ? empEntries[0][0] : '—';
      return [
        idx + 1,
        `"${item.productName.replace(/"/g, '""')}"`,
        `"${item.gameName.replace(/"/g, '""')}"`,
        `"${(item.sectionName || '').replace(/"/g, '""')}"`,
        item.timesSold,
        item.totalRevenue,
        item.totalCost,
        item.totalNetProfit,
        avgPrice,
        `"${topEmp.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_المنتجات_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'تم التصدير', 'تم تحميل ملف CSV بنجاح.');
  };

  // Print Report
  const handlePrint = () => {
    const periodLabel = startDate && endDate
      ? `من ${startDate} إلى ${endDate}`
      : 'الفترة الحالية المسجلة';

    const doc: ReportDocumentData = {
      id: `CAT-${Date.now().toString().slice(-6)}`,
      templateType: 'catalog',
      title: 'تقرير مبيعات وأداء المنتجات والأقسام',
      subtitle: `تقرير تحليلي مفصل للمنتجات الأكثر طلباً ومبيعاً وأرباحها — ${periodLabel}`,
      issueDate: formatDateTime(new Date().toISOString()),
      periodLabel,
      generatedBy: 'مدير النظام',
      branchName: 'NZM JKR TOP UP ERP — المقر الرئيسي',
      kpis: [
        { label: 'إجمالي المبيعات', value: `${overallTotals.totalRevenue.toLocaleString()} ج.م`, color: 'blue' },
        { label: 'صافي الربح المحقق', value: `${overallTotals.totalNetProfit.toLocaleString()} ج.م`, color: 'green' },
        { label: 'الكميات المباعة', value: `${overallTotals.totalSalesQty.toLocaleString()} قطعة`, color: 'orange' },
        { label: 'إجمالي الأوردرات', value: `${overallTotals.totalOrdersCount.toLocaleString()} طلب`, color: 'gray' }
      ],
      tables: [
        {
          title: '📦 جدول أداء المنتجات والباقات والمبيعات التفصيلية',
          columns: [
            { header: '#', key: 'idx', align: 'center' },
            { header: 'اسم المنتج / الباقة', key: 'productName', align: 'right' },
            { header: 'اللعبة', key: 'gameName', align: 'right' },
            { header: 'القسم', key: 'sectionName', align: 'right' },
            { header: 'الكمية المباعة', key: 'timesSold', align: 'center' },
            { header: 'إجمالي الإيراد', key: 'totalRevenue', align: 'left' },
            { header: 'التكلفة الإجمالية', key: 'totalCost', align: 'left' },
            { header: 'صافي الربح', key: 'totalNetProfit', align: 'left' },
            { header: 'أفضل موظف مبيعاً', key: 'topEmp', align: 'center' }
          ],
          rows: productStats.map((item, idx) => {
            const empEntries = Object.entries(item.employeeSales).sort((a, b) => b[1].count - a[1].count);
            const topEmp = empEntries.length > 0 ? empEntries[0][0] : '—';
            return {
              idx: idx + 1,
              productName: item.productName,
              gameName: item.gameName,
              sectionName: item.sectionName || 'عام',
              timesSold: item.timesSold.toLocaleString(),
              totalRevenue: `${item.totalRevenue.toLocaleString()} ج`,
              totalCost: `${item.totalCost.toLocaleString()} ج`,
              totalNetProfit: `${item.totalNetProfit.toLocaleString()} ج`,
              topEmp
            };
          }),
          totals: {
            productName: `إجمالي ${productStats.length} منتج`,
            timesSold: overallTotals.totalSalesQty.toLocaleString(),
            totalRevenue: `${overallTotals.totalRevenue.toLocaleString()} ج`,
            totalCost: `${overallTotals.totalCost.toLocaleString()} ج`,
            totalNetProfit: `${overallTotals.totalNetProfit.toLocaleString()} ج`
          }
        }
      ],
      signatories: [
        { title: 'مسؤول المبيعات والمخزون', name: 'مدير القسم' },
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
    showToast('success', 'تم فتح التقرير', 'تم تجهيز مستند التقرير الرسمي للطباعة وتصدير PDF');
  };

  return (
    <div className="space-y-6 text-right text-xs">
      {/* 1. Multi-Level Cascading Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-[#27272A] pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              فلتر التقارير المتقدم للمبيعات والمنتجات
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Export & Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
              title="طباعة التقرير أو حفظ كـ PDF"
            >
              طباعة / PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />}
              onClick={handleExportExcel}
              title="تصدير بصيغة Excel"
            >
              تصدير Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5 text-blue-500" />}
              onClick={handleExportCSV}
              title="تصدير بصيغة CSV"
            >
              تصدير CSV
            </Button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          {/* Date Mode Toggle & Inputs */}
          <div className="lg:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500">
              <span>تصفية التاريخ:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDateFilterMode('range')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    dateFilterMode === 'range' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  فترة زمنية
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode('single')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    dateFilterMode === 'single' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  يوم محدد
                </button>
              </div>
            </div>

            {dateFilterMode === 'range' ? (
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onReset={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={singleDate}
                  onChange={e => setSingleDate(e.target.value)}
                  className="w-full text-xs"
                />
                {singleDate && (
                  <Button variant="ghost" size="sm" onClick={() => setSingleDate('')}>
                    مسح
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Game Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500">اللعبة:</label>
            <select
              value={selectedGameId}
              onChange={e => handleGameChange(e.target.value)}
              className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-3 py-2 font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="all">🎮 كل الألعاب ({games.length})</option>
              {games.map(g => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500">القسم:</label>
            <select
              value={selectedSectionId}
              onChange={e => handleSectionChange(e.target.value)}
              disabled={selectedGameId === 'all' || availableSections.length === 0}
              className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-3 py-2 font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none disabled:opacity-50"
            >
              <option value="all">📂 كل الأقسام</option>
              {availableSections.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Group Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500">المجموعة:</label>
            <select
              value={selectedGroupId}
              onChange={e => handleGroupChange(e.target.value)}
              disabled={selectedSectionId === 'all' || availableGroups.length === 0}
              className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-3 py-2 font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none disabled:opacity-50"
            >
              <option value="all">📑 كل المجموعات</option>
              {availableGroups.map(grp => (
                <option key={grp.id} value={grp.id}>
                  {grp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500">المنتج / الباقة:</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] px-3 py-2 font-bold text-xs text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="all">📦 كل المنتجات ({availableProducts.length})</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Keyword & Sorting Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="بحث بالاسم داخل النتائج..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              icon={<Search className="w-4 h-4 text-orange-500" />}
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-1"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-bold">ترتيب حسب:</span>
            <div className="flex items-center p-1 rounded-xl bg-gray-100 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
              <button
                type="button"
                onClick={() => setSortBy('sales')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  sortBy === 'sales' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                الكمية المباعة
              </button>
              <button
                type="button"
                onClick={() => setSortBy('revenue')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  sortBy === 'revenue' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                الإيرادات
              </button>
              <button
                type="button"
                onClick={() => setSortBy('profit')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  sortBy === 'profit' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                صافي الربح
              </button>
              <button
                type="button"
                onClick={() => setSortBy('avgPrice')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  sortBy === 'avgPrice' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                متوسط السعر
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] font-bold text-zinc-500 hover:text-orange-500 transition-colors"
              title="تغيير اتجاه الترتيب"
            >
              {sortOrder === 'desc' ? '⬇ تنازلي' : '⬆ تصاعدي'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Comprehensive KPI Cards matching Central Pricing Engine */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <span className="text-zinc-500 font-bold block text-[10px]">إجمالي الإيرادات (S)</span>
          <strong className="text-sm font-black text-blue-500 font-mono mt-0.5 block truncate">
            {formatCurrency(overallTotals.totalRevenue)}
          </strong>
        </div>

        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <span className="text-zinc-500 font-bold block text-[10px]">إجمالي تكلفة البضاعة (C)</span>
          <strong className="text-sm font-black text-rose-500 font-mono mt-0.5 block truncate">
            {formatCurrency(overallTotals.totalCost)}
          </strong>
        </div>

        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-zinc-500 font-bold block text-[10px]">إجمالي الكاش باك</span>
          <strong className="text-sm font-black text-amber-500 font-mono mt-0.5 block truncate">
            {formatCurrency(overallTotals.totalCashback)}
          </strong>
        </div>

        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <span className="text-zinc-500 font-bold block text-[10px]">إجمالي العمولات (الإحالة)</span>
          <strong className="text-sm font-black text-purple-400 font-mono mt-0.5 block truncate">
            {formatCurrency(overallTotals.totalReferral)}
          </strong>
        </div>

        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
          <span className="text-zinc-500 font-bold block text-[10px]">إجمالي الاحتياطي</span>
          <strong className="text-sm font-black text-indigo-400 font-mono mt-0.5 block truncate">
            {formatCurrency(overallTotals.totalReserve)}
          </strong>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-500/10 border border-zinc-500/20">
          <span className="text-zinc-500 font-bold block text-[10px]">إجمالي التكلفة الثابتة (F)</span>
          <strong className="text-sm font-black text-zinc-300 font-mono mt-0.5 block truncate">
            {formatCurrency(overallTotals.totalFixedCost)}
          </strong>
        </div>

        <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
          <span className="text-zinc-500 font-bold block text-[10px]">متوسط هامش الربح</span>
          <strong className="text-sm font-black text-orange-500 font-mono mt-0.5 block truncate">
            {overallTotals.totalRevenue > 0
              ? `${Math.round((overallTotals.totalNetProfit / overallTotals.totalRevenue) * 1000) / 10}%`
              : '0%'}
          </strong>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
          <span className="text-zinc-500 font-bold block text-[10px]">إجمالي صافي الربح</span>
          <strong className="text-sm font-black text-emerald-400 font-mono mt-0.5 block truncate">
            {formatCurrency(overallTotals.totalNetProfit)}
          </strong>
        </div>
      </div>

      {/* 3. Aggregated Reports Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">اسم المنتج واللعبة</th>
                <th className="py-3.5 px-4 text-center">الكمية المباعة</th>
                <th className="py-3.5 px-4 text-center">عدد العمليات</th>
                <th className="py-3.5 px-4 text-center">إجمالي الإيرادات</th>
                <th className="py-3.5 px-4 text-center">إجمالي التكلفة</th>
                <th className="py-3.5 px-4 text-center">كاش باك + إحالة</th>
                <th className="py-3.5 px-4 text-center">صافي الأرباح</th>
                <th className="py-3.5 px-4 text-center">متوسط البيع</th>
                <th className="py-3.5 px-4 text-center">أكثر الموظفين بيعاً</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {productStats.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-zinc-400">
                    لا توجد منتجات أو بيانات مبيعات مطابقة للفلاتر المحددة
                  </td>
                </tr>
              ) : (
                productStats.map((item, idx) => {
                  const avgPrice =
                    item.timesSold > 0 ? Math.round(item.totalRevenue / item.timesSold) : item.lastSellingPrice;

                  // Top Employee for this specific item
                  const empEntries = Object.entries(item.employeeSales).sort((a, b) => b[1].count - a[1].count);
                  const topEmpName = empEntries.length > 0 ? empEntries[0][0] : '—';
                  const topEmpCount = empEntries.length > 0 ? empEntries[0][1].count : 0;

                  return (
                    <tr key={item.id || idx} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-zinc-400">{idx + 1}</td>

                      <td className="py-3 px-4">
                        <strong className="text-zinc-900 dark:text-zinc-100 font-bold block">{item.productName}</strong>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono mt-0.5">
                          <span>{item.gameName}</span>
                          {item.sectionName && <span>• {item.sectionName}</span>}
                          {item.groupName && <span>• {item.groupName}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs ${
                            item.timesSold > 0
                              ? 'bg-orange-500/10 text-orange-500 font-black border border-orange-500/20'
                              : 'text-zinc-400'
                          }`}
                        >
                          {item.timesSold}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-zinc-500 font-bold">
                        {item.ordersCount}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-black text-blue-500">
                        {formatCurrency(item.totalRevenue)}
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-rose-500">
                        {formatCurrency(item.totalCost)}
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-purple-400">
                        {formatCurrency(item.totalCashback + item.totalReferral)}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-black text-emerald-500">
                        {formatCurrency(item.totalNetProfit)}
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-zinc-400 font-bold">
                        {formatCurrency(avgPrice)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {topEmpCount > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                              {topEmpName}
                            </span>
                            <span className="text-[10px] font-mono text-orange-500 font-bold">
                              ({topEmpCount} وحدة)
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
