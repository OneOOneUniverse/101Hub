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
  const [activeTab, setActiveTab] = useState<"stores" | "games">("stores");
  const [prizeMessage, setPrizeMessage] = useState("");

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

  const enabledStores = dealsHub.specialStores.filter((s) => s.enabled);
  const hasGames = dealsHub.spinWheel.enabled || dealsHub.scratchCard.enabled || dealsHub.trivia.enabled;

  return (
    <div className="deals-hub">
      {/* Animated grid background */}
      <div className="deals-bg" />

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

      {/* Prize notification */}
      {prizeMessage && (
        <div className="deals-prize-toast">
          <div className="deals-prize-toast-inner">{prizeMessage}</div>
        </div>
      )}

      {/* Tab bar */}
      <div className="deals-tabs">
        <button
          onClick={() => setActiveTab("stores")}
          className={`deals-tab ${activeTab === "stores" ? "deals-tab--active" : ""}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
          Stores
        </button>
        {hasGames && (
          <button
            onClick={() => setActiveTab("games")}
            className={`deals-tab ${activeTab === "games" ? "deals-tab--active" : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Games
          </button>
        )}
      </div>

      {/* ─── STORES TAB ─── */}
      {activeTab === "stores" && (
        <section className="deals-section">
          {enabledStores.length === 0 ? (
            <div className="deals-empty">
              <span className="deals-empty-icon">🏪</span>
              <p>No stores available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="deals-stores-grid">
              {enabledStores.map((store) => {
                const productCount = products.filter((p) =>
                  Array.isArray(store.featuredProductIds) && store.featuredProductIds.includes(p.id)
                ).length;
                return (
                  <Link key={store.id} href={`/deals/store/${store.slug}`} className="deals-store-card group">
                    <div
                      className="deals-store-card-bg"
                      style={{ background: `linear-gradient(135deg, ${store.bgColor}, ${store.bgColor}dd)` }}
                    />
                    <div className="deals-store-card-content" style={{ color: store.textColor }}>
                      <span className="deals-store-emoji">{store.emoji}</span>
                      <h3 className="deals-store-name">{store.name}</h3>
                      <p className="deals-store-desc">{store.description}</p>
                      <span className="deals-store-count">
                        {productCount} item{productCount !== 1 ? "s" : ""}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </span>
                    </div>
                    <div className="deals-store-shine" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ─── GAMES TAB ─── */}
      {activeTab === "games" && (
        <section className="deals-section deals-games">
          {!isSignedIn && (
            <div className="deals-login-prompt">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <p><Link href="/login" className="deals-login-link">Sign in</Link> to play games and earn points!</p>
            </div>
          )}

          {dealsHub.spinWheel.enabled && (
            <div className="deals-game-card">
              <div className="deals-game-header">
                <div className="deals-game-icon">🎡</div>
                <div>
                  <h2 className="deals-game-title">{dealsHub.spinWheel.title}</h2>
                  <p className="deals-game-desc">{dealsHub.spinWheel.description}</p>
                </div>
              </div>
              <div className="deals-game-body">
                <SpinWheel slices={dealsHub.spinWheel.slices} onResult={handlePrize} disabled={!isSignedIn} />
              </div>
            </div>
          )}

          {dealsHub.scratchCard.enabled && (
            <div className="deals-game-card deals-game-card--scratch">
              <div className="deals-game-header">
                <div className="deals-game-icon">🎟️</div>
                <div>
                  <h2 className="deals-game-title">{dealsHub.scratchCard.title}</h2>
                  <p className="deals-game-desc">{dealsHub.scratchCard.description}</p>
                </div>
              </div>
              <div className="deals-game-body">
                <ScratchCard onResult={handlePrize} disabled={!isSignedIn} />
              </div>
            </div>
          )}

          {dealsHub.trivia.enabled && dealsHub.trivia.questions.length > 0 && (
            <div className="deals-game-card">
              <div className="deals-game-header">
                <div className="deals-game-icon">🧠</div>
                <div>
                  <h2 className="deals-game-title">{dealsHub.trivia.title}</h2>
                  <p className="deals-game-desc">{dealsHub.trivia.description}</p>
                </div>
              </div>
              <div className="deals-game-body">
                {isSignedIn ? (
                  <DailyTrivia questions={dealsHub.trivia.questions} />
                ) : (
                  <p className="text-center text-sm opacity-60">Sign in to play trivia</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── STYLES ─── */}
      <style jsx>{`
        .deals-hub {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
        }

        /* Animated grid background */
        .deals-bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          background-image:
            linear-gradient(rgba(124, 58, 237, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 58, 237, 0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: deals-grid-scroll 25s linear infinite;
        }

        @keyframes deals-grid-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }

        /* Hero */
        .deals-hero {
          position: relative;
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

        /* Tabs */
        .deals-tabs {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          padding: 0 1rem;
          margin-bottom: 2rem;
        }

        .deals-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 1.4rem;
          font-size: 0.85rem;
          font-weight: 700;
          border-radius: 99px;
          border: 1.5px solid rgba(124, 58, 237, 0.2);
          background: transparent;
          color: var(--ink-soft, #64748b);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .deals-tab:hover {
          border-color: #7c3aed;
          color: #7c3aed;
          background: rgba(124, 58, 237, 0.05);
        }

        .deals-tab--active {
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
        }

        .deals-tab--active:hover {
          color: #fff;
          background: linear-gradient(135deg, #6d28d9, #4f46e5);
        }

        /* Sections */
        .deals-section {
          max-width: 72rem;
          margin: 0 auto;
          padding: 0 1rem 3rem;
        }

        .deals-empty {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--ink-soft, #64748b);
        }

        .deals-empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 0.8rem;
        }

        /* Store cards */
        .deals-stores-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        }

        .deals-store-card {
          position: relative;
          border-radius: 1.25rem;
          overflow: hidden;
          text-decoration: none;
          height: 220px;
          display: flex;
          perspective: 800px;
          transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease;
        }

        .deals-store-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }

        .deals-store-card-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .deals-store-card-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 1.5rem;
          width: 100%;
        }

        .deals-store-emoji {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));
          transition: transform 0.4s ease;
        }

        .deals-store-card:hover .deals-store-emoji {
          transform: scale(1.2) rotate(-5deg);
        }

        .deals-store-name {
          font-size: 1.2rem;
          font-weight: 900;
          margin: 0;
          line-height: 1.2;
        }

        .deals-store-desc {
          font-size: 0.75rem;
          opacity: 0.8;
          margin: 0.3rem 0 0.6rem;
        }

        .deals-store-count {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          opacity: 0.7;
        }

        /* Holographic shine effect */
        .deals-store-shine {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          background: linear-gradient(
            115deg,
            transparent 0%,
            transparent 40%,
            rgba(255,255,255,0.12) 45%,
            rgba(255,255,255,0.25) 50%,
            rgba(255,255,255,0.12) 55%,
            transparent 60%,
            transparent 100%
          );
          background-size: 250% 250%;
          background-position: 100% 100%;
          transition: background-position 0.6s cubic-bezier(0.23, 1, 0.32, 1);
          mix-blend-mode: overlay;
        }

        .deals-store-card:hover .deals-store-shine {
          background-position: 0% 0%;
        }

        /* Game cards */
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
          background: linear-gradient(145deg, #fafafa, #ffffff);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
          transition: box-shadow 0.3s ease;
        }

        .deals-game-card:hover {
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
        }

        .deals-game-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }

        .deals-game-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .deals-game-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--brand-deep, #1e1b4b);
          margin: 0;
        }

        .deals-game-desc {
          font-size: 0.78rem;
          color: var(--ink-soft, #64748b);
          margin: 0.15rem 0 0;
        }

        .deals-game-body {
          display: flex;
          justify-content: center;
          padding: 2rem 1.5rem;
        }

        /* Scratch card special treatment: dark ticket background */
        .deals-game-card--scratch {
          background: linear-gradient(145deg, #1e1e2e, #2a2a3d);
          border-color: rgba(124, 58, 237, 0.15);
        }

        .deals-game-card--scratch .deals-game-header {
          border-bottom-color: rgba(255,255,255,0.06);
        }

        .deals-game-card--scratch .deals-game-title {
          color: #f1f5f9;
        }

        .deals-game-card--scratch .deals-game-desc {
          color: #94a3b8;
        }

        @media (max-width: 640px) {
          .deals-hero {
            padding: 2rem 1rem 1.5rem;
          }
          .deals-stores-grid {
            grid-template-columns: 1fr 1fr;
          }
          .deals-store-card {
            height: 180px;
          }
          .deals-store-emoji { font-size: 2rem; }
          .deals-store-name { font-size: 1rem; }
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
