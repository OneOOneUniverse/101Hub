export type ProductReview = {
  id: string;
  author: string;
  comment: string;
  rating: number;
  createdAt: string;
};

type ProductReviewsByProduct = Record<string, ProductReview[]>;

const WISHLIST_KEY = "101hub-wishlist";
const REVIEWS_KEY = "101hub-reviews";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readWishlist(): string[] {
  const data = readJson<unknown>(WISHLIST_KEY, []);
  return Array.isArray(data) ? data.filter((item) => typeof item === "string") : [];
}

export function isInWishlist(productId: string): boolean {
  return readWishlist().includes(productId);
}

export function toggleWishlist(productId: string): boolean {
  const current = new Set(readWishlist());

  if (current.has(productId)) {
    current.delete(productId);
  } else {
    current.add(productId);
  }

  const next = Array.from(current);
  writeJson(WISHLIST_KEY, next);
  window.dispatchEvent(new Event("101hub:wishlist-updated"));
  return next.includes(productId);
}

function readAllReviews(): ProductReviewsByProduct {
  const data = readJson<unknown>(REVIEWS_KEY, {});

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  return data as ProductReviewsByProduct;
}

function writeAllReviews(reviews: ProductReviewsByProduct) {
  writeJson(REVIEWS_KEY, reviews);
  window.dispatchEvent(new Event("101hub:reviews-updated"));
}

export function readProductReviews(productId: string): ProductReview[] {
  const all = readAllReviews();
  const list = all[productId] ?? [];
  return Array.isArray(list) ? list : [];
}

export function addProductReview(input: {
  productId: string;
  author: string;
  comment: string;
  rating: number;
}) {
  const all = readAllReviews();
  const existing = readProductReviews(input.productId);

  const nextReview: ProductReview = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author: input.author.trim() || "Anonymous",
    comment: input.comment.trim(),
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    createdAt: new Date().toISOString(),
  };

  all[input.productId] = [nextReview, ...existing];
  writeAllReviews(all);
}

export function getReviewStats(productId: string, baseRating: number) {
  const reviews = readProductReviews(productId);

  if (!reviews.length) {
    return {
      average: baseRating,
      count: 0,
    };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);

  return {
    average: total / reviews.length,
    count: reviews.length,
  };
}
