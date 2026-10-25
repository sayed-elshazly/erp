import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { Expense, ExpenseCategory } from '../../../types/finance.types';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/formatters';
import { exportToExcel } from '../../../utils/excelExport';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  Download,
  Calendar,
  Building,
  Zap,
  Wifi,
  Users,
  ShoppingBag,
  Wrench,
  FileText,
  Megaphone,
  Settings,
  MoreHorizontal,
  Paperclip,
  ShieldCheck,
  DollarSign
} from 'lucide-react';

export const CustomerFinanceExpensesTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const expenses = useMemo(() => db.getExpenses(false), [refreshTrigger]);
  const employees = useMemo(() => db.getEmployees(true), [refreshTrigger]);

  const today = new Date().toISOString().split('T')[0];

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] = useState<Expense | null>(null);

  // Form State
  const [expenseNumber, setExpenseNumber] = useState(`EXP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('operations');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');
  const [usdRate, setUsdRate] = useState<number>(49.83);
  const [paidFromVault, setPaidFromVault] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('نقدية من الخزنة الرئيسية');
  const [department, setDepartment] = useState('قسم الزبائن');
  const [recordedBy, setRecordedBy] = useState(user?.fullName || user?.username || 'مسؤول الحسابات');
  const [reason, setReason] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [notes, setNotes] = useState('');

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'month' | 'custom'>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
      if (currencyFilter !== 'all' && (exp.currency || 'EGP') !== currencyFilter) return false;
      if (employeeFilter !== 'all' && exp.approvedBy !== employeeFilter && exp.recordedBy !== employeeFilter) return false;

      if (datePreset === 'today' && exp.date !== today) return false;
      if (datePreset === 'month' && !exp.date.startsWith(today.substring(0, 7))) return false;
      if (datePreset === 'custom') {
        if (customFrom && exp.date < customFrom) return false;
        if (customTo && exp.date > customTo) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = exp.title.toLowerCase().includes(q);
        const matchNum = exp.expenseNumber?.toLowerCase().includes(q);
        const matchNotes = exp.notes?.toLowerCase().includes(q);
        const matchUser = exp.approvedBy.toLowerCase().includes(q) || exp.recordedBy?.toLowerCase().includes(q);
        const matchAmount = exp.amount.toString().includes(q);
        if (!matchTitle && !matchNum && !matchNotes && !matchUser && !matchAmount) return false;
      }

      return true;
    });
  }, [expenses, categoryFilter, currencyFilter, employeeFilter, datePreset, customFrom, customTo, searchQuery, today]);

  // Aggregate Metrics
  const totalExpensesEGP = useMemo(() => {
    return filteredExpenses
      .filter(e => (e.currency || 'EGP') === 'EGP')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const totalExpensesUSD = useMemo(() => {
    return filteredExpenses
      .filter(e => e.currency === 'USD')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const getCategoryLabel = (cat: ExpenseCategory) => {
    const map: Record<ExpenseCategory, string> = {
      rent: 'إيجار',
      utilities: 'كهرباء وإنترنت ومرافق',
      salaries: 'مرتبات وأجور',
      marketing: 'تسويق وإعلانات',
      operations: 'مصروفات تشغيل',
      maintenance: 'صيانة',
      supplies: 'أدوات مكتبية ومشتريات',
      other: 'أخرى'
    };
    return map[cat] || cat;
  };

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'rent':
        return <Building className="w-4 h-4 text-blue-500" />;
      case 'utilities':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'salaries':
        return <Users className="w-4 h-4 text-emerald-500" />;
      case 'marketing':
        return <Megaphone className="w-4 h-4 text-purple-500" />;
      case 'operations':
        return <Settings className="w-4 h-4 text-teal-500" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-orange-500" />;
      case 'supplies':
        return <ShoppingBag className="w-4 h-4 text-indigo-500" />;
      default:
        return <MoreHorizontal className="w-4 h-4 text-zinc-500" />;
    }
  };

  // Handle Add Expense Submit
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) {
      showToast('error', 'بيانات ناقصة', 'يرجى إدخال بيان المصروف والمبلغ بشكل صحيح');
      return;
    }

    const attachmentsList = attachmentName.trim() ? [attachmentName.trim()] : undefined;

    const newExp = db.addExpense(
      {
        expenseNumber: expenseNumber.trim() || `EXP-${Date.now().toString().slice(-4)}`,
        title: title.trim(),
        category,
        amount,
        currency,
        usdExchangeRate: currency === 'USD' ? usdRate : undefined,
        paidFromVault,
        vaultId: 'main_vault',
        paymentMethod: paidFromVault ? 'نقدية من الخزنة الرئيسية' : paymentMethod,
        department,
        recordedBy,
        notes: (reason ? `السبب: ${reason} | ` : '') + (notes ? notes : ''),
        invoiceNumber: invoiceNumber.trim() || undefined,
        attachments: attachmentsList,
        approvedBy: user?.fullName || user?.username || recordedBy,
        date
      },
      user?.fullName || user?.username || recordedBy,
      user
    );

    showToast('success', 'تم تسجيل المصروف', `تم تسجيل المصروف ${newExp.title} وخصمه فوراً من الخزنة`);
    setIsAddExpenseOpen(false);

    // Reset fields
    setTitle('');
    setAmount(0);
    setReason('');
    setNotes('');
    setInvoiceNumber('');
    setAttachmentName('');
    setExpenseNumber(`EXP-${Math.floor(1000 + Math.random() * 9000)}`);
    handleRefresh();
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredExpenses.map(e => ({
      'رقم المصروف': e.expenseNumber || e.id,
      'التاريخ': formatDate(e.date),
      'نوع المصروف': getCategoryLabel(e.category),
      'البيان': e.title,
      'القيمة': e.amount,
      'العملة': e.currency || 'EGP',
      'المصدر المالي': e.paidFromVault ? 'الخزنة الرئيسية' : e.paymentMethod,
      'القسم': e.department || '-',
      'المسؤول': e.recordedBy || e.approvedBy,
      'رقم الفاتورة': e.invoiceNumber || '-',
      'الملاحظات': e.notes || '-'
    }));
    exportToExcel(data, `سجل_المصروفات_${today}`);
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
            <Receipt className="w-6 h-6 text-rose-500" />
            المصروفات وبنود الصرف (Company Expenses)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            تسجيل كافة النفقات والمشتريات والرواتب مع خصم فوري ومباشر من الخزنة الرئيسية وتوثيق الفواتير
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
            onClick={() => setIsAddExpenseOpen(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
          >
            + تسجيل مصروف جديد
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-500 block">إجمالي المصروفات (جنيه)</span>
          <span className="text-xl font-black text-rose-600 dark:text-rose-400 block mt-1 font-mono">
            {formatCurrency(totalExpensesEGP)}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">حسب نتائج الفلترة</span>
        </Card>

        <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-500 block">إجمالي المصروفات (دولار)</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400 block mt-1 font-mono">
            ${totalExpensesUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">مصروفات بالنقد الأجنبي</span>
        </Card>

        <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-500 block">عدد بنود الصرف</span>
          <span className="text-xl font-black text-zinc-900 dark:text-white block mt-1">
            {filteredExpenses.length} سند
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">موثقة بالدفتر</span>
        </Card>

        <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-500 block">طريقة الصرف الأكثر استخداماً</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
            الخزنة الرئيسية (نقدية)
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">خصم فوري مباشر</span>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="بحث برقم المصروف، البيان، المسؤول، الفاتورة..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-zinc-400" />}
            />
          </div>

          <div>
            <select
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="all">كل التصنيفات</option>
              <option value="rent">إيجار</option>
              <option value="utilities">كهرباء وإنترنت ومرافق</option>
              <option value="salaries">مرتبات وأجور</option>
              <option value="marketing">تسويق وإعلانات</option>
              <option value="operations">مصروفات تشغيل</option>
              <option value="maintenance">صيانة</option>
              <option value="supplies">أدوات مكتبية ومشتريات</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div>
            <select
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
              value={currencyFilter}
              onChange={e => setCurrencyFilter(e.target.value)}
            >
              <option value="all">كل العملات</option>
              <option value="EGP">جنيه مصري (EGP)</option>
              <option value="USD">دولار أمريكي (USD)</option>
            </select>
          </div>

          <div>
            <select
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
              value={datePreset}
              onChange={e => setDatePreset(e.target.value as any)}
            >
              <option value="all">كل الأوقات</option>
              <option value="today">مصروفات اليوم</option>
              <option value="month">الشهر الحالي</option>
              <option value="custom">فترة مخصصة</option>
            </select>
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-200 dark:border-zinc-800">
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">من تاريخ:</label>
              <input
                type="date"
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b]"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">إلى تاريخ:</label>
              <input
                type="date"
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b]"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Expenses Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-3">رقم المصروف</th>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3">نوع المصروف</th>
                <th className="p-3">البيان والسبب</th>
                <th className="p-3">القيمة والعملة</th>
                <th className="p-3">الخزنة / المصدر</th>
                <th className="p-3">الموظف المنفذ</th>
                <th className="p-3">القسم</th>
                <th className="p-3">الفاتورة / المرفق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-500">
                    لا توجد مصروفات مسجلة تطابق خيارات البحث
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => {
                  const isUSD = exp.currency === 'USD';

                  return (
                    <tr key={exp.id} className="hover:bg-zinc-500/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {exp.expenseNumber || exp.id.slice(-8)}
                      </td>
                      <td className="p-3 text-zinc-500">
                        {formatDate(exp.date)}
                        <span className="block text-[10px] text-zinc-400">
                          {formatDateTime(exp.createdAt).split(' ')[1]}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-bold">
                          {getCategoryIcon(exp.category)}
                          <span>{getCategoryLabel(exp.category)}</span>
                        </div>
                      </td>
                      <td className="p-3 max-w-xs truncate text-zinc-900 dark:text-white font-medium" title={exp.title}>
                        {exp.title}
                        {exp.notes && (
                          <span className="block text-[10px] text-zinc-400 truncate">{exp.notes}</span>
                        )}
                      </td>
                      <td className="p-3 font-black text-rose-600 dark:text-rose-400 font-mono">
                        -{isUSD ? `$${exp.amount.toFixed(2)}` : formatCurrency(exp.amount)}
                        {isUSD && exp.usdExchangeRate && (
                          <span className="block text-[10px] text-zinc-400">
                            معادل: {formatCurrency(exp.amount * exp.usdExchangeRate)}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="success" size="sm">
                          {exp.paidFromVault ? 'الخزنة الرئيسية' : exp.paymentMethod}
                        </Badge>
                      </td>
                      <td className="p-3 text-zinc-700 dark:text-zinc-300">
                        {exp.recordedBy || exp.approvedBy}
                      </td>
                      <td className="p-3 text-zinc-500">
                        {exp.department || 'عام'}
                      </td>
                      <td className="p-3">
                        {exp.invoiceNumber ? (
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold block">
                            فاتورة #{exp.invoiceNumber}
                          </span>
                        ) : null}
                        {exp.attachments && exp.attachments.length > 0 && (
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Paperclip className="w-3 h-3 text-emerald-500" />
                            {exp.attachments[0]}
                          </span>
                        )}
                        {!exp.invoiceNumber && (!exp.attachments || exp.attachments.length === 0) && '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title="💸 تسجيل مصروف جديد وخصمه من الخزنة"
        maxWidth="xl"
      >
        <form onSubmit={handleAddExpenseSubmit} className="space-y-4 text-right">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                رقم المصروف:
              </label>
              <Input
                required
                value={expenseNumber}
                onChange={e => setExpenseNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                تاريخ المصروف:
              </label>
              <input
                type="date"
                required
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                بيان المصروف (العنوان):
              </label>
              <Input
                required
                placeholder="مثال: فاتورة كهرباء المقر، أدوات مكتبية وأوراق، صيانة حواسيب..."
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                نوع / بند المصروف:
              </label>
              <select
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                value={category}
                onChange={e => setCategory(e.target.value as any)}
              >
                <option value="rent">إيجار</option>
                <option value="utilities">كهرباء وإنترنت ومرافق</option>
                <option value="salaries">مرتبات وأجور</option>
                <option value="marketing">تسويق وإعلانات</option>
                <option value="operations">مصروفات تشغيل</option>
                <option value="maintenance">صيانة</option>
                <option value="supplies">أدوات مكتبية ومشتريات</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                القسم المستفيد:
              </label>
              <select
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                value={department}
                onChange={e => setDepartment(e.target.value)}
              >
                <option value="قسم الزبائن">قسم الزبائن</option>
                <option value="قسم التجار">قسم التجار</option>
                <option value="قسم الوساطة">قسم الوساطة</option>
                <option value="الإدارة العامة">الإدارة العامة</option>
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                العملة:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrency('EGP')}
                  className={`p-2 rounded-xl border text-xs font-bold ${
                    currency === 'EGP'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                  }`}
                >
                  جنيه مصري (EGP)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`p-2 rounded-xl border text-xs font-bold ${
                    currency === 'USD'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                  }`}
                >
                  دولار أمريكي (USD)
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                قيمة المصروف:
              </label>
              <Input
                type="number"
                step="0.01"
                required
                min="0.01"
                placeholder={currency === 'USD' ? '50.00' : '500'}
                value={amount || ''}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              />
            </div>

            {currency === 'USD' && (
              <div className="sm:col-span-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs">
                <span className="text-blue-900 dark:text-blue-300">سعر صرف الدولار المعتمد:</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-24 p-1 rounded border border-blue-300 text-xs font-mono text-center"
                  value={usdRate}
                  onChange={e => setUsdRate(parseFloat(e.target.value) || 0)}
                />
                <span className="font-bold font-mono text-blue-800 dark:text-blue-200">
                  المعادل: {formatCurrency(amount * usdRate)}
                </span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                الخزنة / مصدر الخصم:
              </label>
              <select
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                value={paidFromVault ? 'vault' : 'other'}
                onChange={e => setPaidFromVault(e.target.value === 'vault')}
              >
                <option value="vault">الخزنة الرئيسية (خصم نقدية فوري)</option>
                <option value="other">محفظة أو بنك خارجي</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                الموظف الذي سجل العملية:
              </label>
              <Input
                required
                value={recordedBy}
                onChange={e => setRecordedBy(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                رقم الفاتورة (اختياري):
              </label>
              <Input
                placeholder="INV-9982"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                المرفقات / اسم المستند (اختياري):
              </label>
              <Input
                placeholder="إيصال استلام، فاتورة ضريبية..."
                value={attachmentName}
                onChange={e => setAttachmentName(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                سبب المصروف وملاحظات تفصيلية:
              </label>
              <textarea
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                rows={2}
                placeholder="تفاصيل الشراء أو مبرر الصرف..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddExpenseOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-500 text-white font-bold">
              تأكيد الصرف وخصم المبلغ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
