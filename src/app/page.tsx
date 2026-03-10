'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  HeartHandshake,
  Layers3,
  Sparkles,
  Stars,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const notes = [
  {
    title: 'Friendly guidance',
    body: 'Every step is written to feel supportive, not intimidating.',
    tone: 'bg-[#f7e4db]',
    rotate: '-rotate-2',
  },
  {
    title: 'Tailored output',
    body: 'Generate cover letters and resumes that still sound like you.',
    tone: 'bg-[#e6eedf]',
    rotate: 'rotate-1',
  },
  {
    title: 'Gentle tracking',
    body: 'Keep your application progress in one soft, organized space.',
    tone: 'bg-[#ede5f7]',
    rotate: '-rotate-1',
  },
]

const featureCards = [
  {
    icon: FileText,
    title: 'Resume vault that feels like a tidy shelf',
    body: 'Save polished versions of your resume without digging through messy folders.',
    color: 'bg-[#fff5ea]',
  },
  {
    icon: Sparkles,
    title: 'AI writing that feels thoughtful',
    body: 'The app guides you through a calm generation flow instead of dumping a wall of fields on you.',
    color: 'bg-[#eef5e8]',
  },
  {
    icon: HeartHandshake,
    title: 'Progress tracking without pressure',
    body: 'See movement, celebrate interviews, and keep your job search grounded.',
    color: 'bg-[#f4eef9]',
  },
]

function FloatingBlob({
  className,
  duration,
}: {
  className: string
  duration: number
}) {
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
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
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
                <p className="text-xs tracking-[0.22em] text-[#9b8777] uppercase">Calm job search companion</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="rounded-full border border-[#e5d9cd] bg-white/70 px-5 text-[#6d5a4c] hover:bg-[#f7f1ea]"
                >
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
              Made for VAs and job seekers who want less stress
            </motion.div>

            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="mt-6 font-serif text-[clamp(3rem,8vw,5.9rem)] leading-[0.95] text-[#4b3d34]"
            >
              A softer way to land your next role.
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16 }}
              className="mt-6 max-w-2xl text-lg leading-8 text-[#756658]"
            >
              ApplyPilot helps you organize resumes, write tailored applications, and gently track every opportunity
              with an interface that feels warm, clear, and deeply approachable.
            </motion.p>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24 }}
              className="mt-10 flex flex-col gap-4 sm:flex-row"
            >
              <Link href="/signup">
                <Button className="h-14 rounded-full bg-[#86a27e] px-8 text-base text-white hover:bg-[#779570]">
                  Start gently
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="ghost"
                  className="h-14 rounded-full border border-[#e2d6cb] bg-white/80 px-8 text-base text-[#6e5d50] hover:bg-[#f7f1ea]"
                >
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
              {['Resume guidance', 'Cover letters', 'Calm tracker', 'Friendly AI'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#eadfd3] bg-white/80 px-4 py-2 text-sm text-[#846f61]"
                >
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
                    <p className="text-xs uppercase tracking-[0.2em] text-[#a08c7d]">Today’s flow</p>
                    <h2 className="mt-2 font-serif text-3xl text-[#524236]">Your next client, one calm step at a time.</h2>
                  </div>
                  <div className="rounded-full bg-[#e3efdc] px-3 py-1 text-xs text-[#6d8366]">
                    Ready
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-[1.5rem] border border-[#efe3d7] bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[#5d4f43]">Gentle application path</p>
                      <span className="text-sm text-[#9c897c]">3 of 4 complete</span>
                    </div>
                    <div className="mt-4 h-4 overflow-hidden rounded-full bg-[#f1ebe4]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '74%' }}
                        transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.3 }}
                        className="h-full rounded-full bg-[linear-gradient(90deg,#86a27e,#d9c69a)]"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-[1.5rem] border border-[#efe3d7] bg-[#fffaf5] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">Live writing</p>
                      <div className="mt-4 space-y-3 text-sm text-[#6a5a4d]">
                        <div className="rounded-2xl bg-[#f7efe7] px-4 py-3">Hello! I&apos;m shaping your letter to sound warm and professional.</div>
                        <div className="rounded-2xl bg-[#e5efdc] px-4 py-3">I found your strongest experience and moved it forward.</div>
                        <div className="flex items-center gap-2 rounded-2xl bg-[#efe5f7] px-4 py-3">
                          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ba8fd8]" />
                          Thoughtfully writing your opening paragraph...
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.5rem] border border-[#efe3d7] bg-[#fffdf9] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">Strength meter</p>
                        <div className="mt-4 flex items-center gap-4">
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f2eadf]">
                            <span className="font-serif text-3xl text-[#5a4a3f]">92</span>
                          </div>
                          <div>
                            <p className="font-medium text-[#5d4f43]">You&apos;re in a strong place</p>
                            <p className="mt-1 text-sm text-[#847364]">A few more keywords and this becomes even stronger.</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-[#efe3d7] bg-[#fff] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">Small wins</p>
                        <div className="mt-4 space-y-3">
                          {['Resume aligned to admin support role', 'Cover letter drafted in your tone', 'Tracker ready when you are'].map((item) => (
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

            <div className="pointer-events-none absolute -left-6 -top-6 rounded-[1.8rem] border border-[#ecdcd0] bg-white/90 px-5 py-4 shadow-[0_18px_50px_rgba(214,195,180,0.24)]">
              <p className="font-serif text-xl text-[#5d4b40]">You don’t have to figure it out alone.</p>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-6">
              <div className="rounded-[2rem] border border-[#eadfd3] bg-white/80 p-6 shadow-[0_24px_70px_rgba(214,195,180,0.22)]">
                <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">Paper notes, not cold panels</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {notes.map((note) => (
                    <motion.div
                      key={note.title}
                      whileHover={reduceMotion ? {} : { y: -4, rotate: 0, scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                      className={`${note.tone} ${note.rotate} rounded-[1.75rem] p-5 shadow-[0_16px_40px_rgba(203,181,165,0.18)]`}
                    >
                      <h3 className="font-serif text-2xl text-[#56453a]">{note.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#6f6054]">{note.body}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr]">
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

            <div className="rounded-[2rem] border border-[#eadfd3] bg-[#fffaf4] p-6 shadow-[0_24px_70px_rgba(214,195,180,0.18)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">What ApplyPilot feels like</p>
              <h2 className="mt-4 font-serif text-4xl text-[#544439]">A gentle companion for a hard season.</h2>
              <p className="mt-4 text-base leading-8 text-[#746659]">
                Searching for work can already feel heavy. This product is designed to soften the workflow with warmth,
                structure, and thoughtful pacing.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  'Friendly words instead of pressure-heavy labels',
                  'Rounded, paper-like layouts instead of rigid dashboards',
                  'Encouraging progress states for every small win',
                ].map((item) => (
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
                <p className="text-xs uppercase tracking-[0.2em] text-[#9c897c]">A calm place to begin</p>
                <h2 className="mt-4 font-serif text-5xl leading-tight text-[#4f4035]">
                  Let&apos;s make the job search feel lighter.
                </h2>
              </div>
              <div>
                <p className="text-base leading-8 text-[#6f6054]">
                  Start with the free plan, bring in your master resume, and let ApplyPilot guide the next few steps with
                  a little more kindness and a lot less friction.
                </p>
                <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                  <Link href="/signup">
                    <Button className="h-14 rounded-full bg-[#86a27e] px-8 text-base text-white hover:bg-[#779570]">
                      Create my account
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button
                      variant="ghost"
                      className="h-14 rounded-full border border-[#e2d6cb] bg-white/90 px-8 text-base text-[#6d5b4f] hover:bg-[#f7f1ea]"
                    >
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
            <p>&copy; {new Date().getFullYear()} ApplyPilot. Made to feel calm, clear, and human.</p>
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
