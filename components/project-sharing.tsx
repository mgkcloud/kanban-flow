"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Copy, AlertCircle, UserPlus, Mail, Check, X, Shield, Eye, Pencil } from "lucide-react"
import { supabaseBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { randomId } from "@/lib/data"

interface ProjectMember {
  id: string
  user_id: string
  role: "owner" | "editor" | "viewer"
  user: {
    name: string
    email: string
  }
}

interface ProjectInvitation {
  id: string
  email: string
  role: "editor" | "viewer"
  created_at: string
}

interface ProjectSharingProps {
  projectId: string
  projectName: string
  clientUrl: string
}

export function ProjectSharing({ projectId, projectName, clientUrl }: ProjectSharingProps) {
  const { user } = useAuth()
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New invitation state
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor")
  const [isSending, setIsSending] = useState(false)
  const [isLinkCopied, setIsLinkCopied] = useState(false)

  useEffect(() => {
    if (!projectId || !user) return

    const fetchProjectMembers = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch project members
        const { data: membersData, error: membersError } = await supabaseBrowserClient
          .from("project_members")
          .select(`
            id,
            user_id,
            role,
            user:user_id (
              name,
              email
            )
          `)
          .eq("project_id", projectId)

        if (membersError) throw membersError

        // Fix: Ensure user is always an object, not an array
        const normalizedMembers = (membersData as { user: unknown }[]).map((m) => ({
          ...m,
          user: Array.isArray(m.user) ? m.user[0] : m.user,
        }))

        // Fetch pending invitations
        const { data: invitationsData, error: invitationsError } = await supabaseBrowserClient
          .from("project_invitations")
          .select("id, email, role, created_at")
          .eq("project_id", projectId)

        if (invitationsError) throw invitationsError

        setMembers(normalizedMembers as ProjectMember[])
        setInvitations(invitationsData as ProjectInvitation[])
      } catch (err) {
        console.error("Error fetching project sharing data:", err)
        setError("Failed to load sharing information")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjectMembers()
  }, [projectId, user])

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !projectId || !user) return

    setIsSending(true)
    setError(null)

    try {
      // Check if user is already a member
      const existingMember = members.find((m) => m.user.email.toLowerCase() === inviteEmail.toLowerCase())
      if (existingMember) {
        setError("This user is already a member of the project")
        setIsSending(false)
        return
      }

      // Check if invitation already exists
      const existingInvitation = invitations.find((i) => i.email.toLowerCase() === inviteEmail.toLowerCase())
      if (existingInvitation) {
        setError("An invitation has already been sent to this email")
        setIsSending(false)
        return
      }

      // Create invitation token
      const token = randomId()

      // Insert invitation
      const { error: insertError } = await supabaseBrowserClient.from("project_invitations").insert({
        id: randomId(),
        project_id: projectId,
        email: inviteEmail,
        role: inviteRole,
        token,
        created_by: user.id,
      })

      if (insertError) throw insertError

      // TODO: In a real app, send an email with the invitation link
      // For now, we'll just add it to the UI
      setInvitations([
        ...invitations,
        {
          id: randomId(),
          email: inviteEmail,
          role: inviteRole,
          created_at: new Date().toISOString(),
        },
      ])

      // Reset form
      setInviteEmail("")
    } catch (err) {
      console.error("Error sending invitation:", err)
      setError("Failed to send invitation")
    } finally {
      setIsSending(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clientUrl)
    setIsLinkCopied(true)
    setTimeout(() => setIsLinkCopied(false), 2000)
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!projectId || !user) return

    try {
      const { error } = await supabaseBrowserClient.from("project_invitations").delete().eq("id", invitationId)

      if (error) throw error

      setInvitations(invitations.filter((i) => i.id !== invitationId))
    } catch (err) {
      console.error("Error deleting invitation:", err)
      setError("Failed to delete invitation")
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: "owner" | "editor" | "viewer") => {
    if (!projectId || !user) return

    try {
      const { error } = await supabaseBrowserClient
        .from("project_members")
        .update({ role: newRole })
        .eq("id", memberId)

      if (error) throw error

      setMembers(members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
    } catch (err) {
      console.error("Error updating member role:", err)
      setError("Failed to update member role")
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!projectId || !user) return

    try {
      const { error } = await supabaseBrowserClient.from("project_members").delete().eq("id", memberId)

      if (error) throw error

      setMembers(members.filter((m) => m.id !== memberId))
    } catch (err) {
      console.error("Error removing member:", err)
      setError("Failed to remove member")
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Shield size={14} className="text-primary" />
      case "editor":
        return <Pencil size={14} className="text-blue-500" />
      case "viewer":
        return <Eye size={14} className="text-green-500" />
      default:
        return null
    }
  }

  const isCurrentUserOwner = members.some((m) => m.user_id === user?.id && m.role === "owner")

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Users size={16} />
          <span>Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md frosted-panel">
        <DialogHeader>
          <DialogTitle className="text-xl">Share &quot;{projectName}&quot;</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Client link for sharing */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Client View Link</label>
            <div className="flex gap-2">
              <Input value={clientUrl} readOnly className="bg-background/50 text-sm" />
              <Button variant="outline" size="icon" onClick={handleCopyLink} className="shrink-0">
                {isLinkCopied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Share this link with clients to give them view-only access</p>
          </div>

          {/* Invite by email */}
          {isCurrentUserOwner && (
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">Invite Team Members</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-background/50"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                  className="bg-background/50 border rounded-md px-2 text-sm"
                  title="Select role"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button onClick={handleInvite} disabled={isSending || !inviteEmail.trim()} className="shrink-0">
                  <UserPlus size={16} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Team members will receive an email with a magic link to join
              </p>
            </div>
          )}

          {/* Current members */}
          <div className="space-y-2 pt-2 border-t">
            <h3 className="text-sm font-medium">Members</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-md bg-background/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 border">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{member.user.name}</div>
                        <div className="text-xs text-muted-foreground">{member.user.email}</div>
                      </div>
                      <div className="ml-2 flex items-center">
                        {getRoleIcon(member.role)}
                        <span className="text-xs ml-1 capitalize">{member.role}</span>
                      </div>
                    </div>

                    {isCurrentUserOwner && member.user_id !== user?.id && (
                      <div className="flex items-center gap-1">
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleUpdateMemberRole(member.id, e.target.value as "owner" | "editor" | "viewer")
                          }
                          className="text-xs bg-background/50 border rounded-md px-1 py-0.5"
                          title="Update member role"
                        >
                          <option value="owner">Owner</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h3 className="text-sm font-medium">Pending Invitations</h3>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-2 rounded-md bg-background/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Mail size={14} className="text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm">{invitation.email}</div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          {getRoleIcon(invitation.role)}
                          <span className="ml-1 capitalize">{invitation.role}</span>
                        </div>
                      </div>
                    </div>

                    {isCurrentUserOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500"
                        onClick={() => handleDeleteInvitation(invitation.id)}
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
