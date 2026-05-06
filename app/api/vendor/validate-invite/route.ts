import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/vendor/validate-invite?token=<hex>
 *
 * Public — no authentication required.
 * Returns { valid: true, tokenId } or { valid: false, reason }.
 * Does NOT consume (increment) the token — that happens on POST /api/vendor/apply.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || token.trim().length === 0) {
    return NextResponse.json({ valid: false, reason: "No token provided." });
  }

  const { data, error } = await supabaseAdmin
    .from("vendor_invite_tokens")
    .select("id, uses_limit, uses_count, expires_at, revoked")
    .eq("token", token.trim())
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, reason: "Invalid invite link." });
  }

  if (data.revoked) {
    return NextResponse.json({ valid: false, reason: "This invite link has been revoked." });
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: "This invite link has expired." });
  }

  if (data.uses_limit !== null && data.uses_count >= data.uses_limit) {
    return NextResponse.json({ valid: false, reason: "This invite link has reached its maximum number of uses." });
  }

  return NextResponse.json({ valid: true, tokenId: data.id as string });
}
