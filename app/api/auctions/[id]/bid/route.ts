import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  sanitizeLine,
  isValidName,
  isValidEmail,
} from "@/lib/validation";

type BidPayload = {
  bidderName?: string;
  bidderEmail?: string;
  amount?: number;
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

  // Parse and validate body
  let body: BidPayload;
  try {
    body = (await req.json()) as BidPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const bidderName = sanitizeLine(body.bidderName ?? "");
  const bidderEmail = sanitizeLine(body.bidderEmail ?? "");
  const amount = Number(body.amount);

  if (!isValidName(bidderName)) {
    return NextResponse.json(
      { error: "Name can only contain letters, spaces, hyphens, or apostrophes (2–80 chars)." },
      { status: 422 }
    );
  }
  if (!isValidEmail(bidderEmail)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 422 }
    );
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Bid amount must be a positive number." }, { status: 422 });
  }

  // Fetch auction inside a serialisable transaction pattern using Supabase RPC or
  // plain select → validate → update (optimistic concurrency via status check).
  const { data: auction, error: fetchErr } = await supabaseAdmin
    .from("auctions")
    .select("id,status,ends_at,starting_price,current_bid,min_increment")
    .eq("id", auctionId)
    .single();

  if (fetchErr || !auction) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }
  if (auction.status !== "active") {
    return NextResponse.json({ error: "This auction has ended." }, { status: 409 });
  }
  if (new Date(auction.ends_at) <= new Date()) {
    // Mark as ended opportunistically
    await supabaseAdmin.from("auctions").update({ status: "ended" }).eq("id", auctionId);
    return NextResponse.json({ error: "This auction has already ended." }, { status: 409 });
  }

  const minBid =
    Number(auction.current_bid) > 0
      ? Number(auction.current_bid) + Number(auction.min_increment)
      : Number(auction.starting_price);

  if (amount < minBid) {
    return NextResponse.json(
      { error: `Minimum bid is GHS ${minBid.toFixed(2)}.` },
      { status: 422 }
    );
  }

  // Insert bid
  const { error: bidErr } = await supabaseAdmin.from("auction_bids").insert({
    auction_id: auctionId,
    bidder_name: bidderName,
    bidder_email: bidderEmail,
    amount,
  });

  if (bidErr) {
    return NextResponse.json({ error: "Could not record bid. Try again." }, { status: 500 });
  }

  // Update auction current_bid and bid_count
  const { error: updateErr } = await supabaseAdmin
    .from("auctions")
    .update({
      current_bid: amount,
      bid_count: Number(auction.bid_count ?? 0) + 1,
    })
    .eq("id", auctionId)
    .eq("status", "active"); // guard against race

  if (updateErr) {
    return NextResponse.json({ error: "Bid recorded but could not update auction." }, { status: 500 });
  }

  return NextResponse.json({ success: true, newBid: amount });
}
