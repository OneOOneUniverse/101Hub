// Legacy fallback for hardcoded categories (kept for backwards compatibility)
export const defaultProductCategories = [
  "New Drops",
  "Phones & Tablets",
  "Health & Beauty",
  "Home & Office",
  "Appliances",
  "Electronics",
  "Computing",
  "Fashion",
  "Sporting Goods",
  "Baby Products",
  "Gaming",
  "Other Categories",
] as const;

// Get product categories dynamically from site content
export function getProductCategories(categories: Category[]): string[] {
  const names = categories.map((c) => c.name);
  // Ensure "New Drops" is always first if not present
  if (!names.includes("New Drops") && !names.includes("new-drops")) {
    return ["New Drops", ...names];
  }
  return names;
}

export type ProductCategory = string;

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  subCategory?: string;
  description: string;
  price: number;
  stock: number;
  rating: number;
  badge?: string;
  image?: string;
  images?: string[];
  videos?: string[]; // Optional product videos (shown in gallery)
  dateAdded?: string; // ISO 8601 timestamp for sorting (newest first)
  discount?: number; // Optional discount percentage (0-100)
  deliveryFee?: number; // Optional per-product delivery fee
  noDeliveryFee?: boolean; // Optional flag for no delivery fee

};

export type ServicePackage = {
  id: string;
  name: string;
  turnaround: string;
  price: number;
  details: string;
  image?: string;
  images?: string[];
  providerName?: string;
  phone?: string;
  email?: string;
  currentOffers?: string;
};

export type PromoSlide = {
  id: string;
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  /** Media type – defaults to "image" when omitted */
  mediaType?: "image" | "video";
  /** Optional offer/event name for organization */
  eventName?: string;
  /** Optional URL or path to navigate when slide is clicked */
  actionUrl?: string;
  /** Optional start date (ISO 8601) for time-limited offers */
  startDate?: string;
  /** Optional end date (ISO 8601) for time-limited offers */
  endDate?: string;
};

export type HighlightCard = {
  id: string;
  title: string;
  description: string;
};

export type HomeContent = {
  badge: string;
  title: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  heroVideoUrl?: string;
  heroVideoMobileUrl?: string;
  heroVideos?: string[];
  heroMobileVideos?: string[];
  highlights: HighlightCard[];
};

export type FlashSaleContent = {
  bannerEyebrow: string;
  bannerTitle: string;
  bannerDescription: string;
  pageEyebrow: string;
  pageTitle: string;
  pageDescription: string;
  durationHours: number;
  endsAt?: string;
  discountPercentage: number;
  featuredProductIds: string[];
  backgroundImage?: string;
  backgroundVideo?: string;
};

export type BlackFridayContent = {
  discountPercentage: number;
  headline: string;
  description: string;
  endsAt?: string;
  linkUrl: string;
  linkText: string;
  pageEyebrow: string;
  pageTitle: string;
  pageDescription: string;
  featuredProductIds: string[];
  backgroundImage?: string;
  backgroundVideo?: string;
};

export type SiteFeatures = {
  promoSlider: boolean;
  flashSale: boolean;
  blackFriday: boolean;
  services: boolean;
  wishlist: boolean;
  reviews: boolean;
  cart: boolean;
  checkout: boolean;
  dealsHub: boolean;
};

export type LocationDeliveryFee = {
  id: string;
  name: string;
  fee: number;
};

export type DeliveryType = {
  id: string;
  name: string;
  fee: number;
  description?: string;
};

export type DeliverySettings = {
  defaultFee: number;
  freeDeliveryItemThreshold: number;
  locationFees: LocationDeliveryFee[];
  deliveryTypes: DeliveryType[];
  processingFee: number;
};

export type PaymentSettings = {
  paystackEnabled: boolean;
  manualEnabled: boolean;
};

export type PaymentWalkthroughStep = {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  bulletPoints?: string[];
  image?: string; // Image showing this step
};

export type CategoryFeature = {
  id: string;
  name: string;
  description?: string;
};

export type Category = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  features: CategoryFeature[];
  subCategories?: string[];
};

export type FAQ = {
  id: string;
  question: string;
  answer: string;
  videoUrl?: string;
  imageUrl?: string;
  category?: string;
  order?: number;
};

export type FooterContent = {
  phone?: string;
  email?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
  whatsapp?: string;
};

export type SmsTemplate = {
  id: string;
  name: string;
  message: string;
  createdAt?: string;
};

// ─── Deals Hub Types ──────────────────────────────────────────
export type SpecialStore = {
  id: string;
  name: string;
  slug: string;
  description: string;
  emoji: string;
  bgColor: string;
  textColor: string;
  backgroundImage: string;
  featuredProductIds: string[];
  enabled: boolean;
};

export type SpinWheelSlice = {
  id: string;
  label: string;
  type: "points" | "discount_percent" | "discount_fixed" | "free_shipping" | "no_prize";
  value: number; // points amount, discount %, fixed amount, or 0 for no_prize
  color: string;
  weight: number; // probability weight (higher = more likely)
};

export type TriviaQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  pointsReward: number;
};

export type DealsHubContent = {
  enabled: boolean;
  title: string;
  description: string;
  pointsPerCedi: number; // how many points = 1 GHS discount
  minRedeemPoints: number; // minimum points needed before claiming
  specialStores: SpecialStore[];
  spinWheel: {
    enabled: boolean;
    title: string;
    description: string;
    slices: SpinWheelSlice[];
    cooldownHours: number; // hours between spins (0 = unlimited)
  };
  scratchCard: {
    enabled: boolean;
    title: string;
    description: string;
    prizes: SpinWheelSlice[]; // reuse same shape
    cooldownHours: number;
  };
  trivia: {
    enabled: boolean;
    title: string;
    description: string;
    questions: TriviaQuestion[];
    dailyLimit: number; // max questions per day
  };
};

export type ManualPaymentField = {
  label: string;
  value: string;
  icon: string;
};

export type SiteContent = {
  storeName: string;
  storeDescription: string;
  footerText: string;
  logoUrl?: string;
  marquee?: {
    enabled: boolean;
    text: string;
    bgColor?: string;
    textColor?: string;
    speed?: number;
  };
  footer?: FooterContent;
  features: SiteFeatures;
  home: HomeContent;
  promoSlides: PromoSlide[];
  products: Product[];
  services: ServicePackage[];
  categories: Category[];
  allCategoryImage?: string;
  flashSale: FlashSaleContent;
  blackFriday: BlackFridayContent;
  deliverySettings: DeliverySettings;
  paymentSettings: PaymentSettings;
  paymentWalkthrough?: PaymentWalkthroughStep[];
  manualPaymentDetails?: ManualPaymentField[];
  smsTemplates?: SmsTemplate[];
  faqs?: FAQ[];
  dealsHub: DealsHubContent;
  updatedAt: string;
};