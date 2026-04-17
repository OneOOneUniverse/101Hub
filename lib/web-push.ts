/**
 * Server-side Web Push sender.
 * Sends push notifications to all subscribed devices for a user.
 *
 * Requires env vars:
 *   VAPID_PUBLIC_KEY   — generated once via `npx web-push generate-vapid-keys`
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT      — e.g. "mailto:contact101hubasap@gmail.com"
 */
import webpush from 'web-push';
import { supabaseAdmin } from './supabase';

function initVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:contact101hubasap@gmail.com';

  if (!pub || !priv) {
    return false;
  }

  webpush.setVapidDetails(subject, pub, priv);
  return true;
}

let vapidReady: boolean | null = null;

function ensureVapid(): boolean {
  if (vapidReady === null) vapidReady = initVapid();
  return vapidReady;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to all devices subscribed by a user.
 * Automatically removes expired/invalid subscriptions.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureVapid()) {
    console.warn('[push] VAPID keys not configured — skipping push');
    return;
  }

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId);

  if (error || !subs?.length) return;

  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        const sub = row.subscription as webpush.PushSubscription;
        await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 });
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404 or 410 means subscription is expired / unsubscribed
        if (status === 404 || status === 410) {
          staleIds.push(row.id as string);
        } else {
          console.error('[push] Send failed:', err);
        }
      }
    }),
  );

  // Clean up stale subscriptions
  if (staleIds.length) {
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .in('id', staleIds);
  }
}

/**
 * Send push to all admin-subscribed devices.
 * Resolves admin user IDs via Clerk using ADMIN_EMAILS, then sends only to those.
 */
export async function sendPushToAdmins(payload: PushPayload) {
  if (!ensureVapid()) return;

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!adminEmails.length) return;

  // Resolve admin Clerk user IDs from their emails
  let adminUserIds: string[] = [];
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    const results = await Promise.all(
      adminEmails.map((email) =>
        client.users.getUserList({ emailAddress: [email], limit: 1 }),
      ),
    );
    adminUserIds = results.flatMap((r) => r.data.map((u) => u.id));
  } catch (err) {
    console.error('[push] Failed to resolve admin user IDs:', err);
    return;
  }

  if (!adminUserIds.length) return;

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .in('user_id', adminUserIds);

  if (error || !subs?.length) return;

  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        const sub = row.subscription as webpush.PushSubscription;
        await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 });
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          staleIds.push(row.id as string);
        }
      }
    }),
  );

  if (staleIds.length) {
    await supabaseAdmin.from('push_subscriptions').delete().in('id', staleIds);
  }
}
