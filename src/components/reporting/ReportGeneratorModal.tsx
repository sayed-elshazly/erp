import React, { useState } from 'react';
import {
  ReportTemplateType,
  ReportConfig,
  ReportDocumentData
} from '../../services/reporting/reportTypes';
import { ReportEngine } from '../../services/reporting/reportEngine';
import { ReportPreviewModal } from './ReportPreviewModal';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import {
  Printer,
  FileText,
  FileSpreadsheet,
  Calendar,
  Eye,
  Sliders,
  CheckSquare,
  Square,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTemplateType: ReportTemplateType;
  customPayload?: any;
  initialStartDate?: string;
  initialEndDate?: string;
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  defaultTemplateType,
  customPayload,
  initialStartDate = '',
  initialEndDate = ''
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Configuration State
  const [templateType, setTemplateType] = useState<ReportTemplateType>(defaultTemplateType);
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('detailed');

  // Checkbox Toggles
  const [showProfits, setShowProfits] = useState(true);
  const [showCosts, setShowCosts] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [showUserData, setShowUserData] = useState(true);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showManagerSignature, setShowManagerSignature] = useState(true);

  // Filters
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterWalletId, setFilterWalletId] = useState('');
  const [filterGameId, setFilterGameId] = useState('');

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<ReportDocumentData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!isOpen) return null;

  const customers = db.getCustomers();
  const wallets = db.getStoreWallets();
  const games = db.getGameTree();

  const getCurrentConfig = (): ReportConfig => ({
    startDate,
    endDate,
    reportType,
    showProfits,
    showCosts,
    showExpenses,
    showLogo,
    showUserData,
    showPageNumbers,
    showManagerSignature,
    filterCustomerId: filterCustomerId || undefined,
    filterWalletId: filterWalletId || undefined,
    filterGameId: filterGameId || undefined
  });

  // Quick Date Presets
  const setQuickDate = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(today.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'week') {
      const w = new Date();
      w.setDate(today.getDate() - 7);
      setStartDate(w.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const m = new Date();
      m.setDate(1);
      setStartDate(m.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleGenerateAndPreview = () => {
    const config = getCurrentConfig();
    const doc = ReportEngine.generateReportDocument(
      templateType,
      config,
      customPayload,
      user?.fullName || 'مدير النظام'
    );
    setPreviewDoc(doc);
    setIsPreviewOpen(true);
  };

  const handleDirectPrint = () => {
    const config = getCurrentConfig();
    const doc = ReportEngine.generateReportDocument(
      templateType,
      config,
      customPayload,
      user?.fullName || 'مدير النظام'
    );
    ReportEngine.printReportDocument(doc, config);
    showToast('info', 'جاري الطباعة', 'تم إرسال المستند إلى نافذة الطباعة الرسمية');
  };

  const handleDirectExcel = () => {
    const config = getCurrentConfig();
    const doc = ReportEngine.generateReportDocument(
      templateType,
      config,
      customPayload,
      user?.fullName || 'مدير النظام'
    );
    ReportEngine.exportReportToExcel(doc, config);
    showToast('success', 'تم التصدير', 'تم تصدير ملف Excel بنجاح');
  };

  const handleDirectCSV = () => {
    const config = getCurrentConfig();
    const doc = ReportEngine.generateReportDocument(
      templateType,
      config,
      customPayload,
      user?.fullName || 'مدير النظام'
    );
    ReportEngine.exportReportToCSV(doc);
    showToast('success', 'تم التصدير', 'تم تصدير ملف CSV بنجاح');
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !isPreviewOpen}
        onClose={onClose}
        title="🖨️ إعداد وتصدير التقرير الاحترافي (Report Generator)"
        subtitle="تخصيص الفترة، الفلاتر، وخيارات العرض قبل المعاينة والطباعة"
        maxWidth="lg"
      >
        <div className="space-y-4 text-right text-xs">
          {/* 1. Date Range & Presets */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-500" /> الفترة الزمنية للتقرير:
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setQuickDate('today')}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-[#2f2f35] font-bold text-[10px] hover:text-orange-500 transition-colors cursor-pointer"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('yesterday')}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-[#2f2f35] font-bold text-[10px] hover:text-orange-500 transition-colors cursor-pointer"
                >
                  أمس
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('week')}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-[#2f2f35] font-bold text-[10px] hover:text-orange-500 transition-colors cursor-pointer"
                >
                  آخر 7 أيام
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('month')}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-[#1f1f23] border border-gray-200 dark:border-[#2f2f35] font-bold text-[10px] hover:text-orange-500 transition-colors cursor-pointer"
                >
                  هذا الشهر
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('all')}
                  className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold text-[10px] cursor-pointer"
                >
                  الكل
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="من تاريخ"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <Input
                label="إلى تاريخ"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* 2. Report Type: Summary vs Detailed */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
            <span className="font-bold text-zinc-900 dark:text-zinc-100">نوع التقرير المولد:</span>
            <div className="flex items-center gap-4 font-bold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="reportType"
                  value="summary"
                  checked={reportType === 'summary'}
                  onChange={() => setReportType('summary')}
                  className="text-orange-500"
                />
                <span>◉ ملخص عام (Summary)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="reportType"
                  value="detailed"
                  checked={reportType === 'detailed'}
                  onChange={() => setReportType('detailed')}
                  className="text-orange-500"
                />
                <span>○ تفصيلي بالجداول (Detailed)</span>
              </label>
            </div>
          </div>

          {/* 3. Custom Toggles / Checkboxes */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2">
            <span className="font-bold text-zinc-900 dark:text-zinc-100 block mb-2">
              خيارات التخصيص والمظهر (Options & Toggles):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={showProfits}
                  onChange={e => setShowProfits(e.target.checked)}
                  className="rounded text-orange-500"
                />
                <span>إظهار الأرباح</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={showCosts}
                  onChange={e => setShowCosts(e.target.checked)}
                  className="rounded text-orange-500"
                />
                <span>إظهار التكاليف</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={showExpenses}
                  onChange={e => setShowExpenses(e.target.checked)}
                  className="rounded text-orange-500"
                />
                <span>إظهار المصروفات</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={e => setShowLogo(e.target.checked)}
                  className="rounded text-orange-500"
                />
                <span>إظهار شعار الشركة</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={showUserData}
                  onChange={e => setShowUserData(e.target.checked)}
                  className="rounded text-orange-500"
                />
                <span>إظهار بيانات المستخدم</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={showPageNumbers}
                  onChange={e => setShowPageNumbers(e.target.checked)}
                  className="rounded text-orange-500"
                />
                <span>إظهار أرقام الصفحات</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold select-none col-span-2">
                <input
                  type="checkbox"
                  checked={showManagerSignature}
                  onChange={e => setShowManagerSignature(e.target.checked)}
                  className="rounded text-orange-500"
                />
                <span>توقيع المدير والختم الرسمي</span>
              </label>
            </div>
          </div>

          {/* 4. Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-[#27272A] flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
                onClick={handleDirectExcel}
              >
                Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<FileText className="w-4 h-4 text-blue-400" />}
                onClick={handleDirectCSV}
              >
                CSV
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                إلغاء
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Eye className="w-4 h-4" />}
                onClick={handleGenerateAndPreview}
              >
                معاينة التقرير
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<Printer className="w-4 h-4" />}
                onClick={handleDirectPrint}
              >
                إرسال للطابعة / PDF
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 👁️ Interactive Adobe / Chrome Preview Modal */}
      {isPreviewOpen && previewDoc && (
        <ReportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          documentData={previewDoc}
          config={getCurrentConfig()}
        />
      )}
    </>
  );
};
