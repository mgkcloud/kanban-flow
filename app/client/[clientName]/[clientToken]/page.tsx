"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { SupabaseAuthProvider, useSupabaseClient } from "@/lib/supabase-auth-context"
import { KanbanBoard } from "@/components/kanban-board"
import { ActivityStream } from "@/components/activity-stream"
import { FolderKanban } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { type Project, type Task, type User, getUsers } from "@/lib/data"
import { STATUS } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

function isErrorWithMessage(err: unknown): err is { message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  )
}

function ClientViewContent() {
  const params = useParams()
  const supabase = useSupabaseClient()
  const { toast } = useToast()

  const clientName = typeof params.clientName === "string" ? params.clientName : Array.isArray(params.clientName) ? params.clientName[0] : undefined
  const clientToken = typeof params.clientToken === "string" ? params.clientToken : Array.isArray(params.clientToken) ? params.clientToken[0] : undefined

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        if (!clientName || !clientToken) {
          setError("Invalid client link.")
          setProjects([])
          setTasks([])
          return
        }
        // Fetch projects for this client
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("client_name", clientName)
          .eq("client_token", clientToken)
        if (projectError) throw projectError
        if (!projectData || projectData.length === 0) {
          setError("No projects found for this client link.")
          setProjects([])
          setTasks([])
          return
        }
        setProjects(projectData as Project[])
        // Fetch all public tasks for these projects
        const projectIds = projectData.map((p: Project) => p.id)
        const { data: taskData, error: taskError } = await supabase
          .from("tasks")
          .select("*")
          .in("project_id", projectIds)
          .eq("visibility", "public")
        if (taskError) throw taskError
        setTasks((taskData || []) as Task[])
        // Fetch all users (for assignee display)
        const usersData = await getUsers(supabase)
        setUsers(usersData)
      } catch (err: unknown) {
        setError("Failed to load client workspace.")
        toast({
          title: "Error",
          description: isErrorWithMessage(err)
            ? err.message
            : "Failed to load client workspace.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName, clientToken])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center frosted-panel p-8 rounded-xl animate-fade-in">
          <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg mx-auto mb-4">
            <FolderKanban size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gradient-primary">Loading Client Workspace...</h2>
          <p>Fetching your client projects and tasks...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Card className="max-w-md w-full text-center animate-fade-in">
          <CardHeader>
            <CardTitle>Client Workspace Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!projects.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Card className="max-w-md w-full text-center animate-fade-in">
          <CardHeader>
            <CardTitle>No Projects Found</CardTitle>
            <CardDescription>This client link is valid, but no projects are available.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen bg-gradient-subtle", "bg-background")}>  
      <div className="max-w-5xl mx-auto py-8 px-2 md:px-6">
        <div className="mb-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
            <FolderKanban size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gradient-primary mb-0">{clientName}</h1>
            <span className="text-sm text-muted-foreground">Client Workspace</span>
          </div>
        </div>
        {projects.map((proj) => {
          const projectTasks = tasks.filter((t) => t.project_id === proj.id)
          return (
            <section key={proj.id} className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderKanban size={18} className="text-primary" />
                </div>
                <span className="font-bold text-lg">{proj.name}</span>
                <Badge variant="outline" className="ml-2">{projectTasks.length} public tasks</Badge>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3">
                  <KanbanBoard
                    tasks={projectTasks}
                    statusList={STATUS as unknown as { key: string; label: string }[]}
                    users={users}
                    currentUser={undefined}
                    readonly
                  />
                </div>
                <div className="frosted-panel rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-medium text-sm">Recent Activity</span>
                  </div>
                  <ActivityStream projectId={proj.id} users={users} isClientView={true} maxItems={5} />
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default function ClientViewPage() {
  return (
    <SupabaseAuthProvider>
      <ClientViewContent />
    </SupabaseAuthProvider>
  )
}
