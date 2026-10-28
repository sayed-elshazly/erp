class MockLocalStorage {
  private store: Map<string, string> = new Map();
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
  removeItem(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }
  get length(): number { return this.store.size; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
}
(globalThis as any).localStorage = new MockLocalStorage();
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = { dispatchEvent: () => {}, CustomEvent: class {}, Event: class {} };
}

async function main() {
  const { db } = await import('../src/database/db');

  const walletBal = (id: string) => db.getStoreWallets().find(w => w.id === id)?.balance ?? NaN;
  const ledger = (walletId: string, ticketNumber: string) =>
    db.getStoreWalletTransactions().filter(t => t.walletId === walletId && JSON.stringify(t).includes(ticketNumber));

  const stamp = Date.now().toString().slice(-6);
  const refCode = 'REFTEST' + stamp;
  const referrerId = 'cust_referrer_' + stamp;
  const referredId = 'cust_referred_' + stamp;
  const ticketNumber = 'JKR-T-' + stamp;
  const ticketId = 'tkt_' + stamp;

  db.saveCustomer({
    id: referrerId, name: 'حسن المحيل', phone: '0105' + stamp + '1', referralCode: refCode,
    balance: 0, accountBalance: 0, cashbackBalance: 0, referralWalletBalance: 0, createdAt: new Date().toISOString()
  } as any);
  db.saveCustomer({
    id: referredId, name: 'اختبار المحال', phone: '0105' + stamp + '2',
    balance: 0, accountBalance: 0, cashbackBalance: 0, createdAt: new Date().toISOString()
  } as any);
  const link = db.linkCustomerReferral(referredId, refCode);
  console.log('link referral:', link.success, link.message);

  const walletInfo = (id: string) => {
    const w: any = db.getStoreWallets().find(x => x.id === id);
    return { bal: w?.balance ?? 0, rec: w?.totalReceived ?? 0, wd: w?.totalWithdrawn ?? 0 };
  };
  const profBefore = walletInfo('w_profits');
  const opexBefore = walletInfo('w_operating_expenses');
  const cbBefore = walletBal('w_cashback');
  const refBefore = walletBal('w_referrals');

  db.saveTicket({
    id: ticketId, ticketNumber, customerId: referredId, customerName: 'اختبار المحال', customerPhone: '0105' + stamp + '2',
    status: 'pending', requiredAmount: 520, receivedAmount: 520, paymentWalletId: 'w_voda', paymentWallet: 'فودافون كاش',
    createdAt: new Date().toISOString(), cashbackPercent: 1, referralPercent: 1, netProfit: 50, totalProfitMargin: 50, fixedCostAmount: 10,
    items: [{ productId: 'prod_t', productName: 'منتج', gameName: 'لعبة', unitPrice: 520, quantity: 1, totalPrice: 520, consumedPoints: 0 }]
  } as any);

  const res = db.updateTicketStatus(ticketId, 'completed', { fullName: 'tester', role: 'owner' });
  console.log('complete:', res);

  const referrerAfterComplete = db.getCustomerById(referrerId)!;
  const referredAfterComplete = db.getCustomerById(referredId)!;
  const referredCbMid = referredAfterComplete.cashbackBalance || 0;
  const referrerRefMid = referrerAfterComplete.referralWalletBalance || 0;
  const profMid = walletInfo('w_profits');
  const opexMid = walletInfo('w_operating_expenses');
  const profLedgerMid = ledger('w_profits', ticketNumber).length;
  const opexLedgerMid = ledger('w_operating_expenses', ticketNumber).length;
  console.log('profit wallet', JSON.stringify(profBefore), '->', JSON.stringify(profMid), 'ledger rows:', profLedgerMid);
  console.log('opex wallet', JSON.stringify(opexBefore), '->', JSON.stringify(opexMid), 'ledger rows:', opexLedgerMid);
  const cbMid = walletBal('w_cashback');
  const refMid = walletBal('w_referrals');
  console.log('\n--- بعد الإكمال ---');
  console.log('cashback wallet', cbBefore, '->', cbMid, '| referred.cashbackBalance =', referredAfterComplete.cashbackBalance);
  console.log('referral wallet', refBefore, '->', refMid, '| referrer.referralWalletBalance =', referrerAfterComplete.referralWalletBalance);
  console.log('cashback ledger:', JSON.stringify(ledger('w_cashback', ticketNumber).map(t => [t.type, t.amount, t.balanceBefore, t.balanceAfter])));
  console.log('referral ledger:', JSON.stringify(ledger('w_referrals', ticketNumber).map(t => [t.type, t.amount, t.balanceBefore, t.balanceAfter])));
  const recordMid = (db as any).getItem('nzm_jkr_customer_referrals_v1', []) as any[];
  const refRecMid = db.getReferrals?.().find((r: any) => r.referredCustomerId === referredId);
  console.log('referral record:', JSON.stringify(refRecMid && {
    commission: refRecMid.totalCommissionFromReferral, tickets: refRecMid.ticketsCountByReferred,
    spent: refRecMid.totalSpentByReferred, first: refRecMid.hasMadeFirstOrder
  }));
  void recordMid;

  const ok = db.deleteTicket(ticketId, { fullName: 'tester', role: 'owner' }, 'اختبار');
  console.log('\ndelete ticket:', ok);

  const referrerAfterDelete = db.getCustomerById(referrerId)!;
  const referredAfterDelete = db.getCustomerById(referredId)!;
  const profEnd = walletInfo('w_profits');
  const opexEnd = walletInfo('w_operating_expenses');
  console.log('profit wallet end', JSON.stringify(profEnd), 'ledger rows:', ledger('w_profits', ticketNumber).length);
  console.log('opex wallet end', JSON.stringify(opexEnd), 'ledger rows:', ledger('w_operating_expenses', ticketNumber).length);
  const same = (a: any, b: any) => Math.abs(a.bal - b.bal) < 0.001 && Math.abs(a.rec - b.rec) < 0.001 && Math.abs(a.wd - b.wd) < 0.001;
  const cbEnd = walletBal('w_cashback');
  const refEnd = walletBal('w_referrals');
  console.log('\n--- بعد الحذف ---');
  console.log('cashback wallet', cbMid, '->', cbEnd, '| referred.cashbackBalance =', referredAfterDelete.cashbackBalance);
  console.log('referral wallet', refMid, '->', refEnd, '| referrer.referralWalletBalance =', referrerAfterDelete.referralWalletBalance);
  console.log('cashback ledger:', JSON.stringify(ledger('w_cashback', ticketNumber).map(t => [t.type, t.amount, t.balanceBefore, t.balanceAfter])));
  console.log('referral ledger:', JSON.stringify(ledger('w_referrals', ticketNumber).map(t => [t.type, t.amount, t.balanceBefore, t.balanceAfter])));
  const refRecEnd = db.getReferrals?.().find((r: any) => r.referredCustomerId === referredId);
  console.log('referral record:', JSON.stringify(refRecEnd && {
    commission: refRecEnd.totalCommissionFromReferral, tickets: refRecEnd.ticketsCountByReferred,
    spent: refRecEnd.totalSpentByReferred, first: refRecEnd.hasMadeFirstOrder
  }));

  const checks: [string, boolean][] = [
    ['محفظة الكاش باك زادت مرة واحدة بقدر كاش باك العميل', referredCbMid > 0 && Math.abs((cbMid - cbBefore) - referredCbMid) < 0.001],
    ['محفظة الإحالات زادت مرة واحدة بقدر عمولة المحيل', referrerRefMid > 0 && Math.abs((refMid - refBefore) - referrerRefMid) < 0.001],
    ['الكاش باك رجع لقيمته الأصلية بعد الحذف', Math.abs(cbEnd - cbBefore) < 0.001],
    ['الإحالات رجعت لقيمتها الأصلية بعد الحذف', Math.abs(refEnd - refBefore) < 0.001],
    ['رصيد كاش باك العميل صفر بعد الحذف', (referredAfterDelete.cashbackBalance || 0) === 0],
    ['رصيد إحالات المحيل صفر بعد الحذف', (referrerAfterDelete.referralWalletBalance || 0) === 0],
    ['سجل الكاش باك فاضي للتذكرة بعد الحذف', ledger('w_cashback', ticketNumber).length === 0],
    ['سجل الإحالات فاضي للتذكرة بعد الحذف', ledger('w_referrals', ticketNumber).length === 0],
    ['الأرباح اتسجلت عند الإكمال', profLedgerMid > 0 && profMid.bal > profBefore.bal],
    ['مصاريف التشغيل اتسجلت عند الإكمال', opexLedgerMid > 0],
    ['محفظة الأرباح (الرصيد والإجماليات) رجعت لأصلها بعد الحذف', same(profEnd, profBefore)],
    ['محفظة مصاريف التشغيل (الرصيد والإجماليات) رجعت لأصلها بعد الحذف', same(opexEnd, opexBefore)],
    ['سجل الأرباح فاضي للتذكرة بعد الحذف', ledger('w_profits', ticketNumber).length === 0],
    ['سجل مصاريف التشغيل فاضي للتذكرة بعد الحذف', ledger('w_operating_expenses', ticketNumber).length === 0],
    ['سجل الإحالة اتصفّر', !refRecEnd || (refRecEnd.totalCommissionFromReferral === 0 && refRecEnd.ticketsCountByReferred === 0)],
  ];
  console.log('\n=== النتيجة ===');
  let failed = 0;
  for (const [name, pass] of checks) {
    console.log((pass ? 'PASS' : 'FAIL') + '  ' + name);
    if (!pass) failed++;
  }
  console.log(failed === 0 ? '\nكله تمام' : `\n${failed} فشل`);
  process.exit(failed === 0 ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(2); });
