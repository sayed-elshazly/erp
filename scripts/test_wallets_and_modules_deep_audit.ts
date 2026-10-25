/**
 * ============================================================================
 * 🔍 SYSTEM ERP - WALLETS & ALL MODULES COMPREHENSIVE AUDIT TEST SUITE
 * ============================================================================
 * Tests the entire real-world lifecycle of the Wallets System:
 * - Product creation in Catalog with points cost
 * - Funding Sub-Wallets with multiple FIFO Lots
 * - Direct sale tickets consuming FIFO lots
 * - Verification of ledgers, customer balance, cashback, referrals, shortage/overpayment
 * - Cancellation and refund reversal
 * - Cross-module audit across all 19 ERP subsystems
 * 
 * NOTE: Strict read-only audit. Does NOT fix any bugs. Collects all bugs into
 * a technical defect report for user review.
 */

// Mock localStorage for Node environment
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

// Dynamic imports
const { db } = await import('../src/database/db');
const { JKRWalletEngine } = await import('../src/services/financial/jkrWalletEngine');
const { CompetitionService } = await import('../src/services/competitions/competitionService');

export interface AuditDefect {
  id: string;
  category: 'WALLET_ENGINE' | 'FIFO_LOTS' | 'CASHBACK' | 'REFERRAL' | 'DEALERS' | 'MERCHANTS' | 'ESCROW' | 'SUBSCRIPTIONS' | 'TREASURY' | 'COMPETITIONS';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  expected: string;
  actual: string;
  codeLocation?: string;
  evidence?: any;
}

const detectedBugs: AuditDefect[] = [];
let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(
  condition: boolean,
  defect: Omit<AuditDefect, 'id'> & { id: string }
) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ PASS: [${defect.id}] ${defect.title}`);
  } else {
    failedChecks++;
    console.error(`  ❌ BUG DETECTED: [${defect.id}] [${defect.severity}] ${defect.title}`);
    console.error(`     Expected: ${defect.expected}`);
    console.error(`     Actual:   ${defect.actual}`);
    detectedBugs.push(defect);
  }
}

async function runWalletsAndModulesAudit() {
  console.log('========================================================================');
  console.log('🚀 SYSTEM ERP - DEEP WALLET LIFECYCLE & ALL MODULES AUDIT');
  console.log('========================================================================\n');

  // ==========================================================================
  // PHASE 1: WALLET SYSTEM - REAL-WORLD LIFECYCLE AUDIT
  // ==========================================================================
  console.log('------------------------------------------------------------------------');
  console.log('▶ PHASE 1: WALLET SYSTEM - FULL LIFECYCLE (ADD PRODUCT -> FUND -> SELL -> CASHBACK -> REFERRAL -> REFUND)');
  console.log('------------------------------------------------------------------------');

  // 1.1 Create Main Product & Sub-Wallet
  console.log('\n[1.1] Setting up Catalog Product and Linked Sub-Wallet...');
  const testSubWalletId = 'subw_turk_' + Date.now();
  const testWallet = {
    id: testSubWalletId,
    name: 'محفظة ليرات تركية جوجل (اختبار)',
    walletType: 'sub' as const,
    currency: 'TRY',
    balance: 0,
    pointsBalance: 0,
    safetyLimit: -100,
    alertThreshold: 200,
    isActive: true,
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  JKRWalletEngine.saveWallet(testWallet as any);

  const testProduct = {
    id: 'prod_turk_100',
    name: '100 ليرة تركية Google Play',
    productName: '100 ليرة تركية Google Play',
    costPriceEGP: 150,
    sellingPriceEGP: 220,
    price: 220,
    pointsCostPerUnit: 100, // 100 points per unit
    primaryWalletId: testSubWalletId,
    walletTypeId: testSubWalletId,
    isCashbackEnabled: true,
    cashbackPercent: 2.0, // 2%
    isReferralEnabled: true,
    referralPercent: 5.0, // 5%
    availableQuantity: 100,
    isActive: true
  };

  const testGame = {
    id: 'game_google_play',
    name: 'بطاقات جوجل بلاي',
    cashbackEnabled: true,
    referralEnabled: true,
    products: [testProduct]
  };
  db.setGamesTree([testGame as any]);

  // Check product registration
  const savedGame = db.getGameTree().find(g => g.id === testGame.id);
  check(
    savedGame !== undefined && savedGame.products[0]?.pointsCostPerUnit === 100,
    {
      id: 'WAL-01',
      category: 'WALLET_ENGINE',
      severity: 'HIGH',
      title: 'Catalog Product Points Cost Persistence',
      description: 'Product must save and retain pointsCostPerUnit and wallet link',
      expected: 'Product exists with pointsCostPerUnit = 100',
      actual: `Product pointsCostPerUnit = ${savedGame?.products[0]?.pointsCostPerUnit}`
    }
  );

  // 1.2 Fund Sub-Wallet with Two Separate FIFO Lots with Different Costs
  console.log('\n[1.2] Funding Sub-Wallet with Multi-Tier FIFO Lots...');
  // Lot 1: 500 points @ 1.20 EGP/point = 600 EGP
  const lot1 = {
    id: 'lot_001_' + Date.now(),
    walletId: testSubWalletId,
    lotNumber: 'LOT-FIFO-001',
    initialQuantity: 500,
    remainingQuantity: 500,
    unitCostEGP: 1.20,
    unitCostUSD: 0.024,
    exchangeRateUsed: 50,
    sourceTransactionId: 'BOND-001',
    purchaseDate: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString()
  };
  JKRWalletEngine.saveLot(lot1 as any);

  // Lot 2: 500 points @ 1.50 EGP/point = 750 EGP
  const lot2 = {
    id: 'lot_002_' + Date.now(),
    walletId: testSubWalletId,
    lotNumber: 'LOT-FIFO-002',
    initialQuantity: 500,
    remainingQuantity: 500,
    unitCostEGP: 1.50,
    unitCostUSD: 0.030,
    exchangeRateUsed: 50,
    sourceTransactionId: 'BOND-002',
    purchaseDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  JKRWalletEngine.saveLot(lot2 as any);

  // Update wallet balance to 1000 points
  testWallet.pointsBalance = 1000;
  testWallet.balance = 1350; // Total cost: 600 + 750 = 1350 EGP
  JKRWalletEngine.saveWallet(testWallet as any);

  const lotsInWallet = JKRWalletEngine.getLotsByWallet(testSubWalletId);
  check(
    lotsInWallet.length === 2 && lotsInWallet.reduce((s, l) => s + l.remainingQuantity, 0) === 1000,
    {
      id: 'WAL-02',
      category: 'FIFO_LOTS',
      severity: 'HIGH',
      title: 'FIFO Multi-Lot Deposit Queue',
      description: 'Sub-wallet must hold distinct FIFO lots with different purchase costs',
      expected: '2 lots with total 1000 points',
      actual: `${lotsInWallet.length} lots with ${lotsInWallet.reduce((s, l) => s + l.remainingQuantity, 0)} points`
    }
  );

  // 1.3 Create Customers (Referrer & Buyer)
  console.log('\n[1.3] Creating Referrer Customer and Linked Buyer Customer...');
  const referrerId = 'cust_ref_' + Date.now();
  const referrer = {
    id: referrerId,
    name: 'محمد عبد الله (المحيل)',
    phone: '+201011122233',
    code: 'REF-VIP-777',
    referralCode: 'REF-VIP-777',
    accountBalance: 0,
    balance: 0,
    cashbackBalance: 0,
    referralWalletBalance: 0,
    totalCashbackEarned: 0,
    totalReferralCommissionEarned: 0,
    status: 'active' as const,
    cashbackRate: 1.0,
    createdAt: new Date().toISOString()
  };
  db.saveCustomer(referrer as any);

  const buyerId = 'cust_buyer_' + Date.now();
  const buyer = {
    id: buyerId,
    name: 'خالد إبراهيم (المشتري)',
    phone: '+201099988877',
    code: 'CUST-BUYER-01',
    referralCode: 'REF-BUY-01',
    referredByCode: 'REF-VIP-777',
    referredByName: 'محمد عبد الله (المحيل)',
    referralLinkedAt: new Date().toISOString(),
    accountBalance: 500, // Initial credit 500 EGP
    balance: 500,
    cashbackBalance: 0,
    referralWalletBalance: 0,
    totalCashbackEarned: 0,
    status: 'active' as const,
    cashbackRate: 2.0, // 2%
    createdAt: new Date().toISOString()
  };
  db.saveCustomer(buyer as any);

  // 1.4 Test Sale Ticket #1: Consumes 700 points across both lots (FIFO split)
  console.log('\n[1.4] Executing Sale Ticket #1 consuming 700 points (500 from Lot 1 + 200 from Lot 2)...');
  // 7 units of testProduct = 700 points.
  // Selling price = 7 * 220 = 1540 EGP.
  // Expected FIFO Cost = (500 * 1.20) + (200 * 1.50) = 600 + 300 = 900 EGP.
  const tktNumber1 = 'TKT-AUDIT-101';
  const tkt1 = {
    id: 'tkt_id_101',
    ticketNumber: tktNumber1,
    customerId: buyerId,
    customerName: buyer.name,
    customerPhone: buyer.phone,
    department: 'charging' as const,
    gameName: testGame.name,
    productName: testProduct.name,
    items: [{
      productId: testProduct.id,
      productName: testProduct.name,
      gameName: testGame.name,
      quantity: 7,
      unitPrice: 220,
      totalPrice: 1540,
      costPrice: 150,
      pointsCostPerUnit: 100,
      consumedWalletId: testSubWalletId,
      cashbackPercent: 2.0,
      cashbackAmountEGP: 30.80 // 2% of 1540
    }],
    requiredAmount: 1540,
    receivedAmount: 1540,
    totalCostAmount: 0,
    netProfit: 0,
    overpaymentAmount: 0,
    shortageAmount: 0,
    cashbackEarned: 30.80,
    cashbackPercent: 2.0,
    referralCommissionEarned: 77.0, // 5% of 1540
    referralPercent: 5.0,
    paymentWallet: 'فودافون كاش - المحفظة الرئيسية',
    paymentWalletId: 'w_safe_cash',
    status: 'new' as const,
    createdAt: new Date().toISOString()
  };

  // Consume stock via FIFO
  const consumeSuccess = db.consumeTicketProductStock(tkt1 as any, { id: 'admin', fullName: 'المسؤول' });
  
  check(
    consumeSuccess === true,
    {
      id: 'WAL-03',
      category: 'FIFO_LOTS',
      severity: 'CRITICAL',
      title: 'Ticket Stock Consumption Execution',
      description: 'consumeTicketProductStock must execute and return true',
      expected: 'true',
      actual: String(consumeSuccess)
    }
  );

  // Verify FIFO lots depletion:
  // Lot 1 should be completely depleted (remaining = 0)
  // Lot 2 should have 500 - 200 = 300 remaining
  const lot1After = JKRWalletEngine.getLotById(lot1.id);
  const lot2After = JKRWalletEngine.getLotById(lot2.id);
  const subWalletAfter = JKRWalletEngine.getWalletById(testSubWalletId);

  check(
    lot1After?.remainingQuantity === 0 && lot2After?.remainingQuantity === 300,
    {
      id: 'WAL-04',
      category: 'FIFO_LOTS',
      severity: 'CRITICAL',
      title: 'FIFO Tiered Lot Depletion Accuracy',
      description: 'Older lot must be consumed first to 0, remainder from newer lot',
      expected: 'Lot 1 = 0, Lot 2 = 300',
      actual: `Lot 1 = ${lot1After?.remainingQuantity}, Lot 2 = ${lot2After?.remainingQuantity}`
    }
  );

  check(
    subWalletAfter?.pointsBalance === 300,
    {
      id: 'WAL-05',
      category: 'WALLET_ENGINE',
      severity: 'HIGH',
      title: 'Sub-Wallet Points Balance Synchronization',
      description: 'Sub-wallet points balance must match remaining lots',
      expected: '300 points',
      actual: `${subWalletAfter?.pointsBalance} points`
    }
  );

  // Check actual FIFO Cost recorded on ticket
  // Expected: 600 + 300 = 900 EGP
  check(
    tkt1.totalCostAmount === 900,
    {
      id: 'WAL-06',
      category: 'FIFO_LOTS',
      severity: 'CRITICAL',
      title: 'Actual FIFO Cost Calculation (COGS)',
      description: 'Ticket cost must be calculated from FIFO consumed lots (600 + 300 = 900)',
      expected: '900 EGP',
      actual: `${tkt1.totalCostAmount} EGP`
    }
  );

  // Check Net Profit calculation:
  // Revenue (1540) - FIFO Cost (900) - Cashback (30.80) - Referral (77.0) = 532.20 EGP
  const expectedProfit = Math.round((1540 - 900 - 30.80 - 77.0) * 100) / 100;
  check(
    tkt1.netProfit === expectedProfit,
    {
      id: 'WAL-07',
      category: 'WALLET_ENGINE',
      severity: 'HIGH',
      title: 'Ticket Net Profit Golden Rule Formula',
      description: 'Net Profit = Revenue - FIFO Cost - Cashback - Referral',
      expected: `${expectedProfit} EGP`,
      actual: `${tkt1.netProfit} EGP`
    }
  );

  // Now complete the ticket using completeTopUpTicket
  console.log('\n[1.5] Completing Sale Ticket #1 & Verifying Financial Ledgers...');
  const completeRes = db.completeTopUpTicket(tkt1.id, 'مدير المبيعات');
  check(
    completeRes.success === true,
    {
      id: 'WAL-08',
      category: 'WALLET_ENGINE',
      severity: 'CRITICAL',
      title: 'completeTopUpTicket Execution',
      description: 'completeTopUpTicket should complete the ticket and disburse rewards',
      expected: 'success: true',
      actual: `success: ${completeRes.success}, message: ${completeRes.message}`
    }
  );

  // Check Buyer Cashback:
  // Expected: buyer.cashbackBalance === 30.80 EGP
  const buyerAfterTkt1 = db.getCustomerById(buyerId);
  check(
    buyerAfterTkt1?.cashbackBalance === 30.80,
    {
      id: 'WAL-09',
      category: 'CASHBACK',
      severity: 'CRITICAL',
      title: 'Buyer Cashback Accrual on Completion',
      description: 'Buyer customer profile must receive exact cashback',
      expected: '30.80 EGP',
      actual: `${buyerAfterTkt1?.cashbackBalance} EGP`
    }
  );

  // Check Referrer Commission:
  // Expected: referrer.referralWalletBalance === 77.0 EGP
  const referrerAfterTkt1 = db.getCustomerById(referrerId);
  check(
    referrerAfterTkt1?.referralWalletBalance === 77.0,
    {
      id: 'WAL-10',
      category: 'REFERRAL',
      severity: 'CRITICAL',
      title: 'Referrer Commission Accrual on Completion',
      description: 'Referrer profile must receive 5% referral commission (77.0 EGP)',
      expected: '77.0 EGP',
      actual: `${referrerAfterTkt1?.referralWalletBalance} EGP`
    }
  );

  // Check Unified Wallet Transactions Ledger
  const unifiedTxs = db.getUnifiedWalletTransactions();
  const buyerCbTx = unifiedTxs.find(t => t.customerId === buyerId && t.orderNumber === tktNumber1 && t.walletType === 'cashback');
  const refTx = unifiedTxs.find(t => t.customerId === referrerId && t.orderNumber === tktNumber1 && t.walletType === 'referral');

  check(
    buyerCbTx !== undefined && buyerCbTx.amount === 30.80 && buyerCbTx.balanceAfter === 30.80,
    {
      id: 'WAL-11',
      category: 'CASHBACK',
      severity: 'HIGH',
      title: 'Customer Cashback Ledger Entry',
      description: 'UnifiedWalletTransaction must record cashback earned transaction with balanceAfter',
      expected: 'Cashback tx with amount 30.80 and balanceAfter 30.80',
      actual: buyerCbTx ? `amount: ${buyerCbTx.amount}, balanceAfter: ${buyerCbTx.balanceAfter}` : 'NOT_FOUND'
    }
  );

  check(
    refTx !== undefined && refTx.amount === 77.0 && refTx.balanceAfter === 77.0,
    {
      id: 'WAL-12',
      category: 'REFERRAL',
      severity: 'HIGH',
      title: 'Referrer Commission Ledger Entry',
      description: 'UnifiedWalletTransaction must record referral commission with balanceAfter',
      expected: 'Referral tx with amount 77.0 and balanceAfter 77.0',
      actual: refTx ? `amount: ${refTx.amount}, balanceAfter: ${refTx.balanceAfter}` : 'NOT_FOUND'
    }
  );

  // 1.6 Shortage / Debt Ticket Scenario
  console.log('\n[1.6] Testing Shortage & Debt Scenario (Customer pays less than required)...');
  const tktNumber2 = 'TKT-AUDIT-102';
  const tkt2 = {
    id: 'tkt_id_102',
    ticketNumber: tktNumber2,
    customerId: buyerId,
    customerName: buyer.name,
    customerPhone: buyer.phone,
    department: 'charging' as const,
    gameName: testGame.name,
    productName: testProduct.name,
    items: [{
      productId: testProduct.id,
      productName: testProduct.name,
      gameName: testGame.name,
      quantity: 1,
      unitPrice: 220,
      totalPrice: 220,
      costPrice: 150,
      pointsCostPerUnit: 100,
      consumedWalletId: testSubWalletId,
      cashbackPercent: 2.0,
      cashbackAmountEGP: 4.40
    }],
    requiredAmount: 220,
    receivedAmount: 120, // Paid 120, Shortage = 100
    shortageAmount: 100,
    overpaymentAmount: 0,
    cashbackEarned: 4.40,
    paymentWallet: 'كاش يدوي',
    paymentWalletId: 'w_safe_cash',
    status: 'new' as const,
    createdAt: new Date().toISOString()
  };

  db.consumeTicketProductStock(tkt2 as any, { id: 'admin', fullName: 'المسؤول' });
  db.completeTopUpTicket(tkt2.id, 'المسؤول');

  const buyerAfterTkt2 = db.getCustomerById(buyerId);
  // Initial balance was 500, shortage was 100 -> New balance should be 400
  check(
    buyerAfterTkt2?.accountBalance === 400,
    {
      id: 'WAL-13',
      category: 'WALLET_ENGINE',
      severity: 'HIGH',
      title: 'Customer Account Balance Shortage Debit',
      description: 'Shortage of 100 EGP must deduct from customer accountBalance (500 -> 400)',
      expected: '400 EGP',
      actual: `${buyerAfterTkt2?.accountBalance} EGP`
    }
  );

  // 1.7 Overpayment / Credit Scenario
  console.log('\n[1.7] Testing Overpayment Scenario (Customer pays more than required)...');
  const tktNumber3 = 'TKT-AUDIT-103';
  const tkt3 = {
    id: 'tkt_id_103',
    ticketNumber: tktNumber3,
    customerId: buyerId,
    customerName: buyer.name,
    customerPhone: buyer.phone,
    department: 'charging' as const,
    gameName: testGame.name,
    productName: testProduct.name,
    items: [{
      productId: testProduct.id,
      productName: testProduct.name,
      gameName: testGame.name,
      quantity: 1,
      unitPrice: 220,
      totalPrice: 220,
      costPrice: 150,
      pointsCostPerUnit: 100,
      consumedWalletId: testSubWalletId,
      cashbackPercent: 2.0,
      cashbackAmountEGP: 4.40
    }],
    requiredAmount: 220,
    receivedAmount: 320, // Paid 320, Overpayment = 100
    overpaymentAmount: 100,
    shortageAmount: 0,
    cashbackEarned: 4.40,
    paymentWallet: 'كاش يدوي',
    paymentWalletId: 'w_safe_cash',
    status: 'new' as const,
    createdAt: new Date().toISOString()
  };

  db.consumeTicketProductStock(tkt3 as any, { id: 'admin', fullName: 'المسؤول' });
  db.completeTopUpTicket(tkt3.id, 'المسؤول');

  const buyerAfterTkt3 = db.getCustomerById(buyerId);
  // Previous balance was 400, overpayment was 100 -> New balance should be 500
  check(
    buyerAfterTkt3?.accountBalance === 500,
    {
      id: 'WAL-14',
      category: 'WALLET_ENGINE',
      severity: 'HIGH',
      title: 'Customer Account Balance Overpayment Credit',
      description: 'Overpayment of 100 EGP must credit to customer accountBalance (400 -> 500)',
      expected: '500 EGP',
      actual: `${buyerAfterTkt3?.accountBalance} EGP`
    }
  );

  // 1.8 Reversal & Cancellation Audit
  console.log('\n[1.8] Auditing Reversal & Cancellation Logic on Ticket #1...');
  // Check referrer balance before reversal
  const referrerBeforeRev = db.getCustomerById(referrerId);
  const refBalBefore = referrerBeforeRev?.referralWalletBalance || 0;

  // Reverse ticket #1
  db.rollbackTicketFinancials(tkt1 as any, { id: 'admin', fullName: 'المسؤول' }, 'إلغاء لاختبار التدقيق');
  
  // A. Check FIFO points restored to lots
  const lot1AfterRev = JKRWalletEngine.getLotById(lot1.id);
  const lot2AfterRev = JKRWalletEngine.getLotById(lot2.id);

  check(
    lot1AfterRev?.remainingQuantity === 500 && lot2AfterRev?.remainingQuantity === 300,
    {
      id: 'WAL-15',
      category: 'FIFO_LOTS',
      severity: 'CRITICAL',
      title: 'FIFO Lot Quantity Exact Restoration',
      description: 'Lot 1 must be restored to its pre-consumption quantity of 500 points (and Lot 2 has 300)',
      expected: 'Lot 1 = 500, Lot 2 = 300',
      actual: `Lot 1 = ${lot1AfterRev?.remainingQuantity}, Lot 2 = ${lot2AfterRev?.remainingQuantity}`
    }
  );

  // B. Check Buyer Cashback Reversal
  const buyerAfterRev = db.getCustomerById(buyerId);
  check(
    buyerAfterRev?.cashbackBalance === 8.80, // (30.80 + 4.40 + 4.40) - 30.80 = 8.80
    {
      id: 'WAL-16',
      category: 'CASHBACK',
      severity: 'CRITICAL',
      title: 'Cashback Reversal on Ticket Deletion',
      description: 'Cashback earned from ticket #1 (30.80) must be deducted on cancellation',
      expected: '8.80 EGP',
      actual: `${buyerAfterRev?.cashbackBalance} EGP`
    }
  );

  // C. Check Referrer Commission Reversal (Testing Double Deduction Defect)
  const referrerAfterRev = db.getCustomerById(referrerId);
  const refBalAfter = referrerAfterRev?.referralWalletBalance || 0;
  console.log(`     Referrer balance before reversal: ${refBalBefore}, after reversal: ${refBalAfter}`);

  const actualCommissionDeducted = refBalBefore - refBalAfter;
  check(
    actualCommissionDeducted === 77.0,
    {
      id: 'WAL-17',
      category: 'REFERRAL',
      severity: 'CRITICAL',
      title: 'Referrer Commission Reversal Single Deduction',
      description: 'Reversing a ticket should deduct exactly the earned commission once (77.0), NOT twice',
      expected: '77.0 EGP deducted',
      actual: `${actualCommissionDeducted} EGP deducted`,
      codeLocation: 'src/database/db.ts:1589-1660'
    }
  );

  // 1.9 Safety Limit & Overdraft Protection
  console.log('\n[1.9] Testing Sub-Wallet Safety Limit & Overdraft Enforcement...');
  let overdraftBlocked = false;
  try {
    // Current points in sub-wallet: try consuming 5000 points (safety limit is -100)
    JKRWalletEngine.consumeSubWalletPoints('TKT-OVERDRAFT', testSubWalletId, 5000, { id: 'admin' });
  } catch {
    overdraftBlocked = true;
  }
  check(
    overdraftBlocked === true,
    {
      id: 'WAL-18',
      category: 'WALLET_ENGINE',
      severity: 'HIGH',
      title: 'Sub-Wallet Overdraft Safety Limit Block',
      description: 'Attempting to consume beyond safety limit must throw error',
      expected: 'true (blocked)',
      actual: String(overdraftBlocked)
    }
  );

  // ==========================================================================
  // PHASE 2: COMPREHENSIVE TESTS ACROSS ALL ERP MODULES
  // ==========================================================================
  console.log('\n------------------------------------------------------------------------');
  console.log('▶ PHASE 2: COMPREHENSIVE AUDIT ACROSS ALL 19 ERP MODULES');
  console.log('------------------------------------------------------------------------');

  // --- MODULE 1: CUSTOMERS & LEDGERS ---
  console.log('\n[2.1] MODULE: Customers & Ledgers (الزبائن والأرصدة)');
  const custLedgerTestId = 'cust_ledg_' + Date.now();
  db.saveCustomer({
    id: custLedgerTestId,
    name: 'عميل اختبار السجلات',
    phone: '+201144556677',
    accountBalance: -250, // Negative balance (Debt)
    balance: -250,
    cashbackBalance: 50,
    referralWalletBalance: 20,
    status: 'active'
  } as any);

  // Clear primary debt via owner clearance
  const clearRes = db.clearCustomerPrimaryDebt(custLedgerTestId, 'المالك');
  const custAfterClear = db.getCustomerById(custLedgerTestId);
  check(
    clearRes.success === true && custAfterClear?.accountBalance === 0,
    {
      id: 'MOD-CUST-01',
      category: 'WALLET_ENGINE',
      severity: 'HIGH',
      title: 'Customer Primary Debt Clearance (Owner Exclusive)',
      description: 'Owner clearance must reset negative accountBalance to 0 and record transaction',
      expected: 'Balance = 0',
      actual: `Balance = ${custAfterClear?.accountBalance}`
    }
  );

  // --- MODULE 2: DEALERS SUBSYSTEM ---
  console.log('\n[2.2] MODULE: Dealers Subsystem (الوكلاء والتوزيع والخصومات)');
  const testDealerId = 'dlr_test_' + Date.now();
  db.saveDealer({
    id: testDealerId,
    name: 'وكيل اختبار الجملة',
    phone: '+201288776655',
    code: 'DLR-WHOLESALE-01',
    referralCode: 'DLR-REF-99',
    wholesaleDiscountPercent: 10, // 10% wholesale discount
    balance: 0,
    accountBalance: 0,
    cashbackBalance: 0,
    referralWalletBalance: 0,
    status: 'active',
    categories: ['كروت']
  } as any);

  const dealerObj = db.getDealerById(testDealerId);
  check(
    dealerObj !== undefined && dealerObj.wholesaleDiscountPercent === 10,
    {
      id: 'MOD-DLR-01',
      category: 'DEALERS',
      severity: 'HIGH',
      title: 'Dealer Profile & Wholesale Discount Persistence',
      description: 'Dealer profile must save and retrieve wholesale discount percentage',
      expected: '10%',
      actual: `${dealerObj?.wholesaleDiscountPercent}%`
    }
  );

  // Dealer Ticket Creation and Settlement
  const dealerTkt = {
    id: 'dtkt_' + Date.now(),
    ticketNumber: 'DTKT-001',
    customerId: testDealerId,
    customerName: dealerObj!.name,
    customerPhone: dealerObj!.phone,
    department: 'dealers' as const,
    requiredAmount: 900,
    receivedAmount: 700, // Shortage = 200 EGP
    shortageAmount: 200,
    overpaymentAmount: 0,
    paymentWallet: 'كاش يدوي',
    paymentWalletId: 'w_safe_cash',
    status: 'new' as const,
    createdAt: new Date().toISOString()
  };
  db.saveDealerTicket(dealerTkt as any);
  db.completeTopUpTicket(dealerTkt.id, 'المسؤول');
  // Check dealer debt settlement
  const dealerAfterTkt = db.getDealerById(testDealerId);
  check(
    dealerAfterTkt?.accountBalance === -200,
    {
      id: 'MOD-DLR-02',
      category: 'DEALERS',
      severity: 'HIGH',
      title: 'Dealer Ticket Shortage Debt Settlement',
      description: 'Shortage on dealer ticket must record debit on dealer account balance',
      expected: '-200 EGP',
      actual: `${dealerAfterTkt?.accountBalance} EGP`
    }
  );

  // --- MODULE 3: MERCHANTS & PURCHASES SUBSYSTEM ---
  console.log('\n[2.3] MODULE: Merchants & Purchases (التجار والموردين وفواتير الشراء)');
  const testMerchId = 'merch_test_' + Date.now();
  db.saveMerchant({
    id: testMerchId,
    name: 'مورد البطاقات الدولي',
    phone: '+201500112233',
    balance: 0,
    totalPurchases: 0,
    totalSales: 0,
    totalProfits: 0,
    status: 'active',
    categories: ['كروت'],
    invoicesCount: 0,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);

  // Create Merchant Invoice: 5000 EGP, Paid 3000 EGP, Remaining debt = 2000 EGP
  const merchInv = {
    id: 'inv_m_' + Date.now(),
    invoiceNumber: 'INV-M-001',
    merchantId: testMerchId,
    merchantName: 'مورد البطاقات الدولي',
    totalAmount: 5000,
    paidAmount: 3000,
    remainingAmount: 2000,
    paymentStatus: 'partially_paid' as const,
    paymentMethod: 'تحويل بنكي',
    type: 'purchase' as const,
    currency: 'EGP',
    exchangeRate: 1,
    invoiceDate: new Date().toISOString(),
    items: [{
      id: 'item_1',
      productName: 'كروت 100 ليرة',
      quantity: 50,
      unitPrice: 100,
      totalPrice: 5000
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.saveMerchantInvoice(merchInv as any, 'المسؤول');

  const merchantAfterInv = db.getMerchantById(testMerchId);
  check(
    merchantAfterInv?.balance === -2000,
    {
      id: 'MOD-MERCH-01',
      category: 'MERCHANTS',
      severity: 'CRITICAL',
      title: 'Merchant Balance Adjustment from Purchase Invoice',
      description: 'Remaining invoice amount (2000 EGP) must be deducted from merchant balance as payable debt',
      expected: '-2000 EGP',
      actual: `${merchantAfterInv?.balance} EGP`,
      codeLocation: 'src/database/db.ts:7847'
    }
  );

  // --- MODULE 4: ESCROW / MIDDLEMAN SUBSYSTEM ---
  console.log('\n[2.4] MODULE: Escrow / Middleman Subsystem (الوساطة المالية والضمان)');
  const escrowDeal = {
    id: 'deal_' + Date.now(),
    dealNumber: 'ESC-DEAL-001',
    buyerName: 'المشتري كريم',
    buyerPhone: '+201012345678',
    sellerName: 'البائع سامح',
    sellerPhone: '+201087654321',
    dealAmount: 2000,
    commissionAmount: 100, // 5%
    netAmountToSeller: 1900,
    netCompanyProfitEGP: 100,
    commissionPaidBy: 'buyer' as const,
    status: 'in_progress' as const,
    title: 'وساطة بيع حساب ببجي أسطوري',
    currency: 'EGP' as const,
    sellerPayoutAmountEGP: 1900,
    heldInWalletId: 'w_trust',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.saveMiddlemanDeal(escrowDeal as any);

  const savedDeal = db.getMiddlemanDeals(true).find(d => d.id === escrowDeal.id);
  check(
    savedDeal !== undefined && savedDeal.dealAmount === 2000 && (savedDeal.sellerPayoutAmountEGP === 1900 || savedDeal.netAmountToSeller === 1900),
    {
      id: 'MOD-ESC-01',
      category: 'ESCROW',
      severity: 'HIGH',
      title: 'Escrow Deal Creation & Commission Math',
      description: 'Deal amount 2000 with 100 commission must leave 1900 net to seller',
      expected: 'Net = 1900',
      actual: `Net = ${savedDeal?.netAmountToSeller}`
    }
  );

  // --- MODULE 5: SUBSCRIPTIONS SUBSYSTEM ---
  console.log('\n[2.5] MODULE: Subscriptions Subsystem (الاشتراكات وتجديد الخدمات)');
  const subPlan = {
    id: 'sub_test_' + Date.now(),
    customerName: 'طارق عبد العزيز',
    customerPhone: '+201033221100',
    serviceName: 'اشتراك نتفلكس بريميوم 4 شاشات',
    costPrice: 150,
    sellingPrice: 250,
    billingCycle: 'monthly' as const,
    startDate: new Date(Date.now() - 35 * 86400000).toISOString(), // 35 days ago (Expired)
    endDate: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
    status: 'active' as const, // Should be flagged as expired or overdue
    paymentStatus: 'paid' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.saveSubscription(subPlan as any);

  const retrievedSub = db.getSubscriptions().find(s => s.id === subPlan.id);
  const isPastDue = new Date(retrievedSub?.endDate || '').getTime() < Date.now();
  check(
    isPastDue === true,
    {
      id: 'MOD-SUB-01',
      category: 'SUBSCRIPTIONS',
      severity: 'MEDIUM',
      title: 'Subscription Expiry Date Detection',
      description: 'Subscription past endDate must be detected as expired/due',
      expected: 'true',
      actual: String(isPastDue)
    }
  );

  // --- MODULE 6: TREASURY & FINANCE ENGINE ---
  console.log('\n[2.6] MODULE: Treasury & Finance Subsystem (الخزينة والورديات وسندات الصرف)');
  db.initialize();
  const initialVaultBalance = db.getVaultBalance();

  // Record Deposit Voucher (+500 EGP)
  db.addSafeTransaction(
    'cash_in',
    500,
    'sales',
    'تحصيل كاش من مبيعات تجريبية',
    'أحمد أمين الخزينة',
    'REF-DEP-001'
  );

  const vaultAfterDeposit = db.getVaultBalance();
  check(
    vaultAfterDeposit === initialVaultBalance + 500,
    {
      id: 'MOD-TREAS-01',
      category: 'TREASURY',
      severity: 'HIGH',
      title: 'Treasury Safe Transaction Cash-In Deposit',
      description: 'Adding 500 cash_in to safe must increment vault balance by 500',
      expected: `${initialVaultBalance + 500} EGP`,
      actual: `${vaultAfterDeposit} EGP`
    }
  );

  // Record Expense Voucher (-200 EGP)
  db.addSafeTransaction(
    'cash_out',
    200,
    'expense',
    'مصاريف بوفية وضيافة',
    'أحمد أمين الخزينة',
    'REF-EXP-001'
  );

  const vaultAfterExpense = db.getVaultBalance();
  check(
    vaultAfterExpense === initialVaultBalance + 300,
    {
      id: 'MOD-TREAS-02',
      category: 'TREASURY',
      severity: 'CRITICAL',
      title: 'Treasury Safe Transaction Cash-Out Expense',
      description: 'Adding 200 cash_out from safe must decrement vault balance by 200',
      expected: `${initialVaultBalance + 300} EGP`,
      actual: `${vaultAfterExpense} EGP`
    }
  );

  // --- MODULE 7: COMPETITIONS SUBSYSTEM ---
  console.log('\n[2.7] MODULE: Competitions & Incentives (المسابقات والمكافآت)');
  const comp = {
    id: 'comp_test_' + Date.now(),
    title: 'مسابقة أفضل شاحن للأسبوع',
    type: 'ticket_count' as const,
    targetAudience: 'all' as const,
    startDate: new Date(Date.now() - 86400000).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    status: 'ACTIVE' as const,
    rewardType: 'points' as const,
    rewardAmount: 500,
    leaderboard: [],
    rules: { minTickets: 1, pointsPerTicket: 10 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  CompetitionService.saveCompetition(comp as any);

  const activeComps = CompetitionService.getCompetitions();
  const foundActive = activeComps.some(c => c.id === comp.id);
  check(
    foundActive === true,
    {
      id: 'MOD-COMP-01',
      category: 'COMPETITIONS',
      severity: 'HIGH',
      title: 'Active Competition Discovery',
      description: 'Newly created competition must appear in active competitions list',
      expected: 'true',
      actual: String(foundActive)
    }
  );

  // --- MODULE 8: DEEP FINANCIAL & LOGICAL EDGE CASES ---
  console.log('\n[2.8] MODULE: Deep Financial Edge Cases & Silent Failure Detection');

  // Test 8.1: Silent Failure in Wallet Points Consumption
  // When sub-wallet is frozen, consumeSubWalletPoints throws.
  // Does consumeTicketProductStock return false or does it silently mark stockDeducted = true?
  const frozenWalletId = 'w_frozen_' + Date.now();
  JKRWalletEngine.saveWallet({
    id: frozenWalletId,
    name: 'محفظة مجمدة لاختبار الفشل',
    walletType: 'sub',
    currency: 'TRY',
    balance: 0,
    pointsBalance: 500,
    safetyLimit: 0,
    isActive: false, // Inactive/Frozen
    status: 'FROZEN',
    createdAt: new Date().toISOString()
  } as any);

  const failProd = {
    id: 'prod_frozen_test',
    name: 'منتج محفظة مجمدة',
    costPriceEGP: 100,
    sellingPriceEGP: 150,
    pointsCostPerUnit: 50,
    primaryWalletId: frozenWalletId,
    walletTypeId: frozenWalletId,
    isActive: true
  };
  db.setGamesTree([...db.getGameTree(), { id: 'g_frozen', name: 'لعبة مجمدة', products: [failProd] } as any]);

  const failTkt = {
    id: 'tkt_fail_' + Date.now(),
    ticketNumber: 'TKT-FAIL-01',
    customerId: buyerId,
    customerName: buyer.name,
    customerPhone: buyer.phone,
    department: 'charging' as const,
    items: [{
      productId: failProd.id,
      productName: failProd.name,
      quantity: 1,
      unitPrice: 150,
      totalPrice: 150,
      pointsCostPerUnit: 50,
      consumedWalletId: frozenWalletId
    }],
    requiredAmount: 150,
    receivedAmount: 150,
    status: 'new' as const,
    stockDeducted: false,
    createdAt: new Date().toISOString()
  };

  db.consumeTicketProductStock(failTkt as any, { id: 'admin' });

  check(
    failTkt.stockDeducted === false,
    {
      id: 'WAL-19',
      category: 'WALLET_ENGINE',
      severity: 'CRITICAL',
      title: 'Silent Wallet Deduction Failure Masking',
      description: 'When sub-wallet consumption throws an error (e.g. frozen/insufficient), stockDeducted must NOT be set to true',
      expected: 'stockDeducted: false',
      actual: `stockDeducted: ${failTkt.stockDeducted}`,
      codeLocation: 'src/database/db.ts:12403-12497 (Swallows catch block and sets stockDeducted = true)'
    }
  );

  // Test 8.2: Shortage Debt Cancellation Reversal
  // Ticket #2 had a shortage of 100 EGP debited from customer.
  // Now rollback Ticket #2. Does customer accountBalance get restored by +100 EGP?
  const custBalBeforeTkt2Rollback = db.getCustomerById(buyerId)?.accountBalance ?? 0;
  db.rollbackTicketFinancials(tkt2 as any, { id: 'admin' }, 'إلغاء تذكرة العجز');
  const custBalAfterTkt2Rollback = db.getCustomerById(buyerId)?.accountBalance ?? 0;

  check(
    custBalAfterTkt2Rollback === custBalBeforeTkt2Rollback + 100,
    {
      id: 'WAL-20',
      category: 'WALLET_ENGINE',
      severity: 'HIGH',
      title: 'Shortage Debt Reversal on Ticket Cancellation',
      description: 'Cancelling a ticket with unpaid shortage must forgive/restore the debited debt on customer balance',
      expected: `${custBalBeforeTkt2Rollback + 100} EGP`,
      actual: `${custBalAfterTkt2Rollback} EGP`,
      codeLocation: 'src/database/db.ts:1668-1685 (No handling for shortageAmount in rollbackTicketFinancials)'
    }
  );

  // Test 8.3: Wallet Consumption Ledger Missing Ticket Metadata
  // Check the consumption transaction logged in JKRWalletEngine for Ticket #1
  const allWalletTxs = (JKRWalletEngine as any).getStoredData('jkr_wallet_transactions_v2', []) as any[];
  const consTxForTkt1 = allWalletTxs.find((t: any) => t.ticketId === tktNumber1 || t.referenceId === tktNumber1 || t.ticketNumber === tktNumber1);

  check(
    consTxForTkt1 !== undefined && Boolean(consTxForTkt1.customerName) && Boolean(consTxForTkt1.productName),
    {
      id: 'WAL-21',
      category: 'WALLET_ENGINE',
      severity: 'MEDIUM',
      title: 'Sub-Wallet Consumption Ledger Audit Metadata',
      description: 'Consumption transactions in sub-wallet ledger should contain customerName and productName',
      expected: 'customerName and productName populated',
      actual: consTxForTkt1 ? `custName: "${consTxForTkt1.customerName || ''}", prodName: "${consTxForTkt1.productName || ''}"` : 'TX_NOT_FOUND',
      codeLocation: 'src/services/financial/jkrWalletEngine.ts:1675-1686 (Ticket not yet in storage when consume runs)'
    }
  );

  // ==========================================================================
  // FINAL SUMMARY OF RESULTS
  // ==========================================================================
  console.log('\n========================================================================');
  console.log('🏁 AUDIT EXECUTION COMPLETE');
  console.log(`   Total Checks:  ${totalChecks}`);
  console.log(`   Passed:        ${passedChecks}`);
  console.log(`   Bugs Detected: ${failedChecks}`);
  console.log('========================================================================\n');

  if (detectedBugs.length > 0) {
    console.log('🚨 DETECTED BUGS AND ANOMALIES LIST:');
    detectedBugs.forEach((b, idx) => {
      console.log(`  ${idx + 1}. [${b.id}] [${b.severity}] [${b.category}]: ${b.title}`);
      console.log(`     Location: ${b.codeLocation || 'N/A'}`);
      console.log(`     Issue:    ${b.description}`);
      console.log(`     Expected: ${b.expected}`);
      console.log(`     Actual:   ${b.actual}\n`);
    });
  } else {
    console.log('🎉 No critical bugs detected in automated assertion points.');
  }
}

// Run test suite
runWalletsAndModulesAudit().catch(err => {
  console.error('Fatal Audit Runner Error:', err);
});
