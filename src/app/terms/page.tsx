import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#fdfbf7] px-4 py-20 text-[#4d4037]">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#eadfd3] bg-white/90 p-8 shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
        <h1 className="font-serif text-5xl text-[#4f4035]">Terms of Service</h1>
        <p className="mt-4 text-[#746659]">
          ApplyPilot is provided as a software service for creating and tracking job-application materials.
        </p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-[#756659]">
          <p>You are responsible for reviewing all generated materials before sending them to employers. AI output should be treated as draft assistance, not final legal or professional advice.</p>
          <p>You may not use the service to impersonate another person, submit fraudulent credentials, or abuse the platform’s automation and generation limits.</p>
          <p>Paid plans, when enabled, follow the pricing displayed in-product at the time of purchase and renew by the selected billing cadence unless canceled.</p>
          <p>Accounts may be suspended for policy violations, abuse, security threats, or attempts to bypass platform limits.</p>
        </div>
        <div className="mt-8">
          <Link href="/" className="text-[#6d5b4f] hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
