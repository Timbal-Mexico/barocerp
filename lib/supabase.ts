import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          sku: string;
          price: number;
          stock: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sku: string;
          price: number;
          stock?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sku?: string;
          price?: number;
          stock?: number;
          active?: boolean;
          created_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          interest_product_id: string | null;
          contact_channel: 'facebook' | 'instagram' | 'whatsapp' | 'web' | 'otro';
          status: 'new' | 'contacted' | 'interested' | 'qualified' | 'closed' | 'lost';
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          interest_product_id?: string | null;
          contact_channel: 'facebook' | 'instagram' | 'whatsapp' | 'web' | 'otro';
          status?: 'new' | 'contacted' | 'interested' | 'qualified' | 'closed' | 'lost';
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          interest_product_id?: string | null;
          contact_channel?: 'facebook' | 'instagram' | 'whatsapp' | 'web' | 'otro';
          status?: 'new' | 'contacted' | 'interested' | 'qualified' | 'closed' | 'lost';
          created_at?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          order_number: string;
          lead_id: string | null;
          channel: 'facebook' | 'instagram' | 'whatsapp' | 'web' | 'organico';
          total_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          lead_id?: string | null;
          channel: 'facebook' | 'instagram' | 'whatsapp' | 'web' | 'organico';
          total_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          lead_id?: string | null;
          channel?: 'facebook' | 'instagram' | 'whatsapp' | 'web' | 'organico';
          total_amount?: number;
          created_at?: string;
        };
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          price: number;
        };
        Insert: {
          id?: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          price: number;
        };
        Update: {
          id?: string;
          sale_id?: string;
          product_id?: string;
          quantity?: number;
          price?: number;
        };
      };
      inventory_movements: {
        Row: {
          id: string;
          product_id: string;
          quantity: number;
          reason: 'sale' | 'manual_adjustment' | 'initial_stock' | 'return';
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity: number;
          reason: 'sale' | 'manual_adjustment' | 'initial_stock' | 'return';
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          quantity?: number;
          reason?: 'sale' | 'manual_adjustment' | 'initial_stock' | 'return';
          created_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          month: string;
          target_amount: number;
          channel: 'facebook' | 'instagram' | 'whatsapp' | 'web' | 'organico' | 'all' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          month: string;
          target_amount: number;
          channel?: 'facebook' | 'instagram' | 'whatsapp' | 'web' | 'organico' | 'all' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          month?: string;
          target_amount?: number;
          channel?: 'facebook' | 'instagram' | 'whatsapp' | 'web' | 'organico' | 'all' | null;
          created_at?: string;
        };
      };
    };
  };
};
