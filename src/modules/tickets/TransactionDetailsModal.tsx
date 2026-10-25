import React from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StoreWalletTransaction } from '../../types/topup.types';
import { CustomerTicket } from '../../types/customer.types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { copyToClipboard } from '../../utils/clipboard';
import { useNotifications } from '../../context/NotificationContext';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Sparkles,
  Layers,
  Ticket,
  Phone,
  User,
  FileText,
  Copy,
  Printer,
  ExternalLink,
  CreditCard,
  Coins
} from 'lucide-react';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: StoreWalletTransaction | null;
  linkedTicket?: CustomerTicket | null;
  onOpenTicket?: (ticket: CustomerTicket) => void;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  isOpen,
  onClose,
  transaction,
  linkedTicket,
  onOpenTicket
}) => {
  const { showToast } = useNotifications();

  if (!transaction) return null;

  const isPositive = transaction.type === 'deposit' || transaction.type === 'transfer_in' || transaction.type === 'refund';
  const linePhone = transaction.walletPhoneNumber || transaction.receivingPhoneNumber || transaction.senderPhoneNumber;

  const getTypeConfig = () => {
    switch (transaction.type) {
      case 'deposit':
        return {
          label: 'إيداع نقدي / شحن محفظة',
          badgeVariant: 'success' as const,
          colorClass: 'text-emerald-500',
          bgClass: 'bg-emerald-500/10 border-emerald-500/25',
          icon: <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
        };
      case 'withdrawal':
        return {
          label: 'سحب نقدي / صرف',
          badgeVariant: 'danger' as const,
          colorClass: 'text-rose-500',
          bgClass: 'bg-rose-500/10 border-rose-500/25',
          icon: <ArrowUpRight className="w-5 h-5 text-rose-500" />
        };
      case 'transfer_in':
        return {
          label: 'تحويل وارد من محفظة أخرى',
          badgeVariant: 'info' as const,
          colorClass: 'text-cyan-500',
          bgClass: 'bg-cyan-500/10 border-cyan-500/25',
          icon: <ArrowDownLeft className="w-5 h-5 text-cyan-500" />
        };
      case 'transfer_out':
        return {
          label: 'تحويل صادر إلى محفظة أخرى',
          badgeVariant: 'warning' as const,
          colorClass: 'text-orange-500',
          bgClass: 'bg-orange-500/10 border-orange-500/25',
          icon: <ArrowUpRight className="w-5 h-5 text-orange-500" />
        };
      case 'refund':
        return {
          label: 'استرداد مالي / عكس عملية',
          badgeVariant: 'warning' as const,
          colorClass: 'text-amber-500',
          bgClass: 'bg-amber-500/10 border-amber-500/25',
          icon: <RotateCcw className="w-5 h-5 text-amber-500" />
        };
      case 'cashback':
        return {
          label: 'كاش باك / حافز',
          badgeVariant: 'purple' as const,
          colorClass: 'text-fuchsia-500',
          bgClass: 'bg-fuchsia-500/10 border-fuchsia-500/25',
          icon: <Sparkles className="w-5 h-5 text-fuchsia-500" />
        };
      case 'adjustment':
        return {
          label: 'تسوية رصيد / جرد',
          badgeVariant: 'info' as const,
          colorClass: 'text-blue-500',
          bgClass: 'bg-blue-500/10 border-blue-500/25',
          icon: <Layers className="w-5 h-5 text-blue-500" />
        };
      case 'purchase':
      default:
        return {
          label: 'سداد / شحن تذكرة',
          badgeVariant: 'purple' as const,
          colorClass: 'text-purple-500',
          bgClass: 'bg-purple-500/10 border-purple-500/25',
          icon: <Ticket className="w-5 h-5 text-purple-500" />
        };
    }
  };

  const typeConfig = getTypeConfig();

  const handleCopySummary = () => {
    const summary = `📌 تفاصيل الحركة المالية:
- النوع: ${typeConfig.label}
- المعرف: ${transaction.id}
- المبلغ: ${isPositive ? '+' : '-'}${transaction.amount.toLocaleString()} ${transaction.currency}
- المحفظة: ${transaction.walletName}
${linePhone ? `- الرقم/الخط: ${linePhone}\n` : ''}- الرصيد قبل: ${transaction.balanceBefore?.toLocaleString() || 0} ${transaction.currency}
- الرصيد بعد: ${transaction.balanceAfter?.toLocaleString() || 0} ${transaction.currency}
- البيان: ${transaction.description || '—'}
${transaction.sourceTicketNumber ? `- رقم التذكرة: ${transaction.sourceTicketNumber}\n` : ''}- المنفذ: ${transaction.performedBy?.name || 'النظام'}
- التاريخ: ${formatDateTime(transaction.createdAt)}`;

    copyToClipboard(summary);
    showToast('success', 'تم النسخ', 'تم نسخ ملخص الحركة بنجاح 📋');
  };

  const handlePrintVoucher = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('error', 'خطأ في الطباعة', 'تعذر فتح نافذة الطباعة');
      return;
    }

    const title = transaction.type === 'withdrawal'
      ? 'سند صرف نقدي'
      : transaction.type === 'deposit'
      ? 'سند قبض / إيداع'
      : 'إشعار حركة مالية';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>${title} - ${transaction.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Cairo', sans-serif;
              padding: 24px;
              color: #111;
              background: #fff;
              line-height: 1.5;
            }
            .voucher-box {
              max-width: 600px;
              margin: 0 auto;
              border: 2px solid #222;
              border-radius: 12px;
              padding: 24px;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #999;
              padding-bottom: 16px;
              margin-bottom: 16px;
            }
            .header h1 {
              margin: 0 0 6px 0;
              font-size: 20px;
              font-weight: 800;
            }
            .header p {
              margin: 0;
              font-size: 12px;
              color: #555;
            }
            .amount-box {
              background: #f4f4f5;
              border: 1px solid #ddd;
              border-radius: 8px;
              text-align: center;
              padding: 14px;
              margin-bottom: 20px;
            }
            .amount-box .val {
              font-size: 26px;
              font-weight: 800;
              color: #000;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
              margin-bottom: 20px;
            }
            .details-table td {
              padding: 8px 10px;
              border-bottom: 1px solid #eee;
            }
            .details-table td.label {
              font-weight: 700;
              color: #555;
              width: 35%;
            }
            .details-table td.value {
              font-weight: 600;
              color: #111;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 36px;
              padding-top: 20px;
              border-top: 1px solid #ccc;
              font-size: 12px;
              font-weight: 700;
            }
            .sig-block {
              text-align: center;
              width: 45%;
            }
            .sig-line {
              margin-top: 40px;
              border-top: 1px dashed #666;
            }
            @media print {
              body { padding: 0; }
              .voucher-box { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="voucher-box">
            <div class="header">
              <h1>${title}</h1>
              <p>رقم السند: <strong>${transaction.referenceNumber || transaction.id}</strong></p>
              <p>التاريخ والوقت: ${formatDateTime(transaction.createdAt)}</p>
            </div>

            <div class="amount-box">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">المبلغ المسجل</div>
              <div class="val">${isPositive ? '+' : '-'}${transaction.amount.toLocaleString()} ${transaction.currency}</div>
            </div>

            <table class="details-table">
              <tr>
                <td class="label">نوع المعاملة</td>
                <td class="value">${typeConfig.label}</td>
              </tr>
              <tr>
                <td class="label">المحفظة المستهدفة</td>
                <td class="value">${transaction.walletName}</td>
              </tr>
              ${linePhone ? `
              <tr>
                <td class="label">رقم الهاتف / الخط</td>
                <td class="value" dir="ltr" style="text-align: right;">${linePhone}</td>
              </tr>` : ''}
              <tr>
                <td class="label">الرصيد قبل الحركة</td>
                <td class="value">${(transaction.balanceBefore ?? 0).toLocaleString()} ${transaction.currency}</td>
              </tr>
              <tr>
                <td class="label">الرصيد بعد الحركة</td>
                <td class="value">${(transaction.balanceAfter ?? 0).toLocaleString()} ${transaction.currency}</td>
              </tr>
              ${transaction.sourceTicketNumber ? `
              <tr>
                <td class="label">رقم تذكرة الشحن</td>
                <td class="value" style="font-weight: 800; color: #c2410c;">${transaction.sourceTicketNumber}</td>
              </tr>` : ''}
              ${transaction.customerName ? `
              <tr>
                <td class="label">العميل / الطرف الآخر</td>
                <td class="value">${transaction.customerName}</td>
              </tr>` : ''}
              <tr>
                <td class="label">البيان والوصف</td>
                <td class="value">${transaction.description || '—'}</td>
              </tr>
              ${transaction.notes ? `
              <tr>
                <td class="label">ملاحظات إضافية</td>
                <td class="value">${transaction.notes}</td>
              </tr>` : ''}
              <tr>
                <td class="label">الموظف المنفذ</td>
                <td class="value">${transaction.performedBy?.name || 'النظام'}</td>
              </tr>
            </table>

            <div class="signatures">
              <div class="sig-block">
                <div>توقيع المحاسب / المنفذ</div>
                <div class="sig-line"></div>
              </div>
              <div class="sig-block">
                <div>توقيع المستلم / الاعتماد</div>
                <div class="sig-line"></div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
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
      title="تفاصيل المعاملة المالية والحركة"
      subtitle={`سجل حركة رقم #${transaction.id}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* ========================================================= */}
        {/* HERO AMOUNT & TYPE BANNER                                 */}
        {/* ========================================================= */}
        <div className={`p-4 rounded-2xl border ${typeConfig.bgClass} flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-black/40 flex items-center justify-center shadow-xs">
              {typeConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <Badge variant={typeConfig.badgeVariant} size="sm">
                  {typeConfig.label}
                </Badge>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {formatDateTime(transaction.createdAt)}
                </span>
              </div>
              <h2 className={`text-2xl font-black font-mono mt-1 ${typeConfig.colorClass}`}>
                {isPositive ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrintVoucher}
            >
              طباعة إيصال
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Copy className="w-3.5 h-3.5" />}
              onClick={handleCopySummary}
            >
              نسخ
            </Button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BALANCE PROGRESSION FLOW (قبل / الحركة / بعد)             */}
        {/* ========================================================= */}
        <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900/70 border border-gray-200 dark:border-zinc-800">
          <div className="space-y-1">
            <span className="text-[11px] text-zinc-500 font-bold block">الرصيد قبل الحركة</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-300">
              {formatCurrency(transaction.balanceBefore ?? 0, transaction.currency)}
            </span>
          </div>

          <div className="space-y-1 border-x border-gray-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500 font-bold block">الأثر على الرصيد</span>
            <span className={`font-mono text-xs sm:text-sm font-black ${typeConfig.colorClass}`}>
              {isPositive ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-zinc-500 font-bold block">الرصيد بعد الحركة</span>
            <span className="font-mono text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100">
              {formatCurrency(transaction.balanceAfter ?? 0, transaction.currency)}
            </span>
          </div>
        </div>

        {/* Points or USD Info if applicable */}
        {(Boolean(transaction.pointsAmount) || Boolean(transaction.amountUSD) || Boolean(transaction.transferFees)) && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
            <Coins className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="flex flex-wrap items-center gap-4">
              {transaction.pointsAmount !== undefined && (
                <span>النقاط المستهلكة/المودعة: <strong className="font-mono font-bold text-white">{transaction.pointsAmount.toLocaleString()} نقطة</strong></span>
              )}
              {transaction.amountUSD !== undefined && (
                <span>المعادل بالدولار: <strong className="font-mono font-bold text-white">${transaction.amountUSD.toLocaleString()} USD</strong></span>
              )}
              {transaction.transferFees !== undefined && transaction.transferFees > 0 && (
                <span>رسوم التحويل: <strong className="font-mono font-bold text-white">{formatCurrency(transaction.transferFees, transaction.currency)}</strong></span>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* LINKED TICKET CARD (IF AVAILABLE)                         */}
        {/* ========================================================= */}
        {(linkedTicket || transaction.sourceTicketNumber || transaction.referenceNumber) && (
          <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-orange-400">التذكرة المرتبطة بهذه الحركة</span>
              </div>
              {linkedTicket?.status && (
                <Badge variant={linkedTicket.status === 'completed' ? 'success' : linkedTicket.status === 'in_progress' ? 'warning' : 'default'} size="sm">
                  {linkedTicket.status === 'completed' ? 'مكتملة ✅' : linkedTicket.status === 'in_progress' ? 'قيد التنفيذ ⏳' : linkedTicket.status}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-black/30 p-2.5 rounded-xl border border-orange-500/20 text-xs">
              <div>
                <strong className="text-orange-500 font-mono text-sm block">
                  #{linkedTicket?.ticketNumber || transaction.sourceTicketNumber || transaction.referenceNumber}
                </strong>
                {linkedTicket && (
                  <span className="text-zinc-300 font-bold block mt-0.5">
                    👤 {linkedTicket.customerName} ({linkedTicket.customerPhone})
                  </span>
                )}
                {linkedTicket?.gameName && (
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    🎮 {linkedTicket.gameName} • {linkedTicket.gameProductName}
                  </span>
                )}
              </div>

              {linkedTicket ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                  onClick={() => {
                    if (onOpenTicket) {
                      onOpenTicket(linkedTicket);
                    }
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
                >
                  فتح تذكرة الشحن كاملة 🎫
                </Button>
              ) : (
                <span className="text-xs text-zinc-400 font-mono">
                  رقم مرجعي: {transaction.sourceTicketNumber || transaction.referenceNumber}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* OPERATIONAL & AUDIT DETAILS TABLE                         */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
          {/* 1. المحفظة والخط */}
          <div className="p-3 flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5 font-bold">
              <CreditCard className="w-3.5 h-3.5 text-orange-400" />
              المحفظة والخط المستخدم
            </span>
            <div className="text-left font-mono">
              <strong className="text-zinc-900 dark:text-zinc-100 block">{transaction.walletName}</strong>
              {linePhone && (
                <span className="text-orange-400 font-bold flex items-center gap-1 mt-0.5 justify-end">
                  <Phone className="w-3 h-3" />
                  {linePhone}
                </span>
              )}
            </div>
          </div>

          {/* 2. المنفذ */}
          <div className="p-3 flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5 font-bold">
              <User className="w-3.5 h-3.5 text-blue-400" />
              الموظف المنفذ
            </span>
            <div className="text-left font-sans">
              <strong className="text-zinc-900 dark:text-zinc-100 block">
                {transaction.performedBy?.name || 'النظام'}
              </strong>
              {transaction.performedBy?.role && (
                <span className="text-zinc-500 text-[10px] block">
                  الدور: {transaction.performedBy.role}
                </span>
              )}
            </div>
          </div>

          {/* 3. البيان والوصف */}
          <div className="p-3 space-y-1">
            <span className="text-zinc-400 flex items-center gap-1.5 font-bold">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              البيان والوصف
            </span>
            <p className="text-zinc-800 dark:text-zinc-200 bg-gray-50 dark:bg-zinc-900 p-2 rounded-xl text-xs leading-relaxed border border-gray-200 dark:border-zinc-800">
              {transaction.description || 'لا يوجد بيان مسجل'}
            </p>
          </div>

          {/* 4. ملاحظات إضافية إن وجدت */}
          {transaction.notes && (
            <div className="p-3 space-y-1">
              <span className="text-zinc-400 flex items-center gap-1.5 font-bold">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                ملاحظات إضافية
              </span>
              <p className="text-zinc-800 dark:text-zinc-200 bg-amber-500/5 p-2 rounded-xl text-xs leading-relaxed border border-amber-500/20">
                {transaction.notes}
              </p>
            </div>
          )}

          {/* 5. المعرف والمصدر */}
          <div className="p-3 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>المعرف: {transaction.id}</span>
            {transaction.sourceName && <span>المصدر: {transaction.sourceName}</span>}
          </div>
        </div>

        {/* ========================================================= */}
        {/* FOOTER ACTIONS                                            */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            إغلاق النافذة
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrintVoucher}
            >
              طباعة إيصال
            </Button>
            {linkedTicket && (
              <Button
                variant="primary"
                size="sm"
                icon={<Ticket className="w-3.5 h-3.5" />}
                onClick={() => {
                  if (onOpenTicket) {
                    onOpenTicket(linkedTicket);
                  }
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                عرض التذكرة 🎫
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
