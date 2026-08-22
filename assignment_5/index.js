const express = require('express');
const { z } = require('zod');
const { triageSchema } = require('./src/llm/schema');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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

    res.status(501).json({ error: 'Real model call not implemented yet (Stage 2)' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`LLM_STUB is set to: "${process.env.LLM_STUB}"`);
});