'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  deleteClientApplication,
  getClientApplications,
  getClientCurrentUser,
  updateClientApplicationStatus,
} from '@/lib/supabase/client-queries'
import { formatDate, getStatusColor, getMatchScoreColor } from '@/lib/utils'
import type { Application } from '@/types/database'
import {
  Search,
  Filter,
  Eye,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Briefcase,
  Award,
  MessageSquare,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trackClientEvent } from '@/lib/analytics/client'

type StatusFilter = 'all' | 'draft' | 'applied' | 'interview' | 'rejected' | 'offer'

const statusIcons: Record<Application['status'], any> = {
  draft: Clock,
  applied: MessageSquare,
  interview: Briefcase,
  rejected: XCircle,
  offer: Award,
}

const statusColors: Record<Application['status'], string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  applied: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  interview: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  offer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

export default function TrackerPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const { toast } = useToast()

  const loadApplications = useCallback(async () => {
    try {
      const user = await getClientCurrentUser()
      if (!user) return

      const data = await getClientApplications(user.id)
      setApplications(data)
    } catch (error) {
      toast({
        title: 'Failed to load applications',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadApplications()
  }, [loadApplications])

  async function handleStatusChange(applicationId: string, newStatus: Application['status']) {
    setIsUpdating(applicationId)
    try {
      await updateClientApplicationStatus(applicationId, newStatus)
      await loadApplications()
      toast({
        title: 'Status updated',
        description: `Application status changed to ${newStatus}`,
      })
      void trackClientEvent('application_status_updated', {
        status: newStatus,
      })
    } catch (error) {
      toast({
        title: 'Failed to update status',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(null)
    }
  }

  async function handleDelete(applicationId: string) {
    if (!confirm('Are you sure you want to delete this application?')) {
      return
    }

    setIsDeleting(applicationId)
    try {
      await deleteClientApplication(applicationId)
      await loadApplications()
      toast({
        title: 'Application deleted',
        description: 'The application has been removed from your tracker',
      })
      void trackClientEvent('application_deleted')
    } catch (error) {
      toast({
        title: 'Failed to delete',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.role.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold">Application Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage all your job applications
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-6 overflow-x-auto">
              {(['draft', 'applied', 'interview', 'rejected', 'offer'] as const).map((status) => {
                const count = applications.filter(a => a.status === status).length
                const StatusIcon = statusIcons[status]
                return (
                  <div key={status} className="flex items-center gap-2 min-w-[100px]">
                    <div className={`p-2 rounded-lg ${statusColors[status]}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground capitalize">{status}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Applications Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-20">
                <CheckCircle2 className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                <h3 className="text-xl font-semibold mb-2">
                  No applications found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Start by generating your first application'}
                </p>
                <a href="/generate">
                  <Button>
                    Generate Application
                  </Button>
                </a>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.company}</TableCell>
                          <TableCell>{app.role}</TableCell>
                          <TableCell>
                            <span className={getMatchScoreColor(app.match_score)}>
                              {app.match_score}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[app.status]}>
                              <span className="capitalize">{app.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(app.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Select
                                value={app.status}
                                onValueChange={(v) => handleStatusChange(app.id, v as Application['status'])}
                                disabled={isUpdating === app.id}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="applied">Applied</SelectItem>
                                  <SelectItem value="interview">Interview</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                  <SelectItem value="offer">Offer</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedApplication(app)
                                  setIsDetailOpen(true)
                                }}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(app.id)}
                                disabled={isDeleting === app.id}
                                title="Delete"
                              >
                                {isDeleting === app.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Application Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedApplication && (
            <>
              <DialogHeader>
                <DialogTitle>Application Details</DialogTitle>
                <DialogDescription>
                  {selectedApplication.company} - {selectedApplication.role}
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="proposal">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="proposal">Proposal</TabsTrigger>
                  <TabsTrigger value="resume">Resume</TabsTrigger>
                  <TabsTrigger value="match">Match</TabsTrigger>
                  <TabsTrigger value="interview">Interview</TabsTrigger>
                </TabsList>
                <TabsContent value="proposal" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[400px] overflow-y-auto">
                        {selectedApplication.proposal}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="resume" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[400px] overflow-y-auto">
                        {selectedApplication.tailored_resume}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="match" className="mt-4">
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Match Score</span>
                          <span className={`text-2xl font-bold ${getMatchScoreColor(selectedApplication.match_score)}`}>
                            {selectedApplication.match_score}%
                          </span>
                        </div>
                      </div>
                      {selectedApplication.missing_keywords.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Missing Keywords ({selectedApplication.missing_keywords.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedApplication.missing_keywords.map((keyword, i) => (
                              <Badge key={i} variant="outline">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="interview" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {selectedApplication.interview_questions.map((question, i) => (
                          <div
                            key={i}
                            className="flex gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <Badge className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                              {i + 1}
                            </Badge>
                            <p className="text-sm">{question}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
