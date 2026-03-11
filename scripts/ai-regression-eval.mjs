import fs from 'node:fs'
import path from 'node:path'

const fixturePath = path.resolve(process.cwd(), 'scripts/fixtures/ai-regression-cases.json')
const minPassRate = Number.parseFloat(process.env.AI_EVAL_MIN_PASS_RATE || '0.9')

function stripMetaLeakage(text) {
  const lines = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*#`_]/g, '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const blockedPrefixes = [
    'constraint checklist',
    'confidence score',
    'mental sandbox simulation',
    'draft',
    'review and edit',
    'summary',
    'skills',
    'education',
    'certifications',
  ]

  const filtered = lines.filter((line) => {
    const lower = line.toLowerCase()
    if (blockedPrefixes.some((prefix) => lower.startsWith(prefix))) return false
    return true
  })
  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function paragraphCount(text) {
  return text
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean).length
}

function validateCoverLetter(testCase) {
  const normalized = testCase.text.replace(/\r/g, '\n').trim()
  const cleaned = stripMetaLeakage(normalized)
  const failures = []
  const lower = cleaned.toLowerCase()

  const words = wordCount(normalized.replace(/[*#`_]/g, ' '))
  const paragraphs = paragraphCount(normalized)
  if (paragraphs !== testCase.expectedParagraphs) failures.push(`paragraphs=${paragraphs}`)
  if (words < testCase.minWords) failures.push(`words_too_low=${words}`)
  if (words > testCase.maxWords) failures.push(`words_too_high=${words}`)

  for (const token of testCase.shouldContain || []) {
    if (!lower.includes(token.toLowerCase())) failures.push(`missing:${token}`)
  }
  for (const token of testCase.shouldNotContain || []) {
    if (lower.includes(token.toLowerCase())) failures.push(`contains_forbidden:${token}`)
  }

  return failures
}

function validateResume(testCase) {
  const cleaned = stripMetaLeakage(testCase.text.replace(/\r/g, '\n').trim())
  const lower = cleaned.toLowerCase()
  const failures = []
  for (const token of testCase.shouldNotContain || []) {
    if (lower.includes(token.toLowerCase())) failures.push(`contains_forbidden:${token}`)
  }
  if (cleaned.length < 20) failures.push('resume_too_short')
  return failures
}

function main() {
  if (!fs.existsSync(fixturePath)) {
    console.error(`Fixture not found: ${fixturePath}`)
    process.exit(1)
  }

  const cases = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
  let passed = 0
  const results = []

  for (const testCase of cases) {
    const failures =
      testCase.type === 'cover_letter'
        ? validateCoverLetter(testCase)
        : validateResume(testCase)
    const actualPass = failures.length === 0
    const expectedPass = testCase.shouldPass !== false
    const ok = expectedPass ? actualPass : !actualPass
    if (ok) passed += 1
    results.push({ id: testCase.id, ok, failures, expectedPass, actualPass })
  }

  const total = results.length
  const passRate = total === 0 ? 0 : passed / total

  console.log('AI Regression Eval')
  console.log(`Cases: ${total}`)
  console.log(`Passed: ${passed}`)
  console.log(`Pass rate: ${(passRate * 100).toFixed(1)}%`)
  for (const result of results) {
    const expectation = result.expectedPass ? 'expect_pass' : 'expect_fail'
    console.log(
      `- ${result.ok ? 'PASS' : 'FAIL'} ${result.id} [${expectation}]` +
        `${result.failures.length ? ` :: ${result.failures.join(', ')}` : ''}`
    )
  }

  if (passRate < minPassRate) {
    console.error(
      `AI regression threshold failed. pass_rate=${passRate.toFixed(3)} < min=${minPassRate.toFixed(3)}`
    )
    process.exit(1)
  }
}

main()
