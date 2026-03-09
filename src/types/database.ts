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
          status?: 'draft' | 'applied' | 'interview' | 'rejected' | 'offer'
          created_at?: string
          updated_at?: string
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
