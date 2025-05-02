"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Clock, Plus, Trash2, Edit, User, ArrowRight, Filter } from "lucide-react"
import { type ActivityLog as ActivityLogType, type User as UserType, getActivityLogs, timeAgo } from "@/lib/data"
import { useSupabaseClient } from "@/lib/supabase-auth-context"

interface ActivityLogProps {
  projectId: string
  users: UserType[]
  isClientView?: boolean
}

export function ActivityLog({ projectId, users, isClientView = false }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityLogType[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const supabase = useSupabaseClient()

  useEffect(() => {
    async function fetchActivities() {
      setLoading(true)
      try {
        const data = await getActivityLogs(supabase, projectId, {
          visibility: isClientView ? "public" : undefined,
          includeUsers: true,
          includeTasks: true,
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
  }, [projectId, supabase, isClientView])

  // Group activities by date
  const groupedActivities: Record<string, ActivityLogType[]> = {}

  activities.forEach((activity) => {
    const date = new Date(activity.created_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })

    if (!groupedActivities[date]) {
      groupedActivities[date] = []
    }

    groupedActivities[date].push(activity)
  })

  // Filter for items that need review (status changes, new tasks, comments)
  const reviewItems = activities.filter(
    (activity) =>
      activity.action_type === "status_changed" ||
      activity.action_type === "task_created" ||
      activity.action_type === "comment_added",
  )

  // Filter activities by type if filter is set
  const filteredActivities = filter
    ? Object.entries(groupedActivities).reduce(
        (acc, [date, dateActivities]) => {
          acc[date] = dateActivities.filter((activity) => activity.action_type === filter)
          return acc
        },
        {} as Record<string, ActivityLogType[]>,
      )
    : groupedActivities

  const getActivityIcon = (activity: ActivityLogType) => {
    switch (activity.action_type) {
      case "task_created":
        return <Plus className="h-5 w-5 text-green-500" />
      case "task_updated":
        return <Edit className="h-5 w-5 text-blue-500" />
      case "task_deleted":
        return <Trash2 className="h-5 w-5 text-red-500" />
      case "comment_added":
        return <MessageSquare className="h-5 w-5 text-purple-500" />
      case "status_changed":
        return <ArrowRight className="h-5 w-5 text-amber-500" />
      case "assignee_changed":
        return <User className="h-5 w-5 text-cyan-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getActivityDescription = (activity: ActivityLogType) => {
    const userName = activity.user?.name || "Unknown User"
    const taskTitle = activity.task?.title || "a task"

    switch (activity.action_type) {
      case "task_created":
        return (
          <span>
            <span className="font-medium">{userName}</span> created task{" "}
            <span className="font-medium">&quot;{taskTitle}&quot;</span>
          </span>
        )
      case "task_updated":
        return (
          <span>
            <span className="font-medium">{userName}</span> updated task{" "}
            <span className="font-medium">&quot;{taskTitle}&quot;</span>
          </span>
        )
      case "task_deleted":
        const deletedTaskTitle = typeof activity.details === 'object' && activity.details !== null && 'task' in activity.details && typeof activity.details.task === 'object' && activity.details.task !== null && 'title' in activity.details.task ? (activity.details.task as { title?: string }).title : "Unknown"
        return (
          <span>
            <span className="font-medium">{userName}</span> deleted task{" "}
            <span className="font-medium">&quot;{deletedTaskTitle || "Unknown"}&quot;</span>
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
        let newStatus = "Unknown"
        if (typeof activity.details === 'object' && activity.details !== null) {
          if ('newStatus' in activity.details && typeof activity.details.newStatus === 'string') {
            newStatus = activity.details.newStatus
          } else if ('changes' in activity.details && typeof activity.details.changes === 'object' && activity.details.changes !== null && 'status' in activity.details.changes && typeof activity.details.changes.status === 'string') {
            newStatus = activity.details.changes.status
          }
        }
        return (
          <span>
            <span className="font-medium">{userName}</span> changed status of{" "}
            <span className="font-medium">&quot;{taskTitle}&quot;</span> to{" "}
            <Badge variant="outline" className="ml-1">
              {newStatus}
            </Badge>
          </span>
        )
      case "assignee_changed":
        let newAssigneeId: string | undefined
        if (typeof activity.details === 'object' && activity.details !== null) {
          if ('newAssignee' in activity.details && typeof activity.details.newAssignee === 'string') {
            newAssigneeId = activity.details.newAssignee
          } else if ('changes' in activity.details && typeof activity.details.changes === 'object' && activity.details.changes !== null && 'assignee_id' in activity.details.changes && typeof activity.details.changes.assignee_id === 'string') {
            newAssigneeId = activity.details.changes.assignee_id
          }
        }
        const newAssignee = users.find((u) => u.id === newAssigneeId)?.name || "Unassigned"
        return (
          <span>
            <span className="font-medium">{userName}</span> assigned <span className="font-medium">&quot;{taskTitle}&quot;</span>{" "}
            to <span className="font-medium">&quot;{newAssignee}&quot;</span>
          </span>
        )
      default:
        return <span>Unknown activity</span>
    }
  }

  // Activity type filter options
  const filterOptions = [
    { value: null, label: "All Activities" },
    { value: "task_created", label: "New Tasks" },
    { value: "comment_added", label: "Comments" },
    { value: "status_changed", label: "Status Changes" },
    { value: "assignee_changed", label: "Assignments" },
  ]

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-xl font-bold">Activity & Updates</CardTitle>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {filterOptions.map((option) => (
                <Button
                  key={option.value || "all"}
                  variant={filter === option.value ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="all">All Activity</TabsTrigger>
            <TabsTrigger value="review" className="relative">
              To Review
              {reviewItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {reviewItems.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Loading activities...</p>
            ) : activities.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No activities yet</p>
            ) : Object.keys(filteredActivities).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No activities match the selected filter</p>
            ) : (
              Object.entries(filteredActivities).map(([date, dateActivities]) => {
                // Skip dates with no activities after filtering
                if (dateActivities.length === 0) return null

                return (
                  <div key={date} className="space-y-3">
                    <h3 className="font-semibold text-muted-foreground">{date}</h3>

                    {dateActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="mt-1">{getActivityIcon(activity)}</div>

                        <div className="flex-1 space-y-1">
                          <div>{getActivityDescription(activity)}</div>

                          {activity.action_type === "comment_added" && typeof activity.details === 'object' && activity.details !== null && 'comment' in activity.details && activity.details.comment && typeof activity.details.comment === 'object' && 'content' in activity.details.comment && typeof activity.details.comment.content === 'string' && (
                            <div className="bg-muted p-2 rounded-md text-sm mt-2">
                              {activity.details.comment.content}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">{timeAgo(activity.created_at)}</div>
                        </div>

                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{activity.user?.name.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                      </div>
                    ))}
                  </div>
                )
              })
            )}
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Loading items to review...</p>
            ) : reviewItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No items to review</p>
            ) : (
              reviewItems.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="mt-1">{getActivityIcon(activity)}</div>

                  <div className="flex-1 space-y-1">
                    <div>{getActivityDescription(activity)}</div>

                    {activity.action_type === "comment_added" && typeof activity.details === 'object' && activity.details !== null && 'comment' in activity.details && activity.details.comment && typeof activity.details.comment === 'object' && 'content' in activity.details.comment && typeof activity.details.comment.content === 'string' && (
                      <div className="bg-muted p-2 rounded-md text-sm mt-2">
                        {activity.details.comment.content}
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">{timeAgo(activity.created_at)}</div>
                  </div>

                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{activity.user?.name.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
