import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import {
  getRewardStatus,
  claimTierReward,
  claimTierRewardNewCycle,
  startNewCycle,
} from "@/lib/referral";

/** GET /api/referral/rewards — get reward claim status */
export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getRewardStatus(user.id);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: "Failed to load rewards" }, { status: 500 });
  }
}

/** POST /api/referral/rewards — claim a tier reward */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { tierId?: number; startNewCycle?: boolean };

  // Handle "start new cycle" action
  if (body.startNewCycle) {
    const { cycle, error } = await startNewCycle(user.id);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // If a tierId is also provided, claim that tier in the new cycle
    if (body.tierId) {
      const result = await claimTierRewardNewCycle(user.id, body.tierId, cycle);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ claim: result.claim, newCycle: cycle });
    }

    return NextResponse.json({ newCycle: cycle });
  }

  // Normal claim
  if (!body.tierId || typeof body.tierId !== "number") {
    return NextResponse.json({ error: "tierId is required" }, { status: 400 });
  }

  const result = await claimTierReward(user.id, body.tierId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ claim: result.claim });
}
