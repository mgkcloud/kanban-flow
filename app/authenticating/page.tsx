"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

export default function AuthenticatingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until auth state is determined
    if (!isLoading) {
      if (user) {
        // User is authenticated, check for redirect param or go home
        const searchParams = new URLSearchParams(window.location.search);
        const redirectPath = searchParams.get("redirect") || "/";
        router.replace(redirectPath);
      } else {
        // Auth failed or session expired, go to login
        // This shouldn't happen often directly from callback, but handles edge cases
        router.replace("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Authenticating...</p>
      </div>
    </div>
  );
} 