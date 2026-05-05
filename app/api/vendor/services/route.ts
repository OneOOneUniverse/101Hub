import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

async function getApprovedVendor(userId: string) {
  const { data } = await supabaseAdmin
    .from("vendor_applications")
    .select("id, business_name, status")
    .eq("user_id", userId)
    .eq("status", "approved")
    .single();
  return data;
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getApprovedVendor(userId);
  if (!vendor) return NextResponse.json({ error: "Not an approved vendor." }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("vendor_services")
    .select("*")
    .eq("vendor_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch services." }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getApprovedVendor(userId);
  if (!vendor) return NextResponse.json({ error: "Not an approved vendor." }, { status: 403 });

  const body = (await request.json()) as {
    name?: string;
    description?: string;
    price?: number;
    turnaround?: string;
    image?: string;
  };

  const { name, description, price, turnaround } = body;
  if (!name?.trim() || !description?.trim() || !price || !turnaround?.trim()) {
    return NextResponse.json(
      { error: "name, description, price, and turnaround are required." },
      { status: 400 }
    );
  }
  if (typeof price !== "number" || price <= 0) {
    return NextResponse.json({ error: "Price must be a positive number." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("vendor_services")
    .insert({
      vendor_id: userId,
      vendor_name: vendor.business_name,
      name: name.trim(),
      description: description.trim(),
      price,
      turnaround: turnaround.trim(),
      image: typeof body.image === "string" ? body.image.trim() : null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("vendor service insert error:", error);
    return NextResponse.json({ error: "Failed to add service." }, { status: 500 });
  }

  return NextResponse.json({ success: true, item: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getApprovedVendor(userId);
  if (!vendor) return NextResponse.json({ error: "Not an approved vendor." }, { status: 403 });

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    description?: string;
    price?: number;
    turnaround?: string;
    image?: string | null;
  };

  const { id, name, description, price, turnaround } = body;
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (!name?.trim() || !description?.trim() || !price || !turnaround?.trim()) {
    return NextResponse.json({ error: "name, description, price, and turnaround are required." }, { status: 400 });
  }
  if (typeof price !== "number" || price <= 0) {
    return NextResponse.json({ error: "Price must be a positive number." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("vendor_services")
    .update({
      name: name.trim(),
      description: description.trim(),
      price,
      turnaround: turnaround.trim(),
      image: typeof body.image === "string" ? body.image.trim() || null : body.image ?? null,
      status: "pending", // resets for re-approval after edit
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("vendor_id", userId) // only own services
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update service." }, { status: 500 });

  return NextResponse.json({ success: true, item: data });
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("vendor_services")
    .delete()
    .eq("id", id)
    .eq("vendor_id", userId);

  if (error) return NextResponse.json({ error: "Failed to delete service." }, { status: 500 });

  return NextResponse.json({ success: true });
}
