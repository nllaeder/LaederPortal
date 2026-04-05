import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchWaveCustomers, fetchWaveEstimates, fetchWaveInvoices } from '@/lib/wave';
import { sendTelegramNotification } from '@/lib/telegram';
import { provisionFolders } from '@/lib/provisioning';

export const dynamic = 'force-dynamic';

function parseAmount(val: any): number | null {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') return val;
    // Strip commas and parse
    const clean = String(val).replace(/,/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : parsed;
}

export async function GET(request: Request) {
    console.log('Starting Wave sync...');

    try {
        // 1. Sync Customers (Clients)
        console.log('Syncing Customers...');
        await syncCustomers();

        // 2. Sync Estimates
        console.log('Syncing Estimates...');
        await syncEstimates();

        // 3. Sync Invoices
        console.log('Syncing Invoices...');
        await syncInvoices();

        // 4. Provision Folders
        console.log('Provisioning Folders...');
        const { data: testClients } = await supabase.from('clients').select('id');
        const diagnostic = {
            clientsInDb: testClients?.length || 0,
            clientsToProvision: (await supabase.from('clients').select('id').is('google_folder_id', null)).data?.length || 0
        };
        await provisionFolders();

        console.log('Wave sync and provisioning completed successfully.');
        return NextResponse.json({
            success: true,
            message: 'Sync completed',
            diagnostic
        });
    } catch (error: any) {
        console.error('Wave sync failed:', error);
        await sendTelegramNotification({
            entityType: 'system',
            message: `Wave sync failed: ${error.message}`,
        });
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

async function syncCustomers() {
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
        const data = await fetchWaveCustomers(page);
        const edges = data.edges;

        const upsertData = edges.map(({ node }: any) => ({
            wave_id: node.id,
            name: node.name,
            first_name: node.firstName,
            last_name: node.lastName,
            email: node.email,
            phone: node.phone,
            mobile: node.mobile,
            website: node.website,
            address_line1: node.address?.addressLine1,
            address_line2: node.address?.addressLine2,
            city: node.address?.city,
            province: node.address?.province?.name,
            country: node.address?.country?.name,
            postal_code: node.address?.postalCode,
            currency_code: node.currency?.code,
            internal_notes: node.internalNotes,
            is_archived: node.isArchived,
            wave_created_at: node.createdAt,
            wave_modified_at: node.modifiedAt,
        }));

        if (upsertData.length > 0) {
            const { error } = await supabase
                .from('clients')
                .upsert(upsertData, { onConflict: 'wave_id' });

            if (error) {
                throw new Error(`Error upserting customers: ${error.message}`);
            }
        }

        hasNextPage = data.pageInfo.currentPage < data.pageInfo.totalPages;
        page++;
    }
}

async function syncEstimates() {
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
        const data = await fetchWaveEstimates(page);
        const edges = data.edges;

        const upsertData = edges.map(({ node }: any) => ({
            wave_id: node.id,
            wave_client_id: node.customer?.id,
            estimate_number: node.estimateNumber,
            title: node.title,
            estimate_date: node.estimateDate,
            due_date: node.dueDate,
            amount_due: parseAmount(node.amountDue?.value),
            amount_paid: parseAmount(node.amountPaid?.value),
            subtotal: parseAmount(node.subtotal?.value),
            tax_total: parseAmount(node.taxTotal?.value),
            total: parseAmount(node.total?.value),
            currency_code: node.currency?.code,
            memo: node.memo,
            footer: node.footer,
            last_sent_at: node.lastSentAt,
            last_viewed_at: node.lastViewedAt,
            wave_created_at: node.createdAt,
            wave_modified_at: node.modifiedAt,
        }));

        if (upsertData.length > 0) {
            const { error } = await supabase
                .from('estimates')
                .upsert(upsertData, { onConflict: 'wave_id' });

            if (error) {
                throw new Error(`Error upserting estimates: ${error.message}`);
            }
        }

        hasNextPage = data.pageInfo.currentPage < data.pageInfo.totalPages;
        page++;
    }
}

async function syncInvoices() {
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
        const data = await fetchWaveInvoices(page);
        const edges = data.edges;

        const upsertData = edges.map(({ node }: any) => ({
            wave_id: node.id,
            wave_client_id: node.customer?.id,
            invoice_number: node.invoiceNumber,
            title: node.title,
            status: node.status,
            invoice_date: node.invoiceDate,
            due_date: node.dueDate,
            amount_due: parseAmount(node.amountDue?.value),
            amount_paid: parseAmount(node.amountPaid?.value),
            subtotal: parseAmount(node.subtotal?.value),
            tax_total: parseAmount(node.taxTotal?.value),
            total: parseAmount(node.total?.value),
            currency_code: node.currency?.code,
            memo: node.memo,
            footer: node.footer,
            last_sent_at: node.lastSentAt,
            last_viewed_at: node.lastViewedAt,
            wave_created_at: node.createdAt,
            wave_modified_at: node.modifiedAt,
        }));

        if (upsertData.length > 0) {
            const { error } = await supabase
                .from('invoices')
                .upsert(upsertData, { onConflict: 'wave_id' });

            if (error) {
                throw new Error(`Error upserting invoices: ${error.message}`);
            }
        }

        hasNextPage = data.pageInfo.currentPage < data.pageInfo.totalPages;
        page++;
    }
}
