import Database from 'better-sqlite3';
const db = new Database('linkedin_automate.db');
db.prepare("UPDATE posts SET status='pending' WHERE id='d2ylr'").run();
console.log('Done');
