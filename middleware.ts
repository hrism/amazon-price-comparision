import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 301 Redirect from Vercel domain to custom domain
  const host = request.headers.get('host');
  const pathname = request.nextUrl.pathname;
  
  // Vercelドメインから独自ドメインへリダイレクト
  if (host === 'amazon-price-comparision.vercel.app') {
    const newUrl = new URL(pathname, 'https://www.yasu-ku-kau.com');
    newUrl.search = request.nextUrl.search;
    return NextResponse.redirect(newUrl, 301);
  }
  
  // CSRF Protection for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip CSRF check for GET requests and test endpoints
    if (request.method === 'GET' || request.nextUrl.pathname === '/api/test') {
      return NextResponse.next();
    }

    // Check for CSRF token in headers
    const csrfToken = request.headers.get('x-csrf-token');
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    
    // Allow requests from same origin
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://amazon-price-comparision.vercel.app'
    ].filter(Boolean);

    const isValidOrigin = origin && allowedOrigins.some(allowed => origin === allowed);
    const isValidReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed));

    if (!isValidOrigin && !isValidReferer) {
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }
  }

  // Security headers
  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
};