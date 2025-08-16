import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const steps: any[] = [];
  
  try {
    steps.push({ step: 1, message: 'Starting debug API' });
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    steps.push({ 
      step: 2, 
      message: 'Environment variables loaded',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlLength: supabaseUrl?.length,
      keyLength: supabaseKey?.length
    });
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables',
        steps 
      }, { status: 500 });
    }
    
    steps.push({ step: 3, message: 'Creating Supabase client' });
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    steps.push({ step: 4, message: 'Supabase client created' });
    
    // Try a simple query
    const { data, error } = await supabase
      .from('toilet_paper_products')
      .select('asin, title')
      .limit(1);
    
    steps.push({ 
      step: 5, 
      message: 'Query executed',
      hasData: !!data,
      hasError: !!error,
      error: error?.message
    });
    
    return NextResponse.json({
      success: true,
      steps,
      data
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json({
      success: false,
      steps,
      error: errorMessage,
      stack: errorStack.split('\n').slice(0, 5)
    }, { status: 500 });
  }
}