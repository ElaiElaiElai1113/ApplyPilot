import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/10 px-4 py-20">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-4xl font-bold">Terms of Service</h1>
        <p className="mt-4 text-muted-foreground">
          ApplyPilot is provided as a software service for creating and tracking job-application materials.
        </p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <p>You are responsible for reviewing all generated materials before sending them to employers. AI output should be treated as draft assistance, not final legal or professional advice.</p>
          <p>You may not use the service to impersonate another person, submit fraudulent credentials, or abuse the platform’s automation and generation limits.</p>
          <p>Before charging customers, these terms should be expanded with billing, refunds, account termination, limitation of liability, and governing-law sections.</p>
        </div>
        <div className="mt-8">
          <Link href="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
