"use client";

import { useState, useRef, useCallback } from "react";
import type { SpinWheelSlice } from "@/lib/site-content-types";

type Props = {
  slices: SpinWheelSlice[];
  onResult: (prize: SpinWheelSlice) => void;
  disabled?: boolean;
};

export default function SpinWheel({ slices, onResult, disabled }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<SVGSVGElement>(null);

  const spin = useCallback(async () => {
    if (spinning || disabled || slices.length === 0) return;
    setSpinning(true);

    try {
      const res = await fetch("/api/deals/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "spin" }),
      });

      const data = (await res.json()) as { prize?: SpinWheelSlice; error?: string; cooldown?: boolean };

      if (!res.ok || !data.prize) {
        alert(data.error ?? "Something went wrong");
        setSpinning(false);
        return;
      }

      // Find the winning slice index
      const winIndex = slices.findIndex((s) => s.id === data.prize!.id);
      const sliceAngle = 360 / slices.length;
      // The SVG slices start at 0° (3 o'clock). Pointer is at top (270° in SVG coords).
      // To land on the centre of slice winIndex, the wheel must rotate so the
      // slice midpoint aligns with 270°.
      const sliceMid = winIndex * sliceAngle + sliceAngle / 2;
      const targetBase = ((270 - sliceMid) % 360 + 360) % 360;
      // Account for accumulated rotation so we always spin forward
      const currentMod = ((rotation % 360) + 360) % 360;
      const delta = ((targetBase - currentMod) % 360 + 360) % 360;
      const totalRotation = rotation + 360 * 5 + delta;

      setRotation(totalRotation);

      // Wait for animation to end
      setTimeout(() => {
        setSpinning(false);
        onResult(data.prize!);
      }, 4200);
    } catch {
      setSpinning(false);
      alert("Network error — please try again");
    }
  }, [spinning, disabled, slices, rotation, onResult]);

  const size = 320;
  const center = size / 2;
  const radius = size / 2 - 16;
  const sliceAngle = 360 / slices.length;

  return (
    <div className="sw-wrap">
      {/* Outer ring glow */}
      <div className="sw-glow" />

      <div className="sw-stage">
        {/* Pointer triangle */}
        <div className="sw-pointer">
          <svg width="28" height="36" viewBox="0 0 28 36">
            <defs>
              <linearGradient id="ptr-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
              <filter id="ptr-shadow">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7c3aed" floodOpacity="0.5" />
              </filter>
            </defs>
            <path d="M14 36 L0 0 L28 0 Z" fill="url(#ptr-grad)" filter="url(#ptr-shadow)" />
          </svg>
        </div>

        <svg
          ref={wheelRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="sw-wheel"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          }}
        >
          {/* Outer ring */}
          <circle cx={center} cy={center} r={radius + 8} fill="none" stroke="rgba(124,58,237,0.3)" strokeWidth="3" />

          {slices.map((slice, i) => {
            const startAngle = (i * sliceAngle * Math.PI) / 180;
            const endAngle = ((i + 1) * sliceAngle * Math.PI) / 180;
            const x1 = center + radius * Math.cos(startAngle);
            const y1 = center + radius * Math.sin(startAngle);
            const x2 = center + radius * Math.cos(endAngle);
            const y2 = center + radius * Math.sin(endAngle);
            const largeArc = sliceAngle > 180 ? 1 : 0;

            const midAngle = ((i + 0.5) * sliceAngle * Math.PI) / 180;
            const labelX = center + radius * 0.6 * Math.cos(midAngle);
            const labelY = center + radius * 0.6 * Math.sin(midAngle);
            const labelRotation = (i + 0.5) * sliceAngle;

            return (
              <g key={slice.id}>
                <path
                  d={`M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={slice.color}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1.5"
                />
                {/* Thin separator line */}
                <line
                  x1={center}
                  y1={center}
                  x2={x1}
                  y2={y1}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
                <text
                  x={labelX}
                  y={labelY}
                  fill="#fff"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${labelRotation}, ${labelX}, ${labelY})`}
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
                >
                  {slice.label}
                </text>
              </g>
            );
          })}

          {/* Centre hub */}
          <circle cx={center} cy={center} r="24" fill="#1e1e2e" stroke="rgba(124,58,237,0.5)" strokeWidth="3" />
          <circle cx={center} cy={center} r="12" fill="#7c3aed" opacity="0.9" />

          {/* Tick marks around edge */}
          {slices.map((_, i) => {
            const a = (i * sliceAngle * Math.PI) / 180;
            const x1 = center + (radius - 2) * Math.cos(a);
            const y1 = center + (radius - 2) * Math.sin(a);
            const x2 = center + (radius + 4) * Math.cos(a);
            const y2 = center + (radius + 4) * Math.sin(a);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.4)" strokeWidth="2" />;
          })}
        </svg>
      </div>

      <button
        onClick={spin}
        disabled={spinning || disabled}
        className="sw-btn"
      >
        <span className="sw-btn-sweep" />
        <span className="sw-btn-text">{spinning ? "Spinning..." : "SPIN!"}</span>
      </button>

      <style jsx>{`
        .sw-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          position: relative;
        }

        .sw-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -55%);
          width: 360px;
          height: 360px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%);
          pointer-events: none;
          animation: sw-pulse 3s ease-in-out infinite alternate;
        }

        @keyframes sw-pulse {
          0% { opacity: 0.5; transform: translate(-50%, -55%) scale(0.95); }
          100% { opacity: 1; transform: translate(-50%, -55%) scale(1.05); }
        }

        .sw-stage {
          position: relative;
          display: flex;
          justify-content: center;
        }

        .sw-pointer {
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));
        }

        .sw-wheel {
          filter: drop-shadow(0 8px 24px rgba(0,0,0,0.3));
        }

        .sw-btn {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.7rem 2.5rem;
          border: 2px solid rgba(124,58,237,0.5);
          border-radius: 99px;
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          color: #fff;
          font-size: 0.9rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(124,58,237,0.3);
        }

        .sw-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(124,58,237,0.4);
        }

        .sw-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sw-btn-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }
        .sw-btn:hover:not(:disabled) .sw-btn-sweep {
          transform: translateX(100%);
        }

        .sw-btn-text {
          position: relative;
          z-index: 1;
        }

        @media (max-width: 380px) {
          .sw-wrap :global(svg.sw-wheel) {
            width: 260px;
            height: 260px;
          }
        }
      `}</style>
    </div>
  );
}
