'use server'

type RateLimitTable = 'ai_generation_usage' | 'analytics_events'

interface RateLimitParams {
  supabase: any
  table: RateLimitTable
  userId: string
  windowSeconds: number
  maxRequests: number
  status?: 'success' | 'failed'
  eventNames?: string[]
}

function getWindowStartIso(windowSeconds: number): string {
  return new Date(Date.now() - windowSeconds * 1000).toISOString()
}

export async function isRateLimitExceeded(params: RateLimitParams): Promise<boolean> {
  const {
    supabase,
    table,
    userId,
    windowSeconds,
    maxRequests,
    status,
    eventNames,
  } = params

  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', getWindowStartIso(windowSeconds))

  if (table === 'ai_generation_usage' && status) {
    query = query.eq('status', status)
  }

  if (table === 'analytics_events' && eventNames && eventNames.length > 0) {
    query = query.in('event_name', eventNames)
  }

  const { count, error } = await query
  if (error) {
    // Fail open on metering read errors to avoid blocking legitimate users.
    return false
  }

  return (count ?? 0) >= maxRequests
}
