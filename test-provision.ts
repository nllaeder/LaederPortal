import { createFolder, shareFolder, listPermissions, removePermission } from './src/lib/drive';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    const parent = await createFolder('Test Parent ' + Date.now(), process.env.GDRIVE_ROOT_FOLDER_ID!);
    console.log('Parent:', parent);
    await shareFolder(parent, 'nicholas@laederconsulting.com', 'viewer');
    
    const child = await createFolder('Test Child ' + Date.now(), parent);
    console.log('Child:', child);
    
    const perms = await listPermissions(child);
    console.log('Child perms:', perms);
    
    const emailPerm = perms.find(p => p.emailAddress === 'nicholas@laederconsulting.com');
    if (emailPerm) {
        console.log('Attempting to delete inherited perm:', emailPerm.id);
        try {
            await removePermission(child, emailPerm.id);
            console.log('Success deleting inherited perm!');
        } catch(e) {
            console.error('Failed to delete inherited perm:', e.message);
        }
    }
}

run().catch(console.error);
