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

  const WIDTH = 320;
  const HEIGHT = 200;

  // Draw the scratch overlay — styled like a ticket surface
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dark gradient surface
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, "#2b2b3d");
    gradient.addColorStop(0.5, "#363650");
    gradient.addColorStop(1, "#2b2b3d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Grid lines like the ticket
    ctx.strokeStyle = "rgba(124, 58, 237, 0.12)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < WIDTH; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    // "SCRATCH HERE" text
    ctx.fillStyle = "rgba(167, 139, 250, 0.5)";
    ctx.font = "bold 11px 'Space Grotesk', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.letterSpacing = "4px";
    ctx.fillText("SCRATCH TO REVEAL", WIDTH / 2, 30);

    // Decorative barcode line
    const barcodeY = HEIGHT - 35;
    const barcodeWidth = 140;
    const startX = (WIDTH - barcodeWidth) / 2;
    let x = startX;
    while (x < startX + barcodeWidth) {
      const w = Math.random() > 0.5 ? 2 : 3;
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(x, barcodeY, w, 18);
      x += w + (Math.random() > 0.5 ? 2 : 4);
    }

    // Serial number
    ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
    ctx.font = "10px monospace";
    ctx.fillText("DH-" + Math.random().toString(36).substring(2, 8).toUpperCase(), WIDTH / 2, HEIGHT - 10);

    // Center icon + text
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "40px sans-serif";
    ctx.fillText("🎟️", WIDTH / 2, HEIGHT / 2 - 5);
    ctx.fillStyle = "rgba(167, 139, 250, 0.7)";
    ctx.font = "bold 15px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText("SCRATCH HERE", WIDTH / 2, HEIGHT / 2 + 30);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
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
      ctx.lineWidth = 45;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
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
    <div className="sc-wrapper">
      {/* Ticket container with 3D perspective */}
      <div className="sc-ticket-wrapper">
        <div className={`sc-ticket ${revealed ? "sc-ticket--revealed" : ""}`}>
          {/* Main area */}
          <div className="sc-main">
            {/* Prize underneath the scratch */}
            <div className="sc-prize-layer">
              <div className="sc-prize-inner">
                {prize?.type === "no_prize" ? (
                  <>
                    <span className="sc-prize-emoji">😢</span>
                    <span className="sc-prize-text">{prize?.label ?? "Try Again"}</span>
                  </>
                ) : (
                  <>
                    <span className="sc-prize-emoji sc-prize-emoji--win">🎉</span>
                    <span className="sc-prize-text sc-prize-text--win">{prize?.label ?? "Scratch to play!"}</span>
                    {prize && prize.type === "points" && (
                      <span className="sc-prize-value">+{prize.value} pts</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Canvas overlay */}
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              className="sc-canvas"
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            />
          </div>

          {/* Perforation */}
          <div className="sc-perforation">
            <div className="sc-perf-circle sc-perf-circle--left" />
            <div className="sc-perf-line" />
            <div className="sc-perf-circle sc-perf-circle--right" />
          </div>

          {/* Stub */}
          <div className="sc-stub">
            <div className="sc-stub-left">
              <span className="sc-stub-label">Status</span>
              <span className="sc-stub-value">{revealed ? (prize?.type === "no_prize" ? "No Prize" : "Winner!") : "Unscratched"}</span>
            </div>
            <div className="sc-stub-right">
              <span className="sc-stub-label">Prize</span>
              <span className={`sc-admit-num ${revealed && prize?.type !== "no_prize" ? "sc-admit-num--glow" : ""}`}>
                {revealed && prize ? (prize.type === "no_prize" ? "—" : "★") : "?"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Revealed message */}
      {revealed && prize && (
        <p className="sc-result-msg">
          {prize.type === "no_prize" ? "No luck this time. Try again later!" : `You won: ${prize.label}!`}
        </p>
      )}

      <style jsx>{`
        .sc-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .sc-ticket-wrapper {
          perspective: 1000px;
          display: inline-block;
        }

        .sc-ticket {
          position: relative;
          width: 320px;
          max-width: 90vw;
          color: #f8fafc;
          font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.6s ease;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
          filter: drop-shadow(0 0 10px rgba(0,0,0,0.3));
        }

        .sc-ticket-wrapper:hover .sc-ticket {
          transform: rotateX(4deg) rotateY(-6deg) scale(1.02);
          box-shadow: 20px 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1), -5px -5px 20px rgba(124,58,237,0.3);
        }

        .sc-ticket--revealed {
          animation: sc-reveal-bounce 0.5s ease;
        }

        @keyframes sc-reveal-bounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.04) rotate(-1deg); }
          60% { transform: scale(0.98) rotate(0.5deg); }
          100% { transform: scale(1) rotate(0); }
        }

        /* Holographic shine */
        .sc-ticket::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 1rem;
          pointer-events: none;
          background: linear-gradient(115deg, transparent 0%, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.08) 55%, transparent 60%, transparent 100%);
          z-index: 20;
          background-size: 250% 250%;
          background-position: 100% 100%;
          transition: background-position 0.6s cubic-bezier(0.23, 1, 0.32, 1);
          mix-blend-mode: overlay;
        }

        .sc-ticket-wrapper:hover .sc-ticket::after {
          background-position: 0% 0%;
        }

        /* Main scratch area */
        .sc-main {
          position: relative;
          overflow: hidden;
          background: radial-gradient(circle at bottom left, transparent 0.8rem, #1e1e2e 0.85rem),
                      radial-gradient(circle at bottom right, transparent 0.8rem, #1e1e2e 0.85rem);
          background-size: 51% 100%;
          background-position: bottom left, bottom right;
          background-repeat: no-repeat;
          border-top-left-radius: 1rem;
          border-top-right-radius: 1rem;
        }

        /* Grid animation overlay */
        .sc-main::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(124,58,237,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
          opacity: 0.5;
          pointer-events: none;
          animation: sc-grid-scroll 20s linear infinite;
          z-index: 1;
        }

        @keyframes sc-grid-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 20px; }
        }

        .sc-prize-layer {
          width: ${WIDTH}px;
          height: ${HEIGHT}px;
          max-width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1e1e2e 0%, #2b2b3d 100%);
        }

        .sc-prize-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          z-index: 0;
        }

        .sc-prize-emoji {
          font-size: 2.5rem;
        }

        .sc-prize-emoji--win {
          animation: sc-bounce 0.6s ease infinite alternate;
        }

        @keyframes sc-bounce {
          0% { transform: scale(1); }
          100% { transform: scale(1.15) rotate(5deg); }
        }

        .sc-prize-text {
          font-size: 1rem;
          font-weight: 800;
          color: #94a3b8;
        }

        .sc-prize-text--win {
          background: linear-gradient(135deg, #fff, #a78bfa);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sc-prize-value {
          font-size: 0.75rem;
          font-weight: 700;
          color: #7c3aed;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-shadow: 0 0 10px rgba(124,58,237,0.5);
        }

        .sc-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          cursor: crosshair;
          touch-action: none;
          z-index: 10;
        }

        /* Perforation */
        .sc-perforation {
          display: flex;
          align-items: center;
          position: relative;
          z-index: 5;
          height: 0;
        }

        .sc-perf-circle {
          width: 1.2rem;
          height: 1.2rem;
          border-radius: 50%;
          background: var(--surface, #f5f5f5);
          flex-shrink: 0;
        }

        .sc-perf-circle--left {
          transform: translate(-50%, -50%);
        }

        .sc-perf-circle--right {
          transform: translate(50%, -50%);
        }

        .sc-perf-line {
          flex: 1;
          border-top: 2px dashed rgba(255,255,255,0.15);
          transform: translateY(-50%);
        }

        /* Stub */
        .sc-stub {
          padding: 1.2rem 1.5rem;
          background: radial-gradient(circle at top left, transparent 0.8rem, #2b2b3d 0.85rem),
                      radial-gradient(circle at top right, transparent 0.8rem, #2b2b3d 0.85rem);
          background-size: 51% 100%;
          background-position: top left, top right;
          background-repeat: no-repeat;
          border-bottom-left-radius: 1rem;
          border-bottom-right-radius: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sc-stub-left {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .sc-stub-label {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #64748b;
        }

        .sc-stub-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: #e2e8f0;
        }

        .sc-stub-right {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.1rem;
        }

        .sc-admit-num {
          font-size: 2rem;
          font-weight: 900;
          line-height: 1;
          color: #475569;
          transition: all 0.4s ease;
        }

        .sc-admit-num--glow {
          color: #7c3aed;
          text-shadow: 0 0 15px rgba(124,58,237,0.5);
          animation: sc-pulse-glow 1.5s ease-in-out infinite alternate;
        }

        @keyframes sc-pulse-glow {
          0% { text-shadow: 0 0 8px rgba(124,58,237,0.3); }
          100% { text-shadow: 0 0 20px rgba(124,58,237,0.7), 0 0 40px rgba(124,58,237,0.3); }
        }

        .sc-result-msg {
          font-size: 0.85rem;
          font-weight: 700;
          color: #a78bfa;
          text-align: center;
          animation: sc-fade-up 0.4s ease;
        }

        @keyframes sc-fade-up {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 380px) {
          .sc-ticket { width: 280px; }
        }
      `}</style>
    </div>
  );
}
