'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Notification, NotificationType, createNotification } from '@/lib/notification-types';

function OrderIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>; }
function ChatIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>; }
function WrenchIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>; }
function CardIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
function CheckCircleIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>; }
function BellIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>; }
function InfoIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>; }

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

  const getIcon = (): ReactNode => {
    const icons: Record<NotificationType, ReactNode> = {
      order: <OrderIcon />,
      message: <ChatIcon />,
      service: <WrenchIcon />,
      payment: <CardIcon />,
      status_update: <CheckCircleIcon />,
      promo: <BellIcon />,
      system: <InfoIcon />,
    };
    return icons[notification.type] ?? <InfoIcon />;
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
      <span className="flex-shrink-0 text-current opacity-80">{getIcon()}</span>
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
