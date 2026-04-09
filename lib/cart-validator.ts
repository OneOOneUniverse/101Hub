/**
 * Cart validation and cleanup utilities
 * Helps identify and fix corrupted or stale cart data
 */

export type CartLine = { productId: string; qty: number };

/**
 * Validates cart items against available products
 * Removes products not found in the products list
 */
export function validateAndCleanCart(
  cartLines: CartLine[],
  productIds: string[]
): { valid: CartLine[]; invalid: CartLine[]; hasChanges: boolean } {
  const valid: CartLine[] = [];
  const invalid: CartLine[] = [];

  for (const line of cartLines) {
    if (productIds.includes(line.productId)) {
      valid.push(line);
    } else {
      invalid.push(line);
    }
  }

  return {
    valid,
    invalid,
    hasChanges: invalid.length > 0,
  };
}

/**
 * Clears cart from localStorage
 */
export function clearCart(): void {
  try {
    localStorage.removeItem("101hub-cart");
    window.dispatchEvent(new Event("101hub:cart-updated"));
  } catch {
    // Ignore errors
  }
}

/**
 * Gets cart from localStorage
 */
export function getCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("101hub-cart");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves cart to localStorage and triggers update event
 */
export function saveCart(lines: CartLine[]): void {
  try {
    localStorage.setItem("101hub-cart", JSON.stringify(lines));
    window.dispatchEvent(new Event("101hub:cart-updated"));
  } catch {
    // Ignore errors
  }
}
