import Link from 'next/link'
import type { Metadata } from 'next'
import { Check, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Pricing | ApplyPilot',
  description: 'Simple pricing for AI-powered resume tailoring, cover letters, and application tracking.',
}

const tiers = [
  {
    name: 'Starter',
    price: '$0',
    cadence: '/month',
    description: 'Everything required to run a focused application workflow.',
    cta: 'Start for free',
    href: '/signup',
    availability: 'Available now',
    features: [
      'Up to 20 AI generations per month',
      'Resume vault and application tracker',
      'Job URL import and match scoring',
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    cadence: '/month',
    description: 'Higher throughput for active weekly applicants.',
    cta: 'Join Pro waitlist',
    href: '/signup',
    availability: 'Coming soon',
    featured: true,
    features: [
      'Higher generation limits',
      'Priority AI processing',
      'Expanded workflow exports',
      'Priority support',
    ],
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#fdfbf7] text-[#4d4037]">
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef5e8] px-4 py-2 text-sm font-medium text-[#6e8567]">
            <Sparkles className="h-4 w-4" />
            Transparent pricing before signup
          </div>
          <h1 className="mb-4 font-serif text-5xl text-[#4f4035]">Pricing built for job-search momentum</h1>
          <p className="text-lg text-[#746659]">
            Start free, validate the workflow, then upgrade when you need more generations and faster throughput.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`rounded-[2rem] border-[#eadfd3] bg-white/90 shadow-[0_18px_60px_rgba(214,195,180,0.14)] ${
                tier.featured ? 'ring-2 ring-[#d98f74]/35' : ''
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between font-serif text-3xl text-[#524236]">
                  {tier.name}
                  <span className={`rounded-full px-3 py-1 text-xs ${tier.featured ? 'bg-[#f7e4db] text-[#9a593f]' : 'bg-[#eef5e8] text-[#6c8265]'}`}>
                    {tier.availability}
                  </span>
                </CardTitle>
                <CardDescription className="text-[#7b6a5d]">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-end gap-1">
                  <span className="font-serif text-5xl text-[#524236]">{tier.price}</span>
                  <span className="pb-1 text-[#8a7769]">{tier.cadence}</span>
                </div>
                <div className="space-y-3">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-[#6d5d51]">
                      <Check className="mt-0.5 h-4 w-4 text-[#86a27e]" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Button
                  asChild
                  className={tier.featured ? 'w-full rounded-full bg-[#d98f74] text-white hover:bg-[#cf8064]' : 'w-full rounded-full'}
                  variant={tier.featured ? 'default' : 'outline'}
                >
                  <Link href={tier.href}>{tier.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-[1.6rem] border border-[#eadfd3] bg-[#fff9f3] p-6 text-sm text-[#756659]">
          Starter is currently available in-app. Pro access is being rolled out progressively, and pricing/packaging is finalized here to keep expectations clear before checkout goes live.
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-[#8a7769] sm:flex-row">
          <Link href="/terms" className="hover:text-[#5f4d40] hover:underline">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-[#5f4d40] hover:underline">
            Privacy Policy
          </Link>
          <Link href="/signup" className="inline-flex items-center gap-1 hover:text-[#5f4d40] hover:underline">
            Create account
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>
    </main>
  )
}
