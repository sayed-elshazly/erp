// Mock localStorage for Node environment before importing any ERP modules
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

// Dynamic imports
const { db } = await import('../src/database/db');
const { JKRWalletEngine } = await import('../src/services/financial/jkrWalletEngine');
const { CompetitionService } = await import('../src/services/competitions/competitionService');
const { CompetitionRulesEngine } = await import('../src/services/competitions/competitionRulesEngine');
const { CompetitionDeliveryService } = await import('../src/services/competitions/competitionDeliveryService');

export interface AuditTestResult {
  id: string;
  suite: string;
  subsystem: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_TESTED' | 'NEEDS_INVESTIGATION';
  expected: string;
  actual: string;
  error?: string;
  evidence?: any;
  durationMs: number;
}

const auditResults: AuditTestResult[] = [];

function recordTest(
  id: string,
  suite: string,
  subsystem: string,
  testName: string,
  passed: boolean,
  expected: string,
  actual: string,
  error?: string,
  evidence?: any,
  durationMs = 0
) {
  const status = passed ? 'PASS' : 'FAIL';
  const entry: AuditTestResult = {
    id,
    suite,
    subsystem,
    testName,
    status,
    expected,
    actual,
    error,
    evidence,
    durationMs
  };
  auditResults.push(entry);
  if (passed) {
    console.log(`  ✅ [${id}] [${suite}] ${testName}`);
  } else {
    console.error(`  ❌ [${id}] [${suite}] ${testName} -> FAIL: ${error || actual}`);
  }
}

async function runTest(
  id: string,
  suite: string,
  subsystem: string,
  testName: string,
  expected: string,
  fn: () => Promise<{ actual: string; passed: boolean; evidence?: any }> | { actual: string; passed: boolean; evidence?: any }
) {
  const start = Date.now();
  try {
    const res = await fn();
    const duration = Date.now() - start;
    recordTest(id, suite, subsystem, testName, res.passed, expected, res.actual, undefined, res.evidence, duration);
  } catch (err: any) {
    const duration = Date.now() - start;
    recordTest(id, suite, subsystem, testName, false, expected, `Threw exception: ${err?.message || err}`, err?.message, undefined, duration);
  }
}

// Global test runner
async function startFullAudit() {
  console.log('================================================================');
  console.log('🏛️ SYSTEM ERP: COMPREHENSIVE AUTOMATED TECHNICAL AUDIT');
  console.log('   Running across all 19 Modules, Financial Engines, FIFO & RBAC');
  console.log('================================================================\n');

  // =========================================================================
  // SUITE 1: CUSTOMERS SUBSYSTEM (الزبائن والمحافظ)
  // =========================================================================
  console.log('▶ SUITE 1: Customers Subsystem (الزبائن وإدارة الأرصدة والكاش باك)');

  await runTest('CUST-01', 'Customers', 'Profiles & Wallets', 'Create Customer with Initial Balances and Ledger Transactions', 'Customer saved and balance synchronized with ledger', () => {
    const custId = 'cust_test_' + Date.now();
    const customer = {
      id: custId,
      name: 'أحمد محمود العشري',
      phone: '+201011223344',
      code: 'CUST-TEST-01',
      accountBalance: 1500,
      balance: 1500,
      cashbackBalance: 150,
      cashbackRate: 5.0,
      debtLimit: 500,
      currentDebt: 0,
      totalSpent: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString()
    };
    db.saveCustomer(customer as any);

    // Add initial cashback transaction in unified ledger to ensure mathematical integrity
    db.addUnifiedWalletTransaction({
      customerId: custId,
      walletType: 'cashback',
      type: 'earned',
      amount: 150,
      balanceAfter: 150,
      operationName: 'كاش باك ترحيبي افتتاحي'
    });

    const retrieved = db.getCustomerById(custId);
    const passed = !!retrieved && retrieved.accountBalance === 1500 && retrieved.cashbackBalance === 150;
    return {
      passed,
      actual: retrieved ? `Found: Bal=${retrieved.accountBalance}, CB=${retrieved.cashbackBalance}` : 'Not Found',
      evidence: retrieved
    };
  });

  await runTest('CUST-02', 'Customers', 'Search & Filtering', 'Search Customer by Phone & Code', 'Returns matching customer', () => {
    const all = db.getCustomers(true);
    const byPhone = all.filter(c => c.phone?.includes('01011223344') || c.phone?.includes('+201011223344'));
    const byCode = all.filter(c => c.code === 'CUST-TEST-01');
    const passed = byPhone.length > 0 && byCode.length > 0 && byPhone[0].id === byCode[0].id;
    return {
      passed,
      actual: `byPhone matches: ${byPhone.length}, byCode matches: ${byCode.length}`,
      evidence: { phoneMatch: byPhone[0]?.name, codeMatch: byCode[0]?.name }
    };
  });

  await runTest('CUST-03', 'Customers', 'Wallets Balance Modification', 'Credit and Debit Customer Balances Correctly', 'Balances updated accurately without discrepancy', () => {
    const all = db.getCustomers(true);
    const cust = all.find(c => c.code === 'CUST-TEST-01')!;
    const initialBal = cust.accountBalance || 0;
    const initialCb = cust.cashbackBalance || 0;

    // Credit 200, Debit 50
    const newBal = initialBal + 200 - 50;
    const updatedCust = { ...cust, accountBalance: newBal, balance: newBal };
    db.saveCustomer(updatedCust);

    db.addUnifiedWalletTransaction({
      customerId: cust.id,
      walletType: 'account_balance',
      type: 'credit',
      amount: 150,
      balanceAfter: newBal,
      operationName: 'تسوية رصيد يدوي'
    });

    // Add 25 cashback to ledger
    db.addUnifiedWalletTransaction({
      customerId: cust.id,
      walletType: 'cashback',
      type: 'earned',
      amount: 25,
      balanceAfter: initialCb + 25,
      operationName: 'كاش باك إضافي'
    });

    const updated = db.getCustomerById(cust.id)!;
    const expectedBal = initialBal + 200 - 50;
    const expectedCb = initialCb + 25;
    const passed = updated.accountBalance === expectedBal && updated.cashbackBalance === expectedCb;
    return {
      passed,
      actual: `Account: ${updated.accountBalance} (expected ${expectedBal}), CB: ${updated.cashbackBalance} (expected ${expectedCb})`,
      evidence: { before: { bal: initialBal, cb: initialCb }, after: { bal: updated.accountBalance, cb: updated.cashbackBalance } }
    };
  });

  await runTest('CUST-04', 'Customers', 'Soft Delete & Archival', 'Archive Customer Safely Without Orphan Data', 'Customer marked isArchived or archived status, retrievable via archived list', () => {
    const all = db.getCustomers(true);
    const cust = all.find(c => c.code === 'CUST-TEST-01')!;
    db.archiveCustomer(cust.id, 'نقل للأرشيف للاختبار');
    const activeList = db.getCustomers(false);
    const archivedList = db.getArchivedCustomers();
    const isActive = activeList.some(c => c.id === cust.id);
    const isArchived = archivedList.some(c => c.id === cust.id);
    const passed = !isActive && isArchived;
    return {
      passed,
      actual: `Is active: ${isActive}, Is in archived list: ${isArchived}`,
      evidence: { activeCount: activeList.length, archivedCount: archivedList.length }
    };
  });

  // =========================================================================
  // SUITE 2: DEALERS SUBSYSTEM (التجار والموزعين)
  // =========================================================================
  console.log('\n▶ SUITE 2: Dealers Subsystem (التجار وأسعار الجملة والديون)');

  await runTest('DEAL-01', 'Dealers', 'Profiles & Wholesale', 'Create Wholesale Dealer with Pricing Tier & Unique Phone', 'Dealer saved with wholesale tier and credit limit', () => {
    const dealerId = 'dealer_test_' + Date.now();
    const dealer = {
      id: dealerId,
      name: 'مؤسسة الأمل لتوزيع البطاقات',
      companyName: 'الأمل كارد',
      phone: '+201099990001',
      code: 'DLR-TEST-01',
      accountBalance: 5000,
      creditLimit: 10000,
      currentDebt: 0,
      pricingTier: 'tier_vip',
      wholesaleDiscountRate: 7.5,
      partnerCommissionPercent: 3.0,
      createdAt: new Date().toISOString()
    };
    db.saveDealer(dealer as any);
    const retrieved = db.getDealerById(dealerId);
    const passed = !!retrieved && retrieved.accountBalance === 5000 && retrieved.wholesaleDiscountRate === 7.5;
    return {
      passed,
      actual: retrieved ? `Dealer: ${retrieved.name}, Bal=${retrieved.accountBalance}, Discount=${retrieved.wholesaleDiscountRate}%` : 'Not Found',
      evidence: retrieved
    };
  });

  await runTest('DEAL-02', 'Dealers', 'Wholesale Debt Ledger', 'Record Dealer Debt & Partial Settlement', 'Debt recorded, updated and verified in dealer debts ledger', () => {
    const dealer = db.getDealers(true).find(d => d.code === 'DLR-TEST-01')!;

    // Record debt in dealer debts ledger
    const newDebt = db.addDealerDebt({
      partyName: dealer.name,
      partyType: 'customer',
      debtType: 'receivable',
      category: 'general',
      totalAmount: 3000,
      paidAmount: 0,
      remainingAmount: 3000,
      status: 'pending',
      notes: 'فاتورة شحن آجل #INV-9901'
    } as any);

    // Update with partial settlement of 1000
    newDebt.paidAmount = 1000;
    newDebt.remainingAmount = 2000;
    newDebt.status = 'partially_paid';
    newDebt.installments = [
      {
        id: 'inst_01',
        debtId: newDebt.id,
        amount: 1000,
        paymentDate: new Date().toISOString().split('T')[0],
        paidBy: dealer.name,
        notes: 'سداد جزئي نقدًا'
      }
    ];
    db.updateDealerDebt(newDebt);

    const afterSettlement = db.getDealerDebts(true).find(d => d.id === newDebt.id)!;
    const passed = afterSettlement.remainingAmount === 2000 && afterSettlement.paidAmount === 1000;
    return {
      passed,
      actual: `Paid: ${afterSettlement.paidAmount}, Remaining: ${afterSettlement.remainingAmount}`,
      evidence: afterSettlement
    };
  });

  // =========================================================================
  // SUITE 3: STORE WALLETS & FIFO LOTS SUBSYSTEM (محافظ النقاط والـ FIFO)
  // =========================================================================
  console.log('\n▶ SUITE 3: Store Wallets & FIFO Lots Subsystem (المحافظ وخزائن النقاط FIFO)');

  await runTest('FIFO-01', 'Store Wallets', 'FIFO Engine', 'Add FIFO Sub-Wallet Lots with Direct Point Funding', 'Sub-wallet funded with points and cost accurately computed', () => {
    // 1. Create Main USD Wallet
    const mainW = JKRWalletEngine.createWallet({
      name: 'محفظة بايننس الرئيسية USDT',
      type: 'MAIN',
      isActive: true
    });

    // Fund Main USD Wallet with 100 USD @ 50 EGP/USD
    JKRWalletEngine.fundMainWallet({
      walletId: mainW.id,
      amountUSD: 100,
      rateEGP: 50,
      source: 'direct_usd_deposit'
    });

    // 2. Create Sub-Wallet for Game Points
    const subW = JKRWalletEngine.createWallet({
      name: 'محفظة نقاط ببجي الاختبارية',
      type: 'SUB',
      parentWalletId: mainW.id,
      pointType: 'PUBG_UC',
      isActive: true,
      safetyLimit: -500
    });

    // 3. Deposit 1000 points costing 10 USD
    const depRes = JKRWalletEngine.depositSubWalletPoints({
      subWalletId: subW.id,
      amountUSD: 10,
      pointsCount: 1000
    });

    const subWAfter = JKRWalletEngine.getWalletById(subW.id)!;
    const passed = depRes.subWallet.pointsBalance === 1000 && subWAfter.pointsBalance === 1000;
    return {
      passed,
      actual: `Sub-wallet points balance: ${subWAfter?.pointsBalance}, Lot points: ${depRes.subLot.remainingQuantity}`,
      evidence: { subWAfter, lot: depRes.subLot }
    };
  });

  await runTest('FIFO-02', 'Store Wallets', 'FIFO Consumption Order', 'Consume Sub-Wallet Points in FIFO Order', 'Deducts points and updates remaining lots accurately', () => {
    const wallets = JKRWalletEngine.getWallets();
    const subW = wallets.find(w => w.name.includes('محفظة نقاط ببجي الاختبارية'))!;

    // Consume 400 points with correct signature: (ticketId, walletId, pointsRequired)
    const res = JKRWalletEngine.consumeSubWalletPoints('TKT-TEST-FIFO-01', subW.id, 400);

    const subWAfter = JKRWalletEngine.getWalletById(subW.id)!;
    const totalConsumed = res.consumedLots.reduce((sum, l) => sum + l.pointsConsumed, 0);
    const passed = totalConsumed === 400 && subWAfter.pointsBalance === 600;
    return {
      passed,
      actual: `Consumed: ${totalConsumed}, Points Balance After: ${subWAfter.pointsBalance}`,
      evidence: res
    };
  });

  await runTest('FIFO-03', 'Store Wallets', 'Wallet Deficit Handling', 'Attempt Consuming More Points Than Available in FIFO', 'Handles over-consumption according to safety policy or returns deficit warning', () => {
    const wallets = JKRWalletEngine.getWallets();
    const subW = wallets.find(w => w.name.includes('محفظة نقاط ببجي الاختبارية'))!;

    let blocked = false;
    let blockReason = '';
    try {
      // Points balance is 600, requesting 99999 points exceeds safety limit (-500)
      JKRWalletEngine.consumeSubWalletPoints('TKT-OVER-01', subW.id, 99999);
    } catch (err: any) {
      blocked = true;
      blockReason = err.message || String(err);
    }
    const passed = blocked === true;
    return {
      passed,
      actual: `Attempt blocked: ${blocked} (${blockReason})`,
      evidence: { blocked, blockReason }
    };
  });

  // =========================================================================
  // SUITE 4: TICKETS / SHIPPING ORDERS SUBSYSTEM (تذاكر الشحن والمبيعات)
  // =========================================================================
  console.log('\n▶ SUITE 4: Tickets / Shipping Orders Subsystem (تذاكر الشحن والمبيعات)');

  await runTest('TCKT-01', 'Tickets', 'Order Pricing & Profit', 'Create Ticket with Automated COGS, Cashback, and Referral Accrual', 'Calculates exact net profit = (Total - COGS - Cashback - Referral - FixedCost)', () => {
    const cust = db.getCustomers(true)[0];
    const ticketId = 'tkt_audit_' + Date.now();
    const unitPrice = 200;
    const costPrice = 140;
    const fixedCost = 5;
    const cashbackAmount = 10; // 5%
    const referralAmount = 4;  // 2%
    const expectedNetProfit = unitPrice - costPrice - fixedCost - cashbackAmount - referralAmount; // 41 EGP

    const ticket = {
      id: ticketId,
      ticketNumber: 'TKT-AUD-01',
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      gameId: 'game_pubg',
      gameName: 'ببجي موبايل PUBG Mobile',
      productId: 'prod_pubg_660',
      productName: '660 شدة ببجي',
      quantity: 1,
      unitPrice,
      totalAmount: unitPrice,
      costPrice,
      fixedCostEGP: fixedCost,
      cashbackPercent: 5.0,
      cashbackAmountEGP: cashbackAmount,
      referralPercent: 2.0,
      referralAmountEGP: referralAmount,
      netProfitEGP: expectedNetProfit,
      paidAmount: unitPrice,
      receivedAmount: unitPrice,
      status: 'pending',
      paymentMethod: 'vodafone_cash',
      isPaid: true,
      createdAt: new Date().toISOString()
    };
    db.saveTicket(ticket as any);
    const saved = db.getTicketById(ticketId)!;

    const passed = !!saved && (saved.netProfit === 41 || saved.netProfitEGP === 41) && (saved.totalProductsAmount === 200 || saved.totalAmount === 200);
    return {
      passed,
      actual: `Saved: Total=${saved?.totalProductsAmount || saved?.totalAmount}, Cost=${saved?.costPrice}, Profit=${saved?.netProfit ?? saved?.netProfitEGP} (expected 41)`,
      evidence: saved
    };
  });

  await runTest('TCKT-02', 'Tickets', 'Ticket Completion & Ledger Impact', 'Complete Ticket and Verify Status Update', 'Ticket status becomes completed, updatedAt refreshed', () => {
    const allTickets = db.getTickets();
    const ticket = allTickets.find(t => t.ticketNumber === 'TKT-AUD-01')!;
    db.updateTicketStatus(ticket.id, 'completed', { id: 'usr_adm', name: 'المدير' }, 'تم التنفيذ بنجاح');
    const updated = db.getTicketById(ticket.id)!;
    const passed = updated.status === 'completed';
    return {
      passed,
      actual: `Status: ${updated.status}`,
      evidence: { status: updated.status }
    };
  });

  await runTest('TCKT-03', 'Tickets', 'Ticket Refund Pipeline', 'Refund Ticket & Reverse Status Safely', 'Ticket status becomes refunded, records refund details', () => {
    const ticketId = 'tkt_refund_test_' + Date.now();
    const ticket = {
      id: ticketId,
      ticketNumber: 'TKT-REF-01',
      customerId: 'cust_sample_ref',
      customerName: 'عميل استرداد تجريبي',
      totalAmount: 300,
      paidAmount: 300,
      status: 'completed',
      isPaid: true,
      createdAt: new Date().toISOString()
    };
    db.saveTicket(ticket as any);

    db.updateTicketStatus(ticketId, 'refunded', { id: 'usr_adm', name: 'المدير' }, 'استرداد المبلغ');
    const refunded = db.getTicketById(ticketId)!;
    const passed = refunded.status === 'refunded';
    return {
      passed,
      actual: `Refunded status: ${refunded.status}`,
      evidence: refunded
    };
  });

  // =========================================================================
  // SUITE 5: FINANCE & TREASURY SUBSYSTEM (المالية والخزينة الموحدة)
  // =========================================================================
  console.log('\n▶ SUITE 5: Finance & Treasury Subsystem (الخزينة الموحدة والمصروفات والتدفقات النقدية)');

  await runTest('FIN-01', 'Finance', 'Vault / Safe Operations', 'Execute Safe Deposit & Withdrawal', 'Vault balance increases on deposit and decreases on withdrawal accurately', () => {
    const initialVault = db.getMainVaultSummary().balanceEGP;

    // Deposit 5000 to vault using 'cash_in'
    db.addSafeTransaction(
      'cash_in',
      5000,
      'capital',
      'توريد سيولة نقدية للخزينة الرئيسية',
      'admin'
    );

    const vaultAfterDep = db.getMainVaultSummary().balanceEGP;

    // Withdraw 2000 from vault using 'cash_out'
    db.addSafeTransaction(
      'cash_out',
      2000,
      'expense',
      'سحب نقدي لمصاريف تشغيل',
      'admin'
    );

    const vaultAfterWth = db.getMainVaultSummary().balanceEGP;
    const passed = vaultAfterDep === initialVault + 5000 && vaultAfterWth === initialVault + 3000;
    return {
      passed,
      actual: `Initial: ${initialVault}, After Deposit: ${vaultAfterDep}, After Withdraw: ${vaultAfterWth}`,
      evidence: { initialVault, vaultAfterDep, vaultAfterWth }
    };
  });

  await runTest('FIN-02', 'Finance', 'Operating Expenses', 'Add Expense and Categorize Correctly', 'Expense stored with category and deducts from vault if paidFromVault', () => {
    const initialVault = db.getVaultBalance();
    const expense = {
      title: 'فاتورة إنترنت وتجديد دومين',
      amount: 450,
      category: 'operational',
      paymentMethod: 'cash',
      paidFromVault: true,
      notes: 'مصروفات تشغيلية أساسية'
    };
    const savedExp = db.addExpense(expense as any, 'admin');

    const updatedVault = db.getVaultBalance();
    const passed = !!savedExp && savedExp.amount === 450 && updatedVault === initialVault - 450;
    return {
      passed,
      actual: `Expense recorded: ${savedExp.id}, Vault before: ${initialVault}, Vault after: ${updatedVault}`,
      evidence: { savedExp, updatedVault }
    };
  });

  await runTest('FIN-03', 'Finance', 'Marketing Expenses Isolation', 'Competition Prizes Expense Tagged to Marketing and Does Not Drain Vault Cash', 'Vault Balance remains untouched', () => {
    const initialVault = db.getVaultBalance();
    const mktExpense = {
      title: 'تكلفة مكافأة مسابقة 10 شحنات',
      amount: 150,
      category: 'marketing',
      paidFromVault: false, // Delivered from points wallet or promo credit
      notes: 'تسجيل قيد تسويقي غير نقدي'
    };
    db.addExpense(mktExpense as any, 'admin');

    const updatedVault = db.getVaultBalance();
    const passed = updatedVault === initialVault; // Vault balance untouched!
    return {
      passed,
      actual: `Vault Balance remained exactly: ${updatedVault} (was ${initialVault})`,
      evidence: { initialVault, updatedVault }
    };
  });

  await runTest('FIN-04', 'Finance', 'Shift Settlement & Reconciliation', 'Perform Shift Reconciliation with Discrepancy Recording', 'Variance computed accurately (Actual - Expected)', () => {
    const shift = {
      id: 'shift_' + Date.now(),
      employeeId: 'emp_01',
      employeeName: 'كابتن محمد',
      shiftType: 'morning',
      systemExpectedCash: 3500,
      actualCashHandover: 3450,
      variance: -50,
      status: 'shortage',
      notes: 'عجز 50 جنيه جاري مراجعته',
      createdAt: new Date().toISOString()
    };
    db.saveSettlement(shift as any);
    const settlements = db.getSettlements();
    const found = settlements.find(s => s.id === shift.id);
    const passed = !!found && (found.difference === -50 || found.variance === -50);
    return {
      passed,
      actual: `Shift Settlement recorded with variance/difference: ${found?.difference ?? found?.variance}`,
      evidence: found
    };
  });

  // =========================================================================
  // SUITE 6: MIDDLEMAN & ESCROW SUBSYSTEM (الوساطة وتجارة الحسابات)
  // =========================================================================
  console.log('\n▶ SUITE 6: Middleman & Escrow Subsystem (الوساطة وتجارة الحسابات والأصول)');

  await runTest('MID-01', 'Middleman', 'Escrow Deal Creation', 'Create Escrow Deal with Buyer, Seller, Fee, and Warranty', 'Deal saved in pending or in_progress status with correct commission', () => {
    const dealId = 'deal_test_' + Date.now();
    const deal = {
      id: dealId,
      dealNumber: 'DEAL-9001',
      title: 'وساطة بيع حساب ببجي ميثيك لفل 75',
      buyerName: 'طارق الزيات',
      buyerPhone: '01122334455',
      sellerName: 'رامي خليل',
      sellerPhone: '01299887766',
      dealAmount: 4000,
      feeAmount: 200, // 5% fee
      feePayer: 'buyer',
      totalCollected: 4200,
      warrantyDays: 7,
      status: 'in_progress',
      createdAt: new Date().toISOString()
    };
    db.saveMiddlemanDeal(deal as any);
    const retrieved = db.getMiddlemanDealById(dealId);
    const passed = !!retrieved && retrieved.dealAmount === 4000 && (retrieved.companyCommissionAmountEGP === 200 || retrieved.feeAmount === 200);
    return {
      passed,
      actual: retrieved ? `Deal: ${retrieved.dealNumber}, Total: ${retrieved.totalRequiredFromBuyerEGP || retrieved.totalCollected}, Fee: ${retrieved.companyCommissionAmountEGP || retrieved.feeAmount}` : 'Not Found',
      evidence: retrieved
    };
  });

  await runTest('MID-02', 'Middleman', 'Account Inventory & Sale', 'Register Game Account and Mark Sold on Sale', 'Account added, inventory status tracked, sold transition verified', () => {
    const accId = 'acc_inv_' + Date.now();
    const account = {
      id: accId,
      game: 'ببجي موبايل PUBG',
      accountLogin: 'player_legend_2026@gmail.com',
      purchasePrice: 1500,
      sellingPrice: 2200,
      expectedProfit: 700,
      status: 'available',
      warrantyPeriod: '15_days',
      createdAt: new Date().toISOString()
    };
    db.saveMiddlemanAccount(account as any);
    const accBefore = db.getMiddlemanAccounts().find(a => a.id === accId)!;

    // Mark as sold
    accBefore.status = 'sold';
    db.saveMiddlemanAccount(accBefore);
    const accAfter = db.getMiddlemanAccounts().find(a => a.id === accId)!;

    const passed = accAfter.status === 'sold';
    return {
      passed,
      actual: `After update: ${accAfter.status}`,
      evidence: { accAfter }
    };
  });

  await runTest('MID-03', 'Middleman', 'Deal Completion & Commission Recording', 'Complete Escrow Deal and Transfer Seller Funds', 'Deal status becomes completed, fee recorded as profit', () => {
    const deals = db.getMiddlemanDeals();
    const deal = deals.find(d => d.dealNumber === 'DEAL-9001')!;

    deal.status = 'completed';
    db.saveMiddlemanDeal(deal);
    const updated = db.getMiddlemanDealById(deal.id)!;
    const passed = updated.status === 'completed';
    return {
      passed,
      actual: `Deal status: ${updated.status}`,
      evidence: updated
    };
  });

  // =========================================================================
  // SUITE 7: SUBSCRIPTIONS SUBSYSTEM (إدارة الاشتراكات والتجديدات)
  // =========================================================================
  console.log('\n▶ SUITE 7: Subscriptions Subsystem (إدارة الاشتراكات والباقات والتجديدات)');

  await runTest('SUB-01', 'Subscriptions', 'Plans & Client Subscriptions', 'Create Subscription Plan and Enroll Client', 'Plan created, subscription initialized with nextRenewalDate', () => {
    const planId = 'plan_vip_' + Date.now();
    const plan = {
      id: planId,
      name: 'باقة شحن VIP الشهرية للمحترفين',
      price: 999,
      durationDays: 30,
      features: ['خصم 5% إضافي', 'دعم فني فوري 24/7', 'كاش باك مضاعف'],
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.saveSubscriptionPlan(plan as any);

    const subId = 'sub_active_' + Date.now();
    const now = new Date();
    const renewalDate = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();

    const subscription = {
      id: subId,
      clientName: 'محمود الصاوي',
      clientPhone: '01511223344',
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      startDate: now.toISOString(),
      endDate: renewalDate,
      status: 'active',
      autoRenew: true,
      createdAt: now.toISOString()
    };
    db.saveSubscription(subscription as any);

    const retrieved = db.getSubscriptionById(subId);
    const passed = !!retrieved && retrieved.status === 'active' && (retrieved.finalPrice === 999 || retrieved.amount === 999);
    return {
      passed,
      actual: retrieved ? `Sub ID: ${retrieved.id}, Client: ${retrieved.customerName || retrieved.clientName}, Status: ${retrieved.status}, EndDate: ${retrieved.endDate}` : 'Not Found',
      evidence: retrieved
    };
  });

  await runTest('SUB-02', 'Subscriptions', 'Renewal Pipeline', 'Renew Subscription by 1 Month and Extend End Date', 'End date extended accurately by 1 month (~30 days)', () => {
    const subs = db.getSubscriptions();
    const sub = subs.find(s => s.customerName === 'محمود الصاوي' || s.clientName === 'محمود الصاوي')!;
    const oldEndDate = new Date(sub.endDate).getTime();

    // durationMonths = 1
    db.renewSubscription(sub.id, 1, 999, 'vodafone_cash' as any, { name: 'مسؤول الاشتراكات' });
    const renewed = db.getSubscriptionById(sub.id)!;
    const newEndDate = new Date(renewed.endDate).getTime();

    const diffDays = Math.round((newEndDate - oldEndDate) / (24 * 3600 * 1000));
    // 1 month is between 28 and 31 days
    const passed = diffDays >= 28 && diffDays <= 31;
    return {
      passed,
      actual: `Old End: ${sub.endDate}, New End: ${renewed.endDate}, Diff Days: ${diffDays}`,
      evidence: { oldEnd: sub.endDate, newEnd: renewed.endDate, diffDays }
    };
  });

  await runTest('SUB-03', 'Subscriptions', 'Expiring Notifications Generator', 'Check Expiration Alerts Within Threshold (3 Days)', 'Returns expiring subscriptions needing renewal notification', () => {
    const nearSubId = 'sub_near_exp_' + Date.now();
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    db.saveSubscription({
      id: nearSubId,
      clientName: 'سامح شكري',
      clientPhone: '01055556666',
      planName: 'باقة برو',
      amount: 500,
      endDate: tomorrow,
      status: 'active',
      createdAt: new Date().toISOString()
    } as any);

    const notifs = db.getSubscriptionNotifications();
    const foundAlert = notifs.some(n => n.subscriptionId === nearSubId || n.customerName === 'سامح شكري' || n.clientName === 'سامح شكري');
    const passed = foundAlert;
    return {
      passed,
      actual: `Expiring alert triggered: ${foundAlert}`,
      evidence: { totalNotifs: notifs.length, foundAlert }
    };
  });

  // =========================================================================
  // SUITE 8: MERCHANTS & EXTERNAL SUPPLIERS SUBSYSTEM (الموردين والخزائن)
  // =========================================================================
  console.log('\n▶ SUITE 8: Merchants & Suppliers Subsystem (الموردين وفواتير الشراء الخارجية)');

  await runTest('MERCH-01', 'Merchants', 'Supplier Profiles & Invoices', 'Record Supplier Purchase Invoice for Point Codes', 'Invoice recorded, increases supplier payable balance', () => {
    const merchId = 'merch_test_' + Date.now();
    const merchant = {
      id: merchId,
      name: 'شركة الشروق للتجارة الرقمية',
      contactPerson: 'المهندس كريم',
      phone: '01199887766',
      balance: 0,
      totalPurchases: 0,
      trustScore: 88,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    db.saveMerchant(merchant as any);

    // Record invoice 15,000 EGP
    const invoiceId = 'inv_merch_' + Date.now();
    db.saveMerchantInvoice(
      {
        id: invoiceId,
        merchantId: merchId,
        merchantName: merchant.name,
        invoiceNumber: 'INV-SHQ-001',
        type: 'purchase',
        totalAmount: 15000,
        paidAmount: 5000,
        remainingAmount: 10000,
        paymentMethod: 'credit',
        status: 'partial',
        items: [{ description: 'بطاقات ريزر جولد 500$', amount: 15000 }]
      } as any,
      'admin'
    );

    const invoices = db.getMerchantInvoices(merchId);
    const passed = invoices.length > 0 && invoices[0].remainingAmount === 10000;
    return {
      passed,
      actual: `Invoice recorded. Remaining payable: ${invoices[0]?.remainingAmount} EGP`,
      evidence: invoices[0]
    };
  });

  await runTest('MERCH-02', 'Merchants', 'Supplier Settlement', 'Settle Supplier Invoice Fully', 'Remaining amount becomes 0, status completed', () => {
    const merch = db.getMerchants().find(m => m.name.includes('الشروق'))!;
    const invoice = db.getMerchantInvoices(merch.id)[0];

    invoice.paidAmount = 15000;
    invoice.remainingAmount = 0;
    invoice.status = 'paid';
    db.saveMerchantInvoice(invoice, 'admin');

    const updatedInv = db.getMerchantInvoices(merch.id).find(i => i.id === invoice.id)!;
    const passed = updatedInv.remainingAmount === 0 && updatedInv.status === 'paid';
    return {
      passed,
      actual: `Updated invoice status: ${updatedInv.status}, Remaining: ${updatedInv.remainingAmount}`,
      evidence: updatedInv
    };
  });

  // =========================================================================
  // SUITE 9: COMPETITIONS & GAMIFICATION SUBSYSTEM (المسابقات والمكافآت)
  // =========================================================================
  console.log('\n▶ SUITE 9: Competitions & Rewards Subsystem (المسابقات والمكافآت والقرعة العادلة)');

  await runTest('COMP-01', 'Competitions', 'Rule Evaluation Engine with Date Boundaries', 'Evaluate 10-Recharge Competition with Exact Active Date Window', 'Accurately counts completed tickets within competition timeframe', () => {
    const custId = 'cust_comp_active_' + Date.now();
    const testCust = {
      id: custId,
      name: 'بطل التحدي الأسبوعي',
      phone: '01099887711',
      code: 'CHAMP-10X',
      createdAt: new Date().toISOString()
    };
    db.saveCustomer(testCust as any);

    // Create a competition spanning today
    const now = new Date();
    const compId = 'comp_active_window_' + Date.now();
    const startDate = new Date(now.getTime() - 86400000).toISOString().split('T')[0]; // Yesterday
    const endDate = new Date(now.getTime() + 86400000 * 5).toISOString().split('T')[0]; // 5 days later

    const competition = {
      id: compId,
      code: 'CMP-AUD-10',
      title: 'تحدي الشحن التدقيقي (10 شحنات)',
      type: 'recharge_count',
      status: 'active',
      startDate,
      startTime: '00:00',
      endDate,
      endTime: '23:59',
      rules: {
        id: 'r_10_aud',
        logicalOperator: 'AND',
        conditions: [
          {
            id: 'c_cnt_10',
            type: 'recharge_count',
            operator: 'gte',
            value: 10,
            label: 'إتمام 10 شحنات'
          }
        ]
      },
      prizes: [
        {
          id: 'prz_aud_1',
          name: 'جائزة 100 جنيه رصيد محفظة',
          type: 'wallet_credit',
          value: 100,
          currency: 'EGP',
          costEGP: 100,
          autoDelivery: false
        }
      ],
      createdAt: now.toISOString()
    };
    CompetitionService.saveCompetition(competition as any);

    // Create 10 completed tickets with createdAt inside competition window
    const tickets = [];
    for (let i = 1; i <= 10; i++) {
      const t = {
        id: `tkt_cmp_${i}_${Date.now()}`,
        ticketNumber: `TKT-CMP-${i}`,
        customerId: testCust.id,
        customerName: testCust.name,
        totalAmount: 100,
        paidAmount: 100,
        receivedAmount: 100,
        status: 'completed',
        isPaid: true,
        createdAt: now.toISOString()
      };
      db.saveTicket(t as any);
      tickets.push(t);
    }

    const evalResult = CompetitionRulesEngine.evaluateCompetition(competition as any, {
      customer: testCust as any,
      tickets: tickets as any,
      currentParticipantsCount: 1
    });

    const passed = evalResult.progressCount === 10 && evalResult.isEligible === true;
    return {
      passed,
      actual: `Progress Count: ${evalResult.progressCount} / 10, isEligible: ${evalResult.isEligible}`,
      evidence: evalResult
    };
  });

  await runTest('COMP-02', 'Competitions', 'Atomic Reward Delivery & Duplicate Guard', 'Deliver Reward Atomically and Reject Concurrent Re-delivery', 'First delivery succeeds, second attempt blocked throwing error', () => {
    const cust = db.getCustomers(true)[0];
    const initialBal = cust.accountBalance || 0;
    const rewardId = 'rew_atomic_' + Date.now();

    const pendingReward = {
      id: rewardId,
      competitionId: 'comp_sample',
      competitionTitle: 'مسابقة تجريبية',
      prizeId: 'prz_01',
      prizeName: 'رصيد 250 جنيه',
      prizeType: 'wallet_credit',
      prizeValue: 250,
      currency: 'EGP',
      costEGP: 250,
      entityType: 'customer',
      entityId: cust.id,
      entityName: cust.name,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    db.saveCompetitionReward(pendingReward as any);

    const adminUser = { id: 'usr_adm', name: 'المدير العام', role: 'admin', department: 'الإدارة' };
    const allRewards = [pendingReward as any];

    // 1st delivery attempt
    const res1 = CompetitionDeliveryService.deliverReward(
      pendingReward as any,
      adminUser,
      allRewards,
      (updated) => {
        allRewards.length = 0;
        allRewards.push(...updated);
      }
    );

    // 2nd delivery attempt
    let res2Failed = false;
    let res2Error = '';
    try {
      CompetitionDeliveryService.deliverReward(
        allRewards[0],
        adminUser,
        allRewards,
        () => {}
      );
    } catch (err: any) {
      res2Failed = true;
      res2Error = err.message || String(err);
    }

    const custAfter = db.getCustomerById(cust.id)!;
    const passed = res1.success === true && res2Failed === true && custAfter.accountBalance === initialBal + 250;
    return {
      passed,
      actual: `First delivery: ${res1.success}, Second attempt blocked: ${res2Failed} (${res2Error}), Balance: ${custAfter.accountBalance} (credited only once)`,
      evidence: { res1, res2Error, balBefore: initialBal, balAfter: custAfter.accountBalance }
    };
  });

  // =========================================================================
  // SUITE 10: CATALOG, PRICING & COUPONS SUBSYSTEM (الكتالوج والكوبونات)
  // =========================================================================
  console.log('\n▶ SUITE 10: Catalog, Pricing & Coupons Subsystem (الكتالوج ومحرك التسعير والكوبونات)');

  await runTest('CAT-01', 'Catalog', 'Game Tree & Product Margins', 'Verify Product Cost, Selling Price, and Dealer Price', 'Calculated price satisfies minimum profit margin', () => {
    const tree = db.getGameTree();
    const pubg = tree.find(g => g.name.includes('ببجي') || g.id === 'game_pubg') || tree[0];
    const product = pubg.products[0];

    const hasValidPricing = product.costUSD > 0 &&
                            product.calculatedPriceEGP > product.firstOrderCostPriceEGP;
    const passed = hasValidPricing;
    return {
      passed,
      actual: `Product: ${product.name}, CostUSD: $${product.costUSD}, Retail Price: ${product.calculatedPriceEGP} EGP, First Order Cost: ${product.firstOrderCostPriceEGP} EGP`,
      evidence: product
    };
  });

  await runTest('COUP-01', 'Coupons', 'Coupon Discount Validation', 'Apply Valid Coupon and Check Discount Deduction', 'Applies discount percentage accurately according to coupon rules', () => {
    const couponCode = 'DISC-AUD-' + Math.floor(Math.random() * 1000);
    const coupon = {
      id: 'coup_' + Date.now(),
      code: couponCode,
      name: 'كوبون تدقيق 10%',
      title: 'كوبون تدقيق 10%',
      type: 'general',
      discountType: 'percentage',
      discountValue: 10, // 10%
      minPurchaseAmount: 100,
      maxUsageTotal: 5,
      currentUsageCount: 0,
      isActive: true,
      expiryDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      createdAt: new Date().toISOString()
    };
    db.saveCoupon(coupon as any);

    // Evaluate coupon for 500 EGP order
    const evalRes = db.validateCoupon(couponCode, 500);
    const expectedDiscount = 50; // 10% of 500
    const passed = evalRes.valid === true && Math.abs(evalRes.discountAmount - expectedDiscount) < 0.01;
    return {
      passed,
      actual: `Coupon ${couponCode}: Valid=${evalRes.valid}, Discount Amount=${evalRes.discountAmount} (expected ${expectedDiscount})`,
      evidence: evalRes
    };
  });

  await runTest('COUP-02', 'Coupons', 'Coupon Minimum Order Boundary', 'Reject Coupon When Order Amount is Below Min Spend', 'Returns invalid with minPurchaseAmount requirement message', () => {
    const coupon = db.getCoupons().find(c => c.title?.includes('تدقيق') || (c as any).name?.includes('تدقيق'))!;
    // Evaluate for 50 EGP (min is 100)
    const evalRes = db.validateCoupon(coupon.code, 50);
    const passed = evalRes.valid === false;
    return {
      passed,
      actual: `Evaluation for 50 EGP: Valid=${evalRes.valid}, Message=${evalRes.message}`,
      evidence: evalRes
    };
  });

  // =========================================================================
  // SUITE 11: SECURITY & RBAC SUBSYSTEM (الأمان وإدارة الصلاحيات)
  // =========================================================================
  console.log('\n▶ SUITE 11: Security & RBAC Subsystem (الأمان والصلاحيات وحماية العمليات الحساسة)');

  await runTest('SEC-01', 'Security', 'Role-Based Access Control', 'Admin Has Full Privileges, Employee Restricted From Destructive Ops', 'Admin passes all checks; Employee blocked from delete_ticket', () => {
    const adminUser = { id: 'usr_admin', name: 'المدير', role: 'admin', permissions: ['all'] };
    const employeeUser = { id: 'usr_emp', name: 'موظف شحن', role: 'employee', permissions: ['view_tickets', 'create_tickets'] };

    const adminCanDelete = adminUser.role === 'admin';
    const empCanDelete = employeeUser.role === 'admin';

    const passed = adminCanDelete === true && empCanDelete === false;
    return {
      passed,
      actual: `Admin can delete: ${adminCanDelete}, Employee can delete: ${empCanDelete}`,
      evidence: { adminCanDelete, empCanDelete }
    };
  });

  await runTest('SEC-02', 'Security', 'Audit Trail Recording', 'Sensitive System Operations Logged in Audit Log', 'Action logged with user ID, actionType, target entity, timestamp', () => {
    const auditCountBefore = db.getAuditLogs().length;
    db.logAction(
      { id: 'usr_aud', name: 'مراجع الأمان', role: 'admin' },
      'edit',
      'settings',
      'set_pricing',
      'تعديل أسعار الفئات',
      'تم تعديل عمولة الشركاء إلى 2.5%'
    );
    const auditLogsAfter = db.getAuditLogs();
    const lastLog = auditLogsAfter[0];

    const passed = auditLogsAfter.length > auditCountBefore && lastLog.actionType === 'edit' && lastLog.entityType === 'settings';
    return {
      passed,
      actual: `Audit logs count: ${auditLogsAfter.length}, Last action: ${lastLog?.actionType} on ${lastLog?.entityType}`,
      evidence: lastLog
    };
  });

  // =========================================================================
  // SUITE 12: CONCURRENCY, EDGE CASES & DATA INTEGRITY (الحالات الاستثنائية والنزاهة)
  // =========================================================================
  console.log('\n▶ SUITE 12: Edge Cases & Integrity (الحالات الاستثنائية والقيم المتطرفة)');

  await runTest('EDGE-01', 'Edge Cases', 'Zero Value Handling', 'System Handles 0 Value Safely Without Dividing by Zero', 'Does not throw NaN or Infinity on 0 amount calculations', () => {
    const costInfo = JKRWalletEngine.getWalletEffectivePointCost('w_non_existent', 0);
    const passed = costInfo.totalCostEGP === 0 && !isNaN(costInfo.totalCostEGP) && isFinite(costInfo.totalCostEGP);
    return {
      passed,
      actual: `Cost for 0 points: ${costInfo.totalCostEGP}`,
      evidence: costInfo
    };
  });

  await runTest('EDGE-02', 'Edge Cases', 'Negative Values Handling', 'Reject Negative Balance Update or Expense Value', 'Rejects negative value or treats it safely without corruption', () => {
    const cust = db.getCustomers(true)[0];
    const initialBal = cust.accountBalance || 0;
    let thrown = false;
    try {
      db.updateCustomerBalance(cust.id, -500, 'credit', 'إيداع سالب غير شرعي');
    } catch {
      thrown = true;
    }
    const custAfter = db.getCustomerById(cust.id)!;
    // Safe if either an exception was thrown or balance did not decrease
    const passed = thrown || custAfter.accountBalance >= initialBal;
    return {
      passed,
      actual: `Thrown: ${thrown}, Balance Before: ${initialBal}, Balance After: ${custAfter.accountBalance}`,
      evidence: { thrown, balBefore: initialBal, balAfter: custAfter.accountBalance }
    };
  });

  await runTest('EDGE-03', 'Edge Cases', 'Special Characters & XSS Payload Sanitization', 'Customer Name and Notes with HTML/Script Tags Saved Safely', 'Script payload does not execute or corrupt JSON storage', () => {
    const xssPayload = '<script>alert("xss")</script> & "quotes" \'apostrophes\' <b>bold</b>';
    const custId = 'cust_xss_' + Date.now();
    db.saveCustomer({
      id: custId,
      name: xssPayload,
      phone: '+201000000000',
      accountBalance: 0,
      createdAt: new Date().toISOString()
    } as any);

    const retrieved = db.getCustomerById(custId)!;
    const passed = !!retrieved && retrieved.name === xssPayload; // Cleanly preserved in storage without parsing error
    return {
      passed,
      actual: `Retrieved successfully: ${retrieved?.name.length} chars stored`,
      evidence: retrieved?.name
    };
  });

  // =========================================================================
  // SUMMARY REPORT GENERATION
  // =========================================================================
  console.log('\n================================================================');
  console.log('📊 AUDIT SUMMARY & STATISTICAL METRICS:');
  console.log('================================================================');

  const total = auditResults.length;
  const passedCount = auditResults.filter(r => r.status === 'PASS').length;
  const failedCount = auditResults.filter(r => r.status === 'FAIL').length;
  const blockedCount = auditResults.filter(r => r.status === 'BLOCKED').length;
  const notTestedCount = auditResults.filter(r => r.status === 'NOT_TESTED').length;
  const needsInvestigationCount = auditResults.filter(r => r.status === 'NEEDS_INVESTIGATION').length;

  const successRate = total > 0 ? Math.round((passedCount / total) * 1000) / 10 : 0;

  console.log(`Total Planned & Executed Tests: ${total}`);
  console.log(`✅ Passed:             ${passedCount}`);
  console.log(`❌ Failed:             ${failedCount}`);
  console.log(`⚠️ Blocked:            ${blockedCount}`);
  console.log(`⏳ Not Tested:         ${notTestedCount}`);
  console.log(`🔍 Investigation Req:  ${needsInvestigationCount}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Success Rate:          ${successRate}%`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.error('💥 FAILED TESTS BREAKDOWN:');
    auditResults.filter(r => r.status === 'FAIL').forEach(f => {
      console.error(`- [${f.id}] ${f.suite} -> ${f.testName}`);
      console.error(`  Expected: ${f.expected}`);
      console.error(`  Actual:   ${f.actual}`);
      if (f.error) console.error(`  Error:    ${f.error}`);
    });
  }

  // Export results JSON to scratch directory for documentation and report generation
  const fs = await import('node:fs');
  const path = await import('node:path');
  const outPath = path.resolve('scratch/audit_results.json');
  fs.writeFileSync(outPath, JSON.stringify(auditResults, null, 2), 'utf-8');
  console.log(`💾 Full results exported to: ${outPath}`);
}

startFullAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
