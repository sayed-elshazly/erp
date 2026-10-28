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

export const UI_STORAGE_KEYS = new Set([
  'nzm_jkr_current_user',
  'nzm_jkr_current_dept',
  'nzm_jkr_theme',
  'nzm_jkr_active_tabs',
  'nzm_jkr_active_tab_id',
  'nzm_jkr_sidebar_groups',
  'nzm_jkr_font_size'
]);

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

    // Check counterpart key (with or without nzm_jkr_ prefix)
    const altKey = key.startsWith('nzm_jkr_') ? key.replace(/^nzm_jkr_/, '') : `nzm_jkr_${key}`;
    if (this.cache.has(altKey)) {
      const altVal = this.cache.get(altKey);
      if (altVal !== undefined && altVal !== null) {
        this.cache.set(key, altVal);
        return altVal;
      }
    }

    // If not in cache yet, try legacy localStorage (during bootstrap) or defaultValue
    let initialVal = defaultValue;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key) || window.localStorage.getItem(altKey);
        if (raw && raw !== 'null' && raw !== 'undefined') {
          initialVal = JSON.parse(raw);
        }
      }
    } catch (_) {}

    // CRITICAL: Only cache the fallback value if hydration is already complete.
    // If hydration is still in progress, returning the defaultValue without caching
    // prevents overwriting the real Supabase data that the hydration will populate.
    // Components that call this before hydration will get the defaultValue, but
    // the SUPABASE_HYDRATED event will trigger a re-read once data is available.
    if (this.isHydrated) {
      this.cache.set(key, initialVal);
      this.cache.set(altKey, initialVal);
    }
    return initialVal;
  }

  // 2. Reactive In-Memory Write + Asynchronous Supabase Persistence
  public setItem<T>(key: string, value: T): boolean {
    this.cache.set(key, value);
    const altKey = key.startsWith('nzm_jkr_') ? key.replace(/^nzm_jkr_/, '') : `nzm_jkr_${key}`;
    this.cache.set(altKey, value);

    // CRITICAL GUARD: Do NOT sync to Supabase until hydration is complete.
    // Before hydration, writes are seed/initialization data that should NOT overwrite
    // real cloud data. After hydration completes, the in-memory cache is populated
    // with the authoritative Supabase data, and only then are writes persisted.
    if (!this.isHydrated) {
      return true;
    }

    // Schedule debounced push to Supabase
    this.scheduleSyncToSupabase(key, value);

    return true;
  }

  public removeItem(key: string): void {
    this.cache.delete(key);
    const altKey = key.startsWith('nzm_jkr_') ? key.replace(/^nzm_jkr_/, '') : `nzm_jkr_${key}`;
    this.cache.delete(altKey);

    const tableName = KEY_TO_TABLE_MAP[key] || KEY_TO_TABLE_MAP[altKey];
    if (tableName) {
      supabase.from(tableName).delete().neq('id', '___all___').then();
    } else {
      supabase.from('system_kv').delete().in('key', [key, altKey]).then();
    }
  }

  public isStorageHydrated(): boolean {
    return this.isHydrated;
  }

  public async waitForHydration(): Promise<void> {
    if (this.isHydrated) return;
    if (this.hydrationPromise) {
      await this.hydrationPromise;
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
            // Keep user auth session token and client UI preferences intact
            if (!UI_STORAGE_KEYS.has(k) && !k.startsWith('sb-')) {
              toDelete.push(k);
            }
          }
        }
        toDelete.forEach(k => {
          try {
            // CRITICAL: Call native Storage.prototype.removeItem directly to avoid
            // triggering our intercepted window.localStorage.removeItem which deletes rows in Supabase!
            Storage.prototype.removeItem.call(window.localStorage, k);
          } catch (_) {}
        });
        if (toDelete.length > 0) {
          console.log(`🧹 Cleared ${toDelete.length} legacy database items from native localStorage.`);
        }
      }
    } catch (e) {
      console.warn('Could not clear legacy localStorage:', e);
    }
  }

  // 4. Background Hydration from Supabase Cloud Database (Fast Batched Parallel Fetching)
  public async hydrateFromSupabase(): Promise<void> {
    if (this.hydrationPromise) return this.hydrationPromise;

    this.hydrationPromise = (async () => {
      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        console.log('🔄 Fast parallel hydrating in-memory cache from Supabase...');

        // 1. Fetch system_kv in parallel with tables
        const fetchKvPromise = (async () => {
          try {
            const { data: kvRows, error: kvError } = await supabase
              .from('system_kv')
              .select('key, value, updated_at')
              .order('updated_at', { ascending: true });

            if (!kvError && kvRows) {
              for (const row of kvRows) {
                this.cache.set(row.key, row.value);
                // Bidirectional sync: store both with and without prefix in cache
                if (!row.key.startsWith('nzm_jkr_')) {
                  this.cache.set(`nzm_jkr_${row.key}`, row.value);
                } else {
                  this.cache.set(row.key.replace(/^nzm_jkr_/, ''), row.value);
                }
              }
            }
          } catch (kvErr) {
            console.warn('system_kv hydration warning:', kvErr);
          }
        })();

        // 2. Fetch all tables concurrently in chunks of 15 to balance speed & connection limits
        const tableEntries = Object.entries(KEY_TO_TABLE_MAP);
        const fetchTablesPromise = (async () => {
          const batchSize = 15;
          for (let i = 0; i < tableEntries.length; i += batchSize) {
            const chunk = tableEntries.slice(i, i + batchSize);
            await Promise.all(
              chunk.map(async ([storageKey, tableName]) => {
                try {
                  const { data: tableRows, error: tableError } = await supabase
                    .from(tableName)
                    .select('id, data');

                  if (!tableError && tableRows) {
                    const items = tableRows.map(r => r.data);
                    this.cache.set(storageKey, items);
                    const cleanStorageKey = storageKey.replace(/^nzm_jkr_/, '');
                    this.cache.set(cleanStorageKey, items);

                    const idSet = new Set<string>();
                    tableRows.forEach(r => idSet.add(r.id));
                    this.knownIdsByTable.set(tableName, idSet);
                  }
                } catch (tblErr) {
                  console.warn(`Table fetch warning for ${tableName}:`, tblErr);
                }
              })
            );
          }
        })();

        // Run both KV and table fetch streams in parallel
        await Promise.all([fetchKvPromise, fetchTablesPromise]);

        this.isHydrated = true;
        this.clearLegacyLocalStorage();
        this.setupRealtimeSync();

        const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime);
        console.log(`✅ In-memory cache successfully hydrated from Supabase in ${duration}ms.`);
        eventBus.publish('SUPABASE_HYDRATED', { timestamp: new Date().toISOString(), duration });
      } catch (err) {
        console.error('⚠️ Supabase hydration warning (offline or network error):', err);
        this.isHydrated = true;
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
    const tableName = KEY_TO_TABLE_MAP[key] || KEY_TO_TABLE_MAP[`nzm_jkr_${key}`];

    if (tableName) {
      if (!Array.isArray(value)) {
        const prefixedKey = key.startsWith('nzm_jkr_') ? key : `nzm_jkr_${key}`;
        const cleanKey = key.replace(/^nzm_jkr_/, '');
        const now = new Date().toISOString();
        const rows = [{ key: cleanKey, value, updated_at: now }];
        if (prefixedKey !== cleanKey) {
          rows.push({ key: prefixedKey, value, updated_at: now });
        }
        await supabase.from('system_kv').upsert(rows, { onConflict: 'key' });
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
      const prefixedKey = key.startsWith('nzm_jkr_') ? key : `nzm_jkr_${key}`;
      const cleanKey = key.replace(/^nzm_jkr_/, '');
      const now = new Date().toISOString();
      const rows = [{ key: cleanKey, value, updated_at: now }];
      if (prefixedKey !== cleanKey) {
        rows.push({ key: prefixedKey, value, updated_at: now });
      }
      await supabase.from('system_kv').upsert(rows, { onConflict: 'key' });
    }
  }

  // 6. Supabase Realtime Channels
  private setupRealtimeSync(): void {
    try {
      const channel = supabase.channel('erp_cloud_sync');

      // Listen to system_kv changes
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'system_kv' }, payload => {
        if (payload.eventType === 'DELETE') {
          const oldKey = (payload.old as any)?.key;
          if (oldKey) {
            this.cache.delete(oldKey);
            const altKey = oldKey.startsWith('nzm_jkr_') ? oldKey.replace(/^nzm_jkr_/, '') : `nzm_jkr_${oldKey}`;
            this.cache.delete(altKey);
            eventBus.publish('SUPABASE_KV_UPDATED', { key: oldKey });
            eventBus.publish('DATA_SYNCED', { table: 'system_kv', key: oldKey });
          }
        } else if (payload.new && (payload.new as any).key) {
          const k = (payload.new as any).key;
          const v = (payload.new as any).value;
          this.cache.set(k, v);
          if (!k.startsWith('nzm_jkr_')) {
            this.cache.set(`nzm_jkr_${k}`, v);
          } else {
            this.cache.set(k.replace(/^nzm_jkr_/, ''), v);
          }
          eventBus.publish('SUPABASE_KV_UPDATED', { key: k });
          eventBus.publish('DATA_SYNCED', { table: 'system_kv', key: k });
        }
      });

      // Listen to high-traffic tables
      const trackedTables = ['tickets', 'dealer_tickets', 'store_wallets', 'store_wallet_transactions', 'dealer_wallets', 'customers', 'dealers'];
      trackedTables.forEach(tbl => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table: tbl }, payload => {
          const storageKey = Object.keys(KEY_TO_TABLE_MAP).find(k => KEY_TO_TABLE_MAP[k] === tbl);
          if (!storageKey) return;
          const cleanStorageKey = storageKey.replace(/^nzm_jkr_/, '');

          const currentList: any[] = this.cache.get(storageKey) || this.cache.get(cleanStorageKey) || [];
          if (payload.eventType === 'INSERT' && (payload.new as any)?.data) {
            const newItem = (payload.new as any).data;
            if (!currentList.some(x => x.id === newItem.id)) {
              const nextList = [newItem, ...currentList];
              this.cache.set(storageKey, nextList);
              this.cache.set(cleanStorageKey, nextList);
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
            const nextList = [...currentList];
            this.cache.set(storageKey, nextList);
            this.cache.set(cleanStorageKey, nextList);
            eventBus.publish('DATA_SYNCED', { table: tbl, id: updatedItem.id });
          } else if (payload.eventType === 'DELETE' && (payload.old as any)?.id) {
            const deletedId = (payload.old as any).id;
            const nextList = currentList.filter(x => x.id !== deletedId);
            this.cache.set(storageKey, nextList);
            this.cache.set(cleanStorageKey, nextList);
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
        // UI preferences bypass interceptor directly to native localStorage
        if (UI_STORAGE_KEYS.has(key)) {
          return origGetItem(key);
        }

        if (key.startsWith('nzm_jkr_') || key.startsWith('jkr_') || KEY_TO_TABLE_MAP[key]) {
          if (this.cache.has(key)) {
            const val = this.cache.get(key);
            return val !== undefined ? JSON.stringify(val) : null;
          }
        }
        return origGetItem(key);
      };

      window.localStorage.setItem = (key: string, value: string): void => {
        // UI preferences bypass interceptor directly to native localStorage
        if (UI_STORAGE_KEYS.has(key)) {
          origSetItem(key, value);
          return;
        }

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
        // UI preferences bypass interceptor directly to native localStorage
        if (UI_STORAGE_KEYS.has(key)) {
          origRemoveItem(key);
          return;
        }

        if (key.startsWith('nzm_jkr_') || key.startsWith('jkr_') || KEY_TO_TABLE_MAP[key]) {
          this.removeItem(key);
        }
        origRemoveItem(key);
      };
    } catch (_) {}
  }
}

export const supabaseStorage = new SupabaseStorageAdapter();
