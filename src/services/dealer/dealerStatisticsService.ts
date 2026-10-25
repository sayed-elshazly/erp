import { Dealer, LoyaltyTier, PurchasingPower, LifetimeSpendingTier } from '../../types/dealer.types';
import { CustomerTicket } from '../../types/customer.types';

export interface CalculatedDealerProfileMetrics {
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

export class DealerStatisticsService {
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
   * Determine Purchasing Power based on HIGHEST single completed wholesale transaction (in EGP):
   * عادي: 0 – 1999 ج
   * متوسط: 2000 – 4999 ج
   * قوي: 5000 – 9999 ج
   * حوت: أكثر من 10000 ج
   */
  public static calculatePurchasingPower(maxSingleOrderAmount: number): PurchasingPower {
    if (maxSingleOrderAmount >= 10000) return 'whale';
    if (maxSingleOrderAmount >= 5000) return 'strong';
    if (maxSingleOrderAmount >= 2000) return 'medium';
    return 'normal';
  }

  /**
   * Determine Lifetime Spending Tier based on TOTAL spending in USD:
   * 🥉 برونز (Bronze): حتى 500 دولار
   * 🥈 فضي (Silver): من 501 إلى 2000 دولار
   * 🥇 ذهبي (Gold): من 2001 إلى 5000 دولار
   * 💎 بلاتينيوم (Platinum): أكثر من 5000 دولار
   */
  public static calculateLifetimeSpendingTier(totalSpentUSD: number): LifetimeSpendingTier {
    if (totalSpentUSD > 5000) return 'platinum';
    if (totalSpentUSD >= 2001) return 'gold';
    if (totalSpentUSD >= 501) return 'silver';
    return 'bronze';
  }

  /**
   * Pure calculation function: calculates all metrics and tiers for a dealer from their ticket history.
   */
  public static calculateMetrics(
    dealer: Dealer,
    allTickets: CustomerTicket[]
  ): CalculatedDealerProfileMetrics {
    // Filter COMPLETED tickets belonging to this dealer (by ID or Phone)
    const completedTickets = allTickets.filter(
      t =>
        (t.customerId === dealer.id || (dealer.phone && t.customerPhone === dealer.phone)) &&
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

      // 2. Historical USD Conversion
      const historicalRate =
        ticket.pricingSnapshot?.usdExchangeRateAtPurchase ||
        (ticket.pricingSnapshot?.grossSellingPriceUSD && orderAmountEGP > 0
          ? orderAmountEGP / ticket.pricingSnapshot.grossSellingPriceUSD
          : 50.0);

      const orderAmountUSD =
        ticket.pricingSnapshot?.grossSellingPriceUSD ||
        (historicalRate > 0 ? orderAmountEGP / historicalRate : orderAmountEGP / 50.0);
      totalSpentUSD += orderAmountUSD;

      // 3. Track last purchase date
      const ticketDate = ticket.completedAt || ticket.updatedAt || ticket.createdAt;
      if (ticketDate) {
        const time = new Date(ticketDate).getTime();
        if (time > latestPurchaseTime) {
          latestPurchaseTime = time;
          latestPurchaseDate = ticketDate;
        }
      }

      // 4. Track games purchased
      if (ticket.gameName) {
        purchasedGamesSet.add(ticket.gameName);
        gameCounts.set(ticket.gameName, (gameCounts.get(ticket.gameName) || 0) + 1);
      }
      if (ticket.items && ticket.items.length > 0) {
        ticket.items.forEach(item => {
          if (item.gameName) {
            purchasedGamesSet.add(item.gameName);
            gameCounts.set(item.gameName, (gameCounts.get(item.gameName) || 0) + (item.quantity || 1));
          }
        });
      }
    });

    // 5. Determine Favorite Game
    let favoriteGame: string | undefined = undefined;
    let maxGameCount = 0;
    gameCounts.forEach((count, game) => {
      if (count > maxGameCount) {
        maxGameCount = count;
        favoriteGame = game;
      }
    });

    const purchasingPower = this.calculatePurchasingPower(maxSingleOrderAmount);
    const lifetimeSpendingTier = this.calculateLifetimeSpendingTier(totalSpentUSD);

    return {
      totalOrders,
      loyaltyTier,
      maxSingleOrderAmount: Math.round(maxSingleOrderAmount * 100) / 100,
      purchasingPower,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalSpentUSD: Math.round(totalSpentUSD * 100) / 100,
      lifetimeSpendingTier,
      lastPurchaseDate: latestPurchaseDate || dealer.lastPurchaseDate,
      favoriteGame: favoriteGame || dealer.favoriteGame,
      purchasedGames: Array.from(purchasedGamesSet)
    };
  }

  /**
   * Applies calculated metrics directly onto a Dealer object.
   */
  public static applyMetrics(dealer: Dealer, allTickets: CustomerTicket[]): Dealer {
    const metrics = this.calculateMetrics(dealer, allTickets);
    return {
      ...dealer,
      totalOrders: metrics.totalOrders,
      loyaltyTier: metrics.loyaltyTier,
      maxSingleOrderAmount: metrics.maxSingleOrderAmount,
      purchasingPower: metrics.purchasingPower,
      totalSpent: metrics.totalSpent,
      totalSpentUSD: metrics.totalSpentUSD,
      lifetimeSpendingTier: metrics.lifetimeSpendingTier,
      lastPurchaseDate: metrics.lastPurchaseDate,
      favoriteGame: metrics.favoriteGame
    };
  }
}
