import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AfricasTalking = require("africastalking") as (opts: { apiKey: string; username: string }) => {
  SMS: {
    send: (opts: { to: string[]; message: string; from?: string }) => Promise<{
      SMSMessageData: { Recipients: Array<{ status: string; number: string }> };
    }>;
  };
};

type SendSmsPayload = {
  message?: string;
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

  if (!apiKey || apiKey === "your-africastalking-api-key-here" || !username) {
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

  // Pull all unique customer phone numbers from orders
  const { data: rows, error: dbError } = await supabaseAdmin
    .from("orders")
    .select("customer_phone")
    .not("customer_phone", "is", null);

  if (dbError) {
    return NextResponse.json({ error: "Could not fetch recipient list." }, { status: 500 });
  }

  // Normalise Ghana numbers to E.164 (+233XXXXXXXXX)
  const phoneSet = new Set<string>();
  for (const row of rows ?? []) {
    const raw = String(row.customer_phone ?? "").replace(/\s/g, "");
    if (!raw) continue;

    let normalised = raw;
    if (raw.startsWith("0") && raw.length === 10) {
      normalised = `+233${raw.slice(1)}`; // 0244… → +233244…
    } else if (raw.startsWith("233") && !raw.startsWith("+")) {
      normalised = `+${raw}`;
    } else if (!raw.startsWith("+")) {
      normalised = `+${raw}`;
    }
    phoneSet.add(normalised);
  }

  const recipients = Array.from(phoneSet);

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No phone numbers found in orders." }, { status: 404 });
  }

  try {
    const AT = AfricasTalking({ apiKey, username });
    const result = await AT.SMS.send({ to: recipients, message });
    const recipients_result = result.SMSMessageData.Recipients ?? [];
    const sent = recipients_result.filter((r) => r.status === "Success").length;
    const failed = recipients_result.length - sent;

    return NextResponse.json({
      success: true,
      total: recipients.length,
      sent,
      failed,
    });
  } catch (err) {
    console.error("[send-sms] Africa's Talking error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "SMS send failed." },
      { status: 500 }
    );
  }
}
