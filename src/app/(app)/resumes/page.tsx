'use client'

import { useEffect, useRef, useState } from 'react'
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
  Upload,
  Wand2,
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
import {
  createClientResume,
  deleteClientResume,
  getClientCurrentUser,
  getClientResumes,
  updateClientResume,
} from '@/lib/supabase/client-queries'
import { useRouter } from 'next/navigation'
import { trackClientEvent } from '@/lib/analytics/client'
import { formatResumeText } from '@/lib/resume-format'

export default function ResumesPage() {
  const router = useRouter()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isExtractingPdf, setIsExtractingPdf] = useState(false)
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ title: '', content: '' })
  const { toast } = useToast()
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Load resumes from Supabase for the current authenticated user
  useEffect(() => {
    async function loadResumes() {
      try {
        const user = await getClientCurrentUser()
        if (!user) {
          toast({
            title: 'Please sign in first',
            variant: 'destructive',
          })
          router.push('/login')
          return
        }

        setCurrentUserId(user.id)
        const data = await getClientResumes(user.id)
        setResumes(data)
        if (data.length > 0) {
          setSelectedResume(data[0])
        }
      } catch (error) {
        toast({
          title: 'Failed to load resumes',
          description: 'Please try again',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadResumes()
  }, [router, toast])

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
      if (!currentUserId) {
        toast({
          title: 'Please sign in first',
          variant: 'destructive',
        })
        router.push('/login')
        return
      }

      let updated = [...resumes]
      if (isEditing && selectedResume) {
        const saved = await updateClientResume(
          selectedResume.id,
          formData.title,
          formData.content
        )
        updated = updated.map(r => (r.id === selectedResume.id ? saved : r))
      } else {
        const saved = await createClientResume(
          currentUserId,
          formData.title,
          formData.content
        )
        updated = [saved, ...updated]
      }

      setResumes(updated)

      toast({
        title: isEditing ? 'Resume updated' : 'Resume created',
        description: isEditing
          ? 'Your resume has been updated successfully'
          : 'Your resume has been added to the vault',
      })
      void trackClientEvent(isEditing ? 'resume_updated' : 'resume_created', {
        content_length: formData.content.length,
      })

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      const description =
        error instanceof Error && error.message
          ? error.message
          : 'Please try again'
      toast({
        title: 'Failed to save resume',
        description,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setIsDeleting(id)
    try {
      await deleteClientResume(id)
      const updated = resumes.filter(r => r.id !== id)
      setResumes(updated)

      toast({
        title: 'Resume deleted',
        description: 'Your resume has been removed from the vault',
      })
      void trackClientEvent('resume_deleted')
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

  async function handleImportPdf(file: File) {
    setIsExtractingPdf(true)
    try {
      const payload = new FormData()
      payload.append('file', file)
      const response = await fetch('/api/resume/extract', {
        method: 'POST',
        body: payload,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import PDF')
      }

      setFormData((prev) => ({
        title: prev.title.trim() || data.title || prev.title,
        content: data.content || prev.content,
      }))

      toast({
        title: 'PDF imported',
        description: 'Review and edit the extracted text before saving.',
      })
      void trackClientEvent('resume_pdf_import_succeeded', {
        filename: file.name,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import PDF'
      toast({
        title: 'PDF import failed',
        description: message,
        variant: 'destructive',
      })
      void trackClientEvent('resume_pdf_import_failed', {
        reason: message,
      })
    } finally {
      setIsExtractingPdf(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleReformatContent() {
    if (!formData.content.trim()) {
      toast({
        title: 'No resume content to reformat',
        variant: 'destructive',
      })
      return
    }

    const formatted = formatResumeText(formData.content)
    setFormData((prev) => ({ ...prev, content: formatted }))
    toast({
      title: 'Resume content reformatted',
      description: 'Review and adjust any details before saving.',
    })
    void trackClientEvent('resume_content_reformatted', {
      original_length: formData.content.length,
      formatted_length: formatted.length,
    })
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
              <Label>Import From PDF (Optional)</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      void handleImportPdf(file)
                    }
                  }}
                  disabled={isSaving || isExtractingPdf}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving || isExtractingPdf}
                >
                  {isExtractingPdf ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload PDF
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Up to 5 MB
                </p>
              </div>
            </div>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Resume Content</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReformatContent}
                  disabled={isSaving || isExtractingPdf}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Reformat
                </Button>
              </div>
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
