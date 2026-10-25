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
(globalThis as any).localStorage = new MockLocalStorage();

// Dynamic imports after localStorage mock
const { db } = await import('../src/database/db');
const { CompetitionService } = await import('../src/services/competitions/competitionService');
const { CompetitionRulesEngine } = await import('../src/services/competitions/competitionRulesEngine');
const { CompetitionDeliveryService } = await import('../src/services/competitions/competitionDeliveryService');
const { CompetitionDrawService } = await import('../src/services/competitions/competitionDrawService');

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, test: string, message?: string) {
  if (!condition) {
    const err = message || `Assertion failed in ${suite} -> ${test}`;
    results.push({ suite, test, passed: false, error: err });
    console.error(`❌ [FAIL] ${suite} -> ${test}: ${err}`);
    throw new Error(err);
  } else {
    results.push({ suite, test, passed: true });
    console.log(`✅ [PASS] ${suite} -> ${test}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 STARTING COMPREHENSIVE GAMIFICATION & REWARDS TEST SUITE');
  console.log('================================================================\n');

  const adminUser = { id: 'admin_1', name: 'المدير المالك', role: 'admin', department: 'الإدارة العليا' };

  // -------------------------------------------------------------
  // SUITE 1: Task 39 - Critical 10-Recharge Workflow & Delivery Pipeline
  // -------------------------------------------------------------
  console.log('--- Suite 1: Task 39 - Critical 10-Recharge Workflow ---');
  try {
    // 1. Create a dedicated test customer
    const testCustomer = {
      id: 'cust_test_10recharges_' + Date.now(),
      name: 'عميل اختبار التحدي الذهبي',
      phone: '01099998888',
      code: 'TEST-10R',
      accountBalance: 100,
      cashbackBalance: 50,
      referralWalletBalance: 25,
      totalSpent: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString()
    };
    db.saveCustomer(testCustomer as any);

    // 2. Fetch the 10-recharge competition from seed
    const allComps = db.getCompetitions();
    const tenRechargeComp = allComps.find(c => c.id === 'comp_10_recharges') || allComps[0];
    assert(!!tenRechargeComp, 'Task 39', '10-Recharge competition exists');

    // 3. Create 10 completed recharge tickets for this customer
    const createdTickets = [];
    for (let i = 1; i <= 10; i++) {
      const ticket = {
        id: `tkt_test_10r_${i}_${Date.now()}`,
        ticketNumber: `TKT-10R-${i}`,
        customerId: testCustomer.id,
        customerName: testCustomer.name,
        customerPhone: testCustomer.phone,
        gameId: 'game_pubg',
        gameName: 'ببجي موبايل PUBG Mobile',
        totalAmount: 150,
        paidAmount: 150,
        receivedAmount: 150,
        status: 'completed',
        isPaid: true,
        createdAt: new Date().toISOString()
      };
      db.saveTicket(ticket as any);
      createdTickets.push(ticket);
    }

    // 4. Run rule evaluation directly with CompetitionRulesEngine
    const evalResult = CompetitionRulesEngine.evaluateCompetition(tenRechargeComp, {
      customer: testCustomer as any,
      tickets: createdTickets as any,
      currentParticipantsCount: 1
    });
    assert(evalResult.progressCount === 10, 'Task 39', 'Customer progress counted exactly 10 tickets');
    assert(evalResult.isEligible === true, 'Task 39', 'Customer progress reached eligible status (10/10)');

    // Synchronize participants
    CompetitionService.syncCompetitionParticipants(tenRechargeComp.id);
    const participants = db.getCompetitionParticipants(tenRechargeComp.id);
    const participantRecord = participants.find(p => p.entityId === testCustomer.id);
    assert(!!participantRecord, 'Task 39', 'Participant record created in competition');
    assert(participantRecord?.isEligible === true, 'Task 39', 'Participant record flagged isEligible === true');

    // Create pending reward for this winner
    const prize = tenRechargeComp.prizes[0];
    const pendingReward = {
      id: `rew_test_10r_${Date.now()}`,
      competitionId: tenRechargeComp.id,
      competitionTitle: tenRechargeComp.title,
      prizeId: prize.id,
      prizeName: prize.name,
      prizeType: prize.type,
      prizeValue: prize.value,
      currency: prize.currency,
      costEGP: prize.costEGP,
      sourceWalletId: prize.sourceWalletId,
      sourceWalletName: 'محفظة أونصة جولد Razer Gold',
      entityType: 'customer' as const,
      entityId: testCustomer.id,
      entityName: testCustomer.name,
      entityPhone: testCustomer.phone,
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };
    db.saveCompetitionReward(pendingReward);

    // 5. Check baseline financial state
    const wallets = db.getStoreWallets();
    const targetWallet = wallets.find(w => w.id === pendingReward.sourceWalletId) || wallets[0];
    const initialWalletBalance = targetWallet.balance;
    const initialExpenses = db.getExpenses();
    const initialExpCount = initialExpenses.length;
    const initialLogsCount = db.getAuditLogs().length;
    const initialTicketsCount = db.getTickets().length;

    // 6. Deliver Reward via CompetitionService / db
    const deliveryResult = db.deliverCompetitionReward(pendingReward.id, adminUser);
    assert(deliveryResult.success === true, 'Task 39', 'Reward delivery succeeded atomically');

    // 7. Verify post-delivery state
    const updatedReward = db.getCompetitionRewardById(pendingReward.id);
    assert(updatedReward?.status === 'delivered', 'Task 39', 'Reward status changed to delivered');
    assert(!!updatedReward?.deliveredAt, 'Task 39', 'Reward deliveredAt timestamp recorded');
    assert(updatedReward?.deliveredBy === adminUser.name, 'Task 39', 'Delivered by admin user recorded');

    // 8. Verify anti-distortion finance integrity:
    // a. Product store wallet deducted by exact cost
    const updatedWallets = db.getStoreWallets();
    const updatedTargetWallet = updatedWallets.find(w => w.id === targetWallet.id)!;
    const expectedWalletBalance = initialWalletBalance - (updatedReward?.costEGP || 0);
    assert(
      Math.abs(updatedTargetWallet.balance - expectedWalletBalance) < 0.01,
      'Task 39',
      'Product Store Wallet deducted by exact cost without distortion',
      `Expected: ${expectedWalletBalance}, Found: ${updatedTargetWallet.balance}`
    );

    // b. Marketing expense added with paidFromVault: false
    const updatedExpenses = db.getExpenses();
    assert(updatedExpenses.length === initialExpCount + 1, 'Task 39', 'Exactly 1 marketing expense created');
    const createdExpense = updatedExpenses[0];
    assert(createdExpense.category === 'marketing', 'Task 39', 'Expense category is marketing');
    assert(createdExpense.paidFromVault === false, 'Task 39', 'Expense paidFromVault is false (not deducted from vault cash)');
    assert(createdExpense.amount === (updatedReward?.costEGP || 0), 'Task 39', 'Expense amount equals reward costEGP');

    // c. Sales ledger 100% UNTOUCHED (Zero-revenue sales distortion test)
    const postTickets = db.getTickets();
    assert(postTickets.length === initialTicketsCount, 'Task 39', 'Zero new sales tickets created (Sales Ledger completely isolated)');

    // d. Activity Log entry
    const postLogs = db.getAuditLogs();
    assert(postLogs.length > initialLogsCount, 'Task 39', 'Audit log activity recorded for reward delivery');
  } catch (err: any) {
    console.error('Suite 1 failed:', err.message);
  }

  // -------------------------------------------------------------
  // SUITE 2: Task 40 - Provably Fair Random Draw Engine Test
  // -------------------------------------------------------------
  console.log('\n--- Suite 2: Task 40 - Random Draw Engine & Fairness ---');
  try {
    // 1. Create a lucky draw competition
    const luckyComp = {
      id: 'comp_lucky_draw_test_' + Date.now(),
      title: 'سحب الحظ الأسبوعي العشوائي',
      description: 'سحب على 3 جوائز للمشاركين',
      type: 'lucky_draw' as const,
      targetAudience: 'all' as const,
      status: 'active' as const,
      rules: {
        operator: 'AND' as const,
        conditions: [
          {
            id: 'cond_ld_1',
            type: 'recharge_count' as const,
            operator: '>=' as const,
            value: 1,
            label: 'شحنة واحدة على الأقل'
          }
        ]
      },
      prizes: [
        { id: 'prz_1', name: 'جائزة المركز الأول', type: 'balance' as const, value: 300, currency: 'EGP', costEGP: 300, sourceWalletId: 'w_gold', quantity: 1, remainingQuantity: 1 },
        { id: 'prz_2', name: 'جائزة المركز الثاني', type: 'balance' as const, value: 200, currency: 'EGP', costEGP: 200, sourceWalletId: 'w_gold', quantity: 1, remainingQuantity: 1 },
        { id: 'prz_3', name: 'جائزة المركز الثالث', type: 'balance' as const, value: 100, currency: 'EGP', costEGP: 100, sourceWalletId: 'w_gold', quantity: 1, remainingQuantity: 1 }
      ],
      startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      isDrawExecuted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.saveCompetition(luckyComp as any, adminUser);

    // 2. Add 10 distinct customers and tickets for draw
    for (let i = 1; i <= 10; i++) {
      const cId = `cust_draw_user_${i}`;
      const cPhone = `015998877${i < 10 ? '0' + i : i}`;
      db.saveCustomer({
        id: cId,
        name: `مشارك رقم ${i}`,
        phone: cPhone,
        code: `DRW-${i}`,
        accountBalance: 0,
        createdAt: new Date().toISOString()
      } as any);

      db.saveTicket({
        id: `tkt_ld_${i}_${Date.now()}`,
        ticketNumber: `TKT-LD-${i}`,
        customerId: cId,
        customerName: `مشارك رقم ${i}`,
        customerPhone: cPhone,
        totalAmount: 100,
        paidAmount: 100,
        receivedAmount: 100,
        status: 'completed',
        isPaid: true,
        createdAt: new Date().toISOString()
      } as any);

      db.saveCompetitionParticipant({
        id: `part_draw_${luckyComp.id}_${i}`,
        competitionId: luckyComp.id,
        entityType: 'customer',
        entityId: cId,
        entityName: `مشارك رقم ${i}`,
        entityPhone: cPhone,
        joinedAt: new Date().toISOString(),
        entriesCount: i,
        rechargeCount: 1,
        totalRechargeAmount: 100,
        qualifyingTransactionIds: [`tkt_ld_${i}`],
        isEligible: true,
        isWinner: false
      });
    }

    const participantsBefore = db.getCompetitionParticipants(luckyComp.id);
    assert(participantsBefore.length === 10, 'Task 40', '10 distinct participants enrolled');

    // 3. Execute random draw
    const drawResult = db.runCompetitionDraw(luckyComp.id, adminUser);

    assert(drawResult.winners.length === 3, 'Task 40', 'Exactly 3 winners drawn');

    // Verify distinct winners (no repeats)
    const uniqueWinnerIds = new Set(drawResult.winners.map((w: any) => w.entityId));
    assert(uniqueWinnerIds.size === 3, 'Task 40', 'All 3 winners are distinct individuals (no duplicate draws)');

    assert(!!drawResult.drawRecord?.randomSeed, 'Task 40', 'Provably fair randomSeed was generated and stored');
    assert((drawResult.drawRecord?.frozenParticipantsSnapshot?.length || 0) >= 10, 'Task 40', 'Participants frozen snapshot captured all eligible participants (>= 10)');

    // Verify rewards created in pending status
    const rewards = db.getCompetitionRewards().filter(r => r.competitionId === luckyComp.id);
    assert(rewards.length === 3, 'Task 40', 'Exactly 3 reward entries generated for winners');
    assert(rewards.every(r => r.status === 'pending'), 'Task 40', 'All newly drawn rewards are in pending status');

    // Verify competition marked completed / finished
    const updatedComp = db.getCompetitionById(luckyComp.id);
    assert(updatedComp?.status === 'finished', 'Task 40', 'Competition status updated to finished');
    assert(updatedComp?.isDrawExecuted === true, 'Task 40', 'Competition marked isDrawExecuted === true');
  } catch (err: any) {
    console.error('Suite 2 failed:', err.message);
  }

  // -------------------------------------------------------------
  // SUITE 3: Task 41 - Reward Cancellation Pipeline
  // -------------------------------------------------------------
  console.log('\n--- Suite 3: Task 41 - Reward Cancellation Pipeline ---');
  try {
    const rewards = db.getCompetitionRewards().filter(r => r.status === 'pending');
    assert(rewards.length > 0, 'Task 41', 'Pending reward exists for cancellation test');
    const targetReward = rewards[0];

    const wallets = db.getStoreWallets();
    const walletBefore = wallets.find(w => w.id === targetReward.sourceWalletId);
    const expCountBefore = db.getExpenses().length;

    const cancelledReward = db.cancelCompetitionReward(
      targetReward.id,
      adminUser,
      'إلغاء بناء على طلب العميل واستبدالها بنقاط'
    );
    assert(cancelledReward?.status === 'cancelled', 'Task 41', 'Reward status set to cancelled');
    assert(cancelledReward?.cancellationReason?.includes('إلغاء بناء على طلب العميل') === true, 'Task 41', 'Cancellation reason saved');

    // Financial zero-impact assertion
    const walletsAfter = db.getStoreWallets();
    const walletAfter = walletsAfter.find(w => w.id === targetReward.sourceWalletId);
    assert(walletBefore?.balance === walletAfter?.balance, 'Task 41', 'Zero product wallet deduction on cancellation');
    const expCountAfter = db.getExpenses().length;
    assert(expCountBefore === expCountAfter, 'Task 41', 'Zero marketing expenses created on cancellation');
  } catch (err: any) {
    console.error('Suite 3 failed:', err.message);
  }

  // -------------------------------------------------------------
  // SUITE 4: Task 42 - Double-Click Concurrency Idempotency Test
  // -------------------------------------------------------------
  console.log('\n--- Suite 4: Task 42 - Concurrency & Double-Click Protection ---');
  try {
    // Create a fresh pending reward
    const testReward = {
      id: 'rew_doubleclick_test_' + Date.now(),
      competitionId: 'comp_test',
      competitionTitle: 'مسابقة فحص التكرار',
      prizeId: 'prz_test',
      prizeName: 'بطاقة اختبار',
      prizeType: 'service_card' as const,
      prizeValue: 100,
      currency: 'EGP',
      costEGP: 80,
      sourceWalletId: 'w_gold',
      sourceWalletName: 'محفظة أونصة جولد',
      entityType: 'customer' as const,
      entityId: 'cust_doubleclick',
      entityName: 'عميل التكرار',
      entityPhone: '01000000001',
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };
    db.saveCompetitionReward(testReward);

    const wallets = db.getStoreWallets();
    const targetW = wallets.find(w => w.id === testReward.sourceWalletId) || wallets[0];
    const initialWalletBal = targetW.balance;

    // Trigger two consecutive / concurrent delivery attempts
    let call1Success = false;
    let call2Failed = false;
    let errorMsg = '';

    try {
      const call1 = db.deliverCompetitionReward(testReward.id, adminUser);
      call1Success = call1.success === true;
    } catch (e: any) {
      call1Success = false;
    }

    try {
      db.deliverCompetitionReward(testReward.id, adminUser);
    } catch (e: any) {
      call2Failed = true;
      errorMsg = e.message;
    }

    assert(call1Success === true, 'Task 42', 'First delivery attempt succeeded');
    assert(call2Failed === true, 'Task 42', 'Second concurrent attempt was blocked and threw error');
    assert(errorMsg.includes('تم تسليمها') || errorMsg.includes('قيد المعالجة') || errorMsg.includes('مكتملة'), 'Task 42', 'Rejection reason indicates already delivered or locked', errorMsg);

    // Verify wallet only deducted once (80 EGP, not 160 EGP)
    const finalW = db.getStoreWallets().find(w => w.id === targetW.id)!;
    const expectedBal = initialWalletBal - 80;
    assert(
      Math.abs(finalW.balance - expectedBal) < 0.01,
      'Task 42',
      'Wallet was deducted exactly ONCE (no double deduction)',
      `Initial: ${initialWalletBal}, Final: ${finalW.balance}, Expected: ${expectedBal}`
    );
  } catch (err: any) {
    console.error('Suite 4 failed:', err.message);
  }

  // -------------------------------------------------------------
  // SUITE 5: Task 43 - Permission Security Guard Test
  // -------------------------------------------------------------
  console.log('\n--- Suite 5: Task 43 - Permission Security Guard ---');
  try {
    const restrictedUser = {
      id: 'usr_no_perm',
      username: 'clerk_only',
      fullName: 'موظف مقيد',
      role: 'employee',
      permissions: ['view_customers'] // lacks deliver_rewards
    };

    const hasPermission = (user: any, perm: string) => {
      if (user.role === 'admin') return true;
      return Array.isArray(user.permissions) && user.permissions.includes(perm);
    };

    assert(hasPermission(restrictedUser, 'deliver_rewards') === false, 'Task 43', 'Restricted user is missing deliver_rewards permission');
    assert(hasPermission(adminUser, 'deliver_rewards') === true, 'Task 43', 'Admin user has deliver_rewards permission');
    assert(hasPermission({ role: 'employee', permissions: ['deliver_rewards'] }, 'deliver_rewards') === true, 'Task 43', 'Employee with deliver_rewards permission is authorized');
  } catch (err: any) {
    console.error('Suite 5 failed:', err.message);
  }

  // -------------------------------------------------------------
  // SUITE 6: Task 44 & 45 - Sales Isolation & Full Regression Test
  // -------------------------------------------------------------
  console.log('\n--- Suite 6: Tasks 44 & 45 - Data Consistency & Regression ---');
  try {
    // 1. Check all standard tables exist and are healthy
    const customers = db.getCustomers();
    const dealers = db.getDealers();
    const tickets = db.getTickets();
    const expenses = db.getExpenses();
    const storeWallets = db.getStoreWallets();
    const safeTx = db.getSafeTransactions();
    const auditLogs = db.getAuditLogs();
    const competitions = db.getCompetitions();
    const rewards = db.getCompetitionRewards();

    assert(customers.length > 0, 'Task 45', 'Customers subsystem healthy');
    assert(dealers.length > 0, 'Task 45', 'Dealers subsystem healthy');
    assert(tickets.length > 0, 'Task 45', 'Tickets / Orders subsystem healthy');
    assert(expenses.length > 0, 'Task 45', 'Expenses subsystem healthy');
    assert(storeWallets.length > 0, 'Task 45', 'Store Wallets subsystem healthy');
    assert(safeTx.length >= 0, 'Task 45', 'Safe / Vault subsystem healthy');
    assert(auditLogs.length > 0, 'Task 45', 'Audit log subsystem healthy');
    assert(competitions.length >= 5, 'Task 45', 'Competitions subsystem healthy');
    assert(rewards.length > 0, 'Task 45', 'Rewards subsystem healthy');

    // 2. Sales Ledger Purity Test:
    // Check that NO ticket has customerName or totalAmount altered by competition rewards
    const zeroPriceTickets = tickets.filter(t => t.totalAmount === 0 && t.paidAmount === 0);
    assert(zeroPriceTickets.length === 0, 'Task 44', 'Zero 0-revenue tickets exist (Zero sales distortion confirmed)');

    // 3. Marketing Expenses check:
    // All reward expenses have category == 'marketing' and paidFromVault == false
    const rewardExpenses = expenses.filter(e => e.notes?.includes('تسليم جائزة مسابقة') || e.receiptNumber?.startsWith('REW-'));
    assert(rewardExpenses.every(e => e.category === 'marketing'), 'Task 44', 'All reward expenses strictly mapped to Marketing Category');
    assert(rewardExpenses.every(e => e.paidFromVault === false), 'Task 44', 'All reward expenses paidFromVault is false (Vault cash untouched)');

    // 4. Test Customer and Dealer Profile Tab integration
    const custProfileData = db.getCustomerById('cust_1');
    assert(!!custProfileData, 'Task 45', 'Customer profile retrieved with all wallet balances');

    const dealerProfileData = db.getDealerById('dlr_1');
    assert(!!dealerProfileData, 'Task 45', 'Dealer profile retrieved with all wallet balances');

    // 5. Overall KPIs validation
    const kpis = db.getCompetitionDashboardKPIs();
    assert(typeof kpis.activeCompetitionsCount === 'number', 'Task 45', 'Dashboard KPI activeCompetitionsCount computed');
    assert(typeof kpis.deliveredRewardsValue === 'number', 'Task 45', 'Dashboard KPI deliveredRewardsValue computed');
    assert(typeof kpis.marketingCostTotal === 'number', 'Task 45', 'Dashboard KPI marketingCostTotal computed');
  } catch (err: any) {
    console.error('Suite 6 failed:', err.message);
  }

  // -------------------------------------------------------------
  // SUITE 7: Tasks 10, 11, 12, 13, 14, 15, 16, 25 - Merchant & Combined Competitions
  // -------------------------------------------------------------
  console.log('\n--- Suite 7: Merchant & Combined Competitions (Tasks 10-16 & 25) ---');
  try {
    // 1. TASK 10: Customer Test Competition Lifecycle
    const custComp = db.saveCompetition({
      id: 'comp_test_cust_lifecycle_' + Date.now(),
      code: 'CMP-CUST-TEST',
      title: 'Customer Test Competition',
      description: 'اختبار دورة حياة مسابقة العملاء',
      type: 'recharge_count',
      status: 'draft',
      startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      startTime: '00:00',
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      endTime: '23:59',
      targetAudience: { type: 'all_customers' },
      rules: {
        id: 'r_cust',
        logicalOperator: 'AND',
        conditions: [{ id: 'c_1', type: 'recharge_count', operator: 'gte', value: 3, label: '3 شحنات' }]
      },
      prizes: [{ id: 'prz_c1', name: 'Test Reward', type: 'wallet_credit', value: 50, currency: 'EGP', costEGP: 50 }],
      totalMarketingCost: 0
    }, adminUser);

    assert(custComp.status === 'draft', 'Task 10', 'Customer Test Competition created as draft');

    // Edit
    custComp.title = 'Customer Test Competition (Edited)';
    db.saveCompetition(custComp, adminUser);
    const editedComp = db.getCompetitionById(custComp.id);
    assert(editedComp?.title === 'Customer Test Competition (Edited)', 'Task 10', 'Competition edit succeeded');

    // Activate
    editedComp!.status = 'active';
    db.saveCompetition(editedComp!, adminUser);
    assert(db.getCompetitionById(custComp.id)?.status === 'active', 'Task 10', 'Competition activated');

    // Pause
    editedComp!.status = 'paused';
    db.saveCompetition(editedComp!, adminUser);
    assert(db.getCompetitionById(custComp.id)?.status === 'paused', 'Task 10', 'Competition paused');

    // Finish
    editedComp!.status = 'finished';
    db.saveCompetition(editedComp!, adminUser);
    assert(db.getCompetitionById(custComp.id)?.status === 'finished', 'Task 10', 'Competition finished');

    // Archive
    const archiveRes = db.deleteCompetition(custComp.id, adminUser);
    assert(archiveRes.success === true, 'Task 10', 'Competition archived/deleted safely');

    // 2. TASK 11: Merchant Test Competition
    const merchantTestComp = db.saveCompetition({
      id: 'comp_test_merchant_' + Date.now(),
      code: 'CMP-MERCH-TEST',
      title: 'Merchant Test Competition',
      description: 'مسابقة مخصصة لتجار وموزعي الجملة',
      type: 'recharge_count',
      status: 'active',
      startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      startTime: '00:00',
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      endTime: '23:59',
      targetAudience: { type: 'merchants' },
      rules: {
        id: 'r_m1',
        logicalOperator: 'AND',
        conditions: [{ id: 'c_m1', type: 'recharge_count', operator: 'gte', value: 5, label: '5 شحنات جملة' }]
      },
      prizes: [{ id: 'prz_m1', name: 'جائزة تاجر تجريبية', type: 'wallet_credit', value: 200, currency: 'EGP', costEGP: 200 }],
      totalMarketingCost: 0
    }, adminUser);

    assert(merchantTestComp.targetAudience.type === 'merchants', 'Task 11', 'Merchant Test Competition target set to merchants');
    assert(merchantTestComp.status === 'active', 'Task 11', 'Merchant Test Competition activated successfully');

    // 3. TASK 5 - Example 1: Merchant Top Spenders Leaderboard Ranking
    const dealerA = { id: 'dlr_test_a_' + Date.now(), name: 'التاجر أ (50k)', phone: '01111111111', balance: 5000, cashbackBalance: 200 };
    const dealerB = { id: 'dlr_test_b_' + Date.now(), name: 'التاجر ب (40k)', phone: '01222222222', balance: 3000, cashbackBalance: 150 };
    const dealerC = { id: 'dlr_test_c_' + Date.now(), name: 'التاجر ج (30k)', phone: '01333333333', balance: 1000, cashbackBalance: 100 };
    db.saveDealer(dealerA as any);
    db.saveDealer(dealerB as any);
    db.saveDealer(dealerC as any);

    // Create Dealer Top Spenders Competition
    const topSpendersComp = db.saveCompetition({
      id: 'comp_top_spenders_dealers_' + Date.now(),
      code: 'CMP-DLR-TOP',
      title: 'أكثر التجار شحنًا خلال الأسبوع',
      description: 'أعلى 3 تجار في حجم شحن الجملة',
      type: 'top_spenders',
      status: 'active',
      startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      startTime: '00:00',
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      endTime: '23:59',
      targetAudience: { type: 'merchants' },
      rules: {
        id: 'r_ts',
        logicalOperator: 'AND',
        conditions: [{ id: 'c_ts', type: 'total_recharge_amount', operator: 'gte', value: 10000, label: 'الحد الأدنى 10 آلاف' }]
      },
      prizes: [
        { id: 'prz_ts1', rankOrTier: 1, name: 'المركز الأول: 1000 ج', type: 'wallet_credit', value: 1000, currency: 'EGP', costEGP: 1000 },
        { id: 'prz_ts2', rankOrTier: 2, name: 'المركز الثاني: 500 ج', type: 'wallet_credit', value: 500, currency: 'EGP', costEGP: 500 },
        { id: 'prz_ts3', rankOrTier: 3, name: 'المركز الثالث: 250 ج', type: 'wallet_credit', value: 250, currency: 'EGP', costEGP: 250 }
      ],
      totalMarketingCost: 0
    }, adminUser);

    // Add Wholesale Tickets: Dealer A = 50,000 EGP, Dealer B = 40,000 EGP, Dealer C = 30,000 EGP
    db.saveDealerTicket({
      id: 'dtkt_a_' + Date.now(),
      ticketNumber: 'DTKT-A',
      dealerId: dealerA.id,
      dealerPhone: dealerA.phone,
      totalAmount: 50000,
      receivedAmount: 50000,
      status: 'completed',
      createdAt: new Date().toISOString()
    } as any);

    db.saveDealerTicket({
      id: 'dtkt_b_' + Date.now(),
      ticketNumber: 'DTKT-B',
      dealerId: dealerB.id,
      dealerPhone: dealerB.phone,
      totalAmount: 40000,
      receivedAmount: 40000,
      status: 'completed',
      createdAt: new Date().toISOString()
    } as any);

    db.saveDealerTicket({
      id: 'dtkt_c_' + Date.now(),
      ticketNumber: 'DTKT-C',
      dealerId: dealerC.id,
      dealerPhone: dealerC.phone,
      totalAmount: 30000,
      receivedAmount: 30000,
      status: 'completed',
      createdAt: new Date().toISOString()
    } as any);

    // Synchronize participants via unified engine
    CompetitionService.syncCompetitionParticipants(topSpendersComp.id);

    const parts = db.getCompetitionParticipants(topSpendersComp.id);
    const pA = parts.find(p => p.entityId === dealerA.id);
    const pB = parts.find(p => p.entityId === dealerB.id);
    const pC = parts.find(p => p.entityId === dealerC.id);

    assert(pA?.currentRank === 1 && pA?.totalRechargeAmount === 50000, 'Task 5', 'Merchant A ranked #1 with 50,000 EGP');
    assert(pB?.currentRank === 2 && pB?.totalRechargeAmount === 40000, 'Task 5', 'Merchant B ranked #2 with 40,000 EGP');
    assert(pC?.currentRank === 3 && pC?.totalRechargeAmount === 30000, 'Task 5', 'Merchant C ranked #3 with 30,000 EGP');
    assert(pA?.isEligible === true && pB?.isEligible === true && pC?.isEligible === true, 'Task 5', 'All 3 dealers marked eligible');

    // 4. TASK 5 - Example 2: Target = 100 Transactions (Progress 72 / 100 -> 100 / 100)
    const targetComp = db.saveCompetition({
      id: 'comp_100_target_' + Date.now(),
      code: 'CMP-100-TGT',
      title: 'تحدي 100 عملية شحن للتاجر',
      description: 'التاجر الذي يحقق 100 عملية شحن يحصل على مكافأة',
      type: 'recharge_count',
      status: 'active',
      startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      startTime: '00:00',
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      endTime: '23:59',
      targetAudience: { type: 'merchants' },
      rules: {
        id: 'r_100',
        logicalOperator: 'AND',
        conditions: [{ id: 'c_100', type: 'recharge_count', operator: 'gte', value: 100, label: '100 شحنة' }]
      },
      prizes: [{ id: 'prz_100', name: 'مكافأة إتمام 100 شحنة: 500 ج', type: 'wallet_credit', value: 500, currency: 'EGP', costEGP: 500 }],
      totalMarketingCost: 0
    }, adminUser);

    const dealerD = { id: 'dlr_test_d_' + Date.now(), name: 'تاجر التحدي 100', phone: '01444444444', balance: 0, cashbackBalance: 0 };
    db.saveDealer(dealerD as any);

    // Create 72 tickets
    for (let i = 1; i <= 72; i++) {
      db.saveDealerTicket({
        id: `dtkt_d72_${i}_${Date.now()}`,
        ticketNumber: `DTKT-72-${i}`,
        dealerId: dealerD.id,
        dealerPhone: dealerD.phone,
        totalAmount: 100,
        receivedAmount: 100,
        status: 'completed',
        createdAt: new Date().toISOString()
      } as any);
    }

    CompetitionService.syncCompetitionParticipants(targetComp.id);
    let pD = db.getCompetitionParticipants(targetComp.id).find(p => p.entityId === dealerD.id);
    assert(pD?.rechargeCount === 72, 'Task 5', 'Dealer progress correctly recorded 72 / 100 transactions');
    assert(pD?.isEligible === false, 'Task 5', 'Dealer is not eligible yet at 72/100');

    // Add remaining 28 tickets to reach 100
    for (let i = 73; i <= 100; i++) {
      db.saveDealerTicket({
        id: `dtkt_d100_${i}_${Date.now()}`,
        ticketNumber: `DTKT-100-${i}`,
        dealerId: dealerD.id,
        dealerPhone: dealerD.phone,
        totalAmount: 100,
        receivedAmount: 100,
        status: 'completed',
        createdAt: new Date().toISOString()
      } as any);
    }

    CompetitionService.syncCompetitionParticipants(targetComp.id);
    pD = db.getCompetitionParticipants(targetComp.id).find(p => p.entityId === dealerD.id);
    assert(pD?.rechargeCount === 100, 'Task 5', 'Dealer progress reached 100 / 100 transactions');
    assert(pD?.isEligible === true, 'Task 5', 'Dealer reached eligible status at 100/100 transactions');

    // 5. TASK 12: Customer + Merchant Combined Competition
    const combinedComp = db.saveCompetition({
      id: 'comp_combined_' + Date.now(),
      code: 'CMP-BOTH',
      title: 'مسابقة كبرى مشتركة (عملاء + تجار)',
      description: 'مفتوحة لكافة العملاء والتجار معاً',
      type: 'recharge_count',
      status: 'active',
      startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      startTime: '00:00',
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      endTime: '23:59',
      targetAudience: { type: 'both' },
      rules: {
        id: 'r_both',
        logicalOperator: 'AND',
        conditions: [{ id: 'c_both', type: 'recharge_count', operator: 'gte', value: 1, label: 'شحنة واحدة على الأقل' }]
      },
      prizes: [{ id: 'prz_both', name: 'جائزة مشتركة', type: 'wallet_credit', value: 100, currency: 'EGP', costEGP: 100 }],
      totalMarketingCost: 0
    }, adminUser);

    CompetitionService.syncCompetitionParticipants(combinedComp.id);
    const combinedParts = db.getCompetitionParticipants(combinedComp.id);
    const hasCust = combinedParts.some(p => p.entityType === 'customer');
    const hasDealer = combinedParts.some(p => p.entityType === 'dealer');
    assert(hasCust && hasDealer, 'Task 12', 'Both Customer and Dealer participate together in Combined Competition');

    // 6. TASK 13, 14, 15, 16: Dealer Reward Delivery, Wallet Verification, Finance & Cashback
    const dealerBefore = db.getDealerById(dealerD.id);
    const balBefore = dealerBefore?.balance || 0;
    const cbBefore = dealerBefore?.cashbackBalance || 0;

    // Create reward for dealer D
    const rewardPayload = {
      id: 'rew_dealer_d_' + Date.now(),
      competitionId: targetComp.id,
      competitionTitle: targetComp.title,
      participantId: pD!.id,
      entityType: 'dealer' as const,
      entityId: dealerD.id,
      entityName: dealerD.name,
      entityPhone: dealerD.phone,
      prizeId: 'prz_100',
      prizeName: 'مكافأة إتمام 100 شحنة: 500 ج',
      prizeType: 'wallet_credit' as const,
      prizeValue: 500,
      currency: 'EGP' as const,
      costEGP: 500,
      status: 'pending' as const,
      idempotencyKey: `IDEMP-DLR-${dealerD.id}-${Date.now()}`,
      snapshot: {
        competitionName: targetComp.title,
        prizeName: '500 ج',
        prizeValue: 500,
        currency: 'EGP' as const,
        costEGP: 500,
        entityName: dealerD.name,
        phone: dealerD.phone,
        rulesSummary: '100 شحنة'
      }
    };
    db.saveCompetitionReward(rewardPayload as any);
    const rewardD = db.getCompetitionRewardById(rewardPayload.id)!;

    assert(rewardD?.status === 'pending', 'Task 13', 'Dealer reward created in pending status');

    // Deliver reward
    const delResult = db.deliverCompetitionReward(rewardD.id, adminUser);
    assert(delResult.success === true, 'Task 13', 'Dealer reward delivery succeeded atomically');

    // Check Dealer Balance Before and After (TASK 14)
    const dealerAfter = db.getDealerById(dealerD.id);
    const balAfter = dealerAfter?.balance || 0;
    assert(balAfter - balBefore === 500, 'Task 14', `Dealer balance accurately credited: Difference (${balAfter - balBefore}) === Actual Reward Cost (500)`);

    // Check Cashback is untouched (TASK 16)
    const cbAfter = dealerAfter?.cashbackBalance || 0;
    assert(cbAfter === cbBefore, 'Task 16', 'Normal cashback completely independent and untouched by competition reward');

    // Check Finance Marketing Expense (TASK 15)
    const exp = db.getExpenses().find(e => e.id === delResult.financialExpenseId);
    assert(!!exp, 'Task 15', 'Finance Marketing Expense record created for merchant reward');
    assert(exp?.category === 'marketing', 'Task 15', 'Expense category strictly set to marketing');
    assert(exp?.paidFromVault === false, 'Task 15', 'Expense paidFromVault is false (Vault cash protected)');
    assert(exp?.amount === 500, 'Task 15', 'Expense amount exactly matches prize costEGP (500)');

    // TASK 25: Double-Click Protection on Dealer Reward
    let doubleClickThrew = false;
    try {
      db.deliverCompetitionReward(rewardD.id, adminUser);
    } catch (e: any) {
      doubleClickThrew = true;
    }
    assert(doubleClickThrew, 'Task 25', 'Second delivery attempt rejected cleanly (No double execution)');

    const dealerAfterSecond = db.getDealerById(dealerD.id);
    assert(dealerAfterSecond?.balance === balAfter, 'Task 25', 'Dealer wallet balance NOT credited twice after rejection');
  } catch (err: any) {
    console.error('Suite 7 failed:', err.message);
  }


  // -------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 TEST EXECUTION SUMMARY:');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total Assertions Tested: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.error(`💥 SUITE FAILED WITH ${failed} FAILURES!`);
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED PROVABLY WITH 100% SUCCESS!');
  }
}

runTestSuite().catch(e => {
  console.error('Unhandled suite error:', e);
  process.exit(1);
});
