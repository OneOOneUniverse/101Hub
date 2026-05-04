"use client";

import { useCallback, useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { sanitizeLine, isValidName, isValidEmail } from "@/lib/validation";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type Bid = { id: number; bidder_name: string; amount: number; created_at: string };
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

// â”€â”€ Countdown hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useCountdown(endsAt: string) {
  const calc = useCallback(() => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { d, h, m, s, urgent: diff < 3_600_000 };
  }, [endsAt]);
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1_000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

function CountdownBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 min-w-[52px]">
      <span className="text-2xl font-black tabular-nums text-white leading-none">{String(value).padStart(2, "0")}</span>
      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-white/60">{label}</span>
    </div>
  );
}

// â”€â”€ Confetti pieces (CSS-only, no dependency) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CONFETTI_COLORS = ["#ff6b35", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444"];

function ConfettiPiece({ idx }: { idx: number }) {
  const color = CONFETTI_COLORS[idx % CONFETTI_COLORS.length];
  const left = `${(idx * 37 + 11) % 100}%`;
  const delay = `${((idx * 0.41) % 3).toFixed(2)}s`;
  const duration = `${(2.4 + (idx % 4) * 0.6).toFixed(1)}s`;
  const size = 7 + (idx % 4) * 3;
  return (
    <div
      style={{
        position: "fixed", left, top: "-20px", width: size, height: size,
        background: color, borderRadius: idx % 3 === 0 ? "50%" : idx % 3 === 1 ? "2px" : "0 50% 50% 0",
        animation: `confettiFall ${duration} ${delay} linear infinite`,
        zIndex: 9999, pointerEvents: "none",
      }}
    />
  );
}

// â”€â”€ Victory screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function VictoryScreen({
  auction,
  onCheckout,
  onDismiss,
}: {
  auction: Auction;
  onCheckout: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(105vh) rotate(600deg); opacity: 0.2; }
        }
        @keyframes victoryBounce {
          0%, 100% { transform: scale(1);    }
          50%       { transform: scale(1.08); }
        }
        @keyframes victoryFadeIn {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
      {Array.from({ length: 32 }).map((_, i) => <ConfettiPiece key={i} idx={i} />)}
      <main
        className="mx-auto max-w-lg px-4 py-12 sm:py-20"
        style={{ animation: "victoryFadeIn 0.6s ease both" }}
      >
        <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-yellow-400">
          {auction.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={auction.image_url} alt={auction.title} className="w-full h-48 sm:h-56 object-cover" />
          )}
          <div className="bg-gradient-to-b from-yellow-50 to-white p-8 space-y-5 text-center">
            <div style={{ animation: "victoryBounce 1.6s ease infinite" }}>
              <div className="text-6xl mb-2">ðŸ†</div>
              <h1 className="text-3xl font-black text-yellow-700">You Won!</h1>
            </div>

            <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-yellow-600">Winning Item</p>
              <p className="text-lg font-black text-gray-900">{auction.title}</p>
              <p className="text-3xl font-black text-[var(--brand)]">GHS {auction.current_bid.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Your winning bid</p>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              ðŸŽ‰ Congratulations! Your bid won this auction. Complete your purchase below to claim your item.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={onCheckout}
                className="w-full rounded-full bg-[var(--brand)] py-4 text-base font-black text-white hover:bg-[var(--brand-deep)] transition-all active:scale-95 shadow-lg"
              >
                ðŸ›’ Checkout & Pay Now
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="w-full rounded-full border-2 border-gray-200 py-3 text-sm font-bold text-gray-500 hover:border-gray-300 transition-all"
              >
                View Auction Details
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function AuctionDetailClient({ id }: { id: number }) {
  const { user, isLoaded } = useUser();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [newBidFlash, setNewBidFlash] = useState(false);
  const prevBidCountRef = useRef(0);

  // Victory
  const [showVictory, setShowVictory] = useState(false);
  const winStorageKey = `101hub_mybid_${id}`;

  // Bid form
  const [bidderName, setBidderName] = useState("");
  const [bidderEmail, setBidderEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bidError, setBidError] = useState("");
  const [bidSuccess, setBidSuccess] = useState("");

  // Auto-fill name/email from Clerk
  useEffect(() => {
    if (!isLoaded || !user) return;
    const name =
      user.username ??
      [user.firstName, user.lastName].filter(Boolean).join(" ") ??
      "";
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    if (name) setBidderName(name);
    if (email) setBidderEmail(email);
  }, [isLoaded, user]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${id}`, { cache: "no-store" });
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      const data = (await res.json()) as { auction: Auction; bids: Bid[] };
      setAuction(data.auction);
      setBids((prev) => {
        const newLen = data.bids?.length ?? 0;
        if (newLen > prevBidCountRef.current && prevBidCountRef.current > 0) {
          setNewBidFlash(true);
          setTimeout(() => setNewBidFlash(false), 3000);
        }
        prevBidCountRef.current = newLen;
        return data.bids ?? prev;
      });
    } catch { /* keep stale */ } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
    // Poll every 3 s for live feel
    const timer = setInterval(() => void fetchData(), 3_000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const countdown = useCountdown(auction?.ends_at ?? new Date(0).toISOString());
  const isEnded =
    !auction ||
    auction.status === "ended" ||
    auction.status === "cancelled" ||
    !countdown;

  // Victory detection â€” compare winning bid to what user placed (stored in localStorage)
  useEffect(() => {
    if (!isEnded || !auction || auction.current_bid === 0) return;
    try {
      const raw = localStorage.getItem(winStorageKey);
      if (!raw) return;
      const stored = JSON.parse(raw) as { amount: number };
      if (stored.amount === auction.current_bid) setShowVictory(true);
    } catch { /* ignore */ }
  }, [isEnded, auction, winStorageKey]);

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
        setBidSuccess(`ðŸ”¥ Bid of GHS ${numAmount.toFixed(2)} placed! You're in the lead.`);
        setAmount("");
        // Track this bid for victory detection when auction ends
        try {
          localStorage.setItem(winStorageKey, JSON.stringify({ amount: numAmount, name: safeName, ts: Date.now() }));
        } catch { /* ignore */ }
        void fetchData();
      }
    } catch {
      setBidError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCheckout() {
    if (!auction) return;
    try {
      sessionStorage.setItem(
        "101hub_auction_checkout",
        JSON.stringify({ id, title: auction.title, amount: auction.current_bid, image: auction.image_url })
      );
    } catch { /* ignore */ }
    window.location.href = `/auctions/${id}/claim`;
  }

  // â”€â”€ Render guards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          â† Back to Auctions
        </Link>
      </main>
    );
  }

  // Victory screen (winner only)
  if (showVictory) {
    return <VictoryScreen auction={auction} onCheckout={handleCheckout} onDismiss={() => setShowVictory(false)} />;
  }

  const displayPrice = auction.current_bid > 0 ? auction.current_bid : auction.starting_price;
  const minNextBid = auction.current_bid > 0
    ? auction.current_bid + auction.min_increment
    : auction.starting_price;

  // Approximate watcher count from bid activity
  const watcherCount = Math.max(bids.length * 2, 4) + (auction.bid_count % 7) + 3;

  return (
    <main className="mx-auto max-w-5xl px-3 py-8 sm:px-4 sm:py-12 space-y-6">
      <style>{`
        @keyframes bidPop {
          0%   { opacity: 0; transform: translateY(-6px) scale(0.95); }
          25%  { opacity: 1; transform: translateY(0)    scale(1.03); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: scale(1); }
        }
      `}</style>

      {/* Back */}
      <Link href="/auctions" className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ink-soft)] hover:text-[var(--brand)] transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        All Auctions
      </Link>

      {/* â”€â”€ LIVE banner â”€â”€ */}
      {!isEnded && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 px-4 py-3 text-white shadow-md flex-wrap">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
            </span>
            <span className="text-sm font-black tracking-wide">LIVE AUCTION</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-white/90">
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              {watcherCount} watching
            </span>
            {newBidFlash && (
              <span
                style={{ animation: "bidPop 3s ease forwards" }}
                className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black"
              >
                ðŸ”¥ New bid!
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] items-start">
        {/* â”€â”€ Left: image + details â”€â”€ */}
        <div className="space-y-4">
          <div className="panel relative overflow-hidden rounded-2xl">
            <div className="relative h-64 sm:h-80 bg-gradient-to-br from-orange-50 to-amber-100">
              {auction.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={auction.image_url} alt={auction.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4l5 5-9.5 9.5-5-5z"/><line x1="3" y1="21" x2="9.5" y2="14.5"/></svg>
                </div>
              )}

              {!isEnded && countdown && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80">
                    {countdown.urgent ? "âš¡ Ending Soon!" : "Time Remaining"}
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
                      <p className="mt-1 text-sm font-semibold text-orange-300">Winner: {auction.winner_name}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

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

        {/* â”€â”€ Right: current bid + form â”€â”€ */}
        <div className="space-y-4 lg:sticky lg:top-24">
          {/* Current bid card */}
          <div className={`rounded-2xl p-6 text-center ${isEnded ? "bg-gray-100 border border-gray-200" : "bg-gradient-to-br from-[var(--ink)] to-[#1a1a2e] shadow-lg shadow-black/20"}`}>
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
                Next minimum: GHS {minNextBid.toFixed(2)}
              </p>
            )}
          </div>

          {/* Bid form */}
          {!isEnded ? (
            <div className="panel p-5 space-y-4">
              {/* "Bidding as" indicator for logged-in users */}
              {user && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span className="text-xs font-bold text-green-800">
                    Bidding as <span className="text-green-900">{bidderName || user.firstName || "you"}</span>
                  </span>
                </div>
              )}

              <h2 className="text-base font-black text-[var(--ink)]">Place Your Bid</h2>
              <form onSubmit={(e) => void handleBid(e)} className="space-y-3">
                {/* Only show name/email fields if NOT signed in */}
                {!user && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={bidderName}
                        onChange={(e) => setBidderName(e.target.value)}
                        placeholder="e.g. Kwame Mensah"
                        maxLength={80}
                        required
                        className="input-styled text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                        Email <span className="text-red-500">*</span>
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
                      <p className="mt-0.5 text-[10px] text-[var(--ink-soft)]">Only used to contact you if you win.</p>
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                    Your Bid (GHS) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--ink-soft)]">GHS</span>
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
                  <p className="mt-0.5 text-[10px] text-[var(--ink-soft)]">Minimum: GHS {minNextBid.toFixed(2)}</p>
                </div>

                {bidError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{bidError}</p>}
                {bidSuccess && <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">{bidSuccess}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-[var(--brand)] py-3 text-sm font-black text-white hover:bg-[var(--brand-deep)] disabled:opacity-60 transition-all active:scale-95 shadow-md"
                >
                  {submitting ? "Placing Bidâ€¦" : (
                    <span className="flex items-center justify-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4l5 5-9.5 9.5-5-5z"/><line x1="3" y1="21" x2="9.5" y2="14.5"/></svg>
                      Place Bid â€” GHS {amount ? parseFloat(amount).toFixed(2) : minNextBid.toFixed(2)}
                    </span>
                  )}
                </button>
              </form>

              {!user && (
                <p className="text-[10px] text-center text-[var(--ink-soft)]">
                  <Link href="/login" className="text-[var(--brand)] font-bold hover:underline">Sign in</Link>
                  {" "}to bid with your username and track your wins automatically.
                </p>
              )}
              <p className="text-[10px] text-center text-[var(--ink-soft)]">
                By bidding you agree that if you win, you must complete the purchase.
              </p>
            </div>
          ) : (
            <div className="panel p-5 text-center space-y-3">
              <svg className="mx-auto" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              <p className="text-sm font-bold text-[var(--ink)]">
                {auction.winner_name ? `This auction was won by ${auction.winner_name}.` : "This auction has ended."}
              </p>
              <Link href="/auctions" className="inline-block rounded-full bg-[var(--brand)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--brand-deep)]">
                See More Auctions
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Live Bid Feed â”€â”€ */}
      {bids.length > 0 && (
        <section className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2 className="text-base font-black text-[var(--ink)]">Live Bid Feed ({bids.length})</h2>
            {!isEnded && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Updating live
              </span>
            )}
          </div>
          <div className="space-y-2">
            {bids.map((bid, idx) => {
              const isMe = bidderName.trim() && bid.bidder_name.trim().toLowerCase() === bidderName.trim().toLowerCase();
              return (
                <div
                  key={bid.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm gap-3 ${
                    idx === 0
                      ? "bg-orange-50 border border-orange-200"
                      : "bg-[var(--surface)] border border-black/5"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {idx === 0 && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="none" aria-hidden="true" className="flex-shrink-0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    )}
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-[var(--brand)] text-[10px] font-black text-white uppercase flex-shrink-0">
                      {bid.bidder_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--ink)] truncate">
                        {bid.bidder_name}
                        {isMe && (
                          <span className="ml-1.5 text-[9px] font-black text-[var(--brand)] bg-orange-100 rounded-full px-1.5 py-0.5 align-middle">You</span>
                        )}
                      </p>
                      <p className="text-[10px] text-[var(--ink-soft)]">
                        {new Date(bid.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <span className={`font-black flex-shrink-0 ${idx === 0 ? "text-[var(--brand)] text-base" : "text-[var(--ink)]"}`}>
                    GHS {Number(bid.amount).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
