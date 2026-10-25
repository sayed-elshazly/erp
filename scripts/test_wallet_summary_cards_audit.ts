// ============================================================================
// 🧪 WALLET SUMMARY CARDS & 20 EGP DEFICIT COMPREHENSIVE AUDIT TEST SUITE
// ============================================================================

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

async function runAudit() {
  const { db } = await import('../src/database/db');

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`❌ Assertion Failed: ${msg}`);
      throw new Error(`Assertion Failed: ${msg}`);
    }
  }

  console.log('========================================================================');
  console.log('🔍 WALLET SUMMARY CARDS & FINANCIAL INTEGRITY AUDIT');
  console.log('========================================================================\n');

  // 1. Initial State Check
  console.log('--- Test 1: Customer Account & Ledger Integrity ---');
  const customers = db.getCustomers();
  console.log(`Fetched ${customers.length} customers.`);

  const cust1 = customers.find(c => c.id === 'cust_1');
  const cust3 = customers.find(c => c.id === 'cust_3');
  assert(Boolean(cust1), 'cust_1 must exist');
  assert(Boolean(cust3), 'cust_3 must exist');

  console.log(`cust_1: accountBalance=${cust1?.accountBalance}, cashbackBalance=${cust1?.cashbackBalance}, referralBalance=${cust1?.referralWalletBalance}`);
  console.log(`cust_3: accountBalance=${cust3?.accountBalance}, cashbackBalance=${cust3?.cashbackBalance}, referralBalance=${cust3?.referralWalletBalance}`);

  assert(cust1?.accountBalance === 50, `cust_1 accountBalance must be 50, got ${cust1?.accountBalance}`);
  assert(cust1?.cashbackBalance === 25, `cust_1 cashbackBalance must be 25, got ${cust1?.cashbackBalance}`);
  assert(cust1?.referralWalletBalance === 45, `cust_1 referralWalletBalance must be 45, got ${cust1?.referralWalletBalance}`);

  assert(cust3?.accountBalance === -20, `cust_3 accountBalance must be -20 (عجز سداد مدين), got ${cust3?.accountBalance}`);
  assert(cust3?.cashbackBalance === 110, `cust_3 cashbackBalance must be 110, got ${cust3?.cashbackBalance}`);
  assert(cust3?.referralWalletBalance === 85, `cust_3 referralWalletBalance must be 85, got ${cust3?.referralWalletBalance}`);

  const totalCustCb = Math.round(customers.reduce((s, c) => s + (Number(c.cashbackBalance) || 0), 0) * 100) / 100;
  const totalCustRef = Math.round(customers.reduce((s, c) => s + (Number(c.referralWalletBalance) || 0), 0) * 100) / 100;
  console.log(`Total Customer Cashback: ${totalCustCb} EGP`);
  console.log(`Total Customer Referrals: ${totalCustRef} EGP`);
  assert(totalCustCb === 240, `Total customer cashback must be 240 EGP (25+60+110+40+5), got ${totalCustCb}`);
  assert(totalCustRef === 910, `Total customer referrals must be 910 EGP (45+130+85+650+0), got ${totalCustRef}`);
  console.log('✅ Test 1 Passed: Customer account balances preserved without auto-wipe.\n');

  // 2. Dealer Account & Ledger Integrity
  console.log('--- Test 2: Dealer Account & Ledger Integrity ---');
  const dealers = db.getDealers();
  console.log(`Fetched ${dealers.length} dealers.`);

  const dlr1 = dealers.find(d => d.id === 'dlr_1');
  const dlr2 = dealers.find(d => d.id === 'dlr_2');
  assert(Boolean(dlr1), 'dlr_1 must exist');
  assert(Boolean(dlr2), 'dlr_2 must exist');

  assert(dlr1?.cashbackBalance === 420, `dlr_1 cashbackBalance must be 420, got ${dlr1?.cashbackBalance}`);
  assert(dlr1?.referralWalletBalance === 1250, `dlr_1 referralWalletBalance must be 1250, got ${dlr1?.referralWalletBalance}`);
  assert(dlr1?.accountBalance === 1500, `dlr_1 accountBalance must be 1500, got ${dlr1?.accountBalance}`);

  assert(dlr2?.accountBalance === -250, `dlr_2 accountBalance must be -250, got ${dlr2?.accountBalance}`);
  assert(dlr2?.cashbackBalance === 190, `dlr_2 cashbackBalance must be 190, got ${dlr2?.cashbackBalance}`);

  const totalDealerCb = Math.round(dealers.reduce((s, d) => s + (Number(d.cashbackBalance) || 0), 0) * 100) / 100;
  const totalDealerRef = Math.round(dealers.reduce((s, d) => s + (Number(d.referralWalletBalance) || 0), 0) * 100) / 100;
  console.log(`Total Dealer Cashback: ${totalDealerCb} EGP`);
  console.log(`Total Dealer Referrals: ${totalDealerRef} EGP`);
  assert(totalDealerCb === 1895, `Total dealer cashback must be 1895 EGP, got ${totalDealerCb}`);
  assert(totalDealerRef === 4660, `Total dealer referrals must be 4660 EGP, got ${totalDealerRef}`);
  console.log('✅ Test 2 Passed: Dealer account balances preserved without auto-wipe.\n');

  // 3. System Wallets Live Sync & Retail/Wholesale Isolation
  console.log('--- Test 3: System Wallets Live Sync & Retail/Wholesale Isolation ---');
  const storeWallets = db.getStoreWallets();
  const wCashback = storeWallets.find(w => w.id === 'w_cashback');
  const wReferrals = storeWallets.find(w => w.id === 'w_referrals');
  const wProfits = storeWallets.find(w => w.id === 'w_profits');
  const wTrust = storeWallets.find(w => w.id === 'w_trust');

  console.log(`w_cashback balance: ${wCashback?.balance} (expected: ${totalCustCb})`);
  console.log(`w_referrals balance: ${wReferrals?.balance} (expected: ${totalCustRef})`);
  console.log(`w_profits balance: ${wProfits?.balance} (expected: 40 - realized only)`);
  console.log(`w_trust balance: ${wTrust?.balance} (expected: 30 - net 50 overpayment minus 20 debt)`);

  assert(wCashback?.balance === totalCustCb, `w_cashback must strictly equal total retail customer cashback (${totalCustCb}), got ${wCashback?.balance}`);
  assert(wReferrals?.balance === totalCustRef, `w_referrals must strictly equal total retail customer referrals (${totalCustRef}), got ${wReferrals?.balance}`);
  assert(wProfits?.balance === 40, `w_profits must strictly equal completed ticket profits (40), got ${wProfits?.balance}`);
  assert(wTrust?.balance === 30, `w_trust must strictly equal net retail customer liability (50-20=30), got ${wTrust?.balance}`);

  const dealerWallets = db.getDealerWallets();
  const mwCashback = dealerWallets.find(w => w.id === 'mw_cashback');
  const mwReferrals = dealerWallets.find(w => w.id === 'mw_referrals');
  const mwProfits = dealerWallets.find(w => w.id === 'mw_profits');
  const mwDebts = dealerWallets.find(w => w.id === 'mw_debts');

  console.log(`mw_cashback balance: ${mwCashback?.balance} (expected: ${totalDealerCb})`);
  console.log(`mw_referrals balance: ${mwReferrals?.balance} (expected: ${totalDealerRef})`);
  console.log(`mw_profits balance: ${mwProfits?.balance} (expected: 0)`);
  console.log(`mw_debts balance: ${mwDebts?.balance} (expected: 4570 - net 4820 overpayment minus 250 debt)`);

  assert(mwCashback?.balance === totalDealerCb, `mw_cashback must strictly equal total dealer cashback (${totalDealerCb}), got ${mwCashback?.balance}`);
  assert(mwReferrals?.balance === totalDealerRef, `mw_referrals must strictly equal total dealer referrals (${totalDealerRef}), got ${mwReferrals?.balance}`);
  assert(mwDebts?.balance === 4570, `mw_debts must strictly equal net dealer liability (4820-250=4570), got ${mwDebts?.balance}`);

  console.log('✅ Test 3 Passed: Retail and Wholesale system wallets isolated and synced identically.\n');

  // 4. Stability Check: Calling recalculateSystemWallets
  console.log('--- Test 4: System Wallets Stability & Determinism ---');
  db.recalculateSystemWallets();

  const storeWalletsAfter = db.getStoreWallets();
  const wCbAfter = storeWalletsAfter.find(w => w.id === 'w_cashback');
  const wRefAfter = storeWalletsAfter.find(w => w.id === 'w_referrals');
  const wProfAfter = storeWalletsAfter.find(w => w.id === 'w_profits');
  const wTrustAfter = storeWalletsAfter.find(w => w.id === 'w_trust');

  assert(wCbAfter?.balance === totalCustCb, `w_cashback must remain ${totalCustCb} after recalculateSystemWallets, got ${wCbAfter?.balance}`);
  assert(wRefAfter?.balance === totalCustRef, `w_referrals must remain ${totalCustRef} after recalculateSystemWallets, got ${wRefAfter?.balance}`);
  assert(wProfAfter?.balance === 40, `w_profits must remain 40 after recalculateSystemWallets, got ${wProfAfter?.balance}`);
  assert(wTrustAfter?.balance === 30, `w_trust must remain 30 after recalculateSystemWallets, got ${wTrustAfter?.balance}`);

  const dealerWalletsAfter = db.getDealerWallets();
  const mwCbAfter = dealerWalletsAfter.find(w => w.id === 'mw_cashback');
  const mwRefAfter = dealerWalletsAfter.find(w => w.id === 'mw_referrals');
  const mwDebtsAfter = dealerWalletsAfter.find(w => w.id === 'mw_debts');

  assert(mwCbAfter?.balance === totalDealerCb, `mw_cashback must remain ${totalDealerCb} after recalculateSystemWallets, got ${mwCbAfter?.balance}`);
  assert(mwRefAfter?.balance === totalDealerRef, `mw_referrals must remain ${totalDealerRef} after recalculateSystemWallets, got ${mwRefAfter?.balance}`);
  assert(mwDebtsAfter?.balance === 4570, `mw_debts must remain 4570 after recalculateSystemWallets, got ${mwDebtsAfter?.balance}`);

  console.log('✅ Test 4 Passed: 100% deterministic stability across live queries and recalculation.\n');

  // 5. Customer Debts Receivable Reconciliation (20 EGP Deficit Resolution)
  console.log('--- Test 5: Customer Debts Receivable & Shortage Resolution ---');
  const debts = db.getDebts(false);
  const generalDebtsReceivable = debts.filter(d => d.debtType === 'receivable').reduce((s, d) => s + d.remainingAmount, 0);
  const customerShortages = customers.filter(c => (Number(c.accountBalance) || 0) < 0).reduce((s, c) => s + Math.abs(Number(c.accountBalance) || 0), 0);
  const totalReceivable = generalDebtsReceivable + customerShortages;

  console.log(`General Debts Receivable: ${generalDebtsReceivable} EGP`);
  console.log(`Customer Shortages/Debts: ${customerShortages} EGP (cust_3)`);
  console.log(`Total Displayed Debts Receivable: ${totalReceivable} EGP`);

  assert(customerShortages === 20, `Customer shortages must be exactly 20 EGP, got ${customerShortages}`);
  assert(totalReceivable === 20, `Total Debts Receivable card must display 20 EGP (resolving the 20 EGP deficit), got ${totalReceivable}`);
  console.log('✅ Test 5 Passed: 20 EGP customer shortage correctly displayed in Debts Receivable.\n');

  console.log('========================================================================');
  console.log('🎉 ALL AUDIT CHECKS PASSED WITH 100% ACCURACY & ZERO DISCREPANCY!');
  console.log('========================================================================\n');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
