// =============================================================
// NZM JKR TOP UP ERP — Universal High-Resolution Invoice Image Generator
// Native 2D Canvas Engine — Zero CSS / Tailwind conflicts, 100% reliable
// Supports: Customers/Tickets, Subscriptions, Dealers, & Middleman Deals
// =============================================================

import { formatCurrency, formatDateTime } from './formatters';
import { CustomerTicket } from '../types/customer.types';
import { CustomerModuleSettings } from '../types/topup.types';
import { CustomerSubscription, SubscriptionPayment } from '../types/subscription.types';
import { Dealer } from '../types/dealer.types';
import { UnifiedWalletTransaction } from '../types/customer.types';
import { db } from '../database/db';
import { isSamePhoneNumber } from './phoneUtils';
import { getTicketCustomerBalanceSnapshot } from './ticketBalanceSnapshot';
import { JKR_OFFICIAL_LOGO_DATA_URL } from '../assets/logoBase64';

// =============================================================
// OFFICIAL LOGO PRELOADER & CANVAS DRAWER
// =============================================================
let logoImg: HTMLImageElement | null = null;
let logoLoadingPromise: Promise<HTMLImageElement> | null = null;

export const ensureOfficialLogoLoaded = (): Promise<HTMLImageElement> => {
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    return Promise.resolve(logoImg);
  }
  if (!logoLoadingPromise) {
    logoLoadingPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        logoImg = img;
        resolve(img);
      };
      img.onerror = (e) => reject(e);
      img.src = JKR_OFFICIAL_LOGO_DATA_URL;
    });
  }
  return logoLoadingPromise;
};

// Start preloading logo immediately
if (typeof window !== 'undefined') {
  ensureOfficialLogoLoaded().catch(() => {});
}

const drawOfficialBrandLogo = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number = 82,
  h: number = 82,
  r: number = 12
) => {
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();

  // Draw black backdrop behind logo
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, w, h);

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.drawImage(logoImg, x, y, w, h);
  }
  ctx.restore();
};

// =============================================================
// 1. MIDDLEMAN INVOICE DATA & ENGINE
// =============================================================
export interface MiddlemanInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  title: string;
  gameName: string;
  sellerName: string;
  sellerPhone: string;
  buyerName: string;
  buyerPhone: string;
  dealAmount: number;
  dealCurrency: string;
  dealAmountEGP: number;
  commissionAmountEGP: number;
  netPaidByBuyerEGP: number;
  hasExternalMiddleman?: boolean;
  externalMiddlemanName?: string;
  externalMiddlemanCommissionEGP?: number;
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  isDeal?: boolean;
}

export const generateInvoiceCanvas = (data: MiddlemanInvoiceData): HTMLCanvasElement => {
  const width = 800;
  const height = 980;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer Border
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Top Accent Banner
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#EA580C');
  gradient.addColorStop(1, '#F59E0B');
  ctx.fillStyle = gradient;
  ctx.fillRect(16, 16, width - 32, 10);

  // Header Background
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(18, 26, width - 36, 110);
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(18, 136);
  ctx.lineTo(width - 18, 136);
  ctx.stroke();

  // Official Brand Logo
  drawOfficialBrandLogo(ctx, width - 122, 40, 82, 82, 12);

  // Business Info (RTL)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(data.businessName || 'NZM JKR TOP UP', width - 135, 68);

  ctx.fillStyle = '#64748B';
  ctx.font = '12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(data.businessAddress || 'المنصورة — جمهورية مصر العربية', width - 135, 92);
  ctx.fillText(`هاتف الدعم: ${data.businessPhone || '01012345678'}`, width - 135, 112);

  // Invoice Number & Date Box (Left Side)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#D97706';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`#${data.invoiceNumber}`, 40, 68);

  ctx.fillStyle = '#64748B';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(`التاريخ: ${formatDateTime(data.invoiceDate)}`, 40, 92);
  ctx.fillText('نوع الوثيقة: إيصال ضمان معتمد', 40, 112);

  // Guarantee Ribbon / Badge
  ctx.fillStyle = '#FEF3C7';
  ctx.beginPath();
  ctx.roundRect(40, 155, width - 80, 42, 10);
  ctx.fill();
  ctx.strokeStyle = '#FDE68A';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#92400E';
  ctx.font = 'bold 15px "Segoe UI", Tahoma, Arial, sans-serif';
  const badgeTitle = data.isDeal !== false
    ? '🛡️ إيصال وساطة وضمان مالي معتمد 100%'
    : '🎉 فاتورة بيع ونقل ملكية حساب رسمي';
  ctx.fillText(badgeTitle, width / 2, 182);

  // Parties Box (Seller & Buyer)
  // Seller Box
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(width / 2 + 10, 215, width / 2 - 50, 100, 12);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('طرف أول (البائع):', width - 60, 242);

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 16px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(data.sellerName, width - 60, 270);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`الهاتف: ${data.sellerPhone}`, width - 60, 296);

  // Buyer Box
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(40, 215, width / 2 - 50, 100, 12);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('طرف ثاني (المشتري):', width / 2 - 20, 242);

  ctx.fillStyle = '#2563EB';
  ctx.font = 'bold 16px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(data.buyerName, width / 2 - 20, 270);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`الهاتف: ${data.buyerPhone}`, width / 2 - 20, 296);

  // Transaction Breakdown Details
  ctx.fillStyle = '#FAFAFA';
  ctx.beginPath();
  ctx.roundRect(40, 335, width - 80, 210, 14);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  // Detail Row 1: Title & Game
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('بيان المعاملة / الغرض:', width - 60, 370);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(`${data.gameName} — ${data.title}`, width - 210, 370);

  // Divider
  ctx.strokeStyle = '#E5E7EB';
  ctx.beginPath();
  ctx.moveTo(60, 395);
  ctx.lineTo(width - 60, 395);
  ctx.stroke();

  // Detail Row 2: Original Deal Amount
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('قيمة الصفقة المتفق عليها:', width - 60, 425);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`${data.dealAmount} ${data.dealCurrency} (${formatCurrency(data.dealAmountEGP)})`, width - 230, 425);

  // Divider
  ctx.beginPath();
  ctx.moveTo(60, 450);
  ctx.lineTo(width - 60, 450);
  ctx.stroke();

  // Detail Row 3: Commission
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('عمولة وساطة NZM JKR المعتمدة:', width - 60, 480);
  ctx.fillStyle = '#EA580C';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`+ ${formatCurrency(data.commissionAmountEGP)}`, width - 260, 480);

  // Divider
  ctx.beginPath();
  ctx.moveTo(60, 505);
  ctx.lineTo(width - 60, 505);
  ctx.stroke();

  // Detail Row 4: External Middleman
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('حالة الوساطة:', width - 60, 530);
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 14px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(data.hasExternalMiddleman ? `وساطة مشتركة مع: ${data.externalMiddlemanName}` : 'وساطة مباشرة ومؤمنة 100%', width - 160, 530);

  // Total Summary Banner (Golden Gradient)
  const totGrad = ctx.createLinearGradient(40, 565, width - 40, 565);
  totGrad.addColorStop(0, '#1E293B');
  totGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = totGrad;
  ctx.beginPath();
  ctx.roundRect(40, 565, width - 80, 90, 16);
  ctx.fill();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 14px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('المبلغ الإجمالي المسدد من المشتري:', width - 70, 605);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('شاملاً قيمة الحساب / العملية + رسوم التأمين والضمان', width - 70, 630);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`${formatCurrency(data.netPaidByBuyerEGP)}`, 70, 622);

  // Digital Security & Terms Box
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(40, 675, width - 80, 140, 12);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('🔒 بنود وإقرارات الضمان المالي والتقني:', width - 60, 703);

  ctx.fillStyle = '#475569';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('• يقر الطرفان بصحة الحساب/البيانات المستلمة ومطابقتها للمواصفات المتفق عليها دون أدنى نزاع.', width - 60, 728);
  ctx.fillText('• تم تسليم الأموال للبائع بعد تأكيد المشتري استلام الحساب وتغيير كافة وسائل الأمان والربط.', width - 60, 748);
  ctx.fillText('• هذه الفاتورة صادرة إلكترونياً من نظام NZM JKR ERP وتعد سنداً رسمياً ونهائياً للعملية.', width - 60, 768);
  ctx.fillText('• المتجر غير مسؤول عن أي محاولة استرجاع أو سوء استخدام بعد إتمام التسليم الموثق.', width - 60, 788);

  // Footer & Official Seal
  const footerY = 840;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(40, footerY, width - 80, 80);
  ctx.strokeStyle = '#E2E8F0';
  ctx.strokeRect(40, footerY, width - 80, 80);

  // Official Stamp Box
  ctx.strokeStyle = '#EA580C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(60, footerY + 12, 130, 56, 8);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#EA580C';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('NZM JKR OFFICIAL', 125, footerY + 34);
  ctx.font = 'bold 10px monospace';
  ctx.fillText('VERIFIED SEAL ★', 125, footerY + 52);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('شكراً لثقتكم بنظام NZM JKR — شريككم الموثوق في الوساطة والشحن الإلكتروني 🌟', width / 2 + 50, footerY + 35);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px monospace';
  ctx.fillText(`www.jkr-topup.com • Support: ${data.businessPhone || '01012345678'} • Official ERP System`, width / 2, footerY + 58);

  return canvas;
};

// =============================================================
// 2. CUSTOMER TOP-UP TICKET INVOICE CANVAS ENGINE
// =============================================================
export const generateTicketInvoiceCanvas = (
  ticket: CustomerTicket,
  settings?: CustomerModuleSettings
): HTMLCanvasElement => {
  const width = 800;
  const height = 1280;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const customer = (ticket.customerId ? (db.getCustomerById(ticket.customerId) || db.getDealerById(ticket.customerId)) : null)
    || db.findCustomerByPhone(ticket.customerPhone)
    || db.findDealerByPhone(ticket.customerPhone)
    || db.getCustomers(true).find(c => isSamePhoneNumber(c.phone, ticket.customerPhone))
    || db.getDealers(true).find(d => isSamePhoneNumber(d.phone, ticket.customerPhone));

  const balanceSnapshot = getTicketCustomerBalanceSnapshot(ticket, customer);
  const primaryBalance = balanceSnapshot.primaryBalance;
  const cashbackBalance = balanceSnapshot.cashbackBalance;
  const referralBalance = balanceSnapshot.referralBalance;

  const isReservation = ticket.isReservation || ticket.operationMode === 'reservation';
  const isReservationPending = isReservation && ticket.status !== 'completed';
  const isReservationDelivered = isReservation && ticket.status === 'completed';

  // Calculate execution duration
  const getDurationText = () => {
    if (ticket.executionDurationMinutes && ticket.executionDurationMinutes > 0) {
      return `${ticket.executionDurationMinutes} دقيقة ⚡`;
    }
    const end = ticket.completedAt ? new Date(ticket.completedAt).getTime() : (ticket.status === 'completed' ? new Date(ticket.updatedAt).getTime() : 0);
    const start = new Date(ticket.createdAt).getTime();
    if (end > start) {
      const diffMin = Math.round((end - start) / 60000);
      return `${diffMin > 0 ? diffMin : 1} دقيقة ⚡`;
    }
    return ticket.status === 'completed' ? 'فوري ⚡' : 'قيد المعالجة';
  };

  const deliveryDateText = ticket.completedAt
    ? formatDateTime(ticket.completedAt)
    : (ticket.status === 'completed' ? formatDateTime(ticket.updatedAt) : 'قيد المعالجة');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer Border
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Top Accent Banner (Color depending on mode)
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  if (isReservationPending) {
    gradient.addColorStop(0, '#7C3AED');
    gradient.addColorStop(1, '#9333EA');
  } else if (isReservationDelivered) {
    gradient.addColorStop(0, '#059669');
    gradient.addColorStop(1, '#10B981');
  } else {
    gradient.addColorStop(0, '#EA580C');
    gradient.addColorStop(1, '#F59E0B');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(16, 16, width - 32, 10);

  // Header Background
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(18, 26, width - 36, 110);
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(18, 136);
  ctx.lineTo(width - 18, 136);
  ctx.stroke();

  // Official Brand Logo
  drawOfficialBrandLogo(ctx, width - 122, 40, 82, 82, 12);

  // Business Info (RTL)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(settings?.businessName || 'NZM JKR TOP UP', width - 135, 68);

  ctx.fillStyle = '#64748B';
  ctx.font = '12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(settings?.businessAddress || 'المنصورة — جمهورية مصر العربية', width - 135, 92);
  ctx.fillText(`هاتف الدعم: ${settings?.businessPhone || '01012345678'}`, width - 135, 112);

  // Invoice Number & Date Box (Left Side)
  ctx.textAlign = 'left';
  ctx.fillStyle = isReservationPending ? '#7C3AED' : '#D97706';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(isReservationPending ? `حجز #${ticket.ticketNumber}` : `#${ticket.ticketNumber}`, 40, 54);

  ctx.fillStyle = '#64748B';
  ctx.font = '10px "Segoe UI", Tahoma, Arial, sans-serif';

  if (isReservationPending) {
    ctx.fillText(`تاريخ الحجز: ${formatDateTime(ticket.createdAt)}`, 40, 72);
    ctx.fillStyle = '#7C3AED';
    ctx.font = 'bold 11px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(`الميعاد للتسليم: ${ticket.scheduledDeliveryDate || 'قريباً'} ${ticket.scheduledDeliveryTime ? `(${ticket.scheduledDeliveryTime})` : ''}`, 40, 90);
    ctx.fillStyle = '#64748B';
    ctx.font = '10px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(`حالة الحجز: 📦 قيد التجهيز للتسليم`, 40, 108);
  } else if (isReservationDelivered) {
    ctx.fillText(`تاريخ الحجز: ${formatDateTime(ticket.createdAt)}`, 40, 72);
    ctx.fillText(`تاريخ التسليم: ${deliveryDateText}`, 40, 90);
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 11px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(`المدة: ${getDurationText()} • تم الإنجاز والتسليم`, 40, 108);
  } else {
    ctx.fillText(`بدء المعاملة: ${formatDateTime(ticket.createdAt)}`, 40, 74);
    ctx.fillText(`تاريخ التسليم: ${deliveryDateText}`, 40, 92);
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 11px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(`السرعة: ${getDurationText()} • المسؤول: ${ticket.assignedTo || 'مسؤول الشحن'}`, 40, 112);
  }

  // Customer & Player ID Info Bar
  ctx.fillStyle = isReservationPending ? '#FAF5FF' : '#FFF7ED';
  ctx.beginPath();
  ctx.roundRect(40, 155, width - 80, 95, 12);
  ctx.fill();
  ctx.strokeStyle = isReservationPending ? '#E9D5FF' : '#FED7AA';
  ctx.stroke();

  // Customer Name & Phone
  ctx.textAlign = 'right';
  ctx.fillStyle = isReservationPending ? '#6B21A8' : '#9A3412';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('👤 بيانات العميل والطلب:', width - 60, 182);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 16px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(`${ticket.customerName} (${ticket.customerPhone})`, width - 60, 208);

  ctx.fillStyle = '#64748B';
  ctx.font = '12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(`اللعبة: ${ticket.gameName} • القسم: ${ticket.gameSection || 'عام'}${isReservationPending ? ' • نوع المعاملة: حجز مسبق' : ''}`, width - 60, 232);

  // Player ID Box (Left)
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(60, 170, 240, 65, 10);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('PLAYER GAME ID (معرف اللاعب)', 180, 190);

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(ticket.playerGameId || '—', 180, 218);

  // Highlighted Scheduled Delivery Bar (If reservation pending)
  let tableY = 265;
  if (isReservationPending && ticket.scheduledDeliveryDate) {
    ctx.fillStyle = '#EDE9FE';
    ctx.beginPath();
    ctx.roundRect(40, 260, width - 80, 38, 8);
    ctx.fill();
    ctx.strokeStyle = '#C4B5FD';
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.fillStyle = '#5B21B6';
    ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText('📅 الميعاد المطلوب للتسليم المعتمد:', width - 60, 284);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#4C1D95';
    ctx.font = 'bold 13px monospace';
    const timePart = ticket.scheduledDeliveryTime ? `(الساعة ${ticket.scheduledDeliveryTime})` : '';
    ctx.fillText(`${ticket.scheduledDeliveryDate} ${timePart}`, 60, 284);

    tableY = 308;
  }

  // Items Table Header
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(40, tableY, width - 80, 36);
  ctx.strokeStyle = '#CBD5E1';
  ctx.strokeRect(40, tableY, width - 80, 36);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(isReservationPending ? 'المنتج المطلوب حجزه' : 'الباقة / المنتج', width - 60, tableY + 23);

  ctx.textAlign = 'center';
  ctx.fillText('الكمية', width / 2 + 30, tableY + 23);
  ctx.fillText('السعر الإفرادي', width / 2 - 60, tableY + 23);

  ctx.textAlign = 'left';
  ctx.fillText('الإجمالي', 60, tableY + 23);

  // Items Rows
  const items = ticket.items && ticket.items.length > 0 ? ticket.items : [
    {
      id: 'it_1',
      gameId: 'g1',
      gameName: ticket.gameName,
      productId: 'p1',
      productName: ticket.gameProductName,
      playerGameId: ticket.playerGameId,
      quantity: 1,
      unitPrice: ticket.totalProductsAmount || ticket.requiredAmount,
      totalPrice: ticket.totalProductsAmount || ticket.requiredAmount,
      costPrice: ticket.totalCostAmount || 0
    }
  ];

  let currentY = tableY + 36;
  items.slice(0, 4).forEach((item, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    ctx.fillRect(40, currentY, width - 80, 42);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(40, currentY, width - 80, 42);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(`${item.productName}`, width - 60, currentY + 26);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${item.quantity}`, width / 2 + 30, currentY + 26);
    ctx.fillText(`${formatCurrency(item.unitPrice)}`, width / 2 - 60, currentY + 26);

    ctx.textAlign = 'left';
    ctx.fillStyle = isReservationPending ? '#7C3AED' : '#EA580C';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`${formatCurrency(item.totalPrice)}`, 60, currentY + 26);

    currentY += 42;
  });

  // Financial Breakdown Box
  currentY += 15;
  let breakdownBoxHeight = 160;
  if ((ticket.couponDiscountAmount || 0) > 0) breakdownBoxHeight += 24;
  if ((ticket.accountBalanceUsed || 0) > 0) breakdownBoxHeight += 24;
  if ((ticket.cashbackUsed || 0) > 0) breakdownBoxHeight += 24;
  if ((ticket.referralBalanceUsed || 0) > 0) breakdownBoxHeight += 24;

  ctx.fillStyle = '#FAFAFA';
  ctx.beginPath();
  ctx.roundRect(40, currentY, width - 80, breakdownBoxHeight, 12);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  // Total Products
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(isReservationPending ? 'إجمالي قيمة المنتج المطلوب:' : 'إجمالي المنتجات:', width - 60, currentY + 28);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`${formatCurrency(ticket.totalProductsAmount || ticket.requiredAmount)}`, 60, currentY + 28);

  // Discounts & Used Balances with Remaining Info
  let discY = currentY + 52;
  if ((ticket.couponDiscountAmount || 0) > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#D97706';
    ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(`خصم كود الكوبون (${ticket.couponCode}):`, width - 60, discY);
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`- ${formatCurrency(ticket.couponDiscountAmount || 0)}`, 60, discY);
    discY += 24;
  }

  if ((ticket.accountBalanceUsed || 0) > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2563EB';
    ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(`خصم من رصيد العميل (المحفظة الأساسية) (المتبقي: ${formatCurrency(primaryBalance)}):`, width - 60, discY);
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`- ${formatCurrency(ticket.accountBalanceUsed || 0)}`, 60, discY);
    discY += 24;
  }

  if ((ticket.cashbackUsed || 0) > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(`خصم من محفظة الكاش باك (المتبقي: ${formatCurrency(cashbackBalance)}):`, width - 60, discY);
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`- ${formatCurrency(ticket.cashbackUsed || 0)}`, 60, discY);
    discY += 24;
  }

  if ((ticket.referralBalanceUsed || 0) > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7C3AED';
    ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(`خصم من محفظة الإحالة (المتبقي: ${formatCurrency(referralBalance)}):`, width - 60, discY);
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`- ${formatCurrency(ticket.referralBalanceUsed || 0)}`, 60, discY);
    discY += 24;
  }

  // Payment Details Row
  const payDividerY = discY + 8;
  ctx.strokeStyle = '#E5E7EB';
  ctx.beginPath();
  ctx.moveTo(60, payDividerY);
  ctx.lineTo(width - 60, payDividerY);
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  const payInfo = `وسيلة الدفع: ${ticket.paymentGateway || ticket.paymentWallet} ${ticket.paymentReceivedPhone ? `• خط: ${ticket.paymentReceivedPhone}` : ''} ${ticket.transferReferenceNumber ? `• المرجع: #${ticket.transferReferenceNumber}` : ''}`;
  ctx.fillText(payInfo, width - 60, payDividerY + 24);

  if ((ticket.cashbackEarned || 0) > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(isReservationPending ? `🎁 كاش باك مستحق: +${formatCurrency(ticket.cashbackEarned)}` : `🎁 كاش باك مضاف: +${formatCurrency(ticket.cashbackEarned)}`, 60, payDividerY + 24);
  }

  // Grand Total Banner
  currentY += breakdownBoxHeight + 15;
  const totGrad = ctx.createLinearGradient(40, currentY, width - 40, currentY);
  if (isReservationPending) {
    totGrad.addColorStop(0, '#6D28D9');
    totGrad.addColorStop(1, '#8B5CF6');
  } else {
    totGrad.addColorStop(0, '#EA580C');
    totGrad.addColorStop(1, '#D97706');
  }
  ctx.fillStyle = totGrad;
  ctx.beginPath();
  ctx.roundRect(40, currentY, width - 80, 80, 16);
  ctx.fill();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(isReservationPending ? 'مقدم الحجز المسدد (Paid Deposit):' : 'المبلغ الصافي المسدد (Net Total Paid):', width - 70, currentY + 36);

  const effectivePaidAmount = ticket.receivedAmount > 0 ? ticket.receivedAmount : ticket.requiredAmount;
  const hasShortage = (ticket.shortageAmount && ticket.shortageAmount > 0) || (ticket.receivedAmount > 0 && ticket.receivedAmount < ticket.requiredAmount);
  const shortageVal = ticket.shortageAmount || (ticket.receivedAmount > 0 && ticket.receivedAmount < ticket.requiredAmount ? Math.round((ticket.requiredAmount - ticket.receivedAmount) * 100) / 100 : 0);
  const hasOverpayment = ticket.overpaymentAmount && ticket.overpaymentAmount > 0;

  let subText = '';
  if (isReservationPending) {
    const rem = ticket.requiredAmount > effectivePaidAmount ? ticket.requiredAmount - effectivePaidAmount : 0;
    subText = rem > 0
      ? `المطلوب كلياً: ${formatCurrency(ticket.requiredAmount)} | المتبقي عند الاستلام: ${formatCurrency(rem)} | موعد التسليم: ${ticket.scheduledDeliveryDate || 'قريباً'}`
      : `تم سداد كامل قيمة الحجز مسبقاً | موعد التسليم المعتمد: ${ticket.scheduledDeliveryDate || 'قريباً'}`;
  } else {
    const balFormatted = primaryBalance < 0
      ? `${formatCurrency(primaryBalance)} (مدين)`
      : primaryBalance > 0
      ? `+${formatCurrency(primaryBalance)} (دائن)`
      : `0.00 ج.م (متزن)`;

    if (hasShortage) {
      subText = `المطلوب: ${formatCurrency(ticket.requiredAmount)} | عجز سداد: -${formatCurrency(shortageVal)} | رصيد محفظتك أصبح: ${balFormatted}`;
    } else if (hasOverpayment) {
      subText = `المطلوب: ${formatCurrency(ticket.requiredAmount)} | فائض مضاف: +${formatCurrency(ticket.overpaymentAmount)} | رصيد محفظتك أصبح: ${balFormatted}`;
    } else if ((ticket.accountBalanceUsed || 0) > 0) {
      subText = `المطلوب: ${formatCurrency(ticket.requiredAmount)} | تم خصم ${formatCurrency(ticket.accountBalanceUsed)} من رصيدك | رصيدك المتبقي: ${balFormatted}`;
    } else {
      subText = `المطلوب: ${formatCurrency(ticket.requiredAmount)} | رصيد محفظتك: ${balFormatted} | تم تأكيد واستلام الدفعة وتسليم الشحن بنجاح`;
    }
  }

  ctx.fillStyle = '#FEF3C7';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(subText, width - 70, currentY + 58);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`${formatCurrency(effectivePaidAmount)}`, 70, currentY + 52);

  // Customer Wallets Status Box (محدث بالمعاملة)
  currentY += 95;
  const walletBoxHeight = 55 + 24 + (referralBalance > 0 ? 24 : 0);
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(40, currentY, width - 80, walletBoxHeight, 12);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.stroke();

  // Header of Wallets Box
  ctx.textAlign = 'right';
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('💼 بيان أرصدة محافظ العميل (وقت هذه المعاملة):', width - 60, currentY + 22);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 10px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('● رصيد وقت المعاملة', 60, currentY + 22);

  let wY = currentY + 44;
  // Cashback Line - Always shown
  ctx.textAlign = 'right';
  ctx.fillStyle = '#065F46';
  ctx.font = 'bold 11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(isReservationPending ? `🎁 كاش باك مستحق عند التسليم: +${formatCurrency(ticket.cashbackEarned || 0)}` : `🎁 كاش باك المعاملة: +${formatCurrency(ticket.cashbackEarned || 0)}`, width - 60, wY);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(isReservationPending ? `رصيد الكاش باك المسجل: ${formatCurrency(cashbackBalance)}` : `رصيد الكاش باك بعد المعاملة: ${formatCurrency(cashbackBalance)}`, 60, wY);
  wY += 24;

  // Primary Wallet Line - Always shown
  ctx.textAlign = 'right';
  ctx.fillStyle = primaryBalance < 0 ? '#B91C1C' : primaryBalance > 0 ? '#1D4ED8' : '#475569';
  ctx.font = 'bold 11px "Segoe UI", Tahoma, Arial, sans-serif';
  const primaryBalLabel = primaryBalance > 0
    ? `رصيد المحفظة الأساسية: +${formatCurrency(primaryBalance)} (دائن لك)`
    : primaryBalance < 0
    ? `رصيد المحفظة الأساسية: ${formatCurrency(primaryBalance)} (عجز سداد مدين)`
    : `رصيد المحفظة الأساسية: 0.00 ج.م (متزن)`;
  ctx.fillText(primaryBalLabel, width - 60, wY);

  ctx.textAlign = 'left';
  ctx.font = '10px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(primaryBalance < 0 ? '⚠️ يوجد عجز سداد مسجل' : primaryBalance > 0 ? '✨ رصيد دائن متاح' : '● حساب متزن', 60, wY);
  wY += 24;

  // Referral Wallet Line - Only shown if balance > 0
  if (referralBalance > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#6D28D9';
    ctx.font = 'bold 11px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText(`رصيد محفظة الإحالة: ${formatCurrency(referralBalance)}`, width - 60, wY);

    ctx.textAlign = 'left';
    ctx.font = '10px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText('عمولات إحالة متاحة', 60, wY);
    wY += 24;
  }

  // Lifetime Guarantee Ribbon (ضمان مدى الحياة على منتجاتنا)
  currentY += walletBoxHeight + 14;
  const guarGrad = ctx.createLinearGradient(40, currentY, width - 40, currentY);
  guarGrad.addColorStop(0, '#ECFDF5');
  guarGrad.addColorStop(0.5, '#FEF3C7');
  guarGrad.addColorStop(1, '#ECFDF5');
  ctx.fillStyle = guarGrad;
  ctx.beginPath();
  ctx.roundRect(40, currentY, width - 80, 44, 10);
  ctx.fill();
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#065F46';
  ctx.font = 'bold 16px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('🛡️ ضمان مدى الحياة على منتجاتنا 🛡️', width / 2, currentY + 28);

  // Footer & Official Seal
  const footerY = currentY + 56;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(40, footerY, width - 80, 68);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, footerY, width - 80, 68);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(settings?.invoiceFooterNote || 'شكراً لتعاملك مع NZM JKR Top Up — متجر شحن الألعاب الإلكترونية الأول 🌟', width / 2, footerY + 26);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px monospace';
  ctx.fillText(`www.jkr-topup.com • Customer Care: ${settings?.businessPhone || '01012345678'} • Official ERP Receipt`, width / 2, footerY + 48);

  return canvas;
};

// =============================================================
// 3. SUBSCRIPTIONS RECEIPT CANVAS ENGINE
// =============================================================
export const generateSubscriptionInvoiceCanvas = (
  subscription: CustomerSubscription,
  payment?: SubscriptionPayment,
  settings?: any
): HTMLCanvasElement => {
  const width = 800;
  const height = 980;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer Border
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Top Accent Banner (Purple / Indigo)
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#7C3AED');
  gradient.addColorStop(1, '#EC4899');
  ctx.fillStyle = gradient;
  ctx.fillRect(16, 16, width - 32, 10);

  // Header Background
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(18, 26, width - 36, 110);
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(18, 136);
  ctx.lineTo(width - 18, 136);
  ctx.stroke();

  // Official Brand Logo
  drawOfficialBrandLogo(ctx, width - 122, 40, 82, 82, 12);

  // Business Info (RTL)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('NZM JKR الاشتراكات والخدمات الرقمية', width - 135, 68);

  ctx.fillStyle = '#64748B';
  ctx.font = '12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('المنصورة — جمهورية مصر العربية', width - 135, 92);
  ctx.fillText('خدمة العملاء: 01012345678', width - 135, 112);

  // Invoice Number & Date Box (Left Side)
  const receiptNo = payment?.receiptNumber || `SUB-${subscription.subscriptionNumber || subscription.id.slice(-6).toUpperCase()}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7C3AED';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`#${receiptNo}`, 40, 68);

  ctx.fillStyle = '#64748B';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(`التاريخ: ${formatDateTime(payment?.createdAt || subscription.createdAt)}`, 40, 92);
  ctx.fillText('نوع الوثيقة: إيصال تفعيل اشتراك معتمد', 40, 112);

  // Subscription Header Card
  ctx.fillStyle = '#FAF5FF';
  ctx.beginPath();
  ctx.roundRect(40, 155, width - 80, 90, 12);
  ctx.fill();
  ctx.strokeStyle = '#E9D5FF';
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#6B21A8';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('👑 بيانات الاشتراك والخدمة الرقمية:', width - 60, 182);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 17px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(`${subscription.planCategory || 'خدمات رقمية'} — ${subscription.planName}`, width - 60, 210);

  ctx.fillStyle = '#64748B';
  ctx.font = '12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(`العميل: ${subscription.customerName} (${subscription.customerPhone})`, width - 60, 232);

  // Dates (Start & Expiry)
  ctx.fillStyle = '#1E1B4B';
  ctx.beginPath();
  ctx.roundRect(60, 168, 220, 62, 10);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#A78BFA';
  ctx.font = '10px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('تاريخ الانتهاء (EXPIRY DATE)', 170, 188);

  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`${subscription.endDate ? subscription.endDate.split('T')[0] : '—'}`, 170, 214);

  // Account Credentials Box
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(40, 260, width - 80, 150, 14);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('🔐 بيانات الحساب والتشغيل:', width - 60, 290);

  // Email / User
  ctx.fillStyle = '#64748B';
  ctx.font = '12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('حساب / بريد الخدمة:', width - 60, 320);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(subscription.serviceAccountUser || '—', width - 230, 320);

  // Password
  if (subscription.serviceAccountPassword) {
    ctx.fillStyle = '#64748B';
    ctx.font = '12px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.fillText('كلمة المرور / السيرفر:', width - 60, 350);
    ctx.fillStyle = '#7C3AED';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(subscription.serviceAccountPassword, width - 230, 350);
  }

  // Financial Breakdown
  const finY = 425;
  ctx.fillStyle = '#FAFAFA';
  ctx.beginPath();
  ctx.roundRect(40, finY, width - 80, 140, 12);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  const pricePaid = payment?.netPaid || payment?.amount || subscription.finalPrice;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('سعر الاشتراك الرسمي:', width - 60, finY + 35);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`${formatCurrency(subscription.finalPrice)}`, 60, finY + 35);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.fillText('وسيلة وطريقة الدفع:', width - 60, finY + 65);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7C3AED';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(`${payment?.paymentMethod || 'كاش / محفظة إلكترونية'}`, 60, finY + 65);

  ctx.strokeStyle = '#E5E7EB';
  ctx.beginPath();
  ctx.moveTo(60, finY + 85);
  ctx.lineTo(width - 60, finY + 85);
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('حالة الاشتراك: مفعل ونشط مع ضمان كامل فترة الاشتراك ★', width - 60, finY + 115);

  // Grand Total Banner
  const totY = finY + 155;
  const totGrad = ctx.createLinearGradient(40, totY, width - 40, totY);
  totGrad.addColorStop(0, '#581C87');
  totGrad.addColorStop(1, '#3B0764');
  ctx.fillStyle = totGrad;
  ctx.beginPath();
  ctx.roundRect(40, totY, width - 80, 80, 16);
  ctx.fill();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#F5D0FE';
  ctx.font = 'bold 14px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('المبلغ الصافي المسدد (Total Paid):', width - 70, totY + 38);

  ctx.fillStyle = '#E9D5FF';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('تم تأكيد الدفعة وتفعيل الاشتراك الرقمي بنجاح', width - 70, totY + 58);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`${formatCurrency(pricePaid)}`, 70, totY + 52);

  // Terms & Instructions
  const termsY = totY + 95;
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(40, termsY, width - 80, 100, 10);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('📜 تعليمات وقواعد الاستخدام:', width - 60, termsY + 25);

  ctx.fillStyle = '#64748B';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('• يرجى الالتزام بالبروفايل المخصص لك فقط وعدم تغيير البريد أو كلمة المرور تجنباً للإلغاء.', width - 60, termsY + 48);
  ctx.fillText('• ضمان كامل المدة يتم استبدال الحساب فوراً في حال حدوث أي توقف تقني غير متوقع.', width - 60, termsY + 68);
  ctx.fillText('• للتجديد قبل انتهاء المدة، يرجى التواصل مع خدمة العملاء عبر واتساب 01012345678.', width - 60, termsY + 88);

  // Footer
  const footerY = termsY + 115;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(40, footerY, width - 80, 55);
  ctx.strokeStyle = '#E2E8F0';
  ctx.strokeRect(40, footerY, width - 80, 55);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('NZM JKR Digital Subscriptions ERP — شكراً لاختياركم خدماتنا الرقمية 🌟', width / 2, footerY + 24);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px monospace';
  ctx.fillText(`www.jkr-topup.com • Official Digital ERP Receipt`, width / 2, footerY + 42);

  return canvas;
};

// =============================================================
// 4. DEALER WHOLESALE INVOICE CANVAS ENGINE
// =============================================================
export const generateDealerInvoiceCanvas = (
  dealer: Dealer,
  transaction?: UnifiedWalletTransaction | any,
  settings?: any
): HTMLCanvasElement => {
  const width = 800;
  const height = 980;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer Border
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Top Accent Banner (Emerald to Teal)
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#059669');
  gradient.addColorStop(1, '#0D9488');
  ctx.fillStyle = gradient;
  ctx.fillRect(16, 16, width - 32, 10);

  // Header Background
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(18, 26, width - 36, 110);
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(18, 136);
  ctx.lineTo(width - 18, 136);
  ctx.stroke();

  // Official Brand Logo
  drawOfficialBrandLogo(ctx, width - 122, 40, 82, 82, 12);

  // Business Info (RTL)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('NZM JKR قسم التجار والشحن بالجملة', width - 135, 68);

  ctx.fillStyle = '#64748B';
  ctx.font = '12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('المنصورة — جمهورية مصر العربية', width - 135, 92);
  ctx.fillText('إدارة التجار والموزعين: 01012345678', width - 135, 112);

  // Invoice Number & Date Box (Left Side)
  const invNo = transaction?.invoiceNumber || transaction?.id || `DLR-INV-${Date.now().toString().slice(-6)}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`#${invNo}`, 40, 68);

  ctx.fillStyle = '#64748B';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(`التاريخ: ${formatDateTime(transaction?.createdAt || new Date().toISOString())}`, 40, 92);
  ctx.fillText(`كود التاجر: ${dealer.code}`, 40, 112);

  // Dealer Details Banner
  ctx.fillStyle = '#ECFDF5';
  ctx.beginPath();
  ctx.roundRect(40, 155, width - 80, 90, 12);
  ctx.fill();
  ctx.strokeStyle = '#A7F3D0';
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#065F46';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('🏢 بيانات التاجر / الموزع المعتمد:', width - 60, 182);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 17px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(`${dealer.name} ${dealer.businessName ? `(${dealer.businessName})` : ''}`, width - 60, 210);

  ctx.fillStyle = '#64748B';
  ctx.font = '12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(`الهاتف: ${dealer.phone} • مستوى التاجر: ${dealer.purchasingPower || dealer.loyaltyTier || 'تاجر ذهبي'}`, width - 60, 232);

  // Balance Box (Left)
  ctx.fillStyle = '#064E3B';
  ctx.beginPath();
  ctx.roundRect(60, 168, 220, 62, 10);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#6EE7B7';
  ctx.font = '10px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('رصيد المحفظة المتبقي للتاجر', 170, 188);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`${formatCurrency(dealer.balance)}`, 170, 214);

  // Transaction Description Box
  ctx.fillStyle = '#FAFAFA';
  ctx.beginPath();
  ctx.roundRect(40, 260, width - 80, 220, 14);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('📋 تفاصيل الفاتورة وحركة الرصيد:', width - 60, 290);

  ctx.fillStyle = '#64748B';
  ctx.font = '12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('البيان / نوع الحركة:', width - 60, 325);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(transaction?.description || 'طلب شحن فوري بأسعار الجملة المعتمدة', width - 200, 325);

  ctx.fillStyle = '#64748B';
  ctx.fillText('الرصيد قبل الحركة:', width - 60, 360);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`${formatCurrency(transaction?.balanceBefore || dealer.balance)}`, width - 200, 360);

  ctx.fillStyle = '#64748B';
  ctx.fillText('الرصيد بعد الحركة:', width - 60, 395);
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`${formatCurrency(transaction?.balanceAfter || dealer.balance)}`, width - 200, 395);

  ctx.fillStyle = '#64748B';
  ctx.fillText('المنفذ / المشرف:', width - 60, 430);
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText(transaction?.performedBy || 'إدارة الحسابات بالجملة', width - 200, 430);

  // Grand Total Banner
  const totY = 500;
  const totGrad = ctx.createLinearGradient(40, totY, width - 40, totY);
  totGrad.addColorStop(0, '#064E3B');
  totGrad.addColorStop(1, '#065F46');
  ctx.fillStyle = totGrad;
  ctx.beginPath();
  ctx.roundRect(40, totY, width - 80, 80, 16);
  ctx.fill();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#A7F3D0';
  ctx.font = 'bold 14px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('قيمة الفاتورة بالجملة (Invoice Amount):', width - 70, totY + 38);

  ctx.fillStyle = '#D1FAE5';
  ctx.font = '11px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('تم خصم/إيداع القيمة من محفظة التاجر رسمياً', width - 70, totY + 58);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`${formatCurrency(transaction?.amount || 0)}`, 70, totY + 52);

  // Footer & Official Stamp
  const footerY = 600;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(40, footerY, width - 80, 75);
  ctx.strokeStyle = '#E2E8F0';
  ctx.strokeRect(40, footerY, width - 80, 75);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 12px "Segoe UI", Tahoma, Arial, sans-serif';
  ctx.fillText('NZM JKR B2B Dealers ERP — شكراً لشراكتكم الدائمة 🌟', width / 2, footerY + 30);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px monospace';
  ctx.fillText(`www.jkr-topup.com • Dealers Support: 01012345678 • Official Wholesale Receipt`, width / 2, footerY + 52);

  return canvas;
};

// =============================================================
// UNIVERSAL CLIPBOARD COPY & DOWNLOAD HELPER FUNCTIONS
// =============================================================

export const copyCanvasToClipboard = async (
  canvas: HTMLCanvasElement,
  fallbackFilename: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    return new Promise(resolve => {
      canvas.toBlob(async blob => {
        if (!blob) {
          resolve({ success: false, message: 'تعذر إنشاء ملف الصورة' });
          return;
        }

        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          resolve({ success: true });
        } catch (clipErr) {
          const link = document.createElement('a');
          link.download = fallbackFilename;
          link.href = canvas.toDataURL('image/png');
          link.click();
          resolve({ success: true, message: 'downloaded' });
        }
      }, 'image/png');
    });
  } catch (e: any) {
    console.error('Invoice canvas generation error:', e);
    return { success: false, message: e?.message || 'فشل التقاط صورة الفاتورة' };
  }
};

export const copyInvoiceToClipboard = async (
  data: MiddlemanInvoiceData
): Promise<{ success: boolean; message?: string }> => {
  await ensureOfficialLogoLoaded();
  const canvas = generateInvoiceCanvas(data);
  return copyCanvasToClipboard(canvas, `invoice_${data.invoiceNumber}.png`);
};

export const downloadInvoiceImage = async (data: MiddlemanInvoiceData): Promise<void> => {
  await ensureOfficialLogoLoaded();
  const canvas = generateInvoiceCanvas(data);
  const link = document.createElement('a');
  link.download = `invoice_${data.invoiceNumber}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

export const copyTicketInvoiceToClipboard = async (
  ticket: CustomerTicket,
  settings?: CustomerModuleSettings
): Promise<{ success: boolean; message?: string }> => {
  await ensureOfficialLogoLoaded();
  const canvas = generateTicketInvoiceCanvas(ticket, settings);
  return copyCanvasToClipboard(canvas, `invoice_${ticket.ticketNumber}.png`);
};

export const downloadTicketInvoiceImage = async (
  ticket: CustomerTicket,
  settings?: CustomerModuleSettings
): Promise<void> => {
  await ensureOfficialLogoLoaded();
  const canvas = generateTicketInvoiceCanvas(ticket, settings);
  const link = document.createElement('a');
  link.download = `invoice_${ticket.ticketNumber}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

export const copySubscriptionInvoiceToClipboard = async (
  subscription: CustomerSubscription,
  payment?: SubscriptionPayment,
  settings?: any
): Promise<{ success: boolean; message?: string }> => {
  await ensureOfficialLogoLoaded();
  const canvas = generateSubscriptionInvoiceCanvas(subscription, payment, settings);
  return copyCanvasToClipboard(canvas, `sub_invoice_${subscription.id}.png`);
};

export const downloadSubscriptionInvoiceImage = async (
  subscription: CustomerSubscription,
  payment?: SubscriptionPayment,
  settings?: any
): Promise<void> => {
  await ensureOfficialLogoLoaded();
  const canvas = generateSubscriptionInvoiceCanvas(subscription, payment, settings);
  const link = document.createElement('a');
  link.download = `sub_invoice_${subscription.id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

export const copyDealerInvoiceToClipboard = async (
  dealer: Dealer,
  transaction?: UnifiedWalletTransaction | any,
  settings?: any
): Promise<{ success: boolean; message?: string }> => {
  await ensureOfficialLogoLoaded();
  const canvas = generateDealerInvoiceCanvas(dealer, transaction, settings);
  return copyCanvasToClipboard(canvas, `dealer_invoice_${dealer.code}.png`);
};

export const downloadDealerInvoiceImage = async (
  dealer: Dealer,
  transaction?: UnifiedWalletTransaction | any,
  settings?: any
): Promise<void> => {
  await ensureOfficialLogoLoaded();
  const canvas = generateDealerInvoiceCanvas(dealer, transaction, settings);
  const link = document.createElement('a');
  link.download = `dealer_invoice_${dealer.code}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
