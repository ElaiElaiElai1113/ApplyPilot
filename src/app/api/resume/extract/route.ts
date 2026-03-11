import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/observability'
import { trackServerEvent } from '@/lib/analytics/server'
import { formatResumeText } from '@/lib/resume-format'
import { isRateLimitExceeded } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const MAX_PDF_BYTES = 5 * 1024 * 1024
const MAX_RESUME_TEXT_CHARS = 20000

async function extractPdfTextWithPdfJs(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  })
  const doc = await loadingTask.promise
  const pages: string[] = []

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    const textContent = await page.getTextContent()
    const lines: string[] = []
    let currentLine = ''
    let previousY: number | null = null

    for (const item of textContent.items) {
      if (!item || typeof item !== 'object' || !('str' in item)) {
        continue
      }
      const token = String((item as { str: string }).str ?? '').trim()
      if (!token) continue

      const transform = (item as { transform?: number[] }).transform
      const y = Array.isArray(transform) ? Number(transform[5]) : null

      if (previousY !== null && y !== null && Math.abs(previousY - y) > 2.8) {
        if (currentLine.trim()) lines.push(currentLine.trim())
        currentLine = token
      } else if (!currentLine) {
        currentLine = token
      } else {
        const needsSpace = !/[([{-]$/.test(currentLine) && !/^[,.;:)\]}-]/.test(token)
        currentLine += needsSpace ? ` ${token}` : token
      }

      previousY = y ?? previousY
    }

    if (currentLine.trim()) lines.push(currentLine.trim())
    pages.push(lines.join('\n'))
  }

  await doc.destroy()
  return pages.join('\n\n')
}

async function extractPdfTextWithPdfParse(arrayBuffer: ArrayBuffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: Buffer.from(arrayBuffer) })
  try {
    const parsed = await parser.getText()
    return parsed.text ?? ''
  } finally {
    await parser.destroy().catch(() => {})
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const resumeImportRateLimited = await isRateLimitExceeded({
    supabase,
    table: 'analytics_events',
    userId: user.id,
    windowSeconds: 60,
    maxRequests: 6,
    eventNames: ['resume_pdf_import_succeeded', 'resume_pdf_import_failed'],
  })
  if (resumeImportRateLimited) {
    return NextResponse.json(
      { error: 'Too many PDF imports in a short time. Please wait about a minute and retry.' },
      { status: 429 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing file upload.' },
      { status: 400 }
    )
  }

  const normalizedType = (file.type || '').toLowerCase()
  if (
    normalizedType !== 'application/pdf' &&
    !file.name.toLowerCase().endsWith('.pdf')
  ) {
    return NextResponse.json(
      { error: 'Only PDF files are supported.' },
      { status: 400 }
    )
  }

  if (file.size <= 0 || file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: 'PDF file must be between 1 byte and 5 MB.' },
      { status: 400 }
    )
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    let rawText = ''
    let parserUsed = 'pdfjs'

    try {
      rawText = await extractPdfTextWithPdfJs(arrayBuffer)
    } catch (pdfJsError) {
      parserUsed = 'pdf-parse'
      logEvent('warn', 'resume_pdf_pdfjs_failed_fallback', {
        user_id: user.id,
        filename: file.name,
        error: pdfJsError instanceof Error ? pdfJsError.message : 'unknown',
      })
      rawText = await extractPdfTextWithPdfParse(arrayBuffer)
    }

    const extractedText = formatResumeText(rawText || '')
      .slice(0, MAX_RESUME_TEXT_CHARS)

    if (extractedText.length < 120) {
      return NextResponse.json(
        {
          error:
            'Could not extract enough text from this PDF. Please paste your resume manually.',
        },
        { status: 422 }
      )
    }

    logEvent('info', 'resume_pdf_extracted', {
      user_id: user.id,
      filename: file.name,
      file_size: file.size,
      text_chars: extractedText.length,
      parser: parserUsed,
    })

    void trackServerEvent('resume_pdf_import_succeeded', {
      filename: file.name,
      file_size: file.size,
      text_chars: extractedText.length,
      parser: parserUsed,
    })

    return NextResponse.json({
      title: file.name.replace(/\.pdf$/i, ''),
      content: extractedText,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unknown_error'
    logEvent('warn', 'resume_pdf_extraction_failed', {
      user_id: user.id,
      filename: file.name,
      error: message,
    })

    void trackServerEvent('resume_pdf_import_failed', {
      filename: file.name,
      reason: message.slice(0, 300),
    })

    return NextResponse.json(
      {
        error:
          'Could not extract text from this PDF. If it is scanned/image-based, please paste text manually.',
      },
      { status: 422 }
    )
  }
}
