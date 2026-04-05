import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()

    // Create the response first
    let response = NextResponse.redirect(`${origin}/login?error=auth_callback_error`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Set cookies on the response
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    try {
      // Exchange the auth code for a session
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error && session) {
        console.log('Session established for:', session.user?.email)

        // Check if user is admin and redirect appropriately
        const isAdmin = session.user?.email === 'nicholas@laederconsulting.com'
        const redirectTo = isAdmin ? '/admin' : '/dashboard'

        // Create new response with correct redirect
        response = NextResponse.redirect(`${origin}${redirectTo}`)

        // Re-create supabase client with response cookies
        const supabaseForResponse = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              get(name: string) {
                return cookieStore.get(name)?.value
              },
              set(name: string, value: string, options: any) {
                response.cookies.set({ name, value, ...options })
              },
              remove(name: string, options: any) {
                response.cookies.set({ name, value: '', ...options })
              },
            },
          }
        )

        // Trigger session refresh to ensure cookies are set
        await supabaseForResponse.auth.getSession()

        return response
      } else {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${origin}/login?error=${error?.message || 'auth_failed'}`)
      }
    } catch (err) {
      console.error('Auth callback exception:', err)
      return NextResponse.redirect(`${origin}/login?error=auth_exception`)
    }
  }

  // No code provided
  return NextResponse.redirect(`${origin}/login?error=no_auth_code`)
}