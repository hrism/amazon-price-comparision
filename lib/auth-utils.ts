import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function validateAuth(request: NextRequest): Promise<{ valid: boolean; error?: string; user?: any }> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { valid: false, error: 'Invalid token or user not found' };
    }

    return { valid: true, user };
  } catch (error) {
    return { valid: false, error: 'Authentication validation failed' };
  }
}

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = identifier;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  current.count++;
  rateLimitStore.set(key, current);
  
  return { allowed: true, remaining: maxRequests - current.count };
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

export function validateInput(input: any, rules: { [key: string]: string[] }): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [field, validations] of Object.entries(rules)) {
    const value = input[field];
    
    for (const validation of validations) {
      if (validation === 'required' && (!value || value.toString().trim() === '')) {
        errors.push(`${field} is required`);
      }
      
      if (validation.startsWith('maxLength:')) {
        const maxLength = parseInt(validation.split(':')[1]);
        if (value && value.toString().length > maxLength) {
          errors.push(`${field} must be less than ${maxLength} characters`);
        }
      }
      
      if (validation === 'alphanumeric' && value) {
        if (!/^[a-zA-Z0-9]+$/.test(value.toString())) {
          errors.push(`${field} must contain only alphanumeric characters`);
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}