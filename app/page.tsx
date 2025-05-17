"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { CompactSidebar } from "@/components/compact-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { KanbanBoard } from "@/components/kanban-board"
import { ImportTasks } from "@/components/import-tasks"
import { ActivityStream } from "@/components/activity-stream"
import { ProjectSharing } from "@/components/project-sharing"
import { FolderKanban, Search, SlidersHorizontal, History, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useUser, useClerk, useSession } from "@clerk/nextjs"
import { BYPASS_CLERK } from "@/lib/dev-auth"
import { SupabaseAuthProvider, useSupabaseClient } from "@/lib/supabase-auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCurrentUserState } from "@/app/hooks/useCurrentUserState"
import { useProjectsState } from "@/app/hooks/useProjectsState"
import { useTasksState } from "@/app/hooks/useTasksState"
import { OnboardingCard } from "@/components/OnboardingCard"
import { ProjectModal } from "@/components/ProjectModal"
import { TaskModal } from "@/components/TaskModal"
import {
  type User,
  type Task,
  STATUS,
  getTasks,
  randomId,
} from "@/lib/data"

// Add types for sharing data
interface ProjectMember {
  id: string
  user_id: string
  role: "owner" | "editor" | "viewer"
  user: {
    name: string
    email: string
  }
}

interface ProjectInvitation {
  id: string
  email: string
  role: "editor" | "viewer"
  created_at: string
}

// Add a type guard for sharing data
function isSharingData(data: unknown): data is { members: ProjectMember[]; invitations: ProjectInvitation[] } {
  if (
    typeof data !== "object" ||
    data === null ||
    !('members' in data) ||
    !('invitations' in data)
  ) return false;
  const d = data as { members: unknown; invitations: unknown };
  return Array.isArray(d.members) && Array.isArray(d.invitations);
}

function HomeContent() {
  // All hooks at the top
  const { user } = BYPASS_CLERK ? { user: null } : useUser()
  const { signOut } = BYPASS_CLERK ? { signOut: () => {} } : useClerk()
  const { session, isLoaded } = BYPASS_CLERK ? { session: null, isLoaded: true } : useSession()

  // Normalised vars used throughout the component
  const effectiveUser = user
  const effectiveSignOut = signOut
  const effectiveSession = session
  const effectiveIsLoaded = isLoaded
  const supabase = useSupabaseClient()
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<Task["priority"] | "all">("all")
  const [clientNameUrlParam, setClientNameUrlParam] = useState<string | null>(null)
  const [clientTokenUrlParam, setClientTokenUrlParam] = useState<string | null>(null)
  const [isClientView, setIsClientView] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [sharingData, setSharingData] = useState<{ members: ProjectMember[]; invitations: ProjectInvitation[] } | null>(null)
  const [loadingSharing, setLoadingSharing] = useState(false)
  const [sharingError, setSharingError] = useState<string | null>(null)

  // Custom hooks for state management
  const { currentUser } = useCurrentUserState()
  const {
    projects,
    setProjects,
    loading,
    showOnboarding,
    currentProjectId,
    setCurrentProjectId,
    showNewProjectDialog,
    setShowNewProjectDialog,
    newProjectName,
    setNewProjectName,
    newProjectClientName,
    setNewProjectClientName,
    isCreatingProject,
    staticClientUrl,
    handleCreateProject,
  } = useProjectsState(currentUser)
  const {
    tasks,
    setTasks,
    showForm,
    setShowForm,
    formState,
    setFormState,
    editTaskId,
    dueDate,
    setDueDate,
    draggedTaskId,
    setDraggedTaskId,
    handleDrop,
    handleFormSubmit,
    handleDelete,
    handleImportTasks,
    openEdit,
  } = useTasksState(currentUser, projects.find((p) => p.id === currentProjectId) || projects[0], users, session)

  const fetchSharingData = useCallback(async (projectId: string) => {
    setLoadingSharing(true)
    setSharingError(null)
    try {
      const res = await fetch(`/api/project-sharing?projectId=${projectId}`)
      if (!res.ok) throw new Error("Failed to fetch sharing data")
      const data: unknown = await res.json()
      if (isSharingData(data)) {
        setSharingData({
          members: data.members,
          invitations: data.invitations,
        })
      } else {
        throw new Error("Invalid sharing data format")
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Unknown error"
      setSharingError(error)
      setSharingData(null)
    } finally {
      setLoadingSharing(false)
    }
  }, [])

  useEffect(() => {
    if (currentProjectId) {
      fetchSharingData(currentProjectId)
    } else {
      setSharingData(null)
    }
  }, [currentProjectId, fetchSharingData])

  useEffect(() => {
      async function fetchData() {
      if (!effectiveUser || !effectiveUser.id || !effectiveSession) return
      try {
        // First, check if this Clerk user exists in our users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .single()
          
        // Get or create our internal user ID
        let internalUserId: string;
        
        if (userError) {
          if (userError.code === "PGRST116") {
            // User doesn't exist yet, let's create one with our own internal ID
            internalUserId = randomId();
            const newUser = {
              id: internalUserId, // Our internal ID (UUID format)
              name: user.firstName || user.primaryEmailAddress?.emailAddress.split("@")[0] || "User",
              email: user.primaryEmailAddress?.emailAddress || "",
              role: "user",
              auth_id: user.id, // Store the Clerk ID for reference
            }
            const { error: insertError } = await supabase.from("users").insert(newUser)
            if (insertError) {
              console.error("Error creating user:", insertError)
              return; // Exit early on error
            }
          } else {
            console.error("Error fetching user data:", userError);
            return; // Exit early on unexpected error
          }
        } else {
          // User exists, use their internal ID
          internalUserId = userData.id;
        }
        
        // Now use our internal ID for all operations
        const { data: projectMemberships } = await supabase
          .from("project_members")
          .select(`
            project:project_id (
              id,
              name,
              client_name,
              client_token,
              created_at
            )
          `)
          .eq("user_id", internalUserId) // Use internal ID, not Clerk ID
          
        let userProjects = projectMemberships
          ? projectMemberships.map((membership) => {
              const proj = membership.project
              if (Array.isArray(proj)) {
                return proj[0] || null
              }
              return proj || null
            }).filter(Boolean)
          : [];
          
        if (userProjects.length === 0 && internalUserId) {
          try {
            const defaultProjectId = randomId();
            const clientToken = randomId();
            const { data: projectData, error: projectError } = await supabase
              .from("projects")
              .insert({
                id: defaultProjectId,
                name: "My First Project",
                client_name: null,
                client_token: clientToken,
                created_at: new Date().toISOString(),
              })
              .select()
              .single();
            if (projectError) throw projectError;
            
            const { error: memberError } = await supabase.from("project_members").insert({
              id: randomId(),
              project_id: defaultProjectId,
              user_id: internalUserId, // Use internal ID, not Clerk ID
              role: "owner",
              created_at: new Date().toISOString(),
            });
            
            if (memberError) throw memberError;
            userProjects = [projectData];
            setProjects(userProjects);
            setCurrentProjectId(projectData.id);
          } catch (err) {
            console.error("Error auto-creating default project:", err);
          }
        } else {
          setProjects(userProjects);
        }
        
        // Continue with the rest of the code
        const { data: usersData, error: usersError } = await supabase.from("users").select("*")
        if (usersError) {
          console.error("Error fetching users:", usersError)
        } else {
          setUsers(usersData as User[])
        }
        
        if (session) {
          const tasksData = await getTasks(supabase)
          setTasks(tasksData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }
    fetchData()
  }, [effectiveUser, effectiveSession, supabase, setProjects, setCurrentProjectId, setTasks])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentUrl = new URL(window.location.href)
      let clientName: string | null = null
      let clientToken: string | null = null
      let isClient = false
      if (currentUrl.pathname.startsWith("/client/")) {
        const parts = currentUrl.pathname.split("/")
        if (parts.length >= 4) {
          clientName = decodeURIComponent(parts[2])
          clientToken = parts[3]
          isClient =
            !!clientName &&
            !!clientToken &&
            projects.some((p) => p.client_name === clientName && p.client_token === clientToken)
        }
      }
      setClientNameUrlParam(clientName)
      setClientTokenUrlParam(clientToken)
      setIsClientView(isClient)
    }
  }, [projects])

  // Only after all hooks, do the early return
  if (!effectiveIsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center frosted-panel p-8 rounded-xl animate-fade-in">
          <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg mx-auto mb-4">
            <FolderKanban size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gradient-primary">Loading...</h2>
          <p>Authenticating your session...</p>
        </div>
      </div>
    )
  }

  // For client view: all projects matching that client org + token
  const clientProjects = isClientView
    ? projects.filter((p) => p.client_name === clientNameUrlParam && p.client_token === clientTokenUrlParam)
    : []

  // For client, show only all public tasks from their projects
  const clientPublicTasks = isClientView
    ? tasks.filter((t) => clientProjects.some((p) => p.id === t.project_id) && t.visibility === "public")
    : []

  // Filter tasks for current project
  let projectTasks = tasks.filter((t) => t.project_id === (projects.find((p) => p.id === currentProjectId) || projects[0])?.id)

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    projectTasks = projectTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(query))),
    )
  }

  // Apply priority filter
  if (priorityFilter !== "all") {
    projectTasks = projectTasks.filter((t) => t.priority === priorityFilter)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center frosted-panel p-8 rounded-xl animate-fade-in">
          <div className="w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg mx-auto mb-4">
            <FolderKanban size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gradient-primary">Loading...</h2>
          <p>Fetching your Kanban board data</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen bg-gradient-subtle", "bg-background")}>
      {/* Onboarding Card for First-Time Users */}
      {showOnboarding && (
        <OnboardingCard onCreateProject={() => setShowNewProjectDialog(true)} />
      )}

      {/* Compact Sidebar - shown only for admin view and when projects exist */}
      {!isClientView && projects.length > 0 && (
        <CompactSidebar
          projects={projects}
          currentProjectId={currentProjectId}
          onProjectChange={setCurrentProjectId}
          clientUrl={staticClientUrl}
          onAddTask={() => setShowForm(true)}
        />
      )}

      {/* Main content area - only show if projects exist */}
      {projects.length > 0 && (
        <main className={cn("min-h-screen transition-all duration-300", !isClientView ? "ml-16" : "")}>
          <div className="p-4 md:p-6">
            {/* Top bar with theme toggle and user menu */}
            <div className="absolute z-20 top-4 right-4 flex items-center gap-3">
              <ThemeToggle theme={theme} setTheme={setTheme} />

              {/* Unified + button for new task/project, only in admin view and when projects exist */}
              {!isClientView && projects.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-10 w-10 rounded-full text-2xl flex items-center justify-center">
                      +
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="frosted-panel">
                    <DropdownMenuItem onClick={() => setShowForm(true)}>
                      New Task
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowNewProjectDialog(true)}>
                      New Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {effectiveUser && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {effectiveUser.firstName?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="frosted-panel">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => effectiveSignOut()}>Sign Out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {isClientView ? (
              /* Client View */
              <>
                <div className="mb-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                    <FolderKanban size={24} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gradient-primary mb-0">{clientNameUrlParam}</h1>
                    <span className="text-sm text-muted-foreground">Client Workspace</span>
                  </div>
                </div>

                <div className="w-full">
                  {clientProjects.map((proj) => (
                    <section key={proj.id} className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FolderKanban size={18} className="text-primary" />
                        </div>
                        <span className="font-bold text-lg">{proj.name}</span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-3">
                          <KanbanBoard
                            tasks={clientPublicTasks.filter((t) => t.project_id === proj.id)}
                            statusList={[...STATUS]}
                            users={users}
                            currentUser={currentUser || undefined}
                            readonly
                          />
                        </div>

                        <div className="frosted-panel rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <History size={16} />
                            <h3 className="font-medium text-sm">Recent Activity</h3>
                          </div>
                          <ActivityStream projectId={proj.id} users={users} isClientView={true} maxItems={5} />
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              </>
            ) : (
              /* Admin View */
              <>
                <div className="flex items-center mb-6 gap-3 mt-4">
                  <h1 className="text-xl font-bold flex items-center gap-2 text-gradient-primary">
                    {projects.find((p) => p.id === currentProjectId)?.name || "Select a Project"}
                  </h1>
                </div>

                {/* Action bar */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    onClick={() => setShowForm(true)}
                    className="text-sm flex items-center gap-1 bg-gradient-primary hover:bg-primary/90 text-white"
                    disabled={!projects.find((p) => p.id === currentProjectId)}
                  >
                    <Plus size={16} /> Add Task
                  </Button>

                  <ImportTasks
                    projectId={projects.find((p) => p.id === currentProjectId)?.id || ""}
                    onImport={handleImportTasks}
                    disabled={!projects.find((p) => p.id === currentProjectId)}
                  />

                  {projects.find((p) => p.id === currentProjectId) && (
                    <ProjectSharing
                      projectId={projects.find((p) => p.id === currentProjectId)?.id || ""}
                      projectName={projects.find((p) => p.id === currentProjectId)?.name || ""}
                      clientUrl={staticClientUrl}
                      currentUser={currentUser}
                      sharingData={sharingData}
                      loading={loadingSharing}
                      error={sharingError}
                    />
                  )}

                  <div className="flex-1 min-w-[200px] max-w-md ml-auto flex gap-2 items-center">
                    <div className="relative w-full">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search tasks..."
                        className="pl-8 h-9 text-sm w-full frosted-panel"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <SlidersHorizontal size={14} className="text-muted-foreground" />
                  <span className="text-xs">Filter:</span>
                  <div className="flex gap-1">
                    <Button
                      variant={priorityFilter === "all" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => setPriorityFilter("all")}
                    >
                      All
                    </Button>
                    <Button
                      variant={priorityFilter === "high" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => setPriorityFilter("high")}
                    >
                      High
                    </Button>
                    <Button
                      variant={priorityFilter === "medium" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => setPriorityFilter("medium")}
                    >
                      Medium
                    </Button>
                    <Button
                      variant={priorityFilter === "low" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => setPriorityFilter("low")}
                    >
                      Low
                    </Button>
                  </div>

                  {(searchQuery || priorityFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSearchQuery("")
                        setPriorityFilter("all")
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {projects.find((p) => p.id === currentProjectId) ? (
                  <>
                    {projectTasks.length === 0 && (searchQuery || priorityFilter !== "all") ? (
                      <div className="flex items-center justify-center h-40 border border-dashed rounded-xl frosted-panel">
                        <p className="text-muted-foreground">No tasks match your filters</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-3">
                          <KanbanBoard
                            tasks={projectTasks}
                            statusList={[...STATUS]}
                            users={users}
                            currentUser={currentUser || undefined}
                            onEditTask={openEdit}
                            onDeleteTask={handleDelete}
                            onDragStart={setDraggedTaskId}
                            onDrop={handleDrop}
                            draggedTaskId={draggedTaskId}
                          />
                        </div>

                        <div className="frosted-panel rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <History size={16} />
                            <h3 className="font-medium text-sm">Recent Activity</h3>
                          </div>
                          <ActivityStream projectId={projects.find((p) => p.id === currentProjectId)?.id || ""} users={users} maxItems={10} />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-40 border border-dashed rounded-xl frosted-panel">
                    <p className="text-muted-foreground">Please select a project to view tasks</p>
                  </div>
                )}

                {/* Task Modal */}
                <TaskModal
                  open={showForm}
                  onOpenChange={setShowForm}
                  formState={formState}
                  setFormState={setFormState}
                  users={users}
                  dueDate={dueDate}
                  setDueDate={setDueDate}
                  onSubmit={handleFormSubmit}
                  editTaskId={editTaskId}
                  onDelete={() => editTaskId && handleDelete(editTaskId)}
                  loading={false}
                />

                {/* New Project Modal */}
                <ProjectModal
                  open={showNewProjectDialog}
                  onOpenChange={setShowNewProjectDialog}
                  newProjectName={newProjectName}
                  setNewProjectName={setNewProjectName}
                  newProjectClientName={newProjectClientName}
                  setNewProjectClientName={setNewProjectClientName}
                  isCreatingProject={isCreatingProject}
                  handleCreateProject={handleCreateProject}
                />
              </>
            )}
          </div>
        </main>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <SupabaseAuthProvider>
      <HomeContent />
    </SupabaseAuthProvider>
  )
}
