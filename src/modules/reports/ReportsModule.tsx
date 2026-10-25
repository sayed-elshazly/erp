import React, { useState, useEffect, useMemo } from 'react';
import { CustomerTicket } from '../../types/customer.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import {
  FileText,
  Clock,
  Users,
  Sparkles,
  Gamepad2,
  Wallet,
  Printer,
  Download,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Award,
  Filter,
  ShieldAlert
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { ReportGeneratorModal } from '../../components/reporting/ReportGeneratorModal';
import { ReportTemplateType } from '../../services/reporting/reportTypes';
import { DeficitAuditTab } from './DeficitAuditTab';

interface ReportsModuleProps {
  department?: 'customers' | 'dealers';
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({ department = 'customers' }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Sub-tabs: 'deficit_audit' | 'shift' | 'employees' | 'partners' | 'cashback' | 'products' | 'wallets'
  const [activeReportTab, setActiveReportTab] = useState<
    'deficit_audit' | 'shift' | 'employees' | 'partners' | 'cashback' | 'products' | 'wallets'
  >('deficit_audit');

  const [isReportGenModalOpen, setIsReportGenModalOpen] = useState(false);
  const [reportGenTemplate, setReportGenTemplate] = useState<ReportTemplateType>('shift_settlement');

  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);

  // Date Range Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = () => {
    if (department === 'dealers') {
      setTickets(db.getDealerTickets());
      setCustomers(db.getDealers());
    } else {
      setTickets(db.getTickets());
      setCustomers(db.getCustomers());
    }
    setExpenses(db.getExpenses());
    setWallets(db.getStoreWallets());
    setGames(db.getGameTree());
  };

  useEffect(() => {
    loadData();
  }, [department]);

  // Filtered Tickets by Date Range
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const itemDate = new Date(t.createdAt).toISOString().split('T')[0];
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    });
  }, [tickets, startDate, endDate]);

  // Filtered Expenses by Date Range
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const itemDate = (e.date || e.createdAt || '').split('T')[0];
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    });
  }, [expenses, startDate, endDate]);

  // Period Financial Calculations
  const periodRevenue = filteredTickets.reduce((sum, t) => sum + (t.receivedAmount || t.requiredAmount || 0), 0);
  const periodCost = filteredTickets.reduce((sum, t) => {
    if (t.items && t.items.length > 0) {
      const itemsCost = t.items.reduce((s, it) => s + ((it.costPrice || 0) * (it.quantity || 1)), 0);
      return sum + (itemsCost || ((t.receivedAmount || t.requiredAmount || 0) * 0.85));
    }
    return sum + ((t.receivedAmount || t.requiredAmount || 0) * 0.85);
  }, 0);
  const periodCashback = filteredTickets.reduce((sum, t) => sum + (t.cashbackEarned || 0), 0);
  const periodExpensesTotal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const periodNetProfit = periodRevenue - periodCost - periodCashback - periodExpensesTotal;

  // Partners Summary
  const partners = customers.filter(c => c.profileType === 'partner' || c.profileType === 'shop' || c.profileType === 'influencer');

  const handleExportReport = () => {
    const data = filteredTickets.map(t => ({
      'رقم التذكرة': t.ticketNumber,
      'العميل': t.customerName,
      'الهاتف': t.customerPhone,
      'اللعبة': t.gameName,
      'المنتج': t.gameProductName,
      'المبلغ': t.receivedAmount || t.requiredAmount,
      'الكاش باك': t.cashbackEarned || 0,
      'الحالة': t.status,
      'التاريخ': formatDateTime(t.createdAt)
    }));

    const dateLabel = startDate && endDate ? `${startDate}_إلى_${endDate}` : startDate || endDate || 'الكل';
    exportToExcel(data, `تقرير_العمليات_${dateLabel}`);
    showToast('info', 'تم التصدير', 'تم تصدير التقرير بنجاح');
  };

  return (
    <div className="space-y-4 animate-fade-in text-right">
      {/* Top Header with DateRangeFilter */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
              مركز التقارير وتسوية الورديات (Reports & Settlements)
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            تسوية الوردية والعمليات، أداء الموظفين، عمولات الشركاء، وحركة المحافظ مع فلترة التاريخ المخصصة.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
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
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={() => {
              setReportGenTemplate(
                activeReportTab === 'shift'
                  ? 'shift_settlement'
                  : activeReportTab === 'partners'
                  ? 'sales'
                  : activeReportTab === 'products'
                  ? 'catalog'
                  : activeReportTab === 'wallets'
                  ? 'wallets'
                  : 'shift_settlement'
              );
              setIsReportGenModalOpen(true);
            }}
            className="whitespace-nowrap shrink-0"
          >
            تصدير Excel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => {
              setReportGenTemplate(
                activeReportTab === 'shift'
                  ? 'shift_settlement'
                  : activeReportTab === 'partners'
                  ? 'sales'
                  : activeReportTab === 'products'
                  ? 'catalog'
                  : activeReportTab === 'wallets'
                  ? 'wallets'
                  : 'shift_settlement'
              );
              setIsReportGenModalOpen(true);
            }}
            className="whitespace-nowrap shrink-0"
          >
            🖨️ إنشاء وطباعة التقرير
          </Button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveReportTab('deficit_audit')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'deficit_audit' ? 'bg-rose-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> 🛡️ تقرير كشف العجز والسرقة
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('shift')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'shift' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> تقرير التسوية المالية والوردية ({filteredTickets.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('partners')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'partners' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" /> تقرير الشركاء والمحلات ({partners.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('cashback')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'cashback' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> تقرير الكاش باك والأمانات
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('products')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'products' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" /> مبيعات الألعاب والباقات ({games.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('wallets')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeReportTab === 'wallets' ? 'bg-orange-500 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" /> تقرير أرصدة المحافظ ({wallets.length})
        </button>
      </div>

      {/* 0. تقرير كشف العجز والسرقة */}
      {activeReportTab === 'deficit_audit' && <DeficitAuditTab />}

      {/* 1. تقرير تسوية الوردية والعمليات المحددة بالتاريخ */}
      {activeReportTab === 'shift' && (
        <div className="space-y-4 animate-fade-in text-xs">
          <Card className="p-5 bg-white dark:bg-[#18181B] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#27272A] flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {startDate || endDate
                    ? `تسوية العمليات للفترة المحددة (${startDate || 'البداية'} إلى ${endDate || 'اليوم'})`
                    : `تسوية جميع العمليات وإغلاق الوردية`}
                </h3>
                <p className="text-zinc-500">المسؤول: {user?.fullName || 'المدير العام'}</p>
              </div>
              <Badge variant="orange" size="sm">{filteredTickets.length} عملية شحن مسجلة</Badge>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417]">
                <span className="text-zinc-400 block mb-1">إجمالي الوارد</span>
                <span className="text-base font-black font-mono text-zinc-900 dark:text-zinc-100">
                  {periodRevenue.toLocaleString()} ج
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417]">
                <span className="text-zinc-400 block mb-1">تكلفة البضاعة (-)</span>
                <span className="text-base font-black font-mono text-rose-500">
                  -{Math.round(periodCost).toLocaleString()} ج
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417]">
                <span className="text-zinc-400 block mb-1">الكاش باك والأمانات (-)</span>
                <span className="text-base font-black font-mono text-amber-500">
                  -{periodCashback.toLocaleString()} ج
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417]">
                <span className="text-zinc-400 block mb-1">المصاريف (-)</span>
                <span className="text-base font-black font-mono text-rose-400">
                  -{periodExpensesTotal.toLocaleString()} ج
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-emerald-500 block mb-1 font-bold">صافي الربح المحقق (=)</span>
                <span className="text-lg font-black font-mono text-emerald-500">
                  {Math.round(periodNetProfit).toLocaleString()} ج
                </span>
              </div>
            </div>
          </Card>

          {/* Detailed Period Tickets Table */}
          <div className="overflow-x-auto border border-gray-200 dark:border-[#27272A] rounded-2xl bg-white dark:bg-[#18181B]">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                  <th className="py-2.5 px-3.5">رقم التذكرة</th>
                  <th className="py-2.5 px-3.5">تاريخ التذكرة</th>
                  <th className="py-2.5 px-3.5">العميل</th>
                  <th className="py-2.5 px-3.5">اللعبة والمنتج</th>
                  <th className="py-2.5 px-3.5">الـ ID</th>
                  <th className="py-2.5 px-3.5">المبلغ الوارد</th>
                  <th className="py-2.5 px-3.5">الكاش باك</th>
                  <th className="py-2.5 px-3.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-400">
                      لا توجد عمليات مسجلة في هذا النطاق الزمني
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-orange-500">{t.ticketNumber}</td>
                      <td className="py-2.5 px-3.5 font-mono text-zinc-400 text-[11px]">{formatDateTime(t.createdAt)}</td>
                      <td className="py-2.5 px-3.5 font-bold text-zinc-800 dark:text-zinc-200">{t.customerName}</td>
                      <td className="py-2.5 px-3.5">{t.gameName} — {t.gameProductName}</td>
                      <td className="py-2.5 px-3.5 font-mono text-emerald-500">{t.playerGameId}</td>
                      <td className="py-2.5 px-3.5 font-mono font-bold">{t.receivedAmount || t.requiredAmount} ج</td>
                      <td className="py-2.5 px-3.5 font-mono text-emerald-500 font-bold">+{t.cashbackEarned || 0} ج</td>
                      <td className="py-2.5 px-3.5">
                        <Badge variant={t.status === 'completed' ? 'success' : t.status === 'problem' ? 'danger' : 'warning'} size="sm">
                          {t.status === 'completed' ? 'مكتملة' : t.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. تقرير الشركاء والمحلات */}
      {activeReportTab === 'partners' && (
        <div className="space-y-4 animate-fade-in text-xs">
          <div className="overflow-x-auto border border-gray-200 dark:border-[#27272A] rounded-2xl bg-white dark:bg-[#18181B]">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#141417] text-zinc-500 font-bold border-b border-gray-200 dark:border-[#27272A]">
                  <th className="py-2.5 px-3.5">اسم الشريك / المحل</th>
                  <th className="py-2.5 px-3.5">النوع</th>
                  <th className="py-2.5 px-3.5">الهاتف</th>
                  <th className="py-2.5 px-3.5">كود الإحالة</th>
                  <th className="py-2.5 px-3.5">عملاء هذا الشهر</th>
                  <th className="py-2.5 px-3.5">رصيد العمولات المعلق</th>
                  <th className="py-2.5 px-3.5">إجمالي الأرباح التاريخية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {partners.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-2.5 px-3.5 font-bold text-zinc-900 dark:text-zinc-100">
                      {p.name} {p.shopName && <span className="block text-zinc-400 font-normal">{p.shopName}</span>}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <Badge variant={p.profileType === 'shop' ? 'info' : 'warning'} size="sm">
                        {p.profileType === 'shop' ? 'محل' : p.profileType === 'influencer' ? 'مشهور' : 'شريك'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-zinc-400">{p.phone}</td>
                    <td className="py-2.5 px-3.5 font-mono text-orange-500">{p.referralCode}</td>
                    <td className="py-2.5 px-3.5 font-mono font-bold">{p.monthlyReferredCount} / 10</td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-emerald-500">{p.referralWalletBalance} ج</td>
                    <td className="py-2.5 px-3.5 font-mono text-zinc-300">{p.totalReferralCommissionEarned} ج</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. تقرير الكاش باك */}
      {activeReportTab === 'cashback' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in text-xs">
          <Card className="p-4 bg-white dark:bg-[#18181B]">
            <span className="text-zinc-400 block mb-1">إجمالي الكاش باك المكتسب للعملاء</span>
            <span className="text-xl font-black font-mono text-orange-500">
              {customers.reduce((sum, c) => sum + (c.totalCashbackEarned || 0), 0)} ج.م
            </span>
          </Card>

          <Card className="p-4 bg-white dark:bg-[#18181B]">
            <span className="text-zinc-400 block mb-1">رصيد الكاش باك المتبقي بالمحافظ</span>
            <span className="text-xl font-black font-mono text-emerald-500">
              {customers.reduce((sum, c) => sum + (c.cashbackBalance || 0), 0)} ج.م
            </span>
          </Card>

          <Card className="p-4 bg-white dark:bg-[#18181B]">
            <span className="text-zinc-400 block mb-1">محفظة الأمانات المعزولة (Escrow)</span>
            <span className="text-xl font-black font-mono text-blue-500">
              {wallets.find(w => w.type === 'trust')?.balance || 3850} ج.م
            </span>
          </Card>
        </div>
      )}

      {/* 4. مبيعات الألعاب */}
      {activeReportTab === 'products' && (
        <div className="space-y-4 animate-fade-in text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {games.map(g => (
              <Card key={g.id} className="p-4 space-y-2 bg-white dark:bg-[#18181B]">
                <div className="flex items-center justify-between">
                  <span className="text-lg">{g.icon} {g.name}</span>
                  <Badge variant="orange" size="sm">{g.products.length} باقة</Badge>
                </div>
                <p className="text-zinc-400">إجمالي الطلبات المنفذة على اللعبة: <strong>{tickets.filter(t => t.gameName === g.name).length}</strong> طلب</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 5. تقرير المحافظ */}
      {activeReportTab === 'wallets' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in text-xs">
          {wallets.map(w => (
            <Card key={w.id} className="p-4 space-y-2 bg-white dark:bg-[#18181B]">
              <span className="text-zinc-400 block">{w.name}</span>
              <span className="text-lg font-black font-mono text-emerald-500">
                {w.currency === 'USD' ? `$${w.balance}` : `${w.balance} ج.م`}
              </span>
            </Card>
          ))}
        </div>
      )}

      {/* 🖨️ Professional Report Generator Modal */}
      {isReportGenModalOpen && (
        <ReportGeneratorModal
          isOpen={isReportGenModalOpen}
          onClose={() => setIsReportGenModalOpen(false)}
          defaultTemplateType={reportGenTemplate}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />
      )}
    </div>
  );
};
