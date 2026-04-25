"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";

const EMOJI_PAIRS = ["🍎", "🍊", "🍋", "🍇", "🍓", "🎮", "🎯", "🏆"];

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

function buildDeck(): Card[] {
  const emojis = [...EMOJI_PAIRS, ...EMOJI_PAIRS];
  for (let i = emojis.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emojis[i], emojis[j]] = [emojis[j], emojis[i]];
  }
  return emojis.map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
}

export default function MemoryMatch() {
  const { isSignedIn } = useUser();
  const [cards, setCards] = useState<Card[]>(buildDeck);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<"loading" | "playing" | "won" | "claiming" | "claimed" | "limit">("loading");
  const [pointsEarned, setPointsEarned] = useState(0);
  const [playsLeft, setPlaysLeft] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  // Server-side session state (prevents console forging)
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionStartRef = useRef<number>(0);

  useEffect(() => {
    if (!isSignedIn) { setPhase("playing"); return; }
    // Create a server-side session; this also checks the daily limit
    fetch("/api/deals/game-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameType: "memory" }),
    })
      .then((r) => r.json())
      .then((d: { sessionId?: string; error?: string; limitReached?: boolean }) => {
        if (d.limitReached || !d.sessionId) {
          setPhase("limit");
        } else {
          setSessionId(d.sessionId);
          sessionStartRef.current = Date.now();
          setPhase("playing");
        }
      })
      .catch(() => setPhase("playing")); // graceful degradation if network fails

    fetch("/api/deals/minigame?game=memory")
      .then((r) => r.json())
      .then((d: { playsLeft?: number }) => {
        if (typeof d.playsLeft === "number") setPlaysLeft(d.playsLeft);
      })
      .catch(() => {});
  }, [isSignedIn]);

  const claimPoints = useCallback(async () => {
    if (!isSignedIn) { setMsg("Sign in to save your points!"); return; }
    if (!sessionId) { setMsg("Session error — please refresh and try again."); return; }
    setPhase("claiming");
    const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    try {
      const res = await fetch("/api/deals/minigame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "memory", sessionId, moves, elapsedSeconds }),
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
  }, [isSignedIn, sessionId, moves]);

  const flip = useCallback((id: number) => {
    if (phase !== "playing") return;
    setCards((prev) => {
      const card = prev[id];
      if (!card || card.flipped || card.matched) return prev;
      const next = prev.map((c, i) => (i === id ? { ...c, flipped: true } : c));
      return next;
    });
    setSelected((prev) => {
      if (prev.length === 1 && prev[0] !== id) return [...prev, id];
      if (prev.length === 0) return [id];
      return prev;
    });
  }, [phase]);

  useEffect(() => {
    if (selected.length !== 2) return;
    const [a, b] = selected;
    const cardA = cards[a];
    const cardB = cards[b];
    setMoves((m) => m + 1);
    if (cardA && cardB && cardA.emoji === cardB.emoji) {
      setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
      setSelected([]);
    } else {
      const timer = setTimeout(() => {
        setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
        setSelected([]);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [selected, cards]);

  useEffect(() => {
    if (cards.every((c) => c.matched)) {
      setPhase("won");
    }
  }, [cards]);

  const reset = () => {
    if (!isSignedIn) {
      setCards(buildDeck());
      setSelected([]);
      setMoves(0);
      setMsg("");
      setPhase("playing");
      return;
    }
    setPhase("loading");
    setCards(buildDeck());
    setSelected([]);
    setMoves(0);
    setMsg("");
    // Create a fresh session for the new game
    fetch("/api/deals/game-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameType: "memory" }),
    })
      .then((r) => r.json())
      .then((d: { sessionId?: string; error?: string; limitReached?: boolean }) => {
        if (d.limitReached || !d.sessionId) {
          setPhase("limit");
        } else {
          setSessionId(d.sessionId);
          sessionStartRef.current = Date.now();
          setPhase("playing");
        }
      })
      .catch(() => setPhase("playing"));
  };

  if (phase === "loading") {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-4xl animate-pulse">🃏</p>
        <p className="text-sm text-[var(--ink-soft)]">Starting game…</p>
      </div>
    );
  }

  if (phase === "limit") {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-4xl">🃏</p>
        <p className="text-lg font-bold text-[var(--brand-deep)]">Daily limit reached!</p>
        <p className="text-sm text-[var(--ink-soft)]">Come back tomorrow to play Memory Match again.</p>
      </div>
    );
  }

  if (phase === "claimed") {
    return (
      <div className="text-center py-10 space-y-4">
        <p className="text-5xl">🏆</p>
        <p className="text-xl font-black text-[var(--brand-deep)]">You won!</p>
        <p className="text-2xl font-bold text-[var(--brand)]">+{pointsEarned} Points</p>
        <p className="text-sm text-[var(--ink-soft)]">Points added to your balance. Play again tomorrow!</p>
        <button onClick={reset} className="mt-2 rounded-full bg-[var(--brand)] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
          Play Again
        </button>
      </div>
    );
  }

  if (phase === "won") {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-5xl">🎉</p>
        <p className="text-xl font-black text-[var(--brand-deep)]">All matched in {moves} moves!</p>
        {msg && <p className="text-sm text-red-500">{msg}</p>}
        <button
          onClick={claimPoints}
          className="rounded-full bg-[var(--brand)] px-8 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90"
        >
          Claim 75 Points 🎁
        </button>
        {!isSignedIn && <p className="text-xs text-[var(--ink-soft)]">Sign in to save points</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[var(--ink-soft)]">Moves: <strong>{moves}</strong></span>
        {playsLeft !== null && (
          <span className="text-xs text-[var(--ink-soft)]">{playsLeft} plays left today</span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => flip(card.id)}
            disabled={card.flipped || card.matched || selected.length === 2}
            className={`aspect-square rounded-xl text-2xl sm:text-3xl font-bold transition-all duration-300 select-none border-2 ${
              card.matched
                ? "bg-green-100 border-green-300 text-green-600 scale-95"
                : card.flipped
                  ? "bg-white border-[var(--brand)] shadow-md"
                  : "bg-[var(--brand)]/10 border-[var(--brand)]/20 text-transparent hover:bg-[var(--brand)]/20 active:scale-95"
            }`}
          >
            {card.flipped || card.matched ? card.emoji : "?"}
          </button>
        ))}
      </div>
    </div>
  );
}
