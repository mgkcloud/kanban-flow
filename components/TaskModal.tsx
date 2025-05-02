import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import React from "react"
import type { Task, TaskFormState, User } from "@/lib/data"

interface TaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formState: TaskFormState
  setFormState: (f: TaskFormState) => void
  users: User[]
  dueDate: Date | undefined
  setDueDate: (date: Date | undefined) => void
  onSubmit: (e: React.FormEvent) => void
  editTaskId: string | null
  onDelete: () => void
  loading?: boolean
}

export function TaskModal({
  open,
  onOpenChange,
  formState,
  setFormState,
  users,
  dueDate,
  setDueDate,
  onSubmit,
  editTaskId,
  onDelete,
  loading,
}: TaskModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4 frosted-panel rounded-xl border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gradient-primary">
            {editTaskId ? "Edit" : "New"} Task
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="mt-2 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              className="w-full bg-background/50"
              required
              value={formState.title}
              onChange={(e) => setFormState({ ...formState, title: e.target.value })}
              placeholder="Enter task title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea
              className="w-full min-h-[60px] bg-background/50"
              value={formState.description || ""}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              placeholder="Enter task description"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Assignee</label>
              <select
                title="Assignee"
                className="w-full h-9 rounded-md border px-3 py-1 text-sm bg-background/50"
                value={formState.assignee_id || ""}
                onChange={(e) => setFormState({ ...formState, assignee_id: e.target.value || undefined })}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option value={u.id} key={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                title="Priority"
                className="w-full h-9 rounded-md border px-3 py-1 text-sm bg-background/50"
                value={formState.priority}
                onChange={(e) => setFormState({ ...formState, priority: e.target.value as Task["priority"] })}
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Time (hours)</label>
              <Input
                type="number"
                className="w-full bg-background/50"
                value={formState.estimated_time || ""}
                onChange={(e) => setFormState({ ...formState, estimated_time: Number(e.target.value) || undefined })}
                placeholder="e.g. 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background/50 h-9 px-3 py-1",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 frosted-panel" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date)
                      setFormState({
                        ...formState,
                        due_date: date ? date.toISOString() : undefined,
                      })
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Visibility</label>
            <select
              title="Visibility"
              className="w-full h-9 rounded-md border px-3 py-1 text-sm bg-background/50"
              value={formState.visibility}
              onChange={(e) => setFormState({ ...formState, visibility: e.target.value as Task["visibility"] })}
            >
              <option value="internal">Internal Only</option>
              <option value="public">Public (Client Visible)</option>
            </select>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button type="submit" className="flex-1 bg-gradient-primary text-white" disabled={loading}>
              {editTaskId ? "Save Changes" : "Create Task"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
          {editTaskId && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="mt-2 w-full"
              disabled={loading}
            >
              Delete Task
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
} 