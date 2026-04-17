/**
 * Server-side helpers for creating persistent notifications.
 * Import only in API routes / server components — uses supabaseAdmin.
 */
import { supabaseAdmin } from './supabase';
import { sendPushToUser, sendPushToAdmins } from './web-push';

export type DbNotificationType =
  | 'order'
  | 'message'
  | 'service'
  | 'payment'
  | 'status_update'
  | 'promo'
  | 'system';

export interface CreateNotificationParams {
  userId: string;
  targetRole?: 'user' | 'admin';
  type: DbNotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Insert a single notification row.
 * Returns the created notification or null on failure.
 */
export async function createDbNotification(params: CreateNotificationParams) {
  const { userId, targetRole = 'user', type, title, message, data = {} } = params;

  const { data: row, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      target_role: targetRole,
      type,
      title,
      message,
      data,
    })
    .select()
    .single();

  if (error) {
    console.error('[notifications] Insert failed:', error.message);
    return null;
  }

  // Fire-and-forget: send push notification
  const pushPayload = {
    title,
    body: message,
    url: (data.link as string) ?? '/',
    tag: type,
  };

  if (targetRole === 'admin') {
    void sendPushToAdmins(pushPayload);
  } else {
    void sendPushToUser(userId, pushPayload);
  }

  return row;
}

/**
 * Convenience: create a notification for every admin.
 * Uses user_id = '__admin__' which the client filters by target_role.
 */
export async function notifyAdmins(
  type: DbNotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>,
) {
  return createDbNotification({
    userId: '__admin__',
    targetRole: 'admin',
    type,
    title,
    message,
    data,
  });
}

/**
 * Notify a specific user (by Clerk user ID).
 */
export async function notifyUser(
  userId: string,
  type: DbNotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>,
) {
  return createDbNotification({
    userId,
    targetRole: 'user',
    type,
    title,
    message,
    data,
  });
}
