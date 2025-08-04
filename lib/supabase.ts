import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Product {
  id?: string;
  asin: string;
  title: string;
  description?: string;
  brand?: string;
  image_url?: string;
  price?: number;
  price_regular?: number;
  discount_percent?: number;
  on_sale: boolean;
  review_avg?: number;
  review_count?: number;
  roll_count?: number;
  length_m?: number;
  total_length_m?: number;
  price_per_roll?: number;
  price_per_m?: number;
  is_double?: boolean;
  last_fetched_at?: string;
  created_at?: string;
}