'use client'

import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export async function trackClientEvent(
  eventName: string,
  properties: Record<string, unknown> = {}
) {
  try {
    const supabase = createBrowserSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase.from('analytics_events').insert({
      user_id: user.id,
      event_name: eventName,
      properties,
    })

    if (!error) return

    // Self-heal missing profile rows (legacy users created before trigger rollout).
    const fullName =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null

    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email ?? `${user.id}@no-email.local`,
      full_name: fullName,
    })

    await supabase.from('analytics_events').insert({
      user_id: user.id,
      event_name: eventName,
      properties,
    })
  } catch {
    // Analytics should never block product flow.
  }
}
