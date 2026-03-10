'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  Eye,
  Loader2,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { deleteClientApplication, getClientApplications, getClientCurrentUser, updateClientApplicationStatus } from '@/lib/supabase/client-queries'
import { formatDate } from '@/lib/utils'
import { trackClientEvent } from '@/lib/analytics/client'
import type { Application } from '@/types/database'

type StatusFilter = 'all' | Application['status']

const boardColumns: Array<{
  key: Application['status']
  label: string
  tint: string
}> = [
  { key: 'draft', label: 'Wishlist', tint: 'bg-[#fff4ec]' },
  { key: 'applied', label: 'Applied', tint: 'bg-[#eef5e8]' },
  { key: 'interview', label: 'Interview', tint: 'bg-[#efe5f7]' },
  { key: 'offer', label: 'Offer', tint: 'bg-[#fff7d9]' },
  { key: 'rejected', label: 'Closed', tint: 'bg-[#f4ece4]' },
]

export default function TrackerPage() {
  const { toast } = useToast()
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Application | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [celebratingId, setCelebratingId] = useState<string | null>(null)

  const loadApplications = useCallback(async () => {
    try {
      const user = await getClientCurrentUser()
      if (!user) return
      const data = await getClientApplications(user.id)
      setApplications(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadApplications()
  }, [loadApplications])

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.role.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [applications, searchQuery, statusFilter])

  async function handleStatusChange(applicationId: string, status: Application['status']) {
    setIsUpdating(applicationId)
    try {
      await updateClientApplicationStatus(applicationId, status)
      await loadApplications()
      setCelebratingId(applicationId)
      setTimeout(() => setCelebratingId(null), 1400)
      toast({
        title: 'Moved with care',
        description: `This application is now in ${boardColumns.find((column) => column.key === status)?.label}.`,
      })
      void trackClientEvent('application_status_updated', { status })
    } finally {
      setIsUpdating(null)
    }
  }

  async function handleDelete(applicationId: string) {
    setIsDeleting(applicationId)
    try {
      await deleteClientApplication(applicationId)
      await loadApplications()
      setDeleteCandidate(null)
      toast({
        title: 'Application removed',
        description: 'Your board is a little lighter now.',
      })
    } finally {
      setIsDeleting(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <Skeleton className="h-12 w-64 rounded-full" />
        <Skeleton className="h-16 rounded-[2rem]" />
        <div className="grid gap-5 lg:grid-cols-4">
          <Skeleton className="h-[520px] rounded-[2rem]" />
          <Skeleton className="h-[520px] rounded-[2rem]" />
          <Skeleton className="h-[520px] rounded-[2rem]" />
          <Skeleton className="h-[520px] rounded-[2rem]" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
        className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr]"
      >
        <div className="rounded-[2.2rem] border border-[#eadfd3] bg-[#fff9f3] p-7 shadow-[0_24px_70px_rgba(214,195,180,0.16)]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">Application tracker</p>
          <h1 className="mt-4 font-serif text-5xl text-[#524236]">A soft board for every next step.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#746659]">
            Wishlist, applied roles, interviews, and offers all stay in one kind, easy-to-scan space.
          </p>
        </div>

        <div className="rounded-[2.2rem] border border-[#eadfd3] bg-white/85 p-6 shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#9d897a]" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search your applications"
                className="rounded-full border-[#e3d8cd] bg-[#fffcf8] pl-11"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-full rounded-full border-[#e3d8cd] bg-[#fffcf8] sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {boardColumns.map((column) => (
                  <SelectItem key={column.key} value={column.key}>
                    {column.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-4 text-sm text-[#7b6a5d]">
            Move a card with the stage picker below. Every change gives a tiny celebratory bounce.
          </p>
        </div>
      </motion.section>

      <section className="grid gap-5 xl:grid-cols-5">
        {boardColumns.map((column) => {
          const columnItems = filteredApplications.filter((application) => application.status === column.key)

          return (
            <div key={column.key} className={`rounded-[2rem] border border-[#eadfd3] ${column.tint} p-4 shadow-[0_18px_60px_rgba(214,195,180,0.12)]`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-serif text-2xl text-[#55453a]">{column.label}</p>
                  <p className="text-sm text-[#8a7769]">{columnItems.length} saved here</p>
                </div>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {columnItems.length ? (
                    columnItems.map((application) => (
                      <motion.div
                        key={application.id}
                        layout
                        initial={{ opacity: 0, y: 14 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: celebratingId === application.id ? [1, 1.04, 1] : 1,
                        }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ type: 'spring', stiffness: 170, damping: 18 }}
                        className="relative rounded-[1.7rem] border border-[#eadfd3] bg-white/90 p-4 shadow-[0_12px_35px_rgba(214,195,180,0.12)]"
                      >
                        {celebratingId === application.id ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-[#e5efdc] px-3 py-1 text-xs text-[#6d8466]"
                          >
                            <Check className="h-3 w-3" />
                            Moved
                          </motion.div>
                        ) : null}

                        <p className="font-medium text-[#56463b]">{application.company}</p>
                        <p className="mt-1 text-sm text-[#7c6b5e]">{application.role}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#a08b7b]">
                          Saved {formatDate(application.created_at)}
                        </p>
                        <p className="mt-3 rounded-full bg-[#f4ece4] px-3 py-1 text-sm text-[#8a7769] inline-block">
                          Strength {application.match_score}%
                        </p>

                        <div className="mt-4 space-y-3">
                          <Select
                            value={application.status}
                            onValueChange={(value) => handleStatusChange(application.id, value as Application['status'])}
                            disabled={isUpdating === application.id}
                          >
                            <SelectTrigger className="rounded-full border-[#e3d8cd] bg-[#fffcf8]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {boardColumns.map((option) => (
                                <SelectItem key={option.key} value={option.key}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              className="flex-1 rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
                              onClick={() => {
                                setSelectedApplication(application)
                                setIsDetailOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              className="rounded-full border border-[#f0d6cc] bg-[#fff4ef] text-[#b56f5a] hover:bg-[#fdebe4]"
                              onClick={() => setDeleteCandidate(application)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-[1.7rem] border border-dashed border-[#dbcdbf] bg-white/60 p-6 text-center text-sm leading-7 text-[#8a7769]"
                    >
                      Nothing in {column.label.toLowerCase()} yet.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </section>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[2rem] border-[#eadfd3] bg-[#fffdf9]">
          {selectedApplication ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-4xl text-[#56463b]">
                  {selectedApplication.company}
                </DialogTitle>
                <DialogDescription className="text-[#7b6a5d]">
                  {selectedApplication.role}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="letter">
                <TabsList className="grid w-full grid-cols-4 rounded-full bg-[#f4ece4] p-1">
                  <TabsTrigger value="letter" className="rounded-full">Letter</TabsTrigger>
                  <TabsTrigger value="resume" className="rounded-full">Resume</TabsTrigger>
                  <TabsTrigger value="strength" className="rounded-full">Strength</TabsTrigger>
                  <TabsTrigger value="prep" className="rounded-full">Prep</TabsTrigger>
                </TabsList>
                <TabsContent value="letter" className="mt-5 whitespace-pre-wrap rounded-[1.8rem] bg-[#fff9f3] p-5 text-sm leading-8 text-[#66564a]">
                  {selectedApplication.proposal}
                </TabsContent>
                <TabsContent value="resume" className="mt-5 whitespace-pre-wrap rounded-[1.8rem] bg-[#fff9f3] p-5 text-sm leading-8 text-[#66564a]">
                  {selectedApplication.tailored_resume}
                </TabsContent>
                <TabsContent value="strength" className="mt-5 rounded-[1.8rem] bg-[#fff9f3] p-5">
                  <p className="font-serif text-4xl text-[#56463b]">Strength {selectedApplication.match_score}%</p>
                  <p className="mt-3 text-sm leading-7 text-[#7b6a5d]">
                    This is a supportive measure of alignment, not a judgment.
                  </p>
                </TabsContent>
                <TabsContent value="prep" className="mt-5 space-y-3 rounded-[1.8rem] bg-[#fff9f3] p-5">
                  {selectedApplication.interview_questions.map((question, index) => (
                    <div key={question} className="rounded-[1.4rem] border border-[#eadfd3] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#9d897a]">Prompt {index + 1}</p>
                      <p className="mt-2 text-sm leading-7 text-[#6d5d51]">{question}</p>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <DialogContent className="max-w-md rounded-[2rem] border-[#eadfd3] bg-[#fffdf9]">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl text-[#55453a]">Remove this application?</DialogTitle>
            <DialogDescription className="text-[#7b6a5d]">
              {deleteCandidate
                ? `${deleteCandidate.company} will disappear from your board.`
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
                'Remove application'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
