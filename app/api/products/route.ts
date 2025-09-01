import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables'
      }, { status: 500 });
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const productType = searchParams.get('type') || category || 'toilet_paper';
    const keyword = searchParams.get('keyword');
    const filter = searchParams.get('filter');
    
    // Determine table name based on product type
    let tableName = 'toilet_paper_products';
    let sortField = 'price_per_m';
    
    if (productType === 'dishwashing_liquid' || productType === 'dishwashing-liquid') {
      tableName = 'dishwashing_liquid_products';
      sortField = 'price_per_1000ml';
    } else if (productType === 'mineral_water' || productType === 'mineral-water') {
      tableName = 'mineral_water_products';
      sortField = 'price_per_liter';
    } else if (productType === 'rice') {
      tableName = 'rice_products';
      sortField = 'price_per_kg';
    }
    
    // Build query
    let query = supabase
      .from(tableName)
      .select('*')
      .order(sortField, { ascending: true });
    
    // Apply keyword filter if provided and not default
    if (keyword && keyword !== 'トイレットペーパー' && keyword !== '食器用洗剤' && keyword !== 'ミネラルウォーター' && keyword !== '米') {
      query = query.ilike('title', `%${keyword}%`);
    }
    
    // Apply type-specific filters
    if (productType === 'toilet_paper') {
      if (filter === 'single') {
        query = query.eq('is_double', false);
      } else if (filter === 'double') {
        query = query.eq('is_double', true);
      } else if (filter === 'sale') {
        query = query.eq('on_sale', true);
      }
    } else if (productType === 'dishwashing_liquid' || productType === 'dishwashing-liquid') {
      if (filter === 'refill') {
        query = query.eq('is_refill', true);
      } else if (filter === 'regular') {
        query = query.eq('is_refill', false);
      } else if (filter === 'sale') {
        query = query.eq('on_sale', true);
      }
    } else if (productType === 'mineral_water' || productType === 'mineral-water') {
      if (filter === 'case') {
        query = query.gte('bottle_count', 24);
      } else if (filter === 'bottle') {
        query = query.lt('bottle_count', 24);
      } else if (filter === 'sale') {
        query = query.eq('on_sale', true);
      }
    } else if (productType === 'rice') {
      if (filter === 'sale') {
        query = query.eq('on_sale', true);
      }
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ 
        error: 'Database query failed',
        details: error.message 
      }, { status: 500 });
    }
    
    // Return data as array (consistent with toilet-paper and dishwashing-liquid pages)
    return NextResponse.json(data || []);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: errorMessage
    }, { status: 500 });
  }
}