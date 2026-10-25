// ============================================================================
// JKR TOPUP ERP — NEW WALLETS SYSTEM TYPES (SPECIFICATION IMPLEMENTATION)
// ============================================================================

export type JKRWalletType = 'MAIN' | 'SUB';

export type JKRWalletStatus =
  | 'ACTIVE'
  | 'LOW_BALANCE'
  | 'FROZEN'
  | 'DISABLED'
  | 'SAFETY_LIMIT_REACHED';

export type JKRTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'FUNDING'
  | 'TRANSFER'
  | 'PURCHASE'
  | 'CONSUMPTION'
  | 'REVERSAL'
  | 'ADJUSTMENT'
  | 'LOSS'
  | 'RECOVERY'
  | 'FREEZE'
  | 'UNFREEZE';

export type JKRFundingSource =
  | 'operating_wallet'
  | 'main_vault'
  | 'main_vault_usd'
  | 'dealer_vault'
  | 'dealer_vault_usd'
  | 'direct_usd_deposit'
  | 'external_debt'
  | 'external_capital'
  | 'external_other'
  | 'profits_wallet'
  | 'accounting_adjustment';

export type JKRTransactionStatus = 'COMPLETED' | 'REVERSED' | 'ADJUSTED' | 'CANCELLED';

/**
 * 💼 1. JKR Wallet Model (MAIN or SUB)
 */
export interface JKRWallet {
  id: string;
  name: string;
  type: JKRWalletType;
  currency: 'EGP' | 'USD'; // MAIN deals with USD & EGP
  pointType?: string; // Free Fire, PUBG, Roblox, etc. (for SUB)
  parentWalletId?: string; // ID of MAIN funding wallet (for SUB)
  balanceEGP: number; // Available EGP
  balanceUSD: number; // Total USD remaining in lots (for MAIN)
  pointsBalance: number; // Total Points remaining in lots (for SUB)
  status: JKRWalletStatus;
  alertThreshold?: number; // Alert when points or cash <= alertThreshold
  safetyLimit?: number; // Max negative balance allowed (e.g. -500 points for SUB)
  potentialLossAmount?: number; // Potential loss when frozen
  confirmedLossAmount?: number; // Confirmed loss
  recoveredLossAmount?: number; // Partial or full recovery amount
  notes?: string;
  isActive: boolean;
  department?: 'customers' | 'dealers' | 'all';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * 📦 2. FIFO Lot Model (USD for MAIN, Points for SUB)
 */
export interface JKRWalletLot {
  id: string;
  lotNumber: string;
  walletId: string;
  sourceTransactionId: string;
  currencyOrPoints: 'USD' | 'POINTS';
  initialQuantity: number; // USD amount for MAIN, Points count for SUB
  remainingQuantity: number;
  unitCostEGP: number; // EGP per USD for MAIN, EGP per Point for SUB
  unitCostUSD?: number; // USD cost per Point for SUB
  totalCostEGP: number;
  totalCostUSD?: number;
  exchangeRateUsed?: number; // Effective USD rate
  usdRateOverridden?: boolean; // True if owner manually changed USD rate
  usdRateOriginal?: number;
  overrideReason?: string;
  overrideUser?: string;
  consumedSources?: Array<{
    sourceLotId: string;
    consumedAmountUSD: number;
    rateEGP: number;
    costEGP: number;
  }>;
  purchaseDate: string;
  notes?: string;
  createdAt: string;
}

/**
 * 📑 3. Immutable Append-Only Ledger Transaction (20 Audit Columns)
 */
export interface JKRWalletTransaction {
  id: string;
  transactionNumber?: string; // TX-YYYYMM-XXXX
  walletId: string;
  walletType?: JKRWalletType; // MAIN or SUB
  walletName?: string;
  gameOrPointType?: string; // e.g. Free Fire, PUBG
  transactionType: JKRTransactionType;
  quantityIn?: number;
  quantityOut?: number;
  amountEGP: number;
  amountUSD?: number;
  balanceAfter: number;
  exchangeRateUsed?: number;
  costPerPoint?: number;
  ticketId?: string;
  ticketNumber?: string;
  productName?: string;
  lotId?: string;
  lotNumber?: string;
  customerId?: string;
  customerName?: string;
  status?: JKRTransactionStatus;
  relatedTransactionId?: string; // Link to Reversal, Recovery, or Adjustment
  referenceType?: 'TICKET' | 'SUB_WALLET' | 'MAIN_WALLET' | 'MANUAL' | 'EXTERNAL';
  referenceId?: string;
  performedBy: {
    id: string;
    name: string;
    role: string;
  };
  notes?: string;
  snapshot?: any;
  createdAt: string;
}

/**
 * 🔗 4. Lot-Level Ticket Consumption Record
 */
export interface JKRWalletConsumption {
  id: string;
  ticketId: string;
  walletId: string;
  lotId: string;
  lotNumber?: string;
  pointsConsumed: number;
  costEGP: number;
  costUSD: number;
  createdAt: string;
}

/**
 * 🛡️ 5. Loss & Recovery Record
 */
export interface JKRWalletLossRecord {
  id: string;
  walletId: string;
  type: 'FREEZE' | 'CONFIRMED_LOSS' | 'RECOVERY';
  pointsLost?: number;
  amountEGP: number;
  amountUSD?: number;
  reason: string;
  performedBy: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
}

/**
 * ⚖️ 6. Manual Adjustment Record (Audit Trail)
 */
export interface JKRWalletAdjustmentRecord {
  id: string;
  walletId: string;
  previousBalance: number;
  adjustmentQuantity: number;
  newBalance: number;
  unitCostEGP?: number;
  reason: string;
  performedBy: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
}

/**
 * 📸 7. Immutable Ticket Wallet Snapshot
 */
export interface TicketWalletSnapshot {
  actualWalletId?: string;
  actualWalletName?: string;
  primaryWalletName?: string;
  selectedWalletName?: string;
  isAlternativeWallet?: boolean;
  pointsRequiredPerUnit?: number;
  totalPointsConsumed?: number;
  actualCostEGP?: number;
  actualCostUSD?: number;
  exchangeRateUsed?: number;
  consumedLots?: Array<{
    lotId: string;
    lotNumber?: string;
    depositBondNumber?: string;
    depositDate?: string;
    walletId?: string;
    walletName?: string;
    pointsBefore?: number;
    pointsConsumed: number;
    pointsRemaining?: number;
    unitCostEGP: number;
    unitCostUSD?: number;
    exchangeRateUsed?: number;
    totalCostEGP: number;
    totalCostUSD?: number;
  }>;
  salePriceEGP?: number;
  cashbackActualEGP?: number;
  cashbackGrantedEGP?: number;
  referralActualEGP?: number;
  referralGrantedEGP?: number;
  fixedCostEGP?: number;
  netProfitEGP?: number;
  timestamp?: string;
}

/**
 * 🎯 8. Product Wallet Configuration (Primary + Alternatives)
 */
export interface JKRProductWalletConfig {
  primaryWalletId: string;
  alternativeWalletIds: string[]; // Ordered Priority 1, 2, 3...
  pointsCostPerUnit: number;
}
