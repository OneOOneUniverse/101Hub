import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendVendorStatusEmail } from "@/lib/email";

export async function GET() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { data: applications, error } = await supabaseAdmin
    .from("vendor_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch applications." }, { status: 500 });

  return NextResponse.json({ applications: applications ?? [] });
}

export async function PATCH(request: NextRequest) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = (await request.json()) as {
    id?: string;
    status?: string;
    adminNotes?: string;
  };

  const { id, status, adminNotes } = body;
  if (!id || !status) {
    return NextResponse.json({ error: "id and status are required." }, { status: 400 });
  }
  if (!["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("vendor_applications")
    .update({
      status,
      admin_notes: typeof adminNotes === "string" ? adminNotes.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Failed to update application." }, { status: 500 });

  // Send email to vendor on approval or rejection
  if (status === "approved" || status === "rejected") {
    const { data: app } = await supabaseAdmin
      .from("vendor_applications")
      .select("user_email, business_name")
      .eq("id", id)
      .single();

    if (app?.user_email) {
      sendVendorStatusEmail({
        applicantEmail: app.user_email,
        applicantName: "",
        businessName: app.business_name,
        status,
        adminNotes: typeof adminNotes === "string" ? adminNotes.trim() : undefined,
      }).catch((err) => console.error("vendor status email error:", err));
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("vendor_applications")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Failed to delete application." }, { status: 500 });

  return NextResponse.json({ success: true });
}
