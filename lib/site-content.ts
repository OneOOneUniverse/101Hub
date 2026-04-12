import "server-only";

import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import seedContent from "@/data/site-content.json";
import {
  type Category,
  type CategoryFeature,
  type DeliverySettings,
  type DeliveryType,
  type FAQ,
  type FlashSaleContent,
  type FooterContent,
  type HighlightCard,
  type HomeContent,
  type LocationDeliveryFee,
  type PaymentSettings,
  type Product,
  defaultProductCategories,
  type PromoSlide,
  type ServicePackage,
  type SiteContent,
  type SiteFeatures,
  type SmsTemplate,
} from "@/lib/site-content-types";
import { getSiteContentFromDb, saveSiteContentToDb } from "@/lib/site-content-db";

const DATA_FILE_PATH = path.join(process.cwd(), "data", "site-content.json");
const PRODUCT_IMAGE_ROOT = path.join(process.cwd(), "public", "img", "products");
const defaultContent = seedContent as SiteContent;

function toProductFolderName(product: Product): string {
  const source = product.slug.trim() || product.id.trim();
  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "product-unknown";
}

async function ensureProductImageFolders(products: Product[]): Promise<void> {
  await fs.mkdir(PRODUCT_IMAGE_ROOT, { recursive: true });

  const uniqueFolders = new Set<string>();

  for (const product of products) {
    uniqueFolders.add(path.join(PRODUCT_IMAGE_ROOT, toProductFolderName(product)));
  }

  await Promise.all(Array.from(uniqueFolders, (folderPath) => fs.mkdir(folderPath, { recursive: true })));
}

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toOptionalTextArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return cleaned.length ? cleaned : undefined;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizeProduct(product: unknown, index: number, fallback?: Product, customCategories?: Set<string>): Product {
  const candidate = typeof product === "object" && product !== null ? product as Partial<Product> : {};
  const isKnownCategory =
    defaultProductCategories.includes(candidate.category as typeof defaultProductCategories[number]) ||
    (typeof candidate.category === "string" && (customCategories?.has(candidate.category) ?? false));
  const category = isKnownCategory
    ? (candidate.category as Product["category"])
    : fallback?.category ?? defaultProductCategories[0];
  const images = toOptionalTextArray(candidate.images) ?? fallback?.images;
  const image = toOptionalText(candidate.image) ?? images?.[0] ?? fallback?.image;
  const rawSlug = toText(candidate.slug, fallback?.slug ?? `product-${index + 1}`);

  const rawDiscount = candidate.discount !== undefined ? toNumber(candidate.discount) : fallback?.discount;
  const discount = rawDiscount !== undefined && Number.isFinite(rawDiscount) && rawDiscount > 0 ? Math.min(100, rawDiscount) : undefined;

  const rawDeliveryFee = candidate.deliveryFee !== undefined ? toNumber(candidate.deliveryFee) : fallback?.deliveryFee;
  const deliveryFee = rawDeliveryFee !== undefined && Number.isFinite(rawDeliveryFee) && rawDeliveryFee >= 0 ? rawDeliveryFee : undefined;

  const noDeliveryFee = toBoolean(candidate.noDeliveryFee, fallback?.noDeliveryFee ?? false) || undefined;

  return {
    id: toText(candidate.id, fallback?.id ?? `product-${index + 1}`),
    slug: normalizeSlug(rawSlug),
    name: toText(candidate.name, fallback?.name ?? "Untitled product"),
    category,
    description: toText(candidate.description, fallback?.description ?? ""),
    price: toNumber(candidate.price, fallback?.price ?? 0),
    stock: Math.max(0, Math.trunc(toNumber(candidate.stock, fallback?.stock ?? 0))),
    rating: Math.min(5, Math.max(0, toNumber(candidate.rating, fallback?.rating ?? 0))),
    badge: toOptionalText(candidate.badge) ?? fallback?.badge,
    image,
    images,
    ...(discount !== undefined && { discount }),
    ...(deliveryFee !== undefined && { deliveryFee }),
    ...(noDeliveryFee && { noDeliveryFee }),
  };
}

function sanitizeService(service: unknown, index: number, fallback?: ServicePackage): ServicePackage {
  const candidate = typeof service === "object" && service !== null ? service as Partial<ServicePackage> : {};

  return {
    id: toText(candidate.id, fallback?.id ?? `service-${index + 1}`),
    name: toText(candidate.name, fallback?.name ?? "Untitled service"),
    turnaround: toText(candidate.turnaround, fallback?.turnaround ?? "Same day"),
    price: Math.max(0, toNumber(candidate.price, fallback?.price ?? 0)),
    details: toText(candidate.details, fallback?.details ?? ""),
    image: toOptionalText(candidate.image) ?? fallback?.image,
  };
}

function sanitizePromoSlide(slide: unknown, index: number, fallback?: PromoSlide): PromoSlide {
  const candidate = typeof slide === "object" && slide !== null ? slide as Partial<PromoSlide> : {};

  return {
    id: toText(candidate.id, fallback?.id ?? `promo-${index + 1}`),
    src: toText(candidate.src, fallback?.src ?? "/promo-1.svg"),
    alt: toText(candidate.alt, fallback?.alt ?? "Promotional banner"),
    title: toText(candidate.title, fallback?.title ?? "Untitled promo"),
    subtitle: toText(candidate.subtitle, fallback?.subtitle ?? ""),
    eventName: toOptionalText(candidate.eventName) ?? fallback?.eventName,
    actionUrl: toOptionalText(candidate.actionUrl) ?? fallback?.actionUrl,
    startDate: toOptionalText(candidate.startDate) ?? fallback?.startDate,
    endDate: toOptionalText(candidate.endDate) ?? fallback?.endDate,
  };
}

function sanitizeHighlight(highlight: unknown, index: number, fallback?: HighlightCard): HighlightCard {
  const candidate = typeof highlight === "object" && highlight !== null ? highlight as Partial<HighlightCard> : {};

  return {
    id: toText(candidate.id, fallback?.id ?? `highlight-${index + 1}`),
    title: toText(candidate.title, fallback?.title ?? "Highlight"),
    description: toText(candidate.description, fallback?.description ?? ""),
  };
}

function sanitizeFeatures(value: unknown, fallback: SiteFeatures): SiteFeatures {
  const candidate = typeof value === "object" && value !== null ? value as Partial<SiteFeatures> : {};

  return {
    promoSlider: toBoolean(candidate.promoSlider, fallback.promoSlider),
    flashSale: toBoolean(candidate.flashSale, fallback.flashSale),
    services: toBoolean(candidate.services, fallback.services),
    wishlist: toBoolean(candidate.wishlist, fallback.wishlist),
    reviews: toBoolean(candidate.reviews, fallback.reviews),
    cart: toBoolean(candidate.cart, fallback.cart),
    checkout: toBoolean(candidate.checkout, fallback.checkout),
  };
}

function sanitizeHome(value: unknown, fallback: HomeContent): HomeContent {
  const candidate = typeof value === "object" && value !== null ? value as Partial<HomeContent> : {};
  const sourceHighlights = Array.isArray(candidate.highlights) ? candidate.highlights : fallback.highlights;

  return {
    badge: toText(candidate.badge, fallback.badge),
    title: toText(candidate.title, fallback.title),
    description: toText(candidate.description, fallback.description),
    primaryCtaLabel: toText(candidate.primaryCtaLabel, fallback.primaryCtaLabel),
    primaryCtaHref: toText(candidate.primaryCtaHref, fallback.primaryCtaHref),
    secondaryCtaLabel: toText(candidate.secondaryCtaLabel, fallback.secondaryCtaLabel),
    secondaryCtaHref: toText(candidate.secondaryCtaHref, fallback.secondaryCtaHref),
    highlights: sourceHighlights.map((item, index) =>
      sanitizeHighlight(item, index, fallback.highlights[index])
    ),
  };
}

function sanitizeFlashSale(value: unknown, fallback: FlashSaleContent): FlashSaleContent {
  const candidate = typeof value === "object" && value !== null ? value as Partial<FlashSaleContent> : {};
  const candidateEndsAt = typeof candidate.endsAt === "string" ? candidate.endsAt : "";
  const fallbackEndsAt = typeof fallback.endsAt === "string" ? fallback.endsAt : "";

  const parsedEndsAt = candidateEndsAt ? new Date(candidateEndsAt) : new Date(fallbackEndsAt);
  const normalizedEndsAt = Number.isFinite(parsedEndsAt.getTime())
    ? parsedEndsAt.toISOString()
    : undefined;

  return {
    bannerEyebrow: toText(candidate.bannerEyebrow, fallback.bannerEyebrow),
    bannerTitle: toText(candidate.bannerTitle, fallback.bannerTitle),
    bannerDescription: toText(candidate.bannerDescription, fallback.bannerDescription),
    pageEyebrow: toText(candidate.pageEyebrow, fallback.pageEyebrow),
    pageTitle: toText(candidate.pageTitle, fallback.pageTitle),
    pageDescription: toText(candidate.pageDescription, fallback.pageDescription),
    durationHours: Math.max(1, Math.trunc(toNumber(candidate.durationHours, fallback.durationHours))),
    endsAt: normalizedEndsAt,
    discountPercentage: Math.min(95, Math.max(1, toNumber(candidate.discountPercentage, fallback.discountPercentage))),
    featuredProductIds: Array.isArray(candidate.featuredProductIds)
      ? candidate.featuredProductIds.filter((item): item is string => typeof item === "string")
      : fallback.featuredProductIds,
  };
}

function sanitizeCategoryFeature(feature: unknown, index: number): CategoryFeature {
  const candidate = typeof feature === "object" && feature !== null ? feature as Partial<CategoryFeature> : {};
  return {
    id: toText(candidate.id, `feat-${index + 1}`),
    name: toText(candidate.name, `Feature ${index + 1}`),
    description: toOptionalText(candidate.description),
  };
}

function sanitizeCategory(category: unknown, index: number): Category {
  const candidate = typeof category === "object" && category !== null ? category as Partial<Category> : {};
  const rawFeatures = Array.isArray(candidate.features) ? candidate.features : [];
  return {
    id: toText(candidate.id, `cat-${index + 1}`),
    name: toText(candidate.name, `Category ${index + 1}`),
    description: toOptionalText(candidate.description),
    image: toOptionalText(candidate.image),
    features: rawFeatures.map((item, featureIndex) => sanitizeCategoryFeature(item, featureIndex)),
  };
}

function sanitizeFooter(value: unknown): FooterContent {
  const candidate = typeof value === "object" && value !== null ? value as Partial<FooterContent> : {};
  return {
    phone: toOptionalText(candidate.phone),
    email: toOptionalText(candidate.email),
    address: toOptionalText(candidate.address),
    facebook: toOptionalText(candidate.facebook),
    instagram: toOptionalText(candidate.instagram),
    twitter: toOptionalText(candidate.twitter),
    youtube: toOptionalText(candidate.youtube),
    tiktok: toOptionalText(candidate.tiktok),
    whatsapp: toOptionalText(candidate.whatsapp),
  };
}

const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  defaultFee: 15,
  freeDeliveryItemThreshold: 5,
  locationFees: [],
  deliveryTypes: [],
  processingFee: 4,
};

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  paystackEnabled: true,
  manualEnabled: true,
};

function sanitizeLocationFee(value: unknown, index: number): LocationDeliveryFee {
  const candidate = typeof value === "object" && value !== null ? value as Partial<LocationDeliveryFee> : {};
  return {
    id: toText(candidate.id, `loc-${index + 1}`),
    name: toText(candidate.name, `Location ${index + 1}`),
    fee: Math.max(0, toNumber(candidate.fee, 0)),
  };
}

function sanitizeDeliveryType(value: unknown, index: number): DeliveryType {
  const candidate = typeof value === "object" && value !== null ? value as Partial<DeliveryType> : {};
  return {
    id: toText(candidate.id, `dtype-${index + 1}`),
    name: toText(candidate.name, `Delivery Type ${index + 1}`),
    fee: Math.max(0, toNumber(candidate.fee, 0)),
    description: toOptionalText(candidate.description),
  };
}

function sanitizeDeliverySettings(value: unknown): DeliverySettings {
  const candidate = typeof value === "object" && value !== null ? value as Partial<DeliverySettings> : {};
  const rawFees = Array.isArray(candidate.locationFees) ? candidate.locationFees : DEFAULT_DELIVERY_SETTINGS.locationFees;
  const rawDeliveryTypes = Array.isArray(candidate.deliveryTypes) ? candidate.deliveryTypes : DEFAULT_DELIVERY_SETTINGS.deliveryTypes;
  return {
    defaultFee: Math.max(0, toNumber(candidate.defaultFee, DEFAULT_DELIVERY_SETTINGS.defaultFee)),
    freeDeliveryItemThreshold: Math.max(1, Math.trunc(toNumber(candidate.freeDeliveryItemThreshold, DEFAULT_DELIVERY_SETTINGS.freeDeliveryItemThreshold))),
    locationFees: rawFees.map((item, index) => sanitizeLocationFee(item, index)),
    deliveryTypes: rawDeliveryTypes.map((item, index) => sanitizeDeliveryType(item, index)),
    processingFee: Math.max(0, toNumber(candidate.processingFee, DEFAULT_DELIVERY_SETTINGS.processingFee)),
  };
}

function sanitizePaymentSettings(value: unknown): PaymentSettings {
  const candidate = typeof value === "object" && value !== null ? value as Partial<PaymentSettings> : {};
  return {
    paystackEnabled: toBoolean(candidate.paystackEnabled, DEFAULT_PAYMENT_SETTINGS.paystackEnabled),
    manualEnabled: toBoolean(candidate.manualEnabled, DEFAULT_PAYMENT_SETTINGS.manualEnabled),
  };
}

function sanitizeSmsTemplate(template: unknown, index: number): SmsTemplate {
  const candidate = typeof template === "object" && template !== null ? template as Partial<SmsTemplate> : {};
  return {
    id: toText(candidate.id, `sms-${index + 1}`),
    name: toText(candidate.name, `Template ${index + 1}`),
    message: toText(candidate.message, ""),
    createdAt: toOptionalText(candidate.createdAt),
  };
}

function resolveUpdatedAt(candidate: Partial<SiteContent>, fallback: SiteContent): string {
  const candidateUpdatedAt = typeof candidate.updatedAt === "string" ? candidate.updatedAt : "";
  const fallbackUpdatedAt = typeof fallback.updatedAt === "string" ? fallback.updatedAt : "";
  const parsedCandidate = candidateUpdatedAt ? new Date(candidateUpdatedAt) : null;
  const parsedFallback = fallbackUpdatedAt ? new Date(fallbackUpdatedAt) : null;

  if (parsedCandidate && Number.isFinite(parsedCandidate.getTime())) {
    return parsedCandidate.toISOString();
  }

  if (parsedFallback && Number.isFinite(parsedFallback.getTime())) {
    return parsedFallback.toISOString();
  }

  return new Date().toISOString();
}

export function sanitizeSiteContent(value: unknown): SiteContent {
  const candidate = typeof value === "object" && value !== null ? value as Partial<SiteContent> : {};
  const rawProducts = Array.isArray(candidate.products) ? candidate.products : defaultContent.products;
  const rawServices = Array.isArray(candidate.services) ? candidate.services : defaultContent.services;
  const rawSlides = Array.isArray(candidate.promoSlides) ? candidate.promoSlides : defaultContent.promoSlides;
  const rawCategories = Array.isArray(candidate.categories) ? candidate.categories : (defaultContent as SiteContent).categories || [];
  const rawSmsTemplates = Array.isArray(candidate.smsTemplates) ? candidate.smsTemplates : (defaultContent as SiteContent).smsTemplates ?? [];

  // Sanitize categories first so custom category names can be used to validate products
  const categories = rawCategories.map((item, index) => sanitizeCategory(item, index));
  const customCategoryNames = new Set(categories.map((c) => c.name));

  const products = rawProducts.map((item, index) => sanitizeProduct(item, index, defaultContent.products[index], customCategoryNames));
  const services = rawServices.map((item, index) => sanitizeService(item, index, defaultContent.services[index]));

  return {
    storeName: toText(candidate.storeName, defaultContent.storeName),
    storeDescription: toText(candidate.storeDescription, defaultContent.storeDescription),
    footerText: toText(candidate.footerText, defaultContent.footerText),
    logoUrl: toOptionalText(candidate.logoUrl) ?? defaultContent.logoUrl,
    footer: sanitizeFooter(candidate.footer ?? (defaultContent as SiteContent).footer ?? {}),
    features: sanitizeFeatures(candidate.features, defaultContent.features),
    home: sanitizeHome(candidate.home, defaultContent.home),
    promoSlides: rawSlides.map((item, index) => sanitizePromoSlide(item, index, defaultContent.promoSlides[index])),
    products,
    services,
    categories,
    allCategoryImage: toOptionalText(candidate.allCategoryImage) ?? defaultContent.allCategoryImage,
    flashSale: sanitizeFlashSale(candidate.flashSale, defaultContent.flashSale),
    deliverySettings: sanitizeDeliverySettings(candidate.deliverySettings ?? (defaultContent as SiteContent).deliverySettings),
    paymentSettings: sanitizePaymentSettings(candidate.paymentSettings ?? (defaultContent as SiteContent & { paymentSettings?: PaymentSettings }).paymentSettings ?? {}),
    smsTemplates: rawSmsTemplates.map((item, index) => sanitizeSmsTemplate(item, index)),
    updatedAt: resolveUpdatedAt(candidate, defaultContent),
  };
}

// cache() from React deduplicates multiple getSiteContent() calls within a
// single server render (e.g. generateMetadata + page body), while still
// reading fresh data for every new request — no cross-request stale cache.
export const getSiteContent = cache(async (): Promise<SiteContent> => {
  try {
    // Try to load from Supabase first (production)
    const dbContent = await getSiteContentFromDb();
    if (dbContent) {
      return sanitizeSiteContent(dbContent);
    }
  } catch (error) {
    console.error("Error loading from Supabase, falling back to JSON:", error);
  }

  // Fallback to local JSON file (local development or if Supabase fails)
  try {
    const raw = await fs.readFile(DATA_FILE_PATH, "utf8");
    return sanitizeSiteContent(JSON.parse(raw));
  } catch {
    return sanitizeSiteContent(defaultContent);
  }
});

export async function saveSiteContent(content: SiteContent): Promise<SiteContent> {
  const sanitized = sanitizeSiteContent({
    ...content,
    updatedAt: new Date().toISOString(),
  });

  try {
    // Try to save to Supabase first
    await saveSiteContentToDb(sanitized);
  } catch (error) {
    console.error("Error saving to Supabase:", error);
    // Don't fail completely - try to save locally as fallback
  }

  // Also try to save locally for development
  try {
    await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
    await ensureProductImageFolders(sanitized.products);
    await fs.writeFile(DATA_FILE_PATH, `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");
  } catch (error) {
    console.warn("Could not write to local JSON file (expected on Vercel):", error);
  }

  return sanitized;
}