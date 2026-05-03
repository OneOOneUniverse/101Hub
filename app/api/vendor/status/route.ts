import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ status: "none" });
  }

  const { data } = await supabaseAdmin
    .from("vendor_applications")
    .select("id, status, business_name, admin_notes, created_at")
    .eq("user_id", userId)
    .single();

  if (!data) {
    return NextResponse.json({ status: "none" });
  }

  return NextResponse.json({
    status: data.status,
    businessName: data.business_name,
    adminNotes: data.admin_notes,
    appliedAt: data.created_at,
  });
}
