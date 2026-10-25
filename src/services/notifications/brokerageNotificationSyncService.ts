// =============================================================
// NZM JKR TOP UP ERP — Brokerage & Subscriptions Notification Sync Engine
// =============================================================

import { NotificationItem } from '../../types/common.types';
import { MiddlemanFollowup } from '../../types/middleman.types';
import { CustomerSubscription } from '../../types/subscription.types';
import { db } from '../../database/db';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { WalletExpirationService } from '../wallet/walletExpirationService';

export class BrokerageNotificationSyncService {
  /**
   * Main synchronization routine: scans follow-ups, subscriptions, new middlemen,
   * and expired wallet balances (cashback > 6mo, referral > 12mo), generates required alerts,
   * and auto-dismisses completed/invalid items.
   */
  public static syncAllNotifications(): NotificationItem[] {
    const existing = db.getNotifications();
    const followups = db.getMiddlemanFollowups();
    const subscriptions = db.getSubscriptions();
    const middlemanClients = db.getMiddlemanClients(true).filter(c => !c.isArchived);
    const deals = db.getMiddlemanDeals(true);
    const customers = db.getCustomers(false);
    const dealers = db.getDealers();
    const allCustomerTxs = db.getUnifiedWalletTransactions();
    const allDealerTxs = db.getDealerUnifiedWalletTransactions();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 1. Auto-Dismissal: Filter out notifications whose source is now resolved
    const activeFollowupIds = new Set(followups.filter(f => f.status === 'pending').map(f => f.id));
    const activeSubscriptionIds = new Set(subscriptions.filter(s => s.status === 'active' || s.status === 'expiring_soon').map(s => s.id));
    const activeMiddlemanClientIds = new Set(middlemanClients.map(c => c.id));

    // Calculate current expired parties (Cashback > 6mo, Referral > 12mo)
    const currentExpiredParties = WalletExpirationService.getAllExpiredParties(
      customers,
      dealers,
      allCustomerTxs,
      allDealerTxs
    );
    const activeExpiredPartyIds = new Set(currentExpiredParties.map(p => `${p.partyType}_${p.partyId}`));

    let cleaned = existing.filter(n => {
      // If it's a wallet expiration notification, dismiss if no longer expired
      if (n.metadata?.badgeType === 'wallet_expired') {
        const key = `${n.metadata.partyType}_${n.metadata.partyId}`;
        if (!activeExpiredPartyIds.has(key)) {
          return false; // Auto-dismissed on extension or transfer
        }
      }

      // If it's a follow-up notification, keep only if follow-up is still pending
      if (n.metadata?.badgeType === 'followup_due' || n.metadata?.badgeType === 'followup_overdue') {
        const fId = n.metadata.entityId;
        if (fId && !activeFollowupIds.has(fId)) {
          return false; // Auto-dismissed
        }
      }

      // If it's an expiring subscription notification, check if still active/expiring
      if (n.metadata?.badgeType === 'expiring_subscription') {
        const subId = n.metadata.subscriptionId || n.metadata.entityId;
        if (subId) {
          const sub = subscriptions.find(s => s.id === subId);
          if (!sub || sub.status === 'renewed' || sub.status === 'cancelled') {
            return false; // Auto-dismissed on renewal or cancellation
          }
          // Also if renewed with extended date > 7 days
          const diffDays = Math.ceil((new Date(sub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 7) {
            return false;
          }
        }
      }

      // If it's a new middleman notification, check if client still exists
      if (n.metadata?.badgeType === 'new_middleman') {
        const clientId = n.metadata.middlemanId || n.metadata.entityId;
        if (clientId && !activeMiddlemanClientIds.has(clientId)) {
          return false; // Auto-dismissed if deleted
        }
      }

      return true;
    });

    const newAlerts: NotificationItem[] = [];

    // 2. Process Middleman Follow-ups
    let todayFollowupsCount = 0;

    followups.forEach(f => {
      if (f.status !== 'pending') return;

      const isToday = f.dueDate === todayStr;
      const isPast = f.dueDate < todayStr || (isToday && f.dueTime && f.dueTime < nowTimeStr);

      if (isToday) todayFollowupsCount++;

      if (isPast) {
        // Overdue Alert
        const alertId = `ntf_mm_overdue_${f.id}`;
        const exists = cleaned.some(n => n.id === alertId);

        if (!exists) {
          newAlerts.push({
            id: alertId,
            type: 'error',
            title: `⚠️ يوجد وسيط متأخر يحتاج متابعة: ${f.middlemanName}`,
            message: `تجاوز موعد المتابعة المقرر (${formatDate(f.dueDate)} الساعة ${f.dueTime || '—'}). موضوع المتابعة: ${f.title}`,
            linkSection: 'middleman_clients',
            isRead: false,
            timestamp: new Date().toISOString(),
            metadata: {
              category: 'middleman',
              badgeType: 'followup_overdue',
              badgeLabel: 'متابعة متأخرة',
              entityId: f.id,
              middlemanId: f.middlemanId,
              dealId: f.dealId,
              appointmentDate: f.dueDate,
              appointmentTime: f.dueTime,
              actionTarget: {
                section: 'middleman_clients',
                modalType: 'middleman_client_profile',
                entityId: f.middlemanId,
                payload: { customerId: f.middlemanId }
              }
            }
          });
        }
      } else if (isToday) {
        // Today Due Alert
        const alertId = `ntf_mm_due_${f.id}`;
        const exists = cleaned.some(n => n.id === alertId);

        if (!exists) {
          newAlerts.push({
            id: alertId,
            type: 'action_required',
            title: `🔔 موعد متابعة الوسيط: ${f.middlemanName}`,
            message: `التاريخ: ${formatDate(f.dueDate)} | الساعة: ${f.dueTime || 'خلال اليوم'} • ${f.title}`,
            linkSection: 'middleman_clients',
            isRead: false,
            timestamp: new Date().toISOString(),
            metadata: {
              category: 'middleman',
              badgeType: 'followup_due',
              badgeLabel: 'موعد متابعة',
              entityId: f.id,
              middlemanId: f.middlemanId,
              dealId: f.dealId,
              appointmentDate: f.dueDate,
              appointmentTime: f.dueTime,
              actionTarget: {
                section: 'middleman_clients',
                modalType: 'middleman_client_profile',
                entityId: f.middlemanId,
                payload: { customerId: f.middlemanId }
              }
            }
          });
        }
      }
    });

    // 3. Process Today's Follow-up Summary Notification
    if (todayFollowupsCount > 0) {
      const summaryId = `ntf_today_followups_${todayStr}`;
      const exists = cleaned.some(n => n.id === summaryId);
      if (!exists) {
        newAlerts.push({
          id: summaryId,
          type: 'info',
          title: `📅 موعد اليوم: لديك اليوم ${todayFollowupsCount} مواعيد متابعة`,
          message: `لديك اليوم ${todayFollowupsCount} مواعيد متابعة مسجلة للوسطاء والصفقات قيد الانتظار. اضغط لعرض قائمة اليوم.`,
          linkSection: 'middleman_clients',
          isRead: false,
          timestamp: new Date().toISOString(),
          metadata: {
            category: 'middleman',
            badgeType: 'today_followups',
            badgeLabel: 'موعد اليوم',
            actionTarget: {
              section: 'middleman_clients',
              payload: { filterToday: true }
            }
          }
        });
      }
    }

    // 4. Process Expiring Subscriptions (7 days, 3 days, 1 day, today)
    subscriptions.forEach(sub => {
      if (sub.status !== 'active' && sub.status !== 'expiring_soon') return;

      const endMs = new Date(sub.endDate).getTime();
      const diffDays = Math.ceil((endMs - now.getTime()) / (1000 * 60 * 60 * 24));

      let thresholdLabel = '';
      if (diffDays <= 0) thresholdLabel = 'اليوم';
      else if (diffDays === 1) thresholdLabel = 'بعد يوم واحد';
      else if (diffDays <= 3) thresholdLabel = `بعد ${diffDays} أيام`;
      else if (diffDays <= 7) thresholdLabel = `بعد ${diffDays} أيام`;

      if (thresholdLabel) {
        const subAlertId = `ntf_sub_exp_${sub.id}_${diffDays <= 0 ? 'today' : diffDays + 'd'}`;
        const exists = cleaned.some(n => n.id === subAlertId || (n.metadata?.subscriptionId === sub.id && !n.isRead));

        if (!exists) {
          newAlerts.push({
            id: subAlertId,
            type: diffDays <= 1 ? 'warning' : 'info',
            title: `💳 اشتراك العميل ${sub.customerName} ينتهي ${thresholdLabel}`,
            message: `باقة "${sub.planName}" (رقم الاشتراك: ${sub.subscriptionNumber}) تنتهي بتاريخ ${formatDate(sub.endDate)}. يتطلب التواصل للتجديد.`,
            linkSection: 'subscriptions_list',
            isRead: false,
            timestamp: new Date().toISOString(),
            metadata: {
              category: 'subscription',
              badgeType: 'expiring_subscription',
              badgeLabel: 'اشتراك سينتهي',
              entityId: sub.id,
              subscriptionId: sub.id,
              actionTarget: {
                section: 'subscriptions_list',
                modalType: 'subscription_details',
                entityId: sub.id,
                payload: { subscriptionId: sub.id }
              }
            }
          });
        }
      }
    });

    // 4. Process Expired Wallet Balances (Cashback > 6mo, Referral > 12mo)
    currentExpiredParties.forEach(party => {
      const alertId = `ntf_exp_${party.partyType}_${party.partyId}`;
      const exists = cleaned.some(n => n.id === alertId);
      const totalExpired = Math.round((party.cashbackExpired + party.referralExpired) * 100) / 100;

      if (!exists && totalExpired > 0) {
        const details: string[] = [];
        if (party.cashbackExpired > 0) details.push(`كاش باك: ${formatCurrency(party.cashbackExpired)} (تعدى 6 شهور)`);
        if (party.referralExpired > 0) details.push(`إحالة: ${formatCurrency(party.referralExpired)} (تعدى 12 شهر)`);

        newAlerts.push({
          id: alertId,
          type: 'warning',
          title: `⚠️ رصيد منتهي الصلاحية يتطلب قرارك: ${party.partyName} (${party.partyType === 'customer' ? 'عميل' : 'تاجر'})`,
          message: `إجمالي الرصيد المنتهي: ${formatCurrency(totalExpired)} [${details.join(' • ')}]. يتطلب قرار المالك اليدوي: تمديد الصلاحية أو تحويله للبضاعة كإيراد Breakage.`,
          linkSection: party.partyType === 'customer' ? 'customers_list' : 'dealers_list',
          isRead: false,
          timestamp: new Date().toISOString(),
          metadata: {
            category: 'wallet_expiry',
            badgeType: 'wallet_expired',
            badgeLabel: 'رصيد منتهي الصلاحية',
            partyId: party.partyId,
            partyType: party.partyType,
            partyName: party.partyName,
            totalExpired,
            cashbackExpired: party.cashbackExpired,
            referralExpired: party.referralExpired,
            actionTarget: {
              section: party.partyType === 'customer' ? 'customers_list' : 'dealers_list',
              modalType: 'expired_balance_management',
              entityId: party.partyId,
              payload: { partyId: party.partyId, partyType: party.partyType }
            }
          }
        });
      }
    });

    // 5. Merge, Deduplicate & Save
    const combined = [...newAlerts, ...cleaned];
    // Sort with unread and high-priority first, then latest timestamp
    combined.sort((a, b) => {
      if (!a.isRead && b.isRead) return -1;
      if (a.isRead && !b.isRead) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    db.setNotifications(combined.slice(0, 100));
    return combined;
  }

  /**
   * Helper to instantly complete a follow-up and auto-dismiss its alert
   */
  public static completeFollowupAndDismiss(followupId: string, completedBy?: string): void {
    db.completeMiddlemanFollowup(followupId, completedBy);
    db.removeNotification(`ntf_mm_due_${followupId}`);
    db.removeNotification(`ntf_mm_overdue_${followupId}`);
    db.removeNotificationsByEntity(followupId);
  }

  /**
   * Helper to schedule a new follow-up and immediately trigger an alert check
   */
  public static scheduleFollowup(followup: MiddlemanFollowup): void {
    db.saveMiddlemanFollowup(followup);
    this.syncAllNotifications();
  }
}
