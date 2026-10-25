import { Dealer, DealerProfileType } from '../../types/dealer.types';

export interface DealerPerformanceSummary {
  dealerId: string;
  dealerName: string;
  profileType: DealerProfileType;
  referralCode: string;
  totalLinkedReferees: number;
  monthlyNewReferredCount: number;
  monthlyTarget: number;
  achievementPercentage: number;
  daysRemainingInMonth: number;
  warningCount: number;
  status: 'active' | 'first_warning' | 'demoted';
  statusText: string;
  firstMonthRate: number;
  lifetimeRate: number;
}

export class DealerPerformanceService {
  /**
   * Calculate remaining days in the current calendar month
   */
  public static getDaysRemainingInMonth(): number {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    return Math.max(0, lastDayOfMonth - now.getDate());
  }

  /**
   * Retrieve all currently active dealers linked to a referrer
   */
  public static getLinkedReferees(referrerCode: string, allDealers: Dealer[]): Dealer[] {
    if (!referrerCode) return [];
    const cleanRef = referrerCode.toUpperCase().trim();
    return allDealers.filter(
      d => !d.isArchived && d.referredByCode && d.referredByCode.toUpperCase().trim() === cleanRef
    );
  }

  /**
   * Retrieve new dealers registered with the referral code during current calendar month
   */
  public static getMonthlyNewReferees(referrerCode: string, allDealers: Dealer[]): Dealer[] {
    if (!referrerCode) return [];
    const cleanRef = referrerCode.toUpperCase().trim();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return allDealers.filter(d => {
      if (d.isArchived) return false;
      if (!d.referredByCode || d.referredByCode.toUpperCase().trim() !== cleanRef) return false;

      const regDate = new Date(d.createdAt || d.referredAt || '');
      if (isNaN(regDate.getTime())) return false;

      return regDate.getFullYear() === currentYear && regDate.getMonth() === currentMonth;
    });
  }

  /**
   * Get default rates based on profile type
   */
  public static getDefaultCommissionRates(profileType: DealerProfileType): {
    firstMonthRate: number;
    lifetimeRate: number;
    defaultTarget: number;
  } {
    switch (profileType) {
      case 'distributor':
        return { firstMonthRate: 4.0, lifetimeRate: 1.5, defaultTarget: 15 };
      case 'vip_dealer':
        return { firstMonthRate: 3.5, lifetimeRate: 1.5, defaultTarget: 12 };
      case 'shop':
      case 'agent':
        return { firstMonthRate: 3.0, lifetimeRate: 1.0, defaultTarget: 10 };
      default:
        return { firstMonthRate: 2.0, lifetimeRate: 0.5, defaultTarget: 5 };
    }
  }

  /**
   * Calculate effective commission rate for a referred transaction
   */
  public static getEffectiveCommissionRate(
    referrer: Dealer,
    referredLinkedAtDate?: string
  ): {
    rate: number;
    isFirstMonth: boolean;
    daysSinceCreation: number;
    commissionTypeLabel: string;
  } {
    const defaultRates = this.getDefaultCommissionRates(referrer.profileType);
    const customRate = referrer.referralPercent ?? referrer.referralPercentage ?? referrer.customCommissionRate;
    const firstMonthRate = customRate ?? referrer.firstMonthCommissionRate ?? defaultRates.firstMonthRate;
    const lifetimeRate = customRate ?? referrer.lifetimeCommissionRate ?? defaultRates.lifetimeRate;

    const linkDate = referredLinkedAtDate ? new Date(referredLinkedAtDate) : new Date();
    const now = new Date();
    const diffMs = now.getTime() - (isNaN(linkDate.getTime()) ? now.getTime() : linkDate.getTime());
    const daysSinceCreation = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    const isFirstMonth = daysSinceCreation <= 30;
    const rate = isFirstMonth ? firstMonthRate : lifetimeRate;
    const commissionTypeLabel = isFirstMonth
      ? `عمولة أول شهر (أقل من 30 يوماً: ${rate}%)`
      : `عمولة مدى الحياة (${rate}%)`;

    return {
      rate,
      isFirstMonth,
      daysSinceCreation,
      commissionTypeLabel
    };
  }

  /**
   * Evaluates a single dealer's monthly performance
   */
  public static evaluateDealer(dealer: Dealer, allDealers: Dealer[]): DealerPerformanceSummary {
    const linked = this.getLinkedReferees(dealer.referralCode, allDealers);
    const monthlyNew = this.getMonthlyNewReferees(dealer.referralCode, allDealers);

    const defaultRates = this.getDefaultCommissionRates(dealer.profileType);
    const target = dealer.monthlyTargetCount ?? defaultRates.defaultTarget;
    const monthlyCount = monthlyNew.length;
    const achievementPercentage = target > 0 ? Math.min(100, Math.round((monthlyCount / target) * 100)) : 100;
    const daysRemaining = this.getDaysRemainingInMonth();

    let status: 'active' | 'first_warning' | 'demoted' = 'active';
    let statusText = 'نشط — الأداء ممتاز';

    if (dealer.partnerWarningCount === 1) {
      status = 'first_warning';
      statusText = 'تحذير أول ⚠️ (تراجع في التارجت)';
    } else if (dealer.partnerWarningCount >= 2 || dealer.partnershipDemotedAt) {
      status = 'demoted';
      statusText = 'فقد ميزة العمولة المميزة ❌';
    }

    return {
      dealerId: dealer.id,
      dealerName: dealer.name,
      profileType: dealer.profileType,
      referralCode: dealer.referralCode,
      totalLinkedReferees: linked.length,
      monthlyNewReferredCount: monthlyCount,
      monthlyTarget: target,
      achievementPercentage,
      daysRemainingInMonth: daysRemaining,
      warningCount: dealer.partnerWarningCount || 0,
      status,
      statusText,
      firstMonthRate: dealer.firstMonthCommissionRate ?? defaultRates.firstMonthRate,
      lifetimeRate: dealer.lifetimeCommissionRate ?? defaultRates.lifetimeRate
    };
  }
}
