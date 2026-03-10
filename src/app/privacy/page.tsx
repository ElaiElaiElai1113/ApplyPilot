import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/10 px-4 py-20">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">
          ApplyPilot stores account details, resumes, generated application content, and tracker data so the product can deliver personalized job-application workflows.
        </p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <p>We only use the data required to authenticate users, generate application materials, and support analytics needed to improve the service.</p>
          <p>Resume uploads and generated outputs may be processed by third-party infrastructure used by the app, including AI and hosting providers.</p>
          <p>You can request account changes through the in-app settings flow. Before charging customers, this policy should be expanded with retention periods, subprocessors, and contact details.</p>
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
