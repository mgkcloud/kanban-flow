import { useState } from "react"
import { type Task, type TaskFormState, type User, type Project, getTasks } from "@/lib/data"
import { useSupabaseClient } from "@/lib/supabase-auth-context"

export function useTasksState(currentUser: User | null, currentProject: Project | null, users: User[], session: unknown) {
  const supabase = useSupabaseClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formState, setFormState] = useState<TaskFormState>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assignee_id: "",
    visibility: "public",
  })
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  // Fetch tasks for all projects
  async function fetchTasks() {
    if (session) {
      const tasksData = await getTasks(supabase)
      setTasks(tasksData)
    }
  }

  async function handleDrop(status: Task["status"]) {
    if (!draggedTaskId || !currentUser) return
    setTasks((prev) => prev.map((t) => (t.id === draggedTaskId ? { ...t, status } : t)))
    try {
      await fetch(`/api/tasks/${draggedTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
    } catch {
      // error intentionally ignored
    }
    setDraggedTaskId(null)
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (formState.title.trim().length === 0 || !currentUser) return
    try {
      if (editTaskId) {
        const res = await fetch(`/api/tasks/${editTaskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formState),
        })
        const updatedTask: Task | null = res.ok ? await res.json() : null
        if (updatedTask) {
          setTasks((prev) => prev.map((t) => (t.id === editTaskId ? updatedTask : t)))
        }
      } else {
        if (!currentProject) return
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formState,
            project_id: currentProject.id,
            userId: currentUser.id,
          }),
        })
        const newTask: Task | null = res.ok ? await res.json() : null
        if (newTask) {
          setTasks((prev) => [...prev, newTask])
        }
      }
      setShowForm(false)
      setEditTaskId(null)
      setFormState({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        assignee_id: users[0]?.id || "",
        visibility: "public",
      })
      setDueDate(undefined)
    } catch {
      // error intentionally ignored
    }
  }

  async function handleDelete(id: string) {
    if (!currentUser || !currentProject) return
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    } catch {
      // error intentionally ignored
    }
    setShowForm(false)
    setEditTaskId(null)
  }

  async function handleImportTasks(importedTasks: Task[]) {
    if (!currentUser) return
    const newTasks: Task[] = []
    const errors: string[] = []
    for (const task of importedTasks) {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...task,
            project_id: task.project_id || currentProject?.id || "",
            userId: currentUser.id,
          }),
        })
        const newTask: Task | null = res.ok ? await res.json() : null
        if (newTask) {
          newTasks.push(newTask)
        } else {
          errors.push(`Failed to import task: ${task.title}`)
        }
      } catch {
        // error intentionally ignored
      }
    }
    if (newTasks.length > 0) {
      setTasks((prev) => [...prev, ...newTasks])
    }
    if (errors.length > 0) {
      alert(`Imported ${newTasks.length} tasks with ${errors.length} errors.`)
    } else if (newTasks.length > 0) {
      alert(`Successfully imported ${newTasks.length} tasks.`)
    }
  }

  function openEdit(task: Task) {
    setEditTaskId(task.id)
    setFormState({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      assignee_id: task.assignee_id,
      visibility: task.visibility,
      estimated_time: task.estimated_time,
      external_id: task.external_id,
      tags: task.tags,
    })
    setDueDate(task.due_date ? new Date(task.due_date) : undefined)
    setShowForm(true)
  }

  return {
    tasks,
    setTasks,
    showForm,
    setShowForm,
    formState,
    setFormState,
    editTaskId,
    setEditTaskId,
    dueDate,
    setDueDate,
    draggedTaskId,
    setDraggedTaskId,
    fetchTasks,
    handleDrop,
    handleFormSubmit,
    handleDelete,
    handleImportTasks,
    openEdit,
  }
} 