'use client'

import { useEffect, useState } from 'react'
import { Loader2, Mail, ShieldCheck, UserCircle2 } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { getClientCurrentUser } from '@/lib/supabase/client-queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function SettingsPage() {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingEmail, setIsSavingEmail] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
  })

  useEffect(() => {
    async function loadAccount() {
      try {
        const user = await getClientCurrentUser()
        if (!user) {
          router.push('/login')
          return
        }

        setFormData({
          fullName:
            typeof user.user_metadata?.full_name === 'string'
              ? user.user_metadata.full_name
              : '',
          email: user.email || '',
        })
      } catch (error) {
        toast({
          title: 'Failed to load account',
          description: 'Please refresh and try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    void loadAccount()
  }, [router, toast])

  const initials = formData.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleSaveProfile() {
    setIsSavingProfile(true)

    try {
      const user = await getClientCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName.trim(),
        },
      })

      if (authError) throw authError

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email ?? formData.email,
        full_name: formData.fullName.trim() || null,
      })

      if (profileError) throw profileError

      toast({
        title: 'Profile updated',
        description: 'Your display name has been saved.',
      })
    } catch (error) {
      toast({
        title: 'Profile update failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handleSaveEmail() {
    setIsSavingEmail(true)

    try {
      const { error } = await supabase.auth.updateUser({
        email: formData.email.trim(),
      })

      if (error) throw error

      toast({
        title: 'Email change requested',
        description: 'Check both inboxes to confirm the email update.',
      })
    } catch (error) {
      toast({
        title: 'Email update failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingEmail(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="h-10 w-56 animate-pulse rounded-md bg-muted" />
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-72 animate-pulse rounded-xl bg-muted" />
            <div className="h-72 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account identity, email, and security workflow.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                This name is used across your dashboard and generated workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback>{initials || 'AP'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{formData.fullName || 'ApplyPilot user'}</p>
                  <p className="text-sm text-muted-foreground">{formData.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <div className="relative">
                  <UserCircle2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                    className="pl-10"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving profile...
                  </>
                ) : (
                  'Save profile'
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email</CardTitle>
                <CardDescription>
                  Updating your email triggers a confirmation flow through Supabase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Account email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, email: event.target.value }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSaveEmail}
                  disabled={isSavingEmail}
                  className="w-full"
                >
                  {isSavingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating email...
                    </>
                  ) : (
                    'Update email'
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Use the reset flow to rotate your password safely.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Password changes are handled through your authenticated reset route to avoid weak in-app shortcuts.
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => router.push('/forgot-password')}>
                  Reset password
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
