"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Upload } from "lucide-react"
import type { Task } from "@/lib/data"

interface ImportTasksProps {
  projectId: string
  onImport: (tasks: Task[]) => void
  disabled?: boolean
}

export function ImportTasks({ projectId, onImport, disabled = false }: ImportTasksProps) {
  const [open, setOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    if (!importText.trim() || !projectId) return

    setError(null)
    setImporting(true)

    try {
      // Try to parse as JSON first
      let tasks: Task[] = []

      try {
        const parsed = JSON.parse(importText)
        if (Array.isArray(parsed)) {
          tasks = parsed.map((item) => mapToTask(item, projectId))
        } else if (typeof parsed === "object") {
          // Single task object
          tasks = [mapToTask(parsed, projectId)]
        }
      } catch {
        // Not valid JSON, try to parse as Notion export
        tasks = parseNotionExport(importText, projectId)
      }

      if (tasks.length === 0) {
        setError("No valid tasks found in the import data")
        setImporting(false)
        return
      }

      // Call the onImport callback
      await onImport(tasks)
      setOpen(false)
      setImportText("")
    } catch (err) {
      console.error("Import error:", err)
      setError("Failed to import tasks. Please check the format and try again.")
    } finally {
      setImporting(false)
    }
  }

  // Map generic object to Task type
  const mapToTask = (item: unknown, projectId: string): Task => {
    const obj = item as Record<string, unknown>
    // Default values
    const task: Partial<Task> = {
      id: typeof obj.id === 'string' ? obj.id : "",
      title: typeof obj.title === 'string' ? obj.title : typeof obj.name === 'string' ? obj.name : "Imported Task",
      description: typeof obj.description === 'string' ? obj.description : typeof obj.content === 'string' ? obj.content : typeof obj.notes === 'string' ? obj.notes : "",
      status: mapStatus(typeof obj.status === 'string' ? obj.status : undefined),
      priority: mapPriority(typeof obj.priority === 'string' ? obj.priority : undefined),
      project_id: projectId,
      visibility: "public",
      created_at: new Date().toISOString(),
    }
    // Optional fields
    if (typeof obj.assignee === 'string') {
      task.assignee_id = obj.assignee
    }
    if (Array.isArray(obj.tags)) {
      task.tags = obj.tags as string[]
    } else if (Array.isArray(obj.labels)) {
      task.tags = obj.labels as string[]
    } else {
      task.tags = []
    }
    if (typeof obj.due_date === 'string') {
      task.due_date = obj.due_date
    } else if (typeof obj.dueDate === 'string') {
      task.due_date = obj.dueDate
    }
    if (typeof obj.estimated_time === 'number') {
      task.estimated_time = obj.estimated_time
    } else if (typeof obj.estimatedTime === 'number') {
      task.estimated_time = obj.estimatedTime
    }
    if (typeof obj.external_id === 'string') {
      task.external_id = obj.external_id
    } else if (typeof obj.externalId === 'string') {
      task.external_id = obj.externalId
    } else if (typeof obj.id === 'string') {
      task.external_id = obj.id
    }
    return task as Task
  }

  // Map various status formats to our status values
  const mapStatus = (status: string | undefined): Task["status"] => {
    if (!status) return "todo"

    const statusLower = status.toLowerCase()

    if (statusLower.includes("progress") || statusLower.includes("doing") || statusLower === "in progress") {
      return "in-progress"
    } else if (
      statusLower.includes("done") ||
      statusLower.includes("complete") ||
      statusLower.includes("finish") ||
      statusLower === "completed"
    ) {
      return "done"
    }

    return "todo"
  }

  // Map various priority formats to our priority values
  const mapPriority = (priority: string | undefined): Task["priority"] => {
    if (!priority) return "medium"

    const priorityLower = priority.toLowerCase()

    if (priorityLower.includes("high") || priorityLower.includes("urgent") || priorityLower === "p1") {
      return "high"
    } else if (priorityLower.includes("low") || priorityLower === "p3") {
      return "low"
    }

    return "medium"
  }

  // Parse Notion-like export format
  const parseNotionExport = (text: string, projectId: string): Task[] => {
    const tasks: Task[] = []
    const lines = text.split("\n")

    let currentTask: Partial<Task> | null = null

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (!trimmedLine) continue

      // Check if this is a new task (starts with a title-like format)
      if (trimmedLine.startsWith("# ") || /^[A-Za-z0-9]/.test(trimmedLine)) {
        // Save previous task if exists
        if (currentTask && currentTask.title) {
          tasks.push(currentTask as Task)
        }

        // Start new task
        currentTask = {
          id: "",
          title: trimmedLine.replace(/^# /, ""),
          status: "todo",
          priority: "medium",
          project_id: projectId,
          visibility: "public",
          created_at: new Date().toISOString(),
        }
      } else if (currentTask) {
        // Add details to current task
        if (trimmedLine.includes("Status:")) {
          currentTask.status = mapStatus(trimmedLine.split("Status:")[1]?.trim())
        } else if (trimmedLine.includes("Priority:")) {
          currentTask.priority = mapPriority(trimmedLine.split("Priority:")[1]?.trim())
        } else if (trimmedLine.includes("Due:")) {
          const dueDateStr = trimmedLine.split("Due:")[1]?.trim()
          if (dueDateStr) {
            try {
              currentTask.due_date = new Date(dueDateStr).toISOString()
            } catch {
              // Invalid date format, ignore
            }
          }
        } else if (trimmedLine.includes("Estimate:")) {
          const estimateStr = trimmedLine.split("Estimate:")[1]?.trim()
          if (estimateStr) {
            const hours = Number.parseFloat(estimateStr.replace(/h.*$/, ""))
            if (!isNaN(hours)) {
              currentTask.estimated_time = hours
            }
          }
        } else if (trimmedLine.includes("Tags:")) {
          const tagsStr = trimmedLine.split("Tags:")[1]?.trim()
          if (tagsStr) {
            currentTask.tags = tagsStr.split(",").map((tag) => tag.trim())
          }
        } else if (!currentTask.description) {
          // First line after title becomes description
          currentTask.description = trimmedLine
        } else {
          // Append to description
          currentTask.description += "\n" + trimmedLine
        }
      }
    }

    // Add the last task
    if (currentTask && currentTask.title) {
      tasks.push(currentTask as Task)
    }

    return tasks
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 text-lg border-2 py-4" disabled={disabled}>
          <Upload size={20} /> Import Tasks
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-2 shadow-xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Import Tasks</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-base">
            Paste tasks from Notion, JSON, or any structured format. We&apos;ll try to parse them automatically.
          </p>

          <Textarea
            className="min-h-[200px] border-2 rounded-lg"
            placeholder="Paste your tasks here..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="border-2 text-base">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            className="btn-primary text-base"
            disabled={importing || !importText.trim()}
          >
            {importing ? "Importing..." : "Import Tasks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
