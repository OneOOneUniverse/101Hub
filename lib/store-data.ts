import type { Product } from "@/lib/site-content-types";

export type {
  FlashSaleContent,
  HighlightCard,
  HomeContent,
  Product,
  ProductCategory,
  PromoSlide,
  ServicePackage,
  SiteContent,
  SiteFeatures,
} from "@/lib/site-content-types";

export function getCategories(products: Product[]): Product["category"][] {
  return Array.from(new Set(products.map((product) => product.category)));
}

export function getProductBySlug(products: Product[], slug: string): Product | undefined {
  return products.find((item) => item.slug === slug);
}

const categoryPalette: Record<Product["category"], [string, string]> = {
  "Phones & Tablets": ["#22d3ee", "#0ea5e9"],
  "Health & Beauty": ["#f9a8d4", "#ec4899"],
  "Home & Office": ["#fbbf24", "#f59e0b"],
  "Appliances": ["#6ee7b7", "#10b981"],
  "Electronics": ["#a78bfa", "#7c3aed"],
  "Computing": ["#34d399", "#0d9488"],
  "Fashion": ["#fca5a5", "#f87171"],
  "Sporting Goods": ["#86efac", "#22c55e"],
  "Baby Products": ["#fde68a", "#fbbf24"],
  "Gaming": ["#fb7185", "#f43f5e"],
  "Other Categories": ["#94a3b8", "#64748b"],
};

function createGalleryImage(product: Product, index: number): string {
  const [from, to] = categoryPalette[product.category];
  const label = `View ${index + 1}`;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${product.name} ${label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}" />
      <stop offset="100%" stop-color="${to}" />
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#g)" />
  <circle cx="180" cy="130" r="190" fill="rgba(255,255,255,0.18)" />
  <circle cx="1020" cy="760" r="250" fill="rgba(0,0,0,0.15)" />
  <text x="80" y="710" fill="rgba(255,255,255,0.95)" font-family="Arial, sans-serif" font-size="72" font-weight="700">${product.name}</text>
  <text x="80" y="785" fill="rgba(255,255,255,0.92)" font-family="Arial, sans-serif" font-size="40">${product.category} • ${label}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getProductGallery(product: Product, count = 4): string[] {
  return Array.from({ length: count }, (_, index) => createGalleryImage(product, index));
}

export function getRelatedProducts(products: Product[], slug: string, limit = 3): Product[] {
  const current = getProductBySlug(products, slug);

  if (!current) {
    return [];
  }

  const sameCategory = products.filter(
    (item) => item.slug !== slug && item.category === current.category
  );
  const fallback = products.filter(
    (item) => item.slug !== slug && item.category !== current.category
  );

  return [...sameCategory, ...fallback].slice(0, limit);
}
