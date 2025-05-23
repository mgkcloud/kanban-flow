import { NextRequest, NextResponse } from "next/server"
import { supabaseAdminClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId")
  
  console.log('[API /project-sharing] Received request for projectId:', projectId)

  if (!projectId) {
    console.error('[API /project-sharing] Missing projectId in request')
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
    console.error('[API /project-sharing] Error fetching members:', membersError)
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
    console.error('[API /project-sharing] Error fetching invitations:', invitationsError)
    return NextResponse.json({ error: invitationsError.message }, { status: 500 })
  }

  console.log('[API /project-sharing] Returning data - members:', normalizedMembers.length, 'invitations:', invitationsData?.length || 0)
  return NextResponse.json({ members: normalizedMembers, invitations: invitationsData })
} 