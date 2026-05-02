import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sanitizeLine, sanitizeText, hasMinLength, hasMaxLength } from "@/lib/validation";

type RouteCtx = { params: Promise<{ id: string }> };

// PATCH /api/admin/auctions/[id] — update title/desc/status/ends_at etc.
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const { userId } = await auth();
  if (!userId || !(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const auctionId = Number(id);
  if (!auctionId || isNaN(auctionId)) {
    return NextResponse.json({ error: "Invalid auction ID." }, { status: 400 });
  }

  type PatchBody = {
    title?: string;
    description?: string;
    image_url?: string;
    starting_price?: number;
    reserve_price?: number | null;
    min_increment?: number;
    ends_at?: string;
    status?: "active" | "ended" | "cancelled";
    winner_name?: string;
    winner_email?: string;
  };

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Build the update payload — only include fields that were sent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};

  if (body.title !== undefined) {
    const t = sanitizeLine(body.title);
    if (!hasMinLength(t, 3) || !hasMaxLength(t, 120)) {
      return NextResponse.json({ error: "Title must be 3–120 characters." }, { status: 422 });
    }
    updates.title = t;
  }
  if (body.description !== undefined) {
    const d = sanitizeText(body.description);
    if (!hasMaxLength(d, 2000)) {
      return NextResponse.json({ error: "Description must be under 2000 characters." }, { status: 422 });
    }
    updates.description = d;
  }
  if (body.image_url !== undefined) {
    const u = sanitizeLine(body.image_url);
    if (u && !/^https?:\/\//i.test(u)) {
      return NextResponse.json({ error: "Image URL must start with http:// or https://" }, { status: 422 });
    }
    updates.image_url = u;
  }
  if (body.starting_price !== undefined) {
    const p = Number(body.starting_price);
    if (!Number.isFinite(p) || p <= 0) {
      return NextResponse.json({ error: "Starting price must be positive." }, { status: 422 });
    }
    updates.starting_price = p;
  }
  if (body.reserve_price !== undefined) {
    updates.reserve_price = body.reserve_price != null ? Number(body.reserve_price) : null;
  }
  if (body.min_increment !== undefined) {
    const inc = Number(body.min_increment);
    if (!Number.isFinite(inc) || inc <= 0) {
      return NextResponse.json({ error: "Min increment must be positive." }, { status: 422 });
    }
    updates.min_increment = inc;
  }
  if (body.ends_at !== undefined) {
    const ea = sanitizeLine(body.ends_at);
    if (!ea || isNaN(new Date(ea).getTime())) {
      return NextResponse.json({ error: "Invalid end date." }, { status: 422 });
    }
    updates.ends_at = ea;
  }
  if (body.status !== undefined) {
    if (!["active", "ended", "cancelled"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 422 });
    }
    updates.status = body.status;
  }
  if (body.winner_name !== undefined) updates.winner_name = sanitizeLine(body.winner_name);
  if (body.winner_email !== undefined) updates.winner_email = sanitizeLine(body.winner_email);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("auctions")
    .update(updates)
    .eq("id", auctionId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/auctions/[id] — cancel (set status = cancelled)
export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const { userId } = await auth();
  if (!userId || !(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const auctionId = Number(id);
  if (!auctionId || isNaN(auctionId)) {
    return NextResponse.json({ error: "Invalid auction ID." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("auctions")
    .update({ status: "cancelled" })
    .eq("id", auctionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
