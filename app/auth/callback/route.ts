import { NextResponse } from "next/server"

// This route is now obsolete. Clerk handles all authentication callbacks.
// We simply redirect to the home page.
export async function GET() {
  return NextResponse.redirect("/")
}
