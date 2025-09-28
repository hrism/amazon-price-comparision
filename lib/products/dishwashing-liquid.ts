import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DishwashingProduct {
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
  volume_ml?: number;
  bottle_count?: number;
  total_volume_ml?: number;
  price_per_ml?: number;
  price_per_100ml?: number;
  price_per_1000ml?: number;
  scent?: string;
  is_concentrated?: boolean;
  is_refill?: boolean;
  last_fetched_at?: string;
}

export async function getDishwashingProducts(): Promise<DishwashingProduct[]> {
  const { data, error } = await supabase
    .from('dishwashing_liquid_products')
    .select('*')
    .not('price', 'is', null)  // 在庫切れを除外
    .order('price_per_1000ml', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching dishwashing products:', error);
    return [];
  }

  return data || [];
}

export async function getDishwashingProduct(asin: string): Promise<DishwashingProduct | null> {
  const { data, error } = await supabase
    .from('dishwashing_liquid_products')
    .select('*')
    .eq('asin', asin)
    .single();

  if (error) {
    console.error('Error fetching dishwashing product:', error);
    return null;
  }

  return data;
}