import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Input } from '../common/Input';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Debt, DebtInstallment, DebtStatus } from '../../types/finance.types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import {
  Scale,
  Calendar,
  User,
  Phone,
  Clock,
  Printer,
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Receipt,
  ShieldCheck,
  Building2,
  Monitor,
  Coins,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

interface DebtProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  onDebtUpdated?: () => void;
}

export const DebtProfileModal: React.FC<DebtProfileModalProps> = ({
  isOpen,
  onClose,
  debt: initialDebt,
  onDebtUpdated
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Local state for debt to allow live refresh inside modal
  const [debt, setDebt] = useState<Debt | null>(initialDebt);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payReceipt, setPayReceipt] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('كاش (الخزنة الرئيسية)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deposit Modal state
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositReceipt, setDepositReceipt] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);

  // Keep synced with initialDebt
  React.useEffect(() => {
    if (initialDebt) {
      const refreshed = db.getDebtById(initialDebt.id) || initialDebt;
      setDebt(refreshed);
      setPayAmount(refreshed.remainingAmount);
    }
  }, [initialDebt, isOpen]);

  if (!isOpen || !debt) return null;

  const isUSD = debt.currency === 'USD';
  const progressPercent = debt.totalAmount > 0
    ? Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100))
    : 0;

  const getStatusBadge = (status: DebtStatus) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" size="sm">خالص ومسدد بالكامل (100%)</Badge>;
      case 'partially_paid':
        return <Badge variant="warning" size="sm">مسدد جزئياً ({progressPercent}%)</Badge>;
      case 'overdue':
        return <Badge variant="danger" size="sm">متأخر عن تاريخ السداد</Badge>;
      default:
        return <Badge variant="default" size="sm">غير مسدد (0%)</Badge>;
    }
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (payAmount <= 0) {
      showToast('error', 'مبلغ غير صالح', 'يرجى إدخال مبلغ سداد أكبر من الصفر');
      return;
    }

    if (payAmount > debt.remainingAmount) {
      showToast('error', 'المبلغ يتجاوز المتبقي', `أقصى مبلغ متبقي يمكن سداده هو ${formatCurrency(debt.remainingAmount)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = db.addDebtInstallment(
        debt.id,
        payAmount,
        user?.fullName || user?.username || 'المسؤول المالي',
        payReceipt.trim() || undefined,
        payNotes.trim() || undefined,
        user,
        payDate,
        paymentMethod
      );

      if (result.success && result.debt) {
        setDebt(result.debt);
        setPayAmount(result.debt.remainingAmount);
        setPayReceipt('');
        setPayNotes('');
        setIsPayModalOpen(false);
        showToast(
          'success',
          debt.debtType === 'receivable' ? 'تم تحصيل الدفعة' : 'تم سداد القسط',
          `تم تسجيل حركة بقيمة ${formatCurrency(payAmount)} وتحديث الخزنة الرئيسية`
        );
        if (onDebtUpdated) onDebtUpdated();
      }
    } catch (err: any) {
      showToast('error', 'خطأ في العملية', err.message || 'تعذر تسجيل السداد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (depositAmount <= 0) {
      showToast('error', 'مبلغ غير صالح', 'يرجى إدخال مبلغ وديعة أكبر من الصفر');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = db.addDebtDeposit(
        debt.id,
        depositAmount,
        user?.fullName || user?.username || 'المسؤول المالي',
        depositReceipt.trim() || undefined,
        depositNotes.trim() || undefined,
        user,
        depositDate
      );

      if (result.success && result.debt) {
        setDebt(result.debt);
        setDepositAmount(0);
        setDepositReceipt('');
        setDepositNotes('');
        setIsDepositModalOpen(false);
        showToast(
          'success',
          'تم إيداع الوديعة في الخزنة',
          `تم تسجيل إيداع نقدي بقيمة ${formatCurrency(depositAmount)} في الخزنة الرئيسية وتحديث الرصيد مباشرة`
        );
        if (onDebtUpdated) onDebtUpdated();
      } else {
        showToast('error', 'خطأ في العملية', result.message || 'تعذر تسجيل الوديعة');
      }
    } catch (err: any) {
      showToast('error', 'خطأ في العملية', err.message || 'تعذر تسجيل الوديعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    const installments = debt.installments || [];
    const data = installments.map((inst, idx) => ({
      '#': idx + 1,
      'التاريخ': formatDate(inst.paymentDate),
      'نوع الحركة': inst.type === 'deposit' ? 'إيداع وديعة نقدية' : debt.debtType === 'receivable' ? 'تحصيل دفعة' : 'سداد قسط',
      'المبلغ': inst.amount,
      'العملة': inst.currency || debt.currency || 'EGP',
      'المسؤول المنفذ': inst.paidBy,
      'رقم الإيصال': inst.receiptNumber || 'بدون',
      'طريقة الدفع': inst.paymentMethod || 'كاش',
      'الرصيد المتبقي بعد الحركة': inst.balanceAfter !== undefined ? inst.balanceAfter : '-',
      'ملاحظات': inst.notes || ''
    }));

    exportToExcel(data, `كشف_حساب_دين_${debt.partyName}_${debt.id}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ملف وسجل حساب الدين التفصيلي (Debt Profile)"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-right select-text">
        {/* 1. Top Header Info Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800/90 dark:to-zinc-900 border border-zinc-200 dark:border-zinc-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border ${
              debt.category === 'equipment'
                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                : debt.debtType === 'payable'
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}>
              {debt.category === 'equipment' ? (
                <Monitor className="w-6 h-6" />
              ) : debt.debtType === 'payable' ? (
                <TrendingDown className="w-6 h-6" />
              ) : (
                <TrendingUp className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-zinc-900 dark:text-white">
                  {debt.partyName}
                </h3>
                <Badge
                  variant={debt.debtType === 'payable' ? 'danger' : 'success'}
                  size="sm"
                >
                  {debt.category === 'equipment'
                    ? `معدات وأجهزة: ${debt.equipmentName || 'أصول'}`
                    : debt.debtType === 'payable'
                    ? '🤝 دين والتزام علينا (Payable)'
                    : '💼 دين ومستحق لنا (Receivable)'}
                </Badge>
                {getStatusBadge(debt.status)}
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap font-medium">
                {debt.partyPhone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{debt.partyPhone}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>تاريخ الاستحقاق: {formatDate(debt.dueDate)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>تاريخ الإنشاء: {formatDate(debt.createdAt)}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              size="sm"
              variant="outline"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
              title="طباعة كشف الحساب"
            >
              طباعة
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportExcel}
              title="تصدير السجل إلى Excel"
            >
              Excel
            </Button>
          </div>
        </div>

        {/* 2. Key Financial Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-medium">قيمة الدين الأصلية</span>
            <span className="text-base font-black text-zinc-900 dark:text-white font-mono mt-0.5 block">
              {isUSD ? `$${debt.totalAmount.toFixed(2)}` : formatCurrency(debt.totalAmount)}
            </span>
          </Card>

          <Card className="p-3 bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">إجمالي المسدد حتى الآن</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
              {isUSD ? `$${debt.paidAmount.toFixed(2)}` : formatCurrency(debt.paidAmount)}
            </span>
          </Card>

          <Card className="p-3 bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/20">
            <span className="text-[11px] text-rose-700 dark:text-rose-400 block font-medium">المبلغ المتبقي</span>
            <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
              {isUSD ? `$${debt.remainingAmount.toFixed(2)}` : formatCurrency(debt.remainingAmount)}
            </span>
          </Card>

          <Card className="p-3 bg-blue-500/5 dark:bg-blue-950/20 border-blue-500/20">
            <span className="text-[11px] text-blue-700 dark:text-blue-400 block font-medium">نسبة إنجاز السداد</span>
            <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">
              {progressPercent}%
            </span>
          </Card>
        </div>

        {/* Repayment Progress Bar */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-zinc-600 dark:text-zinc-300">
            <span>معدل اكتمال السداد</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {debt.paidAmount.toLocaleString()} / {debt.totalAmount.toLocaleString()} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                progressPercent >= 100
                  ? 'bg-emerald-500'
                  : progressPercent > 50
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Vault Integration Status Banner */}
        {debt.debtType === 'payable' && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                {debt.depositToVault
                  ? 'تم توريد وقيد هذا الدين في الخزنة الرئيسية كسيولة نقدية (Cash In).'
                  : 'مرتبط بحسابات الخزنة الرئيسية وسداد الأقساط يخصم نقدياً منها.'}
              </span>
            </div>
            {debt.vaultTransactionId && (
              <Badge variant="default" size="sm" className="font-mono text-[10px]">
                مرجع الخزنة: {debt.vaultTransactionId}
              </Badge>
            )}
          </div>
        )}

        {/* 3. Action Toolbar */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800 flex-wrap">
          <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-amber-500" />
            <span>سجل المعاملات والدفعات المرتبطة ({debt.installments?.length || 0} حركة):</span>
          </h4>

          <div className="flex items-center gap-2">
            {debt.debtType === 'payable' && (
              <Button
                size="sm"
                variant="outline"
                icon={<ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />}
                onClick={() => {
                  setDepositAmount(0);
                  setIsDepositModalOpen(true);
                }}
                className="text-xs"
              >
                + إضافة وديعة للخزنة
              </Button>
            )}

            {debt.remainingAmount > 0 ? (
              <Button
                size="sm"
                variant="primary"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  setPayAmount(debt.remainingAmount);
                  setIsPayModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs"
              >
                {debt.debtType === 'receivable' ? '+ تحصيل دفعة جديدة' : '+ سداد قسط جديد'}
              </Button>
            ) : (
              <Badge variant="success" size="sm">
                تم السداد بالكامل
              </Badge>
            )}
          </div>
        </div>

        {/* 4. Installments & Transactions Table */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-medium">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">التاريخ والوقت</th>
                  <th className="p-2.5">نوع العملية</th>
                  <th className="p-2.5">المبلغ</th>
                  <th className="p-2.5">المسؤول / الموظف</th>
                  <th className="p-2.5">طريقة الدفع</th>
                  <th className="p-2.5">رقم الإيصال</th>
                  <th className="p-2.5">الرصيد بعد العملية</th>
                  <th className="p-2.5">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {(!debt.installments || debt.installments.length === 0) ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-zinc-400">
                      لا توجد دفعات أو تسديدات مسجلة على هذا الدين حتى الآن
                    </td>
                  </tr>
                ) : (
                  debt.installments.map((inst, idx) => (
                    <tr key={inst.id || idx} className="hover:bg-zinc-500/5 transition-colors">
                      <td className="p-2.5 font-mono text-zinc-400">{idx + 1}</td>
                      <td className="p-2.5 font-mono">
                        {formatDate(inst.paymentDate)}
                        {inst.createdAt && (
                          <span className="block text-[10px] text-zinc-400">
                            {new Date(inst.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {inst.type === 'deposit' ? (
                          <Badge variant="success" size="sm">إيداع وديعة</Badge>
                        ) : debt.debtType === 'receivable' ? (
                          <Badge variant="success" size="sm">تحصيل دفعة</Badge>
                        ) : (
                          <Badge variant="info" size="sm">سداد قسط</Badge>
                        )}
                      </td>
                      <td className="p-2.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {isUSD ? `$${inst.amount.toFixed(2)}` : formatCurrency(inst.amount)}
                      </td>
                      <td className="p-2.5 text-zinc-700 dark:text-zinc-300">
                        {inst.paidBy || 'المسؤول'}
                      </td>
                      <td className="p-2.5 text-zinc-500">
                        {inst.paymentMethod || 'كاش (الخزنة)'}
                      </td>
                      <td className="p-2.5 font-mono text-zinc-500">
                        {inst.receiptNumber || '—'}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-rose-600 dark:text-rose-400">
                        {inst.balanceAfter !== undefined
                          ? isUSD ? `$${inst.balanceAfter.toFixed(2)}` : formatCurrency(inst.balanceAfter)
                          : '—'}
                      </td>
                      <td className="p-2.5 text-zinc-500 truncate max-w-[120px]" title={inst.notes || ''}>
                        {inst.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <Button variant="secondary" size="sm" onClick={onClose}>
            إغلاق الملف
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-MODAL: Pay Installment Form */}
      {/* ======================================================== */}
      {isPayModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsPayModalOpen(false)}
          title={
            debt.debtType === 'receivable'
              ? `📥 تحصيل دفعة من: ${debt.partyName}`
              : `📤 سداد قسط دين لـ: ${debt.partyName}`
          }
          maxWidth="md"
        >
          <form onSubmit={handlePaySubmit} className="space-y-3.5 text-right">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
              <span className="text-amber-800 dark:text-amber-300 font-medium">المبلغ المتبقي واجب السداد:</span>
              <span className="font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
                {isUSD ? `$${debt.remainingAmount.toFixed(2)}` : formatCurrency(debt.remainingAmount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  مبلغ الدفعة ({debt.currency || 'EGP'}) *:
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={debt.remainingAmount}
                  value={payAmount || ''}
                  onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                  placeholder={debt.remainingAmount.toString()}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  تاريخ السداد:
                </label>
                <input
                  type="date"
                  required
                  className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  طريقة الدفع:
                </label>
                <select
                  className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  <option value="كاش (الخزنة الرئيسية)">كاش (الخزنة الرئيسية)</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="فودافون كاش / محفظة إلكترونية">فودافون كاش / محفظة</option>
                  <option value="إنستاباي (InstaPay)">إنستاباي (InstaPay)</option>
                  <option value="شيك بنكي">شيك بنكي</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  رقم الإيصال أو المرجع (اختياري):
                </label>
                <Input
                  placeholder="مثال: REC-10492"
                  value={payReceipt}
                  onChange={e => setPayReceipt(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                ملاحظات العملية:
              </label>
              <textarea
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                rows={2}
                placeholder="أي تفاصيل إضافية عن السداد..."
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsPayModalOpen(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || payAmount <= 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {isSubmitting ? 'جاري التنفيذ...' : 'تأكيد وقيد السداد بالخزنة'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* SUB-MODAL: Add Debt Deposit to Vault */}
      {/* ======================================================== */}
      {isDepositModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsDepositModalOpen(false)}
          title={`💰 إضافة وديعة نقدية بالخزنة للدين: ${debt.partyName}`}
          maxWidth="md"
        >
          <form onSubmit={handleDepositSubmit} className="space-y-3.5 text-right">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
              سيتم قيد هذا المبلغ كإيداع نقدي فعلي (Cash In) في <strong>الخزنة الرئيسية</strong> مباشرة وتحديث رصيد الخزنة وسجل حركاتها فوراً.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  مبلغ الوديعة ({debt.currency || 'EGP'}) *:
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={depositAmount || ''}
                  onChange={e => setDepositAmount(parseFloat(e.target.value) || 0)}
                  placeholder="5000"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  تاريخ الإيداع:
                </label>
                <input
                  type="date"
                  required
                  className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                  value={depositDate}
                  onChange={e => setDepositDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                رقم إيصال الوديعة / المرجع:
              </label>
              <Input
                placeholder="مثال: DEP-2026-001"
                value={depositReceipt}
                onChange={e => setDepositReceipt(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                ملاحظات الوديعة:
              </label>
              <textarea
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                rows={2}
                placeholder="بيان مصدر الوديعة أو تفاصيل التوريد للخزنة..."
                value={depositNotes}
                onChange={e => setDepositNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsDepositModalOpen(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || depositAmount <= 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {isSubmitting ? 'جاري الإيداع...' : 'تأكيد الإيداع في الخزنة'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
};
