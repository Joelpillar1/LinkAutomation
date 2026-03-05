import Database from 'better-sqlite3';
const db = new Database('linkedin_automate.db');
const user = db.prepare('SELECT * FROM users WHERE id = ?').get('default_user');
console.log(JSON.stringify(user, null, 2));
db.close();
