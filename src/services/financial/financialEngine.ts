// =============================================================
// NZM JKR TOP UP ERP — Financial & Smart Pricing Engine V3.0
// Enterprise Financial Core (Single Source of Truth)
// =============================================================

import {
  PricingConfig,
  PricingCalculationInput,
  PricingBreakdown,
  TicketPricingSnapshot,
  PricingAuditLog,
  PricingSimulationInput
} from '../../types/pricing.types';
import { CustomerTicket, TicketItem, Customer } from '../../types/customer.types';
import { GameProduct, GameTreeItem } from '../../types/topup.types';
import { db } from '../../database/db';
import { eventBus, SYSTEM_EVENTS } from '../eventBus';
import { JKRWalletEngine } from './jkrWalletEngine';

const PRICING_CONFIG_KEY = 'nzm_jkr_central_pricing_config_v3';
const PRICING_AUDIT_LOG_KEY = 'nzm_jkr_pricing_audit_logs';

export const INITIAL_PRICING_CONFIG: PricingConfig = {
  id: 'cfg_pricing_v3',
  version: 1,
  rateUSD_EGP: 39.25,
  defaultProfitMarginPercent: 7, // P% = 7%
  fixedCostMode: 'manual',
  manualFixedCostEGP: 5.0,       // F = 5 EGP
  monthlyBreakEvenTargetOrders: 1500,
  currencyDisplay: 'EGP',
  minCashbackAmountEGP: 2.0,
  cashbackPercent: 1.0,          // 1%
  referralPercent: 2.0,          // 2%
  reservePercent: 0,           // 0%
  developmentPercent: 0,       // 0%
  offersPercent: 0,            // 0%
  safetyMarginPercent: 0,
  updatedAt: new Date().toISOString(),
  updatedBy: 'المدير العام (Owner)'
};

import { PricingEngine } from '../pricing/pricingEngine';

export class FinancialEngine {
  /**
   * Delegated to Engine ①: PricingEngine
   */
  public static getPricingConfig(): PricingConfig {
    return PricingEngine.getPricingConfig();
  }

  public static updatePricingConfig(
    updates: Partial<PricingConfig>,
    user?: { id?: string; fullName?: string; role?: string },
    reason?: string
  ): PricingConfig {
    return PricingEngine.updatePricingConfig(updates, user, reason);
  }

  public static calculateProductPricing(
    input: PricingCalculationInput,
    overrideConfig?: PricingConfig
  ): PricingBreakdown {
    return PricingEngine.calculateSellingPrice(input, overrideConfig);
  }

  /**
   * 4. GENERATE IMMUTABLE TICKET FINANCIAL SNAPSHOT
   */
  public static generateTicketSnapshot(
    ticketItems: TicketItem[],
    discountEGP = 0,
    user?: { fullName?: string }
  ): TicketPricingSnapshot {
    const config = this.getPricingConfig();

    let totalCostUSD = 0;
    let totalCostEGP = 0;
    let totalGrossSellingEGP = 0;
    let totalFixedCostEGP = 0;
    let totalCashbackEGP = 0;
    let totalReferralEGP = 0;
    let totalReserveEGP = 0;
    let totalDevEGP = 0;
    let totalOffersEGP = 0;
    let totalNetProfitEGP = 0;
    let totalMarkupEGP = 0;
    let effectiveLotRateSum = 0;
    let effectiveLotCount = 0;

    ticketItems.forEach(item => {
      const qty = item.quantity || 1;
      let prodCashback: boolean | undefined;
      let prodReferral: boolean | undefined;
      let matchedProd: any;
      if (item.productId || item.productName) {
        const games = db.getGameTree();
        for (const g of games) {
          const p = (g.products || []).find(prod => prod.id === item.productId || prod.name === item.productName);
          if (p) {
            matchedProd = p;
            prodCashback = p.isCashbackEnabled;
            prodReferral = p.isReferralEnabled;
            break;
          }
        }
      }

      // 🎯 True FIFO Cost Determination directly from linked Wallet Lots
      const walletId = item.walletTypeId || matchedProd?.primaryWalletId || matchedProd?.walletTypeId;
      const pts = matchedProd?.pointsCostPerUnit || 0;
      let itemCostUSD = 0;
      let itemCostEGP = 0;
      let itemLotRate = config.rateUSD_EGP;
      let resolvedViaFIFO = false;

      if (walletId && pts > 0) {
        const fifoInfo = JKRWalletEngine.getWalletEffectivePointCost(walletId, pts * qty);
        if (fifoInfo.totalCostEGP > 0) {
          itemCostUSD = fifoInfo.totalCostUSD;
          itemCostEGP = fifoInfo.totalCostEGP;
          itemLotRate = fifoInfo.effectiveExchangeRate;
          resolvedViaFIFO = true;
        }
      }

      if (!resolvedViaFIFO) {
        // Fallback: check deposit bonds or product costs
        if (walletId) {
          const bonds = db.getDepositBondsFIFO().filter(b => b.walletId === walletId && b.remainingUnits > 0);
          if (bonds.length > 0 && bonds[0].exchangeRateAtDeposit) {
            itemLotRate = bonds[0].exchangeRateAtDeposit;
          }
        }
        if (item.costPrice && item.costPrice > 0) {
          itemCostEGP = item.costPrice * qty;
          itemCostUSD = itemCostEGP / itemLotRate;
        } else if (matchedProd?.costUSD && matchedProd.costUSD > 0) {
          itemCostUSD = matchedProd.costUSD * qty;
          itemCostEGP = itemCostUSD * itemLotRate;
        } else if (matchedProd?.costPriceEGP && matchedProd.costPriceEGP > 0) {
          itemCostEGP = matchedProd.costPriceEGP * qty;
          itemCostUSD = itemCostEGP / itemLotRate;
        }
      }

      totalCostUSD += itemCostUSD;
      totalCostEGP += itemCostEGP;
      if (itemCostUSD > 0) {
        effectiveLotRateSum += itemLotRate * itemCostUSD;
        effectiveLotCount += itemCostUSD;
      }

      const b = this.calculateProductPricing({
        gameId: item.gameId,
        productId: item.productId,
        customCashbackPercent: item.cashbackPercent,
        customReferralPercent: item.referralPercent !== undefined ? item.referralPercent : 0,
        costUSD: itemCostUSD / qty,
        costEGP: itemCostEGP / qty,
        walletId: item.walletTypeId,
        isCashbackEnabled: prodCashback,
        isReferralEnabled: prodReferral
      });

      totalGrossSellingEGP += (item.unitPrice || b.finalSellingPriceEGP) * qty;
      totalFixedCostEGP += b.fixedCostPerOrderEGP * qty;
      totalMarkupEGP += b.targetMarkupEGP * qty;
      totalCashbackEGP += item.cashbackAmountEGP !== undefined ? item.cashbackAmountEGP : (b.cashbackAmountEGP * qty);
      totalReferralEGP += item.referralAmountEGP !== undefined ? item.referralAmountEGP : (b.referralAmountEGP * qty);
      totalReserveEGP += b.reserveAmountEGP * qty;
      totalDevEGP += b.developmentAmountEGP * qty;
      totalOffersEGP += b.offersAmountEGP * qty;
      totalNetProfitEGP += b.netRealizedCompanyProfitEGP * qty;
    });

    const netCollected = Math.max(0, totalGrossSellingEGP - discountEGP);
    const totalDeductions =
      totalCashbackEGP + totalReferralEGP;

    // Strict Approved Formula: Net Profit = Sale Price - FIFO Cost - Operating - Cashback - Referral
    const netCompanyProfitEGP = Math.round(
      (netCollected - totalCostEGP - totalFixedCostEGP - totalCashbackEGP - totalReferralEGP) * 100
    ) / 100;
    const netMarginPercent =
      netCollected > 0 ? Math.round((netCompanyProfitEGP / netCollected) * 1000) / 10 : 0;

    const weightedLotRate = effectiveLotCount > 0
      ? Math.round((effectiveLotRateSum / effectiveLotCount) * 100) / 100
      : (totalCostUSD > 0 ? Math.round((totalCostEGP / totalCostUSD) * 100) / 100 : config.rateUSD_EGP);

    return {
      snapshotId: 'snp_' + Date.now(),
      configVersion: config.version,
      calculatedAt: new Date().toISOString(),
      calculatedBy: user?.fullName || 'محرك التسعير V3.0',

      costUSD: Math.round(totalCostUSD * 1000) / 1000,
      costEGP: Math.round(totalCostEGP * 100) / 100,
      actualFIFOCostUSD: Math.round(totalCostUSD * 1000) / 1000,
      actualFIFOCostEGP: Math.round(totalCostEGP * 100) / 100,
      exchangeRateUsed: weightedLotRate,
      usdExchangeRateAtPurchase: weightedLotRate,

      profitMarginPercent: config.defaultProfitMarginPercent,
      targetMarkupEGP: Math.round(totalMarkupEGP * 100) / 100,
      fixedCostEGP: Math.round(totalFixedCostEGP * 100) / 100,

      cashbackPercent: ticketItems[0]?.cashbackPercent !== undefined 
        ? ticketItems[0].cashbackPercent 
        : (totalGrossSellingEGP > 0 ? Math.round((totalCashbackEGP / totalGrossSellingEGP) * 10000) / 100 : config.cashbackPercent),
      cashbackAmountEGP: Math.round(totalCashbackEGP * 100) / 100,
      referralPercent: config.referralPercent,
      referralAmountEGP: Math.round(totalReferralEGP * 100) / 100,
      reservePercent: config.reservePercent,
      reserveAmountEGP: Math.round(totalReserveEGP * 100) / 100,
      developmentPercent: config.developmentPercent,
      developmentAmountEGP: Math.round(totalDevEGP * 100) / 100,
      offersPercent: config.offersPercent,
      offersAmountEGP: Math.round(totalOffersEGP * 100) / 100,
      totalDeductionsEGP: Math.round(totalDeductions * 100) / 100,

      grossSellingPriceEGP: Math.round(totalGrossSellingEGP * 100) / 100,
      grossSellingPriceUSD: Math.round((totalGrossSellingEGP / weightedLotRate) * 100) / 100,
      appliedDiscountEGP: discountEGP,
      netCollectedFromCustomerEGP: Math.round(netCollected * 100) / 100,
      netCompanyProfitEGP,
      netProfitEGP: netCompanyProfitEGP,
      netMarginPercent,

      distributionSummary: {
        inventoryCost: Math.round(totalCostEGP * 100) / 100,
        operatingExpenses: Math.round(totalFixedCostEGP * 100) / 100,
        cashbackLiability: Math.round(totalCashbackEGP * 100) / 100,
        referralLiability: Math.round(totalReferralEGP * 100) / 100,
        reserveFund: Math.round(totalReserveEGP * 100) / 100,
        developmentFund: Math.round(totalDevEGP * 100) / 100,
        offersFund: Math.round(totalOffersEGP * 100) / 100,
        netRetainedProfit: netCompanyProfitEGP
      }
    };
  }

  /**
   * 5. SETTLE CLOSED TICKET (Money Allocation & Ledger Posting)
   */
  public static processTicketSettlement(
    ticket: CustomerTicket,
    user?: { fullName?: string }
  ): void {
    const snapshot =
      ticket.pricingSnapshot ||
      this.generateTicketSnapshot(ticket.items, ticket.couponDiscountAmount || 0, user);



    // 2. Credit Cashback to customer wallet
    if (snapshot.cashbackAmountEGP > 0 && ticket.customerId) {
      const customers = db.getCustomers();
      const cust = customers.find(c => c.id === ticket.customerId || c.phone === ticket.customerPhone);
      if (cust) {
        cust.cashbackBalance = (cust.cashbackBalance || 0) + snapshot.cashbackAmountEGP;
        cust.totalCashbackEarned = (cust.totalCashbackEarned || 0) + snapshot.cashbackAmountEGP;
        cust.totalSpent = (cust.totalSpent || 0) + ticket.requiredAmount;
        cust.totalOrders = (cust.totalOrders || 0) + 1;
        cust.lastPurchaseDate = new Date().toISOString();
        db.saveCustomer(cust);
      }
    }

    // 3. Credit Referral Commission to Referrer if applicable
    if (snapshot.referralAmountEGP > 0 && ticket.customerId) {
      const customers = db.getCustomers();
      const currentCust = customers.find(c => c.id === ticket.customerId || c.phone === ticket.customerPhone);
      if (currentCust?.referredByCode) {
        const referrer = customers.find(c => c.referralCode === currentCust.referredByCode);
        if (referrer) {
          referrer.referralWalletBalance = (referrer.referralWalletBalance || 0) + snapshot.referralAmountEGP;
          referrer.totalReferralCommissionEarned = (referrer.totalReferralCommissionEarned || 0) + snapshot.referralAmountEGP;
          db.saveCustomer(referrer);
        }
      }
    }

    // 4. Update Main Vault Transactions
    db.addSafeTransaction(
      'cash_in',
      ticket.requiredAmount,
      'sales',
      `تحصيل فاتورة شحن #${ticket.ticketNumber} (${ticket.customerName})`,
      user?.fullName || 'محرك التسعير الآلي',
      ticket.id
    );

    // Save final ticket with immutable snapshot
    ticket.pricingSnapshot = snapshot;
    db.saveTicket(ticket);
  }

  /**
   * 6. RECALCULATE ALL CATALOG PRODUCTS AUTOMATICALLY
   */
  public static recalculateAllCatalogProducts(config?: PricingConfig): void {
    PricingEngine.recalculateAllCatalogProducts(config);
  }

  /**
   * 6.5. GET EFFECTIVE PRODUCT SELLING PRICE
   */
  public static getEffectiveProductPrice(
    prod: GameProduct,
    options?: { isDealer?: boolean; ticketType?: string }
  ): number {
    return PricingEngine.getEffectiveProductPrice(prod, options);
  }

  /**
   * 7. PRICING SIMULATOR (Sandbox for Admin without saving)
   */
  public static simulatePricing(sim: PricingSimulationInput): PricingBreakdown {
    const tempConfig: PricingConfig = {
      ...INITIAL_PRICING_CONFIG,
      rateUSD_EGP: sim.usdRate,
      defaultProfitMarginPercent: sim.profitMarginPercent,
      manualFixedCostEGP: sim.fixedCostEGP,
      cashbackPercent: sim.cashbackPercent,
      referralPercent: sim.referralPercent,
      reservePercent: sim.reservePercent,
      developmentPercent: sim.developmentPercent,
      offersPercent: sim.offersPercent
    };

    return this.calculateProductPricing(
      {
        costEGP: sim.costEGP,
        costUSD: sim.costUSD,
        customProfitMarginPercent: sim.profitMarginPercent
      },
      tempConfig
    );
  }

  /**
   * Helper: Audit Logs Management
   */
  public static getPricingAuditLogs(): PricingAuditLog[] {
    try {
      const data = localStorage.getItem(PRICING_AUDIT_LOG_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return [];
  }

  private static savePricingAuditLogs(logs: PricingAuditLog[]): void {
    try {
      localStorage.setItem(PRICING_AUDIT_LOG_KEY, JSON.stringify(logs));
    } catch (e) {}
  }

  private static getSettingArabicLabel(key: string): string {
    const map: Record<string, string> = {
      rateUSD_EGP: 'سعر صرف USDT مقابل الجنيه',
      defaultProfitMarginPercent: 'هامش الربح الافتراضي (P%)',
      fixedCostMode: 'وضع التكلفة الثابتة (F)',
      manualFixedCostEGP: 'التكلفة التشغيلية الثابتة للطلب (F)',
      monthlyBreakEvenTargetOrders: 'تارجت الطلبات الشهري لنقطة التعادل',
      cashbackPercent: 'نسبة الكاش باك (Cashback %)',
      referralPercent: 'نسبة عمولة الشريك والإحالة (Referral %)',
      reservePercent: 'نسبة احتياطي الطوارئ والمخاطر (Reserve %)',
      developmentPercent: 'نسبة صندوق التطوير والتقنية (Dev %)',
      offersPercent: 'نسبة صندوق العروض والتسويق (Offers %)',
      minCashbackAmountEGP: 'الحد الأدنى للكاش باك'
    };
    return map[key] || key;
  }
}
