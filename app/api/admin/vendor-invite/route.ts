import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

type InviteToken = {
  id: string;
  token: string;
  label: string | null;
  uses_limit: number | null;
  uses_count: number;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
};

const SELECT_FIELDS =
  "id, token, label, uses_limit, uses_count, expires_at, revoked, created_at";

/** GET /api/admin/vendor-invite — list all invite tokens */
export async function GET() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("vendor_invite_tokens")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[vendor-invite] list error:", error);
    return NextResponse.json({ error: "Failed to fetch invite tokens." }, { status: 500 });
  }

  return NextResponse.json({ tokens: (data ?? []) as InviteToken[] });
}

/** POST /api/admin/vendor-invite — create a new invite token */
export async function POST(request: NextRequest) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = (await request.json()) as {
    label?: string;
    usesLimit?: number | null;
    expiresAt?: string | null;
  };

  const usesLimit =
    typeof body.usesLimit === "number" && body.usesLimit > 0
      ? body.usesLimit
      : null;

  const expiresAt =
    typeof body.expiresAt === "string" && body.expiresAt.trim()
      ? body.expiresAt.trim()
      : null;

  const { data, error } = await supabaseAdmin
    .from("vendor_invite_tokens")
    .insert({
      created_by: userId,
      label:
        typeof body.label === "string" && body.label.trim()
          ? body.label.trim()
          : null,
      uses_limit: usesLimit,
      expires_at: expiresAt,
    })
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    console.error("[vendor-invite] create error:", error);
    return NextResponse.json({ error: "Failed to create invite token." }, { status: 500 });
  }

  return NextResponse.json({ token: data as InviteToken }, { status: 201 });
}

/** DELETE /api/admin/vendor-invite?id=<uuid> — revoke a token */
export async function DELETE(request: NextRequest) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("vendor_invite_tokens")
    .update({ revoked: true })
    .eq("id", id);

  if (error) {
    console.error("[vendor-invite] revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke token." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
