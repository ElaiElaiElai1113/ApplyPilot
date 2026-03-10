import Link from 'next/link'
import type { Metadata } from 'next'
import { Check, Sparkles } from 'lucide-react'
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
    description: 'Best for validating the workflow before you commit.',
    cta: 'Create Free Account',
    href: '/signup',
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
    description: 'For active job seekers who want more volume and a stronger workflow.',
    cta: 'Start Pro Trial',
    href: '/signup',
    featured: true,
    features: [
      'Higher generation limits',
      'Priority AI processing',
      'Export-ready application workflow',
      'Future billing, settings, and support upgrades',
    ],
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Transparent pricing before signup
          </div>
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">Pricing built for job-search momentum</h1>
          <p className="text-lg text-muted-foreground">
            Start free, validate the workflow, then upgrade when you need more generations and faster throughput.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={tier.featured ? 'border-primary shadow-lg shadow-primary/10' : ''}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-2xl">
                  {tier.name}
                  {tier.featured ? (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                      Recommended
                    </span>
                  ) : null}
                </CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="pb-1 text-muted-foreground">{tier.cadence}</span>
                </div>
                <div className="space-y-3">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Button asChild className="w-full" variant={tier.featured ? 'default' : 'outline'}>
                  <Link href={tier.href}>{tier.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border bg-card/70 p-6 text-sm text-muted-foreground">
          Billing is not yet wired in this repo, so this page currently establishes pricing clarity, packaging, and trust while the billing layer is finalized.
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground sm:flex-row">
          <Link href="/terms" className="hover:text-foreground hover:underline">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
        </div>
      </section>
    </main>
  )
}
