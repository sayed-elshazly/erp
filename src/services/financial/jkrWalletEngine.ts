// ============================================================================
// JKR TOPUP ERP — NEW CENTRAL WALLETS ENGINE (TWO-TIER + DUAL FIFO + LEDGER)
// ============================================================================

import {
  JKRWallet,
  JKRWalletLot,
  JKRWalletTransaction,
  JKRWalletConsumption,
  JKRWalletLossRecord,
  JKRWalletAdjustmentRecord,
  TicketWalletSnapshot,
  JKRFundingSource,
  JKRTransactionType,
  JKRWalletStatus
} from '../../types/jkrWallet.types';
import { GameProduct } from '../../types/topup.types';
import { eventBus, SYSTEM_EVENTS } from '../eventBus';
import { db } from '../../database/db';

const STORAGE_KEYS = {
  WALLETS: 'jkr_wallets_v2',
  LOTS: 'jkr_wallet_lots_v2',
  TRANSACTIONS: 'jkr_wallet_transactions_v2',
  CONSUMPTIONS: 'jkr_wallet_consumptions_v2',
  LOSSES: 'jkr_wallet_losses_v2',
  ADJUSTMENTS: 'jkr_wallet_adjustments_v2'
};

// ============================================================================
// 🔒 Concurrency Mutex Lock (In-Memory + Cross-Tab Atomic Lock)
// ============================================================================
export class WalletMutex {
  private static locks = new Set<string>();
  private static STORAGE_LOCK_PREFIX = 'jkr_wallet_lock_';

  public static tryAcquire(walletId: string, timeoutMs = 4000): boolean {
    if (this.locks.has(walletId)) return false;

    if (typeof localStorage !== 'undefined') {
      const lockKey = this.STORAGE_LOCK_PREFIX + walletId;
      const now = Date.now();
      const existing = localStorage.getItem(lockKey);
      if (existing) {
        const lockTime = parseInt(existing, 10);
        if (now - lockTime < timeoutMs) {
          return false;
        }
      }
      localStorage.setItem(lockKey, now.toString());
    }

    this.locks.add(walletId);
    return true;
  }

  public static release(walletId: string): void {
    this.locks.delete(walletId);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_LOCK_PREFIX + walletId);
    }
  }
}

// ============================================================================
// 💼 JKR Wallet Engine Implementation
// ============================================================================
export class JKRWalletEngine {
  // --------------------------------------------------------------------------
  // Storage Helpers
  // --------------------------------------------------------------------------
  private static getStoredData<T>(key: string, defaultVal: T[]): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private static setStoredData<T>(key: string, val: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error(`Failed to store data in ${key}`, e);
    }
  }

  /**
   * 📢 Broadcast unified wallet mutation event to trigger reactive pricing & catalog recalculations
   */
  public static notifyWalletMutation(walletId: string, action: string): void {
    if (!walletId) return;
    eventBus.publish(SYSTEM_EVENTS.WALLET_MUTATED, { walletId, action });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jkr_wallet_mutated', { detail: { walletId, action } }));
      window.dispatchEvent(new Event('storage'));
    }
  }

  // --------------------------------------------------------------------------
  // Wallets Read & Write
  // --------------------------------------------------------------------------
  public static getWallets(department?: 'customers' | 'dealers'): JKRWallet[] {
    const wallets = this.getStoredData<JKRWallet>(STORAGE_KEYS.WALLETS, []);
    if (!department) return wallets;
    return wallets.filter(w => {
      if (department === 'dealers') {
        return w.department === 'dealers';
      }
      return w.department === 'customers' || !w.department;
    });
  }

  public static getWalletById(id: string): JKRWallet | null {
    const wallets = this.getStoredData<JKRWallet>(STORAGE_KEYS.WALLETS, []);
    return wallets.find(w => w.id === id) || null;
  }

  public static saveWallet(wallet: JKRWallet): void {
    const wallets = this.getStoredData<JKRWallet>(STORAGE_KEYS.WALLETS, []);
    const idx = wallets.findIndex(w => w.id === wallet.id);
    if (idx >= 0) {
      wallets[idx] = { ...wallet, updatedAt: new Date().toISOString() };
    } else {
      wallets.push(wallet);
    }
    this.setStoredData(STORAGE_KEYS.WALLETS, wallets);
  }

  /**
   * Returns the latest active point cost in USD for a given sub-wallet.
   * Used by Pricing Engine to compute product costUSD = pointsNeeded * pointCostUSD.
   */
  public static getWalletLatestPointCostUSD(walletId: string): number {
    if (!walletId) return 0;
    const lots = this.getStoredData<JKRWalletLot>(STORAGE_KEYS.LOTS, [])
      .filter(l => l.walletId === walletId && l.currencyOrPoints === 'POINTS');

    // 1. Check active lot with remaining quantity (FIFO: earliest active lot first)
    const activeLots = lots
      .filter(l => (l.remainingQuantity || 0) > 0 && (
        (typeof l.unitCostUSD === 'number' && l.unitCostUSD > 0) ||
        (typeof l.unitCostEGP === 'number' && l.unitCostEGP > 0)
      ))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (activeLots.length > 0) {
      const activeLot = activeLots[0];
      if (typeof activeLot.unitCostUSD === 'number' && activeLot.unitCostUSD > 0) {
        return activeLot.unitCostUSD;
      }
      if (typeof activeLot.unitCostEGP === 'number' && activeLot.unitCostEGP > 0) {
        const rate = activeLot.exchangeRateUsed || 50;
        return Math.round((activeLot.unitCostEGP / rate) * 10000) / 10000;
      }
    }

    // 2. Fallback: most recent lot created
    if (lots.length > 0) {
      const sorted = [...lots].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const recent = sorted.find(l => (
        (typeof l.unitCostUSD === 'number' && l.unitCostUSD > 0) ||
        (typeof l.unitCostEGP === 'number' && l.unitCostEGP > 0)
      ));
      if (recent) {
        if (typeof recent.unitCostUSD === 'number' && recent.unitCostUSD > 0) {
          return recent.unitCostUSD;
        }
        if (typeof recent.unitCostEGP === 'number' && recent.unitCostEGP > 0) {
          const rate = recent.exchangeRateUsed || 50;
          return Math.round((recent.unitCostEGP / rate) * 10000) / 10000;
        }
      }
    }

    return 0;
  }

  // --------------------------------------------------------------------------
  // Summary & Safe Deletion for Wallets
  // --------------------------------------------------------------------------
  public static getWalletDeletionSummary(walletId: string): {
    wallet: JKRWallet | null;
    lotsCount: number;
    transactionsCount: number;
    consumptionsCount: number;
    adjustmentsCount: number;
    lossesCount: number;
    linkedProducts: { id: string; name: string; gameTitle: string }[];
  } {
    const wallet = this.getWalletById(walletId);
    const lots = this.getStoredData<JKRWalletLot>(STORAGE_KEYS.LOTS, []).filter(l => l.walletId === walletId);
    const txs = this.getStoredData<JKRWalletTransaction>(STORAGE_KEYS.TRANSACTIONS, []).filter(t => t.walletId === walletId);
    const consumptions = this.getStoredData<JKRWalletConsumption>(STORAGE_KEYS.CONSUMPTIONS, []).filter(c => c.walletId === walletId);
    const adjustments = this.getStoredData<JKRWalletAdjustmentRecord>(STORAGE_KEYS.ADJUSTMENTS, []).filter(a => a.walletId === walletId);
    const losses = this.getStoredData<JKRWalletLossRecord>(STORAGE_KEYS.LOSSES, []).filter(l => l.walletId === walletId);

    const linkedProducts: { id: string; name: string; gameTitle: string }[] = [];
    const checkTree = (treeKey: string) => {
      try {
        const raw = localStorage.getItem(treeKey);
        if (!raw) return;
        const tree = JSON.parse(raw);
        for (const game of tree) {
          for (const sec of (game.sections || [])) {
            for (const grp of (sec.groups || [])) {
              for (const prod of (grp.products || [])) {
                if (
                  prod.walletConfig?.primaryWalletId === walletId ||
                  (prod.walletConfig?.alternativeWalletIds && prod.walletConfig.alternativeWalletIds.includes(walletId))
                ) {
                  linkedProducts.push({
                    id: prod.id,
                    name: prod.name,
                    gameTitle: game.title || game.name || 'لعبة'
                  });
                }
              }
            }
          }
        }
      } catch {}
    };
    checkTree('nzm_jkr_games_tree');
    checkTree('nzm_jkr_first_shipping_game_tree');

    return {
      wallet,
      lotsCount: lots.length,
      transactionsCount: txs.length,
      consumptionsCount: consumptions.length,
      adjustmentsCount: adjustments.length,
      lossesCount: losses.length,
      linkedProducts
    };
  }

  public static deleteWallet(walletId: string, user?: any, reason?: string): { success: boolean; message?: string } {
    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Error('المحفظة غير موجودة أو تم حذفها بالفعل');

    // Summary counts before deletion
    const summary = this.getWalletDeletionSummary(walletId);

    // 1. Remove Wallet
    const wallets = this.getStoredData<JKRWallet>(STORAGE_KEYS.WALLETS, []);
    this.setStoredData(STORAGE_KEYS.WALLETS, wallets.filter(w => w.id !== walletId));

    // 2. Remove Lots
    const lots = this.getStoredData<JKRWalletLot>(STORAGE_KEYS.LOTS, []);
    this.setStoredData(STORAGE_KEYS.LOTS, lots.filter(l => l.walletId !== walletId));

    // 3. Remove Transactions (Immutable ledger records for this deleted wallet)
    const txs = this.getStoredData<JKRWalletTransaction>(STORAGE_KEYS.TRANSACTIONS, []);
    this.setStoredData(STORAGE_KEYS.TRANSACTIONS, txs.filter(t => t.walletId !== walletId));

    // 4. Remove Consumptions
    const consumptions = this.getStoredData<JKRWalletConsumption>(STORAGE_KEYS.CONSUMPTIONS, []);
    this.setStoredData(STORAGE_KEYS.CONSUMPTIONS, consumptions.filter(c => c.walletId !== walletId));

    // 5. Remove Adjustments
    const adjustments = this.getStoredData<JKRWalletAdjustmentRecord>(STORAGE_KEYS.ADJUSTMENTS, []);
    this.setStoredData(STORAGE_KEYS.ADJUSTMENTS, adjustments.filter(a => a.walletId !== walletId));

    // 6. Remove Losses
    const losses = this.getStoredData<JKRWalletLossRecord>(STORAGE_KEYS.LOSSES, []);
    this.setStoredData(STORAGE_KEYS.LOSSES, losses.filter(l => l.walletId !== walletId));

    // 7. Unbind Products from both trees
    const unbindFromTree = (treeKey: string) => {
      try {
        const raw = localStorage.getItem(treeKey);
        if (!raw) return;
        const tree = JSON.parse(raw);
        let modified = false;
        for (const game of tree) {
          for (const sec of (game.sections || [])) {
            for (const grp of (sec.groups || [])) {
              for (const prod of (grp.products || [])) {
                if (prod.walletConfig) {
                  if (prod.walletConfig.primaryWalletId === walletId) {
                    prod.walletConfig.primaryWalletId = '';
                    modified = true;
                  }
                  if (prod.walletConfig.alternativeWalletIds && prod.walletConfig.alternativeWalletIds.includes(walletId)) {
                    prod.walletConfig.alternativeWalletIds = prod.walletConfig.alternativeWalletIds.filter((id: string) => id !== walletId);
                    modified = true;
                  }
                }
              }
            }
          }
        }
        if (modified) {
          localStorage.setItem(treeKey, JSON.stringify(tree));
        }
      } catch (e) {
        console.error(`Error unbinding wallet ${walletId} from ${treeKey}:`, e);
      }
    };
    unbindFromTree('nzm_jkr_games_tree');
    unbindFromTree('nzm_jkr_first_shipping_game_tree');

    // 8. Unlink from any child SUB wallets if this was a MAIN wallet
    if (wallet.type === 'MAIN') {
      const remainingWallets = this.getStoredData<JKRWallet>(STORAGE_KEYS.WALLETS, []);
      let modifiedSub = false;
      for (const w of remainingWallets) {
        if (w.parentWalletId === walletId) {
          w.parentWalletId = undefined;
          modifiedSub = true;
        }
      }
      if (modifiedSub) {
        this.setStoredData(STORAGE_KEYS.WALLETS, remainingWallets);
      }
    }

    // 9. Write System Audit Log entry
    try {
      const rawLogs = localStorage.getItem('nzm_jkr_audit_logs');
      const logs = rawLogs ? JSON.parse(rawLogs) : [];
      const auditEntry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        userId: user?.id || 'admin',
        userName: user?.fullName || user?.name || 'المدير',
        userRole: user?.role || 'admin',
        department: wallet.department === 'dealers' ? 'قسم التجار' : 'قسم الزبائن',
        actionType: 'delete',
        entityType: 'jkr_wallet',
        entityId: wallet.id,
        entityTitle: `محفظة: ${wallet.name} (${wallet.type})`,
        details: `تم حذف المحفظة [${wallet.name}] (${wallet.type}) نهائياً. تم حذف ${summary.lotsCount} شحنات Lots، و ${summary.transactionsCount} عمليات Ledger، وإزالة ربط ${summary.linkedProducts.length} منتجات. سبب الحذف: ${reason?.trim() || 'بدون سبب محدد'}. الرصيد المحذوف: USD ${wallet.balanceUSD || 0} / EGP ${wallet.balanceEGP || 0} / نقاط ${wallet.pointsBalance || 0}.`,
        timestamp: new Date().toISOString()
      };
      logs.unshift(auditEntry);
      localStorage.setItem('nzm_jkr_audit_logs', JSON.stringify(logs.slice(0, 1000)));
    } catch (logErr) {
      console.error('Failed to write audit log for wallet deletion:', logErr);
    }

    return { success: true };
  }

  // --------------------------------------------------------------------------
  // Rule 6: Create Wallet (Initial Balance = 0, No points or rates on creation)
  // --------------------------------------------------------------------------
  public static createWallet(params: {
    name: string;
    type: 'MAIN' | 'SUB';
    currency?: 'EGP' | 'USD';
    pointType?: string;
    parentWalletId?: string;
    alertThreshold?: number;
    safetyLimit?: number;
    notes?: string;
    isActive: boolean;
    department?: 'customers' | 'dealers';
  }, user?: any): JKRWallet {
    const newWallet: JKRWallet = {
      id: `w_${params.type.toLowerCase()}_${Date.now()}`,
      name: params.name.trim(),
      type: params.type,
      currency: params.type === 'MAIN' ? 'EGP' : 'USD',
      pointType: params.type === 'SUB' ? params.pointType : undefined,
      parentWalletId: params.type === 'SUB' ? params.parentWalletId : undefined,
      balanceEGP: 0, // Rule 6: initial balance is always 0
      balanceUSD: 0, // Rule 6: initial balance is always 0
      pointsBalance: 0, // Rule 6: initial balance is always 0
      status: params.isActive ? 'ACTIVE' : 'DISABLED',
      alertThreshold: params.alertThreshold,
      safetyLimit: params.type === 'SUB' ? (params.safetyLimit !== undefined ? params.safetyLimit : -500) : undefined,
      potentialLossAmount: 0,
      confirmedLossAmount: 0,
      recoveredLossAmount: 0,
      notes: params.notes?.trim() || undefined,
      isActive: params.isActive,
      department: params.department || 'customers',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.fullName || user?.name || 'المسؤول',
      updatedBy: user?.fullName || user?.name || 'المسؤول'
    };

    this.saveWallet(newWallet);
    return newWallet;
  }

  // --------------------------------------------------------------------------
  // 10. Main Wallet USD Funding (Creates USD FIFO Lot)
  // --------------------------------------------------------------------------
  // Helper to deduct funds from store operating/profits wallet when funding Main Wallet
  private static deductFromStoreWallet(
    storeWalletId: string | undefined,
    amountEGP: number,
    targetMainWallet: JKRWallet,
    lotNumber: string,
    amountUSD: number,
    rateEGP: number,
    user?: any,
    notes?: string,
    isProfits = false,
    walletNumberId?: string
  ): { success: boolean; walletName?: string; walletId?: string; lineInfo?: string } {
    try {
      const stored = localStorage.getItem('nzm_jkr_store_wallets');
      if (!stored) return { success: false };
      const wallets: any[] = JSON.parse(stored);

      let opW = storeWalletId ? wallets.find(w => w.id === storeWalletId) : null;
      if (!opW) {
        if (isProfits) {
          opW = wallets.find(w => w.id === 'w_profits' || w.type === 'profits' || w.systemType === 'profits');
        } else {
          opW = wallets.find(w => w.type === 'operating' && !w.isSystemWallet);
        }
      }
      if (!opW) return { success: false };

      const before = opW.balance || 0;
      opW.balance = before - amountEGP;
      opW.monthlyWithdrawn = (opW.monthlyWithdrawn || 0) + amountEGP;
      opW.totalWithdrawn = (opW.totalWithdrawn || 0) + amountEGP;
      opW.updatedAt = new Date().toISOString();

      // If specific wallet number was selected, update its stats and balance
      let lineItem: any = null;
      if (Array.isArray(opW.numbers) && opW.numbers.length > 0) {
        lineItem = walletNumberId ? opW.numbers.find((n: any) => n.id === walletNumberId) : opW.numbers[0];
        if (lineItem) {
          lineItem.currentBalance = (lineItem.currentBalance || 0) - amountEGP;
          lineItem.monthlyWithdrawn = (lineItem.monthlyWithdrawn || 0) + amountEGP;
          lineItem.totalWithdrawn = (lineItem.totalWithdrawn || 0) + amountEGP;
          lineItem.monthlySent = (lineItem.monthlySent || 0) + amountEGP;
          lineItem.dailySent = (lineItem.dailySent || 0) + amountEGP;
          lineItem.totalSent = (lineItem.totalSent || 0) + amountEGP;
          lineItem.operationsCount = (lineItem.operationsCount || 0) + 1;
          lineItem.lastUsedAt = new Date().toISOString();

          // Check if send limit reached
          if (
            (lineItem.dailySendLimit && lineItem.dailySent >= lineItem.dailySendLimit) ||
            (lineItem.monthlySendLimit && lineItem.monthlySent >= lineItem.monthlySendLimit)
          ) {
            lineItem.status = 'limit_reached';
          }
        }
      }

      opW.dailySent = (opW.dailySent || 0) + amountEGP;
      opW.monthlySent = (opW.monthlySent || 0) + amountEGP;

      localStorage.setItem('nzm_jkr_store_wallets', JSON.stringify(wallets));

      const lineDescription = lineItem ? ` [الخط: ${lineItem.phoneNumber} - ${lineItem.accountHolderName}]` : '';

      // Append to nzm_jkr_store_wallet_transactions
      const txStored = localStorage.getItem('nzm_jkr_store_wallet_transactions');
      const transactions: any[] = txStored ? JSON.parse(txStored) : [];
      const newTx = {
        id: `tx_store_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        walletId: opW.id,
        walletName: opW.name,
        walletNumberId: lineItem?.id,
        walletPhoneNumber: lineItem?.phoneNumber,
        walletAccountHolder: lineItem?.accountHolderName,
        senderPhoneNumber: lineItem?.phoneNumber || opW.accountNumber,
        receivingPhoneNumber: targetMainWallet.name,
        type: 'withdrawal',
        amount: amountEGP,
        amountUSD,
        currency: opW.currency || 'EGP',
        balanceBefore: before,
        balanceAfter: opW.balance,
        description: `تمويل المحفظة الرئيسية [${targetMainWallet.name}] — مبلغ: $${amountUSD} بسعر ${rateEGP} ج${lineDescription}`,
        referenceNumber: lotNumber,
        relatedWalletId: targetMainWallet.id,
        relatedWalletName: targetMainWallet.name,
        sourceType: 'transfer',
        sourceName: `تمويل المحفظة الرئيسية [${targetMainWallet.name}]`,
        performedBy: {
          id: user?.id || 'admin',
          name: user?.fullName || user?.name || 'المسؤول',
          role: user?.role || 'admin'
        },
        notes,
        createdAt: new Date().toISOString()
      };
      transactions.unshift(newTx);
      localStorage.setItem('nzm_jkr_store_wallet_transactions', JSON.stringify(transactions));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('store_wallets_updated', { detail: { walletId: opW.id } }));
      }
      eventBus.publish(SYSTEM_EVENTS.WALLET_MUTATED, { walletId: opW.id, action: 'funding_withdrawal' });

      return {
        success: true,
        walletName: opW.name,
        walletId: opW.id,
        lineInfo: lineItem ? `${lineItem.phoneNumber} (${lineItem.accountHolderName})` : undefined
      };
    } catch (e) {
      console.error('Failed to deduct from store wallet', e);
      return { success: false };
    }
  }

  public static fundMainWallet(params: {
    walletId: string;
    amountUSD: number;
    rateEGP: number;
    source: JKRFundingSource;
    operatingWalletId?: string;
    walletNumberId?: string;
    externalType?: string;
    ticketNumber?: string;
    notes?: string;
  }, user?: any): { wallet: JKRWallet; lot: JKRWalletLot; transaction: JKRWalletTransaction } {
    const wallet = this.getWalletById(params.walletId);
    if (!wallet) throw new Error('المحفظة الرئيسية غير موجودة');
    if (wallet.type !== 'MAIN') throw new Error('لا يمكن تمويل رصيد نقدي إلا في محفظة رئيسية');
    if (params.amountUSD <= 0) throw new Error('يجب إدخال مبلغ أكبر من الصفر');
    if (params.rateEGP <= 0) throw new Error('يجب إدخال سعر دولار صحيح');

    const totalCostEGP = params.amountUSD * params.rateEGP;
    const txId = `tx_fund_${Date.now()}`;
    const lotId = `lot_main_${Date.now()}`;
    const lotNumber = `LOT-USD-${Date.now().toString().slice(-6)}`;
    const ticketNumber = params.ticketNumber?.trim() || `FUND-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    // If funding source is an internal operating wallet, profits wallet, or main/dealer vault, deduct automatically
    let sourceWalletDetails: { success: boolean; walletName?: string; walletId?: string; lineInfo?: string } | null = null;

    if (params.source === 'main_vault_usd') {
      // Deduct from the main safe/vault in USD
      try {
        const vaultSummary = db.getMainVaultSummary();
        if (vaultSummary.balanceUSD < params.amountUSD) {
          throw new Error(`رصيد الدولار بالخزنة الرئيسية غير كافٍ ($${vaultSummary.balanceUSD.toLocaleString()} USD) لتمويل مبلغ ($${params.amountUSD.toLocaleString()} USD)`);
        }
        const performerName = user?.fullName || user?.name || 'المدير العام';
        db.addSafeTransaction(
          'cash_out',
          totalCostEGP,
          'capital',
          `تمويل المحفظة الرئيسية [${wallet.name}] — سحب من رصيد الدولار بالخزنة: $${params.amountUSD} بسعر ${params.rateEGP} ج — Lot: ${lotNumber}`,
          performerName,
          lotNumber,
          {
            currency: 'USD',
            usdAmount: params.amountUSD,
            usdExchangeRate: params.rateEGP,
            notes: params.notes,
            user
          }
        );
        sourceWalletDetails = {
          success: true,
          walletName: 'الخزنة الرئيسية (رصيد الدولار)',
          walletId: 'main_vault'
        };
        eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, { type: 'funding_withdrawal', amountUSD: params.amountUSD });
      } catch (e: any) {
        throw new Error(e.message || 'فشل خصم الدولار من الخزنة الرئيسية');
      }
    } else if (params.source === 'main_vault') {
      // Deduct from the main safe/vault in EGP
      try {
        const vaultSummary = db.getMainVaultSummary();
        if (vaultSummary.balanceEGP < totalCostEGP) {
          throw new Error(`رصيد الجنيه بالخزنة الرئيسية غير كافٍ (${vaultSummary.balanceEGP.toLocaleString()} ج.م) لتمويل مبلغ (${totalCostEGP.toLocaleString()} ج.م)`);
        }
        const performerName = user?.fullName || user?.name || 'المدير العام';
        db.addSafeTransaction(
          'cash_out',
          totalCostEGP,
          'capital',
          `تمويل المحفظة الرئيسية [${wallet.name}] — شراء من رصيد الجنيه بالخزنة: $${params.amountUSD} بسعر ${params.rateEGP} ج — Lot: ${lotNumber}`,
          performerName,
          lotNumber,
          {
            currency: 'EGP',
            notes: params.notes,
            user
          }
        );
        sourceWalletDetails = {
          success: true,
          walletName: 'الخزنة الرئيسية (رصيد الجنيه)',
          walletId: 'main_vault'
        };
        eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, { type: 'funding_withdrawal', amount: totalCostEGP });
      } catch (e: any) {
        throw new Error(e.message || 'فشل خصم المبلغ من الخزنة الرئيسية');
      }
    } else if (params.source === 'dealer_vault_usd') {
      // Deduct from the dealer safe/vault in USD
      try {
        const dealerSummary = db.getDealerMainVaultSummary();
        if (dealerSummary.balanceUSD < params.amountUSD) {
          throw new Error(`رصيد الدولار بخزنة التجار غير كافٍ ($${dealerSummary.balanceUSD.toLocaleString()} USD) لتمويل مبلغ ($${params.amountUSD.toLocaleString()} USD)`);
        }
        const performerName = user?.fullName || user?.name || 'مسؤول الحسابات';
        db.addDealerSafeTransaction(
          'cash_out',
          totalCostEGP,
          'capital',
          `تمويل المحفظة الرئيسية [${wallet.name}] — سحب من رصيد الدولار بخزنة التجار: $${params.amountUSD} بسعر ${params.rateEGP} ج — Lot: ${lotNumber}`,
          performerName,
          lotNumber,
          {
            currency: 'USD',
            usdAmount: params.amountUSD,
            usdExchangeRate: params.rateEGP,
            notes: params.notes,
            user
          }
        );
        sourceWalletDetails = {
          success: true,
          walletName: 'خزنة التجار (رصيد الدولار)',
          walletId: 'dealer_main_vault'
        };
        eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, { type: 'dealer_funding_withdrawal', amountUSD: params.amountUSD });
      } catch (e: any) {
        throw new Error(e.message || 'فشل خصم الدولار من خزنة التجار');
      }
    } else if (params.source === 'dealer_vault') {
      // Deduct from the dealer safe/vault in EGP
      try {
        const dealerSummary = db.getDealerMainVaultSummary();
        if (dealerSummary.balanceEGP < totalCostEGP) {
          throw new Error(`رصيد الجنيه بخزنة التجار غير كافٍ (${dealerSummary.balanceEGP.toLocaleString()} ج.م) لتمويل مبلغ (${totalCostEGP.toLocaleString()} ج.م)`);
        }
        const performerName = user?.fullName || user?.name || 'مسؤول الحسابات';
        db.addDealerSafeTransaction(
          'cash_out',
          totalCostEGP,
          'capital',
          `تمويل المحفظة الرئيسية [${wallet.name}] — شراء من رصيد الجنيه بخزنة التجار: $${params.amountUSD} بسعر ${params.rateEGP} ج — Lot: ${lotNumber}`,
          performerName,
          lotNumber,
          {
            currency: 'EGP',
            notes: params.notes,
            user
          }
        );
        sourceWalletDetails = {
          success: true,
          walletName: 'خزنة التجار (رصيد الجنيه)',
          walletId: 'dealer_main_vault'
        };
        eventBus.publish(SYSTEM_EVENTS.VAULT_UPDATED, { type: 'dealer_funding_withdrawal', amount: totalCostEGP });
      } catch (e: any) {
        throw new Error(e.message || 'فشل خصم الجنيه من خزنة التجار');
      }
    } else if (params.source === 'direct_usd_deposit') {
      sourceWalletDetails = {
        success: true,
        walletName: 'إيداع نقدي مباشر بالدولار',
        walletId: 'direct_usd'
      };
    } else if (params.source === 'operating_wallet') {
      sourceWalletDetails = this.deductFromStoreWallet(
        params.operatingWalletId,
        totalCostEGP,
        wallet,
        lotNumber,
        params.amountUSD,
        params.rateEGP,
        user,
        params.notes,
        false,
        params.walletNumberId
      );
    } else if (params.source === 'profits_wallet') {
      sourceWalletDetails = this.deductFromStoreWallet(
        params.operatingWalletId,
        totalCostEGP,
        wallet,
        lotNumber,
        params.amountUSD,
        params.rateEGP,
        user,
        params.notes,
        true,
        params.walletNumberId
      );
    }

    const lineTag = sourceWalletDetails?.lineInfo ? `[الخط: ${sourceWalletDetails.lineInfo}]` : '';
    const lotNotes = [params.notes, lineTag].filter(Boolean).join(' | ');

    // 1. Create Main USD Lot
    const lot: JKRWalletLot = {
      id: lotId,
      lotNumber,
      walletId: wallet.id,
      sourceTransactionId: txId,
      currencyOrPoints: 'USD',
      initialQuantity: params.amountUSD,
      remainingQuantity: params.amountUSD,
      unitCostEGP: params.rateEGP,
      totalCostEGP,
      totalCostUSD: params.amountUSD,
      exchangeRateUsed: params.rateEGP,
      purchaseDate: new Date().toISOString(),
      notes: lotNotes || undefined,
      createdAt: new Date().toISOString()
    };
    this.saveLot(lot);

    // 2. Update Wallet Balances
    wallet.balanceUSD = (wallet.balanceUSD || 0) + params.amountUSD;
    wallet.balanceEGP = (wallet.balanceEGP || 0) + totalCostEGP;
    if (wallet.status === 'LOW_BALANCE' && (!wallet.alertThreshold || wallet.balanceEGP > wallet.alertThreshold)) {
      wallet.status = 'ACTIVE';
    }
    this.saveWallet(wallet);

    // 3. Create Append-Only Ledger Entry
    const lineLabel = sourceWalletDetails?.lineInfo ? ` (خط: ${sourceWalletDetails.lineInfo})` : '';
    const sourceLabel =
      params.source === 'main_vault_usd'
        ? `سحب من رصيد الدولار بالخزنة الرئيسية`
        : params.source === 'main_vault'
        ? `سحب من رصيد الجنيه بالخزنة الرئيسية`
        : params.source === 'dealer_vault_usd'
        ? `سحب من رصيد الدولار بخزنة التجار`
        : params.source === 'dealer_vault'
        ? `سحب من رصيد الجنيه بخزنة التجار`
        : params.source === 'direct_usd_deposit'
        ? `إيداع نقدي مباشر بالدولار`
        : params.source === 'operating_wallet'
        ? `تمويل من محفظة التشغيل${sourceWalletDetails?.walletName ? ` [${sourceWalletDetails.walletName}${lineLabel}]` : ''}`
        : params.source === 'profits_wallet'
        ? `تحويل من محفظة الأرباح${sourceWalletDetails?.walletName ? ` [${sourceWalletDetails.walletName}${lineLabel}]` : ''}`
        : `تمويل خارجي: ${params.externalType || 'مباشر'}`;

    const adminPerformerName = user?.fullName || user?.name;
    const finalPerformerName = adminPerformerName && adminPerformerName !== 'النظام' ? adminPerformerName : 'المدير العام (Owner)';

    const transaction: JKRWalletTransaction = {
      id: txId,
      transactionNumber: ticketNumber,
      ticketNumber,
      walletId: wallet.id,
      walletName: wallet.name,
      walletType: wallet.type,
      gameOrPointType: 'USD',
      transactionType: 'FUNDING',
      quantityIn: params.amountUSD,
      amountEGP: totalCostEGP,
      amountUSD: params.amountUSD,
      balanceAfter: wallet.balanceUSD,
      referenceType: 'EXTERNAL',
      referenceId: lotId,
      lotId,
      lotNumber,
      performedBy: {
        id: user?.id || 'admin_1',
        name: finalPerformerName,
        role: 'admin'
      },
      notes: `${sourceLabel} - سعر الصرف: ${params.rateEGP} ج / ${params.amountUSD}$ ${params.notes ? `(${params.notes})` : ''}`,
      createdAt: new Date().toISOString()
    };
    this.saveTransaction(transaction);
    this.notifyWalletMutation(wallet.id, 'fund');

    return { wallet, lot, transaction };
  }

  /**
   * 📤 Withdraw from Main Wallet to another destination wallet / external with recorded destination
   */
  public static withdrawFromMainWallet(params: {
    walletId: string;
    amountUSD: number;
    destinationWalletName: string;
    notes?: string;
  }, user?: any): { wallet: JKRWallet; transaction: JKRWalletTransaction } {
    const wallet = this.getWalletById(params.walletId);
    if (!wallet) throw new Error('المحفظة الرئيسية غير موجودة');
    if (wallet.type !== 'MAIN') throw new Error('هذه العملية للمحفظة الرئيسية فقط');
    if (params.amountUSD <= 0) throw new Error('يجب إدخال مبلغ أكبر من الصفر');
    if (!params.destinationWalletName?.trim()) throw new Error('يرجى تحديد وجهة السحب أو اسم المحفظة المستهدفة');

    const mainLots = this.getLotsByWallet(wallet.id)
      .filter(l => l.remainingQuantity > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const totalAvailableUSD = mainLots.reduce((sum, l) => sum + l.remainingQuantity, 0);
    if (totalAvailableUSD < params.amountUSD) {
      throw new Error(`رصيد المحفظة بالدولار غير كافٍ. المتاح: $${totalAvailableUSD.toFixed(2)}، والمطلوب: $${params.amountUSD}`);
    }

    let remainingToConsumeUSD = params.amountUSD;
    let totalConsumedEGP = 0;

    for (const lot of mainLots) {
      if (remainingToConsumeUSD <= 0) break;
      const takeUSD = Math.min(lot.remainingQuantity, remainingToConsumeUSD);
      const lotCostEGP = takeUSD * lot.unitCostEGP;

      lot.remainingQuantity -= takeUSD;
      remainingToConsumeUSD -= takeUSD;
      totalConsumedEGP += lotCostEGP;

      this.saveLot(lot);
    }

    wallet.balanceUSD = Math.max(0, (wallet.balanceUSD || 0) - params.amountUSD);
    wallet.balanceEGP = Math.max(0, (wallet.balanceEGP || 0) - totalConsumedEGP);
    this.saveWallet(wallet);

    const txId = `tx_withd_${Date.now()}`;
    const transaction: JKRWalletTransaction = {
      id: txId,
      walletId: wallet.id,
      walletName: wallet.name,
      walletType: wallet.type,
      gameOrPointType: 'USD',
      transactionType: 'WITHDRAWAL',
      quantityOut: params.amountUSD,
      amountEGP: totalConsumedEGP,
      amountUSD: params.amountUSD,
      balanceAfter: wallet.balanceUSD,
      referenceType: 'EXTERNAL',
      referenceId: params.destinationWalletName.trim(),
      performedBy: {
        id: user?.id || 'admin',
        name: user?.fullName || user?.name || 'المسؤول',
        role: user?.role || 'admin'
      },
      notes: `صادر سحب وتوجيه إلى: [${params.destinationWalletName.trim()}] — مبلغ: $${params.amountUSD} (${totalConsumedEGP.toFixed(2)} ج)${params.notes ? ` | ${params.notes.trim()}` : ''}`,
      createdAt: new Date().toISOString()
    };
    this.saveTransaction(transaction);
    this.notifyWalletMutation(wallet.id, 'withdraw');

    return { wallet, transaction };
  }

  // --------------------------------------------------------------------------
  // 11 & 14. Sub-Wallet Points Purchase / Deposit (Consumes Main USD FIFO)
  // --------------------------------------------------------------------------
  public static depositSubWalletPoints(params: {
    subWalletId: string;
    amountUSD: number;
    pointsCount: number;
    manualUSDRate?: number; // Optional override for owner
    overrideReason?: string;
    purchaseDate?: string;
    ticketNumber?: string;
    notes?: string;
  }, user?: any): {
    subWallet: JKRWallet;
    subLot: JKRWalletLot;
    mainTransaction: JKRWalletTransaction;
    subTransaction: JKRWalletTransaction;
  } {
    const subWallet = this.getWalletById(params.subWalletId);
    if (!subWallet) throw new Error('المحفظة الفرعية غير موجودة');
    if (subWallet.type !== 'SUB') throw new Error('هذه العملية مخصصة للمحافظ الفرعية فقط');
    if (!subWallet.parentWalletId) throw new Error('المحفظة الفرعية غير مرتبطة بمحفظة رئيسية');

    const mainWallet = this.getWalletById(subWallet.parentWalletId);
    if (!mainWallet) throw new Error('المحفظة الرئيسية المرتبطة غير موجودة');

    if (params.amountUSD <= 0 || params.pointsCount <= 0) {
      throw new Error('يجب إدخال مبالغ ونقاط أكبر من الصفر');
    }

    const ticketNumber = params.ticketNumber?.trim() || `DEP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const adminPerformerName = user?.fullName || user?.name;
    const finalPerformerName = adminPerformerName && adminPerformerName !== 'النظام' ? adminPerformerName : 'المدير العام (Owner)';

    // 1. Consume from Main Wallet USD FIFO Lots
    const mainLots = this.getLotsByWallet(mainWallet.id)
      .filter(l => l.remainingQuantity > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const totalAvailableUSD = mainLots.reduce((sum, l) => sum + l.remainingQuantity, 0);
    if (totalAvailableUSD < params.amountUSD) {
      throw new Error(`رصيد المحفظة الرئيسية بالدولار غير كافٍ. المتاح: $${totalAvailableUSD.toFixed(2)}، والمطلوب: $${params.amountUSD}`);
    }

    let remainingToConsumeUSD = params.amountUSD;
    let totalConsumedEGP = 0;
    const consumedSources: Array<{
      sourceLotId: string;
      consumedAmountUSD: number;
      rateEGP: number;
      costEGP: number;
    }> = [];

    for (const lot of mainLots) {
      if (remainingToConsumeUSD <= 0) break;
      const takeUSD = Math.min(lot.remainingQuantity, remainingToConsumeUSD);
      const lotCostEGP = takeUSD * lot.unitCostEGP;

      lot.remainingQuantity -= takeUSD;
      remainingToConsumeUSD -= takeUSD;
      totalConsumedEGP += lotCostEGP;

      consumedSources.push({
        sourceLotId: lot.id,
        consumedAmountUSD: takeUSD,
        rateEGP: lot.unitCostEGP,
        costEGP: lotCostEGP
      });

      this.saveLot(lot);
    }

    // 2. Determine Effective vs Overridden USD Rate
    const autoEffectiveUSDRate = totalConsumedEGP / params.amountUSD;
    let finalUSDRate = autoEffectiveUSDRate;
    let isOverridden = false;

    if (params.manualUSDRate && params.manualUSDRate > 0 && params.manualUSDRate !== autoEffectiveUSDRate) {
      finalUSDRate = params.manualUSDRate;
      isOverridden = true;
      totalConsumedEGP = params.amountUSD * finalUSDRate;
    }

    // 3. Deduct from Main Wallet
    mainWallet.balanceUSD = Math.max(0, (mainWallet.balanceUSD || 0) - params.amountUSD);
    mainWallet.balanceEGP = Math.max(0, (mainWallet.balanceEGP || 0) - totalConsumedEGP);
    this.saveWallet(mainWallet);

    const mainTxId = `tx_purch_${Date.now()}`;
    const subTxId = `tx_dep_${Date.now()}`;
    const subLotId = `lot_sub_${Date.now()}`;
    const effectivePurchaseDate = params.purchaseDate ? new Date(params.purchaseDate).toISOString() : new Date().toISOString();
    const lotNumber = `LOT-PTS-${Date.now().toString().slice(-6)}`;

    const mainTransaction: JKRWalletTransaction = {
      id: mainTxId,
      transactionNumber: `FUND-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      ticketNumber,
      walletId: mainWallet.id,
      walletName: mainWallet.name,
      walletType: mainWallet.type,
      gameOrPointType: 'USD',
      transactionType: 'PURCHASE',
      quantityOut: params.amountUSD,
      amountEGP: totalConsumedEGP,
      amountUSD: params.amountUSD,
      balanceAfter: mainWallet.balanceUSD,
      referenceType: 'SUB_WALLET',
      referenceId: subWallet.id,
      lotId: subLotId,
      lotNumber,
      performedBy: {
        id: user?.id || 'admin_1',
        name: finalPerformerName,
        role: 'admin'
      },
      notes: `صادر شراء رصيد للمحفظة الفرعية [${subWallet.name}]: ${params.pointsCount.toLocaleString()} نقطة ($${params.amountUSD})${params.notes ? ` | ${params.notes.trim()}` : ''}`,
      createdAt: new Date().toISOString()
    };
    this.saveTransaction(mainTransaction);

    // 4. Calculate Sub-wallet Point Costs
    const costPerPointEGP = totalConsumedEGP / params.pointsCount;
    const costPerPointUSD = params.amountUSD / params.pointsCount;

    // 5. Create Sub-wallet Points FIFO Lot
    const subLot: JKRWalletLot = {
      id: subLotId,
      lotNumber,
      walletId: subWallet.id,
      sourceTransactionId: subTxId,
      currencyOrPoints: 'POINTS',
      initialQuantity: params.pointsCount,
      remainingQuantity: params.pointsCount,
      unitCostEGP: costPerPointEGP,
      unitCostUSD: costPerPointUSD,
      totalCostEGP: totalConsumedEGP,
      totalCostUSD: params.amountUSD,
      exchangeRateUsed: finalUSDRate,
      usdRateOverridden: isOverridden,
      usdRateOriginal: isOverridden ? autoEffectiveUSDRate : undefined,
      overrideReason: isOverridden ? params.overrideReason : undefined,
      overrideUser: isOverridden ? finalPerformerName : undefined,
      consumedSources,
      purchaseDate: effectivePurchaseDate,
      notes: params.notes,
      createdAt: effectivePurchaseDate
    };
    this.saveLot(subLot);

    // 6. Update Sub-wallet Balances & Status
    subWallet.pointsBalance = (subWallet.pointsBalance || 0) + params.pointsCount;
    if (subWallet.status === 'SAFETY_LIMIT_REACHED' || subWallet.status === 'LOW_BALANCE') {
      subWallet.status = 'ACTIVE';
    }
    this.saveWallet(subWallet);

    // 7. Create Sub-wallet Append-Only Ledger Entry
    const subTransaction: JKRWalletTransaction = {
      id: subTxId,
      transactionNumber: ticketNumber,
      ticketNumber,
      walletId: subWallet.id,
      walletName: subWallet.name,
      walletType: subWallet.type,
      gameOrPointType: subWallet.pointType,
      transactionType: 'DEPOSIT',
      quantityIn: params.pointsCount,
      amountEGP: totalConsumedEGP,
      amountUSD: params.amountUSD,
      costPerPoint: costPerPointEGP,
      exchangeRateUsed: finalUSDRate,
      balanceAfter: subWallet.pointsBalance,
      referenceType: 'MAIN_WALLET',
      referenceId: mainWallet.id,
      lotId: subLot.id,
      lotNumber: subLot.lotNumber,
      performedBy: {
        id: user?.id || 'admin_1',
        name: finalPerformerName,
        role: 'admin'
      },
      notes: `وارد شراء نقاط من المحفظة الرئيسية [${mainWallet.name}]: ${params.pointsCount.toLocaleString()} نقطة بتكلفة ${costPerPointEGP.toFixed(4)} ج/نقطة ($${params.amountUSD})${params.notes ? ` | ${params.notes.trim()}` : ''}`,
      createdAt: effectivePurchaseDate
    };
    this.saveTransaction(subTransaction);
    this.notifyWalletMutation(subWallet.id, 'deposit');

    return { subWallet, subLot, mainTransaction, subTransaction };
  }

  // --------------------------------------------------------------------------
  // Delete / Revert Deposit Lot (Sub-Wallet Points Lot or Main-Wallet USD Lot)
  // --------------------------------------------------------------------------
  public static deleteDepositLot(params: {
    lotId: string;
    reason?: string;
    restoreToParentWallet?: boolean;
    user?: any;
  }): {
    success: boolean;
    pointsRemoved?: number;
    usdRemoved?: number;
    restoredUSD?: number;
    message: string;
  } {
    const lot = this.getLotById(params.lotId);
    if (!lot) throw new Error('شحنة الإيداع غير موجودة أو تم حذفها مسبقاً');

    const wallet = this.getWalletById(lot.walletId);
    if (!wallet) throw new Error('المحفظة المرتبطة بالشحنة غير موجودة');

    const adminPerformerName = params.user?.fullName || params.user?.name;
    const finalPerformerName = adminPerformerName && adminPerformerName !== 'النظام' ? adminPerformerName : 'المدير العام (Owner)';
    const deleteReason = params.reason?.trim() || 'تصحيح خطأ إيداع نقاط وهمية';

    let pointsRemoved = 0;
    let usdRemoved = 0;
    let restoredUSD = 0;
    let restoredEGP = 0;

    if (wallet.type === 'SUB') {
      // Sub-Wallet Points Lot Deletion
      pointsRemoved = lot.remainingQuantity;

      // 1. Deduct remaining points from sub-wallet balance
      wallet.pointsBalance = Math.max(0, (wallet.pointsBalance || 0) - pointsRemoved);
      if (wallet.pointsBalance <= 0) {
        wallet.status = 'LOW_BALANCE';
      }
      this.saveWallet(wallet);

      // 2. Restore funds to Parent Main Wallet if requested and available
      if (params.restoreToParentWallet !== false && wallet.parentWalletId) {
        const mainWallet = this.getWalletById(wallet.parentWalletId);
        if (mainWallet) {
          const ratio = lot.initialQuantity > 0 ? (lot.remainingQuantity / lot.initialQuantity) : 1;

          // Restore consumed lots in parent main wallet
          if (lot.consumedSources && lot.consumedSources.length > 0) {
            for (const src of lot.consumedSources) {
              const parentLot = this.getLotById(src.sourceLotId);
              if (parentLot) {
                const addBackUSD = src.consumedAmountUSD * ratio;
                parentLot.remainingQuantity = Math.min(parentLot.initialQuantity, parentLot.remainingQuantity + addBackUSD);
                this.saveLot(parentLot);
              }
            }
          }

          restoredUSD = (lot.totalCostUSD || 0) * ratio;
          restoredEGP = (lot.totalCostEGP || 0) * ratio;

          if (restoredUSD > 0) {
            mainWallet.balanceUSD = (mainWallet.balanceUSD || 0) + restoredUSD;
          }
          if (restoredEGP > 0) {
            mainWallet.balanceEGP = (mainWallet.balanceEGP || 0) + restoredEGP;
          }
          this.saveWallet(mainWallet);

          // Add Reversal/Recovery transaction to Main Wallet ledger
          if (restoredUSD > 0) {
            this.saveTransaction({
              walletId: mainWallet.id,
              walletType: mainWallet.type,
              walletName: mainWallet.name,
              gameOrPointType: 'USD',
              transactionType: 'REVERSAL',
              quantityIn: restoredUSD,
              amountUSD: restoredUSD,
              amountEGP: restoredEGP,
              balanceAfter: mainWallet.balanceUSD,
              referenceType: 'SUB_WALLET',
              referenceId: wallet.id,
              lotId: lot.id,
              lotNumber: lot.lotNumber,
              notes: `استرداد تمويل $${restoredUSD.toFixed(2)} ناتج عن حذف وإلغاء شحنة نقاط [${wallet.name}] (#${lot.lotNumber}) — السبب: ${deleteReason}`,
              performedBy: {
                id: params.user?.id || 'admin_1',
                name: finalPerformerName,
                role: 'admin'
              }
            });
          }
        }
      }

      // 3. Record Reversal transaction in Sub-Wallet ledger
      this.saveTransaction({
        walletId: wallet.id,
        walletType: wallet.type,
        walletName: wallet.name,
        gameOrPointType: wallet.pointType,
        transactionType: 'REVERSAL',
        quantityOut: pointsRemoved,
        amountUSD: restoredUSD,
        amountEGP: restoredEGP,
        balanceAfter: wallet.pointsBalance,
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        referenceType: 'MAIN_WALLET',
        referenceId: wallet.parentWalletId,
        notes: `حذف وإلغاء شحنة إيداع (${pointsRemoved.toLocaleString()} نقطة) دفعة #${lot.lotNumber} — السبب: ${deleteReason}`,
        performedBy: {
          id: params.user?.id || 'admin_1',
          name: finalPerformerName,
          role: 'admin'
        }
      });
    } else {
      // Main-Wallet USD Lot Deletion
      usdRemoved = lot.remainingQuantity;
      const egpRemoved = (lot.totalCostEGP || 0) * (lot.initialQuantity > 0 ? lot.remainingQuantity / lot.initialQuantity : 1);

      wallet.balanceUSD = Math.max(0, (wallet.balanceUSD || 0) - usdRemoved);
      wallet.balanceEGP = Math.max(0, (wallet.balanceEGP || 0) - egpRemoved);
      if (wallet.balanceUSD <= 0) {
        wallet.status = 'LOW_BALANCE';
      }
      this.saveWallet(wallet);

      this.saveTransaction({
        walletId: wallet.id,
        walletType: wallet.type,
        walletName: wallet.name,
        gameOrPointType: 'USD',
        transactionType: 'REVERSAL',
        quantityOut: usdRemoved,
        amountUSD: usdRemoved,
        amountEGP: egpRemoved,
        balanceAfter: wallet.balanceUSD,
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        notes: `حذف وإلغاء شحنة تمويل ($${usdRemoved.toFixed(2)}) دفعة #${lot.lotNumber} — السبب: ${deleteReason}`,
        performedBy: {
          id: params.user?.id || 'admin_1',
          name: finalPerformerName,
          role: 'admin'
        }
      });
    }

    // 4. Mark associated original deposit/funding transaction as CANCELLED
    const allTxs = this.getStoredData<JKRWalletTransaction>(STORAGE_KEYS.TRANSACTIONS, []);
    let txModified = false;
    for (const t of allTxs) {
      if (
        t.lotId === lot.id ||
        (lot.sourceTransactionId && t.id === lot.sourceTransactionId) ||
        (t.lotNumber === lot.lotNumber && (t.transactionType === 'DEPOSIT' || t.transactionType === 'FUNDING'))
      ) {
        t.status = 'CANCELLED';
        t.notes = `[ملغاة ومحذوفة: ${deleteReason}] ${t.notes || ''}`;
        txModified = true;
      }
    }
    if (txModified) {
      this.setStoredData(STORAGE_KEYS.TRANSACTIONS, allTxs);
    }

    // 5. Remove Lot from storage
    const allLots = this.getStoredData<JKRWalletLot>(STORAGE_KEYS.LOTS, []);
    this.setStoredData(STORAGE_KEYS.LOTS, allLots.filter(l => l.id !== lot.id));

    // 6. Notify Mutation
    this.notifyWalletMutation(wallet.id, 'delete_deposit');

    return {
      success: true,
      pointsRemoved,
      usdRemoved,
      restoredUSD,
      message: wallet.type === 'SUB'
        ? `تم حذف شحنة الإيداع #${lot.lotNumber} بنجاح، وخصم ${pointsRemoved.toLocaleString()} نقطة من المحفظة${restoredUSD > 0 ? ` واسترداد $${restoredUSD.toFixed(2)} للمحفظة الرئيسية` : ''}.`
        : `تم حذف شحنة التمويل #${lot.lotNumber} بنجاح، وخصم $${usdRemoved.toFixed(2)} من المحفظة.`
    };
  }

  // --------------------------------------------------------------------------
  // Edit Deposit Lot (Sub-Wallet Points Lot or Main-Wallet USD Lot)
  // --------------------------------------------------------------------------
  public static editDepositLot(params: {
    lotId: string;
    newPoints?: number;
    newAmountUSD?: number;
    newRateEGP?: number;
    newDate?: string;
    newNotes?: string;
    newTicketNumber?: string;
    user?: any;
  }): {
    success: boolean;
    lot: JKRWalletLot;
    wallet: JKRWallet;
    message: string;
  } {
    const lot = this.getLotById(params.lotId);
    if (!lot) throw new Error('شحنة الإيداع غير موجودة');

    const wallet = this.getWalletById(lot.walletId);
    if (!wallet) throw new Error('المحفظة المرتبطة بالشحنة غير موجودة');

    const adminPerformerName = params.user?.fullName || params.user?.name;
    const finalPerformerName = adminPerformerName && adminPerformerName !== 'النظام' ? adminPerformerName : 'المدير العام (Owner)';

    if (wallet.type === 'SUB') {
      const oldInitial = lot.initialQuantity;
      const newPoints = params.newPoints !== undefined ? Math.max(0, params.newPoints) : oldInitial;
      const consumed = Math.max(0, oldInitial - lot.remainingQuantity);

      if (newPoints < consumed) {
        throw new Error(`لا يمكن تعديل النقاط إلى (${newPoints.toLocaleString()}) لأن هناك (${consumed.toLocaleString()} نقطة) مستهلكة بالفعل من هذه الشحنة`);
      }

      const deltaPoints = newPoints - oldInitial;
      lot.initialQuantity = newPoints;
      lot.remainingQuantity = Math.max(0, lot.remainingQuantity + deltaPoints);
      wallet.pointsBalance = Math.max(0, (wallet.pointsBalance || 0) + deltaPoints);

      const oldUSD = lot.totalCostUSD || 0;
      const newUSD = params.newAmountUSD !== undefined ? Math.max(0, params.newAmountUSD) : oldUSD;
      const newRate = params.newRateEGP !== undefined && params.newRateEGP > 0 ? params.newRateEGP : (lot.exchangeRateUsed || 50);
      const deltaUSD = newUSD - oldUSD;

      lot.totalCostUSD = newUSD;
      lot.exchangeRateUsed = newRate;
      lot.totalCostEGP = newUSD * newRate;
      lot.unitCostUSD = newPoints > 0 ? newUSD / newPoints : 0;
      lot.unitCostEGP = newPoints > 0 ? (newUSD * newRate) / newPoints : 0;

      // Adjust Parent Main Wallet if USD changed
      if (wallet.parentWalletId && deltaUSD !== 0) {
        const mainWallet = this.getWalletById(wallet.parentWalletId);
        if (mainWallet) {
          if (deltaUSD > 0) {
            mainWallet.balanceUSD = Math.max(0, (mainWallet.balanceUSD || 0) - deltaUSD);
            mainWallet.balanceEGP = Math.max(0, (mainWallet.balanceEGP || 0) - (deltaUSD * newRate));
          } else {
            mainWallet.balanceUSD = (mainWallet.balanceUSD || 0) + Math.abs(deltaUSD);
            mainWallet.balanceEGP = (mainWallet.balanceEGP || 0) + (Math.abs(deltaUSD) * newRate);
          }
          this.saveWallet(mainWallet);
        }
      }

      if (params.newDate) {
        lot.purchaseDate = params.newDate;
        lot.createdAt = params.newDate;
      }
      if (params.newNotes !== undefined) {
        lot.notes = params.newNotes;
      }

      // Update associated DEPOSIT transaction
      const allTxs = this.getStoredData<JKRWalletTransaction>(STORAGE_KEYS.TRANSACTIONS, []);
      for (const t of allTxs) {
        if (
          t.lotId === lot.id ||
          (lot.sourceTransactionId && t.id === lot.sourceTransactionId) ||
          (t.lotNumber === lot.lotNumber && t.transactionType === 'DEPOSIT')
        ) {
          t.quantityIn = newPoints;
          t.amountUSD = lot.totalCostUSD;
          t.amountEGP = lot.totalCostEGP;
          t.costPerPoint = lot.unitCostEGP;
          t.exchangeRateUsed = lot.exchangeRateUsed;
          if (params.newNotes !== undefined) t.notes = params.newNotes;
          if (params.newDate) t.createdAt = params.newDate;
          if (params.newTicketNumber) {
            t.ticketNumber = params.newTicketNumber;
            t.transactionNumber = params.newTicketNumber;
          }
          t.balanceAfter = wallet.pointsBalance;
          t.performedBy = {
            id: params.user?.id || 'admin_1',
            name: finalPerformerName,
            role: 'admin'
          };
        }
      }
      this.setStoredData(STORAGE_KEYS.TRANSACTIONS, allTxs);

      this.saveLot(lot);
      this.saveWallet(wallet);
      this.notifyWalletMutation(wallet.id, 'edit_deposit');

      return {
        success: true,
        lot,
        wallet,
        message: `تم تعديل شحنة الإيداع #${lot.lotNumber} بنجاح إلى ${newPoints.toLocaleString()} نقطة.`
      };
    } else {
      // Main-Wallet USD Funding Lot
      const oldInitial = lot.initialQuantity;
      const newUSD = params.newAmountUSD !== undefined ? Math.max(0, params.newAmountUSD) : oldInitial;
      const deltaUSD = newUSD - oldInitial;

      lot.initialQuantity = newUSD;
      lot.remainingQuantity = Math.max(0, lot.remainingQuantity + deltaUSD);
      wallet.balanceUSD = Math.max(0, (wallet.balanceUSD || 0) + deltaUSD);

      const newRate = params.newRateEGP !== undefined && params.newRateEGP > 0 ? params.newRateEGP : (lot.exchangeRateUsed || 50);
      lot.exchangeRateUsed = newRate;
      lot.totalCostEGP = newUSD * newRate;
      lot.totalCostUSD = newUSD;
      lot.unitCostEGP = newRate;
      lot.unitCostUSD = 1;

      if (params.newDate) {
        lot.purchaseDate = params.newDate;
        lot.createdAt = params.newDate;
      }
      if (params.newNotes !== undefined) {
        lot.notes = params.newNotes;
      }

      // Update associated FUNDING transaction
      const allTxs = this.getStoredData<JKRWalletTransaction>(STORAGE_KEYS.TRANSACTIONS, []);
      for (const t of allTxs) {
        if (
          t.lotId === lot.id ||
          (lot.sourceTransactionId && t.id === lot.sourceTransactionId) ||
          (t.lotNumber === lot.lotNumber && t.transactionType === 'FUNDING')
        ) {
          t.quantityIn = newUSD;
          t.amountUSD = newUSD;
          t.amountEGP = lot.totalCostEGP;
          t.exchangeRateUsed = newRate;
          if (params.newNotes !== undefined) t.notes = params.newNotes;
          if (params.newDate) t.createdAt = params.newDate;
          if (params.newTicketNumber) {
            t.ticketNumber = params.newTicketNumber;
            t.transactionNumber = params.newTicketNumber;
          }
          t.balanceAfter = wallet.balanceUSD;
          t.performedBy = {
            id: params.user?.id || 'admin_1',
            name: finalPerformerName,
            role: 'admin'
          };
        }
      }
      this.setStoredData(STORAGE_KEYS.TRANSACTIONS, allTxs);

      this.saveLot(lot);
      this.saveWallet(wallet);
      this.notifyWalletMutation(wallet.id, 'edit_deposit');

      return {
        success: true,
        lot,
        wallet,
        message: `تم تعديل شحنة التمويل #${lot.lotNumber} بنجاح إلى $${newUSD.toFixed(2)}.`
      };
    }
  }

  // --------------------------------------------------------------------------
  // 21-26. Smart Product Wallet Priority Cascade Resolver
  // --------------------------------------------------------------------------
  public static evaluateProductWalletAvailability(
    product: GameProduct,
    quantity = 1
  ): {
    isAvailable: boolean;
    selectedWallet: JKRWallet | null;
    reason?: string;
    pointsNeeded: number;
  } {
    const pointsPerUnit = product.pointsCostPerUnit || 0;
    const pointsNeeded = pointsPerUnit * quantity;

    // If product doesn't use points or has zero point cost, product is available if active
    if (pointsNeeded <= 0) {
      const isOk = product.isActive !== false && (product.availableQuantity === undefined || product.availableQuantity === null || product.availableQuantity >= quantity);
      return {
        isAvailable: isOk,
        selectedWallet: null,
        reason: isOk ? undefined : (product.disabledReason || 'المنتج غير متاح'),
        pointsNeeded: 0
      };
    }

    // Build ordered list of wallets: Primary -> Alternative #1 -> Alternative #2...
    const candidateWalletIds: string[] = [];
    if (product.primaryWalletId && product.primaryWalletId !== 'default') {
      candidateWalletIds.push(product.primaryWalletId);
    }
    if (product.walletTypeId && product.walletTypeId !== 'default' && !candidateWalletIds.includes(product.walletTypeId)) {
      candidateWalletIds.push(product.walletTypeId);
    }
    if (product.alternativeWalletIds && product.alternativeWalletIds.length > 0) {
      candidateWalletIds.push(...product.alternativeWalletIds.filter(id => id && !candidateWalletIds.includes(id)));
    }
    if (product.alternativeWallets && product.alternativeWallets.length > 0) {
      const sortedAlts = [...product.alternativeWallets].sort((a, b) => a.priority - b.priority);
      sortedAlts.forEach(alt => {
        if (alt.walletId && !candidateWalletIds.includes(alt.walletId)) {
          candidateWalletIds.push(alt.walletId);
        }
      });
    }

    if (candidateWalletIds.length === 0) {
      // Fallback: check all active sub-wallets matching game/point type
      const allSubWallets = this.getWallets().filter(w => w.type === 'SUB' && w.isActive !== false);
      if (allSubWallets.length === 0) {
        return {
          isAvailable: false,
          selectedWallet: null,
          reason: 'لا توجد أي محفظة مرتبطة بالمنتج أو بالنظام',
          pointsNeeded
        };
      }
      candidateWalletIds.push(...allSubWallets.map(w => w.id));
    }

    // Check each candidate wallet in priority order
    for (const walletId of candidateWalletIds) {
      const wallet = this.getWalletById(walletId);
      if (!wallet) continue;

      // 1. Check if disabled or frozen
      if (!wallet.isActive || wallet.status === 'DISABLED') continue;
      if (wallet.status === 'FROZEN') continue;

      // 2. Check safety limit
      const currentBalance = wallet.pointsBalance || 0;
      const safetyLimit = wallet.safetyLimit !== undefined ? wallet.safetyLimit : -500;
      const balanceAfter = currentBalance - pointsNeeded;

      if (balanceAfter < safetyLimit) {
        // Safety limit exceeded, try next wallet
        continue;
      }

      // Valid wallet found!
      return {
        isAvailable: true,
        selectedWallet: wallet,
        pointsNeeded
      };
    }

    return {
      isAvailable: false,
      selectedWallet: null,
      reason: 'جميع المحافظ المرتبطة بالمنتج غير متاحة أو تجاوزت حد الأمان',
      pointsNeeded
    };
  }

  // --------------------------------------------------------------------------
  // 28, 29, 34. Atomic Sub-Wallet Points Consumption (FIFO + Lock)
  // --------------------------------------------------------------------------
  public static consumeSubWalletPoints(
    ticketId: string,
    walletId: string,
    pointsRequired: number,
    user?: any,
    metadata?: {
      ticketNumber?: string;
      productName?: string;
      customerName?: string;
      customerId?: string;
    }
  ): {
    totalCostEGP: number;
    totalCostUSD: number;
    consumedLots: Array<{
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
    consumptions: JKRWalletConsumption[];
  } {
    // 🔒 Concurrency Mutex Lock for Atomicity
    const lockAcquired = WalletMutex.tryAcquire(walletId);
    if (!lockAcquired) {
      throw new Error(`المحفظة [${walletId}] قيد الاستخدام في معاملة مالية أخرى متزامنة، يرجى إعادة المحاولة.`);
    }

    try {
      const wallet = this.getWalletById(walletId);
      if (!wallet) throw new Error('المحفظة غير موجودة');
      if (wallet.status === 'FROZEN' || !wallet.isActive || wallet.status === 'DISABLED') {
        throw new Error(`المحفظة [${wallet.name}] غير صالحة للاستهلاك حالياً`);
      }

      const safetyLimit = wallet.safetyLimit !== undefined ? wallet.safetyLimit : -500;
      if ((wallet.pointsBalance || 0) - pointsRequired < safetyLimit) {
        throw new Error(`الرصيد يتجاوز حد الأمان المسموح (${safetyLimit} نقطة)`);
      }

      // Get active lots sorted by oldest first (FIFO)
      const subLots = this.getLotsByWallet(wallet.id)
        .filter(l => l.remainingQuantity > 0)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      let remainingToConsume = pointsRequired;
      let totalCostEGP = 0;
      let totalCostUSD = 0;
      const consumedLotsList: Array<{
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
      }> = [];
      const consumptionRecords: JKRWalletConsumption[] = [];

      for (const lot of subLots) {
        if (remainingToConsume <= 0) break;
        const takePoints = Math.min(lot.remainingQuantity, remainingToConsume);
        const pointsBefore = lot.remainingQuantity;
        const lotRate = lot.exchangeRateUsed || (lot.unitCostUSD && lot.unitCostUSD > 0 ? lot.unitCostEGP / lot.unitCostUSD : 50);
        const lotUnitUSD = lot.unitCostUSD || (lotRate > 0 ? lot.unitCostEGP / lotRate : 0);
        const lotCostEGP = takePoints * lot.unitCostEGP;
        const lotCostUSD = takePoints * lotUnitUSD;

        lot.remainingQuantity -= takePoints;
        remainingToConsume -= takePoints;
        totalCostEGP += lotCostEGP;
        totalCostUSD += lotCostUSD;

        consumedLotsList.push({
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          depositBondNumber: lot.sourceTransactionId || lot.lotNumber,
          depositDate: lot.purchaseDate || lot.createdAt,
          walletId: wallet.id,
          walletName: wallet.name,
          pointsBefore,
          pointsConsumed: takePoints,
          pointsRemaining: lot.remainingQuantity,
          unitCostUSD: lotUnitUSD,
          exchangeRateUsed: lotRate,
          unitCostEGP: lot.unitCostEGP,
          totalCostUSD: lotCostUSD,
          totalCostEGP: lotCostEGP
        });

        const consRecord: JKRWalletConsumption = {
          id: `cons_${Date.now()}_${lot.id}`,
          ticketId,
          walletId: wallet.id,
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          pointsConsumed: takePoints,
          costEGP: lotCostEGP,
          costUSD: lotCostUSD,
          createdAt: new Date().toISOString()
        };
        consumptionRecords.push(consRecord);
        this.saveLot(lot);
      }

      // If points remainingToConsume > 0 (sub-wallet operates in negative safety limit allowance)
      if (remainingToConsume > 0) {
        // Fallback cost rate using the last lot cost or general rate
        const lastLotRate = subLots[subLots.length - 1]?.exchangeRateUsed || 50;
        const lastLotUnitUSD = subLots[subLots.length - 1]?.unitCostUSD || (subLots[subLots.length - 1]?.unitCostEGP ? subLots[subLots.length - 1].unitCostEGP / lastLotRate : 0.02);
        const lastLotUnitEGP = subLots[subLots.length - 1]?.unitCostEGP || (lastLotUnitUSD * lastLotRate);
        const fallbackCostEGP = remainingToConsume * lastLotUnitEGP;
        const fallbackCostUSD = remainingToConsume * lastLotUnitUSD;
        totalCostEGP += fallbackCostEGP;
        totalCostUSD += fallbackCostUSD;

        consumedLotsList.push({
          lotId: 'negative_overdraft',
          lotNumber: 'حد الأمان السالب',
          depositBondNumber: 'حد السحب على المكشوف',
          depositDate: new Date().toISOString(),
          walletId: wallet.id,
          walletName: wallet.name,
          pointsBefore: 0,
          pointsConsumed: remainingToConsume,
          pointsRemaining: -remainingToConsume,
          unitCostUSD: lastLotUnitUSD,
          exchangeRateUsed: lastLotRate,
          unitCostEGP: lastLotUnitEGP,
          totalCostUSD: fallbackCostUSD,
          totalCostEGP: fallbackCostEGP
        });
      }

      // Save consumption records
      for (const c of consumptionRecords) {
        this.saveConsumption(c);
      }

      // Update Sub-wallet points balance and status
      wallet.pointsBalance = (wallet.pointsBalance || 0) - pointsRequired;
      if (wallet.pointsBalance <= safetyLimit) {
        wallet.status = 'SAFETY_LIMIT_REACHED';
      } else if (wallet.alertThreshold !== undefined && wallet.pointsBalance <= wallet.alertThreshold) {
        wallet.status = 'LOW_BALANCE';
      }
      this.saveWallet(wallet);

      // Lookup ticket details to populate rich ledger audit metadata
      let ticketNum = metadata?.ticketNumber || ticketId;
      let prodName = metadata?.productName || '';
      let custName = metadata?.customerName || '';
      let custId = metadata?.customerId || '';

      if (!prodName || !custName) {
        try {
          const rawTickets = localStorage.getItem('nzm_jkr_tickets');
          if (rawTickets) {
            const ticketsList = JSON.parse(rawTickets);
            const matched = ticketsList.find((t: any) => t.id === ticketId || t.ticketNumber === ticketId);
            if (matched) {
              ticketNum = ticketNum || matched.ticketNumber || ticketId;
              prodName = prodName || matched.productName || '';
              custName = custName || matched.customerName || '';
              custId = custId || matched.customerId || '';
            }
          }
        } catch { }
      }

      // Create Ledger Record with full audit details
      const costPerPt = pointsRequired > 0 ? (totalCostEGP / pointsRequired) : 0;
      const tx: JKRWalletTransaction = {
        id: `tx_cons_${Date.now()}`,
        walletId: wallet.id,
        walletName: wallet.name,
        walletType: wallet.type,
        gameOrPointType: wallet.pointType,
        transactionType: 'CONSUMPTION',
        quantityOut: pointsRequired,
        amountEGP: totalCostEGP,
        amountUSD: totalCostUSD,
        costPerPoint: costPerPt,
        balanceAfter: wallet.pointsBalance,
        ticketId,
        ticketNumber: ticketNum,
        productName: prodName || undefined,
        customerName: custName || undefined,
        customerId: custId || undefined,
        referenceType: 'TICKET',
        referenceId: ticketId,
        performedBy: {
          id: user?.id || 'sys',
          name: user?.fullName || user?.name || 'النظام',
          role: user?.role || 'system'
        },
        notes: `صادر استهلاك تذكرة #${ticketNum}${prodName ? ` — منتج: ${prodName}` : ''}${custName ? ` (العميل: ${custName})` : ''}: ${pointsRequired} نقطة بتكلفة فعلية ${totalCostEGP.toFixed(2)} ج`,
        createdAt: new Date().toISOString()
      };
      this.saveTransaction(tx);
      this.notifyWalletMutation(wallet.id, 'consume');

      return {
        totalCostEGP,
        totalCostUSD,
        consumedLots: consumedLotsList,
        consumptions: consumptionRecords
      };
    } finally {
      if (lockAcquired) {
        WalletMutex.release(walletId);
      }
    }
  }

  public static restoreSubWalletPoints(
    walletId: string,
    points: number,
    ticketNumber: string,
    reason: string = 'استرداد أو إلغاء تذكرة',
    user?: any
  ): boolean {
    if (!walletId || points <= 0) return false;
    const wallet = this.getWalletById(walletId);
    if (!wallet) return false;

    wallet.pointsBalance = (wallet.pointsBalance || 0) + points;
    if (wallet.status === 'SAFETY_LIMIT_REACHED' && wallet.pointsBalance > (wallet.safetyLimit ?? -500)) {
      wallet.status = 'ACTIVE';
    }
    this.saveWallet(wallet);

    const performerName = (user?.fullName || user?.name) && (user?.fullName || user?.name) !== 'النظام'
      ? (user?.fullName || user?.name)
      : 'المدير العام (Owner)';

    const tx: JKRWalletTransaction = {
      id: `tx_restore_${Date.now()}`,
      walletId: wallet.id,
      transactionType: 'ADJUSTMENT',
      quantityIn: points,
      amountEGP: 0,
      balanceAfter: wallet.pointsBalance,
      referenceType: 'TICKET',
      referenceId: ticketNumber,
      performedBy: {
        id: user?.id || 'admin_1',
        name: performerName,
        role: user?.role || 'admin'
      },
      notes: `${reason} #${ticketNumber}: استرجاع ${points} نقطة للمحفظة`,
      createdAt: new Date().toISOString()
    };
    this.saveTransaction(tx);
    this.notifyWalletMutation(wallet.id, 'restore');

    return true;
  }

  // --------------------------------------------------------------------------
  // 30-32. Complete Ticket With Immutable Wallet Snapshot
  // --------------------------------------------------------------------------
  public static getWalletEffectivePointCost(walletId: string, pointsNeeded = 1): {
    costPerPointUSD: number;
    costPerPointEGP: number;
    totalCostUSD: number;
    totalCostEGP: number;
    effectiveExchangeRate: number;
    hasActiveLots: boolean;
  } {
    const wallet = this.getWalletById(walletId);
    if (!wallet) {
      return {
        costPerPointUSD: 0,
        costPerPointEGP: 0,
        totalCostUSD: 0,
        totalCostEGP: 0,
        effectiveExchangeRate: 50,
        hasActiveLots: false
      };
    }

    const lots = this.getLotsByWallet(wallet.id)
      .filter(l => l.remainingQuantity > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (lots.length === 0) {
      const allLots = this.getLotsByWallet(wallet.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const lastLot = allLots[0];
      const rate = lastLot?.exchangeRateUsed || 50;
      const unitCostUSD = lastLot?.unitCostUSD || (lastLot?.unitCostEGP ? lastLot.unitCostEGP / rate : 0.05);
      const unitCostEGP = lastLot?.unitCostEGP || (unitCostUSD * rate);
      const pts = Math.max(0, pointsNeeded);

      return {
        costPerPointUSD: Math.round(unitCostUSD * 10000) / 10000,
        costPerPointEGP: Math.round(unitCostEGP * 10000) / 10000,
        totalCostUSD: Math.round(pts * unitCostUSD * 10000) / 10000,
        totalCostEGP: Math.round(pts * unitCostEGP * 100) / 100,
        effectiveExchangeRate: rate,
        hasActiveLots: false
      };
    }

    if (pointsNeeded <= 0) {
      const firstLot = lots[0];
      const rate = firstLot.exchangeRateUsed || 50;
      const unitCostUSD = firstLot.unitCostUSD || (firstLot.unitCostEGP ? firstLot.unitCostEGP / rate : 0.05);
      const unitCostEGP = firstLot.unitCostEGP || (unitCostUSD * rate);
      return {
        costPerPointUSD: Math.round(unitCostUSD * 10000) / 10000,
        costPerPointEGP: Math.round(unitCostEGP * 10000) / 10000,
        totalCostUSD: 0,
        totalCostEGP: 0,
        effectiveExchangeRate: rate,
        hasActiveLots: true
      };
    }

    let remaining = Math.max(0, pointsNeeded);
    let totalCostUSD = 0;
    let totalCostEGP = 0;
    let lastRate = lots[0].exchangeRateUsed || 50;

    for (const lot of lots) {
      if (remaining <= 0) break;
      const take = Math.min(lot.remainingQuantity, remaining);
      const costE = take * lot.unitCostEGP;
      const costU = take * (lot.unitCostUSD || (lot.unitCostEGP / (lot.exchangeRateUsed || 50)));

      totalCostEGP += costE;
      totalCostUSD += costU;
      remaining -= take;
      lastRate = lot.exchangeRateUsed || lastRate;
    }

    if (remaining > 0) {
      const fallbackLot = lots[lots.length - 1];
      const fallbackUnitEGP = fallbackLot.unitCostEGP;
      const fallbackUnitUSD = fallbackLot.unitCostUSD || (fallbackUnitEGP / lastRate);
      totalCostEGP += remaining * fallbackUnitEGP;
      totalCostUSD += remaining * fallbackUnitUSD;
    }

    const pts = pointsNeeded > 0 ? pointsNeeded : 1;
    const avgCostPerPointUSD = totalCostUSD / pts;
    const avgCostPerPointEGP = totalCostEGP / pts;

    return {
      costPerPointUSD: Math.round(avgCostPerPointUSD * 10000) / 10000,
      costPerPointEGP: Math.round(avgCostPerPointEGP * 10000) / 10000,
      totalCostUSD: Math.round(totalCostUSD * 10000) / 10000,
      totalCostEGP: Math.round(totalCostEGP * 100) / 100,
      effectiveExchangeRate: lastRate,
      hasActiveLots: true
    };
  }

  public static processTicketWalletExecution(
    product: GameProduct,
    quantity: number,
    ticketId: string,
    actualPaidEGP: number,
    cashbackEGP: number,
    referralEGP: number,
    fixedCostEGP: number,
    user?: any
  ): {
    success: boolean;
    snapshot: TicketWalletSnapshot;
    message: string;
  } {
    const evalResult = this.evaluateProductWalletAvailability(product, quantity);
    if (!evalResult.isAvailable || !evalResult.selectedWallet) {
      return {
        success: false,
        snapshot: {} as any,
        message: evalResult.reason || 'المحفظة غير متاحة'
      };
    }

    const wallet = evalResult.selectedWallet;
    const pointsNeeded = evalResult.pointsNeeded;

    let totalCostEGP = 0;
    let totalCostUSD = 0;
    let consumedLots: any[] = [];

    if (pointsNeeded > 0) {
      const consumptionResult = this.consumeSubWalletPoints(
        ticketId,
        wallet.id,
        pointsNeeded,
        user
      );
      totalCostEGP = consumptionResult.totalCostEGP;
      totalCostUSD = consumptionResult.totalCostUSD;
      consumedLots = consumptionResult.consumedLots;
    } else {
      totalCostEGP = product.costPriceEGP || (product.costUSD * 50);
      totalCostUSD = product.costUSD || (totalCostEGP / 50);
    }

    // Product-level Cashback & Referral Eligibility check
    const effectiveCashbackEGP = product.isCashbackEnabled !== false ? (cashbackEGP || 0) : 0;
    const effectiveReferralEGP = product.isReferralEnabled !== false ? (referralEGP || 0) : 0;

    // Rule 31 & Professional Pricing Engine V2.0 Formula:
    // Net Profit = Actual Sale Price - Actual FIFO Cost - Actual Cashback - Actual Referral - Fixed Costs
    const netProfitEGP = Math.round((actualPaidEGP - totalCostEGP - effectiveCashbackEGP - effectiveReferralEGP - fixedCostEGP) * 100) / 100;

    const snapshot: TicketWalletSnapshot = {
      actualWalletId: wallet.id,
      actualWalletName: wallet.name,
      pointsRequiredPerUnit: product.pointsCostPerUnit || 0,
      totalPointsConsumed: pointsNeeded,
      actualCostEGP: totalCostEGP,
      actualCostUSD: totalCostUSD,
      consumedLots,
      salePriceEGP: actualPaidEGP,
      cashbackActualEGP: effectiveCashbackEGP,
      cashbackGrantedEGP: effectiveCashbackEGP,
      referralActualEGP: effectiveReferralEGP,
      referralGrantedEGP: effectiveReferralEGP,
      fixedCostEGP,
      netProfitEGP,
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      snapshot,
      message: `تم خصم ${pointsNeeded} نقطة بنجاح من محفظة [${wallet.name}] بتكلفة فعلية ${totalCostEGP.toFixed(2)} ج`
    };
  }

  // --------------------------------------------------------------------------
  // 33. Reversal / Cancellation (Restores Exact Consumed Lots)
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // 33. Reversal / Cancellation (Restores Exact Consumed Lots)
  // --------------------------------------------------------------------------
  public static reverseTicketWalletConsumption(
    ticketId: string,
    user?: any,
    reason?: string
  ): { success: boolean; message: string; totalPointsRestored?: number; totalCostEGPRestored?: number } {
    const normalizeNum = (val?: string) => (val || '').replace(/^[#\-\s]+/, '').trim().toLowerCase();
    const cleanTicketId = normalizeNum(ticketId);

    // 1. Try finding in STORAGE_KEYS.CONSUMPTIONS
    const allCons = this.getStoredData<JKRWalletConsumption>(STORAGE_KEYS.CONSUMPTIONS, []);
    const matchedCons = allCons.filter(c => {
      if (c.ticketId === ticketId || c.ticketId === `#${ticketId}`) return true;
      if (cleanTicketId && normalizeNum(c.ticketId) === cleanTicketId) return true;
      return false;
    });

    // 2. Fallback: Search in STORAGE_KEYS.TRANSACTIONS for active CONSUMPTION records
    const allTxs = this.getStoredData<JKRWalletTransaction>(STORAGE_KEYS.TRANSACTIONS, []);
    const matchedTxs = allTxs.filter(t => {
      if (t.transactionType !== 'CONSUMPTION' || t.status === 'CANCELLED' || t.status === 'REVERSED') return false;
      if (t.ticketId === ticketId || (cleanTicketId && normalizeNum(t.ticketId) === cleanTicketId)) return true;
      if (t.ticketNumber === ticketId || (cleanTicketId && normalizeNum(t.ticketNumber) === cleanTicketId)) return true;
      if (t.referenceId === ticketId || (cleanTicketId && normalizeNum(t.referenceId) === cleanTicketId)) return true;
      if (t.notes && cleanTicketId && normalizeNum(t.notes).includes(cleanTicketId)) return true;
      return false;
    });

    if (matchedCons.length === 0 && matchedTxs.length === 0) {
      return { success: true, message: 'لا توجد حركات استهلاك مسجلة لهذه التذكرة', totalPointsRestored: 0, totalCostEGPRestored: 0 };
    }

    let grandRestoredPoints = 0;
    let grandRestoredEGP = 0;
    let grandRestoredUSD = 0;

    // Group by wallet
    const byWallet = new Map<string, { points: number; egp: number; usd: number; lotIds: string[] }>();

    if (matchedCons.length > 0) {
      for (const c of matchedCons) {
        if (!byWallet.has(c.walletId)) {
          byWallet.set(c.walletId, { points: 0, egp: 0, usd: 0, lotIds: [] });
        }
        const wGroup = byWallet.get(c.walletId)!;
        wGroup.points += c.pointsConsumed;
        wGroup.egp += c.costEGP;
        wGroup.usd += c.costUSD;
        if (c.lotId) wGroup.lotIds.push(c.lotId);

        // Restore directly to lot if found
        if (c.lotId) {
          const lot = this.getLotById(c.lotId);
          if (lot) {
            lot.remainingQuantity += c.pointsConsumed;
            this.saveLot(lot);
          }
        }
      }
    } else {
      // Synthesize from matched transactions
      for (const t of matchedTxs) {
        if (!byWallet.has(t.walletId)) {
          byWallet.set(t.walletId, { points: 0, egp: 0, usd: 0, lotIds: [] });
        }
        const wGroup = byWallet.get(t.walletId)!;
        const pts = t.quantityOut || 0;
        wGroup.points += pts;
        wGroup.egp += (t.amountEGP || 0);
        wGroup.usd += (t.amountUSD || 0);
        if (t.lotId) {
          wGroup.lotIds.push(t.lotId);
          const lot = this.getLotById(t.lotId);
          if (lot) {
            lot.remainingQuantity += pts;
            this.saveLot(lot);
          }
        }
      }
    }

    // Apply restorations per wallet
    for (const [walletId, data] of byWallet.entries()) {
      const lockAcquired = WalletMutex.tryAcquire(walletId);
      if (!lockAcquired) {
        throw new Error(`المحفظة [${walletId}] قيد الاستخدام في معاملة مالية أخرى حالياً.`);
      }
      try {
        const wallet = this.getWalletById(walletId);
        if (!wallet) continue;

        // If lots weren't restored via exact lotId, restore onto the active/newest lot
        if (data.lotIds.length === 0) {
          const lots = this.getLotsByWallet(walletId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (lots.length > 0) {
            lots[0].remainingQuantity += data.points;
            this.saveLot(lots[0]);
          }
        }

        // Restore wallet points balance
        wallet.pointsBalance = (wallet.pointsBalance || 0) + data.points;
        if (wallet.status === 'SAFETY_LIMIT_REACHED' && wallet.pointsBalance > (wallet.safetyLimit || -500)) {
          wallet.status = 'ACTIVE';
        }
        this.saveWallet(wallet);

        grandRestoredPoints += data.points;
        grandRestoredEGP += data.egp;
        grandRestoredUSD += data.usd;

        // Record Reversal Transaction in Ledger
        const reversalTx: JKRWalletTransaction = {
          id: `tx_rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          walletId: wallet.id,
          walletName: wallet.name,
          walletType: wallet.type,
          gameOrPointType: wallet.pointType,
          transactionType: 'REVERSAL',
          quantityIn: data.points,
          amountEGP: data.egp,
          amountUSD: data.usd,
          balanceAfter: wallet.pointsBalance,
          referenceType: 'TICKET',
          referenceId: ticketId,
          ticketId,
          ticketNumber: ticketId,
          performedBy: {
            id: user?.id || 'sys',
            name: user?.fullName || user?.name || 'المدير العام (Owner)',
            role: user?.role || 'admin'
          },
          notes: `عكس استهلاك تذكرة #${ticketId}: استرداد ${data.points} نقطة إلى رصيد المحفظة ${reason ? `(${reason})` : ''}`,
          createdAt: new Date().toISOString()
        };
        this.saveTransaction(reversalTx);
        this.notifyWalletMutation(wallet.id, 'refund');
      } finally {
        if (lockAcquired) {
          WalletMutex.release(walletId);
        }
      }
    }

    // Clean up consumed records from STORAGE_KEYS.CONSUMPTIONS so they cannot be double-reversed
    if (matchedCons.length > 0) {
      const matchedIds = new Set(matchedCons.map(c => c.id));
      const remainingCons = allCons.filter(c => !matchedIds.has(c.id));
      this.setStoredData(STORAGE_KEYS.CONSUMPTIONS, remainingCons);
    }

    // Mark matched consumption transactions in ledger as cancelled
    if (matchedTxs.length > 0) {
      const updatedTxs = allTxs.map(t => {
        if (matchedTxs.some(m => m.id === t.id)) {
          return {
            ...t,
            status: 'CANCELLED' as any,
            notes: `[ملغاة - تم حذف التذكرة #${ticketId} واسترداد النقاط] ${t.notes || ''}`
          };
        }
        return t;
      });
      this.setStoredData(STORAGE_KEYS.TRANSACTIONS, updatedTxs);
    }

    return {
      success: true,
      message: `تم استرداد ${grandRestoredPoints} نقطة إلى محفظة البضاعة بنجاح`,
      totalPointsRestored: grandRestoredPoints,
      totalCostEGPRestored: grandRestoredEGP
    };
  }

  // --------------------------------------------------------------------------
  // Rollback Orphaned Consumption Transaction (Clean deleted tickets)
  // --------------------------------------------------------------------------
  public static rollbackOrphanedConsumptionTransaction(
    transactionId: string,
    user?: any
  ): { success: boolean; pointsRestored: number; cashReverted: number; message: string } {
    const allTxs = this.getStoredData<JKRWalletTransaction>(STORAGE_KEYS.TRANSACTIONS, []);
    const targetTx = allTxs.find(t => t.id === transactionId);
    if (!targetTx) {
      return { success: false, pointsRestored: 0, cashReverted: 0, message: 'الحركة غير موجودة في سجل المحفظة' };
    }

    const walletId = targetTx.walletId;
    const points = targetTx.quantityOut || 0;
    const amountEGP = targetTx.amountEGP || 0;
    const ticketRef = targetTx.ticketNumber || targetTx.ticketId || targetTx.referenceId || '';

    // 1. Restore points to lot and wallet
    const lockAcquired = WalletMutex.tryAcquire(walletId);
    if (!lockAcquired) {
      throw new Error(`المحفظة [${walletId}] قيد الاستخدام في معاملة مالية أخرى حالياً.`);
    }
    try {
      const wallet = this.getWalletById(walletId);
      if (wallet && points > 0) {
        if (targetTx.lotId) {
          const lot = this.getLotById(targetTx.lotId);
          if (lot) {
            lot.remainingQuantity += points;
            this.saveLot(lot);
          }
        } else {
          const lots = this.getLotsByWallet(walletId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (lots.length > 0) {
            lots[0].remainingQuantity += points;
            this.saveLot(lots[0]);
          }
        }

        wallet.pointsBalance = (wallet.pointsBalance || 0) + points;
        if (wallet.status === 'SAFETY_LIMIT_REACHED' && wallet.pointsBalance > (wallet.safetyLimit || -500)) {
          wallet.status = 'ACTIVE';
        }
        this.saveWallet(wallet);

        // Add reversal ledger entry
        const reversalTx: JKRWalletTransaction = {
          id: `tx_rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          walletId: wallet.id,
          walletName: wallet.name,
          walletType: wallet.type,
          gameOrPointType: wallet.pointType,
          transactionType: 'REVERSAL',
          quantityIn: points,
          amountEGP,
          amountUSD: targetTx.amountUSD || 0,
          balanceAfter: wallet.pointsBalance,
          referenceType: 'TICKET',
          referenceId: ticketRef,
          ticketNumber: ticketRef,
          performedBy: {
            id: user?.id || 'admin',
            name: user?.fullName || user?.name || 'المدير العام (Owner)',
            role: user?.role || 'admin'
          },
          notes: `استرداد استهلاك تذكرة محذوفة #${ticketRef}: استرجاع ${points} نقطة للمحفظة`,
          createdAt: new Date().toISOString()
        };
        this.saveTransaction(reversalTx);
        this.notifyWalletMutation(wallet.id, 'refund');
      }
    } finally {
      if (lockAcquired) {
        WalletMutex.release(walletId);
      }
    }

    // 2. Remove / clean from consumptions
    if (ticketRef) {
      const allCons = this.getStoredData<JKRWalletConsumption>(STORAGE_KEYS.CONSUMPTIONS, []);
      const normalizeNum = (val?: string) => (val || '').replace(/^[#\-\s]+/, '').trim().toLowerCase();
      const normRef = normalizeNum(ticketRef);
      const filteredCons = allCons.filter(c => c.ticketId !== ticketRef && (!normRef || normalizeNum(c.ticketId) !== normRef));
      this.setStoredData(STORAGE_KEYS.CONSUMPTIONS, filteredCons);
    }

    // 3. Remove the orphaned transaction from transactions table
    const remainingTxs = allTxs.filter(t => t.id !== transactionId);
    this.setStoredData(STORAGE_KEYS.TRANSACTIONS, remainingTxs);

    // 4. Reverse Cash from Store Wallets if there was a payment recorded for this ticket
    let cashReverted = 0;
    try {
      const rawStoreWallets = localStorage.getItem('nzm_jkr_store_wallets');
      if (rawStoreWallets && ticketRef) {
        const storeWallets = JSON.parse(rawStoreWallets);
        const rawStoreTxs = localStorage.getItem('nzm_jkr_store_wallet_transactions');
        const storeTxs = rawStoreTxs ? JSON.parse(rawStoreTxs) : [];
        const normalizeNum = (val?: string) => (val || '').replace(/^[#\-\s]+/, '').trim().toLowerCase();
        const normRef = normalizeNum(ticketRef);

        const matchedStoreTx = storeTxs.find((st: any) =>
          st.type === 'deposit' && (
            (st.sourceTicketNumber && normalizeNum(st.sourceTicketNumber) === normRef) ||
            (st.referenceNumber && normalizeNum(st.referenceNumber) === normRef)
          )
        );

        if (matchedStoreTx) {
          const cashAmt = matchedStoreTx.amount || amountEGP;
          const targetW = storeWallets.find((sw: any) => sw.id === matchedStoreTx.walletId || sw.name === matchedStoreTx.walletName);
          if (targetW && cashAmt > 0) {
            const before = targetW.balance;
            targetW.balance = Math.max(0, Math.round((targetW.balance - cashAmt) * 100) / 100);
            targetW.dailyIncome = Math.max(0, Math.round(((targetW.dailyIncome || 0) - cashAmt) * 100) / 100);
            targetW.monthlyIncome = Math.max(0, Math.round(((targetW.monthlyIncome || 0) - cashAmt) * 100) / 100);
            targetW.totalReceived = Math.max(0, Math.round(((targetW.totalReceived || 0) - cashAmt) * 100) / 100);
            localStorage.setItem('nzm_jkr_store_wallets', JSON.stringify(storeWallets));
            cashReverted = cashAmt;

            storeTxs.unshift({
              id: `tx_sw_rev_${Date.now()}`,
              walletId: targetW.id,
              walletName: targetW.name,
              type: 'withdraw',
              amount: cashAmt,
              currency: targetW.currency || 'EGP',
              balanceBefore: before,
              balanceAfter: targetW.balance,
              description: `خصم واسترداد كاش لتذكرة محذوفة #${ticketRef}`,
              referenceNumber: ticketRef,
              sourceType: 'ticket',
              sourceTicketNumber: ticketRef,
              performedBy: user ? { id: user.id, name: user.fullName || user.name } : undefined,
              createdAt: new Date().toISOString()
            });
            localStorage.setItem('nzm_jkr_store_wallet_transactions', JSON.stringify(storeTxs));

            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new CustomEvent('store_wallets_updated', { detail: { walletId: targetW.id } }));
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error rolling back store wallet cash for orphaned tx:', e);
    }

    return {
      success: true,
      pointsRestored: points,
      cashReverted,
      message: `تم استرجاع ${points} نقطة إلى المحفظة${cashReverted > 0 ? ` وخصم ${cashReverted} ج من محفظة الكاش` : ''} وحذف الحركة بنجاح!`
    };
  }

  // --------------------------------------------------------------------------
  // Rollback All Orphaned Consumptions (Bulk Clean)
  // --------------------------------------------------------------------------
  public static rollbackAllOrphanedConsumptions(user?: any): {
    success: boolean;
    totalRestoredPoints: number;
    totalCashReverted: number;
    restoredCount: number;
    message: string;
  } {
    // 1. Get all tickets to check existence
    let existingTicketNumbers = new Set<string>();
    try {
      const rawTickets = localStorage.getItem('nzm_jkr_tickets');
      if (rawTickets) {
        JSON.parse(rawTickets).forEach((t: any) => {
          if (t.id) existingTicketNumbers.add(t.id.toLowerCase());
          if (t.ticketNumber) existingTicketNumbers.add(t.ticketNumber.replace(/^[#\-\s]+/, '').toLowerCase());
        });
      }
      const rawDealers = localStorage.getItem('nzm_jkr_dealer_tickets');
      if (rawDealers) {
        JSON.parse(rawDealers).forEach((t: any) => {
          if (t.id) existingTicketNumbers.add(t.id.toLowerCase());
          if (t.ticketNumber) existingTicketNumbers.add(t.ticketNumber.replace(/^[#\-\s]+/, '').toLowerCase());
        });
      }
    } catch {}

    const normalizeNum = (val?: string) => (val || '').replace(/^[#\-\s]+/, '').trim().toLowerCase();

    // 2. Find all consumption transactions whose ticket does NOT exist
    const allTxs = this.getStoredData<JKRWalletTransaction>(STORAGE_KEYS.TRANSACTIONS, []);
    const orphans = allTxs.filter(t => {
      if (t.transactionType !== 'CONSUMPTION') return false;
      const tNum = normalizeNum(t.ticketNumber || t.ticketId || t.referenceId);
      if (!tNum) return false;
      return !existingTicketNumbers.has(tNum);
    });

    if (orphans.length === 0) {
      return {
        success: true,
        totalRestoredPoints: 0,
        totalCashReverted: 0,
        restoredCount: 0,
        message: 'لا توجد حركات تذاكر محذوفة معلقة، السجل متزامن بالكامل'
      };
    }

    let grandPoints = 0;
    let grandCash = 0;
    let count = 0;

    for (const orphan of orphans) {
      const res = this.rollbackOrphanedConsumptionTransaction(orphan.id, user);
      if (res.success) {
        grandPoints += res.pointsRestored;
        grandCash += res.cashReverted;
        count++;
      }
    }

    return {
      success: true,
      totalRestoredPoints: grandPoints,
      totalCashReverted: grandCash,
      restoredCount: count,
      message: `تمت تسوية ${count} حركة بنجاح واسترداد ${grandPoints.toLocaleString()} نقطة${grandCash > 0 ? ` وخصم ${grandCash.toFixed(2)} ج من الكاش` : ''}!`
    };
  }

  // --------------------------------------------------------------------------
  // 36-39. Freeze, Loss, Recovery, and Manual Adjustment
  // --------------------------------------------------------------------------
  public static freezeWallet(walletId: string, reason: string, user?: any): JKRWallet {
    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Error('المحفظة غير موجودة');

    wallet.status = 'FROZEN';
    // Calculate potential loss from remaining balance
    const potentialEGP = wallet.type === 'MAIN'
      ? wallet.balanceEGP
      : (this.getLotsByWallet(wallet.id).reduce((sum, l) => sum + (l.remainingQuantity * l.unitCostEGP), 0));
    wallet.potentialLossAmount = potentialEGP;
    this.saveWallet(wallet);

    const tx: JKRWalletTransaction = {
      id: `tx_frz_${Date.now()}`,
      walletId: wallet.id,
      walletName: wallet.name,
      walletType: wallet.type,
      gameOrPointType: wallet.type === 'MAIN' ? 'USD' : wallet.pointType,
      transactionType: 'FREEZE',
      amountEGP: potentialEGP,
      balanceAfter: wallet.type === 'MAIN' ? wallet.balanceUSD : wallet.pointsBalance,
      referenceType: 'MANUAL',
      performedBy: {
        id: user?.id || 'admin',
        name: user?.fullName || user?.name || 'المسؤول',
        role: user?.role || 'admin'
      },
      notes: `تجميد المحفظة - خسارة محتملة: ${potentialEGP.toFixed(2)} ج. السبب: ${reason}`,
      createdAt: new Date().toISOString()
    };
    this.saveTransaction(tx);
    this.notifyWalletMutation(wallet.id, 'freeze');

    return wallet;
  }

  public static unfreezeWallet(walletId: string, user?: any): JKRWallet {
    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Error('المحفظة غير موجودة');

    wallet.status = 'ACTIVE';
    wallet.potentialLossAmount = 0;
    this.saveWallet(wallet);

    const tx: JKRWalletTransaction = {
      id: `tx_unfrz_${Date.now()}`,
      walletId: wallet.id,
      walletName: wallet.name,
      walletType: wallet.type,
      gameOrPointType: wallet.type === 'MAIN' ? 'USD' : wallet.pointType,
      transactionType: 'UNFREEZE',
      amountEGP: 0,
      balanceAfter: wallet.type === 'MAIN' ? wallet.balanceUSD : wallet.pointsBalance,
      referenceType: 'MANUAL',
      performedBy: {
        id: user?.id || 'admin',
        name: user?.fullName || user?.name || 'المسؤول',
        role: user?.role || 'admin'
      },
      notes: 'فك تجميد المحفظة وإعادتها للخدمة النشطة',
      createdAt: new Date().toISOString()
    };
    this.saveTransaction(tx);
    this.notifyWalletMutation(wallet.id, 'unfreeze');

    return wallet;
  }

  public static recordConfirmedLoss(
    walletId: string,
    pointsOrUSD: number,
    reason: string,
    user?: any
  ): { wallet: JKRWallet; transaction: JKRWalletTransaction } {
    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Error('المحفظة غير موجودة');

    const adminPerformerName = user?.fullName || user?.name;
    const finalPerformerName = adminPerformerName && adminPerformerName !== 'النظام' ? adminPerformerName : 'المدير العام (Owner)';

    let amountEGP = 0;
    let amountUSD = 0;
    let rateUSD = 50;

    if (wallet.type === 'MAIN') {
      rateUSD = 50;
      amountUSD = pointsOrUSD;
      amountEGP = pointsOrUSD * rateUSD;
      wallet.balanceUSD = Math.max(0, (wallet.balanceUSD || 0) - pointsOrUSD);
      wallet.balanceEGP = Math.max(0, (wallet.balanceEGP || 0) - amountEGP);
      wallet.confirmedLossAmount = (wallet.confirmedLossAmount || 0) + pointsOrUSD;
    } else {
      const costInfo = this.getWalletEffectivePointCost(wallet.id, pointsOrUSD);
      amountEGP = costInfo.totalCostEGP;
      amountUSD = costInfo.totalCostUSD;
      rateUSD = costInfo.effectiveExchangeRate || 50;

      wallet.pointsBalance = Math.max(0, (wallet.pointsBalance || 0) - pointsOrUSD);
      wallet.confirmedLossAmount = (wallet.confirmedLossAmount || 0) + pointsOrUSD;
    }

    // Deduct quantity from active FIFO lots so FIFO audit and valuation match real balance
    const activeLots = this.getLotsByWallet(wallet.id)
      .filter(l => l.remainingQuantity > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let remToDeduct = pointsOrUSD;
    for (const lot of activeLots) {
      if (remToDeduct <= 0) break;
      const take = Math.min(lot.remainingQuantity, remToDeduct);
      lot.remainingQuantity -= take;
      remToDeduct -= take;
      this.saveLot(lot);
    }

    this.saveWallet(wallet);

    const tx: JKRWalletTransaction = {
      id: `tx_loss_${Date.now()}`,
      walletId: wallet.id,
      walletName: wallet.name,
      walletType: wallet.type,
      gameOrPointType: wallet.type === 'MAIN' ? 'USD' : wallet.pointType,
      transactionType: 'LOSS',
      quantityOut: pointsOrUSD,
      amountEGP,
      amountUSD,
      costPerPoint: wallet.type === 'MAIN' ? undefined : (pointsOrUSD > 0 ? amountEGP / pointsOrUSD : 0),
      exchangeRateUsed: rateUSD,
      balanceAfter: wallet.type === 'MAIN' ? wallet.balanceUSD : wallet.pointsBalance,
      referenceType: 'MANUAL',
      performedBy: {
        id: user?.id || 'admin_1',
        name: finalPerformerName,
        role: 'admin'
      },
      notes: `تسجيل خسارة مؤكدة: -${pointsOrUSD.toLocaleString()} ${wallet.type === 'MAIN' ? '$' : 'نقطة'} (قيمة: ${amountEGP.toFixed(2)} ج | $${amountUSD.toFixed(2)}). السبب: ${reason}`,
      createdAt: new Date().toISOString()
    };
    this.saveTransaction(tx);
    this.notifyWalletMutation(wallet.id, 'loss');

    return { wallet, transaction: tx };
  }

  public static recordLossRecovery(
    walletId: string,
    pointsOrAmount: number,
    reason: string,
    user?: any
  ): { wallet: JKRWallet; transaction: JKRWalletTransaction } {
    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Error('المحفظة غير موجودة');

    const adminPerformerName = user?.fullName || user?.name;
    const finalPerformerName = adminPerformerName && adminPerformerName !== 'النظام' ? adminPerformerName : 'المدير العام (Owner)';

    const txId = `tx_rec_${Date.now()}`;
    let qtyAdded = pointsOrAmount;
    let amountEGP = 0;
    let amountUSD = 0;
    let rateUSD = 50;

    if (wallet.type === 'MAIN') {
      rateUSD = 50;
      amountUSD = pointsOrAmount;
      amountEGP = amountUSD * rateUSD;
      wallet.balanceEGP = (wallet.balanceEGP || 0) + amountEGP;
      wallet.balanceUSD = (wallet.balanceUSD || 0) + amountUSD;
      wallet.recoveredLossAmount = (wallet.recoveredLossAmount || 0) + amountUSD;

      // Create a Recovery Lot for USD
      const recLot: JKRWalletLot = {
        id: `lot_rec_${Date.now()}`,
        lotNumber: `LOT-REC-${Date.now().toString().slice(-6)}`,
        walletId: wallet.id,
        sourceTransactionId: txId,
        currencyOrPoints: 'USD',
        initialQuantity: amountUSD,
        remainingQuantity: amountUSD,
        unitCostEGP: rateUSD,
        totalCostEGP: amountEGP,
        totalCostUSD: amountUSD,
        exchangeRateUsed: rateUSD,
        purchaseDate: new Date().toISOString(),
        notes: `تعويض مسترد: ${reason}`,
        createdAt: new Date().toISOString()
      };
      this.saveLot(recLot);
    } else {
      // Sub-wallet with Points: pointsOrAmount is strictly POINTS
      const costInfo = this.getWalletEffectivePointCost(wallet.id, pointsOrAmount);
      amountEGP = costInfo.totalCostEGP;
      amountUSD = costInfo.totalCostUSD;
      rateUSD = costInfo.effectiveExchangeRate || 50;
      qtyAdded = pointsOrAmount;

      // Increase points balance by the exact number of points entered
      wallet.pointsBalance = (wallet.pointsBalance || 0) + pointsOrAmount;
      wallet.recoveredLossAmount = (wallet.recoveredLossAmount || 0) + pointsOrAmount;

      // Create a Recovery Points Lot
      const recLot: JKRWalletLot = {
        id: `lot_rec_${Date.now()}`,
        lotNumber: `LOT-REC-${Date.now().toString().slice(-6)}`,
        walletId: wallet.id,
        sourceTransactionId: txId,
        currencyOrPoints: 'POINTS',
        initialQuantity: pointsOrAmount,
        remainingQuantity: pointsOrAmount,
        unitCostEGP: costInfo.costPerPointEGP || 0.5,
        unitCostUSD: costInfo.costPerPointUSD || 0.01,
        totalCostEGP: amountEGP,
        totalCostUSD: amountUSD,
        exchangeRateUsed: rateUSD,
        purchaseDate: new Date().toISOString(),
        notes: `تعويض مسترد: ${reason}`,
        createdAt: new Date().toISOString()
      };
      this.saveLot(recLot);
    }

    this.saveWallet(wallet);

    const tx: JKRWalletTransaction = {
      id: txId,
      walletId: wallet.id,
      walletName: wallet.name,
      walletType: wallet.type,
      gameOrPointType: wallet.type === 'MAIN' ? 'USD' : wallet.pointType,
      transactionType: 'RECOVERY',
      quantityIn: qtyAdded,
      amountEGP,
      amountUSD,
      costPerPoint: wallet.type === 'MAIN' ? undefined : (qtyAdded > 0 ? amountEGP / qtyAdded : 0),
      exchangeRateUsed: rateUSD,
      balanceAfter: wallet.type === 'MAIN' ? wallet.balanceUSD : wallet.pointsBalance,
      referenceType: 'MANUAL',
      performedBy: {
        id: user?.id || 'admin_1',
        name: finalPerformerName,
        role: 'admin'
      },
      notes: `تعويض جزئي/كلي عن خسارة: +${qtyAdded.toLocaleString()} ${wallet.type === 'MAIN' ? '$' : 'نقطة'} (قيمة: ${amountEGP.toFixed(2)} ج | $${amountUSD.toFixed(2)}). التفاصيل: ${reason}`,
      createdAt: new Date().toISOString()
    };
    this.saveTransaction(tx);
    this.notifyWalletMutation(wallet.id, 'recovery');

    return { wallet, transaction: tx };
  }

  public static recordBalanceAdjustment(
    walletId: string,
    adjustmentQuantity: number,
    reason: string,
    user?: any
  ): { wallet: JKRWallet; transaction: JKRWalletTransaction } {
    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Error('المحفظة غير موجودة');

    const adminPerformerName = user?.fullName || user?.name;
    const finalPerformerName = adminPerformerName && adminPerformerName !== 'النظام' ? adminPerformerName : 'المدير العام (Owner)';

    const previousBalance = wallet.type === 'MAIN' ? (wallet.balanceUSD || 0) : (wallet.pointsBalance || 0);
    const newBalance = previousBalance + adjustmentQuantity;

    if (wallet.type === 'MAIN') {
      wallet.balanceUSD = newBalance;
      wallet.balanceEGP = Math.max(0, (wallet.balanceEGP || 0) + (adjustmentQuantity * 50));
    } else {
      wallet.pointsBalance = newBalance;
    }

    const txId = `tx_adj_${Date.now()}`;

    // If adjustment added balance (+), create an adjustment FIFO lot so FIFO lot tracking stays 100% in sync
    if (adjustmentQuantity > 0) {
      const avgCost = wallet.type === 'MAIN' ? 50 : (this.getLotsByWallet(wallet.id)[0]?.unitCostEGP || 0.5);
      const adjLot: JKRWalletLot = {
        id: `lot_adj_${Date.now()}`,
        lotNumber: `LOT-ADJ-${Date.now().toString().slice(-6)}`,
        walletId: wallet.id,
        sourceTransactionId: txId,
        currencyOrPoints: wallet.type === 'MAIN' ? 'USD' : 'POINTS',
        initialQuantity: adjustmentQuantity,
        remainingQuantity: adjustmentQuantity,
        unitCostEGP: avgCost,
        totalCostEGP: adjustmentQuantity * avgCost,
        totalCostUSD: adjustmentQuantity * (wallet.type === 'MAIN' ? 1 : (avgCost / 50)),
        exchangeRateUsed: 50,
        purchaseDate: new Date().toISOString(),
        notes: `تسوية جرد دفتري: ${reason}`,
        createdAt: new Date().toISOString()
      };
      this.saveLot(adjLot);
    } else if (adjustmentQuantity < 0) {
      // Deduct from remaining lots
      const activeLots = this.getLotsByWallet(wallet.id)
        .filter(l => l.remainingQuantity > 0)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      let remToDeduct = Math.abs(adjustmentQuantity);
      for (const lot of activeLots) {
        if (remToDeduct <= 0) break;
        const take = Math.min(lot.remainingQuantity, remToDeduct);
        lot.remainingQuantity -= take;
        remToDeduct -= take;
        this.saveLot(lot);
      }
    }

    this.saveWallet(wallet);

    const tx: JKRWalletTransaction = {
      id: txId,
      walletId: wallet.id,
      walletName: wallet.name,
      walletType: wallet.type,
      gameOrPointType: wallet.type === 'MAIN' ? 'USD' : wallet.pointType,
      transactionType: 'ADJUSTMENT',
      quantityIn: adjustmentQuantity > 0 ? adjustmentQuantity : undefined,
      quantityOut: adjustmentQuantity < 0 ? Math.abs(adjustmentQuantity) : undefined,
      amountEGP: 0,
      balanceAfter: newBalance,
      referenceType: 'MANUAL',
      performedBy: {
        id: user?.id || 'admin_1',
        name: finalPerformerName,
        role: 'admin'
      },
      notes: `تعديل يدوي للرصيد من ${previousBalance} إلى ${newBalance} (${adjustmentQuantity > 0 ? `+${adjustmentQuantity}` : adjustmentQuantity}). السبب: ${reason}`,
      createdAt: new Date().toISOString()
    };
    this.saveTransaction(tx);
    this.notifyWalletMutation(wallet.id, 'adjustment');

    return { wallet, transaction: tx };
  }

  /**
   * 🔗 Retrieves all products across regular and first-shipping catalogs linked to this wallet.
   */
  public static getLinkedProducts(walletId: string): Array<{
    id: string;
    name: string;
    sku: string;
    gameId: string;
    gameTitle: string;
    gameIcon?: string;
    gameImage?: string;
    sectionName?: string;
    groupName?: string;
    isPrimary: boolean;
    priority: number;
    pointsCostPerUnit: number;
    calculatedPriceEGP: number;
    dealerPriceEGP?: number;
    isActive: boolean;
    catalogType: 'regular' | 'first_shipping';
  }> {
    if (!walletId) return [];
    const results: any[] = [];
    const seen = new Set<string>();

    const inspectCatalog = (storageKey: string, catalogType: 'regular' | 'first_shipping') => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const games = JSON.parse(raw);
        if (!Array.isArray(games)) return;

        for (const g of games) {
          const gameTitle = g.title || g.name || 'لعبة';
          const gameIcon = g.icon;
          const gameImage = g.image;

          const productsList: any[] = Array.isArray(g.products) ? [...g.products] : [];
          if (Array.isArray(g.sections)) {
            for (const sec of g.sections) {
              if (Array.isArray(sec.groups)) {
                for (const grp of sec.groups) {
                  if (Array.isArray(grp.products)) {
                    for (const p of grp.products) {
                      if (!productsList.some(item => item.id === p.id)) {
                        productsList.push({ ...p, sectionName: sec.name, groupName: grp.name });
                      }
                    }
                  }
                }
              }
            }
          }

          for (const prod of productsList) {
            const uniqueKey = `${catalogType}_${prod.id}`;
            if (seen.has(uniqueKey)) continue;

            const isPrimary =
              prod.primaryWalletId === walletId ||
              prod.walletTypeId === walletId ||
              prod.walletConfig?.primaryWalletId === walletId;

            let isAlternative = false;
            let altPriority = 2;

            if (Array.isArray(prod.alternativeWalletIds)) {
              const idx = prod.alternativeWalletIds.indexOf(walletId);
              if (idx >= 0) {
                isAlternative = true;
                altPriority = idx + 2;
              }
            } else if (Array.isArray(prod.walletConfig?.alternativeWalletIds)) {
              const idx = prod.walletConfig.alternativeWalletIds.indexOf(walletId);
              if (idx >= 0) {
                isAlternative = true;
                altPriority = idx + 2;
              }
            }

            if (Array.isArray(prod.walletSources)) {
              const src = prod.walletSources.find((s: any) => s.walletId === walletId);
              if (src) {
                if (src.priority === 1) {
                  isAlternative = false;
                } else {
                  isAlternative = true;
                  altPriority = src.priority;
                }
              }
            }

            if (isPrimary || isAlternative) {
              seen.add(uniqueKey);
              results.push({
                id: prod.id,
                name: prod.name,
                sku: prod.sku || prod.id,
                gameId: g.id,
                gameTitle,
                gameIcon,
                gameImage,
                sectionName: prod.sectionName,
                groupName: prod.groupName,
                isPrimary: isPrimary && !isAlternative,
                priority: isPrimary && !isAlternative ? 1 : altPriority,
                pointsCostPerUnit: prod.pointsCostPerUnit || 0,
                calculatedPriceEGP: prod.calculatedPriceEGP || 0,
                dealerPriceEGP: prod.dealerPriceEGP || prod.calculatedPriceEGP || 0,
                isActive: prod.isActive !== false,
                catalogType
              });
            }
          }
        }
      } catch (err) {
        console.error(`Failed to inspect catalog ${storageKey}`, err);
      }
    };

    inspectCatalog('nzm_jkr_games_tree', 'regular');
    inspectCatalog('nzm_jkr_first_shipping_game_tree', 'first_shipping');

    return results.sort((a, b) => a.priority - b.priority || a.gameTitle.localeCompare(b.gameTitle));
  }

  // --------------------------------------------------------------------------
  // Lots & Transactions Repository
  // --------------------------------------------------------------------------
  public static getLotsByWallet(walletId: string): JKRWalletLot[] {
    const lots = this.getStoredData<JKRWalletLot>(STORAGE_KEYS.LOTS, []);
    return lots.filter(l => l.walletId === walletId);
  }

  public static getLotById(id: string): JKRWalletLot | null {
    const lots = this.getStoredData<JKRWalletLot>(STORAGE_KEYS.LOTS, []);
    return lots.find(l => l.id === id) || null;
  }

  public static saveLot(lot: JKRWalletLot): void {
    const lots = this.getStoredData<JKRWalletLot>(STORAGE_KEYS.LOTS, []);
    const idx = lots.findIndex(l => l.id === lot.id);
    if (idx >= 0) lots[idx] = lot;
    else lots.push(lot);
    this.setStoredData(STORAGE_KEYS.LOTS, lots);
  }

  public static getTransactions(filters?: {
    walletId?: string;
    type?: JKRTransactionType;
    startDate?: string;
    endDate?: string;
  }): JKRWalletTransaction[] {
    let txs = this.getStoredData<JKRWalletTransaction>(STORAGE_KEYS.TRANSACTIONS, []);

    // Ensure performedBy is never 'النظام'
    txs = txs.map(t => {
      if (!t.performedBy?.name || t.performedBy.name === 'النظام' || t.performedBy.name === 'system') {
        return {
          ...t,
          performedBy: {
            id: t.performedBy?.id || 'admin_1',
            name: 'المدير العام (Owner)',
            role: 'admin'
          }
        };
      }
      return t;
    });

    if (filters?.walletId && filters.walletId !== 'all') {
      txs = txs.filter(t => t.walletId === filters.walletId);
    }
    if (filters?.type) {
      txs = txs.filter(t => t.transactionType === filters.type);
    }
    if (filters?.startDate) {
      txs = txs.filter(t => t.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      txs = txs.filter(t => t.createdAt <= filters.endDate!);
    }
    return txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static saveTransaction(tx: Partial<JKRWalletTransaction> & { walletId: string; transactionType: JKRTransactionType; amountEGP: number; balanceAfter: number }): JKRWalletTransaction {
    const wallet = this.getWalletById(tx.walletId);
    const fullTx: JKRWalletTransaction = {
      id: tx.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      transactionNumber: tx.transactionNumber || `TX-${Date.now().toString().slice(-6)}`,
      walletId: tx.walletId,
      walletType: tx.walletType || (wallet?.type || 'SUB'),
      walletName: tx.walletName || (wallet?.name || 'محفظة'),
      gameOrPointType: tx.gameOrPointType || wallet?.pointType,
      transactionType: tx.transactionType,
      quantityIn: tx.quantityIn,
      quantityOut: tx.quantityOut,
      amountEGP: tx.amountEGP,
      amountUSD: tx.amountUSD,
      balanceAfter: tx.balanceAfter,
      exchangeRateUsed: tx.exchangeRateUsed,
      costPerPoint: tx.costPerPoint,
      ticketId: tx.ticketId,
      ticketNumber: tx.ticketNumber,
      productName: tx.productName,
      lotId: tx.lotId,
      lotNumber: tx.lotNumber,
      customerId: tx.customerId,
      customerName: tx.customerName,
      status: tx.status || (tx.transactionType === 'REVERSAL' ? 'REVERSED' : tx.transactionType === 'ADJUSTMENT' ? 'ADJUSTED' : 'COMPLETED'),
      relatedTransactionId: tx.relatedTransactionId,
      referenceType: tx.referenceType,
      referenceId: tx.referenceId,
      performedBy: tx.performedBy || { id: 'admin', name: 'المسؤول', role: 'admin' },
      notes: tx.notes,
      snapshot: tx.snapshot,
      createdAt: tx.createdAt || new Date().toISOString()
    };

    const txs = this.getStoredData<JKRWalletTransaction>(STORAGE_KEYS.TRANSACTIONS, []);
    txs.unshift(fullTx);
    this.setStoredData(STORAGE_KEYS.TRANSACTIONS, txs);
    return fullTx;
  }

  public static saveConsumption(consumption: JKRWalletConsumption): void {
    const list = this.getStoredData<JKRWalletConsumption>(STORAGE_KEYS.CONSUMPTIONS, []);
    list.push(consumption);
    this.setStoredData(STORAGE_KEYS.CONSUMPTIONS, list);
  }

  public static getConsumptionsByTicket(ticketId: string): JKRWalletConsumption[] {
    const list = this.getStoredData<JKRWalletConsumption>(STORAGE_KEYS.CONSUMPTIONS, []);
    return list.filter(c => c.ticketId === ticketId);
  }

  public static getAllConsumptions(): JKRWalletConsumption[] {
    return this.getStoredData<JKRWalletConsumption>(STORAGE_KEYS.CONSUMPTIONS, []);
  }

  public static getAllLots(): JKRWalletLot[] {
    return this.getStoredData<JKRWalletLot>(STORAGE_KEYS.LOTS, []);
  }

  public static deleteTransaction(txId: string): boolean {
    const txs = this.getStoredData<JKRWalletTransaction>(STORAGE_KEYS.TRANSACTIONS, []);
    const filtered = txs.filter(t => t.id !== txId);
    if (filtered.length !== txs.length) {
      this.setStoredData(STORAGE_KEYS.TRANSACTIONS, filtered);
      return true;
    }
    return false;
  }
}
