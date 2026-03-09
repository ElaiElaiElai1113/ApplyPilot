'use client'

import { createBrowserSupabaseClient } from './client'
import type { Resume, Application } from '@/types/database'
import type { User } from '@supabase/supabase-js'

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
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getClientApplications(userId: string): Promise<Application[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('applications')
    .select('*')
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
    .select('*')
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
    .select('*')
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
    .update({ status })
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
  interviewQuestions: string[]
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
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw error
  return data
}
