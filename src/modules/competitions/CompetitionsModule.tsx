import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import {
  Competition,
  CompetitionParticipant,
  CompetitionReward,
  CompetitionsDashboardKPIs
} from '../../types/competition.types';
import { CompetitionsDashboardTab } from './tabs/CompetitionsDashboardTab';
import { CompetitionsListTab } from './tabs/CompetitionsListTab';
import { RewardsManagementTab } from './tabs/RewardsManagementTab';
import { CompetitionDrawTab } from './tabs/CompetitionDrawTab';
import { CompetitionReportsTab } from './tabs/CompetitionReportsTab';
import { CompetitionWizardModal } from './CompetitionWizardModal';
import { CompetitionDetailsModal } from './CompetitionDetailsModal';
import { RewardDeliveryConfirmModal } from './RewardDeliveryConfirmModal';
import {
  Trophy,
  LayoutDashboard,
  Gift,
  Sparkles,
  FileText,
  ShieldAlert
} from 'lucide-react';

export type CompetitionsSubTab =
  | 'dashboard'
  | 'competitions_list'
  | 'rewards_management'
  | 'draw_center'
  | 'reports';

interface CompetitionsModuleProps {
  initialTab?: CompetitionsSubTab;
  defaultAudience?: 'customers' | 'dealers' | 'all';
}

export const CompetitionsModule: React.FC<CompetitionsModuleProps> = ({
  initialTab = 'dashboard',
  defaultAudience = 'all'
}) => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<CompetitionsSubTab>(initialTab);

  // Core data states
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [rewards, setRewards] = useState<CompetitionReward[]>([]);
  const [kpis, setKpis] = useState<CompetitionsDashboardKPIs>({
    activeCompetitionsCount: 0,
    finishedCompetitionsCount: 0,
    totalParticipantsCount: 0,
    totalPrizesCount: 0,
    deliveredRewardsValue: 0,
    pendingRewardsValue: 0,
    marketingCostTotal: 0,
    uniqueRewardedCustomersCount: 0,
    totalCampaignCost: 0
  });

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [competitionToEdit, setCompetitionToEdit] = useState<Competition | null>(null);

  const [selectedCompetitionForDetails, setSelectedCompetitionForDetails] = useState<Competition | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [selectedRewardForDelivery, setSelectedRewardForDelivery] = useState<CompetitionReward | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // Load and refresh all gamification data
  const loadData = useCallback(() => {
    try {
      db.syncAllActiveCompetitions();
      const comps = db.getCompetitions(true);
      const rews = db.getCompetitionRewards();
      const dashKpis = db.getCompetitionDashboardKPIs();

      setCompetitions(comps);
      setRewards(rews);
      setKpis(dashKpis);
    } catch (e) {
      console.error('Failed to load competitions data:', e);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Event Bus reactive listeners
    const unsubComp = eventBus.subscribe(SYSTEM_EVENTS.COMPETITIONS_UPDATED, loadData);
    const unsubDeliv = eventBus.subscribe(SYSTEM_EVENTS.COMPETITION_REWARD_DELIVERED, loadData);
    const unsubCancel = eventBus.subscribe(SYSTEM_EVENTS.COMPETITION_REWARD_CANCELLED, loadData);
    const unsubDraw = eventBus.subscribe(SYSTEM_EVENTS.COMPETITION_DRAW_EXECUTED, loadData);
    const unsubTicket = eventBus.subscribe(SYSTEM_EVENTS.TICKET_UPDATED, loadData);

    const onStorageOrTicket = () => loadData();
    window.addEventListener('tickets_updated', onStorageOrTicket);
    window.addEventListener('dealer_tickets_updated', onStorageOrTicket);
    window.addEventListener('storage', onStorageOrTicket);

    return () => {
      unsubComp();
      unsubDeliv();
      unsubCancel();
      unsubDraw();
      unsubTicket();
      window.removeEventListener('tickets_updated', onStorageOrTicket);
      window.removeEventListener('dealer_tickets_updated', onStorageOrTicket);
      window.removeEventListener('storage', onStorageOrTicket);
    };
  }, [loadData]);

  // Permissions security guard (Task 30 & 43)
  const canView = hasPermission('view_competitions');
  const canCreate = hasPermission('create_competition');
  const canEdit = hasPermission('edit_competition');
  const canDelete = hasPermission('delete_competition');
  const canDeliver = hasPermission('deliver_rewards');
  const canCancel = hasPermission('cancel_rewards');
  const canDraw = hasPermission('run_draw');

  if (!canView) {
    return (
      <div className="p-8 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3" dir="rtl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
          عذرًا، ليس لديك صلاحية الوصول إلى نظام المسابقات والمكافآت
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          يرجى التواصل مع مدير النظام لمنحك صلاحية (View Competitions).
        </p>
      </div>
    );
  }

  // Handle Competition Save
  const handleSaveCompetition = (comp: Competition) => {
    if (!canCreate && !canEdit) {
      showToast('error', 'ممنوع', 'ليس لديك صلاحية إنشاء أو تعديل المسابقات.');
      return;
    }
    db.saveCompetition(comp, user);
    showToast('success', 'نجاح', `تم حفظ المسابقة [${comp.title}] بنجاح.`);
    loadData();
  };

  // Handle Competition Delete / Archive
  const handleDeleteCompetition = (comp: Competition) => {
    if (!canDelete) {
      showToast('error', 'ممنوع', 'ليس لديك صلاحية حذف المسابقات.');
      return;
    }
    const res = db.deleteCompetition(comp.id, user);
    if (res.success) {
      showToast('success', 'تم الإجراء', res.message || 'تم حذف المسابقة بنجاح.');
      loadData();
    } else {
      showToast('error', 'تعذر الحذف', res.message || 'حدث خطأ');
    }
  };

  // Handle Reward Delivery Execution
  const handleConfirmDelivery = async (rewardId: string) => {
    if (!canDeliver) {
      throw new Error('ليس لديك صلاحية تسليم واعتماد مكافآت المسابقات.');
    }
    const adminUser = user || { id: 'usr_admin', name: 'المدير العام', role: 'admin', department: 'الإدارة' };
    const res = db.deliverCompetitionReward(rewardId, adminUser);
    if (res.success) {
      showToast('success', 'مبروك!', 'تم تسليم المكافأة وخصم محفظة البضاعة وتوثيق المصروف التسويقي.');
      loadData();
    }
  };

  // Handle Reward Cancellation
  const handleCancelReward = (reward: CompetitionReward) => {
    if (!canCancel) {
      showToast('error', 'ممنوع', 'ليس لديك صلاحية إلغاء المكافآت.');
      return;
    }
    const reason = prompt('يرجى كتابة سبب إلغاء المكافأة:');
    if (reason === null) return;

    try {
      db.cancelCompetitionReward(reward.id, user || { id: 'usr_admin', name: 'المدير', role: 'admin' }, reason);
      showToast('success', 'تم الإلغاء', 'تم إلغاء المكافأة وتوثيق ذلك في سجل النشاط.');
      loadData();
    } catch (e: any) {
      showToast('error', 'خطأ', e.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {defaultAudience === 'dealers' && (
        <div className="flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-2 font-bold text-xs">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>نظام المسابقات والمكافآت — قسم التجار والموزعين (B2B Gamification & Rewards)</span>
          </div>
          <span className="text-[11px] bg-amber-500/20 px-2.5 py-0.5 rounded-full font-bold">
            قسم التجار والموزعين
          </span>
        </div>
      )}

      {/* Sub Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'dashboard'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>لوحة التحكم (Dashboard)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('competitions_list')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'competitions_list'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>سجل المسابقات ({competitions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rewards_management')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'rewards_management'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>إدارة الجوائز والمكافآت ({rewards.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('draw_center')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'draw_center'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>السحب العشوائي (Draw)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>التقارير التحليلية والمالية</span>
        </button>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'dashboard' && (
        <CompetitionsDashboardTab
          kpis={kpis}
          competitions={competitions}
          onOpenNewCompetitionModal={() => {
            setCompetitionToEdit(null);
            setIsWizardOpen(true);
          }}
          onSelectCompetition={comp => {
            setSelectedCompetitionForDetails(comp);
            setIsDetailsOpen(true);
          }}
          onNavigateTab={tab => setActiveTab(tab as CompetitionsSubTab)}
        />
      )}

      {activeTab === 'competitions_list' && (
        <CompetitionsListTab
          competitions={competitions}
          initialAudienceFilter={defaultAudience}
          onOpenNewModal={() => {
            setCompetitionToEdit(null);
            setIsWizardOpen(true);
          }}
          onSelectCompetition={comp => {
            setSelectedCompetitionForDetails(comp);
            setIsDetailsOpen(true);
          }}
          onEditCompetition={comp => {
            setCompetitionToEdit(comp);
            setIsWizardOpen(true);
          }}
          onDeleteCompetition={handleDeleteCompetition}
          onOpenDrawModal={comp => {
            setActiveTab('draw_center');
          }}
        />
      )}

      {activeTab === 'rewards_management' && (
        <RewardsManagementTab
          rewards={rewards}
          onOpenDeliveryModal={rew => {
            setSelectedRewardForDelivery(rew);
            setIsDeliveryModalOpen(true);
          }}
          onCancelReward={handleCancelReward}
        />
      )}

      {activeTab === 'draw_center' && (
        <CompetitionDrawTab
          competitions={competitions}
          onDrawComplete={loadData}
        />
      )}

      {activeTab === 'reports' && (
        <CompetitionReportsTab
          competitions={competitions}
          rewards={rewards}
        />
      )}

      {/* Modal 1: Competition Wizard */}
      <CompetitionWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        competitionToEdit={competitionToEdit}
        onCompetitionSaved={handleSaveCompetition}
      />

      {/* Modal 2: Competition Details Inspector */}
      <CompetitionDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        competition={selectedCompetitionForDetails}
        onOpenDrawModal={() => setActiveTab('draw_center')}
        onDeliverReward={rew => {
          setSelectedRewardForDelivery(rew);
          setIsDeliveryModalOpen(true);
        }}
      />

      {/* Modal 3: Reward Delivery Confirmation Modal */}
      <RewardDeliveryConfirmModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        reward={selectedRewardForDelivery}
        onConfirmDelivery={handleConfirmDelivery}
      />
    </div>
  );
};
