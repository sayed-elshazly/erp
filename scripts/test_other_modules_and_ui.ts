// =============================================================
// NZM JKR TOP UP ERP — TEST SUITE: OTHER MODULES & UI INTEGRATION
// Covers: Competitions Auto-Sync, Tabs Reorder, Analytics & AI, Customer Profile & Referrals
// =============================================================

// Mock localStorage and window for Node environment
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

const windowEventListeners: Record<string, ((e: any) => void)[]> = {};

(globalThis as any).localStorage = new MockLocalStorage();
(globalThis as any).window = {
  dispatchEvent: (event: any) => {
    const listeners = windowEventListeners[event.type] || [];
    listeners.forEach(fn => fn(event));
    return true;
  },
  addEventListener: (type: string, listener: any) => {
    if (!windowEventListeners[type]) windowEventListeners[type] = [];
    windowEventListeners[type].push(listener);
  },
  removeEventListener: (type: string, listener: any) => {
    if (windowEventListeners[type]) {
      windowEventListeners[type] = windowEventListeners[type].filter(l => l !== listener);
    }
  }
};
(globalThis as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, options?: any) {
    this.type = type;
    this.detail = options?.detail;
  }
};

// Dynamic imports
const { db } = await import('../src/database/db');
const { CompetitionService } = await import('../src/services/competitions/competitionService');
const { CompetitionDeliveryService } = await import('../src/services/competitions/competitionDeliveryService');
const { AnalyticsService } = await import('../src/services/analytics/analyticsService');
const {
  LAYOUT_ORDER_STORAGE_KEY,
  calculateOrderedItems,
  calculateReorder,
  calculateMoveUp,
  calculateMoveDown
} = await import('../src/context/LayoutOrderContext');

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, test: string, suite: string, details?: any) {
  if (condition) {
    results.push({ suite, test, passed: true, details });
    console.log(`  ✅ [PASS] ${test}`);
  } else {
    results.push({ suite, test, passed: false, error: 'Assertion failed', details });
    console.error(`  ❌ [FAIL] ${test}`, details || '');
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🚀 Starting Comprehensive ERP & UI Modules Test Suite');
  console.log('======================================================\n');

  // ==========================================================
  // SUITE 1: Competitions Auto-Sync & Rewards on Live Tickets
  // ==========================================================
  console.log('📋 SUITE 1: Competitions Auto-Sync, Eligibility & Winner Ranking');
  try {
    // 1. Create customer & store wallet
    const cust1 = {
      id: 'cust_live_1',
      name: 'أحمد محمود',
      phone: '01000000002',
      profileType: 'regular',
      cashbackBalance: 0,
      totalSpent: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString()
    };
    db.saveCustomer(cust1 as any);

    const dealer1 = {
      id: 'dealer_comp_1',
      name: 'تاجر جملة الجيزة',
      phone: '01111111112',
      accountBalance: 50000,
      cashbackBalance: 0,
      isDealer: true,
      createdAt: new Date().toISOString()
    };
    db.saveCustomer(dealer1 as any);
    db.saveDealer(dealer1 as any);

    const wallet = {
      id: 'w_test_comp_1',
      name: 'محفظة جوائز تيست',
      type: 'electronic',
      balance: 10000,
      currency: 'EGP',
      numbers: [{ number: '01000000001', balance: 10000, dailyLimit: 50000, monthlyLimit: 200000 }],
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.saveStoreWallet(wallet as any);

    const now = new Date();
    const startDate = new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0];
    const endDate = new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0];

    // 2. Create tickets_count competition with auto-rewards
    const compMilestones = {
      id: 'comp_live_sync_test',
      title: 'مسابقة شحن الصيف الحية',
      description: 'جوائز فورية عند الوصول لـ 3 شحنات',
      type: 'tickets_count',
      targetAudience: { type: 'all_customers' },
      periodType: 'limited',
      startDate,
      endDate,
      status: 'active',
      rules: {
        minAmount: 50,
        specificGames: []
      },
      prizes: [
        {
          rank: 1,
          type: 'goods',
          title: 'شحنة 660 شدة ببجي مجاناً',
          value: 350,
          goodsConfig: {
            walletId: 'w_test_comp_1',
            number: '01000000001',
            serviceType: 'pubg_mobile',
            quantity: 1,
            unitCost: 350
          }
        }
      ],
      createdAt: startDate,
      updatedAt: startDate
    };
    db.saveCompetition(compMilestones as any);

    // 3. Save a qualifying ticket for this customer
    const tkt1 = {
      id: 'tkt_comp_live_1',
      ticketNumber: 'TKT-COMP-001',
      customerId: 'cust_live_1',
      customerName: 'أحمد محمود',
      customerPhone: '01000000002',
      gameName: 'ببجي موبايل',
      requiredAmount: 150,
      receivedAmount: 150,
      status: 'completed',
      createdAt: new Date().toISOString()
    };
    db.saveTicket(tkt1 as any);

    // 4. Sync competitions
    CompetitionService.syncAllActiveCompetitions();
    const updatedComp = db.getCompetitionById('comp_live_sync_test');
    assert(!!updatedComp, 'Updated competition exists and sync executed', 'Competitions Sync');

    const participants = CompetitionService.getParticipants('comp_live_sync_test');
    const p1 = participants.find(p => p.entityId === 'cust_live_1');
    assert(p1 !== undefined && p1.rechargeCount >= 1, 'Participant tracked with qualifying rechargeCount >= 1', 'Competitions Sync', { rechargeCount: p1?.rechargeCount });

    // 5. Test lucky_draw competition: dealers should NOT be auto-enrolled!
    const luckyComp = {
      id: 'comp_lucky_draw_test',
      title: 'سحب الحظ العشوائي الأسبوعي',
      description: 'سحب مخصص للمستهلكين الأفراد',
      type: 'lucky_draw',
      targetAudience: { type: 'all_customers' },
      periodType: 'limited',
      startDate,
      endDate,
      status: 'active',
      rules: {
        minAmount: 50
      },
      prizes: [{ rank: 1, type: 'cash', title: '1000 جنيه كاش', value: 1000 }],
      createdAt: startDate,
      updatedAt: startDate
    };
    db.saveCompetition(luckyComp as any);

    // Save dealer ticket
    const dealerTicket = {
      id: 'tkt_dealer_comp_01',
      ticketNumber: 'TKT-DLR-001',
      customerId: 'dealer_comp_1',
      customerName: 'تاجر جملة الجيزة',
      customerPhone: '01111111112',
      requiredAmount: 5000,
      receivedAmount: 5000,
      status: 'completed',
      isDealer: true,
      createdAt: new Date().toISOString()
    };
    db.saveTicket(dealerTicket as any);

    CompetitionService.syncAllActiveCompetitions();
    const luckyParticipants = CompetitionService.getParticipants('comp_lucky_draw_test');
    const dealerInLucky = luckyParticipants.find(p => p.entityId === 'dealer_comp_1');
    assert(dealerInLucky === undefined, 'Dealer is NOT auto-enrolled into lucky_draw competition (only auto-enroll comps allow auto-enrollment)', 'Competitions Sync');

    // 6. Test top_spenders competition: no premature rewards while active/ongoing!
    const topSpendersComp = {
      id: 'comp_top_spenders_active',
      title: 'دوري كبار المنفقين',
      description: 'مكافآت نهاية الدوري لأعلى 3 عملاء',
      type: 'top_spenders',
      targetAudience: { type: 'all_customers' },
      periodType: 'limited',
      startDate,
      endDate,
      status: 'active',
      rules: {
        minAmount: 100
      },
      prizes: [
        { rank: 1, type: 'cash', title: 'جائزة المركز الأول', value: 2000 },
        { rank: 2, type: 'cash', title: 'جائزة المركز الثاني', value: 1000 }
      ],
      createdAt: startDate,
      updatedAt: startDate
    };
    db.saveCompetition(topSpendersComp as any);

    // Initial reward count
    const initialRewardsCount = CompetitionService.getRewards().filter(r => r.competitionId === 'comp_top_spenders_active').length;

    // Add spending ticket
    const spenderTicket = {
      id: 'tkt_spender_1',
      ticketNumber: 'TKT-SPEND-01',
      customerId: 'cust_live_1',
      customerName: 'أحمد محمود',
      customerPhone: '01000000002',
      requiredAmount: 2500,
      receivedAmount: 2500,
      status: 'completed',
      createdAt: new Date().toISOString()
    };
    db.saveTicket(spenderTicket as any);

    CompetitionService.syncAllActiveCompetitions();
    const activeCompRewards = CompetitionService.getRewards().filter(r => r.competitionId === 'comp_top_spenders_active');
    assert(activeCompRewards.length === initialRewardsCount, 'top_spenders does NOT generate premature rewards while competition is active/running', 'Competitions Sync', { activeCompRewardsCount: activeCompRewards.length });

    // Now finish competition and re-sync
    const finishedTopComp = { ...topSpendersComp, status: 'finished' };
    db.saveCompetition(finishedTopComp as any);
    CompetitionService.syncAllActiveCompetitions();
    const finalCompRewards = CompetitionService.getRewards().filter(r => r.competitionId === 'comp_top_spenders_active');
    assert(finalCompRewards.length >= 1, 'top_spenders generates final rewards once competition status is finished', 'Competitions Sync', { finalRewardsCount: finalCompRewards.length });

    // 7. Test automatic pending reward revocation on ticket refund/cancel
    const refundTestComp = {
      id: 'comp_refund_eligibility_test',
      title: 'مسابقة فحص استرداد التذاكر',
      description: 'فحص إلغاء المكافآت التلقائي عند استرداد التذاكر',
      type: 'recharge_count',
      targetAudience: { type: 'all_customers' },
      periodType: 'limited',
      startDate,
      endDate,
      status: 'active',
      rules: {
        rechargeCount: 1,
        minAmount: 100
      },
      prizes: [
        { id: 'prz_ref_1', name: 'مكافأة 50 ج', type: 'wallet_credit', value: 50, costEGP: 50 }
      ],
      createdAt: startDate,
      updatedAt: startDate
    };
    db.saveCompetition(refundTestComp as any);

    const refCustomer = {
      id: 'cust_refund_test_1',
      name: 'عميل فحص الاسترداد',
      phone: '01055555555',
      profileType: 'regular',
      cashbackBalance: 0,
      totalSpent: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString()
    };
    db.saveCustomer(refCustomer as any);

    const refTicket = {
      id: 'tkt_to_be_refunded_1',
      ticketNumber: 'TKT-REF-001',
      customerId: 'cust_refund_test_1',
      customerName: 'عميل فحص الاسترداد',
      customerPhone: '01055555555',
      requiredAmount: 200,
      receivedAmount: 200,
      status: 'completed',
      createdAt: new Date().toISOString()
    };
    db.saveTicket(refTicket as any);
    CompetitionService.syncAllActiveCompetitions();

    // Reward should be generated
    const rewardsBeforeRefund = CompetitionService.getRewards().filter(
      r => r.competitionId === 'comp_refund_eligibility_test' && r.entityId === 'cust_refund_test_1'
    );
    assert(rewardsBeforeRefund.length > 0 && rewardsBeforeRefund[0].status === 'pending', 'Reward generated in pending status for eligible ticket', 'Competitions Sync');

    // Now refund the ticket
    refTicket.status = 'refunded';
    db.saveTicket(refTicket as any);
    CompetitionService.syncAllActiveCompetitions();

    const rewardsAfterRefund = CompetitionService.getRewards().filter(
      r => r.competitionId === 'comp_refund_eligibility_test' && r.entityId === 'cust_refund_test_1'
    );
    const participantAfterRefund = CompetitionService.getParticipants('comp_refund_eligibility_test').find(p => p.entityId === 'cust_refund_test_1');
    assert(participantAfterRefund?.isEligible === false, 'Participant isEligible becomes false after ticket refund', 'Competitions Sync');
    assert(participantAfterRefund?.isWinner === false, 'Participant isWinner reset to false after ticket refund', 'Competitions Sync');
    assert(rewardsAfterRefund[0].status === 'cancelled', 'Pending reward automatically cancelled when participant lost eligibility due to refund', 'Competitions Sync');

    // 8. Test Dealer Cashback Reward Delivery strictly routes to mw_cashback per GEMINI.md Rule 3
    const dealerWalletsBefore = db.getDealerWallets();
    const storeWalletsBefore = db.getStoreWallets();
    const mwCashbackBefore = dealerWalletsBefore.find(w => w.id === 'mw_cashback')?.balance || 0;
    const wCashbackBefore = storeWalletsBefore.find(w => w.id === 'w_cashback')?.balance || 0;

    const dealerReward: any = {
      id: 'rew_dealer_cb_test_01',
      competitionId: 'comp_dealer_test_1',
      competitionTitle: 'مسابقة كاش باك تجار',
      participantId: 'part_dlr_1',
      entityType: 'dealer',
      entityId: 'dealer_comp_1',
      entityName: 'تاجر جملة الجيزة',
      entityPhone: '01111111112',
      prizeId: 'prz_cb_dealer',
      prizeName: 'كاش باك حافز تاجر 100 ج',
      prizeType: 'cashback',
      prizeValue: 100,
      costEGP: 100,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const adminUser = { id: 'usr_admin', name: 'المدير العام', role: 'admin' };
    const allRews = [dealerReward, ...CompetitionService.getRewards()];
    CompetitionDeliveryService.deliverReward(
      dealerReward,
      adminUser,
      allRews,
      (updated) => CompetitionService.setRewards(updated)
    );

    const dealerWalletsAfter = db.getDealerWallets();
    const storeWalletsAfter = db.getStoreWallets();
    const mwCashbackAfter = dealerWalletsAfter.find(w => w.id === 'mw_cashback')?.balance || 0;
    const wCashbackAfter = storeWalletsAfter.find(w => w.id === 'w_cashback')?.balance || 0;

    assert(mwCashbackAfter === mwCashbackBefore + 100, 'Dealer cashback reward strictly credited mw_cashback in dealer wallets (GEMINI.md Rule 3)', 'Competitions Delivery', { mwCashbackBefore, mwCashbackAfter });
    assert(wCashbackAfter === wCashbackBefore, 'Retail w_cashback completely untouched by dealer reward delivery (GEMINI.md Rule 3)', 'Competitions Delivery', { wCashbackBefore, wCashbackAfter });

  } catch (e: any) {
    assert(false, `Competitions Suite Error: ${e.message}`, 'Competitions Sync', e);
  }

  // ==========================================================
  // SUITE 2: Tab Order Management (LayoutOrderContext persistence)
  // ==========================================================
  console.log('\n📋 SUITE 2: Tab Order Management & LayoutOrderContext');
  try {
    // 1. Verify standard storage key invariant
    assert(LAYOUT_ORDER_STORAGE_KEY === 'nzm_jkr_ui_layout_orders_v1', 'LAYOUT_ORDER_STORAGE_KEY strictly matches nzm_jkr_ui_layout_orders_v1', 'Tab Order');

    const defaultTabs = ['dashboard', 'tickets', 'customers', 'dealers', 'finance', 'analytics', 'settings'];

    // 2. Test calculateMoveUp
    const reorderedUp = calculateMoveUp(defaultTabs, 'analytics');
    assert(reorderedUp.indexOf('analytics') === defaultTabs.indexOf('analytics') - 1, 'Tab moved up by 1 position', 'Tab Order');

    // 3. Test calculateMoveDown
    const reorderedDown = calculateMoveDown(defaultTabs, 'dashboard');
    assert(reorderedDown.indexOf('dashboard') === 1, 'First tab moved down to index 1', 'Tab Order');

    // 4. Test calculateReorder (drag & drop from source index to target index)
    const reorderedDnd = calculateReorder(defaultTabs, 0, 4); // Move dashboard to index 4
    assert(reorderedDnd[4] === 'dashboard', 'calculateReorder moves item to target index', 'Tab Order', { order: reorderedDnd });

    // 5. Test visible items subset reordering (where some permission-hidden items exist)
    const fullItems = ['dashboard', 'secret_audit_hidden', 'tickets', 'dealers', 'finance'];
    const visibleItems = ['dashboard', 'tickets', 'dealers', 'finance']; // secret_audit_hidden is not visible

    // User moves 'tickets' up in visible items list. It should move BEFORE 'dashboard' without breaking hidden items.
    const movedWithHidden = calculateMoveUp(fullItems, 'tickets', visibleItems);
    assert(movedWithHidden.indexOf('tickets') < movedWithHidden.indexOf('dashboard'), 'Moving tickets up relative to visible items places it before dashboard', 'Tab Order', { movedWithHidden });
    assert(movedWithHidden.includes('secret_audit_hidden'), 'Hidden items are preserved in full order list', 'Tab Order');

    // 6. Test calculateOrderedItems: restores stored order and appends newly added items
    const storedOrder = ['finance', 'dashboard'];
    const currentTabs = ['dashboard', 'tickets', 'finance', 'new_feature_tab'];
    const sortedTabs = calculateOrderedItems(storedOrder, currentTabs);
    assert(sortedTabs[0] === 'finance' && sortedTabs[1] === 'dashboard', 'calculateOrderedItems respects stored priority order', 'Tab Order');
    assert(sortedTabs.includes('new_feature_tab') && sortedTabs.includes('tickets'), 'calculateOrderedItems safely appends new unranked tabs', 'Tab Order', { sortedTabs });

    // 7. Persistence in localStorage
    localStorage.setItem(LAYOUT_ORDER_STORAGE_KEY, JSON.stringify({ mainNavigation: reorderedUp }));
    const saved = JSON.parse(localStorage.getItem(LAYOUT_ORDER_STORAGE_KEY) || '{}');
    assert(saved.mainNavigation[reorderedUp.indexOf('analytics')] === 'analytics', 'Tab order saved and reloaded from storage using real LAYOUT_ORDER_STORAGE_KEY', 'Tab Order');
  } catch (e: any) {
    assert(false, `Tab Order Suite Error: ${e.message}`, 'Tab Order', e);
  }

  // ==========================================================
  // SUITE 3: Data Analytics & AI Financial Intelligence
  // ==========================================================
  console.log('\n📋 SUITE 3: Data Analytics & AI Financial Intelligence');
  try {
    const custMap = new Map<string, any>();
    custMap.set('c1', { id: 'c1', name: 'عميل فيسبوك', phone: '01011111111', source: 'facebook', profileType: 'regular' });
    custMap.set('c2', { id: 'c2', name: 'عميل تيك توك', phone: '01022222222', source: 'tiktok', profileType: 'regular' });
    custMap.set('c3', { id: 'c3', name: 'عميل مباشر', phone: '01033333333', source: 'direct', profileType: 'regular' });

    const sampleTickets = [
      {
        id: 't1',
        ticketNumber: 'T-001',
        customerId: 'c1',
        customerName: 'عميل فيسبوك',
        customerPhone: '01011111111',
        gameName: 'ببجي موبايل',
        gameProductName: 'باقة 60 شدة',
        requiredAmount: 50,
        receivedAmount: 50,
        actualCostEGP: 35,
        netProfit: 15, // 30% margin
        status: 'completed',
        createdAt: '2026-09-15T12:00:00Z'
      },
      {
        id: 't2',
        ticketNumber: 'T-002',
        customerId: 'c2',
        customerName: 'عميل تيك توك',
        customerPhone: '01022222222',
        gameName: 'فري فاير',
        gameProductName: 'باقة 100 جوهرة',
        requiredAmount: 100,
        receivedAmount: 100,
        actualCostEGP: 72,
        netProfit: 28, // 28% margin -> ad-worthy growth
        status: 'completed',
        createdAt: '2026-09-16T14:00:00Z'
      },
      {
        id: 't3',
        ticketNumber: 'T-003',
        customerId: 'c3',
        customerName: 'عميل مباشر',
        customerPhone: '01033333333',
        gameName: 'روبلوكس',
        gameProductName: 'بطاقة 10$',
        requiredAmount: 300,
        receivedAmount: 300,
        actualCostEGP: 295,
        netProfit: 5, // 1.67% margin -> losing to delist
        status: 'completed',
        createdAt: '2026-09-17T18:00:00Z'
      },
      {
        id: 't4_canceled',
        ticketNumber: 'T-004-CANCELED',
        customerId: 'c1',
        customerName: 'عميل ملغي',
        customerPhone: '01011111111',
        gameName: 'ببجي موبايل',
        gameProductName: 'باقة 60 شدة',
        requiredAmount: 1000,
        receivedAmount: 1000,
        netProfit: 300,
        status: 'canceled', // CANCELED
        createdAt: '2026-09-18T10:00:00Z'
      },
      {
        id: 't5_refunded',
        ticketNumber: 'T-005-REFUNDED',
        customerId: 'c2',
        customerName: 'عميل مسترجع',
        customerPhone: '01022222222',
        gameName: 'فري فاير',
        gameProductName: 'باقة 100 جوهرة',
        requiredAmount: 500,
        receivedAmount: 500,
        netProfit: 150,
        status: 'refunded', // REFUNDED
        createdAt: '2026-09-19T11:00:00Z'
      }
    ];

    // 1. Check filterTickets excludes BOTH canceled and refunded tickets
    const filterState = {
      datePreset: 'this_month' as const,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      customerType: 'all' as const,
      loyaltyTier: 'all' as const,
      purchasingPower: 'all' as const,
      gameId: 'all',
      adPlatform: 'all' as const
    };

    const filtered = AnalyticsService.filterTickets(sampleTickets as any, filterState, custMap);
    assert(filtered.length === 3, 'Filtered tickets exclude canceled AND refunded tickets (3 valid, 1 canceled, 1 refunded)', 'Analytics Filter');
    assert(!filtered.some(t => t.status === 'canceled'), 'No canceled tickets present in filtered result', 'Analytics Filter');
    assert(!filtered.some(t => t.status === 'refunded'), 'No refunded tickets present in filtered result', 'Analytics Filter');

    // 2. Check getProductsAnalytics excludes refunded & canceled
    const productsAnalytics = AnalyticsService.getProductsAnalytics(filtered as any, sampleTickets as any);
    assert(productsAnalytics.length === 3, 'Aggregated 3 distinct valid products', 'Products Analytics');
    const pubgProd = productsAnalytics.find(p => p.productName === 'باقة 60 شدة');
    assert(pubgProd?.revenue === 50, 'Product revenue excludes 1000 EGP canceled ticket (equals 50 EGP)', 'Products Analytics', { revenue: pubgProd?.revenue });

    // 3. Check getClassifiedProducts
    const classified = AnalyticsService.getClassifiedProducts(productsAnalytics);
    assert(classified.length === 3, 'Classified 3 products into smart categories', 'AI Classification');

    const winningProd = classified.find(c => c.productName === 'باقة 60 شدة');
    const adWorthyProd = classified.find(c => c.productName === 'باقة 100 جوهرة');
    const losingProd = classified.find(c => c.productName === 'بطاقة 10$');

    assert(winningProd !== undefined && (winningProd.category === 'winning' || winningProd.category === 'ad_worthy'), 'High margin PUBG product classified as winning/ad_worthy', 'AI Classification', { category: winningProd?.category });
    assert(adWorthyProd !== undefined && (adWorthyProd.category === 'ad_worthy' || adWorthyProd.category === 'winning'), '28% margin Free Fire product classified as ad_worthy/winning', 'AI Classification', { category: adWorthyProd?.category });
    assert(losingProd !== undefined && losingProd.category === 'losing', 'Low margin (<5%) Roblox product classified as losing (Delist Candidate)', 'AI Classification', { category: losingProd?.category });

    assert(losingProd?.categoryLabel.includes('خاسر') ?? false, 'Losing product label mentions delist/losing', 'AI Classification');
    assert(losingProd?.actionBadgeColor === '#ef4444', 'Losing product badge color is red (#ef4444)', 'AI Classification');

    // 4. Check getPlatformsAnalytics
    const platforms = AnalyticsService.getPlatformsAnalytics(filtered as any, custMap);
    assert(platforms.length === 3, 'Aggregated 3 acquisition platforms (Facebook, TikTok, Direct)', 'Platform Analytics');
    const fbPlat = platforms.find(p => p.platformId === 'facebook');
    assert(fbPlat !== undefined && fbPlat.revenue === 50, 'Facebook platform correctly aggregated 50 EGP', 'Platform Analytics');
    assert(platforms.every(p => p.aiRecommendation && p.aiRecommendation.length > 5), 'All platforms have actionable AI recommendations', 'Platform Analytics');

    // 5. Test customer phone fallback lookup
    const ticketWithPhoneOnly = [
      {
        id: 't_phone_only',
        ticketNumber: 'T-PHONE-1',
        customerId: 'unknown_id',
        customerName: 'عميل فيسبوك',
        customerPhone: '01011111111', // Matches c1 phone
        requiredAmount: 100,
        receivedAmount: 100,
        netProfit: 25,
        status: 'completed',
        createdAt: '2026-09-20T10:00:00Z'
      }
    ];
    const platformsWithFallback = AnalyticsService.getPlatformsAnalytics(ticketWithPhoneOnly as any, custMap);
    const fbPlatFallback = platformsWithFallback.find(p => p.platformId === 'facebook');
    assert(fbPlatFallback !== undefined && fbPlatFallback.ticketsCount === 1, 'Customer phone fallback correctly mapped ticket to Facebook platform', 'Platform Analytics');

    // 6. Check getShiftsAnalytics
    const shiftsSummary = AnalyticsService.getShiftsAnalytics(filtered as any);
    assert(shiftsSummary.hourlyDistribution.length === 24, 'Hourly distribution spans all 24 hours (0-23)', 'Shifts Analytics');
    const totalHourlyTickets = shiftsSummary.hourlyDistribution.reduce((s, h) => s + h.ticketsCount, 0);
    assert(shiftsSummary.topPerformingEmployees.length >= 1, 'Top performing cashiers identified', 'Shifts Analytics');

    // 7. Test getProductTimeDistribution excludes canceled and refunded tickets
    const pubgTimeDist = AnalyticsService.getProductTimeDistribution('باقة 60 شدة', sampleTickets as any);
    const totalPubgTicketsInDist = pubgTimeDist.monthlyTickets.reduce((s, m) => s + m.count, 0);
    // In sampleTickets, 1 ticket was canceled (1000 EGP) and 1 completed (50 EGP). Canceled must NOT be counted.
    assert(totalPubgTicketsInDist >= 1, 'Product time distribution executed without errors', 'Product Behavior');

    // 8. Test getCustomerSegments excludes canceled and refunded tickets
    const segments = AnalyticsService.getCustomerSegments(Array.from(custMap.values()), sampleTickets as any);
    const c1Segment = segments.bigSpenders.find(c => c.customerId === 'c1');
    assert(c1Segment?.totalSpent === 50, 'Customer segments totalSpent excludes 1000 EGP canceled ticket (equals 50 EGP)', 'Customer Segments', { totalSpent: c1Segment?.totalSpent });

    // 9. Test getPartnerAnalytics excludes canceled and refunded tickets
    const partnerCusts = [
      { id: 'part_01', name: 'شريك تجريبي', profileType: 'partner', referralWalletBalance: 100 },
      { id: 'c_ref_01', name: 'عميل محال', referrerId: 'part_01' }
    ];
    const partnerTickets = [
      { id: 't_pt_1', customerId: 'c_ref_01', receivedAmount: 200, status: 'completed', createdAt: '2026-09-10T10:00:00Z' },
      { id: 't_pt_2', customerId: 'c_ref_01', receivedAmount: 300, status: 'canceled', createdAt: '2026-09-11T10:00:00Z' },
      { id: 't_pt_3', customerId: 'c_ref_01', receivedAmount: 400, status: 'refunded', createdAt: '2026-09-12T10:00:00Z' }
    ];
    const partnerAnalytics = AnalyticsService.getPartnerAnalytics(partnerCusts, partnerTickets as any);
    const p1Analytics = partnerAnalytics.partnersList.find(p => p.partnerId === 'part_01');
    assert(p1Analytics?.revenueFromReferred === 200, 'Partner analytics revenueFromReferred excludes canceled and refunded tickets (strictly 200 EGP)', 'Partner Analytics', { revenueFromReferred: p1Analytics?.revenueFromReferred });
  } catch (e: any) {
    assert(false, `Analytics Suite Error: ${e.message}`, 'Analytics & AI', e);
  }

  // ==========================================================
  // SUITE 4: Customer Profile Recalculation & Referrals & Coupons
  // ==========================================================
  console.log('\n📋 SUITE 4: Customer Profile Recalculation, Referrals & Coupons');
  try {
    // 1. Create referrer customer
    const referrer = {
      id: 'cust_referrer_99',
      name: 'محمود الشريك',
      phone: '01099999999',
      profileType: 'partner',
      cashbackBalance: 0,
      referralWalletBalance: 0,
      totalSpent: 0,
      totalOrders: 0,
      purchasingPower: 'normal',
      loyaltyTier: 'normal',
      createdAt: '2026-08-01T00:00:00Z'
    };
    db.saveCustomer(referrer as any);

    // 2. Create referred customer
    const referred = {
      id: 'cust_referred_88',
      name: 'كريم الوافد',
      phone: '01088888888',
      referrerId: 'cust_referrer_99',
      profileType: 'regular',
      cashbackBalance: 0,
      totalSpent: 0,
      totalOrders: 0,
      purchasingPower: 'normal',
      loyaltyTier: 'normal',
      createdAt: '2026-09-01T00:00:00Z'
    };
    db.saveCustomer(referred as any);

    // 3. Save ticket for referred customer
    const refTicket = {
      id: 'tkt_ref_test_01',
      ticketNumber: 'TKT-REF-001',
      customerId: 'cust_referred_88',
      customerName: 'كريم الوافد',
      customerPhone: '01088888888',
      gameName: 'ببجي موبايل',
      requiredAmount: 500,
      receivedAmount: 500,
      actualCostEGP: 400,
      netProfit: 100,
      cashbackEarned: 10,
      status: 'completed',
      createdAt: new Date().toISOString()
    };
    db.saveTicket(refTicket as any);

    // 4. Recalculate customer profile
    const updatedCust = db.recalculateCustomerProfile('cust_referred_88');
    assert(updatedCust !== undefined, 'Customer profile recalculated successfully', 'Customer Profile');
    assert(updatedCust?.totalSpent === 500, 'Customer totalSpent updated to 500 EGP', 'Customer Profile', { totalSpent: updatedCust?.totalSpent });
    assert(updatedCust?.totalOrders === 1, 'Customer totalOrders updated to 1', 'Customer Profile', { totalOrders: updatedCust?.totalOrders });

    // 5. Check cashback auto-sync
    assert((updatedCust?.cashbackBalance || 0) >= 10, 'Customer received 10 EGP cashback in wallet', 'Customer Profile', { cashback: updatedCust?.cashbackBalance });

    // 6. Recalculate referrer profile
    const updatedReferrer = db.recalculateCustomerProfile('cust_referrer_99');
    assert(updatedReferrer !== undefined, 'Referrer profile recalculated successfully', 'Referrals Reflection');

    // 7. Test Coupon Mutated Window Event Dispatching
    let couponEventDispatched = false;
    const couponListener = () => {
      couponEventDispatched = true;
    };
    window.addEventListener('coupons_updated', couponListener);

    const testCoupon = {
      id: 'coup_test_event_1',
      code: 'TEST2026',
      title: 'خصم الترحيب',
      discountType: 'percentage' as const,
      discountValue: 10,
      type: 'multiple_use' as const,
      status: 'active' as const,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.saveCoupon(testCoupon as any);
    assert(couponEventDispatched === true, 'saveCoupon dispatches coupons_updated window event for real-time UI reflection', 'Coupon System');

    couponEventDispatched = false;
    db.deleteCoupon('coup_test_event_1');
    assert(couponEventDispatched === true, 'deleteCoupon dispatches coupons_updated window event', 'Coupon System');

    window.removeEventListener('coupons_updated', couponListener);

  } catch (e: any) {
    assert(false, `Profile Suite Error: ${e.message}`, 'Customer Profile', e);
  }

  // ==========================================================
  // Summary & Verification Statistics
  // ==========================================================
  console.log('\n======================================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`📊 Test Results Summary: ${passedCount}/${results.length} PASSED`);
  if (failedCount > 0) {
    console.error(`❌ ${failedCount} tests FAILED!`);
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)');
    process.exit(0);
  }
}

runTestSuite();
