import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cookieStore = cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            return NextResponse.json({
                error: error.message,
                hasSession: false
            });
        }

        if (!session) {
            return NextResponse.json({
                message: 'No active session',
                hasSession: false
            });
        }

        const user = session.user;
        const isAdmin = user?.email === 'nicholas@laederconsulting.com';

        return NextResponse.json({
            hasSession: true,
            userEmail: user?.email || 'none',
            expectedEmail: 'nicholas@laederconsulting.com',
            isAdmin,
            emailMatch: user?.email === 'nicholas@laederconsulting.com',
            userMetadata: user?.user_metadata || {},
            userId: user?.id || 'none'
        });

    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            hasSession: false
        }, { status: 500 });
    }
}