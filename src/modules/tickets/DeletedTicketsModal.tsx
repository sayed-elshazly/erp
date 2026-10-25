import React, { useState, useEffect } from 'react';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Trash2,
  RotateCcw,
  Search,
  AlertTriangle,
  CheckCircle,
  X,
  Clock,
  User,
  Package,
  Wallet,
  Coins,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface DeletedTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketRestored?: () => void;
}

export const DeletedTicketsModal: React.FC<DeletedTicketsModalProps> = ({
  isOpen,
  onClose,
  onTicketRestored
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [deletedTickets, setDeletedTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadDeletedTickets = () => {
    try {
      const list = db.getDeletedTickets();
      setDeletedTickets(list);
    } catch (e) {
      console.error('Error loading deleted tickets:', e);
      setDeletedTickets([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDeletedTickets();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTickets = deletedTickets.filter(t => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q)) ||
      (t.customerName && t.customerName.toLowerCase().includes(q)) ||
      (t.customerPhone && t.customerPhone.includes(q)) ||
      (t.gameName && t.gameName.toLowerCase().includes(q)) ||
      (t.gameProductName && t.gameProductName.toLowerCase().includes(q))
    );
  });

  const handleRestore = (ticketId: string, ticketNumber: string) => {
    if (window.confirm(`هل أنت متأكد من استعادة التذكرة #${ticketNumber}؟\nسيتم إعادة سحب المخزون بنظام FIFO، وإعادة إيداع التحصيل في محفظة الاستلام، وترحيل الأرباح والكاش باك للقواعد والمحافظ.`)) {
      setRestoringId(ticketId);
      try {
        const result = db.restoreTicket(ticketId, user);
        if (result.success) {
          showToast('success', 'تمت استعادة التذكرة بنجاح', result.message);
          loadDeletedTickets();
          if (onTicketRestored) onTicketRestored();
        } else {
          showToast('error', 'فشل في الاستعادة', result.message);
        }
      } catch (err: any) {
        showToast('error', 'خطأ أثناء الاستعادة', err?.message || 'حدث خطأ غير متوقع');
      } finally {
        setRestoringId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-right">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#27272A] flex items-center justify-between bg-[#1F1F23]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                سلة التذاكر المحذوفة وأرشيف الاسترداد
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono">
                  {deletedTickets.length} تذكرة
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                سجل تدقيق كامل لكافة التذاكر المحذوفة مع إمكانية استعادتها وإعادة ربطها بالمحافظ وقواعد البيانات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#27272A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Audit Note */}
        <div className="p-4 border-b border-[#27272A] space-y-3 bg-[#141416]">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث برقم التذكرة (JKR-2026-...)، اسم العميل، الهاتف، أو اللعبة..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-red-500/50"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-400" />
            <span>
              نظام الأمان المالي: عند حذف أي تذكرة يتم عكس كافة العمليات (مخزون البضاعة FIFO، وارد الخزينة، الأرباح، الكاش باك، الإحالة، والأمانات) مع الاحتفاظ بنسخة للتدقيق والاستعادة في أي وقت.
            </span>
          </div>
        </div>

        {/* Tickets List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-[#27272A]/50">
          {filteredTickets.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-500" />
              <p className="text-sm font-medium">لا توجد تذاكر محذوفة تطابق البحث</p>
              <p className="text-xs text-gray-500 mt-1">السلة نظيفة ولم يتم حذف تذاكر أو لا توجد نتائج مطابقة</p>
            </div>
          ) : (
            filteredTickets.map(t => (
              <div
                key={t.id}
                className="pt-3 first:pt-0 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1F1F23]/40 hover:bg-[#1F1F23] p-3.5 rounded-xl border border-[#27272A] transition-colors"
              >
                {/* Right Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white px-2 py-0.5 rounded bg-black/40 border border-gray-700">
                      #{t.ticketNumber}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {t.gameName || 'شحن ألعاب'}
                    </span>
                    {t.gameProductName && (
                      <span className="text-xs text-gray-300">
                        {t.gameProductName}
                      </span>
                    )}
                    {t.department === 'dealers' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        قسم التجار
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1 text-gray-300">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {t.customerName} {t.customerPhone ? `(${t.customerPhone})` : ''}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
                      <Wallet className="w-3.5 h-3.5" />
                      {formatCurrency(t.receivedAmount || t.requiredAmount || 0)}
                    </span>
                    {t.netProfit !== undefined && (
                      <span className="flex items-center gap-1 text-blue-400 font-mono">
                        <Coins className="w-3.5 h-3.5" />
                        ربح: {formatCurrency(t.netProfit)}
                      </span>
                    )}
                  </div>

                  {/* Deletion Audit Details */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 bg-red-950/20 border border-red-900/30 rounded-lg p-2">
                    <span className="flex items-center gap-1 text-red-300 font-medium">
                      <Clock className="w-3 h-3 text-red-400" />
                      حُذفت بتاريخ: {t.deletedAt ? new Date(t.deletedAt).toLocaleString('ar-EG') : 'غير مسجل'}
                    </span>
                    {t.deletedBy && (
                      <span className="text-gray-300">
                        بواسطة: <strong>{t.deletedBy}</strong>
                      </span>
                    )}
                    {t.deletionReason && (
                      <span className="text-gray-400 italic">
                        السبب: {t.deletionReason}
                      </span>
                    )}
                  </div>

                  {/* Badges for reversed operations */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" /> مخزون البضاعة مسترد (FIFO)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" /> مسحوب من الخزينة
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" /> الأرباح والكاش باك معكوسة
                    </span>
                  </div>
                </div>

                {/* Left Action Button */}
                <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0">
                  <button
                    onClick={() => handleRestore(t.id, t.ticketNumber)}
                    disabled={restoringId === t.id}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
                    title="استعادة التذكرة وإعادة ربطها بالمحافظ وقواعد البيانات بنظام FIFO"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${restoringId === t.id ? 'animate-spin' : ''}`} />
                    <span>{restoringId === t.id ? 'جارٍ الاستعادة...' : 'استعادة التذكرة'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272A] bg-[#141416] flex items-center justify-between text-xs text-gray-400">
          <span>يتم الاحتفاظ بآخر 500 تذكرة محذوفة تلقائياً لأغراض التدقيق والمراجعة.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#323238] text-white text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
