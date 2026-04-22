import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getSiteContent } from "@/lib/site-content";
import { supabaseAdmin } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { notifyAdmins, notifyUser } from "@/lib/db-notifications";
import { sendOrderEmails } from "@/lib/email";
import { redeemReward, getRewardStatus } from "@/lib/referral";

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
  paymentMethod?: "manual";
  paymentProof?: string;
  applyReward?: boolean;
  applyDealsReward?: boolean;
};

type OrderLine = { name: string; qty: number; unitPrice: number; lineTotal: number };

export async function POST(request: Request) {
  const { products, features, deliverySettings, paymentSettings } = await getSiteContent();
  const clerkUser = await currentUser().catch(() => null);
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

  const paymentMethod = "manual" as const;
  if (!(paymentSettings?.manualEnabled ?? true)) {
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
  let total = subtotal + delivery + processingFee;
  const orderRef = `GH-${Date.now()}`;

  // ── Apply referral reward if requested ──
  let rewardDiscount = 0;
  let rewardFreeShipping = false;
  let rewardTierName = "";
  let effectiveDelivery = delivery;

  if (body.applyReward && clerkUser?.id) {
    const rewardStatus = await getRewardStatus(clerkUser.id);
    if (rewardStatus.activeReward) {
      rewardDiscount = subtotal * rewardStatus.activeReward.discount_percent / 100;
      rewardFreeShipping = rewardStatus.activeReward.free_shipping;
      rewardTierName = rewardStatus.activeReward.tier_name;
      if (rewardFreeShipping) {
        effectiveDelivery = 0;
      }
      total = subtotal - rewardDiscount + effectiveDelivery + processingFee;
      // Redeem the reward (marks as used, advances cycle if complete)
      await redeemReward(clerkUser.id, orderRef);
    }
  }

  // ── Apply deals reward if requested ──
  let dealsDiscount = 0;
  let dealsRewardLabel = "";

  if (body.applyDealsReward && clerkUser?.id) {
    const { data: prize } = await supabaseAdmin
      .from("game_prizes")
      .select("id, prize_value, prize_label")
      .eq("user_id", clerkUser.id)
      .eq("prize_type", "discount_fixed")
      .eq("redeemed", false)
      .order("won_at", { ascending: false })
      .limit(1)
      .single();

    if (prize) {
      dealsDiscount = prize.prize_value;
      dealsRewardLabel = prize.prize_label;
      total = Math.max(0, total - dealsDiscount);
      // Mark as redeemed
      await supabaseAdmin
        .from("game_prizes")
        .update({ redeemed: true, redeemed_at: new Date().toISOString() })
        .eq("id", prize.id);
    }
  }

  const paymentStatus = "⏳ Awaiting admin verification";

  // Save order to Supabase first — emails are only sent after a successful insert
  const { error: dbError } = await supabaseAdmin.from("orders").insert({
    order_ref: orderRef,
    customer_name: body.customerName,
    customer_email: body.email ?? "",
    customer_phone: body.phone,
    customer_address: body.address,
    customer_note: body.note ?? "",
    delivery_type: body.deliveryType ?? null,
    clerk_user_id: clerkUser?.id ?? null,
    items: lines,
    subtotal,
    delivery: effectiveDelivery,
    processing_fee: processingFee,
    total,
    payment_method: paymentMethod,
    payment_proof: body.paymentProof ?? null,
    payment_status: "pending",
    order_status: "payment_pending_admin_review",
    reward_discount: rewardDiscount > 0 ? rewardDiscount : null,
    reward_tier: rewardTierName || null,
    deals_discount: dealsDiscount > 0 ? dealsDiscount : null,
    deals_reward_label: dealsRewardLabel || null,
  });

  if (dbError) {
    console.error("[checkout] Supabase insert failed:", dbError.message);
    return NextResponse.json({ error: "Could not save your order. Please try again." }, { status: 500 });
  }

  // Send confirmation emails — now that the order is confirmed in the DB
  await sendOrderEmails({
    orderRef,
    customerName: body.customerName,
    customerEmail: body.email ?? "",
    phone: body.phone,
    address: body.address,
    note: body.note ?? "",
    lines,
    subtotal,
    delivery: effectiveDelivery,
    processingFee,
    total,
    paymentMethod,
    paymentStatus,
  });

  // Track order in analytics
  void supabase.from("analytics_events").insert({
    event_type: "order",
    user_id: clerkUser?.id ?? null,
    page: "/checkout",
    metadata: { order_ref: orderRef, total, payment_method: paymentMethod },
  }).then(({ error }) => {
    if (error) console.error("[checkout] analytics insert failed:", error.message);
  });

  // Persistent notifications (awaited so serverless doesn't kill them)
  try {
    await notifyAdmins(
      'order',
      '📦 New Order Received',
      `${body.customerName} placed order ${orderRef} (GHS ${total.toFixed(2)}) — Awaiting payment verification`,
      { order_ref: orderRef, link: '/admin' },
    );
  } catch (e) { console.error('[checkout] notifyAdmins failed:', e); }

  // Notify the customer if they're signed in
  if (clerkUser?.id) {
    try {
      await notifyUser(
        clerkUser.id,
        'order',
        '🎉 Order Confirmed!',
        `Your order ${orderRef} has been received. We'll notify you when it's on its way!`,
        { order_ref: orderRef, link: '/orders' },
      );
    } catch (e) { console.error('[checkout] notifyUser failed:', e); }
  }

  // Fire-and-forget — add/update the customer in Brevo subscriber list
  if (body.email) {
    void brevoUpsertContact(body.email, body.customerName, body.phone);
  }

  return NextResponse.json(
    {
      success: true,
      orderRef,
      paymentMethod: "Manual Transfer",
      customer: { name: body.customerName, phone: body.phone, address: body.address, note: body.note ?? "", deliveryType: body.deliveryType },
      lines,
      totals: { subtotal, delivery: effectiveDelivery, processingFee, total, rewardDiscount },
      reward: rewardDiscount > 0 ? { tierName: rewardTierName, discount: rewardDiscount, freeShipping: rewardFreeShipping } : null,
      storePhone: process.env.STORE_PHONE ?? "+233 548656980",
      storeEmail: process.env.STORE_EMAIL ?? "josephsakyi247@gmail.com",
      message: "Order submitted! We will verify your payment and call you to confirm delivery.",
    },
    { status: 201 }
  );
}
