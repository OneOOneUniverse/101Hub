"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import type { DealsHubContent, Product, SpinWheelSlice } from "@/lib/site-content-types";
import SpinWheel from "@/components/SpinWheel";
import ScratchCard from "@/components/ScratchCard";
import DailyTrivia from "@/components/DailyTrivia";

type Props = {
  dealsHub: DealsHubContent;
  products: Product[];
};

export default function DealsHubClient({ dealsHub, products }: Props) {
  const { isSignedIn } = useUser();
  const [points, setPoints] = useState(0);
  const [prizeMessage, setPrizeMessage] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState("");

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/deals/points")
      .then((r) => r.json())
      .then((d: { balance?: number }) => setPoints(d.balance ?? 0))
      .catch(() => {});
  }, [isSignedIn]);

  const refreshPoints = useCallback(() => {
    fetch("/api/deals/points")
      .then((r) => r.json())
      .then((d: { balance?: number }) => setPoints(d.balance ?? 0))
      .catch(() => {});
  }, []);

  const handlePrize = useCallback((prize: SpinWheelSlice) => {
    if (prize.type === "no_prize") {
      setPrizeMessage("No luck this time! Try again later.");
    } else if (prize.type === "points") {
      setPrizeMessage(`🎉 You won ${prize.value} points!`);
      refreshPoints();
    } else {
      setPrizeMessage(`🎉 You won: ${prize.label}! Check your prizes in your profile.`);
    }
    setTimeout(() => setPrizeMessage(""), 5000);
  }, [refreshPoints]);

  const handleRedeem = useCallback(async () => {
    if (redeeming) return;
    setRedeeming(true);
    setRedeemMsg("");
    try {
      const res = await fetch("/api/deals/redeem", { method: "POST" });
      const data = (await res.json()) as { discountCedis?: number; pointsUsed?: number; remainingBalance?: number; error?: string };
      if (!res.ok) {
        setRedeemMsg(data.error ?? "Failed to redeem");
      } else {
        setRedeemMsg(`✅ Redeemed GHS ${data.discountCedis} discount! Use it at checkout.`);
        refreshPoints();
      }
    } catch {
      setRedeemMsg("Network error — try again");
    } finally {
      setRedeeming(false);
      setTimeout(() => setRedeemMsg(""), 6000);
    }
  }, [redeeming, refreshPoints]);

  const enabledStores = dealsHub.specialStores.filter((s) => s.enabled);
  const hasGames = dealsHub.spinWheel.enabled || dealsHub.scratchCard.enabled || dealsHub.trivia.enabled;
  const minRedeem = dealsHub.minRedeemPoints || 0;
  const canRedeem = minRedeem > 0 ? points >= minRedeem : points >= dealsHub.pointsPerCedi;
  const progressPct = minRedeem > 0 ? Math.min(100, Math.round((points / minRedeem) * 100)) : 100;

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
      {isSignedIn && minRedeem > 0 && (
        <section className="deals-redeem">
          <div className="deals-redeem-inner">
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
                {redeeming ? "Redeeming..." : `Redeem GHS ${Math.floor(points / dealsHub.pointsPerCedi)} Discount`}
              </button>
            ) : (
              <p className="deals-redeem-hint">
                {minRedeem - points} more points to go!
              </p>
            )}
            {redeemMsg && <p className="deals-redeem-msg">{redeemMsg}</p>}
          </div>
        </section>
      )}

      {/* Prize notification */}
      {prizeMessage && (
        <div className="deals-prize-toast">
          <div className="deals-prize-toast-inner">{prizeMessage}</div>
        </div>
      )}

      {/* ─── STORES SECTION ─── */}
      {enabledStores.length > 0 && (
        <section className="deals-section">
          <h2 className="deals-section-heading">
            <span className="deals-section-icon">🏪</span> Special Stores
          </h2>
          <div className="deals-stores-grid">
            {enabledStores.map((store) => {
              const hasImg = !!store.backgroundImage;
              return (
                <Link key={store.id} href={`/deals/store/${store.slug}`} className="deals-card group/card">
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
              );
            })}
          </div>
        </section>
      )}

      {/* ─── GAMES SECTIONS (each game in its own section) ─── */}
      {hasGames && !isSignedIn && (
        <section className="deals-section">
          <div className="deals-login-prompt">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <p><Link href="/login" className="deals-login-link">Sign in</Link> to play games and earn points!</p>
          </div>
        </section>
      )}

      {dealsHub.spinWheel.enabled && (
        <section className="deals-section">
          <h2 className="deals-section-heading">
            <span className="deals-section-icon">🎡</span> {dealsHub.spinWheel.title}
          </h2>
          <p className="deals-section-desc">{dealsHub.spinWheel.description}</p>
          <div className="deals-game-card">
            <div className="deals-game-body">
              <SpinWheel slices={dealsHub.spinWheel.slices} onResult={handlePrize} disabled={!isSignedIn} />
            </div>
          </div>
        </section>
      )}

      {dealsHub.scratchCard.enabled && (
        <section className="deals-section">
          <h2 className="deals-section-heading">
            <span className="deals-section-icon">🎟️</span> {dealsHub.scratchCard.title}
          </h2>
          <p className="deals-section-desc">{dealsHub.scratchCard.description}</p>
          <div className="deals-game-card deals-game-card--scratch">
            <div className="deals-game-body">
              <ScratchCard onResult={handlePrize} disabled={!isSignedIn} />
            </div>
          </div>
        </section>
      )}

      {dealsHub.trivia.enabled && dealsHub.trivia.questions.length > 0 && (
        <section className="deals-section">
          <h2 className="deals-section-heading">
            <span className="deals-section-icon">🧠</span> {dealsHub.trivia.title}
          </h2>
          <p className="deals-section-desc">{dealsHub.trivia.description}</p>
          <div className="deals-game-card">
            <div className="deals-game-body">
              {isSignedIn ? (
                <DailyTrivia questions={dealsHub.trivia.questions} />
              ) : (
                <p className="text-center text-sm opacity-60">Sign in to play trivia</p>
              )}
            </div>
          </div>
        </section>
      )}

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

        /* ── Store cards (dealcc.jsx inspired) ── */
        .deals-stores-grid {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }

        .deals-card {
          position: relative;
          height: 18em;
          border: 2px solid rgba(75, 30, 133, 0.5);
          border-radius: 0.35em;
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
          border-radius: 0.35em;
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

        /* ── Game cards ── */
        .deals-games {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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

        .deals-game-card {
          position: relative;
          border: 2px solid rgba(75,30,133,0.3);
          border-radius: 1rem;
          overflow: hidden;
          background: linear-gradient(145deg, rgba(75,30,133,0.04), rgba(124,58,237,0.02));
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
          transition: all 0.5s ease;
        }

        .deals-game-card:hover {
          box-shadow: 0 12px 30px rgba(124,58,237,0.15);
          border-color: rgba(124,58,237,0.4);
        }

        .deals-game-body {
          display: flex;
          justify-content: center;
          padding: 2rem 1.5rem;
        }

        /* Scratch card dark variant */
        .deals-game-card--scratch {
          background: linear-gradient(145deg, #1e1e2e, #2a2a3d);
          border-color: rgba(124, 58, 237, 0.25);
        }

        @media (max-width: 640px) {
          .deals-hero {
            padding: 2rem 1rem 1.5rem;
          }
          .deals-stores-grid {
            grid-template-columns: 1fr 1fr;
          }
          .deals-card {
            height: 15em;
          }
          .deals-card-emoji { font-size: 2rem; }
          .deals-card-name { font-size: 1.15em; }
          .deals-game-body {
            padding: 1.5rem 1rem;
          }
        }

        @media (max-width: 380px) {
          .deals-stores-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
