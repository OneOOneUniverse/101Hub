import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSiteContent } from "@/lib/site-content";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { questionId?: string; answerIndex?: number };
  if (!body.questionId || typeof body.answerIndex !== "number") {
    return NextResponse.json({ error: "Missing questionId or answerIndex" }, { status: 400 });
  }

  const content = await getSiteContent();
  const { trivia } = content.dealsHub;

  if (!trivia.enabled) {
    return NextResponse.json({ error: "Trivia is currently disabled" }, { status: 400 });
  }

  // Check daily limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todayPlays } = await supabaseAdmin
    .from("game_plays")
    .select("id")
    .eq("user_id", userId)
    .eq("game_type", "trivia")
    .gte("created_at", todayStart.toISOString());

  if (todayPlays && todayPlays.length >= trivia.dailyLimit) {
    return NextResponse.json({ error: "Daily trivia limit reached", limitReached: true }, { status: 429 });
  }

  // Check if already answered this question today
  const { data: alreadyAnswered } = await supabaseAdmin
    .from("game_plays")
    .select("id")
    .eq("user_id", userId)
    .eq("game_type", "trivia")
    .gte("created_at", todayStart.toISOString())
    .contains("result", { questionId: body.questionId });

  if (alreadyAnswered && alreadyAnswered.length > 0) {
    return NextResponse.json({ error: "Already answered this question today" }, { status: 400 });
  }

  const question = trivia.questions.find((q) => q.id === body.questionId);
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const correct = body.answerIndex === question.correctIndex;

  // Record play
  await supabaseAdmin.from("game_plays").insert({
    user_id: userId,
    game_type: "trivia",
    result: { questionId: body.questionId, answerIndex: body.answerIndex, correct },
  });

  if (correct) {
    await supabaseAdmin.rpc("add_user_points", { p_user_id: userId, p_amount: question.pointsReward });
    await supabaseAdmin.from("point_transactions").insert({
      user_id: userId,
      amount: question.pointsReward,
      type: "trivia",
      description: `Answered trivia correctly: +${question.pointsReward} points`,
    });
  }

  return NextResponse.json({
    correct,
    correctIndex: question.correctIndex,
    pointsEarned: correct ? question.pointsReward : 0,
  });
}
