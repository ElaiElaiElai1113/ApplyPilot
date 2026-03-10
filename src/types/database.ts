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
