import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content";
import { getProductBySlug } from "@/lib/store-data";

export async function GET(
  _req: Request,
  context: RouteContext<"/api/products/[slug]">
) {
  const { slug } = await context.params;
  const { products } = await getSiteContent();
  const item = getProductBySlug(products, slug);

  if (!item) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}
