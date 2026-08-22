const express = require('express');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { z } = require('zod');
const { triageSchema } = require('./src/llm/schema');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const client = new OpenAI({
    baseURL: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
});

const systemPrompt = fs.readFileSync(
    path.join(__dirname, 'prompts', 'triage-v1.md'),
    'utf-8'
);

const triageInputSchema = z.object({
    text: z.string().min(1).max(2000)
});

app.post('/triage', async (req, res) => {
    const inputResult = triageInputSchema.safeParse(req.body);

    if (!inputResult.success) {
        const firstIssue = inputResult.error.issues[0];
        return res.status(400).json({
            error: `Invalid input: ${firstIssue.path.join('.')} - ${firstIssue.message}`
        });
    }

    const { text } = inputResult.data;

    if (process.env.LLM_STUB && process.env.LLM_STUB.trim() === '1') {
        const stubResponse = {
            category: 'other',
            urgency: 'low',
            confidence: 0.5,
            reason: 'Stub mode response (no model called)'
        };
        return res.status(200).json(stubResponse);
    }

    // Stage 2: real model call 
    const completion = await client.chat.completions.create({
        model: process.env.LLM_MODEL,
        temperature: 0.2,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ]
    });

    const rawText = completion.choices[0].message.content;
    console.log('RAW MODEL OUTPUT:', rawText); 

    res.status(200).json({ raw: rawText }); 
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});