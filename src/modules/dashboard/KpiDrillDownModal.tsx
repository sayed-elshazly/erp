// =============================================================
// NZM JKR TOP UP ERP — KPI Drill Down Modal
// Detailed Transactions & Records Drill-Down (Single Source of Truth)
// =============================================================

import React, { useMemo, useState } from 'react';
import { UnifiedFinancialTransaction, UnifiedFinanceFilter } from '../../types/finance.types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { getGameBadgeStyle } from '../../utils/gameBadgeColors';
import {
  TrendingUp,
  Search,
  Download,
  Filter,
  Layers,
  Calendar,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Gamepad2,
  FileText,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export interface KpiDrillDownProps {
  isOpen: boolean;
  onClose: () => void;
  kpiId: string;
  kpiTitle: string;
  kpiValue: string | number;
  kpiSubtitle?: string;
  transactions: UnifiedFinancialTransaction[];
  filter: UnifiedFinanceFilter;
  onOpenRecord?: (department: string, referenceId?: string) => void;
}

export const KpiDrillDownModal: React.FC<KpiDrillDownProps> = ({
  isOpen,
  onClose,
  kpiId,
  kpiTitle,
  kpiValue,
  kpiSubtitle,
  transactions,
  filter,
  onOpenRecord
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // Filter transactions specific to the clicked KPI type
  const targetTransactions = useMemo(() => {
    let list = [...transactions];

    if (kpiId === 'net_profit' || kpiId === 'gross_profit' || kpiId === 'total_sales' || kpiId === 'today_transactions') {
      // Sales and profit operations
      list = list.filter(t => t.type === 'sale' || t.type === 'middleman' || t.type === 'subscription' || t.type === 'renewal');
    } else if (kpiId === 'total_expenses') {
      list = list.filter(t => t.type === 'expense' || t.category === 'expense');
    } else if (kpiId === 'cashback_pending') {
      list = list.filter(t => t.type === 'cashback' || t.category === 'cashback');
    } else if (kpiId === 'referral_commissions') {
      list = list.filter(t => t.type === 'referral' || t.category === 'commission');
    } else if (kpiId === 'receivables' || kpiId === 'payables') {
      list = list.filter(t => t.type === 'purchase' || t.type === 'debt_payment' || t.department === 'dealers');
    } else if (kpiId === 'middleman_company_commission') {
      list = list.filter(t => t.department === 'middleman');
    } else if (kpiId === 'middleman_third_party_commission') {
      list = list.filter(t => t.department === 'middleman' && t.type === 'middleman');
    } else if (kpiId === 'inventory_available_accounts' || kpiId === 'inventory_sold_accounts') {
      list = list.filter(t => t.department === 'middleman');
    }

    // Apply internal search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        t.description.toLowerCase().includes(q) ||
        (t.referenceNumber && t.referenceNumber.toLowerCase().includes(q)) ||
        (t.partyName && t.partyName.toLowerCase().includes(q)) ||
        (t.partyPhone && t.partyPhone.includes(q)) ||
        (t.gameName && t.gameName.toLowerCase().includes(q)) ||
        (t.planName && t.planName.toLowerCase().includes(q))
      );
    }

    if (selectedDeptFilter !== 'all') {
      list = list.filter(t => t.department === selectedDeptFilter);
    }

    return list;
  }, [transactions, kpiId, searchQuery, selectedDeptFilter]);

  // Aggregate summary
  const totalAmountSum = useMemo(() => {
    return targetTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [targetTransactions]);

  const totalProfitSum = useMemo(() => {
    return targetTransactions.reduce((acc, t) => acc + (t.netProfit || 0), 0);
  }, [targetTransactions]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['المعرف', 'التاريخ', 'القسم', 'نوع العملية', 'المرجع', 'الطرف المرتبط', 'المبلغ', 'صافي الربح', 'الحالة', 'البيان'];
    const rows = targetTransactions.map(t => [
      t.id,
      t.createdAt,
      t.departmentNameArabic,
      t.typeLabelArabic,
      t.referenceNumber || '',
      t.partyName || '',
      t.amount,
      t.netProfit || 0,
      t.status,
      `"${t.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DrillDown_${kpiId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDepartmentBadge = (dept: string) => {
    switch (dept) {
      case 'customers':
        return <Badge variant="warning" size="sm">الزبائن والشحن</Badge>;
      case 'dealers':
        return <Badge variant="info" size="sm">التجار والموزعين</Badge>;
      case 'middleman':
        return <Badge variant="purple" size="sm">الوساطة والمخزن</Badge>;
      case 'subscriptions':
        return <Badge variant="pink" size="sm">الاشتراكات الرقمية</Badge>;
      case 'treasury':
        return <Badge variant="success" size="sm">الخزينة والمصروفات</Badge>;
      default:
        return <Badge variant="default" size="sm">{dept}</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🔍 تفصيل المؤشر المالي: ${kpiTitle} (KPI Drill-Down)`}
      subtitle={kpiSubtitle || `استعراض دقيق للعمليات والقيود المالية المكونة لهذا الرقم اعتماداً على مصدر البيانات الموحد`}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-right">
        {/* KPI Top Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-3.5 bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
            <span className="text-[11px] font-bold text-zinc-400 block mb-1">القيمة الإجمالية للمؤشر</span>
            <div className="text-xl font-black text-orange-400">{kpiValue}</div>
            <span className="text-[10px] text-zinc-500">حسب الفلاتر الزمنية والتشغيلية المطبقة</span>
          </Card>

          <Card className="p-3.5 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <span className="text-[11px] font-bold text-zinc-400 block mb-1">عدد العمليات المطابقة</span>
            <div className="text-xl font-black text-blue-400">{targetTransactions.length} عملية</div>
            <span className="text-[10px] text-zinc-500">مجموع المبالغ: {formatCurrency(totalAmountSum)}</span>
          </Card>

          <Card className="p-3.5 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <span className="text-[11px] font-bold text-zinc-400 block mb-1">صافي المساهمة في الأرباح</span>
            <div className="text-xl font-black text-emerald-400">{formatCurrency(totalProfitSum)}</div>
            <span className="text-[10px] text-zinc-500">صافي الأرباح المحققة بعد الخصم والتكلفة</span>
          </Card>
        </div>

        {/* Search & Internal Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A]">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="بحث في العمليات (الاسم، الهاتف، كود المرجع، اللعبة، الباقة)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs font-bold rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 pr-8 text-zinc-900 dark:text-zinc-100 outline-none focus:border-orange-500"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <select
              value={selectedDeptFilter}
              onChange={e => setSelectedDeptFilter(e.target.value)}
              className="text-xs font-bold rounded-xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="all">كل الأقسام</option>
              <option value="customers">الزبائن</option>
              <option value="dealers">التجار</option>
              <option value="middleman">الوساطة</option>
              <option value="subscriptions">الاشتراكات</option>
              <option value="treasury">الخزينة</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            تصدير CSV
          </Button>
        </div>

        {/* Transactions Table */}
        <div className="rounded-2xl border border-gray-200 dark:border-[#27272A] overflow-hidden">
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100 dark:divide-[#27272A]">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-100 dark:bg-[#18181B] text-zinc-400 sticky top-0 z-10 text-[11px] font-bold">
                <tr>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">القسم والنوع</th>
                  <th className="p-3">المرجع والخدمة</th>
                  <th className="p-3">الطرف المرتبط</th>
                  <th className="p-3 text-left">قيمة العملية</th>
                  <th className="p-3 text-left">صافي الربح</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]/60 font-medium">
                {targetTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-400">
                      لا توجد عمليات تطابق هذا المؤشر والبحث الحالي
                    </td>
                  </tr>
                ) : (
                  targetTransactions.map(tx => (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="p-3 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          {getDepartmentBadge(tx.department)}
                          <span className="text-[10px] text-zinc-400">{tx.typeLabelArabic}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-orange-400 text-xs">
                            {tx.referenceNumber || tx.referenceId || '-'}
                          </span>
                          {tx.gameName && (
                            <span className="text-[10px] text-zinc-300 flex items-center gap-1">
                              🎮 {tx.gameName}
                            </span>
                          )}
                          {tx.planName && (
                            <span className="text-[10px] text-pink-400 flex items-center gap-1">
                              💎 {tx.planName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                            {tx.partyName || 'غير محدد'}
                          </span>
                          {tx.partyPhone && (
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {tx.partyPhone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-left whitespace-nowrap">
                        <span className="font-black text-zinc-900 dark:text-zinc-100 font-mono">
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="p-3 text-left whitespace-nowrap">
                        <span
                          className={`font-black font-mono ${
                            (tx.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {(tx.netProfit || 0) >= 0 ? '+' : ''}
                          {formatCurrency(tx.netProfit || 0)}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            tx.status === 'completed'
                              ? 'success'
                              : tx.status === 'refunded'
                              ? 'danger'
                              : tx.status === 'canceled'
                              ? 'default'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {tx.status === 'completed'
                            ? 'مكتملة'
                            : tx.status === 'refunded'
                            ? 'مستردة'
                            : tx.status === 'canceled'
                            ? 'ملغاة'
                            : 'معلقة'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
