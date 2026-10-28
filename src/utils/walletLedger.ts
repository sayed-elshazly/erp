import type { StoreWalletTransaction } from '../types/topup.types';
import type { UnifiedWalletTransaction } from '../types/customer.types';

const round2 = (n: number) => Math.round(n * 100) / 100;

const STORE_IN_TYPES = new Set(['deposit', 'transfer_in', 'bond_deposit', 'refund', 'compensation', 'cashback']);
const STORE_OUT_TYPES = new Set(['withdrawal', 'transfer_out', 'purchase', 'loss', 'fee', 'freeze']);

/**
 * Signed effect of a store/dealer wallet ledger row on its wallet balance.
 * Typed rows (deposit, withdrawal, ...) are decided by type and amount, because the stored
 * balanceBefore/After can be stale or clamped. Only `adjustment` rows are ambiguous: an explicit
 * `direction` wins, then a reversal label (sourceName starting with "عكس"), then the stored
 * balances; with none of those the effect is unknowable and counts as 0.
 */
export function getStoreWalletTxSignedDelta(
  tx: Pick<StoreWalletTransaction, 'type' | 'amount' | 'balanceBefore' | 'balanceAfter'> & {
    direction?: 'in' | 'out';
    sourceName?: string;
  }
): number {
  const amount = Math.abs(Number(tx.amount) || 0);
  if (STORE_IN_TYPES.has(tx.type)) return amount;
  if (STORE_OUT_TYPES.has(tx.type)) return -amount;
  if (tx.direction === 'in') return amount;
  if (tx.direction === 'out') return -amount;
  if (/^عكس/.test(tx.sourceName || '')) return -amount;
  if (typeof tx.balanceBefore === 'number' && typeof tx.balanceAfter === 'number') {
    return round2(tx.balanceAfter - tx.balanceBefore);
  }
  return 0;
}

/**
 * Signed effect of an `adjustment` row in a customer/dealer unified wallet ledger.
 * Explicit `direction` wins; legacy rows without it follow the sign of `amount`.
 */
export function getUnifiedAdjustmentDelta(tx: Pick<UnifiedWalletTransaction, 'amount'> & { direction?: 'in' | 'out' }): number {
  const raw = Number(tx.amount) || 0;
  if (tx.direction === 'in') return Math.abs(raw);
  if (tx.direction === 'out') return -Math.abs(raw);
  return raw;
}
