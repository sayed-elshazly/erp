// =============================================================
// NZM JKR TOP UP ERP — Subscriptions Reports & Filter Engine
// =============================================================

import { CustomerSubscription, SubscriptionPayment } from '../../types/subscription.types';
import { Customer } from '../../types/customer.types';

export interface SubscriptionFilterCriteria {
  // Live General Search across all fields
  search?: string;

  // 1. Basic Customer Data
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCode?: string;
  employeeName?: string;
  branch?: string;
  group?: string;
  customerTypes?: string[];       // regular, dealer, reseller, vip
  customerStatuses?: string[];    // active, inactive, banned, suspended
  customerTiers?: string[];       // normal, silver, gold, vip
  country?: string;
  city?: string;

  // 2. Subscription Specs & Plans (Multi-Select)
  planIds?: string[];
  planCategories?: string[];
  durationTiers?: string[];       // monthly, quarterly, semi_annual, annual, lifetime, other

  // 3. Subscription Status (Multi-Select)
  statuses?: string[];            // active, expiring_soon, expired, renewed, cancelled, frozen, new

  // 4. Date Period & Ranges
  datePeriod?: 'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';
  startDate?: string;
  endDate?: string;
  dateField?: 'startDate' | 'endDate' | 'createdAt' | 'lastRenewedAt';

  // 5. Financial Operations
  finalPriceMin?: number;
  finalPriceMax?: number;
  remainingMin?: number;
  remainingMax?: number;
  discountMin?: number;
  discountMax?: number;
  profitMin?: number;
  profitMax?: number;
  costMin?: number;
  costMax?: number;

  // 6. Payment Methods (Multi-Select)
  paymentMethods?: string[];      // safe_cash, vodafone_cash, instapay, bank_transfer, customer_wallet, electronic_wallet, coupon, multiple

  // 7. Payment Status (Multi-Select)
  paymentStatuses?: string[];     // paid, partial, pending, refunded

  // 8. Employees & Audit
  createdBy?: string;
  modifiedBy?: string;
  renewedBy?: string;
  supportBy?: string;

  // 9. Renewal State
  renewalMode?: 'all' | 'renewed' | 'not_renewed' | 'needs_renewal' | 'auto' | 'manual';

  // 10. Profits
  profitMode?: 'all' | 'highest' | 'lowest' | 'no_profit' | 'loss' | 'range';

  // 11. Discounts & Offers
  discountMode?: 'all' | 'has_discount' | 'no_discount' | 'coupon' | 'special_offer' | 'gift';
}

export const INITIAL_SUBSCRIPTION_FILTER_CRITERIA: SubscriptionFilterCriteria = {
  search: '',
  customerTypes: [],
  customerStatuses: [],
  customerTiers: [],
  planIds: [],
  planCategories: [],
  durationTiers: [],
  statuses: [],
  datePeriod: 'all',
  startDate: '',
  endDate: '',
  dateField: 'createdAt',
  paymentMethods: [],
  paymentStatuses: [],
  renewalMode: 'all',
  profitMode: 'all',
  discountMode: 'all'
};

export type SubscriptionSortField =
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'profit_desc'
  | 'profit_asc'
  | 'sales_desc'
  | 'sales_asc'
  | 'price_desc'
  | 'price_asc'
  | 'customerName_asc'
  | 'planName_asc';

export interface SavedSubscriptionPreset {
  id: string;
  name: string;
  criteria: SubscriptionFilterCriteria;
  isDefault?: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'nzm_jkr_subscription_report_presets';

export function getSavedSubscriptionPresets(): SavedSubscriptionPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSubscriptionPreset(name: string, criteria: SubscriptionFilterCriteria, isDefault = false): SavedSubscriptionPreset {
  const presets = getSavedSubscriptionPresets();
  const newPreset: SavedSubscriptionPreset = {
    id: `sub_preset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    criteria,
    isDefault,
    createdAt: new Date().toISOString()
  };

  let updated = presets.map(p => isDefault ? { ...p, isDefault: false } : p);
  updated.push(newPreset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newPreset;
}

export function deleteSubscriptionPreset(id: string): void {
  const presets = getSavedSubscriptionPresets();
  const filtered = presets.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function setDefaultSubscriptionPreset(id: string): void {
  const presets = getSavedSubscriptionPresets();
  const updated = presets.map(p => ({ ...p, isDefault: p.id === id }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function countActiveSubscriptionFilters(c: SubscriptionFilterCriteria): number {
  let count = 0;
  if (c.search?.trim()) count++;
  if (c.customerId?.trim()) count++;
  if (c.customerName?.trim()) count++;
  if (c.customerPhone?.trim()) count++;
  if (c.customerEmail?.trim()) count++;
  if (c.customerCode?.trim()) count++;
  if (c.employeeName?.trim()) count++;
  if (c.branch?.trim()) count++;
  if (c.group?.trim()) count++;
  if (c.country?.trim()) count++;
  if (c.city?.trim()) count++;

  if (c.customerTypes && c.customerTypes.length > 0) count++;
  if (c.customerStatuses && c.customerStatuses.length > 0) count++;
  if (c.customerTiers && c.customerTiers.length > 0) count++;

  if (c.planIds && c.planIds.length > 0) count++;
  if (c.planCategories && c.planCategories.length > 0) count++;
  if (c.durationTiers && c.durationTiers.length > 0) count++;
  if (c.statuses && c.statuses.length > 0) count++;

  if (c.datePeriod && c.datePeriod !== 'all') count++;
  if (c.startDate || c.endDate) count++;

  if (c.finalPriceMin !== undefined || c.finalPriceMax !== undefined) count++;
  if (c.remainingMin !== undefined || c.remainingMax !== undefined) count++;
  if (c.discountMin !== undefined || c.discountMax !== undefined) count++;
  if (c.profitMin !== undefined || c.profitMax !== undefined) count++;
  if (c.costMin !== undefined || c.costMax !== undefined) count++;

  if (c.paymentMethods && c.paymentMethods.length > 0) count++;
  if (c.paymentStatuses && c.paymentStatuses.length > 0) count++;

  if (c.createdBy?.trim()) count++;
  if (c.modifiedBy?.trim()) count++;
  if (c.renewedBy?.trim()) count++;
  if (c.supportBy?.trim()) count++;

  if (c.renewalMode && c.renewalMode !== 'all') count++;
  if (c.profitMode && c.profitMode !== 'all') count++;
  if (c.discountMode && c.discountMode !== 'all') count++;

  return count;
}

// Helpers for date ranges
function getDateRange(period: SubscriptionFilterCriteria['datePeriod']): { start?: Date; end?: Date } {
  if (!period || period === 'all') return {};
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (period) {
    case 'today':
      return { start: startOfDay, end: endOfDay };
    case 'yesterday': {
      const yStart = new Date(startOfDay);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(endOfDay);
      yEnd.setDate(yEnd.getDate() - 1);
      return { start: yStart, end: yEnd };
    }
    case 'last_7_days': {
      const s = new Date(startOfDay);
      s.setDate(s.getDate() - 7);
      return { start: s, end: endOfDay };
    }
    case 'last_30_days': {
      const s = new Date(startOfDay);
      s.setDate(s.getDate() - 30);
      return { start: s, end: endOfDay };
    }
    case 'this_month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s, end: endOfDay };
    }
    case 'last_month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: s, end: e };
    }
    case 'this_year': {
      const s = new Date(now.getFullYear(), 0, 1);
      return { start: s, end: endOfDay };
    }
    case 'last_year': {
      const s = new Date(now.getFullYear() - 1, 0, 1);
      const e = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return { start: s, end: e };
    }
    default:
      return {};
  }
}

// Duration categorizer helper
function getDurationTier(sub: CustomerSubscription): 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'lifetime' | 'other' {
  const unit = sub.durationUnit;
  const val = sub.durationValue;

  if (unit === 'months') {
    if (val === 1) return 'monthly';
    if (val === 3) return 'quarterly';
    if (val === 6) return 'semi_annual';
    if (val === 12) return 'annual';
  } else if (unit === 'days') {
    if (val >= 28 && val <= 31) return 'monthly';
    if (val >= 85 && val <= 93) return 'quarterly';
    if (val >= 175 && val <= 186) return 'semi_annual';
    if (val >= 360 && val <= 366) return 'annual';
    if (val >= 3650) return 'lifetime';
  } else if (unit === 'years') {
    if (val === 1) return 'annual';
    if (val >= 10) return 'lifetime';
  }

  const name = (sub.planName || '').toLowerCase();
  if (name.includes('مدى الحياة') || name.includes('lifetime')) return 'lifetime';
  if (name.includes('سنوي') || name.includes('سنة')) return 'annual';
  if (name.includes('نصف') || name.includes('6 شهر') || name.includes('6 شهور')) return 'semi_annual';
  if (name.includes('ربع') || name.includes('3 شهر') || name.includes('3 شهور')) return 'quarterly';
  if (name.includes('شهري') || name.includes('شهر')) return 'monthly';

  return 'other';
}

/**
 * High-performance Server/Engine side filter function for subscriptions and reports
 */
export function filterSubscriptionsEngine(
  subscriptions: CustomerSubscription[],
  criteria: SubscriptionFilterCriteria,
  context?: {
    customersMap?: Record<string, Customer>;
    paymentsMap?: Record<string, SubscriptionPayment[]>;
  }
): CustomerSubscription[] {
  const customers = context?.customersMap || {};

  // Precompute Date Range
  const periodRange = criteria.datePeriod && criteria.datePeriod !== 'all' && criteria.datePeriod !== 'custom'
    ? getDateRange(criteria.datePeriod)
    : {};
  const customStart = criteria.startDate ? new Date(criteria.startDate + 'T00:00:00') : undefined;
  const customEnd = criteria.endDate ? new Date(criteria.endDate + 'T23:59:59') : undefined;

  const effectiveStart = customStart || periodRange.start;
  const effectiveEnd = customEnd || periodRange.end;

  const searchLower = (criteria.search || '').trim().toLowerCase();

  return subscriptions.filter(sub => {
    const cust = customers[sub.customerId] || null;

    // 1. Live Search
    if (searchLower) {
      const matchSearch =
        (sub.subscriptionNumber || '').toLowerCase().includes(searchLower) ||
        (sub.customerName || '').toLowerCase().includes(searchLower) ||
        (sub.customerPhone || '').toLowerCase().includes(searchLower) ||
        (sub.customerCode || '').toLowerCase().includes(searchLower) ||
        (sub.planName || '').toLowerCase().includes(searchLower) ||
        (sub.planCategory || '').toLowerCase().includes(searchLower) ||
        (sub.notes || '').toLowerCase().includes(searchLower) ||
        (sub.serviceNotes || '').toLowerCase().includes(searchLower) ||
        (sub.couponCode || '').toLowerCase().includes(searchLower) ||
        (cust?.email || '').toLowerCase().includes(searchLower) ||
        (cust?.code || '').toLowerCase().includes(searchLower);

      if (!matchSearch) return false;
    }

    // 2. Customer Specific Fields
    if (criteria.customerId && sub.customerId !== criteria.customerId) return false;
    if (criteria.customerName && !sub.customerName.toLowerCase().includes(criteria.customerName.toLowerCase())) return false;
    if (criteria.customerPhone && !sub.customerPhone.includes(criteria.customerPhone)) return false;
    if (criteria.customerCode && !(sub.customerCode || cust?.code || '').toLowerCase().includes(criteria.customerCode.toLowerCase())) return false;
    if (criteria.customerEmail && !(cust?.email || '').toLowerCase().includes(criteria.customerEmail.toLowerCase())) return false;

    if (criteria.country && ((cust as any)?.country || (cust?.address || '')).toLowerCase() !== criteria.country.toLowerCase()) return false;
    if (criteria.city && !((cust as any)?.city || (cust?.address || '')).toLowerCase().includes(criteria.city.toLowerCase())) return false;

    if (criteria.customerTypes && criteria.customerTypes.length > 0) {
      const cType = (cust as any)?.type || cust?.profileType || 'regular';
      if (!criteria.customerTypes.includes(cType)) return false;
    }

    if (criteria.customerStatuses && criteria.customerStatuses.length > 0) {
      const cStatus = cust?.status || 'active';
      if (!criteria.customerStatuses.includes(cStatus)) return false;
    }

    if (criteria.customerTiers && criteria.customerTiers.length > 0) {
      const cTier = (cust as any)?.tier || (cust ? (cust.ticketsCount && cust.ticketsCount > 40 ? 'gold' : cust.ticketsCount && cust.ticketsCount > 10 ? 'silver' : 'normal') : 'normal');
      if (!criteria.customerTiers.includes(cTier)) return false;
    }

    // 3. Subscription Plan & Category
    if (criteria.planIds && criteria.planIds.length > 0) {
      if (!criteria.planIds.includes(sub.planId)) return false;
    }

    if (criteria.planCategories && criteria.planCategories.length > 0) {
      const cat = sub.planCategory || 'خدمات';
      if (!criteria.planCategories.includes(cat)) return false;
    }

    if (criteria.durationTiers && criteria.durationTiers.length > 0) {
      const tier = getDurationTier(sub);
      if (!criteria.durationTiers.includes(tier)) return false;
    }

    // 4. Status Filter
    if (criteria.statuses && criteria.statuses.length > 0) {
      // Check for 'new' virtual status
      const isNew = new Date().getTime() - new Date(sub.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
      const effectiveStatus = criteria.statuses.includes('new') && isNew ? 'new' : sub.status;
      if (!criteria.statuses.includes(sub.status) && !criteria.statuses.includes(effectiveStatus)) {
        return false;
      }
    }

    // 5. Date Filter
    if (effectiveStart || effectiveEnd) {
      let targetDateStr = sub.createdAt;
      if (criteria.dateField === 'startDate') targetDateStr = sub.startDate;
      else if (criteria.dateField === 'endDate') targetDateStr = sub.endDate;
      else if (criteria.dateField === 'lastRenewedAt') targetDateStr = sub.lastRenewedAt || sub.createdAt;

      if (!targetDateStr) return false;
      const targetDate = new Date(targetDateStr);
      if (effectiveStart && targetDate < effectiveStart) return false;
      if (effectiveEnd && targetDate > effectiveEnd) return false;
    }

    // 6. Financial Numbers
    const price = sub.finalPrice || 0;
    const cost = sub.costPrice || 0;
    const profit = sub.netProfit !== undefined ? sub.netProfit : (price - cost);
    const discount = sub.discountAmount || 0;
    const remaining = Math.max(0, (sub.originalPrice || price) - discount - price);

    if (criteria.finalPriceMin !== undefined && price < criteria.finalPriceMin) return false;
    if (criteria.finalPriceMax !== undefined && price > criteria.finalPriceMax) return false;

    if (criteria.remainingMin !== undefined && remaining < criteria.remainingMin) return false;
    if (criteria.remainingMax !== undefined && remaining > criteria.remainingMax) return false;

    if (criteria.discountMin !== undefined && discount < criteria.discountMin) return false;
    if (criteria.discountMax !== undefined && discount > criteria.discountMax) return false;

    if (criteria.costMin !== undefined && cost < criteria.costMin) return false;
    if (criteria.costMax !== undefined && cost > criteria.costMax) return false;

    if (criteria.profitMin !== undefined && profit < criteria.profitMin) return false;
    if (criteria.profitMax !== undefined && profit > criteria.profitMax) return false;

    // 7. Payment Methods & Statuses
    if (criteria.paymentMethods && criteria.paymentMethods.length > 0) {
      if (!criteria.paymentMethods.includes(sub.paymentMethod)) return false;
    }

    if (criteria.paymentStatuses && criteria.paymentStatuses.length > 0) {
      if (!criteria.paymentStatuses.includes(sub.paymentStatus)) return false;
    }

    // 8. Employees
    if (criteria.createdBy && (sub.createdBy || '').toLowerCase() !== criteria.createdBy.toLowerCase()) return false;
    if (criteria.employeeName && !(sub.createdBy || '').toLowerCase().includes(criteria.employeeName.toLowerCase())) return false;

    // 9. Renewal Mode
    if (criteria.renewalMode && criteria.renewalMode !== 'all') {
      if (criteria.renewalMode === 'renewed' && (sub.renewalCount || 0) <= 0) return false;
      if (criteria.renewalMode === 'not_renewed' && (sub.renewalCount || 0) > 0) return false;
      if (criteria.renewalMode === 'needs_renewal' && sub.status !== 'expiring_soon' && sub.status !== 'expired') return false;
      if (criteria.renewalMode === 'auto' && !sub.autoRenew) return false;
      if (criteria.renewalMode === 'manual' && sub.autoRenew) return false;
    }

    // 10. Profit Mode
    if (criteria.profitMode && criteria.profitMode !== 'all') {
      if (criteria.profitMode === 'no_profit' && profit !== 0) return false;
      if (criteria.profitMode === 'loss' && profit >= 0) return false;
    }

    // 11. Discount Mode
    if (criteria.discountMode && criteria.discountMode !== 'all') {
      if (criteria.discountMode === 'has_discount' && discount <= 0) return false;
      if (criteria.discountMode === 'no_discount' && discount > 0) return false;
      if (criteria.discountMode === 'coupon' && !sub.couponCode?.trim()) return false;
      if (criteria.discountMode === 'gift' && price !== 0) return false;
    }

    return true;
  });
}

/**
 * Sort subscriptions by 10 dimensions
 */
export function sortSubscriptionsEngine(
  subscriptions: CustomerSubscription[],
  sortOption: SubscriptionSortField
): CustomerSubscription[] {
  const list = [...subscriptions];

  switch (sortOption) {
    case 'createdAt_desc':
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'createdAt_asc':
      return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'profit_desc':
      return list.sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0));
    case 'profit_asc':
      return list.sort((a, b) => (a.netProfit || 0) - (b.netProfit || 0));
    case 'price_desc':
      return list.sort((a, b) => (b.finalPrice || 0) - (a.finalPrice || 0));
    case 'price_asc':
      return list.sort((a, b) => (a.finalPrice || 0) - (b.finalPrice || 0));
    case 'sales_desc':
      return list.sort((a, b) => (b.renewalCount || 0) - (a.renewalCount || 0));
    case 'sales_asc':
      return list.sort((a, b) => (a.renewalCount || 0) - (b.renewalCount || 0));
    case 'customerName_asc':
      return list.sort((a, b) => (a.customerName || '').localeCompare(b.customerName || '', 'ar'));
    case 'planName_asc':
      return list.sort((a, b) => (a.planName || '').localeCompare(b.planName || '', 'ar'));
    default:
      return list;
  }
}
