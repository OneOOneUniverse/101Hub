import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSiteContent } from "@/lib/site-content";
import { supabaseAdmin } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AfricasTalking = require("africastalking") as (opts: { apiKey: string; username: string }) => {
  SMS: {
    send: (opts: { to: string[]; message: string; from?: string }) => Promise<{
      SMSMessageData: { Recipients: Array<{ status: string; number: string }> };
    }>;
  };
};

type ServiceRequestPayload = {
  packageId?: string;
  customerName?: string;
  phone?: string;
  issue?: string;
  preferredTime?: string;
  requestedDate?: string;
};

/** Normalize and validate Ghana phone numbers to E.164 format (+233XXXXXXXXX) */
function normalizePhoneNumber(phone: string): string | null {
  const raw = phone.replace(/\s/g, "").trim();
  if (!raw) return null;

  let normalized = raw;

  // Ghanaian number: 024XXXXXXX or 0XXXXXXXXX → +233XXXXXXXXX
  if (raw.startsWith("0") && raw.length === 10) {
    normalized = `+233${raw.slice(1)}`;
  }
  // 233XXXXXXXXX → +233XXXXXXXXX
  else if (raw.startsWith("233") && !raw.startsWith("+") && raw.length === 12) {
    normalized = `+${raw}`;
  }
  // +233XXXXXXXXX (already correct)
  else if (raw.startsWith("+233") && raw.length === 13) {
    normalized = raw;
  }
  // International: just ensure + prefix
  else if (!raw.startsWith("+")) {
    normalized = `+${raw}`;
  }

  // Validate it looks reasonable (starts with +, followed by 10+ digits)
  if (!/^\+\d{10,}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS ?? "").replace(/\s/g, ""),
    },
  });
}

/** Generate Ticket Ref guaranteed to be unique via database constraint */
function generateTicketRef(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SV-${timestamp}-${random}`;
}

/** Send email notification to admin and SMS to customer */
async function sendNotifications(opts: {
  ticketRef: string;
  packageName: string;
  customerName: string;
  customerPhone: string;
  issue: string;
  preferredTime?: string;
}) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const storeEmail = process.env.STORE_EMAIL ?? "joeboye247@gmail.com";
  const storePhone = process.env.STORE_PHONE ?? "+233 548656980";
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const atUsername = process.env.AFRICASTALKING_USERNAME;

  // Send email to admin (awaited to ensure it completes)
  if (smtpUser && smtpPass && smtpPass !== "YOUR_GMAIL_APP_PASSWORD_HERE") {
    try {
      const transporter = buildTransporter();
      await transporter.verify();

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:auto;padding:24px">
  <h2 style="color:#e11d48">🔧 New Service Request — Ticket ${opts.ticketRef}</h2>
  
  <div style="background:#f0f9ff;border:1px solid #7dd3fc;padding:16px;border-radius:8px;margin-bottom:16px">
    <p style="margin:0 0 8px 0;font-weight:bold">📦 Service Package</p>
    <p style="margin:0;font-size:1.1em;color:#075985">${opts.packageName}</p>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px">
    <tr>
      <td style="padding:8px;font-weight:bold;background:#f4f4f5;border-radius:4px 0 0 0">Customer</td>
      <td style="padding:8px;border-radius:0 4px 0 0">${opts.customerName}</td>
    </tr>
    <tr>
      <td style="padding:8px;font-weight:bold;background:#f4f4f5">Phone</td>
      <td style="padding:8px">${opts.customerPhone}</td>
    </tr>
    <tr>
      <td style="padding:8px;font-weight:bold;background:#f4f4f5">Issue</td>
      <td style="padding:8px">${opts.issue}</td>
    </tr>
    <tr>
      <td style="padding:8px;font-weight:bold;background:#f4f4f5;border-radius:0 0 0 4px">Preferred Time</td>
      <td style="padding:8px;border-radius:0 0 4px 0">${opts.preferredTime || "Not specified"}</td>
    </tr>
  </table>

  <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
  <p style="font-size:0.85em;color:#555">Questions? Call/WhatsApp: <strong>${storePhone}</strong></p>
</body>
</html>`;

      await transporter.sendMail({
        from: `"101Hub Services" <${smtpUser}>`,
        to: storeEmail,
        subject: `New Service Request ${opts.ticketRef} — ${opts.packageName}`,
        html,
      });

      console.log(`[services] Admin email sent for ticket ${opts.ticketRef}`);
    } catch (err) {
      console.error("[services] Admin email failed:", err);
    }
  }

  // Email notification sent above; SMS notifications have been disabled
  // SMS is now only available through admin dashboard broadcast
}

export async function GET() {
  const { services } = await getSiteContent();
  return NextResponse.json({ items: services });
}

export async function POST(request: Request) {
  const { services, features } = await getSiteContent();
  let body: ServiceRequestPayload;

  try {
    body = (await request.json()) as ServiceRequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!body.packageId || !body.customerName || !body.phone || !body.issue) {
    return NextResponse.json(
      { error: "packageId, customerName, phone and issue are required" },
      { status: 400 }
    );
  }

  if (!features.services) {
    return NextResponse.json({ error: "Services are currently unavailable" }, { status: 403 });
  }

  const selected = services.find((item) => item.id === body.packageId);

  if (!selected) {
    return NextResponse.json({ error: "Unknown service package" }, { status: 404 });
  }

  // Validate and normalize phone number
  const normalizedPhone = normalizePhoneNumber(body.phone);
  if (!normalizedPhone) {
    return NextResponse.json(
      { error: "Invalid phone number. Please use format like 024XXXXXXX or +233XXXXXXXXX" },
      { status: 400 }
    );
  }

  // Generate unique ticket ref
  const ticketRef = generateTicketRef();

  // Save to Supabase
  const { error: dbError, data } = await supabaseAdmin.from("service_requests").insert({
    ticket_ref: ticketRef,
    package_id: body.packageId,
    package_name: selected.name,
    customer_name: body.customerName,
    customer_phone: normalizedPhone,
    issue: body.issue,
    preferred_time: body.preferredTime || null,
    requested_date: body.requestedDate || null,
    status: "pending",
  }).select().single();

  if (dbError) {
    console.error("[services] Supabase insert failed:", dbError.message);
    return NextResponse.json(
      { error: "Could not save service request. Please try again." },
      { status: 500 }
    );
  }

  // Send notifications (fire-and-forget for SMS, awaited for email to ensure it completes)
  void sendNotifications({
    ticketRef,
    packageName: selected.name,
    customerName: body.customerName,
    customerPhone: normalizedPhone,
    issue: body.issue,
    preferredTime: body.preferredTime,
  });

  return NextResponse.json(
    {
      success: true,
      ticketRef: data?.ticket_ref || ticketRef,
      package: selected.name,
      preferredTime: body.preferredTime || "Not specified",
      message: "Service request submitted. Our team will contact you shortly.",
    },
    { status: 201 }
  );
}
