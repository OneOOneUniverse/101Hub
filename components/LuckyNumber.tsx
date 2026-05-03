"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

function DiceIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-auto text-[var(--brand)]">
      <rect x="2" y="2" width="20" height="20" rx="3"/>
      <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="16" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="12" cy="12" r="1.2" fill="currentColor"/>
      <circle cx="8" cy="16" r="1.2" fill="currentColor"/>
      <circle cx="16" cy="16" r="1.2" fill="currentColor"/>
    </svg>
  );
}
function TrophyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-auto text-[var(--brand)]">
      <path d="M6 9H4a2 2 0 01-2-2V5h4"/>
      <path d="M18 9h2a2 2 0 002-2V5h-4"/>
      <path d="M12 17c-2.67 0-8-1.34-8-4V5h16v8c0 2.66-5.33 4-8 4z"/>
      <path d="M12 17v4"/>
      <path d="M8 21h8"/>
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-auto text-[var(--brand)]">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  );
}
function SadIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-auto text-[var(--ink-soft)]">
      <circle cx="12" cy="12" r="10"/>
      <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
      <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2"/>
      <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2"/>
    </svg>
  );
}
function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="inline-block">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  );
}
function ArrowDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="inline-block">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  );
}


export default function LuckyNumber() {
  const { isSignedIn } = useUser();
  // Session state — secret lives on the server, never in the browser
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [maxTries, setMaxTries] = useState(5);
  const [rangeMax, setRangeMax] = useState(20);
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState<{ num: number; hint: "too_low" | "too_high" | "correct" }[]>([]);
  const [phase, setPhase] = useState<"loading" | "playing" | "won" | "lost" | "claimed" | "limit">("loading");
  const [isClaiming, setIsClaiming] = useState(false);
  const [isGuessing, setIsGuessing] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [playsLeft, setPlaysLeft] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  // The revealed secret (shown after loss only, from server response)
  const [revealedSecret, setRevealedSecret] = useState<number | null>(null);

  const startNewGame = useCallback(() => {
    setPhase("loading");
    setGuesses([]);
    setInput("");
    setMsg("");
    setRevealedSecret(null);
    setSessionId(null);
    fetch("/api/deals/game-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameType: "lucky" }),
    })
      .then((r) => r.json())
      .then((d: { sessionId?: string; maxTries?: number; rangeMax?: number; error?: string; limitReached?: boolean }) => {
        if (d.limitReached || !d.sessionId) {
          setPhase("limit");
        } else {
          setSessionId(d.sessionId);
          if (typeof d.maxTries === "number") setMaxTries(d.maxTries);
          if (typeof d.rangeMax === "number") setRangeMax(d.rangeMax);
          setPhase("playing");
        }
      })
      .catch(() => setPhase("playing"));
  }, []);

  useEffect(() => {
    startNewGame();
    if (isSignedIn) {
      fetch("/api/deals/minigame?game=lucky")
        .then((r) => r.json())
        .then((d: { playsLeft?: number }) => {
          if (typeof d.playsLeft === "number") setPlaysLeft(d.playsLeft);
        })
        .catch(() => {});
    }
  }, [isSignedIn, startNewGame]);

  const claimPoints = useCallback(async () => {
    if (!isSignedIn) { setMsg("Sign in to save your points!"); return; }
    if (!sessionId) { setMsg("Session error — please refresh."); return; }
    setIsClaiming(true);
    try {
      const res = await fetch("/api/deals/minigame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "lucky", sessionId }),
      });
      const data = (await res.json()) as { pointsEarned?: number; error?: string; limitReached?: boolean };
      if (data.limitReached) { setPhase("limit"); return; }
      if (!res.ok) { setMsg(data.error ?? "Error"); return; }
      setPointsEarned(data.pointsEarned ?? 0);
      // Optimistically decrement then re-fetch to confirm
      setPlaysLeft((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
      if (isSignedIn) {
        fetch("/api/deals/minigame?game=lucky")
          .then((r) => r.json())
          .then((d: { playsLeft?: number }) => { if (typeof d.playsLeft === "number") setPlaysLeft(d.playsLeft); })
          .catch(() => {});
      }
      setPhase("claimed");
    } catch {
      setMsg("Network error — try again");
    } finally {
      setIsClaiming(false);
    }
  }, [isSignedIn, sessionId]);

  const guess = useCallback(async () => {
    const num = parseInt(input.trim(), 10);
    if (isNaN(num) || num < 1 || num > rangeMax) return;
    if (!sessionId || isGuessing) return;
    setInput("");
    setIsGuessing(true);

    try {
      // Send guess to server — server validates against stored secret
      const res = await fetch("/api/deals/game-session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, guess: num }),
      });
      const data = (await res.json()) as {
        correct?: boolean;
        hint?: "too_low" | "too_high" | "correct";
        guessesLeft?: number;
        won?: boolean;
        lost?: boolean;
        secret?: number;
        error?: string;
      };

      if (!res.ok) { setMsg(data.error ?? "Error processing guess"); return; }

      const hint = data.hint ?? (data.correct ? "correct" : "too_low");
      const newGuesses = [...guesses, { num, hint }];
      setGuesses(newGuesses);

      if (data.won) {
        setPhase("won");
      } else if (data.lost) {
        if (typeof data.secret === "number") setRevealedSecret(data.secret);
        setPhase("lost");
      }
    } catch {
      setMsg("Network error — please try again");
    } finally {
      setIsGuessing(false);
    }
  }, [input, sessionId, guesses, rangeMax, isGuessing]);

  if (phase === "loading") {
    return (
      <div className="text-center py-10 space-y-3">
        <div className="py-2"><DiceIcon /></div>
        <p className="text-sm text-[var(--ink-soft)]">Starting game…</p>
      </div>
    );
  }

  if (phase === "limit") {
    return (
      <div className="text-center py-10 space-y-3">
        <div className="py-2"><DiceIcon /></div>
        <p className="text-lg font-bold text-[var(--brand-deep)]">Daily limit reached!</p>
        <p className="text-sm text-[var(--ink-soft)]">Come back tomorrow to play Lucky Number again.</p>
      </div>
    );
  }

  if (phase === "claimed") {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="py-2"><TrophyIcon /></div>
        <p className="text-xl font-black text-[var(--brand-deep)]">Points Claimed!</p>
        <p className="text-2xl font-bold text-[var(--brand)]">+{pointsEarned} Points</p>
        <p className="text-sm text-[var(--ink-soft)]">
          {playsLeft !== null && playsLeft > 0 ? "Great job! Ready for another round?" : "Points added to your balance. Come back tomorrow!"}
        </p>
        {(playsLeft === null || playsLeft > 0) && (
          <button onClick={startNewGame} className="rounded-full border border-[var(--brand)] px-6 py-2.5 text-sm font-bold text-[var(--brand)] transition hover:bg-[var(--brand)]/10">
            Play Again
          </button>
        )}
      </div>
    );
  }

  if (phase === "won") {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="py-2"><TargetIcon /></div>
        <p className="text-xl font-black text-[var(--brand-deep)]">Correct! You got it in {guesses.length} guess{guesses.length !== 1 ? "es" : ""}!</p>
        <p className="text-sm text-[var(--ink-soft)]">Great job!</p>
        {msg && <p className="text-sm text-red-500">{msg}</p>}
        <button
          onClick={claimPoints}
          disabled={isClaiming}
          className="rounded-full bg-[var(--brand)] px-8 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90"
        >
          {isClaiming ? "Claiming…" : "Claim Points"}
        </button>
      </div>
    );
  }

  if (phase === "lost") {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="py-2"><SadIcon /></div>
        <p className="text-xl font-black text-[var(--brand-deep)]">
          Out of guesses!{revealedSecret !== null ? ` It was ${revealedSecret}.` : ""}
        </p>
        <p className="text-sm text-[var(--ink-soft)]">Better luck next time!</p>
        <button
          onClick={startNewGame}
          className="rounded-full bg-[var(--brand)] px-8 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    );
  }

  const guessesLeft = maxTries - guesses.length;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[var(--brand)]/5 border border-[var(--brand)]/15 p-4 text-center">
        <p className="text-sm font-bold text-[var(--brand-deep)]">Guess a number between 1 and {rangeMax}</p>
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
              {g.num} {g.hint === "too_low" ? <><ArrowUpIcon /> Too low</> : <><ArrowDownIcon /> Too high</>}
            </span>
          ))}
        </div>
      )}

      {msg && <p className="text-sm text-center text-red-500">{msg}</p>}

      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          max={rangeMax}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isGuessing && guess()}
          placeholder={`1–${rangeMax}`}
          className="flex-1 rounded-xl border border-[var(--ink)]/15 bg-[var(--surface-strong)] px-4 py-3 text-base font-bold focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
        />
        <button
          onClick={guess}
          disabled={!input.trim() || isGuessing}
          className="rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {isGuessing ? "…" : "Guess!"}
        </button>
      </div>

      {playsLeft !== null && (
        <p className="text-xs text-center text-[var(--ink-soft)]">{playsLeft} plays left today</p>
      )}
    </div>
  );
}
