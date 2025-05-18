"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { type Comment, type User, createComment, getCommentsByTask, timeAgo } from "@/lib/data"
import { useSupabaseClient } from "@/lib/supabase-auth-context"

interface TaskCommentsProps {
  taskId: string
  currentUser?: User | null
}

export function TaskComments({ taskId, currentUser }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useSupabaseClient()

  useEffect(() => {
    async function fetchComments() {
      setLoading(true)
      try {
        const data = await getCommentsByTask(supabase, taskId)
        setComments(data)
      } catch (err) {
        setError("Failed to load comments")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (taskId) {
      fetchComments()
    }
  }, [taskId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !currentUser) return

    setSubmitting(true)
    setError(null)

    try {
      const comment = await createComment(
        {
          task_id: taskId,
          user_id: currentUser.id,
          content: newComment,
        },
        supabase,
      )

      if (comment) {
        // Add user data to the comment for display
        const commentWithUser = {
          ...comment,
          user: currentUser,
        }

        setComments((prev) => [commentWithUser as Comment, ...prev])
        setNewComment("")
      } else {
        setError("Failed to add comment")
      }
    } catch (err) {
      setError("An error occurred while adding your comment")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Comments</h3>

      {currentUser ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[60px] text-sm resize-none bg-background/50"
          />
          <Button
            type="submit"
            size="sm"
            className="self-end rounded-lg"
            disabled={submitting || !newComment.trim()}
          >
            <Send size={14} />
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Log in to add comments</p>
      )}

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-lg p-3 bg-background/50 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-5 w-5 border">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {comment.user?.name.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-baseline gap-2">
                  <p className="font-medium text-xs">{comment.user?.name || "Unknown User"}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</p>
                </div>
              </div>
              <p className="text-sm">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
