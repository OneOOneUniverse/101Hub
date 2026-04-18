import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getRewardStatus } from "@/lib/referral";

/** GET /api/referral/active-reward — check if user has an active (unredeemed) reward */
export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getRewardStatus(user.id);
    if (status.activeReward) {
      return NextResponse.json({
        hasReward: true,
        reward: {
          id: status.activeReward.id,
          tierName: status.activeReward.tier_name,
          discountPercent: status.activeReward.discount_percent,
          freeShipping: status.activeReward.free_shipping,
        },
      });
    }
    return NextResponse.json({ hasReward: false });
  } catch {
    return NextResponse.json({ error: "Failed to check rewards" }, { status: 500 });
  }
}
