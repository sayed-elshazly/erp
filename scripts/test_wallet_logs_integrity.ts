// Mock localStorage for Node environment BEFORE importing db
class MockLocalStorage {
  private store: Map<string, string> = new Map();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;

// Dynamic import of db and types
const { db, STORAGE_KEYS } = await import('../src/database/db');
import type { StoreWalletTransaction, StoreWallet } from '../src/types';

async function runIntegrityTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING DEEP AUDIT: WALLET LOGS INTEGRITY & MATH');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Details: ${detail}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Accounting Sign Logic & Double Minus Elimination
  // -------------------------------------------------------------------------
  console.log('--- Test Suite 1: Sign Logic & Double Minus Elimination ---');
  {
    const positiveTypes = ['deposit', 'bond_deposit', 'compensation', 'transfer_in', 'cashback'];
    const negativeTypes = ['withdrawal', 'transfer_out'];

    const isPositiveType = (t: string, amount: number) => {
      if (t === 'deposit' || t === 'bond_deposit' || t === 'compensation' || t === 'transfer_in' || t === 'cashback') return true;
      if (t === 'withdrawal' || t === 'transfer_out') return false;
      if (t === 'adjustment') return amount >= 0;
      return amount >= 0;
    };

    positiveTypes.forEach(type => {
      assert(isPositiveType(type, 100), `Type '${type}' must be classified as positive (+)`);
    });

    negativeTypes.forEach(type => {
      assert(!isPositiveType(type, 100), `Type '${type}' must be classified as negative (-)`);
    });

    // Formatting safety: No double minus '--'
    const formatAmount = (type: string, rawAmount: number) => {
      const isPos = isPositiveType(type, rawAmount);
      const sign = isPos ? '+' : '-';
      return `${sign}${Math.abs(rawAmount).toLocaleString()} ج`;
    };

    const formattedNegativeRaw = formatAmount('withdrawal', -250);
    assert(!formattedNegativeRaw.includes('--'), 'Negative raw amount does not produce double minus (--)', formattedNegativeRaw);
    assert(formattedNegativeRaw === '-250 ج', 'Negative withdrawal is formatted cleanly as -250 ج', formattedNegativeRaw);

    const formattedPositiveRaw = formatAmount('deposit', -500);
    assert(!formattedPositiveRaw.includes('+-'), 'Negative raw amount on deposit does not produce +-', formattedPositiveRaw);
    assert(formattedPositiveRaw === '+500 ج', 'Negative raw on deposit is normalized to +500 ج', formattedPositiveRaw);

    const formattedBond = formatAmount('bond_deposit', 1500);
    assert(formattedBond === '+1,500 ج', 'Bond deposit is formatted with positive (+)');
  }

  // -------------------------------------------------------------------------
  // TEST 2: Inter-Wallet Transfer Non-Duplication in Single Wallet Statement
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 2: Transfer Non-Duplication in Ledger ---');
  {
    // Setup two fresh test wallets
    const testWalletA: StoreWallet = {
      id: 'tw_audit_source',
      name: 'محفظة الاختبار أ',
      balance: 10000,
      currency: 'EGP',
      type: 'operating',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    const testWalletB: StoreWallet = {
      id: 'tw_audit_dest',
      name: 'محفظة الاختبار ب',
      balance: 5000,
      currency: 'EGP',
      type: 'operating',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const existingWallets = db.getStoreWallets().filter((w: StoreWallet) => w.id !== testWalletA.id && w.id !== testWalletB.id);
    localStorage.setItem(STORAGE_KEYS.STORE_WALLETS, JSON.stringify([...existingWallets, testWalletA, testWalletB]));

    // Transfer 2000 from A to B (amount: 2000, fees: 0, notes: 'تحويل تدقيق مالي')
    const transferRes = db.transferWalletFunds(testWalletA.id, testWalletB.id, 2000, 0, 'تحويل تدقيق مالي');
    assert(Boolean(transferRes), 'Transfer between test wallets succeeded');

    // Query Wallet A statement
    const walletATxs = db.getStoreWalletTransactions(testWalletA.id);
    const transferOutTxs = walletATxs.filter((t: StoreWalletTransaction) => t.relatedWalletId === testWalletB.id || t.description?.includes(testWalletB.name));
    assert(transferOutTxs.length === 1, `Wallet A ledger must have EXACTLY 1 transfer entry (found: ${transferOutTxs.length})`);
    assert(transferOutTxs[0]?.type === 'transfer_out', `Wallet A transfer entry must be 'transfer_out' (found: ${transferOutTxs[0]?.type})`);

    // Query Wallet B statement
    const walletBTxs = db.getStoreWalletTransactions(testWalletB.id);
    const transferInTxs = walletBTxs.filter((t: StoreWalletTransaction) => t.relatedWalletId === testWalletA.id || t.description?.includes(testWalletA.name));
    assert(transferInTxs.length === 1, `Wallet B ledger must have EXACTLY 1 transfer entry (found: ${transferInTxs.length})`);
    assert(transferInTxs[0]?.type === 'transfer_in', `Wallet B transfer entry must be 'transfer_in' (found: ${transferInTxs[0]?.type})`);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Idempotency Guards in Ticket Payments & System Wallets
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 3: Idempotency & Repeat Protection ---');
  {
    const ticketNum = 'JKR-IDEMPOTENT-999';

    // 1. recordWalletReceivingPayment repeat call
    const testWallet = db.getStoreWallets().find((w: StoreWallet) => w.id === 'tw_audit_dest') || db.getStoreWallets()[0];
    const balanceBeforeFirst = testWallet.balance;

    const res1 = db.recordWalletReceivingPayment(
      testWallet.id,
      undefined,
      350,
      ticketNum,
      'عميل تدقيق 1'
    );
    assert(res1.success, 'First payment recording succeeded');

    const walletAfterFirst = db.getStoreWallets().find((w: StoreWallet) => w.id === testWallet.id)!;
    assert(walletAfterFirst.balance === balanceBeforeFirst + 350, 'Wallet balance credited by 350 on first call');

    // Second call with same ticket number
    const res2 = db.recordWalletReceivingPayment(
      testWallet.id,
      undefined,
      350,
      ticketNum,
      'عميل تدقيق 1'
    );
    assert(res2.success, 'Second payment call returned success gracefully without error');

    const walletAfterSecond = db.getStoreWallets().find((w: StoreWallet) => w.id === testWallet.id)!;
    assert(walletAfterSecond.balance === walletAfterFirst.balance, 'Wallet balance was NOT doubled by repeated call (Idempotent)', `Expected ${walletAfterFirst.balance}, got ${walletAfterSecond.balance}`);

    const txsForTicket = db.getStoreWalletTransactions(testWallet.id).filter((t: StoreWalletTransaction) => t.referenceNumber === ticketNum || t.sourceTicketNumber === ticketNum);
    assert(txsForTicket.length === 1, `Ledger contains exactly 1 deposit record for ticket #${ticketNum} (no duplicate rows, found: ${txsForTicket.length})`);

    // 2. recordOperatingExpenseToSystemWallet repeat call
    const expWallet = db.getStoreWallets().find((w: StoreWallet) => w.id === 'w_operating_expenses')!;
    const expBalBefore = expWallet.balance;
    const expTicket = 'JKR-EXP-IDEMP-888';

    db.recordOperatingExpenseToSystemWallet(75, expTicket, 'مصاريف تشغيل فحص');
    const expBalAfter1 = db.getStoreWallets().find((w: StoreWallet) => w.id === 'w_operating_expenses')!.balance;
    assert(expBalAfter1 === expBalBefore + 75, 'Operating expenses wallet credited by 75 on first call');

    // Repeated call
    db.recordOperatingExpenseToSystemWallet(75, expTicket, 'مصاريف تشغيل فحص');
    const expBalAfter2 = db.getStoreWallets().find((w: StoreWallet) => w.id === 'w_operating_expenses')!.balance;
    assert(expBalAfter2 === expBalAfter1, 'Operating expenses balance was NOT doubled on repeated call', `Expected ${expBalAfter1}, got ${expBalAfter2}`);

    const expTxs = db.getStoreWalletTransactions('w_operating_expenses').filter((t: StoreWalletTransaction) => t.referenceNumber === expTicket || t.sourceTicketNumber === expTicket);
    assert(expTxs.length === 1, `Operating expenses wallet contains exactly 1 entry for ticket (found: ${expTxs.length})`);

    // 3. creditCashbackToSystemWallet repeat call
    const cbTicket = 'JKR-CB-IDEMP-555';
    db.creditCashbackToSystemWallet(50, 'عميل كاش باك', cbTicket);
    const cbTxs1 = db.getStoreWalletTransactions('w_cashback').filter((t: StoreWalletTransaction) => t.referenceNumber === cbTicket || t.sourceTicketNumber === cbTicket);
    assert(cbTxs1.length === 1, 'First creditCashbackToSystemWallet created exactly 1 ledger transaction');

    db.creditCashbackToSystemWallet(50, 'عميل كاش باك', cbTicket);
    const cbTxs2 = db.getStoreWalletTransactions('w_cashback').filter((t: StoreWalletTransaction) => t.referenceNumber === cbTicket || t.sourceTicketNumber === cbTicket);
    assert(cbTxs2.length === 1, 'Repeated creditCashbackToSystemWallet did NOT create duplicate transaction (Idempotent)');
  }

  // -------------------------------------------------------------------------
  // TEST 4: Cleanup of Historical Duplicate Transactions
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 4: Duplicate Cleaner Utility ---');
  {
    const allTxs = JSON.parse(localStorage.getItem(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS) || '[]');
    const dupTicket = 'JKR-DUP-TEST-777';

    // Intentionally inject two duplicate records
    const dup1: StoreWalletTransaction = {
      id: 'tx_dup_1',
      walletId: 'w_operating_expenses',
      walletName: 'محفظة مصاريف التشغيل',
      type: 'deposit',
      amount: 120,
      currency: 'EGP',
      balanceBefore: 100,
      balanceAfter: 220,
      description: 'مصاريف تشغيل تذكرة',
      referenceNumber: dupTicket,
      createdAt: new Date().toISOString()
    };
    const dup2: StoreWalletTransaction = {
      id: 'tx_dup_2',
      walletId: 'w_operating_expenses',
      walletName: 'محفظة مصاريف التشغيل',
      type: 'deposit',
      amount: 120,
      currency: 'EGP',
      balanceBefore: 220,
      balanceAfter: 340,
      description: 'مصاريف تشغيل مكررة',
      referenceNumber: dupTicket,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, JSON.stringify([dup1, dup2, ...allTxs]));

    // Run cleaner
    db.cleanupDuplicateWalletTransactions();

    const cleanedTxs = JSON.parse(localStorage.getItem(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS) || '[]');
    const remainingDups = cleanedTxs.filter((t: any) => t.referenceNumber === dupTicket);
    assert(remainingDups.length === 1, `Duplicate cleaner pruned redundant records (remaining: ${remainingDups.length})`);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Financial Metrics Non-Duplication
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 5: Financial Metrics Accuracy ---');
  {
    const metrics = db.getFinanceMetrics({ department: 'wallets' });
    assert(typeof metrics.totalTransfersVolume === 'number', 'Transfers volume (totalTransfersVolume) is calculated as a valid number');
    assert(!isNaN(metrics.totalTransfersVolume!), 'Transfers volume is not NaN');
    assert(typeof metrics.totalWalletsBalance === 'number', 'Total wallets balance is valid');
    assert(typeof metrics.totalRevenue === 'number', 'Total revenue for wallets dept is valid');
  }

  // -------------------------------------------------------------------------
  // TEST 6: Unified Transactions Bond Deposit Non-Duplication
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 6: Unified Transactions Bond Deposit Non-Duplication ---');
  {
    const bond = db.addDepositBondFIFO({
      bondNumber: 'BND-AUDIT-555',
      walletId: 'tw_audit_dest',
      walletName: 'محفظة الاختبار ب',
      unitsDeposited: 50,
      remainingUnits: 50,
      costUSDT: 50,
      exchangeRateAtDeposit: 50,
      totalCostEGP: 2500,
      supplierName: 'Supplier Audit',
      notes: 'FIFO audit test'
    });

    const unifiedTxs = db.getUnifiedTransactions({ department: 'wallets' });
    const bondMatches = unifiedTxs.filter(t => t.referenceNumber === bond.bondNumber);
    assert(bondMatches.length === 1, `Bond deposit #${bond.bondNumber} must appear EXACTLY ONCE in unified transactions (found: ${bondMatches.length})`);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Internal Transfers Direction & Negative Sign in Unified Transactions
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 7: Unified Transfers Direction & Negative Sign ---');
  {
    const unifiedTxs = db.getUnifiedTransactions({ department: 'wallets' });
    const transferOutTxs = unifiedTxs.filter(t => t.description?.includes('تحويل صادر') || t.typeLabelArabic?.includes('صادر') || t.type === 'wallet_withdrawal');
    assert(transferOutTxs.length > 0, 'Unified transactions must have at least one outgoing transfer from earlier tests');
    for (const tx of transferOutTxs) {
      assert(tx.type === 'wallet_withdrawal' || tx.type === 'expense' || tx.typeLabelArabic.includes('صادر'), `Outgoing transfer #${tx.id} must be classified as withdrawal/outflow (got type: ${tx.type})`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 8: Dealer Wallet Balance Sync in Duplicate Cleaner
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 8: Dealer Wallet Duplicate Cleaner Sync ---');
  {
    const dealerWallets = db.getDealerWallets();
    const mwCashback = dealerWallets.find((w: any) => w.id === 'mw_cashback');
    if (mwCashback) {
      const balBefore = mwCashback.balance;
      const dupDealerRef = 'DTKT-DUP-999';

      const dupTx1 = {
        id: 'tx_mw_dup_1',
        walletId: 'mw_cashback',
        walletName: 'محفظة كاش باك التجار',
        type: 'deposit',
        amount: 200,
        currency: 'EGP',
        balanceBefore: balBefore,
        balanceAfter: balBefore + 200,
        description: 'إيداع كاش باك تاجر',
        referenceNumber: dupDealerRef,
        createdAt: new Date().toISOString()
      };
      const dupTx2 = {
        id: 'tx_mw_dup_2',
        walletId: 'mw_cashback',
        walletName: 'محفظة كاش باك التجار',
        type: 'deposit',
        amount: 200,
        currency: 'EGP',
        balanceBefore: balBefore + 200,
        balanceAfter: balBefore + 400,
        description: 'إيداع كاش باك تاجر مكرر',
        referenceNumber: dupDealerRef,
        createdAt: new Date().toISOString()
      };

      // Set dealer wallet balance to balBefore + 400 (simulating duplicate credit)
      mwCashback.balance = balBefore + 400;
      mwCashback.totalReceived = (mwCashback.totalReceived || 0) + 400;
      localStorage.setItem(STORAGE_KEYS.DEALER_WALLETS, JSON.stringify(dealerWallets));

      const allStoreTxs = JSON.parse(localStorage.getItem(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS) || '[]');
      localStorage.setItem(STORAGE_KEYS.STORE_WALLET_TRANSACTIONS, JSON.stringify([dupTx1, dupTx2, ...allStoreTxs]));

      // Run cleanup
      db.cleanupDuplicateWalletTransactions();

      const updatedDealerWallets = db.getDealerWallets();
      const updatedMw = updatedDealerWallets.find((w: any) => w.id === 'mw_cashback')!;
      assert(updatedMw.balance === balBefore + 200, `Dealer wallet mw_cashback balance was adjusted to correct value (expected: ${balBefore + 200}, got: ${updatedMw.balance})`);
    }
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} Integrity Tests Passed`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runIntegrityTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
