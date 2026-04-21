import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_REACTIONS = ["like", "helpful", "love"] as const;
type ReactionType = (typeof VALID_REACTIONS)[number];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: reviewId } = await params;
  const body = (await request.json()) as { reaction?: string };
  const reaction = body.reaction as ReactionType;

  if (!VALID_REACTIONS.includes(reaction)) {
    return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
  }

  // Check review exists and is not deleted
  const { data: review, error: reviewErr } = await supabaseAdmin
    .from("general_reviews")
    .select("id")
    .eq("id", reviewId)
    .eq("is_deleted", false)
    .single();

  if (reviewErr || !review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // Check if reaction already exists (toggle)
  const { data: existing } = await supabaseAdmin
    .from("general_review_reactions")
    .select("id")
    .eq("review_id", reviewId)
    .eq("user_id", userId)
    .eq("reaction_type", reaction)
    .maybeSingle();

  if (existing) {
    // Remove reaction
    await supabaseAdmin
      .from("general_review_reactions")
      .delete()
      .eq("id", existing.id);

    return NextResponse.json({ toggled: "removed", reaction });
  }

  // Add reaction
  const { error } = await supabaseAdmin
    .from("general_review_reactions")
    .insert({ review_id: reviewId, user_id: userId, reaction_type: reaction });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ toggled: "added", reaction }, { status: 201 });
}
