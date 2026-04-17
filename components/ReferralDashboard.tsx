"use client";

import { useEffect, useState, useCallback } from "react";

type Tier = {
  id: number;
  name: string;
  min_points: number;
  discount_percent: number;
  free_shipping: boolean;
  badge_color: string;
};

type ReferredUser = {
  referred_name: string;
  status: string;
  created_at: string;
};

type ReferralClick = {
  id: string;
  converted_name: string | null;
  converted_user_id: string | null;
  clicked_at: string;
};

type ReferralData = {
  code: string;
  totalPoints: number;
  currentTier: Tier;
  nextTier: Tier | null;
  tiers: Tier[];
  referralCount: number;
  unlockedDiscounts: { tierName: string; discount: string }[];
  referredUsers: ReferredUser[];
  totalClicks: number;
  totalConversions: number;
  recentClicks: ReferralClick[];
};

const TIER_THEMES = [
  { emoji: "🥉", from: "#cd7f32", to: "#8B4513", grid: "rgba(205,127,50,0.08)" },
  { emoji: "🥈", from: "#d1d5db", to: "#6b7280", grid: "rgba(192,192,192,0.08)" },
  { emoji: "🥇", from: "#fbbf24", to: "#b45309", grid: "rgba(251,191,36,0.08)" },
  { emoji: "💎", from: "#a78bfa", to: "#6d28d9", grid: "rgba(167,139,250,0.08)" },
  { emoji: "👑", from: "#f472b6", to: "#be185d", grid: "rgba(244,114,182,0.08)" },
];

export default function ReferralDashboard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then((d) => { if (d.code) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyLink = useCallback(() => {
    if (!data) return;
    const link = `${window.location.origin}/signup?ref=${data.code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

  if (loading) {
    return (
      <div className="panel p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="panel p-6 text-center text-[var(--ink-soft)]">
        Sign in to access your referral dashboard.
      </div>
    );
  }

  const { code, totalPoints, currentTier, nextTier, tiers, referralCount, unlockedDiscounts } = data;
  const referredUsers = data.referredUsers ?? [];
  const totalClicks = data.totalClicks ?? 0;
  const totalConversions = data.totalConversions ?? 0;
  const recentClicks = data.recentClicks ?? [];
  const conversionRate = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 100) : 0;

  const progressPercent = nextTier
    ? Math.min(
        100,
        ((totalPoints - currentTier.min_points) /
          (nextTier.min_points - currentTier.min_points)) *
          100
      )
    : 100;

  const pointsToNext = nextTier ? nextTier.min_points - totalPoints : 0;

  return (
    <section className="space-y-5">
      <style>{`
        @keyframes ref-chart-draw {
          0%   { stroke-dashoffset: 1500; opacity: 0.5; }
          50%  { stroke-dashoffset: 0;    opacity: 1; }
          100% { stroke-dashoffset: -1500; opacity: 0.5; }
        }
        @keyframes ref-grid-scroll {
          from { background-position: 0 0; }
          to   { background-position: 0 40px; }
        }
        @keyframes ref-glow-pulse {
          0%,100% { filter: drop-shadow(0 0 6px var(--tier-glow)); }
          50%     { filter: drop-shadow(0 0 18px var(--tier-glow)) brightness(1.08); }
        }
        @keyframes ref-float-in {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ── Analytics-inspired analysis card ── */
        .ref-analysis-outer {
          position: relative;
          background: linear-gradient(135deg, rgba(255,107,53,0.55), rgba(217,64,32,0.3), rgba(255,107,53,0.55));
          border-radius: 24px;
          padding: 2px;
          box-shadow: 0 0 70px -20px rgba(255,107,53,0.3);
        }
        .ref-analysis-inner {
          background: radial-gradient(ellipse at center, #1b1b1b, #060606);
          border-radius: 23px;
          overflow: hidden;
          position: relative;
        }
        .ref-analysis-inner::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,107,53,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,107,53,0.055) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
          opacity: 0.5;
        }
        .ref-chart-bg {
          position: absolute;
          bottom: 0; left: 0;
          width: 100%; height: 55%;
          overflow: hidden;
          pointer-events: none;
          opacity: 0.22;
        }
        .ref-chart-bg svg { width: 100%; height: 100%; }
        .ref-chart-bg path {
          animation: ref-chart-draw 8s ease infinite;
          stroke-dasharray: 1500;
        }
        .ref-stat {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,107,53,0.12);
          border-radius: 16px;
          padding: 16px;
          text-align: center;
          transition: all 0.3s ease;
          animation: ref-float-in 0.5s ease both;
        }
        .ref-stat:hover {
          background: rgba(255,107,53,0.07);
          border-color: rgba(255,107,53,0.3);
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(255,107,53,0.12);
        }
        .ref-vertical-lines {
          position: absolute;
          inset: 0;
          display: flex;
          justify-content: space-between;
          pointer-events: none;
          z-index: 0;
        }
        .ref-vertical-lines span {
          width: 1px;
          height: 100%;
          margin: 0 16px;
          background: linear-gradient(
            to bottom,
            rgba(255,107,53,0) 0%,
            rgba(255,107,53,0.04) 50%,
            rgba(255,107,53,0) 100%
          );
        }

        /* ── Bronze-inspired tier cards ── */
        .ref-tier-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 640px) {
          .ref-tier-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .ref-tier-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1280px) {
          .ref-tier-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        }
        .ref-tier-wrap {
          perspective: 800px;
          animation: ref-float-in 0.5s ease both;
        }
        .ref-tier-card {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          transform-style: preserve-3d;
          transition: transform 0.5s cubic-bezier(0.23,1,0.32,1), box-shadow 0.5s ease;
        }
        .ref-tier-card:hover {
          transform: rotateX(4deg) rotateY(-6deg) scale(1.05);
        }
        .ref-tier-card::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 18px;
          pointer-events: none;
          background: linear-gradient(
            115deg,
            transparent 0%, transparent 38%,
            rgba(255,255,255,0.06) 43%,
            rgba(255,255,255,0.18) 50%,
            rgba(255,255,255,0.06) 57%,
            transparent 62%, transparent 100%
          );
          background-size: 250% 250%;
          background-position: 100% 100%;
          transition: background-position 0.5s cubic-bezier(0.23,1,0.32,1);
          z-index: 3;
          mix-blend-mode: overlay;
        }
        .ref-tier-card:hover::after {
          background-position: 0% 0%;
        }
        .ref-tier-card .tier-grid-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .ref-tier-card .tier-grid-bg::before {
          content: "";
          position: absolute;
          inset: -20px;
          background-image:
            linear-gradient(var(--tier-grid-color) 1px, transparent 1px),
            linear-gradient(90deg, var(--tier-grid-color) 1px, transparent 1px);
          background-size: 20px 20px;
          opacity: 0.5;
          animation: ref-grid-scroll 20s linear infinite;
        }
        .ref-tier-card.unlocked {
          animation: ref-glow-pulse 3s ease-in-out infinite;
        }
        .ref-tier-perf {
          width: calc(100% - 24px);
          margin: 0 auto;
          border-top: 2px dashed rgba(255,255,255,0.12);
        }
      `}</style>

      {/* ── Analytics-style Analysis Card ── */}
      <div className="ref-analysis-outer">
        <div className="ref-analysis-inner p-5 sm:p-7">
          {/* Decorative vertical lines */}
          <div className="ref-vertical-lines">
            <span /><span /><span /><span />
          </div>

          {/* Background chart */}
          <div className="ref-chart-bg">
            <svg viewBox="0 0 469 262" fill="none">
              <path
                d="M2.5 261L6.42 216.89C6.47 216.31 6.69 215.76 7.05 215.3L11.36 209.82C11.77 209.29 12 208.64 12 207.96V202.99C12 202.35 12.21 201.72 12.59 201.21L27.25 181.34C27.42 181.12 27.55 180.87 27.65 180.6L31.77 169.46C32.21 168.28 33.33 167.5 34.59 167.5H35.58C37.82 167.5 39.29 169.89 38.41 171.96C36.11 177.32 34.06 183.98 36.5 185.5C39.34 187.27 43.17 202.55 45.28 212.49C45.67 214.32 47.6 215.38 49.34 214.7L53.68 213.02C54.51 212.69 55.16 212 55.44 211.15L78.35 140.95C78.45 140.65 78.5 140.34 78.5 140.02V114.39C78.5 114.13 78.53 113.88 78.6 113.63L95.9 47.37C95.97 47.13 96 46.87 96 46.61V27L102.48 117.26C102.49 117.42 102.52 117.58 102.56 117.74L108.88 144.49C108.96 144.83 109.1 145.15 109.29 145.44L117.59 158.07C118.87 160.02 121.79 159.83 122.8 157.73L131.59 139.49C132.63 137.34 135.63 137.2 136.86 139.24L147.4 156.68C148.06 157.77 149.33 158.33 150.58 158.07L170.76 153.86C171.83 153.64 172.94 154.02 173.65 154.86L187.8 171.48C189.54 173.52 192.87 172.44 193.08 169.78L199.81 85.62C200.04 82.78 203.72 81.83 205.3 84.2L227.5 117.5L230.28 122.3C231.46 124.34 234.43 124.28 235.53 122.19L237.84 117.8C237.95 117.6 238.07 117.41 238.22 117.24L261.29 90.41C262.03 89.55 263.2 89.18 264.3 89.46L280.7 93.65C282.45 94.1 284.2 92.91 284.42 91.11L294.88 6.03C295.16 3.76 297.76 2.63 299.61 3.96L322.95 20.74C323.62 21.23 324.06 21.97 324.17 22.79L335.1 106.42C335.32 108.1 336.89 109.27 338.57 108.99L365.01 104.58C366.84 104.28 368.5 105.69 368.5 107.54V116.79C368.5 117.26 368.61 117.72 368.82 118.13L385.67 151.84C386.18 152.86 387.22 153.5 388.35 153.5H393.23C393.74 153.5 394.23 153.37 394.67 153.13L406.19 146.81C407.88 145.89 410 146.78 410.52 148.63L418.13 175.69C418.37 176.52 418.23 177.42 417.76 178.14L412.9 185.61C412.34 186.48 412.26 187.57 412.69 188.5L426.2 217.76C426.69 218.82 427.75 219.5 428.92 219.5H439.15C440.28 219.5 441.32 220.14 441.83 221.16L454.17 245.84C454.39 246.27 454.71 246.65 455.1 246.93L467 255.5"
                stroke="url(#refChartGrad)"
                strokeWidth={3}
              />
              <defs>
                <linearGradient id="refChartGrad" x1={3} y1={176} x2={463} y2={189} gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ff6b35" stopOpacity={0.05} />
                  <stop offset={0.5} stopColor="#ff6b35" />
                  <stop offset={1} stopColor="#d94020" stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <h2
                className="text-lg sm:text-xl font-extrabold tracking-tight"
                style={{
                  backgroundImage: "linear-gradient(135deg, #ff6b35, #ffd700, #ff9a5c)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                🎯 Referral Program
              </h2>
              <span
                className="inline-flex items-center gap-1.5 text-sm font-bold px-3.5 py-1 rounded-full text-white"
                style={{
                  backgroundColor: currentTier.badge_color,
                  boxShadow: `0 0 16px ${currentTier.badge_color}50`,
                }}
              >
                {currentTier.name}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
              <div className="ref-stat" style={{ animationDelay: "0.1s" }}>
                <p className="text-xl font-bold text-white">{totalPoints.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Points</p>
              </div>
              <div className="ref-stat" style={{ animationDelay: "0.15s" }}>
                <p className="text-xl font-bold text-white">{referralCount.toString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">Friends Referred</p>
              </div>
              <div className="ref-stat" style={{ animationDelay: "0.2s" }}>
                <p className="text-xl font-bold text-blue-400">{totalClicks.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">Link Clicks</p>
              </div>
              <div className="ref-stat" style={{ animationDelay: "0.25s" }}>
                <p className="text-xl font-bold text-emerald-400">{totalConversions.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">Sign-ups</p>
              </div>
              <div className="ref-stat col-span-2 sm:col-span-1" style={{ animationDelay: "0.3s" }}>
                <p className="text-xl font-bold" style={{ color: currentTier.badge_color }}>
                  {conversionRate}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Conversion Rate</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>{currentTier.name}</span>
              <span>{nextTier ? nextTier.name : "Max Level"}</span>
            </div>
            <div
              className="w-full h-3 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, ${currentTier.badge_color}, ${nextTier?.badge_color ?? currentTier.badge_color})`,
                  boxShadow: `0 0 12px ${currentTier.badge_color}60`,
                }}
              />
            </div>
            {nextTier && (
              <p className="mt-1.5 text-xs text-gray-500">
                <strong className="text-white">{pointsToNext}</strong> points to reach{" "}
                <span style={{ color: nextTier.badge_color }}>{nextTier.name}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Referral Link Card ── */}
      <div className="panel p-5 sm:p-6">
        <h3 className="font-semibold text-[var(--ink)] mb-3">
          📤 Your Referral Link
        </h3>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={`${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${code}`}
            className="flex-1 min-w-0 text-sm bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-[var(--ink)] select-all"
          />
          <button
            onClick={copyLink}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: copied ? "#22c55e" : "var(--brand)" }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          Share this link. Earn <strong>100 pts</strong> per signup &amp;{" "}
          <strong>250 pts</strong> per purchase.
        </p>
      </div>

      {/* ── Tier Roadmap (horizontal, bronze-inspired 3D cards) ── */}
      <div className="panel p-5 sm:p-6">
        <h3 className="font-semibold text-[var(--ink)] mb-4">🏆 Tier Roadmap</h3>
        <div className="ref-tier-grid">
          {tiers.map((tier, idx) => {
            const unlocked = totalPoints >= tier.min_points;
            const t = TIER_THEMES[idx % TIER_THEMES.length];
            return (
              <div
                key={tier.id}
                className="ref-tier-wrap"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div
                  className={`ref-tier-card${unlocked ? " unlocked" : ""}`}
                  style={{
                    "--tier-glow": `${t.from}50`,
                    "--tier-grid-color": t.grid,
                    background: `linear-gradient(160deg, ${t.from}18, #111 60%, ${t.to}10)`,
                    border: `1.5px solid ${unlocked ? `${t.from}60` : "rgba(255,255,255,0.06)"}`,
                    boxShadow: unlocked
                      ? `0 8px 32px ${t.from}25, inset 0 1px 0 ${t.from}15`
                      : "0 4px 12px rgba(0,0,0,0.25)",
                    opacity: unlocked ? 1 : 0.55,
                  } as React.CSSProperties}
                >
                  <div className="tier-grid-bg" />

                  {/* Card body */}
                  <div className="relative z-[1] p-5 flex flex-col items-center text-center" style={{ minHeight: 200 }}>
                    <span className="text-3xl mb-2">{t.emoji}</span>
                    <span
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2 shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                        boxShadow: unlocked ? `0 0 16px ${t.from}50` : "none",
                      }}
                    >
                      {unlocked ? "✓" : tier.name[0]}
                    </span>

                    {/* Perforation line */}
                    <div className="ref-tier-perf my-2" />

                    <p className="text-sm font-bold text-white mb-0.5">{tier.name}</p>
                    <p className="text-xs text-gray-400">
                      {tier.min_points.toLocaleString()} pts
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {tier.discount_percent > 0
                        ? `${tier.discount_percent}% discount`
                        : "No discount"}
                      {tier.free_shipping ? " · Free Shipping" : ""}
                    </p>
                    {unlocked && (
                      <span
                        className="mt-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                        style={{
                          background: `${t.from}15`,
                          color: t.from,
                          border: `1px solid ${t.from}30`,
                        }}
                      >
                        Unlocked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Unlocked Discounts ── */}
      {unlockedDiscounts.length > 0 && (
        <div className="panel p-5 sm:p-6">
          <h3 className="font-semibold text-[var(--ink)] mb-3">
            🎁 Your Unlocked Discounts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unlockedDiscounts.map((d) => (
              <div
                key={d.tierName}
                className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200"
              >
                <span className="text-2xl">🏷️</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {d.discount}
                  </p>
                  <p className="text-xs text-[var(--ink-soft)]">
                    {d.tierName} tier reward
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ── Referred Friends List ── */}
      {referredUsers.length > 0 && (
        <div className="panel p-5 sm:p-6">
          <h3 className="font-semibold text-[var(--ink)] mb-3">
            👥 Friends You Referred
          </h3>
          <div className="space-y-2">
            {referredUsers.map((u, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-orange-400 to-orange-600">
                    {(u.referred_name?.[0] ?? "?").toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">
                      {u.referred_name || "A friend"}
                    </p>
                    <p className="text-xs text-[var(--ink-soft)]">
                      {new Date(u.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    u.status === "purchased"
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {u.status === "purchased" ? "Purchased ✓" : "Signed Up"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Click Activity ── */}
      {recentClicks.length > 0 && (
        <div className="panel p-5 sm:p-6">
          <h3 className="font-semibold text-[var(--ink)] mb-3">
            📊 Recent Link Activity
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wider">Visitor</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wider">Date</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentClicks.map((click) => {
                  const isConverted = click.converted_user_id !== null;
                  return (
                    <tr key={click.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                              isConverted
                                ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
                                : "bg-gradient-to-br from-gray-400 to-gray-500"
                            }`}
                          >
                            {isConverted
                              ? (click.converted_name?.[0] ?? "U").toUpperCase()
                              : "👤"}
                          </span>
                          <span className={`font-medium ${
                            isConverted ? "text-[var(--ink)]" : "text-[var(--ink-soft)] italic"
                          }`}>
                            {isConverted ? click.converted_name || "User" : "Guest"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--ink-soft)]">
                        {new Date(click.clicked_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {" "}
                        <span className="text-xs">
                          {new Date(click.clicked_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            isConverted
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isConverted ? "bg-green-500" : "bg-gray-400"
                          }`} />
                          {isConverted ? "Signed Up" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
