import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

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
  };

  const { businessName, description, phone, location, category } = body;

  if (!businessName?.trim() || !description?.trim() || !phone?.trim() || !location?.trim() || !category?.trim()) {
    return NextResponse.json({ error: "All required fields must be filled." }, { status: 400 });
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
  });

  if (error) {
    console.error("vendor apply error:", error);
    return NextResponse.json({ error: "Failed to submit application." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
