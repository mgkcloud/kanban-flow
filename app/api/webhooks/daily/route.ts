import { NextResponse } from "next/server"
import { getDailyTasksForUser, createTask, type Task } from "@/lib/data"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 })
  }
  const tasks = await getDailyTasksForUser(userId)
  return NextResponse.json({ tasks })
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { userId: string; tasks?: Partial<Task>[] }
    const { userId, tasks = [] } = body
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }
    const created = []
    for (const task of tasks) {
      if (!task || !task.title || !task.project_id) continue
      const newTask = await createTask({
        title: task.title,
        description: task.description,
        status: task.status || "todo",
        priority: task.priority || "medium",
        assignee_id: task.assignee_id || userId,
        visibility: task.visibility || "public",
        project_id: task.project_id,
        due_date: task.due_date,
        tags: task.tags,
      }, userId)
      if (newTask) created.push(newTask)
    }
    return NextResponse.json({ tasks: created })
  } catch (err) {
    console.error("webhook error", err)
    return NextResponse.json({ error: "invalid payload" }, { status: 500 })
  }
}
