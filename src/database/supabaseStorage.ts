// src/database/supabaseStorage.ts
// Reactive In-Memory Supabase Storage Adapter for Ammar ERP
// High performance: 0ms synchronous reads, asynchronous persistence to Supabase PostgreSQL 17,
// realtime sync across clients, and zero dependence on legacy browser localStorage.

import { supabase } from '../lib/supabase';
import { eventBus } from '../services/eventBus';

export const KEY_TO_TABLE_MAP: Record<string, string> = {
  'nzm_jkr_users': 'users',
  'nzm_jkr_customers': 'customers',
  'nzm_jkr_dealers': 'dealers',
  'nzm_jkr_merchants': 'merchants',
  'nzm_jkr_tickets': 'tickets',
  'nzm_jkr_dealer_tickets': 'dealer_tickets',
  'nzm_jkr_store_wallets': 'store_wallets',
  'nzm_jkr_store_wallet_transactions': 'store_wallet_transactions',
  'nzm_jkr_dealer_wallets': 'dealer_wallets',
  'nzm_jkr_dealer_wallet_tx': 'dealer_wallet_transactions',
  'nzm_jkr_deposit_bonds_fifo': 'deposit_bonds_fifo',
  'nzm_jkr_safe_tx': 'safe_transactions',
  'nzm_jkr_dealer_safe_tx': 'dealer_safe_transactions',
  'nzm_jkr_expenses': 'expenses',
  'nzm_jkr_dealer_expenses': 'dealer_expenses',
  'nzm_jkr_debts': 'debts',
  'nzm_jkr_dealer_debts': 'dealer_debts',
  'nzm_jkr_settlements': 'shift_settlements',
  'nzm_jkr_dealer_settlements': 'dealer_settlements',
  'nzm_jkr_daily_closures': 'daily_closures',
  'nzm_jkr_dealer_daily_closures': 'dealer_daily_closures',
  'nzm_jkr_employees': 'employees',
  'nzm_jkr_dealer_employees': 'dealer_employees',
  'nzm_jkr_attendance': 'attendance',
  'nzm_jkr_dealer_attendance': 'dealer_attendance',
  'nzm_jkr_salaries': 'salaries',
  'nzm_jkr_dealer_salaries': 'dealer_salaries',
  'nzm_jkr_audit_logs': 'audit_logs',
  'nzm_jkr_notifications': 'notifications',
  'nzm_jkr_coupons': 'coupons',
  'nzm_jkr_merchant_invoices': 'merchant_invoices',
  'nzm_jkr_merchant_transactions': 'merchant_transactions',
  'nzm_jkr_merchant_reminders': 'merchant_reminders',
  'nzm_jkr_merchant_product_rules': 'merchant_product_rules',
  'nzm_jkr_merchant_notes': 'merchant_notes',
  'nzm_jkr_merchant_files': 'merchant_files',
  'nzm_jkr_notes': 'customer_notes',
  'nzm_jkr_dealer_notes': 'dealer_notes',
  'nzm_jkr_middleman_deals': 'middleman_deals',
  'nzm_jkr_middleman_accounts': 'middleman_accounts',
  'nzm_jkr_middleman_notifications': 'middleman_notifications',
  'nzm_jkr_middleman_followups': 'middleman_followups',
  'nzm_jkr_subscription_plans': 'subscription_plans',
  'nzm_jkr_subscriptions': 'subscriptions',
  'nzm_jkr_subscription_payments': 'subscription_payments',
  'nzm_jkr_subscription_notifications': 'subscription_notifications',
  'nzm_jkr_balance_withdrawals': 'balance_withdrawals',
  'nzm_jkr_dealer_balance_withdrawals': 'dealer_balance_withdrawals',
  'nzm_jkr_competitions': 'competitions',
  'nzm_jkr_competition_participants': 'competition_participants',
  'nzm_jkr_competition_rewards': 'competition_rewards',
  'nzm_jkr_competition_draws': 'competition_draws',
  'nzm_jkr_marketing_campaigns_v1': 'marketing_campaigns'
};

class SupabaseStorageAdapter {
  private cache = new Map<string, any>();
  private syncQueue = new Map<string, any>();
  private isHydrated = false;
  private hydrationPromise: Promise<void> | null = null;
  private knownIdsByTable = new Map<string, Set<string>>();

  constructor() {
    this.installLocalStorageInterceptor();
    this.startBackgroundHydration();
  }

  // 1. Reactive In-Memory Read (0ms latency)
  public getItem<T>(key: string, defaultValue: T): T {
    if (this.cache.has(key)) {
      const val = this.cache.get(key);
      return val !== undefined && val !== null ? val : defaultValue;
    }

    // If not in cache yet, try legacy localStorage (during bootstrap) or defaultValue
    let initialVal = defaultValue;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key);
        if (raw && raw !== 'null' && raw !== 'undefined') {
          initialVal = JSON.parse(raw);
        }
      }
    } catch (_) {}

    this.cache.set(key, initialVal);
    return initialVal;
  }

  // 2. Reactive In-Memory Write + Asynchronous Supabase Persistence
  public setItem<T>(key: string, value: T): boolean {
    this.cache.set(key, value);

    // Schedule debounced push to Supabase
    this.scheduleSyncToSupabase(key, value);

    return true;
  }

  public removeItem(key: string): void {
    this.cache.delete(key);
    const tableName = KEY_TO_TABLE_MAP[key];
    if (tableName) {
      supabase.from(tableName).delete().neq('id', '___all___').then();
    } else {
      supabase.from('system_kv').delete().eq('key', key).then();
    }
  }

  // 3. Clear legacy local database keys completely from browser localStorage
  public clearLegacyLocalStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const toDelete: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && (k.startsWith('nzm_jkr_') || k.startsWith('jkr_'))) {
            // Keep user auth session token if present
            if (k !== 'nzm_jkr_current_user') {
              toDelete.push(k);
            }
          }
        }
        toDelete.forEach(k => window.localStorage.removeItem(k));
        console.log(`🧹 Cleared ${toDelete.length} legacy database items from localStorage.`);
      }
    } catch (e) {
      console.warn('Could not clear legacy localStorage:', e);
    }
  }

  // 4. Background Hydration from Supabase Cloud Database
  public async hydrateFromSupabase(): Promise<void> {
    if (this.hydrationPromise) return this.hydrationPromise;

    this.hydrationPromise = (async () => {
      try {
        console.log('🔄 Hydrating in-memory cache from Supabase...');

        // Fetch system_kv
        const { data: kvRows, error: kvError } = await supabase
          .from('system_kv')
          .select('key, value');

        if (!kvError && kvRows) {
          for (const row of kvRows) {
            this.cache.set(row.key, row.value);
            // Also store under nzm_jkr_ prefix if applicable
            if (!row.key.startsWith('nzm_jkr_')) {
              this.cache.set(`nzm_jkr_${row.key}`, row.value);
            }
          }
        }

        // Fetch table entities
        for (const [storageKey, tableName] of Object.entries(KEY_TO_TABLE_MAP)) {
          const { data: tableRows, error: tableError } = await supabase
            .from(tableName)
            .select('id, data');

          if (!tableError && tableRows && tableRows.length > 0) {
            const items = tableRows.map(r => r.data);
            this.cache.set(storageKey, items);

            const idSet = new Set<string>();
            tableRows.forEach(r => idSet.add(r.id));
            this.knownIdsByTable.set(tableName, idSet);
          }
        }

        this.isHydrated = true;
        this.clearLegacyLocalStorage();
        this.setupRealtimeSync();

        eventBus.publish('SUPABASE_HYDRATED', { timestamp: new Date().toISOString() });
        console.log('✅ In-memory cache successfully hydrated from Supabase.');
      } catch (err) {
        console.error('⚠️ Supabase hydration warning (offline or network error):', err);
      }
    })();

    return this.hydrationPromise;
  }

  private startBackgroundHydration(): void {
    if (typeof window !== 'undefined' || typeof globalThis !== 'undefined') {
      this.hydrateFromSupabase().catch(() => {});
    }
  }

  // 5. Debounced persistence to Supabase
  private scheduleSyncToSupabase(key: string, value: any): void {
    const existing = this.syncQueue.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.syncQueue.delete(key);
      this.persistToSupabase(key, value).catch(err => {
        console.error(`❌ Background sync error for "${key}":`, err);
      });
    }, 150);

    this.syncQueue.set(key, timer);
  }

  private async persistToSupabase(key: string, value: any): Promise<void> {
    const tableName = KEY_TO_TABLE_MAP[key];

    if (tableName) {
      if (!Array.isArray(value)) {
        await supabase.from('system_kv').upsert({
          key,
          value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
        return;
      }

      // It's a collection array
      const items = value as any[];
      const currentIds = new Set<string>();

      const records = items.map((item, idx) => {
        const id = String(item.id || item.code || `${tableName}_${idx + 1}`);
        currentIds.add(id);
        return {
          id,
          data: item,
          updated_at: new Date().toISOString()
        };
      });

      // Upsert in chunks
      const chunkSize = 50;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        await supabase.from(tableName).upsert(chunk, { onConflict: 'id' });
      }

      // Check deleted items
      const previousIds = this.knownIdsByTable.get(tableName);
      if (previousIds) {
        const deletedIds = Array.from(previousIds).filter(id => !currentIds.has(id));
        if (deletedIds.length > 0) {
          await supabase.from(tableName).delete().in('id', deletedIds);
        }
      }
      this.knownIdsByTable.set(tableName, currentIds);

    } else {
      // Key-Value singleton
      const cleanKey = key.replace(/^nzm_jkr_/, '');
      await supabase.from('system_kv').upsert([
        { key, value, updated_at: new Date().toISOString() },
        { key: cleanKey, value, updated_at: new Date().toISOString() }
      ], { onConflict: 'key' });
    }
  }

  // 6. Supabase Realtime Channels
  private setupRealtimeSync(): void {
    try {
      const channel = supabase.channel('erp_cloud_sync');

      // Listen to system_kv changes
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'system_kv' }, payload => {
        if (payload.new && (payload.new as any).key) {
          const k = (payload.new as any).key;
          const v = (payload.new as any).value;
          this.cache.set(k, v);
          eventBus.publish('SUPABASE_KV_UPDATED', { key: k });
        }
      });

      // Listen to high-traffic tables
      const trackedTables = ['tickets', 'store_wallets', 'store_wallet_transactions', 'customers', 'dealers'];
      trackedTables.forEach(tbl => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: tbl }, payload => {
          const storageKey = Object.keys(KEY_TO_TABLE_MAP).find(k => KEY_TO_TABLE_MAP[k] === tbl);
          if (!storageKey) return;

          const currentList: any[] = this.cache.get(storageKey) || [];
          if (payload.eventType === 'INSERT' && (payload.new as any)?.data) {
            const newItem = (payload.new as any).data;
            if (!currentList.some(x => x.id === newItem.id)) {
              this.cache.set(storageKey, [newItem, ...currentList]);
              eventBus.publish('DATA_SYNCED', { table: tbl, id: newItem.id });
            }
          } else if (payload.eventType === 'UPDATE' && (payload.new as any)?.data) {
            const updatedItem = (payload.new as any).data;
            const idx = currentList.findIndex(x => x.id === updatedItem.id);
            if (idx >= 0) {
              currentList[idx] = updatedItem;
            } else {
              currentList.unshift(updatedItem);
            }
            this.cache.set(storageKey, [...currentList]);
            eventBus.publish('DATA_SYNCED', { table: tbl, id: updatedItem.id });
          } else if (payload.eventType === 'DELETE' && (payload.old as any)?.id) {
            const deletedId = (payload.old as any).id;
            this.cache.set(storageKey, currentList.filter(x => x.id !== deletedId));
            eventBus.publish('DATA_SYNCED', { table: tbl, id: deletedId });
          }
        });
      });

      channel.subscribe();
    } catch (e) {
      console.warn('Realtime sync setup warning:', e);
    }
  }

  // 7. Transparent localStorage Interceptor
  // Ensures any third-party or sub-service call to localStorage reads/writes from Supabase cache!
  private installLocalStorageInterceptor(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const origGetItem = window.localStorage.getItem.bind(window.localStorage);
      const origSetItem = window.localStorage.setItem.bind(window.localStorage);
      const origRemoveItem = window.localStorage.removeItem.bind(window.localStorage);

      window.localStorage.getItem = (key: string): string | null => {
        if (key.startsWith('nzm_jkr_') || key.startsWith('jkr_') || KEY_TO_TABLE_MAP[key]) {
          if (this.cache.has(key)) {
            const val = this.cache.get(key);
            return val !== undefined ? JSON.stringify(val) : null;
          }
        }
        return origGetItem(key);
      };

      window.localStorage.setItem = (key: string, value: string): void => {
        if (key.startsWith('nzm_jkr_') || key.startsWith('jkr_') || KEY_TO_TABLE_MAP[key]) {
          try {
            const parsed = JSON.parse(value);
            this.setItem(key, parsed);
            return;
          } catch (_) {
            this.setItem(key, value);
            return;
          }
        }
        origSetItem(key, value);
      };

      window.localStorage.removeItem = (key: string): void => {
        if (key.startsWith('nzm_jkr_') || key.startsWith('jkr_') || KEY_TO_TABLE_MAP[key]) {
          this.removeItem(key);
        }
        origRemoveItem(key);
      };
    } catch (_) {}
  }
}

export const supabaseStorage = new SupabaseStorageAdapter();
