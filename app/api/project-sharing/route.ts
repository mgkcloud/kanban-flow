import { NextRequest, NextResponse } from "next/server"
import { supabaseAdminClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId")

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const supabase = supabaseAdminClient()

  // Fetch members
  const { data: membersData, error: membersError } = await supabase
    .from("project_members")
    .select(
      `id,
       user_id,
       role,
       user:user_id (
         name,
         email
       )`
    )
    .eq("project_id", projectId)

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }

  type RawMember = {
    id: string
    user_id: string
    role: "owner" | "editor" | "viewer"
    user: { name: string; email: string } | { name: string; email: string }[]
  }

  const normalizedMembers = (membersData as RawMember[]).map((m) => ({
    ...m,
    user: Array.isArray(m.user) ? m.user[0] : m.user,
  }))

  // Fetch invitations
  const { data: invitationsData, error: invitationsError } = await supabase
    .from("project_invitations")
    .select("id, email, role, created_at")
    .eq("project_id", projectId)

  if (invitationsError) {
    return NextResponse.json({ error: invitationsError.message }, { status: 500 })
  }

  return NextResponse.json({ members: normalizedMembers, invitations: invitationsData })
} 