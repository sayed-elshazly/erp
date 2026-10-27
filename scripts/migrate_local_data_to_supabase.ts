// scripts/migrate_local_data_to_supabase.ts
// Pipeline script to migrate all local seed and storage data to Supabase (PostgreSQL 17)

// Ensure global localStorage exists before any module loads
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

if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = new MockLocalStorage();
}

const { supabase } = await import('../src/lib/supabase');
const { db } = await import('../src/database/db');
const { initialNotes } = await import('../src/database/seedData');
const { initialDealerNotes } = await import('../src/database/seedDealers');
const { CompetitionService } = await import('../src/services/competitions/competitionService');
const { AnalyticsService } = await import('../src/services/analytics/analyticsService');
const { PricingEngine } = await import('../src/services/pricing/pricingEngine');

async function batchUpsert(tableName: string, records: Array<{ id: string; data: any }>) {
  if (records.length === 0) return 0;

  const chunkSize = 50;
  let totalInserted = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize).map(r => ({
      id: r.id,
      data: r.data,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from(tableName)
      .upsert(chunk, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Error upserting into ${tableName} (chunk ${i}..${i + chunk.length}):`, error);
      throw error;
    }
    totalInserted += chunk.length;
  }

  return totalInserted;
}

async function upsertKV(key: string, value: any) {
  const { error } = await supabase
    .from('system_kv')
    .upsert({
      key,
      value,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error(`❌ Error upserting system_kv key "${key}":`, error);
    throw error;
  }
}

async function runMigration() {
  console.log('🚀 Starting Ammar ERP -> Supabase Data Migration Pipeline...');
  console.log('------------------------------------------------------------');

  // Initialize local db to ensure all default data is generated
  db.initialize();

  const migrationManifest: Array<{ table: string; items: any[]; getId?: (x: any) => string }> = [
    { table: 'users', items: db.getUsers() },
    { table: 'customers', items: db.getCustomers() },
    { table: 'dealers', items: db.getDealers() },
    { table: 'merchants', items: db.getMerchants() },
    { table: 'tickets', items: db.getTickets() },
    { table: 'dealer_tickets', items: db.getDealerTickets() },
    { table: 'store_wallets', items: db.getStoreWallets() },
    { table: 'store_wallet_transactions', items: db.getStoreWalletTransactions() },
    { table: 'dealer_wallets', items: db.getDealerWallets() },
    { table: 'dealer_wallet_transactions', items: db.getDealerWalletTransactions() },
    { table: 'deposit_bonds_fifo', items: db.getDepositBondsFIFO() },
    { table: 'safe_transactions', items: db.getSafeTransactions() },
    { table: 'dealer_safe_transactions', items: db.getDealerSafeTransactions() },
    { table: 'expenses', items: db.getExpenses() },
    { table: 'dealer_expenses', items: db.getDealerExpenses() },
    { table: 'debts', items: db.getDebts() },
    { table: 'dealer_debts', items: db.getDealerDebts() },
    { table: 'shift_settlements', items: db.getSettlements() },
    { table: 'dealer_settlements', items: db.getDealerDailySettlements() },
    { table: 'daily_closures', items: db.getDailyClosures() },
    { table: 'dealer_daily_closures', items: db.getDealerDailyClosures() },
    { table: 'employees', items: db.getEmployees() },
    { table: 'dealer_employees', items: db.getDealerEmployees() },
    { table: 'attendance', items: db.getAttendance() },
    { table: 'dealer_attendance', items: db.getDealerAttendance() },
    { table: 'salaries', items: db.getSalaries() },
    { table: 'dealer_salaries', items: db.getDealerSalaries() },
    { table: 'audit_logs', items: db.getAuditLogs() },
    { table: 'notifications', items: db.getNotifications() },
    { table: 'coupons', items: db.getCoupons() },
    { table: 'merchant_invoices', items: db.getMerchantInvoices() },
    { table: 'merchant_transactions', items: db.getMerchantTransactions() },
    { table: 'merchant_reminders', items: db.getMerchantReminders() },
    { table: 'merchant_product_rules', items: db.getMerchantProductRules() },
    { table: 'merchant_notes', items: db.getMerchantNotes() },
    { table: 'merchant_files', items: db.getMerchantFiles() },
    { table: 'customer_notes', items: initialNotes },
    { table: 'dealer_notes', items: initialDealerNotes },
    { table: 'middleman_deals', items: db.getMiddlemanDeals() },
    { table: 'middleman_accounts', items: db.getMiddlemanAccounts() },
    { table: 'middleman_notifications', items: db.getMiddlemanNotifications() },
    { table: 'middleman_followups', items: db.getMiddlemanFollowups() },
    { table: 'subscription_plans', items: db.getSubscriptionPlans() },
    { table: 'subscriptions', items: db.getSubscriptions() },
    { table: 'subscription_payments', items: db.getSubscriptionPayments() },
    { table: 'subscription_notifications', items: db.getSubscriptionNotifications ? db.getSubscriptionNotifications() : [] },
    { table: 'balance_withdrawals', items: db.getBalanceWithdrawals() },
    { table: 'dealer_balance_withdrawals', items: db.getDealerBalanceWithdrawals() },
    { table: 'competitions', items: CompetitionService.getCompetitions() },
    { table: 'competition_participants', items: CompetitionService.getParticipants() },
    { table: 'competition_rewards', items: CompetitionService.getRewards() },
    { table: 'marketing_campaigns', items: AnalyticsService.getMarketingCampaigns() }
  ];

  let totalRecordsMigrated = 0;

  for (const { table, items, getId } of migrationManifest) {
    if (!items || items.length === 0) {
      console.log(`ℹ️  [${table}] No items to migrate (0 records).`);
      continue;
    }

    const records = items.map((item, idx) => ({
      id: getId ? getId(item) : (item.id || item.code || `${table}_${idx + 1}`),
      data: item
    }));

    const count = await batchUpsert(table, records);
    totalRecordsMigrated += count;
    console.log(`✅ [${table}] Successfully migrated ${count} records.`);
  }

  // Migrate Key-Value Configurations and Singletons into system_kv
  console.log('\n⚙️  Migrating Key-Value settings into system_kv table...');

  const kvEntries: Record<string, any> = {
    'system_settings': db.getSettings(),
    'exchange_rate': db.getExchangeRate(),
    'games_tree': db.getGameTree(),
    'first_shipping_game_tree': db.getFirstShippingGameTree(),
    'system_codes': db.getSystemCodes(),
    'customer_module_settings': db.getCustomerModuleSettings(),
    'dealer_module_settings': db.getDealerModuleSettings(),
    'middleman_settings': db.getMiddlemanModuleSettings(),
    'subscription_settings': db.getSubscriptionSettings(),
    'pricing_config': PricingEngine.getConfig(),
    'copy_templates': db.getCopyTemplates ? db.getCopyTemplates() : [],
    'customer_transactions': db.getCustomerTransactions ? db.getCustomerTransactions() : [],
    'dealer_transactions': db.getDealerUnifiedWalletTransactions ? db.getDealerUnifiedWalletTransactions() : []
  };

  for (const [key, value] of Object.entries(kvEntries)) {
    await upsertKV(key, value);
    console.log(`✅ [system_kv] Key "${key}" successfully saved.`);
  }

  console.log('\n🎉 Migration Pipeline completed successfully!');
  console.log(`📊 Total relational/table records migrated: ${totalRecordsMigrated}`);
  console.log(`📊 Total system_kv singletons migrated: ${Object.keys(kvEntries).length}`);
  console.log('------------------------------------------------------------');
}

runMigration().catch(err => {
  console.error('❌ Fatal Migration Error:', err);
  process.exit(1);
});
