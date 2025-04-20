"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { TaskDetail } from "@/components/task-detail"
import { TaskCard } from "@/components/task-card"
import { type Task, type User, getAssignee } from "@/lib/data"
import { AlertCircle, ArrowRightCircle, CheckCircle2 } from "lucide-react"

interface KanbanBoardProps {
  tasks: Task[]
  statusList: { key: string; label: string }[]
  users: User[]
  currentUser?: User
  readonly?: boolean
  onEditTask?: (task: Task) => void
  onDeleteTask?: (id: string) => void
  onDragStart?: (id: string) => void
  onDrop?: (status: Task["status"]) => void
  draggedTaskId?: string | null
}

export function KanbanBoard({
  tasks,
  statusList,
  users,
  currentUser,
  readonly = false,
  onEditTask,
  onDeleteTask,
  onDragStart,
  onDrop,
  draggedTaskId,
}: KanbanBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setDetailOpen(true)
  }

  const handleEditFromDetail = () => {
    if (selectedTask && onEditTask) {
      onEditTask(selectedTask)
      setDetailOpen(false)
    }
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
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

  const getStatusGradient = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return "from-gray-100 to-gray-50 dark:from-gray-800/50 dark:to-gray-900/50"
      case "in-progress":
        return "from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20"
      case "done":
        return "from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20"
      default:
        return "from-gray-100 to-gray-50 dark:from-gray-800/50 dark:to-gray-900/50"
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statusList.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status.key)

        return (
          <div
            key={status.key}
            className="rounded-xl frosted-panel flex flex-col"
            onDragOver={(e) => {
              if (onDrop && draggedTaskId) {
                e.preventDefault()
                e.currentTarget.classList.add("ring-2")
                e.currentTarget.classList.add("ring-primary")
              }
            }}
            onDragLeave={(e) => {
              if (onDrop && draggedTaskId) {
                e.currentTarget.classList.remove("ring-2")
                e.currentTarget.classList.remove("ring-primary")
              }
            }}
            onDrop={(e) => {
              if (onDrop && draggedTaskId) {
                e.preventDefault()
                e.currentTarget.classList.remove("ring-2")
                e.currentTarget.classList.remove("ring-primary")
                onDrop(status.key as Task["status"])
              }
            }}
          >
            <div
              className={`p-3 border-b bg-gradient-to-r ${getStatusGradient(status.key as Task["status"])} rounded-t-xl`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.key as Task["status"])}
                  <h3 className="font-medium">{status.label}</h3>
                </div>
                <Badge variant="outline" className="bg-background/50">
                  {columnTasks.length}
                </Badge>
              </div>
            </div>

            <div className="p-3 space-y-3 min-h-[100px] max-h-[65vh] overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="flex items-center justify-center h-20 border border-dashed rounded-lg bg-background/50">
                  <p className="text-muted-foreground text-sm">No tasks</p>
                </div>
              ) : (
                columnTasks.map((task) => {
                  const assignee = getAssignee(task, users)

                  return (
                    <div
                      key={task.id}
                      draggable={!readonly && !!onDragStart}
                      onDragStart={() => onDragStart && onDragStart(task.id)}
                      className={draggedTaskId === task.id ? "opacity-50" : ""}
                    >
                      <TaskCard
                        task={task}
                        assignee={assignee}
                        onEdit={!readonly && onEditTask ? () => onEditTask(task) : undefined}
                        onDelete={!readonly && onDeleteTask ? () => onDeleteTask(task.id) : undefined}
                        onClick={() => handleTaskClick(task)}
                      />
                    </div>
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
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEdit={!readonly && onEditTask ? handleEditFromDetail : undefined}
        />
      )}
    </div>
  )
}
