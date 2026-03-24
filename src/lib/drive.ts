import { google } from 'googleapis';
import path from 'path';

const SERVICE_ACCOUNT_PATH = path.join(process.cwd(), 'laederportal-service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly', 'https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive'];

/**
 * Initializes the Google Drive client using the service account key.
 */
async function getDriveClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_PATH,
        scopes: SCOPES,
    });
    return google.drive({ version: 'v3', auth });
}

/**
 * Creates a folder in Google Drive.
 */
export async function createFolder(name: string, parentId?: string): Promise<string> {
    const drive = await getDriveClient();
    const fileMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
    };

    const res = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
        supportsAllDrives: true,
    });

    if (!res.data.id) {
        throw new Error(`Failed to create folder: ${name}`);
    }

    return res.data.id;
}

/**
 * Shares a folder with a specific email address.
 */
export async function shareFolder(folderId: string, email: string, role: 'viewer' | 'writer' = 'viewer'): Promise<void> {
    const drive = await getDriveClient();
    await drive.permissions.create({
        fileId: folderId,
        requestBody: {
            type: 'user',
            role,
            emailAddress: email,
        },
        sendNotificationEmail: false,
        supportsAllDrives: true,
    });
}

/**
 * Lists permissions for a file/folder.
 */
export async function listPermissions(fileId: string): Promise<any[]> {
    const drive = await getDriveClient();
    const res = await drive.permissions.list({
        fileId,
        fields: 'permissions(id, type, role, emailAddress, deleted)',
        supportsAllDrives: true,
    });
    return res.data.permissions || [];
}

/**
 * Removes a specific permission from a file/folder.
 */
export async function removePermission(fileId: string, permissionId: string): Promise<void> {
    const drive = await getDriveClient();
    await drive.permissions.delete({
        fileId,
        permissionId,
        supportsAllDrives: true,
    });
}
