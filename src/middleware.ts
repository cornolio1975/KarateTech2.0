import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Very basic in-memory rate limiting map for demonstration
// In a real Edge deployment, this resets on isolate startup.
// A better approach would be Redis/Upstash for global rate limiting.
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

export function middleware(request: NextRequest) {
  // Only apply to public API routes
  if (request.nextUrl.pathname.startsWith('/api/public/v1')) {
    const response = NextResponse.next();

    // 1. CORS Headers
    const origin = request.headers.get('origin');
    const allowedOrigins = ['https://spsportdatasolution.org', 'http://localhost:3000', 'https://karatetechhybrid.spsportdatasolution.org'];
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      // If we strictly want to block unapproved origins from reading via browser
      // response.headers.set('Access-Control-Allow-Origin', 'https://spsportdatasolution.org');
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS requests for preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { headers: response.headers, status: 204 });
    }

    // 2. Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const now = Date.now();
    
    // Config: 100 requests per 60 seconds
    const WINDOW_MS = 60 * 1000;
    const MAX_REQUESTS = 100;
    
    const record = rateLimitMap.get(ip);
    
    if (record) {
      if (now < record.resetTime) {
        if (record.count >= MAX_REQUESTS) {
          return NextResponse.json(
            { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
            { status: 429, headers: response.headers }
          );
        }
        record.count++;
      } else {
        rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/public/v1/:path*',
};
