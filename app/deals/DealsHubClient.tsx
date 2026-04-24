"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import type { DealsHubContent, Product } from "@/lib/site-content-types";

type Props = {
  dealsHub: DealsHubContent;
  products: Product[];
};

export default function DealsHubClient({ dealsHub, products }: Props) {
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
  const hasGames = dealsHub.spinWheel.enabled || dealsHub.scratchCard.enabled || dealsHub.trivia.enabled;
  const minRedeem = dealsHub.minRedeemPoints || 0;
  const canRedeem = !activeReward && (minRedeem > 0 ? points >= minRedeem : points >= dealsHub.pointsPerCedi);
  const progressPct = minRedeem > 0 ? Math.min(100, Math.round((points / minRedeem) * 100)) : 100;

  // ── Store slider state ──
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

  return (
    <div className="deals-hub">
      {/* Starry background — inspired by part.jsx */}
      <div className="deals-stars" />
      <div className="deals-stars deals-stars--med" />
      <div className="deals-stars deals-stars--lg" />

      {/* Hero */}
      <section className="deals-hero">
        <div className="deals-hero-glow" />
        <div className="deals-hero-content">
          <span className="deals-badge">✨ Exclusive Access</span>
          <h1 className="deals-title">{dealsHub.title}</h1>
          <p className="deals-subtitle">{dealsHub.description}</p>

          {isSignedIn && (
            <div className="deals-points-pill">
              <div className="deals-points-icon">
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 6v12M8 10h8M8 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="deals-points-info">
                <span className="deals-points-num">{points.toLocaleString()}</span>
                <span className="deals-points-label">points</span>
              </div>
              {points >= dealsHub.pointsPerCedi && (
                <span className="deals-points-equiv">
                  = GHS {Math.floor(points / dealsHub.pointsPerCedi)} off
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Reward Claim Section */}
      {isSignedIn && (
        <section className="deals-redeem">
          <div className="deals-redeem-inner">
            {/* Active reward banner — claimed but not yet used */}
            {activeReward && (
              <div className="deals-active-reward">
                <div className="deals-active-icon">✨</div>
                <div className="deals-active-info">
                  <p className="deals-active-title">{activeReward.label}</p>
                  <p className="deals-active-hint">Apply this discount at checkout</p>
                </div>
                <Link href="/cart" className="deals-active-btn">Use Now →</Link>
              </div>
            )}

            {/* Claim section — only if no active reward */}
            {!activeReward && minRedeem > 0 && (
              <>
                <h2 className="deals-redeem-title">🎁 Claim Your Rewards</h2>
                <p className="deals-redeem-desc">
                  Earn <strong>{minRedeem.toLocaleString()}</strong> points to unlock a discount you can use at checkout.
                </p>
                <div className="deals-progress-bar">
                  <div className="deals-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="deals-progress-labels">
                  <span>{points.toLocaleString()} pts</span>
                  <span>{minRedeem.toLocaleString()} pts</span>
                </div>
                {canRedeem ? (
                  <button onClick={handleRedeem} disabled={redeeming} className="deals-redeem-btn">
                    {redeeming ? "Claiming..." : `Claim GHS ${Math.floor(points / dealsHub.pointsPerCedi)} Discount`}
                  </button>
                ) : (
                  <p className="deals-redeem-hint">
                    {minRedeem - points} more points to go!
                  </p>
                )}
              </>
            )}
            {redeemMsg && <p className="deals-redeem-msg">{redeemMsg}</p>}
          </div>
        </section>
      )}

      {/* ─── STORES SLIDER ─── */}
      {enabledStores.length > 0 && (
        <section className="deals-section">
          <h2 className="deals-section-heading">
            <span className="deals-section-icon">🏪</span> Special Stores
          </h2>

          <div className="deals-slider-wrapper">
            {/* Prev arrow */}
            {enabledStores.length > 1 && (
              <button className="deals-slider-arrow deals-slider-arrow--prev" onClick={prevStore} aria-label="Previous store">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
              </button>
            )}

            <div
              className="deals-slider-track"
              ref={sliderRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="deals-slider-slides"
                style={{ transform: `translateX(-${storeSlide * 100}%)` }}
              >
                {enabledStores.map((store) => {
                  const hasImg = !!store.backgroundImage;
                  return (
                    <div key={store.id} className="deals-slider-slide">
                      <Link href={`/deals/store/${store.slug}`} className="deals-card group/card">
                        {hasImg ? (
                          <img src={store.backgroundImage} alt="" className="deals-card-img" />
                        ) : null}
                        <div
                          className="deals-card-gradient"
                          style={{ background: `linear-gradient(135deg, ${store.bgColor}, ${store.bgColor}cc)` }}
                        />
                        <div className="deals-card-hover-overlay" />
                        <div className="deals-card-pulse" />
                        <div className="deals-card-dots">
                          <span /><span /><span />
                        </div>
                        <div className="deals-card-body" style={{ color: store.textColor }}>
                          <span className="deals-card-emoji">{store.emoji}</span>
                          <h3 className="deals-card-name">{store.name}</h3>
                          <p className="deals-card-desc">{store.description}</p>
                          <span className="deals-card-btn">
                            <span className="deals-card-btn-sweep" />
                            <span className="deals-card-btn-text">Explore Now</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="deals-card-btn-arrow"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                          </span>
                        </div>
                        <div className="deals-card-shine" />
                        <div className="deals-card-orb" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next arrow */}
            {enabledStores.length > 1 && (
              <button className="deals-slider-arrow deals-slider-arrow--next" onClick={nextStore} aria-label="Next store">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </button>
            )}
          </div>

          {/* Dot indicators */}
          {enabledStores.length > 1 && (
            <div className="deals-slider-dots">
              {enabledStores.map((store, i) => (
                <button
                  key={store.id}
                  className={`deals-slider-dot${i === storeSlide ? " deals-slider-dot--active" : ""}`}
                  onClick={() => setStoreSlide(i)}
                  aria-label={`Go to ${store.name}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── GAMES SECTIONS ─── */}
      {!isSignedIn && (
        <section className="deals-section">
          <div className="deals-login-prompt">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <p><Link href="/login" className="deals-login-link">Sign in</Link> to play games and earn points!</p>
          </div>
        </section>
      )}

      {
        <section className="deals-section">
          <h2 className="deals-section-heading">
            <span className="deals-section-icon">🎮</span> Games &amp; Rewards
          </h2>
          <div className="deals-games-grid">
            {dealsHub.spinWheel.enabled && (
              <button className="gcard" onClick={() => router.push("/deals/play/spin")}>
                <div className="gcard-glow" />
                <div className="gcard-icon">🎡</div>
                <h3 className="gcard-name">{dealsHub.spinWheel.title}</h3>
                <p className="gcard-desc">{dealsHub.spinWheel.description}</p>
                <span className="gcard-cta">
                  <span className="gcard-cta-sweep" />
                  <span className="gcard-cta-text">Play Now</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                </span>
              </button>
            )}
            {dealsHub.scratchCard.enabled && (
              <button className="gcard gcard--dark" onClick={() => router.push("/deals/play/scratch")}>
                <div className="gcard-glow gcard-glow--purple" />
                <div className="gcard-icon">🎟️</div>
                <h3 className="gcard-name">{dealsHub.scratchCard.title}</h3>
                <p className="gcard-desc">{dealsHub.scratchCard.description}</p>
                <span className="gcard-cta">
                  <span className="gcard-cta-sweep" />
                  <span className="gcard-cta-text">Play Now</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                </span>
              </button>
            )}
            {dealsHub.trivia.enabled && dealsHub.trivia.questions.length > 0 && (
              <button className="gcard" onClick={() => router.push("/deals/play/trivia")}>
                <div className="gcard-glow" />
                <div className="gcard-icon">🧠</div>
                <h3 className="gcard-name">{dealsHub.trivia.title}</h3>
                <p className="gcard-desc">{dealsHub.trivia.description}</p>
                <span className="gcard-cta">
                  <span className="gcard-cta-sweep" />
                  <span className="gcard-cta-text">Play Now</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                </span>
              </button>
            )}
            {/* ── Bonus Mini-Games ── */}
            {(dealsHub.memoryMatch?.enabled ?? true) && (
              <button className="gcard gcard--dark" onClick={() => router.push("/deals/play/memory")}>
                <div className="gcard-glow gcard-glow--pink" />
                <div className="gcard-icon">🃏</div>
                <h3 className="gcard-name">{dealsHub.memoryMatch?.title ?? "Memory Match"}</h3>
                <p className="gcard-desc">{dealsHub.memoryMatch?.description ?? "Flip cards and match all pairs to win points!"}</p>
                <div className="gcard-badge">+{dealsHub.memoryMatch?.pointsReward ?? 75} pts</div>
                <span className="gcard-cta">
                  <span className="gcard-cta-sweep" />
                  <span className="gcard-cta-text">Play Now</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                </span>
              </button>
            )}
            {(dealsHub.luckyNumber?.enabled ?? true) && (
              <button className="gcard" onClick={() => router.push("/deals/play/lucky")}>
                <div className="gcard-glow" />
                <div className="gcard-icon">🎲</div>
                <h3 className="gcard-name">{dealsHub.luckyNumber?.title ?? "Lucky Number"}</h3>
                <p className="gcard-desc">{dealsHub.luckyNumber?.description ?? "Guess the secret number to win points!"}</p>
                <div className="gcard-badge">+{dealsHub.luckyNumber?.pointsReward ?? 50} pts</div>
                <span className="gcard-cta">
                  <span className="gcard-cta-sweep" />
                  <span className="gcard-cta-text">Play Now</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                </span>
              </button>
            )}
            {(dealsHub.wordScramble?.enabled ?? true) && (
              <button className="gcard gcard--dark" onClick={() => router.push("/deals/play/scramble")}>
                <div className="gcard-glow gcard-glow--purple" />
                <div className="gcard-icon">🔤</div>
                <h3 className="gcard-name">{dealsHub.wordScramble?.title ?? "Word Scramble"}</h3>
                <p className="gcard-desc">{dealsHub.wordScramble?.description ?? "Unscramble the mystery word to win points!"}</p>
                <div className="gcard-badge">+{dealsHub.wordScramble?.pointsReward ?? 60} pts</div>
                <span className="gcard-cta">
                  <span className="gcard-cta-sweep" />
                  <span className="gcard-cta-text">Play Now</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                </span>
              </button>
            )}
          </div>
        </section>
      }

      {/* ─── STYLES ─── */}
      <style jsx>{`
        .deals-hub {
          position: relative;
          min-height: 100vh;
        }

        /* ── Starry background (part.jsx inspired) ── */
        .deals-stars {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background: radial-gradient(ellipse at bottom, rgba(75,30,133,0.06) 0%, transparent 70%);
        }
        .deals-stars::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1px 1px at 50px 120px, rgba(124,58,237,0.35), transparent),
            radial-gradient(1px 1px at 200px 80px, rgba(124,58,237,0.25), transparent),
            radial-gradient(1px 1px at 400px 200px, rgba(167,139,250,0.3), transparent),
            radial-gradient(1px 1px at 600px 50px, rgba(124,58,237,0.2), transparent),
            radial-gradient(1px 1px at 150px 300px, rgba(167,139,250,0.35), transparent),
            radial-gradient(1px 1px at 350px 350px, rgba(124,58,237,0.2), transparent),
            radial-gradient(1px 1px at 500px 150px, rgba(167,139,250,0.25), transparent),
            radial-gradient(1px 1px at 700px 300px, rgba(124,58,237,0.3), transparent),
            radial-gradient(1px 1px at 100px 500px, rgba(167,139,250,0.2), transparent),
            radial-gradient(1px 1px at 300px 450px, rgba(124,58,237,0.25), transparent),
            radial-gradient(1px 1px at 550px 400px, rgba(167,139,250,0.3), transparent),
            radial-gradient(1px 1px at 750px 100px, rgba(124,58,237,0.2), transparent);
          background-size: 800px 600px;
          animation: deals-twinkle 80s linear infinite;
        }
        .deals-stars--med::after {
          background-size: 900px 700px;
          animation-duration: 120s;
          opacity: 0.6;
        }
        .deals-stars--lg::after {
          background-size: 1100px 800px;
          animation-duration: 160s;
          opacity: 0.4;
        }
        @keyframes deals-twinkle {
          0% { transform: translateY(0); }
          100% { transform: translateY(-600px); }
        }

        /* Hero */
        .deals-hero {
          position: relative;
          z-index: 1;
          padding: 3rem 1.5rem 2.5rem;
          text-align: center;
          overflow: hidden;
        }

        .deals-hero-glow {
          position: absolute;
          top: -60%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(124, 58, 237, 0.15), transparent 70%);
          pointer-events: none;
        }

        .deals-hero-content {
          position: relative;
          z-index: 1;
          max-width: 560px;
          margin: 0 auto;
        }

        .deals-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7c3aed;
          border: 1px solid rgba(124, 58, 237, 0.3);
          padding: 0.35em 1em;
          border-radius: 99px;
          margin-bottom: 1rem;
          background: rgba(124, 58, 237, 0.06);
        }

        .deals-title {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 900;
          line-height: 1.1;
          background: linear-gradient(135deg, var(--brand-deep, #1a1a2e) 0%, #7c3aed 50%, var(--brand, #6366f1) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }

        .deals-subtitle {
          color: var(--ink-soft, #64748b);
          font-size: 0.95rem;
          margin-bottom: 1.5rem;
        }

        /* Points pill */
        .deals-points-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          background: linear-gradient(135deg, #1e1e2e, #2b2b3d);
          color: #f1f5f9;
          padding: 0.6rem 1.2rem;
          border-radius: 99px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .deals-points-icon {
          color: #a78bfa;
          display: flex;
          animation: deals-coin-glow 2s ease-in-out infinite alternate;
        }

        @keyframes deals-coin-glow {
          0% { filter: drop-shadow(0 0 2px #7c3aed); }
          100% { filter: drop-shadow(0 0 8px #a78bfa); }
        }

        .deals-points-info {
          display: flex;
          align-items: baseline;
          gap: 0.3rem;
        }

        .deals-points-num {
          font-size: 1.2rem;
          font-weight: 900;
          color: #fff;
        }

        .deals-points-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
        }

        .deals-points-equiv {
          font-size: 0.7rem;
          color: #a78bfa;
          font-weight: 600;
          padding-left: 0.5rem;
          border-left: 1px solid rgba(255,255,255,0.1);
        }

        /* Prize toast */
        .deals-prize-toast {
          position: fixed;
          top: 5rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          animation: deals-toast-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .deals-prize-toast-inner {
          background: linear-gradient(135deg, #065f46, #047857);
          color: #fff;
          font-weight: 700;
          padding: 0.8rem 1.5rem;
          border-radius: 999px;
          font-size: 0.9rem;
          box-shadow: 0 8px 30px rgba(0,0,0,0.25);
        }

        @keyframes deals-toast-in {
          0% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }

        /* Sections */
        .deals-section {
          position: relative;
          z-index: 1;
          max-width: 72rem;
          margin: 0 auto;
          padding: 0 1rem 2.5rem;
        }

        .deals-section-heading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.3rem;
          font-weight: 900;
          color: var(--brand-deep, #1e1b4b);
          margin-bottom: 1rem;
          padding: 0 0.25rem;
        }

        .deals-section-icon {
          font-size: 1.5rem;
        }

        .deals-section-desc {
          color: var(--ink-soft, #64748b);
          font-size: 0.85rem;
          margin-bottom: 1.25rem;
          padding: 0 0.25rem;
        }

        /* Redeem / Claim section */
        .deals-redeem {
          position: relative;
          z-index: 2;
          max-width: 36rem;
          margin: 0 auto 2rem;
          padding: 0 1rem;
        }

        .deals-redeem-inner {
          background: linear-gradient(145deg, rgba(124,58,237,0.06), rgba(99,102,241,0.04));
          border: 1.5px solid rgba(124,58,237,0.2);
          border-radius: 1rem;
          padding: 1.5rem;
          text-align: center;
        }

        .deals-redeem-title {
          font-size: 1.1rem;
          font-weight: 800;
          margin: 0 0 0.3rem;
          color: var(--brand-deep, #1e1b4b);
        }

        .deals-redeem-desc {
          font-size: 0.8rem;
          color: var(--ink-soft, #64748b);
          margin: 0 0 1rem;
        }

        .deals-progress-bar {
          height: 10px;
          border-radius: 99px;
          background: rgba(124,58,237,0.1);
          overflow: hidden;
          margin-bottom: 0.3rem;
        }

        .deals-progress-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, #7c3aed, #a78bfa);
          transition: width 0.6s ease;
          min-width: 4px;
        }

        .deals-progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--ink-soft, #94a3b8);
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .deals-redeem-btn {
          display: inline-block;
          padding: 0.6rem 1.8rem;
          border: none;
          border-radius: 99px;
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          color: #fff;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(124,58,237,0.3);
          transition: all 0.3s ease;
        }

        .deals-redeem-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(124,58,237,0.4);
        }

        .deals-redeem-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .deals-redeem-hint {
          font-size: 0.8rem;
          color: #a78bfa;
          font-weight: 700;
          margin: 0;
        }

        .deals-redeem-msg {
          margin-top: 0.8rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: #059669;
          animation: deals-toast-in 0.3s ease;
        }

        /* Active reward banner */
        .deals-active-reward {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 1rem 1.2rem;
          border-radius: 0.75rem;
          background: linear-gradient(135deg, rgba(5,150,105,0.08), rgba(16,185,129,0.05));
          border: 1.5px solid rgba(5,150,105,0.25);
        }

        .deals-active-icon {
          font-size: 1.6rem;
          flex-shrink: 0;
        }

        .deals-active-info {
          flex: 1;
          min-width: 0;
        }

        .deals-active-title {
          font-size: 0.9rem;
          font-weight: 800;
          color: #065f46;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .deals-active-hint {
          font-size: 0.72rem;
          color: #047857;
          margin: 0.1rem 0 0;
        }

        .deals-active-btn {
          flex-shrink: 0;
          padding: 0.5rem 1.2rem;
          border-radius: 99px;
          background: linear-gradient(135deg, #059669, #10b981);
          color: #fff;
          font-size: 0.78rem;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px rgba(5,150,105,0.25);
        }

        .deals-active-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(5,150,105,0.35);
        }

        /* ── Store cards (dealcc.jsx inspired) — Slider ── */
        .deals-slider-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .deals-slider-track {
          flex: 1;
          overflow: hidden;
          border-radius: 1.5rem;
        }

        .deals-slider-slides {
          display: flex;
          transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
          will-change: transform;
        }

        .deals-slider-slide {
          flex: 0 0 100%;
          min-width: 0;
          padding: 0 0.25rem;
          box-sizing: border-box;
        }

        /* Navigation arrows */
        .deals-slider-arrow {
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 2px solid rgba(75, 30, 133, 0.35);
          background: linear-gradient(135deg, rgba(75,30,133,0.08), rgba(124,58,237,0.04));
          backdrop-filter: blur(12px);
          color: #7c3aed;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 5;
        }
        .deals-slider-arrow:hover {
          background: linear-gradient(135deg, rgba(75,30,133,0.2), rgba(124,58,237,0.15));
          border-color: rgba(124,58,237,0.6);
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
          transform: scale(1.08);
          color: #a78bfa;
        }
        .deals-slider-arrow:active {
          transform: scale(0.95);
        }

        /* Dot indicators */
        .deals-slider-dots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .deals-slider-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid rgba(124, 58, 237, 0.35);
          background: transparent;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }
        .deals-slider-dot:hover {
          border-color: #7c3aed;
          background: rgba(124, 58, 237, 0.15);
        }
        .deals-slider-dot--active {
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          border-color: #7c3aed;
          box-shadow: 0 0 8px rgba(124, 58, 237, 0.4);
        }

        .deals-card {
          position: relative;
          height: 18em;
          border: 2px solid rgba(75, 30, 133, 0.5);
          border-radius: 1.5rem !important;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          overflow: hidden;
          backdrop-filter: blur(12px);
          transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .deals-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(124, 58, 237, 0.3);
        }

        /* Background image */
        .deals-card-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }

        /* Gradient overlay (over image or as sole bg) */
        .deals-card-gradient {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .deals-card:has(.deals-card-img) .deals-card-gradient {
          opacity: 0.75;
        }

        /* Hover overlay (dealcc: purple → fuchsia glow) */
        .deals-card-hover-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: linear-gradient(135deg, rgba(124,58,237,0.3), rgba(217,70,239,0.2), transparent);
          border-radius: 1.5rem;
          opacity: 0;
          transition: opacity 0.5s ease;
          pointer-events: none;
        }
        .deals-card:hover .deals-card-hover-overlay {
          opacity: 1;
        }

        /* Radial pulse glow (dealcc) */
        .deals-card-pulse {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: radial-gradient(circle at 50% 50%, rgba(120,50,190,0.1), transparent 60%);
          pointer-events: none;
          opacity: 0;
        }
        .deals-card:hover .deals-card-pulse {
          animation: deals-pulse 2s ease-in-out infinite;
        }
        @keyframes deals-pulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        /* Decorative dots (dealcc: top-right) */
        .deals-card-dots {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 5;
          display: flex;
          gap: 0.4rem;
          pointer-events: none;
        }
        .deals-card-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(216, 180, 254, 0.5);
        }
        .deals-card-dots span:nth-child(2) { opacity: 0.6; }
        .deals-card-dots span:nth-child(3) { opacity: 0.3; }

        /* Card body */
        .deals-card-body {
          position: relative;
          z-index: 4;
          padding: 1.5em;
          display: flex;
          flex-direction: column;
          gap: 0.3em;
          transition: transform 0.3s ease;
        }
        .deals-card:hover .deals-card-body {
          transform: translateY(-2px);
        }

        .deals-card-emoji {
          font-size: 2.4rem;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
          transition: transform 0.4s ease;
        }
        .deals-card:hover .deals-card-emoji {
          transform: scale(1.2) rotate(-5deg);
        }

        .deals-card-name {
          font-size: 1.5em;
          font-weight: 800;
          line-height: 1.15;
          margin: 0;
          background: linear-gradient(to right, currentColor, rgba(255,255,255,0.8));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .deals-card-desc {
          font-size: 0.82em;
          opacity: 0.85;
          line-height: 1.5;
          font-weight: 300;
          margin: 0;
        }

        /* Explore Now button (from dealcc) */
        .deals-card-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.6em;
          margin-top: 0.6em;
          padding: 0.55em 1.2em;
          border: 1px solid rgba(216,180,254,0.3);
          border-radius: 99px;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          overflow: hidden;
          position: relative;
          background: rgba(124,58,237,0.1);
          backdrop-filter: blur(12px);
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .deals-card:hover .deals-card-btn {
          border-color: rgba(216,180,254,0.5);
          box-shadow: 0 4px 15px rgba(124,58,237,0.2);
        }
        .deals-card:active .deals-card-btn {
          transform: scale(0.95);
        }

        /* Sweep effect on button (dealcc) */
        .deals-card-btn-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, rgba(124,58,237,0.4), rgba(217,70,239,0.4), rgba(124,58,237,0.4));
          transform: translateX(-100%);
          transition: transform 0.7s ease;
        }
        .deals-card:hover .deals-card-btn-sweep {
          transform: translateX(100%);
        }

        .deals-card-btn-text {
          position: relative;
          z-index: 1;
        }
        .deals-card-btn-arrow {
          position: relative;
          z-index: 1;
          transition: transform 0.3s ease;
        }
        .deals-card:hover .deals-card-btn-arrow {
          transform: translateX(3px);
        }

        /* Holographic shine sweep */
        .deals-card-shine {
          position: absolute;
          inset: 0;
          z-index: 6;
          pointer-events: none;
          border-radius: 0.35em;
          background: linear-gradient(115deg, transparent 0%, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.1) 55%, transparent 60%, transparent 100%);
          background-size: 250% 250%;
          background-position: 100% 100%;
          transition: background-position 0.6s cubic-bezier(0.23, 1, 0.32, 1);
          mix-blend-mode: overlay;
        }
        .deals-card:hover .deals-card-shine {
          background-position: 0% 0%;
        }

        /* Bottom-left glow orb (dealcc) */
        .deals-card-orb {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(167,139,250,0.2), transparent);
          filter: blur(6px);
          z-index: 3;
          pointer-events: none;
          opacity: 0;
        }
        .deals-card:hover .deals-card-orb {
          animation: deals-pulse 2s ease-in-out infinite;
        }

        /* ── Game preview cards ── */
        .deals-games-grid {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        }

        .gcard {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem 1.5rem 1.5rem;
          border: 2px solid rgba(75,30,133,0.3);
          border-radius: 0.35em;
          overflow: hidden;
          background: linear-gradient(145deg, rgba(75,30,133,0.04), rgba(124,58,237,0.02));
          backdrop-filter: blur(12px);
          cursor: pointer;
          transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
          color: var(--ink, #1e293b);
        }

        .gcard--dark {
          background: linear-gradient(145deg, #1e1e2e, #2a2a3d);
          border-color: rgba(124,58,237,0.25);
          color: #f1f5f9;
        }

        .gcard:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(124,58,237,0.25);
          border-color: rgba(124,58,237,0.5);
        }

        .gcard-glow {
          position: absolute;
          top: -40%;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%);
          pointer-events: none;
          transition: opacity 0.4s ease;
          opacity: 0;
        }
        .gcard-glow--purple {
          background: radial-gradient(circle, rgba(124,58,237,0.15), transparent 70%);
        }
        .gcard-glow--pink {
          background: radial-gradient(circle, rgba(236,72,153,0.15), transparent 70%);
        }
        .gcard-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--brand, #7c3aed);
          background: rgba(124,58,237,0.08);
          border: 1px solid rgba(124,58,237,0.2);
          border-radius: 100px;
          padding: 0.18rem 0.7rem;
          margin-bottom: 0.75rem;
          letter-spacing: 0.03em;
        }
        .gcard--dark .gcard-badge {
          color: #a78bfa;
          background: rgba(167,139,250,0.1);
          border-color: rgba(167,139,250,0.25);
        }
        .gcard:hover .gcard-glow {
          opacity: 1;
        }

        .gcard-icon {
          font-size: 3rem;
          margin-bottom: 0.6rem;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.15));
          transition: transform 0.4s ease;
        }
        .gcard:hover .gcard-icon {
          transform: scale(1.15) rotate(-5deg);
        }

        .gcard-name {
          font-size: 1.15rem;
          font-weight: 800;
          margin: 0 0 0.3rem;
          line-height: 1.2;
        }
        .gcard--dark .gcard-name {
          color: #f1f5f9;
        }

        .gcard-desc {
          font-size: 0.78rem;
          color: var(--ink-soft, #64748b);
          margin: 0 0 1rem;
          line-height: 1.5;
        }
        .gcard--dark .gcard-desc {
          color: #94a3b8;
        }

        .gcard-cta {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5em;
          padding: 0.5em 1.2em;
          border: 1px solid rgba(124,58,237,0.3);
          border-radius: 99px;
          font-size: 0.78rem;
          font-weight: 700;
          overflow: hidden;
          background: rgba(124,58,237,0.08);
          color: #7c3aed;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .gcard--dark .gcard-cta {
          color: #a78bfa;
          border-color: rgba(167,139,250,0.3);
          background: rgba(124,58,237,0.15);
        }
        .gcard:hover .gcard-cta {
          border-color: rgba(124,58,237,0.5);
          box-shadow: 0 4px 15px rgba(124,58,237,0.2);
        }
        .gcard-cta-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, rgba(124,58,237,0.3), rgba(217,70,239,0.3), rgba(124,58,237,0.3));
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }
        .gcard:hover .gcard-cta-sweep {
          transform: translateX(100%);
        }
        .gcard-cta-text {
          position: relative;
          z-index: 1;
        }
        .gcard-cta svg {
          position: relative;
          z-index: 1;
          transition: transform 0.3s ease;
        }
        .gcard:hover .gcard-cta svg {
          transform: translateX(3px);
        }

        /* ── Game modal ── */
        .gmodal-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: gmodal-fade 0.25s ease;
        }

        @keyframes gmodal-fade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .gmodal {
          position: relative;
          max-width: 520px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 1rem;
          animation: gmodal-slide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes gmodal-slide {
          0% { opacity: 0; transform: translateY(20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .gmodal-close {
          position: absolute;
          top: 0.8rem;
          right: 0.8rem;
          z-index: 10;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: none;
          background: rgba(0,0,0,0.15);
          color: var(--ink-soft, #64748b);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .gmodal-close:hover {
          background: rgba(0,0,0,0.25);
          color: #ef4444;
        }

        .gmodal-content {
          background: var(--surface, #fff);
          border-radius: 1rem;
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 25px 50px rgba(0,0,0,0.25);
        }

        .gmodal-content--dark {
          background: linear-gradient(145deg, #1e1e2e, #2a2a3d);
        }

        .gmodal-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--brand-deep, #1e1b4b);
          margin: 0;
          text-align: center;
        }
        .gmodal-title--light {
          color: #f1f5f9;
        }

        .gmodal-content--dark .gmodal-close {
          color: #94a3b8;
          background: rgba(255,255,255,0.1);
        }
        .gmodal-content--dark .gmodal-close:hover {
          background: rgba(255,255,255,0.2);
          color: #ef4444;
        }

        .deals-login-prompt {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 1rem 1.5rem;
          border-radius: 1rem;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(251, 191, 36, 0.04));
          border: 1px solid rgba(251, 191, 36, 0.2);
          color: #92400e;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .deals-login-link {
          color: #7c3aed;
          text-decoration: underline;
          font-weight: 700;
        }

        @media (max-width: 640px) {
          .deals-hero {
            padding: 2rem 1rem 1.5rem;
          }
          .deals-slider-arrow {
            width: 34px;
            height: 34px;
          }
          .deals-slider-arrow svg {
            width: 16px;
            height: 16px;
          }
          .deals-card {
            height: 15em;
          }
          .deals-card-emoji { font-size: 2rem; }
          .deals-card-name { font-size: 1.15em; }
          .deals-games-grid {
            grid-template-columns: 1fr 1fr;
          }
          .gcard {
            padding: 1.5rem 1rem 1.2rem;
          }
          .gcard-icon { font-size: 2.4rem; }
          .gmodal-content {
            padding: 1.5rem 1rem;
          }
        }

        @media (max-width: 380px) {
          .deals-slider-arrow {
            width: 30px;
            height: 30px;
          }
        }
      `}</style>
    </div>
  );
}
