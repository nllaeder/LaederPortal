import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          req.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { session }, error } = await supabase.auth.getSession();

  console.log('Middleware session check:', {
    path: req.nextUrl.pathname,
    hasSession: !!session,
    userEmail: session?.user?.email || 'none',
    error: error?.message || 'none'
  });

  // Protect dashboard and admin routes
  if (req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/admin')) {
    // Check if this might be an OAuth callback by looking for auth-related fragments in the referrer
    const referrer = req.headers.get('referer');
    const isLikelyOAuthCallback = referrer?.includes('/login') &&
      (req.headers.get('sec-fetch-dest') === 'document' || req.headers.get('cache-control')?.includes('no-cache'));

    if (!session) {
      if (isLikelyOAuthCallback) {
        console.log('Likely OAuth callback, allowing dashboard access temporarily');
        // For OAuth callbacks, let the client-side handle the redirect
        return response;
      } else {
        console.log('No session found, redirecting to login');
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }
  }

  // Admin-only routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const user = session?.user;
    const isAdmin = user?.user_metadata?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Redirect authenticated users away from login
  if (req.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Redirect root to dashboard if authenticated, otherwise to login
  if (req.nextUrl.pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    } else {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/admin/:path*',
  ],
};