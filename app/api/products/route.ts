import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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
    const productType = searchParams.get('type') || 'toilet_paper'; // toilet_paper or dishwashing_liquid
    const keyword = searchParams.get('keyword');
    const filter = searchParams.get('filter');
    
    // Determine table name based on product type
    const tableName = productType === 'dishwashing_liquid' 
      ? 'dishwashing_liquid_products' 
      : 'toilet_paper_products';
    
    // Determine sort field based on product type
    const sortField = productType === 'dishwashing_liquid'
      ? 'price_per_1000ml'
      : 'price_per_m';
    
    // Build query
    let query = supabase
      .from(tableName)
      .select('*')
      .order(sortField, { ascending: true });
    
    // Apply keyword filter if provided and not default
    if (keyword && keyword !== 'トイレットペーパー' && keyword !== '食器用洗剤') {
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
    } else if (productType === 'dishwashing_liquid') {
      if (filter === 'refill') {
        query = query.eq('is_refill', true);
      } else if (filter === 'regular') {
        query = query.eq('is_refill', false);
      } else if (filter === 'sale') {
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
    
    // Return data
    return NextResponse.json(data || []);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: errorMessage
    }, { status: 500 });
  }
}