import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/vendor/upload
 * Returns a Cloudinary upload signature so vendors can upload
 * product/service images directly to Cloudinary.
 * Requires the user to be an approved vendor.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Verify the user is an approved vendor
  const { data: vendor } = await supabaseAdmin
    .from("vendor_applications")
    .select("id, status")
    .eq("user_id", userId)
    .eq("status", "approved")
    .single();

  if (!vendor) {
    return NextResponse.json({ error: "Only approved vendors can upload files." }, { status: 403 });
  }

  const body = (await request.json()) as { folder?: string; resourceType?: string };
  const folder = `gadget-hub/vendor-uploads/${userId}`;
  const resourceType = body.resourceType === "video" ? "video" : "image";
  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign: Record<string, string | number> = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    resourceType,
  });
}
