import {
  Competition,
  CompetitionRule,
  CompetitionRuleCondition,
  CompetitionParticipant
} from '../../types/competition.types';
import { Customer, CustomerTicket } from '../../types/customer.types';
import { Dealer } from '../../types/dealer.types';

export interface EvaluationContext {
  customer?: Customer;
  dealer?: Dealer;
  tickets: CustomerTicket[]; // All completed tickets for this participant within competition date range
  participant?: CompetitionParticipant;
  currentParticipantsCount: number;
}

export interface RuleEvaluationResult {
  isEligible: boolean;
  qualifyingTickets: CustomerTicket[];
  progressCount: number;
  targetCount: number;
  totalAmount: number;
  targetAmount: number;
  conditionResults: {
    conditionId: string;
    label: string;
    passed: boolean;
    currentValue: any;
    requiredValue: any;
  }[];
}

export class CompetitionRulesEngine {
  /**
   * Evaluates a competition rule set against a given participant and their transactions
   */
  public static evaluateCompetition(
    competition: Competition,
    context: EvaluationContext
  ): RuleEvaluationResult {
    const rule = competition.rules;
    if (!rule || !rule.conditions || rule.conditions.length === 0) {
      return {
        isEligible: true,
        qualifyingTickets: context.tickets,
        progressCount: context.tickets.length,
        targetCount: 1,
        totalAmount: context.tickets.reduce((sum, t) => sum + (t.receivedAmount || t.requiredAmount || 0), 0),
        targetAmount: 0,
        conditionResults: []
      };
    }

    // Filter tickets strictly within competition start and end dates
    const compStart = new Date(`${competition.startDate}T${competition.startTime || '00:00'}:00`).getTime();
    const compEnd = new Date(`${competition.endDate}T${competition.endTime || '23:59'}:59`).getTime();

    const validTickets = context.tickets.filter(t => {
      if (t.status !== 'completed') return false;
      const tTime = new Date(t.createdAt).getTime();
      return tTime >= compStart && tTime <= compEnd;
    });

    const conditionResults: RuleEvaluationResult['conditionResults'] = [];
    let qualifyingTickets = [...validTickets];
    let progressCount = validTickets.length;
    let targetCount = 0;
    let totalAmount = validTickets.reduce((sum, t) => sum + (t.receivedAmount || t.requiredAmount || 0), 0);
    let targetAmount = 0;

    for (const cond of rule.conditions) {
      const res = this.evaluateCondition(cond, {
        ...context,
        tickets: validTickets
      });

      conditionResults.push({
        conditionId: cond.id,
        label: cond.label,
        passed: res.passed,
        currentValue: res.currentValue,
        requiredValue: cond.value
      });

      if (cond.type === 'recharge_count') {
        progressCount = typeof res.currentValue === 'number' ? res.currentValue : progressCount;
        targetCount = Number(cond.value) || 0;
      }

      if (cond.type === 'total_recharge_amount' || cond.type === 'min_recharge_amount') {
        targetAmount = Number(cond.value) || 0;
      }

      if (res.qualifyingTickets) {
        qualifyingTickets = qualifyingTickets.filter(t => res.qualifyingTickets!.some(qt => qt.id === t.id));
      }
    }

    const isEligible = rule.logicalOperator === 'OR'
      ? conditionResults.some(c => c.passed)
      : conditionResults.every(c => c.passed);

    return {
      isEligible,
      qualifyingTickets,
      progressCount,
      targetCount,
      totalAmount,
      targetAmount,
      conditionResults
    };
  }

  private static evaluateCondition(
    cond: CompetitionRuleCondition,
    context: EvaluationContext
  ): { passed: boolean; currentValue: any; qualifyingTickets?: CustomerTicket[] } {
    const { customer, dealer, tickets, participant, currentParticipantsCount } = context;

    switch (cond.type) {
      case 'min_recharge_amount': {
        const minVal = Number(cond.value) || 0;
        const matching = tickets.filter(t => (t.receivedAmount || t.requiredAmount || 0) >= minVal);
        const maxSingle = tickets.reduce((max, t) => Math.max(max, t.receivedAmount || t.requiredAmount || 0), 0);
        return {
          passed: matching.length > 0,
          currentValue: maxSingle,
          qualifyingTickets: matching
        };
      }

      case 'total_recharge_amount': {
        const requiredTotal = Number(cond.value) || 0;
        const currentSum = tickets.reduce((sum, t) => sum + (t.receivedAmount || t.requiredAmount || 0), 0);
        return {
          passed: currentSum >= requiredTotal,
          currentValue: currentSum,
          qualifyingTickets: tickets
        };
      }

      case 'recharge_count': {
        const target = Number(cond.value) || 1;
        const count = tickets.length;
        return {
          passed: count >= target,
          currentValue: count,
          qualifyingTickets: tickets
        };
      }

      case 'specific_product': {
        const pId = String(cond.value);
        const matching = tickets.filter(t => {
          if (t.items && t.items.some(it => it.productId === pId)) return true;
          return (t as any).productId === pId;
        });
        return {
          passed: matching.length > 0,
          currentValue: matching.length,
          qualifyingTickets: matching
        };
      }

      case 'specific_products': {
        const pIds = Array.isArray(cond.value) ? cond.value : [String(cond.value)];
        const matching = tickets.filter(t => {
          if (t.items && t.items.some(it => pIds.includes(it.productId))) return true;
          return pIds.includes((t as any).productId);
        });
        return {
          passed: matching.length > 0,
          currentValue: matching.length,
          qualifyingTickets: matching
        };
      }

      case 'specific_category': {
        const catName = String(cond.value).toLowerCase();
        const matching = tickets.filter(t => {
          if (t.gameName && t.gameName.toLowerCase().includes(catName)) return true;
          if (t.gameSection && t.gameSection.toLowerCase().includes(catName)) return true;
          return false;
        });
        return {
          passed: matching.length > 0,
          currentValue: matching.length,
          qualifyingTickets: matching
        };
      }

      case 'new_customer': {
        const isNew = customer ? (customer.totalOrders <= 1 || customer.purchasingPower === 'normal') : false;
        return {
          passed: isNew,
          currentValue: isNew ? 'عميل جديد' : 'عميل حالي'
        };
      }

      case 'referral_count': {
        const targetRef = Number(cond.value) || 1;
        const count = customer?.monthlyReferredCount || 0;
        return {
          passed: count >= targetRef,
          currentValue: count
        };
      }

      case 'customer_registration': {
        const hasPhone = Boolean(customer?.phone || dealer?.phone);
        return {
          passed: hasPhone,
          currentValue: hasPhone ? 'مسجل' : 'غير مسجل'
        };
      }

      case 'social_interaction':
      case 'story_view': {
        const status = participant?.socialVerificationStatus;
        const passed = status === 'approved';
        return {
          passed,
          currentValue: status === 'approved' ? 'موثق' : status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'
        };
      }

      case 'first_x_participants': {
        const limit = Number(cond.value) || 999;
        const passed = currentParticipantsCount <= limit;
        return {
          passed,
          currentValue: currentParticipantsCount
        };
      }

      case 'customer_type': {
        const allowedTypes = Array.isArray(cond.value) ? cond.value : [cond.value];
        const curType = customer?.profileType || 'regular';
        return {
          passed: allowedTypes.includes(curType),
          currentValue: curType
        };
      }

      case 'merchant_type': {
        const allowedTypes = Array.isArray(cond.value) ? cond.value : [cond.value];
        const curType = dealer?.profileType || 'regular';
        return {
          passed: allowedTypes.includes(curType),
          currentValue: curType
        };
      }

      default:
        return {
          passed: true,
          currentValue: true
        };
    }
  }
}
