"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FolderKanban, ChevronLeft, ChevronRight, Plus, Users, Link, Settings } from "lucide-react"
import { ProjectSelector } from "@/components/project-selector"
import type { Project } from "@/lib/data"

interface CompactSidebarProps {
  projects: Project[]
  currentProjectId: string
  onProjectChange: (projectId: string) => void
  clientUrl: string
  onAddTask: () => void
}

export function CompactSidebar({
  projects,
  currentProjectId,
  onProjectChange,
  clientUrl,
  onAddTask,
}: CompactSidebarProps) {
  const [expanded, setExpanded] = useState(false)
  const currentProject = projects.find((p) => p.id === currentProjectId)

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full z-30 transition-all duration-300 flex flex-col",
        expanded ? "w-64" : "w-16",
        "frosted-panel border-r",
      )}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <div className={cn("flex items-center gap-3", !expanded && "justify-center w-full")}>
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-md">
            <FolderKanban size={18} className="text-white" />
          </div>
          {expanded && <span className="font-bold text-gradient-primary">Kanban Flow</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded(!expanded)}
          className={cn("h-8 w-8", !expanded && "hidden")}
        >
          <ChevronLeft size={18} />
        </Button>
        {!expanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="absolute -right-3 top-12 h-6 w-6 rounded-full bg-background border shadow-sm"
          >
            <ChevronRight size={14} />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className={cn("w-full justify-start gap-3 rounded-lg h-10", !expanded && "justify-center px-0")}
            onClick={onAddTask}
          >
            <Plus size={18} className="text-primary" />
            {expanded && <span>Add Task</span>}
          </Button>

          {expanded && (
            <div className="mt-6 mb-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-2 px-3">PROJECTS</h3>
              <ProjectSelector projects={projects} currentProjectId={currentProjectId} onChange={onProjectChange} />
            </div>
          )}

          {!expanded && (
            <div className="mt-6 flex flex-col items-center gap-2">
              {projects.map((project) => (
                <Button
                  key={project.id}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-lg",
                    project.id === currentProjectId && "bg-primary/10 text-primary",
                  )}
                  onClick={() => onProjectChange(project.id)}
                  title={project.name}
                >
                  <div className="w-6 h-6 flex items-center justify-center">{project.name.charAt(0)}</div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {expanded && currentProject?.client_name && (
        <div className="p-3 border-t">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Users size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium">{currentProject.client_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(clientUrl)
                  alert("Client link copied!")
                }}
              >
                <Link size={12} />
                Copy Client Link
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-2 border-t">
        <Button
          variant="ghost"
          className={cn("w-full justify-start gap-3 rounded-lg h-10", !expanded && "justify-center px-0")}
        >
          <Settings size={18} className="text-muted-foreground" />
          {expanded && <span>Settings</span>}
        </Button>
      </div>
    </div>
  )
}
