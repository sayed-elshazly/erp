import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Expense, ExpenseCategory } from '../../types/finance.types';
import { SearchableSelect, SearchableSelectOption } from '../../components/common/SearchableSelect';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import {
  Receipt,
  Plus,
  Download,
  Search,
  CheckCircle2,
  Trash2,
  Wallet,
  TrendingDown,
  Building,
  Tag
} from 'lucide-react';

interface FinanceExpensesProps {
  expenses: Expense[];
  onOpenExpenseModal: () => void;
  onDeleteExpense?: (id: string) => void;
}

export const FinanceExpenses: React.FC<FinanceExpensesProps> = ({
  expenses,
  onOpenExpenseModal,
  onDeleteExpense
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categoriesMap: Record<ExpenseCategory, { label: string; color: string }> = {
    rent: { label: 'إيجارات ومقرات', color: 'bg-purple-500/15 text-purple-400' },
    utilities: { label: 'مرافق وكهرباء وإنترنت', color: 'bg-blue-500/15 text-blue-400' },
    salaries: { label: 'رواتب وأجور إدارية', color: 'bg-emerald-500/15 text-emerald-400' },
    marketing: { label: 'إعلانات وتسويق', color: 'bg-amber-500/15 text-amber-400' },
    operations: { label: 'مصروفات تشغيلية وسيرفرات', color: 'bg-cyan-500/15 text-cyan-400' },
    maintenance: { label: 'صيانة وتطوير أجهزة', color: 'bg-orange-500/15 text-orange-400' },
    supplies: { label: 'مستلزمات مكتبية وبوفيه', color: 'bg-rose-500/15 text-rose-400' },
    other: { label: 'مصروفات متنوعة', color: 'bg-zinc-500/15 text-zinc-400' }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (e.isArchived) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesApproved = e.approvedBy.toLowerCase().includes(q);
        const matchesReceipt = e.receiptNumber ? e.receiptNumber.toLowerCase().includes(q) : false;
        const matchesAmount = e.amount.toString().includes(q);
        const matchesNotes = e.notes ? e.notes.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesApproved && !matchesReceipt && !matchesAmount && !matchesNotes) {
          return false;
        }
      }
      return true;
    });
  }, [expenses, categoryFilter, searchQuery]);

  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleExport = () => {
    const data = filteredExpenses.map(e => ({
      'التاريخ': e.date || formatDateTime(e.createdAt),
      'البند': e.title,
      'التصنيف': categoriesMap[e.category]?.label || e.category,
      'المبلغ (ج.م)': e.amount,
      'طريقة الدفع': e.paidFromVault ? 'نقدية من الخزنة' : e.paymentMethod || 'محفظة',
      'المعتمد': e.approvedBy,
      'رقم الإيصال': e.receiptNumber || '-',
      'الملاحظات': e.notes || '-'
    }));
    exportToExcel(data, `سجل_المصروفات_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 md:col-span-2 relative overflow-hidden bg-gradient-to-br from-rose-500/15 via-red-500/5 to-transparent border-rose-500/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/30">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    المصروفات التشغيلية والبنود (Operational Expenses)
                  </h2>
                  <span className="text-xs text-zinc-400">
                    توثيق كافة المصروفات اليومية والشهرية واعتمادها في الدفاتر المحاسبية
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-zinc-400 block font-bold">إجمالي المصروفات الحالية:</span>
                <span className="text-3xl font-black text-rose-500 tracking-tight block mt-1">
                  {formatCurrency(totalExpenseAmount, 'EGP')}
                </span>
              </div>
            </div>

            <div>
              <Button
                variant="primary"
                onClick={onOpenExpenseModal}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-4 cursor-pointer"
                icon={<Plus className="w-4 h-4" />}
              >
                تسجيل بند مصروف جديد
              </Button>
            </div>
          </div>
        </Card>

        {/* Quick Summary Card */}
        <Card className="p-5 flex flex-col justify-between border-gray-200 dark:border-[#27272A]">
          <div>
            <span className="text-xs font-bold text-zinc-400 block">عدد بنود المصروفات:</span>
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 block mt-1">
              {filteredExpenses.length} بند
            </span>
          </div>
          <div className="pt-3 border-t border-gray-100 dark:border-[#27272A] space-y-1.5 text-xs text-zinc-400">
            <div className="flex justify-between">
              <span>مدفوع من الخزنة:</span>
              <strong className="text-zinc-900 dark:text-zinc-200">
                {filteredExpenses.filter(e => e.paidFromVault).length}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>مدفوع من محافظ / بنك:</span>
              <strong className="text-zinc-900 dark:text-zinc-200">
                {filteredExpenses.filter(e => !e.paidFromVault).length}
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
              placeholder="بحث في المصروفات: البند، المعتمد، الإيصال، المبلغ، الملاحظات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 pr-8 text-zinc-900 dark:text-zinc-100 outline-none focus:border-rose-500"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="md:col-span-3">
            <SearchableSelect
              options={Object.entries(categoriesMap).map(([key, info]) => ({
                value: key,
                label: info.label,
                icon: <Tag className="w-3.5 h-3.5 text-rose-400" />
              }))}
              value={categoryFilter}
              onChange={setCategoryFilter}
              allOptionLabel="جميع التصنيفات"
              searchPlaceholder="بحث في تصنيفات المصروفات..."
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

      {/* Expenses Table */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-rose-500" />
            سجل قيود المصروفات (Expenses Ledger)
          </h3>
          <span className="text-xs text-zinc-400 font-bold">
            عدد البنود: {filteredExpenses.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
          <table className="w-full text-xs text-right">
            <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
              <tr>
                <th className="p-3">التاريخ</th>
                <th className="p-3">بند المصروف</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">طريقة الدفع</th>
                <th className="p-3">رقم الإيصال</th>
                <th className="p-3">المعتمد</th>
                <th className="p-3">ملاحظات</th>
                {onDeleteExpense && <th className="p-3 text-center">إجراء</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-400">
                    لا توجد مصروفات مسجلة مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => {
                  const cat = categoriesMap[exp.category] || { label: exp.category, color: 'bg-zinc-500/10 text-zinc-400' };
                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors"
                    >
                      <td className="p-3 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {exp.date || formatDateTime(exp.createdAt)}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 flex-wrap">
                          <span>{exp.title}</span>
                          {(exp.receiptNumber?.startsWith('REW-') || exp.title.includes('مكافأة مسابقة')) && (
                            <Badge variant="warning" size="sm">🎯 مكافأة مسابقة</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${cat.color}`}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="p-3 font-black text-rose-500 whitespace-nowrap">
                        -{formatCurrency(exp.amount, 'EGP')}
                      </td>
                      <td className="p-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {exp.paidFromVault ? (
                          <span className="flex items-center gap-1 text-emerald-500">
                            <Wallet className="w-3 h-3" /> نقدية من الخزنة
                          </span>
                        ) : (
                          <span>{exp.paymentMethod || 'محفظة إلكترونية'}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                        {exp.receiptNumber || '-'}
                      </td>
                      <td className="p-3 text-zinc-400 whitespace-nowrap">
                        👤 {exp.approvedBy}
                      </td>
                      <td className="p-3 text-zinc-400 max-w-[150px] truncate">
                        {exp.notes || '-'}
                      </td>
                      {onDeleteExpense && (
                        <td className="p-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(exp.id)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="حذف المصروف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
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
