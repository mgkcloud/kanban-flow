import React, { createContext, useContext, useEffect, useState } from "react"
import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js"
import { useSession } from "@clerk/nextjs"
import { BYPASS_CLERK } from "./dev-auth"
import type { Database } from "./database.types"

// Type for the context value, allowing null when not ready
type SupabaseContextType = SupabaseClient<Database> | null;
const SupabaseClientContext = createContext<SupabaseContextType>(null)

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const { session, isLoaded: isClerkLoaded } = BYPASS_CLERK ? { session: null, isLoaded: true } : useSession()
  // State to hold the authenticated client
  const [supabaseClient, setSupabaseClient] = useState<SupabaseContextType>(null)

  useEffect(() => {
    // Only proceed if Clerk is loaded
    if (!isClerkLoaded) return;

    async function setupSupabaseClient() {
      try {
        if (BYPASS_CLERK) {
          const devClient = createJsClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
          )
          setSupabaseClient(devClient)
          return
        }

        // If no session, we can still create an unauthenticated client
        if (!session) {
          const anonClient = createJsClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          console.log("No Clerk session available - created unauthenticated Supabase client");
          setSupabaseClient(anonClient);
          return;
        }

        // Get token from Clerk session
        try {
          const token = await session.getToken({ template: "supabase" });
          
          if (!token) {
            console.warn("No Supabase token received from Clerk session");
            // Still create a client but it will be unauthenticated
            const anonClient = createJsClient<Database>(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            setSupabaseClient(anonClient);
            return;
          }

          // Create client with auth headers approach
          const authenticatedClient = createJsClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              global: {
                headers: {
                  Authorization: `Bearer ${token}`,
                  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                }
              }
            }
          );
          
          console.log("Created authenticated Supabase client with Clerk token");
          setSupabaseClient(authenticatedClient);
        } catch (tokenError) {
          console.error("Error getting Supabase token from Clerk:", tokenError);
          // Create a client with no auth token
          const anonClient = createJsClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          setSupabaseClient(anonClient);
        }
      } catch (error) {
        console.error("Error setting up Supabase client:", error);
        // Set client to null on critical errors
        setSupabaseClient(null);
      }
    }

    setupSupabaseClient();
  }, [session, isClerkLoaded]);

  // Render children only when the client state is not null (i.e., attempted setup)
  return (
    <SupabaseClientContext.Provider value={supabaseClient}>
      {supabaseClient ? children : (
        <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
          <div className="text-center frosted-panel p-8 rounded-xl animate-fade-in">
            <h2 className="text-2xl font-bold mb-2 text-gradient-primary">Connecting...</h2>
            <p>Setting up your workspace...</p>
          </div>
        </div>
      )}
    </SupabaseClientContext.Provider>
  )
}

export function useSupabaseClient(): SupabaseClient<Database> {
  const client = useContext(SupabaseClientContext)
  if (!client) {
    throw new Error("useSupabaseClient must be used within SupabaseAuthProvider and the client must be initialized.")
  }
  return client
} 