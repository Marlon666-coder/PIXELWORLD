export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      competitions: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string | null
          id: string
          organizer: string
          poster_height: number | null
          poster_path: string | null
          poster_width: number | null
          registration_deadline: string | null
          registration_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          organizer: string
          poster_height?: number | null
          poster_path?: string | null
          poster_width?: number | null
          registration_deadline?: string | null
          registration_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          organizer?: string
          poster_height?: number | null
          poster_path?: string | null
          poster_width?: number | null
          registration_deadline?: string | null
          registration_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deadline_distance: {
        Args: { c: Database["public"]["Tables"]["competitions"]["Row"] }
        Returns: number
      }
      deadline_rank: {
        Args: { c: Database["public"]["Tables"]["competitions"]["Row"] }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      published_category_counts: {
        Args: never
        Returns: {
          category: string
          total: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
