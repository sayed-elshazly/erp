// =============================================================
// NZM JKR TOP UP ERP — Middleman & Account Sale Invoice Modal
// =============================================================

import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { MiddlemanDeal, GameAccountAsset } from '../../types/middleman.types';
import { db } from '../../database/db';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { JkrLogo } from '../../components/common/JkrLogo';
import {
  Printer,
  Copy,
  Download,
  Share2,
  Send,
  CheckCircle2,
  ShieldCheck,
  Phone,
  MapPin,
  Calendar,
  Layers,
  MessageCircle,
  FileText,
  Store,
  ImageIcon,
  Loader2
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

import { copyInvoiceToClipboard, downloadInvoiceImage, MiddlemanInvoiceData } from '../../utils/invoiceImageGenerator';

interface MiddlemanInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal?: MiddlemanDeal | null;
  account?: GameAccountAsset | null;
}

export const MiddlemanInvoiceModal: React.FC<MiddlemanInvoiceModalProps> = ({
  isOpen,
  onClose,
  deal,
  account
}) => {
  const { showToast } = useNotifications();
  const settings = db.getMiddlemanModuleSettings();
  const printRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  // Print Format State
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal80' | 'thermal58'>('a4');

  if (!deal && !account) return null;

  const isDeal = Boolean(deal);
  const invoiceNumber = isDeal ? deal!.dealNumber : account!.saleRecord?.invoiceNumber || account!.accountCode;
  const invoiceDate = isDeal ? deal!.completedAt || deal!.createdAt : account!.saleRecord?.soldAt || account!.updatedAt;
  const sellerName = isDeal ? deal!.sellerName : account!.sellerName;
  const sellerPhone = isDeal ? deal!.sellerPhone : account!.sellerPhone;
  const buyerName = isDeal ? deal!.buyerName : account!.saleRecord?.buyerName || 'عميل نقدي';
  const buyerPhone = isDeal ? deal!.buyerPhone : account!.saleRecord?.buyerPhone || '—';
  const title = isDeal ? deal!.title : account!.title;
  const gameName = isDeal ? deal!.gameName || 'ألعاب ووساطة' : account!.gameName;
  const totalAmount = isDeal ? deal!.dealAmountEGP : account!.saleRecord?.salePriceEGP || account!.purchaseCostEGP;
  const commissionAmount = isDeal ? deal!.companyCommissionAmountEGP : 0;
  const netPaidByBuyer = isDeal ? deal!.totalRequiredFromBuyerEGP : totalAmount;

  const invoiceData: MiddlemanInvoiceData = {
    invoiceNumber,
    invoiceDate,
    title,
    gameName,
    sellerName,
    sellerPhone,
    buyerName,
    buyerPhone,
    dealAmount: isDeal ? deal!.dealAmount : totalAmount,
    dealCurrency: isDeal ? deal!.currency : 'EGP',
    dealAmountEGP: totalAmount,
    commissionAmountEGP: commissionAmount,
    netPaidByBuyerEGP: netPaidByBuyer,
    hasExternalMiddleman: isDeal ? deal!.hasExternalMiddleman : false,
    externalMiddlemanName: isDeal ? deal!.externalMiddlemanName : undefined,
    externalMiddlemanCommissionEGP: isDeal ? deal!.externalMiddlemanCommissionAmountEGP : undefined,
    businessName: settings.businessName,
    businessPhone: settings.businessPhone,
    businessAddress: settings.businessAddress,
    isDeal
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Copy Invoice As Image (PNG) to Clipboard
  const handleCopyImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      showToast('info', 'جاري التقاط صورة الفاتورة...', 'يتم معالجة الفاتورة بدقة فائقة');
      const res = await copyInvoiceToClipboard(invoiceData);

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
      console.error('Error copying invoice image:', error);
      showToast('error', 'حدث خطأ', error?.message || 'تعذر التقاط صورة الفاتورة');
    } finally {
      setIsCapturing(false);
    }
  };

  // Download Invoice as PNG Image File
  const handleDownloadImage = () => {
    try {
      downloadInvoiceImage(invoiceData);
      showToast('success', 'تم تنزيل الصورة 📥', 'تم حفظ صورة الفاتورة بنجاح');
    } catch (error) {
      console.error(error);
      showToast('error', 'حدث خطأ', 'تعذر تنزيل صورة الفاتورة');
    }
  };

  // Direct WhatsApp Share
  const handleShareWhatsApp = () => {
    const phoneToUse = buyerPhone.replace(/[^0-9]/g, '');
    const cleanPhone = phoneToUse.startsWith('0') ? '2' + phoneToUse : phoneToUse;
    const msg = encodeURIComponent(
      isDeal
        ? `🛡️ تحية طيبة من *NZM JKR للوساطة والضمان*\n\nتم تأكيد وإصدار فاتورة الوساطة رقم: *${deal!.dealNumber}*\n📌 تفاصيل العملية: ${deal!.title}\n💰 القيمة: ${deal!.dealAmount} ${deal!.currency}\n👤 البائع: ${deal!.sellerName}\n👤 المشتري: ${deal!.buyerName}\n\nنضمن لكم حقوقكم المالية والتقنية بنسبة 100% ★`
        : `🎉 تحية طيبة من *NZM JKR*\n\nتم تأكيد وإصدار فاتورة شراء الحساب رقم: *${invoiceNumber}*\n🎮 اللعبة: ${account!.gameName}\n📌 تفاصيل: ${account!.title}\n💰 السعر: ${formatCurrency(totalAmount)}\n\nمبروك الحساب الجديد ونتمنى لك تجربة لعب ممتعة! ★`
    );

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  // Direct Telegram Share
  const handleShareTelegram = () => {
    const msg = encodeURIComponent(
      isDeal
        ? `🛡️ وساطة رقم #${deal!.dealNumber}\n📌 ${deal!.title}\n💰 القيمة: ${deal!.dealAmount} ${deal!.currency}\nالبائع: ${deal!.sellerName} | المشتري: ${deal!.buyerName}`
        : `🎉 فاتورة حساب #${invoiceNumber}\n🎮 ${account!.gameName} - ${account!.title}\n💰 السعر: ${formatCurrency(totalAmount)}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${msg}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDeal ? `فاتورة وإيصال وساطة #${invoiceNumber}` : `فاتورة بيع حساب #${invoiceNumber}`}
      maxWidth="md"
    >
      <div className="space-y-4 text-right text-xs" dir="rtl">
        {/* Actions & Format Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#27272A] flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Print Button */}
            <Button
              variant="primary"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
            >
              طباعة الفاتورة
            </Button>

            {/* Print Format Selector */}
            <div className="flex items-center bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2 py-1 rounded-lg transition-all ${printFormat === 'a4' ? 'bg-white dark:bg-zinc-700 text-amber-500 shadow-xs' : 'text-zinc-500'}`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal80')}
                className={`px-2 py-1 rounded-lg transition-all ${printFormat === 'thermal80' ? 'bg-white dark:bg-zinc-700 text-amber-500 shadow-xs' : 'text-zinc-500'}`}
              >
                حراري 80mm
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal58')}
                className={`px-2 py-1 rounded-lg transition-all ${printFormat === 'thermal58' ? 'bg-white dark:bg-zinc-700 text-amber-500 shadow-xs' : 'text-zinc-500'}`}
              >
                حراري 58mm
              </button>
            </div>

            {/* Copy Invoice as Image Button */}
            <Button
              variant="secondary"
              size="sm"
              icon={isCapturing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> : <ImageIcon className="w-3.5 h-3.5 text-amber-500" />}
              onClick={handleCopyImage}
              disabled={isCapturing}
              className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/30 font-black"
            >
              {isCapturing ? 'جاري التقاط الصورة...' : 'نسخ الفاتورة كـ صورة 🖼️'}
            </Button>

            {/* Download as PNG Image */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isCapturing}
              className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-orange-500 transition-all cursor-pointer"
              title="تنزيل الفاتورة كملف صورة PNG"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" /> واتساب
            </button>
            <button
              type="button"
              onClick={handleShareTelegram}
              className="px-2.5 py-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> تيليجرام
            </button>
          </div>
        </div>

        {/* Printable & Capture Invoice Container */}
        <div
          ref={printRef}
          className={`p-6 rounded-2xl bg-white text-zinc-900 border border-gray-200 shadow-sm space-y-4 font-sans mx-auto transition-all ${
            printFormat === 'thermal58'
              ? 'max-w-[280px] p-3 text-[10px]'
              : printFormat === 'thermal80'
              ? 'max-w-[380px] p-4 text-[11px]'
              : 'w-full'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-3 gap-2">
            <div className="flex items-center gap-3">
              {settings.showLogoOnInvoice !== false && (
                <div className="bg-black px-3 py-1.5 rounded-xl flex items-center justify-center shadow-xs shrink-0 aspect-auto">
                  <JkrLogo size="sm" showSubtitle={false} />
                </div>
              )}
              <div>
                <h2 className="font-black text-sm text-zinc-900 leading-tight">
                  {settings.businessName || 'NZM JKR TOP UP'}
                </h2>
                <p className="text-[10px] text-zinc-500">
                  {settings.businessAddress || 'المنصورة — جمهورية مصر العربية'}
                </p>
                {settings.businessPhone && (
                  <p className="text-[10px] text-zinc-400 font-mono" dir="ltr">
                    {settings.businessPhone}
                  </p>
                )}
              </div>
            </div>

            <div className="text-left font-mono text-[11px] shrink-0">
              <div className="font-black text-amber-600 text-xs">#{invoiceNumber}</div>
              <div className="text-zinc-400 text-[10px]">{formatDateTime(invoiceDate)}</div>
            </div>
          </div>

          {/* Badge */}
          <div className="text-center py-1.5 bg-amber-50 rounded-xl border border-amber-200 font-bold text-amber-800 text-xs flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{isDeal ? 'إيصال وساطة وضمان مالي معتمد' : 'فاتورة بيع ونقل ملكية حساب رسمي'}</span>
          </div>

          {/* Parties Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div>
              <span className="text-[10px] text-zinc-400 font-bold block">طرف أول (البائع):</span>
              <span className="font-bold text-zinc-900 block">{sellerName}</span>
              <span className="text-[10px] text-zinc-500 font-mono">{sellerPhone}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold block">طرف ثانٍ (المشتري):</span>
              <span className="font-bold text-zinc-900 block">{buyerName}</span>
              <span className="text-[10px] text-zinc-500 font-mono">{buyerPhone}</span>
            </div>
          </div>

          {/* Item Description Table */}
          <table className="w-full text-right text-xs border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-zinc-600 font-bold text-[11px]">
                <th className="p-2 border border-gray-200">البند / التفاصيل</th>
                <th className="p-2 border border-gray-200 text-center">اللعبة / التصنيف</th>
                <th className="p-2 border border-gray-200 text-left">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-gray-200 font-bold text-zinc-800">{title}</td>
                <td className="p-2 border border-gray-200 text-center text-zinc-600">{gameName}</td>
                <td className="p-2 border border-gray-200 text-left font-mono font-bold text-zinc-900">
                  {formatCurrency(totalAmount)}
                </td>
              </tr>
              {isDeal && commissionAmount > 0 && (
                <tr className="bg-gray-50/50">
                  <td colSpan={2} className="p-2 border border-gray-200 text-zinc-500">
                    + رسوم خدمة الوساطة والضمان ({deal!.companyCommissionValue}{deal!.companyCommissionType === 'percentage' ? '%' : ' ج'})
                  </td>
                  <td className="p-2 border border-gray-200 text-left font-mono text-zinc-700">
                    +{formatCurrency(commissionAmount)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-amber-50 font-bold text-zinc-900">
                <td colSpan={2} className="p-2 border border-gray-200 text-right">
                  إجمالي المبلغ المسدد من المشتري:
                </td>
                <td className="p-2 border border-gray-200 text-left font-mono text-sm text-amber-700 font-black">
                  {formatCurrency(netPaidByBuyer)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* External Middleman Notice if present */}
          {isDeal && deal!.hasExternalMiddleman && (
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-[10px] text-blue-800 flex items-center justify-between">
              <span>الوسيط الخارجي المشارك: <strong>{deal!.externalMiddlemanName}</strong></span>
              <span className="font-mono">العمولة: {formatCurrency(deal!.externalMiddlemanCommissionAmountEGP || 0)}</span>
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-2 border-t border-gray-200 text-center space-y-1 text-[10px] text-zinc-400">
            <p className="font-bold text-zinc-600">{settings.invoiceFooterNote}</p>
            <p className="flex items-center justify-center gap-3 font-mono">
              <span>هاتف الدعم: {settings.businessPhone}</span>
              <span>•</span>
              <span>نظام الضمان الرسمي V1.0</span>
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
