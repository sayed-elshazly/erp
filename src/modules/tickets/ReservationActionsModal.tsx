import React, { useState } from 'react';
import { CustomerTicket } from '../../types/customer.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Phone,
  Gamepad2,
  ExternalLink,
  Edit3,
  CalendarDays,
  UserCheck,
  Printer
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PrintInvoiceModal } from '../../components/common/PrintInvoiceModal';

interface ReservationActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dueTickets?: CustomerTicket[];
  onTicketsUpdated: () => void;
}

export const ReservationActionsModal: React.FC<ReservationActionsModalProps> = ({
  isOpen,
  onClose,
  dueTickets: propDueTickets,
  onTicketsUpdated
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [ticketForInvoice, setTicketForInvoice] = useState<CustomerTicket | null>(null);

  // Always filter to active pending reservations only: exclude delivered, completed, cancelled
  const activeTickets = (propDueTickets ?? db.getTickets()).filter(
    t => (t.isReservation || t.operationMode === 'reservation') &&
         t.status !== 'completed' &&
         t.status !== 'canceled' &&
         t.status !== 'refunded' &&
         t.reservationStatus !== 'delivered' &&
         t.reservationStatus !== 'cancelled'
  );
  const dueTickets = activeTickets;

  const [selectedTicket, setSelectedTicket] = useState<CustomerTicket | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newDeliveryTime, setNewDeliveryTime] = useState('18:00');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // 1. Complete Delivery Action (إنهاء التسليم - متاح التسليم المبكر بضغطة زر)
  const handleCompleteDelivery = (tkt: CustomerTicket) => {
    let confirmPrompt = `هل أنت متأكد من تسليم المنتج المحجوز للعميل "${tkt.customerName}" وإغلاق التذكرة؟`;

    if (tkt.scheduledDeliveryDate) {
      const now = new Date();
      const timePart = tkt.scheduledDeliveryTime || '00:00';
      const scheduledDateTime = new Date(`${tkt.scheduledDeliveryDate}T${timePart}:00`);
      const hasArrived = isNaN(scheduledDateTime.getTime())
        ? (tkt.scheduledDeliveryDate <= now.toISOString().split('T')[0])
        : (now.getTime() >= scheduledDateTime.getTime());

      if (!hasArrived) {
        confirmPrompt = `تنبيه: موعد التسليم المحدد لهذا الحجز هو (${tkt.scheduledDeliveryDate} ${tkt.scheduledDeliveryTime ? `الساعة ${tkt.scheduledDeliveryTime}` : ''}).\n\nهل ترغب في تأكيد التسليم المبكر الآن للعميل "${tkt.customerName}"؟`;
      }
    }

    if (window.confirm(confirmPrompt)) {
      const res = db.completeTopUpTicket(tkt.id, user?.fullName || 'المسؤول', true);
      if (res.success) {
        showToast('success', 'تم تسليم الحجز بنجاح', `تم إنهاء وتسليم تذكرة الحجز #${tkt.ticketNumber} وإزالتها من قائمة الحجوزات.`);
        onTicketsUpdated();
        const deliveredTkt = db.getTicketById(tkt.id) || { ...tkt, status: 'completed' as const, completedAt: new Date().toISOString() };
        setTicketForInvoice(deliveredTkt);
      } else {
        showToast('error', 'تعذر تسليم الحجز', res.message);
      }
    }
  };

  // 2. Reschedule Delivery Date Action (تأجيل الموعد)
  const handleOpenReschedule = (tkt: CustomerTicket) => {
    setSelectedTicket(tkt);
    setNewDeliveryDate(tkt.scheduledDeliveryDate || new Date().toISOString().split('T')[0]);
    setNewDeliveryTime(tkt.scheduledDeliveryTime || '18:00');
    setRescheduleReason('');
    setIsRescheduleOpen(true);
  };

  const handleSaveReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newDeliveryDate) return;

    selectedTicket.scheduledDeliveryDate = newDeliveryDate;
    selectedTicket.scheduledDeliveryTime = newDeliveryTime || undefined;
    selectedTicket.reservationStatus = 'rescheduled';
    if (!selectedTicket.notesList) selectedTicket.notesList = [];
    selectedTicket.notesList.push({
      id: 'note_' + Date.now(),
      content: `تأجيل موعد تسليم الحجز إلى (${newDeliveryDate} ${newDeliveryTime || ''}) — السبب: ${rescheduleReason || 'بطلب العميل'}`,
      authorName: user?.fullName || 'المسؤول',
      createdAt: new Date().toISOString()
    });

    const isDealer = selectedTicket.customerId?.startsWith('dlr_') || Boolean(db.getDealerTicketById(selectedTicket.id));
    if (isDealer) {
      db.saveDealerTicket(selectedTicket);
    } else {
      db.saveTicket(selectedTicket);
    }

    showToast('info', 'تم تأجيل الموعد', `تم تحديث موعد تسليم تذكرة #${selectedTicket.ticketNumber} إلى ${newDeliveryDate}`);
    setIsRescheduleOpen(false);
    onTicketsUpdated();
  };

  // 3. Cancel Reservation Action (إلغاء الحجز)
  const handleCancelReservation = (tkt: CustomerTicket) => {
    if (window.confirm(`هل أنت متأكد من إلغاء حجز التذكرة #${tkt.ticketNumber} للعميل "${tkt.customerName}"؟`)) {
      const res = db.updateTicketStatus(
        tkt.id,
        'canceled',
        user ? { id: user.id, fullName: user.fullName || user.username, role: user.role } : undefined,
        `إلغاء الحجز بواسطة ${user?.fullName || 'المسؤول'}`
      );

      if (res.success) {
        showToast('warning', 'تم إلغاء الحجز وإخلاء الأمانة', `تم إلغاء حجز التذكرة #${tkt.ticketNumber} وإخلاء مبلغ الأمانة بنجاح.`);
      } else {
        showToast('error', 'تعذر إلغاء الحجز', res.message);
      }
      onTicketsUpdated();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="🔔 إدارة وتنبيهات المنتجات المحجوزة المستحقة اليوم"
        subtitle="متابعة الحجوزات المطلوب تسليمها، إنهاء التسليم، التأجيل، أو الإلغاء"
        maxWidth="4xl"
      >
        <div className="space-y-4 text-right text-xs">
          {dueTickets.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 dark:bg-[#141417] rounded-2xl border border-gray-200 dark:border-[#27272A] space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-bold text-zinc-300">لا توجد حجوزات مستحقة التسليم اليوم</p>
              <span className="text-zinc-500 text-xs block">تم تسليم أو تأجيل كافة الحجوزات السابقة بنجاح.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between text-purple-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>عدد الحجوزات المطلوب تسليمها: {dueTickets.length} حجز</span>
                </span>
                <span className="text-[11px] text-zinc-400">يرجى اتخاذ الإجراء المناسب لكل حجز</span>
              </div>

              {dueTickets.map(tkt => (
                <div
                  key={tkt.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-purple-500/30 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-mono text-sm text-purple-400">#{tkt.ticketNumber}</strong>
                        <Badge variant="purple" size="sm">
                          حجز منتج ({tkt.reservationStatus === 'pending' ? 'قيد الانتظار' : 'مؤجل'})
                        </Badge>
                      </div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mt-1">
                        {tkt.customerName} ({tkt.customerPhone})
                      </h4>
                      <span className="text-zinc-400 text-xs block">
                        المنتج: {tkt.gameName} — {tkt.gameProductName}
                      </span>
                    </div>

                    <div className="text-left font-mono text-xs">
                      <span className="text-zinc-400 block text-[10px]">موعد الاستلام المحدد:</span>
                      <strong className="text-amber-400 font-bold block text-sm">
                        📅 {tkt.scheduledDeliveryDate} {tkt.scheduledDeliveryTime ? `⏰ ${tkt.scheduledDeliveryTime}` : ''}
                      </strong>
                      <span className="text-emerald-400 font-bold">المستلم: {formatCurrency(tkt.receivedAmount || tkt.requiredAmount)}</span>
                    </div>
                  </div>

                  {tkt.reservationNotes && (
                    <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417] text-zinc-300 text-[11px]">
                      <strong className="text-purple-300">ملاحظات الحجز:</strong> {tkt.reservationNotes}
                    </div>
                  )}

                  {/* Actions Toolbar (إنهاء التسليم / تأجيل الموعد / إلغاء الحجز) */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A] flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={<Printer className="w-4 h-4 text-purple-400" />}
                      onClick={() => setTicketForInvoice(tkt)}
                      className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 font-bold"
                    >
                      إيصال الحجز 🧾
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => handleCompleteDelivery(tkt)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      إنهاء التسليم الآن
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<CalendarDays className="w-4 h-4 text-amber-500" />}
                      onClick={() => handleOpenReschedule(tkt)}
                    >
                      تأجيل الموعد
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={<XCircle className="w-4 h-4 text-rose-500" />}
                      onClick={() => handleCancelReservation(tkt)}
                      className="border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                    >
                      إلغاء الحجز
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-[#27272A]">
            <Button type="button" variant="outline" onClick={onClose}>إغلاق</Button>
          </div>
        </div>
      </Modal>

      {/* Sub-Modal: Reschedule Date */}
      {isRescheduleOpen && selectedTicket && (
        <Modal
          isOpen={isRescheduleOpen}
          onClose={() => setIsRescheduleOpen(false)}
          title={`📅 تأجيل موعد حجز تذكرة #${selectedTicket.ticketNumber}`}
          subtitle={`العميل: ${selectedTicket.customerName} (${selectedTicket.customerPhone})`}
          maxWidth="sm"
        >
          <form onSubmit={handleSaveReschedule} className="space-y-4 text-right text-xs">
            <div>
              <label className="block text-zinc-400 font-bold mb-1">تاريخ الاستلام الجديد *</label>
              <input
                type="date"
                value={newDeliveryDate}
                onChange={e => setNewDeliveryDate(e.target.value)}
                required
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 font-mono font-bold text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-bold mb-1">وقت الاستلام الجديد</label>
              <input
                type="time"
                value={newDeliveryTime}
                onChange={e => setNewDeliveryTime(e.target.value)}
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 font-mono text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-bold mb-1">سبب التأجيل</label>
              <input
                type="text"
                value={rescheduleReason}
                onChange={e => setRescheduleReason(e.target.value)}
                placeholder="مثال: العميل طلب تأجيل الاستلام ليوم الغد"
                className="w-full rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] p-2 text-zinc-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27272A]">
              <Button type="button" variant="outline" onClick={() => setIsRescheduleOpen(false)}>إلغاء</Button>
              <Button type="submit" variant="primary">حفظ الموعد الجديد</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Ticket Invoice & Receipt Modal */}
      {ticketForInvoice && (
        <PrintInvoiceModal
          isOpen={!!ticketForInvoice}
          onClose={() => setTicketForInvoice(null)}
          ticket={ticketForInvoice}
        />
      )}
    </>
  );
};
