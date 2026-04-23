import "server-only";

import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import seedContent from "@/data/site-content.json";
import {
  type BlackFridayContent,
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
  type PaymentWalkthroughStep,
  type Product,
  defaultProductCategories,
  type PromoSlide,
  type ServicePackage,
  type SiteContent,
  type SiteFeatures,
  type SmsTemplate,
  type DealsHubContent,
  type SpecialStore,
  type SpinWheelSlice,
  type TriviaQuestion,
  type ManualPaymentField,
  type ProviderPaymentDetails,
} from "@/lib/site-content-types";
import { getSiteContentFromDb, saveSiteContentToDb } from "@/lib/site-content-db";

const DATA_FILE_PATH = path.join(process.cwd(), "data", "site-content.json");
const PRODUCT_IMAGE_ROOT = path.join(process.cwd(), "public", "img", "products");
const defaultContent = seedContent as unknown as SiteContent;

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

  const subCategory = toOptionalText(candidate.subCategory) ?? fallback?.subCategory;

  return {
    id: toText(candidate.id, fallback?.id ?? `product-${index + 1}`),
    slug: normalizeSlug(rawSlug),
    name: toText(candidate.name, fallback?.name ?? "Untitled product"),
    category,
    ...(subCategory && { subCategory }),
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
    ...(Array.isArray(candidate.sizes) && candidate.sizes.length > 0 && { sizes: candidate.sizes.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map(s => s.trim()) }),
    ...(Array.isArray(candidate.colors) && candidate.colors.length > 0 && { colors: candidate.colors.filter((c): c is string => typeof c === "string" && c.trim().length > 0).map(c => c.trim()) }),
  };
}

function sanitizeSubService(sub: unknown, index: number): import("@/lib/site-content-types").SubService {
  const c = typeof sub === "object" && sub !== null ? sub as Record<string, unknown> : {};
  return {
    id: toText(c.id, `sub-${index + 1}`),
    name: toText(c.name, "Untitled"),
    price: Math.max(0, toNumber(c.price, 0)),
    ...(typeof c.description === "string" && c.description.trim() ? { description: c.description.trim() } : {}),
  };
}

function sanitizeService(service: unknown, index: number, fallback?: ServicePackage): ServicePackage {
  const candidate = typeof service === "object" && service !== null ? service as Partial<ServicePackage> : {};

  const rawSubServices = Array.isArray(candidate.subServices) ? candidate.subServices : null;
  const subServices = rawSubServices && rawSubServices.length > 0
    ? rawSubServices.map((s, i) => sanitizeSubService(s, i))
    : undefined;

  const rawPriceMax = candidate.priceMax !== undefined ? toNumber(candidate.priceMax) : fallback?.priceMax;
  const priceMax = rawPriceMax !== undefined && rawPriceMax > 0 ? rawPriceMax : undefined;

  return {
    id: toText(candidate.id, fallback?.id ?? `service-${index + 1}`),
    name: toText(candidate.name, fallback?.name ?? "Untitled service"),
    turnaround: toText(candidate.turnaround, fallback?.turnaround ?? "Same day"),
    price: Math.max(0, toNumber(candidate.price, fallback?.price ?? 0)),
    ...(priceMax !== undefined && { priceMax }),
    ...(typeof candidate.pricingNote === "string" && candidate.pricingNote.trim() ? { pricingNote: candidate.pricingNote.trim() } : {}),
    ...(subServices && { subServices }),
    details: toText(candidate.details, fallback?.details ?? ""),
    image: toOptionalText(candidate.image) ?? fallback?.image,
    images: toOptionalTextArray(candidate.images) ?? fallback?.images,
    providerName: toOptionalText(candidate.providerName) ?? fallback?.providerName,
    phone: toOptionalText(candidate.phone) ?? fallback?.phone,
    email: toOptionalText(candidate.email) ?? fallback?.email,
    currentOffers: toOptionalText(candidate.currentOffers) ?? fallback?.currentOffers,
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
    mediaType: candidate.mediaType === "video" ? "video" : fallback?.mediaType,
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
    blackFriday: toBoolean(candidate.blackFriday, fallback.blackFriday),
    services: toBoolean(candidate.services, fallback.services),
    wishlist: toBoolean(candidate.wishlist, fallback.wishlist),
    reviews: toBoolean(candidate.reviews, fallback.reviews),
    cart: toBoolean(candidate.cart, fallback.cart),
    checkout: toBoolean(candidate.checkout, fallback.checkout),
    dealsHub: toBoolean(candidate.dealsHub, fallback.dealsHub),
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
    heroBackgroundImage: toOptionalText(candidate.heroBackgroundImage),
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
    backgroundImage: toOptionalText(candidate.backgroundImage),
    backgroundVideo: toOptionalText(candidate.backgroundVideo),
  };
}

function sanitizeBlackFriday(value: unknown, fallback: BlackFridayContent): BlackFridayContent {
  const candidate = typeof value === "object" && value !== null ? value as Partial<BlackFridayContent> : {};
  const candidateEndsAt = typeof candidate.endsAt === "string" ? candidate.endsAt : "";
  const fallbackEndsAt = typeof fallback.endsAt === "string" ? fallback.endsAt : "";
  const parsedEndsAt = candidateEndsAt ? new Date(candidateEndsAt) : new Date(fallbackEndsAt);
  const normalizedEndsAt = Number.isFinite(parsedEndsAt.getTime()) ? parsedEndsAt.toISOString() : undefined;

  return {
    discountPercentage: Math.min(95, Math.max(1, toNumber(candidate.discountPercentage, fallback.discountPercentage))),
    headline: toText(candidate.headline, fallback.headline),
    description: toText(candidate.description, fallback.description),
    endsAt: normalizedEndsAt,
    linkUrl: toText(candidate.linkUrl, fallback.linkUrl),
    linkText: toText(candidate.linkText, fallback.linkText),
    pageEyebrow: toText(candidate.pageEyebrow, fallback.pageEyebrow),
    pageTitle: toText(candidate.pageTitle, fallback.pageTitle),
    pageDescription: toText(candidate.pageDescription, fallback.pageDescription),
    featuredProductIds: Array.isArray(candidate.featuredProductIds)
      ? candidate.featuredProductIds.filter((item): item is string => typeof item === "string")
      : fallback.featuredProductIds,
    backgroundImage: toOptionalText(candidate.backgroundImage),
    backgroundVideo: toOptionalText(candidate.backgroundVideo),
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
  const rawSubs = Array.isArray(candidate.subCategories)
    ? candidate.subCategories.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : undefined;
  return {
    id: toText(candidate.id, `cat-${index + 1}`),
    name: toText(candidate.name, `Category ${index + 1}`),
    description: toOptionalText(candidate.description),
    image: toOptionalText(candidate.image),
    features: rawFeatures.map((item, featureIndex) => sanitizeCategoryFeature(item, featureIndex)),
    ...(rawSubs && rawSubs.length > 0 && { subCategories: rawSubs }),
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

function sanitizeFAQ(faq: unknown, index: number): FAQ {
  const candidate = typeof faq === "object" && faq !== null ? faq as Partial<FAQ> : {};
  return {
    id: toText(candidate.id, `faq-${index + 1}`),
    question: toText(candidate.question, `Question ${index + 1}`),
    answer: toText(candidate.answer, ""),
    videoUrl: toOptionalText(candidate.videoUrl),
    imageUrl: toOptionalText(candidate.imageUrl),
    category: toOptionalText(candidate.category),
    order: toNumber(candidate.order, index + 1),
  };
}

function sanitizePaymentWalkthroughStep(step: unknown, index: number): PaymentWalkthroughStep {
  const candidate = typeof step === "object" && step !== null ? step as Partial<PaymentWalkthroughStep> : {};
  const rawBulletPoints = Array.isArray(candidate.bulletPoints) ? candidate.bulletPoints : [];
  return {
    id: toText(candidate.id, `step-${index + 1}`),
    stepNumber: Math.max(1, toNumber(candidate.stepNumber, index + 1)),
    title: toText(candidate.title, `Step ${index + 1}`),
    description: toText(candidate.description, ""),
    bulletPoints: rawBulletPoints
      .filter((item: unknown): item is string => typeof item === "string")
      .map((item: string) => item.trim())
      .filter(Boolean),
    image: toOptionalText(candidate.image),
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

const DEFAULT_DEALS_HUB: DealsHubContent = {
  enabled: false,
  title: "Deals Hub",
  description: "Play games, earn points, and unlock exclusive deals!",
  pointsPerCedi: 100,
  minRedeemPoints: 500,
  specialStores: [
    { id: "store-50", name: "50 Cedis Store", slug: "50-cedis-store", description: "Everything at GHS 50 or less", emoji: "🏷️", bgColor: "#2563eb", textColor: "#ffffff", backgroundImage: "", featuredProductIds: [], enabled: false },
    { id: "store-10", name: "10 Cedis Store", slug: "10-cedis-store", description: "Unbeatable deals at GHS 10 or less", emoji: "🔥", bgColor: "#dc2626", textColor: "#ffffff", backgroundImage: "", featuredProductIds: [], enabled: false },
    { id: "store-thrift", name: "Thrift Store", slug: "thrift-store", description: "Pre-loved and budget-friendly finds", emoji: "♻️", bgColor: "#059669", textColor: "#ffffff", backgroundImage: "", featuredProductIds: [], enabled: false },
    { id: "store-event", name: "Christmas Store", slug: "christmas-store", description: "Festive specials and holiday deals", emoji: "🎄", bgColor: "#b91c1c", textColor: "#ffffff", backgroundImage: "", featuredProductIds: [], enabled: false },
  ],
  spinWheel: {
    enabled: false,
    title: "Spin & Win",
    description: "Spin the wheel for a chance to win discounts and points!",
    slices: [
      { id: "sw-1", label: "50 Points", type: "points", value: 50, color: "#2563eb", weight: 30 },
      { id: "sw-2", label: "5% Off", type: "discount_percent", value: 5, color: "#059669", weight: 25 },
      { id: "sw-3", label: "100 Points", type: "points", value: 100, color: "#7c3aed", weight: 20 },
      { id: "sw-4", label: "Free Shipping", type: "free_shipping", value: 0, color: "#ca8a04", weight: 10 },
      { id: "sw-5", label: "Try Again", type: "no_prize", value: 0, color: "#6b7280", weight: 15 },
    ],
    cooldownHours: 24,
    maxAttempts: 0,
  },
  scratchCard: {
    enabled: false,
    title: "Scratch & Win",
    description: "Scratch the card to reveal your prize!",
    prizes: [
      { id: "sc-1", label: "25 Points", type: "points", value: 25, color: "#2563eb", weight: 35 },
      { id: "sc-2", label: "GHS 5 Off", type: "discount_fixed", value: 5, color: "#059669", weight: 20 },
      { id: "sc-3", label: "10% Off", type: "discount_percent", value: 10, color: "#7c3aed", weight: 15 },
      { id: "sc-4", label: "Try Again", type: "no_prize", value: 0, color: "#6b7280", weight: 30 },
    ],
    cooldownHours: 12,
    maxAttempts: 0,
  },
  trivia: {
    enabled: false,
    title: "Daily Trivia",
    description: "Answer questions correctly to earn points!",
    questions: [
      { id: "q-1", question: "What year was Ghana founded?", options: ["1955", "1957", "1960", "1963"], correctIndex: 1, pointsReward: 50 },
    ],
    dailyLimit: 5,
    maxAttempts: 0,
  },
};

function sanitizeSpecialStore(value: unknown, index: number): SpecialStore {
  const c = typeof value === "object" && value !== null ? value as Partial<SpecialStore> : {};
  const defaults = DEFAULT_DEALS_HUB.specialStores[index] ?? DEFAULT_DEALS_HUB.specialStores[0];
  return {
    id: toText(c.id, defaults.id),
    name: toText(c.name, defaults.name),
    slug: toText(c.slug, defaults.slug),
    description: toText(c.description, defaults.description),
    emoji: toText(c.emoji, defaults.emoji),
    bgColor: toText(c.bgColor, defaults.bgColor),
    textColor: toText(c.textColor, defaults.textColor),
    backgroundImage: toText((c as Record<string, unknown>).backgroundImage as string | undefined, defaults.backgroundImage),
    featuredProductIds: Array.isArray(c.featuredProductIds)
      ? c.featuredProductIds.filter((i): i is string => typeof i === "string")
      : defaults.featuredProductIds,
    enabled: toBoolean(c.enabled, defaults.enabled),
  };
}

function sanitizeSlice(value: unknown, index: number, fallbackSlices: SpinWheelSlice[]): SpinWheelSlice {
  const c = typeof value === "object" && value !== null ? value as Partial<SpinWheelSlice> : {};
  const fb = fallbackSlices[index] ?? fallbackSlices[0];
  const validTypes = ["points", "discount_percent", "discount_fixed", "free_shipping", "no_prize"];
  const rawType = typeof c.type === "string" ? c.type : fb.type;
  return {
    id: toText(c.id, fb.id),
    label: toText(c.label, fb.label),
    type: validTypes.includes(rawType) ? rawType as SpinWheelSlice["type"] : fb.type,
    value: Math.max(0, toNumber(c.value, fb.value)),
    color: toText(c.color, fb.color),
    weight: Math.max(1, Math.trunc(toNumber(c.weight, fb.weight))),
  };
}

function sanitizeTriviaQuestion(value: unknown, index: number): TriviaQuestion {
  const c = typeof value === "object" && value !== null ? value as Partial<TriviaQuestion> : {};
  const fb = DEFAULT_DEALS_HUB.trivia.questions[0];
  const options = Array.isArray(c.options) ? c.options.map((o) => String(o ?? "")) : fb.options;
  return {
    id: toText(c.id, `q-${index + 1}`),
    question: toText(c.question, fb.question),
    options,
    correctIndex: Math.max(0, Math.min(options.length - 1, Math.trunc(toNumber(c.correctIndex, fb.correctIndex)))),
    pointsReward: Math.max(1, Math.trunc(toNumber(c.pointsReward, fb.pointsReward))),
  };
}

function sanitizeDealsHub(value: unknown): DealsHubContent {
  const c = typeof value === "object" && value !== null ? value as Partial<DealsHubContent> : {};
  const fb = DEFAULT_DEALS_HUB;

  const rawStores = Array.isArray(c.specialStores) ? c.specialStores : fb.specialStores;
  const rawSpinSlices = c.spinWheel && typeof c.spinWheel === "object" && Array.isArray((c.spinWheel as Record<string, unknown>).slices)
    ? (c.spinWheel as { slices: unknown[] }).slices : fb.spinWheel.slices;
  const rawScratchPrizes = c.scratchCard && typeof c.scratchCard === "object" && Array.isArray((c.scratchCard as Record<string, unknown>).prizes)
    ? (c.scratchCard as { prizes: unknown[] }).prizes : fb.scratchCard.prizes;
  const rawQuestions = c.trivia && typeof c.trivia === "object" && Array.isArray((c.trivia as Record<string, unknown>).questions)
    ? (c.trivia as { questions: unknown[] }).questions : fb.trivia.questions;

  const spinObj = typeof c.spinWheel === "object" && c.spinWheel !== null ? c.spinWheel as Record<string, unknown> : {};
  const scratchObj = typeof c.scratchCard === "object" && c.scratchCard !== null ? c.scratchCard as Record<string, unknown> : {};
  const triviaObj = typeof c.trivia === "object" && c.trivia !== null ? c.trivia as Record<string, unknown> : {};

  return {
    enabled: toBoolean(c.enabled, fb.enabled),
    title: toText(c.title, fb.title),
    description: toText(c.description, fb.description),
    pointsPerCedi: Math.max(1, Math.trunc(toNumber(c.pointsPerCedi, fb.pointsPerCedi))),
    minRedeemPoints: Math.max(0, Math.trunc(toNumber(c.minRedeemPoints, fb.minRedeemPoints))),
    specialStores: rawStores.map((item, i) => sanitizeSpecialStore(item, i)),
    spinWheel: {
      enabled: toBoolean(spinObj.enabled as boolean | undefined, fb.spinWheel.enabled),
      title: toText(spinObj.title as string | undefined, fb.spinWheel.title),
      description: toText(spinObj.description as string | undefined, fb.spinWheel.description),
      slices: rawSpinSlices.map((item, i) => sanitizeSlice(item, i, fb.spinWheel.slices)),
      cooldownHours: Math.max(0, toNumber(spinObj.cooldownHours as number | undefined, fb.spinWheel.cooldownHours)),
      maxAttempts: Math.max(0, Math.trunc(toNumber(spinObj.maxAttempts as number | undefined, fb.spinWheel.maxAttempts))),
    },
    scratchCard: {
      enabled: toBoolean(scratchObj.enabled as boolean | undefined, fb.scratchCard.enabled),
      title: toText(scratchObj.title as string | undefined, fb.scratchCard.title),
      description: toText(scratchObj.description as string | undefined, fb.scratchCard.description),
      prizes: rawScratchPrizes.map((item, i) => sanitizeSlice(item, i, fb.scratchCard.prizes)),
      cooldownHours: Math.max(0, toNumber(scratchObj.cooldownHours as number | undefined, fb.scratchCard.cooldownHours)),
      maxAttempts: Math.max(0, Math.trunc(toNumber(scratchObj.maxAttempts as number | undefined, fb.scratchCard.maxAttempts))),
    },
    trivia: {
      enabled: toBoolean(triviaObj.enabled as boolean | undefined, fb.trivia.enabled),
      title: toText(triviaObj.title as string | undefined, fb.trivia.title),
      description: toText(triviaObj.description as string | undefined, fb.trivia.description),
      questions: rawQuestions.map((item, i) => sanitizeTriviaQuestion(item, i)),
      dailyLimit: Math.max(1, Math.trunc(toNumber(triviaObj.dailyLimit as number | undefined, fb.trivia.dailyLimit))),
      maxAttempts: Math.max(0, Math.trunc(toNumber(triviaObj.maxAttempts as number | undefined, fb.trivia.maxAttempts))),
    },
  };
}

function sanitizeManualPaymentField(value: unknown): ManualPaymentField {
  const c = typeof value === "object" && value !== null ? value as Partial<ManualPaymentField> : {};
  return {
    label: toText(c.label, ""),
    value: toText(c.value, ""),
    icon: toText(c.icon, "💳"),
  };
}

function sanitizeProviderPaymentDetails(value: unknown): ProviderPaymentDetails {
  const c = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const result: ProviderPaymentDetails = {};
  for (const key of ["mtn", "telecel", "at", "bank"] as const) {
    if (Array.isArray(c[key])) {
      result[key] = (c[key] as unknown[]).map(sanitizeManualPaymentField);
    }
  }
  return result;
}

export function sanitizeSiteContent(value: unknown): SiteContent {
  const candidate = typeof value === "object" && value !== null ? value as Partial<SiteContent> : {};
  const rawProducts = Array.isArray(candidate.products) ? candidate.products : defaultContent.products;
  const rawServices = Array.isArray(candidate.services) ? candidate.services : defaultContent.services;
  const rawSlides = Array.isArray(candidate.promoSlides) ? candidate.promoSlides : defaultContent.promoSlides;
  const rawCategories = Array.isArray(candidate.categories) ? candidate.categories : (defaultContent as SiteContent).categories || [];
  const rawSmsTemplates = Array.isArray(candidate.smsTemplates) ? candidate.smsTemplates : (defaultContent as SiteContent).smsTemplates ?? [];
  const rawFaqs = Array.isArray(candidate.faqs) ? candidate.faqs : (defaultContent as SiteContent).faqs ?? [];
  const rawPaymentWalkthrough = Array.isArray(candidate.paymentWalkthrough) ? candidate.paymentWalkthrough : (defaultContent as SiteContent).paymentWalkthrough ?? [];

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
    marquee: candidate.marquee && typeof candidate.marquee === "object"
      ? {
          enabled: !!(candidate.marquee as Record<string, unknown>).enabled,
          text: String((candidate.marquee as Record<string, unknown>).text ?? ""),
          bgColor: String((candidate.marquee as Record<string, unknown>).bgColor ?? "#000000"),
          textColor: String((candidate.marquee as Record<string, unknown>).textColor ?? "#ffffff"),
          speed: Math.max(5, Math.min(120, Number((candidate.marquee as Record<string, unknown>).speed) || 30)),
        }
      : defaultContent.marquee,
    footer: sanitizeFooter(candidate.footer ?? (defaultContent as SiteContent).footer ?? {}),
    features: sanitizeFeatures(candidate.features, defaultContent.features),
    home: sanitizeHome(candidate.home, defaultContent.home),
    promoSlides: rawSlides.map((item, index) => sanitizePromoSlide(item, index, defaultContent.promoSlides[index])),
    products,
    services,
    categories,
    allCategoryImage: toOptionalText(candidate.allCategoryImage) ?? defaultContent.allCategoryImage,
    flashSale: sanitizeFlashSale(candidate.flashSale, defaultContent.flashSale),
    blackFriday: sanitizeBlackFriday(candidate.blackFriday, defaultContent.blackFriday),
    deliverySettings: sanitizeDeliverySettings(candidate.deliverySettings ?? (defaultContent as SiteContent).deliverySettings),
    paymentSettings: sanitizePaymentSettings(candidate.paymentSettings ?? (defaultContent as SiteContent & { paymentSettings?: PaymentSettings }).paymentSettings ?? {}),
    smsTemplates: rawSmsTemplates.map((item, index) => sanitizeSmsTemplate(item, index)),
    ...(rawFaqs.length > 0 && { faqs: rawFaqs.map((item, index) => sanitizeFAQ(item, index)) }),
    ...(rawPaymentWalkthrough.length > 0 && { paymentWalkthrough: rawPaymentWalkthrough.map((item, index) => sanitizePaymentWalkthroughStep(item, index)) }),
    ...(Array.isArray(candidate.manualPaymentDetails) && { manualPaymentDetails: (candidate.manualPaymentDetails as unknown[]).map(sanitizeManualPaymentField) }),
    ...(candidate.providerPaymentDetails && { providerPaymentDetails: sanitizeProviderPaymentDetails(candidate.providerPaymentDetails) }),
    ...(candidate.providerLogos && typeof candidate.providerLogos === "object" && {
      providerLogos: Object.fromEntries(
        (["mtn", "telecel", "at", "bank"] as const)
          .flatMap((k) => {
            const v = (candidate.providerLogos as Record<string, unknown>)[k];
            return typeof v === "string" && v ? [[k, v]] : [];
          })
      ) as SiteContent["providerLogos"],
    }),
    dealsHub: sanitizeDealsHub(candidate.dealsHub ?? (defaultContent as Partial<SiteContent>).dealsHub),
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