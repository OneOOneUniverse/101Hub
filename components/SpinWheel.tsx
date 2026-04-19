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
      // Target angle: the middle of the winning slice, pointing "up" (top of wheel)
      const targetAngle = 360 - (winIndex * sliceAngle + sliceAngle / 2);
      // Add multiple full rotations for dramatic effect
      const totalRotation = rotation + 360 * 5 + targetAngle;

      setRotation(totalRotation);

      // Wait for animation to end
      setTimeout(() => {
        setSpinning(false);
        onResult(data.prize!);
      }, 4000);
    } catch {
      setSpinning(false);
      alert("Network error — please try again");
    }
  }, [spinning, disabled, slices, rotation, onResult]);

  const size = 300;
  const center = size / 2;
  const radius = size / 2 - 10;
  const sliceAngle = 360 / slices.length;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Pointer */}
      <div className="relative">
        <div
          className="absolute left-1/2 -top-2 z-10 -translate-x-1/2"
          style={{ width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "20px solid #1f2937" }}
        />
        <svg
          ref={wheelRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="drop-shadow-xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          }}
        >
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
                  stroke="#fff"
                  strokeWidth="2"
                />
                <text
                  x={labelX}
                  y={labelY}
                  fill="#fff"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${labelRotation}, ${labelX}, ${labelY})`}
                >
                  {slice.label}
                </text>
              </g>
            );
          })}
          <circle cx={center} cy={center} r="20" fill="#1f2937" stroke="#fff" strokeWidth="3" />
        </svg>
      </div>

      <button
        onClick={spin}
        disabled={spinning || disabled}
        className="rounded-full bg-[var(--brand)] px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-50 transition"
      >
        {spinning ? "Spinning..." : "SPIN!"}
      </button>
    </div>
  );
}
