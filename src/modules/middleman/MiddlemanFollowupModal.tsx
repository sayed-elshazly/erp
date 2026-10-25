// =============================================================
// NZM JKR TOP UP ERP — Middleman Followup & Appointment Modal
// =============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Customer } from '../../types/customer.types';
import { MiddlemanFollowup } from '../../types/middleman.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { BrokerageNotificationSyncService } from '../../services/notifications/brokerageNotificationSyncService';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  User,
  Phone,
  FileText,
  Bell,
  Search
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface MiddlemanFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  dealId?: string;
  dealNumber?: string;
  defaultFilterTab?: 'all' | 'today' | 'overdue' | 'completed';
  onFollowupUpdated?: () => void;
}

export const MiddlemanFollowupModal: React.FC<MiddlemanFollowupModalProps> = ({
  isOpen,
  onClose,
  customer,
  dealId,
  dealNumber,
  defaultFilterTab = 'all',
  onFollowupUpdated
}) => {
  const { user } = useAuth();
  const { showToast, refreshNotifications } = useNotifications();

  const allClients = useMemo(() => db.getMiddlemanClients(true), []);
  const [selectedClientId, setSelectedClientId] = useState<string>(customer?.id || '');

  // Filter tab for modal
  const [filterTab, setFilterTab] = useState<'all' | 'today' | 'overdue' | 'completed'>(defaultFilterTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Active followups
  const [followups, setFollowups] = useState<MiddlemanFollowup[]>(() => {
    const list = db.getMiddlemanFollowups();
    return customer ? list.filter(f => f.middlemanId === customer.id) : list;
  });

  // Form State for new followup
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [dueTime, setDueTime] = useState('19:00');
  const [title, setTitle] = useState(dealNumber ? `متابعة وساطة #${dealNumber}` : 'موعد متابعة');
  const [notes, setNotes] = useState('');

  // Keep followups synced when opened or customer changes
  useEffect(() => {
    if (isOpen) {
      const list = db.getMiddlemanFollowups();
      setFollowups(customer ? list.filter(f => f.middlemanId === customer.id) : list);
      if (customer) setSelectedClientId(customer.id);
      if (defaultFilterTab) setFilterTab(defaultFilterTab);
    }
  }, [isOpen, customer, defaultFilterTab]);

  if (!isOpen) return null;

  const reload = () => {
    const list = db.getMiddlemanFollowups();
    setFollowups(customer ? list.filter(f => f.middlemanId === customer.id) : list);
    onFollowupUpdated?.();
    refreshNotifications();
  };

  const handleCreateFollowup = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCust = customer || allClients.find(c => c.id === selectedClientId);
    if (!targetCust) {
      showToast('error', 'اختر الوسيط', 'يرجى اختيار العميل أو الوسيط المراد المتابعة معه');
      return;
    }
    if (!dueDate || !title.trim()) {
      showToast('error', 'بيانات ناقصة', 'يرجى تحديد تاريخ وعنوان المتابعة');
      return;
    }

    const newFollowup: MiddlemanFollowup = {
      id: 'fol_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      middlemanId: targetCust.id,
      middlemanName: targetCust.name,
      middlemanPhone: targetCust.phone,
      dealId,
      dealNumber,
      dueDate,
      dueTime,
      title: title.trim(),
      notes: notes.trim(),
      status: 'pending',
      assignedTo: user?.fullName || 'النظام',
      createdAt: new Date().toISOString()
    };

    BrokerageNotificationSyncService.scheduleFollowup(newFollowup);
    showToast('success', 'تم حفظ الموعد', `تمت جدولة موعد المتابعة بنجاح وتعيين التنبيه في مركز الإشعارات.`);
    setIsAddingNew(false);
    setNotes('');
    reload();
  };

  const handleComplete = (id: string) => {
    BrokerageNotificationSyncService.completeFollowupAndDismiss(id, user?.fullName);
    showToast('success', 'تم إنهاء المتابعة', 'تم إكمال المتابعة وإزالة الإشعار المرتبط بها بنجاح.');
    reload();
  };

  const handleDelete = (id: string) => {
    db.deleteMiddlemanFollowup(id);
    db.removeNotification(`ntf_mm_due_${id}`);
    db.removeNotification(`ntf_mm_overdue_${id}`);
    showToast('info', 'تم حذف الموعد', 'تم حذف موعد المتابعة بنجاح.');
    reload();
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered followups
  const displayedFollowups = followups.filter(f => {
    if (filterTab === 'today') {
      if (f.dueDate !== todayStr || f.status === 'completed') return false;
    } else if (filterTab === 'overdue') {
      const isPast = f.dueDate < todayStr;
      if (f.status === 'completed' || !isPast) return false;
    } else if (filterTab === 'completed') {
      if (f.status !== 'completed') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = f.middlemanName.toLowerCase().includes(q);
      const matchPhone = f.middlemanPhone?.toLowerCase().includes(q);
      const matchTitle = f.title.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchTitle) return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
      <div className="bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-right text-xs">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-[#27272A] flex items-center justify-between bg-amber-500/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                {customer ? 'مواعيد وتذكيرات المتابعة للوسيط' : 'مواعيد وتذكيرات متابعة الوسطاء'}
              </h3>
              {customer ? (
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  الوسيط: <span className="font-bold text-amber-600 dark:text-amber-400">{customer.name}</span> ({customer.phone})
                </p>
              ) : (
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  جدول مواعيد المتابعة الفورية والتنبيهات المركزية المتصلة بالنظام
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white dark:bg-[#18181B] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-[#27272A] pb-3">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#18181B] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-white dark:bg-[#27272A] text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                الكل ({followups.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('today')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  filterTab === 'today'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-500 hover:text-blue-600'
                }`}
              >
                📅 اليوم ({followups.filter(f => f.dueDate === todayStr && f.status !== 'completed').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('overdue')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  filterTab === 'overdue'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-500 hover:text-rose-600'
                }`}
              >
                ⚠️ متأخرة ({followups.filter(f => f.dueDate < todayStr && f.status !== 'completed').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('completed')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  filterTab === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-500 hover:text-emerald-600'
                }`}
              >
                ✓ مكتملة
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="بحث سريع..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl pr-8 pl-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {!isAddingNew && (
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> إضافة موعد
                </button>
              )}
            </div>
          </div>

          {/* Active Followups List */}
          <div>
            {displayedFollowups.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-gray-200 dark:border-[#27272A] text-center text-zinc-400 text-xs space-y-1">
                <Clock className="w-6 h-6 mx-auto text-zinc-400/60" />
                <p className="font-bold">لا توجد مواعيد متابعة مطابقة للفلتر المحدد</p>
                <p className="text-[11px]">يمكنك إضافة موعد متابعة جديد من الزر أعلاه</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedFollowups.map(f => {
                  const isDone = f.status === 'completed';
                  const isOverdue = f.dueDate < todayStr && !isDone;
                  const isToday = f.dueDate === todayStr && !isDone;

                  return (
                    <div
                      key={f.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isDone
                          ? 'bg-gray-50 dark:bg-[#18181B]/50 border-gray-200 dark:border-[#27272A] opacity-70'
                          : isOverdue
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-500/40'
                          : isToday
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/40'
                          : 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                              {f.title}
                            </span>
                            <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                              ({f.middlemanName})
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                isDone
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : isOverdue
                                  ? 'bg-rose-500/10 text-rose-500'
                                  : isToday
                                  ? 'bg-blue-500/10 text-blue-500'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {isDone ? '✓ تمت المتابعة' : isOverdue ? '⚠️ متأخرة' : isToday ? '📅 اليوم' : 'قيد الانتظار'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-amber-500" />
                              {formatDate(f.dueDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-500" />
                              {f.dueTime}
                            </span>
                            {f.middlemanPhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-zinc-400" />
                                {f.middlemanPhone}
                              </span>
                            )}
                            {f.dealNumber && <span>• وساطة #{f.dealNumber}</span>}
                          </div>

                          {f.notes && (
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 bg-white/60 dark:bg-black/20 p-2 rounded-lg">
                              {f.notes}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => handleComplete(f.id)}
                              title="إنهاء المتابعة وإخفاء الإشعار تلقائياً"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 className="w-3 h-3" /> إنهاء المتابعة
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(f.id)}
                            title="حذف الموعد"
                            className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create New Followup Form */}
          {isAddingNew && (
            <form onSubmit={handleCreateFollowup} className="p-3.5 rounded-xl border border-amber-500/30 bg-gray-50/80 dark:bg-[#18181C] space-y-3 animate-slide-down">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#27272A] pb-2">
                <span className="font-black text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> جدولة موعد متابعة جديد
                </span>
                {followups.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200"
                  >
                    إلغاء
                  </button>
                )}
              </div>

              {!customer && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1">اختر الوسيط / العميل</label>
                  <select
                    required
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                    className="w-full bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-sans"
                  >
                    <option value="">-- اختر وسيطاً من القائمة --</option>
                    {allClients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1">موضوع المتابعة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: موعد تواصل لمتابعة تحويل الرصيد..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1">تاريخ المتابعة</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1">وقت المتابعة</label>
                  <input
                    type="time"
                    required
                    value={dueTime}
                    onChange={e => setDueTime(e.target.value)}
                    className="w-full bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] rounded-xl px-2 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  placeholder="اكتب أي تعليمات أو نقاط مطلوبة أثناء التواصل..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-white dark:bg-[#121215] border border-gray-200 dark:border-[#27272A] rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تأكيد وجدولة التنبيه</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 dark:bg-[#16161A] border-t border-gray-100 dark:border-[#27272A] flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">
            تنبيه: ستظهر إشعارات تلقائية في شريط النظام العلوي ويتم إزالتها فور إنهاء المتابعة.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-[#27272A] text-zinc-700 dark:text-zinc-300 font-bold text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
