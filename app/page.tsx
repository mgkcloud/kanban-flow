"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  type User,
  type Project,
  type Task,
  STATUS,
  type TaskFormState,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  randomId,
} from "@/lib/data"
import { useAuth } from "@/contexts/auth-context"
import { supabaseBrowserClient } from "@/lib/supabase"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function Home() {
  const { user, signOut } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<Task["priority"] | "all">("all")
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectClientName, setNewProjectClientName] = useState("")
  const [isCreatingProject, setIsCreatingProject] = useState(false)

  // --- Client view URL structure ---
  const [url, setUrl] = useState<URL | null>(null)
  const [clientNameUrlParam, setClientNameUrlParam] = useState<string | null>(null)
  const [clientTokenUrlParam, setClientTokenUrlParam] = useState<string | null>(null)
  const [isClientView, setIsClientView] = useState(false)

  // Fetch data from Supabase
  useEffect(() => {
    async function fetchData() {
      if (!user) return

      setLoading(true)
      try {
        // Get current user from database
        const { data: userData, error: userError } = await supabaseBrowserClient!
          .from("users")
          .select("*")
          .eq("email", user.email)
          .single()

        if (userError) {
          console.error("Error fetching user:", userError)
          // If user doesn't exist in our database yet, create them
          if (userError.code === "PGRST116") {
            const newUser = {
              id: randomId(),
              name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
              email: user.email,
              role: "user",
              auth_id: user.id,
            }

            const { error: insertError } = await supabaseBrowserClient!.from("users").insert(newUser)

            if (insertError) {
              console.error("Error creating user:", insertError)
            } else {
              setCurrentUser(newUser as User)
            }
          }
        } else {
          setCurrentUser(userData as User)
        }

        // Fetch projects the user has access to
        const { data: projectMemberships, error: membershipError } = await supabaseBrowserClient!
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
          .eq("user_id", userData?.id || user.id)

        if (membershipError) {
          console.error("Error fetching project memberships:", membershipError)
        } else {
          const userProjects = projectMemberships.map((membership) => membership.project).filter(Boolean) as Project[]

          setProjects(userProjects)
        }

        // Fetch all users for assignments
        const { data: usersData, error: usersError } = await supabaseBrowserClient!.from("users").select("*")

        if (usersError) {
          console.error("Error fetching users:", usersError)
        } else {
          setUsers(usersData as User[])
        }

        // Fetch tasks for all projects
        const { data: tasksData, error: tasksError } = await supabaseBrowserClient!.from("tasks").select("*")

        if (tasksError) {
          console.error("Error fetching tasks:", tasksError)
        } else {
          setTasks(tasksData as Task[])
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentUrl = new URL(window.location.href)
      setUrl(currentUrl)

      let clientName = null
      let clientToken = null
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

  // For client view: all projects matching that client org + token
  const clientProjects = isClientView
    ? projects.filter((p) => p.client_name === clientNameUrlParam && p.client_token === clientTokenUrlParam)
    : []

  // For admin/normal use: project dropdown logic as usual
  const [currentProjectId, setCurrentProjectId] = useState<string>("")

  // Set initial project once data is loaded
  useEffect(() => {
    if (projects.length > 0 && !currentProjectId) {
      setCurrentProjectId(projects[0]?.id || "")
    }
  }, [projects, currentProjectId])

  const currentProject = projects.find((p) => p.id === currentProjectId) || projects[0]

  // --- Static client org URL (used for sharing) ---
  const [staticClientUrl, setStaticClientUrl] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined" && currentProject?.client_name && currentProject?.client_token) {
      setStaticClientUrl(
        `${window.location.origin}/client/${encodeURIComponent(
          currentProject.client_name,
        )}/${currentProject.client_token}`,
      )
    } else {
      setStaticClientUrl("")
    }
  }, [currentProject])

  // New Task form state
  const [showForm, setShowForm] = useState(false)
  const [formState, setFormState] = useState<TaskFormState>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assignee_id: "",
    visibility: "public",
  })

  // Edit logic
  const [editTaskId, setEditTaskId] = useState<string | null>(null)

  // Drag & drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

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
    setShowForm(true)
  }

  async function handleDrop(status: Task["status"]) {
    if (!draggedTaskId || !currentUser) return

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === draggedTaskId ? { ...t, status } : t)))

    // Update in database
    try {
      await updateTask(draggedTaskId, { status }, currentUser.id)
    } catch (error) {
      console.error("Error updating task status:", error)
      // Revert on error
      const originalTask = tasks.find((t) => t.id === draggedTaskId)
      if (originalTask) {
        setTasks((prev) => prev.map((t) => (t.id === draggedTaskId ? originalTask : t)))
      }
    }

    setDraggedTaskId(null)
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (formState.title.trim().length === 0 || !currentUser) return

    try {
      if (editTaskId) {
        // Update existing task
        const updatedTask = await updateTask(editTaskId, formState, currentUser.id)
        if (updatedTask) {
          setTasks((prev) => prev.map((t) => (t.id === editTaskId ? updatedTask : t)))
        }
      } else {
        // Create new task
        if (!currentProject) return

        const newTask = await createTask(
          {
            ...formState,
            project_id: currentProject.id,
          },
          currentUser.id,
        )

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
    } catch (error) {
      console.error("Error saving task:", error)
    }
  }

  async function handleDelete(id: string) {
    if (!currentUser || !currentProject) return

    // Optimistic update
    setTasks((prev) => prev.filter((t) => t.id !== id))

    try {
      await deleteTask(id, currentUser.id, currentProject.id)
    } catch (error) {
      console.error("Error deleting task:", error)
      // Fetch tasks again on error
      const tasksData = await getTasks()
      setTasks(tasksData)
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
        const newTask = await createTask(
          {
            ...task,
            project_id: task.project_id || currentProject?.id || "",
          },
          currentUser.id,
        )

        if (newTask) {
          newTasks.push(newTask)
        } else {
          errors.push(`Failed to import task: ${task.title}`)
        }
      } catch (error) {
        console.error("Error importing task:", error)
        errors.push(`Error importing task: ${task.title}`)
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

  async function handleCreateProject() {
    if (!newProjectName.trim() || !currentUser) return

    setIsCreatingProject(true)

    try {
      // Generate a client token
      const clientToken = randomId()

      // Create the project
      const { data: projectData, error: projectError } = await supabaseBrowserClient!
        .from("projects")
        .insert({
          id: randomId(),
          name: newProjectName,
          client_name: newProjectClientName || null,
          client_token: clientToken,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (projectError) throw projectError

      // Add the current user as an owner
      const { error: memberError } = await supabaseBrowserClient!.from("project_members").insert({
        id: randomId(),
        project_id: projectData.id,
        user_id: currentUser.id,
        role: "owner",
        created_at: new Date().toISOString(),
      })

      if (memberError) throw memberError

      // Add the project to the list
      setProjects([...projects, projectData])
      setCurrentProjectId(projectData.id)

      // Reset form
      setNewProjectName("")
      setNewProjectClientName("")
      setShowNewProjectDialog(false)
    } catch (err) {
      console.error("Error creating project:", err)
      alert("Failed to create project. Please try again.")
    } finally {
      setIsCreatingProject(false)
    }
  }

  // Filter tasks for current project
  let projectTasks = tasks.filter((t) => t.project_id === currentProject?.id)

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

  // For client, show only all public tasks from their projects
  const clientPublicTasks = isClientView
    ? tasks.filter((t) => clientProjects.some((p) => p.id === t.project_id) && t.visibility === "public")
    : []

  // Add dark/light theme control
  const [theme, setTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme =
        (window.localStorage.getItem("theme") as "light" | "dark") ||
        (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      setTheme(savedTheme)
      document.documentElement.classList.toggle("dark", savedTheme === "dark")
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark")
      window.localStorage.setItem("theme", theme)
    }
  }, [theme])

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
      {/* Compact Sidebar - shown only for admin view */}
      {!isClientView && (
        <CompactSidebar
          projects={projects}
          currentProjectId={currentProjectId}
          onProjectChange={setCurrentProjectId}
          clientUrl={staticClientUrl}
          onAddTask={() => setShowForm(true)}
        />
      )}

      {/* Main content area */}
      <main className={cn("min-h-screen transition-all duration-300", !isClientView ? "ml-16" : "")}>
        <div className="p-4 md:p-6">
          {/* Top bar with theme toggle and user menu */}
          <div className="absolute z-20 top-4 right-4 flex items-center gap-3">
            <ThemeToggle theme={theme} setTheme={setTheme} />

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="frosted-panel">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowNewProjectDialog(true)}>Create New Project</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>Sign Out</DropdownMenuItem>
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
                          statusList={STATUS}
                          users={users}
                          currentUser={currentUser}
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
                  {currentProject?.name || "Select a Project"}
                </h1>
                {currentProject?.client_name && (
                  <span className="text-sm px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {currentProject.client_name}
                  </span>
                )}
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  onClick={() => setShowForm(true)}
                  className="text-sm flex items-center gap-1 bg-gradient-primary hover:bg-primary/90 text-white"
                  disabled={!currentProject}
                >
                  <Plus size={16} /> Add Task
                </Button>

                <ImportTasks
                  projectId={currentProject?.id || ""}
                  onImport={handleImportTasks}
                  disabled={!currentProject}
                />

                {currentProject && (
                  <ProjectSharing
                    projectId={currentProject.id}
                    projectName={currentProject.name}
                    clientUrl={staticClientUrl}
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

              {currentProject ? (
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
                          statusList={STATUS}
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
                        <ActivityStream projectId={currentProject.id} users={users} maxItems={10} />
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
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-md p-4 frosted-panel rounded-xl border">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-gradient-primary">
                      {editTaskId ? "Edit" : "New"} Task
                    </DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleFormSubmit} className="mt-2 space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <Input
                        className="w-full bg-background/50"
                        required
                        value={formState.title}
                        onChange={(e) => setFormState((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Enter task title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <Textarea
                        className="w-full min-h-[60px] bg-background/50"
                        value={formState.description || ""}
                        onChange={(e) => setFormState((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Enter task description"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Assignee</label>
                        <select
                          className="w-full h-9 rounded-md border px-3 py-1 text-sm bg-background/50"
                          value={formState.assignee_id || ""}
                          onChange={(e) => setFormState((f) => ({ ...f, assignee_id: e.target.value || undefined }))}
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
                          className="w-full h-9 rounded-md border px-3 py-1 text-sm bg-background/50"
                          value={formState.priority}
                          onChange={(e) =>
                            setFormState((f) => ({ ...f, priority: e.target.value as Task["priority"] }))
                          }
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
                          onChange={(e) =>
                            setFormState((f) => ({ ...f, estimated_time: Number(e.target.value) || undefined }))
                          }
                          placeholder="e.g. 2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Due Date</label>
                        <Input
                          type="date"
                          className="w-full bg-background/50"
                          value={formState.due_date ? new Date(formState.due_date).toISOString().split("T")[0] : ""}
                          onChange={(e) =>
                            setFormState((f) => ({
                              ...f,
                              due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Visibility</label>
                      <select
                        className="w-full h-9 rounded-md border px-3 py-1 text-sm bg-background/50"
                        value={formState.visibility}
                        onChange={(e) =>
                          setFormState((f) => ({ ...f, visibility: e.target.value as Task["visibility"] }))
                        }
                      >
                        <option value="internal">Internal Only</option>
                        <option value="public">Public (Client Visible)</option>
                      </select>
                    </div>

                    <DialogFooter className="mt-4 gap-2">
                      <Button type="submit" className="flex-1 bg-gradient-primary text-white">
                        {editTaskId ? "Save Changes" : "Create Task"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false)
                          setEditTaskId(null)
                        }}
                      >
                        Cancel
                      </Button>
                    </DialogFooter>

                    {editTaskId && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(editTaskId)}
                        className="mt-2 w-full"
                      >
                        Delete Task
                      </Button>
                    )}
                  </form>
                </DialogContent>
              </Dialog>

              {/* New Project Modal */}
              <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
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

                      <Button type="button" variant="outline" onClick={() => setShowNewProjectDialog(false)}>
                        Cancel
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
