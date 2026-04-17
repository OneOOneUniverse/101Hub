import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/notifications
 * Returns notifications for the current user.
 * Admins also receive notifications with target_role='admin'.
 */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 30), 100);
  const unreadOnly = searchParams.get('unread') === 'true';

  const isAdmin = await isCurrentUserAdmin();

  // Build query: user's own notifications + admin broadcasts (if admin)
  let query = supabaseAdmin
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (isAdmin) {
    // Admin sees their own + all admin-targeted + broadcast notifications
    query = query.or(`user_id.eq.${user.id},target_role.eq.admin,user_id.eq.__broadcast__`);
  } else {
    // Users see their own + broadcast notifications
    query = query.or(`user_id.eq.${user.id},user_id.eq.__broadcast__`);
  }

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[notifications] Fetch failed:', error.message);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }

  // Unread count
  let countQuery = supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('read', false);

  if (isAdmin) {
    countQuery = countQuery.or(`user_id.eq.${user.id},target_role.eq.admin,user_id.eq.__broadcast__`);
  } else {
    countQuery = countQuery.or(`user_id.eq.${user.id},user_id.eq.__broadcast__`);
  }

  const { count } = await countQuery;

  return NextResponse.json({
    notifications: data ?? [],
    unreadCount: count ?? 0,
  });
}

/**
 * PUT /api/notifications
 * Mark notifications as read.
 * Body: { ids: string[] } or { all: true }
 */
export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { ids?: string[]; all?: boolean };
  const isAdmin = await isCurrentUserAdmin();

  if (body.all) {
    // Mark all as read (including broadcast notifications)
    let query = supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('read', false);

    if (isAdmin) {
      query = query.or(`user_id.eq.${user.id},target_role.eq.admin,user_id.eq.__broadcast__`);
    } else {
      query = query.or(`user_id.eq.${user.id},user_id.eq.__broadcast__`);
    }

    await query;
    return NextResponse.json({ success: true });
  }

  if (body.ids?.length) {
    await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .in('id', body.ids);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Provide ids or all: true' }, { status: 400 });
}
