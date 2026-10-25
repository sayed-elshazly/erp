// Isolated Treasury & Ledger Reconciliation Test Suite
// Verifies Single Source of Truth, Opening Balance, Multi-Currency, Shift Settlements, and Screen Parity

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
  // Diagnostic clone method for persistence test simulation
  clone(): Map<string, string> {
    return new Map(this.store);
  }
  restore(snapshot: Map<string, string>): void {
    this.store = new Map(snapshot);
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;

// Import db dynamically after localStorage is mounted
const { db } = await import('../src/database/db');

interface TestResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  expected: any;
  actual: any;
  details?: string;
}

const results: TestResult[] = [];

function assertTest(
  id: string,
  name: string,
  description: string,
  condition: boolean,
  expected: any,
  actual: any,
  details?: string
) {
  const passed = Boolean(condition);
  results.push({ id, name, description, passed, expected, actual, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${id}] ${name}`);
  if (!passed) {
    console.error(`   Expected: ${JSON.stringify(expected)}`);
    console.error(`   Actual:   ${JSON.stringify(actual)}`);
    if (details) console.error(`   Details:  ${details}`);
  }
}

async function runTreasurySuite() {
  console.log('========================================================================');
  console.log('🚀 SYSTEM ERP - TREASURY & VAULT BALANCE VERIFICATION SUITE');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Initial Opening Balance & Single Source of Truth
  // -------------------------------------------------------------------------
  console.log('▶ STEP 1: Initial Opening Balance & No Double Counting');
  db.initialize();

  const initialVaultBalance = db.getVaultBalance();
  const initialSummary = db.getMainVaultSummary();
  const initialMetrics = db.getFinanceMetrics();
  const safeTxs = db.getSafeTransactions();

  assertTest(
    'TR-01',
    'Initial Opening Balance is Exactly 25,000 EGP',
    'Vault balance must strictly be 25,000 EGP, eliminating double-counting of opening capital',
    initialVaultBalance === 25000 &&
    initialSummary.balanceEGP === 25000 &&
    initialMetrics.vaultBalance === 25000,
    { vaultBalance: 25000, summaryBalance: 25000, metricsBalance: 25000 },
    { vaultBalance: initialVaultBalance, summaryBalance: initialSummary.balanceEGP, metricsBalance: initialMetrics.vaultBalance }
  );

  assertTest(
    'TR-02',
    'Capital Injection is Not Counted as Operational Revenue',
    'Initial capital (safe_1) must be classified as equity capital, not operating sales revenue',
    initialSummary.totalRevenueEGP === 0,
    0,
    initialSummary.totalRevenueEGP,
    `totalRevenueEGP is ${initialSummary.totalRevenueEGP}`
  );

  assertTest(
    'TR-03',
    'Ledger Movement Matches First Transaction balanceAfter',
    'The initial transaction safe_1 balanceAfter must equal 25000',
    safeTxs.length >= 1 && safeTxs[0].balanceAfter === 25000,
    25000,
    safeTxs[0]?.balanceAfter
  );

  // -------------------------------------------------------------------------
  // TEST 2: Cash Deposit of 5,000 EGP
  // -------------------------------------------------------------------------
  console.log('\n▶ STEP 2: Execute Cash Deposit of 5,000 EGP');
  const depTx = db.addSafeTransaction(
    'cash_in',
    5000,
    'capital',
    'توريد سيولة نقدية إضافية للخزينة',
    'admin'
  );

  const afterDepBalance = db.getVaultBalance();
  const afterDepSummary = db.getMainVaultSummary();
  const afterDepMetrics = db.getFinanceMetrics();

  assertTest(
    'TR-04',
    'Deposit 5,000 EGP Increases Vault to 30,000 EGP',
    'After depositing 5,000 EGP, all balance getters and ledger must equal 30,000 EGP',
    afterDepBalance === 30000 &&
    afterDepSummary.balanceEGP === 30000 &&
    afterDepMetrics.vaultBalance === 30000 &&
    depTx.balanceAfter === 30000,
    30000,
    afterDepBalance,
    `Transaction balanceAfter: ${depTx.balanceAfter}`
  );

  // -------------------------------------------------------------------------
  // TEST 3: Cash Withdrawal of 2,000 EGP
  // -------------------------------------------------------------------------
  console.log('\n▶ STEP 3: Execute Cash Withdrawal of 2,000 EGP');
  const wthTx = db.addSafeTransaction(
    'cash_out',
    2000,
    'expense',
    'سحب نقدي لمصاريف تشغيلية مستعجلة',
    'admin'
  );

  const afterWthBalance = db.getVaultBalance();
  const afterWthSummary = db.getMainVaultSummary();
  const afterWthMetrics = db.getFinanceMetrics();

  assertTest(
    'TR-05',
    'Withdraw 2,000 EGP Decreases Vault to 28,000 EGP',
    'After withdrawing 2,000 EGP, all balance getters must equal 28,000 EGP',
    afterWthBalance === 28000 &&
    afterWthSummary.balanceEGP === 28000 &&
    afterWthMetrics.vaultBalance === 28000 &&
    wthTx.balanceAfter === 28000,
    28000,
    afterWthBalance
  );

  // -------------------------------------------------------------------------
  // TEST 4: Record Paid-From-Vault Expense (450 EGP)
  // -------------------------------------------------------------------------
  console.log('\n▶ STEP 4: Record Expense Paid Directly from Vault (450 EGP)');
  const expPaid = db.addExpense(
    {
      title: 'شراء أدوات نظافة ومستلزمات مكتبية',
      amount: 450,
      category: 'supplies',
      paymentMethod: 'نقدية من الخزنة',
      paidFromVault: true,
      notes: 'صرف فوري من الخزنة الرئيسية'
    } as any,
    'admin'
  );

  const afterExpVault = db.getVaultBalance();
  const afterExpSummary = db.getMainVaultSummary();

  assertTest(
    'TR-06',
    'Expense with paidFromVault: true Deducts 450 EGP from Vault',
    'Vault balance must decrease from 28,000 to 27,550 EGP',
    afterExpVault === 27550 && afterExpSummary.balanceEGP === 27550,
    27550,
    afterExpVault
  );

  // -------------------------------------------------------------------------
  // TEST 5: Record Non-Vault Expense (1,200 EGP)
  // -------------------------------------------------------------------------
  console.log('\n▶ STEP 5: Record Non-Vault Expense (1,200 EGP via Vodafone Cash)');
  db.addExpense(
    {
      title: 'صيانة مكيف الهواء وسيرفرات الشحن',
      amount: 1200,
      category: 'maintenance',
      paymentMethod: 'vodafone_cash',
      paidFromVault: false,
      notes: 'مدفوع من فودافون كاش - لا يمس الخزنة'
    } as any,
    'admin'
  );

  const afterNonVaultExp = db.getVaultBalance();
  assertTest(
    'TR-07',
    'Expense with paidFromVault: false Leaves Vault Unchanged',
    'Vault balance must remain strictly at 27,550 EGP',
    afterNonVaultExp === 27550,
    27550,
    afterNonVaultExp
  );

  // -------------------------------------------------------------------------
  // TEST 6: Consecutive Multi-Currency Operations (USD Cash In & Currency Exchange)
  // -------------------------------------------------------------------------
  console.log('\n▶ STEP 6: Multi-Currency Isolation & Currency Exchange');
  // 6a. Deposit $100 USD into the vault
  db.addSafeTransaction(
    'cash_in',
    5000, // 100 * 50
    'capital',
    'إيداع 100 دولار نقدًا في خزنة الدولار',
    'admin',
    undefined,
    {
      currency: 'USD',
      usdAmount: 100,
      usdExchangeRate: 50
    }
  );

  const summaryAfterUsd = db.getMainVaultSummary();
  const vaultBalanceAfterUsd = db.getVaultBalance();

  assertTest(
    'TR-08',
    'USD Cash-In Does NOT Corrupt EGP Vault Balance',
    'EGP balance must stay 27,550 EGP, while USD balance becomes $100',
    vaultBalanceAfterUsd === 27550 && summaryAfterUsd.balanceUSD === 100,
    { balanceEGP: 27550, balanceUSD: 100 },
    { balanceEGP: vaultBalanceAfterUsd, balanceUSD: summaryAfterUsd.balanceUSD }
  );

  // 6b. Currency Exchange: Buy $50 USD with EGP (Exchange 2,500 EGP for $50 USD at 50 EGP/USD)
  db.exchangeSafeCurrency(
    'buy_usd',
    50,
    50,
    'شراء 50 دولار من السوق للسيولة الدولارية',
    'admin'
  );

  const summaryAfterExchange = db.getMainVaultSummary();
  const egpAfterExchange = db.getVaultBalance();

  assertTest(
    'TR-09',
    'Currency Exchange Correctly Adjusts Both EGP and USD Balances',
    'EGP balance decreases by 2,500 to 25,050 EGP, USD balance increases to $150',
    egpAfterExchange === 25050 && summaryAfterExchange.balanceUSD === 150,
    { balanceEGP: 25050, balanceUSD: 150 },
    { balanceEGP: egpAfterExchange, balanceUSD: summaryAfterExchange.balanceUSD }
  );

  // -------------------------------------------------------------------------
  // TEST 7: Shift Settlement & Daily Closure Reconciliation
  // -------------------------------------------------------------------------
  console.log('\n▶ STEP 7: Shift Settlement & Daily Closure Report');
  const settlementAmount = 4950;
  db.addSafeTransaction(
    'cash_in',
    settlementAmount,
    'shift_settlement',
    'تصفية وردية كاش المساء وتوريد النقدية للخزنة',
    'كاشير الوردية'
  );

  const afterShiftVault = db.getVaultBalance();
  const afterShiftSummary = db.getMainVaultSummary();

  assertTest(
    'TR-10',
    'Shift Settlement Trophies Reflect Accurately in Vault',
    'Vault balance increases from 25,050 to 30,000 EGP',
    afterShiftVault === 30000 && afterShiftSummary.balanceEGP === 30000,
    30000,
    afterShiftVault
  );

  // Save daily closure
  const closureReport = {
    id: `closure_${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    closedAt: new Date().toISOString(),
    closedBy: 'المدير المالي',
    openingBalanceEGP: 25000,
    closingBalanceEGP: afterShiftSummary.balanceEGP,
    totalIncomeEGP: 5000 + settlementAmount,
    totalExpensesEGP: 2000 + 450 + 2500,
    netEGP: (5000 + settlementAmount) - (2000 + 450 + 2500),
    openingBalanceUSD: 0,
    closingBalanceUSD: afterShiftSummary.balanceUSD,
    avgUsdPurchaseRate: afterShiftSummary.avgUsdPurchaseRate,
    totalTransactionsCount: db.getSafeTransactions().length
  };
  db.saveDailyClosure(closureReport as any);

  const savedClosures = db.getDailyClosures();
  assertTest(
    'TR-11',
    'Daily Closure Report Recorded with Matching Balances',
    'Daily closure report closingBalanceEGP must exactly equal vault balance (30,000 EGP)',
    savedClosures.length > 0 && savedClosures[0].closingBalanceEGP === 30000,
    30000,
    savedClosures[0]?.closingBalanceEGP
  );

  // -------------------------------------------------------------------------
  // TEST 8: Data Persistence & App Reload Simulation
  // -------------------------------------------------------------------------
  console.log('\n▶ STEP 8: App Reload & Persistence Verification');
  // Snapshot current state in localStorage
  const savedState = mockStorage.clone();

  // Create a brand new session with the saved localStorage data
  const newMockStorage = new MockLocalStorage();
  newMockStorage.restore(savedState);
  (globalThis as any).localStorage = newMockStorage;

  // Verify that on fresh read, values are completely stable
  const reloadedVault = db.getVaultBalance();
  const reloadedSummary = db.getMainVaultSummary();
  const reloadedMetrics = db.getFinanceMetrics();

  assertTest(
    'TR-12',
    'Data Persists Across Application Reload Without Divergence',
    'After simulated reload, vault balance remains exactly 30,000 EGP across all getters',
    reloadedVault === 30000 &&
    reloadedSummary.balanceEGP === 30000 &&
    reloadedMetrics.vaultBalance === 30000,
    30000,
    reloadedVault
  );

  // -------------------------------------------------------------------------
  // TEST 9: Idempotency & No Ghost Transactions on Query/Render
  // -------------------------------------------------------------------------
  console.log('\n▶ STEP 9: Idempotency & No Side-Effects on Page Navigation');
  const countBefore = db.getSafeTransactions().length;

  // Simulate multiple page opens and reads
  for (let i = 0; i < 10; i++) {
    db.getVaultBalance();
    db.getMainVaultSummary();
    db.getFinanceMetrics();
    db.getSettings();
  }

  const countAfter = db.getSafeTransactions().length;
  const balanceAfterReads = db.getVaultBalance();

  assertTest(
    'TR-13',
    'Repeated Reads and Navigations Cause Zero Mutations or Drifts',
    'Transactions count and vault balance must not mutate on read queries',
    countBefore === countAfter && balanceAfterReads === 30000,
    { count: countBefore, balance: 30000 },
    { count: countAfter, balance: balanceAfterReads }
  );

  // -------------------------------------------------------------------------
  // TEST 10: Automatic Migration for Pre-Existing LocalStorage
  // -------------------------------------------------------------------------
  console.log('\n▶ STEP 10: Automatic Legacy Migration Verification');
  const legacyStorage = new MockLocalStorage();
  // Simulate legacy corrupted storage where settings.vaultInitialBalance = 25000 alongside safe_1
  legacyStorage.setItem('erp_settings', JSON.stringify({ vaultInitialBalance: 25000 }));
  legacyStorage.setItem(
    'erp_safe_transactions',
    JSON.stringify([
      {
        id: 'safe_1',
        type: 'cash_in',
        amount: 25000,
        category: 'capital',
        description: 'رأس مال الخزنة الافتتاحي للتشغيل',
        balanceAfter: 25000,
        performedBy: 'Owner',
        createdAt: '2026-01-01T08:00:00.000Z'
      }
    ])
  );

  (globalThis as any).localStorage = legacyStorage;
  db.initialize();

  const migratedVault = db.getVaultBalance();
  const migratedSummary = db.getMainVaultSummary();
  const migratedSettings = db.getSettings();

  assertTest(
    'TR-14',
    'Legacy Storage with Double Capital is Automatically & Painlessly Healed',
    'Migration sets vaultInitialBalance to 0, producing exact 25,000 EGP balance',
    migratedVault === 25000 &&
    migratedSummary.balanceEGP === 25000 &&
    migratedSettings.vaultInitialBalance === 0,
    { vault: 25000, summary: 25000, initialBalanceSetting: 0 },
    { vault: migratedVault, summary: migratedSummary.balanceEGP, initialBalanceSetting: migratedSettings.vaultInitialBalance }
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = total - passedCount;

  console.log(`🏁 TREASURY RECONCILIATION SUMMARY: ${passedCount}/${total} PASSED (${failedCount} failed)`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

await runTreasurySuite();
