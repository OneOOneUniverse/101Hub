/**
 * Notification types — no Supabase dependency.
 * Safe to import in client-side layout components.
 */

export type NotificationType = 'order' | 'message' | 'service' | 'payment' | 'status_update' | 'promo' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: Date;
  read: boolean;
}

export function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>
): Notification {
  return {
    id: `${type}_${Date.now()}_${Math.random()}`,
    type,
    title,
    message,
    data,
    timestamp: new Date(),
    read: false,
  };
}
