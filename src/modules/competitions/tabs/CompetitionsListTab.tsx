import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Competition, CompetitionStatus, CompetitionType } from '../../../types/competition.types';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import {
  Trophy,
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Sparkles,
  Calendar,
  Gift,
  Users,
  RotateCcw,
  Archive
} from 'lucide-react';

interface CompetitionsListTabProps {
  competitions: Competition[];
  initialAudienceFilter?: string;
  onOpenNewModal: () => void;
  onSelectCompetition: (comp: Competition) => void;
  onEditCompetition: (comp: Competition) => void;
  onDeleteCompetition: (comp: Competition) => void;
  onOpenDrawModal?: (comp: Competition) => void;
}

export const CompetitionsListTab: React.FC<CompetitionsListTabProps> = ({
  competitions,
  initialAudienceFilter = 'all',
  onOpenNewModal,
  onSelectCompetition,
  onEditCompetition,
  onDeleteCompetition,
  onOpenDrawModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [audienceFilter, setAudienceFilter] = useState<string>(
    initialAudienceFilter === 'dealers' ? 'merchants' : initialAudienceFilter || 'all'
  );
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Filter logic (Task 31)
  const filteredCompetitions = useMemo(() => {
    return competitions.filter(comp => {
      if (statusFilter !== 'all' && comp.status !== statusFilter) return false;
      if (typeFilter !== 'all' && comp.type !== typeFilter) return false;

      // Audience Filter
      if (audienceFilter !== 'all') {
        const audType = comp.targetAudience?.type || 'all_customers';
        if (audienceFilter === 'customers') {
          const isCust = ['all_customers', 'new_customers', 'existing_customers', 'customer_level', 'both', 'all'].includes(audType);
          if (!isCust) return false;
        } else if (audienceFilter === 'merchants') {
          const isMerch = ['merchants', 'selected_merchants', 'dealers', 'both', 'all'].includes(audType);
          if (!isMerch) return false;
        } else if (audienceFilter === 'both') {
          if (audType !== 'both' && audType !== 'all') return false;
        }
      }

      if (startDateFilter && comp.startDate < startDateFilter) return false;
      if (endDateFilter && comp.endDate > endDateFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = comp.title.toLowerCase().includes(q);
        const matchCode = comp.code.toLowerCase().includes(q);
        const matchDesc = comp.description ? comp.description.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchCode && !matchDesc) return false;
      }

      return true;
    });
  }, [competitions, statusFilter, typeFilter, audienceFilter, startDateFilter, endDateFilter, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  return (
    <div className="space-y-4 text-right animate-fade-in" dir="rtl">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" />
            <span>سجل وإدارة المسابقات والحملات</span>
          </h2>
          <span className="text-xs text-zinc-500">
            إجمالي المسابقات المسجلة: {competitions.length} مسابقة
          </span>
        </div>

        <Button
          variant="primary"
          onClick={onOpenNewModal}
          className="gap-2 text-xs font-black bg-orange-500 text-white"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء مسابقة جديدة</span>
        </Button>
      </div>

      {/* Advanced Filter Bar (Task 31) */}
      <Card className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
            <Input
              placeholder="بحث بالاسم أو الكود أو الوصف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-9 h-9 text-xs"
            />
          </div>

          {/* Audience Filter */}
          <div>
            <select
              className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
              value={audienceFilter}
              onChange={e => setAudienceFilter(e.target.value)}
            >
              <option value="all">كافة الفئات (الكل)</option>
              <option value="customers">العملاء فقط (Customers)</option>
              <option value="merchants">التجار والموزعين (Merchants)</option>
              <option value="both">مشتركة: عملاء + تجار (Both)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">كافة الحالات (All Statuses)</option>
              <option value="active">نشطة (Active)</option>
              <option value="scheduled">مجدولة (Scheduled)</option>
              <option value="draft">مسودة (Draft)</option>
              <option value="paused">متوقفة مؤقتًا (Paused)</option>
              <option value="finished">منتهية (Finished)</option>
              <option value="archived">مؤرشفة (Archived)</option>
              <option value="cancelled">ملغاة (Cancelled)</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="all">كافة الأنواع (All Types)</option>
              <option value="recharge_count">اشحن X مرات (Recharge Count)</option>
              <option value="top_spenders">أكثر العملاء شحنًا (Top Spenders)</option>
              <option value="recharge_draw">سحب الشاحنين (Recharge Draw)</option>
              <option value="referral">إحالة أصدقاء (Referral)</option>
              <option value="speed">السرعة والستوري (Speed)</option>
              <option value="interactive">التفاعل الاجتماعي (Interactive)</option>
              <option value="registration">تسجيل الرقم (Registration)</option>
              <option value="custom">شروط مخصصة (Custom)</option>
            </select>
          </div>

          {/* Reset button */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="h-9 w-full text-xs font-bold gap-1 text-zinc-500"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة الضبط</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Competitions Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <table className="w-full text-right text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
            <tr>
              <th className="p-3.5">الكود والاسم</th>
              <th className="p-3.5">نوع المسابقة</th>
              <th className="p-3.5">الحالة</th>
              <th className="p-3.5">الفترة الزمنية</th>
              <th className="p-3.5 text-center">عدد الجوائز</th>
              <th className="p-3.5 text-center">الميزانية المرصودة</th>
              <th className="p-3.5 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredCompetitions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-zinc-400">
                  لا توجد مسابقات تطابق معايير الفلترة الحالية
                </td>
              </tr>
            ) : (
              filteredCompetitions.map(comp => (
                <tr key={comp.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                      {comp.title}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">#{comp.code}</span>
                  </td>

                  <td className="p-3.5">
                    <Badge variant="orange">{comp.type}</Badge>
                  </td>

                  <td className="p-3.5">
                    <Badge
                      variant={
                        comp.status === 'active'
                          ? 'success'
                          : comp.status === 'finished'
                          ? 'default'
                          : comp.status === 'paused'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {comp.status}
                    </Badge>
                  </td>

                  <td className="p-3.5 text-zinc-500 text-[11px]">
                    <div>من: {comp.startDate}</div>
                    <div>إلى: {comp.endDate}</div>
                  </td>

                  <td className="p-3.5 text-center font-bold text-orange-500">
                    {comp.prizes?.length || 0}
                  </td>

                  <td className="p-3.5 text-center font-black text-zinc-800 dark:text-zinc-200">
                    {formatCurrency(comp.totalMarketingCost)}
                  </td>

                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {comp.type === 'recharge_draw' && !comp.isDrawExecuted && (
                        <button
                          type="button"
                          onClick={() => onOpenDrawModal?.(comp)}
                          title="إجراء السحب الإلكتروني"
                          className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectCompetition(comp)}
                        title="عرض التفاصيل والمشاركين"
                        className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditCompetition(comp)}
                        title="تعديل المسابقة"
                        className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-blue-500 hover:bg-blue-500/10"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteCompetition(comp)}
                        title="حذف / أرشفة المسابقة"
                        className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
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
  );
};
