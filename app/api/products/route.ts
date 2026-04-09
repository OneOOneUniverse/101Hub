import { NextRequest, NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content";

export async function GET(request: NextRequest) {
  const { products } = await getSiteContent();
  const query = request.nextUrl.searchParams.get("q")?.toLowerCase().trim() || "";
  const category = request.nextUrl.searchParams.get("category") || "All";
  const sort = request.nextUrl.searchParams.get("sort") || "featured";

  let result = [...products];

  if (category !== "All") {
    result = result.filter((item) => item.category === category);
  }

  if (query) {
    result = result.filter((item) => {
      const haystack = `${item.name} ${item.description}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  if (sort === "price-low") {
    result.sort((a, b) => a.price - b.price);
  } else if (sort === "price-high") {
    result.sort((a, b) => b.price - a.price);
  } else if (sort === "rating") {
    result.sort((a, b) => b.rating - a.rating);
  }

  return NextResponse.json({ items: result, total: result.length });
}
