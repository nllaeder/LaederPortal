import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  console.log('Auth callback called:', {
    hasCode: !!code,
    hasError: !!error_param,
    origin,
    searchParams: Object.fromEntries(searchParams.entries())
  })

  // Handle auth errors
  if (error_param) {
    console.error('Auth error:', error_param, error_description)
    return NextResponse.redirect(`${origin}/login?error=${error_param}`)
  }

  // Handle code exchange (OAuth flow)
  if (code) {
    const cookieStore = await cookies()
    let response = NextResponse.redirect(`${origin}/login`)

    const supabase = createServerClient(
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

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Code exchange error:', error)
        return NextResponse.redirect(`${origin}/login?error=code_exchange_failed`)
      }

      if (data?.session) {
        console.log('Session established for:', data.session.user?.email)

        // Check if user is admin and redirect appropriately
        const isAdmin = data.session.user?.email === 'nicholas@laederconsulting.com'
        const redirectTo = isAdmin ? '/admin' : '/dashboard'

        response = NextResponse.redirect(`${origin}${redirectTo}`)
        return response
      }

      console.error('No session in response')
      return NextResponse.redirect(`${origin}/login?error=no_session`)

    } catch (err) {
      console.error('Auth callback exception:', err)
      return NextResponse.redirect(`${origin}/login?error=callback_exception`)
    }
  }

  // No code or error - might be direct magic link
  console.log('No code in callback, redirecting to login')
  return NextResponse.redirect(`${origin}/login`)
}