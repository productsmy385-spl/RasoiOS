import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that do not require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/r/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/manifest.json",
  "/sw.js",
]);

const rawKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isRealClerkKey = Boolean(
  rawKey &&
    !rawKey.includes("placeholder") &&
    !rawKey.includes("example.com")
);

export default isRealClerkKey
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|png|jpg|jpeg|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
