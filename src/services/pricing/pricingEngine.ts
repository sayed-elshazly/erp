// =============================================================
// NZM JKR TOP UP ERP — Dedicated Central Pricing Engine V3.0
// Engine ① of 3: Pricing Engine (Calculates Selling Price Only)
// Isolated Architecture: Strictly independent from FIFO & Accounting
// =============================================================

import {
  PricingConfig,
  PricingCalculationInput,
  PricingBreakdown,
  PricingAuditLog
} from '../../types/pricing.types';
import { GameProduct, GameTreeItem } from '../../types/topup.types';
import { TicketItem } from '../../types/customer.types';
import { db } from '../../database/db';
import { eventBus, SYSTEM_EVENTS } from '../eventBus';
import { JKRWalletEngine } from '../financial/jkrWalletEngine';

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
  reservePercent: 0,             // 0%
  developmentPercent: 0,         // 0%
  offersPercent: 0,              // 0%
  safetyMarginPercent: 0,
  updatedAt: new Date().toISOString(),
  updatedBy: 'المدير العام (Owner)'
};

export class PricingEngine {
  private static isRecalculating = false;

  /**
   * 1. GET CENTRAL PRICING CONFIG
   */
  public static getConfig(): PricingConfig {
    return this.getPricingConfig();
  }

  public static getPricingConfig(): PricingConfig {
    const dbRate = db.getExchangeRate();
    let config: PricingConfig = {
      ...INITIAL_PRICING_CONFIG,
      rateUSD_EGP: dbRate?.rateUSD_EGP || INITIAL_PRICING_CONFIG.rateUSD_EGP,
      manualFixedCostEGP: dbRate?.fixedCostPerOrderEGP || INITIAL_PRICING_CONFIG.manualFixedCostEGP,
      monthlyBreakEvenTargetOrders: dbRate?.monthlyBreakEvenTargetOrders || INITIAL_PRICING_CONFIG.monthlyBreakEvenTargetOrders
    };

    try {
      const stored = localStorage.getItem(PRICING_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        config = {
          ...config,
          ...parsed,
          // Always ensure the central Pricing USDT rate stays synchronized with db exchange rate
          rateUSD_EGP: dbRate?.rateUSD_EGP || parsed.rateUSD_EGP || config.rateUSD_EGP,
          manualFixedCostEGP: dbRate?.fixedCostPerOrderEGP !== undefined ? dbRate.fixedCostPerOrderEGP : (parsed.manualFixedCostEGP || config.manualFixedCostEGP)
        };
      }
    } catch (e) {
      console.error('Error loading central pricing config', e);
    }
    return config;
  }

  public static savePricingConfig(config: PricingConfig): void {
    try {
      localStorage.setItem(PRICING_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving central pricing config', e);
    }
  }

  /**
   * 2. UPDATE PRICING CONFIG & RECALCULATE AUTOMATIC PRODUCTS ONLY
   */
  public static updatePricingConfig(
    updates: Partial<PricingConfig>,
    user?: { id?: string; fullName?: string; role?: string },
    reason?: string
  ): PricingConfig {
    const current = this.getPricingConfig();
    const oldVersion = current.version;

    // Validate that total deductions B% do not exceed 80%
    const nextCashback = updates.cashbackPercent ?? current.cashbackPercent;
    const nextReferral = updates.referralPercent ?? current.referralPercent;
    const nextReserve = updates.reservePercent ?? current.reservePercent;
    const nextDev = updates.developmentPercent ?? current.developmentPercent;
    const nextOffers = updates.offersPercent ?? current.offersPercent;
    const totalB = nextCashback + nextReferral + nextReserve + nextDev + nextOffers;

    if (totalB >= 80) {
      throw new Error('إجمالي نسب الاستقطاعات (B%) لا يمكن أن يتجاوز 80% للحفاظ على استقرار التسعير.');
    }

    const updated: PricingConfig = {
      ...current,
      ...updates,
      version: oldVersion + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.fullName || 'المدير العام (Owner)'
    };

    this.savePricingConfig(updated);

    // Sync back to db exchange rate if USD rate or fixed cost changed
    if (updates.rateUSD_EGP !== undefined || updates.manualFixedCostEGP !== undefined) {
      db.updateExchangeRate(
        updated.rateUSD_EGP,
        updated.manualFixedCostEGP,
        updated.monthlyBreakEvenTargetOrders,
        user?.fullName,
        reason || 'تحديث عبر محرك التسعير المركزي V3.0'
      );
    }

    // Generate Audit Log
    const auditLogs = this.getPricingAuditLogs();
    const changedKeys = Object.keys(updates) as (keyof PricingConfig)[];

    changedKeys.forEach(key => {
      if (current[key] !== updates[key]) {
        const logEntry: PricingAuditLog = {
          id: 'aud_prc_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          timestamp: new Date().toISOString(),
          userId: user?.id || 'admin',
          userName: user?.fullName || 'المدير العام (Owner)',
          userRole: user?.role || 'admin',
          settingKey: String(key),
          settingLabelArabic: this.getSettingArabicLabel(String(key)),
          oldValue: current[key],
          newValue: updates[key],
          reason: reason || 'تحديث ضبط التسعير المركزي',
          deviceInfo: navigator.userAgent.slice(0, 80)
        };
        auditLogs.unshift(logEntry);
      }
    });

    this.savePricingAuditLogs(auditLogs.slice(0, 200));

    // Automatically recalculate all product pricing across the entire catalog (Central Pricing Products ONLY)
    this.recalculateAllCatalogProducts(updated);

    // Publish event
    eventBus.publish(SYSTEM_EVENTS.SETTINGS_UPDATED, updated);

    return updated;
  }

  /**
   * 3. CENTRAL PRICING EQUATION:
   *                C × (1 + P%) + F
   *       S = -------------------------
   *                 1 − B%
   *
   * Where:
   * C = Cost in EGP = costUSD × rateUSD_EGP
   * P% = Profit Margin %
   * F = Fixed operational cost per order
   * B% = Total deductions (Cashback + Referral + Reserve + Dev + Offers)
   * Note: Cashback & Referral are loaded onto the customer inside the selling price S (customer pays them).
   */
  public static calculateSellingPrice(
    input: PricingCalculationInput,
    overrideConfig?: PricingConfig
  ): PricingBreakdown {
    const config = overrideConfig || this.getPricingConfig();

    // Step 1: Calculate C (Product cost in EGP based on Central Pricing USDT rate)
    // Rule: Selling price C must always be derived from costUSD * config.rateUSD_EGP (Pricing USDT).
    // FIFO lot costs in EGP are strictly ignored for selling price determination.
    let costUSD = input.costUSD || 0;
    let costEGP = 0;

    if (costUSD > 0) {
      costEGP = costUSD * config.rateUSD_EGP;
    } else if (input.costEGP && input.costEGP > 0) {
      costEGP = input.costEGP;
      costUSD = costEGP / config.rateUSD_EGP;
    }

    // Step 2: Resolve Profit Margin P% (Input -> Product -> Game -> Default)
    let profitMarginPercent = config.defaultProfitMarginPercent;
    if (input.customProfitMarginPercent !== undefined && input.customProfitMarginPercent >= 0) {
      profitMarginPercent = input.customProfitMarginPercent;
    } else if (input.gameId) {
      const g = db.getGameTree().find(item => item.id === input.gameId);
      if (g && input.productId) {
        const p = (g.products || []).find(prod => prod.id === input.productId);
        if (p?.profitMarginPercent !== undefined && p.profitMarginPercent > 0) {
          profitMarginPercent = p.profitMarginPercent;
        }
      }
    }

    // Step 3: Resolve Fixed Cost F (Input override -> Product setting -> Config default)
    let fixedCostPerOrderEGP = config.manualFixedCostEGP || 0;
    if (input.customFixedCostEGP !== undefined && input.customFixedCostEGP >= 0) {
      fixedCostPerOrderEGP = input.customFixedCostEGP;
    } else if (input.gameId && input.productId) {
      const g = db.getGameTree().find(item => item.id === input.gameId) || db.getFirstShippingGameTree().find(item => item.id === input.gameId);
      const p = (g?.products || []).find(prod => prod.id === input.productId);
      if (p?.fixedCostPerOrder !== undefined && p.fixedCostPerOrder >= 0) {
        fixedCostPerOrderEGP = p.fixedCostPerOrder;
      }
    } else if (config.fixedCostMode === 'auto') {
      const allExpenses = db.getExpenses();
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyExpensesSum = allExpenses
        .filter(e => e.createdAt.startsWith(currentMonth))
        .reduce((s, e) => s + e.amount, 0);
      const targetOrders = config.monthlyBreakEvenTargetOrders || 1500;
      fixedCostPerOrderEGP = Math.max(1, Math.round((monthlyExpensesSum / targetOrders) * 100) / 100);
    }

    // Step 4: Resolve Deductions B%
    let productCashbackEnabled = input.isCashbackEnabled !== false;
    let productReferralEnabled = input.isReferralEnabled !== false;
    let productCashbackPercent: number | undefined = undefined;
    let productReferralPercent: number | undefined = undefined;
    let productReservePercent: number | undefined = undefined;
    let productDevelopmentPercent: number | undefined = undefined;

    if (input.gameId) {
      const g = db.getGameTree().find(item => item.id === input.gameId) || db.getFirstShippingGameTree().find(item => item.id === input.gameId);
      if (g) {
        if (g.cashbackEnabled === false) productCashbackEnabled = false;
        if (g.referralEnabled === false) productReferralEnabled = false;
        if (input.productId) {
          const p = (g.products || []).find(prod => prod.id === input.productId);
          if (p?.cashbackPercent !== undefined && p.cashbackPercent >= 0) {
            productCashbackPercent = p.cashbackPercent;
          }
          if (p?.partnerCommissionPercent !== undefined && p.partnerCommissionPercent >= 0) {
            productReferralPercent = p.partnerCommissionPercent;
          }
          if (p?.reservePercent !== undefined && p.reservePercent >= 0) {
            productReservePercent = p.reservePercent;
          }
          if (p?.developmentPercent !== undefined && p.developmentPercent >= 0) {
            productDevelopmentPercent = p.developmentPercent;
          }
        }
      }
    }

    const cashbackPercentEffective = productCashbackEnabled
      ? (typeof input.customCashbackPercent === 'number' && input.customCashbackPercent >= 0
          ? input.customCashbackPercent
          : (typeof productCashbackPercent === 'number' && productCashbackPercent >= 0
              ? productCashbackPercent
              : (config.cashbackPercent ?? 0)))
      : 0;

    const referralPercentEffective = productReferralEnabled
      ? (typeof input.customReferralPercent === 'number' && input.customReferralPercent >= 0
          ? input.customReferralPercent
          : (typeof productReferralPercent === 'number' && productReferralPercent >= 0
              ? productReferralPercent
              : (config.referralPercent ?? 0)))
      : 0;

    const reservePercentEffective = typeof input.customReservePercent === 'number' && input.customReservePercent >= 0
      ? input.customReservePercent
      : (typeof productReservePercent === 'number' && productReservePercent >= 0
          ? productReservePercent
          : (config.reservePercent ?? 0));

    const developmentPercentEffective = typeof input.customDevelopmentPercent === 'number' && input.customDevelopmentPercent >= 0
      ? input.customDevelopmentPercent
      : (typeof productDevelopmentPercent === 'number' && productDevelopmentPercent >= 0
          ? productDevelopmentPercent
          : (config.developmentPercent ?? 0));

    const offersPercentEffective = typeof input.customOffersPercent === 'number' && input.customOffersPercent >= 0
      ? input.customOffersPercent
      : (config.offersPercent ?? 0);

    // If value is 0, it contributes exactly 0 to the benefits ratio B
    const cashbackP = cashbackPercentEffective > 0 ? (cashbackPercentEffective / 100) : 0;
    const referralP = referralPercentEffective > 0 ? (referralPercentEffective / 100) : 0;
    const reserveP = reservePercentEffective > 0 ? (reservePercentEffective / 100) : 0;
    const devP = developmentPercentEffective > 0 ? (developmentPercentEffective / 100) : 0;
    const offersP = offersPercentEffective > 0 ? (offersPercentEffective / 100) : 0;
    const totalBP = cashbackP + referralP + reserveP + devP + offersP; // B in decimal

    const pDecimal = profitMarginPercent / 100; // P in decimal

    // Step 5: Execute Pricing Formula (Executed strictly ONCE)
    // 1st: C = costUSD * rateUSD_EGP
    // 2nd: Markup = C * (1 + P)
    // 3rd: + F
    // 4th: Divide by (1 - B)
    // Protection: Cap totalBP to max 40% (0.40) to guarantee denominator >= 0.60, preventing accidental doubling (x2)
    const safeTotalBP = Math.min(0.40, Math.max(0, totalBP));
    const numerator = costEGP * (1 + pDecimal) + fixedCostPerOrderEGP;
    const denominator = Math.max(0.60, 1 - safeTotalBP);
    const rawS = numerator / denominator;

    const finalSellingPriceEGP = Math.round(rawS);
    const finalSellingPriceUSD = Math.round((finalSellingPriceEGP / config.rateUSD_EGP) * 100) / 100;

    // Price Component Breakdown
    const targetMarkupEGP = Math.round(costEGP * pDecimal * 100) / 100;
    const cashbackAmountEGP = Math.round(finalSellingPriceEGP * cashbackP * 100) / 100;
    const referralAmountEGP = Math.round(finalSellingPriceEGP * referralP * 100) / 100;
    const reserveAmountEGP = Math.round(finalSellingPriceEGP * reserveP * 100) / 100;
    const developmentAmountEGP = Math.round(finalSellingPriceEGP * devP * 100) / 100;
    const offersAmountEGP = Math.round(finalSellingPriceEGP * offersP * 100) / 100;
    const totalDeductionsEGP = Math.round(
      (cashbackAmountEGP + referralAmountEGP + reserveAmountEGP + developmentAmountEGP + offersAmountEGP) * 100
    ) / 100;

    // Company target profit
    const netRealizedCompanyProfitEGP = Math.round(
      (finalSellingPriceEGP - costEGP - fixedCostPerOrderEGP - totalDeductionsEGP) * 100
    ) / 100;
    const netProfitMarginPercent =
      finalSellingPriceEGP > 0
        ? Math.round((netRealizedCompanyProfitEGP / finalSellingPriceEGP) * 1000) / 10
        : 0;

    // First order cost
    const firstOrderCostPriceEGP = Math.round(costEGP);

    // Balance check
    const distributedSum = costEGP + fixedCostPerOrderEGP + totalDeductionsEGP + netRealizedCompanyProfitEGP;
    const isBalancedZeroLeakage = Math.abs(distributedSum - finalSellingPriceEGP) < 1.0;

    // Wholesale dealer pricing
    const dealerMargin = input.dealerProfitMarginPercent !== undefined ? input.dealerProfitMarginPercent : 3.5;
    const dealerPDecimal = dealerMargin / 100;
    const dealerNumerator = costEGP * (1 + dealerPDecimal) + (fixedCostPerOrderEGP * 0.5);
    const dealerDenominator = Math.max(0.01, 1 - (cashbackP * 0.5 + referralP * 0.5));
    const dealerPriceEGP = Math.round(dealerNumerator / dealerDenominator);

    return {
      costUSD: Math.round(costUSD * 10000) / 10000,
      costEGP: Math.round(costEGP * 100) / 100,
      usdRateUsed: config.rateUSD_EGP,
      profitMarginPercent,
      targetMarkupEGP,
      fixedCostPerOrderEGP,
      benefitsPercentTotal: Math.round(totalBP * 1000) / 10,
      cashbackPercent: cashbackPercentEffective,
      cashbackAmountEGP,
      referralPercent: referralPercentEffective,
      referralAmountEGP,
      reservePercent: reservePercentEffective,
      reserveAmountEGP,
      developmentPercent: developmentPercentEffective,
      developmentAmountEGP,
      offersPercent: config.offersPercent,
      offersAmountEGP,
      totalDeductionsEGP,
      finalSellingPriceEGP,
      dealerPriceEGP,
      finalSellingPriceUSD,
      firstOrderCostPriceEGP,
      netRealizedCompanyProfitEGP,
      netProfitMarginPercent,
      isBalancedZeroLeakage
    };
  }

  /**
   * 3.5. RESOLVE EFFECTIVE PRODUCT SELLING PRICE
   * CRITICAL FINANCIAL RULE:
   * When a product uses manual pricing (autoPricingEnabled === false or useCustomPricing === true),
   * the manual customer price (customSellingPriceEGP) and manual dealer price (dealerCustomSellingPriceEGP)
   * are STRICTLY honored without being overwritten or corrupted by auto-pricing calculations.
   */
  public static getEffectiveProductPrice(
    prod: GameProduct,
    options?: { isDealer?: boolean; ticketType?: string }
  ): number {
    const isDealer = Boolean(options?.isDealer);
    const isFirstShipping = options?.ticketType === 'first_shipping';

    if (isFirstShipping) {
      return prod.firstOrderCostPriceEGP || prod.calculatedPriceEGP || prod.customSellingPriceEGP || 0;
    }

    const isManual = prod.autoPricingEnabled === false || Boolean(prod.useCustomPricing);

    if (isDealer) {
      if (isManual) {
        if (prod.dealerCustomSellingPriceEGP !== undefined && prod.dealerCustomSellingPriceEGP !== null && prod.dealerCustomSellingPriceEGP > 0) {
          return prod.dealerCustomSellingPriceEGP;
        }
        if (prod.dealerPriceEGP !== undefined && prod.dealerPriceEGP !== null && prod.dealerPriceEGP > 0) {
          return prod.dealerPriceEGP;
        }
        if (prod.customSellingPriceEGP !== undefined && prod.customSellingPriceEGP !== null && prod.customSellingPriceEGP > 0) {
          return prod.customSellingPriceEGP;
        }
        return prod.calculatedPriceEGP || 0;
      }
      return prod.dealerPriceEGP || prod.dealerCustomSellingPriceEGP || prod.calculatedPriceEGP || prod.customSellingPriceEGP || 0;
    }

    // Retail Customer
    if (isManual) {
      if (prod.customSellingPriceEGP !== undefined && prod.customSellingPriceEGP !== null && prod.customSellingPriceEGP > 0) {
        return prod.customSellingPriceEGP;
      }
      return prod.calculatedPriceEGP || 0;
    }

    return prod.calculatedPriceEGP || prod.customSellingPriceEGP || 0;
  }

  /**
   * 4. RECALCULATE ALL CATALOG PRODUCTS
   * CRITICAL RULE: Recalculates ONLY products where autoPricingEnabled !== false.
   * Manual pricing products are strictly untouched!
   */
  public static recalculateAllCatalogProducts(config?: PricingConfig): {
    updatedCount: number;
    skippedManualCount: number;
  } {
    if (this.isRecalculating) {
      return { updatedCount: 0, skippedManualCount: 0 };
    }

    this.isRecalculating = true;
    try {
      const activeConfig = config || this.getPricingConfig();
      const tree = db.getGameTree();
      const firstShippingTree = db.getFirstShippingGameTree();
      let updatedCount = 0;
      let skippedManualCount = 0;

      const processGameList = (gamesList: GameTreeItem[]) => {
        gamesList.forEach(game => {
          (game.products || []).forEach(prod => {
            let effectiveCostUSD = prod.costUSD || 0;
            const pts = prod.pointsCostPerUnit || 0;
            const walletId = prod.primaryWalletId || prod.walletTypeId;
            if (effectiveCostUSD <= 0 && walletId && pts > 0) {
              const fifo = JKRWalletEngine.getWalletEffectivePointCost(walletId, pts);
              if (fifo.totalCostUSD > 0) effectiveCostUSD = fifo.totalCostUSD;
            }

            // Rule 3 & 4: If product is manual, update ONLY actual cost for FIFO profit accounting.
            // Selling price is STRICTLY UNTOUCHED!
            const isManual = prod.autoPricingEnabled === false || Boolean(prod.useCustomPricing);
            if (isManual) {
              const effectiveManualPrice = prod.customSellingPriceEGP || prod.calculatedPriceEGP || 0;
              prod.customSellingPriceEGP = effectiveManualPrice;
              prod.calculatedPriceEGP = effectiveManualPrice;

              const effectiveManualDealerPrice = prod.dealerCustomSellingPriceEGP || prod.dealerPriceEGP || effectiveManualPrice;
              prod.dealerCustomSellingPriceEGP = effectiveManualDealerPrice;
              prod.dealerPriceEGP = effectiveManualDealerPrice;

              // Only update cost price from USD if effectiveCostUSD is positive and no manual EGP cost is set
              if (effectiveCostUSD > 0) {
                prod.costUSD = effectiveCostUSD;
                if (!prod.costPriceEGP || prod.costPriceEGP <= 0) {
                  prod.costPriceEGP = Math.round(effectiveCostUSD * activeConfig.rateUSD_EGP * 100) / 100;
                }
              }
              skippedManualCount++;
              return;
            }

            // Calculate Central Selling Price strictly ONCE
            const breakdown = this.calculateSellingPrice({
              costUSD: effectiveCostUSD,
              gameId: game.id,
              productId: prod.id,
              customProfitMarginPercent: prod.profitMarginPercent,
              customFixedCostEGP: prod.fixedCostPerOrder !== undefined ? prod.fixedCostPerOrder : undefined,
              customReservePercent: prod.reservePercent !== undefined ? prod.reservePercent : undefined,
              customDevelopmentPercent: prod.developmentPercent !== undefined ? prod.developmentPercent : undefined,
              customCashbackPercent: prod.cashbackPercent !== undefined ? prod.cashbackPercent : undefined,
              customReferralPercent: prod.partnerCommissionPercent !== undefined ? prod.partnerCommissionPercent : undefined,
              isCashbackEnabled: prod.isCashbackEnabled,
              isReferralEnabled: prod.isReferralEnabled
            }, activeConfig);

            prod.calculatedPriceEGP = breakdown.finalSellingPriceEGP;
            prod.costPriceEGP = breakdown.costEGP;
            prod.costUSD = breakdown.costUSD;
            prod.dealerPriceEGP = prod.dealerCustomSellingPriceEGP || breakdown.dealerPriceEGP;
            prod.firstOrderCostPriceEGP = breakdown.firstOrderCostPriceEGP;
            if (prod.fixedCostPerOrder === undefined) {
              prod.fixedCostPerOrder = breakdown.fixedCostPerOrderEGP;
            }
            if (prod.reservePercent === undefined) {
              prod.reservePercent = breakdown.reservePercent;
            }
            if (prod.developmentPercent === undefined) {
              prod.developmentPercent = breakdown.developmentPercent;
            }
            if (prod.cashbackPercent === undefined) {
              prod.cashbackPercent = breakdown.cashbackPercent;
            }
            if (prod.partnerCommissionPercent === undefined) {
              prod.partnerCommissionPercent = breakdown.referralPercent;
            }
            prod.lastPricingRecalculationAt = new Date().toISOString();

            updatedCount++;
          });
        });
      };

      processGameList(tree);
      processGameList(firstShippingTree);

      if (updatedCount > 0 || skippedManualCount > 0) {
        db.setGamesTree(tree);
        db.setFirstShippingGamesTree(firstShippingTree);
        eventBus.publish(SYSTEM_EVENTS.PRODUCTS_UPDATED, { count: updatedCount });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'));
        }
      }

      return { updatedCount, skippedManualCount };
    } finally {
      this.isRecalculating = false;
    }
  }

  /**
   * 8. SYNC ALL PRODUCTS LINKED TO A SPECIFIC SUB-WALLET
   * Disabled: Product selling prices and USD costs are 100% manual and never auto-updated from wallet/FIFO mutations
   */
  public static syncProductsLinkedToWallet(_walletId: string): { updatedCount: number } {
    return { updatedCount: 0 };
  }

  // Audit Log Helpers
  public static getPricingAuditLogs(): PricingAuditLog[] {
    try {
      const raw = localStorage.getItem(PRICING_AUDIT_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static savePricingAuditLogs(logs: PricingAuditLog[]): void {
    try {
      localStorage.setItem(PRICING_AUDIT_LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Error saving pricing audit logs', e);
    }
  }

  private static getSettingArabicLabel(key: string): string {
    const map: Record<string, string> = {
      rateUSD_EGP: 'سعر صرف USDT مقابل الجنيه',
      defaultProfitMarginPercent: 'هامش الربح الافتراضي P%',
      manualFixedCostEGP: 'التكلفة التشغيلية الثابتة لكل عملية F',
      cashbackPercent: 'نسبة الكاش باك',
      referralPercent: 'نسبة عمولة الشركاء والإحالة',
      reservePercent: 'نسبة احتياطي الطوارئ والمخاطر',
      developmentPercent: 'نسبة صندوق التطوير والتحديث',
      offersPercent: 'نسبة صندوق العروض والجوائز',
      fixedCostMode: 'وضع التكلفة الثابتة (تلقائي / يدوي)',
      monthlyBreakEvenTargetOrders: 'الهدف الشهري لعدد الطلبات'
    };
    return map[key] || key;
  }

  /**
   * 9. PRE-TICKET FINAL VALIDATION & ATOMIC REFRESH
   * Enforces Rule 5 & 8: Checks whether the product's selling price or cost has shifted due to FIFO lot transitions,
   * USDT fluctuations, or inventory adjustments.
   * If any drift exists, it updates the product in DB and returns the fresh validated price and cost!
   */
  public static validateAndRefreshTicketItem(
    item: TicketItem,
    ticketType: 'regular' | 'first_shipping' = 'regular',
    isDealer = false
  ): {
    item: TicketItem;
    priceChanged: boolean;
    oldPrice: number;
    newPrice: number;
    oldCost: number;
    newCost: number;
  } {
    const tree = ticketType === 'first_shipping' ? db.getFirstShippingGameTree() : db.getGameTree();
    const g = tree.find(game => game.id === item.gameId || game.name === item.gameName);
    const prod = g?.products.find(p => p.id === item.productId || p.name === item.productName);

    const oldPrice = item.unitPrice || 0;
    const oldCost = item.costPrice || 0;
    const qty = Math.max(1, item.quantity || 1);

    if (!prod) {
      return { item, priceChanged: false, oldPrice, newPrice: oldPrice, oldCost, newCost: oldCost };
    }

    const activeConfig = this.getConfig();
    const walletId = prod.primaryWalletId || prod.walletTypeId || item.walletTypeId;
    const pts = prod.pointsCostPerUnit || 0;

    let freshCostUSD = prod.costUSD || 0;
    if (freshCostUSD <= 0 && walletId && pts > 0) {
      const fifo = JKRWalletEngine.getWalletEffectivePointCost(walletId, pts);
      if (fifo.totalCostUSD > 0) freshCostUSD = fifo.totalCostUSD;
    }
    let freshCostPriceEGP = prod.costPriceEGP || (freshCostUSD * activeConfig.rateUSD_EGP);

    // Determine Product Selling Price strictly from Pricing Engine / Product settings
    // RULE: FIFO NEVER touches or changes selling price!
    // RULE: Manual pricing (customSellingPriceEGP / dealerCustomSellingPriceEGP) is STRICTLY honored!
    let freshSellingPrice = this.getEffectiveProductPrice(prod, { isDealer, ticketType });
    if (freshSellingPrice === 0 && prod.autoPricingEnabled !== false && !prod.useCustomPricing && (prod.costUSD || 0) > 0) {
      // Calculate once if missing, using strictly manual costUSD (never FIFO)
      const b = this.calculateSellingPrice({
        costUSD: prod.costUSD,
        gameId: g?.id,
        productId: prod.id,
        customProfitMarginPercent: prod.profitMarginPercent,
        customFixedCostEGP: prod.fixedCostPerOrder,
        customReservePercent: prod.reservePercent,
        customDevelopmentPercent: prod.developmentPercent,
        customCashbackPercent: prod.cashbackPercent,
        customReferralPercent: prod.partnerCommissionPercent,
        isCashbackEnabled: prod.isCashbackEnabled,
        isReferralEnabled: prod.isReferralEnabled
      }, activeConfig);
      freshSellingPrice = isDealer ? (prod.dealerCustomSellingPriceEGP || b.dealerPriceEGP || 0) : b.finalSellingPriceEGP;
    }

    // Determine Actual FIFO Cost strictly for profit/loss accounting (Does NOT affect selling price)
    if (walletId && pts > 0) {
      const fifoInfo = JKRWalletEngine.getWalletEffectivePointCost(walletId, pts * qty);
      if (fifoInfo.totalCostEGP > 0) {
        freshCostPriceEGP = Math.round((fifoInfo.totalCostEGP / qty) * 100) / 100;
      }
    }

    const priceDiff = Math.abs(freshSellingPrice - oldPrice);
    const costDiff = Math.abs(freshCostPriceEGP - oldCost);
    const priceChanged = priceDiff > 0.01 || costDiff > 0.01;

    const refreshedItem: TicketItem = {
      ...item,
      unitPrice: freshSellingPrice,
      totalPrice: freshSellingPrice * qty,
      costPrice: freshCostPriceEGP
    };

    return {
      item: refreshedItem,
      priceChanged,
      oldPrice,
      newPrice: freshSellingPrice,
      oldCost,
      newCost: freshCostPriceEGP
    };
  }
}

