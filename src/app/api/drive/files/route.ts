import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

const SERVICE_ACCOUNT_PATH = path.join(process.cwd(), 'laederportal-service-account.json');

async function getDriveClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_PATH,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const folderId = searchParams.get('folderId');

        if (!folderId) {
            return NextResponse.json({ success: false, error: 'Folder ID required' }, { status: 400 });
        }

        const drive = await getDriveClient();

        // Get all subfolders of the project folder
        const { data: subfolders } = await drive.files.list({
            q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
        });

        const folders = [];

        for (const subfolder of subfolders.files || []) {
            // Get files in each subfolder
            const { data: filesData } = await drive.files.list({
                q: `'${subfolder.id}' in parents and trashed = false`,
                fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink)',
                supportsAllDrives: true,
                orderBy: 'modifiedTime desc',
            });

            folders.push({
                id: subfolder.id,
                name: subfolder.name,
                files: filesData.files || [],
            });
        }

        // Sort folders by name
        folders.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({
            success: true,
            folders,
        });
    } catch (error: any) {
        console.error('Error fetching drive files:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}