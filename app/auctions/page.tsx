"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Auction = {
  id: number;
  title: string;
  description: string;
  image_url: string;
  starting_price: number;
  current_bid: number;
  bid_count: number;
  min_increment: number;
  ends_at: string;
  status: "active" | "ended" | "cancelled";
};

function useCountdown(endsAt: string) {
  const calc = useCallback(() => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { h, m, s, urgent: diff < 3_600_000 };
  }, [endsAt]);

  const [time, setTime] = useState(calc);

  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1_000);
    return () => clearInterval(id);
  }, [calc]);

  return time;
}

function AuctionCard({ a }: { a: Auction }) {
  const countdown = useCountdown(a.ends_at);
  const isEnded = a.status === "ended" || !countdown;
  const displayPrice = a.current_bid > 0 ? a.current_bid : a.starting_price;

  return (
    <Link
      href={`/auctions/${a.id}`}
      className="group panel relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-12px_rgba(139,92,246,0.25)] hover:border-purple-300/40"
    >
      {/* Image / placeholder */}
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-100">
        {a.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.image_url}
            alt={a.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4l5 5-9.5 9.5-5-5z"/><line x1="3" y1="21" x2="9.5" y2="14.5"/></svg>
          </div>
        )}

        {/* Status badge */}
        <span
          className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide shadow ${
            isEnded
              ? "bg-gray-800 text-white"
              : countdown?.urgent
              ? "bg-red-500 text-white animate-pulse"
              : "bg-purple-600 text-white"
          }`}
        >
          {isEnded ? "Ended" : "Live"}
        </span>

        {/* Bid count chip */}
        <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          {a.bid_count} bid{a.bid_count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-sm font-black leading-snug text-[var(--ink)] group-hover:text-purple-700 transition-colors">
          {a.title}
        </h3>

        {/* Price + countdown */}
        <div className="mt-auto space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                {a.current_bid > 0 ? "Current Bid" : "Starting Price"}
              </p>
              <p className="text-xl font-black text-purple-700">
                GHS {displayPrice.toFixed(2)}
              </p>
            </div>
            {!isEnded && countdown && (
              <div
                className={`rounded-xl px-3 py-1.5 text-center ${
                  countdown.urgent ? "bg-red-50 border border-red-200" : "bg-purple-50 border border-purple-200"
                }`}
              >
                <p className={`text-[10px] font-semibold ${countdown.urgent ? "text-red-600" : "text-purple-600"}`}>
                  Ends in
                </p>
                <p className={`font-mono text-sm font-black tabular-nums ${countdown.urgent ? "text-red-700" : "text-purple-700"}`}>
                  {countdown.h > 0
                    ? `${countdown.h}h ${countdown.m}m`
                    : `${String(countdown.m).padStart(2, "0")}:${String(countdown.s).padStart(2, "0")}`}
                </p>
              </div>
            )}
            {isEnded && (
              <span className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-500">
                Auction over
              </span>
            )}
          </div>

          {!isEnded && (
            <div className="rounded-lg bg-purple-600 py-2 text-center text-xs font-bold text-white transition-all group-hover:bg-purple-700">
              Place a Bid →
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "ended">("all");

  useEffect(() => {
    fetch("/api/auctions")
      .then((r) => r.json())
      .then((d) => setAuctions(Array.isArray(d) ? d : []))
      .catch(() => setAuctions([]))
      .finally(() => setLoading(false));
  }, []);

  // Auto-mark expired auctions on the client
  const now = Date.now();
  const adjusted = auctions.map((a) =>
    a.status === "active" && new Date(a.ends_at).getTime() <= now
      ? { ...a, status: "ended" as const }
      : a
  );

  const filtered = adjusted.filter((a) => {
    if (filter === "active") return a.status === "active";
    if (filter === "ended") return a.status === "ended";
    return true;
  });

  const activeCount = adjusted.filter((a) => a.status === "active").length;

  return (
    <main className="mx-auto max-w-6xl px-3 py-8 sm:px-4 sm:py-12 space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-900 px-6 py-10 sm:px-10 sm:py-14">
        <span className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-purple-400 opacity-20 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-indigo-300 opacity-15 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white/80 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              {activeCount} Active {activeCount === 1 ? "Auction" : "Auctions"}  
            </span>
            <h1 className="flex items-center gap-3 text-3xl font-black text-white sm:text-4xl">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4l5 5-9.5 9.5-5-5z"/><line x1="3" y1="21" x2="9.5" y2="14.5"/></svg>
              Live Auctions
            </h1>
            <p className="max-w-md text-sm text-white/65">
              Bid on exclusive items in real-time. The highest bid when the
              timer expires wins.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-5 py-3 text-center">
              <p className="text-2xl font-black text-white">{activeCount}</p>
              <p className="text-[11px] font-semibold text-white/60">Live Now</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-5 py-3 text-center">
              <p className="text-2xl font-black text-white">{auctions.length}</p>
              <p className="text-[11px] font-semibold text-white/60">Total</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "active", "ended"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all capitalize ${
              filter === f
                ? "bg-purple-600 text-white shadow"
                : "bg-[var(--surface-strong)] border border-black/10 text-[var(--ink-soft)] hover:border-purple-300"
            }`}
          >
            {f === "all" ? "All Auctions" : f === "active" ? "🟢 Active" : "🔴 Ended"}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="panel h-72 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-4 py-16 text-center">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4l5 5-9.5 9.5-5-5z"/><line x1="3" y1="21" x2="9.5" y2="14.5"/></svg>
          <p className="text-base font-bold text-[var(--ink)]">No auctions yet</p>
          <p className="text-sm text-[var(--ink-soft)]">
            Check back soon — new items go live regularly.
          </p>
          <Link href="/products" className="rounded-full bg-purple-600 px-6 py-2 text-sm font-bold text-white hover:bg-purple-700">
            Browse Products Instead
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <AuctionCard key={a.id} a={a} />
          ))}
        </div>
      )}

      {/* How it works */}
      <section className="panel p-6 sm:p-8">
        <h2 className="mb-6 text-lg font-black text-[var(--ink)]">How Auctions Work</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { step: "1", icon: "eye", title: "Browse Items", desc: "Find an item you love with an active countdown." },
            { step: "2", icon: "bid", title: "Place Your Bid", desc: "Enter your name, email, and a bid above the minimum." },
            { step: "3", icon: "trophy", title: "Win & Collect", desc: "If you're the highest bidder when time runs out, you win!" },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="flex gap-4 items-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                {icon === "eye" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                {icon === "bid" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4l5 5-9.5 9.5-5-5z"/><line x1="3" y1="21" x2="9.5" y2="14.5"/></svg>}
                {icon === "trophy" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 000 5H6"/><path d="M18 9h1.5a2.5 2.5 0 010 5H18"/><path d="M4 22h16"/><path d="M10 22v-5"/><path d="M14 22v-5"/><path d="M6 2v7a6 6 0 0012 0V2"/></svg>}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-purple-500 mb-0.5">Step {step}</p>
                <p className="text-sm font-bold text-[var(--ink)]">{title}</p>
                <p className="text-xs text-[var(--ink-soft)] mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
