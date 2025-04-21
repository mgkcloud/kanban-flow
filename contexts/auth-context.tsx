"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User, Session } from "@supabase/supabase-js"
import { supabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = supabaseBrowserClient
    if (!supabase) return

    // Check active session
    const getSession = async () => {
      setIsLoading(true)
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error("Error getting session:", error)
      }

      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    }

    getSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string) => {
    const supabase = supabaseBrowserClient
    if (!supabase) {
      return { error: new Error("Supabase client not available") }
    }

    setIsLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setIsLoading(false)

    return { error }
  }

  const signOut = async () => {
    const supabase = supabaseBrowserClient
    if (!supabase) return

    setIsLoading(true)
    await supabase.auth.signOut()
    setIsLoading(false)
    router.push("/login")
  }

  const refreshSession = async () => {
    const supabase = supabaseBrowserClient
    if (!supabase) return

    const {
      data: { session },
    } = await supabase.auth.getSession()
    setSession(session)
    setUser(session?.user ?? null)
  }

  const createUserIfNeeded = async () => {
    const supabase = supabaseBrowserClient
    if (!user || !supabase) return

    try {
      // Check if user exists in our database
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .maybeSingle()

      if (existingUser) return // User already exists

      // Create user via API route
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          email: user.email,
        }),
      })

      if (!response.ok) {
        console.error("Failed to create user:", await response.text())
      }
    } catch (error) {
      console.error("Error creating user:", error)
    }
  }

  useEffect(() => {
    if (user) {
      createUserIfNeeded()
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signOut, refreshSession }}>
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
