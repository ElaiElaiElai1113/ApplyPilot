'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Copy,
  FileText,
  Loader2,
  MessageCircleHeart,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { createClientApplication, getClientCurrentUser, getClientResumes } from '@/lib/supabase/client-queries'
import { extractJobPostingFromUrl, generateApplication, type GenerateApplicationResponse } from '@/lib/ai'
import { trackClientEvent } from '@/lib/analytics/client'
import type { Resume } from '@/types/database'

type Step = 1 | 2 | 3

const steps = [
  { id: 1 as Step, title: 'Tell us about the role', body: 'A company name, title, and optional link is enough to begin.' },
  { id: 2 as Step, title: 'Bring in the details', body: 'Choose a resume and paste the job description when you’re ready.' },
  { id: 3 as Step, title: 'Let the AI write gently', body: 'We’ll review what you entered, then build your tailored package.' },
]

function getStrengthCopy(score: number) {
  if (score >= 90) return 'This looks strong and ready for a final review.'
  if (score >= 75) return 'You’re in a good place. A few tweaks could make this even stronger.'
  if (score >= 60) return 'There is a solid foundation here. Let’s tighten a few details together.'
  return 'This is a starting point. We can improve the fit with some gentle adjustments.'
}

export default function GeneratePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImportingUrl, setIsImportingUrl] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [results, setResults] = useState<GenerateApplicationResponse | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [quotaMessage, setQuotaMessage] = useState('')
  const [formData, setFormData] = useState({
    jobUrl: '',
    company: '',
    role: '',
    jobDescription: '',
  })

  useEffect(() => {
    async function loadResumes() {
      try {
        const user = await getClientCurrentUser()
        if (!user) {
          router.push('/login')
          return
        }

        const data = await getClientResumes(user.id)
        setResumes(data)
        if (data.length > 0) {
          setSelectedResumeId(data[0].id)
        }
      } finally {
        setIsLoading(false)
      }
    }

    void loadResumes()
  }, [router])

  const quotaExceeded = quotaMessage.toLowerCase().includes('monthly generation limit reached')
  const selectedResume = useMemo(
    () => resumes.find((resume) => resume.id === selectedResumeId) || null,
    [resumes, selectedResumeId]
  )

  function nextStep() {
    setStep((current) => Math.min(3, current + 1) as Step)
  }

  function previousStep() {
    setStep((current) => Math.max(1, current - 1) as Step)
  }

  async function handleImportFromUrl() {
    if (!formData.jobUrl.trim()) {
      toast({
        title: 'Add a job link first.',
        variant: 'destructive',
      })
      return
    }

    setIsImportingUrl(true)
    try {
      const extracted = await extractJobPostingFromUrl(formData.jobUrl)
      setFormData((prev) => ({
        ...prev,
        company: prev.company.trim() || extracted.company || prev.company,
        role: prev.role.trim() || extracted.role || prev.role,
        jobDescription: extracted.jobDescription,
      }))
      toast({
        title: 'Job details imported',
        description: 'Take a quick look and adjust anything that feels off.',
      })
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Please paste the job description instead.',
        variant: 'destructive',
      })
    } finally {
      setIsImportingUrl(false)
    }
  }

  async function handleGenerate() {
    if (!formData.company.trim() || !formData.role.trim() || !formData.jobDescription.trim() || !selectedResume) {
      toast({
        title: 'We still need a few details.',
        description: 'Please add the role, company, job description, and choose a resume.',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    setQuotaMessage('')
    try {
      const response = await generateApplication({
        company: formData.company,
        role: formData.role,
        jobDescription: formData.jobDescription,
        resumeContent: selectedResume.content,
      })
      setResults(response)
      toast({
        title: 'Your package is ready',
        description: 'Take your time reviewing it.',
      })
      void trackClientEvent('generation_succeeded', {
        match_score: response.match_score,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again later.'
      if (message.toLowerCase().includes('monthly generation limit reached')) {
        setQuotaMessage(message)
      }
      toast({
        title: 'Generation paused',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSaveToTracker() {
    if (!results || !selectedResume) return

    setIsSaving(true)
    try {
      const user = await getClientCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      await createClientApplication(
        user.id,
        selectedResume.id,
        formData.company,
        formData.role,
        formData.jobDescription,
        results.proposal_message,
        results.tailored_resume,
        results.match_score,
        results.missing_keywords,
        results.interview_questions
      )

      toast({
        title: 'Saved to your tracker',
        description: 'Your application is ready whenever you want to revisit it.',
      })
      router.push('/tracker')
    } finally {
      setIsSaving(false)
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: `${label} copied`,
      })
    } catch {
      toast({
        title: 'Copy failed',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Skeleton className="h-[720px] rounded-[2rem]" />
        <Skeleton className="h-[720px] rounded-[2rem]" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[0.95fr_1.05fr]">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
        className="space-y-6"
      >
        <Card className="rounded-[2.2rem] border-[#eadfd3] bg-[#fff9f3] shadow-[0_24px_70px_rgba(214,195,180,0.16)]">
          <CardHeader className="p-7">
            <div className="rounded-full bg-[#eef5e8] px-4 py-2 text-sm text-[#6e8567] w-fit">
              Gentle generation wizard
            </div>
            <CardTitle className="mt-4 font-serif text-5xl text-[#524236]">
              Let&apos;s build this together.
            </CardTitle>
            <CardDescription className="max-w-xl text-base leading-8 text-[#746659]">
              We’ll move in small, clear steps so this part feels manageable and human.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-7 pb-7">
            {steps.map((item) => {
              const active = step === item.id
              const complete = step > item.id

              return (
                <div
                  key={item.id}
                  className={`rounded-[1.7rem] border p-4 transition-colors ${
                    active
                      ? 'border-[#d8cabc] bg-white'
                      : complete
                        ? 'border-[#dbe7d3] bg-[#eef5e8]'
                        : 'border-[#efe3d7] bg-[#fffaf5]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm ${
                        complete ? 'bg-[#86a27e] text-white' : active ? 'bg-[#f3ebe3] text-[#8d7a6d]' : 'bg-[#f5f0ea] text-[#b39f90]'
                      }`}
                    >
                      {complete ? <Check className="h-4 w-4" /> : item.id}
                    </div>
                    <div>
                      <p className="font-medium text-[#5c4c40]">{item.title}</p>
                      <p className="mt-1 text-sm leading-7 text-[#7c6b5e]">{item.body}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="rounded-[2.2rem] border-[#eadfd3] bg-white/85 shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
          <CardContent className="space-y-5 p-7">
            {step === 1 ? (
              <>
                <StepTitle
                  title="Start with the basics"
                  body="A company name and role title already gives the AI a gentle sense of direction."
                />
                <Field label="Job posting link (optional)">
                  <div className="flex gap-3">
                    <Input
                      value={formData.jobUrl}
                      onChange={(event) => setFormData((prev) => ({ ...prev, jobUrl: event.target.value }))}
                      placeholder="Paste a LinkedIn or job board link"
                      className="rounded-[1.4rem] border-[#e3d8cd] bg-[#fffcf8]"
                    />
                    <Button
                      variant="ghost"
                      className="rounded-full border border-[#e2d6cb] bg-[#fffaf5] text-[#6d5b4f] hover:bg-[#f7f1ea]"
                      onClick={handleImportFromUrl}
                      disabled={isImportingUrl}
                    >
                      {isImportingUrl ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing
                        </>
                      ) : (
                        'Import'
                      )}
                    </Button>
                  </div>
                </Field>
                <Field label="Company">
                  <Input
                    value={formData.company}
                    onChange={(event) => setFormData((prev) => ({ ...prev, company: event.target.value }))}
                    placeholder="e.g. Acme VA Agency"
                    className="rounded-[1.4rem] border-[#e3d8cd] bg-[#fffcf8]"
                  />
                </Field>
                <Field label="Role title">
                  <Input
                    value={formData.role}
                    onChange={(event) => setFormData((prev) => ({ ...prev, role: event.target.value }))}
                    placeholder="e.g. Executive Assistant or Virtual Assistant"
                    className="rounded-[1.4rem] border-[#e3d8cd] bg-[#fffcf8]"
                  />
                </Field>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <StepTitle
                  title="Bring in the role details"
                  body="Choose which resume version you want to use, then paste the job description so we can tailor things kindly."
                />
                <Field label="Choose a resume">
                  {resumes.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-[#d8cabc] bg-[#fffaf4] p-5 text-sm text-[#7b6a5d]">
                      Your resume shelf is still empty. Add one in the Resume Vault first.
                    </div>
                  ) : (
                    <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                      <SelectTrigger className="rounded-[1.4rem] border-[#e3d8cd] bg-[#fffcf8]">
                        <SelectValue placeholder="Choose a resume" />
                      </SelectTrigger>
                      <SelectContent>
                        {resumes.map((resume) => (
                          <SelectItem key={resume.id} value={resume.id}>
                            {resume.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>
                <Field label="Job description">
                  <Textarea
                    value={formData.jobDescription}
                    onChange={(event) => setFormData((prev) => ({ ...prev, jobDescription: event.target.value }))}
                    placeholder="Paste the role details right here..."
                    className="min-h-[240px] rounded-[1.8rem] border-[#e3d8cd] bg-[#fffcf8] p-5 text-sm leading-7"
                  />
                </Field>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <StepTitle
                  title="A final friendly review"
                  body="We’ll use the details below to create a tailored cover letter, resume, and supportive strength meter."
                />
                <div className="space-y-4 rounded-[1.8rem] border border-[#efe3d7] bg-[#fffaf5] p-5">
                  <SummaryRow label="Company" value={formData.company || 'Not added yet'} />
                  <SummaryRow label="Role" value={formData.role || 'Not added yet'} />
                  <SummaryRow label="Resume" value={selectedResume?.title || 'No resume selected'} />
                  <SummaryRow
                    label="Job description"
                    value={formData.jobDescription ? `${formData.jobDescription.length} characters added` : 'Not added yet'}
                  />
                </div>
                {quotaExceeded ? (
                  <div className="rounded-[1.7rem] border border-[#f1d8cd] bg-[#fff1eb] p-5">
                    <p className="font-medium text-[#8c5e4d]">You’ve reached this month’s generation allowance.</p>
                    <p className="mt-2 text-sm leading-7 text-[#8c6d5f]">{quotaMessage}</p>
                    <LinkButton href="/pricing" label="View upgrade options" />
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
              <Button
                variant="ghost"
                className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
                onClick={previousStep}
                disabled={step === 1}
              >
                Back
              </Button>

              {step < 3 ? (
                <Button
                  className="rounded-full bg-[#86a27e] px-6 text-white hover:bg-[#779570]"
                  onClick={nextStep}
                >
                  Next step
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="rounded-full bg-[#d98f74] px-6 text-white hover:bg-[#cf8064]"
                  onClick={handleGenerate}
                  disabled={isGenerating || quotaExceeded || resumes.length === 0}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Writing your package...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate softly
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.08 }}
      >
        <Card className="min-h-[720px] rounded-[2.2rem] border-[#eadfd3] bg-white/85 shadow-[0_18px_60px_rgba(214,195,180,0.14)]">
          <CardContent className="h-full p-7">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex h-full min-h-[620px] flex-col items-center justify-center text-center"
                >
                  <div className="relative h-24 w-24">
                    <motion.div
                      className="absolute inset-0 rounded-full bg-[#e5efdc]"
                      animate={{ scale: [1, 1.16, 1], opacity: [0.8, 0.45, 0.8] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                      className="absolute inset-4 rounded-full bg-[#f7e4db]"
                      animate={{ scale: [1, 1.08, 1], opacity: [0.9, 0.55, 0.9] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MessageCircleHeart className="h-9 w-9 text-[#8a7463]" />
                    </div>
                  </div>
                  <h2 className="mt-8 font-serif text-4xl text-[#56463b]">
                    Our AI is thoughtfully writing a tailored letter for you...
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-7 text-[#79695c]">
                    We&apos;re reading the job description, finding your strongest experience, and shaping a warm, professional draft.
                  </p>
                  <div className="mt-6 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#86a27e]" />
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#d9b8a8] [animation-delay:120ms]" />
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#c8b6dd] [animation-delay:240ms]" />
                  </div>
                </motion.div>
              ) : results ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="space-y-6"
                >
                  <div className="rounded-[1.8rem] border border-[#eadfd3] bg-[#fff9f3] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">Strength meter</p>
                        <div className="mt-3 flex items-center gap-4">
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eef5e8]">
                            <span className="font-serif text-3xl text-[#4f6149]">{results.match_score}</span>
                          </div>
                          <div>
                            <p className="font-medium text-[#5c4c40]">{getStrengthCopy(results.match_score)}</p>
                            <p className="mt-1 text-sm text-[#7b6a5d]">This meter is a gentle guide, not a grade.</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="ghost"
                          className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
                          onClick={() => {
                            toast({
                              title: 'Creating a fresh version',
                              description: 'Your current draft will stay visible until the new one is ready.',
                            })
                            void handleGenerate()
                          }}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Re-generate
                        </Button>
                        <Button
                          className="rounded-full bg-[#86a27e] px-6 text-white hover:bg-[#779570]"
                          onClick={handleSaveToTracker}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Save to tracker
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#efe7df]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(8, results.match_score)}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                        className="h-full rounded-full bg-[linear-gradient(90deg,#86a27e,#d9b86c)]"
                      />
                    </div>
                  </div>

                  <ResultSection
                    title="Your tailored cover letter"
                    actionLabel="Copy letter"
                    onAction={() => void copyText(results.proposal_message, 'Cover letter')}
                  >
                    {results.proposal_message}
                  </ResultSection>

                  <ResultSection
                    title="Your refreshed resume"
                    actionLabel="Copy resume"
                    onAction={() => void copyText(results.tailored_resume, 'Tailored resume')}
                  >
                    {results.tailored_resume}
                  </ResultSection>

                  <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                    <Card className="rounded-[2rem] border-[#eadfd3] bg-[#fffdf9]">
                      <CardHeader>
                        <CardTitle className="font-serif text-3xl text-[#56463b]">Helpful nudges</CardTitle>
                        <CardDescription className="text-[#7b6a5d]">
                          These are the areas the job description mentions that could use a little more emphasis.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-3">
                        {results.missing_keywords.length > 0 ? (
                          results.missing_keywords.map((keyword) => (
                            <span key={keyword} className="rounded-full bg-[#efe5f7] px-4 py-2 text-sm text-[#79638a]">
                              {keyword}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm leading-7 text-[#7b6a5d]">Nothing major stands out. Your resume already covers this role nicely.</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] border-[#eadfd3] bg-[#fffdf9]">
                      <CardHeader>
                        <CardTitle className="font-serif text-3xl text-[#56463b]">Interview prep</CardTitle>
                        <CardDescription className="text-[#7b6a5d]">
                          Save these for your next practice session or interview prep block.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {results.interview_questions.map((question, index) => (
                          <div key={question} className="rounded-[1.4rem] border border-[#efe3d7] bg-[#fff9f3] p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">Prompt {index + 1}</p>
                            <p className="mt-2 text-sm leading-7 text-[#6d5d51]">{question}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="flex h-full min-h-[620px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#dbcdbf] bg-[#fffaf4] px-10 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e5efdc] text-[#6d8466]">
                    <Target className="h-7 w-7" />
                  </div>
                  <h2 className="mt-6 font-serif text-4xl text-[#58483d]">Your personalized package will appear here.</h2>
                  <p className="mt-4 max-w-md text-sm leading-7 text-[#7a695c]">
                    Once we generate your draft, you’ll see a gentle strength meter, tailored writing, and easy next steps.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  )
}

function StepTitle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-serif text-3xl text-[#56463b]">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-[#7b6a5d]">{body}</p>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">{label}</span>
      <span className="text-sm text-[#68584d]">{value}</span>
    </div>
  )
}

function ResultSection({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string
  actionLabel: string
  onAction: () => void
  children: string
}) {
  return (
    <Card className="rounded-[2rem] border-[#eadfd3] bg-[#fffdf9]">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="font-serif text-3xl text-[#56463b]">{title}</CardTitle>
          <CardDescription className="text-[#7b6a5d]">
            Review gently, then copy any part you want to refine.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
          onClick={onAction}
        >
          <Copy className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      </CardHeader>
      <CardContent className="rounded-b-[2rem] bg-[#fffaf5] p-6 text-sm leading-8 text-[#66564a] whitespace-pre-wrap">
        {children}
      </CardContent>
    </Card>
  )
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="mt-4 inline-flex rounded-full bg-[#d98f74] px-5 py-3 text-sm text-white transition-colors hover:bg-[#cf8064]"
    >
      {label}
    </a>
  )
}
