'use client'

import { createBrowserSupabaseClient } from './client'
import type {
  Resume,
  Application,
  ConfidenceInsight,
  InterviewBridgeItem,
  TruthLockItem,
} from '@/types/database'
import type { User } from '@supabase/supabase-js'

function getDefaultFollowUpAt(status: Application['status']): string | null {
  const next = new Date()

  if (status === 'applied') {
    next.setDate(next.getDate() + 5)
    return next.toISOString()
  }

  if (status === 'interview') {
    next.setDate(next.getDate() + 2)
    return next.toISOString()
  }

  return null
}

async function ensureClientProfileExists(userId: string) {
  const supabase = createBrowserSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== userId) {
    throw new Error('Session expired. Please sign in again.')
  }

  const fullName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : null

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email ?? `${user.id}@no-email.local`,
    full_name: fullName,
  })

  if (error) throw error
}

export async function getClientCurrentUser(): Promise<User | null> {
  const supabase = createBrowserSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  return user
}

export async function getClientResumes(userId: string): Promise<Resume[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('resumes')
    .select('id,user_id,title,content,created_at,updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getClientApplications(userId: string): Promise<Application[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('applications')
    .select('id,user_id,resume_id,company,role,job_description,proposal,tailored_resume,match_score,missing_keywords,interview_questions,template_pack,confidence_insights,truth_lock,interview_bridge,next_follow_up_at,last_status_changed_at,status,created_at,updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getClientDashboardStats(userId: string) {
  const supabase = createBrowserSupabaseClient()

  // Get applications from this week
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: weeklyApps, error: weeklyError } = await supabase
    .from('applications')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', weekAgo.toISOString())

  // Get all applications for average match score
  const { data: allApps, error: allError } = await supabase
    .from('applications')
    .select('match_score')
    .eq('user_id', userId)

  // Get recent applications
  const { data: recentApps, error: recentError } = await supabase
    .from('applications')
    .select('id,user_id,resume_id,company,role,job_description,proposal,tailored_resume,match_score,missing_keywords,interview_questions,template_pack,confidence_insights,truth_lock,interview_bridge,next_follow_up_at,last_status_changed_at,status,created_at,updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get total applications count
  const { count: totalApplications, error: totalError } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (weeklyError || allError || recentError || totalError) {
    throw new Error('Failed to fetch dashboard stats')
  }

  const averageMatchScore =
    allApps && allApps.length > 0
      ? Math.round(
          allApps.reduce((sum, app) => sum + app.match_score, 0) / allApps.length
        )
      : 0

  return {
    applicationsThisWeek: weeklyApps?.length || 0,
    averageMatchScore,
    totalApplications: totalApplications || 0,
    recentApplications: recentApps || [],
  }
}

export async function updateClientApplicationStatus(
  applicationId: string,
  status: Application['status']
): Promise<Application> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('applications')
    .update({
      status,
      next_follow_up_at: getDefaultFollowUpAt(status),
      last_status_changed_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteClientApplication(applicationId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', applicationId)

  if (error) throw error
}

export async function createClientApplication(
  userId: string,
  resumeId: string,
  company: string,
  role: string,
  jobDescription: string,
  proposal: string,
  tailoredResume: string,
  matchScore: number,
  missingKeywords: string[],
  interviewQuestions: string[],
  templatePack: string | null,
  confidenceInsights: ConfidenceInsight[],
  truthLock: TruthLockItem[],
  interviewBridge: InterviewBridgeItem[]
): Promise<Application> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('applications')
    .insert({
      user_id: userId,
      resume_id: resumeId,
      company,
      role,
      job_description: jobDescription,
      proposal,
      tailored_resume: tailoredResume,
      match_score: matchScore,
      missing_keywords: missingKeywords,
      interview_questions: interviewQuestions,
      template_pack: templatePack,
      confidence_insights: confidenceInsights,
      truth_lock: truthLock,
      interview_bridge: interviewBridge,
      status: 'draft',
    })
    .select()
    .single()

  if (!error) return data

  if (error.code === '23503') {
    await ensureClientProfileExists(userId)
    const { data: retryData, error: retryError } = await supabase
      .from('applications')
      .insert({
        user_id: userId,
        resume_id: resumeId,
        company,
        role,
        job_description: jobDescription,
        proposal,
        tailored_resume: tailoredResume,
        match_score: matchScore,
        missing_keywords: missingKeywords,
        interview_questions: interviewQuestions,
        template_pack: templatePack,
        confidence_insights: confidenceInsights,
        truth_lock: truthLock,
        interview_bridge: interviewBridge,
        status: 'draft',
      })
      .select()
      .single()

    if (retryError) throw retryError
    return retryData
  }

  throw error
}

export async function createClientResume(
  userId: string,
  title: string,
  content: string
): Promise<Resume> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('resumes')
    .insert({
      user_id: userId,
      title,
      content,
    })
    .select()
    .single()

  if (!error) return data

  if (error.code === '23503') {
    await ensureClientProfileExists(userId)
    const { data: retryData, error: retryError } = await supabase
      .from('resumes')
      .insert({
        user_id: userId,
        title,
        content,
      })
      .select()
      .single()

    if (retryError) throw retryError
    return retryData
  }

  throw error
}

export async function updateClientResume(
  resumeId: string,
  title: string,
  content: string
): Promise<Resume> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('resumes')
    .update({ title, content })
    .eq('id', resumeId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteClientResume(resumeId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('resumes')
    .delete()
    .eq('id', resumeId)

  if (error) throw error
}
