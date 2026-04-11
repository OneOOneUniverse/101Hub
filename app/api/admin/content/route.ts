import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { saveSiteContent, sanitizeSiteContent, getSiteContent } from "@/lib/site-content";
import type { SiteContent } from "@/lib/site-content-types";
import { isCurrentUserAdmin } from "@/lib/auth";

function getDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

function validateContent(content: SiteContent): string | null {
  const productIds = content.products.map((product) => product.id.trim()).filter(Boolean);
  const productSlugs = content.products.map((product) => product.slug.trim()).filter(Boolean);
  const serviceIds = content.services.map((service) => service.id.trim()).filter(Boolean);
  const slideIds = content.promoSlides.map((slide) => slide.id.trim()).filter(Boolean);
  const highlightIds = content.home.highlights.map((item) => item.id.trim()).filter(Boolean);

  const duplicateProductIds = getDuplicates(productIds);
  if (duplicateProductIds.length) {
    return `Duplicate product ids: ${duplicateProductIds.join(", ")}`;
  }

  const duplicateProductSlugs = getDuplicates(productSlugs);
  if (duplicateProductSlugs.length) {
    return `Duplicate product slugs: ${duplicateProductSlugs.join(", ")}`;
  }

  const duplicateServiceIds = getDuplicates(serviceIds);
  if (duplicateServiceIds.length) {
    return `Duplicate service ids: ${duplicateServiceIds.join(", ")}`;
  }

  const duplicateSlideIds = getDuplicates(slideIds);
  if (duplicateSlideIds.length) {
    return `Duplicate promo slide ids: ${duplicateSlideIds.join(", ")}`;
  }

  const duplicateHighlightIds = getDuplicates(highlightIds);
  if (duplicateHighlightIds.length) {
    return `Duplicate highlight ids: ${duplicateHighlightIds.join(", ")}`;
  }

  if (!content.products.every((product) => product.name.trim() && product.slug.trim())) {
    return "Every product needs a name and slug.";
  }

  if (!content.services.every((service) => service.name.trim())) {
    return "Every service needs a name.";
  }

  const knownProductIds = new Set(content.products.map((product) => product.id));
  const invalidFlashSaleIds = content.flashSale.featuredProductIds.filter((id) => !knownProductIds.has(id));

  if (invalidFlashSaleIds.length) {
    return `Flash sale includes unknown product ids: ${invalidFlashSaleIds.join(", ")}`;
  }

  return null;
}

async function requireAdmin() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return null;
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) {
    return authError;
  }

  const content = await getSiteContent();
  return NextResponse.json(content);
}

export async function PUT(request: Request) {
  const authError = await requireAdmin();
  if (authError) {
    return authError;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const content = sanitizeSiteContent(body);
  const validationError = validateContent(content);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const saved = await saveSiteContent(content);
    // Invalidate all pages that display site content so the Router Cache
    // and Full Route Cache serve fresh data after the admin saves changes.
    revalidatePath("/", "layout");
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save content.";
    console.error("Content save error:", error);
    return NextResponse.json({ error: `Save failed: ${message}` }, { status: 500 });
  }
}