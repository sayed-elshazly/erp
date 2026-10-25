// =============================================================
// NZM JKR TOP UP ERP — Central Notification Center
// =============================================================

import React, { useState, useMemo } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useTabs } from '../../context/TabsContext';
import { db } from '../../database/db';
import { BrokerageNotificationSyncService } from '../../services/notifications/brokerageNotificationSyncService';
import {
  Bell,
  Check,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  Calendar,
  CreditCard,
  UserPlus,
  ShieldAlert,
  ArrowRight,
  X,
  Trash2
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface NotificationCenterProps {
  onNavigateSection?: (section: string) => void;
}

type NotificationFilter =
  | 'all'
  | 'today'
  | 'overdue'
  | 'wallet_expired'
  | 'middleman_subscriptions'
  | 'middleman'
  | 'subscriptions'
  | 'unread'
  | 'read';

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigateSection }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissNotification, refreshNotifications } = useNotifications();
  const { openTab } = useTabs();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');

  const filteredNotifications = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return notifications.filter(item => {
      if (activeFilter === 'unread') return !item.isRead;
      if (activeFilter === 'read') return item.isRead;
      if (activeFilter === 'wallet_expired') return item.metadata?.badgeType === 'wallet_expired';
      if (activeFilter === 'today') {
        return (
          item.metadata?.badgeType === 'today_followups' ||
          item.metadata?.appointmentDate === todayStr ||
          item.timestamp.startsWith(todayStr)
        );
      }
      if (activeFilter === 'overdue') {
        return (
          item.metadata?.badgeType === 'followup_overdue' ||
          item.metadata?.badgeType === 'wallet_expired' ||
          item.type === 'error'
        );
      }
      if (activeFilter === 'middleman_subscriptions') {
        return (
          item.metadata?.category === 'middleman' ||
          item.metadata?.category === 'subscription' ||
          item.linkSection?.includes('middleman') ||
          item.linkSection?.includes('subscription')
        );
      }
      if (activeFilter === 'middleman') {
        return item.metadata?.category === 'middleman' || item.linkSection?.includes('middleman');
      }
      if (activeFilter === 'subscriptions') {
        return item.metadata?.category === 'subscription' || item.linkSection?.includes('subscription');
      }
      return true;
    });
  }, [notifications, activeFilter]);

  const getBadge = (item: any) => {
    const badgeType = item.metadata?.badgeType;
    switch (badgeType) {
      case 'followup_due':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[10px] inline-flex items-center gap-1">
            🔔 موعد متابعة
          </span>
        );
      case 'followup_overdue':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[10px] inline-flex items-center gap-1">
            ⚠️ متابعة متأخرة
          </span>
        );
      case 'wallet_expired':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[10px] inline-flex items-center gap-1 border border-rose-500/30">
            ⚠️ رصيد منتهي
          </span>
        );
      case 'today_followups':
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[10px] inline-flex items-center gap-1">
            📅 موعد اليوم
          </span>
        );
      case 'expiring_subscription':
        return (
          <span className="px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-600 dark:text-pink-400 font-bold text-[10px] inline-flex items-center gap-1">
            💳 اشتراك سينتهي
          </span>
        );
      case 'new_middleman':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1">
            🆕 وسيط جديد
          </span>
        );
      default:
        return null;
    }
  };

  const getIcon = (item: any) => {
    const badgeType = item.metadata?.badgeType;
    if (badgeType === 'wallet_expired') return <Clock className="w-4 h-4 text-rose-500 shrink-0" />;
    if (badgeType === 'followup_due') return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
    if (badgeType === 'followup_overdue') return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />;
    if (badgeType === 'today_followups') return <Calendar className="w-4 h-4 text-blue-500 shrink-0" />;
    if (badgeType === 'expiring_subscription') return <CreditCard className="w-4 h-4 text-pink-500 shrink-0" />;
    if (badgeType === 'new_middleman') return <UserPlus className="w-4 h-4 text-emerald-500 shrink-0" />;

    switch (item.type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'action_required':
        return <Clock className="w-4 h-4 text-orange-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  const handleNotificationClick = (n: any) => {
    if (!n.isRead) markAsRead(n.id);

    const action = n.metadata?.actionTarget;
    if (action) {
      if (action.section === 'middleman_clients') {
        const custId = action.entityId || n.metadata?.middlemanId;
        const cust = custId ? db.getCustomerById(custId) || db.getMiddlemanClients(true).find(c => c.id === custId) : null;

        openTab({
          id: 'middleman_clients',
          title: 'عملاء الوساطة',
          section: 'middleman_clients',
          iconType: 'customers',
          payload: cust ? { customer: cust, filterToday: action.payload?.filterToday } : action.payload
        });
        setIsOpen(false);
        return;
      }

      if (action.section === 'middleman_deals') {
        openTab({
          id: 'middleman_deals',
          title: 'صفقات الوساطة',
          section: 'middleman_deals',
          iconType: 'tickets',
          payload: { dealId: action.entityId || n.metadata?.dealId }
        });
        setIsOpen(false);
        return;
      }

      if (action.section === 'subscriptions_list') {
        openTab({
          id: 'subscriptions_list',
          title: 'سجل وإدارة الاشتراكات',
          section: 'subscriptions_list',
          iconType: 'subscriptions' as any,
          payload: { subscriptionId: action.entityId || n.metadata?.subscriptionId }
        });
        setIsOpen(false);
        return;
      }

      if (action.modalType === 'expired_balance_management' || n.metadata?.badgeType === 'wallet_expired') {
        const partyType = n.metadata?.partyType;
        const partyId = n.metadata?.partyId || action.entityId;
        if (partyType === 'dealer') {
          openTab({
            id: 'dealers_list',
            title: 'سجل تجار الجملة',
            section: 'dealers_list',
            iconType: 'dealers' as any,
            payload: { dealerId: partyId, openExpiryModal: true }
          });
        } else {
          openTab({
            id: 'customers_list',
            title: 'دليل الزبائن',
            section: 'customers_list',
            iconType: 'customers' as any,
            payload: { customerId: partyId, openExpiryModal: true }
          });
        }
        setIsOpen(false);
        return;
      }
    }

    // Default Section Routing
    if (n.linkSection && onNavigateSection) {
      onNavigateSection(n.linkSection);
      setIsOpen(false);
    }
  };

  const handleQuickComplete = (e: React.MouseEvent, n: any) => {
    e.stopPropagation();
    const followupId = n.metadata?.entityId;
    if (followupId) {
      BrokerageNotificationSyncService.completeFollowupAndDismiss(followupId);
      refreshNotifications();
    } else {
      dismissNotification(n.id);
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button with Animated Red Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none cursor-pointer"
        title="مركز الإشعارات والتنبيهات (الوساطة والاشتراكات)"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-sm shadow-red-500/40">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute left-0 mt-2 w-84 sm:w-[450px] max-w-[calc(100vw-24px)] bg-white dark:bg-[#1A1A1E] border border-gray-200 dark:border-[#2E2E34] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in text-right text-xs"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-3.5 border-b border-gray-100 dark:border-[#2E2E34] flex items-center justify-between bg-gray-50/70 dark:bg-[#161619]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className="font-black text-xs text-gray-900 dark:text-zinc-100">
                  مركز الإشعارات والمتابعات
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} غير مقروء
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> قراءة الكل
                </button>
              )}
            </div>

            {/* Filter Tabs Bar (All user requested tabs) */}
            <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-[#141416] border-b border-gray-100 dark:border-[#2E2E34] overflow-x-auto text-xs">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors shrink-0 cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-white dark:bg-[#25252A] text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                الكل ({notifications.length})
              </button>

              <button
                onClick={() => setActiveFilter('middleman_subscriptions')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors shrink-0 cursor-pointer ${
                  activeFilter === 'middleman_subscriptions'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                الوساطة والاشتراكات
              </button>

              <button
                onClick={() => setActiveFilter('today')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors shrink-0 cursor-pointer ${
                  activeFilter === 'today'
                    ? 'bg-blue-500/15 text-blue-500 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📅 اليوم
              </button>

              <button
                onClick={() => setActiveFilter('overdue')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors shrink-0 cursor-pointer ${
                  activeFilter === 'overdue'
                    ? 'bg-rose-500/15 text-rose-500 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ⚠️ المتأخرة
              </button>

              <button
                onClick={() => setActiveFilter('wallet_expired')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors shrink-0 cursor-pointer ${
                  activeFilter === 'wallet_expired'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ⚠️ أرصدة منتهية ({notifications.filter(n => n.metadata?.badgeType === 'wallet_expired').length})
              </button>

              <button
                onClick={() => setActiveFilter('middleman')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors shrink-0 cursor-pointer ${
                  activeFilter === 'middleman'
                    ? 'bg-purple-500/15 text-purple-400 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                الوسطاء
              </button>

              <button
                onClick={() => setActiveFilter('subscriptions')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors shrink-0 cursor-pointer ${
                  activeFilter === 'subscriptions'
                    ? 'bg-pink-500/15 text-pink-400 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                الاشتراكات 💳
              </button>

              <button
                onClick={() => setActiveFilter('unread')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors shrink-0 cursor-pointer ${
                  activeFilter === 'unread'
                    ? 'bg-white dark:bg-[#25252A] text-amber-500 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                غير المقروءة ({unreadCount})
              </button>
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-[#25252A]">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 text-xs space-y-1">
                  <CheckCircle2 className="w-7 h-7 text-zinc-500 mx-auto" />
                  <p className="font-bold">لا توجد إشعارات في هذا التصنيف</p>
                  <p className="text-[10px] text-zinc-500">تمت متابعة كافة المواعيد والمهام بنجاح</p>
                </div>
              ) : (
                filteredNotifications.map(n => {
                  const badge = getBadge(n);
                  const isFollowup = n.metadata?.badgeType === 'followup_due' || n.metadata?.badgeType === 'followup_overdue';

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 flex items-start gap-3 hover:bg-gray-50/80 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors group ${
                        !n.isRead ? 'bg-amber-500/5 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      <div className="mt-0.5">{getIcon(n)}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {badge}
                            <h4
                              className={`text-xs font-bold leading-tight ${
                                !n.isRead ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'
                              }`}
                            >
                              {n.title}
                            </h4>
                          </div>

                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                          {n.message}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100/60 dark:border-[#2E2E34]/50">
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {formatDateTime(n.timestamp)}
                          </span>

                          <div className="flex items-center gap-2">
                            {isFollowup && (
                              <button
                                type="button"
                                onClick={e => handleQuickComplete(e, n)}
                                className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                title="إنهاء المتابعة وحذف الإشعار تلقائياً"
                              >
                                <Check className="w-3 h-3" />
                                <span>إنهاء المتابعة</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                dismissNotification(n.id);
                              }}
                              className="text-zinc-400 hover:text-rose-500 p-0.5 transition-colors"
                              title="إزالة الإشعار"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Footer Info */}
            <div className="p-2.5 bg-gray-50/70 dark:bg-[#161619] border-t border-gray-100 dark:border-[#2E2E34] flex items-center justify-between text-[10px] text-zinc-400">
              <span>تختفي الإشعارات تلقائياً فور إنهاء المتابعة أو تجديد الاشتراك</span>
              <span className="font-mono">{notifications.length} إشعار كلي</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
