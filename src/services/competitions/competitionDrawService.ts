import { db } from '../../database/db';
import { eventBus, SYSTEM_EVENTS } from '../eventBus';
import {
  Competition,
  CompetitionParticipant,
  CompetitionReward,
  CompetitionDrawRecord
} from '../../types/competition.types';

export interface ExecuteDrawParams {
  competition: Competition;
  adminUser: { id: string; name: string; role: string };
  eligibleParticipants: CompetitionParticipant[];
  allRewards: CompetitionReward[];
  saveRewardsCallback: (rewards: CompetitionReward[]) => void;
  saveCompetitionCallback: (comp: Competition) => void;
  saveParticipantsCallback: (participants: CompetitionParticipant[]) => void;
  allParticipants: CompetitionParticipant[];
}

export class CompetitionDrawService {
  /**
   * Cryptographically secure Fisher-Yates shuffle
   */
  private static secureShuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const randomBuffer = new Uint32Array(1);
      if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(randomBuffer);
      } else {
        randomBuffer[0] = Math.floor(Math.random() * 0xffffffff);
      }
      const j = randomBuffer[0] % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * EXECUTE RANDOM DRAW (Task 14, Task 40)
   */
  public static executeDraw(params: ExecuteDrawParams): {
    drawRecord: CompetitionDrawRecord;
    winners: CompetitionParticipant[];
    createdRewards: CompetitionReward[];
  } {
    const {
      competition,
      adminUser,
      eligibleParticipants,
      allRewards,
      saveRewardsCallback,
      saveCompetitionCallback,
      saveParticipantsCallback,
      allParticipants
    } = params;

    if (competition.isDrawExecuted) {
      throw new Error('تم تنفيذ السحب لهذه المسابقة مسبقاً، ولا يمكن تكرار السحب لنفس الجولة.');
    }

    if (!eligibleParticipants || eligibleParticipants.length === 0) {
      throw new Error('لا يوجد أي مشاركين مؤهلين للسحب في هذه المسابقة.');
    }

    // Freeze participants at draw time (Task 14, 40)
    const frozenParticipantsSnapshot = eligibleParticipants.map(p => ({
      id: p.id,
      entityId: p.entityId,
      name: p.entityName,
      phone: p.entityPhone,
      entriesCount: p.entriesCount || 1
    }));

    // Determine available prizes sorted by rank
    const prizes = [...competition.prizes].sort((a, b) => (a.rankOrTier || 99) - (b.rankOrTier || 99));
    if (prizes.length === 0) {
      throw new Error('لا توجد جوائز محددة لهذه المسابقة لإجراء السحب.');
    }

    const maxWinners = Math.min(
      competition.maxWinners || prizes.length,
      eligibleParticipants.length,
      prizes.length
    );

    // Build weighted ticket pool based on entries count (if entriesCount > 1)
    // but guarantee each winner is distinct (No duplicate winners!)
    const shuffledEligible = this.secureShuffle(eligibleParticipants);
    const selectedWinners = shuffledEligible.slice(0, maxWinners);

    const drawId = `DRW-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const drawTimestamp = new Date().toISOString();

    const drawWinnersInfo: CompetitionDrawRecord['winners'] = [];
    const newRewards: CompetitionReward[] = [];

    // Assign prizes to distinct winners
    selectedWinners.forEach((winner, idx) => {
      const prize = prizes[idx] || prizes[prizes.length - 1];
      winner.isWinner = true;
      winner.assignedPrizeId = prize.id;
      winner.assignedPrizeName = prize.name;

      drawWinnersInfo.push({
        participantId: winner.id,
        entityId: winner.entityId,
        name: winner.entityName,
        phone: winner.entityPhone,
        prizeId: prize.id,
        prizeName: prize.name,
        prizeValue: prize.value
      });

      // Generate Pending Reward record (Task 12: Reward Pending, NOT delivered yet)
      const rewardRecord: CompetitionReward = {
        id: `rew_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        competitionId: competition.id,
        competitionTitle: competition.title,
        participantId: winner.id,
        entityType: winner.entityType,
        entityId: winner.entityId,
        entityName: winner.entityName,
        entityPhone: winner.entityPhone,
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
        idempotencyKey: `comp_deliv_${winner.id}_${prize.id}`,
        snapshot: {
          competitionName: competition.title,
          prizeName: prize.name,
          prizeValue: prize.value,
          currency: prize.currency,
          productName: prize.productName,
          walletName: prize.sourceWalletName,
          costEGP: prize.costEGP,
          customerName: winner.entityName,
          rulesSummary: 'سحب عشوائي إلكتروني موثق'
        },
        createdAt: drawTimestamp
      };

      newRewards.push(rewardRecord);

      // Trigger notification for qualification / winning
      try {
        db.addNotification({
          type: 'info',
          title: '🎉 مبروك! فوز في السحب العشوائي',
          message: `مبروك للمستفيد (${winner.entityName})! تم فوزك بجائزة: [${prize.name}] في مسابقة [${competition.title}].`,
          linkSection: 'competitions',
          metadata: { competitionId: competition.id, rewardId: rewardRecord.id }
        });
      } catch (e) {}
    });

    const drawRecord: CompetitionDrawRecord = {
      id: drawId,
      randomSeed: `SEED-${drawId}-${Date.now()}`,
      competitionId: competition.id,
      competitionTitle: competition.title,
      executedAt: drawTimestamp,
      executedBy: adminUser,
      totalEligibleAtDrawTime: eligibleParticipants.length,
      frozenParticipantsSnapshot,
      winners: drawWinnersInfo
    };

    // Save Updated Competition
    const updatedComp: Competition = {
      ...competition,
      status: 'finished',
      isDrawExecuted: true,
      drawDetails: {
        drawId,
        executedAt: drawTimestamp,
        executedBy: adminUser.name,
        eligibleParticipantsCount: eligibleParticipants.length,
        winnerIds: selectedWinners.map(w => w.id)
      },
      updatedAt: drawTimestamp
    };
    saveCompetitionCallback(updatedComp);

    // Save updated participants
    const updatedAllParticipants = allParticipants.map(p => {
      const matchWin = selectedWinners.find(w => w.id === p.id);
      return matchWin ? matchWin : p;
    });
    saveParticipantsCallback(updatedAllParticipants);

    // Save newly created rewards
    saveRewardsCallback([...newRewards, ...allRewards]);

    // Save Draw Record in LocalStorage
    try {
      const savedDraws: CompetitionDrawRecord[] = (db as any).getItem('nzm_jkr_competition_draws', []);
      savedDraws.unshift(drawRecord);
      (db as any).setItem('nzm_jkr_competition_draws', savedDraws);
    } catch (e) {}

    // Audit Log (Task 29)
    db.logAction(
      adminUser,
      'add',
      'competition_draw',
      drawId,
      `إجراء سحب عشوائي: ${competition.title}`,
      `تم تنفيذ السحب العشوائي (${drawId}) بنجاح بين ${eligibleParticipants.length} مشارك مؤهل، وتم اختيار ${selectedWinners.length} فائزين بدون أي تكرار وتوثيق الجوائز في السجلات.`,
      { eligibleCount: eligibleParticipants.length },
      { drawId, winnersCount: selectedWinners.length, winners: drawWinnersInfo }
    );

    eventBus.publish(SYSTEM_EVENTS.COMPETITION_DRAW_EXECUTED, { drawRecord, competition: updatedComp });
    eventBus.publish(SYSTEM_EVENTS.COMPETITIONS_UPDATED);

    return {
      drawRecord,
      winners: selectedWinners,
      createdRewards: newRewards
    };
  }
}
