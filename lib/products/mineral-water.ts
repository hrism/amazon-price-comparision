import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface MineralWaterProduct {
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
  capacity_ml?: number;
  bottle_count?: number;
  total_capacity_l?: number;
  price_per_liter?: number;
  water_type?: string;
  hardness?: number;
  last_fetched_at?: string;
}

export async function getMineralWaterProducts(): Promise<MineralWaterProduct[]> {
  const { data, error } = await supabase
    .from('mineral_water_products')
    .select('*')
    .order('price_per_liter', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching mineral water products:', error);
    return [];
  }

  return data || [];
}

export async function getMineralWaterProduct(asin: string): Promise<MineralWaterProduct | null> {
  const { data, error } = await supabase
    .from('mineral_water_products')
    .select('*')
    .eq('asin', asin)
    .single();

  if (error) {
    console.error('Error fetching mineral water product:', error);
    return null;
  }

  return data;
}