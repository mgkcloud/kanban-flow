"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ClientRedirect({
  params,
}: {
  params: { clientName: string; clientToken: string }
}) {
  const router = useRouter()

  useEffect(() => {
    // This component just ensures the client route works
    // The main page.tsx handles the client view logic
    router.push(`/`)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Loading client view...</h1>
        <p>Redirecting to your client workspace.</p>
      </div>
    </div>
  )
}
