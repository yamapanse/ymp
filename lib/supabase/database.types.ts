export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          role: 'parent' | 'child';
          base_allowance: number | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          role: 'parent' | 'child';
          base_allowance?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: 'parent' | 'child';
          base_allowance?: number | null;
          created_at?: string;
        };
      };
      chore_masters: {
        Row: {
          id: string;
          child_id: string;
          name: string;
          unit_price: number;
          valid_from: string;
          valid_to: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          name: string;
          unit_price: number;
          valid_from: string;
          valid_to?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          name?: string;
          unit_price?: number;
          valid_from?: string;
          valid_to?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      chore_records: {
        Row: {
          id: string;
          child_id: string;
          chore_master_id: string;
          date: string;
          count: number;
          unit_price_snapshot: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          chore_master_id: string;
          date: string;
          count?: number;
          unit_price_snapshot: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          chore_master_id?: string;
          date?: string;
          count?: number;
          unit_price_snapshot?: number;
          created_at?: string;
        };
      };
      monthly_summaries: {
        Row: {
          id: string;
          child_id: string;
          year_month: string;
          base_allowance: number;
          chore_total: number;
          total_amount: number;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          year_month: string;
          base_allowance: number;
          chore_total?: number;
          total_amount?: number;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          year_month?: string;
          base_allowance?: number;
          chore_total?: number;
          total_amount?: number;
          paid_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
