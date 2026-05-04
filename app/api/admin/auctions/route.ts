import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { sanitizeLine, sanitizeText, hasMinLength, hasMaxLength } from "@/lib/validation";
import { sendAuctionLiveEmail } from "@/lib/email";

// GET  /api/admin/auctions — list all auctions (admin only)
export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("auctions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin/auctions — create a new auction
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  type Body = {
    title?: string;
    description?: string;
    image_url?: string;
    starting_price?: number;
    reserve_price?: number | null;
    min_increment?: number;
    ends_at?: string;
  };

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = sanitizeLine(body.title ?? "");
  const description = sanitizeText(body.description ?? "");
  const image_url = sanitizeLine(body.image_url ?? "");
  const starting_price = Number(body.starting_price);
  const reserve_price = body.reserve_price != null ? Number(body.reserve_price) : null;
  const min_increment = Number(body.min_increment ?? 1);
  const ends_at = sanitizeLine(body.ends_at ?? "");

  if (!hasMinLength(title, 3) || !hasMaxLength(title, 120)) {
    return NextResponse.json({ error: "Title must be 3–120 characters." }, { status: 422 });
  }
  if (!hasMaxLength(description, 2000)) {
    return NextResponse.json({ error: "Description must be under 2000 characters." }, { status: 422 });
  }
  if (!Number.isFinite(starting_price) || starting_price <= 0) {
    return NextResponse.json({ error: "Starting price must be a positive number." }, { status: 422 });
  }
  if (!Number.isFinite(min_increment) || min_increment <= 0) {
    return NextResponse.json({ error: "Min increment must be a positive number." }, { status: 422 });
  }
  if (!ends_at || isNaN(new Date(ends_at).getTime()) || new Date(ends_at) <= new Date()) {
    return NextResponse.json({ error: "End date must be a valid future date/time." }, { status: 422 });
  }
  if (image_url && !/^https?:\/\//i.test(image_url)) {
    return NextResponse.json({ error: "Image URL must start with http:// or https://" }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from("auctions")
    .insert({
      title,
      description,
      image_url,
      starting_price,
      reserve_price,
      min_increment,
      ends_at,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Broadcast live-auction email to all users (non-blocking)
  void (async () => {
    try {
      const clerk = await clerkClient();
      const emails: string[] = [];
      let offset = 0;
      while (true) {
        const { data: users } = await clerk.users.getUserList({ limit: 100, offset });
        if (!users?.length) break;
        for (const u of users) {
          const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId);
          const email = primary?.emailAddress ?? u.emailAddresses[0]?.emailAddress;
          if (email) emails.push(email);
        }
        if (users.length < 100) break;
        offset += 100;
      }
      if (emails.length > 0) {
        await sendAuctionLiveEmail({
          auctionId: data.id,
          title: data.title,
          startingPrice: data.starting_price,
          imageUrl: data.image_url || undefined,
          endsAt: data.ends_at,
          recipients: emails,
        });
      }
    } catch (err) {
      console.error("[auction] Failed to send live email:", err);
    }
  })();

  return NextResponse.json(data, { status: 201 });
}
