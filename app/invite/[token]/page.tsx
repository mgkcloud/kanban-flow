"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FolderKanban, AlertCircle, Check } from "lucide-react"
import { randomId } from "@/lib/data"
import { useSupabaseClient } from "@/lib/supabase-auth-context"
import { BYPASS_CLERK, DEV_USER_EMAIL } from "@/lib/dev-auth"

type ProjectPreview = { id: string; name: string }

type InvitationPreview = {
  id: string;
  project_id: string;
  email: string;
  role: "editor" | "viewer";
  expires_at: string;
  projects: ProjectPreview[] | ProjectPreview;
}

export default function InvitePage() {
  const params = useParams()
  const token = params.token as string
  const supabase = useSupabaseClient();
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null)
  const [project, setProject] = useState<ProjectPreview | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()
  const [internalUserId, setInternalUserId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle authentication based on bypass mode - only get user after client mount
  let user = null;
  if (isClient) {
    if (BYPASS_CLERK) {
      user = { id: 'dev-user', primaryEmailAddress: { emailAddress: DEV_USER_EMAIL } };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useUser } = require("@clerk/nextjs");
      // eslint-disable-next-line react-hooks/rules-of-hooks
      user = useUser().user;
    }
  }

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) return

      setIsLoading(true)
      setError(null)

      try {
        // Fetch invitation details (can remain public if intended)
        const { data: invitationData, error: invitationError } = await supabase
          .from("project_invitations")
          .select(`
            id,
            project_id,
            email,
            role,
            expires_at,
            projects:project_id (
              id,
              name
            )
          `)
          .eq("token", token)
          .single()

        if (invitationError) throw invitationError

        if (!invitationData) {
          setError("Invalid or expired invitation")
          setIsLoading(false)
          return
        }

        // Check if invitation has expired
        const expiresAt = new Date(invitationData.expires_at)
        if (expiresAt < new Date()) {
          setError("This invitation has expired")
          setIsLoading(false)
          return
        }

        setInvitation(invitationData)
        const projectData = Array.isArray(invitationData.projects)
          ? invitationData.projects[0] || null
          : invitationData.projects || null
        setProject(projectData)
      } catch (err) {
        console.error("Error fetching invitation:", err)
        setError("Failed to load invitation details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvitation()
  }, [token, supabase])

  // Fetch internal user ID when user is loaded
  useEffect(() => {
    async function fetchInternalUserId() {
      if (!user || !supabase) return;
      
      try {
        if (BYPASS_CLERK) {
          // In bypass mode, look up user by email
          const { data: userData, error } = await supabase
            .from("users")
            .select("id")
            .eq("email", DEV_USER_EMAIL)
            .single();
            
          if (error) {
            console.error("Error fetching dev user ID:", error);
            setError("Could not find dev user account. Please ensure it exists in the database.");
          } else if (userData) {
            setInternalUserId(userData.id);
          }
        } else {
          // In normal mode, use Clerk auth_id
          const { data: userData, error } = await supabase
            .from("users")
            .select("id")
            .eq("auth_id", user.id)
            .single();
            
          if (error) {
            console.error("Error fetching internal user ID:", error);
            setError("Could not verify your user account. Please try logging in again.");
          } else if (userData) {
            setInternalUserId(userData.id);
          }
        }
      } catch (err) {
        console.error("Exception fetching internal user ID:", err);
        setError("An unexpected error occurred while verifying your account.");
      }
    }
    fetchInternalUserId();
  }, [user, supabase])

  const handleAcceptInvitation = async () => {
    // Use internalUserId in checks
    if (!invitation || !project || !internalUserId || !supabase) return

    setIsAccepting(true)
    setError(null)

    try {
      // Check if user is already a member using internalUserId
      const { data: existingMember, error: checkError } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", project.id)
        .eq("user_id", internalUserId)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingMember) {
        // User is already a member, just delete the invitation
        const { error: deleteError } = await supabase
          .from("project_invitations")
          .delete()
          .eq("id", invitation.id)

        if (deleteError) throw deleteError

        setIsSuccess(true)
        setTimeout(() => router.push("/"), 2000)
        return
      }

      // Add user as a project member using internalUserId
      const { error: insertError } = await supabase.from("project_members").insert({
        id: randomId(),
        project_id: project.id,
        user_id: internalUserId,
        role: invitation.role,
      })

      if (insertError) throw insertError

      // Delete the invitation
      const { error: deleteError } = await supabase
        .from("project_invitations")
        .delete()
        .eq("id", invitation.id)

      if (deleteError) throw deleteError

      setIsSuccess(true)
      setTimeout(() => router.push("/"), 2000)
    } catch (err) {
      console.error("Error accepting invitation:", err)
      setError("Failed to accept invitation")
    } finally {
      setIsAccepting(false)
    }
  }

  // Don't render anything until client is mounted
  if (!isClient) {
    return null;
  }

  // If not authenticated, show login prompt (only in non-bypass mode)
  if (!BYPASS_CLERK && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg mx-auto mb-4">
              <FolderKanban size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gradient-primary">Kanban Flow</h1>
            <p className="text-muted-foreground mt-2">You&apos;ve been invited to join a project</p>
          </div>

          <Card className="frosted-panel border shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Sign in to accept invitation</CardTitle>
              <CardDescription>You need to sign in to accept this invitation</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-4">
              <p className="mb-4">Please sign in or create an account to join this project.</p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => router.push(`/login?redirect=/invite/${token}`)}
                  className="bg-gradient-primary text-white"
                >
                  Sign In
                </Button>
                <Button variant="outline" onClick={() => router.push(`/signup?redirect=/invite/${token}`)}>
                  Create Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg mx-auto mb-4">
            <FolderKanban size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-primary">Kanban Flow</h1>
          <p className="text-muted-foreground mt-2">Project Invitation</p>
        </div>

        <Card className="frosted-panel border shadow-lg">
          {isLoading ? (
            <CardContent className="text-center py-8">
              <p>Loading invitation details...</p>
            </CardContent>
          ) : error ? (
            <CardContent className="py-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={() => router.push("/")}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          ) : isSuccess ? (
            <CardContent className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Invitation Accepted</h3>
              <p className="text-muted-foreground mb-4">You have successfully joined the project.</p>
              <Button onClick={() => router.push("/")}>Go to Dashboard</Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-xl">You&apos;ve been invited</CardTitle>
                <CardDescription>{invitation?.email} has been invited to join a project</CardDescription>
              </CardHeader>
              <CardContent className="py-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">Project</h3>
                    <p className="text-lg font-semibold">{project?.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Your Role</h3>
                    <p className="capitalize">{invitation?.role}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-gradient-primary text-white"
                  onClick={handleAcceptInvitation}
                  disabled={isAccepting}
                >
                  {isAccepting ? "Accepting..." : "Accept Invitation"}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
