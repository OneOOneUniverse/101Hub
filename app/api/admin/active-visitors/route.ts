import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Returns the number of unique visitors active in the last 15 minutes. */
export async function GET() {
  const since = new Date(Date.now() - 15 * 60 * 1000);

  const { data, error } = await supabaseAdmin
    .from("analytics_events")
    .select("user_id, metadata")
    .eq("event_type", "page_view")
    .gte("created_at", since.toISOString());

  if (error) {
    return NextResponse.json({ count: 0 });
  }

  const unique = new Set<string>();
  for (const row of data ?? []) {
    const id =
      (row.user_id as string) ||
      ((row.metadata as Record<string, unknown>)?.visitor_id as string) ||
      null;
    if (id) unique.add(id);
  }

  return NextResponse.json({ count: unique.size });
}
