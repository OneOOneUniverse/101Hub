"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { SpinWheelSlice } from "@/lib/site-content-types";

type Props = {
  onResult: (prize: SpinWheelSlice) => void;
  disabled?: boolean;
};

export default function ScratchCard({ onResult, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [prize, setPrize] = useState<SpinWheelSlice | null>(null);
  const [loading, setLoading] = useState(false);
  const scratching = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const WIDTH = 280;
  const HEIGHT = 180;

  // Draw the scratch overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Gradient scratch surface
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, "#6b7280");
    gradient.addColorStop(0.5, "#9ca3af");
    gradient.addColorStop(1, "#6b7280");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Text
    ctx.fillStyle = "#d1d5db";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Scratch to reveal!", WIDTH / 2, HEIGHT / 2 + 6);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const scratch = (pos: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    if (lastPoint.current) {
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.lineWidth = 40;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
    ctx.fill();
    lastPoint.current = pos;

    // Check how much is scratched
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparent++;
    }
    const total = imageData.data.length / 4;
    if (transparent / total > 0.5 && !revealed) {
      setRevealed(true);
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || loading || revealed) return;
    e.preventDefault();
    scratching.current = true;
    lastPoint.current = getPos(e);

    if (!prize && !loading) {
      playGame();
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!scratching.current || disabled) return;
    e.preventDefault();
    scratch(getPos(e));
  };

  const handleEnd = () => {
    scratching.current = false;
    lastPoint.current = null;
  };

  const playGame = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deals/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "scratch" }),
      });

      const data = (await res.json()) as { prize?: SpinWheelSlice; error?: string };

      if (!res.ok || !data.prize) {
        alert(data.error ?? "Something went wrong");
        return;
      }

      setPrize(data.prize);
    } catch {
      alert("Network error — try again");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (revealed && prize) {
      onResult(prize);
    }
  }, [revealed, prize, onResult]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative rounded-2xl overflow-hidden shadow-xl border-4 border-[var(--brand)]" style={{ width: WIDTH, height: HEIGHT }}>
        {/* Prize underneath */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ backgroundColor: prize?.color ?? "#2563eb" }}
        >
          <p className="text-3xl">{prize?.type === "no_prize" ? "😢" : "🎉"}</p>
          <p className="text-lg font-black text-white mt-1">
            {prize?.label ?? "Scratch to play!"}
          </p>
        </div>

        {/* Scratch overlay */}
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="absolute inset-0 cursor-crosshair touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>

      {revealed && prize && (
        <p className="text-sm font-bold text-[var(--brand-deep)]">
          {prize.type === "no_prize" ? "No luck this time. Try again later!" : `You won: ${prize.label}!`}
        </p>
      )}
    </div>
  );
}
