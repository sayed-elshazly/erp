import React, { useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Competition, CompetitionsDashboardKPIs } from '../../../types/competition.types';
import { db } from '../../../database/db';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import {
  Trophy,
  Gift,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Receipt,
  Sparkles,
  Plus,
  ArrowRight,
  Flame,
  Award,
  DollarSign
} from 'lucide-react';

interface CompetitionsDashboardTabProps {
  kpis: CompetitionsDashboardKPIs;
  competitions: Competition[];
  onOpenNewCompetitionModal: () => void;
  onSelectCompetition: (comp: Competition) => void;
  onNavigateTab: (tab: string) => void;
}

export const CompetitionsDashboardTab: React.FC<CompetitionsDashboardTabProps> = ({
  kpis,
  competitions,
  onOpenNewCompetitionModal,
  onSelectCompetition,
  onNavigateTab
}) => {
  const activeCompetitions = useMemo(() => {
    return competitions.filter(c => c.status === 'active');
  }, [competitions]);

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      {/* Top Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-transparent border border-orange-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/20 text-orange-500 border border-orange-500/30">
              <Trophy className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                مركز إدارة المسابقات والمكافآت والتسويق
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                إدارة الحملات الترويجية، مسابقات الشحن، السحوبات الإلكترونية، وتسليم الجوائز الموثقة في المالية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <Button
            variant="primary"
            onClick={onOpenNewCompetitionModal}
            className="gap-2 text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 px-4 py-2.5"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء مسابقة جديدة</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid (Task 1 & 35) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* 1. Active Competitions */}
        <Card className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">المسابقات النشطة</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
            {kpis.activeCompetitionsCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">حملات جارية تستقبل المشاركات الآن</div>
        </Card>

        {/* 2. Finished Competitions */}
        <Card className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">المسابقات المنتهية</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
            {kpis.finishedCompetitionsCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">مسابقات مكتملة وتم توثيق نتائجها</div>
        </Card>

        {/* 3. Total Participants */}
        <Card className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">إجمالي المشاركين</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
            {kpis.totalParticipantsCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">عملاء وتجار شاركوا في المسابقات</div>
        </Card>

        {/* 4. Rewarded Customers */}
        <Card className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">عملاء استلموا مكافآت</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
            {kpis.uniqueRewardedCustomersCount}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">مستفيدون حقيقيون استلموا جوائزهم</div>
        </Card>

        {/* 5. Delivered Rewards Value */}
        <Card className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-500 font-bold">قيمة الجوائز المسلمة</span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(kpis.deliveredRewardsValue)}
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">تم تسليمها وخصمها من محافظ البضاعة</div>
        </Card>

        {/* 6. Pending Rewards Value */}
        <Card className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-500 font-bold">جوائز مستحقة قيد التسليم</span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500 mt-2">
            {formatCurrency(kpis.pendingRewardsValue)}
          </div>
          <div className="text-[11px] text-amber-500/80 mt-1">مستحقة ولم تُخصم حتى يعتمدها المدير</div>
        </Card>

        {/* 7. Marketing Expense from Rewards */}
        <Card className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-500 font-bold">تكلفة التسويق المنفذة</span>
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-500 mt-2">
            {formatCurrency(kpis.marketingCostTotal)}
          </div>
          <div className="text-[11px] text-rose-500/80 mt-1">مصروف تسويقي موثق بالدفاتر المحاسبية</div>
        </Card>

        {/* 8. Total Campaign Cost */}
        <Card className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-bold">إجمالي ميزانيات الحملات</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
            {formatCurrency(kpis.totalCampaignCost)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">الميزانية الكلية المرصودة للحملات</div>
        </Card>
      </div>

      {/* Active Campaigns Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              المسابقات والحملات النشطة حاليًا
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('competitions_list')}
            className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1"
          >
            <span>عرض كافة المسابقات ({competitions.length})</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCompetitions.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400">
              لا توجد مسابقات نشطة حالياً. يمكنك إنشاء مسابقة جديدة بضغطة زر.
            </div>
          ) : (
            activeCompetitions.map(comp => (
              <Card
                key={comp.id}
                onClick={() => onSelectCompetition(comp)}
                className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="success">نشطة (Active)</Badge>
                    <span className="text-[11px] text-zinc-400 font-mono">#{comp.code}</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                      {comp.title}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                      {comp.description || 'مسابقة تسويقية تفاعلية'}
                    </p>
                  </div>

                  {/* Rules preview */}
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-[11px] text-zinc-600 dark:text-zinc-300 space-y-1">
                    <span className="font-bold text-zinc-400 block text-[10px]">الشروط:</span>
                    {comp.rules?.conditions?.slice(0, 2).map(c => (
                      <div key={c.id} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer details */}
                <div className="pt-4 mt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <div className="text-orange-500 font-bold">
                    {comp.prizes?.length || 0} جوائز
                  </div>
                  <div className="text-zinc-400 text-[11px]">
                    تنتهي في: {comp.endDate}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
