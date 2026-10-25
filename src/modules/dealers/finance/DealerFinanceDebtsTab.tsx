import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { Debt, DebtType } from '../../../types/finance.types';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { exportToExcel } from '../../../utils/excelExport';
import {
  Scale,
  Plus,
  Search,
  Printer,
  Download,
  Calendar,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  FileText,
  Trash2,
  Coins
} from 'lucide-react';

export const DealerFinanceDebtsTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const debts = useMemo(() => db.getDealerDebts(false), [refreshTrigger]);
  const today = new Date().toISOString().split('T')[0];

  // Sub-tabs: 'payable' | 'receivable' | 'equipment'
  const [activeSection, setActiveSection] = useState<'payable' | 'receivable' | 'equipment'>('payable');

  // Modals state
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [selectedDebtForInstallment, setSelectedDebtForInstallment] = useState<Debt | null>(null);
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);
  const [installmentDate, setInstallmentDate] = useState<string>(today);
  const [installmentReceipt, setInstallmentReceipt] = useState('');
  const [installmentNotes, setInstallmentNotes] = useState('');

  // Form State for new Debt
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [debtType, setDebtType] = useState<DebtType>('payable');
  const [category, setCategory] = useState<'general' | 'equipment'>('general');
  const [equipmentName, setEquipmentName] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');
  const [dueDate, setDueDate] = useState('');
  const [debtNotes, setDebtNotes] = useState('');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partially_paid' | 'paid'>('all');

  // Filtered Debts
  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      if (activeSection === 'equipment') {
        if (d.category !== 'equipment') return false;
      } else {
        if (d.debtType !== activeSection) return false;
        if (d.category === 'equipment') return false;
      }

      if (statusFilter !== 'all' && d.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = d.partyName?.toLowerCase().includes(q);
        const matchPhone = d.partyPhone?.includes(q);
        const matchNotes = d.notes?.toLowerCase().includes(q);
        const matchEq = d.equipmentName?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchNotes && !matchEq) return false;
      }

      return true;
    });
  }, [debts, activeSection, statusFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const payableDebts = debts.filter(d => d.debtType === 'payable');
    const receivableDebts = debts.filter(d => d.debtType === 'receivable');
    const equipmentDebts = debts.filter(d => d.category === 'equipment');

    const totalPayableRemaining = payableDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const totalReceivableRemaining = receivableDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const totalEquipmentRemaining = equipmentDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

    return {
      totalPayableRemaining,
      totalReceivableRemaining,
      totalEquipmentRemaining,
      payableCount: payableDebts.length,
      receivableCount: receivableDebts.length,
      equipmentCount: equipmentDebts.length
    };
  }, [debts]);

  // Debts with remaining balance for installment selection
  const unpaidDebts = useMemo(() => {
    return debts.filter(d => d.remainingAmount > 0 || d.status !== 'paid');
  }, [debts]);

  // Handle Save New Debt
  const handleSaveDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim() || totalAmount <= 0) {
      showToast('error', 'بيانات ناقصة', 'يرجى إدخال اسم الجهة / التاجر ومبلغ صحيح');
      return;
    }

    const newDebt: Debt = {
      id: `ddebt_${Date.now()}`,
      debtType,
      category,
      equipmentName: category === 'equipment' ? equipmentName : undefined,
      partyType: 'external',
      partyName,
      partyPhone,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      currency,
      dueDate: dueDate || today,
      status: 'unpaid',
      installments: [],
      notes: debtNotes,
      createdAt: new Date().toISOString(),
      isArchived: false
    };

    db.saveDealerDebt(newDebt, user);
    showToast('success', 'تم تسجيل الدين', `تم تسجيل الدين بنجاح للجهة: ${partyName}`);

    setIsAddDebtOpen(false);
    setPartyName('');
    setPartyPhone('');
    setEquipmentName('');
    setTotalAmount(0);
    setDebtNotes('');
    setDueDate('');
    handleRefresh();
  };

  // Handle Submit Installment
  const handleAddInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForInstallment || installmentAmount <= 0) return;

    if (installmentAmount > selectedDebtForInstallment.remainingAmount) {
      showToast('error', 'مبلغ غير صالح', 'مبلغ القسط أكبر من المتبقي على الدين');
      return;
    }

    db.addDealerDebtInstallment(
      selectedDebtForInstallment.id,
      installmentAmount,
      user?.fullName || 'مسؤول الحسابات',
      installmentReceipt,
      installmentNotes,
      true,
      user,
      installmentDate
    );

    showToast(
      'success',
      selectedDebtForInstallment.debtType === 'payable' ? 'تم سداد القسط' : 'تم تحصيل القسط',
      `تم تسجيل حركة ${selectedDebtForInstallment.debtType === 'payable' ? 'سداد من' : 'تحصيل في'} خزنة التجار بمبلغ ${formatCurrency(installmentAmount)}`
    );

    setSelectedDebtForInstallment(null);
    setInstallmentAmount(0);
    setInstallmentReceipt('');
    setInstallmentNotes('');
    handleRefresh();
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredDebts.map(d => ({
      'الجهة / التاجر': d.partyName,
      'النوع': d.debtType === 'payable' ? 'دين علينا' : 'دين لنا',
      'التصنيف': d.category === 'equipment' ? `معدات (${d.equipmentName || ''})` : 'مالي',
      'إجمالي الدين': d.totalAmount,
      'المسدد': d.paidAmount,
      'المتبقي': d.remainingAmount,
      'العملة': d.currency || 'EGP',
      'تاريخ الاستحقاق': formatDate(d.dueDate),
      'الحالة': d.status === 'paid' ? 'مسدد بالكامل' : d.status === 'partially_paid' ? 'مسدد جزئياً' : 'غير مسدد',
      'ملاحظات': d.notes || ''
    }));
    exportToExcel(data, `ديون_قسم_التجار_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" />
              سجل ديون وتسهيلات قطاع التجار
            </h2>
            <Badge variant="warning" size="sm">مزامنة فورية مع خزنة التجار</Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            إدارة ديون التجار المالية وديون المعدات والأجهزة، وجدولة وسداد الأقساط مع التأثير المباشر في حركة الخزنة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportExcel}
          >
            تصدير Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            طباعة الكشف
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddDebtOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
          >
            إضافة سجل دين جديد
          </Button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/25">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">إجمالي ديون علينا (مطلوب سدادها)</span>
            <ArrowUpRight className="w-5 h-5 text-rose-500" />
          </div>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block mt-2 font-mono">
            {formatCurrency(metrics.totalPayableRemaining)}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">
            عدد السجلات: {metrics.payableCount} التزام
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-teal-500/10 to-transparent border-teal-500/25">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">إجمالي ديون لنا (مطلوب تحصيلها)</span>
            <ArrowDownLeft className="w-5 h-5 text-teal-500" />
          </div>
          <span className="text-2xl font-black text-teal-600 dark:text-teal-400 block mt-2 font-mono">
            {formatCurrency(metrics.totalReceivableRemaining)}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">
            عدد السجلات: {metrics.receivableCount} مستحق
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/25">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">إجمالي ديون المعدات والأجهزة</span>
            <Monitor className="w-5 h-5 text-purple-500" />
          </div>
          <span className="text-2xl font-black text-purple-600 dark:text-purple-400 block mt-2 font-mono">
            {formatCurrency(metrics.totalEquipmentRemaining)}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">
            أجهزة ومعدات متبقية: {metrics.equipmentCount} سجل
          </span>
        </Card>
      </div>

      {/* Sub-Tabs: Payable vs Receivable vs Equipment */}
      <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveSection('payable')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'payable'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>ديون علينا (موردين وتسهيلات مالية)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('receivable')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'receivable'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>ديون لنا (مستحقات لدى تجار الجملة)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('equipment')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'equipment'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>ديون معدات (أجهزة، شاشات، كبائن)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
        <div className="w-full sm:w-80">
          <Input
            type="text"
            placeholder="بحث باسم التاجر، الهاتف، المعدة..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value="all">كل حالات السداد</option>
            <option value="unpaid">غير مسدد</option>
            <option value="partially_paid">مسدد جزئياً</option>
            <option value="paid">مسدد بالكامل</option>
          </select>
        </div>
      </div>

      {/* Debts Master Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-right">
          <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="p-3">الجهة / التاجر</th>
              <th className="p-3">التصنيف</th>
              <th className="p-3">إجمالي الدين</th>
              <th className="p-3">المسدد</th>
              <th className="p-3">المتبقي</th>
              <th className="p-3">تاريخ الاستحقاق</th>
              <th className="p-3">الحالة</th>
              <th className="p-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
            {filteredDebts.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-500">
                  لا توجد سجلات ديون في هذا القسم
                </td>
              </tr>
            ) : (
              filteredDebts.map(debt => (
                <tr key={debt.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="p-3">
                    <span className="font-bold text-zinc-900 dark:text-white block">{debt.partyName}</span>
                    {debt.partyPhone && <span className="text-[10px] text-zinc-400 block font-mono">{debt.partyPhone}</span>}
                  </td>
                  <td className="p-3">
                    {debt.category === 'equipment' ? (
                      <Badge variant="info" size="sm">معدة: {debt.equipmentName || 'أجهزة'}</Badge>
                    ) : (
                      <Badge variant="default" size="sm">دين مالي</Badge>
                    )}
                  </td>
                  <td className="p-3 font-mono font-bold text-zinc-900 dark:text-white">
                    {formatCurrency(debt.totalAmount)}
                  </td>
                  <td className="p-3 font-mono text-emerald-600">
                    {formatCurrency(debt.paidAmount)}
                  </td>
                  <td className="p-3 font-mono font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(debt.remainingAmount)}
                  </td>
                  <td className="p-3 font-mono text-zinc-500">
                    {formatDate(debt.dueDate)}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={debt.status === 'paid' ? 'success' : debt.status === 'partially_paid' ? 'warning' : 'danger'}
                      size="sm"
                    >
                      {debt.status === 'paid' ? 'مسدد بالكامل' : debt.status === 'partially_paid' ? 'مسدد جزئياً' : 'غير مسدد'}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {debt.remainingAmount > 0 && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Coins className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setSelectedDebtForInstallment(debt);
                            setInstallmentAmount(debt.remainingAmount);
                          }}
                          className={debt.debtType === 'payable' ? 'bg-rose-600 hover:bg-rose-500 text-white font-bold' : 'bg-teal-600 hover:bg-teal-500 text-white font-bold'}
                        >
                          {debt.debtType === 'payable' ? 'سداد قسط' : 'تحصيل قسط'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من حذف سجل الدين الخاص بـ ${debt.partyName}؟`)) {
                            db.deleteDealerDebt(debt.id, user);
                            handleRefresh();
                          }
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* ➕ MODAL: Add Debt */}
      {/* ========================================================================= */}
      {isAddDebtOpen && (
        <Modal
          isOpen={isAddDebtOpen}
          onClose={() => setIsAddDebtOpen(false)}
          title="⚖️ تسجيل دين أو التزام جديد لقطاع التجار"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveDebt} className="space-y-3 text-right" dir="rtl">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">نوع الدين:</label>
                <select
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                  value={debtType}
                  onChange={e => setDebtType(e.target.value as any)}
                >
                  <option value="payable">دين علينا (مستحق للمورد أو التاجر)</option>
                  <option value="receivable">دين لنا (مستحق على التاجر أو العميل)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">طبيعة الدين:</label>
                <select
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                >
                  <option value="general">دين مالي عام (تسهيل / رصيد / نقد)</option>
                  <option value="equipment">دين معدات وأجهزة</option>
                </select>
              </div>
            </div>

            {category === 'equipment' && (
              <div>
                <label className="text-xs font-bold block mb-1">اسم ونوع المعدة / الجهاز:</label>
                <Input
                  type="text"
                  required
                  value={equipmentName}
                  onChange={e => setEquipmentName(e.target.value)}
                  placeholder="مثال: جهاز نقطة بيع POS، شاشة عرض، طابعة..."
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">اسم الجهة / التاجر / الشخص:</label>
                <Input
                  type="text"
                  required
                  value={partyName}
                  onChange={e => setPartyName(e.target.value)}
                  placeholder="اسم التاجر أو الدائن..."
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">رقم الهاتف:</label>
                <Input
                  type="text"
                  value={partyPhone}
                  onChange={e => setPartyPhone(e.target.value)}
                  placeholder="010..."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs font-bold block mb-1">إجمالي المبلغ:</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={totalAmount || ''}
                  onChange={e => setTotalAmount(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">العملة:</label>
                <select
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                  value={currency}
                  onChange={e => setCurrency(e.target.value as any)}
                >
                  <option value="EGP">جنيه (EGP)</option>
                  <option value="USD">دولار (USD)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">تاريخ الاستحقاق المتفق عليه:</label>
              <Input
                type="date"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">ملاحظات وشروط إضافية:</label>
              <textarea
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                rows={2}
                value={debtNotes}
                onChange={e => setDebtNotes(e.target.value)}
                placeholder="أي تفاصيل عن الأقساط أو الضمانات..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddDebtOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                حفظ سجل الدين
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 💰 MODAL: Pay / Collect Installment */}
      {/* ========================================================================= */}
      {selectedDebtForInstallment && (
        <Modal
          isOpen={Boolean(selectedDebtForInstallment)}
          onClose={() => setSelectedDebtForInstallment(null)}
          title={selectedDebtForInstallment.debtType === 'payable' ? '💸 سداد قسط دين (خصم من خزنة التجار)' : '📥 تحصيل قسط دين (إيداع في خزنة التجار)'}
          maxWidth="md"
        >
          <form onSubmit={handleAddInstallment} className="space-y-3 text-right" dir="rtl">
            {/* Debt Selector if multiple debts exist */}
            {unpaidDebts.length > 1 && (
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  تحديد الدين المراد سداد قسط منه (التبديل بين الديون المتاحة):
                </label>
                <select
                  value={selectedDebtForInstallment.id}
                  onChange={e => {
                    const found = debts.find(d => d.id === e.target.value);
                    if (found) {
                      setSelectedDebtForInstallment(found);
                      setInstallmentAmount(0);
                    }
                  }}
                  className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold focus:outline-none focus:border-amber-500"
                >
                  {unpaidDebts.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.partyName} ({d.debtType === 'payable' ? 'علينا' : 'لنا'} - {d.category === 'equipment' ? `معدات: ${d.equipmentName || ''}` : 'مالي'}) — متبقي: {formatCurrency(d.remainingAmount)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">الجهة / التاجر:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{selectedDebtForInstallment.partyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">المبلغ المتبقي:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                  {formatCurrency(selectedDebtForInstallment.remainingAmount)}
                </span>
              </div>
            </div>

            {/* Date Picker for Installment Ticket */}
            <div>
              <label className="text-xs font-bold block mb-1">تاريخ تذكرة سداد القسط:</label>
              <Input
                type="date"
                required
                value={installmentDate}
                onChange={e => setInstallmentDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">مبلغ القسط المراد سداده/تحصيله:</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedDebtForInstallment.remainingAmount}
                required
                value={installmentAmount || ''}
                onChange={e => setInstallmentAmount(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">رقم الإيصال أو الشيك (اختياري):</label>
              <Input
                type="text"
                value={installmentReceipt}
                onChange={e => setInstallmentReceipt(e.target.value)}
                placeholder="رقم سند القبض أو الصرف..."
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">ملاحظات:</label>
              <Input
                type="text"
                value={installmentNotes}
                onChange={e => setInstallmentNotes(e.target.value)}
                placeholder="دفعة حساب نقدي..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedDebtForInstallment(null)}>
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className={selectedDebtForInstallment.debtType === 'payable' ? 'bg-rose-600 hover:bg-rose-500 text-white font-bold' : 'bg-teal-600 hover:bg-teal-500 text-white font-bold'}
              >
                تأكيد وتسجيل بالحساب
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default DealerFinanceDebtsTab;
