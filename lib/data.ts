import { supabaseBrowserClient, supabaseAdminClient } from "@/lib/supabase"
import { randomUUID } from "crypto"

export type User = {
  id: string
  name: string
  email: string
  role: "admin" | "user"
}

export type Project = {
  id: string
  name: string
  client_name?: string
  client_token: string
  created_at: string
}

export type Task = {
  id: string
  title: string
  description?: string
  status: "todo" | "in-progress" | "done"
  priority: "low" | "medium" | "high"
  assignee_id?: string
  visibility: "internal" | "public"
  project_id: string
  created_at: string
  // Extended properties
  estimated_time?: number
  completion_time?: number
  external_id?: string
  tags?: string[]
  due_date?: string
}

export type Comment = {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  // Joined data
  user?: User
}

export type ActivityLog = {
  id: string
  project_id: string
  task_id?: string
  user_id: string
  action_type:
    | "task_created"
    | "task_updated"
    | "task_deleted"
    | "comment_added"
    | "status_changed"
    | "assignee_changed"
  details?: any
  created_at: string
  visibility: "internal" | "public"
  // Joined data
  user?: User
  task?: Task
}

export type TaskFormState = Omit<Task, "id" | "created_at" | "project_id">

export const STATUS = [
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "In Progress" },
  { key: "done", label: "Done" },
] as const

// Database operations
export async function getUsers(): Promise<User[]> {
  try {
    const supabase = supabaseBrowserClient
    const { data, error } = await supabase.from("users").select("*")

    if (error) {
      console.error("Error fetching users:", error)
      return []
    }

    return data as User[]
  } catch (err) {
    console.error("Exception fetching users:", err)
    return []
  }
}

export async function getProjects(): Promise<Project[]> {
  try {
    const supabase = supabaseBrowserClient
    const { data, error } = await supabase.from("projects").select("*")

    if (error) {
      console.error("Error fetching projects:", error)
      return []
    }

    return data as Project[]
  } catch (err) {
    console.error("Exception fetching projects:", err)
    return []
  }
}

export async function getTasks(): Promise<Task[]> {
  try {
    const supabase = supabaseBrowserClient
    const { data, error } = await supabase.from("tasks").select("*")

    if (error) {
      console.error("Error fetching tasks:", error)
      return []
    }

    return data as Task[]
  } catch (err) {
    console.error("Exception fetching tasks:", err)
    return []
  }
}

export async function getTasksByProject(projectId: string): Promise<Task[]> {
  try {
    const supabase = supabaseBrowserClient
    const { data, error } = await supabase.from("tasks").select("*").eq("project_id", projectId)

    if (error) {
      console.error("Error fetching tasks by project:", error)
      return []
    }

    return data as Task[]
  } catch (err) {
    console.error("Exception fetching tasks by project:", err)
    return []
  }
}

export async function createTask(task: Omit<Task, "id" | "created_at">, userId: string): Promise<Task | null> {
  try {
    // Use admin client to bypass RLS
    const supabase = supabaseAdminClient()

    // Create a new task object with only the fields that exist in the database
    const newTask = {
      id: randomId(),
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee_id: task.assignee_id,
      visibility: task.visibility || "public", // Default to public if not specified
      project_id: task.project_id,
      created_at: new Date().toISOString(),
      estimated_time: task.estimated_time,
      completion_time: task.completion_time,
      external_id: task.external_id,
      due_date: task.due_date,
      tags: task.tags,
    }

    const { data, error } = await supabase.from("tasks").insert(newTask).select().single()

    if (error) {
      console.error("Error creating task:", error)
      return null
    }

    // Log the activity
    try {
      await createActivityLog({
        project_id: task.project_id,
        task_id: newTask.id,
        user_id: userId,
        action_type: "task_created",
        details: { task: newTask },
        visibility: task.visibility || "public",
      })
    } catch (logError) {
      console.error("Error logging activity (but task was created):", logError)
    }

    return data as Task
  } catch (err) {
    console.error("Exception creating task:", err)
    return null
  }
}

export async function updateTask(
  id: string,
  task: Partial<Task>,
  userId: string,
  logActivity = true,
): Promise<Task | null> {
  try {
    // Use admin client to bypass RLS
    const supabase = supabaseAdminClient()

    // Check if status is changing
    let actionType: ActivityLog["action_type"] = "task_updated"
    if (task.status) {
      actionType = "status_changed"
    } else if (task.assignee_id !== undefined) {
      actionType = "assignee_changed"
    }

    const { data, error } = await supabase.from("tasks").update(task).eq("id", id).select().single()

    if (error) {
      console.error("Error updating task:", error)
      return null
    }

    // Log the activity
    if (logActivity) {
      try {
        await createActivityLog({
          project_id: data.project_id,
          task_id: id,
          user_id: userId,
          action_type: actionType,
          details: {
            changes: task,
            newStatus: task.status,
            newAssignee: task.assignee_id,
          },
          visibility: data.visibility,
        })
      } catch (logError) {
        console.error("Error logging activity (but task was updated):", logError)
      }
    }

    return data as Task
  } catch (err) {
    console.error("Exception updating task:", err)
    return null
  }
}

export async function deleteTask(id: string, userId: string, projectId: string): Promise<boolean> {
  try {
    // Use admin client to bypass RLS
    const supabase = supabaseAdminClient()

    // Get task before deleting for activity log
    const { data: task } = await supabase.from("tasks").select("*").eq("id", id).single()

    const { error } = await supabase.from("tasks").delete().eq("id", id)

    if (error) {
      console.error("Error deleting task:", error)
      return false
    }

    // Log the activity
    if (task) {
      try {
        await createActivityLog({
          project_id: projectId,
          task_id: id,
          user_id: userId,
          action_type: "task_deleted",
          details: { task },
          visibility: task.visibility,
        })
      } catch (logError) {
        console.error("Error logging activity (but task was deleted):", logError)
      }
    }

    return true
  } catch (err) {
    console.error("Exception deleting task:", err)
    return false
  }
}

// Comment functions
export async function getCommentsByTask(taskId: string): Promise<Comment[]> {
  try {
    const supabase = supabaseBrowserClient
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        user:user_id (
          id, name, email, role
        )
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching comments:", error)
      return []
    }

    return data as unknown as Comment[]
  } catch (err) {
    console.error("Exception fetching comments:", err)
    return []
  }
}

export async function createComment(
  comment: Omit<Comment, "id" | "created_at" | "updated_at" | "user">,
): Promise<Comment | null> {
  try {
    const supabase = supabaseBrowserClient

    const newComment = {
      id: randomId(),
      task_id: comment.task_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("comments").insert(newComment).select().single()

    if (error) {
      console.error("Error creating comment:", error)
      return null
    }

    // Get the task to get project_id and visibility
    const { data: task } = await supabase
      .from("tasks")
      .select("project_id, visibility")
      .eq("id", comment.task_id)
      .single()

    if (task) {
      // Log the activity
      try {
        await createActivityLog({
          project_id: task.project_id,
          task_id: comment.task_id,
          user_id: comment.user_id,
          action_type: "comment_added",
          details: { comment: newComment },
          visibility: task.visibility,
        })
      } catch (logError) {
        console.error("Error logging activity (but comment was created):", logError)
      }
    }

    return data as Comment
  } catch (err) {
    console.error("Exception creating comment:", err)
    return null
  }
}

// Activity log functions
export async function getActivityLogs(
  projectId: string,
  options: {
    limit?: number
    visibility?: "internal" | "public"
    includeUsers?: boolean
    includeTasks?: boolean
  } = {},
): Promise<ActivityLog[]> {
  try {
    const { limit = 50, visibility, includeUsers = true, includeTasks = true } = options

    const supabase = supabaseBrowserClient

    let query = supabase
      .from("activity_logs")
      .select(`
        *
        ${includeUsers ? `, user:user_id (id, name, email, role)` : ""}
        ${includeTasks ? `, task:task_id (id, title, status, priority, visibility)` : ""}
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (visibility) {
      query = query.eq("visibility", visibility)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching activity logs:", error)
      return []
    }

    return data as unknown as ActivityLog[]
  } catch (err) {
    console.error("Exception fetching activity logs:", err)
    return []
  }
}

export async function createActivityLog(
  log: Omit<ActivityLog, "id" | "created_at" | "user" | "task">,
): Promise<ActivityLog | null> {
  try {
    const supabase = supabaseBrowserClient

    const newLog = {
      id: randomId(),
      project_id: log.project_id,
      task_id: log.task_id,
      user_id: log.user_id,
      action_type: log.action_type,
      details: log.details || {},
      created_at: new Date().toISOString(),
      visibility: log.visibility || "public",
    }

    const { data, error } = await supabase.from("activity_logs").insert(newLog).select().single()

    if (error) {
      console.error("Error creating activity log:", error)
      return null
    }

    return data as ActivityLog
  } catch (err) {
    console.error("Exception creating activity log:", err)
    return null
  }
}

export function getAssignee(task: Task, users: User[]) {
  return users.find((u) => u.id === task.assignee_id)
}

export function randomId() {
  if (typeof window === "undefined") {
    try {
      return randomUUID()
    } catch (e) {
      return Math.random().toString(36).slice(2, 10)
    }
  }
  return Math.random().toString(36).slice(2, 10)
}

// Helper function to format dates
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(date)
}

// Helper function to get time ago
export function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  let interval = Math.floor(seconds / 31536000)
  if (interval >= 1) {
    return interval === 1 ? "1 year ago" : `${interval} years ago`
  }

  interval = Math.floor(seconds / 2592000)
  if (interval >= 1) {
    return interval === 1 ? "1 month ago" : `${interval} months ago`
  }

  interval = Math.floor(seconds / 86400)
  if (interval >= 1) {
    return interval === 1 ? "1 day ago" : `${interval} days ago`
  }

  interval = Math.floor(seconds / 3600)
  if (interval >= 1) {
    return interval === 1 ? "1 hour ago" : `${interval} hours ago`
  }

  interval = Math.floor(seconds / 60)
  if (interval >= 1) {
    return interval === 1 ? "1 minute ago" : `${interval} minutes ago`
  }

  return seconds < 10 ? "just now" : `${Math.floor(seconds)} seconds ago`
}
