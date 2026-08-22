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

    try {
        const rawText = await callModel(text);
        const parsed = parseAndValidate(rawText);

        if (parsed.success) {
            return res.status(200).json(parsed.data);
        }

        const repairInstruction = `Your previous answer was rejected for this reason: ${parsed.error}\n\nYour previous answer was: ${rawText}\n\nReturn only corrected JSON matching the schema.`;
        const repairedText = await callModel(text, repairInstruction);
        const repairedParsed = parseAndValidate(repairedText);

        if (repairedParsed.success) {
            return res.status(200).json(repairedParsed.data);
        }

        logQuarantine(text, repairedText, repairedParsed.error);
        return res.status(422).json({ error: 'Could not get a valid answer from the model after one repair attempt' });

    } catch (err) {
        console.log('MODEL CALL FAILED:', err.status, err.message);
        return res.status(503).json({ error: 'Model temporarily unavailable, try again shortly' });
    }
});

async function callModel(userText, repairInstruction = null) {
    const messages = [{ role: 'system', content: systemPrompt }];
    messages.push({ role: 'user', content: userText });

    if (repairInstruction) {
        messages.push({ role: 'user', content: repairInstruction });
    }

    const completion = await client.chat.completions.create({
        model: process.env.LLM_MODEL,
        temperature: 0.2,
        messages
    });

    return completion.choices[0].message.content;
}

function parseAndValidate(rawText) {
    let cleaned = rawText.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

    let jsonObj;
    try {
        jsonObj = JSON.parse(cleaned);
    } catch (e) {
        return { success: false, error: `Not valid JSON: ${e.message}` };
    }

    const result = triageSchema.safeParse(jsonObj);
    if (!result.success) {
        return { success: false, error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') };
    }

    return { success: true, data: result.data };
}

function logQuarantine(input, rawOutput, error) {
    const line = JSON.stringify({
        timestamp: new Date().toISOString(),
        input,
        rawOutput,
        error,
        promptVersion: 'triage-v1'
    }) + '\n';

    fs.appendFileSync(path.join(__dirname, 'logs', 'quarantine.jsonl'), line);
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});