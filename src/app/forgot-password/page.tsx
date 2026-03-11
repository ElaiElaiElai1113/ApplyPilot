'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Mail, Sparkles } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function ForgotPasswordPage() {
  const supabase = createBrowserSupabaseClient()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      toast({
        title: 'Reset email failed',
        description: error.message,
        variant: 'destructive',
      })
      setIsSubmitting(false)
      return
    }

    setSent(true)
    setIsSubmitting(false)
    toast({
      title: 'Reset email sent',
      description: 'Check your inbox for the password reset link.',
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfbf7] p-4 text-[#4d4037]">
      <Card className="w-full max-w-md rounded-[2rem] border-[#eadfd3] bg-white/90 shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e5efdc] text-[#6d8466]">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="font-serif text-4xl text-[#524236]">Reset your password</CardTitle>
          <CardDescription className="text-[#7b6a5d]">
            Enter the email linked to your ApplyPilot account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            {sent ? (
              <div className="rounded-lg border border-[#eadfd3] bg-[#fff9f3] p-3 text-sm text-[#7b6a5d]">
                If the account exists, a password reset link is on its way.
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                <>
                  Send reset link
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-center text-sm text-[#7b6a5d]">
              Remembered it?{' '}
              <Link href="/login" className="text-[#6d5b4f] hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
