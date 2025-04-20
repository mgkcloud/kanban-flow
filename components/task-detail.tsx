"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, CalendarDays, Tag } from "lucide-react"
import { TaskComments } from "@/components/task-comments"
import { type Task, type User, formatDate } from "@/lib/data"

interface TaskDetailProps {
  task: Task
  users: User[]
  currentUser: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function TaskDetail({ task, users, currentUser, open, onOpenChange, onEdit }: TaskDetailProps) {
  const assignee = users.find((u) => u.id === task.assignee_id)

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      case "medium":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      case "in-progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      case "done":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const isOverdue = () => {
    if (!task.due_date || task.status === "done") return false
    const dueDate = new Date(task.due_date)
    const today = new Date()
    return dueDate < today
  }

  const overdue = isOverdue()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-4 frosted-panel border rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mt-1">
          <Badge className={getStatusColor(task.status)}>
            {task.status === "todo" ? "To Do" : task.status === "in-progress" ? "In Progress" : "Done"}
          </Badge>

          <Badge className={getPriorityColor(task.priority)}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
          </Badge>

          <Badge variant="outline" className="bg-background/50">
            {task.visibility === "internal" ? "Internal Only" : "Public"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <h3 className="text-sm font-medium mb-1">Details</h3>

            {task.description ? (
              <p className="text-sm bg-background/50 p-3 rounded-lg">{task.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description provided</p>
            )}

            {task.tags && task.tags.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Tag size={14} />
                  <span className="text-xs">Tags:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-background/50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 space-y-1 text-sm bg-background/50 p-3 rounded-lg">
              {task.estimated_time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-muted-foreground" />
                  <span>Estimated: {task.estimated_time} hours</span>
                </div>
              )}

              {task.due_date && (
                <div className={`flex items-center gap-2 text-sm ${overdue ? "text-red-500" : ""}`}>
                  <CalendarDays size={14} className={overdue ? "text-red-500" : "text-muted-foreground"} />
                  <span>Due: {formatDate(task.due_date)}</span>
                  {overdue && (
                    <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-1 rounded">
                      Overdue
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <CalendarDays size={14} className="text-muted-foreground" />
                <span>Created: {formatDate(task.created_at)}</span>
              </div>
            </div>

            {assignee && (
              <div className="mt-3 bg-background/50 p-3 rounded-lg">
                <h4 className="text-xs text-muted-foreground mb-1">Assigned to:</h4>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5 border">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {assignee.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{assignee.name}</span>
                </div>
              </div>
            )}

            {onEdit && (
              <div className="mt-3">
                <Button onClick={onEdit} size="sm" variant="outline" className="w-full">
                  Edit Task
                </Button>
              </div>
            )}
          </div>

          <div>
            <TaskComments taskId={task.id} currentUser={currentUser} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
