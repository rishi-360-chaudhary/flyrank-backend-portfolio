# Put an LLM behind your API — Support Message Triage

Classifies a support message into a category and urgency so it lands on the right team.

## What it does

`POST /triage` takes a support message and returns a category (`billing`/`bug`/`feature`/`other`),
an urgency level (`low`/`normal`/`high`), a confidence score, and a one-sentence reason —
always in the same JSON shape, validated before it's returned.

See `JOB-CARD.md` for the full specification.

## How to run

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your own OpenRouter key (see below), then:

```bash
node --env-file=.env index.js
```

## Environment variables

| Variable         | Meaning                                       |
| ----------------- | ----------------------------------------------- |
| `LLM_BASE_URL`     | OpenRouter's API base URL                       |
| `LLM_API_KEY`      | Your OpenRouter API key                         |
| `LLM_MODEL`        | Which model to use                              |
| `PORT`             | Port the API listens on                         |
| `LLM_STUB`         | Set to `1` to skip the model and return a fixed test response |

## Try it

Valid request:
```bash
curl -i -X POST http://localhost:3000/triage \
  -H "Content-Type: application/json" \
  -d '{"text":"My invoice is wrong, please fix it."}'
```

Invalid request (missing field):
```bash
curl -i -X POST http://localhost:3000/triage \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Stage 2 observations

Tested three real inputs against the model:
- A clear billing complaint → correctly classified `billing`, high urgency, 0.98 confidence.
- A clear bug report → correctly classified `bug`, high urgency, 0.98 confidence.
- An ambiguous greeting ("hello is anyone there") → correctly classified `other`,
  confidence 0.4 — below the 0.5 threshold specified in the prompt's "when unsure" rule,
  exactly as intended.

Free-tier rate limiting (429s) on OpenRouter's shared pool was the main friction point
during testing — resolved by waiting between retries rather than switching models mid-build.

## Stage 3 — trustworthy output

Model output is parsed, stripped of markdown code fences if present, and validated
against the Zod schema before anything is returned. On validation failure, exactly
one repair call is made (the model receives its own broken output plus the specific
error and is asked to correct it). If the repair also fails, the request is logged to
`logs/quarantine.jsonl` (input, raw output, error, prompt version) and the endpoint
returns a clean `422` — raw model text is never returned to the caller.

Tested by temporarily forcing the prompt to demand an invalid category outside the
schema's enum. Result: one repair attempt, still invalid (the model correctly followed
the broken instruction), quarantined, and a clean `422` returned — no crash.

## Stage 4 — production-ready

- Explicit 30-second timeout on the client (overriding the SDK's 10-minute default).
- Retries only on timeout, 429, and 5xx — never on 400/401/403. Exponential backoff
  with jitter (1s, 2s, 4s), respecting `Retry-After` if the provider sends one.
- The SDK's own automatic retries were disabled (`maxRetries: 0`) so the custom
  retry logic above is the only retry path — no silent double-retrying.
- Every successful call logs prompt version, model, input/output tokens, duration,
  and retry count to `logs/cost.jsonl`.
- `LLM_ENABLED=false` skips the model entirely and returns a clean `503` — verified:
  zero model calls logged while the switch is on.

**Real-world stress test:** during development, OpenRouter's free shared pool for the
chosen model was frequently rate-limited. The retry logic was observed automatically
attempting 3 requests with increasing backoff delays before surfacing a final error —
exactly the intended behavior under sustained upstream congestion, rather than failing
on the first `429`.

## Eval results

**Score: 7/8 (87.5%)** — run on 2026-08-22, prompt version `triage-v1`.

7 of 8 hand-labeled test cases returned the correct category. The one failure
(`"asdkfjaslkdfj random gibberish text 12345"`) was an infrastructure failure
(`503`, OpenRouter free-tier rate limiting) rather than a wrong classification —
the model was never successfully queried for that case within the retry budget.

See `evals/cases.json` for all 8 cases and `evals/run-eval.js` for the runner.

## Cost per call

One typical call to `google/gemma-4-31b-it:free` (a free model — $0 per token) used
roughly 250-400 input tokens (system prompt + message) and 50-80 output tokens,
completing in under 2 seconds under normal (non-rate-limited) conditions.
At scale on a paid model of similar size, this would translate to a small fraction
of a cent per request — the real cost driver at 10,000 requests/day would be
picking a paid model tier, not this endpoint's token usage itself.

## What I'd fix with another day

The biggest friction wasn't the code — it was OpenRouter's shared free-tier pool
being inconsistently available for the chosen model during development and eval
runs. With more time, I'd add a fallback model list (try model A, fall back to
model B on repeated 429s) so the endpoint degrades gracefully instead of depending
on a single free model's availability.