import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  FileSpreadsheet,
  FileText,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sliders,
  CheckCircle2,
  TrendingUp,
  Download
} from 'lucide-react';
import { ReportDocumentData, ReportConfig } from '../../services/reporting/reportTypes';
import { ReportEngine } from '../../services/reporting/reportEngine';
import { Button } from '../common/Button';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: ReportDocumentData | null;
  config: ReportConfig;
  onConfigChange?: (newConfig: ReportConfig) => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  documentData,
  config,
  onConfigChange
}) => {
  const [zoom, setZoom] = useState(100);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
        window.scrollTo({ top: scrollPos, behavior: 'instant' as ScrollBehavior });
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !documentData || !mounted) return null;

  const handlePrint = () => {
    ReportEngine.printReportDocument(documentData, config);
  };

  const handleExcel = () => {
    ReportEngine.exportReportToExcel(documentData, config);
  };

  const handleCSV = () => {
    ReportEngine.exportReportToCSV(documentData);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-black/85 backdrop-blur-md animate-fade-in text-right">
      {/* 🛠️ Top Preview Toolbar (Adobe / Chrome PDF Style) */}
      <div className="h-16 px-4 bg-[#141417] border-b border-[#27272A] flex items-center justify-between gap-3 text-white shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-sm font-bold text-zinc-100 truncate">{documentData.title}</h3>
            <span className="text-[11px] text-zinc-400 font-mono">
              رقم المستند: {documentData.id} • {documentData.periodLabel}
            </span>
          </div>
        </div>

        {/* Zoom & Quick Controls */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-[#1f1f23] border border-[#2f2f35]">
          <button
            type="button"
            onClick={() => setZoom(prev => Math.max(50, prev - 10))}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono px-2 text-zinc-300 font-bold">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom(prev => Math.min(150, prev + 10))}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
            title="100% حجم أصلي"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export & Print Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            onClick={handleExcel}
            className="hidden sm:inline-flex"
          >
            Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<FileText className="w-4 h-4 text-blue-400" />}
            onClick={handleCSV}
            className="hidden sm:inline-flex"
          >
            CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            🖨️ طباعة / تصدير PDF
          </Button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="إغلاق المعاينة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 📄 Paper Viewport Canvas */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-[#0d0d0f] scrollbar-thin">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out'
          }}
          className="w-full max-w-[850px] bg-white text-zinc-900 rounded-lg shadow-2xl p-8 sm:p-12 space-y-6 border border-zinc-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-orange-500">
            <div className="flex items-center gap-3">
              {config.showLogo && (
                <div className="px-3.5 py-1.5 rounded-xl bg-black border border-orange-500 text-orange-500 font-black text-lg tracking-wider">
                  JKR
                </div>
              )}
              <div>
                <h1 className="text-xl font-black text-zinc-900 tracking-tight">NZM JKR TOP UP ERP</h1>
                <p className="text-xs text-zinc-500 font-semibold">منظومة الإدارة والمحاسبة والتقارير الاحترافية</p>
              </div>
            </div>

            <div className="text-left font-mono text-[11px] text-zinc-600 space-y-0.5">
              <div><strong>رقم التقرير:</strong> {documentData.id}</div>
              <div><strong>تاريخ الإصدار:</strong> {documentData.issueDate}</div>
              <div><strong>الفترة:</strong> {documentData.periodLabel}</div>
              {config.showUserData && <div><strong>المستخدم:</strong> {documentData.generatedBy}</div>}
            </div>
          </div>

          {/* Title Bar */}
          <div className="p-3 rounded-lg bg-zinc-100 border-r-4 border-orange-500">
            <h2 className="text-base font-black text-zinc-900">{documentData.title}</h2>
            {documentData.subtitle && <p className="text-xs text-zinc-600 mt-0.5">{documentData.subtitle}</p>}
          </div>

          {/* Meta Details */}
          {documentData.metaDetails && documentData.metaDetails.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
              {documentData.metaDetails.map((m, idx) => (
                <div key={idx} className="space-x-1">
                  <span className="font-bold text-zinc-500 ml-1">{m.label}:</span>
                  <span className="font-semibold text-zinc-900">{m.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* KPI Summary Cards */}
          {documentData.kpis && documentData.kpis.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {documentData.kpis.map((kpi, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl bg-zinc-50 border ${
                    kpi.color === 'green'
                      ? 'border-t-4 border-emerald-500'
                      : kpi.color === 'red'
                      ? 'border-t-4 border-rose-500'
                      : kpi.color === 'blue'
                      ? 'border-t-4 border-blue-500'
                      : 'border-t-4 border-orange-500'
                  }`}
                >
                  <span className="text-[11px] text-zinc-500 block mb-1 font-semibold">{kpi.label}</span>
                  <span className="text-base font-black font-mono text-zinc-900">{kpi.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tables */}
          {documentData.tables.map((table, tIdx) => (
            <div key={tIdx} className="space-y-2">
              {table.title && (
                <h4 className="text-xs font-black text-zinc-800 flex items-center gap-1.5">
                  <span>📌 {table.title}</span>
                </h4>
              )}
              <div className="overflow-hidden border border-zinc-300 rounded-lg">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-zinc-800 text-white font-bold">
                      {table.columns.map((c, cIdx) => (
                        <th
                          key={cIdx}
                          style={{ textAlign: c.align || 'right' }}
                          className="py-2 px-3 border-b border-zinc-700"
                        >
                          {c.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-zinc-50/70' : 'bg-white'}>
                        {table.columns.map((col, colIdx) => (
                          <td
                            key={colIdx}
                            style={{ textAlign: col.align || 'right' }}
                            className="py-2 px-3 text-zinc-800"
                          >
                            {row[col.key] ?? '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {table.totals && (
                      <tr className="bg-zinc-100 font-black border-t-2 border-zinc-900">
                        {table.columns.map((col, colIdx) => (
                          <td
                            key={colIdx}
                            style={{ textAlign: col.align || 'right' }}
                            className="py-2.5 px-3 text-zinc-900"
                          >
                            {table.totals?.[col.key] ?? ''}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Notes Box */}
          {documentData.notes && documentData.notes.length > 0 && (
            <div className="p-3 rounded-lg border border-dashed border-orange-400 bg-orange-50/50 text-xs text-orange-950 space-y-1">
              <strong className="block font-bold">ملاحظات هامة:</strong>
              <ul className="list-disc pr-5 space-y-0.5 text-[11px]">
                {documentData.notes.map((note, nIdx) => (
                  <li key={nIdx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Signatures */}
          {documentData.signatories && documentData.signatories.length > 0 && (
            <div className="pt-6 border-t border-zinc-300 flex items-center justify-between text-center text-xs">
              {documentData.signatories.map((sig, sIdx) => (
                <div key={sIdx} className="w-1/3 space-y-8">
                  <span className="font-bold text-zinc-700 block">{sig.title}</span>
                  <div className="border-b border-dotted border-zinc-400 w-3/4 mx-auto" />
                  <span className="text-[11px] text-zinc-500 font-mono">{sig.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-zinc-200 flex items-center justify-between text-[10px] text-zinc-500">
            <span>تم إنشاء التقرير رسمياً بواسطة NZM JKR TOP UP ERP — جميع الحقوق محفوظة</span>
            <span>{config.showPageNumbers ? 'صفحة 1 من 1' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
