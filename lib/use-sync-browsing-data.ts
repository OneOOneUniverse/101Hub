import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

const CART_STORAGE_KEY = "101hub-cart";
const WISHLIST_STORAGE_KEY = "101hub-wishlist";

/**
 * Hook to sync browsing data (cart, wishlist) to Clerk user metadata when user is signed in
 */
export function useSyncBrowsingDataToProfile() {
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const syncData = async () => {
      try {
        const cart = localStorage.getItem(CART_STORAGE_KEY);
        const wishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);

        // Call API to sync data to Clerk user metadata
        await fetch("/api/user/sync-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cart: cart ? JSON.parse(cart) : [],
            wishlist: wishlist ? JSON.parse(wishlist) : [],
          }),
        });
      } catch {
        // Silently fail if sync fails - user can still browse
      }
    };

    // Sync on mount
    syncData();

    // Sync on interval (every 5 minutes)
    const interval = setInterval(syncData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);
}

/**
 * Hook to load user's saved browsing data from profile on component mount
 */
export function useLoadUserBrowsingData() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const loadData = async () => {
      try {
        const response = await fetch("/api/user/get-profile");
        if (!response.ok) return;

        const data = await response.json();

        // Only restore from profile if localStorage has NO cart key at all (first visit)
        // If localCart exists (even as "[]"), the user has been active — don't overwrite
        const localCart = localStorage.getItem(CART_STORAGE_KEY);
        const localWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);

        if (localCart === null && data.cart && data.cart.length > 0) {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data.cart));
        }

        if (localWishlist === null && data.wishlist && data.wishlist.length > 0) {
          localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(data.wishlist));
        }

        // Trigger refresh events so components update
        window.dispatchEvent(new Event("101hub:profile-loaded"));
      } catch {
        // Silently fail if loading fails
      }
    };

    loadData();
  }, [isLoaded, user]);
}
