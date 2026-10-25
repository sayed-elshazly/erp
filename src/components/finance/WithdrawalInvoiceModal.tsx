import React, { useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { BalanceWithdrawal } from '../../types/finance.types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Printer, Download, CheckCircle2, AlertTriangle, ArrowDownLeft, Building2, User, Phone, Calendar, Receipt } from 'lucide-react';

interface WithdrawalInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawal: BalanceWithdrawal | null;
}

export const WithdrawalInvoiceModal: React.FC<WithdrawalInvoiceModalProps> = ({
  isOpen,
  onClose,
  withdrawal
}) => {
  const printContentRef = useRef<HTMLDivElement>(null);

  if (!withdrawal) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🧾 فاتورة وسند سحب رصيد: #${withdrawal.id}`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-right" dir="rtl">
        {/* Printable Receipt Paper Container */}
        <div
          ref={printContentRef}
          className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm text-zinc-900 dark:text-white print:border-none print:shadow-none print:p-0"
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between border-b pb-4 border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                <Receipt className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">سند وفاتورة سحب رصيد</h3>
                <p className="text-xs text-zinc-500 font-sans">
                  منظومة JKR TOPUP ERP — إدارة الشؤون المالية والحسابات
                </p>
              </div>
            </div>

            <div className="text-left font-mono">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-zinc-100 dark:bg-zinc-800 text-amber-600 dark:text-amber-400 border border-zinc-300 dark:border-zinc-700">
                #{withdrawal.id}
              </span>
              <span className="text-[11px] text-zinc-400 block mt-1">
                {formatDateTime(withdrawal.createdAt)}
              </span>
            </div>
          </div>

          {/* Status Badge & Notice */}
          <div className="my-3.5 flex items-center justify-between flex-wrap gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">حالة العملية:</span>
              <Badge variant={withdrawal.status === 'completed' ? 'success' : 'danger'} size="sm">
                {withdrawal.status === 'completed' ? 'عملية سحب معتمدة وناجحة' : 'عملية سحب ملغاة'}
              </Badge>
            </div>
            {withdrawal.paymentMethod && (
              <div className="flex items-center gap-1.5 text-zinc-500">
                <span>طريقة التسليم:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{withdrawal.paymentMethod}</span>
              </div>
            )}
          </div>

          {/* Client & Recipient Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-500" />
                <span className="text-zinc-500">
                  {withdrawal.partyType === 'dealer' ? 'التاجر / الموزع:' : 'اسم العميل:'}
                </span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {withdrawal.partyName} ({withdrawal.partyCode})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-500" />
                <span className="text-zinc-500">رقم هاتف الحساب:</span>
                <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">
                  {withdrawal.partyPhone}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 border-t sm:border-t-0 sm:border-r pt-2 sm:pt-0 sm:pr-3 border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                <span className="text-zinc-500">الرقم المستقبل (المحفظة / الحساب):</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {withdrawal.recipientPhone || withdrawal.partyPhone}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-500">الموظف المسلّم / المنفذ:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {withdrawal.recordedBy}
                </span>
              </div>
            </div>
          </div>

          {/* Wallet-by-Wallet Breakdown Table */}
          <div className="mt-4 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-right">
              <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-3">محفظة السحب</th>
                  <th className="p-3 text-center">الرصيد قبل السحب</th>
                  <th className="p-3 text-center">المبلغ المسحوب</th>
                  <th className="p-3 text-center">الرصيد المتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {withdrawal.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-3 font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      {item.walletName}
                    </td>
                    <td className="p-3 text-center font-mono text-zinc-500">
                      {formatCurrency(item.balanceBefore)}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(item.amount)}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.balanceAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-amber-500/10 font-bold border-t-2 border-amber-500/30">
                <tr>
                  <td className="p-3 text-sm font-black text-amber-900 dark:text-amber-300">
                    إجمالي المبلغ المسحوب:
                  </td>
                  <td colSpan={2} className="p-3 text-center text-base font-black font-mono text-rose-600 dark:text-rose-400">
                    {formatCurrency(withdrawal.totalAmount)}
                  </td>
                  <td className="p-3 text-center text-[11px] text-zinc-500">
                    خصم فعلي من الخزينة
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {withdrawal.notes && (
            <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
              <span className="text-zinc-400 font-bold block mb-0.5">ملاحظات العملية:</span>
              <p className="text-zinc-700 dark:text-zinc-300">{withdrawal.notes}</p>
            </div>
          )}

          {/* Signatures Area */}
          <div className="mt-8 pt-4 border-t border-dashed border-zinc-300 dark:border-zinc-700 grid grid-cols-2 text-center text-xs">
            <div>
              <span className="text-zinc-400 block mb-8">توقيع الموظف المسلّم:</span>
              <span className="font-bold border-t border-zinc-400 pt-1 px-8 inline-block font-sans">
                {withdrawal.recordedBy}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 block mb-8">توقيع المستلم (العميل):</span>
              <span className="font-bold border-t border-zinc-400 pt-1 px-8 inline-block font-sans">
                {withdrawal.partyName}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <Button variant="secondary" size="sm" onClick={onClose}>
            إغلاق
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
          >
            طباعة الفاتورة A4 / إيصال
          </Button>
        </div>
      </div>
    </Modal>
  );
};
