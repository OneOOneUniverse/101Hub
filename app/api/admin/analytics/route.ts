import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type DailyCount = { date: string; count: number };

async function getDailyCounts(
  eventType: string,
  days: number
): Promise<DailyCount[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabaseAdmin
    .from("analytics_events")
    .select("created_at")
    .eq("event_type", eventType)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`[admin/analytics] ${eventType} query failed:`, error.message);
    return [];
  }

  const buckets: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    buckets[d.toISOString().slice(0, 10)] = 0;
  }

  for (const row of data ?? []) {
    const day = (row.created_at as string).slice(0, 10);
    if (buckets[day] !== undefined) buckets[day]++;
  }

  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

async function getUniqueVisitorsDailyCounts(days: number): Promise<DailyCount[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabaseAdmin
    .from("analytics_events")
    .select("created_at, user_id, metadata")
    .eq("event_type", "page_view")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin/analytics] unique visitors query failed:", error.message);
    return [];
  }

  const buckets: Record<string, Set<string>> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    buckets[d.toISOString().slice(0, 10)] = new Set();
  }

  for (const row of data ?? []) {
    const day = (row.created_at as string).slice(0, 10);
    const id = (row.user_id as string) ||
      ((row.metadata as Record<string, unknown>)?.visitor_id as string) ||
      "anon";
    if (buckets[day]) buckets[day].add(id);
  }

  return Object.entries(buckets).map(([date, set]) => ({
    date,
    count: set.size,
  }));
}

async function getTopPages(days: number): Promise<Array<{ page: string; count: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabaseAdmin
    .from("analytics_events")
    .select("page")
    .eq("event_type", "page_view")
    .gte("created_at", since.toISOString());

  if (error) return [];

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const p = (row.page as string) || "/";
    counts[p] = (counts[p] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

async function getOrderStats(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("created_at, total, payment_status, order_status")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin/analytics] orders query failed:", error.message);
    return { daily: [] as DailyCount[], totalRevenue: 0, statusBreakdown: {} as Record<string, number> };
  }

  const buckets: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    buckets[d.toISOString().slice(0, 10)] = 0;
  }

  let totalRevenue = 0;
  const statusBreakdown: Record<string, number> = {};

  for (const row of data ?? []) {
    const day = (row.created_at as string).slice(0, 10);
    if (buckets[day] !== undefined) buckets[day]++;
    totalRevenue += (row.total as number) ?? 0;

    const status = (row.order_status as string) ?? "unknown";
    statusBreakdown[status] = (statusBreakdown[status] ?? 0) + 1;
  }

  return {
    daily: Object.entries(buckets).map(([date, count]) => ({ date, count })),
    totalRevenue,
    statusBreakdown,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(Number(searchParams.get("days")) || 30, 1), 365);

  const [uniqueVisitors, signups, orders, topPages] = await Promise.all([
    getUniqueVisitorsDailyCounts(days),
    getDailyCounts("signup", days),
    getOrderStats(days),
    getTopPages(days),
  ]);

  const totalUnique = uniqueVisitors.reduce((s, d) => s + d.count, 0);
  const totalSignups = signups.reduce((s, d) => s + d.count, 0);
  const totalOrders = orders.daily.reduce((s, d) => s + d.count, 0);

  return NextResponse.json({
    days,
    summary: {
      totalUniqueVisitors: totalUnique,
      totalSignups,
      totalOrders,
      totalRevenue: orders.totalRevenue,
    },
    uniqueVisitors,
    signups,
    orders: orders.daily,
    orderStatusBreakdown: orders.statusBreakdown,
    topPages,
  });
}
