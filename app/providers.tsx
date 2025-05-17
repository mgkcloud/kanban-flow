"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { BYPASS_CLERK } from "@/lib/dev-auth"
import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from "@/components/ui/ErrorBoundary"

export default function Providers({ children }: { children: ReactNode }) {
  const content = (
    <ErrorBoundary>
      {children}
      <Toaster />
    </ErrorBoundary>
  )
  return BYPASS_CLERK ? content : <ClerkProvider>{content}</ClerkProvider>
}
