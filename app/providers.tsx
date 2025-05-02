"use client"

import { ClerkProvider } from "@clerk/nextjs"
import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from "@/components/ui/ErrorBoundary"

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ErrorBoundary>
        {children}
        <Toaster />
      </ErrorBoundary>
    </ClerkProvider>
  )
} 