import { useState, useEffect } from "react"
import { useUser, useSession } from "@clerk/nextjs"
import { BYPASS_CLERK, DEV_USER_EMAIL } from "@/lib/dev-auth"
import { useSupabaseClient } from "@/lib/supabase-auth-context"
import { type User, randomId } from "@/lib/data"

/**
 * Synchronizes and returns the current user state by integrating Clerk authentication with Supabase user records.
 *
 * In development mode with Clerk bypassed, retrieves the user by a predefined email from Supabase. In production, ensures a Supabase user exists for the authenticated Clerk user, creating one if necessary.
 *
 * @returns An object containing the current user, or `null` if no user is found or authenticated.
 *
 * @remark The returned user may be created in Supabase if it does not already exist for the authenticated Clerk user.
 */
export function useCurrentUserState() {
  const { user } = BYPASS_CLERK ? { user: null } : useUser()
  const { session } = BYPASS_CLERK ? { session: null } : useSession()
  const supabase = useSupabaseClient()
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    async function syncUser() {
      if (BYPASS_CLERK) {
        try {
          const { data } = await supabase
            .from("users")
            .select("*")
            .eq("email", DEV_USER_EMAIL)
            .single()
          if (data) {
            setCurrentUser(data as User)
          }
        } catch (error) {
          console.error("Error loading dev user:", error)
        }
        return
      }

      if (!user || !user.id || !session) return
      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .single()
        if (userError) {
          if (userError.code === "PGRST116") {
            const newUser = {
              id: randomId(),
              name: user.firstName || user.primaryEmailAddress?.emailAddress.split("@")[0] || "User",
              email: user.primaryEmailAddress?.emailAddress || "",
              role: "user",
              auth_id: user.id,
            }
            const { error: insertError } = await supabase.from("users").insert(newUser)
            if (!insertError) {
              setCurrentUser(newUser as User)
            }
          }
        } else {
          setCurrentUser(userData as User)
        }
      } catch (error) {
        console.error("Error syncing user:", error)
      }
    }
    syncUser()
  }, [user, session, supabase, BYPASS_CLERK, DEV_USER_EMAIL])

  return { currentUser }
} 