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
    timeout: 30000, 
    maxRetries: 0,
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

    if (process.env.LLM_ENABLED && process.env.LLM_ENABLED.trim() === 'false') {
        return res.status(503).json({ error: 'AI triage is temporarily disabled' });
    }

    try {
        let repairCount = 0;
        const rawText = await callModel(text);
        const parsed = parseAndValidate(rawText);

        if (parsed.success) {
            return res.status(200).json(parsed.data);
        }

        repairCount = 1;
        const repairInstruction = `Your previous answer was rejected for this reason: ${parsed.error}\n\nYour previous answer was: ${rawText}\n\nReturn only corrected JSON matching the schema.`;
        const repairedText = await callModel(text, repairInstruction);
        const repairedParsed = parseAndValidate(repairedText);

        if (repairedParsed.success) {
            return res.status(200).json(repairedParsed.data);
        }

        logQuarantine(text, repairedText, repairedParsed.error);
        return res.status(422).json({ error: 'Could not get a valid answer from the model after one repair attempt' });

    } catch (err) {
        if (err.status === 408 || err.message?.includes('timeout')) {
            return res.status(504).json({ error: 'Model call timed out' });
        }
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

    return await callWithRetry(messages);
}

async function callWithRetry(messages, maxAttempts = 3) {
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const startTime = Date.now();
        try {
            const completion = await client.chat.completions.create({
                model: process.env.LLM_MODEL,
                temperature: 0.2,
                messages
            });

            const durationMs = Date.now() - startTime;
            logCost(completion, durationMs, attempt);

            return completion.choices[0].message.content;

        } catch (err) {
            lastError = err;
            const status = err.status;
            const retryable = status === 429 || status === 408 || (status >= 500 && status < 600);

            if (!retryable || attempt === maxAttempts - 1) {
                throw err;
            }

            const retryAfterHeader = err.headers?.['retry-after'];
            let waitMs;
            if (retryAfterHeader) {
                waitMs = parseInt(retryAfterHeader, 10) * 1000;
            } else {
                const baseDelay = Math.pow(2, attempt) * 1000; 
                const jitter = Math.random() * 500;
                waitMs = baseDelay + jitter;
            }

            console.log(`Retry ${attempt + 1}/${maxAttempts} after ${status} error, waiting ${Math.round(waitMs)}ms`);
            await sleep(waitMs);
        }
    }

    throw lastError;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

function logCost(completion, durationMs, retryAttempt) {
    const usage = completion.usage || {};
    const line = JSON.stringify({
        timestamp: new Date().toISOString(),
        promptVersion: 'triage-v1',
        model: process.env.LLM_MODEL,
        inputTokens: usage.prompt_tokens ?? null,
        outputTokens: usage.completion_tokens ?? null,
        durationMs,
        retryAttempt
    });
    console.log('COST LOG:', line);
    fs.appendFileSync(path.join(__dirname, 'logs', 'cost.jsonl'), line + '\n');
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});