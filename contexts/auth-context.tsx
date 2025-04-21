"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react"
import { useRouter } from "next/navigation"

// If you want to provision users in Supabase after login, you can keep this logic,
// but it should not affect session state. Otherwise, remove all Supabase session/auth logic.
// import { createClient } from "@supabase/supabase-js"
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// )

type AuthContextType = {
  user: any | null
  isLoading: boolean
  signIn: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setIsLoading(status === "loading")
  }, [status])

  // Optional: Provision user in Supabase after login (does not affect session)
  // useEffect(() => {
  //   const provisionUserIfNeeded = async () => {
  //     if (!session?.user?.email) return
  //     const { data: existingUser } = await supabase
  //       .from("users")
  //       .select("id")
  //       .eq("email", session.user.email)
  //       .maybeSingle()
  //     if (!existingUser) {
  //       // Try to get name from localStorage (set during signup)
  //       let name = session.user.name || session.user.email.split("@")[0]
  //       try {
  //         if (typeof window !== "undefined") {
  //           const pendingName = localStorage.getItem("pending_signup_name")
  //           if (pendingName) {
  //             name = pendingName
  //             localStorage.removeItem("pending_signup_name")
  //           }
  //         }
  //       } catch {}
  //       await supabase.from("users").insert({
  //         email: session.user.email,
  //         name,
  //       })
  //     }
  //   }
  //   if (session?.user?.email) {
  //     provisionUserIfNeeded()
  //   }
  // }, [session?.user?.email, session?.user?.name])

  const signIn = async (email: string) => {
    setIsLoading(true)
    await nextAuthSignIn("email", { email, callbackUrl: "/" })
    setIsLoading(false)
  }

  const signOut = async () => {
    setIsLoading(true)
    await nextAuthSignOut({ callbackUrl: "/login" })
    setIsLoading(false)
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
