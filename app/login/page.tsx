"use client"

import React, { useState } from "react"
import { useSignIn, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FolderKanban, Mail, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const { user } = useUser()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [code, setCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [signInAttemptId, setSignInAttemptId] = useState<string | null>(null)

  // Redirect if already signed in
  React.useEffect(() => {
    if (user) {
      router.replace("/")
    }
  }, [user, router])

  if (user) {
    // Optionally show a loading spinner
    return null
  }

  // Handle email submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }
    // Basic email format validation
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Please enter a valid email address")
      return
    }
    if (!isLoaded) return
    setIsLoading(true)
    try {
      const attempt = await signIn.create({
        identifier: email,
        strategy: "email_code",
      })
      setSignInAttemptId(attempt.id)
      setIsVerifying(true)
      setResendCooldown(30)
      // Start cooldown timer
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: unknown) {
      // Log and display Clerk error message
      if (
        typeof err === "object" &&
        err !== null &&
        "errors" in err &&
        Array.isArray((err as { errors?: unknown[] }).errors) &&
        (err as { errors: unknown[] }).errors.length > 0
      ) {
        const firstError = (err as { errors: { longMessage?: string; message?: string }[] }).errors[0]
        setError(firstError.longMessage || firstError.message || "Sign in failed")
        console.error("Clerk signIn.create error:", (err as { errors: unknown[] }).errors)
      } else {
        setError("Sign in failed")
        console.error("Unknown signIn.create error:", err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle code submit
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!code.trim()) {
      setError("Please enter the code from your email")
      return
    }
    if (!isLoaded) return
    setIsLoading(true)
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      })
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId })
        router.push("/")
      } else if (typeof result.status === "string" && result.status.toLowerCase().includes("need")) {
        setError("Please complete all required steps. Try signing in again.")
      } else if (typeof result.status === "string" && result.status.toLowerCase().includes("expire")) {
        setError("Code expired. Please request a new code.")
      } else {
        setError("Invalid code. Please check your email and try again.")
      }
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "errors" in err &&
        Array.isArray((err as { errors?: unknown[] }).errors) &&
        (err as { errors: unknown[] }).errors.length > 0
      ) {
        const firstError = (err as { errors: { longMessage?: string; message?: string }[] }).errors[0]
        setError(firstError.longMessage || firstError.message || "Verification failed")
      } else {
        setError("Verification failed")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle resend code
  const handleResend = async () => {
    setError(null)
    setResendLoading(true)
    try {
      if (!signInAttemptId) return
      // Re-initiate the sign-in to resend the code
      await signIn.create({
        identifier: email,
        strategy: "email_code",
      })
      setResendCooldown(30)
      // Start cooldown timer
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      setError("Failed to resend code. Please try again.")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg mx-auto mb-4">
            <FolderKanban size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-primary">Kanban Flow</h1>
          <p className="text-muted-foreground mt-2">Sign in to manage your projects</p>
        </div>
        <Card className="frosted-panel border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>We&apos;ll send you a code to your email</CardDescription>
          </CardHeader>
          <CardContent>
            {!isVerifying ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background/50"
                    required
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full bg-gradient-primary text-white" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Check your inbox</h3>
                  <p className="text-muted-foreground mb-4">
                    We&apos;ve sent a sign-in code to <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">Enter the code from your email to sign in to your account.</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="code" className="text-sm font-medium">
                    Code
                  </label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="bg-background/50 tracking-widest text-center font-mono text-lg"
                    required
                    maxLength={8}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full bg-gradient-primary text-white" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Verify & Sign In"}
                </Button>
                <div className="flex items-center justify-between mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs flex items-center gap-1"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resendLoading}
                  >
                    <RefreshCw size={14} className="mr-1" />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resendLoading ? "Resending..." : "Resend Code"}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="text-xs"
                    onClick={() => {
                      setIsVerifying(false)
                      setCode("")
                      setError(null)
                    }}
                  >
                    Change email
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
