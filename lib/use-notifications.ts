'use client';

import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useNotifications } from '@/components/NotificationProvider';
import {
  subscribeToNewOrders,
  subscribeToOrderMessages,
  subscribeToOrderStatus,
  subscribeToServiceRequests,
  subscribeToServiceRequestUpdates,
  subscribeToPendingPayments,
  unsubscribeFromChannel,
} from '@/lib/notifications';

/**
 * Safe hook wrapper - prevents subscription errors from crashing the app
 */
function useSafeSubscription(
  setupFn: (addNotification: any) => RealtimeChannel | null,
  hookName: string
) {
  const { addNotification } = useNotifications();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    try {
      channelRef.current = setupFn(addNotification);
    } catch (err) {
      console.error(`Error in ${hookName}:`, err);
      // Silently fail - don't crash the app
    }

    return () => {
      if (channelRef.current) {
        try {
          unsubscribeFromChannel(channelRef.current);
        } catch (err) {
          console.error(`Error unsubscribing from ${hookName}:`, err);
        }
      }
    };
  }, [addNotification]);
}

/**
 * Hook for admin to subscribe to real-time order updates
 */
export function useAdminOrderUpdates() {
  const { addNotification } = useNotifications();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    try {
      channelRef.current = subscribeToNewOrders(
        (order) => {
          try {
            addNotification(
              'order',
              '📦 New Order!',
              `Order #${order.order_ref} confirmed. Amount: ₵${order.total}`,
              { orderRef: order.order_ref }
            );
          } catch (err) {
            console.error('Error in order notification:', err);
          }
        },
        (error) => {
          console.error('Order subscription error:', error);
        }
      );
    } catch (err) {
      console.error('Error setting up order subscription:', err);
    }

    return () => {
      if (channelRef.current) {
        try {
          unsubscribeFromChannel(channelRef.current);
        } catch (err) {
          console.error('Error unsubscribing from orders:', err);
        }
      }
    };
  }, [addNotification]);
}

/**
 * Hook for admin to subscribe to pending payment updates
 */
export function useAdminPendingPayments() {
  const { addNotification } = useNotifications();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    try {
      channelRef.current = subscribeToPendingPayments((payment) => {
        try {
          addNotification(
            'payment',
            '💳 Payment Review Needed',
            `Order #${payment.order_ref} awaiting payment verification`,
            { orderRef: payment.order_ref }
          );
        } catch (err) {
          console.error('Error in payment notification:', err);
        }
      });
    } catch (err) {
      console.error('Error setting up payment subscription:', err);
    }

    return () => {
      if (channelRef.current) {
        try {
          unsubscribeFromChannel(channelRef.current);
        } catch (err) {
          console.error('Error unsubscribing from payments:', err);
        }
      }
    };
  }, [addNotification]);
}

/**
 * Hook for admin to subscribe to service request updates
 */
export function useAdminServiceRequests() {
  const { addNotification } = useNotifications();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    try {
      channelRef.current = subscribeToServiceRequests((request) => {
        try {
          addNotification(
            'service',
            '🔧 New Service Request',
            `${request.package_name} - ${request.issue}`,
            { ticketRef: request.ticket_ref }
          );
        } catch (err) {
          console.error('Error in service notification:', err);
        }
      });
    } catch (err) {
      console.error('Error setting up service subscription:', err);
    }

    return () => {
      if (channelRef.current) {
        try {
          unsubscribeFromChannel(channelRef.current);
        } catch (err) {
          console.error('Error unsubscribing from services:', err);
        }
      }
    };
  }, [addNotification]);
}

/**
 * Hook for customer to subscribe to order status updates
 */
export function useCustomerOrderUpdates(orderRef: string) {
  const { addNotification } = useNotifications();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!orderRef) return;

    try {
      channelRef.current = subscribeToOrderStatus(orderRef, (newStatus, order) => {
        try {
          const statusMessages: Record<string, string> = {
            confirmed: '✅ Your order has been confirmed!',
            in_transit: '🚚 Your order is on the way!',
            delivered: '📦 Your order has been delivered!',
            completed: '⭐ Order completed. Thank you for shopping!',
          };

          const message = statusMessages[newStatus] || `Order status updated to ${newStatus}`;
          addNotification('status_update', 'Order Update', message, {
            orderRef,
            status: newStatus,
          });
        } catch (err) {
          console.error('Error in status update notification:', err);
        }
      });
    } catch (err) {
      console.error('Error setting up order status subscription:', err);
    }

    return () => {
      if (channelRef.current) {
        try {
          unsubscribeFromChannel(channelRef.current);
        } catch (err) {
          console.error('Error unsubscribing from order status:', err);
        }
      }
    };
  }, [orderRef, addNotification]);
}

/**
 * Hook for customer to subscribe to new messages on their order
 */
export function useCustomerOrderMessages(orderRef: string) {
  const { addNotification } = useNotifications();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!orderRef) return;

    try {
      channelRef.current = subscribeToOrderMessages(orderRef, (message) => {
        try {
          addNotification(
            'message',
            `💬 Message from 101 Hub`,
            message.message,
            { orderRef, messageId: message.id }
          );
        } catch (err) {
          console.error('Error in message notification:', err);
        }
      });
    } catch (err) {
      console.error('Error setting up order message subscription:', err);
    }

    return () => {
      if (channelRef.current) {
        try {
          unsubscribeFromChannel(channelRef.current);
        } catch (err) {
          console.error('Error unsubscribing from messages:', err);
        }
      }
    };
  }, [orderRef, addNotification]);
}
