import { redirect } from "next/navigation";
import { getSiteContent } from "@/lib/site-content";
import Link from "next/link";
import WordScramble from "@/components/WordScramble";

export const metadata = { title: "Word Scramble — Deals Hub" };

export default async function WordScramblePage() {
  const content = await getSiteContent();
  if (!content.features.dealsHub || !content.dealsHub.enabled) redirect("/");
  if (content.dealsHub.wordScramble?.enabled === false) redirect("/deals");

  return (
    <main className="min-h-screen bg-[var(--surface)] px-4 py-10">
      <div className="max-w-lg mx-auto">
        <Link href="/deals" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--brand)] mb-6 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Back to Deals
        </Link>
        <div className="text-center mb-6">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-auto mb-2 text-[var(--brand)]"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          <h1 className="text-2xl font-black text-[var(--brand-deep)]">Word Scramble</h1>
          <p className="text-sm text-[var(--ink-soft)] mt-1">Unscramble the mystery word to earn 60 points!</p>
        </div>
        <div className="rounded-2xl bg-[var(--surface-strong)] border border-[var(--ink)]/10 shadow-sm p-5">
          <WordScramble />
        </div>
      </div>
    </main>
  );
}
