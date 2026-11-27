# Plan: ask a question about the board

Status: agreed on 27 November 2026, with the changes from the review folded in. `docs/roadmap.md` section 5 shows how much is built.

## What it is

A box on the page takes a question in plain English, such as "Which bus routes are running latest right now?". The API passes the question to a Claude model together with three read-only tools over the current snapshot. The model calls the tools it needs and writes a short answer. The page shows the answer and, under it, each tool call the model made.

The feature is off unless `ANTHROPIC_API_KEY` is set. With no key the rest of the project runs as it does today and the box is not shown.

## What it is not

- No conversation. Each question stands alone and nothing is stored.
- No tools that change anything. Every tool reads the snapshot in memory.
- No history, forecasts or journey planning yet. The model can only report what the snapshot holds. Once history is stored, a fourth tool can read it. The tools are a list for that reason.
- No streaming of the answer.
- No deployment yet. It runs on the developer's machine with the developer's own key. A public deployment needs a daily question limit and a spend limit set in the Anthropic Console as well.

## Choices to confirm before starting

| Choice | Proposed | Why |
|--------|----------|-----|
| Where the loop runs | In `apps/api`, on the Messages API | The tools need the snapshot that lives in the API process. A hosted agent service would need the data sent out to it and would add a second thing to run. |
| Who writes the loop | A hand-written loop of about 40 lines, not the SDK's tool runner | The tool runner is in beta. A hand-written loop takes a fake model in tests, records each step for the page, and can be read in one screen. |
| Model | `claude-haiku-5-5`, set by `ASSISTANT_MODEL` | The questions are lookups, and this is the cheapest current model. The check script is how to find out whether it answers well enough. If it does not, `claude-sonnet-5-5` and `claude-opus-5-5` are a one-line change in `.env`. |
| Effort | `output_config: { effort: 'low' }`, always sent | The questions are simple lookups. The default on this model is `medium`. |
| Output limit | `max_tokens: 16000` | Thinking counts against the limit. A small limit can be used up before the answer starts. The prompt keeps the answer short. |
| Time limit | 30 seconds a model call, one retry | The SDK's default is 10 minutes and two retries, which would leave the page waiting. |
| Refusal fallback | Not used. A `refusal` stop reason returns a fixed sentence. | `claude-haiku-5-5` has no server-side fallback. |
| Spend guard | At most 20 questions an hour, counted in memory | A bug in the page or a loop in a test cannot run up a bill. |

## HTTP contract

`POST /api/ask`

Request body:

```json
{ "question": "Which bus routes are running latest right now?" }
```

`question` is text of 1 to 300 characters after trimming.

Response 200:

```json
{
  "answer": "Three bus services are more than ten minutes late. ...",
  "steps": [
    {
      "tool": "list_delays",
      "input": { "mode": "bus", "sort": "delay", "order": "desc", "limit": 5 },
      "summary": "5 of 13 services"
    }
  ],
  "model": "claude-haiku-5-5",
  "usage": { "inputTokens": 2130, "outputTokens": 164 },
  "feedSource": "fixture",
  "feedTimestamp": "2026-11-24T01:54:00.000Z"
}
```

Errors, all in the existing `ApiError` shape:

| Status | When |
|--------|------|
| 400 | `question` is missing, empty or too long |
| 429 | The hourly question limit is reached |
| 502 | The model call failed, or the loop hit its step limit |
| 503 | No key is set, or there is no snapshot yet |

`GET /api/health` gains `assistant: boolean`. The page reads it to decide whether to show the box.

## Tools

Each tool has a zod schema for its input. The loop parses the model's input with that schema before the tool runs. All three call functions that already exist in `delays/`. The model never sees a route id: riders do not know them, and a question names a route by its short name.

| Tool | Input | Returns | Built on |
|------|-------|---------|----------|
| `get_summary` | none | Counts per mode and status, whether the data is stale | `summariseModes` |
| `list_delays` | `mode`, `status`, `q`, `sort`, `order`, `limit` (1 to 20, default 10), all optional | `total` and the matching services, each cut down to route, mode, status, delay in whole minutes, stop name | `selectServices` |
| `get_route` | `route`, the name a rider uses, such as `70` or `NX1` | The route's running services, at most 20, or a message that none are running | `selectServices` |

Tool results are JSON text. A result holds at most 20 services, so one question cannot pull the whole snapshot into the prompt.

## The loop

`runAsk(question, deps)` in `apps/api/src/assistant/loop.ts`. `deps` holds the model client, the tools and the snapshot. It does no I/O of its own.

1. Send the system prompt, the tools and the question.
2. If `stop_reason` is `tool_use`: append the reply's whole `content` to the messages as it came, thinking blocks included, then parse each tool call's input, run the tool, and send back every result in one user message. A call to an unknown tool or with bad input gets a result with `is_error: true` and the reason, so the model can correct itself. Record a step for each call.
3. If `stop_reason` is `end_turn`: return the text and the steps.
4. If `stop_reason` is `refusal` or `max_tokens`: return a fixed sentence saying the question could not be answered.
5. Stop after 5 model calls and report an error.

The system prompt is fixed text. It says: answer only from tool results; start with the answer; say only what was asked; count a service as late only when its status is late or very late; leave cancelled services out unless the question is about them; give delays in minutes; say when the data is stale; say plainly when the snapshot cannot answer the question; keep the answer under 60 words. A note that the data is stale goes in the user message after the question, so the system prompt never changes.

The model does not say whether the data is live or a recording. The page says it under the answer, from `feedSource` in the response. The first version had the model say it, and every answer opened with that sentence before the answer itself.

Route and stop names come from AT and reach the model inside tool results. The tools only read, so text in a name cannot make the model change anything.

## Files

```
packages/shared/src/index.ts        AskRequest, AskResponse, AskStep; assistant on Health
apps/api/src/config/config.ts       ANTHROPIC_API_KEY, ASSISTANT_MODEL, ASSISTANT_QUESTIONS_PER_HOUR
apps/api/src/assistant/
  index.ts                          public surface
  tools.ts                          the three tools and their schemas
  loop.ts                           runAsk
  prompt.ts                         the system prompt
  limiter.ts                        questions per hour, with an injected clock
  assistant.ts                      one question: check for data, take from the limit, run the loop
  anthropic-client.ts               the only file that builds the SDK client
apps/api/src/http/app.ts            POST /api/ask, assistant on /api/health
apps/api/src/compose.ts             build the assistant when a key is set
apps/api/src/ask-check.ts           the check script
apps/web/src/api/client.ts          ask()
apps/web/src/features/ask/          the box, the answer, the steps
.env.example                        the three variables
docs/architecture.md, decisions.md, roadmap.md, README.md
```

`anthropic-client.ts` wraps `client.messages.create` behind a small interface, `ModelClient`, that `loop.ts` depends on. The other files import only types from the SDK. The key comes from `config`, passed in as `new Anthropic({ apiKey })`. Nothing else reads the environment.

## Tests

No test calls the real API. `npm test` needs no key and costs nothing.

- `tools.test.ts`: each tool against the recorded fixture; the limit of 20; a route with no running services.
- `loop.test.ts`, with a scripted fake `ModelClient`: an answer with no tool call; one tool call then an answer, with the thinking block sent back; two tool calls in one turn return two results in one message; an unknown tool; input that fails its schema; the step limit; `refusal`; `max_tokens`.
- `limiter.test.ts`: the limit, and the window moving with the clock.
- `config.test.ts`: the three variables, their defaults, and no key meaning the feature is off.
- `app.test.ts`: each row of the error table; a 200 with a fake assistant; `assistant` on health.
- `client.test.ts` and `features/ask/*.test.tsx`: the request; loading, answer, steps and error states; the box hidden when health says the assistant is off.

## Commits

Add these lines to `docs/roadmap.md` as section 5 before starting. One line is one commit.

1. `shared`: `AskRequest`, `AskResponse`, `AskStep`; `assistant` on `Health`
2. `config`: `ANTHROPIC_API_KEY`, `ASSISTANT_MODEL`, `ASSISTANT_QUESTIONS_PER_HOUR`; `.env.example`
3. `assistant`: the three tools over a snapshot; add `@anthropic-ai/sdk` to `apps/api` for its types
4. `assistant`: the loop with an injected model client
5. `assistant`: the hourly question limit
6. `assistant`: the Anthropic client behind `ModelClient`
7. `http`: `POST /api/ask` and `assistant` on `GET /api/health`
8. `web/api`: `ask()`
9. `web/features/ask`: the box, the answer and the steps
10. Docs: architecture, three decisions entries (hand-written loop; read-only tools and the spend guard; the model), README
11. `ask:check`: fixed questions against the fixture with the real model

Commits 1 to 10 need no key to write or to test. Commit 6 is the first that can be tried against the real API, by hand. Commit 11 is the first that has to be.

## The check script

`npm run ask:check -w apps/api` runs about eight fixed questions against the fixture with the real model and prints, for each, the tools called and whether the answer names the expected route. It needs a key and costs a few cents a run, so it is not part of `npm test`. It gives a way to tell whether a change to the prompt or the model made the answers better or worse, and it is how the choice of `claude-haiku-5-5` gets checked.

## Done means

- With no key: `npm install`, `npm run dev` and `npm test` behave as they do today, and the page has no box.
- With a key: these three questions each return a correct answer on the fixture, and the steps shown match what the model called.
  - "Which bus routes are running latest right now?"
  - "Are the trains on time?"
  - "Is anything cancelled?"
- A question the data cannot answer, such as "Will the 70 be late tomorrow?", gets an answer that says so.
- `npm test`, `npm run typecheck` and `npm run lint` pass.
- No key in the repository, in a commit or in a log line.

## Checked on 27 November 2026

- `npm run ask:check -w apps/api` passed 8 of 8 with `claude-haiku-5-5` at `low` effort on the fixture.
- The first run used 24,648 input tokens and 2,052 output tokens. At list price (0.10 US dollars a million input tokens, 0.50 output) that is about 0.35 of a cent for eight questions.
- After the prompt was changed to answer first and leave out what was not asked, the script passed 8 of 8 again with 26,333 input tokens and 1,777 output tokens.
- One question through the page took about 2.5 seconds.

## Not checked

- The token counts in the example response above are made up.
- Questions outside the eight in the check script.
- Answers on live data. The run used the recorded sample.
