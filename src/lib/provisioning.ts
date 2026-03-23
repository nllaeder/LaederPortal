import { supabase } from './supabase';
import { createFolder, shareFolder } from './drive';
import { sendTelegramNotification } from './telegram';

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

/**
 * Main entry point for folder provisioning.
 * Scans Supabase for records without folder IDs and creates the structure.
 */
export async function provisionFolders() {
    console.log('Starting folder provisioning...');

    try {
        // 1. Provision Clients
        await provisionClients();

        // 2. Provision Estimates
        await provisionEstimates();

        // 3. Provision Invoices
        await provisionInvoices();

        console.log('Folder provisioning completed.');
    } catch (error: any) {
        console.error('Folder provisioning failed:', error);
        await sendTelegramNotification({
            entityType: 'folder',
            message: `Folder provisioning failed: ${error.message}`,
        });
    }
}

async function provisionClients() {
    const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .is('google_folder_id', null);

    console.log('Provisioning Debug - Clients Data:', !!clients, 'Error:', error);
    if (clients) console.log('Provisioning Debug - Clients Length:', clients.length);

    if (error) throw new Error(`Error fetching clients for provisioning: ${error.message}`);

    console.log(`Found ${clients?.length || 0} clients to provision.`);

    for (const client of clients || []) {
        try {
            console.log(`Creating folder for client: ${client.name}`);
            const folderId = await createFolder(client.name, ROOT_FOLDER_ID);

            if (client.email) {
                await shareFolder(folderId, client.email, 'viewer');
            }

            const { error: updateError } = await supabase
                .from('clients')
                .update({ google_folder_id: folderId })
                .eq('id', client.id);

            if (updateError) throw updateError;

            console.log(`Successfully provisioned client folder: ${client.name} (${folderId})`);
        } catch (err: any) {
            console.error(`Failed to provision client ${client.name}:`, err);
            await sendTelegramNotification({
                entityType: 'client',
                waveId: client.wave_id,
                message: `Folder provisioning failed: ${err.message}`,
            });
        }
    }
}

async function provisionEstimates() {
    const { data: estimates, error } = await supabase
        .from('estimates')
        .select('*')
        .is('google_folder_id', null);

    if (error) throw new Error(`Error fetching estimates for provisioning: ${error.message}`);

    console.log(`Found ${estimates?.length || 0} estimates to provision.`);

    for (const estimate of estimates || []) {
        try {
            // Need the client's parent folder ID
            const { data: client, error: clientError } = await supabase
                .from('clients')
                .select('google_folder_id, name')
                .eq('wave_id', estimate.wave_client_id)
                .single();

            if (clientError || !client.google_folder_id) {
                console.warn(`Skipping estimate ${estimate.wave_id}: Client folder not found.`);
                continue;
            }

            const folderName = `${estimate.title || 'Untitled Project'} - ${estimate.estimate_number || estimate.wave_id.slice(-6)}`;
            console.log(`Creating folder for estimate: ${folderName}`);

            const projectFolderId = await createProjectStructure(folderName, client.google_folder_id);

            const { error: updateError } = await supabase
                .from('estimates')
                .update({ google_folder_id: projectFolderId })
                .eq('id', estimate.id);

            if (updateError) throw updateError;

            console.log(`Successfully provisioned estimate folder: ${folderName} (${projectFolderId})`);
        } catch (err: any) {
            console.error(`Failed to provision estimate ${estimate.wave_id}:`, err);
            await sendTelegramNotification({
                entityType: 'estimate',
                waveId: estimate.wave_id,
                message: `Folder provisioning failed: ${err.message}`,
            });
        }
    }
}

async function provisionInvoices() {
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .is('google_folder_id', null);

    if (error) throw new Error(`Error fetching invoices for provisioning: ${error.message}`);

    console.log(`Found ${invoices?.length || 0} invoices to provision.`);

    for (const invoice of invoices || []) {
        try {
            // Check if estimate for same project already has a folder? 
            // Wave IDs are different, but maybe the user wants multiple folders?
            // Usually, an invoice follows an estimate.
            // But for simplicity, we treat them as separate projects unless we link them.
            // AGENTS.md says project folder ID is written to the estimate OR invoice record.

            const { data: client, error: clientError } = await supabase
                .from('clients')
                .select('google_folder_id, name')
                .eq('wave_id', invoice.wave_client_id)
                .single();

            if (clientError || !client.google_folder_id) {
                console.warn(`Skipping invoice ${invoice.wave_id}: Client folder not found.`);
                continue;
            }

            const folderName = `${invoice.title || 'Untitled Project'} - ${invoice.invoice_number || invoice.wave_id.slice(-6)}`;
            console.log(`Creating folder for invoice: ${folderName}`);

            const projectFolderId = await createProjectStructure(folderName, client.google_folder_id);

            const { error: updateError } = await supabase
                .from('invoices')
                .update({ google_folder_id: projectFolderId })
                .eq('id', invoice.id);

            if (updateError) throw updateError;

            console.log(`Successfully provisioned invoice folder: ${folderName} (${projectFolderId})`);
        } catch (err: any) {
            console.error(`Failed to provision invoice ${invoice.wave_id}:`, err);
            await sendTelegramNotification({
                entityType: 'invoice',
                waveId: invoice.wave_id,
                message: `Folder provisioning failed: ${err.message}`,
            });
        }
    }
}

async function createProjectStructure(name: string, parentId: string): Promise<string> {
    console.log(`Creating project structure: ${name} in parent ${parentId}`);
    const projectFolderId = await createFolder(name, parentId);
    console.log(`Created project folder: ${projectFolderId}`);

    const subfolders = [
        'Drawings',
        'Permits',
        'Estimates',
        'Invoices',
        'Reports',
        'Photos',
        'Client Uploads',
    ];

    console.log(`Creating ${subfolders.length} subfolders...`);
    for (const sub of subfolders) {
        const subfolderId = await createFolder(sub, projectFolderId);
        console.log(`Created subfolder: ${sub} (${subfolderId})`);
    }

    return projectFolderId;
}
