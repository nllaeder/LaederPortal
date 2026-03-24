import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface ClientRow {
    wave_id: string | null;
    name: string | null;
    google_folder_id: string | null;
    is_archived: boolean | null;
}

export async function GET() {
    const report: any = {};

    const { data, error } = await supabase.from('clients').select('wave_id, name, google_folder_id, is_archived');
    if (error) {
        report.error = error.message;
    } else {
        const clientData = data as ClientRow[];
        report.clients = {
            total: clientData.length,
            is_archived_count: clientData.filter((r: ClientRow) => r.is_archived).length,
            no_folder_and_not_archived: clientData.filter((r: ClientRow) => !r.google_folder_id && !r.is_archived).length,
            sample: clientData.slice(0, 5)
        };
    }

    return NextResponse.json(report);
}
