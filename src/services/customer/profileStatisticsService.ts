import { Customer, LoyaltyTier, PurchasingPower, LifetimeSpendingTier, CustomerTicket } from '../../types/customer.types';

export interface CalculatedCustomerProfileMetrics {
  totalOrders: number;
  loyaltyTier: LoyaltyTier;
  maxSingleOrderAmount: number;
  purchasingPower: PurchasingPower;
  totalSpent: number; // EGP
  totalSpentUSD: number; // USD using historical exchange rate per ticket
  lifetimeSpendingTier: LifetimeSpendingTier;
  lastPurchaseDate?: string;
  favoriteGame?: string;
  purchasedGames: string[];
}

export class ProfileStatisticsService {
  /**
   * Determine Loyalty Tier based on total COMPLETED tickets count:
   * عادي: 1 – 9
   * فضي: 10 – 29
   * ذهبي: 30 – 99
   * VIP: 100+
   */
  public static calculateLoyaltyTier(completedTicketsCount: number): LoyaltyTier {
    if (completedTicketsCount >= 100) return 'vip';
    if (completedTicketsCount >= 30) return 'gold';
    if (completedTicketsCount >= 10) return 'silver';
    return 'normal';
  }

  /**
   * Determine Purchasing Power based on HIGHEST single completed transaction (in EGP):
   * عادي: 0 – 499 ج
   * متوسط: 500 – 1999 ج
   * قوي: 2000 – 4500 ج
   * حوت: أكثر من 4500 ج
   */
  public static calculatePurchasingPower(maxSingleOrderAmount: number): PurchasingPower {
    if (maxSingleOrderAmount > 4500) return 'whale';
    if (maxSingleOrderAmount >= 2000) return 'strong';
    if (maxSingleOrderAmount >= 500) return 'medium';
    return 'normal';
  }

  /**
   * Determine Lifetime Spending Tier based on TOTAL spending in USD (using historical ticket rates):
   * 🥉 برونز (Bronze): حتى 100 دولار
   * 🥈 فضي (Silver): من 101 إلى 500 دولار
   * 🥇 ذهبي (Gold): من 501 إلى 1500 دولار
   * 💎 بلاتينيوم (Platinum): أكثر من 1500 دولار
   */
  public static calculateLifetimeSpendingTier(totalSpentUSD: number): LifetimeSpendingTier {
    if (totalSpentUSD > 1500) return 'platinum';
    if (totalSpentUSD >= 501) return 'gold';
    if (totalSpentUSD >= 101) return 'silver';
    return 'bronze';
  }

  public static calculateLifetimeTier(totalSpentUSD: number): LifetimeSpendingTier {
    return this.calculateLifetimeSpendingTier(totalSpentUSD);
  }

  /**
   * Pure calculation function: calculates all metrics and tiers for a customer from their ticket history.
   * ONLY completed tickets (status === 'completed') are counted.
   */
  public static calculateMetrics(
    customer: Customer,
    allTickets: CustomerTicket[]
  ): CalculatedCustomerProfileMetrics {
    // Filter COMPLETED tickets belonging to this customer (by ID or Phone)
    const completedTickets = allTickets.filter(
      t =>
        (t.customerId === customer.id || (customer.phone && t.customerPhone === customer.phone)) &&
        t.status === 'completed'
    );

    const totalOrders = completedTickets.length;
    const loyaltyTier = this.calculateLoyaltyTier(totalOrders);

    let maxSingleOrderAmount = 0;
    let totalSpent = 0;
    let totalSpentUSD = 0;
    let latestPurchaseDate: string | undefined = undefined;
    let latestPurchaseTime = 0;

    const gameCounts = new Map<string, number>();
    const purchasedGamesSet = new Set<string>();

    completedTickets.forEach(ticket => {
      // 1. Transaction Amount in EGP
      const orderAmountEGP = ticket.receivedAmount || ticket.requiredAmount || ticket.totalProductsAmount || 0;
      if (orderAmountEGP > maxSingleOrderAmount) {
        maxSingleOrderAmount = orderAmountEGP;
      }
      totalSpent += orderAmountEGP;

      // 2. Historical USD Conversion using ticket pricing snapshot exchange rate
      const historicalRate =
        ticket.pricingSnapshot?.usdExchangeRateAtPurchase ||
        (ticket.pricingSnapshot?.grossSellingPriceUSD && orderAmountEGP > 0
          ? orderAmountEGP / ticket.pricingSnapshot.grossSellingPriceUSD
          : 50.0);

      const orderAmountUSD =
        ticket.pricingSnapshot?.grossSellingPriceUSD && ticket.pricingSnapshot.grossSellingPriceUSD > 0
          ? ticket.pricingSnapshot.grossSellingPriceUSD
          : orderAmountEGP > 0
          ? orderAmountEGP / historicalRate
          : 0;

      totalSpentUSD += orderAmountUSD;

      // 3. Latest Purchase Date
      const dateStr = ticket.completedAt || ticket.updatedAt || ticket.createdAt;
      if (dateStr) {
        const time = new Date(dateStr).getTime();
        if (time > latestPurchaseTime) {
          latestPurchaseTime = time;
          latestPurchaseDate = dateStr;
        }
      }

      // 4. Game Tracking
      if (ticket.gameName) {
        purchasedGamesSet.add(ticket.gameName);
        gameCounts.set(ticket.gameName, (gameCounts.get(ticket.gameName) || 0) + 1);
      }
      if (ticket.items && Array.isArray(ticket.items)) {
        ticket.items.forEach(item => {
          if (item.gameName) {
            purchasedGamesSet.add(item.gameName);
            gameCounts.set(item.gameName, (gameCounts.get(item.gameName) || 0) + 1);
          }
        });
      }
    });

    const purchasingPower = this.calculatePurchasingPower(maxSingleOrderAmount);
    const roundedSpentUSD = Math.round(totalSpentUSD * 100) / 100;
    const roundedSpentEGP = Math.round(totalSpent * 100) / 100;
    const lifetimeSpendingTier = this.calculateLifetimeSpendingTier(roundedSpentUSD);

    // Determine favorite game by highest frequency
    let favoriteGame = customer.favoriteGame;
    let maxGameCount = 0;
    gameCounts.forEach((count, game) => {
      if (count > maxGameCount) {
        maxGameCount = count;
        favoriteGame = game;
      }
    });

    return {
      totalOrders,
      loyaltyTier,
      maxSingleOrderAmount: Math.round(maxSingleOrderAmount * 100) / 100,
      purchasingPower,
      totalSpent: roundedSpentEGP,
      totalSpentUSD: roundedSpentUSD,
      lifetimeSpendingTier,
      lastPurchaseDate: latestPurchaseDate || customer.lastPurchaseDate,
      favoriteGame: favoriteGame || customer.favoriteGame || 'Free Fire',
      purchasedGames: Array.from(purchasedGamesSet)
    };
  }

  /**
   * Applies recalculated metrics to a Customer object and returns the updated customer.
   */
  public static applyMetrics(customer: Customer, allTickets: CustomerTicket[]): Customer {
    const metrics = this.calculateMetrics(customer, allTickets);
    return {
      ...customer,
      totalOrders: metrics.totalOrders,
      loyaltyTier: metrics.loyaltyTier,
      maxSingleOrderAmount: metrics.maxSingleOrderAmount,
      purchasingPower: metrics.purchasingPower,
      totalSpent: metrics.totalSpent,
      totalSpentUSD: metrics.totalSpentUSD,
      lifetimeSpendingTier: metrics.lifetimeSpendingTier,
      lastPurchaseDate: metrics.lastPurchaseDate,
      favoriteGame: metrics.favoriteGame,
      updatedAt: new Date().toISOString()
    };
  }
}
