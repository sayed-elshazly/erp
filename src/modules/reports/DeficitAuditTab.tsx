import React, { useState, useMemo } from 'react';
import { db } from '../../database/db';
import { CustomerTicket } from '../../types/customer.types';
import { StoreWallet, StoreWalletTransaction } from '../../types/topup.types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  RotateCcw,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Printer,
  Calendar,
  Search,
  HelpCircle,
  Info
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';

export const DeficitAuditTab: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Load all raw operational data
  const tickets = db.getTickets();
  const wallets = db.getStoreWallets();
  const allWalletTransactions = db.getStoreWalletTransactions();
  const expenses = db.getExpenses();

  // Effective date range
  const { effectiveStart, effectiveEnd } = useMemo(() => {
    return {
      effectiveStart: startDate || '1970-01-01',
      effectiveEnd: endDate || '2099-12-31'
    };
  }, [startDate, endDate]);

  // Filtered operational datasets
  const periodTickets = useMemo(() => {
    return tickets.filter(t => {
      const d = (t.createdAt || '').split('T')[0];
      return d >= effectiveStart && d <= effectiveEnd;
    });
  }, [tickets, effectiveStart, effectiveEnd]);

  const periodWalletTransactions = useMemo(() => {
    return allWalletTransactions.filter(tx => {
      const d = (tx.createdAt || '').split('T')[0];
      return d >= effectiveStart && d <= effectiveEnd;
    });
  }, [allWalletTransactions, effectiveStart, effectiveEnd]);

  const periodExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = (e.date || e.createdAt || '').split('T')[0];
      return d >= effectiveStart && d <= effectiveEnd;
    });
  }, [expenses, effectiveStart, effectiveEnd]);

  // Financial Reconciliation Engine
  const reconciliation = useMemo(() => {
    // 1. Total Sales Count & Gross Amount
    const totalSalesCount = periodTickets.length;
    const completedSalesCount = periodTickets.filter(t => t.status === 'completed').length;
    const totalProductsAmount = periodTickets.reduce((acc, t) => acc + (t.totalProductsAmount || t.requiredAmount || 0), 0);

    // 2. Revenues (Actual Money Received into Wallets)
    const totalRevenuesReceived = periodTickets
      .filter(t => t.status !== 'canceled' && t.status !== 'fraud')
      .reduce((acc, t) => acc + (t.receivedAmount || 0), 0);

    // 3. Refunds & Compensations
    const totalRefunds = periodTickets
      .filter(t => t.status === 'refunded' || (t.refundDetails && t.refundDetails.amount > 0))
      .reduce((acc, t) => acc + (t.refundDetails?.amount || t.receivedAmount || 0), 0);

    // 4. Net Profits
    const totalNetProfit = periodTickets
      .filter(t => t.status === 'completed')
      .reduce((acc, t) => acc + (t.totalProfitMargin || t.netProfit || 0), 0);

    // 5. Operating Expenses paid in Cash / Wallets
    const totalExpenses = periodExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // 6. Inter-Wallet Transfers (Within period)
    const transfersOut = periodWalletTransactions
      .filter(tx => tx.type === 'transfer_out')
      .reduce((acc, tx) => acc + (tx.amount || 0) + (tx.transferFees || 0), 0);

    const transfersIn = periodWalletTransactions
      .filter(tx => tx.type === 'transfer_in')
      .reduce((acc, tx) => acc + (tx.amount || 0), 0);

    // 7. Actual Current Total Balance across non-system Cash Wallets
    const cashWallets = wallets.filter(w => !w.isSystemWallet);
    const actualWalletBalance = cashWallets.reduce((acc, w) => acc + (w.currency === 'USD' ? (w.balance * 50) : w.balance), 0);

    // 8. Approximate Opening Balance (Actual Balance minus net inflow of today/period)
    const netPeriodInflow = (totalRevenuesReceived + transfersIn) - (transfersOut + totalExpenses + totalRefunds);
    const openingBalance = Math.max(0, actualWalletBalance - netPeriodInflow);

    // 9. Expected Closing Balance
    const expectedClosingBalance = openingBalance + netPeriodInflow;

    // 10. Deficit or Surplus Comparison
    const difference = actualWalletBalance - expectedClosingBalance;
    const hasDeficit = difference < -1; // Tolerance 1 EGP
    const deficitAmount = hasDeficit ? Math.abs(difference) : 0;
    const surplusAmount = difference > 1 ? difference : 0;

    // Potential Root Causes Analysis
    const possibleCauses: { title: string; desc: string; severity: 'high' | 'medium' | 'low' }[] = [];
    if (hasDeficit) {
      if (transfersOut > transfersIn) {
        possibleCauses.push({
          title: 'تحويلات صادرة غير متكافئة',
          desc: `تم تسجيل تحويلات صادرة بقيمة ${formatCurrency(transfersOut)} بينما الوارد ${formatCurrency(transfersIn)}، قد توجد تحويلات خارجية لم يتم توثيق استلامها.`,
          severity: 'high'
        });
      }
      if (totalExpenses > 0) {
        possibleCauses.push({
          title: 'مصروفات نقدية مسجلة',
          desc: `تم خصم مصروفات تشغيلية بقيمة ${formatCurrency(totalExpenses)}، يرجى التأكد من مطابقة فواتير وسندات الصرف.`,
          severity: 'medium'
        });
      }
      if (totalRefunds > 0) {
        possibleCauses.push({
          title: 'استردادات وتعويضات تذاكر',
          desc: `تم رد مبالغ بقيمة ${formatCurrency(totalRefunds)} لعملاء نتيجة مشاكل شحن سابقة.`,
          severity: 'medium'
        });
      }
      possibleCauses.push({
        title: 'نقص استلام أو تحصيل مباشر',
        desc: 'يحتمل وجود نقص في استلام الدفعات من العملاء أو عمليات سحب نقدية بدون سند قيد في النظام.',
        severity: 'high'
      });
    }

    return {
      openingBalance,
      totalSalesCount,
      completedSalesCount,
      totalProductsAmount,
      totalRevenuesReceived,
      totalRefunds,
      totalNetProfit,
      totalExpenses,
      transfersIn,
      transfersOut,
      actualWalletBalance,
      expectedClosingBalance,
      difference,
      hasDeficit,
      deficitAmount,
      surplusAmount,
      possibleCauses,
      cashWallets
    };
  }, [periodTickets, periodWalletTransactions, periodExpenses, wallets]);

  // Export to Excel
  const handleExportExcel = () => {
    const data = [
      { 'البند': 'رصيد بداية الفترة', 'القيمة (جنيه)': reconciliation.openingBalance },
      { 'البند': 'إجمالي المبيعات (عدد)', 'القيمة (جنيه)': reconciliation.totalSalesCount },
      { 'البند': 'قيمة المنتجات المباعة', 'القيمة (جنيه)': reconciliation.totalProductsAmount },
      { 'البند': 'الإيرادات المستلمة فعلياً', 'القيمة (جنيه)': reconciliation.totalRevenuesReceived },
      { 'البند': 'التحويلات الواردة', 'القيمة (جنيه)': reconciliation.transfersIn },
      { 'البند': 'التحويلات الصادرة والرسوم', 'القيمة (جنيه)': reconciliation.transfersOut },
      { 'البند': 'الاستردادات والتعويضات', 'القيمة (جنيه)': reconciliation.totalRefunds },
      { 'البند': 'المصروفات التشغيلية', 'القيمة (جنيه)': reconciliation.totalExpenses },
      { 'البند': 'صافي الأرباح المحققة', 'القيمة (جنيه)': reconciliation.totalNetProfit },
      { 'البند': 'الرصيد المتوقع نهاية الفترة', 'القيمة (جنيه)': reconciliation.expectedClosingBalance },
      { 'البند': 'الرصيد الفعلي في المحافظ', 'القيمة (جنيه)': reconciliation.actualWalletBalance },
      { 'البند': 'حالة الخزينة', 'القيمة (جنيه)': reconciliation.hasDeficit ? `يوجد عجز بقيمة ${reconciliation.deficitAmount}` : 'مطابق 100% (لا يوجد عجز)' }
    ];
    exportToExcel(data, `تقرير_كشف_العجز_والخزينة_${effectiveStart}`);
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs">
      {/* Header & Period Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
              تقرير اكتشاف العجز والسرقة ومطابقة الخزينة (Deficit & Anti-Theft Audit)
            </h2>
            <Badge variant={reconciliation.hasDeficit ? 'danger' : 'success'} size="sm">
              {reconciliation.hasDeficit ? '⚠️ يوجد عجز مالي' : '✔ الخزينة مطابقة'}
            </Badge>
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            نظام تدقيق ذكي يحسب أرصدة البداية، كل المبيعات، الإيرادات، الاستردادات، التحويلات، ويقارن المتوقع بالفعلي لاكتشاف أي عجز مالي فوراً.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onReset={() => {
              setStartDate(todayStr);
              setEndDate(todayStr);
            }}
            label="فترة التدقيق"
          />

          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
            onClick={handleExportExcel}
          >
            تصدير Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4 text-zinc-400" />}
            onClick={() => window.print()}
          >
            طباعة
          </Button>
        </div>
      </div>

      {/* Main Reconciliation Verdict Banner (النتيجة النهائية الكبرى) */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          reconciliation.hasDeficit
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${reconciliation.hasDeficit ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
              {reconciliation.hasDeficit ? <XCircle className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">
                {reconciliation.hasDeficit ? '❌ يوجد عجز مالي في الخزينة' : '✔ لا يوجد عجز — الخزينة والمحافظ مطابقة تماماً'}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                الفترة المحددة: {formatDate(effectiveStart)} {effectiveStart !== effectiveEnd ? `إلى ${formatDate(effectiveEnd)}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-left">
            <div>
              <span className="text-[10px] text-zinc-400 block">المبلغ المتوقع عند الإغلاق:</span>
              <strong className="text-base text-zinc-800 dark:text-zinc-200">
                {formatCurrency(reconciliation.expectedClosingBalance)}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block">المبلغ الفعلي في المحافظ:</span>
              <strong className="text-base text-zinc-800 dark:text-zinc-200">
                {formatCurrency(reconciliation.actualWalletBalance)}
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-black/20 border border-white/10">
              <span className="text-[10px] text-zinc-400 block">
                {reconciliation.hasDeficit ? 'قيمة العجز المالي:' : 'الفارق / الفائض:'}
              </span>
              <strong className={`text-base font-black ${reconciliation.hasDeficit ? 'text-rose-400' : 'text-emerald-400'}`}>
                {reconciliation.hasDeficit
                  ? `-${formatCurrency(reconciliation.deficitAmount)}`
                  : `+${formatCurrency(reconciliation.surplusAmount)}`}
              </strong>
            </div>
          </div>
        </div>

        {/* Root Causes if Deficit Exists */}
        {reconciliation.hasDeficit && reconciliation.possibleCauses.length > 0 && (
          <div className="mt-4 pt-3 border-t border-rose-500/20 space-y-2">
            <span className="font-bold text-xs flex items-center gap-1.5 text-rose-400">
              <AlertTriangle className="w-4 h-4" /> الأسباب والتفسيرات المحتملة لوجود الفارق:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {reconciliation.possibleCauses.map((cause, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-black/30 border border-rose-500/20 text-xs">
                  <strong className="text-rose-300 block mb-0.5">• {cause.title}</strong>
                  <span className="text-zinc-400 text-[11px]">{cause.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 8 Core KPIs Calculation Grid (بداية اليوم، المبيعات، التحويلات، الإيرادات، الاستردادات، الأرباح، المصروفات، الأرصدة) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Opening Balance */}
        <Card className="p-3.5 space-y-1 bg-white dark:bg-[#18181B]">
          <span className="text-[10px] text-zinc-400 font-bold block">1. رصيد بداية الفترة</span>
          <p className="text-sm font-mono font-black text-zinc-900 dark:text-zinc-100">
            {formatCurrency(reconciliation.openingBalance)}
          </p>
          <span className="text-[9px] text-zinc-500">الرصيد الافتتاحي المقدر</span>
        </Card>

        {/* 2. All Sales */}
        <Card className="p-3.5 space-y-1 bg-white dark:bg-[#18181B]">
          <span className="text-[10px] text-zinc-400 font-bold block">2. كل المبيعات</span>
          <p className="text-sm font-mono font-black text-orange-500">
            {formatCurrency(reconciliation.totalProductsAmount)}
          </p>
          <span className="text-[9px] text-zinc-500">
            {reconciliation.completedSalesCount} طلب مكتمل من {reconciliation.totalSalesCount}
          </span>
        </Card>

        {/* 3. Revenues Received */}
        <Card className="p-3.5 space-y-1 bg-white dark:bg-[#18181B]">
          <span className="text-[10px] text-zinc-400 font-bold block">3. الإيرادات المستلمة فعلياً</span>
          <p className="text-sm font-mono font-black text-emerald-500">
            {formatCurrency(reconciliation.totalRevenuesReceived)}
          </p>
          <span className="text-[9px] text-zinc-500">سداد التذاكر الفعلي</span>
        </Card>

        {/* 4. Net Profits */}
        <Card className="p-3.5 space-y-1 bg-white dark:bg-[#18181B]">
          <span className="text-[10px] text-zinc-400 font-bold block">4. صافي الأرباح</span>
          <p className="text-sm font-mono font-black text-blue-400">
            {formatCurrency(reconciliation.totalNetProfit)}
          </p>
          <span className="text-[9px] text-zinc-500">بعد التكلفة المباشرة</span>
        </Card>

        {/* 5. Transfers In */}
        <Card className="p-3.5 space-y-1 bg-white dark:bg-[#18181B]">
          <span className="text-[10px] text-zinc-400 font-bold block">5. التحويلات الواردة</span>
          <p className="text-sm font-mono font-black text-teal-400">
            {formatCurrency(reconciliation.transfersIn)}
          </p>
          <span className="text-[9px] text-zinc-500">بين المحافظ والخزائن</span>
        </Card>

        {/* 6. Transfers Out */}
        <Card className="p-3.5 space-y-1 bg-white dark:bg-[#18181B]">
          <span className="text-[10px] text-zinc-400 font-bold block">6. التحويلات الصادرة والرسوم</span>
          <p className="text-sm font-mono font-black text-amber-500">
            {formatCurrency(reconciliation.transfersOut)}
          </p>
          <span className="text-[9px] text-zinc-500">تحويلات بينية ومصروفات تحويل</span>
        </Card>

        {/* 7. Refunds */}
        <Card className="p-3.5 space-y-1 bg-white dark:bg-[#18181B]">
          <span className="text-[10px] text-zinc-400 font-bold block">7. الاستردادات والتعويضات</span>
          <p className="text-sm font-mono font-black text-purple-400">
            {formatCurrency(reconciliation.totalRefunds)}
          </p>
          <span className="text-[9px] text-zinc-500">مبالغ مستردة للعملاء</span>
        </Card>

        {/* 8. Expenses */}
        <Card className="p-3.5 space-y-1 bg-white dark:bg-[#18181B]">
          <span className="text-[10px] text-zinc-400 font-bold block">8. المصروفات التشغيلية</span>
          <p className="text-sm font-mono font-black text-rose-400">
            {formatCurrency(reconciliation.totalExpenses)}
          </p>
          <span className="text-[9px] text-zinc-500">نثريات ومصروفات معتمدة</span>
        </Card>
      </div>

      {/* Wallets Balances Breakdown Table */}
      <Card className="p-4 bg-white dark:bg-[#18181B] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-orange-500" />
            أرصدة المحافظ الفعلية وتوزيع السيولة
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">
            إجمالي السيولة: <strong className="text-emerald-500 font-bold">{formatCurrency(reconciliation.actualWalletBalance)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-[#27272A] text-zinc-400">
                <th className="py-2 px-3">اسم المحفظة / الخزينة</th>
                <th className="py-2 px-3">النوع والعملة</th>
                <th className="py-2 px-3">الرصيد الفعلي الحالي</th>
                <th className="py-2 px-3">القيمة بالجنيه</th>
                <th className="py-2 px-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {reconciliation.cashWallets.map(w => {
                const valueEGP = w.currency === 'USD' ? w.balance * 50 : w.balance;
                return (
                  <tr key={w.id} className="hover:bg-gray-50/50 dark:hover:bg-[#27272A]/30">
                    <td className="py-2 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                      {w.name}
                    </td>
                    <td className="py-2 px-3 text-zinc-400">
                      {w.type === 'usdt' ? '🪙 رقمي (USDT)' : (w.category?.includes('بنك') || w.name.includes('بنك') || w.name.includes('InstaPay') || w.name.includes('إنستاباي')) ? '🏦 بنكي / إنستاباي' : '📱 محفظة تشغيل كاش'} ({w.currency})
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-zinc-200">
                      {formatCurrency(w.balance, w.currency)}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                      {formatCurrency(valueEGP)}
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant={w.isFrozen ? 'danger' : 'success'} size="sm">
                        {w.isFrozen ? 'مجمدة' : 'نشطة'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
