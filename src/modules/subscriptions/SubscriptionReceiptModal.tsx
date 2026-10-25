// =============================================================
// NZM JKR TOP UP ERP — Subscription Receipt & Invoice Modal
// =============================================================

import React, { useRef, useState } from 'react';
import { CustomerSubscription, SubscriptionPayment, ReceiptTemplateType } from '../../types/subscription.types';
import { db } from '../../database/db';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { JkrLogo } from '../../components/common/JkrLogo';
import {
  Printer,
  Copy,
  Download,
  Send,
  ShieldCheck,
  Phone,
  MessageCircle,
  ImageIcon,
  Loader2,
  Calendar,
  CheckCircle2,
  Tv,
  QrCode,
  Sparkles,
  Layers,
  Award
} from 'lucide-react';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import { copySubscriptionInvoiceToClipboard, downloadSubscriptionInvoiceImage } from '../../utils/invoiceImageGenerator';

interface SubscriptionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: CustomerSubscription;
  payment?: SubscriptionPayment | null;
}

export const SubscriptionReceiptModal: React.FC<SubscriptionReceiptModalProps> = ({
  isOpen,
  onClose,
  subscription,
  payment
}) => {
  const { showToast } = useNotifications();
  const settings = db.getSubscriptionSettings();
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReceiptTemplateType>('compact_card');
  const [isCapturing, setIsCapturing] = useState(false);

  if (!subscription) return null;

  const receiptNumber = payment?.receiptNumber || `SUB-${subscription.subscriptionNumber || subscription.id.slice(-6).toUpperCase()}`;
  const paymentDate = payment?.createdAt || subscription.createdAt;
  const currency = subscription.currency || 'EGP';

  // QR Code payload (Encoded string)
  const qrData = encodeURIComponent(
    JSON.stringify({
      receipt: receiptNumber,
      sub: subscription.subscriptionNumber,
      customer: subscription.customerName,
      amount: subscription.finalPrice,
      currency,
      expires: subscription.endDate.split('T')[0]
    })
  );

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}&color=18181b`;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Copy Receipt Image (PNG) to Clipboard
  const handleCopyImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      showToast('info', 'جاري التقاط الفاتورة كـ صورة...', 'يتم معالجة المستند بجودة عالية');

      const res = await copySubscriptionInvoiceToClipboard(
        subscription as any,
        payment || undefined
      );

      if (res.success) {
        if (res.message === 'downloaded') {
          showToast('success', 'تم تنزيل صورة الفاتورة 📥', 'تم حفظ الصورة على جهازك بنجاح');
        } else {
          showToast(
            'success',
            'تم نسخ الفاتورة كـ صورة بنجاح 🖼️',
            'تم وضع صورة الفاتورة في الحافظة بنجاح! يمكنك الآن عمل Paste (Ctrl+V) في واتساب أو أي برنامج.'
          );
        }
      } else {
        showToast('error', 'فشل تحويل الفاتورة لصورة', res.message || 'يرجى المحاولة مرة أخرى');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'حدث خطأ أثناء نسخ الصورة', err?.message || 'يرجى تجربة زر الطباعة أو التنزيل');
    } finally {
      setIsCapturing(false);
    }
  };

  // Download PNG Image
  const handleDownloadImage = () => {
    try {
      downloadSubscriptionInvoiceImage(subscription as any, payment || undefined);
      showToast('success', 'تم تنزيل الفاتورة كـ صورة PNG 📥', 'تم الحفظ بنجاح');
    } catch (err: any) {
      showToast('error', 'حدث خطأ', 'تعذر تنزيل صورة الإيصال');
    } finally {
      setIsCapturing(false);
    }
  };

  // Direct WhatsApp Share
  const handleShareWhatsApp = () => {
    const phoneToUse = subscription.customerPhone.replace(/[^0-9]/g, '');
    const cleanPhone = phoneToUse.startsWith('0') ? '2' + phoneToUse : phoneToUse;
    const msg = encodeURIComponent(
      `🎉 تحية طيبة من *${settings.companyName || 'NZM JKR'}*\n\nتم إصدار إيصال اشتراكك بنجاح:\n📌 باقة: *${subscription.planName}*\n🔢 رقم الاشتراك: *${subscription.subscriptionNumber}*\n💰 المبلغ المسدد: *${formatCurrency(subscription.finalPrice)} ${currency}*\n📅 تاريخ البدء: ${formatDate(subscription.startDate)}\n⏳ تاريخ الانتهاء: *${formatDate(subscription.endDate)}*\n\nنتمنى لك تجربة ممتعة ومميزة! ★`
    );

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  // Direct Telegram Share
  const handleShareTelegram = () => {
    const msg = encodeURIComponent(
      `🎉 إيصال اشتراك #${subscription.subscriptionNumber}\n📺 ${subscription.planName}\n💰 المبلغ: ${formatCurrency(subscription.finalPrice)} ${currency}\n⏳ حتى: ${formatDate(subscription.endDate)}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${msg}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إيصال وفاتورة اشتراك #${subscription.subscriptionNumber}`}
      maxWidth="md"
    >
      <div className="space-y-4 text-right text-xs" dir="rtl">
        {/* Template Selector & Action Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#27272A] flex-wrap gap-2">
          {/* Template Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedTemplate('thermal_80mm')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                selectedTemplate === 'thermal_80mm'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              حراري 80mm
            </button>
            <button
              type="button"
              onClick={() => setSelectedTemplate('a4')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                selectedTemplate === 'a4'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              رسمي A4
            </button>
            <button
              type="button"
              onClick={() => setSelectedTemplate('compact_card')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                selectedTemplate === 'compact_card'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              كارت مختصر
            </button>
            <button
              type="button"
              onClick={() => setSelectedTemplate('luxury_gold')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                selectedTemplate === 'luxury_gold'
                  ? 'bg-amber-500 text-black shadow-xs font-black'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              فاخر Gold ✨
            </button>
          </div>

          {/* Share & Copy Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="primary"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
            >
              طباعة
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={isCapturing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-500" /> : <ImageIcon className="w-3.5 h-3.5 text-pink-500" />}
              onClick={handleCopyImage}
              disabled={isCapturing}
              className="bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20 border-pink-500/30 font-black"
            >
              {isCapturing ? 'جاري النسخ...' : 'نسخ الفاتورة كـ صورة 🖼️'}
            </Button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isCapturing}
              className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-pink-500 transition-all cursor-pointer"
              title="تنزيل كملف صورة PNG"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-2 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="مشاركة عبر واتساب"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Printable & Capture Receipt Area */}
        <div
          ref={printRef}
          className={`p-6 rounded-2xl border shadow-sm space-y-4 font-sans transition-all ${
            selectedTemplate === 'luxury_gold'
              ? 'bg-zinc-950 text-zinc-100 border-amber-500/40 shadow-amber-500/10'
              : selectedTemplate === 'compact_card'
              ? 'bg-gradient-to-br from-white to-pink-50/40 text-zinc-900 border-pink-200'
              : 'bg-white text-zinc-900 border-gray-200'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between pb-3 border-b ${
            selectedTemplate === 'luxury_gold' ? 'border-amber-500/30' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <JkrLogo className="w-8 h-8" />
              <div>
                <h2 className={`font-black text-sm ${
                  selectedTemplate === 'luxury_gold' ? 'text-amber-400' : 'text-zinc-900'
                }`}>
                  {settings.companyName || 'NZM JKR TOP UP ERP'}
                </h2>
                <p className={`text-[10px] ${
                  selectedTemplate === 'luxury_gold' ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                  {settings.companyAddress || 'المنصورة — جمهورية مصر العربية'}
                </p>
              </div>
            </div>

            <div className="text-left font-mono text-[11px]">
              <div className={`font-bold text-xs ${
                selectedTemplate === 'luxury_gold' ? 'text-amber-400' : 'text-pink-600'
              }`}>
                #{receiptNumber}
              </div>
              <div className="text-zinc-400 text-[10px]">{formatDateTime(paymentDate)}</div>
            </div>
          </div>

          {/* Badge */}
          <div className={`text-center py-1.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 ${
            selectedTemplate === 'luxury_gold'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-pink-50 border-pink-200 text-pink-800'
          }`}>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>إيصال تفعيل اشتراك رقمي معتمد ومضمون 100%</span>
          </div>

          {/* Customer & Subscription Metadata Grid */}
          <div className={`grid grid-cols-2 gap-2 text-xs p-3 rounded-xl border ${
            selectedTemplate === 'luxury_gold'
              ? 'bg-zinc-900/80 border-zinc-800'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold block">العميل المستفيد:</span>
              <span className={`font-bold block ${selectedTemplate === 'luxury_gold' ? 'text-white' : 'text-zinc-900'}`}>
                {subscription.customerName}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">{subscription.customerPhone}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold block">فترة وسريان الاشتراك:</span>
              <span className="font-bold text-emerald-500 block">
                من: {formatDate(subscription.startDate)}
              </span>
              <span className="font-bold text-rose-500 font-mono block">
                إلى: {formatDate(subscription.endDate)}
              </span>
            </div>
          </div>

          {/* Plan Details Table */}
          <table className={`w-full text-right text-xs border-collapse border ${
            selectedTemplate === 'luxury_gold' ? 'border-zinc-800' : 'border-gray-200'
          }`}>
            <thead>
              <tr className={`font-bold text-[11px] ${
                selectedTemplate === 'luxury_gold' ? 'bg-zinc-900 text-amber-400' : 'bg-gray-100 text-zinc-600'
              }`}>
                <th className="p-2 border border-zinc-700/30">الباقة والخدمة</th>
                <th className="p-2 border border-zinc-700/30 text-center">المدة</th>
                <th className="p-2 border border-zinc-700/30 text-left">المبلغ المسدد</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-zinc-700/30 font-bold">
                  {subscription.planName}
                </td>
                <td className="p-2 border border-zinc-700/30 text-center font-mono text-zinc-400">
                  {subscription.durationValue} {subscription.durationUnit === 'months' ? 'شهر' : subscription.durationUnit === 'days' ? 'يوم' : 'سنة'}
                </td>
                <td className="p-2 border border-zinc-700/30 text-left font-mono font-bold">
                  {formatCurrency(subscription.finalPrice)} {currency}
                </td>
              </tr>
              {subscription.discountAmount > 0 && (
                <tr className="opacity-80">
                  <td colSpan={2} className="p-2 border border-zinc-700/30 text-zinc-400">
                    - خصم ترويجي ({subscription.couponCode || 'خصم مباشر'})
                  </td>
                  <td className="p-2 border border-zinc-700/30 text-left font-mono text-emerald-500">
                    -{formatCurrency(subscription.discountAmount)} {currency}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className={`font-bold ${
                selectedTemplate === 'luxury_gold' ? 'bg-amber-500/15 text-amber-300' : 'bg-pink-50 text-zinc-900'
              }`}>
                <td colSpan={2} className="p-2 border border-zinc-700/30 text-right">
                  إجمالي المبلغ المحصّل:
                </td>
                <td className={`p-2 border border-zinc-700/30 text-left font-mono text-sm font-black ${
                  selectedTemplate === 'luxury_gold' ? 'text-amber-400' : 'text-pink-700'
                }`}>
                  {formatCurrency(subscription.finalPrice)} {currency}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Credentials Box */}
          {(subscription.serviceAccountUser || subscription.serviceServerUrl) && (
            <div className={`p-2.5 rounded-xl border text-[11px] space-y-1 font-mono ${
              selectedTemplate === 'luxury_gold'
                ? 'bg-zinc-900 border-zinc-800 text-zinc-200'
                : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}>
              <span className="font-bold block text-[10px] font-sans text-pink-500">بيانات الدخول والتفعيل المسلمة:</span>
              {subscription.serviceAccountUser && (
                <div className="flex justify-between">
                  <span>المستخدم / البريد:</span>
                  <strong className="text-white font-bold">{subscription.serviceAccountUser}</strong>
                </div>
              )}
              {subscription.serviceAccountPassword && (
                <div className="flex justify-between">
                  <span>كلمة المرور / الرمز:</span>
                  <strong className="text-pink-500 font-bold">{subscription.serviceAccountPassword}</strong>
                </div>
              )}
              {subscription.serviceServerUrl && (
                <div className="flex justify-between">
                  <span>رابط السيرفر:</span>
                  <span className="text-zinc-400 text-[10px]">{subscription.serviceServerUrl}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-2 border-t border-gray-200 text-center space-y-1 text-[10px] text-zinc-400">
            <p className="font-bold text-zinc-600">{settings.invoiceFooterNote}</p>
            <p className="flex items-center justify-center gap-3 font-mono">
              <span>هاتف الدعم: {settings.companyPhone || '01012345678'}</span>
              <span>•</span>
              <span>خدمة الاشتراكات الرسمية V1.0</span>
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
