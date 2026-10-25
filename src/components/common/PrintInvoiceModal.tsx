import React, { useState } from 'react';
import { CustomerTicket } from '../../types/customer.types';
import { CustomerModuleSettings } from '../../types/topup.types';
import { db } from '../../database/db';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from './Modal';
import { Button } from './Button';
import {
  Printer,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Download,
  QrCode,
  ImageIcon,
  Loader2,
  Send,
  MessageCircle,
  Copy
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { copyTicketInvoiceToClipboard, downloadTicketInvoiceImage } from '../../utils/invoiceImageGenerator';
import { ReportEngine } from '../../services/reporting/reportEngine';
import { ReportConfig } from '../../services/reporting/reportTypes';
import { isSamePhoneNumber } from '../../utils/phoneUtils';
import { getTicketCustomerBalanceSnapshot } from '../../utils/ticketBalanceSnapshot';

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: CustomerTicket;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  isOpen,
  onClose,
  ticket
}) => {
  const { showToast } = useNotifications();
  const settings: CustomerModuleSettings = db.getCustomerModuleSettings();
  const [paperFormat, setPaperFormat] = useState<'thermal_80mm' | 'a4'>(settings.invoicePaperFormat || 'thermal_80mm');
  const [isCapturing, setIsCapturing] = useState(false);

  const handlePrint = () => {
    const config: ReportConfig = {
      startDate: '',
      endDate: '',
      reportType: 'detailed',
      showProfits: false,
      showCosts: false,
      showExpenses: false,
      showLogo: true,
      showUserData: true,
      showPageNumbers: true,
      showManagerSignature: true,
      paperSize: paperFormat === 'thermal_80mm' ? 'A5' : 'A4'
    };
    const doc = ReportEngine.generateReportDocument('ticket_invoice', config, ticket);
    ReportEngine.printReportDocument(doc, config);
  };

  // Copy Invoice As High-Res PNG Image to Clipboard (Same engine as Middleman)
  const handleCopyImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      showToast('info', 'جاري التقاط صورة الفاتورة...', 'يتم معالجة المستند بدقة Vector عالية');
      const res = await copyTicketInvoiceToClipboard(ticket, settings);

      if (res.success) {
        if (res.message === 'downloaded') {
          showToast('success', 'تم تنزيل صورة الفاتورة 📥', 'تم حفظ الصورة على جهازك بنجاح');
        } else {
          showToast(
            'success',
            'تم نسخ صورة الفاتورة 🖼️',
            'تم وضع صورة الفاتورة في الحافظة بنجاح! يمكنك الآن لصقها (Ctrl+V) مباشرة في واتساب أو تيليجرام.'
          );
        }
      } else {
        showToast('error', 'فشل التقاط الصورة', res.message || 'تعذر إنشاء الصورة');
      }
    } catch (error: any) {
      console.error('Error copying ticket invoice image:', error);
      showToast('error', 'حدث خطأ', error?.message || 'تعذر التقاط صورة الفاتورة');
    } finally {
      setIsCapturing(false);
    }
  };

  // Download Invoice as PNG
  const handleDownloadImage = () => {
    try {
      downloadTicketInvoiceImage(ticket, settings);
      showToast('success', 'تم تنزيل الصورة 📥', 'تم حفظ صورة الفاتورة بنجاح');
    } catch (error) {
      console.error(error);
      showToast('error', 'حدث خطأ', 'تعذر تنزيل صورة الفاتورة');
    }
  };

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

  // Direct WhatsApp Share
  const handleShareWhatsApp = () => {
    const phoneToUse = ticket.customerPhone.replace(/[^0-9]/g, '');
    const cleanPhone = phoneToUse.startsWith('0') ? '2' + phoneToUse : phoneToUse;
    const effectiveReceived = ticket.receivedAmount > 0 ? ticket.receivedAmount : ticket.requiredAmount;
    
    let walletMsg = '';
    if (ticket.accountBalanceUsed && ticket.accountBalanceUsed > 0) {
      walletMsg += `💳 خصم من رصيد العميل (المحفظة الأساسية): -${ticket.accountBalanceUsed} ج.م (المتبقي: ${primaryBalance} ج.م)\n`;
    }
    if (ticket.cashbackUsed && ticket.cashbackUsed > 0) {
      walletMsg += `🎁 خصم من محفظة الكاش باك: -${ticket.cashbackUsed} ج.م (المتبقي: ${cashbackBalance} ج.م)\n`;
    }
    if (ticket.referralBalanceUsed && ticket.referralBalanceUsed > 0) {
      walletMsg += `👥 خصم من محفظة الإحالة: -${ticket.referralBalanceUsed} ج.م (المتبقي: ${referralBalance} ج.م)\n`;
    }
    walletMsg += `🎁 كاش باك مضاف: +${ticket.cashbackEarned || 0} ج.م (رصيد الكاش باك الحالي: ${cashbackBalance} ج.م)\n`;
    walletMsg += `💼 رصيد المحفظة الأساسية: ${primaryBalance > 0 ? `+${primaryBalance} ج.م (دائن لك)` : primaryBalance < 0 ? `${primaryBalance} ج.م (عجز سداد مدين)` : '0.00 ج.م (متزن)'}\n`;
    if (referralBalance > 0) {
      walletMsg += `👥 رصيد محفظة الإحالة: ${referralBalance} ج.م\n`;
    }

    let paymentMsg = `💰 المبلغ المسدد: ${formatCurrency(effectiveReceived)}`;
    if (ticket.receivedAmount > 0 && ticket.receivedAmount !== ticket.requiredAmount) {
      paymentMsg += ` (المطلوب: ${formatCurrency(ticket.requiredAmount)})`;
    }
    if (ticket.shortageAmount && ticket.shortageAmount > 0) {
      paymentMsg += `\n⚠️ عجز في السداد: -${ticket.shortageAmount} ج.م (رصيد محفظتك أصبح: ${primaryBalance} ج.م مدين)`;
    } else if (ticket.overpaymentAmount && ticket.overpaymentAmount > 0) {
      paymentMsg += `\n✨ فائض مضاف للمحفظة: +${ticket.overpaymentAmount} ج.م (رصيد محفظتك أصبح: +${primaryBalance} ج.م دائن)`;
    }

    let msgContent = '';
    if (isReservationPending) {
      msgContent =
        `🌟 تحية طيبة من *${settings.businessName || 'NZM JKR TOP UP'}*\n` +
        `📦 *إيصال تأكيد حجز منتج رسمي*\n` +
        `🔢 رقم تذكرة الحجز: *#${ticket.ticketNumber}*\n` +
        `🕒 تاريخ تسجيل الحجز: ${formatDateTime(ticket.createdAt)}\n` +
        `📅 *الميعاد المطلوب للتسليم:* *${ticket.scheduledDeliveryDate || 'قريباً'}* ${ticket.scheduledDeliveryTime ? `(الساعة ${ticket.scheduledDeliveryTime})` : ''}\n` +
        `🎮 اللعبة: ${ticket.gameName}\n` +
        `📦 المنتج المطلوب حجزه: ${ticket.gameProductName}\n` +
        `🆔 معرف اللاعب: ${ticket.playerGameId || '—'}\n` +
        `💰 المبلغ المسدد (مقدم الحجز): ${formatCurrency(effectiveReceived)}\n` +
        (ticket.receivedAmount > 0 && ticket.receivedAmount < ticket.requiredAmount ? `⏳ المتبقي عند الاستلام: ${formatCurrency(ticket.requiredAmount - ticket.receivedAmount)}\n` : '') +
        (ticket.reservationNotes ? `📝 ملاحظات الحجز: ${ticket.reservationNotes}\n` : '') +
        `------------------------\n` +
        `📌 *حالة الطلب:* تم تسجيل وتأمين الحجز بنجاح وسيتم التسليم في الموعد المحدد بإذن الله ⚡\n` +
        `🛡️ *ضمان مدى الحياة على منتجاتنا*\n` +
        `شكراً لثقتكم بنا! ★`;
    } else if (isReservationDelivered) {
      msgContent =
        `🌟 تحية طيبة من *${settings.businessName || 'NZM JKR TOP UP'}*\n` +
        `🎉 *فاتورة تسليم وإتمام حجز معتمدة*\n` +
        `🧾 رقم الفاتورة: *#${ticket.ticketNumber}*\n` +
        `📅 تاريخ تسجيل الحجز: ${formatDateTime(ticket.createdAt)}\n` +
        `🚀 تاريخ ووقت التسليم الفعلي: ${deliveryDateText} (${getDurationText()})\n` +
        `🎮 اللعبة: ${ticket.gameName}\n` +
        `📦 الباقة المسلمة: ${ticket.gameProductName}\n` +
        `🆔 معرف اللاعب: ${ticket.playerGameId || '—'}\n` +
        `${paymentMsg}\n` +
        `------------------------\n` +
        `${walletMsg}` +
        `------------------------\n` +
        `🛡️ *ضمان مدى الحياة على منتجاتنا*\n` +
        `شكراً لثقتكم بنا ويسعدنا خدمتكم دائماً! ★`;
    } else {
      msgContent =
        `🌟 تحية طيبة من *${settings.businessName || 'NZM JKR TOP UP'}*\n` +
        `🧾 فاتورة شحن رقم: *#${ticket.ticketNumber}*\n` +
        `🕒 تاريخ البدء: ${formatDateTime(ticket.createdAt)}\n` +
        `🚀 تاريخ التسليم: ${deliveryDateText} (${getDurationText()})\n` +
        `🎮 اللعبة: ${ticket.gameName}\n` +
        `📦 الباقة: ${ticket.gameProductName}\n` +
        `🆔 معرف اللاعب: ${ticket.playerGameId || '—'}\n` +
        `${paymentMsg}\n` +
        `------------------------\n` +
        `${walletMsg}` +
        `------------------------\n` +
        `🛡️ *ضمان مدى الحياة على منتجاتنا*\n` +
        `شكراً لثقتكم بنا! ★`;
    }

    const msg = encodeURIComponent(msgContent);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const items = ticket.items && ticket.items.length > 0
    ? ticket.items
    : [
        {
          id: 'single_1',
          gameId: 'game_1',
          gameName: ticket.gameName,
          productId: 'prod_1',
          productName: ticket.gameProductName,
          playerGameId: ticket.playerGameId,
          quantity: 1,
          unitPrice: ticket.requiredAmount + (ticket.cashbackUsed || 0) + (ticket.couponDiscountAmount || 0),
          totalPrice: ticket.requiredAmount + (ticket.cashbackUsed || 0) + (ticket.couponDiscountAmount || 0),
          costPrice: 0
        }
      ];

  const totalProductsCalculated = ticket.totalProductsAmount || items.reduce((acc, it) => acc + it.totalPrice, 0);

  const modalTitle = isReservationPending
    ? 'إصدار وتصدير إيصال الحجز المعتمد (Reservation Receipt)'
    : isReservationDelivered
    ? 'طباعة وتصدير فاتورة تسليم الحجز (Delivered Reservation Invoice)'
    : 'طباعة وتصدير الفاتورة الرسمية (Professional Invoice & PDF)';

  const modalSubtitle = isReservationPending
    ? 'إيصال حجز وتأكيد طلب رسمي موثق بموعد التسليم المطلوب والمبلغ المدفوع'
    : isReservationDelivered
    ? 'فاتورة تسليم معتمدة توثق تاريخ الحجز وتاريخ التسليم الفعلي وكافة تفاصيل السداد'
    : 'فاتورة قياسية مهيأة بدقة Vector للطابعات الحرارية (80mm/58mm) ومقاس A4';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-right">
        {/* Paper Format Selector & Print Actions */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-500">مقاس الطباعة:</span>
            <button
              type="button"
              onClick={() => setPaperFormat('thermal_80mm')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                paperFormat === 'thermal_80mm'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-transparent text-zinc-400 hover:text-white'
              }`}
            >
              🧾 طابعة إيصالات حرارية (Thermal 80mm)
            </button>
            <button
              type="button"
              onClick={() => setPaperFormat('a4')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                paperFormat === 'a4'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-transparent text-zinc-400 hover:text-white'
              }`}
            >
              📄 ورق عادي قياسي (Standard A4)
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              icon={isCapturing ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <ImageIcon className="w-4 h-4 text-amber-500" />}
              onClick={handleCopyImage}
              disabled={isCapturing}
              className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/30 font-black shadow-xs"
            >
              {isCapturing ? 'جاري المعالجة...' : 'نسخ الفاتورة كـ صورة 🖼️'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4 text-zinc-400" />}
              onClick={handleDownloadImage}
              title="تنزيل ملف صورة PNG عالي الجودة"
            >
              تنزيل PNG
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<Send className="w-4 h-4 text-emerald-500" />}
              onClick={handleShareWhatsApp}
              className="hover:text-emerald-500"
              title="مشاركة الفاتورة عبر واتساب"
            >
              واتساب
            </Button>

            <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
              طباعة الفاتورة (Ctrl+P)
            </Button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex justify-center p-4 bg-gray-200/50 dark:bg-black/50 rounded-2xl overflow-x-auto">
          <div
            id="printable-receipt"
            className={`bg-white text-black p-6 shadow-xl rounded-xl border border-gray-200 font-sans text-xs ${
              paperFormat === 'thermal_80mm' ? 'w-[360px]' : 'w-[680px]'
            }`}
            dir="rtl"
          >
            {/* Master Header */}
            <div className="text-center pb-4 border-b-2 border-dashed border-gray-400 space-y-1.5">
              {settings.showLogoOnInvoice !== false && (
                <div className="flex justify-center mb-1">
                  <img
                    src="/jkr-logo.png"
                    alt="JKR TOP UP"
                    className="w-16 h-16 object-contain rounded-xl bg-black shadow-xs"
                  />
                </div>
              )}
              <div className={`inline-block px-4 py-1.5 font-black text-xs rounded-lg mb-1 tracking-wider ${
                isReservationPending ? 'bg-purple-700 text-white shadow-xs' : isReservationDelivered ? 'bg-emerald-700 text-white shadow-xs' : 'bg-black text-white font-mono'
              }`}>
                {isReservationPending ? '📦 إيصال حجز منتج معتمد (Reservation Receipt)' : isReservationDelivered ? '🎉 فاتورة تسليم وإتمام حجز معتمدة' : 'NZM JKR TOP UP'}
              </div>
              <h2 className="text-base font-black tracking-tight text-gray-900">{settings.businessName || 'مركز شحن الألعاب الإلكترونية'}</h2>
              {settings.showPhoneOnInvoice && (
                <p className="text-xs text-gray-600 font-mono font-bold">{settings.businessPhone || 'هاتف: 01012345678'}</p>
              )}
              <p className="text-[11px] text-gray-500">{settings.businessAddress}</p>
            </div>

            {/* Document Meta Details */}
            <div className="py-3 border-b border-dashed border-gray-300 space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500 font-sans">{isReservationPending ? 'رقم تذكرة الحجز:' : 'رقم الفاتورة:'}</span>
                <strong className="text-sm font-black text-black">{ticket.ticketNumber}</strong>
              </div>

              {isReservationPending ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-sans">تاريخ تسجيل الحجز:</span>
                    <span>{formatDateTime(ticket.createdAt)}</span>
                  </div>
                  {/* Highlighted Scheduled Delivery Box */}
                  <div className="p-2 bg-purple-50 border border-purple-200 rounded text-purple-900 font-bold my-1.5 flex justify-between items-center font-sans">
                    <span>📅 الميعاد المطلوب للتسليم:</span>
                    <span className="font-mono text-sm text-purple-800 font-black">
                      {ticket.scheduledDeliveryDate || 'غير محدد'} {ticket.scheduledDeliveryTime ? `(الساعة ${ticket.scheduledDeliveryTime})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-sans">حالة الحجز:</span>
                    <span className="font-bold text-purple-700 font-sans">📦 قيد الحجز والتجهيز للتسليم</span>
                  </div>
                </>
              ) : isReservationDelivered ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-sans">تاريخ تسجيل الحجز:</span>
                    <span>{formatDateTime(ticket.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-sans">تاريخ ووقت التسليم الفعلي:</span>
                    <span className="font-bold text-emerald-700">{deliveryDateText}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-sans">المدة المستغرقة حتى التسليم:</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded font-bold text-[11px]">
                      {getDurationText()}
                    </span>
                  </div>
                  {ticket.scheduledDeliveryDate && (
                    <div className="flex justify-between text-gray-500 text-[11px]">
                      <span className="font-sans">الموعد الذي كان مجدولاً:</span>
                      <span>{ticket.scheduledDeliveryDate} {ticket.scheduledDeliveryTime || ''}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-sans">تاريخ بدء المعاملة:</span>
                    <span>{formatDateTime(ticket.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-sans">تاريخ ووقت التسليم:</span>
                    <span className="font-bold text-gray-900">{deliveryDateText}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-sans">سرعة الإنجاز والتسليم:</span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded font-bold text-[11px]">
                      {getDurationText()}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <span className="text-gray-500 font-sans">اسم العميل:</span>
                <span className="font-bold text-gray-900">{ticket.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-sans">رقم الهاتف:</span>
                <span>{ticket.customerPhone}</span>
              </div>
              {ticket.senderPhoneNumber && (
                <div className="flex justify-between text-gray-600">
                  <span className="font-sans">رقم المحول منه:</span>
                  <span className="font-mono">{ticket.senderPhoneNumber}</span>
                </div>
              )}
              {ticket.transferReferenceNumber && (
                <div className="flex justify-between font-bold text-gray-900 bg-gray-100 p-1 rounded">
                  <span className="text-gray-600 font-sans">رقم التحويل / المرجع:</span>
                  <span>{ticket.transferReferenceNumber}</span>
                </div>
              )}
              {ticket.paymentGateway && (
                <div className="flex justify-between text-gray-600">
                  <span className="font-sans">وسيلة الدفع:</span>
                  <span>{ticket.paymentGateway} ({ticket.paymentWallet})</span>
                </div>
              )}
              {isReservationPending && ticket.reservationNotes && (
                <div className="p-1.5 bg-gray-100 rounded text-gray-700 font-sans text-[11px]">
                  <strong>ملاحظات الحجز:</strong> {ticket.reservationNotes}
                </div>
              )}
            </div>

            {/* Products Table */}
            <div className="py-3 border-b-2 border-dashed border-gray-400">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-gray-300 font-bold text-gray-600">
                    <th className="pb-1.5">{isReservationPending ? 'المنتج المطلوب حجزه' : 'الباقة / اللعبة'}</th>
                    <th className="pb-1.5">الـ ID</th>
                    <th className="pb-1.5 text-center font-mono">سعر الوحدة</th>
                    <th className="pb-1.5 text-center font-mono">الكمية</th>
                    <th className="pb-1.5 text-left font-mono">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((it, idx) => (
                    <tr key={idx} className="py-1">
                      <td className="py-2 font-bold">
                        <div>{it.productName}</div>
                        <div className="text-[11px] text-gray-600 font-normal">{it.gameName} {it.sectionName ? `• ${it.sectionName}` : ''}</div>
                      </td>
                      <td className="py-2 font-mono text-[11px] font-bold text-gray-800">{it.playerGameId || '—'}</td>
                      <td className="py-2 text-center font-mono">{it.unitPrice || (it.totalPrice / (it.quantity || 1))} ج</td>
                      <td className="py-2 text-center font-mono font-bold">{it.quantity}</td>
                      <td className="py-2 text-left font-mono font-bold text-gray-900">{it.totalPrice} ج</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Deductions */}
            <div className="py-3 border-b border-dashed border-gray-300 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-gray-600">
                <span className="font-sans">{isReservationPending ? 'إجمالي قيمة المنتج المطلوب:' : 'إجمالي المنتجات:'}</span>
                <span className="font-bold">{totalProductsCalculated} ج.م</span>
              </div>

              {ticket.couponDiscountAmount && ticket.couponDiscountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span className="font-sans">خصم الكوبون ({ticket.couponCode}):</span>
                  <span>-{ticket.couponDiscountAmount} ج</span>
                </div>
              )}

              {/* Used Wallets with Remaining Balances */}
              {ticket.accountBalanceUsed && ticket.accountBalanceUsed > 0 ? (
                <div className="flex justify-between text-blue-700 bg-blue-50/70 p-1 rounded">
                  <span className="font-sans">خصم من رصيد العميل (المحفظة الأساسية):</span>
                  <span>-{ticket.accountBalanceUsed} ج (المتبقي: {primaryBalance > 0 ? `+${primaryBalance}` : primaryBalance} ج)</span>
                </div>
              ) : null}

              {ticket.cashbackUsed && ticket.cashbackUsed > 0 ? (
                <div className="flex justify-between text-emerald-700 bg-emerald-50/70 p-1 rounded">
                  <span className="font-sans">خصم من محفظة الكاش باك:</span>
                  <span>-{ticket.cashbackUsed} ج (المتبقي: {cashbackBalance} ج)</span>
                </div>
              ) : null}

              {ticket.referralBalanceUsed && ticket.referralBalanceUsed > 0 ? (
                <div className="flex justify-between text-purple-700 bg-purple-50/70 p-1 rounded">
                  <span className="font-sans">خصم من محفظة الإحالة:</span>
                  <span>-{ticket.referralBalanceUsed} ج (المتبقي: {referralBalance} ج)</span>
                </div>
              ) : null}

              <div className="flex justify-between text-xs text-gray-500 font-sans pt-1 border-t border-gray-200">
                <span>المبلغ المطلوب:</span>
                <span className="font-bold text-gray-900 font-mono">{ticket.requiredAmount} ج.م</span>
              </div>

              <div className="flex justify-between text-sm font-black text-black">
                <span className="font-sans">{isReservationPending ? 'المبلغ المدفوع (مقدم الحجز المسدد):' : 'المبلغ المدفوع (المستلم):'}</span>
                <span className="text-base text-emerald-700">{ticket.receivedAmount || ticket.requiredAmount} ج.م</span>
              </div>

              {/* Reservation Remaining Due on Delivery */}
              {isReservationPending && (ticket.requiredAmount > (ticket.receivedAmount || ticket.requiredAmount)) && (
                <div className="flex justify-between text-amber-700 font-bold bg-amber-50 p-1 rounded">
                  <span className="font-sans">⏳ المتبقي سداده عند التسليم:</span>
                  <span className="font-mono">{ticket.requiredAmount - (ticket.receivedAmount || ticket.requiredAmount)} ج.م</span>
                </div>
              )}

              {/* Trust security note for reservation */}
              {isReservationPending && (
                <div className="p-1.5 bg-blue-50 border border-blue-200 rounded text-blue-800 text-[11px] font-sans">
                  🔒 <strong>تأمين الحجز:</strong> تم تأمين المبلغ في محفظة الأمانات لحين إتمام التسليم بنجاح.
                </div>
              )}

              {/* Deficit / Surplus Settlement Details */}
              {ticket.shortageAmount && ticket.shortageAmount > 0 ? (
                <div className="p-1.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs font-sans space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>⚠️ عجز في السداد (متبقي):</span>
                    <span className="font-mono">-{ticket.shortageAmount} ج</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-rose-600">
                    <span>رصيد محفظتك الأساسية أصبح:</span>
                    <span className="font-mono font-bold">{primaryBalance} ج (مدين)</span>
                  </div>
                </div>
              ) : null}

              {ticket.overpaymentAmount && ticket.overpaymentAmount > 0 ? (
                <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs font-sans space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>✨ زيادة في الدفع (فائض مضاف للمحفظة):</span>
                    <span className="font-mono">+{ticket.overpaymentAmount} ج</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-700">
                    <span>رصيد محفظتك الأساسية أصبح:</span>
                    <span className="font-mono font-bold">+{primaryBalance} ج (دائن)</span>
                  </div>
                </div>
              ) : null}

              {/* Customer Wallets Status Box (محدث بالمعاملة) */}
              <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg space-y-1 font-sans">
                <div className="text-[11px] font-bold text-gray-700 border-b border-gray-200 pb-1 flex justify-between">
                  <span>💼 بيان أرصدة محافظ العميل (وقت هذه المعاملة)</span>
                  <span className="text-[10px] text-gray-500 font-mono">سجل المعاملة</span>
                </div>

                {/* Primary Wallet - Always shown to reflect true status */}
                <div className={`flex justify-between text-xs font-bold pt-0.5 ${primaryBalance < 0 ? 'text-rose-700' : primaryBalance > 0 ? 'text-blue-700' : 'text-gray-600'}`}>
                  <span>رصيد المحفظة الأساسية (حساب العميل):</span>
                  <span className="font-mono">
                    {primaryBalance > 0 ? `+${primaryBalance} ج.م (دائن)` : primaryBalance < 0 ? `${primaryBalance} ج.م (عجز سداد / مدين)` : '0.00 ج.م (متزن)'}
                  </span>
                </div>

                {/* Cashback - Always Shown */}
                <div className="flex justify-between text-emerald-800 font-bold text-xs pt-0.5 border-t border-gray-100">
                  <span>{isReservationPending ? '🎁 كاش باك مستحق عند التسليم:' : '🎁 كاش باك المعاملة (+):'}</span>
                  <span className="font-mono">+{ticket.cashbackEarned || 0} ج.م</span>
                </div>
                <div className="flex justify-between text-gray-700 text-[11px]">
                  <span>{isReservationPending ? 'رصيد الكاش باك المسجل:' : 'رصيد الكاش باك بعد المعاملة:'}</span>
                  <span className="font-mono font-bold text-emerald-700">{cashbackBalance} ج.م</span>
                </div>

                {/* Referral Wallet - Only shown if balance > 0 */}
                {referralBalance > 0 && (
                  <div className="flex justify-between text-purple-700 text-xs font-bold pt-0.5 border-t border-gray-100">
                    <span>رصيد محفظة الإحالة:</span>
                    <span className="font-mono">{referralBalance} ج.م</span>
                  </div>
                )}
              </div>

              {settings.showEmployeeOnInvoice && (
                <div className="flex justify-between text-gray-500 pt-1">
                  <span className="font-sans">الموظف المسؤول:</span>
                  <span>{ticket.assignedTo || 'مسؤول الشحن'}</span>
                </div>
              )}

              {ticket.notes && !isReservationPending && (
                <div className="pt-1.5 border-t border-gray-200 text-[11px] text-gray-600 font-sans">
                  <strong>ملاحظات:</strong> {ticket.notes}
                </div>
              )}
            </div>

            {/* Lifetime Guarantee Banner */}
            <div className="my-3 p-2 bg-gradient-to-r from-emerald-50 via-amber-50 to-emerald-50 border-2 border-emerald-600 rounded-lg text-center shadow-xs">
              <div className="text-xs font-black text-emerald-900 tracking-wide flex items-center justify-center gap-1.5">
                <span>🛡️</span>
                <span className="text-sm font-black">ضمان مدى الحياة على منتجاتنا</span>
                <span>🛡️</span>
              </div>
            </div>

            {/* Footer & QR info */}
            <div className="text-center pt-2 space-y-1.5">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-gray-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>شحنة معتمدة ومضمونة 100%</span>
              </div>
              <p className="text-[10px] text-gray-600 leading-relaxed">{settings.invoiceFooterNote}</p>
              <div className="font-mono text-[9px] text-gray-400 tracking-widest pt-1 border-t border-gray-200">
                *** NZM JKR TOP UP ERP — SECURE RECEIPT ***
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
