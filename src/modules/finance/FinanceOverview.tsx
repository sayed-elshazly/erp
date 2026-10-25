import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { UnifiedFinanceFilterBar } from '../../components/common/UnifiedFinanceFilterBar';
import {
  UnifiedFinanceFilter,
  UnifiedFinancialTransaction,
  FinanceMetrics
} from '../../types/finance.types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import {
  TrendingUp,
  DollarSign,
  Wallet,
  Scale,
  Receipt,
  Download,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  Layers,
  Sparkles,
  CreditCard
} from 'lucide-react';

interface FinanceOverviewProps {
  metrics: FinanceMetrics | null;
  transactions: UnifiedFinancialTransaction[];
  filter: UnifiedFinanceFilter;
  onFilterChange: (newFilter: UnifiedFinanceFilter) => void;
  onOpenVaultModal: (type: 'cash_in' | 'cash_out') => void;
  onOpenExpenseModal: () => void;
  onOpenDebtModal: () => void;
  onOpenDepositVoucher: () => void;
  onOpenReportModal: () => void;
}

export const FinanceOverview: React.FC<FinanceOverviewProps> = ({
  metrics,
  transactions,
  filter,
  onFilterChange,
  onOpenVaultModal,
  onOpenExpenseModal,
  onOpenDebtModal,
  onOpenDepositVoucher,
  onOpenReportModal
}) => {
  const [selectedTx, setSelectedTx] = useState<UnifiedFinancialTransaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, currentPage]);

  const totalPages = Math.ceil(transactions.length / pageSize) || 1;

  const handleExport = () => {
    const data = transactions.map(t => ({
      'التاريخ': formatDateTime(t.createdAt),
      'القسم': t.departmentNameArabic,
      'نوع المعاملة': t.typeLabelArabic,
      'المبلغ (ج.م)': t.amount,
      'التكلفة': t.costAmount || 0,
      'صافي الربح': t.netProfit || 0,
      'الطرف / العميل': t.partyName || '-',
      'المحفظة / الحساب': t.walletName || '-',
      'رقم المرجع': t.referenceNumber || t.referenceId || '-',
      'المنفذ': t.performedBy?.name || '-',
      'الحالة': t.status,
      'البيان': t.description
    }));
    exportToExcel(data, `سجل_المالية_الموحد_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-orange-500/20">
        <div>
          <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            لوحة القيادة المالية والمركز المالي الشامل
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            سجل مالي موحد يربط حركة الزبائن، التجار، الوسطاء، الاشتراكات، المحافظ، والخزينة لحظة بلحظة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDepositVoucher}
            className="text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
            icon={<CreditCard className="w-3.5 h-3.5" />}
          >
            سند إيداع معتمد
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenVaultModal('cash_in')}
            className="text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
            icon={<ArrowDownLeft className="w-3.5 h-3.5" />}
          >
            إيداع بالخزنة
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenVaultModal('cash_out')}
            className="text-xs border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
            icon={<ArrowUpRight className="w-3.5 h-3.5" />}
          >
            سحب من الخزنة
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenExpenseModal}
            className="text-xs border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
            icon={<Receipt className="w-3.5 h-3.5" />}
          >
            تسجيل مصروف
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDebtModal}
            className="text-xs border-purple-500/30 text-purple-500 hover:bg-purple-500/10 cursor-pointer"
            icon={<Scale className="w-3.5 h-3.5" />}
          >
            إضافة دين / مستحق
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenReportModal}
            className="text-xs bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            توليد تقرير رسمي
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Net Profit */}
          <Card className="p-3.5 relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-bold">صافي الأرباح</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg font-black text-emerald-500">
              {formatCurrency(metrics.netProfit, 'EGP')}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
              <span>إجمالي: {formatCurrency(metrics.grossProfit, 'EGP')}</span>
            </div>
          </Card>

          {/* Revenue */}
          <Card className="p-3.5 relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-bold">الإيرادات المجمعة</span>
              <DollarSign className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-lg font-black text-blue-500">
              {formatCurrency(metrics.totalRevenue, 'EGP')}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              {metrics.totalOperationsCount || 0} عملية مسجلة
            </div>
          </Card>

          {/* Vault Balance */}
          <Card className="p-3.5 relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-bold">رصيد الخزينة</span>
              <Wallet className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-lg font-black text-amber-500">
              {formatCurrency(metrics.vaultBalance, 'EGP')}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">نقدية جاهزة بالصندوق</div>
          </Card>

          {/* Wallets Balance */}
          <Card className="p-3.5 relative overflow-hidden border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-bold">أرصدة المحافظ والبنوك</span>
              <CreditCard className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="text-lg font-black text-cyan-500">
              {formatCurrency(metrics.totalWalletsBalance || 0, 'EGP')}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">فودافون كاش، إنستاباي، بنوك</div>
          </Card>

          {/* Expenses */}
          <Card className="p-3.5 relative overflow-hidden border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-bold">المصروفات التشغيلية</span>
              <Receipt className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-lg font-black text-rose-500">
              {formatCurrency(metrics.monthlyExpenses, 'EGP')}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">إيجارات، مرتبات، خدمات</div>
          </Card>

          {/* Debts Net */}
          <Card className="p-3.5 relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-bold">الديون (لنا / علينا)</span>
              <Scale className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-sm font-black text-emerald-400">
              لنا: {formatCurrency(metrics.totalDebtsReceivable, 'EGP')}
            </div>
            <div className="text-[11px] font-black text-rose-400 mt-0.5">
              علينا: {formatCurrency(metrics.totalDebtsPayable, 'EGP')}
            </div>
          </Card>
        </div>
      )}

      {/* Department Breakdown Cards */}
      {metrics?.departmentBreakdowns && metrics.departmentBreakdowns.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.departmentBreakdowns.map(dept => (
            <Card key={dept.departmentId} className="p-3.5 relative overflow-hidden border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">{dept.departmentName}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${dept.badge}`}>
                  {dept.transactionsCount} عملية
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block">الإيراد:</span>
                  <strong className="text-zinc-900 dark:text-zinc-200 font-bold">{formatCurrency(dept.revenue, 'EGP')}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block">الربح الصافي:</span>
                  <strong className="text-emerald-500 font-bold">{formatCurrency(dept.netProfit, 'EGP')}</strong>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-[#27272A]/50 flex items-center justify-between text-[10px] text-zinc-400">
                <span>نسبة الربح من الإجمالي:</span>
                <span className="font-black text-orange-500">{dept.percentageOfTotalProfit}%</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Filter Toolbar */}
      <UnifiedFinanceFilterBar
        filter={filter}
        onChange={onFilterChange}
        onReset={() =>
          onFilterChange({
            datePreset: 'all',
            customStartDate: '',
            customEndDate: '',
            department: 'all',
            gameName: 'all',
            planId: 'all',
            personQuery: '',
            searchQuery: '',
            employeeId: 'all',
            transactionType: 'all',
            walletId: 'all',
            status: 'all'
          })
        }
      />

      {/* Unified Transactions Table */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              سجل المعاملات المالي الموحد (دفتر الأستاذ العام)
            </h3>
            <span className="text-xs text-zinc-400">
              إجمالي النتائج المطابقة: <strong className="text-orange-500 font-black">{transactions.length}</strong> حركة مالية
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExport}
              className="text-xs cursor-pointer"
            >
              تصدير لـ Excel
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
          <table className="w-full text-xs text-right">
            <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
              <tr>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3">القسم / الوحدة</th>
                <th className="p-3">نوع المعاملة</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">صافي الربح</th>
                <th className="p-3">الطرف / العميل</th>
                <th className="p-3">المحفظة / الحساب</th>
                <th className="p-3">رقم المرجع</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400">
                    لا توجد حركات مالية مطابقة للفلاتر المحددة
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map(tx => {
                  const isRefund = tx.type === 'refund' || tx.status === 'refunded';
                  const isExpense = tx.type === 'expense' || tx.type === 'wallet_withdrawal';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors"
                    >
                      <td className="p-3 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-200 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-[#202024] text-[10px] border border-gray-200 dark:border-[#2E2E32]">
                          {tx.departmentNameArabic}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {tx.typeLabelArabic}
                        </span>
                      </td>
                      <td className="p-3 font-black whitespace-nowrap">
                        <span
                          className={
                            isRefund || isExpense
                              ? 'text-rose-500'
                              : 'text-emerald-500'
                          }
                        >
                          {isRefund || isExpense ? '-' : '+'}
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td className="p-3 font-bold whitespace-nowrap">
                        {tx.netProfit !== undefined ? (
                          <span
                            className={
                              tx.netProfit > 0
                                ? 'text-emerald-400'
                                : tx.netProfit < 0
                                ? 'text-rose-400'
                                : 'text-zinc-400'
                            }
                          >
                            {tx.netProfit > 0 ? '+' : ''}
                            {formatCurrency(tx.netProfit, tx.currency)}
                          </span>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="p-3 text-zinc-800 dark:text-zinc-200 max-w-[150px] truncate">
                        {tx.partyName || tx.partyPhone || '-'}
                      </td>
                      <td className="p-3 text-zinc-400 text-[11px] whitespace-nowrap">
                        {tx.walletName || '-'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                        {tx.referenceNumber || tx.referenceId || '-'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant={
                            tx.status === 'completed'
                              ? 'success'
                              : tx.status === 'refunded'
                              ? 'danger'
                              : tx.status === 'pending'
                              ? 'warning'
                              : 'default'
                          }
                          className="text-[10px]"
                        >
                          {tx.status === 'completed'
                            ? 'مكتمل'
                            : tx.status === 'refunded'
                            ? 'مسترد'
                            : tx.status === 'pending'
                            ? 'معلق'
                            : 'ملغي'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedTx(tx)}
                          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#27272A] text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-zinc-400">
              صفحة {currentPage} من {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="text-xs h-7 px-2.5 cursor-pointer"
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="text-xs h-7 px-2.5 cursor-pointer"
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <Modal
          isOpen={Boolean(selectedTx)}
          onClose={() => setSelectedTx(null)}
          title="تفاصيل المعاملة المالية"
          subtitle={selectedTx.id}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-right">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-2.5">
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#27272A]/50">
                <span className="text-zinc-400">القسم:</span>
                <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{selectedTx.departmentNameArabic}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#27272A]/50">
                <span className="text-zinc-400">نوع العملية:</span>
                <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{selectedTx.typeLabelArabic}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#27272A]/50">
                <span className="text-zinc-400">المبلغ:</span>
                <strong className="text-emerald-500 font-black text-sm">
                  {formatCurrency(selectedTx.amount, selectedTx.currency)}
                </strong>
              </div>
              {selectedTx.costAmount !== undefined && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#27272A]/50">
                  <span className="text-zinc-400">التكلفة:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{formatCurrency(selectedTx.costAmount, selectedTx.currency)}</strong>
                </div>
              )}
              {selectedTx.netProfit !== undefined && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#27272A]/50">
                  <span className="text-zinc-400">صافي الربح:</span>
                  <strong className={selectedTx.netProfit >= 0 ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                    {formatCurrency(selectedTx.netProfit, selectedTx.currency)}
                  </strong>
                </div>
              )}
              {selectedTx.walletName && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#27272A]/50">
                  <span className="text-zinc-400">المحفظة / الحساب:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{selectedTx.walletName}</strong>
                </div>
              )}
              {selectedTx.partyName && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#27272A]/50">
                  <span className="text-zinc-400">الطرف / العميل:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{selectedTx.partyName}</strong>
                </div>
              )}
              {selectedTx.referenceNumber && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#27272A]/50">
                  <span className="text-zinc-400">رقم المرجع:</span>
                  <strong className="font-mono text-zinc-800 dark:text-zinc-200">{selectedTx.referenceNumber}</strong>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#27272A]/50">
                <span className="text-zinc-400">التاريخ:</span>
                <span className="font-mono text-zinc-400">{formatDateTime(selectedTx.createdAt)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-[#27272A]/50">
                <span className="text-zinc-400">المنفذ:</span>
                <span className="text-zinc-300">{selectedTx.performedBy?.name || '-'}</span>
              </div>
              {selectedTx.description && (
                <div className="pt-2">
                  <span className="text-zinc-400 block mb-1">البيان:</span>
                  <p className="p-2 rounded-lg bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272A] text-zinc-800 dark:text-zinc-200">
                    {selectedTx.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedTx(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
