import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserRole } from "@/lib/auth";

const PAGE_SIZE = 30;

export async function GET(request: NextRequest) {
  const role = await getCurrentUserRole();
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const showDeleted = request.nextUrl.searchParams.get("deleted") === "1";
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabaseAdmin
    .from("general_reviews")
    .select(
      `id, user_id, user_name, content, rating, created_at, is_deleted, deleted_at, deleted_by, deletion_reason,
       general_review_reactions(id, reaction_type),
       general_review_replies(id, user_id, user_name, content, created_at, is_deleted)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (!showDeleted) {
    query = query.eq("is_deleted", false);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reviews: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE });
}
