import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    const report: any = {};

    const { data, error } = await supabase.from('clients').select('wave_id, name, google_folder_id, is_archived');
    if (error) {
        report.error = error.message;
    } else {
        report.clients = {
            total: data.length,
            is_archived_count: data.filter(r => r.is_archived).length,
            no_folder_and_not_archived: data.filter(r => !r.google_folder_id && !r.is_archived).length,
            sample: data.slice(0, 5)
        };
    }

    return NextResponse.json(report);
}
