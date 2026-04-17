import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { resolveReferralCode, recordReferral } from "@/lib/referral";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code, clickId } = (await req.json()) as { code?: string; clickId?: string };
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing referral code" }, { status: 400 });
  }

  const referrerId = await resolveReferralCode(code);
  if (!referrerId) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
  }
  if (referrerId === user.id) {
    return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
  }

  // Build a privacy-safe display name for the referrer's dashboard
  const displayName = [
    user.firstName,
    user.lastName?.[0] ? `${user.lastName[0]}.` : "",
  ]
    .filter(Boolean)
    .join(" ") || "A friend";

  await recordReferral(referrerId, user.id, displayName);

  // ── Convert the click row: Guest → Signed Up ──
  if (clickId && typeof clickId === "string") {
    await supabaseAdmin
      .from("referral_clicks")
      .update({
        converted_user_id: user.id,
        converted_name: displayName,
      })
      .eq("id", clickId)
      .eq("referrer_user_id", referrerId) // safety: only update if referrer matches
      .is("converted_user_id", null);     // only convert once
  }

  return NextResponse.json({ ok: true });
}
