import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSiteContent } from "@/lib/site-content";

const DEFAULT_WORD_LIST = [
  "GADGET", "DEALS", "POINTS", "REWARD", "LUCKY", "FLASH", "STORE",
  "PHONE", "TABLET", "LAPTOP", "GAMING", "STYLE", "OFFER", "BONUS",
];

function scrambleWord(word: string): string {
  const arr = word.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const result = arr.join("");
  // Ensure scrambled !== original (retry if same)
  return result === word && word.length > 1 ? scrambleWord(word) : result;
}

/**
 * POST /api/deals/game-session
 * Creates a new server-side game session. The secret (word / lucky number) is
 * stored in the DB — never sent to the client — preventing console cheating.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { gameType?: string };
  const gameType = body.gameType;

  if (!gameType || !["memory", "lucky", "scramble"].includes(gameType)) {
    return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
  }

  const content = await getSiteContent();
  const dealsHub = content.dealsHub;

  // Check if this game is enabled
  const gameEnabled =
    gameType === "memory" ? dealsHub.memoryMatch.enabled :
    gameType === "lucky" ? dealsHub.luckyNumber.enabled :
    dealsHub.wordScramble.enabled;

  if (!gameEnabled) {
    return NextResponse.json({ error: "This game is currently disabled" }, { status: 400 });
  }

  // Check daily play limit (uses game_plays which only records completed/claimed games)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const dailyLimit =
    gameType === "memory" ? (dealsHub.memoryMatch.dailyLimit ?? 3) :
    gameType === "lucky" ? (dealsHub.luckyNumber.dailyLimit ?? 5) :
    (dealsHub.wordScramble.dailyLimit ?? 3);

  const { count: playsToday } = await supabaseAdmin
    .from("game_plays")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("game_type", gameType)
    .gte("created_at", todayStart.toISOString());

  if ((playsToday ?? 0) >= dailyLimit) {
    return NextResponse.json({ error: "Daily limit reached", limitReached: true }, { status: 429 });
  }

  // Anti-cheat: rate-limit session creation to max 15 per 10 minutes per user per game
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count: recentSessions } = await supabaseAdmin
    .from("game_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("game_type", gameType)
    .gte("started_at", tenMinsAgo);

  if ((recentSessions ?? 0) >= 15) {
    return NextResponse.json(
      { error: "Too many game attempts. Please wait a few minutes before trying again." },
      { status: 429 }
    );
  }

  // Expire any stale uncompleted sessions for this user+game
  await supabaseAdmin
    .from("game_sessions")
    .update({ is_complete: true })
    .eq("user_id", userId)
    .eq("game_type", gameType)
    .eq("is_complete", false)
    .lt("expires_at", new Date().toISOString());

  // Build secret data & client response based on game type
  let secretData: Record<string, unknown> = {};
  let responseData: Record<string, unknown> = {};

  if (gameType === "lucky") {
    const maxTries = Math.max(1, dealsHub.luckyNumber.maxTries ?? 5);
    const rangeMax = 20;
    const secret = Math.floor(Math.random() * rangeMax) + 1;
    secretData = { secret, maxTries, rangeMax };
    // Do NOT send the secret to the client
    responseData = { maxTries, rangeMax };
  } else if (gameType === "scramble") {
    const customWords = dealsHub.wordScramble.words;
    const wordList = customWords.length > 0 ? customWords.map((w) => w.toUpperCase()) : DEFAULT_WORD_LIST;
    const word = wordList[Math.floor(Math.random() * wordList.length)];
    const scrambled = scrambleWord(word);
    secretData = { word };
    // Send scrambled word to client but NOT the original
    responseData = { scrambledWord: scrambled, wordLength: word.length };
  } else {
    // memory: record start time server-side
    secretData = { startedAt: Date.now() };
  }

  // Create the session
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const { data: session, error } = await supabaseAdmin
    .from("game_sessions")
    .insert({
      user_id: userId,
      game_type: gameType,
      secret_data: secretData,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Could not create game session" }, { status: 500 });
  }

  return NextResponse.json({ sessionId: session.id, ...responseData });
}

/**
 * PUT /api/deals/game-session
 * Submit a guess for Lucky Number. All guessing logic runs server-side so the
 * secret number is never exposed to the client.
 */
export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { sessionId?: string; guess?: number };
  const { sessionId, guess } = body;

  if (!sessionId || typeof guess !== "number") {
    return NextResponse.json({ error: "Missing sessionId or guess" }, { status: 400 });
  }

  // Fetch session — must belong to this user and be for lucky number
  const { data: session } = await supabaseAdmin
    .from("game_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("game_type", "lucky")
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.is_complete) {
    return NextResponse.json({ error: "Session already complete" }, { status: 400 });
  }
  if (new Date(session.expires_at as string) < new Date()) {
    return NextResponse.json({ error: "Session expired" }, { status: 400 });
  }

  const secretData = session.secret_data as { secret: number; maxTries: number; rangeMax: number };
  const { secret, maxTries } = secretData;
  const rangeMax = secretData.rangeMax ?? 20;

  // Validate guess range
  if (!Number.isInteger(guess) || guess < 1 || guess > rangeMax) {
    return NextResponse.json({ error: `Guess must be between 1 and ${rangeMax}` }, { status: 400 });
  }

  const newGuessCount = ((session.guess_count as number) ?? 0) + 1;

  if (guess === secret) {
    // User won — mark is_won=true but NOT is_complete (they still need to claim points)
    await supabaseAdmin
      .from("game_sessions")
      .update({ is_won: true, guess_count: newGuessCount })
      .eq("id", sessionId);

    return NextResponse.json({
      correct: true,
      hint: "correct" as const,
      guessesLeft: maxTries - newGuessCount,
      won: true,
    });
  }

  const hint = guess < secret ? "too_low" : "too_high";
  const guessesLeft = maxTries - newGuessCount;

  if (guessesLeft <= 0) {
    // Out of guesses — mark session as lost and complete
    await supabaseAdmin
      .from("game_sessions")
      .update({ is_complete: true, is_won: false, completed_at: new Date().toISOString(), guess_count: newGuessCount })
      .eq("id", sessionId);

    return NextResponse.json({ correct: false, hint, guessesLeft: 0, lost: true, secret });
  }

  // Update guess count
  await supabaseAdmin
    .from("game_sessions")
    .update({ guess_count: newGuessCount })
    .eq("id", sessionId);

  return NextResponse.json({ correct: false, hint, guessesLeft });
}
