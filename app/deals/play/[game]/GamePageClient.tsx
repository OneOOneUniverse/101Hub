"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import type { DealsHubContent, SpinWheelSlice } from "@/lib/site-content-types";
import SpinWheel from "@/components/SpinWheel";
import ScratchCard from "@/components/ScratchCard";
import DailyTrivia from "@/components/DailyTrivia";

type GameStatus = {
  maxAttempts: number;
  attemptsUsed: number;
  attemptsLeft: number | null;
  onCooldown: boolean;
  cooldownEndsAt: string | null;
  cooldownHours: number;
};

type Props = {
  game: "spin" | "scratch" | "trivia";
  dealsHub: DealsHubContent;
};

const GAME_EMOJI: Record<string, string> = { spin: "🎡", scratch: "🎟️", trivia: "🧠" };
const GAME_LABEL: Record<string, string> = { spin: "Spin the Wheel", scratch: "Scratch Card", trivia: "Daily Trivia" };

export default function GamePageClient({ game, dealsHub }: Props) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [gamePhase, setGamePhase] = useState<"loading" | "ready" | "playing" | "gameover">("loading");
  const [prizeMessage, setPrizeMessage] = useState("");
  const [key, setKey] = useState(0); // remount game component on retry
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<string | null>(null);

  const gameConfig =
    game === "spin"
      ? dealsHub.spinWheel
      : game === "scratch"
        ? dealsHub.scratchCard
        : dealsHub.trivia;

  const maxAttempts = (gameConfig as { maxAttempts?: number }).maxAttempts ?? 0;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/game-status?game=${game}`);
      const data = (await res.json()) as GameStatus;
      setStatus(data);

      if (data.attemptsLeft === 0) {
        setGamePhase("gameover");
      } else if (data.onCooldown) {
        setGamePhase("gameover");
      } else {
        setGamePhase("ready");
      }
    } catch {
      setGamePhase("ready");
    } finally {
      setLoading(false);
    }
  }, [game]);

  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      setGamePhase("ready");
      return;
    }
    // Show loading spinner briefly then fetch status
    const t = setTimeout(() => void fetchStatus(), 800);
    return () => clearTimeout(t);
  }, [isSignedIn, fetchStatus]);

  // Cooldown countdown timer
  useEffect(() => {
    if (status?.cooldownEndsAt && status.onCooldown) {
      const tick = () => {
        const diff = new Date(status.cooldownEndsAt!).getTime() - Date.now();
        if (diff <= 0) {
          setCooldownRemaining(null);
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return;
        }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCooldownRemaining(`${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m ` : ""}${s}s`);
      };
      tick();
      cooldownTimer.current = setInterval(tick, 1000);
    }
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, [status]);

  const handlePrize = useCallback((prize: SpinWheelSlice) => {
    if (prize.type === "no_prize") {
      setPrizeMessage("No luck this time!");
    } else if (prize.type === "points") {
      setPrizeMessage(`🎉 You won ${prize.value} points!`);
    } else {
      setPrizeMessage(`🎉 You won: ${prize.label}!`);
    }

    // After a short delay, refresh status and check if attempts are exhausted
    setTimeout(() => {
      void fetchStatus().then(() => {
        setStatus((prev) => {
          if (!prev) return prev;
          const newUsed = prev.attemptsUsed + 1;
          const newLeft = prev.attemptsLeft !== null ? prev.attemptsLeft - 1 : null;
          if (newLeft === 0) {
            setGamePhase("gameover");
          }
          return { ...prev, attemptsUsed: newUsed, attemptsLeft: newLeft };
        });
      });
    }, 1200);
  }, [fetchStatus]);

  const handleRetry = useCallback(() => {
    if (!status || status.attemptsLeft === 0) return;
    setPrizeMessage("");
    setKey((k) => k + 1);
    setGamePhase("playing");
  }, [status]);

  const handlePlayClick = () => {
    setGamePhase("playing");
  };

  // — Compute progress bar — attemptsUsed / maxAttempts
  const progressPct =
    maxAttempts > 0 && status
      ? Math.min(100, Math.round((status.attemptsUsed / maxAttempts) * 100))
      : 0;
  const attemptsLeft = status?.attemptsLeft;

  return (
    <div className="gp-root">
      <div className="gp-stars" />

      {/* Header */}
      <header className="gp-header">
        <Link href="/deals" className="gp-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Deals Hub
        </Link>
        <div className="gp-header-title">
          <span className="gp-emoji">{GAME_EMOJI[game]}</span>
          <h1>{GAME_LABEL[game]}</h1>
        </div>
      </header>

      {/* Game area */}
      <main className="gp-main">

        {/* ── Loading screen ── */}
        {(loading || gamePhase === "loading") && (
          <div className="gp-loader-screen">
            <div className="gp-loader-orb">
              <div className="gp-loader-ring" />
              <div className="gp-loader-ring gp-loader-ring--2" />
              <span className="gp-loader-emoji">{GAME_EMOJI[game]}</span>
            </div>
            <p className="gp-loader-text">Loading game...</p>
          </div>
        )}

        {/* ── Ready screen / attempts overview ── */}
        {!loading && gamePhase === "ready" && (
          <div className="gp-card gp-ready-card">
            <div className="gp-card-glow" />
            <span className="gp-big-emoji">{GAME_EMOJI[game]}</span>
            <h2 className="gp-card-title">{gameConfig.title}</h2>
            <p className="gp-card-desc">{gameConfig.description}</p>

            {/* Attempts info */}
            {isSignedIn && maxAttempts > 0 && status && (
              <div className="gp-attempts-box">
                <div className="gp-attempts-row">
                  <span className="gp-attempts-label">Attempts left</span>
                  <span className="gp-attempts-value">
                    {attemptsLeft === null ? "∞" : attemptsLeft} / {maxAttempts}
                  </span>
                </div>
                <div className="gp-progress-track">
                  <div className="gp-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            {!isSignedIn ? (
              <Link href="/login" className="gp-cta-btn">Sign in to Play</Link>
            ) : (
              <button className="gp-cta-btn" onClick={handlePlayClick}>
                <span>Play Now</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* ── Playing ── */}
        {!loading && gamePhase === "playing" && (
          <div className="gp-playing-wrap">
            {/* Attempts progress header */}
            {isSignedIn && maxAttempts > 0 && status && (
              <div className="gp-playing-meta">
                <div className="gp-meta-pill">
                  <span>Attempts: </span>
                  <strong>{attemptsLeft === null ? "∞" : attemptsLeft} left</strong>
                </div>
                <div className="gp-progress-track gp-progress-track--sm">
                  <div className="gp-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            {/* Prize message toast */}
            {prizeMessage && (
              <div className="gp-prize-toast">{prizeMessage}</div>
            )}

            {/* Game components */}
            {game === "spin" && (
              <SpinWheel
                key={key}
                slices={dealsHub.spinWheel.slices}
                onResult={handlePrize}
                disabled={!isSignedIn}
              />
            )}
            {game === "scratch" && (
              <ScratchCard key={key} onResult={handlePrize} disabled={!isSignedIn} />
            )}
            {game === "trivia" && (
              <DailyTrivia key={key} questions={dealsHub.trivia.questions} />
            )}

            {/* Try again button if attempts remain and prize message shown */}
            {prizeMessage && status && (status.attemptsLeft === null || (status.attemptsLeft ?? 0) > 0) && (
              <button className="gp-try-again-btn" onClick={handleRetry}>
                🔄 Try Again
              </button>
            )}
          </div>
        )}

        {/* ── Game Over ── */}
        {!loading && gamePhase === "gameover" && (
          <div className="gp-card gp-gameover-card">
            <div className="gp-card-glow gp-card-glow--red" />
            <span className="gp-big-emoji">🎮</span>
            <h2 className="gp-card-title">
              {status?.onCooldown ? "Come Back Later" : "No Attempts Left"}
            </h2>
            {status?.onCooldown && cooldownRemaining ? (
              <p className="gp-card-desc">
                Your next turn is available in <strong>{cooldownRemaining}</strong>.
              </p>
            ) : (
              <p className="gp-card-desc">
                {maxAttempts > 0
                  ? `You have used all ${maxAttempts} attempt${maxAttempts === 1 ? "" : "s"} for this game.`
                  : "Game is temporarily unavailable."}
              </p>
            )}

            {/* Attempts progress */}
            {maxAttempts > 0 && status && (
              <div className="gp-attempts-box">
                <div className="gp-attempts-row">
                  <span className="gp-attempts-label">Attempts used</span>
                  <span className="gp-attempts-value">{status.attemptsUsed} / {maxAttempts}</span>
                </div>
                <div className="gp-progress-track">
                  <div className="gp-progress-fill gp-progress-fill--full" style={{ width: "100%" }} />
                </div>
              </div>
            )}

            <Link href="/deals" className="gp-cta-btn gp-cta-btn--secondary">
              ← Back to Deals Hub
            </Link>
          </div>
        )}
      </main>

      <style jsx>{`
        .gp-root {
          position: relative;
          min-height: 100vh;
          background: var(--base-light, #f8f8ff);
          overflow: hidden;
        }

        .gp-stars {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 30%, rgba(124,58,237,0.07) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 70%, rgba(79,70,229,0.06) 0%, transparent 55%);
        }

        .gp-header {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1.25rem 1.5rem 0;
          max-width: 700px;
          margin: 0 auto;
        }

        .gp-back {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--brand-deep, #4f46e5);
          text-decoration: none;
          opacity: 0.7;
          transition: opacity 0.15s;
        }
        .gp-back:hover { opacity: 1; }

        .gp-header-title {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .gp-emoji { font-size: 1.75rem; line-height: 1; }
        .gp-header-title h1 {
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--brand-deep, #4f46e5);
          margin: 0;
        }

        .gp-main {
          position: relative;
          z-index: 10;
          padding: 1.5rem;
          max-width: 700px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          min-height: calc(100vh - 100px);
        }

        /* ── Loader ── */
        .gp-loader-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          min-height: 60vh;
          width: 100%;
        }

        .gp-loader-orb {
          position: relative;
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gp-loader-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: rgba(124,58,237,0.8);
          border-right-color: rgba(124,58,237,0.3);
          animation: gp-spin 0.9s linear infinite;
        }
        .gp-loader-ring--2 {
          inset: 10px;
          border-top-color: transparent;
          border-bottom-color: rgba(79,70,229,0.7);
          border-left-color: rgba(79,70,229,0.3);
          animation-duration: 1.3s;
          animation-direction: reverse;
        }

        @keyframes gp-spin { to { transform: rotate(360deg); } }

        .gp-loader-emoji { font-size: 2rem; }

        .gp-loader-text {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--brand-deep, #4f46e5);
          opacity: 0.7;
          letter-spacing: 0.05em;
        }

        /* ── Cards ── */
        .gp-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          background: white;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.07);
          padding: 2rem;
          box-shadow: 0 4px 32px rgba(124,58,237,0.07);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          overflow: hidden;
          text-align: center;
        }

        .gp-card-glow {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          width: 240px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .gp-card-glow--red {
          background: radial-gradient(circle, rgba(220,38,38,0.1) 0%, transparent 70%);
        }

        .gp-big-emoji { font-size: 3.5rem; line-height: 1; }

        .gp-card-title {
          font-size: 1.4rem;
          font-weight: 900;
          color: var(--brand-deep, #4f46e5);
          margin: 0;
        }

        .gp-card-desc {
          font-size: 0.875rem;
          color: var(--ink-soft, #6b7280);
          margin: 0;
          line-height: 1.5;
        }

        /* ── Attempts box ── */
        .gp-attempts-box {
          width: 100%;
          background: rgba(124,58,237,0.05);
          border: 1px solid rgba(124,58,237,0.12);
          border-radius: 16px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .gp-attempts-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .gp-attempts-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--ink-soft, #6b7280);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .gp-attempts-value {
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--brand-deep, #4f46e5);
        }

        /* ── Progress bar ── */
        .gp-progress-track {
          width: 100%;
          height: 8px;
          background: rgba(124,58,237,0.1);
          border-radius: 100px;
          overflow: hidden;
        }
        .gp-progress-track--sm { height: 5px; }

        .gp-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #4f46e5);
          border-radius: 100px;
          transition: width 0.5s ease;
        }
        .gp-progress-fill--full {
          background: linear-gradient(90deg, #dc2626, #b91c1c);
        }

        /* ── CTA button ── */
        .gp-cta-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.8rem 2rem;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white;
          font-weight: 800;
          font-size: 0.95rem;
          border-radius: 100px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: opacity 0.15s, transform 0.15s;
          overflow: hidden;
        }
        .gp-cta-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          transform: translateX(-100%);
          transition: transform 0.4s ease;
        }
        .gp-cta-btn:hover::before { transform: translateX(100%); }
        .gp-cta-btn:hover { opacity: 0.92; transform: translateY(-1px); }
        .gp-cta-btn--secondary {
          background: transparent;
          border: 2px solid rgba(124,58,237,0.4);
          color: var(--brand-deep, #4f46e5);
        }
        .gp-cta-btn--secondary:hover { background: rgba(124,58,237,0.06); }

        /* ── Playing wrap ── */
        .gp-playing-wrap {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }

        .gp-playing-meta {
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: white;
          border: 1px solid rgba(0,0,0,0.07);
          border-radius: 16px;
          padding: 0.875rem 1rem;
        }

        .gp-meta-pill {
          font-size: 0.8rem;
          color: var(--ink-soft, #6b7280);
          font-weight: 600;
        }
        .gp-meta-pill strong { color: var(--brand-deep, #4f46e5); }

        /* ── Prize toast ── */
        .gp-prize-toast {
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white;
          font-weight: 800;
          font-size: 1rem;
          padding: 0.875rem 1.75rem;
          border-radius: 100px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(124,58,237,0.3);
          animation: gp-fadeIn 0.35s ease;
        }
        @keyframes gp-fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }

        /* ── Try again ── */
        .gp-try-again-btn {
          padding: 0.75rem 2rem;
          background: rgba(124,58,237,0.08);
          border: 2px solid rgba(124,58,237,0.25);
          color: var(--brand-deep, #4f46e5);
          font-weight: 800;
          font-size: 0.9rem;
          border-radius: 100px;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
        }
        .gp-try-again-btn:hover {
          background: rgba(124,58,237,0.14);
          transform: scale(1.02);
        }

        @media (max-width: 640px) {
          .gp-header { padding: 1rem 1rem 0; }
          .gp-main { padding: 1rem; }
          .gp-card { padding: 1.5rem; }
        }
      `}</style>
    </div>
  );
}
