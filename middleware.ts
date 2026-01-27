import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // For now, just allow all requests
  // In production, you'd verify the auth token here
  // But since we're using client-side auth, we rely on the useAuth hook
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*']
};
