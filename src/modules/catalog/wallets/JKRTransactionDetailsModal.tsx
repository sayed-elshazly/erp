import React from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { JKRWalletTransaction } from '../../../types/jkrWallet.types';
import { JKRWalletEngine } from '../../../services/financial/jkrWalletEngine';
import { formatCurrency } from '../../../utils/formatters';
import { db } from '../../../database/db';
import {
  FileText,
  Wallet,
  Coins,
  Ticket,
  User,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign
} from 'lucide-react';

interface JKRTransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: JKRWalletTransaction | null;
}

export const JKRTransactionDetailsModal: React.FC<JKRTransactionDetailsModalProps> = ({
  isOpen,
  onClose,
  transaction
}) => {
  if (!transaction) return null;

  // Retrieve lot consumptions if this was a ticket consumption
  const consumptions = transaction.ticketId
    ? JKRWalletEngine.getConsumptionsByTicket(transaction.ticketId)
    : [];

  const isMain = transaction.walletType === 'MAIN';
  const isPoints =
    transaction.walletType === 'SUB' ||
    (Boolean(transaction.gameOrPointType) && transaction.gameOrPointType !== 'USD') ||
    transaction.costPerPoint !== undefined;

  // Resolve real executor: NEVER show 'النظام'
  const resolvedPerformer = (() => {
    const raw = transaction.performedBy?.name;
    if (raw && raw !== 'النظام' && raw !== 'system') {
      return {
        name: raw,
        role: transaction.performedBy?.role === 'admin' ? 'إدارة عليا' : (transaction.performedBy?.role || 'مسؤول')
      };
    }

    // Try finding matched ticket from ticketNumber, referenceId, or notes (e.g. #JKR-2026-2007)
    const targetRef = transaction.ticketNumber ||
      (transaction.referenceType === 'TICKET' ? transaction.referenceId : '') ||
      (transaction.notes?.match(/#?(JKR-\d{4}-\d+|T-\d+)/i)?.[0]?.replace('#', '')) ||
      transaction.ticketId;

    if (targetRef) {
      const allTickets = db.getTickets();
      const matched = allTickets.find(
        t => t.id === targetRef || (t.ticketNumber && t.ticketNumber.toUpperCase() === targetRef.toUpperCase())
      );
      if (matched) {
        const ticketPerformer =
          matched.assignedTo ||
          matched.resolutionDetails?.resolvedBy ||
          matched.problemDetails?.reportedBy ||
          (matched as any).completedBy ||
          (matched as any).agentName ||
          (matched as any).createdBy;
        if (ticketPerformer && ticketPerformer !== 'النظام' && ticketPerformer !== 'system') {
          return {
            name: ticketPerformer,
            role: 'موظف مسؤول'
          };
        }
      }
    }

    return {
      name: 'المدير العام (Owner)',
      role: 'إدارة عليا'
    };
  })();

  const getArabicTypeLabel = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return 'إيداع شحنة نقاط 📥';
      case 'FUNDING':
        return 'إيداع تمويل 💵';
      case 'CONSUMPTION':
        return 'استهلاك شحن تذكرة 🎫';
      case 'RECOVERY':
        return 'استرداد / تعويض رصيد 🔄';
      case 'LOSS':
        return 'خسارة مسجلة (عجز) ⚠️';
      case 'ADJUSTMENT':
        return 'تسوية جرد دفتري ⚖️';
      case 'REVERSAL':
        return 'إلغاء واسترجاع تذكرة ↩️';
      case 'PURCHASE':
        return 'صادر للمحفظة الفرعية 📤';
      case 'WITHDRAWAL':
        return 'سحب رصيد 💸';
      case 'FREEZE':
        return 'تجميد رصيد ❄️';
      case 'UNFREEZE':
        return 'فك تجميد الرصيد 🔓';
      default:
        return type;
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
      case 'FUNDING':
      case 'RECOVERY':
        return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      case 'CONSUMPTION':
      case 'PURCHASE':
      case 'WITHDRAWAL':
      case 'LOSS':
        return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
      case 'REVERSAL':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'FREEZE':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default:
        return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📑 تفاصيل الحركة: #${transaction.transactionNumber || transaction.id.slice(-8)} (${getArabicTypeLabel(transaction.transactionType)})`}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-right text-xs">
        {/* Top Summary Banner */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-zinc-900 dark:text-zinc-100">
                  {transaction.transactionNumber || transaction.id}
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getTypeBadgeStyle(transaction.transactionType)}`}>
                  {getArabicTypeLabel(transaction.transactionType)}
                </span>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 dark:bg-zinc-800 text-zinc-400">
                  {transaction.status || 'COMPLETED'}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono block mt-1">
                تاريخ وتوقيت العملية: {new Date(transaction.createdAt).toLocaleString('ar-EG')}
              </span>
            </div>
          </div>

          <div className="text-left font-mono">
            <span className="text-[10px] text-zinc-400 block">القيمة المالية للحركة:</span>
            <strong className="text-base font-black text-emerald-500 block">
              {formatCurrency(Math.abs(transaction.amountEGP || 0))}
            </strong>
            {transaction.amountUSD ? (
              <span className="text-[10px] text-zinc-400">(${Math.abs(transaction.amountUSD)} USD)</span>
            ) : null}
          </div>
        </div>

        {/* 4 Quick Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#222228]">
            <span className="text-[10px] text-zinc-400 block">المحفظة المستهدفة:</span>
            <strong className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate block mt-0.5">
              {transaction.walletName}
            </strong>
            <span className="text-[10px] text-orange-500 font-bold">
              {isMain ? 'محفظة رئيسية 💵' : `فرعية (${transaction.gameOrPointType || 'نقاط'}) 💎`}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#222228]">
            <span className="text-[10px] text-zinc-400 block">الكمية الداخلة (الوارد):</span>
            <strong className="text-sm font-black text-emerald-500 block mt-0.5">
              {transaction.quantityIn ? `+${Math.abs(transaction.quantityIn).toLocaleString()}` : '-'}
            </strong>
            <span className="text-[10px] text-zinc-400">{isPoints ? 'نقطة' : 'دولار'}</span>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#222228]">
            <span className="text-[10px] text-zinc-400 block">الكمية الخارجة (الصادر):</span>
            <strong className="text-sm font-black text-rose-500 block mt-0.5">
              {transaction.quantityOut ? `-${Math.abs(transaction.quantityOut).toLocaleString()}` : '-'}
            </strong>
            <span className="text-[10px] text-zinc-400">{isPoints ? 'نقطة' : 'دولار'}</span>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#222228]">
            <span className="text-[10px] text-zinc-400 block">الرصيد بعد العملية:</span>
            <strong className="text-sm font-black text-blue-500 block mt-0.5">
              {(transaction.balanceAfter || 0).toLocaleString()}
            </strong>
            <span className="text-[10px] text-zinc-400">{isPoints ? 'نقطة' : 'USD'}</span>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-3">
          <h4 className="font-black text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-orange-500" />
            بيانات التدقيق المالي والمرجعي
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
            {transaction.exchangeRateUsed ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#141417]">
                <span className="text-zinc-500">سعر الدولار المعتمد:</span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {transaction.exchangeRateUsed.toFixed(2)} ج / USD
                </strong>
              </div>
            ) : null}

            {transaction.costPerPoint ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#141417]">
                <span className="text-zinc-500">تكلفة النقطة المحسوبة:</span>
                <strong className="text-orange-500">
                  {transaction.costPerPoint.toFixed(4)} ج / نقطة
                </strong>
              </div>
            ) : null}

            {transaction.ticketNumber || transaction.ticketId ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#141417]">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Ticket className="w-3 h-3 text-purple-400" />
                  رقم التذكرة المرتبطة:
                </span>
                <strong className="text-purple-400">
                  #{transaction.ticketNumber || transaction.ticketId}
                </strong>
              </div>
            ) : null}

            {transaction.productName ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#141417]">
                <span className="text-zinc-500">المنتج المرتبط:</span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {transaction.productName}
                </strong>
              </div>
            ) : null}

            {transaction.lotNumber ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#141417]">
                <span className="text-zinc-500">الـ Lot المستخدم:</span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {transaction.lotNumber}
                </strong>
              </div>
            ) : null}

            {transaction.customerName ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#141417]">
                <span className="text-zinc-500 flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-500" />
                  اسم العميل:
                </span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {transaction.customerName}
                </strong>
              </div>
            ) : null}

            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#141417]">
              <span className="text-zinc-500">منفذ العملية:</span>
              <strong className="text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 font-sans">
                <span>👤 {resolvedPerformer.name}</span>
                <span className="px-1.5 py-0.5 text-[9.5px] rounded-md bg-purple-500/10 text-purple-500 dark:text-purple-300 font-bold font-mono">
                  ({resolvedPerformer.role})
                </span>
              </strong>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#141417]">
              <span className="text-zinc-500">نوع المرجع:</span>
              <strong className="text-zinc-900 dark:text-zinc-100">
                {transaction.referenceType || 'MANUAL'}
              </strong>
            </div>
          </div>

          {/* Notes */}
          {transaction.notes && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-zinc-800 dark:text-zinc-200 shadow-2xs space-y-1.5">
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold block flex items-center gap-1.5 font-sans">
                <span>📝</span> بيان وملاحظات الحركة الرسمية المعتمدة:
              </span>
              <div className="text-xs font-sans leading-relaxed whitespace-pre-wrap bg-white/70 dark:bg-black/30 p-3 rounded-xl border border-amber-500/20 text-zinc-900 dark:text-zinc-100 font-medium">
                {transaction.notes}
              </div>
            </div>
          )}
        </div>

        {/* Consumed Lots Section (For Ticket Consumptions) */}
        {consumptions.length > 0 && (
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] shadow-xs space-y-2">
            <h4 className="font-black text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              تفاصيل شحنات الـ FIFO المستهلكة في هذه التذكرة ({consumptions.length})
            </h4>

            <div className="space-y-1.5 font-mono text-[11px]">
              {consumptions.map((c, i) => (
                <div
                  key={c.id || i}
                  className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#222228] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-purple-500/10 text-purple-400 font-bold text-[10px]">
                      #{i + 1} {c.lotNumber || c.lotId}
                    </span>
                    <span className="text-zinc-400 text-[10px]">
                      {new Date(c.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-orange-500 font-bold">
                      {c.pointsConsumed.toLocaleString()} نقطة
                    </span>
                    <strong className="text-emerald-500">
                      {formatCurrency(c.costEGP)} {c.costUSD ? `($${c.costUSD.toFixed(2)})` : ''}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Trail Disclaimer */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] text-[10px] text-zinc-400 flex items-center justify-between">
          <span>🔒 حركة غير قابلة للحذف أو التعديل المباشر (Immutable Audit Trail)</span>
          <span className="font-mono">ID: {transaction.id}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-gray-100 dark:border-[#27272A]">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};
