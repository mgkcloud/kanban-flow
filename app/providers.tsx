"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { BYPASS_CLERK } from "@/lib/dev-auth"
import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from "@/components/ui/ErrorBoundary"

/**
 * Wraps React children with authentication, error boundary, and notification providers.
 *
 * Conditionally includes the Clerk authentication provider based on the {@link BYPASS_CLERK} flag. Always wraps children with an error boundary and a toaster for notifications.
 *
 * @param children - The React nodes to be rendered within the providers.
 *
 * @remark
 * If {@link BYPASS_CLERK} is true, authentication is bypassed and only error handling and notifications are provided.
 */
export default function Providers({ children }: { children: ReactNode }) {
  if (BYPASS_CLERK) {
    return (
      <ErrorBoundary>
        {children}
        <Toaster />
      </ErrorBoundary>
    )
  }
  return (
    <ClerkProvider>
      <ErrorBoundary>
        {children}
        <Toaster />
      </ErrorBoundary>
    </ClerkProvider>
  )
}
