"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

const SECRET_MIN = 1;
const SECRET_MAX = 20;
const MAX_GUESSES = 5;

function randomNum() {
  return Math.floor(Math.random() * (SECRET_MAX - SECRET_MIN + 1)) + SECRET_MIN;
}

export default function LuckyNumber() {
  const { isSignedIn } = useUser();
  const [secret] = useState(randomNum);
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState<{ num: number; hint: "too_low" | "too_high" | "correct" }[]>([]);
  const [phase, setPhase] = useState<"playing" | "won" | "lost" | "claimed" | "limit">("playing");
  const [isClaiming, setIsClaiming] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [playsLeft, setPlaysLeft] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/deals/minigame?game=lucky")
      .then((r) => r.json())
      .then((d: { playsLeft?: number }) => {
        if (typeof d.playsLeft === "number") {
          setPlaysLeft(d.playsLeft);
          if (d.playsLeft === 0) setPhase("limit");
        }
      })
      .catch(() => {});
  }, [isSignedIn]);

  const claimPoints = useCallback(async () => {
    if (!isSignedIn) { setMsg("Sign in to save your points!"); return; }
    setIsClaiming(true);
    try {
      const res = await fetch("/api/deals/minigame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "lucky" }),
      });
      const data = (await res.json()) as { pointsEarned?: number; error?: string; limitReached?: boolean };
      if (data.limitReached) { setPhase("limit"); return; }
      if (!res.ok) { setMsg(data.error ?? "Error"); return; }
      setPointsEarned(data.pointsEarned ?? 0);
      setPhase("claimed");
    } catch {
      setMsg("Network error — try again");
    } finally {
      setIsClaiming(false);
    }
  }, [isSignedIn]);

  const guess = useCallback(() => {
    const num = parseInt(input.trim(), 10);
    if (isNaN(num) || num < SECRET_MIN || num > SECRET_MAX) return;
    setInput("");

    const hint: "too_low" | "too_high" | "correct" =
      num < secret ? "too_low" : num > secret ? "too_high" : "correct";
    const newGuesses = [...guesses, { num, hint }];
    setGuesses(newGuesses);

    if (hint === "correct") {
      setPhase("won");
    } else if (newGuesses.length >= MAX_GUESSES) {
      setPhase("lost");
    }
  }, [input, secret, guesses]);

  if (phase === "limit") {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-4xl">🎲</p>
        <p className="text-lg font-bold text-[var(--brand-deep)]">Daily limit reached!</p>
        <p className="text-sm text-[var(--ink-soft)]">Come back tomorrow to play Lucky Number again.</p>
      </div>
    );
  }

  if (phase === "claimed") {
    return (
      <div className="text-center py-10 space-y-4">
        <p className="text-5xl">🎊</p>
        <p className="text-xl font-black text-[var(--brand-deep)]">Points Claimed!</p>
        <p className="text-2xl font-bold text-[var(--brand)]">+{pointsEarned} Points</p>
        <p className="text-sm text-[var(--ink-soft)]">Points added to your balance. Play again tomorrow!</p>
      </div>
    );
  }

  if (phase === "won") {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-5xl">🎯</p>
        <p className="text-xl font-black text-[var(--brand-deep)]">Correct! It was {secret}!</p>
        <p className="text-sm text-[var(--ink-soft)]">You got it in {guesses.length} guess{guesses.length !== 1 ? "es" : ""}!</p>
        {msg && <p className="text-sm text-red-500">{msg}</p>}
        <button
          onClick={claimPoints}
          disabled={isClaiming}
          className="rounded-full bg-[var(--brand)] px-8 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90"
        >
          {isClaiming ? "Claiming…" : "Claim 50 Points 🎁"}
        </button>
      </div>
    );
  }

  if (phase === "lost") {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-5xl">😅</p>
        <p className="text-xl font-black text-[var(--brand-deep)]">Out of guesses! It was {secret}.</p>
        <p className="text-sm text-[var(--ink-soft)]">Better luck next time!</p>
      </div>
    );
  }

  const guessesLeft = MAX_GUESSES - guesses.length;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[var(--brand)]/5 border border-[var(--brand)]/15 p-4 text-center">
        <p className="text-sm font-bold text-[var(--brand-deep)]">Guess a number between {SECRET_MIN} and {SECRET_MAX}</p>
        <p className="text-xs text-[var(--ink-soft)] mt-1">{guessesLeft} guess{guessesLeft !== 1 ? "es" : ""} remaining</p>
      </div>

      {guesses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {guesses.map((g, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold border ${
                g.hint === "too_low"
                  ? "bg-orange-50 border-orange-200 text-orange-700"
                  : "bg-blue-50 border-blue-200 text-blue-700"
              }`}
            >
              {g.num} {g.hint === "too_low" ? "📈 Too low" : "📉 Too high"}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="number"
          min={SECRET_MIN}
          max={SECRET_MAX}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && guess()}
          placeholder={`${SECRET_MIN}–${SECRET_MAX}`}
          className="flex-1 rounded-xl border border-[var(--ink)]/15 bg-[var(--surface-strong)] px-4 py-3 text-base font-bold focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
        />
        <button
          onClick={guess}
          disabled={!input.trim()}
          className="rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          Guess!
        </button>
      </div>

      {playsLeft !== null && (
        <p className="text-xs text-center text-[var(--ink-soft)]">{playsLeft} plays left today</p>
      )}
    </div>
  );
}
