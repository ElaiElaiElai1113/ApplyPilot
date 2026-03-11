'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from '@/lib/auth'
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn(formData)
      if (result?.error) {
        setError(result.error)
        toast({
          title: 'Sign in failed',
          description: result.error,
          variant: 'destructive',
        })
        return
      }
      router.push('/dashboard')
    } catch {
      setError('An unexpected error occurred')
      toast({
        title: 'Sign in failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfbf7] p-4 text-[#4d4037]">
      <Card className="w-full max-w-md rounded-[2rem] border-[#eadfd3] bg-white/90 shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e5efdc] text-[#6d8466]">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="font-serif text-4xl text-[#524236]">Welcome back</CardTitle>
          <CardDescription className="text-[#7b6a5d]">
            Sign in to your ApplyPilot account
          </CardDescription>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-[#6d5b4f] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
              <p className="text-sm text-[#7b6a5d] text-center">
                Don't have an account?{' '}
                <Link href="/signup" className="text-[#6d5b4f] hover:underline">
                  Sign up
                </Link>
              </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
