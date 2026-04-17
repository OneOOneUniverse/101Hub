import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getReferralInfo } from "@/lib/referral";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const info = await getReferralInfo(user.id);
    return NextResponse.json(info);
  } catch {
    return NextResponse.json({ error: "Failed to load referral data" }, { status: 500 });
  }
}
