import { NextResponse } from "next/server"
import { randomId } from "@/lib/data"
import { supabaseAdminClient } from "@/lib/supabase"
import { auth } from "@clerk/nextjs/server"

export async function POST(request: Request) {
  try {
    // Get user info from Clerk
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { name, email } = await request.json()
    const supabase = supabaseAdminClient()

    // Check if user already exists in our database (by Clerk user ID)
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", userId)
      .maybeSingle()

    if (existingUser) {
      // User already exists, no need to create
      return NextResponse.json({ success: true, userId: existingUser.id })
    }

    // Check if user already exists by email (for overwrite logic)
    const { data: existingUserByEmail } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existingUserByEmail) {
      // Overwrite: update the existing user with new auth_id, name, and role
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          name,
          auth_id: userId,
          role: "user",
        })
        .eq("id", existingUserByEmail.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating user:", updateError)
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
      }
      return NextResponse.json({ success: true, userId: updatedUser.id })
    }

    // Create the user in our database
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        id: randomId(),
        name,
        email,
        role: "user",
        auth_id: userId,
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
