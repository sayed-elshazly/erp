// =============================================================
// NZM JKR TOP UP ERP — Wallet Expiration & Breakage Service
// =============================================================
// Rules:
// 1. Cashback expires after 6 months from deposit date (unless extended).
// 2. Referral commission expires after 12 months from deposit date (unless extended).
// 3. FIFO consumption: redemptions deduct from the oldest lots first.
// 4. Overdue balances are flagged with ⚠️. Owner can either extend or transfer to Main Goods Wallet as Breakage.

import {
  Customer,
  UnifiedWalletTransaction,
  WalletBalanceLot,
  PartyExpiredBalanceSummary
} from '../../types/customer.types';
import { Dealer } from '../../types/dealer.types';

export class WalletExpirationService {
  /**
   * Calculates expiry date for a given transaction based on wallet type:
   * - Cashback: +6 months
   * - Referral: +12 months
   */
  public static calculateExpiryDate(createdAtStr: string, walletType: 'cashback' | 'referral'): string {
    const d = new Date(createdAtStr);
    if (isNaN(d.getTime())) return new Date().toISOString();

    if (walletType === 'cashback') {
      d.setMonth(d.getMonth() + 6);
    } else {
      d.setFullYear(d.getFullYear() + 1);
    }
    return d.toISOString();
  }

  /**
   * Processes transactions using FIFO to compute remaining lots and determine expired amounts
   */
  public static calculatePartyExpiredBalances(
    partyId: string,
    partyType: 'customer' | 'dealer',
    partyName: string,
    partyPhone: string,
    transactions: UnifiedWalletTransaction[],
    actualCashbackBalance: number,
    actualReferralBalance: number
  ): PartyExpiredBalanceSummary {
    const now = new Date();

    // Separate into chronological order (oldest to newest)
    const sortedTxs = [...transactions]
      .filter(t => t.customerId === partyId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // --- 1. Process Cashback Lots (FIFO) ---
    const cbIncomingLots: WalletBalanceLot[] = [];
    let cbTotalDeductions = 0;

    for (const tx of sortedTxs) {
      if (tx.walletType === 'cashback') {
        const amt = Math.abs(Number(tx.amount) || 0);
        if (tx.type === 'earned' || tx.type === 'credit' || (tx.amount > 0 && tx.type !== 'redeemed')) {
          const defaultExpiry = tx.expiresAt || this.calculateExpiryDate(tx.createdAt, 'cashback');
          const effectiveExpiry = tx.extendedExpiryDate || defaultExpiry;
          const expiryDateObj = new Date(effectiveExpiry);
          const isExpired = expiryDateObj.getTime() < now.getTime() && tx.isExpiredStatus !== 'transferred';
          const diffMs = now.getTime() - expiryDateObj.getTime();
          const daysOverdue = isExpired ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
          const daysRemaining = !isExpired ? Math.max(0, Math.ceil(-diffMs / (1000 * 60 * 60 * 24))) : 0;

          cbIncomingLots.push({
            id: `lot_cb_${tx.id}`,
            txId: tx.id,
            partyId,
            partyType,
            walletType: 'cashback',
            originalAmount: amt,
            remainingAmount: amt, // will be adjusted by FIFO
            createdAt: tx.createdAt,
            expiresAt: effectiveExpiry,
            isExpired,
            daysOverdue,
            daysRemaining,
            extendedUntil: tx.extendedExpiryDate
          });
        } else if (tx.type === 'redeemed' || tx.type === 'debit' || tx.type === 'settlement' || tx.amount < 0) {
          cbTotalDeductions += amt;
        }
      }
    }

    // Apply FIFO deductions to cashback lots
    let cbToDeduct = cbTotalDeductions;
    for (const lot of cbIncomingLots) {
      if (cbToDeduct <= 0) break;
      if (lot.remainingAmount <= cbToDeduct) {
        cbToDeduct -= lot.remainingAmount;
        lot.remainingAmount = 0;
      } else {
        lot.remainingAmount = Math.round((lot.remainingAmount - cbToDeduct) * 100) / 100;
        cbToDeduct = 0;
      }
    }

    // --- 2. Process Referral Lots (FIFO) ---
    const refIncomingLots: WalletBalanceLot[] = [];
    let refTotalDeductions = 0;

    for (const tx of sortedTxs) {
      if (tx.walletType === 'referral') {
        const amt = Math.abs(Number(tx.amount) || 0);
        if (tx.type === 'commission' || tx.type === 'earned' || tx.type === 'credit' || (tx.amount > 0 && tx.type !== 'redeemed')) {
          const defaultExpiry = tx.expiresAt || this.calculateExpiryDate(tx.createdAt, 'referral');
          const effectiveExpiry = tx.extendedExpiryDate || defaultExpiry;
          const expiryDateObj = new Date(effectiveExpiry);
          const isExpired = expiryDateObj.getTime() < now.getTime() && tx.isExpiredStatus !== 'transferred';
          const diffMs = now.getTime() - expiryDateObj.getTime();
          const daysOverdue = isExpired ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
          const daysRemaining = !isExpired ? Math.max(0, Math.ceil(-diffMs / (1000 * 60 * 60 * 24))) : 0;

          refIncomingLots.push({
            id: `lot_ref_${tx.id}`,
            txId: tx.id,
            partyId,
            partyType,
            walletType: 'referral',
            originalAmount: amt,
            remainingAmount: amt,
            createdAt: tx.createdAt,
            expiresAt: effectiveExpiry,
            isExpired,
            daysOverdue,
            daysRemaining,
            extendedUntil: tx.extendedExpiryDate
          });
        } else if (tx.type === 'redeemed' || tx.type === 'debit' || tx.type === 'settlement' || tx.amount < 0) {
          refTotalDeductions += amt;
        }
      }
    }

    // Apply FIFO deductions to referral lots
    let refToDeduct = refTotalDeductions;
    for (const lot of refIncomingLots) {
      if (refToDeduct <= 0) break;
      if (lot.remainingAmount <= refToDeduct) {
        refToDeduct -= lot.remainingAmount;
        lot.remainingAmount = 0;
      } else {
        lot.remainingAmount = Math.round((lot.remainingAmount - refToDeduct) * 100) / 100;
        refToDeduct = 0;
      }
    }

    // Filter lots that still have balance
    const activeCbLots = cbIncomingLots.filter(l => l.remainingAmount > 0.001);
    const activeRefLots = refIncomingLots.filter(l => l.remainingAmount > 0.001);

    // Calculate sums
    let cashbackExpired = activeCbLots
      .filter(l => l.isExpired)
      .reduce((sum, l) => sum + l.remainingAmount, 0);
    cashbackExpired = Math.round(Math.min(cashbackExpired, Math.max(0, actualCashbackBalance)) * 100) / 100;
    const cashbackValid = Math.round(Math.max(0, actualCashbackBalance - cashbackExpired) * 100) / 100;

    let referralExpired = activeRefLots
      .filter(l => l.isExpired)
      .reduce((sum, l) => sum + l.remainingAmount, 0);
    referralExpired = Math.round(Math.min(referralExpired, Math.max(0, actualReferralBalance)) * 100) / 100;
    const referralValid = Math.round(Math.max(0, actualReferralBalance - referralExpired) * 100) / 100;

    const allExpiredLots = [
      ...activeCbLots.filter(l => l.isExpired),
      ...activeRefLots.filter(l => l.isExpired)
    ].sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());

    const hasExpired = cashbackExpired > 0 || referralExpired > 0;

    return {
      partyId,
      partyName,
      partyPhone,
      partyType,
      cashbackTotal: actualCashbackBalance,
      cashbackValid,
      cashbackExpired,
      referralTotal: actualReferralBalance,
      referralValid,
      referralExpired,
      hasExpired,
      oldestExpiredDate: allExpiredLots.length > 0 ? allExpiredLots[0].expiresAt : undefined,
      expiredLots: allExpiredLots
    };
  }

  /**
   * Compiles all parties (Customers & Dealers) with active expired balances
   */
  public static getAllExpiredParties(
    customers: Customer[],
    dealers: Dealer[],
    allCustomerTxs: UnifiedWalletTransaction[],
    allDealerTxs: UnifiedWalletTransaction[]
  ): PartyExpiredBalanceSummary[] {
    const results: PartyExpiredBalanceSummary[] = [];

    // 1. Check Customers
    for (const cust of customers) {
      if ((cust.cashbackBalance || 0) > 0 || (cust.referralWalletBalance || 0) > 0) {
        const summary = this.calculatePartyExpiredBalances(
          cust.id,
          'customer',
          cust.name,
          cust.phone || '',
          allCustomerTxs,
          cust.cashbackBalance || 0,
          cust.referralWalletBalance || 0
        );
        if (summary.hasExpired) {
          results.push(summary);
        }
      }
    }

    // 2. Check Dealers
    for (const dealer of dealers) {
      if ((dealer.cashbackBalance || 0) > 0 || (dealer.referralWalletBalance || 0) > 0) {
        const summary = this.calculatePartyExpiredBalances(
          dealer.id,
          'dealer',
          dealer.name,
          dealer.phone || '',
          allDealerTxs,
          dealer.cashbackBalance || 0,
          dealer.referralWalletBalance || 0
        );
        if (summary.hasExpired) {
          results.push(summary);
        }
      }
    }

    // Sort by oldest expired lot first
    return results.sort((a, b) => {
      const aTime = a.oldestExpiredDate ? new Date(a.oldestExpiredDate).getTime() : 0;
      const bTime = b.oldestExpiredDate ? new Date(b.oldestExpiredDate).getTime() : 0;
      return aTime - bTime;
    });
  }

  /**
   * Helper to quickly get expired status for a single customer
   */
  public static getCustomerExpirySummary(
    customer: Customer,
    customerTransactions: UnifiedWalletTransaction[]
  ): PartyExpiredBalanceSummary {
    return this.calculatePartyExpiredBalances(
      customer.id,
      'customer',
      customer.name,
      customer.phone || '',
      customerTransactions,
      customer.cashbackBalance || 0,
      customer.referralWalletBalance || 0
    );
  }

  /**
   * Helper to quickly get expired status for a single dealer
   */
  public static getDealerExpirySummary(
    dealer: Dealer,
    dealerTransactions: UnifiedWalletTransaction[]
  ): PartyExpiredBalanceSummary {
    return this.calculatePartyExpiredBalances(
      dealer.id,
      'dealer',
      dealer.name,
      dealer.phone || '',
      dealerTransactions,
      dealer.cashbackBalance || 0,
      dealer.referralWalletBalance || 0
    );
  }
}
