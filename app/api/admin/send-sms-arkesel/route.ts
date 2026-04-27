import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/** Normalise a raw phone number to E.164 (+233…) */
function normalisePhone(raw: string): string {
  const p = raw.replace(/\s/g, "");
  if (p.startsWith("0") && p.length === 10) return `+233${p.slice(1)}`;
  if (p.startsWith("233") && !p.startsWith("+")) return `+${p}`;
  if (!p.startsWith("+")) return `+${p}`;
  return p;
}

type SendSmsPayload = {
  message?: string;
  /** "broadcast" | "contacts" | "custom" */
  mode?: "broadcast" | "contacts" | "custom";
  contactIds?: string[];
  phones?: string[];
};

export async function POST(request: Request) {
  // Admin guard
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const adminCheck = await isCurrentUserAdmin();
  if (!adminCheck) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const apiKey = process.env.ARKESEL_API_KEY;
  const senderId = process.env.ARKESEL_SENDER_ID ?? "101Hub";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Arkesel is not configured. Add ARKESEL_API_KEY to .env.local." },
      { status: 503 }
    );
  }

  let body: SendSmsPayload;
  try {
    body = (await request.json()) as SendSmsPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  if (message.length > 160) {
    return NextResponse.json(
      { error: "Message exceeds 160 characters. Shorten it to fit one SMS." },
      { status: 400 }
    );
  }

  const mode = body.mode ?? "broadcast";
  const phoneSet = new Set<string>();

  if (mode === "broadcast") {
    const { data: rows, error: dbError } = await supabaseAdmin
      .from("orders")
      .select("customer_phone")
      .not("customer_phone", "is", null);

    if (dbError) {
      return NextResponse.json({ error: "Could not fetch recipient list." }, { status: 500 });
    }

    for (const row of rows ?? []) {
      const raw = String(row.customer_phone ?? "").trim();
      if (raw) phoneSet.add(normalisePhone(raw));
    }
  } else if (mode === "contacts") {
    const ids = body.contactIds ?? [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "No contact IDs provided." }, { status: 400 });
    }
    const { data: contacts, error: dbError } = await supabaseAdmin
      .from("sms_contacts")
      .select("phone")
      .in("id", ids);

    if (dbError) {
      return NextResponse.json({ error: "Could not fetch contacts." }, { status: 500 });
    }

    for (const c of contacts ?? []) {
      const raw = String(c.phone ?? "").trim();
      if (raw) phoneSet.add(normalisePhone(raw));
    }
  } else if (mode === "custom") {
    const phones = body.phones ?? [];
    if (phones.length === 0) {
      return NextResponse.json({ error: "No phone numbers provided." }, { status: 400 });
    }
    for (const p of phones) {
      const raw = String(p ?? "").trim();
      if (raw) phoneSet.add(normalisePhone(raw));
    }
  }

  const recipients = Array.from(phoneSet);

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No valid phone numbers found." }, { status: 404 });
  }

  try {
    // Arkesel v2 SMS API — https://developers.arkesel.com
    const response = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: senderId,
        message,
        recipients,
      }),
    });

    const rawResult = await response.text();
    let result: {
      status?: string;
      message?: string;
      data?: Array<{ recipient: string; id: string; status: string }>;
    };

    try {
      result = JSON.parse(rawResult);
    } catch {
      console.error("[send-sms-arkesel] Non-JSON response:", rawResult);
      return NextResponse.json(
        { error: `Arkesel returned an unexpected response: ${rawResult}` },
        { status: 500 }
      );
    }

    if (!response.ok || result.status === "error") {
      console.error("[send-sms-arkesel] Arkesel error:", rawResult);
      return NextResponse.json(
        { error: `Arkesel error: ${result.message ?? rawResult}` },
        { status: 500 }
      );
    }

    const recipientResults = result.data ?? [];
    const sent = recipientResults.filter((r) => r.status === "success").length;
    const failed = recipientResults.length - sent;

    console.log(`[send-sms-arkesel] Sent: ${sent}/${recipientResults.length}`);

    return NextResponse.json({
      success: true,
      total: recipients.length,
      sent,
      failed,
    });
  } catch (err) {
    console.error("[send-sms-arkesel] Error:", err);
    return NextResponse.json({ error: "Failed to send SMS via Arkesel." }, { status: 500 });
  }
}
