'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

interface DbNotification {
  id: string;
  user_id: string;
  target_role: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

const ICON_MAP: Record<string, string> = {
  order: '📦',
  message: '💬',
  service: '🔧',
  payment: '💳',
  status_update: '✅',
  promo: '🎉',
  system: 'ℹ️',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationBell() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushState, setPushState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('unsupported');
  const [showPushBanner, setShowPushBanner] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Check push notification support & permission on mount
  useEffect(() => {
    if (!user) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported');
      return;
    }
    const perm = Notification.permission;
    setPushState(perm as 'prompt' | 'granted' | 'denied');

    // Show the banner if user hasn't decided yet and hasn't dismissed it this session
    if (perm === 'default') {
      const dismissed = sessionStorage.getItem('101hub-push-dismissed');
      if (!dismissed) {
        setShowPushBanner(true);
      }
    }

    // If already granted, register subscription silently
    if (perm === 'granted') {
      void registerPushSubscription();
    }
  }, [user]);

  async function registerPushSubscription() {
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });
      await fetch('/api/notifications/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
    } catch (err) {
      console.error('[push] Registration failed:', err);
    }
  }

  async function handleAllowPush() {
    try {
      const permission = await Notification.requestPermission();
      setPushState(permission as 'granted' | 'denied');
      setShowPushBanner(false);
      if (permission === 'granted') {
        await registerPushSubscription();
      }
    } catch {
      setPushState('denied');
      setShowPushBanner(false);
    }
  }

  function handleDismissPush() {
    setShowPushBanner(false);
    sessionStorage.setItem('101hub-push-dismissed', '1');
  }

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: DbNotification[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    }
  }, [user]);

  // Poll every 30s
  useEffect(() => {
    if (!user) return;
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), 30_000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  async function markAllRead() {
    setLoading(true);
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function markOneRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  function handleNotificationClick(n: DbNotification) {
    if (!n.read) void markOneRead(n.id);
    // Navigate if data has a link
    const link = n.data?.link as string | undefined;
    if (link) window.location.href = link;
  }

  if (!user) return null;

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button
        className="notif-bell-btn"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void fetchNotifications();
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-bell-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span className="notif-header-title">Notifications</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {pushState !== 'unsupported' && (
                <button
                  className={`notif-push-toggle ${pushState === 'granted' ? 'notif-push-on' : ''}`}
                  title={pushState === 'granted' ? 'Push notifications enabled' : pushState === 'denied' ? 'Push blocked in browser settings' : 'Enable push notifications'}
                  onClick={() => {
                    if (pushState === 'prompt' || pushState === 'denied') {
                      void handleAllowPush();
                    }
                  }}
                  disabled={pushState === 'denied'}
                >
                  {pushState === 'granted' ? '🔔' : '🔕'}
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  className="notif-mark-all"
                  onClick={() => void markAllRead()}
                  disabled={loading}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Push permission banner */}
          {showPushBanner && pushState !== 'granted' && pushState !== 'unsupported' && (
            <div className="notif-push-banner">
              <div className="notif-push-banner-text">
                <span style={{ fontSize: '16px' }}>🔔</span>
                <span>Get notified about orders, messages & updates even when you&apos;re not on the site</span>
              </div>
              <div className="notif-push-banner-actions">
                <button className="notif-push-allow" onClick={() => void handleAllowPush()}>
                  Allow
                </button>
                <button className="notif-push-dismiss" onClick={handleDismissPush}>
                  Not now
                </button>
              </div>
            </div>
          )}

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  className={`notif-item${n.read ? '' : ' notif-unread'}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <span className="notif-icon">{ICON_MAP[n.type] ?? 'ℹ️'}</span>
                  <div className="notif-content">
                    <span className="notif-title">{n.title}</span>
                    <span className="notif-msg">{n.message}</span>
                    <span className="notif-time">{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.read && <span className="notif-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .notif-bell-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .notif-bell-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid #ff6b35;
          background: #1a1a1a;
          color: #fff;
          cursor: pointer;
          padding: 0;
          transition: border-color 0.2s, box-shadow 0.2s;
          position: relative;
        }
        .notif-bell-btn:hover {
          border-color: #fff;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.35);
        }
        .notif-bell-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          background: #dc2626;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #000;
          line-height: 1;
        }
        .notif-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 340px;
          max-height: 420px;
          background: #1a1a1a;
          border: 1px solid #ff6b35;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          z-index: 3000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #333;
        }
        .notif-header-title {
          color: #fff;
          font-size: 14px;
          font-weight: 600;
        }
        .notif-mark-all {
          background: none;
          border: none;
          color: #ff6b35;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.15s;
        }
        .notif-mark-all:hover {
          background: rgba(255, 107, 53, 0.15);
        }
        .notif-mark-all:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .notif-list {
          overflow-y: auto;
          flex: 1;
        }
        .notif-empty {
          padding: 32px 16px;
          text-align: center;
          color: #888;
          font-size: 13px;
        }
        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 1px solid #222;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
          color: #ccc;
        }
        .notif-item:hover {
          background: rgba(255, 107, 53, 0.08);
        }
        .notif-unread {
          background: rgba(255, 107, 53, 0.05);
          color: #fff;
        }
        .notif-icon {
          font-size: 18px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .notif-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .notif-title {
          font-size: 13px;
          font-weight: 600;
          line-height: 1.3;
        }
        .notif-msg {
          font-size: 12px;
          opacity: 0.8;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .notif-time {
          font-size: 11px;
          opacity: 0.5;
          margin-top: 2px;
        }
        .notif-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff6b35;
          flex-shrink: 0;
          margin-top: 6px;
        }
        .notif-push-toggle {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 4px;
          transition: background 0.15s;
          opacity: 0.6;
          line-height: 1;
        }
        .notif-push-toggle:hover {
          background: rgba(255, 107, 53, 0.15);
          opacity: 1;
        }
        .notif-push-on {
          opacity: 1;
        }
        .notif-push-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.3;
        }
        .notif-push-banner {
          padding: 12px 16px;
          background: linear-gradient(135deg, rgba(255, 107, 53, 0.15), rgba(255, 107, 53, 0.05));
          border-bottom: 1px solid #333;
        }
        .notif-push-banner-text {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: #ddd;
          line-height: 1.4;
          margin-bottom: 10px;
        }
        .notif-push-banner-actions {
          display: flex;
          gap: 8px;
        }
        .notif-push-allow {
          flex: 1;
          padding: 7px 12px;
          background: #ff6b35;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .notif-push-allow:hover {
          background: #d94020;
        }
        .notif-push-dismiss {
          flex: 1;
          padding: 7px 12px;
          background: rgba(255, 255, 255, 0.08);
          color: #aaa;
          border: 1px solid #444;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .notif-push-dismiss:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ccc;
        }
        @media (max-width: 400px) {
          .notif-dropdown {
            width: calc(100vw - 24px);
            right: -8px;
          }
        }
      `}</style>
    </div>
  );
}
