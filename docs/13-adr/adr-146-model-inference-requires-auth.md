# ADR-146: Local model inference requires a login or the service token

- Status: Accepted
- Date: 2026-10-02

## Context

The Ollama and llama.cpp inference routes were `@Public()`:

- ollama-service `POST /ollama/generate` and `POST /ollama/chat`
- llamacpp-service `POST /v1/chat/completions` and `POST /v1/completions`
  (also `@SkipThrottle`), plus the SSE `GET /pull-jobs/:id/progress`

nginx proxies `/api/v1/ollama/*` and `/api/v1/llamacpp/*`, so anyone who could
reach the site could run the operator's GPU with no account. The code comment
said "auth happens at the chat-service hop", but nothing stopped a caller from
skipping that hop.

The internal routes were `@Public()` with no guard too:
`/internal/ollama/router-model`, `/internal/ollama/installed-models`,
`/internal/ollama/installed-snapshot` and `/internal/llamacpp/loaded-snapshot`.
nginx blocks `/api/v1/internal/*`, but `/api/v1/llamacpp/internal/llamacpp/loaded-snapshot`
was reachable because the llama.cpp location strips its prefix.

## Decision

Owner decision, 2026-10-02: **require login.**

1. **Inference and pull progress accept a user JWT OR the inter-service token.**
   Both services' global `AuthGuard` now reads `Authorization: Service <INTER_SERVICE_AUTH_TOKEN>`
   (constant-time compare), but only on a route marked `@AllowServiceToken()`.
   Everywhere else a service token is refused with 401
   ("Service token not accepted on this route"), so a leaked token cannot reach
   pull, delete, assign-role or model load. A user JWT goes through the normal
   path (`request.user`, `SessionRevocationGuard`, roles, permissions).
   Marked routes: ollama `POST generate`, `POST chat`; llama.cpp
   `POST v1/chat/completions`, `POST v1/completions`, `GET pull-jobs/:id/progress`.
2. **Internal routes are service-token only.** `@UseGuards(ServiceTokenGuard)` on
   `OllamaInternalController` and `CatalogInternalController`, the same pattern as
   image-service. `@Public()` stays on them only to skip the user-JWT guard; a
   user JWT is refused.
3. **Health stays public** (`/health`, `/ollama/health`).
4. **Every internal caller sends the token.** chat-service (`callOllama`,
   `callOllamaChat`, `streamLlamacpp`, `callLlamacpp`, consensus synthesis,
   research gate, local-model selection), routing-service (Ollama router,
   router probe, AI route planner, semantic intent analyzer, legacy local
   router adapter, prompt builder, snapshot sync), memory-service (extraction,
   sensitivity classifier) and workspace-service (AI-action local generation,
   model-catalog resolver). Each uses its service's `buildInterServiceAuthHeader`
   / `buildAuthHeader`. No new env var: `INTER_SERVICE_AUTH_TOKEN` already
   reaches every container through `env_file: ../.env`.
5. **The pull-progress SSE needs no ticket.** The frontend opens it with
   `connectSse` (fetch + `Authorization: Bearer`), not `EventSource`, so the
   normal JWT works.
6. **Throttling.** llama.cpp inference and both pull-progress streams keep
   `@SkipThrottle` (long-lived streams, like every SSE route). ollama
   generate/chat stay under the global throttler. How the throttler keys and
   skips service-token calls is the auth-rate-limit batch's decision, not this one.

## Consequences

- An anonymous `POST https://claw.local/api/v1/ollama/generate` now gets 401.
- The raw runtimes behind these services (Ollama 11434, stable-diffusion 7860,
  ComfyUI 8188) authenticate nobody, so their host ports are bound to
  `127.0.0.1` in both `docker-compose.*.ollama.yml` files. On `0.0.0.0` anyone
  who could reach the host would skip this guard and call `/api/generate`,
  `/api/pull` or `/api/delete` directly. Services reach them by name over
  claw-network. Pinned by `tools/__tests__/local-ai-runtime-ports.test.mjs`.
- Any new caller of these routes must send the service token, or a user JWT
  when the call is made for a user through nginx. A missing header shows up as
  `401 Missing authorization header` from ollama/llamacpp.
- Any authenticated user (every plan tier, free included) can still call
  inference directly. There is no plan or quota check in these services; the
  metered path is still chat-service. Adding a plan gate here is a separate
  decision.
- The remaining public routes were reviewed. No other route in either service
  is `@Public()`. Mutating routes already need a JWT plus
  `ADMIN_MODELS_MANAGE` (pull, delete, cancel, assign-role, catalog admin,
  discovery, packs install on ollama; pull initiate/cancel/retry, load, unload,
  config, delete weights on llama.cpp).

Rule: [`rules/16-authentication-and-authorization.md`](../../rules/16-authentication-and-authorization.md).
