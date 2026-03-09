'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  Send,
  Copy,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import type { Resume } from '@/types/database'
import { formatDate, truncateText } from '@/lib/utils'

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ title: '', content: '' })
  const { toast } = useToast()

  // Load resumes from local storage
  useEffect(() => {
    const saved = localStorage.getItem('resumes')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setResumes(parsed)
        if (parsed.length > 0 && !selectedResume) {
          setSelectedResume(parsed[0])
        }
      } catch (e) {
        console.error('Failed to load resumes:', e)
      }
    }
    setIsLoading(false)
  }, [])

  async function handleSave() {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const newResume: Resume = {
        id: Date.now().toString(),
        title: formData.title,
        content: formData.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'local',
      }

      let updated = [...resumes]
      if (isEditing && selectedResume) {
        updated = updated.map(r => r.id === selectedResume.id ? newResume : r)
      } else {
        updated = [newResume, ...updated]
      }

      // Save to localStorage
      localStorage.setItem('resumes', JSON.stringify(updated))
      setResumes(updated)

      toast({
        title: isEditing ? 'Resume updated' : 'Resume created',
        description: isEditing
          ? 'Your resume has been updated successfully'
          : 'Your resume has been added to the vault',
      })

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Failed to save resume',
        description: 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setIsDeleting(id)
    try {
      const updated = resumes.filter(r => r.id !== id)
      localStorage.setItem('resumes', JSON.stringify(updated))
      setResumes(updated)

      toast({
        title: 'Resume deleted',
        description: 'Your resume has been removed from the vault',
      })
    } catch (error) {
      toast({
        title: 'Failed to delete resume',
        description: 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(null)
    }
  }

  function handleEdit(resume: Resume) {
    setSelectedResume(resume)
    setFormData({ title: resume.title, content: resume.content })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  function handleCreate() {
    setSelectedResume(null)
    setFormData({ title: '', content: '' })
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  function resetForm() {
    setFormData({ title: '', content: '' })
    setSelectedResume(null)
    setIsEditing(false)
  }

  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content)
      toast({
        title: 'Copied to clipboard',
        description: 'Resume content has been copied',
      })
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Resume Vault</h1>
          <p className="text-muted-foreground mt-1">
            Manage and store your resumes for AI-powered job applications
          </p>
        </div>
        <Button onClick={handleCreate} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Add Resume
        </Button>
      </motion.div>

      {/* Empty State */}
      {resumes.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
              <h2 className="text-2xl font-semibold mb-3">No resumes yet</h2>
              <p className="text-muted-foreground mb-6">
                Add your master resume to get started with AI-powered applications
              </p>
              <Button onClick={handleCreate} size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Add Your First Resume
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Resume Cards */}
      <AnimatePresence mode="popLayout">
        {resumes.map((resume, index) => (
          <motion.div
            key={resume.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold mb-2 truncate">
                      {resume.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Calendar className="h-4 w-4" />
                      <span>Last updated: {formatDate(resume.updated_at)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {truncateText(resume.content, 150)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(resume.content)}
                      title="Copy resume"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(resume)}
                      title="Edit resume"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(resume.id)}
                      disabled={isDeleting === resume.id}
                      title="Delete resume"
                    >
                      {isDeleting === resume.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Resume' : 'Add New Resume'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update your resume details'
                : 'Add your master resume to the vault'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Resume Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Software Engineer Resume"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Resume Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Paste your resume content here..."
                className="min-h-[400px] font-mono text-sm"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                {formData.content.length} characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                resetForm()
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {isEditing ? 'Update Resume' : 'Add Resume'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
