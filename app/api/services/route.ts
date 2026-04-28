import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content";
import { supabaseAdmin } from "@/lib/supabase";
import { sendServiceRequestEmails } from "@/lib/email";

type ServiceRequestPayload = {
  packageId?: string;
  customerName?: string;
  customerEmail?: string;
  phone?: string;
  issue?: string;
  preferredTime?: string;
  requestedDate?: string;
  paymentProof?: string;
  tierLabel?: string;
  confirmedAmount?: number;
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

/** Generate Ticket Ref guaranteed to be unique via database constraint */
function generateTicketRef(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SV-${timestamp}-${random}`;
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

  if (!body.customerEmail) {
    return NextResponse.json(
      { error: "Email address is required." },
      { status: 400 }
    );
  }

  if (!body.paymentProof) {
    return NextResponse.json(
      { error: "Payment screenshot is required before submitting a service request." },
      { status: 402 }
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
    customer_email: body.customerEmail,
    customer_phone: normalizedPhone,
    issue: body.issue,
    preferred_time: body.preferredTime || null,
    requested_date: body.requestedDate || null,
    payment_proof: body.paymentProof,
    status: "pending",
  }).select().single();

  if (dbError) {
    console.error("[services] Supabase insert failed:", dbError.message);
    return NextResponse.json(
      { error: "Could not save service request. Please try again." },
      { status: 500 }
    );
  }

  // Send emails to admin and customer
  void sendServiceRequestEmails({
    ticketRef,
    packageName: selected.name,
    customerName: body.customerName,
    customerEmail: body.customerEmail,
    customerPhone: normalizedPhone,
    issue: body.issue,
    preferredTime: body.preferredTime,
    requestedDate: body.requestedDate,
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
