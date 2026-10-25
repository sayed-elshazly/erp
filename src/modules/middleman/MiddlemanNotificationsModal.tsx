// =============================================================
// NZM JKR TOP UP ERP — Middleman Notifications Modal
// =============================================================

import React from 'react';
import { MiddlemanNotificationItem } from '../../types/middleman.types';
import { db } from '../../database/db';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Trash2,
  ShieldAlert,
  Archive,
  Store
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface MiddlemanNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTarget: (targetType: 'deal' | 'account' | 'client', targetId: string) => void;
}

export const MiddlemanNotificationsModal: React.FC<MiddlemanNotificationsModalProps> = ({
  isOpen,
  onClose,
  onSelectTarget
}) => {
  const notifications = db.getMiddlemanNotifications();

  const handleMarkAllRead = () => {
    notifications.forEach(n => db.markMiddlemanNotificationRead(n.id));
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    db.dismissMiddlemanNotification(id);
  };

  const handleNotificationClick = (item: MiddlemanNotificationItem) => {
    db.markMiddlemanNotificationRead(item.id);
    onSelectTarget(item.targetType, item.targetId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="مركز تنبيهات وإشعارات الوساطة الذكي"
      maxWidth="lg"
    >
      <div className="space-y-4 text-right text-xs" dir="rtl">
        {/* Top Actions */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#27272A]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-zinc-800 dark:text-zinc-200">
              التنبيهات المعلقة ({notifications.filter(n => !n.isRead).length})
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            تحديد الكل كمقروء
          </Button>
        </div>

        {/* Notifications List */}
        <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-zinc-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-sm">لا توجد تنبيهات معلقة حالياً</p>
              <p className="text-[11px]">كل الوساطات والحسابات تعمل بشكل منتظم</p>
            </div>
          ) : (
            notifications.map(item => {
              const isUrgent = item.urgency === 'high';
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    item.isRead
                      ? 'bg-gray-50/50 dark:bg-[#141417] border-gray-200 dark:border-[#27272A] opacity-75'
                      : isUrgent
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl mt-0.5 ${
                        isUrgent
                          ? 'bg-rose-500/20 text-rose-500'
                          : 'bg-amber-500/20 text-amber-500'
                      }`}
                    >
                      {item.type === 'dispute_alert' ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : item.type === 'unsold_account' ? (
                        <Archive className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                          {item.title}
                        </span>
                        {!item.isRead && (
                          <Badge variant={isUrgent ? 'danger' : 'warning'} size="sm">
                            جديد
                          </Badge>
                        )}
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDateTime(item.createdAt)}
                        </span>
                        <span className="text-amber-500 font-bold flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> اضغط للفتح المباشر
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={e => handleDismiss(item.id, e)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors"
                    title="حذف التنبيه"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
