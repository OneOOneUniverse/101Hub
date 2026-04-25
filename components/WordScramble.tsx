"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";

export default function WordScramble() {
  const { isSignedIn } = useUser();
  // Session state — word lives on the server, never in the browser
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scrambledWord, setScrambledWord] = useState<string>("");
  const [wordLength, setWordLength] = useState<number>(0);
  const sessionStartRef = useRef<number>(0);

  const [input, setInput] = useState("");
  const [tries, setTries] = useState(0);
  const [wrongHint, setWrongHint] = useState(false);
  const [phase, setPhase] = useState<"loading" | "playing" | "submitting" | "claimed" | "limit">("loading");
  const [pointsEarned, setPointsEarned] = useState(0);
  const [playsLeft, setPlaysLeft] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const startNewGame = useCallback(() => {
    setPhase("loading");
    setInput("");
    setTries(0);
    setWrongHint(false);
    setMsg("");
    setSessionId(null);
    setScrambledWord("");
    setWordLength(0);
    fetch("/api/deals/game-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameType: "scramble" }),
    })
      .then((r) => r.json())
      .then((d: { sessionId?: string; scrambledWord?: string; wordLength?: number; error?: string; limitReached?: boolean }) => {
        if (d.limitReached || !d.sessionId) {
          setPhase("limit");
        } else {
          setSessionId(d.sessionId);
          setScrambledWord(d.scrambledWord ?? "");
          setWordLength(d.wordLength ?? 0);
          sessionStartRef.current = Date.now();
          setPhase("playing");
        }
      })
      .catch(() => setPhase("playing"));
  }, []);

  useEffect(() => {
    startNewGame();
    if (isSignedIn) {
      fetch("/api/deals/minigame?game=scramble")
        .then((r) => r.json())
        .then((d: { playsLeft?: number }) => {
          if (typeof d.playsLeft === "number") setPlaysLeft(d.playsLeft);
        })
        .catch(() => {});
    }
  }, [isSignedIn, startNewGame]);

  const submit = useCallback(() => {
    const attempt = input.trim().toUpperCase();
    if (!attempt || !sessionId) return;
    setTries((t) => t + 1);
    setPhase("submitting");
    const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);

    // Server verifies the answer against the stored word and awards points if correct
    fetch("/api/deals/minigame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameType: "scramble", sessionId, answer: attempt, elapsedSeconds }),
    })
      .then((r) => r.json())
      .then((d: { pointsEarned?: number; error?: string; limitReached?: boolean }) => {
        if (d.pointsEarned !== undefined) {
          // Server confirmed correct answer and awarded points
          setPointsEarned(d.pointsEarned);
          // Optimistically decrement then re-fetch to confirm
          setPlaysLeft((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
          if (isSignedIn) {
            fetch("/api/deals/minigame?game=scramble")
              .then((r) => r.json())
              .then((p: { playsLeft?: number }) => { if (typeof p.playsLeft === "number") setPlaysLeft(p.playsLeft); })
              .catch(() => {});
          }
          setPhase("claimed");
        } else if (d.limitReached) {
          setPhase("limit");
        } else {
          // Wrong answer or other error
          setPhase("playing");
          setWrongHint(true);
          setInput("");
          setTimeout(() => setWrongHint(null as unknown as boolean), 800);
          if (d.error && d.error !== "Incorrect answer.") setMsg(d.error);
        }
      })
      .catch(() => {
        setPhase("playing");
        setWrongHint(true);
        setInput("");
        setTimeout(() => setWrongHint(null as unknown as boolean), 800);
      });
  }, [input, sessionId, isSignedIn]);

  if (phase === "loading") {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-4xl animate-pulse">🔤</p>
        <p className="text-sm text-[var(--ink-soft)]">Loading word…</p>
      </div>
    );
  }

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
        <p className="text-sm text-[var(--ink-soft)]">
          {playsLeft !== null && playsLeft > 0 ? "Ready for another word?" : "Points added to your balance. Come back tomorrow!"}
        </p>
        {(playsLeft === null || playsLeft > 0) && (
          <button
            onClick={startNewGame}
            className="rounded-full border border-[var(--brand)] px-6 py-2.5 text-sm font-bold text-[var(--brand)] transition hover:bg-[var(--brand)]/10"
          >
            Play Again 🔤
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[var(--brand)]/5 border border-[var(--brand)]/15 p-5 text-center">
        <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-widest mb-2">Unscramble this word</p>
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {scrambledWord.split("").map((ch, i) => (
            <span
              key={i}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--surface-strong)] border-2 border-[var(--brand)]/30 text-lg font-black text-[var(--brand-deep)] shadow-sm"
            >
              {ch}
            </span>
          ))}
        </div>
        <p className="text-xs text-[var(--ink-soft)] mt-3">{wordLength} letters · Tries: {tries}</p>
      </div>

      {msg && <p className="text-sm text-center text-red-500">{msg}</p>}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          maxLength={wordLength || 20}
          placeholder="Type your answer..."
          disabled={phase === "submitting"}
          className={`flex-1 rounded-xl border-2 px-4 py-3 text-base font-bold uppercase tracking-widest focus:outline-none transition ${
            wrongHint
              ? "border-red-400 bg-red-50 text-red-700"
              : "border-[var(--ink)]/15 bg-[var(--surface-strong)] focus:border-[var(--brand)]"
          }`}
        />
        <button
          onClick={submit}
          disabled={!input.trim() || phase === "submitting"}
          className="rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40 w-full sm:w-auto"
        >
          {phase === "submitting" ? "Checking…" : "Check!"}
        </button>
      </div>

      {wrongHint && (
        <p className="text-sm text-center text-red-500 font-semibold">❌ Not quite — try again!</p>
      )}

      {playsLeft !== null && (
        <p className="text-xs text-center text-[var(--ink-soft)]">{playsLeft} plays left today</p>
      )}
    </div>
  );
}
