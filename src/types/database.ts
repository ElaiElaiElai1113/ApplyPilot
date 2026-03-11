export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      resumes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          user_id: string
          resume_id: string
          company: string
          role: string
          job_description: string
          proposal: string
          tailored_resume: string
          match_score: number
          missing_keywords: string[]
          interview_questions: string[]
          template_pack: string | null
          job_source_url: string | null
          job_fetched_at: string | null
          job_metadata: Json
          cover_letter_variants: Json
          cover_letter_selected_index: number
          generation_quality: Json
          generation_version: string
          confidence_insights: Json
          truth_lock: Json
          interview_bridge: Json
          next_follow_up_at: string | null
          last_status_changed_at: string
          status: 'draft' | 'applied' | 'interview' | 'rejected' | 'offer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resume_id: string
          company: string
          role: string
          job_description: string
          proposal: string
          tailored_resume: string
          match_score: number
          missing_keywords: string[]
          interview_questions: string[]
          template_pack?: string | null
          job_source_url?: string | null
          job_fetched_at?: string | null
          job_metadata?: Json
          cover_letter_variants?: Json
          cover_letter_selected_index?: number
          generation_quality?: Json
          generation_version?: string
          confidence_insights?: Json
          truth_lock?: Json
          interview_bridge?: Json
          next_follow_up_at?: string | null
          last_status_changed_at?: string
          status?: 'draft' | 'applied' | 'interview' | 'rejected' | 'offer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resume_id?: string
          company?: string
          role?: string
          job_description?: string
          proposal?: string
          tailored_resume?: string
          match_score?: number
          missing_keywords?: string[]
          interview_questions?: string[]
          template_pack?: string | null
          job_source_url?: string | null
          job_fetched_at?: string | null
          job_metadata?: Json
          cover_letter_variants?: Json
          cover_letter_selected_index?: number
          generation_quality?: Json
          generation_version?: string
          confidence_insights?: Json
          truth_lock?: Json
          interview_bridge?: Json
          next_follow_up_at?: string | null
          last_status_changed_at?: string
          status?: 'draft' | 'applied' | 'interview' | 'rejected' | 'offer'
          created_at?: string
          updated_at?: string
        }
      }
      ai_generation_usage: {
        Row: {
          id: string
          user_id: string
          model: string
          status: 'success' | 'failed'
          prompt_chars: number
          response_chars: number
          details: Json
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          model: string
          status: 'success' | 'failed'
          prompt_chars?: number
          response_chars?: number
          details?: Json
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          model?: string
          status?: 'success' | 'failed'
          prompt_chars?: number
          response_chars?: number
          details?: Json
          error_message?: string | null
          created_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string
          event_name: string
          properties: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_name: string
          properties?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_name?: string
          properties?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_status: 'draft' | 'applied' | 'interview' | 'rejected' | 'offer'
    }
  }
}

export type Resume = Database['public']['Tables']['resumes']['Row']
export type Application = Database['public']['Tables']['applications']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

export type ApplicationStatus = Application['status']

export interface ConfidenceInsight {
  requirement: string
  evidence: string
  action: string
}

export interface TruthLockItem {
  claim: string
  evidence: string
}

export interface InterviewBridgeItem {
  question: string
  focus_area: string
  reason: string
}

export interface CoverLetterVariant {
  id: string
  label: string
  content: string
  score: number
  reasons: string[]
}

export interface GenerationQuality {
  used_fallback: boolean
  quality_flags: string[]
  keyword_coverage: number
  proposal_scores: Array<{ id: string; score: number }>
  risk_level: 'low' | 'medium' | 'high'
  blocked_by_quality: boolean
  quality_override_acknowledged?: boolean
  model_usage?: {
    proposal_model?: string
    resume_model?: string
    proposal_latency_ms?: number
    resume_latency_ms?: number
    letter_only?: boolean
  }
}

export interface JobImportMetadata {
  title: string
  company: string
  role: string
  location: string
  work_mode: string
  employment_type: string
  seniority: string
  salary_text: string
  required_skills: string[]
  responsibilities: string[]
  qualifications: string[]
  benefits: string[]
  confidence: Record<string, number>
}
