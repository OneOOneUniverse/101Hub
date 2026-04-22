import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSiteContent } from "@/lib/site-content";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const gameType = url.searchParams.get("game");

  if (gameType !== "spin" && gameType !== "scratch" && gameType !== "trivia") {
    return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
  }

  const content = await getSiteContent();
  const config =
    gameType === "spin"
      ? content.dealsHub.spinWheel
      : gameType === "scratch"
        ? content.dealsHub.scratchCard
        : content.dealsHub.trivia;

  const maxAttempts = (config as { maxAttempts?: number }).maxAttempts ?? 0;
  const cooldownHours =
    gameType === "trivia" ? 24 : (config as { cooldownHours?: number }).cooldownHours ?? 0;

  // Window start: cooldown window or start of today
  const windowStart =
    cooldownHours > 0
      ? new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString()
      : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  const { count } = await supabaseAdmin
    .from("game_plays")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("game_type", gameType)
    .gte("created_at", windowStart);

  const playsThisWindow = count ?? 0;
  const attemptsLeft = maxAttempts > 0 ? Math.max(0, maxAttempts - playsThisWindow) : null; // null = unlimited
  const attemptsUsed = playsThisWindow;

  // Check active cooldown (only for spin/scratch)
  let onCooldown = false;
  let cooldownEndsAt: string | null = null;
  if (gameType !== "trivia" && cooldownHours > 0) {
    const { data: recent } = await supabaseAdmin
      .from("game_plays")
      .select("created_at")
      .eq("user_id", userId)
      .eq("game_type", gameType)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(1);

    if (recent && recent.length > 0) {
      const lastPlay = new Date(recent[0].created_at as string);
      const cooldownEnd = new Date(lastPlay.getTime() + cooldownHours * 60 * 60 * 1000);
      if (cooldownEnd > new Date()) {
        onCooldown = true;
        cooldownEndsAt = cooldownEnd.toISOString();
      }
    }
  }

  return NextResponse.json({
    maxAttempts,
    attemptsUsed,
    attemptsLeft,
    onCooldown,
    cooldownEndsAt,
    cooldownHours,
  });
}
