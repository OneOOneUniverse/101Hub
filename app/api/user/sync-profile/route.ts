import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

type BrowsingData = {
  cart: { productId: string; qty: number }[];
  wishlist: string[];
};

/**
 * POST /api/user/sync-profile
 * Sync browsing data (cart, wishlist) to Clerk user metadata
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as BrowsingData;

    // Update user's private metadata with browsing data
    await clerkClient().users.updateUser(user.id, {
      privateMetadata: {
        profile: {
          cart: body.cart || [],
          wishlist: body.wishlist || [],
          lastUpdated: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error syncing profile:", error);
    return NextResponse.json(
      { error: "Failed to sync profile" },
      { status: 500 }
    );
  }
}
