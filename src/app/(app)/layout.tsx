'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth'
import { Sparkles, LayoutDashboard, FileText, Send, Table, LogOut, Menu, X, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getClientCurrentUser } from '@/lib/supabase/client-queries'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Generate', href: '/generate', icon: Send },
  { name: 'Tracker', href: '/tracker', icon: Table },
  { name: 'Resumes', href: '/resumes', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userName, setUserName] = useState('Account')
  const [userEmail, setUserEmail] = useState('')
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    async function loadUser() {
      const user = await getClientCurrentUser()
      if (!user) return

      setUserName(
        typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name
          : user.email?.split('@')[0] || 'Account'
      )
      setUserEmail(user.email || '')
    }

    void loadUser()
  }, [])

  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/5">
      {/* Mobile Header */}
      <header className="lg:hidden border-b bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">ApplyPilot</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen ? (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? {} : { opacity: 1 }}
            exit={reduceMotion ? {} : { opacity: 0 }}
          >
            <motion.div
              className="bg-background h-full w-64 p-4"
              onClick={(e) => e.stopPropagation()}
              initial={reduceMotion ? false : { x: -280 }}
              animate={reduceMotion ? {} : { x: 0 }}
              exit={reduceMotion ? {} : { x: -280 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">ApplyPilot</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <MobileNav />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64 lg:border-r lg:bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 px-6 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" />
              <span className="font-bold text-xl">ApplyPilot</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="border-t p-4">
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{initials || 'AP'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <Link
              href="/pricing"
              className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Sparkles className="h-4 w-4" />
              Pricing
            </Link>
            <form action={async () => {
              await signOut()
            }}>
              <Button
                variant="ghost"
                className="w-full justify-start"
                type="submit"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  )
}

function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {navigation.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            pathname === item.href
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.name}
        </Link>
      ))}
    </nav>
  )
}
