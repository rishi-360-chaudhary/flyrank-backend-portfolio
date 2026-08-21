const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./openapi.json');

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

app.post('/tasks', (req, res) => {
    const { title } = req.body;
    if (!title || title.trim() === "") {
        return res.status(400).json({ error: "Title is required" });
    }
    const newTask = { id: nextId++, title, done: false };
    tasks.push(newTask);
    res.status(201).json(newTask);
});

app.put('/tasks/:id', (req, res) => {
    const { title, done } = req.body;
    if (title !== undefined && title.trim() === "") return res.status(400).json({ error: "Title cannot be empty" });
    const task = tasks.find(t => t.id === parseInt(req.params.id));
    if (!task) return res.status(404).json({ error: `Task ${req.params.id} not found` });
    if (title !== undefined) task.title = title;
    if (done !== undefined) task.done = done;
    res.status(200).json(task);
});
app.delete('/tasks/:id', (req, res) => {
    const taskIndex = tasks.findIndex(t => t.id === parseInt(req.params.id));
    if (taskIndex === -1) return res.status(404).json({ error: `Task ${req.params.id} not found` });
    tasks.splice(taskIndex, 1);
    res.status(204).send();
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});