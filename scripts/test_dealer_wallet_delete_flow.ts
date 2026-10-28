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

  const info = (id: string) => {
    const w: any = db.getDealerWallets().find(x => x.id === id);
    return { bal: w?.balance ?? 0, rec: w?.totalReceived ?? 0, wd: w?.totalWithdrawn ?? 0 };
  };
  const ledger = (walletId: string, ticketNumber: string) =>
    db.getStoreWalletTransactions().filter(t => t.walletId === walletId && JSON.stringify(t).includes(ticketNumber));
  const same = (a: any, b: any) => Math.abs(a.bal - b.bal) < 0.001 && Math.abs(a.rec - b.rec) < 0.001 && Math.abs(a.wd - b.wd) < 0.001;

  const stamp = Date.now().toString().slice(-6);
  const dealerId = 'dealer_t_' + stamp;
  const ticketNumber = 'DLR-T-' + stamp;
  const ticketId = 'dtkt_' + stamp;

  db.saveDealer({
    id: dealerId, name: 'تاجر اختبار الحذف', phone: '0106' + stamp,
    balance: 0, accountBalance: 0, cashbackBalance: 0, totalSpent: 0, totalOrders: 0, createdAt: new Date().toISOString()
  } as any);

  const profBefore = info('mw_profits');
  const cbBefore = info('mw_cashback');

  db.saveDealerTicket({
    id: ticketId, ticketNumber, customerId: dealerId, customerName: 'تاجر اختبار الحذف', customerPhone: '0106' + stamp,
    department: 'dealers', status: 'pending', requiredAmount: 1000, receivedAmount: 1000,
    paymentWalletId: 'w_voda', paymentWallet: 'فودافون كاش', createdAt: new Date().toISOString(),
    cashbackPercent: 1, netProfit: 100, totalProfitMargin: 100,
    items: [{ productId: 'prod_t', productName: 'منتج', gameName: 'لعبة', unitPrice: 1000, quantity: 1, totalPrice: 1000, consumedPoints: 0 }]
  } as any);

  const res = db.updateTicketStatus(ticketId, 'completed', { fullName: 'tester', role: 'owner' });
  console.log('complete:', JSON.stringify(res));

  const profMid = info('mw_profits');
  const cbMid = info('mw_cashback');
  console.log('mw_profits', JSON.stringify(profBefore), '->', JSON.stringify(profMid), 'rows:', ledger('mw_profits', ticketNumber).length);
  console.log('mw_cashback', JSON.stringify(cbBefore), '->', JSON.stringify(cbMid), 'rows:', ledger('mw_cashback', ticketNumber).length);

  const ok = db.deleteDealerTicket(ticketId, { fullName: 'tester', role: 'owner' }, 'اختبار');
  console.log('delete dealer ticket:', ok);

  const profEnd = info('mw_profits');
  const cbEnd = info('mw_cashback');
  const dealerEnd = db.getDealerById(dealerId)!;
  console.log('mw_profits end', JSON.stringify(profEnd), 'rows:', ledger('mw_profits', ticketNumber).length);
  console.log('mw_cashback end', JSON.stringify(cbEnd), 'rows:', ledger('mw_cashback', ticketNumber).length);

  const checks: [string, boolean][] = [
    ['تذكرة التاجر اتكملت وسجلت ربح', profMid.bal > profBefore.bal && ledger('mw_profits', ticketNumber).length >= 0],
    ['محفظة أرباح التجار رجعت لأصلها (الرصيد والإجماليات)', same(profEnd, profBefore)],
    ['محفظة كاش باك التجار رجعت لرصيدها الأصلي', Math.abs(cbEnd.bal - cbBefore.bal) < 0.001],
    ['إجمالي المسحوب من كاش باك التجار ما اتضخمش', Math.abs(cbEnd.wd - cbBefore.wd) < 0.001],
    ['سجل أرباح التاجر فاضي للتذكرة بعد الحذف', ledger('mw_profits', ticketNumber).length === 0],
    ['سجل كاش باك التاجر فاضي للتذكرة بعد الحذف', ledger('mw_cashback', ticketNumber).length === 0],
    ['كاش باك التاجر صفر بعد الحذف', (dealerEnd.cashbackBalance || 0) === 0],
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
