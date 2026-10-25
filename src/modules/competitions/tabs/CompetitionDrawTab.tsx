import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Competition, CompetitionParticipant, CompetitionReward } from '../../../types/competition.types';
import { db } from '../../../database/db';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import {
  Sparkles,
  Trophy,
  Users,
  Gift,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Check,
  ShieldCheck,
  Award
} from 'lucide-react';

interface CompetitionDrawTabProps {
  competitions: Competition[];
  onDrawComplete: () => void;
}

export const CompetitionDrawTab: React.FC<CompetitionDrawTabProps> = ({
  competitions,
  onDrawComplete
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Filter competitions that support draw
  const drawCompetitions = useMemo(() => {
    return competitions.filter(c => c.type === 'recharge_draw' || c.type === 'custom');
  }, [competitions]);

  const [selectedCompId, setSelectedCompId] = useState<string>(() => {
    return drawCompetitions[0]?.id || '';
  });

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinName, setSpinName] = useState('...');
  const [drawResult, setDrawResult] = useState<any | null>(null);

  const activeCompetition = useMemo(() => {
    return drawCompetitions.find(c => c.id === selectedCompId);
  }, [drawCompetitions, selectedCompId]);

  const participants = useMemo(() => {
    if (!activeCompetition) return [];
    return db.getCompetitionParticipants(activeCompetition.id);
  }, [activeCompetition]);

  const eligibleParticipants = useMemo(() => {
    return participants.filter(p => p.isEligible);
  }, [participants]);

  const handleStartDraw = async () => {
    if (!activeCompetition) return;
    if (activeCompetition.isDrawExecuted) {
      showToast('error', 'تنبيه', 'تم تنفيذ السحب لهذه المسابقة مسبقًا، ولا يمكن تكرار السحب لنفس الجولة.');
      return;
    }

    if (eligibleParticipants.length === 0) {
      showToast('error', 'تنبيه', 'لا يوجد مشاركون مؤهلون في هذه المسابقة لإجراء السحب.');
      return;
    }

    setIsSpinning(true);
    setDrawResult(null);

    // Dynamic Visual Shuffle Effect
    let counter = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * eligibleParticipants.length);
      setSpinName(eligibleParticipants[randomIdx]?.entityName || '...');
      counter++;
      if (counter > 25) {
        clearInterval(interval);
        try {
          const res = db.runCompetitionDraw(activeCompetition.id, user || { id: 'usr_admin', name: 'المدير العام', role: 'admin' });
          setDrawResult(res);
          showToast('success', 'مبروك!', `تم تنفيذ السحب وتحديد ${res.winners.length} فائزين بنجاح.`);
          onDrawComplete();
        } catch (err: any) {
          showToast('error', 'خطأ', err.message);
        } finally {
          setIsSpinning(false);
        }
      }
    }, 80);
  };

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-500/20 via-indigo-500/15 to-transparent border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              <Sparkles className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                حلبة السحب العشوائي الإلكتروني (Random Draw Arena)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                سحب عادل، مشفر، غير قابل للتكرار، مع تجميد قائمة المشاركين وتوثيق النتائج في سجل النشاط
              </p>
            </div>
          </div>
        </div>

        {/* Competition Selector */}
        <div className="w-full sm:w-72">
          <label className="block text-[11px] font-bold text-zinc-500 mb-1">اختر مسابقة السحب:</label>
          <select
            className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-zinc-100"
            value={selectedCompId}
            onChange={e => {
              setSelectedCompId(e.target.value);
              setDrawResult(null);
            }}
          >
            {drawCompetitions.map(c => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!activeCompetition ? (
        <Card className="p-10 text-center text-zinc-400">
          لا توجد مسابقات سحب مسجلة حالياً
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Stats & Draw Controls */}
          <div className="space-y-4">
            <Card className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-500">حالة المسابقة</span>
                <Badge variant={activeCompetition.isDrawExecuted ? 'default' : 'success'}>
                  {activeCompetition.isDrawExecuted ? 'تم السحب مسبقاً' : 'جاهزة للسحب'}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60">
                  <span className="text-zinc-500">إجمالي المشاركين:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{participants.length}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">المؤهلون للسحب:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{eligibleParticipants.length}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">الجوائز المتاحة:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{activeCompetition.prizes.length}</span>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {activeCompetition.isDrawExecuted ? (
                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-center text-xs text-zinc-500 font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>تم تنفيذ السحب بنجاح لهذه الجولة</span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleStartDraw}
                    disabled={isSpinning || eligibleParticipants.length === 0}
                    className="w-full py-3.5 text-sm font-black gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-lg shadow-purple-500/25"
                  >
                    {isSpinning ? (
                      <span className="animate-pulse">جاري السحب العشوائي...</span>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>بدء السحب الإلكتروني (Start Draw)</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>

            {/* Cryptographic Fairness Guarantee */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>ضمان النزاهة والتوثيق المالي:</span>
              </div>
              <p>
                يتم استخراج الأرقام العشوائية باستخدام مولد التشفير الآمن (Cryptographically Secure Random Buffer)،
                مع حفظ لقطة تجميد تاريخية للمشاركين لحظة السحب وتوثيق Draw ID فريد.
              </p>
            </div>
          </div>

          {/* Right Panel: Roulette Stage / Winners Showcase */}
          <div className="lg:col-span-2">
            <Card className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[380px] flex flex-col justify-between">
              {/* Spinner Area */}
              {isSpinning && (
                <div className="my-auto text-center space-y-4 animate-fade-in py-10">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center animate-spin text-white">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <div className="text-xl font-black text-purple-600 dark:text-purple-400">
                    {spinName}
                  </div>
                  <span className="text-xs text-zinc-400">
                    جاري خلط التذاكر وتحديد الفائزين بنزاهة تامة...
                  </span>
                </div>
              )}

              {/* Results Showcase */}
              {!isSpinning && drawResult && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-center text-sm flex items-center justify-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <span>مبروك للفائزين بالسحب العشوائي! (معرف السحب: {drawResult.drawRecord.id})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {drawResult.drawRecord.winners.map((win: any, idx: number) => (
                      <div
                        key={win.participantId}
                        className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-black text-amber-500">
                            {idx === 0 ? '🥇 الفائز الأول' : idx === 1 ? '🥈 الفائز الثاني' : '🥉 الفائز الثالث'}
                          </span>
                          <Badge variant="warning">فائز مؤكد</Badge>
                        </div>

                        <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {win.name}
                        </div>
                        <div className="text-xs font-mono text-zinc-500">
                          {win.phone}
                        </div>

                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs font-bold text-orange-500">
                          🎁 الجائزة: {win.prizeName}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-[11px] text-zinc-500 text-center">
                    تم إنشاء سجلات الجوائز المستحقة في قسم المكافآت بحالة (Pending). يمكنك الانتقال لاعتماد التسليم وخصم المحفظة.
                  </div>
                </div>
              )}

              {/* Default Preview Stage */}
              {!isSpinning && !drawResult && (
                <div className="my-auto text-center space-y-3 py-10">
                  <Trophy className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto" />
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                    منصة السحب جاهزة
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                    اضغط على زر "بدء السحب الإلكتروني" لبدء عملية الاختيار العشوائي الآلي بين {eligibleParticipants.length} مشارك مؤهل.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
