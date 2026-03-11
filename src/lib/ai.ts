'use server'

import { lookup } from 'node:dns/promises'
import net from 'node:net'
import { createClient } from './supabase/server'
import { logEvent } from './observability'
import { trackServerEvent } from './analytics/server'
import { isRateLimitExceeded } from './rate-limit'
import {
  buildDeterministicTailoredResume,
  buildResumeRewritePrompt,
  buildTailorPlan,
  extractJobRequirements,
  extractResumeFacts,
  formatAtsOnePageResume,
  mapEvidenceToRequirements,
  validateAtsShape,
  validateNoInventedClaims,
  validateResumeRewriteSchema,
} from './resume-pipeline'

export interface GenerateApplicationResponse {
  proposal_message: string
  tailored_resume: string
  match_score: number
  missing_keywords: string[]
  interview_questions: string[]
  confidence_insights: Array<{
    requirement: string
    evidence: string
    action: string
  }>
  truth_lock: Array<{
    claim: string
    evidence: string
  }>
  interview_bridge: Array<{
    question: string
    focus_area: string
    reason: string
  }>
  quality_flags?: string[]
  keyword_coverage?: number
  used_fallback?: boolean
}

export interface GenerateApplicationInput {
  company: string
  role: string
  jobDescription: string
  resumeContent: string
  templatePack?: string
}

const MAX_COMPANY_CHARS = 120
const MAX_ROLE_CHARS = 120
const MAX_JOB_DESCRIPTION_CHARS = 7000
const MAX_RESUME_CHARS = 7000
const DEFAULT_MAX_OUTPUT_TOKENS = 900
const DEFAULT_MONTHLY_LIMIT = 20
const DEFAULT_AI_TIMEOUT_MS = 90000
const MIN_AI_TIMEOUT_MS = 15000
const MAX_AI_TIMEOUT_MS = 180000
const AI_MAX_RETRIES = 2
const AI_RETRY_BASE_DELAY_MS = 1500
const PRIMARY_MODEL = 'glm-4.7'
const FALLBACK_MODEL = 'glm-4.5-air'
const DEFAULT_MODEL_CANDIDATES = [
  'glm-4.7',
  'GLM-4.7',
  'glm-4.5-air',
  'GLM-4.5-air',
  'glm-4.5',
  'GLM-4.5',
  'glm-5',
]
const MODEL_DISCOVERY_TIMEOUT_MS = 8000
let cachedDiscoveredModel: string | null = null
const URL_FETCH_TIMEOUT_MS = 12000
const MAX_HTML_CHARS = 350000
const MAX_EXTRACTED_TEXT_CHARS = 12000
const DEFAULT_RESUME_TARGET_MAX_CHARS = 4200
const DEFAULT_TEMPLATE_PACK = 'general'

class GenerationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = 'GenerationError'
  }
}

function describeProviderFailure(status: number, rawBody: string): { message: string; code: string } {
  let providerMessage = rawBody.trim()
  try {
    const parsed = JSON.parse(rawBody)
    const extracted =
      (typeof parsed?.error?.message === 'string' && parsed.error.message) ||
      (typeof parsed?.message === 'string' && parsed.message) ||
      ''
    if (extracted) {
      providerMessage = extracted
    }
  } catch {
    // Keep raw text fallback.
  }

  const shortProviderMessage = providerMessage.slice(0, 180)

  if (status === 401 || status === 403) {
    return {
      message: 'AI provider authentication failed. Please check GLM API credentials.',
      code: 'provider_auth_failed',
    }
  }

  if (status === 429) {
    const retryAfterMatch = rawBody.match(/retry[^0-9]{0,10}([0-9]{1,4})/i)
    const retryAfterSeconds = retryAfterMatch?.[1]
    return {
      message: retryAfterSeconds
        ? `AI provider rate limit reached. Retry in about ${retryAfterSeconds}s.`
        : 'AI provider rate limit reached. Please retry in a moment.',
      code: 'provider_rate_limited',
    }
  }

  if (status >= 500) {
    return {
      message: 'AI provider is temporarily unavailable. Please try again shortly.',
      code: 'provider_unavailable',
    }
  }

  return {
    message: shortProviderMessage
      ? `AI provider rejected the request: ${shortProviderMessage}`
      : 'AI provider returned an error. Please try again.',
    code: 'provider_error',
  }
}

function isModelNotFoundError(status: number, rawBody: string): boolean {
  if (status < 400 || status >= 500) return false
  const normalized = rawBody.toLowerCase()
  return (
    normalized.includes('模型不存在') ||
    normalized.includes('model not exist') ||
    normalized.includes('model does not exist') ||
    normalized.includes('invalid model')
  )
}

function buildModelCandidates(primaryModel: string, fallbackModel: string): string[] {
  const configured = (process.env.GLM_MODELS ?? '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean)

  return [...new Set([primaryModel, fallbackModel, ...configured, ...DEFAULT_MODEL_CANDIDATES])]
}

function toModelsEndpointUrl(chatCompletionsUrl: string): string {
  if (chatCompletionsUrl.endsWith('/chat/completions')) {
    return chatCompletionsUrl.slice(0, -'/chat/completions'.length) + '/models'
  }
  return chatCompletionsUrl.replace(/\/+$/, '') + '/models'
}

function pickPreferredModel(models: string[]): string | null {
  if (models.length === 0) return null
  for (const preferred of DEFAULT_MODEL_CANDIDATES) {
    if (models.includes(preferred)) return preferred
  }
  return models[0]
}

async function discoverProviderModel(
  glmApiUrl: string,
  glmApiKey: string
): Promise<string | null> {
  if (cachedDiscoveredModel) return cachedDiscoveredModel

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), MODEL_DISCOVERY_TIMEOUT_MS)
  try {
    const response = await fetch(toModelsEndpointUrl(glmApiUrl), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${glmApiKey}`,
      },
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) return null
    const payload = await response.json()
    const rawModels = Array.isArray(payload?.data) ? payload.data : []
    const normalizedModels = rawModels
      .map((entry: unknown) => {
        if (typeof entry === 'string') return entry.trim()
        if (
          entry &&
          typeof entry === 'object' &&
          'id' in entry &&
          typeof (entry as { id: unknown }).id === 'string'
        ) {
          return (entry as { id: string }).id.trim()
        }
        return ''
      })
      .filter(Boolean)

    const picked = pickPreferredModel(normalizedModels)
    if (picked) {
      cachedDiscoveredModel = picked
    }
    return picked
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getRetryAfterMs(response: Response): number | null {
  const retryAfterRaw = response.headers.get('retry-after')
  if (!retryAfterRaw) return null

  const asSeconds = Number.parseInt(retryAfterRaw, 10)
  if (!Number.isNaN(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000
  }

  const asDate = Date.parse(retryAfterRaw)
  if (!Number.isNaN(asDate)) {
    const diff = asDate - Date.now()
    return diff > 0 ? diff : 0
  }

  return null
}

function parseBoundedIntFromEnv(
  rawValue: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (!rawValue) return fallback
  const parsed = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function parseBooleanFromEnv(rawValue: string | undefined, fallback: boolean): boolean {
  if (!rawValue) return fallback
  const normalized = rawValue.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function extractFirstString(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractFirstString(item)
      if (nested) return nested
    }
    return ''
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const preferredKeys = ['text', 'content', 'output_text', 'reasoning_content', 'message']
    for (const key of preferredKeys) {
      const nested = extractFirstString(record[key])
      if (nested) return nested
    }
  }
  return ''
}

function extractProviderContent(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const data = payload as Record<string, unknown>

  const topLevel = extractFirstString(data.output_text)
  if (topLevel) return topLevel

  const choices = data.choices
  if (Array.isArray(choices) && choices.length > 0) {
    const choice = choices[0] as Record<string, unknown>
    const choiceContent =
      extractFirstString(choice?.message) ||
      extractFirstString(choice?.delta) ||
      extractFirstString(choice?.text)
    if (choiceContent) return choiceContent
  }

  const output = data.output
  if (Array.isArray(output) && output.length > 0) {
    const outputContent = extractFirstString(output[0])
    if (outputContent) return outputContent
  }

  return ''
}

function parseLooseJsonObject(content: string): Record<string, unknown> | null {
  const candidates: string[] = []
  const fenced = content.match(/```json\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) candidates.push(fenced[1])

  const firstBrace = content.indexOf('{')
  const lastBrace = content.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(content.slice(firstBrace, lastBrace + 1))
  }

  for (const candidate of candidates) {
    const normalized = candidate
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, '$1')
      .trim()

    try {
      const parsed = JSON.parse(normalized)
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>
      }
    } catch {
      // Keep trying other candidates.
    }
  }

  return null
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/\n|,|;/)
      .map((item) => item.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(Boolean)
  }
  return []
}

function getTemplatePackPrompt(templatePack: string): string {
  switch (templatePack) {
    case 'executive-assistant':
      return 'Prioritize executive support, inbox management, calendar coordination, documentation, and stakeholder communication.'
    case 'customer-support':
      return 'Prioritize customer communication, ticket handling, problem resolution, empathy, speed, and clear written updates.'
    case 'operations':
      return 'Prioritize SOP execution, tracking systems, coordination, spreadsheets, process discipline, and accuracy.'
    case 'lead-generation':
      return 'Prioritize prospect research, list building, CRM hygiene, outreach support, and structured follow-through.'
    case 'admin':
      return 'Prioritize scheduling, data entry, documentation, process support, and reliability.'
    default:
      return 'Use the strongest evidence from the uploaded resume and align it directly to the role requirements.'
  }
}

function buildConfidenceInsights(params: {
  matched: Array<{ requirement: { keyword: string }; facts: Array<{ text: string }> }>
  missingKeywords: string[]
}): GenerateApplicationResponse['confidence_insights'] {
  const matchedInsights = params.matched.slice(0, 3).map((entry) => ({
    requirement: entry.requirement.keyword,
    evidence: entry.facts[0]?.text || 'Relevant experience is present in the uploaded resume.',
    action: `Keep this point visible in the summary or first experience bullets for ${entry.requirement.keyword}.`,
  }))

  const missingInsights = params.missingKeywords.slice(0, 2).map((keyword) => ({
    requirement: keyword,
    evidence: 'This requirement is not clearly supported by the uploaded resume.',
    action: `Only add ${keyword} if you can prove it with real experience, tools, or outcomes.`,
  }))

  return [...matchedInsights, ...missingInsights]
}

function buildTruthLock(
  facts: Array<{ text: string }>
): GenerateApplicationResponse['truth_lock'] {
  return facts.slice(0, 5).map((fact) => ({
    claim: fact.text,
    evidence: fact.text,
  }))
}

function buildInterviewBridge(params: {
  questions: string[]
  missingKeywords: string[]
  matched: Array<{ requirement: { keyword: string }; facts: Array<{ text: string }> }>
}): GenerateApplicationResponse['interview_bridge'] {
  return params.questions.slice(0, 5).map((question, index) => {
    const matchedItem = params.matched[index]
    const missingKeyword = params.missingKeywords[index]

    if (missingKeyword) {
      return {
        question,
        focus_area: missingKeyword,
        reason: `This question is likely because ${missingKeyword} appears in the role but is not strongly evidenced in the resume.`,
      }
    }

    return {
      question,
      focus_area: matchedItem?.requirement.keyword || 'relevant experience',
      reason: matchedItem?.facts[0]?.text || 'This question ties back to the strongest matching experience in the resume.',
    }
  })
}

function extractQuestionsFromText(content: string): string[] {
  const matches = content.match(/[^\n\r?]{8,120}\?/g) || []
  return matches.map((q) => q.trim()).filter(Boolean)
}

function buildStructuredFallback(
  content: string,
  resumeContent: string,
  company: string,
  role: string,
  jobDescription: string,
  templatePack: string
): GenerateApplicationResponse {
  const jdLower = jobDescription.toLowerCase()
  const resumeLower = resumeContent.toLowerCase()
  const scoreMatch = content.match(/\b([1-9]?\d|100)\s*(?:\/\s*100|%)\b/)

  const keywordCandidates = [
    'attention to detail',
    'sop',
    'data entry',
    'pricing',
    'margins',
    'excel',
    'google sheets',
    'written english',
    'email communication',
    'daily summary',
    'rule-following',
    'reliability',
  ]

  const missingKeywords = keywordCandidates
    .filter((keyword) => jdLower.includes(keyword) && !resumeLower.includes(keyword))
    .slice(0, 12)

  let baseScore = scoreMatch ? Number.parseInt(scoreMatch[1], 10) : 68
  if (resumeLower.includes('virtual assistant')) baseScore += 8
  if (resumeLower.includes('documentation')) baseScore += 6
  if (resumeLower.includes('google workspace')) baseScore += 4
  if (missingKeywords.length > 0) baseScore -= Math.min(18, missingKeywords.length * 2)
  const fallbackScore = Math.min(95, Math.max(45, baseScore))

  const questionCandidates = [
    'Tell me about a time you caught a small but critical detail before submitting work.',
    `How do you prioritize the most important requirements for a ${role} role?`,
    `What part of the ${company} opportunity stands out to you most, and why?`,
    'How do you keep quality high when managing repetitive or detail-heavy work?',
    'How do you communicate progress, blockers, and priorities in a structured way?',
    ...extractQuestionsFromText(content),
  ]

  const proposal = [
    `Dear Hiring Manager at ${company},`,
    `I am applying for the ${role} role and would bring a reliable, detail-oriented approach grounded in the experience already reflected in my resume.`,
    `My background aligns with the core requirements for ${company}, and I am especially comfortable translating existing experience into clear, professional execution that supports the team quickly.`,
    'Thank you for your time and consideration. I would welcome the opportunity to discuss how my experience can support your team.',
  ].join('\n\n')

  const tailoredResume = `${resumeContent}

ROLE-ALIGNED HIGHLIGHTS
- Highlights preserved and reordered to better match the ${role} position at ${company}.
- Template pack applied: ${templatePack}.
- Emphasizes transferable experience, relevant tools, and measurable strengths already present in the source resume.
- Keeps wording grounded in existing resume evidence rather than inventing new claims.`

  const interviewQuestions = questionCandidates.slice(0, 10)
  const confidenceInsights = missingKeywords.slice(0, 3).map((keyword) => ({
    requirement: keyword,
    evidence: 'This requirement is referenced in the job description but not strongly reflected in the source resume.',
    action: `Only strengthen ${keyword} if you can support it with real experience.`,
  }))
  const truthLock = resumeContent
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((line) => ({
      claim: line,
      evidence: line,
    }))
  const interviewBridge = interviewQuestions.slice(0, 5).map((question, index) => ({
    question,
    focus_area: missingKeywords[index] || 'relevant experience',
    reason: missingKeywords[index]
      ? `This question helps you close the gap around ${missingKeywords[index]}.`
      : 'This question is grounded in the most relevant experience from your resume.',
  }))

  return {
    proposal_message: proposal,
    tailored_resume: tailoredResume,
    match_score: Math.min(100, Math.max(0, fallbackScore)),
    missing_keywords: missingKeywords,
    interview_questions: interviewQuestions,
    confidence_insights: confidenceInsights,
    truth_lock: truthLock,
    interview_bridge: interviewBridge,
  }
}

function looksLikeMetaAnalysis(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('analyze the request') ||
    lower.includes('output:') ||
    lower.includes('constraints:') ||
    lower.includes('step 1') ||
    lower.includes('return only valid json')
  )
}

interface ModelCallResult {
  content: string
  model: string
}

async function callModelForContent(params: {
  glmApiUrl: string
  glmApiKey: string
  modelCandidates: string[]
  aiTimeoutMs: number
  maxOutputTokens: number
  systemPrompt: string
  userPrompt: string
  temperature?: number
  userIdForLogs: string
}): Promise<ModelCallResult> {
  const {
    glmApiUrl,
    glmApiKey,
    modelCandidates,
    aiTimeoutMs,
    maxOutputTokens,
    systemPrompt,
    userPrompt,
    temperature = 0.4,
    userIdForLogs,
  } = params

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), aiTimeoutMs)
  let response: Response | null = null
  let selectedModel = modelCandidates[0]
  let selectedModelIndex = 0
  let retryCountForCurrentModel = 0
  let lastErrorBody = ''
  let lastErrorStatus = 0
  let seenModelNotFound = false

  try {
    const payloadBase = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxOutputTokens,
    }

    const maxAttempts = modelCandidates.length * (AI_MAX_RETRIES + 1)
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      response = await fetch(glmApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${glmApiKey}`,
        },
        body: JSON.stringify({
          ...payloadBase,
          model: selectedModel,
        }),
        signal: controller.signal,
      })

      if (response.ok) break

      const errorBody = await response.text()
      lastErrorBody = errorBody
      lastErrorStatus = response.status
      seenModelNotFound = seenModelNotFound || isModelNotFoundError(response.status, errorBody)

      if (isModelNotFoundError(response.status, errorBody) && selectedModelIndex < modelCandidates.length - 1) {
        selectedModelIndex += 1
        selectedModel = modelCandidates[selectedModelIndex]
        retryCountForCurrentModel = 0
        continue
      }

      const canRetryOnSameModel =
        (response.status === 429 || response.status >= 500) &&
        retryCountForCurrentModel < AI_MAX_RETRIES

      if (!canRetryOnSameModel) {
        if (selectedModelIndex < modelCandidates.length - 1) {
          selectedModelIndex += 1
          selectedModel = modelCandidates[selectedModelIndex]
          retryCountForCurrentModel = 0
          continue
        }
        break
      }

      const retryAfterMs = getRetryAfterMs(response)
      const backoffMs =
        retryAfterMs ??
        AI_RETRY_BASE_DELAY_MS * 2 ** retryCountForCurrentModel + Math.floor(Math.random() * 400)
      retryCountForCurrentModel += 1
      await sleep(backoffMs)
    }

    if ((!response || !response.ok) && seenModelNotFound) {
      const discoveredModel = await discoverProviderModel(glmApiUrl, glmApiKey)
      if (discoveredModel && !modelCandidates.includes(discoveredModel)) {
        selectedModel = discoveredModel
        response = await fetch(glmApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${glmApiKey}`,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature,
            max_tokens: maxOutputTokens,
            model: selectedModel,
          }),
          signal: controller.signal,
        })
        if (!response.ok) {
          lastErrorBody = await response.text()
          lastErrorStatus = response.status
        }
      }
    }

    if (!response) {
      throw new GenerationError('AI provider did not return a response.', 'provider_no_response')
    }

    if (!response.ok) {
      const errorBody = lastErrorBody || (await response.text())
      const status = lastErrorStatus || response.status
      const mapped = describeProviderFailure(status, errorBody)
      const isMissingModelCode = isModelNotFoundError(status, errorBody)
      logEvent('error', 'ai_provider_error', {
        status,
        user_id: userIdForLogs,
        reason_code: mapped.code,
        model: selectedModel,
      })
      console.error('GLM API Error:', {
        status,
        code: mapped.code,
        model: selectedModel,
        body: errorBody.slice(0, 500),
        tried_models: modelCandidates,
      })
      if (isMissingModelCode) {
        throw new GenerationError(
          'No compatible GLM model was found for this API key. Set GLM_MODELS to models available on your account.',
          'provider_model_unavailable'
        )
      }
      throw new GenerationError(mapped.message, mapped.code)
    }

    const data = await response.json()
    const content = extractProviderContent(data)
    if (!content) {
      logEvent('warn', 'ai_empty_response_payload', {
        user_id: userIdForLogs,
        model: selectedModel,
      })
      console.warn('GLM empty content payload preview:', JSON.stringify(data).slice(0, 800))
      throw new GenerationError('AI response was empty. Please try again.', 'empty_response')
    }

    return { content, model: selectedModel }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new GenerationError(
        `Generation timed out after ${Math.round(aiTimeoutMs / 1000)}s. Try again or shorten the job description.`,
        'timeout'
      )
    }
    if (error instanceof GenerationError) throw error
    throw new GenerationError('Generation failed. Please try again.', 'unknown')
  } finally {
    clearTimeout(timeout)
  }
}

export interface ExtractJobPostingResponse {
  role: string
  company: string
  jobDescription: string
  sourceUrl: string
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number.parseInt(part, 10))
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true

  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  if (normalized.startsWith('fe80')) return true
  return false
}

function isHostnameBlocked(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (lower === 'localhost') return true
  if (lower.endsWith('.local')) return true
  return false
}

async function assertSafeRemoteHost(hostname: string): Promise<void> {
  if (isHostnameBlocked(hostname)) {
    throw new GenerationError('Unsafe URL host is not allowed.', 'unsafe_url_host')
  }

  const ipVersion = net.isIP(hostname)
  if (ipVersion === 4 && isPrivateIPv4(hostname)) {
    throw new GenerationError('Private network addresses are not allowed.', 'unsafe_ip')
  }
  if (ipVersion === 6 && isPrivateIPv6(hostname)) {
    throw new GenerationError('Private network addresses are not allowed.', 'unsafe_ip')
  }
  if (ipVersion !== 0) return

  const records = await lookup(hostname, { all: true })
  if (records.length === 0) {
    throw new GenerationError('Could not resolve URL hostname.', 'dns_lookup_failed')
  }

  for (const record of records) {
    if (record.family === 4 && isPrivateIPv4(record.address)) {
      throw new GenerationError('Resolved to private IPv4 address.', 'unsafe_dns_resolution')
    }
    if (record.family === 6 && isPrivateIPv6(record.address)) {
      throw new GenerationError('Resolved to private IPv6 address.', 'unsafe_dns_resolution')
    }
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function stripHtmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')

  const body = withoutScripts.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i)?.[1] ?? withoutScripts
  const withLineBreaks = body.replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|section|article|br)>/gi, '\n')
  const stripped = withLineBreaks.replace(/<[^>]+>/g, ' ')
  return decodeHtmlEntities(stripped).replace(/\r/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function pickLikelyJobDescription(text: string): string {
  const markers = [
    'responsibilities',
    'requirements',
    'qualifications',
    'about the role',
    'job description',
    'what you will do',
  ]
  const lower = text.toLowerCase()
  let start = 0
  for (const marker of markers) {
    const idx = lower.indexOf(marker)
    if (idx !== -1) {
      start = idx
      break
    }
  }
  return text.slice(start, start + MAX_EXTRACTED_TEXT_CHARS).trim()
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!titleMatch) return ''
  return decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim()
}

function parseRoleAndCompanyFromTitle(title: string): { role: string; company: string } {
  const normalized = title.replace(/\s+/g, ' ').trim()
  if (!normalized) return { role: '', company: '' }

  const separators = [' at ', ' - ', ' | ', ' @ ']
  for (const separator of separators) {
    const idx = normalized.toLowerCase().indexOf(separator)
    if (idx > 2) {
      return {
        role: normalized.slice(0, idx).trim(),
        company: normalized.slice(idx + separator.length).trim(),
      }
    }
  }

  return { role: normalized, company: '' }
}

async function fetchWithSafeRedirects(startUrl: URL): Promise<{ finalUrl: string; html: string }> {
  let currentUrl = startUrl
  for (let i = 0; i < 3; i += 1) {
    await assertSafeRemoteHost(currentUrl.hostname)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS)
    const response = await fetch(currentUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ApplyPilotBot/1.0 (+job-description-extractor)',
        Accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location) {
        throw new GenerationError('Redirect location missing.', 'redirect_missing_location')
      }
      currentUrl = new URL(location, currentUrl)
      continue
    }

    if (!response.ok) {
      throw new GenerationError('Failed to fetch job URL.', 'job_url_fetch_failed')
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      throw new GenerationError('URL does not contain HTML content.', 'unsupported_content_type')
    }

    const html = (await response.text()).slice(0, MAX_HTML_CHARS)
    return { finalUrl: currentUrl.toString(), html }
  }

  throw new GenerationError('Too many redirects while fetching URL.', 'too_many_redirects')
}

export async function extractJobPostingFromUrl(urlInput: string): Promise<ExtractJobPostingResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new GenerationError('Please sign in to import job links.', 'unauthorized')
  }

  const urlImportRateLimited = await isRateLimitExceeded({
    supabase,
    table: 'analytics_events',
    userId: user.id,
    windowSeconds: 60,
    maxRequests: 8,
    eventNames: ['job_url_import_succeeded', 'job_url_import_failed'],
  })
  if (urlImportRateLimited) {
    throw new GenerationError(
      'Too many job URL imports in a short time. Please wait a minute and retry.',
      'job_url_rate_limited'
    )
  }

  let parsed: URL
  try {
    parsed = new URL(urlInput.trim())
  } catch {
    throw new GenerationError('Please enter a valid job posting URL.', 'invalid_url')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new GenerationError('Only HTTP/HTTPS job links are allowed.', 'invalid_protocol')
  }

  if (parsed.username || parsed.password) {
    throw new GenerationError('Authenticated URLs are not supported.', 'auth_in_url_not_allowed')
  }

  try {
    const { finalUrl, html } = await fetchWithSafeRedirects(parsed)
    const title = extractTitle(html)
    const text = stripHtmlToText(html)
    const jobDescription = pickLikelyJobDescription(text)

    if (!jobDescription || jobDescription.length < 150) {
      throw new GenerationError(
        'Could not extract enough job details from this URL. Please paste the job description.',
        'insufficient_extracted_content'
      )
    }

    const parsedTitle = parseRoleAndCompanyFromTitle(title)

    logEvent('info', 'job_url_extraction_success', {
      user_id: user.id,
      source_url: finalUrl,
      extracted_length: jobDescription.length,
    })

    void trackServerEvent('job_url_import_succeeded', {
      source_url: finalUrl,
      extracted_length: jobDescription.length,
    })

    return {
      sourceUrl: finalUrl,
      role: parsedTitle.role,
      company: parsedTitle.company,
      jobDescription,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    logEvent('warn', 'job_url_extraction_failed', {
      user_id: user.id,
      source_url: parsed.toString(),
      error: message,
    })

    void trackServerEvent('job_url_import_failed', {
      source_url: parsed.toString(),
      reason: message.slice(0, 250),
    })

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new GenerationError('Fetching the URL timed out. Try again or paste the job description.', 'fetch_timeout')
    }

    if (error instanceof GenerationError) {
      throw error
    }

    throw new GenerationError('Could not import this job link. Please paste the job description.', 'url_import_unknown')
  }
}

async function generateApplicationV2(params: {
  userId: string
  company: string
  role: string
  jobDescription: string
  resumeContent: string
  templatePack: string
  glmApiUrl: string
  glmApiKey: string
  modelCandidates: string[]
  aiTimeoutMs: number
  maxOutputTokens: number
  strictNoInvent: boolean
  resumeTargetMaxChars: number
}): Promise<GenerateApplicationResponse> {
  const {
    userId,
    company,
    role,
    jobDescription,
    resumeContent,
    templatePack,
    glmApiUrl,
    glmApiKey,
    modelCandidates,
    aiTimeoutMs,
    maxOutputTokens,
    strictNoInvent,
    resumeTargetMaxChars,
  } = params

  const qualityFlags: string[] = []
  let usedFallback = false

  logEvent('info', 'resume_v2_started', { user_id: userId })

  const factGraph = extractResumeFacts(resumeContent)
  const requirements = extractJobRequirements(jobDescription)
  const mapping = mapEvidenceToRequirements(factGraph, requirements)
  const tailorPlan = buildTailorPlan(factGraph, mapping)
  const templatePackPrompt = getTemplatePackPrompt(templatePack)

  // Proposal branch (decoupled from resume branch)
  const proposalPrompt = `Write a concise job application message for this role.
- Company: ${company}
- Role: ${role}
- Template pack: ${templatePack}
- Pack guidance: ${templatePackPrompt}
- Tone: professional, reliable, detail-oriented
- Constraints: 3 short paragraphs, no markdown, no analysis
- Must include the word "Precision" in the first line when relevant to the job requirements.

Resume evidence facts:
${tailorPlan.selected_facts.slice(0, 14).map((f) => `- ${f.text}`).join('\n')}`

  let proposalMessage = ''
  try {
    const proposalResult = await callModelForContent({
      glmApiUrl,
      glmApiKey,
      modelCandidates,
      aiTimeoutMs,
      maxOutputTokens: Math.min(700, maxOutputTokens),
      systemPrompt: 'You are a professional job application assistant. Return only final message text.',
      userPrompt: proposalPrompt,
      userIdForLogs: userId,
      temperature: 0.35,
    })
    proposalMessage = proposalResult.content.trim()
  } catch {
    qualityFlags.push('proposal_fallback_used')
    proposalMessage = [
      `Dear Hiring Manager at ${company},`,
      `I am applying for the ${role} role. My experience includes structured, detail-oriented work that can be adapted to the priorities outlined for this position.`,
      `I focus on clear communication, reliable execution, and tailoring my work to the needs of the team and role.`,
      'Thank you for your consideration.',
    ].join('\n\n')
  }

  // Resume tailoring branch
  let tailoredResume = ''
  try {
    const rewritePrompt = `${buildResumeRewritePrompt(company, role, jobDescription, tailorPlan)}

Template Pack Guidance:
${templatePackPrompt}`
    const rewriteResult = await callModelForContent({
      glmApiUrl,
      glmApiKey,
      modelCandidates,
      aiTimeoutMs,
      maxOutputTokens: Math.min(800, maxOutputTokens),
      systemPrompt:
        'You are an ATS resume rewriter. Only use provided evidence. Return valid JSON only, no commentary.',
      userPrompt: rewritePrompt,
      userIdForLogs: userId,
      temperature: 0.2,
    })

    const rewriteJson = parseLooseJsonObject(rewriteResult.content)
    const rewriteSchema = validateResumeRewriteSchema(rewriteJson)
    if (!rewriteSchema) {
      qualityFlags.push('resume_v2_schema_failed')
      logEvent('warn', 'resume_v2_schema_failed', { user_id: userId })
      usedFallback = true
      tailoredResume = buildDeterministicTailoredResume(tailorPlan, factGraph, resumeTargetMaxChars)
    } else {
      tailoredResume = formatAtsOnePageResume(rewriteSchema, factGraph, resumeTargetMaxChars)
    }
  } catch {
    usedFallback = true
    qualityFlags.push('resume_v2_fallback_used')
    logEvent('warn', 'resume_v2_fallback_used', { user_id: userId })
    tailoredResume = buildDeterministicTailoredResume(tailorPlan, factGraph, resumeTargetMaxChars)
  }

  const noInventViolations = strictNoInvent ? validateNoInventedClaims(tailoredResume, factGraph) : []
  if (noInventViolations.length > 0) {
    qualityFlags.push('resume_v2_no_invent_violation')
    logEvent('warn', 'resume_v2_no_invent_violation', {
      user_id: userId,
      violations: noInventViolations.slice(0, 8),
    })
    usedFallback = true
    tailoredResume = buildDeterministicTailoredResume(tailorPlan, factGraph, resumeTargetMaxChars)
  }

  const atsIssues = validateAtsShape(tailoredResume)
  if (atsIssues.length > 0) {
    qualityFlags.push(...atsIssues)
    usedFallback = true
    tailoredResume = buildDeterministicTailoredResume(tailorPlan, factGraph, resumeTargetMaxChars)
  }

  logEvent('info', 'resume_v2_completed', {
    user_id: userId,
    keyword_coverage: mapping.keywordCoverage,
    used_fallback: usedFallback,
    flags: qualityFlags,
  })

  const interviewQuestions = [
    'Tell me about a time you caught an important detail before sending work.',
    'How do you ensure pricing and margin calculations are accurate?',
    'How do you handle SOP-driven repetitive tasks without quality drop?',
    'What is your process for prioritizing and rewriting emails professionally?',
    'How do you structure daily status updates?',
  ]
  const confidenceInsights = buildConfidenceInsights({
    matched: mapping.matched,
    missingKeywords: mapping.missingKeywords,
  })
  const truthLock = buildTruthLock(tailorPlan.selected_facts)
  const interviewBridge = buildInterviewBridge({
    questions: interviewQuestions,
    missingKeywords: mapping.missingKeywords,
    matched: mapping.matched,
  })

  return {
    proposal_message: proposalMessage,
    tailored_resume: tailoredResume,
    match_score: mapping.matchScore,
    missing_keywords: mapping.missingKeywords.slice(0, 20),
    interview_questions: interviewQuestions,
    confidence_insights: confidenceInsights,
    truth_lock: truthLock,
    interview_bridge: interviewBridge,
    quality_flags: Array.from(new Set(qualityFlags)),
    keyword_coverage: mapping.keywordCoverage,
    used_fallback: usedFallback,
  }
}

export async function generateApplication(
  input: GenerateApplicationInput
): Promise<GenerateApplicationResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new GenerationError('Please sign in to generate applications.', 'unauthorized')
  }

  const generationBurstRateLimited = await isRateLimitExceeded({
    supabase,
    table: 'ai_generation_usage',
    userId: user.id,
    windowSeconds: 60,
    maxRequests: 6,
  })
  if (generationBurstRateLimited) {
    throw new GenerationError(
      'Too many generation requests in a short time. Please wait about a minute before retrying.',
      'generation_rate_limited'
    )
  }

  const company = input.company.trim().slice(0, MAX_COMPANY_CHARS)
  const role = input.role.trim().slice(0, MAX_ROLE_CHARS)
  const jobDescription = input.jobDescription.trim().slice(0, MAX_JOB_DESCRIPTION_CHARS)
  const resumeContent = input.resumeContent.trim().slice(0, MAX_RESUME_CHARS)
  const templatePack = (input.templatePack || DEFAULT_TEMPLATE_PACK).trim() || DEFAULT_TEMPLATE_PACK

  if (!company || !role || !jobDescription || !resumeContent) {
    throw new GenerationError('Please complete all required fields.', 'missing_fields')
  }

  const glmApiUrl = process.env.GLM_API_URL?.trim()
  const glmApiKey = process.env.GLM_API_KEY?.trim()
  const primaryModel = process.env.GLM_MODEL?.trim() || PRIMARY_MODEL
  const fallbackModel = process.env.GLM_FALLBACK_MODEL?.trim() || FALLBACK_MODEL
  const modelCandidates = buildModelCandidates(primaryModel, fallbackModel)
  const aiTimeoutMs = parseBoundedIntFromEnv(
    process.env.GLM_TIMEOUT_MS,
    DEFAULT_AI_TIMEOUT_MS,
    MIN_AI_TIMEOUT_MS,
    MAX_AI_TIMEOUT_MS
  )
  const maxOutputTokens = parseBoundedIntFromEnv(
    process.env.GLM_MAX_OUTPUT_TOKENS,
    DEFAULT_MAX_OUTPUT_TOKENS,
    400,
    2500
  )
  const resumePipelineV2Enabled = parseBooleanFromEnv(process.env.RESUME_PIPELINE_V2, true)
  const resumeStrictNoInvent = parseBooleanFromEnv(process.env.RESUME_STRICT_NO_INVENT, true)
  const resumeTargetMaxChars = parseBoundedIntFromEnv(
    process.env.RESUME_TARGET_MAX_CHARS,
    DEFAULT_RESUME_TARGET_MAX_CHARS,
    1800,
    12000
  )
  const resumePipelineShadow = parseBooleanFromEnv(process.env.RESUME_PIPELINE_V2_SHADOW, false)

  if (!glmApiUrl || !glmApiKey) {
    throw new GenerationError(
      'AI provider is not configured. Add GLM_API_URL and GLM_API_KEY.',
      'provider_config_missing'
    )
  }

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const monthlyLimit = Number.parseInt(
    process.env.GENERATION_MONTHLY_LIMIT ?? `${DEFAULT_MONTHLY_LIMIT}`,
    10
  )

  const { count: monthlyGenerations, error: usageReadError } = await supabase
    .from('ai_generation_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'success')
    .gte('created_at', monthStart)

  if (usageReadError) {
    throw new GenerationError(
      'Could not validate usage right now. Please retry in a moment.',
      'usage_check_failed'
    )
  }

  if ((monthlyGenerations ?? 0) >= monthlyLimit) {
    throw new GenerationError(
      'Monthly generation limit reached. Your quota resets next month.',
      'monthly_limit_reached'
    )
  }

  if (resumePipelineV2Enabled || resumePipelineShadow) {
    const v2Result = await generateApplicationV2({
      userId: user.id,
      company,
      role,
      jobDescription,
      resumeContent,
      templatePack,
      glmApiUrl,
      glmApiKey,
      modelCandidates,
      aiTimeoutMs,
      maxOutputTokens,
      strictNoInvent: resumeStrictNoInvent,
      resumeTargetMaxChars,
    })

    if (resumePipelineV2Enabled && !resumePipelineShadow) {
      await supabase.from('ai_generation_usage').insert({
        user_id: user.id,
        model: `${modelCandidates[0]}:resume_v2`,
        status: 'success',
        prompt_chars:
          company.length + role.length + jobDescription.length + resumeContent.length,
        response_chars: (v2Result.proposal_message.length + v2Result.tailored_resume.length),
      })
      return v2Result
    }
  }

  const prompt = `You are an expert job application assistant. Analyze the following resume and job description to create a tailored application package.

Resume:
${resumeContent}

Job Details:
- Company: ${company}
- Role: ${role}
- Job Description: ${jobDescription}

	Please provide a JSON response with the following structure:
	{
	  "proposal_message": "A compelling cover letter/proposal message (3-4 paragraphs)",
	  "tailored_resume": "An optimized version of the resume tailored for this specific role, highlighting relevant experience and skills",
	  "match_score": "A number between 0-100 indicating how well the resume matches the job requirements",
	  "missing_keywords": "Array of important keywords from the job description that are missing or underemphasized in the resume",
	  "interview_questions": "Array of 5-8 likely interview questions based on the job requirements and resume",
	  "confidence_insights": [{"requirement":"", "evidence":"", "action":""}],
	  "truth_lock": [{"claim":"", "evidence":""}],
	  "interview_bridge": [{"question":"", "focus_area":"", "reason":""}]
	}

Important guidelines:
- The proposal should be professional, enthusiastic, and demonstrate understanding of the company and role
- The tailored resume should maintain the original structure but optimize bullet points and descriptions
	- The match score should be realistic and based on actual skill alignment
	- Missing keywords should be specific and actionable
	- Interview questions should be relevant and challenging
	- Template pack to bias toward: ${templatePack}
	- Return ONLY valid JSON, no additional text`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), aiTimeoutMs)

    const payloadBase = {
      messages: [
        {
          role: 'system',
          content: 'You are a professional job application assistant that always responds with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.4,
      max_tokens: maxOutputTokens,
    }
    let response: Response | null = null
    let selectedModel = modelCandidates[0]
    let selectedModelIndex = 0
    let retryCountForCurrentModel = 0
    let lastErrorBody = ''
    let lastErrorStatus = 0
    let seenModelNotFound = false

    try {
      const maxAttempts = modelCandidates.length * (AI_MAX_RETRIES + 1)
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        response = await fetch(glmApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${glmApiKey}`,
          },
          body: JSON.stringify({
            ...payloadBase,
            model: selectedModel,
          }),
          signal: controller.signal,
        })

        if (response.ok) {
          break
        }

        const errorBody = await response.text()
        lastErrorBody = errorBody
        lastErrorStatus = response.status
        seenModelNotFound = seenModelNotFound || isModelNotFoundError(response.status, errorBody)

        if (
          isModelNotFoundError(response.status, errorBody) &&
          selectedModelIndex < modelCandidates.length - 1
        ) {
          selectedModelIndex += 1
          selectedModel = modelCandidates[selectedModelIndex]
          retryCountForCurrentModel = 0
          continue
        }

        const canRetryOnSameModel =
          (response.status === 429 || response.status >= 500) &&
          retryCountForCurrentModel < AI_MAX_RETRIES

        if (!canRetryOnSameModel) {
          // On transient upstream failures, try the next model before failing.
          if (selectedModelIndex < modelCandidates.length - 1) {
            selectedModelIndex += 1
            selectedModel = modelCandidates[selectedModelIndex]
            retryCountForCurrentModel = 0
            continue
          }
          break
        }

        const retryAfterMs = getRetryAfterMs(response)
        const backoffMs =
          retryAfterMs ??
          AI_RETRY_BASE_DELAY_MS * 2 ** retryCountForCurrentModel +
            Math.floor(Math.random() * 400)
        retryCountForCurrentModel += 1
        await sleep(backoffMs)
      }

      if ((!response || !response.ok) && seenModelNotFound) {
        const discoveredModel = await discoverProviderModel(glmApiUrl, glmApiKey)
        if (discoveredModel && !modelCandidates.includes(discoveredModel)) {
          selectedModel = discoveredModel
          response = await fetch(glmApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${glmApiKey}`,
            },
            body: JSON.stringify({
              ...payloadBase,
              model: selectedModel,
            }),
            signal: controller.signal,
          })

          if (!response.ok) {
            lastErrorBody = await response.text()
            lastErrorStatus = response.status
          }
        }
      }
    } finally {
      clearTimeout(timeout)
    }

    if (!response) {
      throw new GenerationError('AI provider did not return a response.', 'provider_no_response')
    }

    if (!response.ok) {
      const errorBody = lastErrorBody || (await response.text())
      const status = lastErrorStatus || response.status
      const mapped = describeProviderFailure(status, errorBody)
      const isMissingModelCode = isModelNotFoundError(status, errorBody)
      logEvent('error', 'ai_provider_error', {
        status,
        user_id: user.id,
        reason_code: mapped.code,
        model: selectedModel,
      })
      console.error('GLM API Error:', {
        status,
        code: mapped.code,
        model: selectedModel,
        body: errorBody.slice(0, 500),
        tried_models: modelCandidates,
      })
      if (isMissingModelCode) {
        throw new GenerationError(
          'No compatible GLM model was found for this API key. Set GLM_MODELS to models available on your account.',
          'provider_model_unavailable'
        )
      }
      throw new GenerationError(mapped.message, mapped.code)
    }

    const data = await response.json()
    const content = extractProviderContent(data)

    if (!content) {
      logEvent('warn', 'ai_empty_response_payload', {
        user_id: user.id,
        model: selectedModel,
      })
      console.warn('GLM empty content payload preview:', JSON.stringify(data).slice(0, 800))
      throw new GenerationError('AI response was empty. Please try again.', 'empty_response')
    }

    const jsonResponse = parseLooseJsonObject(content)
    const parsedProposal =
      jsonResponse && typeof jsonResponse.proposal_message === 'string'
        ? jsonResponse.proposal_message
        : ''
    const shouldUseFallback = !jsonResponse || looksLikeMetaAnalysis(parsedProposal)

    if (shouldUseFallback) {
      logEvent('warn', 'ai_non_json_response_fallback', {
        user_id: user.id,
        model: selectedModel,
      })
    }
	    const parsedResult = !shouldUseFallback && jsonResponse
	      ? {
          proposal_message: parsedProposal,
          tailored_resume:
            typeof jsonResponse.tailored_resume === 'string'
              ? jsonResponse.tailored_resume
              : '',
          match_score:
            typeof jsonResponse.match_score === 'number' ||
            typeof jsonResponse.match_score === 'string'
              ? Number(jsonResponse.match_score)
              : 0,
	          missing_keywords: toStringArray(jsonResponse.missing_keywords),
	          interview_questions: toStringArray(jsonResponse.interview_questions),
	          confidence_insights: Array.isArray(jsonResponse.confidence_insights)
	            ? jsonResponse.confidence_insights
	            : [],
	          truth_lock: Array.isArray(jsonResponse.truth_lock)
	            ? jsonResponse.truth_lock
	            : [],
	          interview_bridge: Array.isArray(jsonResponse.interview_bridge)
	            ? jsonResponse.interview_bridge
	            : [],
	        }
      : buildStructuredFallback(content, resumeContent, company, role, jobDescription, templatePack)

    await supabase.from('ai_generation_usage').insert({
      user_id: user.id,
      model: selectedModel,
      status: 'success',
      prompt_chars: prompt.length,
      response_chars: content.length,
    })
    logEvent('info', 'generation_success', {
      user_id: user.id,
      model: selectedModel,
      prompt_chars: prompt.length,
      response_chars: content.length,
    })

    return {
      proposal_message: parsedResult.proposal_message || '',
      tailored_resume: parsedResult.tailored_resume || resumeContent,
      match_score: Math.min(100, Math.max(0, Number(parsedResult.match_score) || 0)),
      missing_keywords: parsedResult.missing_keywords.slice(0, 20),
      interview_questions: parsedResult.interview_questions.slice(0, 10),
      confidence_insights: parsedResult.confidence_insights || [],
      truth_lock: parsedResult.truth_lock || [],
      interview_bridge: parsedResult.interview_bridge || [],
    }
  } catch (error) {
    await supabase.from('ai_generation_usage').insert({
      user_id: user.id,
      model: primaryModel,
      status: 'failed',
      prompt_chars:
        company.length + role.length + jobDescription.length + resumeContent.length,
      error_message: error instanceof Error ? error.message.slice(0, 500) : 'unknown_error',
    })
    logEvent('error', 'generation_failed', {
      user_id: user.id,
      error:
        error instanceof GenerationError
          ? `${error.code}:${error.message}`
          : error instanceof Error
            ? error.message
            : 'unknown',
    })

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new GenerationError(
        `Generation timed out after ${Math.round(aiTimeoutMs / 1000)}s. Try again or shorten the job description.`,
        'timeout'
      )
    }

    if (error instanceof GenerationError) {
      throw error
    }

    console.error('Generation error:', error)
    throw new GenerationError('Generation failed. Please try again.', 'unknown')
  }
}
