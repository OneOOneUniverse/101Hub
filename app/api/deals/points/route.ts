import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from("user_points")
    .select("balance, total_earned, total_spent")
    .eq("user_id", userId)
    .single();

  return NextResponse.json({
    balance: data?.balance ?? 0,
    totalEarned: data?.total_earned ?? 0,
    totalSpent: data?.total_spent ?? 0,
  });
}
