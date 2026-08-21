const express = require('express');
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ name: "Task API", version: "1.0", endpoints: ["/tasks"] });
});
app.get('/health', (req, res) => {
    res.json({ status: "ok" });
});

let tasks = [
    { id: 1, title: "Learn Express", done: true },
    { id: 2, title: "Build CRUD API", done: false },
    { id: 3, title: "Prepare for Placements", done: false }
];
let nextId = 4;

app.get('/tasks', (req, res) => {
    res.status(200).json(tasks);
});
app.get('/tasks/:id', (req, res) => {
    const task = tasks.find(t => t.id === parseInt(req.params.id));
    if (!task) return res.status(404).json({ error: `Task ${req.params.id} not found` });
    res.status(200).json(task);
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});