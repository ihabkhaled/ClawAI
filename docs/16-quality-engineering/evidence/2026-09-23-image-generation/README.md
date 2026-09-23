# Evidence: image generation always errors (2026-09-23)

Fix commit: `d0c7d70f2c828a67beb3aca07038e130ee87a4ba` on `origin/main`.

**Live re-verification of THIS fix is pending** — the dev stack runs from the
main checkout (`D:\Freelance\Claw`), which had not pulled this commit at the
time this evidence was captured (worktree-isolation rules for this task
forbid touching the main checkout directly). Everything below is the "before"
evidence that reproduces and root-causes each failure, plus the provider
compatibility probes used to write the fix and its tests. The runbook
(`docs/11-runbooks/runbook-image-generation-failure.md`) has the commands to
re-run after the main checkout pulls and `claw-image-service` +
`claw-chat-service` are restarted.

## 1. Repro — Gemini via the connector-model list (the bug)

Request: `POST /api/v1/chat-messages` with `provider: GEMINI`,
`model: models/gemini-2.5-flash-image` (a real, EXPOSED connector model —
this is what the composer offers under the "Gemini" group, not the separate
"Gemini (Image)" capability row).

```
== GEMINI models/gemini-2.5-flash-image thread=cmue8tl4z000bdfp6ofbxrg45 HTTP 201
ASSISTANT: GEMINI models/gemini-2.5-flash-image | Here's an image of a red apple on a wooden table:
```

No image, no error — a plain chat completion that describes an image instead
of returning one. The stored `image_generations` table has no row for this
attempt (confirmed via `select * from image_generations order by created_at
desc`). Root cause: chat-service routed the request to `/chat/completions`
because nothing recognised `models/gemini-2.5-flash-image` as an image model.

## 2. Repro — Grok via the connector-model list (the bug)

```
== GROK grok-imagine-image thread=cmue8tg8b0005dfp6k4p5f7f2 HTTP 201
ASSISTANT: GROK grok-imagine-image | ⚠️ {"code":"invalid-argument","error":"The model grok-imagine-image is an image model and is therefore not available on this endpoint. Please use a compatible endpoint such as https://api.x.ai/v1/images/generations. For more information, see https://docs.x.ai/docs/api-reference#image-generation"}

== GROK grok-imagine-image-quality thread=cmue8tiow0008dfp6rxhjvy83 HTTP 201
ASSISTANT: GROK grok-imagine-image-quality | ⚠️ {"code":"invalid-argument","error":"The model grok-imagine-image-quality is an image model and is therefore not available on this endpoint. ..."}
```

xAI's own refusal reached the user raw — a JSON error blob, not a translated
sentence. Root cause: same as above; `GROK/grok-imagine-image*` reached
`/chat/completions` and xAI's chat endpoint categorically refuses image
models.

## 3. Repro — OpenAI via the connector-model list (the bug, historical DB evidence)

From `chat_messages` (captured before this session, same root cause):

```
OPENAI | chatgpt-image-latest | ⚠️ Every available AI provider failed to respond (tried OPENAI/chatgpt-image-latest). Please try again shortly.
metadata: {"error": true, "errorCode": "LLM_EXECUTION_FAILED", ...}
```

## 4. Repro — IMAGE_GEMINI capability row (reached image-service, different bug)

```
== IMAGE_GEMINI gemini-2.5-flash-image thread=cmue8u1pp000idfp6o3z13smw HTTP 201
ASSISTANT: IMAGE_GEMINI gemini-2.5-flash-image | Generating image…
```

image-service logs (`docker logs claw-image-service`):

```
[LOG] [AxiosHttpClient] httpPost: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=<REDACTED> ok status=200 durationMs=5843
[LOG] [GeminiImageAdapter] Gemini image generated via gemini-2.5-flash-image
[ERROR] [AxiosHttpClient] httpPost: POST https://file-service:4006/api/v1/internal/files/store-image failed after 6ms — connect ECONNREFUSED 172.18.0.36:4006
[ERROR] [ImageGenerationService] image_generation.failed id=cmue8u20o0005a4qqr9rztfag code=PROVIDER_FAILURE: connect ECONNREFUSED 172.18.0.36:4006
```

The Gemini call SUCCEEDED (200, image bytes returned) and was billed —
`storeImage` then failed because `claw-file-service` was down in the dev
stack at capture time (an unrelated, pre-existing dev-environment outage: the
main checkout had uncommitted file-service edits that did not compile — see
QA agent's live message during this session). Before this fix, that failure
was stored as `PROVIDER_FAILURE` ("Image generation failed. Please try
again."), indistinguishable from a real Gemini refusal, and the AUTO fallback
chain would have gone on to pay two more providers for images it would lose
the same way. After this fix, it is stored as `IMAGE_STORAGE_FAILED`
("The image was generated but could not be saved…") and the AUTO chain stops
(`isChainTerminalFailureCode`).

Also visible in the same log window: `GET /images/generations` with the API
key as `?key=<REDACTED>` in the URL — the shared HTTP client logs request
URLs, so **the Gemini API key was written to the image-service log in plain
text on every generation** before this fix moved it to the `x-goog-api-key`
header.

## 5. Repro — IMAGE_OPENAI with `dall-e-3` (genuine provider refusal)

```
[ERROR] [AxiosHttpClient] httpPost: POST https://api.openai.com/v1/images/generations failed after 1381ms — Request failed with status code 400
[ERROR] [OpenAIImageAdapter] generateWithOpenAI: OpenAI refused model=dall-e-3 size=1024x1024 — The model 'dall-e-3' does not exist.
```

This is a real provider refusal (OpenAI retired `dall-e-3` for this account),
not our bug. Before this fix it stored the same generic `PROVIDER_FAILURE`
sentence as every other cause. After this fix it classifies to
`IMAGE_MODEL_UNAVAILABLE` — "This image model is not available from the
provider any more. Pick another image model." — actionable and specific.

## 6. Live provider probes (used to write the fix + its tests)

Run from inside `claw-image-service` against the real connector credentials
(never printed — only status codes and response shapes). Script:
`probe.mjs` (kept in the session scratchpad, reproduced here for the record).

```js
// inside claw-image-service container
const cfg = await fetch(
  `${CONNECTOR_SERVICE_URL}/api/v1/internal/connectors/config?provider=GROK`,
).then((r) => r.json());
await fetch(`${cfg.baseUrl ?? 'https://api.x.ai/v1'}/images/generations`, {
  method: 'POST',
  headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    model: 'grok-imagine-image',
    prompt: 'a red apple on a wooden table',
    n: 1,
    response_format: 'b64_json',
  }),
});
```

xAI — all three Grok image models confirmed working with
`{model, prompt, n, response_format: 'b64_json'}`:

```
grok baseUrl (default) hasKey true
## xai grok-imagine-image -> HTTP 200
{"data":[{"b64_json":"<string len=330932>","mime_type":"image/jpeg"}],"usage":{"cost_in_usd_ticks":200000000}}
## xai grok-imagine-image-2.0 -> HTTP 200
{"data":[{"b64_json":"<string len=435072>","mime_type":"image/jpeg"}],"usage":{"cost_in_usd_ticks":400000000}}
## xai grok-imagine-image-quality -> HTTP 200
{"data":[{"b64_json":"<string len=428180>","mime_type":"image/jpeg"}],"usage":{"cost_in_usd_ticks":500000000}}
```

Gemini — `generateContent` confirmed working for every `gemini-*-image*`
catalog model; `imagen-*` confirmed SHUT DOWN (404 on both `:predict` and
`:generateContent`, matching Google's own migration notice: "Imagen models
are shut down. Use Nano Banana for image generation."):

```
## predict imagen-4.0-generate-001 -> HTTP 404
{"error":{"code":404,"message":"<string len=194>","status":"NOT_FOUND"}}
## predict imagen-4.0-fast-generate-001 -> HTTP 404
{"error":{"code":404,"message":"<string len=199>","status":"NOT_FOUND"}}
## generateContent gemini-3-pro-image -> HTTP 200
{"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"image/jpeg", ...}}],"role":"model"}],"finishReason":"STOP", ...}
## generateContent gemini-3.1-flash-image -> HTTP 200   (similar)
## generateContent gemini-3.1-flash-lite-image -> HTTP 200   (similar)
## generateContent gemini-3.1-flash-image-preview -> HTTP 200   (similar)
## generateContent gemini-3-pro-image-preview -> HTTP 200   (similar)
```

## 7. Test evidence (from the worktree, on the pushed commit)

```
$ cd apps/claw-image-service && npm run typecheck && npm test
 Test Files  19 passed (19)
      Tests  135 passed (135)

$ cd apps/claw-chat-service && npm run typecheck && npx vitest run <touched specs>
 Test Files  2 passed (2)
      Tests  81 passed (81)

$ cd apps/claw-chat-service && npm test   (full suite)
 Test Files  165 passed (165)
      Tests  2095 passed (2095)

$ npm run knowledge:verify && npm run audit:check && npm run knowledge:coverage
knowledge:verify OK
audit:check OK
knowledge:coverage OK
```

Both services `npm run build` succeeded with no errors.

## 8. Lanes NOT run (honest gaps)

- **Browser/Playwright UI lane**: not run this session — every repro above
  used the chat API directly (`POST /api/v1/chat-messages`), not the
  composer UI. The UI dispatches the same endpoint with the same
  `provider`/`model` pair the composer's model picker already sends (see
  `apps/claw-frontend/src/hooks/chat/use-available-models.ts`), so the same
  redirect applies, but no screenshot or DOM-level confirmation was captured.
- **Post-deploy live confirmation of this exact commit**: pending — the main
  checkout must `git pull` to `d0c7d70f2c828a67beb3aca07038e130ee87a4ba` and
  `claw-image-service` + `claw-chat-service` (all replicas in prod) must
  restart. See `docs/11-runbooks/runbook-image-generation-failure.md`.
- **Generated PNG files**: none saved — no successful end-to-end image
  generation was captured live in this session (the two "IMAGE_GEMINI"
  attempts that reached the provider both then hit the pre-existing
  file-service outage described in §4, which was an unrelated dev-environment
  condition, not part of this fix).
- **Config-only fix via an existing admin API**: none applied — every root
  cause found was a code bug (chat-service routing, Gemini key placement,
  generic error classification), not a DB-level flag a connector admin
  action could toggle.
