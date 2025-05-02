import React from "react"
import { Button } from "@/components/ui/button"
import { FolderKanban } from "lucide-react"

interface OnboardingCardProps {
  onCreateProject: () => void
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({ onCreateProject }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="bg-white dark:bg-background frosted-panel rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-2 border-primary animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg mb-2">
          <FolderKanban size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gradient-primary mb-2">Welcome to Kanban Flow!</h2>
        <p className="text-base text-muted-foreground mb-4">Let&apos;s get you started by creating your first project. You&apos;ll be able to add tasks and invite teammates after this step.</p>
        <Button
          className="w-full bg-gradient-primary text-white text-lg py-3 rounded-lg font-semibold shadow-md hover:scale-105 transition-transform"
          onClick={onCreateProject}
          autoFocus
        >
          Create Your First Project
        </Button>
      </div>
    </div>
  </div>
) 