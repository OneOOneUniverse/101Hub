import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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
    // Use Africa's Talking REST API directly (more reliable on serverless platforms)
    const recipientList = recipients.join(",");
    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        apiKey: apiKey,
      } as Record<string, string>,
      body: `username=${username}&to=${recipientList}&message=${encodeURIComponent(message)}`,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[send-sms] Africa's Talking API error:", error);
      return NextResponse.json(
        { error: `Africa's Talking API error: ${error.error || "Unknown error"}` },
        { status: 500 }
      );
    }

    const result = (await response.json()) as {
      SMSMessageData?: {
        Message: string;
        Recipients?: Array<{ status: string; number: string; messageId: string }>;
      };
    };

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
