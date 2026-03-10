'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, CheckCircle2, FileText, Layers3, ShieldCheck, Sparkles, Stars, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'

const featureCards = [
  {
    icon: FileText,
    title: 'Evidence-backed resume rewrites',
    body: 'Generate targeted resumes and cover letters with outputs grounded in the uploaded source resume.',
    color: 'bg-[#fff5ea]',
  },
  {
    icon: ShieldCheck,
    title: 'Reasoning you can inspect',
    body: 'Confidence mode, truth lock, and interview bridge make the system explainable instead of opaque.',
    color: 'bg-[#eef5e8]',
  },
  {
    icon: Workflow,
    title: 'Workflow, not just generation',
    body: 'Save each package to the tracker, manage stages, and keep follow-up timing visible.',
    color: 'bg-[#f4eef9]',
  },
]

const highlights = [
  'Built for VAs, executive assistants, customer support, and operations roles',
  'Role packs for admin, support, operations, lead generation, and more',
  'Follow-up aware tracker with stage management and interview prep',
]

function FloatingBlob({ className, duration }: { className: string; duration: number }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      aria-hidden="true"
      className={className}
      animate={
        reduceMotion
          ? {}
          : {
              y: [0, -14, 0],
              x: [0, 8, 0],
              rotate: [0, 4, 0],
            }
      }
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

export default function HomePage() {
  const reduceMotion = useReducedMotion()

  return (
    <main className="relative overflow-hidden bg-[#fdfbf7] text-[#4d4037]">
      <div className="absolute inset-0 overflow-hidden">
        <FloatingBlob className="absolute left-[-4rem] top-24 h-40 w-40 rounded-full bg-[#f4d7c7]/60 blur-3xl" duration={10} />
        <FloatingBlob className="absolute right-12 top-16 h-56 w-56 rounded-full bg-[#dfe8d8]/70 blur-3xl" duration={12} />
        <FloatingBlob className="absolute bottom-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[#ece0f3]/70 blur-3xl" duration={14} />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-20 border-b border-[#eadfd3] bg-[#fdfbf7]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e5efdc] text-[#61745b] shadow-[0_8px_30px_rgba(193,206,184,0.35)]">
                <Stars className="h-5 w-5" />
              </div>
              <div>
                <p className="font-serif text-2xl leading-none text-[#5b4b3f]">ApplyPilot</p>
                <p className="text-xs tracking-[0.22em] text-[#9b8777] uppercase">Application Copilot</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="rounded-full border border-[#e5d9cd] bg-white/70 px-5 text-[#6d5a4c] hover:bg-[#f7f1ea]">
                  Sign In
                </Button>
              </Link>
              <Link href="/pricing">
                <Button className="rounded-full bg-[#d98f74] px-6 text-white hover:bg-[#cf8064]">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-24 lg:pt-20">
          <div className="max-w-3xl">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#e7d8ca] bg-white/85 px-4 py-2 text-sm text-[#8b7566] shadow-[0_12px_40px_rgba(219,199,185,0.28)]"
            >
              <Sparkles className="h-4 w-4 text-[#86a27e]" />
              Built for remote support roles
            </motion.div>

            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="mt-6 font-serif text-[clamp(3rem,8vw,5.9rem)] leading-[0.95] text-[#4b3d34]"
            >
              Turn every job post into a targeted application package.
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16 }}
              className="mt-6 max-w-2xl text-lg leading-8 text-[#756658]"
            >
              ApplyPilot helps job seekers generate tailored resumes, write stronger cover letters, inspect AI reasoning,
              and manage the full application workflow in one system.
            </motion.p>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24 }}
              className="mt-10 flex flex-col gap-4 sm:flex-row"
            >
              <Link href="/signup">
                <Button className="h-14 rounded-full bg-[#86a27e] px-8 text-base text-white hover:bg-[#779570]">
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="ghost" className="h-14 rounded-full border border-[#e2d6cb] bg-white/80 px-8 text-base text-[#6e5d50] hover:bg-[#f7f1ea]">
                  Explore plans
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.32 }}
              className="mt-10 flex flex-wrap gap-3"
            >
              {['Role packs', 'Confidence mode', 'Truth lock', 'Tracker'].map((tag) => (
                <span key={tag} className="rounded-full border border-[#eadfd3] bg-white/80 px-4 py-2 text-sm text-[#846f61]">
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.14 }}
            className="relative"
          >
            <div className="relative rounded-[2rem] border border-[#eaded2] bg-white/85 p-5 shadow-[0_30px_80px_rgba(214,195,180,0.28)] backdrop-blur-xl">
              <div className="rounded-[1.75rem] bg-[#fbf5ef] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#a08c7d]">Live workflow</p>
                    <h2 className="mt-2 font-serif text-3xl text-[#524236]">Generate, inspect, and track.</h2>
                  </div>
                  <div className="rounded-full bg-[#e3efdc] px-3 py-1 text-xs text-[#6d8366]">Ready</div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-[1.5rem] border border-[#efe3d7] bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[#5d4f43]">Package completion</p>
                      <span className="text-sm text-[#9c897c]">4 of 4 outputs ready</span>
                    </div>
                    <div className="mt-4 h-4 overflow-hidden rounded-full bg-[#f1ebe4]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.3 }}
                        className="h-full rounded-full bg-[linear-gradient(90deg,#86a27e,#d9c69a)]"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-[1.5rem] border border-[#efe3d7] bg-[#fffaf5] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">Reasoning layer</p>
                      <div className="mt-4 space-y-3 text-sm text-[#6a5a4d]">
                        <div className="rounded-2xl bg-[#f7efe7] px-4 py-3">Confidence mode shows what the resume supports.</div>
                        <div className="rounded-2xl bg-[#e5efdc] px-4 py-3">Truth lock keeps claims tied to source evidence.</div>
                        <div className="rounded-2xl bg-[#efe5f7] px-4 py-3">Interview bridge connects gaps to likely questions.</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.5rem] border border-[#efe3d7] bg-[#fffdf9] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">Match score</p>
                        <div className="mt-4 flex items-center gap-4">
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f2eadf]">
                            <span className="font-serif text-3xl text-[#5a4a3f]">92</span>
                          </div>
                          <div>
                            <p className="font-medium text-[#5d4f43]">Send after a final review</p>
                            <p className="mt-1 text-sm text-[#847364]">High-fit package with visible reasoning.</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-[#efe3d7] bg-[#fff] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">Workflow outputs</p>
                        <div className="mt-4 space-y-3">
                          {['Tailored resume rewrite', 'Targeted cover letter', 'Interview prep', 'Follow-up ready tracker entry'].map((item) => (
                            <div key={item} className="flex items-center gap-3">
                              <CheckCircle2 className="h-4 w-4 text-[#86a27e]" />
                              <span className="text-sm text-[#6d5b4f]">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-6">
              <div className="rounded-[2rem] border border-[#eadfd3] bg-white/80 p-6 shadow-[0_24px_70px_rgba(214,195,180,0.22)]">
                <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">Why it stands out</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {featureCards.map((feature) => (
                    <motion.div
                      key={feature.title}
                      whileHover={reduceMotion ? {} : { y: -5, scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 230, damping: 18 }}
                      className={`${feature.color} rounded-[2rem] border border-[#eadfd3] p-6 shadow-[0_22px_70px_rgba(214,195,180,0.18)]`}
                    >
                      <feature.icon className="h-8 w-8 text-[#8a7463]" />
                      <h3 className="mt-5 font-serif text-3xl leading-tight text-[#55453a]">{feature.title}</h3>
                      <p className="mt-4 text-sm leading-7 text-[#6f6054]">{feature.body}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#eadfd3] bg-[#fffaf4] p-6 shadow-[0_24px_70px_rgba(214,195,180,0.18)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">Target roles</p>
              <h2 className="mt-4 font-serif text-4xl text-[#544439]">Focused on remote support work.</h2>
              <p className="mt-4 text-base leading-8 text-[#746659]">
                ApplyPilot is positioned for the roles that live on organization, responsiveness, accuracy, and written communication.
              </p>

              <div className="mt-8 space-y-4">
                {highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[1.4rem] border border-[#eee0d5] bg-white px-4 py-4">
                    <CheckCircle2 className="mt-1 h-4 w-4 text-[#86a27e]" />
                    <span className="text-sm leading-7 text-[#6c5c50]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-[2.4rem] border border-[#eadfd3] bg-white/80 p-8 shadow-[0_28px_90px_rgba(214,195,180,0.22)] lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">Start here</p>
                <h2 className="mt-4 font-serif text-5xl leading-tight text-[#4f4035]">
                  Build your first package and inspect the reasoning.
                </h2>
              </div>
              <div>
                <p className="text-base leading-8 text-[#6f6054]">
                  Start on the free plan, upload your source resume, choose a role pack, and move the output into the tracker when it is ready.
                </p>
                <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                  <Link href="/signup">
                    <Button className="h-14 rounded-full bg-[#86a27e] px-8 text-base text-white hover:bg-[#779570]">
                      Create account
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button variant="ghost" className="h-14 rounded-full border border-[#e2d6cb] bg-white/90 px-8 text-base text-[#6d5b4f] hover:bg-[#f7f1ea]">
                      Compare plans
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-[#eadfd3]">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[#8a7769] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <p>&copy; {new Date().getFullYear()} ApplyPilot. AI application workflow for remote support roles.</p>
            <div className="flex flex-wrap gap-5">
              <Link href="/terms" className="hover:text-[#5f4d40]">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-[#5f4d40]">
                Privacy Policy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
