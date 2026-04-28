import type { Metadata } from "next";
import { Suspense } from "react";
import { getSiteContent } from "@/lib/site-content";
import BookServiceClient from "./BookServiceClient";

export const revalidate = 60;

type BookPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { id } = await params;
  const content = await getSiteContent();
  const service = content.services?.find((s) => s.id === id);

  if (!service) {
    return { title: "Book Service | 101Hub" };
  }

  return {
    title: `Book: ${service.name} | 101Hub Services`,
    description: `Request ${service.name} — fill in your details and make payment to confirm your booking.`,
  };
}

export default function BookServicePage() {
  return (
    <Suspense
      fallback={
        <section className="panel p-4 sm:p-6">
          <h1 className="text-2xl font-black sm:text-3xl">Book Service</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Loading...</p>
        </section>
      }
    >
      <BookServiceClient />
    </Suspense>
  );
}
