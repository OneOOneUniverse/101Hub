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
type OrderLine = {
  productId?: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  size?: string;
  color?: string;
  variantId?: string;
  isVendorProduct?: boolean;
};

function orderTable(lines: OrderLine[]) {
  const rows = lines
    .map(
      (l) => {
        const details = [l.size && `Size: ${l.size}`, l.color && `Color: ${l.color}`].filter(Boolean).join(' · ');
        return `<tr>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0">
            ${l.name}${l.isVendorProduct ? ' <span style="font-size:10px;color:#7c3aed;font-weight:700">[Vendor]</span>' : ''}
            ${details ? `<br/><span style="font-size:11px;color:#888">${details}</span>` : ''}
          </td>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center">${l.qty}</td>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">GHS ${l.unitPrice.toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">GHS ${l.lineTotal.toFixed(2)}</td>
        </tr>`;
      }
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
  // Extended admin-only fields
  deliveryTypeName?: string;
  locationName?: string;
  gpsCoords?: { lat: number; lng: number };
  rewardDiscount?: number;
  rewardTierName?: string;
  dealsDiscount?: number;
  dealsRewardLabel?: string;
  hasPaymentProof?: boolean;
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

/** Detailed order summary — sent to admin/supervisors only */
function adminOrderHtml(data: OrderEmailData): string {
  const paymentMethodLabel = data.paymentMethod === 'paystack' ? 'Paystack (Online)' : 'Manual Transfer';
  const mapsUrl = data.gpsCoords
    ? `https://maps.google.com/?q=${data.gpsCoords.lat},${data.gpsCoords.lng}`
    : null;

  const infoRow = (label: string, value: string) =>
    `<tr>
      <td style="padding:7px 10px;font-size:13px;color:#888;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:7px 10px;font-size:13px;color:#222;font-weight:600">${value}</td>
    </tr>`;

  const discountRows = [
    data.rewardDiscount && data.rewardDiscount > 0
      ? `<tr><td style="padding:4px 8px;font-size:14px;color:#16a34a">Referral discount (${data.rewardTierName ?? ''})</td><td style="padding:4px 8px;text-align:right;font-size:14px;color:#16a34a">− GHS ${data.rewardDiscount.toFixed(2)}</td></tr>`
      : '',
    data.dealsDiscount && data.dealsDiscount > 0
      ? `<tr><td style="padding:4px 8px;font-size:14px;color:#16a34a">Deals reward (${data.dealsRewardLabel ?? ''})</td><td style="padding:4px 8px;text-align:right;font-size:14px;color:#16a34a">− GHS ${data.dealsDiscount.toFixed(2)}</td></tr>`
      : '',
  ].join('');

  const totalsHtml = `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:300px;margin-left:auto">
    <tr><td style="padding:4px 8px;font-size:14px;color:#555">Subtotal</td><td style="padding:4px 8px;text-align:right;font-size:14px">GHS ${data.subtotal.toFixed(2)}</td></tr>
    <tr><td style="padding:4px 8px;font-size:14px;color:#555">Delivery</td><td style="padding:4px 8px;text-align:right;font-size:14px">${data.delivery === 0 ? 'Free' : `GHS ${data.delivery.toFixed(2)}`}</td></tr>
    ${data.processingFee > 0 ? `<tr><td style="padding:4px 8px;font-size:14px;color:#555">Processing fee</td><td style="padding:4px 8px;text-align:right;font-size:14px">GHS ${data.processingFee.toFixed(2)}</td></tr>` : ''}
    ${discountRows}
    <tr style="font-weight:700;font-size:16px"><td style="padding:10px 8px;border-top:2px solid ${BRAND_COLOR}">Total</td><td style="padding:10px 8px;text-align:right;border-top:2px solid ${BRAND_COLOR}">GHS ${data.total.toFixed(2)}</td></tr>
  </table>`;

  return wrapLayout(`
    <!-- Alert banner -->
    <div style="background:#fff7ed;border:2px solid ${BRAND_COLOR};border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
      <span style="font-size:22px">📦</span>
      <div>
        <p style="margin:0;font-size:16px;font-weight:700;color:#c2410c">New Order Received — Action Required</p>
        <p style="margin:2px 0 0;font-size:13px;color:#9a3412">Review &amp; verify payment proof in the Admin Panel</p>
      </div>
    </div>

    <!-- Order ref -->
    <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;margin-bottom:20px;text-align:center">
      <p style="margin:0 0 2px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.05em">Order Reference</p>
      <p style="margin:0;font-size:22px;font-weight:800;color:${BRAND_COLOR}">${data.orderRef}</p>
    </div>

    <!-- Customer details -->
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:.05em">👤 Customer</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border-radius:8px;margin-bottom:20px;overflow:hidden">
      ${infoRow('Name', data.customerName)}
      ${infoRow('Email', `<a href="mailto:${data.customerEmail}" style="color:${BRAND_COLOR}">${data.customerEmail}</a>`)}
      ${infoRow('Phone', `<a href="tel:${data.phone}" style="color:${BRAND_COLOR}">${data.phone}</a>`)}
    </table>

    <!-- Delivery details -->
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:.05em">🚚 Delivery</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border-radius:8px;margin-bottom:20px;overflow:hidden">
      ${infoRow('Address', data.address)}
      ${data.deliveryTypeName ? infoRow('Method', data.deliveryTypeName) : ''}
      ${data.locationName ? infoRow('Zone', data.locationName) : ''}
      ${mapsUrl ? infoRow('GPS Location',
        `${data.gpsCoords!.lat.toFixed(6)}, ${data.gpsCoords!.lng.toFixed(6)}<br/>
         <a href="${mapsUrl}" style="color:${BRAND_COLOR};font-weight:600;font-size:12px">📍 Open in Google Maps →</a>`
      ) : infoRow('GPS Location', '<span style="color:#aaa">Not provided</span>')}
      ${data.note ? infoRow('Note', `<em>${data.note}</em>`) : ''}
    </table>

    <!-- Order items -->
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:.05em">🛒 Items Ordered</p>
    ${orderTable(data.lines)}
    ${totalsHtml}

    <!-- Payment -->
    <div style="background:#fef3c7;border:1px solid #fcd34d;padding:14px 16px;border-radius:8px;margin:20px 0">
      <p style="margin:0 0 8px;font-weight:700;color:#78350f;font-size:14px">💳 Payment</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        ${infoRow('Method', paymentMethodLabel)}
        ${infoRow('Status', data.paymentStatus)}
        ${infoRow('Proof uploaded', data.hasPaymentProof ? '✅ Yes' : '❌ No — follow up with customer')}
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:24px 0 8px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.101hub.shop'}/admin"
         style="display:inline-block;padding:13px 32px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px">
        Open Admin Panel →
      </a>
    </div>
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
  // Skip if recipient is missing
  const to = mailOptions.to;
  if (!to || (typeof to === 'string' && !to.trim())) {
    console.warn('[email] Skipped: no recipient address');
    return;
  }
  try {
    const transporter = getTransporter();
    await transporter.sendMail(mailOptions);
    console.log('[email] Sent to:', to);
  } catch (err) {
    console.error('[email] Send failed:', err);
  }
}

const fromAddress = () => `"${STORE_NAME}" <${process.env.SMTP_USER}>`;

// ─── Public API ─────────────────────────────────────────────────

/** Send order confirmation emails to both customer and store owner */
export async function sendOrderEmails(data: OrderEmailData) {
  const customerHtml = orderConfirmationHtml(data);
  const adminHtml = adminOrderHtml(data);

  // Primary store email
  const primaryEmail = process.env.STORE_EMAIL ?? 'josephsakyi247@gmail.com';

  // Extra recipients from .env.local — ADMIN_NOTIFICATION_EMAILS=email1@x.com,email2@x.com
  const extraEmails = (process.env.ADMIN_NOTIFICATION_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  // Combine without duplicates
  const adminRecipients = [...new Set([primaryEmail, ...extraEmails])];

  // Send customer confirmation first, then admin emails
  // Sequential to avoid Gmail rate-limiting parallel sends
  await safeSend({
    from: fromAddress(),
    to: data.customerEmail,
    subject: `Your ${STORE_NAME} order ${data.orderRef} is confirmed!`,
    html: customerHtml,
  });

  for (const recipient of adminRecipients) {
    await safeSend({
      from: `"${STORE_NAME} Orders" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: `📦 New Order ${data.orderRef} — ${data.customerName} (GHS ${data.total.toFixed(2)})`,
      html: adminHtml,
    });
  }
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

// ─── Auction order emails ────────────────────────────────────────

export interface AuctionOrderEmailData {
  orderRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  auctionTitle: string;
  amount: number;
  paymentProofUrl?: string | null;
}

function auctionCustomerHtml(data: AuctionOrderEmailData): string {
  return wrapLayout(`
    <h2 style="margin:0 0 16px;color:#111;font-size:20px">Auction Order Received! 🏆</h2>
    <p style="margin:0 0 6px;font-size:14px;color:#333">Hi <strong>${data.customerName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;color:#555">Congratulations on winning the auction! Your order has been received and is awaiting payment verification.</p>

    <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;margin-bottom:16px">
      <p style="margin:0 0 4px;font-size:13px;color:#888">Order Reference</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:${BRAND_COLOR}">${data.orderRef}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border-radius:8px;margin-bottom:20px;overflow:hidden">
      <tr><td style="padding:7px 10px;font-size:13px;color:#888;white-space:nowrap">Item</td><td style="padding:7px 10px;font-size:13px;color:#222;font-weight:600">${data.auctionTitle}</td></tr>
      <tr><td style="padding:7px 10px;font-size:13px;color:#888;white-space:nowrap">Amount</td><td style="padding:7px 10px;font-size:13px;color:${BRAND_COLOR};font-weight:700">GHS ${data.amount.toFixed(2)}</td></tr>
      <tr><td style="padding:7px 10px;font-size:13px;color:#888;white-space:nowrap">Delivery</td><td style="padding:7px 10px;font-size:13px;color:#222;font-weight:600">${data.customerAddress}</td></tr>
      <tr><td style="padding:7px 10px;font-size:13px;color:#888;white-space:nowrap">Phone</td><td style="padding:7px 10px;font-size:13px;color:#222;font-weight:600">${data.customerPhone}</td></tr>
    </table>

    <div style="background:#fef3c7;border:1px solid #fcd34d;padding:14px;border-radius:8px;margin:20px 0">
      <p style="margin:0 0 6px;font-weight:700;color:#78350f;font-size:14px">💳 Payment Status</p>
      <p style="margin:0;font-size:13px;color:#92400e">${data.paymentProofUrl ? '✅ Payment screenshot received — pending admin verification.' : '⏳ Awaiting payment proof. Please upload your payment screenshot.'}</p>
    </div>

    <p style="margin:16px 0 0;font-size:13px;color:#555">We'll notify you once your payment is verified and your order is on its way.</p>
  `);
}

function auctionAdminHtml(data: AuctionOrderEmailData): string {
  return wrapLayout(`
    <div style="background:#fff7ed;border:2px solid ${BRAND_COLOR};border-radius:10px;padding:14px 18px;margin-bottom:20px">
      <p style="margin:0;font-size:16px;font-weight:700;color:#c2410c">🏆 New Auction Order — Payment Verification Required</p>
      <p style="margin:2px 0 0;font-size:13px;color:#9a3412">A winning bidder has submitted their order. Review payment proof below.</p>
    </div>

    <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;margin-bottom:20px;text-align:center">
      <p style="margin:0 0 2px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.05em">Order Reference</p>
      <p style="margin:0;font-size:22px;font-weight:800;color:${BRAND_COLOR}">${data.orderRef}</p>
    </div>

    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:.05em">👤 Customer</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border-radius:8px;margin-bottom:20px;overflow:hidden">
      <tr><td style="padding:7px 10px;font-size:13px;color:#888;white-space:nowrap">Name</td><td style="padding:7px 10px;font-size:13px;color:#222;font-weight:600">${data.customerName}</td></tr>
      <tr><td style="padding:7px 10px;font-size:13px;color:#888;white-space:nowrap">Email</td><td style="padding:7px 10px;font-size:13px;color:#222;font-weight:600"><a href="mailto:${data.customerEmail}" style="color:${BRAND_COLOR}">${data.customerEmail}</a></td></tr>
      <tr><td style="padding:7px 10px;font-size:13px;color:#888;white-space:nowrap">Phone</td><td style="padding:7px 10px;font-size:13px;color:#222;font-weight:600"><a href="tel:${data.customerPhone}" style="color:${BRAND_COLOR}">${data.customerPhone}</a></td></tr>
      <tr><td style="padding:7px 10px;font-size:13px;color:#888;white-space:nowrap">Address</td><td style="padding:7px 10px;font-size:13px;color:#222;font-weight:600">${data.customerAddress}</td></tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:.05em">🏷️ Auction Item</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border-radius:8px;margin-bottom:20px;overflow:hidden">
      <tr><td style="padding:7px 10px;font-size:13px;color:#888;white-space:nowrap">Item</td><td style="padding:7px 10px;font-size:13px;color:#222;font-weight:600">${data.auctionTitle}</td></tr>
      <tr><td style="padding:7px 10px;font-size:13px;color:#888;white-space:nowrap">Winning Bid</td><td style="padding:7px 10px;font-size:16px;font-weight:800;color:${BRAND_COLOR}">GHS ${data.amount.toFixed(2)}</td></tr>
    </table>

    <div style="background:#fef3c7;border:1px solid #fcd34d;padding:14px 16px;border-radius:8px;margin:20px 0">
      <p style="margin:0 0 8px;font-weight:700;color:#78350f;font-size:14px">💳 Payment Proof</p>
      ${data.paymentProofUrl
        ? `<p style="margin:0 0 8px;font-size:13px;color:#92400e">✅ Screenshot uploaded by customer.</p>
           <a href="${data.paymentProofUrl}" target="_blank" rel="noopener noreferrer"
              style="display:inline-block;padding:10px 20px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px">
             View Payment Screenshot →
           </a>`
        : `<p style="margin:0;font-size:13px;color:#b45309;font-weight:600">❌ No screenshot uploaded — follow up with the customer.</p>`
      }
    </div>

    <div style="text-align:center;margin:24px 0 8px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.101hub.shop'}/admin"
         style="display:inline-block;padding:13px 32px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px">
        Open Admin Panel →
      </a>
    </div>
  `);
}

/** Send auction order confirmation to customer + admin notification with payment proof */
export async function sendAuctionOrderEmails(data: AuctionOrderEmailData) {
  const primaryEmail = process.env.STORE_EMAIL ?? 'josephsakyi247@gmail.com';
  const extraEmails = (process.env.ADMIN_NOTIFICATION_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  const adminRecipients = [...new Set([primaryEmail, ...extraEmails])];

  await safeSend({
    from: fromAddress(),
    to: data.customerEmail,
    subject: `Your ${STORE_NAME} auction order ${data.orderRef} is confirmed!`,
    html: auctionCustomerHtml(data),
  });

  for (const recipient of adminRecipients) {
    await safeSend({
      from: `"${STORE_NAME} Auctions" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: `🏆 Auction Order ${data.orderRef} — ${data.customerName} (GHS ${data.amount.toFixed(2)}) — ${data.paymentProofUrl ? 'Proof Uploaded' : 'NO PROOF'}`,
      html: auctionAdminHtml(data),
    });
  }
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
  opts?: {
    category?: 'new-product' | 'offer' | 'flash-sale' | 'event' | 'announcement' | 'general';
    ctaUrl?: string;
    ctaLabel?: string;
  },
): Promise<{ sent: number; failed: number }> {
  if (!isEmailConfigured()) {
    console.warn('[email] Broadcast skipped: SMTP not configured');
    return { sent: 0, failed: 0 };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  // Category-specific banner config
  const categoryConfig: Record<string, { icon: string; bannerBg: string; bannerBorder: string; bannerText: string; label: string }> = {
    'new-product':   { icon: '🆕', bannerBg: '#eff6ff', bannerBorder: '#3b82f6', bannerText: '#1d4ed8', label: 'New Products' },
    'offer':         { icon: '🏷️', bannerBg: '#fefce8', bannerBorder: '#eab308', bannerText: '#854d0e', label: 'Special Offer' },
    'flash-sale':    { icon: '⚡', bannerBg: '#fff7ed', bannerBorder: BRAND_COLOR, bannerText: '#c2410c', label: 'Flash Sale' },
    'event':         { icon: '🎉', bannerBg: '#fdf4ff', bannerBorder: '#a855f7', bannerText: '#7e22ce', label: 'Upcoming Event' },
    'announcement':  { icon: '📢', bannerBg: '#f0fdf4', bannerBorder: '#22c55e', bannerText: '#15803d', label: 'Announcement' },
    'general':       { icon: '📬', bannerBg: '#f9fafb', bannerBorder: '#9ca3af', bannerText: '#374151', label: 'Update' },
  };
  const cat = categoryConfig[opts?.category ?? 'general'] ?? categoryConfig['general'];

  const ctaUrl   = opts?.ctaUrl   || `${appUrl}/products`;
  const ctaLabel = opts?.ctaLabel || 'Shop Now';

  const html = wrapLayout(`
    <!-- Category banner -->
    <div style="background:${cat.bannerBg};border:2px solid ${cat.bannerBorder};border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
      <span style="font-size:22px">${cat.icon}</span>
      <p style="margin:0;font-size:14px;font-weight:700;color:${cat.bannerText}">${cat.label} from ${STORE_NAME}</p>
    </div>

    <!-- Body -->
    <div style="font-size:14px;color:#333;line-height:1.7">
      ${bodyHtml}
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0 12px">
      <a href="${ctaUrl}"
         style="display:inline-block;padding:12px 32px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
        ${ctaLabel}
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

/**
 * Broadcast "auction is live" email to all provided recipients.
 * Call this from an API route after fetching all user emails from Clerk.
 */
export async function sendAuctionLiveEmail(opts: {
  auctionId: number;
  title: string;
  startingPrice: number;
  imageUrl?: string;
  endsAt: string;
  recipients: string[];
}): Promise<{ sent: number; failed: number }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.101hub.shop';

  let endsDate = '';
  try {
    endsDate = new Date(opts.endsAt).toLocaleString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { endsDate = opts.endsAt; }

  const bodyHtml = `
    ${opts.imageUrl ? `<div style="text-align:center;margin-bottom:20px"><img src="${opts.imageUrl}" alt="${opts.title}" style="max-width:100%;border-radius:10px;max-height:240px;object-fit:cover" /></div>` : ''}
    <h2 style="margin:0 0 12px;color:#111;font-size:22px">🔴 Live Auction Has Started!</h2>
    <p style="margin:0 0 10px;font-size:15px;color:#333">A new auction is <strong>live right now</strong> on ${STORE_NAME}. Don't miss your chance to bid!</p>

    <div style="background:#fff7ed;border:2px solid ${BRAND_COLOR};border-radius:10px;padding:16px 20px;margin:16px 0">
      <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#111">${opts.title}</p>
      <p style="margin:4px 0 0;font-size:24px;font-weight:900;color:${BRAND_COLOR}">Base Price: GHS ${opts.startingPrice.toFixed(2)}</p>
    </div>

    <p style="margin:0 0 6px;font-size:13px;color:#555">⏰ Auction ends: <strong>${endsDate}</strong></p>
    <p style="margin:0 0 16px;font-size:13px;color:#555">Be the highest bidder to win this item. Bids are open to all registered users — join now before it's too late!</p>
  `;

  return sendBroadcastEmail(
    opts.recipients,
    `🔴 LIVE: Bid on "${opts.title}" — Base price GHS ${opts.startingPrice.toFixed(2)}`,
    bodyHtml,
    {
      category: 'event',
      ctaUrl: `${appUrl}/auctions/${opts.auctionId}`,
      ctaLabel: 'Join the Auction →',
    },
  );
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

// ─── Support chat new-session alert ─────────────────────────────

/** Notify admin when a new support chat session is opened */
export async function sendNewChatAlertEmail(opts: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}) {
  const primaryEmail = process.env.STORE_EMAIL ?? 'josephsakyi247@gmail.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.101hub.shop';

  const html = wrapLayout(`
    <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:14px 18px;margin-bottom:20px">
      <p style="margin:0;font-size:16px;font-weight:700;color:#15803d">💬 New Support Chat Started</p>
      <p style="margin:4px 0 0;font-size:13px;color:#166534">A customer just opened a live support chat.</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border-radius:8px;margin-bottom:20px;overflow:hidden">
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap">Name</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#222">${opts.customerName}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap">Email</td><td style="padding:8px 12px;font-size:13px;font-weight:600"><a href="mailto:${opts.customerEmail}" style="color:${BRAND_COLOR}">${opts.customerEmail}</a></td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap">Phone</td><td style="padding:8px 12px;font-size:13px;font-weight:600"><a href="tel:${opts.customerPhone}" style="color:${BRAND_COLOR}">${opts.customerPhone}</a></td></tr>
    </table>

    <p style="font-size:13px;color:#555;margin:0 0 20px">Reply promptly — fast responses build customer trust.</p>

    <div style="text-align:center;margin:24px 0 8px">
      <a href="${appUrl}/admin?tab=support-chat"
         style="display:inline-block;padding:13px 32px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px">
        Open Support Chat →
      </a>
    </div>
  `);

  await safeSend({
    from: fromAddress(),
    to: primaryEmail,
    subject: `💬 New Support Chat — ${opts.customerName}`,
    html,
  });
}

// ─── Service request emails ──────────────────────────────────────

export interface ServiceRequestEmailData {
  ticketRef: string;
  packageName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  issue: string;
  preferredTime?: string;
  requestedDate?: string;
}

function serviceRequestCustomerHtml(d: ServiceRequestEmailData): string {
  return wrapLayout(`
    <h2 style="margin:0 0 16px;color:#111;font-size:20px">Service Request Received ✅</h2>
    <p style="margin:0 0 6px;font-size:14px;color:#333">Hi <strong>${d.customerName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;color:#555">We've received your service request and our team will be in touch within 24 hours.</p>

    <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;margin-bottom:16px">
      <p style="margin:0 0 2px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.05em">Ticket Reference</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND_COLOR}">${d.ticketRef}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border-radius:8px;margin-bottom:20px;overflow:hidden">
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap">Service</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#222">${d.packageName}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap">Date</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#222">${d.requestedDate ?? 'Not specified'}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap">Time</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#222">${d.preferredTime ?? 'Not specified'}</td></tr>
    </table>

    <div style="background:#f3f4f6;padding:14px;border-radius:8px;border-left:4px solid ${BRAND_COLOR};margin-bottom:16px">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase">Your Request</p>
      <p style="margin:0;font-size:13px;color:#333;line-height:1.6">${d.issue}</p>
    </div>

    <p style="font-size:13px;color:#555;margin:0">Keep this ticket number handy — you can use it to track the status of your request.</p>
  `);
}

function serviceRequestAdminHtml(d: ServiceRequestEmailData): string {
  return wrapLayout(`
    <div style="background:#fff7ed;border:2px solid ${BRAND_COLOR};border-radius:10px;padding:14px 18px;margin-bottom:20px">
      <p style="margin:0;font-size:16px;font-weight:700;color:#c2410c">🔧 New Service Request — Action Required</p>
      <p style="margin:4px 0 0;font-size:13px;color:#9a3412">Review the request and contact the customer within 24 hours.</p>
    </div>

    <div style="background:#f9fafb;padding:12px 16px;border-radius:8px;margin-bottom:20px;text-align:center">
      <p style="margin:0 0 2px;font-size:12px;color:#888;text-transform:uppercase">Ticket Reference</p>
      <p style="margin:0;font-size:22px;font-weight:800;color:${BRAND_COLOR}">${d.ticketRef}</p>
    </div>

    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:.05em">👤 Customer</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border-radius:8px;margin-bottom:20px;overflow:hidden">
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap">Name</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#222">${d.customerName}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap">Email</td><td style="padding:8px 12px;font-size:13px;font-weight:600"><a href="mailto:${d.customerEmail}" style="color:${BRAND_COLOR}">${d.customerEmail}</a></td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap">Phone</td><td style="padding:8px 12px;font-size:13px;font-weight:600"><a href="tel:${d.customerPhone}" style="color:${BRAND_COLOR}">${d.customerPhone}</a></td></tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:.05em">📦 Service Details</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border-radius:8px;margin-bottom:20px;overflow:hidden">
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap">Package</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#222">${d.packageName}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap">Date</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#222">${d.requestedDate ?? 'Not specified'}</td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;color:#888;white-space:nowrap">Time</td><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#222">${d.preferredTime ?? 'Not specified'}</td></tr>
    </table>

    <div style="background:#f3f4f6;padding:14px;border-radius:8px;border-left:4px solid ${BRAND_COLOR};margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase">Customer Notes</p>
      <p style="margin:0;font-size:13px;color:#333;line-height:1.6">${d.issue}</p>
    </div>

    <div style="text-align:center;margin:24px 0 8px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.101hub.shop'}/admin"
         style="display:inline-block;padding:13px 32px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px">
        Open Admin Panel →
      </a>
    </div>
  `);
}

/** Send service request confirmation to customer and notification to admin */
export async function sendServiceRequestEmails(data: ServiceRequestEmailData) {
  const primaryEmail = process.env.STORE_EMAIL ?? 'josephsakyi247@gmail.com';
  const extraEmails = (process.env.ADMIN_NOTIFICATION_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  const adminRecipients = [...new Set([primaryEmail, ...extraEmails])];

  // Customer confirmation
  await safeSend({
    from: fromAddress(),
    to: data.customerEmail,
    subject: `Your ${STORE_NAME} service request ${data.ticketRef} is received!`,
    html: serviceRequestCustomerHtml(data),
  });

  // Admin notifications
  for (const recipient of adminRecipients) {
    await safeSend({
      from: `"${STORE_NAME} Services" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: `🔧 New Service Request ${data.ticketRef} — ${data.customerName}`,
      html: serviceRequestAdminHtml(data),
    });
  }
}

/** Send vendor application approval / rejection email */
export async function sendVendorStatusEmail(opts: {
  applicantEmail: string;
  applicantName?: string;
  businessName?: string;
  status: "approved" | "rejected";
  adminNotes?: string;
}) {
  const { applicantEmail, applicantName, businessName, status, adminNotes } = opts;
  const name = applicantName || businessName || "Vendor";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.101hub.shop';

  if (status === "approved") {
    await safeSend({
      from: fromAddress(),
      to: applicantEmail,
      subject: `🎉 Your ${STORE_NAME} vendor application has been approved!`,
      html: wrapLayout(`
        <h2 style="margin:0 0 16px;color:#16a34a;font-size:20px">Application Approved! 🎉</h2>
        <p style="margin:0 0 12px;font-size:14px;color:#333">Hi <strong>${name}</strong>,</p>
        <p style="margin:0 0 12px;font-size:14px;color:#555">
          Congratulations! Your vendor application${businessName ? ` for <strong>${businessName}</strong>` : ''} has been <strong style="color:#16a34a">approved</strong>.
          You can now log in and start listing your products on ${STORE_NAME}.
        </p>
        ${adminNotes ? `<div style="background:#f0fdf4;border:1px solid #86efac;padding:12px 16px;border-radius:8px;margin:12px 0"><p style="margin:0;font-size:13px;color:#166534"><strong>Note from admin:</strong> ${adminNotes}</p></div>` : ''}
        <div style="text-align:center;margin:24px 0">
          <a href="${appUrl}/vendor/dashboard" style="display:inline-block;padding:13px 32px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px">
            Go to Vendor Dashboard →
          </a>
        </div>
      `),
    });
  } else {
    await safeSend({
      from: fromAddress(),
      to: applicantEmail,
      subject: `Update on your ${STORE_NAME} vendor application`,
      html: wrapLayout(`
        <h2 style="margin:0 0 16px;color:#dc2626;font-size:20px">Application Not Approved</h2>
        <p style="margin:0 0 12px;font-size:14px;color:#333">Hi <strong>${name}</strong>,</p>
        <p style="margin:0 0 12px;font-size:14px;color:#555">
          Thank you for applying to become a vendor on ${STORE_NAME}. Unfortunately, your application${businessName ? ` for <strong>${businessName}</strong>` : ''} was not approved at this time.
        </p>
        ${adminNotes ? `<div style="background:#fef2f2;border:1px solid #fca5a5;padding:12px 16px;border-radius:8px;margin:12px 0"><p style="margin:0;font-size:13px;color:#991b1b"><strong>Reason:</strong> ${adminNotes}</p></div>` : ''}
        <p style="margin:12px 0;font-size:14px;color:#555">If you believe this is an error or would like more information, please contact us.</p>
      `),
    });
  }
}
