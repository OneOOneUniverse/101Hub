import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: prizes } = await supabaseAdmin
    .from("game_prizes")
    .select("id, prize_type, prize_value, prize_label, won_at, expires_at")
    .eq("user_id", userId)
    .eq("redeemed", false)
    .gte("expires_at", new Date().toISOString())
    .order("won_at", { ascending: false });

  return NextResponse.json({ prizes: prizes ?? [] });
}
