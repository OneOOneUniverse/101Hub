/**
 * Notification Service
 * Manages real-time notifications using Supabase Realtime subscriptions
 * Replaces polling-based updates with live event streams
 *
 * NOTE: This file imports supabase — only use it in client components
 * that are NOT in the root layout (to avoid service key exposure).
 * For types only, import from lib/notification-types.ts instead.
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type { NotificationType, Notification } from './notification-types';
export { createNotification } from './notification-types';

/**
 * Listen for new orders
 * Emits when order status changes to 'confirmed'
 */
export function subscribeToNewOrders(
  onUpdate: (order: any) => void,
  onError?: (error: Error) => void
): RealtimeChannel | null {
  try {
    const channel = supabase
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
          try {
            onUpdate(payload.new);
          } catch (err) {
            console.error('Error in onUpdate callback:', err);
            onError?.(err instanceof Error ? err : new Error(String(err)));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✓ Subscribed to order updates');
        } else if (status === 'CLOSED') {
          console.log('Order subscription closed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error for orders');
          onError?.(new Error('Channel error'));
        }
      });
    return channel;
  } catch (error) {
    console.error('Error subscribing to new orders:', error);
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Listen for new admin messages for a specific order
 */
export function subscribeToOrderMessages(
  orderRef: string,
  onNewMessage: (message: any) => void,
  onError?: (error: Error) => void
): RealtimeChannel | null {
  try {
    const channel = supabase
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
          try {
            onNewMessage(payload.new);
          } catch (err) {
            console.error('Error in onNewMessage callback:', err);
            onError?.(err instanceof Error ? err : new Error(String(err)));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✓ Subscribed to messages for order ${orderRef}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error for messages');
          onError?.(new Error('Channel error'));
        }
      });
    return channel;
  } catch (error) {
    console.error('Error subscribing to order messages:', error);
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Listen for order status updates for a specific customer
 */
export function subscribeToOrderStatus(
  orderRef: string,
  onStatusChange: (status: string, updatedOrder: any) => void,
  onError?: (error: Error) => void
): RealtimeChannel | null {
  try {
    const channel = supabase
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
          try {
            const newStatus = payload.new.order_status;
            onStatusChange(newStatus, payload.new);
          } catch (err) {
            console.error('Error in onStatusChange callback:', err);
            onError?.(err instanceof Error ? err : new Error(String(err)));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✓ Subscribed to status updates for ${orderRef}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error for status');
          onError?.(new Error('Channel error'));
        }
      });
    return channel;
  } catch (error) {
    console.error('Error subscribing to order status:', error);
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Listen for new service requests
 */
export function subscribeToServiceRequests(
  onNewRequest: (request: any) => void,
  onError?: (error: Error) => void
): RealtimeChannel | null {
  try {
    const channel = supabase
      .channel('service_requests_new')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests',
        },
        (payload) => {
          try {
            onNewRequest(payload.new);
          } catch (err) {
            console.error('Error in onNewRequest callback:', err);
            onError?.(err instanceof Error ? err : new Error(String(err)));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✓ Subscribed to new service requests');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error for service requests');
          onError?.(new Error('Channel error'));
        }
      });
    return channel;
  } catch (error) {
    console.error('Error subscribing to service requests:', error);
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Listen for service request status updates
 */
export function subscribeToServiceRequestUpdates(
  onUpdate: (request: any) => void,
  onError?: (error: Error) => void
): RealtimeChannel | null {
  try {
    const channel = supabase
      .channel('service_requests_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
        },
        (payload) => {
          try {
            onUpdate(payload.new);
          } catch (err) {
            console.error('Error in onUpdate callback:', err);
            onError?.(err instanceof Error ? err : new Error(String(err)));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✓ Subscribed to service request updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error for request updates');
          onError?.(new Error('Channel error'));
        }
      });
    return channel;
  } catch (error) {
    console.error('Error subscribing to service request updates:', error);
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Listen for pending payment reviews
 */
export function subscribeToPendingPayments(
  onNewPayment: (payment: any) => void,
  onError?: (error: Error) => void
): RealtimeChannel | null {
  try {
    const channel = supabase
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
          try {
            onNewPayment(payload.new);
          } catch (err) {
            console.error('Error in onNewPayment callback:', err);
            onError?.(err instanceof Error ? err : new Error(String(err)));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✓ Subscribed to pending payments');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error for pending payments');
          onError?.(new Error('Channel error'));
        }
      });
    return channel;
  } catch (error) {
    console.error('Error subscribing to pending payments:', error);
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribeFromChannel(channel: RealtimeChannel | null): Promise<void> {
  if (!channel) return;
  try {
    await supabase.removeChannel(channel);
  } catch (err) {
    console.error('Error unsubscribing from channel:', err);
    // Don't throw -just log and continue
  }
}
