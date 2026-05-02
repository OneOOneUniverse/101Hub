import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auctionId = Number(id);
  if (!auctionId || isNaN(auctionId)) {
    return NextResponse.json({ error: "Invalid auction ID" }, { status: 400 });
  }

  const [auctionRes, bidsRes] = await Promise.all([
    supabaseAdmin
      .from("auctions")
      .select("*")
      .eq("id", auctionId)
      .single(),
    supabaseAdmin
      .from("auction_bids")
      .select("id,bidder_name,amount,created_at")
      .eq("auction_id", auctionId)
      .order("amount", { ascending: false })
      .limit(50),
  ]);

  if (auctionRes.error || !auctionRes.data) {
    return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  }

  return NextResponse.json({ auction: auctionRes.data, bids: bidsRes.data ?? [] });
}
