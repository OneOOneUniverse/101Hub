/**
 * Reusable transactional email service for 101Hub.
 * Server-only — import only in API routes.
 *
 * Uses Nodemailer + Gmail SMTP (or any SMTP provider).
 * Environment variables:
 *   SMTP_HOST     — default smtp.gmail.com
 *   SMTP_PORT     — default 587
 *   SMTP_USER     — sender address
 *   SMTP_PASS     — app password (spaces stripped automatically)
 *   STORE_EMAIL   — store owner email for admin copies
 *   STORE_PHONE   — contact phone shown in emails
 */
import nodemailer from 'nodemailer';

// ─── Transport ──────────────────────────────────────────────────
let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS ?? '').replace(/\s/g, ''),
    },
  });
  return cachedTransporter;
}

function isEmailConfigured(): boolean {
  const u = process.env.SMTP_USER;
  const p = process.env.SMTP_PASS;
  return Boolean(u && p && p !== 'YOUR_GMAIL_APP_PASSWORD_HERE');
}

// ─── Branding constants ─────────────────────────────────────────
const BRAND_COLOR = '#ff6b35';
const BRAND_DEEP = '#d94020';
const STORE_NAME = '101Hub';

function storePhone() {
  return process.env.STORE_PHONE ?? '+233 548656980';
}

// ─── Base layout ────────────────────────────────────────────────
function wrapLayout(bodyContent: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:${BRAND_COLOR};padding:20px 24px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">${STORE_NAME}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 24px 24px">
            ${bodyContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #eee;text-align:center">
            <p style="margin:0 0 4px;font-size:12px;color:#888">Questions? Call/WhatsApp: <strong>${storePhone()}</strong></p>
            <p style="margin:0;font-size:11px;color:#aaa">&copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Order line helpers ─────────────────────────────────────────
type OrderLine = { name: string; qty: number; unitPrice: number; lineTotal: number };

function orderTable(lines: OrderLine[]) {
  const rows = lines
    .map(
      (l) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0">${l.name}</td>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center">${l.qty}</td>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">GHS ${l.unitPrice.toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">GHS ${l.lineTotal.toFixed(2)}</td>
        </tr>`,
    )
    .join('');

  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
    <thead><tr style="background:#f9fafb">
      <th style="padding:10px 8px;text-align:left;font-size:13px;color:#555">Product</th>
      <th style="padding:10px 8px;text-align:center;font-size:13px;color:#555">Qty</th>
      <th style="padding:10px 8px;text-align:right;font-size:13px;color:#555">Unit</th>
      <th style="padding:10px 8px;text-align:right;font-size:13px;color:#555">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function totalsBlock(opts: { subtotal: number; delivery: number; processingFee: number; total: number }) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:280px;margin-left:auto">
    <tr><td style="padding:4px 8px;font-size:14px;color:#555">Subtotal</td><td style="padding:4px 8px;text-align:right;font-size:14px">GHS ${opts.subtotal.toFixed(2)}</td></tr>
    <tr><td style="padding:4px 8px;font-size:14px;color:#555">Delivery</td><td style="padding:4px 8px;text-align:right;font-size:14px">${opts.delivery === 0 ? 'Free' : `GHS ${opts.delivery.toFixed(2)}`}</td></tr>
    ${opts.processingFee > 0 ? `<tr><td style="padding:4px 8px;font-size:14px;color:#555">Processing fee</td><td style="padding:4px 8px;text-align:right;font-size:14px">GHS ${opts.processingFee.toFixed(2)}</td></tr>` : ''}
    <tr style="font-weight:700;font-size:16px"><td style="padding:10px 8px;border-top:2px solid ${BRAND_COLOR}">Total</td><td style="padding:10px 8px;text-align:right;border-top:2px solid ${BRAND_COLOR}">GHS ${opts.total.toFixed(2)}</td></tr>
  </table>`;
}

// ─── Email templates ────────────────────────────────────────────

export interface OrderEmailData {
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
  paymentMethod: string;
  paymentStatus: string;
}

/** New order confirmation — sent to customer */
function orderConfirmationHtml(data: OrderEmailData): string {
  const paymentMethodLabel = data.paymentMethod === 'paystack' ? 'Paystack (Online)' : 'Manual Transfer';

  return wrapLayout(`
    <h2 style="margin:0 0 16px;color:#111;font-size:20px">Order Confirmed! 🎉</h2>
    <p style="margin:0 0 6px;font-size:14px;color:#333">Hi <strong>${data.customerName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;color:#555">Thank you for your order! Here's your receipt:</p>
    
    <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;margin-bottom:16px">
      <p style="margin:0 0 4px;font-size:13px;color:#888">Order Reference</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:${BRAND_COLOR}">${data.orderRef}</p>
    </div>

    <p style="margin:0 0 4px;font-size:13px;color:#888"><strong>Phone:</strong> ${data.phone}</p>
    <p style="margin:0 0 4px;font-size:13px;color:#888"><strong>Delivery:</strong> ${data.address}</p>
    ${data.note ? `<p style="margin:0 0 4px;font-size:13px;color:#888"><strong>Note:</strong> ${data.note}</p>` : ''}

    ${orderTable(data.lines)}
    ${totalsBlock(data)}

    <div style="background:#fef3c7;border:1px solid #fcd34d;padding:14px;border-radius:8px;margin:20px 0">
      <p style="margin:0 0 6px;font-weight:700;color:#78350f;font-size:14px">💳 Payment Details</p>
      <p style="margin:0 0 3px;font-size:13px"><strong>Method:</strong> ${paymentMethodLabel}</p>
      <p style="margin:0 0 3px;font-size:13px"><strong>Total:</strong> GHS ${data.total.toFixed(2)}</p>
      <p style="margin:0 0 3px;font-size:13px"><strong>Status:</strong> ${data.paymentStatus}</p>
    </div>

    ${data.paymentMethod === 'manual' ? `
    <div style="background:#fee2e2;border:2px solid #dc2626;padding:14px;border-radius:8px;margin-bottom:16px">
      <p style="margin:0 0 8px;font-weight:700;color:#991b1b;font-size:14px">📸 IMPORTANT: Screenshot Required</p>
      <p style="margin:0 0 6px;font-size:13px;color:#7f1d1d"><strong>Your payment proof screenshot is needed to verify your payment.</strong></p>
      <p style="margin:6px 0 4px;font-weight:600;color:#991b1b;font-size:13px">Your screenshot must show:</p>
      <ul style="margin:4px 0 8px;padding-left:20px;color:#7f1d1d;font-size:12px">
        <li>Recipient phone number</li>
        <li>Amount: <strong>GHS ${data.total.toFixed(2)}</strong></li>
        <li>Transaction reference or confirmation status</li>
        <li>Date and time of transaction</li>
      </ul>
      <p style="margin:8px 0 0;font-size:12px;color:#7f1d1d;font-weight:700">❌ Payment orders without valid screenshots cannot be approved.</p>
    </div>` : ''}

    <p style="margin:16px 0 0;font-size:13px;color:#555">We'll keep you updated as your order progresses.</p>
  `);
}

/** Payment verified — sent to customer */
function paymentVerifiedHtml(customerName: string, orderRef: string): string {
  return wrapLayout(`
    <h2 style="margin:0 0 16px;color:#16a34a;font-size:20px">Payment Verified ✓</h2>
    <p style="margin:0 0 12px;font-size:14px;color:#333">Hi <strong>${customerName}</strong>,</p>
    <p style="margin:0 0 12px;font-size:14px;color:#555">Great news! Your payment for order <strong style="color:${BRAND_COLOR}">${orderRef}</strong> has been verified.</p>
    <p style="margin:0 0 12px;font-size:14px;color:#555">We are now processing your order and will contact you soon with delivery details.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/orders" style="display:inline-block;padding:12px 28px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">Track Your Order</a>
    </div>
  `);
}

/** Payment rejected — sent to customer */
function paymentRejectedHtml(customerName: string, orderRef: string, reason?: string): string {
  return wrapLayout(`
    <h2 style="margin:0 0 16px;color:#dc2626;font-size:20px">Payment Could Not Be Verified</h2>
    <p style="margin:0 0 12px;font-size:14px;color:#333">Hi <strong>${customerName}</strong>,</p>
    <p style="margin:0 0 12px;font-size:14px;color:#555">Unfortunately we could not verify your payment for order <strong style="color:${BRAND_COLOR}">${orderRef}</strong>.</p>
    ${reason ? `<div style="background:#fef2f2;padding:12px 16px;border-radius:8px;border-left:4px solid #dc2626;margin:12px 0"><p style="margin:0;font-size:13px;color:#7f1d1d"><strong>Reason:</strong> ${reason}</p></div>` : ''}
    <p style="margin:12px 0;font-size:14px;color:#555">Please contact us so we can resolve this quickly.</p>
  `);
}

/** Order status update — sent to customer */
function orderStatusHtml(customerName: string, orderRef: string, status: string): string {
  const statusConfig: Record<string, { emoji: string; color: string; heading: string; body: string }> = {
    confirmed: { emoji: '✅', color: '#16a34a', heading: 'Order Confirmed', body: 'Your order has been confirmed and is being prepared.' },
    in_transit: { emoji: '🚚', color: '#2563eb', heading: 'Order In Transit', body: 'Your order is on its way! Keep an eye out for your delivery.' },
    delivered: { emoji: '📬', color: '#7c3aed', heading: 'Order Delivered', body: 'Your order has been delivered. We hope you enjoy your purchase!' },
    completed: { emoji: '🎉', color: '#16a34a', heading: 'Order Complete', body: 'Your order is now marked complete. Thank you for shopping with us!' },
  };

  const cfg = statusConfig[status] ?? { emoji: '📦', color: BRAND_COLOR, heading: `Status: ${status}`, body: `Your order status has been updated to ${status}.` };

  return wrapLayout(`
    <h2 style="margin:0 0 16px;color:${cfg.color};font-size:20px">${cfg.emoji} ${cfg.heading}</h2>
    <p style="margin:0 0 12px;font-size:14px;color:#333">Hi <strong>${customerName}</strong>,</p>
    <p style="margin:0 0 12px;font-size:14px;color:#555">${cfg.body}</p>
    <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;margin:16px 0">
      <p style="margin:0 0 4px;font-size:13px;color:#888">Order Reference</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:${BRAND_COLOR}">${orderRef}</p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/orders" style="display:inline-block;padding:12px 28px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">Track Your Order</a>
    </div>
  `);
}

/** Admin message notification — sent to customer */
function orderMessageHtml(customerName: string, orderRef: string, message: string): string {
  return wrapLayout(`
    <h2 style="margin:0 0 16px;color:${BRAND_COLOR};font-size:20px">💬 New Message About Your Order</h2>
    <p style="margin:0 0 12px;font-size:14px;color:#333">Hi <strong>${customerName}</strong>,</p>
    <p style="margin:0 0 12px;font-size:14px;color:#555">You have a new message regarding order <strong>${orderRef}</strong>:</p>
    <div style="background:#f3f4f6;padding:16px;border-radius:8px;border-left:4px solid ${BRAND_COLOR};margin:16px 0">
      <p style="margin:0;font-size:14px;color:#333;line-height:1.5">${message}</p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/orders" style="display:inline-block;padding:12px 28px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">View Your Order</a>
    </div>
  `);
}

// ─── Send helpers ───────────────────────────────────────────────

async function safeSend(mailOptions: nodemailer.SendMailOptions) {
  if (!isEmailConfigured()) {
    console.warn('[email] Skipped: SMTP not configured');
    return;
  }
  try {
    const transporter = getTransporter();
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('[email] Send failed:', err);
  }
}

const fromAddress = () => `"${STORE_NAME}" <${process.env.SMTP_USER}>`;

// ─── Public API ─────────────────────────────────────────────────

/** Send order confirmation emails to both customer and store owner */
export async function sendOrderEmails(data: OrderEmailData) {
  const html = orderConfirmationHtml(data);
  const storeEmail = process.env.STORE_EMAIL ?? 'josephsakyi247@gmail.com';

  await Promise.allSettled([
    safeSend({
      from: fromAddress(),
      to: data.customerEmail,
      subject: `Your ${STORE_NAME} order ${data.orderRef} is confirmed!`,
      html,
    }),
    safeSend({
      from: `"${STORE_NAME} Orders" <${process.env.SMTP_USER}>`,
      to: storeEmail,
      subject: `New Order ${data.orderRef} — ${data.customerName}`,
      html,
    }),
  ]);
}

/** Send payment verified email to customer */
export async function sendPaymentVerifiedEmail(customerEmail: string, customerName: string, orderRef: string) {
  await safeSend({
    from: fromAddress(),
    to: customerEmail,
    subject: `Your ${STORE_NAME} payment has been verified ✓`,
    html: paymentVerifiedHtml(customerName, orderRef),
  });
}

/**
 * Send a broadcast email to a list of recipients.
 * Sends in BCC batches of 50 to avoid SMTP limits and timeouts.
 * Returns { sent: number, failed: number }.
 */
export async function sendBroadcastEmail(
  recipients: string[],
  subject: string,
  bodyHtml: string,
): Promise<{ sent: number; failed: number }> {
  if (!isEmailConfigured()) {
    console.warn('[email] Broadcast skipped: SMTP not configured');
    return { sent: 0, failed: 0 };
  }

  const html = wrapLayout(`
    <div style="font-size:14px;color:#333;line-height:1.6">
      ${bodyHtml}
    </div>
    <div style="text-align:center;margin:28px 0 12px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/products"
         style="display:inline-block;padding:12px 32px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
        Shop Now
      </a>
    </div>
    <p style="margin:16px 0 0;font-size:11px;color:#aaa;text-align:center">
      You are receiving this because you have an account on ${STORE_NAME}.
    </p>
  `);

  const BATCH_SIZE = 50;
  let sent = 0;
  let failed = 0;
  const transporter = getTransporter();

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    try {
      await transporter.sendMail({
        from: fromAddress(),
        to: process.env.SMTP_USER, // "To" is the store itself
        bcc: batch,                // Recipients in BCC for privacy
        subject,
        html,
      });
      sent += batch.length;
    } catch (err) {
      console.error(`[email] Broadcast batch ${i}-${i + batch.length} failed:`, err);
      failed += batch.length;
    }
  }

  return { sent, failed };
}

/** Send payment rejected email to customer */
export async function sendPaymentRejectedEmail(customerEmail: string, customerName: string, orderRef: string, reason?: string) {
  await safeSend({
    from: fromAddress(),
    to: customerEmail,
    subject: `Update on your ${STORE_NAME} order ${orderRef}`,
    html: paymentRejectedHtml(customerName, orderRef, reason),
  });
}

/** Send order status update email to customer */
export async function sendOrderStatusEmail(customerEmail: string, customerName: string, orderRef: string, status: string) {
  const statusSubjects: Record<string, string> = {
    in_transit: `Your ${STORE_NAME} order ${orderRef} is on the way! 🚚`,
    delivered: `Your ${STORE_NAME} order ${orderRef} has been delivered 📬`,
    completed: `Your ${STORE_NAME} order ${orderRef} is complete! 🎉`,
  };
  await safeSend({
    from: fromAddress(),
    to: customerEmail,
    subject: statusSubjects[status] ?? `Order ${orderRef} status update`,
    html: orderStatusHtml(customerName, orderRef, status),
  });
}

/** Send admin message notification to customer */
export async function sendOrderMessageEmail(customerEmail: string, customerName: string, orderRef: string, message: string) {
  await safeSend({
    from: fromAddress(),
    to: customerEmail,
    subject: `New message about your ${STORE_NAME} order ${orderRef}`,
    html: orderMessageHtml(customerName, orderRef, message),
  });
}
