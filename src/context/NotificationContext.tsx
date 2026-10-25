import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotificationItem, NotificationType } from '../types/common.types';
import { db } from '../database/db';
import { BrokerageNotificationSyncService } from '../services/notifications/brokerageNotificationSyncService';

interface ToastMessage {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: ToastMessage[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  addNotification: (type: NotificationType, title: string, message: string, linkSection?: string, metadata?: any) => void;
  showToast: (type: NotificationType, title: string, message: string) => void;
  dismissToast: (id: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const refreshNotifications = useCallback(() => {
    try {
      const synced = BrokerageNotificationSyncService.syncAllNotifications();
      setNotifications(synced);
    } catch {
      setNotifications(db.getNotifications());
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
    // Reactive recurring check every 45s for overdue appointments & approaching deadlines
    const interval = setInterval(() => {
      refreshNotifications();
    }, 45000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    db.markNotificationAsRead(id);
    refreshNotifications();
  };

  const markAllAsRead = () => {
    const list = db.getNotifications();
    list.forEach(n => {
      if (!n.isRead) db.markNotificationAsRead(n.id);
    });
    refreshNotifications();
  };

  const dismissNotification = (id: string) => {
    db.removeNotification(id);
    refreshNotifications();
  };

  const showToast = useCallback((type: NotificationType, title: string, message: string) => {
    const toastId = 'toast_' + Date.now() + Math.random().toString(36).substr(2, 4);
    const newToast: ToastMessage = { id: toastId, type, title, message };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addNotification = (
    type: NotificationType,
    title: string,
    message: string,
    linkSection?: string,
    metadata?: any
  ) => {
    db.addNotification({ type, title, message, linkSection, metadata });
    refreshNotifications();
    showToast(type, title, message);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        addNotification,
        showToast,
        dismissToast,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
