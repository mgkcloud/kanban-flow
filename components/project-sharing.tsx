"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Copy, AlertCircle, UserPlus, Mail, Check, X } from "lucide-react"
import { type User as InternalUser } from "@/lib/data"
import { useProjectSharingLogic } from "./project-sharing-logic"
import { BYPASS_CLERK, DEV_USER_EMAIL } from "@/lib/dev-auth"

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
  currentUser: InternalUser | null
  sharingData: { members: ProjectMember[]; invitations: ProjectInvitation[] } | null
  loading: boolean
  error: string | null
}

export function ProjectSharing(props: ProjectSharingProps) {
  const [isClient, setIsClient] = useState(false)

  // Handle client-side mounting
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handle authentication based on bypass mode - only get user after client mount
  let user = null
  if (isClient) {
    if (BYPASS_CLERK) {
      user = { id: 'dev-user' }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useUser } = require("@clerk/nextjs")
      // eslint-disable-next-line react-hooks/rules-of-hooks
      user = useUser().user
    }
  }

  const logic = useProjectSharingLogic({ ...props, user })
  const {
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    isSending,
    isLinkCopied,
    handleInvite,
    handleCopyLink,
    members,
    invitations,
    handleDeleteInvitation,
    handleUpdateMemberRole,
    handleRemoveMember,
    getRoleIcon,
    isCurrentUserOwner,
  } = logic

  // Don't render anything until client is mounted
  if (!isClient) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Users size={16} />
            <span>Share</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md frosted-panel">
          <div className="p-4">Loading...</div>
        </DialogContent>
      </Dialog>
    )
  }

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
          <DialogTitle className="text-xl">Share &quot;{props.projectName}&quot;</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {props.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{props.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Client View Link</label>
            <div className="flex gap-2">
              <Input value={props.clientUrl} readOnly className="bg-background/50 text-sm" />
              <Button variant="outline" size="icon" onClick={handleCopyLink} className="shrink-0">
                {isLinkCopied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Share this link with clients to give them view-only access</p>
          </div>
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
          <div className="space-y-2 pt-2 border-t">
            <h3 className="text-sm font-medium">Members</h3>
            {props.loading ? (
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
