import { NextResponse } from 'next/server'

export async function GET() {
  const startedAt = Date.now()
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
