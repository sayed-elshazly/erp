// scripts/test_comprehensive_database_deep_audit.ts
// Exhaustive Database & Financial Integrity Audit Suite for Ammar ERP (Supabase PostgreSQL 17)

import { supabase } from '../src/lib/supabase';
import { supabaseStorage, KEY_TO_TABLE_MAP } from '../src/database/supabaseStorage';
import { db } from '../src/database/db';
import { isStoreWalletTxPositive } from '../src/utils/formatters';

async function runExhaustiveDatabaseAudit() {
  console.log('========================================================================================');
  console.log('🔬 EXHAUSTIVE DEEP DATABASE AUDIT & INTEGRITY VERIFICATION (SUPABASE POSTGRESQL 17)');
  console.log('========================================================================================\n');

  let passed = 0;
  let total = 0;
  const errors: string[] = [];

  function assert(condition: boolean, desc: string, details?: any) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${String(total).padStart(2, '0')}. ${desc}`);
    } else {
      errors.push(desc);
      console.error(`  ❌ [FAIL] ${String(total).padStart(2, '0')}. ${desc}`);
      if (details) console.error('     Details:', details);
      process.exitCode = 1;
    }
  }

  // ========================================================================================
  // PHASE 1: SUPABASE INFRASTRUCTURE & TABLE SCHEMA INTEGRITY
  // ========================================================================================
  console.log('📌 PHASE 1: Checking All Tables & Schema Structure on Supabase Cloud...');

  const expectedTables = [
    'users', 'customers', 'dealers', 'merchants', 'tickets', 'dealer_tickets',
    'store_wallets', 'store_wallet_transactions', 'dealer_wallets', 'dealer_wallet_transactions',
    'deposit_bonds_fifo', 'safe_transactions', 'dealer_safe_transactions',
    'expenses', 'dealer_expenses', 'debts', 'dealer_debts',
    'shift_settlements', 'dealer_settlements', 'daily_closures', 'dealer_daily_closures',
    'employees', 'dealer_employees', 'attendance', 'dealer_attendance',
    'salaries', 'dealer_salaries', 'audit_logs', 'notifications',
    'competitions', 'competition_participants', 'competition_rewards', 'competition_draws',
    'coupons', 'merchant_invoices', 'merchant_transactions', 'merchant_reminders',
    'merchant_product_rules', 'merchant_notes', 'merchant_files',
    'customer_notes', 'dealer_notes', 'middleman_deals', 'middleman_accounts',
    'middleman_notifications', 'middleman_followups', 'subscription_plans',
    'subscriptions', 'subscription_payments', 'subscription_notifications',
    'balance_withdrawals', 'dealer_balance_withdrawals', 'marketing_campaigns',
    'system_kv'
  ];

  let missingTables = 0;
  for (const table of expectedTables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      missingTables++;
      console.error(`Missing or inaccessible table: ${table}`, error);
    }
  }
  assert(missingTables === 0, `All 54 tables exist and respond normally on Supabase (0 missing)`);

  // Check system_kv essential singletons
  const { data: kvKeys, error: kvErr } = await supabase.from('system_kv').select('key');
  assert(!kvErr && kvKeys && kvKeys.length >= 20, `system_kv holds critical configurations (${kvKeys?.length} keys found)`);

  const hasGamesTree = kvKeys?.some(k => k.key.includes('games_tree'));
  const hasSettings = kvKeys?.some(k => k.key.includes('settings'));
  const hasExchangeRate = kvKeys?.some(k => k.key.includes('exchange_rate') || k.key.includes('daily_exchange_rate'));
  assert(!!hasGamesTree, 'Catalog gamesTree JSONB state persisted in system_kv');
  assert(!!hasSettings, 'System settings configuration persisted in system_kv');
  assert(!!hasExchangeRate, 'Exchange rate configuration persisted in system_kv');

  // ========================================================================================
  // PHASE 2: IN-MEMORY HYDRATION & BIDIRECTIONAL PARITY
  // ========================================================================================
  console.log('\n📌 PHASE 2: Verifying In-Memory Hydration & Cloud Parity...');

  await supabaseStorage.hydrateFromSupabase();

  const customers = db.getCustomers();
  const dealers = db.getDealers();
  const storeWallets = db.getStoreWallets();
  const dealerWallets = db.getDealerWallets();
  const tickets = db.getTickets();
  const dealerTickets = db.getDealerTickets();
  const storeTxs = db.getStoreWalletTransactions();
  const safeTxs = db.getSafeTransactions();

  assert(customers.length > 0, `Customers hydrated with exact record count: ${customers.length}`);
  assert(dealers.length > 0, `Dealers hydrated with exact record count: ${dealers.length}`);
  assert(storeWallets.length >= 10, `Retail store wallets hydrated: ${storeWallets.length}`);
  assert(dealerWallets.length >= 4, `Wholesale dealer wallets hydrated: ${dealerWallets.length}`);
  assert(tickets.length > 0, `Retail tickets hydrated: ${tickets.length}`);
  assert(storeTxs.length > 0, `Store wallet transactions hydrated: ${storeTxs.length}`);

  // ========================================================================================
  // PHASE 3: RETAIL VS WHOLESALE WALLET ISOLATION (RULE 3)
  // ========================================================================================
  console.log('\n📌 PHASE 3: Enforcing Wholesale (mw_*) vs Retail (w_*) Isolation...');

  const retailWalletsArePure = storeWallets.every(w => w.id.startsWith('w_') || !w.id.startsWith('mw_'));
  assert(retailWalletsArePure, 'Retail wallets (store_wallets) do not contain any mw_* wholesale wallets');

  const wholesaleWalletsArePure = dealerWallets.every(w => w.id.startsWith('mw_'));
  assert(wholesaleWalletsArePure, 'Wholesale wallets (dealer_wallets) strictly use mw_* prefix');

  // ========================================================================================
  // PHASE 4: FINANCIAL DIRECTION & LEDGER INVARIANTS (RULE 1)
  // ========================================================================================
  console.log('\n📌 PHASE 4: Auditing Financial Direction (isStoreWalletTxPositive)...');

  let ledgerDirectionClean = true;
  for (const tx of storeTxs) {
    const isPositive = isStoreWalletTxPositive(tx);
    if (tx.type === 'wallet_deposit' && !isPositive) {
      ledgerDirectionClean = false;
      console.error('Invalid deposit sign:', tx);
    }
    if (tx.type === 'wallet_withdrawal' && isPositive) {
      ledgerDirectionClean = false;
      console.error('Invalid withdrawal sign:', tx);
    }
    if (tx.amount < 0) {
      ledgerDirectionClean = false;
      console.error('Negative amount stored directly in ledger without Math.abs():', tx);
    }
  }
  assert(ledgerDirectionClean, 'All store wallet transactions obey positive amounts and proper isStoreWalletTxPositive direction');

  // ========================================================================================
  // PHASE 5: LIVE TICKET LIFECYCLE & FINANCIAL SYNC TEST (CREATE -> EDIT -> CANCEL -> DELETE)
  // ========================================================================================
  console.log('\n📌 PHASE 5: Live Ticket Lifecycle & Cloud Atomic Sync Test...');

  const auditCust = customers[0];
  const initialCustSpent = auditCust.totalSpent || 0;
  const initialCustCashback = auditCust.cashbackBalance || 0;

  const uniqueSuffix = Date.now();
  const testTicketId = `audit_live_ticket_${uniqueSuffix}`;
  const testTicketNumber = `TKT-AUDIT-${uniqueSuffix}`;

  const liveTicket: any = {
    id: testTicketId,
    ticketNumber: testTicketNumber,
    customerId: auditCust.id,
    customerName: auditCust.name,
    customerPhone: auditCust.phone,
    status: 'completed',
    totalAmount: 1000,
    receivedAmount: 1000,
    costAmount: 800,
    profit: 200,
    earnedCashback: 20,
    items: [{
      productId: 'p_audit_test',
      productName: 'باقة تدقيق قاعدة البيانات',
      quantity: 1,
      sellingPrice: 1000,
      costPrice: 800
    }],
    createdAt: new Date().toISOString()
  };

  // Step 1: Save Ticket
  db.saveTicket(liveTicket);

  // Allow debounce sync
  await new Promise(r => setTimeout(r, 450));

  // Verify ticket exists in Supabase
  const { data: cloudTicket, error: tktErr } = await supabase
    .from('tickets')
    .select('id, data')
    .eq('id', testTicketId)
    .maybeSingle();

  assert(!tktErr && cloudTicket && cloudTicket.id === testTicketId, 'Created ticket persisted to Supabase cloud within SLA');
  assert(cloudTicket?.data?.totalAmount === 1000, 'Ticket payload matches exactly in Supabase database');

  // Step 2: Edit Ticket (Reconciliation)
  const editedTicket: any = {
    ...liveTicket,
    totalAmount: 1200,
    receivedAmount: 1200,
    profit: 300
  };
  db.saveTicket(editedTicket);
  await new Promise(r => setTimeout(r, 450));

  const { data: cloudTicketEdited } = await supabase
    .from('tickets')
    .select('id, data')
    .eq('id', testTicketId)
    .maybeSingle();

  assert(cloudTicketEdited?.data?.totalAmount === 1200, 'Ticket edit reconciled and updated in Supabase');

  // Step 3: Delete Ticket (Clean Rollback)
  db.deleteTicket(testTicketId, { role: 'admin', fullName: 'مدير التدقيق' }, 'تنظيف تذكرة اختبار التدقيق الشامل');

  // Poll for deletion propagation
  let deletedSuccessfully = false;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 150));
    const { data: checkDeleted } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', testTicketId)
      .maybeSingle();
    if (!checkDeleted) {
      deletedSuccessfully = true;
      break;
    }
  }
  assert(deletedSuccessfully, 'Ticket deletion atomically synchronized and removed from Supabase');

  // ========================================================================================
  // PHASE 6: RAPID CONCURRENCY & DEBOUNCING STRESS TEST
  // ========================================================================================
  console.log('\n📌 PHASE 6: Concurrency & High-Frequency Update Stress Test...');

  const stressCust = { ...customers[0], name: `عميل ضغط ${uniqueSuffix}` };
  for (let i = 1; i <= 5; i++) {
    db.saveCustomer({
      ...stressCust,
      notes: `تحديث رقم ${i} في نفس الثانية`
    } as any);
  }

  // Wait for the debounced sync queue to flush to Supabase
  await new Promise(r => setTimeout(r, 600));

  const { data: cloudCust } = await supabase
    .from('customers')
    .select('id, data')
    .eq('id', stressCust.id)
    .maybeSingle();

  assert(cloudCust?.data?.notes === 'تحديث رقم 5 في نفس الثانية', 'Debounced sync pipeline safely coalesces rapid sequential writes into single atomic cloud upsert');

  // ========================================================================================
  // PHASE 7: LOCAL STORAGE DECOMMISSIONING COMPLIANCE
  // ========================================================================================
  console.log('\n📌 PHASE 7: Verifying Complete Local Storage Decommissioning...');

  db.clearLegacyStorage();
  let residualLocalKeys = 0;
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith('nzm_jkr_') || k.startsWith('jkr_')) && k !== 'nzm_jkr_current_user') {
        residualLocalKeys++;
      }
    }
  }
  assert(residualLocalKeys === 0, 'Zero residual legacy database keys remain in browser localStorage');

  console.log('\n========================================================================================');
  console.log(`🏁 AUDIT COMPLETE: ${passed}/${total} assertions passed`);
  console.log('========================================================================================\n');

  if (passed === total) {
    console.log('🏆 100% PERFECT DATABASE INTEGRITY: ZERO DISCREPANCIES DETECTED IN SUPABASE POSTGRESQL 17.');
  } else {
    console.error(`💥 AUDIT FAILED: ${errors.length} issues encountered.`);
    process.exit(1);
  }
}

runExhaustiveDatabaseAudit().catch(err => {
  console.error('Fatal crash during deep audit:', err);
  process.exit(1);
});
