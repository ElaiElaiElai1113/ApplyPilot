'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  Check,
  Copy,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatResumeText } from '@/lib/resume-format'
import { createClientResume, deleteClientResume, getClientCurrentUser, getClientResumes, updateClientResume } from '@/lib/supabase/client-queries'
import { trackClientEvent } from '@/lib/analytics/client'
import { formatDate, truncateText } from '@/lib/utils'
import type { Resume } from '@/types/database'

export default function ResumesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isExtractingPdf, setIsExtractingPdf] = useState(false)
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<Resume | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '' })
  const [currentUserId, setCurrentUserId] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    async function loadResumes() {
      try {
        const user = await getClientCurrentUser()
        if (!user) {
          router.push('/login')
          return
        }

        setCurrentUserId(user.id)
        const data = await getClientResumes(user.id)
        setResumes(data)
      } finally {
        setIsLoading(false)
      }
    }

    void loadResumes()
  }, [router])

  function resetForm() {
    setFormData({ title: '', content: '' })
    setSelectedResume(null)
    setIsEditing(false)
  }

  function handleCreate() {
    resetForm()
    setIsDialogOpen(true)
  }

  function handleEdit(resume: Resume) {
    setSelectedResume(resume)
    setFormData({ title: resume.title, content: resume.content })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Let’s add both a title and some resume content first.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      let updated = [...resumes]

      if (isEditing && selectedResume) {
        const saved = await updateClientResume(selectedResume.id, formData.title, formData.content)
        updated = updated.map((resume) => (resume.id === selectedResume.id ? saved : resume))
      } else {
        const saved = await createClientResume(currentUserId, formData.title, formData.content)
        updated = [saved, ...updated]
      }

      setResumes(updated)
      setIsDialogOpen(false)
      resetForm()
      toast({
        title: isEditing ? 'Resume updated' : 'Resume added',
        description: 'Your vault is ready for the next tailored application.',
      })
      void trackClientEvent(isEditing ? 'resume_updated' : 'resume_created', {
        content_length: formData.content.length,
      })
    } catch (error) {
      toast({
        title: 'We couldn’t save that resume yet.',
        description: error instanceof Error ? error.message : 'Please try again.',
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
      setResumes((current) => current.filter((resume) => resume.id !== id))
      setDeleteCandidate(null)
      toast({
        title: 'Resume removed',
        description: 'Your shelf is a little tidier now.',
      })
      void trackClientEvent('resume_deleted')
    } finally {
      setIsDeleting(null)
    }
  }

  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content)
      toast({
        title: 'Copied',
        description: 'Resume text copied to your clipboard.',
      })
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please try again.',
        variant: 'destructive',
      })
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
        title: 'Resume imported',
        description: 'Take a moment to review the text before saving.',
      })
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsExtractingPdf(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleReformatContent() {
    if (!formData.content.trim()) return

    const formatted = formatResumeText(formData.content)
    setFormData((prev) => ({ ...prev, content: formatted }))
    toast({
      title: 'Resume refreshed',
      description: 'We cleaned up the formatting for easier editing.',
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-8 p-6 md:p-8">
        <Skeleton className="h-12 w-64 rounded-full" />
        <Skeleton className="h-52 rounded-[2rem]" />
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-[2rem]" />
          <Skeleton className="h-72 rounded-[2rem]" />
          <Skeleton className="h-72 rounded-[2rem]" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
        className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="rounded-[2.2rem] border border-[#eadfd3] bg-[#fff9f3] p-7 shadow-[0_24px_70px_rgba(214,195,180,0.16)]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">Resume shelf</p>
          <h1 className="mt-4 font-serif text-5xl text-[#524236]">Keep every polished version close by.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#746659]">
            Store your master resume, gentle rewrites, and role-specific versions in one soft little vault.
          </p>
          <Button
            onClick={handleCreate}
            className="mt-7 rounded-full bg-[#86a27e] px-8 text-white hover:bg-[#779570]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add a resume
          </Button>
        </div>

        <div className="rounded-[2.2rem] border border-dashed border-[#d8cabc] bg-[#fffdf9] p-6 shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">Friendly upload area</p>
          <div className="mt-6 flex h-full min-h-[220px] flex-col items-center justify-center rounded-[1.9rem] bg-[#fbf4ec] px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e5efdc] text-[#6d8466]">
              <Upload className="h-7 w-7" />
            </div>
            <h2 className="mt-5 font-serif text-3xl text-[#58483d]">Drop your master resume right here.</h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-[#7a695c]">
              Or click below to bring in a PDF and we&apos;ll pull out the text for you gently.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void handleImportPdf(file)
                }
              }}
              disabled={isSaving || isExtractingPdf}
            />
            <Button
              variant="ghost"
              className="mt-6 rounded-full border border-[#e2d6cb] bg-white/90 px-6 text-[#6d5b4f] hover:bg-[#f7f1ea]"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtractingPdf}
            >
              {isExtractingPdf ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bringing it in...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.section>

      <section>
        {resumes.length === 0 ? (
          <div className="rounded-[2.2rem] border border-[#eadfd3] bg-white/80 p-12 text-center shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
            <FileText className="mx-auto h-12 w-12 text-[#b29d8d]" />
            <h2 className="mt-5 font-serif text-4xl text-[#59493d]">Your shelf is ready.</h2>
            <p className="mt-3 text-sm leading-7 text-[#79685b]">
              Add your first resume and we&apos;ll keep it neat, editable, and ready for future tailoring.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {resumes.map((resume, index) => (
                <motion.div
                  key={resume.id}
                  layout
                  initial={{ opacity: 0, y: 20, rotate: -1 }}
                  animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -1 : 1 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                >
                  <div className="relative h-full">
                    <div className="absolute inset-x-4 top-3 h-full rounded-[1.8rem] bg-[#efe4d9]" />
                    <div className="relative h-full rounded-[2rem] border border-[#eadfd3] bg-[#fffdf9] p-6 shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">Resume card</p>
                          <h3 className="mt-3 font-serif text-3xl leading-tight text-[#55453a]">
                            {resume.title}
                          </h3>
                        </div>
                        <div className="rounded-full bg-[#efe5f7] px-3 py-1 text-xs text-[#7f6790]">
                          Ready
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-2 text-sm text-[#8d7b6e]">
                        <Calendar className="h-4 w-4" />
                        Updated {formatDate(resume.updated_at)}
                      </div>

                      <p className="mt-5 text-sm leading-7 text-[#766659]">
                        {truncateText(resume.content, 190)}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Button
                          variant="ghost"
                          className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
                          onClick={() => handleCopy(resume.content)}
                          aria-label={`Copy ${resume.title}`}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button
                          variant="ghost"
                          className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
                          onClick={() => handleEdit(resume)}
                          aria-label={`Edit ${resume.title}`}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="rounded-full border border-[#f0d6cc] bg-[#fff4ef] text-[#b56f5a] hover:bg-[#fdebe4]"
                          onClick={() => setDeleteCandidate(resume)}
                          aria-label={`Delete ${resume.title}`}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-[2rem] border-[#eadfd3] bg-[#fffdf9]">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl text-[#55453a]">
              {isEditing ? 'Update your resume' : 'Add a new resume'}
            </DialogTitle>
            <DialogDescription className="text-[#7b6a5d]">
              Keep it simple. Paste your resume, or import a PDF and tidy it up here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Resume title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="e.g. Executive Assistant resume"
                className="rounded-[1.4rem] border-[#e3d8cd] bg-[#fffcf8]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Resume content</Label>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
                  onClick={handleReformatContent}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Tidy formatting
                </Button>
              </div>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(event) => setFormData((prev) => ({ ...prev, content: event.target.value }))}
                placeholder="Paste your resume right here..."
                className="min-h-[360px] rounded-[1.8rem] border-[#e3d8cd] bg-[#fffcf8] p-5 text-sm leading-7"
              />
              <p className="text-xs text-[#9a8779]">{formData.content.length} characters</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
              onClick={() => {
                setIsDialogOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full bg-[#86a27e] px-6 text-white hover:bg-[#779570]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {isEditing ? 'Save changes' : 'Add to vault'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <DialogContent className="max-w-md rounded-[2rem] border-[#eadfd3] bg-[#fffdf9]">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl text-[#55453a]">Remove this resume?</DialogTitle>
            <DialogDescription className="text-[#7b6a5d]">
              {deleteCandidate
                ? `${deleteCandidate.title} will disappear from your shelf.`
                : 'This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
              onClick={() => setDeleteCandidate(null)}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => deleteCandidate && handleDelete(deleteCandidate.id)}
              disabled={isDeleting === deleteCandidate?.id}
            >
              {isDeleting === deleteCandidate?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove resume'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
