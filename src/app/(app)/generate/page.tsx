'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircleHeart,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FullContentModal } from '@/components/full-content-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { trackClientEvent } from '@/lib/analytics/client'
import {
  extractJobPostingFromUrl,
  generateApplication,
  type CoverLetterVariant,
  type ExtractJobPostingResponse,
  type GenerateApplicationResponse,
} from '@/lib/ai'
import { createClientApplication, getClientCurrentUser, getClientResumes } from '@/lib/supabase/client-queries'
import type { GenerationQuality, Resume } from '@/types/database'

type Step = 1 | 2 | 3
type TemplatePack =
  | 'general'
  | 'executive-assistant'
  | 'customer-support'
  | 'operations'
  | 'lead-generation'
  | 'admin'
type WorkModePreference = 'remote' | 'hybrid' | 'onsite' | 'flexible'

const steps = [
  { id: 1 as Step, title: 'Define the role', body: 'Add core role details and optional personalization.' },
  { id: 2 as Step, title: 'Add the source material', body: 'Choose a resume and review imported description.' },
  { id: 3 as Step, title: 'Review and generate', body: 'Confirm inputs, then generate the package.' },
]

const templatePacks: Array<{ value: TemplatePack; label: string; description: string }> = [
  { value: 'general', label: 'General', description: 'Balanced output for any role.' },
  {
    value: 'executive-assistant',
    label: 'Executive Assistant',
    description: 'Bias toward scheduling, inbox management, and executive support.',
  },
  {
    value: 'customer-support',
    label: 'Customer Support',
    description: 'Bias toward customer communication, ticket handling, and resolution.',
  },
  {
    value: 'operations',
    label: 'Operations',
    description: 'Bias toward SOPs, process control, spreadsheets, and accuracy.',
  },
  {
    value: 'lead-generation',
    label: 'Lead Generation',
    description: 'Bias toward prospecting, outreach support, and CRM discipline.',
  },
  { value: 'admin', label: 'Admin', description: 'Bias toward coordination, documentation, and reliability.' },
]

function getStrengthCopy(score: number) {
  if (score >= 90) return 'This is strong and ready for a final review.'
  if (score >= 75) return 'This is competitive. A few targeted edits could improve fit.'
  if (score >= 60) return 'The baseline is solid. Tighten alignment before sending.'
  return 'The fit is still weak. Review the gap areas before applying.'
}

function parseValueBullets(raw: string): string[] {
  return raw
    .split(/\n|•|;|\|/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3)
}

function getVariants(results: GenerateApplicationResponse): CoverLetterVariant[] {
  if (results.cover_letter_variants && results.cover_letter_variants.length > 0) {
    return results.cover_letter_variants
  }
  return [
    {
      id: 'default',
      label: 'Default',
      content: results.proposal_message,
      score: 50,
      reasons: ['Legacy response without variant metadata'],
    },
  ]
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
  const [qualityOverrideAcknowledged, setQualityOverrideAcknowledged] = useState(false)
  const [selectedLetterIndex, setSelectedLetterIndex] = useState(0)
  const [jobImport, setJobImport] = useState<ExtractJobPostingResponse | null>(null)
  const [openModalType, setOpenModalType] = useState<'letter' | 'resume' | null>(null)
  const [formData, setFormData] = useState({
    jobUrl: '',
    company: '',
    role: '',
    jobDescription: '',
    templatePack: 'general' as TemplatePack,
    hiringManagerName: '',
    workModePreference: 'flexible' as WorkModePreference,
    startAvailability: '',
    valuePropositionBullets: '',
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

  const letterVariants = useMemo(() => (results ? getVariants(results) : []), [results])
  const selectedVariant = useMemo(() => {
    if (!results) return null
    return letterVariants[selectedLetterIndex] ?? letterVariants[0] ?? null
  }, [results, letterVariants, selectedLetterIndex])

  const generationQuality = (results?.generation_quality ?? null) as GenerationQuality | null
  const qualityNeedsOverride = Boolean(
    generationQuality &&
      (generationQuality.risk_level === 'medium' || generationQuality.risk_level === 'high') &&
      generationQuality.blocked_by_quality
  )

  function nextStep() {
    setStep((current) => Math.min(3, current + 1) as Step)
  }

  function previousStep() {
    setStep((current) => Math.max(1, current - 1) as Step)
  }

  async function handleImportFromUrl() {
    if (!formData.jobUrl.trim()) {
      toast({ title: 'Add a job link first.', variant: 'destructive' })
      return
    }

    setIsImportingUrl(true)
    try {
      const extracted = await extractJobPostingFromUrl(formData.jobUrl)
      setJobImport(extracted)
      setFormData((prev) => ({
        ...prev,
        company: prev.company.trim() || extracted.company || prev.company,
        role: prev.role.trim() || extracted.role || prev.role,
        jobDescription: extracted.normalizedJobDescription,
      }))
      toast({ title: 'Job details imported', description: 'Review imported metadata and fields before generating.' })
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Paste the job description manually instead.',
        variant: 'destructive',
      })
    } finally {
      setIsImportingUrl(false)
    }
  }

  async function handleGenerate(options?: { letterOnly?: boolean }) {
    const letterOnly = Boolean(options?.letterOnly)
    if (!formData.company.trim() || !formData.role.trim() || !formData.jobDescription.trim() || !selectedResume) {
      toast({
        title: 'Complete the required fields first.',
        description: 'Add the company, role, job description, and source resume.',
        variant: 'destructive',
      })
      return
    }
    if (letterOnly && !results) {
      toast({ title: 'Generate a package first.', variant: 'destructive' })
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
        templatePack: formData.templatePack,
        jobSourceUrl: jobImport?.sourceUrl,
        jobMetadata: jobImport?.metadata,
        hiringManagerName: formData.hiringManagerName.trim() || undefined,
        workModePreference: formData.workModePreference,
        startAvailability: formData.startAvailability.trim() || undefined,
        valuePropositionBullets: parseValueBullets(formData.valuePropositionBullets),
        regenerateCoverLetterOnly: letterOnly,
        existingTailoredResume: letterOnly ? results?.tailored_resume : undefined,
      })

      setResults(response)
      setSelectedLetterIndex(response.cover_letter_selected_index ?? 0)
      setQualityOverrideAcknowledged(false)
      toast({
        title: letterOnly ? 'Cover letter regenerated' : 'Package generated',
        description: letterOnly
          ? 'Two refreshed variants are ready for review.'
          : 'Review score, variants, and full outputs before saving.',
      })
      void trackClientEvent(letterOnly ? 'cover_letter_regenerated_only' : 'generation_succeeded', {
        match_score: response.match_score,
        template_pack: formData.templatePack,
        variant_count: response.cover_letter_variants?.length ?? 0,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again later.'
      if (message.toLowerCase().includes('monthly generation limit reached')) {
        setQuotaMessage(message)
      }
      toast({ title: 'Generation failed', description: message, variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSaveToTracker() {
    if (!results || !selectedResume) return

    if (qualityNeedsOverride && !qualityOverrideAcknowledged) {
      toast({
        title: 'Quality acknowledgment required',
        description: 'Please confirm the quality override checkbox before saving this output.',
        variant: 'destructive',
      })
      void trackClientEvent('quality_gate_blocked_without_override', {
        risk_level: generationQuality?.risk_level ?? 'unknown',
      })
      return
    }

    setIsSaving(true)
    try {
      const user = await getClientCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      const variants = getVariants(results)
      const selectedIndex = Math.min(Math.max(selectedLetterIndex, 0), Math.max(0, variants.length - 1))
      const selectedProposal = variants[selectedIndex]?.content || results.proposal_message
      const qualityPayload: GenerationQuality = {
        used_fallback: generationQuality?.used_fallback ?? Boolean(results.used_fallback),
        quality_flags: generationQuality?.quality_flags ?? results.quality_flags ?? [],
        keyword_coverage: generationQuality?.keyword_coverage ?? results.keyword_coverage ?? 0,
        proposal_scores:
          generationQuality?.proposal_scores ?? variants.map((variant) => ({ id: variant.id, score: variant.score })),
        risk_level: generationQuality?.risk_level ?? 'low',
        blocked_by_quality: generationQuality?.blocked_by_quality ?? false,
        quality_override_acknowledged: qualityOverrideAcknowledged,
      }

      await createClientApplication(
        user.id,
        selectedResume.id,
        formData.company,
        formData.role,
        formData.jobDescription,
        selectedProposal,
        results.tailored_resume,
        results.match_score,
        results.missing_keywords,
        results.interview_questions,
        formData.templatePack,
        jobImport?.sourceUrl ?? null,
        jobImport?.fetchedAt ?? null,
        jobImport?.metadata ?? null,
        variants,
        selectedIndex,
        qualityPayload,
        results.confidence_insights,
        results.truth_lock,
        results.interview_bridge
      )

      if (qualityOverrideAcknowledged) {
        void trackClientEvent('generation_quality_override_used', {
          risk_level: generationQuality?.risk_level ?? 'unknown',
        })
      }

      toast({ title: 'Saved to tracker', description: 'The package is now available in your workflow board.' })
      router.push('/tracker')
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save to tracker right now.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: `${label} copied` })
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  function openFullView(type: 'letter' | 'resume') {
    setOpenModalType(type)
    void trackClientEvent('full_view_opened', { type, surface: 'generate' })
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
    <>
      <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 18 }}
          className="space-y-6"
        >
          <Card className="rounded-[2.2rem] border-[#eadfd3] bg-[#fff9f3] shadow-[0_24px_70px_rgba(214,195,180,0.16)]">
            <CardHeader className="p-7">
              <div className="w-fit rounded-full bg-[#eef5e8] px-4 py-2 text-sm text-[#6e8567]">Application generator</div>
              <CardTitle className="mt-4 font-serif text-5xl text-[#524236]">Build a targeted application package.</CardTitle>
              <CardDescription className="max-w-xl text-base leading-8 text-[#746659]">
                Import the role, choose a resume, and generate grounded outputs with traceable metadata.
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
                          complete
                            ? 'bg-[#86a27e] text-white'
                            : active
                              ? 'bg-[#f3ebe3] text-[#8d7a6d]'
                              : 'bg-[#f5f0ea] text-[#b39f90]'
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
                  <StepTitle title="Start with the role" body="Add role info, personalization, and optional URL import." />
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
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing
                          </>
                        ) : (
                          'Import'
                        )}
                      </Button>
                    </div>
                  </Field>

                  {jobImport ? (
                    <div className="rounded-[1.4rem] border border-[#eadfd3] bg-[#fffaf5] p-4">
                      <div className="flex items-center gap-2 text-sm text-[#6d5b4f]">
                        <ExternalLink className="h-4 w-4" />
                        <a className="underline" href={jobImport.sourceUrl} target="_blank" rel="noreferrer">
                          Imported source
                        </a>
                        <span className="text-[#9d897a]">{new Date(jobImport.fetchedAt).toLocaleString()}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {jobImport.metadata.work_mode && (
                          <MetaChip label={`Mode: ${jobImport.metadata.work_mode}`} confidence={jobImport.metadata.confidence.work_mode} />
                        )}
                        {jobImport.metadata.employment_type && (
                          <MetaChip
                            label={`Type: ${jobImport.metadata.employment_type}`}
                            confidence={jobImport.metadata.confidence.employment_type}
                          />
                        )}
                        {jobImport.metadata.seniority && (
                          <MetaChip label={`Seniority: ${jobImport.metadata.seniority}`} confidence={jobImport.metadata.confidence.seniority} />
                        )}
                        {jobImport.metadata.location && (
                          <MetaChip label={`Location: ${jobImport.metadata.location}`} confidence={jobImport.metadata.confidence.location} />
                        )}
                        {jobImport.metadata.required_skills.slice(0, 4).map((skill) => (
                          <MetaChip key={skill} label={skill} confidence={jobImport.metadata.confidence.required_skills} />
                        ))}
                      </div>
                    </div>
                  ) : null}

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
                      placeholder="e.g. Executive Assistant"
                      className="rounded-[1.4rem] border-[#e3d8cd] bg-[#fffcf8]"
                    />
                  </Field>
                  <Field label="Hiring manager (optional)">
                    <Input
                      value={formData.hiringManagerName}
                      onChange={(event) => setFormData((prev) => ({ ...prev, hiringManagerName: event.target.value }))}
                      placeholder="e.g. Sarah Patel"
                      className="rounded-[1.4rem] border-[#e3d8cd] bg-[#fffcf8]"
                    />
                  </Field>
                  <Field label="Work mode preference">
                    <Select
                      value={formData.workModePreference}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, workModePreference: value as WorkModePreference }))
                      }
                    >
                      <SelectTrigger className="rounded-[1.4rem] border-[#e3d8cd] bg-[#fffcf8]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flexible">Flexible</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="onsite">Onsite</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Start availability (optional)">
                    <Input
                      value={formData.startAvailability}
                      onChange={(event) => setFormData((prev) => ({ ...prev, startAvailability: event.target.value }))}
                      placeholder="e.g. Immediately / 2 weeks notice"
                      className="rounded-[1.4rem] border-[#e3d8cd] bg-[#fffcf8]"
                    />
                  </Field>
                  <Field label="Top value bullets (max 3)">
                    <Textarea
                      value={formData.valuePropositionBullets}
                      onChange={(event) => setFormData((prev) => ({ ...prev, valuePropositionBullets: event.target.value }))}
                      placeholder="One bullet per line"
                      className="min-h-[96px] rounded-[1.4rem] border-[#e3d8cd] bg-[#fffcf8] p-4 text-sm leading-7"
                    />
                  </Field>
                  <Field label="Role pack">
                    <Select
                      value={formData.templatePack}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, templatePack: value as TemplatePack }))}
                    >
                      <SelectTrigger className="rounded-[1.4rem] border-[#e3d8cd] bg-[#fffcf8]">
                        <SelectValue placeholder="Choose a pack" />
                      </SelectTrigger>
                      <SelectContent>
                        {templatePacks.map((pack) => (
                          <SelectItem key={pack.value} value={pack.value}>
                            {pack.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs leading-6 text-[#8b786a]">
                      {templatePacks.find((pack) => pack.value === formData.templatePack)?.description}
                    </p>
                  </Field>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <StepTitle
                    title="Add the source material"
                    body="Choose the source resume, then review or edit the imported job description."
                  />
                  <Field label="Choose a resume">
                    {resumes.length === 0 ? (
                      <div className="rounded-[1.5rem] border border-dashed border-[#d8cabc] bg-[#fffaf4] p-5 text-sm text-[#7b6a5d]">
                        Your resume vault is empty. Add one before generating.
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
                      placeholder="Paste the role details here"
                      className="min-h-[240px] rounded-[1.8rem] border-[#e3d8cd] bg-[#fffcf8] p-5 text-sm leading-7"
                    />
                  </Field>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <StepTitle title="Review before generation" body="Confirm the inputs below before creating the tailored package." />
                  <div className="space-y-4 rounded-[1.8rem] border border-[#efe3d7] bg-[#fffaf5] p-5">
                    <SummaryRow label="Company" value={formData.company || 'Not added yet'} />
                    <SummaryRow label="Role" value={formData.role || 'Not added yet'} />
                    <SummaryRow
                      label="Role pack"
                      value={templatePacks.find((pack) => pack.value === formData.templatePack)?.label || 'General'}
                    />
                    <SummaryRow label="Resume" value={selectedResume?.title || 'No resume selected'} />
                    <SummaryRow label="Hiring manager" value={formData.hiringManagerName || 'Not provided'} />
                    <SummaryRow label="Work mode pref" value={formData.workModePreference} />
                    <SummaryRow label="Start availability" value={formData.startAvailability || 'Not provided'} />
                    <SummaryRow
                      label="Value bullets"
                      value={parseValueBullets(formData.valuePropositionBullets).length.toString()}
                    />
                    <SummaryRow
                      label="Job description"
                      value={formData.jobDescription ? `${formData.jobDescription.length} characters added` : 'Not added yet'}
                    />
                  </div>
                  {quotaExceeded ? (
                    <div className="rounded-[1.7rem] border border-[#f1d8cd] bg-[#fff1eb] p-5">
                      <p className="font-medium text-[#8c5e4d]">Monthly generation limit reached.</p>
                      <p className="mt-2 text-sm leading-7 text-[#8c6d5f]">{quotaMessage}</p>
                      <Link
                        href="/pricing"
                        className="mt-4 inline-flex rounded-full bg-[#d98f74] px-5 py-3 text-sm text-white transition-colors hover:bg-[#cf8064]"
                      >
                        View plans
                      </Link>
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
                  <Button className="rounded-full bg-[#86a27e] px-6 text-white hover:bg-[#779570]" onClick={nextStep}>
                    Next step
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    className="rounded-full bg-[#d98f74] px-6 text-white hover:bg-[#cf8064]"
                    onClick={() => void handleGenerate()}
                    disabled={isGenerating || quotaExceeded || resumes.length === 0}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />Generate package
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
                    <h2 className="mt-8 font-serif text-4xl text-[#56463b]">Generating your tailored package...</h2>
                    <p className="mt-4 max-w-md text-sm leading-7 text-[#79695c]">
                      The system is mapping evidence, generating letter variants, and preparing role-specific outputs.
                    </p>
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
                          <p className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">Match score</p>
                          <div className="mt-3 flex items-center gap-4">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eef5e8]">
                              <span className="font-serif text-3xl text-[#4f6149]">{results.match_score}</span>
                            </div>
                            <div>
                              <p className="font-medium text-[#5c4c40]">{getStrengthCopy(results.match_score)}</p>
                              <p className="mt-1 text-sm text-[#7b6a5d]">Use this score to decide whether to send, revise, or skip.</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="ghost"
                            className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
                            onClick={() => void handleGenerate()}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Re-generate all
                          </Button>
                          <Button
                            variant="ghost"
                            className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
                            onClick={() => void handleGenerate({ letterOnly: true })}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Regenerate letter only
                          </Button>
                          <Button
                            className="rounded-full bg-[#86a27e] px-6 text-white hover:bg-[#779570]"
                            onClick={handleSaveToTracker}
                            disabled={isSaving || (qualityNeedsOverride && !qualityOverrideAcknowledged)}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...
                              </>
                            ) : (
                              <>
                                <Check className="mr-2 h-4 w-4" />Save to tracker
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

                    {qualityNeedsOverride ? (
                      <div className="rounded-[1.7rem] border border-[#f1d8cd] bg-[#fff1eb] p-5">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 text-[#b56f5a]" />
                          <div>
                            <p className="font-medium text-[#8c5e4d]">
                              Quality risk: {generationQuality?.risk_level ?? 'unknown'}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-[#8c6d5f]">
                              This output has quality flags and requires explicit override before saving.
                            </p>
                            {generationQuality?.quality_flags?.length ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {generationQuality.quality_flags.slice(0, 8).map((flag) => (
                                  <span key={flag} className="rounded-full bg-[#f9dfd4] px-3 py-1 text-xs text-[#9e5e4b]">
                                    {flag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[#7b5f52]">
                              <input
                                type="checkbox"
                                checked={qualityOverrideAcknowledged}
                                onChange={(event) => setQualityOverrideAcknowledged(event.target.checked)}
                              />
                              I reviewed the risk and still want to save this version.
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <Card className="rounded-[2rem] border-[#eadfd3] bg-[#fffdf9]">
                      <CardHeader className="space-y-3">
                        <CardTitle className="font-serif text-3xl text-[#56463b]">Tailored cover letter variants</CardTitle>
                        <CardDescription className="text-[#7b6a5d]">
                          Two ranked variants are generated. Selected variant is used for save-to-tracker.
                        </CardDescription>
                        <div className="flex flex-wrap gap-2">
                          {letterVariants.map((variant, index) => {
                            const isSelected = index === selectedLetterIndex
                            return (
                              <button
                                key={`${variant.id}-${index}`}
                                type="button"
                                onClick={() => setSelectedLetterIndex(index)}
                                className={`rounded-full px-4 py-2 text-sm transition ${
                                  isSelected
                                    ? 'bg-[#86a27e] text-white'
                                    : 'border border-[#e2d6cb] bg-white text-[#6d5b4f] hover:bg-[#f7f1ea]'
                                }`}
                              >
                                {variant.label} · {variant.score}
                                {index === (results.cover_letter_selected_index ?? 0) ? ' (Default)' : ''}
                              </button>
                            )
                          })}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {(selectedVariant?.reasons ?? []).map((reason) => (
                            <span key={reason} className="rounded-full bg-[#eef5e8] px-3 py-1 text-xs text-[#6c8265]">
                              {reason}
                            </span>
                          ))}
                        </div>
                        <div className="whitespace-pre-wrap rounded-[1.4rem] bg-[#fff9f3] p-5 text-sm leading-8 text-[#66564a]">
                          {selectedVariant?.content || results.proposal_message}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="ghost"
                            className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
                            onClick={() => void copyText(selectedVariant?.content || results.proposal_message, 'Cover letter')}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy letter
                          </Button>
                          <Button
                            variant="ghost"
                            className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
                            onClick={() => openFullView('letter')}
                          >
                            View full letter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <ResultSection
                      title="Targeted resume rewrite"
                      actionLabel="Copy resume"
                      extraActionLabel="View full resume"
                      onAction={() => void copyText(results.tailored_resume, 'Tailored resume')}
                      onExtraAction={() => openFullView('resume')}
                    >
                      {results.tailored_resume}
                    </ResultSection>

                    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                      <Card className="rounded-[2rem] border-[#eadfd3] bg-[#fffdf9]">
                        <CardHeader>
                          <CardTitle className="font-serif text-3xl text-[#56463b]">Gap areas</CardTitle>
                          <CardDescription className="text-[#7b6a5d]">
                            These are the requirements that still need stronger support.
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
                            <p className="text-sm leading-7 text-[#7b6a5d]">No major keyword gaps detected for this role.</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="rounded-[2rem] border-[#eadfd3] bg-[#fffdf9]">
                        <CardHeader>
                          <CardTitle className="font-serif text-3xl text-[#56463b]">Interview prep</CardTitle>
                          <CardDescription className="text-[#7b6a5d]">
                            Save these questions for interview prep or screening calls.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {results.interview_questions.map((question, index) => (
                            <div key={question} className="rounded-[1.4rem] border border-[#efe3d7] bg-[#fff9f3] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">Question {index + 1}</p>
                              <p className="mt-2 text-sm leading-7 text-[#6d5d51]">{question}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <InsightSection
                        title="Confidence mode"
                        description="See which requirements are already supported and what still needs proof."
                        items={results.confidence_insights}
                        getKey={(item) => `${item.requirement}-${item.evidence}`}
                        renderItem={(item) => (
                          <>
                            <p className="text-xs uppercase tracking-[0.2em] text-[#9d897a]">{item.requirement}</p>
                            <p className="mt-2 text-sm leading-7 text-[#6d5d51]">{item.evidence}</p>
                            <p className="mt-2 text-sm font-medium text-[#8a6a58]">{item.action}</p>
                          </>
                        )}
                      />

                      <InsightSection
                        title="Truth lock"
                        description="Claims below are grounded in the uploaded resume evidence."
                        items={results.truth_lock}
                        getKey={(item) => `${item.claim}-${item.evidence}`}
                        renderItem={(item) => (
                          <>
                            <p className="text-sm leading-7 text-[#6d5d51]">{item.claim}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#9d897a]">Source: {item.evidence}</p>
                          </>
                        )}
                      />
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
                    <h2 className="mt-6 font-serif text-4xl text-[#58483d]">Your package will appear here.</h2>
                    <p className="mt-4 max-w-md text-sm leading-7 text-[#7a695c]">
                      After generation, you will see score, two letter variants, rewrite output, confidence mode, and truth lock.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.section>
      </div>

      <FullContentModal
        title="Tailored Cover Letter"
        content={selectedVariant?.content || results?.proposal_message || ''}
        fileName={`${formData.company || 'application'}-${formData.role || 'role'}-cover-letter`}
        open={openModalType === 'letter'}
        onOpenChange={(open) => setOpenModalType(open ? 'letter' : null)}
      />
      <FullContentModal
        title="Tailored Resume"
        content={results?.tailored_resume || ''}
        fileName={`${formData.company || 'application'}-${formData.role || 'role'}-tailored-resume`}
        open={openModalType === 'resume'}
        onOpenChange={(open) => setOpenModalType(open ? 'resume' : null)}
      />
    </>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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

function MetaChip({ label, confidence }: { label: string; confidence?: number }) {
  const percent = typeof confidence === 'number' ? Math.round(confidence * 100) : null
  return (
    <span className="rounded-full bg-[#eef5e8] px-3 py-1 text-xs text-[#6c8265]">
      {label}
      {percent !== null ? ` (${percent}%)` : ''}
    </span>
  )
}

function ResultSection({
  title,
  actionLabel,
  extraActionLabel,
  onAction,
  onExtraAction,
  children,
}: {
  title: string
  actionLabel: string
  extraActionLabel?: string
  onAction: () => void
  onExtraAction?: () => void
  children: string
}) {
  return (
    <Card className="rounded-[2rem] border-[#eadfd3] bg-[#fffdf9]">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="font-serif text-3xl text-[#56463b]">{title}</CardTitle>
          <CardDescription className="text-[#7b6a5d]">Review it, edit if needed, and copy what you want to use.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
            onClick={onAction}
          >
            <Copy className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
          {extraActionLabel && onExtraAction ? (
            <Button
              variant="ghost"
              className="rounded-full border border-[#e2d6cb] bg-white/90 text-[#6d5b4f] hover:bg-[#f7f1ea]"
              onClick={onExtraAction}
            >
              {extraActionLabel}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="whitespace-pre-wrap rounded-b-[2rem] bg-[#fffaf5] p-6 text-sm leading-8 text-[#66564a]">
        {children}
      </CardContent>
    </Card>
  )
}

function InsightSection<T>({
  title,
  description,
  items,
  renderItem,
  getKey,
}: {
  title: string
  description: string
  items: T[]
  renderItem: (item: T) => React.ReactNode
  getKey: (item: T) => string
}) {
  return (
    <Card className="rounded-[2rem] border-[#eadfd3] bg-[#fffdf9]">
      <CardHeader>
        <CardTitle className="font-serif text-3xl text-[#56463b]">{title}</CardTitle>
        <CardDescription className="text-[#7b6a5d]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={getKey(item)} className="rounded-[1.4rem] border border-[#efe3d7] bg-[#fff9f3] p-4">
              {renderItem(item)}
            </div>
          ))
        ) : (
          <p className="text-sm leading-7 text-[#7b6a5d]">No items generated for this section.</p>
        )}
      </CardContent>
    </Card>
  )
}
