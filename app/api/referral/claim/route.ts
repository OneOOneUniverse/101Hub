import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { resolveReferralCode, recordReferral } from "@/lib/referral";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = (await req.json()) as { code?: string };
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
  return NextResponse.json({ ok: true });
}
