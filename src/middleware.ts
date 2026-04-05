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

  const { data: { session }, error } = await supabase.auth.getSession();

  console.log('Middleware auth check:', {
    path: req.nextUrl.pathname,
    hasSession: !!session,
    userEmail: session?.user?.email || 'none',
    error: error?.message || 'none'
  });

  // Protect authenticated routes
  if (req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      console.log('No session, redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Admin route protection
    if (req.nextUrl.pathname.startsWith('/admin')) {
      const isAdmin = session.user?.email === 'nicholas@laederconsulting.com';
      if (!isAdmin) {
        console.log('Non-admin accessing admin route, redirecting to dashboard');
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
  }

  // Redirect authenticated users away from login
  if (req.nextUrl.pathname === '/login' && session) {
    const isAdmin = session.user?.email === 'nicholas@laederconsulting.com';
    const redirectTo = isAdmin ? '/admin' : '/dashboard';
    console.log('Authenticated user on login, redirecting to:', redirectTo);
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  // Root path redirect
  if (req.nextUrl.pathname === '/') {
    if (session) {
      const isAdmin = session.user?.email === 'nicholas@laederconsulting.com';
      const redirectTo = isAdmin ? '/admin' : '/dashboard';
      console.log('Root path redirect for authenticated user:', redirectTo);
      return NextResponse.redirect(new URL(redirectTo, req.url));
    } else {
      console.log('Unauthenticated user on root, redirecting to login');
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