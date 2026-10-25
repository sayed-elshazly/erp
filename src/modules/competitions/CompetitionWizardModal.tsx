import React, { useState, useMemo } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import {
  Competition,
  CompetitionType,
  CompetitionStatus,
  TargetAudienceType,
  PrizeType,
  CompetitionPrize,
  CompetitionRuleCondition,
  ConditionType
} from '../../types/competition.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Trophy,
  Calendar,
  Clock,
  Sparkles,
  Users,
  Gift,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Wallet,
  Package,
  Layers,
  Zap,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface CompetitionWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitionToEdit?: Competition | null;
  onCompetitionSaved: (comp: Competition) => void;
}

export const CompetitionWizardModal: React.FC<CompetitionWizardModalProps> = ({
  isOpen,
  onClose,
  competitionToEdit,
  onCompetitionSaved
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // 5 Step Wizard
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CompetitionType>('recharge_count');
  const [status, setStatus] = useState<CompetitionStatus>('active');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endTime, setEndTime] = useState('23:59');

  // Step 2: Target Audience
  const [targetAudienceType, setTargetAudienceType] = useState<TargetAudienceType>('all_customers');

  // Step 3: Rules Engine
  const [ruleOperator, setRuleOperator] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<CompetitionRuleCondition[]>([
    {
      id: 'c_default',
      type: 'recharge_count',
      operator: 'gte',
      value: 10,
      label: 'إتمام 10 شحنات'
    }
  ]);

  // Step 4: Prize Builder
  const [prizes, setPrizes] = useState<CompetitionPrize[]>([
    {
      id: 'prz_1',
      name: 'شحن 1$ مجانًا',
      type: 'free_recharge',
      value: 1,
      currency: 'USD',
      costEGP: 50,
      quantityAvailable: 10
    }
  ]);
  const [maxWinners, setMaxWinners] = useState<number>(10);

  // Store Wallets & Games Tree for selects
  const storeWallets = useMemo(() => db.getStoreWallets(), [isOpen]);
  const gamesTree = useMemo(() => db.getGameTree(), [isOpen]);
  const allProducts = useMemo(() => {
    return gamesTree.flatMap(g => g.products || []);
  }, [gamesTree]);

  // Prepopulate if editing
  React.useEffect(() => {
    if (competitionToEdit) {
      setTitle(competitionToEdit.title);
      setDescription(competitionToEdit.description);
      setType(competitionToEdit.type);
      setStatus(competitionToEdit.status);
      setStartDate(competitionToEdit.startDate);
      setStartTime(competitionToEdit.startTime || '00:00');
      setEndDate(competitionToEdit.endDate);
      setEndTime(competitionToEdit.endTime || '23:59');
      setTargetAudienceType(competitionToEdit.targetAudience?.type || 'all_customers');
      setRuleOperator(competitionToEdit.rules?.logicalOperator || 'AND');
      setConditions(competitionToEdit.rules?.conditions || []);
      setPrizes(competitionToEdit.prizes || []);
      setMaxWinners(competitionToEdit.maxWinners || 10);
    } else {
      // Reset form
      setCurrentStep(1);
      setTitle('');
      setDescription('');
      setType('recharge_count');
      setStatus('active');
      setConditions([
        {
          id: 'c_default',
          type: 'recharge_count',
          operator: 'gte',
          value: 10,
          label: 'إتمام 10 شحنات'
        }
      ]);
      setPrizes([
        {
          id: 'prz_1',
          name: 'شحن 1$ مجانًا',
          type: 'free_recharge',
          value: 1,
          currency: 'USD',
          costEGP: 50,
          quantityAvailable: 10
        }
      ]);
    }
  }, [competitionToEdit, isOpen]);

  // Add new condition
  const handleAddCondition = () => {
    const newCond: CompetitionRuleCondition = {
      id: `c_${Date.now()}`,
      type: 'total_recharge_amount',
      operator: 'gte',
      value: 500,
      label: 'إجمالي الشحن 500 ج.م'
    };
    setConditions(prev => [...prev, newCond]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id));
  };

  // Add new prize
  const handleAddPrize = () => {
    const newPrize: CompetitionPrize = {
      id: `prz_${Date.now()}`,
      rankOrTier: prizes.length + 1,
      name: `جائزة المركز ${prizes.length + 1}`,
      type: 'wallet_credit',
      value: 100,
      currency: 'EGP',
      costEGP: 100,
      quantityAvailable: 1
    };
    setPrizes(prev => [...prev, newPrize]);
  };

  const handleRemovePrize = (id: string) => {
    setPrizes(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) {
      showToast('error', 'تنبيه', 'يرجى إدخال اسم المسابقة');
      setCurrentStep(1);
      return;
    }

    if (conditions.length === 0) {
      showToast('error', 'تنبيه', 'يرجى إضافة شرط واحد على الأقل في محرك الشروط');
      setCurrentStep(3);
      return;
    }

    if (prizes.length === 0) {
      showToast('error', 'تنبيه', 'يرجى إضافة جائزة واحدة على الأقل');
      setCurrentStep(4);
      return;
    }

    const totalEstimatedCost = prizes.reduce((sum, p) => sum + (Number(p.costEGP) || 0) * (p.quantityAvailable || 1), 0);

    const compToSave: Competition = {
      id: competitionToEdit?.id || `comp_${Date.now()}`,
      code: competitionToEdit?.code || `CMP-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title.trim(),
      description: description.trim(),
      type,
      status,
      startDate,
      startTime,
      endDate,
      endTime,
      targetAudience: {
        type: targetAudienceType
      },
      rules: {
        id: `rule_${Date.now()}`,
        logicalOperator: ruleOperator,
        conditions
      },
      prizes,
      maxWinners,
      totalMarketingCost: totalEstimatedCost,
      createdAt: competitionToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: user?.id || 'usr_admin',
      createdByName: user?.fullName || 'المدير العام'
    };

    onCompetitionSaved(compToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={competitionToEdit ? `تعديل المسابقة: ${competitionToEdit.title}` : 'معالج إنشاء مسابقة جديدة (Wizard)'}
      maxWidth="4xl"
    >
      <div className="space-y-6 text-right" dir="rtl">
        {/* Step Indicator */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
          {[
            { step: 1, label: 'البيانات الأساسية' },
            { step: 2, label: 'النوع والجمهور' },
            { step: 3, label: 'محرك الشروط' },
            { step: 4, label: 'بناء الجوائز' },
            { step: 5, label: 'المراجعة والحفظ' }
          ].map(s => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step)}
              className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg transition-all ${
                currentStep === s.step
                  ? 'bg-orange-500 text-white shadow-md'
                  : currentStep > s.step
                  ? 'text-emerald-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === s.step ? 'bg-white text-orange-600' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
              }`}>
                {s.step}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* STEP 1: Basic Info & Schedule */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-500 font-bold">
              الخطوة 1: تحديد اسم المسابقة وتاريخ البداية والنهاية وحالة الحملة
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                اسم المسابقة *
              </label>
              <Input
                placeholder="مثال: تحدي شحن 10 مرات لشهر سبتمبر"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                الوصف وشروط المشاركة
              </label>
              <textarea
                className="w-full h-20 p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                placeholder="شرح بسيط وواضح للعملاء عن كيفية الفوز واستلام الجوائز..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  تاريخ ووقت البداية *
                </label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-28"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  تاريخ ووقت النهاية *
                </label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-28"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                حالة المسابقة *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {(['active', 'scheduled', 'draft', 'paused', 'finished', 'archived', 'cancelled'] as CompetitionStatus[]).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`p-2 rounded-lg border text-center font-bold transition-all ${
                      status === st
                        ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
                    }`}
                  >
                    {st === 'active' && 'نشطة (Active)'}
                    {st === 'scheduled' && 'مجدولة (Scheduled)'}
                    {st === 'draft' && 'مسودة (Draft)'}
                    {st === 'paused' && 'متوقفة مؤقتاً (Paused)'}
                    {st === 'finished' && 'منتهية (Finished)'}
                    {st === 'archived' && 'مؤرشفة (Archived)'}
                    {st === 'cancelled' && 'ملغاة (Cancelled)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Competition Type & Target Audience */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-500 font-bold">
              الخطوة 2: اختيار نوع المسابقة وتحديد الجمهور المستهدف بدقة
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                نوع المسابقة (Competition Type) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { id: 'recharge_count', label: 'اشحن X مرات (Recharge Count)', desc: 'اشحن 10 مرات وخذ جائزة' },
                  { id: 'top_spenders', label: 'أكثر العملاء شحنًا (Top Spenders)', desc: 'ليدربورد وترتيب بحجم الشحن' },
                  { id: 'recharge_draw', label: 'سحب الشاحنين (Recharge Draw)', desc: 'اشحن وادخل السحب العشوائي' },
                  { id: 'referral', label: 'دعوة أصدقاء جدد (Referral)', desc: 'هات 3 عملاء جدد وخذ مكافأة' },
                  { id: 'speed', label: 'السرعة والستوري (Speed / Story)', desc: 'أول 10 يشوفوا الستوري ويوثقوا' },
                  { id: 'interactive', label: 'التفاعل مع المنشورات (Interactive)', desc: 'تفاعل مع البوست وخذ جائزة' },
                  { id: 'registration', label: 'تسجيل الرقم (Registration)', desc: 'سجل رقمنا في جهات الاتصال' },
                  { id: 'custom', label: 'مخصصة (Custom Flexible)', desc: 'بناء شروط مرنة حسب رغبة الإدارة' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id as CompetitionType)}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                      type === t.id
                        ? 'border-orange-500 bg-orange-500/10 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                    }`}
                  >
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{t.label}</span>
                    <span className="text-[11px] text-zinc-500 mt-1">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                الجمهور المستهدف (Target Audience) *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'all_customers', label: 'العملاء (Customers)' },
                  { id: 'merchants', label: 'التجار والموزعين (Merchants)' },
                  { id: 'both', label: '🎯 العملاء + التجار معاً (Both)' },
                  { id: 'new_customers', label: 'العملاء الجدد فقط' },
                  { id: 'existing_customers', label: 'العملاء الحاليين' },
                  { id: 'customer_level', label: 'حسب فئة الولاء VIP' }
                ].map(aud => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setTargetAudienceType(aud.id as TargetAudienceType)}
                    className={`p-2.5 rounded-lg border text-center font-bold transition-all ${
                      targetAudienceType === aud.id
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400'
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Rules Engine Builder */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="text-xs text-orange-500 font-bold">
                الخطوة 3: بناء الشروط التفاعلية (Rules Engine)
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">منطق الشروط:</span>
                <button
                  type="button"
                  onClick={() => setRuleOperator('AND')}
                  className={`px-3 py-1 rounded font-bold ${
                    ruleOperator === 'AND' ? 'bg-orange-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  AND (تحقق الكل)
                </button>
                <button
                  type="button"
                  onClick={() => setRuleOperator('OR')}
                  className={`px-3 py-1 rounded font-bold ${
                    ruleOperator === 'OR' ? 'bg-orange-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  OR (تحقق شرط واحد)
                </button>
              </div>
            </div>

            {/* Conditions List */}
            <div className="space-y-3">
              {conditions.map((cond, index) => (
                <div
                  key={cond.id}
                  className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                      شرط #{index + 1}
                    </span>
                    {conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(cond.id)}
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">نوع الشرط</label>
                      <select
                        className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                        value={cond.type}
                        onChange={e => {
                          const nType = e.target.value as ConditionType;
                          setConditions(prev =>
                            prev.map(c =>
                              c.id === cond.id
                                ? { ...c, type: nType, label: e.target.selectedOptions[0].text }
                                : c
                            )
                          );
                        }}
                      >
                        <option value="recharge_count">عدد الشحنات المكتملة (Recharge Count)</option>
                        <option value="min_recharge_amount">الحد الأدنى للشحنة الواحدة (Min Amount)</option>
                        <option value="total_recharge_amount">إجمالي قيمة الشحن (Total Amount)</option>
                        <option value="referral_count">عدد العملاء الجدد المحالين (Referrals)</option>
                        <option value="specific_product">شحن منتج معين (Specific Product)</option>
                        <option value="first_x_participants">أول X مشاركين (First X)</option>
                        <option value="story_view">مشاهدة الستوري وتوثيق السكرين شوت</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">القيمة المطلوبة</label>
                      <Input
                        type="number"
                        value={cond.value}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          setConditions(prev =>
                            prev.map(c => (c.id === cond.id ? { ...c, value: val } : c))
                          );
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">نص الشرط للعرض</label>
                      <Input
                        value={cond.label}
                        onChange={e => {
                          const lbl = e.target.value;
                          setConditions(prev =>
                            prev.map(c => (c.id === cond.id ? { ...c, label: lbl } : c))
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                onClick={handleAddCondition}
                className="w-full text-xs font-bold gap-2 border-dashed py-2.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة شرط جديد لمروحة الشروط</span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Reward Builder & Wallet Linkage */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-500 font-bold">
              الخطوة 4: بناء الجوائز وربطها بمحفظة البضاعة (Reward Builder)
            </div>

            <div className="space-y-3">
              {prizes.map((prize, pIdx) => (
                <div
                  key={prize.id}
                  className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-orange-500 flex items-center gap-1.5">
                      <Gift className="w-4 h-4" />
                      جائزة #{pIdx + 1}
                    </span>
                    {prizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePrize(prize.id)}
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">اسم الجائزة *</label>
                      <Input
                        value={prize.name}
                        onChange={e => {
                          const n = e.target.value;
                          setPrizes(prev => prev.map(p => (p.id === prize.id ? { ...p, name: n } : p)));
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">نوع الجائزة</label>
                      <select
                        className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                        value={prize.type}
                        onChange={e => {
                          const t = e.target.value as PrizeType;
                          setPrizes(prev => prev.map(p => (p.id === prize.id ? { ...p, type: t } : p)));
                        }}
                      >
                        <option value="free_recharge">شحن مجاني (Free Recharge)</option>
                        <option value="wallet_credit">رصيد محفظة نقدي (Wallet Credit)</option>
                        <option value="cashback">كاش باك إضافي (Cashback)</option>
                        <option value="discount">كوبون خصم (Discount)</option>
                        <option value="product_reward">منتج مجاني (Product Reward)</option>
                        <option value="custom_reward">مكافأة يدوية مخصصة</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">القيمة</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={prize.value}
                          onChange={e => {
                            const v = Number(e.target.value) || 0;
                            setPrizes(prev => prev.map(p => (p.id === prize.id ? { ...p, value: v } : p)));
                          }}
                        />
                        <select
                          className="w-20 p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold"
                          value={prize.currency}
                          onChange={e => {
                            const c = e.target.value as 'EGP' | 'USD';
                            setPrizes(prev => prev.map(p => (p.id === prize.id ? { ...p, currency: c } : p)));
                          }}
                        >
                          <option value="USD">USD</option>
                          <option value="EGP">EGP</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Wallet Linkage (Task 9) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        محفظة البضاعة المصدر (Source Wallet)
                      </label>
                      <select
                        className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                        value={prize.sourceWalletId || ''}
                        onChange={e => {
                          const wId = e.target.value;
                          const w = storeWallets.find(x => x.id === wId);
                          setPrizes(prev =>
                            prev.map(p =>
                              p.id === prize.id
                                ? { ...p, sourceWalletId: wId, sourceWalletName: w?.name }
                                : p
                            )
                          );
                        }}
                      >
                        <option value="">بدون خصم محفظة بضاعة</option>
                        {storeWallets.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} (رصيد: {w.balance} {w.currency})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        المنتج المرتبط بالجائزة
                      </label>
                      <select
                        className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                        value={prize.productId || ''}
                        onChange={e => {
                          const pId = e.target.value;
                          const prod = allProducts.find(x => x.id === pId);
                          setPrizes(prev =>
                            prev.map(p =>
                              p.id === prize.id
                                ? {
                                    ...p,
                                    productId: pId,
                                    productName: prod?.name,
                                    costEGP: prod ? prod.costPriceEGP || prod.costUSD * 50 : p.costEGP
                                  }
                                : p
                            )
                          );
                        }}
                      >
                        <option value="">اختر منتج من الكتالوج (اختياري)</option>
                        {allProducts.slice(0, 30).map(pr => (
                          <option key={pr.id} value={pr.id}>
                            {pr.name} ({pr.gameName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-rose-500 font-bold mb-1">
                        التكلفة التسويقية الفعلية (ج.م) *
                      </label>
                      <Input
                        type="number"
                        value={prize.costEGP}
                        onChange={e => {
                          const c = Number(e.target.value) || 0;
                          setPrizes(prev => prev.map(p => (p.id === prize.id ? { ...p, costEGP: c } : p)));
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                onClick={handleAddPrize}
                className="w-full text-xs font-bold gap-2 border-dashed py-2.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة جائزة جديدة للمسابقة</span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: Review & Confirm */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-fade-in text-xs">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold">
              الخطوة 5: مراجعة كافة بيانات المسابقة قبل الاعتماد والحفظ
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[11px]">اسم المسابقة</span>
                <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{title || '-'}</div>
                <div className="text-[11px] text-zinc-500">{description || 'لا يوجد وصف'}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-zinc-400 text-[11px]">الفترة الزمنية والحالة</span>
                <div className="font-bold text-zinc-900 dark:text-zinc-100">
                  {startDate} إلى {endDate}
                </div>
                <Badge variant={status === 'active' ? 'success' : 'warning'}>
                  {status}
                </Badge>
              </div>
            </div>

            {/* Rules Summary */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">الشروط المحددة ({ruleOperator}):</span>
              <div className="space-y-1">
                {conditions.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{c.label} (قيمة: {c.value})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prizes Summary */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">الجوائز المقررة ({prizes.length}):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {prizes.map(p => (
                  <div key={p.id} className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px]">
                    <div className="font-bold text-orange-500">{p.name}</div>
                    <div className="text-zinc-500 mt-0.5">
                      القيمة: {p.value} {p.currency} • التكلفة: {p.costEGP} ج.م
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="gap-2 text-xs"
              >
                <ArrowRight className="w-4 h-4" />
                <span>السابق</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} className="text-xs">
              إلغاء
            </Button>

            {currentStep < 5 ? (
              <Button
                variant="primary"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="gap-2 text-xs font-bold bg-orange-500 text-white"
              >
                <span>التالي</span>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSave}
                className="gap-2 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد وحفظ المسابقة</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
