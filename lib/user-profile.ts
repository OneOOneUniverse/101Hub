import { currentUser } from "@clerk/nextjs/server";

/**
 * User profile data stored in Clerk metadata
 */
export type UserProfileData = {
  cart: CartItem[];
  wishlist: string[]; // Array of product IDs
  lastUpdated: string; // ISO timestamp
};

export type CartItem = {
  productId: string;
  qty: number;
};

/**
 * Get user profile data from Clerk user metadata (server-side)
 */
export async function getUserProfile(): Promise<UserProfileData | null> {
  try {
    const user = await currentUser();
    if (!user) return null;

    const profileData = (user.privateMetadata?.profile as UserProfileData) || {
      cart: [],
      wishlist: [],
      lastUpdated: new Date().toISOString(),
    };

    return profileData;
  } catch {
    return null;
  }
}

/**
 * Sync browsing data to localStorage, respecting user preference
 * Use this on client-side to load user data into localStorage
 */
export function syncUserDataToLocalStorage(
  profileData: UserProfileData,
  cartStorageKey: string = "101hub-cart",
  wishlistStorageKey: string = "101hub-wishlist"
) {
  if (!profileData) return;

  try {
    if (typeof window !== "undefined") {
      // Only overwrite if user data is newer or localStorage is empty
      const localCart = localStorage.getItem(cartStorageKey);
      const localWishlist = localStorage.getItem(wishlistStorageKey);

      if (!localCart || profileData.cart.length > 0) {
        localStorage.setItem(cartStorageKey, JSON.stringify(profileData.cart));
      }

      if (!localWishlist || profileData.wishlist.length > 0) {
        localStorage.setItem(wishlistStorageKey, JSON.stringify(profileData.wishlist));
      }
    }
  } catch {
    // Silently fail if storage is not available
  }
}

/**
 * Get browsing data from localStorage
 */
export function getLocalBrowsingData(
  cartStorageKey: string = "101hub-cart",
  wishlistStorageKey: string = "101hub-wishlist"
): UserProfileData {
  try {
    const cartData = localStorage.getItem(cartStorageKey);
    const wishlistData = localStorage.getItem(wishlistStorageKey);

    return {
      cart: cartData ? (JSON.parse(cartData) as CartItem[]) : [],
      wishlist: wishlistData ? (JSON.parse(wishlistData) as string[]) : [],
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return {
      cart: [],
      wishlist: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}
