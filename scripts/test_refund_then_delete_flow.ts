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

  const snapshot = () => {
    const wallets = db.getStoreWallets().map((w: any) => [w.id, w.balance ?? 0, w.totalReceived ?? 0, w.totalWithdrawn ?? 0]);
    const cust = db.getCustomerById(customerId) as any;
    return JSON.stringify({ wallets, cb: cust?.cashbackBalance || 0, bal: cust?.accountBalance || 0 });
  };
  const rowsFor = (n: string) => db.getStoreWalletTransactions().filter(t => JSON.stringify(t).includes(n)).length;

  const stamp = Date.now().toString().slice(-6);
  const customerId = 'cust_refund_' + stamp;
  const ticketNumber = 'JKR-R-' + stamp;
  const ticketId = 'tkt_r_' + stamp;

  db.saveCustomer({
    id: customerId, name: 'عميل الاسترداد', phone: '0106' + stamp,
    balance: 0, accountBalance: 0, cashbackBalance: 0, createdAt: new Date().toISOString()
  } as any);

  db.saveTicket({
    id: ticketId, ticketNumber, customerId, customerName: 'عميل الاسترداد', customerPhone: '0106' + stamp,
    status: 'pending', requiredAmount: 520, receivedAmount: 520, paymentWalletId: 'w_voda', paymentWallet: 'فودافون كاش',
    createdAt: new Date().toISOString(), cashbackPercent: 1, netProfit: 50, totalProfitMargin: 50, fixedCostAmount: 10,
    items: [{ productId: 'prod_t', productName: 'منتج', gameName: 'لعبة', unitPrice: 520, quantity: 1, totalPrice: 520, consumedPoints: 0 }]
  } as any);

  db.updateTicketStatus(ticketId, 'completed', { fullName: 'tester', role: 'owner' });
  const refund = db.refundTicket(ticketId, 'w_voda', 'اختبار', { fullName: 'tester', role: 'owner' });
  console.log('refund:', JSON.stringify(refund));

  const afterRefund = snapshot();
  const rowsAfterRefund = rowsFor(ticketNumber);
  const statusAfterRefund = db.getTicketById(ticketId)?.status;

  db.deleteTicket(ticketId, { fullName: 'tester', role: 'owner' } as any);
  const afterDelete = snapshot();
  const rowsAfterDelete = rowsFor(ticketNumber);

  const refundTwice = db.refundTicket(ticketId, 'w_voda', 'تاني', { fullName: 'tester', role: 'owner' });

  const checks: Array<[string, boolean]> = [
    ['الاسترداد نجح', refund.success === true],
    ['التذكرة بقت مستردة', statusAfterRefund === 'refunded'],
    ['حذف التذكرة المستردة ما غيّرش أي رصيد أو إجمالي', afterRefund === afterDelete],
    ['حذف التذكرة المستردة ما ضافش حركات جديدة', rowsAfterDelete <= rowsAfterRefund],
    ['ما ينفعش استرداد تذكرة محذوفة', refundTwice.success === false]
  ];
  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(ok ? 'PASS' : 'FAIL', '-', name);
    if (!ok) failed++;
  }
  console.log('rows after refund/delete:', rowsAfterRefund, rowsAfterDelete);
  console.log(failed === 0 ? 'كله تمام' : `فشل ${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
