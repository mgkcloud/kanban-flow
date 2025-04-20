"use client"
import type { Project } from "@/lib/data"
import { FolderKanban } from "lucide-react"

interface ProjectSelectorProps {
  projects: Project[]
  currentProjectId: string
  onChange: (projectId: string) => void
}

export function ProjectSelector({ projects, currentProjectId, onChange }: ProjectSelectorProps) {
  return (
    <div className="border-2 rounded-lg overflow-hidden">
      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => onChange(project.id)}
          className={cn(
            "w-full text-left px-4 py-3 flex items-center gap-3 text-base transition-colors",
            "border-b-2 last:border-b-0",
            project.id === currentProjectId ? "bg-primary/10 font-bold" : "hover:bg-secondary",
          )}
        >
          <FolderKanban size={20} className="text-primary shrink-0" />
          <div className="flex flex-col">
            <span className="font-medium">{project.name}</span>
            {project.client_name && <span className="text-sm text-muted-foreground">{project.client_name}</span>}
          </div>
        </button>
      ))}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
