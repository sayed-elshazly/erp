// =============================================================
// NZM JKR TOP UP ERP — DATA ANALYTICS & INTELLIGENCE TYPES
// Requirements: September 2026 Specification
// =============================================================

import { ProfileType, LoyaltyTier, PurchasingPower, CustomerSource } from './customer.types';

// Unified Filter State
export type DatePreset = 'this_month' | 'today' | 'this_week' | 'last_30_days' | 'custom';

export interface UnifiedAnalyticsFilterState {
  datePreset: DatePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  customerType: 'all' | ProfileType; // 'all' | 'regular' | 'partner' | 'shop' | 'influencer'
  loyaltyTier: 'all' | LoyaltyTier;  // 'all' | 'normal' | 'silver' | 'gold' | 'vip'
  purchasingPower: 'all' | PurchasingPower; // 'all' | 'normal' | 'medium' | 'strong' | 'whale'
  gameId: 'all' | string;
  adPlatform: 'all' | CustomerSource | 'google' | 'snapchat';
}

// 9.1 Daily Sales Summary Model
export interface DailySalesSummary {
  id: string;
  date: string; // YYYY-MM-DD
  gameId: string;
  gameTitle: string;
  productId: string;
  productName: string;
  ticketsCount: number;
  revenue: number;
  cost: number;
  profit: number;
}

// 9.2 Hourly Sales Summary Model
export interface HourlySalesSummary {
  id: string;
  date: string; // YYYY-MM-DD
  hour: number; // 0 to 23
  ticketsCount: number;
  revenue: number;
  profit: number;
}

// 9.3 Marketing Campaign Model
export type MarketingCampaignType = 'ad' | 'contest' | 'offer';
export type MarketingPlatform = 'facebook' | 'instagram' | 'tiktok' | 'snapchat' | 'google' | 'other';

export interface MarketingCampaign {
  id: string;
  campaignName: string;
  type: MarketingCampaignType;
  platform: MarketingPlatform;
  amount: number; // مصاريف الحملة بالجنيه
  date: string;   // تاريخ إطلاق أو تسجيل الحملة YYYY-MM-DD
  note?: string;
  newCustomersCount?: number;
  revenueGenerated?: number;
  productsCost?: number;
  netProfit?: number;
  roi?: number; // نسبة مئوية %
}

// 9.4 Ticket to Campaign Link Model
export interface TicketCampaignLink {
  id: string;
  ticketId: string;
  campaignId: string;
  customerType: 'new' | 'returning'; // جديد أو قديم
}

// Product Behavioral Recommendations
export interface ProductRecommendation {
  type: 'peak' | 'dip' | 'trend' | 'stock' | 'issues';
  title: string;
  description: string;
  advice: string;
  color?: string;
}

// Aggregated Game Item for Page 1
export interface GameAnalyticsItem {
  gameId: string;
  gameName: string;
  ticketsCount: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
  growthPercent: number; // مقارنة بالفترة السابقة
}

// Aggregated Product Item for Page 1
export interface ProductAnalyticsItem {
  productId: string;
  productName: string;
  gameId: string;
  gameName: string;
  ticketsCount: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
  growthPercent: number;
}

// Customer Analytics Item for Page 3
export interface CustomerSegmentItem {
  customerId: string;
  customerName: string;
  customerPhone: string;
  profileType: ProfileType;
  loyaltyTier: LoyaltyTier;
  purchasingPower: PurchasingPower;
  ticketsCount: number;
  totalSpent: number;
  averageTicketValue: number;
  lastPurchaseDate: string;
  firstShipmentDate?: string;
  returnedAfterFirst?: boolean;
}

// Partner Analytics Item for Page 4
export interface PartnerAnalyticsItem {
  partnerId: string;
  partnerName: string;
  profileType: 'partner' | 'shop' | 'influencer';
  newCustomersCount: number;
  revenueFromReferred: number;
  repetitionRatePercent: number; // نسبة من كرروا الشحن %
  dueCommission: number;
  commissionRatePercent: number;
  profitFromReferred: number;
  marginPercent: number;
  roi: number; // مضاعف أو نسبة
  dailySignups?: { date: string; count: number }[];
}

// Marketing ROI Analytics for Page 5
export interface MarketingKPIs {
  totalExpenses: number;
  totalRevenue: number;
  totalNetProfit: number;
  overallROI: number; // %
}

// AI Product Categorization & Intelligence Models
export type SmartProductCategory = 'winning' | 'losing' | 'ad_worthy' | 'stable';

export interface ClassifiedProductItem extends ProductAnalyticsItem {
  category: SmartProductCategory;
  categoryLabel: string;
  categoryReason: string;
  recommendation: string;
  actionBadgeColor: string;
}

export interface PlatformAnalyticsItem {
  platformId: string;
  platformName: string;
  platformLabel: string;
  type: 'channel' | 'game_system';
  iconName?: string;
  ticketsCount: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
  averageOrderValue: number;
  growthPercent: number;
  marketSharePercent: number;
  aiRecommendation: string;
}

export interface ShiftAnalyticsItem {
  id: string;
  shiftNumber: string;
  employeeName: string;
  department: string;
  startTime: string;
  endTime: string;
  status: string;
  ticketsCount: number;
  revenue: number;
  profit: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  performanceGrade: 'A+' | 'A' | 'B' | 'C' | 'Review';
}

export interface ShiftAnalyticsSummary {
  totalShiftsCount: number;
  totalRevenue: number;
  totalProfit: number;
  averageShiftRevenue: number;
  averageTicketsPerShift: number;
  totalCashVariance: number;
  shiftsList: ShiftAnalyticsItem[];
  hourlyDistribution: { hour: number; hourLabel: string; ticketsCount: number; revenue: number }[];
  topPerformingEmployees: { name: string; ticketsCount: number; revenue: number; profit: number }[];
}

