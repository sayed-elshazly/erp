import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { SafeTransaction, SafeCategory } from '../../types/finance.types';
import { SearchableSelect, SearchableSelectOption } from '../../components/common/SearchableSelect';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Download,
  Search,
  CheckCircle2,
  ShieldCheck,
  Receipt,
  FileText
} from 'lucide-react';

interface FinanceVaultProps {
  vaultBalance: number;
  transactions: SafeTransaction[];
  onOpenVaultModal: (type: 'cash_in' | 'cash_out') => void;
  onRefresh?: () => void;
}

export const FinanceVault: React.FC<FinanceVaultProps> = ({
  vaultBalance,
  transactions,
  onOpenVaultModal,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTxForPrint, setSelectedTxForPrint] = useState<SafeTransaction | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(q);
        const matchesUser = tx.performedBy.toLowerCase().includes(q);
        const matchesRef = tx.referenceId ? tx.referenceId.toLowerCase().includes(q) : false;
        const matchesAmount = tx.amount.toString().includes(q);
        if (!matchesDesc && !matchesUser && !matchesRef && !matchesAmount) return false;
      }
      return true;
    });
  }, [transactions, categoryFilter, typeFilter, searchQuery]);

  const handleExport = () => {
    const data = filteredTransactions.map(tx => ({
      'التاريخ': formatDateTime(tx.createdAt),
      'نوع الحركة': tx.type === 'cash_in' ? 'إيداع نقدي' : tx.type === 'transfer' ? 'تحويل' : 'سحب نقدي',
      'المبلغ (ج.م)': tx.amount,
      'الرصيد بعد الحركة': tx.balanceAfter,
      'التصنيف': tx.category,
      'البيان': tx.description,
      'المنفذ': tx.performedBy,
      'المرجع': tx.referenceId || '-'
    }));
    exportToExcel(data, `حركات_الخزينة_${new Date().toISOString().split('T')[0]}`);
  };

  const getCategoryLabel = (cat: SafeCategory) => {
    const map: Record<SafeCategory, string> = {
      sales: 'مبيعات نقدية',
      customer_deposit: 'إيداع زبون',
      merchant_settlement: 'تسوية تجار',
      capital: 'رأس مال / تمويل',
      expense: 'مصروفات',
      refund: 'استرداد نقدي',
      salary: 'مرتبات وأجور',
      commission: 'عمولات',
      cashback: 'كاش باك',
      debt_payment: 'سداد دين',
      middleman_commission: 'عمولة وساطة',
      middleman_payout: 'تسليم وساطة',
      account_purchase: 'شراء حساب',
      account_sale: 'بيع حساب',
      subscription_sale: 'بيع اشتراك',
      subscription_renewal: 'تجديد اشتراك',
      subscription_refund: 'استرداد اشتراك',
      currency_exchange: 'صرافة وتبديل عملات',
      shift_settlement: 'تصفية وردية للخزنة',
      wallet_transfer: 'تحويل محفظة',
      other: 'أخرى'
    };
    return map[cat] || cat;
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Top Banner & Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 md:col-span-2 relative overflow-hidden bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    الخزينة الرئيسية والسيولة النقدية المتاحة (Cash Safe Vault)
                  </h2>
                  <span className="text-xs text-zinc-400">
                    الصندوق المركزي للنقدية بالفرع الرئيسي
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-zinc-400 block font-bold">الرصيد الفعلي الجاهز حالياً:</span>
                <span className="text-3xl font-black text-emerald-500 tracking-tight block mt-1">
                  {formatCurrency(vaultBalance, 'EGP')}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Button
                variant="primary"
                onClick={() => onOpenVaultModal('cash_in')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 cursor-pointer"
                icon={<ArrowDownLeft className="w-4 h-4" />}
              >
                إيداع نقدية بالخزنة
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenVaultModal('cash_out')}
                className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10 font-bold text-xs h-9 px-4 cursor-pointer"
                icon={<ArrowUpRight className="w-4 h-4" />}
              >
                سحب نقدية من الخزنة
              </Button>
            </div>
          </div>
        </Card>

        {/* Quick Stats Card */}
        <Card className="p-5 flex flex-col justify-between border-gray-200 dark:border-[#27272A]">
          <div>
            <span className="text-xs font-bold text-zinc-400 block">إجمالي الحركات المسجلة:</span>
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 block mt-1">
              {transactions.length} حركة
            </span>
          </div>
          <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">إجمالي الإيداعات:</span>
              <strong className="text-emerald-500 font-black">
                {formatCurrency(
                  transactions.filter(t => t.type === 'cash_in').reduce((acc, t) => acc + t.amount, 0),
                  'EGP'
                )}
              </strong>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">إجمالي السحوبات:</span>
              <strong className="text-rose-500 font-black">
                {formatCurrency(
                  transactions.filter(t => t.type === 'cash_out').reduce((acc, t) => acc + t.amount, 0),
                  'EGP'
                )}
              </strong>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <input
              type="text"
              placeholder="بحث في حركات الخزنة: البيان، الموظف، المرجع، المبلغ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 pr-8 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="md:col-span-3">
            <SearchableSelect
              options={[
                { value: 'cash_in', label: 'إيداعات فقط', icon: <span className="text-xs">📥</span> },
                { value: 'cash_out', label: 'سحوبات فقط', icon: <span className="text-xs">📤</span> },
                { value: 'transfer', label: 'تحويلات فقط', icon: <span className="text-xs">🔄</span> }
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
              allOptionLabel="جميع الحركات (إيداع وسحب)"
              searchPlaceholder="بحث في نوع الحركة..."
            />
          </div>

          <div className="md:col-span-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExport}
              className="text-xs w-full h-9 cursor-pointer"
            >
              تصدير لـ Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-500" />
            دفتر حركة الخزنة النقدية (Safe Transactions Log)
          </h3>
          <span className="text-xs text-zinc-400 font-bold">
            عدد الحركات: {filteredTransactions.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
          <table className="w-full text-xs text-right">
            <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
              <tr>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3">نوع الحركة</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">الرصيد بعد الحركة</th>
                <th className="p-3">البيان والملاحظات</th>
                <th className="p-3">المسؤول / الموظف</th>
                <th className="p-3 text-center">إيصال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-400">
                    لا توجد حركات نقدية مسجلة بالخزنة
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const isCashIn = tx.type === 'cash_in';
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors"
                    >
                      <td className="p-3 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant={isCashIn ? 'success' : tx.type === 'transfer' ? 'warning' : 'danger'}
                          className="text-[10px]"
                        >
                          {isCashIn ? '📥 إيداع نقدية' : tx.type === 'transfer' ? '🔄 تحويل' : '📤 سحب نقدية'}
                        </Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {getCategoryLabel(tx.category)}
                        </span>
                      </td>
                      <td className="p-3 font-black whitespace-nowrap">
                        <span className={isCashIn ? 'text-emerald-500' : 'text-rose-500'}>
                          {isCashIn ? '+' : '-'}
                          {formatCurrency(tx.amount, 'EGP')}
                        </span>
                      </td>
                      <td className="p-3 font-black text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {formatCurrency(tx.balanceAfter, 'EGP')}
                      </td>
                      <td className="p-3 text-zinc-800 dark:text-zinc-200 max-w-[200px] truncate">
                        {tx.description}
                      </td>
                      <td className="p-3 text-zinc-400 text-[11px] whitespace-nowrap">
                        👤 {tx.performedBy}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedTxForPrint(tx)}
                          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#27272A] text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                          title="طباعة إيصال الصندوق"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Printable Receipt Modal */}
      {selectedTxForPrint && (
        <Modal
          isOpen={Boolean(selectedTxForPrint)}
          onClose={() => setSelectedTxForPrint(null)}
          title="إيصال حركة خزينة معتمد"
          subtitle={`رقم الإيصال: ${selectedTxForPrint.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-right">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#18181B] border-2 border-dashed border-emerald-500/40 space-y-3 font-mono shadow-sm">
              <div className="flex items-center justify-between border-b pb-2 border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <strong className="text-zinc-900 dark:text-zinc-100 font-black">
                    إيصال حركة صندوق — NZM JKR
                  </strong>
                </div>
                <span className="text-zinc-400 text-[10px]">
                  {formatDateTime(selectedTxForPrint.createdAt)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-zinc-400 block text-[10px]">نوع الحركة:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100 font-bold">
                    {selectedTxForPrint.type === 'cash_in' ? 'سند قبض نقدية' : 'سند صرف نقدية'}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">المبلغ:</span>
                  <strong className="text-emerald-500 font-black text-sm">
                    {formatCurrency(selectedTxForPrint.amount, 'EGP')}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">التصنيف:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    {getCategoryLabel(selectedTxForPrint.category)}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">الرصيد بعد الحركة:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100 font-bold">
                    {formatCurrency(selectedTxForPrint.balanceAfter, 'EGP')}
                  </strong>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">البيان:</span>
                <p className="text-zinc-800 dark:text-zinc-200 mt-0.5">{selectedTxForPrint.description}</p>
              </div>

              <div className="pt-2 flex justify-between text-[10px] text-zinc-400 border-t border-gray-100 dark:border-zinc-800">
                <span>المستلم / المنفذ: {selectedTxForPrint.performedBy}</span>
                <span>توقيع المدير: __________________</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="primary"
                onClick={() => window.print()}
                icon={<Printer className="w-3.5 h-3.5" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                طباعة الإيصال
              </Button>
              <Button variant="outline" onClick={() => setSelectedTxForPrint(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
