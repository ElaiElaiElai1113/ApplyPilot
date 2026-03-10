'use server'

import { createClient } from './server'
import type {
  Resume,
  Application,
  ConfidenceInsight,
  InterviewBridgeItem,
  TruthLockItem,
} from '@/types/database'

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

export async function getUserResumes(userId: string): Promise<Resume[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createResume(
  userId: string,
  title: string,
  content: string
): Promise<Resume> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resumes')
    .insert({
      user_id: userId,
      title,
      content,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateResume(
  resumeId: string,
  title: string,
  content: string
): Promise<Resume> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resumes')
    .update({ title, content })
    .eq('id', resumeId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteResume(resumeId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('resumes')
    .delete()
    .eq('id', resumeId)

  if (error) throw error
}

export async function getResumeById(resumeId: string): Promise<Resume | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', resumeId)
    .single()

  if (error) throw error
  return data
}

export async function getUserApplications(userId: string): Promise<Application[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createApplication(
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
  const supabase = await createClient()
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

  if (error) throw error
  return data
}

export async function updateApplicationStatus(
  applicationId: string,
  status: Application['status']
): Promise<Application> {
  const supabase = await createClient()
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

export async function deleteApplication(applicationId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', applicationId)

  if (error) throw error
}

export async function getApplicationById(
  applicationId: string
): Promise<Application | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (error) throw error
  return data
}

export async function getDashboardStats(userId: string) {
  const supabase = await createClient()

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
