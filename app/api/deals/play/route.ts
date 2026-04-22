import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSiteContent } from "@/lib/site-content";

function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { gameType?: string };
  const gameType = body.gameType;

  if (gameType !== "spin" && gameType !== "scratch") {
    return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
  }

  const content = await getSiteContent();
  const config = gameType === "spin" ? content.dealsHub.spinWheel : content.dealsHub.scratchCard;

  if (!config.enabled) {
    return NextResponse.json({ error: "This game is currently disabled" }, { status: 400 });
  }

  // Check cooldown
  if (config.cooldownHours > 0) {
    const since = new Date(Date.now() - config.cooldownHours * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("game_plays")
      .select("id")
      .eq("user_id", userId)
      .eq("game_type", gameType)
      .gte("created_at", since)
      .limit(1);

    if (recent && recent.length > 0) {
      return NextResponse.json({
        error: `You can play again in ${config.cooldownHours} hours`,
        cooldown: true,
      }, { status: 429 });
    }
  }

  // Check max attempts per cooldown window (or all-time if no cooldown)
  const maxAttempts = (config as { maxAttempts?: number }).maxAttempts ?? 0;
  if (maxAttempts > 0) {
    const windowStart = config.cooldownHours > 0
      ? new Date(Date.now() - config.cooldownHours * 60 * 60 * 1000).toISOString()
      : new Date(new Date().setHours(0, 0, 0, 0)).toISOString(); // reset daily if no cooldown
    const { count } = await supabaseAdmin
      .from("game_plays")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("game_type", gameType)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= maxAttempts) {
      return NextResponse.json({
        error: `You have used all ${maxAttempts} attempt${maxAttempts === 1 ? "" : "s"} for this game`,
        attemptsExhausted: true,
      }, { status: 429 });
    }
  }

  // Pick prize
  const slices = "slices" in config ? config.slices : config.prizes;
  const prize = weightedRandom(slices);

  // Record the play
  await supabaseAdmin.from("game_plays").insert({
    user_id: userId,
    game_type: gameType,
    result: { prizeId: prize.id, label: prize.label, type: prize.type, value: prize.value },
  });

  // Award prize
  if (prize.type === "points" && prize.value > 0) {
    // Upsert points
    await supabaseAdmin.rpc("add_user_points", { p_user_id: userId, p_amount: prize.value });
    await supabaseAdmin.from("point_transactions").insert({
      user_id: userId,
      amount: prize.value,
      type: gameType,
      description: `Won ${prize.label} from ${gameType === "spin" ? "Spin the Wheel" : "Scratch Card"}`,
    });
  } else if (prize.type !== "no_prize") {
    // Save coupon prize
    await supabaseAdmin.from("game_prizes").insert({
      user_id: userId,
      prize_type: prize.type,
      prize_value: prize.value,
      prize_label: prize.label,
    });
  }

  return NextResponse.json({
    prize: {
      id: prize.id,
      label: prize.label,
      type: prize.type,
      value: prize.value,
      color: prize.color,
    },
  });
}
