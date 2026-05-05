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
    .from("vendor_products")
    .select("*")
    .eq("vendor_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch products." }, { status: 500 });

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
    category?: string;
    stock?: number;
    image?: string;
    images?: string[];
    variants?: object[];
    sizes?: string[] | null;
    colors?: string[] | null;
    discount?: number | null;
    deliveryFee?: number | null;
    noDeliveryFee?: boolean | null;
    videos?: string[] | null;
  };

  const { name, description, price, category } = body;
  if (!name?.trim() || !description?.trim() || !price || !category?.trim()) {
    return NextResponse.json({ error: "name, description, price, and category are required." }, { status: 400 });
  }
  if (typeof price !== "number" || price <= 0) {
    return NextResponse.json({ error: "Price must be a positive number." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("vendor_products")
    .insert({
      vendor_id: userId,
      vendor_name: vendor.business_name,
      name: name.trim(),
      description: description.trim(),
      price,
      category: category.trim(),
      stock: typeof body.stock === "number" && body.stock >= 0 ? body.stock : 1,
      image: typeof body.image === "string" ? body.image.trim() : null,
      images: Array.isArray(body.images) ? body.images : [],
      variants: Array.isArray(body.variants) ? body.variants : null,
      sizes: Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : null,
      colors: Array.isArray(body.colors) && body.colors.length > 0 ? body.colors : null,
      discount: typeof body.discount === "number" && body.discount > 0 ? body.discount : null,
      delivery_fee: typeof body.deliveryFee === "number" ? body.deliveryFee : null,
      no_delivery_fee: body.noDeliveryFee ?? null,
      videos: Array.isArray(body.videos) && body.videos.length > 0 ? body.videos : null,
      status: "approved",
    })
    .select()
    .single();

  if (error) {
    console.error("vendor product insert error:", error);
    return NextResponse.json({ error: "Failed to add product." }, { status: 500 });
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
    category?: string;
    stock?: number;
    image?: string | null;
    images?: string[];
    variants?: object[];
    sizes?: string[] | null;
    colors?: string[] | null;
    discount?: number | null;
    deliveryFee?: number | null;
    noDeliveryFee?: boolean | null;
    videos?: string[] | null;
  };

  const { id, name, description, price, category } = body;
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (!name?.trim() || !description?.trim() || !price || !category?.trim()) {
    return NextResponse.json({ error: "name, description, price, and category are required." }, { status: 400 });
  }
  if (typeof price !== "number" || price <= 0) {
    return NextResponse.json({ error: "Price must be a positive number." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("vendor_products")
    .update({
      name: name.trim(),
      description: description.trim(),
      price,
      category: category.trim(),
      stock: typeof body.stock === "number" && body.stock >= 0 ? body.stock : 1,
      image: typeof body.image === "string" ? body.image.trim() || null : body.image ?? null,
      images: Array.isArray(body.images) ? body.images : [],
      variants: Array.isArray(body.variants) && body.variants.length > 0 ? body.variants : null,
      sizes: Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : null,
      colors: Array.isArray(body.colors) && body.colors.length > 0 ? body.colors : null,
      discount: typeof body.discount === "number" && body.discount > 0 ? body.discount : null,
      delivery_fee: typeof body.deliveryFee === "number" ? body.deliveryFee : null,
      no_delivery_fee: body.noDeliveryFee ?? null,
      videos: Array.isArray(body.videos) && body.videos.length > 0 ? body.videos : null,
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("vendor_id", userId) // only own products
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update product." }, { status: 500 });

  return NextResponse.json({ success: true, item: data });
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("vendor_products")
    .delete()
    .eq("id", id)
    .eq("vendor_id", userId); // ensures vendor can only delete their own

  if (error) return NextResponse.json({ error: "Failed to delete product." }, { status: 500 });

  return NextResponse.json({ success: true });
}
