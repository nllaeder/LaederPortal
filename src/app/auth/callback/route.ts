import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  console.log('Auth callback received:', {
    code: !!code,
    next,
    origin,
    fullUrl: request.url
  });

  if (code) {
    // Create the response first, before creating Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // Don't set on response yet, we'll create it after session exchange
          },
          remove(name: string, options: any) {
            // Don't set on response yet
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log('Auth exchange result:', {
      hasSession: !!data.session,
      hasUser: !!data.user,
      userEmail: data.user?.email,
      error: error?.message
    });

    if (!error && data.session) {
      // Determine redirect based on user email
      const isAdmin = data.user?.email === 'nicholas@laederconsulting.com';
      const redirectTo = isAdmin ? '/admin' : '/dashboard';

      console.log('Redirecting authenticated user to:', redirectTo);

      // Create response object first
      const response = NextResponse.redirect(`${origin}${redirectTo}`);

      // Set up Supabase client with response cookie handlers to ensure proper session persistence
      const supabaseWithCookies = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              console.log('Setting session cookie:', name, '(length:', value.length, ')');
              response.cookies.set({
                name,
                value,
                ...options,
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                path: '/'
              });
            },
            remove(name: string, options: any) {
              response.cookies.set({
                name,
                value: '',
                ...options,
                expires: new Date(0),
                path: '/'
              });
            },
          },
        }
      );

      // Ensure session is fully established by calling getSession
      const { data: { session: verifySession } } = await supabaseWithCookies.auth.getSession();
      console.log('Session verification after cookie setup:', {
        hasSession: !!verifySession,
        userEmail: verifySession?.user?.email
      });

      return response;
    }

    console.error('Auth exchange error:', error);
  } else {
    console.log('No auth code received in callback');
  }

  // Return the user to login with error
  console.log('Redirecting to login due to auth failure');
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}