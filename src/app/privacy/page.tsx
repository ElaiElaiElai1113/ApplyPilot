import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fdfbf7] px-4 py-20 text-[#4d4037]">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#eadfd3] bg-white/90 p-8 shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
        <h1 className="font-serif text-5xl text-[#4f4035]">Privacy Policy</h1>
        <p className="mt-4 text-[#746659]">
          ApplyPilot stores account details, resumes, generated application content, and tracker data to deliver personalized job-application workflows.
        </p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-[#756659]">
          <p>We use account and product data for authentication, generation, storage, analytics, security monitoring, and customer support.</p>
          <p>Resume uploads and generated outputs may be processed by trusted third-party infrastructure providers used by the app, including AI, database, and hosting services.</p>
          <p>We apply least-privilege access controls, row-level security policies, and request logging to protect user data and investigate abuse.</p>
          <p>You can update profile data in settings and request account deletion through support channels.</p>
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
