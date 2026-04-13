import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type UserProfile = {
  cart: { productId: string; qty: number }[];
  wishlist: string[];
  lastUpdated?: string;
};

/**
 * GET /api/user/get-profile
 * Get user's browsing data (cart, wishlist) from Clerk user metadata
 */
export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = (user.privateMetadata?.profile as UserProfile) || {
      cart: [],
      wishlist: [],
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error getting profile:", error);
    return NextResponse.json(
      { error: "Failed to get profile" },
      { status: 500 }
    );
  }
}
