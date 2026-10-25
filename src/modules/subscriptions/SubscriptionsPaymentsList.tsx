// =============================================================
// NZM JKR TOP UP ERP — Subscriptions Payments & Refunds Log
// =============================================================

import React, { useState, useMemo } from 'react';
import { SubscriptionPayment, CustomerSubscription } from '../../types/subscription.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { SubscriptionReceiptModal } from './SubscriptionReceiptModal';
import { exportToExcel } from '../../utils/excelExport';
import {
  CreditCard,
  Search,
  RotateCcw,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';

export const SubscriptionsPaymentsList: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [payments, setPayments] = useState<SubscriptionPayment[]>(() => db.getSubscriptionPayments());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'refunded' | 'failed'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // Refund Modal State
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<SubscriptionPayment | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>('');

  // Receipt Modal State
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<SubscriptionPayment | null>(null);
  const [associatedSub, setAssociatedSub] = useState<CustomerSubscription | null>(null);

  const reloadData = () => {
    setPayments(db.getSubscriptionPayments());
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (methodFilter !== 'all' && p.paymentMethod !== methodFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPay = p.paymentNumber.toLowerCase().includes(q);
        const matchSub = p.subscriptionNumber.toLowerCase().includes(q);
        const matchCust = p.customerName.toLowerCase().includes(q) || p.customerPhone.includes(q);
        const matchEmp = p.employeeName.toLowerCase().includes(q);
        if (!matchPay && !matchSub && !matchCust && !matchEmp) return false;
      }
      return true;
    });
  }, [payments, statusFilter, methodFilter, searchQuery]);

  // KPIs
  const stats = useMemo(() => {
    const totalCollected = filteredPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.netPaid, 0);
    const totalRefunded = filteredPayments.filter(p => p.status === 'refunded').reduce((sum, p) => sum + (p.refundAmount || p.netPaid), 0);
    const totalTransactions = filteredPayments.length;
    return { totalCollected, totalRefunded, totalTransactions };
  }, [filteredPayments]);

  const handleOpenRefundModal = (p: SubscriptionPayment) => {
    setSelectedPaymentForRefund(p);
    setRefundAmount(p.netPaid);
    setRefundReason('استرداد بناءً على رغبة العميل');
  };

  const handleConfirmRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForRefund) return;

    const res = db.refundSubscriptionPayment(
      selectedPaymentForRefund.id,
      refundAmount,
      refundReason,
      {
        id: user?.id,
        name: user?.fullName || 'المدير العام',
        role: user?.role
      }
    );

    if (res.success) {
      showToast('success', 'تم الاسترداد بنجاح', res.message);
      reloadData();
      setSelectedPaymentForRefund(null);
    } else {
      showToast('error', 'فشل الاسترداد', res.message);
    }
  };

  const handleOpenReceipt = (p: SubscriptionPayment) => {
    const sub = db.getSubscriptionById(p.subscriptionId);
    if (sub) {
      setAssociatedSub(sub);
      setSelectedPaymentForReceipt(p);
    } else {
      showToast('warning', 'تعذر فتح الفاتورة', 'بيانات الاشتراك المرتبط غير متوفرة');
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredPayments.map(p => ({
      'رقم الدفعة': p.paymentNumber,
      'رقم الاشتراك': p.subscriptionNumber,
      'العميل': p.customerName,
      'الهاتف': p.customerPhone,
      'المبلغ الأصلي': p.amount,
      'الخصم': p.discount,
      'الصافي المسدد': p.netPaid,
      'طريقة الدفع': p.paymentMethod,
      'الحالة': p.status,
      'المبلغ المسترد': p.refundAmount || 0,
      'سبب الاسترداد': p.refundReason || '—',
      'الموظف': p.employeeName,
      'التاريخ': formatDateTime(p.createdAt)
    }));

    exportToExcel(exportData, `subscription_payments_${Date.now()}`);
    showToast('success', 'تم التصدير', 'تم تصدير سجل المدفوعات إلى Excel بنجاح');
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'safe_cash': return 'نقدًا بالخزينة';
      case 'vodafone_cash': return 'فودافون كاش';
      case 'instapay': return 'إنستاباي';
      case 'bank_transfer': return 'تحويل بنكي';
      case 'customer_wallet': return 'محفظة العميل';
      default: return method;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs" dir="rtl">
      {/* 1. KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">إجمالي التحصيلات</span>
            <span className="text-lg font-black text-emerald-500 font-mono">
              {formatCurrency(stats.totalCollected)}
            </span>
            <div className="text-[10px] text-zinc-400 mt-0.5">من {stats.totalTransactions} حركة دفع</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">إجمالي المستردات (Refunds)</span>
            <span className="text-lg font-black text-rose-500 font-mono">
              {formatCurrency(stats.totalRefunded)}
            </span>
            <div className="text-[10px] text-zinc-400 mt-0.5">تم خصمها من الخزينة</div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-zinc-500 font-bold block">صافي التدفق المالي للاشتراكات</span>
            <span className="text-lg font-black text-pink-600 dark:text-pink-400 font-mono">
              {formatCurrency(stats.totalCollected - stats.totalRefunded)}
            </span>
            <div className="text-[10px] text-zinc-400 mt-0.5">الرصيد الفعلي المورد للخزينة</div>
          </div>
          <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white dark:bg-[#121215] p-3 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="بحث برقم الدفعة، رقم الاشتراك، أو العميل..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl py-2 pr-9 pl-4 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-pink-500 transition-all font-sans"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
          >
            <option value="all">كل الحالات ({payments.length})</option>
            <option value="completed">مكتملة ومحصلة</option>
            <option value="refunded">مستردة (Refunded)</option>
            <option value="failed">فاشلة / ملغاة</option>
          </select>

          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
          >
            <option value="all">كافة طرق الدفع</option>
            <option value="safe_cash">نقدًا بالخزينة</option>
            <option value="vodafone_cash">فودافون كاش</option>
            <option value="instapay">إنستاباي</option>
            <option value="customer_wallet">محفظة العميل</option>
          </select>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 hover:border-emerald-500 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* 3. Payments Table */}
      <Card className="p-0 bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <th className="py-3 px-3.5">رقم الدفعة والتاريخ</th>
                <th className="py-3 px-3.5">الاشتراك المرتبط</th>
                <th className="py-3 px-3.5">العميل</th>
                <th className="py-3 px-3.5 text-center">المبلغ المحصل</th>
                <th className="py-3 px-3.5 text-center">طريقة السداد</th>
                <th className="py-3 px-3.5 text-center">حالة الدفعة</th>
                <th className="py-3 px-3.5 text-center">الموظف</th>
                <th className="py-3 px-3.5 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 space-y-2">
                    <CreditCard className="w-8 h-8 text-pink-500/50 mx-auto" />
                    <p className="font-bold text-sm">لا توجد حركات دفع مسجلة</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map(pay => (
                  <tr key={pay.id} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-black text-pink-600 dark:text-pink-400 text-xs block">
                        #{pay.paymentNumber}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {formatDateTime(pay.createdAt)}
                      </span>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        #{pay.subscriptionNumber}
                      </span>
                      {pay.receiptNumber && (
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {pay.receiptNumber}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{pay.customerName}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">{pay.customerPhone}</div>
                    </td>

                    <td className="py-3 px-3.5 text-center font-mono font-black text-zinc-900 dark:text-zinc-100 text-xs">
                      {formatCurrency(pay.netPaid)}
                    </td>

                    <td className="py-3 px-3.5 text-center font-bold text-zinc-600 dark:text-zinc-300">
                      {getMethodLabel(pay.paymentMethod)}
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <Badge variant={pay.status === 'completed' ? 'success' : pay.status === 'refunded' ? 'danger' : 'default'} size="sm">
                        {pay.status === 'completed' ? 'مكتملة' : pay.status === 'refunded' ? 'مستردة' : 'فاشلة'}
                      </Badge>
                    </td>

                    <td className="py-3 px-3.5 text-center text-zinc-500 font-medium">
                      {pay.employeeName}
                    </td>

                    <td className="py-3 px-3.5 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Receipt */}
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(pay)}
                          className="p-1.5 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20 font-bold text-xs flex items-center gap-1 cursor-pointer"
                          title="عرض الإيصال"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>الإيصال</span>
                        </button>

                        {/* Refund if completed */}
                        {pay.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => handleOpenRefundModal(pay)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-bold text-xs flex items-center gap-1 cursor-pointer"
                            title="استرداد مالي (Refund)"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>استرداد</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Refund Modal */}
      {selectedPaymentForRefund && (
        <Modal
          isOpen={Boolean(selectedPaymentForRefund)}
          onClose={() => setSelectedPaymentForRefund(null)}
          title={`استرداد مالي لدفعة #${selectedPaymentForRefund.paymentNumber}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmRefund} className="space-y-4 text-right text-xs" dir="rtl">
            <Card className="p-3 bg-rose-500/10 border border-rose-500/20 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">العميل:</span>
                <strong className="text-zinc-900 dark:text-zinc-100">{selectedPaymentForRefund.customerName}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">المبلغ المسدد مسبقاً:</span>
                <strong className="text-zinc-900 dark:text-zinc-100 font-mono">{formatCurrency(selectedPaymentForRefund.netPaid)}</strong>
              </div>
            </Card>

            <Input
              label="المبلغ المراد استرداده وخصمه من الخزينة (ج.م) *"
              type="number"
              min={1}
              max={selectedPaymentForRefund.netPaid}
              value={refundAmount}
              onChange={e => setRefundAmount(Math.min(selectedPaymentForRefund.netPaid, Number(e.target.value)))}
              required
            />

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                سبب الاسترداد *
              </label>
              <textarea
                rows={2}
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="أدخل سبب الاسترداد لتوثيقه في سجل العمليات والخزينة..."
                className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button variant="secondary" type="button" onClick={() => setSelectedPaymentForRefund(null)}>
                إلغاء
              </Button>
              <Button
                variant="danger"
                type="submit"
                icon={<RotateCcw className="w-4 h-4" />}
                className="font-bold cursor-pointer"
              >
                تأكيد الاسترداد وخصم المبلغ من الخزينة
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Receipt Modal */}
      {selectedPaymentForReceipt && associatedSub && (
        <SubscriptionReceiptModal
          isOpen={Boolean(selectedPaymentForReceipt)}
          onClose={() => {
            setSelectedPaymentForReceipt(null);
            setAssociatedSub(null);
          }}
          subscription={associatedSub}
          payment={selectedPaymentForReceipt}
        />
      )}
    </div>
  );
};
