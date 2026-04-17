import { NextRequest, NextResponse } from "next/server";
import { resolveReferralCode } from "@/lib/referral";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/referral/click
 * Records a referral link click. No auth required (the clicker is a guest).
 * Body: { code: string }
 * Returns: { clickId: string } — stored in localStorage for later conversion
 */
export async function POST(req: NextRequest) {
  const { code } = (await req.json()) as { code?: string };

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing referral code" }, { status: 400 });
  }

  const sanitized = code.toUpperCase().trim();
  const referrerId = await resolveReferralCode(sanitized);

  if (!referrerId) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
  }

  // Insert a new click row — converted_user_id is NULL (guest)
  const { data, error } = await supabaseAdmin
    .from("referral_clicks")
    .insert({
      referrer_code: sanitized,
      referrer_user_id: referrerId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[referral/click] insert error:", error);
    return NextResponse.json({ error: "Failed to record click" }, { status: 500 });
  }

  return NextResponse.json({ clickId: data.id });
}
