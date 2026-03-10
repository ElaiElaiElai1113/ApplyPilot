'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Briefcase,
  TrendingUp,
  FileText,
  Send,
  ArrowRight,
  Loader2,
  CheckCircle2,
  UserCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getClientCurrentUser, getClientDashboardStats, getClientResumes } from '@/lib/supabase/client-queries'
import { formatDate, getStatusColor, getMatchScoreColor } from '@/lib/utils'
import type { Application } from '@/types/database'
import type { LucideIcon } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    applicationsThisWeek: number
    averageMatchScore: number
    totalApplications: number
    recentApplications: Application[]
    resumeCount: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState('there')

  useEffect(() => {
    async function loadData() {
      try {
        const user = await getClientCurrentUser()
        if (!user) return

        setUserName(
          typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
            ? user.user_metadata.full_name.split(' ')[0]
            : user.email?.split('@')[0] || 'there'
        )

        const [data, resumes] = await Promise.all([
          getClientDashboardStats(user.id),
          getClientResumes(user.id),
        ])
        setStats({
          ...data,
          resumeCount: resumes.length,
        })
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 md:p-8 space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {userName}! Here&apos;s your job application overview.
          </p>
        </div>
        <Link href={stats?.resumeCount ? '/generate' : '/resumes'}>
          <Button size="lg">
            {stats?.resumeCount ? <Send className="mr-2 h-5 w-5" /> : <FileText className="mr-2 h-5 w-5" />}
            {stats?.resumeCount ? 'Quick Generate' : 'Add Your Resume First'}
          </Button>
        </Link>
      </motion.div>

      {(stats?.resumeCount === 0 || (stats?.totalApplications || 0) === 0) ? (
        <motion.div variants={itemVariants}>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>First-run checklist</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <ChecklistItem
                icon={FileText}
                title="Add your resume"
                description="Upload or paste your master resume into the vault."
                done={(stats?.resumeCount || 0) > 0}
                href="/resumes"
              />
              <ChecklistItem
                icon={Send}
                title="Generate your first package"
                description="Create a tailored cover letter and resume from a real job description."
                done={(stats?.totalApplications || 0) > 0}
                href={stats?.resumeCount ? '/generate' : '/resumes'}
              />
              <ChecklistItem
                icon={UserCircle2}
                title="Track progress"
                description="Save your first result so the tracker becomes useful immediately."
                done={(stats?.totalApplications || 0) > 0}
                href={(stats?.totalApplications || 0) > 0 ? '/tracker' : '/generate'}
              />
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {/* Stats Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Applications This Week"
            value={stats?.applicationsThisWeek || 0}
            icon={Briefcase}
            color="bg-blue-500/10 text-blue-500"
          />
          <StatsCard
            title="Average Match Score"
            value={`${stats?.averageMatchScore || 0}%`}
            icon={TrendingUp}
            color="bg-purple-500/10 text-purple-500"
          />
          <StatsCard
            title="Total Applications"
            value={stats?.totalApplications || 0}
            icon={FileText}
            color="bg-green-500/10 text-green-500"
          />
        </div>
      </motion.div>

      {/* Recent Applications */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentApplications && stats.recentApplications.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">{app.company}</TableCell>
                        <TableCell>{app.role}</TableCell>
                        <TableCell>
                          <span className={getMatchScoreColor(app.match_score)}>
                            {app.match_score}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(app.status)}>
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(app.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No applications yet. Start by generating your first application!
                </p>
                <Link href="/generate">
                  <Button>
                    Generate Application
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-primary to-secondary text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">
                  Ready to apply to more jobs?
                </h3>
                <p className="text-white/90">
                  Generate tailored applications in seconds with AI
                </p>
              </div>
              <Link href="/generate">
                <Button size="lg" variant="secondary">
                  Generate Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

function StatsCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  icon: LucideIcon
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChecklistItem({
  icon: Icon,
  title,
  description,
  done,
  href,
}: {
  icon: LucideIcon
  title: string
  description: string
  done: boolean
  href: string
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <p className="font-medium">{title}</p>
        </div>
        {done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <Button asChild size="sm" variant={done ? 'outline' : 'default'}>
        <Link href={href}>{done ? 'Review' : 'Start'}</Link>
      </Button>
    </div>
  )
}
