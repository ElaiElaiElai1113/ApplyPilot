export type ResumeSection =
  | 'summary'
  | 'experience'
  | 'skills'
  | 'education'
  | 'certifications'
  | 'projects'
  | 'other'

export type EvidenceType = 'bullet' | 'sentence' | 'line'
export type FactCategory = 'ops' | 'communication' | 'process' | 'tools' | 'leadership' | 'technical' | 'general'

export interface ResumeFact {
  id: string
  section: ResumeSection
  text: string
  evidence_type: EvidenceType
  source_span: [number, number]
  category: FactCategory
}

export interface ResumeFactGraph {
  facts: ResumeFact[]
  skills: ResumeFact[]
  experiences: ResumeFact[]
  education: ResumeFact[]
  certifications: ResumeFact[]
}

export type RequirementCategory =
  | 'accuracy'
  | 'sop'
  | 'spreadsheets'
  | 'communication'
  | 'ops'
  | 'reliability'
  | 'tools'
  | 'general'

export interface JobRequirement {
  keyword: string
  priority: number
  category: RequirementCategory
  must_have: boolean
}

export interface ResumeTailorPlan {
  selected_facts: ResumeFact[]
  missing_keywords: string[]
  target_sections: ResumeSection[]
}

export interface RequirementMappingResult {
  matched: Array<{ requirement: JobRequirement; facts: ResumeFact[] }>
  unmatched: JobRequirement[]
  missingKeywords: string[]
  keywordCoverage: number
  evidenceCoverageScore: number
  roleAlignmentScore: number
  riskPenalty: number
  matchScore: number
}

const SECTION_PATTERNS: Array<{ section: ResumeSection; regex: RegExp }> = [
  { section: 'summary', regex: /^(summary|profile|objective)$/i },
  { section: 'experience', regex: /^(experience|work experience|employment history)$/i },
  { section: 'skills', regex: /^(skills|technical skills|core skills)$/i },
  { section: 'education', regex: /^(education)$/i },
  { section: 'certifications', regex: /^(certifications|licenses)$/i },
  { section: 'projects', regex: /^(projects|project experience)$/i },
]

const KEYWORD_LIBRARY: Array<{
  keyword: string
  category: RequirementCategory
  mustHavePhrases: string[]
}> = [
  { keyword: 'attention to detail', category: 'accuracy', mustHavePhrases: ['non-negotiable', 'attention to detail'] },
  { keyword: 'accuracy', category: 'accuracy', mustHavePhrases: ['accuracy matters'] },
  { keyword: 'sop', category: 'sop', mustHavePhrases: ['sop', 'rule-following'] },
  { keyword: 'rule-following', category: 'sop', mustHavePhrases: ['rule-following'] },
  { keyword: 'excel', category: 'spreadsheets', mustHavePhrases: ['excel'] },
  { keyword: 'google sheets', category: 'spreadsheets', mustHavePhrases: ['google sheets'] },
  { keyword: 'spreadsheets', category: 'spreadsheets', mustHavePhrases: ['spreadsheets'] },
  { keyword: 'written english', category: 'communication', mustHavePhrases: ['written english'] },
  { keyword: 'email', category: 'communication', mustHavePhrases: ['email'] },
  { keyword: 'quote', category: 'ops', mustHavePhrases: ['quote'] },
  { keyword: 'pricing', category: 'ops', mustHavePhrases: ['pricing'] },
  { keyword: 'margins', category: 'ops', mustHavePhrases: ['margins'] },
  { keyword: 'data entry', category: 'ops', mustHavePhrases: ['data entry'] },
  { keyword: 'daily summary', category: 'reliability', mustHavePhrases: ['daily work summaries', 'status updates'] },
  { keyword: 'reliability', category: 'reliability', mustHavePhrases: ['reliability', 'stability'] },
  { keyword: 'google workspace', category: 'tools', mustHavePhrases: ['google workspace'] },
]

const ATS_SECTION_ORDER: ResumeSection[] = ['summary', 'experience', 'skills', 'education', 'certifications', 'projects']

function normalizeSection(line: string): ResumeSection {
  const cleaned = line.trim().replace(/:$/, '')
  for (const entry of SECTION_PATTERNS) {
    if (entry.regex.test(cleaned)) return entry.section
  }
  return 'other'
}

function isBullet(line: string): boolean {
  return /^([•●▪◦*-]|\d+\.)\s+/.test(line.trim())
}

function categorizeFact(text: string): FactCategory {
  const lower = text.toLowerCase()
  if (/sop|process|workflow|rule/.test(lower)) return 'process'
  if (/email|communication|draft|report|documentation/.test(lower)) return 'communication'
  if (/manage|organize|coordinate|operations|data entry|tracking/.test(lower)) return 'ops'
  if (/excel|sheet|supabase|react|python|n8n|api|flutter|tool/.test(lower)) return 'tools'
  if (/lead|stakeholder|sprint|agile|manager/.test(lower)) return 'leadership'
  if (/system|architecture|backend|frontend|mobile/.test(lower)) return 'technical'
  return 'general'
}

export function extractResumeFacts(resumeContent: string): ResumeFactGraph {
  const lines = resumeContent.replace(/\r/g, '\n').split('\n')
  const facts: ResumeFact[] = []
  let section: ResumeSection = 'summary'
  let cursor = 0
  let idCounter = 1

  for (const rawLine of lines) {
    const line = rawLine.trim()
    const start = cursor
    cursor += rawLine.length + 1
    if (!line) continue

    const detectedSection = normalizeSection(line)
    if (detectedSection !== 'other' && line.length <= 40) {
      section = detectedSection
      continue
    }

    const fact: ResumeFact = {
      id: `fact_${idCounter++}`,
      section,
      text: line.replace(/^([•●▪◦*-]|\d+\.)\s+/, '').trim(),
      evidence_type: isBullet(line) ? 'bullet' : line.split(' ').length > 10 ? 'sentence' : 'line',
      source_span: [start, start + rawLine.length],
      category: categorizeFact(line),
    }
    facts.push(fact)
  }

  return {
    facts,
    skills: facts.filter((f) => f.section === 'skills' || f.category === 'tools'),
    experiences: facts.filter((f) => f.section === 'experience'),
    education: facts.filter((f) => f.section === 'education'),
    certifications: facts.filter((f) => f.section === 'certifications'),
  }
}

export function extractJobRequirements(jobDescription: string): JobRequirement[] {
  const lower = jobDescription.toLowerCase()
  const reqs: JobRequirement[] = []
  const seen = new Set<string>()

  for (const item of KEYWORD_LIBRARY) {
    const present = lower.includes(item.keyword) || item.mustHavePhrases.some((p) => lower.includes(p))
    if (!present || seen.has(item.keyword)) continue
    const mentions = (lower.match(new RegExp(item.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    const mustHave = item.mustHavePhrases.some((p) => lower.includes(p))
    reqs.push({
      keyword: item.keyword,
      category: item.category,
      must_have: mustHave,
      priority: Math.min(5, Math.max(1, 1 + mentions + (mustHave ? 2 : 0))),
    })
    seen.add(item.keyword)
  }

  return reqs.sort((a, b) => b.priority - a.priority)
}

function matchesRequirement(fact: ResumeFact, requirement: JobRequirement): boolean {
  const lower = fact.text.toLowerCase()
  if (lower.includes(requirement.keyword)) return true

  if (requirement.keyword === 'attention to detail' && /accur|detail|double-check|quality/.test(lower)) return true
  if (requirement.keyword === 'rule-following' && /sop|process|standard|policy/.test(lower)) return true
  if (requirement.keyword === 'written english' && /documentation|communication|draft|report/.test(lower)) return true
  if (requirement.keyword === 'spreadsheets' && /excel|sheet|tracking|data/.test(lower)) return true
  return false
}

export function mapEvidenceToRequirements(
  factGraph: ResumeFactGraph,
  requirements: JobRequirement[]
): RequirementMappingResult {
  const matched: Array<{ requirement: JobRequirement; facts: ResumeFact[] }> = []
  const unmatched: JobRequirement[] = []

  for (const requirement of requirements) {
    const supporting = factGraph.facts.filter((fact) => matchesRequirement(fact, requirement))
    if (supporting.length > 0) matched.push({ requirement, facts: supporting.slice(0, 4) })
    else unmatched.push(requirement)
  }

  const total = requirements.length || 1
  const coverageRatio = matched.length / total
  const keywordCoverage = Math.round(coverageRatio * 100)
  const evidenceCoverageScore = Math.round(coverageRatio * 50)

  const roleSignals = factGraph.facts.filter((fact) =>
    /(virtual assistant|administrative|documentation|operations|data|coordination|sop)/i.test(fact.text)
  ).length
  const roleAlignmentScore = Math.min(25, Math.round(8 + roleSignals * 2))

  const missingMustHaves = unmatched.filter((r) => r.must_have).length
  const riskPenalty = -Math.min(25, missingMustHaves * 8 + Math.max(0, unmatched.length - missingMustHaves))

  const matchScore = Math.max(0, Math.min(100, evidenceCoverageScore + roleAlignmentScore + riskPenalty))

  return {
    matched,
    unmatched,
    missingKeywords: unmatched.map((r) => r.keyword),
    keywordCoverage,
    evidenceCoverageScore,
    roleAlignmentScore,
    riskPenalty,
    matchScore,
  }
}

export function buildTailorPlan(
  factGraph: ResumeFactGraph,
  mapping: RequirementMappingResult
): ResumeTailorPlan {
  const selectedIds = new Set<string>()
  const selected: ResumeFact[] = []

  for (const entry of mapping.matched) {
    for (const fact of entry.facts) {
      if (selectedIds.has(fact.id)) continue
      selectedIds.add(fact.id)
      selected.push(fact)
      if (selected.length >= 24) break
    }
    if (selected.length >= 24) break
  }

  if (selected.length < 12) {
    for (const fact of factGraph.facts) {
      if (selectedIds.has(fact.id)) continue
      selectedIds.add(fact.id)
      selected.push(fact)
      if (selected.length >= 20) break
    }
  }

  return {
    selected_facts: selected,
    missing_keywords: mapping.missingKeywords.slice(0, 20),
    target_sections: ATS_SECTION_ORDER,
  }
}

export interface ResumeRewriteSchema {
  summary: string
  experience_bullets: string[]
  skills: string[]
  keywords_used: string[]
}

export function validateResumeRewriteSchema(value: unknown): ResumeRewriteSchema | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const summary = typeof record.summary === 'string' ? record.summary.trim() : ''
  const experienceBullets = Array.isArray(record.experience_bullets)
    ? record.experience_bullets.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
    : []
  const skills = Array.isArray(record.skills)
    ? record.skills.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
    : []
  const keywordsUsed = Array.isArray(record.keywords_used)
    ? record.keywords_used.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
    : []

  if (!summary || experienceBullets.length === 0) return null
  return { summary, experience_bullets: experienceBullets, skills, keywords_used: keywordsUsed }
}

export function buildDeterministicTailoredResume(
  plan: ResumeTailorPlan,
  factGraph: ResumeFactGraph,
  targetMaxChars: number
): string {
  const summaryFacts = plan.selected_facts
    .filter((f) => f.section === 'summary' || f.category === 'ops' || f.category === 'process')
    .slice(0, 3)
    .map((f) => f.text)
  const experienceFacts = plan.selected_facts
    .filter((f) => f.section === 'experience' || f.category === 'ops' || f.category === 'communication')
    .slice(0, 8)
    .map((f) => `- ${f.text}`)
  const skills = Array.from(
    new Set(
      factGraph.skills
        .map((f) => f.text)
        .flatMap((line) => line.split(/,|•|\||;/))
        .map((v) => v.trim())
        .filter((v) => v.length > 1)
    )
  ).slice(0, 14)

  const lines: string[] = []
  lines.push('SUMMARY')
  lines.push(summaryFacts.join(' '))
  lines.push('')
  lines.push('EXPERIENCE HIGHLIGHTS')
  lines.push(...(experienceFacts.length > 0 ? experienceFacts : ['- Administrative workflow and documentation support.']))
  lines.push('')
  lines.push('SKILLS')
  lines.push(skills.join(', '))
  lines.push('')
  lines.push('EDUCATION')
  for (const fact of factGraph.education.slice(0, 3)) lines.push(`- ${fact.text}`)
  lines.push('')
  lines.push('CERTIFICATIONS')
  for (const fact of factGraph.certifications.slice(0, 3)) lines.push(`- ${fact.text}`)

  let output = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  if (output.length > targetMaxChars) {
    output = output.slice(0, targetMaxChars).replace(/\s+\S*$/, '').trim()
  }
  return output
}

export function validateNoInventedClaims(tailoredResume: string, factGraph: ResumeFactGraph): string[] {
  const source = factGraph.facts.map((f) => f.text.toLowerCase()).join('\n')
  const suspiciousPhrases = [
    'increased revenue',
    'grew by',
    'improved by',
    'reduced by',
    'led a team of',
    'managed budget',
    'certified in',
  ]
  const violations: string[] = []
  for (const phrase of suspiciousPhrases) {
    if (tailoredResume.toLowerCase().includes(phrase) && !source.includes(phrase)) {
      violations.push(phrase)
    }
  }
  return violations
}

export function validateAtsShape(tailoredResume: string): string[] {
  const issues: string[] = []
  const lower = tailoredResume.toLowerCase()
  for (const required of ['summary', 'experience', 'skills']) {
    if (!lower.includes(required)) issues.push(`missing_section_${required}`)
  }
  if (/analyze the request|return only valid json|step 1|constraints:/i.test(lower)) {
    issues.push('meta_analysis_leak')
  }
  const longLines = tailoredResume.split('\n').filter((l) => l.length > 180)
  if (longLines.length > 0) issues.push('line_length_exceeded')
  return issues
}

export function buildResumeRewritePrompt(
  company: string,
  role: string,
  jobDescription: string,
  plan: ResumeTailorPlan
): string {
  const facts = plan.selected_facts.map((f, idx) => `${idx + 1}. [${f.section}] ${f.text}`).join('\n')
  const targetKeywords = plan.missing_keywords.slice(0, 12).join(', ')

  return `Rewrite the resume facts into an ATS 1-page targeted resume for this role.

Role:
- Company: ${company}
- Position: ${role}

Job Description:
${jobDescription.slice(0, 3200)}

Allowed Evidence Facts (DO NOT INVENT NEW CLAIMS):
${facts}

Target Missing Keywords (use only when evidence supports them):
${targetKeywords}

Strict rules:
- Do not introduce any responsibilities, metrics, tools, or certifications not present in the allowed facts.
- Output only valid JSON in this schema:
{
  "summary": "2-3 sentence targeted summary",
  "experience_bullets": ["bullet 1", "bullet 2", "..."],
  "skills": ["skill 1", "skill 2", "..."],
  "keywords_used": ["keyword 1", "keyword 2", "..."]
}
- No markdown, no analysis, no explanations.`
}

export function formatAtsOnePageResume(
  rewrite: ResumeRewriteSchema,
  factGraph: ResumeFactGraph,
  targetMaxChars: number
): string {
  const lines: string[] = []
  lines.push('SUMMARY')
  lines.push(rewrite.summary)
  lines.push('')
  lines.push('EXPERIENCE HIGHLIGHTS')
  for (const bullet of rewrite.experience_bullets.slice(0, 8)) lines.push(`- ${bullet}`)
  lines.push('')
  lines.push('SKILLS')
  lines.push(rewrite.skills.slice(0, 16).join(', '))
  lines.push('')
  lines.push('EDUCATION')
  for (const fact of factGraph.education.slice(0, 3)) lines.push(`- ${fact.text}`)
  lines.push('')
  lines.push('CERTIFICATIONS')
  for (const fact of factGraph.certifications.slice(0, 3)) lines.push(`- ${fact.text}`)
  let output = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  if (output.length > targetMaxChars) {
    output = output.slice(0, targetMaxChars).replace(/\s+\S*$/, '').trim()
  }
  return output
}

