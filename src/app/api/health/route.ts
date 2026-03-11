import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

function secureCompareSecret(expected: string, provided: string | null): boolean {
  if (!provided) return false
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)
  if (expectedBuffer.length !== providedBuffer.length) return false
  return timingSafeEqual(expectedBuffer, providedBuffer)
}

export async function GET(request: Request) {
  const startedAt = Date.now()
  const healthSecret = process.env.HEALTHCHECK_SECRET?.trim()
  const requestSecret =
    request.headers.get('x-healthcheck-secret') ||
    request.headers.get('x-health-secret')
  const hasSecret = Boolean(healthSecret)
  const isAuthorized =
    !hasSecret || secureCompareSecret(healthSecret || '', requestSecret)
  const inProduction = process.env.NODE_ENV === 'production'

  if (inProduction && !isAuthorized) {
    return NextResponse.json({ status: 'not_found' }, { status: 404 })
  }

  const requiredEnv = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    GLM_API_URL: Boolean(process.env.GLM_API_URL),
    GLM_API_KEY: Boolean(process.env.GLM_API_KEY),
  }

  const envReady = Object.values(requiredEnv).every(Boolean)
  let supabaseReachable = false

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          },
          cache: 'no-store',
        }
      )
      supabaseReachable = response.ok
    } catch {
      supabaseReachable = false
    }
  }

  const ok = envReady && supabaseReachable
  const status = ok ? 200 : 503

  if (inProduction && !hasSecret) {
    return NextResponse.json(
      {
        status: ok ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - startedAt,
      },
      { status }
    )
  }

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - startedAt,
      checks: {
        env: requiredEnv,
        supabase_auth: supabaseReachable,
      },
    },
    { status }
  )
}
