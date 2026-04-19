import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSiteContent } from "@/lib/site-content";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body_unused = null; void body_unused;

  const content = await getSiteContent();
  const pointsPerCedi = content.dealsHub.pointsPerCedi;
  const minRedeem = content.dealsHub.minRedeemPoints || 0;

  // Get current balance
  const { data: pointsData } = await supabaseAdmin
    .from("user_points")
    .select("balance")
    .eq("user_id", userId)
    .single();

  const balance = pointsData?.balance ?? 0;

  if (minRedeem > 0 && balance < minRedeem) {
    return NextResponse.json({
      error: `Need at least ${minRedeem} points to redeem (you have ${balance})`,
    }, { status: 400 });
  }

  if (balance < pointsPerCedi) {
    return NextResponse.json({
      error: `Need at least ${pointsPerCedi} points to redeem (you have ${balance})`,
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
    description: `Redeemed ${pointsUsed} points for GHS ${discountCedis} discount`,
  });

  // Create a game prize (discount_fixed) for checkout to consume
  const { data: prize } = await supabaseAdmin.from("game_prizes").insert({
    user_id: userId,
    prize_type: "discount_fixed",
    prize_value: discountCedis,
    prize_label: `GHS ${discountCedis} Points Discount`,
  }).select("id").single();

  return NextResponse.json({
    discountCedis,
    pointsUsed,
    remainingBalance: balance - pointsUsed,
    prizeId: prize?.id,
  });
}
