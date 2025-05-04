import { useState, useEffect } from "react"
import { useSupabaseClient } from "@/lib/supabase-auth-context"
import { randomId, type User as InternalUser } from "@/lib/data"
import { Shield, Pencil, Eye } from "lucide-react"

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

interface UseProjectSharingLogicProps {
  projectId: string
  projectName: string
  clientUrl: string
  currentUser: InternalUser | null
  sharingData: { members: ProjectMember[]; invitations: ProjectInvitation[] } | null
  loading: boolean
  error: string | null
  user: { id: string } | null
}

export function useProjectSharingLogic({ projectId, clientUrl, currentUser, sharingData, user }: UseProjectSharingLogicProps) {
  const supabase = useSupabaseClient()
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor")
  const [isSending, setIsSending] = useState(false)
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([])

  useEffect(() => {
    if (sharingData) {
      setMembers(sharingData.members)
      setInvitations(sharingData.invitations)
    } else {
      setMembers([])
      setInvitations([])
    }
  }, [sharingData])

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !projectId || !currentUser || !currentUser.id) return
    setIsSending(true)
    try {
      const existingMember = members.find((m) => m.user.email.toLowerCase() === inviteEmail.toLowerCase())
      if (existingMember) {
        setIsSending(false)
        return
      }
      const existingInvitation = invitations.find((i) => i.email.toLowerCase() === inviteEmail.toLowerCase())
      if (existingInvitation) {
        setIsSending(false)
        return
      }
      const token = randomId()
      const { error: insertError } = await supabase.from("project_invitations").insert({
        id: randomId(),
        project_id: projectId,
        email: inviteEmail,
        role: inviteRole,
        token,
        created_by: currentUser.id,
      })
      if (insertError) throw insertError
      setInvitations([
        ...invitations,
        {
          id: randomId(),
          email: inviteEmail,
          role: inviteRole,
          created_at: new Date().toISOString(),
        },
      ])
      setInviteEmail("")
    } catch {
      // error intentionally ignored
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
    if (!projectId || !user || !user.id) return
    try {
      const { error } = await supabase.from("project_invitations").delete().eq("id", invitationId)
      if (error) throw error
      setInvitations(invitations.filter((i) => i.id !== invitationId))
    } catch {
      // error intentionally ignored
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: "owner" | "editor" | "viewer") => {
    if (!projectId || !user || !user.id) return
    try {
      const { error } = await supabase.from("project_members").update({ role: newRole }).eq("id", memberId)
      if (error) throw error
      setMembers(members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
    } catch {
      // error intentionally ignored
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!projectId || !user || !user.id) return
    try {
      const { error } = await supabase.from("project_members").delete().eq("id", memberId)
      if (error) throw error
      setMembers(members.filter((m) => m.id !== memberId))
    } catch {
      // error intentionally ignored
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

  const isCurrentUserOwner = members.some((m) => m.user_id === currentUser?.id && m.role === "owner")

  return {
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
  }
} 