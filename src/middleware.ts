import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Public surfaces: the sign-in/up flows and public share links. Everything else
 * requires an authenticated session — the app is password-gated by default,
 * per the brief's "auth-gated" principle.
 */
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share/(.*)", // public deliverable links — unguessable token, no login
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
