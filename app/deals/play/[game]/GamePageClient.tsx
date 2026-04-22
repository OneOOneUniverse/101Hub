"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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

type Theme = {
  emoji: string;
  label: string;
  tagline: string;
  bg: string;
  bgGlow1: string;
  bgGlow2: string;
  accent: string;
  accentRgb: string;
  ring1: string;
  ring2: string;
  btnGrad: string;
  btnShadow: string;
  progressFill: string;
  toastGrad: string;
  overTitle: string;
  particles: string[];
};

const THEMES: Record<"spin" | "scratch" | "trivia", Theme> = {
  spin: {
    emoji: "🎡",
    label: "Spin the Wheel",
    tagline: "🎰 Test your luck — spin to win big!",
    bg: "#0f0a1a",
    bgGlow1: "rgba(124,58,237,0.28)",
    bgGlow2: "rgba(245,158,11,0.14)",
    accent: "#f59e0b",
    accentRgb: "245,158,11",
    ring1: "#f59e0b",
    ring2: "#7c3aed",
    btnGrad: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    btnShadow: "0 8px 32px rgba(245,158,11,0.5)",
    progressFill: "linear-gradient(90deg, #7c3aed, #f59e0b, #fbbf24)",
    toastGrad: "linear-gradient(135deg, #f59e0b, #dc2626)",
    overTitle: "No Spins Left!",
    particles: ["✦", "⭐", "✨", "🌟", "✦", "⭐", "✨", "✦", "🌟", "✨"],
  },
  scratch: {
    emoji: "🎟️",
    label: "Scratch Card",
    tagline: "💎 Scratch away — fortune awaits!",
    bg: "#080f0a",
    bgGlow1: "rgba(16,185,129,0.22)",
    bgGlow2: "rgba(245,158,11,0.1)",
    accent: "#10b981",
    accentRgb: "16,185,129",
    ring1: "#10b981",
    ring2: "#f59e0b",
    btnGrad: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    btnShadow: "0 8px 32px rgba(16,185,129,0.5)",
    progressFill: "linear-gradient(90deg, #059669, #10b981, #34d399)",
    toastGrad: "linear-gradient(135deg, #10b981, #059669)",
    overTitle: "Cards Finished!",
    particles: ["💎", "🪙", "🔮", "💚", "💎", "🌿", "🪙", "💎", "🔮", "💚"],
  },
  trivia: {
    emoji: "🧠",
    label: "Daily Trivia",
    tagline: "⚡ Think fast — prove your knowledge!",
    bg: "#020813",
    bgGlow1: "rgba(6,182,212,0.2)",
    bgGlow2: "rgba(59,130,246,0.14)",
    accent: "#06b6d4",
    accentRgb: "6,182,212",
    ring1: "#06b6d4",
    ring2: "#3b82f6",
    btnGrad: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
    btnShadow: "0 8px 32px rgba(6,182,212,0.5)",
    progressFill: "linear-gradient(90deg, #3b82f6, #06b6d4, #38bdf8)",
    toastGrad: "linear-gradient(135deg, #06b6d4, #3b82f6)",
    overTitle: "Session Complete!",
    particles: ["❓", "💡", "⚡", "🌌", "❓", "✦", "💡", "⚡", "🌟", "❓"],
  },
};

const PARTICLE_LAYOUT: [number, number, number, number][] = [
  [8, 10, 0, 1], [14, 85, 0.8, 0.7], [26, 55, 1.5, 1.2], [40, 22, 0.3, 0.85],
  [55, 72, 1.1, 1], [70, 40, 0.6, 0.9], [80, 14, 1.8, 1.1], [88, 76, 0.4, 0.75],
  [35, 90, 1.3, 1], [62, 5, 0.9, 1.2],
];

export default function GamePageClient({ game, dealsHub }: Props) {
  const { isSignedIn } = useUser();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [gamePhase, setGamePhase] = useState<"loading" | "ready" | "playing" | "gameover">("loading");
  const [prizeMessage, setPrizeMessage] = useState("");
  const [prizeType, setPrizeType] = useState<"win" | "loss">("win");
  const [showPrize, setShowPrize] = useState(false);
  const [key, setKey] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<string | null>(null);

  const theme = THEMES[game];

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
      if (data.attemptsLeft === 0 || data.onCooldown) {
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
    if (!isSignedIn) { setLoading(false); setGamePhase("ready"); return; }
    const t = setTimeout(() => void fetchStatus(), 900);
    return () => clearTimeout(t);
  }, [isSignedIn, fetchStatus]);

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
    return () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); };
  }, [status]);

  const handlePrize = useCallback((prize: SpinWheelSlice) => {
    const isWin = prize.type !== "no_prize";
    setPrizeType(isWin ? "win" : "loss");
    setPrizeMessage(
      prize.type === "no_prize"
        ? "Better luck next time!"
        : prize.type === "points"
          ? `+${prize.value} Points!`
          : `${prize.label}!`
    );
    setShowPrize(true);
    setTimeout(() => {
      void fetchStatus().then(() => {
        setStatus((prev) => {
          if (!prev) return prev;
          const newUsed = prev.attemptsUsed + 1;
          const newLeft = prev.attemptsLeft !== null ? prev.attemptsLeft - 1 : null;
          if (newLeft === 0) setGamePhase("gameover");
          return { ...prev, attemptsUsed: newUsed, attemptsLeft: newLeft };
        });
      });
    }, 1200);
  }, [fetchStatus]);

  const handleRetry = useCallback(() => {
    if (!status || status.attemptsLeft === 0) return;
    setPrizeMessage("");
    setShowPrize(false);
    setKey((k) => k + 1);
    setGamePhase("playing");
  }, [status]);

  const progressPct =
    maxAttempts > 0 && status
      ? Math.min(100, Math.round((status.attemptsUsed / maxAttempts) * 100))
      : 0;
  const attemptsLeft = status?.attemptsLeft;
  const showDots = maxAttempts > 0 && maxAttempts <= 10;

  const cssVars = {
    "--t-accent": theme.accent,
    "--t-accentRgb": theme.accentRgb,
    "--t-bg": theme.bg,
    "--t-bgGlow1": theme.bgGlow1,
    "--t-bgGlow2": theme.bgGlow2,
    "--t-btnGrad": theme.btnGrad,
    "--t-btnShadow": theme.btnShadow,
    "--t-progressFill": theme.progressFill,
    "--t-toastGrad": theme.toastGrad,
    "--t-ring1": theme.ring1,
    "--t-ring2": theme.ring2,
  } as React.CSSProperties;

  return (
    <div className="gp-root" style={cssVars}>
      <div className="gp-bg-glow" aria-hidden />

      <div className="gp-particles" aria-hidden>
        {PARTICLE_LAYOUT.map(([top, left, delay, scale], i) => (
          <span
            key={i}
            className="gp-particle"
            style={{ top: `${top}%`, left: `${left}%`, animationDelay: `${delay}s`, fontSize: `${scale * 1.1}rem` }}
          >
            {theme.particles[i]}
          </span>
        ))}
      </div>

      <header className="gp-header">
        <Link href="/deals" className="gp-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Deals Hub
        </Link>
        <div className="gp-header-badge">
          <span>{theme.emoji}</span>
          <span className="gp-header-label">{theme.label}</span>
        </div>
      </header>

      <main className="gp-main">

        {/* LOADER */}
        {(loading || gamePhase === "loading") && (
          <div className="gp-loader">
            <div className="gp-loader-rings">
              <div className="gp-ring gp-ring-1" />
              <div className="gp-ring gp-ring-2" />
              <div className="gp-ring gp-ring-3" />
              <div className="gp-loader-center">
                <span className="gp-loader-emoji">{theme.emoji}</span>
              </div>
            </div>
            <p className="gp-loader-title">
              Loading Game
              <span className="gp-dots"><span>.</span><span>.</span><span>.</span></span>
            </p>
            <p className="gp-loader-sub">{theme.tagline}</p>
          </div>
        )}

        {/* READY */}
        {!loading && gamePhase === "ready" && (
          <div className="gp-card">
            <div className="gp-card-glow-border" />
            <div className="gp-card-inner">
              <div className="gp-art">
                <div className="gp-art-pulse gp-art-pulse-1" />
                <div className="gp-art-pulse gp-art-pulse-2" />
                <div className="gp-art-circle">
                  <span className="gp-art-emoji">{theme.emoji}</span>
                </div>
              </div>
              <h1 className="gp-title">{gameConfig.title}</h1>
              <p className="gp-tagline-badge">{theme.tagline}</p>
              <p className="gp-desc">{gameConfig.description}</p>

              {isSignedIn && maxAttempts > 0 && status && (
                <div className="gp-attempts-panel">
                  <div className="gp-attempts-top">
                    <span className="gp-panel-label">⚡ Attempts Available</span>
                    <span className="gp-panel-count">
                      {attemptsLeft === null ? "∞" : attemptsLeft}
                      <span className="gp-panel-of"> / {maxAttempts}</span>
                    </span>
                  </div>
                  {showDots ? (
                    <div className="gp-dots-row">
                      {Array.from({ length: maxAttempts }).map((_, i) => (
                        <span
                          key={i}
                          className={`gp-dot ${i < (attemptsLeft ?? 0) ? "gp-dot--on" : "gp-dot--off"}`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="gp-bar-track">
                      <div className="gp-bar-fill" style={{ width: `${100 - progressPct}%` }} />
                    </div>
                  )}
                  <p className="gp-attempts-hint">
                    {attemptsLeft === 0
                      ? "No attempts remaining"
                      : attemptsLeft === 1
                        ? "⚠️ Last attempt — make it count!"
                        : `${attemptsLeft} attempt${(attemptsLeft ?? 0) !== 1 ? "s" : ""} remaining`}
                  </p>
                </div>
              )}

              {!isSignedIn ? (
                <Link href="/login" className="gp-play-btn">Sign in to Play</Link>
              ) : (
                <button className="gp-play-btn" onClick={() => setGamePhase("playing")}>
                  <span className="gp-play-tri">▶</span> Play Now
                </button>
              )}
            </div>
          </div>
        )}

        {/* PLAYING */}
        {!loading && gamePhase === "playing" && (
          <div className="gp-playing">
            {isSignedIn && maxAttempts > 0 && status && (
              <>
                <div className="gp-hud">
                  <div className="gp-hud-left">
                    <span className="gp-hud-emoji">{theme.emoji}</span>
                    <span className="gp-hud-name">{theme.label}</span>
                  </div>
                  <div className="gp-hud-right">
                    {showDots ? (
                      <div className="gp-hud-dots">
                        {Array.from({ length: maxAttempts }).map((_, i) => (
                          <span
                            key={i}
                            className={`gp-hud-dot ${i < (attemptsLeft ?? 0) ? "gp-hud-dot--on" : "gp-hud-dot--off"}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="gp-hud-count">
                        {attemptsLeft === null ? "∞" : attemptsLeft}
                        <span className="gp-hud-left-word"> left</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="gp-sub-hud">
                  <div className="gp-bar-track gp-bar-track--sm">
                    <div className="gp-bar-fill" style={{ width: `${100 - progressPct}%` }} />
                  </div>
                  <span className="gp-sub-label">
                    {attemptsLeft === null
                      ? "Unlimited attempts"
                      : `${attemptsLeft} attempt${(attemptsLeft ?? 0) !== 1 ? "s" : ""} remaining`}
                  </span>
                </div>
              </>
            )}

            {showPrize && prizeMessage && (
              <div className={`gp-prize ${prizeType === "win" ? "gp-prize--win" : "gp-prize--loss"}`}>
                <span className="gp-prize-icon">{prizeType === "win" ? "🎉" : "😅"}</span>
                <div className="gp-prize-body">
                  <span className="gp-prize-label">{prizeType === "win" ? "You won!" : "No prize"}</span>
                  <span className="gp-prize-value">{prizeMessage}</span>
                </div>
              </div>
            )}

            <div className="gp-stage">
              {game === "spin" && (
                <SpinWheel key={key} slices={dealsHub.spinWheel.slices} onResult={handlePrize} disabled={!isSignedIn} />
              )}
              {game === "scratch" && (
                <ScratchCard key={key} onResult={handlePrize} disabled={!isSignedIn} />
              )}
              {game === "trivia" && (
                <DailyTrivia key={key} questions={dealsHub.trivia.questions} />
              )}
            </div>

            {showPrize && status && (status.attemptsLeft === null || (status.attemptsLeft ?? 0) > 0) && (
              <button className="gp-retry" onClick={handleRetry}>
                <span>🔄</span> Try Again
                {status.attemptsLeft !== null && status.attemptsLeft > 0 && (
                  <span className="gp-retry-badge">{status.attemptsLeft} left</span>
                )}
              </button>
            )}
          </div>
        )}

        {/* GAME OVER */}
        {!loading && gamePhase === "gameover" && (
          <div className="gp-over">
            <div className="gp-over-glow" />
            <div className="gp-over-icon">{status?.onCooldown ? "⏳" : "🚫"}</div>
            <div className="gp-over-badge">GAME OVER</div>
            <h2 className="gp-over-title">{status?.onCooldown ? "Come Back Later" : theme.overTitle}</h2>
            <p className="gp-over-desc">
              {status?.onCooldown && cooldownRemaining
                ? `Your next turn unlocks in ${cooldownRemaining}`
                : maxAttempts > 0
                  ? `You've used all ${maxAttempts} attempt${maxAttempts !== 1 ? "s" : ""} for this session.`
                  : "This game is temporarily unavailable."}
            </p>

            {maxAttempts > 0 && status && (
              <div className="gp-over-tokens">
                <p className="gp-over-tokens-label">Attempts used</p>
                {showDots ? (
                  <div className="gp-dots-row">
                    {Array.from({ length: maxAttempts }).map((_, i) => (
                      <span key={i} className="gp-dot gp-dot--used" />
                    ))}
                  </div>
                ) : (
                  <div className="gp-bar-track">
                    <div className="gp-bar-fill gp-bar-fill--over" style={{ width: "100%" }} />
                  </div>
                )}
                <p className="gp-over-tokens-count">{status.attemptsUsed} / {maxAttempts}</p>
              </div>
            )}

            {status?.onCooldown && cooldownRemaining && (
              <div className="gp-countdown">
                <span className="gp-countdown-label">Next unlock in</span>
                <span className="gp-countdown-time">{cooldownRemaining}</span>
              </div>
            )}

            <Link href="/deals" className="gp-over-back">← Back to Deals Hub</Link>
          </div>
        )}

      </main>

      <style jsx>{`
        .gp-root {
          position: relative; min-height: 100vh; background: var(--t-bg);
          overflow-x: hidden; font-family: system-ui, -apple-system, sans-serif; color: #fff;
        }
        .gp-bg-glow {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse at 15% 10%, var(--t-bgGlow1) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 85%, var(--t-bgGlow2) 0%, transparent 50%);
        }
        .gp-particles { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .gp-particle { position: absolute; opacity: 0.15; animation: gpFloat 6s ease-in-out infinite; user-select: none; }
        .gp-particle:nth-child(2)  { animation-duration: 7.5s; }
        .gp-particle:nth-child(3)  { animation-duration: 5.5s; }
        .gp-particle:nth-child(4)  { animation-duration: 8.2s; }
        .gp-particle:nth-child(5)  { animation-duration: 6.8s; }
        .gp-particle:nth-child(6)  { animation-duration: 9s; }
        .gp-particle:nth-child(7)  { animation-duration: 7.2s; }
        .gp-particle:nth-child(8)  { animation-duration: 5.2s; }
        .gp-particle:nth-child(9)  { animation-duration: 8.5s; }
        .gp-particle:nth-child(10) { animation-duration: 6.2s; }
        @keyframes gpFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.15; }
          50% { transform: translateY(-22px) rotate(18deg); opacity: 0.28; }
        }
        .gp-header {
          position: relative; z-index: 20; display: flex; align-items: center;
          justify-content: space-between; padding: 0.9rem 1.5rem;
          background: rgba(0,0,0,0.35); backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(var(--t-accentRgb), 0.15);
        }
        .gp-back {
          display: inline-flex; align-items: center; gap: 0.3rem;
          font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.45);
          text-decoration: none; letter-spacing: 0.06em; text-transform: uppercase; transition: color 0.15s;
        }
        .gp-back:hover { color: var(--t-accent); }
        .gp-header-badge {
          display: inline-flex; align-items: center; gap: 0.35rem;
          background: rgba(var(--t-accentRgb), 0.1); border: 1px solid rgba(var(--t-accentRgb), 0.25);
          border-radius: 100px; padding: 0.28rem 0.85rem;
        }
        .gp-header-label { font-size: 0.75rem; font-weight: 800; color: var(--t-accent); letter-spacing: 0.03em; }
        .gp-main {
          position: relative; z-index: 10; max-width: 760px; margin: 0 auto;
          padding: 2rem 1.25rem; display: flex; flex-direction: column;
          align-items: center; gap: 1.25rem; min-height: calc(100vh - 62px);
        }
        .gp-loader {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 2rem; min-height: 70vh; width: 100%; text-align: center;
        }
        .gp-loader-rings {
          position: relative; width: 130px; height: 130px;
          display: flex; align-items: center; justify-content: center;
        }
        .gp-ring { position: absolute; border-radius: 50%; border: 3px solid transparent; }
        .gp-ring-1 {
          inset: 0; border-top-color: var(--t-ring1); border-right-color: rgba(var(--t-accentRgb), 0.25);
          animation: gpSpin 1s linear infinite; box-shadow: 0 0 18px rgba(var(--t-accentRgb), 0.22);
        }
        .gp-ring-2 {
          inset: 16px; border-top-color: var(--t-ring2); border-left-color: rgba(var(--t-accentRgb), 0.15);
          animation: gpSpin 1.7s linear infinite reverse;
        }
        .gp-ring-3 {
          inset: 32px; border-top-color: rgba(var(--t-accentRgb), 0.55);
          border-bottom-color: rgba(var(--t-accentRgb), 0.15); animation: gpSpin 0.7s linear infinite;
        }
        @keyframes gpSpin { to { transform: rotate(360deg); } }
        .gp-loader-center { position: relative; z-index: 2; }
        .gp-loader-emoji { font-size: 2.4rem; display: block; animation: gpPulse 2s ease-in-out infinite; }
        @keyframes gpPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } }
        .gp-loader-title { font-size: 1.05rem; font-weight: 800; color: var(--t-accent); letter-spacing: 0.1em; text-transform: uppercase; margin: 0; }
        .gp-loader-sub { font-size: 0.78rem; color: rgba(255,255,255,0.35); margin: 0; }
        .gp-dots span { animation: gpBlink 1.2s step-start infinite; opacity: 0; }
        .gp-dots span:nth-child(2) { animation-delay: 0.2s; }
        .gp-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes gpBlink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }
        .gp-card { position: relative; width: 100%; max-width: 520px; border-radius: 28px; overflow: visible; }
        .gp-card-glow-border {
          position: absolute; inset: -1px; border-radius: 29px;
          background: linear-gradient(135deg, rgba(var(--t-accentRgb), 0.65) 0%, rgba(var(--t-accentRgb), 0.08) 45%, rgba(var(--t-accentRgb), 0.45) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude; padding: 1.5px; pointer-events: none; z-index: 1;
        }
        .gp-card-inner {
          position: relative; z-index: 2;
          background: linear-gradient(160deg, rgba(255,255,255,0.065) 0%, rgba(0,0,0,0.25) 100%);
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-radius: 28px;
          padding: 2.5rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 0.9rem;
          text-align: center;
          box-shadow: 0 0 0 1px rgba(var(--t-accentRgb), 0.1), 0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .gp-art { position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; }
        .gp-art-pulse { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid rgba(var(--t-accentRgb), 0.3); animation: gpExpand 2.8s ease-out infinite; }
        .gp-art-pulse-2 { inset: -14px; animation-delay: 1.4s; border-color: rgba(var(--t-accentRgb), 0.18); }
        @keyframes gpExpand { 0% { transform: scale(0.88); opacity: 0.6; } 100% { transform: scale(1.3); opacity: 0; } }
        .gp-art-circle {
          position: relative; z-index: 2; width: 100px; height: 100px; border-radius: 50%;
          background: rgba(var(--t-accentRgb), 0.1); border: 2px solid rgba(var(--t-accentRgb), 0.3);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 50px rgba(var(--t-accentRgb), 0.2), inset 0 0 30px rgba(var(--t-accentRgb), 0.05);
        }
        .gp-art-emoji { font-size: 3.6rem; animation: gpFloatSm 3.2s ease-in-out infinite; }
        @keyframes gpFloatSm { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .gp-title { font-size: 1.8rem; font-weight: 900; color: #fff; margin: 0; letter-spacing: -0.025em; }
        .gp-tagline-badge {
          font-size: 0.75rem; font-weight: 700; color: var(--t-accent); margin: 0;
          letter-spacing: 0.04em; text-transform: uppercase;
          background: rgba(var(--t-accentRgb), 0.1); border: 1px solid rgba(var(--t-accentRgb), 0.22);
          border-radius: 100px; padding: 0.28rem 0.8rem;
        }
        .gp-desc { font-size: 0.85rem; color: rgba(255,255,255,0.5); margin: 0; line-height: 1.65; }
        .gp-attempts-panel {
          width: 100%; background: rgba(var(--t-accentRgb), 0.06);
          border: 1px solid rgba(var(--t-accentRgb), 0.18); border-radius: 16px;
          padding: 1.1rem 1.25rem; display: flex; flex-direction: column; gap: 0.7rem; margin-top: 0.25rem;
        }
        .gp-attempts-top { display: flex; justify-content: space-between; align-items: center; }
        .gp-panel-label { font-size: 0.68rem; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.08em; }
        .gp-panel-count { font-size: 1rem; font-weight: 900; color: var(--t-accent); font-variant-numeric: tabular-nums; }
        .gp-panel-of { font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.3); }
        .gp-attempts-hint { font-size: 0.7rem; color: rgba(255,255,255,0.3); margin: 0; text-align: center; }
        .gp-dots-row { display: flex; gap: 0.45rem; justify-content: center; flex-wrap: wrap; }
        .gp-dot { width: 24px; height: 24px; border-radius: 50%; display: inline-block; transition: all 0.3s ease; flex-shrink: 0; }
        .gp-dot--on { background: var(--t-accent); box-shadow: 0 0 10px rgba(var(--t-accentRgb), 0.7), 0 0 20px rgba(var(--t-accentRgb), 0.3); }
        .gp-dot--off { background: transparent; border: 2px solid rgba(var(--t-accentRgb), 0.2); }
        .gp-dot--used { background: rgba(255,255,255,0.06); border: 2px solid rgba(255,255,255,0.08); }
        .gp-bar-track { width: 100%; height: 9px; background: rgba(var(--t-accentRgb), 0.1); border-radius: 100px; overflow: hidden; }
        .gp-bar-track--sm { height: 5px; }
        .gp-bar-fill {
          height: 100%; background: var(--t-progressFill); border-radius: 100px;
          transition: width 0.65s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden;
        }
        .gp-bar-fill::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: gpShimmer 2.2s infinite;
        }
        .gp-bar-fill--over { background: linear-gradient(90deg, #dc2626, #ef4444); }
        @keyframes gpShimmer { to { left: 200%; } }
        .gp-play-btn {
          position: relative; display: inline-flex; align-items: center; gap: 0.6rem;
          padding: 1rem 2.75rem; background: var(--t-btnGrad); color: #fff;
          font-weight: 900; font-size: 1rem; border-radius: 100px; border: none; cursor: pointer;
          text-decoration: none; letter-spacing: 0.05em; text-transform: uppercase;
          box-shadow: var(--t-btnShadow); transition: transform 0.15s, box-shadow 0.15s;
          margin-top: 0.6rem; overflow: hidden;
        }
        .gp-play-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
          transform: translateX(-100%); transition: transform 0.5s;
        }
        .gp-play-btn:hover::before { transform: translateX(100%); }
        .gp-play-btn:hover { transform: translateY(-2px) scale(1.03); }
        .gp-play-btn:active { transform: scale(0.97); }
        .gp-play-tri { font-size: 0.85rem; opacity: 0.9; }
        .gp-playing { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .gp-hud {
          width: 100%; max-width: 520px; display: flex; align-items: center; justify-content: space-between;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(var(--t-accentRgb), 0.2); border-radius: 100px; padding: 0.55rem 1.1rem;
        }
        .gp-hud-left { display: flex; align-items: center; gap: 0.4rem; }
        .gp-hud-emoji { font-size: 1rem; }
        .gp-hud-name { font-size: 0.7rem; font-weight: 800; color: var(--t-accent); letter-spacing: 0.05em; text-transform: uppercase; }
        .gp-hud-right { display: flex; align-items: center; }
        .gp-hud-dots { display: flex; gap: 0.3rem; align-items: center; }
        .gp-hud-dot { width: 11px; height: 11px; border-radius: 50%; transition: all 0.3s; flex-shrink: 0; }
        .gp-hud-dot--on { background: var(--t-accent); box-shadow: 0 0 6px rgba(var(--t-accentRgb), 0.8), 0 0 12px rgba(var(--t-accentRgb), 0.4); }
        .gp-hud-dot--off { background: transparent; border: 1.5px solid rgba(255,255,255,0.15); }
        .gp-hud-count { font-size: 0.9rem; font-weight: 900; color: var(--t-accent); }
        .gp-hud-left-word { font-size: 0.62rem; font-weight: 600; color: rgba(255,255,255,0.35); margin-left: 0.18rem; }
        .gp-sub-hud { width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 0.3rem; }
        .gp-sub-label { font-size: 0.65rem; color: rgba(255,255,255,0.3); font-weight: 600; text-align: right; letter-spacing: 0.04em; }
        .gp-prize {
          width: 100%; max-width: 520px; border-radius: 18px;
          padding: 1rem 1.4rem; display: flex; align-items: center; gap: 0.85rem;
          animation: gpPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .gp-prize--win { background: var(--t-toastGrad); box-shadow: 0 8px 36px rgba(var(--t-accentRgb), 0.4); }
        .gp-prize--loss { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); }
        @keyframes gpPop { 0% { transform: scale(0.82) translateY(-12px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
        .gp-prize-icon { font-size: 1.6rem; flex-shrink: 0; }
        .gp-prize-body { display: flex; flex-direction: column; gap: 0.15rem; }
        .gp-prize-label { font-size: 0.65rem; font-weight: 700; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.08em; }
        .gp-prize-value { font-size: 1.1rem; font-weight: 900; color: #fff; }
        .gp-stage { width: 100%; display: flex; justify-content: center; }
        .gp-retry {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.8rem 1.75rem; background: rgba(var(--t-accentRgb), 0.1);
          border: 1.5px solid rgba(var(--t-accentRgb), 0.32); color: var(--t-accent);
          font-weight: 800; font-size: 0.875rem; border-radius: 100px; cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.04em;
        }
        .gp-retry:hover { background: rgba(var(--t-accentRgb), 0.18); transform: scale(1.04); box-shadow: 0 0 20px rgba(var(--t-accentRgb), 0.2); }
        .gp-retry-badge { background: rgba(var(--t-accentRgb), 0.22); color: var(--t-accent); border-radius: 100px; padding: 0.15rem 0.5rem; font-size: 0.68rem; font-weight: 900; }
        .gp-over {
          position: relative; width: 100%; max-width: 480px;
          background: linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.25) 100%);
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(var(--t-accentRgb), 0.18); border-radius: 28px;
          padding: 2.5rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 1rem;
          text-align: center; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.45);
        }
        .gp-over-glow {
          position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
          width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%); pointer-events: none;
        }
        .gp-over-icon {
          font-size: 3rem; width: 90px; height: 90px; border-radius: 50%;
          background: rgba(220,38,38,0.1); border: 2px solid rgba(220,38,38,0.22);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 0.25rem; position: relative; z-index: 2;
        }
        .gp-over-badge {
          font-size: 0.62rem; font-weight: 900; letter-spacing: 0.18em; color: #ef4444;
          background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.22);
          border-radius: 100px; padding: 0.25rem 0.8rem; text-transform: uppercase; position: relative; z-index: 2;
        }
        .gp-over-title { font-size: 1.65rem; font-weight: 900; color: #fff; margin: 0; letter-spacing: -0.025em; position: relative; z-index: 2; }
        .gp-over-desc { font-size: 0.875rem; color: rgba(255,255,255,0.45); line-height: 1.65; margin: 0; position: relative; z-index: 2; }
        .gp-over-tokens {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 1rem; display: flex; flex-direction: column; gap: 0.65rem;
          align-items: center; position: relative; z-index: 2;
        }
        .gp-over-tokens-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.3); margin: 0; }
        .gp-over-tokens-count { font-size: 0.78rem; font-weight: 800; color: rgba(255,255,255,0.35); margin: 0; }
        .gp-countdown {
          width: 100%; display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
          background: rgba(var(--t-accentRgb), 0.07); border: 1px solid rgba(var(--t-accentRgb), 0.2);
          border-radius: 16px; padding: 1rem 1.5rem; position: relative; z-index: 2;
        }
        .gp-countdown-label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.35); }
        .gp-countdown-time { font-size: 1.8rem; font-weight: 900; color: var(--t-accent); font-variant-numeric: tabular-nums; letter-spacing: 0.04em; text-shadow: 0 0 20px rgba(var(--t-accentRgb), 0.5); }
        .gp-over-back {
          display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.8rem 1.75rem;
          border: 1.5px solid rgba(var(--t-accentRgb), 0.28); color: var(--t-accent);
          background: rgba(var(--t-accentRgb), 0.07); font-weight: 800; font-size: 0.875rem;
          border-radius: 100px; text-decoration: none; transition: all 0.2s;
          margin-top: 0.5rem; position: relative; z-index: 2;
        }
        .gp-over-back:hover { background: rgba(var(--t-accentRgb), 0.15); transform: translateY(-1px); }
        @media (max-width: 600px) {
          .gp-header { padding: 0.8rem 1rem; }
          .gp-main { padding: 1.25rem 0.875rem; }
          .gp-card-inner { padding: 1.75rem 1.25rem; }
          .gp-title { font-size: 1.45rem; }
          .gp-over { padding: 2rem 1.25rem; }
          .gp-countdown-time { font-size: 1.5rem; }
          .gp-play-btn { padding: 0.875rem 2rem; }
        }
      `}</style>
    </div>
  );
}
