'use client';

import { useEffect, useState } from 'react';
import { Notification } from '@/lib/notification-types';

interface ToastProps {
  notification: Notification;
  onClose: () => void;
}

export function Toast({ notification, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000); // Auto-dismiss after 6 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'order':
        return '📦';
      case 'message':
        return '💬';
      case 'service':
        return '🔧';
      case 'payment':
        return '💳';
      case 'status_update':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'order':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'message':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'service':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'payment':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'status_update':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <div
      className={`mb-3 p-4 rounded-lg border-l-4 shadow-md flex items-start gap-3 ${getColors()} animate-slideIn`}
    >
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

interface NotificationContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export function NotificationContainer({
  notifications,
  onRemove,
}: NotificationContainerProps) {
  if (notifications.length === 0) return null;

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

/* Add to globals.css or tailwind config */
export const toastStyles = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slideIn {
    animation: slideIn 0.3s ease-out;
  }
`;
