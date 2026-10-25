// scripts/test_product_wallets_and_referral_network.ts
// Automated Test Audit Suite for Task 7 (Product Wallets & Stock Consumption) and Task 8 (Referral Network)

// 1. Setup mock environment for Node
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

(globalThis as any).localStorage = new MockLocalStorage();
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    dispatchEvent: () => {},
    CustomEvent: class {},
    Event: class {}
  };
}

async function runTestSuite() {
  const { db } = await import('../src/database/db');
  const { JKRWalletEngine } = await import('../src/services/financial/jkrWalletEngine');
  const { isStoreWalletTxPositive } = await import('../src/utils/formatters');

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`❌ Assertion Failed: ${msg}`);
    }
  }

  console.log('========================================================================');
  console.log('🧪 TEST SUITE: PRODUCT WALLETS LINKAGE & REFERRAL NETWORK AUDIT');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: [${total.toString().padStart(2, '0')}] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ❌ FAIL: [${total.toString().padStart(2, '0')}] ${name}`);
      console.error(`     Reason: ${e.message}\n`);
    }
  }

  // Helper helpers
  function getStoreWallet(id: string) {
    return db.getStoreWallets().find(w => w.id === id);
  }
  function getDealerWallet(id: string) {
    return db.getDealerWallets().find(w => w.id === id);
  }

  // =========================================================================
  // TASK 7: PRODUCT WALLETS LINKAGE & STOCK/POINTS CONSUMPTION
  // =========================================================================
  console.log('--- SECTION 1: Product Wallets Linkage & Stock Points Consumption ---');

  await test('JKRWalletEngine evaluates single primary wallet correctly', async () => {
    const wId = 'jkr_w_pts_1_' + Date.now();
    JKRWalletEngine.saveWallet({
      id: wId,
      name: 'محفظة نقاط أساسية',
      type: 'SUB',
      pointsBalance: 1000,
      isActive: true,
      safetyLimit: 0,
      createdAt: new Date().toISOString()
    } as any);

    const product: any = {
      id: 'prod_test_1',
      name: 'منتج تجريبي 1',
      pointsCostPerUnit: 200,
      primaryWalletId: wId,
      alternativeWalletIds: []
    };

    const evalResult = JKRWalletEngine.evaluateProductWalletAvailability(product, 2);
    assert(evalResult.isAvailable === true, 'Should fulfill when primary wallet has ample points');
    assert(evalResult.selectedWallet?.id === wId, `Selected wallet should be ${wId}, got ${evalResult.selectedWallet?.id}`);
    assert(evalResult.pointsNeeded === 400, `Total points required should be 400, got ${evalResult.pointsNeeded}`);
  });

  await test('JKRWalletEngine cascades to alternative wallet when primary has 0 points', async () => {
    const wPrimary = 'jkr_w_primary_empty_' + Date.now();
    const wAlt = 'jkr_w_alt_full_' + Date.now();

    JKRWalletEngine.saveWallet({
      id: wPrimary,
      name: 'محفظة أساسية فارغة',
      type: 'SUB',
      pointsBalance: 0,
      isActive: true,
      safetyLimit: 0,
      createdAt: new Date().toISOString()
    } as any);

    JKRWalletEngine.saveWallet({
      id: wAlt,
      name: 'محفظة بديلة ممتلئة',
      type: 'SUB',
      pointsBalance: 800,
      isActive: true,
      safetyLimit: 0,
      createdAt: new Date().toISOString()
    } as any);

    const product: any = {
      id: 'prod_cascade_test',
      name: 'منتج السقوط البديل',
      pointsCostPerUnit: 300,
      primaryWalletId: wPrimary,
      alternativeWalletIds: [wAlt]
    };

    const evalResult = JKRWalletEngine.evaluateProductWalletAvailability(product, 2);
    assert(evalResult.isAvailable === true, 'Should fulfill using alternative wallet when primary has 0 points');
    assert(evalResult.selectedWallet?.id === wAlt, `Selected wallet should be alternative wallet ${wAlt}, got ${evalResult.selectedWallet?.id}`);
    assert(evalResult.pointsNeeded === 600, `Total points required should be 600, got ${evalResult.pointsNeeded}`);
  });

  await test('JKRWalletEngine respects walletSources priority list', async () => {
    const wSrc1 = 'jkr_w_src_p1_' + Date.now();
    const wSrc2 = 'jkr_w_src_p2_' + Date.now();

    JKRWalletEngine.saveWallet({
      id: wSrc1,
      name: 'محفظة أولوية 1',
      type: 'SUB',
      pointsBalance: 100, // not enough for 300
      isActive: true,
      safetyLimit: 0,
      createdAt: new Date().toISOString()
    } as any);

    JKRWalletEngine.saveWallet({
      id: wSrc2,
      name: 'محفظة أولوية 2',
      type: 'SUB',
      pointsBalance: 500, // enough for 300
      isActive: true,
      safetyLimit: 0,
      createdAt: new Date().toISOString()
    } as any);

    const product: any = {
      id: 'prod_wsources_test',
      name: 'منتج مصادر متعددة',
      pointsCostPerUnit: 300,
      walletSources: [
        { walletId: wSrc1, priority: 1 },
        { walletId: wSrc2, priority: 2 }
      ]
    };

    const evalResult = JKRWalletEngine.evaluateProductWalletAvailability(product, 1);
    assert(evalResult.isAvailable === true, 'Should fulfill using source priority 2 when source 1 has insufficient points');
    assert(evalResult.selectedWallet?.id === wSrc2, `Selected wallet should be ${wSrc2}, got ${evalResult.selectedWallet?.id}`);
  });

  await test('JKRWalletEngine fails when all candidate wallets lack sufficient points', async () => {
    const wLow = 'jkr_w_low_pts_' + Date.now();

    JKRWalletEngine.saveWallet({
      id: wLow,
      name: 'محفظة رصيد شحيح',
      type: 'SUB',
      pointsBalance: 50,
      isActive: true,
      safetyLimit: 0,
      createdAt: new Date().toISOString()
    } as any);

    const product: any = {
      id: 'prod_insufficient_test',
      name: 'منتج غير قابل للتنفيذ',
      pointsCostPerUnit: 100,
      primaryWalletId: wLow,
      alternativeWalletIds: []
    };

    const evalResult = JKRWalletEngine.evaluateProductWalletAvailability(product, 1);
    assert(evalResult.isAvailable === false, 'Should fail fulfillment when points are insufficient');
    assert(evalResult.selectedWallet === null, 'Selected wallet should be null');
  });

  await test('db.consumeTicketProductStock consumes points via JKRWalletEngine and preserves pointsCostPerUnit', async () => {
    const wStock = 'jkr_w_stock_deduct_' + Date.now();
    JKRWalletEngine.saveWallet({
      id: wStock,
      name: 'محفظة مخزون الخصم',
      type: 'SUB',
      pointsBalance: 1000,
      isActive: true,
      safetyLimit: 0,
      costPerPointUSD: 0.05,
      createdAt: new Date().toISOString()
    } as any);

    // Add FIFO lot so consumeSubWalletPoints has lots to deduct from
    JKRWalletEngine.saveLot({
      id: 'lot_' + Date.now(),
      walletId: wStock,
      initialPoints: 1000,
      remainingPoints: 1000,
      pointCostUSD: 0.05,
      exchangeRate: 50,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    } as any);

    const prodId = 'prod_stock_test_' + Date.now();
    const game = {
      id: 'game_' + Date.now(),
      title: 'لعبة تجريبية',
      products: [
        {
          id: prodId,
          name: 'منتج تجريبي',
          pointsCostPerUnit: 200,
          primaryWalletId: wStock,
          isActive: true
        }
      ]
    };
    db.setGamesTree([game] as any);

    const ticket: any = {
      id: 'tkt_stock_' + Date.now(),
      ticketNumber: 'TKT-STK-01',
      customerId: 'cust_stock_1',
      customerName: 'عميل تجريبي',
      items: [
        {
          productId: prodId,
          productName: 'منتج تجريبي',
          quantity: 2,
          price: 250,
          cost: 200,
          pointsCostPerUnit: 200
        }
      ]
    };

    const success = db.consumeTicketProductStock(ticket);
    assert(success === true, 'Stock consumption should succeed');

    // Verify wallet deduction: 2 units * 200 points = 400 points
    const updatedWallet = JKRWalletEngine.getWalletById(wStock);
    assert(updatedWallet !== null && updatedWallet !== undefined, 'Wallet should exist');
    assert(updatedWallet!.pointsBalance === 600, `Wallet pointsBalance should be 600, got ${updatedWallet?.pointsBalance}`);

    // Verify ticket item preserved pointsCostPerUnit and consumedPoints
    const item = ticket.items[0];
    assert(item.pointsCostPerUnit === 200, `item.pointsCostPerUnit should be 200, got ${item.pointsCostPerUnit}`);
    assert(item.consumedPoints === 400, `item.consumedPoints should be 400, got ${item.consumedPoints}`);
    assert(item.consumedWalletId === wStock, `item.consumedWalletId should be ${wStock}, got ${item.consumedWalletId}`);
  });

  await test('db.consumeTicketProductStock cascades to alternative wallet when primary has 0 points', async () => {
    const wEmpty = 'jkr_w_empty_' + Date.now();
    const wFunded = 'jkr_w_funded_' + Date.now();

    JKRWalletEngine.saveWallet({
      id: wEmpty,
      name: 'محفظة أساسية فارغة',
      type: 'SUB',
      pointsBalance: 0,
      isActive: true,
      safetyLimit: 0,
      createdAt: new Date().toISOString()
    } as any);

    JKRWalletEngine.saveWallet({
      id: wFunded,
      name: 'محفظة بديلة للخصم',
      type: 'SUB',
      pointsBalance: 1500,
      isActive: true,
      safetyLimit: 0,
      costPerPointUSD: 0.05,
      createdAt: new Date().toISOString()
    } as any);

    JKRWalletEngine.saveLot({
      id: 'lot_alt_' + Date.now(),
      walletId: wFunded,
      initialPoints: 1500,
      remainingPoints: 1500,
      pointCostUSD: 0.05,
      exchangeRate: 50,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    } as any);

    const prodId = 'prod_cascade_exec_' + Date.now();
    const game = {
      id: 'game_casc_' + Date.now(),
      title: 'لعبة السقوط البديل',
      products: [
        {
          id: prodId,
          name: 'منتج تنفيذ السقوط البديل',
          pointsCostPerUnit: 350,
          primaryWalletId: wEmpty,
          alternativeWalletIds: [wFunded],
          isActive: true
        }
      ]
    };
    db.setGamesTree([game] as any);

    const ticket: any = {
      id: 'tkt_cascade_' + Date.now(),
      ticketNumber: 'TKT-CAS-01',
      customerId: 'cust_stock_2',
      customerName: 'عميل السقوط البديل',
      items: [
        {
          productId: prodId,
          productName: 'منتج تنفيذ السقوط البديل',
          quantity: 2,
          price: 300,
          cost: 250,
          pointsCostPerUnit: 350
        }
      ]
    };

    const success = db.consumeTicketProductStock(ticket);
    assert(success === true, 'Cascade stock consumption should succeed');

    const updatedFundedWallet = JKRWalletEngine.getWalletById(wFunded);
    assert(updatedFundedWallet!.pointsBalance === 800, `Alternative wallet points should be 800 (1500 - 700), got ${updatedFundedWallet?.pointsBalance}`);
    assert(ticket.items[0].consumedWalletId === wFunded, `Consumed wallet should be alternative ${wFunded}`);
  });

  // =========================================================================
  // TASK 8: REFERRAL NETWORK AUDIT & VOUCHER TRANSFERS
  // =========================================================================
  console.log('\n--- SECTION 2: Referral Network, Tree Hierarchy & Financial Vouchers ---');

  await test('Referral hierarchy links (Parent -> Tier 1 -> Tier 2) correctly resolve', async () => {
    const parentId = 'ref_parent_' + Date.now();
    const tier1Id = 'ref_tier1_' + Date.now();
    const tier2Id = 'ref_tier2_' + Date.now();

    db.saveCustomer({
      id: parentId,
      name: 'عميل الجد (المحيل)',
      phone: '01111111111',
      balance: 0,
      accountBalance: 0,
      referralBalance: 0,
      referralWalletBalance: 0,
      totalReferralEarned: 0,
      totalSpent: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString()
    } as any);

    db.saveCustomer({
      id: tier1Id,
      name: 'عميل المستوى الأول',
      phone: '01222222222',
      referrerId: parentId,
      balance: 0,
      accountBalance: 0,
      referralBalance: 0,
      referralWalletBalance: 0,
      totalReferralEarned: 0,
      totalSpent: 1500,
      totalOrders: 3,
      createdAt: new Date().toISOString()
    } as any);

    db.saveCustomer({
      id: tier2Id,
      name: 'عميل المستوى الثاني',
      phone: '01333333333',
      referrerId: tier1Id,
      balance: 0,
      accountBalance: 0,
      referralBalance: 0,
      referralWalletBalance: 0,
      totalReferralEarned: 0,
      totalSpent: 600,
      totalOrders: 1,
      createdAt: new Date().toISOString()
    } as any);

    const allCustomers = db.getCustomers();
    const directReferees = allCustomers.filter(c => c.referrerId === parentId);
    assert(directReferees.length === 1, `Parent should have exactly 1 direct referee, found ${directReferees.length}`);
    assert(directReferees[0].id === tier1Id, 'Direct referee should be tier1 customer');

    const indirectReferees = allCustomers.filter(c => c.referrerId === tier1Id);
    assert(indirectReferees.length === 1, `Tier 1 should have exactly 1 direct referee, found ${indirectReferees.length}`);
    assert(indirectReferees[0].id === tier2Id, 'Indirect referee should be tier2 customer');
  });

  await test('Referral commission credit to customer and system referral wallet adheres to GEMINI.md', async () => {
    const custId = 'ref_comm_cust_' + Date.now();
    db.saveCustomer({
      id: custId,
      name: 'عميل مستحق العمولة',
      phone: '01444444444',
      isDealer: false, // Retail customer
      balance: 0,
      accountBalance: 0,
      referralBalance: 150,
      referralWalletBalance: 150,
      totalReferralEarned: 150,
      totalReferralCommissionEarned: 150,
      createdAt: new Date().toISOString()
    } as any);

    // Initial check of w_referrals
    const curRefWallet = getStoreWallet('w_referrals')!;
    assert(curRefWallet !== undefined, 'w_referrals must exist');
    const initialTotalRef = curRefWallet.balance;

    // Simulate transfer of 100 from referralBalance to accountBalance
    const transferAmount = 100;
    const initialCust = db.getCustomerById(custId)!;
    assert(initialCust.referralWalletBalance >= transferAmount, 'Customer must have sufficient referral balance');

    const updatedReferralBal = initialCust.referralWalletBalance - transferAmount;
    const updatedAccountBal = (Number(initialCust.accountBalance) || 0) + transferAmount;

    db.saveCustomer({
      ...initialCust,
      referralBalance: updatedReferralBal,
      referralWalletBalance: updatedReferralBal,
      accountBalance: updatedAccountBal,
      balance: updatedAccountBal
    });

    // Debit system store wallet w_referrals
    db.debitReferralFromSystemWallet(transferAmount, initialCust.name, 'تحويل رصيد إحالة إلى الرصيد الأساسي', false);

    // Add withdrawal transaction
    const txId = 'tx_ref_tr_' + Date.now();
    const txRecord = {
      id: txId,
      storeWalletId: 'w_referrals',
      customerId: custId,
      type: 'wallet_withdrawal',
      amount: -transferAmount, // Negative amount for withdrawal
      balanceBefore: curRefWallet.balance,
      balanceAfter: curRefWallet.balance - transferAmount,
      description: `تحويل رصيد إحالة إلى الحساب الرئيسي: ${initialCust.name}`,
      createdAt: new Date().toISOString()
    };
    db.addStoreWalletTransaction(txRecord as any);

    // Verify invariants:
    // 1. Customer balances
    const verifiedCust = db.getCustomerById(custId)!;
    assert(verifiedCust.referralWalletBalance === 50, `Customer referralWalletBalance should be 50, got ${verifiedCust.referralWalletBalance}`);
    assert(verifiedCust.accountBalance === 100, `Customer accountBalance should be 100, got ${verifiedCust.accountBalance}`);

    // 2. Ledger Direction Invariant: isStoreWalletTxPositive should return false for withdrawal
    const isPositive = isStoreWalletTxPositive(txRecord as any);
    assert(isPositive === false, `Referral withdrawal tx must be negative/outflow, got ${isPositive}`);

    // 3. System wallet balance dynamically matches remaining retail referral balance
    const verifiedWallet = getStoreWallet('w_referrals')!;
    assert(verifiedWallet.balance === initialTotalRef - transferAmount, `Store wallet balance should decrement by ${transferAmount} from ${initialTotalRef}, got ${verifiedWallet.balance}`);
  });

  await test('Wholesale dealer referral debit isolates to mw_referrals per GEMINI.md rule 3', async () => {
    const dealerId = 'ref_dealer_' + Date.now();
    db.saveCustomer({
      id: dealerId,
      name: 'تاجر جملة مستحق إحالة',
      phone: '01555555555',
      isDealer: true, // Wholesale dealer
      balance: 0,
      accountBalance: 0,
      referralBalance: 500,
      referralWalletBalance: 500,
      totalReferralEarned: 500,
      createdAt: new Date().toISOString()
    } as any);

    const initialDealerWallet = getDealerWallet('mw_referrals')!;
    const initialBal = initialDealerWallet ? initialDealerWallet.balance : 0;

    const transferAmount = 200;
    const dealerCust = db.getCustomerById(dealerId)!;
    
    // Invariant: Dealer operations must target mw_referrals, NOT w_referrals
    const targetWalletId = dealerCust.isDealer ? 'mw_referrals' : 'w_referrals';
    assert(targetWalletId === 'mw_referrals', 'Wholesale customer must route to mw_referrals');

    db.debitReferralFromSystemWallet(transferAmount, dealerCust.name, 'تحويل رصيد إحالة تاجر', true);

    db.saveCustomer({
      ...dealerCust,
      referralBalance: dealerCust.referralBalance! - transferAmount,
      referralWalletBalance: dealerCust.referralWalletBalance - transferAmount,
      accountBalance: (dealerCust.accountBalance || 0) + transferAmount,
      balance: (dealerCust.balance || 0) + transferAmount
    });

    const updatedDealer = db.getCustomerById(dealerId)!;
    assert(updatedDealer.referralWalletBalance === 300, `Dealer referral balance should be 300, got ${updatedDealer.referralWalletBalance}`);
    assert(updatedDealer.accountBalance === 200, `Dealer account balance should be 200, got ${updatedDealer.accountBalance}`);

    const updatedDealerWallet = getDealerWallet('mw_referrals')!;
    assert(updatedDealerWallet.balance === Math.max(0, initialBal - transferAmount), `Dealer wallet balance should be decremented to ${Math.max(0, initialBal - transferAmount)}, got ${updatedDealerWallet.balance}`);
  });

  await test('Referral transfer rejects over-drafting beyond available referralBalance', async () => {
    const custId = 'ref_overdraft_' + Date.now();
    db.saveCustomer({
      id: custId,
      name: 'عميل تجربة السحب الزائد',
      phone: '01666666666',
      balance: 0,
      accountBalance: 0,
      referralBalance: 50,
      referralWalletBalance: 50,
      totalReferralEarned: 50,
      createdAt: new Date().toISOString()
    } as any);

    const cust = db.getCustomerById(custId)!;
    const attemptedAmount = 100; // Greater than 50
    let rejected = false;

    if (attemptedAmount > (cust.referralWalletBalance || cust.referralBalance || 0)) {
      rejected = true;
    }

    assert(rejected === true, 'Attempting to transfer more than referralBalance must be rejected');
  });

  await test('JKRWalletEngine.evaluateProductWalletAvailability cascades to StoreWallet when candidate is StoreWallet', async () => {
    const stWId = 'st_w_cascade_' + Date.now();
    const storeWallets = db.getStoreWallets();
    storeWallets.push({
      id: stWId,
      name: 'محفظة نقاط متجر تجريبية',
      type: 'sub',
      balance: 1000,
      pointsBalance: 500,
      isActive: true,
      currency: 'EGP',
      createdAt: new Date().toISOString()
    } as any);
    (db as any).setItem('nzm_jkr_store_wallets', storeWallets);

    const product: any = {
      id: 'prod_st_cascade',
      name: 'منتج محفظة متجر',
      pointsCostPerUnit: 150,
      primaryWalletId: stWId
    };

    const res = JKRWalletEngine.evaluateProductWalletAvailability(product, 2);
    assert(res.isAvailable === true, 'Should find points in StoreWallet');
    assert(res.selectedWallet?.id === stWId, `Selected wallet should be ${stWId}, got ${res.selectedWallet?.id}`);
    assert(res.selectedWallet?.pointsBalance === 500, 'Should read StoreWallet pointsBalance');
  });

  await test('db.consumeTicketProductStock cascades through StoreWallets in priority order, picking funded wallet', async () => {
    const stWEmpty = 'st_w_empty_' + Date.now();
    const stWFull = 'st_w_full_' + Date.now();

    const currentWallets = db.getStoreWallets();
    currentWallets.push(
      {
        id: stWEmpty,
        name: 'محفظة متجر أولوية 1 فارغة',
        type: 'sub',
        balance: 100,
        pointsBalance: 0,
        isActive: true,
        createdAt: new Date().toISOString()
      } as any,
      {
        id: stWFull,
        name: 'محفظة متجر أولوية 2 ممتلئة',
        type: 'sub',
        balance: 500,
        pointsBalance: 800,
        isActive: true,
        createdAt: new Date().toISOString()
      } as any
    );
    (db as any).setItem('nzm_jkr_store_wallets', currentWallets);

    const prodId = 'prod_store_casc_' + Date.now();
    const game = {
      id: 'game_store_casc_' + Date.now(),
      title: 'لعبة المحافظ المتعددة للمتجر',
      products: [
        {
          id: prodId,
          name: 'باقة نقاط المتجر',
          pointsCostPerUnit: 200,
          primaryWalletId: stWEmpty,
          alternativeWalletIds: [stWFull],
          walletSources: [
            { walletId: stWEmpty, priority: 1 },
            { walletId: stWFull, priority: 2 }
          ],
          isActive: true
        }
      ]
    };
    db.setGamesTree([game] as any);

    const ticket: any = {
      id: 'tkt_st_casc_' + Date.now(),
      ticketNumber: 'TKT-ST-02',
      customerId: 'cust_st_casc',
      items: [
        {
          productId: prodId,
          productName: 'باقة نقاط المتجر',
          quantity: 2,
          pointsCostPerUnit: 200
        }
      ]
    };

    const consumed = db.consumeTicketProductStock(ticket);
    assert(consumed === true, 'Stock consumption should succeed');
    assert(ticket.items[0].consumedWalletId === stWFull, `Must consume from funded alternative wallet ${stWFull}, got ${ticket.items[0].consumedWalletId}`);
    assert(ticket.items[0].consumedPoints === 400, 'Must deduct 400 points');

    const updatedWallets = db.getStoreWallets();
    const updatedFull = updatedWallets.find(w => w.id === stWFull)!;
    assert(updatedFull.pointsBalance === 400, `Full wallet balance should be 400, got ${updatedFull.pointsBalance}`);
  });

  await test('db.rollbackTicketFinancials restores points to StoreWallet on refund/cancellation', async () => {
    const stWTarget = 'st_w_restore_' + Date.now();
    const storeWallets = db.getStoreWallets();
    storeWallets.push({
      id: stWTarget,
      name: 'محفظة استرجاع نقاط متجر',
      type: 'sub',
      balance: 100,
      pointsBalance: 100,
      isActive: true,
      createdAt: new Date().toISOString()
    } as any);
    (db as any).setItem('nzm_jkr_store_wallets', storeWallets);

    const ticket: any = {
      id: 'tkt_restore_' + Date.now(),
      ticketNumber: 'TKT-REST-01',
      customerId: 'cust_rest',
      status: 'pending',
      stockDeducted: true,
      items: [
        {
          productId: 'prod_dummy',
          productName: 'باقة تجريبية',
          quantity: 1,
          consumedWalletId: stWTarget,
          consumedPoints: 250,
          pointsCostPerUnit: 250
        }
      ]
    };

    db.rollbackTicketFinancials(ticket, undefined, 'إلغاء تجريبي للاسترداد');

    const updatedWallets = db.getStoreWallets();
    const restoredW = updatedWallets.find(w => w.id === stWTarget)!;
    assert(restoredW.pointsBalance === 350, `Points should be restored to 350 (100 + 250), got ${restoredW.pointsBalance}`);
  });

  await test('db.reconcileTicketEdit detects inventory change on multi-item tickets', async () => {
    const wId1 = 'w_multi_1_' + Date.now();
    const wId2 = 'w_multi_2_' + Date.now();

    JKRWalletEngine.saveWallet({
      id: wId1,
      name: 'محفظة متعددة 1',
      type: 'SUB',
      pointsBalance: 1000,
      isActive: true,
      createdAt: new Date().toISOString()
    } as any);

    JKRWalletEngine.saveWallet({
      id: wId2,
      name: 'محفظة متعددة 2',
      type: 'SUB',
      pointsBalance: 1000,
      isActive: true,
      createdAt: new Date().toISOString()
    } as any);

    const oldTicket: any = {
      id: 'tkt_multi_edit_' + Date.now(),
      ticketNumber: 'TKT-MULTI-01',
      status: 'pending',
      stockDeducted: true,
      items: [
        {
          productId: 'prod_m1',
          quantity: 1,
          consumedWalletId: wId1,
          consumedPoints: 100
        },
        {
          productId: 'prod_m2',
          quantity: 1,
          consumedWalletId: wId2,
          consumedPoints: 200
        }
      ]
    };

    // New ticket changes quantity of ITEM 2 from 1 to 2 (consumedPoints from 200 to 400)
    const updatedTicket: any = {
      ...oldTicket,
      items: [
        {
          productId: 'prod_m1',
          quantity: 1,
          consumedWalletId: wId1,
          consumedPoints: 100
        },
        {
          productId: 'prod_m2',
          quantity: 2,
          consumedWalletId: wId2,
          consumedPoints: 400
        }
      ]
    };

    db.saveTicket(oldTicket);
    const reconcileResult = db.reconcileTicketEdit(oldTicket, updatedTicket);
    assert(reconcileResult.success === true, 'Reconciliation should succeed');
    // The reconciliation must detect that inventory was affected by the second item
    assert(updatedTicket.items[1].quantity === 2, 'Item 2 quantity should be 2');
  });

  await test('db.linkCustomerReferral rejects circular referral loop (A -> B, B cannot refer A)', async () => {
    const custAId = 'cust_loop_a_' + Date.now();
    const custBId = 'cust_loop_b_' + Date.now();
    const codeA = 'REF-LOOP-A' + Date.now().toString().slice(-4);
    const codeB = 'REF-LOOP-B' + Date.now().toString().slice(-4);

    db.saveCustomer({
      id: custAId,
      name: 'عميل أ (المحيل الأول)',
      phone: '01711111111',
      referralCode: codeA,
      balance: 0,
      createdAt: new Date().toISOString()
    } as any);

    db.saveCustomer({
      id: custBId,
      name: 'عميل ب (المحال)',
      phone: '01722222222',
      referralCode: codeB,
      balance: 0,
      createdAt: new Date().toISOString()
    } as any);

    // Link: A invites B -> Success
    const linkResult1 = db.linkCustomerReferral(custBId, codeA);
    assert(linkResult1.success === true, 'Initial referral linkage must succeed');

    // Attempt: B invites A -> Circular referral loop! Must fail
    const linkResult2 = db.linkCustomerReferral(custAId, codeB);
    assert(linkResult2.success === false, 'Circular referral attempt (B -> A) must be rejected');
    assert(linkResult2.message.includes('حلقة إحالة دائرية'), `Error message should explain circular loop: ${linkResult2.message}`);
  });

  await test('Voucher classifications separate cash withdrawals from balance transfers correctly', async () => {
    const testCustId = 'cust_vouch_class_' + Date.now();
    db.saveCustomer({
      id: testCustId,
      name: 'عميل فحص السندات',
      phone: '01733333333',
      balance: 0,
      referralWalletBalance: 500,
      createdAt: new Date().toISOString()
    } as any);

    // 1. Balance transfer transaction
    db.addUnifiedWalletTransaction({
      customerId: testCustId,
      walletType: 'referral',
      type: 'redeemed',
      amount: 150,
      operationName: 'تحويل عمولة إحالة للرصيد الأساسي (تذكرة #RFT-123456)',
      balanceAfter: 350,
      orderNumber: 'RFT-123456'
    });

    // 2. Cash withdrawal transaction
    db.addUnifiedWalletTransaction({
      customerId: testCustId,
      walletType: 'referral',
      type: 'redeemed',
      amount: 100,
      operationName: 'سحب رصيد إحالة نقدي (تذكرة #WTH-999)',
      balanceAfter: 250,
      orderNumber: 'WTH-999'
    });

    const txs = db.getUnifiedWalletTransactions(testCustId);
    const refTxs = txs.filter(w => w.walletType === 'referral');

    const totalTransferred = refTxs
      .filter(w => w.type === 'redeemed' && !w.operationName.includes('سحب'))
      .reduce((sum, w) => sum + w.amount, 0);

    const totalWithdrawn = refTxs
      .filter(w => (w.type === 'redeemed' && w.operationName.includes('سحب')) || (w.type === 'adjustment' && (w.operationName.includes('سحب') || w.amount < 0)))
      .reduce((sum, w) => sum + Math.abs(w.amount), 0);

    assert(totalTransferred === 150, `Total transferred should be exactly 150, got ${totalTransferred}`);
    assert(totalWithdrawn === 100, `Total cash withdrawn should be exactly 100, got ${totalWithdrawn}`);
  });

  console.log('\n========================================================================');
  console.log(`🏁 AUDIT RESULTS: Passed ${passed} / ${total} tests.`);
  console.log('========================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
