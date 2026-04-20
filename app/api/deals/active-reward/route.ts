import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

/** GET /api/deals/active-reward — check if user has an unredeemed points discount */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ hasReward: false });
  }

  try {
    const { data } = await supabaseAdmin
      .from("game_prizes")
      .select("id, prize_value, prize_label")
      .eq("user_id", userId)
      .eq("redeemed", false)
      .eq("prize_type", "discount_fixed")
      .order("won_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      return NextResponse.json({
        hasReward: true,
        reward: {
          id: data.id,
          discountCedis: data.prize_value,
          label: data.prize_label,
        },
      });
    }
    return NextResponse.json({ hasReward: false });
  } catch {
    return NextResponse.json({ hasReward: false });
  }
}
