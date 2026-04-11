import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSiteContent } from "@/lib/site-content";
import { supabaseAdmin } from "@/lib/supabase";

async function brevoUpsertContact(email: string, name: string, phone: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID ?? 1);

  if (!apiKey || apiKey === "your-brevo-api-key-here") return;

  const [firstName, ...rest] = name.trim().split(" ");
  const lastName = rest.join(" ");

  await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      email,
      attributes: { FIRSTNAME: firstName, LASTNAME: lastName, SMS: phone, SOURCE: "checkout" },
      listIds: [listId],
      updateEnabled: true,
    }),
  }).catch((err: unknown) => console.error("[checkout] Brevo upsert failed:", err));
}

type CheckoutPayload = {
  customerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  location?: string;
  deliveryType?: string;
  note?: string;
  items?: Array<{ productId: string; qty: number }>;
  paymentMethod?: "paystack" | "manual";
  paymentProof?: string;
};

type OrderLine = { name: string; qty: number; unitPrice: number; lineTotal: number };

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465" ? true : false, // Use secure for 465, TLS for 587
    auth: {
      user: process.env.SMTP_USER,
      // Strip spaces Google sometimes includes in displayed app passwords
      pass: (process.env.SMTP_PASS ?? "").replace(/\s/g, ""),
    },
  });
}

function orderEmailHtml(opts: {
  orderRef: string;
  customerName: string;
  phone: string;
  address: string;
  note: string;
  lines: OrderLine[];
  subtotal: number;
  delivery: number;
  processingFee: number;
  total: number;
  downpayment: number;
  paymentMethod: string;
  paymentStatus: string;
  storePhone: string;
}) {
  const rows = opts.lines
    .map(
      (l) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${l.name}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${l.qty}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">GHS ${l.unitPrice.toFixed(2)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">GHS ${l.lineTotal.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:auto;padding:24px">
  <h2 style="color:#e11d48">101Hub — Order ${opts.orderRef}</h2>
  <p><strong>Customer:</strong> ${opts.customerName}</p>
  <p><strong>Phone:</strong> ${opts.phone}</p>
  <p><strong>Delivery address:</strong> ${opts.address}</p>
  ${opts.note ? `<p><strong>Note:</strong> ${opts.note}</p>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px">
    <thead>
      <tr style="background:#f4f4f5">
        <th style="padding:8px;text-align:left">Product</th>
        <th style="padding:8px">Qty</th>
        <th style="padding:8px;text-align:right">Unit</th>
        <th style="padding:8px;text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;max-width:300px;margin-left:auto">
    <tr><td style="padding:4px 8px">Subtotal</td><td style="padding:4px 8px;text-align:right">GHS ${opts.subtotal.toFixed(2)}</td></tr>
    <tr><td style="padding:4px 8px">Delivery</td><td style="padding:4px 8px;text-align:right">${opts.delivery === 0 ? "Free" : `GHS ${opts.delivery.toFixed(2)}`}</td></tr>
    ${opts.processingFee > 0 ? `<tr><td style="padding:4px 8px">Processing fee</td><td style="padding:4px 8px;text-align:right">GHS ${opts.processingFee.toFixed(2)}</td></tr>` : ""}
    <tr style="font-weight:bold;font-size:1.1em"><td style="padding:8px">Total</td><td style="padding:8px;text-align:right">GHS ${opts.total.toFixed(2)}</td></tr>
  </table>
  <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
  <div style="background:#fef3c7;border:1px solid #fcd34d;padding:12px;border-radius:8px;margin-bottom:16px">
    <p style="margin:0 0 8px 0;font-weight:bold;color:#78350f">💳 Payment Status</p>
    <p style="margin:0 0 4px 0;font-size:0.9em"><strong>Method:</strong> ${opts.paymentMethod === "paystack" ? "Paystack (Online)" : "Manual Transfer"}</p>
    <p style="margin:0 0 4px 0;font-size:0.9em"><strong>Downpayment (40%):</strong> GHS ${opts.downpayment.toFixed(2)}</p>
    <p style="margin:0;font-size:0.9em"><strong>Status:</strong> ${opts.paymentStatus}</p>
    <p style="margin:8px 0 0 0;font-size:0.85em;color:#92400e">Remaining 60% (GHS ${(opts.total - opts.downpayment).toFixed(2)}) payable at delivery</p>
  </div>
  ${opts.paymentMethod === "manual" ? `
  <div style="background:#fee2e2;border:2px solid #dc2626;padding:14px;border-radius:8px;margin-bottom:16px">
    <p style="margin:0 0 10px 0;font-weight:bold;color:#991b1b;font-size:1em">📸 IMPORTANT: Screenshot Required</p>
    <p style="margin:0 0 8px 0;font-size:0.9em;color:#7f1d1d"><strong>Your payment proof screenshot is needed to verify your payment.</strong></p>
    
    <p style="margin:8px 0 4px 0;font-weight:bold;color:#991b1b;font-size:0.9em">To complete this order, your screenshot must show:</p>
    <ul style="margin:4px 0 8px 0;padding-left:20px;color:#7f1d1d;font-size:0.85em">
      <li>Recipient phone number</li>
      <li>Amount: <strong>GHS ${opts.downpayment.toFixed(2)}</strong></li>
      <li>Transaction reference or confirmation status</li>
      <li>Date and time of transaction</li>
    </ul>
    
    <p style="margin:8px 0 0 0;font-size:0.85em;color:#7f1d1d;font-weight:bold">❌ Payment orders without valid screenshots cannot be approved.</p>
  </div>
  ` : ""}
  <p style="font-size:0.85em;color:#555">Questions? Call/WhatsApp: <strong>${opts.storePhone}</strong></p>
</body>
</html>`;
}

async function sendEmails(opts: {
  orderRef: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  note: string;
  lines: OrderLine[];
  subtotal: number;
  delivery: number;
  processingFee: number;
  total: number;
  downpayment: number;
  paymentMethod: string;
  paymentStatus: string;
}) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const storeEmail = process.env.STORE_EMAIL ?? "josephsakyi247@gmail.com";
  const storePhone = process.env.STORE_PHONE ?? "+233 548656980";

  if (!smtpUser || !smtpPass || smtpPass === "YOUR_GMAIL_APP_PASSWORD_HERE") {
    console.warn(
      "[checkout] Email skipped: SMTP_USER or SMTP_PASS not set in .env.local. " +
        "Generate a Gmail App Password at https://myaccount.google.com/apppasswords"
    );
    return;
  }

  const transporter = buildTransporter();

  // Verify SMTP connection before sending
  try {
    await transporter.verify();
  } catch (err) {
    console.error("[checkout] SMTP connection failed:", err);
    return;
  }

  const html = orderEmailHtml({ ...opts, storePhone });

  const ownerMail = {
    from: `"101Hub Orders" <${smtpUser}>`,
    to: storeEmail,
    subject: `New Order ${opts.orderRef} — ${opts.customerName}`,
    html,
  };

  const promises: Promise<unknown>[] = [
    transporter.sendMail(ownerMail).catch((err: unknown) => {
      console.error("[checkout] Failed to send owner email:", err);
    }),
    transporter
      .sendMail({
        from: `"101Hub" <${smtpUser}>`,
        to: opts.customerEmail,
        subject: `Your 101Hub order ${opts.orderRef} is confirmed!`,
        html,
      })
      .catch((err: unknown) => {
        console.error("[checkout] Failed to send customer email:", err);
      }),
  ];

  await Promise.allSettled(promises);
}

export async function POST(request: Request) {
  const { products, features, deliverySettings, paymentSettings } = await getSiteContent();
  let body: CheckoutPayload;

  try {
    body = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!body.customerName || !body.email || !body.phone || !body.address || !body.items?.length) {
    return NextResponse.json(
      { error: "customerName, email, phone, address and items are required" },
      { status: 400 }
    );
  }

  if (!features.checkout || !features.cart) {
    return NextResponse.json({ error: "Checkout is currently unavailable" }, { status: 403 });
  }

  const paymentMethod = body.paymentMethod ?? "paystack";
  // Validate payment method is enabled
  if (paymentMethod === "paystack" && !(paymentSettings?.paystackEnabled ?? true)) {
    return NextResponse.json({ error: "Paystack payments are currently unavailable" }, { status: 403 });
  }
  if (paymentMethod === "manual" && !(paymentSettings?.manualEnabled ?? true)) {
    return NextResponse.json({ error: "Manual transfer payments are currently unavailable" }, { status: 403 });
  }

  let subtotal = 0;
  const lines: OrderLine[] = [];

  for (const line of body.items) {
    if (!line.productId || line.qty < 1) {
      return NextResponse.json({ error: "Invalid cart line" }, { status: 400 });
    }

    const product = products.find((item) => item.id === line.productId);

    if (!product) {
      return NextResponse.json(
        { error: `Unknown product: ${line.productId}` },
        { status: 404 }
      );
    }

    if (line.qty > product.stock) {
      return NextResponse.json(
        { error: `${product.name} has only ${product.stock} in stock` },
        { status: 400 }
      );
    }

    const lineTotal = product.price * line.qty;
    subtotal += lineTotal;
    lines.push({ name: product.name, qty: line.qty, unitPrice: product.price, lineTotal });
  }

  const delivery = (() => {
    const totalQty = body.items!.reduce((sum, l) => sum + l.qty, 0);
    if (subtotal === 0) return 0;
    if (totalQty >= deliverySettings.freeDeliveryItemThreshold) return 0;
    const allFree = lines.every((_, i) => {
      const product = products.find((p) => p.id === body.items![i]?.productId);
      return product?.noDeliveryFee === true;
    });
    if (allFree) return 0;
    // Delivery type overrides location-based fees
    if (body.deliveryType && (deliverySettings.deliveryTypes ?? []).length > 0) {
      const dt = deliverySettings.deliveryTypes.find((t) => t.id === body.deliveryType);
      return dt ? dt.fee : 0;
    }
    if (body.location) {
      const locFee = deliverySettings.locationFees.find((l) => l.id === body.location);
      return locFee ? locFee.fee : deliverySettings.defaultFee;
    }
    const productFees = lines.map((_, i) => {
      const product = products.find((p) => p.id === body.items![i]?.productId);
      if (product?.noDeliveryFee) return 0;
      return product?.deliveryFee ?? deliverySettings.defaultFee;
    });
    return Math.max(...productFees, 0);
  })();
  const processingFee = subtotal > 0 ? (deliverySettings.processingFee ?? 4) : 0;
  const total = subtotal + delivery + processingFee;
  const downpayment = total * 0.4;
  const orderRef = `GH-${Date.now()}`;
  const paymentStatus =
    paymentMethod === "paystack"
      ? "Payment processing via Paystack..."
      : "⏳ Awaiting admin verification";

  // Fire-and-forget — never block the response on email/SMS
  void sendEmails({
    orderRef,
    customerName: body.customerName,
    customerEmail: body.email ?? "",
    phone: body.phone,
    address: body.address,
    note: body.note ?? "",
    lines,
    subtotal,
    delivery,
    processingFee,
    total,
    downpayment,
    paymentMethod,
    paymentStatus,
  });

  // Save order to Supabase (awaited so it completes before response)
  const { error: dbError } = await supabaseAdmin.from("orders").insert({
    order_ref: orderRef,
    customer_name: body.customerName,
    customer_email: body.email ?? "",
    customer_phone: body.phone,
    customer_address: body.address,
    customer_note: body.note ?? "",
    delivery_type: body.deliveryType ?? null,
    items: lines,
    subtotal,
    delivery,
    processing_fee: processingFee,
    total,
    downpayment,
    payment_method: paymentMethod,
    payment_proof: body.paymentProof ?? null,
    payment_status: paymentMethod === "paystack" ? "verified" : "pending",
    order_status: paymentMethod === "paystack" ? "confirmed" : "payment_pending_admin_review",
  });

  if (dbError) {
    console.error("[checkout] Supabase insert failed:", dbError.message);
  }

  // Fire-and-forget — add/update the customer in Brevo subscriber list
  if (body.email) {
    void brevoUpsertContact(body.email, body.customerName, body.phone);
  }

  return NextResponse.json(
    {
      success: true,
      orderRef,
      paymentMethod: paymentMethod === "paystack" ? "Paystack (Online)" : "Manual Transfer",
      customer: { name: body.customerName, phone: body.phone, address: body.address, note: body.note ?? "", deliveryType: body.deliveryType },
      lines,
      totals: { subtotal, delivery, processingFee, total, downpayment },
      storePhone: process.env.STORE_PHONE ?? "+233 548656980",
      storeEmail: process.env.STORE_EMAIL ?? "josephsakyi247@gmail.com",
      message: paymentMethod === "manual"
        ? "Order submitted! We will verify your payment and call you to confirm delivery."
        : "Order placed! Complete payment via Paystack.",
    },
    { status: 201 }
  );
}
