import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AttendanceRecord, SalarySlip, Employee } from '../../types/finance.types';
import { formatCurrency, formatDate, calculateDailyRate, getDaysInMonth } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { db } from '../../database/db';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserPlus,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  Download,
  Search,
  Clock,
  AlertTriangle,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Phone,
  Briefcase,
  Building2,
  Wallet,
  Calendar,
  Gift,
  ArrowRightLeft,
  X,
  UserCheck,
  User
} from 'lucide-react';
import { EmployeeProfileModal } from './EmployeeProfileModal';

export const DEPARTMENTS = [
  'قسم الزبائن (المفرق)',
  'قسم التجار والموزعين',
  'قسم الموردين والتجار',
  'قسم الوساطة وشحن الحسابات',
  'قسم الاشتراكات والبرامج',
  'قسم المالية والحسابات',
  'الإدارة العامة والرقابة'
] as const;

interface FinancePayrollProps {
  attendance: AttendanceRecord[];
  salaries: SalarySlip[];
  onPaySalary: (slipId: string) => void;
  onRefresh?: () => void;
}

export const FinancePayroll: React.FC<FinancePayrollProps> = ({
  attendance,
  salaries,
  onPaySalary,
  onRefresh
}) => {
  const { showToast } = useNotifications();
  const { user } = useAuth();

  // Sub-tabs: 'employees' | 'salaries' | 'attendance'
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'salaries' | 'attendance'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Employees data
  const [employees, setEmployees] = useState<Employee[]>(() => db.getEmployees());

  const refreshEmployees = () => {
    setEmployees(db.getEmployees());
    onRefresh?.();
  };

  useEffect(() => {
    const unsubEmp = eventBus.subscribe(SYSTEM_EVENTS.EMPLOYEE_MUTATED, refreshEmployees);
    const unsubPay = eventBus.subscribe(SYSTEM_EVENTS.PAYROLL_UPDATED, () => {
      refreshEmployees();
      onRefresh?.();
    });
    return () => {
      unsubEmp();
      unsubPay();
    };
  }, []);

  // -------------------------------------------------------------
  // Modals States
  // -------------------------------------------------------------
  // 1. Employee Add/Edit Modal
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empFullName, setEmpFullName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empNationalId, setEmpNationalId] = useState('');
  const [empDepartment, setEmpDepartment] = useState<string>(DEPARTMENTS[0]);
  const [empJobTitle, setEmpJobTitle] = useState('');
  const [empBaseSalary, setEmpBaseSalary] = useState<number>(6000);
  const [empHireDate, setEmpHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [empStatus, setEmpStatus] = useState<'active' | 'on_leave' | 'inactive'>('active');
  const [empNotes, setEmpNotes] = useState('');

  // 2. Attendance Modal
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attEmployeeId, setAttEmployeeId] = useState<string>('');
  const [attType, setAttType] = useState<'check_in' | 'check_out' | 'leave' | 'absent'>('check_in');
  const [attTime, setAttTime] = useState('');
  const [attHours, setAttHours] = useState<number>(8);
  const [attNotes, setAttNotes] = useState('');

  // Leave specifics ("الاجازة احدد المده")
  const [leaveDurationDays, setLeaveDurationDays] = useState<number>(1);
  const [leaveStartDate, setLeaveStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [leaveType, setLeaveType] = useState<string>('إجازة اعتيادية');

  // Absent specifics
  const [absentDate, setAbsentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [absentReason, setAbsentReason] = useState<string>('غياب بدون إذن مسبق');
  const [absentDeductSalary, setAbsentDeductSalary] = useState<boolean>(true);

  // 3. Salary Payout / Issue Modal
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [salEmployeeId, setSalEmployeeId] = useState<string>('');
  const [salMonth, setSalMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [salBaseSalary, setSalBaseSalary] = useState<number>(0);
  const [salBonuses, setSalBonuses] = useState<number>(0);
  const [salDeductions, setSalDeductions] = useState<number>(0);
  const [salMethod, setSalMethod] = useState<string>('نقدية من الخزنة');
  const [salImmediatePay, setSalImmediatePay] = useState<boolean>(true);
  const [salNotes, setSalNotes] = useState('');

  // 4. Deduction & Bonus Modal
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [dedEmployeeId, setDedEmployeeId] = useState<string>('');
  const [dedType, setDedType] = useState<'deduction' | 'bonus'>('deduction');
  const [dedAmount, setDedAmount] = useState<number>(0);
  const [dedReason, setDedReason] = useState('');
  const [dedMonth, setDedMonth] = useState<string>(new Date().toISOString().substring(0, 7));

  // 5. Delete Employee Confirm
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // 6. Employee Profile Modal
  const [selectedProfileEmployeeId, setSelectedProfileEmployeeId] = useState<string | null>(null);
  const selectedProfileEmployee = useMemo(() => {
    if (!selectedProfileEmployeeId) return null;
    return employees.find(e => e.id === selectedProfileEmployeeId) || null;
  }, [employees, selectedProfileEmployeeId]);

  const handleOpenEmployeeProfile = (emp: { id: string }) => {
    setSelectedProfileEmployeeId(emp.id);
  };

  // -------------------------------------------------------------
  // Calculations
  // -------------------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];

  const todayAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance.filter(a => a.date === todayStr).forEach(a => {
      map.set(a.employeeId, a);
    });
    return map;
  }, [attendance, todayStr]);

  const totalNetSalaries = useMemo(() => {
    return salaries.reduce((sum, s) => sum + s.totalSalary, 0);
  }, [salaries]);

  const totalPaidSalaries = useMemo(() => {
    return salaries.filter(s => s.isPaid).reduce((sum, s) => sum + s.totalSalary, 0);
  }, [salaries]);

  const totalPendingSalaries = useMemo(() => {
    return salaries.filter(s => !s.isPaid).reduce((sum, s) => sum + s.totalSalary, 0);
  }, [salaries]);

  // Filtered lists
  const filteredEmployees = useMemo(() => {
    let list = [...employees];
    if (departmentFilter !== 'all') {
      list = list.filter(e => e.department === departmentFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        e => e.fullName.toLowerCase().includes(q) ||
             e.employeeCode.toLowerCase().includes(q) ||
             e.phone.includes(q) ||
             e.jobTitle.toLowerCase().includes(q) ||
             e.department.toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, departmentFilter, searchQuery]);

  const filteredSalaries = useMemo(() => {
    let list = [...salaries];
    if (departmentFilter !== 'all') {
      list = list.filter(s => s.department === departmentFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        s => s.employeeName.toLowerCase().includes(q) || s.department.toLowerCase().includes(q) || s.month.includes(q)
      );
    }
    return list;
  }, [salaries, departmentFilter, searchQuery]);

  const filteredAttendance = useMemo(() => {
    let list = [...attendance];
    if (departmentFilter !== 'all') {
      list = list.filter(a => a.department === departmentFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        a => a.employeeName.toLowerCase().includes(q) || a.department.toLowerCase().includes(q) || a.date.includes(q)
      );
    }
    return list;
  }, [attendance, departmentFilter, searchQuery]);

  // -------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------
  // Open Add Employee
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmpFullName('');
    setEmpCode(`EMP-${String(employees.length + 1).padStart(3, '0')}`);
    setEmpPhone('');
    setEmpNationalId('');
    setEmpDepartment(DEPARTMENTS[0]);
    setEmpJobTitle('');
    setEmpBaseSalary(6000);
    setEmpHireDate(new Date().toISOString().split('T')[0]);
    setEmpStatus('active');
    setEmpNotes('');
    setIsEmployeeModalOpen(true);
  };

  // Open Edit Employee
  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpFullName(emp.fullName);
    setEmpCode(emp.employeeCode);
    setEmpPhone(emp.phone);
    setEmpNationalId(emp.nationalId || '');
    setEmpDepartment(emp.department);
    setEmpJobTitle(emp.jobTitle);
    setEmpBaseSalary(emp.baseSalary);
    setEmpHireDate(emp.hireDate);
    setEmpStatus(emp.status);
    setEmpNotes(emp.notes || '');
    setIsEmployeeModalOpen(true);
  };

  // Save Employee
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFullName.trim() || !empDepartment || empBaseSalary <= 0) {
      showToast('error', 'بيانات غير كاملة', 'يرجى إدخال اسم الموظف، القسم، والراتب الأساسي بشكل صحيح');
      return;
    }

    const employeeObj: Employee = {
      id: editingEmployee?.id || `emp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      employeeCode: empCode.trim() || `EMP-${String(employees.length + 1).padStart(3, '0')}`,
      fullName: empFullName.trim(),
      phone: empPhone.trim(),
      nationalId: empNationalId.trim() || undefined,
      department: empDepartment,
      jobTitle: empJobTitle.trim() || 'موظف',
      baseSalary: empBaseSalary,
      hireDate: empHireDate,
      status: empStatus,
      notes: empNotes.trim() || undefined,
      createdAt: editingEmployee?.createdAt || new Date().toISOString()
    };

    db.saveEmployee(employeeObj);
    showToast('success', editingEmployee ? 'تم تحديث الموظف' : 'تمت إضافة الموظف', `تم حفظ بيانات [${employeeObj.fullName}] وربطه بـ [${employeeObj.department}] بنجاح.`);
    setIsEmployeeModalOpen(false);
    refreshEmployees();
  };

  // Delete Employee
  const handleConfirmDeleteEmployee = () => {
    if (!employeeToDelete) return;
    db.deleteEmployee(employeeToDelete.id);
    showToast('info', 'تم حذف الموظف', `تم حذف سجل الموظف [${employeeToDelete.fullName}] من المنظومة.`);
    setEmployeeToDelete(null);
    refreshEmployees();
  };

  // Open Attendance Modal
  const handleOpenAttendanceModal = (emp?: Employee, type?: 'check_in' | 'check_out' | 'leave' | 'absent') => {
    const targetId = emp ? emp.id : (employees[0]?.id || '');
    setAttEmployeeId(targetId);

    // Auto-select type if not passed
    let initialType: 'check_in' | 'check_out' | 'leave' | 'absent' = type || 'check_in';
    if (!type && targetId) {
      const rec = todayAttendanceMap.get(targetId);
      if (rec?.status === 'present' && (!rec.checkOut || rec.checkOut === '-')) {
        initialType = 'check_out';
      }
    }
    setAttType(initialType);

    const nowFormatted = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    setAttTime(nowFormatted);
    setAttHours(8);
    setAttNotes('');

    // Reset leave states
    setLeaveDurationDays(1);
    setLeaveStartDate(todayStr);
    setLeaveEndDate(todayStr);
    setLeaveType('إجازة اعتيادية');

    // Reset absent states
    setAbsentDate(todayStr);
    setAbsentReason('غياب بدون إذن مسبق');
    setAbsentDeductSalary(true);

    setIsAttendanceModalOpen(true);
  };

  const handleLeaveDurationChange = (days: number) => {
    const dCount = Math.max(1, days);
    setLeaveDurationDays(dCount);
    const d = new Date(leaveStartDate);
    d.setDate(d.getDate() + dCount - 1);
    setLeaveEndDate(d.toISOString().split('T')[0]);
  };

  const handleLeaveStartDateChange = (startDateStr: string) => {
    setLeaveStartDate(startDateStr);
    const d = new Date(startDateStr);
    d.setDate(d.getDate() + Math.max(1, leaveDurationDays) - 1);
    setLeaveEndDate(d.toISOString().split('T')[0]);
  };

  const handleLeaveEndDateChange = (endDateStr: string) => {
    setLeaveEndDate(endDateStr);
    const start = new Date(leaveStartDate);
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 0) {
      setLeaveDurationDays(diffDays);
    }
  };

  // Save Attendance
  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attEmployeeId) {
      showToast('error', 'اختر موظفاً', 'يرجى تحديد الموظف أولاً');
      return;
    }

    const emp = employees.find(e => e.id === attEmployeeId);
    if (!emp) return;

    if (attType === 'check_in') {
      db.recordAttendanceCheckIn(emp.id, attTime || undefined, attNotes);
      if (emp.status === 'on_leave') {
        db.saveEmployee({ ...emp, status: 'active' });
      }
      showToast('success', 'تم تسجيل الحضور', `تم تسجيل حضور الموظف [${emp.fullName}] الساعة ${attTime || 'الآن'}.`);
    } else if (attType === 'check_out') {
      db.recordAttendanceCheckOut(emp.id, attTime || undefined, attHours, attNotes);
      showToast('success', 'تم تسجيل الانصراف', `تم توثيق انصراف الموظف [${emp.fullName}] واحتساب ${attHours} ساعات عمل.`);
    } else if (attType === 'leave') {
      const days = Math.max(1, leaveDurationDays);
      const start = new Date(leaveStartDate);
      for (let i = 0; i < days; i++) {
        const curDate = new Date(start);
        curDate.setDate(start.getDate() + i);
        const curDateStr = curDate.toISOString().split('T')[0];

        const leaveRecord: AttendanceRecord = {
          id: `att_leave_${emp.id}_${curDateStr}`,
          employeeId: emp.id,
          employeeName: emp.fullName,
          department: emp.department,
          date: curDateStr,
          checkIn: '-',
          checkOut: '-',
          workHours: 0,
          status: 'leave',
          notes: `${leaveType} (${days} يوم: من ${leaveStartDate} إلى ${leaveEndDate})${attNotes ? ` • ${attNotes}` : ''}`
        };
        db.saveAttendance(leaveRecord);
      }

      if (leaveStartDate <= todayStr && leaveEndDate >= todayStr) {
        db.saveEmployee({
          ...emp,
          status: 'on_leave'
        });
      }

      showToast('info', 'تم توثيق الإجازة', `تم تسجيل ${leaveType} للموظف [${emp.fullName}] لمدة ${days} يوم.`);
    } else if (attType === 'absent') {
      const targetDate = absentDate || todayStr;
      const absentRecord: AttendanceRecord = {
        id: `att_absent_${emp.id}_${targetDate}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        department: emp.department,
        date: targetDate,
        checkIn: '-',
        checkOut: '-',
        workHours: 0,
        status: 'absent',
        notes: `${absentReason}${attNotes ? ` • ${attNotes}` : ''}`
      };
      db.saveAttendance(absentRecord);

      if (absentDeductSalary) {
        const dailyRate = Math.round(calculateDailyRate(emp.baseSalary, targetDate));
        if (dailyRate > 0) {
          const currentMonth = targetDate.substring(0, 7);
          db.applyEmployeeDeductionOrBonus(
            emp.id,
            'deduction',
            dailyRate,
            `خصم يوم غياب (${targetDate}) - ${absentReason}`,
            currentMonth
          );
        }
      }

      showToast('warning', 'تم تسجيل الغياب', `تم تسجيل غياب الموظف [${emp.fullName}] ليوم ${targetDate}${absentDeductSalary ? ' وتطبيق خصم اليوم من مسير الراتب' : ''}.`);
    }

    setIsAttendanceModalOpen(false);
    refreshEmployees();
    onRefresh?.();
  };

  // Open Salary Payout Modal
  const handleOpenSalaryModal = (emp?: Employee) => {
    const targetEmp = emp || employees[0];
    if (!targetEmp) {
      showToast('error', 'لا يوجد موظفون', 'يرجى إضافة موظف أولاً لتتمكن من صرف راتب');
      return;
    }
    const currentMonth = new Date().toISOString().substring(0, 7);
    setSalEmployeeId(targetEmp.id);
    setSalMonth(currentMonth);
    setSalBaseSalary(targetEmp.baseSalary || 5000);

    // Look for existing slip this month
    const existing = salaries.find(s => s.employeeId === targetEmp.id && s.month === currentMonth);
    if (existing) {
      setSalBonuses(existing.bonuses || 0);
      setSalDeductions(existing.deductions || 0);
      setSalNotes(existing.notes || '');
    } else {
      setSalBonuses(0);
      setSalDeductions(0);
      setSalNotes('');
    }

    setSalMethod('نقدية من الخزنة');
    setSalImmediatePay(true);
    setIsSalaryModalOpen(true);
  };

  // Handle employee selection change in salary modal
  const handleSalaryEmployeeChange = (empId: string) => {
    setSalEmployeeId(empId);
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      setSalBaseSalary(emp.baseSalary);
      const existing = salaries.find(s => s.employeeId === empId && s.month === salMonth);
      if (existing) {
        setSalBonuses(existing.bonuses || 0);
        setSalDeductions(existing.deductions || 0);
        setSalNotes(existing.notes || '');
      } else {
        setSalBonuses(0);
        setSalDeductions(0);
      }
    }
  };

  // Save Salary Payout
  const handleSaveSalary = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === salEmployeeId);
    if (!emp) {
      showToast('error', 'الموظف غير موجود', 'يرجى اختيار الموظف');
      return;
    }

    const netSalary = Math.max(0, salBaseSalary + salBonuses - salDeductions);
    const existingIndex = salaries.findIndex(s => s.employeeId === emp.id && s.month === salMonth);
    const slipId = existingIndex >= 0 ? salaries[existingIndex].id : `slip_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const slip: SalarySlip = {
      id: slipId,
      employeeId: emp.id,
      employeeName: emp.fullName,
      department: emp.department,
      month: salMonth,
      baseSalary: salBaseSalary,
      bonuses: salBonuses,
      deductions: salDeductions,
      totalSalary: netSalary,
      isPaid: salImmediatePay,
      paidAt: salImmediatePay ? new Date().toISOString() : undefined,
      paymentMethod: salImmediatePay ? salMethod : undefined,
      notes: salNotes.trim() || undefined
    };

    if (salImmediatePay) {
      db.saveSalary(slip);
      db.paySalarySlip(slip.id, salMethod, user?.fullName || 'المسؤول المالي');
      showToast('success', 'تم صرف الراتب بنجاح', `تم صرف صافي الراتب (${formatCurrency(netSalary, 'EGP')}) للموظف [${emp.fullName}] وتوثيقه في حركة الخزنة.`);
    } else {
      db.saveSalary(slip);
      showToast('info', 'تم حفظ مسير الراتب', `تم قيد المسير كمعلق للصرف بمبلغ (${formatCurrency(netSalary, 'EGP')})`);
    }

    setIsSalaryModalOpen(false);
    onRefresh?.();
  };

  // Open Deduction / Bonus Modal
  const handleOpenDeductionModal = (emp?: Employee, type: 'deduction' | 'bonus' = 'deduction') => {
    const targetEmp = emp || employees[0];
    if (!targetEmp) {
      showToast('error', 'لا يوجد موظفون', 'يرجى إضافة موظف أولاً');
      return;
    }
    setDedEmployeeId(targetEmp.id);
    setDedType(type);
    setDedAmount(type === 'deduction' ? 200 : 500);
    setDedReason('');
    setDedMonth(new Date().toISOString().substring(0, 7));
    setIsDeductionModalOpen(true);
  };

  // Save Deduction / Bonus
  const handleSaveDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (dedAmount <= 0 || !dedReason.trim()) {
      showToast('error', 'بيانات غير مكتملة', 'يرجى إدخال المبلغ وتوضيح السبب والبيان');
      return;
    }
    const emp = employees.find(e => e.id === dedEmployeeId);
    if (!emp) return;

    db.applyEmployeeDeductionOrBonus(emp.id, dedType, dedAmount, dedReason.trim(), dedMonth);
    showToast(
      dedType === 'deduction' ? 'warning' : 'success',
      dedType === 'deduction' ? 'تم تطبيق الخصم' : 'تمت إضافة المكافأة',
      `الموظف [${emp.fullName}] - بمبلغ ${formatCurrency(dedAmount, 'EGP')} لشهر ${dedMonth}`
    );
    setIsDeductionModalOpen(false);
    onRefresh?.();
  };

  // Export to Excel
  const handleExport = () => {
    if (activeSubTab === 'employees') {
      const data = filteredEmployees.map(e => ({
        'كود الموظف': e.employeeCode,
        'الاسم': e.fullName,
        'القسم': e.department,
        'المسمى الوظيفي': e.jobTitle,
        'الراتب الأساسي': e.baseSalary,
        'الهاتف': e.phone,
        'تاريخ التعيين': e.hireDate,
        'الحالة': e.status === 'active' ? 'نشط' : e.status === 'on_leave' ? 'إجازة' : 'معطل'
      }));
      exportToExcel(data, `دليل_الموظفين_${todayStr}`);
    } else if (activeSubTab === 'salaries') {
      const data = filteredSalaries.map(s => ({
        'الموظف': s.employeeName,
        'القسم': s.department,
        'الشهر': s.month,
        'الراتب الأساسي': s.baseSalary,
        'المكافآت': s.bonuses,
        'الخصومات': s.deductions,
        'صافي المستحق': s.totalSalary,
        'حالة الصرف': s.isPaid ? 'تم الصرف' : 'معلق'
      }));
      exportToExcel(data, `مسير_الرواتب_${todayStr}`);
    } else {
      const data = filteredAttendance.map(a => ({
        'الموظف': a.employeeName,
        'القسم': a.department,
        'التاريخ': a.date,
        'الحضور': a.checkIn,
        'الانصراف': a.checkOut || '-',
        'ساعات العمل': a.workHours,
        'الحالة': a.status
      }));
      exportToExcel(data, `سجل_الحضور_${todayStr}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent border-purple-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400">إجمالي الموظفين المسجلين:</span>
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <span className="text-2xl font-black text-purple-400 block mt-1">
            {employees.length} موظف
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            {employees.filter(e => e.status === 'active').length} على رأس العمل • {todayAttendanceMap.size} سجلوا حضور اليوم
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-500/15 via-indigo-500/5 to-transparent border-blue-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400">إجمالي مسيرات الرواتب:</span>
            <DollarSign className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-2xl font-black text-blue-400 block mt-1">
            {formatCurrency(totalNetSalaries, 'EGP')}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            المستحق لكافة الموظفين ({salaries.length} مسير)
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400">الرواتب المصروفة:</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-emerald-400 block mt-1">
            {formatCurrency(totalPaidSalaries, 'EGP')}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            تم تسليمها وخصمها من الخزنة
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400">الرواتب المعلقة للصرف:</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-2xl font-black text-amber-400 block mt-1">
            {formatCurrency(totalPendingSalaries, 'EGP')}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            بانتظار الاعتماد المالي والصرف
          </span>
        </Card>
      </div>

      {/* Action Bar & Quick Modals Triggers */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={handleOpenAddEmployee}
            className="shadow-xs font-bold"
          >
            + إضافة موظف جديد
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<CalendarCheck className="w-4 h-4 text-emerald-500" />}
            onClick={() => handleOpenAttendanceModal()}
            className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold"
          >
            ⏱️ تسجيل حضور وانصراف
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Wallet className="w-4 h-4 text-blue-500" />}
            onClick={() => handleOpenSalaryModal()}
            className="border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-bold"
          >
            💵 صرف / مسير راتب
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
            onClick={() => handleOpenDeductionModal()}
            className="border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold"
          >
            ⚠️ تسجيل خصم / مكافأة
          </Button>
        </div>

        {/* Export Button */}
        <Button
          variant="outline"
          size="sm"
          icon={<Download className="w-3.5 h-3.5" />}
          onClick={handleExport}
          className="text-xs cursor-pointer"
        >
          تصدير لـ Excel
        </Button>
      </div>

      {/* Sub Navigation Bar & Search Filters */}
      <Card className="p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('employees')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'employees'
                ? 'bg-purple-600 text-white font-black shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            دليل الموظفين ({employees.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('salaries')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'salaries'
                ? 'bg-blue-600 text-white font-black shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            مسير الرواتب الشهرية ({salaries.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('attendance')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'attendance'
                ? 'bg-emerald-600 text-white font-black shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            سجل الحضور والانصراف ({attendance.length})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer"
          >
            <option value="all">كافة الأقسام</option>
            {DEPARTMENTS.map(dep => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="بحث بالاسم، الكود، الهاتف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-xs font-bold rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] p-2 pr-7 text-zinc-900 dark:text-zinc-100 outline-none w-56"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </Card>

      {/* ======================================================== */}
      {/* SUB-TAB 1: EMPLOYEES DIRECTORY                           */}
      {/* ======================================================== */}
      {activeSubTab === 'employees' && (
        <Card className="p-4 space-y-3">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">القسم التابع له</th>
                  <th className="p-3">المسمى الوظيفي</th>
                  <th className="p-3">الراتب الأساسي</th>
                  <th className="p-3">حضور اليوم</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-zinc-400">
                      <Users className="w-8 h-8 mx-auto text-zinc-500 mb-2 opacity-60" />
                      <p className="font-bold">لا يوجد موظفون مسجلون</p>
                      <p className="text-[11px] text-zinc-500 mt-1">انقر على زر "+ إضافة موظف جديد" لإنشاء أول موظف وربطه بقسمه</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => {
                    const todayRec = todayAttendanceMap.get(emp.id);

                    return (
                      <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                        <td className="p-3">
                          <div
                            onClick={() => handleOpenEmployeeProfile(emp)}
                            className="flex items-center gap-2.5 cursor-pointer group"
                            title="انقر لفتح الملف الوظيفي والمالي للموظف"
                          >
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 group-hover:scale-105 font-bold flex items-center justify-center text-xs shrink-0 transition-all border border-purple-500/20">
                              {emp.fullName.slice(0, 2)}
                            </div>
                            <div>
                              <strong className="block font-black text-zinc-900 dark:text-zinc-100 group-hover:text-purple-400 transition-colors text-xs flex items-center gap-1.5">
                                {emp.fullName}
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity font-normal">
                                  عرض الملف الوظيفي 👤
                                </span>
                              </strong>
                              <span className="text-[10px] text-zinc-400 font-mono block">
                                {emp.employeeCode} {emp.phone && `• ${emp.phone}`}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold text-[10px] inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {emp.department}
                          </span>
                        </td>

                        <td className="p-3 text-zinc-700 dark:text-zinc-300 font-bold">
                          {emp.jobTitle}
                        </td>

                        <td className="p-3 font-mono font-black text-emerald-500 text-xs">
                          {formatCurrency(emp.baseSalary, 'EGP')}
                        </td>

                        <td className="p-3">
                          {todayRec?.status === 'present' ? (
                            todayRec.checkOut && todayRec.checkOut !== '-' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-400" />
                                تم الانصراف ({todayRec.checkOut})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                حاضر ({todayRec.checkIn})
                              </span>
                            )
                          ) : todayRec?.status === 'leave' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1" title={todayRec.notes}>
                              🏖️ في إجازة
                            </span>
                          ) : todayRec?.status === 'absent' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1" title={todayRec.notes}>
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              غائب اليوم
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/10 text-zinc-400 border border-gray-500/20">
                              لم يسجل اليوم
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <Badge
                            variant={emp.status === 'active' ? 'success' : emp.status === 'on_leave' ? 'warning' : 'danger'}
                            className="text-[10px]"
                          >
                            {emp.status === 'active' ? 'على رأس العمل' : emp.status === 'on_leave' ? 'في إجازة' : 'معطل'}
                          </Badge>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {/* Open Employee Profile */}
                            <button
                              type="button"
                              onClick={() => handleOpenEmployeeProfile(emp)}
                              title="فتح الملف الوظيفي والمالي للموظف"
                              className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 transition-all cursor-pointer shadow-xs"
                            >
                              <User className="w-3.5 h-3.5" />
                            </button>

                            {/* CheckIn / CheckOut */}
                            <button
                              type="button"
                              onClick={() => handleOpenAttendanceModal(emp, todayRec ? 'check_out' : 'check_in')}
                              title={todayRec ? 'تسجيل انصراف' : 'تسجيل حضور'}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 transition-all cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>

                            {/* Pay Salary */}
                            <button
                              type="button"
                              onClick={() => handleOpenSalaryModal(emp)}
                              title="صرف راتب"
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 transition-all cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>

                            {/* Deduction / Bonus */}
                            <button
                              type="button"
                              onClick={() => handleOpenDeductionModal(emp, 'deduction')}
                              title="تسجيل خصم أو مكافأة"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all cursor-pointer"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditEmployee(emp)}
                              title="تعديل بيانات الموظف"
                              className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-zinc-300 border border-zinc-700 transition-all cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => setEmployeeToDelete(emp)}
                              title="حذف الموظف"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: SALARIES & PAYROLL VIEW                       */}
      {/* ======================================================== */}
      {activeSubTab === 'salaries' && (
        <Card className="p-4 space-y-3">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3">الشهر</th>
                  <th className="p-3">الأساسي</th>
                  <th className="p-3">المكافآت</th>
                  <th className="p-3">الخصومات</th>
                  <th className="p-3">الصافي المستحق</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {filteredSalaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-zinc-400">
                      لا توجد مسيرات رواتب مسجلة
                    </td>
                  </tr>
                ) : (
                  filteredSalaries.map(slip => {
                    const matchedEmp = employees.find(e => e.id === slip.employeeId);
                    return (
                      <tr key={slip.id} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                        <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                          <button
                            type="button"
                            onClick={() => handleOpenEmployeeProfile({ id: slip.employeeId })}
                            className="hover:text-purple-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-bold text-right"
                            title="انقر لفتح الملف الوظيفي والمالي للموظف"
                          >
                            <User className="w-3 h-3 text-purple-400 shrink-0" />
                            <span>{slip.employeeName}</span>
                          </button>
                        </td>
                        <td className="p-3 text-zinc-400">{slip.department}</td>
                        <td className="p-3 font-mono text-zinc-400">{slip.month}</td>
                        <td className="p-3">{formatCurrency(slip.baseSalary, 'EGP')}</td>
                        <td className="p-3 text-emerald-500 font-bold">+{formatCurrency(slip.bonuses, 'EGP')}</td>
                        <td className="p-3 text-rose-500 font-bold">-{formatCurrency(slip.deductions, 'EGP')}</td>
                        <td className="p-3 font-black text-zinc-900 dark:text-zinc-100 text-sm">
                          {formatCurrency(slip.totalSalary, 'EGP')}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge variant={slip.isPaid ? 'success' : 'warning'} className="text-[10px]">
                            {slip.isPaid ? 'تم الصرف' : 'معلق'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 justify-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEmployeeProfile({ id: slip.employeeId })}
                              title="فتح الملف الوظيفي والمالي للموظف"
                              className="p-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-all cursor-pointer"
                            >
                              <User className="w-3 h-3" />
                            </button>

                            {!slip.isPaid ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onPaySalary(slip.id)}
                                className="text-[10px] h-7 px-2.5 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer font-bold"
                              >
                                اعتماد وصرف
                              </Button>
                            ) : (
                              <span className="text-[10px] text-zinc-500">
                                {slip.paidAt ? formatDate(slip.paidAt) : 'مصروف'}
                              </span>
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
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: ATTENDANCE & SHIFTS LOGS                      */}
      {/* ======================================================== */}
      {activeSubTab === 'attendance' && (
        <Card className="p-4 space-y-3">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#27272A]">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-[#18181B] text-zinc-400 font-bold border-b border-gray-200 dark:border-[#27272A]">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">وقت الحضور</th>
                  <th className="p-3">وقت الانصراف</th>
                  <th className="p-3">ساعات العمل</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#27272A]">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-400">
                      لا توجد سجلات حضور مسجلة
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map(att => {
                    const matchedEmp = employees.find(e => e.id === att.employeeId);
                    return (
                      <tr key={att.id} className="hover:bg-gray-50 dark:hover:bg-[#18181B]/50 transition-colors">
                        <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                          <button
                            type="button"
                            onClick={() => handleOpenEmployeeProfile({ id: att.employeeId })}
                            className="hover:text-purple-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-bold text-right"
                            title="انقر لفتح الملف الوظيفي والمالي للموظف"
                          >
                            <User className="w-3 h-3 text-purple-400 shrink-0" />
                            <span>{att.employeeName}</span>
                          </button>
                        </td>
                        <td className="p-3 text-zinc-400">{att.department}</td>
                        <td className="p-3 font-mono text-zinc-400">{formatDate(att.date)}</td>
                        <td className="p-3 font-mono text-emerald-500 font-bold">{att.checkIn}</td>
                        <td className="p-3 font-mono text-zinc-400 font-bold">{att.checkOut || '-'}</td>
                        <td className="p-3 font-black">{att.workHours} ساعة</td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge
                            variant={
                              att.status === 'present'
                                ? 'success'
                                : att.status === 'late'
                                ? 'warning'
                                : 'danger'
                            }
                          className="text-[10px]"
                        >
                          {att.status === 'present'
                            ? 'حاضر'
                            : att.status === 'late'
                            ? 'متأخر'
                            : att.status === 'leave'
                            ? 'إجازة'
                            : 'غائب'}
                        </Badge>
                      </td>
                      <td className="p-3 text-zinc-400">{att.notes || '-'}</td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT EMPLOYEE                             */}
      {/* ======================================================== */}
      {isEmployeeModalOpen && (
        <Modal
          isOpen={isEmployeeModalOpen}
          onClose={() => setIsEmployeeModalOpen(false)}
          title={editingEmployee ? `✏️ تعديل بيانات الموظف: ${editingEmployee.fullName}` : '👤 إضافة موظف جديد وربطه بقسمه'}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  اسم الموظف بالكامل *
                </label>
                <input
                  type="text"
                  required
                  value={empFullName}
                  onChange={e => setEmpFullName(e.target.value)}
                  placeholder="مثال: أحمد محمود علي"
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  كود الموظف (الكود الوظيفي) *
                </label>
                <input
                  type="text"
                  required
                  value={empCode}
                  onChange={e => setEmpCode(e.target.value)}
                  placeholder="EMP-001"
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  القسم التابع له (الربط الإداري) *
                </label>
                <select
                  value={empDepartment}
                  onChange={e => setEmpDepartment(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-bold cursor-pointer"
                >
                  {DEPARTMENTS.map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  المسمى الوظيفي (الدور) *
                </label>
                <input
                  type="text"
                  required
                  value={empJobTitle}
                  onChange={e => setEmpJobTitle(e.target.value)}
                  placeholder="مثال: مسؤول مبيعات / مشرف وردية"
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  الراتب الأساسي الشهري (جنيه) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  value={empBaseSalary}
                  onChange={e => setEmpBaseSalary(parseFloat(e.target.value) || 0)}
                  placeholder="6500"
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono font-black text-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  رقم الهاتف والتواصل
                </label>
                <input
                  type="text"
                  value={empPhone}
                  onChange={e => setEmpPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  تاريخ التعيين
                </label>
                <input
                  type="date"
                  value={empHireDate}
                  onChange={e => setEmpHireDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  حالة الموظف
                </label>
                <select
                  value={empStatus}
                  onChange={e => setEmpStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-bold cursor-pointer"
                >
                  <option value="active">على رأس العمل (نشط)</option>
                  <option value="on_leave">في إجازة</option>
                  <option value="inactive">معطل / موقوف</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                ملاحظات وسجل الموظف
              </label>
              <textarea
                rows={2}
                value={empNotes}
                onChange={e => setEmpNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية بخصوص الموظف..."
                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEmployeeModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="font-bold">
                {editingEmployee ? 'حفظ التعديلات' : 'إضافة وتثبيت الموظف'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ATTENDANCE CHECK-IN / CHECK-OUT                 */}
      {/* ======================================================== */}
      {isAttendanceModalOpen && (
        <Modal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          title="⏱️ تسجيل حضور وانصراف للموظف"
          maxWidth="md"
        >
          <form onSubmit={handleSaveAttendance} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                الموظف المستهدف *
              </label>
              <select
                required
                value={attEmployeeId}
                onChange={e => setAttEmployeeId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-bold cursor-pointer"
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.department} - {e.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                نوع الإجراء *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-bold">
                <button
                  type="button"
                  onClick={() => setAttType('check_in')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    attType === 'check_in'
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🟢 تسجيل حضور
                </button>

                <button
                  type="button"
                  onClick={() => setAttType('check_out')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    attType === 'check_out'
                      ? 'bg-blue-500 text-white border-blue-500 shadow-xs'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🟡 تسجيل انصراف
                </button>

                <button
                  type="button"
                  onClick={() => setAttType('leave')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    attType === 'leave'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🏖️ إجازة
                </button>

                <button
                  type="button"
                  onClick={() => setAttType('absent')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    attType === 'absent'
                      ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🔴 غياب
                </button>
              </div>
            </div>

            {/* Dynamic Fields Based on Action Type */}
            {attType === 'check_in' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                      ساعة الحضور (الدخول) *
                    </label>
                    <input
                      type="text"
                      required
                      value={attTime}
                      onChange={e => setAttTime(e.target.value)}
                      placeholder="09:00 ص"
                      className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono font-bold text-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                      ساعات العمل المجدولة
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      step="0.5"
                      value={attHours}
                      onChange={e => setAttHours(parseFloat(e.target.value) || 8)}
                      className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                    ملاحظات أو سبب التأخير (اختياري)
                  </label>
                  <input
                    type="text"
                    value={attNotes}
                    onChange={e => setAttNotes(e.target.value)}
                    placeholder="مثال: حضور في الموعد المحدد للوردية الصباحية"
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none"
                  />
                </div>
              </div>
            )}

            {attType === 'check_out' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                      ساعة الانصراف (الخروج) *
                    </label>
                    <input
                      type="text"
                      required
                      value={attTime}
                      onChange={e => setAttTime(e.target.value)}
                      placeholder="05:00 م"
                      className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono font-bold text-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                      إجمالي ساعات العمل المنجزة
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      step="0.5"
                      value={attHours}
                      onChange={e => setAttHours(parseFloat(e.target.value) || 8)}
                      className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                    تقرير الوردية وملاحظات الانصراف
                  </label>
                  <input
                    type="text"
                    value={attNotes}
                    onChange={e => setAttNotes(e.target.value)}
                    placeholder="مثال: إتمام تسليم التذاكر وشفت الدعم بالكامل"
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none"
                  />
                </div>
              </div>
            )}

            {attType === 'leave' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                    تصنيف الإجازة *
                  </label>
                  <select
                    value={leaveType}
                    onChange={e => setLeaveType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-bold cursor-pointer"
                  >
                    <option value="إجازة اعتيادية">🏖️ إجازة اعتيادية (سنوية)</option>
                    <option value="إجازة مرضية">🏥 إجازة مرضية</option>
                    <option value="إجازة عارضة">⚡ إجازة عارضة</option>
                    <option value="إجازة رسمية">🎉 إجازة رسمية / عيد</option>
                    <option value="إجازة بدون راتب">💼 إجازة بدون راتب</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                      مدة الإجازة (بالأيام) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="60"
                      value={leaveDurationDays}
                      onChange={e => handleLeaveDurationChange(parseInt(e.target.value) || 1)}
                      className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono font-black text-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                      تاريخ البداية *
                    </label>
                    <input
                      type="date"
                      required
                      value={leaveStartDate}
                      onChange={e => handleLeaveStartDateChange(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                      تاريخ النهاية *
                    </label>
                    <input
                      type="date"
                      required
                      value={leaveEndDate}
                      onChange={e => handleLeaveEndDateChange(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>🏖️ ملخص الإجازة:</span>
                    <span>{leaveDurationDays} يوم</span>
                    <span>(من {leaveStartDate} إلى {leaveEndDate})</span>
                  </p>
                  <p className="text-[11px] text-amber-400/80 mt-1">
                    سيتم تحديث سجل الحضور لجميع هذه الأيام تلقائياً كـ "إجازة" وتحويل حالة الموظف إلى "في إجازة".
                  </p>
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                    سبب الإجازة وموافقة الإدارة
                  </label>
                  <input
                    type="text"
                    value={attNotes}
                    onChange={e => setAttNotes(e.target.value)}
                    placeholder="مثال: إجازة سنوية معتمدة من الإدارة"
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none"
                  />
                </div>
              </div>
            )}

            {attType === 'absent' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                      تاريخ الغياب *
                    </label>
                    <input
                      type="date"
                      required
                      value={absentDate}
                      onChange={e => setAbsentDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                      بيان نوع الغياب *
                    </label>
                    <select
                      value={absentReason}
                      onChange={e => setAbsentReason(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-bold cursor-pointer"
                    >
                      <option value="غياب بدون إذن مسبق">🔴 غياب بدون إذن مسبق</option>
                      <option value="غياب مفاجئ لظرف طارئ">⚠️ غياب مفاجئ لظرف طارئ</option>
                      <option value="انقطاع غير مبرر عن العمل">❌ انقطاع غير مبرر عن العمل</option>
                    </select>
                  </div>
                </div>

                {/* Salary Deduction Checkbox */}
                {(() => {
                  const targetEmp = employees.find(e => e.id === attEmployeeId);
                  const dailyWage = Math.round(calculateDailyRate(targetEmp?.baseSalary || 6000, absentDate));
                  return (
                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={absentDeductSalary}
                        onChange={e => setAbsentDeductSalary(e.target.checked)}
                        className="mt-0.5 rounded text-rose-500 cursor-pointer"
                      />
                      <div>
                        <strong className="block text-rose-400 font-bold">
                          تطبيق خصم يوم عمل تلقائياً من مسير راتب هذا الشهر
                        </strong>
                        <span className="text-[11px] text-zinc-400 block mt-0.5">
                          سيتم قيد خصم بقيمة يومية الموظف ({formatCurrency(dailyWage, 'EGP')}) في سجل الخصومات ومسير الراتب.
                        </span>
                      </div>
                    </label>
                  );
                })()}

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                    ملاحظات أو تعليق الإدارة
                  </label>
                  <input
                    type="text"
                    value={attNotes}
                    onChange={e => setAttNotes(e.target.value)}
                    placeholder="مثال: لم يحضر الوردية ولم يرسل إخطاراً مسبقاً"
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAttendanceModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="font-bold">
                حفظ وتسجيل الحركة
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: SALARY PAYOUT / ISSUE                           */}
      {/* ======================================================== */}
      {isSalaryModalOpen && (
        <Modal
          isOpen={isSalaryModalOpen}
          onClose={() => setIsSalaryModalOpen(false)}
          title="💵 إصدار وصرف راتب موظف"
          maxWidth="md"
        >
          <form onSubmit={handleSaveSalary} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  الموظف *
                </label>
                <select
                  required
                  value={salEmployeeId}
                  onChange={e => handleSalaryEmployeeChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-bold cursor-pointer"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({formatCurrency(e.baseSalary, 'EGP')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  شهر الاستحقاق *
                </label>
                <input
                  type="month"
                  required
                  value={salMonth}
                  onChange={e => {
                    setSalMonth(e.target.value);
                    const existing = salaries.find(s => s.employeeId === salEmployeeId && s.month === e.target.value);
                    if (existing) {
                      setSalBonuses(existing.bonuses || 0);
                      setSalDeductions(existing.deductions || 0);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  الراتب الأساسي (جنيه) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={salBaseSalary}
                  onChange={e => setSalBaseSalary(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  المكافآت والحوافز (+)
                </label>
                <input
                  type="number"
                  min="0"
                  value={salBonuses}
                  onChange={e => setSalBonuses(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-emerald-500/30 outline-none font-mono font-bold text-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  الخصومات والجزاءات (-)
                </label>
                <input
                  type="number"
                  min="0"
                  value={salDeductions}
                  onChange={e => setSalDeductions(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-rose-500/30 outline-none font-mono font-bold text-rose-500"
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  طريقة الصرف
                </label>
                <select
                  value={salMethod}
                  onChange={e => setSalMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-bold cursor-pointer"
                >
                  <option value="نقدية من الخزنة">نقدية من الخزنة (تخصم من السيولة)</option>
                  <option value="تحويل بنكي / محفظة">تحويل بنكي / فودافون كاش</option>
                  <option value="شيك بنكي">شيك بنكي</option>
                </select>
              </div>
            </div>

            {/* Net Total Preview Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-transparent border border-blue-500/20 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-400 block font-bold">صافي الراتب المستحق للصرف:</span>
                <span className="text-xs text-zinc-500">
                  {salBaseSalary} (أساسي) + {salBonuses} (حافز) - {salDeductions} (خصومات)
                </span>
              </div>
              <strong className="text-xl font-black text-emerald-500 font-mono">
                {formatCurrency(Math.max(0, salBaseSalary + salBonuses - salDeductions), 'EGP')}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="immediatePayCheck"
                checked={salImmediatePay}
                onChange={e => setSalImmediatePay(e.target.checked)}
                className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="immediatePayCheck" className="text-xs font-bold text-zinc-300 cursor-pointer">
                صرف الراتب الآن وخصمه فورياً من حركة الخزنة والحسابات
              </label>
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                ملاحظات الصرف والبيان
              </label>
              <input
                type="text"
                value={salNotes}
                onChange={e => setSalNotes(e.target.value)}
                placeholder="مثال: راتب شهر كامل مع تسوية ورديات سابقة"
                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSalaryModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="font-bold">
                {salImmediatePay ? 'تأكيد وصرف الراتب فوراً' : 'حفظ المسير كمعلق'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: DEDUCTION OR BONUS REGISTRATION                 */}
      {/* ======================================================== */}
      {isDeductionModalOpen && (
        <Modal
          isOpen={isDeductionModalOpen}
          onClose={() => setIsDeductionModalOpen(false)}
          title={dedType === 'deduction' ? '⚠️ تسجيل خصم / جزاء مالي على موظف' : '🎁 تسجيل مكافأة / حافز إضافي لموظف'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveDeduction} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                الموظف المستهدف *
              </label>
              <select
                required
                value={dedEmployeeId}
                onChange={e => setDedEmployeeId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-bold cursor-pointer"
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                نوع العملية *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDedType('deduction')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    dedType === 'deduction'
                      ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  ⚠️ خصم / جزاء مالي
                </button>
                <button
                  type="button"
                  onClick={() => setDedType('bonus')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    dedType === 'bonus'
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                      : 'border-gray-200 dark:border-[#27272A] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🎁 مكافأة / حافز إضافي
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  المبلغ (جنيه) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="10"
                  value={dedAmount}
                  onChange={e => setDedAmount(parseFloat(e.target.value) || 0)}
                  placeholder="200"
                  className={`w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border outline-none font-mono font-bold text-sm ${
                    dedType === 'deduction' ? 'border-rose-500/40 text-rose-500' : 'border-emerald-500/40 text-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                  الشهر المستهدف للتسوية *
                </label>
                <input
                  type="month"
                  required
                  value={dedMonth}
                  onChange={e => setDedMonth(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none font-mono cursor-pointer font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 font-bold mb-1">
                السبب والبيان التوضيحي *
              </label>
              <textarea
                rows={2}
                required
                value={dedReason}
                onChange={e => setDedReason(e.target.value)}
                placeholder={dedType === 'deduction' ? 'مثال: جزاء تأخير متكرر عن مواعيد الوردية' : 'مثال: مكافأة تحقيق أعلى تذاكر شحن لهذا الشهر'}
                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-[#27272A]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDeductionModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                type="submit"
                variant={dedType === 'deduction' ? 'danger' : 'primary'}
                size="sm"
                className="font-bold"
              >
                {dedType === 'deduction' ? 'اعتماد الخصم في المسير' : 'اعتماد المكافأة في المسير'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Employee Confirmation Modal */}
      {employeeToDelete && (
        <ConfirmDialog
          isOpen={Boolean(employeeToDelete)}
          onClose={() => setEmployeeToDelete(null)}
          onConfirm={handleConfirmDeleteEmployee}
          title="حذف سجل الموظف"
          message={`هل أنت متأكد من رغبتك في حذف الموظف [${employeeToDelete.fullName}] من قسم [${employeeToDelete.department}]؟`}
          confirmText="تأكيد الحذف"
          cancelText="إلغاء"
          variant="danger"
        />
      )}

      {/* Employee Profile Modal */}
      {selectedProfileEmployee && (
        <EmployeeProfileModal
          isOpen={Boolean(selectedProfileEmployee)}
          onClose={() => setSelectedProfileEmployeeId(null)}
          employee={selectedProfileEmployee}
          onEditEmployee={(emp) => handleOpenEditEmployee(emp)}
          onOpenSalaryModal={(emp) => handleOpenSalaryModal(emp)}
          onOpenAttendanceModal={(emp) => handleOpenAttendanceModal(emp)}
          onOpenDeductionModal={(emp, type) => handleOpenDeductionModal(emp, type)}
        />
      )}
    </div>
  );
};
