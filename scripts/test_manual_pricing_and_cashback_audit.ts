// ========================================================================
// 🧪 AUDIT SUITE: TASKS 5 & 6
// - Task 6: Manual Pricing Invariants & FIFO Cost Protection
// - Task 5: Customer Cashback Isolation & Formal Transfer Tickets
// ========================================================================

class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
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

const { db } = await import('../src/database/db');
const { PricingEngine } = await import('../src/services/pricing/pricingEngine');
const { formatProductPriceLine } = await import('../src/utils/productCopyGenerator');
import { GameProduct } from '../src/types/topup.types';
import { Customer } from '../src/types/customer.types';
import { Dealer } from '../src/types/dealer.types';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    testsFailed++;
  }
}

console.log('================================================================');
console.log('🧪 RUNNING COMPREHENSIVE AUDIT: TASKS 5 & 6');
console.log('   - Task 6: Manual Pricing Invariants & FIFO Cost Protection');
console.log('   - Task 5: Customer Cashback Isolation & Formal Transfer Tickets');
console.log('================================================================\n');

// -------------------------------------------------------------
// PART 1: Task 6 - MANUAL PRICING INVARIANTS & INTEGRITY AUDIT
// -------------------------------------------------------------
console.log('--- 1. Testing Manual Pricing Resolution & Protection ---');

// Setup mock manual product
const existingTree = db.getGameTree();
let targetGameId = 'game_free_fire';
let targetGameName = 'Free Fire';
if (existingTree.length > 0) {
  targetGameId = existingTree[0].id;
  targetGameName = existingTree[0].name;
} else {
  existingTree.push({
    id: targetGameId,
    name: targetGameName,
    sections: [{ id: 'sec_diamonds', name: 'Diamonds', order: 1 }],
    products: []
  });
  db.setGamesTree(existingTree);
}

const manualProduct: GameProduct = {
  id: 'test_manual_prod_001',
  gameId: targetGameId,
  gameName: targetGameName,
  sectionId: 'sec_diamonds',
  sectionName: 'Diamonds',
  name: 'باقة مخصصة 500 جوهرة يدوي',
  sku: 'SKU-MANUAL-001',
  costUSD: 0,
  costPriceEGP: 120, // Manual cost in EGP
  fixedCostPerOrder: 5,
  profitMarginPercent: 10,
  partnerCommissionPercent: 2,
  cashbackPercent: 1,
  calculatedPriceEGP: 160,
  customSellingPriceEGP: 160,
  dealerPriceEGP: 145,
  dealerCustomSellingPriceEGP: 145,
  firstOrderCostPriceEGP: 120,
  walletTypeId: 'w_test_sub',
  primaryWalletId: 'w_test_sub',
  autoPricingEnabled: false,
  useCustomPricing: true,
  isActive: true,
  createdAt: new Date().toISOString()
};

// Check 1.1: PricingEngine.getEffectiveProductPrice for retail
const retailEffective = PricingEngine.getEffectiveProductPrice(manualProduct, { isDealer: false });
assert(retailEffective === 160, `Retail manual price must strictly be customSellingPriceEGP (160 EGP), got: ${retailEffective}`);

// Check 1.2: PricingEngine.getEffectiveProductPrice for wholesale dealer
const dealerEffective = PricingEngine.getEffectiveProductPrice(manualProduct, { isDealer: true });
assert(dealerEffective === 145, `Wholesale dealer manual price must strictly be dealerCustomSellingPriceEGP (145 EGP), got: ${dealerEffective}`);

// Check 1.3: Copy generator line uses effective manual price
const copyLine = formatProductPriceLine(manualProduct);
assert(copyLine.includes('160'), `Marketing copy line must contain manual price 160, got: "${copyLine}"`);

// Check 1.4: Recalculate all products does NOT overwrite manual selling price or manual cost
db.saveGameProduct(manualProduct);
const recalcResult = PricingEngine.recalculateAllCatalogProducts();
assert(recalcResult.skippedManualCount >= 1, `Recalculation must skip manual products, skipped: ${recalcResult.skippedManualCount}`);

const fetchedTree = db.getGameTree();
const savedProd = fetchedTree.flatMap(g => g.products || []).find(p => p.id === 'test_manual_prod_001');
assert(savedProd !== undefined, 'Saved manual product must exist in catalog tree');
if (savedProd) {
  assert(savedProd.customSellingPriceEGP === 160, `Manual customer price preserved after recalc: ${savedProd.customSellingPriceEGP}`);
  assert(savedProd.calculatedPriceEGP === 160, `Calculated price synchronized with manual price: ${savedProd.calculatedPriceEGP}`);
  assert(savedProd.dealerCustomSellingPriceEGP === 145, `Manual dealer price preserved after recalc: ${savedProd.dealerCustomSellingPriceEGP}`);
  assert(savedProd.dealerPriceEGP === 145, `Dealer price synchronized with manual dealer price: ${savedProd.dealerPriceEGP}`);
  assert(savedProd.costPriceEGP === 120, `Manual EGP cost (120) must NOT be wiped or overwritten with 0: got ${savedProd.costPriceEGP}`);
}

// Check 1.5: Ticket item price refresh honors manual pricing
const refreshedRetail = PricingEngine.validateAndRefreshTicketItem(
  {
    gameId: manualProduct.gameId,
    productId: manualProduct.id,
    productName: manualProduct.name,
    quantity: 2,
    unitPrice: 160,
    totalPrice: 320,
    costPrice: 120
  },
  'regular',
  false // retail customer
);
assert(refreshedRetail.item.unitPrice === 160, `Ticket refresh for retail must keep unit price 160, got: ${refreshedRetail.item.unitPrice}`);

const refreshedDealer = PricingEngine.validateAndRefreshTicketItem(
  {
    gameId: manualProduct.gameId,
    productId: manualProduct.id,
    productName: manualProduct.name,
    quantity: 2,
    unitPrice: 145,
    totalPrice: 290,
    costPrice: 120
  },
  'regular',
  true // wholesale dealer
);
assert(refreshedDealer.item.unitPrice === 145, `Ticket refresh for wholesale dealer must keep unit price 145, got: ${refreshedDealer.item.unitPrice}`);

console.log('\n--- 2. Testing Customer Cashback Formal Transfer Mechanism (Task 5) ---');

// Setup mock customer
const testCust: Customer = {
  id: 'cust_audit_cb_001',
  code: 'CUST-CB-001',
  name: 'أحمد فؤاد التجريبي',
  phone: '0108877665544',
  profileType: 'regular',
  source: 'WhatsApp',
  accountBalance: 50,
  balance: 50,
  cashbackBalance: 0,
  referralWalletBalance: 30,
  cashbackRate: 1.5,
  isActive: true,
  createdAt: new Date().toISOString()
};
db.saveCustomer(testCust);

// In Ammar ERP, customer cashback is strictly ledger-backed:
db.addUnifiedWalletTransaction({
  customerId: testCust.id,
  walletType: 'cashback',
  type: 'earned',
  amount: 200,
  operationName: 'رصيد كاش باك افتتاحي معتمد',
  balanceAfter: 200
});

// Check that customer cashback is now 200
const custWithCb = db.getCustomerById(testCust.id)!;
assert(custWithCb.cashbackBalance === 200, `Customer cashback balance initialized to 200 from ledger, got: ${custWithCb.cashbackBalance}`);

const wCbInitial = db.getStoreWallets().find(w => w.id === 'w_cashback')?.balance || 0;

// Execute Formal Cashback Transfer: 80 EGP with ticket CBT-AUDIT-101
const transferTicketNumber = 'CBT-AUDIT-101';
const transferAmount = 80;

// Deduct from cashback in Unified Ledger & add to account balance in Unified Ledger
db.addUnifiedWalletTransaction({
  customerId: testCust.id,
  walletType: 'cashback',
  type: 'redeemed',
  amount: transferAmount,
  operationName: `تحويل كاش باك للرصيد الأساسي (تذكرة #${transferTicketNumber})`,
  notes: 'طلب العميل للاستخدام في الشحن',
  balanceAfter: 120,
  orderNumber: transferTicketNumber
});

db.addUnifiedWalletTransaction({
  customerId: testCust.id,
  walletType: 'account_balance',
  type: 'earned',
  amount: transferAmount,
  operationName: `إيداع ناتج عن تحويل كاش باك (تذكرة #${transferTicketNumber})`,
  notes: 'تذكرة تحويل رسمي',
  balanceAfter: (testCust.accountBalance || 0) + transferAmount,
  orderNumber: transferTicketNumber
});

// Debit system store wallet w_cashback
db.debitCashbackFromSystemWallet(transferAmount, testCust.name, transferTicketNumber, false);

// Log Action
db.logAction(
  { id: 'usr_admin', name: 'المدير المالي', role: 'admin', department: 'العملاء والمالية' },
  'edit',
  'كاش باك عملاء',
  transferTicketNumber,
  `إصدار تذكرة تحويل كاش باك #${transferTicketNumber} للعميل ${testCust.name}`,
  `تحويل ${transferAmount} ج.م من w_cashback إلى الرصيد الأساسي`
);

// Assertions for Customer Cashback Transfer
const reloadedCust = db.getCustomerById(testCust.id)!;
assert(reloadedCust.cashbackBalance === 120, `Customer cashback balance decreased by 80 (200 -> 120), got: ${reloadedCust.cashbackBalance}`);
assert(reloadedCust.accountBalance === 130, `Customer account balance increased by 80 (50 -> 130), got: ${reloadedCust.accountBalance}`);

const wCbAfter = db.getStoreWallets().find(w => w.id === 'w_cashback')?.balance || 0;
assert(wCbAfter === wCbInitial - transferAmount, `Store wallet w_cashback decreased by 80 (${wCbInitial} -> ${wCbAfter})`);

const storeTxs = db.getStoreWalletTransactions('w_cashback');
const cbTx = storeTxs.find(tx => tx.referenceNumber === transferTicketNumber);
assert(cbTx !== undefined, `Store wallet transaction logged with ticket #${transferTicketNumber}`);
if (cbTx) {
  assert(cbTx.type === 'withdrawal', `Store wallet tx type must be 'withdrawal', got: ${cbTx.type}`);
  assert(cbTx.amount === 80, `Store wallet tx amount must be 80, got: ${cbTx.amount}`);
}

const custTxs = db.getUnifiedWalletTransactions(testCust.id);
const redeemedTx = custTxs.find(tx => tx.orderNumber === transferTicketNumber && tx.walletType === 'cashback');
const earnedTx = custTxs.find(tx => tx.orderNumber === transferTicketNumber && tx.walletType === 'account_balance');
assert(redeemedTx !== undefined, 'Unified wallet redeemed transaction logged for cashback');
assert(earnedTx !== undefined, 'Unified wallet earned transaction logged for account balance');

console.log('\n--- 3. Testing Wholesale Dealer Cashback Isolation (GEMINI.md Invariant) ---');

// Setup mock wholesale dealer
const testDealer: Dealer = {
  id: 'dealer_audit_cb_001',
  code: 'DEALER-CB-001',
  name: 'محل البرنس للجملة',
  phone: '0119988776655',
  profileType: 'shop',
  source: 'direct',
  balance: 300,
  cashbackBalance: 0,
  cashbackRate: 1.0,
  isActive: true,
  createdAt: new Date().toISOString()
};
db.saveDealer(testDealer);

// Add opening dealer cashback transaction
db.addDealerUnifiedWalletTransaction({
  customerId: testDealer.id,
  walletType: 'cashback',
  type: 'earned',
  amount: 150,
  operationName: 'رصيد كاش باك تاجر مستحق',
  balanceAfter: 150
});

const dealerWithCb = db.getDealerById(testDealer.id)!;
assert(dealerWithCb.cashbackBalance === 150, `Dealer cashback balance initialized to 150 from ledger, got: ${dealerWithCb.cashbackBalance}`);

const mwCbInitial = db.getDealerWallets().find(w => w.id === 'mw_cashback')?.balance || 0;
const wCbBeforeDealerTransfer = db.getStoreWallets().find(w => w.id === 'w_cashback')?.balance || 0;

// Execute Dealer Transfer: 50 EGP with ticket CBT-DEALER-202
const dealerTicketNumber = 'CBT-DEALER-202';
const dealerTransferAmount = 50;

db.addDealerUnifiedWalletTransaction({
  customerId: testDealer.id,
  walletType: 'cashback',
  type: 'redeemed',
  amount: dealerTransferAmount,
  operationName: `تحويل كاش باك تاجر للرصيد الأساسي (تذكرة #${dealerTicketNumber})`,
  balanceAfter: 100,
  orderNumber: dealerTicketNumber
});

const updatedDealer = db.getDealerById(testDealer.id)!;
updatedDealer.balance = (updatedDealer.balance || 0) + dealerTransferAmount;
db.saveDealer(updatedDealer);

// Debit wholesale system dealer wallet mw_cashback (isDealer: true)
db.debitCashbackFromSystemWallet(dealerTransferAmount, updatedDealer.name, dealerTicketNumber, true);

// Assertions for Wholesale Dealer Cashback Transfer
const reloadedDealer = db.getDealerById(testDealer.id)!;
assert(reloadedDealer.cashbackBalance === 100, `Dealer cashback balance decreased by 50 (150 -> 100), got: ${reloadedDealer.cashbackBalance}`);
assert(reloadedDealer.balance === 350, `Dealer balance increased by 50 (300 -> 350), got: ${reloadedDealer.balance}`);

const mwCbAfter = db.getDealerWallets().find(w => w.id === 'mw_cashback')?.balance || 0;
assert(mwCbAfter === mwCbInitial - dealerTransferAmount, `Dealer system wallet mw_cashback decreased by 50 (${mwCbInitial} -> ${mwCbAfter})`);

const wCbAfterDealerTransfer = db.getStoreWallets().find(w => w.id === 'w_cashback')?.balance || 0;
assert(wCbAfterDealerTransfer === wCbBeforeDealerTransfer, `Retail wallet w_cashback MUST NOT be touched by wholesale transfer (GEMINI.md isolation)`);

console.log('\n================================================================');
console.log(`📊 AUDIT RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
console.log('================================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL MANUAL PRICING & CASHBACK ISOLATION AUDIT TESTS PASSED!');
}
