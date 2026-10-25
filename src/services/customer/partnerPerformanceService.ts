import { Customer, ProfileType } from '../../types/customer.types';

export interface PartnerPerformanceSummary {
  partnerId: string;
  partnerName: string;
  profileType: ProfileType;
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

export class PartnerPerformanceService {
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
   * Retrieve all currently active customers linked to a referrer
   */
  public static getLinkedReferees(referrerCode: string, allCustomers: Customer[]): Customer[] {
    if (!referrerCode) return [];
    const cleanRef = referrerCode.toUpperCase().trim();
    return allCustomers.filter(
      c => !c.isArchived && c.referredByCode && c.referredByCode.toUpperCase().trim() === cleanRef
    );
  }

  /**
   * Retrieve new customers registered with the referral code during current calendar month
   */
  public static getMonthlyNewReferees(referrerCode: string, allCustomers: Customer[]): Customer[] {
    if (!referrerCode) return [];
    const cleanRef = referrerCode.toUpperCase().trim();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return allCustomers.filter(c => {
      if (c.isArchived) return false;
      if (!c.referredByCode || c.referredByCode.toUpperCase().trim() !== cleanRef) return false;

      const regDate = new Date(c.createdAt || c.referredAt || '');
      if (isNaN(regDate.getTime())) return false;

      return regDate.getFullYear() === currentYear && regDate.getMonth() === currentMonth;
    });
  }

  /**
   * Determine whether a referee transaction qualifies for First Month Commission (within 30 days of registration)
   * or Lifetime Commission (after 30 days)
   */
  public static getEffectiveCommissionRate(
    referrer: Customer,
    refereeCreatedAt: string,
    referee?: Customer
  ): {
    rate: number;
    isFirstMonth: boolean;
    daysSinceCreation: number;
    daysRemaining: number;
    totalPromoDays: number;
    commissionTypeLabel: string;
  } {
    const regTime = new Date(refereeCreatedAt).getTime();
    const now = new Date().getTime();
    const diffDays = Math.max(0, Math.floor((now - regTime) / (1000 * 60 * 60 * 24)));
    
    // Configurable duration (15, 30, 45, 60, 90...)
    const promoDays = referee?.highCashbackDays ?? referrer.highCashbackDays ?? 30;
    const isFirstMonth = diffDays <= promoDays;
    const daysRemaining = Math.max(0, promoDays - diffDays);

    // Check if referrer is a Partner / Shop / Influencer
    const explicitRate = referrer.referralPercent ?? referrer.referralPercentage;

    if (['partner', 'shop', 'influencer'].includes(referrer.profileType)) {
      if (isFirstMonth) {
        const defaultRate =
          referrer.profileType === 'influencer' ? 5.0 : referrer.profileType === 'partner' ? 3.0 : 2.0;
        const rate = explicitRate ?? referrer.firstMonthCommissionRate ?? referrer.customCommissionRate ?? defaultRate;
        return {
          rate,
          isFirstMonth: true,
          daysSinceCreation: diffDays,
          daysRemaining,
          totalPromoDays: promoDays,
          commissionTypeLabel: `عمولة الكاش باك المرتفع (${rate}%) [اليوم ${diffDays}/${promoDays}]`
        };
      } else {
        const defaultRate = referrer.profileType === 'influencer' ? 1.5 : 1.0;
        const rate = explicitRate ?? referrer.lifetimeCommissionRate ?? referrer.customCommissionRate ?? defaultRate;
        return {
          rate,
          isFirstMonth: false,
          daysSinceCreation: diffDays,
          daysRemaining: 0,
          totalPromoDays: promoDays,
          commissionTypeLabel: `عمولة مدى الحياة (${rate}%)`
        };
      }
    }

    // Regular Customer: Strictly 1.0% fixed for life, never changes after first month or any timeframe
    return {
      rate: 1.0,
      isFirstMonth: false,
      daysSinceCreation: diffDays,
      daysRemaining: 0,
      totalPromoDays: promoDays,
      commissionTypeLabel: 'عمولة إحالة العميل العادي (1% ثابتة مدى الحياة)'
    };
  }

  /**
   * Get complete performance analytics summary for a partner profile
   */
  public static getPartnerSummary(partner: Customer, allCustomers: Customer[]): PartnerPerformanceSummary {
    const linkedReferees = this.getLinkedReferees(partner.referralCode, allCustomers);
    const monthlyNewReferees = this.getMonthlyNewReferees(partner.referralCode, allCustomers);

    const defaultTarget =
      partner.profileType === 'partner' ? 10 : partner.profileType === 'shop' ? 15 : partner.profileType === 'influencer' ? 20 : 10;
    const monthlyTarget = partner.monthlyTargetCount && partner.monthlyTargetCount > 0 ? partner.monthlyTargetCount : defaultTarget;

    const monthlyNewReferredCount = monthlyNewReferees.length;
    const achievementPercentage = Math.min(100, Math.round((monthlyNewReferredCount / monthlyTarget) * 100));
    const daysRemainingInMonth = this.getDaysRemainingInMonth();

    const warningCount = partner.partnerWarningCount || 0;
    let status: 'active' | 'first_warning' | 'demoted' = 'active';
    let statusText = '🟢 نشط — شريك معتمد';

    if (partner.profileType === 'regular' && warningCount >= 2) {
      status = 'demoted';
      statusText = '🔴 فقد الشراكة (تم تحويله لعميل عادي)';
    } else if (warningCount === 1) {
      status = 'first_warning';
      statusText = '🟡 تحذير أول (لم يحقق الهدف الشهري السابق)';
    }

    const firstMonthRate =
      partner.firstMonthCommissionRate ??
      (partner.profileType === 'influencer' ? 5.0 : partner.profileType === 'partner' ? 3.0 : 2.0);
    const lifetimeRate =
      partner.lifetimeCommissionRate ?? (partner.profileType === 'influencer' ? 1.5 : 1.0);

    return {
      partnerId: partner.id,
      partnerName: partner.name,
      profileType: partner.profileType,
      referralCode: partner.referralCode,
      totalLinkedReferees: linkedReferees.length,
      monthlyNewReferredCount,
      monthlyTarget,
      achievementPercentage,
      daysRemainingInMonth,
      warningCount,
      status,
      statusText,
      firstMonthRate,
      lifetimeRate
    };
  }

  /**
   * Evaluates a partner's monthly performance against their required minimum target.
   * Handles Warning 1 and Demotion (canceling partnership + unlinking all customers).
   */
  public static evaluatePartner(
    partner: Customer,
    allCustomers: Customer[]
  ): {
    updatedPartner: Customer;
    unlinkedCustomerIds: string[];
    actionTaken: 'passed' | 'warned' | 'demoted' | 'none';
    message: string;
  } {
    if (!['partner', 'shop', 'influencer'].includes(partner.profileType)) {
      return {
        updatedPartner: partner,
        unlinkedCustomerIds: [],
        actionTaken: 'none',
        message: 'البروفايل ليس شريكاً أو محلاً أو مشهوراً'
      };
    }

    const monthlyNewReferees = this.getMonthlyNewReferees(partner.referralCode, allCustomers);
    const defaultTarget =
      partner.profileType === 'partner' ? 10 : partner.profileType === 'shop' ? 15 : 20;
    const monthlyTarget = partner.monthlyTargetCount && partner.monthlyTargetCount > 0 ? partner.monthlyTargetCount : defaultTarget;

    // Case 1: Target Met successfully
    if (monthlyNewReferees.length >= monthlyTarget) {
      const updated: Customer = {
        ...partner,
        partnerWarningCount: 0,
        monthlyReferredCount: monthlyNewReferees.length,
        updatedAt: new Date().toISOString()
      };
      return {
        updatedPartner: updated,
        unlinkedCustomerIds: [],
        actionTaken: 'passed',
        message: `تم تحقيق شرط الاستمرار بنجاح (${monthlyNewReferees.length} / ${monthlyTarget} عميل جديد)`
      };
    }

    // Case 2: Target Failed - First Warning (تحذير أول)
    if ((partner.partnerWarningCount || 0) === 0) {
      const updated: Customer = {
        ...partner,
        partnerWarningCount: 1,
        monthlyReferredCount: monthlyNewReferees.length,
        updatedAt: new Date().toISOString()
      };
      return {
        updatedPartner: updated,
        unlinkedCustomerIds: [],
        actionTaken: 'warned',
        message: `تحذير أول لعدم تحقيق الهدف الشهري (${monthlyNewReferees.length} من أصل ${monthlyTarget} عميل)`
      };
    }

    // Case 3: Target Failed for Second Consecutive Month -> Demote & Unlink All Referees (إلغاء الشراكة وتحرير العملاء)
    const linkedReferees = this.getLinkedReferees(partner.referralCode, allCustomers);
    const unlinkedCustomerIds = linkedReferees.map(c => c.id);

    const updated: Customer = {
      ...partner,
      profileType: 'regular',
      partnerWarningCount: 2,
      partnershipDemotedAt: new Date().toISOString(),
      partnershipDemoteReason: `فشل في تحقيق شرط الاستمرار الشهري (${monthlyNewReferees.length}/${monthlyTarget} عميل) للشهر الثاني متتالياً`,
      monthlyReferredCount: monthlyNewReferees.length,
      updatedAt: new Date().toISOString()
    };

    return {
      updatedPartner: updated,
      unlinkedCustomerIds,
      actionTaken: 'demoted',
      message: `تم إلغاء الشراكة وتحويل البروفايل إلى عميل عادي وتحرير ${unlinkedCustomerIds.length} عميل مرتبط لعدم تحقيق الهدف للشهر الثاني متتالياً`
    };
  }
}
