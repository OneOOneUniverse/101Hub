import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase";

type VerifyPaymentPayload = {
  orderRef?: string;
  action?: "approve" | "reject";
  reason?: string;
};

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465" ? true : false, // Use secure for 465, TLS for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS ?? "").replace(/\s/g, ""),
    },
  });
}

async function sendPaymentVerificationSms(opts: {
  phone: string;
  customerName: string;
  orderRef: string;
  action: "approve" | "reject";
  reason?: string;
}) {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;

  if (!apiKey || apiKey === "atsk_" || !username) {
    console.warn("[verify-payment] SMS skipped: Africa's Talking not configured properly");
    return;
  }

  try {
    // Normalize phone number to E.164 format
    let normalised = opts.phone.replace(/\s/g, "");
    if (normalised.startsWith("0") && normalised.length === 10) {
      normalised = `+233${normalised.slice(1)}`;
    } else if (normalised.startsWith("233") && !normalised.startsWith("+")) {
      normalised = `+${normalised}`;
    } else if (!normalised.startsWith("+")) {
      normalised = `+${normalised}`;
    }

    const message =
      opts.action === "approve"
        ? `Hi ${opts.customerName}, your 101Hub payment for order ${opts.orderRef} is verified! We're now processing your order. You'll receive a call/text soon with delivery details.`
        : `Hi ${opts.customerName}, we couldn't verify your payment for order ${opts.orderRef}. Please contact us. ${opts.reason ? `Reason: ${opts.reason}` : ""}`;

    const truncatedMessage = message.slice(0, 160);

    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        apiKey: apiKey,
      } as Record<string, string>,
      body: `username=${username}&to=${normalised}&message=${encodeURIComponent(truncatedMessage)}`,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[verify-payment] SMS send failed:", error);
      return;
    }

    const result = (await response.json()) as {
      SMSMessageData?: { Recipients?: Array<{ status: string }> };
    };

    const recipients = result.SMSMessageData?.Recipients ?? [];
    const sent = recipients.filter((r) => r.status === "Success").length;
    if (sent > 0) {
      console.log(`[verify-payment] SMS sent successfully to ${normalised}`);
    }
  } catch (err) {
    console.error("[verify-payment] SMS error:", err);
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as VerifyPaymentPayload;

  if (!body.orderRef || !body.action) {
    return NextResponse.json({ error: "orderRef and action are required" }, { status: 400 });
  }

  if (!["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  try {
    // 1. Fetch the order from Supabase
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("customer_email, customer_name, customer_phone, order_ref, total")
      .eq("order_ref", body.orderRef)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Update order status in Supabase
    const updates =
      body.action === "approve"
        ? { payment_status: "verified", order_status: "confirmed", updated_at: new Date().toISOString() }
        : { payment_status: "rejected", order_status: "payment_rejected", updated_at: new Date().toISOString() };

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updates)
      .eq("order_ref", body.orderRef);

    if (updateError) {
      console.error("[verify-payment] Supabase update error:", updateError);
      return NextResponse.json({ error: "Could not update order status" }, { status: 500 });
    }

    // 3. Send email and SMS to customer if configured
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const customerEmail = order.customer_email as string;
    const customerPhone = order.customer_phone as string;
    const customerName = order.customer_name as string;
    const orderRef = order.order_ref as string;

    // Send SMS notification
    if (customerPhone) {
      void sendPaymentVerificationSms({
        phone: customerPhone,
        customerName,
        orderRef,
        action: body.action,
        reason: body.reason,
      });
    }

    if (smtpUser && smtpPass && smtpPass !== "YOUR_GMAIL_APP_PASSWORD_HERE" && customerEmail) {
      const transporter = buildTransporter();
      try {
        await transporter.verify();

        if (body.action === "approve") {
          void transporter
            .sendMail({
              from: `"101Hub" <${smtpUser}>`,
              to: customerEmail,
              subject: `Your 101Hub payment has been verified ✓`,
              html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:auto;padding:24px">
  <h2 style="color:#16a34a">Payment Verified ✓</h2>
  <p>Hi ${customerName},</p>
  <p>Great news! Your payment for order <strong>${orderRef}</strong> has been verified.</p>
  <p>We are now processing your order and will contact you soon with delivery details.</p>
  <p>You can track your order at any time: <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL ? `https://${process.env.NEXT_PUBLIC_SUPABASE_URL.replace("https://", "").split(".")[0]}.vercel.app` : ""}/orders/${orderRef}">Track Order</a></p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
  <p style="font-size:0.85em;color:#555">Thank you for shopping with 101Hub!</p>
</body></html>`,
            })
            .catch((err: unknown) => console.error("[verify-payment] Customer email failed:", err));
        } else {
          void transporter
            .sendMail({
              from: `"101Hub" <${smtpUser}>`,
              to: customerEmail,
              subject: `Update on your 101Hub order ${orderRef}`,
              html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:auto;padding:24px">
  <h2 style="color:#dc2626">Payment Could Not Be Verified</h2>
  <p>Hi ${customerName},</p>
  <p>Unfortunately we could not verify your payment for order <strong>${orderRef}</strong>.</p>
  ${body.reason ? `<p><strong>Reason:</strong> ${body.reason}</p>` : ""}
  <p>Please contact us so we can resolve this quickly.</p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
  <p style="font-size:0.85em;color:#555">Call/WhatsApp: <strong>${process.env.STORE_PHONE ?? "+233 548656980"}</strong></p>
</body></html>`,
            })
            .catch((err: unknown) => console.error("[verify-payment] Customer rejection email failed:", err));
        }
      } catch (smtpErr) {
        console.error("[verify-payment] SMTP verify failed:", smtpErr);
      }
    }

    return NextResponse.json(
      { success: true, message: `Payment ${body.action}d successfully`, orderRef: body.orderRef },
      { status: 200 }
    );
  } catch (error) {
    console.error("[verify-payment] Error:", error);
    return NextResponse.json({ error: "Could not process payment verification" }, { status: 500 });
  }
}

