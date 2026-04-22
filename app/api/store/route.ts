import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content";

export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json(content, {
    headers: {
      // Allow browsers/CDN to serve a cached response for up to 30s,
      // and serve stale while revalidating in the background for another 60s.
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}