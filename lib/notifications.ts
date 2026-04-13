/**
 * Notification Service
 * Manages real-time notifications using Supabase Realtime subscriptions
 * Replaces polling-based updates with live event streams
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type NotificationType = 'order' | 'message' | 'service' | 'payment' | 'status_update';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: Date;
  read: boolean;
}

/**
 * Listen for new orders
 * Emits when order status changes to 'confirmed'
 */
export function subscribeToNewOrders(
  onUpdate: (order: any) => void,
  onError?: (error: Error) => void
): RealtimeChannel {
  return supabase
    .channel('orders_updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: "order_status=eq.confirmed",
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✓ Subscribed to order updates');
      } else if (status === 'CLOSED') {
        console.log('Order subscription closed');
      }
    });
}

/**
 * Listen for new admin messages for a specific order
 */
export function subscribeToOrderMessages(
  orderRef: string,
  onNewMessage: (message: any) => void,
  onError?: (error: Error) => void
): RealtimeChannel {
  return supabase
    .channel(`order_messages_${orderRef}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'order_messages',
        filter: `order_ref=eq.${orderRef}`,
      },
      (payload) => {
        onNewMessage(payload.new);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✓ Subscribed to messages for order ${orderRef}`);
      }
    });
}

/**
 * Listen for order status updates for a specific customer
 */
export function subscribeToOrderStatus(
  orderRef: string,
  onStatusChange: (status: string, updatedOrder: any) => void
): RealtimeChannel {
  return supabase
    .channel(`order_status_${orderRef}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `order_ref=eq.${orderRef}`,
      },
      (payload) => {
        const newStatus = payload.new.order_status;
        onStatusChange(newStatus, payload.new);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✓ Subscribed to status updates for ${orderRef}`);
      }
    });
}

/**
 * Listen for new service requests
 */
export function subscribeToServiceRequests(
  onNewRequest: (request: any) => void
): RealtimeChannel {
  return supabase
    .channel('service_requests_new')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'service_requests',
      },
      (payload) => {
        onNewRequest(payload.new);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✓ Subscribed to new service requests');
      }
    });
}

/**
 * Listen for service request status updates
 */
export function subscribeToServiceRequestUpdates(
  onUpdate: (request: any) => void
): RealtimeChannel {
  return supabase
    .channel('service_requests_updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_requests',
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✓ Subscribed to service request updates');
      }
    });
}

/**
 * Listen for pending payment reviews
 */
export function subscribeToPendingPayments(
  onNewPayment: (payment: any) => void
): RealtimeChannel {
  return supabase
    .channel('pending_payments')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: "order_status=eq.payment_pending_admin_review",
      },
      (payload) => {
        onNewPayment(payload.new);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✓ Subscribed to pending payments');
      }
    });
}

/**
 * Create a notification object
 */
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

/**
 * Unsubscribe from a channel
 */
export async function unsubscribeFromChannel(channel: RealtimeChannel): Promise<void> {
  await supabase.removeChannel(channel);
}
