import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

const GAME_CONFIG: Record<string, { label: string; pointsReward: number; dailyLimit: number }> = {
  memory: { label: "Memory Match", pointsReward: 75, dailyLimit: 3 },
  lucky: { label: "Lucky Number", pointsReward: 50, dailyLimit: 5 },
  scramble: { label: "Word Scramble", pointsReward: 60, dailyLimit: 3 },
};

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { gameType?: string };
  const gameType = body.gameType;

  if (!gameType || !(gameType in GAME_CONFIG)) {
    return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
  }

  const config = GAME_CONFIG[gameType];

  // Check daily limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from("game_plays")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("game_type", gameType)
    .gte("created_at", todayStart.toISOString());

  if ((count ?? 0) >= config.dailyLimit) {
    return NextResponse.json(
      { error: `Daily limit reached for ${config.label}`, limitReached: true },
      { status: 429 }
    );
  }

  // Record play & award points
  await supabaseAdmin.from("game_plays").insert({
    user_id: userId,
    game_type: gameType,
    result: { type: "points", value: config.pointsReward, label: `+${config.pointsReward} pts` },
  });

  await supabaseAdmin.rpc("add_user_points", {
    p_user_id: userId,
    p_amount: config.pointsReward,
  });

  await supabaseAdmin.from("point_transactions").insert({
    user_id: userId,
    amount: config.pointsReward,
    type: gameType,
    description: `Completed ${config.label}`,
  });

  return NextResponse.json({ pointsEarned: config.pointsReward });
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const gameType = url.searchParams.get("game");

  if (!gameType || !(gameType in GAME_CONFIG)) {
    return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
  }

  const config = GAME_CONFIG[gameType];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from("game_plays")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("game_type", gameType)
    .gte("created_at", todayStart.toISOString());

  const playsToday = count ?? 0;
  const playsLeft = Math.max(0, config.dailyLimit - playsToday);

  return NextResponse.json({
    playsLeft,
    playsToday,
    dailyLimit: config.dailyLimit,
    pointsReward: config.pointsReward,
  });
}
