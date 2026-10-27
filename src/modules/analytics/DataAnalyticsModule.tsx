// =============================================================
// NZM JKR TOP UP ERP — DATA ANALYTICS & INTELLIGENCE MODULE
// Comprehensive Replacement for Legacy Reports in Customers & Dealers
// Requirements: September 2026 Specification
// =============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { CustomerTicket } from '../../types/customer.types';
import {
  UnifiedAnalyticsFilterState,
  MarketingCampaign
} from '../../types/analytics.types';
import { eventBus, SYSTEM_EVENTS } from '../../services/eventBus';
import { AnalyticsService } from '../../services/analytics/analyticsService';
import { UnifiedAnalyticsFilterBar } from './UnifiedAnalyticsFilterBar';
import { Page1ProductsDashboard } from './pages/Page1ProductsDashboard';
import { Page2ProductBehavior } from './pages/Page2ProductBehavior';
import { Page3CustomerAnalytics } from './pages/Page3CustomerAnalytics';
import { Page4PartnerAnalytics } from './pages/Page4PartnerAnalytics';
import { Page5MarketingROI } from './pages/Page5MarketingROI';
import { Page6PlatformsAnalytics } from './pages/Page6PlatformsAnalytics';
import { Page7ShiftsAnalytics } from './pages/Page7ShiftsAnalytics';
import { exportToExcel } from '../../utils/excelExport';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ReportEngine } from '../../services/reporting/reportEngine';
import { ReportConfig, ReportDocumentData, ReportKPI, ReportTable } from '../../services/reporting/reportTypes';
import { formatDateTime } from '../../utils/formatters';
import {
  BarChart3,
  Layers,
  LineChart,
  Users,
  Handshake,
  Megaphone,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Sparkles,
  ShieldCheck,
  Globe,
  Clock
} from 'lucide-react';

interface DataAnalyticsModuleProps {
  department?: 'customers' | 'dealers';
}

export const DataAnalyticsModule: React.FC<DataAnalyticsModuleProps> = ({
  department = 'customers'
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Permissions according to Section 11 of document:
  // موظف (employee): View only
  // مسؤول (manager) / مالك (admin): View + Export + Send Offers & Bonuses
  const isOwnerOrAdmin = user?.role === 'admin' || (user?.permissions?.includes('export') ?? false);
  const canExport = isOwnerOrAdmin;
  const canSendOffers = isOwnerOrAdmin;

  // Active page: 1 to 7
  const [activePage, setActivePage] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);

  // Selected product state for Page 2 drilldown
  const [targetedProduct, setTargetedProduct] = useState<{ gameName: string; productName: string } | null>(null);

  // Unified Filter state
  const [filters, setFilters] = useState<UnifiedAnalyticsFilterState>(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    return {
      datePreset: 'this_month',
      startDate: firstDay,
      endDate: todayStr,
      customerType: 'all',
      loyaltyTier: 'all',
      purchasingPower: 'all',
      gameId: 'all',
      adPlatform: 'all'
    };
  });

  // Raw Database Data
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [gamesList, setGamesList] = useState<{ id: string; name: string }[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);

  // Load Data
  const loadData = () => {
    if (department === 'dealers') {
      setTickets(db.getDealerTickets());
      setCustomers(db.getDealers());
    } else {
      setTickets(db.getTickets());
      setCustomers(db.getCustomers());
    }

    const tree = db.getGameTree() || [];
    setGamesList(tree.map((g: any) => ({ id: g.id || g.title, name: g.title || g.name })));
    setCampaigns(AnalyticsService.getMarketingCampaigns());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    const unsubTicket = eventBus.subscribe(SYSTEM_EVENTS.TICKET_UPDATED, handleUpdate);
    window.addEventListener('tickets_updated', handleUpdate);
    window.addEventListener('dealer_tickets_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('settlements_updated', handleUpdate);

    return () => {
      unsubTicket();
      window.removeEventListener('tickets_updated', handleUpdate);
      window.removeEventListener('dealer_tickets_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('settlements_updated', handleUpdate);
    };
  }, [department]);

  // Customers quick lookup map (indexed by ID, Phone, and Code)
  const customersMap = useMemo(() => {
    const map = new Map<string, any>();
    customers.forEach(c => {
      if (c.id) map.set(c.id, c);
      if (c.phone) map.set(c.phone, c);
      if (c.code) map.set(c.code, c);
    });
    return map;
  }, [customers]);

  // Filtered tickets based on unified filter
  const filteredTickets = useMemo(() => {
    return AnalyticsService.filterTickets(tickets, filters, customersMap);
  }, [tickets, filters, customersMap]);

  // Data for Page 1: Games & Products
  const gamesAnalytics = useMemo(() => {
    return AnalyticsService.getGamesAnalytics(filteredTickets, tickets);
  }, [filteredTickets, tickets]);

  const productsAnalytics = useMemo(() => {
    return AnalyticsService.getProductsAnalytics(filteredTickets, tickets);
  }, [filteredTickets, tickets]);

  const classifiedProducts = useMemo(() => {
    return AnalyticsService.getClassifiedProducts(productsAnalytics, tickets);
  }, [productsAnalytics, tickets]);

  // Data for Page 3: Customer Segments
  const customerSegments = useMemo(() => {
    return AnalyticsService.getCustomerSegments(customers, filteredTickets);
  }, [customers, filteredTickets]);

  // Data for Page 4: Partners
  const partnerData = useMemo(() => {
    return AnalyticsService.getPartnerAnalytics(customers, filteredTickets);
  }, [customers, filteredTickets]);

  // Data for Page 5: Marketing ROI
  const marketingData = useMemo(() => {
    return AnalyticsService.getMarketingAnalytics(campaigns, filteredTickets);
  }, [campaigns, filteredTickets]);

  // Data for Page 6: Platforms
  const platformsAnalytics = useMemo(() => {
    return AnalyticsService.getPlatformsAnalytics(filteredTickets, customersMap);
  }, [filteredTickets, customersMap]);

  // Data for Page 7: Shifts
  const shiftsAnalytics = useMemo(() => {
    return AnalyticsService.getShiftsAnalytics(filteredTickets);
  }, [filteredTickets]);

  // Handle switching to Page 2 for a specific product
  const handleAnalyzeProduct = (gameName: string, productName: string) => {
    setTargetedProduct({ gameName, productName });
    setActivePage(2);
  };

  // Reset Filters
  const handleResetFilters = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    setFilters({
      datePreset: 'this_month',
      startDate: firstDay,
      endDate: todayStr,
      customerType: 'all',
      loyaltyTier: 'all',
      purchasingPower: 'all',
      gameId: 'all',
      adPlatform: 'all'
    });
    showToast('info', 'تمت إعادة التعيين', 'تمت استعادة فلاتر هذا الشهر الافتراضية');
  };

  // Save new marketing campaign
  const handleSaveCampaign = (camp: MarketingCampaign) => {
    AnalyticsService.saveMarketingCampaign(camp);
    setCampaigns(AnalyticsService.getMarketingCampaigns());
  };

  // 10. التقارير القابلة للتصدير (Excel / CSV / Print)
  const handleExportExcel = () => {
    if (!canExport) {
      showToast('warning', 'صلاحية غير كافية', 'التصدير متاح للمدراء ومسؤولي النظام فقط');
      return;
    }

    let exportRows: any[] = [];
    let fileName = `JKR_Analytics_${department}_Page${activePage}`;

    if (activePage === 1) {
      exportRows = gamesAnalytics.map(g => ({
        'اسم اللعبة': g.gameName,
        'عدد التذاكر': g.ticketsCount,
        'إجمالي الإيراد (جنيه)': g.revenue,
        'صافي الربح (جنيه)': g.profit,
        'هامش الربح %': `${g.marginPercent}%`,
        'نسبة النمو %': `${g.growthPercent}%`
      }));
      fileName = 'JKR_Games_Products_Analytics';
    } else if (activePage === 3) {
      exportRows = customerSegments.bigSpenders.map(c => ({
        'اسم العميل': c.customerName,
        'الهاتف': c.customerPhone,
        'عدد التذاكر': c.ticketsCount,
        'إجمالي المدفوع (جنيه)': c.totalSpent,
        'متوسط التذكرة (جنيه)': c.averageTicketValue,
        'فئة الولاء': c.loyaltyTier,
        'تاريخ آخر شراء': c.lastPurchaseDate
      }));
      fileName = 'JKR_Customer_Segments_Analytics';
    } else if (activePage === 4) {
      exportRows = partnerData.partnersList.map(p => ({
        'اسم الشريك': p.partnerName,
        'النوع': p.profileType,
        'عملاء جدد': p.newCustomersCount,
        'إيراد الوافدين (جنيه)': p.revenueFromReferred,
        'نسبة التكرار %': `${p.repetitionRatePercent}%`,
        'العمولة المستحقة (جنيه)': p.dueCommission,
        'معدل العائد ROI': `${p.roi}x`
      }));
      fileName = 'JKR_Partner_Performance_Analytics';
    } else if (activePage === 5) {
      exportRows = marketingData.campaignsWithMetrics.map(c => ({
        'اسم الحملة': c.campaignName,
        'النوع': c.type,
        'المنصة': c.platform,
        'المصاريف (جنيه)': c.amount,
        'الإيراد المتولد (جنيه)': c.revenueGenerated,
        'صافي الربح (جنيه)': c.netProfit,
        'العائد التسويقي ROI %': `${c.roi}%`
      }));
      fileName = 'JKR_Marketing_ROI_Analytics';
    } else if (activePage === 6) {
      exportRows = platformsAnalytics.map(p => ({
        'المنصة': p.platformLabel,
        'عدد العمليات': p.ticketsCount,
        'الإيراد (جنيه)': p.revenue,
        'صافي الربح (جنيه)': p.profit,
        'الهامش %': `${p.marginPercent}%`,
        'متوسط الطلب (جنيه)': p.averageOrderValue,
        'الحصة السوقية %': `${p.marketSharePercent}%`,
        'التوصية الذكية': p.aiRecommendation
      }));
      fileName = 'JKR_Platforms_Analytics';
    } else if (activePage === 7) {
      exportRows = shiftsAnalytics.shiftsList.map(s => ({
        'رقم الوردية': s.shiftNumber,
        'الموظف المسئول': s.employeeName,
        'القسم': s.department,
        'عدد التذاكر': s.ticketsCount,
        'الإيراد (جنيه)': s.revenue,
        'المتوقع دفترياً': s.expectedCash,
        'المسلّم فعلياً': s.actualCash,
        'الفارق النقدي': s.difference,
        'التقييم': s.performanceGrade
      }));
      fileName = 'JKR_Shifts_Analytics';
    } else {
      exportRows = filteredTickets.slice(0, 100).map(t => ({
        'رقم التذكرة': t.ticketNumber,
        'العميل': t.customerName,
        'اللعبة': t.gameName,
        'المبلغ': t.receivedAmount || t.requiredAmount,
        'التاريخ': t.createdAt
      }));
      fileName = 'JKR_Product_Time_Analytics';
    }

    exportToExcel(exportRows, fileName);
    showToast('success', 'تم التصدير بنجاح', `تم إنشاء وتنزيل مصنف Excel: ${fileName}.xlsx`);
  };

  const handleExportCSV = () => {
    if (!canExport) {
      showToast('warning', 'صلاحية غير كافية', 'التصدير متاح للمدراء ومسؤولي النظام فقط');
      return;
    }

    const rows = gamesAnalytics.map(g => [
      `"${g.gameName}"`,
      g.ticketsCount,
      g.revenue,
      g.profit,
      `"${g.marginPercent}%"`,
      `"${g.growthPercent}%"`
    ]);
    const headers = ['اللعبة', 'التذاكر', 'الإيراد', 'الربح', 'الهامش', 'النمو'];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JKR_Analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'تم تنزيل CSV', 'تم تصدير البيانات بصيغة CSV بنجاح');
  };

  const handlePrint = () => {
    if (!canExport) {
      showToast('warning', 'صلاحية غير كافية', 'الطباعة وتصدير التقارير متاحة للمدراء ومسؤولي النظام فقط');
      return;
    }

    const deptTitle = department === 'dealers' ? 'قسم التجار والموزعين (B2B)' : 'قسم الزبائن والشحن (B2C)';
    const reportDateRange = filters.startDate && filters.endDate 
      ? `من ${filters.startDate} إلى ${filters.endDate}`
      : 'الفترة المحددة';

    let pageTitle = 'تقرير تحليلات المنتجات والألعاب — الأداء والمبيعات';
    let kpis: ReportKPI[] = [];
    let tables: ReportTable[] = [];

    if (activePage === 1) {
      pageTitle = `تقرير تحليلات المنتجات والألعاب — ${deptTitle}`;
      const totalRev = gamesAnalytics.reduce((s, g) => s + (g.revenue || 0), 0);
      const totalProf = gamesAnalytics.reduce((s, g) => s + (g.profit || 0), 0);
      const totalTicketsCount = gamesAnalytics.reduce((s, g) => s + (g.ticketsCount || 0), 0);
      const avgMargin = totalRev > 0 ? ((totalProf / totalRev) * 100).toFixed(1) : '0';

      kpis = [
        { label: 'إجمالي الإيرادات', value: `${totalRev.toLocaleString()} ج.م`, color: 'blue' },
        { label: 'صافي الأرباح المحققة', value: `${totalProf.toLocaleString()} ج.م`, color: 'green' },
        { label: 'إجمالي العمليات والتذاكر', value: `${totalTicketsCount.toLocaleString()} عملية`, color: 'orange' },
        { label: 'متوسط هامش الربح', value: `${avgMargin}%`, color: 'green' }
      ];

      tables.push({
        title: '📊 جدول أداء الألعاب والخدمات الرئيسية (مقارنة الإيرادات والنمو)',
        columns: [
          { header: 'اسم اللعبة / الخدمة', key: 'gameName', align: 'right' },
          { header: 'عدد العمليات', key: 'ticketsCount', align: 'center' },
          { header: 'إجمالي الإيراد', key: 'revenue', align: 'left' },
          { header: 'صافي الربح', key: 'profit', align: 'left' },
          { header: 'هامش الربح', key: 'marginPercent', align: 'center' },
          { header: 'نسبة النمو', key: 'growthPercent', align: 'center' }
        ],
        rows: gamesAnalytics.map(g => ({
          gameName: g.gameName,
          ticketsCount: g.ticketsCount.toLocaleString(),
          revenue: `${(g.revenue || 0).toLocaleString()} ج`,
          profit: `${(g.profit || 0).toLocaleString()} ج`,
          marginPercent: `${g.marginPercent}%`,
          growthPercent: `${g.growthPercent}%`
        })),
        totals: {
          gameName: `إجمالي ${gamesAnalytics.length} ألعاب`,
          ticketsCount: totalTicketsCount.toLocaleString(),
          revenue: `${totalRev.toLocaleString()} ج`,
          profit: `${totalProf.toLocaleString()} ج`,
          marginPercent: `${avgMargin}%`
        }
      });

      if (productsAnalytics && productsAnalytics.length > 0) {
        const topProds = productsAnalytics.slice(0, 20);
        tables.push({
          title: '🏆 أكثر المنتجات والباقات مبيعاً وطلباً',
          columns: [
            { header: 'اسم الباقة / المنتج', key: 'productName', align: 'right' },
            { header: 'اللعبة', key: 'gameName', align: 'right' },
            { header: 'مرات البيع', key: 'ticketsCount', align: 'center' },
            { header: 'إجمالي المبيعات', key: 'revenue', align: 'left' },
            { header: 'صافي الربح', key: 'profit', align: 'left' }
          ],
          rows: topProds.map(p => ({
            productName: p.productName,
            gameName: p.gameName,
            ticketsCount: (p.ticketsCount || 0).toLocaleString(),
            revenue: `${(p.revenue || 0).toLocaleString()} ج`,
            profit: `${(p.profit || 0).toLocaleString()} ج`
          }))
        });
      }
    } else if (activePage === 2) {
      pageTitle = `تقرير سلوك شراء المنتجات وأوقات الذروة — ${deptTitle}`;
      kpis = [
        { label: 'المنتج المختار للتحليل', value: targetedProduct?.productName || 'تحليل شامل', color: 'orange' },
        { label: 'إجمالي العمليات المفلترة', value: `${filteredTickets.length} تذكرة`, color: 'blue' }
      ];
      tables.push({
        title: '🕒 سجل تفصيلي لعمليات الشراء والتوقيتات',
        columns: [
          { header: 'رقم التذكرة', key: 'ticketNo', align: 'center' },
          { header: 'العميل', key: 'customer', align: 'right' },
          { header: 'اللعبة والباقة', key: 'item', align: 'right' },
          { header: 'المبلغ', key: 'amount', align: 'left' },
          { header: 'التاريخ والتوقيت', key: 'date', align: 'center' }
        ],
        rows: filteredTickets.slice(0, 60).map(t => ({
          ticketNo: `#${t.ticketNumber}`,
          customer: t.customerName || 'عميل نقدي',
          item: `${t.gameName} — ${t.gameProductName || ''}`,
          amount: `${(t.receivedAmount || t.requiredAmount || 0).toLocaleString()} ج`,
          date: formatDateTime(t.createdAt)
        }))
      });
    } else if (activePage === 3) {
      pageTitle = `تقرير شرائح العملاء وسلوكيات الإنفاق — ${deptTitle}`;
      const totalSpenders = customerSegments.bigSpenders.length;
      const totalSpentAll = customerSegments.bigSpenders.reduce((s, c) => s + (c.totalSpent || 0), 0);
      kpis = [
        { label: 'كبار العملاء (VIP)', value: `${totalSpenders} عميل`, color: 'orange' },
        { label: 'إجمالي إنفاق كبار العملاء', value: `${totalSpentAll.toLocaleString()} ج.م`, color: 'green' }
      ];
      tables.push({
        title: '👑 قائمة كبار العملاء الأكثر إنفاقاً (Top Spenders)',
        columns: [
          { header: 'اسم العميل', key: 'name', align: 'right' },
          { header: 'رقم الهاتف', key: 'phone', align: 'center' },
          { header: 'عدد العمليات', key: 'count', align: 'center' },
          { header: 'إجمالي المدفوع', key: 'spent', align: 'left' },
          { header: 'متوسط الطلب', key: 'avg', align: 'left' },
          { header: 'مستوى الولاء', key: 'tier', align: 'center' }
        ],
        rows: customerSegments.bigSpenders.map(c => ({
          name: c.customerName,
          phone: c.customerPhone,
          count: c.ticketsCount.toLocaleString(),
          spent: `${(c.totalSpent || 0).toLocaleString()} ج`,
          avg: `${(c.averageTicketValue || 0).toLocaleString()} ج`,
          tier: c.loyaltyTier || 'افتراضي'
        }))
      });
    } else if (activePage === 4) {
      pageTitle = `تقرير أداء وعائدات الشركاء والمسوقين — ${deptTitle}`;
      const totalCommissions = partnerData.partnersList.reduce((s, p) => s + (p.dueCommission || 0), 0);
      const totalReferredRev = partnerData.partnersList.reduce((s, p) => s + (p.revenueFromReferred || 0), 0);
      kpis = [
        { label: 'عدد الشركاء النشطين', value: `${partnerData.partnersList.length} شريك`, color: 'blue' },
        { label: 'إجمالي إيراد الوافدين', value: `${totalReferredRev.toLocaleString()} ج.م`, color: 'green' },
        { label: 'العمولات المستحقة', value: `${totalCommissions.toLocaleString()} ج.م`, color: 'orange' }
      ];
      tables.push({
        title: '🤝 قائمة الشركاء ومعدل تحويل الإحالات والعمولات',
        columns: [
          { header: 'اسم الشريك', key: 'name', align: 'right' },
          { header: 'نوع الشراكة', key: 'type', align: 'center' },
          { header: 'عملاء جدد', key: 'newCust', align: 'center' },
          { header: 'إيراد الإحالات', key: 'revenue', align: 'left' },
          { header: 'نسبة التكرار', key: 'rate', align: 'center' },
          { header: 'العمولة المستحقة', key: 'commission', align: 'left' },
          { header: 'معدل العائد ROI', key: 'roi', align: 'center' }
        ],
        rows: partnerData.partnersList.map(p => ({
          name: p.partnerName,
          type: p.profileType === 'shop' ? 'محل / متجر' : p.profileType === 'influencer' ? 'صانع محتوى' : 'شريك معتمد',
          newCust: (p.newCustomersCount || 0).toLocaleString(),
          revenue: `${(p.revenueFromReferred || 0).toLocaleString()} ج`,
          rate: `${p.repetitionRatePercent}%`,
          commission: `${(p.dueCommission || 0).toLocaleString()} ج`,
          roi: `${p.roi}x`
        }))
      });
    } else if (activePage === 5) {
      pageTitle = `تقرير أداء الحملات التسويقية والعائد ROI — ${deptTitle}`;
      const totalSpend = marketingData.campaignsWithMetrics.reduce((s, c) => s + (c.amount || 0), 0);
      const totalGenRev = marketingData.campaignsWithMetrics.reduce((s, c) => s + (c.revenueGenerated || 0), 0);
      const totalGenProfit = marketingData.campaignsWithMetrics.reduce((s, c) => s + (c.netProfit || 0), 0);
      kpis = [
        { label: 'عدد الحملات', value: `${marketingData.campaignsWithMetrics.length} حملة`, color: 'blue' },
        { label: 'إجمالي المصاريف', value: `${totalSpend.toLocaleString()} ج.م`, color: 'red' },
        { label: 'الإيراد المتولد', value: `${totalGenRev.toLocaleString()} ج.م`, color: 'green' },
        { label: 'صافي الربح التسويقي', value: `${totalGenProfit.toLocaleString()} ج.م`, color: 'green' }
      ];
      tables.push({
        title: '📢 تفاصيل الحملات التسويقية والمنصات ومؤشرات العائد',
        columns: [
          { header: 'اسم الحملة', key: 'name', align: 'right' },
          { header: 'المنصة', key: 'platform', align: 'center' },
          { header: 'تكلفة الحملة', key: 'cost', align: 'left' },
          { header: 'الإيراد المتولد', key: 'revenue', align: 'left' },
          { header: 'صافي الأرباح', key: 'profit', align: 'left' },
          { header: 'العائد التسويقي ROI', key: 'roi', align: 'center' }
        ],
        rows: marketingData.campaignsWithMetrics.map(c => ({
          name: c.campaignName,
          platform: c.platform,
          cost: `${(c.amount || 0).toLocaleString()} ج`,
          revenue: `${(c.revenueGenerated || 0).toLocaleString()} ج`,
          profit: `${(c.netProfit || 0).toLocaleString()} ج`,
          roi: `${c.roi}%`
        }))
      });
    }

    const doc: ReportDocumentData = {
      id: `ANL-${Date.now().toString().slice(-6)}`,
      templateType: 'dashboard',
      title: pageTitle,
      subtitle: `منظومة تحليل البيانات والذكاء الإحصائي — ${deptTitle} (الفترة: ${reportDateRange})`,
      issueDate: formatDateTime(new Date().toISOString()),
      periodLabel: reportDateRange,
      generatedBy: user?.fullName || 'مدير النظام',
      branchName: 'NZM JKR TOP UP ERP — المقر الرئيسي',
      metaDetails: [
        { label: 'القسم', value: deptTitle },
        { label: 'الصفحة التحليلية', value: `الصفحة ${activePage}` },
        { label: 'تاريخ الاستخراج', value: formatDateTime(new Date().toISOString()) }
      ],
      kpis,
      tables,
      notes: [
        'تم استخراج هذه البيانات إحصائياً ومطابقتها مع قيود التذاكر والمحافظ المالية المعتمدة.',
        'الأرقام الواردة في هذا التقرير تمثل نتائج الفلترة المطبقة وقت الطباعة.'
      ],
      signatories: [
        { title: 'مسؤول التحليلات والإحصاء', name: user?.fullName || 'مدير القسم' },
        { title: 'المراجع المالي والتدقيق', name: 'إدارة الحسابات العامة' },
        { title: 'اعتماد مدير النظام (Owner)', name: 'الختم والتوقيع الرسمي' }
      ]
    };

    const config: ReportConfig = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      reportType: 'detailed',
      showProfits: true,
      showCosts: true,
      showExpenses: true,
      showLogo: true,
      showUserData: true,
      showPageNumbers: true,
      showManagerSignature: true,
      orientation: 'landscape'
    };

    ReportEngine.printReportDocument(doc, config);
    showToast('success', 'تم تجهيز التقرير', 'تم فتح مستند التقرير الرسمي المنسق للطباعة أو الحفظ كـ PDF');
  };

  return (
    <div className="space-y-4 animate-fade-in p-2 sm:p-4 text-right">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Breadcrumb
          items={[
            { id: 'home', label: 'الرئيسية' },
            { id: department, label: department === 'dealers' ? 'قسم التجار والموزعين' : 'قسم الزبائن والشحن' },
            { id: 'analytics', label: 'تبويب تحليل البيانات والذكاء', active: true }
          ]}
        />

        {/* Global Action Tools: Exports & Role indicator */}
        <div className="flex items-center gap-2">
          {canExport && (
            <>
              <button
                onClick={handleExportExcel}
                className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5"
                title="تصدير الجداول والأرقام إلى ملف Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير Excel</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs transition-all flex items-center gap-1.5"
                title="تصدير البيانات الخام بصيغة CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs transition-all flex items-center gap-1.5"
                title="طباعة أو تصدير PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة / PDF</span>
              </button>
            </>
          )}

          {!canExport && (
            <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-zinc-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>صلاحية: عرض التحليلات (موظف)</span>
            </span>
          )}
        </div>
      </div>

      {/* Sub Navigation Bar: The 5 Pages */}
      <Card className="p-2">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold no-scrollbar">
          <button
            onClick={() => setActivePage(1)}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activePage === 1
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>الصفحة 1: Dashboard المنتجات والألعاب</span>
          </button>

          <button
            onClick={() => setActivePage(2)}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activePage === 2
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <LineChart className="w-4 h-4 text-blue-500" />
            <span>الصفحة 2: تحليل سلوك المنتج</span>
          </button>

          <button
            onClick={() => setActivePage(3)}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activePage === 3
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span>الصفحة 3: تحليل العملاء والعروض</span>
          </button>

          <button
            onClick={() => setActivePage(4)}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activePage === 4
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Handshake className="w-4 h-4 text-purple-500" />
            <span>الصفحة 4: تحليل الشركاء والمحلات</span>
          </button>

          <button
            onClick={() => setActivePage(5)}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activePage === 5
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Megaphone className="w-4 h-4 text-pink-500" />
            <span>الصفحة 5: فعالية التسويق (Marketing ROI)</span>
          </button>

          <button
            onClick={() => setActivePage(6)}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activePage === 6
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-500" />
            <span>الصفحة 6: تحليل المنصات والقنوات</span>
          </button>

          <button
            onClick={() => setActivePage(7)}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activePage === 7
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>الصفحة 7: تحليل الورديات والموظفين</span>
          </button>
        </div>
      </Card>

      {/* 2. الفلتر الموحد الشامل (ظاهر في كل الصفحات) */}
      <UnifiedAnalyticsFilterBar
        filters={filters}
        gamesList={gamesList}
        onApplyFilters={newF => {
          setFilters(newF);
          showToast('success', 'تم تطبيق الفلتر', 'تم تحديث جميع الرسوم البيانية والجداول');
        }}
        onResetFilters={handleResetFilters}
        filteredCount={filteredTickets.length}
        totalCount={tickets.length}
      />

      {/* Dynamic View of the Pages */}
      <div className="pt-2">
        {activePage === 1 && (
          <Page1ProductsDashboard
            games={gamesAnalytics}
            products={productsAnalytics}
            classifiedProducts={classifiedProducts}
            onAnalyzeProduct={handleAnalyzeProduct}
          />
        )}

        {activePage === 2 && (
          <Page2ProductBehavior
            tickets={filteredTickets}
            gamesList={gamesList}
            initialGameName={targetedProduct?.gameName}
            initialProductName={targetedProduct?.productName}
          />
        )}

        {activePage === 3 && (
          <Page3CustomerAnalytics
            customerSegments={customerSegments}
            canSendOffers={canSendOffers}
          />
        )}

        {activePage === 4 && (
          <Page4PartnerAnalytics
            partnerData={partnerData}
            canManagePartners={isOwnerOrAdmin}
          />
        )}

        {activePage === 5 && (
          <Page5MarketingROI
            marketingData={marketingData}
            onSaveCampaign={handleSaveCampaign}
            canExport={canExport}
          />
        )}

        {activePage === 6 && (
          <Page6PlatformsAnalytics
            platforms={platformsAnalytics}
          />
        )}

        {activePage === 7 && (
          <Page7ShiftsAnalytics
            shiftSummary={shiftsAnalytics}
          />
        )}
      </div>
    </div>
  );
};
