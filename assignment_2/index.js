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

app.get('/tasks', (req, res) => {
    const tasks = db.prepare('SELECT * FROM tasks').all();
    res.status(200).json(tasks);
});
app.get('/tasks/:id', (req, res) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.status(200).json(task);
});

app.post('/tasks', (req, res) => {
    const { title } = req.body;
    if (!title || title.trim() === "") return res.status(400).json({ error: "Title is required" });
    const info = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)').run(title, 0);
    const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newTask);
});