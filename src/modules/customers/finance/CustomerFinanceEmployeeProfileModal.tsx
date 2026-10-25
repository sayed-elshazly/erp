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
import { SalaryReviewModal } from '../../../components/finance/SalaryReviewModal';
import { EmployeeDailyTransactionsTab } from './EmployeeDailyTransactionsTab';
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

interface CustomerFinanceEmployeeProfileModalProps {
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

export const CustomerFinanceEmployeeProfileModal: React.FC<CustomerFinanceEmployeeProfileModalProps> = ({
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
    return db.getEmployeeById(employee.id) || employee;
  }, [employee, refreshTrigger, isOpen]);

  // Attendance Records
  const allAttendance = useMemo(() => {
    if (!emp) return [];
    return db.getAttendance().filter(a => a.employeeId === emp.id);
  }, [emp, refreshTrigger]);

  // Salary Slips
  const allSalarySlips = useMemo(() => {
    if (!emp) return [];
    return db.getSalaries().filter(s => s.employeeId === emp.id);
  }, [emp, refreshTrigger]);

  // Audit Logs for this employee
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
    setEditDepartment(emp.department || 'قسم الزبائن');
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

    db.saveEmployee(updated, user);
    showToast('success', 'تم تعديل الملف', 'تم تحديث بيانات ومواعيد وراتب الموظف بنجاح');
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

  // Salary Review Modal States
  const [isSalaryReviewModalOpen, setIsSalaryReviewModalOpen] = useState(false);
  const [reviewSlip, setReviewSlip] = useState<SalarySlip | null>(null);
  const [isDisbursing, setIsDisbursing] = useState(false);

  // Compute Current Month Net Salary dynamically from attendance & ledger records
  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentSlip = allSalarySlips.find(s => s.month === currentMonth);
  const calculatedSlip = useMemo(() => {
    if (!emp) return {} as any;
    return currentSlip || db.calculateEmployeeMonthlySalary(emp.id, currentMonth);
  }, [emp?.id, currentMonth, currentSlip, refreshTrigger]);

  if (!emp) return null;

  const advancesTotal = (emp.advances || [])
    .filter(a => a.status === 'disbursed')
    .reduce((sum, a) => sum + (a.amount - (a.repaidAmount || 0)), 0);
  const bonusesTotal = (currentSlip && currentSlip.isPaid) ? currentSlip.bonuses : (calculatedSlip.bonuses || 0);
  const deductionsTotal = (currentSlip && currentSlip.isPaid) ? currentSlip.deductions : (calculatedSlip.deductions || 0);
  const currentNetSalary = (currentSlip && currentSlip.isPaid) ? currentSlip.totalSalary : calculatedSlip.totalSalary;

  const openSalaryReview = (targetSlip?: SalarySlip) => {
    const slipToReview = targetSlip || currentSlip || db.calculateEmployeeMonthlySalary(emp.id, currentMonth);
    if (slipToReview.isPaid) {
      showToast(
        'info',
        'تم صرف الراتب مسبقاً',
        `تم صرف راتب شهر ${slipToReview.month} بالفعل بتاريخ ${slipToReview.paidAt ? new Date(slipToReview.paidAt).toLocaleDateString('ar-EG') : ''} بمبلغ ${formatCurrency(slipToReview.totalSalary)} بواسطة ${slipToReview.paidBy || 'المسؤول المالي'}.`
      );
      return;
    }
    setReviewSlip(slipToReview);
    setIsSalaryReviewModalOpen(true);
  };

  const handleConfirmDisburseSalary = (slip: SalarySlip) => {
    setIsDisbursing(true);
    try {
      const result = db.disburseEmployeeSalary(slip, user);
      if (result.success) {
        showToast(
          'success',
          'تم تأكيد صرف الراتب',
          `تم صرف مبلغ ${formatCurrency(result.slip.totalSalary)} من الخزنة الرئيسية للموظف ${emp.fullName} بنجاح.`
        );
        setIsSalaryReviewModalOpen(false);
        setReviewSlip(null);
        handleRefresh();
      } else {
        showToast('warning', 'تعذر الصرف', result.message || 'حدث خطأ أثناء تنفيذ عملية الصرف');
      }
    } catch (err: any) {
      showToast('error', 'خطأ في العملية', err.message || 'فشلت عملية صرف الراتب');
    } finally {
      setIsDisbursing(false);
    }
  };

  // Filter attendance items
  const checkIns = allAttendance.filter(a => a.checkIn);
  const checkOuts = allAttendance.filter(a => a.checkOut);
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
        currentSlip: targetSlip || currentSlip || calculatedSlip,
        allSalarySlips,
        allAttendance,
        month: targetSlip?.month || currentMonth,
        isSingleEmployee: true
      },
      user?.fullName || user?.username || 'الإدارة المالية'
    );
  };

  // 🖨️ Official Print Handler (Isolated Printable Document, Never Screenshots Modal!)
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

  // Handle Advance Request
  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (advanceAmount <= 0) return;

    db.addEmployeeAdvance(
      emp.id,
      advanceAmount,
      advanceReason || 'سلفة موظف',
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

    db.applyEmployeeDeductionOrBonus(
      emp.id,
      'deduction',
      deductionAmount,
      deductionReason || 'خصم إداري',
      currentMonth,
      'amount',
      undefined,
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

    db.addEmployeeIncentive(
      emp.id,
      incentiveAmount,
      incentiveType,
      incentiveReason || 'مكافأة تقديرية',
      currentMonth,
      user,
      'amount',
      undefined,
      incentiveDate,
      incentiveTime
    );
    showToast('success', 'تمت الإضافة', `تمت إضافة المبلغ لمستحقات الموظف بتاريخ ${incentiveDate} ${incentiveTime}`);
    setIsIncentiveModalOpen(false);
    setIncentiveAmount(0);
    setIncentiveReason('');
    handleRefresh();
  };

  // Handle Add Attachment
  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentName.trim()) return;

    db.addEmployeeAttachment(emp.id, attachmentName, attachmentUrl || '#', 'document', user);
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
    exportToExcel(data, `تقرير_الموظف_${emp.fullName}_${new Date().toISOString().split('T')[0]}`);
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
      title={`👤 بروفايل الموظف: ${emp.fullName} (${emp.employeeCode})`}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-right">
        {/* Header Summary Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white font-black text-lg flex items-center justify-center shadow-md">
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
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(currentNetSalary)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant="primary"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => handlePrint()}
                title="طباعة فاتورة ومسير الاستحقاق المالي رسمياً"
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                طباعة الفاتورة
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<FileText className="w-3.5 h-3.5" />}
                onClick={() => handleOpenPreviewReport()}
                title="معاينة الفاتورة والتقرير المالي الرسمي"
              >
                فاتورة كشف حساب
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportFullReport}
                title="تصدير كملف Excel"
              >
                تصدير Excel
              </Button>
            </div>
          </div>
        </div>

        {/* 13 Navigation Tabs Slider */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold scrollbar-none">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === t.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === t.id ? 'bg-emerald-700 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="min-h-[300px]">
          {/* 1. PERSONAL INFO */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/60">
                <div>
                  <span className="font-bold text-xs text-white block">إدارة وتعديل ملف الموظف</span>
                  <p className="text-[11px] text-zinc-400">تعديل المسمى الوظيفي، الراتب، مواعيد العمل، وبيانات الاتصال</p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Edit className="w-3.5 h-3.5" />}
                  onClick={openEditEmployeeModal}
                  className="bg-emerald-600 hover:bg-emerald-500 font-bold text-xs"
                >
                  تعديل بيانات الموظف
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-[11px] text-zinc-500 block">كود الموظف</span>
                  <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white block mt-1">
                    {emp.employeeCode}
                  </span>
                </Card>

                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-[11px] text-zinc-500 block">الوظيفة والمسمى</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block mt-1">
                    {emp.job || emp.jobTitle}
                  </span>
                </Card>

                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-[11px] text-zinc-500 block">القسم</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block mt-1">
                    {emp.department}
                  </span>
                </Card>

                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-[11px] text-zinc-500 block">رقم الهاتف</span>
                  <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white block mt-1">
                    {emp.phone}
                  </span>
                </Card>

                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-[11px] text-zinc-500 block">العنوان</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block mt-1">
                    {emp.address || 'غير محدد'}
                  </span>
                </Card>

                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-[11px] text-zinc-500 block">تاريخ التعيين</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block mt-1">
                    {formatDate(emp.hireDate)}
                  </span>
                </Card>

                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-[11px] text-zinc-500 block">الراتب الأساسي</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                    {formatCurrency(emp.baseSalary)}
                  </span>
                </Card>

                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-[11px] text-zinc-500 block">تكلفة وسعر اليوم ({getDaysInMonth(currentMonth)} يوم)</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block mt-1 font-mono">
                    {formatCurrency(emp.dailyRate || calculateDailyRate(emp.baseSalary, currentMonth))}{' '}
                    <span className="text-[10px] text-zinc-400 font-sans font-normal">(الراتب ÷ {getDaysInMonth(currentMonth)})</span>
                  </span>
                </Card>

                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-[11px] text-zinc-500 block">مواعيد العمل الرسمية</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block mt-1 font-mono">
                    من {emp.workStartTime || '09:00'} إلى {emp.workEndTime || '17:00'}
                  </span>
                </Card>

                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-[11px] text-zinc-500 block">يوم صرف الراتب</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 block mt-1">
                    يوم {emp.salaryPayoutDay || 1} من كل شهر
                  </span>
                </Card>

                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-[11px] text-zinc-500 block">الحالة الوظيفية</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block mt-1">
                    {emp.status === 'active' ? 'نشط' : emp.status === 'on_leave' ? 'في إجازة' : 'غير نشط'}
                  </span>
                </Card>
              </div>

              {emp.notes && (
                <Card className="p-3 bg-zinc-50 dark:bg-zinc-900/50">
                  <span className="text-xs font-bold text-zinc-500 block">ملاحظات:</span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1">{emp.notes}</p>
                </Card>
              )}
            </div>
          )}

          {/* 2. SALARIES TAB */}
          {activeTab === 'salaries' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                      مسير راتب شهر {currentMonth}
                    </h4>
                    {currentSlip?.isPaid ? (
                      <Badge variant="success" size="sm">
                        تم الصرف بنجاح
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="sm">
                        بانتظار المراجعة والصرف
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    الأساسي: {formatCurrency(emp.baseSalary)} • أيام العمل المحتسبة: {calculatedSlip.eligibleDays ?? 0}/{calculatedSlip.totalMonthDays || getDaysInMonth(currentMonth)} يوم • المكافآت: +{formatCurrency(bonusesTotal)} • الخصومات: -{formatCurrency(deductionsTotal)}
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(currentNetSalary)}
                  </span>

                  {currentSlip?.isPaid ? (
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>تم الصرف من الخزنة</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Printer className="w-3.5 h-3.5" />}
                        onClick={() => handlePrint(currentSlip)}
                        title="طباعة فاتورة الراتب المصروف"
                      >
                        فاتورة الصرف
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<DollarSign className="w-4 h-4" />}
                      onClick={() => openSalaryReview()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                    >
                      مراجعة وصرف الراتب
                    </Button>
                  )}
                </div>
              </div>

              {/* Slips History Table */}
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-2.5">الشهر</th>
                      <th className="p-2.5">الأساسي</th>
                      <th className="p-2.5">المكافآت</th>
                      <th className="p-2.5">الخصومات</th>
                      <th className="p-2.5">صافي الراتب</th>
                      <th className="p-2.5">الحالة</th>
                      <th className="p-2.5">تاريخ وطريقة الصرف</th>
                      <th className="p-2.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {allSalarySlips.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-zinc-500">
                          لا توجد مسيرات رواتب مسجلة حتى الآن
                        </td>
                      </tr>
                    ) : (
                      allSalarySlips.map(s => (
                        <tr key={s.id} className="hover:bg-zinc-500/5">
                          <td className="p-2.5 font-bold font-mono">{s.month}</td>
                          <td className="p-2.5">{formatCurrency(s.baseSalary)}</td>
                          <td className="p-2.5 text-emerald-600 font-bold">+{formatCurrency(s.bonuses)}</td>
                          <td className="p-2.5 text-rose-600 font-bold">-{formatCurrency(s.deductions)}</td>
                          <td className="p-2.5 font-black text-emerald-600 font-mono">{formatCurrency(s.totalSalary)}</td>
                          <td className="p-2.5">
                            <Badge variant={s.isPaid ? 'success' : 'warning'} size="sm">
                              {s.isPaid ? 'تم الصرف' : 'مستحق'}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-zinc-500">
                            {s.isPaid ? (
                              <div className="space-y-0.5">
                                <div>{formatDateTime(s.paidAt || '')}</div>
                                {s.paidBy && <div className="text-[10px] text-zinc-400 font-medium">بواسطة: {s.paidBy}</div>}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!s.isPaid && (
                                <button
                                  type="button"
                                  onClick={() => openSalaryReview(s)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer inline-flex items-center gap-1 font-bold text-[11px]"
                                  title="مراجعة واعتماد صرف الراتب"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  <span>صرف</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handlePrint(s)}
                                className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 font-bold text-[11px]"
                                title="طباعة فاتورة ومسير هذا الشهر رسمياً"
                              >
                                <Printer className="w-3 h-3" />
                                <span>طباعة</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. DAILY TRANSACTIONS TAB (المعاملات اليومية الشاملة) */}
          {activeTab === 'daily_transactions' && (
            <EmployeeDailyTransactionsTab
              employee={emp}
              allAttendance={allAttendance}
              onRefresh={handleRefresh}
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
                      icon={<Receipt className="w-3.5 h-3.5 text-emerald-500" />}
                      onClick={() => openRepayAdvanceModal()}
                      className="border-emerald-500/30 hover:bg-emerald-500/10 font-bold text-xs"
                    >
                      سداد قسط سلفة
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsAdvanceModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
                  >
                    طلب وصرف سلفة جديدة
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                {(!emp.advances || emp.advances.length === 0) ? (
                  <div className="p-8 text-center text-zinc-500">لا توجد سلف أو ديون مسجلة لهذا الموظف</div>
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
                              <span className="font-bold text-sm text-zinc-900 dark:text-white">
                                {formatCurrency(a.amount)}
                              </span>
                              <Badge variant={a.status === 'repaid' ? 'default' : 'warning'} size="sm">
                                {a.status === 'repaid' ? 'تم السداد بالكامل' : a.status === 'disbursed' ? 'جارية ومستحقة' : 'معلقة'}
                              </Badge>
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              السبب: {a.reason} • تاريخ ووقت الطلب: {formatDate(a.requestDate)} {a.requestTime || ''}
                              {a.disbursedFromVault && ' • صُرفت من الخزنة الرئيسية'}
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
                                className="text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border-emerald-500/30"
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

          {/* 12. ATTACHMENTS TAB (المرفقات) */}
          {activeTab === 'attachments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white">وثائق ومرفقات الموظف</h4>
                  <p className="text-xs text-zinc-500">عقد العمل، بطاقة الرقم القومي، الشهادات والمستندات</p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsAttachmentModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  إضافة مستند أو مرفق
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(!emp.attachments || emp.attachments.length === 0) ? (
                  <div className="p-8 text-center text-zinc-500 col-span-2">لا توجد مرفقات مسجلة لهذا الموظف</div>
                ) : (
                  emp.attachments.map(att => (
                    <div key={att.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-emerald-500" />
                        <div>
                          <span className="font-bold text-xs text-zinc-900 dark:text-white block">{att.name}</span>
                          <span className="text-[10px] text-zinc-500 block">{formatDateTime(att.uploadedAt)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                        onClick={() => {
                          db.deleteEmployeeAttachment(emp.id, att.id, user);
                          handleRefresh();
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 13. AUDIT LOG TAB (سجل العمليات) */}
          {activeTab === 'audit' && (
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-zinc-500">سجل تدقيق حركات الموظف ({employeeAuditLogs.length})</h4>
              {employeeAuditLogs.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">لا توجد حركات مسجلة للموظف في سجل التدقيق</div>
              ) : (
                employeeAuditLogs.map(log => (
                  <div key={log.id} className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-start justify-between text-xs gap-2">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block">{log.details}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">
                        المنفذ: {log.userName} ({log.userRole})
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0">{formatDateTime(log.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ============================================================= */}
        {/* SUB MODALS */}
        {/* ============================================================= */}

        {/* Add Advance Modal */}
        <Modal
          isOpen={isAdvanceModalOpen}
          onClose={() => setIsAdvanceModalOpen(false)}
          title={`💵 صرف سلفة جديدة للموظف: ${emp.fullName}`}
          maxWidth="md"
        >
          <form onSubmit={handleAddAdvance} className="space-y-3 text-right">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  تاريخ السلفة:
                </label>
                <Input
                  type="date"
                  required
                  value={advanceDate}
                  onChange={e => setAdvanceDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  وقت / ساعة السلفة:
                </label>
                <Input
                  type="time"
                  required
                  value={advanceTime}
                  onChange={e => setAdvanceTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                قيمة السلفة (جنيه مصري):
              </label>
              <Input
                type="number"
                step="0.01"
                required
                min="1"
                placeholder="1000"
                value={advanceAmount || ''}
                onChange={e => setAdvanceAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                سبب السلفة:
              </label>
              <Input
                required
                placeholder="مثال: ظرف طارئ، سلفة زواج، مصاريف علاج..."
                value={advanceReason}
                onChange={e => setAdvanceReason(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="advVault"
                checked={advanceFromVault}
                onChange={e => setAdvanceFromVault(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="advVault" className="text-xs text-zinc-700 dark:text-zinc-300">
                خصم قيمة السلفة نقدياً من الخزنة الرئيسية فوراً
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAdvanceModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                تأكيد وصرف السلفة
              </Button>
            </div>
          </form>
        </Modal>

        {/* Add Deduction Modal */}
        <Modal
          isOpen={isDeductionModalOpen}
          onClose={() => setIsDeductionModalOpen(false)}
          title={`⚠️ تطبيق خصم أو جزاء للموظف: ${emp.fullName}`}
          maxWidth="md"
        >
          <form onSubmit={handleAddDeduction} className="space-y-3 text-right">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  تاريخ الخصم:
                </label>
                <Input
                  type="date"
                  required
                  value={deductionDate}
                  onChange={e => setDeductionDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  ساعة الخصم:
                </label>
                <Input
                  type="time"
                  required
                  value={deductionTime}
                  onChange={e => setDeductionTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                قيمة الخصم (جنيه مصري):
              </label>
              <Input
                type="number"
                step="0.01"
                required
                min="1"
                placeholder="200"
                value={deductionAmount || ''}
                onChange={e => setDeductionAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                سبب الخصم / الجزاء:
              </label>
              <Input
                required
                placeholder="مثال: غياب بدون إذن، تأخير متكرر، إهمال عهدة..."
                value={deductionReason}
                onChange={e => setDeductionReason(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsDeductionModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-500">
                تطبيق الخصم
              </Button>
            </div>
          </form>
        </Modal>

        {/* Add Incentive / Reward Modal */}
        <Modal
          isOpen={isIncentiveModalOpen}
          onClose={() => setIsIncentiveModalOpen(false)}
          title={incentiveType === 'reward' ? `🏆 إضافة مكافأة للموظف: ${emp.fullName}` : `🚀 إضافة حافز إنتاج للموظف: ${emp.fullName}`}
          maxWidth="md"
        >
          <form onSubmit={handleAddIncentive} className="space-y-3 text-right">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  تاريخ الاستحقاق:
                </label>
                <Input
                  type="date"
                  required
                  value={incentiveDate}
                  onChange={e => setIncentiveDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  ساعة الاستحقاق:
                </label>
                <Input
                  type="time"
                  required
                  value={incentiveTime}
                  onChange={e => setIncentiveTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                المبلغ (جنيه مصري):
              </label>
              <Input
                type="number"
                step="0.01"
                required
                min="1"
                placeholder="500"
                value={incentiveAmount || ''}
                onChange={e => setIncentiveAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                البيان وسبب الاستحقاق:
              </label>
              <Input
                required
                placeholder="مثال: تميز في خدمة العملاء، ساعات عمل إضافية، سرعة تسليم التذاكر..."
                value={incentiveReason}
                onChange={e => setIncentiveReason(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsIncentiveModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                إضافة للموظف
              </Button>
            </div>
          </form>
        </Modal>

        {/* Add Attachment Modal */}
        <Modal
          isOpen={isAttachmentModalOpen}
          onClose={() => setIsAttachmentModalOpen(false)}
          title={`📎 إضافة مستند لمملف الموظف: ${emp.fullName}`}
          maxWidth="md"
        >
          <form onSubmit={handleAddAttachment} className="space-y-3 text-right">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                اسم المستند / المرفق:
              </label>
              <Input
                required
                placeholder="مثال: صورة بطاقة الرقم القومي، عقد العمل، شهادة المؤهل..."
                value={attachmentName}
                onChange={e => setAttachmentName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                رابط أو مسار المستند (اختياري):
              </label>
              <Input
                placeholder="https://... أو مسار الملف"
                value={attachmentUrl}
                onChange={e => setAttachmentUrl(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAttachmentModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                حفظ المستند
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Employee Profile Modal */}
        <Modal
          isOpen={isEditEmployeeOpen}
          onClose={() => setIsEditEmployeeOpen(false)}
          title={`✏️ تعديل ملف الموظف: ${emp.fullName}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEmployeeEdit} className="space-y-4 text-right">
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
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
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
                <span className="text-[11px] text-emerald-400 font-mono block mt-1">
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
              <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </Modal>

        {/* Repay Advance / Debt Installment Modal */}
        <Modal
          isOpen={isRepayAdvanceModalOpen}
          onClose={() => setIsRepayAdvanceModalOpen(false)}
          title={`🧾 سداد قسط سلفة / دين للموظف: ${emp.fullName}`}
          maxWidth="md"
        >
          <form onSubmit={handleRepayAdvanceSubmit} className="space-y-3.5 text-right">
            {/* Advance Selector if multiple */}
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">اختيار السلفة / الدين المراد سداد قسط منه:</label>
              {unpaidAdvances.length > 0 ? (
                <select
                  value={selectedAdvanceIdForRepay}
                  onChange={e => setSelectedAdvanceIdForRepay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
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
              <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500 font-bold">
                تثبيت سداد القسط
              </Button>
            </div>
          </form>
        </Modal>

        {/* 📄 Official Report Preview & Invoice Modal */}
        {isPreviewModalOpen && previewDocumentData && (
          <ReportPreviewModal
            isOpen={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
            documentData={previewDocumentData}
            config={reportConfig}
            onConfigChange={setReportConfig}
          />
        )}

        {/* 💵 Salary Review & Disbursement Confirmation Modal */}
        {isSalaryReviewModalOpen && reviewSlip && (
          <SalaryReviewModal
            isOpen={isSalaryReviewModalOpen}
            onClose={() => {
              setIsSalaryReviewModalOpen(false);
              setReviewSlip(null);
            }}
            employee={emp}
            salarySlip={reviewSlip}
            onConfirmDisbursement={handleConfirmDisburseSalary}
            isProcessing={isDisbursing}
          />
        )}
      </div>
    </Modal>
  );
};
