import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");

  if (!page) {
    return NextResponse.json({ error: "page param required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("analytics_events")
    .select("user_id, metadata")
    .eq("event_type", "page_view")
    .eq("page", page);

  if (error) {
    return NextResponse.json({ views: 0, uniqueUsers: 0 });
  }

  const total = data?.length ?? 0;
  const uniqueSet = new Set<string>();
  for (const row of data ?? []) {
    const id =
      (row.user_id as string) ||
      ((row.metadata as Record<string, unknown>)?.visitor_id as string) ||
      null;
    if (id) uniqueSet.add(id);
  }

  return NextResponse.json({ views: total, uniqueUsers: uniqueSet.size });
}
