import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { BalanceWithdrawal } from '../../../types/finance.types';
import { formatCurrency, formatDateTime, formatDate } from '../../../utils/formatters';
import { exportToExcel } from '../../../utils/excelExport';
import { DateRangeFilter } from '../../../components/common/DateRangeFilter';
import { NewWithdrawalTicketModal } from '../../../components/finance/NewWithdrawalTicketModal';
import { WithdrawalInvoiceModal } from '../../../components/finance/WithdrawalInvoiceModal';
import {
  Wallet,
  Plus,
  Search,
  Printer,
  Download,
  Receipt,
  ArrowDownLeft,
  TrendingDown,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Phone,
  RotateCcw
} from 'lucide-react';

export const CustomerFinanceWithdrawalsTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const withdrawals = useMemo(() => db.getBalanceWithdrawals(), [refreshTrigger]);

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().substring(0, 7);

  // Modals state
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedWithdrawalForInvoice, setSelectedWithdrawalForInvoice] = useState<BalanceWithdrawal | null>(null);
  const [cancelModalWithdrawal, setCancelModalWithdrawal] = useState<BalanceWithdrawal | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => {
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;

      const recordDate = w.createdAt ? w.createdAt.split('T')[0] : '';
      if (startDate && recordDate < startDate) return false;
      if (endDate && recordDate > endDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = w.id.toLowerCase().includes(q);
        const matchName = w.partyName.toLowerCase().includes(q);
        const matchPhone = w.partyPhone.includes(q);
        const matchRecipient = w.recipientPhone?.includes(q);
        const matchEmployee = w.recordedBy?.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchPhone && !matchRecipient && !matchEmployee) return false;
      }

      return true;
    });
  }, [withdrawals, statusFilter, startDate, endDate, searchQuery]);

  // KPIs
  const totalWithdrawnAllTime = useMemo(() => {
    return withdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + w.totalAmount, 0);
  }, [withdrawals]);

  const totalWithdrawnThisMonth = useMemo(() => {
    return withdrawals
      .filter(w => w.status === 'completed' && w.createdAt.startsWith(currentMonth))
      .reduce((sum, w) => sum + w.totalAmount, 0);
  }, [withdrawals, currentMonth]);

  const completedCount = useMemo(() => {
    return withdrawals.filter(w => w.status === 'completed').length;
  }, [withdrawals]);

  const averageWithdrawal = completedCount > 0 ? Math.round(totalWithdrawnAllTime / completedCount) : 0;

  // Handle Cancellation
  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalWithdrawal) return;

    db.cancelBalanceWithdrawal(
      cancelModalWithdrawal.id,
      cancellationReason.trim() || 'إلغاء بناء على طلب الإدارة',
      false,
      user
    );

    showToast(
      'info',
      'تم إلغاء السحب',
      `تم إلغاء التذكرة #${cancelModalWithdrawal.id} وإعادة ${formatCurrency(cancelModalWithdrawal.totalAmount)} لمحافظ العميل والخزينة`
    );

    setCancelModalWithdrawal(null);
    setCancellationReason('');
    handleRefresh();
  };

  // Export Excel
  const handleExportExcel = () => {
    const data = filteredWithdrawals.map(w => ({
      'رقم التذكرة': w.id,
      'التاريخ': formatDateTime(w.createdAt),
      'اسم العميل': w.partyName,
      'كود العميل': w.partyCode,
      'رقم هاتف العميل': w.partyPhone,
      'الرقم المستقبل': w.recipientPhone || w.partyPhone,
      'طريقة التسليم': w.paymentMethod || 'كاش',
      'إجمالي المبلغ المسحوب': w.totalAmount,
      'تفاصيل المحافظ': w.items.map(i => `${i.walletName}: ${i.amount} ج.م`).join(' | '),
      'الموظف المنفذ': w.recordedBy,
      'الحالة': w.status === 'completed' ? 'معتمدة' : 'ملغاة',
      'ملاحظات': w.notes || ''
    }));

    exportToExcel(data, `سحوبات_أرصدة_العملاء_${today}`);
  };

  return (
    <div className="space-y-5 text-right" dir="rtl">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-500" />
            سحب أرصدة الزبائن الفائضة (Customer Balance Withdrawals)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            إنشاء تذاكر سحب الرصيد للعملاء من أكثر من محفظة (الأساسية / الإحالة / الكاش باك)، إصدار الفواتير الرسمية، وخصم النقدية آلياً من الخزينة.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportExcel}
          >
            تصدير Excel
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewTicketOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/20"
          >
            + سحب رصيد جديد
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 font-bold block">إجمالي المسحوبات (كل الأوقات)</span>
          <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-1 block">
            {formatCurrency(totalWithdrawnAllTime)}
          </span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 font-bold block">مسحوبات الشهر الحالي</span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-1 block">
            {formatCurrency(totalWithdrawnThisMonth)}
          </span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 font-bold block">عدد عمليات السحب المعتمدة</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
            {completedCount} عملية
          </span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 font-bold block">متوسط قيمة العملية</span>
          <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono mt-1 block">
            {formatCurrency(averageWithdrawal)}
          </span>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
        <div className="md:col-span-5">
          <label className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block mb-1">بحث برقم التذكرة أو اسم العميل أو الهاتف:</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="ابحث برقم التذكرة، العميل، الهاتف، المحفظة..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-8"
            />
          </div>
        </div>

        <div className="md:col-span-4">
          <label className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block mb-1">فترة تذاكر السحب:</label>
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onReset={() => {
              setStartDate('');
              setEndDate('');
            }}
            label="تاريخ السحب"
            dropdownAlignment="auto"
          />
        </div>

        <div className="md:col-span-3">
          <label className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block mb-1">حالة السحب:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full text-xs p-2.5 h-[38px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold transition-all focus:border-blue-500 outline-none"
          >
            <option value="all">كل الحالات</option>
            <option value="completed">سحوبات معتمدة وناجحة</option>
            <option value="cancelled">سحوبات ملغاة</option>
          </select>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-3">رقم التذكرة</th>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3">العميل</th>
                <th className="p-3">الرقم المستقبل</th>
                <th className="p-3">تفاصيل المحافظ المسحوبة</th>
                <th className="p-3 text-center">الإجمالي المسحوب</th>
                <th className="p-3">الموظف</th>
                <th className="p-3 text-center">الحالة</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-500 text-xs">
                    لا توجد عمليات سحب مسجلة تطابق معايير البحث
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                      #{w.id}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-zinc-500">
                      {formatDateTime(w.createdAt)}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-zinc-900 dark:text-white block">{w.partyName}</span>
                      <span className="text-[11px] text-zinc-500 font-mono">{w.partyPhone}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {w.recipientPhone || w.partyPhone}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {w.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          >
                            {item.walletType === 'main' ? 'أساسي' : item.walletType === 'referral' ? 'إحالة' : 'كاش باك'}:{' '}
                            <span className="font-mono text-rose-500">{formatCurrency(item.amount)}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                      {formatCurrency(w.totalAmount)}
                    </td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-300 font-sans">
                      {w.recordedBy}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={w.status === 'completed' ? 'success' : 'danger'} size="sm">
                        {w.status === 'completed' ? 'معتمدة' : 'ملغاة'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<FileText className="w-3.5 h-3.5" />}
                          onClick={() => setSelectedWithdrawalForInvoice(w)}
                          className="text-xs font-bold"
                        >
                          الفاتورة
                        </Button>

                        {w.status === 'completed' && user?.role === 'admin' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<RotateCcw className="w-3.5 h-3.5 text-rose-500" />}
                            onClick={() => setCancelModalWithdrawal(w)}
                            title="إلغاء العملية واسترجاع الأرصدة"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Withdrawal Ticket Modal */}
      {isNewTicketOpen && (
        <NewWithdrawalTicketModal
          isOpen={isNewTicketOpen}
          onClose={() => setIsNewTicketOpen(false)}
          partyType="customer"
          onSuccess={created => {
            handleRefresh();
            setSelectedWithdrawalForInvoice(created);
          }}
        />
      )}

      {/* Printable Invoice Modal */}
      {selectedWithdrawalForInvoice && (
        <WithdrawalInvoiceModal
          isOpen={Boolean(selectedWithdrawalForInvoice)}
          onClose={() => setSelectedWithdrawalForInvoice(null)}
          withdrawal={selectedWithdrawalForInvoice}
        />
      )}

      {/* Cancel Withdrawal Confirmation Modal */}
      {cancelModalWithdrawal && (
        <Modal
          isOpen={Boolean(cancelModalWithdrawal)}
          onClose={() => setCancelModalWithdrawal(null)}
          title={`⚠️ إلغاء تذكرة سحب الرصيد #${cancelModalWithdrawal.id}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmCancel} className="space-y-4 text-right" dir="rtl">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300">
              <span className="font-bold block mb-1">تنبيه إداري:</span>
              سيؤدي إلغاء هذه العملية إلى إعادة المبالغ المسحوبة ({formatCurrency(cancelModalWithdrawal.totalAmount)}) إلى محافظ العميل فورياً، وإيداع المبلغ المخصوم مجدداً في الخزينة الرئيسية.
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                سبب الإلغاء:
              </label>
              <Input
                required
                placeholder="تراجع العميل عن السحب، خطأ في المبلغ..."
                value={cancellationReason}
                onChange={e => setCancellationReason(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setCancelModalWithdrawal(null)}>
                تراجع
              </Button>
              <Button type="submit" variant="danger" size="sm" className="font-bold">
                تأكيد إلغاء السحب واسترداد الأرصدة
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
