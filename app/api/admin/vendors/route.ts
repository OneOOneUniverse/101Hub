import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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

  return NextResponse.json({ success: true });
}
