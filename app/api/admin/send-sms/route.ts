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
  /** "broadcast" (all order customers, default) | "contacts" (from sms_contacts table) | "custom" (ad-hoc numbers) */
  mode?: "broadcast" | "contacts" | "custom";
  /** For mode=contacts: array of sms_contacts row IDs */
  contactIds?: string[];
  /** For mode=custom: raw phone numbers */
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

  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;

  if (!apiKey || apiKey === "atsk_" || !username) {
    return NextResponse.json(
      { error: "Africa's Talking is not configured. Add AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME to .env.local." },
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
    // Pull all unique customer phone numbers from orders
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
    // Use Africa's Talking REST API directly (more reliable on serverless platforms)
    const recipientList = recipients.join(",");
    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        apiKey: apiKey,
      } as Record<string, string>,
      body: (() => { const senderId = process.env.AFRICASTALKING_SENDER_ID; const base = `username=${encodeURIComponent(username)}&to=${encodeURIComponent(recipientList)}&message=${encodeURIComponent(message)}`; return senderId ? `${base}&from=${encodeURIComponent(senderId)}` : base; })(),
    });

    if (!response.ok) {
      const rawError = await response.text();
      console.error("[send-sms] Africa's Talking API error:", rawError);
      let errorMsg = rawError;
      try { errorMsg = JSON.parse(rawError)?.error ?? rawError; } catch { /* plain text */ }
      return NextResponse.json(
        { error: `Africa's Talking API error: ${errorMsg}` },
        { status: 500 }
      );
    }

    const rawResult = await response.text();
    let result: {
      SMSMessageData?: {
        Message: string;
        Recipients?: Array<{ status: string; number: string; messageId: string }>;
      };
    };
    try {
      result = JSON.parse(rawResult);
    } catch {
      console.error("[send-sms] Non-JSON response from Africa's Talking:", rawResult);
      return NextResponse.json({ error: `Africa's Talking returned an unexpected response: ${rawResult}` }, { status: 500 });
    }
    const recipientResults = result.SMSMessageData?.Recipients ?? [];
    const sent = recipientResults.filter((r) => r.status === "Success").length;
    const failed = recipientResults.length - sent;

    console.log(`[send-sms] Broadcast sent: ${sent}/${recipientResults.length} recipients`);

    return NextResponse.json({
      success: true,
      total: recipients.length,
      sent,
      failed,
      message: `SMS broadcast sent to ${sent} recipients`,
    });
  } catch (err) {
    console.error("[send-sms] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "SMS broadcast failed." },
      { status: 500 }
    );
  }
}
