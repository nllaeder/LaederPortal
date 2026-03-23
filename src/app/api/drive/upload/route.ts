import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const projectFolderId = formData.get('folderId') as string;

        if (!file || !projectFolderId) {
            return NextResponse.json(
                { success: false, error: 'File and folder ID are required' },
                { status: 400 }
            );
        }

        const drive = await getDriveClient();

        // Find the "Client Uploads" subfolder
        const { data: subfolders } = await drive.files.list({
            q: `'${projectFolderId}' in parents and name = 'Client Uploads' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
        });

        let uploadFolderId = projectFolderId; // Fallback to project folder

        if (subfolders.files && subfolders.files.length > 0) {
            uploadFolderId = subfolders.files[0].id!;
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload file to Google Drive
        const response = await drive.files.create({
            requestBody: {
                name: file.name,
                parents: [uploadFolderId],
            },
            media: {
                mimeType: file.type,
                body: buffer,
            },
            fields: 'id, name, webViewLink',
            supportsAllDrives: true,
        });

        return NextResponse.json({
            success: true,
            file: {
                id: response.data.id,
                name: response.data.name,
                webViewLink: response.data.webViewLink,
            },
        });
    } catch (error: any) {
        console.error('Error uploading file:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}