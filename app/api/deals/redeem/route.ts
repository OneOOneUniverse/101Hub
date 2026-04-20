import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSiteContent } from "@/lib/site-content";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const content = await getSiteContent();
  const pointsPerCedi = content.dealsHub.pointsPerCedi;
  const minRedeem = content.dealsHub.minRedeemPoints || 0;

  // Check if user already has an unredeemed (active) prize — only one at a time
  const { data: existing } = await supabaseAdmin
    .from("game_prizes")
    .select("id")
    .eq("user_id", userId)
    .eq("redeemed", false)
    .eq("prize_type", "discount_fixed")
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({
      error: "You already have an active reward. Use it at checkout before claiming another.",
    }, { status: 400 });
  }

  // Get current balance
  const { data: pointsData } = await supabaseAdmin
    .from("user_points")
    .select("balance")
    .eq("user_id", userId)
    .single();

  const balance = pointsData?.balance ?? 0;

  if (minRedeem > 0 && balance < minRedeem) {
    return NextResponse.json({
      error: `Need at least ${minRedeem} points to claim (you have ${balance})`,
    }, { status: 400 });
  }

  if (balance < pointsPerCedi) {
    return NextResponse.json({
      error: `Need at least ${pointsPerCedi} points to claim (you have ${balance})`,
    }, { status: 400 });
  }

  // Calculate discount: full balance converted to cedis
  const discountCedis = Math.floor(balance / pointsPerCedi);
  const pointsUsed = discountCedis * pointsPerCedi;

  // Deduct points
  await supabaseAdmin.rpc("add_user_points", { p_user_id: userId, p_amount: -pointsUsed });
  await supabaseAdmin.from("point_transactions").insert({
    user_id: userId,
    amount: -pointsUsed,
    type: "redeem",
    description: `Claimed ${pointsUsed} points for GHS ${discountCedis} discount`,
  });

  // Create an unredeemed game prize — will be consumed at checkout
  const { data: prize } = await supabaseAdmin.from("game_prizes").insert({
    user_id: userId,
    prize_type: "discount_fixed",
    prize_value: discountCedis,
    prize_label: `GHS ${discountCedis} Points Discount`,
    redeemed: false,
  }).select("id").single();

  return NextResponse.json({
    discountCedis,
    pointsUsed,
    remainingBalance: balance - pointsUsed,
    prizeId: prize?.id,
  });
}
