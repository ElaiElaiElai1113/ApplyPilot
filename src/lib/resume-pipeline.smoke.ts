import {
  buildTailorPlan,
  extractJobRequirements,
  extractResumeFacts,
  mapEvidenceToRequirements,
  validateAtsShape,
} from './resume-pipeline'

const SAMPLE_RESUME = `SUMMARY
Virtual Assistant with experience in admin workflows, data tracking, and documentation.

EXPERIENCE
- Managed administrative workflows and documentation.
- Coordinated vendor and tenant communications.
- Prepared operational reports and status updates.

SKILLS
Excel, Google Sheets, Google Workspace, Email Communication

EDUCATION
BS Information Systems`

const SAMPLE_JD = `Responsibilities include data entry, quote preparation, email management, and SOP adherence.
Non-negotiable: attention to detail, strong written English, spreadsheet comfort (Excel/Google Sheets), and reliability.`

export function runResumePipelineSmokeChecks() {
  const graph = extractResumeFacts(SAMPLE_RESUME)
  if (graph.facts.length < 6) {
    throw new Error('resume_pipeline_smoke: expected facts extraction')
  }

  const reqs = extractJobRequirements(SAMPLE_JD)
  if (reqs.length < 5) {
    throw new Error('resume_pipeline_smoke: expected requirement extraction')
  }

  const mapping = mapEvidenceToRequirements(graph, reqs)
  if (mapping.keywordCoverage < 30) {
    throw new Error('resume_pipeline_smoke: keyword coverage unexpectedly low')
  }

  const plan = buildTailorPlan(graph, mapping)
  if (plan.selected_facts.length < 4) {
    throw new Error('resume_pipeline_smoke: expected selected facts')
  }

  const atsIssues = validateAtsShape(`SUMMARY
Test summary

EXPERIENCE HIGHLIGHTS
- Handled SOP workflows

SKILLS
Excel, Google Sheets`)
  if (atsIssues.includes('meta_analysis_leak')) {
    throw new Error('resume_pipeline_smoke: ATS validator false positive')
  }
}

