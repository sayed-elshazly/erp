import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { DateRangeFilter } from '../../../components/common/DateRangeFilter';
import { DebtProfileModal } from '../../../components/finance/DebtProfileModal';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { Debt, DebtType, DebtStatus } from '../../../types/finance.types';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/formatters';
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
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Coins,
  FileText,
  Eye,
  CreditCard
} from 'lucide-react';

export const CustomerFinanceDebtsTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const debts = useMemo(() => db.getDebts(false), [refreshTrigger]);
  const today = new Date().toISOString().split('T')[0];

  // Sub-tabs: 'payable' | 'receivable' | 'equipment'
  const [activeSection, setActiveSection] = useState<'payable' | 'receivable' | 'equipment'>('payable');

  // Modals state
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [selectedDebtForInstallment, setSelectedDebtForInstallment] = useState<Debt | null>(null);
  const [selectedDebtForProfile, setSelectedDebtForProfile] = useState<Debt | null>(null);
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);
  const [installmentDate, setInstallmentDate] = useState<string>(today);
  const [installmentReceipt, setInstallmentReceipt] = useState('');
  const [installmentNotes, setInstallmentNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('كاش (الخزنة الرئيسية)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for new Debt
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [debtType, setDebtType] = useState<DebtType>('payable');
  const [category, setCategory] = useState<'general' | 'equipment'>('general');
  const [equipmentName, setEquipmentName] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [depositToVault, setDepositToVault] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DebtStatus>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'EGP' | 'USD'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Filtered Debts according to sub-tab and DateRangeFilter
  const filteredDebts = useMemo(() => {
    return debts
      .filter(d => {
        // Sub-tab partition
        if (activeSection === 'equipment') {
          if (d.category !== 'equipment') return false;
        } else if (activeSection === 'payable') {
          if (d.debtType !== 'payable' || d.category === 'equipment') return false;
        } else if (activeSection === 'receivable') {
          if (d.debtType !== 'receivable' || d.category === 'equipment') return false;
        }

        // Status & Currency Filters
        if (statusFilter !== 'all' && d.status !== statusFilter) return false;
        if (currencyFilter !== 'all' && (d.currency || 'EGP') !== currencyFilter) return false;

        // Date Range Filter (From / To)
        if (startDate) {
          const createdDate = d.createdAt ? d.createdAt.split('T')[0] : '';
          const isCreatedAfter = createdDate >= startDate;
          const isDueAfter = d.dueDate >= startDate;
          if (!isCreatedAfter && !isDueAfter) return false;
        }
        if (endDate) {
          const createdDate = d.createdAt ? d.createdAt.split('T')[0] : '';
          const isCreatedBefore = createdDate <= endDate;
          const isDueBefore = d.dueDate <= endDate;
          if (!isCreatedBefore && !isDueBefore) return false;
        }

        // Search Query Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = d.partyName.toLowerCase().includes(q);
          const matchEq = d.equipmentName?.toLowerCase().includes(q);
          const matchPhone = d.partyPhone?.toLowerCase().includes(q);
          const matchNotes = d.notes?.toLowerCase().includes(q);
          const matchAmount = d.totalAmount.toString().includes(q);
          if (!matchName && !matchEq && !matchPhone && !matchNotes && !matchAmount) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'asc') return a.totalAmount - b.totalAmount;
        return b.totalAmount - a.totalAmount;
      });
  }, [debts, activeSection, statusFilter, currencyFilter, startDate, endDate, searchQuery, sortOrder]);

  // Totals
  const totalPayableRemaining = useMemo(() => {
    return debts
      .filter(d => d.debtType === 'payable')
      .reduce((sum, d) => sum + d.remainingAmount, 0);
  }, [debts]);

  const totalReceivableRemaining = useMemo(() => {
    return debts
      .filter(d => d.debtType === 'receivable')
      .reduce((sum, d) => sum + d.remainingAmount, 0);
  }, [debts]);

  const totalEquipmentRemaining = useMemo(() => {
    return debts
      .filter(d => d.category === 'equipment')
      .reduce((sum, d) => sum + d.remainingAmount, 0);
  }, [debts]);

  // Debts with remaining balance for installment selection
  const unpaidDebts = useMemo(() => {
    return debts.filter(d => d.remainingAmount > 0 || d.status !== 'paid');
  }, [debts]);

  // Handle Add Debt
  const handleAddDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!partyName.trim() || totalAmount <= 0) {
      showToast('error', 'بيانات ناقصة', 'يرجى إدخال اسم الطرف والمبلغ بصورة صحيحة');
      return;
    }

    setIsSubmitting(true);
    try {
      const isPayable = category === 'equipment' ? true : debtType === 'payable';
      const newDebt: Debt = {
        id: `debt_${Date.now()}`,
        partyType: category === 'equipment' ? 'supplier' : 'external',
        partyName: partyName.trim(),
        partyPhone: partyPhone.trim() || undefined,
        debtType: category === 'equipment' ? 'payable' : debtType,
        category,
        equipmentName: category === 'equipment' ? equipmentName.trim() || 'أجهزة ومعدات' : undefined,
        assetValue: category === 'equipment' ? totalAmount : undefined,
        currency,
        totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        dueDate: dueDate || today,
        status: 'unpaid',
        notes: notes.trim() || undefined,
        installments: [],
        createdAt: new Date().toISOString(),
        isArchived: false,
        depositToVault: isPayable ? depositToVault : false
      };

      db.saveDebt(newDebt, user, { depositToVault: isPayable ? depositToVault : false });

      showToast(
        'success',
        'تم تسجيل الدين',
        `تم إنشاء سجل ${newDebt.partyName} بقيمة ${formatCurrency(newDebt.totalAmount)}${newDebt.depositToVault ? ' وإيداع النقدية بالخزنة الرئيسية' : ''}`
      );
      setIsAddDebtOpen(false);

      // Reset
      setPartyName('');
      setPartyPhone('');
      setEquipmentName('');
      setTotalAmount(0);
      setNotes('');
      setDueDate('');
      setDepositToVault(true);
      handleRefresh();
    } catch (err: any) {
      showToast('error', 'خطأ', err.message || 'حدث خطأ أثناء حفظ الدين');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Installment Payment / Collection
  const handleInstallmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedDebtForInstallment || installmentAmount <= 0) return;

    setIsSubmitting(true);
    try {
      db.addDebtInstallment(
        selectedDebtForInstallment.id,
        installmentAmount,
        user?.fullName || user?.username || 'مسؤول الحسابات',
        installmentReceipt.trim() || undefined,
        installmentNotes.trim() || undefined,
        user,
        installmentDate,
        paymentMethod
      );

      showToast(
        'success',
        selectedDebtForInstallment.debtType === 'receivable' ? 'تم تحصيل الدفعة' : 'تم سداد القسط',
        `تم تسجيل حركة بقيمة ${formatCurrency(installmentAmount)} وتحديث الخزنة الرئيسية`
      );

      setSelectedDebtForInstallment(null);
      setInstallmentAmount(0);
      setInstallmentReceipt('');
      setInstallmentNotes('');
      handleRefresh();
    } catch (err: any) {
      showToast('error', 'خطأ في السداد', err.message || 'تعذر تسجيل السداد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: DebtStatus) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" size="sm">مسدد بالكامل</Badge>;
      case 'partially_paid':
        return <Badge variant="warning" size="sm">مسدد جزئياً</Badge>;
      case 'overdue':
        return <Badge variant="danger" size="sm">متأخر عن السداد</Badge>;
      default:
        return <Badge variant="default" size="sm">غير مسدد</Badge>;
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredDebts.map(d => ({
      'الطرف': d.partyName,
      'نوع السجل': d.category === 'equipment' ? `معدات (${d.equipmentName || 'أجهزة'})` : d.debtType === 'payable' ? 'دين علينا' : 'دين لنا',
      'الهاتف': d.partyPhone || '-',
      'المبلغ الإجمالي': d.totalAmount,
      'المدفوع': d.paidAmount,
      'المتبقي': d.remainingAmount,
      'العملة': d.currency || 'EGP',
      'تاريخ الاستحقاق': formatDate(d.dueDate),
      'تاريخ الإنشاء': formatDate(d.createdAt),
      'الحالة': d.status === 'paid' ? 'مسدد بالكامل' : d.status === 'partially_paid' ? 'مسدد جزئياً' : 'غير مسدد',
      'إيداع بالخزنة': d.depositToVault ? 'نعم (Cash In)' : 'لا',
      'الملاحظات': d.notes || '-'
    }));
    exportToExcel(data, `سجل_الديون_${activeSection}_${today}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 text-right">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-amber-500" />
            سجل الديون والمستحقات وأقساط المعدات (Debts & Payables)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            تتبع دقيق لكافة القروض والالتزامات للغير (علينا)، المستحقات لدى العملاء (لنا)، وأقساط الأصول والمعدات مع الربط التام بالخزنة الرئيسية
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
            variant="outline"
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            طباعة
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (activeSection === 'equipment') {
                setCategory('equipment');
                setDebtType('payable');
                setDepositToVault(false);
              } else if (activeSection === 'receivable') {
                setCategory('general');
                setDebtType('receivable');
                setDepositToVault(false);
              } else {
                setCategory('general');
                setDebtType('payable');
                setDepositToVault(true);
              }
              setIsAddDebtOpen(true);
            }}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-xs"
          >
            + إضافة دين / التزام جديد
          </Button>
        </div>
      </div>

      {/* 3 Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/25">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">إجمالي ديون علينا (Payables)</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block mt-1 font-mono">
            {formatCurrency(totalPayableRemaining)}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">مبالغ واجبة السداد للدائنين والشركاء</span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/25">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">إجمالي ديون لنا (Receivables)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1 font-mono">
            {formatCurrency(totalReceivableRemaining)}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">مبالغ مستحقة طرف العملاء والتجار</span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/25">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">أقساط المعدات والأصول المتبقية</span>
            <Monitor className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 block mt-1 font-mono">
            {formatCurrency(totalEquipmentRemaining)}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">شاشات، حواسيب، مكاتب، تجهيزات</span>
        </Card>
      </div>

      {/* 3 Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl max-w-md">
        <button
          type="button"
          onClick={() => setActiveSection('payable')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSection === 'payable'
              ? 'bg-white dark:bg-[#18181b] text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          ديون علينا (قروض والتزامات)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('receivable')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSection === 'receivable'
              ? 'bg-white dark:bg-[#18181b] text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          ديون لنا (مستحقات خارجية)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('equipment')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSection === 'equipment'
              ? 'bg-white dark:bg-[#18181b] text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          ديون وأقساط المعدات
        </button>
      </div>

      {/* Filter & Search Bar with DateRangeFilter */}
      <Card className="p-3.5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs">
          {/* Search Box (5 cols) */}
          <div className="md:col-span-4">
            <label className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block mb-1">
              {activeSection === 'equipment' ? 'بحث بالأصل، المورد، الجهاز:' : 'بحث باسم الدائن/المدين، الهاتف:'}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder={activeSection === 'equipment' ? 'شاشات، كمبيوتر، أجهزة...' : 'ابحث بالاسم، الهاتف، الملاحظات...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pr-8"
              />
            </div>
          </div>

          {/* DateRangeFilter (4 cols) */}
          <div className="md:col-span-4">
            <label className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block mb-1">
              فترة الدين (الاستحقاق / التسجيل):
            </label>
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onReset={() => {
                setStartDate('');
                setEndDate('');
              }}
              label="تاريخ الدين"
              dropdownAlignment="auto"
            />
          </div>

          {/* Status Filter (2 cols) */}
          <div className="md:col-span-2">
            <label className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block mb-1">
              حالة السداد:
            </label>
            <select
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
            >
              <option value="all">كل الحالات</option>
              <option value="unpaid">غير مسدد</option>
              <option value="partially_paid">مسدد جزئياً</option>
              <option value="paid">مسدد بالكامل</option>
              <option value="overdue">متأخر عن الاستحقاق</option>
            </select>
          </div>

          {/* Currency Filter (2 cols) */}
          <div className="md:col-span-2">
            <label className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block mb-1">
              العملة:
            </label>
            <select
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
              value={currencyFilter}
              onChange={e => setCurrencyFilter(e.target.value as any)}
            >
              <option value="all">كل العملات</option>
              <option value="EGP">جنيه مصري (EGP)</option>
              <option value="USD">دولار أمريكي (USD)</option>
            </select>
          </div>
        </div>

        {/* Debts Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-3">
                  {activeSection === 'equipment' ? 'نوع الأصل والمعدات' : activeSection === 'payable' ? 'الدائن (الجهة/الشخص)' : 'المدين (العميل/التاجر)'}
                </th>
                <th className="p-3">رقم الهاتف</th>
                <th className="p-3">القيمة الإجمالية</th>
                <th className="p-3">المسدد</th>
                <th className="p-3">المتبقي</th>
                <th className="p-3">العملة</th>
                <th className="p-3">الاستحقاق</th>
                <th className="p-3">حالة السداد</th>
                <th className="p-3 text-center">الإجراءات والـ Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-500">
                    لا توجد ديون مسجلة في هذا التبويب تطابق خيارات البحث وفترة التاريخ المحددة
                  </td>
                </tr>
              ) : (
                filteredDebts.map(d => {
                  const isUSD = d.currency === 'USD';

                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDebtForProfile(d)}
                      className="hover:bg-amber-500/5 cursor-pointer transition-colors group"
                      title="انقر لفتح ملف وتفاصيل وسجل سداد الدين (Debt Profile)"
                    >
                      <td className="p-3 font-bold text-zinc-900 dark:text-white">
                        {d.category === 'equipment' && d.equipmentName ? (
                          <div className="flex items-center gap-1.5">
                            <Monitor className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div>
                              <span className="group-hover:text-amber-600 transition-colors">{d.equipmentName}</span>
                              <span className="block text-[10px] text-zinc-400">المورد: {d.partyName}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="group-hover:text-amber-600 transition-colors">{d.partyName}</span>
                        )}
                        {d.depositToVault && (
                          <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 mr-1">
                            مورد بالخزنة
                          </span>
                        )}
                        {d.notes && <span className="block text-[10px] text-zinc-400 truncate max-w-xs">{d.notes}</span>}
                      </td>
                      <td className="p-3 font-mono text-zinc-600 dark:text-zinc-400">
                        {d.partyPhone || '-'}
                      </td>
                      <td className="p-3 font-bold font-mono">
                        {isUSD ? `$${d.totalAmount.toFixed(2)}` : formatCurrency(d.totalAmount)}
                      </td>
                      <td className="p-3 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {isUSD ? `$${d.paidAmount.toFixed(2)}` : formatCurrency(d.paidAmount)}
                      </td>
                      <td className="p-3 font-black font-mono text-rose-600 dark:text-rose-400">
                        {isUSD ? `$${d.remainingAmount.toFixed(2)}` : formatCurrency(d.remainingAmount)}
                      </td>
                      <td className="p-3">
                        <span className="font-bold">{d.currency || 'EGP'}</span>
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-300 font-mono">
                        {formatDate(d.dueDate)}
                      </td>
                      <td className="p-3">
                        {getStatusBadge(d.status)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDebtForProfile(d);
                            }}
                            className="text-xs h-7 px-2.5"
                            icon={<Eye className="w-3.5 h-3.5 text-blue-500" />}
                            title="عرض ملف وتفاصيل الدين وسجل الدفعات"
                          >
                            ملف الدين
                          </Button>

                          {d.remainingAmount > 0 ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDebtForInstallment(d);
                                setInstallmentAmount(d.remainingAmount);
                              }}
                              className="text-xs h-7 px-2.5"
                            >
                              {d.debtType === 'receivable' ? 'تحصيل ➔' : 'سداد ➔'}
                            </Button>
                          ) : (
                            <Badge variant="success" size="sm">خالص</Badge>
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

      {/* ============================================================= */}
      {/* MODALS */}
      {/* ============================================================= */}

      {/* 1. Debt Profile Modal */}
      <DebtProfileModal
        isOpen={Boolean(selectedDebtForProfile)}
        onClose={() => setSelectedDebtForProfile(null)}
        debt={selectedDebtForProfile}
        onDebtUpdated={handleRefresh}
      />

      {/* 2. Add Debt Modal */}
      <Modal
        isOpen={isAddDebtOpen}
        onClose={() => setIsAddDebtOpen(false)}
        title={
          category === 'equipment'
            ? '🖥️ تسجيل شراء معدات وأجهزة بالتقسيط'
            : debtType === 'payable'
            ? '🤝 تسجيل دين علينا (قرض / اقتراض)'
            : '💼 تسجيل دين لنا (مستحق طرف آخر)'
        }
        maxWidth="lg"
      >
        <form onSubmit={handleAddDebtSubmit} className="space-y-4 text-right">
          {category === 'equipment' ? (
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                اسم الأصل / الأجهزة المشتراة:
              </label>
              <Input
                required
                placeholder="مثال: 3 شاشات Dell 27 بوصة، مكاتب كاشير، 2 جهاز كمبيوتر..."
                value={equipmentName}
                onChange={e => setEquipmentName(e.target.value)}
              />
            </div>
          ) : null}

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              {category === 'equipment' ? 'المورد / المعرض المشتري منه:' : debtType === 'payable' ? 'اسم الدائن (شخص، شركة، شريك):' : 'اسم المدين (العميل، التاجر، الشريك):'}
            </label>
            <Input
              required
              placeholder="الاسم الثلاثي أو اسم الشركة"
              value={partyName}
              onChange={e => setPartyName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                رقم الهاتف (اختياري):
              </label>
              <Input
                placeholder="01012345678"
                value={partyPhone}
                onChange={e => setPartyPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                العملة:
              </label>
              <select
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                value={currency}
                onChange={e => setCurrency(e.target.value as any)}
              >
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                {category === 'equipment' ? 'قيمة الأصل الإجمالية:' : 'قيمة الدين الإجمالية:'}
              </label>
              <Input
                type="number"
                step="0.01"
                required
                min="1"
                placeholder="10000"
                value={totalAmount || ''}
                onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                تاريخ الاستحقاق:
              </label>
              <input
                type="date"
                required
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Deposit to Vault Checkbox for Payable Debt */}
          {debtType === 'payable' && category !== 'equipment' && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={depositToVault}
                  onChange={e => setDepositToVault(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  💰 إيداع مبلغ الدين في الخزنة الرئيسية كسيولة نقدية (Cash In)
                </span>
              </label>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mr-6">
                عند التفعيل، سيتم تسجيل توريد نقدي فوري بالخزنة الرئيسية بقيمة {totalAmount > 0 ? formatCurrency(totalAmount) : 'الدين'} وتحديث رصيد الخزنة وسجل حركاتها فوراً.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              ملاحظات والشروط والأقساط:
            </label>
            <textarea
              className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
              rows={2}
              placeholder="تفاصيل الأقساط، عدد الدفعات، إيصالات الأمانة إن وجدت..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAddDebtOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || totalAmount <= 0}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              {isSubmitting ? 'جاري الحفظ والتوريد...' : 'حفظ وتثبيت السجل'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Pay/Collect Installment Modal */}
      {selectedDebtForInstallment && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDebtForInstallment(null)}
          title={
            selectedDebtForInstallment.debtType === 'receivable'
              ? `📥 تحصيل دفعة من: ${selectedDebtForInstallment.partyName}`
              : `📤 سداد قسط دين لـ: ${selectedDebtForInstallment.partyName}`
          }
          maxWidth="md"
        >
          <form onSubmit={handleInstallmentSubmit} className="space-y-4 text-right">
            {/* Debt Selector if multiple debts exist */}
            {unpaidDebts.length > 1 && (
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  تحديد الدين المراد سداد قسط منه (التبديل بين الديون المتاحة):
                </label>
                <select
                  value={selectedDebtForInstallment.id}
                  onChange={e => {
                    const found = debts.find(d => d.id === e.target.value);
                    if (found) {
                      setSelectedDebtForInstallment(found);
                      setInstallmentAmount(found.remainingAmount);
                    }
                  }}
                  className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white font-bold"
                >
                  {unpaidDebts.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.partyName} ({d.debtType === 'payable' ? 'علينا' : 'لنا'} - {d.category === 'equipment' ? `معدات: ${d.equipmentName || 'أجهزة'}` : 'مالي'}) — متبقي: {formatCurrency(d.remainingAmount)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">إجمالي الدين:</span>
                <span className="font-bold">{formatCurrency(selectedDebtForInstallment.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">المسدد حتى الآن:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(selectedDebtForInstallment.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">المتبقي المطلوب سداده:</span>
                <span className="font-black text-rose-600">{formatCurrency(selectedDebtForInstallment.remainingAmount)}</span>
              </div>
            </div>

            {/* Date Picker for Installment Ticket */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  تاريخ تذكرة السداد:
                </label>
                <input
                  type="date"
                  required
                  className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white font-mono"
                  value={installmentDate}
                  onChange={e => setInstallmentDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  مبلغ الدفعة ({selectedDebtForInstallment.currency || 'EGP'}) *:
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={selectedDebtForInstallment.remainingAmount}
                  value={installmentAmount || ''}
                  onChange={e => setInstallmentAmount(parseFloat(e.target.value) || 0)}
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
                  رقم الإيصال / السند:
                </label>
                <Input
                  placeholder={`REC-${Date.now().toString().slice(-5)}`}
                  value={installmentReceipt}
                  onChange={e => setInstallmentReceipt(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                ملاحظات الدفعة:
              </label>
              <Input
                placeholder="سداد القسط نقداً من الخزنة..."
                value={installmentNotes}
                onChange={e => setInstallmentNotes(e.target.value)}
              />
            </div>

            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              ● سيتم تحديث رصيد الخزنة الرئيسية ودفتر الحركة آلياً وفورياً
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedDebtForInstallment(null)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || installmentAmount <= 0}
                className={selectedDebtForInstallment.debtType === 'receivable' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}
              >
                {isSubmitting ? 'جاري التنفيذ...' : 'تأكيد الحركة بالخزنة'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
