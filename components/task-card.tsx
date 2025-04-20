"use client"
import type { Task, User } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, MoreHorizontal, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatDate } from "@/lib/data"

interface TaskCardProps {
  task: Task
  assignee?: User
  onEdit?: () => void
  onDelete?: () => void
  onClick?: () => void
}

export function TaskCard({ task, assignee, onEdit, onDelete, onClick }: TaskCardProps) {
  const isOverdue = () => {
    if (!task.due_date || task.status === "done") return false
    const dueDate = new Date(task.due_date)
    const today = new Date()
    return dueDate < today
  }

  const priorityColors = {
    high: "from-red-500/20 to-red-500/5 border-red-500/30",
    medium: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
    low: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
  }

  return (
    <div
      className={cn(
        "p-3 rounded-xl bg-gradient-to-br border soft-shadow hover:shadow-lg transition-all cursor-pointer",
        priorityColors[task.priority],
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-medium text-base line-clamp-2">{task.title}</h3>

        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="frosted-panel">
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                >
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {task.description && <p className="text-sm text-muted-foreground mt-1 mb-2 line-clamp-1">{task.description}</p>}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs px-1.5 py-0 h-5 bg-background/50">
              <Tag size={10} className="mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        {assignee ? (
          <div className="flex items-center gap-1">
            <Avatar className="h-5 w-5 border">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{assignee.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">{assignee.name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {task.due_date && (
            <span className={cn("text-xs flex items-center", isOverdue() ? "text-red-500" : "text-muted-foreground")}>
              <Clock size={12} className="mr-1" />
              {formatDate(task.due_date).split(",")[0]}
            </span>
          )}

          {task.visibility === "internal" && (
            <Badge variant="outline" className="h-5 text-xs px-1 border bg-background/50">
              Internal
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
