// =============================================================
// NZM JKR TOP UP ERP — Middleman Deal Details & Timeline Modal
// =============================================================

import React, { useState } from 'react';
import { MiddlemanDeal, MiddlemanDealStatus } from '../../types/middleman.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { MiddlemanInvoiceModal } from './MiddlemanInvoiceModal';
import {
  ShieldCheck,
  Clock,
  User,
  Phone,
  DollarSign,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  Printer,
  History,
  Layers,
  ChevronRight,
  Upload,
  Coins,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface MiddlemanDealDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: MiddlemanDeal;
  onDealUpdated: (updated: MiddlemanDeal) => void;
}

export const MiddlemanDealDetailsModal: React.FC<MiddlemanDealDetailsModalProps> = ({
  isOpen,
  onClose,
  deal: initialDeal,
  onDealUpdated
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [deal, setDeal] = useState<MiddlemanDeal>(initialDeal);

  // Status Change State
  const [newStatus, setNewStatus] = useState<MiddlemanDealStatus>(deal.status);
  const [statusNote, setStatusNote] = useState('');

  // Internal Note State
  const [newInternalNote, setNewInternalNote] = useState('');

  // Attachment upload simulation
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentType, setAttachmentType] = useState<'image' | 'file' | 'transfer_proof' | 'chat_log'>('transfer_proof');
  const [showAddAttachment, setShowAddAttachment] = useState(false);

  // Invoice Modal
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const isCompleted = deal.status === 'completed';
  const isManagerOrAdmin = user?.role === 'admin';

  // Handle Status Update
  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompleted && !isManagerOrAdmin) {
      showToast('error', 'غير مصرح', 'لا يمكن إعادة فتح أو تعديل الصفقة المكتملة إلا بواسطة المدير.');
      return;
    }

    if (newStatus === deal.status && !statusNote) {
      showToast('info', 'لا يوجد تغيير', 'يرجى اختيار حالة جديدة أو كتابة ملاحظة');
      return;
    }

    const res = db.updateDealStatus(deal.id, newStatus, statusNote.trim() || undefined, {
      id: user?.id,
      name: user?.fullName,
      role: user?.role
    });

    if (res.success && res.deal) {
      setDeal(res.deal);
      onDealUpdated(res.deal);
      setStatusNote('');
      showToast('success', 'تم تحديث الحالة', res.message);
    } else {
      showToast('error', 'خطأ', res.message);
    }
  };

  // Add Internal Note
  const handleAddInternalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternalNote.trim()) return;

    const added = db.addDealNote(deal.id, {
      authorName: user?.fullName || 'مسؤول الوساطة',
      authorRole: user?.role || 'admin',
      content: newInternalNote.trim()
    });

    const refreshed = db.getMiddlemanDealById(deal.id);
    if (refreshed) {
      setDeal(refreshed);
      onDealUpdated(refreshed);
    }
    setNewInternalNote('');
    showToast('success', 'تمت إضافة الملاحظة', 'تم تسجيل الملاحظة الإدارية بنجاح');
  };

  // Add Attachment
  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentName.trim() || !attachmentUrl.trim()) {
      showToast('error', 'بيانات غير مكتملة', 'يرجى كتابة اسم ورابط المرفق');
      return;
    }

    db.addDealAttachment(deal.id, {
      name: attachmentName.trim(),
      url: attachmentUrl.trim(),
      type: attachmentType,
      uploadedBy: user?.fullName || 'مسؤول الوساطة'
    });

    const refreshed = db.getMiddlemanDealById(deal.id);
    if (refreshed) {
      setDeal(refreshed);
      onDealUpdated(refreshed);
    }
    setAttachmentName('');
    setAttachmentUrl('');
    setShowAddAttachment(false);
    showToast('success', 'تمت إضافة المرفق', 'تم حفظ المرفق وإرفاقه بالصفقة');
  };

  // Handle Pay External Middleman
  const handlePayExternalMiddleman = () => {
    const success = db.payExternalMiddleman(deal.id, { id: user?.id, name: user?.fullName, role: user?.role });
    if (success) {
      const refreshed = db.getMiddlemanDealById(deal.id);
      if (refreshed) {
        setDeal(refreshed);
        onDealUpdated(refreshed);
      }
      showToast('success', 'تم الصرف', 'تم تسجيل صرف عمولة الوسيط الخارجي وخصمها من الخزينة');
    }
  };

  const getStatusBadge = (st: MiddlemanDealStatus) => {
    switch (st) {
      case 'new':
        return <Badge variant="warning">جديدة</Badge>;
      case 'awaiting_transfer':
        return <Badge variant="info">بانتظار التحويل</Badge>;
      case 'awaiting_seller':
        return <Badge variant="warning">بانتظار البائع</Badge>;
      case 'awaiting_buyer':
        return <Badge variant="info">بانتظار المشتري</Badge>;
      case 'in_progress':
        return <Badge variant="purple">قيد التنفيذ</Badge>;
      case 'completed':
        return <Badge variant="success">مكتملة ومؤمنة</Badge>;
      case 'canceled':
        return <Badge variant="danger">ملغاة</Badge>;
      case 'dispute':
        return <Badge variant="danger">نزاع قائم</Badge>;
      default:
        return <Badge variant="default">{st}</Badge>;
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`تفاصيل وسجل صفقة الوساطة #${deal.dealNumber}`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-right text-xs" dir="rtl">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-amber-500">#{deal.dealNumber}</span>
              {getStatusBadge(deal.status)}
              <span className="text-zinc-500 font-bold">• {deal.title}</span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => setIsInvoiceOpen(true)}
            >
              إصدار الفاتورة / الإيصال
            </Button>
          </div>

          {/* Top Hero Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Seller */}
            <Card className="p-3.5 space-y-1.5 bg-emerald-500/5 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-600 font-bold block flex items-center gap-1">
                <User className="w-3 h-3" /> طرف أول (البائع):
              </span>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 block">{deal.sellerName}</span>
              <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                <Phone className="w-3 h-3" /> {deal.sellerPhone}
              </div>
            </Card>

            {/* Buyer */}
            <Card className="p-3.5 space-y-1.5 bg-blue-500/5 border border-blue-500/20">
              <span className="text-[10px] text-blue-600 font-bold block flex items-center gap-1">
                <User className="w-3 h-3" /> طرف ثانٍ (المشتري):
              </span>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 block">{deal.buyerName}</span>
              <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                <Phone className="w-3 h-3" /> {deal.buyerPhone}
              </div>
            </Card>

            {/* Value & Net Profit */}
            <Card className="p-3.5 space-y-1.5 bg-amber-500/5 border border-amber-500/20">
              <span className="text-[10px] text-amber-600 font-bold block flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> القيمة والعمولة:
              </span>
              <span className="font-black text-sm text-zinc-900 dark:text-zinc-100 block font-mono">
                {deal.dealAmount} {deal.currency} ({formatCurrency(deal.dealAmountEGP)})
              </span>
              <span className="text-[11px] text-emerald-500 font-bold block">
                صافي ربح الشركة: +{formatCurrency(deal.netCompanyProfitEGP)}
              </span>
            </Card>
          </div>

          {/* External Middleman Notice if exists */}
          {deal.hasExternalMiddleman && (
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-600 dark:text-purple-400">الوسيط الخارجي:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-bold">{deal.externalMiddlemanName}</span>
                <span className="text-zinc-400 font-mono">({deal.externalMiddlemanPhone})</span>
                <Badge variant={deal.isExternalMiddlemanPaid ? 'success' : 'warning'} size="sm">
                  {deal.isExternalMiddlemanPaid ? 'تم صرف العمولة ✓' : 'مستحقات معلقة'}
                </Badge>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span>العمولة: {formatCurrency(deal.externalMiddlemanCommissionAmountEGP || 0)}</span>
                {!deal.isExternalMiddlemanPaid && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handlePayExternalMiddleman}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    صرف العمولة الآن
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Status Transition Control Bar */}
          {isCompleted && !isManagerOrAdmin ? (
            <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>🔒 هذه الصفقة مكتملة ومؤمنة بالكامل (للقراءة فقط). لا يمكن إعادة فتحها إلا من خلال مدير النظام.</span>
              </div>
              <Badge variant="success">مغلقة بنجاح</Badge>
            </div>
          ) : (
            <form
              onSubmit={handleUpdateStatus}
              className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-amber-500" /> تغيير وتحديث حالة الصفقة
                </span>
                <span className="text-[10px] text-zinc-400">يتم توثيق كل تغيير بالسجل الرسمي</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">الحالة الجديدة:</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as any)}
                    className="w-full bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#2E2E2E] rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 font-bold focus:outline-none"
                  >
                    <option value="new">جديدة</option>
                    <option value="awaiting_transfer">بانتظار التحويل</option>
                    <option value="awaiting_seller">بانتظار البائع</option>
                    <option value="awaiting_buyer">بانتظار المشتري</option>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="completed">مكتملة ومؤمنة</option>
                    <option value="canceled">ملغاة</option>
                    <option value="dispute">نزاع قائم</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">ملاحظة التغيير:</label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="سبب تغيير الحالة أو تفاصيل الخطوة الحالية..."
                      value={statusNote}
                      onChange={e => setStatusNote(e.target.value)}
                    />
                    <Button type="submit" variant="primary" className="bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0">
                      تطبيق
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Timeline & Status History */}
          <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" /> سجل الخطوات والتحويلات (Status Audit Timeline)
              </span>
              <Badge variant="info" size="sm">{(deal.statusHistory || []).length} خطوات</Badge>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {(deal.statusHistory || []).map((h, idx) => (
                <div key={h.id || idx} className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#27272A] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-500">{h.statusLabelArabic}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">بواسطة: {h.userName} ({h.userRole})</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">{formatDateTime(h.timestamp)}</span>
                  </div>
                  {h.notes && <p className="text-zinc-600 dark:text-zinc-300 text-[11px] leading-relaxed">{h.notes}</p>}
                </div>
              ))}
            </div>
          </Card>

          {/* Attachments & Internal Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Attachments */}
            <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-purple-400" /> المرفقات وإثباتات التحويل ({(deal.attachments || []).length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddAttachment(!showAddAttachment)}
                  className="text-[11px] font-bold text-amber-500 hover:underline cursor-pointer"
                >
                  {showAddAttachment ? 'إلغاء' : '+ إضافة مرفق'}
                </button>
              </div>

              {showAddAttachment && (
                <form onSubmit={handleAddAttachment} className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2">
                  <Input
                    label="اسم المرفق *"
                    placeholder="مثال: سكرين شوت تحويل إنستاباي"
                    value={attachmentName}
                    onChange={e => setAttachmentName(e.target.value)}
                    required
                  />
                  <Input
                    label="رابط الصورة / الملف *"
                    placeholder="https://..."
                    value={attachmentUrl}
                    onChange={e => setAttachmentUrl(e.target.value)}
                    required
                  />
                  <div className="flex justify-end pt-1">
                    <Button type="submit" variant="primary" size="sm">
                      حفظ المرفق
                    </Button>
                  </div>
                </form>
              )}

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {(deal.attachments || []).length === 0 ? (
                  <p className="text-zinc-400 text-center py-4">لا توجد مرفقات مسجلة بعد</p>
                ) : (
                  deal.attachments.map(att => (
                    <div
                      key={att.id}
                      className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#27272A] flex items-center justify-between text-[11px]"
                    >
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{att.name}</span>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:underline font-mono text-[10px]"
                      >
                        عرض المرفق ↗
                      </a>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Internal Notes */}
            <Card className="p-4 space-y-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" /> ملاحظات الموظفين الداخلية ({(deal.internalNotes || []).length})
                </span>
              </div>

              <form onSubmit={handleAddInternalNote} className="flex items-center gap-1.5">
                <Input
                  placeholder="اكتب ملاحظة داخلية..."
                  value={newInternalNote}
                  onChange={e => setNewInternalNote(e.target.value)}
                />
                <Button type="submit" variant="secondary" size="sm" icon={<Send className="w-3 h-3" />}>
                  إضافة
                </Button>
              </form>

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {(deal.internalNotes || []).length === 0 ? (
                  <p className="text-zinc-400 text-center py-4">لا توجد ملاحظات داخلية مسجلة</p>
                ) : (
                  deal.internalNotes.map(n => (
                    <div
                      key={n.id}
                      className="p-2 rounded-xl bg-gray-50 dark:bg-[#141417] border border-gray-100 dark:border-[#27272A] space-y-0.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="font-bold text-emerald-500">{n.authorName} ({n.authorRole})</span>
                        <span className="font-mono">{formatDateTime(n.createdAt)}</span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300">{n.content}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </Modal>

      {/* Printable Invoice Modal */}
      {isInvoiceOpen && (
        <MiddlemanInvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          deal={deal}
        />
      )}
    </>
  );
};
