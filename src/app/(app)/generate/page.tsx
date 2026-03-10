'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Loader2,
  FileText,
  Sparkles,
  Copy,
  RefreshCw,
  Target,
  MessageSquare,
  ArrowRight,
  Check,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  extractJobPostingFromUrl,
  generateApplication,
  type GenerateApplicationResponse,
} from '@/lib/ai'
import {
  createClientApplication,
  getClientCurrentUser,
  getClientResumes,
} from '@/lib/supabase/client-queries'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import type { Resume } from '@/types/database'
import { getMatchScoreColor } from '@/lib/utils'
import { trackClientEvent } from '@/lib/analytics/client'

type ResultTab = 'proposal' | 'resume' | 'match' | 'interview'

export default function GeneratePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImportingUrl, setIsImportingUrl] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [formData, setFormData] = useState({
    jobUrl: '',
    company: '',
    role: '',
    jobDescription: '',
  })
  const [results, setResults] = useState<GenerateApplicationResponse | null>(null)
  const [activeTab, setActiveTab] = useState<ResultTab>('proposal')

  // Load resumes from Supabase for the current authenticated user
  useEffect(() => {
    async function loadResumes() {
      try {
        const user = await getClientCurrentUser()
        if (!user) {
          toast({
            title: 'Please sign in first',
            variant: 'destructive',
          })
          router.push('/login')
          return
        }

        const data = await getClientResumes(user.id)
        setResumes(data)
        if (data.length > 0) {
          setSelectedResumeId((prev) => prev || data[0].id)
        }
      } catch (error) {
        toast({
          title: 'Failed to load resumes',
          description: 'Please try again',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadResumes()
  }, [router, toast])

  async function handleGenerate() {
    if (!formData.company.trim() || !formData.role.trim() || !formData.jobDescription.trim() || !selectedResumeId) {
      toast({
        title: 'Please fill in all fields',
        description: 'Company, role, job description, and resume are required',
        variant: 'destructive',
      })
      return
    }

    const selectedResume = resumes.find(r => r.id === selectedResumeId)
    if (!selectedResume) {
      toast({
        title: 'Resume not found',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    void trackClientEvent('generation_started', {
      company_length: formData.company.length,
      role_length: formData.role.length,
      job_description_length: formData.jobDescription.length,
    })
    try {
      const response = await generateApplication({
        company: formData.company,
        role: formData.role,
        jobDescription: formData.jobDescription,
        resumeContent: selectedResume.content,
      })

      setResults(response)
      setActiveTab('proposal')

      toast({
        title: 'Application generated!',
        description: 'Review and save your application package',
      })
      void trackClientEvent('generation_succeeded', {
        match_score: response.match_score,
        missing_keywords_count: response.missing_keywords.length,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Please try again later'
      toast({
        title: 'Generation failed',
        description: message,
        variant: 'destructive',
      })
      void trackClientEvent('generation_failed', {
        reason: message,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleImportFromUrl() {
    if (!formData.jobUrl.trim()) {
      toast({
        title: 'Please enter a job URL',
        variant: 'destructive',
      })
      return
    }

    setIsImportingUrl(true)
    void trackClientEvent('job_url_import_started')
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
        description: 'Review the extracted description before generating.',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to import job URL'
      toast({
        title: 'Import failed',
        description: message,
        variant: 'destructive',
      })
      void trackClientEvent('job_url_import_failed', { reason: message })
    } finally {
      setIsImportingUrl(false)
    }
  }

  async function handleSaveToTracker() {
    if (!results) return

    setIsSaving(true)
    try {
      const user = await getClientCurrentUser()
      if (!user) {
        toast({
          title: 'Please sign in first',
          variant: 'destructive',
        })
        router.push('/login')
        return
      }

      const selectedResume = resumes.find(r => r.id === selectedResumeId)
      if (!selectedResume) {
        toast({
          title: 'Resume not found',
          variant: 'destructive',
        })
        return
      }

      await createClientApplication(
        user.id,
        selectedResumeId,
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
        title: 'Application saved!',
        description: 'Your application has been added to the tracker',
      })
      void trackClientEvent('application_saved', {
        company_length: formData.company.length,
        role_length: formData.role.length,
      })

      router.push('/tracker')
    } catch (error) {
      toast({
        title: 'Failed to save',
        description: 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copied to clipboard',
      })
    } catch (error) {
      toast({
        title: 'Failed to copy',
        variant: 'destructive',
      })
    }
  }

  function handleRegenerate() {
    setResults(null)
    handleGenerate()
  }

  return (
    <div className="p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold mb-2">Generate Application</h1>
        <p className="text-muted-foreground">
          Create a tailored application package with AI assistance
        </p>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobUrl">Job Posting URL (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="jobUrl"
                    value={formData.jobUrl}
                    onChange={(e) => setFormData({ ...formData, jobUrl: e.target.value })}
                    placeholder="https://www.linkedin.com/jobs/view/..."
                    disabled={isGenerating || isImportingUrl}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleImportFromUrl}
                    disabled={isGenerating || isImportingUrl}
                  >
                    {isImportingUrl ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Import'
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g., Google"
                  disabled={isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role Title *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Senior Software Engineer"
                  disabled={isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job Description *</Label>
                <Textarea
                  id="jobDescription"
                  value={formData.jobDescription}
                  onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                  placeholder="Paste job description here..."
                  className="min-h-[200px]"
                  disabled={isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resume">Select Resume *</Label>
                {resumes.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                    No resumes found.{' '}
                    <a href="/resumes" className="text-primary hover:underline">
                      Add one to your vault
                    </a>
                  </div>
                ) : (
                  <Select
                    value={selectedResumeId}
                    onValueChange={setSelectedResumeId}
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="resume">
                      <SelectValue placeholder="Select a resume" />
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
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || isImportingUrl || resumes.length === 0}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Application
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {!results ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full"
              >
                <Card className="h-full flex items-center justify-center p-12">
                  <div className="text-center">
                    <Send className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      Ready to Generate
                    </h3>
                    <p className="text-muted-foreground">
                      Fill in the job details and click generate to create your
                      application package
                    </p>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                {/* Match Score Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Target className="h-6 w-6 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Match Score</p>
                          <p className={`text-3xl font-bold ${getMatchScoreColor(results.match_score)}`}>
                            {results.match_score}%
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRegenerate}
                        disabled={isGenerating}
                        title="Regenerate"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ResultTab)}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="proposal">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Proposal
                    </TabsTrigger>
                    <TabsTrigger value="resume">
                      <FileText className="mr-2 h-4 w-4" />
                      Resume
                    </TabsTrigger>
                    <TabsTrigger value="match">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analysis
                    </TabsTrigger>
                    <TabsTrigger value="interview">
                      <Target className="mr-2 h-4 w-4" />
                      Interview
                    </TabsTrigger>
                  </TabsList>

                  {/* Proposal Tab */}
                  <TabsContent value="proposal" className="mt-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Cover Letter</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopy(results.proposal_message)}
                            title="Copy to clipboard"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[400px] overflow-y-auto">
                          {results.proposal_message}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Resume Tab */}
                  <TabsContent value="resume" className="mt-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Tailored Resume</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopy(results.tailored_resume)}
                            title="Copy to clipboard"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[400px] overflow-y-auto">
                          {results.tailored_resume}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Match Tab */}
                  <TabsContent value="match" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Match Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Match Score</span>
                            <span className={`text-2xl font-bold ${getMatchScoreColor(results.match_score)}`}>
                              {results.match_score}%
                            </span>
                          </div>
                        </div>
                        <Progress value={results.match_score} className="h-2" />
                        {results.missing_keywords.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Missing Keywords ({results.missing_keywords.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {results.missing_keywords.map((keyword, i) => (
                                <Badge key={i} variant="outline">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Interview Tab */}
                  <TabsContent value="interview" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Interview Preparation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {results.interview_questions.map((question, i) => (
                            <div
                              key={i}
                              className="flex gap-3 p-3 rounded-lg bg-muted/50"
                            >
                              <Badge className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                                {i + 1}
                              </Badge>
                              <p className="text-sm">{question}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Save Button */}
                  <Button
                    onClick={handleSaveToTracker}
                    disabled={isSaving || !results}
                    size="lg"
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Save to Tracker
                      </>
                    )}
                  </Button>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      )}
    </div>
  )
}
