import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/auth";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ isSignedIn: false, isAdmin: false });
  }

  const isAdmin = await isCurrentUserAdmin();
  return NextResponse.json({ isSignedIn: true, isAdmin });
}