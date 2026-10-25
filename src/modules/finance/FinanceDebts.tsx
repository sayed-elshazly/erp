import React, { useState, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Debt, DebtInstallment, DebtType, DebtPartyType } from '../../types/finance.types';
import { SearchableSelect, SearchableSelectOption } from '../../components/common/SearchableSelect';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import {
  Scale,
  Plus,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  User
} from 'lucide-react';

interface FinanceDebtsProps {
  debts: Debt[];
  onOpenAddDebtModal: () => void;
  onRecordPayment: (debtId: string, amount: number, notes?: string) => void;
}

export const FinanceDebts: React.FC<FinanceDebtsProps> = ({
  debts,
  onOpenAddDebtModal,
  onRecordPayment
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debtTypeFilter, setDebtTypeFilter] = useState<string>('all'); // all | receivable | payable
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Payment Modal State
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Installments View Modal
  const [selectedDebtForInstallments, setSelectedDebtForInstallments] = useState<Debt | null>(null);

  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      if (d.isArchived) return false;
      if (debtTypeFilter !== 'all' && d.debtType !== debtTypeFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = d.partyName.toLowerCase().includes(q);
        const matchesPhone = d.partyPhone ? d.partyPhone.includes(q) : false;
        const matchesNotes = d.notes ? d.notes.toLowerCase().includes(q) : false;
        const matchesAmount = d.remainingAmount.toString().includes(q);
        if (!matchesName && !matchesPhone && !matchesNotes && !matchesAmount) return false;
      }
      return true;
    });
  }, [debts, debtTypeFilter, statusFilter, searchQuery]);

  const totalReceivable = useMemo(() => {
    return debts.filter(d => d.debtType === 'receivable' && !d.isArchived).reduce((sum, d) => sum + d.remainingAmount, 0);
  }, [debts]);

  const totalPayable = useMemo(() => {
    return debts.filter(d => d.debtType === 'payable' && !d.isArchived).reduce((sum, d) => sum + d.remainingAmount, 0);
  }, [debts]);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForPayment) return;
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0 || amt > selectedDebtForPayment.remainingAmount) {
      alert('يرجى إدخال مبلغ سداد صحيح لا يتجاوز المبلغ المتبقي');
      return;
    }
    onRecordPayment(selectedDebtForPayment.id, amt, paymentNotes.trim() || undefined);
    setSelectedDebtForPayment(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleExport = () => {
    const data = filteredDebts.map(d => ({
      'الطرف': d.partyName,
      'الهاتف': d.partyPhone || '-',
      'نوع الدين': d.debtType === 'receivable' ? 'لنا (مستحق)' : 'علينا (التزام)',
      'إجمالي المبلغ': d.totalAmount,
      'المسدد': d.paidAmount,
      'المتبقي': d.remainingAmount,
      'تاريخ الاستحقاق': d.dueDate || '-',
      'الحالة': d.status,
      'الملاحظات': d.notes || '-'
    }));
    exportToExcel(data, `سجل_الديون_والمستحقات_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Top Banner & Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent border-emerald-500/30">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-bold">إجمالي المستحقات لنا (Receivables):</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(totalReceivable, 'EGP')}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            أموال ومستحقات على العملاء والتجار
          </span>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-rose-500/15 via-red-500/5 to-transparent border-rose-500/30">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-bold">إجمالي الالتزامات علينا (Payables):</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {formatCurrency(totalPayable, 'EGP')}
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            ديون ومستحقات للموردين والجهات الخارجية
          </span>
        </Card>

        <Card className="p-5 flex flex-col justify-between border-gray-200 dark:border-[#27272A]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400">عدد سجلات الديون:</span>
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAddDebtModal}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
            >
              تسجيل دين جديد
            </Button>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              {filteredDebts.length} سجل مالي
            </span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <input
              type="text"
              placeholder="بحث في الديون: اسم الطرف، الهاتف، الملاحظات، المبلغ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 pr-8 text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-500"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="md:col-span-3">
            <SearchableSelect
              options={[
                { value: 'receivable', label: 'لنا (مستحقات على الغير)', icon: <span className="text-xs">🟢</span> },
                { value: 'payable', label: 'علينا (التزامات للغير)', icon: <span className="text-xs">🔴</span> }
              ]}
              value={debtTypeFilter}
              onChange={setDebtTypeFilter}
              allOptionLabel="جميع الديون (لنا وعلينا)"
              searchPlaceholder="بحث في نوع الدين..."
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

      {/* Debts Table */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-500" />
            سجل الديون والمستحقات والأقساط (Debts Ledger)
          </h3>
          <span className="text-xs text-zinc-400 font-bold">
            عدد السجلات: {filteredDebts.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
          <table className="w-full text-xs text-right">
            <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
              <tr>
                <th className="p-3">الطرف / العميل</th>
                <th className="p-3">نوع الدين</th>
                <th className="p-3">إجمالي الدين</th>
                <th className="p-3">المسدد</th>
                <th className="p-3">المتبقي</th>
                <th className="p-3">تاريخ الاستحقاق</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-400">
                    لا توجد ديون مسجلة مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredDebts.map(debt => {
                  const isReceivable = debt.debtType === 'receivable';
                  const isFullyPaid = debt.remainingAmount <= 0;

                  return (
                    <tr
                      key={debt.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{debt.partyName}</div>
                        {debt.partyPhone && (
                          <span className="text-[10px] text-zinc-400 font-mono">{debt.partyPhone}</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant={isReceivable ? 'success' : 'danger'}
                          className="text-[10px]"
                        >
                          {isReceivable ? '🟢 لنا (مستحق)' : '🔴 علينا (التزام)'}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {formatCurrency(debt.totalAmount, 'EGP')}
                      </td>
                      <td className="p-3 text-emerald-500 font-bold whitespace-nowrap">
                        {formatCurrency(debt.paidAmount, 'EGP')}
                      </td>
                      <td className="p-3 font-black text-rose-500 whitespace-nowrap">
                        {formatCurrency(debt.remainingAmount, 'EGP')}
                      </td>
                      <td className="p-3 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {debt.dueDate ? formatDate(debt.dueDate) : '-'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant={isFullyPaid ? 'success' : debt.status === 'partially_paid' ? 'warning' : 'danger'}
                          className="text-[10px]"
                        >
                          {isFullyPaid ? 'مسدد بالكامل' : debt.status === 'partially_paid' ? 'مسدد جزئياً' : 'غير مسدد'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isFullyPaid && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDebtForPayment(debt);
                                setPaymentAmount(debt.remainingAmount.toString());
                              }}
                              className="text-[10px] h-7 px-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                            >
                              سداد دفعة
                            </Button>
                          )}
                          {debt.installments && debt.installments.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedDebtForInstallments(debt)}
                              className="text-[10px] h-7 px-2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                            >
                              الأقساط ({debt.installments.length})
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Payment Modal */}
      {selectedDebtForPayment && (
        <Modal
          isOpen={Boolean(selectedDebtForPayment)}
          onClose={() => setSelectedDebtForPayment(null)}
          title="💳 تسجيل دفعة سداد دين"
          subtitle={`الطرف: ${selectedDebtForPayment.partyName} (المتبقي: ${formatCurrency(selectedDebtForPayment.remainingAmount, 'EGP')})`}
          maxWidth="sm"
        >
          <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs text-right">
            <div>
              <label className="block font-bold text-zinc-400 mb-1">المبلغ المراد سداده (ج.م) *</label>
              <input
                type="number"
                step="any"
                max={selectedDebtForPayment.remainingAmount}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                required
                autoFocus
                className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-400 mb-1">ملاحظات السداد / رقم الإيصال</label>
              <input
                type="text"
                placeholder="مثال: تحويل إنستاباي، سداد نقدي..."
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                className="w-full text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A]">
              <Button variant="outline" type="button" onClick={() => setSelectedDebtForPayment(null)}>
                إلغاء
              </Button>
              <Button variant="primary" type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                تأكيد وقيد السداد
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Installments History Modal */}
      {selectedDebtForInstallments && (
        <Modal
          isOpen={Boolean(selectedDebtForInstallments)}
          onClose={() => setSelectedDebtForInstallments(null)}
          title="سجل دفعات وأقساط الدين"
          subtitle={`الطرف: ${selectedDebtForInstallments.partyName}`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs text-right">
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
              <table className="w-full text-xs text-right">
                <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                  <tr>
                    <th className="p-2.5">تاريخ الدفعة</th>
                    <th className="p-2.5">المبلغ المسدد</th>
                    <th className="p-2.5">المستلم / المنفذ</th>
                    <th className="p-2.5">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                  {selectedDebtForInstallments.installments.map(inst => (
                    <tr key={inst.id}>
                      <td className="p-2.5 font-mono text-zinc-400">{formatDate(inst.paymentDate)}</td>
                      <td className="p-2.5 font-bold text-emerald-500">{formatCurrency(inst.amount, 'EGP')}</td>
                      <td className="p-2.5 text-zinc-300">{inst.paidBy}</td>
                      <td className="p-2.5 text-zinc-400">{inst.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedDebtForInstallments(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
