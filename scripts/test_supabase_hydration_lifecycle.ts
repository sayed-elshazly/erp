// scripts/test_supabase_hydration_lifecycle.ts
// Verification script for fast Supabase parallel hydration lifecycle, phone conflict detection, UI state preservation, and cache resilience.

import { supabaseStorage, UI_STORAGE_KEYS } from '../src/database/supabaseStorage';
import { db } from '../src/database/db';
import { eventBus } from '../src/services/eventBus';

async function runTests() {
  console.log('🚀 Starting Supabase Hydration & Lifecycle Tests...\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error('     Details:', details);
    }
  }

  // Test 1: Event Bus Hydration Listener
  let hydrationEventReceived = false;
  let eventDuration = 0;
  eventBus.subscribe('SUPABASE_HYDRATED', (data: any) => {
    hydrationEventReceived = true;
    eventDuration = data?.duration || 0;
  });

  // Test 2: Parallel Hydration Execution & Timing
  const start = Date.now();
  await supabaseStorage.waitForHydration();
  const elapsed = Date.now() - start;

  console.log(`⏱️ Hydration completed in ${elapsed}ms (Event reported: ${eventDuration}ms)`);
  assert(supabaseStorage.isStorageHydrated(), 'Storage isHydrated flag is true');
  assert(elapsed < 4000, `Hydration completed in reasonable time (${elapsed}ms < 4000ms)`);

  // Test 3: Data Integrity - Verify Cloud Subscription Clients Presence
  const subClients = db.getSubscriptionClients(true);
  console.log(`📋 Found ${subClients.length} subscription clients in hydrated cache.`);

  const hgjf = subClients.find(c => c.name === 'hgjf' || c.phone.includes('0101101010'));
  const eggplant = subClients.find(c => c.name === 'البتنجان المشوي' || c.phone.includes('01020588996'));

  assert(Boolean(hgjf), 'Customer "hgjf" is present in hydrated cache', { found: hgjf });
  assert(Boolean(eggplant), 'Customer "البتنجان المشوي" is present in hydrated cache', { found: eggplant });
  assert(subClients.length >= 7, `Total subscription clients count is >= 7 (found: ${subClients.length})`);

  // Test 4: Phone Collision & Entity Detection Across All Modules
  const checkHgjf = db.isPhoneTaken('+010110101010');
  assert(
    checkHgjf.taken && checkHgjf.entityType === 'subscription_client',
    'Phone "+010110101010" is detected as taken by subscription_client',
    checkHgjf
  );

  const checkEggplant = db.isPhoneTaken('+201020588996');
  assert(
    checkEggplant.taken && checkEggplant.entityType === 'subscription_client',
    'Phone "+201020588996" is detected as taken by subscription_client',
    checkEggplant
  );

  const checkUnused = db.isPhoneTaken('+201099999999');
  assert(!checkUnused.taken, 'Unused phone "+201099999999" is recognized as available');

  // Test 5: Verify Legacy LocalStorage Cleanup Safety and UI Keys Preservation
  let nativeRemovedKeys: string[] = [];
  let interceptedRemoveCalled = false;

  const mockStorage: Record<string, string> = {
    'nzm_jkr_dummy_old_key': '{"old": true}',
    'jkr_legacy_cache': '123',
    'nzm_jkr_current_user': '{"id": "u1"}',
    'nzm_jkr_theme': '"dark"',
    'nzm_jkr_current_dept': '"customers"',
    'nzm_jkr_active_tabs': '[{"id":"dash"}]',
    'nzm_jkr_active_tab_id': '"dash"',
    'nzm_jkr_sidebar_groups': '["g1"]',
    'nzm_jkr_font_size': '"normal"'
  };

  (globalThis as any).window = {
    localStorage: {
      length: Object.keys(mockStorage).length,
      key: (i: number) => Object.keys(mockStorage)[i] || null,
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => { mockStorage[k] = v; },
      removeItem: (_k: string) => { interceptedRemoveCalled = true; }
    }
  };

  (globalThis as any).Storage = {
    prototype: {
      removeItem: {
        call: (_ctx: any, k: string) => {
          nativeRemovedKeys.push(k);
          delete mockStorage[k];
        }
      }
    }
  };

  supabaseStorage.clearLegacyLocalStorage();

  assert(
    !interceptedRemoveCalled,
    'clearLegacyLocalStorage does NOT call intercepted window.localStorage.removeItem (prevents cloud data wipe)'
  );
  assert(
    nativeRemovedKeys.includes('nzm_jkr_dummy_old_key') && nativeRemovedKeys.includes('jkr_legacy_cache'),
    'clearLegacyLocalStorage removes legacy keys via native prototype method'
  );

  // Check all UI keys were preserved
  const allUiPreserved = Array.from(UI_STORAGE_KEYS).every(k => !nativeRemovedKeys.includes(k));
  assert(
    allUiPreserved,
    'clearLegacyLocalStorage preserves all UI keys (theme, user, dept, tabs, sidebar, font size)'
  );

  // Test 6: Bidirectional Cache Sync & Non-prefixed / Prefixed Coherence
  supabaseStorage.setItem('test_custom_config', { mode: 'fast' });
  const readClean = supabaseStorage.getItem<{ mode: string }>('test_custom_config', { mode: 'fallback' });
  const readPrefixed = supabaseStorage.getItem<{ mode: string }>('nzm_jkr_test_custom_config', { mode: 'fallback' });
  assert(
    readClean.mode === 'fast' && readPrefixed.mode === 'fast',
    'Bidirectional cache sync ensures data is readable with or without nzm_jkr_ prefix'
  );

  // Test 7: Middleman Client Entity Detection in isPhoneTaken
  const mmClients = db.getMiddlemanClients(true);
  const retailCustomers = db.getCustomers(true);
  const uniqueMmClient = mmClients.find(m => !retailCustomers.some(c => c.phone.includes(m.phone) || m.phone.includes(c.phone)));
  if (uniqueMmClient) {
    const checkMm = db.isPhoneTaken(uniqueMmClient.phone);
    assert(
      checkMm.taken && checkMm.entityType === 'middleman_client',
      `Middleman client phone "${uniqueMmClient.phone}" is detected as middleman_client`,
      checkMm
    );
  }

  // Cleanup test key
  supabaseStorage.removeItem('test_custom_config');

  console.log(`\n==============================================`);
  console.log(`📊 Test Summary: ${passedTests}/${totalTests} Passed`);
  console.log(`==============================================\n`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed successfully!');
    process.exit(0);
  } else {
    console.error('❌ Some tests failed.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
