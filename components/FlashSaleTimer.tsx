"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FlashSaleTimerProps = {
  durationHours: number;
  endsAt?: string;
  eyebrow: string;
  title: string;
  description: string;
};

function getNextTarget(durationHours: number): number {
  return Date.now() + durationHours * 60 * 60 * 1000;
}

function splitTime(distanceMs: number) {
  const safe = Math.max(0, distanceMs);
  const totalSeconds = Math.floor(safe / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

export default function FlashSaleTimer({
  durationHours,
  endsAt,
  eyebrow,
  title,
  description,
}: Readonly<FlashSaleTimerProps>) {
  const [targetTime, setTargetTime] = useState<number>(() => getNextTarget(durationHours));
  const [now, setNow] = useState<number>(() => Date.now());

  const configuredEndTime = useMemo(() => {
    if (!endsAt) {
      return null;
    }

    const parsed = new Date(endsAt);
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
  }, [endsAt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (!configuredEndTime) {
        setTargetTime((currentTarget) =>
          currentTime >= currentTarget ? getNextTarget(durationHours) : currentTarget
        );
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [configuredEndTime, durationHours]);

  const effectiveTarget = configuredEndTime ?? targetTime;
  const remaining = useMemo(() => splitTime(effectiveTarget - now), [effectiveTarget, now]);

  return (
    <Link
      href="/flash-sale"
      className="group mt-4 block rounded-2xl border border-[var(--brand)]/20 bg-gradient-to-r from-[var(--brand)]/10 via-white to-[var(--accent)]/10 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      aria-label="Go to flash sale page"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--brand-deep)]">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-black text-[var(--ink)] sm:text-xl">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
            <p className="text-lg font-black text-[var(--brand-deep)]">{String(remaining.days).padStart(2, "0")}</p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">Days</p>
          </div>
          <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
            <p className="text-lg font-black text-[var(--brand-deep)]">{String(remaining.hours).padStart(2, "0")}</p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">Hours</p>
          </div>
          <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
            <p className="text-lg font-black text-[var(--brand-deep)]">{String(remaining.minutes).padStart(2, "0")}</p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">Minutes</p>
          </div>
          <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
            <p className="text-lg font-black text-[var(--brand-deep)]">{String(remaining.seconds).padStart(2, "0")}</p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">Seconds</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
