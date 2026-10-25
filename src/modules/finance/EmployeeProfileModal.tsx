import React, { useState, useMemo } from 'react';
import { Modal } from '../../components/common/Modal';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Employee } from '../../types/finance.types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { db } from '../../database/db';
import {
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  Download,
  MessageSquare,
  Edit2
} from 'lucide-react';

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEditEmployee?: (emp: Employee) => void;
  onOpenSalaryModal?: (emp: Employee) => void;
  onOpenAttendanceModal?: (emp: Employee) => void;
  onOpenDeductionModal?: (emp: Employee, type: 'deduction' | 'bonus') => void;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  isOpen,
  onClose,
  employee,
  onEditEmployee,
  onOpenSalaryModal,
  onOpenAttendanceModal,
  onOpenDeductionModal
}) => {
  // Tabs: 'attendance' | 'salaries' | 'deductions' | 'leaves' | 'info'
  const [activeTab, setActiveTab] = useState<'attendance' | 'salaries' | 'deductions' | 'leaves' | 'info'>('attendance');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [attendanceSearch, setAttendanceSearch] = useState('');

  // Always compute hooks before returning
  const employeeId = employee?.id || '';

  // 1. Fetch All Attendance Records for this employee
  const employeeAttendance = useMemo(() => {
    if (!employeeId) return [];
    const all = db.getAttendance();
    return all
      .filter(a => a.employeeId === employeeId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [employeeId, isOpen]);

  // 2. Fetch All Salary Slips for this employee
  const employeeSalaries = useMemo(() => {
    if (!employeeId) return [];
    const all = db.getSalaries();
    return all
      .filter(s => s.employeeId === employeeId)
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [employeeId, isOpen]);

  // Current Month String (YYYY-MM)
  const currentMonth = new Date().toISOString().substring(0, 7);

  // Current Month Slip
  const currentMonthSlip = useMemo(() => {
    return employeeSalaries.find(s => s.month === currentMonth);
  }, [employeeSalaries, currentMonth]);

  // 3. Extract Leaves Records
  const employeeLeaves = useMemo(() => {
    return employeeAttendance.filter(a => a.status === 'leave');
  }, [employeeAttendance]);

  // 4. Extract Absent Records
  const employeeAbsents = useMemo(() => {
    return employeeAttendance.filter(a => a.status === 'absent');
  }, [employeeAttendance]);

  // 5. Total Metrics
  const totalPaidHistorical = useMemo(() => {
    return employeeSalaries
      .filter(s => s.isPaid)
      .reduce((sum, s) => sum + s.totalSalary, 0);
  }, [employeeSalaries]);

  const totalBonusesHistorical = useMemo(() => {
    return employeeSalaries.reduce((sum, s) => sum + (s.bonuses || 0), 0);
  }, [employeeSalaries]);

  const totalDeductionsHistorical = useMemo(() => {
    return employeeSalaries.reduce((sum, s) => sum + (s.deductions || 0), 0);
  }, [employeeSalaries]);

  const currentMonthAttendanceCount = useMemo(() => {
    return employeeAttendance.filter(a => a.date.startsWith(currentMonth) && a.status === 'present').length;
  }, [employeeAttendance, currentMonth]);

  const currentMonthWorkHours = useMemo(() => {
    return employeeAttendance
      .filter(a => a.date.startsWith(currentMonth) && a.status === 'present')
      .reduce((sum, a) => sum + (a.workHours || 0), 0);
  }, [employeeAttendance, currentMonth]);

  // Filtered Attendance list
  const filteredAttendance = useMemo(() => {
    let list = [...employeeAttendance];
    if (selectedMonthFilter !== 'all') {
      list = list.filter(a => a.date.startsWith(selectedMonthFilter));
    }
    if (attendanceSearch.trim()) {
      const q = attendanceSearch.trim().toLowerCase();
      list = list.filter(a =>
        a.date.includes(q) ||
        (a.notes && a.notes.toLowerCase().includes(q)) ||
        a.status.toLowerCase().includes(q)
      );
    }
    return list;
  }, [employeeAttendance, selectedMonthFilter, attendanceSearch]);

  // Available Months for filtering
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    employeeAttendance.forEach(a => monthsSet.add(a.date.substring(0, 7)));
    employeeSalaries.forEach(s => monthsSet.add(s.month));
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [employeeAttendance, employeeSalaries]);

  if (!employee) return null;

  // Export to Excel
  const handleExportEmployeeDossier = () => {
    const data = employeeAttendance.map(a => ({
      'كود الموظف': employee.employeeCode,
      'اسم الموظف': employee.fullName,
      'القسم': employee.department,
      'التاريخ': a.date,
      'ساعة الحضور': a.checkIn || '-',
      'ساعة الانصراف': a.checkOut || '-',
      'ساعات العمل': a.workHours || 0,
      'الحالة': a.status === 'present' ? 'حاضر' : a.status === 'leave' ? 'إجازة' : a.status === 'absent' ? 'غياب' : a.status,
      'الملاحظات': a.notes || '-'
    }));
    exportToExcel(data, `سجل_الموظف_${employee.fullName.replace(/\s+/g, '_')}`);
  };

  // Print Profile Dossier
  const handlePrintDossier = () => {
    window.print();
  };

  // WhatsApp Link
  const cleanPhone = (employee.phone || '').replace(/[^0-9]/g, '');
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('2') ? cleanPhone : '2' + cleanPhone}` : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="5xl"
    >
      <div className="space-y-4 text-right print:p-0" dir="rtl">
        {/* ======================================================== */}
        {/* 1. HERO HEADER CARD                                      */}
        {/* ======================================================== */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-gray-900 via-[#18181B] to-gray-900 border border-purple-500/20 shadow-xl">
          <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Employee Basic Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black flex items-center justify-center text-2xl shadow-lg border-2 border-white/10 shrink-0">
                {employee.fullName.slice(0, 2)}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-white">
                    {employee.fullName}
                  </h2>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-white/10 text-zinc-300 font-bold border border-white/10">
                    {employee.employeeCode}
                  </span>
                  <Badge
                    variant={employee.status === 'active' ? 'success' : employee.status === 'on_leave' ? 'warning' : 'danger'}
                    className="text-[11px] font-bold"
                  >
                    {employee.status === 'active' ? '🟢 على رأس العمل' : employee.status === 'on_leave' ? '🏖️ في إجازة' : '🔴 معطل'}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                    <Building2 className="w-3.5 h-3.5" />
                    {employee.department}
                  </span>
                  <span className="inline-flex items-center gap-1 text-zinc-300 font-bold">
                    <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                    {employee.jobTitle}
                  </span>
                  <span className="inline-flex items-center gap-1 text-zinc-400 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    التعيين: {formatDate(employee.hireDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Communication Buttons */}
            <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>واتساب</span>
                </a>
              )}

              {employee.phone && (
                <a
                  href={`tel:${employee.phone}`}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="font-mono">{employee.phone}</span>
                </a>
              )}

              <Button
                variant="outline"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={handlePrintDossier}
                className="text-xs font-bold cursor-pointer"
              >
                طباعة الملف
              </Button>

              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportEmployeeDossier}
                className="text-xs font-bold cursor-pointer"
              >
                تصدير إكسل
              </Button>

              {onEditEmployee && (
                <button
                  type="button"
                  onClick={() => onEditEmployee(employee)}
                  title="تعديل بيانات الموظف"
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-zinc-300 border border-zinc-700 transition-all cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Action Bar under Hero */}
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenAttendanceModal && (
                <button
                  type="button"
                  onClick={() => onOpenAttendanceModal(employee)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>تسجيل حضور / انصراف</span>
                </button>
              )}

              {onOpenSalaryModal && (
                <button
                  type="button"
                  onClick={() => onOpenSalaryModal(employee)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>صرف راتب للشهر</span>
                </button>
              )}

              {onOpenDeductionModal && (
                <button
                  type="button"
                  onClick={() => onOpenDeductionModal(employee, 'deduction')}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>تسجيل خصم مالي</span>
                </button>
              )}

              {onOpenDeductionModal && (
                <button
                  type="button"
                  onClick={() => onOpenDeductionModal(employee, 'bonus')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تسجيل مكافأة وحافز</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-zinc-400 font-mono">
              كود السجل: <span className="text-zinc-200 font-bold">{employee.id}</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. STATS & KPIS CARDS                                     */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Base Salary */}
          <Card className="p-3 bg-gray-50/50 dark:bg-[#18181B]/50 border-gray-200 dark:border-[#27272A]">
            <span className="text-[11px] text-zinc-400 block font-bold">الراتب الأساسي الشهري</span>
            <div className="text-lg font-black text-emerald-500 font-mono mt-0.5">
              {formatCurrency(employee.baseSalary, 'EGP')}
            </div>
            <span className="text-[10px] text-zinc-500 block mt-0.5">العقد الوظيفي المعتمد</span>
          </Card>

          {/* Current Month Net Expected */}
          <Card className="p-3 bg-gray-50/50 dark:bg-[#18181B]/50 border-gray-200 dark:border-[#27272A]">
            <span className="text-[11px] text-zinc-400 block font-bold">صافي مستحق شهر ({currentMonth})</span>
            <div className="text-lg font-black text-blue-400 font-mono mt-0.5">
              {formatCurrency(currentMonthSlip ? currentMonthSlip.totalSalary : employee.baseSalary, 'EGP')}
            </div>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              {currentMonthSlip?.isPaid ? '🟢 تم الصرف' : '🟡 معلق بالمسير'}
            </span>
          </Card>

          {/* Current Month Attendance */}
          <Card className="p-3 bg-gray-50/50 dark:bg-[#18181B]/50 border-gray-200 dark:border-[#27272A]">
            <span className="text-[11px] text-zinc-400 block font-bold">حضور الشهر الحالي</span>
            <div className="text-lg font-black text-purple-400 font-mono mt-0.5">
              {currentMonthAttendanceCount} يوم
            </div>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              إجمالي الساعات: {currentMonthWorkHours} ساعة
            </span>
          </Card>

          {/* Total Historical Payouts */}
          <Card className="p-3 bg-gray-50/50 dark:bg-[#18181B]/50 border-gray-200 dark:border-[#27272A]">
            <span className="text-[11px] text-zinc-400 block font-bold">إجمالي الرواتب المصروفة</span>
            <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
              {formatCurrency(totalPaidHistorical, 'EGP')}
            </div>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              تاريخياً ({employeeSalaries.filter(s => s.isPaid).length} مسير)
            </span>
          </Card>
        </div>

        {/* ======================================================== */}
        {/* 3. NAVIGATION TABS                                       */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#27272A] pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-purple-600 text-white font-black shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>سجل الحضور والانصراف ({employeeAttendance.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('salaries')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'salaries'
                  ? 'bg-blue-600 text-white font-black shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>سجل الرواتب والمسيرات ({employeeSalaries.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('deductions')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'deductions'
                  ? 'bg-rose-600 text-white font-black shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>الخصومات والمكافآت</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('leaves')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'leaves'
                  ? 'bg-amber-600 text-white font-black shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>الإجازات والغياب ({employeeLeaves.length + employeeAbsents.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'info'
                  ? 'bg-zinc-700 text-white font-black shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>البيانات والملاحظات</span>
            </button>
          </div>

          {/* Month Filter Selector */}
          {activeTab === 'attendance' && availableMonths.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400">تصفية بالشهر:</span>
              <select
                value={selectedMonthFilter}
                onChange={e => setSelectedMonthFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-xs font-mono font-bold outline-none cursor-pointer"
              >
                <option value="all">كل الأشهر</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: ATTENDANCE & SHIFTS DETAIL                        */}
        {/* ======================================================== */}
        {activeTab === 'attendance' && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
              <table className="w-full text-xs text-right">
                <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">ساعة الحضور</th>
                    <th className="p-3">ساعة الانصراف</th>
                    <th className="p-3">ساعات العمل</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">الملاحظات والبيان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-400">
                        لا توجد حركات حضور مسجلة لهذا الموظف
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map(att => (
                      <tr key={att.id} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {formatDate(att.date)}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-500">
                          {att.checkIn || '-'}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-400">
                          {att.checkOut || '-'}
                        </td>
                        <td className="p-3 font-mono font-black">
                          {att.workHours ? `${att.workHours} ساعة` : '-'}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {att.status === 'present' ? (
                            att.checkOut && att.checkOut !== '-' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-400" />
                                تم الانصراف ({att.checkOut})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                حاضر ({att.checkIn})
                              </span>
                            )
                          ) : att.status === 'leave' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                              🏖️ إجازة
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              غياب
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-zinc-400">
                          {att.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SALARIES & PAYROLL DETAIL                         */}
        {/* ======================================================== */}
        {activeTab === 'salaries' && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
              <table className="w-full text-xs text-right">
                <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                  <tr>
                    <th className="p-3">الشهر</th>
                    <th className="p-3">الراتب الأساسي</th>
                    <th className="p-3">المكافآت</th>
                    <th className="p-3">الخصومات</th>
                    <th className="p-3">الصافي المستحق</th>
                    <th className="p-3">حالة الصرف</th>
                    <th className="p-3">طريقة الدفع</th>
                    <th className="p-3">البيان والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                  {employeeSalaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-zinc-400">
                        لا توجد مسيرات رواتب مسجلة لهذا الموظف
                      </td>
                    </tr>
                  ) : (
                    employeeSalaries.map(slip => (
                      <tr key={slip.id} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {slip.month}
                        </td>
                        <td className="p-3 font-mono">
                          {formatCurrency(slip.baseSalary, 'EGP')}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-500">
                          +{formatCurrency(slip.bonuses, 'EGP')}
                        </td>
                        <td className="p-3 font-mono font-bold text-rose-500">
                          -{formatCurrency(slip.deductions, 'EGP')}
                        </td>
                        <td className="p-3 font-mono font-black text-sm text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(slip.totalSalary, 'EGP')}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge variant={slip.isPaid ? 'success' : 'warning'} className="text-[10px]">
                            {slip.isPaid ? '🟢 تم الصرف' : '🟡 معلق'}
                          </Badge>
                        </td>
                        <td className="p-3 text-zinc-400">
                          {slip.paymentMethod || 'نقدية من الخزنة'}
                        </td>
                        <td className="p-3 text-zinc-400 max-w-xs truncate">
                          {slip.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: DEDUCTIONS & BONUSES LOG                          */}
        {/* ======================================================== */}
        {activeTab === 'deductions' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <span className="text-zinc-400 block font-bold">إجمالي المكافآت الممنوحة</span>
                <span className="text-lg font-black text-emerald-500 font-mono">
                  +{formatCurrency(totalBonusesHistorical, 'EGP')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                <span className="text-zinc-400 block font-bold">إجمالي الخصومات والجزاءات</span>
                <span className="text-lg font-black text-rose-500 font-mono">
                  -{formatCurrency(totalDeductionsHistorical, 'EGP')}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
              <table className="w-full text-xs text-right">
                <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                  <tr>
                    <th className="p-3">شهر المسير</th>
                    <th className="p-3">المكافآت الإضافية</th>
                    <th className="p-3">الخصومات المطبقة</th>
                    <th className="p-3">بيان الخصم أو المكافأة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                  {employeeSalaries.filter(s => (s.bonuses > 0 || s.deductions > 0)).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-400">
                        لا توجد خصومات أو مكافآت مسجلة في مسيرات هذا الموظف
                      </td>
                    </tr>
                  ) : (
                    employeeSalaries
                      .filter(s => (s.bonuses > 0 || s.deductions > 0))
                      .map(slip => (
                        <tr key={slip.id} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {slip.month}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-500">
                            {slip.bonuses > 0 ? `+${formatCurrency(slip.bonuses, 'EGP')}` : '-'}
                          </td>
                          <td className="p-3 font-mono font-bold text-rose-500">
                            {slip.deductions > 0 ? `-${formatCurrency(slip.deductions, 'EGP')}` : '-'}
                          </td>
                          <td className="p-3 text-zinc-400">
                            {slip.notes || 'تسوية مسير'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: LEAVES & ABSENCES DETAIL                          */}
        {/* ======================================================== */}
        {activeTab === 'leaves' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <span className="text-zinc-400 block font-bold">إجمالي أيام الإجازات</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  {employeeLeaves.length} يوم
                </span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                <span className="text-zinc-400 block font-bold">إجمالي أيام الغياب</span>
                <span className="text-lg font-black text-rose-400 font-mono">
                  {employeeAbsents.length} يوم
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
              <table className="w-full text-xs text-right">
                <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">النوع</th>
                    <th className="p-3">البيان والسبب المعتمد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                  {[...employeeLeaves, ...employeeAbsents].length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-zinc-400">
                        سجل الموظف خالي من أي أيام إجازة أو غياب مسجلة
                      </td>
                    </tr>
                  ) : (
                    [...employeeLeaves, ...employeeAbsents]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(rec => (
                        <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {formatDate(rec.date)}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <Badge
                              variant={rec.status === 'leave' ? 'warning' : 'danger'}
                              className="text-[10px]"
                            >
                              {rec.status === 'leave' ? '🏖️ إجازة رسمية / معتمدة' : '🔴 غياب'}
                            </Badge>
                          </td>
                          <td className="p-3 text-zinc-400">
                            {rec.notes || '-'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: EMPLOYEE PROFILE DOSSIER & NOTES                  */}
        {/* ======================================================== */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-2">
                <span className="text-xs font-bold text-zinc-400 block border-b border-gray-200 dark:border-[#27272A] pb-1">
                  📌 البيانات الإدارية
                </span>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">كود الموظف:</span>
                  <span className="font-mono font-bold text-zinc-200">{employee.employeeCode}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">القسم:</span>
                  <span className="font-bold text-blue-400">{employee.department}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">المسمى الوظيفي:</span>
                  <span className="font-bold text-zinc-200">{employee.jobTitle}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">تاريخ التعيين:</span>
                  <span className="font-mono text-zinc-300">{formatDate(employee.hireDate)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">الحالة الوظيفية:</span>
                  <span className="font-bold text-emerald-400">
                    {employee.status === 'active' ? 'على رأس العمل' : employee.status === 'on_leave' ? 'في إجازة' : 'معطل'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-2">
                <span className="text-xs font-bold text-zinc-400 block border-b border-gray-200 dark:border-[#27272A] pb-1">
                  📞 بيانات التواصل والمالية
                </span>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">رقم الهاتف:</span>
                  <span className="font-mono font-bold text-zinc-200">{employee.phone || 'غير مسجل'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">الرقم القومي:</span>
                  <span className="font-mono text-zinc-300">{employee.nationalId || 'غير مسجل'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">الراتب الأساسي:</span>
                  <span className="font-mono font-bold text-emerald-500">{formatCurrency(employee.baseSalary, 'EGP')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">تاريخ تسجيل الملف:</span>
                  <span className="font-mono text-zinc-400">{formatDate(employee.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <span className="text-xs font-bold text-zinc-400 block mb-2">
                📝 ملاحظات وسجل الإدارة:
              </span>
              <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {employee.notes || 'لا توجد ملاحظات إضافية مسجلة لهذا الموظف.'}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-[#27272A]">
          <span className="text-[11px] text-zinc-500">
            النظام المالي والموارد البشرية • ERP System
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="font-bold">
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};
