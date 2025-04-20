"use client"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"

interface ThemeToggleProps {
  theme: "light" | "dark"
  setTheme: (theme: "light" | "dark") => void
}

export function ThemeToggle({ theme, setTheme }: ThemeToggleProps) {
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="bg-card border-2 rounded-lg shadow-md h-12 px-4 font-medium"
    >
      {theme === "dark" ? (
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-yellow-500" />
          <span>Light Mode</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-blue-500" />
          <span>Dark Mode</span>
        </div>
      )}
    </Button>
  )
}
