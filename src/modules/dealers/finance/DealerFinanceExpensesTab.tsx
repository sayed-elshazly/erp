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
  DollarSign,
  Trash2,
  Archive
} from 'lucide-react';

export const DealerFinanceExpensesTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const expenses = useMemo(() => db.getDealerExpenses(false), [refreshTrigger]);
  const employees = useMemo(() => db.getDealerEmployees(true), [refreshTrigger]);

  const today = new Date().toISOString().split('T')[0];

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] = useState<Expense | null>(null);

  // Form State
  const [expenseNumber, setExpenseNumber] = useState(`DEXP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('operations');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<'EGP' | 'USD'>('EGP');
  const [usdRate, setUsdRate] = useState<number>(50.0);
  const [paidFromVault, setPaidFromVault] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('نقدية من خزنة التجار الرئيسية');
  const [department] = useState('قسم التجار والموزعين');
  const [recordedBy, setRecordedBy] = useState(user?.fullName || user?.username || 'مسؤول حسابات التجار');
  const [reason, setReason] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
      if (currencyFilter !== 'all' && (exp.currency || 'EGP') !== currencyFilter) return false;

      const expDate = new Date(exp.date);
      const now = new Date();

      if (datePreset === 'today' && exp.date !== today) return false;
      if (datePreset === 'month' && !exp.date.startsWith(today.substring(0, 7))) return false;
      if (datePreset === 'year' && !exp.date.startsWith(today.substring(0, 4))) return false;
      if (datePreset === 'week') {
        const diffDays = (now.getTime() - expDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7 || diffDays < 0) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = exp.title.toLowerCase().includes(q);
        const matchNum = exp.expenseNumber?.toLowerCase().includes(q);
        const matchNotes = exp.notes?.toLowerCase().includes(q);
        const matchUser = exp.approvedBy?.toLowerCase().includes(q) || exp.recordedBy?.toLowerCase().includes(q);
        const matchAmount = exp.amount.toString().includes(q);
        if (!matchTitle && !matchNum && !matchNotes && !matchUser && !matchAmount) return false;
      }

      return true;
    });
  }, [expenses, categoryFilter, currencyFilter, datePreset, searchQuery, today]);

  // Statistics (Today, Week, Month, Year)
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = today.substring(0, 7);
    const currentYear = today.substring(0, 4);

    let sumToday = 0;
    let sumWeek = 0;
    let sumMonth = 0;
    let sumYear = 0;

    expenses.forEach(e => {
      const amt = (e.currency === 'USD' ? e.amount * (e.usdExchangeRate || 50) : e.amount) || 0;
      if (e.date === today) sumToday += amt;
      if (e.date.startsWith(currentMonth)) sumMonth += amt;
      if (e.date.startsWith(currentYear)) sumYear += amt;

      const expDate = new Date(e.date);
      const diffDays = (now.getTime() - expDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 7 && diffDays >= 0) sumWeek += amt;
    });

    return { sumToday, sumWeek, sumMonth, sumYear };
  }, [expenses, today]);

  // Save Expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) {
      showToast('error', 'بيانات غير مكتملة', 'يرجى إدخال اسم المصروف وقيمة صحيحة');
      return;
    }

    db.addDealerExpense(
      {
        expenseNumber,
        title,
        category,
        amount,
        currency,
        usdExchangeRate: currency === 'USD' ? usdRate : undefined,
        paidFromVault,
        paymentMethod,
        department,
        recordedBy,
        approvedBy: user?.fullName || 'مسؤول الحسابات',
        date,
        invoiceNumber,
        notes: reason ? `${reason} | ${notes}` : notes
      },
      user
    );

    showToast(
      'success',
      'تم تسجيل المصروف',
      `تم تسجيل المصروف "${title}" بمبلغ ${formatCurrency(amount)} ${paidFromVault ? '(مع الخصم من خزنة التجار)' : ''}`
    );

    setIsAddExpenseOpen(false);
    setTitle('');
    setAmount(0);
    setNotes('');
    setReason('');
    setInvoiceNumber('');
    setExpenseNumber(`DEXP-${Math.floor(1000 + Math.random() * 9000)}`);
    handleRefresh();
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredExpenses.map(exp => ({
      'رقم السند': exp.expenseNumber,
      'التاريخ': formatDate(exp.date),
      'اسم المصروف': exp.title,
      'التصنيف': exp.category,
      'المبلغ': exp.amount,
      'العملة': exp.currency || 'EGP',
      'الخصم من الخزنة': exp.paidFromVault ? 'نعم (خصم فوري)' : 'لا',
      'طريقة السداد': exp.paymentMethod,
      'المسؤول': exp.approvedBy || exp.recordedBy,
      'ملاحظات': exp.notes || ''
    }));
    exportToExcel(data, `مصروفات_قسم_التجار_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-500" />
              سجل مصروفات قسم التجار والموزعين
            </h2>
            <Badge variant="warning" size="sm">خصم مباشر من خزنة التجار</Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            إثبات مصروفات تشغيل قطاع الجملة، الإيجارات، الفواتير، ونثريات الموزعين مع إمكانية الخصم الفوري من الخزنة الرئيسية
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
            onClick={() => setIsAddExpenseOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
          >
            إضافة مصروف تجار جديد
          </Button>
        </div>
      </div>

      {/* 4 Statistics Cards: Today, Week, Month, Year */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] text-zinc-500 font-bold block">مصروفات اليوم</span>
          <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 block font-mono">
            {formatCurrency(stats.sumToday)}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">{today}</span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] text-zinc-500 font-bold block">مصروفات آخر 7 أيام</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block font-mono">
            {formatCurrency(stats.sumWeek)}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">الأسبوع الجاري</span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] text-zinc-500 font-bold block">مصروفات الشهر الحالي</span>
          <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 block font-mono">
            {formatCurrency(stats.sumMonth)}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">شهر {today.substring(0, 7)}</span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] text-zinc-500 font-bold block">مصروفات السنة التراكمية</span>
          <span className="text-xl font-black text-zinc-900 dark:text-white mt-1 block font-mono">
            {formatCurrency(stats.sumYear)}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">عام {today.substring(0, 4)}</span>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
        <div>
          <Input
            type="text"
            placeholder="بحث باسم المصروف، السند، الملاحظات..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="text-xs"
          />
        </div>

        <div>
          <select
            className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">كل التصنيفات</option>
            <option value="operations">تشغيلية وعامة</option>
            <option value="salaries">رواتب وأجور</option>
            <option value="rent">إيجارات ومقرات</option>
            <option value="utilities">فواتير ومرافق (كهرباء، نت)</option>
            <option value="marketing">تسويق وإعلانات</option>
            <option value="maintenance">صيانة وتطوير</option>
          </select>
        </div>

        <div>
          <select
            className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
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
            className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            value={datePreset}
            onChange={e => setDatePreset(e.target.value as any)}
          >
            <option value="all">كل الفترات الزمنية</option>
            <option value="today">اليوم فقط</option>
            <option value="week">الأسبوع الجاري</option>
            <option value="month">الشهر الحالي</option>
            <option value="year">السنة الحالية</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-right">
          <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="p-3">رقم السند</th>
              <th className="p-3">التاريخ</th>
              <th className="p-3">اسم المصروف والبيان</th>
              <th className="p-3">التصنيف</th>
              <th className="p-3">المبلغ</th>
              <th className="p-3">الخصم من الخزنة</th>
              <th className="p-3">المسؤول</th>
              <th className="p-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-500">
                  لا توجد مصروفات مسجلة في قسم التجار
                </td>
              </tr>
            ) : (
              filteredExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {exp.expenseNumber}
                  </td>
                  <td className="p-3 font-mono text-zinc-500">
                    {formatDate(exp.date)}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-zinc-900 dark:text-white block">{exp.title}</span>
                    {exp.notes && <span className="text-[10px] text-zinc-400 block">{exp.notes}</span>}
                  </td>
                  <td className="p-3">
                    <Badge variant="default" size="sm">{exp.category}</Badge>
                  </td>
                  <td className="p-3 font-mono font-black text-rose-600 dark:text-rose-400">
                    -{formatCurrency(exp.amount)}
                  </td>
                  <td className="p-3">
                    {exp.paidFromVault ? (
                      <Badge variant="success" size="sm">خصم من خزنة التجار</Badge>
                    ) : (
                      <Badge variant="default" size="sm">خارجي / عهدة</Badge>
                    )}
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">
                    {exp.approvedBy || exp.recordedBy || 'الإدارة'}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Archive className="w-3.5 h-3.5 text-zinc-400 hover:text-amber-500" />}
                        title="أرشفة"
                        onClick={() => {
                          db.archiveDealerExpense(exp.id, user);
                          handleRefresh();
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                        title="حذف"
                        onClick={() => {
                          if (window.confirm(`هل أنت متأكد من حذف المصروف "${exp.title}"؟`)) {
                            db.deleteDealerExpense(exp.id, user);
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
      {/* ➕ MODAL: Add Dealer Expense */}
      {/* ========================================================================= */}
      {isAddExpenseOpen && (
        <Modal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          title="🧾 تسجيل مصروف جديد لقسم التجار"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveExpense} className="space-y-3 text-right" dir="rtl">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">رقم السند:</label>
                <Input
                  type="text"
                  required
                  value={expenseNumber}
                  onChange={e => setExpenseNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">التاريخ:</label>
                <Input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">اسم وبند المصروف:</label>
              <Input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: فاتورة إنترنت، صيانة أجهزة جملة..."
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">التصنيف:</label>
                <select
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                >
                  <option value="operations">تشغيلية وعامة</option>
                  <option value="salaries">رواتب وأجور</option>
                  <option value="rent">إيجارات ومقرات</option>
                  <option value="utilities">فواتير ومرافق</option>
                  <option value="marketing">تسويق وإعلانات</option>
                  <option value="maintenance">صيانة وتطوير</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">المبلغ:</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount || ''}
                  onChange={e => setAmount(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">العملة:</label>
                <select
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  value={currency}
                  onChange={e => setCurrency(e.target.value as any)}
                >
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                </select>
              </div>
            </div>

            {/* Direct Deduction Checkbox */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-500/30">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="paidFromVaultCheckbox"
                  checked={paidFromVault}
                  onChange={e => setPaidFromVault(e.target.checked)}
                  className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="paidFromVaultCheckbox" className="text-xs font-black text-amber-800 dark:text-amber-300 cursor-pointer">
                  خصم هذا المصروف مباشرة من خزنة التجار الرئيسية (تسجيل حركة سحب نقدية فورية)
                </label>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1 mr-5">
                عند التفعيل، سيتم إنقاص رصيد خزنة التجار بمقدار هذا المبلغ وتوثيقه في دفتر الأستاذ.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">طريقة السداد:</label>
                <Input
                  type="text"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">الموظف / المستفيد (اختياري):</label>
                <select
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  value={recordedBy}
                  onChange={e => setRecordedBy(e.target.value)}
                >
                  <option value={user?.fullName || 'مسؤول الحسابات'}>{user?.fullName || 'المستخدم الحالي'}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.fullName}>{emp.fullName} ({emp.jobTitle})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">ملاحظات وبيانات إضافية:</label>
              <textarea
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="أي تفاصيل عن الفاتورة أو المورد..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddExpenseOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                تسجيل المصروف
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default DealerFinanceExpensesTab;
