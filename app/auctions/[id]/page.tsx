import AuctionDetailClient from "./AuctionDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AuctionDetailPage({ params }: Props) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return (
      <main className="mx-auto max-w-5xl px-3 py-12 text-center">
        <p className="text-2xl font-black text-[var(--ink)]">Invalid auction ID</p>
      </main>
    );
  }

  return <AuctionDetailClient id={numId} />;
}
