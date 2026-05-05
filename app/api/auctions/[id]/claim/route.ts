import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyAdmins } from "@/lib/db-notifications";
import { sendAuctionOrderEmails } from "@/lib/email";

type ClaimBody = {
  orderRef?: string;
  paymentProofUrl?: string | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  amount?: number;
  title?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auctionId = Number(id);
  if (!auctionId || isNaN(auctionId)) {
    return NextResponse.json({ error: "Invalid auction ID." }, { status: 400 });
  }

  const { userId } = await auth();

  let body: ClaimBody;
  try {
    body = (await req.json()) as ClaimBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { orderRef, paymentProofUrl, customerName, customerEmail, customerPhone, customerAddress, amount, title } = body;

  if (!orderRef || !customerName || !customerEmail || !customerPhone || !customerAddress || !amount || !title) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  // Verify auction exists and get details
  const { data: auction } = await supabaseAdmin
    .from("auctions")
    .select("id, title, current_bid, status, winner_name")
    .eq("id", auctionId)
    .single();

  if (!auction) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  // Save the auction order to Supabase
  const { error: insertErr } = await supabaseAdmin
    .from("auction_orders")
    .insert({
      auction_id: auctionId,
      order_ref: orderRef,
      payment_proof_url: paymentProofUrl ?? null,
      user_id: userId ?? null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      amount,
      title,
      status: "pending",
    });

  if (insertErr) {
    console.error("auction_orders insert error:", insertErr);
    // Don't fail — still record the win notification
  }

  // Update auction winner_name if not already set
  if (!auction.winner_name) {
    await supabaseAdmin
      .from("auctions")
      .update({ winner_name: customerName })
      .eq("id", auctionId);
  }

  // Notify admins
  try {
    await notifyAdmins(
      "payment",
      "Auction Win Payment Received",
      `${customerName} submitted manual payment of GHS ${Number(amount).toFixed(2)} for "${title}" (Ref: ${orderRef}) — pending verification`,
      { auctionId, orderRef, paymentProofUrl, customerEmail, customerPhone }
    );
  } catch { /* non-fatal */ }

  // Send confirmation email to customer and admin notification
  try {
    await sendAuctionOrderEmails({
      orderRef,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      auctionTitle: title,
      amount: Number(amount),
      paymentProofUrl: paymentProofUrl ?? null,
    });
  } catch (e) { console.error("[auction-claim] sendAuctionOrderEmails failed:", e); }

  return NextResponse.json({ success: true, orderRef });
}
