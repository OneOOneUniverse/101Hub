import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSiteContent } from "@/lib/site-content";

const GAME_LABELS: Record<string, string> = {
  memory: "Memory Match",
  lucky: "Lucky Number",
  scramble: "Word Scramble",
};

// Minimum anti-cheat thresholds
const MIN_MOVES_MEMORY = 8;   // can't beat 8 pairs in fewer than 8 moves
const MIN_SECONDS_MEMORY = 15; // must take at least 15 seconds
const MIN_SECONDS_SCRAMBLE = 3; // must take at least 3 seconds

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    gameType?: string;
    sessionId?: string;
    answer?: string;         // Word Scramble: user's answer
    moves?: number;          // Memory Match: move count
    elapsedSeconds?: number; // Anti-cheat: time taken
  };

  const { gameType, sessionId, answer, moves, elapsedSeconds } = body;

  if (!gameType || !(gameType in GAME_LABELS)) {
    return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
  }

  // Sanitize answer length to prevent DoS via huge strings
  if (typeof answer === "string" && answer.length > 100) {
    return NextResponse.json({ error: "Invalid answer." }, { status: 400 });
  }

  // Anti-cheat: reject implausibly large elapsed times (session expires in 15 min = 900s)
  if (typeof elapsedSeconds === "number" && elapsedSeconds > 1800) {
    return NextResponse.json({ error: "Session timing invalid." }, { status: 400 });
  }

  // Session ID is required — no session means no proof of play
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session ID. Start a new game first." }, { status: 400 });
  }

  // Fetch and validate the session
  const { data: session } = await supabaseAdmin
    .from("game_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("game_type", gameType)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Invalid or expired session. Please start a new game." }, { status: 400 });
  }

  if (session.is_complete as boolean) {
    return NextResponse.json({ error: "This session has already been used." }, { status: 400 });
  }

  if (new Date(session.expires_at as string) < new Date()) {
    return NextResponse.json({ error: "Session expired. Please start a new game." }, { status: 400 });
  }

  // Load game configuration from site content (respects admin settings)
  const content = await getSiteContent();
  const dealsHub = content.dealsHub;

  const dailyLimit =
    gameType === "memory" ? (dealsHub.memoryMatch.dailyLimit ?? 3) :
    gameType === "lucky" ? (dealsHub.luckyNumber.dailyLimit ?? 5) :
    (dealsHub.wordScramble.dailyLimit ?? 3);

  const pointsReward =
    gameType === "memory" ? dealsHub.memoryMatch.pointsReward :
    gameType === "lucky" ? dealsHub.luckyNumber.pointsReward :
    dealsHub.wordScramble.pointsReward;

  // Double-check daily limit (defence in depth)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from("game_plays")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("game_type", gameType)
    .gte("created_at", todayStart.toISOString());

  if ((count ?? 0) >= dailyLimit) {
    return NextResponse.json({ error: "Daily limit reached", limitReached: true }, { status: 429 });
  }

  // ── Game-specific win verification ──────────────────────────────────────
  if (gameType === "memory") {
    // Anti-cheat: minimum moves and time
    if (typeof moves === "number" && moves < MIN_MOVES_MEMORY) {
      return NextResponse.json({ error: "Suspicious play detected." }, { status: 400 });
    }
    if (typeof elapsedSeconds === "number" && elapsedSeconds < MIN_SECONDS_MEMORY) {
      return NextResponse.json({ error: "Game completed too quickly." }, { status: 400 });
    }
  } else if (gameType === "scramble") {
    if (!answer) {
      return NextResponse.json({ error: "Missing answer." }, { status: 400 });
    }
    // Verify answer against the server-stored word
    const secretData = session.secret_data as { word: string };
    if (answer.toUpperCase().trim() !== secretData.word) {
      return NextResponse.json({ error: "Incorrect answer." }, { status: 400 });
    }
    if (typeof elapsedSeconds === "number" && elapsedSeconds < MIN_SECONDS_SCRAMBLE) {
      return NextResponse.json({ error: "Game completed too quickly." }, { status: 400 });
    }
  } else if (gameType === "lucky") {
    // Lucky number: must have won via the guess endpoint (is_won flag set)
    if (!(session.is_won as boolean)) {
      return NextResponse.json({ error: "The number was not guessed correctly." }, { status: 400 });
    }
  }

  // Mark session as complete
  await supabaseAdmin
    .from("game_sessions")
    .update({
      is_complete: true,
      completed_at: new Date().toISOString(),
      move_count: moves ?? null,
      elapsed_seconds: elapsedSeconds ?? null,
    })
    .eq("id", sessionId);

  // Record play & award points
  const label = GAME_LABELS[gameType];

  await supabaseAdmin.from("game_plays").insert({
    user_id: userId,
    game_type: gameType,
    result: { type: "points", value: pointsReward, label: `+${pointsReward} pts` },
  });

  await supabaseAdmin.rpc("add_user_points", {
    p_user_id: userId,
    p_amount: pointsReward,
  });

  await supabaseAdmin.from("point_transactions").insert({
    user_id: userId,
    amount: pointsReward,
    type: gameType,
    description: `Completed ${label}`,
  });

  return NextResponse.json({ pointsEarned: pointsReward });
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const gameType = url.searchParams.get("game");

  if (!gameType || !(gameType in GAME_LABELS)) {
    return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
  }

  const content = await getSiteContent();
  const dealsHub = content.dealsHub;

  const dailyLimit =
    gameType === "memory" ? (dealsHub.memoryMatch.dailyLimit ?? 3) :
    gameType === "lucky" ? (dealsHub.luckyNumber.dailyLimit ?? 5) :
    (dealsHub.wordScramble.dailyLimit ?? 3);

  const pointsReward =
    gameType === "memory" ? dealsHub.memoryMatch.pointsReward :
    gameType === "lucky" ? dealsHub.luckyNumber.pointsReward :
    dealsHub.wordScramble.pointsReward;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from("game_plays")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("game_type", gameType)
    .gte("created_at", todayStart.toISOString());

  const playsToday = count ?? 0;
  const playsLeft = Math.max(0, dailyLimit - playsToday);

  return NextResponse.json({ playsLeft, playsToday, dailyLimit, pointsReward });
}
