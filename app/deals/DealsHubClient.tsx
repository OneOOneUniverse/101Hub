"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import type { DealsHubContent, Product, SpinWheelSlice } from "@/lib/site-content-types";
import SpinWheel from "@/components/SpinWheel";
import ScratchCard from "@/components/ScratchCard";
import DailyTrivia from "@/components/DailyTrivia";

type Props = {
  dealsHub: DealsHubContent;
  products: Product[];
};

export default function DealsHubClient({ dealsHub, products }: Props) {
  const { isSignedIn } = useUser();
  const [points, setPoints] = useState(0);
  const [activeTab, setActiveTab] = useState<"stores" | "games">("stores");
  const [prizeMessage, setPrizeMessage] = useState("");

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/deals/points")
      .then((r) => r.json())
      .then((d: { balance?: number }) => setPoints(d.balance ?? 0))
      .catch(() => {});
  }, [isSignedIn]);

  const refreshPoints = useCallback(() => {
    fetch("/api/deals/points")
      .then((r) => r.json())
      .then((d: { balance?: number }) => setPoints(d.balance ?? 0))
      .catch(() => {});
  }, []);

  const handlePrize = useCallback((prize: SpinWheelSlice) => {
    if (prize.type === "no_prize") {
      setPrizeMessage("No luck this time! Try again later.");
    } else if (prize.type === "points") {
      setPrizeMessage(`🎉 You won ${prize.value} points!`);
      refreshPoints();
    } else {
      setPrizeMessage(`🎉 You won: ${prize.label}! Check your prizes in your profile.`);
    }
    setTimeout(() => setPrizeMessage(""), 5000);
  }, [refreshPoints]);

  const enabledStores = dealsHub.specialStores.filter((s) => s.enabled);
  const hasGames = dealsHub.spinWheel.enabled || dealsHub.scratchCard.enabled || dealsHub.trivia.enabled;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <section className="text-center space-y-3">
        <p className="text-5xl">🎮</p>
        <h1 className="text-3xl font-black text-[var(--brand-deep)]">{dealsHub.title}</h1>
        <p className="text-[var(--ink-soft)] max-w-xl mx-auto">{dealsHub.description}</p>

        {isSignedIn && (
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)]/10 px-5 py-2">
            <span className="text-lg">🪙</span>
            <span className="font-bold text-[var(--brand-deep)]">{points.toLocaleString()} points</span>
            {points >= dealsHub.pointsPerCedi && (
              <span className="text-xs text-[var(--ink-soft)]">
                = GHS {Math.floor(points / dealsHub.pointsPerCedi)} discount
              </span>
            )}
          </div>
        )}
      </section>

      {/* Prize notification */}
      {prizeMessage && (
        <div className="mx-auto max-w-md rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center animate-fade-in">
          <p className="font-bold text-emerald-800">{prizeMessage}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => setActiveTab("stores")}
          className={`rounded-full px-6 py-2.5 text-sm font-bold transition ${
            activeTab === "stores"
              ? "bg-[var(--brand)] text-white"
              : "border border-[var(--brand)] text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
          }`}
        >
          🏪 Exclusive Stores
        </button>
        {hasGames && (
          <button
            onClick={() => setActiveTab("games")}
            className={`rounded-full px-6 py-2.5 text-sm font-bold transition ${
              activeTab === "games"
                ? "bg-[var(--brand)] text-white"
                : "border border-[var(--brand)] text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
            }`}
          >
            🎲 Games & Rewards
          </button>
        )}
      </div>

      {/* Stores Grid */}
      {activeTab === "stores" && (
        <section className="space-y-6">
          {enabledStores.length === 0 ? (
            <p className="text-center text-[var(--ink-soft)] py-12">No stores available at the moment. Check back soon!</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {enabledStores.map((store) => {
                const productCount = products.filter((p) => store.featuredProductIds.includes(p.id)).length;
                return (
                  <Link
                    key={store.id}
                    href={`/deals/store/${store.slug}`}
                    className="group rounded-2xl p-6 text-center shadow-md hover:shadow-xl transition-all hover:-translate-y-1"
                    style={{ backgroundColor: store.bgColor, color: store.textColor }}
                  >
                    <p className="text-4xl">{store.emoji}</p>
                    <h3 className="mt-3 text-lg font-black">{store.name}</h3>
                    <p className="mt-1 text-sm opacity-80">{store.description}</p>
                    <p className="mt-3 text-xs font-bold opacity-70">{productCount} product{productCount !== 1 ? "s" : ""}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Games */}
      {activeTab === "games" && (
        <section className="space-y-10">
          {!isSignedIn && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
              <p className="font-bold text-amber-800">
                Please <Link href="/login" className="underline">sign in</Link> to play games and earn points!
              </p>
            </div>
          )}

          {/* Spin the Wheel */}
          {dealsHub.spinWheel.enabled && (
            <div className="rounded-2xl border border-black/10 bg-white p-6 space-y-4">
              <div className="text-center">
                <p className="text-3xl">🎡</p>
                <h2 className="text-xl font-black text-[var(--brand-deep)]">{dealsHub.spinWheel.title}</h2>
                <p className="text-sm text-[var(--ink-soft)]">{dealsHub.spinWheel.description}</p>
              </div>
              <div className="flex justify-center">
                <SpinWheel slices={dealsHub.spinWheel.slices} onResult={handlePrize} disabled={!isSignedIn} />
              </div>
            </div>
          )}

          {/* Scratch Card */}
          {dealsHub.scratchCard.enabled && (
            <div className="rounded-2xl border border-black/10 bg-white p-6 space-y-4">
              <div className="text-center">
                <p className="text-3xl">🎟️</p>
                <h2 className="text-xl font-black text-[var(--brand-deep)]">{dealsHub.scratchCard.title}</h2>
                <p className="text-sm text-[var(--ink-soft)]">{dealsHub.scratchCard.description}</p>
              </div>
              <div className="flex justify-center">
                <ScratchCard onResult={handlePrize} disabled={!isSignedIn} />
              </div>
            </div>
          )}

          {/* Daily Trivia */}
          {dealsHub.trivia.enabled && dealsHub.trivia.questions.length > 0 && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl">🧠</p>
                <h2 className="text-xl font-black text-[var(--brand-deep)]">{dealsHub.trivia.title}</h2>
                <p className="text-sm text-[var(--ink-soft)]">{dealsHub.trivia.description}</p>
              </div>
              {isSignedIn ? (
                <DailyTrivia questions={dealsHub.trivia.questions} />
              ) : (
                <p className="text-center text-sm text-[var(--ink-soft)]">Sign in to play trivia</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
