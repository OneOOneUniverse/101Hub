'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Notification, NotificationType, createNotification } from '@/lib/notifications';
import { NotificationContainer } from './NotificationToast';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      data?: Record<string, any>
    ) => {
      const notification = createNotification(type, title, message, data);
      setNotifications((prev) => [notification, ...prev]);

      // Auto-remove after 6 seconds if not manually closed
      const timer = setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id)
        );
      }, 6000);

      return () => clearTimeout(timer);
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAll,
      }}
    >
      {children}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within NotificationProvider'
    );
  }
  return context;
}
