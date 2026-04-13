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
 * Hook for admin to subscribe to real-time order updates
 */
export function useAdminOrderUpdates() {
  const { addNotification } = useNotifications();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    channelRef.current = subscribeToNewOrders((order) => {
      addNotification(
        'order',
        '📦 New Order!',
        `Order #${order.order_ref} confirmed. Amount: ₵${order.total}`,
        { orderRef: order.order_ref }
      );
    });

    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
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
    channelRef.current = subscribeToPendingPayments((payment) => {
      addNotification(
        'payment',
        '💳 Payment Review Needed',
        `Order #${payment.order_ref} awaiting payment verification`,
        { orderRef: payment.order_ref }
      );
    });

    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
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
    channelRef.current = subscribeToServiceRequests((request) => {
      addNotification(
        'service',
        '🔧 New Service Request',
        `${request.package_name} - ${request.issue}`,
        { ticketRef: request.ticket_ref }
      );
    });

    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
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

    channelRef.current = subscribeToOrderStatus(orderRef, (newStatus, order) => {
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
    });

    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
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

    channelRef.current = subscribeToOrderMessages(orderRef, (message) => {
      addNotification(
        'message',
        `💬 Message from 101 Hub`,
        message.message,
        { orderRef, messageId: message.id }
      );
    });

    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
      }
    };
  }, [orderRef, addNotification]);
}
