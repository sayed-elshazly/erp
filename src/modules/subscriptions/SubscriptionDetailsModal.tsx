// =============================================================
// NZM JKR TOP UP ERP — Subscription Details & Full Lifecycle Timeline Modal
// =============================================================

import React, { useState, useEffect } from 'react';
import { CustomerSubscription, SubscriptionTimelineEvent, SubscriptionAttachment, SubscriptionNote } from '../../types/subscription.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { DisasterSafetyModal } from '../../components/common/DisasterSafetyModal';
import { SubscriptionReceiptModal } from './SubscriptionReceiptModal';
import { SubscriptionRenewModal } from './SubscriptionRenewModal';
import { SubscriptionUpgradeModal } from './SubscriptionUpgradeModal';
import {
  Clock,
  Calendar,
  User,
  Phone,
  Layers,
  FileText,
  Paperclip,
  MessageSquare,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  XCircle,
  Download,
  Eye,
  Plus,
  Trash2,
  Send,
  MessageCircle,
  ExternalLink,
  Lock,
  ArrowRightLeft,
  Tv
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

interface SubscriptionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: CustomerSubscription;
  onUpdated: () => void;
}

export const SubscriptionDetailsModal: React.FC<SubscriptionDetailsModalProps> = ({
  isOpen,
  onClose,
  subscription: initialSub,
  onUpdated
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [sub, setSub] = useState<CustomerSubscription>(() => db.getSubscriptionById(initialSub.id) || initialSub);
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'attachments' | 'credentials' | 'payments'>('timeline');

  // Notes state
  const [newNoteText, setNewNoteText] = useState('');

  // Attachments state
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

  // Modals for actions
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [safetyAction, setSafetyAction] = useState<'cancel' | 'suspend' | 'reactivate' | null>(null);

  const reloadSub = () => {
    const updated = db.getSubscriptionById(sub.id);
    if (updated) setSub(updated);
    onUpdated();
  };

  // Add Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    db.addSubscriptionNote(
      sub.id,
      'subscription',
      newNoteText.trim(),
      user?.fullName || 'مسؤول النظام',
      user?.role || 'staff'
    );

    // Also log in timeline
    db.addSubscriptionTimelineEvent(sub.id, {
      type: 'edited',
      title: 'إضافة ملاحظة إدارية',
      description: newNoteText.trim(),
      userName: user?.fullName || 'مسؤول النظام'
    });

    setNewNoteText('');
    showToast('success', 'تمت إضافة الملاحظة', 'تم حفظ الملاحظة بنجاح');
    reloadSub();
  };

  // Delete Note
  const handleDeleteNote = (noteId: string) => {
    db.deleteSubscriptionNote(sub.id, noteId);
    showToast('info', 'تم الحذف', 'تم حذف الملاحظة');
    reloadSub();
  };

  // Handle File Upload (Convert to Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'حجم الملف كبير', 'الحد الأقصى للملف هو 5 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const fileType = file.type.startsWith('image/') ? 'image' : file.type.includes('pdf') ? 'pdf' : 'document';

      db.addSubscriptionAttachment(sub.id, {
        fileName: file.name,
        fileType,
        fileUrl: base64,
        fileSize: file.size,
        uploadedBy: user?.fullName || 'مسؤول النظام'
      });

      // Log in timeline
      db.addSubscriptionTimelineEvent(sub.id, {
        type: 'edited',
        title: 'إرفاق ملف جديد',
        description: `تم إرفاق الملف (${file.name}) بنجاح`,
        userName: user?.fullName || 'مسؤول النظام'
      });

      showToast('success', 'تم إرفاق الملف بنجاح', file.name);
      reloadSub();
    };
    reader.readAsDataURL(file);
  };

  // Safety Action Execution
  const handleConfirmSafetyAction = (reason: string) => {
    const userMeta = user ? { id: user.id, name: user.fullName, role: user.role } : undefined;

    if (safetyAction === 'cancel') {
      db.cancelSubscription(sub.id, reason, userMeta);
      db.addSubscriptionTimelineEvent(sub.id, {
        type: 'cancelled',
        title: 'إلغاء الاشتراك',
        description: `تم إلغاء الاشتراك من قبل ${user?.fullName || 'المدير'}. السبب: ${reason}`,
        userName: user?.fullName || 'المدير'
      });
      showToast('warning', 'تم إلغاء الاشتراك', 'تم إلغاء الاشتراك وتوثيق السبب في السجل');
    } else if (safetyAction === 'suspend') {
      const updated = { ...sub, status: 'frozen' as const, updatedAt: new Date().toISOString() };
      db.saveSubscription(updated, userMeta);
      db.addSubscriptionTimelineEvent(sub.id, {
        type: 'suspended',
        title: 'تعليق الاشتراك مؤقتاً',
        description: `تم تعليق الاشتراك. السبب: ${reason}`,
        userName: user?.fullName || 'المدير'
      });
      showToast('info', 'تم تعليق الاشتراك', 'تم تجميد سريان الاشتراك مؤقتاً');
    } else if (safetyAction === 'reactivate') {
      const updated = { ...sub, status: 'active' as const, updatedAt: new Date().toISOString() };
      db.saveSubscription(updated, userMeta);
      db.addSubscriptionTimelineEvent(sub.id, {
        type: 'reactivated',
        title: 'إعادة تفعيل الاشتراك',
        description: `تمت إعادة تفعيل الاشتراك بنجاح بواسطة ${user?.fullName || 'المدير'}`,
        userName: user?.fullName || 'المدير'
      });
      showToast('success', 'تم إعادة التفعيل', 'الاشتراك ساري ونشط الآن');
    }
    setSafetyAction(null);
    reloadSub();
  };

  // Timeline Events List
  const timelineEvents = sub.timelineEvents || [
    {
      id: 'init_1',
      subscriptionId: sub.id,
      type: 'created' as const,
      title: 'إنشاء وتفعيل الاشتراك',
      description: `تم بيع وتفعيل باقة (${sub.planName}) بقيمة ${formatCurrency(sub.finalPrice)} للعميل ${sub.customerName}`,
      userName: sub.createdBy || 'مسؤول النظام',
      createdAt: sub.createdAt
    }
  ];

  // Notes List
  const notesList = sub.notesList || [];
  const attachments = sub.attachments || [];
  const payments = db.getSubscriptionPayments().filter(p => p.subscriptionId === sub.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ملف الاشتراك: #${sub.subscriptionNumber} — ${sub.planName}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 text-right text-xs" dir="rtl">
        {/* Top Summary Bar */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-gray-50 to-pink-50/30 dark:from-[#18181B] dark:to-pink-950/20 border border-gray-200 dark:border-[#27272A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-pink-500/10 text-pink-500 border border-pink-500/20 shrink-0">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-sm">{sub.planName}</h3>
                <span className="font-mono text-xs font-bold text-pink-600 dark:text-pink-400">#{sub.subscriptionNumber}</span>
                <Badge
                  variant={
                    sub.status === 'active' ? 'success' :
                    sub.status === 'expiring_soon' ? 'warning' :
                    sub.status === 'cancelled' ? 'danger' : 'default'
                  }
                  size="sm"
                >
                  {sub.status === 'active' ? 'ساري ونشط' : sub.status === 'expiring_soon' ? 'قارب الانتهاء' : sub.status === 'cancelled' ? 'ملغي' : 'منتهي'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1 font-bold">
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-zinc-400" /> {sub.customerName}</span>
                <span className="flex items-center gap-1 font-mono"><Phone className="w-3.5 h-3.5 text-zinc-400" /> {sub.customerPhone}</span>
                <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-3.5 h-3.5" /> {formatCurrency(sub.finalPrice)} {sub.currency || 'EGP'}
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              icon={<FileText className="w-3.5 h-3.5 text-pink-500" />}
              onClick={() => setIsReceiptOpen(true)}
            >
              الإيصال
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5 text-emerald-500" />}
              onClick={() => setIsRenewOpen(true)}
            >
              تجديد
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<TrendingUp className="w-3.5 h-3.5 text-purple-500" />}
              onClick={() => setIsUpgradeOpen(true)}
            >
              ترقية
            </Button>
            {sub.status !== 'cancelled' && (
              <button
                type="button"
                onClick={() => setSafetyAction('cancel')}
                className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-bold text-xs transition-all cursor-pointer"
                title="إلغاء الاشتراك"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-[#27272A] pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-pink-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>دورة الحياة (Timeline) ({timelineEvents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-pink-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>الملاحظات والتدقيق ({notesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'attachments'
                ? 'bg-pink-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>المرفقات والتحويلات ({attachments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'credentials'
                ? 'bg-pink-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>بيانات الحساب والسيرفر</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-pink-500 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>سجل المدفوعات ({payments.length})</span>
          </button>
        </div>

        {/* Tab 1: Timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-3 py-2 max-h-[350px] overflow-y-auto pr-1">
            <div className="relative border-r-2 border-pink-500/30 pr-4 mr-2 space-y-4">
              {timelineEvents.map((evt, idx) => (
                <div key={evt.id || idx} className="relative group">
                  {/* Timeline Node Dot */}
                  <span className="absolute -right-[23px] top-1 w-3 h-3 rounded-full bg-pink-500 border-2 border-white dark:border-[#121215] shadow-xs" />

                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] hover:border-pink-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                        {evt.title}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {formatDateTime(evt.createdAt)}
                      </span>
                    </div>

                    <p className="text-zinc-600 dark:text-zinc-300 text-[11px] mt-1 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold mt-2 pt-1.5 border-t border-gray-200/60 dark:border-zinc-800">
                      <span>بواسطة: {evt.userName}</span>
                      <span className="text-pink-500 font-mono">الحدث #{timelineEvents.length - idx}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-3 py-2">
            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={2}
                value={newNoteText}
                onChange={e => setNewNoteText(e.target.value)}
                placeholder="اكتب ملاحظة جديدة على الاشتراك (تظهر للموظفين والإدارة وتُحفظ بالسجل)..."
                className="w-full bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl p-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-pink-500"
              />
              <div className="flex justify-end">
                <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                  إضافة ملاحظة موثقة
                </Button>
              </div>
            </form>

            {/* Notes List */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {notesList.length === 0 ? (
                <div className="text-center py-6 text-zinc-400 text-xs">لا توجد ملاحظات مسجلة بعد</div>
              ) : (
                notesList.map(note => (
                  <div key={note.id} className="p-3 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">{note.text}</p>
                      <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-2">
                        <span className="font-bold text-pink-500">{note.authorName} ({note.authorRole || 'موظف'})</span>
                        <span className="font-mono">{formatDateTime(note.createdAt)}</span>
                      </div>
                    </div>
                    {user?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                        title="حذف الملاحظة (Admin)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Attachments */}
        {activeTab === 'attachments' && (
          <div className="space-y-3 py-2">
            {/* Upload Button */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-dashed border-pink-500/40">
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block">إرفاق إثبات دفع / لقطة شاشة / فاتورة</span>
                <span className="text-[10px] text-zinc-400">الحد الأقصى 5 ميجابايت (PNG, JPG, PDF)</span>
              </div>
              <label className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs">
                <Paperclip className="w-3.5 h-3.5" />
                <span>رفع ملف</span>
                <input type="file" onChange={handleFileUpload} accept="image/*,application/pdf" className="hidden" />
              </label>
            </div>

            {/* Attachments List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto">
              {attachments.length === 0 ? (
                <div className="col-span-2 text-center py-6 text-zinc-400 text-xs">لا توجد مرفقات مسجلة لهذا الاشتراك</div>
              ) : (
                attachments.map(att => (
                  <div key={att.id} className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs block truncate">{att.fileName}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{formatDate(att.uploadedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {att.fileType === 'image' && (
                        <button
                          type="button"
                          onClick={() => setAttachmentPreview(att.fileUrl)}
                          className="p-1 text-zinc-400 hover:text-pink-500"
                          title="معاينة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <a
                        href={att.fileUrl}
                        download={att.fileName}
                        className="p-1 text-zinc-400 hover:text-emerald-500"
                        title="تنزيل الملف"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Credentials */}
        {activeTab === 'credentials' && (
          <div className="space-y-3 py-2">
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-[#27272A]">
                <span className="text-zinc-500 font-sans">اسم المستخدم / الكود:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{sub.serviceAccountUser || '—'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-[#27272A]">
                <span className="text-zinc-500 font-sans">كلمة المرور / الباسورد:</span>
                <span className="font-bold text-pink-600 dark:text-pink-400">{sub.serviceAccountPassword || '—'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-[#27272A]">
                <span className="text-zinc-500 font-sans">رابط السيرفر Host / URL:</span>
                <span className="font-bold text-blue-500 truncate max-w-[250px]">{sub.serviceServerUrl || '—'}</span>
              </div>
              {sub.serviceNotes && (
                <div className="pt-1 text-[11px] font-sans text-zinc-500">
                  <span className="font-bold block mb-0.5">تعليمات التشغيل:</span>
                  <p className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-gray-200 dark:border-zinc-800 leading-relaxed">
                    {sub.serviceNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Payments */}
        {activeTab === 'payments' && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {payments.map(p => (
              <div key={p.id} className="p-3 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{p.paymentNumber}</span>
                    <Badge variant={p.status === 'completed' ? 'success' : 'danger'} size="sm">
                      {p.status === 'completed' ? 'مسدد بالكامل' : 'مسترد'}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                    {formatDateTime(p.createdAt)} • بواسطة: {p.employeeName}
                  </div>
                </div>
                <div className="text-left font-mono">
                  <span className="font-black text-emerald-500 text-sm block">
                    {formatCurrency(p.netPaid)} {p.currency || 'EGP'}
                  </span>
                  <span className="text-[10px] text-zinc-400">{p.paymentMethod}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image Preview Modal */}
        {attachmentPreview && (
          <Modal
            isOpen={Boolean(attachmentPreview)}
            onClose={() => setAttachmentPreview(null)}
            title="معاينة المرفق"
            maxWidth="lg"
          >
            <div className="flex justify-center p-2">
              <img src={attachmentPreview} alt="Preview" className="max-h-[500px] rounded-xl object-contain shadow-lg" />
            </div>
          </Modal>
        )}

        {/* Action Modals */}
        {isReceiptOpen && (
          <SubscriptionReceiptModal
            isOpen={isReceiptOpen}
            onClose={() => setIsReceiptOpen(false)}
            subscription={sub}
          />
        )}

        {isRenewOpen && (
          <SubscriptionRenewModal
            isOpen={isRenewOpen}
            onClose={() => setIsRenewOpen(false)}
            subscription={sub}
            onRenewSuccess={() => reloadSub()}
          />
        )}

        {isUpgradeOpen && (
          <SubscriptionUpgradeModal
            isOpen={isUpgradeOpen}
            onClose={() => setIsUpgradeOpen(false)}
            subscription={sub}
            onUpgradeSuccess={() => reloadSub()}
          />
        )}

        {/* Disaster Safety Modal */}
        {safetyAction && (
          <DisasterSafetyModal
            isOpen={Boolean(safetyAction)}
            onClose={() => setSafetyAction(null)}
            onConfirm={handleConfirmSafetyAction}
            title={
              safetyAction === 'cancel' ? 'تأكيد إلغاء الاشتراك' :
              safetyAction === 'suspend' ? 'تأكيد تعليق الاشتراك' : 'تأكيد إعادة التفعيل'
            }
            actionType={safetyAction === 'cancel' ? 'cancel' : 'suspend'}
            itemTitle={`اشتراك #${sub.subscriptionNumber} (${sub.planName})`}
            details={[
              { label: 'العميل', value: sub.customerName },
              { label: 'الهاتف', value: sub.customerPhone },
              { label: 'القيمة المسددة', value: `${formatCurrency(sub.finalPrice)} ج.م`, color: 'text-pink-500' },
              { label: 'تاريخ الانتهاء', value: formatDate(sub.endDate) }
            ]}
            warningMessage={
              safetyAction === 'cancel'
                ? 'سيتم إلغاء الاشتراك وإيقاف الخدمة عن العميل وتوثيق العملية في سجل الرقابة.'
                : 'سيتم تعليق الاشتراك مؤقتاً ولن يتمكن العميل من استخدام الخدمة حتى إعادة التفعيل.'
            }
          />
        )}
      </div>
    </Modal>
  );
};
