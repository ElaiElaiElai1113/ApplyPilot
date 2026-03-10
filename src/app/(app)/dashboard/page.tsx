'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Clock3, FileText, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getClientApplications,
  getClientCurrentUser,
  getClientDashboardStats,
  getClientResumes,
} from '@/lib/supabase/client-queries'
import { formatDate } from '@/lib/utils'
import type { Application } from '@/types/database'

function getGreeting(name: string) {
  const hour = new Date().getHours()
  const dayPart = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return `${dayPart}, ${name}.`
}

function getDueFollowUps(applications: Application[]) {
  const now = Date.now()
  return applications.filter((app) => app.next_follow_up_at && new Date(app.next_follow_up_at).getTime() <= now)
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState('there')
  const [stats, setStats] = useState<{
    applicationsThisWeek: number
    averageMatchScore: number
    totalApplications: number
    recentApplications: Application[]
    resumeCount: number
    dueFollowUps: Application[]
  } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const user = await getClientCurrentUser()
        if (!user) return

        setUserName(
          typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
            ? user.user_metadata.full_name.split(' ')[0]
            : user.email?.split('@')[0] || 'there'
        )

        const [dashboardData, resumes, applications] = await Promise.all([
          getClientDashboardStats(user.id),
          getClientResumes(user.id),
          getClientApplications(user.id),
        ])

        setStats({
          ...dashboardData,
          resumeCount: resumes.length,
          dueFollowUps: getDueFollowUps(applications).slice(0, 5),
        })
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const encouragement = useMemo(() => getGreeting(userName), [userName])
  const weeklyTarget = (stats?.resumeCount || 0) > 0 ? 4 : 1
  const weeklyProgress = Math.min(100, Math.round(((stats?.applicationsThisWeek || 0) / weeklyTarget) * 100))
  const checklist = [
    {
      label: 'Add your source resume',
      done: (stats?.resumeCount || 0) > 0,
      href: '/resumes',
    },
    {
      label: 'Generate a targeted package',
      done: (stats?.totalApplications || 0) > 0,
      href: (stats?.resumeCount || 0) > 0 ? '/generate' : '/resumes',
    },
    {
      label: 'Move an application through the tracker',
      done: (stats?.totalApplications || 0) > 0,
      href: (stats?.totalApplications || 0) > 0 ? '/tracker' : '/generate',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-8 p-6 md:p-8">
        <div className="space-y-3">
          <Skeleton className="h-12 w-80 rounded-full" />
          <Skeleton className="h-5 w-72 rounded-full" />
        </div>
        <Skeleton className="h-40 rounded-[2rem]" />
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-36 rounded-[2rem]" />
          <Skeleton className="h-36 rounded-[2rem]" />
          <Skeleton className="h-36 rounded-[2rem]" />
        </div>
        <Skeleton className="h-72 rounded-[2rem]" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
        className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]"
      >
        <div className="rounded-[2.2rem] border border-[#eadfd3] bg-[#fff9f3] p-7 shadow-[0_24px_70px_rgba(214,195,180,0.16)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#eef5e8] px-4 py-2 text-sm text-[#6e8567]">
            <Sparkles className="h-4 w-4" />
            Application workflow
          </div>
          <h1 className="mt-5 font-serif text-5xl leading-tight text-[#524236]">{encouragement}</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#746659]">
            Track momentum, watch for follow-ups, and keep output sustainable week to week.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link href={(stats?.resumeCount || 0) > 0 ? '/generate' : '/resumes'}>
              <Button className="h-14 rounded-full bg-[#86a27e] px-8 text-base text-white hover:bg-[#779570]">
                {(stats?.resumeCount || 0) > 0 ? 'Create next package' : 'Add your first resume'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/tracker">
              <Button variant="ghost" className="h-14 rounded-full border border-[#e2d6cb] bg-white/90 px-8 text-base text-[#6d5b4f] hover:bg-[#f7f1ea]">
                Open tracker
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-[2.2rem] border border-[#eadfd3] bg-white/85 p-6 shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">Core workflow</p>
          <div className="mt-5 space-y-4">
            {checklist.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-[1.6rem] border border-[#efe3d7] bg-[#fffaf5] px-4 py-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${item.done ? 'bg-[#e5efdc] text-[#6c8265]' : 'bg-[#f3ebe3] text-[#9a8678]'}`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-[#655549]">{item.label}</span>
                </div>
                <Badge className={item.done ? 'rounded-full bg-[#e5efdc] text-[#6c8265]' : 'rounded-full bg-[#f4ece4] text-[#8d7a6d]'}>
                  {item.done ? 'Done' : 'Next'}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="grid gap-5 lg:grid-cols-3">
        <StatCard
          title="Applications this week"
          value={`${stats?.applicationsThisWeek || 0}`}
          helper={`Target: ${weeklyTarget} applications`}
          progress={weeklyProgress}
          tint="bg-[#f7e4db]"
        />
        <StatCard
          title="Average match score"
          value={`${stats?.averageMatchScore || 0}%`}
          helper="Track output quality before you send."
          progress={stats?.averageMatchScore || 0}
          tint="bg-[#e5efdc]"
        />
        <StatCard
          title="Applications tracked"
          value={`${stats?.totalApplications || 0}`}
          helper={`${stats?.dueFollowUps.length || 0} follow-up item(s) due`}
          progress={Math.min(100, ((stats?.totalApplications || 0) / 12) * 100)}
          tint="bg-[#efe5f7]"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[2.2rem] border-[#eadfd3] bg-white/85 shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">Apply rhythm</p>
                <h2 className="mt-2 font-serif text-3xl text-[#524236]">Weekly execution plan</h2>
              </div>
              <Link href="/generate">
                <Button variant="ghost" className="rounded-full border border-[#eadfd3] bg-[#fffaf5] text-[#6d5b4f] hover:bg-[#f7f1ea]">
                  Generate
                </Button>
              </Link>
            </div>

            <div className="mt-6 rounded-[1.7rem] border border-[#efe3d7] bg-[#fffaf5] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#56463b]">This week</p>
                  <p className="mt-1 text-sm text-[#877568]">
                    Aim for {weeklyTarget} high-fit applications instead of pushing volume.
                  </p>
                </div>
                <span className="rounded-full bg-[#e5efdc] px-4 py-2 text-sm text-[#6c8265]">
                  {stats?.applicationsThisWeek || 0}/{weeklyTarget}
                </span>
              </div>
              <div className="mt-4 h-3 rounded-full bg-white/75">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(6, weeklyProgress)}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.2 }}
                  className="h-full rounded-full bg-[#d5b76b]"
                />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {stats?.recentApplications?.length ? (
                stats.recentApplications.map((app) => (
                  <div key={app.id} className="flex flex-col gap-4 rounded-[1.7rem] border border-[#efe3d7] bg-[#fffaf5] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-[#56463b]">{app.company}</p>
                      <p className="mt-1 text-sm text-[#877568]">{app.role}</p>
                      <p className="mt-2 text-sm text-[#9c897b]">Saved {formatDate(app.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-[#e5efdc] px-4 py-2 text-sm text-[#6c8265]">
                        Match {app.match_score}%
                      </span>
                      <span className="rounded-full bg-[#f3ebe3] px-4 py-2 text-sm text-[#8d7a6d] capitalize">
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.7rem] border border-dashed border-[#dbcdbf] bg-[#fffaf4] p-8 text-center">
                  <FileText className="mx-auto h-10 w-10 text-[#b29d8d]" />
                  <p className="mt-4 font-serif text-2xl text-[#5a4a3f]">No applications saved yet.</p>
                  <p className="mt-2 text-sm leading-7 text-[#7b6a5d]">
                    Generate a package and save it to start the workflow.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[2.2rem] border-[#eadfd3] bg-[#f7efe7] shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">Follow-up queue</p>
              <h3 className="mt-3 font-serif text-3xl text-[#524236]">Items that need attention</h3>
              <div className="mt-5 space-y-3">
                {stats?.dueFollowUps.length ? (
                  stats.dueFollowUps.map((app) => (
                    <div key={app.id} className="rounded-[1.4rem] border border-[#eadfd3] bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#56463b]">{app.company}</p>
                          <p className="mt-1 text-sm text-[#7c6b5e]">{app.role}</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-full bg-[#fff4ec] px-3 py-1 text-xs text-[#a56448]">
                          <Clock3 className="h-3 w-3" />
                          Due
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-[#877568]">
                        Follow up by {app.next_follow_up_at ? formatDate(app.next_follow_up_at) : 'now'}.
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-[#756659]">No follow-ups are due right now.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.2rem] border-[#eadfd3] bg-[#eef5e8] shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#809578]">Next action</p>
              <h3 className="mt-3 font-serif text-3xl text-[#4f6149]">
                {(stats?.resumeCount || 0) > 0 ? 'You have what you need to build the next package.' : 'Start by adding your source resume.'}
              </h3>
              <Link href={(stats?.resumeCount || 0) > 0 ? '/generate' : '/resumes'}>
                <Button className="mt-6 rounded-full bg-[#86a27e] px-6 text-white hover:bg-[#779570]">
                  {(stats?.resumeCount || 0) > 0 ? 'Open generator' : 'Open resume vault'}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  title,
  value,
  helper,
  progress,
  tint,
}: {
  title: string
  value: string
  helper: string
  progress: number
  tint: string
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      className={`rounded-[2rem] border border-[#eadfd3] ${tint} p-6 shadow-[0_16px_50px_rgba(214,195,180,0.12)]`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">{title}</p>
      <p className="mt-3 font-serif text-5xl text-[#524236]">{value}</p>
      <p className="mt-3 text-sm leading-7 text-[#756659]">{helper}</p>
      <div className="mt-5 h-3 rounded-full bg-white/75">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(6, Math.min(100, progress))}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.2 }}
          className="h-full rounded-full bg-[#d5b76b]"
        />
      </div>
    </motion.div>
  )
}
