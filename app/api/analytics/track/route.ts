import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      event_type?: string;
      page?: string;
      user_id?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.event_type) {
      return NextResponse.json({ error: "event_type required" }, { status: 400 });
    }

    const allowed = ["page_view", "signup", "order"];
    if (!allowed.includes(body.event_type)) {
      return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
    }

    const { error } = await supabase.from("analytics_events").insert({
      event_type: body.event_type,
      page: body.page ?? null,
      user_id: body.user_id ?? null,
      metadata: body.metadata ?? {},
    });

    if (error) {
      console.error("[analytics/track] insert failed:", error.message);
      return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
