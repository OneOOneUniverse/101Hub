"use client";

import { useCallback, useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { sanitizeLine, isValidName, isValidEmail } from "@/lib/validation";

type Bid = {
  id: number;
  bidder_name: string;
  amount: number;
  created_at: string;
};

type Auction = {
  id: number;
  title: string;
  description: string;
  image_url: string;
  starting_price: number;
  reserve_price: number | null;
  current_bid: number;
  bid_count: number;
  min_increment: number;
  winner_name: string | null;
  ends_at: string;
  status: "active" | "ended" | "cancelled";
};

// ── Countdown hook ──────────────────────────────────────────────────────────
function useCountdown(endsAt: string) {
  const calc = useCallback(() => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { d, h, m, s, urgent: diff < 3_600_000, total: diff };
  }, [endsAt]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1_000);
    return () => clearInterval(id);
  }, [calc]);

  return time;
}

// ── Countdown display ───────────────────────────────────────────────────────
function CountdownBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 min-w-[52px]">
      <span className="text-2xl font-black tabular-nums text-white leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-white/60">
        {label}
      </span>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function AuctionDetailClient({ id }: { id: number }) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Bid form
  const [bidderName, setBidderName] = useState("");
  const [bidderEmail, setBidderEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bidError, setBidError] = useState("");
  const [bidSuccess, setBidSuccess] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${id}`);
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      const data = (await res.json()) as { auction: Auction; bids: Bid[] };
      setAuction(data.auction);
      setBids(data.bids ?? []);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
    // Poll every 8 seconds to get live bid updates without Realtime subscription
    pollRef.current = setInterval(() => void fetchData(), 8_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  const countdown = useCountdown(auction?.ends_at ?? new Date(0).toISOString());
  const isEnded =
    !auction ||
    auction.status === "ended" ||
    auction.status === "cancelled" ||
    !countdown;

  async function handleBid(e: FormEvent) {
    e.preventDefault();
    setBidError("");
    setBidSuccess("");

    const safeName = sanitizeLine(bidderName);
    const safeEmail = sanitizeLine(bidderEmail);
    const numAmount = parseFloat(amount);

    if (!isValidName(safeName)) {
      setBidError("Name can only contain letters, spaces, hyphens, or apostrophes.");
      return;
    }
    if (!isValidEmail(safeEmail)) {
      setBidError("Please enter a valid email address.");
      return;
    }
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setBidError("Please enter a valid bid amount.");
      return;
    }

    const minBid = auction
      ? auction.current_bid > 0
        ? auction.current_bid + auction.min_increment
        : auction.starting_price
      : 0;

    if (numAmount < minBid) {
      setBidError(`Minimum bid is GHS ${minBid.toFixed(2)}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/auctions/${id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidderName: safeName, bidderEmail: safeEmail, amount: numAmount }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setBidError(data.error ?? "Could not place bid. Please try again.");
      } else {
        setBidSuccess(`Your bid of GHS ${numAmount.toFixed(2)} was placed successfully!`);
        setAmount("");
        void fetchData(); // refresh
      }
    } catch {
      setBidError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-3 py-12 sm:px-4">
        <div className="h-80 animate-pulse rounded-2xl bg-gray-100" />
      </main>
    );
  }

  if (notFound || !auction) {
    return (
      <main className="mx-auto max-w-5xl px-3 py-12 sm:px-4 text-center space-y-4">
        <svg className="mx-auto" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4l5 5-9.5 9.5-5-5z"/><line x1="3" y1="21" x2="9.5" y2="14.5"/></svg>
        <h1 className="text-2xl font-black text-[var(--ink)]">Auction Not Found</h1>
        <p className="text-sm text-[var(--ink-soft)]">This auction may have been removed.</p>
        <Link href="/auctions" className="inline-block rounded-full bg-[var(--brand)] px-6 py-2 text-sm font-bold text-white hover:bg-[var(--brand-deep)]">
          ← Back to Auctions
        </Link>
      </main>
    );
  }

  const displayPrice = auction.current_bid > 0 ? auction.current_bid : auction.starting_price;
  const minNextBid =
    auction.current_bid > 0
      ? auction.current_bid + auction.min_increment
      : auction.starting_price;

  return (
    <main className="mx-auto max-w-5xl px-3 py-8 sm:px-4 sm:py-12 space-y-6">
      {/* Back */}
      <Link
        href="/auctions"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ink-soft)] hover:text-[var(--brand)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        All Auctions
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] items-start">
        {/* ── Left: image + details ── */}
        <div className="space-y-4">
          {/* Image */}
          <div className="panel relative overflow-hidden rounded-2xl">
            <div className="relative h-64 sm:h-80 bg-gradient-to-br from-orange-50 to-amber-100">
              {auction.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={auction.image_url}
                  alt={auction.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4l5 5-9.5 9.5-5-5z"/><line x1="3" y1="21" x2="9.5" y2="14.5"/></svg>
                </div>
              )}

              {/* Status overlay */}
              {!isEnded && countdown && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80">
                    {countdown.urgent ? "Ending Soon!" : "Time Remaining"}
                  </p>
                  <div className="flex gap-2">
                    {countdown.d > 0 && <CountdownBlock label="Days" value={countdown.d} />}
                    <CountdownBlock label="Hours" value={countdown.h} />
                    <CountdownBlock label="Min" value={countdown.m} />
                    <CountdownBlock label="Sec" value={countdown.s} />
                  </div>
                </div>
              )}
              {isEnded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="text-center">
                    <p className="text-3xl font-black text-white">Auction Ended</p>
                    {auction.winner_name && (
                      <p className="mt-1 text-sm font-semibold text-orange-300">
                        Winner: {auction.winner_name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="panel p-5 space-y-4">
            <div>
              <h1 className="text-xl font-black text-[var(--ink)] sm:text-2xl">{auction.title}</h1>
              <p className="mt-2 text-sm text-[var(--ink-soft)] leading-relaxed">{auction.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-orange-50 border border-orange-100 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--brand)]">Starting Price</p>
                <p className="text-base font-black text-[var(--brand-deep)]">GHS {auction.starting_price.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-orange-50 border border-orange-100 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--brand)]">Bid Increment</p>
                <p className="text-base font-black text-[var(--brand-deep)]">+ GHS {auction.min_increment.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: current bid + form ── */}
        <div className="space-y-4 lg:sticky lg:top-24">
          {/* Current bid card */}
          <div
            className={`rounded-2xl p-6 text-center ${
              isEnded
                ? "bg-gray-100 border border-gray-200"
                : "bg-gradient-to-br from-[var(--ink)] to-[#1a1a2e] shadow-lg shadow-black/20"
            }`}
          >
            <p className={`text-xs font-bold uppercase tracking-widest ${isEnded ? "text-gray-500" : "text-white/70"}`}>
              {auction.current_bid > 0 ? "Current Bid" : "Starting Price"}
            </p>
            <p className={`text-4xl font-black mt-1 ${isEnded ? "text-gray-700" : "text-white"}`}>
              GHS {displayPrice.toFixed(2)}
            </p>
            <p className={`mt-1 text-xs font-semibold ${isEnded ? "text-gray-400" : "text-white/60"}`}>
              {auction.bid_count} bid{auction.bid_count !== 1 ? "s" : ""} placed
            </p>
            {!isEnded && (
              <p className="mt-2 text-xs font-bold text-yellow-300">
                Next minimum bid: GHS {minNextBid.toFixed(2)}
              </p>
            )}
          </div>

          {/* Bid form */}
          {!isEnded ? (
            <div className="panel p-5 space-y-4">
              <h2 className="text-base font-black text-[var(--ink)]">Place Your Bid</h2>
              <form onSubmit={(e) => void handleBid(e)} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={bidderName}
                    onChange={(e) => setBidderName(e.target.value)}
                    placeholder="John Doe"
                    maxLength={80}
                    required
                    className="input-styled text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={bidderEmail}
                    onChange={(e) => setBidderEmail(e.target.value)}
                    placeholder="you@example.com"
                    maxLength={254}
                    required
                    className="input-styled text-sm"
                  />
                  <p className="mt-0.5 text-[10px] text-[var(--ink-soft)]">
                    Only used to contact you if you win. Never shared.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                    Your Bid (GHS) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--ink-soft)]">
                      GHS
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min={minNextBid}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={minNextBid.toFixed(2)}
                      required
                      className="input-styled pl-10 text-sm font-bold"
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-[var(--ink-soft)]">
                    Minimum: GHS {minNextBid.toFixed(2)}
                  </p>
                </div>

                {bidError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {bidError}
                  </p>
                )}
                {bidSuccess && (
                  <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                    {bidSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-[var(--brand)] py-3 text-sm font-black text-white hover:bg-[var(--brand-deep)] disabled:opacity-60 transition-all active:scale-95 shadow-md"
                >
                  {submitting ? "Placing Bid…" : (
                    <span className="flex items-center justify-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4l5 5-9.5 9.5-5-5z"/><line x1="3" y1="21" x2="9.5" y2="14.5"/></svg>
                      Place Bid
                    </span>
                  )}
                </button>
              </form>

              <p className="text-[10px] text-center text-[var(--ink-soft)]">
                By bidding you agree that if you win, you must complete the purchase.
              </p>
            </div>
          ) : (
            <div className="panel p-5 text-center space-y-3">
              <svg className="mx-auto" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              <p className="text-sm font-bold text-[var(--ink)]">
                {auction.winner_name
                  ? `This auction was won by ${auction.winner_name}.`
                  : "This auction has ended."}
              </p>
              <Link
                href="/auctions"
                className="inline-block rounded-full bg-[var(--brand)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--brand-deep)]"
              >
                See More Auctions
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Bid history ── */}
      {bids.length > 0 && (
        <section className="panel p-5 sm:p-6">
          <h2 className="mb-4 text-base font-black text-[var(--ink)]">
            Bid History ({bids.length})
          </h2>
          <div className="space-y-2">
            {bids.map((bid, idx) => (
              <div
                key={bid.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
                  idx === 0
                    ? "bg-orange-50 border border-orange-200"
                    : "bg-[var(--surface)] border border-black/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {idx === 0 && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" stroke="none" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  )}
                  <div>
                    <p className="font-bold text-[var(--ink)]">{bid.bidder_name}</p>
                    <p className="text-[10px] text-[var(--ink-soft)]">
                      {new Date(bid.created_at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <span className={`font-black ${idx === 0 ? "text-[var(--brand)] text-base" : "text-[var(--ink)]"}`}>
                  GHS {Number(bid.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
