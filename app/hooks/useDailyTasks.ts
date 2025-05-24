import { useEffect, useState } from "react"
import { type User, type Task } from "@/lib/data"

export interface PlannerTask extends Task {
  planner_status: "incoming" | Task["status"]
}

export function useDailyTasks(currentUser: User | null) {
  const [dailyTasks, setDailyTasks] = useState<PlannerTask[]>([])

  useEffect(() => {
    async function fetchTasks() {
      if (!currentUser) return
      try {
        const res = await fetch(`/api/daily-tasks?userId=${currentUser.id}`)
        if (!res.ok) return
        const data: Task[] = await res.json()
        const mapped: PlannerTask[] = data.map((t) => ({
          ...t,
          planner_status:
            t.assignee_id === currentUser.id ? t.status : "incoming",
        }))
        setDailyTasks(mapped)

        // Send current tasks to the webhook to fetch additional incoming tasks
        try {
          const webhookRes = await fetch("/api/webhooks/daily", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: currentUser.id, tasks: data }),
          })
          if (webhookRes.ok) {
            const webhookData: { tasks?: Task[] } = await webhookRes.json()
            if (Array.isArray(webhookData.tasks)) {
              const incoming: PlannerTask[] = webhookData.tasks.map((t) => ({
                ...t,
                planner_status:
                  t.assignee_id === currentUser.id ? t.status : "incoming",
              }))
              setDailyTasks((prev) => {
                const map = new Map(prev.map((t) => [t.id, t]))
                incoming.forEach((t) => {
                  if (!map.has(t.id)) map.set(t.id, t)
                })
                return Array.from(map.values())
              })
            }
          }
        } catch (whErr) {
          console.error("webhook fetch error", whErr)
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchTasks()
  }, [currentUser])

  return { dailyTasks, setDailyTasks }
}
