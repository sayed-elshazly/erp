import { db } from '../../database/db';
import { eventBus, SYSTEM_EVENTS } from '../eventBus';
import {
  Competition,
  CompetitionParticipant,
  CompetitionReward,
  CompetitionDrawRecord,
  CompetitionsDashboardKPIs,
  CompetitionStatus,
  CompetitionType
} from '../../types/competition.types';
import {
  initialCompetitionsSeed,
  initialParticipantsSeed,
  initialRewardsSeed
} from './seedCompetitions';
import { CompetitionRulesEngine } from './competitionRulesEngine';
import { CompetitionDeliveryService, DeliveryExecutionResult } from './competitionDeliveryService';
import { CompetitionDrawService } from './competitionDrawService';

const STORAGE_KEYS = {
  COMPETITIONS: 'nzm_jkr_competitions',
  COMPETITION_PARTICIPANTS: 'nzm_jkr_competition_participants',
  COMPETITION_REWARDS: 'nzm_jkr_competition_rewards',
  COMPETITION_DRAWS: 'nzm_jkr_competition_draws'
};

const INIT_FLAG_KEY = 'nzm_jkr_competitions_initialized';

export class CompetitionService {
  private static ensureInitialized(): void {
    if (typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(INIT_FLAG_KEY)) {
      if (!localStorage.getItem(STORAGE_KEYS.COMPETITIONS)) {
        localStorage.setItem(STORAGE_KEYS.COMPETITIONS, JSON.stringify(initialCompetitionsSeed));
      }
      if (!localStorage.getItem(STORAGE_KEYS.COMPETITION_PARTICIPANTS)) {
        localStorage.setItem(STORAGE_KEYS.COMPETITION_PARTICIPANTS, JSON.stringify(initialParticipantsSeed));
      }
      if (!localStorage.getItem(STORAGE_KEYS.COMPETITION_REWARDS)) {
        localStorage.setItem(STORAGE_KEYS.COMPETITION_REWARDS, JSON.stringify(initialRewardsSeed));
      }
      if (!localStorage.getItem(STORAGE_KEYS.COMPETITION_DRAWS)) {
        localStorage.setItem(STORAGE_KEYS.COMPETITION_DRAWS, JSON.stringify([]));
      }
      localStorage.setItem(INIT_FLAG_KEY, 'true');
    }
  }

  private static getItem<T>(key: string, fallback: T): T {
    try {
      this.ensureInitialized();
      const data = localStorage.getItem(key);
      if (!data || data === 'null' || data === 'undefined') {
        localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
      }
      return JSON.parse(data);
    } catch {
      return fallback;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing to ${key}:`, e);
    }
  }

  public static wipeAllCompetitionsData(): void {
    this.setItem(STORAGE_KEYS.COMPETITIONS, []);
    this.setItem(STORAGE_KEYS.COMPETITION_PARTICIPANTS, []);
    this.setItem(STORAGE_KEYS.COMPETITION_REWARDS, []);
    this.setItem(STORAGE_KEYS.COMPETITION_DRAWS, []);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(INIT_FLAG_KEY, 'true');
    }
    eventBus.publish(SYSTEM_EVENTS.COMPETITIONS_UPDATED, null);
  }

  // =========================================================================
  // COMPETITIONS MANAGEMENT (Task 1, 2, 3, 34)
  // =========================================================================

  public static getCompetitions(includeArchived = false): Competition[] {
    const list = this.getItem<Competition[]>(STORAGE_KEYS.COMPETITIONS, []);
    return includeArchived ? list : list.filter(c => !c.isArchived && c.status !== 'archived');
  }

  public static getCompetitionById(id: string): Competition | undefined {
    return this.getCompetitions(true).find(c => c.id === id);
  }

  public static saveCompetition(competition: Competition, user?: { id: string; name: string; role: string }): Competition {
    const all = this.getCompetitions(true);
    const index = all.findIndex(c => c.id === competition.id);
    const isNew = index < 0;

    const compToSave: Competition = {
      ...competition,
      updatedAt: new Date().toISOString()
    };

    if (isNew) {
      compToSave.createdAt = new Date().toISOString();
      all.unshift(compToSave);
    } else {
      all[index] = compToSave;
    }

    this.setItem(STORAGE_KEYS.COMPETITIONS, all);

    if (user) {
      db.logAction(
        user,
        isNew ? 'add' : 'edit',
        'competition',
        compToSave.id,
        `${isNew ? 'إنشاء' : 'تعديل'} مسابقة: ${compToSave.title}`,
        `تم ${isNew ? 'إنشاء المسابقة الجديدة' : 'تحديث إعدادات المسابقة'} (${compToSave.title}) بنوع [${compToSave.type}] وحالة [${compToSave.status}].`,
        isNew ? null : all[index],
        compToSave
      );
    }
    eventBus.publish(SYSTEM_EVENTS.COMPETITIONS_UPDATED, compToSave);

    if (compToSave.status === 'finished') {
      try {
        this.syncCompetitionParticipants(compToSave.id);
      } catch (e) {}
    }

    return compToSave;
  }

  /**
   * Safe Delete / Edit Protection (Task 34)
   * Hard delete is prohibited if winners, delivered rewards, or financial expenses exist.
   * Uses archive / cancel instead.
   */
  public static deleteCompetition(id: string, user: { id: string; name: string; role: string }): { success: boolean; message?: string } {
    const all = this.getCompetitions(true);
    const comp = all.find(c => c.id === id);
    if (!comp) return { success: false, message: 'المسابقة غير موجودة.' };

    const rewards = this.getRewards().filter(r => r.competitionId === id);
    const hasDelivered = rewards.some(r => r.status === 'delivered');
    const participants = this.getParticipants().filter(p => p.competitionId === id);
    const hasWinners = participants.some(p => p.isWinner);

    if (hasDelivered || hasWinners || comp.isDrawExecuted) {
      // Soft delete / Archive instead
      comp.status = 'archived';
      comp.isArchived = true;
      comp.updatedAt = new Date().toISOString();
      this.setItem(STORAGE_KEYS.COMPETITIONS, all);

      db.logAction(
        user,
        'archive',
        'competition',
        comp.id,
        `أرشفة مسابقة مرتبطة بعمليات: ${comp.title}`,
        'تم أرشفة المسابقة بدلاً من الحذف النهائي للحفاظ على سلامة القيود والجوائز المسلمة والسجلات المالية.',
        null,
        { status: 'archived' }
      );

      eventBus.publish(SYSTEM_EVENTS.COMPETITIONS_UPDATED);
      return {
        success: true,
        message: 'تمت أرشفة المسابقة بنجاح حفاظاً على القيود المالية والجوائز الممنوحة.'
      };
    }

    // Otherwise safe to hard delete clean draft / unused competitions
    const filtered = all.filter(c => c.id !== id);
    this.setItem(STORAGE_KEYS.COMPETITIONS, filtered);

    db.logAction(
      user,
      'delete',
      'competition',
      id,
      `حذف مسابقة: ${comp.title}`,
      `تم حذف المسابقة المسودة/غير المنفذة (${comp.title}) بنجاح.`,
      comp,
      null
    );

    eventBus.publish(SYSTEM_EVENTS.COMPETITIONS_UPDATED);
    return { success: true };
  }

  // =========================================================================
  // PARTICIPANTS TRACKING & RULES EVALUATION (Task 13, 15, 16, 17, 18)
  // =========================================================================

  public static getParticipants(competitionId?: string): CompetitionParticipant[] {
    const all = this.getItem<CompetitionParticipant[]>(STORAGE_KEYS.COMPETITION_PARTICIPANTS, []);
    if (competitionId) {
      return all.filter(p => p.competitionId === competitionId);
    }
    return all;
  }

  public static saveParticipant(participant: CompetitionParticipant): void {
    const all = this.getParticipants();
    const index = all.findIndex(p => p.id === participant.id || (p.competitionId === participant.competitionId && p.entityId === participant.entityId));
    if (index >= 0) {
      all[index] = { ...all[index], ...participant };
    } else {
      all.unshift(participant);
    }
    this.setItem(STORAGE_KEYS.COMPETITION_PARTICIPANTS, all);
  }

  /**
   * Automatically synchronizes all participants against real completed tickets
   */
  public static syncCompetitionParticipants(competitionId: string): void {
    const comp = this.getCompetitionById(competitionId);
    if (!comp) return;

    const customers = db.getCustomers();
    const dealers = db.getDealers();
    const allTickets = [...db.getTickets(), ...db.getDealerTickets()];
    const participants = this.getParticipants(competitionId);

    const compStart = new Date(`${comp.startDate}T${comp.startTime || '00:00'}:00`).getTime();
    const compEnd = new Date(`${comp.endDate}T${comp.endTime || '23:59'}:59`).getTime();

    const audienceType = typeof comp.targetAudience === 'string'
      ? comp.targetAudience
      : (comp.targetAudience?.type || 'all_customers');
    const isCustomerEligible = [
      'all_customers',
      'selected_customers',
      'new_customers',
      'existing_customers',
      'customer_level',
      'both',
      'all',
      'custom_group'
    ].includes(audienceType);

    const isDealerEligible = [
      'merchants',
      'selected_merchants',
      'dealers',
      'both',
      'all',
      'custom_group'
    ].includes(audienceType);

    const autoEnrollTypes = ['recharge_count', 'top_spenders', 'speed', 'milestone', 'tickets_count'];
    const isAutoEnrollComp = autoEnrollTypes.includes(comp.type);

    // 1. Synchronize Customers (if audience includes customers)
    if (isCustomerEligible) {
      customers.forEach(cust => {
        if (
          audienceType === 'selected_customers' &&
          comp.targetAudience.selectedIds &&
          !comp.targetAudience.selectedIds.includes(cust.id)
        ) {
          return;
        }

        // For non-auto-enroll competitions (like lucky_draw, interactive, registration), only sync existing participants
        if (!isAutoEnrollComp && !participants.some(p => p.entityId === cust.id)) {
          return;
        }

        const custTickets = allTickets.filter(t => {
          if (t.customerId !== cust.id && t.customerPhone !== cust.phone) return false;
          if (t.status !== 'completed') return false;
          const tTime = new Date(t.createdAt).getTime();
          return tTime >= compStart && tTime <= compEnd;
        });

        if (custTickets.length === 0 && !participants.some(p => p.entityId === cust.id)) {
          return; // Don't bloat unless active
        }

        let p = participants.find(x => x.entityId === cust.id);
        const isNew = !p;
        if (!p) {
          p = {
            id: `part_${Date.now()}_${cust.id.slice(-4)}`,
            competitionId: comp.id,
            entityType: 'customer',
            entityId: cust.id,
            entityName: cust.name,
            entityPhone: cust.phone,
            joinedAt: new Date().toISOString(),
            entriesCount: custTickets.length || 1,
            rechargeCount: custTickets.length,
            totalRechargeAmount: custTickets.reduce((s, t) => s + (t.receivedAmount || t.requiredAmount || 0), 0),
            qualifyingTransactionIds: custTickets.map(t => t.id),
            isEligible: false,
            isWinner: false
          };
        } else {
          p.rechargeCount = custTickets.length;
          p.totalRechargeAmount = custTickets.reduce((s, t) => s + (t.receivedAmount || t.requiredAmount || 0), 0);
          p.qualifyingTransactionIds = custTickets.map(t => t.id);
        }

        // Evaluate Rules
        const evalRes = CompetitionRulesEngine.evaluateCompetition(comp, {
          customer: cust,
          tickets: custTickets,
          participant: p,
          currentParticipantsCount: participants.length
        });

        p.isEligible = evalRes.isEligible;
        p.entriesCount = Math.max(1, p.rechargeCount);

        if (isNew) {
          participants.unshift(p);
        } else {
          const idx = participants.findIndex(x => x.id === p!.id);
          if (idx >= 0) participants[idx] = p;
        }
      });
    }

    // 2. Synchronize Wholesale Dealers (if audience includes merchants/dealers)
    if (isDealerEligible) {
      dealers.forEach(d => {
        if (
          audienceType === 'selected_merchants' &&
          comp.targetAudience.selectedIds &&
          !comp.targetAudience.selectedIds.includes(d.id)
        ) {
          return;
        }

        // For non-auto-enroll competitions (like lucky_draw, interactive, registration), only sync existing participants
        if (!isAutoEnrollComp && !participants.some(p => p.entityId === d.id)) {
          return;
        }

        const dealerTickets = allTickets.filter(t => {
          if ((t as any).dealerId !== d.id && t.customerId !== d.id && (t as any).dealerPhone !== d.phone && t.customerPhone !== d.phone) return false;
          if (t.status !== 'completed') return false;
          const tTime = new Date(t.createdAt).getTime();
          return tTime >= compStart && tTime <= compEnd;
        });

        if (dealerTickets.length === 0 && !participants.some(p => p.entityId === d.id)) {
          return;
        }

        let p = participants.find(x => x.entityId === d.id);
        const isNew = !p;
        if (!p) {
          p = {
            id: `part_${Date.now()}_${d.id.slice(-4)}`,
            competitionId: comp.id,
            entityType: 'dealer',
            entityId: d.id,
            entityName: d.name || d.businessName || 'تاجر',
            entityPhone: d.phone,
            joinedAt: new Date().toISOString(),
            entriesCount: dealerTickets.length || 1,
            rechargeCount: dealerTickets.length,
            totalRechargeAmount: dealerTickets.reduce((s, t) => s + (t.receivedAmount || t.requiredAmount || 0), 0),
            qualifyingTransactionIds: dealerTickets.map(t => t.id),
            isEligible: false,
            isWinner: false
          };
        } else {
          p.rechargeCount = dealerTickets.length;
          p.totalRechargeAmount = dealerTickets.reduce((s, t) => s + (t.receivedAmount || t.requiredAmount || 0), 0);
          p.qualifyingTransactionIds = dealerTickets.map(t => t.id);
        }

        const evalRes = CompetitionRulesEngine.evaluateCompetition(comp, {
          dealer: d,
          tickets: dealerTickets,
          participant: p,
          currentParticipantsCount: participants.length
        });

        p.isEligible = evalRes.isEligible;
        p.entriesCount = Math.max(1, p.rechargeCount);

        if (isNew) {
          participants.unshift(p);
        } else {
          const idx = participants.findIndex(x => x.id === p!.id);
          if (idx >= 0) participants[idx] = p;
        }
      });

      // 3. Synchronize External Merchants / Suppliers
      const merchants = db.getMerchants();
      merchants.forEach(m => {
        if (
          audienceType === 'selected_merchants' &&
          comp.targetAudience.selectedIds &&
          !comp.targetAudience.selectedIds.includes(m.id)
        ) {
          return;
        }

        // For non-auto-enroll competitions, only sync existing participants
        if (!isAutoEnrollComp && !participants.some(p => p.entityId === m.id)) {
          return;
        }

        const mTickets = allTickets.filter(t => {
          if (t.customerId !== m.id && t.customerPhone !== m.phone) return false;
          if (t.status !== 'completed') return false;
          const tTime = new Date(t.createdAt).getTime();
          return tTime >= compStart && tTime <= compEnd;
        });

        if (mTickets.length === 0 && !participants.some(p => p.entityId === m.id)) {
          return;
        }

        let p = participants.find(x => x.entityId === m.id);
        const isNew = !p;
        if (!p) {
          p = {
            id: `part_${Date.now()}_${m.id.slice(-4)}`,
            competitionId: comp.id,
            entityType: 'merchant',
            entityId: m.id,
            entityName: m.companyName || m.name || 'تاجر/مورد',
            entityPhone: m.phone || m.whatsapp || '',
            joinedAt: new Date().toISOString(),
            entriesCount: mTickets.length || 1,
            rechargeCount: mTickets.length,
            totalRechargeAmount: mTickets.reduce((s, t) => s + (t.receivedAmount || t.requiredAmount || 0), 0),
            qualifyingTransactionIds: mTickets.map(t => t.id),
            isEligible: false,
            isWinner: false
          };
        } else {
          p.rechargeCount = mTickets.length;
          p.totalRechargeAmount = mTickets.reduce((s, t) => s + (t.receivedAmount || t.requiredAmount || 0), 0);
          p.qualifyingTransactionIds = mTickets.map(t => t.id);
        }

        const evalRes = CompetitionRulesEngine.evaluateCompetition(comp, {
          tickets: mTickets,
          participant: p,
          currentParticipantsCount: participants.length
        });

        p.isEligible = evalRes.isEligible;
        p.entriesCount = Math.max(1, p.rechargeCount);

        if (isNew) {
          participants.unshift(p);
        } else {
          const idx = participants.findIndex(x => x.id === p!.id);
          if (idx >= 0) participants[idx] = p;
        }
      });
    }

    // Leaderboard Ranking
    if (comp.type === 'top_spenders') {
      participants.sort((a, b) => b.totalRechargeAmount - a.totalRechargeAmount);
      participants.forEach((p, idx) => {
        p.currentRank = idx + 1;
        // Auto assign prize template preview if in top ranks
        const prize = comp.prizes.find(pz => pz.rankOrTier === idx + 1);
        if (prize && p.isEligible) {
          p.assignedPrizeId = prize.id;
          p.assignedPrizeName = prize.name;
        }
      });
    } else {
      participants.sort((a, b) => (b.totalRechargeAmount || b.rechargeCount) - (a.totalRechargeAmount || a.rechargeCount));
      participants.forEach((p, idx) => {
        p.currentRank = idx + 1;
      });
    }

    // Automatic Reward Generation for eligible participants in milestone/non-draw competitions
    // Note: For top_spenders, rankings change continuously with every ticket until finished;
    // rewards are generated once the competition concludes (status === 'finished').
    const isTopSpendersRunning = comp.type === 'top_spenders' && comp.status !== 'finished';
    if (!isTopSpendersRunning && comp.type !== 'recharge_draw' && (comp.type as string) !== 'lucky_draw' && comp.prizes && comp.prizes.length > 0) {
      const allRewards = this.getRewards();
      let rewardsAdded = false;

      participants.forEach(p => {
        if (!p.isEligible) {
          p.isWinner = false;
          // Auto-cancel any un-delivered pending rewards if participant lost eligibility (e.g., ticket refunded or canceled)
          const pendingRewards = allRewards.filter(
            r => r.competitionId === comp.id && r.entityId === p.entityId && r.status === 'pending'
          );
          if (pendingRewards.length > 0) {
            pendingRewards.forEach(r => {
              r.status = 'cancelled';
              r.cancellationReason = 'إلغاء الاستحقاق تلقائياً بسبب إلغاء أو استرداد تذكرة شحن وفقدان شروط الأهلية';
              r.cancelledAt = new Date().toISOString();
            });
            rewardsAdded = true;
          }
          return;
        }

        // Check if reward already generated for this participant in this competition
        const alreadyAwarded = allRewards.some(
          r => r.competitionId === comp.id && r.entityId === p.entityId && r.status !== 'cancelled'
        );
        if (alreadyAwarded) {
          p.isWinner = true;
          return;
        }

        // Determine prize
        let prize = comp.prizes[0];
        if (comp.type === 'top_spenders') {
          if (comp.maxWinners && (p.currentRank || 999) > comp.maxWinners) {
            return; // Not in top winners
          }
          prize = comp.prizes.find(pz => pz.rankOrTier === p.currentRank) || comp.prizes[0];
        }

        if (prize) {
          p.isWinner = true;
          p.assignedPrizeId = prize.id;
          p.assignedPrizeName = prize.name;

          const rewardRecord: CompetitionReward = {
            id: `rew_auto_${Date.now()}_${p.id.slice(-4)}_${Math.random().toString(36).substr(2, 3)}`,
            competitionId: comp.id,
            competitionTitle: comp.title,
            participantId: p.id,
            entityType: p.entityType,
            entityId: p.entityId,
            entityName: p.entityName,
            entityPhone: p.entityPhone,
            prizeId: prize.id,
            prizeName: prize.name,
            prizeType: prize.type,
            prizeValue: prize.value,
            currency: prize.currency,
            costEGP: prize.costEGP,
            sourceWalletId: prize.sourceWalletId,
            sourceWalletName: prize.sourceWalletName,
            productId: prize.productId,
            productName: prize.productName,
            status: 'pending',
            idempotencyKey: `comp_deliv_${p.id}_${prize.id}`,
            snapshot: {
              competitionName: comp.title,
              prizeName: prize.name,
              prizeValue: prize.value,
              currency: prize.currency,
              productName: prize.productName,
              walletName: prize.sourceWalletName,
              costEGP: prize.costEGP,
              customerName: p.entityName,
              rulesSummary: `استحقاق تلقائي لشروط مسابقة [${comp.title}] (${comp.type})`
            },
            createdAt: new Date().toISOString()
          };

          allRewards.unshift(rewardRecord);
          rewardsAdded = true;

          try {
            db.addNotification({
              type: 'success',
              title: '🎁 استحقاق مكافأة مسابقة تلقائياً',
              message: `تهانينا! حقق (${p.entityName}) شروط مسابقة [${comp.title}] وأصبح مستحقاً لجائزة [${prize.name}].`,
              linkSection: 'competitions',
              metadata: { competitionId: comp.id, rewardId: rewardRecord.id }
            });
          } catch (e) {}
        }
      });

      if (rewardsAdded) {
        this.setRewards(allRewards);
        eventBus.publish(SYSTEM_EVENTS.COMPETITIONS_UPDATED);
      }
    }

    // Save
    const allOther = this.getParticipants().filter(p => p.competitionId !== competitionId);
    this.setItem(STORAGE_KEYS.COMPETITION_PARTICIPANTS, [...participants, ...allOther]);
  }

  /**
   * Synchronize all active competitions against live tickets across the entire ERP
   */
  public static syncAllActiveCompetitions(): void {
    const competitions = this.getCompetitions(true);
    const now = new Date();

    competitions.forEach(c => {
      if (c.status === 'archived' || c.status === 'cancelled') return;

      // Auto-activate scheduled competitions whose start time has arrived
      if (c.status === 'scheduled') {
        const start = new Date(`${c.startDate}T${c.startTime || '00:00'}:00`);
        if (now >= start) {
          c.status = 'active';
          this.saveCompetition(c);
        }
      }

      // Auto-finish active competitions whose end time has passed
      if (c.status === 'active') {
        const end = new Date(`${c.endDate}T${c.endTime || '23:59'}:59`);
        if (now > end && c.type !== 'recharge_draw') {
          c.status = 'finished';
          this.saveCompetition(c);
        }
        this.syncCompetitionParticipants(c.id);
      }
    });
  }

  /**
   * Manual verification of social / story proofs (Task 18)
   */
  public static verifySocialProof(
    participantId: string,
    status: 'approved' | 'rejected',
    notes: string,
    adminUser: { id: string; name: string; role: string }
  ): CompetitionParticipant {
    const all = this.getParticipants();
    const p = all.find(x => x.id === participantId);
    if (!p) throw new Error('المشارك غير موجود.');

    p.socialVerificationStatus = status;
    p.verificationNotes = notes;
    p.isEligible = status === 'approved';

    this.setItem(STORAGE_KEYS.COMPETITION_PARTICIPANTS, all);

    db.logAction(
      adminUser,
      'edit',
      'competition_proof',
      p.id,
      `توثيق مشاركة اجتماعية: ${p.entityName}`,
      `تم تغيير حالة التوثيق للمشارك ${p.entityName} إلى [${status === 'approved' ? 'معتمد' : 'مرفوض'}]. الملاحظات: ${notes || 'لا يوجد'}`,
      null,
      { status, notes }
    );

    return p;
  }

  // =========================================================================
  // REWARDS MANAGEMENT & ATOMIC DELIVERY (Task 20, 21, 22, 23)
  // =========================================================================

  public static getRewards(): CompetitionReward[] {
    return this.getItem<CompetitionReward[]>(STORAGE_KEYS.COMPETITION_REWARDS, []);
  }

  public static getRewardById(id: string): CompetitionReward | undefined {
    return this.getRewards().find(r => r.id === id);
  }

  public static setRewards(rewards: CompetitionReward[]): void {
    this.setItem(STORAGE_KEYS.COMPETITION_REWARDS, rewards);
  }

  public static saveReward(reward: CompetitionReward): void {
    const all = this.getRewards();
    const idx = all.findIndex(r => r.id === reward.id);
    if (idx >= 0) {
      all[idx] = reward;
    } else {
      all.unshift(reward);
    }
    this.setRewards(all);
  }

  public static deliverReward(
    rewardId: string,
    adminUser: { id: string; name: string; role: string; department?: string }
  ): DeliveryExecutionResult {
    const rewards = this.getRewards();
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) throw new Error('المكافأة المحددة غير موجودة في سجل الجوائز.');

    return CompetitionDeliveryService.deliverReward(
      reward,
      adminUser,
      rewards,
      updatedRewards => this.setRewards(updatedRewards)
    );
  }

  public static cancelReward(
    rewardId: string,
    adminUser: { id: string; name: string; role: string },
    reason: string
  ): CompetitionReward {
    const rewards = this.getRewards();
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) throw new Error('المكافأة المحددة غير موجودة.');

    return CompetitionDeliveryService.cancelReward(
      reward,
      adminUser,
      reason,
      rewards,
      updatedRewards => this.setRewards(updatedRewards)
    );
  }

  // =========================================================================
  // RANDOM DRAW (Task 14, 40)
  // =========================================================================

  public static runRandomDraw(
    competitionId: string,
    adminUser: { id: string; name: string; role: string }
  ) {
    const comp = this.getCompetitionById(competitionId);
    if (!comp) throw new Error('المسابقة غير موجودة.');

    // Ensure participants are freshly synchronized
    this.syncCompetitionParticipants(competitionId);

    const allParticipants = this.getParticipants();
    const eligible = allParticipants.filter(p => p.competitionId === competitionId && p.isEligible);
    const allRewards = this.getRewards();

    return CompetitionDrawService.executeDraw({
      competition: comp,
      adminUser,
      eligibleParticipants: eligible,
      allRewards,
      allParticipants,
      saveRewardsCallback: updated => this.setRewards(updated),
      saveCompetitionCallback: updatedComp => this.saveCompetition(updatedComp, adminUser),
      saveParticipantsCallback: updatedParts => this.setItem(STORAGE_KEYS.COMPETITION_PARTICIPANTS, updatedParts)
    });
  }

  // =========================================================================
  // DASHBOARD KPIS (Task 1, 35)
  // =========================================================================

  public static calculateDashboardKPIs(): CompetitionsDashboardKPIs {
    const competitions = this.getCompetitions(true);
    const participants = this.getParticipants();
    const rewards = this.getRewards();

    const activeCompetitionsCount = competitions.filter(c => c.status === 'active').length;
    const finishedCompetitionsCount = competitions.filter(c => c.status === 'finished').length;
    const totalParticipantsCount = participants.length;

    const totalPrizesCount = competitions.reduce((sum, c) => sum + (c.prizes?.length || 0), 0);

    const deliveredRewards = rewards.filter(r => r.status === 'delivered');
    const pendingRewards = rewards.filter(r => r.status === 'pending');

    const deliveredRewardsValue = deliveredRewards.reduce((sum, r) => sum + (r.prizeValue || 0), 0);
    const pendingRewardsValue = pendingRewards.reduce((sum, r) => sum + (r.prizeValue || 0), 0);

    const marketingCostTotal = deliveredRewards.reduce((sum, r) => sum + (r.costEGP || 0), 0);

    const uniqueRewardedCustomers = new Set(deliveredRewards.map(r => r.entityId));
    const uniqueRewardedCustomersCount = uniqueRewardedCustomers.size;

    const totalCampaignCost = competitions.reduce((sum, c) => sum + (c.totalMarketingCost || 0), 0) + marketingCostTotal;

    return {
      activeCompetitionsCount,
      finishedCompetitionsCount,
      totalParticipantsCount,
      totalPrizesCount,
      deliveredRewardsValue,
      pendingRewardsValue,
      marketingCostTotal,
      uniqueRewardedCustomersCount,
      totalCampaignCost
    };
  }
}
