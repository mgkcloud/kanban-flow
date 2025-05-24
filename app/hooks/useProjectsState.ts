import { useState, useEffect } from "react"
import { useUser, useSession } from "@clerk/nextjs"
import { BYPASS_CLERK } from "@/lib/dev-auth"
import { useSupabaseClient } from "@/lib/supabase-auth-context"
import { type Project, type User, randomId } from "@/lib/data"

export function useProjectsState(currentUser: User | null) {
  const { user } = BYPASS_CLERK ? { user: null } : useUser()
  const { session } = BYPASS_CLERK ? { session: null } : useSession()
  const supabase = useSupabaseClient()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [currentProjectId, setCurrentProjectId] = useState<string>("")
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectClientName, setNewProjectClientName] = useState("")
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [staticClientUrl, setStaticClientUrl] = useState("")

  // Fetch projects and onboarding state
  useEffect(() => {
    async function fetchProjects() {
      if (BYPASS_CLERK) {
        if (!currentUser) return
        setLoading(true)
        try {
          const userId = currentUser.id
          const { data: projectMemberships } = await supabase
            .from("project_members")
            .select(`project:project_id (id, name, client_name, client_token, created_at)`)
            .eq("user_id", userId)

          let userProjects = (projectMemberships || [])
            .map((membership: { project: Project | Project[] }) => {
              const proj = membership.project
              if (Array.isArray(proj)) {
                return proj[0] || null
              }
              return proj || null
            })
            .filter(Boolean)

          if (userProjects.length === 0 && userId) {
            try {
              const defaultProjectId = randomId()
              const clientToken = randomId()
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
                .single()
              if (projectError) throw projectError
              const { error: memberError } = await supabase.from("project_members").insert({
                id: randomId(),
                project_id: defaultProjectId,
                user_id: userId,
                role: "owner",
                created_at: new Date().toISOString(),
              })
              if (memberError) throw memberError
              userProjects = [projectData]
              setProjects(userProjects)
              setCurrentProjectId(projectData.id)
            } catch (err) {
              console.error("Error auto-creating default project:", err)
            }
          } else {
            setProjects(userProjects)
          }
        } catch (error) {
          console.error("Error fetching projects:", error)
        } finally {
          setLoading(false)
        }
        return
      }
      if (!user || !user.id || !session) return
      setLoading(true)
      try {
        // Fetch user by auth_id only
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .single()

        // If user doesn't exist in our database yet, we should exit early
        // They should be created in app/page.tsx before this runs
        if (userError) {
          console.error("User not found in database:", userError);
          setLoading(false);
          return;
        }
        
        const userId = userData.id; // Use the internal user ID, not the Clerk ID

        // Fetch projects the user has access to
        const { data: projectMemberships } = await supabase
          .from("project_members")
          .select(`project:project_id (id, name, client_name, client_token, created_at)`)
          .eq("user_id", userId)

        let userProjects = (projectMemberships || [])
          .map((membership: { project: Project | Project[] }) => {
            const proj = membership.project
            if (Array.isArray(proj)) {
              return proj[0] || null
            }
            return proj || null
          })
          .filter(Boolean)

        // If user has no projects, create a default one automatically
        if (userProjects.length === 0 && userId) {
          try {
            const defaultProjectId = randomId()
            const clientToken = randomId()
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
              .single()
            if (projectError) throw projectError
            const { error: memberError } = await supabase.from("project_members").insert({
              id: randomId(),
              project_id: defaultProjectId,
              user_id: userId, // Use internal user ID
              role: "owner",
              created_at: new Date().toISOString(),
            })
            if (memberError) throw memberError
            userProjects = [projectData]
            setProjects(userProjects)
            setCurrentProjectId(projectData.id)
          } catch (err) {
            console.error("Error auto-creating default project:", err)
          }
        } else {
          setProjects(userProjects)
        }
      } catch (error) {
        console.error("Error fetching projects:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [user, session, supabase, currentUser])

  // Set initial project once data is loaded
  useEffect(() => {
    if (projects.length > 0 && !currentProjectId) {
      setCurrentProjectId(projects[0]?.id || "")
    }
  }, [projects, currentProjectId])

  // Static client org URL (used for sharing)
  useEffect(() => {
    const currentProject = projects.find((p) => p.id === currentProjectId) || projects[0]
    if (typeof window !== "undefined" && currentProject?.client_name && currentProject?.client_token) {
      setStaticClientUrl(
        `${window.location.origin}/client/${encodeURIComponent(currentProject.client_name)}/${currentProject.client_token}`
      )
    } else {
      setStaticClientUrl("")
    }
  }, [projects, currentProjectId])

  // Onboarding state
  useEffect(() => {
    if (!loading && projects.length === 0) {
      setShowOnboarding(true)
    } else {
      setShowOnboarding(false)
    }
  }, [loading, projects])

  // Project creation handler
  async function handleCreateProject() {
    if (!newProjectName.trim() || !currentUser || (!BYPASS_CLERK && !session)) return
    setIsCreatingProject(true)
    try {
      const clientToken = randomId()
      const { data: projectData, error: projectError } = await supabase
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
      const { error: memberError } = await supabase.from("project_members").insert({
        id: randomId(),
        project_id: projectData.id,
        user_id: currentUser.id,
        role: "owner",
        created_at: new Date().toISOString(),
      })
      if (memberError) throw memberError
      setProjects([...projects, projectData])
      setCurrentProjectId(projectData.id)
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

  return {
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
  }
} 