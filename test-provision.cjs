const googleapis = require('googleapis');
const path = require('path');
const fs = require('fs');

// Debug the googleapis import
console.log('Googleapis keys:', Object.keys(googleapis));

// Try direct assignment
const google = googleapis;

// Load .env manually
const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) {
        process.env[key.trim()] = val.join('=').replace(/#.*/, '').trim();
    }
});

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'laederportal-service-account.json');
const ROOT_FOLDER_ID = process.env.GDRIVE_ROOT_FOLDER_ID;
const TEST_EMAIL = 'nicholas@laederconsulting.com';

async function getDriveClient() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_PATH,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });

        // Debug: check if auth is created properly
        console.log('Auth object created:', !!auth);

        const authClient = await auth.getClient();
        console.log('Auth client obtained:', !!authClient);

        const driveClient = google.drive({ version: 'v3', auth: authClient });
        console.log('Drive client created:', !!driveClient);

        return driveClient;
    } catch (error) {
        console.error('Error in getDriveClient:', error);
        throw error;
    }
}

async function createFolder(drive, name, parentId) {
    const res = await drive.files.create({
        requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentId ? [parentId] : undefined,
        },
        fields: 'id, name',
        supportsAllDrives: true,
    });
    return res.data.id;
}

async function shareFolder(drive, folderId, email, role = 'reader') {
    await drive.permissions.create({
        fileId: folderId,
        requestBody: { type: 'user', role, emailAddress: email },
        sendNotificationEmail: false,
        supportsAllDrives: true,
    });
}

async function run() {
    console.log('--- Google Drive Connectivity Test ---');
    console.log('Root Folder ID:', ROOT_FOLDER_ID || '❌ NOT SET');
    if (!ROOT_FOLDER_ID) {
        console.error('GDRIVE_ROOT_FOLDER_ID is not set in .env. Aborting.');
        process.exit(1);
    }

    const drive = await getDriveClient();
    const ts = Date.now();

    // 1. Create a client parent folder
    console.log('\n[1] Creating client parent folder...');
    const clientFolderId = await createFolder(drive, `_TEST Client ${ts}`, ROOT_FOLDER_ID);
    console.log('    ✅ Client folder created:', clientFolderId);

    // 2. Share it with the client email
    console.log('[2] Sharing client folder with', TEST_EMAIL, '...');
    await shareFolder(drive, clientFolderId, TEST_EMAIL, 'reader');
    console.log('    ✅ Shared OK');

    // 3. Create project folder inside client folder
    console.log('[3] Creating project folder...');
    const projectFolderId = await createFolder(drive, `_TEST Project ${ts}`, clientFolderId);
    console.log('    ✅ Project folder created:', projectFolderId);

    // 4. Create all standard subfolders
    const subfolders = ['Drawings', 'Permits', 'Estimates', 'Invoices', 'Reports', 'Photos', 'Client Uploads'];
    console.log('[4] Creating subfolders:', subfolders.join(', '));
    for (const sub of subfolders) {
        const id = await createFolder(drive, sub, projectFolderId);
        console.log(`    ✅ ${sub}: ${id}`);
    }

    console.log('\n✅ All tests passed. Drive connectivity is working.');
    console.log('   Clean up: manually delete "_TEST Client ' + ts + '" from Google Drive if desired.');
}

run().catch(err => {
    console.error('\n❌ Test failed:', err.message);
    process.exit(1);
});
