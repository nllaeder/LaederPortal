// Simple test for Google Drive provisioning
// This tests the createFolder and shareFolder functions directly

require('dotenv').config();

async function testProvision() {
    console.log('Testing Google Drive provisioning...');

    // Test making a direct API call to the provisioning endpoint
    const response = await fetch('http://localhost:3000/api/provision', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (response.ok) {
        const result = await response.json();
        console.log('Provisioning test result:', result);
    } else {
        console.error('Provisioning test failed:', response.status, response.statusText);
        const error = await response.text();
        console.error('Error:', error);
    }
}

testProvision().catch(console.error);