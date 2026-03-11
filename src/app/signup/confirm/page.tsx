import Link from 'next/link'
import { MailCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupConfirmPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfbf7] p-4 text-[#4d4037]">
      <Card className="w-full max-w-md rounded-[2rem] border-[#eadfd3] bg-white/90 shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e5efdc] text-[#6d8466]">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="font-serif text-4xl text-[#524236]">Check your inbox</CardTitle>
          <CardDescription className="text-[#7b6a5d]">
            Confirm your email to finish setting up ApplyPilot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef5e8]">
            <MailCheck className="h-7 w-7 text-[#6d8466]" />
          </div>
          <p className="text-sm text-[#7b6a5d]">
            We sent a verification link to your email address. Open it on this device, then sign in to continue.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
