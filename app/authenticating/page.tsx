"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BYPASS_CLERK } from "@/lib/dev-auth";

export default function AuthenticatingPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle bypass mode - only after client mount to prevent hydration mismatch
  useEffect(() => {
    if (isClient && BYPASS_CLERK) {
      router.replace("/");
    }
  }, [router, isClient]);

  // Don't render anything until client is mounted or if bypassing
  if (!isClient || BYPASS_CLERK) {
    return null;
  }

  // From here on, we know we're on the client and not bypassing, so we can safely import Clerk
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useUser } = require("@clerk/nextjs");
  
  // Now we can use the hooks safely
  const { user, isLoaded } = useUser();

  useEffect(() => {
    // Wait until auth state is determined
    if (isLoaded) {
      if (user) {
        // User is authenticated, check for redirect param or go home
        const searchParams = new URLSearchParams(window.location.search);
        const redirectPath = searchParams.get("redirect") || "/";
        router.replace(redirectPath);
      } else {
        // Auth failed or session expired, go to login
        router.replace("/login");
      }
    }
  }, [user, isLoaded, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Authenticating...</p>
      </div>
    </div>
  );
} 