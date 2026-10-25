// =============================================================
// NZM JKR TOP UP ERP — Subscriptions Scheduler & Retry Queue Monitor
// =============================================================

import React, { useState } from 'react';
import { SchedulerMonitorStatus, NotificationRetryItem } from '../../types/subscription.types';
import { db } from '../../database/db';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import {
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageCircle,
  Server,
  Zap,
  Activity,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface SubscriptionSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionSchedulerModal: React.FC<SubscriptionSchedulerModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [status, setStatus] = useState<SchedulerMonitorStatus>(() => db.getSubscriptionSchedulerStatus());
  const [retryQueue, setRetryQueue] = useState<NotificationRetryItem[]>(() => db.getNotificationRetryQueue());
  const [isRunning, setIsRunning] = useState(false);

  const reloadData = () => {
    setStatus(db.getSubscriptionSchedulerStatus());
    setRetryQueue(db.getNotificationRetryQueue());
  };

  // Run Now Trigger (Admin Manual Check)
  const handleRunNow = () => {
    setIsRunning(true);
    setTimeout(() => {
      // Generate notifications & scan
      const generated = db.generateSubscriptionNotifications();
      const updatedStatus = db.recordSchedulerRun({
        lastSuccessAt: new Date().toISOString(),
        messagesSentCount: (status.messagesSentCount || 0) + generated.length,
        subscriptionsUpdatedCount: (status.subscriptionsUpdatedCount || 0) + 1
      });

      setStatus(updatedStatus);
      setIsRunning(false);
      showToast('success', 'تم تشغيل الفحص الآلي بنجاح ⚡', `تم فحص الاشتراكات وتوليد ${generated.length} تنبيه جديد`);
      reloadData();
    }, 1200);
  };

  // Retry Item
  const handleRetryItem = (itemId: string) => {
    const res = db.retryNotificationItem(itemId);
    if (res.success) {
      showToast('success', 'تمت إعادة الإرسال', res.message);
      reloadData();
    }
  };

  // Delete Retry Item
  const handleDeleteRetryItem = (itemId: string) => {
    db.deleteNotificationRetryItem(itemId);
    showToast('info', 'تم الحذف', 'تم حذف العنصر من طابور المحاولات');
    reloadData();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="مراقب المهام المجدولة وطابور إعادة المحاولة (Scheduler & Retry Queue)"
      maxWidth="lg"
    >
      <div className="space-y-4 text-right text-xs" dir="rtl">
        {/* Scheduler Status Header Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#18181B] to-zinc-900 border border-zinc-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Server className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-zinc-100">محرك الفحص الآلي اليومي (Auto-Scheduler)</h3>
                <Badge variant="success" size="sm">نشط في الخلفية</Badge>
              </div>
              <p className="text-zinc-400 text-[11px] mt-0.5 font-mono">
                آخر تشغيل: {formatDateTime(status.lastRunAt || new Date().toISOString())}
              </p>
            </div>
          </div>

          {user?.role === 'admin' && (
            <button
              type="button"
              disabled={isRunning}
              onClick={handleRunNow}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'جاري الفحص الآن...' : 'تشغيل فوري (Run Now)'}</span>
            </button>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center">
            <span className="text-[10px] text-zinc-400 block font-bold">إجمالي دورات الفحص</span>
            <span className="text-xl font-black font-mono text-zinc-900 dark:text-zinc-100">{status.totalChecksCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center">
            <span className="text-[10px] text-zinc-400 block font-bold">تنبيهات مرسلة</span>
            <span className="text-xl font-black font-mono text-emerald-500">{status.messagesSentCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center">
            <span className="text-[10px] text-zinc-400 block font-bold">تنبيهات فاشلة</span>
            <span className="text-xl font-black font-mono text-rose-500">{status.messagesFailedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] text-center">
            <span className="text-[10px] text-zinc-400 block font-bold">حالات تم تحديثها</span>
            <span className="text-xl font-black font-mono text-purple-400">{status.subscriptionsUpdatedCount}</span>
          </div>
        </div>

        {/* Notification Retry Queue Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-orange-500" />
              <span>طابور إعادة محاولة التنبيهات الفاشلة (Retry Queue) ({retryQueue.length})</span>
            </h4>
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3 h-3" />} onClick={reloadData}>
              تحديث
            </Button>
          </div>

          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {retryQueue.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-[#27272A] text-zinc-400 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="font-bold text-xs">طابور إعادة المحاولة نظيف تماماً!</p>
                <p className="text-[10px]">جميع الرسائل والتنبيهات تم إرسالها للعملاء بنجاح دون أخطاء.</p>
              </div>
            ) : (
              retryQueue.map(item => (
                <div key={item.id} className="p-3 rounded-xl bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{item.customerName}</span>
                      <span className="font-mono text-[10px] text-pink-500 font-bold">#{item.subscriptionNumber}</span>
                      <Badge variant={item.status === 'resolved' ? 'success' : item.status === 'retrying' ? 'warning' : 'danger'} size="sm">
                        {item.status === 'resolved' ? 'تم الحل' : item.status === 'retrying' ? 'قيد الإعادة' : 'فشل'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 truncate max-w-sm">{item.message}</p>
                    <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                      محاولة {item.attempts}/{item.maxAttempts} • عبر {item.channel}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRetryItem(item.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>إعادة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRetryItem(item.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
