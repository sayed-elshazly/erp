import React, { useState, useMemo } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import {
  Competition,
  CompetitionParticipant,
  CompetitionReward
} from '../../types/competition.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  Trophy,
  Users,
  Gift,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Receipt,
  FileText,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Eye,
  Check,
  RotateCcw
} from 'lucide-react';

interface CompetitionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  competition: Competition | null;
  onOpenDrawModal?: (comp: Competition) => void;
  onDeliverReward?: (reward: CompetitionReward) => void;
}

export const CompetitionDetailsModal: React.FC<CompetitionDetailsModalProps> = ({
  isOpen,
  onClose,
  competition,
  onOpenDrawModal,
  onDeliverReward
}) => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useNotifications();

  const [activeSubTab, setActiveSubTab] = useState<'participants' | 'leaderboard' | 'prizes' | 'proofs' | 'financial'>('participants');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEligibility, setFilterEligibility] = useState<'all' | 'eligible' | 'not_eligible' | 'winners'>('all');
  const [selectedProofParticipant, setSelectedProofParticipant] = useState<CompetitionParticipant | null>(null);
  const [proofReviewNotes, setProofReviewNotes] = useState('');

  if (!isOpen || !competition) return null;

  // Real-time synchronization of participants with live tickets
  db.syncCompetitionParticipants(competition.id);
  const participants = db.getCompetitionParticipants(competition.id);
  const rewards = db.getCompetitionRewards().filter(r => r.competitionId === competition.id);

  // Filtered Participants
  const filteredParticipants = participants.filter(p => {
    if (filterEligibility === 'eligible' && !p.isEligible) return false;
    if (filterEligibility === 'not_eligible' && p.isEligible) return false;
    if (filterEligibility === 'winners' && !p.isWinner) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.entityName.toLowerCase().includes(q);
      const matchPhone = p.entityPhone.includes(q);
      if (!matchName && !matchPhone) return false;
    }
    return true;
  });

  // Top Spenders Leaderboard sorted by total recharge
  const leaderboard = [...participants].sort((a, b) => b.totalRechargeAmount - a.totalRechargeAmount);

  // Social Proofs
  const pendingProofs = participants.filter(p => p.socialVerificationStatus === 'pending');

  const handleVerifyProof = (participantId: string, status: 'approved' | 'rejected') => {
    try {
      db.verifyCompetitionSocialProof(participantId, status, proofReviewNotes, user || { id: 'usr_admin', name: 'المدير', role: 'admin' });
      showToast('success', 'تم التوثيق', `تم ${status === 'approved' ? 'اعتماد' : 'رفض'} المشاركة بنجاح.`);
      setSelectedProofParticipant(null);
      setProofReviewNotes('');
    } catch (e: any) {
      showToast('error', 'خطأ', e.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تفاصيل المسابقة: ${competition.title}`}
      maxWidth="4xl"
    >
      <div className="space-y-5 text-right" dir="rtl">
        {/* Banner Overview */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border border-orange-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={competition.status === 'active' ? 'success' : 'default'}>
                {competition.status}
              </Badge>
              <span className="text-xs text-zinc-500 font-mono">#{competition.code}</span>
            </div>
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100 mt-1">
              {competition.title}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-xl">
              {competition.description || 'مسابقة تسويقية تفاعلية'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {competition.type === 'recharge_draw' && !competition.isDrawExecuted && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onOpenDrawModal?.(competition);
                }}
                className="gap-2 text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              >
                <Sparkles className="w-4 h-4" />
                <span>إجراء السحب الإلكتروني (Draw)</span>
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('participants')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'participants'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>المشاركون ({participants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('leaderboard')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'leaderboard'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>لوحة المتصدرين (Leaderboard)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('prizes')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'prizes'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>الجوائز والمكافآت ({competition.prizes.length})</span>
          </button>

          {(competition.type === 'speed' || competition.type === 'interactive') && (
            <button
              type="button"
              onClick={() => setActiveSubTab('proofs')}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'proofs'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>مراجعة التوثيقات ({pendingProofs.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveSubTab('financial')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'financial'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>المركز المالي للمسابقة</span>
          </button>
        </div>

        {/* SUB-TAB 1: PARTICIPANTS */}
        {activeSubTab === 'participants' && (
          <div className="space-y-3 animate-fade-in">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
                <Input
                  placeholder="بحث باسم العميل أو رقم الهاتف..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pr-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                {(['all', 'eligible', 'not_eligible', 'winners'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilterEligibility(f)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      filterEligibility === f
                        ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {f === 'all' && 'الكل'}
                    {f === 'eligible' && 'المؤهلون'}
                    {f === 'not_eligible' && 'قيد التقدم'}
                    {f === 'winners' && 'الفائزون'}
                  </button>
                ))}
              </div>
            </div>

            {/* Participants Table */}
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-right text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="p-3">المشارك</th>
                    <th className="p-3">رقم الهاتف</th>
                    <th className="p-3 text-center">التقدم نحو الهدف</th>
                    <th className="p-3 text-center">عدد الشحنات</th>
                    <th className="p-3 text-center">إجمالي الشحن</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-center">الجائزة المستحقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-400">
                        لا يوجد مشاركون يطابقون خيارات البحث الحالية
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map(p => {
                      // Progress Calculation for 10-recharge competition (Task 16)
                      const targetCount = 10;
                      const progressPct = Math.min(100, Math.round((p.rechargeCount / targetCount) * 100));

                      return (
                        <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                          <td className="p-3">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100">
                              {p.entityName}
                            </div>
                            <span className="text-[10px] text-zinc-400">
                              انضم: {formatDateTime(p.joinedAt)}
                            </span>
                          </td>

                          <td className="p-3 font-mono text-zinc-500">
                            {p.entityPhone}
                          </td>

                          {/* Progress Bar (Task 16) */}
                          <td className="p-3 text-center w-48">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                                <span>{p.rechargeCount} / {targetCount}</span>
                                <span>{p.rechargeCount >= targetCount ? '🎁 مؤهل للمكافأة' : `متبقي ${Math.max(0, targetCount - p.rechargeCount)}`}</span>
                              </div>
                              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    p.rechargeCount >= targetCount
                                      ? 'bg-emerald-500'
                                      : 'bg-orange-500'
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="p-3 text-center font-bold">
                            {p.rechargeCount}
                          </td>

                          <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(p.totalRechargeAmount)}
                          </td>

                          <td className="p-3 text-center">
                            {p.isWinner ? (
                              <Badge variant="success">🏆 فائز</Badge>
                            ) : p.isEligible ? (
                              <Badge variant="warning">⭐ مؤهل</Badge>
                            ) : (
                              <Badge variant="default">قيد التقدم</Badge>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {p.assignedPrizeName ? (
                              <span className="font-bold text-orange-500 text-[11px]">
                                {p.assignedPrizeName}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: LEADERBOARD (Task 15) */}
        {activeSubTab === 'leaderboard' && (
          <div className="space-y-3 animate-fade-in">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span>لوحة ترتيب المتصدرين مبنية بالكامل على بيانات الشحن الفعلية والمحققة بالتذاكر (Real Transactions)</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-right text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="p-3 text-center w-16">الترتيب</th>
                    <th className="p-3">العميل / التاجر</th>
                    <th className="p-3 text-center">عدد الشحنات</th>
                    <th className="p-3 text-center">إجمالي الشحن المكتمل</th>
                    <th className="p-3 text-center">الجائزة التقديرية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {leaderboard.map((p, idx) => (
                    <tr
                      key={p.id}
                      className={
                        idx === 0
                          ? 'bg-amber-500/10 font-bold'
                          : idx === 1
                          ? 'bg-zinc-200/50 dark:bg-zinc-800/50'
                          : idx === 2
                          ? 'bg-orange-500/5'
                          : ''
                      }
                    >
                      <td className="p-3 text-center">
                        {idx === 0 ? (
                          <span className="text-base">🥇</span>
                        ) : idx === 1 ? (
                          <span className="text-base">🥈</span>
                        ) : idx === 2 ? (
                          <span className="text-base">🥉</span>
                        ) : (
                          <span className="text-zinc-500 font-mono">#{idx + 1}</span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{p.entityName}</div>
                        <span className="text-[10px] text-zinc-400 font-mono">{p.entityPhone}</span>
                      </td>

                      <td className="p-3 text-center font-bold">{p.rechargeCount}</td>

                      <td className="p-3 text-center font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(p.totalRechargeAmount)}
                      </td>

                      <td className="p-3 text-center">
                        {p.assignedPrizeName ? (
                          <span className="font-bold text-orange-500">{p.assignedPrizeName}</span>
                        ) : idx === 0 ? (
                          <span className="font-bold text-amber-500">جائزة المركز الأول</span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: PRIZES & REWARDS */}
        {activeSubTab === 'prizes' && (
          <div className="space-y-3 animate-fade-in text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {competition.prizes.map((pz, idx) => (
                <div
                  key={pz.id}
                  className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-orange-500 flex items-center gap-1.5">
                      <Gift className="w-4 h-4" />
                      {pz.name}
                    </span>
                    <Badge variant="orange">{pz.type}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-zinc-500 text-[11px] pt-1">
                    <div>
                      القيمة: <span className="font-bold text-zinc-800 dark:text-zinc-200">{pz.value} {pz.currency}</span>
                    </div>
                    <div>
                      التكلفة التسويقية: <span className="font-bold text-rose-500">{formatCurrency(pz.costEGP)}</span>
                    </div>
                    <div>
                      المحفظة المصدر: <span className="font-bold text-zinc-800 dark:text-zinc-200">{pz.sourceWalletName || 'محفظة النظام'}</span>
                    </div>
                    <div>
                      المنتج: <span className="font-bold text-zinc-800 dark:text-zinc-200">{pz.productName || 'مباشر'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 4: SOCIAL / STORY PROOFS (Task 18) */}
        {activeSubTab === 'proofs' && (
          <div className="space-y-3 animate-fade-in text-xs">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>مراجعة وتوثيق سكرين شوت مشاهدة الستوري أو التفاعل الاجتماعي (Manual Verification)</span>
            </div>

            <div className="space-y-2">
              {pendingProofs.length === 0 ? (
                <div className="p-6 text-center text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  لا توجد طلبات توثيق معلقة حاليًا
                </div>
              ) : (
                pendingProofs.map(p => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{p.entityName}</div>
                      <div className="text-[11px] text-zinc-500">{p.entityPhone} • انضم: {formatDateTime(p.joinedAt)}</div>
                      {p.socialProofNote && (
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-300 italic">
                          "{p.socialProofNote}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {p.socialProofUrl && (
                        <a
                          href={p.socialProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center gap-1.5 hover:bg-zinc-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة الإثبات</span>
                        </a>
                      )}

                      <Button
                        variant="primary"
                        onClick={() => handleVerifyProof(p.id, 'approved')}
                        className="h-8 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>اعتماد وتأهيل</span>
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => handleVerifyProof(p.id, 'rejected')}
                        className="h-8 text-xs text-red-500 hover:bg-red-500/10"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>رفض</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 5: FINANCIAL & COST REPORT */}
        {activeSubTab === 'financial' && (
          <div className="space-y-4 animate-fade-in text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-400 text-[11px]">ميزانية الحملة المقدرة</span>
                <div className="text-lg font-black text-zinc-900 dark:text-zinc-100 mt-1">
                  {formatCurrency(competition.totalMarketingCost)}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-rose-500 font-bold text-[11px]">التكلفة المنفذة والمسلمة</span>
                <div className="text-lg font-black text-rose-500 mt-1">
                  {formatCurrency(
                    rewards.filter(r => r.status === 'delivered').reduce((s, r) => s + r.costEGP, 0)
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-500 font-bold text-[11px]">التكلفة المعلقة (Pending)</span>
                <div className="text-lg font-black text-amber-500 mt-1">
                  {formatCurrency(
                    rewards.filter(r => r.status === 'pending').reduce((s, r) => s + r.costEGP, 0)
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              💡 <strong>ملحوظة محاسبية:</strong> يتم ترحيل كافة تكاليف الجوائز المسلمة إلى شجرة المصروفات في المالية
              تحت بند <span className="font-bold text-zinc-800 dark:text-zinc-200">Marketing Expenses → Competition Rewards</span>
              وتخصم من محفظة البضاعة دون أي تأثير على أرباح مبيعات التذاكر.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
