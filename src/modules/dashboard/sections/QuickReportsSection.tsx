// =============================================================
// NZM JKR TOP UP ERP — Admin Dashboard: Quick Reports Section
// Fast 1-click report generation, printable audits, and exports
// =============================================================

import React, { useState } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { ReportGeneratorModal } from '../../../components/reporting/ReportGeneratorModal';
import { ReportTemplateType } from '../../../services/reporting/reportTypes';
import { UnifiedFinanceFilter } from '../../../types/finance.types';
import {
  FileText, Printer, FileSpreadsheet, Download,
  Sparkles, Calendar, ShieldCheck, ArrowUpRight,
  TrendingUp, Users, Building2, Crown, Layers
} from 'lucide-react';

interface QuickReportsSectionProps {
  filter: UnifiedFinanceFilter;
  onNavigate?: (section: string) => void;
}

export const QuickReportsSection: React.FC<QuickReportsSectionProps> = ({
  filter, onNavigate
}) => {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateType>('dashboard');

  const handleOpenReport = (template: ReportTemplateType) => {
    setSelectedTemplate(template);
    setReportModalOpen(true);
  };

  const quickReportCards = [
    {
      id: 'financial_comprehensive',
      title: 'التقرير المالي والرقابي الشامل',
      desc: 'إجمالي إيرادات وأرباح ومصروفات كافة الأقسام مع مطابقة الخزينة',
      icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
      badge: 'شامل النظام',
      badgeColor: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
      template: 'dashboard' as ReportTemplateType
    },
    {
      id: 'customer_transactions',
      title: 'تقرير مبيعات وتذاكر الزبائن',
      desc: 'كشف تفصيلي بحركات الشحن المباشر، الألعاب، والكاش باك',
      icon: <Users className="w-5 h-5 text-orange-500" />,
      badge: 'قسم الزبائن',
      badgeColor: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
      template: 'customers' as ReportTemplateType
    },
    {
      id: 'dealer_invoices',
      title: 'تقرير فواتير ومبيعات التجار',
      desc: 'سجل معاملات الجملة والموزعين والأرصدة والمديونيات',
      icon: <Building2 className="w-5 h-5 text-amber-500" />,
      badge: 'قسم التجار',
      badgeColor: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
      template: 'merchants' as ReportTemplateType
    },
    {
      id: 'middleman_audit',
      title: 'تقرير صفقات الوساطة والضمان',
      desc: 'كشف صفقات الحسابات المكتملة وعمولات الشركة والوسطاء',
      icon: <ShieldCheck className="w-5 h-5 text-purple-500" />,
      badge: 'قسم الوساطة',
      badgeColor: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
      template: 'broker' as ReportTemplateType
    },
    {
      id: 'subscriptions_audit',
      title: 'تقرير الاشتراكات الرقمية والتجديد',
      desc: 'كشف بالباقات النشطة، التجديدات الدورية، وتنبيهات الانتهاء',
      icon: <Crown className="w-5 h-5 text-pink-500" />,
      badge: 'قسم الاشتراكات',
      badgeColor: 'bg-pink-500/10 text-pink-500 border border-pink-500/20',
      template: 'subscriptions' as ReportTemplateType
    },
    {
      id: 'daily_shift_audit',
      title: 'تقرير الوردية واليومية السريع',
      desc: 'ملخص العمليات والوارد والمصروف لوردية العمل الحالية',
      icon: <Calendar className="w-5 h-5 text-emerald-500" />,
      badge: 'يومي سريع',
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
      template: 'shift_settlement' as ReportTemplateType
    }
  ];

  return (
    <Card className="p-5 bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border border-zinc-500/30">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">التقارير السريعة والتصدير المباشر</h3>
            <span className="text-[10px] text-zinc-400">توليد تقارير رسمية جاهزة للطباعة، PDF، و Excel بدقة متناهية</span>
          </div>
        </div>
        <button
          onClick={() => onNavigate?.('reports')}
          className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer flex items-center gap-0.5"
        >
          مركز التقارير المتقدم <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickReportCards.map(card => (
          <div
            key={card.id}
            onClick={() => handleOpenReport(card.template)}
            className="p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700/50 shadow-sm group-hover:scale-105 transition-transform">
                  {card.icon}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>
              <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 group-hover:text-orange-500 transition-colors">
                {card.title}
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                {card.desc}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-zinc-800/80 text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
              <span className="flex items-center gap-1 group-hover:underline">
                <Printer className="w-3 h-3 text-zinc-400" /> معاينة وطباعة
              </span>
              <span className="text-[10px] text-zinc-400 group-hover:text-orange-500 transition-colors">
                تصدير PDF / Excel &larr;
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Trigger */}
      {reportModalOpen && (
        <ReportGeneratorModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          defaultTemplateType={selectedTemplate}
        />
      )}
    </Card>
  );
};
