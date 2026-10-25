import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { Employee } from '../../../types/finance.types';
import { formatCurrency, formatDate, getDaysInMonth, calculateDailyRate } from '../../../utils/formatters';
import { exportToExcel } from '../../../utils/excelExport';
import { DealerFinanceEmployeeProfileModal } from './DealerFinanceEmployeeProfileModal';
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
  LogIn,
  LogOut,
  UserX,
  Calendar,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  User
} from 'lucide-react';

export const DealerFinanceEmployeesTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const employees = useMemo(() => db.getDealerEmployees(true), [refreshTrigger]);
  const attendance = useMemo(() => db.getDealerAttendance(), [refreshTrigger]);
  const salaries = useMemo(() => db.getDealerSalaries(), [refreshTrigger]);

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

  // Unpaid current month salaries notice
  const unpaidSlips = salaries.filter(s => s.month === currentMonth && !s.isPaid);
  const isPayrollDueNotice = dayOfMonth >= 1 && (unpaidSlips.length > 0 || employees.length > 0);

  // Modals state
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [selectedEmployeeForProfile, setSelectedEmployeeForProfile] = useState<Employee | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

  // Leave state (2-way sync days <-> dates)
  const [leaveType, setLeaveType] = useState('سنوية');
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveStartDate, setLeaveStartDate] = useState(today);
  const [leaveEndDate, setLeaveEndDate] = useState(today);
  const [leaveReason, setLeaveReason] = useState('إجازة اعتيادية');

  // Handle leave days count change -> update end date
  const handleLeaveDaysChange = (days: number) => {
    const d = Math.max(1, days);
    setLeaveDays(d);
    try {
      const s = new Date(leaveStartDate);
      s.setDate(s.getDate() + (d - 1));
      setLeaveEndDate(s.toISOString().split('T')[0]);
    } catch {}
  };

  // Handle leave start date change -> update end date
  const handleLeaveStartDateChange = (date: string) => {
    setLeaveStartDate(date);
    try {
      const s = new Date(date);
      s.setDate(s.getDate() + (leaveDays - 1));
      setLeaveEndDate(s.toISOString().split('T')[0]);
    } catch {}
  };

  // Handle leave end date change -> update days count
  const handleLeaveEndDateChange = (date: string) => {
    setLeaveEndDate(date);
    try {
      const s = new Date(leaveStartDate);
      const e = new Date(date);
      const diffTime = e.getTime() - s.getTime();
      const diffDays = Math.max(1, Math.round(diffTime / (1000 * 3600 * 24)) + 1);
      setLeaveDays(diffDays);
    } catch {}
  };

  // New Employee Form State
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState(`EMP-D${Math.floor(10 + Math.random() * 90)}`);
  const [job, setJob] = useState('موظف خدمة عملاء');
  const [jobTitle, setJobTitle] = useState('موظف خدمة عملاء');
  const [department] = useState('قسم التجار والموزعين');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [hireDate, setHireDate] = useState(today);
  const [baseSalary, setBaseSalary] = useState<number>(7500);
  const [salaryPayoutDay, setSalaryPayoutDay] = useState<number>(1);
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  const [empNotes, setEmpNotes] = useState('');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'on_leave' | 'inactive'>('all');

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(q);
        const matchCode = emp.employeeCode?.toLowerCase().includes(q);
        const matchPhone = emp.phone?.includes(q);
        const matchJob = emp.jobTitle?.toLowerCase().includes(q) || emp.job?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone && !matchJob) return false;
      }
      return true;
    });
  }, [employees, statusFilter, searchQuery]);

  // Open Attendance Action Modal for an Employee
  const handleOpenAttendanceModal = (
    emp: Employee,
    tab: 'check_in' | 'check_out' | 'absent' | 'leave' = 'check_in'
  ) => {
    setSelectedEmpForAttendance(emp);
    setAttendanceActionTab(tab);
    setAttDate(today);
    setAttTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }));
    setAttWorkHours(8);
    setAttNotes('');
    setAbsenceReason('غياب بدون إذن مسبق');
    setAbsenceApplyDeduction(false);
    setAbsenceDeductionAmount(Math.round(calculateDailyRate(emp.baseSalary, attDate || today)));
    setLeaveType('سنوية');
    setLeaveDays(1);
    setLeaveStartDate(today);
    setLeaveEndDate(today);
    setLeaveReason('إجازة اعتيادية');
    setIsAttendanceModalOpen(true);
  };

  // Submit Attendance Action
  const handleSubmitAttendanceAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForAttendance) return;

    if (attendanceActionTab === 'check_in') {
      db.recordDealerAttendanceCheckIn(selectedEmpForAttendance.id, attTime, attNotes, attDate);
      showToast('success', 'تم تسجيل الحضور', `تم تسجيل حضور الموظف ${selectedEmpForAttendance.fullName} في تمام الساعة ${attTime}`);
    } else if (attendanceActionTab === 'check_out') {
      db.recordDealerAttendanceCheckOut(selectedEmpForAttendance.id, attTime, attWorkHours, attNotes, attDate);
      showToast('success', 'تم تسجيل الانصراف', `تم تسجيل انصراف الموظف ${selectedEmpForAttendance.fullName}`);
    } else if (attendanceActionTab === 'absent') {
      db.recordDealerAttendanceAbsence(
        selectedEmpForAttendance.id,
        attDate,
        absenceReason,
        absenceApplyDeduction ? absenceDeductionAmount : 0,
        user,
        attTime
      );
      showToast(
        'warning',
        'تم تسجيل الغياب',
        `تم تسجيل غياب الموظف ${selectedEmpForAttendance.fullName} بتاريخ ${attDate} الساعة ${attTime} ${absenceApplyDeduction ? `مع خصم ${formatCurrency(absenceDeductionAmount)}` : ''}`
      );
    } else if (attendanceActionTab === 'leave') {
      db.recordDealerAttendanceLeave(
        selectedEmpForAttendance.id,
        leaveStartDate,
        leaveEndDate,
        leaveDays,
        leaveType,
        leaveReason,
        user,
        attTime
      );
      showToast(
        'success',
        'تم اعتماد الإجازة',
        `تم تسجيل إجازة ${leaveType} للموظف ${selectedEmpForAttendance.fullName} لمدة ${leaveDays} أيام (الساعة ${attTime})`
      );
    }

    setIsAttendanceModalOpen(false);
    handleRefresh();
  };

  // Save New Employee
  const handleSaveNewEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      showToast('error', 'بيانات ناقصة', 'يرجى إدخال اسم الموظف ورقم هاتفه');
      return;
    }

    const dailyRate = calculateDailyRate(Number(baseSalary) || 7500);
    const newEmp: Employee = {
      id: `demp_${Date.now()}`,
      employeeCode,
      fullName,
      job,
      jobTitle,
      department: 'قسم التجار والموزعين',
      phone,
      address,
      hireDate,
      baseSalary: Number(baseSalary) || 7500,
      dailyRate,
      salaryPayoutDay: Number(salaryPayoutDay) || 1,
      workStartTime,
      workEndTime,
      status: 'active',
      notes: empNotes,
      createdAt: new Date().toISOString(),
      advances: [],
      incentives: [],
      attachments: []
    };

    db.saveDealerEmployee(newEmp, user);
    showToast('success', 'تمت إضافة الموظف', `تم تسجيل الموظف ${fullName} بكود ${employeeCode}`);

    setIsAddEmployeeOpen(false);
    setFullName('');
    setPhone('');
    setAddress('');
    setEmpNotes('');
    setWorkStartTime('09:00');
    setWorkEndTime('17:00');
    setJob('موظف خدمة عملاء');
    setJobTitle('موظف خدمة عملاء');
    setEmployeeCode(`EMP-D${Math.floor(10 + Math.random() * 90)}`);
    handleRefresh();
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredEmployees.map(emp => {
      const todayRec = todaysAttendance.find(a => a.employeeId === emp.id);
      return {
        'كود الموظف': emp.employeeCode,
        'الاسم': emp.fullName,
        'الوظيفة': emp.jobTitle || emp.job,
        'القسم': emp.department,
        'رقم الهاتف': emp.phone,
        'الراتب الأساسي': emp.baseSalary,
        'تاريخ التعيين': formatDate(emp.hireDate),
        'حالة اليوم': todayRec?.status === 'present' ? 'حاضر' : todayRec?.status === 'absent' ? 'غائب' : todayRec?.status === 'leave' ? 'إجازة' : 'لم يسجل',
        'حالة الحساب': emp.status === 'active' ? 'نشط' : 'في إجازة'
      };
    });
    exportToExcel(data, `موظفو_قسم_التجار_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* 🔔 1st of the Month Payroll Notification Banner */}
      {isPayrollDueNotice && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border border-amber-500/30 flex items-start sm:items-center justify-between gap-4 shadow-sm animate-pulse-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
              1
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                تنبيه دوري: موعد صرف رواتب كادر قسم التجار (شهر {currentMonth})
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                حان اليوم موعد صرف استحقاقات ورواتب موظفي قسم التجار. يمكنك استعراض مسير كل موظف وصرفه مباشرة من خزنة التجار مع طباعة الفاتورة الرسمية A4.
              </p>
            </div>
          </div>

          <Badge variant="warning" size="md">
            يوم الراتب الشهري
          </Badge>
        </div>
      )}

      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              كادر موظفي قسم التجار والموزعين
            </h2>
            <Badge variant="warning" size="sm">شؤون الموظفين والرواتب</Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            إدارة موظفي جملة الشحن، تسجيل الحضور والانصراف، الغياب مع خصم الراتب، الإجازات، ومسيرات الرواتب وفواتير الصرف
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
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => setIsAddEmployeeOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
          >
            إضافة موظف تجار جديد
          </Button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] text-zinc-500 font-bold block">إجمالي كادر التجار</span>
          <span className="text-xl font-black text-zinc-900 dark:text-white mt-1 block">
            {employees.length} موظف
          </span>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
            {activeEmployees.length} على رأس العمل
          </span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] text-zinc-500 font-bold block">إجمالي الرواتب الأساسية</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block font-mono">
            {formatCurrency(totalBaseSalaries)}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">
            مستحقة أول كل شهر
          </span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] text-zinc-500 font-bold block">حضور اليوم</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {todaysAttendance.filter(a => a.status === 'present').length} موظف
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 block">
            بتاريخ: {today}
          </span>
        </Card>

        <Card className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
          <span className="text-[11px] text-zinc-500 font-bold block">الغياب والإجازات اليوم</span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">
              {absentTodayCount} غائب
            </span>
            <span className="text-zinc-300">|</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {onLeaveTodayCount} إجازة
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">
            متابعة فورية
          </span>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
        <div className="w-full sm:w-80">
          <Input
            type="text"
            placeholder="بحث بالاسم، الكود، الهاتف، الوظيفة..."
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
            <option value="all">كل الحالات</option>
            <option value="active">نشط على رأس العمل</option>
            <option value="on_leave">في إجازة</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>
      </div>

      {/* Employees Master Table with Attendance Buttons */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-xs text-right">
          <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="p-3">كود الموظف</th>
              <th className="p-3">الاسم والبيانات</th>
              <th className="p-3">المسمى والوظيفة</th>
              <th className="p-3">رقم الهاتف</th>
              <th className="p-3">الراتب الأساسي</th>
              <th className="p-3">حالة اليوم ({today})</th>
              <th className="p-3 text-center">إثبات وتسجيل اليوم</th>
              <th className="p-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-500">
                  لا يوجد موظفون مسجلون في قسم التجار
                </td>
              </tr>
            ) : (
              filteredEmployees.map(emp => {
                const todayRec = todaysAttendance.find(a => a.employeeId === emp.id);

                return (
                  <tr key={emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {emp.employeeCode}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeForProfile(emp);
                          setIsProfileOpen(true);
                        }}
                        className="font-black text-zinc-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 text-right cursor-pointer"
                      >
                        {emp.fullName}
                      </button>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        تعيين: {formatDate(emp.hireDate)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{emp.jobTitle}</span>
                      <span className="text-[10px] text-zinc-500 block">{emp.job}</span>
                    </td>
                    <td className="p-3 font-mono text-zinc-600 dark:text-zinc-400">
                      {emp.phone}
                    </td>
                    <td className="p-3 font-mono font-black text-zinc-900 dark:text-white">
                      {formatCurrency(emp.baseSalary)}
                    </td>
                    <td className="p-3">
                      {todayRec?.status === 'present' ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>حاضر ({todayRec.checkIn})</span>
                        </div>
                      ) : todayRec?.status === 'absent' ? (
                        <Badge variant="danger" size="sm">غائب</Badge>
                      ) : todayRec?.status === 'leave' || emp.status === 'on_leave' ? (
                        <Badge variant="warning" size="sm">إجازة</Badge>
                      ) : (
                        <Badge variant="default" size="sm">لم يسجل بعد</Badge>
                      )}
                    </td>

                    {/* Quick Attendance Action Buttons */}
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="تسجيل حضور"
                          onClick={() => handleOpenAttendanceModal(emp, 'check_in')}
                          className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold px-2"
                        >
                          <LogIn className="w-3.5 h-3.5 ml-1" />
                          حضور
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          title="تسجيل انصراف"
                          onClick={() => handleOpenAttendanceModal(emp, 'check_out')}
                          className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 font-bold px-2"
                        >
                          <LogOut className="w-3.5 h-3.5 ml-1" />
                          انصراف
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          title="تسجيل غياب"
                          onClick={() => handleOpenAttendanceModal(emp, 'absent')}
                          className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold px-2"
                        >
                          <UserX className="w-3.5 h-3.5 ml-1" />
                          غياب
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          title="تسجيل إجازة"
                          onClick={() => handleOpenAttendanceModal(emp, 'leave')}
                          className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-bold px-2"
                        >
                          <CalendarDays className="w-3.5 h-3.5 ml-1" />
                          إجازة
                        </Button>
                      </div>
                    </td>

                    {/* Profile & Delete Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployeeForProfile(emp);
                            setIsProfileOpen(true);
                          }}
                          className="font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        >
                          البروفايل والفاتورة
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من حذف الموظف ${emp.fullName}؟`)) {
                              db.deleteDealerEmployee(emp.id, user);
                              handleRefresh();
                            }
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 📝 MODAL: Quick Attendance, Absence, & Leave Action */}
      {/* ========================================================================= */}
      {isAttendanceModalOpen && selectedEmpForAttendance && (
        <Modal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          title={`⏱️ تسجيل الحضور والدوام: ${selectedEmpForAttendance.fullName}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSubmitAttendanceAction} className="space-y-4 text-right" dir="rtl">
            {/* Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <button
                type="button"
                onClick={() => setAttendanceActionTab('check_in')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  attendanceActionTab === 'check_in' ? 'bg-emerald-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                حضور
              </button>
              <button
                type="button"
                onClick={() => setAttendanceActionTab('check_out')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  attendanceActionTab === 'check_out' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                انصراف
              </button>
              <button
                type="button"
                onClick={() => setAttendanceActionTab('absent')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  attendanceActionTab === 'absent' ? 'bg-rose-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                غياب
              </button>
              <button
                type="button"
                onClick={() => setAttendanceActionTab('leave')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  attendanceActionTab === 'leave' ? 'bg-amber-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                إجازة
              </button>
            </div>

            {/* Content: Check In */}
            {attendanceActionTab === 'check_in' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold block mb-1">وقت الحضور:</label>
                  <Input
                    type="text"
                    required
                    value={attTime}
                    onChange={e => setAttTime(e.target.value)}
                    placeholder="مثال: 09:30 ص"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">تاريخ الحضور:</label>
                  <Input
                    type="date"
                    required
                    value={attDate}
                    onChange={e => setAttDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">ملاحظات (اختياري):</label>
                  <Input
                    type="text"
                    value={attNotes}
                    onChange={e => setAttNotes(e.target.value)}
                    placeholder="تسجيل حضور من المقر..."
                  />
                </div>
              </div>
            )}

            {/* Content: Check Out */}
            {attendanceActionTab === 'check_out' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold block mb-1">وقت الانصراف:</label>
                  <Input
                    type="text"
                    required
                    value={attTime}
                    onChange={e => setAttTime(e.target.value)}
                    placeholder="مثال: 05:00 م"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">ساعات العمل المكتملة:</label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={attWorkHours}
                    onChange={e => setAttWorkHours(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">ملاحظات الانصراف:</label>
                  <Input
                    type="text"
                    value={attNotes}
                    onChange={e => setAttNotes(e.target.value)}
                    placeholder="تسليم الشفت..."
                  />
                </div>
              </div>
            )}

            {/* Content: Absent with Deduction Option */}
            {attendanceActionTab === 'absent' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold block mb-1">تاريخ الغياب:</label>
                    <Input
                      type="date"
                      required
                      value={attDate}
                      onChange={e => setAttDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">وقت / ساعة التسجيل:</label>
                    <Input
                      type="text"
                      required
                      value={attTime}
                      onChange={e => setAttTime(e.target.value)}
                      placeholder="مثال: 09:30 ص"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">سبب الغياب:</label>
                  <Input
                    type="text"
                    required
                    value={absenceReason}
                    onChange={e => setAbsenceReason(e.target.value)}
                    placeholder="غياب بدون إذن مسبق..."
                  />
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-500/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="applyDeduction"
                      checked={absenceApplyDeduction}
                      onChange={e => setAbsenceApplyDeduction(e.target.checked)}
                      className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                    />
                    <label htmlFor="applyDeduction" className="text-xs font-bold text-rose-700 dark:text-rose-400 cursor-pointer">
                      تطبيق خصم مالي من الراتب بسبب الغياب
                    </label>
                  </div>

                  {absenceApplyDeduction && (
                    <div className="pt-2">
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        مبلغ الخصم (ج.م) [أجر اليوم تقريباً: {Math.round(calculateDailyRate(selectedEmpForAttendance.baseSalary, attDate))} ج.م]:
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={absenceDeductionAmount}
                        onChange={e => setAbsenceDeductionAmount(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content: Leave with 2-Way Sync (Days Count <-> Dates Range) */}
            {attendanceActionTab === 'leave' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold block mb-1">نوع الإجازة:</label>
                    <select
                      className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      value={leaveType}
                      onChange={e => setLeaveType(e.target.value)}
                    >
                      <option value="سنوية">إجازة سنوية</option>
                      <option value="مرضية">إجازة مرضية</option>
                      <option value="عارضة">إجازة عارضة</option>
                      <option value="بدون راتب">إجازة بدون راتب</option>
                      <option value="رسمية">إجازة رسمية / عيد</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">ساعة تسجيل الإجازة:</label>
                    <Input
                      type="text"
                      required
                      value={attTime}
                      onChange={e => setAttTime(e.target.value)}
                      placeholder="مثال: 09:30 ص"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold block mb-1">المدة (كم يوم):</label>
                    <Input
                      type="number"
                      min="1"
                      required
                      value={leaveDays}
                      onChange={e => handleLeaveDaysChange(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1">من تاريخ:</label>
                    <Input
                      type="date"
                      required
                      value={leaveStartDate}
                      onChange={e => handleLeaveStartDateChange(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1">إلى تاريخ:</label>
                    <Input
                      type="date"
                      required
                      value={leaveEndDate}
                      onChange={e => handleLeaveEndDateChange(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">سبب ومبرر الإجازة:</label>
                  <Input
                    type="text"
                    value={leaveReason}
                    onChange={e => setLeaveReason(e.target.value)}
                    placeholder="إجازة اعتيادية معتمدة..."
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAttendanceModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                حفظ وتسجيل الدوام
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 👤 MODAL: Add New Employee Modal */}
      {/* ========================================================================= */}
      {isAddEmployeeOpen && (
        <Modal
          isOpen={isAddEmployeeOpen}
          onClose={() => setIsAddEmployeeOpen(false)}
          title="➕ إضافة موظف جديد لقسم التجار"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveNewEmployee} className="space-y-3 text-right" dir="rtl">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">كود الموظف:</label>
                <Input
                  type="text"
                  required
                  value={employeeCode}
                  onChange={e => setEmployeeCode(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">اسم الموظف الكامل:</label>
                <Input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="محمد أحمد..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">الوظيفة / التخصص:</label>
                <select
                  value={job}
                  onChange={e => {
                    setJob(e.target.value);
                    setJobTitle(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="موظف خدمة عملاء">موظف خدمة عملاء</option>
                  <option value="مسؤول عن قسم">مسؤول عن قسم</option>
                  <option value="مشرف">مشرف</option>
                  <option value="موظف شحن">موظف شحن</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">المسمى الوظيفي:</label>
                <select
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="موظف خدمة عملاء">موظف خدمة عملاء</option>
                  <option value="مسؤول عن قسم">مسؤول عن قسم</option>
                  <option value="مشرف">مشرف</option>
                  <option value="موظف شحن">موظف شحن</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">رقم الهاتف:</label>
                <Input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="010..."
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">الراتب الأساسي (ج.م):</label>
                <Input
                  type="number"
                  required
                  min="1000"
                  value={baseSalary}
                  onChange={e => setBaseSalary(Number(e.target.value))}
                />
                <span className="text-[11px] text-amber-500 font-mono block mt-1">
                  سعر اليوم المحسوب: {formatCurrency(calculateDailyRate(baseSalary))} (الراتب ÷ {getDaysInMonth()})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">ميعاد بدء العمل (الحضور):</label>
                <Input
                  type="time"
                  required
                  value={workStartTime}
                  onChange={e => setWorkStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">ميعاد نهاية العمل (الانصراف):</label>
                <Input
                  type="time"
                  required
                  value={workEndTime}
                  onChange={e => setWorkEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">تاريخ التعيين:</label>
                <Input
                  type="date"
                  required
                  value={hireDate}
                  onChange={e => setHireDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">يوم صرف الراتب من الشهر:</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={salaryPayoutDay}
                  onChange={e => setSalaryPayoutDay(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">العنوان / الإقامة (اختياري):</label>
              <Input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">ملاحظات إضافية:</label>
              <textarea
                className="w-full text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                rows={2}
                value={empNotes}
                onChange={e => setEmpNotes(e.target.value)}
                placeholder="أي شروط أو ملاحظات على الموظف..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddEmployeeOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                حفظ بيانات الموظف
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 📄 FULL EMPLOYEE PROFILE MODAL (WITH OFFICIAL PRINTABLE INVOICE) */}
      {/* ========================================================================= */}
      {isProfileOpen && selectedEmployeeForProfile && (
        <DealerFinanceEmployeeProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          employee={selectedEmployeeForProfile}
          onEmployeeUpdated={handleRefresh}
        />
      )}
    </div>
  );
};

export default DealerFinanceEmployeesTab;
