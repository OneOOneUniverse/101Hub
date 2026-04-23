import { redirect } from "next/navigation";
import { getSiteContent } from "@/lib/site-content";
import Link from "next/link";
import MemoryMatch from "@/components/MemoryMatch";

export const metadata = { title: "Memory Match — Deals Hub" };

export default async function MemoryMatchPage() {
  const content = await getSiteContent();
  if (!content.features.dealsHub || !content.dealsHub.enabled) redirect("/");

  return (
    <main className="min-h-screen bg-[var(--surface)] px-4 py-10">
      <div className="max-w-lg mx-auto">
        <Link href="/deals" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--brand)] mb-6 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Back to Deals
        </Link>
        <div className="text-center mb-6">
          <p className="text-5xl mb-2">🃏</p>
          <h1 className="text-2xl font-black text-[var(--brand-deep)]">Memory Match</h1>
          <p className="text-sm text-[var(--ink-soft)] mt-1">Flip cards and match all pairs to earn 75 points!</p>
        </div>
        <div className="rounded-2xl bg-white border border-black/10 shadow-sm p-5">
          <MemoryMatch />
        </div>
      </div>
    </main>
  );
}
