import { NextResponse } from "next/server"
import { getDailyTasksForUser } from "@/lib/data"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 })
  }

  const tasks = await getDailyTasksForUser(userId)
  return NextResponse.json(tasks)
}
