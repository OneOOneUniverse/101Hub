"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { BlackFridayContent } from "@/lib/site-content-types";

function splitTime(distanceMs: number) {
  const safe = Math.max(0, distanceMs);
  const totalSeconds = Math.floor(safe / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

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

export default function BlackFridayBanner({ content }: { content: BlackFridayContent }) {
  const [now, setNow] = useState(() => Date.now());
  const [hovered, setHovered] = useState(false);

  const endTime = useMemo(() => {
    if (!content.endsAt) return null;
    const parsed = new Date(content.endsAt);
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
  }, [content.endsAt]);

  useEffect(() => {
    if (!endTime) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [endTime]);

  const remaining = useMemo(() => {
    if (!endTime) return null;
    return splitTime(endTime - now);
  }, [endTime, now]);

  const expired = endTime ? now >= endTime : false;
  if (expired) return null;

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
        href={content.linkUrl || "/black-friday"}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          padding: "2rem 1.5rem",
          borderRadius: "1rem",
          background: content.backgroundImage && !content.backgroundVideo
            ? `linear-gradient(135deg, rgba(26,26,46,0.85), rgba(15,52,96,0.85)), url(${content.backgroundImage}) center/cover no-repeat`
            : "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          border: "2px solid rgba(101, 75, 255, 0.4)",
          textDecoration: "none",
          transition: "transform 0.25s, box-shadow 0.25s",
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          boxShadow: hovered ? "0 8px 32px rgba(101, 75, 255, 0.3)" : "none",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {content.backgroundVideo ? (
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
            <source src={content.backgroundVideo} />
          </video>
        ) : null}
        {content.backgroundVideo ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(26,26,46,0.85), rgba(15,52,96,0.85))",
              zIndex: 1,
            }}
          />
        ) : null}
        {/* Animated headline letters */}
        <h2
          style={{
            fontWeight: 900,
            fontSize: "1.5rem",
            color: "#fff",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            lineHeight: 1.3,
            margin: 0,
            position: "relative",
            zIndex: 2,
          }}
        >
          {content.headline.split("").map((char, i) => (
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

        {/* Big discount number */}
        <p
          style={{
            fontSize: "3rem",
            fontWeight: 900,
            background: "linear-gradient(135deg, #654bff, #8b5cf6, #c084fc)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0,
            lineHeight: 1,
            position: "relative",
            zIndex: 2,
          }}
        >
          {content.discountPercentage}% OFF
        </p>

        {/* Description */}
        <p style={{ fontSize: "0.9rem", color: "#959595", textAlign: "center", margin: 0, maxWidth: 400, position: "relative", zIndex: 2 }}>
          {content.description}
        </p>

        {/* Countdown timer (only if endsAt is set) */}
        {remaining ? (
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
        ) : null}

        {/* CTA */}
        <span
          style={{
            display: "inline-block",
            padding: "0.6rem 1.5rem",
            borderRadius: 8,
            background: "linear-gradient(135deg, #654bff, #8b5cf6)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.85rem",
            letterSpacing: "0.05em",
            transition: "opacity 0.2s",
            opacity: hovered ? 0.9 : 1,
            position: "relative",
            zIndex: 2,
          }}
        >
          {content.linkText || "Shop the Deals"} →
        </span>
      </Link>
    </>
  );
}
