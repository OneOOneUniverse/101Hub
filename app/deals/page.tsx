import { getSiteContent } from "@/lib/site-content";
import { redirect } from "next/navigation";
import DealsHubClient from "./DealsHubClient";

export const metadata = { title: "Deals Hub — 101Hub" };

export default async function DealsHubPage() {
  const content = await getSiteContent();

  if (!content.features.dealsHub || !content.dealsHub.enabled) {
    redirect("/");
  }

  return <DealsHubClient dealsHub={content.dealsHub} products={content.products} />;
}
