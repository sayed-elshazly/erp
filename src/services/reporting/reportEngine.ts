import { db } from '../../database/db';
import {
  ReportTemplateType,
  ReportConfig,
  ReportDocumentData,
  ReportKPI,
  ReportTable,
  ReportTableColumn
} from './reportTypes';
import { Employee, SalarySlip, AttendanceRecord } from '../../types/finance.types';
import * as XLSX from 'xlsx';
import { formatDateTime, formatDate, formatCurrency } from '../../utils/formatters';
import { JKR_OFFICIAL_LOGO_DATA_URL } from '../../assets/logoBase64';

export class ReportEngine {
  /**
   * Main Dispatcher: Generate Structured Report Data from Database
   */
  public static generateReportDocument(
    templateType: ReportTemplateType,
    config: ReportConfig,
    customPayload?: any,
    userName = 'مدير النظام'
  ): ReportDocumentData {
    const periodLabel =
      config.startDate && config.endDate
        ? `من ${config.startDate} إلى ${config.endDate}`
        : config.startDate
        ? `من ${config.startDate} حتى تاريخه`
        : config.endDate
        ? `حتى ${config.endDate}`
        : 'كافة الفترات المسجلة';

    const baseDoc: ReportDocumentData = {
      id: `RPT-${Date.now().toString().slice(-6)}`,
      templateType,
      title: 'تقرير النظام',
      issueDate: formatDateTime(new Date().toISOString()),
      periodLabel,
      generatedBy: config.showUserData ? userName : 'النظام الآلي',
      branchName: 'الفرع الرئيسي - NZM JKR',
      tables: [],
      signatories: config.showManagerSignature
        ? [
            { title: 'الموظف المسئول', name: userName },
            { title: 'المراجع المالي', name: 'إدارة الحسابات' },
            { title: 'اعتماد مدير النظام (Owner)', name: 'الختم والتوقيع الرسمي' }
          ]
        : undefined
    };

    switch (templateType) {
      case 'dashboard':
        return this.buildDashboardReport(baseDoc, config);
      case 'customer_statement':
        return this.buildCustomerStatementReport(baseDoc, config, customPayload);
      case 'customers':
        return this.buildCustomersListReport(baseDoc, config);
      case 'ticket_invoice':
        return this.buildTicketInvoiceReport(baseDoc, config, customPayload);
      case 'catalog':
        return this.buildCatalogReport(baseDoc, config);
      case 'wallets':
      case 'wallet_statement':
        return this.buildWalletStatementReport(baseDoc, config, customPayload);
      case 'bonds':
        return this.buildDepositBondsReport(baseDoc, config);
      case 'codes':
        return this.buildCodesReport(baseDoc, config);
      case 'coupons':
        return this.buildCouponsReport(baseDoc, config);
      case 'shift_settlement':
        return this.buildShiftSettlementReport(baseDoc, config, customPayload);
      case 'sales':
        return this.buildSalesPerformanceReport(baseDoc, config);
      case 'expenses':
        return this.buildExpensesReport(baseDoc, config);
      case 'payroll':
      case 'employee_statement':
        return this.buildPayrollReport(baseDoc, config, customPayload);
      case 'merchants':
      case 'merchants_statement':
        return this.buildMerchantsReport(baseDoc, config, customPayload);
      case 'subscriptions':
        return this.buildSubscriptionsReport(baseDoc, config, customPayload);
      default:
        return this.buildShiftSettlementReport(baseDoc, config);
    }
  }

  // -------------------------------------------------------------
  // 1. DASHBOARD & SYSTEM PERFORMANCE REPORT
  // -------------------------------------------------------------
  private static buildDashboardReport(doc: ReportDocumentData, config: ReportConfig): ReportDocumentData {
    const metrics = db.getFinanceMetrics({
      datePreset: config.startDate || config.endDate ? 'custom' : 'all',
      customStartDate: config.startDate,
      customEndDate: config.endDate
    });
    const tickets = this.filterTicketsByDate(db.getTickets(), config);
    const games = db.getGameTree();

    const totalRevenue = metrics.totalRevenue;
    const totalCost = metrics.totalCosts;
    const totalExpenses = metrics.monthlyExpenses;
    const netProfit = metrics.netProfit;

    doc.title = 'تقرير ملخص الأداء العام والمؤشرات المالية (Dashboard Summary)';
    doc.subtitle = 'نظرة شاملة وموحدة على حجم العمليات، الإيرادات، الأرباح والمصروفات (Single Source of Truth)';

    doc.kpis = [
      { label: 'إجمالي العمليات', value: `${metrics.totalOperationsCount || tickets.length} عملية`, color: 'orange' },
      { label: 'إجمالي الإيرادات', value: `${totalRevenue.toLocaleString()} ج.م`, color: 'blue' }
    ];

    if (config.showCosts) {
      doc.kpis.push({ label: 'تكلفة البضاعة (-)', value: `-${Math.round(totalCost).toLocaleString()} ج.م`, color: 'red' });
    }
    if (config.showExpenses) {
      doc.kpis.push({ label: 'المصروفات التشغيلية (-)', value: `-${totalExpenses.toLocaleString()} ج.م`, color: 'red' });
    }
    if (config.showProfits) {
      doc.kpis.push({ label: 'صافي الأرباح المحققة (=)', value: `${Math.round(netProfit).toLocaleString()} ج.م`, color: 'green' });
    }

    // Game breakdown table
    const gameRows = games.map(g => {
      const gameTickets = tickets.filter(t => t.gameName === g.name || t.gameId === g.id);
      const rev = gameTickets.reduce((s, t) => s + (t.receivedAmount || 0), 0);
      return {
        game: g.name,
        code: g.code,
        productsCount: g.products.length,
        ordersCount: gameTickets.length,
        revenue: `${rev.toLocaleString()} ج`
      };
    });

    const columns: ReportTableColumn[] = [
      { header: 'اسم اللعبة / القسم', key: 'game' },
      { header: 'الكود', key: 'code', align: 'center' },
      { header: 'عدد الباقات', key: 'productsCount', align: 'center' },
      { header: 'الطلبات المنفذة', key: 'ordersCount', align: 'center' },
      { header: 'إجمالي الإيراد', key: 'revenue', align: 'left' }
    ];

    doc.tables.push({
      title: 'مبيعات وأداء الألعاب في الفترة المحددة',
      columns,
      rows: gameRows,
      totals: {
        game: 'الإجمالي العام',
        ordersCount: tickets.length,
        revenue: `${totalRevenue.toLocaleString()} ج`
      }
    });

    return doc;
  }

  // -------------------------------------------------------------
  // 2. CUSTOMER STATEMENT REPORT (كشف حساب عميل: إجمالي vs مفصل)
  // -------------------------------------------------------------
  private static buildCustomerStatementReport(
    doc: ReportDocumentData,
    config: ReportConfig,
    customer: any
  ): ReportDocumentData {
    const cust = customer || db.getCustomers().find(c => c.id === config.filterCustomerId) || db.getCustomers()[0];
    const tickets = this.filterTicketsByDate(
      db.getTickets().filter(t => t.customerId === cust?.id || t.customerPhone === cust?.phone),
      config
    );

    const totalPaid = tickets.reduce((s, t) => s + (t.receivedAmount || t.requiredAmount || 0), 0);
    const totalCashback = tickets.reduce((s, t) => s + (t.cashbackEarned || 0), 0);
    const avgTicketValue = tickets.length > 0 ? Math.round(totalPaid / tickets.length) : 0;

    const isSummary = config.reportType === 'summary';

    doc.title = isSummary
      ? `تقرير مالي إجمالي عام: ${cust?.name || 'عميل نقدي'}`
      : `كشف حساب تفصيلي ودقيق: ${cust?.name || 'عميل نقدي'}`;
    doc.subtitle = isSummary
      ? `ملخص مؤشرات الشحن وتوزيع الألعاب • هاتف: ${cust?.phone || '-'} • كود: ${cust?.customCode || cust?.id || '-'}`
      : `سجل الحركات التفصيلية تذكرة بتذكرة • هاتف: ${cust?.phone || '-'} • كود: ${cust?.customCode || cust?.id || '-'}`;

    doc.metaDetails = [
      { label: 'اسم العميل', value: cust?.name || 'عميل نقدي' },
      { label: 'نوع البروفايل', value: cust?.profileType === 'shop' ? 'محل تجاري' : cust?.profileType === 'partner' ? 'شريك / مسوق' : 'عميل أفراد' },
      { label: 'رقم الهاتف', value: cust?.phone || '-' },
      { label: 'تاريخ التسجيل', value: formatDate(cust?.createdAt || new Date().toISOString()) },
      { label: 'رصيد الحساب الدائن', value: `${cust?.accountBalance || 0} ج.م` },
      { label: 'رصيد الكاش باك المتاح', value: `${cust?.cashbackBalance || 0} ج.م` },
      { label: 'محفظة الإحالة والعمولات', value: `${cust?.referralWalletBalance || 0} ج.م` },
      { label: 'إجمالي الشحنات في الفترة', value: `${tickets.length} تذكرة` },
      { label: 'نوع التقرير', value: isSummary ? '📊 تقرير إجمالي عام' : '📑 كشف تفصيلي دقيق' }
    ];

    if (isSummary) {
      // 🌟 SUMMARY MODE: Executive High-Level KPIs and Game Grouping (No raw ticket spam)
      doc.kpis = [
        { label: 'إجمالي الإنفاق بالفترة', value: `${totalPaid.toLocaleString()} ج.م`, color: 'blue' },
        { label: 'عدد الطلبات', value: `${tickets.length} طلب`, color: 'orange' },
        { label: 'متوسط قيمة الطلب', value: `${avgTicketValue.toLocaleString()} ج.م`, color: 'blue' },
        { label: 'الكاش باك المكتسب (+)', value: `+${totalCashback.toLocaleString()} ج.م`, color: 'green' },
        { label: 'رصيد الكاش باك الحالي', value: `${cust?.cashbackBalance || 0} ج.م`, color: 'green' },
        { label: 'رصيد محفظة الإحالة', value: `${cust?.referralWalletBalance || 0} ج.م`, color: 'orange' }
      ];

      // Game Aggregation
      const gameMap: { [key: string]: { count: number; totalPaid: number; cashback: number } } = {};
      tickets.forEach(t => {
        const g = t.gameName || 'عام / باقات أخرى';
        if (!gameMap[g]) gameMap[g] = { count: 0, totalPaid: 0, cashback: 0 };
        gameMap[g].count += 1;
        gameMap[g].totalPaid += (t.receivedAmount || t.requiredAmount || 0);
        gameMap[g].cashback += (t.cashbackEarned || 0);
      });

      const gameSummaryRows = Object.entries(gameMap)
        .map(([gameName, d]) => ({
          gameName,
          ordersCount: `${d.count} طلب`,
          totalAmount: `${d.totalPaid.toLocaleString()} ج`,
          cashback: `+${d.cashback.toLocaleString()} ج`,
          percentage: totalPaid > 0 ? `${Math.round((d.totalPaid / totalPaid) * 100)}%` : '0%'
        }))
        .sort((a, b) => parseFloat(b.totalAmount.replace(/[^0-9]/g, '')) - parseFloat(a.totalAmount.replace(/[^0-9]/g, '')));

      doc.tables.push({
        title: '📊 ملخص مشتريات وشحنات العميل موزعة حسب الألعاب الإلكترونية',
        columns: [
          { header: 'اسم اللعبة / التصنيف', key: 'gameName' },
          { header: 'عدد الشحنات', key: 'ordersCount', align: 'center' },
          { header: 'إجمالي المبالغ المدفوعة', key: 'totalAmount', align: 'left' },
          { header: 'الكاش باك المحقق', key: 'cashback', align: 'left' },
          { header: 'نسبة الاستهلاك', key: 'percentage', align: 'center' }
        ],
        rows: gameSummaryRows,
        totals: {
          gameName: 'الإجمالي العام',
          ordersCount: `${tickets.length} طلب`,
          totalAmount: `${totalPaid.toLocaleString()} ج`,
          cashback: `+${totalCashback.toLocaleString()} ج`,
          percentage: '100%'
        }
      });
    } else {
      // 📑 DETAILED MODE: Full Line-by-Line Itemized Ledger
      doc.kpis = [
        { label: 'إجمالي المدفوعات المسجلة', value: `${totalPaid.toLocaleString()} ج.م`, color: 'blue' },
        { label: 'إجمالي التذاكر المنفذة', value: `${tickets.length} تذكرة`, color: 'orange' },
        { label: 'الكاش باك المكتسب (+)', value: `+${totalCashback.toLocaleString()} ج.م`, color: 'green' },
        { label: 'الرصيد المتاح للخصم', value: `${cust?.cashbackBalance || 0} ج.م`, color: 'green' }
      ];

      const rows = tickets.map(t => ({
        ticketNo: t.ticketNumber,
        date: formatDateTime(t.createdAt),
        gameProduct: `${t.gameName || 'لعبة'} — ${t.gameProductName || 'باقة'}`,
        playerId: t.playerGameId || '-',
        wallet: t.paymentWallet || t.paymentGateway || 'محفظة تشغيل',
        amount: `${t.receivedAmount || t.requiredAmount} ج`,
        cashback: `+${t.cashbackEarned || 0} ج`,
        employee: t.assignedTo || 'النظام',
        status: t.status === 'completed' ? 'مكتملة ✓' : t.status === 'problem' ? 'مشكلة ⚠️' : t.status === 'refunded' ? 'مستردة ↩️' : 'قيد المعالجة'
      }));

      doc.tables.push({
        title: '📑 سجل العمليات وتذاكر الشحن التفصيلية (حركة بحركة)',
        columns: [
          { header: 'رقم التذكرة', key: 'ticketNo', align: 'center' },
          { header: 'تاريخ ووقت العملية', key: 'date' },
          { header: 'اللعبة والباقة المشحونة', key: 'gameProduct' },
          { header: 'الـ ID اللاعب', key: 'playerId', align: 'center' },
          { header: 'المحفظة / الوسيلة', key: 'wallet' },
          { header: 'المبلغ المدفوع', key: 'amount', align: 'left' },
          { header: 'الكاش باك', key: 'cashback', align: 'left' },
          { header: 'الموظف المسئول', key: 'employee' },
          { header: 'الحالة', key: 'status', align: 'center' }
        ],
        rows,
        totals: {
          ticketNo: `العدد: ${tickets.length}`,
          amount: `${totalPaid.toLocaleString()} ج`,
          cashback: `+${totalCashback.toLocaleString()} ج`
        }
      });
    }

    return doc;
  }

  // -------------------------------------------------------------
  // 3. CUSTOMERS LIST REPORT (تقرير العملاء الشامل)
  // -------------------------------------------------------------
  private static buildCustomersListReport(doc: ReportDocumentData, config: ReportConfig): ReportDocumentData {
    let customers = db.getCustomers();
    if (config.filterStatus) {
      customers = customers.filter(c => c.profileType === config.filterStatus);
    }

    doc.title = 'تقرير بيانات وأرصدة العملاء والشركاء';
    doc.subtitle = 'كشف مجمع بالعملاء والمحلات والمسوقين ورصيد الكاش باك المعلق';

    doc.kpis = [
      { label: 'إجمالي المسجلين', value: `${customers.length} عميل`, color: 'blue' },
      { label: 'إجمالي الكاش باك المكتسب', value: `${customers.reduce((s, c) => s + (c.totalCashbackEarned || 0), 0).toLocaleString()} ج`, color: 'orange' },
      { label: 'أرصدة الكاش باك الحالية', value: `${customers.reduce((s, c) => s + (c.cashbackBalance || 0), 0).toLocaleString()} ج`, color: 'green' }
    ];

    const rows = customers.map(c => ({
      code: c.code || c.id.slice(-6),
      name: c.name,
      phone: c.phone,
      type: c.profileType === 'shop' ? 'محل' : c.profileType === 'partner' ? 'شريك' : c.profileType === 'influencer' ? 'مشهور' : 'عميل',
      loyalty: c.loyaltyTier === 'vip' ? 'VIP ملكي' : c.loyaltyTier === 'gold' ? 'ذهبي' : c.loyaltyTier === 'silver' ? 'فضي' : 'عادي',
      lifetimeTier: c.lifetimeSpendingTier === 'platinum' ? '💎 بلاتينيوم' : c.lifetimeSpendingTier === 'gold' ? '🥇 ذهبي' : c.lifetimeSpendingTier === 'silver' ? '🥈 فضي' : '🥉 برونز',
      totalSpent: `${(c.totalSpent || 0).toLocaleString()} ج`,
      totalSpentUSD: `$${(c.totalSpentUSD || 0).toLocaleString()}`,
      cashbackBalance: `${(c.cashbackBalance || 0).toLocaleString()} ج`,
      orders: c.totalOrders || 0
    }));

    doc.tables.push({
      title: 'جدول العملاء والمحلات والشركاء مع مستويات الولاء والتصنيف المالي',
      columns: [
        { header: 'الكود', key: 'code', align: 'center' },
        { header: 'اسم العميل / الشريك', key: 'name' },
        { header: 'الهاتف', key: 'phone', align: 'center' },
        { header: 'النوع', key: 'type', align: 'center' },
        { header: 'مستوى الولاء', key: 'loyalty', align: 'center' },
        { header: 'تصنيف الإنفاق (USD)', key: 'lifetimeTier', align: 'center' },
        { header: 'إجمالي المشتريات (ج)', key: 'totalSpent', align: 'left' },
        { header: 'المشتريات ($)', key: 'totalSpentUSD', align: 'left' },
        { header: 'الكاش باك', key: 'cashbackBalance', align: 'left' },
        { header: 'الطلبات', key: 'orders', align: 'center' }
      ],
      rows,
      totals: {
        code: `الإجمالي: ${customers.length}`,
        totalSpent: `${customers.reduce((s, c) => s + (c.totalSpent || 0), 0).toLocaleString()} ج`,
        totalSpentUSD: `$${customers.reduce((s, c) => s + (c.totalSpentUSD || 0), 0).toLocaleString()}`,
        cashbackBalance: `${customers.reduce((s, c) => s + (c.cashbackBalance || 0), 0).toLocaleString()} ج`
      }
    });

    return doc;
  }

  // -------------------------------------------------------------
  // 4. TICKET INVOICE (فاتورة شحن احترافية)
  // -------------------------------------------------------------
  private static buildTicketInvoiceReport(
    doc: ReportDocumentData,
    config: ReportConfig,
    ticket: any
  ): ReportDocumentData {
    const t = ticket || db.getTickets()[0];
    const customer = t?.customerId
      ? db.getCustomerById(t.customerId)
      : db.getCustomers().find(c => c.phone === t?.customerPhone);

    const primaryBalance = customer ? (customer.accountBalance ?? customer.balance ?? 0) : 0;
    const cashbackBalance = customer ? (customer.cashbackBalance ?? 0) : (t?.cashbackEarned || 0);
    const referralBalance = customer ? (customer.referralWalletBalance ?? 0) : 0;

    const getDurationText = () => {
      if (t?.executionDurationMinutes && t.executionDurationMinutes > 0) {
        return `${t.executionDurationMinutes} دقيقة ⚡`;
      }
      const end = t?.completedAt ? new Date(t.completedAt).getTime() : (t?.status === 'completed' ? new Date(t.updatedAt).getTime() : 0);
      const start = new Date(t?.createdAt || Date.now()).getTime();
      if (end > start) {
        const diffMin = Math.round((end - start) / 60000);
        return `${diffMin > 0 ? diffMin : 1} دقيقة ⚡`;
      }
      return t?.status === 'completed' ? 'فوري ⚡' : 'قيد المعالجة';
    };

    const deliveryDateText = t?.completedAt
      ? formatDateTime(t.completedAt)
      : (t?.status === 'completed' ? formatDateTime(t.updatedAt) : 'قيد المعالجة');

    const items = t?.items && t.items.length > 0 ? t.items : [
      {
        productName: t?.gameProductName || 'شحن باقة ألعاب',
        gameName: t?.gameName || 'اللعبة',
        quantity: 1,
        unitPrice: t?.receivedAmount || t?.requiredAmount || 0,
        totalPrice: t?.receivedAmount || t?.requiredAmount || 0
      }
    ];

    const subtotal = items.reduce((s: number, it: any) => s + (it.totalPrice || (it.unitPrice * (it.quantity || 1))), 0);
    const finalAmount = t?.receivedAmount || t?.requiredAmount || subtotal;
    const isReservation = t?.isReservation || t?.operationMode === 'reservation';
    const isReservationPending = isReservation && t?.status !== 'completed';
    const isReservationDelivered = isReservation && t?.status === 'completed';

    if (isReservationPending) {
      doc.title = `إيصال حجز وتأكيد طلب معتمد #${t?.ticketNumber || 'RES-001'}`;
      doc.subtitle = `JKR TOP UP ERP — Official Reservation & Booking Receipt`;
    } else if (isReservationDelivered) {
      doc.title = `فاتورة تسليم وإتمام حجز معتمدة #${t?.ticketNumber || 'INV-001'}`;
      doc.subtitle = `JKR TOP UP ERP — Delivered Reservation Invoice`;
    } else {
      doc.title = `فاتورة شحن إلكترونية #${t?.ticketNumber || 'INV-001'}`;
      doc.subtitle = `JKR TOP UP ERP — Official Top-Up Invoice`;
    }

    doc.metaDetails = [
      { label: isReservationPending ? 'رقم تذكرة الحجز' : 'رقم الفاتورة والتذكرة', value: t?.ticketNumber || 'TKT-001' },
      ...(isReservationPending ? [
        { label: 'تاريخ تسجيل الحجز', value: formatDateTime(t?.createdAt || new Date().toISOString()) },
        { label: '📅 الميعاد المطلوب للتسليم', value: `${t?.scheduledDeliveryDate || 'غير محدد'} ${t?.scheduledDeliveryTime ? `(الساعة ${t.scheduledDeliveryTime})` : ''}` },
        { label: 'حالة الحجز', value: '📦 قيد الحجز والتجهيز للتسليم' }
      ] : isReservationDelivered ? [
        { label: 'تاريخ تسجيل الحجز', value: formatDateTime(t?.createdAt || new Date().toISOString()) },
        { label: 'تاريخ ووقت التسليم الفعلي', value: deliveryDateText },
        { label: 'مدة الإنجاز حتى التسليم', value: getDurationText() },
        ...(t?.scheduledDeliveryDate ? [{ label: 'الموعد المجدول سابقاً', value: `${t.scheduledDeliveryDate} ${t.scheduledDeliveryTime || ''}` }] : [])
      ] : [
        { label: 'تاريخ بدء المعاملة', value: formatDateTime(t?.createdAt || new Date().toISOString()) },
        { label: 'تاريخ ووقت التسليم', value: deliveryDateText },
        { label: 'سرعة الإنجاز والتسليم', value: getDurationText() }
      ]),
      { label: 'اسم العميل', value: t?.customerName || 'عميل نقدي' },
      { label: 'رقم هاتف العميل', value: t?.customerPhone || '-' },
      ...(t?.senderPhoneNumber ? [{ label: 'رقم المحول منه', value: t.senderPhoneNumber }] : []),
      ...(t?.transferReferenceNumber ? [{ label: 'رقم المرجع / التحويل', value: t.transferReferenceNumber }] : []),
      { label: 'اللاعب (Player Game ID)', value: t?.playerGameId || '-' },
      { label: 'الموظف المنفذ', value: t?.assignedTo || t?.createdByUserName || doc.generatedBy },
      { label: 'طريقة ومحفظة الدفع', value: t?.paymentGateway || t?.paymentMethodName || 'فودافون كاش' },
      { label: 'حالة الطلب', value: t?.status === 'completed' ? 'تم الشحن والتسليم بنجاح (Completed)' : (isReservationPending ? 'قيد الحجز (Reserved)' : 'قيد المعالجة') }
    ];

    const kpis: any[] = [
      { label: isReservationPending ? 'المبلغ المطلوب إجمالاً' : 'المبلغ المطلوب', value: `${(t?.requiredAmount || finalAmount).toLocaleString()} ج.م`, color: 'orange' },
      { label: isReservationPending ? 'مقدم الحجز المسدد' : 'المبلغ المستلم (المدفوع)', value: `${(t?.receivedAmount || finalAmount).toLocaleString()} ج.م`, color: 'green' },
      { label: isReservationPending ? 'كاش باك مستحق عند التسليم' : 'كاش باك المعاملة (+)', value: `+${t?.cashbackEarned || 0} ج.م`, color: 'blue' },
      { label: isReservationPending ? 'رصيد الكاش باك الحالي' : 'رصيد الكاش باك بعد المعاملة', value: `${cashbackBalance.toLocaleString()} ج.م`, color: 'green' }
    ];

    if (primaryBalance !== 0) {
      kpis.push({
        label: 'رصيد المحفظة الأساسية',
        value: primaryBalance > 0 ? `+${primaryBalance.toLocaleString()} ج.م (دائن)` : `${primaryBalance.toLocaleString()} ج.م (عجز سداد)`,
        color: primaryBalance > 0 ? 'blue' : 'red'
      });
    }

    if (referralBalance > 0) {
      kpis.push({
        label: 'رصيد محفظة الإحالة',
        value: `${referralBalance.toLocaleString()} ج.م`,
        color: 'orange'
      });
    }

    doc.kpis = kpis;

    const rows = items.map((it: any) => ({
      name: `${it.gameName ? `${it.gameName} — ` : ''}${it.productName}`,
      qty: it.quantity || 1,
      unitPrice: `${(it.unitPrice || 0).toLocaleString()} ج`,
      total: `${(it.totalPrice || (it.unitPrice * (it.quantity || 1))).toLocaleString()} ج`
    }));

    doc.tables.push({
      title: isReservationPending ? 'بيانات المنتجات المطلوب حجزها' : 'بيانات المنتجات والباقات المشحونة',
      columns: [
        { header: isReservationPending ? 'المنتج المطلوب حجزه' : 'الباقة / الخدمة', key: 'name' },
        { header: 'الكمية', key: 'qty', align: 'center' },
        { header: 'سعر الوحدة', key: 'unitPrice', align: 'left' },
        { header: 'الإجمالي', key: 'total', align: 'left' }
      ],
      rows,
      totals: {
        name: isReservationPending ? 'إجمالي قيمة الحجز' : 'الإجمالي النهائي للفاتورة',
        qty: items.length,
        total: `${finalAmount.toLocaleString()} ج.م`
      }
    });

    const notes = [
      '🛡️ ضمان مدى الحياة على منتجاتنا 🛡️',
      isReservationPending
        ? 'تم تسجيل وتأمين الحجز بنجاح، وسيتم تسليم الطلب في الموعد المحدد بإذن الله.'
        : 'شكراً لاختياركم JKR Top Up لخدمات الشحن السريع المعتمد.',
      'جميع عمليات الشحن مشمولة بضمان استلام رسمي وفوري على حساب اللاعب.'
    ];

    if (t?.shortageAmount && t.shortageAmount > 0) {
      notes.push(`⚠️ ملاحظة تسوية: يوجد عجز سداد بقيمة -${t.shortageAmount} ج.م تم قيده في المحفظة الأساسية.`);
    } else if (t?.overpaymentAmount && t.overpaymentAmount > 0) {
      notes.push(`✨ ملاحظة تسوية: تم إضافة فائض بقيمة +${t.overpaymentAmount} ج.م كرصيد دائن في المحفظة الأساسية.`);
    }

    doc.notes = notes;

    return doc;
  }

  // -------------------------------------------------------------
  // 5. GAME CATALOG & PRICING REPORT (كتالوج الألعاب والأسعار)
  // -------------------------------------------------------------
  private static buildCatalogReport(doc: ReportDocumentData, config: ReportConfig): ReportDocumentData {
    const games = db.getGameTree();
    const rate = db.getExchangeRate();

    let allProducts: any[] = [];
    games.forEach(g => {
      g.products.forEach(p => {
        allProducts.push({
          gameName: g.name,
          gameCode: g.code,
          sectionName: p.sectionPath || p.sectionName || 'عام',
          name: p.name,
          sku: p.sku,
          costUSD: p.costUSD || 0,
          firstOrderCost: p.firstOrderCostPriceEGP,
          sellingPrice: p.calculatedPriceEGP,
          margin: `${Math.round(((p.calculatedPriceEGP - p.firstOrderCostPriceEGP) / (p.calculatedPriceEGP || 1)) * 100)}%`
        });
      });
    });

    doc.title = 'كتالوج شجرة الألعاب وباقات الشحن وقائمة الأسعار';
    doc.subtitle = `سعر الصرف المعتمد: 1$ = ${rate.rateUSD_EGP} ج.م • التكلفة الثابتة: ${rate.fixedCostPerOrderEGP} ج`;

    doc.kpis = [
      { label: 'عدد الألعاب', value: `${games.length} لعبة`, color: 'orange' },
      { label: 'إجمالي الباقات', value: `${allProducts.length} باقة`, color: 'blue' }
    ];

    if (config.showCosts) {
      doc.kpis.push({
        label: 'متوسط سعر أول شحنة',
        value: `${Math.round(allProducts.reduce((s, p) => s + p.firstOrderCost, 0) / (allProducts.length || 1))} ج`,
        color: 'red'
      });
    }

    const rows = allProducts.map(p => ({
      game: `${p.gameName} (${p.gameCode})`,
      section: p.sectionName,
      product: p.name,
      sku: p.sku,
      firstOrderCost: `${p.firstOrderCost} ج`,
      price: `${p.sellingPrice} ج`,
      margin: p.margin
    }));

    doc.tables.push({
      title: 'جدول المنتجات والأسعار المتزامنة',
      columns: [
        { header: 'اللعبة', key: 'game' },
        { header: 'القسم / التصنيف', key: 'section' },
        { header: 'اسم الباقة', key: 'product' },
        { header: 'SKU', key: 'sku', align: 'center' },
        { header: 'سعر أول شحنة (التكلفة)', key: 'firstOrderCost', align: 'left' },
        { header: 'سعر البيع النهائي', key: 'price', align: 'left' },
        { header: 'هامش الربح', key: 'margin', align: 'center' }
      ],
      rows,
      totals: {
        game: `إجمالي الباقات: ${allProducts.length}`,
        price: `${allProducts.reduce((s, p) => s + p.sellingPrice, 0).toLocaleString()} ج`
      }
    });

    return doc;
  }

  // -------------------------------------------------------------
  // 6. WALLET STATEMENT REPORT (كشف حساب محفظة المتجر)
  // -------------------------------------------------------------
  private static buildWalletStatementReport(
    doc: ReportDocumentData,
    config: ReportConfig,
    wallet?: any
  ): ReportDocumentData {
    const wallets = db.getStoreWallets();
    const w = wallet || wallets.find(wal => wal.id === config.filterWalletId) || wallets[0];

    doc.title = `كشف حساب محفظة: ${w?.name || 'محفظة المتجر'}`;
    doc.subtitle = `نوع المحفظة: ${w?.type} • العملة: ${w?.currency} • رقم الحساب: ${w?.accountNumber || '-'}`;

    doc.kpis = [
      { label: 'الرصيد الافتتاحي', value: `${(w?.balance || 0).toLocaleString()} ${w?.currency}`, color: 'blue' },
      { label: 'الرصيد المتاح الحالي', value: `${(w?.balance || 0).toLocaleString()} ${w?.currency}`, color: 'green' }
    ];

    const rows = wallets.map(wal => ({
      name: wal.name,
      type: wal.type === 'operating' ? 'تشغيل' : wal.type === 'inventory' ? 'بضاعة' : wal.type === 'usdt' ? 'خزينة دولارية' : wal.type === 'trust' ? 'أمانات' : 'أرباح',
      currency: wal.currency,
      accountNo: wal.accountNumber || '-',
      balance: `${wal.balance.toLocaleString()} ${wal.currency}`,
      withdrawal: wal.allowWithdrawal ? 'مسموح' : 'محظور'
    }));

    doc.tables.push({
      title: 'ملخص أرصدة كافة محافظ النظام',
      columns: [
        { header: 'اسم المحفظة', key: 'name' },
        { header: 'النوع', key: 'type', align: 'center' },
        { header: 'العملة', key: 'currency', align: 'center' },
        { header: 'رقم الحساب', key: 'accountNo', align: 'center' },
        { header: 'الرصيد الفعلي', key: 'balance', align: 'left' },
        { header: 'صلاحية السحب', key: 'withdrawal', align: 'center' }
      ],
      rows,
      totals: {
        name: `عدد المحافظ: ${wallets.length}`
      }
    });

    return doc;
  }

  // -------------------------------------------------------------
  // 7. DEPOSIT BONDS REPORT (سندات إيداع البضاعة FIFO)
  // -------------------------------------------------------------
  private static buildDepositBondsReport(doc: ReportDocumentData, config: ReportConfig): ReportDocumentData {
    const bonds = db.getDepositBondsFIFO();

    doc.title = 'سجل سندات إيداع البضاعة ومخزون الكروت (FIFO Bonds)';
    doc.subtitle = 'دفعات المخزون وتكلفة الوحدة بالدولار ومصاريف التحويل';

    const totalCostEGP = bonds.reduce((s, b) => s + (b.totalCostEGP || 0), 0);
    const totalUnits = bonds.reduce((s, b) => s + (b.unitsDeposited || 0), 0);
    const remainingUnits = bonds.reduce((s, b) => s + (b.remainingUnits || 0), 0);

    doc.kpis = [
      { label: 'إجمالي السندات', value: `${bonds.length} سند`, color: 'orange' },
      { label: 'الوحدات المودعة', value: `${totalUnits} وحدة`, color: 'blue' },
      { label: 'الوحدات المتبقية', value: `${remainingUnits} وحدة`, color: 'green' },
      { label: 'إجمالي تكلفة الإيداع', value: `${totalCostEGP.toLocaleString()} ج`, color: 'red' }
    ];

    const rows = bonds.map(b => ({
      bondNo: b.bondNumber,
      date: formatDateTime(b.createdAt),
      wallet: b.walletName,
      units: `${b.remainingUnits} / ${b.unitsDeposited}`,
      unitCostUSD: `$${b.costUSDT}`,
      usdRate: `${b.exchangeRateAtDeposit} ج`,
      totalEGP: `${(b.totalCostEGP || 0).toLocaleString()} ج`,
      status: b.remainingUnits <= 0 ? 'مستهلك' : 'متاح بالمخزن'
    }));

    doc.tables.push({
      title: 'سجل سندات الإيداع المخزني',
      columns: [
        { header: 'رقم السند', key: 'bondNo', align: 'center' },
        { header: 'التاريخ', key: 'date' },
        { header: 'محفظة البضاعة', key: 'wallet' },
        { header: 'الوحدات (متبقي/أصلي)', key: 'units', align: 'center' },
        { header: 'تكلفة الإيداع', key: 'unitCostUSD', align: 'center' },
        { header: 'سعر الصرف', key: 'usdRate', align: 'center' },
        { header: 'الإجمالي بالجنيه', key: 'totalEGP', align: 'left' },
        { header: 'الحالة', key: 'status', align: 'center' }
      ],
      rows,
      totals: {
        bondNo: `العدد: ${bonds.length}`,
        totalEGP: `${totalCostEGP.toLocaleString()} ج`
      }
    });

    return doc;
  }

  // -------------------------------------------------------------
  // 8. CODES & VOUCHERS REPORT (تقرير الأكواد والقسائم)
  // -------------------------------------------------------------
  private static buildCodesReport(doc: ReportDocumentData, config: ReportConfig): ReportDocumentData {
    const codes = db.getSystemCodes();

    doc.title = 'تقرير أرصدة واستهلاك الأكواد والقسائم الرقمية';
    doc.subtitle = 'متابعة الأكواد الصادرة، مرات الاستخدام، وتاريخ الاستهلاك';

    const activeCount = codes.filter(c => c.status === 'active').length;
    const usedCount = codes.filter(c => c.status === 'used').length;

    doc.kpis = [
      { label: 'إجمالي الأكواد', value: `${codes.length} كود`, color: 'orange' },
      { label: 'الأكواد المتاحة', value: `${activeCount} كود`, color: 'green' },
      { label: 'الأكواد المستهلكة', value: `${usedCount} كود`, color: 'red' }
    ];

    const rows = codes.map(c => ({
      code: c.code,
      gameProduct: `${c.gameName || ''} — ${c.productName || ''}`,
      usage: `${c.currentUsageCount || 0} / ${c.maxUsageCount || 1} (متبقي ${c.remainingUsageCount ?? (c.maxUsageCount || 1) - (c.currentUsageCount || 0)})`,
      created: formatDate(c.createdAt),
      status: c.status === 'active' ? 'نشط ومتاح' : 'مستهلك بالكامل',
      usedBy: c.assignedToCustomerPhone || c.assignedToCustomerName || '-'
    }));

    doc.tables.push({
      title: 'جدول الأكواد والقسائم',
      columns: [
        { header: 'كود القسيمة', key: 'code', align: 'center' },
        { header: 'اللعبة والمنتج', key: 'gameProduct' },
        { header: 'مرات الاستخدام والمتبقي', key: 'usage', align: 'center' },
        { header: 'تاريخ الإنشاء', key: 'created' },
        { header: 'الحالة', key: 'status', align: 'center' },
        { header: 'مستخدم بواسطة', key: 'usedBy', align: 'center' }
      ],
      rows,
      totals: {
        code: `الإجمالي: ${codes.length}`,
        status: `المتاح: ${activeCount}`
      }
    });

    return doc;
  }

  // -------------------------------------------------------------
  // 9. COUPONS REPORT (تقرير كوبونات الخصم)
  // -------------------------------------------------------------
  private static buildCouponsReport(doc: ReportDocumentData, config: ReportConfig): ReportDocumentData {
    const coupons = db.getCoupons();

    doc.title = 'تقرير كوبونات الخصم والعروض الترويجية';
    doc.subtitle = 'كشف الكوبونات النشطة والمنتهية ومرات الاستخدام';

    doc.kpis = [
      { label: 'إجمالي الكوبونات', value: `${coupons.length} كوبون`, color: 'orange' },
      { label: 'الكوبونات النشطة', value: `${coupons.filter(c => c.isActive).length} كوبون`, color: 'green' }
    ];

    const rows = coupons.map(c => ({
      code: c.code,
      type: c.discountType === 'percentage' ? 'نسبة مئوية (%)' : 'مبلغ ثابت (ج)',
      val: c.discountType === 'percentage' ? `${c.discountValue}%` : `${c.discountValue} ج`,
      usage: `${c.currentUsageCount || 0} / ${c.maxUsageTotal || 'غير محدود'}`,
      expiry: c.expiryDate ? formatDate(c.expiryDate) : 'دائم',
      status: c.isActive ? 'فعال' : 'معطل'
    }));

    doc.tables.push({
      title: 'جدول كوبونات الخصم',
      columns: [
        { header: 'الكود', key: 'code', align: 'center' },
        { header: 'نوع الخصم', key: 'type', align: 'center' },
        { header: 'قيمة الخصم', key: 'val', align: 'center' },
        { header: 'مرات الاستخدام', key: 'usage', align: 'center' },
        { header: 'تاريخ الانتهاء', key: 'expiry', align: 'center' },
        { header: 'الحالة', key: 'status', align: 'center' }
      ],
      rows
    });

    return doc;
  }

  // -------------------------------------------------------------
  // 10. SHIFT SETTLEMENT REPORT (تقرير تسوية الوردية والعمليات)
  // -------------------------------------------------------------
  private static buildShiftSettlementReport(doc: ReportDocumentData, config: ReportConfig, customPayload?: any): ReportDocumentData {
    const tickets = this.filterTicketsByDate(db.getTickets(), config);
    const expenses = this.filterExpensesByDate(db.getExpenses(), config);

    const revenue = customPayload?.revenue ?? tickets.reduce((s, t) => s + (t.receivedAmount || t.requiredAmount || 0), 0);
    const cost = customPayload?.cost ?? tickets.reduce((s, t) => s + (t.totalCostAmount || t.costPrice || 0), 0);
    const cashback = customPayload?.cashback ?? tickets.reduce((s, t) => s + (t.cashbackEarned || 0), 0);
    const referral = customPayload?.referral ?? tickets.reduce((s, t) => s + (t.referralCommissionEarned || 0), 0);
    const operatingExpenses = customPayload?.operatingExpenses ?? tickets.reduce((s, t) => s + (t.fixedCostAmount || t.pricingSnapshot?.fixedCostEGP || 0), 0);
    const profit = customPayload?.profit ?? (revenue - cost - cashback - referral - operatingExpenses);

    doc.title = 'تقرير تسوية وتصفية الوردية المالية الشامل (Shift Settlement)';
    doc.subtitle = `الفترة الزمنية: ${doc.periodLabel} • عدد التذاكر المنجزة: ${tickets.length}`;

    // 6 Standard Shift KPIs
    doc.kpis = [
      { label: '1. إجمالي الوارد (Revenue)', value: `${revenue.toLocaleString()} ج.م`, color: 'blue' },
      { label: '2. تكلفة البضاعة (FIFO Cost)', value: `-${Math.round(cost).toLocaleString()} ج.م`, color: 'red' },
      { label: '3. صافي الأرباح المحققة', value: `+${Math.round(profit).toLocaleString()} ج.م`, color: 'green' },
      { label: '4. إجمالي الكاش باك (أمانات)', value: `-${cashback.toLocaleString()} ج.م`, color: 'orange' },
      { label: '5. إجمالي عمولات الإحالة', value: `-${referral.toLocaleString()} ج.م`, color: 'purple' },
      { label: '6. مصاريف التشغيل والسيرفرات', value: `-${operatingExpenses.toLocaleString()} ج.م`, color: 'red' }
    ];

    // Table 1: Used Reception Wallets
    if (customPayload?.receptionWallets && customPayload.receptionWallets.length > 0) {
      doc.tables.push({
        title: 'كشف محافظ وأرقام الاستقبال النشطة وحركة الأرصدة بالوردية',
        columns: [
          { header: 'المحفظة', key: 'name' },
          { header: 'الرقم / الخط', key: 'phone', align: 'center' },
          { header: 'رصيد البداية', key: 'opening', align: 'left' },
          { header: 'الوارد بالوردية', key: 'received', align: 'left' },
          { header: 'الرصيد الدفتري', key: 'expected', align: 'left' },
          { header: 'الرصيد الفعلي', key: 'actual', align: 'left' },
          { header: 'الفارق (عجز/فائض)', key: 'diff', align: 'left' }
        ],
        rows: customPayload.receptionWallets.map((w: any) => ({
          name: w.name,
          phone: w.phone || '—',
          opening: `${(w.opening || 0).toLocaleString()} ج`,
          received: `+${(w.received || 0).toLocaleString()} ج`,
          expected: `${(w.expected || 0).toLocaleString()} ج`,
          actual: `${(w.actual || 0).toLocaleString()} ج`,
          diff: (w.diff < 0) ? `عجز -${Math.abs(w.diff).toLocaleString()} ج` : ((w.diff > 0) ? `+${w.diff.toLocaleString()} ج` : 'مطابق ✅')
        }))
      });
    }

    // Table 2: Used Inventory Wallets
    if (customPayload?.inventoryWallets && customPayload.inventoryWallets.length > 0) {
      doc.tables.push({
        title: 'كشف محافظ البضاعة والمخزون المستهلكة في الوردية',
        columns: [
          { header: 'محفظة البضاعة', key: 'name' },
          { header: 'نوع النقاط / السلعة', key: 'type', align: 'center' },
          { header: 'الرصيد قبل الوردية', key: 'opening', align: 'left' },
          { header: 'النقاط المستهلكة', key: 'consumedPts', align: 'left' },
          { header: 'تكلفة المستهلك (FIFO)', key: 'consumedCost', align: 'left' },
          { header: 'الرصيد الفعلي الحالي', key: 'current', align: 'left' },
          { header: 'حالة المطابقة', key: 'status', align: 'center' }
        ],
        rows: customPayload.inventoryWallets.map((inv: any) => ({
          name: inv.name,
          type: inv.type || 'نقاط',
          opening: `${(inv.opening || 0).toLocaleString()} نقطة`,
          consumedPts: `-${(inv.consumedPts || 0).toLocaleString()} نقطة`,
          consumedCost: `${(inv.consumedCost || 0).toLocaleString()} ج.م`,
          current: `${(inv.current || 0).toLocaleString()} نقطة`,
          status: inv.diff < 0 ? `عجز -${Math.abs(inv.diff)}` : 'مطابق ✅'
        }))
      });
    }

    // Table 3: Revenue Allocation Breakdown (لمنع خلط الأمانات بالبضاعة والأرباح)
    if (customPayload?.allocation && customPayload.allocation.length > 0) {
      doc.tables.push({
        title: 'تفكيك وتخصيص مبالغ الوارد حسب طبيعتها المالية (لمنع خلط الأمانات بالبضاعة والأرباح)',
        columns: [
          { header: 'البند المالي', key: 'item' },
          { header: 'المبلغ المخصص', key: 'amount', align: 'left' },
          { header: 'النسبة من الوارد', key: 'percent', align: 'center' },
          { header: 'طبيعة البند والوجهة المستهدفة', key: 'destination' }
        ],
        rows: customPayload.allocation.map((a: any) => ({
          item: a.title,
          amount: `${(a.amount || 0).toLocaleString()} ج.م`,
          percent: `${a.percent || 0}%`,
          destination: a.destination
        }))
      });
    }

    // Table 4: Shift Transfers Executed (EGP & USD)
    if (customPayload?.transfers && customPayload.transfers.length > 0) {
      doc.tables.push({
        title: 'سجل التحويلات المنفذة إلى الخزائن (جنيهات ودولارات)',
        columns: [
          { header: 'المصدر (المحفظة)', key: 'source' },
          { header: 'المبلغ المحول', key: 'amount', align: 'left' },
          { header: 'العملة', key: 'currency', align: 'center' },
          { header: 'الوجهة المستلمة', key: 'destination' },
          { header: 'سعر الصرف / ملاحظة', key: 'notes' },
          { header: 'التاريخ والوقت', key: 'time' }
        ],
        rows: customPayload.transfers.map((tr: any) => ({
          source: tr.sourceWalletName || tr.source,
          amount: tr.currency === 'USD' ? `$${tr.amount} USDT` : `${tr.amount.toLocaleString()} ج`,
          currency: tr.currency,
          destination: tr.destination,
          notes: tr.rate ? `سعر الصرف: ${tr.rate} ج/دولار` : (tr.notes || 'تحويل تصفية'),
          time: formatDateTime(tr.transferredAt || tr.time)
        }))
      });
    }

    // Table 5: Ticket Details
    const rows = tickets.map(t => ({
      ticketNo: t.ticketNumber,
      date: formatDateTime(t.createdAt),
      customer: t.customerName,
      gameProduct: `${t.gameName} — ${t.gameProductName}`,
      playerId: t.playerGameId || '-',
      amount: `${t.receivedAmount || t.requiredAmount} ج`,
      cashback: `+${t.cashbackEarned || 0} ج`,
      status: t.status === 'completed' ? 'مكتملة' : t.status
    }));

    doc.tables.push({
      title: 'جدول تفاصيل عمليات الوردية المنجزة',
      columns: [
        { header: 'رقم التذكرة', key: 'ticketNo', align: 'center' },
        { header: 'تاريخ وساعة العملية', key: 'date' },
        { header: 'العميل', key: 'customer' },
        { header: 'اللعبة والمنتج', key: 'gameProduct' },
        { header: 'الـ ID', key: 'playerId', align: 'center' },
        { header: 'المبلغ المستلم', key: 'amount', align: 'left' },
        { header: 'الكاش باك', key: 'cashback', align: 'left' },
        { header: 'الحالة', key: 'status', align: 'center' }
      ],
      rows,
      totals: {
        ticketNo: `العدد: ${tickets.length}`,
        amount: `${revenue.toLocaleString()} ج`,
        cashback: `+${cashback.toLocaleString()} ج`
      }
    });

    return doc;
  }

  // -------------------------------------------------------------
  // 11. SALES PERFORMANCE REPORT (تقرير المبيعات والشركاء)
  // -------------------------------------------------------------
  private static buildSalesPerformanceReport(doc: ReportDocumentData, config: ReportConfig): ReportDocumentData {
    const tickets = this.filterTicketsByDate(db.getTickets(), config);
    const revenue = tickets.reduce((s, t) => s + (t.receivedAmount || t.requiredAmount || 0), 0);

    doc.title = 'تقرير تحليلات المبيعات وحركة الشحن';
    doc.subtitle = `إجمالي المبيعات المنجزة للفترة: ${doc.periodLabel}`;

    doc.kpis = [
      { label: 'عدد العمليات', value: `${tickets.length} طلب`, color: 'orange' },
      { label: 'إجمالي المبيعات', value: `${revenue.toLocaleString()} ج.م`, color: 'green' }
    ];

    const rows = tickets.map(t => ({
      ticketNo: t.ticketNumber,
      date: formatDateTime(t.createdAt),
      game: t.gameName,
      product: t.gameProductName,
      customer: t.customerName,
      amount: `${t.receivedAmount || t.requiredAmount} ج`,
      status: t.status
    }));

    doc.tables.push({
      title: 'سجل المبيعات التفصيلي',
      columns: [
        { header: 'رقم التذكرة', key: 'ticketNo', align: 'center' },
        { header: 'التاريخ', key: 'date' },
        { header: 'اللعبة', key: 'game' },
        { header: 'الباقة', key: 'product' },
        { header: 'العميل', key: 'customer' },
        { header: 'المبلغ', key: 'amount', align: 'left' },
        { header: 'الحالة', key: 'status', align: 'center' }
      ],
      rows,
      totals: {
        ticketNo: `العدد: ${tickets.length}`,
        amount: `${revenue.toLocaleString()} ج`
      }
    });

    return doc;
  }

  // -------------------------------------------------------------
  // 12. EXPENSES REPORT (تقرير المصروفات التشغيلية)
  // -------------------------------------------------------------
  private static buildExpensesReport(doc: ReportDocumentData, config: ReportConfig): ReportDocumentData {
    const expenses = this.filterExpensesByDate(db.getExpenses(), config);
    const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    doc.title = 'تقرير المصروفات التشغيلية والمشتريات';
    doc.subtitle = `بيان بنود المصاريف المنصرفة للفترة: ${doc.periodLabel}`;

    doc.kpis = [
      { label: 'عدد السندات', value: `${expenses.length} سند`, color: 'orange' },
      { label: 'إجمالي المصروفات', value: `${totalAmount.toLocaleString()} ج.م`, color: 'red' }
    ];

    const rows = expenses.map(e => ({
      date: formatDate(e.date || e.createdAt),
      category: e.category || 'عام',
      description: e.description || e.notes || '-',
      amount: `${(e.amount || 0).toLocaleString()} ج`,
      user: e.createdByName || doc.generatedBy
    }));

    doc.tables.push({
      title: 'بنود المصروفات',
      columns: [
        { header: 'تاريخ الصرف', key: 'date' },
        { header: 'التصنيف / البند', key: 'category' },
        { header: 'البيان والوصف', key: 'description' },
        { header: 'المبلغ المنصرف', key: 'amount', align: 'left' },
        { header: 'الموظف المسؤول', key: 'user', align: 'center' }
      ],
      rows,
      totals: {
        date: `العدد: ${expenses.length}`,
        amount: `${totalAmount.toLocaleString()} ج`
      }
    });

    return doc;
  }

  // -------------------------------------------------------------
  // 13. MERCHANTS & SUPPLIERS REPORT (تقرير التجار والموردين)
  // -------------------------------------------------------------
  private static buildMerchantsReport(
    doc: ReportDocumentData,
    config: ReportConfig,
    merchant?: any
  ): ReportDocumentData {
    const merchants = (db as any).getMerchants?.() || [];
    const m = merchant || merchants.find((mer: any) => mer.id === config.filterMerchantId) || merchants[0];

    doc.title = m ? `كشف حساب تاجر / مورد: ${m.name}` : 'تقرير أرصدة ومديونيات التجار والموردين';
    doc.subtitle = 'كشف حساب المشتريات، الديون، وأرصدة التعاملات مع الموردين';

    const rows = merchants.map((mer: any) => ({
      name: mer.name,
      phone: mer.phone || '-',
      balance: `${(mer.balance || 0).toLocaleString()} ج`,
      debts: `${(mer.debts || 0).toLocaleString()} ج`,
      orders: mer.totalOrdersCount || 0,
      trust: mer.trustScore ? `${mer.trustScore}/10` : 'ممتاز',
      lastTrade: mer.lastTradeDate ? formatDate(mer.lastTradeDate) : '-'
    }));

    doc.tables.push({
      title: 'جدول الموردين والتجار',
      columns: [
        { header: 'اسم التاجر / المورد', key: 'name' },
        { header: 'الهاتف', key: 'phone', align: 'center' },
        { header: 'الرصيد الحالي', key: 'balance', align: 'left' },
        { header: 'المديونية', key: 'debts', align: 'left' },
        { header: 'الطلبات', key: 'orders', align: 'center' },
        { header: 'درجة الثقة', key: 'trust', align: 'center' },
        { header: 'آخر تعامل', key: 'lastTrade', align: 'center' }
      ],
      rows
    });

    return doc;
  }

  // -------------------------------------------------------------
  // HELPER DATE FILTERS
  // -------------------------------------------------------------
  private static filterTicketsByDate(tickets: any[], config: ReportConfig): any[] {
    return tickets.filter(t => {
      const d = (t.createdAt || '').split('T')[0];
      if (config.startDate && d < config.startDate) return false;
      if (config.endDate && d > config.endDate) return false;
      if (config.filterCustomerId && t.customerId !== config.filterCustomerId) return false;
      if (config.filterGameId && t.gameId !== config.filterGameId) return false;
      if (config.filterStatus && t.status !== config.filterStatus) return false;
      return true;
    });
  }

  private static filterExpensesByDate(expenses: any[], config: ReportConfig): any[] {
    return expenses.filter(e => {
      const d = (e.date || e.createdAt || '').split('T')[0];
      if (config.startDate && d < config.startDate) return false;
      if (config.endDate && d > config.endDate) return false;
      return true;
    });
  }

  // =============================================================
  // EXPORT TO EXCEL
  // =============================================================
  public static exportReportToExcel(doc: ReportDocumentData, config: ReportConfig): void {
    const wb = XLSX.utils.book_new();

    doc.tables.forEach((table, idx) => {
      const headers = table.columns.map(c => c.header);
      const dataRows = table.rows.map(r => table.columns.map(c => r[c.key] ?? ''));

      // If totals exist, append total row
      if (table.totals) {
        const totalRow = table.columns.map(c => table.totals?.[c.key] ?? '');
        dataRows.push(totalRow);
      }

      const wsData = [
        [`NZM JKR TOP UP ERP — ${doc.title}`],
        [`الفترة: ${doc.periodLabel} | تاريخ الإصدار: ${doc.issueDate} | المستخدم: ${doc.generatedBy}`],
        [],
        headers,
        ...dataRows
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, `جدول_${idx + 1}`);
    });

    const safeFilename = `${doc.title.replace(/[\s\/\\:*?"<>|]/g, '_')}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, safeFilename);
  }

  // =============================================================
  // EXPORT TO CSV
  // =============================================================
  public static exportReportToCSV(doc: ReportDocumentData): void {
    if (doc.tables.length === 0) return;
    const table = doc.tables[0];
    const headers = table.columns.map(c => c.header).join(',');
    const dataRows = table.rows.map(r =>
      table.columns.map(c => `"${(r[c.key] ?? '').toString().replace(/"/g, '""')}"`).join(',')
    );

    let csvContent = `\uFEFF${headers}\n${dataRows.join('\n')}`;
    if (table.totals) {
      const totalRow = table.columns.map(c => `"${(table.totals?.[c.key] ?? '').toString().replace(/"/g, '""')}"`).join(',');
      csvContent += `\n${totalRow}`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${doc.title.replace(/[\s\/\\:*?"<>|]/g, '_')}.csv`;
    link.click();
  }

  // -------------------------------------------------------------
  // SUBSCRIPTIONS MODULE REPORT
  // -------------------------------------------------------------
  private static buildSubscriptionsReport(doc: ReportDocumentData, config: ReportConfig, customPayload?: any): ReportDocumentData {
    const subscriptions = Array.isArray(customPayload) ? customPayload : db.getSubscriptions();
    const payments = db.getSubscriptionPayments();
    const plans = db.getSubscriptionPlans();

    const totalRevenue = subscriptions.reduce((s: number, sub: any) => s + (sub.finalPrice || 0), 0);
    const totalCost = subscriptions.reduce((s: number, sub: any) => s + (sub.costPrice || 0), 0);
    const totalProfit = subscriptions.reduce((s: number, sub: any) => s + (sub.netProfit || 0), 0);
    const activeCount = subscriptions.filter((s: any) => s.status === 'active' || s.status === 'expiring_soon').length;
    const renewalCount = subscriptions.filter((s: any) => s.renewalCount > 0).length;

    doc.title = 'تقرير سجل وإيرادات قسم الاشتراكات (Subscriptions Performance Report)';
    doc.subtitle = 'كشف تفصيلي بالباقات، المشتركين، تواريخ السريان، وصافي الأرباح';

    doc.kpis = [
      { label: 'إجمالي المشتركين', value: `${subscriptions.length} مشترك`, color: 'blue' },
      { label: 'الاشتراكات السارية', value: `${activeCount} نشط`, color: 'green' },
      { label: 'إجمالي الإيرادات', value: `${totalRevenue.toLocaleString()} ج.م`, color: 'orange' },
      { label: 'صافي الأرباح المحققة', value: `+${totalProfit.toLocaleString()} ج.م`, color: 'green' },
      { label: 'مرات التجديد', value: `${renewalCount} عملية`, color: 'gray' }
    ];

    const columns: ReportTableColumn[] = [
      { header: 'رقم الاشتراك', key: 'subscriptionNumber', align: 'center', width: '15%' },
      { header: 'العميل المشترك', key: 'customerName', align: 'right', width: '20%' },
      { header: 'الباقة والتصنيف', key: 'planName', align: 'right', width: '20%' },
      { header: 'فترة السريان', key: 'period', align: 'center', width: '20%' },
      { header: 'المبلغ المسدد', key: 'finalPrice', align: 'center', width: '12%' },
      { header: 'صافي الربح', key: 'netProfit', align: 'center', width: '13%' }
    ];

    const rows = subscriptions.map((s: any) => ({
      subscriptionNumber: `#${s.subscriptionNumber}`,
      customerName: `${s.customerName} (${s.customerPhone || '—'})`,
      planName: `${s.planName} [${s.planCategory || 'خدمات'}]`,
      period: `من ${s.startDate?.split('T')[0]} إلى ${s.endDate?.split('T')[0]}`,
      finalPrice: `${(s.finalPrice || 0).toLocaleString()} ج.م`,
      netProfit: `+${(s.netProfit || 0).toLocaleString()} ج.م`
    }));

    doc.tables = [
      {
        title: 'كشف تفصيلي بالاشتراكات المسجلة',
        columns,
        rows,
        totals: {
          subscriptionNumber: 'الإجمالي العام',
          customerName: `${subscriptions.length} عملية اشتراك`,
          finalPrice: `${totalRevenue.toLocaleString()} ج.م`,
          netProfit: `+${totalProfit.toLocaleString()} ج.م`
        }
      }
    ];

    return doc;
  }

  // -------------------------------------------------------------
  // 15. EMPLOYEE FINANCIAL STATEMENT & PAYROLL INVOICE REPORT
  // -------------------------------------------------------------
  private static buildPayrollReport(
    doc: ReportDocumentData,
    config: ReportConfig,
    customPayload?: any
  ): ReportDocumentData {
    const allEmployees: Employee[] = db.getEmployees ? db.getEmployees() : [];
    const emp: Employee | undefined =
      customPayload?.employee ||
      (config.filterEmployeeId ? allEmployees.find(e => e.id === config.filterEmployeeId) : undefined) ||
      allEmployees[0];

    const currentMonth = customPayload?.month || new Date().toISOString().substring(0, 7);

    // ============================================================
    // CASE A: SINGLE EMPLOYEE OFFICIAL FINANCIAL INVOICE / STATEMENT
    // ============================================================
    if (emp && (customPayload?.employee || config.filterEmployeeId || customPayload?.isSingleEmployee)) {
      const allSalarySlips: SalarySlip[] =
        customPayload?.allSalarySlips ||
        (db.getSalaries ? db.getSalaries().filter((s: SalarySlip) => s.employeeId === emp.id) : []);
      const currentSlip: SalarySlip | undefined =
        customPayload?.currentSlip || allSalarySlips.find(s => s.month === currentMonth);

      const advances = emp.advances || [];
      const disbursedAdvances = advances.filter(a => a.status === 'disbursed');
      const advancesRemainingTotal = disbursedAdvances.reduce(
        (sum, a) => sum + (a.amount - (a.repaidAmount || 0)),
        0
      );

      const bonusesTotal =
        currentSlip?.bonuses ??
        (emp.incentives || [])
          .filter(i => (i.date || '').startsWith(currentMonth))
          .reduce((sum, i) => sum + i.amount, 0);

      const deductionsTotal = currentSlip?.deductions ?? 0;
      const advancesDeduction =
        currentSlip?.advances ??
        (advancesRemainingTotal > 0 ? Math.min(advancesRemainingTotal, 500) : 0);

      const baseSalary = emp.baseSalary || 0;
      const netSalary =
        currentSlip?.totalSalary ??
        Math.max(0, baseSalary + bonusesTotal - deductionsTotal - advancesDeduction);

      const cleanCode = (emp.employeeCode || emp.id).replace(/[^a-zA-Z0-9]/g, '');
      doc.id = `INV-EMP-${cleanCode}-${currentMonth.replace('-', '')}`;
      doc.title = `فاتورة ومسير الاستحقاق المالي للموظف — ${emp.fullName}`;
      doc.subtitle = `NZM JKR TOP UP ERP — كشف الحساب والمفردات المالية والمسيرات الرسمية`;

      doc.metaDetails = [
        { label: 'رقم الفاتورة والمسير', value: doc.id },
        { label: 'اسم الموظف', value: emp.fullName },
        { label: 'كود الموظف', value: emp.employeeCode || emp.id },
        { label: 'المسمى الوظيفي', value: emp.jobTitle || emp.job || 'موظف' },
        { label: 'القسم التابع له', value: emp.department || 'قسم الزبائن' },
        { label: 'رقم الهاتف', value: emp.phone },
        { label: 'الرقم القومي', value: emp.nationalId || 'مسجل بالملف' },
        { label: 'تاريخ التعيين', value: formatDate(emp.hireDate) },
        { label: 'يوم استحقاق الصرف', value: `يوم ${emp.salaryPayoutDay || 1} من كل شهر` },
        { label: 'حالة العمل', value: emp.status === 'active' ? '🟢 نشط على رأس العمل' : '🟡 في إجازة' },
        { label: 'شهر الاستحقاق', value: currentMonth },
        {
          label: 'حالة الصرف',
          value: currentSlip?.isPaid ? '✓ تم الصرف من الخزنة الرئيسية' : '⏳ بانتظار الاعتماد والصرف'
        }
      ];

      doc.kpis = [
        { label: 'الراتب الأساسي التعاقدي', value: `${baseSalary.toLocaleString()} ج.م`, color: 'blue' },
        { label: 'إجمالي المكافآت والحوافز', value: `+${bonusesTotal.toLocaleString()} ج.م`, color: 'green' },
        { label: 'إجمالي الخصومات والجزاءات', value: `-${deductionsTotal.toLocaleString()} ج.م`, color: 'red' },
        { label: 'قسط السلفة المستقطع', value: `-${advancesDeduction.toLocaleString()} ج.م`, color: 'orange' },
        { label: 'صافي الراتب المستحق للصرف', value: `${netSalary.toLocaleString()} ج.م`, color: 'green' },
        { label: 'رصيد السلف المتبقي بذمته', value: `${advancesRemainingTotal.toLocaleString()} ج.م`, color: 'gray' }
      ];

      // Table 1: Itemized Salary Invoice Breakdown
      const breakdownRows = [
        {
          item: 'الراتب الأساسي الشهري (Base Contractual Salary)',
          type: 'استحقاق دائن (+)',
          notes: 'الراتب الأساسي المتفق عليه بعقد العمل المعتمد',
          amount: `+${baseSalary.toLocaleString()} ج.م`
        }
      ];

      if (bonusesTotal > 0) {
        breakdownRows.push({
          item: 'إجمالي البدلات والمكافآت والحوافز (Bonuses & Incentives)',
          type: 'استحقاق دائن (+)',
          notes: 'مكافآت أداء وتقييم تميز وحوافز مبيعات معتمدة',
          amount: `+${bonusesTotal.toLocaleString()} ج.م`
        });
      }

      if (deductionsTotal > 0) {
        breakdownRows.push({
          item: 'الخصومات والجزاءات الإدارية (Penalties & Deductions)',
          type: 'استقطاع مدين (-)',
          notes: 'خصومات واستقطاعات إدارية معتمدة على سجل الموظف',
          amount: `-${deductionsTotal.toLocaleString()} ج.م`
        });
      }

      if (advancesDeduction > 0) {
        breakdownRows.push({
          item: 'قسط سداد السلفة المالية (Advance Repayment)',
          type: 'استقطاع مدين (-)',
          notes: `خصم قسط السلفة المستحق لشهر ${currentMonth} لتسوية رصيد السلف`,
          amount: `-${advancesDeduction.toLocaleString()} ج.م`
        });
      }

      doc.tables.push({
        title: '📑 مفردات فاتورة ومسير الراتب للشهر الجاري (Itemized Payroll Invoice)',
        columns: [
          { header: 'البند المالي', key: 'item' },
          { header: 'نوع الحركة', key: 'type', align: 'center' },
          { header: 'البيان والتفاصيل', key: 'notes' },
          { header: 'المبلغ (ج.م)', key: 'amount', align: 'left' }
        ],
        rows: breakdownRows,
        totals: {
          item: 'صافي الراتب المستحق للصرف النهائي',
          type: 'الصافي النهائي',
          notes: `المبلغ واجب الصرف للموظف عن شهر ${currentMonth}`,
          amount: `${netSalary.toLocaleString()} ج.م`
        }
      });

      // Table 2: Advances & Loans (سجل السلف)
      if (advances.length > 0) {
        doc.tables.push({
          title: '💳 كشف السلف المالية والقروض الشخصية الممنوحة للموظف',
          columns: [
            { header: 'تاريخ السلفة', key: 'date' },
            { header: 'المبلغ المقترض', key: 'amount', align: 'left' },
            { header: 'المسدد حتى الآن', key: 'repaid', align: 'left' },
            { header: 'المتبقي بذمة الموظف', key: 'remaining', align: 'left' },
            { header: 'السبب والبيان', key: 'reason' },
            { header: 'حالة السلفة', key: 'status', align: 'center' }
          ],
          rows: advances.map(a => ({
            date: formatDate(a.requestDate || a.disbursedDate || ''),
            amount: `${a.amount.toLocaleString()} ج.م`,
            repaid: `${(a.repaidAmount || 0).toLocaleString()} ج.م`,
            remaining: `${(a.amount - (a.repaidAmount || 0)).toLocaleString()} ج.م`,
            reason: a.reason || 'سلفة شخصية معتمدة',
            status:
              a.status === 'repaid'
                ? 'تم السداد بالكامل ✓'
                : a.status === 'disbursed'
                ? 'سارية وقيد السداد ⏳'
                : 'بانتظار الصرف'
          })),
          totals: {
            date: 'إجمالي السلف المعلقة',
            amount: `${advances.reduce((s, a) => s + a.amount, 0).toLocaleString()} ج.م`,
            repaid: `${advances.reduce((s, a) => s + (a.repaidAmount || 0), 0).toLocaleString()} ج.م`,
            remaining: `${advancesRemainingTotal.toLocaleString()} ج.م`,
            reason: 'الرصيد القائم بذمة الموظف',
            status: '-'
          }
        });
      }

      // Table 3: Slips History (سجل المسيرات السابقة)
      if (allSalarySlips.length > 0) {
        doc.tables.push({
          title: '🗓️ سجل مسيرات الرواتب السابقة المصروفة للموظف',
          columns: [
            { header: 'الشهر المستحق', key: 'month' },
            { header: 'الأساسي', key: 'base', align: 'left' },
            { header: 'المكافآت', key: 'bonuses', align: 'left' },
            { header: 'الخصومات والسلف', key: 'deductions', align: 'left' },
            { header: 'صافي الراتب', key: 'net', align: 'left' },
            { header: 'الحالة', key: 'status', align: 'center' },
            { header: 'تاريخ وطريقة الصرف', key: 'paidInfo' }
          ],
          rows: allSalarySlips.slice(0, 12).map(s => ({
            month: s.month,
            base: `${(s.baseSalary || 0).toLocaleString()} ج`,
            bonuses: `+${(s.bonuses || 0).toLocaleString()} ج`,
            deductions: `-${((s.deductions || 0) + (s.advances || 0)).toLocaleString()} ج`,
            net: `${(s.totalSalary || 0).toLocaleString()} ج.م`,
            status: s.isPaid ? 'تم الصرف ✓' : 'قيد الانتظار',
            paidInfo: s.isPaid ? `${formatDate(s.paidAt || '')} (${s.paymentMethod || 'خزنة'})` : 'لم يصرف بعد'
          }))
        });
      }

      // Notes and Disclaimers
      doc.notes = [
        'يعتبر هذا المستند مسيراً مالياً وفاتورة استحقاق رسمية صادرة ومعتمدة من الإدارة المالية لمنظومة NZM JKR ERP.',
        'توقيع الموظف أدناه أو استلامه للراتب من الخزنة الرئيسية يعتبر إقراراً تاماً بمطابقة الحساب وصحة كافة المفردات والمبالغ الواردة أعلاه.',
        'جميع القيود والعمليات المحاسبية مطابقة لدفتر الأستاذ وحركات الخزينة وسندات الصرف المسجلة برقم العملية.'
      ];

      doc.signatories = [
        { title: 'الموظف المستلم (الإقرار والاستلام)', name: emp.fullName },
        { title: 'أمين الخزينة والمراجع المالي', name: 'إدارة الشؤون المالية' },
        { title: 'اعتماد الإدارة العامة (Owner)', name: 'الختم والتوقيع الرسمي' }
      ];

      return doc;
    }

    // ============================================================
    // CASE B: ALL EMPLOYEES ROSTER & PAYROLL SHEET
    // ============================================================
    const employees = allEmployees;
    const totalBaseSalary = employees.reduce((s, e) => s + (e.baseSalary || 0), 0);
    const activeCount = employees.filter(e => e.status === 'active').length;

    doc.title = 'كشف ومسير رواتب كوادر الموظفين العام';
    doc.subtitle = `NZM JKR TOP UP ERP — حصر كادر الموظفين والمسيرات المالية والرواتب المستحقة`;

    doc.metaDetails = [
      { label: 'إجمالي الموظفين', value: `${employees.length} موظفاً` },
      { label: 'الموظفون النشطون', value: `${activeCount} موظفاً` },
      { label: 'شهر المسير', value: currentMonth },
      { label: 'الجهة المصدرة', value: 'قسم المالية والموارد البشرية' }
    ];

    doc.kpis = [
      { label: 'إجمالي عدد الكوادر', value: `${employees.length} موظف`, color: 'blue' },
      { label: 'إجمالي الرواتب الأساسية', value: `${totalBaseSalary.toLocaleString()} ج.م`, color: 'green' },
      {
        label: 'متوسط راتب الموظف',
        value: `${Math.round(totalBaseSalary / (employees.length || 1)).toLocaleString()} ج.م`,
        color: 'orange'
      }
    ];

    doc.tables.push({
      title: '👥 كشف مسير رواتب وبيانات الموظفين التابعين للمؤسسة',
      columns: [
        { header: 'كود الموظف', key: 'code', align: 'center' },
        { header: 'اسم الموظف', key: 'name' },
        { header: 'القسم', key: 'dept' },
        { header: 'المسمى الوظيفي', key: 'title' },
        { header: 'الهاتف', key: 'phone', align: 'center' },
        { header: 'الراتب الأساسي', key: 'base', align: 'left' },
        { header: 'يوم الصرف', key: 'day', align: 'center' },
        { header: 'الحالة', key: 'status', align: 'center' }
      ],
      rows: employees.map(e => ({
        code: e.employeeCode || e.id,
        name: e.fullName,
        dept: e.department || '-',
        title: e.jobTitle || e.job || '-',
        phone: e.phone || '-',
        base: `${(e.baseSalary || 0).toLocaleString()} ج.م`,
        day: `يوم ${e.salaryPayoutDay || 1}`,
        status: e.status === 'active' ? 'نشط' : e.status === 'on_leave' ? 'إجازة' : 'غير نشط'
      })),
      totals: {
        code: 'الإجمالي',
        name: `${employees.length} موظف`,
        dept: '-',
        title: '-',
        phone: '-',
        base: `${totalBaseSalary.toLocaleString()} ج.م`,
        day: '-',
        status: '-'
      }
    });

    doc.signatories = [
      { title: 'مسؤول الموارد البشرية', name: doc.generatedBy },
      { title: 'المراجع المالي والحسابات', name: 'إدارة المالية' },
      { title: 'اعتماد مدير النظام (Owner)', name: 'الختم والتوقيع الرسمي' }
    ];

    return doc;
  }

  // =============================================================
  // GENERATE STANDALONE PRINTABLE HTML (A4 / A5 Clean Document)
  // =============================================================
  public static generateReportHTML(doc: ReportDocumentData, config: ReportConfig): string {
    const size = config.paperSize || 'A4';
    const isPortrait = config.orientation !== 'landscape';

    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${doc.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

    @page {
      size: ${size} ${isPortrait ? 'portrait' : 'landscape'};
      margin: 12mm 15mm 15mm 15mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #000000;
      font-weight: 600;
      margin: 0;
      padding: 0;
      font-size: 10.5pt;
      line-height: 1.5;
    }

    .report-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    /* Official JKR Header */
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #000000;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-box {
      width: 48px;
      height: 48px;
      object-fit: contain;
      background: #000000;
      border-radius: 8px;
      display: block;
    }

    .brand-title {
      font-size: 14pt;
      font-weight: 900;
      color: #000000;
      margin: 0;
    }

    .brand-sub {
      font-size: 9.5pt;
      color: #111827;
      font-weight: 700;
      margin: 0;
    }

    .header-meta {
      text-align: left;
      font-size: 9pt;
      color: #000000;
      font-weight: 700;
      font-family: monospace;
    }

    .report-title-bar {
      background: #f4f4f5;
      border-right: 5px solid #ea580c;
      padding: 10px 14px;
      margin-bottom: 16px;
      border-radius: 4px;
      border: 1px solid #d4d4d8;
      border-right: 5px solid #ea580c;
    }

    .report-title {
      font-size: 14pt;
      font-weight: 900;
      color: #000000;
      margin: 0;
    }

    .report-subtitle {
      font-size: 9.5pt;
      color: #000000;
      font-weight: 700;
      margin-top: 3px;
    }

    /* Meta Details Grid */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      background: #f9fafb;
      border: 1.5px solid #000000;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 9.5pt;
      color: #000000;
      font-weight: 600;
    }

    .meta-item strong {
      color: #000000;
      font-weight: 900;
      margin-left: 4px;
    }

    /* KPI Summary Cards */
    .kpi-container {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }

    .kpi-card {
      flex: 1;
      background: #f9fafb;
      border: 1.5px solid #000000;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }

    .kpi-card.orange { border-top: 4px solid #ea580c; }
    .kpi-card.green { border-top: 4px solid #059669; }
    .kpi-card.red { border-top: 4px solid #dc2626; }
    .kpi-card.blue { border-top: 4px solid #2563eb; }
    .kpi-card.purple { border-top: 4px solid #9333ea; }

    .kpi-label {
      font-size: 9pt;
      color: #000000;
      font-weight: 800;
      margin-bottom: 4px;
      display: block;
    }

    .kpi-val {
      font-size: 13.5pt;
      font-weight: 900;
      color: #000000;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 9.5pt;
      color: #000000;
    }

    th {
      background: #000000;
      color: #ffffff;
      padding: 8px 10px;
      font-weight: 900;
      text-align: right;
      border: 1.5px solid #000000;
    }

    td {
      padding: 7px 10px;
      border: 1.5px solid #9ca3af;
      color: #000000;
      font-weight: 700;
    }

    tr:nth-child(even) {
      background-color: #f3f4f6;
    }

    tr.totals-row td {
      background: #e5e7eb;
      font-weight: 900;
      color: #000000;
      border-top: 2.5px solid #000000;
      border-bottom: 2.5px solid #000000;
    }

    /* Notes Box */
    .notes-box {
      border: 1.5px dashed #ea580c;
      background: #fff7ed;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 9pt;
      margin-bottom: 16px;
      color: #000000;
      font-weight: 700;
    }

    /* Signatures Block */
    .signatures-section {
      display: flex;
      justify-content: space-between;
      margin-top: 28px;
      padding-top: 14px;
      border-top: 2px solid #000000;
      page-break-inside: avoid;
    }

    .sign-box {
      text-align: center;
      width: 28%;
    }

    .sign-title {
      font-weight: 900;
      font-size: 9.5pt;
      color: #000000;
      margin-bottom: 35px;
    }

    .sign-line {
      border-bottom: 2px dotted #000000;
      margin-bottom: 4px;
    }

    .sign-name {
      font-size: 8.5pt;
      font-weight: 700;
      color: #000000;
    }

    /* Footer */
    .report-footer {
      margin-top: 20px;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #6b7280;
    }

    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="report-header">
      <div class="header-brand">
        ${config.showLogo ? `<img src="${JKR_OFFICIAL_LOGO_DATA_URL}" class="logo-box" alt="JKR TOP UP" />` : ''}
        <div>
          <h1 class="brand-title">NZM JKR TOP UP ERP</h1>
          <p class="brand-sub">منظومة الإدارة والمحاسبة والتقارير الاحترافية</p>
        </div>
      </div>

      <div class="header-meta">
        <div><strong>رقم التقرير:</strong> ${doc.id}</div>
        <div><strong>تاريخ الإصدار:</strong> ${doc.issueDate}</div>
        <div><strong>الفترة:</strong> ${doc.periodLabel}</div>
        ${config.showUserData ? `<div><strong>المستخدم:</strong> ${doc.generatedBy}</div>` : ''}
      </div>
    </div>

    <!-- Title Bar -->
    <div class="report-title-bar">
      <h2 class="report-title">${doc.title}</h2>
      ${doc.subtitle ? `<div class="report-subtitle">${doc.subtitle}</div>` : ''}
    </div>

    <!-- Meta Details -->
    ${
      doc.metaDetails && doc.metaDetails.length > 0
        ? `
      <div class="meta-grid">
        ${doc.metaDetails.map(m => `<div class="meta-item"><strong>${m.label}:</strong> ${m.value}</div>`).join('')}
      </div>
    `
        : ''
    }

    <!-- KPIs -->
    ${
      doc.kpis && doc.kpis.length > 0
        ? `
      <div class="kpi-container">
        ${doc.kpis
          .map(
            k => `
          <div class="kpi-card ${k.color || 'orange'}">
            <span class="kpi-label">${k.label}</span>
            <span class="kpi-val">${k.value}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `
        : ''
    }

    <!-- Tables -->
    ${doc.tables
      .map(
        table => `
      ${table.title ? `<div style="font-weight: bold; margin-bottom: 6px; font-size: 10pt; color: #1f2937;">📌 ${table.title}</div>` : ''}
      <table>
        <thead>
          <tr>
            ${table.columns.map(c => `<th style="text-align: ${c.align || 'right'}">${c.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${table.rows
            .map(
              r => `
            <tr>
              ${table.columns
                .map(c => `<td style="text-align: ${c.align || 'right'}">${r[c.key] ?? '-'}</td>`)
                .join('')}
            </tr>
          `
            )
            .join('')}
          ${
            table.totals
              ? `
            <tr class="totals-row">
              ${table.columns
                .map(c => `<td style="text-align: ${c.align || 'right'}">${table.totals?.[c.key] ?? ''}</td>`)
                .join('')}
            </tr>
          `
              : ''
          }
        </tbody>
      </table>
    `
      )
      .join('')}

    <!-- Notes -->
    ${
      doc.notes && doc.notes.length > 0
        ? `
      <div class="notes-box">
        <strong>ملاحظات هامة:</strong>
        <ul style="margin: 4px 0 0 0; padding-right: 18px;">
          ${doc.notes.map(n => `<li>${n}</li>`).join('')}
        </ul>
      </div>
    `
        : ''
    }

    <!-- Signatures -->
    ${
      doc.signatories && doc.signatories.length > 0
        ? `
      <div class="signatures-section">
        ${doc.signatories
          .map(
            s => `
          <div class="sign-box">
            <div class="sign-title">${s.title}</div>
            <div class="sign-line"></div>
            <div class="sign-name">${s.name}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `
        : ''
    }

    <!-- Footer -->
    <div class="report-footer">
      <div>تم إنشاء المستند رسمياً بواسطة نظام NZM JKR TOP UP ERP — جميع الحقوق محفوظة</div>
      <div>${config.showPageNumbers ? 'صفحة 1 من 1' : ''}</div>
    </div>
  </div>
</body>
</html>
    `;
  }

  // =============================================================
  // PRINT ISOLATED DOCUMENT
  // =============================================================
  public static printReportDocument(doc: ReportDocumentData, config: ReportConfig): void {
    const html = this.generateReportHTML(doc, config);
    try {
      const printWindow = window.open('', '_blank', 'width=1000,height=850');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 400);
        return;
      }
    } catch (e) {
      console.warn('Popup blocked, falling back to hidden iframe:', e);
    }

    // Hidden iframe fallback if popup blocked
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const docFrame = iframe.contentWindow?.document;
    if (docFrame) {
      docFrame.open();
      docFrame.write(html);
      docFrame.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }, 500);
    }
  }
}
