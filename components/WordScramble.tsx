"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";

const WORD_LIST = [
  "GADGET", "DEALS", "POINTS", "REWARD", "LUCKY", "FLASH", "STORE",
  "PHONE", "TABLET", "LAPTOP", "GAMING", "STYLE", "OFFER", "BONUS",
];

function scramble(word: string): string {
  const arr = word.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Ensure scrambled !== original
  const result = arr.join("");
  return result === word ? scramble(word) : result;
}

export default function WordScramble() {
  const { isSignedIn } = useUser();
  const word = useMemo(() => WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)], []);
  const scrambled = useMemo(() => scramble(word), [word]);
  const [input, setInput] = useState("");
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState<"wrong" | null>(null);
  const [phase, setPhase] = useState<"playing" | "won" | "claiming" | "claimed" | "limit">("playing");
  const [pointsEarned, setPointsEarned] = useState(0);
  const [playsLeft, setPlaysLeft] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/deals/minigame?game=scramble")
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
    setPhase("claiming");
    try {
      const res = await fetch("/api/deals/minigame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "scramble" }),
      });
      const data = (await res.json()) as { pointsEarned?: number; error?: string; limitReached?: boolean };
      if (data.limitReached) { setPhase("limit"); return; }
      if (!res.ok) { setMsg(data.error ?? "Error"); setPhase("won"); return; }
      setPointsEarned(data.pointsEarned ?? 0);
      setPhase("claimed");
    } catch {
      setMsg("Network error — try again");
      setPhase("won");
    }
  }, [isSignedIn]);

  const submit = useCallback(() => {
    if (!input.trim()) return;
    setTries((t) => t + 1);
    if (input.trim().toUpperCase() === word) {
      setPhase("won");
    } else {
      setHint("wrong");
      setInput("");
      setTimeout(() => setHint(null), 800);
    }
  }, [input, word]);

  if (phase === "limit") {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-4xl">🔤</p>
        <p className="text-lg font-bold text-[var(--brand-deep)]">Daily limit reached!</p>
        <p className="text-sm text-[var(--ink-soft)]">Come back tomorrow for new words.</p>
      </div>
    );
  }

  if (phase === "claimed") {
    return (
      <div className="text-center py-10 space-y-4">
        <p className="text-5xl">🎉</p>
        <p className="text-xl font-black text-[var(--brand-deep)]">Points Claimed!</p>
        <p className="text-2xl font-bold text-[var(--brand)]">+{pointsEarned} Points</p>
        <p className="text-sm text-[var(--ink-soft)]">Points added to your balance. Play again tomorrow!</p>
      </div>
    );
  }

  if (phase === "won") {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-5xl">🏅</p>
        <p className="text-xl font-black text-[var(--brand-deep)]">Correct! The word was {word}!</p>
        <p className="text-sm text-[var(--ink-soft)]">Solved in {tries} tr{tries !== 1 ? "ies" : "y"}!</p>
        {msg && <p className="text-sm text-red-500">{msg}</p>}
        <button
          onClick={claimPoints}
          className="rounded-full bg-[var(--brand)] px-8 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90"
        >
          Claim 60 Points 🎁
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[var(--brand)]/5 border border-[var(--brand)]/15 p-5 text-center">
        <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-widest mb-2">Unscramble this word</p>
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {scrambled.split("").map((ch, i) => (
            <span
              key={i}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border-2 border-[var(--brand)]/30 text-lg font-black text-[var(--brand-deep)] shadow-sm"
            >
              {ch}
            </span>
          ))}
        </div>
        <p className="text-xs text-[var(--ink-soft)] mt-3">{word.length} letters · Tries: {tries}</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          maxLength={word.length}
          placeholder="Type your answer..."
          className={`flex-1 rounded-xl border-2 px-4 py-3 text-base font-bold uppercase tracking-widest focus:outline-none transition ${
            hint === "wrong"
              ? "border-red-400 bg-red-50 text-red-700"
              : "border-black/15 bg-white focus:border-[var(--brand)]"
          }`}
        />
        <button
          onClick={submit}
          disabled={!input.trim()}
          className="rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          Check!
        </button>
      </div>

      {hint === "wrong" && (
        <p className="text-sm text-center text-red-500 font-semibold">❌ Not quite — try again!</p>
      )}

      {playsLeft !== null && (
        <p className="text-xs text-center text-[var(--ink-soft)]">{playsLeft} plays left today</p>
      )}
    </div>
  );
}
