import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";

type ClerkUserCreatedEvent = {
  type: string;
  data: {
    id: string;
    first_name?: string;
    last_name?: string;
    email_addresses?: Array<{ email_address: string; verification?: { status: string } }>;
  };
};

async function addContactToBrevo(email: string, firstName: string, lastName: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID ?? 1);

  if (!apiKey || apiKey === "your-brevo-api-key-here") {
    console.warn("[clerk-webhook] BREVO_API_KEY not set — skipping contact sync.");
    return;
  }

  const response = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      email,
      attributes: {
        FIRSTNAME: firstName,
        LASTNAME: lastName,
        SOURCE: "signup",
      },
      listIds: [listId],
      updateEnabled: true, // upsert — safe to call even if contact exists
    }),
  });

  if (!response.ok && response.status !== 204) {
    const text = await response.text();
    console.error("[clerk-webhook] Brevo contact add failed:", response.status, text);
  } else {
    console.log("[clerk-webhook] Brevo contact synced:", email);
  }
}

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!secret || secret === "whsec_your-clerk-webhook-secret-here") {
    console.warn("[clerk-webhook] CLERK_WEBHOOK_SECRET not set — skipping verification.");
    return NextResponse.json({ skipped: true });
  }

  const headersList = await headers();
  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers." }, { status: 400 });
  }

  const body = await request.text();

  let event: ClerkUserCreatedEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserCreatedEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type !== "user.created") {
    return NextResponse.json({ received: true });
  }

  const primaryEmail = event.data.email_addresses?.find(
    (e) => e.verification?.status === "verified"
  )?.email_address ?? event.data.email_addresses?.[0]?.email_address;

  if (!primaryEmail) {
    return NextResponse.json({ skipped: "no email" });
  }

  const firstName = event.data.first_name ?? "";
  const lastName = event.data.last_name ?? "";

  await addContactToBrevo(primaryEmail, firstName, lastName);

  // Track signup in analytics
  await supabase.from("analytics_events").insert({
    event_type: "signup",
    user_id: event.data.id,
    metadata: { email: primaryEmail },
  }).then(({ error }) => {
    if (error) console.error("[clerk-webhook] analytics insert failed:", error.message);
  });

  return NextResponse.json({ success: true });
}
