import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAvatarById } from "@/lib/avatar-options";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const sort = request.nextUrl.searchParams.get("sort") ?? "newest";
  const offset = (page - 1) * PAGE_SIZE;

  const orderCol = sort === "top" ? "reaction_count" : "created_at";
  const orderAsc = false;

  // Fetch reviews with reaction counts and reply counts
  const { data: reviews, error, count } = await supabaseAdmin
    .from("general_reviews")
    .select(
      `id, user_id, user_name, user_avatar, content, rating, created_at,
       general_review_reactions(reaction_type, user_id),
       general_review_replies(id, user_id, user_name, user_avatar, content, created_at, is_deleted)`,
      { count: "exact" }
    )
    .eq("is_deleted", false)
    .order(orderCol === "created_at" ? "created_at" : "created_at", { ascending: orderAsc })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter out deleted replies
  const shaped = (reviews ?? []).map((r) => ({
    ...r,
    general_review_replies: (r.general_review_replies ?? []).filter(
      (reply: { is_deleted: boolean }) => !reply.is_deleted
    ),
  }));

  return NextResponse.json({ reviews: shaped, total: count ?? 0, page, pageSize: PAGE_SIZE });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await currentUser();
  const body = (await request.json()) as { content?: string; rating?: number };

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const rating = typeof body.rating === "number" ? body.rating : 0;

  if (!content || content.length < 10 || content.length > 2000) {
    return NextResponse.json({ error: "Review must be between 10 and 2000 characters" }, { status: 400 });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
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
    .from("general_reviews")
    .insert({
      user_id: userId,
      user_name: userName,
      user_avatar: avatar?.src ?? "",
      content,
      rating,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ review: data }, { status: 201 });
}
