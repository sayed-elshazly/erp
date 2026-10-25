import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { Employee, AttendanceRecord, SalarySlip } from '../../../types/finance.types';
import { formatCurrency, formatDate, formatDateTime, getDaysInMonth, calculateDailyRate } from '../../../utils/formatters';
import { exportToExcel } from '../../../utils/excelExport';
import { ReportEngine } from '../../../services/reporting/reportEngine';
import { CustomerFinanceEmployeeProfileModal } from './CustomerFinanceEmployeeProfileModal';
import {
  Users,
  UserPlus,
  Search,
  Printer,
  Download,
  CalendarCheck,
  DollarSign,
  Briefcase,
  Phone,
  Clock,
  AlertCircle,
  FileCheck,
  Layers,
  Award,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  BellRing,
  LogIn,
  LogOut,
  UserX,
  Calendar,
  CalendarDays
} from 'lucide-react';

export const CustomerFinanceEmployeesTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const employees = useMemo(() => db.getEmployees(true), [refreshTrigger]);
  const attendance = useMemo(() => db.getAttendance(), [refreshTrigger]);
  const salaries = useMemo(() => db.getSalaries(), [refreshTrigger]);

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().substring(0, 7);
  const dayOfMonth = new Date().getDate();

  // Metrics
  const activeEmployees = employees.filter(e => e.status === 'active');
  const todaysAttendance = attendance.filter(a => a.date === today);
  const absentTodayCount = employees.filter(e => {
    const rec = todaysAttendance.find(a => a.employeeId === e.id);
    return rec ? rec.status === 'absent' : false;
  }).length;
  const onLeaveTodayCount = employees.filter(e => e.status === 'on_leave').length;

  const totalBaseSalaries = employees.reduce((sum, e) => sum + e.baseSalary, 0);

  // Accurate count of active employees whose salary for current month has not been paid
  const paidEmployeeIds = useMemo(() => {
    return new Set(salaries.filter(s => s.month === currentMonth && s.isPaid).map(s => s.employeeId));
  }, [salaries, currentMonth]);
  const unpaidEmployees = useMemo(() => {
    return activeEmployees.filter(e => !paidEmployeeIds.has(e.id));
  }, [activeEmployees, paidEmployeeIds]);
  const isPayrollDueNotice = dayOfMonth >= 1 && unpaidEmployees.length > 0;

  // Modals state
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [selectedEmployeeForProfile, setSelectedEmployeeForProfile] = useState<Employee | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<
    'attendance' | 'absence' | 'payroll' | 'deductions' | 'incentives' | 'full'
  >('full');

  // Attendance & Leave Action Modal State
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedEmpForAttendance, setSelectedEmpForAttendance] = useState<Employee | null>(null);
  const [attendanceActionTab, setAttendanceActionTab] = useState<'check_in' | 'check_out' | 'absent' | 'leave'>('check_in');
  const [attDate, setAttDate] = useState(today);
  const [attTime, setAttTime] = useState('');
  const [attWorkHours, setAttWorkHours] = useState(8);
  const [attNotes, setAttNotes] = useState('');

  // Absence state
  const [absenceReason, setAbsenceReason] = useState('غياب غير مبرر');
  const [absenceApplyDeduction, setAbsenceApplyDeduction] = useState(false);
  const [absenceDeductionAmount, setAbsenceDeductionAmount] = useState(0);

  // Leave state
  const [leaveType, setLeaveType] = useState('سنوية');
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveStartDate, setLeaveStartDate] = useState(today);
  const [leaveEndDate, setLeaveEndDate] = useState(today);
  const [leaveReason, setLeaveReason] = useState('إجازة اعتيادية');

  // New Employee Form State
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState(`EMP-${Math.floor(100 + Math.random() * 900)}`);
  const [job, setJob] = useState('موظف خدمة عملاء');
  const [jobTitle, setJobTitle] = useState('موظف خدمة عملاء');
  const [department, setDepartment] = useState('قسم الزبائن');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [hireDate, setHireDate] = useState(today);
  const [baseSalary, setBaseSalary] = useState<number>(5000);
  const [salaryPayoutDay, setSalaryPayoutDay] = useState<number>(1);
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'on_leave' | 'inactive'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [salaryStatusFilter, setSalaryStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
      if (departmentFilter !== 'all' && emp.department !== departmentFilter) return false;
      if (salaryStatusFilter === 'unpaid' && paidEmployeeIds.has(emp.id)) return false;
      if (salaryStatusFilter === 'paid' && !paidEmployeeIds.has(emp.id)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(q);
        const matchCode = emp.employeeCode.toLowerCase().includes(q);
        const matchPhone = emp.phone.toLowerCase().includes(q);
        const matchTitle = emp.jobTitle.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone && !matchTitle) return false;
      }
      return true;
    });
  }, [employees, statusFilter, departmentFilter, salaryStatusFilter, searchQuery, paidEmployeeIds]);

  // Handle Add Employee
  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || baseSalary <= 0) {
      showToast('error', 'بيانات ناقصة', 'يرجى ملء جميع الحقول الإلزامية وتحديد راتب صحيح');
      return;
    }

    const dailyRate = calculateDailyRate(baseSalary);
    const newEmp: Employee = {
      id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      employeeCode: employeeCode.trim() || `EMP-${Date.now().toString().slice(-4)}`,
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim() || undefined,
      department,
      job,
      jobTitle,
      baseSalary,
      dailyRate,
      salaryPayoutDay: Number(salaryPayoutDay) || 1,
      workStartTime,
      workEndTime,
      hireDate,
      status: 'active',
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    db.saveEmployee(newEmp, user);

    // Auto-create a User account linked to this employee for login & transaction tracking
    try {
      const autoUsername = fullName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '') || `emp_${Date.now()}`;
      const existingUsers = db.getUsers();
      const usernameExists = existingUsers.some(u => u.username === autoUsername);
      const finalUsername = usernameExists ? `${autoUsername}_${Date.now().toString().slice(-4)}` : autoUsername;

      const newUser = {
        id: `usr_${newEmp.id}`,
        username: finalUsername,
        fullName: fullName.trim(),
        password: '123456',
        role: 'employee' as const,
        department: 'customers' as const,
        jobTitle: jobTitle,
        isActive: true,
        permissions: ['view' as const, 'add' as const, 'edit' as const, 'print' as const],
        createdAt: new Date().toISOString()
      };
      db.saveUser(newUser);
      showToast('info', 'تم إنشاء حساب مستخدم تلقائياً', `اسم المستخدم: ${finalUsername} — كلمة المرور: 123456`);
    } catch (err) {
      console.error('Failed to auto-create user for employee', err);
    }

    showToast('success', 'تمت إضافة الموظف', `تم تسجيل الموظف ${newEmp.fullName} بنجاح`);
    setIsAddEmployeeOpen(false);

    // Reset fields
    setFullName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setBaseSalary(5000);
    setWorkStartTime('09:00');
    setWorkEndTime('17:00');
    setJob('موظف خدمة عملاء');
    setJobTitle('موظف خدمة عملاء');
    setEmployeeCode(`EMP-${Math.floor(100 + Math.random() * 900)}`);
    handleRefresh();
  };

  // Export Reports
  const handleGenerateReport = (type: typeof selectedReportType) => {
    if (type === 'payroll') {
      const data = employees.map(emp => {
        const slip = salaries.find(s => s.employeeId === emp.id && s.month === currentMonth);
        return {
          'كود الموظف': emp.employeeCode,
          'الاسم': emp.fullName,
          'الوظيفة': emp.jobTitle,
          'الراتب الأساسي': emp.baseSalary,
          'المكافآت': slip?.bonuses || 0,
          'الخصومات': slip?.deductions || 0,
          'صافي الراتب': slip ? slip.totalSalary : emp.baseSalary,
          'حالة الصرف': slip?.isPaid ? 'تم الصرف' : 'مستحق',
          'يوم الصرف': `يوم ${emp.salaryPayoutDay || 1}`
        };
      });
      exportToExcel(data, `تقرير_رواتب_${currentMonth}`);
    } else if (type === 'attendance') {
      const data = attendance.map(a => ({
        'التاريخ': formatDate(a.date),
        'اسم الموظف': a.employeeName,
        'القسم': a.department,
        'وقت الحضور': a.checkIn || '-',
        'وقت الانصراف': a.checkOut || '-',
        'ساعات العمل': a.workHours || 0,
        'الحالة': a.status === 'present' ? 'حاضر' : a.status === 'late' ? 'متأخر' : a.status === 'absent' ? 'غائب' : 'إجازة'
      }));
      exportToExcel(data, `تقرير_الحضور_${today}`);
    } else if (type === 'absence') {
      const data = attendance.filter(a => a.status === 'absent').map(a => ({
        'التاريخ': formatDate(a.date),
        'اسم الموظف': a.employeeName,
        'القسم': a.department,
        'السبب': a.notes || 'غير مبرر'
      }));
      exportToExcel(data, `تقرير_الغياب_${today}`);
    } else {
      const data = employees.map(emp => ({
        'الكود': emp.employeeCode,
        'الاسم': emp.fullName,
        'المسمى الوظيفي': emp.jobTitle,
        'القسم': emp.department,
        'الهاتف': emp.phone,
        'العنوان': emp.address || '-',
        'تاريخ التعيين': formatDate(emp.hireDate),
        'الراتب الأساسي': emp.baseSalary,
        'يوم الصرف': emp.salaryPayoutDay || 1,
        'الحالة': emp.status === 'active' ? 'نشط' : emp.status === 'on_leave' ? 'إجازة' : 'غير نشط'
      }));
      exportToExcel(data, `كادر_الموظفين_${today}`);
    }
  };

  const handlePrint = () => {
    const config = {
      startDate: '',
      endDate: '',
      reportType: 'detailed' as const,
      showProfits: true,
      showCosts: true,
      showExpenses: true,
      showLogo: true,
      showUserData: true,
      showPageNumbers: true,
      showManagerSignature: true,
      paperSize: 'A4' as const,
      orientation: 'portrait' as const
    };
    const doc = ReportEngine.generateReportDocument(
      'payroll',
      config,
      { month: currentMonth },
      user?.fullName || user?.username || 'الإدارة المالية'
    );
    ReportEngine.printReportDocument(doc, config);
  };

  // Helpers for leave date and days calculation
  const calculateEndDateFromDays = (start: string, days: number): string => {
    if (!start || days < 1) return start;
    const d = new Date(start);
    d.setDate(d.getDate() + (days - 1));
    return d.toISOString().split('T')[0];
  };

  const calculateDaysFromDates = (start: string, end: string): number => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  const handleLeaveDaysChange = (daysVal: number) => {
    const val = Math.max(1, daysVal);
    setLeaveDays(val);
    setLeaveEndDate(calculateEndDateFromDays(leaveStartDate, val));
  };

  const handleLeaveStartDateChange = (startVal: string) => {
    setLeaveStartDate(startVal);
    setLeaveEndDate(calculateEndDateFromDays(startVal, leaveDays));
  };

  const handleLeaveEndDateChange = (endVal: string) => {
    setLeaveEndDate(endVal);
    setLeaveDays(calculateDaysFromDates(leaveStartDate, endVal));
  };

  const handleOpenAttendanceModal = (emp: Employee, initialTab: 'check_in' | 'check_out' | 'absent' | 'leave' = 'check_in') => {
    setSelectedEmpForAttendance(emp);
    setAttendanceActionTab(initialTab);
    setAttDate(today);
    setAttTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }));
    setAttWorkHours(8);
    setAttNotes('');
    setAbsenceReason('غياب غير مبرر');
    setAbsenceApplyDeduction(false);
    setAbsenceDeductionAmount(Math.round(calculateDailyRate(emp.baseSalary, attDate || today)));
    setLeaveType('سنوية');
    setLeaveDays(1);
    setLeaveStartDate(today);
    setLeaveEndDate(today);
    setLeaveReason('إجازة اعتيادية');
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendanceAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForAttendance) return;

    try {
      if (attendanceActionTab === 'check_in') {
        db.recordAttendanceCheckIn(selectedEmpForAttendance.id, attTime, attNotes);
        showToast('success', 'تسجيل حضور', `تم تسجيل حضور الموظف ${selectedEmpForAttendance.fullName} بنجاح الساعة ${attTime}`);
      } else if (attendanceActionTab === 'check_out') {
        db.recordAttendanceCheckOut(selectedEmpForAttendance.id, attTime, attWorkHours, attNotes);
        showToast('success', 'تسجيل انصراف', `تم تسجيل انصراف الموظف ${selectedEmpForAttendance.fullName} بنجاح الساعة ${attTime}`);
      } else if (attendanceActionTab === 'absent') {
        db.recordAttendanceAbsence(
          selectedEmpForAttendance.id,
          attDate,
          absenceReason,
          1,
          absenceApplyDeduction ? absenceDeductionAmount : undefined,
          user,
          attTime
        );
        showToast('warning', 'تسجيل غياب', `تم تسجيل غياب الموظف ${selectedEmpForAttendance.fullName} ليوم ${attDate} الساعة ${attTime}${absenceApplyDeduction ? ` مع خصم ${formatCurrency(absenceDeductionAmount)}` : ''}`);
      } else if (attendanceActionTab === 'leave') {
        db.recordAttendanceLeave(
          selectedEmpForAttendance.id,
          leaveStartDate,
          leaveEndDate,
          leaveDays,
          leaveType,
          leaveReason,
          user,
          attTime
        );
        showToast('success', 'تسجيل إجازة', `تم تسجيل إجازة (${leaveType}) للموظف ${selectedEmpForAttendance.fullName} لمدة ${leaveDays} يوم (من ${leaveStartDate} إلى ${leaveEndDate}) الساعة ${attTime}`);
      }
      setIsAttendanceModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      showToast('error', 'خطأ في الحركة', err.message || 'حدث خطأ أثناء حفظ الحركة');
    }
  };

  return (
    <div className="space-y-5 text-right">
      {/* 1st of Month Salary Alert Notice */}
      {isPayrollDueNotice && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-amber-900 dark:text-amber-200">
                🔔 تنبيه دوري: موعد صرف رواتب الموظفين (شهر {currentMonth})
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                حلت بداية الشهر ويوجد <strong className="text-amber-900 dark:text-amber-100 underline">{unpaidEmployees.length} موظفاً</strong> لم يتم صرف رواتبهم لشهر ({currentMonth}) حتى الآن.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white/80 dark:bg-zinc-800/80 border-amber-500/30 text-amber-900 dark:text-amber-200 font-bold"
              onClick={() => {
                setSalaryStatusFilter(prev => prev === 'unpaid' ? 'all' : 'unpaid');
              }}
            >
              {salaryStatusFilter === 'unpaid' ? 'عرض كل الموظفين' : `تصفية المستحقين للصرف (${unpaidEmployees.length})`}
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold shrink-0"
              onClick={() => handleGenerateReport('payroll')}
            >
              استخراج كشف المرتبات
            </Button>
          </div>
        </div>
      )}

      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-500" />
            شؤون الموظفين والرواتب وسجل الحضور (HR Management)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            إدارة شاملة لكادر العمل، البروفايل، الحضور والانصراف، السلف، الخصومات، ومسيرات الرواتب الشهرية
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            icon={<FileCheck className="w-4 h-4 text-blue-500" />}
            onClick={() => setIsReportModalOpen(true)}
          >
            التقارير المتخصصة
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
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => setIsAddEmployeeOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            + إضافة موظف جديد
          </Button>
        </div>
      </div>

      {/* 5 KPI Cards for HR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-500 block">إجمالي الموظفين</span>
          <span className="text-xl font-black text-zinc-900 dark:text-white block mt-1">
            {employees.length} موظف
          </span>
          <span className="text-[10px] text-emerald-600 block mt-0.5 font-semibold">
            {activeEmployees.length} على رأس العمل
          </span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-500 block">الغائبون اليوم</span>
          <span className="text-xl font-black text-rose-600 dark:text-rose-400 block mt-1">
            {absentTodayCount}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">من واقع سجل اليوم</span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-500 block">في إجازة</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 block mt-1">
            {onLeaveTodayCount}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">إجازات معتمدة</span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-500 block">إجمالي الرواتب الأساسية</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-1 font-mono">
            {formatCurrency(totalBaseSalaries)}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">شهرياً للموظفين</span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] font-bold text-zinc-500 block">الرواتب المستحقة هذا الشهر</span>
          <span className="text-xl font-black text-purple-600 dark:text-purple-400 block mt-1 font-mono">
            {unpaidEmployees.length > 0 ? `${unpaidEmployees.length} مستحق` : 'مسددة بالكامل'}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">شهر {currentMonth}</span>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="بحث بالاسم، الكود، المسمى الوظيفي، الهاتف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-zinc-400" />}
            />
          </div>

          <div>
            <select
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
            >
              <option value="all">كل الحالات الوظيفية</option>
              <option value="active">نشط (على رأس العمل)</option>
              <option value="on_leave">في إجازة</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          <div>
            <select
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
            >
              <option value="all">كل الأقسام</option>
              <option value="قسم الزبائن">قسم الزبائن</option>
              <option value="قسم التجار">قسم التجار</option>
              <option value="قسم الوساطة">قسم الوساطة</option>
              <option value="الحسابات والمالية">الحسابات والمالية</option>
            </select>
          </div>

          <div>
            <select
              className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white font-bold"
              value={salaryStatusFilter}
              onChange={e => setSalaryStatusFilter(e.target.value as any)}
            >
              <option value="all">كل حالات الرواتب ({currentMonth})</option>
              <option value="unpaid">بانتظار الصرف ({unpaidEmployees.length})</option>
              <option value="paid">تم الصرف بنجاح ({paidEmployeeIds.size})</option>
            </select>
          </div>
        </div>

        {/* Employees Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-3">الكود</th>
                <th className="p-3">اسم الموظف</th>
                <th className="p-3">المسمى الوظيفي</th>
                <th className="p-3">القسم</th>
                <th className="p-3">الهاتف</th>
                <th className="p-3">الراتب الأساسي</th>
                <th className="p-3">يوم الصرف</th>
                <th className="p-3">تاريخ التعيين</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">راتب شهر {currentMonth}</th>
                <th className="p-3 text-center min-w-[210px]">دوام اليوم وحركات الحضور</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-zinc-500">
                    لا يوجد موظفون مسجلون يطابقون خيارات البحث
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const empTodayAtt = todaysAttendance.find(a => a.employeeId === emp.id);
                  const isPaidThisMonth = paidEmployeeIds.has(emp.id);
                  return (
                  <tr
                    key={emp.id}
                    className="hover:bg-zinc-500/5 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedEmployeeForProfile(emp);
                      setIsProfileOpen(true);
                    }}
                  >
                    <td className="p-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      {emp.employeeCode}
                    </td>
                    <td className="p-3 font-bold text-zinc-900 dark:text-white">
                      {emp.fullName}
                    </td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-300">
                      {emp.jobTitle}
                    </td>
                    <td className="p-3 text-zinc-500">
                      {emp.department}
                    </td>
                    <td className="p-3 font-mono text-zinc-600 dark:text-zinc-400">
                      {emp.phone}
                    </td>
                    <td className="p-3 font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(emp.baseSalary)}
                    </td>
                    <td className="p-3 font-bold text-blue-600 dark:text-blue-400">
                      يوم {emp.salaryPayoutDay || 1}
                    </td>
                    <td className="p-3 text-zinc-500">
                      {formatDate(emp.hireDate)}
                    </td>
                    <td className="p-3">
                      <Badge variant={emp.status === 'active' ? 'success' : emp.status === 'on_leave' ? 'warning' : 'default'} size="sm">
                        {emp.status === 'active' ? 'نشط' : emp.status === 'on_leave' ? 'إجازة' : 'غير نشط'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      {isPaidThisMonth ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          تم الصرف
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmployeeForProfile(emp);
                            setIsProfileOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-white transition-all cursor-pointer"
                          title="الضغط للمراجعة وصرف الراتب"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          بانتظار الصرف
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col items-center gap-1.5">
                        {/* Status pill for today */}
                        {emp.status === 'on_leave' || empTodayAtt?.status === 'leave' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                            في إجازة {empTodayAtt?.leaveDays ? `(${empTodayAtt.leaveDays} يوم)` : ''}
                          </span>
                        ) : empTodayAtt?.status === 'absent' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <UserX className="w-3.5 h-3.5 text-rose-500" />
                            غائب اليوم
                          </span>
                        ) : empTodayAtt?.status === 'present' ? (
                          empTodayAtt.checkOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                              <LogOut className="w-3.5 h-3.5 text-blue-500" />
                              انصرف ({empTodayAtt.checkOut})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                              حاضر ({empTodayAtt.checkIn || 'اليوم'})
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20">
                            لم يسجل اليوم
                          </span>
                        )}

                        {/* Quick action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="تسجيل حضور للموظف"
                            onClick={() => handleOpenAttendanceModal(emp, 'check_in')}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1 active:scale-95"
                          >
                            <LogIn className="w-3 h-3" />
                            حضور
                          </button>
                          <button
                            type="button"
                            title="تسجيل انصراف للموظف"
                            onClick={() => handleOpenAttendanceModal(emp, 'check_out')}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-all flex items-center gap-1 active:scale-95"
                          >
                            <LogOut className="w-3 h-3" />
                            انصراف
                          </button>
                          <button
                            type="button"
                            title="تسجيل غياب للموظف"
                            onClick={() => handleOpenAttendanceModal(emp, 'absent')}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1 active:scale-95"
                          >
                            <UserX className="w-3 h-3" />
                            غياب
                          </button>
                          <button
                            type="button"
                            title="تسجيل إجازة للموظف (تحديد الأيام والتاريخ)"
                            onClick={() => handleOpenAttendanceModal(emp, 'leave')}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1 active:scale-95"
                          >
                            <CalendarDays className="w-3 h-3" />
                            إجازة
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedEmployeeForProfile(emp);
                          setIsProfileOpen(true);
                        }}
                        className="text-xs"
                      >
                        البروفايل الكامل ➔
                      </Button>
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

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
        title="👤 إنشاء موظف جديد في النظام"
        maxWidth="xl"
      >
        <form onSubmit={handleAddEmployeeSubmit} className="space-y-4 text-right">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                اسم الموظف بالكامل:
              </label>
              <Input
                required
                placeholder="الاسم الرباعي للموظف"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                كود الموظف (تلقائي أو مخصص):
              </label>
              <Input
                required
                placeholder="EMP-101"
                value={employeeCode}
                onChange={e => setEmployeeCode(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                الوظيفة / الدور:
              </label>
              <select
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                value={job}
                onChange={e => { setJob(e.target.value); setJobTitle(e.target.value); }}
              >
                <option value="موظف خدمة عملاء">موظف خدمة عملاء</option>
                <option value="مسؤول عن قسم">مسؤول عن قسم</option>
                <option value="مشرف">مشرف</option>
                <option value="موظف شحن">موظف شحن</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                المسمى الوظيفي:
              </label>
              <select
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
              >
                <option value="موظف خدمة عملاء">موظف خدمة عملاء</option>
                <option value="مسؤول عن قسم">مسؤول عن قسم</option>
                <option value="مشرف">مشرف</option>
                <option value="موظف شحن">موظف شحن</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                القسم التابع له:
              </label>
              <select
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                value={department}
                onChange={e => setDepartment(e.target.value)}
              >
                <option value="قسم الزبائن">قسم الزبائن</option>
                <option value="قسم التجار">قسم التجار</option>
                <option value="قسم الوساطة">قسم الوساطة</option>
                <option value="الحسابات والمالية">الحسابات والمالية</option>
                <option value="الدعم الفني">الدعم الفني</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                رقم الهاتف:
              </label>
              <Input
                required
                placeholder="01012345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                العنوان (اختياري):
              </label>
              <Input
                placeholder="محافظة - مدينة - شارع"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                تاريخ التعيين:
              </label>
              <input
                type="date"
                required
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                value={hireDate}
                onChange={e => setHireDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                الراتب الأساسي (جنيه):
              </label>
              <Input
                type="number"
                step="0.01"
                required
                min="1"
                placeholder="5000"
                value={baseSalary || ''}
                onChange={e => setBaseSalary(parseFloat(e.target.value) || 0)}
              />
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
                سعر اليوم المحسوب تلقائياً: {formatCurrency(calculateDailyRate(baseSalary))} (الراتب ÷ {getDaysInMonth()})
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                يوم صرف الراتب من كل شهر:
              </label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="1"
                value={salaryPayoutDay}
                onChange={e => setSalaryPayoutDay(parseInt(e.target.value) || 1)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                ميعاد بدء العمل المعتاد (الحضور):
              </label>
              <Input
                type="time"
                required
                value={workStartTime}
                onChange={e => setWorkStartTime(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                ميعاد نهاية العمل المعتاد (الانصراف):
              </label>
              <Input
                type="time"
                required
                value={workEndTime}
                onChange={e => setWorkEndTime(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                ملاحظات:
              </label>
              <textarea
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                rows={2}
                placeholder="أي شروط تعاقدية أو ملاحظات خاصة بالموظف..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddEmployeeOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500">
              حفظ الموظف
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reports Generator Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="📑 استخراج التقارير المتخصصة لشؤون الموظفين"
        maxWidth="lg"
      >
        <div className="space-y-4 text-right">
          <p className="text-xs text-zinc-500">اختر نوع التقرير المطلوب لتصديره لملف Excel فوري:</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleGenerateReport('payroll')}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-right transition-all flex items-center gap-2.5"
            >
              <DollarSign className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <span className="font-bold text-xs block text-zinc-900 dark:text-white">تقرير المرتبات والمستحقات</span>
                <span className="text-[10px] text-zinc-500 block">مسيرات الشهر والأساسي والصافي</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleGenerateReport('attendance')}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/5 text-right transition-all flex items-center gap-2.5"
            >
              <CalendarCheck className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <span className="font-bold text-xs block text-zinc-900 dark:text-white">تقرير الحضور والانصراف</span>
                <span className="text-[10px] text-zinc-500 block">ساعات الدخول والخروج وساعات العمل</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleGenerateReport('absence')}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-rose-500/50 hover:bg-rose-500/5 text-right transition-all flex items-center gap-2.5"
            >
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <span className="font-bold text-xs block text-zinc-900 dark:text-white">تقرير الغياب والجزاءات</span>
                <span className="text-[10px] text-zinc-500 block">أيام الغياب والتأخيرات غير المبررة</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleGenerateReport('full')}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-500/50 hover:bg-purple-500/5 text-right transition-all flex items-center gap-2.5"
            >
              <FileCheck className="w-5 h-5 text-purple-500 shrink-0" />
              <div>
                <span className="font-bold text-xs block text-zinc-900 dark:text-white">التقرير الشامل للموظفين</span>
                <span className="text-[10px] text-zinc-500 block">كافة بيانات الكادر الوظيفي والاتصال</span>
              </div>
            </button>
          </div>

          <div className="flex justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button size="sm" variant="secondary" onClick={() => setIsReportModalOpen(false)}>
              إغلاق
            </Button>
          </div>
        </div>
      </Modal>

      {/* Attendance & Leave Action Modal */}
      <Modal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        title={
          selectedEmpForAttendance
            ? `⏱️ تسجيل الدوام والحركات - ${selectedEmpForAttendance.fullName} (${selectedEmpForAttendance.employeeCode})`
            : '⏱️ تسجيل الحضور والدوام والإجازات'
        }
        maxWidth="lg"
      >
        {selectedEmpForAttendance && (
          <div className="space-y-4 text-right">
            {/* Employee Quick Info Header */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-zinc-900 dark:text-white block">
                  {selectedEmpForAttendance.fullName}
                </span>
                <span className="text-xs text-zinc-500">
                  {selectedEmpForAttendance.jobTitle} • {selectedEmpForAttendance.department}
                </span>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-zinc-400 block">الراتب الأساسي</span>
                <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(selectedEmpForAttendance.baseSalary)}
                </span>
              </div>
            </div>

            {/* Action Tabs Selector */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
              <button
                type="button"
                onClick={() => setAttendanceActionTab('check_in')}
                className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  attendanceActionTab === 'check_in'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                حضور
              </button>
              <button
                type="button"
                onClick={() => setAttendanceActionTab('check_out')}
                className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  attendanceActionTab === 'check_out'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                انصراف
              </button>
              <button
                type="button"
                onClick={() => setAttendanceActionTab('absent')}
                className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  attendanceActionTab === 'absent'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                غياب
              </button>
              <button
                type="button"
                onClick={() => setAttendanceActionTab('leave')}
                className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  attendanceActionTab === 'leave'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                إجازة
              </button>
            </div>

            <form onSubmit={handleSaveAttendanceAction} className="space-y-4">
              {/* TAB 1: CHECK-IN */}
              {attendanceActionTab === 'check_in' && (
                <div className="space-y-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1">
                    <LogIn className="w-4 h-4" />
                    تسجيل حضور وبدء الدوام اليومي
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        تاريخ الحضور
                      </label>
                      <Input
                        type="date"
                        value={attDate}
                        onChange={e => setAttDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        وقت الحضور
                      </label>
                      <Input
                        type="text"
                        value={attTime}
                        onChange={e => setAttTime(e.target.value)}
                        placeholder="مثال: 09:00 ص"
                        required
                      />
                      <div className="flex gap-1.5 mt-1">
                        {['الوقت الحالي', '08:00 ص', '09:00 ص', '10:00 ص'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              if (t === 'الوقت الحالي') {
                                setAttTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }));
                              } else {
                                setAttTime(t);
                              }
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-500/20"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      ملاحظات الحضور (اختياري)
                    </label>
                    <Input
                      type="text"
                      value={attNotes}
                      onChange={e => setAttNotes(e.target.value)}
                      placeholder="حضور مبكر، إذن خاص، وردية صباحية..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: CHECK-OUT */}
              {attendanceActionTab === 'check_out' && (
                <div className="space-y-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs mb-1">
                    <LogOut className="w-4 h-4" />
                    تسجيل انصراف ونهاية الدوام
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        وقت الانصراف
                      </label>
                      <Input
                        type="text"
                        value={attTime}
                        onChange={e => setAttTime(e.target.value)}
                        placeholder="مثال: 05:00 م"
                        required
                      />
                      <div className="flex gap-1.5 mt-1">
                        {['الوقت الحالي', '04:00 م', '05:00 م', '06:00 م'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              if (t === 'الوقت الحالي') {
                                setAttTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }));
                              } else {
                                setAttTime(t);
                              }
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-blue-500/20"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        إجمالي ساعات العمل
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="24"
                        value={attWorkHours}
                        onChange={e => setAttWorkHours(Number(e.target.value))}
                        required
                      />
                      <div className="flex gap-1.5 mt-1">
                        {[4, 6, 8, 9, 10].map(h => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setAttWorkHours(h)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-blue-500/20"
                          >
                            {h} ساعات
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      ملاحظات الانصراف (اختياري)
                    </label>
                    <Input
                      type="text"
                      value={attNotes}
                      onChange={e => setAttNotes(e.target.value)}
                      placeholder="إتمام المهام، ساعات إضافية، مغادرة مبكرة..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: ABSENCE */}
              {attendanceActionTab === 'absent' && (
                <div className="space-y-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs mb-1">
                    <UserX className="w-4 h-4" />
                    تسجيل غياب موظف وتحديد الخصومات
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        تاريخ الغياب
                      </label>
                      <Input
                        type="date"
                        value={attDate}
                        onChange={e => setAttDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        ساعة التسجيل
                      </label>
                      <Input
                        type="time"
                        value={attTime}
                        onChange={e => setAttTime(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        سبب الغياب
                      </label>
                      <select
                        value={absenceReason}
                        onChange={e => setAbsenceReason(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white"
                      >
                        <option value="غياب بدون إذن مسبق">غياب بدون إذن مسبق</option>
                        <option value="تأخر حاد وغير مبرر">تأخر حاد وغير مبرر</option>
                        <option value="انقطاع مفاجئ عن العمل">انقطاع مفاجئ عن العمل</option>
                        <option value="ظرف عائلي طارئ">ظرف عائلي طارئ</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                  </div>

                  {/* Optional Deduction */}
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={absenceApplyDeduction}
                        onChange={e => setAbsenceApplyDeduction(e.target.checked)}
                        className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        تطبيق خصم مالي مباشر من راتب الموظف لهذا الشهر
                      </span>
                    </label>

                    {absenceApplyDeduction && (
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 block mb-1">
                            مبلغ الخصم (ج.م)
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={absenceDeductionAmount}
                            onChange={e => setAbsenceDeductionAmount(Number(e.target.value))}
                            required={absenceApplyDeduction}
                          />
                        </div>
                        <div className="text-[11px] text-zinc-500 self-end pb-2">
                          أجر اليوم التقريبي:{' '}
                          <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                            {formatCurrency(Math.round(calculateDailyRate(selectedEmpForAttendance.baseSalary, attDate)))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: LEAVE / VACATION */}
              {attendanceActionTab === 'leave' && (
                <div className="space-y-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs mb-1">
                    <CalendarDays className="w-4 h-4" />
                    تسجيل واعتماد إجازة رسمية / اعتيادية للموظف
                  </div>

                  {/* Leave Type & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        نوع الإجازة
                      </label>
                      <select
                        value={leaveType}
                        onChange={e => setLeaveType(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-white font-bold"
                      >
                        <option value="سنوية">إجازة سنوية اعتيادية</option>
                        <option value="مرضية">إجازة مرضية (بتقرير طبي)</option>
                        <option value="عارضة">إجازة عارضة طارئة</option>
                        <option value="رسمية">إجازة رسمية / أعياد ومناسبات</option>
                        <option value="بدون راتب">إجازة غير مدفوعة (بدون راتب)</option>
                        <option value="حج وعمرة">إجازة حج وعمرة</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        ساعة تسجيل الإجازة
                      </label>
                      <Input
                        type="time"
                        value={attTime}
                        onChange={e => setAttTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Days Count & Quick Duration Chips */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        مدة الإجازة (كم يوم)
                      </label>
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                        {leaveDays} {leaveDays === 1 ? 'يوم' : leaveDays === 2 ? 'يومان' : leaveDays > 10 ? 'يوماً' : 'أيام'}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={leaveDays}
                      onChange={e => handleLeaveDaysChange(Number(e.target.value))}
                      required
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {[
                        { label: '1 يوم', days: 1 },
                        { label: '2 يوم', days: 2 },
                        { label: '3 أيام', days: 3 },
                        { label: 'أسبوع (7 أيام)', days: 7 },
                        { label: 'أسبوعين (14 يوم)', days: 14 },
                        { label: 'شهر (30 يوم)', days: 30 }
                      ].map(chip => (
                        <button
                          key={chip.days}
                          type="button"
                          onClick={() => handleLeaveDaysChange(chip.days)}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                            leaveDays === chip.days
                              ? 'bg-amber-600 text-white border-amber-600 font-bold'
                              : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-500'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range: From Date to Date (Live Synchronized) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        من تاريخ (بداية الإجازة)
                      </label>
                      <Input
                        type="date"
                        value={leaveStartDate}
                        onChange={e => handleLeaveStartDateChange(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        إلى تاريخ (نهاية الإجازة)
                      </label>
                      <Input
                        type="date"
                        value={leaveEndDate}
                        min={leaveStartDate}
                        onChange={e => handleLeaveEndDateChange(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      السبب أو ملاحظات الإجازة
                    </label>
                    <Input
                      type="text"
                      value={leaveReason}
                      onChange={e => setLeaveReason(e.target.value)}
                      placeholder="إجازة اعتيادية، سفر، راحة مرضية..."
                    />
                  </div>

                  {/* Calculation & Confirmation Summary Card */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ملخص الإجازة المعتمدة:
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-300 pr-5">
                      • الفترة: من <span className="font-bold font-mono text-zinc-900 dark:text-white">{leaveStartDate}</span> إلى <span className="font-bold font-mono text-zinc-900 dark:text-white">{leaveEndDate}</span> ({leaveDays} أيام عمل)
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 pr-5">
                      • سيتم تلقائياً تحديث حالة الموظف في النظام إلى "في إجازة" وتوثيق كل يوم في سجل الدوام الرسمي.
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAttendanceModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant={
                    attendanceActionTab === 'check_in'
                      ? 'primary'
                      : attendanceActionTab === 'check_out'
                      ? 'primary'
                      : attendanceActionTab === 'absent'
                      ? 'danger'
                      : 'primary'
                  }
                  className={`font-bold ${
                    attendanceActionTab === 'check_in'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : attendanceActionTab === 'check_out'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : attendanceActionTab === 'absent'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {attendanceActionTab === 'check_in' && '✅ تأكيد تسجيل الحضور'}
                  {attendanceActionTab === 'check_out' && '✅ تأكيد تسجيل الانصراف'}
                  {attendanceActionTab === 'absent' && '⚠️ تسجيل الغياب والخصم'}
                  {attendanceActionTab === 'leave' && '🌴 اعتماد وتسجيل الإجازة'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Employee Profile Modal */}
      {selectedEmployeeForProfile && (
        <CustomerFinanceEmployeeProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          employee={selectedEmployeeForProfile}
          onEmployeeUpdated={handleRefresh}
        />
      )}
    </div>
  );
};
