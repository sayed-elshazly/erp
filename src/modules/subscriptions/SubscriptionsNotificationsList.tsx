// =============================================================
// NZM JKR TOP UP ERP — Subscriptions Smart Notifications Center
// =============================================================

import React, { useState, useMemo } from 'react';
import { SubscriptionNotification, SubscriptionNotificationTemplate } from '../../types/subscription.types';
import { db } from '../../database/db';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Bell,
  MessageCircle,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Search,
  Sparkles,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../utils/formatters';

export const SubscriptionsNotificationsList: React.FC = () => {
  const { showToast } = useNotifications();

  const [notifications, setNotifications] = useState<SubscriptionNotification[]>(() => db.getSubscriptionNotifications());
  const [settings, setSettings] = useState(() => db.getSubscriptionSettings());
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const reloadData = () => {
    setNotifications(db.generateSubscriptionNotifications());
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filterType !== 'all' && n.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCust = n.customerName.toLowerCase().includes(q) || n.customerPhone.includes(q);
        const matchPlan = n.planName.toLowerCase().includes(q);
        const matchSub = n.subscriptionNumber.toLowerCase().includes(q);
        if (!matchCust && !matchPlan && !matchSub) return false;
      }
      return true;
    });
  }, [notifications, filterType, searchQuery]);

  // Send WhatsApp Reminder
  const handleSendWhatsApp = (n: SubscriptionNotification) => {
    const phoneToUse = n.customerPhone.replace(/[^0-9]/g, '');
    const cleanPhone = phoneToUse.startsWith('0') ? '2' + phoneToUse : phoneToUse;

    // Find template or build default message
    const tpl = settings.templates.find((t: any) => t.type === n.type);
    let msgText = tpl?.messageTemplate || n.message;
    msgText = msgText
      .replace('{customer_name}', n.customerName)
      .replace('{plan_name}', n.planName)
      .replace('{expiry_date}', formatDate(n.expiryDate))
      .replace('{subscription_id}', n.subscriptionNumber);

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgText)}` : `https://wa.me/?text=${encodeURIComponent(msgText)}`;
    window.open(url, '_blank');

    showToast('success', 'تم فتح واتساب', `جاري إرسال إشعار التذكير للعميل ${n.customerName}`);
  };

  // Send Telegram Reminder
  const handleSendTelegram = (n: SubscriptionNotification) => {
    const msg = encodeURIComponent(`⚠️ تذكير اشتراك #${n.subscriptionNumber}\nالعميل: ${n.customerName}\nالباقة: ${n.planName}\nتاريخ الانتهاء: ${formatDate(n.expiryDate)}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${msg}`, '_blank');
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'expired_today':
        return <Badge variant="danger">ينتهي اليوم ⚠️</Badge>;
      case 'expiring_3d':
        return <Badge variant="warning">خلال 3 أيام ⏳</Badge>;
      case 'expiring_7d':
        return <Badge variant="pink">خلال 7 أيام 📅</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-right text-xs" dir="rtl">
      {/* 1. Top Summary Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-amber-500/10 border border-pink-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-pink-600 text-white shadow-md">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
              مركز تنبيهات وإشعارات التجديد الذكية
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              فحص تلقائي يومي لتواريخ الانتهاء وتجهيز رسائل التذكير المباشرة عبر WhatsApp وتيليجرام.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={reloadData}
          className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>تحديث فحص التنبيهات</span>
        </button>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white dark:bg-[#121215] p-3 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="بحث باسم العميل، الهاتف، أو رقم الاشتراك..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl py-2 pr-9 pl-4 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-pink-500 transition-all font-sans"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-pink-500"
          >
            <option value="all">كافة التنبيهات ({notifications.length})</option>
            <option value="expired_today">ينتهي اليوم ({notifications.filter(n => n.type === 'expired_today').length})</option>
            <option value="expiring_3d">خلال 3 أيام ({notifications.filter(n => n.type === 'expiring_3d').length})</option>
            <option value="expiring_7d">خلال 7 أيام ({notifications.filter(n => n.type === 'expiring_7d').length})</option>
          </select>
        </div>
      </div>

      {/* 3. Notifications List */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <Card className="py-12 text-center text-zinc-400 space-y-2 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A]">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-sm">لا توجد تنبيهات معلقة حالياً</p>
            <p className="text-[11px]">جميع اشتراكات العملاء سارية ولا تحتاج إلى إرسال تذكيرات الآن</p>
          </Card>
        ) : (
          filteredNotifications.map(notif => (
            <Card
              key={notif.id}
              className="p-3.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs hover:border-pink-500/40 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                    {notif.customerName}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">({notif.customerPhone})</span>
                  {getTypeBadge(notif.type)}
                </div>

                <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                  باقة: <strong className="text-pink-600 dark:text-pink-400">{notif.planName}</strong> • رقم الاشتراك: <span className="font-mono font-bold">#{notif.subscriptionNumber}</span> • تاريخ الانتهاء: <span className="font-mono font-bold text-rose-500">{formatDate(notif.expiryDate)}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(notif)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>إرسال واتساب</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendTelegram(notif)}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>تيليجرام</span>
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
