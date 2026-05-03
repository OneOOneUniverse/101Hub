import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);
const isAuthPage = createRouteMatcher(["/login(.*)", "/signup(.*)"]);
const isProfileRoute = createRouteMatcher(["/profile(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const authState = await auth();

  if (isAdminRoute(req) && !authState.userId) {
    return authState.redirectToSignIn({ returnBackUrl: req.url });
  }

  if (isProfileRoute(req) && !authState.userId) {
    return authState.redirectToSignIn({ returnBackUrl: req.url });
  }

  if (isAuthPage(req) && authState.userId) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};