import React, { useState, useMemo } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import {
  Employee,
  AttendanceRecord,
  SalarySlip,
  EmployeeAdvance,
  EmployeeIncentive,
  EmployeeAttachment
} from '../../../types/finance.types';
import { formatCurrency, formatDate, formatDateTime, getDaysInMonth, calculateDailyRate } from '../../../utils/formatters';
import { exportToExcel } from '../../../utils/excelExport';
import { ReportEngine } from '../../../services/reporting/reportEngine';
import { ReportPreviewModal } from '../../../components/reporting/ReportPreviewModal';
import { ReportConfig, ReportDocumentData } from '../../../services/reporting/reportTypes';
import { EmployeeDailyTransactionsTab } from '../../customers/finance/EmployeeDailyTransactionsTab';
import {
  User,
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
  Paperclip,
  Award,
  Gift,
  Coins,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  ExternalLink,
  MapPin,
  Edit,
  Receipt
} from 'lucide-react';

interface DealerFinanceEmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEmployeeUpdated?: () => void;
}

type ProfileTab =
  | 'personal'
  | 'salaries'
  | 'daily_transactions'
  | 'advances'
  | 'attachments'
  | 'audit';

export const DealerFinanceEmployeeProfileModal: React.FC<DealerFinanceEmployeeProfileModalProps> = ({
  isOpen,
  onClose,
  employee,
  onEmployeeUpdated
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    if (onEmployeeUpdated) onEmployeeUpdated();
  };

  const emp = useMemo(() => {
    if (!employee) return null;
    return db.getDealerEmployeeById(employee.id) || employee;
  }, [employee, refreshTrigger, isOpen]);

  // Attendance Records
  const allAttendance = useMemo(() => {
    if (!emp) return [];
    return db.getDealerAttendance(emp.id);
  }, [emp, refreshTrigger]);

  // Salary Slips
  const allSalarySlips = useMemo(() => {
    if (!emp) return [];
    return db.getDealerSalaries().filter(s => s.employeeId === emp.id);
  }, [emp, refreshTrigger]);

  // Audit Logs
  const employeeAuditLogs = useMemo(() => {
    if (!emp) return [];
    return db.getAuditLogs().filter(
      l => l.entityId === emp.id || (l.details && l.details.includes(emp.fullName))
    );
  }, [emp, refreshTrigger]);

  // Modals for adding Advance / Deduction / Reward / Incentive / Attachment
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [advanceTime, setAdvanceTime] = useState(new Date().toTimeString().slice(0, 5));
  const [advanceReason, setAdvanceReason] = useState('');
  const [advanceFromVault, setAdvanceFromVault] = useState(true);

  // Repay Advance / Debt Installment Modal State
  const [isRepayAdvanceModalOpen, setIsRepayAdvanceModalOpen] = useState(false);
  const [selectedAdvanceIdForRepay, setSelectedAdvanceIdForRepay] = useState('');
  const [repayAmount, setRepayAmount] = useState<number>(0);
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
  const [repayTime, setRepayTime] = useState(new Date().toTimeString().slice(0, 5));
  const [repayNotes, setRepayNotes] = useState('');

  // Edit Employee Profile Modal State
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('موظف خدمة عملاء');
  const [editBaseSalary, setEditBaseSalary] = useState<number>(5000);
  const [editSalaryPayoutDay, setEditSalaryPayoutDay] = useState<number>(1);
  const [editWorkStartTime, setEditWorkStartTime] = useState('09:00');
  const [editWorkEndTime, setEditWorkEndTime] = useState('17:00');
  const [editNotes, setEditNotes] = useState('');

  const openEditEmployeeModal = () => {
    if (!emp) return;
    setEditFullName(emp.fullName || '');
    setEditPhone(emp.phone || '');
    setEditAddress(emp.address || '');
    setEditDepartment(emp.department || 'قسم التجار');
    setEditJobTitle(emp.jobTitle || 'موظف خدمة عملاء');
    setEditBaseSalary(emp.baseSalary || 5000);
    setEditSalaryPayoutDay(emp.salaryPayoutDay || 1);
    setEditWorkStartTime(emp.workStartTime || '09:00');
    setEditWorkEndTime(emp.workEndTime || '17:00');
    setEditNotes(emp.notes || '');
    setIsEditEmployeeOpen(true);
  };

  const handleSaveEmployeeEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emp) return;
    const dailyRate = calculateDailyRate(editBaseSalary, currentMonth);
    const updated: Employee = {
      ...emp,
      fullName: editFullName.trim() || emp.fullName,
      phone: editPhone.trim() || emp.phone,
      address: editAddress.trim() || undefined,
      department: editDepartment.trim() || emp.department,
      job: editJobTitle,
      jobTitle: editJobTitle,
      baseSalary: Number(editBaseSalary) || emp.baseSalary,
      dailyRate,
      salaryPayoutDay: Number(editSalaryPayoutDay) || 1,
      workStartTime: editWorkStartTime,
      workEndTime: editWorkEndTime,
      notes: editNotes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    db.saveDealerEmployee(updated, user);
    showToast('success', 'تم تعديل الملف', 'تم تحديث بيانات ومواعيد وراتب موظف قسم التجار بنجاح');
    setIsEditEmployeeOpen(false);
    handleRefresh();
  };

  const unpaidAdvances = useMemo(() => {
    if (!emp || !emp.advances) return [];
    return emp.advances.filter(a => a.status === 'disbursed' || (a.amount - (a.repaidAmount || 0)) > 0);
  }, [emp]);

  const openRepayAdvanceModal = (advId?: string) => {
    const targetId = advId || (unpaidAdvances.length > 0 ? unpaidAdvances[0].id : '');
    setSelectedAdvanceIdForRepay(targetId);
    setRepayAmount(0);
    setRepayDate(new Date().toISOString().split('T')[0]);
    setRepayTime(new Date().toTimeString().slice(0, 5));
    setRepayNotes('');
    setIsRepayAdvanceModalOpen(true);
  };

  const handleRepayAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emp || !selectedAdvanceIdForRepay || repayAmount <= 0) return;

    db.addEmployeeAdvanceRepayment(
      emp.id,
      selectedAdvanceIdForRepay,
      repayAmount,
      repayDate,
      repayNotes.trim() || undefined,
      user,
      repayTime
    );

    showToast('success', 'تم سداد القسط', `تم تسجيل سداد قسط بمبلغ ${formatCurrency(repayAmount)} بتاريخ ${repayDate} ${repayTime}`);
    setIsRepayAdvanceModalOpen(false);
    setRepayAmount(0);
    setRepayNotes('');
    handleRefresh();
  };

  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [deductionDate, setDeductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [deductionTime, setDeductionTime] = useState(new Date().toTimeString().slice(0, 5));
  const [deductionReason, setDeductionReason] = useState('');

  const [isIncentiveModalOpen, setIsIncentiveModalOpen] = useState(false);
  const [incentiveType, setIncentiveType] = useState<'reward' | 'incentive'>('reward');
  const [incentiveAmount, setIncentiveAmount] = useState<number>(0);
  const [incentiveDate, setIncentiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [incentiveTime, setIncentiveTime] = useState(new Date().toTimeString().slice(0, 5));
  const [incentiveReason, setIncentiveReason] = useState('');

  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  // 📄 Official Report & Invoice States
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocumentData, setPreviewDocumentData] = useState<ReportDocumentData | null>(null);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    startDate: '',
    endDate: '',
    reportType: 'detailed',
    showProfits: true,
    showCosts: true,
    showExpenses: true,
    showLogo: true,
    showUserData: true,
    showPageNumbers: true,
    showManagerSignature: true,
    paperSize: 'A4',
    orientation: 'portrait'
  });

  if (!emp) return null;

  // Compute Current Month Net Salary
  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentSlip = allSalarySlips.find(s => s.month === currentMonth);
  const advancesTotal = (emp.advances || [])
    .filter(a => a.status === 'disbursed')
    .reduce((sum, a) => sum + (a.amount - (a.repaidAmount || 0)), 0);
  const bonusesTotal = currentSlip?.bonuses || 0;
  const deductionsTotal = currentSlip?.deductions || 0;
  const currentNetSalary = Math.max(0, emp.baseSalary + bonusesTotal - advancesTotal - deductionsTotal);

  // Filter attendance items
  const checkIns = allAttendance.filter(a => a.checkIn && a.checkIn !== '-');
  const checkOuts = allAttendance.filter(a => a.checkOut && a.checkOut !== '-');
  const absents = allAttendance.filter(a => a.status === 'absent');
  const leaves = allAttendance.filter(a => a.status === 'leave');
  const delays = allAttendance.filter(a => a.status === 'late' || (a.penaltyHours && a.penaltyHours > 0));

  // Build Official Employee Invoice Document
  const buildEmployeeInvoiceDoc = (targetSlip?: SalarySlip): ReportDocumentData => {
    return ReportEngine.generateReportDocument(
      'payroll',
      reportConfig,
      {
        employee: emp,
        currentSlip: targetSlip || currentSlip,
        allSalarySlips,
        allAttendance,
        month: targetSlip?.month || currentMonth,
        isSingleEmployee: true
      },
      user?.fullName || user?.username || 'الإدارة المالية للتجار'
    );
  };

  // 🖨️ Official Print Handler
  const handlePrint = (targetSlip?: SalarySlip) => {
    const doc = buildEmployeeInvoiceDoc(targetSlip);
    ReportEngine.printReportDocument(doc, reportConfig);
  };

  // 👁️ Open Official Interactive Invoice Preview
  const handleOpenPreviewReport = (targetSlip?: SalarySlip) => {
    const doc = buildEmployeeInvoiceDoc(targetSlip);
    setPreviewDocumentData(doc);
    setIsPreviewModalOpen(true);
  };

  // Handle Disburse Salary from Vault
  const handleDisburseSalary = (slip: SalarySlip) => {
    if (slip.isPaid) {
      showToast('info', 'تم الصرف مسبقاً', 'تم صرف هذا الراتب من قبل');
      return;
    }

    db.payDealerSalarySlip(slip.id, 'نقدية من خزنة التجار الرئيسية', user?.fullName || 'الإدارة المالية');
    showToast('success', 'تم صرف الراتب', `تم صرف مبلغ ${formatCurrency(slip.totalSalary)} من خزنة التجار للموظف ${emp.fullName}`);
    handleRefresh();
  };

  // Handle Advance Request
  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (advanceAmount <= 0) return;

    db.addDealerEmployeeAdvance(
      emp.id,
      advanceAmount,
      advanceReason || 'سلفة موظف تجار',
      advanceFromVault,
      user,
      advanceDate,
      advanceTime,
      advanceDate,
      advanceTime
    );
    showToast('success', 'تم تسجيل السلفة', `تم تسجيل سلفة بمبلغ ${formatCurrency(advanceAmount)} للموظف بتاريخ ${advanceDate} ${advanceTime}`);
    setIsAdvanceModalOpen(false);
    setAdvanceAmount(0);
    setAdvanceReason('');
    handleRefresh();
  };

  // Handle Deduction
  const handleAddDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (deductionAmount <= 0) return;

    db.applyDealerEmployeeDeductionOrBonus(
      emp.id,
      'deduction',
      deductionAmount,
      deductionReason || 'خصم إداري',
      currentMonth,
      deductionDate,
      deductionTime
    );
    showToast('success', 'تم تطبيق الخصم', `تم خصم ${formatCurrency(deductionAmount)} من مستحقات الموظف بتاريخ ${deductionDate} ${deductionTime}`);
    setIsDeductionModalOpen(false);
    setDeductionAmount(0);
    setDeductionReason('');
    handleRefresh();
  };

  // Handle Incentive / Reward
  const handleAddIncentive = (e: React.FormEvent) => {
    e.preventDefault();
    if (incentiveAmount <= 0) return;

    db.addDealerEmployeeIncentive(
      emp.id,
      incentiveAmount,
      incentiveType,
      incentiveReason || 'مكافأة تقديرية',
      currentMonth,
      user,
      incentiveDate,
      incentiveTime
    );
    showToast('success', 'تم إضافة المكافأة/الحافز', `تم إضافة ${formatCurrency(incentiveAmount)} للموظف بتاريخ ${incentiveDate} ${incentiveTime}`);
    setIsIncentiveModalOpen(false);
    setIncentiveAmount(0);
    setIncentiveReason('');
    handleRefresh();
  };

  // Handle Add Attachment
  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentName.trim()) return;

    db.addDealerEmployeeAttachment(emp.id, attachmentName, attachmentUrl || '#', 'document', user);
    showToast('success', 'تمت إضافة المرفق', 'تم حفظ المستند في ملف الموظف');
    setIsAttachmentModalOpen(false);
    setAttachmentName('');
    setAttachmentUrl('');
    handleRefresh();
  };

  // Export Full Profile Report
  const handleExportFullReport = () => {
    const data = [
      { 'البيان': 'كود الموظف', 'القيمة': emp.employeeCode },
      { 'البيان': 'اسم الموظف', 'القيمة': emp.fullName },
      { 'البيان': 'الوظيفة', 'القيمة': emp.job || emp.jobTitle },
      { 'البيان': 'المسمى الوظيفي', 'القيمة': emp.jobTitle },
      { 'البيان': 'القسم', 'القيمة': emp.department },
      { 'البيان': 'رقم الهاتف', 'القيمة': emp.phone },
      { 'البيان': 'العنوان', 'القيمة': emp.address || '-' },
      { 'البيان': 'تاريخ التعيين', 'القيمة': formatDate(emp.hireDate) },
      { 'البيان': 'الراتب الأساسي', 'القيمة': emp.baseSalary },
      { 'البيان': 'يوم الصرف', 'القيمة': `يوم ${emp.salaryPayoutDay || 1} من كل شهر` },
      { 'البيان': 'صافي راتب الشهر الحالي', 'القيمة': currentNetSalary },
      { 'البيان': 'إجمالي السلف المعلقة', 'القيمة': advancesTotal }
    ];
    exportToExcel(data, `تقرير_موظف_تجار_${emp.fullName}_${new Date().toISOString().split('T')[0]}`);
  };

  const tabs: { id: ProfileTab; label: string; count?: number }[] = [
    { id: 'personal', label: 'البيانات الشخصية' },
    { id: 'salaries', label: 'الرواتب والمسيرات', count: allSalarySlips.length },
    { id: 'daily_transactions', label: 'المعاملات اليومية', count: allAttendance.length },
    { id: 'advances', label: 'السلف والديون', count: (emp.advances || []).length },
    { id: 'attachments', label: 'المرفقات', count: (emp.attachments || []).length },
    { id: 'audit', label: 'سجل العمليات', count: employeeAuditLogs.length }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`👤 بروفايل موظف قسم التجار: ${emp.fullName} (${emp.employeeCode})`}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-right" dir="rtl">
        {/* Header Summary Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-lg flex items-center justify-center shadow-md">
              {emp.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-zinc-900 dark:text-white">
                  {emp.fullName}
                </h3>
                <Badge variant={emp.status === 'active' ? 'success' : 'warning'} size="sm">
                  {emp.status === 'active' ? 'نشط على رأس العمل' : 'في إجازة'}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {emp.jobTitle} • {emp.department} • هاتف: {emp.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left font-mono">
              <span className="text-[11px] text-zinc-500 block">صافي الراتب المستحق</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                {formatCurrency(currentNetSalary)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                icon={<FileText className="w-4 h-4" />}
                onClick={() => handleOpenPreviewReport()}
                className="font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                معاينة الفاتورة
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => handlePrint()}
                className="font-bold bg-amber-600 hover:bg-amber-500 text-white"
              >
                طباعة الفاتورة A4
              </Button>
            </div>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-bold block">الراتب الأساسي</span>
            <span className="text-sm font-black text-zinc-900 dark:text-white mt-0.5 block font-mono">
              {formatCurrency(emp.baseSalary)}
            </span>
          </Card>

          <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-bold block">إجمالي السلف المعلقة</span>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5 block font-mono">
              {formatCurrency(advancesTotal)}
            </span>
          </Card>

          <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-bold block">أيام الحضور المسجلة</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {checkIns.length} يوم
            </span>
          </Card>

          <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-bold block">أيام الغياب</span>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
              {absents.length} يوم
            </span>
          </Card>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-zinc-200 dark:border-zinc-800 scrollbar-thin">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-amber-700 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {/* 1. Personal Info */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/60">
                <div>
                  <span className="font-bold text-xs text-white block">إدارة وتعديل ملف موظف قسم التجار</span>
                  <p className="text-[11px] text-zinc-400">تعديل المسمى الوظيفي، الراتب، مواعيد العمل، وبيانات الاتصال</p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Edit className="w-3.5 h-3.5" />}
                  onClick={openEditEmployeeModal}
                  className="bg-amber-600 hover:bg-amber-500 font-bold text-xs"
                >
                  تعديل بيانات الموظف
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <Card className="p-3 space-y-2">
                  <div className="flex justify-between border-b pb-1.5 border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">كود الموظف:</span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono">{emp.employeeCode}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5 border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">الاسم الكامل:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{emp.fullName}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5 border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">الوظيفة / الدور:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{emp.job || emp.jobTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">المسمى الوظيفي:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{emp.jobTitle}</span>
                  </div>
                </Card>

                <Card className="p-3 space-y-2">
                  <div className="flex justify-between border-b pb-1.5 border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">القسم:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{emp.department}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5 border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">رقم الهاتف:</span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono">{emp.phone}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5 border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">تاريخ التعيين:</span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono">{formatDate(emp.hireDate)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5 border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">الراتب الأساسي:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(emp.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5 border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">تكلفة وسعر اليوم:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(emp.dailyRate || calculateDailyRate(emp.baseSalary, currentMonth))}{' '}
                      <span className="text-[10px] text-zinc-400 font-normal font-sans">(الراتب ÷ {getDaysInMonth(currentMonth)})</span>
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5 border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">مواعيد العمل:</span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono">
                      من {emp.workStartTime || '09:00'} إلى {emp.workEndTime || '17:00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">يوم صرف الراتب:</span>
                    <span className="font-bold text-zinc-900 dark:text-white">يوم {emp.salaryPayoutDay || 1} من الشهر</span>
                  </div>
                </Card>
              </div>

              {emp.notes && (
                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-xs font-bold text-zinc-500 block mb-1">ملاحظات إدارية:</span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">{emp.notes}</p>
                </Card>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="w-4 h-4" />}
                  onClick={handleExportFullReport}
                >
                  تصدير تقرير الموظف Excel
                </Button>
              </div>
            </div>
          )}

          {/* 2. Salaries */}
          {activeTab === 'salaries' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-500">سجل مسيرات الرواتب الشهرية</h4>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<FileText className="w-4 h-4" />}
                  onClick={() => handleOpenPreviewReport()}
                >
                  معاينة مسير الشهر الحالي
                </Button>
              </div>

              {allSalarySlips.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  لا توجد مسيرات رواتب مسجلة حتى الآن لهذا الموظف
                </div>
              ) : (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="p-2.5">الشهر</th>
                        <th className="p-2.5">الأساسي</th>
                        <th className="p-2.5">المكافآت</th>
                        <th className="p-2.5">الخصومات</th>
                        <th className="p-2.5">الصافي المستحق</th>
                        <th className="p-2.5">الحالة</th>
                        <th className="p-2.5 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {allSalarySlips.map(slip => (
                        <tr key={slip.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <td className="p-2.5 font-mono font-bold">{slip.month}</td>
                          <td className="p-2.5 font-mono">{formatCurrency(slip.baseSalary)}</td>
                          <td className="p-2.5 font-mono text-emerald-600">+{formatCurrency(slip.bonuses || 0)}</td>
                          <td className="p-2.5 font-mono text-rose-600">-{formatCurrency(slip.deductions || 0)}</td>
                          <td className="p-2.5 font-mono font-black text-amber-600 dark:text-amber-400">
                            {formatCurrency(slip.totalSalary)}
                          </td>
                          <td className="p-2.5">
                            <Badge variant={slip.isPaid ? 'success' : 'warning'} size="sm">
                              {slip.isPaid ? 'تم الصرف' : 'مستحق'}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {!slip.isPaid && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleDisburseSalary(slip)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                                >
                                  صرف الآن
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Printer className="w-3.5 h-3.5" />}
                                onClick={() => handlePrint(slip)}
                              >
                                طباعة فاتورة
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. DAILY TRANSACTIONS TAB (المعاملات اليومية الشاملة) */}
          {activeTab === 'daily_transactions' && (
            <EmployeeDailyTransactionsTab
              employee={emp}
              allAttendance={allAttendance}
              onRefresh={handleRefresh}
              isDealer={true}
            />
          )}

          {/* 4. ADVANCES & DEBTS TAB (السلف والديون وسداد الأقساط) */}
          {activeTab === 'advances' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                    سجل سلف وديون الموظف (إجمالي المتبقي: {formatCurrency(advancesTotal)})
                  </h4>
                  <p className="text-xs text-zinc-500">سداد الأقساط مع إمكانية التحديد بين الديون وتوثيق تاريخ السداد</p>
                </div>
                <div className="flex items-center gap-2">
                  {unpaidAdvances.length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Receipt className="w-3.5 h-3.5 text-amber-500" />}
                      onClick={() => openRepayAdvanceModal()}
                      className="border-amber-500/30 hover:bg-amber-500/10 font-bold text-xs"
                    >
                      سداد قسط سلفة
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsAdvanceModalOpen(true)}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                  >
                    طلب وصرف سلفة جديدة
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                {(!emp.advances || emp.advances.length === 0) ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">لا توجد سلف أو ديون مسجلة لهذا الموظف</div>
                ) : (
                  emp.advances.map(a => {
                    const remaining = Math.max(0, a.amount - (a.repaidAmount || 0));
                    return (
                      <div
                        key={a.id}
                        className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2.5"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-zinc-900 dark:text-white font-mono">
                                {formatCurrency(a.amount)}
                              </span>
                              <Badge variant={a.status === 'repaid' ? 'success' : 'warning'} size="sm">
                                {a.status === 'repaid' ? 'تم السداد بالكامل' : a.status === 'disbursed' ? 'جارية ومستحقة' : 'معلقة'}
                              </Badge>
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              السبب: {a.reason} • تاريخ ووقت الطلب: {formatDate(a.requestDate)} {a.requestTime || ''}
                              {a.disbursedFromVault && ' • صُرفت من خزنة التجار'}
                              {a.disbursedTime && ` (الساعة: ${a.disbursedTime})`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-left font-mono text-xs">
                              <span className="text-zinc-500 block">المتبقي للسداد:</span>
                              <span className="font-bold text-rose-500">{formatCurrency(remaining)}</span>
                            </div>
                            {remaining > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRepayAdvanceModal(a.id)}
                                className="text-xs font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white border-amber-500/30"
                              >
                                سداد قسط
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Repayments History */}
                        {a.repayments && a.repayments.length > 0 && (
                          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                            <span className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                              سجل تذاكر سداد الأقساط ({a.repayments.length}):
                            </span>
                            <div className="space-y-1">
                              {a.repayments.map(rep => (
                                <div
                                  key={rep.id}
                                  className="p-2 rounded-lg bg-zinc-800/40 text-[11px] flex justify-between items-center text-zinc-300"
                                >
                                  <div>
                                    <span className="font-bold">
                                      تاريخ ووقت السداد: {formatDate(rep.date)} {rep.time ? `ساعة: ${rep.time}` : ''}
                                    </span>
                                    {rep.notes && <span className="text-zinc-400 block mt-0.5">{rep.notes}</span>}
                                  </div>
                                  <span className="font-mono font-bold text-emerald-400">
                                    -{formatCurrency(rep.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 11. Attachments */}
          {activeTab === 'attachments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-500">مرفقات ومستندات الموظف (عقود، هوية، مسيرات)</h4>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsAttachmentModalOpen(true)}
                >
                  إضافة مستند
                </Button>
              </div>

              {(!emp.attachments || emp.attachments.length === 0) ? (
                <div className="text-center py-8 text-zinc-500 text-xs">لا توجد مرفقات مسجلة</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {emp.attachments.map(att => (
                    <Card key={att.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-amber-500" />
                        <div>
                          <span className="font-bold text-xs block text-zinc-900 dark:text-white">{att.name}</span>
                          <span className="text-[10px] text-zinc-500">{formatDate(att.uploadedAt)}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                        onClick={() => {
                          db.deleteDealerEmployeeAttachment(emp.id, att.id, user);
                          handleRefresh();
                        }}
                      />
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 12. Audit Log */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-500">سجل تدقيق العمليات المحاسبية الخاصة بالموظف</h4>
              {employeeAuditLogs.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">لا توجد سجلات تدقيق مرتبطة</div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {employeeAuditLogs.map(log => (
                    <div key={log.id} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
                      <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                        <span>بواسطة: {log.userName}</span>
                        <span>{formatDateTime(log.timestamp)}</span>
                      </div>
                      <p className="font-bold text-zinc-800 dark:text-zinc-200 mt-1">{log.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <Button variant="secondary" size="sm" onClick={onClose}>
            إغلاق
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<FileText className="w-4 h-4" />}
              onClick={() => handleOpenPreviewReport()}
            >
              معاينة الفاتورة
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={() => handlePrint()}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              طباعة الفاتورة A4
            </Button>
          </div>
        </div>
      </div>

      {/* Add Advance Modal */}
      {isAdvanceModalOpen && (
        <Modal
          isOpen={isAdvanceModalOpen}
          onClose={() => setIsAdvanceModalOpen(false)}
          title="💰 صرف سلفة لموظف التجار"
          maxWidth="md"
        >
          <form onSubmit={handleAddAdvance} className="space-y-3 text-right" dir="rtl">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">تاريخ السلفة:</label>
                <Input
                  type="date"
                  required
                  value={advanceDate}
                  onChange={e => setAdvanceDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">وقت / ساعة السلفة:</label>
                <Input
                  type="time"
                  required
                  value={advanceTime}
                  onChange={e => setAdvanceTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">مبلغ السلفة (ج.م):</label>
              <Input
                type="number"
                min="1"
                required
                value={advanceAmount || ''}
                onChange={e => setAdvanceAmount(Number(e.target.value))}
                placeholder="أدخل مبلغ السلفة..."
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">سبب ومبرر السلفة:</label>
              <Input
                type="text"
                value={advanceReason}
                onChange={e => setAdvanceReason(e.target.value)}
                placeholder="ظرف طارئ، شخصي..."
              />
            </div>

            <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <input
                type="checkbox"
                id="advVault"
                checked={advanceFromVault}
                onChange={e => setAdvanceFromVault(e.target.checked)}
                className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="advVault" className="text-xs font-bold cursor-pointer">
                خصم المبلغ مباشرة من الخزنة الرئيسية للتجار (تسجيل حركة سحب نقدية)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAdvanceModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                اعتماد وصرف السلفة
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Deduction Modal */}
      {isDeductionModalOpen && (
        <Modal
          isOpen={isDeductionModalOpen}
          onClose={() => setIsDeductionModalOpen(false)}
          title="⚠️ تسجيل خصم أو جزاء مالي"
          maxWidth="md"
        >
          <form onSubmit={handleAddDeduction} className="space-y-3 text-right" dir="rtl">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">تاريخ الخصم:</label>
                <Input
                  type="date"
                  required
                  value={deductionDate}
                  onChange={e => setDeductionDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">ساعة الخصم:</label>
                <Input
                  type="time"
                  required
                  value={deductionTime}
                  onChange={e => setDeductionTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">مبلغ الخصم (ج.م):</label>
              <Input
                type="number"
                min="1"
                required
                value={deductionAmount || ''}
                onChange={e => setDeductionAmount(Number(e.target.value))}
                placeholder="أدخل المبلغ المطلوب خصمه..."
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">سبب ومبرر الخصم:</label>
              <Input
                type="text"
                required
                value={deductionReason}
                onChange={e => setDeductionReason(e.target.value)}
                placeholder="تأخير غير مبرر، إهمال في العمل..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsDeductionModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="danger" size="sm">
                تطبيق الخصم
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Incentive Modal */}
      {isIncentiveModalOpen && (
        <Modal
          isOpen={isIncentiveModalOpen}
          onClose={() => setIsIncentiveModalOpen(false)}
          title="🎁 إضافة مكافأة أو حافز تشجيعي"
          maxWidth="md"
        >
          <form onSubmit={handleAddIncentive} className="space-y-3 text-right" dir="rtl">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">تاريخ الاستحقاق:</label>
                <Input
                  type="date"
                  required
                  value={incentiveDate}
                  onChange={e => setIncentiveDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">ساعة الاستحقاق:</label>
                <Input
                  type="time"
                  required
                  value={incentiveTime}
                  onChange={e => setIncentiveTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">المبلغ (ج.م):</label>
              <Input
                type="number"
                min="1"
                required
                value={incentiveAmount || ''}
                onChange={e => setIncentiveAmount(Number(e.target.value))}
                placeholder="أدخل المبلغ..."
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">السبب:</label>
              <Input
                type="text"
                value={incentiveReason}
                onChange={e => setIncentiveReason(e.target.value)}
                placeholder="إنجاز مبيعات متميز، التزام عالي..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsIncentiveModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                إضافة الحافز
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Attachment Modal */}
      {isAttachmentModalOpen && (
        <Modal
          isOpen={isAttachmentModalOpen}
          onClose={() => setIsAttachmentModalOpen(false)}
          title="📎 إضافة مستند أو مرفق"
          maxWidth="md"
        >
          <form onSubmit={handleAddAttachment} className="space-y-3 text-right" dir="rtl">
            <div>
              <label className="text-xs font-bold block mb-1">اسم المستند:</label>
              <Input
                type="text"
                required
                value={attachmentName}
                onChange={e => setAttachmentName(e.target.value)}
                placeholder="عقد عمل، صورة بطاقة، إقرار..."
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">رابط المستند أو الملف (اختياري):</label>
              <Input
                type="text"
                value={attachmentUrl}
                onChange={e => setAttachmentUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAttachmentModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                حفظ المستند
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Employee Profile Modal */}
      {isEditEmployeeOpen && (
        <Modal
          isOpen={isEditEmployeeOpen}
          onClose={() => setIsEditEmployeeOpen(false)}
          title={`✏️ تعديل ملف موظف التجار: ${emp.fullName}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEmployeeEdit} className="space-y-4 text-right" dir="rtl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">اسم الموظف الكامل:</label>
                <Input
                  required
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">رقم الهاتف:</label>
                <Input
                  required
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">الوظيفة / الدور بالمنظومة:</label>
                <select
                  value={editJobTitle}
                  onChange={e => setEditJobTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="موظف خدمة عملاء">موظف خدمة عملاء</option>
                  <option value="مسؤول عن قسم">مسؤول عن قسم</option>
                  <option value="مشرف">مشرف</option>
                  <option value="موظف شحن">موظف شحن</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">القسم التابع له:</label>
                <Input
                  value={editDepartment}
                  onChange={e => setEditDepartment(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">الراتب الأساسي (جنيه):</label>
                <Input
                  type="number"
                  step="100"
                  min="500"
                  required
                  value={editBaseSalary}
                  onChange={e => setEditBaseSalary(parseFloat(e.target.value) || 0)}
                />
                <span className="text-[11px] text-amber-400 font-mono block mt-1">
                  سعر اليوم المحسوب تلقائياً: {formatCurrency(calculateDailyRate(editBaseSalary, currentMonth))} (الراتب ÷ {getDaysInMonth(currentMonth)})
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">يوم صرف الراتب:</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={editSalaryPayoutDay}
                  onChange={e => setEditSalaryPayoutDay(parseInt(e.target.value, 10) || 1)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">ميعاد بدء العمل المعتاد (الحضور):</label>
                <Input
                  type="time"
                  required
                  value={editWorkStartTime}
                  onChange={e => setEditWorkStartTime(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">ميعاد نهاية العمل المعتاد (الانصراف):</label>
                <Input
                  type="time"
                  required
                  value={editWorkEndTime}
                  onChange={e => setEditWorkEndTime(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-zinc-300 block mb-1">العنوان السكني:</label>
                <Input
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  placeholder="محافظة، مدينة، شارع..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-zinc-300 block mb-1">ملاحظات إضافية:</label>
                <Input
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="ملاحظات العقد أو شروط العمل..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditEmployeeOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500 font-bold">
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Repay Advance / Debt Installment Modal */}
      {isRepayAdvanceModalOpen && (
        <Modal
          isOpen={isRepayAdvanceModalOpen}
          onClose={() => setIsRepayAdvanceModalOpen(false)}
          title={`🧾 سداد قسط سلفة / دين لموظف التجار: ${emp.fullName}`}
          maxWidth="md"
        >
          <form onSubmit={handleRepayAdvanceSubmit} className="space-y-3.5 text-right" dir="rtl">
            {/* Advance Selector if multiple */}
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">اختيار السلفة / الدين المراد سداد قسط منه:</label>
              {unpaidAdvances.length > 0 ? (
                <select
                  value={selectedAdvanceIdForRepay}
                  onChange={e => setSelectedAdvanceIdForRepay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                >
                  {unpaidAdvances.map(a => {
                    const rem = a.amount - (a.repaidAmount || 0);
                    return (
                      <option key={a.id} value={a.id}>
                        {a.reason} — الأصل: {formatCurrency(a.amount)} | المتبقي: {formatCurrency(rem)} (بتاريخ {formatDate(a.requestDate)})
                      </option>
                    );
                  })}
                </select>
              ) : (
                <p className="text-xs text-zinc-500">لا توجد سلف جارية لسدادها</p>
              )}
            </div>

            {/* Date & Time Picker for Installment Ticket */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  تاريخ سداد القسط:
                </label>
                <Input
                  type="date"
                  required
                  value={repayDate}
                  onChange={e => setRepayDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">
                  ساعة السداد:
                </label>
                <Input
                  type="time"
                  required
                  value={repayTime}
                  onChange={e => setRepayTime(e.target.value)}
                />
              </div>
            </div>

            {/* Installment Amount */}
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                مبلغ القسط المسدد (جنيه):
              </label>
              <Input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="500"
                value={repayAmount || ''}
                onChange={e => setRepayAmount(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                ملاحظات أو رقم الإيصال (اختياري):
              </label>
              <Input
                placeholder="سداد نقدي، إيصال رقم..."
                value={repayNotes}
                onChange={e => setRepayNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsRepayAdvanceModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500 font-bold">
                تثبيت سداد القسط
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 📄 Official Report Interactive Preview Modal */}
      {isPreviewModalOpen && previewDocumentData && (
        <ReportPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          documentData={previewDocumentData}
          config={reportConfig}
          onConfigChange={setReportConfig}
        />
      )}
    </Modal>
  );
};

export default DealerFinanceEmployeeProfileModal;
