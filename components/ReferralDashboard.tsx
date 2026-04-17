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

type ReferralData = {
  code: string;
  totalPoints: number;
  currentTier: Tier;
  nextTier: Tier | null;
  tiers: Tier[];
  referralCount: number;
  unlockedDiscounts: { tierName: string; discount: string }[];
};

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

  // Progress toward next tier
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
      {/* ── Header Card ── */}
      <div className="panel p-5 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-lg font-bold text-[var(--ink)]">
            🎯 Referral Program
          </h2>
          <span
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full text-white"
            style={{ backgroundColor: currentTier.badge_color }}
          >
            {currentTier.name}
          </span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
          <StatBox label="Total Points" value={totalPoints.toLocaleString()} />
          <StatBox label="Friends Referred" value={referralCount.toString()} />
          <StatBox
            label="Current Level"
            value={currentTier.name}
            className="col-span-2 sm:col-span-1"
          />
        </div>

        {/* Progress Bar */}
        <div className="mb-1 flex items-center justify-between text-xs text-[var(--ink-soft)]">
          <span>{currentTier.name}</span>
          <span>{nextTier ? nextTier.name : "Max Level"}</span>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${currentTier.badge_color}, ${nextTier?.badge_color ?? currentTier.badge_color})`,
            }}
          />
        </div>
        {nextTier && (
          <p className="mt-1.5 text-xs text-[var(--ink-soft)]">
            <strong>{pointsToNext}</strong> points to reach {nextTier.name}
          </p>
        )}
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

      {/* ── Tier Roadmap ── */}
      <div className="panel p-5 sm:p-6">
        <h3 className="font-semibold text-[var(--ink)] mb-4">🏆 Tier Roadmap</h3>
        <div className="space-y-3">
          {tiers.map((tier) => {
            const unlocked = totalPoints >= tier.min_points;
            return (
              <div
                key={tier.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  unlocked
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-gray-50 opacity-60"
                }`}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: tier.badge_color }}
                >
                  {unlocked ? "✓" : tier.name[0]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {tier.name}{" "}
                    <span className="text-xs text-[var(--ink-soft)]">
                      — {tier.min_points.toLocaleString()} pts
                    </span>
                  </p>
                  <p className="text-xs text-[var(--ink-soft)]">
                    {tier.discount_percent > 0
                      ? `${tier.discount_percent}% discount`
                      : "No discount"}
                    {tier.free_shipping ? " + Free Shipping" : ""}
                  </p>
                </div>
                {unlocked && (
                  <span className="text-xs font-medium text-green-600 shrink-0">
                    Unlocked
                  </span>
                )}
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
    </section>
  );
}

// ── Small stat box ──
function StatBox({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg bg-gray-50 border border-gray-100 p-3 text-center ${className}`}
    >
      <p className="text-xl font-bold text-[var(--ink)]">{value}</p>
      <p className="text-xs text-[var(--ink-soft)] mt-0.5">{label}</p>
    </div>
  );
}
