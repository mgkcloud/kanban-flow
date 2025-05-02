import { NextResponse } from "next/server"
import { supabaseAdminClient } from "@/lib/supabase"
import { type Task } from "@/lib/data"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: "Task id required" }, { status: 400 })
  const update = (await request.json()) as Partial<Task>

  const supabase = supabaseAdminClient()
  const { data, error } = await supabase.from("tasks").update(update).eq("id", id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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