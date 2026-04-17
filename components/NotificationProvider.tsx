'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Notification, NotificationType, createNotification } from '@/lib/notification-types';

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

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Separate Toast component with minimal dependencies
function Toast({ 
  notification, 
  onClose 
}: { 
  notification: Notification; 
  onClose: () => void;
}) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    const icons: Record<NotificationType, string> = {
      order: '📦',
      message: '💬',
      service: '🔧',
      payment: '💳',
      status_update: '✅',
      promo: '🎉',
      system: 'ℹ️',
    };
    return icons[notification.type] || 'ℹ️';
  };

  const getColors = () => {
    const colors: Record<NotificationType, string> = {
      order: 'bg-blue-50 border-blue-200 text-blue-900',
      message: 'bg-purple-50 border-purple-200 text-purple-900',
      service: 'bg-amber-50 border-amber-200 text-amber-900',
      payment: 'bg-green-50 border-green-200 text-green-900',
      status_update: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      promo: 'bg-pink-50 border-pink-200 text-pink-900',
      system: 'bg-gray-50 border-gray-200 text-gray-900',
    };
    return colors[notification.type] || 'bg-gray-50 border-gray-200 text-gray-900';
  };

  return (
    <div className={`mb-3 p-4 rounded-lg border-l-4 shadow-md flex items-start gap-3 ${getColors()} animate-slideIn`}>
      <span className="text-2xl flex-shrink-0">{getIcon()}</span>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm">{notification.title}</h3>
        <p className="text-sm opacity-90 mt-1">{notification.message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-xl opacity-60 hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}

// Notification container
function NotificationContainer({
  notifications,
  onRemove,
}: {
  notifications: Notification[];
  onRemove: (id: string) => void;
}) {
  if (!notifications.length) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 max-w-sm pointer-events-auto"
      role="region"
      aria-label="Notifications"
    >
      <div className="space-y-2">
        {notifications.map((notification) => (
          <Toast
            key={notification.id}
            notification={notification}
            onClose={() => onRemove(notification.id)}
          />
        ))}
      </div>
    </div>
  );
}

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
