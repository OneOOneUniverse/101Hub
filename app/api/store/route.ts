import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content";

export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json(content, {
    headers: {
      "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
    },
  });
}