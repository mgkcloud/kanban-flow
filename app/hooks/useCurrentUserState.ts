import { useState, useEffect } from "react"
import { useUser, useSession } from "@clerk/nextjs"
import { useSupabaseClient } from "@/lib/supabase-auth-context"
import { type User, randomId } from "@/lib/data"

export function useCurrentUserState() {
  const { user } = useUser()
  const { session } = useSession()
  const supabase = useSupabaseClient()
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    async function syncUser() {
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
  }, [user, session, supabase])

  return { currentUser }
} 