import { NextResponse } from 'next/server';
import { provisionFolders } from '@/lib/provisioning';
import { sendTelegramNotification } from '@/lib/telegram';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Manual provisioning endpoint for testing
 */
export async function POST(request: Request) {
    console.log('Starting manual folder provisioning...');

    try {
        // Get diagnostic info before provisioning
        const { data: clientsTotal } = await supabase.from('clients').select('id');
        const { data: clientsNeedingFolders } = await supabase
            .from('clients')
            .select('id, name')
            .is('google_folder_id', null);
        const { data: estimatesNeedingFolders } = await supabase
            .from('estimates')
            .select('id, title')
            .is('google_folder_id', null);
        const { data: invoicesNeedingFolders } = await supabase
            .from('invoices')
            .select('id, title')
            .is('google_folder_id', null);

        const beforeStats = {
            totalClients: clientsTotal?.length || 0,
            clientsNeedingFolders: clientsNeedingFolders?.length || 0,
            estimatesNeedingFolders: estimatesNeedingFolders?.length || 0,
            invoicesNeedingFolders: invoicesNeedingFolders?.length || 0,
        };

        console.log('Before provisioning:', beforeStats);

        // Run provisioning
        await provisionFolders();

        // Get diagnostic info after provisioning
        const { data: clientsStillNeeding } = await supabase
            .from('clients')
            .select('id')
            .is('google_folder_id', null);
        const { data: estimatesStillNeeding } = await supabase
            .from('estimates')
            .select('id')
            .is('google_folder_id', null);
        const { data: invoicesStillNeeding } = await supabase
            .from('invoices')
            .select('id')
            .is('google_folder_id', null);

        const afterStats = {
            clientsStillNeedingFolders: clientsStillNeeding?.length || 0,
            estimatesStillNeedingFolders: estimatesStillNeeding?.length || 0,
            invoicesStillNeedingFolders: invoicesStillNeeding?.length || 0,
        };

        const provisioned = {
            clients: beforeStats.clientsNeedingFolders - afterStats.clientsStillNeedingFolders,
            estimates: beforeStats.estimatesNeedingFolders - afterStats.estimatesStillNeedingFolders,
            invoices: beforeStats.invoicesNeedingFolders - afterStats.invoicesStillNeedingFolders,
        };

        console.log('Provisioning completed successfully.');
        console.log('Provisioned:', provisioned);

        return NextResponse.json({
            success: true,
            message: 'Provisioning completed',
            beforeStats,
            afterStats,
            provisioned,
        });
    } catch (error: any) {
        console.error('Provisioning failed:', error);
        await sendTelegramNotification({
            entityType: 'system',
            message: `Manual provisioning failed: ${error.message}`,
        });
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}