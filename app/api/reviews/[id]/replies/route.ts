import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAvatarById } from "@/lib/avatar-options";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: reviewId } = await params;
  const user = await currentUser();
  const body = (await request.json()) as { content?: string };
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!content || content.length < 1 || content.length > 1000) {
    return NextResponse.json({ error: "Reply must be between 1 and 1000 characters" }, { status: 400 });
  }

  // Ensure review exists and is visible
  const { data: review, error: reviewErr } = await supabaseAdmin
    .from("general_reviews")
    .select("id")
    .eq("id", reviewId)
    .eq("is_deleted", false)
    .single();

  if (reviewErr || !review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const metadata = (user?.publicMetadata ?? {}) as Record<string, unknown>;
  const avatarId = typeof metadata.avatarId === "string" ? metadata.avatarId : undefined;
  const avatar = getAvatarById(avatarId);
  const userName =
    user?.username ??
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ??
    "Anonymous";

  const { data, error } = await supabaseAdmin
    .from("general_review_replies")
    .insert({
      review_id: reviewId,
      user_id: userId,
      user_name: userName,
      user_avatar: avatar?.src ?? "",
      content,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reply: data }, { status: 201 });
}
