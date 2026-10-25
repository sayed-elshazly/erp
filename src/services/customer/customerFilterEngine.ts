// =============================================================
// NZM JKR TOP UP ERP — Advanced Customer Filter & Query Engine
// =============================================================

import { Customer, CustomerTicket, CustomerNote } from '../../types/customer.types';
import { CustomerSubscription } from '../../types/subscription.types';

export type FilterRangeCondition = 'all' | 'gt' | 'lt' | 'between';

export interface CustomerFilterCriteria {
  // 1. Live Search
  search: string;

  // 2. Customer Type & Status
  customerType: 'all' | 'regular' | 'dealer' | 'reseller' | 'vip' | 'banned' | 'suspended';
  accountStatus: 'all' | 'active' | 'inactive' | 'banned' | 'suspended' | 'deleted';
  verificationStatus: 'all' | 'verified' | 'unverified';

  // 3. Financial & Balances
  accountBalanceCondition: FilterRangeCondition;
  accountBalanceMin?: number;
  accountBalanceMax?: number;

  cashbackBalanceCondition: FilterRangeCondition;
  cashbackBalanceMin?: number;
  cashbackBalanceMax?: number;

  referralBalanceCondition: FilterRangeCondition;
  referralBalanceMin?: number;
  referralBalanceMax?: number;

  totalSpentCondition: FilterRangeCondition;
  totalSpentMin?: number;
  totalSpentMax?: number;

  debtsStatus: 'all' | 'has_debt' | 'no_debt';
  cashbackStatus: 'all' | 'has_cashback' | 'no_cashback';
  profitStatus: 'all' | 'has_profit' | 'no_profit';

  // 4. Orders & Purchases
  ordersCountCondition: 'all' | 'zero' | 'between' | 'gt' | 'lt';
  ordersCountMin?: number;
  ordersCountMax?: number;

  purchaseFrequency: 'all' | 'once' | 'multiple' | 'more_than_10' | 'more_than_50';
  lastOrderValueCondition: FilterRangeCondition;
  lastOrderValueMin?: number;
  lastOrderValueMax?: number;

  firstShippingStatus: 'all' | 'used' | 'not_used';
  reservationsStatus: 'all' | 'has_reservations' | 'no_reservations';
  purchasedProductId: string; // 'all' or specific product
  purchasedGameId: string; // 'all' or specific game

  // 5. Dates & Activity
  createdAtPreset:
    | 'all'
    | 'today'
    | 'yesterday'
    | 'last_7_days'
    | 'last_30_days'
    | 'this_month'
    | 'last_month'
    | 'custom';
  createdAtStart?: string;
  createdAtEnd?: string;

  lastActivityPreset:
    | 'all'
    | 'online_now'
    | 'active_today'
    | 'inactive_week'
    | 'inactive_month'
    | 'custom';
  lastActivityStart?: string;
  lastActivityEnd?: string;

  // 6. Geography & Methods
  country: string; // 'all' or country name
  city: string; // 'all' or city/governorate name
  paymentMethod:
    | 'all'
    | 'vodafone_cash'
    | 'etisalat_cash'
    | 'orange_cash'
    | 'we_pay'
    | 'instapay'
    | 'bank_transfer'
    | 'other';

  // 7. Referral Linkage
  referralStatus: 'all' | 'has_referrer' | 'no_referrer' | 'has_referees' | 'no_referees';
}

export type CustomerSortField =
  | 'name'
  | 'createdAt'
  | 'lastActivity'
  | 'totalSpent'
  | 'totalOrders'
  | 'accountBalance'
  | 'cashbackBalance'
  | 'referralBalance'
  | 'profits'
  | 'maxOrder'
  | 'referees';

export type CustomerSortOrder = 'asc' | 'desc';

export interface SavedFilterPreset {
  id: string;
  name: string;
  criteria: CustomerFilterCriteria;
  createdAt: string;
}

export const INITIAL_CUSTOMER_FILTER_CRITERIA: CustomerFilterCriteria = {
  search: '',
  customerType: 'all',
  accountStatus: 'all',
  verificationStatus: 'all',

  accountBalanceCondition: 'all',
  cashbackBalanceCondition: 'all',
  referralBalanceCondition: 'all',
  totalSpentCondition: 'all',

  debtsStatus: 'all',
  cashbackStatus: 'all',
  profitStatus: 'all',

  ordersCountCondition: 'all',
  purchaseFrequency: 'all',
  lastOrderValueCondition: 'all',

  firstShippingStatus: 'all',
  reservationsStatus: 'all',
  purchasedProductId: 'all',
  purchasedGameId: 'all',

  createdAtPreset: 'all',
  lastActivityPreset: 'all',

  country: 'all',
  city: 'all',
  paymentMethod: 'all',

  referralStatus: 'all'
};

// Storage Key for Presets
const PRESETS_STORAGE_KEY = 'nzm_jkr_customer_filter_presets';

export const getSavedFilterPresets = (): SavedFilterPreset[] => {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load filter presets', err);
    return [];
  }
};

export const saveFilterPreset = (name: string, criteria: CustomerFilterCriteria): SavedFilterPreset => {
  const presets = getSavedFilterPresets();
  const newPreset: SavedFilterPreset = {
    id: 'preset_' + Date.now(),
    name: name.trim() || 'فلتر بدون اسم',
    criteria,
    createdAt: new Date().toISOString()
  };
  presets.unshift(newPreset);
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  return newPreset;
};

export const deleteFilterPreset = (id: string): void => {
  const presets = getSavedFilterPresets();
  const filtered = presets.filter(p => p.id !== id);
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
};

// Helper: Calculate number of active filters
export const countActiveFilters = (criteria: CustomerFilterCriteria): number => {
  let count = 0;
  if (criteria.customerType !== 'all') count++;
  if (criteria.accountStatus !== 'all') count++;
  if (criteria.verificationStatus !== 'all') count++;

  if (criteria.accountBalanceCondition !== 'all') count++;
  if (criteria.cashbackBalanceCondition !== 'all') count++;
  if (criteria.referralBalanceCondition !== 'all') count++;
  if (criteria.totalSpentCondition !== 'all') count++;

  if (criteria.debtsStatus !== 'all') count++;
  if (criteria.cashbackStatus !== 'all') count++;
  if (criteria.profitStatus !== 'all') count++;

  if (criteria.ordersCountCondition !== 'all') count++;
  if (criteria.purchaseFrequency !== 'all') count++;
  if (criteria.lastOrderValueCondition !== 'all') count++;

  if (criteria.firstShippingStatus !== 'all') count++;
  if (criteria.reservationsStatus !== 'all') count++;
  if (criteria.purchasedProductId !== 'all') count++;
  if (criteria.purchasedGameId !== 'all') count++;

  if (criteria.createdAtPreset !== 'all') count++;
  if (criteria.lastActivityPreset !== 'all') count++;

  if (criteria.country !== 'all') count++;
  if (criteria.city !== 'all') count++;
  if (criteria.paymentMethod !== 'all') count++;

  if (criteria.referralStatus !== 'all') count++;
  return count;
};

export interface CustomerFilterContextData {
  tickets?: CustomerTicket[];
  notes?: Record<string, CustomerNote[]>;
  subscriptions?: CustomerSubscription[];
}

/**
 * Filter customers based on criteria using strict compound logic (AND logic)
 */
export function filterCustomersEngine<T extends Customer = Customer>(
  customers: T[],
  criteria: CustomerFilterCriteria,
  contextData: CustomerFilterContextData = {}
): T[] {
  const { tickets = [], notes = {}, subscriptions = [] } = contextData;

  // Pre-calculate ticket items map and last ticket map for rapid querying
  const ticketsByCustomer: Record<string, CustomerTicket[]> = {};
  tickets.forEach(t => {
    if (!ticketsByCustomer[t.customerId]) {
      ticketsByCustomer[t.customerId] = [];
    }
    ticketsByCustomer[t.customerId].push(t);
  });

  const subsByCustomer: Record<string, CustomerSubscription[]> = {};
  subscriptions.forEach(s => {
    if (!subsByCustomer[s.customerId]) {
      subsByCustomer[s.customerId] = [];
    }
    subsByCustomer[s.customerId].push(s);
  });

  const query = criteria.search.trim().toLowerCase();

  return customers.filter(customer => {
    const custTickets = ticketsByCustomer[customer.id] || [];
    const custSubs = subsByCustomer[customer.id] || [];
    const custNotes = notes[customer.id] || [];

    // ========================================================
    // 1. Live Instant Search (All specified fields)
    // ========================================================
    if (query) {
      const matchName = customer.name?.toLowerCase().includes(query);
      const matchPhone = customer.phone?.toLowerCase().includes(query);
      const matchCode = customer.code?.toLowerCase().includes(query);
      const matchEmail = customer.email?.toLowerCase().includes(query);
      const matchShopName = customer.shopName?.toLowerCase().includes(query);
      const matchReferral = customer.referralCode?.toLowerCase().includes(query);
      const matchReferredBy = customer.referredByCode?.toLowerCase().includes(query) || customer.referrerName?.toLowerCase().includes(query);
      const matchExtraPhone = customer.extraPhone?.toLowerCase().includes(query);
      const matchAddress = customer.address?.toLowerCase().includes(query);

      // Check any saved game IDs or saved numbers
      const matchSavedIds = customer.savedPlayerGameIds?.some(id => id.toLowerCase().includes(query));

      // Check notes
      const matchNotes = custNotes.some(n => n.content?.toLowerCase().includes(query));

      if (
        !matchName &&
        !matchPhone &&
        !matchCode &&
        !matchEmail &&
        !matchShopName &&
        !matchReferral &&
        !matchReferredBy &&
        !matchExtraPhone &&
        !matchAddress &&
        !matchSavedIds &&
        !matchNotes
      ) {
        return false;
      }
    }

    // ========================================================
    // 2. Customer Type
    // ========================================================
    if (criteria.customerType !== 'all') {
      switch (criteria.customerType) {
        case 'regular':
          if (customer.profileType !== 'regular') return false;
          break;
        case 'dealer':
          if (customer.profileType !== 'shop' && customer.profileType !== 'partner') return false;
          break;
        case 'reseller':
          if (customer.profileType !== 'partner' && customer.profileType !== 'influencer') return false;
          break;
        case 'vip':
          if (customer.loyaltyTier !== 'vip') return false;
          break;
        case 'banned':
          if (!customer.isFrozen && customer.status !== 'frozen' && customer.status !== 'suspended') return false;
          break;
        case 'suspended':
          if (customer.status !== 'suspended' && customer.status !== 'inactive') return false;
          break;
      }
    }

    // ========================================================
    // 3. Account Status
    // ========================================================
    if (criteria.accountStatus !== 'all') {
      switch (criteria.accountStatus) {
        case 'active':
          if (customer.isFrozen || customer.isArchived || customer.status === 'suspended' || customer.status === 'inactive') return false;
          break;
        case 'inactive':
          if (customer.status !== 'inactive') return false;
          break;
        case 'banned':
          if (!customer.isFrozen && customer.status !== 'frozen') return false;
          break;
        case 'suspended':
          if (customer.status !== 'suspended') return false;
          break;
        case 'deleted':
          if (!customer.isArchived) return false;
          break;
      }
    }

    // ========================================================
    // 4. Verification Status
    // ========================================================
    if (criteria.verificationStatus !== 'all') {
      const isVerified = customer.loyaltyTier === 'vip' || customer.loyaltyTier === 'gold' || Boolean(customer.contractDurationMonths);
      if (criteria.verificationStatus === 'verified' && !isVerified) return false;
      if (criteria.verificationStatus === 'unverified' && isVerified) return false;
    }

    // ========================================================
    // 5. Balances: Account Balance (Balance / Debts)
    // ========================================================
    const accountBal = customer.accountBalance ?? customer.balance ?? 0;
    if (criteria.accountBalanceCondition === 'gt') {
      if (criteria.accountBalanceMin !== undefined && accountBal <= criteria.accountBalanceMin) return false;
    } else if (criteria.accountBalanceCondition === 'lt') {
      if (criteria.accountBalanceMax !== undefined && accountBal >= criteria.accountBalanceMax) return false;
    } else if (criteria.accountBalanceCondition === 'between') {
      const min = criteria.accountBalanceMin ?? -Infinity;
      const max = criteria.accountBalanceMax ?? Infinity;
      if (accountBal < min || accountBal > max) return false;
    }

    // 6. Balances: Cashback Balance
    const cbBal = customer.cashbackBalance ?? 0;
    if (criteria.cashbackBalanceCondition === 'gt') {
      if (criteria.cashbackBalanceMin !== undefined && cbBal <= criteria.cashbackBalanceMin) return false;
    } else if (criteria.cashbackBalanceCondition === 'lt') {
      if (criteria.cashbackBalanceMax !== undefined && cbBal >= criteria.cashbackBalanceMax) return false;
    } else if (criteria.cashbackBalanceCondition === 'between') {
      const min = criteria.cashbackBalanceMin ?? 0;
      const max = criteria.cashbackBalanceMax ?? Infinity;
      if (cbBal < min || cbBal > max) return false;
    }

    // 7. Balances: Referral Balance
    const refBal = customer.referralWalletBalance ?? 0;
    if (criteria.referralBalanceCondition === 'gt') {
      if (criteria.referralBalanceMin !== undefined && refBal <= criteria.referralBalanceMin) return false;
    } else if (criteria.referralBalanceCondition === 'lt') {
      if (criteria.referralBalanceMax !== undefined && refBal >= criteria.referralBalanceMax) return false;
    } else if (criteria.referralBalanceCondition === 'between') {
      const min = criteria.referralBalanceMin ?? 0;
      const max = criteria.referralBalanceMax ?? Infinity;
      if (refBal < min || refBal > max) return false;
    }

    // 8. Total Spending
    const totalSpent = customer.totalSpent ?? 0;
    if (criteria.totalSpentCondition === 'gt') {
      if (criteria.totalSpentMin !== undefined && totalSpent <= criteria.totalSpentMin) return false;
    } else if (criteria.totalSpentCondition === 'lt') {
      if (criteria.totalSpentMax !== undefined && totalSpent >= criteria.totalSpentMax) return false;
    } else if (criteria.totalSpentCondition === 'between') {
      const min = criteria.totalSpentMin ?? 0;
      const max = criteria.totalSpentMax ?? Infinity;
      if (totalSpent < min || totalSpent > max) return false;
    }

    // 9. Debts Status
    if (criteria.debtsStatus === 'has_debt') {
      if (accountBal >= 0) return false;
    } else if (criteria.debtsStatus === 'no_debt') {
      if (accountBal < 0) return false;
    }

    // 10. Cashback Status
    if (criteria.cashbackStatus === 'has_cashback') {
      if (cbBal <= 0 && (customer.totalCashbackEarned || 0) <= 0) return false;
    } else if (criteria.cashbackStatus === 'no_cashback') {
      if (cbBal > 0 || (customer.totalCashbackEarned || 0) > 0) return false;
    }

    // 11. Profits Status (Referral Commission Earned)
    const profits = customer.totalReferralCommissionEarned ?? 0;
    if (criteria.profitStatus === 'has_profit') {
      if (profits <= 0 && refBal <= 0) return false;
    } else if (criteria.profitStatus === 'no_profit') {
      if (profits > 0 || refBal > 0) return false;
    }

    // ========================================================
    // 12. Orders Count
    // ========================================================
    const ordersCount = (customer.totalOrders ?? 0) || custTickets.length || custSubs.length;
    if (criteria.ordersCountCondition === 'zero') {
      if (ordersCount > 0) return false;
    } else if (criteria.ordersCountCondition === 'gt') {
      if (criteria.ordersCountMin !== undefined && ordersCount <= criteria.ordersCountMin) return false;
    } else if (criteria.ordersCountCondition === 'lt') {
      if (criteria.ordersCountMax !== undefined && ordersCount >= criteria.ordersCountMax) return false;
    } else if (criteria.ordersCountCondition === 'between') {
      const min = criteria.ordersCountMin ?? 0;
      const max = criteria.ordersCountMax ?? Infinity;
      if (ordersCount < min || ordersCount > max) return false;
    }

    // 13. Purchase Frequency
    if (criteria.purchaseFrequency !== 'all') {
      if (criteria.purchaseFrequency === 'once' && ordersCount !== 1) return false;
      if (criteria.purchaseFrequency === 'multiple' && ordersCount <= 1) return false;
      if (criteria.purchaseFrequency === 'more_than_10' && ordersCount <= 10) return false;
      if (criteria.purchaseFrequency === 'more_than_50' && ordersCount <= 50) return false;
    }

    // 14. Last Order Value
    const maxSingleOrder = customer.maxSingleOrderAmount || 0;
    const lastTicket = custTickets[0];
    const lastOrderVal = lastTicket?.requiredAmount ?? (lastTicket as any)?.totalAmount ?? maxSingleOrder;
    if (criteria.lastOrderValueCondition === 'gt') {
      if (criteria.lastOrderValueMin !== undefined && lastOrderVal <= criteria.lastOrderValueMin) return false;
    } else if (criteria.lastOrderValueCondition === 'lt') {
      if (criteria.lastOrderValueMax !== undefined && lastOrderVal >= criteria.lastOrderValueMax) return false;
    } else if (criteria.lastOrderValueCondition === 'between') {
      const min = criteria.lastOrderValueMin ?? 0;
      const max = criteria.lastOrderValueMax ?? Infinity;
      if (lastOrderVal < min || lastOrderVal > max) return false;
    }

    // 15. First Shipping Status
    if (criteria.firstShippingStatus === 'used') {
      const hasUsed = Boolean(customer.hasUsedFirstOrderDiscount) || custTickets.some(t => t.ticketType === 'first_shipping' || t.isFirstOrderDiscountApplied);
      if (!hasUsed) return false;
    } else if (criteria.firstShippingStatus === 'not_used') {
      const hasUsed = Boolean(customer.hasUsedFirstOrderDiscount) || custTickets.some(t => t.ticketType === 'first_shipping' || t.isFirstOrderDiscountApplied);
      if (hasUsed) return false;
    }

    // 16. Reservations Status
    if (criteria.reservationsStatus === 'has_reservations') {
      const hasPendingReservations = custTickets.some(t => t.status === 'in_progress' || t.status === 'new');
      if (!hasPendingReservations) return false;
    } else if (criteria.reservationsStatus === 'no_reservations') {
      const hasPendingReservations = custTickets.some(t => t.status === 'in_progress' || t.status === 'new');
      if (hasPendingReservations) return false;
    }

    // 17. Purchased Product
    if (criteria.purchasedProductId !== 'all') {
      const hasProduct = custTickets.some(t =>
        t.items?.some(i => i.productId === criteria.purchasedProductId || i.productName === criteria.purchasedProductId)
      ) || custSubs.some(s => s.planId === criteria.purchasedProductId || s.planName === criteria.purchasedProductId);
      if (!hasProduct) return false;
    }

    // 18. Purchased Game
    if (criteria.purchasedGameId !== 'all') {
      const hasGame = custTickets.some(t =>
        t.items?.some(i => i.gameId === criteria.purchasedGameId || i.gameName === criteria.purchasedGameId)
      ) || customer.favoriteGame === criteria.purchasedGameId || custSubs.some(s => s.planName.includes(criteria.purchasedGameId));
      if (!hasGame) return false;
    }

    // ========================================================
    // 19. Creation Date
    // ========================================================
    if (criteria.createdAtPreset !== 'all') {
      const createdDate = customer.createdAt ? new Date(customer.createdAt).getTime() : 0;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      switch (criteria.createdAtPreset) {
        case 'today':
          if (createdDate < todayStart) return false;
          break;
        case 'yesterday':
          if (createdDate < todayStart - oneDay || createdDate >= todayStart) return false;
          break;
        case 'last_7_days':
          if (createdDate < todayStart - 7 * oneDay) return false;
          break;
        case 'last_30_days':
          if (createdDate < todayStart - 30 * oneDay) return false;
          break;
        case 'this_month': {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          if (createdDate < monthStart) return false;
          break;
        }
        case 'last_month': {
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          if (createdDate < lastMonthStart || createdDate >= thisMonthStart) return false;
          break;
        }
        case 'custom': {
          if (criteria.createdAtStart) {
            const start = new Date(criteria.createdAtStart).getTime();
            if (createdDate < start) return false;
          }
          if (criteria.createdAtEnd) {
            const end = new Date(criteria.createdAtEnd).setHours(23, 59, 59, 999);
            if (createdDate > end) return false;
          }
          break;
        }
      }
    }

    // ========================================================
    // 20. Last Activity
    // ========================================================
    if (criteria.lastActivityPreset !== 'all') {
      const lastAct = customer.lastPurchaseDate
        ? new Date(customer.lastPurchaseDate).getTime()
        : customer.updatedAt
        ? new Date(customer.updatedAt).getTime()
        : customer.createdAt
        ? new Date(customer.createdAt).getTime()
        : 0;

      const now = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      switch (criteria.lastActivityPreset) {
        case 'online_now':
        case 'active_today':
          if (now - lastAct > oneDay) return false;
          break;
        case 'inactive_week':
          if (now - lastAct < 7 * oneDay) return false;
          break;
        case 'inactive_month':
          if (now - lastAct < 30 * oneDay) return false;
          break;
        case 'custom': {
          if (criteria.lastActivityStart) {
            const start = new Date(criteria.lastActivityStart).getTime();
            if (lastAct < start) return false;
          }
          if (criteria.lastActivityEnd) {
            const end = new Date(criteria.lastActivityEnd).setHours(23, 59, 59, 999);
            if (lastAct > end) return false;
          }
          break;
        }
      }
    }

    // ========================================================
    // 21. Country & City
    // ========================================================
    if (criteria.country !== 'all') {
      const addr = customer.address?.toLowerCase() || '';
      if (!addr.includes(criteria.country.toLowerCase())) return false;
    }
    if (criteria.city !== 'all') {
      const addr = customer.address?.toLowerCase() || '';
      if (!addr.includes(criteria.city.toLowerCase())) return false;
    }

    // ========================================================
    // 22. Payment Method
    // ========================================================
    if (criteria.paymentMethod !== 'all') {
      const hasMethod = custTickets.some(t => {
        const method = `${t.paymentGateway || ''} ${t.paymentWallet || ''} ${(t as any).depositPaymentMethod || ''}`.toLowerCase();
        return method.includes(criteria.paymentMethod);
      });
      if (!hasMethod) return false;
    }

    // ========================================================
    // 23. Referral Status
    // ========================================================
    if (criteria.referralStatus !== 'all') {
      const hasRef = Boolean(customer.referrerId || customer.referredByCode || customer.referrerName);
      const refereesCount = customer.monthlyReferredCount || 0;

      switch (criteria.referralStatus) {
        case 'has_referrer':
          if (!hasRef) return false;
          break;
        case 'no_referrer':
          if (hasRef) return false;
          break;
        case 'has_referees':
          if (refereesCount <= 0) return false;
          break;
        case 'no_referees':
          if (refereesCount > 0) return false;
          break;
      }
    }

    return true;
  });
}

/**
 * Sort filtered customers
 */
export function sortCustomersEngine<T extends Customer = Customer>(
  customers: T[],
  field: CustomerSortField,
  order: CustomerSortOrder = 'desc'
): T[] {
  return [...customers].sort((a, b) => {
    let comparison = 0;
    switch (field) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '', 'ar');
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        break;
      case 'lastActivity': {
        const actA = new Date(a.lastPurchaseDate || a.updatedAt || a.createdAt || 0).getTime();
        const actB = new Date(b.lastPurchaseDate || b.updatedAt || b.createdAt || 0).getTime();
        comparison = actA - actB;
        break;
      }
      case 'totalSpent':
        comparison = (a.totalSpent || 0) - (b.totalSpent || 0);
        break;
      case 'totalOrders':
        comparison = (a.totalOrders || 0) - (b.totalOrders || 0);
        break;
      case 'accountBalance':
        comparison = (a.accountBalance ?? a.balance ?? 0) - (b.accountBalance ?? b.balance ?? 0);
        break;
      case 'cashbackBalance':
        comparison = (a.cashbackBalance || 0) - (b.cashbackBalance || 0);
        break;
      case 'referralBalance':
        comparison = (a.referralWalletBalance || 0) - (b.referralWalletBalance || 0);
        break;
      case 'profits':
        comparison = (a.totalReferralCommissionEarned || 0) - (b.totalReferralCommissionEarned || 0);
        break;
      case 'maxOrder':
        comparison = (a.maxSingleOrderAmount || 0) - (b.maxSingleOrderAmount || 0);
        break;
      case 'referees':
        comparison = (a.monthlyReferredCount || 0) - (b.monthlyReferredCount || 0);
        break;
    }
    return order === 'asc' ? comparison : -comparison;
  });
}
