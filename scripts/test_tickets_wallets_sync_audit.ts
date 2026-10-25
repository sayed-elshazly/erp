// Mock localStorage and window for Node environment before importing any ERP modules
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

// Dynamic import
async function main() {
  const { db } = await import('../src/database/db');
  const { JKRWalletEngine } = await import('../src/services/financial/jkrWalletEngine');

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`❌ Assertion Failed: ${msg}`);
    }
  }

  console.log('========================================================================');
  console.log('🧪 TICKETS ⇄ WALLETS FINANCIAL RECONCILIATION AUDIT SUITE');
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

  // -------------------------------------------------------------
  // Test 1: Ticket Edit - Cashback Change Persistence
  // -------------------------------------------------------------
  await test('Ticket Edit updates and persists customer.cashbackBalance correctly', async () => {
    const custId = 'cust_sync_test_' + Date.now();
    db.saveCustomer({
      id: custId,
      name: 'عميل اختبار التعديل',
      phone: '01000000099',
      balance: 0,
      accountBalance: 0,
      cashbackBalance: 10,
      totalCashbackEarned: 10,
      totalSpent: 1000,
      totalOrders: 1,
      createdAt: new Date().toISOString()
    } as any);

    const ticketId = 'tkt_cb_sync_' + Date.now();
    const ticketNumber = 'TKT-CB-99';
    const oldTicket: any = {
      id: ticketId,
      ticketNumber,
      customerId: custId,
      customerName: 'عميل اختبار التعديل',
      customerPhone: '01000000099',
      status: 'completed',
      requiredAmount: 500,
      receivedAmount: 500,
      cashbackEarned: 10,
      cashbackSynced: true,
      profitSynced: true,
      netProfit: 50,
      paymentWalletId: 'w_voda',
      paymentWallet: 'فودافون كاش',
      createdAt: new Date().toISOString(),
      items: [{
        productId: 'prod_test',
        productName: 'منتج تجريبي',
        gameName: 'لعبة تجريبية',
        unitPrice: 500,
        quantity: 1,
        totalPrice: 500,
        consumedPoints: 0
      }]
    };
    db.saveTicket(oldTicket);

    db.addUnifiedWalletTransaction({
      customerId: custId,
      walletType: 'cashback',
      type: 'earned',
      amount: 10,
      balanceAfter: 10,
      orderNumber: ticketNumber
    });

    const updatedTicket: any = {
      ...oldTicket,
      cashbackEarned: 25
    };

    const res = db.reconcileTicketEdit(oldTicket, updatedTicket);
    assert(res.success, 'reconcileTicketEdit should return success');

    const freshCust = db.getCustomerById(custId);
    assert(freshCust !== undefined, 'Customer must exist');
    assert(freshCust!.cashbackBalance === 25, `Expected customer cashbackBalance to be 25, got ${freshCust?.cashbackBalance}`);
  });

  // -------------------------------------------------------------
  // Test 2: Ticket Status Cancel from Pending -> Full Rollback
  // -------------------------------------------------------------
  await test('Canceling a pending ticket rolls back store wallet cash, stock & debts', async () => {
    const wallets = db.getStoreWallets();
    const opWallet = wallets.find(w => w.type === 'operating') || wallets[0];
    const initialWalletBalance = opWallet.balance;

    const custId = 'cust_cancel_test_' + Date.now();
    db.saveCustomer({
      id: custId,
      name: 'عميل اختبار الإلغاء',
      phone: '01000000088',
      balance: -50,
      accountBalance: -50,
      cashbackBalance: 0,
      totalSpent: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString()
    } as any);

    const ticketId = 'tkt_cancel_sync_' + Date.now();
    const ticketNumber = 'TKT-CNC-88';
    const pendingTicket: any = {
      id: ticketId,
      ticketNumber,
      customerId: custId,
      customerName: 'عميل اختبار الإلغاء',
      customerPhone: '01000000088',
      status: 'pending',
      requiredAmount: 200,
      receivedAmount: 150,
      shortageAmount: 50,
      paymentWalletId: opWallet.id,
      paymentWallet: opWallet.name,
      stockDeducted: true,
      items: [{
        productId: 'prod_test',
        productName: 'منتج تجريبي',
        quantity: 1,
        consumedPoints: 100,
        consumedWalletId: 'w_jkr_points'
      }],
      createdAt: new Date().toISOString()
    };
    db.saveTicket(pendingTicket);

    const pref = opWallet.numbers?.find(n => n.isPrimary) || opWallet.numbers?.[0];
    opWallet.balance += 150;
    if (pref) pref.currentBalance = (pref.currentBalance || 0) + 150;
    db.saveStoreWallet(opWallet);

    const updateRes = db.updateTicketStatus(ticketId, 'canceled', { name: 'المسؤول' });
    assert(updateRes.success, 'Status update to canceled should succeed');

    const freshWallets = db.getStoreWallets();
    const freshOpWallet = freshWallets.find(w => w.id === opWallet.id)!;
    assert(freshOpWallet.balance === initialWalletBalance, `Store wallet balance should revert to ${initialWalletBalance}, got ${freshOpWallet.balance}`);

    const freshCust = db.getCustomerById(custId)!;
    assert(freshCust.accountBalance === 0, `Customer shortage debt should be cleared to 0, got ${freshCust.accountBalance}`);
  });

  // -------------------------------------------------------------
  // Test 3: Ticket Edit Status to Canceled via reconcileTicketEdit
  // -------------------------------------------------------------
  await test('reconcileTicketEdit with status=canceled reverses cash & decrements totalSpent', async () => {
    const wallets = db.getStoreWallets();
    const opWallet = wallets.find(w => w.type === 'operating') || wallets[0];
    const initialWalletBalance = opWallet.balance;

    const custId = 'cust_edit_cancel_' + Date.now();
    db.saveCustomer({
      id: custId,
      name: 'عميل إلغاء بالتعديل',
      phone: '01000000077',
      balance: 0,
      accountBalance: 0,
      cashbackBalance: 15,
      totalSpent: 400,
      totalOrders: 1,
      createdAt: new Date().toISOString()
    } as any);

    const ticketId = 'tkt_edit_cnc_' + Date.now();
    const ticketNumber = 'TKT-ED-CNC-77';
    const oldTicket: any = {
      id: ticketId,
      ticketNumber,
      customerId: custId,
      customerName: 'عميل إلغاء بالتعديل',
      customerPhone: '01000000077',
      status: 'completed',
      requiredAmount: 400,
      receivedAmount: 400,
      cashbackEarned: 15,
      cashbackSynced: true,
      paymentWalletId: opWallet.id,
      paymentWallet: opWallet.name,
      createdAt: new Date().toISOString()
    };
    db.saveTicket(oldTicket);

    const pref = opWallet.numbers?.find(n => n.isPrimary) || opWallet.numbers?.[0];
    opWallet.balance += 400;
    if (pref) pref.currentBalance = (pref.currentBalance || 0) + 400;
    db.saveStoreWallet(opWallet);

    const updatedTicket: any = {
      ...oldTicket,
      status: 'canceled'
    };

    db.reconcileTicketEdit(oldTicket, updatedTicket);

    const freshOpWallet = db.getStoreWallets().find(w => w.id === opWallet.id)!;
    assert(freshOpWallet.balance === initialWalletBalance, `Store wallet cash should be reverted on cancel. Expected ${initialWalletBalance}, got ${freshOpWallet.balance}`);

    const freshCust = db.getCustomerById(custId)!;
    assert(freshCust.totalSpent === 0, `Customer totalSpent should be 0, got ${freshCust.totalSpent}`);
    assert(freshCust.totalOrders === 0, `Customer totalOrders should be 0, got ${freshCust.totalOrders}`);
  });

  // -------------------------------------------------------------
  // Test 4: Full Refund clears shortage and updates system wallets
  // -------------------------------------------------------------
  await test('refundTicket clears customer shortage debt & triggers system wallets recalculation', async () => {
    const wallets = db.getStoreWallets();
    const opWallet = wallets.find(w => w.type === 'operating') || wallets[0];
    opWallet.balance += 500;
    db.saveStoreWallet(opWallet);

    const custId = 'cust_refund_shortage_' + Date.now();
    db.saveCustomer({
      id: custId,
      name: 'عميل استرداد بعجز',
      phone: '01000000066',
      balance: -100,
      accountBalance: -100,
      cashbackBalance: 20,
      totalSpent: 400,
      totalOrders: 1,
      createdAt: new Date().toISOString()
    } as any);

    const ticketId = 'tkt_ref_short_' + Date.now();
    const ticketNumber = 'TKT-REF-SHORT-66';
    const ticket: any = {
      id: ticketId,
      ticketNumber,
      customerId: custId,
      customerName: 'عميل استرداد بعجز',
      customerPhone: '01000000066',
      status: 'completed',
      requiredAmount: 400,
      receivedAmount: 300,
      shortageAmount: 100,
      cashbackEarned: 20,
      netProfit: 50,
      paymentWalletId: opWallet.id,
      paymentWallet: opWallet.name,
      createdAt: new Date().toISOString()
    };
    db.saveTicket(ticket);

    const refundRes = db.refundTicket(ticketId, opWallet.id, 'استرداد كامل للتجربة', undefined, undefined, 300);
    assert(refundRes.success, 'Refund must succeed');

    const freshCust = db.getCustomerById(custId)!;
    assert(freshCust.accountBalance === 0, `Shortage debt should be forgiven on full refund. Expected 0, got ${freshCust.accountBalance}`);
    assert(freshCust.cashbackBalance === 0, `Cashback should be reverted on full refund. Expected 0, got ${freshCust.cashbackBalance}`);

    const freshTicket = db.getTicketById(ticketId)!;
    assert(freshTicket.status === 'refunded', `Ticket status should be refunded, got ${freshTicket.status}`);
  });

  // -------------------------------------------------------------
  // Test 5: restoreTicket restores referral commission & debt
  // -------------------------------------------------------------
  await test('restoreTicket restores referral commission and shortage debt', async () => {
    const referrerId = 'ref_user_' + Date.now();
    db.saveCustomer({
      id: referrerId,
      name: 'المحيل شريك النجاح',
      phone: '01000000055',
      referralCode: 'REF55',
      referralWalletBalance: 50,
      totalReferralCommissionEarned: 50,
      createdAt: new Date().toISOString()
    } as any);

    const custId = 'cust_referred_' + Date.now();
    db.saveCustomer({
      id: custId,
      name: 'العميل المحال',
      phone: '01000000056',
      referredByCode: 'REF55',
      referrerId: referrerId,
      balance: -100,
      accountBalance: -100,
      createdAt: new Date().toISOString()
    } as any);

    const ticketId = 'tkt_restore_ref_' + Date.now();
    const ticketNumber = 'TKT-REST-55';
    const ticket: any = {
      id: ticketId,
      ticketNumber,
      customerId: custId,
      customerName: 'العميل المحال',
      customerPhone: '01000000056',
      status: 'completed',
      requiredAmount: 500,
      receivedAmount: 400,
      shortageAmount: 100,
      referralCommissionEarned: 25,
      paymentWalletId: 'w_voda',
      paymentWallet: 'فودافون كاش',
      createdAt: new Date().toISOString()
    };
    db.saveTicket(ticket);

    db.addUnifiedWalletTransaction({
      customerId: referrerId,
      walletType: 'referral',
      type: 'credit',
      amount: 25,
      balanceAfter: 25,
      operationName: 'رصيد إحالة سابق معتمد'
    });

    db.addUnifiedWalletTransaction({
      customerId: referrerId,
      walletType: 'referral',
      type: 'commission',
      amount: 25,
      balanceAfter: 50,
      orderNumber: ticketNumber
    });

    // 1. Delete ticket -> referral debited
    db.deleteTicket(ticketId, { name: 'المسؤول' });
    let freshReferrer = db.getCustomerById(referrerId)!;
    assert(freshReferrer.referralWalletBalance === 25, `Referrer should lose 25 on delete, expected 25, got ${freshReferrer.referralWalletBalance}`);

    // 2. Restore ticket -> referral commission and customer shortage must be restored
    const restoreRes = db.restoreTicket(ticketId, { name: 'المسؤول' });
    assert(restoreRes.success, 'restoreTicket must succeed');

    freshReferrer = db.getCustomerById(referrerId)!;
    assert(freshReferrer.referralWalletBalance === 50, `Referrer should get 25 back on restore, expected 50, got ${freshReferrer.referralWalletBalance}`);

    const freshCust = db.getCustomerById(custId)!;
    assert(freshCust.accountBalance === -100, `Customer shortage debt should be restored to -100, got ${freshCust.accountBalance}`);
  });

  // -------------------------------------------------------------
  // Test 6: Dealer Ticket Isolation & mw_* Wallets Sync
  // -------------------------------------------------------------
  await test('Dealer Ticket operations route to mw_* wallets and update dealer profile exclusively', async () => {
    const initialMwBal = db.getDealerWallets().find(w => w.id === 'mw_cashback')?.balance || 0;
    const dealerId = 'dealer_sync_' + Date.now();
    db.saveDealer({
      id: dealerId,
      name: 'تاجر جملة معتمد',
      phone: '01000000044',
      balance: 0,
      accountBalance: 0,
      cashbackBalance: 0,
      totalSpent: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString()
    } as any);

    const ticketId = 'tkt_dealer_sync_' + Date.now();
    const ticketNumber = 'TKT-DLR-44';
    const dealerTicket: any = {
      id: ticketId,
      ticketNumber,
      customerId: dealerId,
      customerName: 'تاجر جملة معتمد',
      customerPhone: '01000000044',
      department: 'dealers',
      status: 'completed',
      requiredAmount: 1000,
      receivedAmount: 1000,
      cashbackEarned: 50,
      netProfit: 100,
      paymentWalletId: 'w_voda',
      paymentWallet: 'فودافون كاش',
      createdAt: new Date().toISOString()
    };
    db.saveDealerTicket(dealerTicket);

    const d = db.getDealerById(dealerId)!;
    d.cashbackBalance = 50;
    db.saveDealer(d);

    const updatedTicket: any = {
      ...dealerTicket,
      cashbackEarned: 80
    };
    db.reconcileTicketEdit(dealerTicket, updatedTicket);

    const freshDealer = db.getDealerById(dealerId)!;
    assert(freshDealer.cashbackBalance === 80, `Dealer cashback balance should be updated to 80, got ${freshDealer.cashbackBalance}`);

    const dealerWallets = db.getDealerWallets();
    const mwCashback = dealerWallets.find(w => w.id === 'mw_cashback')!;
    assert(mwCashback.balance === initialMwBal + 80, `mw_cashback should reflect ${initialMwBal + 80}, got ${mwCashback.balance}`);
  });

  console.log('\n========================================================================');
  console.log(`🏁 AUDIT RESULTS: ${passed}/${total} passed`);
  console.log('========================================================================\n');

  if (passed < total) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
