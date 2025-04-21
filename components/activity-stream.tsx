"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Plus, MessageSquare, ArrowRight, User, RefreshCw } from "lucide-react"
import { type ActivityLog as ActivityLogType, type User as UserType, getActivityLogs, timeAgo } from "@/lib/data"

interface ActivityStreamProps {
  projectId: string
  users: UserType[]
  isClientView?: boolean
  maxItems?: number
}

export function ActivityStream({ projectId, users, isClientView = false, maxItems = 5 }: ActivityStreamProps) {
  const [activities, setActivities] = useState<ActivityLogType[]>([])
  const [loading, setLoading] = useState(true)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    async function fetchActivities() {
      setLoading(true)
      try {
        const data = await getActivityLogs(projectId, {
          visibility: isClientView ? "public" : undefined,
          includeUsers: true,
          includeTasks: true,
          limit: 20, // Fetch more than we'll initially show
        })
        setActivities(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchActivities()
    }
  }, [projectId, isClientView])

  const getActivityIcon = (activity: ActivityLogType) => {
    switch (activity.action_type) {
      case "task_created":
        return <Plus className="h-4 w-4 text-green-500" />
      case "comment_added":
        return <MessageSquare className="h-4 w-4 text-purple-500" />
      case "status_changed":
        return <ArrowRight className="h-4 w-4 text-amber-500" />
      case "assignee_changed":
        return <User className="h-4 w-4 text-blue-500" />
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500" />
    }
  }

  const getActivityText = (activity: ActivityLogType) => {
    const userName = activity.user?.name || "Someone"
    const taskTitle = activity.task?.title || "a task"

    switch (activity.action_type) {
      case "task_created":
        return (
          <span>
            <span className="font-medium">{userName}</span> created <span className="font-medium">&quot;{taskTitle}&quot;</span>
          </span>
        )
      case "comment_added":
        return (
          <span>
            <span className="font-medium">{userName}</span> commented on{" "}
            <span className="font-medium">&quot;{taskTitle}&quot;</span>
          </span>
        )
      case "status_changed":
        let newStatus = "a new status"
        if (typeof activity.details === 'object' && activity.details !== null && 'newStatus' in activity.details && typeof activity.details.newStatus === 'string') {
          newStatus = activity.details.newStatus
        }
        return (
          <span>
            <span className="font-medium">{userName}</span> moved <span className="font-medium">&quot;{taskTitle}&quot;</span> to{" "}
            <span className="font-medium">{newStatus}</span>
          </span>
        )
      case "assignee_changed":
        let newAssigneeId: string | undefined
        if (typeof activity.details === 'object' && activity.details !== null && 'newAssignee' in activity.details && typeof activity.details.newAssignee === 'string') {
          newAssigneeId = activity.details.newAssignee
        }
        const newAssignee = users.find((u) => u.id === newAssigneeId)?.name || "someone"
        return (
          <span>
            <span className="font-medium">{userName}</span> assigned <span className="font-medium">&quot;{taskTitle}&quot;</span>{" "}
            to <span className="font-medium">&quot;{newAssignee}&quot;</span>
          </span>
        )
      default:
        return (
          <span>
            <span className="font-medium">{userName}</span> updated <span className="font-medium">&quot;{taskTitle}&quot;</span>
          </span>
        )
    }
  }

  const displayedActivities = showMore ? activities : activities.slice(0, maxItems)

  if (loading) {
    return <p className="text-sm text-muted-foreground py-2">Loading recent activity...</p>
  }

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No recent activity</p>
  }

  return (
    <div className="space-y-2">
      {displayedActivities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-background/50 transition-colors"
        >
          <div className="mt-1 p-1.5 rounded-full bg-background/80">{getActivityIcon(activity)}</div>

          <div className="flex-1 min-w-0">
            <div className="text-sm">{getActivityText(activity)}</div>
            <div className="text-xs text-muted-foreground">{timeAgo(activity.created_at)}</div>
          </div>

          <Avatar className="h-6 w-6 flex-shrink-0 border">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {activity.user?.name.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      ))}

      {activities.length > maxItems && (
        <Button variant="ghost" size="sm" className="w-full text-xs h-8" onClick={() => setShowMore(!showMore)}>
          {showMore ? "Show less" : `Show ${activities.length - maxItems} more items`}
        </Button>
      )}
    </div>
  )
}
