"use client";

import { useState, useCallback } from "react";
import type { TriviaQuestion } from "@/lib/site-content-types";

type Props = {
  questions: TriviaQuestion[];
};

export default function DailyTrivia({ questions }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; correctIndex: number; pointsEarned: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [limitReached, setLimitReached] = useState(false);

  const question = questions[currentIndex];

  const submitAnswer = useCallback(async (answerIndex: number) => {
    if (!question || loading || result) return;
    setSelected(answerIndex);
    setLoading(true);

    try {
      const res = await fetch("/api/deals/trivia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, answerIndex }),
      });

      const data = (await res.json()) as { correct?: boolean; correctIndex?: number; pointsEarned?: number; error?: string; limitReached?: boolean };

      if (data.limitReached) {
        setLimitReached(true);
        return;
      }

      if (!res.ok) {
        alert(data.error ?? "Error submitting answer");
        setSelected(null);
        return;
      }

      setResult({ correct: data.correct!, correctIndex: data.correctIndex!, pointsEarned: data.pointsEarned! });
      setAnsweredIds((prev) => new Set(prev).add(question.id));
      if (data.pointsEarned) setTotalEarned((prev) => prev + data.pointsEarned!);
    } catch {
      alert("Network error — try again");
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [question, loading, result]);

  const nextQuestion = () => {
    // Find next unanswered question
    for (let i = 1; i <= questions.length; i++) {
      const idx = (currentIndex + i) % questions.length;
      if (!answeredIds.has(questions[idx].id)) {
        setCurrentIndex(idx);
        setSelected(null);
        setResult(null);
        return;
      }
    }
    // All answered
    setLimitReached(true);
  };

  if (limitReached || answeredIds.size >= questions.length) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-6 text-center space-y-3">
        <p className="text-4xl">🧠</p>
        <p className="text-lg font-bold text-[var(--brand-deep)]">All done for today!</p>
        <p className="text-sm text-[var(--ink-soft)]">
          You earned <span className="font-bold text-[var(--brand)]">{totalEarned} points</span> from trivia today. Come back tomorrow!
        </p>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--ink-soft)] uppercase tracking-wide">
          Question {answeredIds.size + 1} of {questions.length}
        </p>
        {totalEarned > 0 && (
          <p className="text-xs font-bold text-[var(--brand)]">+{totalEarned} pts earned</p>
        )}
      </div>

      <p className="text-lg font-bold text-[var(--brand-deep)]">{question.question}</p>
      <p className="text-xs text-[var(--ink-soft)]">+{question.pointsReward} points for correct answer</p>

      <div className="grid gap-2">
        {question.options.map((option, i) => {
          let borderColor = "border-black/10";
          let bg = "bg-white";

          if (result) {
            if (i === result.correctIndex) {
              borderColor = "border-emerald-500";
              bg = "bg-emerald-50";
            } else if (i === selected && !result.correct) {
              borderColor = "border-red-500";
              bg = "bg-red-50";
            }
          } else if (i === selected) {
            borderColor = "border-[var(--brand)]";
            bg = "bg-[var(--brand)]/5";
          }

          return (
            <button
              key={i}
              onClick={() => submitAnswer(i)}
              disabled={loading || !!result}
              className={`w-full rounded-xl border-2 ${borderColor} ${bg} px-4 py-3 text-left text-sm font-semibold transition hover:border-[var(--brand)] disabled:cursor-not-allowed`}
            >
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/5 text-xs font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {result && (
        <div className={`rounded-xl p-4 text-center ${result.correct ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          <p className="font-bold">{result.correct ? `Correct! +${result.pointsEarned} points` : "Wrong answer!"}</p>
          <button
            onClick={nextQuestion}
            className="mt-2 rounded-full bg-[var(--brand)] px-6 py-2 text-xs font-bold text-white hover:bg-[var(--brand-deep)]"
          >
            Next Question
          </button>
        </div>
      )}
    </div>
  );
}
