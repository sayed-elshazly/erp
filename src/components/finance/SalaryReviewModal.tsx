import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Employee, SalarySlip } from '../../types/finance.types';
import { formatCurrency, formatDate, getDaysInMonth, calculateDailyRate } from '../../utils/formatters';
import {
  DollarSign,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Briefcase,
  HelpCircle,
  TrendingDown,
  Gift,
  ShieldCheck,
  Building2,
  FileText
} from 'lucide-react';

export interface SalaryReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  salarySlip: SalarySlip;
  onConfirmDisbursement: (slip: SalarySlip) => void;
  isProcessing?: boolean;
}

export const SalaryReviewModal: React.FC<SalaryReviewModalProps> = ({
  isOpen,
  onClose,
  employee,
  salarySlip,
  onConfirmDisbursement,
  isProcessing = false
}) => {
  if (!isOpen || !employee || !salarySlip) return null;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonthStr = today.toISOString().substring(0, 7);
  const totalMonthDays = salarySlip.totalMonthDays || getDaysInMonth(salarySlip.month);
  const isIncompleteMonth = salarySlip.month === currentMonthStr && today.getDate() < totalMonthDays;

  const baseSalary = salarySlip.baseSalary || employee.baseSalary || 0;
  // totalMonthDays calculated dynamically above
  const dailyRate = salarySlip.dailyRate || Math.round((baseSalary / totalMonthDays) * 100) / 100;
  const eligibleDays = salarySlip.eligibleDays ?? 0;
  const presentDays = salarySlip.presentDays ?? 0;
  const absentDays = salarySlip.absentDays ?? 0;
  const leaveDays = salarySlip.leaveDays ?? 0;
  const paidLeaveDays = salarySlip.paidLeaveDays ?? 0;
  const unpaidLeaveDays = salarySlip.unpaidLeaveDays ?? 0;
  const earnedBaseSalary = salarySlip.earnedBaseSalary ?? Math.round(eligibleDays * dailyRate * 100) / 100;

  const bonuses = salarySlip.bonuses || 0;
  const deductions = salarySlip.deductions || 0;
  const netSalary = salarySlip.totalSalary || 0;

  const bonusesList = salarySlip.breakdown?.bonusesList || [];
  const deductionsList = salarySlip.breakdown?.deductionsList || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="مراجعة واعتماد مسير راتب الموظف"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-right select-text">
        {/* 1. Header Banner: Employee Overview */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800/80 dark:to-zinc-900 border border-zinc-200 dark:border-zinc-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg border border-emerald-500/20">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-900 dark:text-white">
                  {employee.fullName}
                </h3>
                <Badge variant="default" size="sm" className="font-mono">
                  {employee.employeeCode}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5 font-medium">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                <span>{employee.jobTitle || 'موظف'}</span>
                <span>•</span>
                <span>{employee.department || 'قسم الزبائن'}</span>
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-left sm:text-right w-full sm:w-auto">
            <span className="text-[11px] text-zinc-500 block font-medium">مسير شهر:</span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
              {salarySlip.month}
            </span>
          </div>
        </div>

        {/* 2. Incomplete Month Warning Banner */}
        {isIncompleteMonth && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-amber-800 dark:text-amber-300">
                ⚠️ تنبيه: الشهر الحالي ({salarySlip.month}) لم ينتهِ بعد!
              </p>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                سيتم احتساب الراتب بناءً على بيانات الحضور والانصراف الفعلية المسجلة في النظام حتى تاريخ اليوم فقط ({todayStr})، ولن يتم افتراض حضور بقية أيام الشهر.
              </p>
            </div>
          </div>
        )}

        {/* 3. Eligibility Summary Grid */}
        <div>
          <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>ملخص الاستحقاق وأيام العمل:</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-500 block">الراتب الأساسي</span>
              <span className="text-sm font-black text-zinc-900 dark:text-white font-mono mt-0.5 block">
                {formatCurrency(baseSalary)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-500 block">قيمة اليوم الواحد (÷{totalMonthDays})</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">
                {formatCurrency(dailyRate)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-500 block">أيام الحضور المسجلة</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                {presentDays} يوم
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-500 block">أيام الغياب</span>
              <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
                {absentDays} يوم
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-500 block">الإجازات المدفوعة</span>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">
                {paidLeaveDays} يوم
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-500 block">إجازات غير مدفوعة</span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
                {unpaidLeaveDays} يوم
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold block">
                أيام العمل المحتسبة
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                {eligibleDays} يوم
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold block">
                مستحق الحضور الفعلي
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                {formatCurrency(earnedBaseSalary)}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Deductions & Bonuses Detailed Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Deductions Breakdown */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>الخصومات الإضافية والجزاءات:</span>
              </span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                -{formatCurrency(deductions)}
              </span>
            </div>

            {deductionsList.length === 0 ? (
              <p className="text-zinc-400 text-[11px] py-2 text-center bg-white/50 dark:bg-zinc-800/40 rounded-lg">
                لا توجد خصومات أو جزاءات مسجلة لهذا الشهر
              </p>
            ) : (
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {deductionsList.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                        {d.reason}
                      </span>
                      {d.date && <span className="text-[10px] text-zinc-400 font-mono">{d.date}</span>}
                    </div>
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                      -{formatCurrency(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-zinc-500 mt-2 italic">
              * ملاحظة: أيام الغياب تم خصمها مسبقاً من أيام العمل المحتسبة لمنع الخصم المزدوج.
            </p>
          </div>

          {/* Incentives / Bonuses Breakdown */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Gift className="w-3.5 h-3.5" />
                <span>المكافآت والحوافز الفعلية:</span>
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(bonuses)}
              </span>
            </div>

            {bonusesList.length === 0 ? (
              <p className="text-zinc-400 text-[11px] py-2 text-center bg-white/50 dark:bg-zinc-800/40 rounded-lg">
                لا توجد مكافآت مسجلة (الحوافز = 0 ج.م)
              </p>
            ) : (
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {bonusesList.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                        {b.reason}
                      </span>
                      {b.date && <span className="text-[10px] text-zinc-400 font-mono">{b.date}</span>}
                    </div>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(b.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-zinc-500 mt-2 italic">
              * الحوافز لا تضاف تلقائياً ويجب تسجيلها مسبقاً من الإدارة مع ذكر السبب.
            </p>
          </div>
        </div>

        {/* 5. "How was the salary calculated?" Breakdown */}
        <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs">
          <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-2.5 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-blue-500" />
            <span>كيف تم حساب الراتب؟</span>
          </h4>

          <div className="space-y-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
            <div className="flex justify-between py-0.5 border-b border-zinc-200 dark:border-zinc-700/60">
              <span>الراتب الشهري الأساسي</span>
              <span>{formatCurrency(baseSalary)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-zinc-200 dark:border-zinc-700/60">
              <span>÷ عدد أيام الشهر المعتمدة</span>
              <span>{totalMonthDays} يوم</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-zinc-200 dark:border-zinc-700/60 text-blue-600 dark:text-blue-400 font-bold">
              <span>= قيمة اليوم الواحد</span>
              <span>{formatCurrency(dailyRate)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-zinc-200 dark:border-zinc-700/60">
              <span>× الأيام المستحقة (حضور + إجازات مدفوعة)</span>
              <span>{eligibleDays} يوم</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-zinc-200 dark:border-zinc-700/60 text-emerald-600 dark:text-emerald-400 font-bold">
              <span>= الأجر المستحق عن أيام العمل</span>
              <span>{formatCurrency(earnedBaseSalary)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-zinc-200 dark:border-zinc-700/60">
              <span>+ إجمالي الحوافز والمكافآت المسجلة</span>
              <span className="text-emerald-600">+{formatCurrency(bonuses)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-zinc-200 dark:border-zinc-700/60">
              <span>- إجمالي الخصومات والجزاءات المسجلة</span>
              <span className="text-rose-600">-{formatCurrency(deductions)}</span>
            </div>
            <div className="flex justify-between pt-1.5 text-sm font-black text-zinc-900 dark:text-white">
              <span>صافي المستحق النهائي للصرف</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-base">
                {formatCurrency(netSalary)}
              </span>
            </div>
          </div>
        </div>

        {/* 6. Vault Payment Notice */}
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-blue-900 dark:text-blue-200 font-medium">
              جهة الصرف: <strong>الخزنة الرئيسية (Main System Safe)</strong>
            </span>
          </div>
          <span className="text-[11px] text-blue-700 dark:text-blue-300 font-bold">
            بند: مصروفات رواتب
          </span>
        </div>

        {/* 7. Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            إلغاء
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onConfirmDisbursement(salarySlip)}
            disabled={isProcessing || netSalary <= 0}
            loading={isProcessing}
            icon={<DollarSign className="w-4 h-4" />}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4"
          >
            تأكيد صرف {formatCurrency(netSalary)} من الخزنة
          </Button>
        </div>
      </div>
    </Modal>
  );
};
