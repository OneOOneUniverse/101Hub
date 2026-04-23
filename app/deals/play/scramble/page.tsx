import { redirect } from "next/navigation";
import { getSiteContent } from "@/lib/site-content";
import Link from "next/link";
import WordScramble from "@/components/WordScramble";

export const metadata = { title: "Word Scramble — Deals Hub" };

export default async function WordScramblePage() {
  const content = await getSiteContent();
  if (!content.features.dealsHub || !content.dealsHub.enabled) redirect("/");

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#071a0f] to-[#0d2d1a] px-4 py-10">
      <div className="max-w-lg mx-auto">
        <Link href="/deals" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-6 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Back to Deals
        </Link>
        <div className="text-center mb-6">
          <p className="text-5xl mb-2">🔤</p>
          <h1 className="text-2xl font-black text-white">Word Scramble</h1>
          <p className="text-sm text-white/50 mt-1">Unscramble the mystery word to earn 60 points!</p>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5">
          <WordScramble />
        </div>
      </div>
    </main>
  );
}
