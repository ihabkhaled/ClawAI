# ADR-165: Provider keys are served only to services, and model prices are synced from providers

**Status:** Accepted

**Date:** 2026-10-11

## Decision

**Keys.** `GET /api/v1/internal/connectors/config` returns a decrypted provider API key. It is now guarded by `ServiceTokenGuard` (`Authorization: Service <INTER_SERVICE_AUTH_TOKEN>`); every in-repo caller sends it. In production every service port is bound to `127.0.0.1` (only nginx and the frontend are public), a placeholder `INTER_SERVICE_AUTH_TOKEN` stops a service from booting (`assertInterServiceTokenNotPlaceholder`), and the shared HTTP client and `safeStringify` redact secret query parameters and header-like fields in logs.

**Models and prices.** The OpenAI model sync is a deny-list (any `gpt-*`, `o<digit>`, `chatgpt` chat id is kept) so new families such as gpt-6 and Astra appear. Connector-service re-syncs every connector every 6 hours. OpenRouter publishes per-token prices; they are converted to integer micro-USD per million tokens (no floating point) and travel on the models snapshot. Routing-service writes them as `PROVIDER_SYNC` price rows. Precedence: `ADMIN_OVERRIDE` > `PROVIDER_SYNC` > `SEED`. A provider-synced row is shown as published by the provider; a seed row is an estimate.

**Fallback.** An unpriced model on a first-party provider is billed at the dearest token-priced chat row by input plus output (it used the highest input rate before, which billed pro and reasoning models at gpt-4o rates). Aggregators (OpenRouter, Hugging Face, NVIDIA NIM, Pollinations, AI Horde, custom) have no fallback: an unpriced model there is refused, never recorded as zero. A startup audit logs how many exposed credit-billed models are unpriced.

## Consequences

- Deploy order: every production `.env` must hold a real `INTER_SERVICE_AUTH_TOKEN` before the twelve services that carry a default redeploy.
- Dev containers bake `packages/shared-utilities`: rebuild the services after pulling.
- A model the provider does not price (no published price, no seed) stays UNPRICED and blocked for credit billing until an administrator sets a price.
