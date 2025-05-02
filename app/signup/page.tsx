"use client"

import React, { useState } from "react"
import { useSignUp, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FolderKanban, Mail, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { isClerkAPIResponseError } from "@clerk/nextjs/errors"

export default function SignupPage() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const { user } = useUser()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [code, setCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [signUpAttemptId, setSignUpAttemptId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }
    // Basic email format validation
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Please enter a valid email address")
      return
    }
    if (!isLoaded || !signUp) return
    setIsLoading(true)
    try {
      await signUp.create({ emailAddress: email })
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setSignUpAttemptId(signUp.id)
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
      if (isClerkAPIResponseError(err)) {
        const firstError = (err as { errors: { longMessage?: string; message?: string }[] }).errors[0]
        setError(firstError.longMessage || firstError.message || "Sign up failed")
        console.error("Clerk signUp.create error:", (err as { errors: unknown[] }).errors)
      } else if (
        typeof err === "object" &&
        err !== null &&
        "errors" in err &&
        Array.isArray((err as { errors?: unknown[] }).errors) &&
        (err as { errors: unknown[] }).errors.length > 0
      ) {
        const firstError = (err as { errors: { longMessage?: string; message?: string }[] }).errors[0]
        setError(firstError.longMessage || firstError.message || "Sign up failed")
        console.error("Clerk signUp.create error:", (err as { errors: unknown[] }).errors)
      } else {
        setError("Sign up failed")
        console.error("Unknown signUp.create error:", err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle code submit
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      setError("Please enter the code from your email")
      return
    }
    if (!isLoaded || !signUp) return
    setIsLoading(true)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId })
        try {
          await fetch("/api/create-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: email.split("@")[0],
              email,
            }),
          })
        } catch (err) {
          console.error("Failed to create user in Supabase:", err)
        }
        router.push("/")
      } else if (typeof result.status === "string" && result.status.toLowerCase().includes("need")) {
        setError("Please complete all required steps. Try signing up again.")
      } else if (typeof result.status === "string" && result.status.toLowerCase().includes("expire")) {
        setError("Code expired. Please request a new code.")
      } else {
        setError("Invalid code. Please check your email and try again.")
      }
    } catch (err: unknown) {
      if (isClerkAPIResponseError(err)) {
        const firstError = (err as { errors: { longMessage?: string; message?: string }[] }).errors[0]
        setError(firstError.longMessage || firstError.message || "Verification failed")
      } else if (
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
    if (!signUpAttemptId || !signUp) return
    setError(null)
    setResendLoading(true)
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
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
          <p className="text-muted-foreground mt-2">Sign up to manage your projects</p>
        </div>
        <Card className="frosted-panel border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Sign Up</CardTitle>
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
                <div id="clerk-captcha"></div>
                <Button type="submit" className="w-full bg-gradient-primary text-white" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
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
                    We&apos;ve sent a sign-up code to <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">Enter the code from your email to complete sign up.</p>
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
                  {isLoading ? "Verifying..." : "Verify & Sign Up"}
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
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
