const fs = require('fs');
const path = require('path');

const cases = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf-8')
);

const BASE_URL = 'http://localhost:3000';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runEval() {
    let correct = 0;
    const failures = [];

    for (const testCase of cases) {
        try {
            const res = await fetch(`${BASE_URL}/triage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: testCase.input })
            });

            const data = await res.json();

            if (res.status !== 200) {
                failures.push({ input: testCase.input, reason: `HTTP ${res.status}: ${JSON.stringify(data)}` });
            } else if (data.category === testCase.expected_category) {
                correct++;
            } else {
                failures.push({
                    input: testCase.input,
                    reason: `expected "${testCase.expected_category}", got "${data.category}"`
                });
            }
        } catch (err) {
            failures.push({ input: testCase.input, reason: `Request failed: ${err.message}` });
        }

        console.log(`Completed: "${testCase.input.slice(0, 40)}..."`);
        await sleep(12000); // wait 12s between cases to respect OpenRouter's per-minute rate limit
    }

    console.log(`\n=== EVAL RESULT: ${correct}/${cases.length} correct ===\n`);

    if (failures.length > 0) {
        console.log('Failures:');
        failures.forEach(f => console.log(`  - "${f.input}" -> ${f.reason}`));
    }
}

runEval();