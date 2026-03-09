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
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getDashboardStats } from '@/lib/supabase/queries'
import { getCurrentUser } from '@/lib/auth'
import { formatDate, getStatusColor, getMatchScoreColor } from '@/lib/utils'
import type { Application } from '@/types/database'

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
    recentApplications: Application[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const user = await getCurrentUser()
        if (!user) return

        const data = await getDashboardStats(user.id)
        setStats(data)
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
            Welcome back! Here's your job application overview.
          </p>
        </div>
        <Link href="/generate">
          <Button size="lg">
            <Send className="mr-2 h-5 w-5" />
            Quick Generate
          </Button>
        </Link>
      </motion.div>

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
            value={stats?.recentApplications?.length || 0}
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
  icon: any
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
