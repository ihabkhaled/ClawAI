# ADR-128 — Free local speech: one CPU container, offered as the LOCAL provider

## Status

Accepted — 2026-09-29. Builds on [ADR-082](adr-082-payg-classification-grain.md)
(exempt providers) and [ADR-111](adr-111-file-writer-hardening-from-the-model-matrix.md) (transcription
and read-aloud).

## Context

Speech-to-text (file-service) and read-aloud (chat-service) only worked through
a cloud connector (Gemini, OpenAI), so a stack with no connector, or with an
exhausted one, had no speech at all, and every second/character was metered.

## Decision

1. **One image-only container, `speech`** — `ghcr.io/speaches-ai/speaches:0.8.3-cpu`
   (pinned), declared in `docker/docker-compose.{dev,prod}.ollama.yml` under the
   `local-ai` profile like ollama/comfyui. OpenAI-compatible
   `/v1/audio/transcriptions` (faster-whisper) and `/v1/audio/speech` (Kokoro).
   No published port, no nginx route: only file-service and chat-service call it
   over `claw-network`.
2. **Models are installed by the compose entrypoint, not lazily.** Verified
   against the real image: speaches does not pull on demand — an uninstalled
   model is a 404 `not installed locally`. The entrypoint starts the server, then
   `POST /v1/models/{id}` for `Systran/faster-whisper-small` (multilingual) and
   `speaches-ai/Kokoro-82M-v1.0-ONNX`, into the `speech-models-data` volume.
   The ids are pinned in code (`LOCAL_TRANSCRIPTION_MODEL`, `LOCAL_TTS_MODEL`); the
   compose file and the constants change together.
3. **A `LOCAL` provider that reuses the OpenAI adapters** with the container's
   base URL (`transcribeWithOpenAi`, `SpeechProviderClient.openAi`). No new
   adapter. It is not a connector: no key exists (an inert `local` bearer is sent
   and ignored), so `fetchConnectorConfig` / `resolveCredentials` build the config
   locally instead of calling connector-service.
4. **Order.** STT: LOCAL is appended after every cloud candidate, and is the only
   candidate when no cloud connector is audio-capable, or connector-service is
   down. Read-aloud: the admin `TTS_VOICE` rows first, LOCAL last with the fixed
   voice `af_heart`. Either way it is offered **only while `GET /health`
   answers** (2 s probe), so an API-only install (container never created) costs
   nothing and shows nothing.
5. **Unmetered by the existing mechanism**: `'LOCAL'` joins
   `PAYG_EXEMPT_PROVIDERS` (with OLLAMA, LLAMACPP). auth-service
   `isExemptProvider` and chat `paygMeter` return `metered: false`; nothing new.
6. **One env var, unavoidable**: `LOCAL_SPEECH_BASE_URL` (default
   `http://speech:8000`, blank = off) in both services' AppConfig. The SSRF guard
   only allows hosts from `*_URL`-style env vars or a `declaredHost` the caller
   passes, and the deployment topology is not a DB-level setting (rule 15).
7. **No workspace package**: the service is an image, so there is no
   `package.json`, no `ci.yml` matrix entry and no health-service probe (which
   probes NestJS `/api/v1/health` endpoints, not runtime containers like ollama).

## Consequences

- Free, offline STT and read-aloud on any stack with `CLAW_LOCAL_AI=true`.
- The first start downloads roughly 0.8 GB of models; the container reports
  healthy as soon as the server answers, before the models finish, so speech can
  404 (and fall through the chain) until the pull ends.
- TTS returns mp3 or wav only (no opus/aac): the OpenAI path asks for mp3.
- Not proven live: the mp3 `response_format` path (wav was); the compose
  entrypoint was run with the tiny English STT model, not `whisper-small`.
