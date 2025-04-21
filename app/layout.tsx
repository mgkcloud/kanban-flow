import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Providers from "./providers"

const inter = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Kanban Flow",
  description: "Collaborative project management with Kanban boards",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
