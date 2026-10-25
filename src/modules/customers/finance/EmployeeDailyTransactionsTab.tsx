import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { DateRangeFilter } from '../../../components/common/DateRangeFilter';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { Employee, AttendanceRecord, EmployeeDeduction, EmployeeIncentive } from '../../../types/finance.types';
import { formatCurrency, formatDate, formatDateTime, isTimeLateByHour, isTimeEarlyByHour, calculateDailyRate } from '../../../utils/formatters';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  TrendingDown,
  UserX,
  LogIn,
  LogOut,
  Plus,
  Eye,
  CalendarDays,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  Info
} from 'lucide-react';

export type TransactionFilterType = 'attendance' | 'checkout' | 'absence' | 'leave' | 'deduction' | 'reward';

interface EmployeeDailyTransactionsTabProps {
  employee: Employee;
  allAttendance: AttendanceRecord[];
  onRefresh: () => void;
  isDealer?: boolean;
}

interface DayTransactionTicket {
  date: string;
  attendanceRecord?: AttendanceRecord;
  checkIn?: string;
  isCheckInLate?: boolean;
  checkOut?: string;
  isCheckOutEarly?: boolean;
  workHours?: number;
  isAbsent?: boolean;
  absenceReason?: string;
  absenceTime?: string;
  penaltyDays?: number;
  absenceDeduction?: number;
  isLeave?: boolean;
  leaveType?: string;
  leaveTime?: string;
  leaveNotes?: string;
  deductions: EmployeeDeduction[];
  totalDeductions: number;
  rewards: EmployeeIncentive[];
  totalRewards: number;
}

export const EmployeeDailyTransactionsTab: React.FC<EmployeeDailyTransactionsTabProps> = ({
  employee,
  allAttendance,
  onRefresh,
  isDealer = false
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // 1. Date Range Filter
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 2. Multi-Select Type Filter
  const [selectedTypes, setSelectedTypes] = useState<Record<TransactionFilterType, boolean>>({
    attendance: true,
    checkout: true,
    absence: true,
    leave: true,
    deduction: true,
    reward: true
  });

  // Toggle Type Selection
  const toggleType = (type: TransactionFilterType) => {
    setSelectedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const selectAllTypes = () => {
    setSelectedTypes({
      attendance: true,
      checkout: true,
      absence: true,
      leave: true,
      deduction: true,
      reward: true
    });
  };

  const clearAllTypes = () => {
    setSelectedTypes({
      attendance: false,
      checkout: false,
      absence: false,
      leave: false,
      deduction: false,
      reward: false
    });
  };

  // Selected Day for Detailed Ticket Modal
  const [selectedTicketForModal, setSelectedTicketForModal] = useState<DayTransactionTicket | null>(null);

  // Quick Action Modals
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);

  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [checkOutTime, setCheckOutTime] = useState('');
  const [checkOutHours, setCheckOutHours] = useState(8);
  const [checkOutNotes, setCheckOutNotes] = useState('');

  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [absenceTime, setAbsenceTime] = useState(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }));
  const [absenceReason, setAbsenceReason] = useState('غياب غير مبرر');
  const [penaltyDays, setPenaltyDays] = useState<number>(1);

  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [deductionDate, setDeductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [deductionTime, setDeductionTime] = useState(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }));
  const [deductionCalcType, setDeductionCalcType] = useState<'days' | 'amount'>('days');
  const [deductionDays, setDeductionDays] = useState<number>(1);
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [deductionReason, setDeductionReason] = useState('');

  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [rewardDate, setRewardDate] = useState(new Date().toISOString().split('T')[0]);
  const [rewardTime, setRewardTime] = useState(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }));
  const [rewardCalcType, setRewardCalcType] = useState<'days' | 'amount'>('days');
  const [rewardDays, setRewardDays] = useState<number>(1);
  const [rewardAmount, setRewardAmount] = useState<number>(0);
  const [rewardReason, setRewardReason] = useState('');

  // Daily Rate calculation (Salary / 30)
  const dailyRate = useMemo(() => {
    return employee.dailyRate || calculateDailyRate(employee.baseSalary || 5000);
  }, [employee]);

  // Work times
  const expectedStartTime = employee.workStartTime || '09:00';
  const expectedEndTime = employee.workEndTime || '17:00';

  // Group all employee events by Date to form Day Tickets
  const allTicketsMap = useMemo(() => {
    const map = new Map<string, DayTransactionTicket>();

    const getOrCreate = (d: string): DayTransactionTicket => {
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          deductions: [],
          totalDeductions: 0,
          rewards: [],
          totalRewards: 0
        });
      }
      return map.get(d)!;
    };

    // 1. Attendance records
    allAttendance.forEach(att => {
      const ticket = getOrCreate(att.date);
      ticket.attendanceRecord = att;
      if (att.checkIn && att.checkIn !== '-') {
        ticket.checkIn = att.checkIn;
        // Check if late by 1 hour or more
        ticket.isCheckInLate = isTimeLateByHour(att.checkIn, expectedStartTime) || att.status === 'late' || (att.penaltyHours ? att.penaltyHours > 0 : false);
      }
      if (att.checkOut && att.checkOut !== '-') {
        ticket.checkOut = att.checkOut;
        ticket.workHours = att.workHours;
        ticket.isCheckOutEarly = isTimeEarlyByHour(att.checkOut, expectedEndTime);
      }
      if (att.status === 'absent') {
        ticket.isAbsent = true;
        ticket.absenceReason = att.notes;
        ticket.absenceTime = att.absenceTime;
        ticket.penaltyDays = att.penaltyDays || 1;
        ticket.absenceDeduction = att.deductionAmount || Math.round((ticket.penaltyDays * dailyRate) * 100) / 100;
      }
      if (att.status === 'leave') {
        ticket.isLeave = true;
        ticket.leaveType = att.leaveType || 'إجازة اعتيادية';
        ticket.leaveTime = att.leaveTime;
        ticket.leaveNotes = att.notes;
      }
    });

    // 2. Deductions
    (employee.deductions || []).forEach(ded => {
      const ticket = getOrCreate(ded.date);
      ticket.deductions.push(ded);
      ticket.totalDeductions += ded.amount;
    });

    // 3. Rewards / Incentives
    (employee.incentives || []).forEach(inc => {
      const ticket = getOrCreate(inc.date);
      ticket.rewards.push(inc);
      ticket.totalRewards += inc.amount;
    });

    return map;
  }, [allAttendance, employee.deductions, employee.incentives, expectedStartTime, expectedEndTime, dailyRate]);

  // Filter tickets by Date & Multi-Select Types
  const filteredTickets = useMemo(() => {
    const list = Array.from(allTicketsMap.values());

    return list
      .filter(t => {
        // Date Filter
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;

        // Type Filter (matches if ticket has at least one of the selected types)
        const hasAttendance = Boolean(t.checkIn);
        const hasCheckout = Boolean(t.checkOut);
        const hasAbsence = Boolean(t.isAbsent);
        const hasLeave = Boolean(t.isLeave);
        const hasDeduction = t.deductions.length > 0;
        const hasReward = t.rewards.length > 0;

        // If all are unselected, show nothing
        const anySelected = Object.values(selectedTypes).some(v => v);
        if (!anySelected) return false;

        const match =
          (selectedTypes.attendance && hasAttendance) ||
          (selectedTypes.checkout && hasCheckout) ||
          (selectedTypes.absence && hasAbsence) ||
          (selectedTypes.leave && hasLeave) ||
          (selectedTypes.deduction && hasDeduction) ||
          (selectedTypes.reward && hasReward);

        return match;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allTicketsMap, startDate, endDate, selectedTypes]);

  // Handlers for Add Operations
  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    db.recordAttendanceCheckIn(employee.id, checkInTime || undefined, checkInNotes || undefined);
    showToast('success', 'تم تسجيل الحضور', `تم تسجيل حضور الموظف ${employee.fullName} بنجاح`);
    setIsCheckInModalOpen(false);
    setCheckInTime('');
    setCheckInNotes('');
    onRefresh();
  };

  const handleCheckOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    db.recordAttendanceCheckOut(employee.id, checkOutTime || undefined, checkOutHours || undefined, checkOutNotes || undefined);
    showToast('success', 'تم تسجيل الانصراف', `تم تسجيل انصراف الموظف ${employee.fullName} بنجاح`);
    setIsCheckOutModalOpen(false);
    setCheckOutTime('');
    setCheckOutNotes('');
    onRefresh();
  };

  const handleAbsenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const days = Math.max(1, Number(penaltyDays) || 1);
    db.recordAttendanceAbsence(employee.id, absenceDate, absenceReason, days, undefined, user, absenceTime);
    showToast('success', 'تم تسجيل الغياب', `تم تسجيل غياب للموظف وخصم ${days} يوم (${formatCurrency(days * dailyRate)}) الساعة ${absenceTime}`);
    setIsAbsenceModalOpen(false);
    setPenaltyDays(1);
    setAbsenceReason('غياب غير مبرر');
    onRefresh();
  };

  const handleDeductionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductionReason.trim()) {
      showToast('error', 'سبب إجباري', 'يرجى كتابة سبب الخصم لمعرفة السبب في الجرد');
      return;
    }

    let finalAmount = 0;
    if (deductionCalcType === 'days') {
      if (deductionDays < 0.5) {
        showToast('error', 'قيمة غير مقبولة', 'الحد الأدنى للخصم بالأيام هو نصف يوم (0.5)');
        return;
      }
      finalAmount = Math.round(deductionDays * dailyRate * 100) / 100;
    } else {
      if (deductionAmount <= 0) {
        showToast('error', 'مبلغ غير صحيح', 'يرجى كتابة مبلغ مالي أكبر من صفر');
        return;
      }
      finalAmount = deductionAmount;
    }

    const month = deductionDate.substring(0, 7);
    db.applyEmployeeDeductionOrBonus(
      employee.id,
      'deduction',
      finalAmount,
      deductionReason.trim(),
      month,
      deductionCalcType,
      deductionCalcType === 'days' ? deductionDays : undefined,
      deductionDate,
      deductionTime
    );

    showToast('success', 'تم تطبيق الخصم', `تم تسجيل خصم بقيمة ${formatCurrency(finalAmount)} الساعة ${deductionTime}`);
    setIsDeductionModalOpen(false);
    setDeductionDays(1);
    setDeductionAmount(0);
    setDeductionReason('');
    onRefresh();
  };

  const handleRewardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardReason.trim()) {
      showToast('error', 'سبب إجباري', 'يرجى كتابة سبب المكافأة لمعرفة السبب في الجرد');
      return;
    }

    let finalAmount = 0;
    if (rewardCalcType === 'days') {
      if (rewardDays < 0.5) {
        showToast('error', 'قيمة غير مقبولة', 'الحد الأدنى للمكافأة بالأيام هو نصف يوم (0.5)');
        return;
      }
      finalAmount = Math.round(rewardDays * dailyRate * 100) / 100;
    } else {
      if (rewardAmount <= 0) {
        showToast('error', 'مبلغ غير صحيح', 'يرجى كتابة مبلغ مالي أكبر من صفر');
        return;
      }
      finalAmount = rewardAmount;
    }

    const month = rewardDate.substring(0, 7);
    db.addEmployeeIncentive(
      employee.id,
      finalAmount,
      'reward',
      rewardReason.trim(),
      month,
      user,
      rewardCalcType,
      rewardCalcType === 'days' ? rewardDays : undefined,
      rewardDate,
      rewardTime
    );

    showToast('success', 'تم إضافة المكافأة', `تم تسجيل مكافأة بقيمة ${formatCurrency(finalAmount)} للموظف الساعة ${rewardTime}`);
    setIsRewardModalOpen(false);
    setRewardDays(1);
    setRewardAmount(0);
    setRewardReason('');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar & Quick Actions */}
      <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
              <span>سجل المعاملات اليومية للموظف</span>
              <Badge variant="default" size="sm" className="font-mono">
                {filteredTickets.length} يوم
              </Badge>
            </h4>
            <p className="text-[11px] text-zinc-400">
              سعر اليوم: <span className="font-bold text-emerald-400 font-mono">{formatCurrency(dailyRate)}</span> (الراتب ÷ 30 يوم) • مواعيد العمل: {expectedStartTime} إلى {expectedEndTime}
            </p>
          </div>
        </div>

        {/* Quick Add Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            icon={<LogIn className="w-3.5 h-3.5 text-emerald-400" />}
            onClick={() => setIsCheckInModalOpen(true)}
            className="text-xs font-bold"
          >
            تسجيل حضور
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<LogOut className="w-3.5 h-3.5 text-blue-400" />}
            onClick={() => setIsCheckOutModalOpen(true)}
            className="text-xs font-bold"
          >
            تسجيل انصراف
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<UserX className="w-3.5 h-3.5 text-amber-400" />}
            onClick={() => setIsAbsenceModalOpen(true)}
            className="text-xs font-bold hover:border-amber-500/40"
          >
            تسجيل غياب
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
            onClick={() => setIsDeductionModalOpen(true)}
            className="text-xs font-bold hover:border-rose-500/40"
          >
            تسجيل خصم
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<Award className="w-3.5 h-3.5 text-amber-400" />}
            onClick={() => setIsRewardModalOpen(true)}
            className="text-xs font-bold hover:border-amber-500/40"
          >
            إضافة مكافأة
          </Button>
        </div>
      </div>

      {/* 2. Filters Bar: Multi-Select + Calendar Date Filter */}
      <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Multi-Select Types */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              تحديد المعاملات:
            </span>

            {[
              { key: 'attendance' as TransactionFilterType, label: 'الحضور', color: 'emerald' },
              { key: 'checkout' as TransactionFilterType, label: 'الانصراف', color: 'blue' },
              { key: 'absence' as TransactionFilterType, label: 'الغياب', color: 'rose' },
              { key: 'leave' as TransactionFilterType, label: 'الإجازة', color: 'purple' },
              { key: 'deduction' as TransactionFilterType, label: 'الخصومات', color: 'red' },
              { key: 'reward' as TransactionFilterType, label: 'المكافآت', color: 'amber' }
            ].map(item => {
              const active = selectedTypes[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleType(item.key)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    active
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-xs'
                      : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {active ? (
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="flex items-center gap-1 mr-auto text-[11px]">
              <button
                type="button"
                onClick={selectAllTypes}
                className="text-emerald-400 hover:underline px-1"
              >
                تحديد الكل
              </button>
              <span className="text-zinc-600">•</span>
              <button
                type="button"
                onClick={clearAllTypes}
                className="text-zinc-500 hover:underline px-1"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>

          {/* Calendar Date Filter */}
          <div className="shrink-0 relative z-30">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onReset={() => {
                setStartDate('');
                setEndDate('');
              }}
              label="تقويم المعاملات"
              dropdownAlignment="left"
            />
          </div>
        </div>
      </div>

      {/* 3. Daily Tickets Horizontal List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
            <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-2 opacity-50" />
            <p className="font-bold text-sm text-zinc-400">لا توجد معاملات يومية مطابقة للفلتر المحدد</p>
            <p className="text-xs text-zinc-500 mt-1">
              جرب تغيير خيارات التحديد أو توسيع نطاق تاريخ التقويم
            </p>
          </div>
        ) : (
          filteredTickets.map(ticket => {
            const isToday = ticket.date === new Date().toISOString().split('T')[0];

            return (
              <div
                key={ticket.date}
                className={`p-3.5 rounded-2xl border transition-all hover:shadow-md ${
                  isToday
                    ? 'bg-zinc-900/90 border-emerald-500/40 shadow-emerald-950/20'
                    : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Ticket Top Header Bar */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                    <span className="font-black text-sm text-zinc-100 font-mono">
                      {formatDate(ticket.date)}
                    </span>
                    {isToday && (
                      <Badge variant="success" size="sm" className="font-bold">
                        اليوم
                      </Badge>
                    )}
                    <span className="text-[11px] text-zinc-400 font-mono">({ticket.date})</span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Eye className="w-3.5 h-3.5 text-emerald-400" />}
                    onClick={() => setSelectedTicketForModal(ticket)}
                    className="text-xs font-bold bg-zinc-800/70 hover:bg-emerald-600 hover:text-white border-zinc-700"
                  >
                    فتح التذكرة بالتفصيل
                  </Button>
                </div>

                {/* Horizontal Ticket Grid (العرض الموزع) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                  {/* Part 1: حضور */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
                      ticket.isCheckInLate
                        ? 'bg-red-500/15 border-red-500 text-red-300 shadow-xs shadow-red-950/40 animate-pulse'
                        : ticket.checkIn
                        ? 'bg-zinc-800/60 border-emerald-500/30 text-zinc-200'
                        : 'bg-zinc-800/20 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] flex items-center gap-1">
                        <LogIn className="w-3 h-3 text-emerald-400" />
                        حضور
                      </span>
                      {ticket.isCheckInLate && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-600 text-white font-black animate-bounce">
                          تأخير &gt; 1س
                        </span>
                      )}
                    </div>
                    <div className="font-mono font-black text-xs mt-0.5">
                      {ticket.checkIn || '—'}
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1">
                      المعتاد: {expectedStartTime}
                    </span>
                  </div>

                  {/* Part 2: انصراف */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
                      ticket.isCheckOutEarly
                        ? 'bg-red-500/15 border-red-500 text-red-300 shadow-xs shadow-red-950/40'
                        : ticket.checkOut
                        ? 'bg-zinc-800/60 border-blue-500/30 text-zinc-200'
                        : 'bg-zinc-800/20 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] flex items-center gap-1">
                        <LogOut className="w-3 h-3 text-blue-400" />
                        انصراف
                      </span>
                      {ticket.isCheckOutEarly && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-600 text-white font-black">
                          انصراف مبكر
                        </span>
                      )}
                    </div>
                    <div className="font-mono font-black text-xs mt-0.5">
                      {ticket.checkOut ? `${ticket.checkOut}` : '—'}
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1">
                      {ticket.workHours ? `${ticket.workHours} س عمل` : `المعتاد: ${expectedEndTime}`}
                    </span>
                  </div>

                  {/* Part 3: غياب (ويظهر تحتها اتخصمت كام يوم) */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                      ticket.isAbsent
                        ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
                        : 'bg-zinc-800/20 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] flex items-center gap-1 text-rose-400">
                        <UserX className="w-3 h-3" />
                        غياب
                      </span>
                      {ticket.isAbsent && (
                        <Badge variant="danger" size="sm">
                          غائب
                        </Badge>
                      )}
                    </div>
                    {ticket.isAbsent ? (
                      <div>
                        <div className="font-bold text-rose-400 text-xs">
                          اتخصم: {ticket.penaltyDays || 1} يوم
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center justify-between">
                          <span>({formatCurrency(ticket.absenceDeduction || dailyRate)})</span>
                          {ticket.absenceTime && (
                            <span className="font-mono text-zinc-300 font-semibold">{ticket.absenceTime}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-xs">لا يوجد غياب</span>
                    )}
                  </div>

                  {/* Part 4: إجازة */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                      ticket.isLeave
                        ? 'bg-purple-500/15 border-purple-500/50 text-purple-300'
                        : 'bg-zinc-800/20 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] flex items-center gap-1 text-purple-400">
                        <Calendar className="w-3 h-3" />
                        إجازة
                      </span>
                      {ticket.isLeave && (
                        <Badge variant="default" size="sm">
                          معتمدة
                        </Badge>
                      )}
                    </div>
                    {ticket.isLeave ? (
                      <div>
                        <div className="font-bold text-purple-300 text-xs flex items-center justify-between">
                          <span>{ticket.leaveType}</span>
                          {ticket.leaveTime && (
                            <span className="font-mono text-[10px] text-zinc-300 font-semibold">{ticket.leaveTime}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 block truncate">
                          {ticket.leaveNotes || 'إجازة رسمية'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-xs">عمل اعتيادي</span>
                    )}
                  </div>

                  {/* Part 5: خصم */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                      ticket.totalDeductions > 0
                        ? 'bg-red-500/15 border-red-500/40 text-red-300'
                        : 'bg-zinc-800/20 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] flex items-center gap-1 text-rose-400">
                        <TrendingDown className="w-3 h-3" />
                        خصم
                      </span>
                      {ticket.totalDeductions > 0 && (
                        <span className="text-[10px] font-bold text-rose-400 font-mono">
                          -{formatCurrency(ticket.totalDeductions)}
                        </span>
                      )}
                    </div>
                    {ticket.deductions.length > 0 ? (
                      <div>
                        <div className="font-bold text-xs truncate">
                          {ticket.deductions[0].reason}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                          <span>
                            {ticket.deductions[0].calculationType === 'days'
                              ? `(${ticket.deductions[0].daysCount} يوم)`
                              : 'مبلغ مالي'}
                          </span>
                          {ticket.deductions[0].time && (
                            <span className="font-mono text-zinc-300 font-semibold">{ticket.deductions[0].time}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-xs">لا توجد خصومات</span>
                    )}
                  </div>

                  {/* Part 6: مكافأة */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                      ticket.totalRewards > 0
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-zinc-800/20 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] flex items-center gap-1 text-amber-400">
                        <Award className="w-3 h-3" />
                        مكافأة
                      </span>
                      {ticket.totalRewards > 0 && (
                        <span className="text-[10px] font-bold text-emerald-400 font-mono">
                          +{formatCurrency(ticket.totalRewards)}
                        </span>
                      )}
                    </div>
                    {ticket.rewards.length > 0 ? (
                      <div>
                        <div className="font-bold text-xs truncate">{ticket.rewards[0].reason}</div>
                        <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                          <span>
                            {ticket.rewards[0].calculationType === 'days'
                              ? `(${ticket.rewards[0].daysCount} يوم)`
                              : 'مبلغ مالي'}
                          </span>
                          {ticket.rewards[0].time && (
                            <span className="font-mono text-zinc-300 font-semibold">{ticket.rewards[0].time}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-xs">لا توجد مكافآت</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================= */}
      {/* 4. DETAILED DAY TICKET MODAL */}
      {/* ============================================================= */}
      {selectedTicketForModal && (
        <Modal
          isOpen={Boolean(selectedTicketForModal)}
          onClose={() => setSelectedTicketForModal(null)}
          title={`🎫 تفاصيل تذكرة يوم: ${formatDate(selectedTicketForModal.date)} (${selectedTicketForModal.date})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-right">
            {/* Header summary banner */}
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 block">الموظف:</span>
                <h4 className="font-black text-base text-white">
                  {employee.fullName} ({employee.jobTitle})
                </h4>
              </div>
              <div className="text-left font-mono">
                <span className="text-[11px] text-zinc-400 block">تكلفة اليوم المعتمدة:</span>
                <span className="font-black text-emerald-400 text-sm">
                  {formatCurrency(dailyRate)} (الراتب ÷ 30)
                </span>
              </div>
            </div>

            {/* Attendance Details Card */}
            <Card className="p-4 bg-zinc-900/60 border border-zinc-800 space-y-3">
              <h5 className="font-bold text-xs text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>سجل الحضور والانصراف ومواعيد العمل</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div
                  className={`p-3 rounded-xl border ${
                    selectedTicketForModal.isCheckInLate
                      ? 'bg-red-500/10 border-red-500 text-red-200'
                      : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300'
                  }`}
                >
                  <span className="text-[11px] text-zinc-400 block">تسجيل الحضور الفعلي:</span>
                  <span className="font-mono font-bold text-sm block mt-0.5">
                    {selectedTicketForModal.checkIn || 'لم يُسجل حضور'}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-1">
                    الميعاد المحدد: {expectedStartTime}
                    {selectedTicketForModal.isCheckInLate && ' (⚠️ تأخير أبعد من ساعة)'}
                  </span>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    selectedTicketForModal.isCheckOutEarly
                      ? 'bg-red-500/10 border-red-500 text-red-200'
                      : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300'
                  }`}
                >
                  <span className="text-[11px] text-zinc-400 block">تسجيل الانصراف الفعلي:</span>
                  <span className="font-mono font-bold text-sm block mt-0.5">
                    {selectedTicketForModal.checkOut || 'لم يُسجل انصراف'}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-1">
                    الميعاد المحدد: {expectedEndTime}
                    {selectedTicketForModal.isCheckOutEarly && ' (⚠️ انصراف مبكر بأكثر من ساعة)'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Absence & Leave Breakdown */}
            {(selectedTicketForModal.isAbsent || selectedTicketForModal.isLeave) && (
              <Card className="p-4 bg-zinc-900/60 border border-zinc-800 space-y-2">
                <h5 className="font-bold text-xs text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                  <UserX className="w-4 h-4 text-rose-400" />
                  <span>بيان الغياب أو الإجازة</span>
                </h5>

                {selectedTicketForModal.isAbsent && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-rose-400">حالة اليوم: غياب مسجل</span>
                      <Badge variant="danger" size="sm">
                        خصم {selectedTicketForModal.penaltyDays || 1} يوم
                      </Badge>
                    </div>
                    <p className="text-zinc-300">السبب: {selectedTicketForModal.absenceReason || 'غياب بدون إذن'}</p>
                    <div className="flex justify-between items-center text-[11px] text-zinc-400 mt-1">
                      <span className="font-mono">
                        المبلغ المخصوم من الراتب: {formatCurrency(selectedTicketForModal.absenceDeduction || dailyRate)}
                      </span>
                      {selectedTicketForModal.absenceTime && (
                        <span className="font-mono text-zinc-300 font-bold">ساعة التسجيل: {selectedTicketForModal.absenceTime}</span>
                      )}
                    </div>
                  </div>
                )}

                {selectedTicketForModal.isLeave && (
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-purple-300">إجازة معتمدة: {selectedTicketForModal.leaveType}</span>
                      {selectedTicketForModal.leaveTime && (
                        <span className="font-mono text-purple-300 text-[11px] font-bold">ساعة التسجيل: {selectedTicketForModal.leaveTime}</span>
                      )}
                    </div>
                    <p className="text-zinc-400 mt-1">{selectedTicketForModal.leaveNotes}</p>
                  </div>
                )}
              </Card>
            )}

            {/* Deductions & Rewards Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Deductions */}
              <Card className="p-3 bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                  <span className="font-bold text-rose-400 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    الخصومات والجزاءات
                  </span>
                  <span className="font-mono font-bold text-rose-400">
                    -{formatCurrency(selectedTicketForModal.totalDeductions)}
                  </span>
                </div>
                {selectedTicketForModal.deductions.length === 0 ? (
                  <p className="text-zinc-500 text-center py-2">لا توجد خصومات</p>
                ) : (
                  selectedTicketForModal.deductions.map(d => (
                    <div key={d.id} className="p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/40 space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{d.reason}</span>
                        <span className="text-rose-400 font-mono">-{formatCurrency(d.amount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-400">
                        <span>
                          طريقة الحساب: {d.calculationType === 'days' ? `بالأيام (${d.daysCount} يوم × ${formatCurrency(dailyRate)})` : 'مبلغ مالي مباشر'}
                        </span>
                        {d.time && (
                          <span className="font-mono text-zinc-300 font-bold">الساعة: {d.time}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </Card>

              {/* Rewards */}
              <Card className="p-3 bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    المكافآت والبدلات
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    +{formatCurrency(selectedTicketForModal.totalRewards)}
                  </span>
                </div>
                {selectedTicketForModal.rewards.length === 0 ? (
                  <p className="text-zinc-500 text-center py-2">لا توجد مكافآت</p>
                ) : (
                  selectedTicketForModal.rewards.map(r => (
                    <div key={r.id} className="p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/40 space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{r.reason}</span>
                        <span className="text-emerald-400 font-mono">+{formatCurrency(r.amount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-400">
                        <span>
                          طريقة الحساب: {r.calculationType === 'days' ? `بالأيام (${r.daysCount} يوم × ${formatCurrency(dailyRate)})` : 'مبلغ مالي مباشر'}
                        </span>
                        {r.time && (
                          <span className="font-mono text-zinc-300 font-bold">الساعة: {r.time}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-zinc-800">
              <Button size="sm" variant="secondary" onClick={() => setSelectedTicketForModal(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* 5. ADD MODALS (Check-in, Check-out, Absence, Deduction, Reward) */}
      {/* ============================================================= */}

      {/* Check In Modal */}
      <Modal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        title={`🟢 تسجيل حضور: ${employee.fullName}`}
        maxWidth="md"
      >
        <form onSubmit={handleCheckInSubmit} className="space-y-3 text-right">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">وقت الحضور:</label>
            <Input
              type="time"
              value={checkInTime}
              onChange={e => setCheckInTime(e.target.value)}
              placeholder="09:00"
            />
            <span className="text-[11px] text-zinc-400 mt-1 block">
              ميعاد الحضور المعتاد للموظف: {expectedStartTime} (في حال التأخير بأكثر من ساعة يتلون بالأحمر)
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">ملاحظات الحضور (اختياري):</label>
            <Input
              value={checkInNotes}
              onChange={e => setCheckInNotes(e.target.value)}
              placeholder="تسجيل حضور اعتيادي..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsCheckInModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500">
              تأكيد الحضور
            </Button>
          </div>
        </form>
      </Modal>

      {/* Check Out Modal */}
      <Modal
        isOpen={isCheckOutModalOpen}
        onClose={() => setIsCheckOutModalOpen(false)}
        title={`🔵 تسجيل انصراف: ${employee.fullName}`}
        maxWidth="md"
      >
        <form onSubmit={handleCheckOutSubmit} className="space-y-3 text-right">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">وقت الانصراف:</label>
            <Input
              type="time"
              value={checkOutTime}
              onChange={e => setCheckOutTime(e.target.value)}
              placeholder="17:00"
            />
            <span className="text-[11px] text-zinc-400 mt-1 block">
              ميعاد الانصراف المعتاد للموظف: {expectedEndTime}
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">ساعات العمل الفعلية:</label>
            <Input
              type="number"
              step="0.5"
              min="1"
              max="24"
              value={checkOutHours}
              onChange={e => setCheckOutHours(parseFloat(e.target.value) || 8)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">ملاحظات الانصراف (اختياري):</label>
            <Input
              value={checkOutNotes}
              onChange={e => setCheckOutNotes(e.target.value)}
              placeholder="تسجيل انصراف..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsCheckOutModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-blue-600 hover:bg-blue-500">
              تأكيد الانصراف
            </Button>
          </div>
        </form>
      </Modal>

      {/* Absence Modal */}
      <Modal
        isOpen={isAbsenceModalOpen}
        onClose={() => setIsAbsenceModalOpen(false)}
        title={`⚠️ تسجيل غياب للموظف: ${employee.fullName}`}
        maxWidth="md"
      >
        <form onSubmit={handleAbsenceSubmit} className="space-y-3 text-right">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">تاريخ الغياب:</label>
              <Input
                type="date"
                required
                value={absenceDate}
                onChange={e => setAbsenceDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">ساعة التسجيل:</label>
              <Input
                type="time"
                required
                value={absenceTime}
                onChange={e => setAbsenceTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">
              عدد الأيام التي سوف يتم خصمها من الموظف:
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                min="1"
                required
                value={penaltyDays}
                onChange={e => setPenaltyDays(parseFloat(e.target.value) || 1)}
              />
              <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">
                = {formatCurrency(penaltyDays * dailyRate)}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              في الحالة الطبيعية يكون الخصم 1 يوم من الراتب مقابل يوم الغياب، أو أكثر في حالة العقوبة
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">سبب الغياب (إجباري للجرد):</label>
            <Input
              required
              placeholder="مثال: غياب مفاجئ بدون إذن، ظرف خاص..."
              value={absenceReason}
              onChange={e => setAbsenceReason(e.target.value)}
            />
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
            <span className="text-zinc-400 block">سعر اليوم للموظف: {formatCurrency(dailyRate)}</span>
            <span className="font-bold text-rose-400 block mt-0.5">
              إجمالي الخصم المالي: {formatCurrency(penaltyDays * dailyRate)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAbsenceModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-500">
              تثبيت الغياب والخصم
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deduction Modal (نوعين من الحساب + سبب إجباري) */}
      <Modal
        isOpen={isDeductionModalOpen}
        onClose={() => setIsDeductionModalOpen(false)}
        title={`🛑 تسجيل خصم جديد للموظف: ${employee.fullName}`}
        maxWidth="md"
      >
        <form onSubmit={handleDeductionSubmit} className="space-y-3 text-right">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">تاريخ الخصم:</label>
              <Input
                type="date"
                required
                value={deductionDate}
                onChange={e => setDeductionDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">ساعة الخصم:</label>
              <Input
                type="time"
                required
                value={deductionTime}
                onChange={e => setDeductionTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">طريقة حساب الخصم:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeductionCalcType('days')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  deductionCalcType === 'days'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-zinc-800/40 border-zinc-700 text-zinc-400'
                }`}
              >
                1. بالايام (حد أدنى 0.5 يوم)
              </button>
              <button
                type="button"
                onClick={() => setDeductionCalcType('amount')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  deductionCalcType === 'amount'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-zinc-800/40 border-zinc-700 text-zinc-400'
                }`}
              >
                2. مبلغ مالي مباشر
              </button>
            </div>
          </div>

          {deductionCalcType === 'days' ? (
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                عدد أيام الخصم (حد أدنى 0.5 يوم):
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={deductionDays}
                  onChange={e => setDeductionDays(parseFloat(e.target.value) || 0.5)}
                />
                <span className="text-xs font-mono text-zinc-400 whitespace-nowrap font-bold text-rose-400">
                  = {formatCurrency(deductionDays * dailyRate)}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                المبلغ المالي المباشر (جنيه مصري):
              </label>
              <Input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="200"
                value={deductionAmount || ''}
                onChange={e => setDeductionAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">
              سبب الخصم <span className="text-rose-400">(إجباري لمعرفة السبب في الجرد)</span>:
            </label>
            <Input
              required
              placeholder="مثال: تأخير متكرر عن مواعيد العمل، خطأ في تسليم شحنة..."
              value={deductionReason}
              onChange={e => setDeductionReason(e.target.value)}
            />
          </div>

          <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-xs flex justify-between items-center">
            <span className="text-zinc-400">إجمالي قيمة الخصم:</span>
            <span className="font-mono font-black text-rose-400 text-sm">
              -{formatCurrency(deductionCalcType === 'days' ? deductionDays * dailyRate : deductionAmount)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsDeductionModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-500">
              تطبيق الخصم
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reward Modal (نوعين من الحساب + سبب إجباري) */}
      <Modal
        isOpen={isRewardModalOpen}
        onClose={() => setIsRewardModalOpen(false)}
        title={`🏆 إضافة مكافأة للموظف: ${employee.fullName}`}
        maxWidth="md"
      >
        <form onSubmit={handleRewardSubmit} className="space-y-3 text-right">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">تاريخ المكافأة:</label>
              <Input
                type="date"
                required
                value={rewardDate}
                onChange={e => setRewardDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">ساعة المكافأة:</label>
              <Input
                type="time"
                required
                value={rewardTime}
                onChange={e => setRewardTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">طريقة حساب المكافأة:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRewardCalcType('days')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  rewardCalcType === 'days'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-zinc-800/40 border-zinc-700 text-zinc-400'
                }`}
              >
                1. بالايام (حد أدنى 0.5 يوم)
              </button>
              <button
                type="button"
                onClick={() => setRewardCalcType('amount')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  rewardCalcType === 'amount'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-zinc-800/40 border-zinc-700 text-zinc-400'
                }`}
              >
                2. مبلغ مالي مباشر
              </button>
            </div>
          </div>

          {rewardCalcType === 'days' ? (
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                عدد أيام المكافأة (حد أدنى 0.5 يوم):
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={rewardDays}
                  onChange={e => setRewardDays(parseFloat(e.target.value) || 0.5)}
                />
                <span className="text-xs font-mono text-zinc-400 whitespace-nowrap font-bold text-emerald-400">
                  = {formatCurrency(rewardDays * dailyRate)}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                المبلغ المالي المباشر (جنيه مصري):
              </label>
              <Input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="500"
                value={rewardAmount || ''}
                onChange={e => setRewardAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">
              سبب المكافأة <span className="text-amber-400">(إجباري لمعرفة السبب في الجرد)</span>:
            </label>
            <Input
              required
              placeholder="مثال: سرعة تنفيذ طلبات الشحن، التزام متميز، تقييم إيجابي..."
              value={rewardReason}
              onChange={e => setRewardReason(e.target.value)}
            />
          </div>

          <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-xs flex justify-between items-center">
            <span className="text-zinc-400">إجمالي قيمة المكافأة:</span>
            <span className="font-mono font-black text-emerald-400 text-sm">
              +{formatCurrency(rewardCalcType === 'days' ? rewardDays * dailyRate : rewardAmount)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsRewardModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500">
              إضافة المكافأة
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
