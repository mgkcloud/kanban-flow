import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import React from "react"

interface ProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  newProjectName: string
  setNewProjectName: (name: string) => void
  newProjectClientName: string
  setNewProjectClientName: (name: string) => void
  isCreatingProject: boolean
  handleCreateProject: () => void
}

export function ProjectModal({
  open,
  onOpenChange,
  newProjectName,
  setNewProjectName,
  newProjectClientName,
  setNewProjectClientName,
  isCreatingProject,
  handleCreateProject,
}: ProjectModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4 frosted-panel rounded-xl border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gradient-primary">Create New Project</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCreateProject()
          }}
          className="mt-2 space-y-3"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <Input
              className="w-full bg-background/50"
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Client Name (Optional)</label>
            <Input
              className="w-full bg-background/50"
              value={newProjectClientName}
              onChange={(e) => setNewProjectClientName(e.target.value)}
              placeholder="Enter client name"
            />
            <p className="text-xs text-muted-foreground mt-1">
              If this project is for a client, enter their name to create a client view
            </p>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="submit"
              className="flex-1 bg-gradient-primary text-white"
              disabled={isCreatingProject || !newProjectName.trim()}
            >
              {isCreatingProject ? "Creating..." : "Create Project"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 