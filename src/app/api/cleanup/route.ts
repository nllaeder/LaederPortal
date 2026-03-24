import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

async function getDriveClient() {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const SCOPES = ['https://www.googleapis.com/auth/drive'];

    if (serviceAccountKey) {
        const credentials = JSON.parse(serviceAccountKey);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: SCOPES,
        });
        return google.drive({ version: 'v3', auth });
    } else {
        throw new Error('Google service account key not found');
    }
}

async function deleteAllFoldersInParent(parentFolderId: string) {
    const drive = await getDriveClient();

    // Get all folders in the parent folder
    const response = await drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
    });

    const folders = response.data.files || [];
    console.log(`Found ${folders.length} folders to delete in parent ${parentFolderId}`);

    // Delete each folder
    for (const folder of folders) {
        try {
            await drive.files.delete({
                fileId: folder.id!,
                supportsAllDrives: true,
            });
            console.log(`Deleted folder: ${folder.name} (${folder.id})`);
        } catch (error) {
            console.error(`Failed to delete folder ${folder.name}:`, error);
        }
    }

    return folders.length;
}

export async function POST(request: Request) {
    try {
        const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

        if (!ROOT_FOLDER_ID) {
            return NextResponse.json(
                { success: false, error: 'ROOT_FOLDER_ID not configured' },
                { status: 400 }
            );
        }

        console.log('Starting cleanup process...');

        // 1. Delete all folders in Google Drive root
        const deletedCount = await deleteAllFoldersInParent(ROOT_FOLDER_ID);

        // 2. Reset all google_folder_id fields in database
        const { error: clientError } = await supabase
            .from('clients')
            .update({ google_folder_id: null })
            .not('google_folder_id', 'is', null);

        if (clientError) {
            console.error('Error clearing client folder IDs:', clientError);
        }

        const { error: estimateError } = await supabase
            .from('estimates')
            .update({ google_folder_id: null })
            .not('google_folder_id', 'is', null);

        if (estimateError) {
            console.error('Error clearing estimate folder IDs:', estimateError);
        }

        const { error: invoiceError } = await supabase
            .from('invoices')
            .update({ google_folder_id: null })
            .not('google_folder_id', 'is', null);

        if (invoiceError) {
            console.error('Error clearing invoice folder IDs:', invoiceError);
        }

        console.log('Cleanup completed successfully');

        return NextResponse.json({
            success: true,
            message: 'Cleanup completed',
            deleted_folders: deletedCount,
        });

    } catch (error: any) {
        console.error('Cleanup failed:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}