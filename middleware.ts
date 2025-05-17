// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const BYPASS_CLERK = process.env.NEXT_PUBLIC_BYPASS_CLERK === 'true'

// Define routes that should be publicly accessible without authentication
const isPublicRoute = createRouteMatcher([
  '/', // Example: Your landing page
  '/sign-in(.*)', // Clerk's sign-in pages
  '/sign-up(.*)', // Clerk's sign-up pages
  '/api/public/(.*)', // Example: Any public API endpoints you might have
  '/api/webhooks/(.*)', // Example: Webhooks often need to be public
  // Add any other public routes specific to your application here.
  // Clerk's own auth callback route is typically handled internally,
  // but if you have custom callbacks, add them.
]);

// Define routes that Clerk should completely ignore (including auth processing)
// NOTE: The `config.matcher` below usually handles excluding static assets,
// so `ignoredRoutes` might only be needed for very specific cases like certain API endpoints.
const isIgnoredRoute = createRouteMatcher([
  // '/api/health', // Example: An ignored health check endpoint
]);

export default clerkMiddleware((auth, req) => {
  // If the route is not ignored and not public, then protect it.
  // Users without an active session will be redirected to the sign-in page.
  if (!BYPASS_CLERK && !isIgnoredRoute(req) && !isPublicRoute(req)) {
    auth.protect();
  }

  // You can add custom logic here if needed after the auth check.
  // For example, role-based access control:
  // if (auth.userId && !auth.has({ role: 'admin' }) && req.nextUrl.pathname.startsWith('/admin')) {
  //   const orgSelection = new URL('/unauthorized', req.url) // Or redirect somewhere else
  //   return Response.redirect(orgSelection)
  // }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets and other specified exclusions.
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    /*
     * Match all routes that start with /api or /trpc (suggested by Clerk).
     * Adjust if you have different API routing conventions.
     */
    '/(api|trpc)(.*)',
  ],
};