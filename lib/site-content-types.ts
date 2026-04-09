export const productCategories = [
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

export type ProductCategory = (typeof productCategories)[number];

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  stock: number;
  rating: number;
  badge?: string;
  image?: string;
  images?: string[];
  dateAdded?: string; // ISO 8601 timestamp for sorting (newest first)
};

export type ServicePackage = {
  id: string;
  name: string;
  turnaround: string;
  price: number;
  details: string;
  image?: string;
};

export type PromoSlide = {
  id: string;
  src: string;
  alt: string;
  title: string;
  subtitle: string;
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
};

export type SiteFeatures = {
  promoSlider: boolean;
  flashSale: boolean;
  services: boolean;
  wishlist: boolean;
  reviews: boolean;
  cart: boolean;
  checkout: boolean;
};

export type SiteContent = {
  storeName: string;
  storeDescription: string;
  footerText: string;
  logoUrl?: string;
  features: SiteFeatures;
  home: HomeContent;
  promoSlides: PromoSlide[];
  products: Product[];
  services: ServicePackage[];
  flashSale: FlashSaleContent;
  updatedAt: string;
};