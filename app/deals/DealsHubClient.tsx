"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import type { DealsHubContent, Product } from "@/lib/site-content-types";

// Variant accent palette for game cards
const GAME_ACCENTS: Record<string, { border: string; shadow: string; glow: string }> = {
  violet:  { border: "rgba(139,92,246,0.45)",  shadow: "rgba(124,58,237,0.22)",  glow: "#8b5cf6" },
  rose:    { border: "rgba(244,63,94,0.45)",   shadow: "rgba(244,63,94,0.18)",   glow: "#f43f5e" },
  amber:   { border: "rgba(245,158,11,0.45)",  shadow: "rgba(245,158,11,0.18)",  glow: "#f59e0b" },
  indigo:  { border: "rgba(99,102,241,0.45)",  shadow: "rgba(99,102,241,0.18)",  glow: "#6366f1" },
  emerald: { border: "rgba(16,185,129,0.45)",  shadow: "rgba(16,185,129,0.18)",  glow: "#10b981" },
  cyan:    { border: "rgba(6,182,212,0.45)",   shadow: "rgba(6,182,212,0.18)",   glow: "#06b6d4" },
};

type Props = {
  dealsHub: DealsHubContent;
  products: Product[];
};

export default function DealsHubClient({ dealsHub, products: _products }: Props) {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState("");
  const [activeReward, setActiveReward] = useState<{ id: number; discountCedis: number; label: string } | null>(null);

  const refreshActiveReward = useCallback(() => {
    fetch("/api/deals/active-reward")
      .then((r) => r.json())
      .then((d: { hasReward: boolean; reward?: { id: number; discountCedis: number; label: string } }) => {
        setActiveReward(d.hasReward && d.reward ? d.reward : null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/deals/points")
      .then((r) => r.json())
      .then((d: { balance?: number }) => setPoints(d.balance ?? 0))
      .catch(() => {});
    refreshActiveReward();
  }, [isSignedIn, refreshActiveReward]);

  const refreshPoints = useCallback(() => {
    fetch("/api/deals/points")
      .then((r) => r.json())
      .then((d: { balance?: number }) => setPoints(d.balance ?? 0))
      .catch(() => {});
  }, []);

  const handleRedeem = useCallback(async () => {
    if (redeeming) return;
    setRedeeming(true);
    setRedeemMsg("");
    try {
      const res = await fetch("/api/deals/redeem", { method: "POST" });
      const data = (await res.json()) as { discountCedis?: number; pointsUsed?: number; remainingBalance?: number; error?: string };
      if (!res.ok) {
        setRedeemMsg(data.error ?? "Failed to claim");
      } else {
        setRedeemMsg(`✅ Claimed GHS ${data.discountCedis} discount! Apply it at checkout.`);
        refreshPoints();
        refreshActiveReward();
      }
    } catch {
      setRedeemMsg("Network error — try again");
    } finally {
      setRedeeming(false);
    }
  }, [redeeming, refreshPoints, refreshActiveReward]);

  const enabledStores = dealsHub.specialStores.filter((s) => s.enabled);
  const minRedeem = dealsHub.minRedeemPoints || 0;
  const canRedeem = !activeReward && (minRedeem > 0 ? points >= minRedeem : points >= dealsHub.pointsPerCedi);
  const progressPct = minRedeem > 0 ? Math.min(100, Math.round((points / minRedeem) * 100)) : 100;

  // Store slider
  const [storeSlide, setStoreSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

  const prevStore = useCallback(() => {
    setStoreSlide((i) => (i <= 0 ? enabledStores.length - 1 : i - 1));
  }, [enabledStores.length]);

  const nextStore = useCallback(() => {
    setStoreSlide((i) => (i >= enabledStores.length - 1 ? 0 : i + 1));
  }, [enabledStores.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextStore();
      else prevStore();
    }
  }, [nextStore, prevStore]);

  // Flat game list with variant colours
  type GameEntry = { id: string; emoji: string; name: string; desc: string; route: string; pts: number | null; variant: string };
  const games: GameEntry[] = [
    dealsHub.spinWheel.enabled && { id: "spin", emoji: "🎡", name: dealsHub.spinWheel.title, desc: dealsHub.spinWheel.description, route: "/deals/play/spin", pts: null, variant: "violet" },
    dealsHub.scratchCard.enabled && { id: "scratch", emoji: "🎟️", name: dealsHub.scratchCard.title, desc: dealsHub.scratchCard.description, route: "/deals/play/scratch", pts: null, variant: "rose" },
    dealsHub.trivia.enabled && dealsHub.trivia.questions.length > 0 && { id: "trivia", emoji: "🧠", name: dealsHub.trivia.title, desc: dealsHub.trivia.description, route: "/deals/play/trivia", pts: null, variant: "amber" },
    (dealsHub.memoryMatch?.enabled ?? true) && { id: "memory", emoji: "🃏", name: dealsHub.memoryMatch?.title ?? "Memory Match", desc: dealsHub.memoryMatch?.description ?? "Flip cards and match all pairs to win points!", route: "/deals/play/memory", pts: dealsHub.memoryMatch?.pointsReward ?? 75, variant: "indigo" },
    (dealsHub.luckyNumber?.enabled ?? true) && { id: "lucky", emoji: "🎲", name: dealsHub.luckyNumber?.title ?? "Lucky Number", desc: dealsHub.luckyNumber?.description ?? "Guess the secret number to win points!", route: "/deals/play/lucky", pts: dealsHub.luckyNumber?.pointsReward ?? 50, variant: "emerald" },
    (dealsHub.wordScramble?.enabled ?? true) && { id: "scramble", emoji: "🔤", name: dealsHub.wordScramble?.title ?? "Word Scramble", desc: dealsHub.wordScramble?.description ?? "Unscramble the mystery word to win points!", route: "/deals/play/scramble", pts: dealsHub.wordScramble?.pointsReward ?? 60, variant: "cyan" },
  ].filter(Boolean) as GameEntry[];

  return (
    <div className="dh">
      {/* ── HERO ── */}
      <section className="dh-hero">
        <div className="dh-hero-glow-a" />
        <div className="dh-hero-glow-b" />
        <div className="dh-hero-inner">
          <div className="dh-chip">✦ Exclusive Deals Zone</div>
          <h1 className="dh-h1">{dealsHub.title}</h1>
          <p className="dh-lead">{dealsHub.description}</p>

          {isSignedIn && (
            <div className="dh-stats-row">
              <div className="dh-stat">
                <span className="dh-stat-val">{points.toLocaleString()}</span>
                <span className="dh-stat-lbl">Points</span>
              </div>
              <div className="dh-stat-sep" />
              {points >= dealsHub.pointsPerCedi ? (
                <div className="dh-stat">
                  <span className="dh-stat-val dh-sv-green">GHS {Math.floor(points / dealsHub.pointsPerCedi)}</span>
                  <span className="dh-stat-lbl">Available</span>
                </div>
              ) : (
                <div className="dh-stat">
                  <span className="dh-stat-val dh-sv-dim">{dealsHub.pointsPerCedi - (points % dealsHub.pointsPerCedi)}</span>
                  <span className="dh-stat-lbl">to next GHS 1</span>
                </div>
              )}
              {activeReward && (
                <>
                  <div className="dh-stat-sep" />
                  <div className="dh-stat">
                    <span className="dh-stat-val dh-sv-amber">Active</span>
                    <span className="dh-stat-lbl">Reward ready</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── REWARD / CLAIM CARD ── */}
      {isSignedIn && (
        <div className="dh-reward-wrap">
          <div className="dh-reward-card">
            {activeReward ? (
              <div className="dh-ar">
                <span className="dh-ar-icon">✨</span>
                <div className="dh-ar-body">
                  <p className="dh-ar-title">{activeReward.label}</p>
                  <p className="dh-ar-sub">Ready to use at checkout</p>
                </div>
                <Link href="/cart" className="dh-ar-btn">Use Now →</Link>
              </div>
            ) : minRedeem > 0 ? (
              <div className="dh-claim">
                <div className="dh-claim-top">
                  <span className="dh-claim-icon">🎁</span>
                  <div>
                    <p className="dh-claim-title">Claim Your Reward</p>
                    <p className="dh-claim-sub">Reach {minRedeem.toLocaleString()} pts to unlock a discount</p>
                  </div>
                  {canRedeem && (
                    <button onClick={handleRedeem} disabled={redeeming} className="dh-claim-btn">
                      {redeeming ? "Claiming…" : `Claim GHS ${Math.floor(points / dealsHub.pointsPerCedi)}`}
                    </button>
                  )}
                </div>
                <div className="dh-bar"><div className="dh-bar-fill" style={{ width: `${progressPct}%` }} /></div>
                <div className="dh-bar-labels">
                  <span>{points.toLocaleString()} pts</span>
                  {!canRedeem && <span className="dh-bar-mid">{(minRedeem - points).toLocaleString()} pts to go</span>}
                  <span>{minRedeem.toLocaleString()} pts</span>
                </div>
              </div>
            ) : null}
            {redeemMsg && <p className="dh-msg">{redeemMsg}</p>}
          </div>
        </div>
      )}

      {/* ── SPECIAL STORES ── */}
      {enabledStores.length > 0 && (
        <section className="dh-section">
          <div className="dh-sec-eyebrow">🏪 Special Stores</div>
          <h2 className="dh-sec-h2">Browse Curated Collections</h2>

          <div className="dh-slider-row">
            {enabledStores.length > 1 && (
              <button className="dh-arr" onClick={prevStore} aria-label="Previous store">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            <div className="dh-slider-track" ref={sliderRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <div className="dh-slider-inner" style={{ transform: `translateX(-${storeSlide * 100}%)` }}>
                {enabledStores.map((store) => {
                  const hasImg = !!store.backgroundImage;
                  return (
                    <div key={store.id} className="dh-slide">
                      <Link href={`/deals/store/${store.slug}`} className="dh-sc">
                        {hasImg
                          ? <img src={store.backgroundImage} alt="" className="dh-sc-img" />
                          : <div className="dh-sc-grad" style={{ background: `linear-gradient(145deg, ${store.bgColor}, ${store.bgColor}99)` }} />
                        }
                        <div className="dh-sc-overlay" />
                        <div className="dh-sc-body" style={{ color: hasImg ? "#fff" : store.textColor }}>
                          <span className="dh-sc-emoji">{store.emoji}</span>
                          <h3 className="dh-sc-name">{store.name}</h3>
                          <p className="dh-sc-desc">{store.description}</p>
                          <span className="dh-sc-cta">
                            Explore
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" /></svg>
                          </span>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
            {enabledStores.length > 1 && (
              <button className="dh-arr" onClick={nextStore} aria-label="Next store">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>

          {enabledStores.length > 1 && (
            <div className="dh-dots">
              {enabledStores.map((s, i) => (
                <button key={s.id} className={`dh-dot${i === storeSlide ? " dh-dot--on" : ""}`} onClick={() => setStoreSlide(i)} aria-label={s.name} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── GAMES ── */}
      <section className="dh-section">
        <div className="dh-sec-eyebrow">🎮 Games &amp; Rewards</div>
        <h2 className="dh-sec-h2">Play to Earn Points</h2>

        {!isSignedIn && (
          <div className="dh-gate">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span><Link href="/login" className="dh-gate-link">Sign in</Link> to play and earn discount points</span>
          </div>
        )}

        <div className="dh-games-grid">
          {games.map((g, idx) => (
            <button key={g.id} className="dh-gc" onClick={() => router.push(g.route)}
              style={{ "--ga": GAME_ACCENTS[g.variant]?.border, "--gs": GAME_ACCENTS[g.variant]?.shadow, "--gg": GAME_ACCENTS[g.variant]?.glow } as React.CSSProperties}>
              <span className="dh-gc-num">0{idx + 1}</span>
              <span className="dh-gc-emoji">{g.emoji}</span>
              <h3 className="dh-gc-name">{g.name}</h3>
              <p className="dh-gc-desc">{g.desc}</p>
              {g.pts !== null && <span className="dh-gc-pts">+{g.pts} pts</span>}
              <span className="dh-gc-play">
                Play Now
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" /></svg>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── STYLES ── */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700&display=swap');

        /* ── root ── */
        .dh {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background: #07070e;
          color: #f1f5f9;
          position: relative;
        }

        /* ── HERO ── */
        .dh-hero {
          position: relative;
          z-index: 1;
          padding: 5rem 1.5rem 3.5rem;
          text-align: center;
          overflow: hidden;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .dh-hero-glow-a {
          position: absolute;
          top: -30%;
          left: 15%;
          width: 55vw;
          height: 55vw;
          max-width: 640px;
          max-height: 640px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%);
          pointer-events: none;
          animation: dh-breathe 7s ease-in-out infinite;
        }
        .dh-hero-glow-b {
          position: absolute;
          bottom: -20%;
          right: 10%;
          width: 40vw;
          height: 40vw;
          max-width: 480px;
          max-height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(244,63,94,0.08) 0%, transparent 70%);
          pointer-events: none;
          animation: dh-breathe 9s ease-in-out infinite reverse;
        }
        @keyframes dh-breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: 0.7; }
        }
        .dh-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 600px;
          margin: 0 auto;
        }
        .dh-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #a78bfa;
          border: 1px solid rgba(167,139,250,0.28);
          padding: 0.38em 1.1em;
          border-radius: 99px;
          margin-bottom: 1.4rem;
          background: rgba(124,58,237,0.07);
        }
        .dh-h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(2.5rem, 7vw, 4rem);
          font-weight: 800;
          line-height: 1.04;
          letter-spacing: -0.025em;
          background: linear-gradient(135deg, #ffffff 0%, #ddd6fe 35%, #a78bfa 65%, #f9a8d4 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 0.8rem;
        }
        .dh-lead {
          font-size: 0.975rem;
          font-weight: 300;
          color: #64748b;
          line-height: 1.75;
          max-width: 440px;
          margin: 0 auto 2.25rem;
        }

        /* Stats bar */
        .dh-stats-row {
          display: inline-flex;
          align-items: center;
          gap: 1.5rem;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 1rem;
          padding: 0.85rem 1.8rem;
          backdrop-filter: blur(16px);
        }
        .dh-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.12rem;
        }
        .dh-stat-val {
          font-family: 'Syne', sans-serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        .dh-sv-green { color: #34d399; }
        .dh-sv-dim   { color: #64748b; font-size: 1.1rem; }
        .dh-sv-amber { color: #fbbf24; }
        .dh-stat-lbl {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #475569;
          font-weight: 600;
        }
        .dh-stat-sep {
          width: 1px;
          height: 2rem;
          background: rgba(255,255,255,0.06);
        }

        /* ── REWARD CARD ── */
        .dh-reward-wrap {
          max-width: 52rem;
          margin: 0 auto;
          padding: 0 1.25rem 2rem;
        }
        .dh-reward-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 1.25rem;
          padding: 1.4rem 1.6rem;
          backdrop-filter: blur(16px);
        }

        /* Active reward */
        .dh-ar {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          flex-wrap: wrap;
        }
        .dh-ar-icon { font-size: 1.75rem; flex-shrink: 0; }
        .dh-ar-body { flex: 1; min-width: 0; }
        .dh-ar-title {
          font-family: 'Syne', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          color: #34d399;
          margin: 0;
        }
        .dh-ar-sub {
          font-size: 0.7rem;
          color: #475569;
          margin: 0.12rem 0 0;
        }
        .dh-ar-btn {
          flex-shrink: 0;
          padding: 0.5rem 1.35rem;
          border-radius: 99px;
          background: linear-gradient(135deg, #059669, #10b981);
          color: #fff;
          font-size: 0.78rem;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(16,185,129,0.22);
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .dh-ar-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,0.35); }

        /* Claim section */
        .dh-claim-top {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .dh-claim-icon { font-size: 1.5rem; flex-shrink: 0; }
        .dh-claim-title {
          font-family: 'Syne', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
        }
        .dh-claim-sub {
          font-size: 0.7rem;
          color: #475569;
          margin: 0.1rem 0 0;
        }
        .dh-claim-btn {
          margin-left: auto;
          padding: 0.48rem 1.2rem;
          border: none;
          border-radius: 99px;
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          color: #fff;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(124,58,237,0.28);
          transition: transform 0.25s, box-shadow 0.25s;
          white-space: nowrap;
        }
        .dh-claim-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.4); }
        .dh-claim-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        /* Progress bar */
        .dh-bar {
          height: 5px;
          border-radius: 99px;
          background: rgba(255,255,255,0.05);
          overflow: hidden;
          margin-bottom: 0.35rem;
        }
        .dh-bar-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, #7c3aed, #a78bfa, #f9a8d4);
          transition: width 0.8s cubic-bezier(0.34,1.56,0.64,1);
          min-width: 5px;
        }
        .dh-bar-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.66rem;
          color: #475569;
          font-weight: 500;
        }
        .dh-bar-mid { color: #a78bfa; font-weight: 600; }
        .dh-msg {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 0.8rem;
          font-weight: 700;
          color: #34d399;
          text-align: center;
        }

        /* ── SECTIONS ── */
        .dh-section {
          max-width: 72rem;
          margin: 0 auto;
          padding: 2.75rem 1.25rem;
        }
        .dh-sec-eyebrow {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #7c3aed;
          margin-bottom: 0.4rem;
        }
        .dh-sec-h2 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(1.45rem, 3vw, 2.1rem);
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 1.75rem;
          letter-spacing: -0.015em;
        }

        /* ── STORE SLIDER ── */
        .dh-slider-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .dh-arr {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.04);
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.22s ease;
        }
        .dh-arr:hover {
          border-color: rgba(167,139,250,0.45);
          background: rgba(124,58,237,0.12);
          color: #a78bfa;
          transform: scale(1.05);
        }
        .dh-slider-track {
          flex: 1;
          overflow: hidden;
          border-radius: 1.25rem;
        }
        .dh-slider-inner {
          display: flex;
          transition: transform 0.45s cubic-bezier(0.23,1,0.32,1);
          will-change: transform;
        }
        .dh-slide {
          flex: 0 0 100%;
          min-width: 0;
          padding: 0 0.2rem;
          box-sizing: border-box;
        }

        /* Store card */
        .dh-sc {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          position: relative;
          height: 300px;
          border-radius: 1.25rem;
          overflow: hidden;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.07);
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }
        .dh-sc:hover {
          transform: translateY(-4px);
          box-shadow: 0 28px 56px rgba(0,0,0,0.45);
        }
        .dh-sc-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }
        .dh-sc-grad {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .dh-sc-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 55%, transparent 100%);
        }
        .dh-sc-body {
          position: relative;
          z-index: 2;
          padding: 1.6rem 1.8rem;
          display: flex;
          flex-direction: column;
          gap: 0.28rem;
          transition: transform 0.3s ease;
        }
        .dh-sc:hover .dh-sc-body { transform: translateY(-5px); }
        .dh-sc-emoji {
          font-size: 2.1rem;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
          transition: transform 0.4s ease;
        }
        .dh-sc:hover .dh-sc-emoji { transform: scale(1.15) rotate(-4deg); }
        .dh-sc-name {
          font-family: 'Syne', sans-serif;
          font-size: 1.6rem;
          font-weight: 700;
          margin: 0;
          color: #fff;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 10px rgba(0,0,0,0.45);
        }
        .dh-sc-desc {
          font-size: 0.8rem;
          margin: 0;
          color: rgba(255,255,255,0.68);
          font-weight: 300;
          line-height: 1.55;
        }
        .dh-sc-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.6rem;
          padding: 0.45rem 1.05rem;
          border-radius: 99px;
          background: rgba(255,255,255,0.13);
          border: 1px solid rgba(255,255,255,0.22);
          color: #fff;
          font-size: 0.73rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          backdrop-filter: blur(8px);
          width: fit-content;
          transition: background 0.25s, border-color 0.25s;
        }
        .dh-sc:hover .dh-sc-cta {
          background: rgba(255,255,255,0.22);
          border-color: rgba(255,255,255,0.38);
        }

        /* Dots */
        .dh-dots {
          display: flex;
          justify-content: center;
          gap: 0.4rem;
          margin-top: 1.1rem;
        }
        .dh-dot {
          width: 6px;
          height: 6px;
          border-radius: 99px;
          border: none;
          background: rgba(255,255,255,0.13);
          cursor: pointer;
          transition: all 0.28s ease;
          padding: 0;
        }
        .dh-dot--on {
          background: #a78bfa;
          width: 22px;
        }
        .dh-dot:hover:not(.dh-dot--on) { background: rgba(255,255,255,0.28); }

        /* ── Sign-in gate ── */
        .dh-gate {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.85rem 1.2rem;
          border-radius: 0.875rem;
          background: rgba(251,191,36,0.05);
          border: 1px solid rgba(251,191,36,0.14);
          color: #b45309;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 1.5rem;
        }
        .dh-gate-link { color: #a78bfa; font-weight: 700; text-decoration: underline; }

        /* ── GAMES GRID ── */
        .dh-games-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .dh-gc {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 1.5rem 1.25rem 1.25rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.025);
          cursor: pointer;
          text-align: left;
          overflow: hidden;
          color: #f1f5f9;
          transition: transform 0.32s cubic-bezier(0.23,1,0.32,1), box-shadow 0.32s ease, border-color 0.22s;
        }
        .dh-gc:hover {
          transform: translateY(-5px);
          border-color: var(--ga);
          box-shadow: 0 20px 40px var(--gs);
        }
        /* subtle glow bg on hover */
        .dh-gc::before {
          content: '';
          position: absolute;
          top: -30%;
          left: -10%;
          width: 60%;
          height: 60%;
          border-radius: 50%;
          background: radial-gradient(circle, var(--gg, #7c3aed), transparent 70%);
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
          filter: blur(24px);
        }
        .dh-gc:hover::before { opacity: 0.18; }

        .dh-gc-num {
          position: absolute;
          top: 1rem;
          right: 1rem;
          font-family: 'Syne', sans-serif;
          font-size: 0.68rem;
          font-weight: 700;
          color: rgba(255,255,255,0.12);
          letter-spacing: 0.04em;
        }
        .dh-gc-emoji {
          font-size: 2.4rem;
          margin-bottom: 0.8rem;
          transition: transform 0.38s ease;
          display: block;
        }
        .dh-gc:hover .dh-gc-emoji { transform: scale(1.18) rotate(-6deg); }
        .dh-gc-name {
          font-family: 'Syne', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 0.35rem;
          line-height: 1.25;
          letter-spacing: -0.01em;
        }
        .dh-gc-desc {
          font-size: 0.73rem;
          color: #475569;
          margin: 0 0 0.75rem;
          line-height: 1.6;
          flex: 1;
        }
        .dh-gc-pts {
          display: inline-block;
          font-size: 0.66rem;
          font-weight: 700;
          color: #a78bfa;
          background: rgba(124,58,237,0.1);
          border: 1px solid rgba(167,139,250,0.2);
          border-radius: 99px;
          padding: 0.16rem 0.6rem;
          margin-bottom: 0.7rem;
          letter-spacing: 0.02em;
        }
        .dh-gc-play {
          display: inline-flex;
          align-items: center;
          gap: 0.38rem;
          font-size: 0.73rem;
          font-weight: 600;
          color: #475569;
          margin-top: auto;
          transition: color 0.22s;
        }
        .dh-gc:hover .dh-gc-play { color: #f1f5f9; }
        .dh-gc-play svg { transition: transform 0.22s; }
        .dh-gc:hover .dh-gc-play svg { transform: translateX(3px); }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .dh-games-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .dh-hero { padding: 3.5rem 1rem 2.5rem; }
          .dh-stats-row { gap: 1rem; padding: 0.75rem 1.25rem; }
          .dh-stat-val { font-size: 1.15rem; }
          .dh-arr { width: 34px; height: 34px; }
          .dh-sc { height: 250px; }
          .dh-sc-name { font-size: 1.25rem; }
          .dh-games-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
          .dh-gc { padding: 1.25rem 1rem 1rem; }
          .dh-gc-emoji { font-size: 2rem; }
        }
        @media (max-width: 380px) {
          .dh-h1 { font-size: 2rem; }
          .dh-stats-row { flex-wrap: wrap; justify-content: center; }
          .dh-stat-sep { display: none; }
        }
      `}</style>
    </div>
  );
}
