import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Allow auth callback route to process without middleware interference
  if (req.nextUrl.pathname === '/auth/callback') {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
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
          supabaseResponse.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          supabaseResponse.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session to get the latest session
  const { data: { session }, error } = await supabase.auth.getSession();

  console.log('Middleware session check:', {
    path: req.nextUrl.pathname,
    hasSession: !!session,
    userEmail: session?.user?.email || 'none',
    error: error?.message || 'none'
  });

  // Protected routes that require authentication
  const protectedRoutes = ['/admin', '/dashboard', '/project'];
  const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route));

  if (isProtectedRoute) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Admin route protection
    if (req.nextUrl.pathname.startsWith('/admin')) {
      const isAdmin = session.user?.email === 'nicholas@laederconsulting.com';
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
  }

  // Redirect authenticated users away from login
  if (req.nextUrl.pathname === '/login' && session) {
    const isAdmin = session.user?.email === 'nicholas@laederconsulting.com';
    const redirectTo = isAdmin ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  // Root path redirect
  if (req.nextUrl.pathname === '/') {
    if (session) {
      const isAdmin = session.user?.email === 'nicholas@laederconsulting.com';
      const redirectTo = isAdmin ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(redirectTo, req.url));
    } else {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/admin/:path*',
    '/project/:path*',
    '/auth/callback',
  ],
};