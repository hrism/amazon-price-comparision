import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getRiceProducts(useFresh: boolean = false) {
  try {
    const { data, error } = await supabase
      .from('rice_products')
      .select('*')
      .eq('out_of_stock', false)  // 在庫切れを除外
      .order(useFresh ? 'price_per_kg_fresh' : 'price_per_kg', { ascending: true });
    
    if (error) {
      console.error('Error fetching rice products:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRiceProducts:', error);
    return [];
  }
}