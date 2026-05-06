import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendVendorApplicationEmail, sendVendorApplicationConfirmationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "You must be logged in to apply." }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const body = (await request.json()) as {
    businessName?: string;
    description?: string;
    phone?: string;
    location?: string;
    category?: string;
    website?: string;
    inviteToken?: string;
  };

  const { businessName, description, phone, location, category } = body;
  const rawInviteToken = typeof body.inviteToken === "string" ? body.inviteToken.trim() : "";

  if (!businessName?.trim() || !description?.trim() || !phone?.trim() || !location?.trim() || !category?.trim()) {
    return NextResponse.json({ error: "All required fields must be filled." }, { status: 400 });
  }

  // If an invite token was supplied, validate it before inserting
  let inviteTokenId: string | null = null;
  if (rawInviteToken) {
    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from("vendor_invite_tokens")
      .select("id, uses_limit, uses_count, expires_at, revoked")
      .eq("token", rawInviteToken)
      .single();

    if (tokenErr || !tokenRow) {
      return NextResponse.json({ error: "Invalid invite link." }, { status: 400 });
    }
    if (tokenRow.revoked) {
      return NextResponse.json({ error: "This invite link has been revoked." }, { status: 400 });
    }
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invite link has expired." }, { status: 400 });
    }
    if (tokenRow.uses_limit !== null && tokenRow.uses_count >= tokenRow.uses_limit) {
      return NextResponse.json({ error: "This invite link has reached its maximum uses." }, { status: 400 });
    }
    inviteTokenId = tokenRow.id as string;
  }

  // Check if already applied
  const { data: existing } = await supabaseAdmin
    .from("vendor_applications")
    .select("id, status")
    .eq("user_id", userId)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "You have already submitted an application.", status: existing.status },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin.from("vendor_applications").insert({
    user_id: userId,
    user_email: email,
    business_name: businessName.trim(),
    description: description.trim(),
    phone: phone.trim(),
    location: location.trim(),
    category: category.trim(),
    website: typeof body.website === "string" ? body.website.trim() : null,
    status: "pending",
    ...(inviteTokenId ? { invite_token_id: inviteTokenId } : {}),
  });

  if (error) {
    console.error("vendor apply error:", error);
    return NextResponse.json({ error: "Failed to submit application." }, { status: 500 });
  }

  // Increment invite token use count (non-blocking)
  if (inviteTokenId) {
    supabaseAdmin.rpc("increment_invite_token_use", { token_id: inviteTokenId })
      .then(({ error: rpcErr }) => {
        if (rpcErr) {
          // Fallback: manual increment
          return supabaseAdmin
            .from("vendor_invite_tokens")
            .select("uses_count")
            .eq("id", inviteTokenId)
            .single()
            .then(({ data: t }) =>
              supabaseAdmin
                .from("vendor_invite_tokens")
                .update({ uses_count: (t?.uses_count ?? 0) + 1 })
                .eq("id", inviteTokenId)
            );
        }
      })
      .catch((err: unknown) => console.error("invite token increment error:", err));
  }

  // Notify admin(s) about the new vendor application (non-blocking)
  sendVendorApplicationEmail({
    applicantName: user?.fullName ?? "",
    applicantEmail: email,
    businessName: businessName.trim(),
    category: category.trim(),
    phone: phone.trim(),
    location: location.trim(),
    description: description.trim(),
    website: typeof body.website === "string" ? body.website.trim() : undefined,
  }).catch((err) => console.error("vendor application admin email error:", err));

  // Confirmation email to the vendor (non-blocking)
  if (email) {
    sendVendorApplicationConfirmationEmail({
      applicantEmail: email,
      applicantName: user?.fullName ?? "",
      businessName: businessName.trim(),
    }).catch((err) => console.error("vendor confirmation email error:", err));
  }

  return NextResponse.json({ success: true });
}
