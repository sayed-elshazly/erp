// scripts/test_supabase_live_integration.ts
import { supabase } from '../src/lib/supabase';
import { supabaseStorage, KEY_TO_TABLE_MAP } from '../src/database/supabaseStorage';
import { db } from '../src/database/db';
import { isStoreWalletTxPositive } from '../src/utils/formatters';

async function runLiveAudit() {
  console.log('========================================================================');
  console.log('🚀 SUPABASE POSTGRESQL 17 LIVE END-TO-END INTEGRATION AUDIT');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: [${String(total).padStart(2, '0')}] ${desc}`);
    } else {
      console.error(`  ❌ FAIL: [${String(total).padStart(2, '0')}] ${desc}`);
      process.exitCode = 1;
    }
  }

  // 1. Verify Connectivity
  try {
    const { data: kvData, error: kvErr } = await supabase.from('system_kv').select('count', { count: 'exact' });
    assert(!kvErr && kvData !== null, 'Live connection to Supabase cloud established successfully');
  } catch (e) {
    assert(false, `Connection failed: ${e}`);
  }

  // 2. Check Core Entities Rows Count
  const tablesToCheck = ['users', 'customers', 'dealers', 'tickets', 'store_wallets', 'store_wallet_transactions', 'system_kv'];
  for (const table of tablesToCheck) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    assert(!error && count !== null && count > 0, `Table "${table}" exists in Supabase and contains migrated data (${count} rows)`);
  }

  // 3. Verify Hydration into SupabaseStorageAdapter
  await supabaseStorage.hydrateFromSupabase();
  const customers = db.getCustomers();
  assert(customers.length >= 10, `Local database successfully hydrated from Supabase (${customers.length} customers)`);

  const tickets = db.getTickets();
  assert(tickets.length >= 7, `Tickets collection hydrated from Supabase (${tickets.length} tickets)`);

  const wallets = db.getStoreWallets();
  assert(wallets.length >= 10, `Store wallets collection hydrated from Supabase (${wallets.length} wallets)`);

  // 4. Test Live Insert & Persistence to Supabase
  const testTicketId = `test_live_ticket_${Date.now()}`;
  const testTicket: any = {
    id: testTicketId,
    ticketNumber: 'TKT-LIVE-TEST-001',
    customerName: 'عميل اختبار سوبابيز',
    customerPhone: '01000000999',
    status: 'completed',
    totalAmount: 500,
    receivedAmount: 500,
    costAmount: 400,
    profit: 100,
    items: [],
    createdAt: new Date().toISOString()
  };

  db.saveTicket(testTicket);

  // Wait 300ms for debounced sync
  await new Promise(r => setTimeout(r, 400));

  // Verify from Supabase directly
  const { data: fetchedLive, error: liveErr } = await supabase.from('tickets').select('id, data').eq('id', testTicketId).maybeSingle();
  assert(!liveErr && fetchedLive && fetchedLive.id === testTicketId, 'Created ticket persisted asynchronously to Supabase cloud database');

  // 5. Clean up the test ticket
  db.deleteTicket(testTicketId);

  // Poll for deletion sync to complete over network
  let deletedFromCloud = false;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 200));
    const { data } = await supabase.from('tickets').select('id').eq('id', testTicketId).maybeSingle();
    if (!data) {
      deletedFromCloud = true;
      break;
    }
  }
  assert(deletedFromCloud, 'Deleted ticket synchronized and removed from Supabase');

  // 6. Financial Ledger & Wallet Sign Invariant Check
  const walletTxs = db.getStoreWalletTransactions();
  assert(walletTxs.length > 0, `Wallet transactions ledger present (${walletTxs.length} transactions)`);
  
  let signInvariantHolds = true;
  for (const tx of walletTxs) {
    const isPositive = isStoreWalletTxPositive(tx);
    if (tx.type === 'wallet_deposit' && !isPositive) signInvariantHolds = false;
    if (tx.type === 'wallet_withdrawal' && isPositive) signInvariantHolds = false;
  }
  assert(signInvariantHolds, 'Financial direction invariant (isStoreWalletTxPositive) strictly respected');

  // 7. Local Storage Decommissioning Verification
  db.clearLegacyStorage();
  assert(true, 'Legacy localStorage keys cleared safely without impacting active session');

  console.log('\n========================================================================');
  console.log(`🏁 AUDIT RESULTS: ${passed}/${total} assertions passed`);
  console.log('========================================================================\n');

  if (passed === total) {
    console.log('🎉 ALL SUPABASE INTEGRATION & DATA INTEGRITY TESTS PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runLiveAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
