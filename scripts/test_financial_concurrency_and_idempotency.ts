/**
 * ============================================================================
 * 🛡️ SYSTEM ERP - FINANCIAL CONCURRENCY, IDEMPOTENCY & INTEGRITY TEST SUITE
 * ============================================================================
 */

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

// Dynamically import db and jkrWalletEngine after localStorage is mounted
const { db } = await import('../src/database/db');
const { JKRWalletEngine, WalletMutex } = await import('../src/services/financial/jkrWalletEngine');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ PASS: [${testName}]`);
  } else {
    failedTests++;
    console.error(`❌ FAIL: [${testName}] -> ${details || 'Assertion failed'}`);
  }
}

async function runFinancialIntegritySuite() {
  console.log('========================================================================');
  console.log('🚀 SYSTEM ERP - FINANCIAL INTEGRITY & CONCURRENCY TEST SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SUITE 1: WalletMutex Concurrency Locking & Protection
  // --------------------------------------------------------------------------
  console.log('▶ SUITE 1: WalletMutex Concurrency & Lock Ownership');
  const testWalletId = 'w_test_mutex_' + Date.now();
  
  // 1. First acquire succeeds
  const acquiredFirst = WalletMutex.tryAcquire(testWalletId);
  assert(acquiredFirst === true, 'MUTEX-01', 'First tryAcquire on clean wallet must return true');

  // 2. Second concurrent acquire on same wallet returns false
  const acquiredSecond = WalletMutex.tryAcquire(testWalletId);
  assert(acquiredSecond === false, 'MUTEX-02', 'Second concurrent tryAcquire on same wallet must return false');

  // 3. Releasing test wallet unlocks it
  WalletMutex.release(testWalletId);
  const acquiredAfterRelease = WalletMutex.tryAcquire(testWalletId);
  assert(acquiredAfterRelease === true, 'MUTEX-03', 'Wallet can be acquired again after release');
  WalletMutex.release(testWalletId);

  // --------------------------------------------------------------------------
  // SUITE 2: Merchant Invoice Edit & Re-Save Idempotency
  // --------------------------------------------------------------------------
  console.log('\n▶ SUITE 2: Merchant Invoice Idempotency (Prevent Double-Counting)');
  
  // Create a test merchant
  const testMerchantId = 'merch_test_' + Date.now();
  db.saveMerchant({
    id: testMerchantId,
    name: 'تاجر اختبار الذرية',
    phone: '+201099887766',
    balance: 0,
    totalPurchases: 0,
    totalSales: 0,
    totalProfits: 0,
    status: 'active',
    currency: 'EGP',
    rating: 5,
    categories: ['كروت'],
    invoicesCount: 0,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const vaultBeforeInvoice = db.getMainVaultSummary().balanceEGP;

  // Step 1: Create a purchase invoice of 5,000 EGP paid in vault cash
  const invoiceId = 'inv_test_' + Date.now();
  db.saveMerchantInvoice({
    id: invoiceId,
    invoiceNumber: 'INV-TEST-001',
    merchantId: testMerchantId,
    merchantName: 'تاجر اختبار الذرية',
    type: 'purchase',
    totalAmount: 5000,
    paidAmount: 5000,
    remainingAmount: 0,
    paymentMethod: 'vault_cash',
    status: 'paid',
    items: [],
    date: new Date().toISOString().split('T')[0]
  }, 'مدير الاختبار');

  const merchantAfterCreate = db.getMerchantById(testMerchantId)!;
  const vaultAfterCreate = db.getMainVaultSummary().balanceEGP;

  assert(merchantAfterCreate.totalPurchases === 5000, 'INV-01', `Purchases should be 5000, got ${merchantAfterCreate.totalPurchases}`);
  assert(vaultAfterCreate === vaultBeforeInvoice - 5000, 'INV-02', `Vault cash should decrease by 5000, got diff ${vaultBeforeInvoice - vaultAfterCreate}`);

  // Step 2: Re-save the EXACT same invoice (e.g. updating notes or viewing)
  db.saveMerchantInvoice({
    id: invoiceId,
    invoiceNumber: 'INV-TEST-001',
    merchantId: testMerchantId,
    merchantName: 'تاجر اختبار الذرية',
    type: 'purchase',
    totalAmount: 5000,
    paidAmount: 5000,
    remainingAmount: 0,
    paymentMethod: 'vault_cash',
    status: 'paid',
    items: [],
    notes: 'ملاحظة محدثة',
    date: new Date().toISOString().split('T')[0]
  }, 'مدير الاختبار');

  const merchantAfterResave = db.getMerchantById(testMerchantId)!;
  const vaultAfterResave = db.getMainVaultSummary().balanceEGP;

  assert(merchantAfterResave.totalPurchases === 5000, 'INV-03', `Purchases MUST remain 5000 on re-save, got ${merchantAfterResave.totalPurchases}`);
  assert(vaultAfterResave === vaultAfterCreate, 'INV-04', `Vault balance MUST NOT be deducted again on invoice re-save! Expected ${vaultAfterCreate}, got ${vaultAfterResave}`);

  // --------------------------------------------------------------------------
  // SUITE 3: Ticket Refund Concurrency & Double-Refund Protection
  // --------------------------------------------------------------------------
  console.log('\n▶ SUITE 3: Ticket Refund Concurrency & Idempotency');

  // Setup an operating wallet with funds
  const opWallets = db.getStoreWallets();
  let testOpWallet = opWallets.find(w => w.type === 'operating' && !w.isSystemWallet);
  if (!testOpWallet) {
    testOpWallet = {
      id: 'w_op_test_' + Date.now(),
      name: 'محفظة تشغيل اختبار',
      type: 'operating',
      balance: 10000,
      currency: 'EGP',
      status: 'active',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.saveStoreWallet(testOpWallet);
  } else {
    testOpWallet.balance += 10000;
    db.saveStoreWallet(testOpWallet);
  }

  // Create a test customer ticket
  const testTicketId = 'tkt_ref_test_' + Date.now();
  db.saveTicket({
    id: testTicketId,
    ticketNumber: 'TKT-REF-001',
    customerName: 'عميل اختبار الاسترداد',
    customerPhone: '+201111223344',
    ticketType: 'regular',
    requiredAmount: 1200,
    receivedAmount: 1200,
    status: 'completed',
    items: [],
    stockDeducted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const getOpWalletBalance = (wId: string) => db.getStoreWallets().find(w => w.id === wId)!.balance;

  const walletBeforeRefund = getOpWalletBalance(testOpWallet.id);

  // First Refund of 1200 EGP
  const refund1 = db.refundTicket(testTicketId, testOpWallet.id, 'استرداد عادي', { fullName: 'المشرف' }, undefined, 1200);
  assert(refund1.success === true, 'REF-01', 'First full refund must succeed');

  const walletAfterRefund1 = getOpWalletBalance(testOpWallet.id);
  assert(walletAfterRefund1 === walletBeforeRefund - 1200, 'REF-02', 'Wallet deducted exactly 1200');

  // Second immediate attempt on the same ticket (duplicate/replay)
  const refund2 = db.refundTicket(testTicketId, testOpWallet.id, 'استرداد مكرر', { fullName: 'المشرف' }, undefined, 1200);
  assert(refund2.success === false, 'REF-03', 'Second duplicate refund attempt MUST be rejected');

  const walletAfterRefund2 = getOpWalletBalance(testOpWallet.id);
  assert(walletAfterRefund2 === walletAfterRefund1, 'REF-04', 'Wallet balance MUST NOT be deducted twice on duplicate refund');

  // --------------------------------------------------------------------------
  // SUITE 4: Safe / Vault Transaction Deduplication (Idempotency)
  // --------------------------------------------------------------------------
  console.log('\n▶ SUITE 4: Safe / Vault Transaction Deduplication');

  const uniqueOpNum = 'OP_TEST_SAFE_' + Date.now();
  const vaultBeforeSafeTx = db.getMainVaultSummary().balanceEGP;

  // Record initial safe transaction
  const safeTx1 = db.addSafeTransaction('cash_in', 1500, 'other', 'إيداع تجريبي برقم عملية فريد', 'المسؤول', undefined, {
    operationNumber: uniqueOpNum
  });
  assert(safeTx1 !== null && safeTx1.amount === 1500, 'SAFE-01', 'First safe transaction succeeds');

  const vaultAfterSafeTx1 = db.getMainVaultSummary().balanceEGP;
  assert(vaultAfterSafeTx1 === vaultBeforeSafeTx + 1500, 'SAFE-02', 'Vault increased by exactly 1500');

  // Attempt submitting the exact same operationNumber again (Network retry / double click)
  let duplicateThrewOrRejected = false;
  try {
    const safeTx2 = db.addSafeTransaction('cash_in', 1500, 'other', 'إيداع تجريبي برقم عملية مكرر', 'المسؤول', undefined, {
      operationNumber: uniqueOpNum
    });
    const vaultAfterSafeTx2 = db.getMainVaultSummary().balanceEGP;
    if (vaultAfterSafeTx2 === vaultAfterSafeTx1) {
      duplicateThrewOrRejected = true;
    }
  } catch {
    duplicateThrewOrRejected = true;
  }

  assert(duplicateThrewOrRejected, 'SAFE-03', 'Duplicate safe transaction with same operationNumber must be prevented or ignored');
  const vaultFinalSafe = db.getMainVaultSummary().balanceEGP;
  assert(vaultFinalSafe === vaultAfterSafeTx1, 'SAFE-04', 'Vault balance must not double-credit on re-transmitted operationNumber');

  // --------------------------------------------------------------------------
  // SUITE 5: Inter-Wallet Transfer Concurrency & Non-Negative Balance
  // --------------------------------------------------------------------------
  console.log('\n▶ SUITE 5: Inter-Wallet Transfer Concurrency & Protection');

  const wSource = {
    id: 'w_trf_src_' + Date.now(),
    name: 'محفظة تحويل مصدر',
    type: 'operating' as const,
    balance: 500,
    currency: 'EGP' as const,
    status: 'active' as const,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const wDest = {
    id: 'w_trf_dst_' + Date.now(),
    name: 'محفظة تحويل هدف',
    type: 'operating' as const,
    balance: 0,
    currency: 'EGP' as const,
    status: 'active' as const,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.saveStoreWallet(wSource);
  db.saveStoreWallet(wDest);

  // Transfer 500 (full balance)
  const trf1 = db.transferWalletFunds(wSource.id, wDest.id, 500, 0, 'تحويل كامل');
  assert(trf1 === true, 'TRF-01', 'Transfer of available funds succeeds');

  // Immediate second transfer attempt of 500 (source has 0 balance now)
  const trf2 = db.transferWalletFunds(wSource.id, wDest.id, 500, 0, 'تحويل بدون رصيد كافٍ');
  assert(trf2 === false, 'TRF-02', 'Transfer exceeding available balance must be rejected');

  const finalSrcBalance = getOpWalletBalance(wSource.id);
  const finalDstBalance = getOpWalletBalance(wDest.id);
  assert(finalSrcBalance === 0, 'TRF-03', `Source balance must be 0, got ${finalSrcBalance}`);
  assert(finalDstBalance === 500, 'TRF-04', `Destination balance must be 500, got ${finalDstBalance}`);

  // --------------------------------------------------------------------------
  // SUITE 6: Debt Deposit Duplicate Submission Protection
  // --------------------------------------------------------------------------
  console.log('\n▶ SUITE 6: Debt Deposit Duplicate Submission Protection');

  const testDebtId = 'debt_test_' + Date.now();
  db.saveDebt({
    id: testDebtId,
    partyName: 'جهة اختبار الدين',
    partyPhone: '+201234567890',
    debtType: 'receivable',
    totalAmount: 3000,
    paidAmount: 0,
    remainingAmount: 3000,
    currency: 'EGP',
    status: 'pending',
    installments: [],
    dueDate: new Date().toISOString().split('T')[0],
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Deposit 1000
  const dep1 = db.addDebtDeposit(testDebtId, 1000, 'المسؤول', 'REC-001', 'وديعة أولى');
  assert(dep1.success === true, 'DEBT-01', 'First debt deposit succeeds');

  // Immediate second duplicate deposit attempt with same parameters
  const dep2 = db.addDebtDeposit(testDebtId, 1000, 'المسؤول', 'REC-001', 'وديعة ثانية مكررة');
  assert(dep2.success === false, 'DEBT-02', 'Duplicate debt deposit with same receipt must be rejected');

  // Deposit without receipt number twice
  const depNoReceipt1 = db.addDebtDeposit(testDebtId, 500, 'المسؤول', undefined, 'وديعة بدون إيصال 1');
  assert(depNoReceipt1.success === true, 'DEBT-03', 'Deposit without receipt succeeds once');

  const depNoReceipt2 = db.addDebtDeposit(testDebtId, 500, 'المسؤول', undefined, 'وديعة مكررة بدون إيصال 2');
  assert(depNoReceipt2.success === false, 'DEBT-04', 'Duplicate deposit without receipt within same minute must be rejected');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🏁 FINANCIAL INTEGRITY SUITE: ${passedTests}/${totalTests} PASSED (${failedTests} failed)`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runFinancialIntegritySuite().catch(err => {
  console.error('Test suite execution error:', err);
  process.exit(1);
});
