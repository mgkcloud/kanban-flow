import { NextResponse } from "next/server"
import { supabaseAdminClient } from "@/lib/supabase"
import { type Task } from "@/lib/data"

async function triggerWebhook(projectId: string, status: Task["status"], task: Task) {
  const supabase = supabaseAdminClient()
  const { data: webhook } = await supabase
    .from("status_webhooks")
    .select("url")
    .eq("project_id", projectId)
    .eq("status", status)
    .single()
  if (webhook?.url) {
    try {
      await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      })
    } catch (err) {
      console.error("Failed to trigger webhook", err)
    }
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: "Task id required" }, { status: 400 })
  const update = (await request.json()) as Partial<Task>

  const supabase = supabaseAdminClient()
  const { data, error } = await supabase.from("tasks").update(update).eq("id", id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (update.status && data) {
    triggerWebhook(data.project_id, data.status, data as Task)
  }

  return NextResponse.json(data)
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: "Task id required" }, { status: 400 })
  const supabase = supabaseAdminClient()
  const { error } = await supabase.from("tasks").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
} 