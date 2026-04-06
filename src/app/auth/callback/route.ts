import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  console.log('Auth callback received:', { code: !!code, next });

  if (code) {
    let response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log('Auth exchange result:', {
      hasSession: !!data.session,
      hasUser: !!data.user,
      error: error?.message
    });

    if (!error && data.session) {
      // Determine redirect based on user email
      const isAdmin = data.user?.email === 'nicholas@laederconsulting.com';
      const redirectTo = isAdmin ? '/admin' : '/dashboard';
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }

    console.error('Auth exchange error:', error);
  }

  // Return the user to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}