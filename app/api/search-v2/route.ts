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
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey 
      }, { status: 500 });
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');
    const filter = searchParams.get('filter');
    
    // Build query
    let query = supabase
      .from('toilet_paper_products')
      .select('*')
      .order('price_per_m', { ascending: true });
    
    // Apply keyword filter if not default
    if (keyword && keyword !== 'トイレットペーパー') {
      query = query.ilike('title', `%${keyword}%`);
    }
    
    // Apply type filters
    if (filter === 'single') {
      query = query.eq('is_double', false);
    } else if (filter === 'double') {
      query = query.eq('is_double', true);
    } else if (filter === 'sale') {
      query = query.eq('on_sale', true);
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
    // Comprehensive error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: errorMessage,
      stack: errorStack ? errorStack.split('\n').slice(0, 5) : [],
      type: error?.constructor?.name || 'Unknown'
    }, { status: 500 });
  }
}