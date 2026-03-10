'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  FileText,
  Home,
  LogOut,
  Menu,
  Send,
  Settings,
  Sparkles,
  Table,
  X,
} from 'lucide-react'
import { signOut } from '@/lib/auth'
import { getClientCurrentUser } from '@/lib/supabase/client-queries'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Resume Vault', href: '/resumes', icon: FileText },
  { name: 'Generate', href: '/generate', icon: Send },
  { name: 'Tracker', href: '/tracker', icon: Table },
  { name: 'Settings', href: '/settings', icon: Settings },
]

function SidebarContent({
  pathname,
  userName,
  userEmail,
  onNavigate,
}: {
  pathname: string
  userName: string
  userEmail: string
  onNavigate?: () => void
}) {
  const initials = useMemo(
    () =>
      userName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [userName]
  )

  return (
    <div className="flex h-full flex-col rounded-[2rem] border border-[#eadfd3] bg-[#fffaf4] p-4 shadow-[0_20px_60px_rgba(214,195,180,0.18)]">
      <Link href="/dashboard" className="flex items-center gap-3 rounded-[1.5rem] px-3 py-3" onClick={onNavigate}>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e5efdc] text-[#6d8466]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="font-serif text-2xl leading-none text-[#5a493d]">ApplyPilot</p>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#9d897a]">Application OS</p>
        </div>
      </Link>

      <div className="mt-6 rounded-[1.8rem] bg-[#fbf4ec] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[#a08b7b]">Execution</p>
        <p className="mt-3 font-serif text-2xl text-[#5a493d]">Keep the pipeline moving.</p>
        <p className="mt-2 text-sm leading-7 text-[#7a695c]">
          Build targeted packages, track follow-ups, and keep a clear view of next actions.
        </p>
      </div>

      <nav className="mt-6 space-y-2">
        {navigation.map((item) => {
          const active = pathname === item.href

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-full px-4 py-3 text-sm transition-all',
                active
                  ? 'bg-[#e5efdc] text-[#5a6d53] shadow-[0_12px_30px_rgba(187,205,179,0.35)]'
                  : 'text-[#756658] hover:bg-[#f4ede5]'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        <div className="flex items-center gap-3 rounded-[1.5rem] border border-[#eadfd3] bg-white/90 p-4">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-[#efe5f7] text-[#7c628d]">{initials || 'AP'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-[#5d4d41]">{userName}</p>
            <p className="truncate text-sm text-[#8e7b6d]">{userEmail}</p>
          </div>
        </div>

        <Link
          href="/pricing"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-full px-4 py-3 text-sm text-[#7a695c] transition-colors hover:bg-[#f4ede5]"
        >
          <Sparkles className="h-4 w-4" />
          Pricing
        </Link>

        <form
          action={async () => {
            await signOut()
          }}
        >
          <Button
            variant="ghost"
            className="h-12 w-full justify-start rounded-full px-4 text-[#7a695c] hover:bg-[#f4ede5]"
            type="submit"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userName, setUserName] = useState('ApplyPilot friend')
  const [userEmail, setUserEmail] = useState('')
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    async function loadUser() {
      const user = await getClientCurrentUser()
      if (!user) return

      setUserName(
        typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name
          : user.email?.split('@')[0] || 'ApplyPilot friend'
      )
      setUserEmail(user.email || '')
    }

    void loadUser()
  }, [])

  return (
    <div className="min-h-screen bg-[#fdfbf7]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-10 top-20 h-52 w-52 rounded-full bg-[#f5ddd1]/40 blur-3xl" />
        <div className="absolute right-10 top-40 h-64 w-64 rounded-full bg-[#e3edd9]/45 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[#efe5f7]/35 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-[#eadfd3] bg-[#fdfbf7]/92 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-white/80"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5 text-[#6f6054]" />
          </Button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5efdc] text-[#6d8466]">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-serif text-2xl text-[#59493d]">ApplyPilot</span>
          </Link>
        </div>
      </header>

      <AnimatePresence>
        {sidebarOpen ? (
          <motion.div
            className="fixed inset-0 z-40 bg-[#6d5c4f]/20 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? {} : { opacity: 1 }}
            exit={reduceMotion ? {} : { opacity: 0 }}
          >
            <motion.div
              className="h-full w-[88%] max-w-sm p-4"
              onClick={(event) => event.stopPropagation()}
              initial={reduceMotion ? false : { x: -30, opacity: 0 }}
              animate={reduceMotion ? {} : { x: 0, opacity: 1 }}
              exit={reduceMotion ? {} : { x: -30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            >
              <div className="mb-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-white/80"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5 text-[#6f6054]" />
                </Button>
              </div>
              <SidebarContent
                pathname={pathname}
                userName={userName}
                userEmail={userEmail}
                onNavigate={() => setSidebarOpen(false)}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[290px] shrink-0 lg:block">
          <SidebarContent pathname={pathname} userName={userName} userEmail={userEmail} />
        </aside>

        <main className="min-h-[calc(100vh-2rem)] flex-1 rounded-[2.2rem] border border-[#eadfd3] bg-white/55 shadow-[0_24px_80px_rgba(214,195,180,0.16)] backdrop-blur-sm">
          {children}
        </main>
      </div>
    </div>
  )
}
