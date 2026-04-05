// Direct test of Google Drive functionality without Next.js
// Using CommonJS to avoid module issues

const googleapis = require('googleapis');
console.log('🔍 Debug - googleapis keys:', Object.keys(googleapis));
console.log('🔍 Debug - google exists:', !!googleapis.google);

const google = googleapis.google || googleapis;
const path = require('path');
const fs = require('fs');

// Load environment variables manually
const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length && !key.startsWith('#')) {
        process.env[key.trim()] = val.join('=').replace(/#.*/, '').trim();
    }
});

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'laederportal-service-account.json');
const ROOT_FOLDER_ID = process.env.GDRIVE_ROOT_FOLDER_ID;

console.log('🧪 Direct Google Drive Test Starting...');
console.log('📂 Root Folder ID:', ROOT_FOLDER_ID);
console.log('🔑 Service Account File:', fs.existsSync(SERVICE_ACCOUNT_PATH) ? '✅ Found' : '❌ Missing');

async function getDriveClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_PATH,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const authClient = await auth.getClient();
    return google.drive({ version: 'v3', auth: authClient });
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

async function testProjectStructure() {
    try {
        console.log('\n1️⃣ Initializing Google Drive client...');
        const drive = await getDriveClient();
        console.log('✅ Drive client initialized successfully');

        const timestamp = Date.now();
        const testClientName = `🧪 TEST Client ${timestamp}`;
        const testProjectName = `🧪 TEST Project ${timestamp}`;
        const testEmail = 'nicholas@laederconsulting.com';

        console.log('\n2️⃣ Creating client parent folder...');
        const clientFolderId = await createFolder(drive, testClientName, ROOT_FOLDER_ID);
        console.log(`✅ Client folder created: ${clientFolderId}`);

        console.log('\n3️⃣ Sharing client folder with test email...');
        await shareFolder(drive, clientFolderId, testEmail, 'reader');
        console.log(`✅ Shared with ${testEmail}`);

        console.log('\n4️⃣ Creating project folder...');
        const projectFolderId = await createFolder(drive, testProjectName, clientFolderId);
        console.log(`✅ Project folder created: ${projectFolderId}`);

        console.log('\n5️⃣ Creating standard subfolders...');
        const subfolders = ['Drawings', 'Permits', 'Estimates', 'Invoices', 'Reports', 'Photos', 'Client Uploads'];

        for (const subfolder of subfolders) {
            const subfolderId = await createFolder(drive, subfolder, projectFolderId);
            console.log(`  ✅ ${subfolder}: ${subfolderId}`);
        }

        console.log('\n🎉 TEST SUCCESSFUL!');
        console.log(`📁 Test folders created under: https://drive.google.com/drive/folders/${clientFolderId}`);
        console.log('🧹 Please manually delete the test folders from Google Drive.');

        return {
            success: true,
            clientFolderId,
            projectFolderId,
            testClientName,
            testProjectName
        };

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('Full error:', error);
        return { success: false, error: error.message };
    }
}

testProjectStructure()
    .then(result => {
        if (result.success) {
            console.log('\n✨ All tests passed! The Google Drive provisioning is working correctly.');
        } else {
            console.log('\n💥 Tests failed. Check the error above.');
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('\n🔥 Unexpected error:', err);
        process.exit(1);
    });