import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { randomId } from "@/lib/data"

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json()

    // Create a Supabase client with admin privileges
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current user's session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if user already exists in our database
    const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).maybeSingle()

    if (existingUser) {
      // User already exists, no need to create
      return NextResponse.json({ success: true, userId: existingUser.id })
    }

    // Create the user in our database
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        id: randomId(),
        name,
        email,
        role: "user",
        auth_id: session.user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error creating user:", insertError)
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: newUser.id })
  } catch (error) {
    console.error("Error in create-user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
