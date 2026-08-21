const express = require('express');
const Database = require('better-sqlite3');
const app = express();
app.use(express.json());

const db = new Database('tasks.db');
db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        done INTEGER DEFAULT 0
    )
`);

const rowCount = db.prepare('SELECT COUNT(*) AS count FROM tasks').get().count;
if (rowCount === 0) {
    const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
    const seed = db.transaction(() => {
        insert.run("Learn Express", 1);
        insert.run("Build CRUD API", 0);
        insert.run("Prepare for Placements", 0);
    });
    seed();
}