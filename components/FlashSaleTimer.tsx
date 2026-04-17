"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FlashSaleTimerProps = {
  durationHours: number;
  endsAt?: string;
  eyebrow: string;
  title: string;
  description: string;
  backgroundImage?: string;
  backgroundVideo?: string;
};

function getNextTarget(durationHours: number): number {
  return Date.now() + durationHours * 60 * 60 * 1000;
}

const STORAGE_KEY = "flash-sale-target";

function loadOrCreateTarget(durationHours: number): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed) && parsed > Date.now()) {
        return parsed;
      }
    }
  } catch {
    // localStorage unavailable (SSR guard / private mode)
  }
  const next = getNextTarget(durationHours);
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // ignore
  }
  return next;
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

/** A single rolling-digit column — slides to show the current value */
function RollingDigit({ value, max }: { value: number; max: number }) {
  const digits = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <div
      style={{
        width: 55,
        height: 40,
        overflow: "hidden",
        borderRadius: 6,
        background: "rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(-${value * 40}px)`,
          transition: "transform 0.45s cubic-bezier(.4,0,.2,1)",
          willChange: "transform",
        }}
      >
        {digits.map((d) => (
          <span
            key={d}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 40,
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#fff",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {String(d).padStart(2, "0")}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function FlashSaleTimer({
  durationHours,
  endsAt,
  eyebrow,
  title,
  description,
  backgroundImage,
  backgroundVideo,
}: Readonly<FlashSaleTimerProps>) {
  const [targetTime, setTargetTime] = useState<number>(() => getNextTarget(durationHours));
  const [now, setNow] = useState<number>(() => Date.now());
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setTargetTime(loadOrCreateTarget(durationHours));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configuredEndTime = useMemo(() => {
    if (!endsAt) return null;
    const parsed = new Date(endsAt);
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
  }, [endsAt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (!configuredEndTime) {
        setTargetTime((currentTarget) => {
          if (currentTime < currentTarget) return currentTarget;
          const next = getNextTarget(durationHours);
          try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
          return next;
        });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [configuredEndTime, durationHours]);

  const effectiveTarget = configuredEndTime ?? targetTime;
  const remaining = useMemo(() => splitTime(effectiveTarget - now), [effectiveTarget, now]);

  return (
    <>
      <style>{`
        @keyframes bf-letter-jump {
          0%   { transform: translateY(0) scale(1); }
          50%  { transform: translateY(-8px) scale(1.12); }
          100% { transform: translateY(0) scale(1); }
        }
      `}</style>
      <Link
        href="/flash-sale"
        aria-label="Go to flash sale page"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          padding: "1.25rem 1rem",
          borderRadius: "1rem",
          background: backgroundImage && !backgroundVideo
            ? `linear-gradient(135deg, rgba(26,26,46,0.85), rgba(15,52,96,0.85)), url(${backgroundImage}) center/cover no-repeat`
            : "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          border: "1px solid rgba(101, 75, 255, 0.35)",
          marginTop: "1rem",
          textDecoration: "none",
          transition: "transform 0.25s, box-shadow 0.25s",
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          boxShadow: hovered ? "0 8px 32px rgba(101, 75, 255, 0.25)" : "none",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {backgroundVideo ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 0,
            }}
          >
            <source src={backgroundVideo} />
          </video>
        ) : null}
        {backgroundVideo ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(26,26,46,0.85), rgba(15,52,96,0.85))",
              zIndex: 1,
            }}
          />
        ) : null}
        {/* Coupon card */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            border: "1px solid rgba(101, 75, 255, 0.5)",
            borderRadius: 12,
            overflow: "hidden",
            width: "100%",
            maxWidth: 500,
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Discount badge */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "1rem 1.25rem",
              background: "linear-gradient(135deg, #654bff, #8b5cf6)",
              color: "#fff",
              minWidth: 85,
            }}
          >
            <span style={{ fontSize: "1.8rem", fontWeight: 900, lineHeight: 1 }}>
              {eyebrow.match(/\d+/)?.[0] ?? "⚡"}
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              SALE
            </span>
          </div>

          {/* Dashed divider */}
          <div
            style={{
              width: 0,
              height: 80,
              borderRight: "3px dashed rgba(101, 75, 255, 0.4)",
              flexShrink: 0,
            }}
          />

          {/* Content */}
          <div style={{ padding: "0.75rem 1rem", flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontWeight: 800,
                fontSize: "0.85rem",
                color: "#fff",
                display: "flex",
                flexWrap: "wrap",
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {title.split("").map((char, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    animation: hovered ? `bf-letter-jump 0.25s ease-out ${i * 0.03}s 1 normal both` : "none",
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </h2>
            <p
              style={{
                fontSize: "0.75rem",
                color: "#959595",
                lineHeight: 1.3,
                marginTop: "0.35rem",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </p>
          </div>
        </div>

        {/* Rolling timer */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 0,
            width: "fit-content",
            position: "relative",
            zIndex: 2,
          }}
        >
          {(
            [
              { value: remaining.days, max: 31, label: "days" },
              { value: remaining.hours, max: 23, label: "hrs" },
              { value: remaining.minutes, max: 59, label: "min" },
              { value: remaining.seconds, max: 59, label: "sec" },
            ] as const
          ).map((slot, idx) => (
            <div key={slot.label} style={{ display: "contents" }}>
              {idx > 0 && (
                <span
                  style={{
                    color: "#fff",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    lineHeight: "40px",
                    width: 14,
                    textAlign: "center",
                  }}
                >
                  :
                </span>
              )}
              <div style={{ textAlign: "center", width: 55 }}>
                <RollingDigit value={slot.value} max={slot.max} />
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "#959595",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginTop: 2,
                  }}
                >
                  {slot.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Link>
    </>
  );
}
