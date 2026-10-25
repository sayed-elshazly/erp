import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Competition, CompetitionReward } from '../../../types/competition.types';
import { db } from '../../../database/db';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import { exportToExcel } from '../../../utils/excelExport';
import {
  FileText,
  Download,
  Trophy,
  Users,
  Wallet,
  TrendingUp,
  Receipt,
  Gift
} from 'lucide-react';

interface CompetitionReportsTabProps {
  competitions: Competition[];
  rewards: CompetitionReward[];
}

export const CompetitionReportsTab: React.FC<CompetitionReportsTabProps> = ({
  competitions,
  rewards
}) => {
  const [reportType, setReportType] = useState<'competitions' | 'customers' | 'wallets'>('competitions');

  const participants = useMemo(() => db.getCompetitionParticipants(), []);

  // 1. Competition Performance Report Data
  const competitionReportData = useMemo(() => {
    return competitions.map(c => {
      const compParts = participants.filter(p => p.competitionId === c.id);
      const compRewards = rewards.filter(r => r.competitionId === c.id);
      const deliveredRewards = compRewards.filter(r => r.status === 'delivered');
      const prizeCost = deliveredRewards.reduce((sum, r) => sum + r.costEGP, 0);
      const totalRechargeRevenue = compParts.reduce((sum, p) => sum + p.totalRechargeAmount, 0);
      const winnersCount = compParts.filter(p => p.isWinner).length;

      return {
        id: c.id,
        code: c.code,
        title: c.title,
        type: c.type,
        status: c.status,
        participantsCount: compParts.length,
        winnersCount,
        totalRechargeRevenue,
        prizeCost,
        campaignBudget: c.totalMarketingCost,
        totalCampaignCost: c.totalMarketingCost + prizeCost
      };
    });
  }, [competitions, participants, rewards]);

  // 2. Customer Reward Report Data
  const customerReportData = useMemo(() => {
    const custMap = new Map<string, {
      name: string;
      phone: string;
      type: string;
      competitionsCount: number;
      rewardsCount: number;
      totalValue: number;
      deliveredCount: number;
      pendingCount: number;
    }>();

    rewards.forEach(r => {
      const key = r.entityId;
      if (!custMap.has(key)) {
        custMap.set(key, {
          name: r.entityName,
          phone: r.entityPhone,
          type: r.entityType === 'customer' ? 'عميل' : 'تاجر',
          competitionsCount: 1,
          rewardsCount: 0,
          totalValue: 0,
          deliveredCount: 0,
          pendingCount: 0
        });
      }
      const entry = custMap.get(key)!;
      entry.rewardsCount++;
      entry.totalValue += r.prizeValue;
      if (r.status === 'delivered') entry.deliveredCount++;
      if (r.status === 'pending') entry.pendingCount++;
    });

    return Array.from(custMap.values());
  }, [rewards]);

  // 3. Product Wallet Reward Report Data
  const walletReportData = useMemo(() => {
    const wMap = new Map<string, {
      walletName: string;
      productName: string;
      rewardsCount: number;
      totalCostEGP: number;
      totalUnitsOrValue: number;
    }>();

    rewards.filter(r => r.status === 'delivered').forEach(r => {
      const key = `${r.sourceWalletName || 'النظام'}_${r.productName || 'مباشر'}`;
      if (!wMap.has(key)) {
        wMap.set(key, {
          walletName: r.sourceWalletName || 'محفظة النظام',
          productName: r.productName || 'مكافأة مباشرة',
          rewardsCount: 0,
          totalCostEGP: 0,
          totalUnitsOrValue: 0
        });
      }
      const entry = wMap.get(key)!;
      entry.rewardsCount++;
      entry.totalCostEGP += r.costEGP;
      entry.totalUnitsOrValue += r.prizeValue;
    });

    return Array.from(wMap.values());
  }, [rewards]);

  // Export handlers
  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    if (reportType === 'competitions') {
      const data = competitionReportData.map(c => ({
        'كود المسابقة': c.code,
        'اسم المسابقة': c.title,
        'النوع': c.type,
        'الحالة': c.status,
        'المشاركون': c.participantsCount,
        'عدد الفائزين': c.winnersCount,
        'مبيعات الشحن الناتجة (ج.م)': c.totalRechargeRevenue,
        'تكلفة الجوائز المسلمة (ج.م)': c.prizeCost,
        'ميزانية الحملة (ج.م)': c.campaignBudget,
        'التكلفة الإجمالية (ج.م)': c.totalCampaignCost
      }));
      exportToExcel(data, `تقرير_أداء_المسابقات_${timestamp}`);
    } else if (reportType === 'customers') {
      const data = customerReportData.map(c => ({
        'اسم المستفيد': c.name,
        'رقم الهاتف': c.phone,
        'النوع': c.type,
        'عدد الجوائز': c.rewardsCount,
        'إجمالي القيمة': c.totalValue,
        'المسلمة': c.deliveredCount,
        'المعلقة': c.pendingCount
      }));
      exportToExcel(data, `تقرير_مكافآت_العملاء_${timestamp}`);
    } else {
      const data = walletReportData.map(w => ({
        'محفظة البضاعة': w.walletName,
        'المنتج': w.productName,
        'عدد الجوائز المسلمة': w.rewardsCount,
        'إجمالي التكلفة التسويقية (ج.م)': w.totalCostEGP,
        'إجمالي القيمة / الوحدات': w.totalUnitsOrValue
      }));
      exportToExcel(data, `تقرير_استهلاك_محافظ_البضاعة_${timestamp}`);
    }
  };

  return (
    <div className="space-y-4 text-right animate-fade-in" dir="rtl">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            <span>التقارير التحليلية والمالية للمسابقات</span>
          </h2>
          <span className="text-xs text-zinc-500">
            استخراج تقارير الأداء، تكاليف الجوائز، والربحية التسويقية
          </span>
        </div>

        <Button
          variant="outline"
          onClick={handleExport}
          className="gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
        >
          <Download className="w-4 h-4" />
          <span>تصدير إكسيل (Export Excel)</span>
        </Button>
      </div>

      {/* Report Type Selector */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setReportType('competitions')}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
            reportType === 'competitions'
              ? 'bg-orange-500 text-white'
              : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>تقرير الحملات والمسابقات</span>
        </button>

        <button
          type="button"
          onClick={() => setReportType('customers')}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
            reportType === 'customers'
              ? 'bg-orange-500 text-white'
              : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>تقرير مكافآت العملاء</span>
        </button>

        <button
          type="button"
          onClick={() => setReportType('wallets')}
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
            reportType === 'wallets'
              ? 'bg-orange-500 text-white'
              : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>تقرير استهلاك محافظ البضاعة</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {reportType === 'competitions' && (
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
              <tr>
                <th className="p-3">المسابقة</th>
                <th className="p-3 text-center">المشاركون</th>
                <th className="p-3 text-center">الفائزون</th>
                <th className="p-3 text-center">مبيعات الشحن الناتجة</th>
                <th className="p-3 text-center">تكلفة الجوائز المسلمة</th>
                <th className="p-3 text-center">إجمالي تكلفة الحملة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {competitionReportData.map(c => (
                <tr key={c.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                  <td className="p-3">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{c.title}</div>
                    <span className="text-[10px] text-zinc-400 font-mono">#{c.code}</span>
                  </td>
                  <td className="p-3 text-center font-bold">{c.participantsCount}</td>
                  <td className="p-3 text-center font-bold text-orange-500">{c.winnersCount}</td>
                  <td className="p-3 text-center font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(c.totalRechargeRevenue)}
                  </td>
                  <td className="p-3 text-center font-bold text-rose-500">
                    {formatCurrency(c.prizeCost)}
                  </td>
                  <td className="p-3 text-center font-bold text-zinc-800 dark:text-zinc-200">
                    {formatCurrency(c.totalCampaignCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {reportType === 'customers' && (
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
              <tr>
                <th className="p-3">المستفيد</th>
                <th className="p-3">النوع</th>
                <th className="p-3 text-center">إجمالي الجوائز</th>
                <th className="p-3 text-center">إجمالي القيمة المستحقة</th>
                <th className="p-3 text-center">المسلمة</th>
                <th className="p-3 text-center">المعلقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {customerReportData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400">
                    لا توجد مكافآت مسجلة للعملاء
                  </td>
                </tr>
              ) : (
                customerReportData.map((c, i) => (
                  <tr key={i} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                    <td className="p-3">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{c.name}</div>
                      <span className="text-[10px] text-zinc-400 font-mono">{c.phone}</span>
                    </td>
                    <td className="p-3">{c.type}</td>
                    <td className="p-3 text-center font-bold">{c.rewardsCount}</td>
                    <td className="p-3 text-center font-bold text-orange-500">{c.totalValue}</td>
                    <td className="p-3 text-center font-bold text-emerald-500">{c.deliveredCount}</td>
                    <td className="p-3 text-center font-bold text-amber-500">{c.pendingCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {reportType === 'wallets' && (
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
              <tr>
                <th className="p-3">محفظة البضاعة المصدر</th>
                <th className="p-3">المنتج المرتبط</th>
                <th className="p-3 text-center">عدد الجوائز المسلمة</th>
                <th className="p-3 text-center">إجمالي الوحدات الممنوحة</th>
                <th className="p-3 text-center">التكلفة التسويقية الإجمالية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {walletReportData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-400">
                    لا توجد حركات خصم جوائز على محافظ البضاعة
                  </td>
                </tr>
              ) : (
                walletReportData.map((w, i) => (
                  <tr key={i} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                    <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{w.walletName}</td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-300">{w.productName}</td>
                    <td className="p-3 text-center font-bold">{w.rewardsCount}</td>
                    <td className="p-3 text-center font-bold text-orange-500">{w.totalUnitsOrValue}</td>
                    <td className="p-3 text-center font-black text-rose-500">
                      {formatCurrency(w.totalCostEGP)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
