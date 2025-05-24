"use client"

import { useState } from "react"
import { PlannerTask } from "@/app/hooks/useDailyTasks"
import { TaskCard } from "@/components/task-card"
import { TaskDetail } from "@/components/task-detail"
import { Badge } from "@/components/ui/badge"
import { type User, getAssignee } from "@/lib/data"
import { AlertCircle, ArrowRightCircle, CheckCircle2 } from "lucide-react"

interface DailyPlannerBoardProps {
  tasks: PlannerTask[]
  users: User[]
  currentUser?: User
}

export function DailyPlannerBoard({ tasks, users, currentUser }: DailyPlannerBoardProps) {
  const statusList = [
    { key: "incoming", label: "Incoming" },
    { key: "todo", label: "To Do" },
    { key: "in-progress", label: "In Progress" },
    { key: "done", label: "Done" },
  ] as const

  const [selectedTask, setSelectedTask] = useState<PlannerTask | null>(null)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "incoming":
        return <AlertCircle className="h-4 w-4 text-pink-500" />
      case "todo":
        return <AlertCircle className="h-4 w-4 text-gray-500" />
      case "in-progress":
        return <ArrowRightCircle className="h-4 w-4 text-blue-500" />
      case "done":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {statusList.map((status) => {
        const columnTasks = tasks.filter((t) => t.planner_status === status.key)
        return (
          <div key={status.key} className="rounded-xl frosted-panel flex flex-col">
            <div className="p-3 border-b bg-muted/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {getStatusIcon(status.key)}
                <h3 className="font-medium">{status.label}</h3>
              </div>
              <Badge variant="outline" className="bg-background/50">
                {columnTasks.length}
              </Badge>
            </div>
            <div className="p-3 space-y-3 min-h-[100px] max-h-[60vh] overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="flex items-center justify-center h-20 border border-dashed rounded-lg bg-background/50">
                  <p className="text-muted-foreground text-sm">No tasks</p>
                </div>
              ) : (
                columnTasks.map((task) => {
                  const assignee = getAssignee(task, users)
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      assignee={assignee}
                      onClick={() => setSelectedTask(task)}
                    />
                  )
                })
              )}
            </div>
          </div>
        )
      })}
      {selectedTask && currentUser && (
        <TaskDetail
          task={selectedTask}
          users={users}
          currentUser={currentUser}
          open={true}
          onOpenChange={(open) => {
            if (!open) setSelectedTask(null)
          }}
        />
      )}
    </div>
  )
}
