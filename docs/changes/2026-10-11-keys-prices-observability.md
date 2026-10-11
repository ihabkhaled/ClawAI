# Provider key protection, price sync, observability explorer (2026-10-11)

- **Security.** Key route guarded, ports bound to localhost in prod, placeholder token refused, log redaction. ADR-165.
- **Models and prices.** OpenAI filter fixed (gpt-6.x, Astra, Sol, Luna, Terra appear after the next sync), scheduled sync every 6 hours, OpenRouter prices synced as published, fallback fixed, unpriced list endpoint `GET router-models/costs/unpriced`, alias-aware rate cache in auth-service.
- **Observability.** `/api/v1/admin/usage-explorer/*` (users, per-user detail and requests, leaderboard, timeseries, export; admin only, full email, audited) and a tabbed Observability page with charts, tables, search, pagination and a per-user consumption dialog. See `docs/04-backend/admin-usage-explorer-endpoints.md`.
- **Not done.** Model Prices page does not yet show the unpriced list or `priceBasis`; export button not wired; no live Playwright or curl lane (tools unavailable); the OpenAI $19.30 request is not explained by dev data and needs production ledger and provider logs.
