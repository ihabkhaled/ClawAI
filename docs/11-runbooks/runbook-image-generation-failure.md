# Runbook: Image Generation Fails

## Symptoms

- Picking a Gemini/Grok/OpenAI image model and asking for an image always errors
- Chat shows "Every available AI provider failed to respond" or "⚠️ {code:
  invalid-argument, error: ... is an image model and is therefore not
  available on this endpoint}" verbatim
- Chat shows "The selected model is not available" for a model that IS
  configured and exposed
- The image bubble shows "Image generation failed. Please try again." with no
  further detail

## First question: did the request even reach image-service?

```bash
docker exec claw-pg-images psql -U claw -d claw_images -c \
  "select id, provider, model, status, error_code, left(error_message,200), created_at
   from image_generations order by created_at desc limit 10"
```

**No new row for the attempt** → chat-service never redirected the request to
image-service. This is the "picked an image model, chat tried to answer it
like text" bug (fixed 2026-09-23, see below) — check chat-service logs instead:

```bash
docker logs --since 10m claw-chat-service-1 | grep -iE "image-output|IMAGE_GEMINI|IMAGE_GROK|IMAGE_OPENAI|callImageService"
```

If you see `callProvider: routing to cloud provider` for a model matching
`models/gemini-*-image`, `imagen-*`, `grok-imagine-image*`,
`gpt-image*`/`dall-e-*`/`chatgpt-image*` instead of
`callProvider: routing to image service`, the redirect in
`apps/claw-chat-service/src/modules/chat-messages/services/chat-messages.service.ts`
(`detectImageOutputModel` → `resolveImageCapabilityProvider`) either isn't
deployed yet or its pattern in
`apps/claw-chat-service/src/modules/chat-messages/constants/image-generation-target.constants.ts`
doesn't match the new model id — add it there, it's a per-connector regex.

**A row exists with `status = FAILED`** → read `error_code`. Every code is
documented in the "Failure taxonomy" table of
`docs/04-backend/service-guide-image.md`; the short version:

| error_code                       | Likely cause                                                                                                                                            | Where to look                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IMAGE_PROVIDER_AUTH_FAILED`     | Connector API key is wrong/revoked, or (Gemini) malformed                                                                                               | Admin → Connectors; connector-service logs for the `GET /internal/connectors/config` call                                                                               |
| `IMAGE_PROVIDER_QUOTA_EXCEEDED`  | Provider account is out of quota/billing                                                                                                                | Provider's own dashboard — not our bug                                                                                                                                  |
| `IMAGE_MODEL_UNAVAILABLE`        | Model id retired/renamed by the provider, or (Gemini) an `imagen-*` catalog entry — Imagen is shut down in the Gemini API and `generateContent` 404s it | Check the adapter's fallback list still has a working `gemini-*-image` model in `IMAGE_CAPABLE_MODELS`; for OpenAI, check the model id against OpenAI's current catalog |
| `IMAGE_CONTENT_REJECTED`         | Provider's safety/content filter blocked the prompt                                                                                                     | Genuine provider refusal — surfaced to the user, not actionable here                                                                                                    |
| `IMAGE_PROVIDER_UNAVAILABLE`     | Provider 5xx or network timeout                                                                                                                         | Retry; check the provider's status page                                                                                                                                 |
| `IMAGE_CONNECTOR_NOT_CONFIGURED` | No connector row for the chat provider this image capability borrows from (`IMAGE_GROK` needs a `GROK` connector, etc.)                                 | Admin → Connectors → add/enable the connector                                                                                                                           |
| `IMAGE_STORAGE_FAILED`           | The provider generated the image but `file-service` was unreachable when image-service tried `POST /internal/files/store-image`                         | `docker logs claw-file-service`; `docker ps` — is the container even up? AUTO fallback does NOT retry this one (storage is shared, retrying wastes provider spend)      |
| `PROVIDER_FAILURE`               | Unclassified — read the raw log line, not the stored message                                                                                            | `docker logs --since 10m claw-image-service`                                                                                                                            |

## Read the real error, never the stored one

The stored `error_message` is a FIXED sentence per code (never the provider's
own words — see the failure-taxonomy note in
`apps/claw-image-service/CLAUDE.md`). To see what the provider actually said:

```bash
docker logs --since 10m claw-image-service | grep -iE "ERROR|refused|failed"
```

Never `grep` for the raw API key — every log line here has already had it
redacted or was never given it in the first place (Gemini's key rides in the
`x-goog-api-key` header, not the URL, specifically so it never appears in a
logged request line).

## Live probe against the real provider (bypasses chat entirely)

Useful to tell "our bug" from "provider genuinely refuses this". Run from
inside `claw-image-service` so the connector key never leaves the container:

```bash
# Get a connector's key without printing it, then call the provider directly.
# See docs/16-quality-engineering/evidence/2026-09-23-image-generation/README.md
# for the exact probe script used to reproduce every model live.
```

## Every image-capable model, for a full sweep

```bash
docker exec claw-pg-connector psql -U claw -d claw_connectors -At -c \
  "select c.provider, m.model_key, m.exposure from connector_models m
   join connectors c on c.id = m.connector_id
   where m.model_key ~* '(image|imagen|dall-e)' order by 1,2"
```

Pick each one in the composer (or via `POST /api/v1/chat-messages` with
`routingMode: MANUAL_MODEL`) and confirm a picture comes back.

## Containers to restart after a code change here

- `claw-image-service` — any adapter/manager/failure-taxonomy change
- `claw-chat-service-1` (or all chat-service replicas in prod) — any change to
  `image-generation-target.{utility,constants}.ts` or
  `chat-execution.manager.ts`'s image dispatch

Both are `docker restart` (dev) — the dev entrypoint runs `tsgo --watch` over a
bind mount, so a plain restart is enough once the code has landed in the main
checkout; a stale binary is the usual reason a fix "doesn't work" live.
