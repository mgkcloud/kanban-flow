import { NextResponse } from "next/server"
import { supabaseAdminClient } from "@/lib/supabase"
import { randomId, type Task } from "@/lib/data"

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Task> & { userId: string }
  const {
    title,
    description,
    status = "todo",
    priority = "medium",
    assignee_id,
    visibility = "public",
    project_id,
    userId,
    estimated_time,
    completion_time,
    external_id,
    due_date,
    tags,
  } = body

  if (!project_id || !title || !userId) {
    return NextResponse.json({ error: "project_id, title and userId are required" }, { status: 400 })
  }

  const supabase = supabaseAdminClient()

  const newTask = {
    id: randomId(),
    title,
    description,
    status,
    priority,
    assignee_id,
    visibility,
    project_id,
    created_at: new Date().toISOString(),
    estimated_time,
    completion_time,
    external_id,
    due_date,
    tags,
  }

  const { data, error } = await supabase.from("tasks").insert(newTask).select().single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
} 