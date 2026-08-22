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