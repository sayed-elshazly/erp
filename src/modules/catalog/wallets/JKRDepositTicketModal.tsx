import React, { useRef } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { JKRWalletTransaction, JKRWalletLot, JKRWallet } from '../../../types/jkrWallet.types';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import {
  FileText,
  Wallet,
  Coins,
  DollarSign,
  Printer,
  Copy,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
  Layers,
  ArrowDownLeft,
  ExternalLink,
  Pencil,
  Trash2
} from 'lucide-react';
import { useNotifications } from '../../../context/NotificationContext';
import { JKRWalletEngine } from '../../../services/financial/jkrWalletEngine';

interface JKRDepositTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: JKRWalletTransaction | null;
  lot?: JKRWalletLot | null;
  wallet?: JKRWallet | null;
  onEdit?: (lot: JKRWalletLot, transaction?: JKRWalletTransaction | null) => void;
  onDelete?: (lot: JKRWalletLot, transaction?: JKRWalletTransaction | null) => void;
}

export const JKRDepositTicketModal: React.FC<JKRDepositTicketModalProps> = ({
  isOpen,
  onClose,
  transaction,
  lot,
  wallet,
  onEdit,
  onDelete
}) => {
  const { showToast } = useNotifications();

  if (!isOpen || (!transaction && !lot)) return null;

  // Resolve Ticket Metadata
  const ticketNumber =
    transaction?.ticketNumber ||
    transaction?.transactionNumber ||
    lot?.lotNumber ||
    (transaction?.lotNumber ? `DEP-${transaction.lotNumber}` : `DEP-${Date.now().toString().slice(-6)}`);

  const createdAt = transaction?.createdAt || lot?.createdAt || new Date().toISOString();
  const walletName = transaction?.walletName || wallet?.name || 'محفظة النقاط والمخزون';
  const pointType = wallet?.pointType || transaction?.gameOrPointType || 'Free Fire';

  const quantity = transaction?.quantityIn || lot?.initialQuantity || 0;

  // Determine if this ticket represents Points (stock) or USD (cash funding)
  const isPoints =
    lot?.currencyOrPoints === 'POINTS' ||
    wallet?.type === 'SUB' ||
    transaction?.walletType === 'SUB' ||
    Boolean(wallet?.pointType) ||
    Boolean(transaction?.gameOrPointType && transaction.gameOrPointType !== 'USD') ||
    transaction?.costPerPoint !== undefined;

  const unitLabel = isPoints ? 'نقطة' : '$';

  const amountUSD = transaction?.amountUSD ?? lot?.totalCostUSD ?? 0;
  const amountEGP = transaction?.amountEGP ?? lot?.totalCostEGP ?? 0;
  const exchangeRate = transaction?.exchangeRateUsed || lot?.exchangeRateUsed || 50;

  const costPerUnitEGP = transaction?.costPerPoint ?? lot?.unitCostEGP ?? (quantity > 0 ? amountEGP / quantity : 0);
  const costPerUnitUSD = lot?.unitCostUSD ?? (quantity > 0 && amountUSD > 0 ? amountUSD / quantity : 0);

  const lotNumber = transaction?.lotNumber || lot?.lotNumber || '—';
  const balanceAfter = transaction?.balanceAfter !== undefined
    ? transaction.balanceAfter
    : (isPoints ? (wallet?.pointsBalance ?? 0) : (wallet?.balanceUSD ?? 0));

  // Performed By (Requirement: Must be Admin, never System)
  const rawPerformer = transaction?.performedBy?.name;
  const performedByName = rawPerformer && rawPerformer !== 'النظام' ? rawPerformer : 'المدير العام (Owner)';

  const notes = transaction?.notes || lot?.notes || 'شراء وإيداع مخزون نقاط رسمي معتمد بدفتر الأستاذ';

  // Resolve Lot if only transaction is provided
  const resolvedLot = lot || (transaction?.lotId ? JKRWalletEngine.getLotById(transaction.lotId) : null) ||
    (transaction?.lotNumber ? JKRWalletEngine.getAllLots().find(l => l.lotNumber === transaction.lotNumber) : null);

  // Copy Ticket Details
  const handleCopy = () => {
    const text = `🎫 تذكرة إيداع مخزون ونقاط: #${ticketNumber}
📅 التاريخ: ${new Date(createdAt).toLocaleString('ar-EG')}
💼 المحفظة: ${walletName} [${pointType}]
📥 الكمية المودعة: ${quantity.toLocaleString()} ${unitLabel}
💵 التكلفة: ${formatCurrency(amountEGP)} ($${amountUSD.toLocaleString()})
💱 سعر الصرف: ${exchangeRate} ج/دولار
📦 دفعة FIFO: ${lotNumber}
👤 المنفذ: ${performedByName}
📝 البيان: ${notes}`;

    navigator.clipboard.writeText(text);
    showToast('success', 'تم النسخ', 'تم نسخ بيانات تذكرة الإيداع بنجاح');
  };

  // Print Ticket Voucher
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>تذكرة إيداع مخزون - ${ticketNumber}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              direction: rtl;
              padding: 24px;
              color: #111;
              line-height: 1.5;
            }
            .ticket-box {
              max-width: 650px;
              margin: 0 auto;
              border: 2px solid #059669;
              border-radius: 16px;
              padding: 24px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px dashed #059669;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 20px;
              font-weight: 900;
              color: #059669;
            }
            .ticket-badge {
              background: #ecfdf5;
              color: #059669;
              padding: 6px 14px;
              border-radius: 8px;
              font-weight: bold;
              font-family: monospace;
              font-size: 16px;
              border: 1px solid #10b981;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 20px;
            }
            .row {
              background: #f9fafb;
              padding: 10px 14px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            .label {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 2px;
            }
            .value {
              font-size: 14px;
              font-weight: bold;
              color: #111827;
            }
            .notes {
              background: #fffbeb;
              border: 1px solid #fde68a;
              padding: 12px;
              border-radius: 8px;
              font-size: 12px;
              margin-bottom: 20px;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              border-top: 1px dashed #d1d5db;
              padding-top: 20px;
              margin-top: 24px;
              text-align: center;
              font-size: 11px;
              color: #6b7280;
            }
            .signature {
              width: 45%;
              border-top: 1px solid #9ca3af;
              padding-top: 6px;
              margin-top: 35px;
              font-weight: bold;
              color: #1f2937;
            }
          </style>
        </head>
        <body>
          <div class="ticket-box">
            <div class="header">
              <div>
                <div class="title">📋 سند وتذكرة إيداع مخزون رسمي</div>
                <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">منظومة إدارة المحافظ والمخزون المالي — JKR ERP</div>
              </div>
              <div class="ticket-badge">#${ticketNumber}</div>
            </div>

            <div class="grid">
              <div class="row">
                <div class="label">المحفظة المودع إليها:</div>
                <div class="value">${walletName} [${pointType}]</div>
              </div>
              <div class="row">
                <div class="label">تاريخ ووقت الإيداع:</div>
                <div class="value">${new Date(createdAt).toLocaleString('ar-EG')}</div>
              </div>
              <div class="row">
                <div class="label">الكمية المودعة:</div>
                <div class="value" style="color: #059669; font-size: 16px;">+${quantity.toLocaleString()} ${unitLabel}</div>
              </div>
              <div class="row">
                <div class="label">إجمالي التكلفة المحسوبة:</div>
                <div class="value">${formatCurrency(amountEGP)} ($${amountUSD.toLocaleString()})</div>
              </div>
              <div class="row">
                <div class="label">سعر صرف الدولار (FIFO):</div>
                <div class="value">${exchangeRate} ج.م / USD</div>
              </div>
              <div class="row">
                <div class="label">${isPoints ? 'تكلفة النقطة الواحدة:' : 'تكلفة الوحدة الواحدة:'}</div>
                <div class="value">${costPerUnitEGP.toFixed(4)} ج ${costPerUnitUSD > 0 ? `($${costPerUnitUSD.toFixed(6)})` : ''}</div>
              </div>
              <div class="row">
                <div class="label">رقم دفعة المخزون (FIFO Lot):</div>
                <div class="value" style="font-family: monospace;">${lotNumber}</div>
              </div>
              <div class="row">
                <div class="label">الرصيد بعد الإيداع:</div>
                <div class="value">${balanceAfter.toLocaleString()} ${unitLabel}</div>
              </div>
              <div class="row" style="grid-column: span 2;">
                <div class="label">الموظف المنفذ المعتمد:</div>
                <div class="value" style="color: #1f2937;">👤 ${performedByName}</div>
              </div>
            </div>

            <div class="notes">
              <strong>📝 بيان وملاحظات التذكرة:</strong><br/>
              ${notes}
            </div>

            <div class="footer">
              <div style="width: 45%;">
                <div>توقيع أمين المخزن / الصندوق</div>
                <div class="signature">${performedByName}</div>
              </div>
              <div style="width: 45%;">
                <div>اعتماد الإدارة العامة</div>
                <div class="signature">✓ معتمد ومقيد بدفتر الأستاذ</div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📑 تفاصيل تذكرة الإيداع: #${ticketNumber}`}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-right text-xs">
        {/* Official Header Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-500 shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 font-mono">
                  #{ticketNumber}
                </h3>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  📥 تذكرة إيداع مخزون معتمدة
                </span>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 dark:bg-zinc-800 text-zinc-400">
                  مكتملة (COMPLETED)
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-1">
                <Calendar className="w-3 h-3 text-zinc-400" />
                <span>تاريخ التذكرة: {new Date(createdAt).toLocaleDateString('ar-EG')} - {new Date(createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          <div className="text-left font-mono">
            <span className="text-[10px] text-zinc-400 block">إجمالي القيمة بالجنيه:</span>
            <strong className="text-lg font-black text-emerald-500 block">
              {formatCurrency(amountEGP)}
            </strong>
            <span className="text-[10.5px] text-blue-500 font-bold block">
              (${amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
          {/* 1. Wallet */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 block font-sans">المحفظة المستلمة:</span>
            <strong className="text-zinc-900 dark:text-zinc-100 font-bold text-xs block truncate" title={walletName}>
              {walletName}
            </strong>
            <span className="text-[9.5px] text-orange-500 font-bold block">
              {pointType}
            </span>
          </div>

          {/* 2. Quantity Deposited */}
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-sans font-bold">الكمية المودعة:</span>
            <strong className="text-emerald-500 font-black text-sm block" dir="rtl">
              +{quantity.toLocaleString()} {unitLabel}
            </strong>
            <span className="text-[9.5px] text-zinc-400 block">
              رصيد وارد للمخزون
            </span>
          </div>

          {/* 3. Cost Per Unit */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 block font-sans">
              {isPoints ? 'تكلفة النقطة / الوحدة:' : 'تكلفة الوحدة / الدولار:'}
            </span>
            <strong className="text-zinc-900 dark:text-zinc-100 font-black text-xs block">
              {costPerUnitEGP.toFixed(4)} ج
            </strong>
            {costPerUnitUSD > 0 && (
              <span className="text-[9.5px] text-zinc-400 block">
                (${costPerUnitUSD.toFixed(6)})
              </span>
            )}
          </div>

          {/* 4. Exchange Rate */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 block font-sans">سعر الدولار المعتمد:</span>
            <strong className="text-zinc-900 dark:text-zinc-100 font-black text-xs block">
              {exchangeRate} ج / USD
            </strong>
            <span className="text-[9.5px] text-zinc-400 block">
              وفق FIFO التمويل
            </span>
          </div>

          {/* 5. Lot Number */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 block font-sans">دفعة الـ FIFO بالمخزون:</span>
            <strong className="text-orange-500 font-black text-xs block">
              {lotNumber}
            </strong>
            <span className="text-[9.5px] text-zinc-400 block">
              دفعة مستقلة مرتبة
            </span>
          </div>

          {/* 6. Balance After */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#27272A] space-y-1">
            <span className="text-[10px] text-zinc-400 block font-sans">الرصيد بعد الإيداع:</span>
            <strong className="text-blue-500 font-black text-xs block" dir="rtl">
              {balanceAfter.toLocaleString()} {unitLabel}
            </strong>
            <span className="text-[9.5px] text-zinc-400 block">
              رصيد تراكمي آمن
            </span>
          </div>

          {/* 7. Executor (Admin Guaranteed) */}
          <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1 col-span-2">
            <span className="text-[10px] text-purple-500 block font-sans font-bold flex items-center gap-1">
              <User className="w-3 h-3" />
              الموظف المنفذ المعتمد:
            </span>
            <strong className="text-zinc-900 dark:text-zinc-100 font-black text-xs block">
              👤 {performedByName}
            </strong>
            <span className="text-[9.5px] text-emerald-500 font-bold block">
              🛡️ معتمد بصلاحية الإدارة العليا (Admin)
            </span>
          </div>
        </div>

        {/* Notes & Description */}
        {notes && (
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300">
            <span className="text-[10px] text-zinc-400 font-bold block mb-1">
              📝 البيان وملاحظات التذكرة:
            </span>
            <p className="text-xs font-sans">{notes}</p>
          </div>
        )}

        {/* Verification & Audit Footer Stamp */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>تذكرة إيداع موثقة ومقيدة في دفتر الأستاذ العام (Ledger Audit) بنظام FIFO</span>
          </div>
          <span className="font-mono text-[10px] text-zinc-400">
            الحالة: معتمد ✓
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5 text-emerald-500" />}
              onClick={handlePrint}
            >
              طباعة سند التذكرة
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Copy className="w-3.5 h-3.5 text-blue-500" />}
              onClick={handleCopy}
            >
              نسخ البيانات
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {resolvedLot && onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                icon={<Pencil className="w-3.5 h-3.5" />}
                onClick={() => {
                  onEdit(resolvedLot, transaction);
                  onClose();
                }}
              >
                تعديل بيانات الإيداع
              </Button>
            )}

            {resolvedLot && onDelete && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  onDelete(resolvedLot, transaction);
                  onClose();
                }}
              >
                حذف الإيداع
              </Button>
            )}

            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
