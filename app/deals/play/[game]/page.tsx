export const dynamic = "force-dynamic";

import { getSiteContent } from "@/lib/site-content";
import { redirect } from "next/navigation";
import GamePageClient from "./GamePageClient";

type Props = {
  params: Promise<{ game: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { game } = await params;
  const label = game === "spin" ? "Spin the Wheel" : game === "scratch" ? "Scratch Card" : "Daily Trivia";
  return { title: `${label} — Deals Hub` };
}

export default async function GamePlayPage({ params }: Props) {
  const { game } = await params;

  if (game !== "spin" && game !== "scratch" && game !== "trivia") {
    redirect("/deals");
  }

  const content = await getSiteContent();

  if (!content.features.dealsHub || !content.dealsHub.enabled) {
    redirect("/");
  }

  const gameConfig =
    game === "spin"
      ? content.dealsHub.spinWheel
      : game === "scratch"
        ? content.dealsHub.scratchCard
        : content.dealsHub.trivia;

  if (!gameConfig.enabled) {
    redirect("/deals");
  }

  return (
    <GamePageClient
      game={game as "spin" | "scratch" | "trivia"}
      dealsHub={content.dealsHub}
    />
  );
}
