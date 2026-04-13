'use client';

import { useEffect, useRef } from 'react';
import { useNotifications } from '@/components/NotificationProvider';

/**
 * AdminNotificationPoller
 *
 * Polls admin API endpoints every 60 seconds using plain fetch.
 * Shows a toast notification when the count of pending items increases.
 * Zero Supabase Realtime — cannot crash.
 */
export default function AdminNotificationPoller() {
  const { addNotification } = useNotifications();
  const prevRef = useRef({ payments: -1, services: -1 });
  const initialRef = useRef(true);

  useEffect(() => {
    async function poll() {
      try {
        const [paymentsRes, servicesRes] = await Promise.all([
          fetch('/api/admin/pending-payments'),
          fetch('/api/admin/service-requests'),
        ]);

        if (!paymentsRes.ok || !servicesRes.ok) return;

        const paymentsData = await paymentsRes.json() as { payments?: unknown[] };
        const servicesData = await servicesRes.json() as { requests?: unknown[] };

        const paymentCount = paymentsData.payments?.length ?? 0;
        const serviceCount = servicesData.requests?.length ?? 0;

        // Skip the very first poll (just sets baseline)
        if (!initialRef.current) {
          if (paymentCount > prevRef.current.payments) {
            const diff = paymentCount - prevRef.current.payments;
            addNotification(
              'payment',
              '💳 New Payment To Review',
              `${diff} new payment${diff > 1 ? 's' : ''} waiting for approval`
            );
          }
          if (serviceCount > prevRef.current.services) {
            const diff = serviceCount - prevRef.current.services;
            addNotification(
              'service',
              '🔧 New Service Request',
              `${diff} new service request${diff > 1 ? 's' : ''} submitted`
            );
          }
        }

        prevRef.current = { payments: paymentCount, services: serviceCount };
        initialRef.current = false;
      } catch {
        // Silently ignore — never crash the page
      }
    }

    void poll();
    const interval = setInterval(() => void poll(), 60_000);
    return () => clearInterval(interval);
  }, [addNotification]);

  return null; // Renders nothing
}
