import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ToiletPaperProduct {
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
}

export async function getToiletPaperProducts(): Promise<ToiletPaperProduct[]> {
  const { data, error } = await supabase
    .from('toilet_paper_products')
    .select('*')
    .not('price', 'is', null)  // 在庫切れを除外
    .order('price_per_m', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching toilet paper products:', error);
    return [];
  }

  return data || [];
}

export async function getToiletPaperProduct(asin: string): Promise<ToiletPaperProduct | null> {
  const { data, error } = await supabase
    .from('toilet_paper_products')
    .select('*')
    .eq('asin', asin)
    .single();

  if (error) {
    console.error('Error fetching toilet paper product:', error);
    return null;
  }

  return data;
}