import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: cookieStore }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const redirectUrl = new URL(`/authenticating`, origin)
      redirectUrl.searchParams.set("redirect", next)
      return NextResponse.redirect(redirectUrl.toString())
    }

    // Handle error exchanging code
    console.error("Error exchanging code for session:", error)
    const errorUrl = new URL("/login", origin)
    errorUrl.searchParams.set("error", "Authentication failed. Please try again.")
    errorUrl.searchParams.set("errorCode", error.code || "UNKNOWN")
    return NextResponse.redirect(errorUrl.toString())
  }

  // Handle missing code
  console.warn("Auth callback called without code.")
  const errorUrl = new URL("/login", origin)
  errorUrl.searchParams.set("error", "Invalid authentication link.")
  return NextResponse.redirect(errorUrl.toString())
}
