import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { CompetitionReward, RewardDeliveryStatus } from '../../../types/competition.types';
import { db } from '../../../database/db';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import {
  Gift,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Wallet,
  Receipt,
  User,
  Package,
  RotateCcw,
  Ban
} from 'lucide-react';

interface RewardsManagementTabProps {
  rewards: CompetitionReward[];
  onOpenDeliveryModal: (reward: CompetitionReward) => void;
  onCancelReward: (reward: CompetitionReward) => void;
}

export const RewardsManagementTab: React.FC<RewardsManagementTabProps> = ({
  rewards,
  onOpenDeliveryModal,
  onCancelReward
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRewards = useMemo(() => {
    return rewards.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.entityName.toLowerCase().includes(q);
        const matchPhone = r.entityPhone.includes(q);
        const matchPrize = r.prizeName.toLowerCase().includes(q);
        const matchComp = r.competitionTitle.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchPrize && !matchComp) return false;
      }
      return true;
    });
  }, [rewards, statusFilter, searchQuery]);

  const pendingCount = rewards.filter(r => r.status === 'pending').length;
  const deliveredCount = rewards.filter(r => r.status === 'delivered').length;
  const cancelledCount = rewards.filter(r => r.status === 'cancelled').length;

  return (
    <div className="space-y-4 text-right animate-fade-in" dir="rtl">
      {/* Top Title & Summary Cards */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Gift className="w-5 h-5 text-orange-500" />
            <span>إدارة وتسليم المكافآت والجوائز (Reward Hub)</span>
          </h2>
          <span className="text-xs text-zinc-500">
            متابعة الجوائز المستحقة، اعتماد التسليم الفوري، وإلغاء المكافآت
          </span>
        </div>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`p-3 rounded-xl border text-right transition-all ${
            statusFilter === 'pending'
              ? 'border-amber-500 bg-amber-500/10 font-bold'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <div className="text-[11px] text-amber-500 font-bold flex items-center justify-between">
            <span>مستحقة قيد التسليم</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {pendingCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('delivered')}
          className={`p-3 rounded-xl border text-right transition-all ${
            statusFilter === 'delivered'
              ? 'border-emerald-500 bg-emerald-500/10 font-bold'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <div className="text-[11px] text-emerald-500 font-bold flex items-center justify-between">
            <span>تم تسليمها بنجاح</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {deliveredCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('cancelled')}
          className={`p-3 rounded-xl border text-right transition-all ${
            statusFilter === 'cancelled'
              ? 'border-rose-500 bg-rose-500/10 font-bold'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <div className="text-[11px] text-rose-500 font-bold flex items-center justify-between">
            <span>ملغاة</span>
            <Ban className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {cancelledCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-xl border text-right transition-all ${
            statusFilter === 'all'
              ? 'border-blue-500 bg-blue-500/10 font-bold'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <div className="text-[11px] text-blue-500 font-bold flex items-center justify-between">
            <span>كافة المكافآت</span>
            <Gift className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {rewards.length}
          </div>
        </button>
      </div>

      {/* Search Bar */}
      <Card className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
          <Input
            placeholder="بحث بالمستفيد، رقم الهاتف، اسم الجائزة، أو المسابقة..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pr-9 h-9 text-xs"
          />
        </div>
      </Card>

      {/* Rewards Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <table className="w-full text-right text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
            <tr>
              <th className="p-3.5">المستفيد</th>
              <th className="p-3.5">الجائزة المستحقة</th>
              <th className="p-3.5">المسابقة</th>
              <th className="p-3.5">محفظة المصدر</th>
              <th className="p-3.5 text-center">التكلفة التسويقية</th>
              <th className="p-3.5 text-center">الحالة</th>
              <th className="p-3.5 text-center">إجراءات التسليم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredRewards.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-zinc-400">
                  لا توجد مكافآت مسجلة في هذا القسم
                </td>
              </tr>
            ) : (
              filteredRewards.map(rew => (
                <tr key={rew.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                      {rew.entityName}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">{rew.entityPhone}</span>
                  </td>

                  <td className="p-3.5">
                    <div className="font-bold text-orange-500">{rew.prizeName}</div>
                    <span className="text-[10px] text-zinc-400">
                      القيمة: {rew.prizeValue} {rew.currency}
                    </span>
                  </td>

                  <td className="p-3.5 text-zinc-600 dark:text-zinc-300">
                    <div className="line-clamp-1">{rew.competitionTitle}</div>
                    <span className="text-[10px] text-zinc-400">{formatDateTime(rew.createdAt)}</span>
                  </td>

                  <td className="p-3.5 text-zinc-500">
                    <div className="line-clamp-1">{rew.sourceWalletName || 'محفظة النظام'}</div>
                  </td>

                  <td className="p-3.5 text-center font-bold text-rose-500">
                    {formatCurrency(rew.costEGP)}
                  </td>

                  <td className="p-3.5 text-center">
                    <Badge
                      variant={
                        rew.status === 'delivered'
                          ? 'success'
                          : rew.status === 'pending'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {rew.status === 'delivered' && 'تم التسليم'}
                      {rew.status === 'pending' && 'معلقة (Pending)'}
                      {rew.status === 'cancelled' && 'ملغاة'}
                      {rew.status === 'failed' && 'فشلت'}
                    </Badge>
                  </td>

                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {rew.status === 'pending' && (
                        <>
                          <Button
                            variant="primary"
                            onClick={() => onOpenDeliveryModal(rew)}
                            className="h-7 px-3 text-[11px] font-bold gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تسليم الجائزة</span>
                          </Button>

                          <Button
                            variant="ghost"
                            onClick={() => onCancelReward(rew)}
                            className="h-7 px-2 text-[11px] text-red-500 hover:bg-red-500/10"
                            title="إلغاء الجائزة"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}

                      {rew.status === 'delivered' && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold space-y-0.5">
                          <div>سلمها: {rew.deliveredBy || 'المدير'}</div>
                          <div className="text-zinc-400 font-mono text-[9px]">
                            {rew.deliveredAt ? formatDateTime(rew.deliveredAt) : '-'}
                          </div>
                        </div>
                      )}

                      {rew.status === 'cancelled' && (
                        <span className="text-[10px] text-zinc-400 italic">
                          {rew.cancellationReason || 'ملغاة'}
                        </span>
                      )}
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
