import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if the request is for a public route
  const isPublicRoute =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/signup") ||
    req.nextUrl.pathname.startsWith("/auth/callback") ||
    req.nextUrl.pathname.startsWith("/client/") ||
    req.nextUrl.pathname.startsWith("/api/create-user")

  // If not authenticated and not a public route, redirect to login
  if (!session && !isPublicRoute) {
    const redirectUrl = new URL("/login", req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If authenticated and trying to access login/signup, redirect to dashboard
  if (session && (req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/signup"))) {
    const redirectUrl = new URL("/", req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // For client view routes, set the client token in the request
  if (req.nextUrl.pathname.startsWith("/client/")) {
    const parts = req.nextUrl.pathname.split("/")
    if (parts.length >= 4) {
      const clientToken = parts[3]

      // Set the client token in the request for RLS policies
      const response = NextResponse.next()
      response.cookies.set("client_token", clientToken, {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      })

      return response
    }
  }

  // Add this logic to help with static asset 404 errors
  const url = new URL(req.url)
  
  // Handle static asset requests to prevent 404s
  if (url.pathname.startsWith('/_next/static/')) {
    // Apply cache-control headers to prevent excessive caching of HTML files
    // that reference these static assets
    return NextResponse.next({
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }
  
  // Apply cache headers to HTML responses to prevent stale references
  if (!url.pathname.includes('.')) {
    return NextResponse.next({
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
}
