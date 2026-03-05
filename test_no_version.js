import Database from 'better-sqlite3';

const db = new Database('linkedin_automate.db');
const user = db.prepare('SELECT access_token, linkedin_id FROM users LIMIT 1').get();

async function testNoVersion() {
    console.log(`Testing with NO version header`);
    const res = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify({
            initializeUploadRequest: {
                owner: `urn:li:person:${user.linkedin_id}`
            }
        })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

await testNoVersion();
